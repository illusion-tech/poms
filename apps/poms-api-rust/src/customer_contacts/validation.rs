//! Public contact DTO validation and command projection.

use serde_json::{Value, json};

use super::model::{Create, Query, Update};
use crate::{
    auth::js_json::{JsObject, JsString, decode_string},
    compat::json::Field,
    dictionary::validation::{failure, invalid_type, json_type, object, text},
    error::ApiError,
    shared::generated::{CustomerContactGender, CustomerContactStatus},
};

pub type ValidationError = ApiError;

const UUID_PATTERN: &str = "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/";
const EMAIL_PATTERN: &str = r"/^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/";

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
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'A' | b'b' | b'B')
}

pub(crate) fn uuid(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    nullable: bool,
    errors: &mut Vec<Value>,
) -> Field<String> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return Field::Missing;
    }
    if nullable && raw.is_some_and(|value| value.get() == "null") {
        return Field::Null;
    }
    let Some(value) = raw.and_then(|value| decode_string(value.get()).ok()) else {
        errors.push(invalid_type("string", json_type(raw), vec![json!(key)]));
        return Field::Missing;
    };
    let value = value.to_utf8_lossy();
    if !valid_uuid(&value) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"uuid","pattern":UUID_PATTERN,"path":[key],"message":"Invalid UUID"}));
    }
    Field::Value(value)
}

pub(crate) fn enumeration(
    object: &JsObject<'_>,
    key: &str,
    required: bool,
    values: &[&str],
    errors: &mut Vec<Value>,
) -> Option<String> {
    let raw = object.get(key);
    if raw.is_none() && !required {
        return None;
    }
    if let Some(value) = raw
        .and_then(|value| decode_string(value.get()).ok())
        .map(|value| value.to_utf8_lossy())
        && values.contains(&value.as_str())
    {
        return Some(value);
    }
    let allowed = values
        .iter()
        .map(|value| format!("\"{value}\""))
        .collect::<Vec<_>>()
        .join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":[key],"message":format!("Invalid option: expected one of {allowed}")}));
    None
}

pub(crate) fn nullable_text(
    object: &JsObject<'_>,
    key: &str,
    min: usize,
    max: usize,
    errors: &mut Vec<Value>,
) -> Result<Field<JsString>, ApiError> {
    match object.get(key) {
        None => Ok(Field::Missing),
        Some(value) if value.get() == "null" => Ok(Field::Null),
        Some(_) => {
            Ok(text(object, key, false, true, min, max, errors)?
                .map_or(Field::Missing, Field::Value))
        }
    }
}

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
    let Some(tld) = labels.last().copied().filter(|_| labels.len() >= 2) else {
        return false;
    };
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

fn email(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Field<JsString> {
    let Some(raw) = object.get("email") else {
        return Field::Missing;
    };
    if raw.get() == "null" {
        return Field::Null;
    }
    let Some(value) = decode_string(raw.get()).ok() else {
        errors.push(invalid_type(
            "string",
            json_type(Some(raw)),
            vec![json!("email")],
        ));
        return Field::Missing;
    };
    if !valid_email(&value.to_utf8_lossy()) {
        errors.push(json!({"origin":"string","code":"invalid_format","format":"email","pattern":EMAIL_PATTERN,"path":["email"],"message":"Invalid email address"}));
    }
    Field::Value(value)
}

pub fn validate_create(raw: Option<&str>) -> Result<Create, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    let name = text(&object, "name", true, true, 1, 128, &mut errors)?;
    let genders = CustomerContactGender::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let gender = enumeration(&object, "gender", false, &genders, &mut errors);
    let department = nullable_text(&object, "department", 1, 128, &mut errors)?;
    let title = nullable_text(&object, "title", 1, 128, &mut errors)?;
    let work_phone = nullable_text(&object, "workPhone", 1, 64, &mut errors)?;
    let mobile = nullable_text(&object, "mobile", 1, 64, &mut errors)?;
    let wechat = nullable_text(&object, "wechat", 1, 128, &mut errors)?;
    let email = email(&object, &mut errors);
    let remark = nullable_text(&object, "remark", 1, 2000, &mut errors)?;
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match (customer_id, name) {
        (Field::Value(customer_id), Some(name)) => Ok(Create {
            customer_id,
            name,
            gender,
            department,
            title,
            work_phone,
            mobile,
            wechat,
            email,
            remark,
        }),
        _ => Err(ApiError::internal()),
    }
}

pub fn validate_update(raw: Option<&str>) -> Result<Update, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let name = text(&object, "name", false, true, 1, 128, &mut errors)?;
    let genders = CustomerContactGender::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let gender = enumeration(&object, "gender", false, &genders, &mut errors);
    let department = nullable_text(&object, "department", 1, 128, &mut errors)?;
    let title = nullable_text(&object, "title", 1, 128, &mut errors)?;
    let work_phone = nullable_text(&object, "workPhone", 1, 64, &mut errors)?;
    let mobile = nullable_text(&object, "mobile", 1, 64, &mut errors)?;
    let wechat = nullable_text(&object, "wechat", 1, 128, &mut errors)?;
    let email = email(&object, &mut errors);
    let remark = nullable_text(&object, "remark", 1, 2000, &mut errors)?;
    let statuses = CustomerContactStatus::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    let status = enumeration(&object, "status", false, &statuses, &mut errors);
    if errors.is_empty()
        && [
            "name",
            "gender",
            "department",
            "title",
            "workPhone",
            "mobile",
            "wechat",
            "email",
            "remark",
            "status",
        ]
        .iter()
        .all(|key| object.get(key).is_none())
    {
        errors.push(json!({"code":"custom","path":[],"message":"At least one field is required for update"}));
    }
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    Ok(Update {
        name,
        gender,
        department,
        title,
        work_phone,
        mobile,
        wechat,
        email,
        remark,
        status,
    })
}

pub fn validate_query(raw: Option<&str>) -> Result<Query, ValidationError> {
    let object = object(raw)?;
    let mut errors = Vec::new();
    let customer_id = uuid(&object, "customerId", true, false, &mut errors);
    if !errors.is_empty() {
        return Err(failure(errors));
    }
    match customer_id {
        Field::Value(customer_id) => Ok(Query { customer_id }),
        _ => Err(ApiError::internal()),
    }
}

pub fn query_raw(query: Option<&str>) -> String {
    crate::dictionary::validation::query_raw(query)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "123e4567-e89b-42d3-a456-426614174000";

    #[test]
    fn create_keeps_the_public_gender_field_in_the_command() {
        for gender in ["female", "male", "unknown"] {
            let raw =
                format!("{{\"customerId\":\"{ID}\",\"name\":\"Contact\",\"gender\":\"{gender}\"}}");
            let input = validate_create(Some(&raw))
                .unwrap_or_else(|_| panic!("valid public contact Create"));
            assert_eq!(input.gender.as_deref(), Some(gender));
        }
        let input = validate_create(Some(&format!(
            "{{\"customerId\":\"{ID}\",\"name\":\"Contact\"}}"
        )))
        .unwrap_or_else(|_| panic!("valid contact Create without optional gender"));
        assert_eq!(input.gender, None);
    }

    #[test]
    fn create_gender_remains_nonnullable_and_enum_validated() {
        for gender in ["null", "false", "\"not-a-gender\""] {
            let raw =
                format!("{{\"customerId\":\"{ID}\",\"name\":\"Contact\",\"gender\":{gender}}}");
            assert!(validate_create(Some(&raw)).is_err());
        }
    }
}
