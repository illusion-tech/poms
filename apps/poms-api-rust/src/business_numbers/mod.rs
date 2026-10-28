//! Nine existing internal generators. No public HTTP surface.
pub mod service;
pub use service::{BusinessNumberError, BusinessNumberScope, BusinessNumberService};
