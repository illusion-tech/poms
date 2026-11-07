//! R4G operating baseline, snapshot, period and atomic restatement business.
//! Root owns HTTP/DTO validation, access proof minting and the single COMMIT.
mod baseline;
mod capture;
pub mod collector;
mod context;
mod facts;
mod inclusion;
pub mod preparation;
mod projection;
mod restatement;
pub mod service;
pub mod sources;
mod store;
pub mod view;

pub use collector::collect_with_session;
pub use preparation::{prepare_query_with_session, prepare_with_session};
pub use service::{
    activate_baseline_with_session, close_period_with_session, create_snapshot_with_session,
    restate_with_session,
};
pub use view::{
    baseline_with_session, period_with_session, restatement_with_session,
    restatements_with_session, snapshot_with_session,
};

pub async fn execute_with_session(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    operation_id: &str,
    keys: &crate::project_operating_common::ResourceKeys,
    _query: &serde_json::Value,
    request: &crate::project_operating_common::TypedRequest,
    actor: &crate::contract_support::Actor,
) -> Result<serde_json::Value, crate::contract_support::Error> {
    use crate::{contract_support::Error, project_operating_common::TypedRequest};
    let value = match (operation_id, request) {
        (
            "ProjectCostController_activateOperatingBaselinePackage",
            TypedRequest::ActivateOperatingBaselinePackageRequest(input),
        ) => serde_json::to_value(
            service::activate_baseline_with_session(session, input, actor).await?,
        ),
        (
            "ProjectCostController_createProjectOperatingSnapshot",
            TypedRequest::CreateProjectOperatingSnapshotRequest(input),
        ) => serde_json::to_value(
            service::create_snapshot_with_session(session, input, actor).await?,
        ),
        (
            "ProjectCostController_createPeriodClosingSnapshot",
            TypedRequest::CreatePeriodClosingSnapshotRequest(input),
        ) => serde_json::to_value(service::close_period_with_session(session, input, actor).await?),
        (
            "ProjectCostController_createOperatingRestatement",
            TypedRequest::CreateOperatingRestatementRequest(input),
        ) => serde_json::to_value(service::restate_with_session(session, input, actor).await?),
        ("ProjectCostController_getCurrentOperatingBaselinePackage", TypedRequest::None) => {
            serde_json::to_value(
                view::baseline_with_session(session, keys.project_id()?, actor).await?,
            )
        }
        ("ProjectCostController_getProjectOperatingSnapshot", TypedRequest::None) => {
            serde_json::to_value(view::snapshot_with_session(session, keys.id()?, actor).await?)
        }
        ("ProjectCostController_getPeriodClosingSnapshot", TypedRequest::None) => {
            serde_json::to_value(view::period_with_session(session, keys.id()?, actor).await?)
        }
        ("ProjectCostController_listOperatingRestatements", TypedRequest::None) => {
            serde_json::to_value(
                view::restatements_with_session(session, keys.project_id()?, actor).await?,
            )
        }
        ("ProjectCostController_getOperatingRestatement", TypedRequest::None) => {
            serde_json::to_value(view::restatement_with_session(session, keys.id()?, actor).await?)
        }
        _ => {
            return Err(Error::BadRequest(
                "Operating operation and typed request do not match".into(),
            ));
        }
    };
    value.map_err(|_| Error::Internal)
}
