//! Presence-aware inputs and the original customer response projections.

use crate::{auth::js_json::JsString, compat::json::Field};
use serde::{Serialize, Serializer, ser::Error};
use serde_json::value::RawValue;
use uuid::Uuid;

#[derive(Debug, Clone, Default)]
pub struct CustomerListQuery {
    pub status: Option<String>,
    pub owner_org_id: Option<String>,
    pub keyword: Option<JsString>,
}

#[derive(Debug, Clone)]
pub struct CreateCustomer {
    pub display_name: JsString,
    pub legal_name: Field<JsString>,
    pub short_name: Field<JsString>,
    pub owner_org_id: Field<String>,
    pub owner_user_id: Field<String>,
    pub source_channel: Field<JsString>,
    pub remark: Field<JsString>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateCustomer {
    pub display_name: Option<JsString>,
    pub legal_name: Field<JsString>,
    pub short_name: Field<JsString>,
    pub status: Option<String>,
    pub owner_org_id: Field<String>,
    pub owner_user_id: Field<String>,
    pub source_channel: Field<JsString>,
    pub remark: Field<JsString>,
}

#[derive(Debug, Clone)]
pub struct CreateCustomerAlias {
    pub alias_name: JsString,
    pub alias_type: Option<String>,
}

/// Project commands copy this reference at their original pretransaction point.
#[derive(Debug, Clone)]
pub struct ActiveCustomerReference {
    pub id: Uuid,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerSummary {
    pub id: String,
    pub customer_no: String,
    #[serde(serialize_with = "serialize_text")]
    pub display_name: JsString,
    #[serde(serialize_with = "serialize_optional_text")]
    pub legal_name: Option<JsString>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub short_name: Option<JsString>,
    pub status: String,
    pub owner_org_id: Option<String>,
    pub owner_user_id: Option<String>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub source_channel: Option<JsString>,
    #[serde(serialize_with = "serialize_optional_text")]
    pub remark: Option<JsString>,
    pub merged_into_customer_id: Option<String>,
    pub row_version: i32,
    pub created_at: String,
    pub created_by: Option<String>,
    pub updated_at: String,
    pub updated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerListView {
    #[serde(flatten)]
    pub customer: CustomerSummary,
    pub owner_name: Option<String>,
    pub owner_org_name: Option<String>,
    pub lead_count: i64,
    pub project_count: i64,
    pub contract_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerDetailView {
    #[serde(flatten)]
    pub customer: CustomerListView,
    pub aliases: Vec<CustomerAliasSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerAliasSummary {
    pub id: String,
    pub customer_id: String,
    #[serde(serialize_with = "serialize_text")]
    pub alias_name: JsString,
    pub alias_type: String,
    #[serde(serialize_with = "serialize_text")]
    pub normalized_name: JsString,
    pub is_primary: bool,
    pub created_at: String,
    pub created_by: Option<String>,
}

pub(crate) fn text(value: &str) -> JsString {
    JsString::from_code_units(value.encode_utf16().collect())
}

fn serialize_text<S: Serializer>(value: &JsString, serializer: S) -> Result<S::Ok, S::Error> {
    if let Ok(text) = String::from_utf16(value.as_code_units()) {
        return serializer.serialize_str(&text);
    }
    // JSON.stringify emits valid Unicode literally and only escapes isolated
    // UTF-16 surrogates. Preserve that byte length for implicit HEAD as well.
    let mut raw = String::from("\"");
    let mut chunk = String::new();
    let flush = |chunk: &mut String, raw: &mut String| -> Result<(), S::Error> {
        let encoded = serde_json::to_string(chunk).map_err(S::Error::custom)?;
        raw.push_str(&encoded[1..encoded.len() - 1]);
        chunk.clear();
        Ok(())
    };
    for unit in char::decode_utf16(value.as_code_units().iter().copied()) {
        match unit {
            Ok(character) => chunk.push(character),
            Err(error) => {
                flush(&mut chunk, &mut raw)?;
                use std::fmt::Write;
                write!(raw, "\\u{:04x}", error.unpaired_surrogate()).map_err(S::Error::custom)?;
            }
        }
    }
    flush(&mut chunk, &mut raw)?;
    raw.push('"');
    RawValue::from_string(raw)
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn summary_retains_nullable_members_and_original_isolated_surrogate() {
        let value = CustomerSummary {
            id: "00000000-0000-4000-8000-000000000001".into(),
            customer_no: "CUST-2026-000001".into(),
            display_name: JsString::from_code_units(vec![0xd800]),
            legal_name: None,
            short_name: None,
            status: "active".into(),
            owner_org_id: None,
            owner_user_id: None,
            source_channel: None,
            remark: None,
            merged_into_customer_id: None,
            row_version: 1,
            created_at: "2026-11-01T00:00:00.000Z".into(),
            created_by: None,
            updated_at: "2026-11-01T00:00:00.000Z".into(),
            updated_by: None,
        };
        let raw = serde_json::to_string(&value).unwrap_or_else(|_| panic!("customer summary"));
        assert!(raw.contains(r#""displayName":"\ud800""#));
        assert!(raw.contains(r#""legalName":null"#));
        assert!(raw.contains(r#""ownerOrgId":null"#));
        assert!(!raw.contains("aliases"));
    }
}
