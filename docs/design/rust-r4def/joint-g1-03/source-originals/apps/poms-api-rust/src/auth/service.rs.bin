//! Authentication composition preserving the existing independent save
//! boundaries. Login/session/audit/profile are not wrapped in one transaction.

use std::time::Duration;

use chrono::{DateTime, TimeDelta, Utc};
use serde_json::Value;
use sqlx::Connection;
use uuid::Uuid;
use zeroize::Zeroizing;

use super::{
    audit::{self, AuditLogInput, SecurityEventInput},
    crypto,
    model::{
        AuthError, AuthErrorKind, AuthUser, CreatedCsrf, CreatedSession, RequestInfo,
        ResolvedSession, RoleReadSnapshot, Session, SessionFlush, clock_now,
    },
    store,
};
use crate::{
    config::AuthConfig,
    database::Database,
    shared::generated::{
        AuthSessionErrorCode as Code, AuthSessionRevokedReason as Reason,
        AuthSessionStatus as Status,
    },
};

#[derive(Clone, Debug)]
pub struct AuthService {
    database: Database,
    config: AuthConfig,
}

impl AuthService {
    pub fn new(database: Database, config: AuthConfig) -> Self {
        Self { database, config }
    }

    pub async fn verify_credentials(
        &self,
        username: &str,
        password: &[u16],
    ) -> Result<Option<AuthUser>, AuthError> {
        let username = username.to_owned();
        let account = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    store::find_active_account_by_username(connection, &username).await
                })
            })
            .await?;
        let Some(account) = account else {
            return Ok(None);
        };
        let user_id = account.id;
        let password_hash = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_password_hash(connection, user_id).await })
            })
            .await?;
        let Some(password_hash) = password_hash else {
            return Ok(None);
        };
        let password = Zeroizing::new(password.to_vec());
        let password_hash = Zeroizing::new(password_hash);
        let valid =
            tokio::task::spawn_blocking(move || crypto::verify_bcryptjs(&password, &password_hash))
                .await
                .map_err(|_| AuthError::internal(AuthErrorKind::Worker))?
                .map_err(|_| AuthError::internal(AuthErrorKind::Crypto))?;
        if !valid {
            return Ok(None);
        }
        let permissions = self.permissions_for_user(account.id).await?;
        Ok(Some(AuthUser {
            user_id: account.id,
            username: account.username,
            permissions,
        }))
    }

    pub async fn permissions_for_user(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<crate::compat::permissions::RawPermission>, AuthError> {
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::permissions_for_user(connection, user_id).await })
            })
            .await?)
    }

    pub async fn resolve_active_auth_user(
        &self,
        user_id: Uuid,
    ) -> Result<Option<AuthUser>, AuthError> {
        Ok(self
            .resolve_active_user_with_roles(user_id)
            .await?
            .map(|(user, _, _)| user))
    }

    async fn resolve_active_user_with_roles(
        &self,
        user_id: Uuid,
    ) -> Result<
        Option<(
            AuthUser,
            Vec<RoleReadSnapshot>,
            super::model::UserReadSnapshot,
        )>,
        AuthError,
    > {
        let account = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_account_by_id(connection, user_id).await })
            })
            .await?;
        let Some(account) = account.filter(|account| account.is_active) else {
            return Ok(None);
        };
        let id = account.id;
        let (permissions, roles) = self
            .database
            .with_connection(move |connection| {
                Box::pin(
                    async move { store::permissions_with_role_snapshots(connection, id).await },
                )
            })
            .await?;
        Ok(Some((
            AuthUser {
                user_id: account.id,
                username: account.username.clone(),
                permissions,
            },
            roles,
            account,
        )))
    }

    pub async fn create_session(
        &self,
        user_id: Uuid,
        info: &RequestInfo,
    ) -> Result<CreatedSession, AuthError> {
        self.create_session_at(user_id, info, clock_now()).await
    }

    pub async fn create_session_at(
        &self,
        user_id: Uuid,
        info: &RequestInfo,
        now: DateTime<Utc>,
    ) -> Result<CreatedSession, AuthError> {
        let now = clip_clock(now)?;
        let session_token = crypto::create_opaque_token()
            .map_err(|_| AuthError::internal(AuthErrorKind::Crypto))?;
        let csrf_token = crypto::create_opaque_token()
            .map_err(|_| AuthError::internal(AuthErrorKind::Crypto))?;
        let token_hash = crypto::hash_token(&session_token);
        let csrf_token_hash = crypto::hash_token(&csrf_token);
        let absolute_expires_at = add_duration(now, self.config.session_absolute_timeout)?;
        let idle_expires_at =
            add_duration(now, self.config.session_idle_timeout)?.min(absolute_expires_at);
        let info = info.clone();
        let session = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    store::create_session(
                        connection,
                        store::NewSession {
                            user_id,
                            token_hash: &token_hash,
                            csrf_token_hash: &csrf_token_hash,
                            now,
                            idle_expires_at,
                            absolute_expires_at,
                            request_info: &info,
                        },
                    )
                    .await
                })
            })
            .await?;
        Ok(CreatedSession {
            session,
            session_token,
            csrf_token,
        })
    }

    pub async fn resolve_session_token(
        &self,
        token: &str,
        info: &RequestInfo,
    ) -> Result<ResolvedSession, AuthError> {
        self.resolve_session_token_at(token, info, clock_now())
            .await
    }

    pub async fn resolve_session_token_at(
        &self,
        token: &str,
        info: &RequestInfo,
        now: DateTime<Utc>,
    ) -> Result<ResolvedSession, AuthError> {
        let now = clip_clock(now)?;
        let mut session = self
            .find_session(token)
            .await?
            .ok_or_else(|| AuthError::authentication(Code::SessionMissing))?;
        let initial = session.clone();
        if session.status == Status::Revoked {
            return Err(AuthError::authentication(Code::SessionRevoked));
        }
        if session.status == Status::Expired || session.is_expired_at(now) {
            if session.status != Status::Expired {
                let id = session.id;
                // A zero-row expire is ignored; the initial error stays expired.
                let snapshot = self
                    .database
                    .with_connection(move |connection| {
                        Box::pin(
                            async move { store::expire_active_session(connection, id, now).await },
                        )
                    })
                    .await?;
                if let Some(snapshot) = snapshot {
                    snapshot.apply_to(&mut session);
                }
            }
            return Err(AuthError::authentication(Code::SessionExpired)
                .with_pending(SessionFlush::between(&initial, &session)));
        }
        let Some((user, role_snapshots, user_snapshot)) =
            self.resolve_active_user_with_roles(session.user_id).await?
        else {
            let id = session.id;
            let snapshot = self
                .database
                .with_connection(move |connection| {
                    Box::pin(async move {
                        store::revoke_active_session(connection, id, Reason::AccountDisabled, now)
                            .await
                    })
                })
                .await?;
            if let Some(snapshot) = snapshot {
                snapshot.apply_to(&mut session);
            }
            return Err(AuthError::authentication(Code::AccountDisabled)
                .with_pending(SessionFlush::between(&initial, &session)));
        };
        let elapsed_seconds =
            (now.timestamp_millis() - session.last_seen_at.timestamp_millis()).div_euclid(1000);
        let throttle_seconds = i64::try_from(self.config.session_last_seen_throttle.as_secs())
            .map_err(|_| AuthError::internal(AuthErrorKind::InvalidState))?;
        if elapsed_seconds >= throttle_seconds {
            let id = session.id;
            let next_idle = add_duration(now, self.config.session_idle_timeout)?;
            let refresh_due_before =
                subtract_duration(now, self.config.session_last_seen_throttle)?;
            let ip = info.ip.clone();
            let touched = self
                .database
                .with_connection(move |connection| {
                    Box::pin(async move {
                        store::touch_last_seen_if_due(
                            connection,
                            id,
                            now,
                            ip.as_deref(),
                            next_idle,
                            refresh_due_before,
                        )
                        .await
                    })
                })
                .await?;
            // Deliberately no reread on a concurrent revoke/expiry losing touch.
            if let Some(touched) = touched {
                touched.apply_to(&mut session);
            }
        }
        let pending_flush = SessionFlush::between(&initial, &session);
        Ok(ResolvedSession {
            session,
            user,
            user_snapshot,
            role_snapshots,
            pending_flush,
        })
    }

    pub async fn refresh_csrf_token(
        &self,
        token: Option<&str>,
        info: &RequestInfo,
    ) -> Result<CreatedCsrf, AuthError> {
        self.refresh_csrf_token_at(token, info, clock_now()).await
    }

    pub async fn refresh_csrf_token_at(
        &self,
        token: Option<&str>,
        info: &RequestInfo,
        now: DateTime<Utc>,
    ) -> Result<CreatedCsrf, AuthError> {
        let now = clip_clock(now)?;
        let Some(token) = token.filter(|token| !token.is_empty()) else {
            return self.create_anonymous_csrf_token_at(now);
        };
        let mut resolved = self.resolve_session_token_at(token, info, now).await?;
        let csrf_token = crypto::create_opaque_token()
            .map_err(|_| AuthError::internal(AuthErrorKind::Crypto))?;
        let csrf_token_hash = crypto::hash_token(&csrf_token);
        let id = resolved.session.id;
        let rotated = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    store::rotate_csrf_token_for_active_session(
                        connection,
                        id,
                        &csrf_token_hash,
                        now,
                    )
                    .await
                })
            })
            .await?;
        let Some(rotated) = rotated else {
            return Err(self.current_session_error(id, now).await?);
        };
        rotated.apply_to(&mut resolved.session);
        let expires_at = resolved.session.expires_at();
        Ok(CreatedCsrf {
            session: Some(resolved.session),
            user: Some(resolved.user),
            csrf_token,
            expires_at,
        })
    }

    pub fn create_anonymous_csrf_token(&self) -> Result<CreatedCsrf, AuthError> {
        self.create_anonymous_csrf_token_at(clock_now())
    }

    pub fn create_anonymous_csrf_token_at(
        &self,
        now: DateTime<Utc>,
    ) -> Result<CreatedCsrf, AuthError> {
        Ok(CreatedCsrf {
            session: None,
            user: None,
            csrf_token: crypto::create_opaque_token()
                .map_err(|_| AuthError::internal(AuthErrorKind::Crypto))?,
            // Source uses idle timeout even if absolute timeout is shorter.
            expires_at: add_duration(clip_clock(now)?, self.config.session_idle_timeout)?,
        })
    }

    pub fn verify_csrf_token(&self, session: &Session, token: &str) -> bool {
        crypto::verify_csrf_hash(session.csrf_token_hash.as_deref(), token)
    }

    pub async fn revoke_session_token(&self, token: &str) -> Result<bool, AuthError> {
        self.revoke_session_token_at(token, Reason::Logout, clock_now())
            .await
    }

    pub async fn revoke_session_token_at(
        &self,
        token: &str,
        reason: Reason,
        now: DateTime<Utc>,
    ) -> Result<bool, AuthError> {
        let Some(session) = self.find_session(token).await? else {
            return Ok(false);
        };
        if session.status != Status::Active {
            return Ok(false);
        }
        let id = session.id;
        let now = clip_clock(now)?;
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(
                    async move { store::revoke_active_session(connection, id, reason, now).await },
                )
            })
            .await?
            .is_some())
    }

    pub async fn revoke_active_user_sessions(
        &self,
        user_id: Uuid,
        reason: Reason,
    ) -> Result<usize, AuthError> {
        self.revoke_active_user_sessions_at(user_id, reason, clock_now())
            .await
    }

    pub async fn revoke_active_user_sessions_at(
        &self,
        user_id: Uuid,
        reason: Reason,
        now: DateTime<Utc>,
    ) -> Result<usize, AuthError> {
        let now = clip_clock(now)?;
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    store::revoke_active_sessions_for_user(connection, user_id, reason, now).await
                })
            })
            .await?)
    }

    pub async fn profile(&self, user: &AuthUser) -> Result<Option<Value>, AuthError> {
        let user = user.clone();
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::sanitized_profile(connection, &user).await })
            })
            .await?)
    }

    pub async fn record_security_event(&self, input: SecurityEventInput) -> Result<(), AuthError> {
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { audit::insert_security_event(connection, &input).await })
            })
            .await?)
    }

    /// Match one original ORM flush: CREATE(event), UPDATE(dirty managed
    /// session), optimistic check and commit share one explicit transaction.
    /// The preceding raw session write has already committed independently.
    pub async fn record_security_event_with_session(
        &self,
        input: SecurityEventInput,
        pending: Option<&SessionFlush>,
    ) -> Result<(), AuthError> {
        let Some(pending) = pending.cloned() else {
            return self.record_security_event(input).await;
        };
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        audit::insert_security_event(&mut transaction, &input).await?;
                        store::flush_managed_session(&mut transaction, &pending).await
                    }
                    .await;
                    if let Err(error) = result {
                        transaction.rollback().await?;
                        return Err(error);
                    }
                    transaction.commit().await?;
                    Ok(())
                })
            })
            .await?)
    }

    pub async fn record_audit_log(&self, input: AuditLogInput) -> Result<(), AuthError> {
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { audit::insert_audit_log(connection, &input).await })
            })
            .await?)
    }

    /// Match one original business audit flush, as observed by the R2A Nest
    /// witness: INSERT the audit before an optional managed-session CAS UPDATE.
    /// Both belong to this transaction; preceding raw touch remains committed.
    pub async fn record_audit_log_with_session(
        &self,
        input: AuditLogInput,
        pending: Option<&SessionFlush>,
    ) -> Result<(), AuthError> {
        let pending = pending.cloned();
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(), sqlx::Error> = async {
                        audit::insert_audit_log(&mut transaction, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            store::flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(())
                    }
                    .await;
                    if let Err(error) = result {
                        transaction.rollback().await?;
                        return Err(error);
                    }
                    transaction.commit().await?;
                    Ok(())
                })
            })
            .await?)
    }

    async fn find_session(&self, token: &str) -> Result<Option<Session>, AuthError> {
        let token_hash = crypto::hash_token(token);
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_by_token_hash(connection, &token_hash).await })
            })
            .await?)
    }

    async fn current_session_error(
        &self,
        id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<AuthError, AuthError> {
        let current = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_write_snapshot_by_id(connection, id).await })
            })
            .await?;
        let code = match current {
            None => Code::SessionMissing,
            Some(snapshot) if snapshot.status == Status::Revoked => Code::SessionRevoked,
            Some(snapshot) if snapshot.status == Status::Expired || snapshot.is_expired_at(now) => {
                Code::SessionExpired
            }
            Some(_) => Code::SessionRevoked,
        };
        Ok(AuthError::authentication(code))
    }
}

fn clip_clock(now: DateTime<Utc>) -> Result<DateTime<Utc>, AuthError> {
    DateTime::from_timestamp_millis(now.timestamp_millis())
        .ok_or_else(|| AuthError::internal(AuthErrorKind::InvalidState))
}

fn add_duration(now: DateTime<Utc>, duration: Duration) -> Result<DateTime<Utc>, AuthError> {
    let delta = TimeDelta::from_std(duration)
        .map_err(|_| AuthError::internal(AuthErrorKind::InvalidState))?;
    now.checked_add_signed(delta)
        .ok_or_else(|| AuthError::internal(AuthErrorKind::InvalidState))
}

fn subtract_duration(now: DateTime<Utc>, duration: Duration) -> Result<DateTime<Utc>, AuthError> {
    let delta = TimeDelta::from_std(duration)
        .map_err(|_| AuthError::internal(AuthErrorKind::InvalidState))?;
    now.checked_sub_signed(delta)
        .ok_or_else(|| AuthError::internal(AuthErrorKind::InvalidState))
}
