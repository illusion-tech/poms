import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { adoptOrgs, orgFixture } from './fixture-orgs.mjs';
import { plannedJournal, validateJournal } from './fixture-journal.mjs';
import { validateAmbient, validateSource, validateMarker, marker } from './fixture-guard.mjs';
import { executeFixture } from './fixture-run.mjs';
import { mutate } from './fixture-core.mjs';
import { securitySnapshot } from './fixture-snapshot.mjs';
import { EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS } from './catalog-org-units.mjs';
const require = createRequire(import.meta.url);
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const runId = randomUUID();
const request = { formatVersion: 1, runId, backend: 'nest', account: 'none', action: 'prepare' };
test('original UI route-denial observation admits only its controller shape', () => {
    const row = {
        id: randomUUID(),
        eventType: 'authz.route.denied',
        actorId: randomUUID(),
        principal: 'synthetic',
        requestId: null,
        path: '/platform/org-units',
        method: 'ROUTE',
        permissionKey: 'platform:org-units:manage',
        result: 'blocked',
        details: { requiredPermissions: ['platform:org-units:manage'], returnUrl: null },
        occurredAt: new Date()
    };
    assert.equal(securitySnapshot(row).eventType, 'authz.route.denied');
    for (const change of [{ method: 'POST' }, { result: 'success' }, { details: { requiredPermissions: [], returnUrl: 1 } }, { details: { requiredPermissions: [], returnUrl: null, unknown: true } }, { eventType: 'authz.permission.denied' }])
        assert.throws(() => securitySnapshot({ ...row, ...change }));
});
function incoming() {
    return EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS.map((e) => ({
        ...e,
        source_columns: [e.column],
        target_schema: 'poms',
        target_table: 'org_unit',
        target_columns: ['id'],
        update_action: 'c',
        match_type: 's',
        convalidated: true,
        condeferrable: false,
        condeferred: false
    }));
}
function plannedOrg(journal, slot = 'main', parentSlot = null) {
    const entry = { slot, orgId: null, initialCode: orgFixtureSpec(journal.runId, slot).databaseCode, parentSlot, deleted: false };
    journal.orgs.push(entry);
    return entry;
}
test('protocol rejects arbitrary IDs, SQL, slots, misbound parents and session tokens', () => {
    const good = { ...request, action: 'org-plan', orgSlot: 'child', parentSlot: 'main' };
    assert.equal(parseFixtureRequest(Buffer.from(JSON.stringify(good))).parentSlot, 'main');
    for (const change of [{ orgId: randomUUID() }, { sql: 'delete from org_unit' }, { orgSlot: 'unknown' }, { parentSlot: 'child' }, { action: 'org-adopt' }, { sessionToken: 'secret' }, { backend: 'poms' }, { account: 'admin' }])
        assert.throws(() => parseFixtureRequest(Buffer.from(JSON.stringify({ ...good, ...change }))));
});
test('journal binds run, code, order of parent adoption and unique IDs', () => {
    const journal = plannedJournal(request);
    const root = plannedOrg(journal);
    root.orgId = randomUUID();
    plannedOrg(journal, 'child', 'main');
    assert.equal(validateJournal(journal, request), journal);
    for (const change of [(j) => (j.runId = randomUUID()), (j) => (j.orgs[0].initialCode = 'unowned'), (j) => (j.orgs[0].orgId = j.accounts[0].orgId), (j) => j.orgs.reverse(), (j) => (j.orgs[1].deleted = true)]) {
        const modified = structuredClone(journal);
        change(modified);
        assert.throws(() => validateJournal(modified, request));
    }
});
test('creation intent is persisted before separately issued product HTTP; preexisting code refuses', async () => {
    const journal = plannedJournal(request),
        writes = [];
    const client = { query: async () => ({ rows: [] }) };
    const result = await orgFixture(client, { ...request, action: 'org-plan', orgSlot: 'main' }, journal, { write: async (v) => writes.push(structuredClone(v)) });
    assert.equal(result.org.orgId, null);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].orgs[0].initialCode, orgFixtureSpec(runId, 'main').databaseCode);
    await assert.rejects(orgFixture({ query: async () => ({ rows: [{ id: randomUUID() }] }) }, { ...request, action: 'org-plan', orgSlot: 'second' }, journal, { write: async () => assert.fail('preexisting must not journal') }));
});
test('lost-response adoption checks exact intent and actor; later mutable code uses UUID alone', async () => {
    const journal = plannedJournal(request),
        entry = plannedOrg(journal),
        spec = orgFixtureSpec(runId, 'main'),
        id = randomUUID();
    const row = { id, code: spec.databaseCode, name: spec.name, description: spec.description, parent_id: null, display_order: spec.displayOrder, is_active: true, created_by: null, updated_by: null };
    const queries = [];
    const client = {
        query: async (sql, params) => {
            queries.push({ sql, params });
            return { rows: sql.includes('audit_log') ? [{ count: 0 }] : [{ ...row, code: entry.orgId === null ? spec.databaseCode : 'code-was-changed' }] };
        }
    };
    await adoptOrgs(client, journal);
    assert.equal(entry.orgId, id);
    queries.length = 0;
    await adoptOrgs(client, journal);
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /where id=\$1 for update/);
    assert.deepEqual(queries[0].params, [id]);
    const pending = plannedJournal(request);
    plannedOrg(pending);
    await assert.rejects(adoptOrgs({ query: async (sql) => ({ rows: sql.includes('audit_log') ? [{ count: 1 }] : [row] }) }, pending), /foreign_actor/);
    await assert.rejects(adoptOrgs({ query: async () => ({ rows: [{ ...row, name: 'foreign' }] }) }, pending), /unexpected_create/);
});
test('leaf deletion refuses any reference and records a completed deletion by UUID', async () => {
    const journal = plannedJournal(request),
        entry = plannedOrg(journal);
    entry.orgId = randomUUID();
    const sqls = [];
    const client = {
        query: async (sql) => {
            sqls.push(sql);
            return sql.startsWith('select *') ? { rows: [{ id: entry.orgId }] } : sql.includes('::int as count') ? { rows: [{ count: 1 }] } : { rows: [], rowCount: 1 };
        }
    };
    await assert.rejects(orgFixture(client, { ...request, action: 'org-delete-owned-leaf', orgSlot: 'main' }, journal, { write: async () => undefined }), /referenced_leaf/);
    assert(!sqls.some((sql) => sql.startsWith('delete')));
    assert.equal(entry.deleted, false);
});
test('cleanup holds owned locks through commit; foreign/unknown FK aborts without deletes', async () => {
    for (const refuse of [false, 'external', 'unknown']) {
        const journal = plannedJournal(request);
        journal.state = 'prepared';
        const entry = plannedOrg(journal);
        entry.orgId = randomUUID();
        const calls = [];
        let present = true;
        const client = {
            query: async (sql, params = []) => {
                calls.push(sql);
                if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
                if (sql.includes("where c.contype='f'")) return { rows: refuse === 'unknown' ? [...incoming(), { source_schema: 'other' }] : incoming() };
                if (sql.startsWith('select * from poms.org_unit')) return { rows: present ? [{ id: entry.orgId }] : [] };
                if (sql.includes('for update')) {
                    const account = journal.accounts.find((a) => [a.userId, a.roleId, a.orgId].includes(params[0]));
                    const key = sql.includes('username') ? 'username' : sql.includes('role_key') ? 'role_key' : 'code';
                    return { rows: present ? [{ id: params[0], [key]: account[key === 'role_key' ? 'roleKey' : key === 'code' ? 'orgCode' : 'username'] }] : [] };
                }
                if (sql.includes('as users,')) return { rows: [{ users: present ? 2 : 0, roles: present ? 2 : 0, organizations: present ? 3 : 0 }] };
                if (sql.startsWith('delete')) {
                    present = false;
                    return { rows: [], rowCount: 1 };
                }
                if (sql.includes('as count')) return { rows: [{ count: refuse === 'external' && sql.includes('external_org_source') ? 1 : 0 }] };
                return { rows: [] };
            }
        };
        const store = { read: () => journal, write: async () => calls.push('JOURNAL_FSYNC') };
        if (refuse) {
            await assert.rejects(executeFixture(client, { ...request, action: 'cleanup' }, [], store));
            assert(!calls.some((s) => s.startsWith('delete')));
            assert(calls.includes('ROLLBACK'));
        } else {
            const result = await executeFixture(client, { ...request, action: 'cleanup' }, [], store);
            assert.equal(result.state, 'cleaned');
            assert(calls.indexOf('BEGIN') < calls.findIndex((s) => s.includes('for update')));
            assert(calls.findIndex((s) => s.startsWith('delete')) < calls.indexOf('COMMIT'));
            assert(calls.indexOf('COMMIT') < calls.indexOf('JOURNAL_FSYNC'));
            assert.match(calls.at(-1), /pg_advisory_unlock/);
        }
    }
});
test('ambient, marker and working/index/untracked source drift fail closed', () => {
    for (const key of ['PGHOST', 'pgpassword', 'DB_PORT', 'db_host', 'MIKRO_ORM_HOST', 'DATABASE_URL', 'NODE_OPTIONS', 'POMS_ENV_FILE']) assert.throws(() => validateAmbient({ [key]: 'synthetic' }));
    assert.throws(() => validateMarker([{ database: 'poms_r2b_nest', marker }], 'poms_r2c_nest'));
    for (const target of ['working', 'index', 'untracked'])
        assert.throws(() =>
            validateSource(
                (_cmd, args) => ((target === 'working' && args[0] === 'diff' && !args.includes('--cached')) || (target === 'index' && args.includes('--cached')) || (target === 'untracked' && args[0] === 'ls-files') ? 'changed' : ''),
                readFileSync
            )
        );
});
test('late session CAS mutation verifies owner without taking product-held organization locks', async () => {
    const journal = plannedJournal(request),
        account = journal.accounts[0],
        calls = [];
    const result = await mutate(
        {
            query: async (sql, params) => {
                calls.push({ sql, params });
                return sql.startsWith('select') ? { rows: [{ id: account.userId, username: account.username }] } : { rowCount: 1 };
            }
        },
        { ...request, action: 'session-bump-version', account: 'admin', sessionHash: 'a'.repeat(64) },
        journal,
        []
    );
    assert.equal(result.changed, 1);
    assert.equal(calls.length, 2);
    assert(!calls.some(({ sql }) => sql.includes('org_unit')));
    assert.deepEqual(calls[1].params, [account.userId, 'a'.repeat(64)]);
});
