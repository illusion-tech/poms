use chrono::{DateTime, Utc};

use crate::{auth::js_json::JsString, compat::json::Field};

pub use crate::projects::model::{Wire, js, trim_js};

#[derive(Clone, Debug)]
pub struct Query {
    pub scope: String,
    pub source_code: Option<String>,
    pub budget_status: Option<String>,
    pub urgency: Option<String>,
    pub rating: Option<String>,
    pub owner_org_id: Option<String>,
    pub owner_user_id: Option<String>,
    pub ownership_scope: Option<String>,
    pub keyword: Option<JsString>,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Clone, Debug)]
pub struct Create {
    pub lead_name: JsString,
    pub customer_id: String,
    pub source_code: String,
    pub demand_description: JsString,
    pub budget_status: String,
    pub estimated_amount: Field<String>,
    pub urgency: String,
    pub expected_decision_date: Field<String>,
    pub owner_org_id: Field<String>,
    pub owner_user_id: Field<String>,
}

#[derive(Clone, Debug)]
pub struct Update {
    pub lead_name: Option<JsString>,
    pub customer_id: Option<String>,
    pub source_code: Option<String>,
    pub demand_description: Option<JsString>,
    pub budget_status: Option<String>,
    pub estimated_amount: Field<String>,
    pub urgency: Option<String>,
    pub expected_decision_date: Field<String>,
    pub expected_version: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct Claim {
    pub expected_version: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct Assign {
    pub owner_user_id: String,
    pub owner_org_id: Field<String>,
    pub reason: JsString,
    pub expected_version: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct Qualify {
    pub qualification_summary: JsString,
}

#[derive(Clone, Debug)]
pub struct Close {
    pub closed_reason: JsString,
}

#[derive(Clone, Debug)]
pub struct Convert {
    pub project_name: Option<JsString>,
    pub customer_project_no: Field<JsString>,
    pub planned_sign_at: Field<DateTime<Utc>>,
}

#[derive(Clone, Debug)]
pub struct SubmitOverride {
    pub score: i32,
    pub reason: JsString,
    pub expected_lead_row_version: i64,
}

#[derive(Clone, Debug)]
pub struct ApproveOverride {
    pub expected_override_row_version: i64,
    pub note: Field<JsString>,
}

#[derive(Clone, Debug)]
pub struct RejectOverride {
    pub reason: JsString,
    pub expected_override_row_version: i64,
}

#[derive(Clone, Debug)]
pub struct RevokeOverride {
    pub reason: JsString,
    pub expected_override_row_version: i64,
}
