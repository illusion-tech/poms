use serde::{Deserialize, Serialize, Serializer, ser::Error};
use serde_json::value::RawValue;

use crate::{auth::js_json::JsString, compat::json::Field, shared::generated::PermissionKey};

#[derive(Debug, Clone)]
pub struct CreateRole {
    pub role_key: JsString,
    pub name: JsString,
    pub description: Field<JsString>,
    pub display_order: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct UpdateRole {
    pub name: Option<JsString>,
    pub description: Field<JsString>,
    pub display_order: Option<i64>,
}

#[derive(Debug, Clone, Default)]
pub struct RoleActivation {
    pub reason: Option<JsString>,
    pub comment: Option<JsString>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct AssignRolePermissions {
    pub permission_keys: Vec<PermissionKey>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleSummary {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub role_key: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub name: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub description: Option<JsString>,
    pub is_active: bool,
    pub is_system_role: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleDetail {
    #[serde(flatten)]
    pub summary: RoleSummary,
    pub permission_keys: Vec<String>,
    pub assigned_user_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformPermissionSummary {
    pub key: PermissionKey,
    pub name: String,
    pub description: String,
    pub group: String,
    pub status: String,
    pub is_system_permission: bool,
    pub source_type: String,
    pub deprecated_by: Option<PermissionKey>,
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
    fn original_utf16_text_is_not_replaced_before_wire_serialization() {
        let role = RoleSummary {
            id: "id".into(),
            role_key: js_string("key"),
            name: js_string("N"),
            description: Some(JsString::from_code_units(vec![0xd800])),
            is_active: true,
            is_system_role: false,
            display_order: 0,
            created_at: "time".into(),
            updated_at: "time".into(),
        };
        assert!(
            serde_json::to_string(&role)
                .is_ok_and(|json| json.contains("\"description\":\"\\ud800\""))
        );
    }
}
