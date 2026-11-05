use crate::auth::js_json::JsString;

#[derive(Clone)]
pub struct CreateRequest {
    pub technical_feasibility_decision: String,
    pub technical_conclusion_summary: JsString,
    pub allow_next_stage: bool,
    pub currency_code: JsString,
    pub tax_assumption_summary: JsString,
    pub tax_review_status: String,
    pub scope_items: Vec<ScopeItem>,
    pub risk_items: Vec<RiskItem>,
    pub cost_items: Vec<CostItem>,
}

#[derive(Clone)]
pub struct ScopeItem {
    pub scope_type: String,
    pub label: JsString,
    pub description: JsString,
    pub sort_order: Option<i64>,
}

#[derive(Clone)]
pub struct RiskItem {
    pub risk_category: JsString,
    pub risk_level: String,
    pub risk_description: JsString,
    pub impact_scope: JsString,
    pub mitigation_plan: JsString,
    pub owner_role: JsString,
    pub risk_status: String,
    pub blocks_next_stage: bool,
    pub sort_order: Option<i64>,
}

#[derive(Clone)]
pub struct CostItem {
    pub cost_category: JsString,
    pub cost_subcategory: Option<JsString>,
    pub cost_description: JsString,
    pub estimation_basis: JsString,
    pub quantity: Option<String>,
    pub unit: Option<JsString>,
    pub unit_price: Option<String>,
    pub amount_excluding_tax: String,
    pub tax_cost_amount: String,
    pub amount_including_tax: String,
    pub currency_code: JsString,
    pub confidence_level: String,
    pub high_uncertainty: bool,
    pub responsible_role: Option<JsString>,
    pub sort_order: Option<i64>,
}
