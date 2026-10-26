import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
import { leaseStore } from './system-lease-storage.mjs';
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { acquireSystemLease } = require('./invoke-system-lease.cjs');
const { steps } = require('./system-lease-protocol.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
const runtime = require('../e2e/runtime.cjs');
assert.equal(process.platform, 'linux');
assert.equal(process.argv.length, 3);
const backend = process.argv[2];
assert(['nest', 'rust'].includes(backend));
assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
const root = path.resolve(import.meta.dirname, '../..'),
    runId = randomUUID();
const output = path.join(root, `tmp/rust-r2b/system-${backend}.json`);
assert(!existsSync(output), 'Preserve prior system-role evidence');
const sqlPath = path.join(root, 'tmp/rust-r2b/system-nest-sql.jsonl');
const logPath = path.join(root, `tmp/rust-r2b/system-${backend}-server.log`);
const report = { formatVersion: 1, result: 'pending', runId, backend, startedAt: new Date().toISOString(), cases: [] };
const sourceFiles = [
    'system-role-scenarios.mjs',
    'system-lease.mjs',
    'system-lease-model.mjs',
    'system-lease-storage.mjs',
    'system-lease-protocol.cjs',
    'invoke-system-lease.cjs',
    'fixture-core.mjs',
    'fixture-cli.mjs',
    'fixture-run.mjs',
    'fixture-snapshot.mjs',
    'fixture-guard.mjs',
    'fixture-journal.mjs',
    'fixture-roles.mjs',
    'role-fixture-spec.cjs',
    'fixture-protocol.cjs',
    'http-client.mjs',
    'invoke-fixture.cjs',
    'managed-environment.cjs',
    'witness-query-preload-system.cjs',
    'roles-authority.json'
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
const readSql = () =>
    backend === 'nest'
        ? readFileSync(sqlPath, 'utf8')
              .trim()
              .split('\n')
              .filter(Boolean)
              .map((line) => JSON.parse(line))
        : [];
const fixture = (action, client) => invokeFixture({ formatVersion: 1, runId, backend, action, account: client ? 'admin' : 'none', ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}) });
let phase = 'prepare',
    server,
    lease,
    released = false,
    acquisitionAttempted = false;
async function start() {
    if (backend === 'rust') return startApiServer({ cwd: root, logPath, runId });
    const managed = loadManagedEnvironment({ mode: 'managed-nest' });
    const target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
    await runtime.assertPortAvailable(target);
    const packageFile = require.resolve('nx/package.json'),
        pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
    const entry = path.resolve(path.dirname(packageFile), typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.nx);
    await runtime.runOwnedCommand({ executable: process.execPath, args: [entry, 'build', 'poms-api', '--skip-nx-cache'], cwd: root, env: managed.childEnv, logPath, runId, timeoutMs: 180000 });
    const handle = await runtime.startOwned({
        kind: 'nest',
        executable: process.execPath,
        args: ['--require', path.join(root, 'tools/rust-r2b/witness-query-preload-system.cjs'), path.join(root, 'dist/apps/poms-api/main.js')],
        cwd: root,
        env: managed.childEnv,
        host: target.host,
        port: target.port,
        readyUrl: target.readinessUrl,
        logPath,
        runId,
        timeoutMs: 120000
    });
    return { target, stop: () => runtime.stopOwned(handle) };
}
try {
    await fixture('prepare');
    phase = 'start';
    server = await start();
    const client = new NavigationHttpSession(server.target.origin, runId);
    await client.login('admin');
    phase = 'acquire-system-lease';
    acquisitionAttempted = true;
    lease = await acquireSystemLease({ formatVersion: 1, runId, backend });
    assert.equal(lease.ready.actorId, client.userId);
    report.lease = lease.ready;
    const store = leaseStore(backend);
    const initial = store.active();
    assert.equal(initial.leaseId, lease.ready.leaseId);
    report.initial = initial.base;
    for (const due of [true, false])
        for (const step of steps) {
            phase = step + ':' + due;
            lease.assertAlive();
            await fixture(due ? 'session-due' : 'session-non-due', client);
            const before = (await fixture('snapshot', client)).snapshot;
            const plan = await lease.before(step);
            const prior = store.active();
            assert.equal(prior.pending.step, step);
            const sequence = readSql().at(-1)?.sequence ?? 0;
            const startedAt = new Date().toISOString();
            const response = await client.request(plan.request.method, plan.request.path, { json: plan.request.body });
            const acknowledgement = await lease.after(step);
            const after = (await fixture('snapshot', client)).snapshot;
            const now = store.active();
            assert.equal(now.pending, null);
            const completedSql = readSql().filter((row) => row.sequence > sequence && ['end', 'error'].includes(row.phase));
            const transactions = [],
                pending = new Map();
            for (const row of completedSql) {
                if (row.statement === 'BEGIN') {
                    assert(!pending.has(row.connection));
                    pending.set(row.connection, [row]);
                } else if (pending.has(row.connection)) {
                    pending.get(row.connection).push(row);
                    if (['COMMIT', 'ROLLBACK'].includes(row.statement)) {
                        transactions.push(pending.get(row.connection));
                        pending.delete(row.connection);
                    }
                }
            }
            assert.equal(pending.size, 0);
            report.cases.push({
                step,
                due,
                startedAt,
                finishedAt: new Date().toISOString(),
                plan,
                status: response.status,
                response: response.body,
                setCookieCount: response.setCookie.length,
                before,
                after,
                systemBefore: prior.authorized,
                systemAfter: now.authorized,
                acknowledgement,
                auditDelta: after.audits.length - before.audits.length,
                sessionVersionDelta: after.session.rowVersion - before.session.rowVersion,
                completedSql,
                transactions
            });
            assert.equal(response.status, plan.expectedStatus);
            assert.equal(response.setCookie.length, 0);
            assert.equal(after.audits.length - before.audits.length, 1);
            assert.equal(after.audits.at(-1).id, acknowledgement.auditId);
        }
    phase = 'release';
    report.release = await lease.release();
    released = true;
    const final = leaseStore(backend).active();
    assert.equal(final.state, 'restored');
    report.finalJournal = final;
    if (backend === 'nest') {
        const sql = readSql();
        assert(!readFileSync(logPath, 'utf8').includes('R2B_SQL_CAPTURE_INCOMPLETE'));
        assert(sql.every((row) => !row.captureIncomplete && row.phase !== 'unsupported'));
        for (const queryId of new Set(sql.map((row) => row.queryId))) {
            const pair = sql.filter((row) => row.queryId === queryId);
            assert.equal(pair.length, 2);
            assert.equal(pair[0].phase, 'start');
            assert(['end', 'error'].includes(pair[1].phase));
        }
        report.sqlRecords = sql.length;
        report.sqlSha256 = createHash('sha256').update(readFileSync(sqlPath)).digest('hex');
    }
    assert.deepEqual(hashes(), report.sourceFiles);
    report.result = 'pass';
} catch (error) {
    report.result = 'fail';
    report.failurePhase = phase;
    report.failureReason = error.name;
    process.exitCode = 1;
} finally {
    // Stop all in-flight product work before attempting recovery of a pending
    // lease. The ordinary actor must remain until system restoration succeeds.
    if (server)
        try {
            await server.stop();
            report.serverStopped = true;
        } catch {
            report.serverStopped = false;
            report.result = 'fail';
            process.exitCode = 1;
        }
    if (lease && !released)
        try {
            report.release = await lease.release();
            released = true;
        } catch {
            try {
                const recovery = await acquireSystemLease({ formatVersion: 1, runId, backend });
                report.recoveryRelease = await recovery.release();
                released = true;
            } catch {
                report.restoreFailed = true;
                report.result = 'fail';
                process.exitCode = 1;
            }
        }
    if (released || !acquisitionAttempted)
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
    else report.cleanupDeferredUntilSystemRestored = true;
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(
    JSON.stringify({ result: report.result, backend, cases: report.cases.length, failurePhase: report.failurePhase, failureReason: report.failureReason, restored: released, serverStopped: report.serverStopped, zeroResidual: report.zeroResidual })
);
