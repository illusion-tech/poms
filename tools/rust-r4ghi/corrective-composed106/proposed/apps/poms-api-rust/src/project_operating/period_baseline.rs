//! Fail closed when the first period's adopted baseline cannot be proved as-of.
//! The G package may be captured later; its actual adopted business facts may not.
use super::{
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{contract_support::Error, project_operating_common::model::OperatingBusinessWindow};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::BTreeMap;
use uuid::Uuid;

fn reconcile() -> Error {
    store::conflict("period_baseline_reconciliation_required")
}

fn instant(row: &Value, field: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(row[field].as_str()?)
        .ok()
        .map(|at| at.with_timezone(&Utc))
}

fn known(row: &Value, field: &str, window: &OperatingBusinessWindow) -> bool {
    instant(row, field).is_some_and(|at| at <= window.knowledge_cutoff)
}

fn effective(row: &Value, field: &str, window: &OperatingBusinessWindow) -> bool {
    instant(row, field).is_some_and(|at| {
        at <= window.knowledge_cutoff
            && at.with_timezone(&chrono_tz::Asia::Hong_Kong).date_naive() <= window.business_cutoff
    })
}

fn exact<'a>(catalog: &'a Catalog, table: Table, reference: &Value) -> Result<&'a Value, Error> {
    let row = if table == Table::ReviewBinding {
        catalog.by(table, "approval_record_id", &reference["id"])
    } else {
        catalog.find(table, store::id(reference, "id").map_err(|_| reconcile())?)
    }
    .ok_or_else(reconcile)?;
    if sources::reference(table, row)? != *reference {
        return Err(reconcile());
    }
    Ok(row)
}

fn approval_table(reference: &Value) -> Result<Table, Error> {
    match reference["kind"].as_str() {
        Some("ContractTermSnapshot") => Ok(Table::Term),
        Some("ContractTermPreparation") => Ok(Table::Preparation),
        Some("ContractReviewBinding") => Ok(Table::ReviewBinding),
        _ => Err(reconcile()),
    }
}

fn has_adoption(
    catalog: &Catalog,
    project: Uuid,
    estimate: &Value,
    required_refs: Option<&[Value]>,
    window: &OperatingBusinessWindow,
) -> Result<bool, Error> {
    for term in catalog.all(Table::Term) {
        if !matches!(
            term["snapshot_status"].as_str(),
            Some("active" | "superseded")
        ) {
            continue;
        }
        let Some(preparation) =
            catalog.by(Table::Preparation, "id", &term["source_preparation_id"])
        else {
            continue;
        };
        if preparation["source_cost_package_id"] != estimate["id"]
            || preparation["project_id"] != project.to_string()
            || preparation["source_facts"]["cost"]["id"] != estimate["id"]
            || preparation["source_facts"]["cost"]["version"] != estimate["version"]
            || preparation["contract_id"] != term["contract_id"]
            || preparation["activated_snapshot_id"] != term["id"]
            || preparation["payload_hash"] != term["payload_hash"]
            || preparation["status"] != "activated"
        {
            continue;
        }
        let Some(contract) = catalog.by(Table::Contract, "id", &term["contract_id"]) else {
            continue;
        };
        if contract["project_id"] != project.to_string()
            || !known(contract, "created_at", window)
            || (!contract["signed_at"].is_null() && !effective(contract, "signed_at", window))
            || !known(term, "created_at", window)
            || !effective(term, "effective_at", window)
            || !known(preparation, "created_at", window)
            || !effective(preparation, "activated_at", window)
        {
            continue;
        }
        for binding in catalog.all(Table::ReviewBinding) {
            if binding["preparation_id"] != preparation["id"]
                || binding["preparation_version"] != preparation["version"]
                || binding["contract_id"] != term["contract_id"]
                || binding["payload_hash"] != preparation["payload_hash"]
                || binding["contract_amendment_id"] != term["source_amendment_id"]
                || !known(binding, "created_at", window)
            {
                continue;
            }
            let Some(approval) = catalog.by(Table::Approval, "id", &binding["approval_record_id"])
            else {
                continue;
            };
            // The actual approval table has decided_at, not an invented approved_at.
            if approval["current_status"] != "approved"
                || approval["target_object_id"] != term["contract_id"]
                || approval["approval_type"] != "contract-review"
                || !known(approval, "created_at", window)
                || !effective(approval, "decided_at", window)
            {
                continue;
            }
            let refs = [
                sources::reference(Table::Term, term)?,
                sources::reference(Table::Preparation, preparation)?,
                sources::reference(Table::ReviewBinding, binding)?,
            ];
            if required_refs.is_none_or(|required| refs.iter().all(|r| required.contains(r))) {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

/// Called only for the first period capture/preview, after the collector's locks.
/// This verifies the selected frozen draft; it never selects or recalculates a budget.
pub(crate) fn assert_adoption(
    catalog: &Catalog,
    project: Uuid,
    draft: &Value,
    window: &OperatingBusinessWindow,
) -> Result<(), Error> {
    let original = exact(catalog, Table::Estimate, &draft["originalCostRef"])?;
    let current = exact(catalog, Table::Estimate, &draft["currentCostRef"])?;
    let transitions = draft["approvedTransitions"]
        .as_array()
        .ok_or_else(reconcile)?;
    let mut packages = BTreeMap::new();
    packages.insert(store::id(original, "id")?, (original, None));
    let mut previous = &draft["originalCostRef"];
    for transition in transitions {
        if transition["beforeCostRef"] != *previous {
            return Err(reconcile());
        }
        exact(catalog, Table::Estimate, &transition["beforeCostRef"])?;
        let after = exact(catalog, Table::Estimate, &transition["afterCostRef"])?;
        let approvals = transition["approvalSourceRefs"]
            .as_array()
            .ok_or_else(reconcile)?;
        for reference in approvals {
            exact(catalog, approval_table(reference)?, reference)?;
        }
        if after["supersedes_id"] != previous["id"]
            || packages
                .insert(store::id(after, "id")?, (after, Some(approvals.as_slice())))
                .is_some()
        {
            return Err(reconcile());
        }
        previous = &transition["afterCostRef"];
    }
    if *previous != draft["currentCostRef"] || current["project_id"] != project.to_string() {
        return Err(reconcile());
    }
    for (estimate, approvals) in packages.values() {
        if estimate["project_id"] != project.to_string()
            || !known(estimate, "created_at", window)
            || !effective(estimate, "effective_at", window)
            || !has_adoption(catalog, project, estimate, *approvals, window)?
        {
            return Err(reconcile());
        }
    }
    for (field, table, business, knowledge) in [
        (
            "handoverBasisRef",
            Table::HandoverBasis,
            "generated_at",
            "generated_at",
        ),
        (
            "handoverRebaselineRef",
            Table::Rebaseline,
            "handled_at",
            "created_at",
        ),
    ] {
        if !draft[field].is_null() {
            let row = exact(catalog, table, &draft[field])?;
            if row["project_id"] != project.to_string()
                || !known(row, knowledge, window)
                || !effective(row, business, window)
            {
                return Err(reconcile());
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests;
