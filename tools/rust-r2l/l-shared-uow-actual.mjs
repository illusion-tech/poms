// SOURCE-only Root owner. One CLI invocation owns one fresh backend/variant.
// --check executes only argument/guard tests; it never loads managed environments.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { commissionBuildBinding, runCommissionConsumersActual } from './l-commission-http-actual.mjs';
import { managed } from './database-client.mjs';
import { marker } from './fixture-guard.mjs';
import { captureSharedUow, decodeSharedUowProbeOutput } from './l-shared-uow-capture.mjs';
import { executeNativeSharedUow, runNativeSharedUow, sharedUowProbeInput } from './l-shared-uow-native.mjs';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
import { UOW_ROOT, UOW_PRIVATE, UOW_PROBE_BINDING, UOW_PROBE_BINDING_SHA256, probeBuildBinding, runOwnedSharedUowProbe,
    privateDirectory, writePrivate, privateBytes, bytesReceipt } from './l-shared-uow-process.mjs';
const require = createRequire(import.meta.url), SOURCE = 'tools/rust-r2l/l-shared-uow-actual.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const FINANCE = '00000000-0000-4000-8000-000000000014';
const CONTRACT_REVIEWER = '00000000-0000-4000-8000-000000000008';
export const sharedUowDirtyTodoRole = 'contract.submit.reject';
const MAIN_SHA = 'ee558d02f8a5ee7f49d3e3aced266338282e958cf84bf1cb96ef2e3b61b8b475';
const REVIEWED_RUNTIME_SOURCES = Object.freeze({
    'tools/rust-r2l/native-app.mjs': 'aa1d0b8a160c67e1209a349d6a3f56a3eb20a45a0fafb244203c282ce585b9fc',
    'tools/rust-r2l/l-shared-uow-native.mjs': 'e806acce9802433d48a90ad95beabfd2fcd1aaa10e80d0460e88a702cdb284ca',
    'tools/rust-r2l/l-shared-uow-capture.mjs': '676447661bc15d8026129ab859fc35f1edc350c751d487c4de42764446c957c4',
    'tools/rust-r2l/l-shared-uow-measurements.mjs': '519a477977e3e1865650029eb657f80ce1196ad7c3e12f44ee80f5615be19451',
});
export const sharedUowVariants = Object.freeze({
    'success-commit': Object.freeze({ childSuccess: true, outer: 'commit', continueAfterServiceError: false, expectedAction: 'commit' }),
    'success-rollback': Object.freeze({ childSuccess: true, outer: 'rollback', continueAfterServiceError: false, expectedAction: 'rollback' }),
    'gate-rollback': Object.freeze({ childSuccess: false, outer: 'rollback', continueAfterServiceError: false, expectedAction: 'rollback-after-service-error' }),
    'gate-continue-commit': Object.freeze({ childSuccess: false, outer: 'commit', continueAfterServiceError: true, expectedAction: 'commit' }),
});
export function sharedUowOptions(tag, backend, variant, buildTag = 'candidate08', probeBindingFile = '', probeBindingSha256 = '') {
    assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '')); assert(['nest', 'rust'].includes(backend));
    assert(Object.hasOwn(sharedUowVariants, variant)); assert.equal(buildTag, 'candidate08');
    if (backend === 'rust') { assert.equal(probeBindingFile, UOW_PROBE_BINDING); assert.equal(probeBindingSha256, UOW_PROBE_BINDING_SHA256); }
    else { assert.equal(probeBindingFile, ''); assert.equal(probeBindingSha256, ''); }
    return { tag, backend, variant, buildTag, probeBindingFile, probeBindingSha256, ...sharedUowVariants[variant] };
}
export function selectSharedUowDirtyTodo({ facts, objects, projectId, todoAId, runId }) {
    const candidates = objects.filter(item => item.table === 'todo_item' && item.caseId === sharedUowDirtyTodoRole
        && item.creationProof?.kind === 'mikro-orm-afterCreate-outer-commit'
        && item.creationProof.sdkVersion === '7.0.11' && item.creationProof.createContext?.runId === runId
        && item.creationProof.createContext.caseId === sharedUowDirtyTodoRole
        && item.creationProof.createContext.op === 'l.producer' && item.postcondition?.independentlyVisible === true);
    assert.equal(candidates.length, 1, 'Require the one original Native contract.submit.reject Todo certificate; no UUID/title/DTO fallback');
    const certificate = candidates[0], rows = facts.todo_item.filter(row => row.id === certificate.id);
    assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.project_id, projectId); assert.equal(certificate.identity.project_id, projectId);
    assert.notEqual(row.id, todoAId); assert.equal(row.source_type, 'approval-record');
    assert.equal(row.assignee_user_id, CONTRACT_REVIEWER, 'Retain the original readonly contract reviewer8; never retarget it');
    assert(['completed', 'canceled'].includes(row.status), 'The logically fixed other Todo must already be closed');
    return { row, certificate, logicalRole: sharedUowDirtyTodoRole };
}
function checkedCurrentPair(facts, projectId) {
    const final = facts.commission_final_settlement_snapshot.filter(row => row.project_id === projectId && row.is_current);
    const rule = facts.commission_rule_explanation_snapshot.filter(row => row.project_id === projectId && row.is_current);
    assert.equal(final.length, 1); assert.equal(rule.length, 1);
    assert.equal(final[0].status, 'active'); assert.equal(rule[0].status, 'active');
    assert.equal(rule[0].final_settlement_snapshot_id, final[0].id);
    return { final: final[0], rule: rule[0] };
}
function checkedVariantObservation(observation, options, payoutId) {
    const succeeded = options.backend === 'nest' ? observation.serviceSucceeded : observation.serviceError == null && observation.serviceResult != null;
    assert.equal(succeeded, options.childSuccess, 'Retain actual unexpected child outcome; do not label it the requested variant');
    assert.equal(observation.outerActualAction, options.expectedAction);
    if (!options.childSuccess) {
        assert.equal(observation.serviceError.status, 400);
        assert.equal(observation.serviceError.message, 'CommissionPayout ' + payoutId + ' is blocked by the current final commission gate review');
    }
    assert.equal(observation.result, 'observed');
}
export function createSharedUowActualHooks({ options, sealedRustEnvironment = null, probeBinding = null, environmentSealedAt = null }) {
    assert.deepEqual(options, sharedUowOptions(options.tag, options.backend, options.variant, options.buildTag,
        options.probeBindingFile, options.probeBindingSha256));
    if (options.backend === 'rust') assert(sealedRustEnvironment && probeBinding && environmentSealedAt);
    let entered = false;
    return { beforeReplacementFinal: async ctx => {
        assert.equal(entered, false, 'A fresh producer run may enter the UoW hook only once'); entered = true;
        assert.equal(ctx.backend, options.backend); assert.equal(ctx.f.backend, options.backend);
        assert.equal(ctx.native.report().databaseBackend, options.backend);
        assert.equal(ctx.approval.currentApproverUserId, FINANCE);
        const original = await ctx.facts(), pair = checkedCurrentPair(original, ctx.project.id);
        const approval = await ctx.ownedRow('approval_record', ctx.approval.id);
        const payout = await ctx.ownedRow('commission_payout', approval.target_object_id);
        assert.equal(approval.current_status, 'pending'); assert.equal(approval.target_object_type, 'commission-payout');
        assert.equal(approval.project_id, ctx.project.id); assert.equal(approval.current_approver_user_id, FINANCE);
        assert.equal(payout.id, ctx.payout.id); assert.equal(payout.stage_type, 'final'); assert.equal(payout.status, 'pending-approval');
        const todoAs = original.todo_item.filter(row => row.project_id === ctx.project.id && row.source_type === 'approval-record'
            && row.source_id === approval.id && row.assignee_user_id === FINANCE && ['open', 'processing'].includes(row.status));
        assert.equal(todoAs.length, 1); await ctx.ownedRow('todo_item', todoAs[0].id);
        const dirtySelection = selectSharedUowDirtyTodo({ facts: original, objects: ctx.f.j.objects,
            projectId: ctx.project.id, todoAId: todoAs[0].id, runId: ctx.runId });
        const dirtyTodo = await ctx.ownedRow('todo_item', dirtySelection.row.id);
        const caseId = 'uow.' + options.variant, context = { runId: ctx.runId, caseId, index: ctx.report.requests.length, op: 'l.internal-uow' };
        const readonlyDefinitions = ctx.f.j.borrowed.definitions.map(row => { assert.equal(row.readOnly, true); return row.id; });
        assert.equal(readonlyDefinitions.length, 3);
        ctx.f.defineCase(caseId, { actors: [ctx.f.actors.admin, ctx.f.actors.viewer], projects: [ctx.project.id],
            borrowedActors: [FINANCE], borrowedDefinitions: readonlyDefinitions });
        privateDirectory(UOW_PRIVATE);
        const directory = UOW_PRIVATE + '/shared-uow/' + options.backend + '-' + ctx.runId + '-' + options.tag;
        privateDirectory(directory);
        const metaFile = directory + '/owner.json', captureFile = directory + '/capture.json', processFile = directory + '/process.json';
        const record = { kind: 'private-source-bound-real-shared-UoW-phase', result: 'prepared', options, context,
            source: { file: SOURCE, rawBytesSha256: hash(fs.readFileSync(SOURCE)) }, measurementContract: sharedUowMeasurementContract,
            environment: options.backend === 'rust' ? { sealedBeforeOriginalNativeStartup: true, sealedAt: environmentSealedAt, contentsExported: false } : null,
            initialFacts: original, currentPairBefore: pair, selection: { approval, payout, todoA: todoAs[0], dirtyTodo,
                dirtyTodoCertificate: dirtySelection.certificate, dirtyTodoLogicalRole: dirtySelection.logicalRole,
                choice: 'Unique original Native SDK contract.submit.reject certificate plus its actual same-project closed row; no UUID/title/DTO fallback' },
            creationFromDtoOrDriverTrace: false, G3Certified: false, G4Certified: false };
        writePrivate(metaFile, record, true);
        if (!options.childSuccess) {
            const binding = await ctx.ownedRow('operating_signal_gate_binding', ctx.prepared.gateBindingId);
            const review = await ctx.ownedRow('commission_gate_review_record', ctx.gateReview.gateReviewRecordId);
            assert.equal(binding.project_id, ctx.project.id); assert.equal(binding.status, 'active');
            assert.equal(review.binding_id, binding.id); assert.equal(review.status, 'active');
            record.gatePrecondition = { source: 'original ApprovalService.loadValidatedFinalPayoutApprovalContext',
                beforeBinding: binding, actualReview: review, preparedNotNativeProduced: true };
            writePrivate(metaFile, record);
            record.gatePrecondition.afterBinding = await ctx.f.updateOwned('operating_signal_gate_binding', binding.id, { binding_action: 'block' },
                'Named shared-UoW gate veto for ' + caseId + '; preserve actual fixed approver and restore through normal owned cleanup');
            writePrivate(metaFile, record);
        }
        const dirtySummary = 'L actual shared parent ' + options.variant + ' ' + ctx.runId;
        let captureWritten = false, processWritten = false, processClosed = options.backend === 'nest';
        const retainProcess = async value => { writePrivate(processFile, value, !processWritten); processWritten = true; };
        try {
            const result = await captureSharedUow({ fixture: ctx.f, native: ctx.native, pg: ctx.pg, context,
                executionBackend: options.backend === 'nest' ? 'native' : 'rust', projectId: ctx.project.id, actorId: FINANCE,
                facts: ctx.facts,
                retain: async value => { writePrivate(captureFile, value, !captureWritten); captureWritten = true; },
                execute: async (actualContext, { retainStage }) => {
                    assert.deepEqual(actualContext, context);
                    if (options.backend === 'nest') {
                        const output = await executeNativeSharedUow({ fixture: ctx.f, native: ctx.native, context,
                            approvalId: approval.id, dirtyTodoId: dirtyTodo.id, actorId: FINANCE, dirtySummary,
                            outer: options.outer, continueAfterServiceError: options.continueAfterServiceError }, { retainStage });
                        record.rawSdkEncoding = privateBytes(directory + '/native-sdk.json', output.rawBytes);
                        writePrivate(metaFile, record); return output;
                    }
                    const input = sharedUowProbeInput({ fixture: ctx.f, context, approval, dirtyTodo, dirtySummary,
                        outer: options.outer, continueAfterServiceError: options.continueAfterServiceError });
                    record.sealedProbeInput = input; record.exampleBinding = probeBinding; writePrivate(metaFile, record);
                    const output = await runOwnedSharedUowProbe({ input, sealedEnvironment: sealedRustEnvironment,
                        binding: probeBinding, directory, retain: retainProcess });
                    processClosed = output.closedBeforeDecodeAndPGDrain;
                    assert(processClosed); record.processClosedBeforeDecodeAndPGDrain = true; writePrivate(metaFile, record);
                    return decodeSharedUowProbeOutput(output.rawBytes, context);
                } });
            assert(processClosed, 'The real example must be closed before PG certificate drain and whole fixture cleanup');
            checkedVariantObservation(result.observation, options, payout.id);
            const expectedCreates = options.childSuccess && options.outer === 'commit' ? 1 : 0;
            for (const table of ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'])
                assert.equal(result.snapshotCounts[table], expectedCreates, 'Actual outer-COMMIT creation count for the requested variant');
            const actualDirtyTodo = result.after.todo_item.find(row => row.id === dirtyTodo.id); assert(actualDirtyTodo);
            assert.equal(actualDirtyTodo.assignee_user_id, dirtyTodo.assignee_user_id);
            record.captureResult = result; record.result = 'edges-observed'; record.finishedAt = new Date().toISOString();
            writePrivate(metaFile, record);
            return { finish: true, evidence: { kind: 'actual-bounded-shared-UoW-variant', variant: options.variant,
                backend: options.backend, sourceOnlyPlanBecameActual: true, freshRunId: ctx.runId,
                original114Claimed: false, requestedChildSucceeded: options.childSuccess, outerActualAction: result.observation.outerActualAction,
                privateOwner: bytesReceipt(metaFile), privateCapture: bytesReceipt(captureFile),
                privateProcess: processWritten ? bytesReceipt(processFile) : null,
                exampleClosedBeforePgDrain: processClosed, snapshotCounts: result.snapshotCounts,
                ownershipAuthority: result.ownershipAuthority, traceUsedAsOwnership: false, crossBackendCompared: false,
                fullFactsAndAllParentMemoryRetained: true, measurementContract: sharedUowMeasurementContract,
                G3Certified: false, G4Certified: false } };
        } catch (error) {
            record.result = 'partial'; record.failure = { name: error.name, message: error.message, stack: error.stack };
            if (error.sharedUowProcessObservation) record.processFailure = error.sharedUowProcessObservation;
            writePrivate(metaFile, record); throw error;
        }
    } };
}
async function childRun(options) {
    assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(process.cwd(), UOW_ROOT);
    for (const [file, expected] of Object.entries(REVIEWED_RUNTIME_SOURCES))
        assert.equal(hash(fs.readFileSync(file)), expected, 'Sync the reviewed runtime source epoch before fixture writes: ' + file);
    const mainBinding = commissionBuildBinding(options.buildTag); assert.equal(mainBinding.expectedBinarySha256, MAIN_SHA);
    assert.equal(mainBinding.rawBytesSha256, 'f9c79ee04f593645715e48f680236dc4c807d64bca63dacdf5e8f4bfecbe7dbb');
    assert.equal(mainBinding.sourceFiles, 169);
    // Seal with the original strict loader while ambient DB_* is still clean.
    // Original Native startup later mutates process.env; never reload from it.
    const sealedRustEnvironment = options.backend === 'rust' ? Object.freeze({ ...managed('rust').childEnv }) : null;
    const environmentSealedAt = options.backend === 'rust' ? new Date().toISOString() : null;
    const exampleBinding = options.backend === 'rust' ? probeBuildBinding({ file: options.probeBindingFile,
        expectedSha256: options.probeBindingSha256, mainBinding }) : null;
    const hooks = createSharedUowActualHooks({ options, sealedRustEnvironment, probeBinding: exampleBinding, environmentSealedAt });
    await runCommissionConsumersActual({ tag: options.tag, backend: options.backend, consumerBackend: options.backend === 'nest' ? 'native' : 'rust',
        buildBinding: mainBinding, expectedBinarySha256: mainBinding.expectedBinarySha256, hooks,
        hookSource: { file: SOURCE, sha256: hash(fs.readFileSync(SOURCE)) } });
    const actual = JSON.parse(fs.readFileSync('tmp/rust-r2l/commission-http-' + options.backend + '-' + options.tag + '.json'));
    assert.equal(actual.result, 'edges-observed'); assert.equal(actual.finishedEdgePhase, 'beforeReplacementFinal');
    assert.equal(actual.default114Only, false); assert.equal(actual.doubleZero, true);
    assert(actual.resourceCloseout.every(row => row.result === 'pass'));
}
async function owner(options) {
    assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(process.cwd(), UOW_ROOT);
    const runtime = require('../e2e/runtime.cjs');
    privateDirectory(UOW_PRIVATE); privateDirectory(UOW_PRIVATE + '/execution-logs');
    const log = UOW_PRIVATE + '/execution-logs/shared-uow-' + options.backend + '-' + options.tag + '.log';
    const output = 'tmp/rust-r2l/shared-uow-' + options.backend + '-' + options.tag + '-owner.json';
    assert(!fs.existsSync(log) && !fs.existsSync(output));
    const report = { formatVersion: 1, kind: 'bounded-fresh-shared-UoW-variant-owner', result: 'pending', options,
        source: { file: SOURCE, rawBytesSha256: hash(fs.readFileSync(SOURCE)) }, startedAt: new Date().toISOString(),
        timeoutMs: 300000, stdoutRetainedPrivately: true, G3Certified: false, G4Certified: false };
    try {
        for (const port of [9700, 9701]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode: 'external', baseUrl: 'http://127.0.0.1:' + port }));
        const result = await runtime.runOwnedCommand({ executable: process.execPath,
            args: [SOURCE, options.tag, options.backend, options.variant, options.buildTag, options.probeBindingFile, options.probeBindingSha256, '--owner-child'],
            cwd: UOW_ROOT, env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG ?? 'C.UTF-8' },
            logPath: log, timeoutMs: 300000 });
        report.exitCode = result.code; report.result = 'pass-bounded-variant-owner-not-cross-backend-equality';
    } catch (error) { report.result = 'partial'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally {
        if (fs.existsSync(log)) { fs.chmodSync(log, 0o600); report.privateLog = bytesReceipt(log); }
        report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
        console.log(JSON.stringify(report));
    }
}
async function pureCheck() {
    for (const backend of ['nest', 'rust']) for (const variant of Object.keys(sharedUowVariants)) {
        const options = sharedUowOptions('pure-check', backend, variant, 'candidate08',
            backend === 'rust' ? UOW_PROBE_BINDING : '', backend === 'rust' ? UOW_PROBE_BINDING_SHA256 : '');
        assert.equal(options.childSuccess, variant.startsWith('success-'));
    }
    assert.throws(() => sharedUowOptions('pure-check', 'nest', 'not-a-variant'));
    assert.throws(() => sharedUowOptions('pure-check', 'rust', 'success-commit', 'candidate08', '../private/rust.env', '0'.repeat(64)));
    let writes = 0;
    const forbidden = () => { writes++; throw new Error('A wrong-provider guard reached a write or scope callback'); };
    const fixture = { backend: 'nest', j: { backend: 'nest', namespace: 'poms-r2l', marker }, intent: forbidden, scope: forbidden };
    const wrongNative = { report: () => ({ databaseBackend: 'rust' }), admitOriginalSdkContext: forbidden, withOriginalSdkScope: forbidden };
    await assert.rejects(() => runNativeSharedUow({ fixture, native: wrongNative }), /provider must actually use the Nest database/);
    await assert.rejects(() => captureSharedUow({ fixture, native: wrongNative, executionBackend: 'native',
        execute: forbidden, facts: forbidden, retain: forbidden }), /actual original Native provider must use this fixture database/);
    assert.throws(() => sharedUowProbeInput({ fixture }), /requires the Rust fixture/);
    assert.equal(writes, 0);
    const fixed = { id: 'todo-b', project_id: 'project', source_type: 'approval-record', assignee_user_id: CONTRACT_REVIEWER, status: 'canceled' };
    const certificate = { table: 'todo_item', id: fixed.id, caseId: sharedUowDirtyTodoRole, identity: { project_id: 'project' },
        creationProof: { kind: 'mikro-orm-afterCreate-outer-commit', sdkVersion: '7.0.11',
            createContext: { runId: 'run', caseId: sharedUowDirtyTodoRole, op: 'l.producer' } },
        postcondition: { independentlyVisible: true } };
    const vector = { facts: { todo_item: [fixed] }, objects: [certificate], projectId: 'project', todoAId: 'todo-a', runId: 'run' };
    assert.equal(selectSharedUowDirtyTodo(vector).logicalRole, sharedUowDirtyTodoRole);
    for (const bad of [
        { ...vector, objects: [] }, { ...vector, objects: [certificate, certificate] },
        { ...vector, objects: [{ ...certificate, caseId: 'other-case' }] },
        { ...vector, objects: [{ ...certificate, creationProof: { ...certificate.creationProof, createContext: { ...certificate.creationProof.createContext, caseId: 'other-case' } } }] },
        { ...vector, objects: [{ ...certificate, postcondition: { independentlyVisible: false } }] },
        { ...vector, facts: { todo_item: [{ ...fixed, status: 'open' }] } },
        { ...vector, facts: { todo_item: [{ ...fixed, project_id: 'other-project' }] } },
        { ...vector, facts: { todo_item: [{ ...fixed, assignee_user_id: FINANCE }] } },
        { ...vector, facts: { todo_item: [{ ...fixed, id: 'earlier-uuid-closed-unrelated' }] } },
    ]) assert.throws(() => selectSharedUowDirtyTodo(bad));
    assert.equal(sharedUowMeasurementContract.automaticStrictEqualityAllowed, false);
    console.log(JSON.stringify({ kind: 'pure-shared-UoW-owner-argument-and-prewrite-guard-check', variants: 4, backends: 2,
        actualPrewriteEntryGuardChecks: 3, stableTodoCertificateSelectionVectors: 10, UUIDTitleDtoFallbackAllowed: false,
        writeCallbacksReached: 0, NodeSyntaxSeparate: true,
        ManagedEnvironmentLoaded: false, ORMInitialized: false, DBExecuted: false, HTTPExecuted: false, ProcessSpawned: false }));
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    if (process.argv.length === 3 && process.argv[2] === '--check') await pureCheck();
    else {
        const args = process.argv.slice(2), isChild = args.at(-1) === '--owner-child';
        if (isChild) args.pop();
        assert(args.length >= 4 && args.length <= 6, 'CLI: tag nest|rust variant candidate08 [probe-binding-file probe-binding-sha256]');
        const options = sharedUowOptions(...args);
        if (isChild) await childRun(options); else await owner(options);
    }
}
