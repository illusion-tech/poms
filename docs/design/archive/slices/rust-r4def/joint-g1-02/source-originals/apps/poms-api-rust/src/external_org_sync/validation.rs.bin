//! Request validation consumes a mechanical, one-way original-Zod descriptor.
//! UTF-16 input and duplicate object membership stay distinct until persistence.
use std::sync::OnceLock;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json, value::RawValue};

use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::{NumberInput, UuidText, js_number_string, legacy_number},
    error::ApiError,
    org_units::collation::trimmed_units,
};

#[derive(Debug)]
pub struct ValidationError {
    pub errors: Option<Vec<Value>>,
}
pub struct RequestInput {
    value: Value,
    raw: String,
}
impl std::ops::Deref for RequestInput {
    type Target = Value;
    fn deref(&self) -> &Value {
        &self.value
    }
}
impl RequestInput {
    pub fn raw_field(&self, key: &str) -> Option<String> {
        JsObject::parse(&self.raw)
            .ok()?
            .get(key)
            .map(|value| value.get().to_owned())
    }
    pub fn raw_item_field(&self, index: usize, key: &str) -> Option<String> {
        let object = JsObject::parse(&self.raw).ok()?;
        let items: Vec<&RawValue> = serde_json::from_str(object.get("items")?.get()).ok()?;
        JsObject::parse(items.get(index)?.get())
            .ok()?
            .get(key)
            .map(|value| value.get().to_owned())
    }
}
pub(crate) fn object_raw(base: &Value, overrides: &[(String, String)]) -> String {
    format!(
        "{{{}}}",
        base.as_object()
            .into_iter()
            .flatten()
            .map(|(key, value)| format!(
                "{}:{}",
                serde_json::to_string(key).unwrap_or_default(),
                overrides
                    .iter()
                    .find(|(name, _)| name == key)
                    .map(|(_, raw)| raw.clone())
                    .unwrap_or_else(|| value.to_string())
            ))
            .collect::<Vec<_>>()
            .join(",")
    )
}
impl IntoResponse for ValidationError {
    fn into_response(self) -> Response {
        let mut value = json!({"statusCode":400,"message":"Validation failed"});
        if let Some(errors) = self.errors {
            value["errors"] = json!(errors);
        }
        ApiError::object(StatusCode::BAD_REQUEST, value).into_response()
    }
}
fn authority() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-authority.json"))
            .unwrap_or_else(|_| panic!("invalid original H schema descriptor"))
    })
}
fn kind(raw: Option<&RawValue>) -> &'static str {
    match raw
        .map(RawValue::get)
        .and_then(|text| text.as_bytes().first())
        .copied()
    {
        None => "undefined",
        Some(b'{') => "object",
        Some(b'[') => "array",
        Some(b'"') => "string",
        Some(b'n') => "null",
        Some(b't' | b'f') => "boolean",
        _ => "number",
    }
}
fn invalid_type(expected: &str, received: &str, path: &[Value]) -> Value {
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}
fn child_path(path: &[Value], field: Value) -> Vec<Value> {
    let mut result = path.to_vec();
    result.push(field);
    result
}

fn primitive_text(raw: &RawValue, array_item: bool) -> Result<String, ()> {
    match kind(Some(raw)) {
        "string" => decode_string(raw.get())
            .map(|value| value.to_utf8_lossy())
            .map_err(|_| ()),
        "null" => Ok(if array_item { "" } else { "null" }.into()),
        "boolean" => Ok(raw.get().into()),
        "number" => Ok(js_number_string(raw.get().parse().unwrap_or(f64::NAN))),
        "array" => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| ())?
            .into_iter()
            .map(|item| primitive_text(item, true))
            .collect::<Result<Vec<_>, _>>()
            .map(|items| items.join(",")),
        _ => {
            let object = JsObject::parse(raw.get()).map_err(|_| ())?;
            if object.get("toString").is_some() {
                Err(())
            } else {
                Ok("[object Object]".into())
            }
        }
    }
}
fn number(raw: &RawValue) -> Result<f64, ()> {
    match kind(Some(raw)) {
        "null" => Ok(0.0),
        "boolean" => Ok(f64::from(raw.get() == "true")),
        "number" => Ok(raw.get().parse().unwrap_or(f64::NAN)),
        _ => Ok(legacy_number(NumberInput::Text(&primitive_text(
            raw, false,
        )?))),
    }
}

/// Node JSON.parse/JSON.stringify number rules; strings retain UTF-16 units.
pub(crate) fn node_raw(raw: &RawValue) -> Result<String, ()> {
    Ok(match kind(Some(raw)) {
        "object" => {
            let object = JsObject::parse(raw.get()).map_err(|_| ())?;
            let mut items = Vec::new();
            for key in object.keys() {
                let value = object.entries().find(|(name, _)| *name == key).ok_or(())?.1;
                items.push(format!("{}:{}", key.json(), node_raw(value)?));
            }
            format!("{{{}}}", items.join(","))
        }
        "array" => format!(
            "[{}]",
            serde_json::from_str::<Vec<&RawValue>>(raw.get())
                .map_err(|_| ())?
                .into_iter()
                .map(node_raw)
                .collect::<Result<Vec<_>, _>>()?
                .join(",")
        ),
        "string" => decode_string(raw.get()).map_err(|_| ())?.json(),
        "number" => {
            let value = raw.get().parse::<f64>().map_err(|_| ())?;
            if value.is_finite() {
                js_number_string(value)
            } else {
                "null".into()
            }
        }
        _ => raw.get().to_owned(),
    })
}
/// PG UTF8 conversion replaces isolated surrogate code units in string values.
pub(crate) fn node_value(raw: &RawValue) -> Result<Value, ()> {
    match kind(Some(raw)) {
        "string" => Ok(Value::String(
            decode_string(raw.get()).map_err(|_| ())?.to_utf8_lossy(),
        )),
        "object" => JsObject::parse(raw.get())
            .map_err(|_| ())?
            .entries()
            .map(|(key, value)| Ok((key.to_utf8_lossy(), node_value(value)?)))
            .collect::<Result<serde_json::Map<_, _>, ()>>()
            .map(Value::Object),
        "array" => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| ())?
            .into_iter()
            .map(node_value)
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        _ => serde_json::from_str(&node_raw(raw)?).map_err(|_| ()),
    }
}

struct State {
    errors: Vec<Value>,
    exception: bool,
    aborted: bool,
}
fn length_issue(
    state: &mut State,
    origin: &str,
    length: f64,
    minimum: Option<f64>,
    maximum: Option<f64>,
    path: &[Value],
) {
    if let Some(min) = minimum
        && (length < min || length.is_nan())
    {
        let text = js_number_string(min);
        state.errors.push(json!({"origin":origin,"code":"too_small","minimum":min as i64,"inclusive":true,"path":path,"message":match origin { "string" => format!("Too small: expected string to have >={text} characters"), "array" => format!("Too small: expected array to have >={text} items"), _ => format!("Too small: expected unknown to be >={text}") }}));
    }
    if let Some(max) = maximum
        && (length > max || length.is_nan())
    {
        let text = js_number_string(max);
        state.errors.push(json!({"origin":origin,"code":"too_big","maximum":max as i64,"inclusive":true,"path":path,"message":match origin { "string" => format!("Too big: expected string to have <={text} characters"), "array" => format!("Too big: expected array to have <={text} items"), _ => format!("Too big: expected unknown to be <={text}") }}));
    }
}
fn invalid_length(raw: Option<&RawValue>, checks: &[Value], path: &[Value], state: &mut State) {
    let Some(raw) = raw else {
        return;
    };
    let (origin, length) = match kind(Some(raw)) {
        "string" => (
            "string",
            decode_string(raw.get())
                .map(|value| {
                    char::decode_utf16(value.as_code_units().iter().copied()).count() as f64
                })
                .unwrap_or(f64::NAN),
        ),
        "array" => (
            "array",
            serde_json::from_str::<Vec<&RawValue>>(raw.get())
                .map(|array| array.len() as f64)
                .unwrap_or(f64::NAN),
        ),
        "object" => {
            let Ok(object) = JsObject::parse(raw.get()) else {
                return;
            };
            let Some(length) = object.get("length") else {
                return;
            };
            match number(length) {
                Ok(length) => ("unknown", length),
                Err(()) => {
                    state.exception = true;
                    return;
                }
            }
        }
        _ => return,
    };
    for check in checks {
        length_issue(
            state,
            origin,
            length,
            check.get("minimum").and_then(Value::as_f64),
            check.get("maximum").and_then(Value::as_f64),
            path,
        );
    }
}
fn validate_node(
    schema: &Value,
    raw: Option<&RawValue>,
    path: &[Value],
    state: &mut State,
) -> Option<String> {
    let schema_type = schema["type"].as_str().unwrap_or("");
    if schema_type == "optional" {
        return raw.and_then(|value| validate_node(&schema["inner"], Some(value), path, state));
    }
    if schema_type == "nullable" {
        return if kind(raw) == "null" {
            Some("null".into())
        } else {
            validate_node(&schema["inner"], raw, path, state)
        };
    }
    if schema_type == "unknown" {
        return raw.and_then(|raw| node_raw(raw).ok());
    }
    let empty = Vec::new();
    let checks = schema["checks"].as_array().unwrap_or(&empty);
    match schema_type {
        "object" | "record" => {
            let object = raw.and_then(|raw| JsObject::parse(raw.get()).ok());
            let Some(object) = object else {
                state.errors.push(invalid_type(
                    if schema_type == "record" {
                        "record"
                    } else {
                        "object"
                    },
                    kind(raw),
                    path,
                ));
                state.aborted = true;
                return None;
            };
            let mut result = Vec::new();
            if schema_type == "record" {
                for key in object.keys() {
                    let field = object
                        .entries()
                        .find(|(name, _)| *name == key)
                        .map(|(_, value)| value);
                    if let Some(value) = validate_node(
                        &schema["value"],
                        field,
                        &child_path(path, json!(key.to_utf8_lossy())),
                        state,
                    ) && !key.eq_ascii("__proto__")
                    {
                        result.push(format!("{}:{value}", key.json()));
                    }
                }
            } else {
                for key in schema["fieldOrder"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                {
                    if let Some(value) = validate_node(
                        &schema["fields"][key],
                        object.get(key),
                        &child_path(path, json!(key)),
                        state,
                    ) {
                        result.push(format!(
                            "{}:{value}",
                            serde_json::to_string(key).unwrap_or_default()
                        ));
                    }
                }
            }
            Some(format!("{{{}}}", result.join(",")))
        }
        "enum" => {
            let text = raw.and_then(|raw| decode_string(raw.get()).ok());
            if !schema["values"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .any(|value| text.as_ref().is_some_and(|text| text.eq_ascii(value)))
            {
                let options = schema["values"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .map(|value| format!("\"{value}\""))
                    .collect::<Vec<_>>()
                    .join("|");
                state.errors.push(json!({"code":"invalid_value","values":schema["values"],"path":path,"message":format!("Invalid option: expected one of {options}")}));
                state.aborted = true;
            }
            text.map(|text| text.json())
        }
        "string" => {
            let Some(mut text) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
                state.errors.push(invalid_type("string", kind(raw), path));
                state.aborted = true;
                invalid_length(raw, checks, path, state);
                return None;
            };
            if checks.iter().any(|check| check["check"] == "overwrite") {
                text = JsString::from_code_units(trimmed_units(text.as_code_units()).to_vec());
            }
            let length = char::decode_utf16(text.as_code_units().iter().copied()).count() as f64;
            for check in checks {
                length_issue(
                    state,
                    "string",
                    length,
                    check.get("minimum").and_then(Value::as_f64),
                    check.get("maximum").and_then(Value::as_f64),
                    path,
                );
            }
            if schema["format"] == "uuid" {
                let value = text.to_utf8_lossy();
                if UuidText::parse(&value).is_err()
                    || value.eq_ignore_ascii_case("ffffffff-ffff-ffff-ffff-ffffffffffff")
                        && value != "ffffffff-ffff-ffff-ffff-ffffffffffff"
                {
                    state.errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":authority()["uuidPattern"],"path":path,"message":"Invalid UUID"}));
                }
            }
            Some(text.json())
        }
        "array" => {
            let array = raw
                .filter(|raw| kind(Some(raw)) == "array")
                .and_then(|raw| serde_json::from_str::<Vec<&RawValue>>(raw.get()).ok());
            let Some(array) = array else {
                state.errors.push(invalid_type("array", kind(raw), path));
                state.aborted = true;
                invalid_length(raw, checks, path, state);
                return None;
            };
            // Zod executes array length checks before visiting child issues.
            for check in checks {
                length_issue(
                    state,
                    "array",
                    array.len() as f64,
                    check.get("minimum").and_then(Value::as_f64),
                    check.get("maximum").and_then(Value::as_f64),
                    path,
                );
            }
            let values = array
                .into_iter()
                .enumerate()
                .filter_map(|(index, raw)| {
                    validate_node(
                        &schema["element"],
                        Some(raw),
                        &child_path(path, json!(index)),
                        state,
                    )
                })
                .collect::<Vec<_>>();
            Some(format!("[{}]", values.join(",")))
        }
        "number" => {
            let coerced = schema["coerce"] == true;
            let value = raw
                .filter(|raw| coerced || kind(Some(raw)) == "number")
                .and_then(|raw| number(raw).ok());
            let Some(value) = value else {
                state.errors.push(invalid_type("number", kind(raw), path));
                state.aborted = true;
                return None;
            };
            if !value.is_finite() {
                let received = if value.is_nan() { "NaN" } else { "Infinity" };
                state.errors.push(json!({"expected":"number","code":"invalid_type","received":received,"path":path,"message":format!("Invalid input: expected number, received {received}")}));
                state.aborted = true;
                return None;
            }
            for check in checks {
                match check["check"].as_str().unwrap_or("") {
                    "number_format" => {
                        if value.fract() != 0.0 {
                            state.errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":path,"message":"Invalid input: expected int, received number"}));
                            state.aborted = true;
                            return None;
                        }
                        if value.abs() > 9_007_199_254_740_991.0 {
                            let positive = value > 0.0;
                            state.errors.push(if positive {json!({"code":"too_big","maximum":9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too big: expected int to be <=9007199254740991"})} else {json!({"code":"too_small","minimum":-9007199254740991_i64,"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":"Too small: expected int to be >=-9007199254740991"})});
                        }
                    }
                    "greater_than" | "less_than" => {
                        let bound = check["value"].as_f64().unwrap_or(0.0);
                        let inclusive = check["inclusive"] == true;
                        let small = check["check"] == "greater_than";
                        let fail = if small {
                            if inclusive {
                                value < bound
                            } else {
                                value <= bound
                            }
                        } else if inclusive {
                            value > bound
                        } else {
                            value >= bound
                        };
                        if fail {
                            let code = if small { "too_small" } else { "too_big" };
                            let op = match (small, inclusive) {
                                (true, true) => ">=",
                                (true, false) => ">",
                                (false, true) => "<=",
                                (false, false) => "<",
                            };
                            let mut issue = json!({"origin":"number","code":code,"inclusive":inclusive,"path":path,"message":format!("Too {}: expected number to be {op}{}",if small {"small"}else{"big"},js_number_string(bound))});
                            issue[if small { "minimum" } else { "maximum" }] = json!(bound as i64);
                            state.errors.push(issue);
                        }
                    }
                    _ => {}
                }
            }
            Some(js_number_string(value))
        }
        _ => None,
    }
}

pub fn validate_raw(schema_name: &str, raw: Option<&str>) -> Result<String, ValidationError> {
    let parsed = raw.and_then(|value| serde_json::from_str::<&RawValue>(value).ok());
    let mut state = State {
        errors: Vec::new(),
        exception: false,
        aborted: false,
    };
    let result = validate_node(
        &authority()["schemas"][schema_name],
        parsed,
        &[],
        &mut state,
    );
    if schema_name == "UpdateExternalOrgSourceRequest"
        && !state.aborted
        && result
            .as_ref()
            .and_then(|value| JsObject::parse(value).ok())
            .is_some_and(|object| {
                ![
                    "displayName",
                    "providerConfigId",
                    "authoritativeOrgUnitId",
                    "externalRootDepartmentId",
                    "syncScopes",
                ]
                .iter()
                .any(|key| object.get(key).is_some())
            })
    {
        state.errors.push(
            json!({"code":"custom","path":[],"message":"At least one updatable field is required"}),
        );
    }
    if state.exception {
        Err(ValidationError { errors: None })
    } else if !state.errors.is_empty() {
        Err(ValidationError {
            errors: Some(state.errors),
        })
    } else {
        result.ok_or(ValidationError { errors: None })
    }
}
pub fn validate(schema_name: &str, raw: Option<&str>) -> Result<Value, ValidationError> {
    let result = validate_raw(schema_name, raw)?;
    let raw: &RawValue =
        serde_json::from_str(&result).map_err(|_| ValidationError { errors: None })?;
    node_value(raw).map_err(|_| ValidationError { errors: None })
}
pub fn validate_request(
    schema_name: &str,
    raw: Option<&str>,
) -> Result<RequestInput, ValidationError> {
    let raw = validate_raw(schema_name, raw)?;
    let parsed: &RawValue =
        serde_json::from_str(&raw).map_err(|_| ValidationError { errors: None })?;
    let value = node_value(parsed).map_err(|_| ValidationError { errors: None })?;
    Ok(RequestInput { value, raw })
}
pub(crate) fn query(raw: Option<&str>) -> String {
    let mut fields = Vec::<(String, Vec<String>)>::new();
    for pair in raw.unwrap_or("").split('&').take(1000) {
        if let Some((key, value)) = url::form_urlencoded::parse(pair.as_bytes()).next() {
            if let Some((_, values)) = fields.iter_mut().find(|(name, _)| name == &key) {
                values.push(value.into_owned());
            } else {
                fields.push((key.into_owned(), vec![value.into_owned()]));
            }
        }
    }
    format!(
        "{{{}}}",
        fields
            .into_iter()
            .map(|(key, values)| format!(
                "{}:{}",
                serde_json::to_string(&key).unwrap_or_default(),
                if values.len() == 1 {
                    serde_json::to_string(&values[0]).unwrap_or_default()
                } else {
                    serde_json::to_string(&values).unwrap_or_default()
                }
            ))
            .collect::<Vec<_>>()
            .join(",")
    )
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    #[test]
    fn finite_original_zod_corpus() {
        let source: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2gh/h-golden.json"))
                .unwrap();
        for case in source["cases"].as_array().unwrap() {
            let actual = validate_raw(case["schema"].as_str().unwrap(), case["inputRaw"].as_str());
            if case["expected"]["success"] == true {
                let actual = actual.unwrap_or_else(|error| {
                    panic!("{} {} {:?}", case["schema"], case["name"], error)
                });
                let actual: &RawValue = serde_json::from_str(&actual).unwrap();
                let expected: &RawValue =
                    serde_json::from_str(case["expected"]["dataRaw"].as_str().unwrap()).unwrap();
                assert_eq!(
                    node_raw(actual),
                    node_raw(expected),
                    "{} {}",
                    case["schema"],
                    case["name"]
                );
            } else {
                let error = actual.expect_err("expected original Zod rejection");
                assert_eq!(
                    error.errors.as_ref().map(|value| json!(value)),
                    case["expected"].get("errors").cloned(),
                    "{} {}",
                    case["schema"],
                    case["name"]
                );
            }
        }
    }
}
