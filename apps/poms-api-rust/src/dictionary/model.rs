use crate::{auth::js_json::JsString, compat::json::Field};
use serde::{Serialize, Serializer, ser::Error};
use serde_json::value::RawValue;

#[derive(Clone, Debug, Default)]
pub struct DictionaryQuery {
    pub domain: Option<String>,
    pub status: Option<String>,
    pub keyword: Option<JsString>,
}
#[derive(Clone, Debug)]
pub struct CreateDictionaryItem {
    pub domain: String,
    pub code: JsString,
    pub name: JsString,
    pub description: Field<JsString>,
    pub sort_order: Option<i64>,
}
#[derive(Clone, Debug, Default)]
pub struct UpdateDictionaryItem {
    pub name: Option<JsString>,
    pub description: Field<JsString>,
    pub status: Option<String>,
    pub sort_order: Option<i64>,
    pub expected_version: Option<i64>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictionaryItemSummary {
    pub id: String,
    pub domain: String,
    #[serde(serialize_with = "serialize_text")]
    pub code: JsString,
    #[serde(serialize_with = "serialize_text")]
    pub name: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub description: Option<JsString>,
    pub status: String,
    pub sort_order: i64,
    pub is_system: bool,
    pub usage_count: i64,
    pub row_version: i32,
    pub created_at: String,
    pub created_by: Option<String>,
    pub updated_at: String,
    pub updated_by: Option<String>,
}
pub fn js_string(value: &str) -> JsString {
    JsString::from_code_units(value.encode_utf16().collect())
}
fn serialize_text<S: Serializer>(value: &JsString, serializer: S) -> Result<S::Ok, S::Error> {
    RawValue::from_string(value.json())
        .map_err(S::Error::custom)?
        .serialize(serializer)
}
fn serialize_optional_text<S: Serializer>(
    value: &Option<JsString>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    match value {
        Some(value) => serialize_text(value, serializer),
        None => serializer.serialize_none(),
    }
}
