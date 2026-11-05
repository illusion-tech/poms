//! Contract-owned queries and commands. The HTTP owner lends the outer
//! transaction, common identity graph and one authentication participant.
mod amendment;
mod model;
mod projection;
mod service;
mod store;

pub use amendment::{
    apply_amendment_review, prepare_amendment_readiness, validate_amendment_preparation,
};
pub use service::{execute, validate_review_binding};
