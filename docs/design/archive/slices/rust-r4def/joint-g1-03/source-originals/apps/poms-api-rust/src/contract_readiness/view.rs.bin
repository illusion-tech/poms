use super::{store, terms::id};
use crate::{
    approval_common::{CommonSession, store as common_store},
    auth::{
        audit::insert_security_event,
        projection::{self, ProjectionInput, ProjectionUser, StringField},
    },
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn baseline(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
) -> Result<Value, Error> {
    let diff = match row.get("latest_diff_result_id").and_then(Value::as_str) {
        Some(s) => Some(
            store::diff(
                session.connection,
                Uuid::parse_str(s).map_err(|_| Error::Internal)?,
                false,
            )
            .await?,
        ),
        None => None,
    };
    let absent = Value::Null;
    let d = diff.as_ref().unwrap_or(&absent);
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"baselineCode":row["baseline_code"],
        "quotationReviewId":row["quotation_review_id"],"baselineStatus":row["baseline_status"],"isCurrent":row["is_current"],
        "grossMarginSummary":row["gross_margin_summary"],"paymentTermsSummary":row["payment_terms_summary"],
        "amountTaxInclusive":row["amount_tax_inclusive"],"amountTaxExclusive":row["amount_tax_exclusive"],"taxRate":row["tax_rate"],
        "downPaymentRate":row["down_payment_rate"],"retentionRate":row["retention_rate"],"paymentTerms":row["payment_terms"],
        "latestDiffResultId":row["latest_diff_result_id"],"diffLevel":d["diff_level"],"reviewStatus":d["review_status"],"diffSummary":d["diff_summary"],
        "rowVersion":row["row_version"],"createdAt":store::iso(&row["created_at"]),"createdBy":row["created_by"],
        "updatedAt":store::iso(&row["updated_at"]),"updatedBy":row["updated_by"],"contractTerms":row["contract_terms"],"currencyCode":row["currency_code"]}),
    )
}
pub(super) async fn package(
    session: &mut CommonSession<'_, '_>,
    p: &Value,
) -> Result<Value, Error> {
    let d = store::diff(session.connection, id(p, "latest_diff_result_id")?, false).await?;
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(i) FROM poms.contract_readiness_package_item i WHERE package_id=$1 ORDER BY sort_order,id")
        .bind(id(p,"id")?).fetch_all(&mut *session.connection).await?;
    let items:Vec<Value>=rows.into_iter().map(|i|json!({"id":i["id"],"itemType":i["item_type"],"itemKey":i["item_key"],"label":i["label"],"summary":i["summary"],"status":i["status"],"responsibleRole":i["responsible_role"],"navigationHint":i["navigation_hint"],"sortOrder":i["sort_order"]})).collect();
    let preparation = if let Some(key) = p["current_preparation_id"].as_str() {
        Some(
            store::preparation(
                session.connection,
                Uuid::parse_str(key).map_err(|_| Error::Internal)?,
                false,
            )
            .await?,
        )
    } else {
        None
    };
    let mut actions = Vec::<&str>::new();
    if d["review_status"] == "pending-review" {
        actions.push("review-diff");
    }
    if let Some(contract) = p["contract_id"]
        .as_str()
        .and_then(|v| Uuid::parse_str(v).ok())
    {
        let fact = crate::contract_support::contract_fact(
            session.connection,
            contract,
            Some(id(p, "project_id")?),
            false,
        )
        .await?;
        if let Some(fact) = fact {
            if fact.status == "draft"
                && p["is_current"] == true
                && p["guard_decision"] == "allowed"
                && p["package_status"] != "blocked"
                && store::ready(&d)
            {
                actions.push("initialize-contract-snapshot");
            }
            if fact.status == "active"
                && fact.current_snapshot_id.is_some()
                && p["initialized_contract_snapshot_id"] == json!(fact.current_snapshot_id)
            {
                actions.push("initialize-receivable-plan");
            }
        }
    }
    Ok(
        json!({"id":p["id"],"projectId":p["project_id"],"contractId":p["contract_id"],"sourceBaselineId":p["source_baseline_id"],"commercialReleaseBaselineId":p["source_baseline_id"],
        "latestDiffResultId":p["latest_diff_result_id"],"diffLevel":d["diff_level"],"reviewStatus":d["review_status"],"packageStatus":p["package_status"],"guardDecision":p["guard_decision"],
        "currentEffectiveDecisionSummary":p["current_effective_decision_summary"],"blockingReasonSummary":p["blocking_reason_summary"],"missingPrerequisiteCount":p["missing_prerequisite_count"],
        "initializedContractSnapshotId":p["initialized_contract_snapshot_id"],"initializedReceivablePlanVersionId":p["initialized_receivable_plan_version_id"],
        "contractSnapshotInitializedAt":store::iso(&p["contract_snapshot_initialized_at"]),"receivablePlanInitializedAt":store::iso(&p["receivable_plan_initialized_at"]),
        "isCurrent":p["is_current"],"rowVersion":p["row_version"],"createdAt":store::iso(&p["created_at"]),"createdBy":p["created_by"],"updatedAt":store::iso(&p["updated_at"]),"updatedBy":p["updated_by"],
        "allowedActions":actions,"items":items,"candidateTerms":p["candidate_terms"],"currentPreparation":preparation.as_ref().map(store::preparation_summary)}),
    )
}
fn hide(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, value) in map.iter_mut() {
                if [
                    "contractTerms",
                    "candidateTerms",
                    "amountTaxInclusive",
                    "amountTaxExclusive",
                    "taxRate",
                    "downPaymentRate",
                    "retentionRate",
                    "paymentTerms",
                    "grossMarginSummary",
                    "paymentTermsSummary",
                    "diffSummary",
                    "currentEffectiveDecisionSummary",
                    "blockingReasonSummary",
                    "oldValueSummary",
                    "newValueSummary",
                    "summary",
                    "comment",
                ]
                .contains(&key.as_str())
                {
                    *value = Value::Null;
                } else {
                    hide(value);
                }
            }
        }
        Value::Array(values) => {
            for value in values {
                hide(value);
            }
        }
        _ => {}
    }
}
pub(super) async fn project(
    session: &mut CommonSession<'_, '_>,
    mut value: Value,
    actor: &Actor,
    target_type: &str,
    target_id: Uuid,
) -> Result<Value, Error> {
    let input = ProjectionInput {
        field_package_key: SensitiveFieldPackageKey::ContractFinance,
        fields: vec![StringField {
            key: "financialProjection".into(),
            raw_value: Some("合同财务字段包".into()),
            display_text_when_full: None,
            masked_display_text: None,
            denied_display_text: None,
        }],
        user: Some(ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        }),
        target_type: target_type.into(),
        target_id: target_id.to_string(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    };
    let mut plan = projection::plan(&input).map_err(|_| Error::Internal)?;
    let field = plan
        .fields
        .remove("financialProjection")
        .ok_or(Error::Internal)?;
    let field = serde_json::to_value(field).map_err(|_| Error::Internal)?;
    if field["mode"] != "full" {
        hide(&mut value);
    }
    if value.get("baseline").is_some() {
        value["baseline"]["financialProjection"] = field;
    } else {
        value["financialProjection"] = field;
    }
    if let Some(event) = plan.event {
        insert_security_event(session.connection, &event).await?;
        // A hidden read has a real pending security event. Flush the one shared
        // authentication participant only in this case; the outer TX still owns commit.
        common_store::flush(session).await?;
    }
    Ok(value)
}
pub(super) fn audit_snapshot(value: &Value) -> Value {
    json!({"id":value["id"],"projectId":value["project_id"],"contractId":value["contract_id"],
        "status":value.get("status").or_else(||value.get("baseline_status")).or_else(||value.get("package_status")),
        "rowVersion":value["row_version"],"isCurrent":value["is_current"],"payloadHash":value["payload_hash"],
        "sourceBaselineId":value["source_baseline_id"],"sourceDiffResultId":value["source_diff_result_id"],"sourceReadinessId":value["source_readiness_id"]})
}
