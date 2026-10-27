import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { assertOwned } from './fixture-core.mjs';
import { databaseFor, validateSource, verifyConnection, sourceHead } from './fixture-guard.mjs';
import { journalStore } from './fixture-journal.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { validateServerReceipt } from './http-compat.mjs';
import { concurrencyCases, dependencyPath, sanitizeActivity, assertWaitProof, assertCaseProofs, assertCaseTiming, validateConcurrencyAmbient, readOrgSnapshots } from './http-concurrency-protocol.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { invokeFixture } = require('./invoke-fixture.cjs');
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const { resolveApiPlan } = require('../e2e/api-server.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function evidencePath(file) {
    const full = path.resolve(root, file);
    assert(full.startsWith(path.join(root, 'tmp/rust-r2c') + path.sep) && full.endsWith('.json'));
    return full;
}
function sources() {
    const files = ['apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'libs/shared/api-spec/openapi.json', 'tools/e2e/api-server.cjs', 'tools/e2e/runtime.cjs'];
    function walk(folder) {
        for (const entry of readdirSync(path.join(root, folder), { withFileTypes: true })) {
            const file = `${folder}/${entry.name}`;
            if (entry.isDirectory()) walk(file);
            else if (entry.isFile() && /\.(?:rs|mjs|cjs|json|cts)$/.test(entry.name)) files.push(file);
        }
    }
    walk('apps/poms-api-rust/src'); walk('tools/rust-r2c');
    return files.sort().map((file) => ({ file, normalizedLfSha256: digest(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')) }));
}

// Server lifecycle belongs to the coordinator. This runner has no start/stop,
// table lock, system-role lease, DDL or product instrumentation operation.
export async function runHttpConcurrency({ backend, serverReceiptFile, tag = '01' }) {
    assert.equal(process.platform, 'linux');
    assert(['nest', 'rust'].includes(backend) && /^[a-z0-9][a-z0-9-]{0,39}$/.test(tag));
    assert.equal(process.env.POMS_E2E_MODE, `managed-${backend}`);
    assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2c');
    validateConcurrencyAmbient(process.env);
    validateSource();
    const database = databaseFor(backend), plan = resolveApiPlan({ cwd: root });
    assert.equal(plan.managedEnvironment.database, database);
    const receiptBytes = readFileSync(evidencePath(serverReceiptFile));
    const serverReceipt = { file: serverReceiptFile, sha256: digest(receiptBytes), value: validateServerReceipt(JSON.parse(receiptBytes), backend, plan.target.origin) };
    const output = evidencePath(`tmp/rust-r2c/concurrency-${backend}-${tag}.json`);
    assert(!existsSync(output), 'Preserve previous concurrency evidence');
    const runId = randomUUID(), orgs = new Map(), clients = [];
    const report = { formatVersion: 1, result: 'pending', backend, platform: process.platform, sourceHead, runId, serverReceipt, sourceFiles: sources(), startedAt: new Date().toISOString(), cases: [], setup: [],
        serviceOwnership: 'Coordinator-owned exact server receipt; runner never starts/stops services',
        scope: 'Five row-lock-provable HTTP concurrency categories; alias nullable hydration remains separate instrumented-Nest/explicit-PG evidence', identities: { orgs: {}, sessions: {} } };
    const fixture = (action, account = 'none', client, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend, action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}), ...extra });
    const orgFixture = (action, orgSlot, extra = {}) => fixture(action, 'none', undefined, { orgSlot, ...extra });
    let a, b, observer, owner, phase = 'target-preflight';
    let transactionA = false, transactionB = false, leased = false;
    const advisory = createHash('sha256').update(`${backend}:${runId}`).digest().readInt32BE(0);
    function connection(isOwner = false, name = 'observer') {
        const password = readFileSync(isOwner ? '/run/secrets/r2c-owner-password' : '/run/secrets/r2c-app-password', 'utf8');
        assert(isOwner ? password.length > 0 && !/[\r\n\0]/.test(password) : /^[0-9a-f]{64}$/.test(password));
        return new Client({ host: '127.0.0.1', port: 15432, database, user: isOwner ? 'poms_r0e_owner' : 'poms_r2c_app', password, application_name: `r2c-${runId}-${name}`, connectionTimeoutMillis: 5000, query_timeout: 10000 });
    }
    const snapshots = (slots,stage) => readOrgSnapshots(slots,async(slot)=>{
        phase=`${stage}-${slot}`;
        return (await orgFixture('org-snapshot',slot)).orgSnapshot;
    });
    async function create(slot, parentSlot) {
        phase = `setup-create-${slot}`;
        orgs.set(slot, (await orgFixture('org-plan', slot, parentSlot ? { parentSlot } : {})).org);
        const spec = orgFixtureSpec(runId, slot);
        const response = await clients[0].request('POST', '/api/platform/org-units', { json: { name: spec.name, code: spec.code, description: spec.description, displayOrder: spec.displayOrder, ...(parentSlot ? { parentId: orgs.get(parentSlot).orgId } : {}) } });
        const adopted = await orgFixture('org-adopt', slot);
        orgs.set(slot, adopted.org);
        report.setup.push({ slot, response: { status: response.status, body: response.body, setCookieCount: response.setCookie.length }, orgSnapshot:(await orgFixture('org-snapshot',slot)).orgSnapshot });
        assert.equal(response.status, 201); assert.equal(response.body.id, adopted.org.orgId);
        report.identities.orgs[slot] = response.body.id;
    }
    async function activity() {
        const result = await observer.query("select pid,state,wait_event_type,wait_event,pg_blocking_pids(pid) as blockers,query from pg_stat_activity where datname=current_database() and usename=current_user and wait_event_type='Lock' order by pid");
        return result.rows.map(sanitizeActivity);
    }
    async function waitProof(stage, roots, expectedCount, expectedKind, explicitPids) {
        const deadline = Date.now() + 2500;
        const excluded = [a.processID, b.processID, observer.processID];
        while (Date.now() < deadline) {
            const rows = await activity();
            const waiterPids = explicitPids ?? rows.filter((row) => !excluded.includes(row.pid) && dependencyPath(rows, row.pid, roots)).map((row) => row.pid);
            if (waiterPids.length === expectedCount && waiterPids.every((pid) => rows.some((row) => row.pid === pid))) {
                const proof = { stage, at: new Date().toISOString(), roots, expectedCount, expectedKind, waiterPids, rows };
                assertWaitProof(proof);
                return proof;
            }
            assert(waiterPids.length <= expectedCount, 'Unexpected waiter depends on run-owned row locks');
            await delay(10);
        }
        throw Error(`R2C_CONCURRENCY_BARRIER_${stage}`);
    }
    async function begin(which) {
        const client = which === 'a' ? a : b;
        await client.query('BEGIN');
        if (which === 'a') transactionA = true; else transactionB = true;
        await client.query("set local statement_timeout='8s'");
    }
    async function end(which, commit) {
        const active = which === 'a' ? transactionA : transactionB;
        if (active) await (which === 'a' ? a : b).query(commit ? 'COMMIT' : 'ROLLBACK');
        if (which === 'a') transactionA = false; else transactionB = false;
    }
    async function lockOrg(client, slot) {
        const entry = orgs.get(slot);
        const row = await client.query('select id::text,code from poms.org_unit where id=$1 for update', [entry.orgId]);
        assert.equal(row.rows.length, 1); assert.equal(row.rows[0].id, entry.orgId);
        return { table: 'org_unit', id: entry.orgId, slot };
    }
    async function lockSession(client, session, actor) {
        const row = await client.query('select id::text from poms.auth_session where id=$1 and user_id=$2 for update', [session.id, actor.userId]);
        assert.equal(row.rows.length, 1); assert.equal(row.rows[0].id, session.id);
        return { table: 'auth_session', id: session.id };
    }
    async function bump(client, table, id) {
        assert(['org_unit', 'auth_session'].includes(table));
        // The caller already holds this exact journal-bound target row lock.
        const before = (await client.query(`select to_jsonb(r) as data from poms.${table} r where id=$1`, [id])).rows[0].data;
        const changed = await client.query(`update poms.${table} set row_version=row_version+1 where id=$1 and row_version=$2 returning id`, [id, before.row_version]);
        assert.equal(changed.rowCount, 1);
        const after = (await client.query(`select to_jsonb(r) as data from poms.${table} r where id=$1`, [id])).rows[0].data;
        // Session facts must not expose token/CSRF hashes or addresses.
        const safe = (value) => table === 'auth_session' ? { id: value.id, row_version: value.row_version, updated_at: value.updated_at } : value;
        return { table, id, before: safe(before), after: safe(after) };
    }
    async function race(specification, requests) {
        phase = specification.id;
        const used = requests.map((request) => request.client);
        const due = specification.kind.startsWith('handoff');
        for (const index of used) await fixture(due ? 'session-due' : 'session-non-due', 'admin', clients[index]);
        const before = [];
        for (const index of used) { const value = (await fixture('snapshot', 'admin', clients[index])).snapshot; before.push(value); report.identities.sessions[index] = value.session.id; }
        const row = { id: specification.id, due, startedAt: new Date().toISOString(), requests, before, orgBefore: await snapshots(specification.slots,`${specification.id}-before-org-snapshot`), proofs: [], heldRows: [], releaseOrder: [], timings:{}, mutations: [] };
        report.cases.push(row);
        phase=specification.id;
        let pending = [], queued;
        try {
            assert.equal((await a.query('select pg_try_advisory_lock(1380074307,$1) as locked', [advisory])).rows[0].locked, true);
            leased = true;
            const journal = journalStore({ backend, runId }).read();
            assert.equal(journal.state, 'prepared');
            const actor = journal.accounts.find((account) => account.account === 'admin');
            assert.equal(actor.userId, report.identities.admin);
            await begin('a'); await assertOwned(a, journal);
            for (const [index, snapshot] of before.entries()) {
                const found = await a.query('select id from poms.auth_session where id=$1 and user_id=$2 and token_hash=$3', [snapshot.session.id, actor.userId, digest(clients[used[index]].cookies.get('poms_session'))]);
                assert.equal(found.rows.length, 1);
            }
            await end('a', false);
            await begin('a');
            if (specification.kind === 'pair') {
                await begin('b');
                row.heldRows.push(await lockOrg(a, specification.slots[0]), await lockOrg(b, specification.slots[1]));
            } else if (specification.kind === 'org') row.heldRows.push(await lockOrg(a, specification.slots[0]));
            else row.heldRows.push(await lockSession(a, before[0].session, actor));
            pending = requests.map(({ client, method, route, json }) => clients[client].request(method, route, { json }).then((value) => ({ value }), (error) => ({ error: error.code ?? error.name })));
            if (specification.kind === 'pair') {
                row.proofs.push(await waitProof('both-target-updates-held', [a.processID, b.processID], 2, 'org-cas-update'));
                row.timings.releaseAStartedAt=new Date().toISOString();await end('a', true);row.timings.releaseACompletedAt=new Date().toISOString();row.releaseOrder.push('target-a');
                const first = await pending[0]; assert(first.value && first.value.status === 200, 'Deterministic first winner did not complete');
                row.timings.requestACompletedAt=new Date().toISOString();row.releaseOrder.push('request-a-completed');
                row.timings.releaseBStartedAt=new Date().toISOString();await end('b', true);row.timings.releaseBCompletedAt=new Date().toISOString();row.releaseOrder.push('target-b');
            } else if (specification.kind === 'org') {
                row.proofs.push(await waitProof('target-update-held', [a.processID], 1, 'org-cas-update'));
                row.mutations.push(await bump(a, 'org_unit', orgs.get(specification.slots[0]).orgId));
                row.timings.mutationCompletedAt=new Date().toISOString();row.timings.releaseAStartedAt=new Date().toISOString();await end('a', true);row.timings.releaseACompletedAt=new Date().toISOString();
            } else {
                row.proofs.push(await waitProof('raw-touch-held', [a.processID], 1, 'raw-session-touch'));
                await begin('b');
                queued = lockSession(b, before[0].session, actor).then((value) => {row.timings.handoffAcquiredAt=new Date().toISOString();return {value};}, (error) => ({ error: error.code ?? error.name }));
                row.proofs.push(await waitProof('handoff-queued', [a.processID], 1, 'coordinator-session-lock', [b.processID]));
                row.timings.releaseAStartedAt=new Date().toISOString();await end('a', true);row.timings.releaseACompletedAt=new Date().toISOString();
                const acquired = await queued; assert(acquired.value, 'Session handoff was not acquired');
                row.handoffAcquired = true; row.heldRows.push(acquired.value);
                row.proofs.push(await waitProof('managed-cas-held', [b.processID], 1, 'managed-session-cas'));
                if (specification.kind === 'handoff-session') row.mutations.push(await bump(b, 'auth_session', before[0].session.id));
                else { await lockOrg(b, 'cascade-b'); row.mutations.push(await bump(b, 'org_unit', orgs.get('cascade-b').orgId)); }
                row.timings.mutationCompletedAt=new Date().toISOString();row.timings.releaseBStartedAt=new Date().toISOString();await end('b', true);row.timings.releaseBCompletedAt=new Date().toISOString();
            }
            const outcomes = await Promise.all(pending);
            assert(outcomes.every((outcome) => outcome.value), 'HTTP transport failed during a controlled race');
            row.responses = outcomes.map(({ value }) => ({ status: value.status, body: value.body, setCookieCount: value.setCookie.length }));
            assert.deepEqual(row.responses.map((response) => response.status), specification.statuses);
            assert(row.responses.every((response) => response.setCookieCount === 0));
            assertCaseProofs(row);
        } finally {
            await end('a', false);
            if (queued) await queued;
            await end('b', false);
            await Promise.allSettled(pending);
            if (leased) { await a.query('select pg_advisory_unlock(1380074307,$1)', [advisory]); leased = false; }
        }
        row.after = [];
        for (const index of used) row.after.push((await fixture('snapshot', 'admin', clients[index])).snapshot);
        row.orgAfter = await snapshots(specification.slots,`${specification.id}-after-org-snapshot`);
        phase=`${specification.id}-validate-case`;
        row.auditDelta = row.after[0].audits.length - row.before[0].audits.length;
        row.sessionVersionDeltas = row.after.map((value, index) => value.session.rowVersion - row.before[index].session.rowVersion);
        assert.equal(row.auditDelta, specification.auditDelta);
        assert.deepEqual(row.sessionVersionDeltas, specification.sessionDeltas);
        row.finishedAt = new Date().toISOString();
        assertCaseTiming(row);
    }
    try {
        owner = connection(true, 'marker'); await owner.connect(); await verifyConnection(owner, database, true); await owner.end(); owner = null;
        a = connection(false, 'lock-a'); b = connection(false, 'lock-b'); observer = connection(false, 'observer');
        for (const client of [a, b, observer]) { await client.connect(); await verifyConnection(client, database); }
        report.coordinatorPids = { a: a.processID, b: b.processID, observer: observer.processID };
        await runtime.waitForReadiness({ url: plan.target.readinessUrl, timeoutMs: 10000 });
        await fixture('prepare');
        for (let index = 0; index < 2; index++) { const client = new NavigationHttpSession(plan.target.origin, runId); await client.login('admin'); clients.push(client); }
        report.identities.admin = clients[0].userId; assert.equal(clients[0].userId, clients[1].userId);
        for (const slot of ['race-code-a', 'race-code-b', 'race-name-a', 'race-name-b', 'org-cas', 'session-cas', 'cascade-root']) await create(slot);
        for (const slot of ['cascade-a', 'cascade-b', 'cascade-c', 'cascade-d', 'cascade-e']) await create(slot, 'cascade-root');
        for (const slot of ['cascade-d', 'cascade-e']) await orgFixture('org-set-inactive', slot);
        report.preparedAt=new Date().toISOString();
        const route = (slot) => `/api/platform/org-units/${orgs.get(slot).orgId}`;
        const sharedCode = `r2c_${runId.replaceAll('-', '')}_concurrent_code`, sharedName = `R2C concurrent sibling ${runId.slice(0, 8)}`;
        for (const specification of concurrencyCases) {
            let requests;
            if (specification.id === 'code-after-both-prechecks') requests = specification.slots.map((slot, index) => ({ client: index, method: 'PATCH', route: route(slot), json: { code: sharedCode } }));
            else if (specification.id === 'sibling-name-after-both-prechecks') requests = specification.slots.map((slot, index) => ({ client: index, method: 'PATCH', route: route(slot), json: { name: sharedName } }));
            else if (specification.kind === 'org') requests = [{ client: 0, method: 'PATCH', route: specification.id.startsWith('alias') ? route('org-cas').toUpperCase().replace('/API/PLATFORM/ORG-UNITS/', '/api/platform/org-units/') : route('org-cas'), json: { name: 'R2C stale organization command' } }];
            else if (specification.kind === 'handoff-org') requests = [{ client: 0, method: 'POST', route: `${route('cascade-root')}:deactivate`, json: { reason: 'owned cascade concurrency' } }];
            else requests = [{ client: 0, method: 'PATCH', route: route('session-cas'), json: { description: 'R2C late session command' } }];
            await race(specification, requests);
        }
        phase = 'verify-complete'; validateSource(); assert.deepEqual(sources(), report.sourceFiles);
        assert.deepEqual(report.cases.map((row) => row.id), concurrencyCases.map((value) => value.id));
        report.result = 'observed';
    } catch (error) { report.result = 'fail'; report.failurePhase = phase; report.failureReason = /^R2C_[A-Za-z0-9_-]+/.exec(error.message)?.[0] ?? error.code ?? error.name; process.exitCode = 1; }
    finally {
        try { if (a) await end('a', false); if (b) await end('b', false); } catch { report.lockReleaseFailed = true; report.result = 'fail'; }
        for (const client of [a,b,observer,owner]) if (client) try { await client.end(); } catch { report.connectionCloseFailed = true; report.result = 'fail'; }
        try { report.cleanup = await fixture('cleanup'); report.zeroResidual = await fixture('cleanup'); assert.deepEqual([report.zeroResidual.matched,report.zeroResidual.changed],[0,0]); report.cleanupCompleted=true; }
        catch { report.cleanupCompleted=false; report.result='fail'; process.exitCode=1; }
        report.finishedAt = new Date().toISOString();
        if(report.result!=='observed')process.exitCode=1;
        writeFileSync(output, `${JSON.stringify(report,null,2)}\n`, { flag:'wx',mode:0o600 });
    }
    console.log(JSON.stringify({result:report.result,backend,runId,cases:report.cases.length,failurePhase:report.failurePhase,output,cleanupCompleted:report.cleanupCompleted}));
    return {report,output};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert.equal(process.argv.length,5,'Usage: http-concurrency.mjs <nest|rust> <server-receipt.json> <tag>');
    await runHttpConcurrency({backend:process.argv[2],serverReceiptFile:process.argv[3],tag:process.argv[4]});
}
