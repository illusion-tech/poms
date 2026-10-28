use super::{
    SettingDefinition, bytes_per_mb, definitions,
    model::{SystemSettingSummary, UpdateSystemSetting},
    store::{self, SettingChanges, SettingRow},
};
use crate::{
    auth::{
        audit::AuditLogInput,
        model::{SessionFlush, clock_now},
        service::AuthService,
        store::flush_managed_session,
    },
    compat::scalars::js_iso_string,
    database::{Database, DbError},
    shared::generated::SystemSettingKey,
};
use sqlx::Connection;
use std::{error::Error, fmt};
use uuid::Uuid;
#[derive(Debug)]
pub enum SystemSettingsError {
    NotFound(String),
    BadRequest(String),
    Conflict(String),
    Database(DbError),
    Internal,
}
impl fmt::Display for SystemSettingsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("system setting operation failed")
    }
}
impl Error for SystemSettingsError {}
impl From<DbError> for SystemSettingsError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
#[derive(Clone, Debug)]
pub struct SystemSettingsService {
    database: Database,
}
impl SystemSettingsService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }
    pub async fn list(&self) -> Result<Vec<SystemSettingSummary>, SystemSettingsError> {
        let rows = self
            .database
            .with_connection(|connection| Box::pin(store::list(connection)))
            .await?;
        definitions()
            .iter()
            .map(|definition| {
                summary(
                    definition,
                    rows.iter().find(|row| row.key == definition.key),
                )
            })
            .collect()
    }
    pub async fn get(&self, key: &str) -> Result<SystemSettingSummary, SystemSettingsError> {
        let definition = require_definition(key)?;
        let key = definition.key.clone();
        let row = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &key).await })
            })
            .await?;
        summary(definition, row.as_ref())
    }
    pub async fn get_integer_value(&self, key: &str) -> Result<i64, SystemSettingsError> {
        Ok(self.get(key).await?.value)
    }
    pub async fn get_attachment_max_upload_size_bytes(&self) -> Result<i64, SystemSettingsError> {
        Ok(self
            .get_integer_value(SystemSettingKey::AttachmentMaxUploadSizeMb.as_str())
            .await?
            * bytes_per_mb())
    }
    pub async fn update(
        &self,
        key: &str,
        request: UpdateSystemSetting,
        operator_id: Option<Uuid>,
        request_id: Option<String>,
        pending: Option<&SessionFlush>,
        auth: &AuthService,
    ) -> Result<SystemSettingSummary, SystemSettingsError> {
        let definition = require_definition(key)?;
        let value = normalize(definition, request.value)?;
        let key = definition.key.clone();
        let existing = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &key).await })
            })
            .await?;
        let (before_snapshot, mut setting) = if let Some(mut setting) = existing {
            if let Some(expected) = request.expected_version
                && expected != i64::from(setting.row_version)
            {
                return Err(version_conflict(definition, expected, setting.row_version));
            }
            let before = summary(definition, Some(&setting))?;
            let mut changes = SettingChanges::default();
            if setting.value_type != definition.value_type {
                changes.value_type = Some(definition.value_type.clone());
                setting.value_type = definition.value_type.clone();
            }
            // JSONB numeric 50.0 hydrates to the same JS Number as integer 50.
            if read_integer(definition, Some(&setting))? != value {
                changes.value_json = Some(value.to_string());
                setting.value_json = value.to_string();
            }
            if setting.updated_by != operator_id {
                changes.updated_by = Some(operator_id);
                setting.updated_by = operator_id;
            }
            self.flush_update(&mut setting, changes, pending).await?;
            (
                Some(serde_json::to_value(before).map_err(|_| SystemSettingsError::Internal)?),
                setting,
            )
        } else {
            if let Some(expected) = request.expected_version
                && expected != 0
            {
                return Err(version_conflict(definition, expected, 0));
            }
            let created_at = clock_now();
            let setting = SettingRow {
                key: definition.key.clone(),
                value_type: definition.value_type.clone(),
                value_json: value.to_string(),
                row_version: 1,
                updated_at: clock_now(),
                updated_by: operator_id,
            };
            self.flush_create(setting.clone(), created_at, pending)
                .await?;
            (None, setting)
        };
        // The original entity keeps the assigned JS value even on a clean flush.
        setting.value_json = value.to_string();
        let after = summary(definition, Some(&setting))?;
        let input = AuditLogInput {
            event_type: "platform.system_setting.updated".into(),
            target_type: "SystemSetting".into(),
            target_id: definition.key.clone(),
            operator_id,
            request_id,
            before_snapshot,
            after_snapshot: Some(
                serde_json::to_value(&after).map_err(|_| SystemSettingsError::Internal)?,
            ),
            ..Default::default()
        };
        // Independent second flush. First flush has already consumed pending.
        auth.record_audit_log_with_session(input, None)
            .await
            .map_err(|_| SystemSettingsError::Internal)?;
        Ok(after)
    }
    async fn flush_create(
        &self,
        setting: SettingRow,
        created_at: chrono::DateTime<chrono::Utc>,
        pending: Option<&SessionFlush>,
    ) -> Result<(), SystemSettingsError> {
        let pending = pending.cloned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        store::insert(&mut transaction, &setting, created_at).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(())
                    }
                    .await;
                    match result {
                        Ok(()) => transaction.commit().await,
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(())
    }
    // Final statement order is checked against the joint original Nest witness.
    async fn flush_update(
        &self,
        setting: &mut SettingRow,
        changes: SettingChanges,
        pending: Option<&SessionFlush>,
    ) -> Result<(), SystemSettingsError> {
        let dirty = changes.is_dirty();
        if !dirty && pending.is_none() {
            return Ok(());
        }
        let key = setting.key.clone();
        let version = setting.row_version;
        let at = clock_now();
        let pending = pending.cloned();
        let new_version = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Option<i32>, sqlx::Error> = async {
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if dirty {
                            Ok(Some(
                                store::update(&mut transaction, &key, version, &changes, at)
                                    .await?,
                            ))
                        } else {
                            Ok(None)
                        }
                    }
                    .await;
                    match result {
                        Ok(version) => {
                            transaction.commit().await?;
                            Ok(version)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        if let Some(version) = new_version {
            setting.row_version = version;
            setting.updated_at = at;
        }
        Ok(())
    }
}
fn require_definition(key: &str) -> Result<&'static SettingDefinition, SystemSettingsError> {
    definitions()
        .iter()
        .find(|definition| definition.key == key)
        .ok_or_else(|| SystemSettingsError::NotFound(format!("System setting {key} not found")))
}
fn version_conflict(
    definition: &SettingDefinition,
    expected: i64,
    actual: i32,
) -> SystemSettingsError {
    SystemSettingsError::Conflict(format!(
        "System setting {} version conflict: expected {expected}, actual {actual}",
        definition.key
    ))
}
fn normalize(definition: &SettingDefinition, value: i64) -> Result<i64, SystemSettingsError> {
    if value < definition.min_value || value > definition.max_value {
        return Err(SystemSettingsError::BadRequest(format!(
            "System setting {} must be between {} and {}",
            definition.key, definition.min_value, definition.max_value
        )));
    }
    Ok(value)
}
fn read_integer(
    definition: &SettingDefinition,
    setting: Option<&SettingRow>,
) -> Result<i64, SystemSettingsError> {
    let Some(setting) = setting else {
        return Ok(definition.default_value);
    };
    if setting.value_type != definition.value_type {
        return Err(SystemSettingsError::BadRequest(format!(
            "System setting {} value type is invalid",
            definition.key
        )));
    }
    let raw: &serde_json::value::RawValue =
        serde_json::from_str(&setting.value_json).map_err(|_| SystemSettingsError::Internal)?;
    if !matches!(raw.get().as_bytes().first(), Some(b'-' | b'0'..=b'9')) {
        return Err(SystemSettingsError::BadRequest(format!(
            "System setting {} value is invalid",
            definition.key
        )));
    }
    let value = raw.get().parse::<f64>().unwrap_or(f64::NAN);
    if !value.is_finite() || value.fract() != 0.0 {
        return Err(SystemSettingsError::BadRequest(format!(
            "System setting {} must be an integer",
            definition.key
        )));
    }
    if value < definition.min_value as f64 || value > definition.max_value as f64 {
        return Err(SystemSettingsError::BadRequest(format!(
            "System setting {} must be between {} and {}",
            definition.key, definition.min_value, definition.max_value
        )));
    }
    normalize(definition, value as i64)
}
fn summary(
    definition: &SettingDefinition,
    setting: Option<&SettingRow>,
) -> Result<SystemSettingSummary, SystemSettingsError> {
    Ok(SystemSettingSummary {
        key: definition.key.clone(),
        display_name: definition.display_name.clone(),
        description: definition.description.clone(),
        group: definition.group.clone(),
        value_type: definition.value_type.clone(),
        value: read_integer(definition, setting)?,
        default_value: definition.default_value,
        min_value: Some(definition.min_value),
        max_value: Some(definition.max_value),
        unit: Some(definition.unit.clone()),
        row_version: setting.map_or(0, |setting| setting.row_version),
        updated_at: setting
            .map(|setting| js_iso_string(setting.updated_at))
            .transpose()
            .map_err(|_| SystemSettingsError::Internal)?,
        updated_by: setting
            .and_then(|setting| setting.updated_by)
            .map(|id| id.to_string()),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_defaults_and_corrupt_persisted_values_follow_original_service() {
        let definition = &definitions()[0];
        let missing = summary(definition, None).unwrap_or_else(|_| panic!("default"));
        assert_eq!(missing.value, 50);
        assert_eq!(missing.row_version, 0);
        assert!(missing.updated_at.is_none());
        assert!(missing.updated_by.is_none());
        let mut setting = SettingRow {
            key: definition.key.clone(),
            value_type: "integer".into(),
            value_json: "50.0".into(),
            row_version: 7,
            updated_at: clock_now(),
            updated_by: None,
        };
        assert_eq!(
            read_integer(definition, Some(&setting)).unwrap_or_default(),
            50
        );
        for value in [
            "\"50\"", "null", "false", "1.5", "0", "501", "1e1000", "1e-1000",
        ] {
            setting.value_json = value.into();
            assert!(read_integer(definition, Some(&setting)).is_err());
        }
        setting.value_json = "50".into();
        setting.value_type = "unknown".into();
        assert!(read_integer(definition, Some(&setting)).is_err());
        assert!(require_definition(" ATTACHMENT.MAX-UPLOAD-SIZE-MB ").is_err());
        assert_eq!(bytes_per_mb(), 1048576);
    }
}
