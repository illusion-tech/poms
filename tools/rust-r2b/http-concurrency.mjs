import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assertOwned } from './fixture-core.mjs';
import { databaseFor, validateSource, verifyConnection } from './fixture-guard.mjs';
import { journalStore } from './fixture-journal.mjs';
import { NavigationHttpSession } from './http-client.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { invokeFixture } = require('./invoke-fixture.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
assert.equal(process.platform, 'linux');
assert.equal(process.argv.length, 3);
const backend = process.argv[2];
assert(['nest', 'rust'].includes(backend));
assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, `tmp/rust-r2b/concurrency-${backend}.json`);
assert(!existsSync(output), 'Preserve earlier evidence');
const runId = randomUUID(),
    database = databaseFor(backend),
    roles = new Map();
const report = { formatVersion: 1, result: 'pending', runId, backend, platform: process.platform, startedAt: new Date().toISOString(), cases: [] };
const fixture = (action, account = 'none', session, slot) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}), ...(slot ? { roleSlot: slot } : {}) });
const roleFixture = (action, slot) => fixture(action, 'none', undefined, slot);
const sourceFiles = [
    'http-concurrency.mjs',
    'fixture-core.mjs',
    'fixture-cli.mjs',
    'fixture-guard.mjs',
    'fixture-journal.mjs',
    'fixture-roles.mjs',
    'fixture-run.mjs',
    'fixture-protocol.cjs',
    'role-fixture-spec.cjs',
    'fixture-snapshot.mjs',
    'http-client.mjs',
    'invoke-fixture.cjs',
    'managed-environment.cjs'
]
    .map((name) => 'tools/rust-r2b/' + name)
    .concat(['tools/e2e/api-server.cjs', 'tools/e2e/runtime.cjs']);
const hashes = () =>
    sourceFiles.map((file) => ({
        file,
        sha256: createHash('sha256')
            .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
            .digest('hex')
    }));
report.sourceFiles = hashes();
let phase = 'prepare',
    server,
    blocker,
    observer,
    client;
function connection(owner = false) {
    const password = readFileSync(owner ? '/run/secrets/r2b-owner-password' : '/run/secrets/r2b-app-password', 'utf8');
    assert(owner ? password.length > 0 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
    return new Client({ host: '127.0.0.1', port: 15432, database, user: owner ? 'poms_r0e_owner' : 'poms_r2b_app', password, application_name: 'poms-r2b-owned-concurrency', connectionTimeoutMillis: 5000, query_timeout: 10000 });
}
async function waitBlocked(pid, count) {
    for (let i = 0; i < 100; i++) {
        const result = await observer.query("select pid from pg_stat_activity where datname=current_database() and usename=current_user and wait_event_type='Lock' and $1=any(pg_blocking_pids(pid)) order by pid", [pid]);
        if (result.rows.length === count) return result.rows.map((row) => row.pid);
        assert(result.rows.length < count, 'Unexpected competing backend');
        await delay(50);
    }
    throw Error('Expected owned HTTP did not reach controlled database lock');
}
async function create(slot) {
    await roleFixture('role-plan', slot);
    const spec = roleFixtureSpec(runId, slot);
    const result = await client.request('POST', '/api/platform/roles', { json: { roleKey: spec.roleKey, name: spec.name } });
    const adopted = await roleFixture('role-adopt', slot);
    assert.equal(result.status, 201);
    assert.equal(result.body.id, adopted.role.roleId);
    roles.set(slot, result.body.id);
}
async function race({ id, due, lock, requests, conflict, slot, expected }) {
    phase = id;
    await fixture(due ? 'session-due' : 'session-non-due', 'admin', client);
    const before = (await fixture('snapshot', 'admin', client)).snapshot;
    const roleBefore = slot && roles.has(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
    const request = { runId, backend };
    const journal = journalStore(request).read();
    assert.equal(journal.state, 'prepared');
    const actor = journal.accounts.find((row) => row.account === 'admin');
    const advisory = createHash('sha256').update(`${backend}:${runId}`).digest().readInt32BE(0);
    assert.equal((await blocker.query('select pg_try_advisory_lock(1380074050,$1) as locked', [advisory])).rows[0].locked, true);
    let transaction = false,
        pending = [];
    const startedAt = new Date().toISOString();
    try {
        // This check locks only the run's existing entities, then releases them
        // before the independently chosen contention point. The session advisory
        // lock prevents concurrent fixture cleanup until all HTTP has completed.
        await blocker.query('BEGIN');
        transaction = true;
        await assertOwned(blocker, journal);
        const session = await blocker.query('select id::text from poms.auth_session where id=$1 and user_id=$2 and token_hash=$3', [before.session.id, actor.userId, createHash('sha256').update(client.cookies.get('poms_session')).digest('hex')]);
        assert.equal(session.rows.length, 1);
        await blocker.query('ROLLBACK');
        transaction = false;
        await blocker.query('BEGIN');
        transaction = true;
        await blocker.query("set local statement_timeout='10s'");
        await lock({ journal, actor, sessionId: before.session.id });
        const blockerPid = (await blocker.query('select pg_backend_pid() as pid')).rows[0].pid;
        pending = requests.map((request) => client.request(request.method, request.path, request.json === undefined ? {} : { json: request.json }));
        // Attach rejection handlers while the coordinator waits for the lock.
        for (const promise of pending) promise.catch(() => undefined);
        const blockedPids = await waitBlocked(blockerPid, requests.length);
        if (conflict) await conflict({ journal, actor, sessionId: before.session.id });
        await blocker.query('COMMIT');
        transaction = false;
        const results = await Promise.all(pending);
        const statuses = results.map((row) => row.status).sort((a, b) => a - b);
        if (expected) assert.deepEqual(statuses, expected, id);
        report.cases.push({
            id,
            due,
            startedAt,
            finishedAt: new Date().toISOString(),
            blockedCount: blockedPids.length,
            statuses,
            responses: results.map((row) => ({ status: row.status, body: row.body, setCookieCount: row.setCookie.length })),
            before,
            roleBefore
        });
    } finally {
        if (transaction) await blocker.query('ROLLBACK');
        await Promise.allSettled(pending);
        await blocker.query('select pg_advisory_unlock(1380074050,$1)', [advisory]);
    }
    if (slot) {
        const adopted = await roleFixture('role-adopt', slot);
        if (adopted.role.roleId) roles.set(slot, adopted.role.roleId);
    }
    const row = report.cases.at(-1);
    row.after = (await fixture('snapshot', 'admin', client)).snapshot;
    row.roleAfter = slot && roles.has(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
    row.auditDelta = row.after.audits.length - row.before.audits.length;
    row.sessionVersionDelta = row.after.session.rowVersion - row.before.session.rowVersion;
    row.roleVersionDelta = row.roleBefore && row.roleAfter ? row.roleAfter.role.row_version - row.roleBefore.role.row_version : null;
    assert(row.responses.every((response) => response.setCookieCount === 0));
}
try {
    validateSource();
    const owner = connection(true);
    try {
        await owner.connect();
        await verifyConnection(owner, database, true);
    } finally {
        await owner.end();
    }
    blocker = connection();
    observer = connection();
    await blocker.connect();
    await observer.connect();
    await verifyConnection(blocker, database);
    await verifyConnection(observer, database);
    await fixture('prepare');
    phase = 'start-server';
    server = await startApiServer({ cwd: root, logPath: path.join(root, `tmp/rust-r2b/concurrency-${backend}-server.log`), runId });
    client = new NavigationHttpSession(server.target.origin, runId);
    await client.login('admin');
    await create('role-cas');
    await race({
        id: 'role-cas-after-independent-read',
        due: false,
        slot: 'role-cas',
        lock: () => blocker.query('select id from poms.role where id=$1 for update', [roles.get('role-cas')]),
        requests: [{ method: 'PATCH', path: '/api/platform/roles/' + roles.get('role-cas'), json: { name: 'R2B must roll back' } }],
        conflict: () => blocker.query("update poms.role set name='R2B concurrent winner',row_version=row_version+1,updated_at=date_trunc('milliseconds',clock_timestamp()) where id=$1", [roles.get('role-cas')])
    });
    await roleFixture('role-plan', 'race');
    const duplicate = roleFixtureSpec(runId, 'race');
    await race({
        id: 'duplicate-key-after-both-prechecks',
        due: false,
        slot: 'race',
        lock: () => blocker.query('lock table poms.role in share mode'),
        requests: Array.from({ length: 2 }, () => ({ method: 'POST', path: '/api/platform/roles', json: { roleKey: duplicate.roleKey, name: duplicate.name } })),
        expected: [201, 500]
    });
    await create('permission-race');
    await race({
        id: 'permission-partial-unique-race',
        due: false,
        slot: 'permission-race',
        lock: () => blocker.query('lock table poms.role_permission_assignment in share mode'),
        requests: Array.from({ length: 2 }, () => ({ method: 'PUT', path: '/api/platform/roles/' + roles.get('permission-race') + '/permissions', json: { permissionKeys: ['project:read'] } })),
        expected: [200, 500]
    });
    await roleFixture('role-plan', 'session-cas');
    const createSpec = roleFixtureSpec(runId, 'session-cas');
    await race({
        id: 'late-session-cas-rolls-back-role-insert',
        due: true,
        slot: 'session-cas',
        lock: () => blocker.query('lock table poms.role in share mode'),
        requests: [{ method: 'POST', path: '/api/platform/roles', json: { roleKey: createSpec.roleKey, name: createSpec.name } }],
        conflict: async ({ actor, sessionId }) => {
            const result = await observer.query("update poms.auth_session set row_version=row_version+1,updated_at=date_trunc('milliseconds',clock_timestamp()) where id=$1 and user_id=$2", [sessionId, actor.userId]);
            assert.equal(result.rowCount, 1);
        }
    });
    const actor = journalStore({ runId, backend })
        .read()
        .accounts.find((row) => row.account === 'admin');
    const setup = await client.request('PATCH', '/api/platform/roles/' + actor.roleId, { json: { name: 'R2B early snapshot', description: 'R2B pre-concurrent-null' } });
    assert.equal(setup.status, 200);
    await race({
        id: 'assigned-role-early-snapshot-get',
        due: true,
        lock: ({ sessionId }) => blocker.query('select id from poms.auth_session where id=$1 for update', [sessionId]),
        requests: [{ method: 'GET', path: '/api/platform/roles/' + actor.roleId }],
        conflict: () => blocker.query("update poms.role set name='R2B later committed',row_version=row_version+1,updated_at=date_trunc('milliseconds',clock_timestamp()) where id=$1", [actor.roleId]),
        expected: [200]
    });
    await race({
        id: 'assigned-role-list-null-hydration',
        due: true,
        lock: ({ sessionId }) => blocker.query('select id from poms.auth_session where id=$1 for update', [sessionId]),
        requests: [{ method: 'GET', path: '/api/platform/roles' }],
        conflict: () => blocker.query("update poms.role set description=null,row_version=row_version+1,updated_at=date_trunc('milliseconds',clock_timestamp()) where id=$1", [actor.roleId]),
        expected: [200]
    });
    const last = report.cases.at(-1);
    last.actorRoleResponse = last.responses[0].body.find((role) => role.id === actor.roleId);
    assert(last.actorRoleResponse);
    report.identities = { admin: actor.userId, adminRole: actor.roleId, roles: Object.fromEntries(roles) };
    assert.deepEqual(hashes(), report.sourceFiles);
    validateSource();
    report.result = 'observed';
} catch (error) {
    report.result = 'fail';
    report.failurePhase = phase;
    report.failureReason = error.name;
    process.exitCode = 1;
} finally {
    for (const connection of [blocker, observer])
        if (connection)
            try {
                await connection.end();
            } catch {
                report.connectionCloseFailed = true;
                report.result = 'fail';
                process.exitCode = 1;
            }
    if (server)
        try {
            await server.stop();
            report.serverStopped = true;
        } catch {
            report.serverStopped = false;
            report.result = 'fail';
            process.exitCode = 1;
        }
    try {
        report.cleanup = await fixture('cleanup');
        report.zeroResidual = await fixture('cleanup');
        assert.equal(report.zeroResidual.matched, 0);
        assert.equal(report.zeroResidual.changed, 0);
    } catch {
        report.cleanupFailed = true;
        report.result = 'fail';
        process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(
    JSON.stringify({
        result: report.result,
        backend,
        cases: report.cases.map(({ id, statuses, auditDelta, sessionVersionDelta, roleVersionDelta }) => ({ id, statuses, auditDelta, sessionVersionDelta, roleVersionDelta })),
        failurePhase: report.failurePhase,
        failureReason: report.failureReason,
        serverStopped: report.serverStopped,
        zeroResidual: report.zeroResidual
    })
);
