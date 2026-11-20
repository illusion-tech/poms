//! Production commission-gate package. These are summaries, not approvals,
//! confirmations, or payout permissions.
use crate::{
    approval_common::CommonSession,
    contract_support::{self, Actor, Error},
    project_operating_common::{hash, model::*},
};
use serde_json::{Value, json};
use sqlx::Row;
use uuid::Uuid;

pub const SCENARIO: &str = "commission-gate-review";
pub const PACKAGE: &str = "project-operating-commission-gate-v1";
pub const PROJECTION: &str = "commission-gate-review";
pub const EXPORT: &str = "internal-only";
pub const TARGET: &str = "operating-signal-gate-binding";

pub(crate) struct SummaryInput<'a> {
    pub id: Uuid,
    pub binding_id: Uuid,
    pub binding_row_version: i32,
    pub stage: &'a OperatingGateStage,
    pub evidence_id: Uuid,
    pub signal_id: Uuid,
    pub signal_review_id: Option<Uuid>,
    pub gate_review_id: Option<Uuid>,
    pub source_summary_id: Option<Uuid>,
    pub context: &'a OperatingSourceContext,
    pub draft: &'a OperatingEvaluationDraft,
    pub effective_action: &'a OperatingSnapshotActionLevel,
    pub review_decision: Option<&'a OperatingGateReviewDecision>,
}

pub(crate) async fn create_with_session(
    session: &mut CommonSession<'_, '_>,
    input: SummaryInput<'_>,
    actor: &Actor,
) -> Result<(), Error> {
    let definition=sqlx::query("SELECT id FROM poms.approval_summary_package_definition WHERE approval_scenario_key=$1 AND summary_package_key=$2 AND projection_level=$3 AND export_policy=$4 AND field_rule_version=$5 AND status='active'")
        .bind(SCENARIO).bind(PACKAGE).bind(PROJECTION).bind(EXPORT).bind(super::policy::POLICY_VERSION).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::CodedConflict{code:"operating_summary_definition_unavailable",message:"Production operating summary definition is unavailable".into()})?;
    let definition_id: Uuid = definition.try_get("id")?;
    let now = crate::auth::model::clock_now();
    let payload = json!({"schemaVersion":1,"projectId":input.context.project_id,"gateStageType":input.stage,"snapshotId":input.context.snapshot.id,"sourceHash":input.context.source_hash,"policyVersion":super::policy::POLICY_VERSION,"policyHash":super::policy::POLICY_HASH,"evaluationHash":input.draft.evaluation_hash,"signalEvaluationId":input.signal_id,"signalReviewRecordId":input.signal_review_id,"bindingId":input.binding_id,"bindingRowVersion":input.binding_row_version,"gateReviewRecordId":input.gate_review_id,"sourceSummarySnapshotId":input.source_summary_id,"bindingAction":input.effective_action,"gateReviewDecision":input.review_decision,"certification":input.draft.certification,"evaluationStatus":input.draft.evaluation_status,"dataMaturityLevel":input.draft.cost_readiness.data_maturity_level,"costActionRecommendation":input.draft.cost_readiness.cost_action_recommendation,"metricKnowledge":input.draft.cost_readiness.known_metric_states,"reasonItems":input.draft.all_reasons,"stageDraft":input.draft.four_stage_drafts.get(input.stage),"laborLineage":input.context.labor_lineage,"baselineSelectionSource":input.context.baseline.selection_source,"referencedBaselineVersion":input.context.baseline.referenced_baseline_version,"referencedSnapshotVersion":input.context.snapshot.version,"baseline":input.context.baseline,"metrics":input.context.metrics});
    let payload_hash = hash::canonical_hash(&payload)?;
    if let Some(previous) = input.source_summary_id {
        sqlx::query("UPDATE poms.approval_summary_snapshot SET status='superseded',row_version=row_version+1,updated_at=$2,updated_by=$3 WHERE id=$1 AND target_type=$4 AND target_id=$5 AND status='active'")
            .bind(previous).bind(now).bind(actor.id).bind(TARGET).bind(input.binding_id).execute(&mut *session.connection).await?;
    }
    sqlx::query("INSERT INTO poms.approval_summary_snapshot(id,target_type,target_id,approval_scenario_key,summary_package_id,summary_package_key,projection_level,export_policy,business_status_at_snapshot,generated_at,status,supersedes_id,created_at,created_by,updated_at,updated_by,row_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$10,$12,$10,$12,1)")
        .bind(input.id).bind(TARGET).bind(input.binding_id).bind(SCENARIO).bind(definition_id).bind(PACKAGE).bind(PROJECTION).bind(EXPORT)
        .bind(input.review_decision.map(super::policy::wire).transpose()?.unwrap_or_else(||"review-pending".into())).bind(now).bind(input.source_summary_id).bind(actor.id).execute(&mut *session.connection).await?;
    for (index, key) in [
        "operatingAdvice",
        "reasonItems",
        "sourceIdentity",
        "financialFacts",
    ]
    .into_iter()
    .enumerate()
    {
        sqlx::query("INSERT INTO poms.approval_summary_field_projection(id,summary_snapshot_id,field_key,visibility_level,masking_mode,export_policy,field_order,channel_scope_summary,created_at,created_by) VALUES($1,$2,$3,$4,'field-package',$5,$6,$7,$8,$9)")
            .bind(contract_support::new_uuid()?).bind(input.id).bind(key).bind(if input.context.labor_lineage.contains_labor.as_str()=="no" {"operating-finance"}else{"operating-finance-and-labor"})
            .bind(EXPORT).bind(i32::try_from(index).map_err(|_|Error::Internal)?).bind("仅限同项目真实范围；金额、税务、原因、证据和下一步动作共同使用源敏感投影。复核不构成发放授权。")
            .bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    }
    sqlx::query("INSERT INTO poms.operating_gate_summary_payload(summary_snapshot_id,binding_id,binding_row_version,project_id,gate_stage_type,snapshot_id,evidence_id,source_hash,evaluation_hash,policy_version,policy_hash,source_summary_snapshot_id,signal_review_id,gate_review_id,frozen_payload,payload_hash,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)")
        .bind(input.id).bind(input.binding_id).bind(input.binding_row_version).bind(input.context.project_id).bind(super::policy::wire(input.stage)?).bind(input.context.snapshot.id).bind(input.evidence_id)
        .bind(input.context.source_hash.as_str()).bind(input.draft.evaluation_hash.as_str()).bind(super::policy::POLICY_VERSION).bind(super::policy::POLICY_HASH).bind(input.source_summary_id).bind(input.signal_review_id).bind(input.gate_review_id)
        .bind(payload).bind(payload_hash.as_str()).bind(now).bind(actor.id).execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("approval_summary_snapshot", &input.id.to_string());
    session
        .state
        .trace
        .inserted("operating_gate_summary_payload", &input.id.to_string());
    Ok(())
}

pub(crate) async fn validate_source_summary(
    session: &mut CommonSession<'_, '_>,
    binding: &super::store::BindingRow,
    context: &OperatingSourceContext,
    expected_hash: &str,
) -> Result<(), Error> {
    let row=sqlx::query("SELECT s.target_type,s.target_id,s.approval_scenario_key,s.summary_package_key,s.projection_level,s.export_policy,p.binding_id,p.binding_row_version,p.project_id,p.gate_stage_type,p.snapshot_id,p.source_hash,p.evaluation_hash,p.policy_version,p.policy_hash,p.frozen_payload,p.payload_hash FROM poms.approval_summary_snapshot s JOIN poms.operating_gate_summary_payload p ON p.summary_snapshot_id=s.id WHERE s.id=$1 AND s.status='active'")
        .bind(binding.summary_id).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("Current source summary is unavailable".into()))?;
    let payload: Value = row.try_get("frozen_payload")?;
    let stored_payload_hash: String = row.try_get("payload_hash")?;
    let expected_identity = json!({"projectId":context.project_id,"gateStageType":binding.stage,"snapshotId":context.snapshot.id,"sourceHash":context.source_hash,"policyVersion":super::policy::POLICY_VERSION,"policyHash":super::policy::POLICY_HASH,"evaluationHash":expected_hash,"signalEvaluationId":binding.signal_id,"signalReviewRecordId":binding.signal_review_id,"bindingId":binding.id,"bindingRowVersion":binding.row_version,"bindingAction":binding.action,"baselineSelectionSource":context.baseline.selection_source,"referencedBaselineVersion":context.baseline.referenced_baseline_version,"referencedSnapshotVersion":context.snapshot.version,"baseline":context.baseline,"metrics":context.metrics});
    let identity_matches = expected_identity
        .as_object()
        .ok_or(Error::Internal)?
        .iter()
        .all(|(key, value)| payload.get(key) == Some(value));
    if row.try_get::<String, _>("target_type")? != TARGET
        || row.try_get::<Uuid, _>("target_id")? != binding.id
        || row.try_get::<String, _>("approval_scenario_key")? != SCENARIO
        || row.try_get::<String, _>("summary_package_key")? != PACKAGE
        || row.try_get::<String, _>("projection_level")? != PROJECTION
        || row.try_get::<String, _>("export_policy")? != EXPORT
        || row.try_get::<Uuid, _>("binding_id")? != binding.id
        || row.try_get::<i32, _>("binding_row_version")? != binding.row_version
        || row.try_get::<Uuid, _>("project_id")? != context.project_id
        || row.try_get::<Uuid, _>("snapshot_id")? != context.snapshot.id
        || row.try_get::<String, _>("gate_stage_type")? != super::policy::wire(&binding.stage)?
        || row.try_get::<String, _>("source_hash")? != context.source_hash.as_str()
        || row.try_get::<String, _>("evaluation_hash")? != expected_hash
        || row.try_get::<String, _>("policy_version")? != super::policy::POLICY_VERSION
        || row.try_get::<String, _>("policy_hash")? != super::policy::POLICY_HASH
        || hash::canonical_hash(&payload)?.as_str() != stored_payload_hash
        || !identity_matches
    {
        return Err(Error::Conflict(
            "Source summary identity, policy, projection or immutable payload mismatch".into(),
        ));
    }
    Ok(())
}
