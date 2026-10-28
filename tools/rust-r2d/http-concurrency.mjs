import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { databaseFor, validateSource, verifyConnection, sourceHead, validateAmbient } from './fixture-guard.mjs';
import { journalStore } from './fixture-journal.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { baselineSourceFile } from './http-compat.mjs';
import { g1BaselineSha256, planSha256 as originalPlanSha256, witnessCases } from './nest-witness-plan.mjs';
import { concurrencyCases, concurrencyManifest, userRowLockMode, sanitizeActivity, dependencyPath, assertWaitProof, assertCaseProofs, assertCaseTiming, assertStatuses, captureControlledRequests } from './http-concurrency-protocol.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const { invokeFixture } = require('./invoke-fixture.cjs');
const { userFixtureSpec } = require('./fixture-protocol.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function safeEvidencePath(relative, mustExist = false) {
    assert(typeof relative === 'string' && !relative.includes('\\') && !relative.includes(':') && relative.split('/').every((part) => part && part !== '.' && part !== '..'));
    assert(relative.startsWith('tmp/rust-r2d/') && relative.endsWith('.json'));
    const resolved = path.join(root, relative);
    let cursor = root;
    for (const part of relative.split('/')) {
        cursor = path.join(cursor, part);
        if (existsSync(cursor)) { const stat = lstatSync(cursor); assert(!stat.isSymbolicLink()); assert(cursor === resolved ? stat.isFile() : stat.isDirectory()); }
    }
    if (mustExist) { const stat = lstatSync(resolved); assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 16 * 1024 * 1024 && (process.platform === 'win32' || (stat.mode & 0o077) === 0)); }
    return resolved;
}
function workerIdentity(pid) {
    assert(Number.isSafeInteger(pid) && pid > 0);
    const raw = readFileSync(`/proc/${pid}/stat`, 'utf8'), parts = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
    assert(/^[0-9]+$/.test(parts[19]) && BigInt(parts[19]) > 0n); return { pid, startTicks: parts[19] };
}
function relativeSource(file) {
    assert(typeof file === 'string' && !file.includes('\\') && !file.includes(':') && !path.posix.isAbsolute(file) && file.split('/').every((part) => part && part !== '.' && part !== '..'));
    const resolved = path.join(root, file); assert(resolved.startsWith(root + path.sep));
    let cursor = root;
    for (const part of file.split('/')) { cursor = path.join(cursor, part); assert(!lstatSync(cursor).isSymbolicLink(), 'No source symlink'); }
    assert(lstatSync(resolved).isFile()); return resolved;
}
export function validateConcurrencyReceipt(value, backend, origin) {
    assert.equal(value.backend, backend); assert.equal(value.origin, origin); assert.equal(value.sourceHead, sourceHead); assert.equal(value.aliveBefore, true); assert.equal(value.ownerPlatform, 'linux');
    assert(Number.isSafeInteger(value.pid) && value.pid > 0); assert(/^[0-9a-f]{64}$/.test(value.binarySha256));
    assert.deepEqual(Object.keys(value.processIdentity ?? {}).sort(), ['pid', 'startTicks']); assert.equal(value.processIdentity.pid, value.pid);
    assert(/^[0-9]+$/.test(value.processIdentity.startTicks) && BigInt(value.processIdentity.startTicks) > 0n);
    assert(Array.isArray(value.sourceFiles) && value.sourceFiles.length);
    for (const entry of value.sourceFiles) { assert.deepEqual(Object.keys(entry).sort(), ['file', 'sha256']); assert(/^[0-9a-f]{64}$/.test(entry.sha256)); relativeSource(entry.file); }
    assert.equal(new Set(value.sourceFiles.map((entry) => entry.file)).size, value.sourceFiles.length);
    return Object.fromEntries(['backend', 'origin', 'pid', 'binarySha256', 'sourceHead', 'aliveBefore', 'ownerPlatform', 'processIdentity', 'sourceFiles'].map((key) => [key, value[key]]));
}
export function parseConcurrencyOptions(args) {
    if (args.length === 1 && args[0] === '--plan') return { mode: 'plan' };
    assert(args[0] === '--run' && [4, 6].includes(args.length), 'Usage: --run <nest|rust> <server-receipt.json> <unique-tag> [--case <id>]');
    const [backend, serverReceiptFile, tag] = args.slice(1, 4);
    assert(['nest', 'rust'].includes(backend) && /^[a-z][a-z0-9-]{0,30}$/.test(tag)); safeEvidencePath(serverReceiptFile);
    const selectedCaseIds = args.length === 4 ? concurrencyCases.map((row) => row.id) : args[4] === '--case' && concurrencyCases.some((row) => row.id === args[5]) ? [args[5]] : null;
    assert(selectedCaseIds); return { mode: 'run', backend, serverReceiptFile, tag, selectedCaseIds };
}
export function concurrencySourceFiles() {
    const files = [baselineSourceFile(), 'libs/shared/api-spec/openapi.json', 'package.json', 'pnpm-lock.yaml', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'tools/rust-r2c/witness-query-core.cjs', 'tools/rust-r2d/fixture.sh', 'tools/rust-r2d/environment.sh'];
    const walk = (folder, pattern) => {
        for (const entry of readdirSync(path.join(root, folder), { withFileTypes: true })) {
            assert(!entry.isSymbolicLink()); const file = folder + '/' + entry.name;
            if (entry.isDirectory()) walk(file, pattern); else if (entry.isFile() && pattern.test(entry.name)) files.push(file);
        }
    };
    for (const folder of ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'libs/vendor/nestjs-zod/src']) walk(folder, /\.ts$/);
    walk('apps/poms-api-rust/src', /\.rs$/); walk('tools/rust-r2d', /\.(?:mjs|cjs|json|cts)$/);
    return [...new Set(files)].sort().map((file) => ({ file, sha256: digest(readFileSync(relativeSource(file))) }));
}
export function assertPrivateDirectory(directory) {
    const stat = lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0); return true;
}
function makePrivateDirectory(directory) {
    assert(!existsSync(directory), 'Preserve previous run directory'); mkdirSync(directory, { mode: 0o700 });
    assertPrivateDirectory(directory);
}
function secret(file) {
    const stat = lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 1024 && (stat.mode & 0o077) === 0);
    const value = readFileSync(file, 'utf8'); assert(!/[\r\n\0]/.test(value)); return value;
}
export function assertOriginalSelection(selection, expectedIds, originalW01 = false) {
    // W01 predates the later subset runners and saved the full manifest case
    // objects. Preserve that exact historical schema; later runners saved IDs.
    assert.deepEqual(selection, originalW01 ? expectedIds.map((id) => witnessCases.find((row) => row.id === id)) : expectedIds);
}
export function originalNestReferences() {
    const coreGroups = ['W02', 'W04', 'W05', 'W07', 'W08'], remainingGroups = ['W03', 'W06', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14', 'W15'];
    const deleted = ['W04-roles-deleted-after-check', 'W05-org-deleted-after-check'];
    const selected = [witnessCases.filter((row) => row.group === 'W01').map((row) => row.id), witnessCases.filter((row) => coreGroups.includes(row.group) && !deleted.includes(row.id)).map((row) => row.id), [deleted[0]], [deleted[1]], witnessCases.filter((row) => remainingGroups.includes(row.group)).map((row) => row.id)];
    const references = ['nest-create-witness01.json', 'nest-behavior-core01.json', 'nest-behavior-role-delete01.json', 'nest-behavior-org-delete01.json', 'nest-remaining-remaining02.json'].map((name, index) => {
        const file = 'tmp/rust-r2d/' + name, full = safeEvidencePath(file), stat = lstatSync(full);
        assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 64 * 1024 * 1024);
        const bytes = readFileSync(full), value = JSON.parse(bytes);
        assert.equal(value.backend, 'nest'); assert.equal(value.sourceHead, sourceHead); assert.equal(value.result, 'observed-partial');
        assert.equal(value.witnessPlan.planSha256, originalPlanSha256); assert.equal(value.witnessPlan.g1BaselineSha256, g1BaselineSha256);
        assertOriginalSelection(value.selection, selected[index], index === 0); assert.deepEqual(value.observations.map((row) => row.id), selected[index]); assert(value.observations.every((row) => row.result === 'observed'));
        assert.equal(value.sourcesUnchanged, true); assert.deepEqual(value.sourcesAfter, value.sourcesBefore);
        assert.equal(value.owner.aliveAfter, true); assert.equal(value.owner.stopped, true); if (index) assert.equal(value.owner.result, 'pass');
        const capture = value.owner.capture ?? value.owner.startCapture;
        assert.equal(capture.runId, value.runId); assert.deepEqual(value.owner.workerAfter, { pid: value.owner.serverPid, startTicks: capture.workerIdentity.startTicks });
        assert.equal(value.binary.sha256, value.binary.afterSha256); assert.equal(value.binary.sha256, '86847230bce15d6f903316e974021c86d471597f822fc69dd63fd2c3f2a54175');
        assert.equal(value.cleanup.length, 2); assert(value.cleanup.every((row) => row.state === 'cleaned')); assert.deepEqual([value.cleanup[1].matched, value.cleanup[1].changed], [0, 0]);
        assert(!value.cleanupFailure && !value.stopFailure && !value.failure);
        return { file, sha256: digest(bytes), runId: value.runId, originalResult: value.result, caseIds: value.observations.map((row) => row.id) };
    });
    const ids = references.flatMap((entry) => entry.caseIds); assert.equal(ids.length, 73); assert.equal(new Set(ids).size, 73); assert.deepEqual(ids.toSorted(), witnessCases.map((row) => row.id).toSorted()); return references;
}

// Root owns the server lifecycle and final owner closeout. This runner only
// uses new R2D databases/fixtures and exact rows; it never starts services,
// modifies system roles, takes table locks, installs triggers or uses preload.
export async function runHttpConcurrency({ backend, serverReceiptFile, tag, selectedCaseIds = concurrencyCases.map((row) => row.id) }) {
    assert.equal(process.platform, 'linux'); assert.equal(realpathSync(process.cwd()), realpathSync(root)); process.umask(0o077);
    assert.equal(process.env.POMS_E2E_MODE, `managed-${backend}`); assert.equal(process.env.POMS_E2E_ENV_PROFILE, 'r2d');
    const ambient = { ...process.env }; delete ambient.POMS_ENV_FILE; validateAmbient(ambient);
    assert(!Object.keys(ambient).some((key) => /POMS_.*(?:WITNESS|QUERY|SQL|BARRIER)/i.test(key)), 'No instrumentation or alternate SQL selector');
    validateSource(); assert.equal(digest(readFileSync(relativeSource('docs/design/rust-r2d-users-profile-baseline.md'))), g1BaselineSha256);
    assert(selectedCaseIds.length && new Set(selectedCaseIds).size === selectedCaseIds.length && selectedCaseIds.every((id) => concurrencyCases.some((row) => row.id === id)));
    assert(/^[a-z][a-z0-9-]{0,30}$/.test(tag));
    const managed = loadManagedEnvironment({ mode: `managed-${backend}` }), database = databaseFor(backend), origin = `http://127.0.0.1:${managed.port}`;
    assert.equal(managed.database, database);
    const receiptBytes = readFileSync(safeEvidencePath(serverReceiptFile, true)), receipt = validateConcurrencyReceipt(JSON.parse(receiptBytes), backend, origin);
    const output = safeEvidencePath(`tmp/rust-r2d/concurrency-${backend}-${tag}.json`); assert(!existsSync(output));
    const runId = randomUUID(), base = path.join(root, 'tmp/rust-r2d/concurrency');
    if (!existsSync(base)) mkdirSync(base, { mode: 0o700 });
    assertPrivateDirectory(base);
    const directory = path.join(base, runId); makePrivateDirectory(directory);
    const sources = concurrencySourceFiles(), witnesses = originalNestReferences(), report = { formatVersion: 1, schema: 'r2d-http-concurrency.v1', result: 'pending', backend, platform: process.platform, runId, tag, sourceHead,
        serverReceipt: { file: serverReceiptFile, sha256: digest(receiptBytes), value: receipt }, plan: concurrencyManifest(), selectedCaseIds, sourcesBefore: sources,
        originalNestWitnesses: witnesses,
        serviceOwnership: 'External root coordinator; liveness and unchanged binary checked here. Final stopped owner receipt is required separately.',
        sourceArchive: `tmp/rust-r2d/concurrency/${runId}/sources`, identities: { users: {}, roles: {}, orgs: {} }, setup: [], cases: [], fixtureActions: [], startedAt: new Date().toISOString(), cleanupCompleted: false };
    const archive = path.join(directory, 'sources'); makePrivateDirectory(archive);
    for (const entry of sources) {
        const target = path.join(archive, entry.file); mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 }); writeFileSync(target, readFileSync(relativeSource(entry.file)), { flag: 'wx', mode: 0o600 });
    }
    const references = path.join(directory, 'references'); makePrivateDirectory(references);
    for (const entry of witnesses) writeFileSync(path.join(references, path.basename(entry.file)), readFileSync(safeEvidencePath(entry.file)), { flag: 'wx', mode: 0o600 });
    const appPassword = secret('/run/secrets/r2d-app-password'); assert(/^[0-9a-f]{64}$/.test(appPassword)); assert(managed.childEnv.DB_PASSWORD === appPassword, 'Controlled app credential mismatch');
    const connections = [], transactions = new Set(), clients = [], privateTokens = new Map();
    let a, b, observer, journal, phase = 'admission', prepared = false, leased = false, activitySequence = 0, nextSlot = 0;
    const leaseKey = createHash('sha256').update(`${backend}:${runId}`).digest().readInt32BE(0);
    const fixture = async (action, extra = {}) => {
        const value = await invokeFixture({ formatVersion: 1, runId, backend, account: 'none', action, ...extra });
        report.fixtureActions.push({ action, ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'sessionToken')), matched: value.matched, changed: value.changed, state: value.state });
        return value;
    };
    const facts = async () => (await fixture('facts')).facts;
    const sessionFacts = async () => {
        const result = {}; for (const [i, client] of clients.entries()) result[`admin${i}`] = (await fixture('snapshot', { account: 'admin', sessionToken: privateTokens.get(client) })).snapshot;
        return result;
    };
    function connect(owner = false, name = 'observer') {
        const password = owner ? secret('/run/secrets/r2d-owner-password') : appPassword;
        return new Client({ host: '127.0.0.1', port: 15432, database, user: owner ? 'poms_r0e_owner' : 'poms_r2d_app', password, connectionTimeoutMillis: 5000, query_timeout: 10000, application_name: `r2d-${runId}-${name}` });
    }
    function liveServer() {
        assert.deepEqual(workerIdentity(receipt.pid), receipt.processIdentity);
        const binary = backend === 'nest' ? readFileSync(relativeSource('dist/apps/poms-api/main.js')) : readFileSync(`/proc/${receipt.pid}/exe`);
        assert.equal(digest(binary), receipt.binarySha256);
        if (backend === 'nest') assert(readFileSync(`/proc/${receipt.pid}/cmdline`, 'utf8').split('\0').some((part) => part === 'dist/apps/poms-api/main.js' || part === path.join(root, 'dist/apps/poms-api/main.js')));
        return { processIdentity: workerIdentity(receipt.pid), binarySha256: digest(binary), alive: true, at: new Date().toISOString() };
    }
    async function begin(client) { await client.query('BEGIN'); transactions.add(client); await client.query("set local statement_timeout='8s'"); }
    async function end(client, commit = false) { if (transactions.has(client)) { await client.query(commit ? 'COMMIT' : 'ROLLBACK'); transactions.delete(client); } }
    function ownedUser(slot) {
        const value = [...journal.accounts.map((entry) => ({ slot: entry.account, ...entry })), ...journal.users].find((entry) => entry.slot === slot);
        assert(value && uuid.test(value.userId ?? '') && value.username); return value;
    }
    async function lockUser(client, slot, lockMode = 'FOR UPDATE') {
        assert(['FOR UPDATE', 'FOR NO KEY UPDATE'].includes(lockMode));
        const owned = ownedUser(slot), found = await client.query(`select to_jsonb(u) as data from poms.platform_user u where id=$1 ${lockMode}`, [owned.userId]);
        assert.equal(found.rowCount, 1); assert.equal(found.rows[0].data.username, owned.username);
        return { table: 'platform_user', id: owned.userId, slot, lockMode, holderPid: client.processID, before: found.rows[0].data };
    }
    async function lockReference(client, kind, slot) {
        const table = kind === 'roles' ? 'role' : 'org_unit', key = kind === 'roles' ? 'role_key' : 'code', entry = journal[kind].find((row) => row.slot === slot); assert(entry);
        const row = await client.query(`select to_jsonb(r) as data from poms.${table} r where id=$1 for update`, [entry.id]);
        assert.equal(row.rowCount, 1); assert.equal(row.rows[0].data[key], entry.key); return { table, id: entry.id, slot, lockMode: 'FOR UPDATE', holderPid: client.processID, before: row.rows[0].data };
    }
    async function lockSession(client, sessionId) {
        assert(uuid.test(sessionId)); const actor = ownedUser('admin');
        const row = await client.query('select id::text from poms.auth_session where id=$1 and user_id=$2 for update', [sessionId, actor.userId]);
        assert.equal(row.rowCount, 1); assert.equal(row.rows[0].id, sessionId); return { table: 'auth_session', id: sessionId, userId: actor.userId, lockMode: 'FOR UPDATE', holderPid: client.processID };
    }
    async function bump(client, table, id) {
        assert(['platform_user', 'auth_session'].includes(table) && uuid.test(id));
        const before = (await client.query(`select id::text,row_version,to_jsonb(updated_at) as updated_at from poms.${table} where id=$1`, [id])).rows[0]; assert(before);
        const result = await client.query(`update poms.${table} set row_version=row_version+1 where id=$1 and row_version=$2 returning id`, [id, before.row_version]); assert.equal(result.rowCount, 1);
        const after = (await client.query(`select id::text,row_version,to_jsonb(updated_at) as updated_at from poms.${table} where id=$1`, [id])).rows[0];
        assert.equal(after.updated_at, before.updated_at); return { table, id, before, after };
    }
    async function waitProof(row, stage, roots, count, kind, explicitPids) {
        const deadline = Date.now() + 2500;
        while (Date.now() < deadline) {
            const found = await observer.query("select pid,state,wait_event_type,wait_event,pg_blocking_pids(pid) as blockers,query from pg_stat_activity where datname=current_database() and usename=current_user and wait_event_type='Lock' order by pid");
            const rows = found.rows.map(sanitizeActivity), excluded = [a.processID, b.processID, observer.processID];
            const pids = explicitPids ?? rows.filter((value) => !excluded.includes(value.pid) && dependencyPath(rows, value.pid, roots)).map((value) => value.pid);
            assert(pids.length <= count, 'Unexpected waiter depends on these owned locks');
            if (pids.length === count && pids.every((pid) => rows.some((value) => value.pid === pid))) {
                const proof = { stage, sequence: ++activitySequence, at: new Date().toISOString(), roots, expectedCount: count, expectedKind: kind, waiterPids: pids, rows, worker: workerIdentity(receipt.pid), ...(row.targetSessionId ? { targetSessionId: row.targetSessionId } : {}) };
                assertWaitProof(proof); row.proofs.push(proof); return proof;
            }
            await delay(10);
        }
        throw new Error('R2D_CONCURRENCY_BARRIER_TIMEOUT');
    }
    async function createUser() {
        const slot = `u${String(nextSlot++).padStart(3, '0')}`, spec = userFixtureSpec(runId, slot); await fixture('user-plan', { userSlot: slot });
        const row = { action: 'create-user', slot, method: 'POST', path: '/api/platform/users', input: { username: spec.username, displayName: spec.displayName, primaryOrgUnitId: null, initialRoleIds: [] } }; report.setup.push(row);
        try { const response = await clients[0].request(row.method, row.path, { json: row.input }); Object.assign(row, { status: response.status, response: response.body }); assert.equal(response.status, 201); }
        finally { row.adoption = await fixture('user-adopt', { userSlot: slot }); }
        journal = journalStore({ backend, runId }).read(); report.fixture = journal; const target = ownedUser(slot); report.identities.users[slot] = target.userId; return target;
    }
    async function setupHttp(method, route, input) {
        const row = { method, path: route, input }; report.setup.push(row); const response = await clients[0].request(method, route, { json: input }); Object.assign(row, { status: response.status, response: response.body }); assert.equal(response.status, 200);
    }
    const relations = async (table, id) => { assert(['user_role_assignment', 'user_org_membership'].includes(table)); return (await observer.query(`select to_jsonb(r) as data from poms.${table} r where user_id=$1 order by id`, [id])).rows.map((row) => row.data); };
    async function followup(row, method, route, input) {
        const request = { client: 0, method, path: route, ...(input === undefined ? {} : { input }) }; row.followups.push(request);
        try { const response = await clients[0].request(method, route, input === undefined ? {} : { json: input }); Object.assign(request, { status: response.status, response: response.body, setCookieCount: response.setCookie.length, settledAt: new Date().toISOString() }); }
        catch (error) { request.transportError = { name: error.name }; throw error; }
    }
    async function race(spec) {
        phase = `prepare-${spec.id}`;
        await fixture('role-set-active', { roleSlot: 'admin' }); await fixture('restore', { account: 'admin' });
        clients.length = 0;
        for (let i = 0; i < 2; i++) { const client = new NavigationHttpSession(origin, runId); await client.login('admin'); clients.push(client); privateTokens.set(client, client.cookies.get('poms_session')); }
        const target = spec.self ? ownedUser('admin') : await createUser(), route = `/api/platform/users/${spec.alias ? target.userId.toUpperCase() : target.userId}`;
        const alphaRole = journal.roles.find((entry) => entry.slot === 'alpha'), alphaOrg = journal.orgs.find((entry) => entry.slot === 'alpha'), viewerOrg = journal.orgs.find((entry) => entry.slot === 'viewer');
        if (spec.kind === 'roles' || spec.command === 'roles') await fixture('user-role-matrix', { userSlot: target.slot });
        if (spec.kind === 'org-cas' || spec.command === 'org') { await setupHttp('PUT', `${route}/org-memberships`, { primaryOrgUnitId: viewerOrg.id, secondaryOrgUnitIds: [] }); await fixture('user-membership-matrix', { userSlot: target.slot }); }
        if (spec.kind === 'org-fk') await setupHttp('PUT', `${route}/org-memberships`, { primaryOrgUnitId: alphaOrg.id, secondaryOrgUnitIds: [] });
        if (spec.kind === 'nullable') await fixture(spec.values ? 'user-profile-null' : 'user-profile-values', { userSlot: target.slot });
        let planned;
        if (spec.kind === 'username') {
            const slot = `u${String(nextSlot++).padStart(3, '0')}`; await fixture('user-plan', { userSlot: slot }); journal = journalStore({ backend, runId }).read(); planned = journal.users.find((entry) => entry.slot === slot); assert(planned && planned.userId === null);
        }
        const due = spec.kind === 'session';
        for (const client of clients) await fixture(due ? 'session-due' : 'session-non-due', { account: 'admin', sessionToken: privateTokens.get(client) });
        const row = { id: spec.id, kind: spec.kind, result: 'capture-incomplete', target: { slot: target.slot, id: target.userId, username: target.username }, startedAt: new Date().toISOString(), before: await facts(), sessionsBefore: await sessionFacts(), requests: [], proofs: [], heldRows: [], mutations: [], followups: [] };
        report.cases.push(row); phase = spec.id;
        let queued, held;
        const request = (client, method, requestPath, input) => ({ client, method, path: requestPath, input });
        const patch = { displayName: `R2D concurrent ${spec.id} ${runId.slice(0, 8)}` };
        let requests;
        await begin(a);
        if (spec.kind === 'username') {
            held = await lockUser(a, target.slot, userRowLockMode(spec.kind)); row.heldRows.push(held);
            const changed = await a.query('update poms.platform_user set username=$2 where id=$1 and username=$3 returning id', [held.id, planned.username, held.before.username]); assert.equal(changed.rowCount, 1);
            row.reservation = { sentinelId: held.id, originalUsername: held.before.username, plannedSlot: planned.slot, plannedUsername: planned.username, mode: 'temporary uncommitted owned username; rollback required' };
            const body = { username: planned.username, displayName: `R2D concurrent username ${runId.slice(0, 8)}`, primaryOrgUnitId: null, initialRoleIds: [] }; requests = [request(0, 'POST', '/api/platform/users', body), request(1, 'POST', '/api/platform/users', body)];
        } else if (spec.kind === 'roles') { held = await lockReference(a, 'roles', 'alpha'); row.heldRows.push(held); requests = [request(0, 'PUT', `${route}/roles`, { roleIds: [alphaRole.id] }), request(1, 'PUT', `${route}/roles`, { roleIds: [alphaRole.id] })]; }
        else if (spec.kind === 'org-fk') { held = await lockReference(a, 'orgs', 'alpha'); row.heldRows.push(held); requests = [request(0, 'PUT', `${route}/org-memberships`, { primaryOrgUnitId: alphaOrg.id, secondaryOrgUnitIds: [viewerOrg.id] })]; }
        else if (due) {
            row.targetSessionId = row.sessionsBefore.admin0.session.id;
            const account = ownedUser('admin'), owned = await a.query('select id from poms.auth_session where id=$1 and user_id=$2 and token_hash=$3', [row.targetSessionId, account.userId, digest(privateTokens.get(clients[0]))]); assert.equal(owned.rowCount, 1);
            held = await lockSession(a, row.targetSessionId); row.heldRows.push(held);
            requests = [spec.command === 'roles' ? request(0, 'PUT', `${route}/roles`, { roleIds: [] }) : spec.command === 'org' ? request(0, 'PUT', `${route}/org-memberships`, { primaryOrgUnitId: alphaOrg.id, secondaryOrgUnitIds: [] }) : request(0, 'PATCH', route, spec.command === 'noop' ? {} : patch)];
        } else {
            held = await lockUser(a, target.slot, userRowLockMode(spec.kind)); row.heldRows.push(held);
            requests = [spec.kind === 'org-cas' ? request(0, 'PUT', `${route}/org-memberships`, { primaryOrgUnitId: alphaOrg.id, secondaryOrgUnitIds: [] }) : request(0, 'PATCH', spec.kind === 'nullable' && spec.self ? '/api/auth/profile' : route, patch)];
            if (spec.kind === 'user-pair') requests.push(request(1, 'POST', `${route}:deactivate`, {}));
        }
        await captureControlledRequests({ row, requests, send: (r) => clients[r.client].request(r.method, r.path, { json: r.input }),
            control: async () => {
                const count = requests.length, kind = spec.kind === 'username' ? 'user-insert' : spec.kind === 'roles' ? 'role-insert' : spec.kind === 'org-fk' ? 'membership-insert' : due ? 'raw-session-touch' : 'user-cas';
                await waitProof(row, 'primary-owned-lock', [a.processID], count, kind);
                if (['roles', 'org-cas', 'org-fk'].includes(spec.kind)) row.relationshipsDuringWait = await relations(spec.kind === 'roles' ? 'user_role_assignment' : 'user_org_membership', target.userId);
                if (due) {
                    await begin(b); queued = lockSession(b, row.targetSessionId).then((value) => { row.handoffAcquiredAt = new Date().toISOString(); return value; });
                    // Install a handler immediately; failure must not become an
                    // unhandled rejection before the recovery path awaits it.
                    queued.catch(() => undefined);
                    await waitProof(row, 'handoff-queued', [a.processID], 1, 'coordinator-session-lock', [b.processID]);
                    row.rawTouchReleasedAt = new Date().toISOString(); await end(a, true); row.heldRows.push(await queued); row.handoffAcquired = true;
                    await waitProof(row, 'managed-cas-owned-lock', [b.processID], 1, 'managed-session-cas');
                    row.mutations.push(await bump(b, 'auth_session', row.targetSessionId));
                } else if (['org-cas', 'user-cas', 'user-pair'].includes(spec.kind)) row.mutations.push(await bump(a, 'platform_user', target.userId));
                else if (spec.kind === 'nullable') {
                    const values = spec.values ? ['witness@example.test', '12345', 'https://example.test/avatar.png', alphaOrg.id, '2020-02-03T04:05:06.123Z'] : [null, null, null, null, null];
                    const changed = await a.query('update poms.platform_user set email=$2,phone=$3,avatar_url=$4,primary_org_unit_id=$5,last_login_at=$6 where id=$1 and username=$7 returning row_version,to_jsonb(updated_at) as updated_at', [target.userId, ...values, target.username]); assert.equal(changed.rowCount, 1);
                    assert.equal(changed.rows[0].row_version, held.before.row_version); assert.equal(changed.rows[0].updated_at, held.before.updated_at);
                    row.mutations.push({ table: 'platform_user', id: target.userId, kind: spec.values ? 'nullable-values-no-version' : 'nullable-null-no-version', values, beforeVersion: held.before.row_version, afterVersion: changed.rows[0].row_version, unchangedUpdatedAt: true });
                } else if (spec.kind === 'role-change') row.mutations.push({ targetRoleId: journal.roles.find((entry) => entry.slot === 'admin').id, receipt: await fixture('role-set-inactive', { roleSlot: 'admin' }) });
                else if (spec.kind === 'caller-disable') row.mutations.push({ targetUserId: ownedUser('admin').userId, receipt: await fixture('user-set-inactive', { userSlot: 'admin' }) });
                else if (spec.kind === 'org-fk') {
                    const changed = await a.query('update poms.org_unit set is_active=false,row_version=row_version+1 where id=$1 and code=$2 returning id', [alphaOrg.id, alphaOrg.key]); assert.equal(changed.rowCount, 1); row.mutations.push({ table: 'org_unit', id: alphaOrg.id, isActive: false, phase: 'after-validated-before-FK-release' });
                }
                row.releasedAt = new Date().toISOString(); await end(due ? b : a, spec.kind !== 'username');
            },
            release: async () => {
                // Every error path rolls back the sentinel and both held rows
                // before waiting for HTTP. Preserve restoration independently.
                await end(a, false); if (queued) try { await queued; } finally { await end(b, false); } else await end(b, false);
                row.releasedAt ??= new Date().toISOString();
                if (spec.kind === 'username') {
                    const restored = await observer.query('select to_jsonb(u) as data from poms.platform_user u where id=$1', [held.id]);
                    row.sentinelAfterRollback = restored.rows[0]?.data ?? null; assert.deepEqual(row.sentinelAfterRollback, held.before); row.sentinelRestored = true;
                }
            },
            adopt: planned ? async () => { const value = await fixture('user-adopt', { userSlot: planned.slot }); journal = journalStore({ backend, runId }).read(); report.fixture = journal; if (value.user.userId) report.identities.users[planned.slot] = value.user.userId; return value; } : undefined,
            captureFollowups: async () => {
                if (spec.kind === 'role-change') { await followup(row, 'GET', '/api/platform/users'); await followup(row, 'GET', '/api/auth/profile'); }
                if (spec.kind === 'caller-disable') await followup(row, 'GET', '/api/auth/profile');
                if (spec.kind === 'org-fk') await followup(row, 'PUT', `${route}/org-memberships`, { primaryOrgUnitId: alphaOrg.id, secondaryOrgUnitIds: [] });
            }, captureAfter: facts, captureSessions: sessionFacts,
            verify: () => {
                assertCaseProofs(row); assertCaseTiming(row); assertStatuses(row);
                assert.deepEqual(row.after.local_credential, row.before.local_credential, 'No password/credential writes');
                const beforeAudits = new Map(row.before.audit_log.map((audit) => [audit.id, audit]));
                for (const [id, audit] of beforeAudits) assert.deepEqual(row.after.audit_log.find((entry) => entry.id === id), audit);
                row.auditDelta = row.after.audit_log.length - beforeAudits.size; assert.equal(row.auditDelta, spec.auditDelta);
                row.sessionVersionDeltas = Object.keys(row.sessionsBefore).map((key) => row.sessionsAfter[key].session.rowVersion - row.sessionsBefore[key].session.rowVersion);
                if (due) assert.deepEqual(row.sessionVersionDeltas, [2, 0]);
                if (spec.kind === 'role-change') { assert.deepEqual(row.followups[1].response.roles, []); assert.deepEqual(row.followups[1].response.permissions, []); }
                if (spec.kind === 'caller-disable') assert.equal(row.sessionsAfter.admin0.session.status, 'revoked');
            } });
        report.workerAfterEachCase ??= []; report.workerAfterEachCase.push(liveServer());
    }
    try {
        report.workerBefore = liveServer();
        for (const entry of receipt.sourceFiles) assert.equal(digest(readFileSync(relativeSource(entry.file))), entry.sha256, 'Server receipt source epoch changed');
        const marker = connect(true, 'marker'); connections.push(marker); await marker.connect(); await verifyConnection(marker, database, true); await marker.end(); connections.pop();
        a = connect(false, 'lock-a'); b = connect(false, 'lock-b'); observer = connect(false, 'observer');
        for (const client of [a, b, observer]) { connections.push(client); await client.connect(); await verifyConnection(client, database); }
        report.coordinatorPids = { a: a.processID, b: b.processID, observer: observer.processID };
        assert.equal((await a.query('select pg_try_advisory_lock(1380074309,$1) as locked', [leaseKey])).rows[0].locked, true); leased = true;
        phase = 'fixture-prepare'; prepared = true; await fixture('prepare'); journal = journalStore({ backend, runId }).read(); report.fixture = journal; assert.equal(journal.state, 'prepared');
        for (const entry of journal.accounts) report.identities.users[entry.account] = entry.userId;
        for (const kind of ['roles', 'orgs']) for (const entry of journal[kind]) report.identities[kind][entry.slot] = entry.id;
        for (const id of selectedCaseIds) await race(concurrencyCases.find((entry) => entry.id === id));
        phase = 'source-final'; validateSource(); report.sourcesAfter = concurrencySourceFiles(); assert.deepEqual(report.sourcesAfter, sources); assert.deepEqual(originalNestReferences(), witnesses); report.workerAfter = liveServer();
        assert.deepEqual(report.cases.map((row) => row.id), selectedCaseIds); assert(report.cases.every((row) => row.result === 'observed')); report.result = 'observed';
    } catch (error) { report.result = 'capture-incomplete'; report.failurePhase = phase; report.failure = { name: error.name, ...(typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? { sqlstate: error.code } : {}) }; process.exitCode = 1; }
    finally {
        for (const client of [a, b]) if (client) try { await end(client, false); } catch { report.lockReleaseFailed = true; report.result = 'capture-incomplete'; }
        if (leased) try { await a.query('select pg_advisory_unlock(1380074309,$1)', [leaseKey]); } catch { report.leaseReleaseFailed = true; report.result = 'capture-incomplete'; }
        for (const client of connections.reverse()) try { await client.end(); } catch { report.connectionCloseFailed = true; report.result = 'capture-incomplete'; }
        try { report.workerAtClose = liveServer(); } catch { report.workerIdentityFailed = true; report.result = 'capture-incomplete'; }
        if (prepared) {
            for (const key of ['cleanup', 'zeroResidual']) try { report[key] = await fixture('cleanup'); } catch { report[key] = { failed: true }; report.result = 'capture-incomplete'; }
            report.cleanupCompleted = report.cleanup?.state === 'cleaned' && report.zeroResidual?.state === 'cleaned' && report.zeroResidual.matched === 0 && report.zeroResidual.changed === 0;
            if (!report.cleanupCompleted) report.result = 'capture-incomplete';
        }
        report.finishedAt = new Date().toISOString(); if (report.result !== 'observed') process.exitCode = 1;
        writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    console.log(JSON.stringify({ backend, result: report.result, runId, cases: report.cases.length, failurePhase: report.failurePhase, cleanupCompleted: report.cleanupCompleted, output })); return { report, output };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const options = parseConcurrencyOptions(process.argv.slice(2));
    if (options.mode === 'plan') console.log(JSON.stringify(concurrencyManifest(), null, 2)); else await runHttpConcurrency(options);
}
