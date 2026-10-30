// Pure plan/source/privacy assertions. No real fixture preparation, DB, HTTP,
// application/bootstrap, environment load, browser or cleanup is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { parse } from 'node:querystring';
import { lookupHttpPlan, lookupNumbers, lookupRoute, publicLookupEvidence, lookupSensitiveFields } from './lookup-matrix.mjs';
import { emittedSourceBody, lookupMappedSourcePath, approvedLookupDelta } from './lookup-source-equivalence.mjs';
import { buildLookupPreparedTerm } from './lookup-prepared-source.mjs';
import { uuidReferences } from './fixture-references.mjs';
const run = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', projectId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', contractId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('source driver import performs no socket connect/listen or HTTP request', async () => {
    const oldConnect = net.Socket.prototype.connect, oldListen = net.Server.prototype.listen, oldRequest = http.request, attempts = [];
    const reject = (name) => function () { attempts.push(name); throw new Error('No runtime action in source test'); };
    try {
        net.Socket.prototype.connect = reject('connect'); net.Server.prototype.listen = reject('listen'); http.request = reject('http');
        const api = await import('./lookup-native-actual.mjs'); assert.equal(typeof api.runLookupNativeActual, 'function'); assert.equal(typeof api.compareLookupNativeReports, 'function');
        assert.deepEqual(attempts, []);
    } finally { net.Socket.prototype.connect = oldConnect; net.Server.prototype.listen = oldListen; http.request = oldRequest; }
});
test('finite wire plan preserves Unicode, spaces, slash, ampersand, equals, hash and literal plus', () => {
    const numbers = lookupNumbers(run);
    for (const resource of ['project', 'contract']) {
        const number = numbers[resource + 'No']; assert([...number].length <= 64); assert(number.startsWith(' ') && number.endsWith(' '));
        for (const value of ['Ω', 'é', '/', '&', '=', '#', '+']) assert(number.includes(value));
        const url = new URL(lookupRoute('current', resource, number), 'http://127.0.0.1:9700');
        assert.equal(url.hash, ''); assert.equal(parse(url.search.slice(1))[resource + 'No'], number);
        assert(url.search.includes('%2F') && url.search.includes('%2B') && url.search.includes('%23'));
    }
});
test('matrix distinguishes simple-parser duplicate, bracket and scalar-plus-unknown inputs', () => {
    const plan = lookupHttpPlan({ variant: 'current', numbers: lookupNumbers(run), projectId, contractId });
    assert.equal(new Set(plan.map(({ name }) => name)).size, plan.length);
    const query = (name) => parse(new URL(plan.find((entry) => entry.name === name).path, 'http://127.0.0.1:9700').search.slice(1));
    assert(Array.isArray(query('project.query.duplicate-same').projectNo));
    assert.equal(query('project.query.bracket-only-array').projectNo, undefined);
    assert.equal(query('project.query.scalar-plus-bracket').projectNo, lookupNumbers(run).projectNo);
    assert.equal(query('contract.query.no-max64-validation').contractNo.length, 65);
    assert.notEqual(query('contract.query.plus-is-space').contractNo, lookupNumbers(run).contractNo);
    assert.notEqual(query('contract.query.not-nfc-normalized').contractNo, lookupNumbers(run).contractNo);
    assert(plan.some((entry) => entry.name === 'contract.item-uuid' && entry.path.endsWith(contractId)));
});
test('legacy and current plans pair original status/identity cases while transport deltas stay explicit', () => {
    const input = { numbers: lookupNumbers(run), projectId, contractId }, old = lookupHttpPlan({ ...input, variant: 'legacy' }), current = lookupHttpPlan({ ...input, variant: 'current' });
    for (const previous of old.filter((entry) => entry.compare)) {
        const next = current.find(({ name }) => name === previous.name); assert(next && next.status === previous.status && next.actor === previous.actor);
    }
    assert(old.filter(({ name }) => name.endsWith('new-route-absent')).every(({ status }) => status === 404));
    assert(current.filter(({ name }) => name.endsWith('old-route-removed')).every(({ status }) => status === 404));
    assert(current.some(({ actor, status }) => actor === 'denied' && status === 403)); assert(current.some(({ actor, status }) => actor === 'anonymous' && status === 401));
});
test('sourcemap source checking normalizes only LF and terminal sourceMappingURL', () => {
    assert.equal(lookupMappedSourcePath('webpack:///./src/main.ts'), 'apps/poms-api/src/main.ts');
    assert.equal(lookupMappedSourcePath('webpack:///../../libs/shared/contracts/src/index.ts'), 'libs/shared/contracts/src/index.ts');
    assert.equal(lookupMappedSourcePath('webpack:///external commonjs "@nestjs/core"'), null);
    assert.equal(emittedSourceBody('const x = 1;\r\n//# sourceMappingURL=x.js.map\r\n'), 'const x = 1;\n');
    assert.notEqual(emittedSourceBody('const x = 1;\n'), emittedSourceBody('const x = 2;\n'));
    assert.equal(approvedLookupDelta.length, 11); assert(approvedLookupDelta.includes('libs/shared/api-spec/openapi.json'));
});
test('recursive public evidence removes nested credentials and known secret substrings but keeps raw audited query', () => {
    const token = 'real-token-memory-only', rawPath = '/api/contracts:lookup?contractNo=A%2f%20B%2BC&unknown[]=x';
    const input = { body: { token, nested: [{ csrfToken: 'csrf-memory-only', password_hash: 'bcrypt-only' }] }, error: 'bad ' + token, audit: { path: rawPath } };
    const result = publicLookupEvidence(input, new Set([token])); const serialized = JSON.stringify(result);
    for (const secret of [token, 'csrf-memory-only', 'bcrypt-only']) assert(!serialized.includes(secret));
    assert.equal(result.audit.path, rawPath); assert.equal(input.body.token, token);
    const metadata = publicLookupEvidence({ default: 1n, at: new Date('2026-01-01T00:00:00.000Z') });
    assert.equal(JSON.stringify(metadata), '{"default":{"kind":"bigint","decimal":"1"},"at":"2026-01-01T00:00:00.000Z"}');
});
test('single prepared term is an exact named source projection and never a Native business-producer certificate', async () => {
    const metadata = JSON.parse(fs.readFileSync('tmp/rust-r2l/metadata-export01/schema-input.json', 'utf8')).metadata;
    const actorId = randomUUID(), orgId = randomUUID(), actualContract = randomUUID();
    const built = await buildLookupPreparedTerm({ runId: run, actorId, orgId, projectId, contractId: actualContract, metadata });
    assert.equal(built.row.table, 'contract_term_snapshot'); assert.equal(built.row.values.contract_id, actualContract); assert.equal(built.row.values.created_by, actorId);
    assert.equal(built.provenance.NativeBusinessProducerClaimed, false); assert.equal(built.provenance.selectedOriginalRows, 1); assert.equal(built.provenance.excludedOtherPreparedRows, 17);
    assert.equal(built.provenance.actualPhysicalNoDefaultCheckStillRequired, true); assert.equal(built.provenance.allOtherPreparedTablesExecuted, false);
    assert(lookupSensitiveFields.every(([column]) => !Object.hasOwn(built.row.values, column)), 'Original minimal INSERT omits the nullable core terms');
    for (const [column] of lookupSensitiveFields) assert(Object.hasOwn(built.nonnullPreparation.values, column) && typeof built.nonnullPreparation.values[column] === 'string');
    assert.equal(built.nonnullPreparation.provenance.inputHelper.function, 'buildCommercialReleaseBaselineInput');
    assert.equal(built.nonnullPreparation.provenance.originalCopySite.method, 'ContractService.activate');
    assert.equal(built.nonnullPreparation.provenance.NativeBusinessProducerClaimed, false);
    const known = new Set([built.row.values.id, actualContract, actorId]); assert(uuidReferences(built.row.values).every(({ id }) => known.has(id)));
    assert(!Object.hasOwn(built.row.values, 'source_readiness_id')); assert.equal(built.row.expectedIdentity.source_readiness_id, null);
});
test('cleanup refuses an absent handle after attempted startup, unknown listener or still-listening handle', async () => {
    const { lookupNativeStoppedForCleanup } = await import('./lookup-native-actual.mjs');
    assert.equal(lookupNativeStoppedForCleanup(false, undefined), true);
    assert.equal(lookupNativeStoppedForCleanup(true, undefined), false);
    assert.equal(lookupNativeStoppedForCleanup(true, { isListening: () => true }), false);
    assert.equal(lookupNativeStoppedForCleanup(true, { isListening: () => { throw new Error('unknown'); } }), false);
    assert.equal(lookupNativeStoppedForCleanup(true, { isListening: () => false }), true);
});
test('actual comparator rejects same process and semantic differences after narrowly declared fresh-ID/time normalization', async () => {
    const { compareLookupNativeReports } = await import('./lookup-native-actual.mjs');
    const make = (variant, processId) => { const id = randomUUID(), actor = randomUUID(); return { variant, processId, result: 'observed', doubleZero: true, runId: randomUUID(), deniedRunId: randomUUID(), ownedIdentities: { projectId: id, contractId: randomUUID(), numbers: {} }, freshIdentityMap: { project: id, admin: actor }, requests: [{ name: 'project.full-success', compare: true, response: { status: 200, body: { id, createdBy: actor, createdAt: new Date().toISOString(), amount: '1.00' } } }] }; };
    const previous = make('legacy', 1), current = make('current', 2); assert.equal(compareLookupNativeReports(previous, current).pairs.length, 1);
    assert.throws(() => compareLookupNativeReports(previous, { ...current, processId: 1 }), /Independent Node processes/);
    current.requests[0].response.body.amount = '2.00'; assert.throws(() => compareLookupNativeReports(previous, current), /semantic body differs/);
});
