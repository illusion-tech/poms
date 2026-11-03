use crate::{
    auth::{
        crypto::{SecretCipher, SecretCipherOptions},
        js_json::JsString,
    },
    error::ApiError,
};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    fmt,
    sync::Arc,
};

#[derive(Clone)]
pub struct AttachmentRuntimeSettings {
    pub(crate) local_root: String,
    pub(crate) cipher: Arc<SecretCipher>,
    pub(crate) tls_insecure: bool,
    pub(crate) extra_ca: Option<String>,
}
impl AttachmentRuntimeSettings {
    pub fn from_map(values: &HashMap<String, String>) -> Self {
        Self {
            local_root: values
                .get("POMS_ATTACHMENT_LOCAL_ROOT")
                .cloned()
                .unwrap_or_else(|| "storage/attachments".into()),
            cipher: Arc::new(SecretCipher::from_env(
                values,
                SecretCipherOptions {
                    env_keys: Some(&[
                        "ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY",
                        "POMS_SECRET_KEY",
                        "JWT_SECRET",
                    ]),
                    default_value: None,
                    unreadable_message: Some("Attachment storage provider secret is not readable."),
                },
            )),
            tls_insecure: values
                .get("NODE_TLS_REJECT_UNAUTHORIZED")
                .is_some_and(|v| v == "0"),
            extra_ca: values
                .get("NODE_EXTRA_CA_CERTS")
                .filter(|v| !v.is_empty())
                .cloned(),
        }
    }
}
impl Default for AttachmentRuntimeSettings {
    fn default() -> Self {
        Self::from_map(&HashMap::new())
    }
}
impl fmt::Debug for AttachmentRuntimeSettings {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("AttachmentRuntimeSettings([redacted])")
    }
}

#[derive(Clone)]
pub struct StorageFailure {
    pub status: Option<StatusCode>,
    pub message: JsString,
}
impl StorageFailure {
    pub fn http(status: StatusCode, message: impl AsRef<str>) -> Self {
        Self::from_js(
            Some(status),
            JsString::from_code_units(message.as_ref().encode_utf16().collect()),
        )
    }
    pub fn unexpected(message: impl AsRef<str>) -> Self {
        Self::from_js(
            None,
            JsString::from_code_units(message.as_ref().encode_utf16().collect()),
        )
    }
    pub fn from_js(status: Option<StatusCode>, message: JsString) -> Self {
        Self { status, message }
    }
    pub fn into_api_error(self) -> ApiError {
        match self.status {
            None => ApiError::internal(),
            Some(status) => ApiError::raw_json(
                status,
                format!(
                    "{{\"statusCode\":{},\"message\":{},\"error\":{}}}",
                    status.as_u16(),
                    self.message.json(),
                    serde_json::json!(status.canonical_reason().unwrap_or("Error"))
                ),
            ),
        }
    }
    pub(crate) fn internal() -> Self {
        Self::unexpected("Internal server error")
    }
}
impl fmt::Debug for StorageFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("StorageFailure")
            .field("status", &self.status)
            .field("message", &"[redacted]")
            .finish()
    }
}
impl fmt::Display for StorageFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message.to_utf8_lossy())
    }
}
impl std::error::Error for StorageFailure {}
impl From<crate::database::DbError> for StorageFailure {
    fn from(_: crate::database::DbError) -> Self {
        Self::internal()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectLocation {
    pub storage_provider: String,
    pub storage_bucket: Option<String>,
    pub storage_key: String,
}
#[derive(Clone, Debug)]
pub struct UploadPlan {
    pub location: ObjectLocation,
    pub upload_mode: String,
}
#[derive(Clone, Debug)]
pub struct ObjectMetadata {
    pub size_bytes: f64,
    pub e_tag: Option<String>,
    pub last_modified: Option<String>,
    pub content_type: Option<String>,
    pub checksum_sha256: Option<String>,
}
#[derive(Clone, Debug)]
pub struct PresignedPutTarget {
    pub method: String,
    pub url: String,
    pub headers: BTreeMap<String, String>,
    pub expires_at: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RuntimeConfig {
    pub provider_type: String,
    pub endpoint: Option<String>,
    pub region: Option<String>,
    pub bucket: Option<String>,
    pub key_prefix: Option<String>,
    pub force_path_style: bool,
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
}
impl RuntimeConfig {
    pub fn implicit_local() -> Self {
        Self {
            provider_type: "local".into(),
            endpoint: None,
            region: None,
            bucket: None,
            key_prefix: None,
            force_path_style: false,
            access_key_id: None,
            secret_access_key: None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub(crate) struct ConfigRow {
    pub id: String,
    pub provider_type: String,
    pub display_name: String,
    pub status: String,
    pub enabled: bool,
    pub is_default: bool,
    pub endpoint: Option<String>,
    pub region: Option<String>,
    pub bucket: Option<String>,
    pub key_prefix: Option<String>,
    pub force_path_style: bool,
    pub encrypted_access_key_id: Option<String>,
    pub encrypted_secret_access_key: Option<String>,
    pub credentials_updated_at: Option<DateTime<Utc>>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<uuid::Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<uuid::Uuid>,
    /// Request-local assigned JS strings. PostgreSQL text uses the lossy UTF8
    /// mirror above; first response and JSONB audit must keep these raw units.
    #[serde(skip)]
    pub raw_text: BTreeMap<String, JsString>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    #[test]
    fn attachment_cipher_options_do_not_fall_back_to_identity_key() {
        let first = HashMap::from([
            (
                "ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY".into(),
                "attachment-first".into(),
            ),
            ("POMS_SECRET_KEY".into(), "poms-second".into()),
            ("JWT_SECRET".into(), "jwt-third".into()),
            (
                "IDENTITY_PROVIDER_SECRET_KEY".into(),
                "identity-independent".into(),
            ),
        ]);
        let settings = AttachmentRuntimeSettings::from_map(&first);
        let encrypted = settings
            .cipher
            .encrypt(&"synthetic-secret".encode_utf16().collect::<Vec<_>>())
            .unwrap_or_else(|_| panic!("cipher"));
        let only = AttachmentRuntimeSettings::from_map(&HashMap::from([(
            "ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY".into(),
            "attachment-first".into(),
        )]));
        assert_eq!(
            only.cipher.decrypt(&encrypted).unwrap_or_default(),
            "synthetic-secret"
        );
        assert!(
            AttachmentRuntimeSettings::default()
                .cipher
                .decrypt(&encrypted)
                .is_err()
        );
        let debug = format!("{settings:?}");
        for value in first.values() {
            assert!(!debug.contains(value));
        }
    }
    #[tokio::test]
    async fn public_http_failure_preserves_isolated_utf16_but_unknown_error_hides_it() {
        let message = JsString::from_code_units(vec![0xd800]);
        let response = StorageFailure::from_js(Some(StatusCode::BAD_GATEWAY), message.clone())
            .into_api_error()
            .into_response();
        let bytes = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap_or_default();
        assert!(String::from_utf8_lossy(&bytes).contains("\\ud800"));
        let response = StorageFailure::from_js(None, message)
            .into_api_error()
            .into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        let bytes = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap_or_default();
        assert!(!String::from_utf8_lossy(&bytes).contains("\\ud800"));
    }
}
