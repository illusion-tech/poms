use crate::auth::js_json::{JsObject, JsString, decode_string};
use serde_json::{Value, value::RawValue};

/// Source-schema ordered, stripped request JSON; strings retain original UTF-16.
#[derive(Clone)]
pub struct RequestData {
    pub raw: String,
}
impl RequestData {
    pub fn has(&self, key: &str) -> bool {
        self.object().get(key).is_some()
    }
    pub fn object(&self) -> JsObject<'_> {
        JsObject::parse(&self.raw).unwrap_or_else(|_| panic!("validated object"))
    }
    pub fn text(&self, key: &str) -> Option<String> {
        self.string(key).map(|s| s.to_utf8_lossy())
    }
    pub fn string(&self, key: &str) -> Option<JsString> {
        self.object()
            .get(key)
            .and_then(|v| decode_string(v.get()).ok())
    }
    pub fn boolean(&self, key: &str) -> Option<bool> {
        self.object()
            .get(key)
            .and_then(|v| serde_json::from_str(v.get()).ok())
    }
    pub fn number(&self, key: &str) -> Option<f64> {
        self.object().get(key).and_then(|v| v.get().parse().ok())
    }
    pub fn strings(&self, key: &str) -> Vec<String> {
        self.object()
            .get(key)
            .and_then(|v| serde_json::from_str::<Vec<&RawValue>>(v.get()).ok())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| decode_string(v.get()).ok())
            .map(|v| v.to_utf8_lossy())
            .collect()
    }
    pub fn value(&self, key: &str) -> Option<Value> {
        self.object().get(key).and_then(node_value)
    }
    pub fn js_strings(&self, key: &str) -> Vec<JsString> {
        self.object()
            .get(key)
            .and_then(|v| serde_json::from_str::<Vec<&RawValue>>(v.get()).ok())
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| decode_string(v.get()).ok())
            .collect()
    }
}
impl std::fmt::Debug for RequestData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("RequestData([redacted])")
    }
}
fn node_value(raw: &RawValue) -> Option<Value> {
    match raw.get().as_bytes().first() {
        Some(b'"') => decode_string(raw.get())
            .ok()
            .map(|v| Value::String(v.to_utf8_lossy())),
        Some(b'[') => serde_json::from_str::<Vec<&RawValue>>(raw.get())
            .ok()?
            .into_iter()
            .map(node_value)
            .collect::<Option<Vec<_>>>()
            .map(Value::Array),
        _ => serde_json::from_str(raw.get()).ok(),
    }
}
