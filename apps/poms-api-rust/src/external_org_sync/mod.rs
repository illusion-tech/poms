//! Existing external-department directory and synchronization operations.
//! Original TypeScript, Zod and historical DDL remain the authority.

mod core;
pub mod directory;
pub mod http;
pub mod model;
pub mod service;
pub mod store;
pub mod validation;

pub use directory::{
    DepartmentReadAccess, DirectoryAdapter, DirectoryError, ExternalDepartmentSnapshot,
};
pub use service::{ExternalOrgSyncError, ExternalOrgSyncService};
