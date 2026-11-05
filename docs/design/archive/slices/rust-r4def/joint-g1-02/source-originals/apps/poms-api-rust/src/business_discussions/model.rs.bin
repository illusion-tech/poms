use crate::{auth::js_json::JsString, compat::json::Field};

#[derive(Clone, Debug, Default)]
pub struct Query {
    pub customer_id: Option<String>,
    pub lead_id: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Create {
    pub target_object_type: String,
    pub target_object_id: String,
    pub discussion_type: String,
    pub body: JsString,
    pub related_contact_id: Field<String>,
    pub related_competitor_record_id: Field<String>,
    pub related_follow_up_record_id: Field<String>,
    pub is_pinned: Option<bool>,
    pub is_key_conclusion: Option<bool>,
}
