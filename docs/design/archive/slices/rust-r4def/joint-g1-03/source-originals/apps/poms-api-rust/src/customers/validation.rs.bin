//! Original Zod request semantics, including code-point length and key stripping.
//! The frozen joint length decision supersedes the author's initial UTF-16 note.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::{Value, json, value::RawValue};

use super::model::{CreateCustomer, CreateCustomerAlias, CustomerListQuery, UpdateCustomer};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::{
        json::Field,
        scalars::{NumberInput, js_number_string, legacy_number},
    },
    error::ApiError,
    shared::generated::{CustomerAliasType, CustomerStatus},
};

#[derive(Debug)]
pub struct ValidationError {
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
fn invalid_type(expected: &str, received: &str, key: Option<&str>) -> Value {
    let path: Vec<Value> = key.map(|key| vec![json!(key)]).unwrap_or_default();
    json!({"expected":expected,"code":"invalid_type","path":path,"message":format!("Invalid input: expected {expected}, received {received}")})
}
fn object(raw: Option<&str>) -> Result<JsObject<'_>, ValidationError> {
    let Some(raw) = raw else {
        return Err(failure(vec![invalid_type("object", "undefined", None)]));
    };
    JsObject::parse(raw).map_err(|_| {
        failure(vec![invalid_type(
            "object",
            json_type(serde_json::from_str::<&RawValue>(raw).ok()),
            None,
        )])
    })
}
pub(crate) fn whitespace(unit: u16) -> bool {
    matches!(unit, 0x0009..=0x000d | 0x0020 | 0x00a0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
}
pub(crate) fn trim(value: JsString) -> JsString {
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

fn primitive_text(raw: &RawValue, array_item: bool) -> Result<String, ValidationError> {
    match json_type(Some(raw)) {
        "string" => decode_string(raw.get())
            .map(|text| text.to_utf8_lossy())
            .map_err(|_| schema_exception()),
        "null" => Ok(if array_item { "" } else { "null" }.to_owned()),
        "boolean" => Ok(raw.get().to_owned()),
        "number" => Ok(js_number_string(raw.get().parse().unwrap_or(f64::NAN))),
        "array" => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .map_err(|_| schema_exception())?
            .into_iter()
            .map(|value| primitive_text(value, true))
            .collect::<Result<Vec<_>, _>>()
            .map(|values| values.join(",")),
        _ => {
            let object = JsObject::parse(raw.get()).map_err(|_| schema_exception())?;
            if object.get("toString").is_some() {
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
fn invalid_length(
    raw: Option<&RawValue>,
    key: &str,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<(), ValidationError> {
    let Some(raw) = raw else { return Ok(()) };
    let (origin, length) = match json_type(Some(raw)) {
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
            ("unknown", length_number(length)?)
        }
        _ => return Ok(()),
    };
    if length < 1.0 || length.is_nan() {
        errors.push(json!({"origin":origin,"code":"too_small","minimum":1,"inclusive":true,"path":[key],"message":if origin=="array" {"Too small: expected array to have >=1 items"} else {"Too small: expected unknown to be >=1"}}));
    }
    if length > max as f64 || length.is_nan() {
        errors.push(json!({"origin":origin,"code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":if origin=="array" {format!("Too big: expected array to have <={max} items")} else {format!("Too big: expected unknown to be <={max}")}}));
    }
    Ok(())
}
fn text(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Option<JsString>, ValidationError> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Ok(None);
    }
    let Some(value) = raw.and_then(|raw| decode_string(raw.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), Some(key)));
        invalid_length(raw, key, max, errors)?;
        return Ok(None);
    };
    let value = trim(value);
    let length = char::decode_utf16(value.as_code_units().iter().copied()).count();
    if length < 1 {
        errors.push(json!({"origin":"string","code":"too_small","minimum":1,"inclusive":true,"path":[key],"message":"Too small: expected string to have >=1 characters"}));
    }
    if length > max {
        errors.push(json!({"origin":"string","code":"too_big","maximum":max,"inclusive":true,"path":[key],"message":format!("Too big: expected string to have <={max} characters")}));
    }
    Ok(Some(value))
}
fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ValidationError> {
    match object.get(key) {
        None => Ok(Field::Missing),
        Some(raw) if raw.get() == "null" => Ok(Field::Null),
        Some(_) => Ok(text(object, key, false, max, errors)?.map_or(Field::Missing, Field::Value)),
    }
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
        && bytes.iter().enumerate().all(|(index, byte)| {
            if [8, 13, 18, 23].contains(&index) {
                *byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
        && matches!(bytes[14], b'1'..=b'8')
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b' | b'A' | b'B')
}
fn uuid(
    object: &JsObject<'_>,
    key: &str,
    nullable: bool,
    errors: &mut Vec<Value>,
) -> Field<String> {
    let Some(raw) = object.get(key) else {
        return Field::Missing;
    };
    if nullable && raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type("string", json_type(Some(raw)), Some(key)));
        return Field::Missing;
    };
    let value = value.to_utf8_lossy();
    if !valid_uuid(&value) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":[key],"message":"Invalid UUID"}));
    }
    Field::Value(value)
}
fn enumeration(
    object: &JsObject<'_>,
    key: &str,
    values: &[&str],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key)?;
    let value = decode_string(raw.get())
        .ok()
        .map(|text| text.to_utf8_lossy());
    if !value.as_deref().is_some_and(|text| values.contains(&text)) {
        let options = values
            .iter()
            .map(|value| format!("\"{value}\""))
            .collect::<Vec<_>>()
            .join("|");
        errors.push(json!({"code":"invalid_value","values":values,"path":[key],"message":format!("Invalid option: expected one of {options}")}));
    }
    value
}
fn finish<T>(errors: Vec<Value>, value: T) -> Result<T, ValidationError> {
    if errors.is_empty() {
        Ok(value)
    } else {
        Err(failure(errors))
    }
}

pub fn validate_create(raw: Option<&str>) -> Result<CreateCustomer, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let display_name = text(&object, "displayName", true, 255, &mut errors)?;
    let legal_name = nullable_text(&object, "legalName", 255, &mut errors)?;
    let short_name = nullable_text(&object, "shortName", 128, &mut errors)?;
    let owner_org_id = uuid(&object, "ownerOrgId", true, &mut errors);
    let owner_user_id = uuid(&object, "ownerUserId", true, &mut errors);
    let source_channel = nullable_text(&object, "sourceChannel", 64, &mut errors)?;
    let remark = nullable_text(&object, "remark", 2000, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(CreateCustomer {
        display_name: display_name.ok_or_else(schema_exception)?,
        legal_name,
        short_name,
        owner_org_id,
        owner_user_id,
        source_channel,
        remark,
    })
}
pub fn validate_update(raw: Option<&str>) -> Result<UpdateCustomer, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let display_name = text(&object, "displayName", false, 255, &mut errors)?;
    let legal_name = nullable_text(&object, "legalName", 255, &mut errors)?;
    let short_name = nullable_text(&object, "shortName", 128, &mut errors)?;
    let status = enumeration(
        &object,
        "status",
        &[
            CustomerStatus::Active.as_str(),
            CustomerStatus::Inactive.as_str(),
        ],
        &mut errors,
    );
    let owner_org_id = uuid(&object, "ownerOrgId", true, &mut errors);
    let owner_user_id = uuid(&object, "ownerUserId", true, &mut errors);
    let source_channel = nullable_text(&object, "sourceChannel", 64, &mut errors)?;
    let remark = nullable_text(&object, "remark", 2000, &mut errors)?;
    if [
        "displayName",
        "legalName",
        "shortName",
        "status",
        "ownerOrgId",
        "ownerUserId",
        "sourceChannel",
        "remark",
    ]
    .iter()
    .all(|key| object.get(key).is_none())
    {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
    }
    finish(
        errors,
        UpdateCustomer {
            display_name,
            legal_name,
            short_name,
            status,
            owner_org_id,
            owner_user_id,
            source_channel,
            remark,
        },
    )
}
pub fn validate_alias(raw: Option<&str>) -> Result<CreateCustomerAlias, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let alias_name = text(&object, "aliasName", true, 255, &mut errors)?;
    let values = CustomerAliasType::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let alias_type = enumeration(&object, "aliasType", &values, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(CreateCustomerAlias {
        alias_name: alias_name.ok_or_else(schema_exception)?,
        alias_type,
    })
}
pub fn validate_list(raw_query: Option<&str>) -> Result<CustomerListQuery, ValidationError> {
    let raw = parse_query(raw_query);
    let object = object(Some(&raw))?;
    let mut errors = Vec::new();
    let values = CustomerStatus::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let status = enumeration(&object, "status", &values, &mut errors);
    let owner_org_id = match uuid(&object, "ownerOrgId", false, &mut errors) {
        Field::Value(value) => Some(value),
        _ => None,
    };
    let keyword = text(&object, "keyword", false, 128, &mut errors)?;
    finish(
        errors,
        CustomerListQuery {
            status,
            owner_org_id,
            keyword,
        },
    )
}
fn parse_query(raw: Option<&str>) -> String {
    let mut fields: Vec<(String, Vec<String>)> = Vec::new();
    for pair in raw.unwrap_or("").split('&').take(1000) {
        let Some((key, value)) = url::form_urlencoded::parse(pair.as_bytes()).next() else {
            continue;
        };
        if let Some((_, values)) = fields.iter_mut().find(|(name, _)| name == &key) {
            values.push(value.into_owned())
        } else {
            fields.push((key.into_owned(), vec![value.into_owned()]))
        }
    }
    let fields = fields
        .into_iter()
        .map(|(key, values)| {
            let key = serde_json::to_string(&key).unwrap_or_default();
            let value = if values.len() == 1 {
                serde_json::to_string(&values[0]).unwrap_or_default()
            } else {
                serde_json::to_string(&values).unwrap_or_default()
            };
            format!("{key}:{value}")
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("{{{fields}}}")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn frozen_astral_boundary_counts_code_points_after_trim() {
        let raw = json!({"displayName":format!("  {}  ","😀".repeat(255))}).to_string();
        assert!(validate_create(Some(&raw)).is_ok());
        let raw = json!({"displayName":"😀".repeat(256)}).to_string();
        assert!(validate_create(Some(&raw)).is_err());
    }
    #[test]
    fn nullable_owner_fields_preserve_omission_and_null_and_strip_unknowns() {
        let value = validate_update(Some(r#"{"ownerUserId":null,"expectedVersion":3}"#))
            .unwrap_or_else(|_| panic!("valid nullable update"));
        assert!(value.owner_user_id.is_null());
        assert!(value.owner_org_id.is_missing());
        assert!(validate_update(Some(r#"{"expectedVersion":3}"#)).is_err());
        assert!(validate_alias(Some(r#"{"aliasName":"x","aliasType":null}"#)).is_err());
    }
}
