//! Existing Nest role and permission contracts. TypeScript remains authoritative.

pub mod collation;
pub mod http;
pub mod model;
pub mod service;
pub mod store;
pub mod validation;

use std::{collections::BTreeMap, sync::OnceLock};

use serde::Deserialize;

use crate::shared::generated::PermissionKey;

pub use model::{
    AssignRolePermissions, CreateRole, PlatformPermissionSummary, RoleActivation, RoleDetail,
    RoleSummary, UpdateRole,
};
pub use service::{RolesError, RolesService};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Authority {
    permissions: Vec<PlatformPermissionSummary>,
    minimum_permissions: BTreeMap<String, Vec<PermissionKey>>,
}

fn authority() -> &'static Authority {
    static AUTHORITY: OnceLock<Authority> = OnceLock::new();
    AUTHORITY.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../tools/rust-r2b/roles-authority.json"
        ))
        .unwrap_or_else(|_| panic!("invalid generated role authority"))
    })
}

pub fn permission_dictionary() -> &'static [PlatformPermissionSummary] {
    &authority().permissions
}

pub fn minimum_permissions(role_key: &str) -> &'static [PermissionKey] {
    authority()
        .minimum_permissions
        .get(role_key)
        .map_or(&[], Vec::as_slice)
}
