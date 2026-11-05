//! Finite J/K descriptors from unchanged original Zod; checked against original corpora.
use super::model::RequestData;
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
        let mut rules: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ij/j-dto-rules.json"))
                .unwrap_or_else(|_| panic!("original J DTO descriptor"));
        let k: Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2k/k-dto-rules.json"))
                .unwrap_or_else(|_| panic!("original K DTO descriptor"));
        for (name, rule) in k["schemas"].as_object().into_iter().flatten() {
            rules["schemas"][name] = rule.clone();
        }
        rules
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
    if schema == "CreateAttachmentUploadSessionRequest"
        && !errors
            .iter()
            .any(|e| e["code"] == "invalid_type" || e["code"] == "invalid_value")
    {
        let object = JsObject::parse(output.as_deref().unwrap_or("{}"));
        if let Ok(object) = object {
            let mode = object
                .get("operationType")
                .and_then(|v| decode_string(v.get()).ok())
                .map(|v| v.to_utf8_lossy())
                .unwrap_or_default();
            let keys: &[(&str, &str)] = if mode == "create-attachment" {
                &[
                    (
                        "targetType",
                        "targetType is required for create-attachment upload sessions",
                    ),
                    (
                        "targetId",
                        "targetId is required for create-attachment upload sessions",
                    ),
                    (
                        "category",
                        "category is required for create-attachment upload sessions",
                    ),
                ]
            } else {
                &[
                    (
                        "baseAttachmentId",
                        "baseAttachmentId is required for create-version upload sessions",
                    ),
                    (
                        "changeNote",
                        "changeNote is required for create-version upload sessions",
                    ),
                ]
            };
            for (key, message) in keys {
                if object
                    .get(key)
                    .is_none_or(|v| decode_string(v.get()).is_ok_and(|s| s.is_empty()))
                {
                    errors.push(json!({"code":"custom","path":[key],"message":message}));
                }
            }
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
    if kind == "default" && raw.is_none() {
        return Ok(Some(rule["defaultValue"].to_string()));
    }
    if kind == "default" {
        return check(&rule["inner"], raw, path, errors);
    }
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
            // Original Zod's min/max length checks use their own whenHasLength
            // predicate, even after array's invalid_type (e.g. selectionIds="").
            let length = if let Some(raw) = raw {
                match json_type(Some(raw)) {
                    "string" => decode_string(raw.get()).ok().map(|text| {
                        (
                            "string",
                            char::decode_utf16(text.as_code_units().iter().copied()).count() as f64,
                        )
                    }),
                    "object" => JsObject::parse(raw.get())
                        .ok()
                        .and_then(|object| object.get("length"))
                        .map(|length| to_number(length).map(|length| ("unknown", length)))
                        .transpose()?,
                    _ => None,
                }
            } else {
                None
            };
            if let Some((origin, length)) = length {
                for constraint in checks {
                    if let Some(min) = constraint["minimum"].as_u64()
                        && matches!(
                            length.partial_cmp(&(min as f64)),
                            None | Some(std::cmp::Ordering::Less)
                        )
                    {
                        length_error(origin, Some(min as usize), None, path, errors);
                    }
                    if let Some(max) = constraint["maximum"].as_u64()
                        && matches!(
                            length.partial_cmp(&(max as f64)),
                            None | Some(std::cmp::Ordering::Greater)
                        )
                    {
                        length_error(origin, None, Some(max as usize), path, errors);
                    }
                }
            }
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
            if let Some(min) = constraint["minimum"].as_u64()
                && values.len() < min as usize
            {
                length_error("array", Some(min as usize), None, path, errors);
            }
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
                Some("length_equals") => {
                    let exact = constraint["length"].as_u64().unwrap_or(0) as usize;
                    // The original length check can still run after string's
                    // invalid_type issue, for example on an array's length.
                    let length = value
                        .as_ref()
                        .map(|text| {
                            (
                                "string",
                                char::decode_utf16(text.as_code_units().iter().copied()).count()
                                    as f64,
                            )
                        })
                        .or(invalid_length);
                    if let Some((origin, length)) = length
                        && length != exact as f64
                    {
                        let big = length > exact as f64;
                        let message = match origin {
                            "string" => format!(
                                "{}: expected string to have exactly {exact} characters",
                                if big { "Too big" } else { "Too small" }
                            ),
                            "array" => format!(
                                "{}: expected array to have exactly {exact} items",
                                if big { "Too big" } else { "Too small" }
                            ),
                            _ => format!(
                                "{}: expected {origin} to be exactly {exact}",
                                if big { "Too big" } else { "Too small" }
                            ),
                        };
                        let mut issue = json!({"origin":origin,"code":if big{"too_big"}else{"too_small"},"inclusive":true,"exact":true,"path":path,"message":message});
                        issue[if big { "maximum" } else { "minimum" }] = json!(exact);
                        errors.push(issue);
                    }
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
                "regex" => {
                    utf8.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
                        && utf8
                            .bytes()
                            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
                }
                _ => true,
            };
            if !valid {
                let mut issue = json!({"code":"invalid_format","format":format,"path":path,"message":match format{"uuid"=>"Invalid UUID","email"=>"Invalid email address",_=>"Invalid URL"}});
                if format == "regex" {
                    issue["message"] = json!(
                        checks
                            .iter()
                            .find_map(|v| v["message"].as_str())
                            .unwrap_or("Invalid string")
                    );
                }
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

    fn canonical(raw: &str) -> Option<String> {
        let object = JsObject::parse(raw).ok()?;
        let fields = object
            .entries()
            .map(|(key, value)| Some(format!("{}:{}", key.json(), canonical_value(value)?)))
            .collect::<Option<Vec<_>>>()?;
        Some(format!("{{{}}}", fields.join(",")))
    }
    fn canonical_value(raw: &RawValue) -> Option<String> {
        match json_type(Some(raw)) {
            "object" => canonical(raw.get()),
            "string" => Some(decode_string(raw.get()).ok()?.json()),
            "array" => {
                let values = serde_json::from_str::<Vec<&RawValue>>(raw.get()).ok()?;
                Some(format!(
                    "[{}]",
                    values
                        .into_iter()
                        .map(canonical_value)
                        .collect::<Option<Vec<_>>>()?
                        .join(",")
                ))
            }
            _ => Some(raw.get().into()),
        }
    }
    async fn check_original_corpus(raw: &str, expected_count: usize) {
        let corpus: Value =
            serde_json::from_str(raw).unwrap_or_else(|_| panic!("original DTO corpus"));
        let cases = corpus["cases"]
            .as_array()
            .unwrap_or_else(|| panic!("J cases"));
        assert_eq!(
            cases.len(),
            expected_count,
            "The complete frozen original corpus must execute"
        );
        let mut mismatches = Vec::new();
        for case in cases {
            let actual = match validate(
                case["schema"].as_str().unwrap_or(""),
                case["inputRaw"].as_str(),
            ) {
                Ok(parsed) => match canonical(&parsed.raw) {
                    Some(data) => json!({"success":true,"dataRaw":data}),
                    None => {
                        json!({"success":true,"dataRaw":parsed.raw,"canonicalizationError":"Response is not a valid original object"})
                    }
                },
                Err(error) => {
                    let response = error.into_response();
                    let status = response.status().as_u16();
                    let body = match axum::body::to_bytes(response.into_body(), 1024 * 1024).await {
                        Ok(bytes) => serde_json::from_slice::<Value>(&bytes).unwrap_or_else(
                            |_| json!({"unparsedBody":String::from_utf8_lossy(&bytes)}),
                        ),
                        Err(error) => json!({"bodyReadError":error.to_string()}),
                    };
                    json!({"success":false,"status":status,"response":body})
                }
            };
            let expected = if case["expected"]["success"] == true {
                let raw = case["expected"]["dataRaw"].as_str().unwrap_or("");
                json!({"success":true,"dataRaw":canonical(raw).unwrap_or_else(||panic!("Original corpus object {} {}",case["schema"],case["name"]))})
            } else {
                json!({"success":false,"status":case["expected"]["response"]["statusCode"],"response":case["expected"]["response"]})
            };
            if actual != expected {
                mismatches.push(json!({"schema":case["schema"],"name":case["name"],"actual":actual,"expected":expected}));
            }
        }
        let preview = serde_json::to_string_pretty(&mismatches[..mismatches.len().min(40)])
            .unwrap_or_else(|_| "Mismatch JSON encoding failed".into());
        assert!(
            mismatches.is_empty(),
            "{} / {} original attachment cases mismatched; first 40 complete actual/expected payloads:\n{}",
            mismatches.len(),
            cases.len(),
            preview
        );
    }
    #[tokio::test]
    async fn original_zod_request_corpus_matches_entire_payload_and_issues() {
        check_original_corpus(
            include_str!("../../../../tools/rust-r2ij/j-golden.json"),
            660,
        )
        .await;
    }
    #[tokio::test]
    async fn original_k_zod_arrays_defaults_null_and_unicode_corpus() {
        check_original_corpus(
            include_str!("../../../../tools/rust-r2k/k-dto-golden.json"),
            138,
        )
        .await;
    }
}
