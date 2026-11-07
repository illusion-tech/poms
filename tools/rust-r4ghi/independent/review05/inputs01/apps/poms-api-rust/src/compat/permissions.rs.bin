//! Pure permission decision after route metadata/session resolution.
//!
//! This is not authentication, CSRF, metadata lookup, an HTTP error mapper or
//! an audit writer. R1C composes those boundaries in the frozen guard order.

use std::str::FromStr;

use serde::{Deserialize, Serialize};

use crate::shared::generated::PermissionKey;

/// Database/session values have historically been strings without an enum
/// CHECK. Preserve them losslessly; trying the known enum never rewrites raw.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RawPermission(String);

impl RawPermission {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn try_known(&self) -> Result<PermissionKey, <PermissionKey as FromStr>::Err> {
        self.0.parse()
    }
}

impl AsRef<str> for RawPermission {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

/// `authenticated_route` is route metadata, not proof of a valid session. The
/// SessionAuthGuard-equivalent remains a mandatory preceding R1C boundary.
#[derive(Debug, Clone, Copy)]
pub struct PermissionRequirements<'a> {
    pub public_route: bool,
    pub authenticated_route: bool,
    pub all: &'a [PermissionKey],
    pub any: &'a [PermissionKey],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionDecision {
    Allow,
    MissingDeclaration,
    InsufficientPermissions,
}

pub fn decide(
    requirements: PermissionRequirements<'_>,
    user_permissions: &[RawPermission],
) -> PermissionDecision {
    if requirements.public_route {
        return PermissionDecision::Allow;
    }
    let has_requirement = !requirements.all.is_empty() || !requirements.any.is_empty();
    if !requirements.authenticated_route && !has_requirement {
        return PermissionDecision::MissingDeclaration;
    }
    let contains = |permission: &PermissionKey| {
        user_permissions
            .iter()
            .any(|raw| raw.as_str() == permission.as_str())
    };
    let has_all = requirements.all.iter().all(contains);
    let has_any = requirements.any.is_empty() || requirements.any.iter().any(contains);
    if has_all && has_any {
        PermissionDecision::Allow
    } else {
        PermissionDecision::InsufficientPermissions
    }
}
