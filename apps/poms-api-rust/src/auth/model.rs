//! Owned authentication state. Database secrets deliberately have no Serialize
//! implementation and all diagnostic representations redact input values.

use std::{error::Error, fmt};

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::{
    compat::permissions::RawPermission,
    database::DbError,
    shared::generated::{AuthSessionErrorCode, AuthSessionRevokedReason, AuthSessionStatus},
};

#[derive(Clone, Default)]
pub struct RequestInfo {
    pub ip: Option<String>,
    pub user_agent: Option<String>,
}

impl fmt::Debug for RequestInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RequestInfo").finish_non_exhaustive()
    }
}

#[derive(Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub username: String,
    pub permissions: Vec<RawPermission>,
}

impl fmt::Debug for AuthUser {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("AuthUser")
            .field("permission_count", &self.permissions.len())
            .finish_non_exhaustive()
    }
}

#[derive(Clone)]
pub struct Session {
    pub id: Uuid,
    pub token_hash: String,
    pub csrf_token_hash: Option<String>,
    pub user_id: Uuid,
    pub status: AuthSessionStatus,
    pub idle_expires_at: DateTime<Utc>,
    pub absolute_expires_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoked_reason: Option<AuthSessionRevokedReason>,
    pub created_ip: Option<String>,
    pub last_ip: Option<String>,
    pub created_user_agent: Option<String>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Session {
    pub fn expires_at(&self) -> DateTime<Utc> {
        self.idle_expires_at.min(self.absolute_expires_at)
    }

    pub fn is_expired_at(&self, now: DateTime<Utc>) -> bool {
        self.idle_expires_at <= now || self.absolute_expires_at <= now
    }
}

impl fmt::Debug for Session {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Session")
            .field("status", &self.status)
            .field("row_version", &self.row_version)
            .finish_non_exhaustive()
    }
}

#[derive(Clone)]
pub struct CreatedSession {
    pub session: Session,
    pub session_token: String,
    pub csrf_token: String,
}

impl fmt::Debug for CreatedSession {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CreatedSession")
            .field("session", &self.session)
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Clone)]
pub struct ResolvedSession {
    pub session: Session,
    pub user: AuthUser,
    /// Original request identity-map Role values, loaded during authorization.
    /// This is not a wire contract, shared cache or persisted session field.
    pub role_snapshots: Vec<RoleReadSnapshot>,
    /// Managed changes are flushed only if this request later persists business
    /// entities or an audit event. Dropping a read result does not flush again.
    pub pending_flush: Option<SessionFlush>,
}

/// The complete Role read performed by the original getPermissionsForUser.
/// Inactive assigned roles are retained even though they grant no permissions.
#[derive(Clone)]
pub struct RoleReadSnapshot {
    pub id: Uuid,
    pub role_key: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub is_system_role: bool,
    pub display_order: i32,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

impl fmt::Debug for RoleReadSnapshot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RoleReadSnapshot")
            .field("row_version", &self.row_version)
            .finish_non_exhaustive()
    }
}

#[derive(Clone, Default)]
pub(crate) struct SessionChanges {
    pub status: Option<AuthSessionStatus>,
    pub csrf_token_hash: Option<Option<String>>,
    pub idle_expires_at: Option<DateTime<Utc>>,
    pub absolute_expires_at: Option<DateTime<Utc>>,
    pub last_seen_at: Option<DateTime<Utc>>,
    pub last_ip: Option<Option<String>>,
    pub revoked_at: Option<Option<DateTime<Utc>>>,
    pub revoked_reason: Option<Option<AuthSessionRevokedReason>>,
}

/// A sealed request-local equivalent of the original managed-entity change
/// set. It is never stored on shared AuthService and has no Serialize impl.
#[derive(Clone)]
pub struct SessionFlush {
    pub(crate) id: Uuid,
    pub(crate) expected_version: i32,
    pub(crate) changes: SessionChanges,
}

impl fmt::Debug for SessionFlush {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SessionFlush")
            .field("expected_version", &self.expected_version)
            .finish_non_exhaustive()
    }
}

impl SessionFlush {
    pub fn session_id(&self) -> Uuid {
        self.id
    }
    pub fn expected_version(&self) -> i32 {
        self.expected_version
    }

    pub(crate) fn between(before: &Session, after: &Session) -> Option<Self> {
        let changes = SessionChanges {
            status: (before.status != after.status).then_some(after.status),
            csrf_token_hash: (before.csrf_token_hash != after.csrf_token_hash)
                .then(|| after.csrf_token_hash.clone()),
            idle_expires_at: (before.idle_expires_at != after.idle_expires_at)
                .then_some(after.idle_expires_at),
            absolute_expires_at: (before.absolute_expires_at != after.absolute_expires_at)
                .then_some(after.absolute_expires_at),
            last_seen_at: (before.last_seen_at != after.last_seen_at).then_some(after.last_seen_at),
            last_ip: (before.last_ip != after.last_ip).then(|| after.last_ip.clone()),
            revoked_at: (before.revoked_at != after.revoked_at).then_some(after.revoked_at),
            revoked_reason: (before.revoked_reason != after.revoked_reason)
                .then_some(after.revoked_reason),
        };
        // MikroORM excludes the version property from comparable props. Its
        // onUpdate hook runs only when a non-version property was dirty.
        let dirty = before.updated_at != after.updated_at
            || changes.status.is_some()
            || changes.csrf_token_hash.is_some()
            || changes.idle_expires_at.is_some()
            || changes.absolute_expires_at.is_some()
            || changes.last_seen_at.is_some()
            || changes.last_ip.is_some()
            || changes.revoked_at.is_some()
            || changes.revoked_reason.is_some();
        dirty.then_some(Self {
            id: after.id,
            expected_version: after.row_version,
            changes,
        })
    }
}

#[derive(Clone)]
pub struct CreatedCsrf {
    pub session: Option<Session>,
    pub user: Option<AuthUser>,
    pub csrf_token: String,
    pub expires_at: DateTime<Utc>,
}

impl fmt::Debug for CreatedCsrf {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CreatedCsrf")
            .field("authenticated", &self.session.is_some())
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthErrorKind {
    Authentication,
    Database,
    Crypto,
    InvalidState,
    Worker,
}

/// No raw SQLx/crypto/worker error or supplied credential is retained.
#[derive(Debug, Clone)]
pub struct AuthError {
    kind: AuthErrorKind,
    code: Option<AuthSessionErrorCode>,
    database: Option<DbError>,
    pending_flush: Option<Box<SessionFlush>>,
}

impl AuthError {
    pub fn authentication(code: AuthSessionErrorCode) -> Self {
        Self {
            kind: AuthErrorKind::Authentication,
            code: Some(code),
            database: None,
            pending_flush: None,
        }
    }

    pub(crate) fn internal(kind: AuthErrorKind) -> Self {
        Self {
            kind,
            code: None,
            database: None,
            pending_flush: None,
        }
    }

    pub fn code(&self) -> Option<AuthSessionErrorCode> {
        self.code
    }
    pub fn kind(&self) -> AuthErrorKind {
        self.kind
    }
    pub fn database_error(&self) -> Option<&DbError> {
        self.database.as_ref()
    }
    pub fn pending_flush(&self) -> Option<&SessionFlush> {
        self.pending_flush.as_deref()
    }
    pub(crate) fn with_pending(mut self, pending: Option<SessionFlush>) -> Self {
        self.pending_flush = pending.map(Box::new);
        self
    }
}

impl From<DbError> for AuthError {
    fn from(error: DbError) -> Self {
        Self {
            kind: AuthErrorKind::Database,
            code: None,
            database: Some(error),
            pending_flush: None,
        }
    }
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.code {
            Some(code) => f.write_str(code.as_str()),
            None => f.write_str("authentication operation failed"),
        }
    }
}

impl Error for AuthError {}

/// JavaScript Date has millisecond resolution. Do not introduce a nanosecond
/// boundary that makes an otherwise equal TS expiry compare differently.
pub(crate) fn clock_now() -> DateTime<Utc> {
    let now = Utc::now();
    DateTime::from_timestamp_millis(now.timestamp_millis()).unwrap_or(now)
}
