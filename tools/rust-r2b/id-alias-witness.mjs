import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseFor, validateSource, verifyConnection } from './fixture-guard.mjs';
import { journalStore } from './fixture-journal.mjs';
import { NavigationHttpSession } from './http-client.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const { startApiServer } = require('../e2e/api-server.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function idAliases(id) {
    assert.equal(typeof id, 'string');
    assert(uuid.test(id), 'Canonical known role UUID required');
    return [
        { kind: 'canonical', value: id },
        { kind: 'uppercase', value: id.toUpperCase() },
        { kind: 'compact', value: id.replaceAll('-', '') }
    ];
}

export function assertViewerBinding(binding) {
    // invokeFixture already validates the envelope's run/backend/action.
    assert.equal(binding.matched, 1);
    assert.equal(binding.changed, 1);
    assert.equal(binding.state, 'role-bound-viewer');
}

function assertContext(context) {
    assert(uuid.test(context.runId) && uuid.test(context.actorId) && uuid.test(context.roleId));
    assert.equal(context.username, fixtureCredentials(context.runId, 'admin').username);
    assert.equal(context.roleKey, roleFixtureSpec(context.runId, 'main').databaseKey);
}

export const aliasAuditSql = `select id::text,event_type as "eventType",target_type as "targetType",target_id as "targetId",
    operator_id::text as "operatorId",request_id as "requestId",result,reason,
    before_snapshot as "beforeSnapshot",after_snapshot as "afterSnapshot",metadata,occurred_at as "occurredAt"
    from poms.audit_log where operator_id=$1::uuid and target_type='PlatformRole'
    and target_id=any($2::text[]) order by occurred_at,id limit 17`;

// This independent reader deliberately does not call fixture auditSnapshot(),
// whose lowercase-only targetId admission is the boundary being investigated.
// Every query is read-only and limited to this run's exact actor and main role.
export async function readOwnedAliasAudits(client, context) {
    assertContext(context);
    const targets = [...new Set(idAliases(context.roleId).map((alias) => alias.value))];
    await client.query('BEGIN READ ONLY');
    try {
        const owned = await client.query(
            `select u.id::text as actor_id,u.username,r.id::text as role_id,r.role_key
            from poms.platform_user u cross join poms.role r
            where u.id=$1::uuid and u.username=$2 and r.id=$3::uuid and r.role_key=$4`,
            [context.actorId, context.username, context.roleId, context.roleKey]
        );
        assert.deepEqual(owned.rows, [{ actor_id: context.actorId, username: context.username, role_id: context.roleId, role_key: context.roleKey }]);
        const result = await client.query(aliasAuditSql, [context.actorId, targets]);
        assert(result.rows.length <= 16, 'Owned alias audit observation limit');
        return result.rows.map((row) => {
            assert(uuid.test(row.id));
            assert.equal(row.operatorId, context.actorId);
            assert.equal(row.targetType, 'PlatformRole');
            assert(targets.includes(row.targetId), 'Audit target must be a literal known role alias');
            assert(['platform.role.created', 'platform.role.permissions.replaced'].includes(row.eventType));
            assert.equal(row.requestId, null);
            assert(row.occurredAt instanceof Date && Number.isFinite(row.occurredAt.getTime()));
            return { ...row, occurredAt: row.occurredAt.toISOString() };
        });
    } finally {
        await client.query('ROLLBACK');
    }
}

function connection(backend, owner) {
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const password = readFileSync(owner ? '/run/secrets/r2b-owner-password' : '/run/secrets/r2b-app-password', 'utf8');
    assert(owner ? password.length > 0 && password.length <= 1024 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
    return new Client({
        host: '127.0.0.1',
        port: 15432,
        database: databaseFor(backend),
        user: owner ? 'poms_r0e_owner' : 'poms_r2b_app',
        password,
        options: '-c default_transaction_read_only=on',
        application_name: 'poms-r2b-owned-id-alias-witness',
        connectionTimeoutMillis: 5000,
        query_timeout: 10000
    });
}

export async function runAliasWitness() {
    assert.equal(process.platform, 'linux');
    assert.equal(process.argv.length, 3);
    const backend = process.argv[2];
    assert(['nest', 'rust'].includes(backend));
    assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
    assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2b');
    assert(!Object.keys(process.env).some((key) => /^(?:PG|DB_|MIKRO_)/i.test(key) || /^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS)$/i.test(key)), 'Ambient database/process override is forbidden');
    const output = path.join(root, `tmp/rust-r2b/id-alias-${process.platform}-${backend}.json`);
    const logPath = path.join(root, `tmp/rust-r2b/id-alias-${backend}-server.log`);
    assert(!existsSync(output) && !existsSync(logPath), 'Preserve earlier alias witness output and server log');
    const runId = randomUUID();
    const sourceFiles = [
        ...readdirSync(import.meta.dirname)
            .filter((name) => /^(?:fixture-|role-fixture|managed-environment|http-client|invoke-fixture|id-alias-witness)/.test(name) && /\.(?:mjs|cjs)$/.test(name))
            .map((name) => 'tools/rust-r2b/' + name),
        'tools/e2e/api-server.cjs',
        'tools/e2e/runtime.cjs',
        'apps/poms-api/src/app/features/platform/platform.service.ts'
    ];
    const hashes = () =>
        sourceFiles.map((file) => ({
            file,
            sha256: createHash('sha256')
                .update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
                .digest('hex')
        }));
    const report = { formatVersion: 1, result: 'pending', backend, platform: process.platform, runId, startedAt: new Date().toISOString(), observations: [], sourceFiles: hashes(), serverStarted: false, serverStopped: false };
    const fixture = (action, account = 'none', session, roleSlot) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}), ...(roleSlot ? { roleSlot } : {}) });
    const roleFixture = (action) => fixture(action, 'none', undefined, 'main');
    let phase = 'verify-source',
        observer,
        server;
    try {
        validateSource();
        phase = 'verify-owner-marker';
        const owner = connection(backend, true);
        try {
            await owner.connect();
            await verifyConnection(owner, databaseFor(backend), true);
        } finally {
            await owner.end();
        }
        phase = 'verify-app-runtime';
        observer = connection(backend, false);
        await observer.connect();
        await verifyConnection(observer, databaseFor(backend));
        phase = 'fixture-prepare';
        await fixture('prepare');
        phase = 'start-owned-backend';
        server = await startApiServer({ cwd: root, logPath, runId });
        report.serverStarted = true;
        if (backend === 'rust') {
            assert.equal(typeof process.env.POMS_RUST_API_BINARY, 'string');
            report.binarySha256 = createHash('sha256').update(readFileSync(process.env.POMS_RUST_API_BINARY)).digest('hex');
        }
        const session = new NavigationHttpSession(server.target.origin, runId);
        phase = 'login-owned-admin';
        await session.login('admin');
        await roleFixture('role-plan');
        const spec = roleFixtureSpec(runId, 'main');
        phase = 'create-owned-main';
        const created = await session.request('POST', '/api/platform/roles', { json: { roleKey: spec.roleKey, name: spec.name, description: spec.description, displayOrder: spec.displayOrder } });
        const adopted = await roleFixture('role-adopt');
        assert.equal(created.status, 201);
        assert.equal(created.body.id, adopted.role.roleId);
        const binding = await roleFixture('role-bind-viewer');
        assertViewerBinding(binding);
        const journal = journalStore({ runId, backend }).read();
        assert.equal(journal.state, 'prepared');
        const actor = journal.accounts.find((account) => account.account === 'admin');
        assert.equal(actor.userId, session.userId);
        const context = { runId, actorId: actor.userId, username: actor.username, roleId: adopted.role.roleId, roleKey: spec.databaseKey };
        assertContext(context);
        report.identities = { actorId: context.actorId, roleId: context.roleId, aliases: idAliases(context.roleId) };
        report.setup = { createStatus: created.status, createResponse: created.body, binding, initialAudits: await readOwnedAliasAudits(observer, context) };
        assert.equal(report.setup.initialAudits.length, 1);
        const assignments = [['project:read'], ['nav:profile:view', 'project:read'], []];
        for (const [index, alias] of idAliases(context.roleId).entries()) {
            for (const method of ['GET', 'PUT']) {
                phase = `${method}-${alias.kind}`;
                await fixture('session-non-due', 'admin', session);
                const before = await readOwnedAliasAudits(observer, context);
                const route = '/api/platform/roles/' + alias.value + (method === 'PUT' ? '/permissions' : '');
                const startedAt = new Date().toISOString();
                const response = await session.request(method, route, method === 'PUT' ? { json: { permissionKeys: assignments[index] } } : {});
                const after = await readOwnedAliasAudits(observer, context);
                assert.deepEqual(after.slice(0, before.length), before, 'Prior owned audit rows must remain unchanged');
                report.observations.push({
                    id: phase,
                    aliasKind: alias.kind,
                    pathId: alias.value,
                    method,
                    route,
                    requestBody: method === 'PUT' ? { permissionKeys: assignments[index] } : null,
                    startedAt,
                    finishedAt: new Date().toISOString(),
                    status: response.status,
                    response: response.body,
                    contentType: response.contentType,
                    setCookieCount: response.setCookie.length,
                    auditsBefore: before,
                    auditsAfter: after,
                    auditDelta: after.length - before.length
                });
                assert.equal(response.status, 200);
                assert.equal(response.body.id, context.roleId);
                assert.equal(response.setCookie.length, 0);
                assert.equal(after.length - before.length, method === 'PUT' ? 1 : 0);
            }
        }
        assert.equal(report.observations.length, 6);
        phase = 'verify-source-after';
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
                report.serverStopped = false;
                report.result = 'fail';
                process.exitCode = 1;
            }
        } else report.serverStopped = true;
        if (observer)
            try {
                await observer.end();
                report.observerClosed = true;
            } catch {
                report.observerClosed = false;
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
        JSON.stringify({ result: report.result, backend, runId, cases: report.observations.length, failurePhase: report.failurePhase, failureReason: report.failureReason, serverStopped: report.serverStopped, zeroResidual: report.zeroResidual })
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runAliasWitness();
