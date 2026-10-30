//! SQL translation of AuthSessionRepository and the platform reads used by
//! authentication. No implicit transaction, lock, CAS or permission whitelist.

use std::{
    collections::{HashMap, HashSet},
    fmt,
    str::FromStr,
};

use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::{
    AuthUser, RequestInfo, RoleReadSnapshot, Session, SessionFlush, UserReadSnapshot, clock_now,
};
use crate::{
    compat::{permissions::RawPermission, scalars::js_iso_string},
    shared::generated::{AuthSessionRevokedReason, AuthSessionStatus},
};

macro_rules! session_columns { () => { "id,token_hash,csrf_token_hash,user_id,status,idle_expires_at,absolute_expires_at,last_seen_at,revoked_at,revoked_reason,created_ip,last_ip,created_user_agent,row_version,created_at,updated_at" }; }
macro_rules! snapshot_columns { () => { "status,csrf_token_hash,idle_expires_at,absolute_expires_at,last_seen_at,last_ip,revoked_at,revoked_reason,row_version,updated_at" }; }

fn invalid_state() -> sqlx::Error {
    sqlx::Error::Decode(Box::new(std::io::Error::new(
        std::io::ErrorKind::InvalidData,
        "invalid authentication database state",
    )))
}

fn parse_enum<T: FromStr>(raw: String) -> Result<T, sqlx::Error> {
    raw.parse().map_err(|_| invalid_state())
}

fn timestamp(row: &PgRow, column: &str) -> Result<DateTime<Utc>, sqlx::Error> {
    let date: DateTime<Utc> = row.try_get(column)?;
    DateTime::from_timestamp_millis(date.timestamp_millis()).ok_or_else(invalid_state)
}

fn optional_timestamp(row: &PgRow, column: &str) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
    row.try_get::<Option<DateTime<Utc>>, _>(column)?
        .map(|date| {
            DateTime::from_timestamp_millis(date.timestamp_millis()).ok_or_else(invalid_state)
        })
        .transpose()
}

fn map_session(row: PgRow) -> Result<Session, sqlx::Error> {
    Ok(Session {
        id: row.try_get("id")?,
        token_hash: row.try_get("token_hash")?,
        csrf_token_hash: row.try_get("csrf_token_hash")?,
        user_id: row.try_get("user_id")?,
        status: parse_enum(row.try_get("status")?)?,
        idle_expires_at: timestamp(&row, "idle_expires_at")?,
        absolute_expires_at: timestamp(&row, "absolute_expires_at")?,
        last_seen_at: timestamp(&row, "last_seen_at")?,
        revoked_at: optional_timestamp(&row, "revoked_at")?,
        revoked_reason: row
            .try_get::<Option<String>, _>("revoked_reason")?
            .map(parse_enum)
            .transpose()?,
        created_ip: row.try_get("created_ip")?,
        last_ip: row.try_get("last_ip")?,
        created_user_agent: row.try_get("created_user_agent")?,
        row_version: row.try_get("row_version")?,
        created_at: timestamp(&row, "created_at")?,
        updated_at: timestamp(&row, "updated_at")?,
    })
}

#[derive(Clone)]
pub struct SessionWriteSnapshot {
    pub status: AuthSessionStatus,
    pub csrf_token_hash: Option<String>,
    pub idle_expires_at: DateTime<Utc>,
    pub absolute_expires_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub last_ip: Option<String>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_reason: Option<AuthSessionRevokedReason>,
    pub row_version: i32,
    pub updated_at: DateTime<Utc>,
}

impl fmt::Debug for SessionWriteSnapshot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SessionWriteSnapshot")
            .field("status", &self.status)
            .field("row_version", &self.row_version)
            .finish_non_exhaustive()
    }
}

impl SessionWriteSnapshot {
    pub fn apply_to(self, session: &mut Session) {
        session.status = self.status;
        session.csrf_token_hash = self.csrf_token_hash;
        session.idle_expires_at = self.idle_expires_at;
        session.absolute_expires_at = self.absolute_expires_at;
        session.last_seen_at = self.last_seen_at;
        session.last_ip = self.last_ip;
        session.revoked_at = self.revoked_at;
        session.revoked_reason = self.revoked_reason;
        session.row_version = self.row_version;
        session.updated_at = self.updated_at;
    }

    pub fn is_expired_at(&self, now: DateTime<Utc>) -> bool {
        self.idle_expires_at <= now || self.absolute_expires_at <= now
    }
}

fn map_snapshot(row: PgRow) -> Result<SessionWriteSnapshot, sqlx::Error> {
    Ok(SessionWriteSnapshot {
        status: parse_enum(row.try_get("status")?)?,
        csrf_token_hash: row.try_get("csrf_token_hash")?,
        idle_expires_at: timestamp(&row, "idle_expires_at")?,
        absolute_expires_at: timestamp(&row, "absolute_expires_at")?,
        last_seen_at: timestamp(&row, "last_seen_at")?,
        last_ip: row.try_get("last_ip")?,
        revoked_at: optional_timestamp(&row, "revoked_at")?,
        revoked_reason: row
            .try_get::<Option<String>, _>("revoked_reason")?
            .map(parse_enum)
            .transpose()?,
        row_version: row.try_get("row_version")?,
        updated_at: timestamp(&row, "updated_at")?,
    })
}

pub async fn find_by_token_hash(
    connection: &mut PgConnection,
    token_hash: &str,
) -> Result<Option<Session>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        session_columns!(),
        " FROM poms.auth_session WHERE token_hash=$1 LIMIT 1"
    ))
    .bind(token_hash)
    .fetch_optional(connection)
    .await?
    .map(map_session)
    .transpose()
}

pub async fn find_write_snapshot_by_id(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<SessionWriteSnapshot>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        snapshot_columns!(),
        " FROM poms.auth_session WHERE id=$1"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(map_snapshot)
    .transpose()
}

pub struct NewSession<'a> {
    pub user_id: Uuid,
    pub token_hash: &'a str,
    pub csrf_token_hash: &'a str,
    pub now: DateTime<Utc>,
    pub idle_expires_at: DateTime<Utc>,
    pub absolute_expires_at: DateTime<Utc>,
    pub request_info: &'a RequestInfo,
}

/// UUID/default version are database defaults. ORM onCreate timestamps use the
/// real wall clock, independently of the optional lifecycle clock in TS tests.
pub async fn create_session(
    connection: &mut PgConnection,
    input: NewSession<'_>,
) -> Result<Session, sqlx::Error> {
    let created_at = clock_now();
    let updated_at = clock_now();
    let row = sqlx::query(concat!("INSERT INTO poms.auth_session \
        (token_hash,csrf_token_hash,user_id,status,idle_expires_at,absolute_expires_at,last_seen_at,\
         revoked_at,revoked_reason,created_ip,last_ip,created_user_agent,created_at,updated_at) \
        VALUES ($1,$2,$3,'active',$4,$5,$6,NULL,NULL,$7,$7,$8,$9,$10) RETURNING ", session_columns!()))
        .bind(input.token_hash).bind(input.csrf_token_hash).bind(input.user_id)
        .bind(input.idle_expires_at).bind(input.absolute_expires_at).bind(input.now)
        .bind(&input.request_info.ip).bind(&input.request_info.user_agent).bind(created_at).bind(updated_at)
        .fetch_one(connection).await?;
    map_session(row)
}

#[derive(Debug, Clone)]
pub struct TouchedSession {
    pub last_seen_at: DateTime<Utc>,
    pub last_ip: Option<String>,
    pub idle_expires_at: DateTime<Utc>,
    pub row_version: i32,
    pub updated_at: DateTime<Utc>,
}

impl TouchedSession {
    pub fn apply_to(self, session: &mut Session) {
        session.last_seen_at = self.last_seen_at;
        session.last_ip = self.last_ip;
        session.idle_expires_at = self.idle_expires_at;
        session.row_version = self.row_version;
        session.updated_at = self.updated_at;
    }
}

pub async fn touch_last_seen_if_due(
    connection: &mut PgConnection,
    id: Uuid,
    now: DateTime<Utc>,
    ip: Option<&str>,
    next_idle: DateTime<Utc>,
    refresh_due_before: DateTime<Utc>,
) -> Result<Option<TouchedSession>, sqlx::Error> {
    let row = sqlx::query(
        "UPDATE poms.auth_session SET last_seen_at=$1,last_ip=coalesce($2,last_ip),\
        idle_expires_at=least($3,absolute_expires_at),row_version=row_version+1,updated_at=$1 \
        WHERE id=$4 AND status='active' AND last_seen_at <= $5 \
        AND idle_expires_at > $1 AND absolute_expires_at > $1 \
        RETURNING last_seen_at,last_ip,idle_expires_at,row_version,updated_at",
    )
    .bind(now)
    .bind(ip)
    .bind(next_idle)
    .bind(id)
    .bind(refresh_due_before)
    .fetch_optional(connection)
    .await?;
    row.map(|row| {
        Ok(TouchedSession {
            last_seen_at: timestamp(&row, "last_seen_at")?,
            last_ip: row.try_get("last_ip")?,
            idle_expires_at: timestamp(&row, "idle_expires_at")?,
            row_version: row.try_get("row_version")?,
            updated_at: timestamp(&row, "updated_at")?,
        })
    })
    .transpose()
}

pub async fn rotate_csrf_token_for_active_session(
    connection: &mut PgConnection,
    id: Uuid,
    csrf_token_hash: &str,
    now: DateTime<Utc>,
) -> Result<Option<SessionWriteSnapshot>, sqlx::Error> {
    sqlx::query(concat!("UPDATE poms.auth_session SET csrf_token_hash=$1,row_version=row_version+1,updated_at=$2 \
        WHERE id=$3 AND status='active' AND idle_expires_at > $2 AND absolute_expires_at > $2 RETURNING ", snapshot_columns!()))
        .bind(csrf_token_hash).bind(now).bind(id).fetch_optional(connection).await?.map(map_snapshot).transpose()
}

pub async fn expire_active_session(
    connection: &mut PgConnection,
    id: Uuid,
    now: DateTime<Utc>,
) -> Result<Option<SessionWriteSnapshot>, sqlx::Error> {
    // Deliberately no expiry predicate: the source service made that decision.
    sqlx::query(concat!(
        "UPDATE poms.auth_session SET status='expired',revoked_at=$1,revoked_reason=NULL,\
        row_version=row_version+1,updated_at=$1 WHERE id=$2 AND status='active' RETURNING ",
        snapshot_columns!()
    ))
    .bind(now)
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(map_snapshot)
    .transpose()
}

pub async fn revoke_active_session(
    connection: &mut PgConnection,
    id: Uuid,
    reason: AuthSessionRevokedReason,
    now: DateTime<Utc>,
) -> Result<Option<SessionWriteSnapshot>, sqlx::Error> {
    sqlx::query(concat!(
        "UPDATE poms.auth_session SET status='revoked',revoked_at=$1,revoked_reason=$2,\
        row_version=row_version+1,updated_at=$1 WHERE id=$3 AND status='active' RETURNING ",
        snapshot_columns!()
    ))
    .bind(now)
    .bind(reason.as_str())
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(map_snapshot)
    .transpose()
}

pub async fn revoke_active_sessions_for_user(
    connection: &mut PgConnection,
    user_id: Uuid,
    reason: AuthSessionRevokedReason,
    now: DateTime<Utc>,
) -> Result<usize, sqlx::Error> {
    let rows = sqlx::query(
        "UPDATE poms.auth_session SET status='revoked',revoked_at=$1,revoked_reason=$2,\
        row_version=row_version+1,updated_at=$1 WHERE user_id=$3 AND status='active' RETURNING id",
    )
    .bind(now)
    .bind(reason.as_str())
    .bind(user_id)
    .fetch_all(connection)
    .await?;
    Ok(rows.len())
}

/// Called inside an original ORM-equivalent flush: business entities or audit.
/// The caller owns operation ordering and consumes this request-local state once.
/// Apply exactly changed properties and the original updatedAt onUpdate hook.
/// The optimistic predicate uses the applied raw snapshot's current version.
pub async fn flush_managed_session(
    connection: &mut PgConnection,
    pending: &SessionFlush,
) -> Result<(), sqlx::Error> {
    flush_managed_session_with_updated_at(connection, pending, None).await
}

/// L's original UoW samples onUpdate while computing changes, before any SQL
/// groups run. Existing callers retain their clock sample at the bind stage.
pub async fn flush_managed_session_at(
    connection: &mut PgConnection,
    pending: &SessionFlush,
    updated_at: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    flush_managed_session_with_updated_at(connection, pending, Some(updated_at)).await
}

async fn flush_managed_session_with_updated_at(
    connection: &mut PgConnection,
    pending: &SessionFlush,
    updated_at: Option<DateTime<Utc>>,
) -> Result<(), sqlx::Error> {
    let changes = &pending.changes;
    let row=sqlx::query("UPDATE poms.auth_session SET \
        status=CASE WHEN $1 THEN $2 ELSE status END,\
        csrf_token_hash=CASE WHEN $3 THEN $4 ELSE csrf_token_hash END,\
        idle_expires_at=CASE WHEN $5 THEN $6 ELSE idle_expires_at END,\
        absolute_expires_at=CASE WHEN $7 THEN $8 ELSE absolute_expires_at END,\
        last_seen_at=CASE WHEN $9 THEN $10 ELSE last_seen_at END,\
        last_ip=CASE WHEN $11 THEN $12 ELSE last_ip END,\
        revoked_at=CASE WHEN $13 THEN $14 ELSE revoked_at END,\
        revoked_reason=CASE WHEN $15 THEN $16 ELSE revoked_reason END,\
        updated_at=$17,row_version=row_version+1 WHERE id=$18 AND row_version=$19 RETURNING row_version")
        .bind(changes.status.is_some()).bind(changes.status.map(|status|status.as_str()))
        .bind(changes.csrf_token_hash.is_some()).bind(changes.csrf_token_hash.as_ref().and_then(|hash|hash.as_deref()))
        .bind(changes.idle_expires_at.is_some()).bind(changes.idle_expires_at)
        .bind(changes.absolute_expires_at.is_some()).bind(changes.absolute_expires_at)
        .bind(changes.last_seen_at.is_some()).bind(changes.last_seen_at)
        .bind(changes.last_ip.is_some()).bind(changes.last_ip.as_ref().and_then(|ip|ip.as_deref()))
        .bind(changes.revoked_at.is_some()).bind(changes.revoked_at.flatten())
        .bind(changes.revoked_reason.is_some()).bind(changes.revoked_reason.flatten().map(|reason|reason.as_str()))
        .bind(updated_at.unwrap_or_else(clock_now)).bind(pending.id).bind(pending.expected_version)
        .fetch_optional(connection).await?;
    if row.is_none() {
        return Err(sqlx::Error::Protocol(
            "authentication managed version conflict".into(),
        ));
    }
    Ok(())
}

pub type Account = UserReadSnapshot;

macro_rules! account_columns { () => { "id,username,display_name,email,avatar_url,is_active,last_login_at,email_verified,phone_verified,phone,primary_org_unit_id,row_version,created_at,updated_at,created_by,updated_by" }; }

fn map_account(row: PgRow) -> Result<Account, sqlx::Error> {
    Ok(Account {
        id: row.try_get("id")?,
        username: row.try_get("username")?,
        display_name: row.try_get("display_name")?,
        email: row.try_get("email")?,
        avatar_url: row.try_get("avatar_url")?,
        is_active: row.try_get("is_active")?,
        last_login_at: optional_timestamp(&row, "last_login_at")?,
        email_verified: row.try_get("email_verified")?,
        phone_verified: row.try_get("phone_verified")?,
        phone: row.try_get("phone")?,
        primary_org_unit_id: row.try_get("primary_org_unit_id")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
        created_by: row.try_get("created_by")?,
        updated_by: row.try_get("updated_by")?,
    })
}

pub async fn find_active_account_by_username(
    connection: &mut PgConnection,
    username: &str,
) -> Result<Option<Account>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        account_columns!(),
        " FROM poms.platform_user WHERE username=$1 AND is_active=true LIMIT 1"
    ))
    .bind(username)
    .fetch_optional(connection)
    .await?
    .map(map_account)
    .transpose()
}

pub async fn find_account_by_id(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<Option<Account>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        account_columns!(),
        " FROM poms.platform_user WHERE id=$1 LIMIT 1"
    ))
    .bind(user_id)
    .fetch_optional(connection)
    .await?
    .map(map_account)
    .transpose()
}

pub async fn find_password_hash(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT password_hash FROM poms.local_credential WHERE user_id=$1 LIMIT 1")
        .bind(user_id)
        .fetch_optional(connection)
        .await
}

/// Keep first-occurrence Set ordering and unknown persisted permission strings.
/// The source assignment queries have no ORDER BY; no total DB order is claimed.
pub async fn permissions_for_user(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<Vec<RawPermission>, sqlx::Error> {
    Ok(permissions_with_role_snapshots(connection, user_id)
        .await?
        .0)
}

/// Preserve the early findRolesByIds identity-map values for this request.
/// Permission union order and raw unknown keys remain unchanged.
pub async fn permissions_with_role_snapshots(
    connection: &mut PgConnection,
    user_id: Uuid,
) -> Result<(Vec<RawPermission>, Vec<RoleReadSnapshot>), sqlx::Error> {
    let assignments =
        sqlx::query("SELECT user_id,role_id FROM poms.user_role_assignment WHERE status='active'")
            .fetch_all(&mut *connection)
            .await?;
    let mut assigned_ids = Vec::new();
    for row in assignments {
        if row.try_get::<Uuid, _>("user_id")? == user_id {
            assigned_ids.push(row.try_get::<Uuid, _>("role_id")?);
        }
    }
    if assigned_ids.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }
    let rows = sqlx::query(
        "SELECT id,role_key,name,description,is_active,is_system_role,display_order,row_version,\
         created_at,created_by,updated_at,updated_by FROM poms.role WHERE id=ANY($1)",
    )
    .bind(&assigned_ids)
    .fetch_all(&mut *connection)
    .await?;
    let mut snapshots = Vec::with_capacity(rows.len());
    for row in rows {
        snapshots.push(RoleReadSnapshot {
            id: row.try_get("id")?,
            role_key: row.try_get("role_key")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            is_active: row.try_get("is_active")?,
            is_system_role: row.try_get("is_system_role")?,
            display_order: row.try_get("display_order")?,
            row_version: row.try_get("row_version")?,
            created_at: row.try_get("created_at")?,
            created_by: row.try_get("created_by")?,
            updated_at: row.try_get("updated_at")?,
            updated_by: row.try_get("updated_by")?,
        });
    }
    let active_ids: HashSet<_> = snapshots
        .iter()
        .filter(|role| role.is_active)
        .map(|role| role.id)
        .collect();
    if active_ids.is_empty() {
        return Ok((Vec::new(), snapshots));
    }
    let assignments = sqlx::query(
        "SELECT role_id,permission_key FROM poms.role_permission_assignment WHERE status='active'",
    )
    .fetch_all(connection)
    .await?;
    let mut seen = HashSet::new();
    let mut permissions = Vec::new();
    for row in assignments {
        if active_ids.contains(&row.try_get::<Uuid, _>("role_id")?) {
            let permission: String = row.try_get("permission_key")?;
            if seen.insert(permission.clone()) {
                permissions.push(RawPermission::new(permission));
            }
        }
    }
    Ok((permissions, snapshots))
}

/// Minimal reads for the existing profile projection. Memberships are filtered
/// by assignment status only: inactive orgs and unknown membership strings pass
/// through, just as the TS cast does. Permissions are the resolved caller view.
pub async fn sanitized_profile(
    connection: &mut PgConnection,
    user: &AuthUser,
) -> Result<Option<Value>, sqlx::Error> {
    let roles = sqlx::query(
        "SELECT id,name,is_active FROM poms.role ORDER BY display_order ASC,created_at ASC",
    )
    .fetch_all(&mut *connection)
    .await?;
    let mut role_map = HashMap::new();
    for row in roles {
        role_map.insert(
            row.try_get::<Uuid, _>("id")?,
            (
                row.try_get::<String, _>("name")?,
                row.try_get::<bool, _>("is_active")?,
            ),
        );
    }
    let orgs = sqlx::query("SELECT id,name,code,description FROM poms.org_unit ORDER BY display_order ASC,created_at ASC")
        .fetch_all(&mut *connection).await?;
    let mut org_map = HashMap::new();
    for row in orgs {
        org_map.insert(
            row.try_get::<Uuid, _>("id")?,
            (
                row.try_get::<String, _>("name")?,
                row.try_get::<String, _>("code")?,
                row.try_get::<Option<String>, _>("description")?,
            ),
        );
    }
    let assignments =
        sqlx::query("SELECT user_id,role_id FROM poms.user_role_assignment WHERE status='active'")
            .fetch_all(&mut *connection)
            .await?;
    let mut role_names = Vec::new();
    for row in assignments {
        if row.try_get::<Uuid, _>("user_id")? == user.user_id
            && let Some((name, true)) = role_map.get(&row.try_get::<Uuid, _>("role_id")?)
        {
            role_names.push(name.clone());
        }
    }
    let memberships = sqlx::query("SELECT user_id,org_unit_id,membership_type FROM poms.user_org_membership WHERE status='active'")
        .fetch_all(&mut *connection).await?;
    let mut org_units = Vec::new();
    for row in memberships {
        if row.try_get::<Uuid, _>("user_id")? == user.user_id {
            let id: Uuid = row.try_get("org_unit_id")?;
            if let Some((name, code, description)) = org_map.get(&id) {
                org_units.push(
                    json!({ "id":id, "name":name, "code":code, "description":description,
                    "membershipType":row.try_get::<String, _>("membership_type")? }),
                );
            }
        }
    }
    // Source performs this lookup after its aggregation-context reads.
    let Some(account) = find_account_by_id(connection, user.user_id).await? else {
        return Ok(None);
    };
    let last_login_at = account
        .last_login_at
        .map(js_iso_string)
        .transpose()
        .map_err(|_| invalid_state())?;
    Ok(Some(
        json!({ "id":account.id, "username":account.username, "displayName":account.display_name,
        "roles":role_names, "permissions":user.permissions, "email":account.email, "avatarUrl":account.avatar_url,
        "isActive":account.is_active, "lastLoginAt":last_login_at, "emailVerified":account.email_verified,
        "phoneVerified":account.phone_verified, "phone":account.phone, "orgUnits":org_units }),
    ))
}
