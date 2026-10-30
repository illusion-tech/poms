//! The four existing approval operations and their minimum real domain closure.
//! Authentication and HTTP serialization are owned by the request adapter.

pub(crate) mod context;
mod domain;
pub mod http;
pub mod model;
pub mod service;
pub mod settlement;
mod validation;

pub use service::ApprovalService;
