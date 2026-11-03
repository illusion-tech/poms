//! The seven existing approval support tables. This module exposes internal
//! services only; the four original HTTP operations use the approval adapter.
//! Original TS services, contracts and migrations own the behavior.

mod domain_schema;
mod error;
pub mod js;
pub mod model;
pub mod projection;
pub mod protocol;
pub mod receipt;
pub mod required;
pub mod schema;
pub mod service;
pub mod session;
pub mod store;
pub mod transition;

pub use error::{CommonFailure, FailureKind};
pub use js::{JsField, Text};
pub use model::*;
pub use service::{
    ApprovalCommonService, ApprovalSummaryService, ConfirmationService, ServiceValue,
};
pub use session::EntityHandle;
pub use session::{ApprovalDomainHandler, CommonSession, CommonState, DomainDecisionOutcome};
pub use session::{CommonFlushFuture, CommonFlushParticipant};
