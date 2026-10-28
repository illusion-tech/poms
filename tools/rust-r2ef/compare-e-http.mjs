// Affected E54 parity only. The passed complete393 comparator remains unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { belowEvidence } from './http-compat.mjs';
import { eHttpCases } from './e-http-plan.mjs';
import { buildMapper, normalizeBody, normalizeValue, firstDifference } from './compare-http.mjs';
import { sourceHead } from './fixture-guard.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const HELPER_HASH = '0c8e810c9dd120391ef429b08d05c822e904f4c58f7702479d31fc42012409d7';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function equal(a, b, where) { const difference = firstDifference(a, b, where); if (difference) throw Object.assign(new Error('Complete affected-E54 values differ'), { difference }); }
function failure(error, where) { return { path: error.difference ?? where, name: error.name, message: String(error.message).slice(0, 1200) }; }
function helperReceipt() {
    const normalizedLfSha256 = hash(readFileSync(new URL('./compare-http.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
    assert.equal(normalizedLfSha256, HELPER_HASH, 'Reuse the exact comparator source that passed complete393');
    return { file: 'tools/rust-r2ef/compare-http.mjs', normalizedLfSha256 };
}
function facts(run, digest) {
    const value = run.facts?.[digest]; assert(value, 'Actual facts payload required'); assert.equal(hash(JSON.stringify(value)), digest);
    for (const table of ['dictionaries', 'audits', 'securityEvents']) assert(Array.isArray(value[table]));
    return value;
}
function wireAdmission(wire, method) {
    assert(wire && Number.isInteger(wire.status)); assert.equal(typeof wire.contentType, 'string'); assert.equal(typeof wire.rawBody, 'string');
    assert.equal(Buffer.byteLength(wire.rawBody), wire.bodyByteLength); assert.equal(wire.jsonParseError, undefined);
    assert(!Object.keys(wire.headers ?? {}).some(key => key.toLowerCase() === 'set-cookie'));
    if (method === 'HEAD') { assert.equal(wire.bodyByteLength, 0); assert.equal(wire.body, null); }
    else if (wire.contentType.includes('application/json') && wire.rawBody) equal(JSON.parse(wire.rawBody), wire.body, '$.rawJsonRepresentation');
    else equal(wire.rawBody || null, wire.body, '$.literalHttpRepresentation');
    if (method !== 'HEAD' && wire.headers['content-length'] !== undefined) assert.equal(Number(wire.headers['content-length']), wire.bodyByteLength);
}

export function validateEAdmission(run, backend) {
    assert.equal(run.formatVersion, 1); assert.equal(run.kind, 'r2ef-single-backend-http-observation');
    assert.equal(run.backend, backend); assert.equal(run.sourceHead, sourceHead); assert(UUID.test(run.runId));
    assert.equal(run.result, 'observed'); assert.equal(run.assertions, 'pass'); assert.equal(run.equivalenceClaim, false);
    assert.equal(run.selection, 'E', 'Only affected E selection can enter this comparator');
    assert.equal(run.coverage.selection, 'E'); assert.equal(run.coverage.plannedE, 54); assert.equal(run.coverage.plannedF, 0);
    assert.equal(run.coverage.rejectedDto.selection, 'E');
    for (const field of ['plannedHttp', 'exactDto', 'parserOnly']) assert.equal(run.coverage.rejectedDto[field], 0);
    equal(run.coverage.rejectedDto.sourceOnly, [], '$.affected.sourceOnly'); equal(run.deferredAssertions, [], '$.affected.deferred');
    assert.equal(run.counts.selection, 'E');
    for (const field of ['plannedCases', 'attemptedCases', 'passedCaseAssertions']) assert.equal(run.counts[field], 54);
    for (const field of ['failedCases', 'exactDtoHttpResponses', 'parserOnlyHttpResponses', 'deferredAssertions']) assert.equal(run.counts[field], 0);
    assert.equal(run.counts.capturedCaseHttpResponses, 56); assert.equal(run.counts.actualFactsCaptures, 56);
    assert.equal(run.observations.length, 54); assert.equal(new Set(run.observations.map(row => row.id)).size, 54);
    assert.equal(run.counts.distinctFactsPayloads, Object.keys(run.facts).length); assert.equal(run.factCaptures.length, 56);
    for (const field of ['failure', 'sourceFailure', 'finalFactsFailure']) assert.equal(run[field], undefined, 'No suppressed ' + field);
    equal(run.inputHashesBefore, run.inputHashesAfter, '$.affected.source.beforeAfter');
    assert.equal(run.inputHashesBefore.length, 10); assert.equal(new Set(run.inputHashesBefore.map(row => row.file)).size, 10);
    for (const row of run.inputHashesBefore) assert(/^[a-f0-9]{64}$/.test(row.normalizedLfSha256));
    const planHash = run.inputHashesBefore.filter(row => row.file === 'tools/rust-r2ef/e-http-plan.mjs'); assert.equal(planHash.length, 1);
    assert.equal(planHash[0].normalizedLfSha256, hash(readFileSync(new URL('./e-http-plan.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n')), 'Rebuild from the exact admitted original E54 plan');
    assert.equal(run.cleanupCompleted, true); assert.equal(run.cleanup.length, 2);
    for (const [index, item] of run.cleanup.entries()) {
        assert.equal(item.pass, index); assert.equal(item.error, undefined); assert.equal(item.result.state, 'cleaned');
        assert.equal(item.result.extension.zero, true); assert.equal(item.result.extension.remaining, 0);
        if (index === 1) { assert.equal(item.result.matched, 0); assert.equal(item.result.changed, 0); }
    }
    const initial = run.factCaptures.filter(capture => capture.label === 'initial'); assert.equal(initial.length, 1);
    let previous = initial[0].sha256;
    for (const row of run.observations) {
        assert.equal(row.side, 'E'); assert.equal(row.result, 'observed'); equal(row.errors, [], '$.caseErrors.' + row.id);
        assert.equal(row.dtoStage, undefined); assert.equal(row.sourceCase, undefined);
        assert.equal(row.beforeFacts, previous, 'Actual PG facts continuity'); facts(run, row.beforeFacts); facts(run, row.afterFacts); previous = row.afterFacts;
        wireAdmission(row.wire, row.method); assert.equal(row.wire.status, row.expectedStatus);
        if (row.method === 'HEAD') {
            wireAdmission(row.headReference, 'GET'); assert.equal(row.headReference.status, row.wire.status); assert.equal(row.headReference.contentType, row.wire.contentType);
            assert.equal(Number(row.wire.headers['content-length']), row.headReference.bodyByteLength);
        }
    }
    for (const capture of run.factCaptures) { assert(Number.isFinite(Date.parse(capture.capturedAt))); facts(run, capture.sha256); }
}

export function declaredEPlan(extension) {
    return eHttpCases({ dictionaryId: extension.dictionaryUpdateId, missingId: extension.missingId, createCode: extension.eCreatedCode }).map(entry => ({
        id: entry.id, side: 'E', actor: entry.actor ?? (entry.actorOnlyPermission ? { onlyPermission: entry.actorOnlyPermission } : 'admin'), method: entry.method, route: entry.route, expectedStatus: entry.expectedStatus,
        request: { ...(entry.options ?? {}), ...(entry.headers ? { headers: entry.headers } : {}), ...(entry.omitCsrf ? { csrf: false } : {}), ...(Object.hasOwn(entry, 'json') ? { json: entry.json } : {}), ...(Object.hasOwn(entry, 'body') ? typeof entry.body === 'string' && entry.contentType ? { body: entry.body, contentType: entry.contentType } : { json: entry.body } : {}), ...(entry.rawBody !== undefined ? { body: entry.rawBody, contentType: entry.contentType } : {}) }
    }));
}
function normalizeRoute(route, mapper) {
    let result = route;
    // Only the explicit identities supplied by the unchanged complete393
    // mapper are substituted, after this raw route matches its declared plan.
    for (const [raw, logical] of [...mapper.values].sort(([a], [b]) => b.length - a.length)) for (const value of new Set([raw, encodeURIComponent(raw)])) if (result.includes(value)) result = result.split(value).join(logical);
    return result;
}
function wireView(row, wire, mapper) { return { status: wire.status, contentType: wire.contentType, body: normalizeBody(row, wire, mapper), setCookieCount: wire.setCookieCount }; }

export function compareEHttp(nest, rust) {
    const report = { formatVersion: 1, kind: 'r2ef-affected-E54-http-parity', selection: 'E', result: 'fail', sourceHead, expectedCases: 54, plannedF: 0, plannedDto: 0, comparedCases: 0, admissionFailures: [], mappingFailures: [], planDifferences: [], responseDifferences: [], clockValidationFailures: [], headObservations: [], comparisons: [] };
    for (const [backend, run] of [['nest', nest], ['rust', rust]]) try { validateEAdmission(run, backend); } catch (error) { report.admissionFailures.push({ backend, ...failure(error, '$.admission.' + backend) }); }
    if (report.admissionFailures.length) return report;
    try {
        report.reusedHelper = helperReceipt();
        assert.equal(nest.platform, 'win32', 'This affected run uses the actual Windows Nest client report'); assert.equal(rust.platform, 'linux', 'This affected run uses the actual Linux Rust client report');
        assert(/^v24\./.test(nest.runtime.node) && /^v24\./.test(rust.runtime.node));
        equal(nest.coverage, rust.coverage, '$.affected.coverage'); equal(nest.inputHashesBefore, rust.inputHashesBefore, '$.affected.sharedCandidateInputs');
    } catch (error) { report.admissionFailures.push(failure(error, '$.affectedCandidate')); return report; }
    let left, right, planLeft, planRight;
    try {
        left = buildMapper(nest); right = buildMapper(rust);
        equal(left.seedKeys, right.seedKeys, '$.fixedPgSentinelSeedIdentities');
        equal([...left.externalDictionaryKeys.values()].sort(), [...right.externalDictionaryKeys.values()].sort(), '$.sourceBoundDefaultDictionaryKeys');
        equal(left.defaultSeeds.sources, right.defaultSeeds.sources, '$.defaultSeedSourceEpoch');
        planLeft = declaredEPlan(left.extension); planRight = declaredEPlan(right.extension); assert.equal(planLeft.length, 54); assert.equal(planRight.length, 54);
    } catch (error) { (String(error.message).includes('clock') || String(error.message).includes('timestamp') ? report.clockValidationFailures : report.mappingFailures).push(failure(error, '$.logicalMapping')); return report; }
    report.platforms = { nest: { platform: nest.platform, runtime: nest.runtime }, rust: { platform: rust.platform, runtime: rust.runtime } };
    report.sourceEpoch = nest.inputHashesBefore;
    report.identityMappings = { nest: left.declarations, rust: right.declarations };
    report.clockMappings = { nest: left.clockDeclarations, rust: right.clockDeclarations };
    report.defaultDictionaryAuthority = { sources: left.defaultSeeds.sources, identities: [...left.defaultSeeds.byKey.keys()].sort(), explanation: left.defaultSeeds.explanation };
    for (let index = 0; index < 54; index++) {
        const a = nest.observations[index], b = rust.observations[index], wantedA = planLeft[index], wantedB = planRight[index];
        const entry = { index, id: a.id, result: 'fail' }; report.comparisons.push(entry);
        try {
            for (const [actual, wanted] of [[a, wantedA], [b, wantedB]]) for (const key of ['id', 'side', 'actor', 'method', 'route', 'expectedStatus', 'request']) equal(actual[key], wanted[key], `$.declaredE[${index}].${key}`);
            const logicalPlan = (row, mapper) => ({ id: row.id, side: row.side, actor: row.actor, method: row.method, route: normalizeRoute(row.route, mapper), expectedStatus: row.expectedStatus, request: normalizeValue(row.request, mapper) });
            equal(logicalPlan(a, left), logicalPlan(b, right), `$.affectedPlan[${index}]`);
        } catch (error) { report.planDifferences.push({ id: a.id, ...failure(error, '$.plan[' + index + ']') }); continue; }
        try {
            equal(wireView(a, a.wire, left), wireView(b, b.wire, right), `$.affectedResponse[${index}]`);
            if (a.method === 'HEAD') {
                equal(wireView({ ...a, method: 'GET' }, a.headReference, left), wireView({ ...b, method: 'GET' }, b.headReference, right), `$.affectedHeadGetReference[${index}]`);
                report.headObservations.push({ id: a.id, nestContentLength: a.wire.headers['content-length'], rustContentLength: b.wire.headers['content-length'], bothBodiesEmpty: true, ownCompleteGetValidated: true });
            }
            entry.result = 'pass'; report.comparedCases++;
        } catch (error) { (String(error.message).includes('clock') || String(error.message).includes('timestamp') ? report.clockValidationFailures : report.responseDifferences).push({ id: a.id, ...failure(error, '$.response[' + index + ']') }); }
    }
    report.result = report.comparedCases === 54 && ![report.admissionFailures, report.mappingFailures, report.planDifferences, report.responseDifferences, report.clockValidationFailures].some(rows => rows.length) ? 'pass' : 'fail';
    report.normalization = 'Directly reuses frozen complete393 buildMapper/normalizeBody/normalizeValue. Only registered identities and explicit dictionary/setting createdAt/updatedAt clocks transform; source-backed 32 default domain/code IDs, initial seven owned rows, actual HTTP-created row, missing UUID and actors stay provenance-bound. All business fields, complete JSON/HTML/error bodies and response array ordering remain. Both complete HEAD GET references compare; actual lengths remain recorded.';
    report.boundary = 'Affected E54 increment only: 54 case responses plus two actual HEAD GET references. F HTTP, DTO corpus and complete393 are not executed or re-certified. Preserved F fixture sentinels only support unchanged mapper integrity; prior complete393, corrected18, SQL, UI and G3/G4 evidence remain separate.';
    return report;
}

export function selfTest() {
    helperReceipt();
    const extension = { dictionaryUpdateId: 'a0000000-0000-4000-8000-000000000001', missingId: 'a0000000-0000-4000-8000-000000000002', eCreatedCode: 'e-pure-affected' };
    const plan = declaredEPlan(extension); assert.equal(plan.length, 54); assert.equal(new Set(plan.map(row => row.id)).size, 54);
    assert.equal(plan[0].id, 'e:dictionary-list'); assert.equal(plan[53].id, 'e:settings-wrong-permission'); assert.equal(plan.filter(row => row.method === 'HEAD').length, 2);
    assert.throws(() => validateEAdmission({ formatVersion: 1, kind: 'r2ef-single-backend-http-observation', backend: 'nest', sourceHead, runId: 'a0000000-0000-4000-8000-000000000001', result: 'observed', assertions: 'pass', equivalenceClaim: false, selection: 'all' }, 'nest'));
    assert(firstDifference({ body: '<html>error</html>' }, { body: '<html>error!</html>' }));
    assert(firstDifference({ body: [{ status: 'active', rowVersion: 1 }] }, { body: [{ status: 'inactive', rowVersion: 1 }] }));
    assert.equal(firstDifference({ body: { value: 1, code: 'same' } }, { body: { code: 'same', value: 1 } }), null);
    return { result: 'pass', kind: 'pure-affected-E54-comparison-helpers', plannedE: 54, plannedF: 0, plannedDto: 0, boundary: 'Pure source/plan/helper checks only; no actual comparison, HTTP, DB, services or browser executed' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--self-test') console.log(JSON.stringify(selfTest()));
    else {
        assert.equal(args.length, 3, 'Usage: compare-e-http.mjs --self-test | <WinNest-E54.json> <LinuxRust-E54.json> <new-comparison.json>');
        const files = args.map(name => ({ name, file: belowEvidence(name) })); assert.equal(new Set(files.map(row => row.file)).size, 3); assert(!existsSync(files[2].file));
        const inputs = files.slice(0, 2).map(row => ({ ...row, bytes: readFileSync(row.file) }));
        let report;
        try { report = compareEHttp(...inputs.map(row => JSON.parse(row.bytes))); }
        catch (error) { report = { formatVersion: 1, kind: 'r2ef-affected-E54-http-parity', selection: 'E', result: 'fail', expectedCases: 54, failure: failure(error, '$.comparison') }; }
        report.inputs = inputs.map(row => ({ file: row.name, rawBytesSha256: hash(row.bytes) }));
        report.comparator = { file: 'tools/rust-r2ef/compare-e-http.mjs', normalizedLfSha256: hash(readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')) };
        writeFileSync(files[2].file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ result: report.result, kind: report.kind, comparedCases: report.comparedCases, output: files[2].name, admissionFailures: report.admissionFailures?.length, mappingFailures: report.mappingFailures?.length, planDifferences: report.planDifferences?.length, responseDifferences: report.responseDifferences?.length, clockValidationFailures: report.clockValidationFailures?.length }));
        if (report.result !== 'pass') process.exitCode = 1;
    }
}
