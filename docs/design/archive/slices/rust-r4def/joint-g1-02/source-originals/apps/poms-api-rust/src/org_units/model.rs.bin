//! Existing organization DTOs. TypeScript remains the editable contract authority.

use serde::{Serialize, Serializer, ser::Error};
use serde_json::value::RawValue;

use crate::{auth::js_json::JsString, compat::json::Field};

#[derive(Debug, Clone)]
pub struct CreateOrgUnit {
    pub name: JsString,
    pub code: JsString,
    pub description: Field<JsString>,
    /// Preserve the validated UUID spelling for the original strict string lookup.
    pub parent_id: Field<String>,
    pub display_order: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct UpdateOrgUnit {
    pub name: Option<JsString>,
    pub code: Option<JsString>,
    pub description: Field<JsString>,
    pub display_order: Option<i64>,
}

#[derive(Debug, Clone, Default)]
pub struct OrgUnitActivation {
    pub reason: Option<JsString>,
    pub comment: Option<JsString>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct MoveOrgUnit {
    pub parent_id: Field<String>,
    pub display_order: Option<i64>,
    pub reason: Option<JsString>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgUnitSummary {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub name: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub code: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub description: Option<JsString>,
    pub parent_id: Option<String>,
    pub is_active: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgUnitDetail {
    #[serde(flatten)]
    pub summary: OrgUnitSummary,
    pub child_count: i64,
    pub active_membership_count: i64,
    pub can_delete: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgUnitTreeNode {
    #[serde(flatten)]
    pub detail: OrgUnitDetail,
    pub children: Vec<OrgUnitTreeNode>,
}

pub fn js_string(text: &str) -> JsString {
    JsString::from_code_units(text.encode_utf16().collect())
}

fn serialize_text<S: Serializer>(text: &JsString, serializer: S) -> Result<S::Ok, S::Error> {
    RawValue::from_string(text.json())
        .map_err(S::Error::custom)?
        .serialize(serializer)
}

fn serialize_optional_text<S: Serializer>(
    text: &Option<JsString>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    match text {
        Some(text) => serialize_text(text, serializer),
        None => serializer.serialize_none(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_response_preserves_utf16_and_required_null_members() {
        let row = OrgUnitSummary {
            id: "id".into(),
            name: JsString::from_code_units(vec![0xd800]),
            code: js_string("code"),
            description: None,
            parent_id: None,
            is_active: true,
            display_order: 0,
            created_at: "time".into(),
            updated_at: "time".into(),
        };
        let raw = serde_json::to_string(&row).unwrap_or_else(|_| panic!("summary JSON"));
        assert!(raw.contains("\"name\":\"\\ud800\""));
        assert!(raw.contains("\"description\":null"));
        assert!(raw.contains("\"parentId\":null"));
        assert!(!raw.contains("rowVersion"));
    }
}
