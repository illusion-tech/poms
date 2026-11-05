//! Existing registered settings, not an arbitrary key/value API.
pub mod http;
pub mod model;
pub mod service;
pub mod store;
pub mod validation;
pub use service::{SystemSettingsError, SystemSettingsService};

use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingDefinition {
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub group: String,
    pub value_type: String,
    pub default_value: i64,
    pub min_value: i64,
    pub max_value: i64,
    pub unit: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Authority {
    settings: Vec<SettingDefinition>,
    bytes_per_mb: i64,
}
fn authority() -> &'static Authority {
    static AUTHORITY: OnceLock<Authority> = OnceLock::new();
    AUTHORITY.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../tools/rust-r2ef/e-authority.json"))
            .unwrap_or_else(|_| panic!("invalid generated settings authority"))
    })
}
pub fn definitions() -> &'static [SettingDefinition] {
    &authority().settings
}
pub fn bytes_per_mb() -> i64 {
    authority().bytes_per_mb
}
