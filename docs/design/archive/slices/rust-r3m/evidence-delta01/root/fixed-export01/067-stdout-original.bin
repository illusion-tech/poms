//! Sensitive field projection preserves the original batch audit boundary.
//! Shared package/permission values come from the one-way TS manifest.

use std::{collections::HashMap, sync::OnceLock};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::shared::generated::{
    self, PermissionKey, SensitiveFieldPackageKey, SensitiveProjectionMode,
    SensitiveProjectionReasonCode,
};

use super::{
    audit::{SecurityEventInput, SecurityResult, SecuritySeverity},
    model::AuthError,
    service::AuthService,
};

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HiddenMode {
    Masked,
    Denied,
}

impl HiddenMode {
    fn projection(self) -> SensitiveProjectionMode {
        match self {
            Self::Masked => SensitiveProjectionMode::Masked,
            Self::Denied => SensitiveProjectionMode::Denied,
        }
    }
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionUser {
    pub sub: Uuid,
    pub username: String,
    pub permissions: Vec<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionRequestContext {
    pub request_id: Option<String>,
    pub path: String,
    pub method: Option<String>,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StringField {
    pub key: String,
    pub raw_value: Option<String>,
    pub display_text_when_full: Option<String>,
    pub masked_display_text: Option<String>,
    pub denied_display_text: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionInput {
    pub field_package_key: SensitiveFieldPackageKey,
    pub fields: Vec<StringField>,
    pub user: Option<ProjectionUser>,
    pub target_type: String,
    pub target_id: String,
    pub request_context: ProjectionRequestContext,
    pub mode_when_unauthorized: Option<HiddenMode>,
    pub masked_display_text: Option<String>,
    pub denied_display_text: Option<String>,
}

#[derive(Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StringFieldProjection {
    pub field_package_key: SensitiveFieldPackageKey,
    pub mode: SensitiveProjectionMode,
    pub value: Option<String>,
    pub display_text: String,
    pub reason_code: SensitiveProjectionReasonCode,
}

pub struct ProjectionPlan {
    pub fields: HashMap<String, StringFieldProjection>,
    pub event: Option<SecurityEventInput>,
}

/// Errors never retain the input/raw field value.
#[derive(Debug)]
pub enum ProjectionError {
    InvalidGeneratedMap,
    Audit(AuthError),
}

pub fn required_permission(
    package: SensitiveFieldPackageKey,
) -> Result<PermissionKey, ProjectionError> {
    static MAP: OnceLock<Option<HashMap<SensitiveFieldPackageKey, PermissionKey>>> =
        OnceLock::new();
    let map = MAP.get_or_init(|| {
        let manifest = generated::manifest().ok()?;
        let declaration = manifest
            .get("declarations")?
            .as_array()?
            .iter()
            .find(|entry| {
                entry.get("name").and_then(Value::as_str)
                    == Some("SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS")
            })?;
        let values = declaration.get("value")?.as_object()?;
        if values.len() != SensitiveFieldPackageKey::ALL.len() {
            return None;
        }
        let mut map = HashMap::new();
        for package in SensitiveFieldPackageKey::ALL {
            let permission = values.get(package.as_str())?.as_str()?.parse().ok()?;
            map.insert(*package, permission);
        }
        Some(map)
    });
    map.as_ref()
        .and_then(|map| map.get(&package))
        .copied()
        .ok_or(ProjectionError::InvalidGeneratedMap)
}

/// Pure projection plus the exact pending event. The caller must persist the
/// event before returning a hidden result, as the original service does.
pub fn plan(input: &ProjectionInput) -> Result<ProjectionPlan, ProjectionError> {
    let required = required_permission(input.field_package_key)?;
    let authorized = input.user.as_ref().is_some_and(|user| {
        user.permissions
            .iter()
            .any(|permission| permission == required.as_str())
    });
    let hidden_mode = input.mode_when_unauthorized.unwrap_or(HiddenMode::Masked);
    let mut fields = HashMap::new();
    let mut hidden_keys = Vec::new();
    for field in &input.fields {
        let projection = if authorized || field.raw_value.is_none() {
            StringFieldProjection {
                field_package_key: input.field_package_key,
                mode: SensitiveProjectionMode::Full,
                value: field.raw_value.clone(),
                display_text: field
                    .display_text_when_full
                    .clone()
                    .or_else(|| field.raw_value.clone())
                    .unwrap_or_else(|| "-".into()),
                reason_code: if field.raw_value.is_none() {
                    SensitiveProjectionReasonCode::FieldPackageNotApplicable
                } else {
                    SensitiveProjectionReasonCode::Allowed
                },
            }
        } else {
            hidden_keys.push(field.key.clone());
            let text = match hidden_mode {
                HiddenMode::Masked => field
                    .masked_display_text
                    .as_ref()
                    .or(input.masked_display_text.as_ref())
                    .map_or("敏感字段已隐藏", String::as_str),
                HiddenMode::Denied => field
                    .denied_display_text
                    .as_ref()
                    .or(input.denied_display_text.as_ref())
                    .map_or("敏感字段不可见", String::as_str),
            };
            StringFieldProjection {
                field_package_key: input.field_package_key,
                mode: hidden_mode.projection(),
                value: None,
                display_text: text.into(),
                reason_code: SensitiveProjectionReasonCode::MissingSensitiveReadPermission,
            }
        };
        // JS object assignment keeps the last value for a repeated key; the
        // audit list still counts every hidden input field in source order.
        // A plain JS object does not create an own JSON property for __proto__.
        if field.key != "__proto__" {
            fields.insert(field.key.clone(), projection);
        }
    }
    let event = if hidden_keys.is_empty() {
        None
    } else {
        let (event_type, severity) = match hidden_mode {
            HiddenMode::Masked => ("sensitive_field.masked", SecuritySeverity::Info),
            HiddenMode::Denied => ("sensitive_field.denied", SecuritySeverity::Warning),
        };
        Some(SecurityEventInput {
            event_type: event_type.into(),
            severity,
            actor_id: input.user.as_ref().map(|user| user.sub),
            principal: input.user.as_ref().map(|user| user.username.clone()),
            request_id: input.request_context.request_id.clone(),
            path: input.request_context.path.clone(),
            method: Some(
                input
                    .request_context
                    .method
                    .clone()
                    .unwrap_or_else(|| "QUERY".into()),
            ),
            permission_key: Some(required.as_str().into()),
            result: SecurityResult::Blocked,
            ip: input.request_context.ip.clone(),
            user_agent: input.request_context.user_agent.clone(),
            details: Some(json!({
                "fieldPackageKey": input.field_package_key,
                "projectionMode": hidden_mode.projection(),
                "targetType": input.target_type,
                "targetId": input.target_id,
                "targetCount": 1,
                "sampleTargetIds": [input.target_id],
                "fieldKeys": hidden_keys,
                "hiddenFieldCount": hidden_keys.len(),
                "reasonCode": SensitiveProjectionReasonCode::MissingSensitiveReadPermission,
                "requiredPermission": required,
                "auditAggregationMode": "sensitive-field-batch"
            })),
            occurred_at: None,
        })
    };
    Ok(ProjectionPlan { fields, event })
}

pub async fn project_fields(
    service: &AuthService,
    input: &ProjectionInput,
) -> Result<HashMap<String, StringFieldProjection>, ProjectionError> {
    let result = plan(input)?;
    if let Some(event) = result.event {
        service
            .record_security_event(event)
            .await
            .map_err(ProjectionError::Audit)?;
    }
    Ok(result.fields)
}
