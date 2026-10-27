import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
import { analyzeSql, parseSqlJsonl } from './witness-sql.mjs';

// A separate observed run reuses the exact original Nest build. No fixture SQL
// or arbitrary mutation crosses this runner; root owns every admitted action.
const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const { matchesBehaviorBarrier } = require('./org-behavior-query-match.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const read = (file) => readFileSync(path.join(root, file));
assert.equal(process.argv.length, 2);
assert.equal(process.platform, 'linux');
process.umask(0o077);
const output = path.join(root, 'tmp/rust-r2c/org-behavior-witness-2.json');
assert(!existsSync(output), 'Preserve prior behavior witness evidence');
const runId = randomUUID();
const directory = path.join(root, 'tmp/rust-r2c/witness', runId);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const sqlPath = path.join(directory, 'sql.jsonl');
const report = { formatVersion: 1, result: 'pending', kind: 'Independent original Nest organization behavior observation; not a Rust/G3 pass', runId, backend: 'nest', startedAt: new Date().toISOString(), sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), observations: [], fixtureReceipts: [], cleanup: null, sourceFiles: [] };
const originalBuildReceiptPath = 'tmp/rust-r2c/nest-witness.json';
const tools = readdirSync(import.meta.dirname).filter((name) => /^(?:fixture-|org-fixture|catalog-org|managed-environment|http-client|invoke-fixture|org-behavior-|witness-)/.test(name) && /\.(?:mjs|cjs)$/.test(name) && !/\.test\.(?:mjs|cjs)$/.test(name)).map((name) => `tools/rust-r2c/${name}`);
const sourceFiles = [...tools, 'tools/e2e/runtime.cjs', 'package.json', 'pnpm-lock.yaml'];
const fingerprints = () => sourceFiles.map((file) => ({ file, rawBytesSha256: sha(read(file)) }));
report.sourceFiles = fingerprints();
let phase = 'original-build-admission';
let server;
let sequence = 0;
let clients = [];
const orgs = new Map();
const fixture = (action, account = 'none', client, slot, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}), ...(slot ? { orgSlot: slot } : {}), ...extra });
async function orgFixture(action, slot, extra) {
    const receipt = await fixture(action, 'none', undefined, slot, extra);
    if (receipt.org) orgs.set(slot, receipt.org);
    if (action === 'org-delete-owned-leaf' && orgs.has(slot)) orgs.set(slot, { ...orgs.get(slot), deleted: true });
    report.fixtureReceipts.push({ action, slot, receipt });
    return receipt;
}
const orgRoute = (slot, command = '') => `/api/platform/org-units/${orgs.get(slot).orgId}${command ? `:${command}` : ''}`;
const readSql = () => existsSync(sqlPath) ? parseSqlJsonl(readFileSync(sqlPath, 'utf8')) : [];
async function snapshots(slots) {
    const values = {};
    for (const slot of [...new Set(slots)]) {
        const entry = orgs.get(slot);
        if (entry?.deleted) values[slot] = { org: null, deleted: true };
        else if (entry?.orgId) values[slot] = (await orgFixture('org-snapshot', slot)).orgSnapshot;
    }
    return values;
}
function armBarrier(kind, parties) {
    const plan = { formatVersion: 1, runId, barrierId: `behavior-${++sequence}`, kind, parties };
    writeFileSync(path.join(directory, 'barrier.json'), `${JSON.stringify(plan)}\n`, { flag: 'wx', mode: 0o600 });
    return plan;
}
function release(plan) {
    const filename = path.join(directory, `${plan.barrierId}.release.json`);
    if (!existsSync(filename)) writeFileSync(filename, `${JSON.stringify({ formatVersion: 1, runId, barrierId: plan.barrierId })}\n`, { flag: 'wx', mode: 0o600 });
}
async function awaitHits(plan) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const hits = readSql().filter((row) => row.phase === 'barrier-hit' && row.barrierId === plan.barrierId);
        assert(hits.length <= plan.parties);
        if (hits.length === plan.parties) return hits;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('R2C_BEHAVIOR_BARRIER_NOT_REACHED');
}
async function observe({ id, requests, watch = [], due = false, barrierKind, mutate, adopt = [] }) {
    phase = id;
    assert([1, 2].includes(requests.length));
    const sessions = [...new Set(requests.map((request) => request.client ?? 0))];
    for (const index of sessions) await fixture(due ? 'session-due' : 'session-non-due', 'admin', clients[index]);
    const beforeSessions = {};
    for (const index of sessions) beforeSessions[index] = (await fixture('snapshot', 'admin', clients[index])).snapshot;
    const observation = { id, startedAt: new Date().toISOString(), due, beforeSessions, orgBefore: await snapshots(watch), requests: requests.map(({ client = 0, method, route, body }) => ({ client, method, route, input: body ?? null })), barrier: null };
    report.observations.push(observation);
    const sqlBefore = readSql().at(-1)?.sequence ?? 0;
    const plan = barrierKind ? armBarrier(barrierKind, requests.length) : null;
    const outcomes = requests.map(({ client = 0, method, route, body }) => clients[client].request(method, route, body === undefined ? {} : { json: body }).then((value) => ({ value }), (error) => ({ error })));
    try {
        if (plan) {
            observation.barrier = { plan, hits: await awaitHits(plan) };
            if (mutate) observation.barrier.mutation = await mutate();
            release(plan);
        }
        const responses = await Promise.all(outcomes);
        for (const [index, response] of responses.entries()) {
            if (response.error) { observation.requests[index].transportFailure = response.error.code ?? response.error.name; throw response.error; }
            Object.assign(observation.requests[index], { status: response.value.status, response: response.value.body, setCookieCount: response.value.setCookie.length });
            assert.equal(response.value.setCookie.length, 0);
        }
    } finally {
        if (plan) {
            release(plan);
            await Promise.all(outcomes);
            renameSync(path.join(directory, 'barrier.json'), path.join(directory, `${plan.barrierId}.plan.json`));
        }
        for (const slot of adopt) await orgFixture('org-adopt', slot);
        observation.afterSessions = {};
        for (const index of sessions) observation.afterSessions[index] = (await fixture('snapshot', 'admin', clients[index])).snapshot;
        observation.orgAfter = await snapshots([...watch, ...adopt]);
        observation.events = readSql().filter((row) => row.sequence > sqlBefore);
        const analysis = analyzeSql(observation.events);
        Object.assign(observation, { completedSql: analysis.completed, transactions: analysis.transactions, autocommit: analysis.autocommit, finishedAt: new Date().toISOString() });
    }
    return observation;
}
const request = (method, route, body, client = 0) => ({ method, route, body, client });
async function create(slot, { parentSlot, omitOrder = false } = {}) {
    await orgFixture('org-plan', slot, parentSlot ? { parentSlot } : {});
    const { name, code, description, displayOrder } = orgFixtureSpec(runId, slot);
    const result = await observe({ id: `setup-create-${slot}`, requests: [request('POST', '/api/platform/org-units', { name, code, description, ...(omitOrder ? {} : { displayOrder }), ...(parentSlot ? { parentId: orgs.get(parentSlot).orgId } : {}) })], adopt: [slot] });
    assert.equal(result.requests[0].status, 201);
    assert(orgs.get(slot).orgId);
}
function flatten(nodes) { return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]); }
try {
    const previousBytes = read(originalBuildReceiptPath);
    const previous = JSON.parse(previousBytes.toString('utf8'));
    assert(previous.originalNestBuild && previous.backend === 'nest', 'Need a recorded original Nest build');
    assert.equal(sha(read(previous.originalNestBuild.path)), previous.originalNestBuild.rawBytesSha256, 'Original Nest binary changed');
    const originalSources = previous.sourceFiles.filter(({ file }) => /^(?:apps\/poms-api\/src\/|libs\/(?:api\/contracts|shared\/contracts)\/|package\.json$|pnpm-lock\.yaml$)/.test(file));
    assert(originalSources.length >= 10);
    for (const source of originalSources) assert.equal(sha(read(source.file)), source.rawBytesSha256, `Original build source changed: ${source.file}`);
    for (const file of ['tools/rust-r2c/witness-query-core.cjs', 'tools/rust-r2c/witness-sql.mjs']) {
        const captured = previous.sourceFiles.find((source) => source.file === file);
        assert(captured && sha(read(file)) === captured.rawBytesSha256, 'Original capture/analyzer source changed');
    }
    const earlierCas = previous.observations.find((observation) => observation.id === 'managed-session-CAS-before-update');
    assert(earlierCas?.barrier?.hits?.length === 1);
    assert(!matchesBehaviorBarrier('before-managed-session-update', 'before', earlierCas.barrier.hits[0]), 'The corrective witness must not reclassify raw touch as managed CAS');
    report.evidenceCorrection = { priorRunId: previous.runId, priorReportRawBytesSha256: sha(previousBytes), observationId: earlierCas.id, hitSequence: earlierCas.barrier.hits[0].sequence, actualHitSqlShape: earlierCas.barrier.hits[0].sqlShape,
        observedStatus: earlierCas.status, observedSessionVersionDelta: earlierCas.sessionVersionDelta, classification: 'Original observed trace preserved; pause hit raw touch before its RETURNING, so this case did not exercise late managed-session CAS. New strict-WHERE witness records the missing condition.' };
    report.sourceFiles.push(...originalSources.filter((source) => !sourceFiles.includes(source.file)));
    report.originalNestBuild = { ...previous.originalNestBuild, reused: true, receipt: originalBuildReceiptPath, receiptRawBytesSha256: sha(previousBytes), buildRunId: previous.runId };
    const managed = loadManagedEnvironment({ mode: 'managed-nest' });
    report.environment = { database: managed.database, host: managed.host, port: managed.port, node: process.version };
    phase = 'fixture-prepare';
    await fixture('prepare');
    const target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
    await runtime.assertPortAvailable(target);
    phase = 'start-original-nest';
    const logPath = path.join(directory, 'server.log');
    server = await runtime.startOwned({ kind: 'nest', executable: process.execPath, args: ['--require', path.join(root, 'tools/rust-r2c/org-behavior-query-preload.cjs'), path.join(root, previous.originalNestBuild.path)], cwd: root,
        env: { ...managed.childEnv, POMS_R2C_WITNESS_RUN_ID: runId }, host: target.host, port: target.port, readyUrl: target.readinessUrl, logPath, runId, timeoutMs: 120000 });
    clients = [new NavigationHttpSession(target.origin, runId), new NavigationHttpSession(target.origin, runId)];
    phase = 'independent-admin-sessions';
    for (const client of clients) await client.login('admin');
    report.independentSessionCount = 2;

    // W02: a canonical identity-map lookup and a DB UUID alias after deletion.
    for (const [slot, alias] of [['nullable', false], ['org-cas', true]]) {
        await create(slot);
        const id = orgs.get(slot).orgId;
        await observe({ id: `W02-owned-leaf-delete-${alias ? 'uppercase' : 'canonical'}`, due: true, requests: [request('PATCH', `/api/platform/org-units/${alias ? id.toUpperCase() : id}`, { name: `R2C deleted ${slot}` })], watch: [slot],
            barrierKind: 'after-org-select', mutate: () => orgFixture('org-delete-owned-leaf', slot) });
    }
    await create('unicode');
    await observe({ id: 'W02-setup-alias-nonnull-description', requests: [request('PATCH', orgRoute('unicode'), { description: 'non-null before alias refresh' })], watch: ['unicode'] });
    await observe({ id: 'W02-uppercase-alias-nullable-merge', due: true, requests: [request('PATCH', `/api/platform/org-units/${orgs.get('unicode').orgId.toUpperCase()}`, { name: `R2C alias nullable ${runId.slice(0, 8)}` })], watch: ['unicode'], barrierKind: 'after-org-select', mutate: () => orgFixture('org-null-description', 'unicode') });
    await create('session-cas');
    await observe({ id: 'W05-corrected-managed-session-CAS', due: true, requests: [request('PATCH', orgRoute('session-cas'), { description: 'late managed version conflict' })], watch: ['session-cas'], barrierKind: 'before-managed-session-update', mutate: () => fixture('session-bump-version', 'admin', clients[0]) });
    await create('cascade-root');
    for (const slot of ['cascade-a', 'cascade-b', 'cascade-c', 'cascade-d', 'cascade-e']) await create(slot, { parentSlot: 'cascade-root' });
    await orgFixture('org-set-inactive', 'cascade-d'); await orgFixture('org-set-inactive', 'cascade-e');
    await observe({ id: 'W05-between-version-precheck-and-batch-update', due: true, requests: [request('POST', orgRoute('cascade-root', 'deactivate'), {})], watch: ['cascade-root', 'cascade-a', 'cascade-b', 'cascade-c', 'cascade-d', 'cascade-e'], barrierKind: 'after-org-version-precheck', mutate: () => orgFixture('org-bump-version', 'cascade-b') });

    // W06: existing stable UUID ownership allows code and name to be mutable.
    await create('race-code-a'); await create('race-code-b');
    const sharedCode = `r2c_${runId.replaceAll('-', '')}_shared_code`;
    await observe({ id: 'W06-concurrent-code-replacement', requests: [request('PATCH', orgRoute('race-code-a'), { code: sharedCode }, 0), request('PATCH', orgRoute('race-code-b'), { code: sharedCode }, 1)], watch: ['race-code-a', 'race-code-b'], barrierKind: 'after-org-code-select' });
    await create('race-name-a'); await create('race-name-b');
    const sharedName = `R2C shared sibling ${runId.slice(0, 8)}`;
    await observe({ id: 'W06-concurrent-sibling-rename', requests: [request('PATCH', orgRoute('race-name-a'), { name: sharedName }, 0), request('PATCH', orgRoute('race-name-b'), { name: sharedName }, 1)], watch: ['race-name-a', 'race-name-b'], barrierKind: 'after-org-select' });

    // W09: root's narrow journaled fixture owns every row in this matrix.
    await create('main'); await create('child', { parentSlot: 'main' });
    await create('grandchild', { parentSlot: 'child' }); await create('inactive-child', { parentSlot: 'main' });
    await observe({ id: 'W09-setup-inactive-direct-child', requests: [request('POST', orgRoute('inactive-child', 'deactivate'), {})], watch: ['main', 'inactive-child'] });
    await orgFixture('org-membership-matrix', 'main');
    for (const inactive of [false, true]) {
        if (inactive) await observe({ id: 'W09-deactivate-preserve-memberships', requests: [request('POST', orgRoute('main', 'deactivate'), {})], watch: ['main', 'child', 'grandchild', 'inactive-child'] });
        await observe({ id: `W09-membership-counts-${inactive ? 'inactive' : 'active'}`, requests: [request('GET', orgRoute('main')), request('GET', '/api/platform/org-unit-tree', undefined, 1)], watch: ['main', 'child', 'grandchild', 'inactive-child'] });
    }
    await observe({ id: 'W02-uppercase-alias-parent-null-merge', requests: [request('PATCH', `/api/platform/org-units/${orgs.get('child').orgId.toUpperCase()}`, { name: `R2C alias parent ${runId.slice(0, 8)}` })], watch: ['main', 'child', 'grandchild'], barrierKind: 'after-org-select', mutate: async () => {
        const response = await clients[1].request('POST', orgRoute('child', 'move'), { json: { parentId: null } });
        assert.equal(response.status, 200, 'R2C_ALIAS_PARENT_MUTATION_STATUS');
        assert.equal(response.setCookie.length, 0);
        return { status: response.status, response: response.body };
    } });

    // W10: native microseconds and JS millisecond ties must stay distinguishable.
    for (const slot of ['tie-a', 'tie-b', 'tie-c', 'tie-d']) await create(slot);
    const tieFixture = await orgFixture('org-sort-ties', 'tie-a');
    const tieRead = await observe({ id: 'W10-native-time-versus-tree-collation', requests: [request('GET', '/api/platform/org-units'), request('GET', '/api/platform/org-unit-tree', undefined, 1)], watch: ['tie-a', 'tie-b', 'tie-c', 'tie-d'] });
    const tieIds = new Set(['tie-a', 'tie-b', 'tie-c', 'tie-d'].map((slot) => orgs.get(slot).orgId));
    tieRead.actualTieOrders = { flat: tieRead.requests[0].response.filter((node) => tieIds.has(node.id)).map((node) => node.id), tree: flatten(tieRead.requests[1].response).filter((node) => tieIds.has(node.id)).map((node) => node.id), fixtureReceipt: tieFixture };
    await create('max-order'); await create('negative-order', { parentSlot: 'max-order' });
    await orgFixture('org-negative-order', 'negative-order');
    await create('negative-default', { parentSlot: 'max-order', omitOrder: true });
    await observe({ id: 'W10-negative-history-default', requests: [request('GET', orgRoute('negative-default'))], watch: ['max-order', 'negative-order', 'negative-default'] });

    // W11: these source snapshots do not promise recursive DB constraints or
    // serialization. Concurrent outcomes, including deadlock, stay observed.
    await create('second'); await create('sibling');
    await observe({ id: 'W11-opposing-moves', requests: [request('POST', orgRoute('second', 'move'), { parentId: orgs.get('sibling').orgId }, 0), request('POST', orgRoute('sibling', 'move'), { parentId: orgs.get('second').orgId }, 1)], watch: ['second', 'sibling'], barrierKind: 'after-org-select' });
    await observe({ id: 'W11-tree-after-opposing-moves', requests: [request('GET', '/api/platform/org-unit-tree')], watch: ['second', 'sibling'] });
    await create('ui-root'); await create('ui-target');
    await observe({ id: 'W11-move-versus-parent-deactivation', requests: [request('POST', orgRoute('ui-root', 'move'), { parentId: orgs.get('ui-target').orgId }, 0), request('POST', orgRoute('ui-target', 'deactivate'), {}, 1)], watch: ['ui-root', 'ui-target'], barrierKind: 'after-org-select' });
    await create('inactive-parent');
    await orgFixture('org-plan', 'ui-child', { parentSlot: 'inactive-parent' });
    const childSpec = orgFixtureSpec(runId, 'ui-child');
    await observe({ id: 'W11-create-versus-parent-deactivation', requests: [request('POST', '/api/platform/org-units', { name: childSpec.name, code: childSpec.code, description: childSpec.description, displayOrder: childSpec.displayOrder, parentId: orgs.get('inactive-parent').orgId }, 0), request('POST', orgRoute('inactive-parent', 'deactivate'), {}, 1)], watch: ['inactive-parent'], adopt: ['ui-child'], barrierKind: 'after-org-select' });

    phase = 'verify-sql-and-source-completeness';
    const events = readSql();
    const analysis = analyzeSql(events);
    assert(!readFileSync(logPath, 'utf8').includes('R2C_SQL_CAPTURE_INCOMPLETE'));
    assert.deepEqual(fingerprints(), report.sourceFiles.slice(0, sourceFiles.length), 'Behavior witness dependencies changed during execution');
    for (const source of originalSources) assert.equal(sha(read(source.file)), source.rawBytesSha256);
    assert.equal(sha(read(previous.originalNestBuild.path)), previous.originalNestBuild.rawBytesSha256);
    report.sql = { path: path.relative(root, sqlPath).replaceAll('\\', '/'), rawBytesSha256: sha(readFileSync(sqlPath)), events: events.length, queries: analysis.completed.length, transactions: analysis.transactions.length };
    report.coverage = { groups: ['W02 canonical/alias deleted leaf and alias nullable/parent refresh', 'W05 corrected managed-session CAS and unlocked batch precheck window', 'W06 same-code and sibling-name replacement races', 'W09 status-only active membership counts and inactive users/orgs', 'W10 microsecond ties and negative default order', 'W11 opposing moves and parent-deactivation races'], limitations: ['This is a finite original Nest witness, not a proof of all concurrent schedules.', 'No Rust/HTTP parity or G3 acceptance is established.', 'No arbitrary SQL, broad fault injection or non-run fixture mutation is authorized.'] };
    report.result = 'observed';
} catch (error) {
    report.result = 'fail'; report.failurePhase = phase; report.failureReason = /^R2C_[A-Za-z0-9_-]+/.exec(error.message)?.[0] ?? error.code ?? error.name; process.exitCode = 1;
} finally {
    const active = path.join(directory, 'barrier.json');
    if (existsSync(active)) { try { const plan = JSON.parse(readFileSync(active, 'utf8')); release(plan); renameSync(active, path.join(directory, `${plan.barrierId}.aborted-plan.json`)); } catch { report.barrierRecoveryFailure = true; } }
    if (server) { try { await runtime.stopOwned(server); report.serverStopped = true; } catch { report.serverStopped = false; report.result = 'fail'; process.exitCode = 1; } }
    try { report.cleanup = await fixture('cleanup'); report.zeroResidual = await fixture('cleanup'); assert.equal(report.zeroResidual.matched, 0); assert.equal(report.zeroResidual.changed, 0); }
    catch (error) { report.cleanupFailure = error.code ?? error.name; report.result = 'fail'; process.exitCode = 1; }
    if (existsSync(sqlPath)) report.finalSqlReceipt = { path: path.relative(root, sqlPath).replaceAll('\\', '/'), rawBytesSha256: sha(readFileSync(sqlPath)) };
    report.finishedAt = new Date().toISOString();
    writeFileSync(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ result: report.result, runId, failurePhase: report.failurePhase, failureReason: report.failureReason, observations: report.observations.length, output, cleanup: report.zeroResidual?.state }));
