use super::{payout_context, service::projection_packet, settlement};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    project: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    // Keep the multi-query view coherent with project-serialized financial writes.
    let exists: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM poms.project WHERE id=$1 FOR SHARE")
            .bind(project)
            .fetch_optional(&mut *session.connection)
            .await?;
    if exists.is_none() {
        return Err(Error::NotFound("项目不存在。".into()));
    }
    let snapshot:Value=sqlx::query_scalar("SELECT to_jsonb(s)||jsonb_build_object('tax_impact_pending_amount',s.tax_impact_pending_amount::text) FROM poms.commission_final_settlement_snapshot s WHERE project_id=$1 AND is_current AND status='active' FOR SHARE")
        .bind(project).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::NotFound("本项目尚无当前最终结算快照。".into()))?;
    let source = payout_context::settlement_source(session, project).await?;
    settlement::references(&snapshot, &source)?;
    let state = serde_json::to_value(settlement::state(session, project, &source).await?.draft)
        .map_err(|_| Error::Internal)?;
    let mut sensitive = snapshot.clone();
    sensitive["id"] = json!(project);
    let tax = projection_packet(
        session,
        actor,
        &sensitive,
        "project",
        SensitiveFieldPackageKey::OperatingFinance,
        &[
            ("taxImpactSummaryProjection", "tax_impact_summary"),
            (
                "taxImpactPendingAmountProjection",
                "tax_impact_pending_amount",
            ),
        ],
    )
    .await?;
    let mut result = match operation {
        "CommissionController_getCommissionFinalSettlement" => {
            sensitive["retention_receipt_summary"] = state["retentionReceiptSummary"].clone();
            let receipt = projection_packet(
                session,
                actor,
                &sensitive,
                "project",
                SensitiveFieldPackageKey::ContractFinance,
                &[(
                    "retentionReceiptSummaryProjection",
                    "retention_receipt_summary",
                )],
            )
            .await?;
            let receipt_summary = if state["retentionReceiptSummary"].is_null() {
                Value::Null
            } else if receipt["retentionReceiptSummaryProjection"]["value"].is_null() {
                json!("质保金到账摘要受合同资金敏感权限限制。")
            } else {
                receipt["retentionReceiptSummaryProjection"]["value"].clone()
            };
            json!({"projectId":project,"finalSettlementStatus":state["finalSettlementStatus"],"nonRetentionSettlementStatus":state["nonRetentionSettlementStatus"],"retentionSettlementStatus":state["retentionSettlementStatus"],"retentionDueDate":state["retentionDueDate"],"retentionDueStatus":state["retentionDueStatus"],"retentionRequirementSummary":state["retentionRequirementSummary"],"retentionReceiptSummary":receipt_summary,"departureExceptionSummary":state["departureExceptionSummary"]})
        }
        "CommissionController_getCommissionRuleExplanation" => {
            let explanation:Option<Uuid>=sqlx::query_scalar("SELECT id FROM poms.commission_rule_explanation_snapshot WHERE project_id=$1 AND is_current AND status='active' AND final_settlement_snapshot_id=$2 FOR SHARE")
                .bind(project).bind(crate::project_lifecycle::facts::id(&snapshot,"id")?).fetch_optional(&mut *session.connection).await?;
            if explanation.is_none() {
                return Err(Error::NotFound("本项目尚无匹配的当前规则解释。".into()));
            }
            let rule = &state["ruleExplanation"];
            sensitive["next_action_summary"] = rule["nextActionSummary"].clone();
            let projected = projection_packet(
                session,
                actor,
                &sensitive,
                "project",
                SensitiveFieldPackageKey::CommissionCompensation,
                &[("nextActionSummaryProjection", "next_action_summary")],
            )
            .await?;
            json!({"projectId":project,"currentStageStatus":rule["currentStageStatus"],"gateDecisionCode":rule["gateDecisionCode"],"blockingReasonCategory":rule["blockingReasonCategory"],"blockingReasonCode":rule["blockingReasonCode"],"blockingReasonSummary":rule["blockingReasonSummary"],"gateDecisionSummary":rule["gateDecisionSummary"],"nextActionSummaryProjection":projected["nextActionSummaryProjection"]})
        }
        _ => return Err(Error::Internal),
    };
    let evidence = json!({"freezeVersionSummary":crate::commission_assignment::summary(session,&source.freeze).await?,"baselineSelectionSource":snapshot["baseline_selection_source"],"taxImpactSummaryProjection":tax["taxImpactSummaryProjection"],"taxImpactPendingAmountProjection":tax["taxImpactPendingAmountProjection"],"dataMaturityLevel":snapshot["data_maturity_level"],"costActionRecommendation":snapshot["cost_action_recommendation"],"currentActionLevel":snapshot["current_action_level"],"referencedBaselineVersion":snapshot["referenced_baseline_version"],"referencedSnapshotVersion":snapshot["referenced_snapshot_version"],"summaryPackageKey":snapshot["summary_package_key"],"summarySnapshotId":snapshot["summary_snapshot_id"],"projectionLevel":snapshot["projection_level"],"exportPolicy":snapshot["export_policy"],"allowedActions":[]});
    result
        .as_object_mut()
        .ok_or(Error::Internal)?
        .extend(evidence.as_object().ok_or(Error::Internal)?.clone());
    Ok(result)
}
