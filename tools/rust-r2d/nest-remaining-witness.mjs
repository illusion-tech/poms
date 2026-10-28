import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';
import { sourceHead, g1BaselineSha256, planSha256, witnessCases, witnessPlanManifest } from './nest-witness-plan.mjs';
import { captureWitnessObservation } from './nest-behavior-witness.mjs';
import { analyzeSql, parseSqlJsonl } from '../rust-r2c/witness-sql.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { userFixtureSpec } = require('./fixture-protocol.cjs');
const { validateSource } = require('./fixture-guard.mjs');
const { validateBarrierPlan, resolveWitnessDirectory } = require('./user-query-preload.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const groups = new Set(['W03', 'W06', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14', 'W15']);
export const remainingCaseIds = Object.freeze(witnessCases.filter((row) => groups.has(row.group)).map((row) => row.id));
export function remainingTargetKind(id) {
    if (id === 'W13-username-two-prechecks') return 'planned-create';
    if (id === 'W11-sessions-lazy-lifecycle') return 'viewer';
    if (id === 'W03-self-deactivate' || id === 'W11-permissions-next-request' || /^W09-(?:roles|org)-self-history$/.test(id)) return 'admin';
    return 'new-user';
}
export function remainingRunnerManifest() {
    return { formatVersion: 1, witnessPlan: witnessPlanManifest(), implementedCaseIds: remainingCaseIds,
        execution: '--run --selection remaining|toggles --tag <unique>, or --run --case <id> --tag <unique>; toggles selects exactly W03 five cases',
        boundary: '33 selected original Nest cases. Driver call pauses prove their stated before/after SQL phase; they are not PostgreSQL row-lock dependency proofs or Rust parity.',
        securityAuditBoundary: 'W12 audit-shape is PermissionsGuard security_event-only first flush, before any business controller; it never substitutes for W06 business-success/audit-failure evidence.' };
}
export function parseRemainingOptions(args) {
    if (args.length === 1 && args[0] === '--plan') return { mode: 'plan' };
    assert(args[0] === '--run' && args.length === 5 && args[3] === '--tag' && /^[a-z][a-z0-9-]{0,30}$/.test(args[4] ?? ''), 'Explicit fixed witness invocation required');
    const selectedCaseIds = args[1] === '--selection' && args[2] === 'remaining' ? [...remainingCaseIds]
        : args[1] === '--selection' && args[2] === 'toggles' ? remainingCaseIds.filter((id) => id.startsWith('W03-'))
            : args[1] === '--case' && remainingCaseIds.includes(args[2]) ? [args[2]] : null;
    assert(selectedCaseIds, 'Unknown remaining witness case'); return { mode: 'run', selectedCaseIds, tag: args[4] };
}

export function remainingRecipe(id, c) {
    assert(remainingCaseIds.includes(id));
    const { targetId, targetSlot, adminId, viewerId, adminRole, viewerRole, role, org, viewerOrg, runId, index, plannedUsername, tieUsers = [] } = c;
    const user = (action) => ({ action, userSlot: targetSlot });
    const request = (method, route, json, client = 'admin0') => ({ method, path: route, ...(json === undefined ? {} : { json }), client });
    const profile = (label) => ({ displayName: `R2D ${label} ${runId.slice(0, 8)}` });
    const step = (requests, extra = {}) => ({ requests: Array.isArray(requests) ? requests : [requests], sessionTiming: 'non-due', ...extra });
    const result = { setup: [], steps: [], boundary: null };
    if (id.startsWith('W03-')) {
        const inactive = id.endsWith('-activate') || id.endsWith('-already-inactive');
        result.setup.push(user(inactive ? 'user-set-inactive' : 'user-set-active'));
        const action = id.endsWith('-activate') || id.endsWith('-already-active') ? 'activate' : 'deactivate';
        result.steps.push(step(request('POST', `/api/platform/users/${targetId}:${action}`, { reason: 'ignored', comment: 'ignored', expectedVersion: 999999 }), { sessionTiming: 'preserve' }));
        if (id.endsWith('-self-deactivate')) result.steps.push(step(request('GET', '/api/auth/profile'), { sessionTiming: 'preserve' }));
    } else if (id.startsWith('W06-')) {
        result.steps.push(step(request('PATCH', `/api/platform/users/${targetId}`, { displayName: id.includes('lone-surrogate') ? 'R2D lone \ud800' : 'R2D nul \u0000' })));
        result.boundary = 'Natural encoding probes only. Record the first actual failing statement and surviving facts; no promised audit-only failure and no product trigger.';
    } else if (id.startsWith('W09-')) {
        const roles = id.startsWith('W09-roles'), self = id.includes('-self-');
        if (roles && !self) result.setup.push(user('user-role-matrix'));
        if (!roles) result.setup.push(user('user-membership-matrix'));
        const r = roles ? request('PUT', `/api/platform/users/${targetId}/roles`, { roleIds: self ? [adminRole, role] : [role] }) : request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: org, secondaryOrgUnitIds: [viewerOrg] });
        result.steps.push(step(r, roles && self ? { barrier: { kind: 'after-role-assignments-select' }, mutation: user('user-role-matrix') } : {}));
        if (roles && self) result.boundary = 'Auth has received its original active assignment rows before the fixture matrix revokes that grant; current authorization and later command history are intentionally distinct.';
    } else if (id.startsWith('W10-')) {
        result.setup.push(user('user-role-matrix'), user('user-membership-matrix'));
        if (id.endsWith('-path-uppercase')) result.steps.push(step(request('PUT', `/api/platform/users/${targetId.toUpperCase()}/roles`, { roleIds: [role] })));
        else if (id.endsWith('-path-compact')) result.steps.push(step(request('PUT', `/api/platform/users/${targetId.replaceAll('-', '')}/org-memberships`, { primaryOrgUnitId: org, secondaryOrgUnitIds: [] })));
        else if (id.endsWith('-path-invalid')) result.steps.push(step(request('PATCH', '/api/platform/users/not-a-uuid', { displayName: 7 })), step(request('PATCH', '/api/platform/users/not-a-uuid', profile('valid-body-invalid-id'))));
        else if (id.includes('-body-role-')) result.steps.push(step(request('PUT', `/api/platform/users/${targetId}/roles`, { roleIds: [role.toUpperCase()] })));
        else result.steps.push(step(request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: org.toUpperCase(), secondaryOrgUnitIds: [] })));
    } else if (id === 'W11-sessions-lazy-lifecycle') {
        result.steps.push(...[
            request('POST', `/api/platform/users/${viewerId}:deactivate`, {}), request('GET', '/api/auth/profile', undefined, 'viewer0'),
            request('POST', `/api/platform/users/${viewerId}:activate`, {}), request('GET', '/api/auth/profile', undefined, 'viewer1'), { ...request('GET', '/api/auth/profile', undefined, 'viewer0'), replayOriginalSession: true }
        ].map((r) => step(r, { sessionTiming: 'preserve' })));
        result.boundary = 'Two real pre-existing viewer logins. First use after disable may revoke one session; reactivation must not be assumed to revive it. The untouched session is observed separately.';
    } else if (id === 'W11-permissions-next-request') {
        result.steps.push(step(request('PUT', `/api/platform/users/${adminId}/roles`, { roleIds: [viewerRole] })), step(request('GET', '/api/platform/users')), step(request('GET', '/api/auth/profile')));
    } else if (id.startsWith('W12-')) {
        let r;
        if (id.includes('-roles-empty')) { result.setup.push(user('user-role-matrix')); r = request('PUT', `/api/platform/users/${targetId}/roles`, { roleIds: [] }); }
        else if (id.includes('-org-replace')) { result.setup.push({ http: request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: viewerOrg, secondaryOrgUnitIds: [] }) }, user('user-membership-matrix')); r = request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: org, secondaryOrgUnitIds: [] }); }
        else { r = request('PATCH', `/api/platform/users/${targetId}`, id.includes('-dirty-user') ? profile(`session-cas-${index}`) : {}); }
        if (id.includes('-audit-shape')) { result.setup.push({ action: 'permissions-none', account: 'admin' }); result.boundary = 'PermissionsGuard security_event-only first flush; business controller is not entered. This is not a business-success/audit-failure witness.'; }
        result.steps.push(step(r, { sessionTiming: 'due', barrier: { kind: 'before-managed-session-update', sessionClient: 'admin0' }, mutation: { action: 'session-bump-version', sessionClient: 'admin0' } }));
    } else if (id.startsWith('W13-')) {
        let requests, barrier;
        if (id.includes('-username-')) {
            const body = { username: plannedUsername, displayName: `R2D same username ${runId.slice(0, 8)}`, primaryOrgUnitId: null, initialRoleIds: [] };
            requests = [request('POST', '/api/platform/users', body), request('POST', '/api/platform/users', body, 'admin1')]; barrier = { kind: 'after-user-username-select', targetUsername: plannedUsername };
        } else if (id.includes('-roles-')) {
            result.setup.push(user('user-role-matrix')); const body = { roleIds: [role] };
            requests = [request('PUT', `/api/platform/users/${targetId}/roles`, body), request('PUT', `/api/platform/users/${targetId}/roles`, body, 'admin1')]; barrier = { kind: 'after-role-assignments-delete', targetUserId: targetId };
        } else {
            result.setup.push({ http: request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: viewerOrg, secondaryOrgUnitIds: [] }) }, user('user-membership-matrix'));
            const body = { primaryOrgUnitId: org, secondaryOrgUnitIds: [] };
            requests = [request('PUT', `/api/platform/users/${targetId}/org-memberships`, body), request('PUT', `/api/platform/users/${targetId}/org-memberships`, body, 'admin1')]; barrier = { kind: 'after-org-memberships-delete', targetUserId: targetId };
        }
        result.steps.push(step(requests, { barrier, parties: 2 }));
    } else if (id.startsWith('W14-')) {
        let requests, beforeRead = false;
        if (id.includes('-profile-toggle')) requests = [request('PATCH', `/api/platform/users/${targetId}`, profile('profile-race')), request('POST', `/api/platform/users/${targetId}:deactivate`, {}, 'admin1')];
        else if (id.includes('-org-profile')) {
            result.setup.push({ http: request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: viewerOrg, secondaryOrgUnitIds: [] }) }); beforeRead = true;
            requests = [request('PUT', `/api/platform/users/${targetId}/org-memberships`, { primaryOrgUnitId: viewerOrg, secondaryOrgUnitIds: [org] }), request('PATCH', `/api/platform/users/${targetId}`, profile('org-profile-race'), 'admin1')];
        } else if (id.includes('-noop-dirty')) { beforeRead = true; requests = [request('PATCH', `/api/platform/users/${targetId}`, {}), request('PATCH', `/api/platform/users/${targetId}`, profile('noop-dirty-race'), 'admin1')]; }
        else requests = [request('PATCH', `/api/platform/users/${targetId}`, profile('first-profile-race')), request('PATCH', `/api/platform/users/${targetId}`, profile('second-profile-race'), 'admin1')];
        result.steps.push(step(requests, { parties: 2, barrier: { kind: beforeRead ? 'after-user-by-id-select' : 'before-user-cas-update', targetUserId: targetId } }));
    } else if (id.startsWith('W15-')) {
        if (id.includes('-created-ties')) {
            assert.equal(tieUsers.length, 4); for (const [i, u] of tieUsers.entries()) result.setup.push({ action: 'user-created-at', userSlot: u.slot, timeCase: ['micro-low', 'micro-high', 'tie-first', 'tie-second'][i] });
            result.boundary = 'The two exact-time ties retain their actual array order. Only high > ties > low has a timestamp ordering rule; no id tie-breaker or universal tie-order claim.';
        } else {
            result.setup.push(user('user-profile-values'), user('user-role-matrix'), user('user-membership-matrix'));
            if (id.includes('-inactive-')) result.setup.push(user('user-membership-without-active-primary'), user('user-set-inactive'), { action: 'role-set-inactive', roleSlot: 'alpha' });
            else result.setup.push({ action: 'role-duplicate-names', roleSlot: 'alpha' });
        }
        result.steps.push(step(request('GET', '/api/platform/users')), step(request('GET', `/api/platform/users/${targetId}`)), step(request('GET', '/api/platform/owner-reference')), step(request('GET', '/api/auth/profile')));
    }
    assert(result.steps.length, `Missing recipe ${id}`); return result;
}

// Parallel counterpart to the independently reviewed core observer. Every
// response settles into its own descriptor even if a barrier/mutation fails.
export async function captureConcurrentObservation({ observation, requests, plan, sendRequest, waitBarrier, mutate, release, archiveBarrier, afterRequests, captureAfter, captureSessions, captureEvents, analyze = analyzeSql }) {
    const pending = requests.map((request) => {
        const descriptor = { client: request.client, method: request.method, path: request.path, input: request.json ?? null, status: null, response: null }; observation.requests.push(descriptor);
        return Promise.resolve().then(() => sendRequest(request)).then((response) => { Object.assign(descriptor, { status: response.status, response: response.body, setCookieCount: response.setCookie.length, settledAt: new Date().toISOString() }); return { response }; }, (error) => { descriptor.transportError = { name: error.name }; descriptor.settledAt = new Date().toISOString(); return { error }; });
    });
    observation.barrier = { plan, hits: [], phase: 'await-hits' }; observation.captureErrors = [];
    let firstError, phase = 'barrier-wait';
    const failed = (error, stage) => { firstError ??= error; observation.failurePhase ??= stage; observation.captureErrors.push({ phase: stage, name: error.name }); };
    try {
        observation.barrier.hits = await waitBarrier(plan);
        if (mutate) { phase = 'barrier-mutation'; observation.barrier.mutationStartedAt = new Date().toISOString(); observation.barrier.mutationReceipt = await mutate(); observation.barrier.mutationFinishedAt = new Date().toISOString(); }
        phase = 'barrier-release'; release(plan); observation.barrier.phase = 'released';
        phase = 'http-response'; for (const outcome of await Promise.all(pending)) if (outcome.error) throw outcome.error;
    } catch (error) { failed(error, phase); observation.barrier.failure = { phase, name: error.name }; }
    finally {
        try { release(plan); } catch (error) { failed(error, 'barrier-release-finally'); }
        await Promise.all(pending); try { archiveBarrier(plan); } catch (error) { failed(error, 'barrier-archive'); }
        // A successful create must acquire its journal-bound UUID before any
        // facts/session query can admit its new audit/actor references. Attempt
        // recovery after every settled outcome, including barrier/transport
        // failure; the fixture retains its exact intent and ownership guards.
        if (afterRequests) try { observation.adoption = await afterRequests(); } catch (error) { failed(error, 'after-requests-adoption'); }
        for (const [key, capture, stage] of [['after', captureAfter, 'after-facts'], ['sessionsAfter', captureSessions, 'sessions-after'], ['events', captureEvents, 'sql-events']]) try { observation[key] = await capture(); } catch (error) { failed(error, stage); }
        try { assert(Array.isArray(observation.events)); const result = analyze(observation.events); observation.transactions = result.transactions; observation.autocommit = result.autocommit; } catch (error) { failed(error, 'sql-analysis'); }
        observation.result = firstError ? 'capture-incomplete' : 'observed'; observation.finishedAt = new Date().toISOString();
    }
    if (firstError) throw firstError; return observation;
}

function workerIdentity(pid) {
    assert(Number.isSafeInteger(pid) && pid > 0);
    const raw = readFileSync(`/proc/${pid}/stat`, 'utf8'), fields = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
    const value = { pid: Number(raw.slice(0, raw.indexOf(' '))), startTicks: fields[19] };
    assert.equal(value.pid, pid); assert(/^[0-9]+$/.test(value.startTicks) && BigInt(value.startTicks) > 0n); return value;
}
function sourceList() {
    const files = ['docs/design/rust-r2d-users-profile-baseline.md', 'libs/shared/api-spec/openapi.json', 'package.json', 'pnpm-lock.yaml',
        'tools/e2e/runtime.cjs', 'tools/e2e/runtime-worker.cjs', 'tools/rust-r2c/witness-query-core.cjs', 'tools/rust-r2c/witness-sql.mjs', 'tools/rust-r2c/catalog-org-units.mjs', 'tmp/rust-r2d/nest-create-witness01.json'];
    for (const name of readdirSync(path.join(root, 'tools/rust-r2d'))) if (/^(?:fixture(?:[.-])|invoke-fixture\.|managed-environment\.|catalog-users\.|http-client\.|user-query-|nest-(?:witness-plan|behavior-witness|remaining-witness)\.)/.test(name) && /\.(?:cjs|mjs)$/.test(name)) files.push(`tools/rust-r2d/${name}`);
    function walk(folder) {
        for (const entry of readdirSync(path.join(root, folder), { withFileTypes: true })) {
            const file = `${folder}/${entry.name}`;
            if (entry.isDirectory()) walk(file); else if (entry.isFile() && file.endsWith('.ts')) files.push(file); else assert(!entry.isSymbolicLink());
        }
    }
    for (const folder of ['apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'libs/vendor/nestjs-zod/src']) walk(folder);
    return [...new Set(files)].sort();
}

export async function runRemainingWitness({ tag, selectedCaseIds }) {
    assert.equal(process.platform, 'linux'); assert.equal(realpathSync(process.cwd()), realpathSync(root));
    assert(/^[a-z][a-z0-9-]{0,30}$/.test(tag)); assert(selectedCaseIds.length && selectedCaseIds.every((id) => remainingCaseIds.includes(id)));
    process.umask(0o077);
    const output = path.join(root, `tmp/rust-r2d/nest-remaining-${tag}.json`); assert(!existsSync(output), 'Preserve old evidence');
    const runId = randomUUID(), directory = path.join(root, 'tmp/rust-r2d/witness', runId); mkdirSync(directory, { recursive: true, mode: 0o700 }); resolveWitnessDirectory(root, runId);
    const report = { formatVersion: 1, schema: 'r2d-nest-remaining.v1', result: 'pending', kind: 'original-nest-partial-observation', backend: 'nest', runId, tag, sourceHead,
        witnessPlan: witnessPlanManifest(), selection: selectedCaseIds, observations: [], setupActions: [], cleanup: [], startedAt: new Date().toISOString(),
        boundary: remainingRunnerManifest().boundary, securityAuditBoundary: remainingRunnerManifest().securityAuditBoundary };
    const files = sourceList(), hashes = () => files.map((file) => ({ file, rawSha256: sha(readFileSync(path.join(root, file))) }));
    report.sourcesBefore = hashes();
    for (const file of files) { const dest = path.join(directory, 'sources', file); mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 }); writeFileSync(dest, readFileSync(path.join(root, file)), { flag: 'wx', mode: 0o600 }); }
    let journal, server, prepareAttempted = false, phase = 'source-admission', nextSlot = 0, barrierSequence = 0;
    const clients = new Map();
    const fixture = (action, extra = {}) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', account: 'none', action, ...extra });
    const sqlPath = path.join(directory, 'sql.jsonl');
    const sql = (live = false) => { if (!existsSync(sqlPath)) return []; let text = readFileSync(sqlPath, 'utf8'); if (live && !text.endsWith('\n')) text = text.slice(0, text.lastIndexOf('\n') + 1); return parseSqlJsonl(text); };
    async function setup(action) {
        if (action.http) {
            const r = action.http, response = await clients.get(r.client ?? 'admin0').http.request(r.method, r.path, { json: r.json });
            report.setupActions.push({ ...r, status: response.status, response: response.body }); assert.equal(response.status, 200, 'Original relation setup failed'); return;
        }
        const { action: name, ...extra } = action, receipt = await fixture(name, extra); report.setupActions.push({ ...action, receipt }); return receipt;
    }
    async function login(key, origin) {
        const account = key.startsWith('viewer') ? 'viewer' : 'admin', http = new NavigationHttpSession(origin, runId);
        await http.login(account);
        const secret = http.cookies.get('poms_session'); assert(/^[A-Za-z0-9_-]{43}$/.test(secret));
        clients.set(key, { account, http, secret });
        const snapshot = (await fixture('snapshot', { account, sessionToken: secret })).snapshot;
        report.setupActions.push({ action: 'real-login', client: key, account, userId: http.userId, snapshot });
    }
    async function sessionSnapshots() {
        const result = {};
        // Fixture commands share an exclusive run lock; serialize every read.
        for (const [key, entry] of clients) result[key] = (await fixture('snapshot', { account: entry.account, sessionToken: entry.secret })).snapshot;
        return result;
    }
    async function allocateUser(plannedOnly = false) {
        const slot = `u${String(nextSlot++).padStart(3, '0')}`, spec = userFixtureSpec(runId, slot); await setup({ action: 'user-plan', userSlot: slot });
        if (!plannedOnly) {
            const body = { username: spec.username, displayName: spec.displayName, primaryOrgUnitId: null, initialRoleIds: [] }, descriptor = { method: 'POST', path: '/api/platform/users', body };
            report.setupActions.push(descriptor);
            try { const response = await clients.get('admin0').http.request('POST', descriptor.path, { json: body }); Object.assign(descriptor, { status: response.status, response: response.body }); assert.equal(response.status, 201, 'Use only the witnessed no-relation create shape'); }
            finally { descriptor.adoption = await fixture('user-adopt', { userSlot: slot }); }
        }
        const current = await fixture('facts'); journal = current.fixture; report.fixture = journal;
        const u = journal.users.find((entry) => entry.slot === slot); if (!plannedOnly) assert(u.userId); return { slot, id: u.userId, username: spec.username };
    }
    function release(plan) {
        const filename = path.join(directory, `${plan.barrierId}.release.json`);
        if (!existsSync(filename)) writeFileSync(filename, `${JSON.stringify({ formatVersion: 1, runId, barrierId: plan.barrierId })}\n`, { flag: 'wx', mode: 0o600 });
    }
    async function waitBarrier(plan) {
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {
            const hits = sql(true).filter((row) => row.phase === 'barrier-hit' && row.barrierId === plan.barrierId); assert(hits.length <= plan.parties);
            if (hits.length === plan.parties) {
                assert.equal(new Set(hits.map((row) => row.queryId)).size, plan.parties);
                if (plan.parties === 2) assert.equal(new Set(hits.map((row) => row.connection)).size, 2, 'Both requests must hold distinct driver connections');
                for (const hit of hits) {
                    assert.equal(hit.workerPid, report.owner.capture.workerIdentity.pid); assert.equal(hit.workerStartTicks, report.owner.capture.workerIdentity.startTicks);
                    assert.equal(hit.barrierKind, plan.kind); assert.equal(hit.barrierProof.caseId, plan.caseId); assert.equal(hit.barrierProof.planSha256, planSha256); assert.equal(hit.captureIncomplete, false);
                    assert.deepEqual(hit.barrierProof.targets, Object.fromEntries(Object.entries(plan).filter(([key]) => key.startsWith('target'))));
                }
                return hits;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('R2D_BARRIER_NOT_REACHED');
    }
    function assertOwned(plan, snapshots) {
        const users = [...journal.accounts.map((u) => u.userId), ...journal.users.map((u) => u.userId).filter(Boolean)];
        if (plan.targetUserId) assert(users.includes(plan.targetUserId));
        if (plan.targetRoleId) assert(journal.roles.some((r) => r.id === plan.targetRoleId));
        if (plan.targetOrgId) assert(journal.orgs.some((o) => o.id === plan.targetOrgId));
        if (plan.targetSessionId) assert(Object.values(snapshots).some((value) => value.session.id === plan.targetSessionId));
        if (plan.targetUsername) assert([...journal.accounts, ...journal.users].some((u) => u.username === plan.targetUsername));
    }
    async function observeStep(item, step, parent, plannedUser) {
        const clientKeys = [...new Set(step.requests.map((r) => r.client))];
        if (step.sessionTiming !== 'preserve') for (const key of clientKeys) {
            const entry = clients.get(key); await fixture(step.sessionTiming === 'due' ? 'session-due' : 'session-non-due', { account: entry.account, sessionToken: entry.secret });
        }
        const before = (await fixture('facts')).facts, snapshots = await sessionSnapshots(), sequence = sql().at(-1)?.sequence ?? 0;
        const observation = { id: `${item.id}-step${parent.steps.length}`, parentCaseId: item.id, group: item.group, result: 'pending', before, sessionsBefore: snapshots, startedAt: new Date().toISOString(), requests: [] };
        parent.steps.push(observation);
        let plan;
        if (step.barrier) {
            const { sessionClient, ...fields } = step.barrier;
            plan = validateBarrierPlan({ formatVersion: 1, runId, barrierId: `remaining-${++barrierSequence}`, caseId: item.id, planSha256, parties: step.parties ?? 1, skipMatches: 0,
                ...fields, ...(sessionClient ? { targetSessionId: snapshots[sessionClient].session.id } : {}) }, runId);
            assertOwned(plan, snapshots); writeFileSync(path.join(directory, 'barrier.json'), `${JSON.stringify(plan)}\n`, { flag: 'wx', mode: 0o600 });
        }
        const sendRequest = (r) => {
            const entry = clients.get(r.client); assert(entry);
            if (r.replayOriginalSession) entry.http.cookies.set('poms_session', entry.secret);
            return entry.http.request(r.method, r.path, r.json === undefined ? {} : { json: r.json });
        };
        const mutate = step.mutation ? async () => {
            const { action, sessionClient, ...extra } = step.mutation;
            return fixture(action, { ...extra, ...(sessionClient ? { account: clients.get(sessionClient).account, sessionToken: clients.get(sessionClient).secret } : {}) });
        } : undefined;
        const archiveBarrier = (value) => renameSync(path.join(directory, 'barrier.json'), path.join(directory, `${value.barrierId}.plan.json`));
        try {
            if (step.requests.length === 1) await captureWitnessObservation({ observation, request: step.requests[0], plan, sendRequest: () => sendRequest(step.requests[0]), waitBarrier, mutate, release, archiveBarrier,
                captureAfter: async () => (await fixture('facts')).facts, captureSession: sessionSnapshots, captureEvents: () => sql().filter((row) => row.sequence > sequence) });
            else await captureConcurrentObservation({ observation, requests: step.requests, plan, sendRequest, waitBarrier, mutate, release, archiveBarrier,
                afterRequests: plannedUser ? async () => {
                    const adopted = await fixture('user-adopt', { userSlot: plannedUser.slot });
                    parent.adoption = adopted; journal = (await fixture('facts')).fixture; report.fixture = journal; return adopted;
                } : undefined,
                captureAfter: async () => (await fixture('facts')).facts, captureSessions: sessionSnapshots, captureEvents: () => sql().filter((row) => row.sequence > sequence) });
        } finally {
            if (step.requests.length === 1 && observation.requests[0]) {
                observation.requests[0].client = step.requests[0].client;
                if (step.requests[0].replayOriginalSession) observation.requests[0].replayedOwnedSession = true;
                observation.sessionsAfter = observation.sessionAfter; delete observation.sessionAfter;
            }
        }
    }
    try {
        validateSource(); assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceHead);
        assert.equal(sha(readFileSync(path.join(root, 'docs/design/rust-r2d-users-profile-baseline.md'))), g1BaselineSha256);
        const buildBytes = readFileSync(path.join(root, 'tmp/rust-r2d/nest-create-witness01.json')), build = JSON.parse(buildBytes);
        assert.equal(build.sourceHead, sourceHead); assert.equal(build.sourcesUnchanged, true); assert.equal(build.result, 'observed-partial'); assert(build.owner.aliveAfter && build.owner.stopped);
        report.binary = { file: 'dist/apps/poms-api/main.js', sha256: sha(readFileSync(path.join(root, 'dist/apps/poms-api/main.js'))), reused: true, buildReceipt: 'tmp/rust-r2d/nest-create-witness01.json', buildReceiptSha256: sha(buildBytes), buildRunId: build.runId };
        assert.equal(report.binary.sha256, build.binary.sha256); assert.equal(build.binary.sha256, build.binary.afterSha256);
        writeFileSync(path.join(directory, 'original-nest-main.js'), readFileSync(path.join(root, report.binary.file)), { flag: 'wx', mode: 0o600 });
        const managed = loadManagedEnvironment({ mode: 'managed-nest' }), target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
        report.environment = { origin: target.origin, database: managed.database, node: process.version }; await runtime.assertPortAvailable(target);
        phase = 'prepare'; prepareAttempted = true; journal = (await fixture('prepare')).fixture; report.fixture = journal;
        phase = 'start'; server = await runtime.startOwned({ kind: 'nest', executable: process.execPath, args: ['--require', path.join(root, 'tools/rust-r2d/user-query-preload.cjs'), path.join(root, report.binary.file)], cwd: root,
            env: { ...managed.childEnv, POMS_R2D_WITNESS_RUN_ID: runId }, host: target.host, port: target.port, readyUrl: target.readinessUrl, logPath: path.join(directory, 'server.log'), runId, timeoutMs: 120000 });
        const capture = JSON.parse(readFileSync(path.join(directory, 'capture-metadata.json'))); assert.equal(capture.workerIdentity.pid, server.serverPid);
        assert.deepEqual(workerIdentity(server.serverPid), { pid: server.serverPid, startTicks: capture.workerIdentity.startTicks }); assert.deepEqual(capture.witnessPlan, witnessPlanManifest());
        report.owner = { result: 'pending', anchorPid: server.pid, anchorStartIdentity: server.startIdentity, serverPid: server.serverPid, capture };
        for (const [index, id] of selectedCaseIds.entries()) {
            phase = id; clients.clear();
            for (const slot of ['admin', 'viewer', 'alpha']) await setup({ action: 'role-set-active', roleSlot: slot });
            await setup({ action: 'restore', account: 'admin' }); await setup({ action: 'restore', account: 'viewer' });
            await login('admin0', target.origin); if (id.startsWith('W13-') || id.startsWith('W14-')) await login('admin1', target.origin);
            if (id === 'W11-sessions-lazy-lifecycle') { await login('viewer0', target.origin); await login('viewer1', target.origin); }
            const kind = remainingTargetKind(id), targetUser = kind === 'admin' || kind === 'viewer' ? { slot: kind, id: journal.accounts.find((a) => a.account === kind).userId } : await allocateUser(kind === 'planned-create');
            const tieUsers = id === 'W15-order-created-ties' ? [targetUser, await allocateUser(), await allocateUser(), await allocateUser()] : [];
            const recipe = remainingRecipe(id, { runId, index, targetId: targetUser.id, targetSlot: targetUser.slot, plannedUsername: targetUser.username, tieUsers,
                adminId: journal.accounts.find((a) => a.account === 'admin').userId, viewerId: journal.accounts.find((a) => a.account === 'viewer').userId,
                adminRole: journal.roles.find((r) => r.slot === 'admin').id, viewerRole: journal.roles.find((r) => r.slot === 'viewer').id, role: journal.roles.find((r) => r.slot === 'alpha').id,
                org: journal.orgs.find((o) => o.slot === 'alpha').id, viewerOrg: journal.orgs.find((o) => o.slot === 'viewer').id });
            for (const action of recipe.setup) await setup(action);
            const item = witnessCases.find((row) => row.id === id), observation = { id, group: item.group, result: 'pending', boundary: recipe.boundary, steps: [], requests: [], startedAt: new Date().toISOString() };
            report.observations.push(observation);
            try {
                for (const step of recipe.steps) await observeStep(item, step, observation, kind === 'planned-create' ? targetUser : undefined);
                observation.result = 'observed';
            } finally {
                observation.requests = observation.steps.flatMap((entry) => entry.requests); observation.before = observation.steps[0]?.before; observation.after = observation.steps.at(-1)?.after;
                if (observation.steps.some((entry) => entry.result !== 'observed')) observation.result = 'capture-incomplete'; observation.finishedAt = new Date().toISOString();
            }
        }
        report.result = 'observed-partial';
    } catch (error) {
        report.result = 'failed'; report.failure = { phase, name: error.name, code: /^[A-Z0-9_]{1,80}$/.test(error.message ?? '') ? error.message : 'WITNESS_EXECUTION_FAILED' }; process.exitCode = 1;
    } finally {
        if (server) {
            report.owner ??= { anchorPid: server.pid, serverPid: server.serverPid, result: 'failed' };
            try { report.owner.workerAfter = workerIdentity(server.serverPid); assert.deepEqual(report.owner.workerAfter, { pid: server.serverPid, startTicks: report.owner.capture.workerIdentity.startTicks }); report.owner.aliveAfter = true;
                report.binary.afterSha256 = sha(readFileSync(path.join(root, report.binary.file))); assert.equal(report.binary.afterSha256, report.binary.sha256); report.owner.result = 'pass'; }
            catch { report.owner.result = 'fail'; report.result = 'failed'; process.exitCode = 1; }
            finally { try { await runtime.stopOwned(server); report.owner.stopped = true; } catch { report.owner.result = 'fail'; report.result = 'failed'; report.stopFailure = true; process.exitCode = 1; } }
        }
        if (prepareAttempted && (!server || report.owner?.stopped)) for (let i = 0; i < 2; i++) {
            try { const receipt = await fixture('cleanup'); report.cleanup.push(receipt); if (i === 1) { assert.equal(receipt.matched, 0); assert.equal(receipt.changed, 0); } }
            catch { report.cleanupFailure = true; report.result = 'failed'; process.exitCode = 1; break; }
        }
        try { validateSource(); report.sourcesAfter = hashes(); report.sourcesUnchanged = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); assert.equal(report.sourcesUnchanged, true); }
        catch { report.sourcesUnchanged = false; report.result = 'failed'; process.exitCode = 1; }
        if (report.owner && (!report.sourcesUnchanged || report.result === 'failed')) report.owner.result = 'fail';
        report.finishedAt = new Date().toISOString(); writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        process.stdout.write(`${JSON.stringify({ result: report.result, runId, tag, cases: report.observations.map((row) => ({ id: row.id, result: row.result, statuses: row.requests.map((r) => r.status) })),
            owner: report.owner?.result, cleanup: report.cleanup.map((r) => [r.matched, r.changed]), sourcesUnchanged: report.sourcesUnchanged, failure: report.failure, output })}\n`);
    }
    return { report, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const options = parseRemainingOptions(process.argv.slice(2));
    if (options.mode === 'plan') process.stdout.write(`${JSON.stringify(remainingRunnerManifest(), null, 2)}\n`); else await runRemainingWitness(options);
}
