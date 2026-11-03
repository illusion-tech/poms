use super::{StorageFailure, model::ConfigRow};
use crate::{
    auth::{
        audit::AuditLogInput,
        model::{SessionFlush, clock_now},
        store::flush_managed_session,
    },
    database::Database,
};
use serde_json::Value;
use sqlx::{Connection, PgConnection, Postgres, QueryBuilder, Row};

fn row(row: sqlx::postgres::PgRow) -> Result<ConfigRow, sqlx::Error> {
    serde_json::from_value(row.try_get::<Value, _>("data")?)
        .map_err(|e| sqlx::Error::Decode(Box::new(e)))
}
pub async fn select(
    database: &Database,
    provider: Option<String>,
    status: Option<String>,
    enabled: Option<bool>,
    bucket: Option<Option<String>>,
    id: Option<String>,
    only_default: bool,
) -> Result<Vec<ConfigRow>, StorageFailure> {
    Ok(database.with_connection(move |connection| Box::pin(async move {
        let mut query = QueryBuilder::<Postgres>::new("SELECT to_jsonb(c) AS data FROM poms.attachment_storage_provider_config c WHERE true");
        if let Some(value) = provider { query.push(" AND provider_type=").push_bind(value); }
        if let Some(value) = status { query.push(" AND status=").push_bind(value); }
        if let Some(value) = enabled { query.push(" AND enabled=").push_bind(value); }
        if let Some(value) = bucket { query.push(" AND bucket IS NOT DISTINCT FROM ").push_bind(value); }
        if let Some(value) = id { query.push(" AND id=").push_bind(value).push("::text::uuid"); }
        if only_default { query.push(" AND enabled=true AND is_default=true"); }
        query.push(" ORDER BY created_at DESC");
        query.build().fetch_all(connection).await?.into_iter().map(row).collect()
    })).await?)
}
async fn insert(
    connection: &mut PgConnection,
    v: &ConfigRow,
) -> Result<(String, i32), sqlx::Error> {
    let row=sqlx::query("INSERT INTO poms.attachment_storage_provider_config(provider_type,display_name,status,enabled,is_default,endpoint,region,bucket,key_prefix,force_path_style,encrypted_access_key_id,encrypted_secret_access_key,credentials_updated_at,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id,row_version")
        .bind(&v.provider_type).bind(&v.display_name).bind(&v.status).bind(v.enabled).bind(v.is_default)
        .bind(&v.endpoint).bind(&v.region).bind(&v.bucket).bind(&v.key_prefix).bind(v.force_path_style)
        .bind(&v.encrypted_access_key_id).bind(&v.encrypted_secret_access_key).bind(v.credentials_updated_at)
        .bind(v.created_at).bind(v.created_by).bind(v.updated_at).bind(v.updated_by).fetch_one(connection).await?;
    Ok((
        row.try_get::<uuid::Uuid, _>("id")?.to_string(),
        row.try_get("row_version")?,
    ))
}
async fn update(
    connection: &mut PgConnection,
    before: &ConfigRow,
    after: &ConfigRow,
) -> Result<i32, sqlx::Error> {
    let mut q =
        QueryBuilder::<Postgres>::new("UPDATE poms.attachment_storage_provider_config SET ");
    {
        let mut fields = q.separated(",");
        macro_rules! field {
            ($field:ident,$name:literal) => {
                if before.$field != after.$field || after.raw_text.contains_key($name) {
                    fields
                        .push(concat!($name, "="))
                        .push_bind_unseparated(&after.$field);
                }
            };
        }
        field!(display_name, "display_name");
        field!(status, "status");
        field!(enabled, "enabled");
        field!(is_default, "is_default");
        field!(endpoint, "endpoint");
        field!(region, "region");
        field!(bucket, "bucket");
        field!(key_prefix, "key_prefix");
        field!(force_path_style, "force_path_style");
        field!(encrypted_access_key_id, "encrypted_access_key_id");
        field!(encrypted_secret_access_key, "encrypted_secret_access_key");
        field!(credentials_updated_at, "credentials_updated_at");
        field!(updated_by, "updated_by");
        fields
            .push("updated_at=")
            .push_bind_unseparated(after.updated_at);
        fields.push("row_version=row_version+1");
    }
    q.push(" WHERE id=")
        .push_bind(&before.id)
        .push("::text::uuid AND row_version=")
        .push_bind(before.row_version)
        .push(" RETURNING row_version");
    let row = q.build().fetch_optional(connection).await?.ok_or_else(|| {
        sqlx::Error::Protocol("AttachmentStorageProviderConfig managed version conflict".into())
    })?;
    row.try_get("row_version")
}
/// Original MikroORM groups managed updates of this entity in one CASE UPDATE.
/// Native auth01 deliberately preserves the precheck-to-write race window:
/// SELECT checks loaded versions without a lock, UPDATE then uses only PKs.
async fn update_many(
    connection: &mut PgConnection,
    rows: &[(&ConfigRow, &ConfigRow)],
) -> Result<Vec<(String, i32)>, sqlx::Error> {
    if rows.is_empty() {
        return Ok(Vec::new());
    }
    if rows.len() == 1 {
        return Ok(vec![(
            rows[0].0.id.clone(),
            update(connection, rows[0].0, rows[0].1).await?,
        )]);
    }
    let mut check = QueryBuilder::<Postgres>::new(
        "SELECT id FROM poms.attachment_storage_provider_config WHERE ",
    );
    for (index, (before, _)) in rows.iter().enumerate() {
        if index > 0 {
            check.push(" OR ");
        }
        check
            .push("(id=")
            .push_bind(&before.id)
            .push("::text::uuid AND row_version=")
            .push_bind(before.row_version)
            .push(")");
    }
    check.push(" ORDER BY id ASC");
    if check.build().fetch_all(&mut *connection).await?.len() != rows.len() {
        return Err(sqlx::Error::Protocol(
            "AttachmentStorageProviderConfig managed version conflict".into(),
        ));
    }
    let mut query =
        QueryBuilder::<Postgres>::new("UPDATE poms.attachment_storage_provider_config SET ");
    {
        let mut fields = query.separated(",");
        macro_rules! field {
            ($field:ident,$name:literal) => {{
                let changed = rows
                    .iter()
                    .filter(|(before, after)| {
                        before.$field != after.$field || after.raw_text.contains_key($name)
                    })
                    .collect::<Vec<_>>();
                if !changed.is_empty() {
                    fields.push(concat!($name, "=CASE"));
                    for (before, after) in changed {
                        fields
                            .push_unseparated(" WHEN id=")
                            .push_bind_unseparated(&before.id)
                            .push_unseparated("::text::uuid THEN ")
                            .push_bind_unseparated(&after.$field);
                    }
                    fields.push_unseparated(concat!(" ELSE ", $name, " END"));
                }
            }};
        }
        field!(display_name, "display_name");
        field!(status, "status");
        field!(enabled, "enabled");
        field!(is_default, "is_default");
        field!(endpoint, "endpoint");
        field!(region, "region");
        field!(bucket, "bucket");
        field!(key_prefix, "key_prefix");
        field!(force_path_style, "force_path_style");
        field!(encrypted_access_key_id, "encrypted_access_key_id");
        field!(encrypted_secret_access_key, "encrypted_secret_access_key");
        field!(credentials_updated_at, "credentials_updated_at");
        field!(updated_by, "updated_by");
        fields.push("updated_at=CASE");
        for (before, after) in rows {
            fields
                .push_unseparated(" WHEN id=")
                .push_bind_unseparated(&before.id)
                .push_unseparated("::text::uuid THEN ")
                .push_bind_unseparated(after.updated_at);
        }
        fields.push_unseparated(" ELSE updated_at END");
        fields.push("row_version=row_version+1");
    }
    query.push(" WHERE id IN (");
    for (index, (before, _)) in rows.iter().enumerate() {
        if index > 0 {
            query.push(",");
        }
        query.push_bind(&before.id).push("::text::uuid");
    }
    query.push(")");
    query.push(" RETURNING id,row_version");
    // The native batch driver maps actual RETURNING versions, with no added
    // post-UPDATE affected-row CAS or row lock. A concurrent winner may have
    // advanced them after the preceding SELECT.
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok((
                row.try_get::<uuid::Uuid, _>("id")?.to_string(),
                row.try_get("row_version")?,
            ))
        })
        .collect()
}
/// One original business flush. The pending authentication CAS is consumed only
/// after this transaction commits; audit is a separate subsequent flush.
pub async fn save(
    database: &Database,
    changes: Vec<(Option<ConfigRow>, ConfigRow)>,
    pending: &mut Option<SessionFlush>,
) -> Result<Vec<ConfigRow>, StorageFailure> {
    let mut updates = Vec::new();
    for (before, mut after) in changes {
        if before.as_ref().is_some_and(|before| before == &after) {
            continue;
        }
        if let Some(before) = &before {
            after.row_version = before.row_version;
            after.updated_at = crate::auth::model::clock_now();
        }
        updates.push((before, after));
    }
    if updates.is_empty() && pending.is_none() {
        return Ok(Vec::new());
    }
    let managed = pending.clone();
    let returned = database
        .with_connection(move |connection| {
            Box::pin(async move {
                let mut tx = connection.begin().await?;
                let result: Result<Vec<ConfigRow>, sqlx::Error> = async {
                    // Native01: CREATE is an earlier UoW phase than all ordinary
                    // UPDATEs. In particular, do not demote the old enabled default
                    // before a new default INSERT: the original unique failure wins.
                    for (_, after) in updates.iter_mut().filter(|(before, _)| before.is_none()) {
                        let (id, version) = insert(&mut tx, after).await?;
                        after.id = id;
                        after.row_version = version;
                    }
                    if let Some(managed) = managed.as_ref() {
                        flush_managed_session(&mut tx, managed).await?;
                    }
                    let existing = updates
                        .iter()
                        .filter_map(|(before, after)| before.as_ref().map(|before| (before, after)))
                        .collect::<Vec<_>>();
                    let versions = update_many(&mut tx, &existing).await?;
                    drop(existing);
                    let mut returned = updates
                        .into_iter()
                        .map(|(_, after)| after)
                        .collect::<Vec<_>>();
                    for row in &mut returned {
                        if let Some((_, version)) = versions.iter().find(|(id, _)| id == &row.id) {
                            row.row_version = *version;
                        }
                    }
                    Ok(returned)
                }
                .await;
                match result {
                    Ok(rows) => {
                        tx.commit().await?;
                        Ok(rows)
                    }
                    Err(error) => {
                        tx.rollback().await?;
                        Err(error)
                    }
                }
            })
        })
        .await?;
    *pending = None;
    Ok(returned)
}

/// A separate original audit flush. Bind the unchanged JS JSON text, including
/// escaped lone surrogates, so PostgreSQL's real JSONB acceptance/failure remains
/// authoritative rather than laundering it through serde_json::Value.
pub async fn audit(
    database: &Database,
    input: AuditLogInput,
    raw_after: String,
    pending: &mut Option<SessionFlush>,
) -> Result<(), StorageFailure> {
    let managed = pending.clone();
    database.with_connection(move|connection|Box::pin(async move{
        let mut tx=connection.begin().await?;
        let result:Result<(),sqlx::Error>=async{
            sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10,$11)")
                .bind(&input.event_type).bind(&input.target_type).bind(&input.target_id).bind(input.operator_id).bind(&input.request_id).bind(input.result.as_str()).bind(&input.reason).bind(&input.before_snapshot).bind(raw_after).bind(&input.metadata).bind(input.occurred_at.unwrap_or_else(clock_now)).execute(&mut *tx).await?;
            if let Some(managed)=managed.as_ref(){flush_managed_session(&mut tx,managed).await?;}
            Ok(())
        }.await;
        match result{Ok(())=>tx.commit().await,Err(error)=>{tx.rollback().await?;Err(error)}}
    })).await?;
    *pending = None;
    Ok(())
}
