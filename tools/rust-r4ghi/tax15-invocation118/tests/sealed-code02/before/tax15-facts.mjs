import { uuid } from "../business/pure.mjs";
import { actualTwoOneWeight58 } from "../business/shared-source-inventory58.mjs";
// Independent physical-row root/impact/terminal model for this finite Tax15 command.
// Only the mechanical factual reference projection is shared with 273. No
// calendar, historical-budget selection or period-completion oracle is copied.
import assert from "node:assert/strict";
import {
    canonicalHash273,
    factualRef273,
    typedJSON273,
} from "../business/period-historical-facts273.mjs";
import {
    centsTax13,
    completeTargetsTax13,
    expectedCostScopeTax13,
    inventoryTax13,
    rowsTax13,
} from "../business/tax13-facts.mjs";
import {
    assertSameCompleteTargets,
    exactExpectedRef,
} from "../business/correction-preparation37.mjs";

const TABLES = Object.freeze({
    Contract: "contract",
    ContractTermSnapshot: "contract_term_snapshot",
    ReceiptRecord: "receipt_record",
    ReceiptAccountingBasis: "receipt_accounting_basis",
    ProjectActualCostRecord: "project_actual_cost_record",
    SharedCostAllocationBasis: "shared_cost_allocation_basis",
    SharedCostAllocationResult: "shared_cost_allocation_result",
    CostStageAttributionSnapshot: "cost_stage_attribution_snapshot",
    AccountingTaxTreatmentSnapshot: "accounting_tax_treatment_snapshot",
    OperatingBaselinePackage: "operating_baseline_package",
});
const currentCost = new Set(["registered", "confirmed", "included"]);
const refKey = (r) =>
    JSON.stringify([
        r.kind,
        r.id,
        r.rowVersion ?? r.expectedVersion,
        r.payloadHash,
    ]);
const targetKey = (t) => t.projectId + ":" + t.restatesSnapshotRef.id;
const one = (a, f, label) => {
    const m = a.filter(f);
    assert.equal(m.length, 1, label);
    return m[0];
};
function day(value) {
    assert.equal(typeof value, "string", "Actual business date required");
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        assert.equal(
            new Date(value + "T00:00:00Z").toISOString().slice(0, 10),
            value,
        );
        return value;
    }
    assert(/(?:Z|[+-]\d\d:\d\d)$/.test(value), "Timezone must be explicit");
    const d = new Date(value);
    assert(Number.isFinite(d.getTime()));
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

// Complete source membership is selected from physical rows, independently of
// public proposed targets. Ancestors and foreign peers remain internal facts.
export function catalogRoots15(rawRows, projectId) {
    const raw = (t) => rawRows(t),
        values = (t) => raw(t).map((r) => JSON.parse(r.raw));
    const bases = values("shared_cost_allocation_basis"),
        results = values("shared_cost_allocation_result"),
        slots = values("shared_cost_allocation_source_snapshot"),
        costs = values("project_actual_cost_record");
    const ownCosts = new Set(
        costs.filter((c) => c.project_id === projectId).map((c) => c.id),
    );
    const directBases = new Set(
        results.filter((r) => r.project_id === projectId).map((r) =>
            r.basis_id
        ),
    );
    const lineage = new Set([
        ...directBases,
        ...slots.filter((s) => ownCosts.has(s.cost_record_id)).map((s) =>
            s.basis_id
        ),
    ]);
    for (let changed = true; changed;) {
        changed = false;
        for (const b of bases) {
            if (
                lineage.has(b.id) && b.supersedes_id &&
                !lineage.has(b.supersedes_id)
            ) {
                lineage.add(b.supersedes_id);
                changed = true;
            }
        }
    }
    const memberCosts = new Set(
        slots.filter((s) => lineage.has(s.basis_id)).map((s) =>
            s.cost_record_id
        ),
    );
    const stageCosts = new Set([
        ...ownCosts,
        ...slots.filter((s) => directBases.has(s.basis_id)).map((s) =>
            s.cost_record_id
        ),
    ]);
    const contracts = new Set(
        values("contract").filter((c) => c.project_id === projectId).map((c) =>
            c.id
        ),
    );
    const out = [];
    for (const [kind, table] of Object.entries(TABLES)) {
        for (const row of raw(table)) {
            const v = JSON.parse(row.raw);
            let included;
            if (kind === "SharedCostAllocationBasis") {
                included = lineage.has(v.id);
            } else if (kind === "SharedCostAllocationResult") {
                included = lineage.has(v.basis_id);
            } else if (kind === "ProjectActualCostRecord") {
                included = ownCosts.has(v.id) || memberCosts.has(v.id);
            } else if (kind === "CostStageAttributionSnapshot") {
                included = stageCosts.has(v.cost_record_id);
            } else if (kind === "ContractTermSnapshot") {
                included = contracts.has(v.contract_id);
            } else included = v.project_id === projectId;
            if (included) {
                out.push({
                    kind,
                    table,
                    row,
                    value: v,
                    ref: factualRef273(kind, row),
                });
            }
        }
    }
    return out.sort((a, b) => refKey(a.ref).localeCompare(refKey(b.ref)));
}
function isCurrent15(item, catalog, projectId) {
    const v = item.value;
    switch (item.kind) {
        case "ProjectActualCostRecord":
            return currentCost.has(v.record_status);
        case "ContractTermSnapshot":
            return v.snapshot_status === "active";
        case "Contract":
            return v.status === "active";
        case "ReceiptRecord":
            return ["pending-confirmation", "confirmed"].includes(v.status);
        case "SharedCostAllocationBasis":
            return ["active", "pending"].includes(v.status);
        case "SharedCostAllocationResult":
            return v.project_id === projectId &&
                ["active", "pending"].includes(v.status);
        case "CostStageAttributionSnapshot":
            return v.status === "active" &&
                catalog.some((c) =>
                    c.kind === "ProjectActualCostRecord" &&
                    c.value.id === v.cost_record_id &&
                    currentCost.has(c.value.record_status)
                );
        case "AccountingTaxTreatmentSnapshot":
            return ["active", "pending"].includes(v.status);
        case "OperatingBaselinePackage":
            return v.is_current === true;
        case "ReceiptAccountingBasis":
            return true;
        default:
            throw Error("Unsupported inferred kind");
    }
}
export function inferRoots15(rawRows, projectId, snapshotId, explicitRoots) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw));
    const snapshot = one(
        values("project_operating_snapshot"),
        (s) => s.id === snapshotId,
        "Physical selected root",
    );
    assert.equal(snapshot.project_id, projectId);
    const previous = values("operating_source_member").filter((m) =>
        m.context_id === snapshot.source_context_id
    ).map((m) => ({
        kind: m.source_kind,
        id: m.source_id,
        rowVersion: m.source_row_version,
        payloadHash: m.source_payload_hash,
    }));
    const prior = new Set(previous.map(refKey)),
        catalog = catalogRoots15(rawRows, projectId);
    const implicit = catalog.filter((i) =>
        !prior.has(refKey(i.ref)) && isCurrent15(i, catalog, projectId)
    ).map((i) => exactExpectedRef(i.ref));
    const merged = new Map();
    for (const r of [...implicit, ...explicitRoots]) {
        assert(TABLES[r.kind], "This Tax command permits only source roots");
        const row = one(
            rawRows(TABLES[r.kind]),
            (x) => JSON.parse(x.raw).id === r.id,
            "Actual selected root row",
        );
        assert.equal(
            refKey(factualRef273(r.kind, row)),
            refKey(r),
            "Selected root CAS changed",
        );
        const k = r.kind + ":" + r.id;
        if (merged.has(k)) {
            assert.equal(
                refKey(merged.get(k)),
                refKey(r),
                "Conflicting versions for one root",
            );
        }
        merged.set(k, r);
    }
    return {
        implicitRoots: implicit,
        explicitRoots: structuredClone(explicitRoots),
        roots: [...merged.values()].sort((a, b) =>
            refKey(a).localeCompare(refKey(b))
        ),
        previousMemberCount: previous.length,
        catalogMemberCount: catalog.length,
    };
}
export function impactGraph15(rawRows, roots) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw)),
        find = (t, id) =>
            one(
                values(t),
                (r) => r.id === id,
                "Actual dependency " + t + ":" + id,
            );
    const costs = values("project_actual_cost_record"),
        ids = new Set(),
        impacts = new Map();
    const add = (id, project, businessDate, producer = true) => {
        const v = {
            id,
            project: project ?? null,
            day: businessDate === null ? null : day(businessDate),
            producer,
        };
        impacts.set(JSON.stringify(v), v);
    };
    const addCost = (c) => {
        ids.add(c.id);
        add(c.id, c.project_id, c.occurred_on);
    };
    for (const root of roots) {
        assert(TABLES[root.kind]);
        const row = one(
            rawRows(TABLES[root.kind]),
            (r) => JSON.parse(r.raw).id === root.id,
            "Actual impact root",
        );
        assert.equal(refKey(factualRef273(root.kind, row)), refKey(root));
        const v = JSON.parse(row.raw);
        ids.add(v.id);
        let project = v.project_id ?? null, date = null;
        switch (root.kind) {
            case "ProjectActualCostRecord":
                date = v.occurred_on;
                break;
            case "ReceiptRecord":
                date = v.receipt_date;
                break;
            case "ContractTermSnapshot":
                project = find("contract", v.contract_id).project_id;
                date = v.effective_at;
                break;
            case "ReceiptAccountingBasis":
                date = find("receipt_record", v.receipt_id).receipt_date;
                break;
            case "CostStageAttributionSnapshot": {
                const c = find("project_actual_cost_record", v.cost_record_id);
                project = c.project_id;
                ids.add(c.id);
                date = v.evidence_business_date;
                break;
            }
            case "AccountingTaxTreatmentSnapshot": {
                const e = find(
                        "cost_governance_evidence",
                        v.governance_evidence_id,
                    ),
                    eraw = one(
                        rawRows("cost_governance_evidence"),
                        (r) => JSON.parse(r.raw).id === e.id,
                        "Actual Tax evidence raw",
                    );
                assert.equal(v.governance_schema_version, 1);
                assert.equal(v.status, "active");
                assert.equal(e.schema_version, 1);
                assert.equal(e.target_type, "AccountingTaxTreatmentSnapshot");
                assert.equal(e.target_id, v.id);
                assert.equal(e.project_id, v.project_id);
                assert(
                    e.frozen_payload && typeof e.frozen_payload === "object",
                );
                assert.equal(
                    e.payload_hash,
                    canonicalHash273(typedJSON273(eraw.raw).frozen_payload),
                );
                assert.deepEqual(
                    e.source_references,
                    e.frozen_payload.assessment.sourceReferences,
                );
                assert(
                    Array.isArray(e.source_references) &&
                        e.source_references.length > 0,
                );
                for (const s of e.source_references) {
                    assert(["source", "manual"].includes(s.kind));
                    if (s.kind === "manual") continue;
                    if (
                        ["project-actual-cost-record", "source-cost-fact"]
                            .includes(s.sourceType)
                    ) addCost(find("project_actual_cost_record", s.sourceId));
                    else if (
                        [
                            "payment-record",
                            "invoice-record",
                            "expense-record",
                            "payable-record",
                        ].includes(s.sourceType)
                    ) {
                        const sourceTable = s.sourceType.replaceAll("-", "_");
                        find(sourceTable, s.sourceId);
                        for (
                            const c of costs.filter((c) =>
                                c.source_type === s.sourceType &&
                                c.source_id === s.sourceId
                            )
                        ) addCost(c);
                    }
                }
                date = e.business_date;
                break;
            }
            case "Contract":
                date = v.signed_at;
                break;
            case "OperatingBaselinePackage":
                date = v.effective_at;
                break;
            case "SharedCostAllocationBasis":
            case "SharedCostAllocationResult":
                break;
            default:
                throw Error("Unsupported impact root");
        }
        add(v.id, project, date);
    }
    const slots = values("shared_cost_allocation_source_snapshot"),
        results = values("shared_cost_allocation_result");
    for (let changed = true; changed;) {
        const prior = ids.size, known = new Set(ids);
        for (const r of results) {
            for (const s of slots.filter((s) => s.basis_id === r.basis_id)) {
                if (
                    known.has(s.cost_record_id) || known.has(s.basis_id) ||
                    known.has(r.id)
                ) {
                    const c = find(
                        "project_actual_cost_record",
                        s.cost_record_id,
                    );
                    ids.add(s.basis_id);
                    ids.add(r.id);
                    add(r.id, r.project_id, c.occurred_on);
                    addCost(c);
                }
            }
        }
        changed = ids.size !== prior;
    }
    return [...impacts.values()].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
}
export function terminalUnion15(rawRows, primaryProjectId, graph) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw)),
        snapshots = values("project_operating_snapshot"),
        contexts = values("operating_source_context"),
        members = values("operating_source_member");
    // Reverse-discovery only ignores non-producer children. Locked terminal state
    // deliberately observes every child, matching the actual public contract.
    const discoverable = snapshots.filter((s) =>
        s.producer_version === 1 && s.status === "active" &&
        !snapshots.some((n) =>
            n.producer_version === 1 && n.supersedes_id === s.id
        )
    );
    const producerIds = new Set(
            graph.filter((i) => i.producer).map((i) => i.id),
        ),
        projectIds = new Set([
            primaryProjectId,
            ...graph.map((i) => i.project).filter(Boolean),
        ]);
    for (const s of discoverable) {
        if (
            members.some((m) =>
                m.context_id === s.source_context_id &&
                producerIds.has(m.source_id)
            )
        ) projectIds.add(s.project_id);
    }
    const targets = [];
    for (
        const s of snapshots.filter((s) =>
            projectIds.has(s.project_id) && s.producer_version === 1 &&
            s.status === "active" && !snapshots.some((n) =>
                n.project_id === s.project_id && n.supersedes_id === s.id
            )
        )
    ) {
        const c = one(
                contexts,
                (c) => c.id === s.source_context_id,
                "Physical terminal context",
            ),
            cutoff = day(c.business_cutoff),
            applicable = new Set(
                graph.filter((i) =>
                    (i.producer || i.project === s.project_id) &&
                    i.day !== null && i.day <= cutoff
                ).map((i) => i.id),
            );
        const consumed = members.some((m) =>
            m.context_id === c.id && applicable.has(m.source_id)
        );
        if (
            !consumed &&
            !graph.some((i) =>
                i.project === s.project_id && i.day !== null && i.day <= cutoff
            )
        ) continue;
        const head = one(
                values("project_operating_head"),
                (h) => h.project_id === s.project_id,
                "Physical affected head",
            ),
            raw = one(
                rawRows("project_operating_snapshot"),
                (r) => JSON.parse(r.raw).id === s.id,
                "Physical terminal raw",
            );
        const period = s.period_end_snapshot_id
            ? one(
                rawRows("period_closing_snapshot"),
                (r) => JSON.parse(r.raw).id === s.period_end_snapshot_id,
                "Actual period root raw",
            )
            : null;
        targets.push({
            projectId: s.project_id,
            expectedVersion: head.row_version,
            restatesSnapshotRef: exactExpectedRef(
                factualRef273("ProjectOperatingSnapshot", raw),
            ),
            periodEndSnapshotRef: period
                ? exactExpectedRef(
                    factualRef273("PeriodClosingSnapshot", period),
                )
                : null,
        });
    }
    return {
        discoveredProjectIds: [...projectIds].sort(),
        targets: targets.sort((a, b) =>
            targetKey(a).localeCompare(targetKey(b))
        ),
    };
}
export function deriveRootUnion15(
    rawRows,
    projectId,
    snapshotId,
    explicitRoots,
) {
    const inferred = inferRoots15(
            rawRows,
            projectId,
            snapshotId,
            explicitRoots,
        ),
        graph = impactGraph15(rawRows, inferred.roots),
        terminals = terminalUnion15(rawRows, projectId, graph);
    return {
        ...inferred,
        graph,
        ...terminals,
        oracle: "independent-complete-physical-root-impact-terminal-union15",
        dateOnlyPredicateIsNotTargetOracle: true,
    };
}
export function deriveTax15Facts(
    ctx,
    snapshot,
    body,
    legacy,
    packets,
    readRows,
) {
    const rows = rowsTax13(ctx, snapshot, readRows),
        explicit = body.taxCorrections.map((c) => c.taxTreatmentRef);
    assert.equal(explicit.length, 1);
    assert.deepEqual(body.costDecisions, []);
    assert.deepEqual(
        body.affectedTargets.map((t) => t.costDecisions ?? []).flat(),
        [],
    );
    const rootUnion = deriveRootUnion15(
        rows.raw,
        body.projectId,
        body.restatesSnapshotRef.id,
        explicit,
    );
    const actual = [{
        projectId: body.projectId,
        expectedVersion: body.expectedVersion,
        restatesSnapshotRef: body.restatesSnapshotRef,
        periodEndSnapshotRef: body.periodEndSnapshotRef,
    }, ...body.affectedTargets];
    assertSameCompleteTargets(rootUnion.targets, [actual]);
    for (const packet of packets) {
        assertSameCompleteTargets(rootUnion.targets, [
            packet.preparation.proposedAffectedTargets,
        ]);
    }
    assert.deepEqual(
        [...new Set(rootUnion.targets.map((t) => t.projectId))].sort(),
        [...legacy.projectIds].sort(),
        "Unexpected physical affected project requires review; never trim",
    );
    // Legacy consumer checks the finite fixture's amount/classification/writes.
    // The independent complete union above is the target oracle. The preserved
    // detail function no longer contains the obsolete cost-date target equality.
    const facts = deriveTax15FixtureDetails(
        ctx,
        snapshot,
        body,
        legacy,
        packets,
        readRows,
    );
    return { ...facts, rootUnion };
}
export const inventoryTax15 = inventoryTax13;

// Full original fixture detail span, with only the reviewed obsolete oracle removed.
function deriveTax15FixtureDetails(ctx,snapshot,body,legacy,packets,readRows){
 const rows=rowsTax13(ctx,snapshot,readRows),cost=rows.owned('project_actual_cost_record',legacy.costId),tax=rows.owned('accounting_tax_treatment_snapshot',legacy.taxId),basis=rows.owned('shared_cost_allocation_basis',legacy.basisId);assert.equal(body.projectId,legacy.sourceProjectId);assert.equal(cost.project_id,legacy.sourceProjectId);assert.equal(cost.record_status,'confirmed');assert.equal(cost.is_included_in_project_cost,false);assert.equal(cost.currency,'CNY');
 assert.equal(tax.status,'active');assert.equal(tax.deductibility_status,'pending');assert.equal(tax.tax_impact_amount,'0.00');assert.equal(tax.tax_impact_pending_amount,'130.00');assert.equal(tax.tax_pending_flag,true);assert.equal(body.taxCorrections.length,1);assert.deepEqual(body.allocationCorrections,[]);assert.deepEqual(body.stageCorrections,[]);assert.deepEqual(body.laborCorrections,[]);assert.deepEqual(body.costDecisions,[]);assert.deepEqual(body.acknowledgedChangedSourceRefs,[]);assert.equal(body.scope,'live');assert.equal(body.periodEndSnapshotRef,null);
 const correction=body.taxCorrections[0];assert.equal(correction.taxTreatmentRef.id,tax.id);assert.equal(correction.taxTreatmentRef.expectedVersion,tax.row_version);assert.equal(correction.request.expectedVersion,tax.row_version);assert.equal(correction.request.taxImpactAmount,tax.tax_impact_amount);assert.equal(correction.request.taxImpactPendingAmount,tax.tax_impact_pending_amount);assert.equal(correction.request.taxPendingFlag,true);assert.equal(correction.request.currency,cost.currency);assert.deepEqual(correction.expectedSourceRefs.map(r=>[r.kind,r.id,r.expectedVersion]),[['ProjectActualCostRecord',cost.id,cost.row_version]]);
 const evidence=rows.owned('cost_governance_evidence',tax.governance_evidence_id);assert.equal(evidence.target_id,tax.id);assert.equal(evidence.project_id,cost.project_id);assert.equal(evidence.source_references.length,1);assert.equal(evidence.source_references[0].sourceType,'project-actual-cost-record');assert.equal(evidence.source_references[0].sourceId,cost.id);
 assert.equal(basis.status,'active');assert.equal(basis.governance_schema_version,1);assert.equal(basis.measurement_basis,'excluding-tax');const slots=rows.values('shared_cost_allocation_source_snapshot').filter(s=>s.basis_id===basis.id&&s.is_current);assert.equal(slots.length,1);assert.equal(slots[0].cost_record_id,cost.id);assert.equal(slots[0].cost_row_version,cost.row_version);assert.equal(rows.values('shared_cost_allocation_source_snapshot').filter(s=>s.cost_record_id===cost.id&&s.is_current).length,1);
 const results=rows.values('shared_cost_allocation_result').filter(r=>r.basis_id===basis.id&&r.status==='active').map(r=>rows.owned('shared_cost_allocation_result',r.id));assert.deepEqual(results.map(r=>r.id).sort(),[...legacy.resultIds].sort());assert.deepEqual(results.map(r=>actualTwoOneWeight58(rows.raw('shared_cost_allocation_result').find(row=>row.key[0]===r.id))).sort(),['1','2']);assert(results.every(r=>r.is_included_in_project_cost===true&&r.row_version===2));
 const primary=packets.find(p=>p.target.projectId===body.projectId&&p.target.restatesSnapshotRef.id===body.restatesSnapshotRef.id);assert(primary);const targets=completeTargetsTax13(primary.preparation,packets,legacy.projectIds);assertSameCompleteTargets(targets,[[{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:null},...body.affectedTargets]]);
 const projects=[...legacy.projectIds].sort().map(projectId=>{const project=rows.owned('project',projectId),head=one(rows.values('project_operating_head'),h=>h.project_id===projectId,'Actual project head');const bindings=rows.values('operating_signal_gate_binding').filter(b=>b.project_id===projectId&&b.status==='active').map(b=>rows.owned('operating_signal_gate_binding',b.id));assert.equal(bindings.length,4);const reviews=rows.values('commission_gate_review_record').filter(r=>bindings.some(b=>b.id===r.binding_id)&&r.status==='active').map(r=>rows.owned('commission_gate_review_record',r.id));return {projectId,projectVersion:project.row_version,headVersion:head.row_version,currentSnapshotId:head.current_snapshot_id,baselineId:head.baseline_package_id,oldBindingIds:bindings.map(b=>b.id).sort(),oldGateReviewIds:reviews.map(r=>r.id).sort()};});assert.equal(projects.find(p=>p.projectId===body.projectId).projectVersion,body.expectedProjectVersion);
 const ordered=[{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:null},...body.affectedTargets],indices=new Map();
 const detailed=ordered.map(target=>{const old=rows.owned('project_operating_snapshot',target.restatesSnapshotRef.id),project=projects.find(p=>p.projectId===target.projectId);assert.equal(old.project_id,target.projectId);assert.equal(old.row_version,target.restatesSnapshotRef.expectedVersion);assert.equal(target.expectedVersion,project.headVersion);const oldContext=rows.owned('operating_source_context',old.source_context_id).frozen_payload,packet=packets.find(p=>p.target.projectId===target.projectId&&p.target.restatesSnapshotRef.id===old.id);assert(packet);const baselineCandidates={oldFrozenRef:oldContext.baseline.baselinePackageRef,currentPreparedRef:packet.preparation.selectedBaselinePackageRef,headBaselineId:project.baselineId,selectionPolicyAccepted:false};const n=(indices.get(target.projectId)??0)+1;indices.set(target.projectId,n);const expectedScope=expectedCostScopeTax13(packet.preparation,rows);const fixture=results.find(r=>r.project_id===target.projectId);const preparedShare=expectedScope.units.find(u=>u.id===fixture.id);assert(preparedShare&&preparedShare.decision.decision==='include'&&preparedShare.decision.role==='allocation-share');assert.equal(preparedShare.amounts.tax.knowledge,'known');assert(centsTax13(preparedShare.amounts.tax.value)>0n,'Actual nonzero share tax supplies the unknown-coverage predicate, not an inventedpending allocation');return {...target,selectedCurrent:project.currentSnapshotId===old.id,newHeadVersion:project.headVersion+n,finalHeadVersion:project.headVersion+ordered.filter(t=>t.projectId===target.projectId).length,expectedCostScope:expectedScope,baselineCandidates,preparedEligibility:packet.preparation.formalEligibility,preparedBlockingReasonCodes:packet.preparation.blockingReasonCodes};});for(const project of projects)assert(detailed.some(t=>t.projectId===project.projectId&&t.selectedCurrent));
 const decisionFor=(projectId,id)=>{const head=one(rows.values('project_cost_inclusion_head'),h=>h.project_id===projectId&&h.unit_key==='allocation:'+id,'Actual share classification head');return rows.owned('project_cost_inclusion_decision',head.decision_id);};
 return {version:58,branch:'tax',operationId:TAX13_OPERATION,actorId:ctx.state.actors.manager.id,primaryProjectId:body.projectId,sourceProjectId:cost.project_id,sourceCostId:cost.id,sourceCostVersion:cost.row_version,sourceBusinessDate:cost.occurred_on,stageId:null,taxId:tax.id,basisId:basis.id,sourceCount:slots.length,projects,targets:detailed,sourceDecisionId:null,results:results.map(r=>({id:r.id,projectId:r.project_id,oldDecisionId:decisionFor(r.project_id,r.id).id})).sort((a,b)=>a.projectId.localeCompare(b.projectId)),factsAreAuthority:false,explicitAllocationOverride:false,oldSnapshotAggregateEqualityAssumed:false,baselinePolicyDecisionAssumed:false};
}
