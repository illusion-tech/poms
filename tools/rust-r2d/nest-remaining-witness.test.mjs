import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { witnessCases, planSha256 } from './nest-witness-plan.mjs';
import { implementedCaseIds as coreIds } from './nest-behavior-witness.mjs';
import { remainingCaseIds, remainingTargetKind, remainingRecipe, remainingRunnerManifest, parseRemainingOptions, captureConcurrentObservation } from './nest-remaining-witness.mjs';

const require = createRequire(import.meta.url);
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const { validateBarrierPlan } = require('./user-query-preload.cjs');
const runId = '10000000-0000-4000-8000-000000000001';
const c = { runId, index: 1, targetSlot: 'u000', targetId: 'a0000000-0000-4000-8000-000000000001', adminId: 'a0000000-0000-4000-8000-000000000002', viewerId: 'a0000000-0000-4000-8000-000000000003',
    adminRole: 'b0000000-0000-4000-8000-000000000002', viewerRole: 'b0000000-0000-4000-8000-000000000004', role: 'b0000000-0000-4000-8000-000000000001',
    org: 'c0000000-0000-4000-8000-000000000001', viewerOrg: 'c0000000-0000-4000-8000-000000000002', plannedUsername: `r2d_u000_${runId.replaceAll('-', '')}`,
    tieUsers: [0, 1, 2, 3].map((n) => ({ slot: `u00${n}`, id: `a0000000-0000-4000-8000-00000000000${n + 1}` })) };

test('independent remaining recipes partition the fixed73 plan with W01 and core33', () => {
    assert.equal(remainingCaseIds.length, 33);
    const all = [...witnessCases.filter((row) => row.group === 'W01').map((row) => row.id), ...coreIds, ...remainingCaseIds];
    assert.equal(all.length, 73); assert.equal(new Set(all).size, 73);
    assert.deepEqual([...all].sort(), witnessCases.map((row) => row.id).sort());
    assert.equal(parseRemainingOptions(['--plan']).mode, 'plan');
    assert.deepEqual(parseRemainingOptions(['--run', '--selection', 'remaining', '--tag', 'rest01']).selectedCaseIds, remainingCaseIds);
    assert.equal(parseRemainingOptions(['--run', '--selection', 'toggles', '--tag', 'toggle01']).selectedCaseIds.length, 5);
    for (const args of [[], ['--run'], ['--run', '--selection', 'core', '--tag', 'bad'], ['--run', '--case', coreIds[0], '--tag', 'bad'], ['--run', '--selection', 'remaining', '--tag', '../escape']]) assert.throws(() => parseRemainingOptions(args));
    assert(remainingRunnerManifest().boundary.includes('not PostgreSQL row-lock'));
});

test('every remaining request/fixture/barrier recipe resolves the actual finite protocols', () => {
    for (const id of remainingCaseIds) {
        const recipe = remainingRecipe(id, c); assert(recipe.steps.length);
        for (const action of recipe.setup) if (!action.http) parseFixtureRequest(Buffer.from(JSON.stringify({ formatVersion: 1, runId, backend: 'nest', account: 'none', ...action })));
        for (const step of recipe.steps) {
            assert(step.requests.length === 1 || step.requests.length === 2);
            for (const r of step.requests) { assert(['GET', 'POST', 'PATCH', 'PUT'].includes(r.method)); assert(r.path.startsWith('/api/')); assert(/^(?:admin|viewer)[01]$/.test(r.client)); }
            if (step.barrier) {
                const { sessionClient, ...fields } = step.barrier;
                validateBarrierPlan({ formatVersion: 1, runId, barrierId: 'pure-remaining', caseId: id, planSha256, skipMatches: 0, parties: step.parties ?? 1,
                    ...fields, ...(sessionClient ? { targetSessionId: 'd0000000-0000-4000-8000-000000000001' } : {}) }, runId);
            }
            if (step.mutation) {
                const { sessionClient, ...action } = step.mutation;
                parseFixtureRequest(Buffer.from(JSON.stringify({ formatVersion: 1, runId, backend: 'nest', account: 'none', ...action,
                    ...(sessionClient ? { account: 'admin', sessionToken: 'A'.repeat(43) } : {}) })));
            }
        }
    }
});

test('self-history uses the authorized early read and exact natural encoding probes', () => {
    const self = remainingRecipe('W09-roles-self-history', { ...c, targetId: c.adminId, targetSlot: 'admin' });
    assert.equal(self.setup.length, 0); assert.equal(self.steps[0].barrier.kind, 'after-role-assignments-select');
    assert.equal(self.steps[0].mutation.action, 'user-role-matrix');
    assert.equal(remainingRecipe('W06-audit-lone-surrogate-probe', c).steps[0].requests[0].json.displayName.charCodeAt(9), 0xd800);
    assert(remainingRecipe('W06-audit-nul-control', c).steps[0].requests[0].json.displayName.includes('\0'));
});

test('lazy-session case replays the original revoked session rather than an empty cookie jar', () => {
    const lifecycle = remainingRecipe('W11-sessions-lazy-lifecycle', { ...c, targetId: c.viewerId, targetSlot: 'viewer' });
    assert.equal(lifecycle.steps.length, 5); assert(lifecycle.steps.every((step) => step.sessionTiming === 'preserve'));
    assert.equal(lifecycle.steps[1].requests[0].client, 'viewer0'); assert.equal(lifecycle.steps[3].requests[0].client, 'viewer1');
    assert.equal(lifecycle.steps[4].requests[0].replayOriginalSession, true);
    assert.equal(remainingTargetKind('W11-sessions-lazy-lifecycle'), 'viewer');
});

test('security audit-only flush and no-op races do not invent business writes', () => {
    const security = remainingRecipe('W12-session-cas-audit-shape', c);
    assert(security.boundary.includes('business controller is not entered')); assert(security.setup.some((a) => a.action === 'permissions-none'));
    assert.equal(security.steps[0].sessionTiming, 'due'); assert.equal(security.steps[0].barrier.kind, 'before-managed-session-update');
    for (const id of ['W14-cas-noop-dirty', 'W14-cas-org-profile']) assert.equal(remainingRecipe(id, c).steps[0].barrier.kind, 'after-user-by-id-select');
    const race = remainingRecipe('W13-username-two-prechecks', c);
    assert.equal(race.steps[0].parties, 2); assert(race.steps[0].requests.every((r) => r.json.primaryOrgUnitId === null && r.json.initialRoleIds.length === 0));
    assert.equal(remainingTargetKind('W13-username-two-prechecks'), 'planned-create');
});

test('timestamp ties and raw alias tests preserve explicit evidence limits', () => {
    const ties = remainingRecipe('W15-order-created-ties', c); assert.equal(ties.setup.length, 4);
    assert.deepEqual(ties.setup.map((a) => a.timeCase), ['micro-low', 'micro-high', 'tie-first', 'tie-second']);
    assert(ties.boundary.includes('no id tie-breaker'));
    const aliases = remainingRecipe('W10-path-uppercase', c); assert(aliases.steps[0].requests[0].path.includes(c.targetId.toUpperCase()));
    assert.equal(remainingRecipe('W10-path-invalid', c).steps.length, 2);
});

test('parallel barrier failure preserves both completed HTTP outcomes and capture stages', async () => {
    const observation = { requests: [] }, failure = new Error('barrier unavailable'), releases = [];
    const requests = [{ client: 'admin0', method: 'PUT', path: '/api/platform/users/id/roles', json: {} }, { client: 'admin1', method: 'PUT', path: '/api/platform/users/id/roles', json: {} }];
    await assert.rejects(captureConcurrentObservation({ observation, requests, plan: { barrierId: 'pair' }, sendRequest: async (r) => ({ status: r.client === 'admin0' ? 200 : 500, body: { client: r.client }, setCookie: [] }),
        waitBarrier: async () => { throw failure; }, release: () => releases.push('release'), archiveBarrier: () => releases.push('archive'),
        captureAfter: async () => ({ complete: true }), captureSessions: async () => ({ admin0: {}, admin1: {} }), captureEvents: () => [], analyze: () => ({ transactions: [], autocommit: [] }) }), (error) => error === failure);
    assert.deepEqual(observation.requests.map((r) => r.status), [200, 500]); assert.equal(observation.result, 'capture-incomplete');
    assert.equal(observation.barrier.plan.barrierId, 'pair'); assert.equal(observation.failurePhase, 'barrier-wait');
    assert.deepEqual(releases, ['release', 'archive']); assert.deepEqual(observation.after, { complete: true });
});

test('parallel post-facts failure retains outcomes and attempts sessions/events before rejecting observation', async () => {
    const observation = { requests: [] }, failure = new Error('facts failure'), captures = [];
    const requests = ['admin0', 'admin1'].map((client) => ({ client, method: 'PATCH', path: '/api/platform/users/id', json: {} }));
    await assert.rejects(captureConcurrentObservation({ observation, requests, plan: {}, sendRequest: async () => ({ status: 200, body: {}, setCookie: [] }), waitBarrier: async () => [{}, {}], release: () => undefined, archiveBarrier: () => undefined,
        captureAfter: async () => { captures.push('facts'); throw failure; }, captureSessions: async () => { captures.push('sessions'); return {}; }, captureEvents: () => { captures.push('events'); return []; }, analyze: () => ({ transactions: [], autocommit: [] }) }), (error) => error === failure);
    assert.equal(observation.result, 'capture-incomplete'); assert.deepEqual(captures, ['facts', 'sessions', 'events']); assert.deepEqual(observation.requests.map((r) => r.status), [200, 200]);
});

test('planned create adopts only after both outcomes settle and before protected facts/session captures', async () => {
    const observation = { requests: [] }, stages = [];
    const requests = ['admin0', 'admin1'].map((client) => ({ client, method: 'POST', path: '/api/platform/users', json: { username: c.plannedUsername } }));
    await captureConcurrentObservation({ observation, requests, plan: {}, sendRequest: async (r) => { stages.push(r.client); return { status: r.client === 'admin0' ? 201 : 500, body: {}, setCookie: [] }; },
        waitBarrier: async () => [{}, {}], release: () => undefined, archiveBarrier: () => undefined,
        afterRequests: async () => { assert.deepEqual(observation.requests.map((r) => r.status), [201, 500]); stages.push('adopt'); return { user: { userId: c.targetId } }; },
        captureAfter: async () => { stages.push('facts'); return {}; }, captureSessions: async () => { stages.push('sessions'); return {}; }, captureEvents: () => { stages.push('events'); return []; }, analyze: () => ({ transactions: [], autocommit: [] }) });
    assert.deepEqual(stages.slice(-4), ['adopt', 'facts', 'sessions', 'events']); assert.equal(observation.adoption.user.userId, c.targetId); assert.equal(observation.result, 'observed');
});

test('failed barrier still recovers a completed create, and failed adoption never suppresses captures or becomes observed', async () => {
    for (const adoptFails of [false, true]) {
        const observation = { requests: [] }, stages = [], barrierError = new Error('barrier failed');
        await assert.rejects(captureConcurrentObservation({ observation, requests: [{ client: 'admin0', method: 'POST', path: '/api/platform/users', json: {} }], plan: {},
            sendRequest: async () => ({ status: 201, body: { id: c.targetId }, setCookie: [] }), waitBarrier: async () => { throw barrierError; }, release: () => undefined, archiveBarrier: () => undefined,
            afterRequests: async () => { stages.push('adopt'); if (adoptFails) throw new Error('ownership refused'); return { user: { userId: c.targetId } }; },
            captureAfter: async () => { stages.push('facts'); return {}; }, captureSessions: async () => { stages.push('sessions'); return {}; }, captureEvents: () => { stages.push('events'); return []; }, analyze: () => ({ transactions: [], autocommit: [] }) }), (error) => error === barrierError);
        assert.deepEqual(stages, ['adopt', 'facts', 'sessions', 'events']); assert.equal(observation.requests[0].status, 201); assert.equal(observation.result, 'capture-incomplete');
        assert.equal(observation.captureErrors.some((error) => error.phase === 'after-requests-adoption'), adoptFails);
    }
});
