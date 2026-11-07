//! Finite validator for the frozen modern schema closure and explicit G2 delta.
//! Raw integer/weight normalization happens before JSON numbers can become f64.
use super::scalars::Millionths;
use crate::contract_support::Error;
use chrono::{DateTime, NaiveDate};
use serde_json::{Value, value::RawValue};
use std::{collections::BTreeMap, sync::OnceLock};
use uuid::Uuid;

const PUBLIC: &str =
    include_str!("../../../../tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json");
const CONTEXT: &str =
    include_str!("../../../../tools/rust-r4ghi/joint-g1/effective-v2/source-context.schema.json");
const DELTAS: [&str; 3] = [
    include_str!("../../../../docs/design/rust-r4ghi/g2-public-delta01.json"),
    include_str!("../../../../docs/design/rust-r4ghi/g2-public-delta02.json"),
    include_str!("../../../../docs/design/rust-r4ghi/g2-public-delta03.json"),
];

pub fn public_registry() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| {
        let mut base: Value = serde_json::from_str(PUBLIC).unwrap_or(Value::Null);
        for raw in DELTAS {
            let delta: Value = serde_json::from_str(raw).unwrap_or(Value::Null);
            if let (Some(target), Some(extra)) = (
                base["components"]["schemas"].as_object_mut(),
                delta["addSchemas"].as_object(),
            ) {
                target.extend(extra.clone());
            }
            if let Some(changes) = delta["components"].as_object() {
                for (name, change) in changes {
                    assert!(
                        change
                            .as_object()
                            .is_some_and(|fields| fields.keys().all(|key| matches!(
                                key.as_str(),
                                "addProperties" | "addRequired" | "appendOneOf"
                            ))),
                        "Unknown G2 public schema change for {name}"
                    );
                    let target = &mut base["components"]["schemas"][name];
                    if let (Some(properties), Some(extra)) = (
                        target["properties"].as_object_mut(),
                        change["addProperties"].as_object(),
                    ) {
                        properties.extend(extra.clone());
                    }
                    if let (Some(required), Some(extra)) = (
                        target["required"].as_array_mut(),
                        change["addRequired"].as_array(),
                    ) {
                        for value in extra {
                            if !required.contains(value) {
                                required.push(value.clone());
                            }
                        }
                    }
                    if let (Some(one_of), Some(extra)) = (
                        target["oneOf"].as_array_mut(),
                        change["appendOneOf"].as_array(),
                    ) {
                        one_of.extend(extra.clone());
                    }
                }
            }
        }
        base
    })
}
pub fn context_registry() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| serde_json::from_str(CONTEXT).unwrap_or(Value::Null))
}
fn resolved<'a>(schema: &'a Value, root: &'a Value) -> Option<&'a Value> {
    if let Some(reference) = schema["$ref"].as_str() {
        root.pointer(reference.strip_prefix('#')?)
    } else {
        Some(schema)
    }
}
fn invalid() -> Error {
    Error::BadRequest("Modern input does not match the frozen contract".into())
}
fn trim_js(value: &str) -> &str {
    value.trim_matches(|c| matches!(c, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'))
}

fn exact_int4(raw: &str) -> Result<i32, Error> {
    let (negative, raw) = raw.strip_prefix('-').map_or((false, raw), |v| (true, v));
    let (base, exponent) = raw.split_once(['e', 'E']).unwrap_or((raw, "0"));
    let (whole, fraction) = base.split_once('.').unwrap_or((base, ""));
    let digits = format!("{whole}{fraction}");
    if whole.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return Err(invalid());
    }
    let significant = digits.trim_start_matches('0');
    if significant.is_empty() {
        return Ok(0);
    }
    let exponent = exponent.parse::<i32>().map_err(|_| invalid())?;
    let coefficient = significant.trim_end_matches('0');
    let scale = i64::try_from(fraction.len()).map_err(|_| invalid())?
        - i64::from(exponent)
        - i64::try_from(significant.len() - coefficient.len()).map_err(|_| invalid())?;
    if !(-10..=0).contains(&scale) || coefficient.len() > 10 {
        return Err(invalid());
    }
    let coefficient = coefficient.parse::<i64>().map_err(|_| invalid())?;
    let value = coefficient
        .checked_mul(10_i64.pow(u32::try_from(-scale).map_err(|_| invalid())?))
        .ok_or_else(invalid)?;
    i32::try_from(if negative { -value } else { value }).map_err(|_| invalid())
}

fn normalize(schema: &Value, root: &Value, raw: &str, depth: usize) -> Result<String, Error> {
    if depth > 96 {
        return Err(invalid());
    }
    let schema = resolved(schema, root).ok_or(Error::Internal)?;
    if let Some(choices) = schema["anyOf"]
        .as_array()
        .or_else(|| schema["oneOf"].as_array())
    {
        for candidate in choices {
            if let Ok(normalized) = normalize(candidate, root, raw, depth + 1)
                && let Ok(value) = serde_json::from_str::<Value>(&normalized)
                && matches_schema(candidate, root, &value, depth + 1)
            {
                return Ok(normalized);
            }
        }
        return Err(invalid());
    }
    let kind = schema["type"].as_str();
    if kind == Some("integer") {
        return Ok(exact_int4(raw)?.to_string());
    }
    if kind == Some("number")
        && (schema["x-exact-decimal-scale"].as_u64() == Some(6)
            || schema["multipleOf"].as_f64() == Some(0.000001))
    {
        return serde_json::to_string(&Millionths::parse_token(raw)?).map_err(|_| Error::Internal);
    }
    if kind == Some("string")
        || schema
            .get("enum")
            .is_some_and(|v| v.as_array().is_some_and(|v| v.iter().all(Value::is_string)))
    {
        let value: String = serde_json::from_str(raw).map_err(|_| invalid())?;
        return serde_json::to_string(if schema["x-trim"] == true {
            trim_js(&value)
        } else {
            &value
        })
        .map_err(|_| Error::Internal);
    }
    if kind == Some("object") || schema.get("properties").is_some() {
        let values: BTreeMap<String, Box<RawValue>> =
            serde_json::from_str(raw).map_err(|_| invalid())?;
        let mut pieces = Vec::new();
        for (key, value) in values {
            let child = schema["properties"]
                .get(&key)
                .or_else(|| schema.get("additionalProperties").filter(|v| v.is_object()));
            if child.is_none() && schema["additionalProperties"] == false {
                return Err(invalid());
            }
            let body = match child {
                Some(child) => normalize(child, root, value.get(), depth + 1)?,
                None => value.get().to_owned(),
            };
            pieces.push(format!(
                "{}:{body}",
                serde_json::to_string(&key).map_err(|_| Error::Internal)?
            ));
        }
        return Ok(format!("{{{}}}", pieces.join(",")));
    }
    if kind == Some("array") {
        let values: Vec<Box<RawValue>> = serde_json::from_str(raw).map_err(|_| invalid())?;
        let values = values
            .iter()
            .map(|value| normalize(&schema["items"], root, value.get(), depth + 1))
            .collect::<Result<Vec<_>, _>>()?;
        return Ok(format!("[{}]", values.join(",")));
    }
    Ok(raw.to_owned())
}

fn decimal_shape(
    value: &str,
    signed: bool,
    whole_max: Option<usize>,
    fraction_min: usize,
    fraction_max: usize,
    leading_zero: bool,
    fraction_required: bool,
) -> bool {
    let value = if signed {
        value.strip_prefix('-').unwrap_or(value)
    } else {
        value
    };
    let mut parts = value.split('.');
    let whole = parts.next().unwrap_or_default();
    let fraction = parts.next();
    !whole.is_empty()
        && whole.bytes().all(|b| b.is_ascii_digit())
        && whole_max.is_none_or(|max| whole.len() <= max)
        && (leading_zero || whole == "0" || !whole.starts_with('0'))
        && parts.next().is_none()
        && match fraction {
            None => !fraction_required,
            Some(value) => {
                value.len() >= fraction_min
                    && value.len() <= fraction_max
                    && value.bytes().all(|b| b.is_ascii_digit())
            }
        }
}
fn calendar_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    value.is_ascii()
        && bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && [0..4, 5..7, 8..10]
            .into_iter()
            .all(|range| bytes[range].iter().all(u8::is_ascii_digit))
        && NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}
fn utc_datetime(value: &str) -> bool {
    let bytes = value.as_bytes();
    if !value.is_ascii()
        || bytes.len() < 20
        || !calendar_date(&value[..10])
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || ![11..13, 14..16, 17..19]
            .into_iter()
            .all(|range| bytes[range].iter().all(u8::is_ascii_digit))
    {
        return false;
    }
    if (bytes[11] - b'0') * 10 + bytes[12] - b'0' > 23 || bytes[14] > b'5' || bytes[17] > b'5' {
        return false;
    }
    let suffix = (bytes.len() == 20 && bytes[19] == b'Z')
        || (bytes.len() > 21
            && bytes[19] == b'.'
            && bytes.last() == Some(&b'Z')
            && bytes[20..bytes.len() - 1].iter().all(u8::is_ascii_digit));
    suffix && DateTime::parse_from_rfc3339(value).is_ok()
}
fn pattern_matches(pattern: &str, value: &str) -> bool {
    match pattern {
        "^[0-9a-f]{64}$" => {
            value.len() == 64
                && value
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        }
        "^[A-Z]{3}$" => value.len() == 3 && value.bytes().all(|b| b.is_ascii_uppercase()),
        "^-?(0|[1-9][0-9]*)\\.[0-9]{2}$" => decimal_shape(value, true, None, 2, 2, false, true),
        "^-?(0|[1-9][0-9]*)\\.[0-9]{6}$" => decimal_shape(value, true, None, 6, 6, false, true),
        "^-?(?:0|[1-9][0-9]{0,15})\\.[0-9]{2}$" => {
            decimal_shape(value, true, Some(16), 2, 2, false, true)
        }
        "^-?[0-9]{1,16}(?:\\.[0-9]{1,2})?$" => {
            decimal_shape(value, true, Some(16), 1, 2, true, false)
        }
        "^[0-9]{1,16}(?:\\.[0-9]{1,2})?$" => {
            decimal_shape(value, false, Some(16), 1, 2, true, false)
        }
        "^[0-9]{1,16}(?:\\.[0-9]{1,6})?$" => {
            decimal_shape(value, false, Some(16), 1, 6, true, false)
        }
        "^[0-9]{1,8}(?:\\.[0-9]{1,2})?$" => decimal_shape(value, false, Some(8), 1, 2, true, false),
        "^-?[0-9]{1,32}\\.[0-9]{6}$" => decimal_shape(value, true, Some(32), 6, 6, true, true),
        "^[0-9]\\.[0-9]{4}$" => decimal_shape(value, false, Some(1), 4, 4, true, true),
        "^(0|1)\\.[0-9]{6}$" => {
            decimal_shape(value, false, Some(1), 6, 6, false, true)
                && (value.starts_with("0.") || value.starts_with("1."))
        }
        "^(0\\.[0-9]{6}|1\\.000000)$" => {
            (value.starts_with("0.") && decimal_shape(value, false, Some(1), 6, 6, false, true))
                || value == "1.000000"
        }
        value_pattern if value_pattern.contains("00000000-0000-0000-0000-000000000000") => {
            Uuid::parse_str(value).is_ok_and(|id| {
                value.len() == 36
                    && id.to_string().eq_ignore_ascii_case(value)
                    && (id.is_nil()
                        || id.as_bytes().iter().all(|v| *v == 255)
                        || ((1..=8).contains(&(id.as_bytes()[6] >> 4))
                            && (8..=11).contains(&(id.as_bytes()[8] >> 4))))
            })
        }
        value_pattern if value_pattern.contains("-W(?:") => {
            if let Some((year, week)) = value.split_once("-W") {
                year.len() == 4
                    && week.len() == 2
                    && year.bytes().all(|b| b.is_ascii_digit())
                    && week.bytes().all(|b| b.is_ascii_digit())
                    && year
                        .parse::<i32>()
                        .ok()
                        .zip(week.parse::<u32>().ok())
                        .is_some_and(|(year, week)| {
                            NaiveDate::from_isoywd_opt(year, week, chrono::Weekday::Mon).is_some()
                        })
            } else {
                value.len() == 7 && calendar_date(&format!("{value}-01"))
            }
        }
        value_pattern if value_pattern.contains("-02-29|") => {
            if value_pattern.contains("T(?:") {
                utc_datetime(value)
            } else {
                calendar_date(value)
            }
        }
        _ => false,
    }
}

fn matches_schema(schema: &Value, root: &Value, value: &Value, depth: usize) -> bool {
    if depth > 96 {
        return false;
    }
    let Some(schema) = resolved(schema, root) else {
        return false;
    };
    if let Some(expected) = schema.get("const")
        && expected != value
    {
        return false;
    }
    if let Some(values) = schema["enum"].as_array()
        && !values.contains(value)
    {
        return false;
    }
    if let Some(values) = schema["allOf"].as_array()
        && !values
            .iter()
            .all(|s| matches_schema(s, root, value, depth + 1))
    {
        return false;
    }
    if let Some(values) = schema["anyOf"].as_array()
        && !values
            .iter()
            .any(|s| matches_schema(s, root, value, depth + 1))
    {
        return false;
    }
    if let Some(values) = schema["oneOf"].as_array()
        && values
            .iter()
            .filter(|s| matches_schema(s, root, value, depth + 1))
            .count()
            != 1
    {
        return false;
    }
    if let Some(negated) = schema.get("not")
        && matches_schema(negated, root, value, depth + 1)
    {
        return false;
    }
    if let Some(condition) = schema.get("if") {
        let branch = if matches_schema(condition, root, value, depth + 1) {
            schema.get("then")
        } else {
            schema.get("else")
        };
        if let Some(branch) = branch
            && !matches_schema(branch, root, value, depth + 1)
        {
            return false;
        }
    }
    if let Some(kind) = schema["type"].as_str() {
        let valid = match kind {
            "null" => value.is_null(),
            "boolean" => value.is_boolean(),
            "string" => value.is_string(),
            "integer" => value.as_i64().is_some() || value.as_u64().is_some(),
            "number" => value.is_number(),
            "object" => value.is_object(),
            "array" => value.is_array(),
            _ => false,
        };
        if !valid {
            return false;
        }
    }
    if let Some(string) = value.as_str() {
        let count = string.chars().count() as u64;
        if schema["minLength"].as_u64().is_some_and(|n| count < n)
            || schema["maxLength"].as_u64().is_some_and(|n| count > n)
        {
            return false;
        }
        if let Some(pattern) = schema["pattern"].as_str()
            && !pattern_matches(pattern, string)
        {
            return false;
        }
        if let Some(format) = schema["format"].as_str() {
            let valid = match format {
                "uuid" => string.len() == 36 && Uuid::parse_str(string).is_ok(),
                "date" => {
                    string.len() == 10 && NaiveDate::parse_from_str(string, "%Y-%m-%d").is_ok()
                }
                "date-time" => DateTime::parse_from_rfc3339(string).is_ok(),
                _ => true,
            };
            if !valid {
                return false;
            }
        }
    }
    if let Some(number) = value.as_f64() {
        if !number.is_finite()
            || schema["minimum"].as_f64().is_some_and(|n| number < n)
            || schema["maximum"].as_f64().is_some_and(|n| number > n)
            || schema["exclusiveMinimum"]
                .as_f64()
                .is_some_and(|n| number <= n)
            || schema["exclusiveMaximum"]
                .as_f64()
                .is_some_and(|n| number >= n)
        {
            return false;
        }
        if schema["multipleOf"].as_f64() == Some(0.000001)
            && Millionths::parse_token(&value.to_string()).is_err()
        {
            return false;
        }
    }
    if let Some(values) = value.as_array() {
        if schema["minItems"]
            .as_u64()
            .is_some_and(|n| values.len() < n as usize)
            || schema["maxItems"]
                .as_u64()
                .is_some_and(|n| values.len() > n as usize)
        {
            return false;
        }
        if let Some(items) = schema.get("items")
            && !values
                .iter()
                .all(|v| matches_schema(items, root, v, depth + 1))
        {
            return false;
        }
    }
    if let Some(values) = value.as_object() {
        if let Some(required) = schema["required"].as_array()
            && required
                .iter()
                .filter_map(Value::as_str)
                .any(|key| !values.contains_key(key))
        {
            return false;
        }
        for (key, value) in values {
            if let Some(child) = schema["properties"].get(key) {
                if !matches_schema(child, root, value, depth + 1) {
                    return false;
                }
            } else if schema["additionalProperties"] == false {
                return false;
            } else if let Some(child) = schema.get("additionalProperties").filter(|s| s.is_object())
                && !matches_schema(child, root, value, depth + 1)
            {
                return false;
            }
        }
    }
    true
}

pub fn normalize_public_request(name: &str, raw: &str) -> Result<String, Error> {
    let root = public_registry();
    let schema = root["components"]["schemas"]
        .get(name)
        .ok_or(Error::Internal)?;
    let normalized = normalize(schema, root, raw, 0)?;
    let value: Value = serde_json::from_str(&normalized).map_err(|_| invalid())?;
    if !matches_schema(schema, root, &value, 0) {
        return Err(invalid());
    }
    Ok(normalized)
}
pub fn validate_public_value(name: &str, value: &Value) -> Result<(), Error> {
    let root = public_registry();
    let schema = root["components"]["schemas"]
        .get(name)
        .ok_or(Error::Internal)?;
    if !matches_schema(schema, root, value, 0) {
        return Err(Error::Internal);
    }
    Ok(())
}
pub fn validate_context_value(value: &Value) -> Result<(), Error> {
    let root = context_registry();
    if !matches_schema(root, root, value, 0) {
        return Err(Error::Conflict(
            "Frozen operating context does not match its certified schema".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn integer_tokens_are_exact_and_never_round_to_an_expected_version() {
        assert_eq!(exact_int4("1e0").ok(), Some(1));
        assert_eq!(exact_int4("2147483647.0").ok(), Some(i32::MAX));
        for raw in [
            "2147483648",
            "2147483647.00000000000001",
            "1.00000000000000001",
            "1e1000",
        ] {
            assert!(exact_int4(raw).is_err());
        }
    }
    #[test]
    fn normalized_weight_cannot_hide_precision_in_float() {
        let schema = serde_json::json!({"type":"number","x-exact-decimal-scale":6});
        assert_eq!(
            normalize(&schema, &schema, "1e-6", 0).ok().as_deref(),
            Some("0.000001")
        );
        assert!(normalize(&schema, &schema, "0.10000000000000001", 0).is_err());
    }
    #[test]
    fn completed_cannot_carry_conditional_tasks() {
        let schema = serde_json::json!({"type":"object","allOf":[{"if":{"properties":{"completionResult":{"const":"conditional-completed"}},"required":["completionResult"]},"else":{"not":{"required":["completionConditions"]}}}]});
        let input = serde_json::json!({"completionResult":"completed","completionConditions":[{"summary":"must not be accepted"}]});
        assert!(!matches_schema(&schema, &schema, &input, 0));
        assert!(matches_schema(
            &schema,
            &schema,
            &serde_json::json!({"completionResult":"completed"}),
            0
        ));
    }
    #[test]
    fn completion_request_obeys_the_frozen_utc_grammar() {
        let mut body = serde_json::json!({"inputVersion":"server-derived-v1","expectedProjectVersion":1,"acceptanceRecordId":"00000000-0000-0000-0000-000000000000","expectedAcceptanceVersion":1,"completionResult":"completed","completedAt":"2026-11-06T12:00:00Z","completionSummary":"Completed","evidenceSummary":"Actual final evidence","evidenceRefs":[{"attachmentLinkId":"00000000-0000-0000-0000-000000000000"}]});
        for date in ["2026-11-06T12:00:00Z", "2024-02-29T23:59:59.123456789Z"] {
            body["completedAt"] = Value::String(date.into());
            assert!(
                normalize_public_request("CreateProjectCompletionRecordRequest", &body.to_string())
                    .is_ok(),
                "{date}"
            );
        }
        for date in [
            "2026-11-06 12:00:00Z",
            "2026-11-06t12:00:00Z",
            "2026-11-06T12:00:60Z",
            "1900-02-29T12:00:00Z",
            "2026-11-06T12:00:00+00:00",
        ] {
            body["completedAt"] = Value::String(date.into());
            assert!(
                normalize_public_request("CreateProjectCompletionRecordRequest", &body.to_string())
                    .is_err(),
                "{date}"
            );
        }
    }
}
