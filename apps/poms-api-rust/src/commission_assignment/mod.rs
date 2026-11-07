//! Minimum role assignment and freeze; no calculation/rule-version producer.
mod service;
pub use service::{
    FrozenAssignmentFacts, create_with_session, current_with_session, detail_with_session,
    freeze_with_session, require_current_frozen,
};
// Root's typed route adapter calls only these concrete request functions.
pub use service::execute_with_session;
