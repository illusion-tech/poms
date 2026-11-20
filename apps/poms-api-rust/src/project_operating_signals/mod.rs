//! R4H is the sole operating policy author. Every database helper borrows the
//! caller's CommonSession and never commits, opens another pool, or detaches UoW.
pub mod policy;
pub mod projection;
pub mod query;
pub mod review;
pub mod service;
pub mod store;
pub mod summary;

pub use policy::{derive_cost_readiness, derive_operating_evaluation};
pub use service::{evaluate_with_session, execute_with_session};

#[cfg(test)]
mod tests;
