// Original attribution loops are byte-exact except the proved-baseline loader.
import assert from "node:assert/strict";
import { keyOf } from "../business/pure.mjs";
import { difference } from "../business/snapshot.mjs";
import { assertObjectsRecorded } from "../business/objects.mjs";
import { reconcileAttempt as originalReconcileAttempt } from "../business/ledger.mjs";
import { runtime118, budgetInvocationFacts118 } from "./invocation-proof.mjs";
import * as budgetNative121 from "../business/runtime-admission121.mjs";
import {json118,read118} from "./retained-tax-proof.mjs";
export function assertRecorded118(cap, observed) {
    const { ctx, comparisonBaseline } = runtime118(cap);
    return assertRecordedBody118(ctx, comparisonBaseline, observed);
}
function assertRecordedBody118(ctx, comparisonBaseline, observed) {
    const baseline = comparisonBaseline, blockers = [];
    assertObjectsRecorded(ctx, baseline, observed);
    for (const database of ctx.databases) {
        assert.deepEqual(
            observed.databases[database].meta.normative,
            baseline.databases[database].meta.normative,
            "Original catalog/OIDs/ACL/functions/triggers/roles changed",
        );
        assert.deepEqual(
            observed.databases[database].meta.sequences,
            baseline.databases[database].meta.sequences,
            "Unowned SQL sequence drift",
        );
    }
    for (const change of difference(baseline, observed)) {
        if (
            ctx.state.schemaComparison108 && change.table === "poms_migrations"
        ) {
            blockers.push({
                kind: "canonical-M98-registration-drift-not-fixture-authority",
                database: change.database,
            });
            continue;
        }
        if (change.database !== ctx.database) {
            blockers.push({
                kind: "native-database-drift",
                database: change.database,
                table: change.table,
            });
            continue;
        }
        for (const row of change.added) {
            const owned =
                ctx.state.owned[keyOf(change.database, change.table, row.key)];
            if (
                !owned || owned.latestSha256 !== row.sha256 ||
                (owned.latestXmin && owned.latestXmin !== row.xmin) ||
                owned.deleted
            ) {
                blockers.push({
                    kind: "unknown-added-row-or-unobserved-change",
                    table: change.table,
                    key: row.key,
                });
            }
        }
        for (const pair of change.changed) {
            const borrowed = ctx.state
                .borrowed[
                    keyOf(change.database, change.table, pair.after.key)
                ];
            if (
                !borrowed || borrowed.baselineSha256 !== pair.before.sha256 ||
                borrowed.latestSha256 !== pair.after.sha256
            ) {
                blockers.push({
                    kind: "unobserved-original-row-change",
                    table: change.table,
                    key: pair.after.key,
                });
            }
        }
        for (const row of change.missing) {
            blockers.push({
                kind: "original-row-deleted",
                table: change.table,
                key: row.key,
            });
        }
    }
    assert.equal(
        blockers.length,
        0,
        "Unattributed state before command; inspect private full before snapshot",
    );
}
export async function reconcile118(cap, before, after, attempt, binding) {
    const { ctx } = runtime118(cap);
    return originalReconcileAttempt(ctx, before, after, attempt, binding);
}

function budgetSnapshot118(root, ticket, observed) {
    budgetNative121.assertBudgetProbeDispatch121(root, ticket);
    const {p} = budgetInvocationFacts118(root, ticket);
    assert.equal(p.mode, "budget-probe");
    assert(observed && observed.manifest);
    assert.equal(observed.manifest.file, root.priv + "/snapshot-" + observed.label + ".json");
    assert.deepEqual(json118(observed.manifest), Object.fromEntries(Object.entries(observed).filter(([k]) => k !== "manifest")));
    return p;
}
export function assertBudgetRecorded118(root, ticket, observed) {
    budgetSnapshot118(root, ticket, observed);
    const {comparisonBaseline} = budgetInvocationFacts118(root, ticket);
    return assertRecordedBody118(root, comparisonBaseline, observed);
}
export async function reconcileBudgetAuth118(root, ticket, before, after, attempt, binding) {
    const p = budgetSnapshot118(root, ticket, before);
    budgetSnapshot118(root, ticket, after);
    assert.deepEqual(Object.keys(binding), [], "Budget Auth has no external binding authority");
    assert(["AuthController_getCsrfToken","AuthController_createPasswordAuthSession","AuthController_getCurrentAuthSession"].includes(attempt.operationId));
    assert.equal(attempt.actorKey, p.actorKey);
    assert.equal(attempt.actorId, p.actorId);
    assert(before.label.endsWith("-before"));
    const label = before.label.slice(0,-7);
    assert.equal(after.label, label + "-after");
    assert(attempt.requestId.startsWith(root.state.prefix + "-" + label + "-"));
    for (const pin of [before.manifest,after.manifest]) read118(pin);
    return originalReconcileAttempt(root, before, after, attempt, binding);
}
