//! Existing role tables and one ORM-flush worth of SQL primitives.
//! Callers own transactions. No seeding, role locks or assignment-version CAS.

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Row, postgres::PgRow};
use uuid::Uuid;

use crate::auth::model::RoleReadSnapshot;

macro_rules! role_select {
    () => {
        "SELECT id,role_key,name,description,is_active,is_system_role,display_order,\
         row_version,created_at,updated_at FROM poms.role "
    };
}

#[derive(Clone)]
pub struct RoleRow {
    pub id: Uuid,
    pub role_key: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub is_system_role: bool,
    pub display_order: i32,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<RoleReadSnapshot> for RoleRow {
    fn from(row: RoleReadSnapshot) -> Self {
        Self {
            id: row.id,
            role_key: row.role_key,
            name: row.name,
            description: row.description,
            is_active: row.is_active,
            is_system_role: row.is_system_role,
            display_order: row.display_order,
            row_version: row.row_version,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

fn role(row: PgRow) -> Result<RoleRow, sqlx::Error> {
    Ok(RoleRow {
        id: row.try_get("id")?,
        role_key: row.try_get("role_key")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        is_active: row.try_get("is_active")?,
        is_system_role: row.try_get("is_system_role")?,
        display_order: row.try_get("display_order")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

pub async fn list(connection: &mut PgConnection) -> Result<Vec<RoleRow>, sqlx::Error> {
    sqlx::query(concat!(
        role_select!(),
        "ORDER BY display_order ASC,created_at ASC"
    ))
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(role)
    .collect()
}

/// Keep path IDs as strings: the original DB casts invalid UUIDs, without a DTO
/// UUID pipe. A SQLSTATE 22P02 remains a storage error rather than a new 400.
pub async fn find(connection: &mut PgConnection, id: &str) -> Result<Option<RoleRow>, sqlx::Error> {
    sqlx::query(concat!(role_select!(), "WHERE id=$1::text::uuid"))
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(role)
        .transpose()
}

pub async fn find_by_key(
    connection: &mut PgConnection,
    role_key: &str,
) -> Result<Option<RoleRow>, sqlx::Error> {
    sqlx::query(concat!(role_select!(), "WHERE role_key=$1"))
        .bind(role_key)
        .fetch_optional(connection)
        .await?
        .map(role)
        .transpose()
}

#[derive(Clone)]
pub struct PermissionAssignmentRow {
    pub id: Uuid,
    pub permission_key: String,
    pub status: String,
}

pub async fn assignments(
    connection: &mut PgConnection,
    role_id: &str,
) -> Result<Vec<PermissionAssignmentRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id,permission_key,status FROM poms.role_permission_assignment \
         WHERE role_id=$1::text::uuid ORDER BY assigned_at ASC,created_at ASC",
    )
    .bind(role_id)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(|row| {
        Ok(PermissionAssignmentRow {
            id: row.try_get("id")?,
            permission_key: row.try_get("permission_key")?,
            status: row.try_get("status")?,
        })
    })
    .collect()
}

pub async fn assigned_user_count(
    connection: &mut PgConnection,
    role_id: &str,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar(
        // The source counts canonical assignment IDs using === against the
        // original path string, although the role lookup accepts UUID aliases.
        "SELECT count(*) FROM poms.user_role_assignment \
         WHERE role_id::text=$1 AND status='active'",
    )
    .bind(role_id)
    .fetch_one(connection)
    .await
}

pub struct NewRole {
    pub role_key: String,
    pub name: String,
    pub description: Option<String>,
    // DTO safe integers must reach PostgreSQL's int4 boundary without a new 400.
    pub display_order: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn insert(connection: &mut PgConnection, input: &NewRole) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar(
        "INSERT INTO poms.role \
         (role_key,name,description,is_active,is_system_role,display_order,created_at,updated_at,created_by,updated_by) \
         VALUES($1,$2,$3,true,false,$4,$5,$6,NULL,NULL) RETURNING id",
    )
    .bind(&input.role_key)
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.display_order)
    .bind(input.created_at)
    .bind(input.updated_at)
    .fetch_one(connection)
    .await
}

#[derive(Default)]
pub struct RoleUpdate {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub display_order: Option<i64>,
    pub is_active: Option<bool>,
}

impl RoleUpdate {
    pub fn is_dirty(&self) -> bool {
        self.name.is_some()
            || self.description.is_some()
            || self.display_order.is_some()
            || self.is_active.is_some()
    }
}

/// Only changed properties are bound; an unchanged role has no UPDATE at all.
/// The current read version is internal ORM CAS, unrelated to expectedVersion.
pub async fn update(
    connection: &mut PgConnection,
    id: Uuid,
    expected_version: i32,
    changes: &RoleUpdate,
    updated_at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let version = sqlx::query_scalar(
        "UPDATE poms.role SET \
         name=CASE WHEN $1 THEN $2::text ELSE name END,\
         description=CASE WHEN $3 THEN $4::text ELSE description END,\
         display_order=CASE WHEN $5 THEN $6::bigint ELSE display_order END,\
         is_active=CASE WHEN $7 THEN $8::boolean ELSE is_active END,\
         updated_at=$9,row_version=row_version+1 \
         WHERE id=$10 AND row_version=$11 RETURNING row_version",
    )
    .bind(changes.name.is_some())
    .bind(changes.name.as_deref())
    .bind(changes.description.is_some())
    .bind(
        changes
            .description
            .as_ref()
            .and_then(|value| value.as_deref()),
    )
    .bind(changes.display_order.is_some())
    .bind(changes.display_order)
    .bind(changes.is_active.is_some())
    .bind(changes.is_active)
    .bind(updated_at)
    .bind(id)
    .bind(expected_version)
    .fetch_optional(connection)
    .await?;
    version.ok_or_else(|| sqlx::Error::Protocol("role managed version conflict".into()))
}

pub async fn insert_permission(
    connection: &mut PgConnection,
    role_id: Uuid,
    permission_key: &str,
    operator_id: Option<Uuid>,
    assigned_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.role_permission_assignment \
         (role_id,permission_key,status,assigned_at,assigned_by,revoked_at,revoked_by,change_reason,created_at,created_by) \
         VALUES($1,$2,'active',$3,$4,NULL,NULL,NULL,$5,$4)",
    )
    .bind(role_id)
    .bind(permission_key)
    .bind(assigned_at)
    .bind(operator_id)
    .bind(created_at)
    .execute(connection)
    .await?;
    Ok(())
}

pub async fn revoke_permission(
    connection: &mut PgConnection,
    assignment_id: Uuid,
    operator_id: Option<Uuid>,
    revoked_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    // No new status predicate or version is added to the original history row.
    sqlx::query(
        "UPDATE poms.role_permission_assignment SET status='revoked',revoked_at=$1,revoked_by=$2 WHERE id=$3",
    )
    .bind(revoked_at)
    .bind(operator_id)
    .bind(assignment_id)
    .execute(connection)
    .await?;
    Ok(())
}

pub struct RoleAudit {
    pub event_type: &'static str,
    pub target_id: String,
    pub operator_id: Option<Uuid>,
    pub result: &'static str,
    pub reason: Option<&'static str>,
    // Keep JSON text through PostgreSQL ::jsonb, including its rejection of
    // lone surrogate escapes after a separately committed business flush.
    pub before_snapshot: Option<String>,
    pub after_snapshot: Option<String>,
    pub metadata: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

pub async fn insert_audit(
    connection: &mut PgConnection,
    input: &RoleAudit,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.audit_log \
         (event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) \
         VALUES($1,'PlatformRole',$2,$3,NULL,$4,$5,$6::text::jsonb,$7::text::jsonb,$8::text::jsonb,$9)",
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
