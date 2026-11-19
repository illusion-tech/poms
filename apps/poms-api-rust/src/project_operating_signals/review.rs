//! Reviews append verified overlays. Captured G facts and H system output are
//! immutable; row-version updates are concurrency receipts, not fact changes.
use super::{policy, projection, query, service, store, summary};
use crate::{
    approval_common::CommonSession,
    contract_support::{self, Actor, AuditWrite, Error},
    project_action_authorization::authorize_operating_write_with_session,
    project_operating_common::{hash, loader::load_frozen_context_with_session, model::*},
};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use uuid::Uuid;

const SIGNAL_OP: &str = "ProjectCostController_reviewOperatingSignalEvaluation";
const GATE_OP: &str = "ProjectCostController_reviewCommissionGateBinding";

fn conflict(message: &str) -> Error {
    Error::Conflict(message.into())
}
fn next_version(version: i32) -> Result<i32, Error> {
    version
        .checked_add(1)
        .ok_or_else(|| conflict("Operating review version is exhausted"))
}

pub(crate) fn decode_overlay(
    stored_row: &store::SignalReviewRow,
    context: &OperatingSourceContext,
) -> Result<Option<VerifiedMaterialityReview>, Error> {
    let payload = &stored_row.payload;
    if hash::canonical_hash(payload)?.as_str() != stored_row.payload_hash
        || stored_row.source_hash != context.source_hash
        || payload.get("sourceHash").and_then(Value::as_str) != Some(context.source_hash.as_str())
        || payload
            .get("effectiveEvaluationHash")
            .and_then(Value::as_str)
            != Some(stored_row.evaluation_hash.as_str())
        || payload.get("reviewedBy").and_then(Value::as_str)
            != Some(stored_row.actor_id.to_string().as_str())
    {
        return Err(conflict("Stored signal review provenance is invalid"));
    }
    match payload.get("verifiedMaterialityReview") {
        None | Some(Value::Null) => Ok(None),
        Some(value) => {
            let stored: StoredMaterialityReview =
                serde_json::from_value(value.clone()).map_err(|_| Error::Internal)?;
            let base = policy::derive_operating_evaluation(context, None)?;
            let refs = policy::frozen_source_refs(context)?;
            let overlay_hash = hash::canonical_hash(
                &json!({"sourceHash":stored.source_hash,"evaluationHashBefore":stored.evaluation_hash_before,"policyHash":stored.policy_hash,"actorId":stored.actor_id,"riskDecision":stored.risk_decision,"issueCodes":stored.issue_codes,"evidenceRefs":stored.evidence_refs,"rationale":stored.rationale}),
            )?;
            if stored.actor_id != stored_row.actor_id
                || stored.source_hash.as_str() != context.source_hash
                || stored.evaluation_hash_before != base.evaluation_hash
                || stored.policy_hash.as_str() != policy::POLICY_HASH
                || stored.risk_decision == OperatingRiskLevel::Unknown
                || stored.issue_codes != vec!["qualitative-materiality-unassessed".to_owned()]
                || !base.all_reasons.iter().any(|r| r.rule_id == "H08")
                || stored.rationale.trim().is_empty()
                || stored.rationale.encode_utf16().count() > 2000
                || stored.evidence_refs.is_empty()
                || stored
                    .evidence_refs
                    .iter()
                    .any(|r| !refs.iter().any(|allowed| same_ref(r, allowed)))
                || overlay_hash != stored.overlay_hash
            {
                return Err(conflict(
                    "Stored materiality review is not verified for the exact immutable source",
                ));
            }
            Ok(Some(VerifiedMaterialityReview {
                source_hash: stored.source_hash,
                evaluation_hash_before: stored.evaluation_hash_before,
                policy_hash: stored.policy_hash,
                actor_id: stored.actor_id,
                risk_decision: stored.risk_decision,
                issue_codes: stored.issue_codes,
                evidence_refs: stored.evidence_refs,
                rationale: stored.rationale,
                overlay_hash: stored.overlay_hash,
            }))
        }
    }
}
pub(crate) async fn effective_draft(
    session: &mut CommonSession<'_, '_>,
    row: &store::EvaluationRow,
    context: &OperatingSourceContext,
) -> Result<(OperatingEvaluationDraft, Option<Uuid>), Error> {
    let active = store::active_signal_review(session, row.id).await?;
    let overlay = active
        .as_ref()
        .map(|stored| decode_overlay(stored, context))
        .transpose()?
        .flatten();
    let draft = policy::derive_operating_evaluation(context, overlay.as_ref())?;
    let system = policy::derive_operating_evaluation(context, None)?;
    if hash::canonical_hash(&row.draft)? != hash::canonical_hash(&system)? {
        return Err(conflict(
            "Stored immutable system output differs from exact policy derivation",
        ));
    }
    if let Some(stored) = &active {
        let payload = &stored.payload;
        if payload
            .get("effectiveEvaluationHash")
            .and_then(Value::as_str)
            != Some(draft.evaluation_hash.as_str())
            || hash::canonical_hash(payload.get("effectiveOutput").ok_or(Error::Internal)?)?
                != hash::canonical_hash(&draft)?
        {
            return Err(conflict(
                "Immutable signal review output no longer matches its verified overlay",
            ));
        }
    } else if draft.evaluation_hash.as_str() != row.evaluation_hash {
        return Err(conflict("Immutable system evaluation hash mismatch"));
    }
    Ok((draft, active.map(|stored| stored.id)))
}

fn same_ref(a: &SourceRef, b: &SourceRef) -> bool {
    a.kind == b.kind
        && a.id == b.id
        && a.row_version == b.row_version
        && a.payload_hash == b.payload_hash
}
fn verify_materiality(
    context: &OperatingSourceContext,
    before: &OperatingEvaluationDraft,
    input: &ManualOperatingMaterialityReview,
    actor: &Actor,
) -> Result<VerifiedMaterialityReview, Error> {
    let issue = before
        .all_reasons
        .iter()
        .find(|r| r.rule_id == "H08")
        .ok_or_else(|| {
            Error::Unprocessable("No unresolved qualitative issue can be reclassified".into())
        })?;
    let unique = input.issue_codes.iter().collect::<BTreeSet<_>>();
    if input.policy_version != policy::POLICY_VERSION
        || unique.len() != input.issue_codes.len()
        || input.issue_codes != vec![issue.code.clone()]
        || input.rationale.trim().is_empty()
        || input.rationale.encode_utf16().count() > 2000
        || input.evidence_refs.is_empty()
        || input.evidence_refs.iter().any(|r| {
            !issue
                .evidence_refs
                .iter()
                .any(|allowed| same_ref(r, allowed))
        })
    {
        return Err(Error::Unprocessable("Manual review must classify the exact unresolved qualitative issue using frozen member evidence".into()));
    }
    let mut refs = input.evidence_refs.clone();
    refs.sort_by(|a, b| {
        (&a.kind, a.id, a.row_version, &a.payload_hash).cmp(&(
            &b.kind,
            b.id,
            b.row_version,
            &b.payload_hash,
        ))
    });
    if refs.windows(2).any(|w| same_ref(&w[0], &w[1])) {
        return Err(Error::BadRequest(
            "Duplicate manual evidence reference".into(),
        ));
    }
    let risk_decision: OperatingRiskLevel =
        serde_json::from_value(json!(input.risk_decision)).map_err(|_| Error::Internal)?;
    let overlay_hash = hash::canonical_hash(
        &json!({"sourceHash":context.source_hash,"evaluationHashBefore":before.evaluation_hash,"policyHash":policy::POLICY_HASH,"actorId":actor.id,"riskDecision":risk_decision,"issueCodes":input.issue_codes,"evidenceRefs":refs,"rationale":input.rationale}),
    )?;
    Ok(VerifiedMaterialityReview {
        source_hash: context
            .source_hash
            .clone()
            .try_into()
            .map_err(|_| Error::Internal)?,
        evaluation_hash_before: before.evaluation_hash.clone(),
        policy_hash: policy::POLICY_HASH
            .to_owned()
            .try_into()
            .map_err(|_| Error::Internal)?,
        actor_id: actor.id,
        risk_decision,
        issue_codes: input.issue_codes.clone(),
        evidence_refs: refs,
        rationale: input.rationale.clone(),
        overlay_hash,
    })
}

pub async fn review_signal_with_session(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    input: &ReviewOperatingSignalEvaluationRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = store::evaluation_identity(session, id).await?;
    authorize_operating_write_with_session(session, project, actor).await?;
    let request_hash = hash::canonical_hash(
        &json!({"operationId":SIGNAL_OP,"targetId":id,"body":input,"policyHash":policy::POLICY_HASH}),
    )?;
    let identity = store::evaluation(session, id, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        identity.snapshot_id,
        identity.snapshot_row_version,
        &identity.source_hash,
    )
    .await?;
    sqlx::query("SELECT id FROM poms.data_maturity_evaluation_result WHERE id=$1 AND project_id=$2 FOR UPDATE")
        .bind(identity.maturity_id).bind(project).fetch_one(&mut *session.connection).await?;
    let row = store::evaluation(session, id, project, true).await?;
    projection::require_sensitive_write(
        actor,
        context.labor_lineage.contains_labor.as_str() != "no",
    )?;
    // Authorization precedes committed replay; replay precedes stale CAS.
    if let Some(response) = store::replay(
        session,
        SIGNAL_OP,
        id,
        actor,
        input.request_key,
        request_hash.as_str(),
    )
    .await?
    {
        projection::fields(
            session,
            actor,
            "OperatingSignalEvaluationResult",
            id,
            project,
            context.labor_lineage.contains_labor.as_str() != "no",
            vec![(
                "committedReviewReplay".into(),
                Some("已授权的经营复核回执".into()),
            )],
        )
        .await?;
        return Ok(response);
    }
    let (before, previous_id) = effective_draft(session, &row, &context).await?;
    if input.input_version != "server-derived-v1"
        || input.expected_version != row.row_version
        || row.status != "active"
        || !row.source_current
        || input.expected_source_hash != context.source_hash
        || input.expected_evaluation_hash != before.evaluation_hash.as_str()
        || input.resolved_data_maturity_level != before.cost_readiness.data_maturity_level
        || input.cost_action_recommendation != before.cost_readiness.cost_action_recommendation
        || input.referenced_baseline_version != context.baseline.referenced_baseline_version
        || input.referenced_snapshot_version != context.snapshot.version
    {
        return Err(conflict(
            "Signal review assertions are stale or attempt to change server facts",
        ));
    }
    let previous_payload = store::active_signal_review(session, id).await?;
    let previous_overlay = previous_payload
        .as_ref()
        .map(|stored| decode_overlay(stored, &context))
        .transpose()?
        .flatten();
    if previous_overlay.is_some() {
        return Err(Error::CodedConflict {code:"operating_materiality_already_reviewed",message:"Current qualitative issues already have an immutable verified decision; new facts require a new source evaluation".into()});
    }
    let overlay = match &input.manual_materiality_review {
        Some(manual) if input.review_decision.as_str() == "manual-confirmed" => {
            Some(verify_materiality(&context, &before, manual, actor)?)
        }
        Some(_) => {
            return Err(Error::Unprocessable(
                "Qualitative materiality review requires manual-confirmed decision".into(),
            ));
        }
        None if input.review_decision.as_str() == "manual-confirmed" => {
            return Err(Error::Unprocessable(
                "Manual-confirmed requires exact qualitative review evidence".into(),
            ));
        }
        None => previous_overlay,
    };
    let effective = policy::derive_operating_evaluation(&context, overlay.as_ref())?;
    let version = next_version(row.row_version)?;
    let review_id = contract_support::new_uuid()?;
    let now = crate::auth::model::clock_now();
    let payload = json!({"schemaVersion":1,"verifiedMaterialityReview":overlay,"reviewDecision":input.review_decision,"reviewComment":input.review_comment,"sourceHash":context.source_hash,"evaluationHashBefore":before.evaluation_hash,"effectiveEvaluationHash":effective.evaluation_hash,"policyVersion":policy::POLICY_VERSION,"policyHash":policy::POLICY_HASH,"reviewedBy":actor.id,"reviewedAt":now,"effectiveOutput":effective});
    let payload_hash = hash::canonical_hash(&payload)?;
    if let Some(previous) = previous_id {
        sqlx::query("UPDATE poms.operating_signal_review_record SET status='superseded',row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE id=$1 AND status='active'").bind(previous).bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    }
    let changed=sqlx::query("UPDATE poms.operating_signal_evaluation_result SET row_version=row_version+1,updated_at=$3,updated_by=$4 WHERE id=$1 AND row_version=$2 AND status='active' AND producer_version=1")
        .bind(id).bind(row.row_version).bind(now).bind(actor.id).execute(&mut *session.connection).await?.rows_affected();
    if changed != 1 {
        return Err(conflict("Signal evaluation changed during review"));
    }
    sqlx::query("INSERT INTO poms.operating_signal_review_record(id,signal_evaluation_id,review_decision,resolved_data_maturity_level,resolved_cost_action_recommendation,resolved_current_action_level,referenced_baseline_version,referenced_snapshot_version,review_comment,handled_at,handled_by,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,evidence_id,source_hash,evaluation_hash,expected_signal_version,review_payload,payload_hash,supersedes_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$10,$11,$10,$11,1,1,$12,$13,$14,$15,$16,$17,$18)")
        .bind(review_id).bind(id).bind(input.review_decision.as_str()).bind(effective.cost_readiness.data_maturity_level.as_str()).bind(effective.cost_readiness.cost_action_recommendation.as_str()).bind(effective.current_action_level.as_str())
        .bind(&context.baseline.referenced_baseline_version).bind(&context.snapshot.version).bind(input.review_comment.as_deref()).bind(now).bind(actor.id).bind(row.evidence_id).bind(context.source_hash.as_str()).bind(effective.evaluation_hash.as_str()).bind(row.row_version).bind(&payload).bind(payload_hash.as_str()).bind(previous_id).execute(&mut *session.connection).await?;
    let (binding_ids, _) = service::append_bindings(
        session,
        &context,
        &effective,
        row.evidence_id,
        id,
        Some(review_id),
        actor,
    )
    .await?;
    let mut response = query::signal_dto(
        session,
        &row,
        &context,
        &effective,
        Some(review_id),
        Some(version),
        actor,
    )
    .await?;
    let object = response.as_object_mut().ok_or(Error::Internal)?;
    object.remove("projectId");
    object.remove("formulaBoundaryAction");
    object.remove("allocationStabilitySummary");
    object.remove("allocationStabilitySummaryProjection");
    object.remove("unmappedCostSummary");
    object.remove("unmappedCostSummaryProjection");
    object.remove("reviewRequired");
    object.remove("reviewSummary");
    object.remove("reviewSummaryProjection");
    object.insert("targetId".into(), json!(id));
    object.insert("reviewRecordId".into(), json!(review_id));
    object.insert("resultStatus".into(), json!("active"));
    object.insert(
        "gateBindingIds".into(),
        serde_json::to_value(binding_ids).map_err(|_| Error::Internal)?,
    );
    let exact: ReviewOperatingSignalEvaluationResult =
        serde_json::from_value(response).map_err(|_| Error::Internal)?;
    let response = serde_json::to_value(exact).map_err(|_| Error::Internal)?;
    contract_support::audit(session,actor,AuditWrite {operation_id:SIGNAL_OP.into(),target_type:"OperatingSignalEvaluationResult".into(),target_id:id,project_id:project,contract_id:None,before:Some(json!({"rowVersion":row.row_version,"evaluationHash":before.evaluation_hash})),after:Some(json!({"reviewRecordId":review_id,"rowVersion":version,"evaluationHash":effective.evaluation_hash})),reason:Some("追加同源质性复核覆盖与四阶段新绑定；原始事实和系统判定保持冻结".into()),metadata:json!({"safeAuditSummary":true,"policyHash":policy::POLICY_HASH})}).await?;
    store::receipt(
        session,
        actor,
        store::CommandReceipt {
            operation: SIGNAL_OP,
            target: id,
            key: input.request_key,
            request_hash: request_hash.as_str(),
            response: &response,
            source_hash: &context.source_hash,
            evaluation_hash: effective.evaluation_hash.as_str(),
        },
    )
    .await?;
    session
        .state
        .trace
        .inserted("operating_signal_review_record", &review_id.to_string());
    Ok(response)
}

pub async fn review_gate_with_session(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    input: &ReviewCommissionGateBindingRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = store::binding_identity(session, id).await?;
    authorize_operating_write_with_session(session, project, actor).await?;
    let request_hash = hash::canonical_hash(
        &json!({"operationId":GATE_OP,"targetId":id,"body":input,"policyHash":policy::POLICY_HASH}),
    )?;
    // OSER precedes binding in the frozen lock registry.
    let signal_id:Uuid=sqlx::query_scalar("SELECT signal_evaluation_id FROM poms.operating_signal_gate_binding WHERE id=$1 AND project_id=$2").bind(id).bind(project).fetch_one(&mut *session.connection).await?;
    let identity = store::evaluation(session, signal_id, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        identity.snapshot_id,
        identity.snapshot_row_version,
        &identity.source_hash,
    )
    .await?;
    sqlx::query("SELECT id FROM poms.data_maturity_evaluation_result WHERE id=$1 AND project_id=$2 FOR UPDATE")
        .bind(identity.maturity_id).bind(project).fetch_one(&mut *session.connection).await?;
    let evaluation = store::evaluation(session, signal_id, project, true).await?;
    projection::require_sensitive_write(
        actor,
        context.labor_lineage.contains_labor.as_str() != "no",
    )?;
    if let Some(response) = store::replay(
        session,
        GATE_OP,
        id,
        actor,
        input.request_key,
        request_hash.as_str(),
    )
    .await?
    {
        projection::fields(
            session,
            actor,
            "OperatingSignalGateBinding",
            id,
            project,
            context.labor_lineage.contains_labor.as_str() != "no",
            vec![(
                "committedReviewReplay".into(),
                Some("已授权的阶段复核回执".into()),
            )],
        )
        .await?;
        return Ok(response);
    }
    let binding = store::binding(session, id, project, true).await?;
    let (draft, signal_review_id) = effective_draft(session, &evaluation, &context).await?;
    if input.input_version != "server-derived-v1"
        || input.expected_version != binding.row_version
        || binding.status != "active"
        || !evaluation.source_current
        || input.expected_source_hash != context.source_hash
        || input.expected_evaluation_hash != draft.evaluation_hash.as_str()
        || binding.evaluation_hash != draft.evaluation_hash.as_str()
        || input.binding_action != binding.action
        || input.baseline_selection_source.as_str() != context.baseline.selection_source.as_str()
        || input.summary_package_key != summary::PACKAGE
        || input.summary_snapshot_id != binding.summary_id
        || input.referenced_baseline_version != context.baseline.referenced_baseline_version
        || input.referenced_snapshot_version != context.snapshot.version
    {
        return Err(conflict(
            "Gate review source, version, policy or summary assertions are stale",
        ));
    }
    summary::validate_source_summary(session, &binding, &context, draft.evaluation_hash.as_str())
        .await?;
    let complete_blocking = draft
        .all_reasons
        .iter()
        .filter(|r| {
            r.stage_actions.get(&binding.stage) == Some(&OperatingSnapshotActionLevel::Block)
        })
        .map(|r| r.code.clone())
        .collect::<BTreeSet<_>>();
    let requested = input
        .blocking_reason_codes
        .iter()
        .cloned()
        .collect::<BTreeSet<_>>();
    if requested.len() != input.blocking_reason_codes.len()
        || requested != complete_blocking
        || input
            .blocking_reason_code
            .as_ref()
            .is_some_and(|code| !complete_blocking.contains(code))
    {
        return Err(conflict(
            "Gate review must assert the complete actual blocking reason set",
        ));
    }
    let action = match input.review_action.as_str() {
        "acknowledge" => binding.action,
        "tighten-review" => {
            policy::max_action([&binding.action, &OperatingSnapshotActionLevel::Review])
        }
        "tighten-block" => OperatingSnapshotActionLevel::Block,
        _ => return Err(Error::Internal),
    };
    let decision = if action == OperatingSnapshotActionLevel::Block {
        OperatingGateReviewDecision::Blocked
    } else if draft.certification != OperatingEvaluationCertification::Verified
        || draft.effective_risk_level == OperatingRiskLevel::Unknown
        || draft.all_reasons.iter().any(|r| r.rule_id == "H08")
    {
        OperatingGateReviewDecision::ReviewRequired
    } else {
        OperatingGateReviewDecision::Confirmed
    };
    if input.gate_review_decision != decision {
        return Err(conflict(
            "Gate review decision must equal the server result for exact human duties",
        ));
    }
    let version = next_version(binding.row_version)?;
    let review_id = contract_support::new_uuid()?;
    let summary_id = contract_support::new_uuid()?;
    let now = crate::auth::model::clock_now();
    let previous = store::active_gate_review(session, id).await?;
    let previous_id = previous
        .as_ref()
        .and_then(|p| p.get("id"))
        .and_then(Value::as_str)
        .and_then(|v| Uuid::parse_str(v).ok());
    if let Some(previous_id) = previous_id {
        sqlx::query("UPDATE poms.commission_gate_review_record SET status='superseded',row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE id=$1 AND status='active'").bind(previous_id).bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    }
    summary::create_with_session(
        session,
        summary::SummaryInput {
            id: summary_id,
            binding_id: id,
            binding_row_version: version,
            stage: &binding.stage,
            evidence_id: binding.evidence_id,
            signal_id,
            signal_review_id,
            gate_review_id: Some(review_id),
            source_summary_id: Some(binding.summary_id),
            context: &context,
            draft: &draft,
            effective_action: &action,
            review_decision: Some(&decision),
        },
        actor,
    )
    .await?;
    let payload = json!({"schemaVersion":1,"sourceHash":context.source_hash,"evaluationHash":draft.evaluation_hash,"policyHash":policy::POLICY_HASH,"bindingId":id,"gateStageType":binding.stage,"bindingRowVersionBefore":binding.row_version,"bindingRowVersionAfter":version,"bindingActionBefore":binding.action,"bindingActionAfter":action,"reviewAction":input.review_action,"gateReviewDecision":decision,"blockingReasonCodes":input.blocking_reason_codes,"sourceSummarySnapshotId":binding.summary_id,"summarySnapshotId":summary_id,"comment":input.comment,"handledBy":actor.id,"handledAt":now});
    let evidence_hash = hash::canonical_hash(&payload)?;
    sqlx::query("INSERT INTO poms.commission_gate_review_record(id,binding_id,gate_review_decision,blocking_reason_code,summary_package_key,summary_snapshot_id,projection_level,export_policy,next_action_summary,handled_at,handled_by,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,evidence_id,source_summary_snapshot_id,source_hash,evaluation_hash,policy_hash,evidence_hash,review_action,review_payload,supersedes_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$10,$11,$10,$11,1,1,$12,$13,$14,$15,$16,$17,$18,$19,$20)")
        .bind(review_id).bind(id).bind(decision.as_str()).bind(input.blocking_reason_code.as_deref()).bind(summary::PACKAGE).bind(summary_id).bind(summary::PROJECTION).bind(summary::EXPORT).bind(service::next_action(&draft,&action)).bind(now).bind(actor.id).bind(binding.evidence_id).bind(binding.summary_id).bind(context.source_hash.as_str()).bind(draft.evaluation_hash.as_str()).bind(policy::POLICY_HASH).bind(evidence_hash.as_str()).bind(input.review_action.as_str()).bind(payload).bind(previous_id).execute(&mut *session.connection).await?;
    let affected=sqlx::query("UPDATE poms.operating_signal_gate_binding SET binding_action=$3,current_summary_id=$4,row_version=row_version+1,updated_at=$5,updated_by=$6 WHERE id=$1 AND row_version=$2 AND status='active' AND producer_version=1")
        .bind(id).bind(binding.row_version).bind(action.as_str()).bind(summary_id).bind(now).bind(actor.id).execute(&mut *session.connection).await?.rows_affected();
    if affected != 1 {
        return Err(conflict("Gate binding changed during review"));
    }
    let response = query::gate_review_result(
        session,
        query::GateReviewResultInput {
            id,
            review_id,
            row: &evaluation,
            context: &context,
            draft: &draft,
            binding: &binding,
            version,
            summary_id,
            action,
            decision,
        },
        actor,
    )
    .await?;
    contract_support::audit(session,actor,AuditWrite {operation_id:GATE_OP.into(),target_type:"OperatingSignalGateBinding".into(),target_id:id,project_id:project,contract_id:None,before:Some(json!({"rowVersion":binding.row_version,"summarySnapshotId":binding.summary_id})),after:Some(json!({"gateReviewRecordId":review_id,"rowVersion":version,"summarySnapshotId":summary_id})),reason:Some("追加阶段复核与新不可变摘要；系统动作和硬阻断不降级".into()),metadata:json!({"safeAuditSummary":true,"policyHash":policy::POLICY_HASH})}).await?;
    store::receipt(
        session,
        actor,
        store::CommandReceipt {
            operation: GATE_OP,
            target: id,
            key: input.request_key,
            request_hash: request_hash.as_str(),
            response: &response,
            source_hash: &context.source_hash,
            evaluation_hash: draft.evaluation_hash.as_str(),
        },
    )
    .await?;
    session
        .state
        .trace
        .inserted("commission_gate_review_record", &review_id.to_string());
    Ok(response)
}
