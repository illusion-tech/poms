use serde::Serialize;
#[derive(Clone, Debug)]
pub struct UpdateSystemSetting {
    pub value: i64,
    pub expected_version: Option<i64>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSettingSummary {
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub group: String,
    pub value_type: String,
    pub value: i64,
    pub default_value: i64,
    pub min_value: Option<i64>,
    pub max_value: Option<i64>,
    pub unit: Option<String>,
    pub row_version: i32,
    pub updated_at: Option<String>,
    pub updated_by: Option<String>,
}
