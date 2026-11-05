use chrono::{DateTime, Utc};

use crate::auth::js_json::JsString;

#[derive(Clone)]
pub struct CreateRequest {
    pub technical_cost_package_id: String,
    pub bid_commercial_process_id: Option<String>,
    pub commercial_release_baseline_id: Option<String>,
    pub pricing_path: String,
    pub quote_version: JsString,
    pub currency_code: JsString,
    pub quote_amount_tax_inclusive: String,
    pub quote_amount_tax_exclusive: String,
    pub tax_rate: String,
    pub tax_condition_summary: JsString,
    pub payment_terms_summary: JsString,
    pub gross_margin_rate: Option<String>,
    pub gross_margin_band: String,
    pub gross_margin_summary: JsString,
    pub decision: String,
    pub decision_summary: JsString,
    pub approval_scenario_key: Option<JsString>,
    pub summary_package_key: Option<JsString>,
    pub summary_snapshot_id: Option<String>,
    pub projection_level: Option<JsString>,
    pub export_policy: Option<JsString>,
    pub owner_role: Option<JsString>,
    pub condition_items: Vec<ConditionItem>,
}

#[derive(Clone)]
pub struct ConditionItem {
    pub condition_key: JsString,
    pub condition_type: String,
    pub label: JsString,
    pub condition_summary: JsString,
    pub condition_status: String,
    pub required_for_contracting: bool,
    pub responsible_role: Option<JsString>,
    pub due_at: Option<DateTime<Utc>>,
    pub resolution_summary: Option<JsString>,
    pub sort_order: Option<i64>,
}
