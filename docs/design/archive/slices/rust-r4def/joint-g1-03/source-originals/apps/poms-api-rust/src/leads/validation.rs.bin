//! Public Lead contracts with lossless persisted-text validation.

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json, value::RawValue};

use super::model::*;
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::{
        json::Field,
        scalars::{NumberInput, js_number_string, legacy_number},
    },
    customer_contacts::validation::{enumeration, uuid},
    dictionary::validation::{
        failure, integer, invalid_type, json_type, object, text as contract_text,
    },
    error::ApiError,
    opportunity_context::validation::storable_text_error,
};

fn text(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    trim: bool,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ApiError> {
    if let Some(raw) = object.get(key) {
        let Ok(value) = decode_string(raw.get()) else {
            errors.push(invalid_type(
                "string",
                json_type(Some(raw)),
                vec![json!(key)],
            ));
            return Ok(None);
        };
        if let Some(issue) = storable_text_error(&value, vec![json!(key)]) {
            errors.push(issue);
            return Ok(None);
        }
    }
    contract_text(object, key, required, trim, min, max, errors)
}

fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ApiError> {
    match object.get(key) {
        None => Ok(Field::Missing),
        Some(raw) if raw.get() == "null" => Ok(Field::Null),
        Some(_) => {
            Ok(text(object, key, false, true, min, max, errors)?
                .map_or(Field::Missing, Field::Value))
        }
    }
}

const BUDGET: &[&str] = &[
    "unknown",
    "no-budget",
    "rough-budget",
    "budget-confirmed",
    "budget-approved",
];
const URGENCY: &[&str] = &["low", "normal", "high", "critical"];
const RATING: &[&str] = &["A", "B", "C", "D"];
const SCOPES: &[&str] = &[
    "active",
    "registered",
    "qualified",
    "ready-to-convert",
    "blocked-conversion",
    "converted",
    "closed",
    "all",
];
const DATE_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))$/";
const DATETIME_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/";

fn optional_uuid(o: &JsObject<'_>, key: &str, errors: &mut Vec<Value>) -> Option<String> {
    match uuid(o, key, false, false, errors) {
        Field::Value(value) => Some(value),
        _ => None,
    }
}

fn source(
    o: &JsObject<'_>,
    required: bool,
    errors: &mut Vec<Value>,
) -> Result<Option<String>, ApiError> {
    let value = text(o, "sourceCode", required, true, 1, 64, errors)?;
    if let Some(value) = value.as_ref() {
        let units = value.as_code_units();
        if units
            .first()
            .is_none_or(|unit| !matches!(*unit, 0x61..=0x7a))
            || units
                .iter()
                .any(|unit| !matches!(*unit,0x61..=0x7a|0x30..=0x39|0x2d))
        {
            errors.push(json!({"origin":"string","code":"invalid_format","format":"regex","pattern":"/^[a-z][a-z0-9-]*$/","path":["sourceCode"],"message":"Dictionary code must use lower kebab-case"}));
        }
    }
    Ok(value.map(|value| value.to_utf8_lossy()))
}

fn amount(o: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<String> {
    let Some(raw) = o.get("estimatedAmount") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("estimatedAmount")],
        ));
        return Field::Missing;
    };
    let value = trim_js(value).to_utf8_lossy();
    let parts = value.split('.').collect::<Vec<_>>();
    if parts.is_empty()
        || parts.len() > 2
        || parts[0].is_empty()
        || !parts[0].bytes().all(|b| b.is_ascii_digit())
        || (parts.len() == 2
            && (parts[1].is_empty()
                || parts[1].len() > 2
                || !parts[1].bytes().all(|b| b.is_ascii_digit())))
    {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"regex","pattern":r"/^\d+(\.\d{1,2})?$/","path":["estimatedAmount"],"message":r"Invalid string: must match pattern /^\d+(\.\d{1,2})?$/"}));
    } else if parts[0].trim_start_matches('0').len() > 16 {
        // numeric(18,2) allows sixteen integer digits. Compare decimal text,
        // never f64: leading zeros are harmless and 2^53 is not this limit.
        errors.push(json!({"code":"custom","path":["estimatedAmount"],"message":"Estimated amount must not exceed 9999999999999999.99"}));
    }
    Field::Value(value)
}

fn valid_date(value: &str) -> Option<NaiveDate> {
    let b = value.as_bytes();
    if b.len() != 10
        || b[4] != b'-'
        || b[7] != b'-'
        || !b
            .iter()
            .enumerate()
            .all(|(i, b)| i == 4 || i == 7 || b.is_ascii_digit())
    {
        return None;
    }
    let year = value[..4].parse().ok()?;
    if !(1..=9999).contains(&year) {
        return None;
    }
    NaiveDate::from_ymd_opt(year, value[5..7].parse().ok()?, value[8..10].parse().ok()?)
}

fn date(o: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<String> {
    let Some(raw) = o.get("expectedDecisionDate") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("expectedDecisionDate")],
        ));
        return Field::Missing;
    };
    let value = value.to_utf8_lossy();
    if value.starts_with("0000-") {
        errors.push(json!({"code":"custom","path":["expectedDecisionDate"],"message":"Business date year must be between 0001 and 9999"}));
    } else if valid_date(&value).is_none() {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"date","pattern":DATE_PATTERN,"path":["expectedDecisionDate"],"message":"Invalid ISO date"}));
    }
    Field::Value(value)
}

fn parse_datetime(value: &str) -> Option<DateTime<Utc>> {
    let b = value.as_bytes();
    if !value.is_ascii()
        || b.len() < 20
        || b[10] != b'T'
        || b[13] != b':'
        || b[16] != b':'
        || b.last() != Some(&b'Z')
    {
        return None;
    }
    if ![11..13, 14..16, 17..19]
        .into_iter()
        .all(|range| b[range].iter().all(u8::is_ascii_digit))
    {
        return None;
    }
    let fraction = &value[19..value.len() - 1];
    let millis = if fraction.is_empty() {
        0
    } else {
        let digits = fraction.strip_prefix('.')?;
        if digits.is_empty() || !digits.bytes().all(|byte| byte.is_ascii_digit()) {
            return None;
        }
        digits
            .bytes()
            .take(3)
            .enumerate()
            .map(|(i, byte)| u32::from(byte - b'0') * [100, 10, 1][i])
            .sum()
    };
    valid_date(&value[..10])?
        .and_hms_milli_opt(
            value[11..13].parse().ok()?,
            value[14..16].parse().ok()?,
            value[17..19].parse().ok()?,
            millis,
        )
        .map(|date| date.and_utc())
}

fn datetime(o: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<DateTime<Utc>> {
    let Some(raw) = o.get("plannedSignAt") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("plannedSignAt")],
        ));
        return Field::Missing;
    };
    let value = value.to_utf8_lossy();
    if value.starts_with("0000-") {
        errors.push(json!({"code":"custom","path":["plannedSignAt"],"message":"Business date year must be between 0001 and 9999"}));
        return Field::Missing;
    }
    match parse_datetime(&value) {
        Some(value) => Field::Value(value),
        None => {
            errors.push(json!({"origin":"string","code":"invalid_format","format":"datetime","pattern":DATETIME_PATTERN,"path":["plannedSignAt"],"message":"Invalid ISO datetime"}));
            Field::Missing
        }
    }
}

fn required_integer(
    o: &JsObject<'_>,
    key: &str,
    minimum: i64,
    errors: &mut Vec<Value>,
) -> Option<i64> {
    if o.get(key).is_none() {
        errors.push(invalid_type("number", "undefined", vec![json!(key)]));
        return None;
    }
    integer(o, key, Some(minimum), errors)
}

pub fn validate_create(raw: Option<&str>) -> Result<Create, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let lead_name = text(&o, "leadName", true, true, 1, 255, &mut errors)?;
    let customer_id = uuid(&o, "customerId", true, false, &mut errors);
    let source_code = source(&o, true, &mut errors)?;
    let demand_description = text(&o, "demandDescription", true, true, 1, 4000, &mut errors)?;
    let budget_status = enumeration(&o, "budgetStatus", true, BUDGET, &mut errors);
    let estimated_amount = amount(&o, &mut errors);
    let urgency = enumeration(&o, "urgency", true, URGENCY, &mut errors);
    let expected_decision_date = date(&o, &mut errors);
    let owner_org_id = uuid(&o, "ownerOrgId", false, true, &mut errors);
    let owner_user_id = uuid(&o, "ownerUserId", false, true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (
        lead_name,
        customer_id,
        source_code,
        demand_description,
        budget_status,
        urgency,
    ) {
        (
            Some(lead_name),
            Field::Value(customer_id),
            Some(source_code),
            Some(demand_description),
            Some(budget_status),
            Some(urgency),
        ) => Ok(Create {
            lead_name,
            customer_id,
            source_code,
            demand_description,
            budget_status,
            estimated_amount,
            urgency,
            expected_decision_date,
            owner_org_id,
            owner_user_id,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update(raw: Option<&str>) -> Result<Update, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let lead_name = text(&o, "leadName", false, true, 1, 255, &mut errors)?;
    let customer_id = optional_uuid(&o, "customerId", &mut errors);
    let source_code = source(&o, false, &mut errors)?;
    let demand_description = text(&o, "demandDescription", false, true, 1, 4000, &mut errors)?;
    let budget_status = enumeration(&o, "budgetStatus", false, BUDGET, &mut errors);
    let estimated_amount = amount(&o, &mut errors);
    let urgency = enumeration(&o, "urgency", false, URGENCY, &mut errors);
    let expected_decision_date = date(&o, &mut errors);
    let expected_version = integer(&o, "expectedVersion", Some(1), &mut errors);
    let has_business = [
        "leadName",
        "customerId",
        "sourceCode",
        "demandDescription",
        "budgetStatus",
        "estimatedAmount",
        "urgency",
        "expectedDecisionDate",
    ]
    .iter()
    .any(|key| o.get(key).is_some());
    let aborted = errors.iter().any(|error| {
        matches!(
            error["code"].as_str(),
            Some("invalid_type" | "invalid_value")
        )
    });
    if !has_business && !aborted {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Update {
        lead_name,
        customer_id,
        source_code,
        demand_description,
        budget_status,
        estimated_amount,
        urgency,
        expected_decision_date,
        expected_version,
    })
}

pub fn validate_claim(raw: Option<&str>) -> Result<Claim, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let expected_version = integer(&o, "expectedVersion", Some(1), &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Claim { expected_version })
}

pub fn validate_assign(raw: Option<&str>) -> Result<Assign, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let owner_user_id = uuid(&o, "ownerUserId", true, false, &mut errors);
    let owner_org_id = uuid(&o, "ownerOrgId", false, true, &mut errors);
    let reason = text(&o, "reason", true, true, 1, 1000, &mut errors)?;
    let expected_version = integer(&o, "expectedVersion", Some(1), &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (owner_user_id, reason) {
        (Field::Value(owner_user_id), Some(reason)) => Ok(Assign {
            owner_user_id,
            owner_org_id,
            reason,
            expected_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_qualify(raw: Option<&str>) -> Result<Qualify, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let qualification_summary = text(&o, "qualificationSummary", true, true, 1, 2000, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    qualification_summary
        .map(|qualification_summary| Qualify {
            qualification_summary,
        })
        .ok_or_else(ApiError::internal)
}

pub fn validate_close(raw: Option<&str>) -> Result<Close, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let closed_reason = text(&o, "closedReason", true, true, 1, 1000, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    closed_reason
        .map(|closed_reason| Close { closed_reason })
        .ok_or_else(ApiError::internal)
}

pub fn validate_convert(raw: Option<&str>) -> Result<Convert, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let project_name = text(&o, "projectName", false, true, 1, 255, &mut errors)?;
    let customer_project_no = nullable_text(&o, "customerProjectNo", 1, 128, &mut errors)?;
    let planned_sign_at = datetime(&o, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Convert {
        project_name,
        customer_project_no,
        planned_sign_at,
    })
}

pub fn validate_submit_override(raw: Option<&str>) -> Result<SubmitOverride, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let score = required_integer(&o, "score", 0, &mut errors);
    if score.is_some_and(|score| score > 100) {
        errors.push(json!({"origin":"number","code":"too_big","maximum":100,"inclusive":true,"path":["score"],"message":"Too big: expected number to be <=100"}));
    }
    let reason = text(&o, "reason", true, true, 1, 1000, &mut errors)?;
    let expected_lead_row_version = required_integer(&o, "expectedLeadRowVersion", 1, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (score, reason, expected_lead_row_version) {
        (Some(score), Some(reason), Some(expected_lead_row_version)) => Ok(SubmitOverride {
            score: score as i32,
            reason,
            expected_lead_row_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_approve_override(raw: Option<&str>) -> Result<ApproveOverride, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let expected_override_row_version =
        required_integer(&o, "expectedOverrideRowVersion", 1, &mut errors);
    let note = nullable_text(&o, "note", 1, 1000, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    expected_override_row_version
        .map(|expected_override_row_version| ApproveOverride {
            expected_override_row_version,
            note,
        })
        .ok_or_else(ApiError::internal)
}

pub fn validate_reject_override(raw: Option<&str>) -> Result<RejectOverride, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let reason = text(&o, "reason", true, true, 1, 1000, &mut errors)?;
    let expected_override_row_version =
        required_integer(&o, "expectedOverrideRowVersion", 1, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (reason, expected_override_row_version) {
        (Some(reason), Some(expected_override_row_version)) => Ok(RejectOverride {
            reason,
            expected_override_row_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_revoke_override(raw: Option<&str>) -> Result<RevokeOverride, ApiError> {
    let v = validate_reject_override(raw)?;
    Ok(RevokeOverride {
        reason: v.reason,
        expected_override_row_version: v.expected_override_row_version,
    })
}

fn primitive(raw: &RawValue, array_item: bool) -> Result<String, ApiError> {
    Ok(match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map_err(|_| ApiError::internal())?
            .to_utf8_lossy(),
        "null" => {
            if array_item {
                "".into()
            } else {
                "null".into()
            }
        }
        "boolean" => raw.get().into(),
        "number" => js_number_string(raw.get().parse().unwrap_or(f64::NAN)),
        "array" => {
            let values: Vec<&RawValue> =
                serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
            values
                .into_iter()
                .map(|raw| primitive(raw, true))
                .collect::<Result<Vec<_>, _>>()?
                .join(",")
        }
        _ => {
            let object = JsObject::parse(raw.get()).map_err(|_| ApiError::internal())?;
            if object.get("toString").is_some() {
                return Err(ApiError::object(
                    axum::http::StatusCode::BAD_REQUEST,
                    json!({"statusCode":400,"message":"Validation failed"}),
                ));
            }
            "[object Object]".into()
        }
    })
}

fn query_integer(
    o: &JsObject<'_>,
    key: &str,
    maximum: Option<i64>,
    errors: &mut Vec<Value>,
) -> Result<Option<i64>, ApiError> {
    let Some(raw) = o.get(key) else {
        return Ok(None);
    };
    let n = match json_type(Some(raw)) {
        "null" => 0.0,
        "boolean" => f64::from(raw.get() == "true"),
        "number" => raw.get().parse().unwrap_or(f64::NAN),
        _ => legacy_number(NumberInput::Text(&primitive(raw, false)?)),
    };
    if !n.is_finite() {
        let received = if n.is_nan() { "NaN" } else { "Infinity" };
        errors.push(json!({"expected":"number","code":"invalid_type","received":received,"path":[key],"message":format!("Invalid input: expected number, received {received}")}));
        return Ok(None);
    }
    if n.fract() != 0.0 {
        errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":[key],"message":"Invalid input: expected int, received number"}));
        return Ok(None);
    }
    if n > 9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_big","maximum":9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":[key],"message":"Too big: expected int to be <=9007199254740991"}));
    }
    if n < -9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_small","minimum":-9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":[key],"message":"Too small: expected int to be >=-9007199254740991"}));
    }
    if n < 1.0 {
        errors.push(json!({"origin":"number","code":"too_small","minimum":1,"inclusive":true,"path":[key],"message":"Too small: expected number to be >=1"}));
    }
    if let Some(max) = maximum
        && n > max as f64
    {
        errors.push(json!({"origin":"number","code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: expected number to be <={max}")}));
    }
    Ok(Some(n as i64))
}

pub fn validate_query(raw: Option<&str>) -> Result<Query, ApiError> {
    let o = object(raw)?;
    let mut errors = Vec::new();
    let scope =
        enumeration(&o, "scope", false, SCOPES, &mut errors).unwrap_or_else(|| "active".into());
    let source_code = source(&o, false, &mut errors)?;
    let budget_status = enumeration(&o, "budgetStatus", false, BUDGET, &mut errors);
    let urgency = enumeration(&o, "urgency", false, URGENCY, &mut errors);
    let rating = enumeration(&o, "rating", false, RATING, &mut errors);
    let owner_org_id = optional_uuid(&o, "ownerOrgId", &mut errors);
    let owner_user_id = optional_uuid(&o, "ownerUserId", &mut errors);
    let ownership_scope = enumeration(
        &o,
        "ownershipScope",
        false,
        &["all", "mine", "public-pool"],
        &mut errors,
    );
    let keyword = text(&o, "keyword", false, true, 1, 128, &mut errors)?;
    let page = query_integer(&o, "page", None, &mut errors)?.unwrap_or(1);
    let page_size = query_integer(&o, "pageSize", Some(500), &mut errors)?.unwrap_or(500);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Query {
        scope,
        source_code,
        budget_status,
        urgency,
        rating,
        owner_org_id,
        owner_user_id,
        ownership_scope,
        keyword,
        page,
        page_size,
    })
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_preserves_owner_presence_and_unscaled_amount() {
        let raw = r#"{"leadName":" 机会 ","customerId":"00000000-0000-4000-8000-000000000001","sourceCode":"customer-visit","demandDescription":"需求","budgetStatus":"rough-budget","estimatedAmount":"0001.2","urgency":"normal","ownerUserId":null,"status":"converted"}"#;
        let input = validate_create(Some(raw)).unwrap_or_else(|_| panic!("original valid input"));
        assert!(input.owner_user_id.is_null());
        assert!(input.owner_org_id.is_missing());
        assert!(matches!(input.estimated_amount,Field::Value(ref value) if value=="0001.2"));
        assert_eq!(input.lead_name.to_utf8_lossy(), "机会");
    }

    #[test]
    fn update_requires_business_field_and_preserves_nullable_date() {
        assert!(validate_update(Some(r#"{"expectedVersion":1,"status":"qualified"}"#)).is_err());
        assert!(validate_update(Some(r#"{"estimatedAmount":null}"#)).is_ok());
        let input = validate_update(Some(r#"{"expectedDecisionDate":"0001-01-01"}"#))
            .unwrap_or_else(|_| panic!("valid business date"));
        assert!(
            matches!(input.expected_decision_date,Field::Value(ref value) if value=="0001-01-01")
        );
    }

    #[test]
    fn decimal_storage_range_is_exact_and_ignores_leading_zeros() {
        for value in [
            "9999999999999999.99",
            "00009999999999999999.99",
            "9007199254740993.00",
            "0001.2",
            "0.00",
        ] {
            let raw = json!({"estimatedAmount":value}).to_string();
            let input =
                validate_update(Some(&raw)).unwrap_or_else(|_| panic!("storable decimal rejected"));
            assert!(matches!(input.estimated_amount,Field::Value(ref stored) if stored==value));
        }
        for value in [
            "10000000000000000.00",
            "00010000000000000000.00",
            "99999999999999999.99",
        ] {
            let raw = json!({"estimatedAmount":value}).to_string();
            assert!(validate_update(Some(&raw)).is_err());
        }
    }

    #[test]
    fn business_years_preserve_small_years_and_normal_iso_milliseconds() {
        for value in ["0001-01-01", "0099-12-31", "9999-12-31", "2000-02-29"] {
            let raw = json!({"expectedDecisionDate":value}).to_string();
            let input = validate_update(Some(&raw))
                .unwrap_or_else(|_| panic!("valid business date rejected"));
            assert!(
                matches!(input.expected_decision_date,Field::Value(ref stored) if stored==value)
            );
        }
        for value in ["0000-02-29", "10000-01-01", "1900-02-29"] {
            let raw = json!({"expectedDecisionDate":value}).to_string();
            assert!(validate_update(Some(&raw)).is_err());
        }
        for value in [
            "0001-01-01T00:00:00.001Z",
            "0099-12-31T23:59:59.123Z",
            "9999-12-31T23:59:59.999Z",
        ] {
            let raw = json!({"plannedSignAt":value}).to_string();
            let input = validate_convert(Some(&raw))
                .unwrap_or_else(|_| panic!("valid business timestamp rejected"));
            let Field::Value(date) = input.planned_sign_at else {
                panic!("timestamp missing");
            };
            assert_eq!(
                crate::compat::scalars::js_iso_string(date).ok().as_deref(),
                Some(value)
            );
        }
        assert!(validate_convert(Some(r#"{"plannedSignAt":"0000-02-29T00:00:00Z"}"#)).is_err());
    }

    #[test]
    fn datetime_fraction_truncates_and_query_coercion_matches_number() {
        let input = validate_convert(Some(r#"{"plannedSignAt":"2026-05-01T00:00:00.123456Z"}"#))
            .unwrap_or_else(|_| panic!("fraction"));
        assert!(
            matches!(input.planned_sign_at,Field::Value(value) if value.timestamp_subsec_millis()==123)
        );
        let q = validate_query(Some(r#"{"page":"0x10","pageSize":["20"]}"#))
            .unwrap_or_else(|_| panic!("coercion"));
        assert_eq!((q.page, q.page_size), (16, 20));
        assert!(validate_query(Some(r#"{"page":["1","2"]}"#)).is_err());
    }

    #[test]
    fn valid_unicode_keeps_public_code_point_limits() {
        let make = |demand: String| {
            json!({"leadName":"机会","customerId":"00000000-0000-4000-8000-000000000001",
            "sourceCode":"customer-visit","demandDescription":demand,"budgetStatus":"rough-budget","urgency":"normal"}).to_string()
        };
        assert!(validate_create(Some(&make("😀".repeat(4000)))).is_ok());
        assert!(validate_create(Some(&make("😀".repeat(4001)))).is_err());
    }

    #[test]
    fn persisted_text_rejects_nul_and_unpaired_surrogates_before_storage() {
        use axum::response::IntoResponse;
        for invalid in [r#""\u0000""#, r#""\ud800""#, r#""\udc00""#] {
            let create = format!(
                r#"{{"leadName":{invalid},"customerId":"00000000-0000-4000-8000-000000000001","sourceCode":"customer-visit","demandDescription":"需求","budgetStatus":"rough-budget","urgency":"normal"}}"#
            );
            assert!(validate_create(Some(&create)).is_err());
            for (field, validate) in [
                (
                    "leadName",
                    validate_update as fn(Option<&str>) -> Result<Update, ApiError>,
                ),
                ("demandDescription", validate_update),
            ] {
                let body = format!("{{\"{field}\":{invalid}}}");
                let error = validate(Some(&body))
                    .err()
                    .unwrap_or_else(|| panic!("invalid persisted text accepted"));
                assert_eq!(
                    error.into_response().status(),
                    axum::http::StatusCode::BAD_REQUEST
                );
            }
            assert!(
                validate_assign(Some(&format!(
                    r#"{{"ownerUserId":"00000000-0000-4000-8000-000000000001","reason":{invalid}}}"#
                )))
                .is_err()
            );
            assert!(
                validate_qualify(Some(&format!(r#"{{"qualificationSummary":{invalid}}}"#)))
                    .is_err()
            );
            assert!(validate_close(Some(&format!(r#"{{"closedReason":{invalid}}}"#))).is_err());
            assert!(validate_convert(Some(&format!(r#"{{"projectName":{invalid}}}"#))).is_err());
            assert!(
                validate_convert(Some(&format!(r#"{{"customerProjectNo":{invalid}}}"#))).is_err()
            );
            assert!(
                validate_submit_override(Some(&format!(
                    r#"{{"score":80,"reason":{invalid},"expectedLeadRowVersion":1}}"#
                )))
                .is_err()
            );
            assert!(
                validate_approve_override(Some(&format!(
                    r#"{{"expectedOverrideRowVersion":1,"note":{invalid}}}"#
                )))
                .is_err()
            );
            assert!(
                validate_reject_override(Some(&format!(
                    r#"{{"expectedOverrideRowVersion":1,"reason":{invalid}}}"#
                )))
                .is_err()
            );
            assert!(
                validate_revoke_override(Some(&format!(
                    r#"{{"expectedOverrideRowVersion":1,"reason":{invalid}}}"#
                )))
                .is_err()
            );
        }
        assert!(validate_update(Some(r#"{"leadName":"合法😀","unknown":"\ud800"}"#)).is_ok());
    }

    #[tokio::test]
    async fn invalid_text_arrays_have_one_clear_type_error() {
        use axum::response::IntoResponse;
        let error = validate_close(Some(r#"{"closedReason":[]}"#))
            .err()
            .unwrap_or_else(|| panic!("array accepted as text"));
        let response = error.into_response();
        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
        let bytes = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap_or_else(|_| panic!("response body"));
        let body: Value = serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("JSON body"));
        assert_eq!(body["errors"].as_array().map(Vec::len), Some(1));
        assert_eq!(body["errors"][0]["code"], "invalid_type");
        assert_eq!(body["errors"][0]["path"], json!(["closedReason"]));
    }
}
