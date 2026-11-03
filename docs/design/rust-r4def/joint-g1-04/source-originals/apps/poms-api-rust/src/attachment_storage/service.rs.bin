use super::validation::RequestData;
use super::{
    AttachmentRuntimeSettings, StorageFailure,
    model::{ConfigRow, RuntimeConfig},
    store,
};
use crate::{
    auth::{
        audit::AuditLogInput,
        model::{ResolvedSession, SessionFlush, clock_now},
        service::AuthService,
    },
    compat::scalars::js_iso_string,
    database::Database,
};
use axum::http::StatusCode;
use serde_json::{Value, json};
use std::sync::Arc;

pub struct CallContext {
    pub operator: Option<uuid::Uuid>,
    pub pending: Option<SessionFlush>,
    /// Preserve the complete request identity map; never reload it across a flush.
    pub session: Option<ResolvedSession>,
}
impl CallContext {
    pub fn new(session: Option<&ResolvedSession>) -> Self {
        Self {
            operator: session.map(|s| s.user.user_id),
            pending: session.and_then(|s| s.pending_flush.clone()),
            session: session.cloned(),
        }
    }
}
#[derive(Clone)]
pub struct AttachmentStorage {
    pub(crate) database: Database,
    pub(crate) settings: AttachmentRuntimeSettings,
    pub(crate) root: Arc<std::path::PathBuf>,
}
impl AttachmentStorage {
    pub fn new(database: Database, settings: AttachmentRuntimeSettings) -> Self {
        let root = super::local::absolute_root(&settings.local_root);
        Self {
            database,
            settings,
            root: Arc::new(root),
        }
    }
    pub async fn list(&self, query: RequestData) -> Result<String, StorageFailure> {
        Ok(format!(
            "[{}]",
            store::select(
                &self.database,
                query.text("providerType"),
                query.text("status"),
                query.boolean("enabled"),
                None,
                None,
                false
            )
            .await?
            .iter()
            .map(detail)
            .collect::<Vec<_>>()
            .join(",")
        ))
    }
    pub async fn get(&self, id: &str) -> Result<String, StorageFailure> {
        Ok(detail(&self.require_config(id).await?))
    }
    pub(crate) async fn require_config(&self, id: &str) -> Result<ConfigRow, StorageFailure> {
        store::select(
            &self.database,
            None,
            None,
            None,
            None,
            Some(id.into()),
            false,
        )
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| {
            StorageFailure::http(
                StatusCode::NOT_FOUND,
                format!("Attachment storage provider config {id} not found"),
            )
        })
    }
    pub async fn create(
        &self,
        request: RequestData,
        mut context: CallContext,
        auth: &AuthService,
    ) -> Result<String, StorageFailure> {
        let access = request
            .string("accessKeyId")
            .map(|v| self.settings.cipher.encrypt(v.as_code_units()))
            .transpose()
            .map_err(|_| StorageFailure::internal())?;
        let secret = request
            .string("secretAccessKey")
            .map(|v| self.settings.cipher.encrypt(v.as_code_units()))
            .transpose()
            .map_err(|_| StorageFailure::internal())?;
        let now = clock_now();
        let enabled = request.boolean("enabled").unwrap_or(false);
        let mut config = ConfigRow {
            id: String::new(),
            provider_type: request.text("providerType").unwrap_or_default(),
            display_name: request.text("displayName").unwrap_or_default(),
            status: if enabled { "active" } else { "draft" }.into(),
            enabled,
            is_default: request.boolean("isDefault").unwrap_or(false),
            endpoint: request.text("endpoint"),
            region: request.text("region"),
            bucket: request.text("bucket"),
            key_prefix: request.text("keyPrefix"),
            force_path_style: request.boolean("forcePathStyle").unwrap_or(false),
            credentials_updated_at: if access.is_some() || secret.is_some() {
                Some(now)
            } else {
                None
            },
            encrypted_access_key_id: access,
            encrypted_secret_access_key: secret,
            row_version: 1,
            created_at: now,
            created_by: context.operator,
            updated_at: now,
            updated_by: context.operator,
            raw_text: Default::default(),
        };
        remember_raw_text(&mut config, &request);
        normalize(&mut config);
        assert_state(&config)?;
        // Repository.create queues this new entity. Native auth01 confirms
        // that the enabled-location find AUTO-flushes it before its SELECT.
        // Consume pending auth only once. Native enabled19 confirms the next
        // self query hydrates this now-clean entity from its persisted text.
        let auto_persisted = config.enabled;
        if auto_persisted {
            let saved = store::save(
                &self.database,
                vec![(None, config.clone())],
                &mut context.pending,
            )
            .await?;
            if let Some(row) = saved.into_iter().next() {
                config = row;
            }
        }
        if let Some(hydrated) = self.assert_save(&config).await?
            && auto_persisted
        {
            config = hydrated;
        }
        let previous = if config.is_default {
            self.default_config().await?
        } else {
            None
        };
        if let Some(fresh) = previous.as_ref().filter(|row| row.id == config.id) {
            let mut baseline = config.clone();
            merge_managed_self(&mut baseline, &mut config, fresh);
        }
        let previous_id = previous.as_ref().map(|v| v.id.clone());
        let mut changes = Vec::new();
        if let Some(old) = previous.filter(|v| v.id != config.id) {
            let mut updated = old.clone();
            updated.is_default = false;
            updated.updated_by = context.operator;
            changes.push((Some(old), updated));
        }
        changes.push((
            if auto_persisted {
                Some(config.clone())
            } else {
                None
            },
            config.clone(),
        ));
        let saved = store::save(&self.database, changes, &mut context.pending).await?;
        let target = saved
            .into_iter()
            .find(|v| !auto_persisted || v.id == config.id);
        if let Some(row) = target {
            config = row;
        }
        self.audit(
            "attachment-storage-provider.config.created",
            &config,
            None,
            json!({"previousDefaultConfigId":previous_id}),
            &mut context,
            auth,
        )
        .await?;
        Ok(detail(&config))
    }
    pub async fn update(
        &self,
        id: &str,
        request: RequestData,
        mut context: CallContext,
        auth: &AuthService,
    ) -> Result<String, StorageFailure> {
        let mut config = self.require_config(id).await?;
        check_version(&config, &request)?;
        let mut before = config.clone();
        let snapshot = audit_snapshot(&config);
        if let Some(v) = request.text("displayName") {
            config.display_name = v;
        }
        if let Some(v) = request.boolean("enabled") {
            config.enabled = v;
        }
        if let Some(v) = request.text("status") {
            config.status = v;
        }
        if request.boolean("enabled") == Some(false) && !request.has("status") {
            config.status = "disabled".into();
        }
        macro_rules! nullable {
            ($field:ident,$key:literal) => {
                if request.has($key) {
                    config.$field = request.text($key);
                }
            };
        }
        nullable!(endpoint, "endpoint");
        nullable!(region, "region");
        nullable!(bucket, "bucket");
        nullable!(key_prefix, "keyPrefix");
        if let Some(v) = request.boolean("forcePathStyle") {
            config.force_path_style = v;
        }
        for (key, is_access) in [("accessKeyId", true), ("secretAccessKey", false)] {
            if request.has(key) {
                let value = request
                    .string(key)
                    .map(|v| self.settings.cipher.encrypt(v.as_code_units()))
                    .transpose()
                    .map_err(|_| StorageFailure::internal())?;
                if is_access {
                    config.encrypted_access_key_id = value;
                } else {
                    config.encrypted_secret_access_key = value;
                }
                config.credentials_updated_at = Some(clock_now());
            }
        }
        remember_raw_text(&mut config, &request);
        config.updated_by = context.operator;
        normalize(&mut config);
        // Original cas21: a self read merges clean data and always its version,
        // while preserving dirty values and their original comparison baseline.
        // The independently captured audit snapshot remains at the first read.
        if let Some(fresh) = self.assert_save(&config).await? {
            merge_managed_self(&mut before, &mut config, &fresh);
        }
        let saved = store::save(
            &self.database,
            vec![(Some(before), config.clone())],
            &mut context.pending,
        )
        .await?;
        if let Some(value) = saved.into_iter().next() {
            config = value;
        }
        self.audit(
            "attachment-storage-provider.config.updated",
            &config,
            Some(snapshot),
            json!({"secretRedacted":true}),
            &mut context,
            auth,
        )
        .await?;
        Ok(detail(&config))
    }
    pub async fn set_default(
        &self,
        id: &str,
        request: RequestData,
        mut context: CallContext,
        auth: &AuthService,
    ) -> Result<String, StorageFailure> {
        let mut config = self.require_config(id).await?;
        check_version(&config, &request)?;
        if !config.enabled || config.status != "active" {
            return Err(StorageFailure::http(
                StatusCode::BAD_REQUEST,
                "Only active and enabled attachment storage provider config can be set as default.",
            ));
        }
        let previous = self.default_config().await?;
        if let Some(fresh) = previous.as_ref().filter(|row| row.id == config.id) {
            let mut baseline = config.clone();
            merge_managed_self(&mut baseline, &mut config, fresh);
        }
        if previous.as_ref().is_some_and(|v| v.id == config.id) && config.is_default {
            return Ok(detail(&config));
        }
        let previous_id = previous.as_ref().map(|v| v.id.clone());
        let snapshot = audit_snapshot(&config);
        let before = config.clone();
        let mut changes = Vec::new();
        if let Some(old) = previous {
            let mut v = old.clone();
            v.is_default = false;
            v.updated_by = context.operator;
            changes.push((Some(old), v));
        }
        config.is_default = true;
        config.updated_by = context.operator;
        changes.push((Some(before), config.clone()));
        let saved = store::save(&self.database, changes, &mut context.pending).await?;
        if let Some(v) = saved.into_iter().find(|v| v.id == config.id) {
            config = v;
        }
        self.audit(
            "attachment-storage-provider.config.default-set",
            &config,
            Some(snapshot),
            json!({"previousDefaultConfigId":previous_id}),
            &mut context,
            auth,
        )
        .await?;
        Ok(detail(&config))
    }
    pub async fn test_connection(
        &self,
        id: &str,
        request: RequestData,
    ) -> Result<String, StorageFailure> {
        let config = self.require_config(id).await?;
        check_version(&config, &request)?;
        let result = if !config.enabled || config.status == "disabled" {
            Err(StorageFailure::unexpected(
                "Attachment storage provider is disabled.",
            ))
        } else if !missing(&config).is_empty() {
            Err(StorageFailure::unexpected(format!(
                "Attachment storage provider configuration is incomplete: {}.",
                missing(&config).join(", ")
            )))
        } else {
            match self.runtime_config(&config) {
                Ok(v) => self.test_runtime(&v).await,
                Err(e) => Err(e),
            }
        };
        let (status, message) = match result {
            Ok(message) => (
                "success",
                crate::auth::js_json::JsString::from_code_units(message.encode_utf16().collect()),
            ),
            Err(error) => ("failed", error.message),
        };
        Ok(format!(
            "{{\"status\":{},\"message\":{},\"checkedAt\":{}}}",
            json!(status),
            message.json(),
            json!(iso(clock_now()))
        ))
    }
    pub(crate) async fn default_config(&self) -> Result<Option<ConfigRow>, StorageFailure> {
        Ok(
            store::select(&self.database, None, None, None, None, None, true)
                .await?
                .into_iter()
                .next(),
        )
    }
    async fn assert_save(&self, config: &ConfigRow) -> Result<Option<ConfigRow>, StorageFailure> {
        assert_state(config)?;
        if config.enabled {
            let rows = store::select(
                &self.database,
                Some(config.provider_type.clone()),
                None,
                Some(true),
                Some(config.bucket.clone()),
                None,
                false,
            )
            .await?;
            if rows
                .iter()
                .any(|v| v.key_prefix == config.key_prefix && v.id != config.id)
            {
                let mut message = format!(
                    "Enabled attachment storage provider config already exists for {}/",
                    config.provider_type
                )
                .encode_utf16()
                .collect::<Vec<_>>();
                append_text(
                    &mut message,
                    config,
                    "bucket",
                    config.bucket.as_deref().unwrap_or("default"),
                );
                message.push(47);
                append_text(
                    &mut message,
                    config,
                    "key_prefix",
                    config.key_prefix.as_deref().unwrap_or("root"),
                );
                return Err(StorageFailure::from_js(
                    Some(StatusCode::CONFLICT),
                    crate::auth::js_json::JsString::from_code_units(message),
                ));
            }
            return Ok(rows
                .into_iter()
                .find(|row| row.id == config.id && row.key_prefix == config.key_prefix));
        }
        Ok(None)
    }
    pub(crate) fn runtime_config(&self, c: &ConfigRow) -> Result<RuntimeConfig, StorageFailure> {
        let decrypt = |value: &Option<String>| {
            value
                .as_ref()
                .filter(|v| !v.is_empty())
                .map(|v| {
                    self.settings
                        .cipher
                        .decrypt(v)
                        .map_err(|e| StorageFailure::http(StatusCode::BAD_REQUEST, e.to_string()))
                })
                .transpose()
        };
        Ok(RuntimeConfig {
            provider_type: c.provider_type.clone(),
            endpoint: c.endpoint.clone(),
            region: c.region.clone(),
            bucket: c.bucket.clone(),
            key_prefix: c.key_prefix.clone(),
            force_path_style: c.force_path_style,
            access_key_id: decrypt(&c.encrypted_access_key_id)?,
            secret_access_key: decrypt(&c.encrypted_secret_access_key)?,
        })
    }
    async fn audit(
        &self,
        event: &str,
        config: &ConfigRow,
        before: Option<Value>,
        mut metadata: Value,
        context: &mut CallContext,
        _auth: &AuthService,
    ) -> Result<(), StorageFailure> {
        metadata["secretRedacted"] = json!(true);
        store::audit(
            &self.database,
            AuditLogInput {
                event_type: event.into(),
                target_type: "AttachmentStorageProviderConfig".into(),
                target_id: config.id.clone(),
                operator_id: context.operator,
                before_snapshot: before,
                metadata: Some(metadata),
                ..Default::default()
            },
            wire_snapshot(config, audit_snapshot(config)),
            &mut context.pending,
        )
        .await
    }
}
fn refresh_clean_scalar<T: Clone + PartialEq>(
    baseline: &mut T,
    current: &mut T,
    fresh: &T,
    raw_dirty: bool,
    accept_fresh: bool,
) -> bool {
    if !accept_fresh || raw_dirty || baseline != current {
        return false;
    }
    baseline.clone_from(fresh);
    current.clone_from(fresh);
    true
}
/// The original EntityFactory.mergeData rule on this request's identity map.
/// Keep each dirty scalar plus its old baseline; merge clean scalars into both.
/// Raw JS units participate in dirtiness even when both UTF8 mirrors are U+FFFD.
fn merge_managed_self(baseline: &mut ConfigRow, current: &mut ConfigRow, fresh: &ConfigRow) {
    macro_rules! merge {
        ($field:ident,$column:expr,$accept:expr) => {
            let accept_fresh = $accept;
            let raw_dirty = baseline.raw_text.get($column) != current.raw_text.get($column);
            if refresh_clean_scalar(
                &mut baseline.$field,
                &mut current.$field,
                &fresh.$field,
                raw_dirty,
                accept_fresh,
            ) {
                baseline.raw_text.remove($column);
                current.raw_text.remove($column);
            }
        };
    }
    macro_rules! scalar {
        ($field:ident) => {
            merge!($field, stringify!($field), true);
        };
    }
    macro_rules! nullable {
        ($field:ident) => {
            // Original mergeData filters a null DB value while the existing
            // entity value is non-null. Undefined is absent from DB rows here.
            merge!(
                $field,
                stringify!($field),
                current.$field.is_none() || fresh.$field.is_some()
            );
        };
    }
    scalar!(id);
    scalar!(provider_type);
    scalar!(display_name);
    scalar!(status);
    scalar!(enabled);
    scalar!(is_default);
    nullable!(endpoint);
    nullable!(region);
    nullable!(bucket);
    nullable!(key_prefix);
    scalar!(force_path_style);
    nullable!(encrypted_access_key_id);
    nullable!(encrypted_secret_access_key);
    nullable!(credentials_updated_at);
    scalar!(created_at);
    nullable!(created_by);
    scalar!(updated_at);
    nullable!(updated_by);
    // Version properties are always reintroduced by mergeData, even when
    // excluded from comparable scalars. Client expectedVersion was checked once
    // at the original read; a self refresh must not add a second such check.
    baseline.row_version = fresh.row_version;
    current.row_version = fresh.row_version;
}
pub(crate) fn random_uuid() -> Result<String, StorageFailure> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| StorageFailure::internal())?;
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    Ok(uuid::Uuid::from_bytes(bytes).to_string())
}
pub(crate) fn iso(value: chrono::DateTime<chrono::Utc>) -> String {
    js_iso_string(value).unwrap_or_default()
}
pub(crate) fn missing(c: &ConfigRow) -> Vec<&'static str> {
    if c.provider_type == "local" {
        return Vec::new();
    }
    [
        ("endpoint", &c.endpoint),
        ("region", &c.region),
        ("bucket", &c.bucket),
        ("accessKeyId", &c.encrypted_access_key_id),
        ("secretAccessKey", &c.encrypted_secret_access_key),
    ]
    .into_iter()
    .filter(|(_, v)| v.as_ref().is_none_or(|s| s.is_empty()))
    .map(|(k, _)| k)
    .collect()
}
pub(crate) fn normalize(c: &mut ConfigRow) {
    if !c.enabled {
        if c.status == "active" {
            c.status = "disabled".into();
        }
        c.is_default = false;
        return;
    }
    if c.status == "disabled" {
        c.enabled = false;
        c.is_default = false;
        return;
    }
    if missing(c).is_empty() {
        if matches!(c.status.as_str(), "draft" | "misconfigured") {
            c.status = "active".into();
        }
    } else if c.status == "active" {
        c.status = "misconfigured".into();
        c.is_default = false;
    }
}
fn assert_state(config: &ConfigRow) -> Result<(), StorageFailure> {
    if config.provider_type == "local"
        && [
            &config.endpoint,
            &config.region,
            &config.bucket,
            &config.encrypted_access_key_id,
            &config.encrypted_secret_access_key,
        ]
        .iter()
        .any(|v| v.as_ref().is_some_and(|v| !v.is_empty()))
    {
        return Err(StorageFailure::http(
            StatusCode::BAD_REQUEST,
            "Local attachment storage provider does not accept OBS endpoint, bucket or access keys.",
        ));
    }
    if config.status == "active" && (!config.enabled || !missing(config).is_empty()) {
        return Err(StorageFailure::http(
            StatusCode::BAD_REQUEST,
            "Active attachment storage provider config must be enabled and complete.",
        ));
    }
    if config.is_default && (!config.enabled || config.status != "active") {
        return Err(StorageFailure::http(
            StatusCode::BAD_REQUEST,
            "Default attachment storage provider must be active and enabled.",
        ));
    }
    Ok(())
}
fn check_version(c: &ConfigRow, request: &RequestData) -> Result<(), StorageFailure> {
    if let Some(expected) = request.number("expectedVersion")
        && expected != f64::from(c.row_version)
    {
        return Err(StorageFailure::http(
            StatusCode::CONFLICT,
            format!(
                "Attachment storage provider config version conflict: expected {}, actual {}",
                crate::compat::scalars::js_number_string(expected),
                c.row_version
            ),
        ));
    }
    Ok(())
}
fn audit_snapshot(c: &ConfigRow) -> Value {
    json!({"providerType":c.provider_type,"displayName":c.display_name,"status":c.status,"enabled":c.enabled,"isDefault":c.is_default,"endpoint":c.endpoint,"region":c.region,"bucket":c.bucket,"keyPrefix":c.key_prefix,"forcePathStyle":c.force_path_style,"accessKeyConfigured":c.encrypted_access_key_id.as_ref().is_some_and(|v|!v.is_empty()),"secretAccessKeyConfigured":c.encrypted_secret_access_key.as_ref().is_some_and(|v|!v.is_empty()),"credentialsUpdatedAt":c.credentials_updated_at.map(iso),"rowVersion":c.row_version})
}
fn remember_raw_text(config: &mut ConfigRow, request: &RequestData) {
    for (key, column) in [
        ("displayName", "display_name"),
        ("endpoint", "endpoint"),
        ("region", "region"),
        ("bucket", "bucket"),
        ("keyPrefix", "key_prefix"),
    ] {
        if !request.has(key) {
            continue;
        }
        let value = request.string(key);
        if let Some(value) = value.filter(|v| {
            !v.to_utf8_lossy()
                .encode_utf16()
                .eq(v.as_code_units().iter().copied())
        }) {
            config.raw_text.insert(column.into(), value);
        } else {
            config.raw_text.remove(column);
        }
    }
}
fn append_text(output: &mut Vec<u16>, config: &ConfigRow, column: &str, fallback: &str) {
    if let Some(raw) = config.raw_text.get(column) {
        output.extend_from_slice(raw.as_code_units());
    } else {
        output.extend(fallback.encode_utf16());
    }
}
fn wire_snapshot(c: &ConfigRow, value: Value) -> String {
    let Some(object) = value.as_object() else {
        return value.to_string();
    };
    format!(
        "{{{}}}",
        object
            .iter()
            .map(|(key, value)| {
                let column = match key.as_str() {
                    "displayName" => "display_name",
                    "keyPrefix" => "key_prefix",
                    key => key,
                };
                let raw = c
                    .raw_text
                    .get(column)
                    .map_or_else(|| value.to_string(), |v| v.json());
                format!("{}:{raw}", json!(key))
            })
            .collect::<Vec<_>>()
            .join(",")
    )
}
fn detail(c: &ConfigRow) -> String {
    let mut v = audit_snapshot(c);
    v["id"] = json!(c.id);
    v["createdAt"] = json!(iso(c.created_at));
    v["createdBy"] = json!(c.created_by);
    v["updatedAt"] = json!(iso(c.updated_at));
    v["updatedBy"] = json!(c.updated_by);
    wire_snapshot(c, v)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn managed_fixture() -> ConfigRow {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-helper-golden.json"
        ))
        .unwrap_or_else(|_| panic!("original helper fixture"));
        let mut row: ConfigRow = serde_json::from_value(corpus["states"][0]["input"].clone())
            .unwrap_or_else(|_| panic!("mapped config"));
        row.provider_type = "local".into();
        row.display_name = "Initial".into();
        row.status = "active".into();
        row.enabled = true;
        row.is_default = false;
        row.row_version = 1;
        row.raw_text.clear();
        row
    }
    #[test]
    fn self_read_keeps_dirty_baseline_but_refreshes_clean_state_and_version() {
        let mut baseline = managed_fixture();
        let audit_before = audit_snapshot(&baseline);
        let mut current = baseline.clone();
        current.display_name = "Requested".into();
        current.row_version = 99;
        let mut fresh = baseline.clone();
        fresh.display_name = "Concurrent".into();
        fresh.is_default = true;
        fresh.row_version = 2;
        merge_managed_self(&mut baseline, &mut current, &fresh);
        assert_eq!(baseline.display_name, "Initial");
        assert_eq!(current.display_name, "Requested");
        assert!(baseline.is_default && current.is_default);
        assert_eq!((baseline.row_version, current.row_version), (2, 2));
        assert_eq!(audit_before["rowVersion"], 1);
        assert_eq!(audit_before["isDefault"], false);
        // A concurrent writer choosing our assigned value must not erase the
        // user's original dirty baseline and turn its flush into a no-op.
        fresh.display_name = "Requested".into();
        merge_managed_self(&mut baseline, &mut current, &fresh);
        assert_ne!(baseline.display_name, current.display_name);
    }
    #[test]
    fn clean_self_read_updates_both_snapshots_without_synthesizing_a_write() {
        let mut baseline = managed_fixture();
        baseline.endpoint = Some("existing".into());
        let mut current = baseline.clone();
        let mut fresh = baseline.clone();
        fresh.display_name = "Concurrent".into();
        fresh.is_default = true;
        fresh.row_version = 2;
        fresh.endpoint = None;
        merge_managed_self(&mut baseline, &mut current, &fresh);
        assert_eq!(baseline, current);
        assert_eq!(current.display_name, "Concurrent");
        assert_eq!(current.row_version, 2);
        assert!(current.is_default);
        assert_eq!(current.endpoint.as_deref(), Some("existing"));
    }
    #[test]
    fn same_lossy_text_does_not_erase_a_dirty_raw_js_string() {
        let mut baseline = managed_fixture();
        baseline.display_name = "\u{fffd}".into();
        let mut current = baseline.clone();
        current.raw_text.insert(
            "display_name".into(),
            crate::auth::js_json::JsString::from_code_units(vec![0xd800]),
        );
        let mut fresh = baseline.clone();
        fresh.display_name = "Concurrent".into();
        fresh.is_default = true;
        fresh.row_version = 2;
        merge_managed_self(&mut baseline, &mut current, &fresh);
        assert_eq!(baseline.display_name, "\u{fffd}");
        assert_eq!(current.display_name, "\u{fffd}");
        assert!(baseline.raw_text.is_empty());
        assert_eq!(current.raw_text["display_name"].as_code_units(), &[0xd800]);
        assert!(wire_snapshot(&current, audit_snapshot(&current)).contains("\\ud800"));
        assert_eq!((baseline.row_version, current.row_version), (2, 2));
        assert!(baseline.is_default && current.is_default);
    }
    #[test]
    fn original_normalization_order_and_required_fields() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-helper-golden.json"
        ))
        .unwrap_or_else(|_| panic!("I original state corpus"));
        for case in corpus["states"].as_array().into_iter().flatten() {
            let mut row: ConfigRow =
                serde_json::from_value(case["input"].clone()).unwrap_or_else(|_| panic!("config"));
            normalize(&mut row);
            let expected: ConfigRow = serde_json::from_value(case["expected"].clone())
                .unwrap_or_else(|_| panic!("expected"));
            assert_eq!(row, expected);
            assert_eq!(serde_json::json!(missing(&row)), case["missing"]);
        }
    }
    #[test]
    fn original_accepted_lone_surrogate_survives_response_and_jsonb_audit_boundary() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-helper-golden.json"
        ))
        .unwrap_or_else(|_| panic!("I original state corpus"));
        let mut row: ConfigRow = serde_json::from_value(corpus["states"][0]["input"].clone())
            .unwrap_or_else(|_| panic!("config"));
        let request = super::super::validation::validate(
            "CreateAttachmentStorageProviderConfigRequest",
            Some("{\"providerType\":\"local\",\"displayName\":\"\\ud800\"}"),
        )
        .unwrap_or_else(|_| panic!("original Zod accepts this input"));
        row.display_name = request.text("displayName").unwrap_or_default();
        remember_raw_text(&mut row, &request);
        assert_eq!(row.display_name, "\u{fffd}");
        let first_response = detail(&row);
        let audit = wire_snapshot(&row, audit_snapshot(&row));
        assert!(first_response.contains("\\ud800"));
        assert!(audit.contains("\\ud800"));
        assert!(!audit.contains('\u{fffd}'));
        let ordinary = super::super::validation::validate(
            "UpdateAttachmentStorageProviderConfigRequest",
            Some("{\"displayName\":\"plain\"}"),
        )
        .unwrap_or_else(|_| panic!("plain"));
        remember_raw_text(&mut row, &ordinary);
        assert!(row.raw_text.is_empty());
    }
}
