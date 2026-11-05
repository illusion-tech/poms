//! Exact request fields in original Zod declaration order. Scalar readers are
//! this author's public cost-module helpers; unknown fields are never copied.

use serde_json::Value;

use super::model::{ConditionItem, CreateRequest};
use crate::{
    auth::js_json::JsObject,
    error::ApiError,
    project_technical_cost::validation::{
        array, boolean, datetime, decimal, empty, enumeration, failure, object, required_text,
        sort_order, text, uuid,
    },
};

fn condition(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Result<ConditionItem, ApiError> {
    Ok(ConditionItem {
        condition_key: required_text(object, "conditionKey", 128, errors)?,
        condition_type: enumeration(
            object,
            "conditionType",
            &["financial", "tax", "payment", "scope", "risk", "approval"],
            errors,
        ),
        label: required_text(object, "label", 255, errors)?,
        condition_summary: required_text(object, "conditionSummary", 2000, errors)?,
        condition_status: enumeration(
            object,
            "conditionStatus",
            &["open", "closed", "waived"],
            errors,
        ),
        required_for_contracting: boolean(object, "requiredForContracting", true, errors),
        responsible_role: text(object, "responsibleRole", 1, 128, true, errors)?,
        due_at: datetime(object, "dueAt", errors),
        resolution_summary: text(object, "resolutionSummary", 1, 2000, true, errors)?,
        sort_order: sort_order(object, errors),
    })
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateRequest, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let result = CreateRequest {
        technical_cost_package_id: uuid(&object, "technicalCostPackageId", false, &mut errors)
            .unwrap_or_default(),
        bid_commercial_process_id: uuid(&object, "bidCommercialProcessId", true, &mut errors),
        commercial_release_baseline_id: uuid(
            &object,
            "commercialReleaseBaselineId",
            true,
            &mut errors,
        ),
        pricing_path: enumeration(
            &object,
            "pricingPath",
            &["bid", "direct-commercial"],
            &mut errors,
        ),
        quote_version: required_text(&object, "quoteVersion", 64, &mut errors)?,
        currency_code: text(&object, "currencyCode", 3, 16, false, &mut errors)?
            .unwrap_or_else(empty),
        quote_amount_tax_inclusive: decimal(
            &object,
            "quoteAmountTaxInclusive",
            2,
            false,
            false,
            &mut errors,
        )
        .unwrap_or_default(),
        quote_amount_tax_exclusive: decimal(
            &object,
            "quoteAmountTaxExclusive",
            2,
            false,
            false,
            &mut errors,
        )
        .unwrap_or_default(),
        tax_rate: decimal(&object, "taxRate", 8, false, false, &mut errors).unwrap_or_default(),
        tax_condition_summary: required_text(&object, "taxConditionSummary", 2000, &mut errors)?,
        payment_terms_summary: required_text(&object, "paymentTermsSummary", 2000, &mut errors)?,
        gross_margin_rate: decimal(&object, "grossMarginRate", 8, true, true, &mut errors),
        gross_margin_band: enumeration(
            &object,
            "grossMarginBand",
            &["below-redline", "watch", "target", "not-calculated"],
            &mut errors,
        ),
        gross_margin_summary: required_text(&object, "grossMarginSummary", 2000, &mut errors)?,
        decision: enumeration(
            &object,
            "decision",
            &[
                "pending",
                "released",
                "conditional-release",
                "rejected",
                "escalation-required",
            ],
            &mut errors,
        ),
        decision_summary: required_text(&object, "decisionSummary", 2000, &mut errors)?,
        approval_scenario_key: text(&object, "approvalScenarioKey", 1, 128, true, &mut errors)?,
        summary_package_key: text(&object, "summaryPackageKey", 1, 64, true, &mut errors)?,
        summary_snapshot_id: uuid(&object, "summarySnapshotId", true, &mut errors),
        projection_level: text(&object, "projectionLevel", 1, 32, true, &mut errors)?,
        export_policy: text(&object, "exportPolicy", 1, 32, true, &mut errors)?,
        owner_role: text(&object, "ownerRole", 1, 128, true, &mut errors)?,
        condition_items: array(&object, "conditionItems", true, 0, &mut errors, condition)?,
    };
    if errors.is_empty() {
        Ok(result)
    } else {
        Err(failure(errors))
    }
}
