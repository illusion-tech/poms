//! Fail closed when the first period's adopted baseline cannot be proved as-of.
//! The G package may be captured later; its actual adopted business facts may not.
use super::{
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{contract_support::Error, project_operating_common::model::OperatingBusinessWindow};
use crate::{contract_support::canonical_hash, project_operating_common::model::*};
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sha2::{Digest, Sha256 as DigestSha256};
use std::collections::{BTreeMap, BTreeSet};
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

#[cfg(test)]
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

#[cfg(test)]
fn approval_table(reference: &Value) -> Result<Table, Error> {
    match reference["kind"].as_str() {
        Some("ContractTermSnapshot") => Ok(Table::Term),
        Some("ContractTermPreparation") => Ok(Table::Preparation),
        Some("ContractReviewBinding") => Ok(Table::ReviewBinding),
        _ => Err(reconcile()),
    }
}

#[cfg(test)]
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
#[cfg(test)]
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

const POLICY_VERSION273: &str = "historical-adoption-chain272-v1";
const POLICY_SOURCE273: &str =
    include_str!("../../../../docs/design/rust-r4ghi/user-decision-historical-baseline272.json");
const POLICY_RAW_HASH273: &str = "ef5294f25b1f8c16bdfe072ae7910e0947ff3e3673a0a4f6b88a5958ef451a4e";
const MAX_SELECTION_REFS273: usize = 1000;

/// The pure selector has no generated G identities. Only capture converts this
/// proved business choice into a real dedicated source/package in the outer TX.
#[derive(Clone, Debug)]
pub(crate) struct HistoricalSelection {
    pub proof: HistoricalPeriodSelectionProof,
    currency: String,
    transitions: Vec<ApprovedProjectCostTransition>,
    original: OperatingMoneyCents,
    handover: OperatingMoneyCents,
    execution: OperatingMoneyCents,
    changes: OperatingMoneyCents,
    current: OperatingMoneyCents,
}

impl HistoricalSelection {
    pub(crate) fn public_selection(&self) -> Result<HistoricalPeriodBaselineSelection, Error> {
        serde_json::from_value(json!({
            "policyVersion": POLICY_VERSION273,
            "publicationMode": "new-period-package",
            "periodKey": self.proof.period_key,
            "businessCutoff": self.proof.business_cutoff,
            "selectionHash": self.proof.selection_hash,
            "originalAdoptedCostRef": self.proof.original_cost_ref,
            "selectedAdoptedCostRef": self.proof.selected_cost_ref,
            "handoverBasisRef": self.proof.handover_basis_ref,
            "handoverRebaselineRef": self.proof.handover_rebaseline_ref,
            "adoptionSourceRefs": self.proof.adoption_source_refs,
            "technicalLineageRefs": self.proof.technical_lineage_refs,
        }))
        .map_err(|_| Error::Internal)
    }

    pub(crate) fn draft(
        &self,
        source_id: Uuid,
        project: Uuid,
    ) -> Result<OperatingBaselineSourceDraft, Error> {
        let mut draft = OperatingBaselineSourceDraft {
            id: source_id,
            project_id: project,
            original_cost_ref: self.proof.original_cost_ref.clone(),
            current_cost_ref: self.proof.selected_cost_ref.clone(),
            handover_basis_ref: self.proof.handover_basis_ref.clone(),
            handover_rebaseline_ref: self.proof.handover_rebaseline_ref.clone(),
            currency: self.currency.clone(),
            approved_transitions: self.transitions.clone(),
            original_baseline_cost: self.original,
            handover_baseline_cost: self.handover,
            execution_change_package_total: self.execution,
            change_package_total: self.changes,
            current_effective_baseline_cost: self.current,
            source_hash: Sha256::try_from("0".repeat(64))?,
            payload_hash: Sha256::try_from("0".repeat(64))?,
            historical_period_selection: Some(Box::new(self.proof.clone())),
        };
        let mut factual = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
        for key in ["id", "sourceHash", "payloadHash"] {
            factual.as_object_mut().ok_or(Error::Internal)?.remove(key);
        }
        draft.source_hash = Sha256::try_from(canonical_hash(&factual)?)?;
        let mut payload = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
        payload
            .as_object_mut()
            .ok_or(Error::Internal)?
            .remove("payloadHash");
        draft.payload_hash = Sha256::try_from(canonical_hash(&payload)?)?;
        Ok(draft)
    }

    pub(crate) fn preview_draft(&self) -> Value {
        // Only economic source values. There is deliberately no fake source or
        // package UUID. This value can be used for eligibility, never capture.
        json!({"originalCostRef":self.proof.original_cost_ref,
            "currentCostRef":self.proof.selected_cost_ref,
            "handoverBasisRef":self.proof.handover_basis_ref,
            "handoverRebaselineRef":self.proof.handover_rebaseline_ref,
            "currency":self.currency,"approvedTransitions":self.transitions,
            "originalBaselineCost":self.original,
            "handoverBaselineCost":self.handover,
            "executionChangePackageTotal":self.execution,
            "changePackageTotal":self.changes,
            "currentEffectiveBaselineCost":self.current,
            "historicalPeriodSelection":self.proof})
    }
}

fn typed_ref(table: Table, row: &Value) -> Result<SourceRef, Error> {
    serde_json::from_value(sources::reference(table, row)?).map_err(|_| reconcile())
}

fn required_instant(row: &Value, field: &str) -> Result<DateTime<Utc>, Error> {
    instant(row, field).ok_or_else(reconcile)
}

fn period_effective(at: DateTime<Utc>, window: &OperatingBusinessWindow) -> bool {
    at <= window.knowledge_cutoff
        && at.with_timezone(&chrono_tz::Asia::Hong_Kong).date_naive() <= window.business_cutoff
}

fn money(row: &Value) -> Result<OperatingMoneyCents, Error> {
    let amount = OperatingMoneyCents::parse_exact(
        store::text(row, "total_estimated_amount_excluding_tax")?,
        "historicalBaselineCost",
    )?;
    let tax = OperatingMoneyCents::parse_exact(
        store::text(row, "total_tax_cost_amount").map_err(|_| reconcile())?,
        "historicalBudgetTax",
    )
    .map_err(|_| reconcile())?;
    let gross = OperatingMoneyCents::parse_exact(
        store::text(row, "total_estimated_amount_including_tax").map_err(|_| reconcile())?,
        "historicalBudgetGross",
    )
    .map_err(|_| reconcile())?;
    if amount.cents() < 0
        || tax.cents() < 0
        || gross.cents() < 0
        || amount.checked_add(tax)? != gross
    {
        return Err(reconcile());
    }
    Ok(amount)
}

fn ref_key(reference: &SourceRef) -> (String, Uuid, i32, String) {
    (
        reference.kind.clone(),
        reference.id,
        reference.row_version,
        reference.payload_hash.clone(),
    )
}

fn sorted_refs(mut refs: Vec<SourceRef>) -> Result<Vec<SourceRef>, Error> {
    refs.sort_by_key(ref_key);
    refs.dedup_by(|a, b| ref_key(a) == ref_key(b));
    if refs.len() > MAX_SELECTION_REFS273 {
        return Err(store::conflict("operating_source_capacity_exceeded"));
    }
    Ok(refs)
}

fn policy_hash273() -> Result<Sha256, Error> {
    let hash = DigestSha256::digest(POLICY_SOURCE273.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    if hash != POLICY_RAW_HASH273 {
        return Err(reconcile());
    }
    Sha256::try_from(hash)
}

pub(crate) fn temporal_facts(
    catalog: &Catalog,
) -> Result<Vec<HistoricalTemporalSourceFact>, Error> {
    let mut facts = Vec::new();
    for table in [
        Table::Estimate,
        Table::Contract,
        Table::Term,
        Table::Preparation,
        Table::ReviewBinding,
        Table::Approval,
        Table::HandoverBasis,
        Table::Handover,
        Table::Rebaseline,
        Table::ProjectStage,
    ] {
        for row in catalog.all(table) {
            let raw = json!({"createdAt":row["created_at"],"effectiveAt":row["effective_at"],
                "activatedAt":row["activated_at"],"decidedAt":row["decided_at"],
                "signedAt":row["signed_at"],"generatedAt":row["generated_at"],
                "confirmedAt":row["confirmed_at"],"handledAt":row["handled_at"],
                "enteredAt":row["entered_at"]});
            facts.push(HistoricalTemporalSourceFact {
                source_ref: typed_ref(table, row)?,
                created_at: instant(row, "created_at"),
                effective_at: instant(row, "effective_at"),
                activated_at: instant(row, "activated_at"),
                decided_at: instant(row, "decided_at"),
                signed_at: instant(row, "signed_at"),
                generated_at: instant(row, "generated_at"),
                confirmed_at: instant(row, "confirmed_at"),
                handled_at: instant(row, "handled_at"),
                entered_at: instant(row, "entered_at"),
                raw_temporal_hash: Sha256::try_from(canonical_hash(&raw)?)?,
            });
        }
    }
    facts.sort_by_key(|fact| ref_key(&fact.source_ref));
    if facts.len() > MAX_SELECTION_REFS273 {
        return Err(store::conflict("operating_source_capacity_exceeded"));
    }
    Ok(facts)
}

fn adoptions273(
    catalog: &Catalog,
    project: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<AdoptionCandidates273, Error> {
    let mut witnesses = Vec::new();
    let mut excluded = Vec::new();
    for term in catalog.all(Table::Term) {
        if !matches!(
            term["snapshot_status"].as_str(),
            Some("active" | "superseded")
        ) {
            if term["snapshot_status"] == "draft" {
                continue;
            }
            return Err(reconcile());
        }
        if !known(term, "created_at", window) {
            return Err(reconcile());
        }
        let term_at = required_instant(term, "effective_at")?;
        // A proved future term cannot replace a valid budget in the past. Its
        // actual observed timestamp is still included in temporal_facts/hash.
        if !period_effective(term_at, window) {
            excluded.push(excluded273(
                term,
                vec![],
                "term-effective-after-period",
                term_at,
            )?);
            continue;
        }
        let preparation = catalog
            .by(Table::Preparation, "id", &term["source_preparation_id"])
            .ok_or_else(reconcile)?;
        if !matches!(
            preparation["status"].as_str(),
            Some("activated" | "superseded")
        ) || preparation["project_id"] != project.to_string()
            || preparation["contract_id"] != term["contract_id"]
            || preparation["activated_snapshot_id"] != term["id"]
            || preparation["payload_hash"] != term["payload_hash"]
            || !known(preparation, "created_at", window)
        {
            return Err(reconcile());
        }
        let activated = required_instant(preparation, "activated_at")?;
        if !period_effective(activated, window) {
            excluded.push(excluded273(
                term,
                vec![typed_ref(Table::Preparation, preparation)?],
                "preparation-activated-after-period",
                activated,
            )?);
            continue;
        }
        let cost = catalog
            .by(
                Table::Estimate,
                "id",
                &preparation["source_cost_package_id"],
            )
            .ok_or_else(reconcile)?;
        let captured = &preparation["source_facts"]["cost"];
        let recorded_version = captured["version"]
            .as_i64()
            .and_then(|v| i32::try_from(v).ok())
            .ok_or_else(reconcile)?;
        let recorded_row_version = captured["rowVersion"]
            .as_i64()
            .and_then(|v| i32::try_from(v).ok())
            .ok_or_else(reconcile)?;
        if cost["project_id"] != project.to_string()
            || captured["id"] != cost["id"]
            || captured["version"] != cost["version"]
            || recorded_version <= 0
            || recorded_row_version <= 0
            || store::version(cost)? < recorded_row_version
            || !matches!(cost["status"].as_str(), Some("effective" | "superseded"))
            || !known(cost, "created_at", window)
        {
            return Err(reconcile());
        }
        let cost_at = required_instant(cost, "effective_at")?;
        if !period_effective(cost_at, window) {
            excluded.push(excluded273(
                term,
                vec![
                    typed_ref(Table::Preparation, preparation)?,
                    typed_ref(Table::Estimate, cost)?,
                ],
                "budget-effective-after-period",
                cost_at,
            )?);
            continue;
        }
        let contract = catalog
            .by(Table::Contract, "id", &term["contract_id"])
            .ok_or_else(reconcile)?;
        if contract["project_id"] != project.to_string()
            || !known(contract, "created_at", window)
            || contract["status"] != "active"
        {
            return Err(reconcile());
        }
        let signed = if contract["signed_at"].is_null() {
            None
        } else {
            Some(required_instant(contract, "signed_at")?)
        };
        if signed.is_some_and(|at| !period_effective(at, window)) {
            excluded.push(excluded273(
                term,
                vec![typed_ref(Table::Contract, contract)?],
                "contract-signed-after-period",
                signed.ok_or_else(reconcile)?,
            )?);
            continue;
        }
        let bindings = catalog
            .all(Table::ReviewBinding)
            .iter()
            .filter(|binding| {
                binding["preparation_id"] == preparation["id"]
                    && binding["preparation_version"] == preparation["version"]
                    && binding["contract_id"] == term["contract_id"]
                    && binding["payload_hash"] == preparation["payload_hash"]
                    && binding["contract_amendment_id"] == term["source_amendment_id"]
            })
            .collect::<Vec<_>>();
        if bindings.is_empty() {
            return Err(reconcile());
        }
        for binding in bindings {
            if !known(binding, "created_at", window) {
                return Err(reconcile());
            }
            let approval = catalog
                .by(Table::Approval, "id", &binding["approval_record_id"])
                .ok_or_else(reconcile)?;
            if approval["approval_type"] != "contract-review"
                || approval["target_object_id"] != term["contract_id"]
                || !known(approval, "created_at", window)
            {
                return Err(reconcile());
            }
            // A currently revoked/cancelled decision without an immutable
            // approved-at-as-of proof cannot be guessed back into approval.
            if approval["current_status"] != "approved" {
                return Err(reconcile());
            }
            let decided = required_instant(approval, "decided_at")?;
            if decided > activated
                || required_instant(preparation, "created_at")? > activated
                || required_instant(binding, "created_at")? > activated
                || required_instant(approval, "created_at")? > decided
            {
                return Err(reconcile());
            }
            if !period_effective(decided, window) {
                continue;
            }
            let adopted_at = [cost_at, term_at, activated, decided]
                .into_iter()
                .chain(signed)
                .max()
                .ok_or_else(reconcile)?;
            witnesses.push(HistoricalBudgetAdoptionWitness {
                cost_ref: typed_ref(Table::Estimate, cost)?,
                recorded_cost_version: recorded_version,
                recorded_cost_row_version: recorded_row_version,
                contract_ref: typed_ref(Table::Contract, contract)?,
                term_ref: typed_ref(Table::Term, term)?,
                preparation_ref: typed_ref(Table::Preparation, preparation)?,
                review_binding_ref: typed_ref(Table::ReviewBinding, binding)?,
                approval_ref: typed_ref(Table::Approval, approval)?,
                cost_effective_at: cost_at,
                term_effective_at: term_at,
                preparation_activated_at: activated,
                approval_decided_at: decided,
                adopted_at,
                eligible_for_period: true,
            });
        }
    }
    witnesses.sort_by_key(|w| {
        (
            w.cost_ref.id,
            w.adopted_at,
            w.term_ref.id,
            w.approval_ref.id,
        )
    });
    excluded.sort_by_key(|candidate| ref_key(&candidate.term_ref));
    if witnesses.len() > MAX_SELECTION_REFS273 || excluded.len() > MAX_SELECTION_REFS273 {
        return Err(store::conflict("operating_source_capacity_exceeded"));
    }
    Ok(AdoptionCandidates273 {
        witnesses,
        excluded,
    })
}

struct AdoptionCandidates273 {
    witnesses: Vec<HistoricalBudgetAdoptionWitness>,
    excluded: Vec<HistoricalExcludedAdoptionCandidate>,
}
fn excluded273(
    term: &Value,
    related_source_refs: Vec<SourceRef>,
    reason: &str,
    at: DateTime<Utc>,
) -> Result<HistoricalExcludedAdoptionCandidate, Error> {
    Ok(HistoricalExcludedAdoptionCandidate {
        term_ref: typed_ref(Table::Term, term)?,
        related_source_refs,
        reason_code: reason.to_owned(),
        observed_business_at: at,
    })
}

/// Current refs remain actual observations. This uses a real older Cost ref
/// already committed by an immutable G source only as a hash predicate. The
/// tested preimage is never returned, persisted, asserted as current, or exposed
/// as an invented historical ref.
fn cost_lifecycle_comparison273(row: &Value, recorded: &SourceRef) -> Result<&'static str, Error> {
    if recorded.kind != "ProjectTechnicalCostPackage"
        || recorded.id != store::id(row, "id")?
        || recorded.row_version <= 0
        || !matches!(
            (row["status"].as_str(), row["is_current"].as_bool()),
            (Some("effective"), Some(true)) | (Some("superseded"), Some(false))
        )
    {
        return Err(reconcile());
    }
    let actual = typed_ref(Table::Estimate, row)?;
    if ref_key(&actual) == ref_key(recorded) {
        return Ok("exact-observed-ref");
    }
    // The actual Rust/Native writers have exactly one update of a Cost ID:
    // effective/current -> superseded/noncurrent, rowVersion+1. is_current and
    // updated_by/updated_at are not in the existing factual whitelist. We still
    // require actual noncurrent explicitly and change only its two whitelist
    // lifecycle fields for this one cryptographic comparison.
    if row["status"] != "superseded"
        || row["is_current"] != false
        || recorded.row_version.checked_add(1) != Some(store::version(row)?)
    {
        return Err(reconcile());
    }
    let mut comparison = sources::factual_payload(Table::Estimate, row);
    comparison["status"] = json!("effective");
    comparison["row_version"] = json!(recorded.row_version);
    if canonical_hash(&comparison)? != recorded.payload_hash {
        return Err(reconcile());
    }
    Ok("verified-single-supersede-lifecycle")
}

fn validate_frozen_source273(source: &Value) -> Result<OperatingBaselineSourceDraft, Error> {
    let draft: OperatingBaselineSourceDraft =
        serde_json::from_value(source["frozen_payload"].clone()).map_err(|_| reconcile())?;
    let payload = serde_json::to_value(&draft).map_err(|_| Error::Internal)?;
    if payload != source["frozen_payload"]
        || source["producer_version"] != 1
        || source["row_version"] != 1
        || source["id"] != draft.id.to_string()
        || source["project_id"] != draft.project_id.to_string()
        || source["original_cost_package_id"] != draft.original_cost_ref.id.to_string()
        || source["current_cost_package_id"] != draft.current_cost_ref.id.to_string()
        || source["currency"] != draft.currency
        || source["source_hash"] != draft.source_hash.as_str()
        || source["payload_hash"] != draft.payload_hash.as_str()
        || source["approved_transitions"] != payload["approvedTransitions"]
    {
        return Err(reconcile());
    }
    let mut p = payload;
    p.as_object_mut()
        .ok_or(Error::Internal)?
        .remove("payloadHash");
    if canonical_hash(&p)? != draft.payload_hash.as_str() {
        return Err(reconcile());
    }
    for key in ["id", "sourceHash"] {
        p.as_object_mut().ok_or(Error::Internal)?.remove(key);
    }
    if canonical_hash(&p)? != draft.source_hash.as_str() {
        return Err(reconcile());
    }
    Ok(draft)
}

fn frozen_economics273(
    catalog: &Catalog,
    project: Uuid,
    adopted: &BTreeSet<Uuid>,
    window: &OperatingBusinessWindow,
) -> Result<Vec<HistoricalFrozenBudgetEconomicWitness>, Error> {
    let mut witnesses = Vec::new();
    for source in catalog.all(Table::BaselineSource) {
        let raw = &source["frozen_payload"];
        let relevant = std::iter::once(&raw["originalCostRef"])
            .chain(std::iter::once(&raw["currentCostRef"]))
            .chain(
                raw["approvedTransitions"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .flat_map(|t| [&t["beforeCostRef"], &t["afterCostRef"]]),
            )
            .any(|r| {
                r["id"]
                    .as_str()
                    .and_then(|id| Uuid::parse_str(id).ok())
                    .is_some_and(|id| adopted.contains(&id))
            });
        if !relevant {
            continue;
        }
        let draft = validate_frozen_source273(source)?;
        if draft.project_id != project || !known(source, "captured_at", window) {
            return Err(reconcile());
        }
        let mut chain = vec![(
            draft.original_cost_ref.clone(),
            draft.original_baseline_cost,
        )];
        let mut previous = &draft.original_cost_ref;
        let mut value = draft.original_baseline_cost;
        let mut seen = BTreeSet::from([previous.id]);
        for transition in &draft.approved_transitions {
            if ref_key(&transition.before_cost_ref) != ref_key(previous)
                || !seen.insert(transition.after_cost_ref.id)
            {
                return Err(reconcile());
            }
            value = value.checked_add(transition.delta_net_cents)?;
            chain.push((transition.after_cost_ref.clone(), value));
            previous = &transition.after_cost_ref;
        }
        if ref_key(previous) != ref_key(&draft.current_cost_ref)
            || value != draft.current_effective_baseline_cost
        {
            return Err(reconcile());
        }
        for (recorded, value) in chain {
            if !adopted.contains(&recorded.id) {
                continue;
            }
            let actual = catalog
                .find(Table::Estimate, recorded.id)
                .ok_or_else(reconcile)?;
            let domain = actual["version"]
                .as_i64()
                .and_then(|v| i32::try_from(v).ok())
                .filter(|v| *v > 0)
                .ok_or_else(reconcile)?;
            if actual["project_id"] != project.to_string()
                || actual["currency_code"] != draft.currency
                || money(actual)? != value
                || (recorded.id == draft.original_cost_ref.id
                    && source["original_cost_package_version"] != domain)
                || (recorded.id == draft.current_cost_ref.id
                    && source["current_cost_package_version"] != domain)
            {
                return Err(reconcile());
            }
            let mode = cost_lifecycle_comparison273(actual, &recorded)?;
            witnesses.push(HistoricalFrozenBudgetEconomicWitness {
                baseline_source_ref: typed_ref(Table::BaselineSource, source)?,
                observed_cost_ref: typed_ref(Table::Estimate, actual)?,
                recorded_cost_kind: recorded.kind,
                recorded_cost_id: recorded.id,
                recorded_cost_row_version: recorded.row_version,
                recorded_cost_payload_hash: Sha256::try_from(recorded.payload_hash)?,
                verified_domain_version: domain,
                currency: draft.currency.clone(),
                net_cost: value,
                comparison_mode: mode.to_owned(),
            });
        }
    }
    witnesses.sort_by_key(|w| (w.observed_cost_ref.id, w.baseline_source_ref.id));
    if witnesses.len() > MAX_SELECTION_REFS273 {
        return Err(store::conflict("operating_source_capacity_exceeded"));
    }
    Ok(witnesses)
}

/// Complete real parent path, including technical versions never adopted by a
/// contract. They prove ancestry only; they are not monetary transitions.
fn technical_path273(catalog: &Catalog, project: Uuid, child: Uuid) -> Result<Vec<Uuid>, Error> {
    let mut out = Vec::new();
    let mut current = Some(child);
    while let Some(id) = current {
        if out.contains(&id) {
            return Err(reconcile());
        }
        let row = catalog.find(Table::Estimate, id).ok_or_else(reconcile)?;
        if row["project_id"] != project.to_string() {
            return Err(reconcile());
        }
        out.push(id);
        if out.len() > MAX_SELECTION_REFS273 {
            return Err(store::conflict("operating_source_capacity_exceeded"));
        }
        current = if row["supersedes_id"].is_null() {
            None
        } else {
            Some(store::id(row, "supersedes_id").map_err(|_| reconcile())?)
        };
        if let Some(parent) = current {
            let before = catalog
                .find(Table::Estimate, parent)
                .ok_or_else(reconcile)?;
            if before["project_id"] != row["project_id"]
                || before["version"].as_i64().ok_or_else(reconcile)?
                    >= row["version"].as_i64().ok_or_else(reconcile)?
                || required_instant(before, "created_at")? > required_instant(row, "created_at")?
            {
                return Err(reconcile());
            }
        }
    }
    Ok(out)
}

fn unique_chain273(
    catalog: &Catalog,
    project: Uuid,
    ids: &BTreeSet<Uuid>,
) -> Result<(Vec<Uuid>, Vec<Uuid>), Error> {
    if ids.is_empty() {
        return Err(reconcile());
    }
    let paths = ids
        .iter()
        .map(|id| Ok((*id, technical_path273(catalog, project, *id)?)))
        .collect::<Result<BTreeMap<_, _>, Error>>()?;
    let roots = ids
        .iter()
        .filter(|id| {
            !paths[*id]
                .iter()
                .skip(1)
                .any(|ancestor| ids.contains(ancestor))
        })
        .copied()
        .collect::<Vec<_>>();
    let latest = ids
        .iter()
        .filter(|id| {
            !paths
                .iter()
                .any(|(other, path)| other != *id && path.iter().skip(1).any(|p| p == *id))
        })
        .copied()
        .collect::<Vec<_>>();
    if roots.len() != 1 || latest.len() != 1 {
        return Err(reconcile());
    }
    let mut full = paths[&latest[0]].clone();
    let at = full
        .iter()
        .position(|id| *id == roots[0])
        .ok_or_else(reconcile)?;
    full.truncate(at + 1);
    full.reverse();
    let adopted = full
        .iter()
        .filter(|id| ids.contains(id))
        .copied()
        .collect::<Vec<_>>();
    if adopted.len() != ids.len() {
        return Err(reconcile());
    }
    Ok((adopted, full))
}

fn handover_basis273<'a>(
    catalog: &'a Catalog,
    project: Uuid,
    row: &Value,
) -> Result<&'a Value, Error> {
    let basis = catalog
        .by(Table::HandoverBasis, "id", &row["basis_snapshot_id"])
        .ok_or_else(reconcile)?;
    if basis["project_id"] != project.to_string()
        || !matches!(basis["status"].as_str(), Some("active" | "superseded"))
        || basis["version"] != row["version"]
        || basis["source_payload"]["projectId"] != project.to_string()
        || canonical_hash(&basis["source_payload"])? != store::text(basis, "payload_hash")?
        || basis["source_hash"] != row["source_payload_hash"]
        || required_instant(basis, "generated_at")? > required_instant(row, "created_at")?
    {
        return Err(reconcile());
    }
    Ok(basis)
}

fn handover_anchor273(
    catalog: &Catalog,
    project: Uuid,
    row: &Value,
    basis: &Value,
) -> Result<SourceRef, Error> {
    let term = catalog
        .by(
            Table::Term,
            "id",
            &row["effective_handover_baseline_snapshot_id"],
        )
        .ok_or_else(reconcile)?;
    let contract = catalog
        .by(Table::Contract, "id", &term["contract_id"])
        .ok_or_else(reconcile)?;
    if contract["project_id"] != project.to_string()
        || !basis["source_payload"]["members"]
            .as_array()
            .ok_or_else(reconcile)?
            .iter()
            .any(|m| m["snapshotId"] == term["id"] && m["contractId"] == contract["id"])
    {
        return Err(reconcile());
    }
    typed_ref(Table::Term, term)
}

fn handover_path273(
    catalog: &Catalog,
    project: Uuid,
    child: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<Vec<Uuid>, Error> {
    let mut out = Vec::new();
    let mut next = Some(child);
    while let Some(id) = next {
        if out.contains(&id) {
            return Err(reconcile());
        }
        let row = catalog.find(Table::Handover, id).ok_or_else(reconcile)?;
        let created = required_instant(row, "created_at")?;
        if row["project_id"] != project.to_string()
            || row["producer_version"] != 1
            || !matches!(
                row["status"].as_str(),
                Some("draft" | "confirmed" | "superseded")
            )
            || created > window.knowledge_cutoff
            || row["version"].as_i64().is_none_or(|v| v <= 0)
            || store::id(row, "confirmation_record_id").is_err()
        {
            return Err(reconcile());
        }
        if !row["confirmed_at"].is_null() {
            let confirmed = required_instant(row, "confirmed_at")?;
            if created > confirmed
                || !period_effective(confirmed, window)
                || !matches!(row["status"].as_str(), Some("confirmed" | "superseded"))
            {
                return Err(reconcile());
            }
        } else if row["status"] == "confirmed" {
            return Err(reconcile());
        }
        let basis = handover_basis273(catalog, project, row)?;
        if !effective(basis, "generated_at", window) {
            return Err(reconcile());
        }
        handover_anchor273(catalog, project, row, basis)?;
        out.push(id);
        if out.len() > MAX_SELECTION_REFS273 {
            return Err(store::conflict("operating_source_capacity_exceeded"));
        }
        next = if row["supersedes_id"].is_null() {
            None
        } else {
            Some(store::id(row, "supersedes_id").map_err(|_| reconcile())?)
        };
        if let Some(parent_id) = next {
            let parent = catalog
                .find(Table::Handover, parent_id)
                .ok_or_else(reconcile)?;
            let parent_basis = handover_basis273(catalog, project, parent)?;
            if parent["project_id"] != row["project_id"]
                || parent["version"].as_i64().ok_or_else(reconcile)?
                    >= row["version"].as_i64().ok_or_else(reconcile)?
                || required_instant(parent, "created_at")? > created
                || basis["supersedes_id"] != parent["basis_snapshot_id"]
                || required_instant(parent_basis, "generated_at")?
                    > required_instant(basis, "generated_at")?
                || matches!((instant(parent,"confirmed_at"),instant(row,"confirmed_at")),(Some(before),Some(after)) if before>after)
            {
                return Err(reconcile());
            }
        } else if !basis["supersedes_id"].is_null() {
            return Err(reconcile());
        }
    }
    Ok(out)
}

fn optional_id273(row: &Value, field: &str) -> Result<Option<Uuid>, Error> {
    if row[field].is_null() {
        Ok(None)
    } else {
        store::id(row, field).map(Some).map_err(|_| reconcile())
    }
}

/// Same membership test as the actual D ordinary-prepare seam: every former
/// contract remains on its same term. Materials, duties and added contracts
/// are not invented rebaseline transitions.
fn changed_handover_contract273(before: &Value, after: &Value) -> Result<bool, Error> {
    let old = before["source_payload"]["members"]
        .as_array()
        .ok_or_else(reconcile)?;
    let new = after["source_payload"]["members"]
        .as_array()
        .ok_or_else(reconcile)?;
    Ok(old.iter().any(|a| {
        new.iter()
            .find(|b| b["contractId"] == a["contractId"])
            .is_none_or(|b| b["snapshotId"] != a["snapshotId"])
    }))
}

fn rebaseline_chain273(
    catalog: &Catalog,
    project: Uuid,
    path: &[Uuid],
    window: &OperatingBusinessWindow,
) -> Result<Vec<HistoricalRebaselineLinkProof>, Error> {
    let latest = catalog
        .find(Table::Handover, *path.first().ok_or_else(reconcile)?)
        .ok_or_else(reconcile)?;
    let mut next = optional_id273(latest, "handover_rebaseline_record_id")?;
    let mut seen = BTreeSet::new();
    let mut proofs = Vec::new();
    while let Some(id) = next {
        if !seen.insert(id) {
            return Err(reconcile());
        }
        if seen.len() > MAX_SELECTION_REFS273 {
            return Err(store::conflict("operating_source_capacity_exceeded"));
        }
        let row = catalog.find(Table::Rebaseline, id).ok_or_else(reconcile)?;
        let created = required_instant(row, "created_at")?;
        let handled = required_instant(row, "handled_at")?;
        if row["project_id"] != project.to_string()
            || row["producer_version"] != 1
            || !matches!(row["status"].as_str(), Some("effective" | "superseded"))
            || created > handled
            || created > window.knowledge_cutoff
            || !period_effective(handled, window)
        {
            return Err(reconcile());
        }
        let source_id = store::id(row, "source_handover_id").map_err(|_| reconcile())?;
        let replacement_id = store::id(row, "replacement_handover_id").map_err(|_| reconcile())?;
        let source_at = path
            .iter()
            .position(|p| *p == source_id)
            .ok_or_else(reconcile)?;
        let replacement_at = path
            .iter()
            .position(|p| *p == replacement_id)
            .ok_or_else(reconcile)?;
        if replacement_at.checked_add(1) != Some(source_at) {
            return Err(reconcile());
        }
        let source = catalog
            .find(Table::Handover, source_id)
            .ok_or_else(reconcile)?;
        let replacement = catalog
            .find(Table::Handover, replacement_id)
            .ok_or_else(reconcile)?;
        let before = handover_basis273(catalog, project, source)?;
        let after = handover_basis273(catalog, project, replacement)?;
        let anchor = handover_anchor273(catalog, project, replacement, after)?;
        let anchor_term = catalog.find(Table::Term, anchor.id).ok_or_else(reconcile)?;
        next = optional_id273(row, "supersedes_id")?;
        if row["basis_before_id"] != before["id"]
            || row["basis_after_id"] != after["id"]
            || row["effective_baseline_after_id"] != anchor.id.to_string()
            || store::id(row, "contract_amendment_id").map_err(|_| reconcile())?
                != store::id(anchor_term, "source_amendment_id").map_err(|_| reconcile())?
            || optional_id273(replacement, "handover_rebaseline_record_id")? != Some(id)
            || optional_id273(source, "handover_rebaseline_record_id")? != next
            || required_instant(source, "created_at")? > handled
            || required_instant(replacement, "created_at")? > handled
            || instant(replacement, "confirmed_at").is_some_and(|at| handled > at)
        {
            return Err(reconcile());
        }
        let supersedes_record_ref = next
            .map(|prior_id| {
                let prior = catalog
                    .find(Table::Rebaseline, prior_id)
                    .ok_or_else(reconcile)?;
                if prior["project_id"] != project.to_string()
                    || required_instant(prior, "handled_at")? > handled
                {
                    return Err(reconcile());
                }
                typed_ref(Table::Rebaseline, prior)
            })
            .transpose()?;
        proofs.push(HistoricalRebaselineLinkProof {
            record_ref: typed_ref(Table::Rebaseline, row)?,
            source_handover_ref: typed_ref(Table::Handover, source)?,
            replacement_handover_ref: typed_ref(Table::Handover, replacement)?,
            before_basis_ref: typed_ref(Table::HandoverBasis, before)?,
            after_basis_ref: typed_ref(Table::HandoverBasis, after)?,
            effective_baseline_after_ref: anchor,
            supersedes_record_ref,
            created_at: created,
            handled_at: handled,
        });
    }
    Ok(proofs)
}

fn handover_lineage273(
    catalog: &Catalog,
    project: Uuid,
    path: &[Uuid],
    window: &OperatingBusinessWindow,
) -> Result<HistoricalHandoverLineageProof, Error> {
    let records = rebaseline_chain273(catalog, project, path, window)?;
    let mut links = Vec::new();
    for (at, id) in path.iter().enumerate() {
        let row = catalog.find(Table::Handover, *id).ok_or_else(reconcile)?;
        let basis = handover_basis273(catalog, project, row)?;
        let anchor = handover_anchor273(catalog, project, row, basis)?;
        let record_id = optional_id273(row, "handover_rebaseline_record_id")?;
        let record = record_id
            .map(|id| {
                records
                    .iter()
                    .find(|r| r.record_ref.id == id)
                    .ok_or_else(reconcile)
            })
            .transpose()?;
        let parent = path
            .get(at + 1)
            .map(|id| catalog.find(Table::Handover, *id).ok_or_else(reconcile))
            .transpose()?;
        let parent_basis = parent
            .map(|p| handover_basis273(catalog, project, p))
            .transpose()?;
        if let Some(parent) = parent {
            let parent_record = optional_id273(parent, "handover_rebaseline_record_id")?;
            if record_id == parent_record {
                if changed_handover_contract273(parent_basis.ok_or_else(reconcile)?, basis)? {
                    return Err(reconcile());
                }
                if let Some(record) = record {
                    // This is the real ordinary-prepare inheritance bridge.
                    // The record keeps its original H1/B1 anchor. H2/B2 is a
                    // proved successor, never a fabricated record replacement.
                    if anchor.id != record.effective_baseline_after_ref.id
                        || record.handled_at > required_instant(row, "created_at")?
                    {
                        return Err(reconcile());
                    }
                }
            } else {
                let record = record.ok_or_else(reconcile)?;
                if record.replacement_handover_ref.id != *id
                    || record.source_handover_ref.id != store::id(parent, "id")?
                    || record.supersedes_record_ref.as_ref().map(|r| r.id) != parent_record
                {
                    return Err(reconcile());
                }
            }
        } else if record_id.is_some() {
            return Err(reconcile());
        }
        if let Some(record) = record
            && (anchor.id != record.effective_baseline_after_ref.id
                || instant(row, "confirmed_at").is_some_and(|at| record.handled_at > at))
        {
            return Err(reconcile());
        }
        links.push(HistoricalHandoverLinkProof {
            handover_ref: typed_ref(Table::Handover, row)?,
            basis_ref: typed_ref(Table::HandoverBasis, basis)?,
            supersedes_handover_ref: parent.map(|p| typed_ref(Table::Handover, p)).transpose()?,
            basis_supersedes_ref: parent_basis
                .map(|p| typed_ref(Table::HandoverBasis, p))
                .transpose()?,
            effective_baseline_ref: anchor,
            rebaseline_ref: record.map(|r| r.record_ref.clone()),
            created_at: required_instant(row, "created_at")?,
            generated_at: required_instant(basis, "generated_at")?,
            confirmed_at: instant(row, "confirmed_at"),
        });
    }
    Ok(HistoricalHandoverLineageProof {
        handover_links: links,
        rebaseline_links: records,
    })
}

fn handover273(
    catalog: &Catalog,
    project: Uuid,
    adopted: &BTreeSet<Uuid>,
    witnesses: &[HistoricalBudgetAdoptionWitness],
    window: &OperatingBusinessWindow,
) -> Result<HistoricalHandover, Error> {
    let mut candidates = BTreeMap::new();
    for row in catalog.all(Table::Handover) {
        if row["confirmed_at"].is_null()
            && matches!(row["status"].as_str(), Some("draft" | "superseded"))
        {
            continue;
        }
        let confirmed = required_instant(row, "confirmed_at")?;
        if !period_effective(confirmed, window) {
            continue;
        }
        let id = store::id(row, "id")?;
        candidates.insert(id, handover_path273(catalog, project, id, window)?);
    }
    if candidates.is_empty() {
        return Ok(HistoricalHandover::default());
    }
    let latest = candidates
        .keys()
        .filter(|id| {
            !candidates
                .iter()
                .any(|(other, path)| other != *id && path.iter().skip(1).any(|p| p == *id))
        })
        .copied()
        .collect::<Vec<_>>();
    if latest.len() != 1 {
        return Err(reconcile());
    }
    let lineage = handover_lineage273(catalog, project, &candidates[&latest[0]], window)?;
    let row = catalog
        .find(Table::Handover, latest[0])
        .ok_or_else(reconcile)?;
    let basis = handover_basis273(catalog, project, row)?;
    let mut budgets = BTreeSet::new();
    for member in basis["source_payload"]["members"]
        .as_array()
        .ok_or_else(reconcile)?
    {
        let cost = &member["sourceFacts"]["cost"];
        let id = store::id(cost, "id").map_err(|_| reconcile())?;
        let actual = catalog.find(Table::Estimate, id).ok_or_else(reconcile)?;
        if !adopted.contains(&id)
            || actual["project_id"] != project.to_string()
            || actual["version"] != cost["version"]
            || !witnesses.iter().any(|w| {
                w.cost_ref.id == id
                    && member["contractId"] == w.contract_ref.id.to_string()
                    && member["snapshotId"] == w.term_ref.id.to_string()
                    && member["preparationId"] == w.preparation_ref.id.to_string()
                    && member["reviewApprovalId"] == w.approval_ref.id.to_string()
                    && cost["rowVersion"] == w.recorded_cost_row_version
                    && instant(basis, "generated_at").is_some_and(|at| w.adopted_at <= at)
            })
        {
            return Err(reconcile());
        }
        budgets.insert(id);
    }
    let (chain, _) = unique_chain273(catalog, project, &budgets)?;
    Ok(HistoricalHandover {
        basis: Some(typed_ref(Table::HandoverBasis, basis)?),
        rebaseline: lineage
            .rebaseline_links
            .first()
            .map(|p| p.record_ref.clone()),
        handover: Some(typed_ref(Table::Handover, row)?),
        budget: chain.last().copied(),
        lineage: Some(Box::new(lineage)),
    })
}

#[derive(Default)]
struct HistoricalHandover {
    basis: Option<SourceRef>,
    rebaseline: Option<SourceRef>,
    handover: Option<SourceRef>,
    budget: Option<Uuid>,
    lineage: Option<Box<HistoricalHandoverLineageProof>>,
}

fn execution273(
    catalog: &Catalog,
    project: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<Option<(SourceRef, DateTime<Utc>)>, Error> {
    let mut entries = Vec::new();
    for row in catalog.all(Table::ProjectStage) {
        // Shared-source collection may also contain another project's stage
        // witnesses. They do not establish this project's execution date.
        if row["project_id"] != project.to_string() {
            continue;
        }
        if row["to_stage"] != "execution" || row["event_type"] != "stage-entered" {
            continue;
        }
        let at = required_instant(row, "entered_at")?;
        if !period_effective(at, window) {
            continue;
        }
        if row["producer_version"] != 1
            || row["project_id"] != project.to_string()
            || row["from_stage"] != "handover"
            || store::id(row, "source_role_assignment_id").is_err()
            || canonical_hash(&row["source_payload"])? != store::text(row, "source_payload_hash")?
            || row["source_payload"]["projectId"] != project.to_string()
            || row["source_payload"]["sourceHandoverId"] != row["source_handover_id"]
            || row["source_payload"]["commissionRoleAssignmentId"]
                != row["source_role_assignment_id"]
            || row["source_payload"]["fromStage"] != row["from_stage"]
            || row["source_payload"]["toStage"] != row["to_stage"]
            || !known(row, "created_at", window)
            || required_instant(row, "created_at")? > at
        {
            return Err(reconcile());
        }
        let handover = catalog
            .by(Table::Handover, "id", &row["source_handover_id"])
            .ok_or_else(reconcile)?;
        if handover["project_id"] != project.to_string()
            || handover["producer_version"] != 1
            || !matches!(
                handover["status"].as_str(),
                Some("confirmed" | "superseded")
            )
            || required_instant(handover, "confirmed_at")? > at
            || store::id(handover, "confirmation_record_id").is_err()
        {
            return Err(reconcile());
        }
        entries.push((
            row["sequence_no"].as_i64().ok_or_else(reconcile)?,
            typed_ref(Table::ProjectStage, row)?,
            at,
        ));
    }
    entries.sort_by_key(|entry| entry.0);
    if entries
        .windows(2)
        .any(|pair| pair[0].0 >= pair[1].0 || pair[0].2 > pair[1].2)
    {
        return Err(reconcile());
    }
    Ok(entries
        .first()
        .map(|(_, reference, at)| (reference.clone(), *at)))
}

/// The same pure choice is used by coherent preparation and the fully locked
/// command. Current G flags and G capture dates are not selection authority.
pub(crate) fn select(
    catalog: &Catalog,
    project: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<HistoricalSelection, Error> {
    let period_key = window.period_key.as_ref().ok_or_else(reconcile)?.clone();
    let temporal = temporal_facts(catalog)?;
    let AdoptionCandidates273 {
        witnesses,
        excluded,
    } = adoptions273(catalog, project, window)?;
    let ids = witnesses
        .iter()
        .filter(|w| w.eligible_for_period)
        .map(|w| w.cost_ref.id)
        .collect::<BTreeSet<_>>();
    let (chain, full_path) = unique_chain273(catalog, project, &ids)?;
    let original_id = *chain.first().ok_or_else(reconcile)?;
    let selected_id = *chain.last().ok_or_else(reconcile)?;
    let original_row = catalog
        .find(Table::Estimate, original_id)
        .ok_or_else(reconcile)?;
    let selected_row = catalog
        .find(Table::Estimate, selected_id)
        .ok_or_else(reconcile)?;
    let currency = store::text(original_row, "currency_code")?.to_owned();
    if currency.len() != 3 || !currency.bytes().all(|b| b.is_ascii_uppercase()) {
        return Err(reconcile());
    }
    for id in &ids {
        if catalog
            .find(Table::Estimate, *id)
            .is_none_or(|r| r["currency_code"] != currency)
        {
            return Err(reconcile());
        }
    }
    for id in &ids {
        money(catalog.find(Table::Estimate, *id).ok_or_else(reconcile)?)?;
    }
    let frozen_economic_witnesses = frozen_economics273(catalog, project, &ids, window)?;
    let handover_proof = handover273(catalog, project, &ids, &witnesses, window)?;
    let execution = execution273(catalog, project, window)?;
    let mut transitions = Vec::new();
    let mut segments = Vec::new();
    let mut execution_amount = OperatingMoneyCents::from_cents(0, "executionChangePackageTotal")?;
    let mut changes = OperatingMoneyCents::from_cents(0, "changePackageTotal")?;
    for pair in chain.windows(2) {
        let before = catalog
            .find(Table::Estimate, pair[0])
            .ok_or_else(reconcile)?;
        let after = catalog
            .find(Table::Estimate, pair[1])
            .ok_or_else(reconcile)?;
        let amount = money(after)?.checked_sub(money(before)?)?;
        let after_witnesses = witnesses
            .iter()
            .filter(|w| w.cost_ref.id == pair[1] && w.eligible_for_period)
            .collect::<Vec<_>>();
        let adopted_at = after_witnesses
            .iter()
            .map(|w| w.adopted_at)
            .min()
            .ok_or_else(reconcile)?;
        let mut approval_refs = Vec::new();
        let mut seen = BTreeSet::new();
        for witness in after_witnesses {
            for reference in [
                &witness.term_ref,
                &witness.preparation_ref,
                &witness.review_binding_ref,
            ] {
                if seen.insert(ref_key(reference)) {
                    approval_refs.push(reference.clone());
                }
            }
        }
        let start = full_path
            .iter()
            .position(|id| *id == pair[0])
            .ok_or_else(reconcile)?;
        let end = full_path
            .iter()
            .position(|id| *id == pair[1])
            .ok_or_else(reconcile)?;
        let path = full_path
            .get(start..=end)
            .ok_or_else(reconcile)?
            .iter()
            .map(|id| {
                typed_ref(
                    Table::Estimate,
                    catalog.find(Table::Estimate, *id).ok_or_else(reconcile)?,
                )
            })
            .collect::<Result<Vec<_>, _>>()?;
        segments.push(HistoricalBudgetChainSegment {
            before_cost_ref: typed_ref(Table::Estimate, before)?,
            after_cost_ref: typed_ref(Table::Estimate, after)?,
            technical_path_refs: path,
            adopted_at,
        });
        transitions.push(ApprovedProjectCostTransition {
            before_cost_ref: typed_ref(Table::Estimate, before)?,
            after_cost_ref: typed_ref(Table::Estimate, after)?,
            approval_source_refs: approval_refs,
            delta_net_cents: amount,
        });
        changes = changes.checked_add(amount)?;
        if execution.as_ref().is_some_and(|(_, at)| adopted_at >= *at) {
            execution_amount = execution_amount.checked_add(amount)?;
        }
    }
    let original = money(original_row)?;
    let current = money(selected_row)?;
    if original.checked_add(changes)? != current {
        return Err(reconcile());
    }
    let handover = handover_proof
        .budget
        .map(|id| {
            catalog
                .find(Table::Estimate, id)
                .ok_or_else(reconcile)
                .and_then(money)
        })
        .transpose()?
        .unwrap_or(original);
    let adoption_refs = sorted_refs(
        witnesses
            .iter()
            .flat_map(|w| {
                [
                    w.cost_ref.clone(),
                    w.contract_ref.clone(),
                    w.term_ref.clone(),
                    w.preparation_ref.clone(),
                    w.review_binding_ref.clone(),
                    w.approval_ref.clone(),
                ]
            })
            .collect(),
    )?;
    let technical_refs = sorted_refs(
        technical_path273(catalog, project, selected_id)?
            .into_iter()
            .map(|id| {
                typed_ref(
                    Table::Estimate,
                    catalog.find(Table::Estimate, id).ok_or_else(reconcile)?,
                )
            })
            .collect::<Result<Vec<_>, _>>()?,
    )?;
    let mut proof = HistoricalPeriodSelectionProof {
        schema_version: 1,
        policy_version: POLICY_VERSION273.to_owned(),
        policy_source_hash: policy_hash273()?,
        period_key,
        business_cutoff: window.business_cutoff,
        selection_hash: Sha256::try_from("0".repeat(64))?,
        original_cost_ref: typed_ref(Table::Estimate, original_row)?,
        selected_cost_ref: typed_ref(Table::Estimate, selected_row)?,
        adoption_source_refs: adoption_refs,
        technical_lineage_refs: technical_refs,
        observed_adoptions: witnesses,
        excluded_adoption_candidates: excluded,
        temporal_source_facts: temporal,
        chain_segments: segments,
        handover_basis_ref: handover_proof.basis,
        handover_rebaseline_ref: handover_proof.rebaseline,
        handover_ref: handover_proof.handover,
        execution_stage_ref: execution.map(|(reference, _)| reference),
        handover_lineage: handover_proof.lineage,
        frozen_economic_witnesses,
    };
    let mut hash_input = serde_json::to_value(&proof).map_err(|_| Error::Internal)?;
    hash_input
        .as_object_mut()
        .ok_or(Error::Internal)?
        .remove("selectionHash");
    proof.selection_hash = Sha256::try_from(canonical_hash(
        &json!({"projectId":project,"selection":hash_input}),
    )?)?;
    Ok(HistoricalSelection {
        proof,
        currency,
        transitions,
        original,
        handover,
        execution: execution_amount,
        changes,
        current,
    })
}

pub(crate) fn hash_input(
    catalog: &Catalog,
    project: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<Value, Error> {
    let temporal = temporal_facts(catalog)?;
    let selection = match select(catalog, project, window) {
        Ok(selected) => json!({"status":"selected","selectionHash":selected.proof.selection_hash}),
        Err(Error::CodedConflict { code, .. }) => json!({"status":"blocked","reasonCode":code}),
        Err(error) => return Err(error),
    };
    Ok(
        json!({"policyVersion":POLICY_VERSION273,"policySourceHash":policy_hash273()?,"periodKey":window.period_key,"businessCutoff":window.business_cutoff,"temporalFacts":temporal,"choice":selection}),
    )
}

#[cfg(test)]
mod tests;
