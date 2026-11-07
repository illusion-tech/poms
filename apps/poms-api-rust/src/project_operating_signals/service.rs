use super::{policy, store, summary};
use crate::{
    approval_common::CommonSession,
    contract_support::{self, Actor, AuditWrite, Error},
    project_action_authorization::{
        authorize_operating_read_with_session, authorize_operating_write_with_session,
    },
    project_operating_common::{hash, loader::load_frozen_context_with_session, model::*},
};
use serde_json::{Value, json};
use sqlx::Row;
use std::collections::BTreeMap;
use uuid::Uuid;

type GateReferences = (
    BTreeMap<OperatingGateStage, Uuid>,
    BTreeMap<OperatingGateStage, Uuid>,
);
pub(crate) async fn append_bindings(
    session: &mut CommonSession<'_, '_>,
    context: &OperatingSourceContext,
    draft: &OperatingEvaluationDraft,
    evidence_id: Uuid,
    signal_id: Uuid,
    signal_review_id: Option<Uuid>,
    actor: &Actor,
) -> Result<GateReferences, Error> {
    // Locks are acquired in stable ID order, after the caller has locked the
    // project, source context, DMER and OSER families.
    let publish_current:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_operating_head WHERE project_id=$1 AND current_snapshot_id=$2)")
        .bind(context.project_id).bind(context.snapshot.id).fetch_one(&mut *session.connection).await?;
    let old = if publish_current {
        sqlx::query("SELECT id,gate_stage_type,row_version FROM poms.operating_signal_gate_binding WHERE project_id=$1 AND status='active' ORDER BY id FOR UPDATE")
        .bind(context.project_id).fetch_all(&mut *session.connection).await?
    } else {
        vec![]
    };
    let old_ids = old
        .iter()
        .map(|row| row.try_get::<Uuid, _>("id"))
        .collect::<Result<Vec<_>, _>>()?;
    if old.iter().any(|row| {
        row.try_get::<i32, _>("row_version")
            .is_ok_and(|v| v == i32::MAX)
    }) {
        return Err(Error::Conflict(
            "Operating binding version is exhausted".into(),
        ));
    }
    sqlx::query("SELECT id FROM poms.commission_gate_review_record WHERE binding_id=ANY($1) AND status='active' ORDER BY id FOR UPDATE")
        .bind(&old_ids).fetch_all(&mut *session.connection).await?;
    let mut predecessors = BTreeMap::new();
    for row in old {
        let id: Uuid = row.try_get("id")?;
        let stage: String = row.try_get("gate_stage_type")?;
        predecessors.insert(stage, id);
        sqlx::query("UPDATE poms.operating_signal_gate_binding SET status='superseded',row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE id=$1 AND status='active'")
            .bind(id).bind(crate::auth::model::clock_now()).bind(actor.id).execute(&mut *session.connection).await?;
        sqlx::query("UPDATE poms.commission_gate_review_record SET status='superseded',row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE binding_id=$1 AND status='active'")
            .bind(id).bind(crate::auth::model::clock_now()).bind(actor.id).execute(&mut *session.connection).await?;
    }
    let mut binding_ids = BTreeMap::new();
    let mut summary_ids = BTreeMap::new();
    for stage in policy::STAGES {
        let gate = draft.four_stage_drafts.get(&stage).ok_or(Error::Internal)?;
        let id = contract_support::new_uuid()?;
        let summary_id = contract_support::new_uuid()?;
        summary::create_with_session(
            session,
            summary::SummaryInput {
                id: summary_id,
                binding_id: id,
                binding_row_version: 1,
                stage: &stage,
                evidence_id,
                signal_id,
                signal_review_id,
                gate_review_id: None,
                source_summary_id: None,
                context,
                draft,
                effective_action: &gate.effective_action,
                review_decision: None,
            },
            actor,
        )
        .await?;
        let now = crate::auth::model::clock_now();
        sqlx::query("INSERT INTO poms.operating_signal_gate_binding(id,project_id,signal_evaluation_id,binding_action,gate_stage_type,baseline_selection_source,tax_impact_summary,tax_impact_pending_amount,allocation_stability_summary,unmapped_cost_summary,data_maturity_level,cost_action_recommendation,current_action_level,next_action_summary,downstream_consumer_summary,referenced_baseline_version,referenced_snapshot_version,generated_at,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,evidence_id,signal_review_id,system_binding_action,tax_pending_knowledge,evaluation_hash,current_summary_id,supersedes_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::numeric,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$27,$18,$19,$18,$19,1,1,$20,$21,$22,$23,$24,$25,$26)")
            .bind(id).bind(context.project_id).bind(signal_id).bind(policy::wire(&gate.effective_action)?).bind(stage.as_str()).bind(context.baseline.selection_source.as_str())
            .bind(tax_summary(context)).bind(context.metrics.tax_pending_amount.value.as_deref()).bind(allocation_summary(context)).bind(unmapped_summary(context))
            .bind(draft.cost_readiness.data_maturity_level.as_str()).bind(draft.cost_readiness.cost_action_recommendation.as_str()).bind(draft.current_action_level.as_str())
            .bind(next_action(draft,&gate.effective_action)).bind("独立阶段建议；须另核真实提成职责与发放流程")
            .bind(&context.baseline.referenced_baseline_version).bind(&context.snapshot.version).bind(now).bind(actor.id).bind(evidence_id).bind(signal_review_id)
            .bind(gate.system_action.as_str()).bind(context.metrics.tax_pending_amount.knowledge.as_str()).bind(draft.evaluation_hash.as_str()).bind(summary_id).bind(predecessors.get(stage.as_str())).bind(if publish_current {"active"}else{"superseded"})
            .execute(&mut *session.connection).await?;
        session
            .state
            .trace
            .inserted("operating_signal_gate_binding", &id.to_string());
        binding_ids.insert(stage, id);
        summary_ids.insert(stage, summary_id);
    }
    Ok((binding_ids, summary_ids))
}

pub(crate) fn tax_summary(context: &OperatingSourceContext) -> String {
    format!(
        "待确认税额={}；knowledge={}",
        context
            .metrics
            .tax_pending_amount
            .value
            .as_deref()
            .unwrap_or("unknown"),
        context.metrics.tax_pending_amount.knowledge.as_str()
    )
}
pub(crate) fn allocation_summary(context: &OperatingSourceContext) -> String {
    format!(
        "冻结分摊结果{}项；待确认分摊{}项",
        context.allocations.len(),
        context
            .allocations
            .iter()
            .filter(|a| a.status.as_str() != "frozen")
            .count()
    )
}
pub(crate) fn unmapped_summary(context: &OperatingSourceContext) -> String {
    format!(
        "未映射{}项；未分类{}项；待确认{}项",
        context.scope.unmapped_cost_count,
        context.scope.unclassified_cost_count,
        context.scope.pending_cost_count
    )
}
pub(crate) fn next_action(
    draft: &OperatingEvaluationDraft,
    action: &OperatingSnapshotActionLevel,
) -> String {
    if *action == OperatingSnapshotActionLevel::Block {
        "当前阶段被阻断；须修复真实来源或完成受控重述，人工复核不能解除硬阻断".into()
    } else if draft.effective_risk_level == OperatingRiskLevel::Unknown {
        "质性事项与未知事实仍须核实；当前建议不构成发放授权".into()
    } else if *action == OperatingSnapshotActionLevel::Review {
        "按冻结事实履行人工复核职责；确认复核不等于发放授权".into()
    } else {
        "保留当前来源与阶段建议，后续提成仍须独立业务授权".into()
    }
}

pub async fn evaluate_with_session(
    session: &mut CommonSession<'_, '_>,
    snapshot_id: Uuid,
    expected_row_version: i32,
    expected_source_hash: &str,
    actor: &Actor,
) -> Result<OperatingEvaluationRefs, Error> {
    let context = load_frozen_context_with_session(
        session,
        snapshot_id,
        expected_row_version,
        expected_source_hash,
    )
    .await?;
    authorize_operating_write_with_session(session, context.project_id, actor).await?;
    let draft = policy::derive_operating_evaluation(&context, None)?;
    if draft.certification != OperatingEvaluationCertification::Verified {
        return Err(Error::CodedConflict {
            code: "operating_evaluation_missing_evidence",
            message: "Formal operating evaluation requires eligible source evidence".into(),
        });
    }
    let actual_action:String=sqlx::query_scalar("SELECT current_action_level FROM poms.project_operating_snapshot WHERE id=$1 AND project_id=$2 AND producer_version=1 AND captured_row_version=$3 AND source_hash=$4")
        .bind(snapshot_id).bind(context.project_id).bind(expected_row_version).bind(expected_source_hash).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Conflict("Exact immutable operating snapshot is unavailable".into()))?;
    if actual_action != draft.current_action_level.as_str() {
        return Err(Error::Conflict(
            "Captured G action differs from independent H derivation".into(),
        ));
    }
    let exists:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.operating_evaluation_evidence WHERE snapshot_id=$1 AND policy_version=$2)")
        .bind(snapshot_id).bind(policy::POLICY_VERSION).fetch_one(&mut *session.connection).await?;
    if exists {
        return Err(Error::CodedConflict {
            code: "operating_snapshot_already_evaluated",
            message: "This exact snapshot has already been evaluated".into(),
        });
    }
    let evidence_id = contract_support::new_uuid()?;
    let maturity_id = contract_support::new_uuid()?;
    let signal_id = contract_support::new_uuid()?;
    let now = crate::auth::model::clock_now();
    let output = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
    let output_hash = hash::canonical_hash(&output)?;
    sqlx::query("INSERT INTO poms.operating_evaluation_evidence(id,project_id,snapshot_id,source_context_id,producer_version,policy_version,policy_hash,source_hash,evaluation_hash,frozen_output,output_payload_hash,contains_labor,evaluated_at,evaluated_by,row_version) VALUES($1,$2,$3,$4,1,$5,$6,$7,$8,$9,$10,$11,$12,$13,1)")
        .bind(evidence_id).bind(context.project_id).bind(snapshot_id).bind(context.context_id).bind(policy::POLICY_VERSION).bind(policy::POLICY_HASH).bind(context.source_hash.as_str()).bind(draft.evaluation_hash.as_str()).bind(&output).bind(output_hash.as_str()).bind(context.labor_lineage.contains_labor.as_str()).bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    for (index, reason) in draft.all_reasons.iter().enumerate() {
        let payload = serde_json::to_value(reason).map_err(|_| Error::Internal)?;
        let reason_hash = hash::canonical_hash(&payload)?;
        sqlx::query("INSERT INTO poms.operating_evaluation_reason(evidence_id,reason_index,rule_id,reason_code,project_action,stage_actions,project_primary,stage_primaries,source_refs,frozen_payload,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)")
            .bind(evidence_id).bind(i32::try_from(index).map_err(|_|Error::Internal)?).bind(&reason.rule_id).bind(&reason.code).bind(reason.project_action.as_str())
            .bind(serde_json::to_value(&reason.stage_actions).map_err(|_|Error::Internal)?).bind(reason.is_primary_project_reason).bind(serde_json::to_value(&reason.primary_stages).map_err(|_|Error::Internal)?).bind(serde_json::to_value(&reason.evidence_refs).map_err(|_|Error::Internal)?).bind(payload).bind(reason_hash.as_str()).execute(&mut *session.connection).await?;
    }
    sqlx::query("INSERT INTO poms.data_maturity_evaluation_result(id,project_id,referenced_snapshot_id,data_maturity_level,cost_action_recommendation,tax_impact_pending_amount,allocation_stability_summary,unmapped_cost_summary,evaluation_basis_json,evaluated_at,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,evidence_id,tax_pending_knowledge) VALUES($1,$2,$3,$4,$5,$6::numeric,$7,$8,$9,$10,'active',$10,$11,$10,$11,1,1,$12,$13)")
        .bind(maturity_id).bind(context.project_id).bind(snapshot_id).bind(draft.cost_readiness.data_maturity_level.as_str()).bind(draft.cost_readiness.cost_action_recommendation.as_str()).bind(context.metrics.tax_pending_amount.value.as_deref()).bind(allocation_summary(&context)).bind(unmapped_summary(&context)).bind(serde_json::to_value(&draft.cost_readiness).map_err(|_|Error::Internal)?).bind(now).bind(actor.id).bind(evidence_id).bind(context.metrics.tax_pending_amount.knowledge.as_str()).execute(&mut *session.connection).await?;
    let formula = draft
        .all_reasons
        .iter()
        .filter(|r| r.rule_id == "H07")
        .map(|r| &r.project_action)
        .max_by_key(|a| policy::rank(a))
        .copied()
        .unwrap_or(OperatingSnapshotActionLevel::Prompt);
    sqlx::query("INSERT INTO poms.operating_signal_evaluation_result(id,project_id,referenced_snapshot_id,data_maturity_evaluation_id,signal_level,risk_level,formula_boundary_action,variance_source_summary,tax_impact_summary,allocation_stability_summary,unmapped_cost_summary,current_action_level,recommended_action_summary,referenced_baseline_version,referenced_snapshot_version,review_required,evaluated_at,status,created_at,created_by,updated_at,updated_by,row_version,producer_version,evidence_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active',$17,$18,$17,$18,1,1,$19)")
        .bind(signal_id).bind(context.project_id).bind(snapshot_id).bind(maturity_id).bind(draft.system_signal_level.as_str()).bind(draft.system_risk_level.as_str()).bind(formula.as_str())
        .bind(format!("精确净成本偏差={}",context.metrics.cost_variance_net.value.as_deref().unwrap_or("unknown"))).bind(tax_summary(&context)).bind(allocation_summary(&context)).bind(unmapped_summary(&context)).bind(draft.current_action_level.as_str()).bind(next_action(&draft,&draft.current_action_level)).bind(&context.baseline.referenced_baseline_version).bind(&context.snapshot.version)
        .bind(draft.current_action_level!=OperatingSnapshotActionLevel::Prompt||draft.effective_risk_level==OperatingRiskLevel::Unknown).bind(now).bind(actor.id).bind(evidence_id).execute(&mut *session.connection).await?;
    let (binding_ids, summary_snapshot_ids) = append_bindings(
        session,
        &context,
        &draft,
        evidence_id,
        signal_id,
        None,
        actor,
    )
    .await?;
    contract_support::audit(session,actor,AuditWrite {operation_id:"OperatingPolicy_evaluate".into(),target_type:"OperatingSignalEvaluationResult".into(),target_id:signal_id,project_id:context.project_id,contract_id:None,before:None,after:Some(json!({"signalEvaluationId":signal_id,"evidenceId":evidence_id,"snapshotId":snapshot_id,"sourceHash":context.source_hash,"evaluationHash":draft.evaluation_hash,"producerVersion":1})),reason:Some("冻结事实已按实际11条规则生成成熟度、信号与四阶段绑定".into()),metadata:json!({"policyVersion":policy::POLICY_VERSION,"policyHash":policy::POLICY_HASH,"safeAuditSummary":true})}).await?;
    session
        .state
        .trace
        .inserted("operating_evaluation_evidence", &evidence_id.to_string());
    session
        .state
        .trace
        .inserted("data_maturity_evaluation_result", &maturity_id.to_string());
    session
        .state
        .trace
        .inserted("operating_signal_evaluation_result", &signal_id.to_string());
    Ok(OperatingEvaluationRefs {
        snapshot_id,
        source_hash: context
            .source_hash
            .try_into()
            .map_err(|_| Error::Internal)?,
        evaluation_hash: draft.evaluation_hash,
        maturity_evaluation_id: maturity_id,
        signal_evaluation_id: signal_id,
        signal_row_version: 1,
        binding_ids,
        summary_snapshot_ids,
        current_action_level: draft.current_action_level,
        policy_version: policy::POLICY_VERSION.into(),
        certification: draft.certification,
    })
}

/// G history reads reuse the real H result chain for this exact immutable
/// snapshot. They never evaluate live sources or manufacture absent gates.
pub async fn load_evaluation_refs_with_session(
    session: &mut CommonSession<'_, '_>,
    snapshot_id: Uuid,
    actor: &Actor,
) -> Result<OperatingEvaluationRefs, Error> {
    let identity=sqlx::query("SELECT s.project_id,o.id FROM poms.project_operating_snapshot s JOIN poms.operating_signal_evaluation_result o ON o.referenced_snapshot_id=s.id AND o.project_id=s.project_id AND o.producer_version=1 WHERE s.id=$1 AND s.producer_version=1")
        .bind(snapshot_id).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::CodedConflict{code:"operating_evaluation_not_ready",message:"This snapshot has no certified operating evaluation".into()})?;
    let project: Uuid = identity.try_get("project_id")?;
    authorize_operating_read_with_session(session, project, actor).await?;
    let row = store::evaluation(session, identity.try_get("id")?, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        snapshot_id,
        row.snapshot_row_version,
        &row.source_hash,
    )
    .await?;
    let (draft, review_id) = super::review::effective_draft(session, &row, &context).await?;
    let rows=sqlx::query("SELECT id,gate_stage_type,current_summary_id,evaluation_hash FROM poms.operating_signal_gate_binding WHERE project_id=$1 AND signal_evaluation_id=$2 AND producer_version=1 AND signal_review_id IS NOT DISTINCT FROM $3 ORDER BY id")
        .bind(project).bind(row.id).bind(review_id).fetch_all(&mut *session.connection).await?;
    let mut binding_ids = BTreeMap::new();
    let mut summary_snapshot_ids = BTreeMap::new();
    for binding in rows {
        let stage: OperatingGateStage =
            serde_json::from_value(json!(binding.try_get::<String, _>("gate_stage_type")?))
                .map_err(|_| Error::Internal)?;
        if binding.try_get::<String, _>("evaluation_hash")? != draft.evaluation_hash.as_str()
            || binding_ids.insert(stage, binding.try_get("id")?).is_some()
        {
            return Err(Error::Conflict(
                "Snapshot evaluation stage result chain is inconsistent".into(),
            ));
        }
        summary_snapshot_ids.insert(stage, binding.try_get("current_summary_id")?);
    }
    if binding_ids.len() != 4 {
        return Err(Error::Conflict(
            "Snapshot evaluation has no complete four-stage result chain".into(),
        ));
    }
    Ok(OperatingEvaluationRefs {
        snapshot_id,
        source_hash: context
            .source_hash
            .try_into()
            .map_err(|_| Error::Internal)?,
        evaluation_hash: draft.evaluation_hash,
        maturity_evaluation_id: row.maturity_id,
        signal_evaluation_id: row.id,
        signal_row_version: row.row_version,
        binding_ids,
        summary_snapshot_ids,
        current_action_level: draft.current_action_level,
        policy_version: policy::POLICY_VERSION.into(),
        certification: draft.certification,
    })
}

pub async fn execute_with_session(
    session: &mut CommonSession<'_, '_>,
    operation_id: &str,
    keys: &crate::contract_support::http::ResourceKeys,
    query: &Value,
    request: &crate::contract_support::validation::TypedRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    use crate::contract_support::validation::TypedRequest;
    match (operation_id, request) {
        (
            "ProjectCostController_reviewOperatingSignalEvaluation",
            TypedRequest::ReviewOperatingSignalEvaluationRequest(body),
        ) => super::review::review_signal_with_session(session, keys.id()?, body, actor).await,
        (
            "ProjectCostController_reviewCommissionGateBinding",
            TypedRequest::ReviewCommissionGateBindingRequest(body),
        ) => super::review::review_gate_with_session(session, keys.id()?, body, actor).await,
        ("ProjectCostController_getOperatingSignalEvaluation", TypedRequest::None) => {
            super::query::signal_with_session(session, keys.id()?, actor).await
        }
        ("ProjectCostController_getCommissionGateBinding", TypedRequest::None) => {
            super::query::binding_with_session(session, keys.id()?, actor).await
        }
        (operation, TypedRequest::None)
            if [
                "ProjectCostController_getProjectBusinessOutcomeOverview",
                "ProjectCostController_getProjectUnifiedAccounting",
                "ProjectCostController_getProjectVarianceRiskExplanation",
                "ProjectCostController_getBusinessAccountingFeedback",
            ]
            .contains(&operation) =>
        {
            let project_id = keys.project_id()?;
            authorize_operating_read_with_session(session, project_id, actor).await?;
            if operation == "ProjectCostController_getProjectUnifiedAccounting"
                && query.get("view").and_then(Value::as_str) == Some("preparation")
            {
                return super::query::preparation_with_session(session, project_id, query, actor)
                    .await;
            }
            super::query::project_with_session(session, operation, project_id, actor).await
        }
        _ => Err(Error::Internal),
    }
}
