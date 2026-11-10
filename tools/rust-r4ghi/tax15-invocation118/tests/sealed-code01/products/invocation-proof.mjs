// One invocation owns one unexported WeakMap capability. No signer accepts a
// supplied context, guard, callback, reader, phase override, or persisted token.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createContext, sourcePins } from "../business/context.mjs";
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
]);
const runtimeKeys = new Set([
    "sequence",
    "actors",
    "owned",
    "borrowed",
    "objects",
    "taxContinuation15",
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
    assert.equal(p.technicalG1.rawBytesSha256, F118.g1SHA);
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
    const cache = new WeakMap(),
        ro = (v) => {
            if (v === null || typeof v !== "object") {
                return typeof v === "function" ? undefined : v;
            }
            if (!cache.has(v)) cache.set(v, freeze118(structuredClone(v)));
            return cache.get(v);
        };
    const tax = new Proxy(root.state.taxContinuation15, {
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
            if (k === "taxContinuation15") return tax;
            if (typeof k !== "string") return undefined;
            return runtimeKeys.has(k) ? t[k] : ro(t[k]);
        },
        getOwnPropertyDescriptor(t, k) {
            const q = Reflect.getOwnPropertyDescriptor(t, k);
            return q
                ? {
                    ...q,
                    value: k === "taxContinuation15"
                        ? tax
                        : runtimeKeys.has(k)
                        ? q.value
                        : ro(q.value),
                }
                : q;
        },
        set(t, k, v) {
            assert(
                runtimeKeys.has(k) && k !== "taxContinuation15",
                "Immutable parent field",
            );
            return Reflect.set(t, k, v, t);
        },
        defineProperty() {
            throw Error("State descriptors protected");
        },
        deleteProperty(t, k) {
            assert(runtimeKeys.has(k) && k !== "taxContinuation15");
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
                value: ro(root[k]),
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
    assert(
        all.some((q) =>
            q.file === p.file && q.rawBytesSha256 === p.rawBytesSha256
        ),
    );
    const s = fs.lstatSync(p.file, { bigint: true });
    assert(s.isFile() && !s.isSymbolicLink());
    assert.equal(fs.realpathSync(p.file), p.file);
    assert.equal(s.dev.toString(), p.dev);
    assert.equal(s.ino.toString(), p.ino);
    assert.equal(Number(s.nlink), p.nlink);
    assert.equal(sha118(fs.readFileSync(p.file)), p.rawBytesSha256);
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
    for (const p of [d.plan.consumer.binary, d.plan.consumer.summaryBinary]) {
        binary(p, d.plan.consumer.binaryFiles);
    }
}
function currentFiles(d) {
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
        const q of [...d.p.executionSources, ...d.plan.tooling.executionSources]
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
    samePin118(d.root.state.codeEpochAdmission15.candidate, d.p.candidate);
    samePin118(d.root.state.apiProcess, d.p.apiProcess);
    apiIdentity(d);
}
function ensureRecord(root, manifest, reg, legacy, runtimePin) {
    const identity = {
        runtimeBindings: runtimePin,
        sourcePinsSHA256: manifest.current.sourcePinsSHA256,
        codeAdmission15: manifest.current.codeAdmission15,
        producerEpoch: manifest.legacy.epoch,
        producerSourcePinsSHA256: manifest.legacy.sourcePinsSHA256,
        producerProjectionSHA256: manifest.current.producerProjectionSHA256,
        originalProducerState12: manifest.legacy.originalProducerState12,
        reconciliation: manifest.legacy.reconciliation,
        retainedMainOriginal: legacy.retainedMain13.original,
    };
    if (root.state.taxContinuation15) {
        assert.deepEqual(root.state.taxContinuation15.identity, identity);
        return;
    }
    root.state.taxContinuation15 = {
        kind: "current-Source15-consumer-of-retained-real-tax-producer",
        identity,
        originalProducer12: manifest.legacy.originalProducerState12,
        retainedParent14: {
            producerState: reg.producerState,
            retentionIndex: reg.retentionIndex,
        },
        legacyReferences: {
            sourceProjectId: legacy.sourceProjectId,
            mainProjectId: legacy.mainProjectId,
            costId: legacy.costId,
            taxId: legacy.taxId,
            basisId: legacy.basisId,
            resultIds: legacy.resultIds,
            producerState: legacy.producerStatePin,
        },
        retainedMain13: legacy.retainedMain13,
        mainCompletion: legacy.retainedMain13.record,
        taxPreparation: null,
        sweep: null,
        complete: null,
        sidecar: null,
    };
    root.persist();
}
export async function openInvocation118(inputPin, reviewPin) {
    assert.equal(process.platform, "linux");
    assert.equal(process.version, "v24.19.0");
    assert.equal(process.execArgv.length, 0);
    assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
    const p = assertInput118(json118(inputPin)),
        review = json118(reviewPin),
        code = json118(p.codeReview);
    assert.equal(code.kind, "non-author-Tax15-invocation118-code-review");
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
            F118.win + "/tools/rust-r4ghi/business/source15-admission.mjs",
        ).href
    );
    const root = createContext({
        epoch: F118.epoch,
        run: F118.run,
        "api-process-record": p.apiProcess.file,
    }); // one real native entry through consumer-admission54
    assert.deepEqual(root.state, JSON.parse(entry));
    const reg = json118(p.codeAdmission15),
        facts = assertRuntimeFacts118(root, manifest, reg),
        legacy = readRetainedTaxProof118(root, manifest, reg);
    samePin118(p.actualSourcePins, reg.consumer.sourcePins);
    samePin118(p.actualCompilePins, reg.consumer.compilePins);
    samePin118(p.actualHelperPins, reg.consumer.helperPins);
    ensureRecord(root, manifest, reg, legacy, p.runtimeBindings);
    const record = root.state.taxContinuation15;
    assert(
        !record.pendingMain,
        "Main is inherited only; no pending Main continuation",
    );
    if (
        ["prepare-only", "fi-closed-set", "fi-family", "commit-once"].includes(
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
        ["prepare-only", "fi-closed-set", "fi-family", "commit-once"].includes(
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
        ["prepare-only", "fi-closed-set", "fi-family", "commit-once"].includes(
            p.mode,
        )
    ) assert(!record.sweep?.finalSuccess, "Already committed Tax never POSTed");
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
    }
    const boot = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8")
            .trim(),
        cap = Object.freeze(Object.create(null)),
        d = {
            root,
            ctx: restrictContext118(root),
            p: freeze118(p),
            inputPin: freeze118({ ...inputPin }),
            reviewPin: freeze118({ ...reviewPin }),
            review: freeze118(review),
            manifest: freeze118(manifest),
            registry: freeze118(reg),
            plan: freeze118(facts.plan),
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
    currentFiles(d);
    if (p.mode === "fi-closed-set") {
        assertClosedSet118(prepared.inventory, json118(p.approvedClosedFISet), {
            prepared: p.prepared15,
            fullInventory: p.fullInventory,
            bodySHA256: p.bodySHA256,
        });
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
    d.entryGuard = root.artifact(root.next("tax118-entry-guard") + ".json", {
        kind: "actual-native15-tax118-entry",
        phase: "entry-verified",
        epoch: F118.epoch,
        run: F118.run,
        current15: currentTuple118(cap),
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
    });
    invocationJournal118(cap);
    return cap;
}
export function currentTuple118(cap) {
    const d = live(cap), c = d.manifest.current;
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
    };
}
export function runtime118(cap) {
    const d = live(cap);
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
    });
}
export function checkpoint118(cap, phase) {
    const d = live(cap);
    assert(typeof phase === "string" && phase);
    currentFiles(d);
    if (d.root.state.activeFault) {
        const a = d.root.state.activeFault;
        assert.equal(a.kind, F118.faultKind);
        samePin118(a.runtimeBindings, d.p.runtimeBindings);
        samePin118(a.codeAdmission15, d.p.codeAdmission15);
        samePin118(a.apiProcess, d.p.apiProcess);
        assert.equal(a.bindingSHA256, hash(d.manifest));
        assert.deepEqual(a.scope, d.root.state.taxContinuation15.sweep?.scope);
    }
    return {
        nonce: d.p.nonce,
        phase,
        cursor: d.cursor,
        pid: d.pid,
        boot: d.boot,
    };
}
export function savePreparation118(cap, value) {
    const d = live(cap);
    assert.equal(d.p.mode, "prepare-only");
    assert.equal(d.root.state.taxContinuation15.taxPreparation, null);
    assert.equal(value.postconditions, "prepared-for-Root-review-only");
    d.root.state.taxContinuation15.taxPreparation = structuredClone(value);
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
            !d.root.state.taxContinuation15.pendingTaxTrial,
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
            !d.root.state.taxContinuation15.pendingTaxTrial,
    );
    pin118(observation);
    const f = d.root.state.taxContinuation15.sweep.failures;
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
    assert.equal(length, d.root.state.taxContinuation15.sweep.failures.length);
    assert.equal(length, d.p.approvedStartCursor);
    samePin118(d.review.approvedCompletedPrefix, d.p.approvedCompletedPrefix);
    const prefix = json118(d.p.approvedCompletedPrefix);
    assert.deepEqual(
        prefix.failures,
        d.root.state.taxContinuation15.sweep.failures,
    );
    assert.equal(prefix.inventorySHA256, hash(d.prepared.inventory));
    d.cursor = length;
}
export function invocationJournal118(cap) {
    const d = live(cap),
        all = d.root.state.consumerChecks ??= {},
        journal = all.tax15Invocation118 ??= {
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
            d.root.state.taxContinuation15.pendingTaxTrial?.key,
            d.frame.key,
        );
    } else {
        assert.equal(expectedStatus, 201);
        assert.equal(d.p.mode, "commit-once");
        assert.equal(d.review.normalTaxPOSTGranted, true);
        assert(d.root.state.taxContinuation15.normalTaxPending);
        assert(!d.root.state.taxContinuation15.sweep.finalSuccess);
    }
    d.domainSent = true;
}
export function resetDomainSlot118(cap) {
    const d = live(cap);
    assert(!d.frame && !d.root.state.activeFault);
    d.domainSent = false;
}
export async function closeInvocation118(cap, result, { failed = false } = {}) {
    const d = live(cap);
    let bookendError;
    try {
        try {
            currentFiles(d);
        } catch (e) {
            bookendError = e;
        }
        try {
            const native = await import(
                pathToFileURL(
                    F118.win +
                        "/tools/rust-r4ghi/business/source15-admission.mjs",
                ).href
            );
            native.assertCodeEpochContext15(d.root, d.registry, {
                liveProcess: true,
                sourceFiles: true,
            });
        } catch (e) {
            bookendError ??= e;
        }
        if (bookendError) throw bookendError;
        readRetainedTaxProof118(d.root, d.manifest, d.registry);
        const current15 = currentTuple118(cap);
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
        journal.closedJournal = closed;
        d.root.persist();
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
        const r = invocationJournal118(cap);
        r.phase = "failed-preserve";
        r.error = e.message;
        d.root.persist();
        d.root.artifact(d.root.next("tax118-failed-bookend") + ".json", {
            kind: "tax118-bookend-failed-preserve-effects",
            nonce: d.p.nonce,
            input: d.inputPin,
            result: result ?? null,
            error: e.message,
            activeFault: d.root.state.activeFault ?? null,
            normalMayAlreadyBeCommitted: Boolean(
                d.root.state.taxContinuation15.sweep?.finalSuccess,
            ),
            replayForbidden: true,
        });
        throw e;
    } finally {
        d.closed = true;
        caps.delete(cap);
    }
}
async function publishCompleted118(d, normalResult, closedJournal, current15) {
    const root = d.root,
        record = root.state.taxContinuation15,
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
                "actual-Source15-Tax118-after-verified-ownership-journal-frame",
            schemaVersion: 1,
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
        },
    );
    sweep.afterVerifiedFrame = frame;
    const envelope = {
        kind: "actual-Source15-retained-tax-consumer-complete",
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
            root.state.consumerChecks.tax15Invocation118.invocations,
        ).filter((i) =>
            ["prepare-only", "fi-closed-set", "fi-family", "commit-once"]
                .includes(i.mode) &&
            (i.phase === "closed-verified" ||
                i.phase === "closed-failed" &&
                    ["fi-closed-set", "fi-family"].includes(i.mode))
        ).map((i) => structuredClone(i));
    const sidecar = root.artifact(
        root.next("tax118-execution-sidecar") + ".json",
        {
            kind: "actual-Tax15-invocation118-execution-sidecar",
            schemaVersion: 1,
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
