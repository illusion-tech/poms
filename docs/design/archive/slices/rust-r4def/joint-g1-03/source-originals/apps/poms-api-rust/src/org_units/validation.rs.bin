//! Request-only validation against the checked-in original Zod oracle.
//! Unknown fields strip; persisted/output text never passes through this module.

use axum::http::StatusCode;
use serde_json::{Value, json, value::RawValue};

use super::model::{CreateOrgUnit, MoveOrgUnit, OrgUnitActivation, UpdateOrgUnit};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::{
        json::Field,
        scalars::{NumberInput, js_number_string, legacy_number},
    },
    error::ApiError,
};

fn json_type(raw: Option<&RawValue>) -> &'static str {
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

fn invalid_type(expected: &str, received: &str, path: Vec<Value>) -> Value {
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}

fn failure(errors: Vec<Value>) -> ApiError {
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

fn object(raw: Option<&str>) -> Result<JsObject<'_>, ApiError> {
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

fn text(
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
        Some(_) => Ok(text(object, "description", false, false, 0, 1000, errors)?
            .map_or(Field::Missing, Field::Value)),
    }
}

fn integer(
    object: &JsObject<'_>,
    key: &str,
    positive: bool,
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
    if value < 0.0 || positive && value == 0.0 {
        errors.push(json!({"origin":"number","code":"too_small","minimum":0,"inclusive":!positive,"path":path,"message":if positive {"Too small: expected number to be >0"} else {"Too small: expected number to be >=0"}}));
    }
    Some(value as i64)
}

const UUID_PATTERN: &str = "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/";

fn valid_uuid(value: &str) -> bool {
    if value == "00000000-0000-0000-0000-000000000000"
        || value == "ffffffff-ffff-ffff-ffff-ffffffffffff"
    {
        return true;
    }
    let bytes = value.as_bytes();
    bytes.len() == 36
        && bytes.iter().enumerate().all(|(index, value)| {
            if [8, 13, 18, 23].contains(&index) {
                *value == b'-'
            } else {
                value.is_ascii_hexdigit()
            }
        })
        && matches!(bytes[14], b'1'..=b'8')
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b' | b'A' | b'B')
}

fn parent(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<String> {
    let Some(raw) = object.get("parentId") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Ok(text) = decode_string(raw.get()) else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("parentId")],
        ));
        return Field::Missing;
    };
    let text = text.to_utf8_lossy();
    if !valid_uuid(&text) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":["parentId"],"message":"Invalid UUID"}));
    }
    Field::Value(text)
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateOrgUnit, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let name = text(&object, "name", true, true, 1, 128, &mut errors)?;
    let code = text(&object, "code", true, true, 1, 64, &mut errors)?;
    let description = description(&object, &mut errors)?;
    let parent_id = parent(&object, &mut errors);
    let display_order = integer(&object, "displayOrder", false, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (name, code) {
        (Some(name), Some(code)) => Ok(CreateOrgUnit {
            name,
            code,
            description,
            parent_id,
            display_order,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update(raw: Option<&str>) -> Result<UpdateOrgUnit, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let name = text(&object, "name", false, true, 1, 128, &mut errors)?;
    let code = text(&object, "code", false, true, 1, 64, &mut errors)?;
    let description = description(&object, &mut errors)?;
    let display_order = integer(&object, "displayOrder", false, &mut errors);
    if errors.is_empty()
        && name.is_none()
        && code.is_none()
        && description.is_missing()
        && display_order.is_none()
    {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateOrgUnit {
        name,
        code,
        description,
        display_order,
    })
}

pub fn validate_activation(raw: Option<&str>) -> Result<OrgUnitActivation, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let reason = text(&object, "reason", false, false, 0, 1000, &mut errors)?;
    let comment = text(&object, "comment", false, false, 0, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(OrgUnitActivation {
        reason,
        comment,
        expected_version,
    })
}

pub fn validate_move(raw: Option<&str>) -> Result<MoveOrgUnit, ApiError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let parent_id = parent(&object, &mut errors);
    let display_order = integer(&object, "displayOrder", false, &mut errors);
    let reason = text(&object, "reason", false, false, 0, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", true, &mut errors);
    if errors.is_empty() && parent_id.is_missing() && display_order.is_none() {
        errors.push(
            json!({"code":"custom","path":[],"message":"At least one field is required for move"}),
        );
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(MoveOrgUnit {
        parent_id,
        display_order,
        reason,
        expected_version,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;

    fn text_field(fields: &mut Vec<String>, name: &str, value: Option<&JsString>) {
        if let Some(value) = value {
            fields.push(format!("\"{name}\":{}", value.json()));
        }
    }
    fn desc(fields: &mut Vec<String>, value: &Field<JsString>) {
        match value {
            Field::Missing => {}
            Field::Null => fields.push("\"description\":null".into()),
            Field::Value(value) => fields.push(format!("\"description\":{}", value.json())),
        }
    }
    fn parent_field(fields: &mut Vec<String>, value: &Field<String>) {
        match value {
            Field::Missing => {}
            Field::Null => fields.push("\"parentId\":null".into()),
            Field::Value(value) => fields.push(format!("\"parentId\":{}", json!(value))),
        }
    }
    fn number(fields: &mut Vec<String>, name: &str, value: Option<i64>) {
        if let Some(value) = value {
            fields.push(format!("\"{name}\":{value}"));
        }
    }
    fn sample(schema: &str, raw: Option<&str>) -> Result<String, ApiError> {
        let mut fields = Vec::new();
        match schema {
            "CreateOrgUnitRequest" => {
                let value = validate_create(raw)?;
                text_field(&mut fields, "name", Some(&value.name));
                text_field(&mut fields, "code", Some(&value.code));
                desc(&mut fields, &value.description);
                parent_field(&mut fields, &value.parent_id);
                number(&mut fields, "displayOrder", value.display_order);
            }
            "UpdateOrgUnitRequest" => {
                let value = validate_update(raw)?;
                text_field(&mut fields, "name", value.name.as_ref());
                text_field(&mut fields, "code", value.code.as_ref());
                desc(&mut fields, &value.description);
                number(&mut fields, "displayOrder", value.display_order);
            }
            "UpdateOrgUnitActivationRequest" => {
                let value = validate_activation(raw)?;
                text_field(&mut fields, "reason", value.reason.as_ref());
                text_field(&mut fields, "comment", value.comment.as_ref());
                number(&mut fields, "expectedVersion", value.expected_version);
            }
            "MoveOrgUnitRequest" => {
                let value = validate_move(raw)?;
                parent_field(&mut fields, &value.parent_id);
                number(&mut fields, "displayOrder", value.display_order);
                text_field(&mut fields, "reason", value.reason.as_ref());
                number(&mut fields, "expectedVersion", value.expected_version);
            }
            _ => return Err(ApiError::internal()),
        }
        Ok(format!("{{{}}}", fields.join(",")))
    }
    fn canonical(raw: &str) -> Vec<(String, String)> {
        JsObject::parse(raw)
            .unwrap_or_else(|_| panic!("object JSON"))
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
    async fn actual_original_zod_wire_cases_match_values_and_complete_error_bodies() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2c/org-units-golden.json"
        ))
        .unwrap_or_else(|_| panic!("original oracle"));
        let mut wire_cases = 0;
        for case in golden["cases"]
            .as_array()
            .unwrap_or_else(|| panic!("cases"))
        {
            // Own JavaScript undefined cannot be present in an HTTP JSON body.
            if case["nonWireOwnUndefined"] == true {
                continue;
            }
            wire_cases += 1;
            let name = case["name"].as_str().unwrap_or("");
            match sample(
                case["schema"].as_str().unwrap_or(""),
                case["inputRaw"].as_str(),
            ) {
                Ok(actual) => {
                    assert_eq!(case["expected"]["success"], true, "{name}");
                    assert_eq!(
                        canonical(&actual),
                        canonical(case["expected"]["dataRaw"].as_str().unwrap_or("")),
                        "{name}"
                    );
                }
                Err(error) => {
                    assert_eq!(case["expected"]["success"], false, "{name}");
                    let response = error.into_response();
                    assert_eq!(response.status().as_u16(), 400, "{name}");
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
                    assert_eq!(actual, expected, "{name}");
                }
            }
        }
        assert_eq!(wire_cases, golden["wireCases"].as_u64().unwrap_or(0));
    }
}
