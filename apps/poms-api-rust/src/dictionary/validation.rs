//! Request-only validation against the checked-in original Zod oracle.
//! Unknown fields strip; persisted/output text never passes through this module.

use axum::http::StatusCode;
use serde_json::{Value, json, value::RawValue};

use super::{
    domains,
    model::{CreateDictionaryItem, DictionaryQuery, UpdateDictionaryItem},
    statuses,
};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::{
        json::Field,
        scalars::{NumberInput, js_number_string, legacy_number},
    },
    error::ApiError,
};

pub(crate) fn json_type(raw: Option<&RawValue>) -> &'static str {
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

pub(crate) fn invalid_type(expected: &str, received: &str, path: Vec<Value>) -> Value {
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}

pub(crate) fn failure(errors: Vec<Value>) -> ApiError {
    ApiError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed","errors":errors}),
    )
}

fn schema_exception() -> ApiError {
    // The original vendor validate() catches every schema exception, including
    // TypeError. Non-Zod errors have no `issues`, so JSON omits `errors`.
    ApiError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed"}),
    )
}

pub(crate) fn object(raw: Option<&str>) -> Result<JsObject<'_>, ApiError> {
    let Some(raw) = raw else {
        return Err(failure(vec![invalid_type("object", "undefined", vec![])]));
    };
    JsObject::parse(raw).map_err(|_| {
        let value: Option<&RawValue> = serde_json::from_str(raw).ok();
        failure(vec![invalid_type("object", json_type(value), vec![])])
    })
}

fn whitespace(unit: u16) -> bool {
    matches!(unit, 0x0009..=0x000d | 0x0020 | 0x00a0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
}

// Zod's length checks have an explicit `when`: they still run after the string
// type check on arrays and objects with a length property. JSON can also supply
// a non-number length, so the relational comparison uses JS ToNumber.
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
            // JSON cannot contain callable methods. An own non-callable
            // toString shadows Object.prototype.toString and ToPrimitive throws.
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

fn invalid_text_length(
    raw: Option<&RawValue>,
    key: &str,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<(), ApiError> {
    let Some(raw) = raw else { return Ok(()) };
    let (origin, length) = match json_type(Some(raw)) {
        "array" => {
            let values: Vec<&RawValue> =
                serde_json::from_str(raw.get()).map_err(|_| ApiError::internal())?;
            ("array", values.len() as f64)
        }
        "object" => {
            let value = JsObject::parse(raw.get()).map_err(|_| ApiError::internal())?;
            let Some(length) = value.get("length") else {
                return Ok(());
            };
            ("unknown", length_number(length)?)
        }
        _ => return Ok(()),
    };
    if min > 0 && (length < min as f64 || length.is_nan()) {
        let message = if origin == "array" {
            format!("Too small: expected array to have >={min} items")
        } else {
            format!("Too small: expected unknown to be >={min}")
        };
        errors.push(json!({"origin":origin,"code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":message}));
    }
    if length > max as f64 || length.is_nan() {
        let message = if origin == "array" {
            format!("Too big: expected array to have <={max} items")
        } else {
            format!("Too big: expected unknown to be <={max}")
        };
        errors.push(json!({"origin":origin,"code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":message}));
    }
    Ok(())
}

pub(crate) fn text(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    trim: bool,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ApiError> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Ok(None);
    }
    let Some(mut value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        invalid_text_length(raw, key, min, max, errors)?;
        return Ok(None);
    };
    if trim {
        let units = value.as_code_units();
        let first = units
            .iter()
            .position(|unit| !whitespace(*unit))
            .unwrap_or(units.len());
        let last = units
            .iter()
            .rposition(|unit| !whitespace(*unit))
            .map_or(first, |index| index + 1);
        value = JsString::from_code_units(units[first..last].to_vec());
    }
    let length = char::decode_utf16(value.as_code_units().iter().copied()).count();
    if length < min {
        errors.push(json!({"origin":"string","code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":format!("Too small: expected string to have >={min} characters")}));
    }
    if length > max {
        errors.push(json!({"origin":"string","code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: expected string to have <={max} characters")}));
    }
    Ok(Some(value))
}

fn description(
    object: &JsObject<'_>,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ApiError> {
    match object.get("description") {
        None => Ok(Field::Missing),
        Some(raw) if raw.get() == "null" => Ok(Field::Null),
        Some(_) => Ok(text(object, "description", false, true, 1, 1000, errors)?
            .map_or(Field::Missing, Field::Value)),
    }
}

pub(crate) fn integer(
    object: &JsObject<'_>,
    key: &str,
    minimum: Option<i64>,
    errors: &mut Vec<Value>,
) -> Option<i64> {
    let raw = object.get(key)?;
    let path = vec![json!(key)];
    if json_type(Some(raw)) != "number" {
        errors.push(invalid_type("number", json_type(Some(raw)), path));
        return None;
    }
    let value = raw.get().parse::<f64>().unwrap_or(f64::NAN);
    if !value.is_finite() {
        errors.push(json!({"expected":"number","code":"invalid_type","received":"Infinity","path":path,"message":"Invalid input: expected number, received Infinity"}));
        return None;
    }
    if value.fract() != 0.0 {
        errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":path,"message":"Invalid input: expected int, received number"}));
        return None;
    }
    const SAFE: f64 = 9_007_199_254_740_991.0;
    if value > SAFE {
        errors.push(json!({"code":"too_big","maximum":9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too big: expected int to be <=9007199254740991"}));
    } else if value < -SAFE {
        errors.push(json!({"code":"too_small","minimum":-9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too small: expected int to be >=-9007199254740991"}));
    }
    if let Some(minimum) = minimum
        && value < minimum as f64
    {
        errors.push(json!({"origin":"number","code":"too_small","minimum":0,"inclusive":minimum!=1,"path":path,"message":if minimum == 1 {"Too small: expected number to be >0"} else {"Too small: expected number to be >=0"}}));
    }
    Some(value as i64)
}

fn enumeration(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    values: &[String],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return None;
    }
    if let Some(text) = raw
        .and_then(|raw| decode_string(raw.get()).ok())
        .map(|value| value.to_utf8_lossy())
        && values.contains(&text)
    {
        return Some(text);
    }
    let allowed = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":[key],"message":format!("Invalid option: expected one of {allowed}")}));
    None
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateDictionaryItem, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let domain = enumeration(&object, "domain", true, domains(), &mut errors);
    let code = text(&object, "code", true, true, 1, 64, &mut errors)?;
    if let Some(code) = code.as_ref() {
        let units = code.as_code_units();
        if units
            .first()
            .is_none_or(|unit| !matches!(*unit, 0x61..=0x7a))
            || units
                .iter()
                .any(|unit| !matches!(*unit,0x61..=0x7a|0x30..=0x39|0x2d))
        {
            errors.push(json!({"origin":"string","code":"invalid_format","format":"regex","pattern":"/^[a-z][a-z0-9-]*$/","path":["code"],"message":"Dictionary code must use lower kebab-case"}));
        }
    }
    let name = text(&object, "name", true, true, 1, 128, &mut errors)?;
    let description = description(&object, &mut errors)?;
    let sort_order = integer(&object, "sortOrder", Some(0), &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (domain, code, name) {
        (Some(domain), Some(code), Some(name)) => Ok(CreateDictionaryItem {
            domain,
            code,
            name,
            description,
            sort_order,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update(raw: Option<&str>) -> Result<UpdateDictionaryItem, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let name = text(&object, "name", false, true, 1, 128, &mut errors)?;
    let description = description(&object, &mut errors)?;
    let status = enumeration(&object, "status", false, statuses(), &mut errors);
    let sort_order = integer(&object, "sortOrder", Some(0), &mut errors);
    let expected_version = integer(&object, "expectedVersion", Some(1), &mut errors);
    if errors.is_empty()
        && name.is_none()
        && description.is_missing()
        && status.is_none()
        && sort_order.is_none()
    {
        errors.push(
            json!({"code":"custom","path":[],"message":"At least one updatable field is required"}),
        );
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateDictionaryItem {
        name,
        description,
        status,
        sort_order,
        expected_version,
    })
}

pub fn validate_query(raw: Option<&str>) -> Result<DictionaryQuery, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let domain = enumeration(&object, "domain", false, domains(), &mut errors);
    let status = enumeration(&object, "status", false, statuses(), &mut errors);
    let keyword = text(&object, "keyword", false, true, 1, 128, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(DictionaryQuery {
        domain,
        status,
        keyword,
    })
}

/// Express's simple query parser retains repeated names as arrays. Bracketed
/// names are literal keys and are subsequently stripped by the original DTO.
/// Its default maxKeys counts the first 1000 raw pairs, including empty pairs,
/// before percent-decoding or skipping empty pairs.
pub fn query_raw(query: Option<&str>) -> String {
    let mut fields = serde_json::Map::new();
    let limited = query
        .unwrap_or("")
        .split('&')
        .take(1000)
        .collect::<Vec<_>>()
        .join("&");
    for (key, value) in url::form_urlencoded::parse(limited.as_bytes()) {
        let value = Value::String(value.into_owned());
        match fields.entry(key.into_owned()) {
            serde_json::map::Entry::Vacant(entry) => {
                entry.insert(value);
            }
            serde_json::map::Entry::Occupied(mut entry) => match entry.get_mut() {
                Value::Array(values) => values.push(value),
                previous => {
                    *previous = Value::Array(vec![previous.clone(), value]);
                }
            },
        }
    }
    Value::Object(fields).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    fn optional(fields: &mut Vec<String>, key: &str, value: Option<&JsString>) {
        if let Some(value) = value {
            fields.push(format!("\"{key}\":{}", value.json()));
        }
    }
    fn desc(fields: &mut Vec<String>, value: &Field<JsString>) {
        match value {
            Field::Missing => {}
            Field::Null => fields.push("\"description\":null".into()),
            Field::Value(value) => optional(fields, "description", Some(value)),
        }
    }
    fn number(fields: &mut Vec<String>, key: &str, value: Option<i64>) {
        if let Some(value) = value {
            fields.push(format!("\"{key}\":{value}"));
        }
    }
    fn sample(schema: &str, raw: Option<&str>) -> Result<String, ApiError> {
        let mut fields = Vec::new();
        match schema {
            "DictionaryItemListQuery" => {
                let v = validate_query(raw)?;
                if let Some(v) = v.domain {
                    fields.push(format!("\"domain\":\"{v}\""));
                }
                if let Some(v) = v.status {
                    fields.push(format!("\"status\":\"{v}\""));
                }
                optional(&mut fields, "keyword", v.keyword.as_ref());
            }
            "CreateDictionaryItemRequest" => {
                let v = validate_create(raw)?;
                fields.push(format!("\"domain\":\"{}\"", v.domain));
                optional(&mut fields, "code", Some(&v.code));
                optional(&mut fields, "name", Some(&v.name));
                desc(&mut fields, &v.description);
                number(&mut fields, "sortOrder", v.sort_order);
            }
            "UpdateDictionaryItemRequest" => {
                let v = validate_update(raw)?;
                optional(&mut fields, "name", v.name.as_ref());
                desc(&mut fields, &v.description);
                if let Some(v) = v.status {
                    fields.push(format!("\"status\":\"{v}\""));
                }
                number(&mut fields, "sortOrder", v.sort_order);
                number(&mut fields, "expectedVersion", v.expected_version);
            }
            _ => {
                let v = crate::system_settings::validation::validate_update(raw)?;
                number(&mut fields, "value", Some(v.value));
                number(&mut fields, "expectedVersion", v.expected_version);
            }
        }
        Ok(format!("{{{}}}", fields.join(",")))
    }
    fn canonical(raw: &str) -> Vec<(String, String)> {
        JsObject::parse(raw)
            .unwrap_or_else(|_| panic!("JSON object"))
            .entries()
            .map(|(key, value)| {
                (
                    key.json(),
                    decode_string(value.get())
                        .map_or_else(|_| value.get().to_owned(), |value| value.json()),
                )
            })
            .collect()
    }
    #[tokio::test]
    async fn actual_original_zod_wire_corpus_matches_payloads_and_complete_issues() {
        let corpus: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/e-golden.json"))
                .unwrap_or_else(|_| panic!("original oracle"));
        for case in corpus["cases"]
            .as_array()
            .unwrap_or_else(|| panic!("cases"))
        {
            let label = format!("{} / {}", case["schema"], case["name"]);
            match sample(
                case["schema"].as_str().unwrap_or(""),
                case["inputRaw"].as_str(),
            ) {
                Ok(actual) => {
                    assert_eq!(case["expected"]["success"], true, "{label}");
                    assert_eq!(
                        canonical(&actual),
                        canonical(case["expected"]["dataRaw"].as_str().unwrap_or("")),
                        "{label}"
                    );
                }
                Err(error) => {
                    assert_eq!(case["expected"]["success"], false, "{label}");
                    let response = error.into_response();
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{label}");
                    let bytes = axum::body::to_bytes(response.into_body(), 1_000_000)
                        .await
                        .unwrap_or_else(|_| panic!("body"));
                    let actual: Value =
                        serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("error JSON"));
                    let expected = if case["expected"].get("internalError").is_some() {
                        json!({"statusCode":400,"message":"Validation failed"})
                    } else {
                        json!({"statusCode":400,"message":"Validation failed","errors":case["expected"]["errors"]})
                    };
                    assert_eq!(actual, expected, "{label}");
                }
            }
        }
    }
    #[test]
    fn repeated_query_fields_remain_arrays_until_zod_rejects_them() {
        assert!(
            validate_query(Some(&query_raw(Some(
                "domain=lead-source&domain=lead-source"
            ))))
            .is_err()
        );
        assert_eq!(
            query_raw(Some("keyword=a+b&unknown=1")),
            "{\"keyword\":\"a b\",\"unknown\":\"1\"}"
        );
    }

    #[test]
    fn simple_query_limit_counts_raw_pairs_including_empty_pairs_before_decoding() {
        let repeated_1000 = std::iter::repeat_n("u=1", 1000)
            .collect::<Vec<_>>()
            .join("&");
        let dropped = query_raw(Some(&format!("{repeated_1000}&domain=invalid")));
        assert!(validate_query(Some(&dropped)).is_ok());
        let fields: serde_json::Value =
            serde_json::from_str(&dropped).unwrap_or_else(|_| panic!("query JSON"));
        assert_eq!(fields["u"].as_array().map(Vec::len), Some(1000));
        assert!(fields.get("domain").is_none());

        let repeated_999 = std::iter::repeat_n("u=1", 999)
            .collect::<Vec<_>>()
            .join("&");
        assert!(
            validate_query(Some(&query_raw(Some(&format!(
                "{repeated_999}&domain=invalid"
            )))))
            .is_err()
        );
        assert!(
            validate_query(Some(&query_raw(Some(&format!(
                "{}domain=invalid",
                "&".repeat(1000)
            )))))
            .is_ok()
        );
        assert!(
            validate_query(Some(&query_raw(Some(&format!(
                "{}domain=invalid",
                "&".repeat(999)
            )))))
            .is_err()
        );

        let encoded = format!("{}keyword=a%26b", "&".repeat(999));
        assert_eq!(query_raw(Some(&encoded)), "{\"keyword\":\"a&b\"}");
    }
}
