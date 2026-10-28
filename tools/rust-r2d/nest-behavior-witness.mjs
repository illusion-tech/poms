import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
import { sourceHead, g1BaselineSha256, planSha256, witnessCases, witnessPlanManifest } from './nest-witness-plan.mjs';
import { analyzeSql, parseSqlJsonl } from '../rust-r2c/witness-sql.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { userFixtureSpec, parseFixtureRequest } = require('./fixture-protocol.cjs');
const { validateSource } = require('./fixture-guard.mjs');
const { validateBarrierPlan, resolveWitnessDirectory } = require('./user-query-preload.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const missingUuid = '00000000-0000-0000-0000-000000000000';
const coreGroups = new Set(['W02', 'W04', 'W05', 'W07', 'W08']);
const destructive = new Set(['W04-roles-deleted-after-check', 'W05-org-deleted-after-check']);
export const coreCaseIds = Object.freeze(witnessCases.filter((row) => coreGroups.has(row.group) && !destructive.has(row.id)).map((row) => row.id));
export const implementedCaseIds = Object.freeze(witnessCases.filter((row) => coreGroups.has(row.group)).map((row) => row.id));

export function behaviorRunnerManifest() {
    return { formatVersion: 1, witnessPlan: witnessPlanManifest(), coreCaseIds, implementedCaseIds,
        pendingCaseIds: witnessCases.filter((row) => !implementedCaseIds.includes(row.id)).map((row) => row.id),
        execution: 'Explicit --run --selection core --tag <unique> or --run --case <implemented-id> --tag <unique>',
        reportBoundary: 'Partial original Nest observation only. W01 and unimplemented groups remain separate; no complete-plan, parity or G3 Pass.',
        destructiveBoundary: 'Each delete case must be the sole case in a fresh run, before alpha is referenced. Never delete historical evidence to pass the reference guard.' };
}

export function parseBehaviorOptions(args) {
    if (args.length === 1 && args[0] === '--plan') return { mode: 'plan' };
    if (args[0] !== '--run' || args.length !== 5 || args[3] !== '--tag' || !/^[a-z][a-z0-9-]{0,30}$/.test(args[4] ?? '')) throw new Error('Use --plan or --run --selection core|--case <id> --tag <unique>');
    let selected;
    if (args[1] === '--selection' && args[2] === 'core') selected = [...coreCaseIds];
    else if (args[1] === '--case' && implementedCaseIds.includes(args[2])) selected = [args[2]];
    else throw new Error('Unknown or unimplemented witness selection');
    assert(selected.length && (!selected.some((id) => destructive.has(id)) || selected.length === 1));
    return { mode: 'run', tag: args[4], selectedCaseIds: selected };
}

// Record HTTP completion independently of barrier success. A failed observer
// must still preserve a response that may have committed business state.
export async function captureWitnessObservation({ observation, request, plan, sendRequest, waitBarrier, mutate, release, archiveBarrier, captureAfter, captureSession, captureEvents, analyze = analyzeSql }) {
    const descriptor = { method: request.method, path: request.path, input: request.json ?? null, status: null, response: null };
    observation.requests.push(descriptor);
    if (plan) observation.barrier = { plan, hits: [], phase: 'await-hits' };
    const pending = Promise.resolve().then(sendRequest).then((response) => {
        Object.assign(descriptor, { status: response.status, response: response.body, setCookieCount: response.setCookie.length, settledAt: new Date().toISOString() });
        return { response };
    }, (error) => {
        descriptor.transportError = { name: error.name, ...(typeof error.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.code) ? { code: error.code } : {}) };
        descriptor.settledAt = new Date().toISOString(); return { error };
    });
    let firstError, stage = plan ? 'barrier-wait' : 'http-response';
    observation.captureErrors = [];
    const failed = (error, phase) => {
        firstError ??= error; observation.failurePhase ??= phase;
        observation.captureErrors.push({ phase, name: error.name });
        if (plan && phase.startsWith('barrier-')) observation.barrier.failure = { phase, name: error.name };
    };
    try {
        if (plan) {
            observation.barrier.hits = await waitBarrier(plan); observation.barrier.phase = 'mutation';
            stage = 'barrier-mutation'; observation.barrier.mutationStartedAt = new Date().toISOString();
            observation.barrier.mutationReceipt = await mutate(); observation.barrier.mutationFinishedAt = new Date().toISOString();
            stage = 'barrier-release'; release(plan); observation.barrier.phase = 'released';
        }
        stage = 'http-response'; const outcome = await pending; if (outcome.error) throw outcome.error;
    } catch (error) { failed(error, stage); }
    finally {
        if (plan) {
            try { release(plan); } catch (error) { failed(error, 'barrier-release-finally'); }
            await pending;
            try { archiveBarrier(plan); } catch (error) { failed(error, 'barrier-archive'); }
        } else await pending;
        for (const [key, capture, phase] of [['after', captureAfter, 'after-facts'], ['sessionAfter', captureSession, 'session-after'], ['events', captureEvents, 'sql-events']]) {
            try { observation[key] = await capture(); } catch (error) { failed(error, phase); }
        }
        try { assert(Array.isArray(observation.events)); const analysis = analyze(observation.events); observation.transactions = analysis.transactions; observation.autocommit = analysis.autocommit; }
        catch (error) { failed(error, 'sql-analysis'); }
        observation.result = firstError ? 'capture-incomplete' : 'observed'; observation.finishedAt = new Date().toISOString();
    }
    if (firstError) throw firstError;
    return observation;
}

function identity(pid) {
    assert(Number.isSafeInteger(pid) && pid > 0);
    const raw = readFileSync(`/proc/${pid}/stat`, 'utf8'), fields = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
    const result = { pid: Number(raw.slice(0, raw.indexOf(' '))), startTicks: fields[19] };
    assert.equal(result.pid, pid); assert(/^[0-9]+$/.test(result.startTicks) && BigInt(result.startTicks) > 0n);
    return result;
}

function runtimeSources() {
    const files = ['docs/design/rust-r2d-users-profile-baseline.md', 'libs/shared/api-spec/openapi.json', 'package.json', 'pnpm-lock.yaml',
        'tools/e2e/runtime.cjs', 'tools/e2e/runtime-worker.cjs', 'tools/rust-r2c/witness-query-core.cjs', 'tools/rust-r2c/witness-sql.mjs', 'tools/rust-r2c/catalog-org-units.mjs',
        'tmp/rust-r2d/nest-create-witness01.json'];
    for (const name of readdirSync(path.join(root, 'tools/rust-r2d'))) {
        if (/^(?:fixture(?:[.-])|invoke-fixture\.|managed-environment\.|catalog-users\.|http-client\.|user-query-|nest-witness-plan\.|nest-behavior-witness\.)/.test(name) && /\.(?:cjs|mjs)$/.test(name)) files.push(`tools/rust-r2d/${name}`);
    }
    function walk(folder) {
        for (const item of readdirSync(path.join(root, folder), { withFileTypes: true })) {
            const file = `${folder}/${item.name}`;
            if (item.isDirectory()) walk(file);
            else if (item.isFile() && /\.ts$/.test(file)) files.push(file);
            else assert(!item.isSymbolicLink(), 'Protected source cannot be a symlink');
        }
    }
    for (const folder of ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'libs/vendor/nestjs-zod/src']) walk(folder);
    return [...new Set(files)].sort();
}

export function behaviorRecipe(id, context) {
    const { adminId, adminRole, targetId, targetSlot, role, org, viewerOrg, inactiveRole, inactiveOrg, runId, index } = context;
    const result = { request: null, setup: [], barrier: null, mutation: null, due: true };
    const userAction = (action) => ({ action, userSlot: targetSlot });
    const contact = { displayName: `R2D ${id} ${runId.slice(0, 8)}`, email: `u${index}@example.test`, phone: `555${String(index).padStart(3, '0')}` };
    if (id.startsWith('W02-')) {
        const self = id.includes('-self-'), route = self ? '/api/auth/profile' : `/api/platform/users/${targetId}`;
        result.setup.push(userAction('user-profile-values'));
        if (id.includes('verified-contacts') || id.includes('clear-contacts')) result.setup.push(userAction(id.includes('unverified') ? 'user-profile-unverified' : 'user-profile-verified'));
        let body = id.endsWith('-empty') ? {} : id.endsWith('-unchanged') ? 'same-profile' : id.includes('clear-contacts') ? { email: null, phone: null, ...(self ? {} : { avatarUrl: null }) } : contact;
        if (id.endsWith('-avatar-overflow')) body = { avatarUrl: `https://example.test/${'x'.repeat(600)}` };
        result.request = { method: 'PATCH', path: route, json: body };
    } else if (id.startsWith('W04-')) {
        if (!destructive.has(id)) result.setup.push(userAction('user-role-matrix'));
        const roleIds = id.endsWith('-empty') ? [] : id.endsWith('-duplicate') ? [role, role] : id.endsWith('-missing') ? [missingUuid] : id.endsWith('-inactive') ? [inactiveRole] : [role];
        result.request = { method: 'PUT', path: `/api/platform/users/${targetId}/roles`, json: { roleIds, expectedVersion: 999999, reason: 'ignored original command field' } };
        if (destructive.has(id)) {
            result.barrier = { kind: 'after-roles-by-ids-select', targetRoleId: role };
            result.mutation = { action: 'role-delete-owned', roleSlot: 'alpha' };
        }
    } else if (id.startsWith('W05-')) {
        if (!destructive.has(id)) {
            result.setup.push({ http: { method: 'PUT', path: `/api/platform/users/${targetId}/org-memberships`, json: { primaryOrgUnitId: viewerOrg, secondaryOrgUnitIds: [] } } }, userAction('user-membership-matrix'));
        }
        const primary = id.endsWith('-same-primary') || id.endsWith('-duplicate') ? viewerOrg : id.endsWith('-missing') ? missingUuid : id.endsWith('-inactive') ? inactiveOrg : org;
        result.request = { method: 'PUT', path: `/api/platform/users/${targetId}/org-memberships`, json: { primaryOrgUnitId: primary,
            secondaryOrgUnitIds: id.endsWith('-duplicate') ? [primary] : primary === org && !destructive.has(id) ? [viewerOrg] : primary === viewerOrg ? [org] : [], expectedVersion: 999999 } };
        if (id.endsWith('-version-after-delete')) {
            result.barrier = { kind: 'after-org-memberships-delete', targetUserId: targetId }; result.mutation = userAction('user-bump-version');
        } else if (destructive.has(id)) {
            result.barrier = { kind: 'after-orgs-list-select' }; result.mutation = { action: 'org-delete-owned', orgSlot: 'alpha' };
        }
    } else if (id.startsWith('W07-')) {
        const toNull = id.endsWith('-value-to-null');
        result.setup.push(userAction(toNull ? 'user-nullable-values-no-version' : 'user-nullable-null-no-version'));
        result.request = { method: 'PATCH', path: targetSlot === 'admin' ? '/api/auth/profile' : `/api/platform/users/${targetId}`, json: { displayName: contact.displayName } };
        result.barrier = { kind: 'after-user-by-id-select', targetUserId: adminId };
        result.mutation = userAction(toNull ? 'user-nullable-null-no-version' : 'user-nullable-values-no-version');
    } else if (id.startsWith('W08-')) {
        const paths = { 'W08-read-profile': '/api/auth/profile', 'W08-read-users': '/api/platform/users', 'W08-read-detail': `/api/platform/users/${targetId}`,
            'W08-read-owner-reference': '/api/platform/owner-reference', 'W08-read-early-role': '/api/auth/profile', 'W08-read-org-refresh': `/api/platform/users/${targetId}` };
        result.request = { method: 'GET', path: paths[id] };
        if (id.endsWith('-early-role')) {
            result.barrier = { kind: 'after-roles-by-ids-select', targetRoleId: adminRole }; result.mutation = { action: 'role-set-inactive', roleSlot: 'admin' };
        } else if (id.endsWith('-org-refresh')) {
            result.setup.push(userAction('user-membership-matrix'));
            result.barrier = { kind: 'after-orgs-list-select' }; result.mutation = { action: 'org-set-values', orgSlot: 'alpha' };
        } else {
            result.setup.push(userAction('user-nullable-null-no-version'));
            result.barrier = { kind: 'after-user-by-id-select', targetUserId: id.endsWith('-detail') ? targetId : adminId };
            result.mutation = userAction('user-nullable-values-no-version');
        }
    }
    assert(result.request, `Recipe not implemented: ${id}`);
    return result;
}

export async function runBehaviorWitness({ tag, selectedCaseIds }) {
    assert.equal(process.platform, 'linux'); assert.equal(realpathSync(process.cwd()), realpathSync(root));
    assert(/^[a-z][a-z0-9-]{0,30}$/.test(tag)); assert(selectedCaseIds.length && selectedCaseIds.every((id) => implementedCaseIds.includes(id)));
    assert(!selectedCaseIds.some((id) => destructive.has(id)) || selectedCaseIds.length === 1);
    process.umask(0o077);
    const output = path.join(root, `tmp/rust-r2d/nest-behavior-${tag}.json`); assert(!existsSync(output), 'Never overwrite a previous observation');
    const runId = randomUUID(), directory = path.join(root, 'tmp/rust-r2d/witness', runId);
    mkdirSync(directory, { recursive: true, mode: 0o700 }); resolveWitnessDirectory(root, runId);
    const sqlPath = path.join(directory, 'sql.jsonl');
    const report = { formatVersion: 1, result: 'pending', kind: 'original-nest-partial-observation', backend: 'nest', runId, sourceHead, tag,
        witnessPlan: witnessPlanManifest(), selection: selectedCaseIds, observations: [], setupActions: [], cleanup: [], startedAt: new Date().toISOString(),
        boundary: 'Selected original Nest observations only; no full73-case coverage, Rust equivalence, G3 or G4 assertion' };
    const sourceFiles = runtimeSources(), hashes = () => sourceFiles.map((file) => ({ file, rawSha256: sha(readFileSync(path.join(root, file))) }));
    report.sourcesBefore = hashes();
    for (const file of sourceFiles) { const target = path.join(directory, 'sources', file); mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 }); writeFileSync(target, readFileSync(path.join(root, file)), { flag: 'wx', mode: 0o600 }); }
    const readSql = (live = false) => {
        if (!existsSync(sqlPath)) return [];
        let text = readFileSync(sqlPath, 'utf8'); if (live && !text.endsWith('\n')) text = text.slice(0, text.lastIndexOf('\n') + 1);
        return parseSqlJsonl(text);
    };
    let fixtureJournal, server, client, prepareAttempted = false, phase = 'source-admission', barrierSequence = 0, nextSlot = 0;
    const fixture = (action, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', action, account: 'none', ...extra });
    const sessionFixture = (action) => fixture(action, { account: 'admin', sessionToken: client.cookies.get('poms_session') });
    const userBySlot = (slot) => slot === 'admin' ? fixtureJournal.accounts.find((row) => row.account === 'admin') : fixtureJournal.users.find((row) => row.slot === slot);
    async function setupFixture(action, extra = {}) {
        const receipt = await fixture(action, extra); report.setupActions.push({ action, ...extra, receipt }); return receipt;
    }
    async function minimalUser() {
        const slot = `u${String(nextSlot++).padStart(3, '0')}`, spec = userFixtureSpec(runId, slot);
        await setupFixture('user-plan', { userSlot: slot });
        const body = { username: spec.username, displayName: spec.displayName, primaryOrgUnitId: null, initialRoleIds: [] };
        const response = await client.request('POST', '/api/platform/users', { json: body });
        report.setupActions.push({ method: 'POST', path: '/api/platform/users', body, status: response.status, response: response.body });
        const adoption = await setupFixture('user-adopt', { userSlot: slot });
        assert.equal(response.status, 201, 'Observed W01 empty-relation creation is required for a real HTTP target');
        assert(adoption.user.userId); fixtureJournal = (await fixture('facts')).fixture; report.fixture = fixtureJournal;
        return slot;
    }
    async function waitHits(plan) {
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {
            const hits = readSql(true).filter((row) => row.phase === 'barrier-hit' && row.barrierId === plan.barrierId);
            assert(hits.length <= plan.parties, 'Extra barrier participant');
            if (hits.length === plan.parties) {
                for (const hit of hits) {
                    assert.equal(hit.workerPid, report.owner.capture.workerIdentity.pid); assert.equal(hit.workerStartTicks, report.owner.capture.workerIdentity.startTicks);
                    assert.equal(hit.barrierKind, plan.kind); assert.equal(hit.barrierProof.caseId, plan.caseId); assert.equal(hit.barrierProof.planSha256, planSha256);
                    assert.deepEqual(hit.barrierProof.targets, Object.fromEntries(Object.entries(plan).filter(([key]) => key.startsWith('target'))));
                    assert.equal(hit.captureIncomplete, false);
                }
                return hits;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('R2D_BARRIER_NOT_REACHED');
    }
    function release(plan) {
        const file = path.join(directory, `${plan.barrierId}.release.json`);
        if (!existsSync(file)) writeFileSync(file, `${JSON.stringify({ formatVersion: 1, runId, barrierId: plan.barrierId })}\n`, { flag: 'wx', mode: 0o600 });
    }
    function assertOwnedPlan(plan) {
        const users = [...fixtureJournal.accounts.map((row) => row.userId), ...fixtureJournal.users.map((row) => row.userId).filter(Boolean)];
        if (plan.targetUserId) assert(users.includes(plan.targetUserId), 'Barrier user not in this run journal');
        if (plan.targetRoleId) assert(fixtureJournal.roles.some((row) => row.id === plan.targetRoleId), 'Barrier role not in this run journal');
        if (plan.targetOrgId) assert(fixtureJournal.orgs.some((row) => row.id === plan.targetOrgId), 'Barrier org not in this run journal');
    }
    async function observe(item, scenario) {
        await sessionFixture(scenario.due ? 'session-due' : 'session-non-due');
        const before = await fixture('facts'), sessionBefore = (await sessionFixture('snapshot')).snapshot;
        const sequenceBefore = readSql().at(-1)?.sequence ?? 0;
        const observation = { id: item.id, group: item.group, result: 'pending', startedAt: new Date().toISOString(), before: before.facts, sessionBefore, requests: [], barrier: null };
        report.observations.push(observation);
        const plan = scenario.barrier ? validateBarrierPlan({ formatVersion: 1, runId, barrierId: `behavior-${++barrierSequence}`, caseId: item.id, planSha256,
            parties: 1, skipMatches: 0, ...scenario.barrier }, runId) : null;
        if (plan) { assertOwnedPlan(plan); writeFileSync(path.join(directory, 'barrier.json'), `${JSON.stringify(plan)}\n`, { flag: 'wx', mode: 0o600 }); }
        const request = scenario.request;
        await captureWitnessObservation({ observation, request, plan,
            sendRequest: () => client.request(request.method, request.path, request.json === undefined ? {} : { json: request.json }),
            waitBarrier: waitHits,
            mutate: () => fixture(scenario.mutation.action, Object.fromEntries(Object.entries(scenario.mutation).filter(([key]) => key !== 'action'))),
            release, archiveBarrier: (value) => renameSync(path.join(directory, 'barrier.json'), path.join(directory, `${value.barrierId}.plan.json`)),
            captureAfter: async () => (await fixture('facts')).facts, captureSession: async () => (await sessionFixture('snapshot')).snapshot,
            captureEvents: () => readSql().filter((row) => row.sequence > sequenceBefore) });
    }
    try {
        validateSource(); assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHead);
        assert.equal(sha(readFileSync(path.join(root, 'docs/design/rust-r2d-users-profile-baseline.md'))), g1BaselineSha256);
        const previousBytes = readFileSync(path.join(root, 'tmp/rust-r2d/nest-create-witness01.json')), previous = JSON.parse(previousBytes);
        assert.equal(previous.result, 'observed-partial'); assert.equal(previous.sourceHead, sourceHead); assert.equal(previous.sourcesUnchanged, true);
        assert(previous.owner.aliveAfter && previous.owner.stopped && previous.binary.sha256 === previous.binary.afterSha256);
        assert(previous.observations.some((row) => row.id === 'W01-create-none' && row.status === 201));
        report.binary = { file: 'dist/apps/poms-api/main.js', sha256: sha(readFileSync(path.join(root, 'dist/apps/poms-api/main.js'))), reused: true,
            buildReceipt: 'tmp/rust-r2d/nest-create-witness01.json', buildReceiptSha256: sha(previousBytes), buildRunId: previous.runId };
        assert.equal(report.binary.sha256, previous.binary.sha256, 'Original Nest artifact changed');
        writeFileSync(path.join(directory, 'original-nest-main.js'), readFileSync(path.join(root, report.binary.file)), { flag: 'wx', mode: 0o600 });
        const managed = loadManagedEnvironment({ mode: 'managed-nest' }), target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
        report.environment = { database: managed.database, origin: target.origin, node: process.version }; await runtime.assertPortAvailable(target);
        phase = 'fixture-prepare'; prepareAttempted = true; fixtureJournal = (await fixture('prepare')).fixture; report.fixture = fixtureJournal;
        // These exact fixed commands are validated before any observed HTTP work.
        for (const action of ['user-profile-values', 'user-profile-unverified', 'user-nullable-null-no-version', 'user-nullable-values-no-version', 'user-membership-matrix', 'user-role-matrix']) parseFixtureRequest(Buffer.from(JSON.stringify({ formatVersion: 1, runId, backend: 'nest', action, account: 'none', userSlot: 'admin' })));
        phase = 'start-original-nest';
        server = await runtime.startOwned({ kind: 'nest', executable: process.execPath, args: ['--require', path.join(root, 'tools/rust-r2d/user-query-preload.cjs'), path.join(root, report.binary.file)], cwd: root,
            env: { ...managed.childEnv, POMS_R2D_WITNESS_RUN_ID: runId }, host: target.host, port: target.port, readyUrl: target.readinessUrl, logPath: path.join(directory, 'server.log'), runId, timeoutMs: 120000 });
        const capture = JSON.parse(readFileSync(path.join(directory, 'capture-metadata.json')));
        assert.equal(capture.workerIdentity.pid, server.serverPid); assert.deepEqual(identity(server.serverPid), { pid: server.serverPid, startTicks: capture.workerIdentity.startTicks });
        assert.deepEqual(capture.witnessPlan, witnessPlanManifest());
        report.owner = { result: 'pending', anchorPid: server.pid, anchorStartIdentity: server.startIdentity, serverPid: server.serverPid, capture };
        client = new NavigationHttpSession(target.origin, runId); await client.login('admin');
        for (const [index, id] of selectedCaseIds.entries()) {
            phase = id;
            await setupFixture('role-set-active', { roleSlot: 'admin' }); await setupFixture('restore', { account: 'admin' });
            const self = id.startsWith('W02-self-') || id.startsWith('W07-self-') || (id.startsWith('W08-') && !id.endsWith('-detail') && !id.endsWith('-org-refresh'));
            const targetSlot = self ? 'admin' : await minimalUser(), targetId = userBySlot(targetSlot).userId;
            const context = { adminId: userBySlot('admin').userId, adminRole: fixtureJournal.roles.find((row) => row.slot === 'admin').id, targetId, targetSlot,
                role: fixtureJournal.roles.find((row) => row.slot === 'alpha').id, org: fixtureJournal.orgs.find((row) => row.slot === 'alpha').id,
                viewerOrg: fixtureJournal.orgs.find((row) => row.slot === 'viewer').id, inactiveRole: fixtureJournal.roles.find((row) => row.slot === 'inactive').id,
                inactiveOrg: fixtureJournal.orgs.find((row) => row.slot === 'inactive').id, runId, index };
            const scenario = behaviorRecipe(id, context);
            for (const setup of scenario.setup) {
                if (setup.http) { const response = await client.request(setup.http.method, setup.http.path, { json: setup.http.json }); report.setupActions.push({ ...setup.http, status: response.status, response: response.body }); assert.equal(response.status, 200, 'Original relationship setup failed'); }
                else await setupFixture(setup.action, Object.fromEntries(Object.entries(setup).filter(([key]) => key !== 'action')));
            }
            if (scenario.request.json === 'same-profile') {
                const facts = (await fixture('facts')).facts, row = facts.platform_user.find((row) => row.id === targetId); assert(row);
                scenario.request.json = { displayName: row.display_name, email: row.email, phone: row.phone, ...(self ? {} : { avatarUrl: row.avatar_url }) };
            }
            await observe(witnessCases.find((row) => row.id === id), scenario);
        }
        report.result = 'observed-partial';
    } catch (error) {
        report.result = 'failed'; report.failure = { phase, name: error.name, code: /^[A-Z0-9_]{1,80}$/.test(error.message ?? '') ? error.message : 'WITNESS_EXECUTION_FAILED' }; process.exitCode = 1;
    } finally {
        if (server) {
            report.owner ??= { anchorPid: server.pid, serverPid: server.serverPid, result: 'failed' };
            try {
                report.owner.workerAfter = identity(server.serverPid); assert.deepEqual(report.owner.workerAfter, { pid: server.serverPid, startTicks: report.owner.capture.workerIdentity.startTicks });
                report.owner.aliveAfter = true; report.binary.afterSha256 = sha(readFileSync(path.join(root, report.binary.file))); assert.equal(report.binary.afterSha256, report.binary.sha256);
                report.owner.result = 'pass';
            } catch { report.owner.result = 'fail'; report.result = 'failed'; process.exitCode = 1; }
            finally { try { await runtime.stopOwned(server); report.owner.stopped = true; } catch { report.owner.result = 'fail'; report.result = 'failed'; report.stopFailure = true; process.exitCode = 1; } }
        }
        if (prepareAttempted && (!server || report.owner?.stopped)) {
            for (let index = 0; index < 2; index++) {
                try { const cleaned = await fixture('cleanup'); report.cleanup.push(cleaned); if (index === 1) { assert.equal(cleaned.matched, 0); assert.equal(cleaned.changed, 0); } }
                catch { report.cleanupFailure = true; report.result = 'failed'; process.exitCode = 1; break; }
            }
        }
        try { validateSource(); report.sourcesAfter = hashes(); report.sourcesUnchanged = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); assert.equal(report.sourcesUnchanged, true); }
        catch { report.sourcesUnchanged = false; report.result = 'failed'; process.exitCode = 1; }
        if (report.owner && (!report.sourcesUnchanged || report.result === 'failed')) report.owner.result = 'fail';
        report.finishedAt = new Date().toISOString(); writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        process.stdout.write(`${JSON.stringify({ result: report.result, runId, tag, cases: report.observations.map((row) => ({ id: row.id, result: row.result, statuses: row.requests.map((request) => request.status) })),
            owner: report.owner?.result, cleanup: report.cleanup.map((row) => [row.matched, row.changed]), sourcesUnchanged: report.sourcesUnchanged, failure: report.failure, output })}\n`);
    }
    return { report, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const options = parseBehaviorOptions(process.argv.slice(2));
    if (options.mode === 'plan') process.stdout.write(`${JSON.stringify(behaviorRunnerManifest(), null, 2)}\n`);
    else await runBehaviorWitness(options);
}
