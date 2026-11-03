use crate::auth::js_json::{JsObject, JsString, decode_string};
use serde_json::{Value, value::RawValue};

#[derive(Clone)]
pub struct RequestData {
    pub raw: String,
}
impl RequestData {
    pub fn object(&self) -> JsObject<'_> {
        JsObject::parse(&self.raw).unwrap_or_else(|_| panic!("validated attachment object"))
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
    pub fn number(&self, key: &str) -> Option<f64> {
        self.object().get(key).and_then(|v| v.get().parse().ok())
    }
    pub fn boolean(&self, key: &str) -> Option<bool> {
        self.object().get(key).and_then(|v| match v.get() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        })
    }
    pub fn array(&self, key: &str) -> Option<Vec<&RawValue>> {
        self.object()
            .get(key)
            .and_then(|v| serde_json::from_str(v.get()).ok())
    }
}
impl std::fmt::Debug for RequestData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("AttachmentRequest([redacted])")
    }
}

/// Already encoded JSON preserves original lone UTF-16 units until the DB boundary.
#[derive(Clone)]
pub struct Wire(pub String);
impl Wire {
    pub fn value(value: Value) -> Self {
        Self(value.to_string())
    }
    pub fn array(values: Vec<Self>) -> Self {
        Self(format!(
            "[{}]",
            values
                .into_iter()
                .map(|v| v.0)
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
    pub fn object(value: Value, raw: &std::collections::BTreeMap<String, JsString>) -> Self {
        Self(format!(
            "{{{}}}",
            value
                .as_object()
                .into_iter()
                .flatten()
                .map(|(key, value)| format!(
                    "{}:{}",
                    serde_json::to_string(key).unwrap_or_default(),
                    raw.get(key)
                        .map(JsString::json)
                        .unwrap_or_else(|| value.to_string())
                ))
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
    pub fn parsed(&self) -> Option<Value> {
        serde_json::from_str(&self.0).ok()
    }
    pub fn nested(mut value: Value, key: &str, wire: Self) -> Self {
        if let Some(object) = value.as_object_mut() {
            object.remove(key);
        }
        let head = value.to_string();
        let head = head.strip_suffix('}').unwrap_or("{");
        Self(format!(
            "{head}{}{}:{}}}",
            if head == "{" { "" } else { "," },
            serde_json::to_string(key).unwrap_or_default(),
            wire.0
        ))
    }
    /// JSON.stringify object insertion order is part of the ZIP manifest bytes.
    pub fn ordered<'a>(fields: impl IntoIterator<Item = (&'a str, Self)>) -> Self {
        Self(format!(
            "{{{}}}",
            fields
                .into_iter()
                .map(|(key, value)| format!("{}:{}", json_key(key), value.0))
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
}
fn json_key(key: &str) -> String {
    js(key).json()
}
pub fn js(value: &str) -> JsString {
    JsString::from_code_units(value.encode_utf16().collect())
}
pub fn trim_js(value: JsString) -> JsString {
    fn space(v: u16) -> bool {
        matches!(v,0x0009..=0x000d|0x0020|0x00a0|0x1680|0x2000..=0x200a|0x2028|0x2029|0x202f|0x205f|0x3000|0xfeff)
    }
    let units = value.as_code_units();
    let start = units.iter().position(|v| !space(*v)).unwrap_or(units.len());
    let end = units
        .iter()
        .rposition(|v| !space(*v))
        .map_or(start, |v| v + 1);
    JsString::from_code_units(units[start..end].to_vec())
}
pub fn decoded(raw: &str) -> Option<JsString> {
    let raw: &RawValue = serde_json::from_str(raw).ok()?;
    decode_string(raw.get()).ok()
}
