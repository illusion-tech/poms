import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCompleteHttpCoverage } from './http-compat-cases.mjs';
import { belowEvidence, sourceFiles, validateServerReceipt } from './http-compat.mjs';
import { normalizeRun, declaredEntries, validateFixtureTrace } from './http-compat-normalize.mjs';
import { sourceHead, validateSource } from './fixture-guard.mjs';
import { assertSourceGuard } from './export-users.mjs';
import { validateJournal } from './fixture-journal.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateOwnerCloseout(run, closeout) {
    const before = validateServerReceipt(run.serverReceipt?.value, run.backend, run.serverReceipt?.value?.origin);
    assert.equal(closeout?.result, 'pass', 'Independent coordinator closeout must pass');
    assert.equal(closeout.sourceUnchanged, true, 'Owner source unchanged proof required');
    assert.equal(closeout.aliveAfter, true, 'Owner remained alive after HTTP observation');
    assert.equal(closeout.stopped, true, 'Coordinator stopped the same owner');
    assert.equal(closeout.serverReceiptSha256, run.serverReceipt.sha256, 'Exact original before receipt binding');
    for (const key of ['backend', 'origin', 'pid', 'binarySha256', 'sourceHead']) assert.equal(closeout[key], before[key], 'Owner before/after ' + key);
    assert.deepEqual(closeout.processIdentityAfter, before.processIdentity, 'Exact worker PID/startTicks remained unchanged');
    assert.equal(closeout.binarySha256After, before.binarySha256, 'Owner binary unchanged');
    assert.deepEqual(closeout.sourceFilesAfter, before.sourceFiles, 'Every owner source file unchanged');
}
export function validateReportAdmission(run, backend, closeout) {
    assert.equal(run.formatVersion, 1, 'HTTP report format');
    assert.equal(run.kind, 'r2d-sequential-http-observation', 'Only the actual R2D HTTP report schema');
    assert.equal(run.backend, backend, 'Correct side backend');
    assert.equal(run.sourceHead, sourceHead, 'Frozen source head');
    assert.equal(run.result, 'observed', 'No failed/partial HTTP report admitted');
    assert.equal(run.coverageComplete, true, 'Complete independent case coverage required');
    assert.equal(run.sourcesUnchanged, true, 'Source before/after equality required');
    assert(Array.isArray(run.sourcesBefore) && run.sourcesBefore.length, 'Source epoch required');
    assert.equal(new Set(run.sourcesBefore.map(value => value.file)).size, run.sourcesBefore.length, 'Unique source manifest paths');
    for (const value of run.sourcesBefore) assert(typeof value.file === 'string' && /^[0-9a-f]{64}$/.test(value.normalizedLfSha256), 'Complete normalized source hash record');
    assert.deepEqual(run.sourcesAfter, run.sourcesBefore, 'Exact immutable HTTP source epoch');
    assert.equal(run.cleanupCompleted, true, 'Fixture cleanup completed');
    assert.equal(run.cleanup?.state, 'cleaned', 'First cleanup receipt');
    assert.equal(run.zeroResidual?.state, 'cleaned', 'Second cleanup receipt');
    assert.equal(run.zeroResidual.matched, 0, 'Second cleanup matched zero');
    assert.equal(run.zeroResidual.changed, 0, 'Second cleanup changed zero');
    assert.equal(run.cleanupFailure, undefined, 'No suppressed cleanup failure');
    assert.equal(run.failurePhase, undefined, 'No suppressed request failure');
    assert(/^[0-9a-f]{64}$/.test(run.serverReceipt?.sha256), 'Before receipt byte hash');
    validateOwnerCloseout(run, closeout);
    assertCompleteHttpCoverage(run);
    validateDeclaredRequests(run);
    validateFixtureBindings(run);
    validateFixtureTrace(run);
}

export function validateFixtureBindings(run) {
    validateJournal(run.fixture, { runId: run.runId, backend: run.backend });
    assert.equal(run.fixture.state, 'prepared', 'Original prepared journal required');
    for (const account of run.fixture.accounts) assert.equal(account.userId, run.identities[account.account], 'Journal actor identity');
    for (const [kind, property] of [['roles', 'roles'], ['orgs', 'orgs']]) for (const value of run.fixture[kind]) assert.equal(value.id, run.identities[property][value.slot], 'Journal reference identity');
    assert.deepEqual(Object.keys(run.identities.users), ['u000'], 'Only one declared HTTP-created user slot');
    const created = run.observations[0], username = 'r2d_u000_' + run.runId.replaceAll('-', '');
    assert.equal(created.id, 'create:target', 'Initial real creation case');
    assert.equal(created.status, 201, 'Actual original HTTP create status');
    assert.equal(created.response.id, run.identities.users.u000, 'Created response binds adopted user');
    assert.equal(created.response.username, username, 'Created response binds exact planned username');
    assert.equal(created.adoption.state, 'adopted', 'Durable planned username adoption receipt');
    assert.equal(created.adoption.matched, 1, 'One exact created user adopted');
    assert.equal(created.adoption.changed, 1, 'Initial null intent adopted exactly once');
    assert.deepEqual(created.adoption.user, { slot: 'u000', username, userId: run.identities.users.u000 }, 'Exact adopted user identity');
}

export function validateDeclaredRequests(run) {
    const expected = declaredEntries(run);
    assert.equal(run.observations.length, expected.length, 'Every exact declared request required');
    for (const [index, row] of run.observations.entries()) {
        const wanted = expected[index];
        assert.equal(row.id, wanted.id, 'Declared request order');
        assert.equal(row.route, wanted.route, row.id + ': exact raw route');
        assert.deepEqual(row.request, { ...wanted.options, ...(wanted.json === undefined ? {} : { json: wanted.json }) }, row.id + ': exact original declared request body/options');
        assert.equal(row.account, wanted.account ?? 'admin', row.id + ': declared requesting account');
        assert.equal(row.monitorAccount, wanted.account === 'none' ? 'admin' : wanted.account ?? 'admin', row.id + ': declared monitored account');
        assert.equal(row.due, wanted.due ?? false, row.id + ': declared due/non-due state');
        assert.equal(row.expectedStatus, wanted.expectedStatus, row.id + ': declared expected status');
    }
}

export function firstDifference(left, right, location = 'root') {
    if (Object.is(left, right)) return null;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return location;
    if (Array.isArray(left) !== Array.isArray(right)) return location;
    const a = Object.keys(left).sort(), b = Object.keys(right).sort();
    if (a.length !== b.length || a.some((key, index) => key !== b[index])) return location + '.<keys>';
    for (const key of a) {
        const difference = firstDifference(left[key], right[key], location + (Array.isArray(left) ? '[' + key + ']' : '.' + key));
        if (difference) return difference;
    }
    return null;
}
export function compareReports(nest, rust, ownerCloseouts) {
    validateReportAdmission(nest, 'nest', ownerCloseouts?.nest);
    validateReportAdmission(rust, 'rust', ownerCloseouts?.rust);
    assert.equal(nest.platform, rust.platform, 'Same HTTP runner platform required');
    assert.equal(nest.runtime.node, rust.runtime.node, 'Same Node runtime required');
    assert.equal(nest.runtime.icu, rust.runtime.icu, 'Same ICU runtime required');
    assert.deepEqual(nest.coverage, rust.coverage, 'Same full source-bound case manifest');
    assert.deepEqual(nest.sourcesBefore, rust.sourcesBefore, 'Same source/harness epoch across backends');
    const left = normalizeRun(nest), right = normalizeRun(rust), difference = firstDifference(left, right);
    if (difference) throw Object.assign(new Error('HTTP/facts comparison differs'), { name: 'HttpComparisonError', difference });
    return {
        formatVersion: 1, result: 'pass', kind: 'r2d-sequential-http-parity', platform: nest.platform, comparedCases: left.observations.length,
        coverage: nest.coverage, sourceEpoch: nest.sourcesBefore,
        normalization: 'Registered run/actor/user/org/role/session/history/relation identities only. Original rejected DTO request and complete error payload are literal. Response arrays keep received order except list/owner-reference user comparison copies, including actual HEAD GET references: their complete ordered PG users first prove created_at DESC at microsecond precision, and only contiguous exact-time ties may permute with every field and the full logical-member partition retained. Other arrays, including permissions, roles, organizations, audit history and changedFields, keep received order; ten SQL observer table arrays are keyed by registered row ID because their query ORDER BY id uses random identities. Previous after-facts must equal next before-facts except the exact ordered fixture receipt trace and its validated fields/versions/clock windows/relation replacements. Every observed creation time is immutable, including non-owned response entities; non-owned rows remain unchanged. Dynamic timestamps retain calendar validation, all new-row event-time request bounds, new-row created/updated and deadline constraints, every new-row same-record time equality/order relation, immutable history/credential checks, before/after equality, session lease relationships and exact wire-to-same-request-PG milliseconds; pinned pre-2021 fixture times retain their exact microseconds. Redacted secret fingerprints must stay byte-identical throughout each run before per-owned-row comparison tokens. Actual raw byte lengths remain in input reports; declared lengths match actual bytes and every HEAD is tied to its own real GET.',
        comparisons: left.observations.map(row => ({ id: row.id, status: row.status, result: 'pass' })),
        boundary: 'The complete declared sequential566 plan only. Full759 schema oracle, SQL/concurrency witness73 and browser evidence remain independent; no automatic G3/G4 claim.'
    };
}

export function validateLiveInputs(run) {
    validateSource(); assertSourceGuard();
    assert.deepEqual(run.sourcesBefore, sourceFiles(), 'HTTP evidence source epoch must still match the current frozen harness');
    const bytes = readFileSync(belowEvidence(run.serverReceipt.file));
    assert.equal(digest(bytes), run.serverReceipt.sha256, 'Before owner receipt original byte hash');
    assert.deepEqual(validateServerReceipt(JSON.parse(bytes), run.backend, run.serverReceipt.value.origin), run.serverReceipt.value, 'Before owner receipt contents');
}
export function parseCompareOptions(args) {
    assert.equal(args.length, 5, 'Usage: http-compat-compare.mjs <nest.json> <rust.json> <nest-owner-closeout.json> <rust-owner-closeout.json> <new-output.json>');
    const files = args.map(name => ({ name, target: belowEvidence(name) }));
    assert.equal(new Set(files.map(value => value.target)).size, 5, 'Distinct evidence inputs and new output required');
    assert(!existsSync(files[4].target), 'Preserve earlier comparison evidence');
    return files;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const files = parseCompareOptions(process.argv.slice(2));
    const inputs = files.slice(0, 4).map(value => ({ ...value, bytes: readFileSync(value.target) }));
    let report;
    try {
        const [nest, rust, nestOwner, rustOwner] = inputs.map(value => JSON.parse(value.bytes));
        validateLiveInputs(nest); validateLiveInputs(rust);
        report = compareReports(nest, rust, { nest: nestOwner, rust: rustOwner });
    } catch (error) {
        report = { formatVersion: 1, result: 'fail', kind: 'r2d-sequential-http-parity', failure: { name: error.name, ...(typeof error.difference === 'string' ? { difference: error.difference } : {}) }, boundary: 'Comparison failed; original input evidence is preserved. No parity/G3 claim.' };
        process.exitCode = 1;
    }
    report.inputs = inputs.map(value => ({ file: value.name, rawSha256: digest(value.bytes) }));
    writeFileSync(files[4].target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, output: files[4].name, failure: report.failure }));
}
