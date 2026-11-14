// Root-only finite driver. Importing this module executes no task effects.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import * as budgetNative121 from "../business/runtime-admission121.mjs";
import {
    F118,
    freeze118,
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
const budgetRunnerOnce118 = new WeakSet();
const failedActorBookend118 = () => ({status:"UNOBSERVED",observation:null,error:null});
function failureBudget118(phase, interval, returned, writes = []) {
    return {phase,name:"Error",message:"Actual " + phase + " failure preserved; inspect existing private evidence",checkpointReturned:returned,checkpointInterval:interval,writeFailures:writes,replayForbidden:true};
}
function ownData118(object, key) {
    const field = object && Object.getOwnPropertyDescriptor(object, key);
    return field && Object.hasOwn(field,"value") ? field.value : undefined;
}
function budgetNonceDirectory118(inputPin, reviewPin, p) {
    const directory = F118.private + "/business/" + F118.epoch + "/" + F118.run + "/tax118-invocation-" + p.nonce;
    const stat = fs.lstatSync(directory);
    assert(stat.isDirectory() && !stat.isSymbolicLink());
    assert.equal(fs.realpathSync(directory), directory);
    const intent = json118({file:directory + "/intent.json",rawBytesSha256:sha118(fs.readFileSync(directory + "/intent.json"))});
    samePin118(intent.input,inputPin); samePin118(intent.exactReview,reviewPin);
    assert.equal(intent.pid,process.pid); assert.equal(intent.nonce,p.nonce); assert.equal(intent.mode,"budget-probe");
    return directory;
}
function budgetSave118(directory, name, value) {
    assert(["budget-base-sample.json","budget-probe-report.json","complete.json","partial.json"].includes(name));
    const file = directory + "/" + name, bytes = Buffer.from(JSON.stringify(value,null,2) + "\n");
    fs.writeFileSync(file,bytes,{flag:"wx",mode:0o600});
    const pin = {file,bytes:bytes.length,rawBytesSha256:sha118(bytes)};
    read118(pin);
    return pin;
}
function budgetCoverage118(actorAfter, endNs) {
    const observation = actorAfter?.status === "VERIFIED" ? actorAfter.observation : null;
    const result = {status:"UNKNOWN",lastActorObservation:observation,anchorNs:observation?.anchorNs ?? null,throughNs:endNs,elapsedCeilMs:null,idleChargedRemainingMs:null,absoluteChargedRemainingMs:null};
    if (!observation || endNs === null) return result;
    const elapsed = BigInt(endNs) - BigInt(observation.anchorNs);
    if (elapsed < 0n) return result;
    const elapsedCeilMs = Number((elapsed + 999999n) / 1000000n);
    if (!Number.isSafeInteger(elapsedCeilMs)) return result;
    result.elapsedCeilMs = elapsedCeilMs;
    result.idleChargedRemainingMs = observation.idleDeadlineMs - observation.sqlNowMs - elapsedCeilMs;
    result.absoluteChargedRemainingMs = observation.absoluteDeadlineMs - observation.sqlNowMs - elapsedCeilMs;
    if (result.idleChargedRemainingMs > 2000 && result.absoluteChargedRemainingMs > 2000) result.status = "VERIFIED_THROUGH_CLOSE_RETURN";
    return result;
}
export async function runBudgetProbe118(inputPin, reviewPin, port) {
    // This must precede every method call, pin read, directory lookup and write.
    budgetNative121.assertBudgetProbeRunner121(port,inputPin,reviewPin);
    assert(!budgetRunnerOnce118.has(port),"Budget runner cannot reenter");
    budgetRunnerOnce118.add(port);
    const p = assertInput118(json118(inputPin));
    assert.equal(p.mode,"budget-probe");
    const directory = budgetNonceDirectory118(inputPin,reviewPin,p);
    let entry, auth3 = [], actorBefore = failedActorBookend118(), actorAfter = failedActorBookend118();
    let checkpoint, interval = null, checkpointReturned = false, sample = null, failure = null, phase = "entry";
    try {
        entry = await port.entryFacts();
        phase = "auth3"; auth3 = await port.auth3Once();
        phase = "actor-before"; actorBefore = await port.actor37BeforeCP();
        assert.equal(actorBefore.status,"VERIFIED");
        phase = "checkpoint";
        const start = process.hrtime.bigint();
        try { checkpoint = await port.baseCPOnce(); checkpointReturned = true; }
        finally { const end = process.hrtime.bigint(); interval = {startNs:start.toString(),endNs:end.toString(),elapsedNs:(end-start).toString()}; }
        phase = "actor-after";
        try { actorAfter = await port.actor37AfterCP(); assert.equal(actorAfter.status,"VERIFIED"); }
        catch { actorAfter = {status:"FAILED",observation:null,error:"Actual post-checkpoint actor check failed"}; failure = failureBudget118(phase,interval,true); }
        phase = "sample-write";
        budgetNative121.assertBudgetProbeRunner121(port,inputPin,reviewPin); // distinct private sample-write latch
        budgetNonceDirectory118(inputPin,reviewPin,p);
        sample = budgetSave118(directory,"budget-base-sample.json",{
            kind:"actual-Tax15-budget-probe-base-sample118",schemaVersion:1,mode:p.mode,nonce:p.nonce,
            input:inputPin,exactReview:reviewPin,prepareAdoption121:entry.prepareAdoption121,
            currentFrame:entry.currentFrame,entryGuard:entry.entryGuard,auth3,actorBefore,
            checkpoint:{phase:"budget-base",...interval,returned:true,activeFault:false,value:checkpoint},
            actorAfter,baseCPRecorded:true,full67BudgetStatus:"UNKNOWN",FIGranted:false,normalTaxPOSTGranted:false,
        });
    } catch {
        const writes = phase === "sample-write" ? [{file:directory + "/budget-base-sample.json",message:"Sample gate, wx or immutable readback failed",existingFilePreserved:fs.existsSync(directory + "/budget-base-sample.json")}] : [];
        failure ??= failureBudget118(phase,interval,checkpointReturned,writes);
        if (failure.writeFailures.length === 0 && writes.length) failure.writeFailures = writes;
    }
    const close = {constructorReturned:true,attempted:true,startNs:null,endNs:null,elapsedNs:null,returned:false,nativeCloseVerified:false,exitGuard:null,closedJournal:null,error:null};
    let closed = null;
    const closeStart = process.hrtime.bigint(); close.startNs = closeStart.toString();
    try { closed = await port.closeOnce(sample); close.returned = true; }
    catch (error) {
        closed = ownData118(error,"budgetCloseFacts") ?? null;
        close.error = "Actual full close failed; preserve existing private evidence";
        failure ??= failureBudget118("close",interval,checkpointReturned);
    } finally {
        const closeEnd = process.hrtime.bigint(); close.endNs = closeEnd.toString(); close.elapsedNs = (closeEnd-closeStart).toString();
    }
    // Data-only file readback is permitted after close; no cap or SQL is used.
    try {
        if (closed) {
            const exit = ownData118(closed,"exitGuard"), journal = ownData118(closed,"closedJournal");
            if (exit) { read118(exit); close.exitGuard = exit; }
            if (journal) { read118(journal); close.closedJournal = journal; }
            close.nativeCloseVerified = close.returned && close.exitGuard !== null && close.closedJournal !== null;
            if (close.returned && sample !== null) {
                const actualResult = ownData118(closed,"result");
                if (actualResult === null) {
                    sample = null;
                    failure ??= failureBudget118("sample-close-readback",interval,checkpointReturned);
                } else samePin118(actualResult,sample);
            }
        }
    } catch { close.nativeCloseVerified = false; close.error ??= "Actual close evidence readback failed"; failure ??= failureBudget118("close-readback",interval,checkpointReturned); }
    const sessionCoverage = budgetCoverage118(actorAfter,close.returned ? close.endNs : null);
    if (sessionCoverage.status !== "VERIFIED_THROUGH_CLOSE_RETURN") failure ??= failureBudget118("close-coverage",interval,checkpointReturned);
    const complete = sample !== null && checkpointReturned && actorBefore.status === "VERIFIED" && actorAfter.status === "VERIFIED" && close.nativeCloseVerified && sessionCoverage.status === "VERIFIED_THROUGH_CLOSE_RETURN" && failure === null;
    return freeze118({sample,baseCPRecorded:sample !== null,prepareAdoption121:entry?.prepareAdoption121 ?? null,close,sessionCoverage,probeOutcome:complete?"OBSERVATION_COMPLETE":"STOPPED_PRESERVE",failure});
}
async function finishBudgetCommand118(inputPin, reviewPin, input, directory) {
    let terminal, report = null, closed = null, failure = null;
    try {
        terminal = await budgetNative121.executeBudgetProbe121(inputPin,reviewPin);
    } catch (error) {
        terminal = ownData118(error,"budgetProbeTerminal");
        if (!terminal) terminal = {sample:null,baseCPRecorded:false,prepareAdoption121:null,close:{constructorReturned:null,attempted:false,startNs:null,endNs:null,elapsedNs:null,returned:false,nativeCloseVerified:false,exitGuard:null,closedJournal:null,error:"Native executor did not return a certified terminal envelope"},sessionCoverage:budgetCoverage118(null,null),probeOutcome:"STOPPED_PRESERVE",failure:failureBudget118("native-entry",null,false)};
    }
    let checkpointReturned = terminal.failure?.checkpointReturned ?? Boolean(terminal.baseCPRecorded);
    let checkpointInterval = terminal.failure?.checkpointInterval ?? null, outputPhase = "report-write";
    try {
        if (terminal.sample) {
            const saved = json118(terminal.sample).checkpoint;
            checkpointReturned = saved.returned === true;
            checkpointInterval = {startNs:saved.startNs,endNs:saved.endNs,elapsedNs:saved.elapsedNs};
        }
        closed = terminal.close.returned && terminal.close.exitGuard && terminal.close.closedJournal ? {exitGuard:terminal.close.exitGuard,closedJournal:terminal.close.closedJournal,result:terminal.sample} : null;
        const adoption = terminal.prepareAdoption121 ?? json118(input.runtimeBindings).prepareAdoption121;
        report = budgetSave118(directory,"budget-probe-report.json",{
            kind:"actual-Tax15-budget-probe-report118",schemaVersion:1,mode:input.mode,nonce:input.nonce,input:inputPin,exactReview:reviewPin,
            prepareAdoption121:adoption,sample:terminal.sample,baseCPRecorded:terminal.baseCPRecorded,close:terminal.close,sessionCoverage:terminal.sessionCoverage,
            probeOutcome:terminal.probeOutcome,full67BudgetStatus:"UNKNOWN",FIGranted:false,normalTaxPOSTGranted:false,G3:false,G4:false,failure:terminal.failure,
        });
        outputPhase = "observation-stopped";
        if (terminal.probeOutcome !== "OBSERVATION_COMPLETE") throw Error("Actual budget observation stopped; preserve partial evidence");
        const receipt = {kind:"actual-Tax15-invocation118-command-complete",mode:input.mode,input:inputPin,review:reviewPin,result:terminal.sample,closed,G3:false,G4:false,budgetProbeReport:report};
        outputPhase = "complete-write";
        budgetSave118(directory,"complete.json",receipt);
        return receipt;
    } catch {
        failure = terminal.failure ?? failureBudget118(outputPhase,checkpointInterval,checkpointReturned);
        if (outputPhase === "report-write" || outputPhase === "complete-write") {
            const file = directory + (outputPhase === "report-write" ? "/budget-probe-report.json" : "/complete.json");
            failure = {...failure,writeFailures:[...failure.writeFailures,{file,message:"Actual output wx or immutable readback failed",existingFilePreserved:fs.existsSync(file)}]};
        }
        try {
            budgetSave118(directory,"partial.json",{kind:"partial-Tax15-invocation118-preserve",mode:input.mode,input:inputPin,review:reviewPin,result:terminal.sample ?? null,message:"Actual budget command stopped; preserve existing private evidence",bookendError:terminal.close.error,closed,openFailure:null,blindRetryForbidden:true,budgetProbeReport:report,budgetProbeFailure:failure});
        } catch { /* Preserve all existing files; never retry writes or close. */ }
        const error = Error("Actual budget command stopped; inspect existing report/partial and never replay its nonce");
        Object.defineProperty(error,"budgetProbeFailure",{value:freeze118(failure)});
        throw error;
    }
}
export async function runTax15Once118(inputPin, reviewPin) {
    assert.equal(process.platform, "linux");
    const input = assertInput118(json118(inputPin)),
        priv = F118.private + "/business/" + F118.epoch + "/" + F118.run;
    if (input.mode === "budget-probe") {
        const inputBytes = read118(inputPin), reviewBytes = read118(reviewPin);
        inputPin = {file:inputPin.file,bytes:inputBytes.length,rawBytesSha256:sha118(inputBytes)};
        reviewPin = {file:reviewPin.file,bytes:reviewBytes.length,rawBytesSha256:sha118(reviewBytes)};
    }
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
        if (input.mode === "budget-probe") return await finishBudgetCommand118(inputPin, reviewPin, input, dir);
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
        if (input.mode === "budget-probe") throw e; // budget owner has already consumed its one close and written its partial
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
            "Root only: --input FILE --input-sha SHA --review FILE --review-sha SHA --execute. Modes: prepare-only | fi-closed-set | fi-family | commit-once | verify-committed | disarm-owned | budget-probe. Each mode needs its own exact G2.",
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
