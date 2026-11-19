//! Lifecycle commands are real fact producers inside one caller-owned TX.
pub(crate) mod facts;
mod service;
mod view;
pub(crate) use service::enter_handover_with_verified_authority;
pub use service::{enter_handover_with_session, execute_with_session};

mod stage_fact;
pub use stage_fact::{VerifiedProjectStageFact, load_verified_stage_fact_with_session};

mod execution_context;
pub(crate) use execution_context::prepare_execution_admission_with_session;
