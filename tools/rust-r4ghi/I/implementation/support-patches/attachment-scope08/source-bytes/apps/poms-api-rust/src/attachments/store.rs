//! Existing attachment tables and one ORM-flush worth of SQL. No schema/fixture writes.
use super::model::{Wire, js};
use crate::{
    attachment_storage::StorageFailure,
    auth::{
        js_json::JsString,
        model::{SessionFlush, clock_now},
    },
    database::{ConnectionOperation, Database},
};
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{Connection, PgConnection, Postgres, QueryBuilder, Row};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::{
        Arc,
        atomic::{AtomicU8, Ordering},
    },
};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Table {
    Attachment,
    Link,
    Session,
    HandoverSelection,
    DownloadPackage,
    DownloadPackageItem,
}
impl Table {
    pub fn name(self) -> &'static str {
        match self {
            Self::Attachment => "attachment",
            Self::Link => "attachment_link",
            Self::Session => "attachment_upload_session",
            Self::HandoverSelection => "project_handover_attachment_selection",
            Self::DownloadPackage => "attachment_download_package",
            Self::DownloadPackageItem => "attachment_download_package_item",
        }
    }
    pub fn versioned(self) -> bool {
        !matches!(self, Self::Link | Self::DownloadPackageItem)
    }
}
#[derive(Clone)]
pub struct Entity {
    pub table: Table,
    pub data: Value,
    pub original: Option<Value>,
    pub raw: BTreeMap<String, JsString>,
    pub original_raw: BTreeMap<String, JsString>,
    /// Original JS/PG JSON member order, needed for manifest bytes after hydration.
    pub json_raw: BTreeMap<String, String>,
    /// ORM comparison baseline retains the original managed JSON member order.
    pub original_json_raw: BTreeMap<String, String>,
    poisoned: bool,
}
impl std::fmt::Debug for Entity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AttachmentEntity")
            .field("table", &self.table)
            .finish_non_exhaustive()
    }
}
impl Entity {
    pub(super) fn is_poisoned(&self) -> bool {
        self.poisoned
    }
    pub fn new(table: Table, mut data: Value) -> Self {
        if table.versioned() {
            data["row_version"] = json!(1);
        }
        Self {
            table,
            data,
            original: None,
            raw: BTreeMap::new(),
            original_raw: BTreeMap::new(),
            json_raw: BTreeMap::new(),
            original_json_raw: BTreeMap::new(),
            poisoned: false,
        }
    }
    pub fn loaded(table: Table, data: Value) -> Self {
        Self {
            table,
            original: Some(data.clone()),
            data,
            raw: BTreeMap::new(),
            original_raw: BTreeMap::new(),
            json_raw: BTreeMap::new(),
            original_json_raw: BTreeMap::new(),
            poisoned: false,
        }
    }
    pub fn str(&self, key: &str) -> &str {
        self.data[key].as_str().unwrap_or("")
    }
    pub fn text(&self, key: &str) -> Option<String> {
        self.data[key].as_str().map(str::to_owned)
    }
    pub fn string(&self, key: &str) -> Option<JsString> {
        self.raw
            .get(key)
            .cloned()
            .or_else(|| self.text(key).map(|v| js(&v)))
    }
    pub fn id(&self) -> String {
        self.str("id").into()
    }
    pub fn version(&self) -> i64 {
        self.data["row_version"].as_i64().unwrap_or(1)
    }
    pub fn integer(&self, key: &str) -> i64 {
        self.data[key].as_i64().unwrap_or(0)
    }
    pub fn boolean(&self, key: &str) -> bool {
        self.data[key].as_bool().unwrap_or(false)
    }
    pub fn time(&self, key: &str) -> Option<DateTime<Utc>> {
        self.text(key)
            .and_then(|v| DateTime::parse_from_rfc3339(&v).ok())
            .and_then(|v| DateTime::from_timestamp_millis(v.timestamp_millis()))
    }
    pub fn set(&mut self, key: &str, value: Value) {
        self.raw.remove(key);
        self.json_raw.remove(key);
        self.data[key] = value;
    }
    pub fn set_json(&mut self, key: &str, value: Wire) -> Result<(), StorageFailure> {
        self.data[key] = serde_json::from_str(&value.0).map_err(|_| StorageFailure::internal())?;
        self.json_raw.insert(key.into(), value.0);
        Ok(())
    }
    pub fn json_wire(&self, key: &str) -> Wire {
        Wire(
            self.json_raw
                .get(key)
                .cloned()
                .unwrap_or_else(|| self.data[key].to_string()),
        )
    }
    pub fn set_text(&mut self, key: &str, value: Option<JsString>) {
        if let Some(value) = value {
            self.data[key] = json!(value.to_utf8_lossy());
            self.raw.insert(key.into(), value);
        } else {
            self.raw.remove(key);
            self.data[key] = Value::Null;
        }
    }
    fn changed(&self, key: &str) -> bool {
        let Some(before) = &self.original else {
            return true;
        };
        if self.table == Table::HandoverSelection && key == "source_refs" {
            // Native gamma03 + JsonType.ensureComparable/Platform JSON.stringify:
            // PG's property order is observable to dirty checking, syntax spaces
            // are not. Keep this rule confined to the K selection JSON field.
            let old = Wire(
                self.original_json_raw
                    .get(key)
                    .cloned()
                    .unwrap_or_else(|| before[key].to_string()),
            );
            let new = self.json_wire(key);
            return match (
                super::service::zip::compact_json(&old),
                super::service::zip::compact_json(&new),
            ) {
                (Ok(old), Ok(new)) => old.0 != new.0,
                _ => true,
            };
        }
        let old = self
            .original_raw
            .get(key)
            .cloned()
            .or_else(|| before[key].as_str().map(js));
        let new = self
            .raw
            .get(key)
            .cloned()
            .or_else(|| self.data[key].as_str().map(js));
        if old.is_some() || new.is_some() {
            old != new
        } else {
            before.get(key) != self.data.get(key)
        }
    }
    pub fn dirty(&self) -> Vec<String> {
        self.data
            .as_object()
            .into_iter()
            .flatten()
            .filter(|(k, _)| {
                !matches!(
                    k.as_str(),
                    "id" | "row_version" | "created_at" | "updated_at"
                ) && self.changed(k)
            })
            .map(|(k, _)| k.clone())
            .collect()
    }
    /// A real query refreshes unchanged values. Explicit request-local changes survive.
    pub fn refresh(&mut self, row: Self) {
        let dirty = self.dirty();
        for (k, v) in row.data.as_object().into_iter().flatten() {
            if !dirty.contains(k) {
                self.data[k] = v.clone();
                self.raw.remove(k);
                if let Some(original) = self.original.as_mut() {
                    original[k] = v.clone();
                }
                self.original_raw.remove(k);
                if let Some(raw) = row.json_raw.get(k) {
                    self.json_raw.insert(k.clone(), raw.clone());
                    self.original_json_raw.insert(k.clone(), raw.clone());
                } else {
                    self.json_raw.remove(k);
                    self.original_json_raw.remove(k);
                }
            }
        }
    }
    fn mark_committed(&mut self) {
        self.original = Some(self.data.clone());
        self.original_raw = self.raw.clone();
        self.original_json_raw = self.json_raw.clone();
    }
}
fn sql_failure(error: sqlx::Error) -> StorageFailure {
    if let sqlx::Error::Protocol(message) = &error
        && (message.starts_with("K56 conflict:") || message.starts_with("The optimistic lock"))
    {
        return StorageFailure::http(
            axum::http::StatusCode::CONFLICT,
            "Attachment source or version changed; reload and retry",
        );
    }
    if let Some(pg) = error
        .as_database_error()
        .and_then(|database| database.try_downcast_ref::<sqlx::postgres::PgDatabaseError>())
    {
        // MikroORM's PG exception message retains the server's primary text,
        // detail and hint. SQLx Display also adds its own prefix/source line;
        // persisting that Display would change complete().failedReason.
        let mut message = pg.message().to_owned();
        for (label, value) in [("detail", pg.detail()), ("hint", pg.hint())] {
            if let Some(value) = value {
                message.push_str("\n - ");
                message.push_str(label);
                message.push_str(": ");
                message.push_str(value);
            }
        }
        return StorageFailure::unexpected(message);
    }
    StorageFailure::unexpected(error.to_string())
}
async fn run<T, F>(database: &Database, operation: F) -> Result<T, StorageFailure>
where
    T: Send + 'static,
    F: for<'c> FnOnce(&'c mut PgConnection) -> ConnectionOperation<'c, T> + Send + 'static,
{
    database
        .with_connection(move |connection| {
            Box::pin(async move { Ok(operation(connection).await.map_err(sql_failure)) })
        })
        .await
        .map_err(|e| StorageFailure::unexpected(e.to_string()))?
}
#[derive(Clone)]
pub enum ReadFilter {
    ById,
    LinksByAttachment,
    VersionGroup,
    Latest,
    LinksByTarget,
    ExistingLink,
    Final,
    HandoverSelections,
    HandoverSelectionIds,
    Center(Vec<&'static str>),
}
impl ReadFilter {
    fn clause(&self) -> String {
        match self{
Self::ById=>"WHERE id=$1::text::uuid LIMIT 1".into(),
Self::LinksByAttachment=>"WHERE attachment_id=$1::text::uuid AND status='active' ORDER BY linked_at DESC".into(),
Self::VersionGroup=>"WHERE COALESCE(version_group_id,id)=$1::text::uuid ORDER BY version_no DESC,uploaded_at DESC".into(),
Self::Latest=>"WHERE COALESCE(version_group_id,id)=$1::text::uuid AND status='active' AND is_latest=true ORDER BY version_no DESC,uploaded_at DESC LIMIT 1".into(),
Self::LinksByTarget=>"WHERE target_type=$1 AND target_id=$2::text::uuid AND status='active' ORDER BY linked_at DESC".into(),
Self::ExistingLink=>"WHERE attachment_id=$1::text::uuid AND target_type=$2 AND target_id=$3::text::uuid AND relation_type=$4 AND status='active' LIMIT 1".into(),
Self::Final=>"WHERE COALESCE(version_group_id,id)=$1::text::uuid AND status='active' AND is_final=true ORDER BY version_no DESC,uploaded_at DESC LIMIT 1".into(),
Self::HandoverSelections=>"WHERE handover_id=$1::text::uuid ORDER BY updated_at DESC,created_at DESC".into(),
Self::HandoverSelectionIds=>"WHERE id=ANY($1::text::uuid[])".into(),
Self::Center(types)=>format!("WHERE status='active' AND target_type IN ({}) ORDER BY linked_at DESC",types.iter().filter(|t|["customer","lead","project","contract"].contains(t)).map(|t|format!("'{t}'")).collect::<Vec<_>>().join(","))}
    }
}
pub async fn rows(
    database: &Database,
    table: Table,
    filter: ReadFilter,
    params: Vec<String>,
) -> Result<Vec<Entity>, StorageFailure> {
    run(database, move |connection| {
        Box::pin(async move {
            let json_order = matches!(
                table,
                Table::HandoverSelection | Table::DownloadPackage | Table::DownloadPackageItem
            );
            let mut builder = QueryBuilder::<Postgres>::new(if json_order {
                "SELECT to_jsonb(t) AS data,to_jsonb(t)::text AS raw_json FROM poms."
            } else {
                "SELECT to_jsonb(t) AS data FROM poms."
            });
            builder.push(table.name()).push(" t ").push(filter.clause());
            let mut query = builder.build();
            for value in params {
                query = query.bind(value);
            }
            query
                .fetch_all(connection)
                .await?
                .into_iter()
                .map(|r| {
                    let mut entity = Entity::loaded(table, r.try_get("data")?);
                    if json_order {
                        let raw: String = r.try_get("raw_json")?;
                        let object = crate::auth::js_json::JsObject::parse(&raw)
                            .map_err(|_| sqlx::Error::Protocol("attachment JSON row".into()))?;
                        for key in ["source_refs", "manifest_summary"] {
                            if let Some(value) = object.get(key) {
                                entity.json_raw.insert(key.into(), value.get().into());
                            }
                        }
                        entity.mark_committed();
                    }
                    Ok(entity)
                })
                .collect()
        })
    })
    .await
}
pub async fn find(
    database: &Database,
    table: Table,
    id: &str,
) -> Result<Option<Entity>, StorageFailure> {
    Ok(rows(database, table, ReadFilter::ById, vec![id.into()])
        .await?
        .into_iter()
        .next())
}
pub async fn links(database: &Database, id: &str) -> Result<Vec<Entity>, StorageFailure> {
    rows(
        database,
        Table::Link,
        ReadFilter::LinksByAttachment,
        vec![id.into()],
    )
    .await
}
pub async fn group(database: &Database, id: &str) -> Result<Vec<Entity>, StorageFailure> {
    rows(
        database,
        Table::Attachment,
        ReadFilter::VersionGroup,
        vec![id.into()],
    )
    .await
}
pub async fn latest(database: &Database, id: &str) -> Result<Option<Entity>, StorageFailure> {
    Ok(rows(
        database,
        Table::Attachment,
        ReadFilter::Latest,
        vec![id.into()],
    )
    .await?
    .into_iter()
    .next())
}
pub async fn attachments(
    database: &Database,
    ids: Vec<String>,
    category: Option<String>,
    status: String,
) -> Result<Vec<Entity>, StorageFailure> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    run(database,move|connection|Box::pin(async move{
        let rows=sqlx::query("SELECT to_jsonb(t) AS data FROM poms.attachment t WHERE id=ANY($1::text[]::uuid[]) AND status=$2 AND is_latest=true AND ($3::text IS NULL OR category=$3) ORDER BY uploaded_at DESC")
            .bind(ids).bind(status).bind(category).fetch_all(connection).await?;
        rows.into_iter().map(|r|Ok(Entity::loaded(Table::Attachment,r.try_get("data")?))).collect()
    })).await
}
pub async fn all_active_links(
    database: &Database,
    ids: Vec<String>,
) -> Result<Vec<Entity>, StorageFailure> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    run(database,move|connection|Box::pin(async move{sqlx::query("SELECT to_jsonb(t) AS data FROM poms.attachment_link t WHERE attachment_id=ANY($1::text[]::uuid[]) AND status='active' ORDER BY linked_at DESC").bind(ids).fetch_all(connection).await?.into_iter().map(|r|Ok(Entity::loaded(Table::Link,r.try_get("data")?))).collect()})).await
}
fn target_table(kind: &str) -> Option<(&'static str, &'static str)> {
    Some(match kind {
        "customer" => (
            "customer",
            "json_build_object('id',id::text,'number',customer_no,'name',display_name)",
        ),
        "lead" => (
            "lead",
            "json_build_object('id',id::text,'number',lead_no,'name',lead_name)",
        ),
        "project" => (
            "project",
            "json_build_object('id',id::text,'number',project_no,'name',project_name)",
        ),
        "contract" => (
            "contract",
            "json_build_object('id',id::text,'number',contract_no,'projectId',project_id::text)",
        ),
        "sales-follow-up" => ("sales_follow_up_record", "json_build_object('id',id::text)"),
        "project-handover" => ("project_handover", "json_build_object('id',id::text)"),
        _ => return None,
    })
}
pub async fn targets(
    database: &Database,
    kind: &str,
    ids: Vec<String>,
) -> Result<Vec<Value>, StorageFailure> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let (table, columns) = target_table(kind)
        .ok_or_else(|| StorageFailure::unexpected("Unknown attachment target type"))?;
    run(database, move |connection| {
        Box::pin(async move {
            {
                let mut query = QueryBuilder::<Postgres>::new("SELECT ");
                query
                    .push(columns)
                    .push(" AS data FROM poms.")
                    .push(table)
                    .push(" WHERE id=ANY(")
                    .push_bind(ids)
                    .push("::text[]::uuid[])");
                query
                    .build()
                    .fetch_all(connection)
                    .await?
                    .into_iter()
                    .map(|r| r.try_get("data"))
                    .collect()
            }
        })
    })
    .await
}
pub async fn uploaders(
    database: &Database,
    ids: Vec<String>,
) -> Result<Vec<Value>, StorageFailure> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    run(database,move|connection|Box::pin(async move{sqlx::query("SELECT json_build_object('id',id::text,'displayName',display_name,'username',username) AS data FROM poms.platform_user WHERE id=ANY($1::text[]::uuid[])").bind(ids).fetch_all(connection).await?.into_iter().map(|r|r.try_get("data")).collect()})).await
}
fn columns(table: Table) -> &'static str {
    match table {
        Table::Attachment => {
            "id original_name display_name extension mime_type size_bytes checksum_sha256 category security_level storage_provider storage_bucket storage_key status description version_group_id version_no is_latest is_final previous_attachment_id change_note uploaded_by uploaded_at deleted_by deleted_at row_version created_at updated_at"
        }
        Table::Link => {
            "id attachment_id target_type target_id relation_type status linked_by linked_at unlinked_by unlinked_at"
        }
        Table::Session => {
            "id operation_type status upload_mode provider_type storage_bucket storage_key target_type target_id base_attachment_id completed_attachment_id original_name display_name extension mime_type size_bytes max_size_bytes checksum_sha256 category security_level relation_type description change_note expires_at uploaded_at completed_at aborted_at failed_reason row_version created_at created_by updated_at"
        }
        Table::HandoverSelection => {
            "id handover_id project_id attachment_id version_group_id display_name category security_level status selection_reason exclusion_reason source_refs created_at created_by updated_at updated_by row_version"
        }
        Table::DownloadPackage => {
            "id handover_id project_id status manifest_summary storage_provider storage_bucket storage_key file_name expires_at created_by created_at updated_at downloaded_at download_count failed_reason row_version"
        }
        Table::DownloadPackageItem => {
            "id package_id handover_id attachment_id version_group_id status source_refs file_name exclusion_reason created_at"
        }
    }
}
fn column_type(table: Table, key: &str) -> Option<&'static str> {
    if !columns(table).split(' ').any(|v| v == key) {
        return None;
    }
    Some(
        if key == "id" || key.ends_with("_id") || key.ends_with("_by") {
            "uuid"
        } else if key.ends_with("_at") {
            "timestamptz"
        } else if matches!(
            key,
            "size_bytes" | "max_size_bytes" | "version_no" | "row_version" | "download_count"
        ) {
            "integer"
        } else if matches!(key, "source_refs" | "manifest_summary") {
            "jsonb"
        } else if matches!(key, "is_latest" | "is_final") {
            "boolean"
        } else {
            "text"
        },
    )
}
fn bind(query: &mut QueryBuilder<Postgres>, entity: &Entity, key: &str) -> Result<(), sqlx::Error> {
    let kind = column_type(entity.table, key)
        .ok_or_else(|| sqlx::Error::Protocol("unknown attachment column".into()))?;
    let text = if let Some(raw) = entity.json_raw.get(key) {
        Some(raw.clone())
    } else if entity.data[key].is_null() {
        None
    } else if let Some(raw) = entity.raw.get(key) {
        Some(raw.to_utf8_lossy())
    } else if let Some(text) = entity.data[key].as_str() {
        Some(text.to_owned())
    } else {
        Some(entity.data[key].to_string())
    };
    query.push_bind(text).push("::text::").push(kind);
    Ok(())
}
async fn insert(connection: &mut PgConnection, entity: &Entity) -> Result<Entity, sqlx::Error> {
    let mut query =
        QueryBuilder::<Postgres>::new(format!("INSERT INTO poms.{} (", entity.table.name()));
    let fields = entity
        .data
        .as_object()
        .ok_or_else(|| sqlx::Error::Protocol("attachment insert object".into()))?
        .keys()
        .filter(|v| v.as_str() != "row_version")
        .collect::<Vec<_>>();
    for (i, key) in fields.iter().enumerate() {
        column_type(entity.table, key)
            .ok_or_else(|| sqlx::Error::Protocol("attachment insert column".into()))?;
        if i > 0 {
            query.push(",");
        }
        query.push(*key);
    }
    query.push(") VALUES (");
    for (i, key) in fields.iter().enumerate() {
        if i > 0 {
            query.push(",");
        }
        bind(&mut query, entity, key)?;
    }
    query.push(") RETURNING id");
    if entity.table == Table::Link {
        query.push(",to_jsonb(attachment_link) AS data");
    }
    if entity.table.versioned() {
        query.push(",row_version");
    }
    let row = query.build().fetch_one(connection).await?;
    if entity.table == Table::Link {
        return hydrate_inserted_links(std::slice::from_ref(entity), vec![row.try_get("data")?])?
            .pop()
            .ok_or_else(|| sqlx::Error::Protocol("Missing Link RETURNING tuple".into()));
    }
    let mut entity = entity.clone();
    let id: uuid::Uuid = row.try_get("id")?;
    entity.data["id"] = json!(id);
    if entity.table.versioned() {
        entity.data["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
    }
    Ok(entity)
}
// INSERT defaults belong to the actual database row, not to absent JSON keys.
// Keep original=None until the outer commit ACK publishes the saved journal.
fn hydrate_inserted_links(
    planned: &[Entity],
    returned: Vec<Value>,
) -> Result<Vec<Entity>, sqlx::Error> {
    if planned.len() != returned.len() {
        return Err(sqlx::Error::Protocol("Link RETURNING row count".into()));
    }
    let mut by_id = BTreeMap::new();
    for row in returned {
        if !row.is_object()
            || columns(Table::Link)
                .split(' ')
                .any(|key| row.get(key).is_none())
        {
            return Err(sqlx::Error::Protocol(
                "Incomplete Link RETURNING tuple".into(),
            ));
        }
        let id = row["id"]
            .as_str()
            .and_then(|id| uuid::Uuid::parse_str(id).ok())
            .ok_or_else(|| sqlx::Error::Protocol("Invalid Link RETURNING identity".into()))?;
        if by_id.insert(id, row).is_some() {
            return Err(sqlx::Error::Protocol(
                "Duplicate Link RETURNING identity".into(),
            ));
        }
    }
    planned
        .iter()
        .map(|entity| {
            if entity.table != Table::Link {
                return Err(sqlx::Error::Protocol("Non-Link RETURNING hydration".into()));
            }
            let id = if entity.data.get("id").is_some() {
                uuid::Uuid::parse_str(&entity.id())
                    .map_err(|_| sqlx::Error::Protocol("Invalid planned Link identity".into()))?
            } else {
                // Generic handover Links intentionally use the DB-generated UUID.
                // Correlate only assigned INSERT fields; missing defaults are NOT
                // synthesized or ignored by the later strict committed-row guard.
                let candidates = by_id
                    .iter()
                    .filter(|(_, actual)| {
                        let Some(assigned) = entity.data.as_object() else {
                            return false;
                        };
                        let projection = assigned
                            .keys()
                            .filter_map(|key| {
                                actual.get(key).map(|value| (key.clone(), value.clone()))
                            })
                            .collect::<serde_json::Map<_, _>>();
                        same_proof(&entity.data, &Value::Object(projection))
                    })
                    .map(|(id, _)| *id)
                    .collect::<Vec<_>>();
                if candidates.len() != 1 {
                    return Err(sqlx::Error::Protocol(
                        "Ambiguous sparse Link RETURNING identity".into(),
                    ));
                }
                candidates[0]
            };
            let mut saved = entity.clone();
            saved.data = by_id.remove(&id).ok_or_else(|| {
                sqlx::Error::Protocol("Mismatched Link RETURNING identity".into())
            })?;
            Ok(saved)
        })
        .collect()
}
#[cfg(test)]
mod k98_hydration_tests {
    use super::*;
    const LINK_A: &str = "20000000-0000-4000-8000-000000000001";
    const LINK_B: &str = "20000000-0000-4000-8000-000000000002";
    fn sparse(attachment: &str) -> Entity {
        // The real handover producer supplies these seven fields and lets PG
        // generate id/default NULLs. This is a pure RETURNING-value fixture.
        Entity::new(
            Table::Link,
            json!({"attachment_id":attachment,"target_type":"project-handover","target_id":"30000000-0000-4000-8000-000000000001","relation_type":"handover","status":"active","linked_by":"40000000-0000-4000-8000-000000000001","linked_at":"2026-11-04T04:00:00.000Z"}),
        )
    }
    fn returned(planned: &Entity, id: &str) -> Value {
        let mut row = planned.data.clone();
        row["id"] = json!(id);
        row["linked_at"] = json!("2026-11-04T04:00:00+00:00");
        row["unlinked_by"] = Value::Null;
        row["unlinked_at"] = Value::Null;
        row
    }
    #[test]
    fn sparse_generic_link_commits_complete_baseline_for_next_audit_guard() {
        let planned = sparse("10000000-0000-4000-8000-000000000001");
        assert!(planned.data.get("id").is_none());
        assert!(planned.data.get("unlinked_at").is_none());
        let pg = returned(&planned, LINK_A);
        assert!(
            !same_proof(&planned.data, &pg),
            "strict guard must continue to reject incomplete baselines"
        );
        let mut saved = hydrate_inserted_links(&[planned], vec![pg.clone()])
            .unwrap_or_else(|_| panic!("actual complete tuple"))
            .remove(0);
        assert!(
            saved.original.is_none(),
            "hydration cannot pretend COMMIT ACK"
        );
        saved.mark_committed();
        assert_eq!(saved.id(), LINK_A);
        assert_eq!(saved.data.as_object().map(|m| m.len()), Some(10));
        assert!(saved.dirty().is_empty());
        let guard = FlushGuard::default();
        assert!(
            same_proof(
                first_source(&guard, &saved)
                    .original
                    .as_ref()
                    .unwrap_or(&Value::Null),
                &pg
            ),
            "subsequent generic audit flush sees the full real committed tuple"
        );
        let mut changed = pg;
        changed["status"] = json!("unlinked");
        changed["unlinked_at"] = json!("2026-11-04T04:00:01Z");
        assert!(
            !same_proof(saved.original.as_ref().unwrap_or(&Value::Null), &changed),
            "real post-commit tuple changes remain conflicts"
        );
    }
    #[test]
    fn returning_missing_nullable_field_is_rejected_not_filled_with_null() {
        let planned = sparse("10000000-0000-4000-8000-000000000001");
        let mut pg = returned(&planned, LINK_A);
        pg.as_object_mut()
            .unwrap_or_else(|| panic!("row"))
            .remove("unlinked_at");
        assert!(hydrate_inserted_links(&[planned], vec![pg]).is_err());
    }
    #[test]
    fn grouped_sparse_link_results_correlate_real_generated_ids_not_return_order() {
        let a = sparse("10000000-0000-4000-8000-000000000001");
        let b = sparse("10000000-0000-4000-8000-000000000002");
        let actual_a = returned(&a, LINK_A);
        let actual_b = returned(&b, LINK_B);
        let saved = hydrate_inserted_links(&[a, b], vec![actual_b.clone(), actual_a.clone()])
            .unwrap_or_else(|_| panic!("reversed RETURNING order"));
        assert_eq!(saved[0].data, actual_a);
        assert_eq!(saved[1].data, actual_b);
    }
    #[test]
    fn duplicate_returned_identity_cannot_publish_two_baselines() {
        let a = sparse("10000000-0000-4000-8000-000000000001");
        let b = sparse("10000000-0000-4000-8000-000000000002");
        assert!(
            hydrate_inserted_links(
                &[a.clone(), b.clone()],
                vec![returned(&a, LINK_A), returned(&b, LINK_A)]
            )
            .is_err()
        );
    }
    #[test]
    fn explicit_generated_id_must_match_its_actual_returned_identity() {
        let mut a = sparse("10000000-0000-4000-8000-000000000001");
        a.set("id", json!(LINK_A));
        assert!(hydrate_inserted_links(&[a.clone()], vec![returned(&a, LINK_B)]).is_err());
    }
    #[test]
    fn sparse_returning_cannot_silently_match_different_source_identity() {
        let a = sparse("10000000-0000-4000-8000-000000000001");
        let mut pg = returned(&a, LINK_A);
        pg["attachment_id"] = json!("10000000-0000-4000-8000-000000000002");
        assert!(hydrate_inserted_links(&[a], vec![pg]).is_err());
    }
}
/// K's CREATE classes follow the original reverse-postorder metadata calculator.
fn create_groups(changes: &[(usize, Entity)]) -> Vec<Vec<(usize, Entity)>> {
    let creates = changes
        .iter()
        .filter(|(_, entity)| entity.original.is_none())
        .cloned()
        .collect::<Vec<_>>();
    if !creates.iter().any(|(_, entity)| {
        matches!(
            entity.table,
            Table::HandoverSelection | Table::DownloadPackage | Table::DownloadPackageItem
        )
    }) {
        // Preserve the already-certified J scheduling outside the K entry UoW.
        return creates.into_iter().map(|value| vec![value]).collect();
    }
    let mut tables = Vec::new();
    for (_, entity) in &creates {
        if !tables.contains(&entity.table) {
            tables.push(entity.table);
        }
    }
    let mut edges = vec![Vec::new(); tables.len()];
    for (to, table) in tables.iter().enumerate() {
        let targets: &[Table] = match table {
            Table::Attachment | Table::DownloadPackage => &[],
            Table::Link | Table::Session | Table::HandoverSelection => &[Table::Attachment],
            Table::DownloadPackageItem => &[Table::DownloadPackage, Table::Attachment],
        };
        for target in targets {
            if let Some(from) = tables.iter().position(|table| table == target)
                && !edges[from].contains(&to)
            {
                edges[from].push(to);
            }
        }
    }
    fn visit(index: usize, edges: &[Vec<usize>], state: &mut [u8], sorted: &mut Vec<usize>) {
        if state[index] != 0 {
            return;
        }
        state[index] = 1;
        for &target in &edges[index] {
            visit(target, edges, state, sorted);
        }
        state[index] = 2;
        sorted.push(index);
    }
    let mut sorted = Vec::new();
    let mut state = vec![0; tables.len()];
    for index in 0..tables.len() {
        visit(index, &edges, &mut state, &mut sorted);
    }
    sorted
        .into_iter()
        .rev()
        .map(|index| {
            creates
                .iter()
                .filter(|(_, entity)| entity.table == tables[index])
                .cloned()
                .collect()
        })
        .collect()
}

/// Same-class K CREATEs are multi-VALUES statements with the original batchSize.
async fn insert_group(
    connection: &mut PgConnection,
    entities: &[Entity],
) -> Result<Vec<Entity>, sqlx::Error> {
    if entities.is_empty() {
        return Ok(Vec::new());
    }
    let table = entities[0].table;
    if entities.iter().any(|entity| entity.table != table) {
        return Err(sqlx::Error::Protocol(
            "mixed attachment CREATE group".into(),
        ));
    }
    let k_group = matches!(
        table,
        Table::HandoverSelection | Table::DownloadPackage | Table::DownloadPackageItem
    );
    if entities.len() == 1 && !k_group {
        return Ok(vec![insert(connection, &entities[0]).await?]);
    }
    let mut saved = Vec::new();
    for chunk in entities.chunks(300) {
        let fields = columns(table)
            .split(' ')
            .filter(|key| {
                *key != "row_version" && chunk.iter().any(|entity| entity.data.get(*key).is_some())
            })
            .collect::<Vec<_>>();
        let mut query = QueryBuilder::<Postgres>::new(format!(
            "INSERT INTO poms.{} ({}) VALUES ",
            table.name(),
            fields.join(",")
        ));
        for (row_index, entity) in chunk.iter().enumerate() {
            if row_index > 0 {
                query.push(",");
            }
            query.push("(");
            for (field_index, key) in fields.iter().enumerate() {
                if field_index > 0 {
                    query.push(",");
                }
                if entity.data.get(*key).is_some() {
                    bind(&mut query, entity, key)?;
                } else {
                    query.push("DEFAULT");
                }
            }
            query.push(")");
        }
        query.push(" RETURNING id");
        if table == Table::Link {
            query.push(",to_jsonb(attachment_link) AS data");
        }
        if table.versioned() {
            query.push(",row_version");
        }
        let returned = query.build().fetch_all(&mut *connection).await?;
        if returned.len() != chunk.len() {
            return Err(sqlx::Error::Protocol(
                "attachment CREATE returned row count".into(),
            ));
        }
        if table == Table::Link {
            let actual = returned
                .into_iter()
                .map(|row| row.try_get::<Value, _>("data"))
                .collect::<Result<Vec<_>, _>>()?;
            saved.extend(hydrate_inserted_links(chunk, actual)?);
            continue;
        }
        for (index, row) in returned.into_iter().enumerate() {
            let mut entity = chunk[index].clone();
            let id: uuid::Uuid = row.try_get("id")?;
            entity.data["id"] = json!(id);
            if table.versioned() {
                entity.data["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
            }
            saved.push(entity);
        }
    }
    Ok(saved)
}

async fn update(connection: &mut PgConnection, entity: &Entity) -> Result<Entity, sqlx::Error> {
    let dirty = entity.dirty();
    if dirty.is_empty() {
        return Ok(entity.clone());
    }
    let mut entity = entity.clone();
    if entity.table.versioned() {
        entity.data["updated_at"] = json!(clock_now());
    }
    let mut query =
        QueryBuilder::<Postgres>::new(format!("UPDATE poms.{} SET ", entity.table.name()));
    for (i, key) in dirty.iter().enumerate() {
        if i > 0 {
            query.push(",");
        }
        query.push(key).push("=");
        bind(&mut query, &entity, key)?;
    }
    if entity.table.versioned() {
        query.push(",updated_at=");
        bind(&mut query, &entity, "updated_at")?;
        query.push(",row_version=row_version+1");
    }
    query.push(" WHERE id=");
    bind(&mut query, &entity, "id")?;
    if entity.table.versioned() {
        query.push(" AND row_version=").push_bind(entity.version());
    }
    if entity.table == Table::Link
        && let Some(before) = &entity.original
    {
        let original = Entity::loaded(Table::Link, before.clone());
        for key in columns(Table::Link).split(' ').filter(|key| *key != "id") {
            query.push(" AND ").push(key).push(" IS NOT DISTINCT FROM ");
            bind(&mut query, &original, key)?;
        }
    }
    query.push(" RETURNING id");
    if entity.table.versioned() {
        query.push(",row_version");
    }
    let row = query
        .build()
        .fetch_optional(connection)
        .await?
        .ok_or_else(|| {
            sqlx::Error::Protocol(format!(
                "The optimistic lock on entity {} failed",
                entity.table.name()
            ))
        })?;
    if entity.table.versioned() {
        entity.data["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
    }
    Ok(entity)
}

/// history01 confirms the original generic ordinary-update group behavior:
/// one row uses strict CAS, multiple rows use an unlocked version precheck and
/// one PK-only CASE UPDATE. Do not close the native race window or reorder rows
/// to release a latest/final partial-unique key before the other row is visited.
async fn update_many(
    connection: &mut PgConnection,
    entities: &[Entity],
) -> Result<Vec<Entity>, sqlx::Error> {
    if entities.is_empty() {
        return Ok(Vec::new());
    }
    if entities.len() == 1 {
        return Ok(vec![update(connection, &entities[0]).await?]);
    }
    let table = entities[0].table;
    if entities.iter().any(|entity| entity.table != table) {
        return Err(sqlx::Error::Protocol(
            "mixed attachment update group".into(),
        ));
    }

    if table.versioned() {
        let mut check =
            QueryBuilder::<Postgres>::new(format!("SELECT id FROM poms.{} WHERE ", table.name()));
        for (index, entity) in entities.iter().enumerate() {
            if index > 0 {
                check.push(" OR ");
            }
            check.push("(id=");
            bind(&mut check, entity, "id")?;
            check
                .push(" AND row_version=")
                .push_bind(entity.version())
                .push(")");
        }
        check.push(" ORDER BY id ASC");
        if check.build().fetch_all(&mut *connection).await?.len() != entities.len() {
            return Err(sqlx::Error::Protocol(format!(
                "The optimistic lock on entity {} failed",
                table.name()
            )));
        }
    }

    let mut planned = entities.to_vec();
    if table.versioned() {
        for entity in &mut planned {
            entity.data["updated_at"] = json!(clock_now());
        }
    }
    let dirty = planned.iter().map(Entity::dirty).collect::<Vec<_>>();
    let mut query = QueryBuilder::<Postgres>::new(format!("UPDATE poms.{} SET ", table.name()));
    let mut has_field = false;
    // Metadata property order is also the original CASE field order. All names
    // come from this closed table definition; every value remains bound.
    for key in columns(table).split(' ') {
        let changed = planned
            .iter()
            .zip(&dirty)
            .filter(|(_, keys)| keys.iter().any(|v| v == key))
            .collect::<Vec<_>>();
        if changed.is_empty() {
            continue;
        }
        if has_field {
            query.push(",");
        }
        has_field = true;
        query.push(key).push("=CASE");
        for (entity, _) in changed {
            query.push(" WHEN id=");
            bind(&mut query, entity, "id")?;
            query.push(" THEN ");
            bind(&mut query, entity, key)?;
        }
        query.push(" ELSE ").push(key).push(" END");
    }
    if table.versioned() {
        if has_field {
            query.push(",");
        }
        query.push("updated_at=CASE");
        for entity in &planned {
            query.push(" WHEN id=");
            bind(&mut query, entity, "id")?;
            query.push(" THEN ");
            bind(&mut query, entity, "updated_at")?;
        }
        query.push(" ELSE updated_at END,row_version=row_version+1");
    }
    query.push(" WHERE id IN (");
    for (index, entity) in planned.iter().enumerate() {
        if index > 0 {
            query.push(",");
        }
        bind(&mut query, entity, "id")?;
    }
    query.push(") RETURNING id");
    if table.versioned() {
        query.push(",row_version");
    }
    let returned = query.build().fetch_all(connection).await?;
    // Map actual returned versions, including concurrent advancement after the
    // precheck. There is deliberately no post-UPDATE affected-row/version CAS.
    for row in returned {
        let id = row.try_get::<uuid::Uuid, _>("id")?.to_string();
        if let Some(entity) = planned.iter_mut().find(|entity| entity.id() == id)
            && table.versioned()
        {
            entity.data["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
        }
    }
    Ok(planned)
}
#[derive(Clone)]
pub struct AuditWrite {
    pub event: String,
    pub target: String,
    pub operator: uuid::Uuid,
    pub request_id: Option<String>,
    pub metadata: Wire,
    pub result: String,
}
#[derive(Clone, Copy)]
pub(super) enum SessionRule {
    Receive,
    Complete,
    Abort,
}
#[derive(Clone, Default)]
pub(super) struct FlushGuard {
    pub source_entities: Vec<Entity>,
    pub active_links: BTreeMap<String, Vec<Value>>,
    pub session_rules: BTreeMap<String, SessionRule>,
    pub version_max: BTreeMap<String, i64>,
    pub routing: Vec<Value>,
}
impl FlushGuard {
    fn has_intent(&self) -> bool {
        !self.source_entities.is_empty()
            || !self.active_links.is_empty()
            || !self.session_rules.is_empty()
            || !self.version_max.is_empty()
            || !self.routing.is_empty()
    }
}
fn first_source<'a>(guard: &'a FlushGuard, entity: &'a Entity) -> &'a Entity {
    guard
        .source_entities
        .iter()
        .find(|e| e.table == entity.table && e.id() == entity.id())
        .unwrap_or(entity)
}
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(super) enum CommitDisposition {
    KnownNotCommitted,
    Unknown,
}
pub(super) struct FlushFailure {
    pub error: StorageFailure,
    pub disposition: CommitDisposition,
}
fn changed_source() -> sqlx::Error {
    sqlx::Error::Protocol("K56 conflict: attachment source changed".into())
}
fn canonical_group(data: &Value) -> String {
    data["version_group_id"]
        .as_str()
        .or_else(|| data["id"].as_str())
        .unwrap_or("")
        .into()
}
pub(super) fn link_proof(rows: &[Entity]) -> Vec<Value> {
    let mut rows = rows.iter().map(|e| e.data.clone()).collect::<Vec<_>>();
    rows.sort_by(|a, b| a["id"].as_str().cmp(&b["id"].as_str()));
    rows
}
fn same_proof(expected: &Value, current: &Value) -> bool {
    let (Some(expected), Some(current)) = (expected.as_object(), current.as_object()) else {
        return expected == current;
    };
    expected.len() == current.len()
        && expected.iter().all(|(key, before)| {
            let Some(after) = current.get(key) else {
                return false;
            };
            if before == after {
                return true;
            }
            if key.ends_with("_at") {
                match (
                    before
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok()),
                    after
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok()),
                ) {
                    (Some(a), Some(b)) => a == b,
                    _ => false,
                }
            } else {
                false
            }
        })
}
fn session_allowed(current: &Value, rule: SessionRule, now: DateTime<Utc>) -> bool {
    let status = current["status"].as_str().unwrap_or("");
    let expires = current["expires_at"]
        .as_str()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok());
    match rule {
        SessionRule::Receive => {
            ["pending", "uploading"].contains(&status) && expires.is_some_and(|t| t > now)
        }
        SessionRule::Complete => {
            ["pending", "uploading", "uploaded", "validating"].contains(&status)
                && expires.is_some_and(|t| t > now)
        }
        SessionRule::Abort => ["pending", "uploading", "uploaded", "validating"].contains(&status),
    }
}
fn early_release(entity: &Entity) -> bool {
    entity.table == Table::Attachment
        && entity.original.as_ref().is_some_and(|before| {
            ["is_latest", "is_final"]
                .iter()
                .any(|key| before[*key] == true && entity.data[*key] == false)
                || (before["status"] == "active" && entity.data["status"] != "active")
        })
}
pub(super) fn next_version(maximum: i64) -> Result<i64, StorageFailure> {
    maximum
        .checked_add(1)
        .filter(|n| *n > 0 && i32::try_from(*n).is_ok())
        .ok_or_else(|| {
            StorageFailure::http(
                axum::http::StatusCode::CONFLICT,
                "Attachment version number exhausted",
            )
        })
}
pub(super) fn history_max(rows: &[Entity]) -> i64 {
    rows.iter()
        .map(|e| e.integer("version_no"))
        .max()
        .unwrap_or(0)
}
fn failure_disposition(phase: u8) -> CommitDisposition {
    if matches!(phase, 0 | 2) {
        CommitDisposition::KnownNotCommitted
    } else {
        CommitDisposition::Unknown
    }
}

#[cfg(test)]
mod k56_guard_tests {
    use super::*;
    #[test]
    fn k86_source_only_noop_requires_guarded_transaction() {
        let mut guard = FlushGuard::default();
        assert!(!guard.has_intent());
        let clean = Entity::loaded(Table::Attachment, json!({"id":"head","row_version":7}));
        assert!(clean.dirty().is_empty());
        guard.source_entities.push(clean);
        assert!(
            guard.has_intent(),
            "no dirty/audit/pending must not erase explicit source intent"
        );
    }
    #[test]
    fn k86_clean_inactive_nonversioned_tuple_cannot_be_rebased() {
        let old = Entity::loaded(
            Table::Link,
            json!({"id":"same-link","attachment_id":"head","target_id":"target-a","status":"unlinked"}),
        );
        let mut current = old.clone();
        current.refresh(Entity::loaded(Table::Link,json!({"id":"same-link","attachment_id":"head","target_id":"target-b","status":"unlinked"})));
        assert!(current.dirty().is_empty());
        assert_eq!(current.version(), old.version());
        let guard = FlushGuard {
            source_entities: vec![old],
            ..Default::default()
        };
        let first = first_source(&guard, &current);
        assert!(
            !same_proof(
                first.original.as_ref().unwrap_or(&Value::Null),
                &current.data
            ),
            "Link has no rowVersion CAS; compare its first tuple even when clean"
        );
    }
    #[test]
    fn k86_every_explicit_guard_field_forces_recheck() {
        let mut empty_set = FlushGuard::default();
        empty_set.active_links.insert("head".into(), vec![]);
        let mut session = FlushGuard::default();
        session
            .session_rules
            .insert("session".into(), SessionRule::Receive);
        let mut history = FlushGuard::default();
        history.version_max.insert("group".into(), 2);
        let route = FlushGuard {
            routing: vec![json!({"configId":null})],
            ..Default::default()
        };
        for guard in [empty_set, session, history, route] {
            assert!(guard.has_intent());
        }
    }
    #[test]
    fn k86_first_link_proof_is_scoped_by_table_and_id() {
        let attachment = Entity::loaded(Table::Attachment, json!({"id":"same","row_version":2}));
        let link = Entity::loaded(Table::Link, json!({"id":"same","status":"unlinked"}));
        let guard = FlushGuard {
            source_entities: vec![attachment, link.clone()],
            ..Default::default()
        };
        assert_eq!(first_source(&guard, &link).table, Table::Link);
        assert_eq!(first_source(&guard, &link).data["status"], "unlinked");
    }
    fn attachment(id: &str, version: i64, status: &str, latest: bool, final_flag: bool) -> Entity {
        Entity::loaded(
            Table::Attachment,
            json!({"id":id,"version_group_id":"group","version_no":version,"status":status,"is_latest":latest,"is_final":final_flag,"row_version":4}),
        )
    }
    #[test]
    fn nonfinal_append_releases_latest_without_releasing_old_final() {
        let mut old = attachment("old", 1, "active", true, true);
        assert!(!early_release(&old));
        old.set("is_latest", json!(false));
        assert!(early_release(&old));
        assert!(old.boolean("is_final"));
        assert_eq!(old.str("status"), "active");
        let new = Entity::new(
            Table::Attachment,
            json!({"id":"new","is_latest":true,"is_final":false}),
        );
        assert!(
            !early_release(&new),
            "new rows are inserted, not early-updated"
        );
    }
    #[test]
    fn explicit_final_transfer_and_void_release_old_unique_slots() {
        let mut old = attachment("old", 1, "active", false, true);
        old.set("is_final", json!(false));
        let mut new = attachment("new", 2, "active", true, false);
        new.set("is_final", json!(true));
        assert!(early_release(&old));
        assert!(!early_release(&new));
        new.set("status", json!("voided"));
        new.set("is_latest", json!(false));
        assert!(early_release(&new));
    }
    #[test]
    fn voided_history_is_not_reused_as_a_new_version() {
        let rows = vec![
            attachment("one", 1, "active", true, false),
            attachment("two", 2, "voided", false, false),
        ];
        assert_eq!(next_version(history_max(&rows)).ok(), Some(3));
        assert_eq!(next_version(0).ok(), Some(1));
        assert!(next_version(i64::from(i32::MAX)).is_err());
        assert!(next_version(i64::MAX).is_err());
    }
    #[test]
    fn canonical_group_handles_historical_null_without_a_separate_lock_key() {
        assert_eq!(
            canonical_group(&json!({"id":"first","version_group_id":null})),
            "first"
        );
        assert_eq!(
            canonical_group(&json!({"id":"second","version_group_id":"first"})),
            "first"
        );
    }
    #[test]
    fn complete_and_receive_recheck_terminal_state_and_expiry() {
        let now = DateTime::parse_from_rfc3339("2026-11-04T03:00:00Z")
            .unwrap_or_else(|_| panic!("date"))
            .with_timezone(&Utc);
        for status in ["pending", "uploading", "uploaded", "validating"] {
            let row = json!({"status":status,"expires_at":"2026-11-04T03:00:01Z"});
            assert!(session_allowed(&row, SessionRule::Complete, now));
            assert_eq!(
                session_allowed(&row, SessionRule::Receive, now),
                ["pending", "uploading"].contains(&status)
            );
        }
        for status in ["completed", "failed", "expired", "aborted"] {
            let row = json!({"status":status,"expires_at":"2026-11-04T04:00:00Z"});
            assert!(!session_allowed(&row, SessionRule::Complete, now));
            assert!(!session_allowed(&row, SessionRule::Receive, now));
            assert!(!session_allowed(&row, SessionRule::Abort, now));
        }
        assert!(!session_allowed(
            &json!({"status":"validating","expires_at":"2026-11-04T03:00:00Z"}),
            SessionRule::Complete,
            now
        ));
        assert!(!session_allowed(
            &json!({"status":"validating","expires_at":"2026-11-04T02:38:00Z"}),
            SessionRule::Complete,
            now
        ));
    }
    #[test]
    fn proof_compares_actual_fields_but_equal_timestamp_offsets_are_equal() {
        let old = json!({"id":"link","target_id":"targetA","status":"active","linked_at":"2026-11-04T00:00:00.000Z"});
        let mut current = old.clone();
        current["linked_at"] = json!("2026-11-04T09:00:00+09:00");
        assert!(same_proof(&old, &current));
        for (key, value) in [
            ("target_id", json!("targetB")),
            ("status", json!("unlinked")),
            ("id", json!("other-link")),
            ("linked_at", json!("2026-11-04T00:00:00.001Z")),
        ] {
            let mut changed = current.clone();
            changed[key] = value;
            assert!(!same_proof(&old, &changed), "changed {key}");
        }
    }
    #[test]
    fn link_proof_is_full_identity_set_independent_of_query_order() {
        let a = Entity::loaded(
            Table::Link,
            json!({"id":"a","attachment_id":"same","target_id":"one","status":"active"}),
        );
        let b = Entity::loaded(
            Table::Link,
            json!({"id":"b","attachment_id":"same","target_id":"two","status":"active"}),
        );
        assert_eq!(
            link_proof(&[a.clone(), b.clone()]),
            link_proof(&[b.clone(), a.clone()])
        );
        assert_ne!(link_proof(&[a.clone()]), link_proof(&[a.clone(), b]));
        let mut changed = a.clone();
        changed.set("target_id", json!("different"));
        assert_ne!(link_proof(&[a]), link_proof(&[changed]));
    }
    #[test]
    fn unknown_commit_or_timeout_is_never_a_cleanup_authority() {
        assert_eq!(failure_disposition(0), CommitDisposition::KnownNotCommitted);
        assert_eq!(failure_disposition(2), CommitDisposition::KnownNotCommitted);
        for phase in [1, 3, 4, 255] {
            assert_eq!(failure_disposition(phase), CommitDisposition::Unknown);
        }
    }
    #[test]
    fn routing_uses_component_boundary_and_normalized_prefix() {
        assert!(route_matches("prefix/completed/object", Some("prefix")));
        assert!(route_matches("prefix\\completed\\object", Some("/prefix/")));
        assert!(!route_matches(
            "prefix-other/completed/object",
            Some("prefix")
        ));
    }
}
fn normalized_key(value: &str) -> String {
    value.replace('\\', "/").trim_matches('/').into()
}
fn route_matches(key: &str, prefix: Option<&str>) -> bool {
    let prefix = prefix.map(normalized_key).unwrap_or_default();
    let key = normalized_key(key);
    prefix.is_empty() || key == prefix || key.starts_with(&format!("{prefix}/"))
}
async fn verify_routing(connection: &mut PgConnection, proof: &Value) -> Result<(), sqlx::Error> {
    let provider = proof["provider"].as_str().ok_or_else(changed_source)?;
    let bucket = proof["bucket"].as_str();
    let key = proof["key"].as_str().ok_or_else(changed_source)?;
    let mut rows = sqlx::query("SELECT id::text AS id,row_version,key_prefix FROM poms.attachment_storage_provider_config WHERE provider_type=$1 AND bucket IS NOT DISTINCT FROM $2::text ORDER BY created_at DESC")
        .bind(provider).bind(bucket).fetch_all(connection).await?;
    rows.retain(|r| {
        route_matches(
            key,
            r.try_get::<Option<String>, _>("key_prefix")
                .ok()
                .flatten()
                .as_deref(),
        )
    });
    rows.sort_by_key(|r| {
        std::cmp::Reverse(
            r.try_get::<Option<String>, _>("key_prefix")
                .ok()
                .flatten()
                .map_or(0, |s| s.encode_utf16().count()),
        )
    });
    match rows.first() {
        Some(row)
            if proof["configId"] == row.try_get::<String, _>("id")?
                && proof["configVersion"] == row.try_get::<i32, _>("row_version")? =>
        {
            Ok(())
        }
        None if provider == "local" && bucket.is_none() && proof["configId"].is_null() => Ok(()),
        _ => Err(changed_source()),
    }
}
async fn published_location(
    connection: &mut PgConnection,
    provider: &str,
    bucket: Option<&str>,
    key: &str,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.attachment WHERE storage_provider=$1 AND storage_bucket IS NOT DISTINCT FROM $2::text AND storage_key=$3)")
        .bind(provider).bind(bucket).bind(key).fetch_one(connection).await
}
pub(super) async fn has_published_staging(
    database: &Database,
    session: &Entity,
) -> Result<bool, StorageFailure> {
    let session = session.clone();
    run(database, move |c| {
        Box::pin(async move {
            published_location(
                c,
                session.str("provider_type"),
                session.data["storage_bucket"].as_str(),
                session.str("storage_key"),
            )
            .await
        })
    })
    .await
}
pub(super) async fn final_unreferenced(
    database: &Database,
    id: &str,
    location: &crate::attachment_storage::ObjectLocation,
) -> Result<bool, StorageFailure> {
    let id = id.to_owned();
    let location = location.clone();
    run(database,move|c|Box::pin(async move {
        sqlx::query_scalar("SELECT NOT (EXISTS(SELECT 1 FROM poms.attachment WHERE id=$1::text::uuid OR (storage_provider=$2 AND storage_bucket IS NOT DISTINCT FROM $3::text AND storage_key=$4)) OR EXISTS(SELECT 1 FROM poms.attachment_upload_session WHERE completed_attachment_id=$1::text::uuid OR (provider_type=$2 AND storage_bucket IS NOT DISTINCT FROM $3::text AND storage_key=$4)) OR EXISTS(SELECT 1 FROM poms.attachment_download_package WHERE storage_provider=$2 AND storage_bucket IS NOT DISTINCT FROM $3::text AND storage_key=$4))")
            .bind(id).bind(location.storage_provider).bind(location.storage_bucket).bind(location.storage_key).fetch_one(c).await
    })).await
}
pub(super) async fn aborted_staging_unreferenced(
    database: &Database,
    session: &Entity,
) -> Result<bool, StorageFailure> {
    let session = session.clone();
    run(database,move|c|Box::pin(async move {
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.attachment_upload_session WHERE id=$1::text::uuid AND row_version=$2 AND status='aborted' AND completed_attachment_id IS NULL AND provider_type=$3 AND storage_bucket IS NOT DISTINCT FROM $4::text AND storage_key=$5) AND NOT (EXISTS(SELECT 1 FROM poms.attachment WHERE storage_provider=$3 AND storage_bucket IS NOT DISTINCT FROM $4::text AND storage_key=$5) OR EXISTS(SELECT 1 FROM poms.attachment_upload_session WHERE id<>$1::text::uuid AND provider_type=$3 AND storage_bucket IS NOT DISTINCT FROM $4::text AND storage_key=$5) OR EXISTS(SELECT 1 FROM poms.attachment_download_package WHERE storage_provider=$3 AND storage_bucket IS NOT DISTINCT FROM $4::text AND storage_key=$5))")
            .bind(session.id()).bind(session.version()).bind(session.str("provider_type")).bind(session.data["storage_bucket"].as_str()).bind(session.str("storage_key")).fetch_one(c).await
    })).await
}
async fn lock_and_recheck(
    connection: &mut PgConnection,
    entities: &[Entity],
    guard: &FlushGuard,
) -> Result<(), sqlx::Error> {
    let mut sessions = entities
        .iter()
        .filter(|e| e.table == Table::Session && e.original.is_some())
        .collect::<Vec<_>>();
    sessions.sort_by_key(|e| e.id());
    for entity in sessions {
        let current:Value=sqlx::query_scalar("SELECT to_jsonb(s) FROM poms.attachment_upload_session s WHERE id=$1::text::uuid FOR UPDATE").bind(entity.id()).fetch_optional(&mut *connection).await?.ok_or_else(changed_source)?;
        let first = first_source(guard, entity);
        if first
            .original
            .as_ref()
            .is_none_or(|before| !same_proof(before, &current))
        {
            return Err(changed_source());
        }
        let inferred = if entity.dirty().is_empty() {
            None
        } else {
            match entity.str("status") {
                "completed" => Some(SessionRule::Complete),
                "aborted" => Some(SessionRule::Abort),
                "uploaded" | "uploading" => Some(SessionRule::Receive),
                _ => None,
            }
        };
        if let Some(rule) = guard.session_rules.get(&entity.id()).copied().or(inferred)
            && (!session_allowed(&current, rule, clock_now())
                || published_location(
                    connection,
                    entity.str("provider_type"),
                    entity.data["storage_bucket"].as_str(),
                    entity.str("storage_key"),
                )
                .await?)
        {
            return Err(changed_source());
        }
    }
    let mut ids = BTreeSet::new();
    let mut groups = BTreeSet::new();
    for entity in entities {
        match entity.table {
            Table::Attachment => {
                if entity.original.is_some() {
                    ids.insert(entity.id());
                }
                groups.insert(canonical_group(&entity.data));
            }
            Table::Link => {
                ids.insert(entity.str("attachment_id").to_owned());
            }
            Table::Session => {
                if let Some(id) = entity.text("base_attachment_id") {
                    ids.insert(id);
                }
            }
            _ => {}
        }
    }
    ids.extend(guard.active_links.keys().cloned());
    let discovered=sqlx::query("SELECT id::text AS id,COALESCE(version_group_id,id)::text AS group_id FROM poms.attachment WHERE id=ANY($1::text[]::uuid[])")
        .bind(ids.iter().cloned().collect::<Vec<_>>()).fetch_all(&mut *connection).await?;
    let mut discovered_groups = BTreeMap::new();
    for row in discovered {
        let id: String = row.try_get("id")?;
        let group: String = row.try_get("group_id")?;
        groups.insert(group.clone());
        discovered_groups.insert(id, group);
    }
    for id in &ids {
        if !discovered_groups.contains_key(id)
            && !entities
                .iter()
                .any(|e| e.table == Table::Attachment && e.original.is_none() && e.id() == *id)
        {
            return Err(changed_source());
        }
    }
    for group in &groups {
        sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
            .bind(format!("poms:attachment-group:{group}"))
            .execute(&mut *connection)
            .await?;
    }
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.attachment a WHERE COALESCE(version_group_id,id)=ANY($1::text[]::uuid[]) ORDER BY id FOR UPDATE")
        .bind(groups.iter().cloned().collect::<Vec<_>>()).fetch_all(&mut *connection).await?;
    for (id, group) in &discovered_groups {
        if rows
            .iter()
            .find(|row| row["id"] == *id)
            .is_none_or(|row| canonical_group(row) != *group)
        {
            return Err(changed_source());
        }
    }
    for entity in entities
        .iter()
        .filter(|e| e.table == Table::Attachment && e.original.is_some())
    {
        let current = rows
            .iter()
            .find(|r| r["id"] == entity.data["id"])
            .ok_or_else(changed_source)?;
        let first = first_source(guard, entity);
        if first
            .original
            .as_ref()
            .is_none_or(|before| !same_proof(before, current))
        {
            return Err(changed_source());
        }
    }
    for (group, maximum) in &guard.version_max {
        let actual = rows
            .iter()
            .filter(|r| canonical_group(r) == *group)
            .filter_map(|r| r["version_no"].as_i64())
            .max()
            .unwrap_or(0);
        if actual != *maximum {
            return Err(changed_source());
        }
    }
    for (id, expected) in &guard.active_links {
        let current:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(l) FROM poms.attachment_link l WHERE attachment_id=$1::text::uuid AND status='active' ORDER BY id FOR UPDATE")
            .bind(id).fetch_all(&mut *connection).await?;
        if current.len() != expected.len()
            || !current.iter().zip(expected).all(|(a, b)| same_proof(a, b))
        {
            return Err(changed_source());
        }
    }
    let mut new_links = BTreeSet::new();
    let mut links = entities
        .iter()
        .filter(|e| e.table == Table::Link)
        .collect::<Vec<_>>();
    links.sort_by_key(|e| e.id());
    for entity in links {
        if let Some(original) = &first_source(guard, entity).original {
            let current: Option<Value> = sqlx::query_scalar(
                "SELECT to_jsonb(l) FROM poms.attachment_link l WHERE id=$1::text::uuid FOR UPDATE",
            )
            .bind(entity.id())
            .fetch_optional(&mut *connection)
            .await?;
            if current
                .as_ref()
                .is_none_or(|row| !same_proof(original, row))
            {
                return Err(changed_source());
            }
        } else {
            let key = (
                entity.str("attachment_id"),
                entity.str("target_type"),
                entity.str("target_id"),
                entity.str("relation_type"),
            );
            if !new_links.insert(key) {
                return Err(changed_source());
            }
            let exists:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.attachment_link WHERE attachment_id=$1::text::uuid AND target_type=$2 AND target_id=$3::text::uuid AND relation_type=$4 AND status='active')")
                .bind(key.0).bind(key.1).bind(key.2).bind(key.3).fetch_one(&mut *connection).await?;
            if exists {
                return Err(changed_source());
            }
        }
    }
    for proof in &guard.routing {
        verify_routing(connection, proof).await?;
    }
    Ok(())
}
/// Child K writers use this same lock protocol. A failed child flush cannot replay
/// its dirty identity map; the service's guarded entry additionally restores its
/// complete pre-mutation checkpoint on a known rollback.
pub async fn flush(
    database: &Database,
    entities: &mut [Entity],
    pending: &mut Option<SessionFlush>,
    audit: Option<AuditWrite>,
) -> Result<(), StorageFailure> {
    flush_guarded(database, entities, pending, audit, FlushGuard::default())
        .await
        .map_err(|failure| failure.error)
}
pub(super) async fn flush_guarded(
    database: &Database,
    entities: &mut [Entity],
    pending: &mut Option<SessionFlush>,
    audit: Option<AuditWrite>,
    guard: FlushGuard,
) -> Result<(), FlushFailure> {
    if entities.iter().any(|e| e.poisoned) {
        return Err(FlushFailure {
            error: StorageFailure::internal(),
            disposition: CommitDisposition::Unknown,
        });
    }
    let changes = entities
        .iter()
        .enumerate()
        .filter(|(_, e)| e.original.is_none() || !e.dirty().is_empty())
        .map(|(i, e)| (i, e.clone()))
        .collect::<Vec<_>>();
    if changes.is_empty() && pending.is_none() && audit.is_none() && !guard.has_intent() {
        return Ok(());
    }
    let phase = Arc::new(AtomicU8::new(0));
    let journal = phase.clone();
    let proof_entities = entities.to_vec();
    let managed = pending.clone();
    let result = database.with_connection(move |connection| Box::pin(async move {
        // Set before BEGIN: cancellation at any point after entry is conservative.
        journal.store(1, Ordering::SeqCst);
        let mut transaction = connection.begin().await?;
        let operation: Result<Vec<(usize,Entity)>,sqlx::Error> = async {
            lock_and_recheck(&mut transaction, &proof_entities, &guard).await?;
            let mut saved = Vec::new();
            let mut consumed = BTreeSet::new();
            for (index,entity) in changes.iter().filter(|(_,e)|early_release(e)) {
                saved.push((*index,update(&mut transaction,entity).await?));
                consumed.insert(*index);
            }
            for group in create_groups(&changes) {
                let rows=group.iter().map(|(_,e)|e.clone()).collect::<Vec<_>>();
                let inserted=insert_group(&mut transaction,&rows).await?;
                saved.extend(group.into_iter().zip(inserted).map(|((index,_),e)|(index,e)));
            }
            let mut other_tables=Vec::new();
            for (index,entity) in changes.iter().filter(|(i,e)|e.original.is_some()&&!consumed.contains(i)) {
                if matches!(entity.table,Table::Attachment|Table::Session|Table::Link) {
                    saved.push((*index,update(&mut transaction,entity).await?));
                } else if !other_tables.contains(&entity.table) {
                    other_tables.push(entity.table);
                }
            }
            for table in other_tables {
                let existing=changes.iter().filter(|(_,e)|e.original.is_some()&&e.table==table).collect::<Vec<_>>();
                let updated=update_many(&mut transaction,&existing.iter().map(|(_,e)|e.clone()).collect::<Vec<_>>()).await?;
                saved.extend(existing.into_iter().zip(updated).map(|((index,_),e)|(*index,e)));
            }
            if let Some(audit)=audit {
                sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,metadata,occurred_at) VALUES($1,'attachment',$2,$3,$4,$5,$6::text::jsonb,$7)")
                    .bind(audit.event).bind(audit.target).bind(audit.operator).bind(audit.request_id).bind(audit.result).bind(audit.metadata.0).bind(clock_now()).execute(&mut *transaction).await?;
            }
            if let Some(managed)=managed.as_ref(){crate::auth::store::flush_managed_session(&mut transaction,managed).await?;}
            Ok(saved)
        }.await;
        match operation {
            Ok(saved)=>{
                journal.store(3,Ordering::SeqCst);
                transaction.commit().await?;
                journal.store(4,Ordering::SeqCst);
                Ok(Ok(saved))
            },
            Err(error)=>{
                transaction.rollback().await?;
                journal.store(2,Ordering::SeqCst);
                Ok(Err(sql_failure(error)))
            }
        }
    })).await;
    let result = match result {
        Ok(result) => result,
        Err(_) => Err(StorageFailure::internal()),
    };
    match result {
        Ok(saved) => {
            for (i, mut entity) in saved {
                entity.mark_committed();
                entities[i] = entity;
            }
            *pending = None;
            Ok(())
        }
        Err(error) => {
            // Poison also on known rollback for legacy child callers; a guarded
            // service checkpoint restore removes this only when rollback is proven.
            for entity in entities {
                entity.poisoned = true;
            }
            let disposition = failure_disposition(phase.load(Ordering::SeqCst));
            Err(FlushFailure { error, disposition })
        }
    }
}

#[cfg(test)]
mod k_native_create_tests {
    use super::*;

    fn plan(tables: &[Table]) -> Value {
        let changes = tables
            .iter()
            .enumerate()
            .map(|(index, table)| {
                (
                    index,
                    Entity::new(*table, json!({"id":format!("pure-{index}")})),
                )
            })
            .collect::<Vec<_>>();
        Value::Array(
            create_groups(&changes)
                .into_iter()
                .map(|group| json!({"table":group[0].1.table.name(),"rows":group.len()}))
                .collect(),
        )
    }
    fn observed(raw: &Value, case: usize, transaction: usize) -> Value {
        Value::Array(
            raw["cases"][case]["transactions"][transaction]["creates"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|value| json!({"table":value["table"],"rows":value["rows"]}))
                .collect(),
        )
    }
    #[test]
    fn class_create_groups_match_actual_native_alpha04_transactions() {
        let native: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2k/k-native-insert-groups.json"
        ))
        .unwrap_or_else(|_| panic!("Native K INSERT observation"));
        assert_eq!(
            native["source"]["sha256"],
            "0315402dce510dce6fd243f8a8fba29da9a69fa91b4c0622b200d5331b75cd26"
        );
        assert_eq!(
            plan(&[
                Table::HandoverSelection,
                Table::Link,
                Table::HandoverSelection
            ]),
            observed(&native, 0, 0)
        );
        assert_eq!(plan(&[Table::Link]), observed(&native, 0, 1));
        let package = plan(&[
            Table::DownloadPackage,
            Table::DownloadPackageItem,
            Table::DownloadPackageItem,
        ]);
        assert_eq!(package, observed(&native, 1, 0));
        assert_eq!(package, observed(&native, 2, 0));
    }
    #[test]
    fn existing_j_schedule_is_unchanged_and_k_fk_order_is_real_metadata_order() {
        assert_eq!(
            plan(&[Table::Attachment, Table::Link]),
            json!([{"table":"attachment","rows":1},{"table":"attachment_link","rows":1}])
        );
        assert_eq!(
            plan(&[Table::DownloadPackageItem, Table::DownloadPackage]),
            json!([{"table":"attachment_download_package","rows":1},{"table":"attachment_download_package_item","rows":1}])
        );
    }
    fn json_entity(raw: &str) -> Entity {
        let mut entity = Entity::loaded(
            Table::HandoverSelection,
            json!({"id":"a0000000-0000-4000-8000-000000000001","row_version":2}),
        );
        entity
            .set_json("source_refs", Wire(raw.into()))
            .unwrap_or_else(|_| panic!("original JSON input"));
        entity.mark_committed();
        entity
    }
    #[test]
    fn k_json_dirty_matches_real_sdk_and_actual_gamma03_order_only_update() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2k/k-json-dirty-golden.json"
        ))
        .unwrap_or_else(|_| panic!("actual ordered JSON source"));
        assert_eq!(golden["actual"]["nativeVersions"], json!([2, 3]));
        assert_eq!(golden["actual"]["rustVersions"], json!([2, 2]));
        for case in golden["cases"].as_array().into_iter().flatten() {
            let mut entity = json_entity(case["beforeRaw"].as_str().unwrap_or(""));
            entity
                .set_json(
                    "source_refs",
                    Wire(case["afterRaw"].as_str().unwrap_or("").into()),
                )
                .unwrap_or_else(|_| panic!("original assigned JSON"));
            assert_eq!(
                entity.dirty().iter().any(|key| key == "source_refs"),
                case["expectedDirty"] == true,
                "{}",
                case["name"]
            );
        }
    }
    #[test]
    fn committed_managed_order_and_clean_hydration_maintain_distinct_baselines() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2k/k-json-dirty-golden.json"
        ))
        .unwrap_or_else(|_| panic!("actual ordered JSON source"));
        let case = &golden["cases"][0];
        let pg = case["beforeRaw"].as_str().unwrap_or("");
        let assigned = case["afterRaw"].as_str().unwrap_or("");
        let mut entity = json_entity(pg);
        entity
            .set_json("source_refs", Wire(assigned.into()))
            .unwrap_or_else(|_| panic!("assigned JSON"));
        assert!(entity.dirty().contains(&"source_refs".into()));
        // A query cannot erase a still-dirty explicit JSON assignment.
        entity.refresh(json_entity(pg));
        assert_eq!(entity.json_raw["source_refs"], assigned);
        assert_eq!(entity.original_json_raw["source_refs"], pg);
        entity.mark_committed();
        assert!(
            entity.dirty().is_empty(),
            "Later audit flush must not replay just-saved JSON"
        );
        // A clean identity re-read does refresh both current and comparison data.
        entity.refresh(json_entity(pg));
        assert_eq!(entity.json_raw["source_refs"], pg);
        assert_eq!(entity.original_json_raw["source_refs"], pg);
        assert!(entity.dirty().is_empty());
        entity
            .set_json("source_refs", Wire(assigned.into()))
            .unwrap_or_else(|_| panic!("assigned JSON"));
        assert!(entity.dirty().contains(&"source_refs".into()));
        // The same JSON value in a non-K class keeps the existing J comparison.
        let mut j = json_entity(pg);
        j.table = Table::Attachment;
        j.set_json("source_refs", Wire(assigned.into()))
            .unwrap_or_else(|_| panic!("comparison-only synthetic J field"));
        assert!(!j.dirty().contains(&"source_refs".into()));
    }
}
