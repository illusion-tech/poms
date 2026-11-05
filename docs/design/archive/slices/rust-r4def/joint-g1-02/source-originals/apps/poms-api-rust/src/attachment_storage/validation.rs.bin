//! Executes the finite original-schema descriptor, verified by original Zod corpus.

use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::{NumberInput, js_number_string, legacy_number},
    dictionary::validation::{failure, invalid_type, json_type},
    error::ApiError,
};
use axum::http::StatusCode;
use serde_json::{Value, json, value::RawValue};
use std::sync::OnceLock;

fn rules() -> &'static Value {
    static RULES: OnceLock<Value> = OnceLock::new();
    RULES.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../tools/rust-r2ij/i-dto-rules.json"))
            .unwrap_or_else(|_| panic!("original I DTO descriptor"))
    })
}
pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}
pub fn validate(schema: &str, raw: Option<&str>) -> Result<RequestData, ApiError> {
    let rule = &rules()["schemas"][schema];
    let value = raw.and_then(|raw| serde_json::from_str::<&RawValue>(raw).ok());
    let mut errors = Vec::new();
    let output = check(rule, value, &[], &mut errors)?;
    if schema == "UpdateAttachmentStorageProviderConfigRequest"
        && !errors
            .iter()
            .any(|e| e["code"] == "invalid_type" || e["code"] == "invalid_value")
    {
        let object = JsObject::parse(output.as_deref().unwrap_or("{}"));
        if object
            .as_ref()
            .is_ok_and(|v| !v.entries().any(|(key, _)| !key.eq_ascii("expectedVersion")))
        {
            errors.push(json!({"code":"custom","path":[],"message":"At least one updatable field is required"}));
        }
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(RequestData {
        raw: output.unwrap_or_else(|| "{}".into()),
    })
}
fn whitespace(unit: u16) -> bool {
    matches!(unit,0x0009..=0x000d|0x0020|0x00a0|0x1680|0x2000..=0x200a|0x2028|0x2029|0x202f|0x205f|0x3000|0xfeff)
}
pub(crate) fn trim(value: &str) -> String {
    value
        .trim_matches(|c: char| {
            let code = c as u32;
            code <= 0xffff && whitespace(code as u16)
        })
        .to_owned()
}
pub(crate) fn trim_js(value: JsString) -> JsString {
    let units = value.as_code_units();
    let first = units
        .iter()
        .position(|v| !whitespace(*v))
        .unwrap_or(units.len());
    let last = units
        .iter()
        .rposition(|v| !whitespace(*v))
        .map_or(first, |v| v + 1);
    JsString::from_code_units(units[first..last].to_vec())
}
fn primitive(raw: &RawValue, array_item: bool) -> Result<String, ApiError> {
    Ok(match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map_err(|_| ApiError::internal())?
            .to_utf8_lossy(),
        "null" => if array_item { "" } else { "null" }.into(),
        "boolean" => raw.get().into(),
        "number" => js_number_string(raw.get().parse().unwrap_or(f64::NAN)),
        "array" => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| ApiError::internal())?
            .into_iter()
            .map(|v| primitive(v, true))
            .collect::<Result<Vec<_>, _>>()?
            .join(","),
        _ => {
            if JsObject::parse(raw.get())
                .ok()
                .is_some_and(|v| v.get("toString").is_some())
            {
                return Err(ApiError::object(
                    StatusCode::BAD_REQUEST,
                    json!({"statusCode":400,"message":"Validation failed"}),
                ));
            }
            "[object Object]".into()
        }
    })
}
fn to_number(raw: &RawValue) -> Result<f64, ApiError> {
    Ok(match json_type(Some(raw)) {
        "null" => 0.0,
        "boolean" => f64::from(raw.get() == "true"),
        "number" => raw.get().parse().unwrap_or(f64::NAN),
        _ => legacy_number(NumberInput::Text(&primitive(raw, false)?)),
    })
}
fn length_error(
    origin: &str,
    minimum: Option<usize>,
    maximum: Option<usize>,
    path: &[Value],
    errors: &mut Vec<Value>,
) {
    if let Some(min) = minimum {
        let message = match origin {
            "string" => format!("Too small: expected string to have >={min} characters"),
            "array" => format!("Too small: expected array to have >={min} items"),
            _ => format!("Too small: expected unknown to be >={min}"),
        };
        errors.push(json!({"origin":origin,"code":"too_small","minimum":min,"inclusive":true,"path":path,"message":message}));
    }
    if let Some(max) = maximum {
        let message = match origin {
            "string" => format!("Too big: expected string to have <={max} characters"),
            "array" => format!("Too big: expected array to have <={max} items"),
            _ => format!("Too big: expected unknown to be <={max}"),
        };
        errors.push(json!({"origin":origin,"code":"too_big","maximum":max,"inclusive":true,"path":path,"message":message}));
    }
}
fn valid_uuid(s: &str) -> bool {
    if s == "00000000-0000-0000-0000-000000000000" || s == "ffffffff-ffff-ffff-ffff-ffffffffffff" {
        return true;
    }
    let b = s.as_bytes();
    b.len() == 36
        && b.iter().enumerate().all(|(i, v)| {
            if [8, 13, 18, 23].contains(&i) {
                *v == b'-'
            } else {
                v.is_ascii_hexdigit()
            }
        })
        && matches!(b[14], b'1'..=b'8')
        && matches!(b[19], b'8' | b'9' | b'a' | b'b' | b'A' | b'B')
}
fn valid_email(s: &str) -> bool {
    let Some((local, domain)) = s.split_once('@') else {
        return false;
    };
    let valid = |b: u8| b.is_ascii_alphanumeric() || b"_'+-".contains(&b);
    if local.is_empty()
        || local
            .split('.')
            .any(|s| s.is_empty() || !s.bytes().all(valid))
        || local.ends_with('\'')
    {
        return false;
    }
    let labels = domain.split('.').collect::<Vec<_>>();
    labels.len() > 1
        && labels
            .last()
            .is_some_and(|l| l.len() >= 2 && l.bytes().all(|b| b.is_ascii_alphabetic()))
        && labels[..labels.len() - 1].iter().all(|l| {
            !l.is_empty()
                && l.as_bytes()[0].is_ascii_alphanumeric()
                && l.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
}
fn check(
    rule: &Value,
    raw: Option<&RawValue>,
    path: &[Value],
    errors: &mut Vec<Value>,
) -> Result<Option<String>, ApiError> {
    let kind = rule["type"].as_str().unwrap_or("");
    if kind == "optional" {
        return if raw.is_none() {
            Ok(None)
        } else {
            check(&rule["inner"], raw, path, errors)
        };
    }
    if kind == "nullable" {
        return if raw.is_some_and(|v| v.get() == "null") {
            Ok(Some("null".into()))
        } else {
            check(&rule["inner"], raw, path, errors)
        };
    }
    let checks = rule["checks"].as_array().map(Vec::as_slice).unwrap_or(&[]);
    if kind == "enum" {
        let values = rule["values"].as_array().cloned().unwrap_or_default();
        let text = raw
            .and_then(|v| decode_string(v.get()).ok())
            .map(|v| v.to_utf8_lossy());
        if text.as_ref().is_some_and(|v| values.contains(&json!(v))) {
            return Ok(text.map(|v| json!(v).to_string()));
        }
        let message = if values.len() == 1 {
            format!("Invalid input: expected {}", values[0])
        } else {
            format!(
                "Invalid option: expected one of {}",
                values
                    .iter()
                    .map(Value::to_string)
                    .collect::<Vec<_>>()
                    .join("|")
            )
        };
        errors.push(json!({"code":"invalid_value","values":values,"path":path,"message":message}));
        return Ok(None);
    }
    if kind == "object" {
        let object = raw.and_then(|v| JsObject::parse(v.get()).ok());
        let Some(object) = object else {
            errors.push(invalid_type("object", json_type(raw), path.to_vec()));
            return Ok(None);
        };
        let mut fields = Vec::new();
        for field in rule["fields"].as_array().into_iter().flatten() {
            let key = field["key"].as_str().unwrap_or("");
            let mut child = path.to_vec();
            child.push(json!(key));
            if let Some(value) = check(&field["rule"], object.get(key), &child, errors)? {
                fields.push(format!("{}:{value}", json!(key)));
            }
        }
        return Ok(Some(format!("{{{}}}", fields.join(","))));
    }
    if kind == "number" {
        let value = if rule["coerce"] == true {
            raw.map(to_number).transpose()?.unwrap_or(f64::NAN)
        } else if json_type(raw) == "number" {
            raw.and_then(|v| v.get().parse().ok()).unwrap_or(f64::NAN)
        } else {
            errors.push(invalid_type("number", json_type(raw), path.to_vec()));
            return Ok(None);
        };
        if !value.is_finite() {
            let received = if value.is_nan() { "NaN" } else { "Infinity" };
            errors.push(json!({"expected":"number","code":"invalid_type","received":received,"path":path,"message":format!("Invalid input: expected number, received {received}")}));
            return Ok(None);
        }
        if value.fract() != 0.0 {
            errors.push(json!({"expected":"int","format":"safeint","code":"invalid_type","path":path,"message":"Invalid input: expected int, received number"}));
            return Ok(None);
        }
        if value.abs() > 9_007_199_254_740_991.0 {
            let big = value > 0.0;
            let mut issue = json!({"code":if big{"too_big"}else{"too_small"},"note":"Integers must be within the safe integer range.","origin":"int","inclusive":true,"path":path,"message":if big{"Too big: expected int to be <=9007199254740991"}else{"Too small: expected int to be >=-9007199254740991"}});
            issue[if big { "maximum" } else { "minimum" }] = json!(if big {
                9007199254740991_i64
            } else {
                -9007199254740991_i64
            });
            errors.push(issue);
        }
        for constraint in checks {
            match constraint["check"].as_str() {
                Some("greater_than") => {
                    let n = constraint["value"].as_f64().unwrap_or(0.0);
                    let inclusive = constraint["inclusive"] == true;
                    if value < n || !inclusive && value == n {
                        errors.push(json!({"origin":"number","code":"too_small","minimum":constraint["value"],"inclusive":inclusive,"path":path,"message":format!("Too small: expected number to be {}{}",if inclusive{">="}else{">"},js_number_string(n))}));
                    }
                }
                Some("less_than") => {
                    let n = constraint["value"].as_f64().unwrap_or(0.0);
                    let inclusive = constraint["inclusive"] == true;
                    if value > n || !inclusive && value == n {
                        errors.push(json!({"origin":"number","code":"too_big","maximum":constraint["value"],"inclusive":inclusive,"path":path,"message":format!("Too big: expected number to be {}{}",if inclusive{"<="}else{"<"},js_number_string(n))}));
                    }
                }
                _ => {}
            }
        }
        return Ok(Some(js_number_string(value)));
    }
    if kind == "boolean" {
        if rule["coerce"] == true {
            return Ok(Some(if js_truthy(raw) { "true" } else { "false" }.into()));
        }
        if raw.is_some_and(|v| matches!(v.get(), "true" | "false")) {
            return Ok(raw.map(|v| v.get().into()));
        }
        errors.push(invalid_type("boolean", json_type(raw), path.to_vec()));
        return Ok(None);
    }
    if kind == "array" {
        let values = raw
            .filter(|v| json_type(Some(v)) == "array")
            .and_then(|v| serde_json::from_str::<Vec<&RawValue>>(v.get()).ok());
        let Some(values) = values else {
            errors.push(invalid_type("array", json_type(raw), path.to_vec()));
            return Ok(None);
        };
        let mut fields = Vec::new();
        for (index, value) in values.iter().enumerate() {
            let mut child = path.to_vec();
            child.push(json!(index));
            fields.push(
                check(&rule["element"], Some(value), &child, errors)?
                    .unwrap_or_else(|| "null".into()),
            );
        }
        for constraint in checks {
            if let Some(max) = constraint["maximum"].as_u64()
                && values.len() > max as usize
            {
                length_error("array", None, Some(max as usize), path, errors);
            }
        }
        return Ok(Some(format!("[{}]", fields.join(","))));
    }
    if kind == "string" {
        let value = raw.and_then(|v| decode_string(v.get()).ok());
        let mut value = if let Some(value) = value {
            Some(value)
        } else {
            errors.push(invalid_type("string", json_type(raw), path.to_vec()));
            None
        };
        let mut invalid_length = None;
        if value.is_none()
            && let Some(raw) = raw
        {
            match json_type(Some(raw)) {
                "array" => {
                    invalid_length = Some((
                        "array",
                        serde_json::from_str::<Vec<&RawValue>>(raw.get())
                            .map_err(|_| ApiError::internal())?
                            .len() as f64,
                    ));
                }
                "object" => {
                    if let Some(length) = JsObject::parse(raw.get())
                        .ok()
                        .and_then(|v| v.get("length"))
                    {
                        invalid_length = Some(("unknown", to_number(length)?));
                    }
                }
                _ => {}
            }
        }
        for constraint in checks {
            match constraint["check"].as_str() {
                Some("overwrite") => {
                    value = value.map(trim_js);
                }
                Some("min_length") => {
                    let min = constraint["minimum"].as_u64().unwrap_or(0) as usize;
                    let length = value
                        .as_ref()
                        .map(|v| {
                            (
                                "string",
                                char::decode_utf16(v.as_code_units().iter().copied()).count()
                                    as f64,
                            )
                        })
                        .or(invalid_length);
                    if let Some((origin, length)) = length
                        && ((length < min as f64) || length.is_nan())
                    {
                        length_error(origin, Some(min), None, path, errors);
                    }
                }
                Some("max_length") => {
                    let max = constraint["maximum"].as_u64().unwrap_or(usize::MAX as u64) as usize;
                    let length = value
                        .as_ref()
                        .map(|v| {
                            (
                                "string",
                                char::decode_utf16(v.as_code_units().iter().copied()).count()
                                    as f64,
                            )
                        })
                        .or(invalid_length);
                    if let Some((origin, length)) = length
                        && ((length > max as f64) || length.is_nan())
                    {
                        length_error(origin, None, Some(max), path, errors);
                    }
                }
                _ => {}
            }
        }
        let format = rule["format"]
            .as_str()
            .or_else(|| checks.iter().find_map(|v| v["format"].as_str()));
        if let (Some(format), Some(text)) = (format, value.as_mut()) {
            let utf8 = text.to_utf8_lossy();
            let valid = match format {
                "uuid" => valid_uuid(&utf8),
                "email" => valid_email(&utf8),
                "url" => {
                    let candidate = trim_js(text.clone());
                    if url::Url::parse(&candidate.to_utf8_lossy()).is_ok() {
                        *text = JsString::from_code_units(
                            candidate
                                .as_code_units()
                                .iter()
                                .copied()
                                .filter(|v| !matches!(*v, 9 | 10 | 13))
                                .collect(),
                        );
                        true
                    } else {
                        false
                    }
                }
                _ => true,
            };
            if !valid {
                let mut issue = json!({"code":"invalid_format","format":format,"path":path,"message":match format{"uuid"=>"Invalid UUID","email"=>"Invalid email address",_=>"Invalid URL"}});
                if format != "url" {
                    issue["origin"] = json!("string");
                    let pattern = rule["pattern"]
                        .as_str()
                        .or_else(|| checks.iter().find_map(|v| v["pattern"].as_str()));
                    if let Some(pattern) = pattern {
                        issue["pattern"] = json!(pattern);
                    }
                }
                errors.push(issue);
            }
        }
        return Ok(value.map(|v| v.json()));
    }
    Err(ApiError::internal())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    fn canonical(raw: &str) -> String {
        let object = JsObject::parse(raw).unwrap_or_else(|_| panic!("original object"));
        format!(
            "{{{}}}",
            object
                .entries()
                .map(|(key, value)| format!("{}:{}", key.json(), canonical_value(value)))
                .collect::<Vec<_>>()
                .join(",")
        )
    }
    fn canonical_value(raw: &RawValue) -> String {
        match json_type(Some(raw)) {
            "object" => canonical(raw.get()),
            "string" => decode_string(raw.get())
                .unwrap_or_else(|_| panic!("text"))
                .json(),
            "array" => format!(
                "[{}]",
                serde_json::from_str::<Vec<&RawValue>>(raw.get())
                    .unwrap_or_default()
                    .into_iter()
                    .map(canonical_value)
                    .collect::<Vec<_>>()
                    .join(",")
            ),
            _ => raw.get().into(),
        }
    }
    #[tokio::test]
    async fn original_zod_request_corpus_matches_entire_payload_and_issues() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2ij/i-dto-golden.json"
        ))
        .unwrap_or_else(|_| panic!("I corpus"));
        for case in corpus["cases"].as_array().into_iter().flatten() {
            let result = validate(
                case["schema"].as_str().unwrap_or(""),
                case["inputRaw"].as_str(),
            );
            if case["expected"]["success"] == true {
                let parsed =
                    result.unwrap_or_else(|_| panic!("{} {}", case["schema"], case["name"]));
                assert_eq!(
                    canonical(&parsed.raw),
                    canonical(case["expected"]["dataRaw"].as_str().unwrap_or("{}")),
                    "{} {}",
                    case["schema"],
                    case["name"]
                );
            } else {
                let response = result
                    .err()
                    .unwrap_or_else(|| panic!("must reject {} {}", case["schema"], case["name"]))
                    .into_response();
                let bytes = axum::body::to_bytes(response.into_body(), 1024 * 1024)
                    .await
                    .unwrap_or_default();
                let body: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                if let Some(errors) = case["expected"].get("errors") {
                    assert_eq!(
                        &body["errors"], errors,
                        "{} {}",
                        case["schema"], case["name"]
                    );
                } else {
                    assert!(body.get("errors").is_none());
                }
            }
        }
    }
}

#[derive(Clone)]
pub struct RequestData {
    pub raw: String,
}
impl std::fmt::Debug for RequestData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("RequestData([redacted])")
    }
}
impl RequestData {
    pub fn object(&self) -> JsObject<'_> {
        JsObject::parse(&self.raw).unwrap_or_else(|_| panic!("validated I object"))
    }
    pub fn has(&self, key: &str) -> bool {
        self.object().get(key).is_some()
    }
    pub fn string(&self, key: &str) -> Option<JsString> {
        self.object()
            .get(key)
            .and_then(|v| decode_string(v.get()).ok())
    }
    pub fn text(&self, key: &str) -> Option<String> {
        self.string(key).map(|v| v.to_utf8_lossy())
    }
    pub fn boolean(&self, key: &str) -> Option<bool> {
        self.object()
            .get(key)
            .and_then(|v| serde_json::from_str(v.get()).ok())
    }
    pub fn number(&self, key: &str) -> Option<f64> {
        self.object().get(key).and_then(|v| v.get().parse().ok())
    }
}
pub(crate) fn is_whitespace(unit: u16) -> bool {
    whitespace(unit)
}
fn js_truthy(raw: Option<&RawValue>) -> bool {
    match json_type(raw) {
        "undefined" | "null" => false,
        "boolean" => raw.is_some_and(|v| v.get() == "true"),
        "number" => raw
            .and_then(|v| v.get().parse::<f64>().ok())
            .is_some_and(|v| v != 0.0 && !v.is_nan()),
        "string" => raw
            .and_then(|v| decode_string(v.get()).ok())
            .is_some_and(|v| !v.is_empty()),
        _ => true,
    }
}
