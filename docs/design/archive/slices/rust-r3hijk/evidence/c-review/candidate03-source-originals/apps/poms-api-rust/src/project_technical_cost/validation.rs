//! Request-only transcription of the frozen Zod schemas. The public scalar
//! reader is shared only with this author's pricing module; no old private
//! validator or output contract is accessed.

use axum::http::StatusCode;
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json, value::RawValue};

use super::model::{CostItem, CreateRequest, RiskItem, ScopeItem};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::{NumberInput, js_number_string, legacy_number},
    error::ApiError,
    projects::model::trim_js,
};

const UUID_PATTERN: &str = "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/";
const DATETIME_PATTERN: &str = r"/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/";

pub fn json_type(raw: Option<&RawValue>) -> &'static str {
    let Some(raw) = raw else { return "undefined" };
    match raw.get().as_bytes().first() {
        Some(b'"') => "string",
        Some(b'{') => "object",
        Some(b'[') => "array",
        Some(b'n') => "null",
        Some(b't' | b'f') => "boolean",
        _ => "number",
    }
}

pub fn invalid_type(expected: &str, raw: Option<&RawValue>, path: Vec<Value>) -> Value {
    let received = json_type(raw);
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}

pub fn failure(errors: Vec<Value>) -> ApiError {
    ApiError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed","errors":errors}),
    )
}

pub fn object(raw: Option<&str>) -> Result<JsObject<'_>, ApiError> {
    let Some(raw) = raw else {
        return Err(failure(vec![invalid_type("object", None, vec![])]));
    };
    JsObject::parse(raw).map_err(|_| {
        let value: Option<&RawValue> = serde_json::from_str(raw).ok();
        failure(vec![invalid_type("object", value, vec![])])
    })
}

fn schema_exception() -> ApiError {
    ApiError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed"}),
    )
}

fn primitive_text(raw: &RawValue, array_item: bool) -> Result<String, ApiError> {
    match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map(|value| value.to_utf8_lossy())
            .map_err(|_| ApiError::internal()),
        "null" => Ok(if array_item { "" } else { "null" }.to_owned()),
        "boolean" => Ok(raw.get().to_owned()),
        "number" => Ok(js_number_string(raw.get().parse().unwrap_or(f64::NAN))),
        "array" => {
            let values: Vec<&RawValue> =
                serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
            values
                .into_iter()
                .map(|value| primitive_text(value, true))
                .collect::<Result<Vec<_>, _>>()
                .map(|values| values.join(","))
        }
        _ => {
            let value = JsObject::parse(raw.get()).map_err(|_| ApiError::internal())?;
            if value.get("toString").is_some() {
                Err(schema_exception())
            } else {
                Ok("[object Object]".to_owned())
            }
        }
    }
}

fn length_number(raw: &RawValue) -> Result<f64, ApiError> {
    match json_type(Some(raw)) {
        "null" => Ok(0.0),
        "boolean" => Ok(f64::from(raw.get() == "true")),
        "number" => Ok(raw.get().parse().unwrap_or(f64::NAN)),
        _ => Ok(legacy_number(NumberInput::Text(&primitive_text(
            raw, false,
        )?))),
    }
}

fn path(key: &str) -> Vec<Value> {
    vec![json!(key)]
}

/// Zod 4.6.1 checks code points, while JS trim uses ECMAScript whitespace.
/// Its length checks can also run after a non-string type issue.
pub fn text(
    object: &JsObject<'_>,
    key: &str,
    min: usize,
    max: usize,
    optional_nullable: bool,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ApiError> {
    let raw = object.get(key);
    if optional_nullable && (raw.is_none() || raw.is_some_and(|raw| raw.get() == "null")) {
        return Ok(None);
    }
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", raw, path(key)));
        if let Some(raw) = raw {
            let length = match json_type(Some(raw)) {
                "array" => {
                    let values: Vec<&RawValue> =
                        serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
                    Some(("array", values.len() as f64))
                }
                "object" => {
                    let value = JsObject::parse(raw.get()).map_err(|_| ApiError::internal())?;
                    value
                        .get("length")
                        .map(length_number)
                        .transpose()?
                        .map(|length| ("unknown", length))
                }
                _ => None,
            };
            if let Some((origin, length)) = length {
                let suffix = |bound: usize, small: bool| {
                    if origin == "array" {
                        format!(
                            "expected array to have {}{bound} items",
                            if small { ">=" } else { "<=" }
                        )
                    } else {
                        format!(
                            "expected unknown to be {}{bound}",
                            if small { ">=" } else { "<=" }
                        )
                    }
                };
                if min > 0 && (length < min as f64 || length.is_nan()) {
                    errors.push(json!({"origin":origin,"code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":format!("Too small: {}",suffix(min,true))}));
                }
                if length > max as f64 || length.is_nan() {
                    errors.push(json!({"origin":origin,"code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: {}",suffix(max,false))}));
                }
            }
        }
        return Ok(None);
    };
    let value = trim_js(value);
    let length = char::decode_utf16(value.as_code_units().iter().copied()).count();
    if length < min {
        errors.push(json!({"origin":"string","code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":format!("Too small: expected string to have >={min} characters")}));
    }
    if length > max {
        errors.push(json!({"origin":"string","code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: expected string to have <={max} characters")}));
    }
    Ok(Some(value))
}

pub fn required_text(
    object: &JsObject<'_>,
    key: &str,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<JsString, ApiError> {
    Ok(text(object, key, 1, max, false, errors)?.unwrap_or_else(empty))
}

pub fn empty() -> JsString {
    JsString::from_code_units(Vec::new())
}

pub fn enumeration(
    object: &JsObject<'_>,
    key: &str,
    values: &[&str],
    errors: &mut Vec<Value>,
) -> String {
    if let Some(value) = object
        .get(key)
        .and_then(|raw| decode_string(raw.get()).ok())
        .map(|value| value.to_utf8_lossy())
        && values.contains(&value.as_str())
    {
        return value;
    }
    let allowed = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":[key],"message":format!("Invalid option: expected one of {allowed}")}));
    String::new()
}

pub fn boolean(object: &JsObject<'_>, key: &str, optional: bool, errors: &mut Vec<Value>) -> bool {
    let raw = object.get(key);
    if optional && raw.is_none() {
        return false;
    }
    match raw.map(RawValue::get) {
        Some("true") => true,
        Some("false") => false,
        _ => {
            errors.push(invalid_type("boolean", raw, path(key)));
            false
        }
    }
}

pub fn sort_order(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Option<i64> {
    let raw = object.get("sortOrder")?;
    if json_type(Some(raw)) != "number" {
        errors.push(invalid_type("number", Some(raw), path("sortOrder")));
        return None;
    }
    let value = raw.get().parse::<f64>().unwrap_or(f64::NAN);
    if !value.is_finite() {
        errors.push(json!({"expected":"number","code":"invalid_type","received":"Infinity","path":["sortOrder"],"message":"Invalid input: expected number, received Infinity"}));
        return None;
    }
    if value.fract() != 0.0 {
        errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":["sortOrder"],"message":"Invalid input: expected int, received number"}));
        return None;
    }
    if value > 9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_big","maximum":9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":["sortOrder"],"message":"Too big: expected int to be <=9007199254740991"}));
    } else if value < -9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_small","minimum":-9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":["sortOrder"],"message":"Too small: expected int to be >=-9007199254740991"}));
    }
    if value < 0.0 {
        errors.push(json!({"origin":"number","code":"too_small","minimum":0,"inclusive":true,"path":["sortOrder"],"message":"Too small: expected number to be >=0"}));
    }
    Some(value as i64)
}

pub fn decimal(
    object: &JsObject<'_>,
    key: &str,
    scale: usize,
    signed: bool,
    optional_nullable: bool,
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key);
    if optional_nullable && (raw.is_none() || raw.is_some_and(|raw| raw.get() == "null")) {
        return None;
    }
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", raw, path(key)));
        return None;
    };
    let value = trim_js(value).to_utf8_lossy();
    let digits = if signed {
        value.strip_prefix('-').unwrap_or(&value)
    } else {
        &value
    };
    let mut parts = digits.split('.');
    let whole = parts.next().unwrap_or("");
    let fraction = parts.next();
    let valid = !whole.is_empty()
        && whole.bytes().all(|b| b.is_ascii_digit())
        && fraction.is_none_or(|part| {
            !part.is_empty() && part.len() <= scale && part.bytes().all(|b| b.is_ascii_digit())
        })
        && parts.next().is_none();
    if !valid {
        let pattern = format!(
            "/^{}\\d+(\\.\\d{{1,{scale}}})?$/",
            if signed { "-?" } else { "" }
        );
        errors.push(json!({"origin":"string","code":"invalid_format","format":"regex","pattern":pattern,"path":[key],"message":format!("Invalid string: must match pattern {pattern}")}));
    }
    Some(value)
}

pub fn uuid(
    object: &JsObject<'_>,
    key: &str,
    optional_nullable: bool,
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key);
    if optional_nullable && (raw.is_none() || raw.is_some_and(|r| r.get() == "null")) {
        return None;
    }
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", raw, path(key)));
        return None;
    };
    let value = value.to_utf8_lossy();
    let b = value.as_bytes();
    let valid = value == "00000000-0000-0000-0000-000000000000"
        || value == "ffffffff-ffff-ffff-ffff-ffffffffffff"
        || b.len() == 36
            && b.iter().enumerate().all(|(i, b)| {
                if [8, 13, 18, 23].contains(&i) {
                    *b == b'-'
                } else {
                    b.is_ascii_hexdigit()
                }
            })
            && matches!(b[14], b'1'..=b'8')
            && matches!(b[19], b'8' | b'9' | b'a' | b'A' | b'b' | b'B');
    if !valid {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":[key],"message":"Invalid UUID"}));
    }
    Some(value)
}

pub fn datetime(
    object: &JsObject<'_>,
    key: &str,
    errors: &mut Vec<Value>,
) -> Option<DateTime<Utc>> {
    let raw = object.get(key)?;
    if raw.get() == "null" {
        return None;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type("string", Some(raw), path(key)));
        return None;
    };
    let value = value.to_utf8_lossy();
    let parsed = (|| {
        let b = value.as_bytes();
        if !value.is_ascii()
            || b.len() < 20
            || b[4] != b'-'
            || b[7] != b'-'
            || b[10] != b'T'
            || b[13] != b':'
            || b[16] != b':'
            || b.last() != Some(&b'Z')
        {
            return None;
        }
        for range in [0..4, 5..7, 8..10, 11..13, 14..16, 17..19] {
            if !b[range].iter().all(u8::is_ascii_digit) {
                return None;
            }
        }
        let fraction = &value[19..value.len() - 1];
        let millis = if fraction.is_empty() {
            0
        } else {
            let digits = fraction.strip_prefix('.')?;
            if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
                return None;
            }
            digits
                .bytes()
                .take(3)
                .enumerate()
                .map(|(i, b)| u32::from(b - b'0') * [100, 10, 1][i])
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
        .map(|v| v.and_utc())
    })();
    if parsed.is_none() {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"datetime","pattern":DATETIME_PATTERN,"path":[key],"message":"Invalid ISO datetime"}));
    }
    parsed
}

pub fn array<T>(
    object: &JsObject<'_>,
    key: &str,
    default_empty: bool,
    minimum: usize,
    errors: &mut Vec<Value>,
    parse: impl Fn(&JsObject<'_>, &mut Vec<Value>) -> Result<T, ApiError>,
) -> Result<Vec<T>, ApiError> {
    let raw = object.get(key);
    if default_empty && raw.is_none() {
        return Ok(Vec::new());
    }
    let Some(raw) = raw.filter(|raw| json_type(Some(raw)) == "array") else {
        errors.push(invalid_type("array", raw, path(key)));
        // Zod's min-length `when` is independent of the array type issue:
        // any non-nullish JSON value with a defined .length still runs it.
        // Strings use code points; an object's length uses JS >= coercion,
        // and a failed/NaN comparison emits an origin=unknown issue.
        if minimum > 0
            && let Some(raw) = raw
        {
            let length = match json_type(Some(raw)) {
                "string" => {
                    let value = decode_string(raw.get()).map_err(|_| ApiError::internal())?;
                    Some((
                        "string",
                        char::decode_utf16(value.as_code_units().iter().copied()).count() as f64,
                    ))
                }
                "object" => {
                    let value = JsObject::parse(raw.get()).map_err(|_| ApiError::internal())?;
                    value
                        .get("length")
                        .map(length_number)
                        .transpose()?
                        .map(|length| ("unknown", length))
                }
                _ => None,
            };
            if let Some((origin, length)) = length
                && (length < minimum as f64 || length.is_nan())
            {
                let message = if origin == "string" {
                    format!("Too small: expected string to have >={minimum} characters")
                } else {
                    format!("Too small: expected unknown to be >={minimum}")
                };
                errors.push(json!({"origin":origin,"code":"too_small","minimum":minimum,"inclusive":true,"path":[key],"message":message}));
            }
        }
        return Ok(Vec::new());
    };
    let values: Vec<&RawValue> =
        serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
    let mut result = Vec::new();
    for (index, value) in values.iter().enumerate() {
        let mut nested = Vec::new();
        match JsObject::parse(value.get()) {
            Ok(object) => result.push(parse(&object, &mut nested)?),
            Err(_) => nested.push(invalid_type("object", Some(value), Vec::new())),
        }
        for mut error in nested {
            let mut prefix = vec![json!(key), json!(index)];
            if let Some(path) = error.get_mut("path").and_then(Value::as_array_mut) {
                prefix.append(path);
                *path = prefix;
            }
            errors.push(error);
        }
    }
    if values.len() < minimum {
        errors.push(json!({"origin":"array","code":"too_small","minimum":minimum,"inclusive":true,"path":[key],"message":format!("Too small: expected array to have >={minimum} items")}));
    }
    Ok(result)
}

fn scope(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Result<ScopeItem, ApiError> {
    Ok(ScopeItem {
        scope_type: enumeration(
            object,
            "scopeType",
            &["in-scope", "out-of-scope", "assumption"],
            errors,
        ),
        label: required_text(object, "label", 255, errors)?,
        description: required_text(object, "description", 2000, errors)?,
        sort_order: sort_order(object, errors),
    })
}
fn risk(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Result<RiskItem, ApiError> {
    Ok(RiskItem {
        risk_category: required_text(object, "riskCategory", 128, errors)?,
        risk_level: enumeration(object, "riskLevel", &["R1", "R2", "R3", "R4"], errors),
        risk_description: required_text(object, "riskDescription", 2000, errors)?,
        impact_scope: required_text(object, "impactScope", 1000, errors)?,
        mitigation_plan: required_text(object, "mitigationPlan", 2000, errors)?,
        owner_role: required_text(object, "ownerRole", 128, errors)?,
        risk_status: enumeration(
            object,
            "riskStatus",
            &["open", "mitigating", "accepted", "closed"],
            errors,
        ),
        blocks_next_stage: boolean(object, "blocksNextStage", false, errors),
        sort_order: sort_order(object, errors),
    })
}
fn cost(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Result<CostItem, ApiError> {
    Ok(CostItem {
        cost_category: required_text(object, "costCategory", 128, errors)?,
        cost_subcategory: text(object, "costSubcategory", 1, 128, true, errors)?,
        cost_description: required_text(object, "costDescription", 2000, errors)?,
        estimation_basis: required_text(object, "estimationBasis", 2000, errors)?,
        quantity: decimal(object, "quantity", 4, false, true, errors),
        unit: text(object, "unit", 1, 32, true, errors)?,
        unit_price: decimal(object, "unitPrice", 4, false, true, errors),
        amount_excluding_tax: decimal(object, "amountExcludingTax", 2, false, false, errors)
            .unwrap_or_default(),
        tax_cost_amount: decimal(object, "taxCostAmount", 2, false, false, errors)
            .unwrap_or_default(),
        amount_including_tax: decimal(object, "amountIncludingTax", 2, false, false, errors)
            .unwrap_or_default(),
        currency_code: text(object, "currencyCode", 3, 16, false, errors)?.unwrap_or_else(empty),
        confidence_level: enumeration(
            object,
            "confidenceLevel",
            &["high", "medium", "low"],
            errors,
        ),
        high_uncertainty: boolean(object, "highUncertainty", false, errors),
        responsible_role: text(object, "responsibleRole", 1, 128, true, errors)?,
        sort_order: sort_order(object, errors),
    })
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateRequest, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let result = CreateRequest {
        technical_feasibility_decision: enumeration(
            &object,
            "technicalFeasibilityDecision",
            &["feasible", "conditional", "not-feasible"],
            &mut errors,
        ),
        technical_conclusion_summary: required_text(
            &object,
            "technicalConclusionSummary",
            2000,
            &mut errors,
        )?,
        allow_next_stage: boolean(&object, "allowNextStage", false, &mut errors),
        currency_code: text(&object, "currencyCode", 3, 16, false, &mut errors)?
            .unwrap_or_else(empty),
        tax_assumption_summary: required_text(&object, "taxAssumptionSummary", 2000, &mut errors)?,
        tax_review_status: enumeration(
            &object,
            "taxReviewStatus",
            &["pending", "reviewed", "not-required"],
            &mut errors,
        ),
        scope_items: array(&object, "scopeItems", true, 0, &mut errors, scope)?,
        risk_items: array(&object, "riskItems", true, 0, &mut errors, risk)?,
        cost_items: array(&object, "costItems", false, 1, &mut errors, cost)?,
    };
    if errors.is_empty() {
        Ok(result)
    } else {
        Err(failure(errors))
    }
}
