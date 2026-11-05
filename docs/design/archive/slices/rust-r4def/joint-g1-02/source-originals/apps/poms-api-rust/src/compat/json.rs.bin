//! JSON presence and object-key mechanics, not a second DTO/schema authority.
//!
//! Callers obtain known fields, requiredness, defaults and key policy from the
//! source Zod contract. These helpers do not infer business validation rules.

use std::{error::Error, fmt};

use serde_json::{Map, Value};

/// Missing object membership is different from a present JSON null. There is
/// deliberately no blanket Serde implementation that could erase this state.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum Field<T> {
    #[default]
    Missing,
    Null,
    Value(T),
}

impl<T> Field<T> {
    pub fn as_ref(&self) -> Field<&T> {
        match self {
            Self::Missing => Field::Missing,
            Self::Null => Field::Null,
            Self::Value(value) => Field::Value(value),
        }
    }

    pub const fn is_missing(&self) -> bool {
        matches!(self, Self::Missing)
    }

    pub const fn is_null(&self) -> bool {
        matches!(self, Self::Null)
    }

    pub fn map<U>(self, transform: impl FnOnce(T) -> U) -> Field<U> {
        match self {
            Self::Missing => Field::Missing,
            Self::Null => Field::Null,
            Self::Value(value) => Field::Value(transform(value)),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsonCompatError {
    ExpectedObject,
    MissingRequired,
    NullNotAllowed,
    UnknownKeys,
}

impl fmt::Display for JsonCompatError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::ExpectedObject => "JSON value must be an object",
            Self::MissingRequired => "required JSON field is missing",
            Self::NullNotAllowed => "JSON field must not be null",
            Self::UnknownKeys => "JSON object has unknown fields",
        })
    }
}

impl Error for JsonCompatError {}

pub fn object_field<'a>(object: &'a Map<String, Value>, name: &str) -> Field<&'a Value> {
    match object.get(name) {
        None => Field::Missing,
        Some(Value::Null) => Field::Null,
        Some(value) => Field::Value(value),
    }
}

pub fn required<T>(field: Field<T>) -> Result<T, JsonCompatError> {
    match field {
        Field::Missing => Err(JsonCompatError::MissingRequired),
        Field::Null => Err(JsonCompatError::NullNotAllowed),
        Field::Value(value) => Ok(value),
    }
}

pub fn required_nullable<T>(field: Field<T>) -> Result<Option<T>, JsonCompatError> {
    match field {
        Field::Missing => Err(JsonCompatError::MissingRequired),
        Field::Null => Ok(None),
        Field::Value(value) => Ok(Some(value)),
    }
}

/// Requiredness/nullability are supplied by the source schema descriptor. This
/// validates presence only, not the value's scalar or business constraints.
pub fn validate_presence<T>(
    field: Field<T>,
    is_required: bool,
    is_nullable: bool,
) -> Result<Field<T>, JsonCompatError> {
    match field {
        Field::Missing if is_required => Err(JsonCompatError::MissingRequired),
        Field::Null if !is_nullable => Err(JsonCompatError::NullNotAllowed),
        present => Ok(present),
    }
}

/// Zod defaults apply to undefined/missing input, not to explicit JSON null.
pub fn with_default<T>(field: Field<T>, default: impl FnOnce() -> T) -> Field<T> {
    match field {
        Field::Missing => Field::Value(default()),
        present => present,
    }
}

/// Serialize a member into an object: Missing omits/removes the member. This is
/// an output-construction helper, not a PATCH merge or a persistence operation.
pub fn write_field(object: &mut Map<String, Value>, name: &str, field: Field<Value>) {
    match field {
        Field::Missing => {
            object.remove(name);
        }
        Field::Null => {
            object.insert(name.to_owned(), Value::Null);
        }
        Field::Value(value) => {
            object.insert(name.to_owned(), value);
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnknownKeyPolicy {
    Strip,
    Reject,
    Preserve,
}

/// Apply one object's key policy. Nested objects are untouched: their own
/// source schemas decide their policies. Known values are never coerced here.
pub fn apply_unknown_keys(
    input: &Value,
    known_fields: &[&str],
    policy: UnknownKeyPolicy,
) -> Result<Value, JsonCompatError> {
    let object = input.as_object().ok_or(JsonCompatError::ExpectedObject)?;
    if policy == UnknownKeyPolicy::Reject
        && object
            .keys()
            .any(|key| !known_fields.contains(&key.as_str()))
    {
        return Err(JsonCompatError::UnknownKeys);
    }
    if policy == UnknownKeyPolicy::Strip {
        Ok(Value::Object(
            object
                .iter()
                .filter(|(key, _)| known_fields.contains(&key.as_str()))
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
        ))
    } else {
        Ok(input.clone())
    }
}
