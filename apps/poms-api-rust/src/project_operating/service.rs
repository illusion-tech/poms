//! Typed G commands. Authentication, auth coflush and COMMIT remain Root-owned.
use super::{
    capture, collector, context, preparation, restatement, sources,
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    auth::model::clock_now,
    contract_support::{self, Actor, AuditWrite, Error, canonical_hash, new_uuid},
    project_operating_common::{self, model::*},
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

pub async fn activate_baseline_with_session(
    session: &mut CommonSession<'_, '_>,
    input: &ActivateOperatingBaselinePackageRequest,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    run(
        session,
        OperatingCollectInput::ActivateBaseline(input.clone()),
        actor,
    )
    .await
}
pub async fn create_snapshot_with_session(
    session: &mut CommonSession<'_, '_>,
    input: &CreateProjectOperatingSnapshotRequest,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    run(
        session,
        OperatingCollectInput::CaptureSnapshot(input.clone()),
        actor,
    )
    .await
}
pub async fn close_period_with_session(
    session: &mut CommonSession<'_, '_>,
    input: &CreatePeriodClosingSnapshotRequest,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    run(
        session,
        OperatingCollectInput::ClosePeriod(input.clone()),
        actor,
    )
    .await
}
pub async fn restate_with_session(
    session: &mut CommonSession<'_, '_>,
    input: &CreateOperatingRestatementRequest,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    run(
        session,
        OperatingCollectInput::Restate(input.clone()),
        actor,
    )
    .await
}

async fn run(
    session: &mut CommonSession<'_, '_>,
    input: OperatingCollectInput,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    let (project, intent, op, expected_hash, body) = match &input {
        OperatingCollectInput::ActivateBaseline(r) => (
            r.project_id,
            OperatingPreparationIntent::BaselineActivation,
            "ProjectCostController_activateOperatingBaselinePackage",
            r.expected_input_hash.clone(),
            serde_json::to_value(r),
        ),
        OperatingCollectInput::CaptureSnapshot(r) => (
            r.project_id,
            OperatingPreparationIntent::SnapshotCreate {
                mode: r.snapshot_mode,
                period_key: r.period_key.clone(),
            },
            "ProjectCostController_createProjectOperatingSnapshot",
            r.expected_input_hash.clone(),
            serde_json::to_value(r),
        ),
        OperatingCollectInput::ClosePeriod(r) => (
            r.project_id,
            OperatingPreparationIntent::PeriodClose {
                period_key: r.period_key.clone(),
            },
            "ProjectCostController_createPeriodClosingSnapshot",
            r.expected_input_hash.clone(),
            serde_json::to_value(r),
        ),
        OperatingCollectInput::Restate(r) => (
            r.project_id,
            OperatingPreparationIntent::Restatement {
                scope: r.scope,
                restates_snapshot: r.restates_snapshot_ref.clone(),
                period_end_snapshot: r.period_end_snapshot_ref.clone(),
                correction_source_refs: restatement::command_selected_roots_with_session(
                    session, r,
                )
                .await?,
            },
            "ProjectCostController_createOperatingRestatement",
            r.expected_input_hash.clone(),
            serde_json::to_value(r),
        ),
        OperatingCollectInput::Preview(_) => return Err(Error::Internal),
    };
    let body = body.map_err(|_| Error::Internal)?;
    let request_hash = canonical_hash(&body)?;
    let request_key = stable_request_key(&expected_hash)?;
    let projects = if let OperatingCollectInput::Restate(r) = &input {
        restatement::discover_projects(session, r).await?
    } else {
        vec![project]
    };
    for project in &projects {
        contract_support::lock_project(session.connection, *project).await?;
    }
    let token = OuterTxToken::capture(session).await?;
    let access = crate::project_action_authorization::verify_access_set(
        session, &projects, actor, true, &token,
    )
    .await?;
    if let Some(response) =
        receipt(session, op, project, actor.id, request_key, &request_hash).await?
    {
        return Ok(response);
    }
    let window = preparation::window_for(session, project, &intent).await?;
    let ids = OperatingGeneratedIds {
        baseline_source_id: Some(new_uuid()?),
        snapshot_id: Some(new_uuid()?),
        context_id: Some(new_uuid()?),
        paired_period_id: if matches!(intent, OperatingPreparationIntent::PeriodClose { .. })
            || matches!(&intent,OperatingPreparationIntent::SnapshotCreate{mode,..}if mode.as_str()=="period-end")
        {
            Some(new_uuid()?)
        } else {
            None
        },
        restatement_batch_id: if matches!(intent, OperatingPreparationIntent::Restatement { .. }) {
            Some(new_uuid()?)
        } else {
            None
        },
    };
    let plan = project_operating_common::make_plan(project, intent, input, window, ids, access)?;
    let collection =
        collector::collect_with_session(session, &plan, CollectLockMode::WriteLocked, actor)
            .await?;
    let state = collection
        .locked_projects
        .iter()
        .find(|s| s.project_id == project)
        .ok_or(Error::Internal)?;
    let response = match collection.context {
        OperatingCollectionContext::BaselineOnly(draft) => {
            let draft = *draft;
            let OperatingCollectInput::ActivateBaseline(command) = &plan.input else {
                return Err(Error::Internal);
            };
            let old = store::semantic_current_baseline(session.connection, project, false).await?;
            assert_baseline_assertions(
                command
                    .assertions
                    .as_ref()
                    .map(serde_json::to_value)
                    .transpose()
                    .map_err(|_| Error::Internal)?
                    .as_ref(),
                &draft,
            )?;
            let target =
                capture::baseline(session, &draft, old.as_ref(), &command.reason, actor).await?;
            let version = store::advance_head(
                session,
                project,
                state.head_row_version,
                target,
                None,
                actor.id,
            )
            .await?;
            audit(session,actor,op,"OperatingBaselinePackage",target,project,Some(&command.reason),json!({"sourceHash":draft.source_hash,"sourceContextId":draft.id,"newHeadVersion":version})).await?;
            command_result(
                target,
                "OperatingBaselinePackage",
                version,
                None,
                None,
                vec![],
                Some(draft.source_hash.as_str()),
                None,
            )?
        }
        OperatingCollectionContext::Snapshot(ctx) => {
            let ctx = *ctx;
            let catalog = sources::load(session, project, false).await?;
            assert_snapshot_assertions(
                body["assertions"].as_object().map(|_| &body["assertions"]),
                &ctx,
            )?;
            if let OperatingCollectInput::Restate(command) = &plan.input {
                restate_all(
                    session,
                    command,
                    ctx,
                    &catalog,
                    &collection.locked_projects,
                    &collection.producer_transitions,
                    plan.generated_ids
                        .restatement_batch_id
                        .ok_or(Error::Internal)?,
                    actor,
                )
                .await?
            } else {
                let baseline = state
                    .baseline_package_ref
                    .as_ref()
                    .ok_or(Error::Internal)?
                    .id;
                let captured = capture::snapshot(
                    session,
                    ctx,
                    &catalog,
                    plan.generated_ids.paired_period_id,
                    Some((
                        state.head_row_version,
                        baseline,
                        plan.generated_ids.paired_period_id.is_none(),
                    )),
                    actor,
                )
                .await?;
                let version = captured.new_head_version.ok_or(Error::Internal)?;
                let (target, kind) = captured
                    .period_id
                    .map(|id| (id, "PeriodClosingSnapshot"))
                    .unwrap_or((captured.snapshot_id, "ProjectOperatingSnapshot"));
                audit(session,actor,op,kind,target,project,None,json!({"sourceHash":captured.source_hash,"snapshotId":captured.snapshot_id,"newHeadVersion":version,"evaluationHash":captured.evaluation.evaluation_hash})).await?;
                command_result(
                    target,
                    kind,
                    version,
                    Some(captured.snapshot_id),
                    captured.period_id,
                    vec![],
                    Some(&captured.source_hash),
                    Some(&captured.evaluation),
                )?
            }
        }
    };
    save_receipt(
        session,
        op,
        project,
        actor.id,
        request_key,
        &request_hash,
        &response,
    )
    .await?;
    Ok(response)
}

#[expect(
    clippy::too_many_arguments,
    reason = "The unified restatement coordinator receives the complete locked candidate facts."
)]
async fn restate_all(
    session: &mut CommonSession<'_, '_>,
    input: &CreateOperatingRestatementRequest,
    primary_context: OperatingSourceContext,
    primary_catalog: &sources::Catalog,
    states: &[OperatingLockedProjectState],
    transitions: &[VerifiedProducerTransition],
    batch: Uuid,
    actor: &Actor,
) -> Result<OperatingCommandResult, Error> {
    let mut targets = vec![(
        input.project_id,
        input.restates_snapshot_ref.clone(),
        input.period_end_snapshot_ref.clone(),
        Some(primary_context),
    )];
    for target in &input.affected_targets {
        targets.push((
            target.project_id,
            target.restates_snapshot_ref.clone(),
            target.period_end_snapshot_ref.clone(),
            None,
        ));
    }
    let mut records = Vec::new();
    let mut new_heads = states
        .iter()
        .map(|s| (s.project_id, s.head_row_version))
        .collect::<BTreeMap<_, _>>();
    let mut primary = None;
    for (project, before_ref, period_ref, prepared) in targets {
        let catalog = if project == input.project_id {
            primary_catalog.clone()
        } else {
            sources::load(session, project, false).await?
        };
        let before = catalog
            .find(Table::Snapshot, before_ref.id)
            .ok_or_else(|| store::conflict("operating_restatement_terminal_missing"))?;
        sources::assert_expected(
            &sources::reference(Table::Snapshot, before)?,
            &serde_json::to_value(&before_ref).map_err(|_| Error::Internal)?,
        )?;
        let scope = if period_ref.is_some() {
            CreateOperatingRestatementRequestScope::Period
        } else {
            CreateOperatingRestatementRequestScope::Live
        };
        let intent = OperatingPreparationIntent::Restatement {
            scope,
            restates_snapshot: before_ref.clone(),
            period_end_snapshot: period_ref.clone(),
            correction_source_refs: vec![],
        };
        let window = preparation::window_for(session, project, &intent).await?;
        let ids = OperatingGeneratedIds {
            baseline_source_id: None,
            snapshot_id: Some(new_uuid()?),
            context_id: Some(new_uuid()?),
            paired_period_id: None,
            restatement_batch_id: Some(batch),
        };
        let context = match prepared {
            Some(c) => c,
            None => {
                context::build(
                    session,
                    project,
                    &catalog,
                    &window,
                    &ids,
                    "restated",
                    Some(sources::reference(Table::Snapshot, before)?),
                    period_ref
                        .as_ref()
                        .map(|p| {
                            catalog
                                .find(Table::Period, p.id)
                                .ok_or(Error::Internal)
                                .and_then(|p| sources::reference(Table::Period, p))
                        })
                        .transpose()?,
                    None,
                )
                .await?
            }
        };
        let changed =
            restatement::changed_context_sources(session, before_ref.id, &context).await?;
        if changed.is_empty() && transitions.is_empty() {
            return Err(store::conflict(
                "operating_restatement_has_no_source_change",
            ));
        }
        let causal = restatement::causal_refs(transitions, &changed)?;
        restatement::supersede_terminal(session, before, actor.id).await?;
        let state = states
            .iter()
            .find(|s| s.project_id == project)
            .ok_or(Error::Internal)?;
        let selected = state
            .current_snapshot_ref
            .as_ref()
            .is_some_and(|s| s.id == before_ref.id);
        let head_version = *new_heads.get(&project).ok_or(Error::Internal)?;
        let baseline = state
            .baseline_package_ref
            .as_ref()
            .ok_or(Error::Internal)?
            .id;
        let captured = capture::snapshot(
            session,
            context,
            &catalog,
            None,
            Some((head_version, baseline, selected)),
            actor,
        )
        .await?;
        new_heads.insert(project, captured.new_head_version.ok_or(Error::Internal)?);
        let id = new_uuid()?;
        let root = store::id(before, "root_snapshot_id").unwrap_or(before_ref.id);
        store::insert(session,Table::Restatement,&json!({"id":id,"project_id":project,"period_end_snapshot_id":period_ref.as_ref().map(|p|p.id),"restates_snapshot_id":before_ref.id,"restated_snapshot_id":captured.snapshot_id,"handover_rebaseline_record_id":before["handover_rebaseline_record_id"],"restatement_reason":input.restatement_reason,"restatement_summary":input.restatement_summary,"status":"active","handled_at":clock_now(),"handled_by":actor.id,"created_at":clock_now(),"created_by":actor.id,"updated_at":clock_now(),"updated_by":actor.id,"row_version":1,"producer_version":1,"restatement_scope":scope,"root_snapshot_id":root,"causal_source_refs":causal,"before_source_hash":before["source_hash"],"after_source_hash":captured.source_hash,"restatement_batch_id":batch})).await?;
        audit(session,actor,"ProjectCostController_createOperatingRestatement","OperatingRestatementRecord",id,project,Some(&input.restatement_reason),json!({"beforeSnapshotId":before_ref.id,"snapshotId":captured.snapshot_id,"sourceHash":captured.source_hash,"restatementBatchId":batch,"evaluationHash":captured.evaluation.evaluation_hash})).await?;
        records.push(id);
        if project == input.project_id && before_ref.id == input.restates_snapshot_ref.id {
            primary = Some((id, captured));
        }
    }
    let primary_head = *new_heads.get(&input.project_id).ok_or(Error::Internal)?;
    let (id, captured) = primary.ok_or(Error::Internal)?;
    command_result(
        id,
        "OperatingRestatementRecord",
        primary_head,
        Some(captured.snapshot_id),
        input.period_end_snapshot_ref.as_ref().map(|r| r.id),
        records,
        Some(&captured.source_hash),
        Some(&captured.evaluation),
    )
}

#[expect(
    clippy::too_many_arguments,
    reason = "The wire response maps distinct frozen command-result fields."
)]
fn command_result(
    target: Uuid,
    kind: &str,
    head: i32,
    snapshot: Option<Uuid>,
    period: Option<Uuid>,
    restatements: Vec<Uuid>,
    source_hash: Option<&str>,
    evaluation: Option<&OperatingEvaluationRefs>,
) -> Result<OperatingCommandResult, Error> {
    let refs=evaluation.map(|e|json!({"maturityEvaluationId":e.maturity_evaluation_id,"signalEvaluationId":e.signal_evaluation_id,"signalRowVersion":e.signal_row_version,"bindingIds":e.binding_ids,"summarySnapshotIds":e.summary_snapshot_ids,"evaluationHash":e.evaluation_hash,"policyVersion":e.policy_version}));
    serde_json::from_value(json!({"targetId":target,"targetType":kind,"resultStatus":"success","businessStatusAfter":"active","approvalRecordId":null,"confirmationRecordId":null,"todoItemIds":[],"rowVersion":1,"newHeadVersion":head,"snapshotId":snapshot,"periodEndSnapshotId":period,"restatementIds":restatements,"sourceHash":source_hash,"evaluationRefs":refs,"outputVersion":"server-derived-v1"})).map_err(|_|Error::Internal)
}

#[expect(
    clippy::too_many_arguments,
    reason = "The audit boundary keeps actor, operation, entity, project, and before/after facts explicit."
)]
async fn audit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    op: &str,
    kind: &str,
    id: Uuid,
    project: Uuid,
    reason: Option<&str>,
    after: Value,
) -> Result<(), Error> {
    contract_support::audit(
        session,
        actor,
        AuditWrite {
            operation_id: op.into(),
            target_type: kind.into(),
            target_id: id,
            project_id: project,
            contract_id: None,
            before: None,
            after: Some(after),
            reason: reason.map(str::to_owned),
            metadata: json!({"producerVersion":1,"immutableCapture":true}),
        },
    )
    .await
}

fn stable_request_key(hash: &str) -> Result<Uuid, Error> {
    if hash.len() != 64
        || !hash
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(Error::BadRequest("Invalid input hash".into()));
    }
    let mut bytes = [0u8; 16];
    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hash[i * 2..i * 2 + 2], 16).map_err(|_| Error::Internal)?;
    }
    Ok(Uuid::from_bytes(bytes))
}
async fn receipt(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    project: Uuid,
    actor: Uuid,
    key: Uuid,
    hash: &str,
) -> Result<Option<OperatingCommandResult>, Error> {
    let result:Option<Value>=sqlx::query_scalar("SELECT jsonb_build_object('hash',request_hash,'response',authorized_response) FROM poms.operating_command_receipt WHERE operation_id=$1 AND target_scope=$2 AND actor_id=$3 AND request_key=$4").bind(op).bind(project.to_string()).bind(actor).bind(key).fetch_optional(&mut *session.connection).await?;
    match result {
        Some(r) => {
            if r["hash"] != hash {
                return Err(store::conflict("operating_command_retry_body_changed"));
            }
            Ok(Some(
                serde_json::from_value(r["response"].clone()).map_err(|_| Error::Internal)?,
            ))
        }
        None => Ok(None),
    }
}
async fn save_receipt(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    project: Uuid,
    actor: Uuid,
    key: Uuid,
    request_hash: &str,
    response: &OperatingCommandResult,
) -> Result<(), Error> {
    let value = serde_json::to_value(response).map_err(|_| Error::Internal)?;
    let evaluation = value["evaluationRefs"]["evaluationHash"].as_str();
    let source = value["sourceHash"].as_str().unwrap_or(request_hash);
    sqlx::query("INSERT INTO poms.operating_command_receipt(id,operation_id,target_scope,actor_id,request_key,request_hash,authorized_response,http_status,source_hash,evaluation_hash) VALUES($1,$2,$3,$4,$5,$6,$7,200,$8,$9)").bind(new_uuid()?).bind(op).bind(project.to_string()).bind(actor).bind(key).bind(request_hash).bind(&value).bind(source).bind(evaluation).execute(&mut *session.connection).await?;
    Ok(())
}
fn assert_baseline_assertions(
    assertions: Option<&Value>,
    draft: &OperatingBaselineSourceDraft,
) -> Result<(), Error> {
    if let Some(a) = assertions {
        for (key, actual) in [
            ("originalBaselineCost", draft.original_baseline_cost),
            (
                "currentEffectiveBaselineCost",
                draft.current_effective_baseline_cost,
            ),
            ("changePackageTotal", draft.change_package_total),
        ] {
            if let Some(s) = a[key].as_str()
                && OperatingMoneyCents::parse_exact(s, key)?.cents() != actual.cents()
            {
                return Err(Error::Unprocessable(
                    "Legacy assertion does not match server-derived baseline".into(),
                ));
            }
        }
    }
    Ok(())
}
fn assert_snapshot_assertions(
    assertions: Option<&Value>,
    context: &OperatingSourceContext,
) -> Result<(), Error> {
    if let Some(a) = assertions {
        let p = serde_json::to_value(context).map_err(|_| Error::Internal)?;
        for (key, path) in [
            (
                "effectiveContractTotal",
                "/metrics/effectiveContractAmounts/net/value",
            ),
            (
                "receivableConfirmedTotal",
                "/metrics/confirmedReceiptAmounts/net/value",
            ),
            (
                "includedCostTotal",
                "/metrics/includedCostAmounts/net/value",
            ),
            ("grossMarginAmount", "/metrics/grossMarginNet/value"),
        ] {
            if let Some(s) = a[key].as_str() {
                let actual = p
                    .pointer(path)
                    .and_then(Value::as_str)
                    .ok_or_else(|| store::conflict("operating_assertion_unknown"))?;
                if OperatingMoneyCents::parse_exact(s, key)?.cents()
                    != OperatingMoneyCents::parse_exact(actual, key)?.cents()
                {
                    return Err(Error::Unprocessable(
                        "Legacy assertion does not match server-derived snapshot".into(),
                    ));
                }
            }
        }
    }
    Ok(())
}
