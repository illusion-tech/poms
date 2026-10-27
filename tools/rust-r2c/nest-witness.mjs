import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
import { analyzeSql, parseSqlJsonl } from './witness-sql.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
assert.equal(process.argv.length, 2);
assert.equal(process.platform, 'linux', 'The original Nest witness owns its Linux process');
process.umask(0o077);
const output = path.join(root, 'tmp/rust-r2c/nest-witness.json');
assert(!existsSync(output), 'Preserve the previous witness and use an explicitly reviewed followup for another run');
const runId = randomUUID();
const directory = path.join(root, 'tmp/rust-r2c/witness', runId);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const sqlPath = path.join(directory, 'sql.jsonl');
const report = { formatVersion: 1, result: 'pending', kind: 'Original Nest SQL observation; no Rust equivalence or G3 assertion', runId, backend: 'nest', platform: process.platform, sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), observations: [], setupActions: [], cleanup: null, sourceFiles: [] };
const toolSources = readdirSync(import.meta.dirname).filter((name) => /^(?:fixture-|org-fixture|catalog-org|managed-environment|http-client|invoke-fixture|nest-witness|witness-)/.test(name) && /\.(?:mjs|cjs)$/.test(name) && !/\.test\.(?:mjs|cjs)$/.test(name)).map((name) => `tools/rust-r2c/${name}`);
const sourceFiles = [...toolSources, 'tools/e2e/runtime.cjs', 'package.json', 'pnpm-lock.yaml',
    'apps/poms-api/src/main.ts', 'apps/poms-api/src/app/features/platform/platform.controller.ts', 'apps/poms-api/src/app/features/platform/platform.service.ts', 'apps/poms-api/src/app/features/platform/platform.repository.ts',
    'apps/poms-api/src/app/features/platform/org-unit.entity.ts', 'apps/poms-api/src/app/features/platform/user-org-membership.entity.ts',
    'apps/poms-api/src/app/core/auth/auth-session.service.ts', 'apps/poms-api/src/app/core/auth/auth-session.repository.ts',
    'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts', 'apps/poms-api/src/app/core/runtime-audit/runtime-audit.repository.ts',
    'libs/shared/contracts/src/lib/shared-contracts.ts', 'libs/api/contracts/src/lib/auth/user.dto.ts'];
const hashes = () => sourceFiles.map((file) => ({ file, rawBytesSha256: createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex') }));
report.sourceFiles = hashes();
const orgs = new Map();
let phase = 'environment-admission';
let server;
let client;
let barrierSequence = 0;
const fixture = (action, account = 'none', session, orgSlot, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', action, account,
    ...(session ? { sessionToken: session.cookies.get('poms_session') } : {}), ...(orgSlot ? { orgSlot } : {}), ...extra });
const orgFixture = (action, slot, extra) => fixture(action, 'none', undefined, slot, extra);
const readSql = () => existsSync(sqlPath) ? parseSqlJsonl(readFileSync(sqlPath, 'utf8')) : [];
const snapshotOrgs = async (slots) => {
    const snapshots = {};
    for (const slot of [...new Set(slots)]) if (orgs.get(slot)?.orgId && !orgs.get(slot).deleted) snapshots[slot] = (await orgFixture('org-snapshot', slot)).orgSnapshot;
    return snapshots;
};
async function setup(action, slot) {
    phase = `fixture-${action}-${slot ?? 'session'}`;
    const receipt = await orgFixture(action, slot);
    if (receipt.org) orgs.set(slot, receipt.org);
    report.setupActions.push({ action, slot, receipt });
    return receipt;
}
function armBarrier(kind) {
    const plan = { formatVersion: 1, runId, barrierId: `witness-${++barrierSequence}`, kind, parties: 1 };
    writeFileSync(path.join(directory, 'barrier.json'), `${JSON.stringify(plan)}\n`, { flag: 'wx', mode: 0o600 });
    return plan;
}
function releaseBarrier(plan) {
    const file = path.join(directory, `${plan.barrierId}.release.json`);
    if (!existsSync(file)) writeFileSync(file, `${JSON.stringify({ formatVersion: 1, runId, barrierId: plan.barrierId })}\n`, { flag: 'wx', mode: 0o600 });
}
async function awaitBarrier(plan) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const hits = readSql().filter((row) => row.phase === 'barrier-hit' && row.barrierId === plan.barrierId);
        if (hits.length === plan.parties) return hits;
        assert(hits.length < plan.parties, 'Too many barrier hits');
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('R2C_BARRIER_NOT_REACHED');
}
async function observe({ id, due = false, method, route, json, createSlot, parentSlot, planCreate = true, watch = [], barrier, requireStatus }) {
    phase = id;
    if (createSlot && planCreate) {
        const planned = await orgFixture('org-plan', createSlot, parentSlot ? { parentSlot } : {});
        orgs.set(createSlot, planned.org);
    }
    await fixture(due ? 'session-due' : 'session-non-due', 'admin', client);
    const before = (await fixture('snapshot', 'admin', client)).snapshot;
    const orgBefore = await snapshotOrgs([...watch, ...(createSlot ? [createSlot] : [])]);
    const sequenceBefore = readSql().at(-1)?.sequence ?? 0;
    const observation = { id, due, method, route, input: json ?? null, startedAt: new Date().toISOString(), before, orgBefore, status: null, response: null, barrier: null };
    report.observations.push(observation);
    const plan = barrier ? armBarrier(barrier.kind) : null;
    let response;
    const request = client.request(method, route, json === undefined ? {} : { json });
    // Attach rejection handling immediately while a controlled request is held.
    const outcome = request.then((value) => ({ value }), (error) => ({ error }));
    try {
        if (plan) {
            observation.barrier = { plan, hits: await awaitBarrier(plan) };
            observation.barrier.mutation = await barrier.mutate();
            releaseBarrier(plan);
        }
        const completed = await outcome;
        if (completed.error) throw completed.error;
        response = completed.value;
        observation.status = response.status;
        observation.response = response.body;
        observation.setCookieCount = response.setCookie.length;
    } finally {
        if (plan) {
            releaseBarrier(plan);
            await outcome;
            renameSync(path.join(directory, 'barrier.json'), path.join(directory, `${plan.barrierId}.plan.json`));
        }
        if (createSlot) {
            const adopted = await orgFixture('org-adopt', createSlot);
            orgs.set(createSlot, adopted.org);
            observation.adoption = adopted;
        }
        observation.after = (await fixture('snapshot', 'admin', client)).snapshot;
        observation.orgAfter = await snapshotOrgs([...watch, ...(createSlot ? [createSlot] : [])]);
        const events = readSql().filter((row) => row.sequence > sequenceBefore);
        const analysis = analyzeSql(events);
        Object.assign(observation, { finishedAt: new Date().toISOString(), events, completedSql: analysis.completed, transactions: analysis.transactions, autocommit: analysis.autocommit,
            auditDelta: observation.after.audits.length - before.audits.length,
            sessionVersionDelta: observation.after.session.rowVersion - before.session.rowVersion,
            orgVersionDeltas: Object.fromEntries(Object.keys(observation.orgAfter).filter((slot) => orgBefore[slot]).map((slot) => [slot, observation.orgAfter[slot].org.row_version - orgBefore[slot].org.row_version])) });
    }
    assert.equal(response.setCookie.length, 0, 'Organization operation unexpectedly changed cookies');
    if (requireStatus !== undefined) assert.equal(response.status, requireStatus, `R2C_SETUP_STATUS_${id}`);
    return response;
}
async function create(slot, { parentSlot, due = false, omitOrder = false } = {}) {
    const { name, code, description, displayOrder } = orgFixtureSpec(runId, slot);
    return observe({ id: `create-${slot}-${due ? 'due' : 'non-due'}`, due, method: 'POST', route: '/api/platform/org-units', createSlot: slot, parentSlot,
        json: { name, code, description, ...(parentSlot ? { parentId: orgs.get(parentSlot).orgId } : {}), ...(omitOrder ? {} : { displayOrder }) }, requireStatus: ['utf16-name', 'utf16-code', 'order-overflow'].includes(slot) ? undefined : 201 });
}
const route = (slot, command = '') => `/api/platform/org-units/${orgs.get(slot).orgId}${command ? `:${command}` : ''}`;
const cascade = ['cascade-root', 'cascade-a', 'cascade-b', 'cascade-c', 'cascade-d', 'cascade-e'];
async function prepareCascade() {
    for (const slot of cascade) await setup(['cascade-d', 'cascade-e'].includes(slot) ? 'org-set-inactive' : 'org-set-active', slot);
}
try {
    const managed = loadManagedEnvironment({ mode: 'managed-nest' });
    report.environment = { database: managed.database, host: managed.host, port: managed.port, node: process.version, versions: { icu: process.versions.icu, cldr: process.versions.cldr } };
    await fixture('prepare');
    phase = 'build-original-nest';
    const target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
    await runtime.assertPortAvailable(target);
    const nxPackagePath = require.resolve('nx/package.json');
    const nxPackage = JSON.parse(readFileSync(nxPackagePath, 'utf8'));
    const nxBin = typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin?.nx;
    assert.equal(typeof nxBin, 'string');
    const nxEntry = path.resolve(path.dirname(nxPackagePath), nxBin);
    assert(!path.relative(path.dirname(nxPackagePath), nxEntry).startsWith('..'));
    const logPath = path.join(directory, 'server.log');
    await runtime.runOwnedCommand({ executable: process.execPath, args: [nxEntry, 'build', 'poms-api', '--skip-nx-cache'], cwd: root, env: managed.childEnv, logPath, runId, timeoutMs: 180000 });
    const binary = 'dist/apps/poms-api/main.js';
    report.originalNestBuild = { path: binary, rawBytesSha256: createHash('sha256').update(readFileSync(path.join(root, binary))).digest('hex') };
    phase = 'start-original-nest';
    server = await runtime.startOwned({ kind: 'nest', executable: process.execPath, args: ['--require', path.join(root, 'tools/rust-r2c/witness-query-preload.cjs'), path.join(root, binary)],
        cwd: root, env: { ...managed.childEnv, POMS_R2C_WITNESS_RUN_ID: runId }, host: target.host, port: target.port, readyUrl: target.readinessUrl, logPath, runId, timeoutMs: 120000 });
    report.serverIdentity = { pid: server.pid, runId, host: target.host, port: target.port };
    client = new NavigationHttpSession(target.origin, runId);
    phase = 'login';
    await client.login('admin');
    await create('main', { due: true });
    await create('second');
    for (const due of [true, false]) {
        const body = { name: `R2C dirty ${due} ${runId.slice(0, 8)}`, displayOrder: due ? 7 : 8 };
        await observe({ id: `dirty-update-${due}`, due, method: 'PATCH', route: route('main'), json: body, watch: ['main'], requireStatus: 200 });
        await observe({ id: `noop-update-${due}`, due, method: 'PATCH', route: route('main'), json: body, watch: ['main'], requireStatus: 200 });
        await observe({ id: `noop-activate-${due}`, due, method: 'POST', route: route('main', 'activate'), json: { reason: 'accepted-not-enforced', expectedVersion: 999999 }, watch: ['main'], requireStatus: 200 });
        await observe({ id: `noop-move-${due}`, due, method: 'POST', route: route('main', 'move'), json: { parentId: null, expectedVersion: 999999 }, watch: ['main'], requireStatus: 200 });
    }
    await create('child', { parentSlot: 'main', omitOrder: true });
    await create('grandchild', { parentSlot: 'child' });
    await create('inactive-parent');
    await create('inactive-child', { parentSlot: 'inactive-parent' });
    await observe({ id: 'setup-inactive-parent', method: 'POST', route: route('inactive-parent', 'deactivate'), json: {}, watch: ['inactive-parent', 'inactive-child'], requireStatus: 200 });
    const rejected = orgFixtureSpec(runId, 'sibling');
    const rejectedPlan = await orgFixture('org-plan', 'sibling', { parentSlot: 'inactive-parent' });
    orgs.set('sibling', rejectedPlan.org);
    for (const due of [true, false]) {
        await observe({ id: `inactive-parent-create-${due}`, due, method: 'POST', route: '/api/platform/org-units', createSlot: 'sibling', planCreate: false, json: { name: rejected.name, code: rejected.code, parentId: orgs.get('inactive-parent').orgId } });
        await observe({ id: `inactive-parent-move-${due}`, due, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('inactive-parent').orgId }, watch: ['main'] });
        await observe({ id: `inactive-parent-activate-${due}`, due, method: 'POST', route: route('inactive-child', 'activate'), json: { reason: 'source rejection', comment: 'request metadata', expectedVersion: 999999 }, watch: ['inactive-child'] });
        await observe({ id: `descendant-move-${due}`, due, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('grandchild').orgId, reason: 'cycle witness' }, watch: ['main', 'child', 'grandchild'] });
        await observe({ id: `self-move-${due}`, due, method: 'POST', route: route('main', 'move'), json: { parentId: orgs.get('main').orgId }, watch: ['main'] });
    }
    for (const slot of ['utf16-name', 'utf16-description', 'utf16-code', 'order-overflow']) await create(slot, { due: true });
    await observe({ id: 'update-surrogate-description', due: true, method: 'PATCH', route: route('main'), json: { description: '\ud800' }, watch: ['main'] });
    await observe({ id: 'update-surrogate-description-repeat', due: false, method: 'PATCH', route: route('main'), json: { description: '\ud800' }, watch: ['main'] });
    await observe({ id: 'update-description-restored', method: 'PATCH', route: route('main'), json: { description: null }, watch: ['main'], requireStatus: 200 });
    await observe({ id: 'update-NUL-description', due: true, method: 'PATCH', route: route('main'), json: { description: '\u0000' }, watch: ['main'] });
    await observe({ id: 'rejected-surrogate-reason', due: true, method: 'POST', route: route('inactive-child', 'activate'), json: { reason: '\ud800' }, watch: ['inactive-child'] });
    await create('nullable');
    await observe({ id: 'nullable-findAll-findOne-concurrent', due: true, method: 'PATCH', route: route('nullable'), json: { name: `R2C nullable renamed ${runId.slice(0, 8)}` }, watch: ['nullable'], barrier: { kind: 'after-org-select', mutate: () => orgFixture('org-null-description', 'nullable') } });
    for (const [name, id] of [['uppercase', orgs.get('nullable').orgId.toUpperCase()], ['compact', orgs.get('nullable').orgId.replaceAll('-', '')], ['braces', `{${orgs.get('nullable').orgId}}`], ['invalid', 'not-a-uuid'], ['missing', '00000000-0000-0000-0000-000000000000']]) {
        await observe({ id: `get-id-${name}`, method: 'GET', route: `/api/platform/org-units/${id}`, watch: ['nullable'] });
        await observe({ id: `update-id-${name}`, due: true, method: 'PATCH', route: `/api/platform/org-units/${id}`, json: { description: null }, watch: ['nullable'] });
    }
    await create('cascade-root');
    for (const slot of cascade.slice(1)) await create(slot, { parentSlot: 'cascade-root' });
    for (const [index, slot] of cascade.entries()) {
        await observe({ id: `setup-cascade-order-${slot}`, method: 'PATCH', route: route(slot), json: { displayOrder: slot === 'cascade-root' ? 50 : index * 5 }, watch: [slot], requireStatus: 200 });
        for (let count = 0; count < index; count++) await setup('org-bump-version', slot);
    }
    for (const due of [true, false]) {
        await prepareCascade();
        await observe({ id: `mixed-cascade-${due}`, due, method: 'POST', route: route('cascade-root', 'deactivate'), json: { expectedVersion: 999999, reason: 'mixed cascade' }, watch: cascade, requireStatus: 200 });
        await observe({ id: `noop-cascade-${due}`, due, method: 'POST', route: route('cascade-root', 'deactivate'), json: {}, watch: cascade, requireStatus: 200 });
    }
    for (const conflictSlot of ['cascade-a', 'cascade-b', 'cascade-root', 'cascade-d']) {
        await prepareCascade();
        await observe({ id: `cascade-version-conflict-${conflictSlot}`, due: true, method: 'POST', route: route('cascade-root', 'deactivate'), json: {}, watch: cascade,
            barrier: { kind: 'after-org-select', mutate: () => orgFixture('org-bump-version', conflictSlot) } });
    }
    await observe({ id: 'managed-session-CAS-before-update', due: true, method: 'PATCH', route: route('main'), json: { description: 'session CAS witness' }, watch: ['main'],
        barrier: { kind: 'before-managed-session-update', mutate: () => fixture('session-bump-version', 'admin', client) } });
    await create('max-order', { parentSlot: 'second' });
    const maxChild = orgFixtureSpec(runId, 'max-order');
    await observe({ id: 'default-order-overflow', due: true, method: 'POST', route: '/api/platform/org-units', createSlot: 'negative-order', parentSlot: 'second',
        json: { name: orgFixtureSpec(runId, 'negative-order').name, code: orgFixtureSpec(runId, 'negative-order').code, parentId: orgs.get('second').orgId }, watch: ['second', 'max-order'] });
    assert.equal(maxChild.displayOrder, 2147483647);
    phase = 'verify-capture-and-sources';
    const events = readSql();
    const analysis = analyzeSql(events);
    assert(!readFileSync(logPath, 'utf8').includes('R2C_SQL_CAPTURE_INCOMPLETE'));
    assert.deepEqual(hashes(), report.sourceFiles, 'Witness sources changed during the run');
    report.sql = { path: path.relative(root, sqlPath).replaceAll('\\', '/'), rawBytesSha256: createHash('sha256').update(readFileSync(sqlPath)).digest('hex'), events: events.length, queries: analysis.completed.length, transactions: analysis.transactions.length, autocommit: analysis.autocommit.length };
    report.coverage = { observedGroups: ['W01 create due/non-due', 'W02 ID variants + nullable concurrent read', 'W03 valid no-ops', 'W04 mixed cascade due/non-due', 'W05 first/middle/last dirty and inactive child version conflict', 'W07 parent/cycle/self rejects', 'W08 surrogate and NUL storage/audit boundaries', 'W10 int4/default overflow'],
        stillPending: ['W02 concurrent owned-leaf delete', 'W06 synchronized code/name races', 'W09 expanded membership fixtures', 'W10 microsecond sorting ties and historical negative default', 'W11 opposing move/parent-deactivation races'], note: 'Observed means recorded source behavior, not a Rust comparison or G3 pass.' };
    report.result = 'observed';
} catch (error) {
    report.result = 'fail';
    report.failurePhase = phase;
    report.failureReason = /^R2C_[A-Za-z0-9_-]+/.exec(error.message)?.[0] ?? error.code ?? error.name;
    process.exitCode = 1;
} finally {
    const pendingBarrier = path.join(directory, 'barrier.json');
    if (existsSync(pendingBarrier)) {
        try { const plan = JSON.parse(readFileSync(pendingBarrier, 'utf8')); releaseBarrier(plan); renameSync(pendingBarrier, path.join(directory, `${plan.barrierId}.aborted-plan.json`)); }
        catch { report.barrierRecoveryFailure = true; }
    }
    if (server) {
        try { await runtime.stopOwned(server); report.serverStopped = true; }
        catch { report.serverStopped = false; report.result = 'fail'; process.exitCode = 1; }
    }
    try {
        report.cleanup = await fixture('cleanup');
        report.zeroResidual = await fixture('cleanup');
        assert.equal(report.zeroResidual.matched, 0);
        assert.equal(report.zeroResidual.changed, 0);
    } catch (error) { report.cleanupFailure = error.code ?? error.name; report.result = 'fail'; process.exitCode = 1; }
    // A failure log is retained even if SQL completeness or startup failed.
    if (existsSync(sqlPath)) report.finalSqlReceipt = { path: path.relative(root, sqlPath).replaceAll('\\', '/'), rawBytesSha256: createHash('sha256').update(readFileSync(sqlPath)).digest('hex') };
    report.finishedAt = new Date().toISOString();
    writeFileSync(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ result: report.result, runId, failurePhase: report.failurePhase, failureReason: report.failureReason, observations: report.observations.length, output, cleanup: report.zeroResidual?.state }));
