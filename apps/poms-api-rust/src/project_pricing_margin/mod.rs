//! The three original pricing/margin operations, consuming the real cost and
//! bid modules. Native's observed INSERT-first version failure is preserved.

pub mod http;
pub mod model;
pub mod service;
pub mod store;
pub mod validation;

pub use service::{Error, Service};
pub use store::summary;
