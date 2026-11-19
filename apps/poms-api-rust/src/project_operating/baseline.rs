//! Approved project-estimate adoption, with every successor counted once.
use super::{
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Error, canonical_hash, new_uuid},
    project_operating_common::model::{
        ApprovedProjectCostTransition, OperatingBaselineSourceDraft, OperatingMoneyCents, Sha256,
    },
};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

pub(crate) async fn derive(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    catalog: &Catalog,
) -> Result<OperatingBaselineSourceDraft, Error> {
    // A package is adopted only by an actually activated same-contract term
    // preparation with an approved exact payload binding. A current estimate
    // without that approval is not an operating baseline source.
    let mut adopted: BTreeMap<Uuid, Vec<Value>> = BTreeMap::new();
    for term in catalog.all(Table::Term) {
        if !matches!(
            term["snapshot_status"].as_str(),
            Some("active" | "superseded")
        ) {
            continue;
        }
        let preparation_id = match store::id(term, "source_preparation_id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let Some(preparation) = catalog.find(Table::Preparation, preparation_id) else {
            continue;
        };
        if preparation["contract_id"] != term["contract_id"]
            || preparation["activated_snapshot_id"] != term["id"]
            || preparation["payload_hash"] != term["payload_hash"]
            || preparation["status"] != "activated"
        {
            continue;
        }
        let binding = catalog.all(Table::ReviewBinding).iter().find(|b| {
            b["preparation_id"] == preparation["id"]
                && b["contract_id"] == term["contract_id"]
                && b["payload_hash"] == preparation["payload_hash"]
                && b["contract_amendment_id"] == term["source_amendment_id"]
                && catalog
                    .by(Table::Approval, "id", &b["approval_record_id"])
                    .is_some_and(|a| {
                        a["current_status"] == "approved"
                            && a["target_object_id"] == term["contract_id"]
                            && a["approval_type"] == "contract-review"
                    })
        });
        let Some(binding) = binding else { continue };
        let package = store::id(preparation, "source_cost_package_id")?;
        let estimate = catalog
            .find(Table::Estimate, package)
            .ok_or_else(|| store::conflict("operating_adopted_estimate_missing"))?;
        if estimate["project_id"] != project.to_string()
            || estimate["version"] != preparation["source_facts"]["cost"]["version"]
            || estimate["id"] != preparation["source_facts"]["cost"]["id"]
        {
            return Err(store::conflict(
                "operating_adopted_estimate_lineage_changed",
            ));
        }
        adopted.entry(package).or_default().extend([
            sources::reference(Table::Term, term)?,
            sources::reference(Table::Preparation, preparation)?,
            sources::reference(Table::ReviewBinding, binding)?,
        ]);
    }
    if adopted.is_empty() {
        return Err(store::conflict("operating_adopted_estimate_missing"));
    }
    let ids = adopted.keys().copied().collect::<BTreeSet<_>>();
    let roots = ids
        .iter()
        .filter(|id| {
            catalog.find(Table::Estimate, **id).is_some_and(|r| {
                store::id(r, "supersedes_id")
                    .ok()
                    .is_none_or(|p| !ids.contains(&p))
            })
        })
        .copied()
        .collect::<Vec<_>>();
    if roots.len() != 1 {
        return Err(store::conflict(
            "operating_adopted_estimate_chain_ambiguous",
        ));
    }
    let original_id = roots[0];
    let mut chain = vec![original_id];
    while chain.len() < ids.len() {
        let before = *chain.last().ok_or(Error::Internal)?;
        let successors = ids
            .iter()
            .filter(|id| {
                catalog
                    .find(Table::Estimate, **id)
                    .is_some_and(|r| r["supersedes_id"] == before.to_string())
            })
            .copied()
            .collect::<Vec<_>>();
        if successors.len() != 1 {
            return Err(store::conflict(
                "operating_approved_transition_chain_incomplete",
            ));
        }
        if chain.contains(&successors[0]) {
            return Err(store::conflict("operating_approved_transition_cycle"));
        }
        chain.push(successors[0]);
    }
    let original = catalog
        .find(Table::Estimate, original_id)
        .ok_or(Error::Internal)?;
    let currency = store::text(original, "currency_code")?;
    if currency.len() != 3 || !currency.bytes().all(|b| b.is_ascii_uppercase()) {
        return Err(store::conflict("operating_currency_unproven"));
    }
    for id in &chain {
        if catalog
            .find(Table::Estimate, *id)
            .is_none_or(|r| r["currency_code"] != currency)
        {
            return Err(store::conflict("operating_multiple_currencies_unsupported"));
        }
    }
    let mut handover_cost = original_id;
    let basis = catalog
        .all(Table::HandoverBasis)
        .iter()
        .find(|r| r["is_current"] == true && r["status"] == "active");
    if let Some(basis) = basis {
        let members = basis["source_payload"]["members"]
            .as_array()
            .ok_or_else(|| store::conflict("operating_handover_basis_missing"))?;
        let package_ids = members
            .iter()
            .map(|m| store::id(&m["sourceFacts"]["cost"], "id"))
            .collect::<Result<BTreeSet<_>, _>>()?;
        if package_ids.len() != 1 {
            return Err(store::conflict("operating_handover_estimate_ambiguous"));
        }
        handover_cost = *package_ids.first().ok_or(Error::Internal)?;
        if !ids.contains(&handover_cost) {
            return Err(store::conflict("operating_handover_estimate_not_adopted"));
        }
    }
    let execution_at:Option<chrono::DateTime<chrono::Utc>>=sqlx::query_scalar("SELECT min(entered_at) FROM poms.project_stage_record WHERE project_id=$1 AND to_stage='execution' AND producer_version=1").bind(project).fetch_one(&mut *session.connection).await?;
    let original_amount = amount(original)?;
    let handover_row = catalog
        .find(Table::Estimate, handover_cost)
        .ok_or(Error::Internal)?;
    let handover_amount = amount(handover_row)?;
    let mut execution_total = OperatingMoneyCents::from_cents(0, "executionChangePackageTotal")?;
    let mut transitions = Vec::new();
    let mut passed_handover = false;
    for pair in chain.windows(2) {
        if pair[0] == handover_cost {
            passed_handover = true;
        }
        let before = catalog
            .find(Table::Estimate, pair[0])
            .ok_or(Error::Internal)?;
        let after = catalog
            .find(Table::Estimate, pair[1])
            .ok_or(Error::Internal)?;
        let delta = amount(after)?.checked_sub(amount(before)?)?;
        let approval_refs = adopted.get(&pair[1]).ok_or(Error::Internal)?;
        let effective = sources::business_day(&after["effective_at"])?;
        if passed_handover {
            if execution_at.is_none_or(|at| {
                effective < at.with_timezone(&chrono_tz::Asia::Hong_Kong).date_naive()
            }) {
                return Err(store::conflict(
                    "operating_post_handover_change_requires_execution_proof",
                ));
            }
            execution_total = execution_total.checked_add(delta)?;
        }
        transitions.push(ApprovedProjectCostTransition {
            before_cost_ref: serde_json::from_value(sources::reference(Table::Estimate, before)?)
                .map_err(|_| Error::Internal)?,
            after_cost_ref: serde_json::from_value(sources::reference(Table::Estimate, after)?)
                .map_err(|_| Error::Internal)?,
            approval_source_refs: approval_refs
                .iter()
                .cloned()
                .map(serde_json::from_value)
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| Error::Internal)?,
            delta_net_cents: delta,
        });
    }
    let current = handover_amount.checked_add(execution_total)?;
    let changes = current.checked_sub(original_amount)?;
    let rebaseline = basis.and_then(|b| {
        catalog.all(Table::Rebaseline).iter().find(|r| {
            r["basis_after_id"] == b["id"]
                && matches!(r["status"].as_str(), Some("effective" | "superseded"))
        })
    });
    if handover_cost != original_id && rebaseline.is_none() {
        return Err(store::conflict(
            "operating_handover_rebaseline_proof_missing",
        ));
    }
    let source_ref = |table: Table, row: &Value| {
        sources::reference(table, row)
            .and_then(|r| serde_json::from_value(r).map_err(|_| Error::Internal))
    };
    let mut draft = OperatingBaselineSourceDraft {
        id: new_uuid()?,
        project_id: project,
        original_cost_ref: source_ref(Table::Estimate, original)?,
        current_cost_ref: source_ref(
            Table::Estimate,
            catalog
                .find(Table::Estimate, *chain.last().ok_or(Error::Internal)?)
                .ok_or(Error::Internal)?,
        )?,
        handover_basis_ref: basis
            .map(|r| source_ref(Table::HandoverBasis, r))
            .transpose()?,
        handover_rebaseline_ref: rebaseline
            .map(|r| source_ref(Table::Rebaseline, r))
            .transpose()?,
        currency: currency.into(),
        approved_transitions: transitions,
        original_baseline_cost: original_amount,
        handover_baseline_cost: handover_amount,
        execution_change_package_total: execution_total,
        change_package_total: changes,
        current_effective_baseline_cost: current,
        source_hash: Sha256::try_from("0".repeat(64))?,
        payload_hash: Sha256::try_from("0".repeat(64))?,
        historical_period_selection: None,
    };
    let payload = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
    let mut factual = payload.clone();
    if let Some(map) = factual.as_object_mut() {
        map.remove("id");
        map.remove("sourceHash");
        map.remove("payloadHash");
    }
    draft.source_hash = Sha256::try_from(canonical_hash(&factual)?)?;
    let mut full = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
    full.as_object_mut()
        .ok_or(Error::Internal)?
        .remove("payloadHash");
    draft.payload_hash = Sha256::try_from(canonical_hash(&full)?)?;
    Ok(draft)
}

fn amount(row: &Value) -> Result<OperatingMoneyCents, Error> {
    let amount = OperatingMoneyCents::parse_exact(
        store::text(row, "total_estimated_amount_excluding_tax")?,
        "baselineCost",
    )?;
    if amount.cents() < 0 {
        return Err(store::conflict("operating_baseline_negative_amount"));
    }
    Ok(amount)
}
