//! Exact read filters over the existing audit tables. No migrations or writers.

use chrono::{DateTime, Utc};
use serde_json::{Value, value::RawValue};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::{AuditLogSummary, SecurityEventSummary};
use crate::{
    auth::js_json::JsObject,
    compat::scalars::{js_iso_string, js_number_string},
};

#[derive(Debug, Clone, Default)]
pub(crate) struct AuditFilter {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub event_type: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub operator_id: Option<String>,
    pub result: Option<String>,
    pub limit: i64,
}

#[derive(Debug, Clone, Default)]
pub(crate) struct SecurityFilter {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub event_type: Option<String>,
    pub actor_id: Option<String>,
    pub principal: Option<String>,
    pub path: Option<String>,
    pub permission_key: Option<String>,
    pub result: Option<String>,
    pub limit: i64,
}

fn invalid_json() -> sqlx::Error {
    sqlx::Error::Protocol("runtime audit JSON could not be decoded".into())
}

// node-postgres JSON.parse uses JS Number before the original service returns
// snapshots. Keep this decoding behavior, including unsafe integers and values
// that JSON.stringify maps from Infinity to null; this does not remove fields.
fn node_json(raw: &RawValue) -> Result<Value, sqlx::Error> {
    match raw.get().as_bytes().first() {
        Some(b'{') => {
            let object = JsObject::parse(raw.get()).map_err(|_| invalid_json())?;
            object
                .entries()
                .map(|(key, value)| Ok((key.to_utf8_lossy(), node_json(value)?)))
                .collect::<Result<serde_json::Map<_, _>, sqlx::Error>>()
                .map(Value::Object)
        }
        Some(b'[') => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| invalid_json())?
            .into_iter()
            .map(node_json)
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        Some(b'"' | b't' | b'f' | b'n') => {
            serde_json::from_str(raw.get()).map_err(|_| invalid_json())
        }
        _ => {
            let number = raw.get().parse::<f64>().map_err(|_| invalid_json())?;
            if number.is_finite() {
                serde_json::from_str(&js_number_string(number)).map_err(|_| invalid_json())
            } else {
                Ok(Value::Null)
            }
        }
    }
}
fn json_column(row: &PgRow, name: &str) -> Result<Option<Value>, sqlx::Error> {
    row.try_get::<Option<String>, _>(name)?
        .map(|raw| {
            let value: &RawValue = serde_json::from_str(&raw).map_err(|_| invalid_json())?;
            node_json(value)
        })
        .transpose()
}
fn timestamp(row: &PgRow) -> Result<String, sqlx::Error> {
    js_iso_string(row.try_get::<DateTime<Utc>, _>("occurred_at")?)
        .map_err(|_| sqlx::Error::Protocol("runtime audit timestamp could not be decoded".into()))
}
fn optional_uuid(row: &PgRow, name: &str) -> Result<Option<String>, sqlx::Error> {
    Ok(row
        .try_get::<Option<Uuid>, _>(name)?
        .map(|id| id.to_string()))
}

fn audit(row: PgRow) -> Result<AuditLogSummary, sqlx::Error> {
    Ok(AuditLogSummary {
        id: row.try_get::<Uuid, _>("id")?.to_string(),
        event_type: row.try_get("event_type")?,
        target_type: row.try_get("target_type")?,
        target_id: row.try_get("target_id")?,
        operator_id: optional_uuid(&row, "operator_id")?,
        request_id: row.try_get("request_id")?,
        result: row.try_get("result")?,
        reason: row.try_get("reason")?,
        before_snapshot: json_column(&row, "before_snapshot")?,
        after_snapshot: json_column(&row, "after_snapshot")?,
        metadata: json_column(&row, "metadata")?,
        occurred_at: timestamp(&row)?,
    })
}
fn security(row: PgRow) -> Result<SecurityEventSummary, sqlx::Error> {
    Ok(SecurityEventSummary {
        id: row.try_get::<Uuid, _>("id")?.to_string(),
        event_type: row.try_get("event_type")?,
        severity: row.try_get("severity")?,
        actor_id: optional_uuid(&row, "actor_id")?,
        principal: row.try_get("principal")?,
        request_id: row.try_get("request_id")?,
        path: row.try_get("path")?,
        method: row.try_get("method")?,
        permission_key: row.try_get("permission_key")?,
        result: row.try_get("result")?,
        ip: row.try_get("ip")?,
        user_agent: row.try_get("user_agent")?,
        details: json_column(&row, "details")?,
        occurred_at: timestamp(&row)?,
    })
}

pub(crate) async fn audit_logs(
    connection: &mut PgConnection,
    filter: &AuditFilter,
) -> Result<Vec<AuditLogSummary>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(
        "SELECT id,event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot::text AS before_snapshot,after_snapshot::text AS after_snapshot,metadata::text AS metadata,occurred_at FROM poms.audit_log WHERE true",
    );
    if let Some(value) = &filter.event_type {
        query.push(" AND event_type=").push_bind(value);
    }
    if let Some(value) = &filter.target_type {
        query.push(" AND target_type=").push_bind(value);
    }
    if let Some(value) = &filter.target_id {
        query.push(" AND target_id=").push_bind(value);
    }
    if let Some(value) = &filter.operator_id {
        query
            .push(" AND operator_id=")
            .push_bind(value)
            .push("::text::uuid");
    }
    if let Some(value) = &filter.result {
        query.push(" AND result=").push_bind(value);
    }
    if let Some(value) = filter.from {
        query.push(" AND occurred_at>=").push_bind(value);
    }
    if let Some(value) = filter.to {
        query.push(" AND occurred_at<=").push_bind(value);
    }
    query
        .push(" ORDER BY occurred_at DESC LIMIT ")
        .push_bind(filter.limit);
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(audit)
        .collect()
}

pub(crate) async fn security_events(
    connection: &mut PgConnection,
    filter: &SecurityFilter,
) -> Result<Vec<SecurityEventSummary>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(
        "SELECT id,event_type,severity,actor_id,principal,request_id,path,method,permission_key,result,ip,user_agent,details::text AS details,occurred_at FROM poms.security_event WHERE true",
    );
    if let Some(value) = &filter.event_type {
        query.push(" AND event_type=").push_bind(value);
    }
    if let Some(value) = &filter.actor_id {
        query
            .push(" AND actor_id=")
            .push_bind(value)
            .push("::text::uuid");
    }
    if let Some(value) = &filter.principal {
        query.push(" AND principal=").push_bind(value);
    }
    if let Some(value) = &filter.path {
        query.push(" AND path=").push_bind(value);
    }
    if let Some(value) = &filter.permission_key {
        query.push(" AND permission_key=").push_bind(value);
    }
    if let Some(value) = &filter.result {
        query.push(" AND result=").push_bind(value);
    }
    if let Some(value) = filter.from {
        query.push(" AND occurred_at>=").push_bind(value);
    }
    if let Some(value) = filter.to {
        query.push(" AND occurred_at<=").push_bind(value);
    }
    query
        .push(" ORDER BY occurred_at DESC LIMIT ")
        .push_bind(filter.limit);
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(security)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stored_json_uses_original_node_number_semantics_without_filtering_members() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-behavior.json"))
                .unwrap_or_else(|_| panic!("behavior"));
        for case in source["numberJson"]
            .as_array()
            .unwrap_or_else(|| panic!("number cases"))
        {
            let raw: &RawValue =
                serde_json::from_str(case["inputRaw"].as_str().unwrap_or_default())
                    .unwrap_or_else(|_| panic!("raw JSON"));
            let expected: Value =
                serde_json::from_str(case["expectedRaw"].as_str().unwrap_or_default())
                    .unwrap_or_else(|_| panic!("expected JSON"));
            assert_eq!(node_json(raw).ok(), Some(expected));
        }
    }
}
