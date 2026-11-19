// One invocation owns one unexported WeakMap capability. No signer accepts a
// supplied context, guard, callback, reader, phase override, or persisted token.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { isProxy } from "node:util/types";
import { pathToFileURL } from "node:url";
import { sourcePins } from "../business/context.mjs";
import {createContext121,assertCurrentLease121,runtimeReference121} from "../business/runtime-admission121.mjs";
import * as budgetNative121 from "../business/runtime-admission121.mjs";
import {
    assertRuntimeFacts118,
    F118,
    freeze118,
    json118,
    pin118,
    read118,
    readRetainedTaxProof118,
    samePin118,
    sha118,
} from "./retained-tax-proof.mjs";
import { deriveTax15Facts, inventoryTax15 } from "./tax15-facts.mjs";
const caps = new WeakMap();
const budgetRoots118 = new WeakMap();
const budgetOpening118 = new WeakMap();
const hash = (v) => sha118(JSON.stringify(v));
export const EXECUTOR_NAMES118 = Object.freeze([
    "run-tax15-once.mjs",
    "invocation-proof.mjs",
    "retained-tax-proof.mjs",
    "tax15-once-effects.mjs",
    "tax15-once-wire.mjs",
    "tax15-once-ledger.mjs",
]);
export const PREPARE_NAMES118 = Object.freeze([
    "tax15-prepare.mjs",
    "tax15-facts.mjs",
]);
export const MODES118 = Object.freeze([
    "prepare-only",
    "fi-closed-set",
    "fi-family",
    "commit-once",
    "verify-committed",
    "disarm-owned",
    "budget-probe",
]);
const runtimeKeys = new Set([
    "sequence",
    "actors",
    "owned",
    "borrowed",
    "objects",
    "taxContinuation121",
    "consumerChecks",
    "activeFault",
    "blockedObservation",
    "actualAuthConfigurations",
    "statusSourcePins",
]);
const methods = Object.freeze([
    "persist",
    "next",
    "artifact",
    "public",
    "client",
    "db",
    "instant",
    "own",
]);
const dataKeys = [
    "namespace",
    "base",
    "migrations",
    "tables",
    "database",
    "databases",
    "identity",
    "epoch",
    "run",
    "priv",
    "out",
    "pins",
    "helperPins",
    "options",
    "api",
    "origin",
    "host",
    "port",
    "owner",
    "apps",
    "mirror",
    "win",
    "private",
    "stateRoot",
    "provision",
];
const protectedTax = new Set([
    "identity",
    "retainedParent14",
    "originalProducer12",
    "retainedMain13",
    "mainCompletion",
    "legacyReferences",
    "taxPreparation",
    "runtimeAdmission121",
    "retainedSource15State",
    "retainedPreparation15",
    "continuation121",
    "continuationReadback",
]);
export function assertInput118(p) {
    const keys = [
        "kind",
        "schemaVersion",
        "namespace",
        "epoch",
        "run",
        "mode",
        "nonce",
        "phase",
        "actorKey",
        "actorId",
        "expectedActorPermissions",
        "bodySHA256",
        "technicalG1",
        "baseline",
        "expectedEntryState",
        "runtimeBindings",
        "codeAdmission15",
        "candidate",
        "actualHelperPins",
        "actualSourcePins",
        "actualCompilePins",
        "apiProcess",
        "prepared15",
        "fullInventory",
        "codeReview",
        "executionSources",
        "wireSpec",
        "approvedClosedFISet",
        "selectedFamily",
        "approvedRecovery",
        "approvedCompletedPrefix",
        "approvedStartCursor",
        "approvedFICompletion",
        "expectedActiveFault",
    ];
    assert(p && typeof p === "object" && !Array.isArray(p));
    assert.deepEqual(Object.keys(p).sort(), keys.sort());
    assert.equal(p.kind, "Root-reviewed-Tax15-invocation118");
    assert.equal(p.schemaVersion, 1);
    assert.equal(p.namespace, F118.namespace);
    assert.equal(p.epoch, F118.epoch);
    assert.equal(p.run, F118.run);
    assert(MODES118.includes(p.mode));
    assert(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
            .test(p.nonce),
    );
    assert(/^[A-Za-z0-9_-]{1,30}$/.test(p.phase));
    assert.equal(p.actorKey, "manager");
    assert(/^[a-f0-9-]{36}$/.test(p.actorId));
    assert(
        Array.isArray(p.expectedActorPermissions) &&
            p.expectedActorPermissions.length > 0,
    );
    assert.equal(
        new Set(p.expectedActorPermissions).size,
        p.expectedActorPermissions.length,
    );
    for (
        const k of [
            "technicalG1",
            "baseline",
            "expectedEntryState",
            "runtimeBindings",
            "codeAdmission15",
            "candidate",
            "actualHelperPins",
            "actualSourcePins",
            "actualCompilePins",
            "apiProcess",
            "codeReview",
            "wireSpec",
        ]
    ) pin118(p[k]);
    if (p.mode === "budget-probe") {
        samePin118(p.technicalG1, F118.budgetG1);
        assert.equal(p.technicalG1.bytes, F118.budgetG1.bytes);
        assert.equal(p.expectedActorPermissions.length, 37);
    } else assert.equal(p.technicalG1.rawBytesSha256, F118.g1SHA);
    assert.equal(p.baseline.rawBytesSha256, F118.baselineSHA);
    assert.equal(
        p.wireSpec.file,
        F118.win + "/libs/shared/api-spec/openapi.json",
    );
    const names = [...EXECUTOR_NAMES118, ...PREPARE_NAMES118].sort();
    assert(
        Array.isArray(p.executionSources) && p.executionSources.length === 8,
    );
    assert.deepEqual(
        p.executionSources.map((q) => path.posix.basename(pin118(q).file))
            .sort(),
        names,
    );
    for (const q of p.executionSources) {
        assert.equal(
            q.file,
            F118.win + "/tools/rust-r4ghi/tax15-invocation118/" +
                path.posix.basename(q.file),
        );
    }
    if (p.mode === "prepare-only") {
        for (
            const k of [
                "bodySHA256",
                "prepared15",
                "fullInventory",
                "approvedClosedFISet",
                "selectedFamily",
                "approvedRecovery",
                "approvedCompletedPrefix",
                "approvedStartCursor",
                "approvedFICompletion",
                "expectedActiveFault",
            ]
        ) assert.equal(p[k], null, "Unproduced prepare output: " + k);
    } else {
        assert(/^[a-f0-9]{64}$/.test(p.bodySHA256));
        pin118(p.prepared15);
        pin118(p.fullInventory);
    }
    for (
        const [k, m] of Object.entries({
            approvedClosedFISet: "fi-closed-set",
            selectedFamily: "fi-family",
            approvedRecovery: "fi-family",
            approvedCompletedPrefix: "fi-family",
            approvedStartCursor: "fi-family",
            approvedFICompletion: "commit-once",
            expectedActiveFault: "disarm-owned",
        })
    ) {
        if (p.mode !== m) assert.equal(p[k], null, "Mode cannot borrow " + k);
        else if (k === "selectedFamily") {
            assert(typeof p[k] === "string" && p[k]);
        } else if (k === "approvedStartCursor") {
            assert(Number.isSafeInteger(p[k]) && p[k] >= 0);
        } else pin118(p[k]);
    }
    return p;
}
export function assertClosedSet118(
    inventory,
    set,
    { prepared, fullInventory, bodySHA256 },
) {
    assert(Array.isArray(inventory) && inventory.length > 0);
    assert.equal(set.kind, "Root-approved-Tax15-closed-FI-set118");
    samePin118(set.prepared, prepared);
    samePin118(set.fullInventory, fullInventory);
    assert.equal(set.bodySHA256, bodySHA256);
    assert.equal(set.inventorySHA256, hash(inventory));
    const keys = inventory.map((d) => d.key);
    assert(keys.every((k) => typeof k === "string" && k));
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(set.orderedFamilyKeys, keys);
    assert.deepEqual(set.descriptors, inventory);
    return keys;
}
export function transition118(frame, event) {
    const next = structuredClone(frame),
        edges = {
            ready: "authenticated",
            authenticated: "beforeCaptured",
            beforeCaptured: "controlsInstalled",
            controlsInstalled: "requestPending",
            requestPending: "responseRecorded",
            responseRecorded: "controlsRemoved",
            controlsRemoved: "afterCaptured",
            afterCaptured: "reconciled",
            reconciled: "familyVerified",
        };
    assert.equal(event.cursor, frame.cursor);
    assert.equal(event.key, frame.key);
    assert.equal(event.bodySHA256, frame.bodySHA256);
    assert.equal(
        edges[frame.stage],
        event.stage,
        "No skipped/repeated/reversed family stage",
    );
    for (
        const k of [
            "requestId",
            "sessionId",
            "before",
            "controlIdentity",
            "response",
            "after",
            "ledger",
        ]
    ) {
        if (frame[k] !== undefined && event[k] !== undefined) {
            assert.deepEqual(
                event[k],
                frame[k],
                "One family cannot change its actual " + k,
            );
        }
    }
    Object.assign(next, event);
    return next;
}
const parent = (state) =>
    Object.fromEntries(
        Object.entries(state).filter(([k]) => !runtimeKeys.has(k)),
    );
function live(cap) {
    const d = caps.get(cap);
    assert(d && !d.closed, "Live private invocation capability required");
    assert.equal(d.pid, process.pid);
    assert.equal(
        fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
        d.boot,
    );
    return d;
}
// Pure view construction is exported for actual confinement tests. It cannot
// mint a capability or choose an effect mode. Its prototype is deliberately null.
export function restrictContext118(root) {
    assert(!budgetRoots118.has(root), "Budget Root never exposes the eight-method facade");
    const appsField = Object.getOwnPropertyDescriptor(root, "apps");
    assert(appsField && Object.hasOwn(appsField, "value"), "Existing genuine fixed app roles required");
    const actualApps = appsField.value;
    assert(Array.isArray(actualApps) && !isProxy(actualApps) && Object.getPrototypeOf(actualApps) === Array.prototype, "Plain fixed app-role array required");
    assert.equal(actualApps.length, 2, "Exactly two fixed app roles required");
    assert.deepEqual(Reflect.ownKeys(actualApps), ["0", "1", "length"], "Exactly two fixed app roles required");
    for (const [i, role] of ["poms_r4ghi_native_app", "poms_r4ghi_rust_app"].entries()) {
        const field = Object.getOwnPropertyDescriptor(actualApps, String(i));
        assert(field && Object.hasOwn(field, "value"), "App roles must be own data values");
        assert.equal(field.enumerable, true, "App roles must be enumerable data values");
        assert.equal(field.value, role, "Foreign app role refused");
    }
    const cache = new WeakMap(),
        ro = (v) => {
            if (v === null || typeof v !== "object") {
                return typeof v === "function" ? undefined : v;
            }
            if (!cache.has(v)) cache.set(v, freeze118(structuredClone(v)));
            return cache.get(v);
        };
    const tax = new Proxy(root.state.taxContinuation121, {
        get(t, k) {
            if (typeof k !== "string") return undefined;
            const v = t[k];
            return protectedTax.has(k)
                ? ro(v)
                : typeof v === "function"
                ? undefined
                : v;
        },
        getOwnPropertyDescriptor(t, k) {
            const q = Reflect.getOwnPropertyDescriptor(t, k);
            return q
                ? { ...q, value: protectedTax.has(k) ? ro(q.value) : q.value }
                : q;
        },
        set(t, k, v) {
            assert(
                typeof k === "string" && !protectedTax.has(k) &&
                    !["__proto__", "constructor", "prototype"].includes(k),
            );
            return Reflect.set(t, k, v, t);
        },
        defineProperty() {
            throw Error("Tax descriptors protected");
        },
        deleteProperty(t, k) {
            assert(!protectedTax.has(k));
            return Reflect.deleteProperty(t, k);
        },
        getPrototypeOf() {
            return null;
        },
        setPrototypeOf() {
            throw Error("Tax prototype protected");
        },
        preventExtensions() {
            throw Error("Tax cannot be frozen");
        },
    });
    const state = new Proxy(root.state, {
        get(t, k) {
            if (k === "taxContinuation121") return tax;
            if (typeof k !== "string") return undefined;
            return runtimeKeys.has(k) ? t[k] : ro(t[k]);
        },
        getOwnPropertyDescriptor(t, k) {
            const q = Reflect.getOwnPropertyDescriptor(t, k);
            return q
                ? {
                    ...q,
                    value: k === "taxContinuation121"
                        ? tax
                        : runtimeKeys.has(k)
                        ? q.value
                        : ro(q.value),
                }
                : q;
        },
        set(t, k, v) {
            assert(
                runtimeKeys.has(k) && k !== "taxContinuation121",
                "Immutable parent field",
            );
            return Reflect.set(t, k, v, t);
        },
        defineProperty() {
            throw Error("State descriptors protected");
        },
        deleteProperty(t, k) {
            assert(runtimeKeys.has(k) && k !== "taxContinuation121");
            return Reflect.deleteProperty(t, k);
        },
        getPrototypeOf() {
            return null;
        },
        setPrototypeOf() {
            throw Error("State prototype protected");
        },
        preventExtensions() {
            throw Error("State cannot be frozen");
        },
    });
    const view = Object.create(null);
    for (const k of dataKeys) {
        if (Object.hasOwn(root, k)) {
            Object.defineProperty(view, k, {
                value: ro(k === "apps" ? actualApps : root[k]),
                enumerable: true,
            });
        }
    }
    Object.defineProperty(view, "state", { value: state, enumerable: true });
    for (const k of methods) {
        assert(
            Object.hasOwn(root, k) && typeof root[k] === "function",
            "Exactly eight actual own methods",
        );
        Object.defineProperty(view, k, {
            value: root[k].bind(root),
            enumerable: true,
        });
    }
    return Object.freeze(view);
}
async function helpers() {
    const load = (n) =>
        import(
            pathToFileURL(F118.win + "/tools/rust-r4ghi/business/" + n + ".mjs")
                .href
        );
    const [snapshot, scope, faults, ef, selector, auth, semantics, main] =
        await Promise.all(
            [
                "snapshot",
                "required-write-inventory",
                "fault-sweep",
                "ef-fault-sweep40",
                "ef-write-inventory40",
                "auth-config-binding",
                "tax13-semantics",
                "tax13-main",
            ].map(load),
        );
    return Object.freeze({
        capture: snapshot.capture,
        readRows: snapshot.readRows,
        loadSnapshot: snapshot.loadSnapshot,
        requireOwnedScope: scope.requireOwnedScope,
        assertSweepRollback: faults.assertSweepRollback,
        verifyEFFinalWrites40: ef.verifyEFFinalWrites40,
        efSelectorSql40: selector.efSelectorSql40,
        loadActualAuthConfig: auth.loadActualAuthConfig,
        verifyTax13Semantics: semantics.verifyTax13Semantics,
        correctionBindingTax15: main.correctionBindingTax13,
        deriveTax13Facts: deriveTax15Facts,
        inventoryTax13: inventoryTax15,
        assertEffectsReadyTax15(saved) {
            for (const p of saved.packets) {
                assert.equal(
                    p.preparation.formalEligibility.status,
                    "eligible",
                );
                assert.deepEqual(p.preparation.blockingReasonCodes, []);
                assert.equal(
                    p.target.periodEndSnapshotRef,
                    null,
                    "A real period target requires separate review, never trim it for this live adapter",
                );
            }
        },
    });
}
function binary(p, all) {
    pin118(p);
    assert(Array.isArray(all));
    const matches = all.filter((q) =>
        q.file === p.file && q.rawBytesSha256 === p.rawBytesSha256
    );
    assert.equal(matches.length, 1, "Exactly one file/SHA binary Facts6 required");
    const fact = matches[0];
    assert.deepEqual(Object.keys(fact).sort(), [
        "file", "rawBytesSha256", "bytes", "dev", "ino", "nlink",
    ].sort());
    assert(Number.isSafeInteger(fact.bytes) && fact.bytes >= 0);
    assert(typeof fact.dev === "string" && /^[0-9]+$/.test(fact.dev));
    assert(typeof fact.ino === "string" && /^[0-9]+$/.test(fact.ino));
    assert(Number.isSafeInteger(fact.nlink) && fact.nlink >= 1);
    if (p.bytes !== undefined) {
        assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
        assert.equal(p.bytes, fact.bytes, "Pin/Fact binary byte count");
    }
    const s = fs.lstatSync(p.file, { bigint: true });
    assert(s.isFile() && !s.isSymbolicLink() && s.nlink >= 1n);
    assert.equal(fs.realpathSync(p.file), p.file);
    assert.equal(s.dev.toString(), fact.dev);
    assert.equal(s.ino.toString(), fact.ino);
    assert.equal(Number(s.nlink), fact.nlink);
    assert.equal(Number(s.size), fact.bytes);
    let fd = null;
    try {
        fd = fs.openSync(p.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
        const opened = fs.fstatSync(fd, { bigint: true });
        assert(opened.isFile() && !opened.isSymbolicLink());
        assert.equal(opened.dev.toString(), fact.dev);
        assert.equal(opened.ino.toString(), fact.ino);
        assert.equal(Number(opened.nlink), fact.nlink);
        assert.equal(Number(opened.size), fact.bytes);
        for (const key of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"])
            assert.equal(opened[key], s[key], "Binary changed before opened");
        const bytes = fs.readFileSync(fd);
        assert.equal(bytes.length, fact.bytes);
        assert.equal(sha118(bytes), p.rawBytesSha256);
        const afterFD = fs.fstatSync(fd, { bigint: true });
        assert(afterFD.isFile() && !afterFD.isSymbolicLink());
        for (const key of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"])
            assert.equal(afterFD[key], opened[key], "Opened binary changed while verified");
        const after = fs.lstatSync(p.file, { bigint: true });
        assert(after.isFile() && !after.isSymbolicLink());
        assert.equal(fs.realpathSync(p.file), p.file);
        for (const key of ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"])
            assert.equal(after[key], s[key], "Binary path changed while verified");
    } finally {
        if (fd !== null) fs.closeSync(fd);
    }
}
function apiIdentity(d) {
    const r = d.root.state.apiProcess.record;
    assert.equal(r.namespace, F118.namespace);
    assert.equal(r.root, F118.mirror);
    assert.equal(r.port, 31441);
    const text = fs.readFileSync("/proc/" + r.pid + "/stat", "utf8");
    assert.equal(
        text.slice(text.lastIndexOf(")") + 1).trim().split(/\s+/)[19],
        r.startTime,
    );
    assert.equal(fs.realpathSync("/proc/" + r.pid + "/exe"), r.binary);
    assert.equal(fs.realpathSync("/proc/" + r.pid + "/cwd"), r.root);
    const sockets = new Set(
        fs.readdirSync("/proc/" + r.pid + "/fd").map((n) => {
            try {
                return fs.readlinkSync("/proc/" + r.pid + "/fd/" + n);
            } catch {
                return "";
            }
        }).filter((s) => /^socket:\[\d+\]$/.test(s)),
    );
    const listeners = ["/proc/net/tcp", "/proc/net/tcp6"].flatMap((f) =>
        fs.readFileSync(f, "utf8").trim().split("\n").slice(1).map((l) =>
            l.trim().split(/\s+/)
        )
    ).filter((a) =>
        a[3] === "0A" &&
        a[1].endsWith(":" + r.port.toString(16).toUpperCase().padStart(4, "0"))
    );
    assert(
        listeners.length === 1 &&
            sockets.has("socket:[" + listeners[0][9] + "]"),
        "Exact owned API listener",
    );
    for (const p of [d.verifiedRuntime.current.binary, d.verifiedRuntime.current.summaryBinary]) {
        binary(p, d.verifiedRuntime.current.binaryFiles);
    }
}
function currentFiles(d, ticket = null) {
    if (d.nativeBudget) budgetNative121.budgetAssertCurrentLease121(d.root,ticket,d.verifiedRuntime);
    else assertCurrentLease121(d.root,d.verifiedRuntime);
    currentTaxFiles118(d);
}
function currentTaxFiles118(d) {
    if (d.nativeBudget) assert.deepEqual(d.root.state.taxContinuation121, d.originalRecord, "Successful preparation birth record is immutable");
    const lock = json118({
        file: d.root.priv + "/driver.lock",
        rawBytesSha256: d.lockSHA,
    });
    assert.equal(lock.pid, d.pid);
    assert.equal(lock.nonce, d.p.nonce);
    assert.deepEqual(sourcePins(), d.manifest.current.sourcePins);
    const c = d.manifest.current,
        folder = F118.win + "/tools/rust-r4ghi/business",
        actual = fs.readdirSync(folder).filter((n) => /\.(mjs|json)$/.test(n))
            .sort().map((n) => {
                const file = "tools/rust-r4ghi/business/" + n,
                    q = c.helperSources.find((q) => q.file === file);
                assert(q, "Extra current H3 leaf");
                read118({
                    file: F118.win + "/" + file,
                    rawBytesSha256: q.sha256,
                });
                return { file, sha256: q.sha256 };
            });
    assert.deepEqual(actual, c.helperSources);
    assert.deepEqual(json118(d.p.actualHelperPins), actual);
    assert.deepEqual(json118(d.p.actualSourcePins), c.sourcePins);
    d.build.assertFreshBuildTree15(
        F118.win,
        c.sourcePins,
        json118(d.p.actualCompilePins),
    );
    d.build.assertFreshBuildTree15(
        F118.mirror,
        c.sourcePins,
        json118(d.p.actualCompilePins),
    );
    for (const q of [...c.sourcePins, ...json118(d.p.actualCompilePins)]) {
        read118({ file: F118.win + "/" + q.file, rawBytesSha256: q.sha256 });
    }
    for (
        const q of d.p.executionSources
    ) read118(q);
    for (
        const q of [
            d.inputPin,
            d.reviewPin,
            d.p.codeReview,
            d.p.wireSpec,
            d.p.runtimeBindings,
        ]
    ) read118(q);
    assert.deepEqual(parent(d.root.state), d.parent);
    assert.deepEqual(json118(d.p.runtimeBindings), d.manifest);
    samePin118(d.root.state.consumerAdmission54.registry, d.p.codeAdmission15);
    samePin118(d.root.state.runtimeAdmission121.candidate, d.p.candidate);
    samePin118(d.root.state.runtimeAdmission121.registry,d.manifest.current.runtimeAdmission121);
    samePin118(d.root.state.apiProcess, d.p.apiProcess);
    apiIdentity(d);
}
function ensureRecord(root,manifest,reg,legacy,runtimePin,retainedPreparation15){
 const identity={runtimeBindings:runtimePin,runtimeAdmission121:manifest.current.runtimeAdmission121,sourcePinsSHA256:manifest.current.sourcePinsSHA256,codeAdmission15:manifest.current.codeAdmission15,producerEpoch:manifest.legacy.epoch,producerSourcePinsSHA256:manifest.legacy.sourcePinsSHA256,producerProjectionSHA256:manifest.current.producerProjectionSHA256,originalProducerState12:manifest.legacy.originalProducerState12,reconciliation:manifest.legacy.reconciliation,retainedMainOriginal:legacy.retainedMain13.original,retainedSource15State:manifest.current.retainedSource15State};
 if(root.state.taxContinuation121){assert.deepEqual(root.state.taxContinuation121.identity,identity);assert.deepEqual(root.state.taxContinuation121.retainedPreparation15,retainedPreparation15);return;}
 root.state.taxContinuation121={kind:'current-Source15-runtime121-consumer-of-retained-real-tax-producer',identity,runtimeAdmission121:manifest.current.runtimeAdmission121,retainedSource15State:manifest.current.retainedSource15State,retainedPreparation15,originalProducer12:manifest.legacy.originalProducerState12,retainedParent14:{producerState:reg.producerState,retentionIndex:reg.retentionIndex},legacyReferences:{sourceProjectId:legacy.sourceProjectId,mainProjectId:legacy.mainProjectId,costId:legacy.costId,taxId:legacy.taxId,basisId:legacy.basisId,resultIds:legacy.resultIds,producerState:legacy.producerStatePin},retainedMain13:legacy.retainedMain13,mainCompletion:legacy.retainedMain13.record,taxPreparation:null,continuation121:null,continuationReadback:null,sweep:null,complete:null,sidecar:null};root.persist();
}
function closeFailedOpen118(
    root,
    native,
    registry,
    p,
    inputPin,
    reviewPin,
    primary,
    ticket = null,
) {
    let nativeExitError = null, sourceExitError = null;
    // Attempt the real native exit even if later journal/path checks fail.
    try {
        if (ticket === null) native.assertRuntimeBinding121(root,{runtimeAdmission121:json118(p.runtimeBindings).current.runtimeAdmission121,candidate:p.candidate});
        else native.budgetAssertRuntimeBinding121(root,ticket,{runtimeAdmission121:json118(p.runtimeBindings).current.runtimeAdmission121,candidate:p.candidate});
    } catch (error) {
        nativeExitError = error.message;
    }
    primary.openFailure = {
        phase: nativeExitError
            ? "failed-preserve"
            : "closed-failed-before-capability",
        actualConstructorReturned: true,
        capabilityReturned: false,
        nativeExitAttempted: true,
        nativeExitVerified: nativeExitError === null,
        nativeExitError,
    };
    if (nativeExitError) primary.bookendError = nativeExitError;
    const priv = F118.private + "/business/" + F118.epoch + "/" + F118.run;
    const directory = priv + "/tax118-invocation-" + p.nonce;
    assert.equal(fs.realpathSync(directory), directory);
    const intent = json118({
        file: directory + "/intent.json",
        rawBytesSha256: sha118(fs.readFileSync(directory + "/intent.json")),
    });
    samePin118(intent.input, inputPin);
    samePin118(intent.exactReview, reviewPin);
    assert.equal(intent.pid, process.pid);
    assert.equal(intent.nonce, p.nonce);
    try {
        for (
            const pin of [
                inputPin,
                reviewPin,
                p.runtimeBindings,
                ...p.executionSources,
            ]
        ) read118(pin);
    } catch (error) {
        sourceExitError = error.message;
    }
    const outcome = {
        kind: "actual-Tax15-open-failure-before-capability",
        phase: nativeExitError || sourceExitError
            ? "failed-preserve"
            : "closed-failed-before-capability",
        nonce: p.nonce,
        mode: p.mode,
        pid: process.pid,
        input: inputPin,
        exactReview: reviewPin,
        actualConstructorReturned: true,
        capabilityReturned: false,
        commandVerified: false,
        nativeExitAttempted: true,
        nativeExitVerified: nativeExitError === null,
        sourceExitVerified: sourceExitError === null,
        nativeExitError,
        sourceExitError,
        primaryError: primary.message,
        actualStateAfterFailure: {
            file: priv + "/state.json",
            rawBytesSha256: sha118(fs.readFileSync(priv + "/state.json")),
        },
        activeControlsPreserved: Boolean(root.state.activeFault),
        noStateRollbackAttempted: true,
        completion: null,
        sidecar: null,
        replayForbidden: true,
    };
    primary.openFailure = outcome;
    if (nativeExitError || sourceExitError) {
        primary.bookendError = nativeExitError ?? sourceExitError;
    }
    const file = directory + "/failed-open-native-exit.json";
    const bytes = Buffer.from(JSON.stringify(outcome, null, 2) + "\n");
    fs.writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
    outcome.evidence = {
        file,
        bytes: bytes.length,
        rawBytesSha256: sha118(bytes),
    };
    return { openFailure: outcome, result: null };
}
export async function openInvocation118(inputPin, reviewPin) {
    assert.equal(arguments.length, 2);
    return openInvocationBody118(inputPin, reviewPin);
}
async function openInvocationBody118(inputPin, reviewPin, budgetEntry = null) {
    if (budgetEntry !== null) budgetNative121.assertBudgetProbeDispatch121(budgetEntry.root, budgetEntry.ticket);
    assert.equal(process.platform, "linux");
    assert.equal(process.version, "v24.19.0");
    assert.equal(process.execArgv.length, 0);
    assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
    const p = assertInput118(json118(inputPin)),
        review = json118(reviewPin),
        code = json118(p.codeReview);
    assert.equal(p.mode === "budget-probe", budgetEntry !== null, "Budget entry is Native-only");
    const ticket = budgetEntry?.ticket ?? null;
    assert.equal(code.kind, "non-author-Tax15-invocation118-code-review");
    if (p.mode === "budget-probe") samePin118(code.technicalG1,p.technicalG1);
    assert.equal(code.verdict, "code-ready-for-exact-input-review");
    assert.equal(code.reviewerIsAuthor, false);
    assert.deepEqual(code.executionSources, p.executionSources);
    assert.equal(review.kind, "Root-approved-exact-Tax15-invocation118");
    samePin118(review.approvedInput, inputPin);
    samePin118(review.codeReview, p.codeReview);
    samePin118(review.expectedEntryState, p.expectedEntryState);
    assert.equal(review.mode, p.mode);
    assert.equal(review.nonce, p.nonce);
    assert.equal(review.actualG2Authorized, true);
    assert.equal(review.normalTaxPOSTGranted, p.mode === "commit-once");
    assert.equal(
        review.FIGranted,
        ["fi-closed-set", "fi-family"].includes(p.mode),
    );
    for (const q of [p.technicalG1, p.baseline, ...p.executionSources]) {
        read118(q);
    }
    assert.equal(json118(p.technicalG1).implementationAuthorized, true);
    const priv = F118.private + "/business/" + F118.epoch + "/" + F118.run;
    assert.equal(fs.realpathSync(priv), priv);
    const entry = read118(p.expectedEntryState);
    assert.equal(sha118(fs.readFileSync(priv + "/state.json")), sha118(entry));
    const lockBytes = fs.readFileSync(priv + "/driver.lock"),
        lockSHA = sha118(lockBytes),
        lock = json118({
            file: priv + "/driver.lock",
            rawBytesSha256: lockSHA,
        });
    assert.equal(lock.pid, process.pid);
    assert.equal(lock.nonce, p.nonce);
    samePin118(lock.input, inputPin);
    const manifest = json118(p.runtimeBindings);
    assert(p.runtimeBindings.file.startsWith(priv + "/"));
    samePin118(manifest.current.codeAdmission15, p.codeAdmission15);
    samePin118(manifest.current.candidate, p.candidate);
    const native = await import(
        pathToFileURL(
            F118.win + "/tools/rust-r4ghi/business/runtime-admission121.mjs",
        ).href
    );
    const reg = json118(p.codeAdmission15);
    let root;
    try {
        root = budgetEntry === null ? createContext121({
            epoch: F118.epoch,
            run: F118.run,
            "api-process-record": p.apiProcess.file,
        }) : budgetEntry.root; // budget Root is the one genuine Native-owned return
    } catch (error) {
        error.openFailure = {
            phase: "native-entry-not-returned-preserve",
            actualConstructorReturned: false,
            nativeExitAttempted: false,
            entryEffectsUnknown: true,
            reason:
                "No real root was returned; no fabricated context or second constructor is permitted",
        };
        throw error;
    }
    let openingCap = null;
    try {
        assert.deepEqual(root.state, JSON.parse(entry));
        const facts = assertRuntimeFacts118(root, manifest, reg, ticket),
            legacy = readRetainedTaxProof118(root, manifest, reg, ticket);
        samePin118(p.actualSourcePins,facts.verifiedRuntime.current.sourcePins);
        samePin118(p.actualCompilePins,facts.verifiedRuntime.current.compilePins);
        samePin118(p.actualHelperPins,facts.verifiedRuntime.current.helperPins);
        if (budgetEntry === null) ensureRecord(root,manifest,reg,legacy,p.runtimeBindings,facts.retainedPreparation15);
        else assertBudgetPreparation118(root, manifest, p, ticket);
        const record = root.state.taxContinuation121;
        assert(
            !record.pendingMain,
            "Main is inherited only; no pending Main continuation",
        );
        if (
            ["prepare-only", "fi-closed-set", "fi-family", "commit-once", "budget-probe"]
                .includes(
                    p.mode,
                )
        ) {
            assert(
                !record.pendingTaxTrial && !record.normalTaxPending,
                "Unknown command never replayed",
            );
        }
        if (p.mode === "verify-committed") {
            assert.equal(
                record.sweep?.finalSuccess?.status,
                201,
                "Read verification requires the cached original201",
            );
        }
        if (
            ["prepare-only", "fi-closed-set", "fi-family", "commit-once", "budget-probe"]
                .includes(
                    p.mode,
                )
        ) {
            assert(
                !record.unexpectedTaxACK,
                "Unexpected acknowledged command requires reconciliation",
            );
        }
        if (p.mode !== "disarm-owned") {
            assert(!root.state.activeFault && !root.state.blockedObservation);
        }
        if (
            ["prepare-only", "fi-closed-set", "fi-family", "commit-once", "budget-probe"]
                .includes(
                    p.mode,
                )
        ) {
            assert(
                !record.sweep?.finalSuccess,
                "Already committed Tax never POSTed",
            );
        }
        let prepared = null;
        if (p.mode === "prepare-only") {
            assert.equal(
                record.taxPreparation,
                null,
                "Preparation is one-shot; inspect its original instead of issuing a new one",
            );
        } else {
            prepared = json118(p.prepared15);
            samePin118(record.taxPreparation.artifact, p.prepared15);
            for (const k of ["body", "packets", "facts", "inventory"]) {
                assert.deepEqual(prepared[k], record.taxPreparation[k]);
            }
            assert.equal(hash(prepared.body), p.bodySHA256);
            assert.deepEqual(json118(p.fullInventory), prepared.inventory);
            if (budgetEntry === null) assertContinuation121(root,manifest,record,p);
            else assertBudgetPreparation118(root,manifest,p,ticket);
        }
        const boot = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8")
                .trim(),
            cap = Object.freeze(Object.create(null)),
            d = {
                root,
                ctx: budgetEntry === null ? restrictContext118(root) : null,
                nativeBudget: budgetEntry !== null,
                originalRecord: budgetEntry === null ? null : freeze118(structuredClone(record)),
                budgetFailed: false,
                budgetActorBefore: null,
                budgetActorAfter: null,
                budgetAuth3: [],
                p: freeze118(p),
                inputPin: freeze118({ ...inputPin }),
                reviewPin: freeze118({ ...reviewPin }),
                review: freeze118(review),
                manifest: freeze118(manifest),
                registry: freeze118(reg),
                plan: freeze118(facts.plan),
                verifiedRuntime:facts.verifiedRuntime,
                legacy: freeze118(legacy),
                prepared,
                h: await helpers(),
                build: await import(
                    pathToFileURL(
                        F118.win +
                            "/tools/rust-r4ghi/source15-admission119/build-source15.mjs",
                    ).href
                ),
                comparisonBaseline: freeze118(
                    json118(root.state.schemaComparison108.comparisonBaseline),
                ),
                parent: freeze118(structuredClone(parent(root.state))),
                pid: process.pid,
                boot,
                lockSHA,
                cursor: 0,
                keys: freeze118(
                    prepared ? prepared.inventory.map((x) => x.key) : [],
                ),
                frame: null,
                domainSent: false,
                closed: false,
                startedAt: new Date().toISOString(),
                entryGuard: null,
                exitGuard: null,
                ledgers: [],
            };
        caps.set(cap, d);
        if (d.nativeBudget) { d.cap = cap; budgetRoots118.set(root, d); }
        openingCap = cap;
        currentFiles(d, ticket);
        if (p.mode === "fi-closed-set") {
            assertClosedSet118(
                prepared.inventory,
                json118(p.approvedClosedFISet),
                {
                    prepared: p.prepared15,
                    fullInventory: p.fullInventory,
                    bodySHA256: p.bodySHA256,
                },
            );
        }
        const ownershipState = root.artifact(
                root.next("tax118-entry-ownership") + ".json",
                root.state,
            ),
            ownershipLogPrefix = root.artifact(
                root.next("tax118-entry-ownership-log") + ".jsonl",
                fs.existsSync(priv + "/ownership.jsonl")
                    ? fs.readFileSync(priv + "/ownership.jsonl")
                    : Buffer.alloc(0),
            );
        d.entryGuard = root.artifact(
            root.next("tax118-entry-guard") + ".json",
            {
                kind: "actual-native15-tax118-entry",
                phase: "entry-verified",
                epoch: F118.epoch,
                run: F118.run,
                current15: currentTuple118(cap, ticket),
                nonce: p.nonce,
                pid: process.pid,
                bootId: boot,
                input: inputPin,
                exactReview: reviewPin,
                ownershipState,
                ownershipLogPrefix,
                executionSources: p.executionSources,
                completion: null,
                sidecar: null,
            },
        );
        invocationJournal118(cap);
        return cap;
    } catch (primary) {
        if (budgetEntry !== null) {
            const d = budgetRoots118.get(root);
            if (d) d.budgetFailed = true;
            throw primary; // Native owns the single close latch, including failed entry.
        }
        try {
            if (openingCap) {
                primary.openFailure = {
                    phase: "open-failed-after-private-capability-allocation",
                    actualConstructorReturned: true,
                    capabilityReturned: false,
                    closed: await closeInvocation118(openingCap, null, {
                        failed: true,
                    }),
                };
            } else {
                closeFailedOpen118(
                    root,
                    native,
                    reg,
                    p,
                    inputPin,
                    reviewPin,
                    primary,
                );
            }
        } catch (exitError) {
            primary.bookendError ??= exitError.message;
            primary.openFailure ??= {
                phase: "open-failed-exit-error-preserve",
                actualConstructorReturned: true,
                capabilityReturned: false,
                exitError: exitError.message,
            };
            primary.openFailure.exitEvidenceError ??= exitError.message;
        }
        throw primary;
    }
}
export function currentTuple118(cap, ticket = null) {
    const d = live(cap), c = d.manifest.current;
    if (d.nativeBudget) budgetNative121.assertBudgetProbeDispatch121(d.root, ticket);
    return {
        namespace: d.root.namespace,
        epoch: d.root.epoch,
        run: d.root.run,
        marker: d.root.state.marker,
        prefix: d.root.state.prefix,
        api: d.root.api,
        apiProcess: c.apiProcess,
        binarySHA256: c.binarySHA256,
        codeAdmission15: c.codeAdmission15,
        candidate: c.candidate,
        sourcePins: d.p.actualSourcePins,
        sourcePinsSHA256: c.sourcePinsSHA256,
        helperPins: c.helperPins,
        runtimeBindings: d.p.runtimeBindings,
        bodySHA256: d.p.bodySHA256,
        runtimeAdmission121:c.runtimeAdmission121,
        runtimeReference121:d.nativeBudget ? budgetNative121.budgetRuntimeReference121(d.root,ticket,d.verifiedRuntime) : runtimeReference121(d.root,d.verifiedRuntime),
    };
}
// This bound link is data only. It does not perform or authorize a current
// check; effects must pass their explicit complete checkpoint/currentFiles.
function runtimeLink118(d) {
    const b = d.verifiedRuntime;
    return freeze118(structuredClone({
        kind: "actual-runtime-lease-reference121", protocolVersion: 1,
        runtimeAdmission121: b.authorityPin, candidate: b.current.candidate,
        baseCodeRegistry: b.code.registryPin, baseCodeCandidate: b.code.candidatePin,
        apiProcess: b.current.apiProcess, sourcePins: b.current.sourcePins,
        sourcePinsSHA256: b.current.sourcePinsSHA256,
        compilePins: b.current.compilePins, helperPins: b.current.helperPins,
    }));
}
export function runtime118(cap) {
    const d = live(cap);
    assert(!d.nativeBudget, "Budget capability exposes no Root, helpers or general methods");
    return Object.freeze({
        ctx: d.ctx,
        p: d.p,
        inputPin: d.inputPin,
        reviewPin: d.reviewPin,
        manifest: d.manifest,
        registry: d.registry,
        legacy: d.legacy,
        prepared: d.prepared ? freeze118(structuredClone(d.prepared)) : null,
        h: d.h,
        comparisonBaseline: d.comparisonBaseline,
        cursor: d.cursor,
        keys: d.keys,
        frame: d.frame ? freeze118(structuredClone(d.frame)) : null,
        entryGuard: d.entryGuard,
        boot: d.boot,
        runtimeReference121:runtimeLink118(d),
    });
}
export function checkpoint118(cap, phase, ticket = null) {
    const d = live(cap);
    if (d.nativeBudget) {
        budgetNative121.assertBudgetProbeDispatch121(d.root, ticket);
        assert(!d.root.state.activeFault, "Budget checkpoints require activeFault=false");
    }
    assert(typeof phase === "string" && phase);
    currentTaxFiles118(d);
    if (d.root.state.activeFault) {
        const a = d.root.state.activeFault;
        assert.equal(a.kind, F118.faultKind);
        samePin118(a.runtimeBindings, d.p.runtimeBindings);
        samePin118(a.codeAdmission15, d.p.codeAdmission15);
        samePin118(a.apiProcess, d.p.apiProcess);
        assert.equal(a.bindingSHA256, hash(d.manifest));
        samePin118(a.runtimeAdmission121,d.manifest.current.runtimeAdmission121);
        assert.deepEqual(a.scope, d.root.state.taxContinuation121.sweep?.scope);
    }
    return {
        nonce: d.p.nonce,
        phase,
        cursor: d.cursor,
        pid: d.pid,
        boot: d.boot,
        runtimeReference121:freeze118(structuredClone(d.nativeBudget ? budgetNative121.budgetRuntimeReference121(d.root,ticket,d.verifiedRuntime) : runtimeReference121(d.root,d.verifiedRuntime))),
    };
}
export function savePreparation118(cap, value) {
    const d = live(cap);
    assert.equal(d.p.mode, "prepare-only");
    assert.equal(d.root.state.taxContinuation121.taxPreparation, null);
    assert.equal(value.postconditions, "prepared-for-Root-review-only");
    d.root.state.taxContinuation121.taxPreparation = structuredClone(value);
    d.root.persist();
}
export function noteLedger118(cap, pin) {
    const d = live(cap);
    pin118(pin);
    read118(pin);
    d.ledgers.push({ ...pin });
}
export function beginFamily118(cap, key) {
    const d = live(cap);
    assert(["fi-closed-set", "fi-family"].includes(d.p.mode));
    assert.equal(d.keys[d.cursor], key);
    assert(
        !d.frame && !d.root.state.activeFault &&
            !d.root.state.taxContinuation121.pendingTaxTrial,
    );
    d.frame = {
        stage: "ready",
        cursor: d.cursor,
        key,
        bodySHA256: d.p.bodySHA256,
    };
    invocationJournal118(cap).families.push(structuredClone(d.frame));
    d.root.persist();
    return freeze118(structuredClone(d.frame));
}
export function stage118(cap, event) {
    const d = live(cap);
    assert(d.frame);
    d.frame = transition118(d.frame, event);
    invocationJournal118(cap).families.push(structuredClone(d.frame));
    d.root.persist();
    return freeze118(structuredClone(d.frame));
}
export function advanceFamily118(cap, observation) {
    const d = live(cap);
    assert.equal(d.frame?.stage, "familyVerified");
    assert(
        !d.root.state.activeFault &&
            !d.root.state.taxContinuation121.pendingTaxTrial,
    );
    pin118(observation);
    const f = d.root.state.taxContinuation121.sweep.failures;
    assert.equal(f[d.cursor]?.key, d.keys[d.cursor]);
    samePin118(f[d.cursor].observation, observation);
    read118(observation);
    d.root.persist();
    d.cursor++;
    d.frame = null;
    return d.cursor;
}
export function setVerifiedPrefix118(cap, length) {
    const d = live(cap);
    assert.equal(d.p.mode, "fi-family");
    assert.equal(d.cursor, 0);
    assert(!d.frame);
    assert.equal(length, d.root.state.taxContinuation121.sweep.failures.length);
    assert.equal(length, d.p.approvedStartCursor);
    samePin118(d.review.approvedCompletedPrefix, d.p.approvedCompletedPrefix);
    const prefix = json118(d.p.approvedCompletedPrefix);
    assert.deepEqual(
        prefix.failures,
        d.root.state.taxContinuation121.sweep.failures,
    );
    assert.equal(prefix.inventorySHA256, hash(d.prepared.inventory));
    d.cursor = length;
}
export function invocationJournal118(cap) {
    const d = live(cap),
        all = d.root.state.consumerChecks ??= {},
        journal = all.taxInvocation121 ??= {
            kind: "actual-Tax15-external-invocations118",
            invocations: {},
        },
        n = d.p.nonce;
    let r = journal.invocations[n];
    if (!r) {
        r = {
            kind: "actual-Tax15-invocation118",
            epoch: F118.epoch,
            run: F118.run,
            nonce: n,
            pid: d.pid,
            bootId: d.boot,
            mode: d.p.mode,
            input: d.inputPin,
            exactReview: d.reviewPin,
            codeReview: d.p.codeReview,
            executionSources: d.p.executionSources.filter((p) =>
                EXECUTOR_NAMES118.includes(path.posix.basename(p.file))
            ),
            prepareFactsSources: d.p.executionSources.filter((p) =>
                PREPARE_NAMES118.includes(path.posix.basename(p.file))
            ),
            entryGuard: d.entryGuard,
            startedAt: d.startedAt,
            families: [],
            httpAttempts: [],
            phase: "running",
        };
        journal.invocations[n] = r;
        d.root.persist();
    }
    assert.equal(r.pid, d.pid);
    assert.equal(r.bootId, d.boot);
    assert.equal(r.mode, d.p.mode);
    samePin118(r.input, d.inputPin);
    samePin118(r.exactReview, d.reviewPin);
    return r;
}
export function domainPermission118(
    cap,
    { operationId, expectedStatus, bodySHA256 },
) {
    const d = live(cap);
    assert.equal(operationId, F118.operation);
    assert.equal(bodySHA256, d.p.bodySHA256);
    assert(!d.domainSent);
    if (expectedStatus === 500) {
        assert(["fi-closed-set", "fi-family"].includes(d.p.mode));
        assert.equal(d.frame?.stage, "controlsInstalled");
        assert.equal(
            d.root.state.taxContinuation121.pendingTaxTrial?.key,
            d.frame.key,
        );
    } else {
        assert.equal(expectedStatus, 201);
        assert.equal(d.p.mode, "commit-once");
        assert.equal(d.review.normalTaxPOSTGranted, true);
        assert(d.root.state.taxContinuation121.normalTaxPending);
        assert(!d.root.state.taxContinuation121.sweep.finalSuccess);
    }
    d.domainSent = true;
}
export function resetDomainSlot118(cap) {
    const d = live(cap);
    assert(!d.frame && !d.root.state.activeFault);
    d.domainSent = false;
}
// Failure evidence uses the already-owned invocation namespace, never next().
function writeFailedBookend118(d, result, error) {
    const priv = F118.private + "/business/" + F118.epoch + "/" + F118.run;
    assert.equal(d.root.priv, priv);
    assert.equal(d.pid, process.pid);
    assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(d.p.nonce));
    const directory = priv + "/tax118-invocation-" + d.p.nonce;
    const st = fs.lstatSync(directory);
    assert(st.isDirectory() && !st.isSymbolicLink());
    assert.equal(fs.realpathSync(directory), directory);
    const intentPin = {
        file: directory + "/intent.json",
        rawBytesSha256: sha118(fs.readFileSync(directory + "/intent.json")),
    };
    const intent = json118(intentPin);
    assert.equal(intent.kind, "actual-Tax15-invocation118-intent");
    samePin118(intent.input, d.inputPin);
    samePin118(intent.exactReview, d.reviewPin);
    assert.equal(intent.pid, d.pid);
    assert.equal(intent.nonce, d.p.nonce);
    assert.equal(intent.mode, d.p.mode);
    const value = {
        kind: "tax118-bookend-failed-preserve-effects",
        nonce: d.p.nonce,
        mode: d.p.mode,
        pid: d.pid,
        input: d.inputPin,
        exactReview: d.reviewPin,
        ownerIntent: intentPin,
        result: result ?? null,
        error: error.message,
        activeFault: d.root.state.activeFault ?? null,
        normalMayAlreadyBeCommitted: Boolean(
            d.root.state.taxContinuation121.sweep?.finalSuccess,
        ),
        replayForbidden: true,
    };
    const file = directory + "/failed-bookend.json";
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n");
    fs.writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
    const evidence = { file, bytes: bytes.length, rawBytesSha256: sha118(bytes) };
    read118(evidence);
    return evidence;
}

export async function closeInvocation118(cap, result, { failed = false } = {}, ticket = null) {
    const d = live(cap);
    if (d.nativeBudget) budgetNative121.assertBudgetProbeDispatch121(d.root, ticket);
    let bookendError;
    try {
        try {
            currentFiles(d, ticket);
        } catch (e) {
            bookendError = e;
        }
        try {
            const native = await import(
                pathToFileURL(
                    F118.win +
                        "/tools/rust-r4ghi/business/runtime-admission121.mjs",
                ).href
            );
            d.verifiedRuntime=d.nativeBudget
                ? native.budgetAssertRuntimeBinding121(d.root,ticket,{runtimeAdmission121:d.manifest.current.runtimeAdmission121,candidate:d.p.candidate})
                : native.assertRuntimeBinding121(d.root,{runtimeAdmission121:d.manifest.current.runtimeAdmission121,candidate:d.p.candidate});
        } catch (e) {
            bookendError ??= e;
        }
        if (bookendError) throw bookendError;
        readRetainedTaxProof118(d.root, d.manifest, d.registry, ticket);
        if (d.nativeBudget) assertBudgetPreparation118(d.root,d.manifest,d.p,ticket);
        const current15 = currentTuple118(cap, ticket);
        d.exitGuard = d.root.artifact(
            d.root.next("tax118-exit-guard") + ".json",
            {
                kind: "actual-native15-tax118-exit",
                phase: "exit-verified",
                epoch: F118.epoch,
                run: F118.run,
                current15,
                nonce: d.p.nonce,
                pid: d.pid,
                bootId: d.boot,
                input: d.inputPin,
                result: result ?? null,
                failed,
                entryGuard: d.entryGuard,
                activeControlsRetained: Boolean(d.root.state.activeFault),
                completion: null,
                sidecar: null,
            },
        );
        const journal = invocationJournal118(cap);
        journal.phase = failed ? "closed-failed" : "closed-verified";
        journal.current15 = current15;
        journal.result = result ?? null;
        journal.exitGuard = d.exitGuard;
        journal.endedAt = new Date().toISOString();
        journal.commandLedgers = d.ledgers;
        journal.completion = null;
        journal.sidecar = null;
        d.root.persist();
        const closed = d.root.artifact(
            d.root.next("tax118-closed-journal") + ".json",
            journal,
        );
        if (d.nativeBudget) d.actualClosedJournal = closed;
        journal.closedJournal = closed;
        d.root.persist();
        if(!failed && d.p.mode==="prepare-only")publishPreparationContinuation121(d,result,closed,current15);
        if (!failed && d.p.mode === "commit-once") {
            await publishCompleted118(d, result, closed, current15);
        }
        return {
            exitGuard: d.exitGuard,
            closedJournal: closed,
            result: result ?? null,
        };
    } catch (e) {
        bookendError = e;
        const primary = d.nativeBudget ? Error("Budget full close failed; preserve existing private evidence") : e;
        if (d.nativeBudget) Object.defineProperty(primary, "budgetCloseFacts", {value:{exitGuard:d.exitGuard ?? null,closedJournal:d.actualClosedJournal ?? null,result:result ?? null}});
        if (d.nativeBudget) {
            try {
                const r = invocationJournal118(cap);
                r.phase = "failed-preserve";
                r.error = primary.message;
                d.root.persist();
                writeFailedBookend118(d, result, primary);
            } catch { /* A secondary evidence-write failure must not replace the already observed close facts. */ }
            throw primary;
        }
        const r = invocationJournal118(cap);
        r.phase = "failed-preserve";
        r.error = primary.message;
        d.root.persist();
        writeFailedBookend118(d, result, primary);
        throw primary;
    } finally {
        d.closed = true;
        caps.delete(cap);
        if (d.nativeBudget) budgetRoots118.delete(d.root);
    }
}
async function publishCompleted118(d, normalResult, closedJournal, current15) {
    const root = d.root,
        record = root.state.taxContinuation121,
        sweep = record.sweep;
    assert(
        !root.state.activeFault && !root.state.blockedObservation &&
            !record.pendingTaxTrial && !record.normalTaxPending,
    );
    assert.equal(sweep.finalSuccess?.postconditions, "verified");
    assert.equal(record.complete, null);
    assert.equal(record.sidecar, null);
    pin118(normalResult);
    const normal = json118(normalResult);
    assert.deepEqual(normal.finalSuccess, sweep.finalSuccess);
    assert.deepEqual(normal.postconditions, sweep.finalSuccess.semantics);
    root.persist();
    const ownershipState = root.artifact(
            root.next("tax118-after-verified-state") + ".json",
            root.state,
        ),
        state = json118(ownershipState),
        ownershipLog = root.artifact(
            root.next("tax118-after-verified-ownership") + ".jsonl",
            fs.readFileSync(root.priv + "/ownership.jsonl"),
        );
    const frame = root.artifact(
        root.next("tax118-after-verified-frame") + ".json",
        {
            kind:
                "actual-Source15-runtime121-Tax118-after-verified-ownership-journal-frame",
            schemaVersion: 2,
            namespace: F118.namespace,
            epoch: F118.epoch,
            run: F118.run,
            sourceGeneration: 15,
            marker: root.state.marker,
            prefix: root.state.prefix,
            sequenceAtSnapshot: state.sequence,
            current15,
            ownershipState,
            ownershipLog,
            observation: sweep.finalSuccess.after,
            commandLedgers: d.ledgers,
            normalResult,
            fiCompletion: sweep.fiComplete,
            entryGuard: d.entryGuard,
            exitGuard: d.exitGuard,
            closedJournal,
            retainedPreparation15:record.retainedPreparation15,
            continuation121:record.continuation121,
        },
    );
    sweep.afterVerifiedFrame = frame;
    const envelope = {
        kind: "actual-Source15-runtime121-retained-tax-consumer-complete",
        schemaVersion:2,
        runtimeAdmission121:d.manifest.current.runtimeAdmission121,
        runtimeReference121:current15.runtimeReference121,
        retainedSource15State:record.retainedSource15State,
        retainedPreparation15:record.retainedPreparation15,
        continuation121:record.continuation121,
        continuationReadback:record.continuationReadback,
        requiredSweepKind: F118.faultKind,
        sourceGeneration: 15,
        consumerEpoch: F118.epoch,
        producerEpoch: "g2-business12",
        sourcePinsSHA256: d.manifest.current.sourcePinsSHA256,
        apiProcess: d.p.apiProcess,
        codeAdmission15: d.p.codeAdmission15,
        candidate: d.p.candidate,
        runtimeBindings: d.p.runtimeBindings,
        retainedProducerRecordsEdited: false,
        originalProducer12: record.originalProducer12,
        retainedParent14: record.retainedParent14,
        retainedMain13: record.retainedMain13,
        fiComplete: true,
        fiCompletionProof: sweep.fiComplete,
        scope: sweep.scope,
        inventory: sweep.inventory,
        bodySHA256: sweep.bodySHA256,
        failures: sweep.failures,
        finalSuccess: sweep.finalSuccess,
        finalPostconditions: "verified",
        afterVerifiedFrame: frame,
    };
    const completion = root.artifact(
            root.next("tax15-completion") + ".json",
            envelope,
        ),
        invocations = Object.values(
            root.state.consumerChecks.taxInvocation121.invocations,
        ).filter((i) =>
            ["prepare-only", "fi-closed-set", "fi-family", "commit-once", "budget-probe"]
                .includes(i.mode) &&
            (i.phase === "closed-verified" ||
                i.phase === "closed-failed" &&
                    ["fi-closed-set", "fi-family"].includes(i.mode))
        ).map((i) => structuredClone(i));
    const sidecar = root.artifact(
        root.next("tax118-execution-sidecar") + ".json",
        {
            kind: "actual-Source15-runtime121-Tax118-execution-sidecar",
            schemaVersion: 2,
            runtimeReference121:current15.runtimeReference121,
            runtimeAdmission121:d.manifest.current.runtimeAdmission121,
            retainedSource15State:record.retainedSource15State,
            retainedPreparation15:record.retainedPreparation15,
            continuation121:record.continuation121,
            continuationReadback:record.continuationReadback,
            namespace: F118.namespace,
            epoch: F118.epoch,
            run: F118.run,
            sourceGeneration: 15,
            completion,
            fiCompletion: sweep.fiComplete,
            runtimeBindings: d.p.runtimeBindings,
            codeAdmission15: d.p.codeAdmission15,
            candidate: d.p.candidate,
            apiProcess: d.p.apiProcess,
            sourcePins: d.p.actualSourcePins,
            helperPins: d.p.actualHelperPins,
            sourcePinsSHA256: d.manifest.current.sourcePinsSHA256,
            bodySHA256: sweep.bodySHA256,
            scopeSHA256: hash(sweep.scope),
            inventorySHA256: hash(sweep.inventory),
            executionSources: d.p.executionSources.filter((p) =>
                EXECUTOR_NAMES118.includes(path.posix.basename(p.file))
            ),
            prepareFactsSources: d.p.executionSources.filter((p) =>
                PREPARE_NAMES118.includes(path.posix.basename(p.file))
            ),
            codeReview: d.p.codeReview,
            technicalG1: d.p.technicalG1,
            invocations,
            familyResults: sweep.failures,
            normalSuccess: sweep.finalSuccess,
            verification: normalResult,
            oldProducerRecordsEdited: false,
            G3: false,
            G4: false,
            afterVerifiedFrame: frame,
        },
    );
    // F -> C -> S -> current metadata. No output overwrites and no future links
    // exist in F, its immutable state, or its required closed command journal.
    record.complete = completion;
    record.sidecar = sidecar;
    root.persist();
}

export async function verifyPublishedInvocation121(cap){
 const d=live(cap);assert.equal(d.p.mode,'verify-committed');currentFiles(d);const record=d.root.state.taxContinuation121;pin118(record.complete);pin118(record.sidecar);const reader=await import(pathToFileURL(F118.win+'/tools/rust-r4ghi/tax15-readonly/runtime15.mjs').href);const c=d.manifest.current,proof=reader.assertTax15Envelope(d.root,{sourcePins:d.p.actualSourcePins,sourcePinsSHA256:c.sourcePinsSHA256,sourceCount:c.sourceCount,helperPins:c.helperPins,helperCount:c.helperCount,helperSources:c.helperSources,apiProcess:c.apiProcess,binarySHA256:c.binarySHA256,codeAdmission15:c.codeAdmission15,candidate:c.candidate,taxRuntimeBindings:d.p.runtimeBindings,taxCompletion:record.complete});currentFiles(d);return d.root.artifact(d.root.next('tax121-published-readback')+'.json',{kind:'actual-runtime121-published-Tax-completion-readback',runtimeAdmission121:c.runtimeAdmission121,completion:record.complete,sidecar:record.sidecar,afterVerifiedFrame:proof.envelope.afterVerifiedFrame,historicalOwnershipFromImmutableFrame:true,currentOwnedLatestUsed:false,newHTTP:false});
}

// Only Native's current, non-escaping dispatch ticket reaches these functions.
// The runner receives the six-method port, never this Root or the private cap.
function budgetData118(root, ticket) {
    budgetNative121.assertBudgetProbeDispatch121(root, ticket);
    const d = budgetRoots118.get(root);
    assert(d && d.nativeBudget && !d.closed, "Live Native-owned budget invocation required");
    assert.equal(d.root, root);
    live(d.cap);
    return d;
}
function assertBudgetPreparation118(root, manifest, p, ticket) {
    budgetNative121.assertBudgetProbeDispatch121(root, ticket);
    const adoption = json118(manifest.prepareAdoption121);
    assert.deepEqual(Object.keys(adoption).sort(), ["kind","schemaVersion","purpose","prepareOrigin121","current","semantics"].sort());
    assert.equal(adoption.kind, "Root-runtime121-successful-prepare-adoption");
    assert.equal(adoption.schemaVersion, 1);
    assert.equal(adoption.purpose, "budget-probe");
    assert.deepEqual(adoption.semantics, {freshPreparation:false,newK:false,actualContextObserved:false,FIOrNormalGranted:false});
    samePin118(adoption.current.registry, manifest.current.runtimeAdmission121);
    samePin118(adoption.current.candidate, p.candidate);
    const origin = json118(adoption.prepareOrigin121);
    assert.deepEqual(Object.keys(origin).sort(), ["kind","schemaVersion","state","ownership","recordPointer","continuation121","continuationReadback"].sort());
    assert.equal(origin.kind, "Root-runtime121-successful-prepare-origin");
    assert.equal(origin.schemaVersion, 1);
    assert.equal(origin.recordPointer, "/taxContinuation121");
    const original = json118(origin.state).taxContinuation121;
    assert.deepEqual(root.state.taxContinuation121, original, "Never rewrite the successful birth record");
    read118(origin.ownership);
    samePin118(original.continuation121, origin.continuation121);
    read118(origin.continuationReadback); // independent carrier; do not fill the old nullable slot
    const k = json118(origin.continuation121);
    assert.equal(k.kind, "actual-Source15-runtime121-prepare-continuation-verified");
    samePin118(k.runtimeAdmission121, original.runtimeAdmission121);
    samePin118(k.prepared15, p.prepared15);
    samePin118(k.fullInventory, p.fullInventory);
    assert.equal(k.bodySHA256, p.bodySHA256);
    assertPreparationContinuationData121(original, manifest);
    for (const name of ["entryGuard","exitGuard","closedJournal"]) read118(k[name]);
    assert.equal(json118(k.closedJournal).phase, "closed-verified");
    return adoption;
}
export async function openBudgetInvocation118(root, ticket, inputPin, reviewPin) {
    budgetNative121.assertBudgetProbeDispatch121(root, ticket);
    assert(!budgetOpening118.has(root), "Native budget entry cannot be repeated");
    budgetOpening118.set(root, {inputPin:freeze118({...inputPin}),reviewPin:freeze118({...reviewPin})});
    await openInvocationBody118(inputPin, reviewPin, {root, ticket});
    const d = budgetData118(root, ticket);
    return freeze118(structuredClone({
        currentFrame: currentTuple118(d.cap, ticket),
        entryGuard: d.entryGuard,
        prepareAdoption121: d.manifest.prepareAdoption121,
    }));
}
export function budgetInvocationFacts118(root, ticket) {
    const d = budgetData118(root, ticket);
    return freeze118(structuredClone({
        p:d.p, inputPin:d.inputPin, reviewPin:d.reviewPin, manifest:d.manifest,
        registry:d.registry, legacy:d.legacy, prepared:d.prepared,
        comparisonBaseline:d.comparisonBaseline, entryGuard:d.entryGuard,
        runtimeReference121:runtimeLink118(d),
    }));
}
export function budgetWireCheckpoint118(root, ticket, phase) {
    const d = budgetData118(root, ticket);
    assert(["wire-bind","HTTP-before","HTTP-reference-before-wire","HTTP-ACK-preserved-postguard","HTTP-after"].includes(phase));
    return checkpoint118(d.cap, phase, ticket);
}
export function budgetRecordHttp118(root, ticket, record) {
    const d = budgetData118(root, ticket);
    assert.deepEqual(Object.keys(record).sort(), ["http","ledger","before","after"].sort());
    for (const pin of Object.values(record)) read118(pin);
    d.ledgers.push(structuredClone(record.ledger));
    invocationJournal118(d.cap).httpAttempts.push(structuredClone(record));
    root.persist();
}
export async function authenticateBudgetInvocation118(root, ticket) {
    const d = budgetData118(root, ticket);
    assert.equal(d.budgetAuth3.length, 0);
    try {
        const wire = await import("./tax15-once-wire.mjs");
        d.budgetAuth3 = await wire.authenticateBudgetWire118(root, ticket);
        return freeze118(structuredClone(d.budgetAuth3));
    } catch (error) { d.budgetFailed = true; throw error; }
}
async function observeBudget118(root, ticket, slot) {
    const d = budgetData118(root, ticket);
    assert(!d[slot + "Attempted"], "Budget actor observation is one-shot");
    d[slot + "Attempted"] = true;
    try {
        const effects = await import("./tax15-once-effects.mjs");
        d[slot] = await effects.observeBudgetActor118(root, ticket);
        return freeze118(structuredClone(d[slot]));
    } catch (error) { d.budgetFailed = true; throw error; }
}
export async function guardBudgetBefore118(root, ticket) {
    return observeBudget118(root, ticket, "budgetActorBefore");
}
export function checkpointBudgetInvocation118(root, ticket) {
    const d = budgetData118(root, ticket);
    assert.equal(d.budgetActorBefore?.status, "VERIFIED");
    assert(!d.budgetCheckpointAttempted, "One designated complete base checkpoint only");
    d.budgetCheckpointAttempted = true;
    try {
        const value = checkpoint118(d.cap, "budget-base", ticket);
        d.budgetCheckpoint = freeze118(structuredClone(value));
        return value;
    } catch (error) { d.budgetFailed = true; throw error; }
}
export async function guardBudgetAfter118(root, ticket) {
    const d = budgetData118(root, ticket);
    assert(d.budgetCheckpoint);
    return observeBudget118(root, ticket, "budgetActorAfter");
}
export async function closeBudgetInvocation118(root, ticket, sample) {
    budgetNative121.assertBudgetProbeDispatch121(root, ticket);
    const d = budgetRoots118.get(root);
    if (!d) {
        const opening = budgetOpening118.get(root) ?? budgetNative121.budgetOpeningPins121(root,ticket);
        assert(opening, "No invented entry after a constructor failure");
        const p = assertInput118(json118(opening.inputPin));
        const primary = Error("Budget entry did not complete; preserve the one Native exit");
        try {
            closeFailedOpen118(root,budgetNative121,json118(p.codeAdmission15),p,opening.inputPin,opening.reviewPin,primary,ticket);
            return {exitGuard:null,closedJournal:null,result:null};
        }
        finally { budgetOpening118.delete(root); }
    }
    try {
        if (sample !== null) {
            assert.equal(sample.file, root.priv + "/tax118-invocation-" + d.p.nonce + "/budget-base-sample.json");
            const value = json118(sample);
            samePin118(value.input, d.inputPin);
            samePin118(value.exactReview, d.reviewPin);
            assert.deepEqual(value.checkpoint.value, d.budgetCheckpoint);
            assert.deepEqual(value.auth3, d.budgetAuth3);
        }
    } catch { sample = null; d.budgetFailed = true; }
    try {
        return await closeInvocation118(d.cap, sample, {failed:d.budgetFailed || sample === null}, ticket);
    }
    finally { budgetOpening118.delete(root); }
}
// The fresh preparation closes before K exists. K references the closed journal;
// no historical prepare, old failed invocation or current runtime JSON is edited.
export function assertPreparationContinuationData121(record,manifest){
 const old=json118(manifest.retainedPreparation15.prepared15),fresh=record.taxPreparation;
 assert(fresh);assert.equal(fresh.bodySHA256,manifest.retainedPreparation15.bodySHA256);assert.deepEqual(fresh.body,old.body);assert.deepEqual(fresh.facts,old.facts);assert.deepEqual(fresh.inventory,old.inventory);assert.deepEqual(json118(fresh.fullInventory),json118(manifest.retainedPreparation15.fullInventory));return fresh;
}
function publishPreparationContinuation121(d,result,closedJournal,current15){
 const r=d.root.state.taxContinuation121;assert.equal(r.continuation121,null);assertPreparationContinuationData121(r,d.manifest);samePin118(result,r.taxPreparation.artifact);const proof={kind:'actual-Source15-runtime121-prepare-continuation-verified',schemaVersion:1,runtimeAdmission121:d.manifest.current.runtimeAdmission121,current15,retainedPreparation15:r.retainedPreparation15,prepared15:r.taxPreparation.artifact,fullInventory:r.taxPreparation.fullInventory,bodySHA256:r.taxPreparation.bodySHA256,orderedFamilyKeys:r.taxPreparation.inventory.map(x=>x.key),entryGuard:d.entryGuard,exitGuard:d.exitGuard,closedJournal,originalFailureReplay:false,TaxCorrectionPOSTExecuted:false,FIExecuted:false,normalTaxPOSTExecuted:false};r.continuation121=d.root.artifact(d.root.next('tax121-prepare-continuation')+'.json',proof);d.root.persist();
}
function assertContinuation121(root,manifest,record,p){
 assertPreparationContinuationData121(record,manifest);const k=json118(record.continuation121);assert.equal(k.kind,'actual-Source15-runtime121-prepare-continuation-verified');samePin118(k.runtimeAdmission121,manifest.current.runtimeAdmission121);samePin118(k.prepared15,p.prepared15);samePin118(k.fullInventory,p.fullInventory);assert.equal(k.bodySHA256,p.bodySHA256);assert.deepEqual(k.retainedPreparation15,record.retainedPreparation15);for(const name of ['entryGuard','exitGuard','closedJournal'])read118(k[name]);assert.equal(json118(k.closedJournal).phase,'closed-verified');
 if(['fi-closed-set','fi-family'].includes(p.mode)){
  const authority=json118(p.mode==='fi-closed-set'?p.approvedClosedFISet:p.approvedRecovery);samePin118(authority.continuation121,record.continuation121);samePin118(authority.runtimeAdmission121,manifest.current.runtimeAdmission121);const review=json118(authority.continuationReadback);assert.equal(review.kind,'non-author-runtime121-prepare-continuation-readback');assert.equal(review.verdict,'approved-actual-prepare-continuation');assert.equal(review.reviewerIsAuthor,false);samePin118(review.continuation121,record.continuation121);samePin118(review.runtimeAdmission121,manifest.current.runtimeAdmission121);samePin118(review.prepared15,p.prepared15);samePin118(review.fullInventory,p.fullInventory);assert.equal(review.bodySHA256,p.bodySHA256);if(record.continuationReadback)samePin118(record.continuationReadback,authority.continuationReadback);else{record.continuationReadback=authority.continuationReadback;root.persist();}
 }else if(p.mode==='commit-once'){
  const fi=json118(p.approvedFICompletion);samePin118(fi.continuation121,record.continuation121);samePin118(fi.runtimeAdmission121,manifest.current.runtimeAdmission121);samePin118(fi.continuationReadback,record.continuationReadback);
 }
}
