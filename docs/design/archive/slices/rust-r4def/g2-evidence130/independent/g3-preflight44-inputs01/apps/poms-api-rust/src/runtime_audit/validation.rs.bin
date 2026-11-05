//! Request-only Zod compatibility. No output or persisted snapshot filtering.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json, value::RawValue};

use super::{
    model::{QueryKind, RecordRouteDenied},
    query::{QueryValue, ValidatedQuery},
};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::{
        NumberInput, UuidText, js_number_string, legacy_number, valid_wire_utc_datetime,
    },
    error::ApiError,
    shared::generated::{AuditLogResult, PermissionKey, SecurityEventResult},
};

#[derive(Debug)]
pub(crate) struct ValidationError {
    errors: Option<Vec<Value>>,
}
impl IntoResponse for ValidationError {
    fn into_response(self) -> Response {
        let mut body = json!({"statusCode":400,"message":"Validation failed"});
        if let Some(errors) = self.errors {
            body["errors"] = json!(errors);
        }
        ApiError::object(StatusCode::BAD_REQUEST, body).into_response()
    }
}
fn failure(errors: Vec<Value>) -> ValidationError {
    ValidationError {
        errors: Some(errors),
    }
}
fn schema_exception() -> ValidationError {
    ValidationError { errors: None }
}

fn json_type(raw: Option<&RawValue>) -> &'static str {
    let Some(raw) = raw else {
        return "undefined";
    };
    match raw.get().as_bytes().first() {
        Some(b'"') => "string",
        Some(b'{') => "object",
        Some(b'[') => "array",
        Some(b'n') => "null",
        Some(b't' | b'f') => "boolean",
        _ => "number",
    }
}
fn invalid_type(expected: &str, received: &str, path: Vec<Value>) -> Value {
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}
fn object(raw: Option<&str>) -> Result<JsObject<'_>, ValidationError> {
    let Some(raw) = raw else {
        return Err(failure(vec![invalid_type("object", "undefined", vec![])]));
    };
    JsObject::parse(raw).map_err(|_| {
        failure(vec![invalid_type(
            "object",
            json_type(serde_json::from_str::<&RawValue>(raw).ok()),
            vec![],
        )])
    })
}

// ToPrimitive/String and ToNumber match the existing users request validator.
fn primitive_text(raw: &RawValue, array_item: bool) -> Result<String, ()> {
    match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map(|value| value.to_utf8_lossy())
            .map_err(|_| ()),
        "null" => Ok(if array_item { "" } else { "null" }.to_owned()),
        "boolean" => Ok(raw.get().to_owned()),
        "number" => Ok(js_number_string(raw.get().parse().unwrap_or(f64::NAN))),
        "array" => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| ())?
            .into_iter()
            .map(|item| primitive_text(item, true))
            .collect::<Result<Vec<_>, _>>()
            .map(|items| items.join(",")),
        _ => {
            let value = JsObject::parse(raw.get()).map_err(|_| ())?;
            if value.get("toString").is_some() {
                Err(())
            } else {
                Ok("[object Object]".to_owned())
            }
        }
    }
}
fn number(raw: &RawValue) -> Result<f64, ()> {
    match json_type(Some(raw)) {
        "null" => Ok(0.0),
        "boolean" => Ok(f64::from(raw.get() == "true")),
        "number" => Ok(raw.get().parse().unwrap_or(f64::NAN)),
        _ => Ok(legacy_number(NumberInput::Text(&primitive_text(
            raw, false,
        )?))),
    }
}
fn invalid_length(
    raw: Option<&RawValue>,
    key: &str,
    min: usize,
    max: Option<usize>,
    errors: &mut Vec<Value>,
) -> Result<(), ValidationError> {
    let Some(raw) = raw else {
        return Ok(());
    };
    let (origin, length) = match json_type(Some(raw)) {
        "string" => (
            "string",
            char::decode_utf16(
                decode_string(raw.get())
                    .map_err(|_| schema_exception())?
                    .as_code_units()
                    .iter()
                    .copied(),
            )
            .count() as f64,
        ),
        "array" => (
            "array",
            serde_json::from_str::<Vec<&RawValue>>(raw.get())
                .map_err(|_| schema_exception())?
                .len() as f64,
        ),
        "object" => {
            let object = JsObject::parse(raw.get()).map_err(|_| schema_exception())?;
            let Some(length) = object.get("length") else {
                return Ok(());
            };
            ("unknown", number(length).map_err(|_| schema_exception())?)
        }
        _ => return Ok(()),
    };
    if length < min as f64 || length.is_nan() {
        errors.push(json!({"origin":origin,"code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":match origin { "array" => format!("Too small: expected array to have >={min} items"), "string" => format!("Too small: expected string to have >={min} characters"), _ => format!("Too small: expected unknown to be >={min}") }}));
    }
    if let Some(max) = max
        && (length > max as f64 || length.is_nan())
    {
        errors.push(json!({"origin":origin,"code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":if origin == "array" {format!("Too big: expected array to have <={max} items")} else {format!("Too big: expected unknown to be <={max}")}}));
    }
    Ok(())
}
fn text(
    raw: Option<&RawValue>,
    key: &str,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ValidationError> {
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        invalid_length(raw, key, min, Some(max), errors)?;
        return Ok(None);
    };
    let length = char::decode_utf16(value.as_code_units().iter().copied()).count();
    if length < min {
        errors.push(json!({"origin":"string","code":"too_small","minimum":min,"inclusive":true,"path":[key],"message":format!("Too small: expected string to have >={min} characters")}));
    }
    if length > max {
        errors.push(json!({"origin":"string","code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: expected string to have <={max} characters")}));
    }
    Ok(Some(value))
}
fn format_text(
    raw: &RawValue,
    key: &str,
    format: &str,
    errors: &mut Vec<Value>,
) -> Option<JsString> {
    let Ok(value) = decode_string(raw.get()) else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!(key)],
        ));
        return None;
    };
    let scalar = value.to_utf8_lossy();
    let valid = if format == "datetime" {
        valid_wire_utc_datetime(&scalar)
    } else {
        // Zod's all-f UUID sentinel is lowercase; its ordinary UUID branches
        // retain ASCII case, while SQL UUID binding is a separate concern.
        UuidText::parse(&scalar).is_ok()
            && !(scalar.eq_ignore_ascii_case("ffffffff-ffff-ffff-ffff-ffffffffffff")
                && scalar != "ffffffff-ffff-ffff-ffff-ffffffffffff")
    };
    if !valid {
        let authority: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-authority.json"))
                .unwrap_or(Value::Null);
        let pattern = if format == "datetime" {
            &authority["datetimePattern"]
        } else {
            &authority["uuidPattern"]
        };
        errors.push(json!({"origin":"string","code":"invalid_format","format":format,"pattern":pattern,"path":[key],"message":if format == "datetime" {"Invalid ISO datetime"} else {"Invalid UUID"}}));
    }
    Some(value)
}
fn enum_issue(values: &[&str], path: Vec<Value>) -> Value {
    let options = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    json!({"code":"invalid_value","values":values,"path":path,"message":format!("Invalid option: expected one of {options}")})
}
fn enum_text(
    raw: &RawValue,
    key: &str,
    values: &[&str],
    errors: &mut Vec<Value>,
) -> Option<JsString> {
    let text = decode_string(raw.get()).ok();
    if !text
        .as_ref()
        .is_some_and(|text| values.iter().any(|value| text.eq_ascii(value)))
    {
        errors.push(enum_issue(values, vec![json!(key)]));
    }
    text
}
fn limit(raw: &RawValue, errors: &mut Vec<Value>) -> Option<i64> {
    let path = vec![json!("limit")];
    let value = match number(raw) {
        Ok(value) => value,
        Err(()) => {
            errors.push(invalid_type("number", json_type(Some(raw)), path));
            return None;
        }
    };
    if !value.is_finite() {
        let received = if value.is_nan() { "NaN" } else { "Infinity" };
        errors.push(json!({"expected":"number","code":"invalid_type","received":received,"path":path,"message":format!("Invalid input: expected number, received {received}")}));
        return None;
    }
    if value.fract() != 0.0 {
        errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":path,"message":"Invalid input: expected int, received number"}));
        return None;
    }
    if value > 9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_big","maximum":9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too big: expected int to be <=9007199254740991"}));
    }
    if value < -9_007_199_254_740_991.0 {
        errors.push(json!({"code":"too_small","minimum":-9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too small: expected int to be >=-9007199254740991"}));
    }
    if value < 1.0 {
        errors.push(json!({"origin":"number","code":"too_small","minimum":1,"inclusive":true,"path":path,"message":"Too small: expected number to be >=1"}));
    }
    if value > 100.0 {
        errors.push(json!({"origin":"number","code":"too_big","maximum":100,"inclusive":true,"path":path,"message":"Too big: expected number to be <=100"}));
    }
    Some(value as i64)
}

pub(crate) fn query_fields(kind: QueryKind) -> &'static [&'static str] {
    match kind {
        QueryKind::Audit => &[
            "from",
            "to",
            "eventType",
            "targetType",
            "targetId",
            "operatorId",
            "result",
            "limit",
        ],
        QueryKind::Entity => &["from", "to", "eventType", "result", "limit"],
        QueryKind::Security => &[
            "from",
            "to",
            "eventType",
            "actorId",
            "principal",
            "path",
            "permissionKey",
            "result",
            "limit",
        ],
    }
}
pub(crate) fn validate_query(
    kind: QueryKind,
    raw: Option<&str>,
) -> Result<ValidatedQuery, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let mut fields = Vec::new();
    for &key in query_fields(kind) {
        let Some(raw) = object.get(key) else {
            continue;
        };
        if key == "limit" {
            if let Some(value) = limit(raw, &mut errors) {
                fields.push((key, QueryValue::Number(value)));
            }
            continue;
        }
        let value = match key {
            "from" | "to" => format_text(raw, key, "datetime", &mut errors),
            "operatorId" | "actorId" => format_text(raw, key, "uuid", &mut errors),
            "result" => {
                let values = if kind == QueryKind::Security {
                    SecurityEventResult::ALL
                        .iter()
                        .map(|value| value.as_str())
                        .collect::<Vec<_>>()
                } else {
                    AuditLogResult::ALL
                        .iter()
                        .map(|value| value.as_str())
                        .collect::<Vec<_>>()
                };
                enum_text(raw, key, &values, &mut errors)
            }
            _ => text(
                Some(raw),
                key,
                1,
                match key {
                    "targetType" => 64,
                    "principal" | "path" => 255,
                    _ => 128,
                },
                &mut errors,
            )?,
        };
        if let Some(value) = value {
            fields.push((key, QueryValue::Text(value)));
        }
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(ValidatedQuery { kind, fields })
}

pub(crate) fn validate_route_denied(
    raw: Option<&str>,
) -> Result<RecordRouteDenied, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let path = text(object.get("path"), "path", 1, 255, &mut errors)?;
    let return_url_raw = object.get("returnUrl");
    let return_url = match return_url_raw {
        None => None,
        Some(raw) if raw.get() == "null" => None,
        Some(raw) => text(Some(raw), "returnUrl", 1, 255, &mut errors)?,
    };
    let raw_permissions = object.get("requiredPermissions");
    let mut required_permissions = Vec::new();
    if let Some(raw) = raw_permissions.filter(|raw| json_type(Some(raw)) == "array") {
        let values: Vec<&RawValue> =
            serde_json::from_str(raw.get()).map_err(|_| schema_exception())?;
        let allowed = PermissionKey::ALL
            .iter()
            .map(|key| key.as_str())
            .collect::<Vec<_>>();
        for (index, raw) in values.iter().enumerate() {
            let known = decode_string(raw.get()).ok().and_then(|value| {
                PermissionKey::ALL
                    .iter()
                    .find(|key| value.eq_ascii(key.as_str()))
                    .copied()
            });
            if let Some(key) = known {
                required_permissions.push(key);
            } else {
                errors.push(enum_issue(
                    &allowed,
                    vec![json!("requiredPermissions"), json!(index)],
                ));
            }
        }
        if values.is_empty() {
            errors.push(json!({"origin":"array","code":"too_small","minimum":1,"inclusive":true,"path":["requiredPermissions"],"message":"Too small: expected array to have >=1 items"}));
        }
    } else {
        errors.push(invalid_type(
            "array",
            json_type(raw_permissions),
            vec![json!("requiredPermissions")],
        ));
        invalid_length(raw_permissions, "requiredPermissions", 1, None, &mut errors)?;
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(RecordRouteDenied {
        path: path.ok_or_else(schema_exception)?,
        return_url,
        return_url_present: return_url_raw.is_some(),
        required_permissions,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // Compare JSON strings as JS UTF-16, including successful lone-surrogate
    // inputs. serde_json::Value alone cannot represent those original strings.
    fn same_json(actual: &str, expected: &str) {
        let actual: &RawValue =
            serde_json::from_str(actual).unwrap_or_else(|_| panic!("actual JSON"));
        let expected: &RawValue =
            serde_json::from_str(expected).unwrap_or_else(|_| panic!("expected JSON"));
        if actual.get().starts_with('"') {
            assert_eq!(
                decode_string(actual.get()).ok(),
                decode_string(expected.get()).ok()
            );
        } else if actual.get().starts_with('{') {
            let actual = JsObject::parse(actual.get()).unwrap_or_else(|_| panic!("actual object"));
            let expected =
                JsObject::parse(expected.get()).unwrap_or_else(|_| panic!("expected object"));
            assert_eq!(actual.keys(), expected.keys());
            for ((_, actual), (_, expected)) in actual.entries().zip(expected.entries()) {
                same_json(actual.get(), expected.get());
            }
        } else if actual.get().starts_with('[') {
            let actual: Vec<&RawValue> =
                serde_json::from_str(actual.get()).unwrap_or_else(|_| panic!("actual array"));
            let expected: Vec<&RawValue> =
                serde_json::from_str(expected.get()).unwrap_or_else(|_| panic!("expected array"));
            assert_eq!(actual.len(), expected.len());
            for (actual, expected) in actual.into_iter().zip(expected) {
                same_json(actual.get(), expected.get());
            }
        } else {
            assert_eq!(actual.get(), expected.get());
        }
    }

    #[test]
    fn all_frozen_original_zod_cases_match() {
        let corpus: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-golden.json"))
                .unwrap_or_else(|_| panic!("golden"));
        for case in corpus["cases"]
            .as_array()
            .unwrap_or_else(|| panic!("cases"))
        {
            let schema = case["schema"].as_str().unwrap_or_default();
            let raw = case["inputRaw"].as_str();
            let actual = match schema {
                "AuditLogListQuery" => {
                    validate_query(QueryKind::Audit, raw).map(|value| value.json())
                }
                "EntityAuditLogListQuery" => {
                    validate_query(QueryKind::Entity, raw).map(|value| value.json())
                }
                "SecurityEventListQuery" => {
                    validate_query(QueryKind::Security, raw).map(|value| value.json())
                }
                _ => validate_route_denied(raw).map(|value| value.json()),
            };
            let expected = &case["expected"];
            assert_eq!(
                actual.is_ok(),
                expected["success"] == true,
                "{} {}",
                schema,
                case["name"]
            );
            match actual {
                Ok(actual) => same_json(&actual, expected["dataRaw"].as_str().unwrap_or_default()),
                Err(actual) => {
                    if expected.get("schemaException").is_some() {
                        assert!(actual.errors.is_none());
                    } else {
                        assert_eq!(
                            actual.errors,
                            expected["errors"].as_array().cloned(),
                            "{} {}",
                            schema,
                            case["name"]
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn field_order_and_permission_source_match_mechanical_authority() {
        let authority: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-authority.json"))
                .unwrap_or_else(|_| panic!("authority"));
        for kind in [QueryKind::Audit, QueryKind::Entity, QueryKind::Security] {
            assert_eq!(
                json!(query_fields(kind)),
                authority["schemaKeys"][kind.schema_name()]
            );
        }
        assert_eq!(
            json!(
                PermissionKey::ALL
                    .iter()
                    .map(|key| key.as_str())
                    .collect::<Vec<_>>()
            ),
            authority["permissionKeys"]
        );
    }
}
