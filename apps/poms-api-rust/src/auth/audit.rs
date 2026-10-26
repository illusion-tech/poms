//! Minimal runtime audit inserts. Each default service call commits its own
//! statement. Passing a borrowed SQLx transaction to insert_audit_log explicitly
//! enlists the audit; this module never begins, commits or rolls back one.

use std::fmt;

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgConnection;
use uuid::Uuid;

use super::model::clock_now;
pub use crate::shared::generated::{
    AuditLogResult as AuditResult, SecurityEventResult as SecurityResult,
    SecurityEventSeverity as SecuritySeverity,
};

#[derive(Clone)]
pub struct SecurityEventInput {
    pub event_type: String,
    pub severity: SecuritySeverity,
    pub actor_id: Option<Uuid>,
    pub principal: Option<String>,
    pub request_id: Option<String>,
    pub path: String,
    pub method: Option<String>,
    pub permission_key: Option<String>,
    pub result: SecurityResult,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    pub details: Option<Value>,
    pub occurred_at: Option<DateTime<Utc>>,
}

impl Default for SecurityEventInput {
    fn default() -> Self {
        Self {
            event_type: String::new(),
            severity: SecuritySeverity::Info,
            actor_id: None,
            principal: None,
            request_id: None,
            path: String::new(),
            method: None,
            permission_key: None,
            result: SecurityResult::Blocked,
            ip: None,
            user_agent: None,
            details: None,
            occurred_at: None,
        }
    }
}

impl fmt::Debug for SecurityEventInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SecurityEventInput").finish_non_exhaustive()
    }
}

#[derive(Clone)]
pub struct AuditLogInput {
    pub event_type: String,
    pub target_type: String,
    /// Target identifiers include external/string IDs; do not coerce to UUID.
    pub target_id: String,
    pub operator_id: Option<Uuid>,
    pub request_id: Option<String>,
    pub result: AuditResult,
    pub reason: Option<String>,
    pub before_snapshot: Option<Value>,
    pub after_snapshot: Option<Value>,
    pub metadata: Option<Value>,
    pub occurred_at: Option<DateTime<Utc>>,
}

impl Default for AuditLogInput {
    fn default() -> Self {
        Self {
            event_type: String::new(),
            target_type: String::new(),
            target_id: String::new(),
            operator_id: None,
            request_id: None,
            result: AuditResult::Success,
            reason: None,
            before_snapshot: None,
            after_snapshot: None,
            metadata: None,
            occurred_at: None,
        }
    }
}

impl fmt::Debug for AuditLogInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("AuditLogInput").finish_non_exhaustive()
    }
}

fn occurred_at(value: Option<DateTime<Utc>>) -> Result<DateTime<Utc>, sqlx::Error> {
    let value = value.unwrap_or_else(clock_now);
    DateTime::from_timestamp_millis(value.timestamp_millis())
        .ok_or_else(|| sqlx::Error::Protocol("invalid audit timestamp".into()))
}

pub async fn insert_security_event(
    connection: &mut PgConnection,
    input: &SecurityEventInput,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.security_event \
        (event_type,severity,actor_id,principal,request_id,path,method,permission_key,\
         result,ip,user_agent,details,occurred_at) \
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    )
    .bind(&input.event_type)
    .bind(input.severity.as_str())
    .bind(input.actor_id)
    .bind(&input.principal)
    .bind(&input.request_id)
    .bind(&input.path)
    .bind(&input.method)
    .bind(&input.permission_key)
    .bind(input.result.as_str())
    .bind(&input.ip)
    .bind(&input.user_agent)
    .bind(&input.details)
    .bind(occurred_at(input.occurred_at)?)
    .execute(connection)
    .await?;
    Ok(())
}

pub async fn insert_audit_log(
    connection: &mut PgConnection,
    input: &AuditLogInput,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO poms.audit_log \
        (event_type,target_type,target_id,operator_id,request_id,result,reason,\
         before_snapshot,after_snapshot,metadata,occurred_at) \
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    )
    .bind(&input.event_type)
    .bind(&input.target_type)
    .bind(&input.target_id)
    .bind(input.operator_id)
    .bind(&input.request_id)
    .bind(input.result.as_str())
    .bind(&input.reason)
    .bind(&input.before_snapshot)
    .bind(&input.after_snapshot)
    .bind(&input.metadata)
    .bind(occurred_at(input.occurred_at)?)
    .execute(connection)
    .await?;
    Ok(())
}
