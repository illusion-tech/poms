//! Contract-specific commercial readiness, immutable preparation and formal plans.
//! The caller owns the connection, outer transaction and authentication flush.

mod service;
mod source;
mod store;
mod terms;
mod view;

pub use service::{
    execute, formal_plan_payload_hash, initialize_plan_from_effective_snapshot, load_preparation,
};
