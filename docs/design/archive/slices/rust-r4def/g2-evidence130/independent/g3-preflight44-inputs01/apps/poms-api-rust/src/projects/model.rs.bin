use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::{
    auth::js_json::JsString,
    compat::json::Field,
    shared::generated::{ProjectStage, ProjectStatus},
};

#[derive(Clone)]
pub struct CreateProject {
    pub project_name: JsString,
    pub customer_id: String,
    pub customer_project_no: Field<JsString>,
    pub current_stage: Option<ProjectStage>,
    pub planned_sign_at: Field<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct UpdateProject {
    pub project_name: Option<JsString>,
    pub customer_id: Option<String>,
    pub customer_project_no: Field<JsString>,
    pub planned_sign_at: Field<DateTime<Utc>>,
}

#[derive(Clone)]
pub struct ReassignProjectOwner {
    pub owner_user_id: String,
    pub owner_org_id: Field<String>,
    pub reason: JsString,
    pub expected_version: Option<i64>,
}

#[derive(Clone, Default)]
pub struct ProjectListQuery {
    pub status: Option<ProjectStatus>,
    pub current_stage: Option<ProjectStage>,
    pub owner_org_id: Option<String>,
    pub keyword: Option<JsString>,
}

/// The newly managed text can contain original lone UTF-16 code units. Node pg
/// replaces these only at the DB boundary; the same request's result retains
/// them until a later repository read. This is not a second public DTO.
#[derive(Clone)]
pub struct Wire(pub String);

impl Wire {
    pub fn value(value: Value) -> Self {
        Self(value.to_string())
    }

    pub fn object(value: Value, original_text: &BTreeMap<String, JsString>) -> Self {
        Self(format!(
            "{{{}}}",
            value
                .as_object()
                .into_iter()
                .flatten()
                .map(|(key, value)| format!(
                    "{}:{}",
                    js(key).json(),
                    original_text
                        .get(key)
                        .map_or_else(|| value.to_string(), JsString::json)
                ))
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
}

pub fn js(value: &str) -> JsString {
    JsString::from_code_units(value.encode_utf16().collect())
}

pub fn trim_js(value: JsString) -> JsString {
    let space = |unit: &u16| matches!(*unit, 0x0009..=0x000d | 0x0020 | 0x00a0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff);
    let units = value.as_code_units();
    let start = units
        .iter()
        .position(|unit| !space(unit))
        .unwrap_or(units.len());
    let end = units
        .iter()
        .rposition(|unit| !space(unit))
        .map_or(start, |index| index + 1);
    JsString::from_code_units(units[start..end].to_vec())
}
