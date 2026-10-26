import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSource } from './fixture-guard.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { upperStatic, uriWireRequest } from './uri-witness.mjs';
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
const root = path.resolve(import.meta.dirname, '../..');

export function headCases(id) {
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id));
    return [
        ['dictionary', '/api/platform/permissions'],
        ['list', '/api/platform/roles'],
        ['detail', '/api/platform/roles/' + id]
    ].flatMap(([operation, route]) =>
        [
            ['canonical', route],
            ['static-uppercase', upperStatic(route)],
            ['one-trailing-slash', route + '/'],
            ['two-trailing-slashes', route + '//'],
            ['encoded-static', route.replace('/api/', '/%61pi/')]
        ].map(([variant, path]) => ({ id: operation + ':' + variant, operation, variant, route: path }))
    );
}

async function rawRequest(session, route, method) {
    const wire = uriWireRequest(session, { method: 'GET', route });
    // HEAD is the implicit form of these three GET operations, with no body or
    // CSRF mutation. The shared raw-path admission and memory-only cookie policy
    // remain unchanged; the existing URI51 harness is never edited.
    wire.options.method = method;
    return new Promise((resolve, reject) => {
        const request = http.request(wire.origin, wire.options, (response) => {
            let length = 0;
            response.on('data', (bytes) => {
                length += bytes.length;
                if (length > 2 * 1024 * 1024) request.destroy(new Error('HEAD reference response exceeded limit'));
            });
            response.on('error', () => reject(new Error('HEAD response failed')));
            response.on('end', () =>
                resolve({
                    status: response.statusCode,
                    bodyByteLength: length,
                    headers: Object.fromEntries(
                        ['content-type', 'content-length', 'content-security-policy', 'x-content-type-options', 'allow', 'transfer-encoding'].filter((key) => response.headers[key] !== undefined).map((key) => [key, response.headers[key]])
                    ),
                    setCookieCount: (response.headers['set-cookie'] ?? []).length
                })
            );
        });
        request.on('timeout', () => request.destroy(new Error('HEAD timeout')));
        request.on('error', () => reject(new Error('HEAD request failed')));
        request.end();
    });
}

export async function runHeadWitness() {
    assert.equal(process.platform, 'linux');
    assert.equal(process.argv.length, 3);
    const backend = process.argv[2];
    assert(['nest', 'rust'].includes(backend));
    assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
    assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
    const output = path.join(root, `tmp/rust-r2b/head-linux-${backend}.json`),
        logPath = path.join(root, `tmp/rust-r2b/head-${backend}-server.log`);
    assert(!existsSync(output) && !existsSync(logPath), 'Preserve earlier HEAD evidence');
    const runId = randomUUID();
    const files = [
        ...readdirSync(import.meta.dirname)
            .filter((name) => /^(?:fixture-|role-fixture|managed-environment|http-client|invoke-fixture|head-witness|uri-witness)/.test(name) && /\.(?:mjs|cjs)$/.test(name))
            .map((name) => 'tools/rust-r2b/' + name),
        'tools/e2e/api-server.cjs',
        'tools/e2e/runtime.cjs'
    ];
    const hashes = () =>
        files.map((file) => ({
            file,
            sha256: createHash('sha256')
                .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
                .digest('hex')
        }));
    const report = { formatVersion: 1, result: 'pending', backend, platform: process.platform, runId, startedAt: new Date().toISOString(), sourceFiles: hashes(), observations: [], getReferences: [], serverStopped: false };
    const fixture = (action, session, slot) =>
        invokeFixture({ formatVersion: 1, runId, backend, action, account: session ? 'admin' : 'none', ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}), ...(slot ? { roleSlot: slot } : {}) });
    let phase = 'prepare',
        server;
    try {
        validateSource();
        await fixture('prepare');
        phase = 'start-owned-server';
        server = await startApiServer({ cwd: root, logPath, runId });
        if (backend === 'rust') report.binarySha256 = createHash('sha256').update(readFileSync(process.env.POMS_RUST_API_BINARY)).digest('hex');
        const session = new NavigationHttpSession(server.target.origin, runId);
        await session.login('admin');
        phase = 'create-owned-main';
        await fixture('role-plan', undefined, 'main');
        const spec = roleFixtureSpec(runId, 'main');
        const create = await session.request('POST', '/api/platform/roles', { json: { roleKey: spec.roleKey, name: spec.name, description: spec.description, displayOrder: spec.displayOrder } });
        const adopted = await fixture('role-adopt', undefined, 'main');
        assert.equal(create.status, 201);
        assert.equal(create.body.id, adopted.role.roleId);
        report.identities = { actorId: session.userId, roleId: create.body.id };
        const cases = headCases(create.body.id);
        assert.equal(cases.length, 15);
        for (const entry of cases.filter((value) => value.variant === 'canonical')) {
            const response = await rawRequest(session, entry.route, 'GET');
            assert.equal(response.status, 200);
            report.getReferences.push({ operation: entry.operation, route: entry.route, ...response });
        }
        for (const entry of cases) {
            phase = entry.id;
            await fixture('session-non-due', session);
            const before = (await fixture('snapshot', session)).snapshot;
            const roleBefore = (await fixture('role-snapshot', undefined, 'main')).roleSnapshot;
            const startedAt = new Date().toISOString();
            const response = await rawRequest(session, entry.route, 'HEAD');
            const after = (await fixture('snapshot', session)).snapshot;
            const roleAfter = (await fixture('role-snapshot', undefined, 'main')).roleSnapshot;
            report.observations.push({ ...entry, method: 'HEAD', startedAt, finishedAt: new Date().toISOString(), ...response, before, after, roleBefore, roleAfter });
            assert.equal(response.bodyByteLength, 0);
            assert.equal(response.setCookieCount, 0);
            assert.deepEqual(roleAfter, roleBefore);
            assert.deepEqual(after.audits, before.audits);
            assert.deepEqual(after.securityEvents, before.securityEvents);
            assert.deepEqual(after.session, before.session);
            if (entry.variant === 'canonical') assert.equal(response.status, 200);
        }
        validateSource();
        assert.deepEqual(hashes(), report.sourceFiles);
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runHeadWitness();
