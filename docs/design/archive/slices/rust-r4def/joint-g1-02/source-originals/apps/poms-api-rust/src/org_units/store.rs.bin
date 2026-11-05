//! Existing organization tables and one ORM-flush worth of SQL primitives.
//! Callers own transactions. Batch version preflight remains separate from
//! the original ID-only UPDATE; no stronger locks or predicates are added.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

macro_rules! org_unit_select {
    () => {
        "SELECT id,name,code,description,parent_id,is_active,display_order,row_version,\
         created_at,created_by,updated_at,updated_by FROM poms.org_unit "
    };
}

#[derive(Debug, Clone)]
pub struct OrgUnitRow {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub is_active: bool,
    pub display_order: i32,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

fn org_unit(row: PgRow) -> Result<OrgUnitRow, sqlx::Error> {
    Ok(OrgUnitRow {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        code: row.try_get("code")?,
        description: row.try_get("description")?,
        parent_id: row.try_get("parent_id")?,
        is_active: row.try_get("is_active")?,
        display_order: row.try_get("display_order")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

/// Hydration into an existing command-local managed entity omits null scalar
/// values. This also exposes the same production primitive to PG acceptance;
/// it neither reads nor writes a database and is not an auth/global snapshot.
pub fn merge_find_one(mut fresh: OrgUnitRow, cached: Option<&OrgUnitRow>) -> OrgUnitRow {
    if let Some(cached) = cached {
        if fresh.description.is_none() {
            fresh.description.clone_from(&cached.description);
        }
        if fresh.parent_id.is_none() {
            fresh.parent_id = cached.parent_id;
        }
        if fresh.created_by.is_none() {
            fresh.created_by = cached.created_by;
        }
        if fresh.updated_by.is_none() {
            fresh.updated_by = cached.updated_by;
        }
    }
    fresh
}

pub async fn list(connection: &mut PgConnection) -> Result<Vec<OrgUnitRow>, sqlx::Error> {
    sqlx::query(concat!(
        org_unit_select!(),
        "ORDER BY display_order ASC,created_at ASC"
    ))
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(org_unit)
    .collect()
}

/// Only the source PATCH command uses findOne. Other target lookups use the
/// all-org list and strict canonical-string equality in the service.
pub async fn find(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<OrgUnitRow>, sqlx::Error> {
    sqlx::query(concat!(org_unit_select!(), "WHERE id=$1::text::uuid"))
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(org_unit)
        .transpose()
}

pub async fn find_by_code(
    connection: &mut PgConnection,
    code: &str,
) -> Result<Option<OrgUnitRow>, sqlx::Error> {
    sqlx::query(concat!(org_unit_select!(), "WHERE code=$1"))
        .bind(code)
        .fetch_optional(connection)
        .await?
        .map(org_unit)
        .transpose()
}

pub async fn active_membership_counts(
    connection: &mut PgConnection,
) -> Result<HashMap<Uuid, i64>, sqlx::Error> {
    // The source counts every active relationship, including unknown types,
    // inactive users/orgs and non-null revoked_at. Do not add joins or DISTINCT.
    let rows =
        sqlx::query("SELECT org_unit_id FROM poms.user_org_membership WHERE status='active'")
            .fetch_all(connection)
            .await?;
    let mut counts = HashMap::new();
    for row in rows {
        *counts.entry(row.try_get("org_unit_id")?).or_insert(0) += 1;
    }
    Ok(counts)
}

pub struct NewOrgUnit {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub display_order: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn insert(
    connection: &mut PgConnection,
    input: &NewOrgUnit,
) -> Result<(Uuid, i32), sqlx::Error> {
    let row = sqlx::query(
        "INSERT INTO poms.org_unit \
         (name,code,description,parent_id,is_active,display_order,created_at,created_by,updated_at,updated_by) \
         VALUES($1,$2,$3,$4,true,$5,$6,NULL,$7,NULL) RETURNING id,row_version",
    )
    .bind(&input.name)
    .bind(&input.code)
    .bind(&input.description)
    .bind(input.parent_id)
    .bind(input.display_order)
    .bind(input.created_at)
    .bind(input.updated_at)
    .fetch_one(connection)
    .await?;
    Ok((row.try_get("id")?, row.try_get("row_version")?))
}

#[derive(Default)]
pub struct OrgUnitUpdate {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<Option<String>>,
    pub parent_id: Option<Option<Uuid>>,
    pub is_active: Option<bool>,
    pub display_order: Option<i64>,
}

impl OrgUnitUpdate {
    pub fn is_dirty(&self) -> bool {
        self.name.is_some()
            || self.code.is_some()
            || self.description.is_some()
            || self.parent_id.is_some()
            || self.is_active.is_some()
            || self.display_order.is_some()
    }
}

fn assignment(query: &mut QueryBuilder<Postgres>, first: &mut bool, column: &str) {
    if !*first {
        query.push(",");
    }
    *first = false;
    query.push(column).push("=");
}

/// A single managed change uses its current entity version in the UPDATE.
pub async fn update(
    connection: &mut PgConnection,
    id: Uuid,
    expected_version: i32,
    changes: &OrgUnitUpdate,
    updated_at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.org_unit SET ");
    let mut first = true;
    if let Some(value) = changes.name.as_ref() {
        assignment(&mut query, &mut first, "name");
        query.push_bind(value.clone());
    }
    if let Some(value) = changes.code.as_ref() {
        assignment(&mut query, &mut first, "code");
        query.push_bind(value.clone());
    }
    if let Some(value) = changes.description.as_ref() {
        assignment(&mut query, &mut first, "description");
        query.push_bind(value.clone());
    }
    if let Some(value) = changes.parent_id {
        assignment(&mut query, &mut first, "parent_id");
        query.push_bind(value);
    }
    if let Some(value) = changes.is_active {
        assignment(&mut query, &mut first, "is_active");
        query.push_bind(value);
    }
    if let Some(value) = changes.display_order {
        assignment(&mut query, &mut first, "display_order");
        query.push_bind(value);
    }
    assignment(&mut query, &mut first, "updated_at");
    query
        .push_bind(updated_at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(id)
        .push(" AND row_version=")
        .push_bind(expected_version)
        .push(" RETURNING row_version");
    query
        .build_query_scalar()
        .fetch_optional(connection)
        .await?
        .ok_or_else(|| sqlx::Error::Protocol("organization managed version conflict".into()))
}

pub struct Deactivation {
    pub id: Uuid,
    pub expected_version: i32,
    pub updated_at: DateTime<Utc>,
}

/// Real Nest mixed-cascade witness: SELECT versions first, then one CASE
/// UPDATE by IDs, without locks or version predicates in that second query.
/// The pinned MikroORM batchSize is 300. A final one-row chunk stays on this
/// batch path when the total managed change-set had more than one entity.
pub async fn deactivate_many(
    connection: &mut PgConnection,
    inputs: &[Deactivation],
) -> Result<HashMap<Uuid, i32>, sqlx::Error> {
    let mut versions = HashMap::new();
    for chunk in inputs.chunks(300) {
        let mut check = QueryBuilder::<Postgres>::new("SELECT id FROM poms.org_unit WHERE ");
        for (index, input) in chunk.iter().enumerate() {
            if index != 0 {
                check.push(" OR ");
            }
            check
                .push("(id=")
                .push_bind(input.id)
                .push(" AND row_version=")
                .push_bind(input.expected_version)
                .push(")");
        }
        check.push(" ORDER BY id ASC");
        let matched: Vec<Uuid> = check
            .build_query_scalar()
            .fetch_all(&mut *connection)
            .await?;
        if matched.len() != chunk.len() {
            return Err(sqlx::Error::Protocol(
                "organization managed batch version conflict".into(),
            ));
        }
        let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.org_unit SET is_active=CASE ");
        for input in chunk {
            query
                .push("WHEN id=")
                .push_bind(input.id)
                .push(" THEN false ");
        }
        query.push("ELSE is_active END,updated_at=CASE ");
        for input in chunk {
            query
                .push("WHEN id=")
                .push_bind(input.id)
                .push(" THEN ")
                .push_bind(input.updated_at)
                .push(" ");
        }
        query.push("ELSE updated_at END,row_version=row_version+1 WHERE id IN (");
        for (index, input) in chunk.iter().enumerate() {
            if index != 0 {
                query.push(",");
            }
            query.push_bind(input.id);
        }
        query.push(") RETURNING id,row_version");
        for row in query.build().fetch_all(&mut *connection).await? {
            versions.insert(row.try_get("id")?, row.try_get("row_version")?);
        }
        // The original batch persister maps any returned rows; it does not add
        // a second optimistic affected-row check after its version preflight.
    }
    Ok(versions)
}

pub struct OrgUnitAudit {
    pub event_type: &'static str,
    pub target_id: String,
    pub operator_id: Option<Uuid>,
    pub result: &'static str,
    pub reason: Option<&'static str>,
    pub before_snapshot: Option<String>,
    pub after_snapshot: Option<String>,
    pub metadata: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

pub async fn insert_audit(
    connection: &mut PgConnection,
    input: &OrgUnitAudit,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.audit_log \
         (event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) \
         VALUES($1,'OrgUnit',$2,$3,NULL,$4,$5,$6::text::jsonb,$7::text::jsonb,$8::text::jsonb,$9)",
    )
    .bind(input.event_type)
    .bind(&input.target_id)
    .bind(input.operator_id)
    .bind(input.result)
    .bind(input.reason)
    .bind(input.before_snapshot.as_deref())
    .bind(input.after_snapshot.as_deref())
    .bind(input.metadata.as_deref())
    .bind(input.occurred_at)
    .execute(connection)
    .await?;
    Ok(())
}
