import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { journalStore, plannedJournal, validateJournal } from './fixture-journal.mjs';
import { rowOwned } from './fixture-cleanup.mjs';
import { executeFixture } from './fixture-run.mjs';
const require = createRequire(import.meta.url);
const { parseFixtureRequest, fixtureCredentials, userFixtureSpec } = require('./fixture-protocol.cjs');
const runId = '12345678-1234-4234-8234-123456789abc';
const base = { formatVersion: 1, runId, backend: 'nest', action: 'prepare', account: 'none' };
const parse = (x) => parseFixtureRequest(Buffer.from(JSON.stringify(x)));
test('reject wrong backend, arbitrary target/SQL, aliases, extra fields and malformed user/session intent', () => {
    for (const delta of [
        { backend: 'poms' },
        { backend: 'pg17' },
        { runId: '../old' },
        { sql: 'delete from anything' },
        { action: 'reset' },
        { account: 'admin' },
        { sessionToken: 'a'.repeat(43) },
        { userSlot: 'u000' },
        { database: 'poms_r2c_nest' },
        { action: 'user-plan', userSlot: 'admin' },
        { action: 'user-plan', userSlot: 'u256' },
        { action: 'user-plan', userSlot: 'u-1' },
        { action: 'snapshot', account: 'admin', sessionToken: 'secret' },
        { action: 'snapshot', account: 'none', sessionToken: 'a'.repeat(43) }
    ])
        assert.throws(() => parse({ ...base, ...delta }));
    for (const bytes of [Buffer.alloc(0), Buffer.from([0xff]), Buffer.from('[]'), Buffer.alloc(16385, 65)]) assert.throws(() => parseFixtureRequest(bytes));
    const r = parse({ ...base, action: 'snapshot', account: 'admin', sessionToken: 'a'.repeat(43) });
    assert.equal(Object.hasOwn(r, 'sessionToken'), false);
    assert.match(r.sessionHash, /^[0-9a-f]{64}$/);
});
test('plans bind each username to exact run and slot; no ambient choice or prefix ownership', () => {
    assert.notEqual(userFixtureSpec(runId, 'u000').username, userFixtureSpec(runId, 'u001').username);
    assert.notEqual(userFixtureSpec(runId, 'u000').username, userFixtureSpec(randomUUID(), 'u000').username);
    assert.throws(() => fixtureCredentials(runId, 'root'));
    assert.throws(() => userFixtureSpec(runId, '../../'));
    const j = plannedJournal(base);
    assert.equal(validateJournal(j, base), j);
    for (const mutate of [
        (j) => (j.accounts[0].username = 'someone'),
        (j) => (j.accounts[0].userId = j.accounts[1].userId),
        (j) => (j.roles[0].key = 'admin'),
        (j) => (j.orgs[0].id = j.roles[0].id),
        (j) => j.users.push({ slot: 'u000', username: 'wrong', userId: null }),
        (j) => (j.unexpected = true)
    ]) {
        const altered = structuredClone(j);
        mutate(altered);
        assert.throws(() => validateJournal(altered, base));
    }
});
test('durable journal roundtrip preserves failed precommit intent and refuses corruption', () => {
    const dir = mkdtempSync(join(tmpdir(), 'r2d-journal-'));
    try {
        const store = journalStore(base, dir);
        assert.equal(store.read(), undefined);
        const j = plannedJournal(base);
        j.users.push({ slot: 'u000', username: userFixtureSpec(runId, 'u000').username, userId: null });
        store.write(j);
        assert.deepEqual(store.read(), j);
        const file = join(dir, 'runs', `nest-${runId}.json`);
        assert.equal(JSON.parse(readFileSync(file)).state, 'planned');
        writeFileSync(file, '{}');
        assert.throws(() => store.read());
        assert.throws(() => store.write(j));
    } finally {
        rmSync(dir, { recursive: true });
    }
});
test('logical UUID/JSON scan admits only exact run rows and rejects foreign cascade and nullable references', () => {
    const j = plannedJournal(base),
        u = j.accounts[0].userId,
        r = j.roles[0].id,
        o = j.orgs[0].id,
        foreign = randomUUID();
    assert(rowOwned('platform_user', { id: u }, j));
    assert(!rowOwned('platform_user', { id: foreign, created_by: u }, j));
    assert(rowOwned('user_role_assignment', { user_id: u, role_id: r }, j));
    assert(!rowOwned('user_role_assignment', { user_id: foreign, role_id: r }, j));
    assert(!rowOwned('user_role_assignment', { user_id: u, role_id: foreign }, j));
    assert(rowOwned('user_org_membership', { user_id: u, org_unit_id: o }, j));
    assert(!rowOwned('user_org_membership', { user_id: foreign, org_unit_id: o }, j));
    for (const table of ['customer', 'sales_follow_up_record', 'lead', 'project', 'external_identity', 'external_login_ticket', 'identity_provider_oauth_grant', 'org_sync_run', 'unexpected'])
        assert(!rowOwned(table, { id: foreign, owner_user_id: u, poms_user_id: u, requested_by: u, metadata: { actor: u } }, j));
    assert(!rowOwned('audit_log', { operator_id: foreign, target_id: u }, j));
    assert(!rowOwned('security_event', { actor_id: foreign, details: { user: u } }, j));
});
test('failed guarded operation rolls back before advisory unlock and does not erase journal', async () => {
    const queries = [],
        j = plannedJournal(base);
    j.state = 'prepared';
    const client = {
        query: async (text) => {
            queries.push(text);
            if (text.startsWith('select pg_try')) return { rows: [{ locked: true }] };
            return { rows: [] };
        }
    };
    let writes = 0;
    await assert.rejects(
        executeFixture(client, { ...base, action: 'user-adopt', userSlot: 'u000' }, [], {
            read: () => j,
            write: () => {
                writes++;
            }
        }),
        /user_not_planned/
    );
    assert.equal(writes, 0);
    assert(queries.indexOf('ROLLBACK') > queries.indexOf('BEGIN'));
    assert(queries.at(-1).startsWith('select pg_advisory_unlock'));
});
