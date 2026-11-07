use super::{policy, projection, review, service, store, summary};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
    project_action_authorization::authorize_operating_read_with_session,
    project_operating_common::{loader::load_frozen_context_with_session, model::*},
};
use serde::Serialize;
use serde_json::{Map, Value, json};
use std::collections::BTreeSet;
use uuid::Uuid;

fn value<T: Serialize>(dto: T) -> Result<Value, Error> {
    serde_json::to_value(dto).map_err(|_| Error::Internal)
}
fn exact<T: serde::de::DeserializeOwned + Serialize>(v: Value) -> Result<Value, Error> {
    value(serde_json::from_value::<T>(v).map_err(|_| Error::Internal)?)
}
fn put(object: &mut Map<String, Value>, key: &str, v: impl Serialize) -> Result<(), Error> {
    object.insert(key.into(), value(v)?);
    Ok(())
}

pub(crate) fn evaluation_context(
    row: &store::EvaluationRow,
    context: &OperatingSourceContext,
    draft: &OperatingEvaluationDraft,
    review_id: Option<Uuid>,
    version: Option<i32>,
) -> Value {
    json!({"schemaVersion":1,"projectId":context.project_id,"snapshotId":context.snapshot.id,"snapshotRowVersion":context.snapshot.row_version,"snapshotMode":context.snapshot.mode,"maturityEvaluationId":row.maturity_id,"signalEvaluationId":row.id,"signalReviewRecordId":review_id,"sourceHash":context.source_hash,"evaluationHash":draft.evaluation_hash,"policyVersion":policy::POLICY_VERSION,"policyHash":policy::POLICY_HASH,"producerVersion":1,"certification":draft.certification,"evaluationStatus":if row.status!="active"||row.snapshot_status!="active" {"stale"}else{draft.evaluation_status.as_str()},"rowVersion":version.unwrap_or(row.row_version)})
}
fn review_state(
    row: &store::EvaluationRow,
    draft: &OperatingEvaluationDraft,
    review_id: Option<Uuid>,
) -> &'static str {
    if row.status != "active" || row.snapshot_status != "active" {
        "stale"
    } else if draft.effective_risk_level == OperatingRiskLevel::Unknown {
        "pending"
    } else if review_id.is_some() {
        "manual-confirmed"
    } else if draft.current_action_level != OperatingSnapshotActionLevel::Prompt {
        "pending"
    } else {
        "not-required"
    }
}
pub(crate) async fn common_fields(
    session: &mut CommonSession<'_, '_>,
    row: &store::EvaluationRow,
    context: &OperatingSourceContext,
    draft: &OperatingEvaluationDraft,
    review_id: Option<Uuid>,
    version: Option<i32>,
    actor: &Actor,
) -> Result<Map<String, Value>, Error> {
    let labor = context.labor_lineage.contains_labor.as_str() != "no";
    let review_text = if let Some(id) = review_id {
        sqlx::query_scalar::<_,Option<String>>("SELECT review_comment FROM poms.operating_signal_review_record WHERE id=$1 AND signal_evaluation_id=$2").bind(id).bind(row.id).fetch_optional(&mut *session.connection).await?.flatten()
    } else {
        None
    };
    let mut inputs = vec![
        (
            "taxImpactSummaryProjection".into(),
            Some(service::tax_summary(context)),
        ),
        (
            "taxImpactPendingAmountProjection".into(),
            context.metrics.tax_pending_amount.value.clone(),
        ),
        (
            "allocationStabilitySummaryProjection".into(),
            Some(service::allocation_summary(context)),
        ),
        (
            "unmappedCostSummaryProjection".into(),
            Some(service::unmapped_summary(context)),
        ),
        ("reviewSummaryProjection".into(), review_text),
        (
            "effectiveContractSetSummaryProjection".into(),
            context
                .metrics
                .effective_contract_amounts
                .gross
                .value
                .clone(),
        ),
        (
            "receivableConfirmedAmountSummaryProjection".into(),
            context.metrics.confirmed_receipt_amounts.net.value.clone(),
        ),
        (
            "includedCostTotalSummaryProjection".into(),
            context.metrics.included_cost_amounts.net.value.clone(),
        ),
        (
            "originalBaselineCostSummaryProjection".into(),
            context.baseline.original_net_cost.value.clone(),
        ),
        (
            "currentEffectiveBaselineCostSummaryProjection".into(),
            context.baseline.current_effective_net_cost.value.clone(),
        ),
        (
            "grossMarginAmountProjection".into(),
            context.metrics.gross_margin_net.value.clone(),
        ),
        (
            "grossMarginRateProjection".into(),
            context.metrics.gross_margin_rate.value.clone(),
        ),
        (
            "varianceSourceSummaryProjection".into(),
            context.metrics.cost_variance_net.value.clone(),
        ),
        (
            "recommendedActionSummaryProjection".into(),
            Some(service::next_action(draft, &draft.current_action_level)),
        ),
        (
            "nextActionSummaryProjection".into(),
            Some(service::next_action(draft, &draft.current_action_level)),
        ),
        (
            "downstreamConsumerSummaryProjection".into(),
            Some("四个阶段独立消费；阶段人工确认仅完成复核职责，不构成提成发放授权".into()),
        ),
    ];
    for (index, reason) in draft.all_reasons.iter().enumerate() {
        inputs.push((
            format!("reason.{index}.detail"),
            Some(reason.detail.clone()),
        ));
        inputs.push((
            format!("reason.{index}.evidence"),
            Some(serde_json::to_string(&reason.evidence_refs).map_err(|_| Error::Internal)?),
        ));
    }
    let mut fields = projection::fields(
        session,
        actor,
        "OperatingSignalEvaluationResult",
        row.id,
        context.project_id,
        labor,
        inputs,
    )
    .await?;
    let mut reasons = vec![];
    for (index, reason) in draft.all_reasons.iter().enumerate() {
        reasons.push(json!({"reasonId":reason.reason_id,"code":reason.code,"category":reason.category,"ruleId":reason.rule_id,"projectAction":reason.project_action,"stageActions":reason.stage_actions,"isPrimaryProjectReason":reason.is_primary_project_reason,"primaryStages":reason.primary_stages,"detailProjection":fields.remove(&format!("reason.{index}.detail")).ok_or(Error::Internal)?,"evidenceProjection":fields.remove(&format!("reason.{index}.evidence")).ok_or(Error::Internal)?}));
    }
    let mut out = fields.into_iter().collect::<Map<_, _>>();
    put(
        &mut out,
        "evaluationContext",
        evaluation_context(row, context, draft, review_id, version),
    )?;
    put(&mut out, "reasonItems", reasons)?;
    put(&mut out, "reviewState", review_state(row, draft, review_id))?;
    put(
        &mut out,
        "metricKnowledge",
        &draft.cost_readiness.known_metric_states,
    )?;
    put(
        &mut out,
        "dataMaturityLevel",
        draft.cost_readiness.data_maturity_level,
    )?;
    put(
        &mut out,
        "costActionRecommendation",
        draft.cost_readiness.cost_action_recommendation,
    )?;
    put(&mut out, "currentActionLevel", draft.current_action_level)?;
    put(
        &mut out,
        "referencedBaselineVersion",
        &context.baseline.referenced_baseline_version,
    )?;
    put(
        &mut out,
        "referencedSnapshotVersion",
        &context.snapshot.version,
    )?;
    put(&mut out, "signalLevel", draft.effective_signal_level)?;
    put(&mut out, "riskLevel", draft.effective_risk_level)?;
    put(&mut out, "systemSignalLevel", draft.system_signal_level)?;
    put(&mut out, "systemRiskLevel", draft.system_risk_level)?;
    Ok(out)
}
fn select(source: &Map<String, Value>, keys: &[&str]) -> Result<Map<String, Value>, Error> {
    keys.iter()
        .map(|key| {
            Ok((
                (*key).into(),
                source.get(*key).cloned().ok_or(Error::Internal)?,
            ))
        })
        .collect()
}
const COMMON: &[&str] = &[
    "dataMaturityLevel",
    "costActionRecommendation",
    "currentActionLevel",
    "referencedBaselineVersion",
    "referencedSnapshotVersion",
    "evaluationContext",
    "reasonItems",
    "reviewState",
    "metricKnowledge",
];

pub(crate) async fn signal_dto(
    session: &mut CommonSession<'_, '_>,
    row: &store::EvaluationRow,
    context: &OperatingSourceContext,
    draft: &OperatingEvaluationDraft,
    review_id: Option<Uuid>,
    version: Option<i32>,
    actor: &Actor,
) -> Result<Value, Error> {
    let common = common_fields(session, row, context, draft, review_id, version, actor).await?;
    let mut out = select(&common, COMMON)?;
    for key in [
        "signalLevel",
        "riskLevel",
        "systemSignalLevel",
        "systemRiskLevel",
        "taxImpactSummaryProjection",
        "allocationStabilitySummaryProjection",
        "unmappedCostSummaryProjection",
        "reviewSummaryProjection",
    ] {
        out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
    }
    for key in [
        "taxImpactSummary",
        "allocationStabilitySummary",
        "unmappedCostSummary",
        "reviewSummary",
    ] {
        out.insert(key.into(), Value::Null);
    }
    put(&mut out, "signalEvaluationId", row.id)?;
    put(&mut out, "projectId", context.project_id)?;
    put(&mut out, "rowVersion", version.unwrap_or(row.row_version))?;
    put(
        &mut out,
        "formulaBoundaryAction",
        policy::max_action(
            draft
                .all_reasons
                .iter()
                .filter(|r| r.rule_id == "H07")
                .map(|r| &r.project_action),
        ),
    )?;
    put(
        &mut out,
        "reviewRequired",
        review_state(row, draft, review_id) == "pending",
    )?;
    exact::<OperatingSignalEvaluationView>(Value::Object(out))
}

pub async fn signal_with_session(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = store::evaluation_identity(session, id).await?;
    authorize_operating_read_with_session(session, project, actor).await?;
    let row = store::evaluation(session, id, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        row.snapshot_id,
        row.snapshot_row_version,
        &row.source_hash,
    )
    .await?;
    let (draft, review_id) = review::effective_draft(session, &row, &context).await?;
    signal_dto(session, &row, &context, &draft, review_id, None, actor).await
}

pub(crate) async fn binding_draft(
    session: &mut CommonSession<'_, '_>,
    binding: &store::BindingRow,
    context: &OperatingSourceContext,
) -> Result<OperatingEvaluationDraft, Error> {
    let overlay = if let Some(id) = binding.signal_review_id {
        let stored = store::signal_review(session, id, binding.signal_id).await?;
        review::decode_overlay(&stored, context)?
    } else {
        None
    };
    let draft = policy::derive_operating_evaluation(context, overlay.as_ref())?;
    if draft.evaluation_hash.as_str() != binding.evaluation_hash {
        return Err(Error::Conflict(
            "Binding references a different immutable evaluation".into(),
        ));
    }
    Ok(draft)
}

pub async fn binding_with_session(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = store::binding_identity(session, id).await?;
    authorize_operating_read_with_session(session, project, actor).await?;
    let binding = store::binding(session, id, project, false).await?;
    let row = store::evaluation(session, binding.signal_id, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        row.snapshot_id,
        row.snapshot_row_version,
        &row.source_hash,
    )
    .await?;
    let draft = binding_draft(session, &binding, &context).await?;
    let common = common_fields(
        session,
        &row,
        &context,
        &draft,
        binding.signal_review_id,
        None,
        actor,
    )
    .await?;
    let mut out = select(&common, COMMON)?;
    for key in [
        "signalLevel",
        "systemSignalLevel",
        "taxImpactSummaryProjection",
        "taxImpactPendingAmountProjection",
    ] {
        out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
    }
    let gate_review = store::latest_gate_review(session, id).await?;
    let stale = binding.status != "active" || !row.source_current || row.status != "active";
    let detail_projection = projection::fields(
        session,
        actor,
        "OperatingSignalGateBinding",
        id,
        project,
        context.labor_lineage.contains_labor.as_str() != "no",
        vec![
            (
                "blockingReasonSummaryProjection".into(),
                Some(
                    draft
                        .all_reasons
                        .iter()
                        .filter(|r| {
                            r.stage_actions.get(&binding.stage)
                                == Some(&OperatingSnapshotActionLevel::Block)
                        })
                        .map(|r| r.detail.as_str())
                        .collect::<Vec<_>>()
                        .join("；"),
                ),
            ),
            (
                "nextActionSummaryProjection".into(),
                Some(service::next_action(&draft, &binding.action)),
            ),
        ],
    )
    .await?;
    for (key, v) in detail_projection {
        out.insert(key, v);
    }
    for key in [
        "taxImpactSummary",
        "taxImpactPendingAmount",
        "blockingReasonSummary",
        "nextActionSummary",
    ] {
        out.insert(key.into(), Value::Null);
    }
    put(&mut out, "bindingId", id)?;
    put(&mut out, "projectId", project)?;
    put(&mut out, "signalEvaluationId", row.id)?;
    put(&mut out, "gateStageType", binding.stage)?;
    put(
        &mut out,
        "baselineSelectionSource",
        context.baseline.selection_source,
    )?;
    put(&mut out, "bindingAction", binding.action)?;
    put(&mut out, "systemBindingAction", binding.system_action)?;
    put(
        &mut out,
        "gateReviewDecision",
        gate_review
            .as_ref()
            .and_then(|r| r.get("gateReviewDecision")),
    )?;
    put(&mut out, "summaryPackageKey", summary::PACKAGE)?;
    put(&mut out, "summarySnapshotId", binding.summary_id)?;
    put(&mut out, "projectionLevel", summary::PROJECTION)?;
    put(&mut out, "exportPolicy", summary::EXPORT)?;
    put(
        &mut out,
        "sourceSummarySnapshotId",
        binding.source_summary_id,
    )?;
    put(&mut out, "rowVersion", binding.row_version)?;
    put(
        &mut out,
        "handledBy",
        gate_review.as_ref().and_then(|r| r.get("handledBy")),
    )?;
    put(
        &mut out,
        "handledAt",
        gate_review.as_ref().and_then(|r| r.get("handledAt")),
    )?;
    put(
        &mut out,
        "allowedActions",
        if !stale
            && projection::may_read(actor, context.labor_lineage.contains_labor.as_str() != "no")
        {
            vec!["reviewCommissionGateBinding"]
        } else {
            vec![]
        },
    )?;
    put(
        &mut out,
        "reviewState",
        if stale {
            "stale"
        } else if gate_review.is_some() {
            "acknowledged"
        } else {
            "pending"
        },
    )?;
    exact::<CommissionGateBindingHistoryView>(Value::Object(out))
}

pub(crate) struct GateReviewResultInput<'a> {
    pub id: Uuid,
    pub review_id: Uuid,
    pub row: &'a store::EvaluationRow,
    pub context: &'a OperatingSourceContext,
    pub draft: &'a OperatingEvaluationDraft,
    pub binding: &'a store::BindingRow,
    pub version: i32,
    pub summary_id: Uuid,
    pub action: OperatingSnapshotActionLevel,
    pub decision: OperatingGateReviewDecision,
}
pub(crate) async fn gate_review_result(
    session: &mut CommonSession<'_, '_>,
    input: GateReviewResultInput<'_>,
    actor: &Actor,
) -> Result<Value, Error> {
    let GateReviewResultInput {
        id,
        review_id,
        row,
        context,
        draft,
        binding,
        version,
        summary_id,
        action,
        decision,
    } = input;
    let common = common_fields(
        session,
        row,
        context,
        draft,
        binding.signal_review_id,
        None,
        actor,
    )
    .await?;
    let mut out = select(&common, COMMON)?;
    for key in [
        "taxImpactSummaryProjection",
        "taxImpactPendingAmountProjection",
        "nextActionSummaryProjection",
    ] {
        out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
    }
    let next = projection::fields(
        session,
        actor,
        "OperatingSignalGateBinding",
        id,
        context.project_id,
        context.labor_lineage.contains_labor.as_str() != "no",
        vec![(
            "nextActionSummaryProjection".into(),
            Some(service::next_action(draft, &action)),
        )],
    )
    .await?;
    out.insert(
        "nextActionSummaryProjection".into(),
        next.get("nextActionSummaryProjection")
            .cloned()
            .ok_or(Error::Internal)?,
    );
    for key in [
        "taxImpactSummary",
        "taxImpactPendingAmount",
        "nextActionSummary",
    ] {
        out.insert(key.into(), Value::Null);
    }
    put(&mut out, "targetId", id)?;
    put(&mut out, "bindingResultId", id)?;
    put(&mut out, "gateReviewRecordId", review_id)?;
    put(&mut out, "rowVersion", version)?;
    put(&mut out, "gateStageType", binding.stage)?;
    put(
        &mut out,
        "baselineSelectionSource",
        context.baseline.selection_source,
    )?;
    put(&mut out, "systemBindingAction", binding.system_action)?;
    put(&mut out, "bindingAction", action)?;
    put(&mut out, "gateReviewDecision", decision)?;
    put(&mut out, "businessStatusAfter", decision.as_str())?;
    put(&mut out, "summaryPackageKey", summary::PACKAGE)?;
    put(&mut out, "summarySnapshotId", summary_id)?;
    put(&mut out, "projectionLevel", summary::PROJECTION)?;
    put(&mut out, "exportPolicy", summary::EXPORT)?;
    put(
        &mut out,
        "reviewState",
        if decision == OperatingGateReviewDecision::ReviewRequired {
            "pending"
        } else {
            "acknowledged"
        },
    )?;
    exact::<ReviewCommissionGateBindingResult>(Value::Object(out))
}

async fn gate_feedback(
    session: &mut CommonSession<'_, '_>,
    binding: &store::BindingRow,
    context: &OperatingSourceContext,
    draft: &OperatingEvaluationDraft,
    reason_items: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    let review = store::active_gate_review(session, binding.id).await?;
    let projected = projection::fields(
        session,
        actor,
        "OperatingSignalGateBinding",
        binding.id,
        context.project_id,
        context.labor_lineage.contains_labor.as_str() != "no",
        vec![(
            "nextActionSummaryProjection".into(),
            Some(service::next_action(draft, &binding.action)),
        )],
    )
    .await?;
    let gate = draft
        .four_stage_drafts
        .get(&binding.stage)
        .ok_or(Error::Internal)?;
    exact::<OperatingGateFeedbackItem>(
        json!({"bindingId":binding.id,"rowVersion":binding.row_version,"gateStageType":binding.stage,"systemBindingAction":binding.system_action,"bindingAction":binding.action,"gateReviewDecision":review.as_ref().and_then(|r|r.get("gateReviewDecision")),"reviewState":if review.is_some(){"acknowledged"}else{"pending"},"summaryPackageKey":summary::PACKAGE,"summarySnapshotId":binding.summary_id,"projectionLevel":summary::PROJECTION,"exportPolicy":summary::EXPORT,"evaluationHash":binding.evaluation_hash,"primaryReasonIds":gate.primary_reason_ids,"reasonItems":reason_items,"nextActionSummaryProjection":projected.get("nextActionSummaryProjection").ok_or(Error::Internal)?}),
    )
}

pub async fn project_with_session(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    project: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    authorize_operating_read_with_session(session, project, actor).await?;
    let Some(id) = store::current_evaluation_id(session, project).await? else {
        let error:OperatingEvaluationNotReadyError=serde_json::from_value(json!({"statusCode":409,"error":"Conflict","message":"尚无当前正式经营评价；请先检查真实来源与准备视图","projectId":project,"evaluationStatus":"not-evaluated","reasonCodes":["operating_evaluation_not_ready"]})).map_err(|_|Error::Internal)?;
        return Err(Error::TypedConflict(value(error)?));
    };
    let row = store::evaluation(session, id, project, false).await?;
    let context = load_frozen_context_with_session(
        session,
        row.snapshot_id,
        row.snapshot_row_version,
        &row.source_hash,
    )
    .await?;
    let (draft, review_id) = review::effective_draft(session, &row, &context).await?;
    let common = common_fields(session, &row, &context, &draft, review_id, None, actor).await?;
    let mut out = select(&common, COMMON)?;
    put(&mut out, "projectId", project)?;
    put(
        &mut out,
        "allowedActions",
        if projection::may_read(actor, context.labor_lineage.contains_labor.as_str() != "no") {
            vec!["reviewOperatingSignalEvaluation"]
        } else {
            vec![]
        },
    )?;
    for key in ["allocationStabilitySummary", "unmappedCostSummary"] {
        out.insert(key.into(), Value::Null);
    }
    for key in [
        "taxImpactSummaryProjection",
        "allocationStabilitySummaryProjection",
        "unmappedCostSummaryProjection",
    ] {
        out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
    }
    match operation {
        "ProjectCostController_getProjectBusinessOutcomeOverview" => {
            for key in [
                "effectiveContractSetSummaryProjection",
                "receivableConfirmedAmountSummaryProjection",
                "includedCostTotalSummaryProjection",
                "currentEffectiveBaselineCostSummaryProjection",
                "grossMarginAmountProjection",
                "grossMarginRateProjection",
                "signalLevel",
                "riskLevel",
            ] {
                out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
            }
            exact::<ProjectBusinessOutcomeOverviewView>(Value::Object(out))
        }
        "ProjectCostController_getProjectUnifiedAccounting" => {
            for key in [
                "originalBaselineCostSummaryProjection",
                "currentEffectiveBaselineCostSummaryProjection",
                "includedCostTotalSummaryProjection",
                "receivableConfirmedAmountSummaryProjection",
                "taxImpactPendingAmountProjection",
            ] {
                out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
            }
            put(&mut out, "snapshotId", context.snapshot.id)?;
            exact::<ProjectUnifiedAccountingView>(Value::Object(out))
        }
        "ProjectCostController_getProjectVarianceRiskExplanation" => {
            for key in [
                "varianceSourceSummaryProjection",
                "riskLevel",
                "systemRiskLevel",
                "recommendedActionSummaryProjection",
            ] {
                out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
            }
            put(&mut out, "recommendedActionSummary", Value::Null)?;
            put(&mut out, "signalEvaluationId", row.id)?;
            exact::<ProjectVarianceRiskExplanationView>(Value::Object(out))
        }
        "ProjectCostController_getBusinessAccountingFeedback" => {
            let bindings = store::bindings(session, project, row.id).await?;
            if bindings.len() != 4
                || bindings
                    .iter()
                    .map(|b| b.stage)
                    .collect::<BTreeSet<_>>()
                    .len()
                    != 4
                || bindings.iter().any(|b| {
                    b.evaluation_hash != draft.evaluation_hash.as_str()
                        || b.signal_review_id != review_id
                })
            {
                return Err(Error::Conflict(
                    "Current four-stage binding set is incomplete or stale".into(),
                ));
            }
            let mut stage_bindings = vec![];
            for stage in policy::STAGES {
                let binding = bindings
                    .iter()
                    .find(|b| b.stage == stage)
                    .ok_or(Error::Internal)?;
                stage_bindings.push(
                    gate_feedback(
                        session,
                        binding,
                        &context,
                        &draft,
                        common.get("reasonItems").ok_or(Error::Internal)?,
                        actor,
                    )
                    .await?,
                );
            }
            for key in [
                "signalLevel",
                "nextActionSummaryProjection",
                "downstreamConsumerSummaryProjection",
            ] {
                out.insert(key.into(), common.get(key).cloned().ok_or(Error::Internal)?);
            }
            put(&mut out, "signalEvaluationId", row.id)?;
            put(&mut out, "stageBindings", stage_bindings)?;
            exact::<BusinessAccountingFeedbackView>(Value::Object(out))
        }
        _ => Err(Error::Internal),
    }
}

pub async fn preparation_with_session(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    query: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    authorize_operating_read_with_session(session, project, actor).await?;
    let mut preparation = crate::project_operating::preparation::prepare_query_with_session(
        session, project, query, actor,
    )
    .await?;
    if store::current_evaluation_id(session, project)
        .await?
        .is_some()
    {
        preparation.official_current = Some(
            serde_json::from_value(
                project_with_session(
                    session,
                    "ProjectCostController_getProjectUnifiedAccounting",
                    project,
                    actor,
                )
                .await?,
            )
            .map_err(|_| Error::Internal)?,
        );
    }
    value(preparation)
}
