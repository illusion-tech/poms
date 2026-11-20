//! First historical close: business attribution is the complete source set.
//! Generation/handling instants remain real; no synthetic business date is made.
use super::{
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{
    contract_support::{Error, canonical_hash},
    project_cost_governance::{
        AllocationShare, allocate_source_layers, allocation_decimal, allocation_totals,
    },
    project_operating_common::model::{OperatingBusinessWindow, OperatingPreparationIntent},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Timing {
    Realtime,
    FirstPeriod(DateTime<Utc>),
    Restatement,
}
impl Timing {
    pub(crate) fn for_intent(
        intent: &OperatingPreparationIntent,
        window: &OperatingBusinessWindow,
    ) -> Self {
        if super::preparation::is_first_period(intent) {
            Self::FirstPeriod(window.knowledge_cutoff)
        } else if matches!(intent, OperatingPreparationIntent::Restatement { .. }) {
            Self::Restatement
        } else {
            Self::Realtime
        }
    }

    pub(crate) fn for_capture(
        mode: &str,
        first_period: bool,
        window: &OperatingBusinessWindow,
    ) -> Self {
        if first_period {
            Self::FirstPeriod(window.knowledge_cutoff)
        } else if mode == "restated" {
            Self::Restatement
        } else {
            Self::Realtime
        }
    }
}

pub(crate) struct Trace {
    pub(crate) references: Vec<Value>,
    temporal_facts: Vec<Value>,
}
impl Trace {
    fn finish(mut self) -> Self {
        self.references.sort_by_key(Value::to_string);
        self.references.dedup();
        self.temporal_facts.sort_by_key(Value::to_string);
        self.temporal_facts.dedup();
        self
    }
    pub(crate) fn hash_input(&self) -> Value {
        json!({"sourceRefs":self.references,"temporalFacts":self.temporal_facts})
    }
}
pub(crate) enum Qualification {
    Eligible(Trace),
    FutureBusiness,
}
fn unverified() -> Error {
    store::conflict("operating_late_allocation_unverified")
}
fn need(test: bool) -> Result<(), Error> {
    if test { Ok(()) } else { Err(unverified()) }
}
fn instant(value: &Value) -> Result<DateTime<Utc>, Error> {
    DateTime::parse_from_rfc3339(value.as_str().ok_or_else(unverified)?)
        .map(|v| v.with_timezone(&Utc))
        .map_err(|_| unverified())
}
fn decimal(value: &Value, scale: u32) -> Result<i128, Error> {
    allocation_decimal(
        value.as_str().ok_or_else(unverified)?,
        scale,
        999_999_999_999_999_999,
    )
    .map_err(|_| unverified())
}
fn layers(row: &Value, fields: [&str; 3]) -> Result<[Option<i128>; 3], Error> {
    let mut out = [None; 3];
    for (i, field) in fields.into_iter().enumerate() {
        if !row[field].is_null() {
            out[i] = Some(decimal(&row[field], 2)?);
        }
    }
    // The producer's own exact-money validator also verifies net + tax = gross.
    allocation_totals(&[out]).map_err(|_| unverified())?;
    Ok(out)
}
fn payload_layers(value: &Value) -> Result<[Option<i128>; 3], Error> {
    let values = value
        .as_array()
        .filter(|v| v.len() == 3)
        .ok_or_else(unverified)?;
    let mut out = [None; 3];
    for (i, v) in values.iter().enumerate() {
        if !v.is_null() {
            out[i] = Some(decimal(v, 2)?);
        }
    }
    allocation_totals(&[out]).map_err(|_| unverified())?;
    Ok(out)
}
fn observe(
    trace: &mut Trace,
    table: Table,
    row: &Value,
    knowledge: DateTime<Utc>,
) -> Result<(), Error> {
    let created = instant(&row["created_at"])?;
    need(created <= knowledge)?;
    let mut times =
        json!({"sourceRef":sources::reference(table,row)?,"createdAt":row["created_at"]});
    for field in ["effective_at", "updated_at"] {
        if !row[field].is_null() {
            let time = instant(&row[field])?;
            need(time >= created && time <= knowledge)?;
            times[field] = row[field].clone();
        }
    }
    trace.references.push(sources::reference(table, row)?);
    trace.temporal_facts.push(times);
    Ok(())
}
fn evidence<'a>(
    catalog: &'a Catalog,
    row: &Value,
    kind: &str,
    trace: &mut Trace,
    knowledge: DateTime<Utc>,
) -> Result<&'a Value, Error> {
    let proof = catalog
        .by(Table::Evidence, "id", &row["governance_evidence_id"])
        .ok_or_else(unverified)?;
    need(
        proof["schema_version"] == 1
            && proof["target_type"] == kind
            && proof["target_id"] == row["id"]
            && proof["evidence_kind"] == "source-facts"
            && proof["payload_hash"] == canonical_hash(&proof["frozen_payload"])?
            && !store::text(proof, "reason")?.trim().is_empty()
            && proof["actor_id"] == row["created_by"]
            && proof["request_id"].as_str().is_some_and(|s| !s.is_empty())
            && if kind == "SharedCostAllocationBasis" {
                proof["project_id"].is_null()
            } else {
                proof["project_id"] == row["project_id"]
            },
    )?;
    observe(trace, Table::Evidence, proof, knowledge)?;
    Ok(&proof["frozen_payload"])
}

fn source_proof(captured: &Value) -> Result<(), Error> {
    let cost = &captured["cost"];
    let source = &captured["source"];
    let proof = &source["governanceVersionProof"];
    let original = &cost["source_basis"]["sourcePayload"];
    let current = &source["sourcePayload"];
    let positive = |v: &Value| v.as_i64().filter(|n| *n > 0).ok_or_else(unverified);
    let initial = positive(&cost["source_basis"]["sourceRowVersion"])?;
    let version = positive(&source["sourceRowVersion"])?;
    let prior = positive(&proof["previousCertifiedVersion"])?;
    need(
        original.is_object()
            && current.is_object()
            && initial <= prior
            && prior <= version
            && original["id"] == cost["source_id"]
            && current["id"] == cost["source_id"]
            && original["row_version"].as_i64() == Some(initial)
            && current["row_version"].as_i64() == Some(version)
            && proof["costRecordId"] == cost["id"]
            && proof["sourceType"] == source["sourceType"]
            && proof["sourceId"] == source["sourceId"]
            && proof["capturedVersion"].as_i64() == Some(initial)
            && proof["currentVersion"].as_i64() == Some(version)
            && proof["capturedPayloadHash"] == canonical_hash(original)?
            && proof["currentPayloadHash"] == canonical_hash(current)?
            && proof["sourcePayload"] == *current,
    )?;
    // Invoke E's actual pure economic transition guard. The immutable F
    // certificate is not a license to reinterpret a price/identity change.
    crate::project_actual_cost::compare_source_transition(cost, original, current)?;
    if prior == version {
        need(
            proof["reason"] == "unchanged"
                && proof["previousPayloadHash"] == proof["currentPayloadHash"],
        )?;
    } else {
        need(
            matches!(
                proof["reason"].as_str(),
                Some("payable-payment-progress-only" | "rate-superseded-covered-period")
            ) && proof["previousPayloadHash"]
                .as_str()
                .is_some_and(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())),
        )?;
    }
    Ok(())
}

/// Only called for an actually late, current first-close result. A lawful
/// F-create is a root; a replacement proves every predecessor, without making
/// historical frozen source metadata pretend to be current typed SourceRefs.
pub(crate) fn qualify(
    catalog: &Catalog,
    result: &Value,
    cutoff: NaiveDate,
    knowledge: DateTime<Utc>,
) -> Result<Qualification, Error> {
    let mut trace = Trace {
        references: vec![],
        temporal_facts: vec![],
    };
    let mut basis_id = store::id(result, "basis_id")?;
    let mut seen = BTreeSet::new();
    let mut latest = true;
    let mut future = false;
    loop {
        need(seen.insert(basis_id))?;
        let basis = catalog
            .find(Table::AllocationBasis, basis_id)
            .ok_or_else(unverified)?;
        need(
            basis["governance_schema_version"] == 1
                && basis["allocation_algorithm"] == "largest-remainder-cents-v1"
                && basis["status"] == if latest { "active" } else { "superseded" }
                && basis["currency"].as_str().is_some_and(|s| !s.is_empty()),
        )?;
        store::id(basis, "replacement_operation_id")?;
        observe(&mut trace, Table::AllocationBasis, basis, knowledge)?;
        let proof = evidence(
            catalog,
            basis,
            "SharedCostAllocationBasis",
            &mut trace,
            knowledge,
        )?;
        need(
            proof["algorithm"] == basis["allocation_algorithm"]
                && proof["currency"] == basis["currency"]
                && proof["measurementBasis"] == basis["measurement_basis"]
                && proof["predecessorBasisId"] == basis["supersedes_id"],
        )?;
        let previous = if basis["supersedes_id"].is_null() {
            None
        } else {
            Some(store::id(basis, "supersedes_id")?)
        };
        if previous.is_some() {
            need(
                basis["replacement_reason"]
                    .as_str()
                    .is_some_and(|s| !s.trim().is_empty()),
            )?;
        }
        let members = catalog
            .all(Table::AllocationSource)
            .iter()
            .filter(|s| s["basis_id"] == basis["id"])
            .collect::<Vec<_>>();
        let frozen = proof["sources"]
            .as_array()
            .filter(|v| !v.is_empty())
            .ok_or_else(unverified)?;
        need(members.len() == frozen.len())?;
        let version_proofs = frozen
            .iter()
            .map(|s| s["source"]["governanceVersionProof"].clone())
            .collect::<Vec<_>>();
        need(
            version_proofs.iter().all(Value::is_object)
                && proof["sourceVersionTransitions"] == json!(version_proofs),
        )?;
        let mut ids = BTreeSet::new();
        let mut amounts = Vec::new();
        for member in members {
            let cost_id = store::id(member, "cost_record_id")?;
            need(ids.insert(cost_id))?;
            let captured = frozen
                .iter()
                .find(|v| v["cost"]["id"] == member["cost_record_id"])
                .ok_or_else(unverified)?;
            source_proof(captured)?;
            need(
                member["source_payload"] == *captured
                    && member["source_payload_hash"] == canonical_hash(captured)?
                    && member["cost_row_version"] == captured["cost"]["row_version"]
                    && member["source_id"] == captured["cost"]["source_id"]
                    && member["source_type"] == captured["cost"]["source_type"]
                    && member["source_row_version"] == captured["source"]["sourceRowVersion"]
                    && member["source_id"] == captured["source"]["sourceId"]
                    && member["source_type"] == captured["source"]["sourceType"]
                    && captured["source"]["currency"] == basis["currency"]
                    && captured["source"]["occurredOn"] == captured["cost"]["occurred_on"]
                    && member["currency"] == basis["currency"]
                    && captured["cost"]["currency"] == basis["currency"]
                    && member["is_current"] == latest,
            )?;
            let money = layers(
                member,
                [
                    "amount_excluding_tax",
                    "tax_cost_amount",
                    "amount_including_tax",
                ],
            )?;
            need(
                money
                    == layers(
                        &captured["cost"],
                        [
                            "amount_excluding_tax",
                            "tax_cost_amount",
                            "amount_including_tax",
                        ],
                    )?,
            )?;
            need(
                money
                    == layers(
                        &captured["source"],
                        ["amountExcludingTax", "taxCostAmount", "amountIncludingTax"],
                    )?,
            )?;
            observe(&mut trace, Table::AllocationSource, member, knowledge)?;
            amounts.push(money);
            if latest {
                let cost = catalog.find(Table::Cost, cost_id).ok_or_else(unverified)?;
                need(
                    cost["row_version"] == member["cost_row_version"]
                        && matches!(
                            cost["record_status"].as_str(),
                            Some("confirmed" | "included")
                        )
                        && cost["source_id"] == member["source_id"]
                        && cost["source_type"] == member["source_type"]
                        && cost["currency"] == basis["currency"]
                        && cost["occurred_on"] == captured["cost"]["occurred_on"]
                        && money
                            == layers(
                                cost,
                                [
                                    "amount_excluding_tax",
                                    "tax_cost_amount",
                                    "amount_including_tax",
                                ],
                            )?,
                )?;
                observe(&mut trace, Table::Cost, cost, knowledge)?;
                if sources::business_day(&cost["occurred_on"])? > cutoff {
                    future = true;
                }
            }
        }
        let totals = allocation_totals(&amounts).map_err(|_| unverified())?;
        need(
            totals
                == layers(
                    basis,
                    [
                        "source_amount_excluding_tax",
                        "source_tax_cost_amount",
                        "source_amount_including_tax",
                    ],
                )?
                && totals == payload_layers(&proof["totals"])?,
        )?;
        let mut cost_ids = ids.iter().map(Uuid::to_string).collect::<Vec<_>>();
        cost_ids.sort();
        use sha2::{Digest, Sha256};
        let scope_hash = Sha256::digest(cost_ids.join("|").as_bytes())
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        need(basis["source_cost_scope_key"] == format!("cost-scope:{scope_hash}"))?;
        let layer = match basis["measurement_basis"].as_str() {
            Some("excluding-tax") => 0,
            Some("tax") => 1,
            Some("including-tax") => 2,
            _ => return Err(unverified()),
        };
        need(totals[layer] == Some(decimal(&basis["measurement_amount"], 2)?))?;
        let items = proof["projectShares"]
            .as_array()
            .filter(|v| !v.is_empty())
            .ok_or_else(unverified)?;
        let mut shares = Vec::new();
        let mut projects = BTreeSet::new();
        for item in items {
            let project = store::id(item, "projectId")?;
            need(projects.insert(project))?;
            shares.push(AllocationShare {
                project: *project.as_bytes(),
                weight: decimal(&item["allocationWeight"], 6)?,
            });
        }
        let peers = catalog
            .all(Table::AllocationResult)
            .iter()
            .filter(|r| r["basis_id"] == basis["id"])
            .collect::<Vec<_>>();
        need(peers.len() == projects.len())?;
        let policy2 = proof["allocationPolicy"]["id"] == "selected-measurement-first"
            && proof["allocationPolicy"]["version"] == 2;
        need(policy2 || (!latest && proof.get("allocationPolicy").is_none()))?;
        if policy2 {
            let components = if layer == 2 {
                "gross-cap-net-tax-complement"
            } else {
                "independent-components-gross-sum"
            };
            need(
                proof["allocationPolicy"]
                    == json!({"id":"selected-measurement-first","version":2,
                "measurementBasis":basis["measurement_basis"],"grossComponents":components,
                "tieBreak":"project-uuid-bytes-ascending","secondaryQuota":"bounded-largest-deficit"}),
            )?;
        }
        let exact = if policy2 {
            Some(allocate_source_layers(totals, &shares, layer).map_err(|_| unverified())?)
        } else {
            None
        };
        let mut allocated_layers = Vec::new();
        let mut actual_projects = BTreeSet::new();
        for peer in peers {
            let project = store::id(peer, "project_id")?;
            need(
                actual_projects.insert(project)
                    && projects.contains(&project)
                    && peer["status"] == if latest { "active" } else { "superseded" }
                    && peer["governance_schema_version"] == 1
                    && peer["currency"] == basis["currency"]
                    && peer["replacement_operation_id"] == basis["replacement_operation_id"]
                    && peer["effective_at"] == basis["effective_at"]
                    && peer["created_at"] == basis["created_at"],
            )?;
            observe(&mut trace, Table::AllocationResult, peer, knowledge)?;
            let p = evidence(
                catalog,
                peer,
                "SharedCostAllocationResult",
                &mut trace,
                knowledge,
            )?;
            let item = items
                .iter()
                .find(|i| i["projectId"] == peer["project_id"])
                .ok_or_else(unverified)?;
            let peer_layers = layers(
                peer,
                [
                    "allocated_amount_excluding_tax",
                    "allocated_tax_cost_amount",
                    "allocated_amount_including_tax",
                ],
            )?;
            need(
                p["basisId"] == basis["id"]
                    && p["basisEvidenceId"] == basis["governance_evidence_id"]
                    && p["allocation"] == *item
                    && p["allocationPolicy"] == proof["allocationPolicy"]
                    && p["sourceVersionTransitions"] == proof["sourceVersionTransitions"]
                    && decimal(&item["allocationWeight"], 6)?
                        == decimal(&peer["allocation_weight"], 6)?
                    && peer_layers == payload_layers(&p["layers"])?
                    && decimal(&peer["allocated_amount"], 2)? == decimal(&p["amount"], 2)?
                    && decimal(&peer["allocation_ratio"], 6)? == decimal(&p["ratio"], 6)?
                    && peer["residual_minor_units"] == p["residualMinorUnits"]
                    && peer["supersedes_id"] == p["predecessorResultId"],
            )?;
            if let Some(exact) = exact.as_ref() {
                let expected = exact
                    .iter()
                    .find(|r| r.project == *project.as_bytes())
                    .ok_or_else(unverified)?;
                need(
                    peer_layers == expected.layers
                        && decimal(&peer["allocated_amount"], 2)? == expected.amount
                        && decimal(&peer["allocation_ratio"], 6)? == expected.ratio
                        && peer["residual_minor_units"].as_i64()
                            == Some(i64::from(expected.residual)),
                )?;
            }
            match previous {
                None => need(peer["supersedes_id"].is_null())?,
                Some(id) => {
                    let ancestors = catalog
                        .all(Table::AllocationResult)
                        .iter()
                        .filter(|r| {
                            r["basis_id"] == id.to_string() && r["project_id"] == peer["project_id"]
                        })
                        .collect::<Vec<_>>();
                    if ancestors.is_empty() {
                        need(peer["supersedes_id"].is_null())?;
                    } else {
                        need(
                            ancestors.len() == 1
                                && peer["supersedes_id"] == ancestors[0]["id"]
                                && instant(&ancestors[0]["created_at"])?
                                    <= instant(&peer["created_at"])?,
                        )?;
                    }
                }
            }
            allocated_layers.push(peer_layers);
        }
        need(
            actual_projects == projects
                && allocation_totals(&allocated_layers).map_err(|_| unverified())? == totals,
        )?;
        if latest {
            need(
                catalog
                    .find(Table::AllocationResult, store::id(result, "id")?)
                    .is_some_and(|r| r == result)
                    && result["basis_id"] == basis["id"],
            )?;
        }
        match previous {
            None => break,
            Some(id) => {
                let parent = catalog
                    .find(Table::AllocationBasis, id)
                    .ok_or_else(unverified)?;
                need(instant(&parent["created_at"])? <= instant(&basis["created_at"])?)?;
                basis_id = id;
                latest = false;
            }
        }
    }
    Ok(if future {
        Qualification::FutureBusiness
    } else {
        Qualification::Eligible(trace.finish())
    })
}

/// Stable hashes bind the actual observations, not the moving GET clock.
pub(crate) fn input_evidence(
    catalog: &Catalog,
    project: Uuid,
    window: &OperatingBusinessWindow,
) -> Result<Value, Error> {
    let mut observations = Vec::new();
    for result in catalog.all(Table::AllocationResult) {
        if result["project_id"] == project.to_string()
            && matches!(result["status"].as_str(), Some("active" | "pending"))
            && sources::business_day(&result["effective_at"])? > window.business_cutoff
        {
            if let Ok(Qualification::Eligible(trace)) = qualify(
                catalog,
                result,
                window.business_cutoff,
                window.knowledge_cutoff,
            ) {
                observations.push(json!({"resultRef":sources::reference(Table::AllocationResult,result)?,"qualification":trace.hash_input()}));
            }
            // Include the whole relevant actual graph even on a blocked GET.
            // Qualification still fails closed independently in source_rows and
            // capture; stale/damaged evidence cannot be changed under its hash.
            for table in [
                Table::AllocationBasis,
                Table::AllocationResult,
                Table::AllocationSource,
                Table::Evidence,
                Table::Cost,
            ] {
                for row in catalog.all(table) {
                    observations.push(json!({"sourceRef":sources::reference(table,row)?,"createdAt":row["created_at"],"updatedAt":row["updated_at"],"effectiveAt":row["effective_at"]}));
                }
            }
        }
    }
    observations.sort_by_key(Value::to_string);
    observations.dedup();
    Ok(Value::Array(observations))
}

#[cfg(test)]
mod tests;
