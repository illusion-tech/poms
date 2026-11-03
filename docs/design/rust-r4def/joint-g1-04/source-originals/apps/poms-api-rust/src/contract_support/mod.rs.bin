//! R4 shared business types. All writes borrow the caller's outer transaction.
pub mod http;
pub mod validation;
use crate::{
    approval_common::{CommonFailure, CommonSession, FailureKind},
    auth::{model::ResolvedSession, projection::ProjectionRequestContext},
    error::ApiError,
};
use axum::http::StatusCode;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::{PgConnection, Row};
use uuid::Uuid;

pub struct Actor {
    pub id: Uuid,
    pub request_id: Option<String>,
    pub session: ResolvedSession,
    pub request_context: ProjectionRequestContext,
}

pub enum Error {
    BadRequest(String),
    NotFound(String),
    Conflict(String),
    Unprocessable(String),
    Forbidden(String),
    Selection { ids: Vec<Uuid> },
    CodedConflict { code: &'static str, message: String },
    Database(sqlx::Error),
    Common(CommonFailure),
    Internal,
}

impl std::fmt::Debug for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::BadRequest(_) => "R4BadRequest",
            Self::NotFound(_) => "R4NotFound",
            Self::Conflict(_) | Self::CodedConflict { .. } => "R4Conflict",
            Self::Unprocessable(_) => "R4Unprocessable",
            Self::Forbidden(_) => "R4Forbidden",
            Self::Selection { .. } => "R4ContractSelectionRequired",
            Self::Database(_) | Self::Common(_) | Self::Internal => "R4Internal",
        })
    }
}

impl From<CommonFailure> for Error {
    fn from(value: CommonFailure) -> Self {
        if value.kind == FailureKind::Database
            && value.sqlstate.as_deref() == Some("23505")
            && value
                .constraint
                .as_deref()
                .is_some_and(|name| UNIQUE_CONFLICTS.contains(&name))
        {
            return Self::Conflict("A business record with this identity already exists".into());
        }
        Self::Common(value)
    }
}

const UNIQUE_CONFLICTS: &[&str] = &[
    "invoice_record_invoice_no_unique",
    "contract_contract_no_unique",
    "commercial_release_baseline_project_code_unique",
    "uq_contract_term_snapshot_contract_active",
    "uq_r4_baseline_project_current",
    "uq_r4_readiness_contract_current",
    "uq_r4_preparation_version",
    "uq_r4_preparation_current",
    "uq_r4_preparation_exact",
    "uq_r4_snapshot_source_preparation",
    "contract_review_binding_pkey",
    "uq_r4_plan_contract_version",
    "uq_r4_plan_contract_snapshot",
    "uq_r4_plan_contract_current",
    "uq_r4_plan_node_key",
    "uq_r4_plan_node_order",
    "receivable_plan_init_record_plan_version_id_key",
];

impl From<sqlx::Error> for Error {
    fn from(value: sqlx::Error) -> Self {
        if let Some(database) = value.as_database_error()
            && database.code().as_deref() == Some("23505")
            && database
                .constraint()
                .is_some_and(|name| UNIQUE_CONFLICTS.contains(&name))
        {
            return Self::Conflict("A business record with this identity already exists".into());
        }
        Self::Database(value)
    }
}

impl Error {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Unprocessable(message) => {
                ApiError::message(StatusCode::UNPROCESSABLE_ENTITY, message)
            }
            Self::Forbidden(message) => ApiError::message(StatusCode::FORBIDDEN, message),
            Self::Selection { ids } => ApiError::object(
                StatusCode::CONFLICT,
                json!({
                    "statusCode":409,"error":"Conflict","message":"Select a contract explicitly",
                    "code":"contract_selection_required","candidateContractIds":ids
                }),
            ),
            Self::CodedConflict { code, message } => ApiError::object(
                StatusCode::CONFLICT,
                json!({"statusCode":409,"error":"Conflict","message":message,"code":code}),
            ),
            Self::Common(failure) if failure.kind == FailureKind::Http => {
                let status = failure
                    .status
                    .and_then(|n| StatusCode::from_u16(n).ok())
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                if let Some(code) = failure.code {
                    ApiError::object(
                        status,
                        json!({"statusCode":status.as_u16(),"error":status.canonical_reason().unwrap_or("Error"),"message":failure.message.to_utf8_lossy(),"code":code}),
                    )
                } else {
                    ApiError::message(status, failure.message.to_utf8_lossy())
                }
            }
            Self::Common(_) | Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
    pub fn into_common(self) -> CommonFailure {
        let (status, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, message),
            Self::Conflict(message) => (StatusCode::CONFLICT, message),
            Self::CodedConflict { code, message } => {
                let mut failure = CommonFailure::http(StatusCode::CONFLICT, message.as_str());
                failure.code = Some(code.into());
                return failure;
            }
            Self::Unprocessable(message) => (StatusCode::UNPROCESSABLE_ENTITY, message),
            Self::Forbidden(message) => (StatusCode::FORBIDDEN, message),
            Self::Common(failure) => return failure,
            _ => return CommonFailure::unexpected("Contract business operation failed"),
        };
        CommonFailure::http(status, message.as_str())
    }
}

fn scaled(value: &str, scale: usize, maximum: i128, allow_zero: bool) -> Result<i128, Error> {
    let value = value.trim();
    let mut parts = value.split('.');
    let whole = parts.next().unwrap_or_default();
    let fraction = parts.next();
    if whole.is_empty()
        || !whole.bytes().all(|b| b.is_ascii_digit())
        || parts.next().is_some()
        || fraction.is_some_and(|s| {
            s.is_empty() || s.len() > scale || !s.bytes().all(|b| b.is_ascii_digit())
        })
    {
        return Err(Error::BadRequest(
            "Expected an unsigned finite decimal with valid precision".into(),
        ));
    }
    let whole = whole.trim_start_matches('0');
    // Bound work and capacity by significant digits before integer conversion.
    if whole.len() > 18 {
        return Err(Error::BadRequest(
            "Decimal exceeds its supported capacity".into(),
        ));
    }
    let base = if whole.is_empty() {
        0
    } else {
        whole
            .parse::<i128>()
            .map_err(|_| Error::BadRequest("Invalid decimal".into()))?
    };
    let factor = 10_i128.pow(scale as u32);
    let remainder = fraction
        .map_or(Ok(0), |s| {
            s.parse::<i128>()
                .map(|n| n * 10_i128.pow((scale - s.len()) as u32))
        })
        .map_err(|_| Error::BadRequest("Invalid decimal fraction".into()))?;
    let amount = base
        .checked_mul(factor)
        .and_then(|n| n.checked_add(remainder))
        .ok_or_else(|| Error::BadRequest("Decimal exceeds its supported capacity".into()))?;
    if amount > maximum || (!allow_zero && amount == 0) {
        return Err(Error::BadRequest(
            "Decimal is outside the permitted range".into(),
        ));
    }
    Ok(amount)
}
pub fn money(value: &str) -> Result<i128, Error> {
    scaled(value, 2, 999_999_999_999_999_999, false)
}
pub fn nonnegative_money(value: &str) -> Result<i128, Error> {
    scaled(value, 2, 999_999_999_999_999_999, true)
}
pub fn money_string(cents: i128) -> String {
    let sign = if cents < 0 { "-" } else { "" };
    let value = cents.unsigned_abs();
    format!("{sign}{}.{:02}", value / 100, value % 100)
}
pub fn ratio(value: &str) -> Result<i64, Error> {
    scaled(value, 4, 10_000, true).map(|n| n as i64)
}
pub fn ratio_string(value: i64) -> String {
    format!("{}.{:04}", value / 10_000, value % 10_000)
}

pub fn new_uuid() -> Result<Uuid, Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}
pub fn canonical_hash(value: &Value) -> Result<String, Error> {
    fn ordered(value: &Value) -> Value {
        match value {
            Value::Object(map) => {
                let mut fields = map.iter().collect::<Vec<_>>();
                fields.sort_by(|a, b| a.0.cmp(b.0));
                Value::Object(
                    fields
                        .into_iter()
                        .map(|(k, v)| (k.clone(), ordered(v)))
                        .collect(),
                )
            }
            Value::Array(values) => Value::Array(values.iter().map(ordered).collect()),
            other => other.clone(),
        }
    }
    let bytes = serde_json::to_vec(&ordered(value)).map_err(|_| Error::Internal)?;
    Ok(Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}
pub fn require_uuid(value: &Value, field: &str) -> Result<Uuid, Error> {
    value
        .get(field)
        .and_then(Value::as_str)
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| Error::BadRequest(format!("{field} must be a UUID")))
}
pub fn expected_version(body: &Value, actual: i32, entity: &str) -> Result<(), Error> {
    if let Some(value) = body.get("expectedVersion") {
        let expected = value.as_i64().filter(|n| *n > 0).ok_or_else(|| {
            Error::BadRequest("expectedVersion must be a positive integer".into())
        })?;
        if expected != i64::from(actual) {
            return Err(Error::Conflict(format!("{entity} version mismatch")));
        }
    }
    Ok(())
}
pub async fn lock_project(connection: &mut PgConnection, id: Uuid) -> Result<(), Error> {
    let row = sqlx::query("SELECT id FROM poms.project WHERE id=$1 FOR UPDATE")
        .bind(id)
        .fetch_optional(connection)
        .await?;
    if row.is_none() {
        return Err(Error::NotFound(format!("Project {id} not found")));
    }
    Ok(())
}

pub struct ContractFact {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: String,
    pub signed_amount: String,
    pub currency_code: String,
    pub row_version: i32,
    pub current_snapshot_id: Option<Uuid>,
}
pub async fn contract_fact(
    connection: &mut PgConnection,
    id: Uuid,
    project_scope: Option<Uuid>,
    lock: bool,
) -> Result<Option<ContractFact>, Error> {
    let sql = if lock {
        "SELECT id,project_id,status,signed_amount::text AS signed_amount,currency_code,row_version,current_snapshot_id FROM poms.contract WHERE id=$1 AND ($2::uuid IS NULL OR project_id=$2) FOR UPDATE"
    } else {
        "SELECT id,project_id,status,signed_amount::text AS signed_amount,currency_code,row_version,current_snapshot_id FROM poms.contract WHERE id=$1 AND ($2::uuid IS NULL OR project_id=$2)"
    };
    let row = sqlx::query(sql)
        .bind(id)
        .bind(project_scope)
        .fetch_optional(connection)
        .await?;
    let Some(row) = row else { return Ok(None) };
    let project_id: Uuid = row.try_get("project_id")?;
    if project_scope.is_some_and(|scope| scope != project_id) {
        return Ok(None);
    }
    Ok(Some(ContractFact {
        id: row.try_get("id")?,
        project_id,
        status: row.try_get("status")?,
        signed_amount: row.try_get("signed_amount")?,
        currency_code: row.try_get("currency_code")?,
        row_version: row.try_get("row_version")?,
        current_snapshot_id: row.try_get("current_snapshot_id")?,
    }))
}

pub struct AuditWrite {
    pub operation_id: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub project_id: Uuid,
    pub contract_id: Option<Uuid>,
    pub before: Option<Value>,
    pub after: Option<Value>,
    pub reason: Option<String>,
    pub metadata: Value,
}
pub async fn audit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    input: AuditWrite,
) -> Result<(), Error> {
    audit_identity(session, actor.id, actor.request_id.as_deref(), input).await
}
pub async fn audit_identity(
    session: &mut CommonSession<'_, '_>,
    actor_id: Uuid,
    request_id: Option<&str>,
    input: AuditWrite,
) -> Result<(), Error> {
    let id = new_uuid()?;
    let mut metadata = input.metadata.as_object().cloned().unwrap_or_default();
    metadata.insert("schemaVersion".into(), json!(1));
    metadata.insert("projectId".into(), json!(input.project_id));
    metadata.insert("contractId".into(), json!(input.contract_id));
    metadata.insert("operationId".into(), json!(input.operation_id));
    sqlx::query("INSERT INTO poms.audit_log(id,event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,$6,'success',$7,$8,$9,$10,$11)")
        .bind(id).bind(&input.operation_id).bind(&input.target_type).bind(input.target_id.to_string()).bind(actor_id).bind(request_id)
        .bind(input.reason).bind(input.before).bind(input.after).bind(Value::Object(metadata)).bind(crate::auth::model::clock_now())
        .execute(&mut *session.connection).await?;
    session.state.trace.inserted("audit_log", &id.to_string());
    Ok(())
}

/// Synchronize only an already-loaded immutable snapshot after a typed INSERT.
/// Never detach other identities or erase a queued change set.
pub fn refresh_identity(
    session: &mut CommonSession<'_, '_>,
    table: crate::approval_common::schema::Table,
    id: Uuid,
    fresh: crate::approval_common::js::Data,
) -> Result<(), Error> {
    use crate::approval_common::{js::get, schema::Table};
    if table != Table::ContractTerm {
        return Err(Error::Internal);
    }
    let fresh_id = get(&fresh, "id")
        .as_text()
        .and_then(|v| Uuid::parse_str(&v.to_utf8_lossy()).ok());
    if fresh_id != Some(id) {
        return Err(Error::Internal);
    }
    for entity in &mut session.state.entities {
        let same = entity.managed
            && entity.table == table
            && get(&entity.data, "id")
                .as_text()
                .and_then(|v| Uuid::parse_str(&v.to_utf8_lossy()).ok())
                == Some(id);
        if !same {
            continue;
        }
        if entity.queued || entity.original.as_ref() != Some(&entity.data) {
            return Err(Error::Conflict(
                "Cannot refresh an identity with pending changes".into(),
            ));
        }
        entity.data = fresh.clone();
        entity.original = Some(fresh.clone());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn monetary_capacity_is_exact_and_never_silently_rounded() {
        assert_eq!(
            money("9999999999999999.99").ok(),
            Some(999_999_999_999_999_999)
        );
        assert_eq!(money(" 000001.20 ").ok(), Some(120));
        for value in [
            "0",
            "-1",
            "+1",
            "1.001",
            "1e2",
            "NaN",
            "Infinity",
            "10000000000000000",
            ".1",
            "1.",
            "1,000.00",
        ] {
            assert!(money(value).is_err(), "{value}");
        }
        assert_eq!(nonnegative_money("0").ok(), Some(0));
        assert_eq!(ratio("0.1300").ok(), Some(1300));
        assert!(ratio("0.13001").is_err());
        assert!(ratio("1.0001").is_err());
        assert_eq!(money_string(123), "1.23");
    }
    #[test]
    fn canonical_hash_sorts_objects_and_preserves_ordered_arrays() {
        assert_eq!(
            canonical_hash(&json!({"b":2,"a":1})).ok(),
            canonical_hash(&json!({"a":1,"b":2})).ok()
        );
        assert_ne!(
            canonical_hash(&json!([1, 2])).ok(),
            canonical_hash(&json!([2, 1])).ok()
        );
    }
}
