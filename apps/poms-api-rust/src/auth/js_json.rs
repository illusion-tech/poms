//! JSON strings retain JavaScript UTF-16 code units, including lone surrogates.
//! RawValue validates syntax while skipping strings without Unicode scalar
//! conversion. Only selected DTO fields are decoded; unknown fields can strip.

use std::{fmt, str::FromStr};

use serde::{
    Deserialize, Deserializer,
    de::{MapAccess, Visitor},
};
use serde_json::value::RawValue;

#[derive(Clone, PartialEq, Eq)]
pub struct JsString(Vec<u16>);

impl fmt::Debug for JsString {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("JsString([redacted])")
    }
}

impl JsString {
    pub fn from_code_units(units: Vec<u16>) -> Self {
        Self(units)
    }
    pub fn as_code_units(&self) -> &[u16] {
        &self.0
    }
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
    pub fn eq_ascii(&self, value: &str) -> bool {
        value.is_ascii() && self.0.iter().copied().eq(value.bytes().map(u16::from))
    }
    /// Node's pg/Buffer UTF-8 encoding replaces isolated UTF-16 surrogates.
    /// Password bcrypt encoding is different and consumes as_code_units().
    pub fn to_utf8_lossy(&self) -> String {
        String::from_utf16_lossy(&self.0)
    }
    pub fn json(&self) -> String {
        let mut output = String::from("\"");
        for unit in &self.0 {
            match *unit {
                0x22 => output.push_str("\\\""),
                0x5c => output.push_str("\\\\"),
                0x08 => output.push_str("\\b"),
                0x0c => output.push_str("\\f"),
                0x0a => output.push_str("\\n"),
                0x0d => output.push_str("\\r"),
                0x09 => output.push_str("\\t"),
                0x20..=0x7e => output.push(char::from(*unit as u8)),
                _ => {
                    use std::fmt::Write;
                    let _ = write!(output, "\\u{unit:04x}");
                }
            }
        }
        output.push('"');
        output
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsonInputError {
    Syntax,
    ExpectedObject,
    ExpectedString,
}

impl FromStr for JsString {
    type Err = JsonInputError;
    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        let raw: &RawValue = serde_json::from_str(raw).map_err(|_| JsonInputError::Syntax)?;
        decode_string(raw.get())
    }
}

pub fn decode_string(raw: &str) -> Result<JsString, JsonInputError> {
    let Some(text) = raw
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
    else {
        return Err(JsonInputError::ExpectedString);
    };
    let mut result = Vec::new();
    let mut chars = text.chars();
    while let Some(character) = chars.next() {
        if character != '\\' {
            let mut units = [0_u16; 2];
            result.extend_from_slice(character.encode_utf16(&mut units));
            continue;
        }
        let escape = chars.next().ok_or(JsonInputError::Syntax)?;
        let unit = match escape {
            '"' => 0x22,
            '\\' => 0x5c,
            '/' => 0x2f,
            'b' => 0x08,
            'f' => 0x0c,
            'n' => 0x0a,
            'r' => 0x0d,
            't' => 0x09,
            'u' => {
                let mut unit = 0_u16;
                for _ in 0..4 {
                    unit = (unit << 4)
                        | chars
                            .next()
                            .and_then(|character| character.to_digit(16))
                            .ok_or(JsonInputError::Syntax)? as u16;
                }
                unit
            }
            _ => return Err(JsonInputError::Syntax),
        };
        result.push(unit);
    }
    Ok(JsString(result))
}

pub struct JsObject<'a> {
    members: Vec<(JsString, &'a RawValue)>,
}

impl<'a> JsObject<'a> {
    pub fn entries(&self) -> impl Iterator<Item = (&JsString, &'a RawValue)> {
        self.members.iter().map(|(key, value)| (key, *value))
    }
    pub fn parse(raw: &'a str) -> Result<Self, JsonInputError> {
        let value: &RawValue = serde_json::from_str(raw).map_err(|_| JsonInputError::Syntax)?;
        if !value.get().starts_with('{') {
            return Err(JsonInputError::ExpectedObject);
        }
        serde_json::from_str(raw).map_err(|_| JsonInputError::Syntax)
    }
    pub fn get(&self, name: &str) -> Option<&'a RawValue> {
        self.members
            .iter()
            .find(|(key, _)| key.eq_ascii(name))
            .map(|(_, value)| *value)
    }
    pub fn keys(&self) -> Vec<&JsString> {
        // JS Object.keys orders array-index keys first, then insertion order.
        let mut indexed = Vec::new();
        let mut others = Vec::new();
        for (key, _) in &self.members {
            let text = key.to_utf8_lossy();
            if let Ok(index) = text.parse::<u32>()
                && index != u32::MAX
                && index.to_string() == text
            {
                indexed.push((index, key));
                continue;
            }
            others.push(key);
        }
        indexed.sort_by_key(|(index, _)| *index);
        indexed
            .into_iter()
            .map(|(_, key)| key)
            .chain(others)
            .collect()
    }
}

impl<'de> Deserialize<'de> for JsObject<'de> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct ObjectVisitor;
        impl<'de> Visitor<'de> for ObjectVisitor {
            type Value = JsObject<'de>;
            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a JavaScript JSON object")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let mut members: Vec<(JsString, &'de RawValue)> = Vec::new();
                while let Some((key, value)) = map.next_entry::<&'de RawValue, &'de RawValue>()? {
                    let key = decode_string(key.get())
                        .map_err(|_| serde::de::Error::custom("invalid JSON key"))?;
                    if let Some((_, old_value)) =
                        members.iter_mut().find(|(old_key, _)| *old_key == key)
                    {
                        *old_value = value;
                    } else {
                        members.push((key, value));
                    }
                }
                Ok(JsObject { members })
            }
        }
        deserializer.deserialize_map(ObjectVisitor)
    }
}
