//! Existing four-table reads. Flush implementation is bound to original Nest SQL witnesses.
use crate::{
    auth::{audit::AuditLogInput, model::SessionFlush},
    database::{Database, DbError},
};
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{Connection, Postgres, QueryBuilder, Row};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Clone, Copy, Debug)]
pub enum Table {
    Config,
    Binding,
    Grant,
    Ticket,
}
impl Table {
    pub fn name(self) -> &'static str {
        match self {
            Self::Config => "identity_provider_config",
            Self::Binding => "external_identity",
            Self::Grant => "identity_provider_oauth_grant",
            Self::Ticket => "external_login_ticket",
        }
    }
}
#[derive(Clone)]
pub struct Entity {
    pub table: Table,
    pub data: Value,
    pub original: Option<Value>,
    /// Original JSON encoding for values whose UTF-16 cannot inhabit Rust str.
    /// Plain text still uses pg UTF-8 replacement; JSONB retains native rejection.
    pub raw_fields: BTreeMap<String, String>,
}
impl std::fmt::Debug for Entity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("IdentityEntity")
            .field("table", &self.table)
            .finish_non_exhaustive()
    }
}
impl Entity {
    pub fn new(table: Table, mut data: Value) -> Self {
        let now = crate::auth::model::clock_now();
        data["created_at"] = json!(now);
        data["updated_at"] = json!(now);
        data["row_version"] = json!(1);
        Self {
            table,
            data,
            original: None,
            raw_fields: BTreeMap::new(),
        }
    }
    pub fn text(&self, key: &str) -> Option<String> {
        self.data[key].as_str().map(str::to_owned)
    }
    pub fn str(&self, key: &str) -> &str {
        self.data[key].as_str().unwrap_or("")
    }
    pub fn boolean(&self, key: &str) -> bool {
        self.data[key].as_bool().unwrap_or(false)
    }
    pub fn version(&self) -> i64 {
        self.data["row_version"].as_i64().unwrap_or(1)
    }
    pub fn id(&self) -> String {
        self.str("id").into()
    }
    pub fn uuid(&self, key: &str) -> Option<Uuid> {
        self.text(key).and_then(|v| Uuid::parse_str(&v).ok())
    }
    pub fn time(&self, key: &str) -> Option<DateTime<Utc>> {
        self.text(key)
            .and_then(|v| DateTime::parse_from_rfc3339(&v).ok())
            .and_then(|v| DateTime::from_timestamp_millis(v.timestamp_millis()))
    }
    pub fn strings(&self, key: &str) -> Vec<String> {
        self.data[key]
            .as_array()
            .map(|v| {
                v.iter()
                    .filter_map(|v| v.as_str().map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default()
    }
}
fn column_type(table: Table, key: &str) -> Option<&'static str> {
    let allowed = match table {
        Table::Config => {
            "id provider tenant_id display_name status enabled login_enabled binding_enabled search_enabled client_id encrypted_client_secret secret_updated_at redirect_uri search_redirect_uri login_scopes_json search_scopes_json tenant_allowlist_json search_grant_mode row_version created_at created_by updated_at updated_by"
        }
        Table::Binding => {
            "id identity_provider_config_id provider tenant_id poms_user_id subject_id union_id subject_display_name avatar_url email mobile status bound_at bound_by revoked_at revoked_by row_version created_at created_by updated_at updated_by"
        }
        Table::Grant => {
            "id identity_provider_config_id provider tenant_id poms_user_id encrypted_access_token encrypted_refresh_token scopes_json status granted_at expires_at refresh_expires_at last_used_at revoked_at last_error row_version created_at created_by updated_at updated_by"
        }
        Table::Ticket => {
            "id ticket_hash identity_provider_config_id external_identity_id poms_user_id provider tenant_id subject_id status expires_at consumed_at row_version created_at updated_at"
        }
    };
    if !allowed.split(' ').any(|v| v == key) {
        return None;
    }
    Some(if key.ends_with("_json") {
        "jsonb"
    } else if key == "id"
        || key.ends_with("_id")
            && key != "subject_id"
            && key != "client_id"
            && key != "tenant_id"
            && key != "union_id"
        || matches!(key, "created_by" | "updated_by" | "bound_by" | "revoked_by")
    {
        "uuid"
    } else if key.ends_with("_at") {
        "timestamptz"
    } else if key == "row_version" {
        "integer"
    } else if matches!(
        key,
        "enabled" | "login_enabled" | "binding_enabled" | "search_enabled"
    ) {
        "boolean"
    } else {
        "text"
    })
}
fn bind_value(
    query: &mut QueryBuilder<Postgres>,
    table: Table,
    key: &str,
    value: &Value,
) -> Result<(), sqlx::Error> {
    let kind = column_type(table, key)
        .ok_or_else(|| sqlx::Error::Protocol("unknown identity column".into()))?;
    if kind == "jsonb" {
        query.push_bind(value.clone());
    } else {
        let text = if value.is_null() {
            None
        } else if let Some(value) = value.as_str() {
            Some(value.into())
        } else {
            Some(value.to_string())
        };
        query.push_bind(text).push("::text::").push(kind);
    }
    Ok(())
}
fn bind_entity_value(
    query: &mut QueryBuilder<Postgres>,
    entity: &Entity,
    key: &str,
    value: &Value,
) -> Result<(), sqlx::Error> {
    if key.ends_with("_json")
        && let Some(raw) = entity.raw_fields.get(key)
    {
        query.push_bind(raw.clone()).push("::text::jsonb");
        Ok(())
    } else {
        bind_value(query, entity.table, key, value)
    }
}
pub async fn select(
    database: &Database,
    table: Table,
    conditions: Vec<(&'static str, Value)>,
    order: Option<&'static str>,
    limit_one: bool,
) -> Result<Vec<Entity>, DbError> {
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut query = QueryBuilder::<Postgres>::new(format!(
                    "SELECT to_jsonb(t)::text AS data FROM poms.{} t WHERE true",
                    table.name()
                ));
                for (key, value) in &conditions {
                    column_type(table, key).ok_or_else(|| {
                        sqlx::Error::Protocol("unknown identity condition".into())
                    })?;
                    query.push(" AND ").push(*key);
                    if value.is_null() {
                        query.push(" IS NULL");
                    } else {
                        query.push("=");
                        bind_value(&mut query, table, key, value)?;
                    }
                }
                if let Some(order) = order {
                    match order {
                        "created_at DESC" | "updated_at DESC" => {
                            query.push(" ORDER BY ").push(order);
                        }
                        _ => return Err(sqlx::Error::Protocol("unknown identity order".into())),
                    }
                }
                if limit_one {
                    query.push(" LIMIT 1");
                }
                query
                    .build()
                    .fetch_all(connection)
                    .await?
                    .into_iter()
                    .map(|row| {
                        let raw: String = row.try_get("data")?;
                        let data: Value = serde_json::from_str(&raw)
                            .map_err(|_| sqlx::Error::Protocol("identity row JSON".into()))?;
                        Ok(Entity {
                            table,
                            data: data.clone(),
                            original: Some(data),
                            raw_fields: BTreeMap::new(),
                        })
                    })
                    .collect()
            })
        })
        .await
}
pub async fn find(database: &Database, table: Table, id: &str) -> Result<Option<Entity>, DbError> {
    Ok(select(database, table, vec![("id", json!(id))], None, true)
        .await?
        .into_iter()
        .next())
}
pub async fn user_active(database: &Database, id: &str) -> Result<Option<bool>, DbError> {
    let id = id.to_owned();
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                sqlx::query_scalar(
                    "SELECT is_active FROM poms.platform_user WHERE id=$1::text::uuid",
                )
                .bind(id)
                .fetch_optional(connection)
                .await
            })
        })
        .await
}

// Original Nest first02: inserts precede managed-session CAS; existing entity
// updates/no-op flushes place managed-session CAS first. Each audit is separate.
pub async fn save(
    database: &Database,
    entity: &mut Entity,
    pending: &mut Option<SessionFlush>,
) -> Result<(), DbError> {
    let table = entity.table;
    let before = entity.original.clone();
    let mut data = entity.data.clone();
    let dirty = data
        .as_object()
        .into_iter()
        .flatten()
        .filter(|(key, value)| {
            !matches!(
                key.as_str(),
                "id" | "row_version" | "created_at" | "updated_at"
            ) && (entity.raw_fields.contains_key(key.as_str())
                || before
                    .as_ref()
                    .is_some_and(|previous| previous.get(key.as_str()) != Some(*value)))
        })
        .map(|(key, _)| key.clone())
        .collect::<Vec<_>>();
    let insert = before.is_none();
    let changed = insert || !dirty.is_empty();
    if !changed && pending.is_none() {
        return Ok(());
    }
    if !insert && changed {
        data["updated_at"] = json!(crate::auth::model::clock_now());
    }
    let planned = data.clone();
    let raw_entity = entity.clone();
    let managed = pending.clone();
    let result = database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut transaction = connection.begin().await?;
                let operation: Result<Option<(Uuid, i32)>, sqlx::Error> = async {
                    if !insert && let Some(managed) = managed.as_ref() {
                        crate::auth::store::flush_managed_session(&mut transaction, managed)
                            .await?;
                    }
                    let written = if insert {
                        let fields = planned
                            .as_object()
                            .ok_or_else(|| sqlx::Error::Protocol("identity insert object".into()))?
                            .iter()
                            .filter(|(key, _)| !matches!(key.as_str(), "id" | "row_version"))
                            .collect::<Vec<_>>();
                        let mut query = QueryBuilder::<Postgres>::new(format!(
                            "INSERT INTO poms.{} (",
                            table.name()
                        ));
                        for (index, (key, _)) in fields.iter().enumerate() {
                            column_type(table, key).ok_or_else(|| {
                                sqlx::Error::Protocol("unknown identity insert column".into())
                            })?;
                            if index > 0 {
                                query.push(",");
                            }
                            query.push(*key);
                        }
                        query.push(") VALUES (");
                        for (index, (key, value)) in fields.iter().enumerate() {
                            if index > 0 {
                                query.push(",");
                            }
                            bind_entity_value(&mut query, &raw_entity, key, value)?;
                        }
                        query.push(") RETURNING id,row_version");
                        let row = query.build().fetch_one(&mut *transaction).await?;
                        Some((row.try_get("id")?, row.try_get("row_version")?))
                    } else if changed {
                        let mut query = QueryBuilder::<Postgres>::new(format!(
                            "UPDATE poms.{} SET ",
                            table.name()
                        ));
                        for (index, key) in dirty.iter().enumerate() {
                            if index > 0 {
                                query.push(",");
                            }
                            query.push(key).push("=");
                            bind_entity_value(&mut query, &raw_entity, key, &planned[key])?;
                        }
                        query.push(",updated_at=");
                        bind_value(&mut query, table, "updated_at", &planned["updated_at"])?;
                        query.push(",row_version=row_version+1 WHERE id=");
                        bind_value(&mut query, table, "id", &planned["id"])?;
                        query
                            .push(" AND row_version=")
                            .push_bind(planned["row_version"].as_i64().unwrap_or(1))
                            .push(" RETURNING id,row_version");
                        let row = query
                            .build()
                            .fetch_optional(&mut *transaction)
                            .await?
                            .ok_or_else(|| {
                                sqlx::Error::Protocol("identity managed version conflict".into())
                            })?;
                        Some((row.try_get("id")?, row.try_get("row_version")?))
                    } else {
                        None
                    };
                    if insert && let Some(managed) = managed.as_ref() {
                        crate::auth::store::flush_managed_session(&mut transaction, managed)
                            .await?;
                    }
                    Ok(written)
                }
                .await;
                match operation {
                    Ok(value) => {
                        transaction.commit().await?;
                        Ok(value)
                    }
                    Err(error) => {
                        transaction.rollback().await?;
                        Err(error)
                    }
                }
            })
        })
        .await?;
    if let Some((id, version)) = result {
        data["id"] = json!(id);
        data["row_version"] = json!(version);
        entity.data = data;
    }
    entity.original = Some(entity.data.clone());
    *pending = None;
    Ok(())
}
pub async fn audit(
    database: &Database,
    input: AuditLogInput,
    raw_after: Option<String>,
    raw_metadata: Option<String>,
    pending: &mut Option<SessionFlush>,
) -> Result<(), DbError> {
    let managed = pending.clone();
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut transaction = connection.begin().await?;
                let operation: Result<(), sqlx::Error> = async {
                    if raw_after.is_some()||raw_metadata.is_some(){
                        let after=raw_after.or_else(||input.after_snapshot.as_ref().map(Value::to_string));let metadata=raw_metadata.or_else(||input.metadata.as_ref().map(Value::to_string));
                        sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10::text::jsonb,$11)")
                            .bind(&input.event_type).bind(&input.target_type).bind(&input.target_id).bind(input.operator_id).bind(&input.request_id).bind(input.result.as_str()).bind(&input.reason).bind(&input.before_snapshot).bind(after).bind(metadata).bind(input.occurred_at.unwrap_or_else(crate::auth::model::clock_now)).execute(&mut *transaction).await?;
                    }else{crate::auth::audit::insert_audit_log(&mut transaction, &input).await?;}
                    if let Some(managed) = managed.as_ref() {
                        crate::auth::store::flush_managed_session(&mut transaction, managed)
                            .await?;
                    }
                    Ok(())
                }
                .await;
                match operation {
                    Ok(()) => {
                        transaction.commit().await?;
                        Ok(())
                    }
                    Err(error) => {
                        transaction.rollback().await?;
                        Err(error)
                    }
                }
            })
        })
        .await?;
    *pending = None;
    Ok(())
}
