// Pure comparison of the root's corrected02 18-probe report. No network or DB.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { belowEvidence } from './http-compat.mjs';
import { defaultDictionaryIdentity, defaultSeedCatalog, firstDifference } from './compare-http.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fields = Object.keys(JSON.parse(readFileSync(new URL('./e-dictionary-openapi.json', import.meta.url), 'utf8')).components.schemas.DictionaryItemSummary.properties).sort();
function equal(a, b, where) { const difference = firstDifference(a, b, where); if (difference) throw Object.assign(new Error('Complete transport values differ'), { difference }); }
function failure(error, where) { return { path: error.difference ?? where, name: error.name, message: String(error.message).slice(0, 1200) }; }

export function transportPlan() {
    const entries = [];
    for (const actor of ['none', 'admin']) for (const bad of ['%FF', '%ZZ']) for (const [method, base] of [['GET', '/api/dictionaries/'], ['PATCH', '/api/dictionaries/'], ['GET', '/api/platform/system-settings/'], ['PATCH', '/api/platform/system-settings/']]) {
        const route = base + bad;
        entries.push({ id: `${actor}:${method}:${route}`, actor, method, route, status: 400, body: { message: `Failed to decode param '${bad}'`, error: 'Bad Request', statusCode: 400 }, contentType: 'application/json; charset=utf-8' });
    }
    entries.push({ id: '1001-pairs', query: 'u=1&'.repeat(1000) + 'domain=invalid', status: 200, contentType: 'application/json; charset=utf-8' });
    entries.push({ id: '1000-empty-pairs', query: '&'.repeat(1000) + 'domain=invalid', status: 200, contentType: 'application/json; charset=utf-8' });
    return entries;
}

function ownedSpecs(runId) {
    const prefix = 'e' + runId.replaceAll('-', '').slice(0, 24);
    const specs = ['attachment-category', 'sales-follow-up-type', 'expense-category', 'lead-source'].map((domain, index) => ({ domain, code: prefix + index, name: 'E Usage ' + index, description: index === 0 ? null : 'E keyword description ' + index, status: 'active', sortOrder: 10 + index, isSystem: false, usageCount: 2, rowVersion: 1, logical: 'owned-dictionary:usage-' + index }));
    for (const [suffix, name, status, isSystem] of [['u', 'E Original', 'active', true], ['n', 'E Noop', 'active', false], ['i', 'E Inactive', 'inactive', false]]) specs.push({ domain: 'lead-source', code: prefix + suffix, name, description: suffix === 'u' ? 'old' : null, status, sortOrder: 100, isSystem, usageCount: 0, rowVersion: 1, logical: 'owned-dictionary:' + suffix });
    return new Map(specs.map(spec => [spec.domain + '/' + spec.code, spec]));
}

function admission(copy, backend) {
    assert.equal(copy.backend, backend); assert(UUID.test(copy.runId));
    assert.equal(copy.cases.length, 18); assert.equal(new Set(copy.cases.map(row => row.id)).size, 18);
    assert.equal(copy.cleanup.length, 2);
    for (let index = 0; index < 2; index++) {
        const value = copy.cleanup[index]; assert.equal(value.pass, index); assert.equal(value.error, undefined);
        assert.equal(value.result.runId, copy.runId); assert.equal(value.result.backend, backend);
        assert.equal(value.result.state, 'cleaned'); assert.equal(value.result.extension.zero, true); assert.equal(value.result.extension.remaining, 0);
        assert(Object.values(value.result.cleanup.after).every(count => count === 0), 'Every base cleanup residual is zero');
        if (index === 1) { assert.equal(value.result.matched, 0); assert.equal(value.result.changed, 0); }
    }
    const actors = copy.cleanup[0].result.fixture.accounts;
    assert.equal(actors.length, 2);
    for (const actor of actors) { assert(['admin', 'viewer'].includes(actor.account)); assert(UUID.test(actor.userId)); assert.equal(actor.username, `r2ef_${actor.account}_${copy.runId.replaceAll('-', '')}`); }
    assert.equal(actors.filter(actor => actor.account === 'admin').length, 1);
    const expected = transportPlan();
    for (let index = 0; index < 18; index++) {
        const row = copy.cases[index], plan = expected[index];
        for (const [key, value] of Object.entries(plan)) equal(row[key], value, `$.${backend}.declared[${index}].${key}`);
    }
    equal(copy.cases[16].body, copy.cases[17].body, '$.' + backend + '.queryResultsRemainIdentical');
    return actors.find(actor => actor.account === 'admin').userId;
}

export function normalizeQueryBodies(copy, adminId, catalog) {
    const specifications = ownedSpecs(copy.runId), bodies = copy.cases[16].body;
    assert(Array.isArray(bodies)); assert.equal(bodies.length, 39);
    const mappings = [], clocks = [], byId = new Map(), keys = new Set();
    let defaultCount = 0, ownedCount = 0;
    for (const row of bodies) {
        equal(Object.keys(row).sort(), fields, '$.completeDictionaryProjection');
        assert(UUID.test(row.id)); assert(!byId.has(row.id));
        const key = row.domain + '/' + row.code; assert(!keys.has(key)); keys.add(key);
        let logical, owned = false, source;
        const spec = specifications.get(key);
        if (spec) {
            owned = true; ownedCount++; logical = spec.logical;
            for (const [field, value] of Object.entries(spec)) if (field !== 'logical') equal(row[field], value, '$.owned.' + logical + '.' + field);
            assert.equal(row.createdBy, adminId); assert.equal(row.updatedBy, adminId);
            for (const field of ['createdAt', 'updatedAt']) assert.equal(new Date(row[field]).toISOString(), '2026-01-01T00:00:00.000Z', 'Owned seed time stays fixed, not normalized');
            source = 'root batch-extension planned runId prefix plus exact suffix 0/1/2/3/u/n/i';
        } else {
            const value = defaultDictionaryIdentity(row, catalog);
            defaultCount++; logical = value.logical; source = value.source;
            assert(Number.isFinite(Date.parse(row.createdAt))); assert(Number.isFinite(Date.parse(row.updatedAt)));
            assert.equal(row.createdAt, row.updatedAt, 'Original unmodified default initialization timestamps are equal');
            for (const field of ['createdAt', 'updatedAt']) clocks.push({ id: row.id, logical, field, original: row[field], token: `<clock:${logical}:initial:${field}>`, source });
        }
        byId.set(row.id, { row, logical, owned, source });
        mappings.push({ originalId: row.id, domain: row.domain, code: row.code, logicalId: `<${logical}>`, ...(owned ? { logicalCode: `<code:${logical}>`, originalActorId: adminId, logicalActor: '<actor:admin>' } : {}), source });
    }
    assert.equal(defaultCount, 32); assert.equal(ownedCount, 7);
    equal([...keys].filter(key => catalog.byKey.has(key)).sort(), [...catalog.byKey.keys()].sort(), '$.completeSourceDefaults');
    equal([...keys].filter(key => specifications.has(key)).sort(), [...specifications.keys()].sort(), '$.completeRunOwnedSeeds');
    const normalized = copy.cases.slice(16).map(testCase => ({ ...testCase, body: testCase.body.map(row => {
        const record = byId.get(row.id); assert(record, 'Only explicitly registered dictionary IDs');
        equal(row, record.row, '$.immutableProbeDictionary.' + record.logical);
        const result = { ...row, id: `<${record.logical}>` };
        if (record.owned) { result.code = `<code:${record.logical}>`; result.createdBy = '<actor:admin>'; result.updatedBy = '<actor:admin>'; }
        else for (const field of ['createdAt', 'updatedAt']) result[field] = `<clock:${record.logical}:initial:${field}>`;
        return result;
    }) }));
    return { normalized, mappings, clocks };
}

export function compareETransport(input) {
    const report = { formatVersion: 1, kind: 'r2ef-corrected02-e-transport-parity', result: 'fail', expectedCases: 18, comparedCases: 0, admissionFailures: [], mappingFailures: [], differences: [], comparisons: [] };
    let nest, rust, adminNest, adminRust;
    try {
        assert.equal(input.formatVersion, 1); assert.equal(input.tag, 'corrected02', 'Initial failed probes must never be admitted as corrected evidence'); assert.equal(input.result, 'observed');
        assert.equal(input.copies.length, 2); equal(input.copies.map(copy => copy.backend), ['nest', 'rust'], '$.backends');
        [nest, rust] = input.copies; assert.notEqual(nest.runId, rust.runId);
        adminNest = admission(nest, 'nest'); adminRust = admission(rust, 'rust');
    } catch (error) { report.admissionFailures.push(failure(error, '$.admission')); return report; }
    const catalog = defaultSeedCatalog(); let left, right;
    try { left = normalizeQueryBodies(nest, adminNest, catalog); right = normalizeQueryBodies(rust, adminRust, catalog); }
    catch (error) { report.mappingFailures.push(failure(error, '$.dictionaryIdentity')); return report; }
    report.seedAuthority = { sources: catalog.sources, explanation: catalog.explanation };
    report.identityMappings = { nest: left.mappings, rust: right.mappings };
    report.clockMappings = { nest: left.clocks, rust: right.clocks };
    for (let index = 0; index < 18; index++) {
        const a = index < 16 ? nest.cases[index] : left.normalized[index - 16];
        const b = index < 16 ? rust.cases[index] : right.normalized[index - 16];
        const result = { index, id: a.id, result: 'fail' }; report.comparisons.push(result);
        try { equal(a, b, `$.cases[${index}]`); result.result = 'pass'; report.comparedCases++; }
        catch (error) { report.differences.push({ id: a.id, ...failure(error, '$.cases[' + index + ']') }); }
    }
    report.result = report.comparedCases === 18 && !report.differences.length ? 'pass' : 'fail';
    report.normalization = 'First 16 complete bad-param cases, including body/status/Content-Type/actor/method/route, are literal. Last two complete query cases keep every field and received array order. Only 32 migration-whitelisted default IDs and their immutable initialization createdAt/updatedAt clocks map by domain/code. Seven run-owned IDs/codes/createdBy/updatedBy map from the exact runId prefix and 0/1/2/3/u/n/i specifications; their Jan-1 seed times remain literal. No other UUID, date, business string, usage count, enum or version is transformed.';
    report.boundary = 'The corrected02 root-owned 18 transport observations only. Initial01 failure remains immutable and is rejected by admission; no complete-393, SQL, UI or G3/G4 claim.';
    return report;
}

function syntheticCopy(backend, runId, offset) {
    const actorId = `b0000000-0000-4000-8000-${String(offset).padStart(12, '0')}`;
    let next = offset + 10;
    const id = () => `a0000000-0000-4000-8000-${String(next++).padStart(12, '0')}`;
    const rows = [...defaultSeedCatalog().byKey.values()].map(seed => ({ id: id(), domain: seed.domain, code: seed.code, name: seed.name, description: seed.description, status: 'active', sortOrder: seed.sortOrder, isSystem: true, usageCount: 0, rowVersion: 1, createdAt: `2026-10-28T00:00:0${offset === 1 ? 1 : 2}.000Z`, createdBy: null, updatedAt: `2026-10-28T00:00:0${offset === 1 ? 1 : 2}.000Z`, updatedBy: null }));
    for (const { logical, ...spec } of ownedSpecs(runId).values()) rows.push({ id: id(), ...spec, createdAt: '2026-01-01T00:00:00Z', createdBy: actorId, updatedAt: '2026-01-01T00:00:00Z', updatedBy: actorId });
    const cases = transportPlan().map((entry, index) => index < 16 ? structuredClone(entry) : { ...entry, body: structuredClone(rows) });
    const accounts = ['admin', 'viewer'].map((account, index) => ({ account, userId: index === 0 ? actorId : id(), username: `r2ef_${account}_${runId.replaceAll('-', '')}` }));
    return { backend, runId, cases, cleanup: [0, 1].map(pass => ({ pass, result: { runId, backend, state: 'cleaned', matched: pass ? 0 : 2, changed: pass ? 0 : 10, extension: { zero: true, remaining: 0 }, cleanup: { after: { users: 0, sessions: 0 } }, fixture: { accounts } } })) };
}

export function selfTest() {
    const input = { formatVersion: 1, tag: 'corrected02', result: 'observed', copies: [syntheticCopy('nest', '10000000-0000-4000-8000-000000000001', 1), syntheticCopy('rust', '20000000-0000-4000-8000-000000000002', 100)] };
    assert.equal(compareETransport(input).result, 'pass'); assert.equal(compareETransport(input).comparedCases, 18);
    for (const mutate of [value => { value.tag = 'initial01'; }, value => { value.copies[1].cases[0].body.message = 'different'; }, value => { value.copies[1].cases[16].body.reverse(); value.copies[1].cases[17].body.reverse(); }, value => { value.copies[1].cases[16].body[0].usageCount++; value.copies[1].cases[17].body[0].usageCount++; }, value => { value.copies[1].cases[16].body[0].name = 'different'; value.copies[1].cases[17].body[0].name = 'different'; }]) {
        const changed = structuredClone(input); mutate(changed); assert.equal(compareETransport(changed).result, 'fail');
    }
    return { result: 'pass', boundary: 'Pure synthetic comparison helper tests, no actual probe parity execution or network/database/browser action' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--self-test') console.log(JSON.stringify(selfTest()));
    else {
        assert.equal(args.length, 2, 'Usage: compare-e-transport.mjs --self-test | <e-transport-win32-corrected02.json> <new-comparison.json>');
        const input = belowEvidence(args[0]), output = belowEvidence(args[1]);
        assert.equal(path.basename(input), 'e-transport-win32-corrected02.json'); assert.notEqual(input, output); assert(!existsSync(output));
        const bytes = readFileSync(input); const report = compareETransport(JSON.parse(bytes));
        report.input = { file: args[0], rawBytesSha256: digest(bytes) };
        report.comparator = { file: 'tools/rust-r2ef/compare-e-transport.mjs', normalizedLfSha256: digest(readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')) };
        writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, output: args[1], admissionFailures: report.admissionFailures.length, mappingFailures: report.mappingFailures.length, differences: report.differences.length }));
        if (report.result !== 'pass') process.exitCode = 1;
    }
}
