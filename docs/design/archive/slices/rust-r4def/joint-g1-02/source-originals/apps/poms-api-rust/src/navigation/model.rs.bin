use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::shared::generated::{NavigationItemType, PermissionKey};

/// The existing NavigationItem schema has thirteen required fields. Optional
/// Rust values deliberately serialize as null; None is never omitted.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationItem {
    pub id: String,
    pub key: String,
    #[serde(rename = "type")]
    pub item_type: NavigationItemType,
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub link: Option<String>,
    pub icon: Option<String>,
    pub display_order: i64,
    pub is_hidden: bool,
    pub is_disabled: bool,
    pub required_permissions: Option<Vec<PermissionKey>>,
    pub meta: Option<Map<String, Value>>,
    pub children: Option<Vec<Self>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationSyncSummary {
    pub target_id: String,
    pub node_count: usize,
    pub route_count: usize,
    pub hidden_count: usize,
    pub disabled_count: usize,
    pub tree_checksum: String,
    pub navigation_keys: Vec<String>,
    pub route_links: Vec<String>,
}
