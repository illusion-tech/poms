// Independent B review: exercise durable-versus-in-memory journal state and
// real fixture orchestration with a synthetic SQL adapter. No database I/O.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS } from './catalog-org-units.mjs';
import { plannedJournal, validateJournal } from './fixture-journal.mjs';
import { adoptOrgs } from './fixture-orgs.mjs';
import { executeFixture } from './fixture-run.mjs';
import { auditSnapshot } from './fixture-snapshot.mjs';
import { mutate } from './fixture-core.mjs';

const require = createRequire(import.meta.url);
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const baseRequest = Object.freeze({ formatVersion: 1, runId: 'b71b1f4d-9cf8-4fe0-a86c-e890436b0966', backend: 'nest', action: 'prepare', account: 'none' });

function incoming() {
    return EXPECTED_ORG_UNIT_INCOMING_FOREIGN_KEYS.map((edge) => ({
        ...edge, source_columns: [edge.column], target_schema: 'poms', target_table: 'org_unit', target_columns: ['id'],
        update_action: 'c', match_type: 's', convalidated: true, condeferrable: false, condeferred: false
    }));
}

function model({ slot = 'nullable', failWrite = () => false, foreignActor = false, foreignReference = false, unknownFk = false } = {}) {
    const initial = plannedJournal(baseRequest);
    initial.state = 'prepared';
    const spec = orgFixtureSpec(baseRequest.runId, slot);
    initial.orgs.push({ slot, orgId: null, initialCode: spec.databaseCode, parentSlot: null, deleted: false });
    let durable = structuredClone(initial);
    let row = { id: randomUUID(), code: spec.databaseCode, name: spec.name, description: spec.description,
        parent_id: null, display_order: spec.displayOrder, is_active: true, created_by: null, updated_by: null, row_version: 1 };
    let usersPresent = true, rolesPresent = true, actorOrgsPresent = true;
    let transaction, writes = 0;
    const calls = [];
    const client = { async query(sql, params = []) {
        calls.push({ sql, params: structuredClone(params) });
        if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
        if (sql === 'BEGIN') {
            transaction = { row: structuredClone(row), usersPresent, rolesPresent, actorOrgsPresent };
            return { rows: [] };
        }
        if (sql === 'COMMIT') { transaction = undefined; return { rows: [] }; }
        if (sql === 'ROLLBACK') {
            if (transaction) ({ row, usersPresent, rolesPresent, actorOrgsPresent } = transaction);
            transaction = undefined;
            return { rows: [] };
        }
        if (sql.includes("where c.contype='f'")) return { rows: unknownFk ? [...incoming(), { source_schema: 'outside' }] : incoming() };
        if (sql.startsWith('select * from poms.org_unit')) {
            const matches = row && (sql.includes('where code=') ? row.code === params[0] : row.id === params[0]);
            return { rows: matches ? [structuredClone(row)] : [] };
        }
        if (sql.includes('from poms.audit_log where target_type=')) return { rows: [{ count: foreignActor ? 1 : 0 }] };
        if (sql.includes('for update')) {
            const account = initial.accounts.find((account) => [account.userId, account.roleId, account.orgId].includes(params[0]));
            assert(account, 'fixture tried to lock an unowned identity');
            const kind = sql.includes('username') ? 'user' : sql.includes('role_key') ? 'role' : 'org';
            const present = kind === 'user' ? usersPresent : kind === 'role' ? rolesPresent : actorOrgsPresent;
            const value = kind === 'user' ? { id: account.userId, username: account.username }
                : kind === 'role' ? { id: account.roleId, role_key: account.roleKey } : { id: account.orgId, code: account.orgCode };
            return { rows: present ? [value] : [] };
        }
        if (sql.includes('as users,')) return { rows: [{ users: usersPresent ? 2 : 0, sessions: usersPresent ? 1 : 0,
            roles: rolesPresent ? 2 : 0, activePermissions: rolesPresent ? 2 : 0, historicalPermissions: 0,
            userRoles: usersPresent ? 2 : 0, organizations: (actorOrgsPresent ? 2 : 0) + (row ? 1 : 0), events: 0, audits: 0 }] };
        if (sql.includes('as count')) return { rows: [{ count: foreignReference && sql.includes('external_org_source') ? 1 : 0 }] };
        if (sql.startsWith('update poms.org_unit')) {
            assert.equal(durable.orgs[0].orgId, row.id, 'UUID adoption must be durable before changing initial creation facts');
            if (sql.includes('description=null')) row.description = null;
            if (sql.includes('is_active=$2')) row.is_active = params[1];
            if (sql.includes('display_order=$2')) row.display_order = params[1];
            row.row_version++;
            return { rowCount: 1, rows: [] };
        }
        if (sql.startsWith('delete from poms.org_unit')) {
            if (sql.includes('where id=$1')) {
                assert.equal(durable.orgs[0].orgId, row.id, 'UUID adoption must survive committed leaf deletion');
                assert.equal(params[0], row.id);
                row = null;
            } else { row = null; actorOrgsPresent = false; }
            return { rowCount: 1, rows: [] };
        }
        if (sql.startsWith('delete from poms.platform_user')) usersPresent = false;
        if (sql.startsWith('delete from poms.role')) rolesPresent = false;
        return { rowCount: 0, rows: [] };
    } };
    const store = {
        read: () => structuredClone(durable),
        async write(value) {
            writes++;
            calls.push({ sql: `JOURNAL_WRITE_${writes}`, params: [] });
            validateJournal(value, baseRequest);
            if (failWrite(writes)) throw new Error('synthetic_journal_fsync_failure');
            durable = structuredClone(value);
        }
    };
    return { client, store, calls, row: () => structuredClone(row), journal: () => structuredClone(durable),
        request: (action) => ({ ...baseRequest, action, orgSlot: slot }) };
}

for (const action of ['org-null-description', 'org-set-inactive', 'org-max-order', 'org-negative-order']) {
    test(`${action}: adopted UUID is durable before product-shape mutation`, async () => {
        const fixture = model();
        const result = await executeFixture(fixture.client, fixture.request(action), [], fixture.store);
        assert.equal(result.changed, 1);
        const beforeMutation = fixture.calls.findIndex(({ sql }) => sql.startsWith('update poms.org_unit'));
        assert(beforeMutation > fixture.calls.findIndex(({ sql }) => sql === 'JOURNAL_WRITE_1'));
        assert.equal(fixture.journal().orgs[0].orgId, fixture.row().id);
    });
}

test('failed adoption fsync prevents DML and leaves exact intent recoverable', async () => {
    const fixture = model({ failWrite: (index) => index === 1 });
    const before = fixture.row();
    await assert.rejects(executeFixture(fixture.client, fixture.request('org-null-description'), [], fixture.store), /fsync_failure/);
    assert(!fixture.calls.some(({ sql }) => /^(?:update|delete) /i.test(sql)));
    assert(fixture.calls.some(({ sql }) => sql === 'ROLLBACK'));
    assert.deepEqual(fixture.row(), before);
    const recovered = fixture.journal();
    await adoptOrgs(fixture.client, recovered);
    assert.equal(recovered.orgs[0].orgId, before.id);
});

test('post-COMMIT final fsync failure retains UUID and permits cleanup plus second zero/zero', async () => {
    const fixture = model({ failWrite: (index) => index === 2 });
    await assert.rejects(executeFixture(fixture.client, fixture.request('org-null-description'), [], fixture.store), /fsync_failure/);
    assert(fixture.calls.some(({ sql }) => sql === 'COMMIT'));
    assert(!fixture.calls.some(({ sql }) => sql === 'ROLLBACK'));
    assert.equal(fixture.row().description, null);
    assert.equal(fixture.journal().orgs[0].orgId, fixture.row().id);
    const recovered = await executeFixture(fixture.client, { ...baseRequest, action: 'cleanup' }, [], fixture.store);
    assert.equal(recovered.state, 'cleaned');
    const repeated = await executeFixture(fixture.client, { ...baseRequest, action: 'cleanup' }, [], fixture.store);
    assert.equal(repeated.matched, 0);
    assert.equal(repeated.changed, 0);
});

test('committed leaf deletion with lost final fsync recovers through exact-ID cleanup', async () => {
    const fixture = model({ failWrite: (index) => index === 2 });
    await assert.rejects(executeFixture(fixture.client, fixture.request('org-delete-owned-leaf'), [], fixture.store), /fsync_failure/);
    assert.equal(fixture.row(), null);
    assert.notEqual(fixture.journal().orgs[0].orgId, null);
    assert.equal(fixture.journal().orgs[0].deleted, false, 'test retains the stale durable deletion flag');
    const result = await executeFixture(fixture.client, { ...baseRequest, action: 'cleanup' }, [], fixture.store);
    assert.equal(result.state, 'cleaned');
    const repeated = await executeFixture(fixture.client, { ...baseRequest, action: 'cleanup' }, [], fixture.store);
    assert.deepEqual([repeated.matched, repeated.changed], [0, 0]);
});

test('foreign actor and unknown incoming FK refuse adoption/mutation before any DML', async () => {
    for (const options of [{ foreignActor: true }, { unknownFk: true }]) {
        const fixture = model(options);
        await assert.rejects(executeFixture(fixture.client, fixture.request('org-null-description'), [], fixture.store));
        assert(!fixture.calls.some(({ sql }) => /^(?:update|delete) /i.test(sql)));
        assert.equal(fixture.journal().orgs[0].orgId, null);
    }
});

test('external restrictive authority references block cleanup and leaf delete', async () => {
    for (const action of ['cleanup', 'org-delete-owned-leaf']) {
        const fixture = model({ foreignReference: true });
        await assert.rejects(executeFixture(fixture.client, action === 'cleanup'
            ? { ...baseRequest, action } : fixture.request(action), [], fixture.store), /foreign_fixture_reference/);
        assert(!fixture.calls.some(({ sql }) => sql.startsWith('delete')));
    }
});

test('journal from another run cannot authorize the same adopted IDs', () => {
    const fixture = model();
    const other = { ...baseRequest, runId: randomUUID() };
    assert.throws(() => validateJournal(fixture.journal(), other), /invalid_journal/);
});

test('late session conflict injection stays bound to its owner and token without org locks', async () => {
    const journal = plannedJournal(baseRequest), account = journal.accounts[0], sessionHash = 'a'.repeat(64);
    const calls = [];
    const client = { async query(sql, params) {
        calls.push({ sql, params });
        assert(!sql.includes('org_unit') && !sql.includes('pg_constraint'));
        return sql.startsWith('select') ? { rows: [{ id: account.userId, username: account.username }] } : { rowCount: 1 };
    } };
    const result = await mutate(client, { ...baseRequest, action: 'session-bump-version', account: 'admin', sessionHash }, journal, []);
    assert.equal(result.changed, 1);
    assert.match(calls[0].sql, /where id=\$1 for update/);
    assert.deepEqual(calls[1].params, [account.userId, sessionHash]);
    assert.match(calls[1].sql, /where user_id=\$1 and token_hash=\$2 and status='active'/);
    const foreign = { query: async () => ({ rows: [{ id: account.userId, username: 'another-run' }] }) };
    await assert.rejects(mutate(foreign, { ...baseRequest, action: 'session-bump-version', account: 'admin', sessionHash }, journal, []), /fixture_ownership/);
});

test('deactivation audit preserves full request, inactive rows and before/after values', () => {
    const actor = randomUUID(), parent = randomUUID(), child = randomUUID();
    const row = { id: randomUUID(), eventType: 'platform.org-unit.deactivated', targetType: 'OrgUnit', targetId: parent,
        operatorId: actor, requestId: null, result: 'success', reason: null,
        beforeSnapshot: { orgUnits: [{ id: child, isActive: false }, { id: parent, isActive: true }] },
        afterSnapshot: { orgUnits: [{ id: child, isActive: false }, { id: parent, isActive: false }] },
        metadata: { request: { reason: '含中文 Σ 😀', comment: '原请求', expectedVersion: 9007199254740991 }, cascadedCount: 1 },
        occurredAt: new Date('2026-10-27T13:04:40.627Z') };
    const result = auditSnapshot(row, [actor]);
    assert.deepEqual(result, { ...row, occurredAt: '2026-10-27T13:04:40.627Z' });
    assert.equal(result.beforeSnapshot.orgUnits[0].isActive, false);
    assert.equal(result.metadata.request.expectedVersion, 9007199254740991);
});
