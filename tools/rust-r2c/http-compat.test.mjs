import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { operationCases, uriCases, headCases, dtoCases, completeCasePlan, coverageManifest } from './http-compat-cases.mjs';
import { wireRequest } from './http-compat-wire.mjs';
import { readResponseOrganizationFacts, validateServerReceipt } from './http-compat.mjs';
import { metadataSql } from './fixture-guard.mjs';

const id = 'a0000000-0000-4000-8000-000000000001';
test('eight operations,49 raw URI cases and15 implicit HEAD cases retain their exact coverage', () => {
    assert.equal(operationCases(id, 'code').length, 8);
    const uris = uriCases(id, 'b0000000-0000-4000-8000-000000000001', 'code');
    assert.equal(uris.length, 49);
    assert.equal(new Set(uris.map((row) => row.id)).size, 49);
    assert.deepEqual(
        uris.filter((row) => row.variant === 'encoded-colon').map((row) => [row.method, row.matched]),
        [
            ['POST', false],
            ['POST', false],
            ['POST', false]
        ]
    );
    const heads = headCases(id);
    assert.equal(heads.length, 15);
    assert(heads.every((row) => row.method === 'HEAD' && ['tree', 'list', 'detail'].includes(row.operation)));
    assert.equal(heads.filter((row) => row.matched).length, 9);
    const golden = JSON.parse(readFileSync(new URL('./org-units-golden.json', import.meta.url), 'utf8'));
    const invalid = dtoCases(golden, id);
    assert.equal(invalid.length, 155);
    assert.equal(new Set(invalid.map((row) => row.id)).size, 155);
    assert(!invalid.some((row) => row.id.includes('own-undefined')));
    assert.equal(completeCasePlan().length, 354);
    assert.equal(coverageManifest().expectedCaseIds.length, 354);
    assert.throws(() => coverageManifest().expectedCaseIds.push('invented'), 'The pre-execution expected plan is immutable');
    assert.equal(coverageManifest().planSha256, '091dee975716d6b4e2ae5472def888bd724c58471ceb451aaab4ef1bc9132fde');
});
test('raw wire admission preserves encoded/static case and never changes the host or exports cookies', () => {
    const session = {
        origin: 'http://127.0.0.1:5300',
        identity: { userAgent: 'synthetic', requestId: 'r2c:' + randomUUID() },
        cookies: new Map([
            ['poms_session', 'synthetic-session'],
            ['poms_csrf', 'synthetic-csrf']
        ])
    };
    const wire = wireRequest(session, 'POST', '/API/PLATFORM/ORG-UNITS/ABC%2Fid%3Amove/?raw=1', { json: { description: '\ud800' } });
    assert.equal(wire.origin, session.origin);
    assert.equal(wire.options.path, '/API/PLATFORM/ORG-UNITS/ABC%2Fid%3Amove/?raw=1');
    assert.equal(wire.body.toString(), '{"description":"\\ud800"}');
    assert.throws(() => wireRequest(session, 'GET', 'https://external.invalid/api/platform/org-units'));
    assert.throws(() => wireRequest(session, 'GET', '/api/platform/org-units\r\nHost: external.invalid'));
    const head = wireRequest(session, 'HEAD', '/api/platform/org-unit-tree');
    assert(!head.options.headers.includes('X-CSRF-Token'));
});
test('runner requires the coordinator exact backend/origin/PID/binary/source receipt', () => {
    const receipt = {
        backend: 'nest',
        origin: 'http://127.0.0.1:5300',
        pid: 123,
        binarySha256: 'a'.repeat(64),
        sourceHead: '705973835d4c823ae8aa3988976e8d6a13b31dfe',
        aliveBefore: true,
        processIdentity: { pid: 123, startTicks: '123456' },
        sourceFiles: [{ file: 'apps/poms-api-rust/src/lib.rs', sha256: 'd'.repeat(64) }]
    };
    assert.deepEqual(validateServerReceipt(receipt, 'nest', receipt.origin), receipt);
    for (const value of [
        { ...receipt, backend: 'rust' },
        { ...receipt, origin: 'http://127.0.0.1:5301' },
        { ...receipt, aliveBefore: false },
        { ...receipt, pid: 0 },
        { ...receipt, binarySha256: 'unknown' },
        { ...receipt, sourceHead: '0'.repeat(40) },
        { ...receipt, processIdentity: undefined },
        { ...receipt, processIdentity: { pid: 999, startTicks: '123456' } },
        { ...receipt, processIdentity: { pid: 123, startTicks: '0' } },
        { ...receipt, sourceFiles: [] },
        { ...receipt, sourceFiles: [{ file: '../outside.rs', sha256: 'd'.repeat(64) }] },
        { ...receipt, sourceFiles: [{ file: 'apps/poms-api-rust/src/lib.rs', sha256: 'unknown' }] }
    ])
        assert.throws(() => validateServerReceipt(value, 'nest', receipt.origin));
    const source = readFileSync(new URL('./http-compat.mjs', import.meta.url), 'utf8');
    assert(!/\bstartApiServer\s*\(|\bstartOwned\s*\(|\bstopOwned\s*\(/.test(source));
    assert(!source.includes('expectedCaseIds.push'), 'Expected plan must never be generated from executed observations');
});

test('response observer admits only the fixed low-role managed database and one fixed UUID lookup inside READ ONLY', async () => {
    const plan = {
        target: { mode: 'managed-nest' },
        managedEnvironment: { childEnv: { DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_DATABASE: 'poms_r2c_nest', DB_USER: 'poms_r2c_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true', DB_PASSWORD: 'a'.repeat(64) } }
    };
    const organizations = [{ id }, { id: 'b0000000-0000-4000-8000-000000000001' }];
    const metadata = {
        database: 'poms_r2c_nest',
        session_user: 'poms_r2c_app',
        current_user: 'poms_r2c_app',
        version: '150012',
        port: '15432',
        isolated: 'on',
        database_owner: 'poms_r0e_owner',
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolbypassrls: false,
        rolreplication: false,
        schema_create: false,
        public_schema_create: false,
        database_create: false,
        marker_access: false,
        role_memberships: 0
    };
    let factoryCalls = 0;
    async function run(rows = organizations.map((org) => ({ data: { ...org, created_at: '2026-01-01T00:00:00.123456Z', updated_at: '2026-01-01T00:00:00.123456Z' } })), overridePlan = plan, selected = organizations) {
        let readOnly = false,
            closed = false;
        const queries = [];
        const result = await readResponseOrganizationFacts(overridePlan, 'nest', selected, (config) => {
            factoryCalls++;
            assert.equal(config.host, '127.0.0.1');
            assert.equal(config.port, 15432);
            assert.equal(config.database, 'poms_r2c_nest');
            assert.equal(config.user, 'poms_r2c_app');
            return {
                connect: async () => undefined,
                end: async () => {
                    closed = true;
                },
                query: async (sql, args) => {
                    queries.push(sql);
                    if (sql === 'BEGIN READ ONLY') {
                        assert.equal(readOnly, false);
                        readOnly = true;
                        return {};
                    }
                    if (sql === 'ROLLBACK') {
                        assert.equal(readOnly, true);
                        readOnly = false;
                        return {};
                    }
                    assert.equal(readOnly, true, 'Every metadata and organization SELECT needs a read-only transaction');
                    if (sql === metadataSql) return { rows: [metadata] };
                    assert.equal(sql, 'select to_jsonb(o) as data from poms.org_unit o where o.id=any($1::uuid[])');
                    assert.deepEqual(args, [organizations.map((org) => org.id)]);
                    return { rows };
                }
            };
        });
        assert(closed);
        assert.equal(readOnly, false);
        assert.equal(queries.filter((sql) => sql.startsWith('select to_jsonb')).length, 1);
        return result;
    }
    const result = await run();
    assert.deepEqual(
        result.requestedIds,
        organizations.map((org) => org.id)
    );
    assert.equal(result.readOnly, true);
    await assert.rejects(() => run([]));
    await assert.rejects(() => run([{ data: organizations[0] }, { data: organizations[0] }]));
    const calls = factoryCalls;
    for (const [key, value] of [
        ['DB_HOST', 'external.invalid'],
        ['DB_DATABASE', 'poms'],
        ['DB_USER', 'poms_r0e_owner'],
        ['DB_PORT', '5432']
    ]) {
        const invalid = structuredClone(plan);
        invalid.managedEnvironment.childEnv[key] = value;
        await assert.rejects(() => run(undefined, invalid));
    }
    await assert.rejects(() => run(undefined, plan, [{ id: id.toUpperCase() }]));
    assert.equal(factoryCalls, calls, 'Invalid target/identities must fail before opening a connection');
});
