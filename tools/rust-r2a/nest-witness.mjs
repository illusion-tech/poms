import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'tmp/rust-r2a/nest-witness.json');
assert.equal(process.argv.length, 2);
assert.equal(process.platform, 'linux');
assert(!existsSync(output), 'Preserve the original witness before a new run');
const runId = randomUUID();
const report = {
    formatVersion: 1,
    result: 'pending',
    runId,
    backend: 'nest',
    platform: process.platform,
    startedAt: new Date().toISOString(),
    statements: 'nest-witness-sql.jsonl contains observed fixed statement labels and exact SQL SHA-256; never raw SQL, parameters or rows',
    observations: [],
    cleanup: null,
    sourceFiles: []
};
const sourceFiles = [
    ...readdirSync(import.meta.dirname)
        .filter((name) => /^(?:fixture-|managed-environment|http-client|invoke-fixture|nest-witness|witness-query-preload)/.test(name) && /\.(?:mjs|cjs)$/.test(name))
        .map((name) => `tools/rust-r2a/${name}`),
    'tools/e2e/runtime.cjs'
];
const hashes = () =>
    sourceFiles.map((file) => ({
        file,
        sha256: createHash('sha256')
            .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
            .digest('hex')
    }));
report.sourceFiles = hashes();
let phase = 'fixture-prepare';
let server;
const fixture = (action, account = 'none', client) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}) });
try {
    await fixture('prepare');
    phase = 'start-original-nest';
    const managed = loadManagedEnvironment({ mode: 'managed-nest' });
    assert.equal(managed.port, 5100);
    const target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
    await runtime.assertPortAvailable(target);
    const nxPackagePath = require.resolve('nx/package.json');
    const nxPackage = JSON.parse(readFileSync(nxPackagePath, 'utf8'));
    const nxBin = typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin?.nx;
    assert.equal(typeof nxBin, 'string');
    const nxEntry = path.resolve(path.dirname(nxPackagePath), nxBin);
    assert(!path.relative(path.dirname(nxPackagePath), nxEntry).startsWith('..'));
    await runtime.runOwnedCommand({
        executable: process.execPath,
        args: [nxEntry, 'build', 'poms-api', '--skip-nx-cache'],
        cwd: root,
        env: managed.childEnv,
        logPath: path.join(root, 'tmp/rust-r2a/nest-witness-server.log'),
        runId,
        timeoutMs: 180000
    });
    server = await runtime.startOwned({
        kind: 'nest',
        executable: process.execPath,
        args: ['--require', path.join(root, 'tools/rust-r2a/witness-query-preload.cjs'), path.join(root, 'dist/apps/poms-api/main.js')],
        cwd: root,
        env: managed.childEnv,
        host: target.host,
        port: target.port,
        readyUrl: target.readinessUrl,
        logPath: path.join(root, 'tmp/rust-r2a/nest-witness-server.log'),
        runId,
        timeoutMs: 120000
    });
    const client = new NavigationHttpSession(target.origin, runId);
    const readSql = () =>
        readFileSync(path.join(root, 'tmp/rust-r2a/nest-witness-sql.jsonl'), 'utf8')
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    phase = 'login';
    await client.login('admin');
    for (const scenario of [
        { id: 'sync-non-due', due: false, route: '/api/platform/navigation:sync', method: 'POST', status: 200, auditDelta: 1, versionDelta: 0 },
        { id: 'sync-due', due: true, route: '/api/platform/navigation:sync', method: 'POST', status: 200, auditDelta: 1, versionDelta: 2 },
        { id: 'sync-due-overlong-request-id', due: true, route: '/api/platform/navigation:sync', method: 'POST', status: 500, auditDelta: 0, versionDelta: 1, requestId: 'x'.repeat(65) },
        { id: 'get-due-no-business-flush', due: true, route: '/api/platform/navigation', method: 'GET', status: 200, auditDelta: 0, versionDelta: 1 }
    ]) {
        phase = scenario.id;
        await fixture(scenario.due ? 'session-due' : 'session-non-due', 'admin', client);
        const before = (await fixture('snapshot', 'admin', client)).snapshot;
        const sqlSequenceBefore = readSql().at(-1)?.sequence ?? 0;
        const httpStartedAt = new Date().toISOString();
        const response = await client.request(scenario.method, scenario.route, { ...(scenario.method === 'POST' ? { json: {} } : {}), ...(scenario.requestId ? { requestId: scenario.requestId } : {}) });
        const httpFinishedAt = new Date().toISOString();
        const after = (await fixture('snapshot', 'admin', client)).snapshot;
        const sqlEvents = readSql().filter((row) => row.sequence > sqlSequenceBefore);
        const completedSql = sqlEvents.filter((row) => ['end', 'error'].includes(row.phase));
        const auditDelta = after.audits.length - before.audits.length;
        const versionDelta = after.session.rowVersion - before.session.rowVersion;
        report.observations.push({
            id: scenario.id,
            status: response.status,
            response: response.body,
            before,
            after,
            auditDelta,
            versionDelta,
            httpStartedAt,
            httpFinishedAt,
            sqlSequenceBefore,
            sqlSequenceAfter: sqlEvents.at(-1)?.sequence ?? sqlSequenceBefore,
            completedSql
        });
        assert.equal(response.status, scenario.status);
        assert.equal(auditDelta, scenario.auditDelta);
        assert.equal(versionDelta, scenario.versionDelta);
        assert.equal(response.setCookie.length, 0);
        const changes = completedSql.filter((row) => !row.statement.startsWith('SELECT'));
        const expectedStatements = [
            ...(scenario.due ? ['UPDATE poms.auth_session'] : []),
            ...(scenario.method === 'POST' ? ['BEGIN', 'INSERT poms.audit_log', ...(scenario.status === 500 ? ['ROLLBACK'] : [...(scenario.due ? ['UPDATE poms.auth_session'] : []), 'COMMIT'])] : [])
        ];
        assert.deepEqual(
            changes.map((row) => row.statement),
            expectedStatements
        );
        if (scenario.status === 500) assert.equal(changes.find((row) => row.statement === 'INSERT poms.audit_log')?.code, '22001');
        const transaction = changes.slice(changes.findIndex((row) => row.statement === 'BEGIN'));
        if (scenario.method === 'POST') assert.equal(new Set(transaction.map((row) => row.connection)).size, 1);
    }
    phase = 'verify-sql-and-source';
    const sql = readFileSync(path.join(root, 'tmp/rust-r2a/nest-witness-sql.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    assert(sql.some((row) => row.code === '22001'));
    assert(sql.some((row) => row.phase === 'end' && row.statement === 'INSERT poms.audit_log'));
    assert(sql.some((row) => row.phase === 'end' && row.statement === 'UPDATE poms.auth_session'));
    assert(sql.some((row) => row.phase === 'end' && row.statement === 'ROLLBACK'));
    assert(sql.every((row) => !row.captureIncomplete && row.phase !== 'unsupported'));
    assert(!readFileSync(path.join(root, 'tmp/rust-r2a/nest-witness-server.log'), 'utf8').includes('R2A_SQL_CAPTURE_INCOMPLETE'));
    for (const queryId of new Set(sql.map((row) => row.queryId))) {
        const events = sql.filter((row) => row.queryId === queryId);
        assert.equal(events.length, 2);
        assert.equal(events[0].phase, 'start');
        assert(['end', 'error'].includes(events[1].phase));
    }
    report.sqlRecords = sql.length;
    report.sqlSha256 = createHash('sha256')
        .update(readFileSync(path.join(root, 'tmp/rust-r2a/nest-witness-sql.jsonl')))
        .digest('hex');
    assert.deepEqual(hashes(), report.sourceFiles, 'Witness input changed while running');
    report.result = 'pass';
} catch (error) {
    report.result = 'fail';
    report.failurePhase = phase;
    report.failureReason = /^R2A_LOGIN_[A-Za-z0-9_-]+/.exec(error.message)?.[0] ?? error.name;
    process.exitCode = 1;
} finally {
    if (server) {
        try {
            await runtime.stopOwned(server);
            report.serverStopped = true;
        } catch {
            report.serverStopped = false;
            report.result = 'fail';
            process.exitCode = 1;
        }
    }
    try {
        report.cleanup = await fixture('cleanup');
        const residual = await fixture('cleanup');
        assert.equal(residual.matched, 0);
        assert.equal(residual.changed, 0);
        report.zeroResidual = residual;
    } catch {
        report.result = 'fail';
        report.cleanupFailure = true;
        process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(
    JSON.stringify({
        result: report.result,
        failurePhase: report.failurePhase,
        failureReason: report.failureReason,
        runId,
        observations: report.observations.map(({ id, status, auditDelta, versionDelta }) => ({ id, status, auditDelta, versionDelta })),
        cleanup: report.zeroResidual?.state
    })
);
