// Candidate callback orchestration; no entrypoint, credentials, client or DB driver.
import { createHash } from 'node:crypto';
import { buildFaultPlan, gateSql, productionFamilyGateSql, validateScope } from './fault-plans32.mjs';
import { snapshotStatement } from './read-only32.mjs';

const requireThat = (value, label) => { if (!value) throw new Error('fault32: ' + label); };
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const nonAuth = snapshot => Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'auth'));
const equal = (a, b, label) => requireThat(canonical(a) === canonical(b), label);
const rows = response => response.rows;
const snapshot = async (ctx, scope, ids) => {
  const response = await ctx.readOnlyQuery(snapshotStatement(scope, ids));
  requireThat(response.realPostgres === true, 'real-read-only-PG-receipt-required');
  const value = rows(response)?.[0]?.snapshot;
  requireThat(value && typeof value === 'object' && !Array.isArray(value), 'actual-PG-snapshot-shape');
  return value;
};
const authRow = (value, scope) => {
  const row = value.auth.find(row => row.id === scope.sessionId);
  requireThat(row?.user_id === scope.actorId, 'actual-owned-session-binding');
  return row;
};

function startRequest(ctx, request, requestId) {
  let settled = false;
  const completion = Promise.resolve().then(() => ctx.request({
    ...request, body: request.body === undefined ? undefined : structuredClone(request.body), headers: { ...(request.headers || {}), 'x-request-id': requestId },
    automaticRetry: false,
  })).then(response => {
    requireThat(response.realHttp === true && Number.isInteger(response.status), 'real-HTTP-receipt-required');
    return response;
  }).finally(() => { settled = true; });
  // Attach rejection handling while SQL observation runs; the original result
  // remains available to the caller and cannot be relabeled as a successful IO.
  completion.catch(() => {});
  return { completion, settled: () => settled };
}

async function observe(ctx, statement, condition, inflight, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const result = await ctx.readOnlyQuery({ ...statement, readonly: true });
    requireThat(result.realPostgres === true, 'real-lock-observation-required');
    const value = condition(rows(result));
    if (value) return value;
    requireThat(!inflight.settled(), 'HTTP-settled-before-required-PG-barrier');
    // Poll pacing only. SQL lock observations, never elapsed sleep, release a gate.
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('fault32: required observable barrier deadline exceeded');
}

async function awaitRequest(inflight, deadlineMs) {
  let timer;
  try {
    return await Promise.race([inflight.completion, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('fault32: unknown in-flight HTTP outcome; no retry permitted')), deadlineMs);
    })]);
  } finally { clearTimeout(timer); }
}

function validateCallbacks(ctx) {
  for (const method of ['request', 'readOnlyQuery', 'openController', 'installDDL', 'cleanupDDL', 'withSerialFaultLease', 'assertOwned', 'assertSuccess', 'record']) {
    requireThat(typeof ctx[method] === 'function', 'Root-callback-required-' + method);
  }
}

function validateRequest(request, operation) {
  requireThat(request.operationId === operation.operationId && request.method === operation.method, 'frozen-operation-mismatch');
  const escaped = operation.path.split(/(\{[^}]+\})/).map(part => part.startsWith('{') ? '[0-9a-fA-F-]{36}' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  requireThat(new RegExp('^' + escaped + '$').test(request.path), 'frozen-path-mismatch');
}

async function paused(ctx, scope, request, plan, requestIds, deadlineMs) {
  let controller, held = false, installed = false, inflight;
  try {
    controller = await ctx.openController();
    const result = await controller.query(gateSql.tryHold(plan.gate));
    requireThat(result.realPostgres === true && rows(result)?.[0]?.held === true, 'unique-controller-gate-not-acquired');
    held = true;
    await ctx.installDDL({ plan, statements: plan.install, committedBeforeHttp: true });
    installed = true;
    inflight = startRequest(ctx, request, scope.requestId);
    const waiter = await observe(ctx, gateSql.observe(plan.gate), found => {
      requireThat(found.length <= 1, 'gate-has-ambiguous-request-backends');
      return found[0];
    }, inflight, deadlineMs);
    const atGate = await snapshot(ctx, scope, requestIds);
    await ctx.record({ phase: 'at-observed-trigger-gate', requestId: scope.requestId, point: plan.point, trigger: plan.tag, pid: waiter.pid, snapshotSha256: hash(atGate) });
    const unlocked = await controller.query(gateSql.release(plan.gate));
    requireThat(rows(unlocked)?.[0]?.released === true, 'controller-gate-not-released');
    held = false;
    const response = await awaitRequest(inflight, deadlineMs);
    return { atGate, response, pid: waiter.pid };
  } finally {
    if (held) await controller.query(gateSql.release(plan.gate));
    // Releasing the gate must precede teardown. Never disconnect the production
    // backend or drop a table to turn a stuck or ambiguous run into a pass.
    if (inflight && !inflight.settled()) {
      try { await awaitRequest(inflight, deadlineMs); }
      catch (error) { await ctx.record({ phase: 'unsettled-request-cleanup-required', trigger: plan.tag, error: error.message }); }
    }
    if (installed) await ctx.cleanupDDL({ plan, statements: plan.cleanup, forbidCascade: true, boundedLockTimeoutRequired: true });
    if (controller) await controller.close();
  }
}

export async function runFault32(ctx, scenario, fixture) {
  validateCallbacks(ctx);
  return ctx.withSerialFaultLease(async () => {
    const scope = validateScope(fixture.scope);
    requireThat(fixture.request.operationId === scope.operationId, 'request-operationId-mismatch');
    validateRequest(fixture.request, scenario.operation);
    await ctx.assertOwned({ scenario, fixture, requireRealApiProducerReceipts: true, requireExclusiveProjects: true });
    const retryId = scope.requestId + '_retry';
    const requestIds = [...new Set([...(fixture.ownedRequestIds || []), scope.requestId, retryId])];
    if (scenario.requiresBusinessNumberSnapshot) requireThat(scope.numberScopes?.length && scope.numberPeriods?.length, 'E-number-counter-readback-required');
    if (scenario.requiresPendingAuth) {
      requireThat(typeof ctx.preparePendingAuth === 'function', 'real-due-auth-preparation-required');
      await ctx.preparePendingAuth({ scope, method: 'real-time-or-existing-Root-authorized-clock-only', forbidSqlBackdate: true });
    }
    const before = await snapshot(ctx, scope, requestIds);
    const plan = buildFaultPlan(scope, scenario.point, 'pause-raise');
    const failure = await paused(ctx, scope, fixture.request, plan, requestIds, scenario.deadlineMs || 20000);
    requireThat(failure.response.status === 500, 'injected-write-must-return-real-500');
    requireThat(!JSON.stringify(failure.response.body).includes('r4f32 owned-row injected failure'), 'internal-trigger-error-exposed');
    equal(nonAuth(before), nonAuth(failure.atGate), 'precommit-owned-business-state-visible');
    if (scenario.requiresPendingAuth) requireThat(authRow(failure.atGate, scope).row_version > authRow(before, scope).row_version, 'real-eager-touch-not-proven');
    const afterFailure = await snapshot(ctx, scope, requestIds);
    equal(failure.atGate, afterFailure, 'business-evidence-audit-security-pending-auth-not-fully-rolled-back');
    await ctx.record({ phase: 'failure-rolled-back', scenario: scenario.id, requestId: scope.requestId, status: 500, responseSha256: hash(failure.response.body), snapshotSha256: hash(afterFailure), authBaseline: 'post-eager-touch-at-gate' });

    // Exactly one explicit retry. Unknown response/COMMIT acknowledgement above
    // throws before this point. No automatic login refresh or HTTP retries here.
    const retryScope = { ...scope, requestId: retryId };
    let success;
    if (scenario.requiresPendingAuth) {
      await ctx.preparePendingAuth({ scope: retryScope, method: 'real-time-or-existing-Root-authorized-clock-only', forbidSqlBackdate: true });
      const positive = await paused(ctx, retryScope, fixture.request, buildFaultPlan(retryScope, 'pending-auth', 'pause'), requestIds, scenario.deadlineMs || 20000);
      success = positive.response;
      requireThat(success.status === scenario.operation.successStatus, 'retry-status');
      const committed = await snapshot(ctx, retryScope, requestIds);
      requireThat(authRow(committed, retryScope).row_version === authRow(positive.atGate, retryScope).row_version + 1, 'successful-single-pending-auth-flush-not-proven');
    } else {
      success = await awaitRequest(startRequest(ctx, fixture.request, retryId), scenario.deadlineMs || 20000);
      requireThat(success.status === scenario.operation.successStatus, 'retry-status');
    }
    const afterRetry = await snapshot(ctx, scope, requestIds);
    // Root must supply a real, case-specific PG/HTTP assertion. There is no stub
    // default that manufactures a production success receipt.
    await ctx.assertSuccess({ scenario, fixture, before, afterFailure, afterRetry, response: success, retryRequestId: retryId, retries: 1 });
    const result = { scenario: scenario.id, status: 'passed-real-callback-assertions', realHttp: true, readOnlyPg: true, rollbackSnapshotSha256: hash(afterFailure), finalSnapshotSha256: hash(afterRetry), retries: 1 };
    await ctx.record(result);
    return result;
  });
}

export async function runContendedRace32(ctx, scenario, fixture) {
  validateCallbacks(ctx);
  requireThat(typeof ctx.assertRace === 'function', 'Root-real-race-oracle-required');
  return ctx.withSerialFaultLease(async () => {
    const a = validateScope(fixture.scopeA), b = validateScope(fixture.scopeB);
    validateRequest(fixture.requestA, scenario.operationA);
    validateRequest(fixture.requestB, scenario.operationB);
    requireThat(a.sessionId !== b.sessionId, 'independent-real-worker-sessions-required');
    await ctx.assertOwned({ scenario, fixture, requireRealApiProducerReceipts: true, requireExclusiveProjects: true });
    const ids = [...new Set([...(fixture.ownedRequestIds || []), a.requestId, b.requestId, b.requestId + '_retry'])];
    const scope = { ...a, projectIds: [...new Set([...a.projectIds, ...b.projectIds])], sessionIds: [a.sessionId, b.sessionId], numberScopes: [...new Set([...(a.numberScopes || []), ...(b.numberScopes || [])])], numberPeriods: [...new Set([...(a.numberPeriods || []), ...(b.numberPeriods || [])])], rateIds: [...new Set([...(a.rateIds || []), ...(b.rateIds || [])])] };
    const before = await snapshot(ctx, scope, ids);
    const plan = buildFaultPlan(a, scenario.leaderPoint, 'pause');
    let controller, held = false, installed = false, requestA, requestB;
    try {
      controller = await ctx.openController();
      const hold = await controller.query(gateSql.tryHold(plan.gate));
      requireThat(hold.realPostgres === true && rows(hold)?.[0]?.held === true, 'race-gate-not-held');
      held = true;
      await ctx.installDDL({ plan, statements: plan.install, committedBeforeHttp: true });
      installed = true;
      requestA = startRequest(ctx, fixture.requestA, a.requestId);
      const leader = await observe(ctx, gateSql.observe(plan.gate), found => {
        requireThat(found.length <= 1, 'ambiguous-leader-pid'); return found[0];
      }, requestA, scenario.deadlineMs || 20000);
      requestB = startRequest(ctx, fixture.requestB, b.requestId);
      const contender = await observe(ctx, gateSql.behind(leader.pid), found => {
        requireThat(found.length <= 1, 'ambiguous-contender-pid'); return found[0];
      }, requestB, scenario.deadlineMs || 20000);
      await ctx.record({ phase: 'real-contention-proven', scenario: scenario.id, leaderPid: leader.pid, contenderPid: contender.pid, waitEvent: contender.wait_event, ordering: 'observed-project-row-lock-behind-trigger-barrier' });
      await controller.query(gateSql.release(plan.gate)); held = false;
      const [responseA, responseB] = await Promise.all([awaitRequest(requestA, scenario.deadlineMs || 20000), awaitRequest(requestB, scenario.deadlineMs || 20000)]);
      requireThat(responseA.status === scenario.leaderSuccessStatus && responseB.status === 409, 'race-single-winner-status');
      await ctx.cleanupDDL({ plan, statements: plan.cleanup, forbidCascade: true, boundedLockTimeoutRequired: true }); installed = false;
      const after = await snapshot(ctx, scope, ids);
      const retry = await awaitRequest(startRequest(ctx, fixture.requestB, b.requestId + '_retry'), scenario.deadlineMs || 20000);
      requireThat(retry.status === 409, 'unchanged-stale-or-occupied-loser-must-remain-conflict');
      const afterRetry = await snapshot(ctx, scope, ids);
      equal(nonAuth(after), nonAuth(afterRetry), 'loser-retry-added-business-or-audit-state');
      await ctx.assertRace({ scenario, fixture, before, after, afterRetry, responseA, responseB, retry, leaderPid: leader.pid, contenderPid: contender.pid });
      const result = { scenario: scenario.id, status: 'passed-real-callback-assertions', retries: 1, leaderStatus: responseA.status, contenderStatus: 409, retryStatus: 409, finalSnapshotSha256: hash(afterRetry) };
      await ctx.record(result); return result;
    } finally {
      if (held) await controller.query(gateSql.release(plan.gate));
      for (const request of [requestA, requestB].filter(Boolean)) if (!request.settled()) {
        try { await awaitRequest(request, scenario.deadlineMs || 20000); }
        catch (error) { await ctx.record({ phase: 'unsettled-race-cleanup-required', trigger: plan.tag, error: error.message }); }
      }
      if (installed) await ctx.cleanupDDL({ plan, statements: plan.cleanup, forbidCascade: true, boundedLockTimeoutRequired: true });
      if (controller) await controller.close();
    }
  });
}

export async function runSortedFamilyRace32(ctx, scenario, fixture) {
  validateCallbacks(ctx);
  requireThat(typeof ctx.assertFamilyRace === 'function', 'Root-real-rate-family-oracle-required');
  return ctx.withSerialFaultLease(async () => {
    const a = validateScope(fixture.scopeA), b = validateScope(fixture.scopeB);
    requireThat(a.sessionId !== b.sessionId, 'independent-real-sessions-required');
    requireThat(!a.projectIds.some(id => b.projectIds.includes(id)), 'disjoint-projects-required-for-family-lock-proof');
    validateRequest(fixture.requestA, scenario.operationA); validateRequest(fixture.requestB, scenario.operationB);
    const keys = [...new Set(fixture.realSourceFamilyKeys || [])].sort();
    requireThat(keys.length >= 2, 'two-real-source-rate-families-required');
    await ctx.assertOwned({ scenario, fixture, requireRealApiProducerReceipts: true, requireSourceFamilyDerivationFromActualRates: true, requireOppositeCostUuidAndFamilyOrdering: true });
    const last = productionFamilyGateSql(keys.at(-1)), first = productionFamilyGateSql(keys[0]);
    const scope = { ...a, projectIds: [...a.projectIds, ...b.projectIds], sessionIds: [a.sessionId, b.sessionId], rateIds: [...new Set([...(a.rateIds || []), ...(b.rateIds || [])])] };
    const ids = [...new Set([...(fixture.ownedRequestIds || []), a.requestId, b.requestId])];
    const before = await snapshot(ctx, scope, ids);
    let controller, held = false, requestA, requestB;
    try {
      controller = await ctx.openController();
      const acquired = await controller.query(last.hold);
      requireThat(acquired.realPostgres === true && rows(acquired)?.[0]?.held === true, 'production-family-controller-lock-unavailable'); held = true;
      requestA = startRequest(ctx, fixture.requestA, a.requestId);
      const leader = await observe(ctx, last.observe, found => {
        const blocked = found.filter(row => !row.granted); requireThat(blocked.length <= 1, 'ambiguous-last-family-waiter'); return blocked[0];
      }, requestA, scenario.deadlineMs || 20000);
      requestB = startRequest(ctx, fixture.requestB, b.requestId);
      const contender = await observe(ctx, first.observe, found => {
        requireThat(found.some(row => row.granted && row.pid === leader.pid), 'leader-does-not-hold-first-sorted-family');
        const blocked = found.filter(row => !row.granted); requireThat(blocked.length <= 1, 'ambiguous-first-family-waiter'); return blocked[0];
      }, requestB, scenario.deadlineMs || 20000);
      await ctx.record({ phase: 'real-sorted-family-chain-proven', leaderPid: leader.pid, contenderPid: contender.pid, firstFamilyKey: keys[0], lastFamilyKey: keys.at(-1), locks: 'A holds first and waits controller last; B waits first behind A' });
      await controller.query(last.release); held = false;
      const [responseA, responseB] = await Promise.all([awaitRequest(requestA, scenario.deadlineMs || 20000), awaitRequest(requestB, scenario.deadlineMs || 20000)]);
      requireThat(responseA.status === 201 && responseB.status === 201, 'disjoint-family-sharing-requests-did-not-both-commit');
      const after = await snapshot(ctx, scope, ids);
      await ctx.assertFamilyRace({ scenario, fixture, before, after, responseA, responseB, leaderPid: leader.pid, contenderPid: contender.pid });
      const result = { scenario: scenario.id, status: 'passed-real-callback-assertions', bothStatus: 201, finalSnapshotSha256: hash(after), retries: 0, note: 'Both disjoint operations succeed; stale duplicate retry is covered by separate races' };
      await ctx.record(result); return result;
    } finally {
      if (held) await controller.query(last.release);
      for (const request of [requestA, requestB].filter(Boolean)) if (!request.settled()) {
        try { await awaitRequest(request, scenario.deadlineMs || 20000); }
        catch (error) { await ctx.record({ phase: 'unsettled-family-request-cleanup-required', error: error.message }); }
      }
      if (controller) await controller.close();
    }
  });
}
