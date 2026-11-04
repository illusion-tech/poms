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
use std::collections::BTreeMap;

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
}
impl std::fmt::Debug for Entity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AttachmentEntity")
            .field("table", &self.table)
            .finish_non_exhaustive()
    }
}
impl Entity {
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
Self::VersionGroup=>"WHERE version_group_id=$1::text::uuid ORDER BY version_no DESC,uploaded_at DESC".into(),
Self::Latest=>"WHERE version_group_id=$1::text::uuid AND status='active' AND is_latest=true ORDER BY version_no DESC,uploaded_at DESC LIMIT 1".into(),
Self::LinksByTarget=>"WHERE target_type=$1 AND target_id=$2::text::uuid AND status='active' ORDER BY linked_at DESC".into(),
Self::ExistingLink=>"WHERE attachment_id=$1::text::uuid AND target_type=$2 AND target_id=$3::text::uuid AND relation_type=$4 AND status='active' LIMIT 1".into(),
Self::Final=>"WHERE version_group_id=$1::text::uuid AND status='active' AND is_final=true ORDER BY version_no DESC,uploaded_at DESC LIMIT 1".into(),
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
    if entity.table.versioned() {
        query.push(",row_version");
    }
    let row = query.build().fetch_one(connection).await?;
    let mut entity = entity.clone();
    let id: uuid::Uuid = row.try_get("id")?;
    entity.data["id"] = json!(id);
    if entity.table.versioned() {
        entity.data["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
    }
    Ok(entity)
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
        if table.versioned() {
            query.push(",row_version");
        }
        let returned = query.build().fetch_all(&mut *connection).await?;
        if returned.len() != chunk.len() {
            return Err(sqlx::Error::Protocol(
                "attachment CREATE returned row count".into(),
            ));
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
/// Changes of all loaded J entities participate, including upload-session dirty fields.
/// An audit call is its own later flush; pending auth is consumed exactly once.
pub async fn flush(
    database: &Database,
    entities: &mut [Entity],
    pending: &mut Option<SessionFlush>,
    audit: Option<AuditWrite>,
) -> Result<(), StorageFailure> {
    let changes = entities
        .iter()
        .enumerate()
        .filter(|(_, e)| e.original.is_none() || !e.dirty().is_empty())
        .map(|(i, e)| (i, e.clone()))
        .collect::<Vec<_>>();
    if changes.is_empty() && pending.is_none() && audit.is_none() {
        return Ok(());
    }
    let managed = pending.clone();
    let saved=run(database,move|connection|Box::pin(async move{
        let mut transaction=connection.begin().await?;let operation:Result<Vec<(usize,Entity)>,sqlx::Error>=async{
            let mut saved=Vec::new();let inserting=changes.iter().any(|(_,e)|e.original.is_none())||audit.is_some();
            // Native auth01 (619 -> 621): an update-only flush first writes
            // managed auth, then the upload session. CREATE flushes instead
            // finish every CREATE before that managed UPDATE (631 -> 633 -> 635
            // after the earlier validating flush consumed pending auth).
            if !inserting&&let Some(managed)=managed.as_ref(){crate::auth::store::flush_managed_session(&mut transaction,managed).await?;}
            // Native native01: CREATE precedes ordinary UPDATE. The partial
            // expression indexes do not mark is_latest/is_final as UPDATE_EARLY.
            // A version INSERT can therefore fail before the old latest or
            // session dirty fields are written. Do not repair that ordering.
            // Native K alpha04: refresh AUTO is Link(1) -> Selection(batch2);
            // Package(1) -> Items(batch2) occurs only after actual archive I/O.
            for group in create_groups(&changes) {
                let rows=group.iter().map(|(_,entity)|entity.clone()).collect::<Vec<_>>();
                let inserted=insert_group(&mut transaction,&rows).await?;
                saved.extend(group.into_iter().zip(inserted).map(|((index,_),entity)|(index,entity)));
            }
            if let Some(audit)=audit{sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,metadata,occurred_at) VALUES($1,'attachment',$2,$3,$4,$5,$6::text::jsonb,$7)").bind(audit.event).bind(audit.target).bind(audit.operator).bind(audit.request_id).bind(audit.result).bind(audit.metadata.0).bind(clock_now()).execute(&mut *transaction).await?;}
            if inserting&&let Some(managed)=managed.as_ref(){crate::auth::store::flush_managed_session(&mut transaction,managed).await?;}
            // Ordinary UPDATEs are grouped by entity class, not emitted as
            // stronger per-row CAS statements when a class has multiple rows.
            let mut tables=Vec::new();
            for(_,entity)in changes.iter().filter(|(_,e)|e.original.is_some()){
                if !tables.contains(&entity.table){tables.push(entity.table);}
            }
            for table in tables{
                let existing=changes.iter().filter(|(_,entity)|entity.original.is_some()&&entity.table==table).map(|(index,entity)|(*index,entity.clone())).collect::<Vec<_>>();
                let rows=existing.iter().map(|(_,entity)|entity).cloned().collect::<Vec<_>>();
                let updated=update_many(&mut transaction,&rows).await?;
                saved.extend(existing.into_iter().zip(updated).map(|((index,_),entity)|(index,entity)));
            }
            Ok(saved)
        }.await;match operation{Ok(value)=>{transaction.commit().await?;Ok(value)},Err(error)=>{transaction.rollback().await?;Err(error)}}
    })).await?;
    // Publish snapshots only after commit. On failure the same new entity IDs,
    // INSERT payloads and existing dirty state stay in the request identity map.
    // The complete catch flush retries CREATE and may fail again before it can
    // persist status=failed (native01 leaves the session validating at v3).
    for (i, mut e) in saved {
        e.mark_committed();
        entities[i] = e;
    }
    // Consume only after successful commit. Later dirty-session, success audit
    // and completed-status flushes must not replay the old authentication CAS.
    *pending = None;
    Ok(())
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
