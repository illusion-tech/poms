use chrono::{DateTime, Utc};

use crate::{auth::js_json::JsString, compat::json::Field};

#[derive(Clone, Debug)]
pub struct Query {
    pub customer_id: Option<String>,
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
    pub lifecycle_scope: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Fields {
    pub follow_up_type: String,
    pub occurred_at: DateTime<Utc>,
    pub summary: JsString,
    pub detail: Field<JsString>,
    pub outcome: String,
    pub next_follow_up_at: Field<DateTime<Utc>>,
    pub owner_org_id: Field<String>,
    pub owner_user_id: Field<String>,
}

#[derive(Clone, Debug)]
pub struct Create {
    pub customer_id: String,
    pub lead_id: Field<String>,
    pub project_id: Field<String>,
    pub fields: Fields,
}

#[derive(Clone, Debug)]
pub struct Replace {
    pub fields: Fields,
    pub replacement_reason: JsString,
    pub expected_version: i64,
}

#[derive(Clone, Debug)]
pub struct Void {
    pub reason: JsString,
    pub comment: Field<JsString>,
    pub expected_version: i64,
}
