import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { sourceHead, g1BaselineSha256, planVersion, planSha256, witnessCases, fixtureMutationRequirements, witnessProtocol, completeWitnessPlan, witnessPlanManifest, assertCompleteWitnessPlan } from './nest-witness-plan.mjs';
import { behaviorRunnerManifest, parseBehaviorOptions, behaviorRecipe, coreCaseIds, implementedCaseIds, captureWitnessObservation } from './nest-behavior-witness.mjs';

const require = createRequire(import.meta.url);
const { barrierSpecs } = require('./user-query-match.cjs');
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const { validateBarrierPlan } = require('./user-query-preload.cjs');
const synthetic = () => ({ kind: 'original-nest-observation', backend: 'nest', witnessPlan: witnessPlanManifest(), observations: witnessCases.map(({ id, group }) => ({ id, group, result: 'observed' })) });

test('independent plan retains every W01-W15 family and unique ordered variants', () => {
    const manifest = witnessPlanManifest();
    assert.deepEqual(manifest.groups, Array.from({ length: 15 }, (_, index) => `W${String(index + 1).padStart(2, '0')}`));
    assert.equal(new Set(manifest.expectedCaseIds).size, witnessCases.length);
    assert(witnessCases.every((row) => row.id.startsWith(`${row.group}-`) && row.http.length && row.capture.length && row.expectedRuntimeResult.includes('observe original behavior')));
    assert.equal(sourceHead, 'a22cba7360346242cb7709740b7eb954b92d1fd4');
    assert.equal(g1BaselineSha256, 'f638206dc317d6fac66cd0aed26d95255a89c94f60502558dee93cbca4b1e455');
});

test('plan hash binds source epoch, full cases, fixture requirements and protocol', () => {
    const body = { formatVersion: planVersion, sourceHead, g1BaselineSha256, witnessCases, fixtureMutationRequirements, witnessProtocol };
    assert.equal(createHash('sha256').update(JSON.stringify(body)).digest('hex'), planSha256);
    const changed = structuredClone(body); changed.witnessCases.pop();
    assert.notEqual(createHash('sha256').update(JSON.stringify(changed)).digest('hex'), planSha256);
    const returned = completeWitnessPlan(); returned[0].capture.push('caller mutation'); assert.notDeepEqual(returned, witnessCases);
    assert(Object.isFrozen(witnessCases)); assert(Object.isFrozen(witnessCases[0].capture));
    assert.throws(() => witnessCases[0].capture.push('change frozen acceptance'));
});

test('critical original implementation risks remain distinct mandatory cases', () => {
    const ids = new Set(witnessCases.map((row) => row.id));
    for (const id of [
        'W01-create-none', 'W01-create-primary-only', 'W01-create-roles-only', 'W01-create-primary-and-roles',
        'W01-create-duplicate-role', 'W04-roles-empty', 'W04-roles-duplicate', 'W05-org-version-after-delete',
        'W07-self-null-to-value', 'W07-self-value-to-null', 'W07-other-target-control',
        'W08-read-profile', 'W08-read-users', 'W08-read-detail', 'W08-read-owner-reference',
        'W11-sessions-lazy-lifecycle', 'W12-session-cas-noop-user', 'W12-session-cas-roles-empty',
        'W12-session-cas-org-replace', 'W13-username-two-prechecks', 'W14-cas-noop-dirty'
    ]) assert(ids.has(id), `Missing independently required witness ${id}`);
    assert(witnessCases.filter((row) => row.group === 'W06').every((row) => row.capture.some((text) => text.includes('not promised audit failures'))));
    assert(witnessCases.filter((row) => row.group === 'W15').every((row) => row.capture.some((text) => text.includes('Do not prove a total order'))));
});

test('all barriers and fixed fixture mutation requirements resolve without arbitrary SQL', () => {
    const mutationIds = new Set(fixtureMutationRequirements.map((row) => row.id));
    assert.equal(mutationIds.size, fixtureMutationRequirements.length);
    for (const row of witnessCases) {
        for (const kind of row.barrierKinds) assert(Object.hasOwn(barrierSpecs, kind), `${row.id}: undefined barrier ${kind}`);
        for (const mutation of row.fixtureMutations) assert(mutationIds.has(mutation), `${row.id}: undefined fixture mutation ${mutation}`);
    }
    assert.equal(witnessProtocol.runEnvironment, 'POMS_R2D_WITNESS_RUN_ID');
    assert.equal(witnessProtocol.directory, 'tmp/rust-r2d/witness/<canonical-run-uuid>');
    assert(witnessProtocol.targetKeys.includes('targetSessionId'));
    assert(witnessProtocol.targetlessReadBoundary.includes('structural-full-read'));
    assert(witnessProtocol.outputBoundary.includes('no bind values or result rows'));
});

test('coverage checker establishes completeness only and never a runtime or parity pass', () => {
    const result = assertCompleteWitnessPlan(synthetic());
    assert.equal(result.result, 'complete-plan-observed-only'); assert.equal(result.cases, witnessCases.length);
    assert(result.boundary.includes('No owner, SQL correctness, Rust parity or G3 Pass'));
});

test('matching prefixes, duplicates, reordered or relabeled cases cannot pass completeness', () => {
    for (const mutate of [
        (report) => report.observations.pop(),
        (report) => report.observations.push(report.observations[0]),
        (report) => report.observations.reverse(),
        (report) => { report.observations[0].group = 'W15'; },
        (report) => { report.observations[0].id = 'W01-replacement'; },
        (report) => { report.witnessPlan.planSha256 = 'f'.repeat(64); },
        (report) => { report.witnessPlan.sourceHead = 'a'.repeat(40); },
        (report) => { report.witnessPlan.expectedCaseIds.pop(); },
        (report) => { report.backend = 'rust'; }
    ]) { const report = synthetic(); mutate(report); assert.throws(() => assertCompleteWitnessPlan(report)); }
});

test('planned, failed, partial and synthetic execution labels never establish observed coverage', () => {
    for (const label of ['pending', 'planned', 'fail', 'partial', 'synthetic', 'pass', undefined]) {
        const report = synthetic(); report.observations[0].result = label;
        assert.throws(() => assertCompleteWitnessPlan(report));
    }
});

test('behavior runner requires explicit execution and keeps destructive cases in separate selections', () => {
    assert.deepEqual(parseBehaviorOptions(['--plan']), { mode: 'plan' });
    assert.equal(coreCaseIds.length, 31); assert.equal(implementedCaseIds.length, 33);
    const selected = parseBehaviorOptions(['--run', '--selection', 'core', '--tag', 'core01']);
    assert.deepEqual(selected.selectedCaseIds, coreCaseIds);
    for (const id of ['W04-roles-deleted-after-check', 'W05-org-deleted-after-check']) {
        assert(!coreCaseIds.includes(id));
        assert.deepEqual(parseBehaviorOptions(['--run', '--case', id, '--tag', 'single01']).selectedCaseIds, [id]);
    }
    for (const args of [[], ['--run'], ['--selection', 'core'], ['--run', '--selection', 'all', '--tag', 'bad'], ['--run', '--selection', 'core', '--tag', '../escape'], ['--run', '--case', 'W12-session-cas-dirty-user', '--tag', 'bad']]) assert.throws(() => parseBehaviorOptions(args));
    assert(behaviorRunnerManifest().reportBoundary.includes('Partial original Nest observation'));
});

test('core request and mutation recipes consume the actual root fixture protocol', () => {
    const runId = '10000000-0000-4000-8000-000000000001';
    const context = { runId, index: 1, targetSlot: 'u000', targetId: 'a0000000-0000-4000-8000-000000000001', adminId: 'a0000000-0000-4000-8000-000000000002',
        adminRole: 'b0000000-0000-4000-8000-000000000002', role: 'b0000000-0000-4000-8000-000000000001', inactiveRole: 'b0000000-0000-4000-8000-000000000003',
        org: 'c0000000-0000-4000-8000-000000000001', viewerOrg: 'c0000000-0000-4000-8000-000000000002', inactiveOrg: 'c0000000-0000-4000-8000-000000000003' };
    for (const id of implementedCaseIds) {
        const scenario = behaviorRecipe(id, context);
        assert(['GET', 'PATCH', 'PUT'].includes(scenario.request.method)); assert(scenario.request.path.startsWith('/api/'));
        for (const action of [...scenario.setup.filter((row) => !row.http), ...(scenario.mutation ? [scenario.mutation] : [])]) parseFixtureRequest(Buffer.from(JSON.stringify({ formatVersion: 1, runId, backend: 'nest', account: 'none', ...action })));
        if (scenario.barrier) assert(validateBarrierPlan({ formatVersion: 1, runId, barrierId: 'pure-protocol', caseId: id, planSha256, parties: 1, skipMatches: 0, ...scenario.barrier }, runId));
        assert(!JSON.stringify(scenario).includes('password'));
    }
    const other = behaviorRecipe('W07-other-target-control', context);
    assert.equal(other.barrier.targetUserId, context.adminId); assert.equal(other.mutation.userSlot, context.targetSlot);
    for (const id of ['W04-roles-deleted-after-check', 'W05-org-deleted-after-check']) assert.equal(behaviorRecipe(id, context).setup.length, 0, 'Do not create alpha references before a destructive witness');
});

test('failed barrier/mutation still retains the completed HTTP outcome and partial evidence', async () => {
    for (const failureAt of ['wait', 'mutation']) {
        const observation = { requests: [], result: 'pending' }, calls = [], failure = new Error('observer failure');
        await assert.rejects(captureWitnessObservation({ observation, request: { method: 'PATCH', path: '/api/auth/profile', json: {} }, plan: { barrierId: 'owned' },
            sendRequest: async () => ({ status: 500, body: { statusCode: 500 }, setCookie: [] }),
            waitBarrier: async () => { if (failureAt === 'wait') throw failure; return [{ queryId: 1 }]; },
            mutate: async () => { if (failureAt === 'mutation') throw failure; }, release: () => calls.push('release'), archiveBarrier: () => calls.push('archive'),
            captureAfter: async () => ({ user: 'after' }), captureSession: async () => ({ version: 2 }), captureEvents: () => [], analyze: () => ({ transactions: [], autocommit: [] }) }), (error) => error === failure);
        assert.equal(observation.requests[0].status, 500); assert.deepEqual(observation.requests[0].response, { statusCode: 500 });
        assert.equal(observation.result, 'capture-incomplete'); assert.equal(observation.barrier.plan.barrierId, 'owned');
        assert(observation.barrier.failure); assert.deepEqual(calls.slice(-2), ['release', 'archive']);
        assert.deepEqual(observation.after, { user: 'after' }); assert.deepEqual(observation.sessionAfter, { version: 2 });
    }
});

test('post-response capture failures never retain an observed label and later captures are attempted', async () => {
    const observation = { requests: [], result: 'pending' }, calls = [], failure = new Error('facts unavailable');
    await assert.rejects(captureWitnessObservation({ observation, request: { method: 'GET', path: '/api/auth/profile' },
        sendRequest: async () => ({ status: 200, body: { id: 'synthetic' }, setCookie: [] }),
        captureAfter: async () => { calls.push('facts'); throw failure; }, captureSession: async () => { calls.push('session'); return {}; }, captureEvents: () => { calls.push('events'); return []; }, analyze: () => ({ transactions: [], autocommit: [] }) }), (error) => error === failure);
    assert.equal(observation.requests[0].status, 200); assert.equal(observation.result, 'capture-incomplete');
    assert.equal(observation.failurePhase, 'after-facts'); assert.deepEqual(calls, ['facts', 'session', 'events']);
});
