use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{Value, json};
use sqlx::PgConnection;
use uuid::Uuid;

use super::terms::{id, text};
use crate::contract_support::{Error, canonical_hash, money, money_string};

pub(super) async fn baseline(c: &mut PgConnection, key: Uuid, lock: bool) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(b)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text,'amount_tax_exclusive',amount_tax_exclusive::text,'tax_rate',tax_rate::text,'down_payment_rate',down_payment_rate::text,'retention_rate',retention_rate::text) FROM poms.commercial_release_baseline b WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(b)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text,'amount_tax_exclusive',amount_tax_exclusive::text,'tax_rate',tax_rate::text,'down_payment_rate',down_payment_rate::text,'retention_rate',retention_rate::text) FROM poms.commercial_release_baseline b WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(key)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Commercial release baseline not found".into()))
}
pub(super) async fn package(c: &mut PgConnection, key: Uuid, lock: bool) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(p) FROM poms.contract_readiness_package p WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(p) FROM poms.contract_readiness_package p WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(key)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Contract readiness package not found".into()))
}
pub(super) async fn diff(c: &mut PgConnection, key: Uuid, lock: bool) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(d) FROM poms.commercial_baseline_diff_result d WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(d) FROM poms.commercial_baseline_diff_result d WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(key)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Commercial baseline diff not found".into()))
}
pub(super) async fn preparation(
    c: &mut PgConnection,
    key: Uuid,
    lock: bool,
) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(p)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text,'amount_tax_exclusive',amount_tax_exclusive::text,'tax_rate',tax_rate::text,'down_payment_rate',down_payment_rate::text,'retention_rate',retention_rate::text) FROM poms.contract_term_preparation p WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(p)||jsonb_build_object('amount_tax_inclusive',amount_tax_inclusive::text,'amount_tax_exclusive',amount_tax_exclusive::text,'tax_rate',tax_rate::text,'down_payment_rate',down_payment_rate::text,'retention_rate',retention_rate::text) FROM poms.contract_term_preparation p WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(key)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Contract term preparation not found".into()))
}
pub(super) fn rv(row: &Value) -> Result<i32, Error> {
    row.get("row_version")
        .and_then(Value::as_i64)
        .and_then(|n| i32::try_from(n).ok())
        .ok_or(Error::Internal)
}
pub(super) fn expected(row: &Value, body: &Value) -> Result<(), Error> {
    crate::contract_support::expected_version(body, rv(row)?, "Readiness resource")
}
pub(super) fn iso(value: &Value) -> Value {
    value
        .as_str()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| {
            json!(
                d.with_timezone(&Utc)
                    .to_rfc3339_opts(SecondsFormat::Millis, true)
            )
        })
        .unwrap_or(Value::Null)
}
pub(super) fn ready(diff: &Value) -> bool {
    diff["diff_level"] == "prompt"
        || (diff["diff_level"] == "review-required" && diff["review_status"] == "approved")
}
pub(super) async fn core(c: &mut PgConnection, contract: Uuid) -> Result<Value, Error> {
    let v:Value=sqlx::query_scalar("SELECT jsonb_build_object('projectId',project_id,'customerContractNo',customer_contract_no,'signedAmount',signed_amount::text,'currencyCode',currency_code,'signedAt',signed_at,'retentionDueDate',retention_due_date) FROM poms.contract WHERE id=$1")
        .bind(contract).fetch_optional(c).await?.ok_or_else(||Error::NotFound("Contract not found".into()))?;
    let mut value = v;
    value["signedAmount"] = json!(money_string(money(text(&value, "signedAmount")?)?));
    value["signedAt"] = iso(&value["signedAt"]);
    Ok(value)
}
pub(super) async fn core_hash(c: &mut PgConnection, contract: Uuid) -> Result<String, Error> {
    canonical_hash(&core(c, contract).await?)
}
pub(super) fn baseline_source(row: &Value) -> Value {
    json!({"projectId":row["project_id"],"currencyCode":row["currency_code"],
        "amountTaxInclusive":row["amount_tax_inclusive"],"amountTaxExclusive":row["amount_tax_exclusive"],
        "taxRate":row["tax_rate"],"grossMarginSummary":row["gross_margin_summary"],
        "paymentTermsSummary":row["payment_terms_summary"],"paymentTerms":row["payment_terms"],
        "downPaymentRate":row["down_payment_rate"],"retentionRate":row["retention_rate"]})
}
pub(super) fn reference(row: &Value, contract: Uuid) -> Result<Value, Error> {
    let mut found = None;
    for terms in row["contract_terms"].as_array().ok_or(Error::Internal)? {
        if id(terms, "contractId")? == contract {
            if found.is_some() {
                return Err(Error::BadRequest(
                    "Duplicate contract reference terms".into(),
                ));
            }
            found = Some(terms.clone());
        }
    }
    found.ok_or_else(|| {
        Error::BadRequest("Baseline lacks explicit reference terms for this contract".into())
    })
}
pub(super) fn preparation_summary(p: &Value) -> Value {
    json!({"preparationId":p["id"],"projectId":p["project_id"],"contractId":p["contract_id"],
        "version":p["version"],"rowVersion":p["row_version"],"status":p["status"],"isCurrent":p["is_current"],
        "sourceReadinessId":p["source_readiness_id"],"sourceBaselineId":p["source_baseline_id"],"sourceDiffResultId":p["source_diff_result_id"],
        "payloadHash":p["payload_hash"],"preparedAt":iso(&p["prepared_at"]),"preparedBy":p["prepared_by"],
        "activatedSnapshotId":p["activated_snapshot_id"],"activatedAt":iso(&p["activated_at"])})
}
pub(super) fn prep_terms(p: &Value) -> Value {
    json!({"contractId":p["contract_id"],"amountTaxInclusive":p["amount_tax_inclusive"],"amountTaxExclusive":p["amount_tax_exclusive"],
        "taxRate":p["tax_rate"],"downPaymentRate":p["down_payment_rate"],"retentionRate":p["retention_rate"],
        "retentionDueDate":p["retention_due_date"],"paymentTerms":p["payment_terms"],"receivablePlanSeeds":p["receivable_plan_seeds"]})
}
pub(super) fn payload(
    project: Uuid,
    contract: Uuid,
    core_hash: &str,
    terms: &Value,
    facts: &Value,
    diff: &Value,
) -> Result<String, Error> {
    canonical_hash(
        &json!({"projectId":project,"contractId":contract,"contractCoreHash":core_hash,"terms":terms,"sourceFacts":facts,
        "approvedDiff":{"id":diff["id"],"diffLevel":diff["diff_level"],"reviewStatus":diff["review_status"],"payloadHash":diff["payload_hash"]}}),
    )
}
