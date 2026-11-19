//! R4F: twelve governed cost operations on the caller's one outer transaction.
mod correction;
mod evidence;
mod logic;

// Reuse the actual F money/rounding algorithm for read-only G qualification.
pub(crate) use logic::{
    Share as AllocationShare, allocate_layers as allocate_source_layers,
    decimal as allocation_decimal, total_layers as allocation_totals,
};
mod projection;
mod service;
mod store;
pub(crate) use correction::{apply_corrections_with_session, cost_ids_for_evidence_reference};

use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
};
use serde_json::Value;
use uuid::Uuid;

pub async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation_id: &str,
    id: Option<Uuid>,
    _query: &Value,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    let handler = operation_id
        .strip_prefix("ProjectCostController_")
        .ok_or(Error::Internal)?;
    match handler {
        "confirmSharedCostAllocationBasis" => {
            service::allocation(session, operation_id, None, body, actor).await
        }
        "replaceSharedCostAllocationResult" => {
            service::allocation(session, operation_id, Some(required(id)?), body, actor).await
        }
        "confirmCostStageAttribution" => {
            service::stage(session, operation_id, required(id)?, false, body, actor).await
        }
        "reclassifyCostStageAttribution" => {
            service::stage(session, operation_id, required(id)?, true, body, actor).await
        }
        "confirmAccountingTaxTreatment" => {
            service::tax(session, operation_id, required(id)?, false, body, actor).await
        }
        "replaceAccountingTaxTreatment" => {
            service::tax(session, operation_id, required(id)?, true, body, actor).await
        }
        "getSharedCostAllocationBasis" => projection::basis(session, actor, required(id)?).await,
        "listSharedCostAllocationResults" => {
            projection::results(session, actor, required(id)?).await
        }
        "listCostStageAttributions" => {
            projection::stage_history(session, actor, required(id)?).await
        }
        "getCostStageAttribution" => projection::stage_detail(session, actor, required(id)?).await,
        "listAccountingTaxTreatments" => {
            projection::tax_history(session, actor, required(id)?).await
        }
        "getAccountingTaxTreatment" => projection::tax_detail(session, actor, required(id)?).await,
        _ => Err(Error::Internal),
    }
}
fn required(id: Option<Uuid>) -> Result<Uuid, Error> {
    id.ok_or_else(|| Error::BadRequest("A resource identity is required".into()))
}
