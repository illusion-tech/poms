use serde::Serialize;
use serde_json::Value;

use crate::{auth::js_json::JsString, shared::generated::PermissionKey};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryKind {
    Audit,
    Entity,
    Security,
}

impl QueryKind {
    pub fn schema_name(self) -> &'static str {
        match self {
            Self::Audit => "AuditLogListQuery",
            Self::Entity => "EntityAuditLogListQuery",
            Self::Security => "SecurityEventListQuery",
        }
    }
}

#[derive(Debug, Clone)]
pub struct RecordRouteDenied {
    pub path: JsString,
    pub return_url: Option<JsString>,
    pub return_url_present: bool,
    pub required_permissions: Vec<PermissionKey>,
}

/// Explicit original service projection; stored JSON is not revalidated here.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogSummary {
    pub id: String,
    pub event_type: String,
    pub target_type: String,
    pub target_id: String,
    pub operator_id: Option<String>,
    pub request_id: Option<String>,
    pub result: String,
    pub reason: Option<String>,
    pub before_snapshot: Option<Value>,
    pub after_snapshot: Option<Value>,
    pub metadata: Option<Value>,
    pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityEventSummary {
    pub id: String,
    pub event_type: String,
    pub severity: String,
    pub actor_id: Option<String>,
    pub principal: Option<String>,
    pub request_id: Option<String>,
    pub path: String,
    pub method: Option<String>,
    pub permission_key: Option<String>,
    pub result: String,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    pub details: Option<Value>,
    pub occurred_at: String,
}

impl RecordRouteDenied {
    #[cfg(test)]
    pub(crate) fn json(&self) -> String {
        let mut fields = vec![format!("\"path\":{}", self.path.json())];
        if self.return_url_present {
            fields.push(format!(
                "\"returnUrl\":{}",
                self.return_url
                    .as_ref()
                    .map_or_else(|| "null".to_owned(), JsString::json)
            ));
        }
        fields.push(format!(
            "\"requiredPermissions\":[{}]",
            self.required_permissions
                .iter()
                .map(|key| format!("\"{}\"", key.as_str()))
                .collect::<Vec<_>>()
                .join(",")
        ));
        format!("{{{}}}", fields.join(","))
    }
}
