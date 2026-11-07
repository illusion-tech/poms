use super::{
    evidence, logic, projection,
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    contract_support::{self, Actor, AuditWrite, Error},
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

fn domain(message: &'static str) -> Error {
    Error::Unprocessable(message.into())
}
fn list<'a>(body: &'a Value, key: &str) -> Result<&'a Vec<Value>, Error> {
    body.get(key)
        .and_then(Value::as_array)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| Error::BadRequest(format!("{key} must be a nonempty array")))
}
fn uuid_list(body: &Value, key: &str) -> Result<Vec<Uuid>, Error> {
    let mut result = BTreeSet::new();
    for item in list(body, key)? {
        let id = Uuid::parse_str(item.as_str().ok_or(Error::Internal)?)
            .map_err(|_| Error::BadRequest("Invalid source identity".into()))?;
        if !result.insert(id) {
            return Err(domain("Duplicate source identity"));
        }
    }
    Ok(result.into_iter().collect())
}
fn amount(value: Option<i128>) -> Value {
    value
        .map(|v| json!(logic::format_scaled(v, 2)))
        .unwrap_or(Value::Null)
}
fn source_proofs(snapshots: &[Value]) -> Vec<Value> {
    snapshots
        .iter()
        .filter_map(|s| {
            s.get("source")
                .and_then(|source| source.get("governanceVersionProof"))
                .filter(|p| p.is_object())
                .cloned()
        })
        .collect()
}

fn allocation_policy(measurement: &str) -> Result<Value, Error> {
    let components = match measurement {
        "including-tax" => "gross-cap-net-tax-complement",
        "excluding-tax" | "tax" => "independent-components-gross-sum",
        _ => return Err(domain("Unknown allocation measurement layer")),
    };
    Ok(
        json!({"id":logic::POLICY_ID,"version":logic::POLICY_VERSION,"measurementBasis":measurement,"grossComponents":components,"tieBreak":"project-uuid-bytes-ascending","secondaryQuota":"bounded-largest-deficit"}),
    )
}

fn allocation_payload(mut payload: Value, policy: &Value) -> Result<Value, Error> {
    payload
        .as_object_mut()
        .ok_or(Error::Internal)?
        .insert("allocationPolicy".into(), policy.clone());
    Ok(payload)
}
fn summary(body: &Value, key: &str, reason: Option<&str>) -> Option<String> {
    let text = store::optional_text(body, key).or_else(|| reason.map(str::to_owned));
    match (text, store::optional_text(body, "comment")) {
        (Some(t), Some(c)) => Some(format!("{t}: {c}")),
        (None, Some(c)) => Some(c),
        (text, None) => text,
    }
}
struct Audit<'a> {
    op: &'a str,
    target: &'a str,
    id: Uuid,
    projects: &'a BTreeSet<Uuid>,
    before: Option<Value>,
    labor: bool,
}
async fn audit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    input: Audit<'_>,
) -> Result<(), Error> {
    let Audit {
        op,
        target,
        id,
        projects,
        before,
        labor,
    } = input;
    let evidence_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM poms.cost_governance_evidence WHERE target_type=$1 AND target_id=$2",
    )
    .bind(target)
    .bind(id)
    .fetch_one(&mut *session.connection)
    .await?;
    let safe_before = before.as_ref().map(audit_links);
    let safe_after =
        json!({"targetId":id,"evidenceId":evidence_id,"status":"active","rowVersion":1});
    for project in projects {
        contract_support::audit(
            session,
            actor,
            AuditWrite {
                operation_id: op.into(),
                target_type: target.into(),
                target_id: id,
                project_id: *project,
                contract_id: None,
                before: safe_before.clone(),
                after: Some(safe_after.clone()),
                reason: Some("Governed cost fact committed; original evidence retained".into()),
                metadata: audit_metadata(projects, labor, evidence_id),
            },
        )
        .await?;
    }
    Ok(())
}

fn audit_metadata(projects: &BTreeSet<Uuid>, labor: bool, evidence_id: Uuid) -> Value {
    json!({"affectedProjectIds":projects,"containsLabor":labor,"governanceSchemaVersion":1,"evidenceId":evidence_id,"safeAuditSummary":true})
}

fn audit_links(value: &Value) -> Value {
    let mut result = serde_json::Map::new();
    for key in [
        "id",
        "project_id",
        "basis_id",
        "cost_record_id",
        "supersedes_id",
        "governance_evidence_id",
        "row_version",
        "status",
        "record_status",
    ] {
        if let Some(value) = value.get(key) {
            result.insert(key.into(), value.clone());
        }
    }
    for key in ["cost", "attribution"] {
        if let Some(value) = value.get(key).filter(|v| v.is_object()) {
            result.insert(key.into(), audit_links(value));
        }
    }
    Value::Object(result)
}

fn weights(items: &[Value]) -> Result<Vec<logic::Share>, Error> {
    items
        .iter()
        .map(|v| {
            Ok(logic::Share {
                project: *store::id(v, "projectId")?.as_bytes(),
                weight: logic::decimal(store::text(v, "allocationWeight")?, 6, logic::MAX_MONEY)
                    .map_err(|_| domain("Invalid exact allocation weight"))?,
            })
        })
        .collect()
}

fn assertions(item: &Value, value: &logic::LayerAllocation) -> Result<(), Error> {
    if let Some(asserted) = item.get("allocatedAmount").filter(|v| !v.is_null()) {
        let expected = logic::decimal(
            asserted.as_str().ok_or(Error::Internal)?,
            2,
            logic::MAX_MONEY,
        )
        .map_err(|_| domain("Invalid amount assertion"))?;
        if expected != value.amount {
            return Err(domain(
                "Allocation assertion does not match the frozen rule",
            ));
        }
    }
    if let Some(asserted) = item.get("allocationRatio").filter(|v| !v.is_null()) {
        let expected = logic::decimal(asserted.as_str().ok_or(Error::Internal)?, 6, 1_000_000)
            .map_err(|_| domain("Invalid ratio assertion"))?;
        if expected != value.ratio {
            return Err(domain(
                "Allocation assertion does not match the frozen rule",
            ));
        }
    }
    Ok(())
}

pub(super) async fn allocation(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    replaced: Option<Uuid>,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    allocation_inner(session, op, replaced, body, actor, None, &[]).await
}

pub(crate) async fn allocation_with_restatement_scope(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    replaced: Uuid,
    body: &Value,
    actor: &Actor,
    scope: &crate::project_operating_common::model::VerifiedRestatementScope<'_>,
    transitions: &[crate::project_operating_common::model::VerifiedProducerTransition],
) -> Result<Value, Error> {
    allocation_inner(
        session,
        op,
        Some(replaced),
        body,
        actor,
        Some(scope),
        transitions,
    )
    .await
}

async fn allocation_inner(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    replaced: Option<Uuid>,
    body: &Value,
    actor: &Actor,
    scope: Option<&crate::project_operating_common::model::VerifiedRestatementScope<'_>>,
    transitions: &[crate::project_operating_common::model::VerifiedProducerTransition],
) -> Result<Value, Error> {
    if replaced.is_none()
        && ["basisType", "allocationMethod"].iter().any(|k| {
            body.get(*k)
                .and_then(Value::as_str)
                .is_none_or(|s| s.trim().is_empty())
        })
    {
        return Err(domain("A nonempty allocation type and method are required"));
    }
    let first_old = match replaced {
        Some(id) => Some(store::row(session.connection, Table::Result, id, false).await?),
        None => None,
    };
    let first_basis = match &first_old {
        Some(r) => Some(
            store::row(
                session.connection,
                Table::Basis,
                store::id(r, "basis_id")?,
                false,
            )
            .await?,
        ),
        None => None,
    };
    let old_source = match &first_basis {
        Some(b) => {
            store::children(
                session.connection,
                Table::Source,
                store::id(b, "id")?,
                false,
            )
            .await?
        }
        None => Vec::new(),
    };
    let mut sources = if first_basis.is_some() {
        old_source
            .iter()
            .map(|r| store::id(r, "cost_record_id"))
            .collect::<Result<Vec<_>, _>>()?
    } else {
        uuid_list(body, "sourceCostRecordIds")?
    };
    if scope.is_some() {
        for source in &mut sources {
            *source = restatement_successor_cost(*source, transitions)?;
        }
        sources.sort();
        if sources.windows(2).any(|p| p[0] == p[1]) {
            return Err(domain(
                "Correction cannot collapse two real allocation members",
            ));
        }
    }
    if sources.is_empty() {
        return Err(Error::Conflict(
            "Allocation has no certified source membership".into(),
        ));
    }
    let items = list(body, "projectShareItems")?;
    let mut projects = store::cost_projects(session.connection, &sources)
        .await?
        .into_iter()
        .collect::<BTreeSet<_>>();
    for item in items {
        projects.insert(store::id(item, "projectId")?);
    }
    if let Some(b) = &first_basis {
        for item in store::children(
            session.connection,
            Table::Result,
            store::id(b, "id")?,
            false,
        )
        .await?
        {
            projects.insert(store::id(&item, "project_id")?);
        }
    }
    if let Some(scope) = scope {
        scope.access.assert_session(session, actor).await?;
        if scope.actor_id != actor.id {
            return Err(Error::Forbidden(
                "Allocation correction actor mismatch".into(),
            ));
        }
        for project in &projects {
            scope.access.assert_project(*project)?;
        }
    }
    store::locks(session.connection, projects.iter().copied()).await?;
    let old_basis = match first_basis {
        Some(b) => {
            Some(store::row(session.connection, Table::Basis, store::id(&b, "id")?, true).await?)
        }
        None => None,
    };
    let old_results = match &old_basis {
        Some(b) => {
            store::children(session.connection, Table::Result, store::id(b, "id")?, true).await?
        }
        None => Vec::new(),
    };
    let mut costs = Vec::new();
    for id in &sources {
        costs.push(store::row(session.connection, Table::Cost, *id, false).await?);
    }
    for c in &costs {
        if !projects.contains(&store::id(c, "project_id")?) {
            return Err(Error::Conflict("Source project changed".into()));
        }
    }
    let mut labor = costs.iter().any(|c| c["cost_type"] == "labor");
    if let Some(b) = &old_basis {
        labor |= projection::labor(session, b).await?;
    }
    let guard_id = replaced.unwrap_or(store::id(&costs[0], "id")?);
    projection::guard_write(
        session,
        actor,
        "SharedCostAllocationBasis",
        guard_id,
        None,
        labor,
    )
    .await?;
    if scope.is_none() {
        let mut consumed_ids = sources.clone();
        consumed_ids.extend(
            old_results
                .iter()
                .map(|r| store::id(r, "id"))
                .collect::<Result<Vec<_>, _>>()?,
        );
        if let Some(basis) = &old_basis {
            consumed_ids.push(store::id(basis, "id")?);
        }
        if sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.operating_source_member WHERE source_id=ANY($1::uuid[]))").bind(consumed_ids).fetch_one(&mut *session.connection).await? {
            return Err(Error::CodedConflict{code:"operating_restatement_required",message:"Consumed complete allocation batch requires atomic restatement".into()});
        }
    }
    crate::project_actual_cost::lock_source_families(&mut *session.connection, &costs).await?;
    costs.clear();
    for id in &sources {
        costs.push(store::row(session.connection, Table::Cost, *id, true).await?);
    }
    for c in &costs {
        if !projects.contains(&store::id(c, "project_id")?) {
            return Err(Error::Conflict("Source project changed".into()));
        }
    }
    if costs.iter().any(|c| c["cost_type"] == "labor") && !labor {
        return Err(Error::Conflict("Source classification changed".into()));
    }
    let mut old_by_project = BTreeMap::new();
    let mut anchor_project = None;
    if let Some(b) = &old_basis {
        store::active(b)?;
        contract_support::expected_version(
            &json!({"expectedVersion":body["expectedBasisVersion"]}),
            store::version(b)?,
            "SharedCostAllocationBasis",
        )?;
        if store::certify(b) != "verified" {
            return Err(Error::Conflict(
                "Legacy allocation evidence requires controlled reconciliation".into(),
            ));
        }
        for r in &old_results {
            if r["status"] == "active" {
                old_by_project.insert(store::id(r, "project_id")?, r.clone());
            }
        }
        let anchor = old_results
            .iter()
            .find(|r| store::id(r, "id").ok() == replaced)
            .ok_or_else(|| Error::Conflict("Replacement anchor is no longer current".into()))?;
        store::active(anchor)?;
        contract_support::expected_version(
            body,
            store::version(anchor)?,
            "SharedCostAllocationResult",
        )?;
        anchor_project = Some(store::id(anchor, "project_id")?);
        if !items
            .iter()
            .any(|v| store::id(v, "projectId").ok() == anchor_project)
        {
            return Err(domain("Replacement must retain the anchored project"));
        }
    }
    let mut expected = BTreeMap::new();
    if old_basis.is_none() {
        for item in list(body, "expectedSourceVersions")? {
            let id = store::id(item, "costRecordId")?;
            let version = item
                .get("expectedVersion")
                .and_then(Value::as_i64)
                .filter(|n| *n > 0)
                .ok_or_else(|| Error::BadRequest("A source version is required".into()))?;
            if expected.insert(id, version).is_some() {
                return Err(domain("Duplicate source version assertion"));
            }
        }
        if expected.keys().copied().collect::<BTreeSet<_>>() != sources.iter().copied().collect() {
            return Err(domain(
                "Source version assertions must exactly cover the source set",
            ));
        }
    } else {
        for source in &old_source {
            let old_id = store::id(source, "cost_record_id")?;
            let current_id = if scope.is_some() {
                restatement_successor_cost(old_id, transitions)?
            } else {
                old_id
            };
            let version = if let Some(scope) = scope {
                let current = costs
                    .iter()
                    .find(|c| store::id(c, "id").ok() == Some(current_id))
                    .ok_or(Error::Internal)?;
                validate_restatement_allocation_source(
                    session,
                    scope,
                    source,
                    current,
                    transitions,
                )
                .await?;
                i64::from(store::version(current)?)
            } else {
                source["cost_row_version"].as_i64().ok_or(Error::Internal)?
            };
            expected.insert(current_id, version);
        }
    }
    let mut source_snapshots = Vec::new();
    let mut source_money = Vec::new();
    let mut currency = None;
    let mut business_date = None;
    for cost in &costs {
        let id = store::id(cost, "id")?;
        if expected.get(&id).copied() != Some(i64::from(store::version(cost)?)) {
            return Err(Error::Conflict("Allocation source version changed".into()));
        }
        if cost["record_status"] != "confirmed"
            || cost["is_included_in_project_cost"] != false
            || cost["stage_locked_at"].is_null()
            || cost["execution_stage_code"].is_null()
        {
            return Err(Error::Conflict(
                "Allocation requires a confirmed, stage-locked, non-included cost".into(),
            ));
        }
        if let Some(b) = &old_basis {
            let source = old_source
                .iter()
                .find(|s| {
                    store::id(s, "cost_record_id").ok().and_then(|old| {
                        if scope.is_some() {
                            restatement_successor_cost(old, transitions).ok()
                        } else {
                            Some(old)
                        }
                    }) == Some(id)
                })
                .ok_or(Error::Internal)?;
            if source["is_current"] != true || store::id(source, "basis_id")? != store::id(b, "id")?
            {
                return Err(Error::Conflict(
                    "Allocation source occupancy changed".into(),
                ));
            }
        } else if store::occupied(session.connection, id).await? {
            return Err(Error::Conflict(
                "Source is already reserved by an active allocation".into(),
            ));
        }
        let facts = evidence::cost_source(session, cost).await?;
        let ccy = store::text(&facts, "currency")?.to_owned();
        if currency.as_ref().is_some_and(|c| c != &ccy) {
            return Err(domain(
                "Allocation sources must have the same proven currency",
            ));
        }
        currency = Some(ccy);
        let date = evidence::date(store::text(&facts, "occurredOn")?)?;
        if business_date.as_ref().is_none_or(|d| d < &date) {
            business_date = Some(date);
        }
        source_money.push(evidence::layers(
            cost,
            [
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
            ],
        )?);
        source_snapshots.push(json!({"cost":cost,"source":facts}));
    }
    let currency = currency.ok_or(Error::Internal)?;
    let date = business_date.ok_or(Error::Internal)?;
    let measurement = match &old_basis {
        Some(b) => store::text(b, "measurement_basis")?,
        None => store::text(body, "measurementBasis")?,
    };
    let layer = match measurement {
        "excluding-tax" => 0,
        "tax" => 1,
        "including-tax" => 2,
        _ => return Err(domain("Unknown allocation measurement layer")),
    };
    let totals = logic::total_layers(&source_money).map_err(domain)?;
    let shares = weights(items)?;
    let allocated = logic::allocate_layers(totals, &shares, layer).map_err(domain)?;
    for allocation in &allocated {
        let item = items
            .iter()
            .find(|i| {
                store::id(i, "projectId").map(|id| *id.as_bytes()).ok() == Some(allocation.project)
            })
            .ok_or(Error::Internal)?;
        assertions(item, allocation)?;
    }
    if let Some(project) = anchor_project {
        let allocation = allocated
            .iter()
            .find(|a| a.project == *project.as_bytes())
            .ok_or(Error::Internal)?;
        assertions(body, allocation)?;
    }
    // Unchanged economic layers and actual frozen weights must reproduce every
    // prior project cent, even when stage provenance was refreshed late.
    if scope.is_some() {
        if let Some(old_basis) = &old_basis {
            let previous_totals = evidence::layers(
                old_basis,
                [
                    "source_amount_excluding_tax",
                    "source_tax_cost_amount",
                    "source_amount_including_tax",
                ],
            )?;
            let unchanged_weights=items.len()==old_by_project.len() && items.iter().all(|item|store::id(item,"projectId").ok().and_then(|id|old_by_project.get(&id)).is_some_and(|old|{
                matches!((logic::decimal(store::text(item,"allocationWeight").unwrap_or(""),6,logic::MAX_MONEY),logic::decimal(store::text(old,"allocation_weight").unwrap_or(""),6,logic::MAX_MONEY)),(Ok(a),Ok(b))if a==b)
            }));
            if previous_totals == totals && unchanged_weights {
                for allocation in &allocated {
                    let old = old_by_project
                        .get(&Uuid::from_bytes(allocation.project))
                        .ok_or(Error::Internal)?;
                    if evidence::layers(
                        old,
                        [
                            "allocated_amount_excluding_tax",
                            "allocated_tax_cost_amount",
                            "allocated_amount_including_tax",
                        ],
                    )? != allocation.layers
                    {
                        return Err(Error::Conflict(
                            "Stage-only allocation refresh changed conserved project cents".into(),
                        ));
                    }
                }
            }
        }
    }
    let basis_id = contract_support::new_uuid()?;
    let operation = contract_support::new_uuid()?;
    let reason = store::optional_text(body, "replacementReason");
    let basis_type = match &old_basis {
        Some(b) => b["basis_type"].clone(),
        None => body["basisType"].clone(),
    };
    let method = match &old_basis {
        Some(b) => b["allocation_method"].clone(),
        None => body["allocationMethod"].clone(),
    };
    let mut source_ids = sources.iter().map(Uuid::to_string).collect::<Vec<_>>();
    source_ids.sort();
    let hash = Sha256::digest(source_ids.join("|").as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    let scope = format!("cost-scope:{hash}");
    let refs=json!(costs.iter().map(|c|json!({"kind":"source","sourceType":"project-actual-cost-record","sourceId":c["id"],"sourceVersion":c["row_version"],"businessDate":c["occurred_on"]})).collect::<Vec<_>>());
    let source_version_transitions = source_proofs(&source_snapshots);
    let policy = allocation_policy(measurement)?;
    let payload = allocation_payload(
        json!({"containsLabor":labor,"sources":source_snapshots,"sourceVersionTransitions":source_version_transitions,"measurementBasis":measurement,"totals":totals.map(amount),"currency":currency,"projectShares":items,"algorithm":logic::ALGORITHM,"predecessorBasisId":old_basis.as_ref().map(|b|b["id"].clone())}),
        &policy,
    )?;
    let evidence_id = evidence::persist(
        session,
        actor,
        evidence::Write {
            target: "SharedCostAllocationBasis",
            target_id: basis_id,
            project: None,
            kind: "source-facts",
            business_date: &date,
            refs: &refs,
            payload: &payload,
            reason: reason
                .as_deref()
                .unwrap_or("Confirmed shared allocation basis"),
        },
    )
    .await?;
    let now = store::now();
    let basis = json!({"id":basis_id,"source_cost_scope_key":scope,"basis_type":basis_type,"allocation_method":method,"basis_summary":summary(body,"basisSummary",reason.as_deref()),"status":"active","effective_at":now,"effective_by":actor.id,"supersedes_id":old_basis.as_ref().map(|b|b["id"].clone()),"created_at":now,"updated_at":now,"created_by":actor.id,"updated_by":actor.id,"row_version":1,"currency":currency,"measurement_basis":measurement,"source_amount_excluding_tax":amount(totals[0]),"source_tax_cost_amount":amount(totals[1]),"source_amount_including_tax":amount(totals[2]),"measurement_amount":amount(totals[layer]),"allocation_algorithm":logic::ALGORITHM,"replacement_operation_id":operation,"replacement_reason":reason,"governance_evidence_id":evidence_id,"governance_schema_version":1});
    if let Some(old) = &old_basis {
        store::supersede(session, Table::Basis, old, actor.id).await?;
        for old in old_by_project.values() {
            store::supersede(session, Table::Result, old, actor.id).await?;
        }
        sqlx::query("UPDATE poms.shared_cost_allocation_source_snapshot SET is_current=false WHERE basis_id=$1 AND is_current").bind(store::id(old,"id")?).execute(&mut *session.connection).await?;
    }
    store::insert(session, Table::Basis, &basis).await?;
    for (cost, snapshot) in costs.iter().zip(&source_snapshots) {
        store::insert(session,Table::Source,&json!({"basis_id":basis_id,"cost_record_id":cost["id"],"cost_row_version":cost["row_version"],"source_type":cost["source_type"],"source_id":cost["source_id"],"source_row_version":snapshot["source"]["sourceRowVersion"],"currency":currency,"amount_excluding_tax":cost["amount_excluding_tax"],"tax_cost_amount":cost["tax_cost_amount"],"amount_including_tax":cost["amount_including_tax"],"source_payload":snapshot,"source_payload_hash":contract_support::canonical_hash(snapshot)?,"is_current":true,"created_at":now})).await?;
    }
    let mut result_ids = Vec::new();
    let mut target = None;
    for allocation in allocated {
        let project = Uuid::from_bytes(allocation.project);
        let id = contract_support::new_uuid()?;
        let item = items
            .iter()
            .find(|i| store::id(i, "projectId").ok() == Some(project))
            .ok_or(Error::Internal)?;
        let old = old_by_project.get(&project);
        let result_payload = allocation_payload(
            json!({"containsLabor":labor,"basisId":basis_id,"basisEvidenceId":evidence_id,"sourceVersionTransitions":source_version_transitions,"allocation":item,"layers":allocation.layers.map(amount),"amount":logic::format_scaled(allocation.amount,2),"ratio":logic::format_scaled(allocation.ratio,6),"residualMinorUnits":allocation.residual,"predecessorResultId":old.map(|r|r["id"].clone())}),
            &policy,
        )?;
        let result_evidence = evidence::persist(
            session,
            actor,
            evidence::Write {
                target: "SharedCostAllocationResult",
                target_id: id,
                project: Some(project),
                kind: "source-facts",
                business_date: &date,
                refs: &refs,
                payload: &result_payload,
                reason: reason.as_deref().unwrap_or("Confirmed project share"),
            },
        )
        .await?;
        let result = json!({"id":id,"basis_id":basis_id,"project_id":project,"allocated_amount":logic::format_scaled(allocation.amount,2),"allocation_ratio":logic::format_scaled(allocation.ratio,6),"allocation_weight":store::text(item,"allocationWeight")?,"allocation_summary":summary(item,"allocationSummary",None),"status":"active","effective_at":now,"supersedes_id":old.map(|r|r["id"].clone()),"created_at":now,"updated_at":now,"created_by":actor.id,"updated_by":actor.id,"row_version":1,"currency":currency,"allocated_amount_excluding_tax":amount(allocation.layers[0]),"allocated_tax_cost_amount":amount(allocation.layers[1]),"allocated_amount_including_tax":amount(allocation.layers[2]),"residual_minor_units":allocation.residual,"replacement_operation_id":operation,"replacement_reason":reason,"governance_evidence_id":result_evidence,"governance_schema_version":1});
        store::insert(session, Table::Result, &result).await?;
        result_ids.push(id);
        if anchor_project == Some(project) {
            target = Some((id, result_evidence));
        }
    }
    audit(
        session,
        actor,
        Audit {
            op,
            target: "SharedCostAllocationBasis",
            id: basis_id,
            projects: &projects,
            before: old_basis.clone(),
            labor,
        },
    )
    .await?;
    if let Some(old) = replaced {
        let (id, target_evidence) = target.ok_or(Error::Internal)?;
        let mut response = store::command(id, "SharedCostAllocationResult");
        response["basisId"] = json!(basis_id);
        response["supersedesBasisId"] = old_basis.as_ref().ok_or(Error::Internal)?["id"].clone();
        response["allocationResultIds"] = json!(result_ids);
        response["replacementResultId"] = json!(id);
        response["supersedesAllocationResultId"] = json!(old);
        response["evidenceId"] = json!(target_evidence);
        Ok(response)
    } else {
        let mut response = store::command(basis_id, "SharedCostAllocationBasis");
        response["basisId"] = json!(basis_id);
        response["allocationResultIds"] = json!(result_ids);
        response["evidenceId"] = json!(evidence_id);
        Ok(response)
    }
}

pub(super) async fn stage(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    reclassify: bool,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    stage_inner(session, op, id, reclassify, body, actor, None).await
}

pub(crate) async fn stage_with_restatement_permit(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    body: &Value,
    actor: &Actor,
    permit: &crate::project_operating_common::model::StageReclassificationPermit<'_>,
) -> Result<Value, Error> {
    stage_inner(session, op, id, true, body, actor, Some(permit)).await
}

async fn stage_inner(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    reclassify: bool,
    body: &Value,
    actor: &Actor,
    permit: Option<&crate::project_operating_common::model::StageReclassificationPermit<'_>>,
) -> Result<Value, Error> {
    let previous = if reclassify {
        Some(store::row(session.connection, Table::Stage, id, false).await?)
    } else {
        None
    };
    let cost_id = match &previous {
        Some(old) => store::id(old, "cost_record_id")?,
        None => id,
    };
    let initial = store::row(session.connection, Table::Cost, cost_id, false).await?;
    let project = store::id(&initial, "project_id")?;
    store::locks(session.connection, [project]).await?;
    let cost = store::row(session.connection, Table::Cost, cost_id, true).await?;
    if store::id(&cost, "project_id")? != project {
        return Err(Error::Conflict("Cost project changed".into()));
    }
    let previous = match previous {
        Some(p) => {
            Some(store::row(session.connection, Table::Stage, store::id(&p, "id")?, true).await?)
        }
        None => None,
    };
    let mut labor = cost["cost_type"] == "labor";
    if let Some(old) = &previous {
        labor |= projection::labor(session, old).await?;
    }
    let mut family_costs =
        evidence::cost_references(session, &[body["attributionEvidence"].clone()], project).await?;
    labor |= family_costs.iter().any(|c| c["cost_type"] == "labor");
    family_costs.push(cost.clone());
    projection::guard_write(
        session,
        actor,
        "CostStageAttributionSnapshot",
        id,
        Some(project),
        labor,
    )
    .await?;
    crate::project_actual_cost::lock_source_families(&mut *session.connection, &family_costs)
        .await?;
    if let Some(permit) = permit {
        validate_stage_restatement_permit(session, actor, permit, cost_id, id, project).await?;
    } else if operating_source_consumed(session, cost_id).await?
        && !is_true_first_stage_append(session, &cost, reclassify).await?
    {
        return Err(crate::contract_support::Error::CodedConflict {
            code: "operating_restatement_required",
            message: "Consumed cost facts require an atomic restatement".into(),
        });
    }
    if !(permit.is_some()
        && cost["record_status"] == "included"
        && cost["is_included_in_project_cost"] == true)
        && !logic::valid_confirmation_state(
            store::text(&cost, "record_status")?,
            cost["is_included_in_project_cost"]
                .as_bool()
                .unwrap_or(true),
        )
    {
        return Err(Error::Conflict(
            "Cost is not an eligible current confirmation fact".into(),
        ));
    }
    let facts = evidence::cost_source(session, &cost).await?;
    let mut current = store::children(session.connection, Table::Stage, cost_id, true)
        .await?
        .into_iter()
        .filter(|v| v["status"] == "active")
        .collect::<Vec<_>>();
    if let Some(old) = &previous {
        store::active(old)?;
        contract_support::expected_version(
            body,
            store::version(old)?,
            "CostStageAttributionSnapshot",
        )?;
        if current.len() != 1 || current[0]["id"] != old["id"] {
            return Err(Error::Conflict(
                "Stage attribution current pointer changed".into(),
            ));
        }
        if !old["locked_by_snapshot_id"].is_null() && permit.is_none() {
            return Err(Error::Conflict(
                "A frozen historical attribution requires an explicit restatement".into(),
            ));
        }
    } else {
        contract_support::expected_version(
            body,
            store::version(&cost)?,
            "ProjectActualCostRecord",
        )?;
        if !current.is_empty() {
            return Err(Error::Conflict(
                "Cost already has a current stage attribution".into(),
            ));
        }
    }
    if store::occupied(session.connection, cost_id).await? && permit.is_none() {
        return Err(Error::Conflict(
            "Cost is frozen by a current allocation".into(),
        ));
    }
    if let Some(snapshot) = store::optional_id(body, "lockedBySnapshotId")? {
        let exists=sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.project_operating_snapshot WHERE id=$1 AND project_id=$2 AND status='active' AND snapshot_mode IN ('period-end','restated'))").bind(snapshot).bind(project).fetch_one(&mut *session.connection).await?;
        if !exists {
            return Err(domain(
                "No same-project frozen snapshot evidence is available",
            ));
        }
        // The frozen schema contains no per-cost membership relation. A window
        // or project equality alone is not proof that this cost was frozen.
        return Err(domain(
            "Snapshot lacks verifiable cost membership; use the governed restatement flow",
        ));
    }
    let target = store::text(
        body,
        if reclassify {
            "newAttributedStage"
        } else {
            "attributedStage"
        },
    )?;
    if target.trim().is_empty() {
        return Err(domain("An explicit evidenced stage is required"));
    }
    let reference =
        evidence::reference(session, &body["attributionEvidence"], project, actor).await?;
    let date = evidence::date(store::text(&facts, "occurredOn")?)?;
    if reference.date != date {
        return Err(domain(
            "Stage evidence must cover the real cost business date",
        ));
    }
    if let Some(ccy) = &reference.currency
        && ccy != store::text(&facts, "currency")?
    {
        return Err(domain(
            "Stage evidence currency differs from the cost source",
        ));
    }
    if !reclassify && body["stageAttributionMode"] == "auto" {
        if reference.stage.as_deref() != Some(target) {
            return Err(domain(
                "Automatic attribution requires a matching real historical stage fact",
            ));
        }
        if cost["cost_type"] == "labor" && cost["labor_period_start"] != cost["labor_period_end"] {
            return Err(domain(
                "A milestone cannot prove a multi-day labor interval; split or provide full-period manual evidence",
            ));
        }
    }
    if cost["record_status"] == "confirmed" {
        if cost["confirmed_at"].is_null() || cost["confirmed_by"].is_null() {
            return Err(Error::Conflict(
                "Existing confirmation responsibility is incomplete".into(),
            ));
        }
        if !reclassify
            && (cost["execution_stage_code"] != target || cost["stage_locked_at"].is_null())
        {
            return Err(Error::Conflict(
                "Existing confirmed cost has different locked stage evidence".into(),
            ));
        }
        if !reclassify {
            let input = &body["attributionEvidence"];
            let normalized = |s: &str| {
                s.bytes()
                    .filter(u8::is_ascii_alphanumeric)
                    .map(|b| b.to_ascii_lowercase())
                    .collect::<Vec<_>>()
            };
            if input["kind"] != "source"
                || cost["stage_derived_from_id"] != input["sourceId"]
                || normalized(store::text(&cost, "stage_derived_from_type")?)
                    != normalized(store::text(input, "sourceType")?)
            {
                return Err(Error::Conflict(
                    "Existing confirmed cost requires matching original stage evidence".into(),
                ));
            }
        }
    }
    let attribution_id = contract_support::new_uuid()?;
    let now = store::now();
    let handled_at = chrono::DateTime::parse_from_rfc3339(&now)
        .map_err(|_| Error::Internal)?
        .with_timezone(&chrono::Utc);
    let next_version = store::version(&cost)?
        .checked_add(1)
        .ok_or_else(|| Error::Conflict("Cost version capacity is exhausted".into()))?;
    let mut cost_after = cost.clone();
    if cost["record_status"] == "registered" {
        cost_after["confirmed_at"] = json!(now);
        cost_after["confirmed_by"] = json!(actor.id);
    }
    if cost["record_status"] != "included" {
        cost_after["record_status"] = json!("confirmed");
    }
    cost_after["execution_stage_code"] = json!(target);
    cost_after["stage_derived_from_type"] = json!("CostStageAttributionSnapshot");
    cost_after["stage_derived_from_id"] = json!(attribution_id);
    cost_after["stage_derived_at"] = json!(now);
    cost_after["stage_locked_at"] = json!(now);
    cost_after["row_version"] = json!(next_version);
    cost_after["updated_at"] = json!(now);
    cost_after["updated_by"] = json!(actor.id);
    let reason = store::optional_text(
        body,
        if reclassify {
            "reclassifyReason"
        } else {
            "attributionSummary"
        },
    )
    .unwrap_or_else(|| "Confirmed cost stage evidence".into());
    let refs = json!([body["attributionEvidence"]]);
    let mut source_version_transitions = vec![facts["governanceVersionProof"].clone()];
    if let Some(proof) = reference
        .snapshot
        .get("source")
        .and_then(|s| s.get("governanceVersionProof"))
    {
        source_version_transitions.push(proof.clone());
    }
    let payload = json!({"containsLabor":labor,"costBefore":cost,"costAfter":cost_after,"source":facts,"sourceVersionTransitions":source_version_transitions,"evidence":reference.snapshot,"attributedStage":target,"predecessorAttributionId":previous.as_ref().map(|r|r["id"].clone()),"actorId":actor.id});
    let evidence_id = evidence::persist(
        session,
        actor,
        evidence::Write {
            target: "CostStageAttributionSnapshot",
            target_id: attribution_id,
            project: Some(project),
            kind: if body["attributionEvidence"]["kind"] == "manual" {
                "manual-stage"
            } else {
                "source-facts"
            },
            business_date: &date,
            refs: &refs,
            payload: &payload,
            reason: &reason,
        },
    )
    .await?;
    let attribution = json!({"id":attribution_id,"cost_record_id":cost_id,"attributed_stage":target,"attribution_mode":if reclassify{"reclassified"}else{store::text(body,"stageAttributionMode")?},"locked_by_snapshot_id":null,"attribution_summary":summary(body,if reclassify{"reclassifyReason"}else{"attributionSummary"},Some(&reason)),"status":"active","supersedes_id":previous.as_ref().map(|r|r["id"].clone()),"handled_at":now,"handled_by":actor.id,"created_at":now,"created_by":actor.id,"updated_at":now,"updated_by":actor.id,"row_version":1,"evidence_business_date":date,"governance_evidence_id":evidence_id,"governance_schema_version":1});
    if let Some(old) = &previous {
        store::supersede(session, Table::Stage, old, actor.id).await?;
    }
    store::insert(session, Table::Stage, &attribution).await?;
    let result=sqlx::query("UPDATE poms.project_actual_cost_record SET record_status=CASE WHEN $8 AND record_status='included' THEN record_status ELSE 'confirmed' END,confirmed_at=CASE WHEN record_status='registered' THEN $1 ELSE confirmed_at END,confirmed_by=CASE WHEN record_status='registered' THEN $2 ELSE confirmed_by END,execution_stage_code=$3,stage_derived_from_type='CostStageAttributionSnapshot',stage_derived_from_id=$4,stage_derived_at=$1,stage_locked_at=$1,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$5 AND project_id=$6 AND row_version=$7 AND ((record_status IN ('registered','confirmed') AND NOT is_included_in_project_cost) OR ($8 AND record_status='included' AND is_included_in_project_cost))")
        .bind(handled_at).bind(actor.id).bind(target).bind(attribution_id.to_string()).bind(cost_id).bind(project).bind(store::version(&cost)?).bind(permit.is_some()).execute(&mut *session.connection).await?;
    if result.rows_affected() != 1 {
        return Err(Error::Conflict("Cost confirmation version changed".into()));
    }
    audit(
        session,
        actor,
        Audit {
            op,
            target: "CostStageAttributionSnapshot",
            id: attribution_id,
            projects: &BTreeSet::from([project]),
            before: Some(json!({"cost":cost,"attribution":previous})),
            labor,
        },
    )
    .await?;
    current.clear();
    let mut response = store::command(attribution_id, "CostStageAttributionSnapshot");
    response["attributionSnapshotId"] = json!(attribution_id);
    response["costRecordId"] = json!(cost_id);
    response["evidenceId"] = json!(evidence_id);
    if reclassify {
        response["supersedesAttributionId"] = json!(id);
    }
    Ok(response)
}

pub(super) async fn tax(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    replacing: bool,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    tax_inner(session, op, id, replacing, body, actor, None).await
}

pub(crate) async fn tax_with_restatement_permit(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    body: &Value,
    actor: &Actor,
    permit: &crate::project_operating_common::model::TaxTreatmentReplacementPermit<'_>,
) -> Result<Value, Error> {
    tax_inner(session, op, id, true, body, actor, Some(permit)).await
}

async fn tax_inner(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    replacing: bool,
    body: &Value,
    actor: &Actor,
    permit: Option<&crate::project_operating_common::model::TaxTreatmentReplacementPermit<'_>>,
) -> Result<Value, Error> {
    let initial = if replacing {
        Some(store::row(session.connection, Table::Tax, id, false).await?)
    } else {
        None
    };
    let project = match &initial {
        Some(v) => store::id(v, "project_id")?,
        None => id,
    };
    store::locks(session.connection, [project]).await?;
    let previous = match initial {
        Some(_) => Some(store::row(session.connection, Table::Tax, id, true).await?),
        None => None,
    };
    let mut labor = false;
    if let Some(old) = &previous {
        labor |= projection::labor(session, old).await?;
    }
    let refs = list(body, "sourceReferences")?;
    // Metadata classification occurs before money/value assertions. A caller
    // without both labor permissions cannot probe an equality/validation oracle.
    let family_costs = evidence::cost_references(session, refs, project).await?;
    labor |= family_costs.iter().any(|c| c["cost_type"] == "labor");
    projection::guard_write(
        session,
        actor,
        "AccountingTaxTreatmentSnapshot",
        id,
        Some(project),
        labor,
    )
    .await?;
    crate::project_actual_cost::lock_source_families(&mut *session.connection, &family_costs)
        .await?;
    if let Some(old) = &previous {
        store::active(old)?;
        contract_support::expected_version(
            body,
            store::version(old)?,
            "AccountingTaxTreatmentSnapshot",
        )?;
    }
    if let Some(permit) = permit {
        permit.scope.access.assert_session(session, actor).await?;
        permit.scope.access.assert_project(project)?;
        if permit.tax_treatment_id != id
            || permit.project_id != project
            || permit.scope.actor_id != actor.id
        {
            return Err(Error::Forbidden(
                "Tax correction permit does not match this exact producer".into(),
            ));
        }
        validate_locked_reference(
            session,
            &permit.scope.locked_source_refs,
            "AccountingTaxTreatmentSnapshot",
            id,
        )
        .await?;
    } else if replacing && operating_source_consumed(session, id).await? {
        return Err(crate::contract_support::Error::CodedConflict {
            code: "operating_restatement_required",
            message: "Consumed tax facts require an atomic restatement".into(),
        });
    }
    let currency = evidence::currency(store::text(body, "currency")?)?;
    let mut source_snapshots = Vec::new();
    let mut date = None;
    let mut reference_ids = BTreeSet::new();
    for source in refs {
        if source["kind"] == "source"
            && !reference_ids.insert((
                store::text(source, "sourceType")?.to_owned(),
                store::text(source, "sourceId")?.to_owned(),
            ))
        {
            return Err(domain("Duplicate tax source evidence"));
        }
        let r = evidence::reference(session, source, project, actor).await?;
        if let Some(ref ccy) = r.currency {
            if ccy != currency {
                return Err(domain(
                    "Tax source currency does not match the declared currency",
                ));
            }
        } else if source["kind"] != "manual" {
            return Err(domain("Tax evidence requires a proven source currency"));
        }
        labor |= r.labor;
        if date.as_ref().is_none_or(|d| d < &r.date) {
            date = Some(r.date.clone());
        }
        source_snapshots.push(r.snapshot);
    }
    projection::guard_write(
        session,
        actor,
        "AccountingTaxTreatmentSnapshot",
        id,
        Some(project),
        labor,
    )
    .await?;
    let impact = logic::signed_money(store::text(body, "taxImpactAmount")?)
        .map_err(|_| domain("Invalid exact tax impact amount"))?;
    let pending = logic::decimal(
        body.get("taxImpactPendingAmount")
            .and_then(Value::as_str)
            .unwrap_or("0"),
        2,
        logic::MAX_MONEY,
    )
    .map_err(|_| domain("Invalid exact pending tax amount"))?;
    let pending_flag = body
        .get("taxPendingFlag")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    if (!pending_flag && pending != 0)
        || (body["deductibilityStatus"] == "pending" && !pending_flag)
    {
        return Err(domain("Tax pending conclusion is inconsistent"));
    }
    let tax_type = store::text(body, "taxTreatmentType")?;
    if tax_type.trim().is_empty() || store::text(body, "taxImpactSummary")?.trim().is_empty() {
        return Err(domain(
            "A nonempty tax type and impact explanation are required",
        ));
    }
    let current = store::children(session.connection, Table::Tax, project, true).await?;
    if current.iter().any(|r| {
        r["status"] == "active"
            && r["tax_treatment_type"] == tax_type
            && (!replacing || r["id"] != json!(id))
    }) {
        return Err(Error::Conflict(
            "Another active tax treatment exists for this project and type".into(),
        ));
    }
    let new_id = contract_support::new_uuid()?;
    let date = date.ok_or(Error::Internal)?;
    let reason = store::optional_text(body, "replacementReason")
        .unwrap_or_else(|| "Confirmed responsible tax assessment".into());
    let payload = json!({"containsLabor":labor,"sources":source_snapshots,"sourceVersionTransitions":source_proofs(&source_snapshots),"assessment":body,"predecessorTaxTreatmentId":previous.as_ref().map(|r|r["id"].clone()),"actorId":actor.id,"automaticallyIncludedInCost":false});
    let eid = evidence::persist(
        session,
        actor,
        evidence::Write {
            target: "AccountingTaxTreatmentSnapshot",
            target_id: new_id,
            project: Some(project),
            kind: if refs.iter().any(|r| r["kind"] == "manual") {
                "manual-finance"
            } else {
                "source-facts"
            },
            business_date: &date,
            refs: &json!(refs),
            payload: &payload,
            reason: &reason,
        },
    )
    .await?;
    let now = store::now();
    let record = json!({"id":new_id,"project_id":project,"tax_treatment_type":tax_type,"deductibility_status":body["deductibilityStatus"],"tax_impact_amount":logic::format_scaled(impact,2),"tax_pending_flag":pending_flag,"tax_impact_summary":body["taxImpactSummary"],"tax_impact_pending_amount":logic::format_scaled(pending,2),"basis_summary":body.get("basisSummary").cloned().unwrap_or(Value::Null),"status":"active","supersedes_id":previous.as_ref().map(|r|r["id"].clone()),"confirmed_at":now,"confirmed_by":actor.id,"created_at":now,"created_by":actor.id,"updated_at":now,"updated_by":actor.id,"row_version":1,"currency":currency,"replacement_reason":if replacing{Some(reason.clone())}else{None},"governance_evidence_id":eid,"governance_schema_version":1});
    if let Some(old) = &previous {
        store::supersede(session, Table::Tax, old, actor.id).await?;
    }
    store::insert(session, Table::Tax, &record).await?;
    audit(
        session,
        actor,
        Audit {
            op,
            target: "AccountingTaxTreatmentSnapshot",
            id: new_id,
            projects: &BTreeSet::from([project]),
            before: previous,
            labor,
        },
    )
    .await?;
    let projected = projection::fields(
        session,
        actor,
        "AccountingTaxTreatmentSnapshot",
        new_id,
        Some(project),
        labor,
        vec![
            (
                "taxImpactSummaryProjection",
                store::optional_text(&record, "tax_impact_summary"),
            ),
            (
                "taxImpactPendingAmountProjection",
                store::optional_text(&record, "tax_impact_pending_amount"),
            ),
        ],
    )
    .await?;
    let mut response = store::command(new_id, "AccountingTaxTreatmentSnapshot");
    response["taxTreatmentSnapshotId"] = json!(new_id);
    response["evidenceId"] = json!(eid);
    for (k, v) in projected {
        response[k] = v;
    }
    if replacing {
        response["supersedesTaxTreatmentSnapshotId"] = json!(id);
    }
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn allocation_policy_is_server_owned_hash_bound_and_does_not_rewrite_old_payload() {
        let historical = json!({"algorithm":"largest-remainder-cents-v1","totals":["0.11","0.01","0.12"],"oldGross":["0.07","0.05"]});
        let old_hash = contract_support::canonical_hash(&historical).unwrap();
        let policy = allocation_policy("including-tax").unwrap();
        assert_eq!(policy["id"], "selected-measurement-first");
        assert_eq!(policy["version"], 2);
        assert_eq!(policy["grossComponents"], "gross-cap-net-tax-complement");
        let basis = allocation_payload(historical.clone(), &policy).unwrap();
        let result = allocation_payload(
            json!({"allocationPolicy":{"version":999},"amount":"0.06"}),
            &policy,
        )
        .unwrap();
        assert_eq!(basis["allocationPolicy"], result["allocationPolicy"]);
        assert_ne!(contract_support::canonical_hash(&basis).unwrap(), old_hash);
        assert_eq!(
            contract_support::canonical_hash(&historical).unwrap(),
            old_hash
        );
        assert!(historical.get("allocationPolicy").is_none());
        for primary in ["excluding-tax", "tax"] {
            let policy = allocation_policy(primary).unwrap();
            assert_eq!(policy["measurementBasis"], primary);
            assert_eq!(
                policy["grossComponents"],
                "independent-components-gross-sum"
            );
        }
    }
    #[test]
    fn generic_runtime_audit_get_cannot_bypass_governed_financial_evidence() {
        let before = json!({"cost":{"id":"cost-id","row_version":2,"record_status":"confirmed","internal_cost_rate":"9999.0000","amount_excluding_tax":"12345.67","costDescription":"private price"},"attribution":{"id":"stage-id","governance_evidence_id":"evidence-id","attribution_summary":"private labor explanation"},"reason":"private amount 12345.67"});
        let safe = audit_links(&before);
        let serialized = safe.to_string();
        for secret in [
            "9999.0000",
            "12345.67",
            "private price",
            "private labor explanation",
        ] {
            assert!(!serialized.contains(secret));
        }
        assert_eq!(safe["cost"]["id"], "cost-id");
        assert_eq!(safe["cost"]["row_version"], 2);
        assert_eq!(safe["attribution"]["governance_evidence_id"], "evidence-id");
        let metadata = audit_metadata(&BTreeSet::from([Uuid::nil()]), true, Uuid::nil());
        assert_eq!(metadata["safeAuditSummary"], true);
        assert_eq!(metadata["evidenceId"], Uuid::nil().to_string());
        assert_eq!(metadata["affectedProjectIds"], json!([Uuid::nil()]));
        assert_eq!(metadata.as_object().unwrap().len(), 5);
        for key in [
            "reason",
            "sourcePayload",
            "before",
            "after",
            "amount",
            "rate",
        ] {
            assert!(metadata.get(key).is_none());
        }
    }
}

async fn operating_source_consumed(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
) -> Result<bool, Error> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM poms.operating_source_member WHERE source_id=$1)",
    )
    .bind(id)
    .fetch_one(&mut *session.connection)
    .await?)
}

async fn validate_locked_reference(
    session: &mut CommonSession<'_, '_>,
    locked: &[crate::project_operating_common::model::SourceRef],
    kind: &str,
    id: Uuid,
) -> Result<(), Error> {
    let actual =
        crate::project_operating::sources::source_reference_with_session(session, kind, id).await?;
    if !locked.iter().any(|r| {
        r.kind == kind
            && r.id == id
            && r.row_version == actual.row_version
            && r.payload_hash == actual.payload_hash
    }) {
        return Err(Error::Conflict("Sealed correction source changed".into()));
    }
    Ok(())
}

async fn validate_stage_restatement_permit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    permit: &crate::project_operating_common::model::StageReclassificationPermit<'_>,
    cost_id: Uuid,
    attribution_id: Uuid,
    project_id: Uuid,
) -> Result<(), Error> {
    permit.scope.access.assert_session(session, actor).await?;
    permit.scope.access.assert_project(project_id)?;
    if permit.cost_id != cost_id
        || permit.attribution_id != attribution_id
        || permit.scope.actor_id != actor.id
    {
        return Err(Error::Forbidden(
            "Stage correction permit does not match this exact producer".into(),
        ));
    }
    validate_locked_reference(
        session,
        &permit.scope.locked_source_refs,
        "ProjectActualCostRecord",
        cost_id,
    )
    .await?;
    validate_locked_reference(
        session,
        &permit.scope.locked_source_refs,
        "CostStageAttributionSnapshot",
        attribution_id,
    )
    .await?;
    let mut actual: Vec<Uuid> = sqlx::query_scalar("SELECT DISTINCT basis_id FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1 AND is_current ORDER BY basis_id")
        .bind(cost_id).fetch_all(&mut *session.connection).await?;
    let mut authorized = permit.affected_allocation_basis_ids.clone();
    actual.sort();
    authorized.sort();
    authorized.dedup();
    if actual != authorized {
        return Err(Error::Conflict(
            "Sealed allocation source set changed".into(),
        ));
    }
    Ok(())
}

fn restatement_successor_cost(
    old: Uuid,
    transitions: &[crate::project_operating_common::model::VerifiedProducerTransition],
) -> Result<Uuid, Error> {
    let relevant = transitions
        .iter()
        .filter(|t| {
            t.before_refs
                .iter()
                .any(|r| r.kind == "ProjectActualCostRecord" && r.id == old)
        })
        .collect::<Vec<_>>();
    if relevant.is_empty() {
        return Ok(old);
    }
    if relevant.len() != 1 {
        return Err(Error::Conflict(
            "Conflicting allocation source transitions".into(),
        ));
    }
    let after = relevant[0]
        .after_refs
        .iter()
        .filter(|r| r.kind == "ProjectActualCostRecord")
        .collect::<Vec<_>>();
    if after.len() != 1 {
        return Err(Error::Conflict(
            "Ambiguous allocation source successor".into(),
        ));
    }
    Ok(after[0].id)
}

async fn validate_restatement_allocation_source(
    session: &mut CommonSession<'_, '_>,
    scope: &crate::project_operating_common::model::VerifiedRestatementScope<'_>,
    frozen: &Value,
    current: &Value,
    transitions: &[crate::project_operating_common::model::VerifiedProducerTransition],
) -> Result<(), Error> {
    if frozen["source_payload_hash"] != contract_support::canonical_hash(&frozen["source_payload"])?
    {
        return Err(Error::Conflict(
            "Frozen allocation member hash changed".into(),
        ));
    }
    let old = store::id(frozen, "cost_record_id")?;
    let current_id = store::id(current, "id")?;
    let before_version = frozen["cost_row_version"].as_i64().ok_or(Error::Internal)?;
    if !scope.locked_source_refs.iter().any(|r| {
        r.kind == "ProjectActualCostRecord"
            && r.id == old
            && i64::from(r.row_version) == before_version
    }) {
        return Err(Error::Conflict(
            "Allocation predecessor is outside sealed scope".into(),
        ));
    }
    if current_id == old && i64::from(store::version(current)?) == before_version {
        return Ok(());
    }
    let transition = transitions
        .iter()
        .find(|t| {
            t.before_refs.iter().any(|r| {
                r.kind == "ProjectActualCostRecord"
                    && r.id == old
                    && i64::from(r.row_version) == before_version
            })
        })
        .ok_or_else(|| {
            Error::Conflict("Allocation source change lacks real producer transition".into())
        })?;
    let actual = crate::project_operating::sources::source_reference_with_session(
        session,
        "ProjectActualCostRecord",
        current_id,
    )
    .await?;
    if !transition.after_refs.iter().any(|r| {
        r.kind == actual.kind
            && r.id == actual.id
            && r.row_version == actual.row_version
            && r.payload_hash == actual.payload_hash
    }) {
        return Err(Error::Conflict(
            "Allocation successor does not match actual producer output".into(),
        ));
    }
    if current_id == old {
        crate::project_operating::sources::validate_stage_only_cost_transition(
            &frozen["source_payload"]["cost"],
            current,
        )?;
    } else if current["supersedes_record_id"] != old.to_string() || current["cost_type"] != "labor"
    {
        return Err(Error::Conflict(
            "Only a true E labor successor may replace an allocation cost member".into(),
        ));
    }
    Ok(())
}

// A pending/excluded reference is not prior recognition. This exception only
// appends the first actual stage and never revises a pre-existing stage/batch.
async fn is_true_first_stage_append(
    session: &mut CommonSession<'_, '_>,
    cost: &Value,
    reclassify: bool,
) -> Result<bool, Error> {
    if reclassify || cost["is_included_in_project_cost"] != false {
        return Ok(false);
    }
    let id = store::id(cost, "id")?;
    Ok(sqlx::query_scalar::<_,bool>("SELECT NOT EXISTS(SELECT 1 FROM poms.cost_stage_attribution_snapshot WHERE cost_record_id=$1) AND NOT EXISTS(SELECT 1 FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1)")
        .bind(id).fetch_one(&mut *session.connection).await?)
}
