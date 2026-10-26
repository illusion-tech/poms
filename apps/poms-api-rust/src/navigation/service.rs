use std::{fmt::Write as _, sync::OnceLock};

use serde::Serialize;
use sha2::{Digest, Sha256};

use super::{NavigationItem, NavigationSyncSummary};
use crate::{compat::permissions::RawPermission, shared::generated::NavigationItemType};

static NAVIGATION: OnceLock<Vec<NavigationItem>> = OnceLock::new();

pub fn all_navigation() -> &'static [NavigationItem] {
    NAVIGATION.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../tools/rust-r2a/navigation-tree.json"
        ))
        .unwrap_or_else(|_| panic!("invalid generated navigation authority"))
    })
}

pub fn navigation_for_user(permissions: &[RawPermission]) -> Vec<NavigationItem> {
    filter_navigation(all_navigation(), permissions)
}

/// Mirrors the original service's branch order, including the distinction
/// between original empty children and nonempty children filtered to empty.
pub fn filter_navigation(
    items: &[NavigationItem],
    permissions: &[RawPermission],
) -> Vec<NavigationItem> {
    let mut result = Vec::new();
    for item in items {
        if item.is_hidden {
            continue;
        }
        if item.required_permissions.as_ref().is_some_and(|required| {
            required.iter().any(|permission| {
                !permissions
                    .iter()
                    .any(|value| value.as_str() == permission.as_str())
            })
        }) {
            continue;
        }
        let mut filtered = item.clone();
        if let Some(children) = item
            .children
            .as_ref()
            .filter(|children| !children.is_empty())
        {
            let visible = filter_navigation(children, permissions);
            if visible.is_empty()
                && matches!(
                    item.item_type,
                    NavigationItemType::Group | NavigationItemType::Collapsable
                )
            {
                continue;
            }
            filtered.children = (!visible.is_empty()).then_some(visible);
        }
        result.push(filtered);
    }
    // This stable sort intentionally has no secondary id/key tie-breaker.
    result.sort_by_key(|item| item.display_order);
    result
}

pub fn navigation_snapshot() -> Result<NavigationSyncSummary, serde_json::Error> {
    snapshot_for_tree(all_navigation())
}

pub fn snapshot_for_tree(
    items: &[NavigationItem],
) -> Result<NavigationSyncSummary, serde_json::Error> {
    fn flatten<'a>(items: &'a [NavigationItem], result: &mut Vec<&'a NavigationItem>) {
        for item in items {
            result.push(item);
            if let Some(children) = &item.children {
                flatten(children, result);
            }
        }
    }
    let mut flattened = Vec::new();
    flatten(items, &mut flattened);
    let navigation_keys = flattened
        .iter()
        .map(|item| item.key.clone())
        .collect::<Vec<_>>();
    let route_links = flattened
        .iter()
        .filter_map(|item| item.link.as_ref().filter(|link| !link.is_empty()).cloned())
        .collect::<Vec<_>>();
    let hidden_count = flattened.iter().filter(|item| item.is_hidden).count();
    let disabled_count = flattened.iter().filter(|item| item.is_disabled).count();

    // Struct declaration order is the original JSON.stringify object key order.
    // A JSON Map/BTreeMap would silently sort these checksum keys differently.
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Checksum<'a> {
        navigation_keys: &'a [String],
        route_links: &'a [String],
        hidden_count: usize,
        disabled_count: usize,
    }
    let bytes = serde_json::to_vec(&Checksum {
        navigation_keys: &navigation_keys,
        route_links: &route_links,
        hidden_count,
        disabled_count,
    })?;
    let mut tree_checksum = String::with_capacity(64);
    for byte in Sha256::digest(bytes) {
        let _ = write!(tree_checksum, "{byte:02x}");
    }
    Ok(NavigationSyncSummary {
        target_id: "platform-navigation".into(),
        node_count: flattened.len(),
        route_count: route_links.len(),
        hidden_count,
        disabled_count,
        tree_checksum,
        navigation_keys,
        route_links,
    })
}
