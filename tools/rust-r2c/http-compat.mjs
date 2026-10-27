import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NavigationHttpSession } from './http-client.mjs';
import { validateSource, sourceHead, verifyConnection, databaseFor } from './fixture-guard.mjs';
import { assertCompleteCoverage, completeCasePlan, coverageManifest, dtoCases, frozenGolden, headCases, operationCases, uriCases, wireOrganizations } from './http-compat-cases.mjs';
import { requestWire } from './http-compat-wire.mjs';
import { epochMicros } from './http-compat-compare.mjs';
import { assertSourceGuard } from './export-org-units.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const { resolveApiPlan } = require('../e2e/api-server.cjs');
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const root = path.resolve(import.meta.dirname, '../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function expectedSessionVersionDelta({ account, due, parserFirst, auditDelta, securityDelta, committed, sessionDelta }) {
    return sessionDelta ?? (account === 'none' || !due || parserFirst ? 0 : auditDelta || securityDelta || committed ? 2 : 1);
}
function belowEvidence(name) {
    const full = path.resolve(root, name);
    assert(full.startsWith(path.join(root, 'tmp/rust-r2c') + path.sep) && full.endsWith('.json'));
    return full;
}
export function validateServerReceipt(value, backend, origin) {
    assert.equal(value.backend, backend);
    assert.equal(value.origin, origin);
    assert.equal(value.sourceHead, sourceHead);
    assert(Number.isSafeInteger(value.pid) && value.pid > 0);
    assert.equal(value.aliveBefore, true);
    assert(/^[0-9a-f]{64}$/.test(value.binarySha256));
    assert.deepEqual(Object.keys(value.processIdentity ?? {}).sort(), ['pid', 'startTicks']);
    assert.equal(value.processIdentity.pid, value.pid);
    assert(typeof value.processIdentity.startTicks === 'string' && /^[0-9]+$/.test(value.processIdentity.startTicks) && BigInt(value.processIdentity.startTicks) > 0n, 'Owner /proc startTicks required');
    assert(Array.isArray(value.sourceFiles) && value.sourceFiles.length > 0, 'Owner source before manifest required');
    for (const file of value.sourceFiles) {
        assert.deepEqual(Object.keys(file).sort(), ['file', 'sha256']);
        assert(typeof file.file === 'string' && file.file.length > 0 && !path.posix.isAbsolute(file.file) && !file.file.includes('\\') && !file.file.includes(':') && file.file.split('/').every((part) => part && part !== '.' && part !== '..'));
        assert(/^[0-9a-f]{64}$/.test(file.sha256));
    }
    assert.equal(new Set(value.sourceFiles.map((file) => file.file)).size, value.sourceFiles.length);
    return Object.fromEntries(['backend', 'origin', 'pid', 'binarySha256', 'sourceHead', 'aliveBefore', 'ownerPlatform', 'processIdentity', 'sourceFiles'].filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]));
}
const responseOrganizationsSql = 'select to_jsonb(o) as data from poms.org_unit o where o.id=any($1::uuid[])';
// The caller can supply only response organizations, never SQL or a connection
// target. The CLI obtains this guarded plan itself; the optional factory is for
// pure protocol tests and is never accepted from command-line/environment data.
export async function readResponseOrganizationFacts(plan, backend, organizations, makeClient = (config) => new Client(config)) {
    const database = databaseFor(backend),
        env = plan.managedEnvironment?.childEnv;
    assert.equal(plan.target.mode, 'managed-' + backend);
    for (const [key, expected] of Object.entries({ DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_DATABASE: database, DB_USER: 'poms_r2c_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true' }))
        assert.equal(env?.[key], expected, 'Fixed managed response observer: ' + key);
    assert(/^[0-9a-f]{64}$/.test(env.DB_PASSWORD));
    const requestedIds = organizations.map((row) => row.id);
    assert(requestedIds.length <= 4096);
    assert(requestedIds.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)));
    assert.equal(new Set(requestedIds).size, requestedIds.length);
    const startedAt = new Date().toISOString();
    if (requestedIds.length === 0) return { database, readOnly: true, requestedIds, organizations: [], startedAt, finishedAt: new Date().toISOString() };
    const client = makeClient({ host: '127.0.0.1', port: 15432, database, user: 'poms_r2c_app', password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, query_timeout: 10000, application_name: 'poms-r2c-http-response-observer' });
    let transaction = false;
    try {
        await client.connect();
        await verifyConnection(client, database);
        await client.query('BEGIN READ ONLY');
        transaction = true;
        const found = await client.query(responseOrganizationsSql, [requestedIds]);
        const records = new Map(found.rows.map((row) => [row.data.id, row.data]));
        assert.equal(records.size, requestedIds.length, 'Every successful response organization must exist in the same request observer');
        assert.equal(found.rows.length, requestedIds.length, 'No extra or duplicate database facts');
        assert(requestedIds.every((id) => records.has(id)));
        return { database, readOnly: true, requestedIds, organizations: requestedIds.map((id) => records.get(id)), startedAt, finishedAt: new Date().toISOString() };
    } finally {
        try {
            if (transaction) await client.query('ROLLBACK');
        } finally {
            await client.end();
        }
    }
}
function sourceFiles() {
    const files = ['apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'libs/shared/api-spec/openapi.json', 'tools/e2e/api-server.cjs', 'tools/e2e/runtime.cjs'];
    function walk(folder, admitted) {
        for (const entry of readdirSync(path.join(root, folder), { withFileTypes: true })) {
            const file = folder + '/' + entry.name;
            if (entry.isDirectory()) walk(file, admitted);
            else if (entry.isFile() && admitted.test(entry.name)) files.push(file);
        }
    }
    walk('apps/poms-api-rust/src', /\.rs$/);
    walk('tools/rust-r2c', /\.(?:mjs|cjs|json|cts)$/);
    return files.sort().map((file) => ({ file, normalizedLfSha256: digest(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')) }));
}

// The coordinator owns the process and exclusive port. This runner deliberately
// has no start/stop call. An independent after/stop receipt is needed to compare.
export async function runHttpCompat({ backend, serverReceiptFile, tag = '01' }) {
    assert(['nest', 'rust'].includes(backend));
    assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(tag));
    assert.equal(process.env.POMS_E2E_MODE, 'managed-' + backend);
    assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2c');
    const plan = resolveApiPlan({ cwd: root });
    const receiptBytes = readFileSync(belowEvidence(serverReceiptFile));
    const serverReceipt = { file: serverReceiptFile, sha256: digest(receiptBytes), value: validateServerReceipt(JSON.parse(receiptBytes), backend, plan.target.origin) };
    const output = path.join(root, `tmp/rust-r2c/http-${process.platform}-${backend}-${tag}.json`);
    assert(!existsSync(output), 'Preserve earlier HTTP evidence before retry');
    const runId = randomUUID(),
        orgs = new Map();
    const golden = frozenGolden(),
        casePlan = completeCasePlan(golden);
    const report = {
        formatVersion: 1,
        result: 'pending',
        backend,
        platform: process.platform,
        sourceHead,
        runId,
        serverReceipt,
        runtime: { node: process.version, icu: process.versions.icu, cldr: process.versions.cldr, defaultLocale: new Intl.Collator().resolvedOptions() },
        serviceOwnership: 'Externally owned coordinator process; runner never starts or stops services',
        evidenceBoundary: 'This runner covers its declared sequential HTTP plan. Concurrent races, barrier SQL witnesses and four-platform browser acceptance require their separate reports.',
        startedAt: new Date().toISOString(),
        sourceFiles: sourceFiles(),
        observations: [],
        fixtureActions: [],
        identities: { orgs: {} },
        baselineOrganizations: [],
        regressionRoles: [],
        coverage: { complete: false, ...coverageManifest(golden) },
        cleanupCompleted: false
    };
    const admin = new NavigationHttpSession(plan.target.origin, runId),
        viewer = new NavigationHttpSession(plan.target.origin, runId),
        anonymous = new NavigationHttpSession(plan.target.origin, runId);
    const session = { admin, viewer, none: anonymous };
    let phase = 'prepare',
        prepareAttempted = false;
    const fixture = (action, account = 'none', active, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(active ? { sessionToken: active.cookies.get('poms_session') } : {}), ...extra });
    const orgFixture = (action, orgSlot, extra = {}) => fixture(action, 'none', undefined, { orgSlot, ...extra });
    const structural = async (action, slot, extra) => {
        const receipt = slot ? await orgFixture(action, slot, extra) : await fixture(action, extra.account);
        report.fixtureActions.push({
            action,
            ...(slot ? { orgSlot: slot } : { account: extra.account }),
            matched: receipt.matched,
            changed: receipt.changed,
            state: receipt.state,
            ...(receipt.fixtureFacts ? { fixtureFacts: receipt.fixtureFacts } : {})
        });
        return receipt;
    };
    const snapshots = async (slots) => {
        const result = {};
        for (const slot of [...new Set(slots)]) if (orgs.get(slot)?.orgId && !orgs.get(slot).deleted) result[slot] = (await orgFixture('org-snapshot', slot)).orgSnapshot;
        return result;
    };
    const route = (slot, command = '') => `/api/platform/org-units/${orgs.get(slot).orgId}${command ? ':' + command : ''}`;
    async function observe({
        id,
        group = 'business',
        operation,
        account = 'admin',
        due = false,
        method,
        route: url,
        json,
        options = {},
        watch = [],
        createSlot,
        parentSlot,
        planCreate = true,
        status = 200,
        auditDelta = 0,
        securityDelta = 0,
        dirty = {},
        committed = false,
        parserFirst = false,
        sessionDelta,
        setCookieCount = 0,
        redactCsrf = false
    }) {
        phase = id;
        assert.deepEqual({ id, group, operation, method }, casePlan[report.observations.length], 'Observation must match the next independently frozen case before any mutation');
        if (createSlot && planCreate) orgs.set(createSlot, (await orgFixture('org-plan', createSlot, parentSlot ? { parentSlot } : {})).org);
        const monitorAccount = account === 'none' ? 'admin' : account,
            monitor = session[monitorAccount];
        await fixture(due ? 'session-due' : 'session-non-due', monitorAccount, monitor);
        const before = (await fixture('snapshot', monitorAccount, monitor)).snapshot;
        const orgBefore = await snapshots([...watch, ...(createSlot ? [createSlot] : [])]);
        const row = {
            id,
            group,
            operation,
            account,
            monitorAccount,
            due,
            method,
            route: url,
            ...(createSlot ? { createSlot } : {}),
            request: { ...(json === undefined ? {} : { json }), ...options },
            before,
            orgBefore,
            startedAt: new Date().toISOString()
        };
        report.observations.push(row);
        let response;
        try {
            if (method === 'HEAD') {
                row.headReference = await requestWire(session[account], 'GET', url, options);
                row.headReferenceOrgFacts = await readResponseOrganizationFacts(plan, backend, wireOrganizations(row.headReference.body, operation, row.headReference.status, 'GET'));
            }
            response = await requestWire(session[account], method, url, { ...options, ...(json === undefined ? {} : { json }) });
            if (redactCsrf) {
                assert(/^[A-Za-z0-9_-]{43}$/.test(response.body?.token ?? ''));
                response.body = { ...response.body, token: '<memory-only-valid-csrf>' };
            }
            Object.assign(row, { status: response.status, response: response.body, contentType: response.contentType, headers: response.headers, bodyByteLength: response.bodyByteLength, setCookieCount: response.setCookie.length });
            row.responseOrgFacts = await readResponseOrganizationFacts(plan, backend, wireOrganizations(response.body, operation, response.status, method));
            if (row.headReference) {
                delete row.headReference.setCookie;
                if (row.headReference.status === 200) assert.equal(row.headReference.headers['content-length'], response.headers['content-length'], id + ': HEAD Content-Length equals this server GET');
            }
        } finally {
            if (createSlot) {
                const adopted = await orgFixture('org-adopt', createSlot);
                orgs.set(createSlot, adopted.org);
                row.adoption = adopted;
                if (adopted.org.orgId) report.identities.orgs[createSlot] = adopted.org.orgId;
            }
            row.after = (await fixture('snapshot', monitorAccount, monitor)).snapshot;
            row.orgAfter = await snapshots([...watch, ...(createSlot ? [createSlot] : [])]);
            row.finishedAt = new Date().toISOString();
            row.auditDelta = row.after.audits.length - before.audits.length;
            row.securityDelta = row.after.securityEvents.length - before.securityEvents.length;
            row.sessionVersionDelta = row.after.session.rowVersion - before.session.rowVersion;
            row.orgVersionDeltas = Object.fromEntries(
                Object.keys(row.orgAfter)
                    .filter((slot) => orgBefore[slot])
                    .map((slot) => [slot, row.orgAfter[slot].org.row_version - orgBefore[slot].org.row_version])
            );
        }
        row.expected = {
            status,
            auditDelta,
            securityDelta,
            setCookieCount,
            sessionVersionDelta: expectedSessionVersionDelta({ account, due, parserFirst, auditDelta, securityDelta, committed, sessionDelta }),
            orgVersionDeltas: Object.fromEntries(Object.keys(orgBefore).map((slot) => [slot, dirty[slot] ?? 0]))
        };
        for (const [key, expected] of Object.entries(row.expected)) assert.deepEqual(row[key], expected, id + ': ' + key);
        return row;
    }
    async function create(slot, { parentSlot, due = false, omitOrder = false, group = 'business', status = 201, auditDelta = 1, committed = false } = {}) {
        const spec = orgFixtureSpec(runId, slot);
        return observe({
            id: `create:${slot}`,
            group,
            operation: 'create',
            due,
            method: 'POST',
            route: '/api/platform/org-units',
            createSlot: slot,
            parentSlot,
            json: { name: spec.name, code: spec.code, description: spec.description, ...(parentSlot ? { parentId: orgs.get(parentSlot).orgId } : {}), ...(omitOrder ? {} : { displayOrder: spec.displayOrder }) },
            status,
            auditDelta,
            committed
        });
    }
    try {
        validateSource();
        assertSourceGuard();
        prepareAttempted = true;
        await fixture('prepare');
        await admin.login('admin');
        await viewer.login('viewer');
        report.identities.admin = admin.userId;
        report.identities.viewer = viewer.userId;
        const baselineStartedAt = new Date().toISOString();
        const baseline = await requestWire(admin, 'GET', '/api/platform/org-units');
        assert.equal(baseline.status, 200);
        report.baselineOrganizations = baseline.body;
        report.baselineOrganizationFacts = await readResponseOrganizationFacts(plan, backend, wireOrganizations(baseline.body, 'list', baseline.status));
        report.baselineOrganizationRequest = { startedAt: baselineStartedAt, finishedAt: new Date().toISOString() };
        await create('main', { due: true });
        await create('second');
        await create('child', { parentSlot: 'main', omitOrder: true });
        await create('grandchild', { parentSlot: 'child', omitOrder: true });
        await create('sibling', { parentSlot: 'second' });
        await create('inactive-parent');
        await create('inactive-child', { parentSlot: 'inactive-parent' });
        const main = orgFixtureSpec(runId, 'main'),
            sibling = orgFixtureSpec(runId, 'sibling'),
            child = orgFixtureSpec(runId, 'child');
        for (const due of [true, false]) {
            await observe({
                id: `update:dirty:${due}`,
                operation: 'update',
                due,
                method: 'PATCH',
                route: route('main'),
                json: { name: main.name + (due ? ' changed' : ''), code: main.code, description: null, displayOrder: due ? 7 : 0 },
                watch: ['main'],
                auditDelta: 1,
                dirty: { main: 1 }
            });
            await observe({ id: `update:noop:${due}`, operation: 'update', due, method: 'PATCH', route: route('main'), json: { description: null, ignored: true }, watch: ['main'], auditDelta: 1 });
            await observe({ id: `activate:noop:${due}`, operation: 'activate', due, method: 'POST', route: route('main', 'activate'), json: { reason: 'unused', comment: 'unchanged', expectedVersion: 999 }, watch: ['main'], auditDelta: 1 });
            await observe({ id: `move:noop:${due}`, operation: 'move', due, method: 'POST', route: route('main', 'move'), json: { parentId: null, expectedVersion: 999 }, watch: ['main'], auditDelta: 1 });
        }
        await observe({ id: 'update:code-trim', operation: 'update', method: 'PATCH', route: route('main'), json: { code: ' ' + main.code + '-changed ', name: ' ' + main.name + ' ' }, watch: ['main'], auditDelta: 1, dirty: { main: 1 } });
        await observe({ id: 'update:code-restore', operation: 'update', method: 'PATCH', route: route('main'), json: { code: main.code }, watch: ['main'], auditDelta: 1, dirty: { main: 1 } });
        await observe({ id: 'create:duplicate-code', operation: 'create', method: 'POST', route: '/api/platform/org-units', json: { name: 'duplicate', code: main.code }, watch: ['main'], status: 409 });
        await observe({ id: 'update:duplicate-code', operation: 'update', method: 'PATCH', route: route('child'), json: { code: main.code }, watch: ['child'], status: 409 });
        await observe({ id: 'sibling:other-parent-name-allowed', operation: 'update', method: 'PATCH', route: route('sibling'), json: { name: child.name }, watch: ['sibling'], auditDelta: 1, dirty: { sibling: 1 } });
        await observe({ id: 'move:sibling-name-refused', operation: 'move', method: 'POST', route: route('child', 'move'), json: { parentId: orgs.get('second').orgId }, watch: ['child'], status: 409 });
        await observe({ id: 'sibling:restore-name', operation: 'update', method: 'PATCH', route: route('sibling'), json: { name: sibling.name }, watch: ['sibling'], auditDelta: 1, dirty: { sibling: 1 } });
        await observe({
            id: 'move:child-order-only-keeps-parent',
            operation: 'move',
            method: 'POST',
            route: route('child', 'move'),
            json: { displayOrder: 3, reason: 'same parent', expectedVersion: 999 },
            watch: ['child'],
            auditDelta: 1,
            dirty: { child: 1 }
        });
        await observe({ id: 'move:under-second-retains-order', operation: 'move', method: 'POST', route: route('child', 'move'), json: { parentId: orgs.get('second').orgId }, watch: ['child'], auditDelta: 1, dirty: { child: 1 } });
        await observe({ id: 'move:restore-main', operation: 'move', method: 'POST', route: route('child', 'move'), json: { parentId: orgs.get('main').orgId, displayOrder: 2 }, watch: ['child'], auditDelta: 1, dirty: { child: 1 } });
        await observe({
            id: 'deactivate:inactive-parent',
            operation: 'deactivate',
            method: 'POST',
            route: route('inactive-parent', 'deactivate'),
            json: { comment: 'cascade', expectedVersion: 999 },
            watch: ['inactive-parent', 'inactive-child'],
            auditDelta: 1,
            dirty: { 'inactive-parent': 1, 'inactive-child': 1 }
        });
        for (const due of [true, false]) {
            await observe({
                id: `activate:inactive-parent-refused:${due}`,
                operation: 'activate',
                due,
                method: 'POST',
                route: route('inactive-child', 'activate'),
                json: { reason: 'r', comment: 'c', expectedVersion: 999 },
                watch: ['inactive-child'],
                status: 409,
                auditDelta: 1
            });
            await observe({ id: `move:inactive-parent-refused:${due}`, operation: 'move', due, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('inactive-parent').orgId }, watch: ['main'], status: 409 });
            await observe({
                id: `move:descendant-refused:${due}`,
                operation: 'move',
                due,
                method: 'POST',
                route: route('main', 'move'),
                json: { parentId: orgs.get('grandchild').orgId, reason: 'cycle' },
                watch: ['main', 'child', 'grandchild'],
                status: 409,
                auditDelta: 1
            });
            await observe({ id: `move:self-db-check:${due}`, operation: 'move', due, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('main').orgId }, watch: ['main'], status: 500 });
        }
        for (const [slot, parentSlot, parentId, name, status] of [
            ['race-code-a', 'inactive-parent', orgs.get('inactive-parent').orgId, undefined, 409],
            ['race-code-b', undefined, '00000000-0000-0000-0000-000000000000', undefined, 404],
            ['race-name-a', undefined, orgs.get('second').orgId.toUpperCase(), undefined, 404],
            ['race-name-b', 'main', orgs.get('main').orgId, ' ' + child.name.toUpperCase() + ' ', 409]
        ]) {
            const spec = orgFixtureSpec(runId, slot);
            await observe({
                id: 'create:parent-or-name:' + slot,
                operation: 'create',
                due: true,
                method: 'POST',
                route: '/api/platform/org-units',
                createSlot: slot,
                parentSlot,
                json: { name: name ?? spec.name, code: spec.code, description: spec.description, displayOrder: spec.displayOrder, parentId },
                status
            });
        }
        await observe({ id: 'move:uppercase-parent-refused', operation: 'move', due: true, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('second').orgId.toUpperCase() }, watch: ['main'], status: 404 });
        await structural('org-set-inactive', 'grandchild');
        await observe({
            id: 'deactivate:mixed-main',
            operation: 'deactivate',
            due: true,
            method: 'POST',
            route: route('main', 'deactivate'),
            json: { expectedVersion: 999 },
            watch: ['main', 'child', 'grandchild'],
            auditDelta: 1,
            dirty: { main: 1, child: 1, grandchild: 0 }
        });
        await observe({ id: 'deactivate:noop-main', operation: 'deactivate', method: 'POST', route: route('main', 'deactivate'), json: {}, watch: ['main', 'child', 'grandchild'], auditDelta: 1 });
        for (const slot of ['main', 'child', 'grandchild']) await observe({ id: `activate:only-${slot}`, operation: 'activate', method: 'POST', route: route(slot, 'activate'), json: {}, watch: [slot], auditDelta: 1, dirty: { [slot]: 1 } });
        await observe({ id: 'query:list-includes-inactive', operation: 'list', method: 'GET', route: '/api/platform/org-units?ignored=1&displayOrder=bad' });
        await observe({ id: 'query:tree-all', operation: 'tree', method: 'GET', route: '/api/platform/org-unit-tree', watch: ['main', 'child', 'grandchild', 'inactive-parent', 'inactive-child'] });
        await observe({ id: 'query:detail', operation: 'detail', method: 'GET', route: route('main'), watch: ['main'] });
        await create('unicode', { parentSlot: 'second' });
        await observe({ id: 'sibling:contextual-Greek-name', operation: 'update', method: 'PATCH', route: route('unicode'), json: { name: 'ΟΣ' }, watch: ['unicode'], auditDelta: 1, dirty: { unicode: 1 } });
        await observe({ id: 'sibling:final-sigma-duplicate', operation: 'update', method: 'PATCH', route: route('sibling'), json: { name: 'ος' }, watch: ['sibling'], status: 409 });

        await structural('permissions-none', undefined, { account: 'viewer' });
        for (const entry of operationCases(orgs.get('main').orgId, main.code)) {
            await observe({ ...entry, id: `guard:anonymous:${entry.operation}`, group: 'guards', account: 'none', status: 401, watch: ['main'] });
            await observe({ ...entry, id: `guard:forbidden:${entry.operation}`, group: 'guards', account: 'viewer', due: true, status: 403, securityDelta: 1, watch: ['main'] });
            if (entry.method !== 'GET') {
                await observe({ ...entry, id: `guard:csrf:${entry.operation}`, group: 'guards', due: true, status: 403, securityDelta: 1, options: { csrf: false }, watch: ['main'] });
                const row = await observe({ ...entry, id: `guard:csrf-before-permission:${entry.operation}`, group: 'guards', account: 'viewer', status: 403, securityDelta: 1, options: { csrf: false }, watch: ['main'] });
                assert.equal(row.after.securityEvents.at(-1).eventType, 'auth.csrf.failed');
            }
        }
        for (const entry of headCases(orgs.get('main').orgId).filter((entry) => entry.matched && entry.id.endsWith(':canonical'))) {
            await observe({ ...entry, id: 'guard:anonymous:' + entry.id, group: 'guards', account: 'none', status: 401 });
            await observe({ ...entry, id: 'guard:forbidden:' + entry.id, group: 'guards', account: 'viewer', status: 403, securityDelta: 2 });
        }
        await structural('restore', undefined, { account: 'viewer' });
        for (const entry of dtoCases(golden, orgs.get('main').orgId)) await observe({ ...entry, group: 'dto', status: 400, watch: ['main'] });
        for (const [id, method, url, options, status, account] of [
            ['malformed-json', 'PATCH', route('main'), { body: '{', contentType: 'application/json' }, 400, 'admin'],
            ['malformed-before-auth', 'POST', '/api/platform/org-units', { body: '{', contentType: 'application/json' }, 400, 'none'],
            ['wrong-content-type', 'PATCH', route('main'), { body: '{}', contentType: 'text/plain' }, 400, 'admin'],
            ['body-limit', 'PATCH', route('main'), { body: JSON.stringify({ name: 'x'.repeat(102401) }), contentType: 'application/json' }, 413, 'admin'],
            ['get-ignored-body', 'GET', '/api/platform/org-units', { json: { ignored: true } }, 200, 'admin'],
            ['get-malformed-body', 'GET', '/api/platform/org-units', { body: '{', contentType: 'application/json' }, 400, 'admin'],
            ['unsupported-delete', 'DELETE', route('main'), {}, 404, 'admin'],
            ['old-slash-move', 'POST', route('main') + '/move', { json: {} }, 404, 'admin']
        ])
            await observe({
                id: 'parser:' + id,
                group: 'parser',
                operation: method === 'GET' ? 'list' : 'update',
                account,
                due: true,
                method,
                route: url,
                options,
                status,
                parserFirst: ['malformed-json', 'malformed-before-auth', 'body-limit', 'get-malformed-body'].includes(id),
                watch: ['main'],
                ...(id === 'unsupported-delete' || id === 'old-slash-move' ? { sessionDelta: 0 } : {})
            });
        for (const [kind, transform] of [
            ['uppercase', (id) => id.toUpperCase()],
            ['compact', (id) => id.replaceAll('-', '')],
            ['braces', (id) => '{' + id + '}'],
            ['invalid', () => 'not-a-uuid'],
            ['missing', () => '00000000-0000-0000-0000-000000000000']
        ]) {
            const target = '/api/platform/org-units/' + transform(orgs.get('main').orgId);
            await observe({ id: 'id:get:' + kind, group: 'id-spelling', operation: 'detail', method: 'GET', route: target, status: 404, watch: ['main'] });
            await observe({
                id: 'id:update:' + kind,
                group: 'id-spelling',
                operation: 'update',
                due: true,
                method: 'PATCH',
                route: target,
                json: { description: null },
                status: kind === 'invalid' ? 500 : kind === 'missing' ? 404 : 200,
                auditDelta: ['invalid', 'missing'].includes(kind) ? 0 : 1,
                watch: ['main']
            });
        }
        const encodedId = orgs.get('main').orgId.replace(/^./, (value) => '%' + value.charCodeAt(0).toString(16).toUpperCase());
        await observe({ id: 'id:get:encoded-parameter', group: 'id-spelling', operation: 'detail', method: 'GET', route: '/api/platform/org-units/' + encodedId, watch: ['main'] });
        await observe({ id: 'id:update:encoded-parameter', group: 'id-spelling', operation: 'update', due: true, method: 'PATCH', route: '/api/platform/org-units/' + encodedId, json: { description: null }, auditDelta: 1, watch: ['main'] });
        for (const entry of uriCases(orgs.get('main').orgId, orgs.get('inactive-parent').orgId, main.code)) {
            const mutation = ['update', 'activate', 'deactivate', 'move'].includes(entry.operation) && entry.matched;
            await observe({
                ...entry,
                group: 'uri',
                json: entry.json,
                status: entry.matched ? (entry.operation === 'create' ? 409 : 200) : 404,
                auditDelta: mutation ? 1 : 0,
                watch: entry.operation === 'deactivate' ? ['inactive-parent', 'inactive-child'] : ['main']
            });
        }
        const rawGuard = await observe({
            id: 'uri:guard-original-path',
            group: 'uri',
            operation: 'update',
            due: true,
            method: 'PATCH',
            route: `/API/PLATFORM/ORG-UNITS/${orgs.get('main').orgId}/?raw=1`,
            json: { description: null },
            options: { csrf: false },
            status: 403,
            securityDelta: 1,
            watch: ['main']
        });
        assert.equal(rawGuard.after.securityEvents.at(-1).path, rawGuard.route);
        await observe({ id: 'uri:unknown-original-path', group: 'uri', operation: 'unknown', method: 'GET', route: `/API/PLATFORM/ORG-UNITS/${orgs.get('main').orgId}/unknown?raw=1`, status: 404 });
        await observe({ id: 'uri:unknown-command', group: 'uri', operation: 'unknown', method: 'POST', route: route('main') + ':unknown', json: {}, status: 404 });
        for (const entry of headCases(orgs.get('main').orgId)) await observe({ ...entry, group: 'head', status: entry.matched ? 200 : 404, watch: ['main'] });

        await create('utf16-name', { group: 'encoding', due: true, status: 500, auditDelta: 0, committed: true });
        await create('utf16-code', { group: 'encoding', due: true, status: 500, auditDelta: 0, committed: true });
        const utf16 = await create('utf16-description', { group: 'encoding', due: true });
        assert.equal(utf16.response.description, '\ud800');
        assert.equal(utf16.orgAfter['utf16-description'].org.description, '\ufffd');
        for (const [id, value, status, due, auditDelta, delta] of [
            ['surrogate', '\ud800', 500, true, 0, 1],
            ['surrogate-repeat', '\ud800', 500, false, 0, 1],
            ['restore', null, 200, false, 1, 1],
            ['NUL', '\u0000', 500, true, 0, 0]
        ])
            await observe({
                id: 'encoding:update:' + id,
                group: 'encoding',
                operation: 'update',
                due,
                method: 'PATCH',
                route: route('main'),
                json: { description: value },
                status,
                auditDelta,
                committed: status === 500 && delta === 1,
                watch: ['main'],
                dirty: { main: delta }
            });
        await observe({ id: 'encoding:rejected-surrogate-reason', group: 'encoding', operation: 'activate', due: true, method: 'POST', route: route('inactive-child', 'activate'), json: { reason: '\ud800' }, status: 500, watch: ['inactive-child'] });
        await create('order-overflow', { group: 'encoding', due: true, status: 500, auditDelta: 0 });
        for (const value of [2147483648, 9007199254740991])
            await observe({ id: 'encoding:update-int4-overflow:' + value, group: 'encoding', operation: 'update', due: true, method: 'PATCH', route: route('main'), json: { displayOrder: value }, status: 500, watch: ['main'] });
        await create('max-order');
        await create('negative-order', { parentSlot: 'max-order' });
        await structural('org-negative-order', 'negative-order');
        const historical = await observe({ id: 'encoding:historical-negative-output', group: 'encoding', operation: 'detail', method: 'GET', route: route('negative-order'), watch: ['negative-order'] });
        assert.equal(historical.response.displayOrder, -2147483648);
        const negative = await create('negative-default', { group: 'encoding', parentSlot: 'max-order', omitOrder: true });
        assert.equal(negative.response.displayOrder, -2147483647);
        await structural('org-max-order', 'negative-order');
        await observe({
            id: 'encoding:default-int4-overflow',
            group: 'encoding',
            operation: 'create',
            due: true,
            method: 'POST',
            route: '/api/platform/org-units',
            createSlot: 'order-overflow',
            planCreate: false,
            json: { name: orgFixtureSpec(runId, 'order-overflow').name, code: orgFixtureSpec(runId, 'order-overflow').code, parentId: orgs.get('max-order').orgId },
            status: 500,
            watch: ['max-order', 'negative-order']
        });

        await observe({ id: 'regression:permissions', group: 'regression', operation: 'permissions', method: 'GET', route: '/api/platform/permissions' });
        const role = await observe({ id: 'regression:role-detail', group: 'regression', operation: 'role-detail', method: 'GET', route: '/api/platform/roles/30000000-0000-4000-8000-000000000001' });
        report.regressionRoles.push(role.response);
        await observe({ id: 'regression:current-session', group: 'regression', operation: 'auth-session', method: 'GET', route: '/api/auth/session' });
        await observe({ id: 'regression:csrf-refresh', group: 'regression', operation: 'auth-csrf', method: 'GET', route: '/api/auth/csrf-token', redactCsrf: true, sessionDelta: 1, setCookieCount: 1 });
        const matrix = await structural('org-membership-matrix', 'main');
        assert(matrix.fixtureFacts?.memberships && matrix.fixtureFacts?.users);
        for (const [slot, count] of [
            ['main', 2],
            ['child', 1],
            ['grandchild', 0]
        ]) {
            const row = await observe({ id: 'membership:detail:' + slot, group: 'membership', operation: 'detail', method: 'GET', route: route(slot), watch: [slot] });
            assert.equal(row.response.activeMembershipCount, count);
        }
        await observe({ id: 'membership:tree', group: 'membership', operation: 'tree', method: 'GET', route: '/api/platform/org-unit-tree', watch: ['main', 'child', 'grandchild'] });
        for (const slot of ['tie-a', 'tie-b', 'tie-c', 'tie-d']) await create(slot);
        const ties = await structural('org-sort-ties', 'tie-a');
        assert.equal(ties.fixtureFacts?.organizations.length, 4);
        const tieIds = new Set(['tie-a', 'tie-b', 'tie-c', 'tie-d'].map((slot) => orgs.get(slot).orgId));
        const flat = await observe({ id: 'sort:flat-microseconds', group: 'sort', operation: 'list', method: 'GET', route: '/api/platform/org-units', watch: ['tie-a', 'tie-b', 'tie-c', 'tie-d'] });
        assert.deepEqual(
            flat.response.filter((entry) => tieIds.has(entry.id)).map((entry) => entry.id),
            ['tie-b', 'tie-c', 'tie-d', 'tie-a'].map((slot) => orgs.get(slot).orgId)
        );
        const tree = await observe({ id: 'sort:tree-millisecond-zh-CN', group: 'sort', operation: 'tree', method: 'GET', route: '/api/platform/org-unit-tree', watch: ['tie-a', 'tie-b', 'tie-c', 'tie-d'] });
        assert.deepEqual(
            tree.response.filter((entry) => tieIds.has(entry.id)).map((entry) => entry.id),
            ['tie-a', 'tie-d', 'tie-c', 'tie-b'].map((slot) => orgs.get(slot).orgId)
        );
        for (const row of ties.fixtureFacts.organizations) assert.equal(epochMicros(row.created_at) / 1000n, epochMicros('2026-01-01T00:00:00.123Z') / 1000n);
        validateSource();
        assertSourceGuard();
        assert.deepEqual(sourceFiles(), report.sourceFiles, 'Source changed while HTTP evidence was collected');
        report.coverage.complete = true;
        assertCompleteCoverage(report);
        report.result = 'observed';
    } catch (error) {
        report.result = 'fail';
        report.failurePhase = phase;
        report.failureReason = error.name;
        // Values may contain credentials in third-party errors. Only named
        // assertion expectations already captured in the report are retained.
    } finally {
        if (prepareAttempted) {
            try {
                report.cleanup = await fixture('cleanup');
                report.zeroResidual = await fixture('cleanup');
                assert.equal(report.zeroResidual.matched, 0);
                assert.equal(report.zeroResidual.changed, 0);
                report.cleanupCompleted = true;
            } catch {
                report.cleanupFailure = true;
                report.result = 'fail';
            }
        }
        report.finishedAt = new Date().toISOString();
        writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    return { output, report };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert([4, 5].includes(process.argv.length), 'Usage: http-compat.mjs <nest|rust> <tmp/rust-r2c/server-receipt.json> [round-tag]');
    const { report, output } = await runHttpCompat({ backend: process.argv[2], serverReceiptFile: process.argv[3], tag: process.argv[4] ?? '01' });
    console.log(JSON.stringify({ result: report.result, output, runId: report.runId, cases: report.observations.length, cleanupCompleted: report.cleanupCompleted, failurePhase: report.failurePhase, failureReason: report.failureReason }));
    if (report.result !== 'observed') process.exitCode = 1;
}
