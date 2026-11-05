//! Existing user rows and one observed ORM-flush worth of SQL primitives.
//! Transaction ownership stays in the service. No credential writes or schema
//! changes belong to this module.

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

pub type UserRow = crate::auth::model::UserReadSnapshot;

macro_rules! user_select {
    () => {
        "SELECT id,username,display_name,email,email_verified,phone,phone_verified,\
         avatar_url,is_active,primary_org_unit_id,last_login_at,row_version,\
         created_at,created_by,updated_at,updated_by FROM poms.platform_user "
    };
}

fn user_row(row: PgRow) -> Result<UserRow, sqlx::Error> {
    Ok(UserRow {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        display_name: row.try_get("display_name")?,
        email: row.try_get("email")?,
        email_verified: row.try_get("email_verified")?,
        phone: row.try_get("phone")?,
        phone_verified: row.try_get("phone_verified")?,
        avatar_url: row.try_get("avatar_url")?,
        is_active: row.try_get("is_active")?,
        primary_org_unit_id: row.try_get("primary_org_unit_id")?,
        last_login_at: row.try_get("last_login_at")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

/// The create precheck is a username lookup, including inactive accounts.
/// Source-bound W01 non-due/due observations precede this implementation.
pub async fn find_by_username(
    connection: &mut PgConnection,
    username: &str,
) -> Result<Option<UserRow>, sqlx::Error> {
    sqlx::query(concat!(user_select!(), "WHERE username=$1 LIMIT 1"))
        .bind(username)
        .fetch_optional(connection)
        .await?
        .map(user_row)
        .transpose()
}

pub async fn find(connection: &mut PgConnection, id: &str) -> Result<Option<UserRow>, sqlx::Error> {
    // Path identifiers have no DTO UUID pipe. PostgreSQL owns invalid-ID errors.
    sqlx::query(concat!(user_select!(), "WHERE id=$1::text::uuid LIMIT 1"))
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(user_row)
        .transpose()
}

pub async fn list(connection: &mut PgConnection) -> Result<Vec<UserRow>, sqlx::Error> {
    sqlx::query(concat!(user_select!(), "ORDER BY created_at DESC"))
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(user_row)
        .collect()
}

pub async fn roles_by_ids(
    connection: &mut PgConnection,
    ids: &[String],
) -> Result<Vec<crate::roles::store::RoleRow>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    sqlx::query(
        "SELECT id,role_key,name,description,is_active,is_system_role,display_order,\
         row_version,created_at,updated_at FROM poms.role WHERE id=ANY($1::text[]::uuid[])",
    )
    .bind(ids)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(|row| {
        Ok(crate::roles::store::RoleRow {
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
    })
    .collect()
}

#[derive(Default)]
pub struct UserUpdate {
    pub display_name: Option<String>,
    pub email: Option<Option<String>>,
    pub email_verified: Option<bool>,
    pub phone: Option<Option<String>>,
    pub phone_verified: Option<bool>,
    pub avatar_url: Option<Option<String>>,
    pub is_active: Option<bool>,
    pub primary_org_unit_id: Option<Option<Uuid>>,
}

impl UserUpdate {
    pub fn is_dirty(&self) -> bool {
        self.display_name.is_some()
            || self.email.is_some()
            || self.email_verified.is_some()
            || self.phone.is_some()
            || self.phone_verified.is_some()
            || self.avatar_url.is_some()
            || self.is_active.is_some()
            || self.primary_org_unit_id.is_some()
    }
}

/// W02/W05 dirty UPDATE includes only changed columns. Its CAS is the managed
/// read version, independent of request.expectedVersion. No-op callers skip it.
pub async fn update(
    connection: &mut PgConnection,
    id: Uuid,
    expected_version: i32,
    changes: &UserUpdate,
    updated_at: DateTime<Utc>,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.platform_user SET ");
    let mut columns = query.separated(",");
    if let Some(value) = changes.display_name.as_ref() {
        columns.push("display_name=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.email.as_ref() {
        columns.push("email=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.email_verified {
        columns.push("email_verified=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.phone.as_ref() {
        columns.push("phone=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.phone_verified {
        columns.push("phone_verified=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.avatar_url.as_ref() {
        columns.push("avatar_url=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.is_active {
        columns.push("is_active=").push_bind_unseparated(value);
    }
    if let Some(value) = changes.primary_org_unit_id {
        columns
            .push("primary_org_unit_id=")
            .push_bind_unseparated(value);
    }
    columns
        .push("updated_at=")
        .push_bind_unseparated(updated_at);
    columns.push("row_version=row_version+1");
    query.push(" WHERE id=").push_bind(id);
    query.push(" AND row_version=").push_bind(expected_version);
    query.push(" RETURNING row_version");
    let version: Option<i32> = query
        .build_query_scalar()
        .fetch_optional(connection)
        .await?;
    version.ok_or_else(|| sqlx::Error::Protocol("user managed version conflict".into()))
}

pub struct NewUser {
    pub username: String,
    pub display_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub primary_org_unit_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Let PostgreSQL allocate the UUID. The source's child relations were built
/// with an undefined userId before this INSERT; callers preserve that failure
/// after INSERT and before any child/session SQL, rolling this transaction back.
pub async fn insert(
    connection: &mut PgConnection,
    input: &NewUser,
) -> Result<(Uuid, i32), sqlx::Error> {
    let row = sqlx::query(
        "INSERT INTO poms.platform_user \
         (username,display_name,email,email_verified,phone,phone_verified,avatar_url,is_active,\
          primary_org_unit_id,last_login_at,created_at,created_by,updated_at,updated_by) \
         VALUES($1,$2,$3,false,$4,false,NULL,true,$5,NULL,$6,NULL,$7,NULL) \
         RETURNING id,row_version",
    )
    .bind(&input.username)
    .bind(&input.display_name)
    .bind(&input.email)
    .bind(&input.phone)
    .bind(input.primary_org_unit_id)
    .bind(input.created_at)
    .bind(input.updated_at)
    .fetch_one(connection)
    .await?;
    Ok((row.try_get("id")?, row.try_get("row_version")?))
}

pub struct UserAudit {
    pub event_type: &'static str,
    pub target_id: String,
    pub operator_id: Option<Uuid>,
    pub before_snapshot: Option<String>,
    pub after_snapshot: Option<String>,
    pub metadata: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

/// Preserve JSON text until PostgreSQL ::jsonb. A lone-surrogate audit rejection
/// must not retroactively roll back a separately committed user change.
pub async fn insert_audit(
    connection: &mut PgConnection,
    input: &UserAudit,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.audit_log \
         (event_type,target_type,target_id,operator_id,request_id,result,reason,\
          before_snapshot,after_snapshot,metadata,occurred_at) \
         VALUES($1,'PlatformUser',$2,$3,NULL,'success',NULL,$4::text::jsonb,$5::text::jsonb,\
          $6::text::jsonb,$7) RETURNING id",
    )
    .bind(input.event_type)
    .bind(&input.target_id)
    .bind(input.operator_id)
    .bind(input.before_snapshot.as_deref())
    .bind(input.after_snapshot.as_deref())
    .bind(input.metadata.as_deref())
    .bind(input.occurred_at)
    .execute(connection)
    .await?;
    Ok(())
}

/// Complete existing relationship rows. Their queries/replacement flushes are
/// added only after the corresponding original Nest witnesses, not inferred
/// from create or from a previous role/organization slice.
#[derive(Debug, Clone)]
pub struct UserRoleAssignmentRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub status: String,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Option<Uuid>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_by: Option<Uuid>,
    pub change_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone)]
pub struct UserOrgMembershipRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub org_unit_id: Uuid,
    pub membership_type: String,
    pub status: String,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Option<Uuid>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_by: Option<Uuid>,
    pub change_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

pub async fn active_roles(
    connection: &mut PgConnection,
) -> Result<Vec<UserRoleAssignmentRow>, sqlx::Error> {
    // The original reads every active assignment without ordering. In
    // particular, revoked_at is not another activity predicate.
    sqlx::query(
        "SELECT id,user_id,role_id,status,assigned_at,assigned_by,revoked_at,revoked_by,\
         change_reason,created_at,created_by FROM poms.user_role_assignment WHERE status='active'",
    )
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(|row| {
        Ok(UserRoleAssignmentRow {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            role_id: row.try_get("role_id")?,
            status: row.try_get("status")?,
            assigned_at: row.try_get("assigned_at")?,
            assigned_by: row.try_get("assigned_by")?,
            revoked_at: row.try_get("revoked_at")?,
            revoked_by: row.try_get("revoked_by")?,
            change_reason: row.try_get("change_reason")?,
            created_at: row.try_get("created_at")?,
            created_by: row.try_get("created_by")?,
        })
    })
    .collect()
}

pub async fn active_memberships(
    connection: &mut PgConnection,
) -> Result<Vec<UserOrgMembershipRow>, sqlx::Error> {
    sqlx::query(
        "SELECT id,user_id,org_unit_id,membership_type,status,assigned_at,assigned_by,\
         revoked_at,revoked_by,change_reason,created_at,created_by \
         FROM poms.user_org_membership WHERE status='active'",
    )
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(|row| {
        Ok(UserOrgMembershipRow {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            org_unit_id: row.try_get("org_unit_id")?,
            membership_type: row.try_get("membership_type")?,
            status: row.try_get("status")?,
            assigned_at: row.try_get("assigned_at")?,
            assigned_by: row.try_get("assigned_by")?,
            revoked_at: row.try_get("revoked_at")?,
            revoked_by: row.try_get("revoked_by")?,
            change_reason: row.try_get("change_reason")?,
            created_at: row.try_get("created_at")?,
            created_by: row.try_get("created_by")?,
        })
    })
    .collect()
}

/// Native deletes precede saveAll and commit independently, including deletion
/// of inactive/revoked history. Never wrap them in the subsequent insert TX.
pub async fn delete_roles(connection: &mut PgConnection, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM poms.user_role_assignment WHERE user_id=$1::text::uuid")
        .bind(user_id)
        .execute(connection)
        .await?;
    Ok(())
}

pub async fn delete_memberships(
    connection: &mut PgConnection,
    user_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM poms.user_org_membership WHERE user_id=$1::text::uuid")
        .bind(user_id)
        .execute(connection)
        .await?;
    Ok(())
}

pub struct NewUserRole {
    pub user_id: String,
    pub role_id: String,
    pub assigned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

pub async fn insert_roles(
    connection: &mut PgConnection,
    rows: &[NewUserRole],
) -> Result<(), sqlx::Error> {
    if rows.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Postgres>::new(
        "INSERT INTO poms.user_role_assignment \
         (user_id,role_id,status,assigned_at,assigned_by,created_at,created_by) ",
    );
    query.push_values(rows, |mut row, input| {
        row.push_bind(&input.user_id)
            .push_unseparated("::text::uuid");
        row.push_bind(&input.role_id)
            .push_unseparated("::text::uuid");
        row.push("'active'").push_bind(input.assigned_at);
        row.push("NULL").push_bind(input.created_at).push("NULL");
    });
    query.push(" RETURNING id");
    query.build().execute(connection).await?;
    Ok(())
}

pub struct NewUserMembership {
    pub user_id: String,
    pub org_unit_id: String,
    pub membership_type: &'static str,
    pub assigned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

pub async fn insert_memberships(
    connection: &mut PgConnection,
    rows: &[NewUserMembership],
) -> Result<(), sqlx::Error> {
    if rows.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Postgres>::new(
        "INSERT INTO poms.user_org_membership \
         (user_id,org_unit_id,membership_type,status,assigned_at,assigned_by,created_at,created_by) ",
    );
    query.push_values(rows, |mut row, input| {
        row.push_bind(&input.user_id)
            .push_unseparated("::text::uuid");
        row.push_bind(&input.org_unit_id)
            .push_unseparated("::text::uuid");
        row.push_bind(input.membership_type).push("'active'");
        row.push_bind(input.assigned_at).push("NULL");
        row.push_bind(input.created_at).push("NULL");
    });
    query.push(" RETURNING id");
    query.build().execute(connection).await?;
    Ok(())
}
