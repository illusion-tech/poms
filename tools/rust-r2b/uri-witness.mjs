import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSource } from './fixture-guard.mjs';
import { NavigationHttpSession } from './http-client.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
const root = path.resolve(import.meta.dirname, '../..');

export function upperStatic(route) {
    return route
        .split('/')
        .map((part) => (['api', 'platform', 'roles', 'permissions'].includes(part) ? part.toUpperCase() : part))
        .join('/');
}

export function uriCases(id, roleKey) {
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id));
    const role = '/api/platform/roles/' + id;
    const operations = [
        { operation: 'dictionary', method: 'GET', route: '/api/platform/permissions' },
        { operation: 'list', method: 'GET', route: '/api/platform/roles' },
        { operation: 'create-duplicate', method: 'POST', route: '/api/platform/roles', json: { roleKey, name: 'R2B URI duplicate' } },
        { operation: 'detail', method: 'GET', route: role },
        { operation: 'update', method: 'PATCH', route: role, json: { name: 'R2B URI main' } },
        { operation: 'activate', method: 'POST', route: role + ':activate', json: {} },
        { operation: 'deactivate', method: 'POST', route: role + ':deactivate', json: {} },
        { operation: 'permissions', method: 'PUT', route: role + '/permissions', json: { permissionKeys: ['project:read'] } }
    ];
    const variants = [
        ['canonical', (route) => route],
        ['static-uppercase', upperStatic],
        ['one-trailing-slash', (route) => route + '/'],
        ['two-trailing-slashes', (route) => route + '//'],
        ['encoded-api', (route) => route.replace('/api/', '/%61pi/')]
    ];
    const cases = operations.flatMap((operation) => variants.map(([variant, convert]) => ({ ...operation, id: operation.operation + ':' + variant, variant, route: convert(operation.route) })));
    for (const suffix of ['activate', 'deactivate']) {
        cases.push({ id: suffix + ':uppercase-suffix', operation: suffix, variant: 'uppercase-suffix', method: 'POST', route: role + ':' + suffix.toUpperCase(), json: {} });
        cases.push({ id: suffix + ':encoded-colon', operation: suffix, variant: 'encoded-colon', method: 'POST', route: role + '%3A' + suffix, json: {} });
    }
    cases.push(
        { id: 'detail:encoded-platform', operation: 'detail', variant: 'encoded-platform', method: 'GET', route: '/api/%70latform/roles/' + id },
        { id: 'detail:encoded-roles', operation: 'detail', variant: 'encoded-roles', method: 'GET', route: '/api/platform/%72oles/' + id },
        { id: 'dictionary:encoded-permissions', operation: 'dictionary', variant: 'encoded-permissions', method: 'GET', route: '/api/platform/%70ermissions' },
        { id: 'permissions:encoded-permissions', operation: 'permissions', variant: 'encoded-permissions', method: 'PUT', route: role + '/%70ermissions', json: { permissionKeys: [] } },
        { id: 'detail:uppercase-uuid', operation: 'detail', variant: 'uppercase-uuid', method: 'GET', route: '/api/platform/roles/' + id.toUpperCase() },
        { id: 'guard:original-path', operation: 'update', variant: 'guard-original-path', method: 'PATCH', route: upperStatic(role) + '/?raw=1', json: { name: 'R2B must not update' }, options: { csrf: false } },
        { id: 'unknown:original-path', operation: 'unknown', variant: 'unknown-original-path', method: 'GET', route: upperStatic(role) + '/unknown?raw=1' }
    );
    assert.equal(cases.length, 51);
    assert.equal(new Set(cases.map((row) => row.id)).size, cases.length);
    return cases;
}

export function uriWireRequest(session, entry) {
    const origin = new URL(session.origin);
    assert(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname));
    assert(['GET', 'POST', 'PUT', 'PATCH'].includes(entry.method));
    assert(/^\/(?:api|%61pi)\//i.test(entry.route), 'Only the explicit API spelling probes are admitted');
    const headers = ['Host', origin.host, 'User-Agent', session.identity.userAgent, 'X-Request-Id', session.identity.requestId];
    if (session.cookies.size) headers.push('Cookie', [...session.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (entry.method !== 'GET' && entry.options?.csrf !== false && session.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', session.cookies.get('poms_csrf'));
    const body = entry.json === undefined ? undefined : Buffer.from(JSON.stringify(entry.json));
    if (body) headers.push('Content-Type', 'application/json', 'Content-Length', String(body.length));
    headers.push('Connection', 'close');
    return { origin, options: { method: entry.method, path: entry.route, headers, timeout: 20000 }, body };
}

// The ordinary client intentionally admits only lowercase /api. This witness
// must send alternate raw spellings without decoding or URL normalization.
async function uriRequest(session, entry) {
    const wire = uriWireRequest(session, entry);
    return new Promise((resolve, reject) => {
        const request = http.request(wire.origin, wire.options, (response) => {
            const chunks = [];
            let length = 0;
            response.on('data', (chunk) => {
                length += chunk.length;
                if (length > 2 * 1024 * 1024) request.destroy(new Error('URI response exceeded limit'));
                else chunks.push(chunk);
            });
            response.on('error', () => reject(new Error('URI HTTP response failed')));
            response.on('end', () => {
                try {
                    const text = Buffer.concat(chunks).toString('utf8');
                    const contentType = response.headers['content-type'] ?? '';
                    resolve({ status: response.statusCode, body: text ? (contentType.includes('application/json') ? JSON.parse(text) : text) : null, contentType, setCookie: response.headers['set-cookie'] ?? [] });
                } catch {
                    reject(new Error('URI response parsing failed'));
                }
            });
        });
        request.on('timeout', () => request.destroy(new Error('URI HTTP timeout')));
        request.on('error', () => reject(new Error('URI HTTP request failed')));
        request.end(wire.body);
    });
}

export async function runUriWitness() {
    assert.equal(process.platform, 'linux');
    assert.equal(process.argv.length, 3);
    const backend = process.argv[2];
    assert(['nest', 'rust'].includes(backend));
    assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
    assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
    const output = path.join(root, `tmp/rust-r2b/uri-linux-${backend}.json`);
    const logPath = path.join(root, `tmp/rust-r2b/uri-${backend}-server.log`);
    assert(!existsSync(output) && !existsSync(logPath), 'Preserve earlier URI witness artifacts');
    const runId = randomUUID();
    const files = [
        ...readdirSync(import.meta.dirname)
            .filter((name) => /^(?:fixture-|role-fixture|managed-environment|http-client|invoke-fixture|uri-witness)/.test(name) && /\.(?:mjs|cjs)$/.test(name))
            .map((name) => 'tools/rust-r2b/' + name),
        'tools/e2e/api-server.cjs',
        'tools/e2e/runtime.cjs',
        'apps/poms-api/src/app/features/platform/platform.controller.ts'
    ];
    const hashes = () =>
        files.map((file) => ({
            file,
            sha256: createHash('sha256')
                .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
                .digest('hex')
        }));
    const report = { formatVersion: 1, result: 'pending', backend, platform: process.platform, runId, startedAt: new Date().toISOString(), observations: [], sourceFiles: hashes(), serverStarted: false, serverStopped: false };
    const fixture = (action, account = 'none', session, roleSlot) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}), ...(roleSlot ? { roleSlot } : {}) });
    const roleFixture = (action) => fixture(action, 'none', undefined, 'main');
    let phase = 'prepare',
        server;
    try {
        validateSource();
        await fixture('prepare');
        phase = 'start-owned-server';
        server = await startApiServer({ cwd: root, logPath, runId });
        report.serverStarted = true;
        if (backend === 'rust') report.binarySha256 = createHash('sha256').update(readFileSync(process.env.POMS_RUST_API_BINARY)).digest('hex');
        const session = new NavigationHttpSession(server.target.origin, runId);
        phase = 'login-and-create-owned-main';
        await session.login('admin');
        await roleFixture('role-plan');
        const spec = roleFixtureSpec(runId, 'main');
        const created = await session.request('POST', '/api/platform/roles', { json: { roleKey: spec.roleKey, name: spec.name, description: spec.description, displayOrder: spec.displayOrder } });
        const adopted = await roleFixture('role-adopt');
        assert.equal(created.status, 201);
        assert.equal(created.body.id, adopted.role.roleId);
        const binding = await roleFixture('role-bind-viewer');
        assert.equal(binding.matched, 1);
        assert.equal(binding.changed, 1);
        report.identities = { actorId: session.userId, roleId: created.body.id, roleKey: spec.databaseKey };
        report.setup = { createResponse: created.body, binding };
        for (const entry of uriCases(created.body.id, spec.roleKey)) {
            phase = entry.id;
            await fixture('session-non-due', 'admin', session);
            const before = (await fixture('snapshot', 'admin', session)).snapshot;
            const roleBefore = (await roleFixture('role-snapshot')).roleSnapshot;
            const startedAt = new Date().toISOString();
            const response = await uriRequest(session, entry);
            const after = (await fixture('snapshot', 'admin', session)).snapshot;
            const roleAfter = (await roleFixture('role-snapshot')).roleSnapshot;
            report.observations.push({
                id: entry.id,
                operation: entry.operation,
                variant: entry.variant,
                method: entry.method,
                route: entry.route,
                requestBody: entry.json ?? null,
                startedAt,
                finishedAt: new Date().toISOString(),
                status: response.status,
                response: response.body,
                contentType: response.contentType,
                setCookieCount: response.setCookie.length,
                before,
                after,
                roleBefore,
                roleAfter,
                auditDelta: after.audits.length - before.audits.length,
                securityDelta: after.securityEvents.length - before.securityEvents.length
            });
            assert.equal(response.setCookie.length, 0);
            if (entry.variant === 'canonical') assert.equal(response.status, entry.operation === 'create-duplicate' ? 409 : 200);
            if (response.status >= 400) assert.equal(after.audits.length, before.audits.length);
        }
        phase = 'verify-source';
        validateSource();
        assert.deepEqual(hashes(), report.sourceFiles);
        assert.equal(report.observations.length, 51);
        report.result = 'observed';
    } catch (error) {
        report.result = 'fail';
        report.failurePhase = phase;
        report.failureReason = error.name;
        process.exitCode = 1;
    } finally {
        if (server) {
            try {
                await server.stop();
                report.serverStopped = true;
            } catch {
                report.serverStopped = false;
                report.result = 'fail';
                process.exitCode = 1;
            }
        } else report.serverStopped = true;
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
        JSON.stringify({ result: report.result, backend, runId, cases: report.observations.length, failurePhase: report.failurePhase, failureReason: report.failureReason, serverStopped: report.serverStopped, zeroResidual: report.zeroResidual })
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runUriWitness();
