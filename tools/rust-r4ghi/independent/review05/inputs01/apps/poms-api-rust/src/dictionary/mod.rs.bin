//! Existing configurable dictionaries. Original TypeScript owns the contract.
pub mod http;
pub mod model;
pub mod service;
pub mod store;
pub mod validation;
pub use service::{DictionaryError, DictionaryService};

use serde::Deserialize;
use std::sync::OnceLock;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Authority {
    dictionary_domains: Vec<String>,
    statuses: Vec<String>,
}
fn authority() -> &'static Authority {
    static AUTHORITY: OnceLock<Authority> = OnceLock::new();
    AUTHORITY.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../tools/rust-r2ef/e-authority.json"))
            .unwrap_or_else(|_| panic!("invalid generated E authority"))
    })
}
pub fn domains() -> &'static [String] {
    &authority().dictionary_domains
}
pub fn statuses() -> &'static [String] {
    &authority().statuses
}
