//! Existing tables only. One `flush` is one caller-visible ORM flush candidate;
//! preview/apply phases and audit remain separate commits. Root owns the final
//! original-Nest SQL/PG witness for PK availability, ordering and dirty CAS.
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Value, json, value::RawValue};
use sqlx::{Connection, PgConnection, Postgres, QueryBuilder, Row};
use uuid::Uuid;

use super::{
    model::{Diff, Mapping, Org, ReviewContext, Run, Source},
    validation::node_value,
};
use crate::{
    auth::{
        model::{SessionFlush, clock_now},
        store::flush_managed_session,
    },
    database::{Database, DbError},
};

#[derive(Clone)]
pub struct Change<T> {
    pub before: Option<T>,
    pub after: T,
}
impl<T> Change<T> {
    pub fn new(after: T) -> Self {
        Self {
            before: None,
            after,
        }
    }
}
#[derive(Clone, Default)]
pub struct Changes {
    pub sources: Vec<Change<Source>>,
    pub mappings: Vec<Change<Mapping>>,
    pub runs: Vec<Change<Run>>,
    pub diffs: Vec<Change<Diff>>,
    pub orgs: Vec<Change<Org>>,
    pub delete_mapping_ids: Vec<Uuid>,
    pub early_delete_mapping_ids: Vec<Uuid>,
    pub raw_json_columns: Vec<RawJsonColumn>,
}
#[derive(Clone)]
pub struct RawJsonColumn {
    pub table: &'static str,
    pub index: usize,
    pub column: &'static str,
    pub raw: String,
}
fn protocol() -> sqlx::Error {
    sqlx::Error::Protocol("external organization persistence projection failed".into())
}
fn decode<T: DeserializeOwned>(raw: String) -> Result<T, sqlx::Error> {
    let raw: &RawValue = serde_json::from_str(&raw).map_err(|_| protocol())?;
    serde_json::from_value(node_value(raw).map_err(|_| protocol())?).map_err(|_| protocol())
}
fn document<T: DeserializeOwned>(row: sqlx::postgres::PgRow) -> Result<T, sqlx::Error> {
    decode(row.try_get("document")?)
}
async fn one<T: DeserializeOwned + Send + 'static>(
    database: &Database,
    table: &'static str,
    id: &str,
) -> Result<Option<T>, DbError> {
    let id = id.to_owned();
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut query = QueryBuilder::<Postgres>::new(format!(
                    "SELECT row_to_json(t)::text AS document FROM poms.{table} t WHERE id="
                ));
                query.push_bind(id).push("::text::uuid");
                query
                    .build()
                    .fetch_optional(connection)
                    .await?
                    .map(document)
                    .transpose()
            })
        })
        .await
}
pub async fn source(database: &Database, id: &str) -> Result<Option<Source>, DbError> {
    one(database, "external_org_source", id).await
}
pub async fn mapping(database: &Database, id: &str) -> Result<Option<Mapping>, DbError> {
    one(database, "external_department_mapping", id).await
}
pub async fn run(database: &Database, id: &str) -> Result<Option<Run>, DbError> {
    one(database, "org_sync_run", id).await
}
pub async fn org(database: &Database, id: &str) -> Result<Option<Org>, DbError> {
    one(database, "org_unit", id).await
}
pub async fn source_by_tenant(
    database: &Database,
    provider: &str,
    tenant: Option<&str>,
) -> Result<Option<Source>, DbError> {
    let provider = provider.to_owned();
    let tenant = tenant.map(str::to_owned);
    database.with_connection(move|connection|Box::pin(async move{sqlx::query("SELECT row_to_json(t)::text AS document FROM poms.external_org_source t WHERE provider=$1 AND external_tenant_id IS NOT DISTINCT FROM $2 LIMIT 1").bind(provider).bind(tenant).fetch_optional(connection).await?.map(document).transpose()})).await
}
pub async fn sources(database: &Database, query: Value) -> Result<Vec<Source>, DbError> {
    database.with_connection(move|connection|Box::pin(async move{let mut sql=QueryBuilder::<Postgres>::new("SELECT row_to_json(t)::text AS document FROM poms.external_org_source t WHERE true");filter(&mut sql,&query,"provider","provider",false);filter(&mut sql,&query,"status","status",false);sql.push(" ORDER BY created_at DESC");sql.build().fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
fn filter(sql: &mut QueryBuilder<Postgres>, query: &Value, key: &str, column: &str, uuid: bool) {
    if let Some(value) = query[key].as_str() {
        sql.push(" AND ")
            .push(column.to_owned())
            .push("=")
            .push_bind(value.to_owned());
        if uuid {
            sql.push("::text::uuid");
        }
    }
}
pub async fn mappings(
    database: &Database,
    source_id: &str,
    query: Value,
) -> Result<Vec<Mapping>, DbError> {
    let id = source_id.to_owned();
    database.with_connection(move|connection|Box::pin(async move{let mut sql=QueryBuilder::<Postgres>::new("SELECT row_to_json(t)::text AS document FROM poms.external_department_mapping t WHERE source_id=");sql.push_bind(id).push("::text::uuid");filter(&mut sql,&query,"status","status",false);filter(&mut sql,&query,"externalDepartmentId","external_department_id",false);filter(&mut sql,&query,"orgUnitId","org_unit_id",true);sql.push(" ORDER BY external_department_name ASC,created_at ASC");sql.build().fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
pub async fn mapped_org(
    database: &Database,
    source_id: Uuid,
    org_id: Uuid,
) -> Result<Option<Mapping>, DbError> {
    database.with_connection(move|connection|Box::pin(async move{sqlx::query("SELECT row_to_json(t)::text AS document FROM poms.external_department_mapping t WHERE source_id=$1 AND org_unit_id=$2 AND status='mapped' LIMIT 1").bind(source_id).bind(org_id).fetch_optional(connection).await?.map(document).transpose()})).await
}
pub async fn runs(database: &Database, source_id: &str, query: Value) -> Result<Vec<Run>, DbError> {
    let id = source_id.to_owned();
    database.with_connection(move|connection|Box::pin(async move{let mut sql=QueryBuilder::<Postgres>::new("SELECT row_to_json(t)::text AS document FROM poms.org_sync_run t WHERE source_id=");sql.push_bind(id).push("::text::uuid");filter(&mut sql,&query,"status","status",false);sql.push(" ORDER BY started_at DESC,created_at DESC LIMIT ").push_bind(query["limit"].as_i64().unwrap_or(20));sql.build().fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
pub async fn diffs(database: &Database, run_id: &str, query: Value) -> Result<Vec<Diff>, DbError> {
    let id = run_id.to_owned();
    database.with_connection(move|connection|Box::pin(async move{let mut sql=QueryBuilder::<Postgres>::new("SELECT row_to_json(t)::text AS document FROM poms.org_sync_diff_item t WHERE run_id=");sql.push_bind(id).push("::text::uuid");filter(&mut sql,&query,"action","action",false);filter(&mut sql,&query,"status","status",false);sql.push(" ORDER BY created_at ASC");sql.build().fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
pub async fn all_orgs(database: &Database) -> Result<Vec<Org>, DbError> {
    database.with_connection(|connection|Box::pin(async move{sqlx::query("SELECT row_to_json(t)::text AS document FROM poms.org_unit t ORDER BY display_order ASC,created_at ASC").fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
pub async fn orgs_by_ids(database: &Database, ids: Vec<String>) -> Result<Vec<Org>, DbError> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    database.with_connection(move|connection|Box::pin(async move{sqlx::query("SELECT row_to_json(t)::text AS document FROM poms.org_unit t WHERE id=ANY($1::text[]::uuid[])").bind(ids).fetch_all(connection).await?.into_iter().map(document).collect()})).await
}
pub async fn review_contexts(
    database: &Database,
    source_id: &str,
    external_ids: Vec<String>,
) -> Result<Vec<ReviewContext>, DbError> {
    if external_ids.is_empty() {
        return Ok(Vec::new());
    }
    let id = source_id.to_owned();
    database.with_connection(move|connection|Box::pin(async move{sqlx::query("SELECT row_to_json(r)::text AS run_document,row_to_json(i)::text AS item_document FROM poms.org_sync_diff_item i JOIN poms.org_sync_run r ON r.id=i.run_id WHERE r.id IN(SELECT id FROM poms.org_sync_run WHERE source_id=$1::text::uuid ORDER BY started_at DESC,created_at DESC LIMIT 20) AND i.external_department_id=ANY($2::text[]) AND i.action IN('conflict','disable_org_unit') ORDER BY r.started_at DESC,r.created_at DESC,i.created_at DESC").bind(id).bind(external_ids).fetch_all(connection).await?.into_iter().map(|row|Ok(ReviewContext{run:decode(row.try_get("run_document")?)?,item:decode(row.try_get("item_document")?)?})).collect()})).await
}

fn serialize<T: Serialize>(value: &T) -> Result<Value, sqlx::Error> {
    let raw = serde_json::value::to_raw_value(value).map_err(|_| protocol())?;
    node_value(&raw).map_err(|_| protocol())
}
fn columns(table: &str) -> &'static [&'static str] {
    match table {
        "external_org_source" => &[
            "provider",
            "external_tenant_id",
            "display_name",
            "status",
            "provider_config_id",
            "authoritative_org_unit_id",
            "external_root_department_id",
            "sync_scopes_json",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ],
        "external_department_mapping" => &[
            "source_id",
            "external_department_id",
            "external_parent_department_id",
            "external_department_name",
            "org_unit_id",
            "status",
            "external_snapshot_json",
            "last_seen_at",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ],
        "org_sync_run" => &[
            "source_id",
            "status",
            "requested_by",
            "started_at",
            "finished_at",
            "total_item_count",
            "approved_item_count",
            "skipped_item_count",
            "failed_item_count",
            "error_summary",
            "request_snapshot_json",
            "result_summary_json",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ],
        "org_sync_diff_item" => &[
            "run_id",
            "external_department_id",
            "action",
            "status",
            "org_unit_id",
            "before_snapshot_json",
            "candidate_snapshot_json",
            "error_message",
            "applied_at",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ],
        "org_unit" => &[
            "name",
            "code",
            "description",
            "parent_id",
            "is_active",
            "display_order",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        ],
        _ => &[],
    }
}
fn dirty(table: &str, before: &Value, after: &Value) -> Vec<&'static str> {
    columns(table)
        .iter()
        .copied()
        .filter(|key| {
            !matches!(*key, "created_at" | "updated_at") && before.get(*key) != after.get(*key)
        })
        .collect()
}
fn changed<T: Serialize>(table: &str, changes: &[Change<T>]) -> bool {
    changes
        .iter()
        .any(|change| match (&change.before, serialize(&change.after)) {
            (None, _) => true,
            (Some(before), Ok(after)) => {
                serialize(before).is_ok_and(|before| !dirty(table, &before, &after).is_empty())
            }
            _ => true,
        })
}
fn row_raw(table: &str, index: usize, value: &Value, overrides: &[RawJsonColumn]) -> String {
    let overrides = overrides
        .iter()
        .filter(|item| item.table == table && item.index == index)
        .map(|item| (item.column.to_owned(), item.raw.clone()))
        .collect::<Vec<_>>();
    super::validation::object_raw(value, &overrides)
}
fn push_record(sql: &mut QueryBuilder<Postgres>, table: &str, column: &str, value: &str) {
    sql.push(format!("(jsonb_populate_record(NULL::poms.{table},"))
        .push_bind(value.to_owned())
        .push(format!("::text::jsonb)).\"{column}\""));
}
async fn inserts<T: Serialize + DeserializeOwned>(
    connection: &mut PgConnection,
    table: &'static str,
    changes: &mut [Change<T>],
    raw_columns: &[RawJsonColumn],
) -> Result<(), sqlx::Error> {
    let mut indices = Vec::new();
    let mut values = Vec::new();
    for (index, change) in changes.iter().enumerate() {
        if change.before.is_none() {
            indices.push(index);
            values.push(serialize(&change.after)?);
        }
    }
    if values.is_empty() {
        return Ok(());
    }
    let columns = columns(table);
    let names = columns
        .iter()
        .map(|column| format!("\"{column}\""))
        .collect::<Vec<_>>()
        .join(",");
    let selected = columns
        .iter()
        .map(|column| format!("r.\"{column}\""))
        .collect::<Vec<_>>()
        .join(",");
    let mut sql = QueryBuilder::<Postgres>::new(format!(
        "INSERT INTO poms.{table} AS t ({names}) SELECT {selected} FROM jsonb_populate_recordset(NULL::poms.{table},"
    ));
    let raw_values = format!(
        "[{}]",
        indices
            .iter()
            .zip(&values)
            .map(|(index, value)| row_raw(table, *index, value, raw_columns))
            .collect::<Vec<_>>()
            .join(",")
    );
    sql.push_bind(raw_values)
        .push("::text::jsonb) AS r RETURNING id,row_version");
    let rows = sql.build().fetch_all(connection).await?;
    if rows.len() != indices.len() {
        return Err(protocol());
    }
    for ((index, mut value), row) in indices.into_iter().zip(values).zip(rows) {
        value["id"] = json!(row.try_get::<Uuid, _>("id")?);
        value["row_version"] = json!(row.try_get::<i32, _>("row_version")?);
        changes[index].after = serde_json::from_value(value).map_err(|_| protocol())?;
    }
    Ok(())
}
struct DirtyRow {
    index: usize,
    value: Value,
    keys: Vec<&'static str>,
    id: Uuid,
    version: i32,
    raw: String,
}
async fn updates<T: Serialize + DeserializeOwned>(
    connection: &mut PgConnection,
    table: &'static str,
    changes: &mut [Change<T>],
    raw_columns: &[RawJsonColumn],
) -> Result<(), sqlx::Error> {
    let mut rows = Vec::new();
    for (index, change) in changes.iter().enumerate() {
        if let Some(before) = change.before.as_ref() {
            let before = serialize(before)?;
            let mut value = serialize(&change.after)?;
            let keys = dirty(table, &before, &value);
            if keys.is_empty() {
                continue;
            }
            let id = before["id"]
                .as_str()
                .and_then(|value| value.parse().ok())
                .ok_or_else(protocol)?;
            let version = before["row_version"].as_i64().ok_or_else(protocol)? as i32;
            value["updated_at"] = json!(clock_now());
            let raw = row_raw(table, index, &value, raw_columns);
            rows.push(DirtyRow {
                index,
                value,
                keys,
                id,
                version,
                raw,
            });
        }
    }
    if rows.is_empty() {
        return Ok(());
    }
    if rows.len() > 1 {
        // Original batch optimistic check is separate and has no row lock.
        let mut check =
            QueryBuilder::<Postgres>::new(format!("SELECT id FROM poms.{table} WHERE "));
        for (index, row) in rows.iter().enumerate() {
            if index > 0 {
                check.push(" OR ");
            }
            check
                .push("(id=")
                .push_bind(row.id)
                .push(" AND row_version=")
                .push_bind(row.version)
                .push(")");
        }
        check.push(" ORDER BY id ASC");
        if check.build().fetch_all(&mut *connection).await?.len() != rows.len() {
            return Err(sqlx::Error::RowNotFound);
        }
    }
    let keys = columns(table)
        .iter()
        .copied()
        .filter(|column| {
            *column != "created_at"
                && (*column == "updated_at" || rows.iter().any(|row| row.keys.contains(column)))
        })
        .collect::<Vec<_>>();
    let mut sql = QueryBuilder::<Postgres>::new(format!("UPDATE poms.{table} AS t SET "));
    for (index, column) in keys.iter().enumerate() {
        if index > 0 {
            sql.push(",");
        }
        sql.push(format!("\"{column}\"="));
        if rows.len() == 1 {
            push_record(&mut sql, table, column, &rows[0].raw);
        } else {
            sql.push("CASE ");
            for row in &rows {
                if *column == "updated_at" || row.keys.contains(column) {
                    sql.push("WHEN t.id=").push_bind(row.id).push(" THEN ");
                    push_record(&mut sql, table, column, &row.raw);
                    sql.push(" ");
                }
            }
            sql.push(format!("ELSE t.\"{column}\" END"));
        }
    }
    sql.push(",row_version=t.row_version+1 WHERE ");
    if rows.len() == 1 {
        sql.push("t.id=")
            .push_bind(rows[0].id)
            .push(" AND t.row_version=")
            .push_bind(rows[0].version);
    } else {
        sql.push("t.id IN (");
        for (index, row) in rows.iter().enumerate() {
            if index > 0 {
                sql.push(",");
            }
            sql.push_bind(row.id);
        }
        sql.push(")");
    }
    sql.push(" RETURNING t.id,t.row_version");
    let returned = sql.build().fetch_all(connection).await?;
    if returned.len() != rows.len() {
        return Err(sqlx::Error::RowNotFound);
    }
    for mut row in rows {
        let result = returned
            .iter()
            .find(|value| value.try_get::<Uuid, _>("id").ok() == Some(row.id))
            .ok_or_else(protocol)?;
        row.value["row_version"] = json!(result.try_get::<i32, _>("row_version")?);
        changes[row.index].after = serde_json::from_value(row.value).map_err(|_| protocol())?;
    }
    Ok(())
}
async fn delete_mappings(connection: &mut PgConnection, ids: &[Uuid]) -> Result<(), sqlx::Error> {
    for chunk in ids.chunks(300) {
        sqlx::query("DELETE FROM poms.external_department_mapping WHERE id=ANY($1::uuid[])")
            .bind(chunk)
            .execute(&mut *connection)
            .await?;
    }
    Ok(())
}
pub async fn insert_audit_raw(
    connection: &mut PgConnection,
    input: &crate::auth::audit::AuditLogInput,
    after_raw: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.audit_log (event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9::text::jsonb,$10::text::jsonb,$11)")
        .bind(&input.event_type).bind(&input.target_type).bind(&input.target_id).bind(input.operator_id).bind(&input.request_id).bind(input.result.as_str()).bind(&input.reason).bind(input.before_snapshot.as_ref().map(Value::to_string)).bind(after_raw).bind(input.metadata.as_ref().map(Value::to_string)).bind(input.occurred_at.unwrap_or_else(clock_now)).execute(connection).await?;
    Ok(())
}
pub async fn flush(
    database: &Database,
    mut changes: Changes,
    pending: Option<&SessionFlush>,
) -> Result<Changes, DbError> {
    // A no-op persist([entity]) starts no empty transaction in the original EM.
    if pending.is_none()
        && changes.delete_mapping_ids.is_empty()
        && !changed("external_org_source", &changes.sources)
        && !changed("org_unit", &changes.orgs)
        && !changed("org_sync_run", &changes.runs)
        && !changed("org_sync_diff_item", &changes.diffs)
        && !changed("external_department_mapping", &changes.mappings)
    {
        return Ok(changes);
    }
    let pending = pending.cloned();
    let raw_columns = changes.raw_json_columns.clone();
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut transaction = connection.begin().await?;
                let result: Result<(), sqlx::Error> = async {
                    delete_mappings(&mut transaction, &changes.early_delete_mapping_ids).await?;
                    inserts(
                        &mut transaction,
                        "org_unit",
                        &mut changes.orgs,
                        &raw_columns,
                    )
                    .await?;
                    inserts(
                        &mut transaction,
                        "external_org_source",
                        &mut changes.sources,
                        &raw_columns,
                    )
                    .await?;
                    inserts(
                        &mut transaction,
                        "org_sync_run",
                        &mut changes.runs,
                        &raw_columns,
                    )
                    .await?;
                    inserts(
                        &mut transaction,
                        "org_sync_diff_item",
                        &mut changes.diffs,
                        &raw_columns,
                    )
                    .await?;
                    inserts(
                        &mut transaction,
                        "external_department_mapping",
                        &mut changes.mappings,
                        &raw_columns,
                    )
                    .await?;
                    if let Some(pending) = pending.as_ref() {
                        flush_managed_session(&mut transaction, pending).await?;
                    }
                    updates(
                        &mut transaction,
                        "org_unit",
                        &mut changes.orgs,
                        &raw_columns,
                    )
                    .await?;
                    updates(
                        &mut transaction,
                        "external_org_source",
                        &mut changes.sources,
                        &raw_columns,
                    )
                    .await?;
                    updates(
                        &mut transaction,
                        "org_sync_run",
                        &mut changes.runs,
                        &raw_columns,
                    )
                    .await?;
                    updates(
                        &mut transaction,
                        "org_sync_diff_item",
                        &mut changes.diffs,
                        &raw_columns,
                    )
                    .await?;
                    updates(
                        &mut transaction,
                        "external_department_mapping",
                        &mut changes.mappings,
                        &raw_columns,
                    )
                    .await?;
                    let late = changes
                        .delete_mapping_ids
                        .iter()
                        .filter(|id| !changes.early_delete_mapping_ids.contains(id))
                        .copied()
                        .collect::<Vec<_>>();
                    delete_mappings(&mut transaction, &late).await?;
                    Ok(())
                }
                .await;
                match result {
                    Ok(()) => {
                        transaction.commit().await?;
                        Ok(changes)
                    }
                    Err(error) => {
                        transaction.rollback().await?;
                        Err(error)
                    }
                }
            })
        })
        .await
}
