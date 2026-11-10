// Actual GET/auth/read-only preparation; it never classifies or posts Main/Tax.
import assert from "node:assert/strict";
import fs from "node:fs";
import { data, uuid } from "../business/pure.mjs";
import {
    assertSameCompleteTargets,
    exactExpectedRef,
} from "../business/correction-preparation37.mjs";
import { completeTargetsTax13, rowsTax13 } from "../business/tax13-facts.mjs";
import {
    checkpoint118,
    runtime118,
    savePreparation118,
} from "./invocation-proof.mjs";
import { deriveTax15Facts, inventoryTax15 } from "./tax15-facts.mjs";
import { assertRecorded118 } from "./tax15-once-ledger.mjs";
import { sha118 } from "./retained-tax-proof.mjs";

export function composeTax15Body(primary, targets, correction) {
    assert.equal(primary.kind, "preparation-only");
    assert.equal(primary.intent, "restatement");
    const roots = targets.filter((t) =>
        t.projectId === primary.projectId &&
        t.restatesSnapshotRef.id === primary.officialSnapshotRef?.id
    );
    assert.equal(roots.length, 1);
    const root = roots[0];
    const item = (t) => ({
        projectId: t.projectId,
        expectedVersion: t.expectedVersion,
        restatesSnapshotRef: exactExpectedRef(t.restatesSnapshotRef),
        periodEndSnapshotRef: t.periodEndSnapshotRef
            ? exactExpectedRef(t.periodEndSnapshotRef)
            : null,
        costDecisions: [],
    });
    return {
        inputVersion: "server-derived-v1",
        projectId: primary.projectId,
        expectedVersion: primary.headVersion,
        expectedProjectVersion: primary.projectVersion,
        expectedInputHash: primary.expectedInputHash,
        assertions: null,
        scope: "live",
        periodEndSnapshotRef: null,
        restatesSnapshotRef: exactExpectedRef(root.restatesSnapshotRef),
        restatementReason:
            "真实 Source12 共享费用仍为 pending 130.00，仅替代真实税务证据版本；Source15 按完整业务影响范围重述，不把来源 pending 复制给其他项目。",
        restatementSummary:
            "沿实际费用与全部分摊批次推导影响终端；保留真实业务日期和重算时间，不提供分摊覆盖，不改写历史快照。",
        costDecisions: [],
        laborCorrections: [],
        allocationCorrections: [],
        stageCorrections: [],
        taxCorrections: [correction],
        affectedTargets: targets.filter((t) => t !== root).map(item),
        acknowledgedChangedSourceRefs: [],
    };
}
export async function prepareTax15(cap, api) {
    const { ctx, p, h, legacy } = runtime118(cap);
    assert.equal(p.mode, "prepare-only");
    assert.equal(ctx.state.taxContinuation15.taxPreparation, null);
    assert.equal(legacy.retainedMain13.replayForbidden, true);
    assert.equal(legacy.retainedMain13.record.postconditions, "verified");
    await api.login(p.actorKey);
    checkpoint118(cap, "prepare-authenticated");
    const before = await h.capture(ctx, ctx.next("tax15-before-prepare"));
    assertRecorded118(cap, before);
    const rows = rowsTax13(ctx, before, h.readRows),
        cost = rows.owned("project_actual_cost_record", legacy.costId),
        tax = rows.owned("accounting_tax_treatment_snapshot", legacy.taxId),
        heads = rows.values("project_operating_head").filter((r) =>
            r.project_id === legacy.sourceProjectId
        );
    assert.equal(heads.length, 1);
    const selectedId = uuid(heads[0].current_snapshot_id);
    const get = async (projectId, snapshotId, roots = null) => {
        const response = await api.request(
            "ProjectCostController_getProjectUnifiedAccounting",
            { projectId },
            null,
            p.actorKey,
            {
                query: {
                    view: "preparation",
                    intent: "restatement",
                    restatesSnapshotId: snapshotId,
                    ...(roots
                        ? { correctionSourceRefs: JSON.stringify(roots) }
                        : {}),
                },
            },
        );
        const preparation = data(response).preparation;
        assert(preparation);
        return {
            preparation,
            receipt: response.receiptId,
            http: {
                file: response.receiptId,
                rawBytesSha256: sha118(
                    fs.readFileSync(response.receiptId),
                ),
            },
        };
    };
    const initial = await get(legacy.sourceProjectId, selectedId),
        find = (kind, id) => {
            const a = initial.preparation.sourceRows.filter((r) =>
                r.sourceRef.kind === kind && r.sourceRef.id === id
            );
            assert.equal(a.length, 1);
            return exactExpectedRef(a[0].sourceRef);
        },
        taxRef = find("AccountingTaxTreatmentSnapshot", tax.id),
        costRef = find("ProjectActualCostRecord", cost.id);
    assert.equal(taxRef.expectedVersion, tax.row_version);
    assert.equal(costRef.expectedVersion, cost.row_version);
    const reason =
        "真实已确认旧费用的 pending 结论未变，仅替代来源证据版本，不冒称新生产或已认定抵扣。";
    const request = {
        ...legacy.taxRequest,
        expectedVersion: tax.row_version,
        replacementReason: reason,
        sourceReferences: [{
            kind: "source",
            sourceType: "project-actual-cost-record",
            sourceId: cost.id,
            sourceVersion: cost.row_version,
            businessDate: cost.occurred_on,
            reason,
        }],
    };
    assert.equal(request.taxImpactAmount, "0.00");
    assert.equal(request.taxImpactPendingAmount, "130.00");
    assert.equal(request.deductibilityStatus, "pending");
    assert.equal(request.taxPendingFlag, true);
    assert.equal(request.currency, cost.currency);
    const correction = {
            correctionKind: "tax-treatment-replacement",
            taxTreatmentRef: taxRef,
            expectedSourceRefs: [costRef],
            request,
        },
        queryRoots = [taxRef];
    // Tax alone is the explicit query root. Cost/basis roots would conceal the
    // server's responsibility to derive the actual Tax dependency and whole batch.
    const primary = await get(legacy.sourceProjectId, selectedId, queryRoots),
        packets = [];
    for (const target of primary.preparation.proposedAffectedTargets) {
        const packet = await get(
            target.projectId,
            target.restatesSnapshotRef.id,
            queryRoots,
        );
        packets.push({ target, ...packet });
    }
    const fullPacket = ctx.artifact(
        ctx.next("tax15-complete-server-targets") + ".json",
        {
            initial,
            primary,
            packets,
            queryRoots,
            oldProducer: legacy.producerStatePin,
            legacyReconciliation: legacy.reconciliation,
            TaxCorrectionPOSTExecuted: false,
        },
    );
    ctx.state.taxContinuation15.lastServerTargetPacket = fullPacket;
    ctx.persist();
    const targets = completeTargetsTax13(
        primary.preparation,
        packets,
        legacy.projectIds,
    );
    assertSameCompleteTargets(
        targets,
        packets.map((p) => p.preparation.proposedAffectedTargets),
    );
    const body = composeTax15Body(primary.preparation, targets, correction),
        fresh = await h.capture(ctx, ctx.next("tax15-prepared-current-facts"));
    assertRecorded118(cap, fresh);
    const facts = deriveTax15Facts(
            ctx,
            fresh,
            body,
            legacy,
            packets,
            h.readRows,
        ),
        inventory = inventoryTax15(facts),
        bodySHA256 = sha118(JSON.stringify(body));
    const fullInventory = ctx.artifact(
            ctx.next("tax15-full-inventory") + ".json",
            inventory,
        ),
        artifact = ctx.artifact(
            ctx.next("tax15-reviewable-body-inventory") + ".json",
            {
                body,
                bodySHA256,
                packets,
                fullPacket,
                facts,
                inventory,
                fullInventory,
                before: fresh.manifest,
                oldSnapshotAggregateEqualityAssumed: false,
                historicalBaselinePolicyAccepted: false,
                periodTargetsDropped: false,
                TaxCorrectionPOSTExecuted: false,
            },
        );
    const prepared = {
        artifact,
        body,
        bodySHA256,
        packets,
        fullPacket,
        facts,
        inventory,
        fullInventory,
        postconditions: "prepared-for-Root-review-only",
    };
    savePreparation118(cap, prepared);
    return artifact;
}
