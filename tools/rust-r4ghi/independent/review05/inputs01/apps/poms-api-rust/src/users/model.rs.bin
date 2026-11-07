//! Input models mechanically validated against the original six Zod schemas.
//! Original TypeScript remains the only editable contract authority.

use crate::{auth::js_json::JsString, compat::json::Field};

#[derive(Debug, Clone)]
pub struct CreateUser {
    pub username: JsString,
    pub display_name: JsString,
    pub email: Field<JsString>,
    pub phone: Field<JsString>,
    /// Required on the wire, nullable; retain validated UUID spelling.
    pub primary_org_unit_id: Option<String>,
    pub initial_role_ids: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateUser {
    pub display_name: Option<JsString>,
    pub email: Field<JsString>,
    pub phone: Field<JsString>,
    pub avatar_url: Field<JsString>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateProfile {
    pub display_name: Option<JsString>,
    pub email: Field<JsString>,
    pub phone: Field<JsString>,
}

#[derive(Debug, Clone, Default)]
pub struct UserActivation {
    pub reason: Option<JsString>,
    pub comment: Option<JsString>,
    /// Validated by the DTO; the original command does not enforce this value.
    pub expected_version: Option<i64>,
}

#[derive(Debug, Clone, Default)]
pub struct AssignUserRoles {
    /// Preserve original UUID spelling, order and duplicates.
    pub role_ids: Vec<String>,
    pub reason: Option<JsString>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct AssignUserOrgMemberships {
    /// Required nonnullable UUID; not creation's nullable primary field.
    pub primary_org_unit_id: String,
    pub secondary_org_unit_ids: Vec<String>,
    pub reason: Option<JsString>,
    pub expected_version: Option<i64>,
}

use serde::{Serialize, Serializer, ser::Error};
use serde_json::value::RawValue;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSummary {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub username: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub display_name: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub email: Option<JsString>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub phone: Option<JsString>,
    pub is_active: bool,
    pub primary_org_unit_id: Option<String>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub primary_org_unit_name: Option<JsString>,
    #[serde(serialize_with = "serialize_text_array")]
    pub role_names: Vec<JsString>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserOrgUnitSummary {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub name: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub code: Option<JsString>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub description: Option<JsString>,
    pub membership_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDetail {
    #[serde(flatten)]
    pub summary: UserSummary,
    #[serde(serialize_with = "serialize_optional_text")]
    pub avatar_url: Option<JsString>,
    pub last_login_at: Option<String>,
    pub email_verified: bool,
    pub phone_verified: bool,
    pub org_units: Vec<UserOrgUnitSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SanitizedUserProfile {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub username: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub display_name: JsString,
    #[serde(serialize_with = "serialize_text_array")]
    pub roles: Vec<JsString>,
    pub permissions: Vec<String>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub email: Option<JsString>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub avatar_url: Option<JsString>,
    pub is_active: bool,
    pub last_login_at: Option<String>,
    pub email_verified: bool,
    pub phone_verified: bool,
    #[serde(serialize_with = "serialize_optional_text")]
    pub phone: Option<JsString>,
    pub org_units: Vec<UserOrgUnitSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerReferenceUser {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub display_name: JsString,
    pub is_active: bool,
    pub primary_org_unit_id: Option<String>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub primary_org_unit_name: Option<JsString>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerReferenceOrgUnit {
    pub id: String,
    #[serde(serialize_with = "serialize_text")]
    pub name: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub code: JsString,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerReferenceData {
    pub users: Vec<OwnerReferenceUser>,
    pub org_units: Vec<OwnerReferenceOrgUnit>,
}

/// This is a transport envelope, not a guessed entity projection. The service
/// fills it only from the source-bound Nest entity serialization witness.
#[derive(Debug, Clone, Serialize)]
#[serde(transparent)]
pub struct RawUserEntity(pub Box<RawValue>);

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

fn serialize_text_array<S: Serializer>(
    texts: &[JsString],
    serializer: S,
) -> Result<S::Ok, S::Error> {
    use serde::ser::SerializeSeq;
    let mut sequence = serializer.serialize_seq(Some(texts.len()))?;
    for text in texts {
        let raw = RawValue::from_string(text.json()).map_err(S::Error::custom)?;
        sequence.serialize_element(&raw)?;
    }
    sequence.end()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minimal_owner_projection_retains_null_inactive_and_original_utf16() {
        let data = OwnerReferenceData {
            users: vec![OwnerReferenceUser {
                id: "id".into(),
                display_name: JsString::from_code_units(vec![0xd800]),
                is_active: false,
                primary_org_unit_id: None,
                primary_org_unit_name: None,
            }],
            org_units: vec![],
        };
        let raw = serde_json::to_string(&data).unwrap_or_else(|_| panic!("owner JSON"));
        assert!(raw.contains("\\ud800"));
        let value: serde_json::Value =
            serde_json::from_str(&raw.replace("\\ud800", "x")).unwrap_or_else(|_| panic!("JSON"));
        let user = value["users"][0]
            .as_object()
            .unwrap_or_else(|| panic!("owner"));
        assert_eq!(user.len(), 5);
        assert_eq!(user["isActive"], false);
        assert!(user["primaryOrgUnitId"].is_null());
        assert!(!user.contains_key("username"));
        assert!(!user.contains_key("permissions"));
    }
}
