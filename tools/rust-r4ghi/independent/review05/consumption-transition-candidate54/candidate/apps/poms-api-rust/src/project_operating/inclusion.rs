//! Explicit classification and one-time actual E/F consumption CAS.
use super::{
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    auth::model::clock_now,
    contract_support::{Actor, Error, canonical_hash, new_uuid},
    project_operating_common::model::{
        CorrectionKind, CostDecisionInput, ExpectedRef, OperatingMoneyCents, SourceRef,
        VerifiedProducerTransition,
    },
};
use chrono::NaiveDate;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

pub(crate) fn unit_key(table: Table, row: &Value) -> Result<String, Error> {
    Ok(format!(
        "{}:{}",
        if table == Table::Cost {
            "cost"
        } else {
            "allocation"
        },
        store::id(row, "id")?
    ))
}
pub(crate) fn current_decision<'a>(
    catalog: &'a Catalog,
    project: Uuid,
    key: &str,
) -> Option<&'a Value> {
    catalog
        .all(Table::DecisionHead)
        .iter()
        .find(|h| h["project_id"] == project.to_string() && h["unit_key"] == key)
        .and_then(|h| catalog.by(Table::Decision, "id", &h["decision_id"]))
}
pub(crate) fn canonical_key(cost: &Value) -> Result<String, Error> {
    Ok(if cost["source_type"] == "labor" {
        format!("labor:{}", store::id(cost, "id")?)
    } else {
        format!(
            "{}:{}",
            store::text(cost, "source_type")?,
            store::id(cost, "source_id")?
        )
    })
}
pub(crate) fn chain_key(cost: &Value) -> Result<String, Error> {
    if cost["source_type"] == "payable-record" {
        return Ok(format!("payable:{}", store::id(cost, "source_id")?));
    }
    if let Some(id) = cost["source_basis"]["payableRecordId"].as_str() {
        return Ok(format!("payable:{id}"));
    }
    canonical_key(cost)
}

pub(crate) async fn qualify_cost(
    session: &mut CommonSession<'_, '_>,
    catalog: &Catalog,
    cost: &Value,
    cutoff: NaiveDate,
) -> Result<(), Error> {
    if !matches!(
        cost["record_status"].as_str(),
        Some("confirmed" | "included")
    ) || cost["basis_origin"] != "captured"
        || cost["confirmed_at"].is_null()
        || cost["confirmed_by"].is_null()
    {
        return Err(store::conflict("operating_cost_not_confirmed"));
    }
    if sources::business_day(&cost["occurred_on"])? > cutoff {
        return Err(store::conflict("operating_cost_outside_cutoff"));
    }
    let facts = crate::project_actual_cost::source_facts(session.connection, cost, false).await?;
    for (old, new) in [
        ("amount_excluding_tax", "amountExcludingTax"),
        ("tax_cost_amount", "taxCostAmount"),
        ("amount_including_tax", "amountIncludingTax"),
    ] {
        let a = OperatingMoneyCents::parse_exact(store::text(cost, old)?, old)?;
        let b = OperatingMoneyCents::parse_exact(store::text(&facts, new)?, old)?;
        if a.cents() != b.cents() || a.cents() < 0 {
            return Err(store::conflict("operating_cost_source_amount_changed"));
        }
    }
    let net =
        OperatingMoneyCents::parse_exact(store::text(cost, "amount_excluding_tax")?, "costNet")?;
    let tax = OperatingMoneyCents::parse_exact(store::text(cost, "tax_cost_amount")?, "costTax")?;
    let gross =
        OperatingMoneyCents::parse_exact(store::text(cost, "amount_including_tax")?, "costGross")?;
    if net.checked_add(tax)?.cents() != gross.cents() {
        return Err(store::conflict("operating_cost_layers_inconsistent"));
    }
    let stage =
        stage(catalog, cost).ok_or_else(|| store::conflict("operating_cost_stage_missing"))?;
    if stage["governance_schema_version"] != 1
        || stage["attributed_stage"] != cost["execution_stage_code"]
        || cost["stage_derived_from_type"] != "CostStageAttributionSnapshot"
        || cost["stage_derived_from_id"] != stage["id"]
        || stage["handled_at"].is_null()
        || stage["handled_by"].is_null()
        || sources::business_day(&stage["evidence_business_date"])?
            != sources::business_day(&cost["occurred_on"])?
    {
        return Err(store::conflict("operating_cost_stage_unverified"));
    }
    let evidence = catalog
        .by(Table::Evidence, "id", &stage["governance_evidence_id"])
        .ok_or_else(|| store::conflict("operating_cost_stage_evidence_missing"))?;
    if evidence["schema_version"] != 1
        || evidence["target_id"] != stage["id"]
        || evidence["payload_hash"] != canonical_hash(&evidence["frozen_payload"])?
    {
        return Err(store::conflict("operating_cost_stage_evidence_changed"));
    }
    Ok(())
}

pub(crate) fn stage<'a>(catalog: &'a Catalog, cost: &Value) -> Option<&'a Value> {
    catalog
        .all(Table::Stage)
        .iter()
        .find(|s| s["cost_record_id"] == cost["id"] && s["status"] == "active")
}

pub(crate) async fn apply(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    inputs: &[CostDecisionInput],
    catalog: &Catalog,
    cutoff: NaiveDate,
    restatement: bool,
    actor: &Actor,
) -> Result<(), Error> {
    apply_with_predecessors(
        session,
        project,
        inputs,
        catalog,
        cutoff,
        restatement,
        actor,
        &BTreeMap::new(),
    )
    .await
}

#[expect(
    clippy::too_many_arguments,
    reason = "Source predecessors and explicit inclusion choices are separate transaction inputs."
)]
pub(crate) async fn apply_with_predecessors(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    inputs: &[CostDecisionInput],
    catalog: &Catalog,
    cutoff: NaiveDate,
    restatement: bool,
    actor: &Actor,
    predecessors: &BTreeMap<Uuid, Uuid>,
) -> Result<(), Error> {
    let mut seen = BTreeSet::new();
    let members = catalog.members()?;
    for input in inputs {
        let table = match input.target.kind.as_str() {
            "ProjectActualCostRecord" => Table::Cost,
            "SharedCostAllocationResult" => Table::AllocationResult,
            _ => {
                return Err(Error::Unprocessable(
                    "Unsupported classification target".into(),
                ));
            }
        };
        if !seen.insert((table, input.target.id)) {
            return Err(Error::Unprocessable(
                "Duplicate classification target".into(),
            ));
        }
        let original = catalog
            .find(table, input.target.id)
            .ok_or_else(|| store::conflict("operating_classification_target_missing"))?;
        if original["project_id"] != project.to_string() {
            return Err(store::conflict("operating_classification_project_mismatch"));
        }
        sources::assert_expected(
            &sources::reference(table, original)?,
            &serde_json::to_value(&input.target).map_err(|_| Error::Internal)?,
        )?;
        let key = unit_key(table, original)?;
        let head = catalog
            .all(Table::DecisionHead)
            .iter()
            .find(|h| h["project_id"] == project.to_string() && h["unit_key"] == key);
        let head_version = head.and_then(|h| h["row_version"].as_i64()).unwrap_or(0);
        let decision_version = current_decision(catalog, project, &key)
            .map(store::version)
            .transpose()?
            .unwrap_or(0);
        if decision_version != input.expected_version {
            return Err(store::conflict("operating_classification_head_changed"));
        }
        let prior = current_decision(catalog, project, &key);
        if prior.is_some_and(|prior| decision_unchanged(input, prior)) {
            continue;
        }
        if prior.is_some() && !restatement {
            return Err(store::conflict("operating_restatement_required"));
        }
        let decision = input.decision.as_str();
        let role = input.recognition_role.as_str();
        if input.reason_text.trim().is_empty() {
            return Err(Error::Unprocessable(
                "A classification reason is required".into(),
            ));
        }
        for evidence in input
            .evidence_refs
            .iter()
            .chain(input.supporting_source_refs.iter())
        {
            let expected = serde_json::to_value(evidence).map_err(|_| Error::Internal)?;
            if !members
                .iter()
                .any(|(r, _)| sources::assert_expected(r, &expected).is_ok())
            {
                return Err(store::conflict("operating_classification_evidence_changed"));
            }
        }
        if matches!(role, "tax-support" | "evidence-only") {
            if decision != "exclude" {
                return Err(Error::Unprocessable(
                    "Supporting evidence cannot be an included principal".into(),
                ));
            }
            let primary = input.primary_cost_ref.as_ref().ok_or_else(|| {
                Error::Unprocessable("Supporting evidence requires a real primary cost".into())
            })?;
            let actual = catalog
                .find(Table::Cost, primary.id)
                .ok_or_else(|| store::conflict("operating_primary_cost_missing"))?;
            sources::assert_expected(
                &sources::reference(Table::Cost, actual)?,
                &serde_json::to_value(primary).map_err(|_| Error::Internal)?,
            )?;
            if actual["project_id"] != project.to_string() || actual["id"] == original["id"] {
                return Err(store::conflict("operating_primary_cost_invalid"));
            }
        } else if input.primary_cost_ref.is_some() {
            return Err(Error::Unprocessable(
                "Primary recognition cannot name another primary cost".into(),
            ));
        }
        let mut final_source = original.clone();
        if decision == "include" {
            if input.evidence_refs.is_empty() {
                return Err(store::conflict("operating_classification_evidence_missing"));
            }
            if table == Table::Cost {
                if role != "direct-source" {
                    return Err(Error::Unprocessable(
                        "A direct cost requires direct-source recognition".into(),
                    ));
                }
                qualify_cost(session, catalog, original, cutoff).await?;
                if catalog
                    .all(Table::AllocationSource)
                    .iter()
                    .any(|s| s["cost_record_id"] == original["id"] && s["is_current"] == true)
                {
                    return Err(store::conflict("operating_direct_shared_source_overlap"));
                }
                let expected_reason = match original["cost_type"].as_str() {
                    Some("payment-fact") => "actual-payment",
                    Some("expense") => "actual-expense",
                    Some("labor") => "executed-labor",
                    Some("procurement") => "approved-commitment-exception",
                    _ => return Err(store::conflict("operating_primary_monetary_layer_missing")),
                };
                if input.reason_code.as_str() != expected_reason {
                    return Err(Error::Unprocessable(
                        "Classification reason does not match actual producer".into(),
                    ));
                }
                if original["is_included_in_project_cost"] != true {
                    let n=sqlx::query("UPDATE poms.project_actual_cost_record SET record_status='included',is_included_in_project_cost=true,included_at=$1,included_by=$2,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3 AND row_version=$4 AND record_status='confirmed' AND NOT is_included_in_project_cost")
                        .bind(clock_now()).bind(actor.id).bind(input.target.id).bind(store::version(original)?).execute(&mut *session.connection).await?.rows_affected();
                    if n != 1 {
                        return Err(store::conflict("operating_cost_consumption_changed"));
                    }
                    final_source =
                        store::row(session.connection, table, input.target.id, false).await?;
                }
            } else {
                if role != "allocation-share"
                    || original["status"] != "active"
                    || original["governance_schema_version"] != 1
                {
                    return Err(store::conflict("operating_allocation_not_frozen"));
                }
                qualify_allocation(session, catalog, original, cutoff, restatement).await?;
                if original["is_included_in_project_cost"] != true {
                    let n=sqlx::query("UPDATE poms.shared_cost_allocation_result SET is_included_in_project_cost=true,included_at=$1,included_by=$2,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3 AND row_version=$4 AND status='active' AND NOT is_included_in_project_cost")
                        .bind(clock_now()).bind(actor.id).bind(input.target.id).bind(store::version(original)?).execute(&mut *session.connection).await?.rows_affected();
                    if n != 1 {
                        return Err(store::conflict("operating_allocation_consumption_changed"));
                    }
                    final_source =
                        store::row(session.connection, table, input.target.id, false).await?;
                }
            }
        }
        let id = new_uuid()?;
        let frozen = json!({"schemaVersion":1,"sourceRef":sources::reference(table,&final_source)?,"input":input,"actorId":actor.id,"decidedAt":clock_now()});
        let payload_hash = canonical_hash(&frozen)?;
        store::insert(session,Table::Decision,&json!({"id":id,"project_id":project,"unit_key":key,"source_chain_key":if table==Table::Cost{Some(chain_key(original)?)}else{None},"cost_record_id":if table==Table::Cost{Some(input.target.id)}else{None},"allocation_result_id":if table==Table::AllocationResult{Some(input.target.id)}else{None},"source_row_version":store::version(&final_source)?,"decision":decision,"recognition_role":role,"primary_cost_id":input.primary_cost_ref.as_ref().map(|r|r.id),"reason_code":input.reason_code,"reason_text":input.reason_text,"supporting_source_refs":input.supporting_source_refs,"evidence_refs":input.evidence_refs,"frozen_payload":frozen,"payload_hash":payload_hash,"supersedes_id":predecessors.get(&input.target.id).copied().or(prior.map(|r|store::id(r,"id")).transpose()?),"producer_version":1,"row_version":1,"decided_at":clock_now(),"decided_by":actor.id})).await?;
        let changed = if head_version == 0 {
            sqlx::query("INSERT INTO poms.project_cost_inclusion_head(project_id,unit_key,decision_id,row_version) VALUES($1,$2,$3,1) ON CONFLICT(project_id,unit_key) DO NOTHING").bind(project).bind(&key).bind(id).execute(&mut *session.connection).await?.rows_affected()
        } else {
            sqlx::query("UPDATE poms.project_cost_inclusion_head SET decision_id=$3,row_version=row_version+1 WHERE project_id=$1 AND unit_key=$2 AND row_version=$4 AND decision_id=$5").bind(project).bind(&key).bind(id).bind(i32::try_from(head_version).map_err(|_|Error::Internal)?).bind(prior.map(|r|store::id(r,"id")).transpose()?).execute(&mut *session.connection).await?.rows_affected()
        };
        if changed != 1 {
            return Err(store::conflict("operating_classification_head_changed"));
        }
    }
    Ok(())
}

pub(crate) fn decision_unchanged(input: &CostDecisionInput, prior: &Value) -> bool {
    let Ok(proposed) = serde_json::to_value(input) else {
        return false;
    };
    let previous = &prior["frozen_payload"]["input"];
    if !previous.is_object()
        || prior["source_row_version"].as_i64() != Some(i64::from(input.target.expected_version))
    {
        return false;
    }
    let scalar = [
        "decision",
        "recognitionRole",
        "reasonCode",
        "reasonText",
        "primaryCostRef",
    ];
    if scalar.iter().any(|key| proposed[*key] != previous[*key]) {
        return false;
    }
    for key in ["supportingSourceRefs", "evidenceRefs"] {
        let (Some(a), Some(b)) = (proposed[key].as_array(), previous[key].as_array()) else {
            return false;
        };
        let mut a = a.iter().map(Value::to_string).collect::<Vec<_>>();
        let mut b = b.iter().map(Value::to_string).collect::<Vec<_>>();
        a.sort();
        b.sort();
        if a != b {
            return false;
        }
    }
    true
}

pub(crate) async fn qualify_allocation(
    session: &mut CommonSession<'_, '_>,
    catalog: &Catalog,
    result: &Value,
    cutoff: NaiveDate,
    restatement: bool,
) -> Result<(), Error> {
    let basis = catalog
        .by(Table::AllocationBasis, "id", &result["basis_id"])
        .ok_or_else(|| store::conflict("operating_allocation_basis_missing"))?;
    if basis["governance_schema_version"] != 1
        || basis["status"] != "active"
        || basis["allocation_algorithm"] != "largest-remainder-cents-v1"
    {
        return Err(store::conflict("operating_allocation_basis_unverified"));
    }
    let basis_evidence = catalog
        .by(Table::Evidence, "id", &basis["governance_evidence_id"])
        .ok_or_else(|| store::conflict("operating_allocation_evidence_missing"))?;
    let result_evidence = catalog
        .by(Table::Evidence, "id", &result["governance_evidence_id"])
        .ok_or_else(|| store::conflict("operating_allocation_evidence_missing"))?;
    for (evidence, target) in [(basis_evidence, basis), (result_evidence, result)] {
        if evidence["schema_version"] != 1
            || evidence["target_id"] != target["id"]
            || evidence["payload_hash"] != canonical_hash(&evidence["frozen_payload"])?
        {
            return Err(store::conflict("operating_allocation_evidence_changed"));
        }
    }
    if basis_evidence["frozen_payload"]["algorithm"] != "largest-remainder-cents-v1"
        || result_evidence["frozen_payload"]["basisId"] != basis["id"]
    {
        return Err(store::conflict(
            "operating_allocation_evidence_lineage_changed",
        ));
    }
    for (index, field) in [
        "allocated_amount_excluding_tax",
        "allocated_tax_cost_amount",
        "allocated_amount_including_tax",
    ]
    .iter()
    .enumerate()
    {
        let stored = OperatingMoneyCents::parse_exact(store::text(result, field)?, field)?;
        let value = result_evidence["frozen_payload"]["layers"][index]
            .as_str()
            .ok_or_else(|| store::conflict("operating_allocation_layer_evidence_missing"))?;
        if stored.cents() != OperatingMoneyCents::parse_exact(value, field)?.cents() {
            return Err(store::conflict(
                "operating_allocation_layer_evidence_changed",
            ));
        }
    }
    if !restatement && sources::business_day(&result["effective_at"])? > cutoff {
        return Err(store::conflict("operating_allocation_outside_cutoff"));
    }
    let members = catalog
        .all(Table::AllocationSource)
        .iter()
        .filter(|s| s["basis_id"] == basis["id"])
        .collect::<Vec<_>>();
    if members.is_empty() {
        return Err(store::conflict("operating_allocation_members_missing"));
    }
    let recorded = basis_evidence["frozen_payload"]["sources"]
        .as_array()
        .ok_or_else(|| store::conflict("operating_allocation_source_evidence_missing"))?;
    let actual_ids = members
        .iter()
        .map(|s| store::id(s, "cost_record_id"))
        .collect::<Result<BTreeSet<_>, _>>()?;
    let frozen_ids = recorded
        .iter()
        .map(|s| store::id(&s["cost"], "id"))
        .collect::<Result<BTreeSet<_>, _>>()?;
    if actual_ids != frozen_ids || recorded.len() != members.len() {
        return Err(store::conflict("operating_allocation_source_set_changed"));
    }
    for member in members {
        let cost = catalog
            .by(Table::Cost, "id", &member["cost_record_id"])
            .ok_or_else(|| store::conflict("operating_allocation_member_missing"))?;
        qualify_cost(session, catalog, cost, cutoff).await?;
        if member["cost_row_version"] != cost["row_version"]
            || member["source_payload_hash"] != canonical_hash(&member["source_payload"])?
        {
            return Err(store::conflict("operating_allocation_member_changed"));
        }
        for field in [
            "amount_excluding_tax",
            "tax_cost_amount",
            "amount_including_tax",
        ] {
            if OperatingMoneyCents::parse_exact(store::text(member, field)?, field)?.cents()
                != OperatingMoneyCents::parse_exact(store::text(cost, field)?, field)?.cents()
            {
                return Err(store::conflict(
                    "operating_allocation_member_amount_changed",
                ));
            }
        }
    }
    Ok(())
}

pub(crate) fn validate_pre_effect(
    project: Uuid,
    inputs: &[CostDecisionInput],
    catalog: &Catalog,
) -> Result<(), Error> {
    let mut ids = BTreeSet::new();
    for input in inputs {
        if !ids.insert(input.target.id) {
            return Err(Error::Unprocessable(
                "conflicting_correction_targets".into(),
            ));
        }
        let table = match input.target.kind.as_str() {
            "ProjectActualCostRecord" => Table::Cost,
            "SharedCostAllocationResult" => Table::AllocationResult,
            _ => {
                return Err(Error::BadRequest(
                    "Unsupported classification target".into(),
                ));
            }
        };
        let row = catalog
            .find(table, input.target.id)
            .ok_or_else(|| store::conflict("operating_classification_target_missing"))?;
        if row["project_id"] != project.to_string() {
            return Err(store::conflict("operating_classification_project_mismatch"));
        }
        sources::assert_expected(
            &sources::reference(table, row)?,
            &serde_json::to_value(&input.target).map_err(|_| Error::Internal)?,
        )?;
        let key = unit_key(table, row)?;
        let version = current_decision(catalog, project, &key)
            .map(store::version)
            .transpose()?
            .unwrap_or(0);
        if version != input.expected_version {
            return Err(store::conflict("operating_classification_head_changed"));
        }
    }
    Ok(())
}

/// Only a verified producer transition may carry an explicit old decision to
/// its real successor. No amounts or source rows are synthesized here.
pub(crate) fn transitioned_decisions(
    project: Uuid,
    explicit: &[CostDecisionInput],
    before: &Catalog,
    after: &Catalog,
    transitions: &[crate::project_operating_common::model::VerifiedProducerTransition],
    reason: &str,
) -> Result<(Vec<CostDecisionInput>, BTreeMap<Uuid, Uuid>), Error> {
    let mut output = explicit
        .iter()
        .cloned()
        .map(|d| (d.target.id, d))
        .collect::<BTreeMap<_, _>>();
    let mut predecessors = BTreeMap::new();
    for transition in transitions {
        for old in &transition.before_refs {
            let table = match old.kind.as_str() {
                "ProjectActualCostRecord" => Table::Cost,
                "SharedCostAllocationResult" => Table::AllocationResult,
                _ => continue,
            };
            let Some(old_row) = before.find(table, old.id) else {
                continue;
            };
            if old_row["project_id"] != project.to_string() {
                continue;
            }
            let successors = transition
                .after_refs
                .iter()
                .filter(|new| {
                    new.kind == old.kind
                        && after.find(table, new.id).is_some_and(|r| {
                            r["project_id"] == project.to_string()
                                && (new.id == old.id
                                    || r[if table == Table::Cost {
                                        "supersedes_record_id"
                                    } else {
                                        "supersedes_id"
                                    }] == old.id.to_string())
                        })
                })
                .collect::<Vec<_>>();
            if successors.len() != 1 {
                return Err(store::conflict(
                    "operating_classification_transition_ambiguous",
                ));
            }
            let new = successors[0];
            if new.id == old.id
                && new.row_version == old.row_version
                && new.payload_hash == old.payload_hash
            {
                continue;
            }
            let new_row = after.find(table, new.id).ok_or(Error::Internal)?;
            let old_decision = current_decision(before, project, &unit_key(table, old_row)?);
            let Some(prior) = old_decision else { continue };
            let target = crate::project_operating_common::model::ExpectedRef {
                kind: new.kind.clone(),
                id: new.id,
                expected_version: new.row_version,
                payload_hash: new.payload_hash.clone(),
            };
            let new_head = current_decision(after, project, &unit_key(table, new_row)?)
                .map(store::version)
                .transpose()?
                .unwrap_or(0);
            let mut decision=match output.remove(&old.id){Some(mut value)=>{value.target=target.clone();value.expected_version=new_head;value},None=>serde_json::from_value(json!({"target":target,"expectedVersion":new_head,"decision":prior["decision"],"recognitionRole":prior["recognition_role"],"reasonCode":prior["reason_code"],"reasonText":reason,"primaryCostRef":prior["frozen_payload"]["input"]["primaryCostRef"],"supportingSourceRefs":prior["supporting_source_refs"],"evidenceRefs":prior["evidence_refs"]})).map_err(|_|Error::Internal)?};
            decision.primary_cost_ref = decision
                .primary_cost_ref
                .as_ref()
                .map(|r| {
                    let sealed = consumption_reference(r, before)?;
                    rebind_reference(&sealed, transitions, before, after)
                })
                .transpose()?;
            decision.supporting_source_refs = decision
                .supporting_source_refs
                .iter()
                .map(|r| {
                    let sealed = consumption_reference(r, before)?;
                    rebind_reference(&sealed, transitions, before, after)
                })
                .collect::<Result<Vec<_>, _>>()?;
            decision.evidence_refs = decision
                .evidence_refs
                .iter()
                .map(|r| {
                    let sealed = consumption_reference(r, before)?;
                    rebind_reference(&sealed, transitions, before, after)
                })
                .collect::<Result<Vec<_>, _>>()?;
            append_transition_evidence(&mut decision, &transition.evidence_refs, after)?;
            predecessors.insert(new.id, store::id(prior, "id")?);
            output.insert(new.id, decision);
        }
    }
    Ok((output.into_values().collect(), predecessors))
}

/// Restrict automatic additions to the exact post-producer project catalog.
/// Preserve all explicit/inherited refs unchanged for strict membership checks.
fn append_transition_evidence(
    decision: &mut CostDecisionInput,
    references: &[SourceRef],
    after: &Catalog,
) -> Result<(), Error> {
    let admitted = after.members()?;
    for reference in references {
        let expected = as_expected(reference);
        let value = serde_json::to_value(&expected).map_err(|_| Error::Internal)?;
        if admitted
            .iter()
            .any(|(actual, _)| sources::assert_expected(actual, &value).is_ok())
        {
            decision.evidence_refs.push(expected);
        }
    }
    Ok(())
}

fn as_expected(reference: &SourceRef) -> ExpectedRef {
    ExpectedRef {
        kind: reference.kind.clone(),
        id: reference.id,
        expected_version: reference.row_version,
        payload_hash: reference.payload_hash.clone(),
    }
}
fn same_expected(left: &ExpectedRef, right: &ExpectedRef) -> bool {
    left.kind == right.kind
        && left.id == right.id
        && left.expected_version == right.expected_version
        && left.payload_hash == right.payload_hash
}
fn transition_error() -> Error {
    store::conflict("operating_classification_evidence_changed")
}

/// G's own sealed pre-consumption target -> final sourceRef is the only bridge.
/// Reconstruct the exact registered consumption-only factual delta, preserving
/// amounts, currency, source, stage and dates; never refresh arbitrary old refs.
fn consumption_reference(reference: &ExpectedRef, before: &Catalog) -> Result<ExpectedRef, Error> {
    let table = match reference.kind.as_str() {
        "ProjectActualCostRecord" => Table::Cost,
        "SharedCostAllocationResult" => Table::AllocationResult,
        _ => return Ok(reference.clone()),
    };
    let Some(row) = before.find(table, reference.id) else {
        return Ok(reference.clone());
    };
    let project = store::id(row, "project_id")?;
    let Some(prior) = current_decision(before, project, &unit_key(table, row)?) else {
        return Ok(reference.clone());
    };
    let frozen = &prior["frozen_payload"];
    let original: ExpectedRef = serde_json::from_value(frozen["input"]["target"].clone())
        .map_err(|_| transition_error())?;
    if !same_expected(reference, &original) {
        return Ok(reference.clone());
    }
    if prior["producer_version"] != 1 || canonical_hash(frozen)? != prior["payload_hash"] {
        return Err(transition_error());
    }
    let final_ref: SourceRef =
        serde_json::from_value(frozen["sourceRef"].clone()).map_err(|_| transition_error())?;
    let prior_id = if table == Table::Cost {
        "cost_record_id"
    } else {
        "allocation_result_id"
    };
    if final_ref.kind != original.kind
        || final_ref.id != original.id
        || prior[prior_id] != original.id.to_string()
        || prior["project_id"] != row["project_id"]
        || prior["source_row_version"].as_i64() != Some(i64::from(final_ref.row_version))
    {
        return Err(transition_error());
    }
    let final_expected = as_expected(&final_ref);
    sources::assert_expected(
        &sources::reference(table, row)?,
        &serde_json::to_value(&final_expected).map_err(|_| Error::Internal)?,
    )?;
    if original.expected_version == final_ref.row_version {
        return if same_expected(&original, &final_expected) {
            Ok(final_expected)
        } else {
            Err(transition_error())
        };
    }
    let role = if table == Table::Cost {
        "direct-source"
    } else {
        "allocation-share"
    };
    if original.expected_version <= 0
        || original.expected_version.checked_add(1) != Some(final_ref.row_version)
        || frozen["input"]["decision"] != "include"
        || frozen["input"]["recognitionRole"] != role
        || row["is_included_in_project_cost"] != true
        || (table == Table::Cost && row["record_status"] != "included")
    {
        return Err(transition_error());
    }
    let mut pre_consumption = sources::factual_payload(table, row);
    pre_consumption["row_version"] = json!(original.expected_version);
    pre_consumption["is_included_in_project_cost"] = json!(false);
    pre_consumption["included_at"] = Value::Null;
    pre_consumption["included_by"] = Value::Null;
    if table == Table::Cost {
        pre_consumption["record_status"] = json!("confirmed");
    }
    if canonical_hash(&pre_consumption)? != original.payload_hash {
        return Err(transition_error());
    }
    Ok(final_expected)
}

fn source_matches(reference: &ExpectedRef, table: Table, row: &Value) -> bool {
    sources::reference(table, row)
        .and_then(|actual| {
            sources::assert_expected(
                &actual,
                &serde_json::to_value(reference).map_err(|_| Error::Internal)?,
            )
        })
        .is_ok()
}
fn rebind_allocation_source(
    reference: &ExpectedRef,
    transition: &VerifiedProducerTransition,
    transitions: &[VerifiedProducerTransition],
    before: &Catalog,
    after: &Catalog,
) -> Result<ExpectedRef, Error> {
    if !matches!(transition.kind, CorrectionKind::AllocationBatchReplacement) {
        return Err(transition_error());
    }
    let old_bases = transition
        .before_refs
        .iter()
        .filter(|r| r.kind == "SharedCostAllocationBasis")
        .collect::<Vec<_>>();
    let new_bases = transition
        .after_refs
        .iter()
        .filter(|r| r.kind == "SharedCostAllocationBasis")
        .collect::<Vec<_>>();
    if old_bases.len() != 1 || new_bases.len() != 1 {
        return Err(transition_error());
    }
    let old_basis = before
        .find(Table::AllocationBasis, old_bases[0].id)
        .ok_or_else(transition_error)?;
    let new_basis = after
        .find(Table::AllocationBasis, new_bases[0].id)
        .ok_or_else(transition_error)?;
    if !source_matches(
        &as_expected(old_bases[0]),
        Table::AllocationBasis,
        old_basis,
    ) || !source_matches(
        &as_expected(new_bases[0]),
        Table::AllocationBasis,
        new_basis,
    ) || new_basis["supersedes_id"] != old_basis["id"]
    {
        return Err(transition_error());
    }
    let old_slots = before
        .all(Table::AllocationSource)
        .iter()
        .filter(|row| {
            row["basis_id"] == old_basis["id"]
                && row["cost_record_id"] == reference.id.to_string()
                && row["is_current"] == true
                && source_matches(reference, Table::AllocationSource, row)
        })
        .collect::<Vec<_>>();
    if old_slots.len() != 1 {
        return Err(transition_error());
    }
    let old_cost = before
        .find(Table::Cost, reference.id)
        .ok_or_else(transition_error)?;
    let old_cost_ref: SourceRef =
        serde_json::from_value(sources::reference(Table::Cost, old_cost)?)
            .map_err(|_| Error::Internal)?;
    let mapped_cost = rebind_reference(&as_expected(&old_cost_ref), transitions, before, after)?;
    let new_cost = after
        .find(Table::Cost, mapped_cost.id)
        .ok_or_else(transition_error)?;
    if !source_matches(&mapped_cost, Table::Cost, new_cost) {
        return Err(transition_error());
    }
    let slots = after
        .all(Table::AllocationSource)
        .iter()
        .filter(|row| {
            row["basis_id"] == new_basis["id"]
                && row["cost_record_id"] == mapped_cost.id.to_string()
                && row["is_current"] == true
                && row["cost_row_version"].as_i64() == Some(i64::from(mapped_cost.expected_version))
        })
        .collect::<Vec<_>>();
    if slots.len() != 1 {
        return Err(transition_error());
    }
    let actual = sources::allocation_source_reference(slots[0])?;
    let expected = as_expected(&actual);
    if !transition
        .after_refs
        .iter()
        .any(|candidate| same_expected(&as_expected(candidate), &expected))
    {
        return Err(transition_error());
    }
    Ok(expected)
}

fn rebind_reference(
    reference: &ExpectedRef,
    transitions: &[VerifiedProducerTransition],
    before: &Catalog,
    after: &Catalog,
) -> Result<ExpectedRef, Error> {
    for transition in transitions {
        if !transition
            .before_refs
            .iter()
            .any(|old| same_expected(reference, &as_expected(old)))
        {
            continue;
        }
        if reference.kind == "SharedCostAllocationSourceSnapshot" {
            return rebind_allocation_source(reference, transition, transitions, before, after);
        }
        let table = match reference.kind.as_str() {
            "ProjectActualCostRecord" => Table::Cost,
            "SharedCostAllocationResult" => Table::AllocationResult,
            "SharedCostAllocationBasis" => Table::AllocationBasis,
            "CostStageAttributionSnapshot" => Table::Stage,
            "AccountingTaxTreatmentSnapshot" => Table::Tax,
            _ => return Err(transition_error()),
        };
        let candidates = transition
            .after_refs
            .iter()
            .filter(|new| {
                new.kind == reference.kind
                    && after.find(table, new.id).is_some_and(|row| {
                        (new.id == reference.id
                            || row[if table == Table::Cost {
                                "supersedes_record_id"
                            } else {
                                "supersedes_id"
                            }] == reference.id.to_string())
                            && source_matches(&as_expected(new), table, row)
                    })
            })
            .collect::<Vec<_>>();
        if candidates.len() != 1 {
            return Err(store::conflict(
                "operating_correction_reference_transition_ambiguous",
            ));
        }
        return Ok(as_expected(candidates[0]));
    }
    Ok(reference.clone())
}

#[cfg(test)]
mod reference_transition_tests {
    use super::*;
    fn uid(n: u128) -> Uuid {
        Uuid::from_u128(n)
    }
    fn reference(table: Table, row: &Value) -> SourceRef {
        serde_json::from_value(sources::reference(table, row).expect("central factual ref"))
            .expect("typed ref")
    }
    fn cost(n: u128, version: i32, included: bool) -> Value {
        json!({"id":uid(n),"project_id":uid(100),"row_version":version,"cost_type":"expense","source_type":"expense-record","source_id":uid(n+1000),
            "currency":"CNY","amount_excluding_tax":"5000.00","tax_cost_amount":"650.00","amount_including_tax":"5650.00","occurred_on":"2026-11-07",
            "record_status":if included{"included"}else{"confirmed"},"is_included_in_project_cost":included,
            "included_at":if included{Some("2026-11-07T12:00:00Z")}else{None},"included_by":if included{Some(uid(999))}else{None}})
    }
    fn result(n: u128, version: i32, included: bool) -> Value {
        json!({"id":uid(n),"project_id":uid(100),"basis_id":uid(200),"row_version":version,"status":"active","is_included_in_project_cost":included,
            "included_at":if included{Some("2026-11-07T12:00:00Z")}else{None},"included_by":if included{Some(uid(999))}else{None},
            "currency":"CNY","allocated_amount_excluding_tax":"400.00","allocated_tax_cost_amount":"0.00","allocated_amount_including_tax":"400.00"})
    }
    fn decision_frame(table: Table, pre: Value, post: Value) -> (Catalog, ExpectedRef) {
        let target = as_expected(&reference(table, &pre));
        let final_ref = reference(table, &post);
        let role = if table == Table::Cost {
            "direct-source"
        } else {
            "allocation-share"
        };
        let input = json!({"target":target,"expectedVersion":0,"decision":"include","recognitionRole":role,"reasonCode":if table==Table::Cost{"actual-expense"}else{"executed-labor"},
            "reasonText":"explicit fixture classification","primaryCostRef":null,"supportingSourceRefs":[],"evidenceRefs":[target]});
        let frozen = json!({"schemaVersion":1,"sourceRef":final_ref,"input":input,"actorId":uid(999),"decidedAt":"2026-11-07T12:00:00Z"});
        let mut prior = json!({"id":uid(300),"project_id":post["project_id"],"row_version":1,"producer_version":1,"source_row_version":post["row_version"],
            "frozen_payload":frozen,"payload_hash":canonical_hash(&frozen).expect("seal"),"cost_record_id":null,"allocation_result_id":null});
        prior[if table == Table::Cost {
            "cost_record_id"
        } else {
            "allocation_result_id"
        }] = post["id"].clone();
        let mut catalog = Catalog::default();
        catalog.rows.insert(table, vec![post.clone()]);
        catalog.rows.insert(Table::Decision, vec![prior]);
        catalog.rows.insert(Table::DecisionHead,vec![json!({"project_id":post["project_id"],"unit_key":unit_key(table,&post).expect("unit"),"decision_id":uid(300)})]);
        (catalog, target)
    }
    #[test]
    fn sealed_cost_consumption_bridges_only_the_original_pre_cas_reference() {
        let (before, old) = decision_frame(Table::Cost, cost(1, 2, false), cost(1, 3, true));
        let bridged = consumption_reference(&old, &before).expect("sealed consumption bridge");
        assert_eq!(bridged.expected_version, 3);
        let mut new = cost(1, 4, true);
        new["stage_derived_from_id"] = json!(uid(400));
        let mut after = Catalog::default();
        after.rows.insert(Table::Cost, vec![new.clone()]);
        let transition = VerifiedProducerTransition {
            kind: CorrectionKind::StageReclassification,
            before_refs: vec![reference(Table::Cost, &cost(1, 3, true))],
            after_refs: vec![reference(Table::Cost, &new)],
            evidence_refs: vec![],
            affected_project_ids: vec![uid(100)],
        };
        let mapped =
            rebind_reference(&bridged, &[transition], &before, &after).expect("real next producer");
        assert_eq!(mapped.expected_version, 4);
        assert!(same_expected(
            &mapped,
            &as_expected(&reference(Table::Cost, &new))
        ));
    }
    #[test]
    fn share_self_evidence_bridges_one_to_two_without_changing_its_economic_basis() {
        let (before, old) = decision_frame(
            Table::AllocationResult,
            result(1, 1, false),
            result(1, 2, true),
        );
        let bridged = consumption_reference(&old, &before).expect("share consume bridge");
        assert!(same_expected(
            &bridged,
            &as_expected(&reference(Table::AllocationResult, &result(1, 2, true)))
        ));
    }
    #[test]
    fn a_rehashed_but_unproved_pre_cas_payload_does_not_become_a_current_reference() {
        let (mut before, _) = decision_frame(Table::Cost, cost(1, 2, false), cost(1, 3, true));
        let prior = &mut before.rows.get_mut(&Table::Decision).expect("decision")[0];
        prior["frozen_payload"]["input"]["target"]["payloadHash"] = json!("f".repeat(64));
        prior["payload_hash"] =
            json!(canonical_hash(&prior["frozen_payload"]).expect("seal alone is insufficient"));
        let forged: ExpectedRef =
            serde_json::from_value(prior["frozen_payload"]["input"]["target"].clone())
                .expect("reference shape");
        assert!(consumption_reference(&forged, &before).is_err());
    }
    #[test]
    fn a_two_version_jump_or_changed_currency_is_not_a_consumption_bridge() {
        let (before, old) = decision_frame(Table::Cost, cost(1, 2, false), cost(1, 4, true));
        assert!(consumption_reference(&old, &before).is_err());
        let (mut before, old) = decision_frame(Table::Cost, cost(1, 2, false), cost(1, 3, true));
        before.rows.get_mut(&Table::Cost).expect("cost")[0]["currency"] = json!("USD");
        assert!(consumption_reference(&old, &before).is_err());
    }
    #[test]
    fn an_unrelated_old_version_is_never_blindly_refreshed() {
        let (before, mut old) = decision_frame(Table::Cost, cost(1, 2, false), cost(1, 3, true));
        old.expected_version = 1;
        old.payload_hash = "e".repeat(64);
        let retained = consumption_reference(&old, &before)
            .expect("unrelated ref is retained for strict rejection");
        assert!(same_expected(&retained, &old));
        assert!(!source_matches(&retained, Table::Cost, &cost(1, 3, true)));
    }
    fn basis(n: u128, previous: Option<Uuid>) -> Value {
        json!({"id":uid(n),"row_version":1,"status":"active","supersedes_id":previous})
    }
    fn slot(basis: u128, cost: u128) -> Value {
        json!({"basis_id":uid(basis),"cost_record_id":uid(cost),"cost_row_version":2,"is_current":true,"currency":"CNY", "source_payload":{"actualFixtureCostId":uid(cost)},"source_payload_hash":"a".repeat(64)})
    }
    fn batch_frame() -> (
        Catalog,
        Catalog,
        Vec<VerifiedProducerTransition>,
        ExpectedRef,
        ExpectedRef,
    ) {
        let old_a = cost(1, 2, false);
        let old_b = cost(2, 2, false);
        let mut new_a = cost(3, 2, false);
        new_a["supersedes_record_id"] = json!(uid(1));
        let old_basis = basis(20, None);
        let new_basis = basis(21, Some(uid(20)));
        let old_slot_a = slot(20, 1);
        let old_slot_b = slot(20, 2);
        let new_slot_a = slot(21, 3);
        let new_slot_b = slot(21, 2);
        let old_a_ref =
            as_expected(&sources::allocation_source_reference(&old_slot_a).expect("old slot A"));
        let old_b_ref =
            as_expected(&sources::allocation_source_reference(&old_slot_b).expect("old slot B"));
        let mut before = Catalog::default();
        before
            .rows
            .insert(Table::Cost, vec![old_a.clone(), old_b.clone()]);
        before
            .rows
            .insert(Table::AllocationBasis, vec![old_basis.clone()]);
        before.rows.insert(
            Table::AllocationSource,
            vec![old_slot_a.clone(), old_slot_b.clone()],
        );
        let mut after = Catalog::default();
        after.rows.insert(Table::Cost, vec![new_a.clone(), old_b]);
        after
            .rows
            .insert(Table::AllocationBasis, vec![new_basis.clone()]);
        after.rows.insert(
            Table::AllocationSource,
            vec![new_slot_a.clone(), new_slot_b.clone()],
        );
        let transitions = vec![
            VerifiedProducerTransition {
                kind: CorrectionKind::LaborReplacement,
                before_refs: vec![reference(Table::Cost, &old_a)],
                after_refs: vec![reference(Table::Cost, &new_a)],
                evidence_refs: vec![],
                affected_project_ids: vec![uid(100)],
            },
            VerifiedProducerTransition {
                kind: CorrectionKind::AllocationBatchReplacement,
                before_refs: vec![
                    reference(Table::AllocationBasis, &old_basis),
                    sources::allocation_source_reference(&old_slot_a).expect("old A"),
                    sources::allocation_source_reference(&old_slot_b).expect("old B"),
                ],
                after_refs: vec![
                    reference(Table::AllocationBasis, &new_basis),
                    sources::allocation_source_reference(&new_slot_a).expect("new A"),
                    sources::allocation_source_reference(&new_slot_b).expect("new B"),
                ],
                evidence_refs: vec![],
                affected_project_ids: vec![uid(100), uid(101)],
            },
        ];
        (before, after, transitions, old_a_ref, old_b_ref)
    }
    #[test]
    fn composite_batch_slots_follow_actual_cost_successors_and_preserved_sources() {
        let (before, after, transitions, old_a, old_b) = batch_frame();
        let a = rebind_reference(&old_a, &transitions, &before, &after)
            .expect("changed cost's exact new slot");
        assert_eq!(a.id, uid(3));
        let b = rebind_reference(&old_b, &transitions, &before, &after)
            .expect("unchanged cost's exact new-basis slot");
        assert_eq!(b.id, uid(2));
        assert!(same_expected(
            &a,
            &as_expected(
                &sources::allocation_source_reference(&slot(21, 3)).expect("actual new slot")
            )
        ));
        assert!(same_expected(
            &b,
            &as_expected(
                &sources::allocation_source_reference(&slot(21, 2))
                    .expect("actual retained-cost new slot")
            )
        ));
    }
    #[test]
    fn an_equal_cost_id_in_another_basis_or_an_unregistered_slot_is_not_a_successor() {
        let (before, mut after, transitions, old_a, _) = batch_frame();
        after
            .rows
            .get_mut(&Table::AllocationSource)
            .expect("sources")[0]["basis_id"] = json!(uid(22));
        assert!(rebind_reference(&old_a, &transitions, &before, &after).is_err());
        let (before, after, mut transitions, old_a, _) = batch_frame();
        transitions[1]
            .after_refs
            .retain(|r| r.kind != "SharedCostAllocationSourceSnapshot");
        assert!(rebind_reference(&old_a, &transitions, &before, &after).is_err());
    }
    #[test]
    fn producer_evidence_augmentation_is_project_local_without_dropping_prior_evidence() {
        let evidence = |n, project| json!({"id":uid(n),"project_id":uid(project),"schema_version":1,"target_type":"SharedCostAllocationResult","target_id":uid(n+100)});
        let own = evidence(70, 100);
        let foreign = evidence(71, 101);
        let historical = evidence(72, 100);
        let mut after = Catalog::default();
        after
            .rows
            .insert(Table::Evidence, vec![own.clone(), historical.clone()]);
        let old = as_expected(&reference(Table::Evidence, &historical));
        let mut input:CostDecisionInput=serde_json::from_value(json!({"target":as_expected(&reference(Table::Cost,&cost(1,2,false))),"expectedVersion":0,"decision":"exclude","recognitionRole":"direct-source","reasonCode":"shared-source-delegated","reasonText":"explicit preserved evidence","primaryCostRef":null,"supportingSourceRefs":[],"evidenceRefs":[old]})).expect("decision");
        append_transition_evidence(
            &mut input,
            &[
                reference(Table::Evidence, &own),
                reference(Table::Evidence, &foreign),
            ],
            &after,
        )
        .expect("scoped producer additions");
        assert_eq!(input.evidence_refs.len(), 2);
        assert!(input.evidence_refs.iter().any(|r| same_expected(r, &old)));
        assert!(input.evidence_refs.iter().any(|r| r.id == uid(70)));
        assert!(!input.evidence_refs.iter().any(|r| r.id == uid(71)));
    }
}
