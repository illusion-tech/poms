// Root-only finite driver. Importing this module executes no task effects.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import {
    F118,
    json118,
    pin118,
    read118,
    samePin118,
    sha118,
    verifyStoppedFIJournal118,
} from "./retained-tax-proof.mjs";
import {
    advanceFamily118,
    assertInput118,
    beginFamily118,
    checkpoint118,
    closeInvocation118,
    currentTuple118,
    openInvocation118,
    resetDomainSlot118,
    runtime118,
    setVerifiedPrefix118,
    verifyPublishedInvocation121,
    stage118,
} from "./invocation-proof.mjs";
import { createWire118 } from "./tax15-once-wire.mjs";
import {
    assertCurrentScope118,
    guardActor118,
    remove118,
    waitAuth118,
} from "./tax15-once-effects.mjs";
import { prepareTax15 } from "./tax15-prepare.mjs";
import { assertRecorded118 } from "./tax15-once-ledger.mjs";

const hash = (v) => sha118(JSON.stringify(v));
// Historical verification reads each actual HTTP/ledger/full snapshot again.
// It never POSTs, rewrites a failure or treats a prior unknown as a prefix.
export function verifyFIOriginals118(
    ctx,
    h,
    state,
    prepared,
    { complete = false } = {},
) {
    assert.equal(state.kind, F118.faultKind);
    assert.equal(state.bodySHA256, hash(prepared.body));
    assert.deepEqual(state.inventory, prepared.inventory);
    assert.equal(
        new Set(state.failures.map((f) => f.key)).size,
        state.failures.length,
    );
    assert.deepEqual(
        state.failures.map((f) => f.key),
        state.inventory.slice(0, state.failures.length).map((d) => d.key),
    );
    for (const [i, f] of state.failures.entries()) {
        const o = json118(f.observation), d = state.inventory[i];
        assert.deepEqual(o.descriptor, d);
        assert.equal(o.bodySHA256, state.bodySHA256);
        assert.equal(o.failed.fault.hitCount, 1);
        assert.equal(o.failed.fault.fallbackHitCount, 0);
        const wire = json118(
            typeof o.failed.receipt === "string"
                ? {
                    file: o.failed.receipt,
                    rawBytesSha256: sha118(fs.readFileSync(o.failed.receipt)),
                }
                : o.failed.receipt,
        );
        assert.equal(wire.operationId, F118.operation);
        assert.equal(wire.status, 500);
        assert.equal(wire.responseComplete, true);
        assert.equal(wire.transportFailure, false);
        assert.equal(
            sha118(read118(wire.originals.requestBody)),
            state.bodySHA256,
        );
        assert.deepEqual(json118(wire.originals.requestBody), prepared.body);
        assert.deepEqual(json118(wire.originals.responseBody), {
            statusCode: 500,
            message: "Internal server error",
        });
        for (const p of Object.values(wire.originals)) read118(p);
        const ledger = json118(o.failed.ledger);
        assert.equal(ledger.ownershipComplete, true);
        assert.deepEqual(ledger.blockers, []);
        assert.equal(ledger.requestId, wire.requestId);
        assert.equal(ledger.operationId, F118.operation);
        samePin118(ledger.before, o.failed.before);
        samePin118(ledger.after, o.failed.after);
        const rollback = h.assertSweepRollback(
            ctx,
            h.loadSnapshot(ctx, o.failed.before),
            h.loadSnapshot(ctx, o.failed.after),
            o.failed.fault,
            state.scope.actorId,
        );
        assert.deepEqual(rollback, o.rollback);
    }
    if (complete) {
        assert.equal(state.failures.length, state.inventory.length);
        pin118(state.fiComplete);
        const proof = json118(state.fiComplete);
        for (const k of ["scope", "inventory", "bodySHA256", "failures"]) {
            assert.deepEqual(proof[k], state[k]);
        }
        assert.equal(proof.normalTaxPOSTExecuted, false);
    }
    return state.failures.length;
}
async function runFI118(cap, api) {
    const { ctx, p, h, prepared } = runtime118(cap),
        record = ctx.state.taxContinuation121;
    h.assertEffectsReadyTax15(prepared);
    await api.login(p.actorKey);
    checkpoint118(cap, "FI-authenticated");
    const observed = await h.capture(ctx, ctx.next("tax15-dynamic-inventory"));
    assertRecorded118(cap, observed);
    const scope = assertCurrentScope118(cap, observed),
        inventory = h.inventoryTax13(scope.sharedFacts);
    assert.deepEqual(inventory, prepared.inventory);
    const state = record.sweep ??= {
        kind: F118.faultKind,
        scope,
        inventory,
        bodySHA256: p.bodySHA256,
        sourcePinsSHA256: runtime118(cap).manifest.current.sourcePinsSHA256,
        failures: [],
        finalSuccess: null,
        actualDerivedInventory: ctx.artifact(
            ctx.next("tax15-actual-inventory") + ".json",
            {
                scope,
                inventory,
                before: observed.manifest,
                prepared: p.prepared15,
                actualFIExecuted: false,
            },
        ),
    };
    ctx.persist();
    assert.deepEqual(state.scope, scope);
    assert.deepEqual(state.inventory, inventory);
    assert.equal(state.bodySHA256, p.bodySHA256);
    assert(!state.fiComplete && !state.finalSuccess);
    const prefix = verifyFIOriginals118(ctx, h, state, prepared);
    if (p.mode === "fi-closed-set") {
        assert.equal(
            prefix,
            0,
            "Closed-set G2 starts the entire original set once",
        );
    } else {
        setVerifiedPrefix118(cap, prefix);
        const recovery = json118(p.approvedRecovery);
        assert.equal(
            recovery.kind,
            "Root-approved-Tax15-single-family-recovery118",
        );
        assert.equal(recovery.selectedFamily, p.selectedFamily);
        samePin118(recovery.prepared, p.prepared15);
        samePin118(recovery.completedPrefix, p.approvedCompletedPrefix);
        samePin118(recovery.reconciledState, p.expectedEntryState);
        assert(Array.isArray(recovery.stoppedInvocations));
        const stopped = Object.values(
            ctx.state.consumerChecks.taxInvocation121.invocations,
        ).filter((j) =>
            j.phase === "closed-failed" &&
            ["fi-closed-set", "fi-family"].includes(j.mode)
        );
        assert.deepEqual(
            recovery.stoppedInvocations,
            stopped.map((j) => j.closedJournal),
        );
        for (const j of stopped) {
            const original = json118(j.closedJournal);
            verifyStoppedFIJournal118(ctx, original, p.bodySHA256, p.actorId);
            assert.deepEqual(
                json118(original.input).executionSources,
                p.executionSources,
            );
        }
        assert.equal(recovery.startCursor, prefix);
        assert.equal(p.selectedFamily, inventory[prefix]?.key);
    }
    const end = p.mode === "fi-family" ? prefix + 1 : inventory.length;
    for (let i = prefix; i < end; i++) {
        const selected = inventory[i];
        if (selected.key === "pending-auth-coflush") await waitAuth118(cap);
        beginFamily118(cap, selected.key);
        const sessionId = await guardActor118(cap);
        assert(sessionId);
        stage118(cap, {
            cursor: i,
            key: selected.key,
            bodySHA256: p.bodySHA256,
            stage: "authenticated",
            sessionId,
        });
        record.pendingTaxTrial = {
            key: selected.key,
            bodySHA256: p.bodySHA256,
            scopeSHA256: hash(scope),
            invocationNonce: p.nonce,
        };
        ctx.persist();
        const response = await api.request(
            F118.operation,
            {},
            structuredClone(prepared.body),
            p.actorKey,
            {
                ...h.correctionBindingTax15,
                expectedStatus: 500,
                fi: {
                    kind: F118.faultKind,
                    key: selected.key,
                    operationId: F118.operation,
                    scope,
                    selected,
                },
            },
        );
        assert.equal(response.status, 500);
        assert.equal(response.responseComplete, true);
        assert.equal(response.transportFailure, false);
        assert.equal(response.requestBodySha256, p.bodySHA256);
        assert.deepEqual(response.body, {
            statusCode: 500,
            message: "Internal server error",
        });
        assert.equal(response.fault.hitCount, 1);
        assert.equal(response.fault.fallbackHitCount, 0);
        const ledger = json118(response.ledger);
        assert.equal(ledger.ownershipComplete, true);
        assert.deepEqual(ledger.blockers, []);
        const rollback = h.assertSweepRollback(
                ctx,
                h.loadSnapshot(ctx, response.before),
                h.loadSnapshot(ctx, response.after),
                response.fault,
                p.actorId,
            ),
            observation = ctx.artifact(
                ctx.next("tax15-required-failure") + ".json",
                {
                    bodySHA256: p.bodySHA256,
                    descriptor: selected,
                    failed: {
                        receipt: response.receiptId,
                        ledger: response.ledger,
                        before: response.before,
                        after: response.after,
                        fault: response.fault,
                    },
                    rollback,
                },
            );
        assert.equal(
            rollback.allBusinessAuditSecurityRowsAndXminUnchanged,
            true,
        );
        state.failures.push({ key: selected.key, observation });
        delete record.pendingTaxTrial;
        ctx.persist();
        stage118(cap, {
            cursor: i,
            key: selected.key,
            bodySHA256: p.bodySHA256,
            stage: "familyVerified",
            observation,
        });
        advanceFamily118(cap, observation);
        resetDomainSlot118(cap);
    }
    verifyFIOriginals118(ctx, h, state, prepared);
    if (state.failures.length === inventory.length) {
        const original = ctx.artifact(
            ctx.next("tax15-fi-only-complete") + ".json",
            {
                kind:"actual-Source15-runtime121-tax-required-write-FI-complete",
                runtimeAdmission121:runtime118(cap).manifest.current.runtimeAdmission121,
                retainedPreparation15:record.retainedPreparation15,
                continuation121:record.continuation121,
                continuationReadback:record.continuationReadback,
                scope,
                inventory,
                bodySHA256: p.bodySHA256,
                failures: state.failures,
                normalTaxPOSTExecuted: false,
            },
        );
        state.fiComplete = original;
        ctx.persist();
        return original;
    }
    return ctx.artifact(ctx.next("tax15-fi-family-verified-stop") + ".json", {
        kind: "actual-Tax15-one-family-recovery-STOP",
        family: p.selectedFamily,
        verifiedPrefix: state.failures,
        normalTaxPOSTExecuted: false,
    });
}
function verifyNormal118(cap) {
    const { ctx, h, prepared } = runtime118(cap),
        record = ctx.state.taxContinuation121,
        state = record.sweep,
        attempt = state?.finalSuccess;
    assert(
        attempt && attempt.status === 201 && attempt.responseComplete &&
            !attempt.transportFailure,
    );
    assert.equal(attempt.operationId, F118.operation);
    assert.equal(attempt.requestBodySha256, state.bodySHA256);
    pin118(attempt.before);
    pin118(attempt.after);
    pin118(attempt.ledger);
    verifyFIOriginals118(ctx, h, state, prepared, { complete: true });
    const wire = json118(
        typeof attempt.receipt === "string"
            ? {
                file: attempt.receipt,
                rawBytesSha256: sha118(fs.readFileSync(attempt.receipt)),
            }
            : attempt.receipt,
    );
    assert.equal(wire.requestId, attempt.requestId);
    assert.equal(wire.status, 201);
    assert.equal(wire.responseComplete, true);
    assert.equal(wire.transportFailure, false);
    assert.equal(sha118(read118(wire.originals.requestBody)), state.bodySHA256);
    assert.deepEqual(json118(wire.originals.requestBody), prepared.body);
    assert.deepEqual(json118(wire.originals.responseBody), attempt.body);
    for (const p of Object.values(wire.originals)) read118(p);
    const before = h.loadSnapshot(ctx, attempt.before),
        after = h.loadSnapshot(ctx, attempt.after),
        sessionId = h.requireOwnedScope(ctx, before, state.scope),
        ledger = json118(attempt.ledger);
    assert.equal(ledger.ownershipComplete, true);
    assert.deepEqual(ledger.blockers, []);
    assert.equal(ledger.requestId, attempt.requestId);
    samePin118(ledger.before, attempt.before);
    samePin118(ledger.after, attempt.after);
    attempt.transaction = h.verifyEFFinalWrites40(
        ctx,
        before,
        after,
        attempt,
        state.inventory,
        sessionId,
    );
    ctx.persist();
    attempt.semantics = h.verifyTax13Semantics(
        ctx,
        before,
        after,
        attempt,
        state.scope.sharedFacts,
        prepared.packets,
        attempt.transaction,
        sessionId,
    );
    attempt.postconditions = "verified";
    delete record.normalTaxPending;
    ctx.persist();
    return ctx.artifact(ctx.next("tax15-normal-verified") + ".json", {
        kind: "actual-Tax15-original201-verified-result118",
        phase: "after-reconcile-postconditions-verified",
        epoch: F118.epoch,
        run: F118.run,
        current15: currentTuple118(cap),
        finalSuccess: attempt,
        postconditions: attempt.semantics,
        preparedPackets: prepared.packets,
        completion: null,
        sidecar: null,
    });
}
async function commit118(cap, api) {
    const { ctx, p, h, prepared } = runtime118(cap),
        record = ctx.state.taxContinuation121,
        state = record.sweep;
    assert.equal(p.mode, "commit-once");
    assert(state && !state.finalSuccess && !state.normalPending);
    h.assertEffectsReadyTax15(prepared);
    verifyFIOriginals118(ctx, h, state, prepared, { complete: true });
    samePin118(p.approvedFICompletion, state.fiComplete);
    await api.login(p.actorKey);
    await waitAuth118(cap);
    checkpoint118(cap, "normal-immediately-before");
    record.normalTaxPending = {
        operationId: F118.operation,
        bodySHA256: p.bodySHA256,
        invocationNonce: p.nonce,
    };
    ctx.persist();
    const response = await api.request(
        F118.operation,
        {},
        structuredClone(prepared.body),
        p.actorKey,
        h.correctionBindingTax15,
    );
    assert.equal(response.status, 201);
    assert.equal(record.sweep.finalSuccess.requestId, response.requestId);
    return verifyNormal118(cap);
}
export async function runTax15Once118(inputPin, reviewPin) {
    assert.equal(process.platform, "linux");
    const input = assertInput118(json118(inputPin)),
        priv = F118.private + "/business/" + F118.epoch + "/" + F118.run;
    const exactReview = json118(reviewPin),
        codeReview = json118(input.codeReview);
    assert.equal(exactReview.kind, "Root-approved-exact-Tax15-invocation118");
    samePin118(exactReview.approvedInput, inputPin);
    samePin118(exactReview.codeReview, input.codeReview);
    assert.equal(exactReview.actualG2Authorized, true);
    assert.equal(exactReview.mode, input.mode);
    assert.equal(exactReview.nonce, input.nonce);
    assert.equal(
        exactReview.normalTaxPOSTGranted,
        input.mode === "commit-once",
    );
    assert.equal(
        exactReview.FIGranted,
        ["fi-closed-set", "fi-family"].includes(input.mode),
    );
    assert.equal(codeReview.kind, "non-author-Tax15-invocation118-code-review");
    assert.equal(codeReview.verdict, "code-ready-for-exact-input-review");
    assert.equal(codeReview.reviewerIsAuthor, false);
    assert.deepEqual(codeReview.executionSources, input.executionSources);
    for (const p of input.executionSources) read118(p);
    assert.equal(fs.realpathSync(priv), priv);
    assert(
        fs.existsSync(priv + "/state.json"),
        "Only actual admitted Source15 state is executable",
    );
    assert(/^[a-f0-9-]{36}$/.test(input.nonce));
    const dir = priv + "/tax118-invocation-" + input.nonce;
    assert(!fs.existsSync(dir), "Nonce invocation cannot be repeated");
    fs.mkdirSync(dir, { mode: 0o700 });
    const lock = priv + "/driver.lock";
    fs.writeFileSync(
        lock,
        JSON.stringify({
            pid: process.pid,
            nonce: input.nonce,
            input: inputPin,
            mode: input.mode,
        }) + "\n",
        { flag: "wx", mode: 0o600 },
    );
    const lockSHA = sha118(fs.readFileSync(lock));
    let cap, result, closed, primaryFailure;
    try {
        fs.writeFileSync(
            dir + "/intent.json",
            JSON.stringify(
                {
                    kind: "actual-Tax15-invocation118-intent",
                    input: inputPin,
                    exactReview: reviewPin,
                    nonce: input.nonce,
                    pid: process.pid,
                    mode: input.mode,
                },
                null,
                2,
            ) + "\n",
            { flag: "wx", mode: 0o600 },
        );
        cap = await openInvocation118(inputPin, reviewPin);
        if (input.mode === "prepare-only") {
            result = await prepareTax15(cap, createWire118(cap));
        } else if (["fi-closed-set", "fi-family"].includes(input.mode)) {
            result = await runFI118(cap, createWire118(cap));
        } else if (input.mode === "commit-once") {
            result = await commit118(cap, createWire118(cap));
        } else if (input.mode === "verify-committed") {
            result = await verifyPublishedInvocation121(cap);
        } else if (input.mode === "disarm-owned") {
            result = (await remove118(cap)).receipt;
        } else throw Error("Unknown finite Tax mode");
        const closingCap = cap;
        cap = null;
        closed = await closeInvocation118(closingCap, result);
        const receipt = {
            kind: "actual-Tax15-invocation118-command-complete",
            mode: input.mode,
            input: inputPin,
            review: reviewPin,
            result,
            closed,
            G3: false,
            G4: false,
        };
        fs.writeFileSync(
            dir + "/complete.json",
            JSON.stringify(receipt, null, 2) + "\n",
            { flag: "wx", mode: 0o600 },
        );
        return receipt;
    } catch (e) {
        primaryFailure = e;
        if (cap) {
            try {
                closed = await closeInvocation118(cap, result ?? null, {
                    failed: true,
                });
            } catch (x) {
                e.bookendError = x.message;
            }
            cap = null;
        }
        fs.writeFileSync(
            dir + "/partial.json",
            JSON.stringify(
                {
                    kind: "partial-Tax15-invocation118-preserve",
                    mode: input.mode,
                    input: inputPin,
                    review: reviewPin,
                    result: result ?? null,
                    message: e.message,
                    bookendError: e.bookendError ?? null,
                    closed: closed ?? null,
                    openFailure: e.openFailure ?? null,
                    blindRetryForbidden: true,
                },
                null,
                2,
            ) + "\n",
            { flag: "wx", mode: 0o600 },
        );
        throw e;
    } finally {
        try {
            const bytes = fs.readFileSync(lock);
            assert.equal(sha118(bytes), lockSHA);
            const owner = JSON.parse(bytes);
            assert.equal(owner.pid, process.pid);
            assert.equal(owner.nonce, input.nonce);
            fs.unlinkSync(lock);
        } catch (lockError) {
            const evidence = {
                kind: "Tax15-lock-cleanup-failure-preserve",
                input: inputPin,
                nonce: input.nonce,
                primaryError: primaryFailure?.message ?? null,
                lockError: lockError.message,
                completionAlreadyWritten: fs.existsSync(dir + "/complete.json"),
                replayForbidden: true,
            };
            try {
                fs.writeFileSync(
                    dir + "/lock-cleanup-failure.json",
                    JSON.stringify(evidence, null, 2) + "\n",
                    { flag: "wx", mode: 0o600 },
                );
            } catch (evidenceError) {
                lockError.evidenceError = evidenceError.message;
            }
            if (primaryFailure) {
                primaryFailure.lockCleanupError = lockError.message;
            } else throw lockError;
        }
    }
}
export async function main118(args = process.argv.slice(2)) {
    if (args.length === 1 && args[0] === "--help") {
        console.log(
            "Root only: --input FILE --input-sha SHA --review FILE --review-sha SHA --execute. Modes: prepare-only | fi-closed-set | fi-family | commit-once | verify-committed | disarm-owned. Each mode needs its own exact G2.",
        );
        return;
    }
    assert.equal(args.length, 9);
    assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], [
        "--input",
        "--input-sha",
        "--review",
        "--review-sha",
        "--execute",
    ]);
    const r = await runTax15Once118(
        { file: args[1], rawBytesSha256: args[3] },
        { file: args[5], rawBytesSha256: args[7] },
    );
    console.log(
        JSON.stringify({
            mode: r.mode,
            result: r.result,
            closedJournal: r.closed.closedJournal,
            G3: false,
            G4: false,
        }),
    );
}
if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    main118().catch((e) => {
        console.error(
            JSON.stringify({
                kind: "Tax15-invocation118-stopped",
                message: e.message,
                preserveOriginals: true,
                replayForbidden: true,
            }),
        );
        process.exitCode = 1;
    });
}
