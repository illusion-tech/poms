//! Request-only validation against the checked-in original Zod oracle.
//! Profile uses strict unknown keys; other request schemas strip. Output never validates here.

use axum::{
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::{Value, json, value::RawValue};

use super::model::{
    AssignUserOrgMemberships, AssignUserRoles, CreateUser, UpdateProfile, UpdateUser,
    UserActivation,
};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::{
        json::Field,
        scalars::{NumberInput, js_number_string, legacy_number},
    },
};

#[derive(Debug)]
pub struct ValidationError {
    status: StatusCode,
    body: String,
}
impl ValidationError {
    fn object(status: StatusCode, body: Value) -> Self {
        Self {
            status,
            body: body.to_string(),
        }
    }
    fn internal() -> Self {
        Self::object(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"statusCode":500,"message":"Internal server error"}),
        )
    }
}
impl IntoResponse for ValidationError {
    fn into_response(self) -> Response {
        let mut response = (self.status, self.body).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json; charset=utf-8"),
        );
        response
    }
}

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

fn failure(errors: Vec<Value>) -> ValidationError {
    ValidationError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed","errors":errors}),
    )
}

fn schema_exception() -> ValidationError {
    // The original vendor validate() catches every schema exception, including
    // TypeError. Non-Zod errors have no `issues`, so JSON omits `errors`.
    ValidationError::object(
        StatusCode::BAD_REQUEST,
        json!({"statusCode":400,"message":"Validation failed"}),
    )
}

fn object(raw: Option<&str>) -> Result<JsObject<'_>, ValidationError> {
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
fn primitive_text(raw: &RawValue, array_item: bool) -> Result<String, ValidationError> {
    match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map(|value| value.to_utf8_lossy())
            .map_err(|_| ValidationError::internal()),
        "null" => Ok(if array_item { "" } else { "null" }.to_owned()),
        "boolean" => Ok(raw.get().to_owned()),
        "number" => Ok(js_number_string(raw.get().parse().unwrap_or(f64::NAN))),
        "array" => {
            let values: Vec<&RawValue> =
                serde_json::from_str(raw.get()).map_err(|_| ValidationError::internal())?;
            values
                .into_iter()
                .map(|value| primitive_text(value, true))
                .collect::<Result<Vec<_>, _>>()
                .map(|values| values.join(","))
        }
        _ => {
            let value = JsObject::parse(raw.get()).map_err(|_| ValidationError::internal())?;
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

fn length_number(raw: &RawValue) -> Result<f64, ValidationError> {
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
) -> Result<(), ValidationError> {
    let Some(raw) = raw else { return Ok(()) };
    let (origin, length) = match json_type(Some(raw)) {
        "array" => {
            let values: Vec<&RawValue> =
                serde_json::from_str(raw.get()).map_err(|_| ValidationError::internal())?;
            ("array", values.len() as f64)
        }
        "object" => {
            let value = JsObject::parse(raw.get()).map_err(|_| ValidationError::internal())?;
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
) -> Result<Option<JsString>, ValidationError> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Ok(None);
    }
    let Some(mut value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        if min > 0 || max != usize::MAX {
            invalid_text_length(raw, key, min, max, errors)?;
        }
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

fn trimmed(value: JsString) -> JsString {
    let units = value.as_code_units();
    let first = units
        .iter()
        .position(|unit| !whitespace(*unit))
        .unwrap_or(units.len());
    let last = units
        .iter()
        .rposition(|unit| !whitespace(*unit))
        .map_or(first, |index| index + 1);
    JsString::from_code_units(units[first..last].to_vec())
}

const EMAIL_PATTERN: &str = r"/^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/";

fn valid_email(value: &str) -> bool {
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    let local_char = |byte: u8| byte.is_ascii_alphanumeric() || b"_'+-".contains(&byte);
    if local.is_empty()
        || local
            .split('.')
            .any(|part| part.is_empty() || !part.bytes().all(local_char))
        || local.ends_with('\'')
    {
        return false;
    }
    let labels = domain.split('.').collect::<Vec<_>>();
    if labels.len() < 2 {
        return false;
    }
    let tld = labels.last().copied().unwrap_or("");
    tld.len() >= 2
        && tld.bytes().all(|byte| byte.is_ascii_alphabetic())
        && labels[..labels.len() - 1].iter().all(|label| {
            !label.is_empty()
                && label.as_bytes()[0].is_ascii_alphanumeric()
                && label
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        })
}

#[derive(Clone, Copy)]
enum Format {
    Plain,
    Email,
    Url,
}
fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    trim: bool,
    min: usize,
    max: usize,
    format: Format,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ValidationError> {
    match object.get(key) {
        None => Ok(Field::Missing),
        Some(raw) if raw.get() == "null" => Ok(Field::Null),
        Some(_) => {
            let Some(mut value) = text(object, key, false, trim, min, max, errors)? else {
                return Ok(Field::Missing);
            };
            match format {
                Format::Plain => {}
                Format::Email => {
                    if !valid_email(&value.to_utf8_lossy()) {
                        errors.push(json!({"origin":"string","code":"invalid_format","format":"email","pattern":EMAIL_PATTERN,"path":[key],"message":"Invalid email address"}));
                    }
                }
                Format::Url => {
                    // Zod4.6.1 uses WHATWG URL parsing, then retains the trimmed
                    // original spelling with all ASCII TAB/LF/CR removed. It
                    // does not return URL.href (normalize is false).
                    let candidate = trimmed(value.clone());
                    if url::Url::parse(&candidate.to_utf8_lossy()).is_err() {
                        errors.push(json!({"code":"invalid_format","format":"url","path":[key],"message":"Invalid URL"}));
                    } else {
                        value = JsString::from_code_units(
                            candidate
                                .as_code_units()
                                .iter()
                                .copied()
                                .filter(|unit| !matches!(*unit, 9 | 10 | 13))
                                .collect(),
                        );
                    }
                }
            }
            Ok(Field::Value(value))
        }
    }
}

fn uuid_value(raw: Option<&RawValue>, path: Vec<Value>, errors: &mut Vec<Value>) -> Option<String> {
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), path));
        return None;
    };
    let value = value.to_utf8_lossy();
    if !valid_uuid(&value) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":path,"message":"Invalid UUID"}));
    }
    Some(value)
}
fn uuid_array(
    object: &JsObject<'_>,
    key: &str,
    default: bool,
    errors: &mut Vec<Value>,
) -> Vec<String> {
    let raw = object.get(key);
    if raw.is_none() && default {
        return Vec::new();
    }
    let Some(values) = raw
        .filter(|raw| json_type(Some(raw)) == "array")
        .and_then(|raw| serde_json::from_str::<Vec<&RawValue>>(raw.get()).ok())
    else {
        errors.push(invalid_type("array", json_type(raw), vec![json!(key)]));
        return Vec::new();
    };
    values
        .into_iter()
        .enumerate()
        .filter_map(|(index, value)| {
            uuid_value(Some(value), vec![json!(key), json!(index)], errors)
        })
        .collect()
}

fn strict_failure(errors: Vec<Value>, unknown: Vec<&JsString>) -> ValidationError {
    let mut issues = errors
        .into_iter()
        .map(|value| value.to_string())
        .collect::<Vec<_>>();
    if !unknown.is_empty() {
        let mut units = if unknown.len() == 1 {
            "Unrecognized key: "
        } else {
            "Unrecognized keys: "
        }
        .encode_utf16()
        .collect::<Vec<_>>();
        for (index, key) in unknown.iter().enumerate() {
            if index > 0 {
                units.extend(", ".encode_utf16());
            }
            units.push(34);
            units.extend_from_slice(key.as_code_units());
            units.push(34);
        }
        let message = JsString::from_code_units(units).json();
        let keys = unknown
            .iter()
            .map(|key| key.json())
            .collect::<Vec<_>>()
            .join(",");
        issues.push(format!(
            "{{\"code\":\"unrecognized_keys\",\"keys\":[{keys}],\"path\":[],\"message\":{message}}}"
        ));
    }
    ValidationError {
        status: StatusCode::BAD_REQUEST,
        body: format!(
            "{{\"statusCode\":400,\"message\":\"Validation failed\",\"errors\":[{}]}}",
            issues.join(",")
        ),
    }
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateUser, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let username = text(&object, "username", true, false, 1, 64, &mut errors)?;
    let display_name = text(&object, "displayName", true, false, 1, 128, &mut errors)?;
    let email = nullable_text(
        &object,
        "email",
        false,
        0,
        usize::MAX,
        Format::Email,
        &mut errors,
    )?;
    let phone = nullable_text(&object, "phone", false, 0, 64, Format::Plain, &mut errors)?;
    let primary_org_unit_id = match object.get("primaryOrgUnitId") {
        Some(raw) if raw.get() == "null" => None,
        value => uuid_value(value, vec![json!("primaryOrgUnitId")], &mut errors),
    };
    let initial_role_ids = uuid_array(&object, "initialRoleIds", true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (username, display_name) {
        (Some(username), Some(display_name)) => Ok(CreateUser {
            username,
            display_name,
            email,
            phone,
            primary_org_unit_id,
            initial_role_ids,
        }),
        _ => Err(ValidationError::internal()),
    }
}
pub fn validate_update(raw: Option<&str>) -> Result<UpdateUser, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let display_name = text(&object, "displayName", false, false, 1, 128, &mut errors)?;
    let email = nullable_text(
        &object,
        "email",
        false,
        0,
        usize::MAX,
        Format::Email,
        &mut errors,
    )?;
    let phone = nullable_text(&object, "phone", false, 0, 64, Format::Plain, &mut errors)?;
    let avatar_url = nullable_text(
        &object,
        "avatarUrl",
        false,
        0,
        usize::MAX,
        Format::Url,
        &mut errors,
    )?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UpdateUser {
        display_name,
        email,
        phone,
        avatar_url,
    })
}
pub fn validate_profile(raw: Option<&str>) -> Result<UpdateProfile, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let display_name = text(&object, "displayName", false, true, 1, 128, &mut errors)?;
    let email = nullable_text(
        &object,
        "email",
        true,
        0,
        usize::MAX,
        Format::Email,
        &mut errors,
    )?;
    let phone = nullable_text(&object, "phone", true, 1, 64, Format::Plain, &mut errors)?;
    let unknown = object
        .keys()
        .into_iter()
        .filter(|key| {
            !["displayName", "email", "phone"]
                .iter()
                .any(|name| key.eq_ascii(name))
        })
        .collect::<Vec<_>>();
    if !errors.is_empty() || !unknown.is_empty() {
        return Err(strict_failure(errors, unknown));
    }
    Ok(UpdateProfile {
        display_name,
        email,
        phone,
    })
}
pub fn validate_activation(raw: Option<&str>) -> Result<UserActivation, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let reason = text(&object, "reason", false, false, 0, 1000, &mut errors)?;
    let comment = text(&object, "comment", false, false, 0, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(UserActivation {
        reason,
        comment,
        expected_version,
    })
}
pub fn validate_roles(raw: Option<&str>) -> Result<AssignUserRoles, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let role_ids = uuid_array(&object, "roleIds", false, &mut errors);
    let reason = text(&object, "reason", false, false, 0, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(AssignUserRoles {
        role_ids,
        reason,
        expected_version,
    })
}
pub fn validate_org_memberships(
    raw: Option<&str>,
) -> Result<AssignUserOrgMemberships, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let primary_org_unit_id = uuid_value(
        object.get("primaryOrgUnitId"),
        vec![json!("primaryOrgUnitId")],
        &mut errors,
    );
    let secondary_org_unit_ids = uuid_array(&object, "secondaryOrgUnitIds", true, &mut errors);
    let reason = text(&object, "reason", false, false, 0, 1000, &mut errors)?;
    let expected_version = integer(&object, "expectedVersion", true, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    primary_org_unit_id
        .map(|primary_org_unit_id| AssignUserOrgMemberships {
            primary_org_unit_id,
            secondary_org_unit_ids,
            reason,
            expected_version,
        })
        .ok_or_else(ValidationError::internal)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Expected {
        success: bool,
        data_raw: Option<String>,
        own_keys: Option<Vec<String>>,
        errors: Option<Box<RawValue>>,
        internal_error: Option<Box<RawValue>>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Case {
        schema: String,
        name: String,
        input_raw: Option<String>,
        non_wire_own_undefined: bool,
        expected: Expected,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Golden {
        wire_cases: usize,
        non_wire_cases: usize,
        cases: Vec<Case>,
    }

    fn optional_text(fields: &mut Vec<String>, name: &str, value: Option<&JsString>) {
        if let Some(value) = value {
            fields.push(format!("\"{name}\":{}", value.json()));
        }
    }
    fn nullable_text_field(fields: &mut Vec<String>, name: &str, value: Field<&JsString>) {
        match value {
            Field::Missing => {}
            Field::Null => fields.push(format!("\"{name}\":null")),
            Field::Value(value) => optional_text(fields, name, Some(value)),
        }
    }
    fn number_field(fields: &mut Vec<String>, value: Option<i64>) {
        if let Some(value) = value {
            fields.push(format!("\"expectedVersion\":{value}"));
        }
    }
    fn sample(schema: &str, raw: Option<&str>) -> Result<String, ValidationError> {
        let mut fields = Vec::new();
        match schema {
            "CreatePlatformUserRequest" => {
                let value = validate_create(raw)?;
                optional_text(&mut fields, "username", Some(&value.username));
                optional_text(&mut fields, "displayName", Some(&value.display_name));
                nullable_text_field(&mut fields, "email", value.email.as_ref());
                nullable_text_field(&mut fields, "phone", value.phone.as_ref());
                fields.push(format!(
                    "\"primaryOrgUnitId\":{}",
                    json!(value.primary_org_unit_id)
                ));
                fields.push(format!(
                    "\"initialRoleIds\":{}",
                    json!(value.initial_role_ids)
                ));
            }
            "UpdatePlatformUserRequest" => {
                let value = validate_update(raw)?;
                optional_text(&mut fields, "displayName", value.display_name.as_ref());
                nullable_text_field(&mut fields, "email", value.email.as_ref());
                nullable_text_field(&mut fields, "phone", value.phone.as_ref());
                nullable_text_field(&mut fields, "avatarUrl", value.avatar_url.as_ref());
            }
            "UpdateCurrentUserProfileRequest" => {
                let value = validate_profile(raw)?;
                optional_text(&mut fields, "displayName", value.display_name.as_ref());
                nullable_text_field(&mut fields, "email", value.email.as_ref());
                nullable_text_field(&mut fields, "phone", value.phone.as_ref());
            }
            "UpdatePlatformUserActivationRequest" => {
                let value = validate_activation(raw)?;
                optional_text(&mut fields, "reason", value.reason.as_ref());
                optional_text(&mut fields, "comment", value.comment.as_ref());
                number_field(&mut fields, value.expected_version);
            }
            "AssignUserRolesRequest" => {
                let value = validate_roles(raw)?;
                fields.push(format!("\"roleIds\":{}", json!(value.role_ids)));
                optional_text(&mut fields, "reason", value.reason.as_ref());
                number_field(&mut fields, value.expected_version);
            }
            "AssignUserOrgMembershipsRequest" => {
                let value = validate_org_memberships(raw)?;
                fields.push(format!(
                    "\"primaryOrgUnitId\":{}",
                    json!(value.primary_org_unit_id)
                ));
                fields.push(format!(
                    "\"secondaryOrgUnitIds\":{}",
                    json!(value.secondary_org_unit_ids)
                ));
                optional_text(&mut fields, "reason", value.reason.as_ref());
                number_field(&mut fields, value.expected_version);
            }
            _ => return Err(ValidationError::internal()),
        }
        Ok(format!("{{{}}}", fields.join(",")))
    }
    // Preserve UTF-16 strings while comparing JSON object values independently
    // of object member encoding order. Array order remains significant.
    fn canonical(raw: &str) -> String {
        let raw = raw.trim();
        match raw.as_bytes().first() {
            Some(b'"') => decode_string(raw)
                .unwrap_or_else(|_| panic!("string"))
                .json(),
            Some(b'{') => {
                let object = JsObject::parse(raw).unwrap_or_else(|_| panic!("object"));
                let mut entries = object
                    .entries()
                    .map(|(key, value)| (key.json(), canonical(value.get())))
                    .collect::<Vec<_>>();
                entries.sort();
                format!(
                    "{{{}}}",
                    entries
                        .into_iter()
                        .map(|(key, value)| format!("{key}:{value}"))
                        .collect::<Vec<_>>()
                        .join(",")
                )
            }
            Some(b'[') => {
                let values: Vec<&RawValue> =
                    serde_json::from_str(raw).unwrap_or_else(|_| panic!("array"));
                format!(
                    "[{}]",
                    values
                        .into_iter()
                        .map(|value| canonical(value.get()))
                        .collect::<Vec<_>>()
                        .join(",")
                )
            }
            _ => raw.to_owned(),
        }
    }

    #[tokio::test]
    async fn original_zod_wire_cases_match_payload_key_order_and_entire_issues() {
        let golden: Golden =
            serde_json::from_str(include_str!("../../../../tools/rust-r2d/users-golden.json"))
                .unwrap_or_else(|_| panic!("original oracle"));
        let mut wire = 0;
        let mut non_wire = 0;
        for case in golden.cases {
            if case.non_wire_own_undefined {
                non_wire += 1;
                continue;
            }
            wire += 1;
            let label = format!("{}:{}", case.schema, case.name);
            match sample(&case.schema, case.input_raw.as_deref()) {
                Ok(actual) => {
                    assert!(case.expected.success, "{label}");
                    let expected = case.expected.data_raw.as_deref().unwrap_or("");
                    assert_eq!(canonical(&actual), canonical(expected), "{label}");
                    let actual_keys = JsObject::parse(&actual)
                        .unwrap_or_else(|_| panic!("result"))
                        .keys()
                        .into_iter()
                        .map(|key| key.to_utf8_lossy())
                        .collect::<Vec<_>>();
                    assert_eq!(Some(actual_keys), case.expected.own_keys, "{label}");
                }
                Err(error) => {
                    assert!(!case.expected.success, "{label}");
                    let response = error.into_response();
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{label}");
                    let bytes = axum::body::to_bytes(response.into_body(), 1_000_000)
                        .await
                        .unwrap_or_else(|_| panic!("response bytes"));
                    let raw =
                        std::str::from_utf8(&bytes).unwrap_or_else(|_| panic!("response UTF8"));
                    let expected = if case.expected.internal_error.is_some() {
                        "{\"statusCode\":400,\"message\":\"Validation failed\"}".to_owned()
                    } else {
                        format!(
                            "{{\"statusCode\":400,\"message\":\"Validation failed\",\"errors\":{}}}",
                            case.expected
                                .errors
                                .as_deref()
                                .map_or("null", RawValue::get)
                        )
                    };
                    assert_eq!(canonical(raw), canonical(&expected), "{label}");
                }
            }
        }
        assert_eq!(wire, golden.wire_cases);
        assert_eq!(non_wire, golden.non_wire_cases);
    }
}
