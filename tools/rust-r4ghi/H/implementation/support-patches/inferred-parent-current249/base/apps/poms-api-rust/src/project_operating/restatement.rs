//! Complete reverse membership discovery, terminal-root CAS and causal evidence.
use super::{
    sources,
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession, contract_support::Error, project_operating_common::model::*,
};
use serde_json::Value;
use std::collections::BTreeSet;
use uuid::Uuid;

pub(crate) fn correction_ids(
    input: &CreateOperatingRestatementRequest,
) -> Result<Vec<Uuid>, Error> {
    let mut primary = BTreeSet::new();
    let mut all = BTreeSet::new();
    for item in &input.labor_corrections {
        if !primary.insert(item.superseded_cost_ref.id) {
            return Err(conflicting());
        }
        all.insert(item.superseded_cost_ref.id);
    }
    for item in &input.stage_corrections {
        if !primary.insert(item.cost_ref.id) {
            return Err(conflicting());
        }
        all.extend([item.cost_ref.id, item.stage_attribution_ref.id]);
    }
    for item in &input.tax_corrections {
        if !primary.insert(item.tax_treatment_ref.id) {
            return Err(conflicting());
        }
        all.insert(item.tax_treatment_ref.id);
        all.extend(item.expected_source_refs.iter().map(|r| r.id));
    }
    for item in &input.allocation_corrections {
        if !primary.insert(item.basis_ref.id) {
            return Err(conflicting());
        }
        all.insert(item.basis_ref.id);
        all.extend(item.source_cost_refs.iter().map(|r| r.id));
    }
    for item in &input.acknowledged_changed_source_refs {
        all.insert(item.id);
    }
    for item in &input.cost_decisions {
        all.insert(item.target.id);
    }
    for target in &input.affected_targets {
        for item in &target.cost_decisions {
            all.insert(item.target.id);
        }
    }
    Ok(all.into_iter().collect())
}
fn conflicting() -> Error {
    Error::Unprocessable("conflicting_correction_targets".into())
}

/// Discovery runs before any project locks. Source expansion is transitive
/// through actual whole allocation batches, not client-nominated shares.
pub(crate) async fn discover_projects(
    session: &mut CommonSession<'_, '_>,
    input: &CreateOperatingRestatementRequest,
) -> Result<Vec<Uuid>, Error> {
    let selected = command_selected_roots_with_session(session, input).await?;
    let roots = scope_roots_with_session(
        session,
        input.project_id,
        input.restates_snapshot_ref.id,
        &selected,
    )
    .await?;
    discover_for_roots(session, input.project_id, &roots).await
}

pub(crate) fn command_root_refs(
    input: &CreateOperatingRestatementRequest,
) -> Result<Vec<ExpectedRef>, Error> {
    correction_ids(input)?;
    let mut refs = Vec::new();
    for item in &input.labor_corrections {
        refs.push(item.superseded_cost_ref.clone());
    }
    for item in &input.allocation_corrections {
        refs.push(item.basis_ref.clone());
    }
    for item in &input.stage_corrections {
        refs.push(ExpectedRef {
            kind: "ProjectActualCostRecord".into(),
            id: item.cost_ref.id,
            expected_version: item.cost_ref.expected_version,
            payload_hash: item.cost_ref.payload_hash.clone(),
        });
        refs.push(ExpectedRef {
            kind: "CostStageAttributionSnapshot".into(),
            id: item.stage_attribution_ref.id,
            expected_version: item.stage_attribution_ref.expected_version,
            payload_hash: item.stage_attribution_ref.payload_hash.clone(),
        });
    }
    for item in &input.tax_corrections {
        refs.push(ExpectedRef {
            kind: "AccountingTaxTreatmentSnapshot".into(),
            id: item.tax_treatment_ref.id,
            expected_version: item.tax_treatment_ref.expected_version,
            payload_hash: item.tax_treatment_ref.payload_hash.clone(),
        });
    }
    refs.sort_by_key(|r| (r.kind.clone(), r.id));
    for pair in refs.windows(2) {
        if pair[0].kind == pair[1].kind
            && pair[0].id == pair[1].id
            && (pair[0].expected_version != pair[1].expected_version
                || pair[0].payload_hash != pair[1].payload_hash)
        {
            return Err(conflicting());
        }
    }
    refs.dedup_by(|a, b| a.kind == b.kind && a.id == b.id);
    Ok(refs)
}

pub(crate) async fn command_selected_roots_with_session(
    session: &mut CommonSession<'_, '_>,
    input: &CreateOperatingRestatementRequest,
) -> Result<Vec<ExpectedRef>, Error> {
    let mut refs = command_root_refs(input)?;
    for decision in input.cost_decisions.iter().chain(
        input
            .affected_targets
            .iter()
            .flat_map(|t| t.cost_decisions.iter()),
    ) {
        let prior:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(d) FROM poms.project_cost_inclusion_head h JOIN poms.project_cost_inclusion_decision d ON d.id=h.decision_id WHERE (d.cost_record_id=$1 OR d.allocation_result_id=$1) ORDER BY d.id").bind(decision.target.id).fetch_optional(&mut *session.connection).await?;
        if let Some(prior) = prior
            && prior["source_row_version"].as_i64()
                == Some(i64::from(decision.target.expected_version))
            && !super::inclusion::decision_unchanged(decision, &prior)
        {
            let reference = sources::reference(Table::Decision, &prior)?;
            refs.push(ExpectedRef {
                kind: "ProjectCostInclusionDecision".into(),
                id: store::id(&prior, "id")?,
                expected_version: store::version(&prior)?,
                payload_hash: store::text(&reference, "payloadHash")?.into(),
            });
        }
    }
    refs.sort_by_key(|r| (r.kind.clone(), r.id));
    refs.dedup_by(|a, b| a.kind == b.kind && a.id == b.id);
    Ok(refs)
}

pub(crate) async fn scope_roots_with_session(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    snapshot: Uuid,
    selected: &[ExpectedRef],
) -> Result<Vec<ExpectedRef>, Error> {
    let catalog = sources::load(session, project, false).await?;
    let mut roots = inferred_late_roots(session, snapshot, &catalog).await?;
    roots.extend_from_slice(selected);
    roots.sort_by_key(|r| (r.kind.clone(), r.id));
    for pair in roots.windows(2) {
        if pair[0].kind == pair[1].kind
            && pair[0].id == pair[1].id
            && (pair[0].expected_version != pair[1].expected_version
                || pair[0].payload_hash != pair[1].payload_hash)
        {
            return Err(store::conflict("operating_restatement_source_changed"));
        }
    }
    roots.dedup_by(|a, b| a.kind == b.kind && a.id == b.id);
    Ok(roots)
}

pub(crate) async fn inferred_late_roots(
    session: &mut CommonSession<'_, '_>,
    snapshot: Uuid,
    catalog: &sources::Catalog,
) -> Result<Vec<ExpectedRef>, Error> {
    let refs = changed_sources(session, snapshot, catalog).await?;
    refs.into_iter()
        .filter(|r| {
            matches!(
                r["kind"].as_str(),
                Some(
                    "Contract"
                        | "ContractTermSnapshot"
                        | "ReceiptRecord"
                        | "ReceiptAccountingBasis"
                        | "ProjectActualCostRecord"
                        | "SharedCostAllocationBasis"
                        | "SharedCostAllocationResult"
                        | "CostStageAttributionSnapshot"
                        | "AccountingTaxTreatmentSnapshot"
                        | "OperatingBaselinePackage"
                )
            )
        })
        .filter(|r| {
            let Some(id) = r["id"].as_str().and_then(|s| Uuid::parse_str(s).ok()) else {
                return false;
            };
            let (table, field, allowed) = match r["kind"].as_str() {
                Some("ProjectActualCostRecord") => (
                    Table::Cost,
                    "record_status",
                    &["registered", "confirmed", "included"][..],
                ),
                Some("ContractTermSnapshot") => (Table::Term, "snapshot_status", &["active"][..]),
                Some("Contract") => (Table::Contract, "status", &["active"][..]),
                Some("ReceiptRecord") => (
                    Table::Receipt,
                    "status",
                    &["pending-confirmation", "confirmed"][..],
                ),
                Some("SharedCostAllocationBasis") => {
                    (Table::AllocationBasis, "status", &["active", "pending"][..])
                }
                Some("SharedCostAllocationResult") => (
                    Table::AllocationResult,
                    "status",
                    &["active", "pending"][..],
                ),
                Some("CostStageAttributionSnapshot") => (Table::Stage, "status", &["active"][..]),
                Some("AccountingTaxTreatmentSnapshot") => {
                    (Table::Tax, "status", &["active", "pending"][..])
                }
                Some("OperatingBaselinePackage") => {
                    return catalog
                        .find(Table::Baseline, id)
                        .is_some_and(|r| r["is_current"] == true);
                }
                Some("ReceiptAccountingBasis") => return true,
                _ => return false,
            };
            catalog
                .find(table, id)
                .and_then(|row| row[field].as_str())
                .is_some_and(|status| allowed.contains(&status))
        })
        .map(|r| {
            Ok(ExpectedRef {
                kind: store::text(&r, "kind")?.into(),
                id: store::id(&r, "id")?,
                expected_version: r["rowVersion"]
                    .as_i64()
                    .and_then(|n| i32::try_from(n).ok())
                    .ok_or(Error::Internal)?,
                payload_hash: store::text(&r, "payloadHash")?.into(),
            })
        })
        .collect()
}

#[derive(Clone)]
struct Impact {
    id: Uuid,
    project: Option<Uuid>,
    day: Option<chrono::NaiveDate>,
    producer: bool,
}
// Tax evidence is immutable F producer output, not a caller-supplied cost
// list. Bind its metadata references back to its hashed original assessment.
fn tax_dependency_sources(tax: &Value, evidence: &Value) -> Result<Vec<Value>, Error> {
    if tax["governance_schema_version"] != 1
        || tax["status"] != "active"
        || evidence["schema_version"] != 1
        || evidence["id"] != tax["governance_evidence_id"]
        || evidence["target_type"] != "AccountingTaxTreatmentSnapshot"
        || evidence["target_id"] != tax["id"]
        || evidence["project_id"] != tax["project_id"]
        || !evidence["frozen_payload"].is_object()
        || evidence["payload_hash"]
            != crate::contract_support::canonical_hash(&evidence["frozen_payload"])?
        || evidence["source_references"]
            != evidence["frozen_payload"]["assessment"]["sourceReferences"]
    {
        return Err(store::conflict("operating_tax_dependency_evidence_changed"));
    }
    let references = evidence["source_references"]
        .as_array()
        .filter(|refs| !refs.is_empty())
        .ok_or_else(|| store::conflict("operating_tax_dependency_evidence_changed"))?;
    let mut sources = Vec::new();
    for reference in references {
        match reference["kind"].as_str() {
            Some("source") => sources.push(reference.clone()),
            Some("manual") => {}
            _ => return Err(store::conflict("operating_tax_dependency_evidence_changed")),
        }
    }
    Ok(sources)
}

fn append_dependency_cost(
    cost: &Value,
    ids: &mut BTreeSet<Uuid>,
    impacts: &mut Vec<Impact>,
) -> Result<(), Error> {
    let id = store::id(cost, "id")?;
    ids.insert(id);
    impacts.push(Impact {
        id,
        project: Some(store::id(cost, "project_id")?),
        day: Some(sources::business_day(&cost["occurred_on"])?),
        producer: true,
    });
    Ok(())
}

fn append_batch_impacts(
    rows: &[Value],
    ids: &mut BTreeSet<Uuid>,
    impacts: &mut Vec<Impact>,
) -> Result<(), Error> {
    for row in rows {
        let day = Some(sources::business_day(&row["businessDate"])?);
        for (id_key, p_key) in [("resultId", "projectId"), ("costId", "costProjectId")] {
            let id = store::id(row, id_key)?;
            ids.insert(id);
            impacts.push(Impact {
                id,
                project: Some(store::id(row, p_key)?),
                day,
                producer: true,
            });
        }
        ids.insert(store::id(row, "basisId")?);
    }
    Ok(())
}

async fn impact_graph(
    session: &mut CommonSession<'_, '_>,
    roots: &[ExpectedRef],
    validate: bool,
) -> Result<Vec<Impact>, Error> {
    let mut impacts = Vec::new();
    let mut ids = BTreeSet::new();
    for root in roots {
        if root.kind == "ProjectCostInclusionDecision" {
            let decision = store::row(session.connection, Table::Decision, root.id, false).await?;
            if validate {
                sources::assert_expected(
                    &sources::reference(Table::Decision, &decision)?,
                    &serde_json::to_value(root).map_err(|_| Error::Internal)?,
                )?;
                let current=sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.project_cost_inclusion_head WHERE project_id=$1 AND unit_key=$2 AND decision_id=$3)").bind(store::id(&decision,"project_id")?).bind(store::text(&decision,"unit_key")?).bind(root.id).fetch_one(&mut *session.connection).await?;
                if !current {
                    return Err(store::conflict("operating_classification_head_changed"));
                }
            }
            let project = Some(store::id(&decision, "project_id")?);
            let (target, day) = if let Some(id) = decision["cost_record_id"].as_str() {
                let id = Uuid::parse_str(id).map_err(|_| Error::Internal)?;
                let cost = store::row(session.connection, Table::Cost, id, false).await?;
                (id, Some(sources::business_day(&cost["occurred_on"])?))
            } else {
                let id = store::id(&decision, "allocation_result_id")?;
                let day:Option<chrono::NaiveDate>=sqlx::query_scalar("SELECT max(c.occurred_on) FROM poms.shared_cost_allocation_result r JOIN poms.shared_cost_allocation_source_snapshot s ON s.basis_id=r.basis_id JOIN poms.project_actual_cost_record c ON c.id=s.cost_record_id WHERE r.id=$1").bind(id).fetch_one(&mut *session.connection).await?;
                (id, day)
            };
            if day.is_none() {
                return Err(store::conflict("operating_allocation_members_missing"));
            }
            impacts.push(Impact {
                id: root.id,
                project,
                day,
                producer: false,
            });
            impacts.push(Impact {
                id: target,
                project,
                day,
                producer: false,
            });
            continue;
        }
        ids.insert(root.id);
        let table = match root.kind.as_str() {
            "ProjectActualCostRecord" => Table::Cost,
            "CostStageAttributionSnapshot" => Table::Stage,
            "AccountingTaxTreatmentSnapshot" => Table::Tax,
            "SharedCostAllocationBasis" => Table::AllocationBasis,
            "SharedCostAllocationResult" => Table::AllocationResult,
            "Contract" => Table::Contract,
            "ContractTermSnapshot" => Table::Term,
            "ReceiptRecord" => Table::Receipt,
            "ReceiptAccountingBasis" => Table::ReceiptBasis,
            "OperatingBaselinePackage" => Table::Baseline,
            _ => {
                return Err(store::conflict(
                    "operating_restatement_source_kind_unsupported",
                ));
            }
        };
        let row = store::row(session.connection, table, root.id, false).await?;
        if validate {
            sources::assert_expected(
                &sources::reference(table, &row)?,
                &serde_json::to_value(root).map_err(|_| Error::Internal)?,
            )?;
        }
        let mut project = store::id(&row, "project_id").ok();
        let date = match table {
            Table::Cost => row["occurred_on"].clone(),
            Table::Receipt => row["receipt_date"].clone(),
            Table::Term => {
                project = Some(store::id(
                    &store::row(
                        session.connection,
                        Table::Contract,
                        store::id(&row, "contract_id")?,
                        false,
                    )
                    .await?,
                    "project_id",
                )?);
                row["effective_at"].clone()
            }
            Table::ReceiptBasis => {
                let receipt = store::row(
                    session.connection,
                    Table::Receipt,
                    store::id(&row, "receipt_id")?,
                    false,
                )
                .await?;
                receipt["receipt_date"].clone()
            }
            Table::Stage => {
                let cost = store::row(
                    session.connection,
                    Table::Cost,
                    store::id(&row, "cost_record_id")?,
                    false,
                )
                .await?;
                project = Some(store::id(&cost, "project_id")?);
                ids.insert(store::id(&cost, "id")?);
                row["evidence_business_date"].clone()
            }
            Table::Tax => {
                let evidence = store::row(
                    session.connection,
                    Table::Evidence,
                    store::id(&row, "governance_evidence_id")?,
                    false,
                )
                .await?;
                for source in tax_dependency_sources(&row, &evidence)? {
                    // The exact same read-only source-to-cost relation used by
                    // F plans seeds G's existing transitive whole-batch graph.
                    // Historical evidence versions are not silently rebound.
                    for cost_id in crate::project_cost_governance::cost_ids_for_evidence_reference(
                        session, &source,
                    )
                    .await?
                    {
                        let cost =
                            store::row(session.connection, Table::Cost, cost_id, false).await?;
                        append_dependency_cost(&cost, &mut ids, &mut impacts)?;
                    }
                }
                evidence["business_date"].clone()
            }
            Table::Contract => row["signed_at"].clone(),
            Table::Baseline => row["effective_at"].clone(),
            _ => Value::Null,
        };
        impacts.push(Impact {
            id: root.id,
            project,
            day: if date.is_null() {
                None
            } else {
                Some(sources::business_day(&date)?)
            },
            producer: true,
        });
    }
    loop {
        let known = ids.iter().copied().collect::<Vec<_>>();
        let rows:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('resultId',r.id,'projectId',r.project_id,'basisId',r.basis_id,'costId',m.cost_record_id,'costProjectId',c.project_id,'businessDate',c.occurred_on) FROM poms.shared_cost_allocation_result r JOIN poms.shared_cost_allocation_source_snapshot m ON m.basis_id=r.basis_id JOIN poms.project_actual_cost_record c ON c.id=m.cost_record_id WHERE m.cost_record_id=ANY($1::uuid[]) OR m.basis_id=ANY($1::uuid[]) OR r.id=ANY($1::uuid[]) ORDER BY r.id,m.cost_record_id").bind(&known).fetch_all(&mut *session.connection).await?;
        let prior = ids.len();
        append_batch_impacts(&rows, &mut ids, &mut impacts)?;
        if ids.len() == prior {
            break;
        }
    }
    impacts.sort_by_key(|i| (i.id, i.project, i.day, i.producer));
    impacts.dedup_by(|a, b| {
        a.id == b.id && a.project == b.project && a.day == b.day && a.producer == b.producer
    });
    Ok(impacts)
}

pub(crate) async fn discover_for_roots(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    roots: &[ExpectedRef],
) -> Result<Vec<Uuid>, Error> {
    let graph = impact_graph(session, roots, false).await?;
    let ids = graph
        .iter()
        .filter(|i| i.producer)
        .map(|i| i.id)
        .collect::<Vec<_>>();
    let mut projects=sqlx::query_scalar::<_,Uuid>("SELECT DISTINCT c.project_id FROM poms.operating_source_member m JOIN poms.operating_source_context c ON c.id=m.context_id JOIN poms.project_operating_snapshot s ON s.id=c.snapshot_id WHERE m.source_id=ANY($1::uuid[]) AND s.producer_version=1 AND s.status='active' AND NOT EXISTS(SELECT 1 FROM poms.project_operating_snapshot n WHERE n.supersedes_id=s.id AND n.producer_version=1) ORDER BY c.project_id").bind(ids).fetch_all(&mut *session.connection).await?;
    projects.extend(graph.iter().filter_map(|i| i.project));
    projects.push(project);
    projects.sort();
    projects.dedup();
    Ok(projects)
}

pub(crate) async fn affected_states(
    session: &mut CommonSession<'_, '_>,
    projects: &[Uuid],
    roots: &[ExpectedRef],
) -> Result<Vec<OperatingLockedProjectState>, Error> {
    let graph = impact_graph(session, roots, true).await?;
    let mut states = locked_states(session, projects, false).await?;
    for state in &mut states {
        let mut affected = Vec::new();
        for terminal in &state.terminal_root_refs {
            let snapshot =
                store::row(session.connection, Table::Snapshot, terminal.id, false).await?;
            let context = store::row(
                session.connection,
                Table::Context,
                store::id(&snapshot, "source_context_id")?,
                false,
            )
            .await?;
            let cutoff = sources::business_day(&context["business_cutoff"])?;
            let applicable = graph
                .iter()
                .filter(|i| {
                    (i.producer || i.project == Some(state.project_id))
                        && i.day.is_some_and(|d| d <= cutoff)
                })
                .map(|i| i.id)
                .collect::<Vec<_>>();
            let consumed=sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.operating_source_member WHERE context_id=$1 AND source_id=ANY($2::uuid[]))").bind(store::id(&context,"id")?).bind(applicable).fetch_one(&mut *session.connection).await?;
            if consumed
                || graph.iter().any(|i| {
                    i.project == Some(state.project_id) && i.day.is_some_and(|d| d <= cutoff)
                })
            {
                affected.push(terminal.clone());
            }
        }
        state.terminal_root_refs = affected;
    }
    Ok(states)
}

pub(crate) async fn locked_states(
    session: &mut CommonSession<'_, '_>,
    projects: &[Uuid],
    locked: bool,
) -> Result<Vec<OperatingLockedProjectState>, Error> {
    let mut sorted = projects.to_vec();
    sorted.sort();
    sorted.dedup();
    let mut out = Vec::new();
    for project_id in sorted {
        let project = store::project(session.connection, project_id).await?;
        let head = store::rows(session.connection, Table::Head, project_id, locked)
            .await?
            .pop();
        let baselines =
            store::rows(session.connection, Table::Baseline, project_id, locked).await?;
        let snapshots =
            store::rows(session.connection, Table::Snapshot, project_id, locked).await?;
        let baseline = head.as_ref().and_then(|h| {
            baselines
                .iter()
                .find(|b| b["id"] == h["baseline_package_id"])
        });
        let current = head.as_ref().and_then(|h| {
            snapshots
                .iter()
                .find(|s| s["id"] == h["current_snapshot_id"])
        });
        let mut terminal_refs = snapshots
            .iter()
            .filter(|s| {
                s["producer_version"] == 1
                    && s["status"] == "active"
                    && !snapshots.iter().any(|n| n["supersedes_id"] == s["id"])
            })
            .map(|s| sources::reference(Table::Snapshot, s))
            .collect::<Result<Vec<_>, _>>()?;
        terminal_refs.sort_by_key(|r| r["id"].to_string());
        out.push(OperatingLockedProjectState {
            project_id,
            project_row_version: store::version(&project)?,
            head_row_version: head
                .as_ref()
                .and_then(|h| h["row_version"].as_i64())
                .and_then(|n| i32::try_from(n).ok())
                .unwrap_or(0),
            baseline_package_ref: baseline
                .map(|b| sources::reference(Table::Baseline, b))
                .transpose()?
                .map(serde_json::from_value)
                .transpose()
                .map_err(|_| Error::Internal)?,
            current_snapshot_ref: current
                .map(|s| sources::reference(Table::Snapshot, s))
                .transpose()?
                .map(serde_json::from_value)
                .transpose()
                .map_err(|_| Error::Internal)?,
            terminal_root_refs: terminal_refs
                .into_iter()
                .map(serde_json::from_value)
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| Error::Internal)?,
        });
    }
    Ok(out)
}

pub(crate) fn assert_complete_targets(
    input: &CreateOperatingRestatementRequest,
    states: &[OperatingLockedProjectState],
) -> Result<(), Error> {
    let mut expected = BTreeSet::new();
    for state in states {
        for terminal in &state.terminal_root_refs {
            expected.insert((state.project_id, terminal.id));
        }
    }
    let mut actual = BTreeSet::new();
    actual.insert((input.project_id, input.restates_snapshot_ref.id));
    for target in &input.affected_targets {
        if !actual.insert((target.project_id, target.restates_snapshot_ref.id)) {
            return Err(conflicting());
        }
    }
    if actual != expected {
        return Err(store::conflict("operating_restatement_scope_incomplete"));
    }
    for state in states {
        let targets = input
            .affected_targets
            .iter()
            .filter(|t| t.project_id == state.project_id)
            .collect::<Vec<_>>();
        if input.project_id == state.project_id && input.expected_version != state.head_row_version
        {
            return Err(store::conflict("operating_head_changed"));
        }
        if targets
            .iter()
            .any(|t| t.expected_version != state.head_row_version)
        {
            return Err(store::conflict("operating_head_changed"));
        }
    }
    Ok(())
}

pub(crate) async fn changed_sources(
    session: &mut CommonSession<'_, '_>,
    before_snapshot: Uuid,
    current: &sources::Catalog,
) -> Result<Vec<Value>, Error> {
    let previous:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('kind',m.source_kind,'id',m.source_id,'rowVersion',m.source_row_version,'payloadHash',m.source_payload_hash) FROM poms.operating_source_member m JOIN poms.operating_source_context c ON c.id=m.context_id WHERE c.snapshot_id=$1 ORDER BY m.source_kind,m.source_id,m.source_payload_hash").bind(before_snapshot).fetch_all(&mut *session.connection).await?;
    Ok(current
        .members()?
        .into_iter()
        .map(|(r, _)| r)
        .filter(|r| !previous.iter().any(|p| p == r))
        .collect())
}

pub(crate) async fn changed_context_sources(
    session: &mut CommonSession<'_, '_>,
    before_snapshot: Uuid,
    context: &OperatingSourceContext,
) -> Result<Vec<Value>, Error> {
    let previous:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('kind',m.source_kind,'id',m.source_id,'rowVersion',m.source_row_version,'payloadHash',m.source_payload_hash) FROM poms.operating_source_member m JOIN poms.operating_source_context c ON c.id=m.context_id WHERE c.snapshot_id=$1 ORDER BY m.source_kind,m.source_id,m.source_payload_hash").bind(before_snapshot).fetch_all(&mut *session.connection).await?;
    context
        .scope
        .closure_evidence_refs
        .iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| Error::Internal)
        .map(|refs| {
            refs.into_iter()
                .filter(|r| !previous.iter().any(|old| old == r))
                .collect()
        })
}

pub(crate) async fn supersede_terminal(
    session: &mut CommonSession<'_, '_>,
    before: &Value,
    actor: Uuid,
) -> Result<(), Error> {
    let n=sqlx::query("UPDATE poms.project_operating_snapshot SET status='superseded',row_version=row_version+1,updated_at=now(),updated_by=$1 WHERE id=$2 AND row_version=$3 AND status='active' AND producer_version=1 AND NOT EXISTS(SELECT 1 FROM poms.project_operating_snapshot n WHERE n.supersedes_id=$2 AND n.id<>$4)")
        .bind(actor).bind(store::id(before,"id")?).bind(store::version(before)?).bind(Uuid::nil()).execute(&mut *session.connection).await?.rows_affected();
    if n != 1 {
        return Err(store::conflict("operating_restatement_terminal_changed"));
    }
    Ok(())
}

pub(crate) fn causal_refs(
    transitions: &[VerifiedProducerTransition],
    changed: &[Value],
) -> Result<Vec<Value>, Error> {
    let mut out = changed.to_vec();
    for transition in transitions {
        out.extend(
            transition
                .before_refs
                .iter()
                .chain(transition.after_refs.iter())
                .chain(transition.evidence_refs.iter())
                .map(serde_json::to_value)
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| Error::Internal)?,
        );
    }
    out.sort_by_key(Value::to_string);
    out.dedup();
    Ok(out)
}

#[cfg(test)]
mod tax_dependency83_tests {
    use super::*;
    use serde_json::json;

    fn uid(n: u128) -> Uuid {
        Uuid::from_u128(n)
    }

    fn evidence_pair(references: Value) -> (Value, Value) {
        let payload = json!({"assessment":{"sourceReferences":references},"actorId":uid(90)});
        let tax = json!({"id":uid(1),"project_id":uid(10),"status":"active","governance_schema_version":1,"governance_evidence_id":uid(2),"tax_impact_pending_amount":"130.00"});
        let evidence = json!({"id":uid(2),"project_id":uid(10),"target_type":"AccountingTaxTreatmentSnapshot","target_id":uid(1),"schema_version":1,"business_date":"2026-11-08","source_references":references,"frozen_payload":payload,"payload_hash":crate::contract_support::canonical_hash(&payload).expect("fixture hash")});
        (tax, evidence)
    }

    #[test]
    fn tax_dependency83_reads_the_sealed_cost_relation_without_rebinding_its_version() {
        let (tax, evidence) = evidence_pair(
            json!([{"kind":"source","sourceType":"project-actual-cost-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]),
        );
        let original = (tax.clone(), evidence.clone());
        let selected = tax_dependency_sources(&tax, &evidence).expect("real relation");
        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0]["sourceId"], uid(20).to_string());
        assert_eq!(selected[0]["sourceVersion"], 2);
        // G uses this ID only for dependency discovery. A later consumption
        // version remains the responsibility of the unchanged F assertions.
        let mut ids = BTreeSet::from([uid(1)]);
        let mut impacts = vec![];
        append_dependency_cost(
            &json!({"id":uid(20),"project_id":uid(10),"occurred_on":"2026-11-08","row_version":3}),
            &mut ids,
            &mut impacts,
        )
        .expect("actual current cost row");
        assert!(ids.contains(&uid(20)));
        assert_eq!(impacts[0].project, Some(uid(10)));
        assert_eq!((tax, evidence), original);
    }

    #[test]
    fn tax_dependency83_cost_seed_reaches_the_complete_cross_project_transitive_batch() {
        let mut ids = BTreeSet::from([uid(1)]);
        let mut impacts = vec![];
        append_dependency_cost(
            &json!({"id":uid(20),"project_id":uid(10),"occurred_on":"2026-11-08"}),
            &mut ids,
            &mut impacts,
        )
        .expect("tax source cost");
        let rows = vec![
            json!({"resultId":uid(40),"projectId":uid(10),"basisId":uid(30),"costId":uid(20),"costProjectId":uid(10),"businessDate":"2026-11-08"}),
            json!({"resultId":uid(41),"projectId":uid(11),"basisId":uid(30),"costId":uid(20),"costProjectId":uid(10),"businessDate":"2026-11-08"}),
            json!({"resultId":uid(40),"projectId":uid(10),"basisId":uid(30),"costId":uid(21),"costProjectId":uid(12),"businessDate":"2026-11-07"}),
            json!({"resultId":uid(42),"projectId":uid(13),"basisId":uid(31),"costId":uid(21),"costProjectId":uid(12),"businessDate":"2026-11-07"}),
            json!({"resultId":uid(99),"projectId":uid(99),"basisId":uid(98),"costId":uid(97),"costProjectId":uid(99),"businessDate":"2026-11-01"}),
        ];
        // Rows returned by the unchanged real join are added as a complete
        // batch; its next query uses the expanded cost/basis/result ID set.
        loop {
            let before = ids.len();
            let joined = rows
                .iter()
                .filter(|r| {
                    ["costId", "basisId", "resultId"]
                        .iter()
                        .any(|k| ids.contains(&store::id(r, k).expect("actual join id")))
                })
                .cloned()
                .collect::<Vec<_>>();
            append_batch_impacts(&joined, &mut ids, &mut impacts).expect("whole batch rows");
            if ids.len() == before {
                break;
            }
        }
        let projects = impacts
            .iter()
            .filter_map(|i| i.project)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            projects,
            BTreeSet::from([uid(10), uid(11), uid(12), uid(13)])
        );
        assert!(ids.contains(&uid(42)));
        assert!(!ids.contains(&uid(99)));
        assert!(impacts.iter().any(|i| i.project == Some(uid(11))
            && i.day == chrono::NaiveDate::from_ymd_opt(2026, 11, 8)
            && i.producer));
    }

    #[test]
    fn tax_dependency83_rejects_mutated_hash_target_project_schema_and_current_marker() {
        let refs = json!([{"kind":"source","sourceType":"expense-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]);
        for field in ["payload_hash", "target_id", "project_id", "schema_version"] {
            let (tax, mut evidence) = evidence_pair(refs.clone());
            evidence[field] = if field == "schema_version" {
                json!(0)
            } else {
                json!("changed")
            };
            assert!(tax_dependency_sources(&tax, &evidence).is_err(), "{field}");
        }
        let (mut tax, evidence) = evidence_pair(refs);
        tax["status"] = json!("superseded");
        assert!(tax_dependency_sources(&tax, &evidence).is_err());
    }

    #[test]
    fn tax_dependency83_unhashed_metadata_cannot_substitute_a_foreign_cost_relation() {
        let (tax, mut evidence) = evidence_pair(
            json!([{"kind":"source","sourceType":"project-actual-cost-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]),
        );
        evidence["source_references"][0]["sourceId"] = json!(uid(999));
        assert!(tax_dependency_sources(&tax, &evidence).is_err());
    }

    #[test]
    fn tax_dependency83_manual_assessment_does_not_guess_project_wide_costs() {
        let (tax, evidence) = evidence_pair(
            json!([{"kind":"manual","businessDate":"2026-11-08","reason":"actual manual assessment","evidenceSummary":"pending review","attachmentIds":[]}]),
        );
        assert!(
            tax_dependency_sources(&tax, &evidence)
                .expect("qualified manual evidence")
                .is_empty()
        );
    }
}
