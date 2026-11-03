use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};

use super::model::{Create, Fields, Query, Replace, Void};
use crate::{
    auth::js_json::{JsObject, decode_string},
    compat::json::Field,
    customer_contacts::validation::{enumeration, nullable_text, uuid},
    dictionary::validation::{failure, integer, invalid_type, json_type, object, text},
    error::ApiError,
    shared::generated::{SalesFollowUpOutcome, SalesFollowUpRecordLifecycleScope},
};

pub type ValidationError = ApiError;

const DATETIME_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/";

fn datetime_value(value: &str) -> Option<DateTime<Utc>> {
    if !value.is_ascii() || value.len() < 20 {
        return None;
    }
    let bytes = value.as_bytes();
    if bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes.last() != Some(&b'Z')
    {
        return None;
    }
    for range in [0..4, 5..7, 8..10, 11..13, 14..16, 17..19] {
        if !bytes[range].iter().all(u8::is_ascii_digit) {
            return None;
        }
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
            .map(|(index, byte)| u32::from(byte - b'0') * [100, 10, 1][index])
            .sum()
    };
    NaiveDate::from_ymd_opt(
        value[..4].parse().ok()?,
        value[5..7].parse().ok()?,
        value[8..10].parse().ok()?,
    )?
    .and_hms_milli_opt(
        value[11..13].parse().ok()?,
        value[14..16].parse().ok()?,
        value[17..19].parse().ok()?,
        millis,
    )
    .map(|value| value.and_utc())
}

fn datetime(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    nullable: bool,
    errors: &mut Vec<Value>,
) -> Field<DateTime<Utc>> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Field::Missing;
    }
    if nullable && raw.is_some_and(|value| value.get() == "null") {
        return Field::Null;
    }
    let Some(value) = raw.and_then(|value| decode_string(value.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        return Field::Missing;
    };
    if let Some(value) = datetime_value(&value.to_utf8_lossy()) {
        return Field::Value(value);
    }
    errors.push(json!({"origin":"string","code":"invalid_format","format":"datetime","pattern":DATETIME_PATTERN,"path":[key],"message":"Invalid ISO datetime"}));
    Field::Missing
}

fn fields(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Result<Option<Fields>, ApiError> {
    let follow_up_type = text(object, "followUpType", true, true, 1, 64, errors)?;
    if let Some(value) = follow_up_type.as_ref() {
        let units = value.as_code_units();
        if units
            .first()
            .is_none_or(|unit| !matches!(*unit, 0x61..=0x7a))
            || units
                .iter()
                .any(|unit| !matches!(*unit, 0x61..=0x7a | 0x30..=0x39 | 0x2d))
        {
            errors.push(json!({"origin":"string","code":"invalid_format","format":"regex","pattern":"/^[a-z][a-z0-9-]*$/","path":["followUpType"],"message":"Dictionary code must use lower kebab-case"}));
        }
    }
    let occurred_at = datetime(object, "occurredAt", true, false, errors);
    let summary = text(object, "summary", true, true, 1, 2000, errors)?;
    let detail = nullable_text(object, "detail", 1, 8000, errors)?;
    let outcomes = SalesFollowUpOutcome::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let outcome = enumeration(object, "outcome", true, &outcomes, errors);
    let next_follow_up_at = datetime(object, "nextFollowUpAt", false, true, errors);
    let owner_org_id = uuid(object, "ownerOrgId", false, true, errors);
    let owner_user_id = uuid(object, "ownerUserId", false, true, errors);
    Ok(match (follow_up_type, occurred_at, summary, outcome) {
        (Some(follow_up_type), Field::Value(occurred_at), Some(summary), Some(outcome)) => {
            Some(Fields {
                follow_up_type: follow_up_type.to_utf8_lossy(),
                occurred_at,
                summary,
                detail,
                outcome,
                next_follow_up_at,
                owner_org_id,
                owner_user_id,
            })
        }
        _ => None,
    })
}

fn version(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Option<i64> {
    if object.get("expectedVersion").is_none() {
        errors.push(invalid_type(
            "number",
            "undefined",
            vec![json!("expectedVersion")],
        ));
        return None;
    }
    integer(object, "expectedVersion", Some(1), errors)
}

pub fn validate_create(raw: Option<&str>) -> Result<Create, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let lead_id = uuid(&object, "leadId", false, true, &mut errors);
    let project_id = uuid(&object, "projectId", false, true, &mut errors);
    let fields = fields(&object, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (customer_id, fields) {
        (Field::Value(customer_id), Some(fields)) => Ok(Create {
            customer_id,
            lead_id,
            project_id,
            fields,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_replace(raw: Option<&str>) -> Result<Replace, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let fields = fields(&object, &mut errors)?;
    let replacement_reason = text(
        &object,
        "replacementReason",
        true,
        true,
        1,
        1000,
        &mut errors,
    )?;
    let expected_version = version(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (fields, replacement_reason, expected_version) {
        (Some(fields), Some(replacement_reason), Some(expected_version)) => Ok(Replace {
            fields,
            replacement_reason,
            expected_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_void(raw: Option<&str>) -> Result<Void, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let reason = text(&object, "reason", true, true, 1, 1000, &mut errors)?;
    let comment = nullable_text(&object, "comment", 0, 1000, &mut errors)?;
    let expected_version = version(&object, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (reason, expected_version) {
        (Some(reason), Some(expected_version)) => Ok(Void {
            reason,
            comment,
            expected_version,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_query(raw: Option<&str>) -> Result<Query, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let customer_id = uuid(&object, "customerId", false, false, &mut errors);
    let lead_id = uuid(&object, "leadId", false, false, &mut errors);
    let project_id = uuid(&object, "projectId", false, false, &mut errors);
    let scopes = SalesFollowUpRecordLifecycleScope::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let lifecycle_scope = enumeration(&object, "lifecycleScope", false, &scopes, &mut errors);
    if errors.is_empty()
        && customer_id.is_missing()
        && lead_id.is_missing()
        && project_id.is_missing()
    {
        errors.push(json!({"code":"custom","path":[],"message":"At least one anchor is required for sales follow-up query"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Query {
        customer_id: optional(customer_id),
        lead_id: optional(lead_id),
        project_id: optional(project_id),
        lifecycle_scope,
    })
}

fn optional<T>(value: Field<T>) -> Option<T> {
    match value {
        Field::Value(value) => Some(value),
        _ => None,
    }
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}
