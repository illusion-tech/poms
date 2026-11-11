// Real source spans with isolated I/O/native doubles. Never a task context or DB.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { sha, uuid } from "../../business/pure.mjs";
import { TAX13_OPERATION } from "../../business/tax13-facts.mjs";
import {
    F118,
    freeze118,
    json118,
    read118,
    samePin118,
    sha118,
} from "../retained-tax-proof.mjs";
const require = createRequire(
        new URL("../../../../package.json", import.meta.url),
    ),
    ts = require("typescript");
const D = path.resolve(import.meta.dirname, "..");
function parsed(file) {
    const text = fs.readFileSync(file, "utf8");
    return {
        text,
        ast: ts.createSourceFile(
            file,
            text,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.JS,
        ),
    };
}
function fn(file, name) {
    const { text, ast } = parsed(file),
        node = ast.statements.find((n) =>
            ts.isFunctionDeclaration(n) && n.name?.text === name
        );
    assert(node, name);
    return {
        text: text.slice(node.getStart(ast), node.end).replace(
            /^export\s+/,
            "",
        ),
        node,
        ast,
    };
}
function imports(file, name) {
    return parsed(file).ast.statements.some((n) =>
        ts.isImportDeclaration(n) &&
        n.importClause?.namedBindings?.elements?.some((e) =>
            e.name.text === name
        )
    );
}
function evaluate(source, context) {
    return vm.runInNewContext("(" + source + ")", {
        JSON,
        structuredClone,
        ...context,
    });
}
const retainedFile = D + "/retained-tax-proof.mjs",
    proofFile = D + "/invocation-proof.mjs",
    factsFile = D + "/tax15-facts.mjs";
function temp() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tax118-entry02-"));
    const put = (name, value) => {
        const file = root + "/" + name;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const b = Buffer.isBuffer(value)
            ? value
            : Buffer.from(JSON.stringify(value));
        fs.writeFileSync(file, b, { flag: "wx" });
        return { file, bytes: b.length, rawBytesSha256: sha(b) };
    };
    return { root, put };
}
test("actual first expense checkpoint hashes its exact retained HTTP bytes", () => {
    const f = temp(),
        value = { id: "expense-fixture" },
        request = { fixture: "real-span-only" },
        operationId = "Expense_fixture";
    const responseBody = f.put("response.json", { data: value }),
        requestBody = f.put("request.json", request),
        config = f.put("config.json", {});
    const before = f.put("before.json", { epoch: "g2-business12" }),
        after = f.put("after.json", { epoch: "g2-business12" });
    const http = f.put("http.json", {
        operationId,
        responseComplete: true,
        transportFailure: false,
        status: 201,
        expectedStatus: 201,
        originals: { responseBody, requestBody, config },
    });
    const original = f.put("original.json", {
        operationId,
        value,
        request,
        receipt: http.file,
        ordinaryProducerOnly: true,
        FIClaimed: false,
        before,
        after,
    });
    const checkpoint = {
        phase: "actual-success",
        original,
        value,
        receiptId: http.file,
    };
    assert(imports(retainedFile, "sha"));
    const run = evaluate(fn(retainedFile, "checkpointTax14").text, {
        assert,
        read118,
        fs,
        sha,
    });
    assert.equal(
        run({}, checkpoint, operationId).httpPin.rawBytesSha256,
        http.rawBytesSha256,
    );
    const oldFile = D + "/tests/sealed-code01/products/retained-tax-proof.mjs";
    assert(!imports(oldFile, "sha"));
    const oldRun = evaluate(fn(oldFile, "checkpointTax14").text, {
        assert,
        read118,
        fs,
    });
    assert.throws(
        () => oldRun({}, checkpoint, operationId),
        /sha is not defined/,
    );
});
test("the copied full facts return has its actual fixed operation binding", () => {
    assert(imports(factsFile, "TAX13_OPERATION"));
    assert.equal(TAX13_OPERATION, F118.operation);
    for (
        const [file, bound] of [[factsFile, true], [
            D + "/tests/sealed-code01/products/tax15-facts.mjs",
            false,
        ]]
    ) {
        const { node } = fn(file, "deriveTax15FixtureDetails");
        let initializer;
        const visit = (n) => {
            if (
                ts.isPropertyAssignment(n) && n.name.getText() === "operationId"
            ) initializer = n.initializer.getText();
            ts.forEachChild(n, visit);
        };
        visit(node);
        assert.equal(initializer, "TAX13_OPERATION");
        if (bound) {
            assert.equal(
                vm.runInNewContext(initializer, { TAX13_OPERATION }),
                F118.operation,
            );
        } else {
            assert(!imports(file, "TAX13_OPERATION"));
            assert.throws(
                () => vm.runInNewContext(initializer, {}),
                /TAX13_OPERATION is not defined/,
            );
        }
    }
});
function failedOpenFixture(
    { guardFails = false, corruptSource = false, missingIntent = false } = {},
) {
    const f = temp(),
        nonce = "12345678-1234-4123-8123-123456789012",
        priv = f.root + "/business/g2-business15/main01",
        dir = priv + "/tax118-invocation-" + nonce;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        priv + "/state.json",
        JSON.stringify({ epoch: "g2-business15", untouched: true }),
    );
    const input = f.put("input.json", {}),
        review = f.put("review.json", {}),
        runtime = f.put("runtime.json", {}),
        source = f.put(
            "source.mjs",
            Buffer.from("export const fixture = true;"),
        );
    const registryPin = f.put("reg.json", {}),
        candidate = f.put("B1.json", {}),
        registry = { fixture: "actual-reference-double" };
    const p = {
        nonce,
        mode: "prepare-only",
        runtimeBindings: runtime,
        executionSources: [source],
        codeAdmission15: registryPin,
        candidate,
    };
    if (!missingIntent) {
        fs.writeFileSync(
            dir + "/intent.json",
            JSON.stringify({
                input,
                exactReview: review,
                pid: process.pid,
                nonce,
            }),
        );
    }
    if (corruptSource) fs.writeFileSync(source.file, "changed");
    const realRootDouble = { state: {} },
        primary = new Error("original-open-error");
    let exits = 0;
    const native = {
        assertRuntimeBinding15(root, reg, args) {
            exits++;
            assert.equal(root, realRootDouble);
            assert.equal(reg, registry);
            assert.equal(args.codeAdmission15, registryPin);
            assert.equal(args.candidate, candidate);
            assert.deepEqual(Object.keys(args).sort(), [
                "candidate",
                "codeAdmission15",
            ]);
            if (guardFails) throw Error("native-exit-error");
        },
    };
    const call = evaluate(fn(proofFile, "closeFailedOpen118").text, {
        fs,
        assert,
        process,
        Buffer,
        F118: { ...F118, private: f.root },
        json118,
        samePin118,
        sha118,
        read118,
    });
    const stateBefore = fs.readFileSync(priv + "/state.json");
    return {
        f,
        dir,
        p,
        primary,
        exits: () => exits,
        stateBefore,
        priv,
        run: () =>
            call(realRootDouble, native, registry, p, input, review, primary),
    };
}
test("pre-cap failure attempts one real-wrapper exit and records only closed-failed", () => {
    const f = failedOpenFixture(), result = f.run();
    assert.equal(f.exits(), 1);
    assert.equal(result.openFailure.phase, "closed-failed-before-capability");
    assert.equal(result.openFailure.nativeExitVerified, true);
    assert.equal(result.openFailure.commandVerified, false);
    assert.equal(result.openFailure.capabilityReturned, false);
    assert.equal(result.openFailure.completion, null);
    assert.equal(result.openFailure.sidecar, null);
    assert.deepEqual(fs.readFileSync(f.priv + "/state.json"), f.stateBefore);
    assert.equal(f.primary.message, "original-open-error");
});
test("native exit failure preserves the primary error and truthful secondary", () => {
    const f = failedOpenFixture({ guardFails: true }), result = f.run();
    assert.equal(f.exits(), 1);
    assert.equal(result.openFailure.phase, "failed-preserve");
    assert.equal(result.openFailure.nativeExitVerified, false);
    assert.equal(f.primary.bookendError, "native-exit-error");
    assert.equal(f.primary.message, "original-open-error");
});
test("a source recheck failure does not short-circuit that native exit", () => {
    const f = failedOpenFixture({ corruptSource: true }), result = f.run();
    assert.equal(f.exits(), 1);
    assert.equal(result.openFailure.sourceExitVerified, false);
    assert.equal(result.openFailure.nativeExitVerified, true);
    assert.equal(result.openFailure.phase, "failed-preserve");
});
test("a missing intent cannot prevent the native-exit attempt", () => {
    const f = failedOpenFixture({ missingIntent: true });
    assert.throws(f.run, /ENOENT/);
    assert.equal(f.exits(), 1);
    assert.equal(f.primary.openFailure.nativeExitAttempted, true);
    assert.equal(f.primary.openFailure.nativeExitVerified, true);
});
test("existing failed-open evidence is never replaced", () => {
    const f = failedOpenFixture(),
        file = f.dir + "/failed-open-native-exit.json";
    fs.writeFileSync(file, "unknown-original");
    assert.throws(f.run, /EEXIST/);
    assert.equal(f.exits(), 1);
    assert.equal(fs.readFileSync(file, "utf8"), "unknown-original");
});
function modelOpen({ failure = "before-cap" } = {}) {
    const f = temp(),
        priv = f.root + "/business/g2-business15/main01",
        nonce = "12345678-1234-4123-8123-123456789012",
        dir = priv + "/tax118-invocation-" + nonce;
    fs.mkdirSync(dir, { recursive: true });
    const state = {
        schemaComparison108: { comparisonBaseline: f.put("baseline.json", {}) },
        consumerAdmission54: {},
        taxContinuation15: null,
    };
    const entry = f.put("entry.json", state);
    fs.writeFileSync(priv + "/state.json", fs.readFileSync(entry.file));
    const source = f.put("code.mjs", Buffer.from("fixture")),
        g1 = f.put("g1.json", { implementationAuthorized: true }),
        runtime = f.put("business/g2-business15/main01/runtime.json", {
            current: {},
        });
    const reg = f.put("reg.json", {
            consumer: {
                sourcePins: source,
                compilePins: source,
                helperPins: source,
            },
        }),
        candidate = f.put("B1.json", {}),
        codeReview = f.put("code-review.json", {
            kind: "non-author-Tax15-invocation118-code-review",
            verdict: "code-ready-for-exact-input-review",
            reviewerIsAuthor: false,
            executionSources: [source],
        });
    const p = {
        mode: "prepare-only",
        nonce,
        codeReview,
        technicalG1: g1,
        baseline: source,
        executionSources: [source],
        expectedEntryState: entry,
        runtimeBindings: runtime,
        codeAdmission15: reg,
        candidate,
        apiProcess: f.put("api.json", {}),
        actualSourcePins: source,
        actualCompilePins: source,
        actualHelperPins: source,
    };
    const inputPin = f.put("input.json", p),
        reviewPin = f.put("review.json", {
            kind: "Root-approved-exact-Tax15-invocation118",
            approvedInput: inputPin,
            codeReview,
            expectedEntryState: entry,
            mode: p.mode,
            nonce,
            actualG2Authorized: true,
            normalTaxPOSTGranted: false,
            FIGranted: false,
        });
    fs.writeFileSync(
        priv + "/driver.lock",
        JSON.stringify({ pid: process.pid, nonce, input: inputPin }),
    );
    fs.writeFileSync(
        dir + "/intent.json",
        JSON.stringify({
            pid: process.pid,
            nonce,
            input: inputPin,
            exactReview: reviewPin,
        }),
    );
    const manifest = json118(runtime);
    manifest.current = { codeAdmission15: reg, candidate };
    fs.writeFileSync(runtime.file, JSON.stringify(manifest));
    p.runtimeBindings = {
        ...runtime,
        bytes: fs.statSync(runtime.file).size,
        rawBytesSha256: sha(fs.readFileSync(runtime.file)),
    };
    fs.writeFileSync(inputPin.file, JSON.stringify(p));
    inputPin.bytes = fs.statSync(inputPin.file).size;
    inputPin.rawBytesSha256 = sha(fs.readFileSync(inputPin.file));
    const reviewBody = json118(reviewPin);
    reviewBody.approvedInput = inputPin;
    fs.writeFileSync(reviewPin.file, JSON.stringify(reviewBody));
    reviewPin.bytes = fs.statSync(reviewPin.file).size;
    reviewPin.rawBytesSha256 = sha(fs.readFileSync(reviewPin.file));
    fs.writeFileSync(
        priv + "/driver.lock",
        JSON.stringify({ pid: process.pid, nonce, input: inputPin }),
    );
    fs.writeFileSync(
        dir + "/intent.json",
        JSON.stringify({
            pid: process.pid,
            nonce,
            input: inputPin,
            exactReview: reviewPin,
        }),
    );
    const { text: openText, node } = fn(proofFile, "openInvocation118");
    const importsToReplace = [];
    const visit = (n) => {
        if (
            ts.isAwaitExpression(n) && ts.isCallExpression(n.expression) &&
            n.expression.expression.kind === ts.SyntaxKind.ImportKeyword
        ) importsToReplace.push(n.getText());
        ts.forEachChild(n, visit);
    };
    visit(node);
    let sourceText = openText;
    for (const expr of importsToReplace) {
        sourceText = sourceText.replace(expr, "await fixtureImport()");
    }
    let constructors = 0, exits = 0, privateCloses = 0;
    const caps = new WeakMap(), root = { state: structuredClone(state) };
    const native = {
        assertRuntimeBinding15(actual) {
            exits++;
            assert.equal(actual, root);
        },
    };
    const privateClose = async (cap) => {
        privateCloses++;
        assert(caps.has(cap));
        caps.delete(cap);
        return { fixtureClosedFailed: true };
    };
    const context = {
        assert,
        fs,
        process: {
            platform: "linux",
            version: "v24.19.0",
            execArgv: [],
            env: {},
            pid: process.pid,
        },
        Buffer,
        pathToFileURL,
        F118: { ...F118, private: f.root, win: f.root },
        assertInput118: (value) => value,
        json118,
        read118,
        samePin118,
        sha118,
        fixtureImport: async () => native,
        createContext: () => {
            constructors++;
            if (failure === "constructor") throw Error("constructor-error");
            return root;
        },
        assertRuntimeFacts118: () => {
            if (failure === "before-cap") throw Error("before-cap-error");
            return { plan: {} };
        },
        readRetainedTaxProof118: () => ({}),
        ensureRecord: () => {
            root.state.taxContinuation15 = { taxPreparation: null };
        },
        freeze118: (value) => value,
        restrictContext118: (value) => value,
        helpers: async () => ({}),
        parent: (value) => ({}),
        caps,
        currentFiles: () => {
            throw Error("after-cap-error");
        },
        closeInvocation118: privateClose,
        closeFailedOpen118: null,
    };
    context.closeFailedOpen118 = evaluate(
        fn(proofFile, "closeFailedOpen118").text,
        context,
    );
    const run = evaluate(sourceText, context);
    return {
        run: () => run(inputPin, reviewPin),
        counts: () => ({ constructors, exits, privateCloses }),
    };
}
for (const failure of ["constructor", "before-cap", "after-cap"]) {
    test(
        "actual open control-flow handles " + failure +
            " without a second constructor",
        async () => {
            const f = modelOpen({ failure });
            let error;
            try {
                await f.run();
            } catch (e) {
                error = e;
            }
            assert(error);
            assert.match(
                error.message,
                new RegExp(
                    failure === "constructor"
                        ? "constructor-error"
                        : failure === "before-cap"
                        ? "before-cap-error"
                        : "after-cap-error",
                ),
                error.stack,
            );
            assert.equal(f.counts().constructors, 1);
            if (failure === "constructor") {
                assert.equal(f.counts().exits, 0);
                assert.equal(
                    error.openFailure.actualConstructorReturned,
                    false,
                );
                assert.equal(error.openFailure.entryEffectsUnknown, true);
            }
            if (failure === "before-cap") {
                assert.equal(f.counts().exits, 1);
                assert.equal(f.counts().privateCloses, 0);
                assert.equal(
                    error.openFailure.phase,
                    "closed-failed-before-capability",
                );
            }
            if (failure === "after-cap") {
                assert.equal(f.counts().exits, 0);
                assert.equal(f.counts().privateCloses, 1);
                assert.equal(
                    error.openFailure.closed.fixtureClosedFailed,
                    true,
                );
            }
        },
    );
}
function lockFinallyFixture(
    { primary = false, tamper = false, completed = false } = {},
) {
    const f = temp(),
        nonce = "12345678-1234-4123-8123-123456789012",
        input = { nonce },
        inputPin = f.put("input.json", input);
    const lock = f.root + "/driver.lock",
        lockBytes = Buffer.from(JSON.stringify({ pid: process.pid, nonce }));
    fs.writeFileSync(lock, lockBytes);
    const lockSHA = sha(lockBytes);
    if (tamper) {
        fs.writeFileSync(
            lock,
            JSON.stringify({ pid: process.pid, nonce: "unknown-owner" }),
        );
    }
    if (completed) {
        fs.writeFileSync(
            f.root + "/complete.json",
            JSON.stringify({ fixtureComplete: true }),
        );
    }
    const { node } = fn(D + "/run-tax15-once.mjs", "runTax15Once118");
    const outerTry = node.body.statements.find((n) => ts.isTryStatement(n));
    assert(outerTry.finallyBlock);
    const source =
        'function fixtureFinally(primaryFailure) { try { if (primaryFailure) throw primaryFailure; return "complete"; } finally ' +
        outerTry.finallyBlock.getText() + " }";
    const run = evaluate(source, {
        fs,
        assert,
        process,
        sha118,
        lock,
        lockSHA,
        dir: f.root,
        inputPin,
        input,
    });
    return {
        f,
        lock,
        run: () =>
            run(
                primary
                    ? Object.assign(Error("primary-command-error"), {
                        identity: "original",
                    })
                    : undefined,
            ),
    };
}
test("actual lock finally removes only the intact owned lock", () => {
    const f = lockFinallyFixture();
    assert.equal(f.run(), "complete");
    assert(!fs.existsSync(f.lock));
});
test("actual lock finally preserves primary error when lock ownership changed", () => {
    const f = lockFinallyFixture({ primary: true, tamper: true });
    let error;
    try {
        f.run();
    } catch (e) {
        error = e;
    }
    assert.equal(error.message, "primary-command-error");
    assert.equal(error.identity, "original");
    assert(error.lockCleanupError);
    const evidence = JSON.parse(
        fs.readFileSync(f.f.root + "/lock-cleanup-failure.json"),
    );
    assert.equal(evidence.primaryError, "primary-command-error");
    assert.equal(evidence.replayForbidden, true);
    assert(fs.existsSync(f.lock));
});
test("actual lock finally preserves known completion and stops on cleanup failure", () => {
    const f = lockFinallyFixture({ tamper: true, completed: true });
    assert.throws(f.run);
    const evidence = JSON.parse(
        fs.readFileSync(f.f.root + "/lock-cleanup-failure.json"),
    );
    assert.equal(evidence.completionAlreadyWritten, true);
    assert.equal(evidence.primaryError, null);
    assert.equal(evidence.replayForbidden, true);
});
