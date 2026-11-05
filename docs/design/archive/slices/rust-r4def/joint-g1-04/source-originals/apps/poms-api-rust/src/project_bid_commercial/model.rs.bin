//! Parsed request fields only. Unknown JSON keys never become persistence data.

use chrono::{DateTime, Utc};

use crate::auth::js_json::JsString;

#[derive(Clone)]
pub struct CreateRequest {
    pub bid_mode: String,
    pub current_stage: String,
    pub decision: String,
    pub result_status: String,
    pub process_summary: JsString,
    pub decision_summary: Option<JsString>,
    pub result_summary: Option<JsString>,
    pub tender_no: Option<JsString>,
    pub bid_package_no: Option<JsString>,
    pub owner_role: Option<JsString>,
    pub material_items: Vec<MaterialInput>,
    pub timeline_items: Vec<TimelineInput>,
}

#[derive(Clone)]
pub struct MaterialInput {
    pub material_key: JsString,
    pub label: JsString,
    pub material_status: String,
    pub responsible_role: Option<JsString>,
    pub due_at: Option<DateTime<Utc>>,
    pub blocks_next_step: bool,
    pub navigation_hint: Option<JsString>,
    pub sort_order: Option<i64>,
}

#[derive(Clone)]
pub struct TimelineInput {
    pub event_key: JsString,
    pub label: JsString,
    pub summary: Option<JsString>,
    pub timeline_status: String,
    pub occurred_at: Option<DateTime<Utc>>,
    pub due_at: Option<DateTime<Utc>>,
    pub responsible_role: Option<JsString>,
    pub sort_order: Option<i64>,
}
