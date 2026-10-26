import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
assert.equal(process.argv.length, 3);
const backend = process.argv[2];
assert(['nest', 'rust'].includes(backend));
assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'tmp/rust-r2b/http-' + process.platform + '-' + backend + '.json');
assert(!existsSync(output), 'Preserve previous run before retry');
const runId = randomUUID(),
    roles = new Map();
let phase = 'prepare',
    server;
const report = { formatVersion: 1, result: 'pending', runId, backend, platform: process.platform, startedAt: new Date().toISOString(), observations: [], identities: {} };
const sourceFiles = [
    ...readdirSync(import.meta.dirname)
        .filter((name) => /^(?:fixture-|role-fixture|managed-environment|http-client|invoke-fixture|http-scenarios)/.test(name) && /\.(?:mjs|cjs)$/.test(name))
        .map((name) => 'tools/rust-r2b/' + name),
    'tools/rust-r2b/roles-golden.json',
    'tools/rust-r2b/roles-authority.json',
    'tools/e2e/api-server.cjs',
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
const fixture = (action, account = 'none', client, roleSlot) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}), ...(roleSlot ? { roleSlot } : {}) });
const roleFixture = (action, slot) => fixture(action, 'none', undefined, slot);
try {
    await fixture('prepare');
    phase = 'start-server';
    server = await startApiServer({ cwd: root, logPath: path.join(root, 'tmp/rust-r2b/http-' + backend + '-server.log'), runId });
    const target = server.target,
        client = new NavigationHttpSession(target.origin, runId);
    await client.login('admin');
    report.identities.admin = client.userId;
    const viewer = new NavigationHttpSession(target.origin, runId);
    await viewer.login('viewer');
    report.identities.viewer = viewer.userId;
    const anonymous = new NavigationHttpSession(target.origin, runId);
    async function observe({ id, due, method, route, json, slot, create = false, session = client, options = {}, expectedStatus }) {
        phase = id;
        if (create) await roleFixture('role-plan', slot);
        await fixture(due ? 'session-due' : 'session-non-due', 'admin', client);
        const before = (await fixture('snapshot', 'admin', client)).snapshot;
        const roleBefore = slot && roles.get(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
        const startedAt = new Date().toISOString();
        const response = await session.request(method, route, { ...(json === undefined ? {} : { json }), ...options });
        if (create) {
            const adopted = await roleFixture('role-adopt', slot);
            roles.set(slot, adopted.role.roleId);
        }
        const after = (await fixture('snapshot', 'admin', client)).snapshot;
        const roleAfter = slot && roles.get(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
        const entry = {
            id,
            due,
            method,
            route,
            status: response.status,
            response: response.body,
            setCookieCount: response.setCookie.length,
            startedAt,
            finishedAt: new Date().toISOString(),
            before,
            after,
            roleBefore,
            roleAfter,
            auditDelta: after.audits.length - before.audits.length,
            sessionVersionDelta: after.session.rowVersion - before.session.rowVersion,
            roleVersionDelta: roleBefore && roleAfter ? roleAfter.role.row_version - roleBefore.role.row_version : null
        };
        report.observations.push(entry);
        if (expectedStatus !== undefined) assert.equal(response.status, expectedStatus, id);
        if (response.status >= 400) assert.equal(entry.auditDelta, 0, id + ' must not add a success audit');
        if (response.status < 400 && response.body && typeof response.body === 'object' && !Array.isArray(response.body) && Object.hasOwn(response.body, 'roleKey')) {
            const keys = ['id', 'roleKey', 'name', 'description', 'isActive', 'isSystemRole', 'displayOrder', 'createdAt', 'updatedAt', ...(Object.hasOwn(response.body, 'permissionKeys') ? ['permissionKeys', 'assignedUserCount'] : [])];
            assert.deepEqual(Object.keys(response.body).sort(), keys.sort());
            for (const key of ['createdAt', 'updatedAt']) assert.equal(new Date(response.body[key]).toISOString(), response.body[key]);
        }
        return response;
    }
    for (const [slot, due] of [
        ['main', true],
        ['second', false]
    ]) {
        const { roleKey, name, description, displayOrder } = roleFixtureSpec(runId, slot);
        const response = await observe({ id: `create-${due ? 'due' : 'non-due'}`, due, method: 'POST', route: '/api/platform/roles', slot, create: true, json: { roleKey, name, description, displayOrder } });
        assert.equal(response.status, 201);
    }
    const rolePath = `/api/platform/roles/${roles.get('main')}`;
    for (const due of [true, false]) {
        await observe({ id: `dirty-update-${due}`, due, method: 'PATCH', route: rolePath, slot: 'main', json: { name: `R2B dirty ${due}`, displayOrder: due ? 7 : 8 } });
        await observe({ id: `noop-update-${due}`, due, method: 'PATCH', route: rolePath, slot: 'main', json: { name: `R2B dirty ${due}`, displayOrder: due ? 7 : 8 } });
        await observe({ id: `deactivate-${due}`, due, method: 'POST', route: `${rolePath}:deactivate`, slot: 'main', json: { expectedVersion: 999999, reason: 'ignored', comment: 'ignored' } });
        await observe({ id: `noop-deactivate-${due}`, due, method: 'POST', route: `${rolePath}:deactivate`, slot: 'main', json: {} });
        await observe({ id: `activate-${due}`, due, method: 'POST', route: `${rolePath}:activate`, slot: 'main', json: {} });
        await observe({ id: `noop-activate-${due}`, due, method: 'POST', route: `${rolePath}:activate`, slot: 'main', json: {} });
        const permissionKeys = due ? ['project:read', 'nav:dashboard:view', 'project:read'] : ['nav:profile:view', 'project:read'];
        await observe({ id: `permissions-changed-${due}`, due, method: 'PUT', route: `${rolePath}/permissions`, slot: 'main', json: { permissionKeys } });
        await observe({ id: `permissions-noop-${due}`, due, method: 'PUT', route: `${rolePath}/permissions`, slot: 'main', json: { permissionKeys } });
    }
    for (const slot of ['utf16-name', 'utf16-description', 'utf16-key', 'order-overflow']) {
        const { roleKey, name, description, displayOrder } = roleFixtureSpec(runId, slot);
        await observe({ id: `create-${slot}`, due: true, method: 'POST', route: '/api/platform/roles', slot, create: true, json: { roleKey, name, description, displayOrder } });
    }
    await observe({ id: 'update-description-surrogate', due: true, method: 'PATCH', route: rolePath, slot: 'main', json: { description: '\ud800' } });
    await observe({ id: 'update-description-surrogate-again', due: true, method: 'PATCH', route: rolePath, slot: 'main', json: { description: '\ud800' } });
    await observe({ id: 'update-description-restored', due: false, method: 'PATCH', route: rolePath, slot: 'main', json: { description: null } });
    await observe({ id: 'invalid-uuid', due: true, method: 'GET', route: '/api/platform/roles/not-a-uuid' });
    await observe({ id: 'missing-uuid', due: true, method: 'GET', route: '/api/platform/roles/00000000-0000-0000-0000-000000000000' });
    const allRoles = await client.request('GET', '/api/platform/roles');
    const ownRole = allRoles.body.find((role) => role.roleKey === `r2b_admin_${runId}`);
    assert(ownRole);
    report.identities.adminRole = ownRole.id;
    await observe({ id: 'update-actor-assigned-role', due: true, method: 'PATCH', route: `/api/platform/roles/${ownRole.id}`, json: { name: 'R2B actor role updated' } });

    const dictionary = await observe({ id: 'permission-dictionary', due: false, method: 'GET', route: '/api/platform/permissions', expectedStatus: 200 });
    assert.deepEqual(dictionary.body, JSON.parse(readFileSync(path.join(root, 'tools/rust-r2b/roles-authority.json'), 'utf8')).permissions);
    await observe({ id: 'extra-query-ignored', due: false, method: 'GET', route: rolePath + '?filter=inactive&limit=0', slot: 'main', expectedStatus: 200 });
    const duplicate = roleFixtureSpec(runId, 'main');
    await observe({ id: 'duplicate-key-precheck', due: true, method: 'POST', route: '/api/platform/roles', json: { roleKey: duplicate.roleKey, name: 'ignored duplicate' }, expectedStatus: 409 });
    await observe({ id: 'unknown-fields-stripped', due: false, method: 'PATCH', route: rolePath, slot: 'main', json: { description: null, roleKey: 'forbidden-key', isSystemRole: true, isActive: false, rowVersion: 88 }, expectedStatus: 200 });
    await observe({ id: 'permissions-mixed-due', due: true, method: 'PUT', route: rolePath + '/permissions', slot: 'main', json: { permissionKeys: ['project:read', 'nav:dashboard:view'] }, expectedStatus: 200 });
    await observe({ id: 'permissions-readd-history', due: false, method: 'PUT', route: rolePath + '/permissions', slot: 'main', json: { permissionKeys: ['nav:profile:view', 'project:read'] }, expectedStatus: 200 });
    const unicode = roleFixtureSpec(runId, 'unicode');
    await observe({ id: 'unicode-role-create', due: false, method: 'POST', route: '/api/platform/roles', slot: 'unicode', create: true, json: { roleKey: unicode.roleKey, name: unicode.name }, expectedStatus: 201 });
    await roleFixture('role-insert-historical', 'unicode');
    const unknown = await observe({ id: 'unknown-history-detail', due: false, method: 'GET', route: '/api/platform/roles/' + roles.get('unicode'), slot: 'unicode', expectedStatus: 200 });
    assert.equal(unknown.body.permissionKeys.length, 7);
    assert(!unknown.body.permissionKeys.includes('unknown:old'));
    await observe({ id: 'unknown-history-replaced', due: false, method: 'PUT', route: '/api/platform/roles/' + roles.get('unicode') + '/permissions', slot: 'unicode', json: { permissionKeys: ['project:read'] }, expectedStatus: 200 });
    const unknownSystem = roleFixtureSpec(runId, 'unknown-system');
    await observe({ id: 'unknown-system-create', due: false, method: 'POST', route: '/api/platform/roles', slot: 'unknown-system', create: true, json: { roleKey: unknownSystem.roleKey, name: unknownSystem.name }, expectedStatus: 201 });
    await roleFixture('role-set-system', 'unknown-system');
    await observe({ id: 'unknown-system-empty-permissions', due: false, method: 'PUT', route: '/api/platform/roles/' + roles.get('unknown-system') + '/permissions', slot: 'unknown-system', json: { permissionKeys: [] }, expectedStatus: 200 });
    await roleFixture('role-bind-viewer', 'main');
    const detailCount = await observe({ id: 'assigned-active-relation-count', due: false, method: 'GET', route: rolePath, slot: 'main', expectedStatus: 200 });
    assert.equal(detailCount.body.assignedUserCount, 1);
    await fixture('disable', 'viewer');
    const inactiveCount = await observe({ id: 'inactive-user-still-counted', due: false, method: 'GET', route: rolePath, slot: 'main', expectedStatus: 200 });
    assert.equal(inactiveCount.body.assignedUserCount, 1);
    await fixture('restore', 'viewer');
    await observe({ id: 'second-role-deactivate', due: false, method: 'POST', route: '/api/platform/roles/' + roles.get('second') + ':deactivate', slot: 'second', json: {}, expectedStatus: 200 });
    const listed = await observe({ id: 'role-list-includes-inactive', due: false, method: 'GET', route: '/api/platform/roles?limit=1&isActive=true', expectedStatus: 200 });
    report.identities.listRoles = listed.body.map((role) => ({ id: role.id, roleKey: role.roleKey }));
    assert(listed.body.some((role) => role.id === roles.get('main')));
    assert.equal(listed.body.find((role) => role.id === roles.get('second')).isActive, false);
    for (let i = 1; i < listed.body.length; i++) assert(listed.body[i - 1].displayOrder <= listed.body[i].displayOrder);
    for (const [id, method, route, json] of [
        ['get-permissions', 'GET', '/api/platform/permissions'],
        ['get-roles', 'GET', '/api/platform/roles'],
        ['post-role', 'POST', '/api/platform/roles', {}],
        ['get-role', 'GET', rolePath],
        ['patch-role', 'PATCH', rolePath, {}],
        ['activate', 'POST', rolePath + ':activate', {}],
        ['deactivate', 'POST', rolePath + ':deactivate', {}],
        ['replace', 'PUT', rolePath + '/permissions', { permissionKeys: [] }]
    ]) {
        await observe({ id: 'unauthenticated-' + id, due: false, method, route, json, session: anonymous, expectedStatus: 401 });
        await observe({ id: 'forbidden-' + id, due: false, method, route, json, session: viewer, expectedStatus: 403 });
        if (method !== 'GET') await observe({ id: 'csrf-' + id, due: false, method, route, json, options: { csrf: false }, expectedStatus: 403 });
    }
    const golden = JSON.parse(readFileSync(path.join(root, 'tools/rust-r2b/roles-golden.json'), 'utf8'));
    for (const entry of golden.cases.filter((c) => !c.expected.success)) {
        const [method, route] =
            entry.schema === 'CreateRoleRequest'
                ? ['POST', '/api/platform/roles']
                : entry.schema === 'UpdateRoleRequest'
                  ? ['PATCH', rolePath]
                  : entry.schema === 'UpdateRoleActivationRequest'
                    ? ['POST', rolePath + ':activate']
                    : ['PUT', rolePath + '/permissions'];
        await observe({ id: 'dto-' + entry.name, due: false, method, route, options: entry.inputRaw === null ? {} : { body: entry.inputRaw, contentType: 'application/json' }, expectedStatus: 400 });
    }
    for (const [id, method, route, options, expectedStatus] of [
        ['malformed-json', 'PATCH', rolePath, { body: '{', contentType: 'application/json' }, 400],
        ['wrong-content-type', 'PATCH', rolePath, { body: '{}', contentType: 'text/plain' }, 400],
        ['body-limit', 'PATCH', rolePath, { body: JSON.stringify({ name: 'x'.repeat(102401) }), contentType: 'application/json' }, 413],
        ['missing-body', 'PATCH', rolePath, {}, 400],
        ['unsupported-delete', 'DELETE', rolePath, {}, 404],
        ['old-slash-activation', 'POST', rolePath + '/activate', { json: {} }, 404]
    ])
        await observe({ id, due: false, method, route, options, expectedStatus });
    phase = 'verify-source';
    assert.deepEqual(hashes(), report.sourceFiles, 'Input changed during HTTP run');
    report.result = 'pass';
} catch (error) {
    report.result = 'fail';
    report.failurePhase = phase;
    report.failureReason = error.name;
    process.exitCode = 1;
} finally {
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
        const residual = await fixture('cleanup');
        assert.equal(residual.matched, 0);
        assert.equal(residual.changed, 0);
        report.zeroResidual = residual;
    } catch {
        report.cleanupFailure = true;
        report.result = 'fail';
        process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ result: report.result, backend, runId, cases: report.observations.length, failurePhase: report.failurePhase, failureReason: report.failureReason, serverStopped: report.serverStopped, zeroResidual: report.zeroResidual }));
