use std::{collections::HashMap, fmt};

use crate::compat::scalars::{NumberInput, legacy_number};

#[derive(Clone, Default)]
pub struct ProviderSettings {
    values: HashMap<String, String>,
}

impl fmt::Debug for ProviderSettings {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("ProviderSettings([redacted])")
    }
}

impl ProviderSettings {
    pub fn from_map(values: &HashMap<String, String>) -> Self {
        Self {
            values: values.clone(),
        }
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.values.get(key).map(String::as_str)
    }

    pub(super) fn values(&self) -> &HashMap<String, String> {
        &self.values
    }

    pub fn open_api_base_url(&self) -> String {
        self.get("FEISHU_OPEN_API_BASE_URL")
            .unwrap_or("https://open.feishu.cn")
            .trim_end_matches('/')
            .to_owned()
    }

    pub fn timeout_ms(&self) -> f64 {
        let configured = self
            .get("FEISHU_API_TIMEOUT_MS")
            .map_or(f64::NAN, |value| legacy_number(NumberInput::Text(value)));
        if configured.is_finite() && configured > 0.0 {
            configured
        } else {
            10_000.0
        }
    }

    pub fn department_page_size(&self) -> f64 {
        let configured = self
            .get("FEISHU_ORG_DEPARTMENT_PAGE_SIZE")
            .map_or(f64::NAN, |value| legacy_number(NumberInput::Text(value)));
        if configured.is_finite() && configured > 0.0 {
            configured.floor().min(50.0)
        } else {
            50.0
        }
    }
}
