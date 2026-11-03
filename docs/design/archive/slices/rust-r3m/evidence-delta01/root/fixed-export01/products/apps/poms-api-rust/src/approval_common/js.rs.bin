//! JS strings and missing/null fields at internal service boundaries. In
//! particular, serde's String must not replace lone UTF-16 surrogates early.

use crate::auth::js_json::{JsString, decode_string};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use std::{fmt, ops::Deref};

#[derive(Clone, PartialEq, Eq)]
pub struct Text(JsString);

impl Text {
    pub fn from_code_units(units: Vec<u16>) -> Self {
        Self(JsString::from_code_units(units))
    }

    pub fn from_js(value: JsString) -> Self {
        Self(value)
    }

    pub fn into_js(self) -> JsString {
        self.0
    }

    pub fn is_truthy(&self) -> bool {
        !self.0.is_empty()
    }

    pub fn concat(&self, suffix: &Self) -> Self {
        let mut units = self.as_code_units().to_vec();
        units.extend_from_slice(suffix.as_code_units());
        Self::from_code_units(units)
    }
}

impl From<&str> for Text {
    fn from(value: &str) -> Self {
        Self::from_code_units(value.encode_utf16().collect())
    }
}

impl From<String> for Text {
    fn from(value: String) -> Self {
        Self::from(value.as_str())
    }
}

impl Deref for Text {
    type Target = JsString;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl fmt::Debug for Text {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Text([redacted])")
    }
}

impl Serialize for Text {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        RawValue::from_string(self.json())
            .map_err(serde::ser::Error::custom)?
            .serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Text {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(deserializer)?;
        decode_string(raw.get())
            .map(Self)
            .map_err(|_| serde::de::Error::custom("expected a JS string"))
    }
}

/// Use `#[serde(default, skip_serializing_if = "JsField::is_undefined")]`
/// on optional object properties. Missing and explicit null are distinct.
#[derive(Clone, Debug, Default, PartialEq)]
pub enum JsField<T> {
    #[default]
    Undefined,
    Null,
    Value(T),
}

impl<T> JsField<T> {
    pub fn is_undefined(&self) -> bool {
        matches!(self, Self::Undefined)
    }

    pub fn as_value(&self) -> Option<&T> {
        match self {
            Self::Value(value) => Some(value),
            Self::Undefined | Self::Null => None,
        }
    }

    pub fn into_nullish_option(self) -> Option<T> {
        match self {
            Self::Value(value) => Some(value),
            Self::Undefined | Self::Null => None,
        }
    }

    pub fn as_ref(&self) -> JsField<&T> {
        match self {
            Self::Undefined => JsField::Undefined,
            Self::Null => JsField::Null,
            Self::Value(value) => JsField::Value(value),
        }
    }
}

impl<T: Serialize> Serialize for JsField<T> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Undefined | Self::Null => serializer.serialize_none(),
            Self::Value(value) => value.serialize(serializer),
        }
    }
}

impl<'de, T: Deserialize<'de>> Deserialize<'de> for JsField<T> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Option::<T>::deserialize(deserializer).map(|value| match value {
            Some(value) => Self::Value(value),
            None => Self::Null,
        })
    }
}

/// The original `comment ? reason + '\n' + comment : reason` expression.
pub fn reason_and_comment(reason: &Text, comment: &JsField<Text>) -> Text {
    match comment {
        JsField::Value(comment) if comment.is_truthy() => {
            reason.concat(&Text::from("\n")).concat(comment)
        }
        _ => reason.clone(),
    }
}

/// Owned JS values used by the seven-table identity map and probe transport.
/// Dates are explicit values; ordinary string inputs are never auto-converted.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Undefined,
    Null,
    Bool(bool),
    Number(f64),
    Text(Text),
    Date(Option<super::model::Timestamp>),
    Array(Vec<Value>),
    Object(Data),
}

pub type Data = BTreeMap<String, Value>;

impl Value {
    pub fn parse(raw: &str) -> Result<Self, super::CommonFailure> {
        let raw: Box<RawValue> = serde_json::from_str(raw)
            .map_err(|_| super::CommonFailure::unexpected("Invalid internal JSON"))?;
        Self::from_raw(&raw)
    }

    fn from_raw(raw: &RawValue) -> Result<Self, super::CommonFailure> {
        let invalid = || super::CommonFailure::unexpected("Invalid internal JSON value");
        Ok(match raw.get().as_bytes().first() {
            Some(b'"') => Self::Text(serde_json::from_str(raw.get()).map_err(|_| invalid())?),
            Some(b'{') => {
                let object =
                    crate::auth::js_json::JsObject::parse(raw.get()).map_err(|_| invalid())?;
                let mut entries = Data::new();
                for (key, value) in object.entries() {
                    entries.insert(key.to_utf8_lossy(), Self::from_raw(value)?);
                }
                Self::Object(entries)
            }
            Some(b'[') => {
                let entries: Vec<&RawValue> =
                    serde_json::from_str(raw.get()).map_err(|_| invalid())?;
                Self::Array(
                    entries
                        .into_iter()
                        .map(Self::from_raw)
                        .collect::<Result<_, _>>()?,
                )
            }
            Some(b'n') => Self::Null,
            Some(b't') => Self::Bool(true),
            Some(b'f') => Self::Bool(false),
            _ => Self::Number(serde_json::from_str(raw.get()).map_err(|_| invalid())?),
        })
    }

    pub fn text(value: impl Into<Text>) -> Self {
        Self::Text(value.into())
    }
    pub fn as_text(&self) -> Option<&Text> {
        if let Self::Text(value) = self {
            Some(value)
        } else {
            None
        }
    }
    pub fn as_number(&self) -> Option<f64> {
        if let Self::Number(value) = self {
            Some(*value)
        } else {
            None
        }
    }
    pub fn nullish(&self) -> bool {
        matches!(self, Self::Undefined | Self::Null)
    }
    pub fn truthy(&self) -> bool {
        match self {
            Self::Undefined | Self::Null => false,
            Self::Bool(value) => *value,
            Self::Number(value) => *value != 0.0 && !value.is_nan(),
            Self::Text(value) => value.is_truthy(),
            _ => true,
        }
    }
    pub fn js_text(&self) -> Text {
        match self {
            Self::Undefined => Text::from("undefined"),
            Self::Null => Text::from("null"),
            Self::Text(value) => value.clone(),
            Self::Bool(value) => Text::from(if *value { "true" } else { "false" }),
            Self::Number(value) => Text::from(ryu_js::Buffer::new().format(*value)),
            _ => Text::from("[object Object]"),
        }
    }

    pub fn json(&self) -> String {
        match self {
            Self::Undefined | Self::Null | Self::Date(None) => "null".into(),
            Self::Bool(value) => value.to_string(),
            Self::Number(value) if value.is_finite() => ryu_js::Buffer::new().format(*value).into(),
            Self::Number(_) => "null".into(),
            Self::Text(value) => value.json(),
            Self::Date(Some(value)) => {
                serde_json::to_string(value).unwrap_or_else(|_| "null".into())
            }
            Self::Array(values) => format!(
                "[{}]",
                values.iter().map(Self::json).collect::<Vec<_>>().join(",")
            ),
            Self::Object(values) => format!(
                "{{{}}}",
                values
                    .iter()
                    .filter(|(_, value)| !matches!(value, Self::Undefined))
                    .map(|(key, value)| format!(
                        "{}:{}",
                        Text::from(key.as_str()).json(),
                        value.json()
                    ))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
        }
    }
}

impl Serialize for Value {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        RawValue::from_string(self.json())
            .map_err(serde::ser::Error::custom)?
            .serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Value {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(deserializer)?;
        Self::from_raw(&raw).map_err(serde::de::Error::custom)
    }
}

pub fn get<'a>(data: &'a Data, name: &str) -> &'a Value {
    data.get(name).unwrap_or(&Value::Undefined)
}

pub fn decode<T: serde::de::DeserializeOwned>(value: &Value) -> Result<T, super::CommonFailure> {
    serde_json::from_str(&value.json())
        .map_err(|_| super::CommonFailure::unexpected("Invalid internal service input"))
}

#[cfg(test)]
mod tests {
    use super::{JsField, Text, reason_and_comment};
    use serde::{Deserialize, Serialize};

    #[derive(Deserialize, Serialize)]
    struct OptionalText {
        #[serde(default, skip_serializing_if = "JsField::is_undefined")]
        value: JsField<Text>,
    }

    #[test]
    fn serialization_preserves_lone_surrogates_until_the_pg_boundary() {
        let text: Text = serde_json::from_str(r#""\ud800x\udfff""#)
            .unwrap_or_else(|_| panic!("valid JS string"));
        assert_eq!(text.as_code_units(), &[0xd800, 0x78, 0xdfff]);
        assert_eq!(
            serde_json::to_string(&text).unwrap_or_else(|_| panic!("JS JSON")),
            r#""\ud800x\udfff""#
        );
        assert_eq!(text.to_utf8_lossy(), "\u{fffd}x\u{fffd}");
    }

    #[test]
    fn omission_null_and_empty_text_are_three_different_values() {
        for (input, field) in [
            ("{}", JsField::Undefined),
            (r#"{"value":null}"#, JsField::Null),
            (r#"{"value":""}"#, JsField::Value(Text::from(""))),
        ] {
            let parsed: OptionalText =
                serde_json::from_str(input).unwrap_or_else(|_| panic!("optional text"));
            assert_eq!(parsed.value, field);
            assert_eq!(
                serde_json::to_string(&parsed).unwrap_or_else(|_| panic!("round trip")),
                input
            );
        }
    }

    #[test]
    fn reason_join_uses_truthiness_and_keeps_raw_units() {
        let reason = Text::from_code_units(vec![0xd800]);
        assert_eq!(
            reason_and_comment(&reason, &JsField::Value(Text::from(""))),
            reason
        );
        assert_eq!(
            reason_and_comment(&reason, &JsField::Value(Text::from(" "))).as_code_units(),
            &[0xd800, 0x0a, 0x20]
        );
    }
}
