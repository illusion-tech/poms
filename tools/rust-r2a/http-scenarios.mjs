import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { startApiServer, resolveApiPlan } = require('../e2e/api-server.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const backend = process.argv[2];
assert.equal(process.argv.length, 3);
assert(['nest', 'rust'].includes(backend));
assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2a');
const plan = resolveApiPlan();
assert.equal(plan.target.mode, `managed-${backend}`);
assert.equal(plan.managedEnvironment.database, `poms_r2a_${backend}`);
const output = path.join(root, `tmp/rust-r2a/http-${process.platform}-${backend}.json`);
assert(!existsSync(output), 'Preserve existing HTTP evidence before repeating');
const runId = randomUUID();
const oracle = JSON.parse(readFileSync(path.join(root, 'tools/rust-r2a/navigation-golden.json'), 'utf8')).original;
const expectedTree = (id) => {
    const found = oracle.cases.find((value) => value.id === id);
    assert(found);
    return found.expectedTree;
};
const report = { formatVersion: 1, result: 'pending', runId, backend, platform: process.platform, startedAt: new Date().toISOString(), cases: [], cleanup: null, sourceFiles: [] };
const sources = [
    ...readdirSync(import.meta.dirname)
        .filter((name) => /^(?:fixture-|managed-environment|http-client|invoke-fixture|http-scenarios|navigation-golden)/.test(name) && /\.(?:mjs|cjs|json)$/.test(name))
        .map((name) => `tools/rust-r2a/${name}`),
    'tools/e2e/api-server.cjs',
    'tools/e2e/runtime.cjs'
];
const hashes = () =>
    sources.map((file) => ({
        file,
        sha256: createHash('sha256')
            .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
            .digest('hex')
    }));
report.sourceFiles = hashes();
const fixture = (action, account = 'none', client) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}) });
const snapshot = async (client, account = 'admin') => (await fixture('snapshot', account, client)).snapshot;
let phase = 'prepare';
let server;
async function scenario(id, body) {
    phase = id;
    const startedAt = new Date().toISOString();
    try {
        const observed = await body();
        report.cases.push({ id, result: 'pass', startedAt, finishedAt: new Date().toISOString(), observed });
    } catch {
        report.cases.push({ id, result: 'fail', startedAt, finishedAt: new Date().toISOString() });
        throw new Error('scenario failed');
    }
}
function errorResponse(response, status, code) {
    assert.equal(response.status, status);
    if (code) assert.equal(response.body.code, code);
    assert.equal(response.setCookie.length, 0);
    return { status: response.status, body: response.body, setCookieCount: response.setCookie.length };
}
function addedAudits(before, after) {
    return after.audits.filter((row) => !before.audits.some((old) => old.id === row.id));
}
function checkAudit(row, userId, requestId, startedAt, finishedAt) {
    assert.deepEqual(Object.keys(row).sort(), ['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt'].sort());
    assert(/^[0-9a-f-]{36}$/.test(row.id));
    assert.equal(row.eventType, 'platform.navigation.synced');
    assert.equal(row.targetType, 'NavigationTree');
    assert.equal(row.targetId, 'platform-navigation');
    assert.equal(row.operatorId, userId);
    assert.equal(row.requestId, requestId);
    assert.equal(row.result, 'success');
    assert.equal(row.reason, null);
    assert.equal(row.beforeSnapshot, null);
    assert.deepEqual(row.afterSnapshot, oracle.snapshot);
    assert.deepEqual(row.metadata, { source: 'static-navigation-ssot' });
    assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.occurredAt));
    assert(Date.parse(row.occurredAt) >= startedAt - 1000 && Date.parse(row.occurredAt) <= finishedAt + 1000);
}
try {
    await fixture('prepare');
    phase = 'start-backend';
    server = await startApiServer({ logPath: path.join(root, `tmp/rust-r2a/http-${backend}-server.log`), runId, timeoutMs: 180000 });
    const admin = new NavigationHttpSession(plan.target.origin, runId);
    const viewer = new NavigationHttpSession(plan.target.origin, runId);
    const anonymous = new NavigationHttpSession(plan.target.origin, runId);
    phase = 'login-owned-accounts';
    await admin.login('admin');
    await viewer.login('viewer');
    for (const [method, route] of [
        ['GET', '/api/me/navigation'],
        ['GET', '/api/platform/navigation'],
        ['POST', '/api/platform/navigation:sync']
    ]) {
        await scenario(`anonymous-${method}-${route}`, async () => errorResponse(await anonymous.request(method, route), 401, 'session_missing'));
    }
    await scenario('admin-current-user-tree-original-ts-oracle', async () => {
        const response = await admin.request('GET', '/api/me/navigation');
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, expectedTree('authority-all-permissions'));
        assert.equal(response.setCookie.length, 0);
        return { status: response.status, tree: response.body };
    });
    await scenario('admin-full-tree-preserves-authority-order', async () => {
        const response = await admin.request('GET', '/api/platform/navigation');
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, oracle.fullTree);
        return { status: response.status, tree: response.body };
    });
    for (const [action, id] of [
        [null, 'authority-shell-org'],
        ['permissions-and-full', 'authority-shell-org-and-sync'],
        ['permissions-none', 'authority-no-permissions']
    ]) {
        await scenario(`viewer-tree-${id}`, async () => {
            if (action) await fixture(action, 'viewer');
            const response = await viewer.request('GET', '/api/me/navigation');
            assert.equal(response.status, 200);
            assert.deepEqual(response.body, expectedTree(id));
            return { status: response.status, tree: response.body };
        });
    }
    await fixture('permissions-and-partial', 'viewer');
    for (const [method, route] of [
        ['GET', '/api/platform/navigation'],
        ['POST', '/api/platform/navigation:sync']
    ]) {
        await scenario(`viewer-forbidden-${method}`, async () => {
            const before = await snapshot(viewer, 'viewer');
            const response = await viewer.request(method, route, method === 'POST' ? { json: {} } : {});
            const after = await snapshot(viewer, 'viewer');
            assert.equal(after.audits.length, before.audits.length);
            assert(after.securityEvents.length > before.securityEvents.length);
            return errorResponse(response, 403, 'permission_denied');
        });
    }
    for (const csrf of [false, 'q'.repeat(43), 'session-unbound']) {
        await scenario(`sync-csrf-${csrf === false ? 'missing' : csrf === 'session-unbound' ? 'unbound' : 'wrong'}`, async () => {
            const original = admin.cookies.get('poms_csrf');
            const before = await snapshot(admin);
            let response;
            try {
                if (csrf === 'session-unbound') admin.cookies.set('poms_csrf', 'z'.repeat(43));
                response = await admin.request('POST', '/api/platform/navigation:sync', { json: {}, csrf: csrf === 'session-unbound' ? true : csrf });
            } finally {
                admin.cookies.set('poms_csrf', original);
            }
            const after = await snapshot(admin);
            assert.equal(after.audits.length, before.audits.length);
            assert(after.securityEvents.length > before.securityEvents.length);
            return errorResponse(response, 403, 'csrf_failed');
        });
    }
    const syncCases = [
        { id: 'no-body', options: {} },
        { id: 'unknown-json-fields-ignored', options: { json: { ignored: ['value'], version: -1 } } },
        { id: 'array-json-ignored', options: { json: ['ignored'] } },
        { id: 'form-body-ignored', options: { body: 'ignored=value', contentType: 'application/x-www-form-urlencoded' } },
        { id: 'missing-request-id', options: { requestId: null }, expectedRequestId: null },
        { id: 'correlation-id-fallback', options: { requestId: null, correlationId: `corr:${runId}` }, expectedRequestId: `corr:${runId}` },
        { id: 'empty-request-id-precedes-correlation', options: { requestId: '', correlationId: 'must-not-win' }, expectedRequestId: '' },
        { id: 'request-id-precedes-correlation', options: { correlationId: 'must-not-win' } },
        { id: 'duplicate-native-request-id', options: { requestId: null, rawHeaders: ['X-Request-Id', 'first', 'X-Request-Id', 'second'] }, expectedRequestId: 'first, second' },
        { id: 'max-request-id-length', options: { requestId: 'x'.repeat(64) }, expectedRequestId: 'x'.repeat(64) }
    ];
    for (const item of syncCases) {
        await scenario(`successful-sync-${item.id}`, async () => {
            const before = await snapshot(admin);
            const startedAt = Date.now();
            const response = await admin.request('POST', '/api/platform/navigation:sync', item.options);
            const finishedAt = Date.now();
            const after = await snapshot(admin);
            assert.equal(response.status, 200);
            assert.deepEqual(response.body, oracle.snapshot);
            assert.equal(response.setCookie.length, 0);
            const added = addedAudits(before, after);
            assert.equal(added.length, 1);
            checkAudit(added[0], admin.userId, Object.hasOwn(item, 'expectedRequestId') ? item.expectedRequestId : admin.identity.requestId, startedAt, finishedAt);
            return { status: response.status, summary: response.body, audit: added[0] };
        });
    }
    for (const due of [false, true]) {
        await scenario(`successful-sync-session-${due ? 'due' : 'non-due'}`, async () => {
            await fixture(due ? 'session-due' : 'session-non-due', 'admin', admin);
            const before = await snapshot(admin);
            const response = await admin.request('POST', '/api/platform/navigation:sync', { json: {} });
            const after = await snapshot(admin);
            assert.equal(response.status, 200);
            assert.deepEqual(response.body, oracle.snapshot);
            assert.equal(addedAudits(before, after).length, 1);
            assert.equal(after.session.rowVersion - before.session.rowVersion, due ? 2 : 0);
            return { status: response.status, before: before.session, after: after.session, auditDelta: 1 };
        });
        await scenario(`failed-sync-overlong-request-id-${due ? 'due' : 'non-due'}`, async () => {
            await fixture(due ? 'session-due' : 'session-non-due', 'admin', admin);
            const before = await snapshot(admin);
            const response = await admin.request('POST', '/api/platform/navigation:sync', { json: {}, requestId: 'x'.repeat(65) });
            const after = await snapshot(admin);
            assert.equal(after.audits.length, before.audits.length);
            assert.equal(after.session.rowVersion - before.session.rowVersion, due ? 1 : 0);
            return { ...errorResponse(response, 500), before: before.session, after: after.session, auditDelta: 0 };
        });
    }
    for (const route of ['/api/me/navigation', '/api/platform/navigation']) {
        await scenario(`get-due-without-audit-flush-${route}`, async () => {
            await fixture('session-due', 'admin', admin);
            const before = await snapshot(admin);
            const response = await admin.request('GET', route);
            const after = await snapshot(admin);
            assert.equal(response.status, 200);
            assert.equal(after.audits.length, before.audits.length);
            assert.equal(after.session.rowVersion - before.session.rowVersion, 1);
            return { status: response.status, before: before.session, after: after.session };
        });
    }
    for (const [id, options, status] of [
        ['malformed-json-before-auth', { body: '{', contentType: 'application/json' }, 400],
        ['oversized-json-before-auth', { body: JSON.stringify({ data: 'x'.repeat(102400) }), contentType: 'application/json' }, 413],
        ['primitive-json-before-auth', { body: '42', contentType: 'application/json' }, 400]
    ])
        await scenario(id, async () => errorResponse(await anonymous.request('POST', '/api/platform/navigation:sync', options), status));
    for (const [method, route] of [
        ['DELETE', '/api/me/navigation'],
        ['GET', '/api/platform/navigation:sync'],
        ['POST', '/api/platform/navigation/sync']
    ]) {
        await scenario(`wrong-method-or-path-${method}-${route}`, async () => {
            const response = await admin.request(method, route, method === 'GET' ? {} : { json: {} });
            assert.match(response.contentType, /text\/html/);
            assert.equal(typeof response.body, 'string');
            assert(response.body.includes(`Cannot ${method} ${route}`));
            return errorResponse(response, 404);
        });
    }
    await fixture('expire-idle', 'admin', admin);
    for (const [method, route] of [
        ['GET', '/api/me/navigation'],
        ['GET', '/api/platform/navigation'],
        ['POST', '/api/platform/navigation:sync']
    ]) {
        await scenario(`expired-protected-cookie-preserved-${method}-${route}`, async () => {
            const token = admin.cookies.get('poms_session');
            const before = await snapshot(admin);
            const response = await admin.request(method, route, method === 'POST' ? { json: {} } : {});
            const after = await snapshot(admin);
            assert.equal(admin.cookies.get('poms_session'), token);
            assert.equal(after.audits.length, before.audits.length);
            return errorResponse(response, 401, 'session_expired');
        });
    }
    phase = 'source-freeze';
    assert.deepEqual(hashes(), report.sourceFiles);
    report.result = 'pass';
} catch {
    report.result = 'fail';
    report.failurePhase = phase;
    process.exitCode = 1;
} finally {
    if (server) {
        try {
            await server.stop();
            report.serverStopped = true;
        } catch {
            report.result = 'fail';
            report.serverStopped = false;
            process.exitCode = 1;
        }
    }
    try {
        report.cleanup = await fixture('cleanup');
        report.zeroResidual = await fixture('cleanup');
        assert.equal(report.zeroResidual.matched, 0);
        assert.equal(report.zeroResidual.changed, 0);
    } catch {
        report.result = 'fail';
        report.cleanupFailure = true;
        process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ result: report.result, backend, runId, cases: report.cases.length, passed: report.cases.filter((item) => item.result === 'pass').length, failurePhase: report.failurePhase, cleanup: report.zeroResidual?.state }));
