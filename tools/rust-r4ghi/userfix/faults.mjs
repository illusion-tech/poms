import assert from 'node:assert/strict';
import { ensureFixtures, userBody, verifyUser } from './scenarios.mjs';
import { ensureControl, configure, counts } from './control.mjs';
import { capture, difference } from './snapshot.mjs';
import { sleep } from './pure.mjs';

async function sessionRow(ctx, actorKey) {
  const id = ctx.state.actors[actorKey]?.sessionId; assert(id);
  return ctx.db(async c => {
    const { rows: [row] } = await c.query("SELECT row_to_json(t)::text raw,row_version::text version,(extract(epoch FROM last_seen_at)*1000)::bigint::text last_ms,(extract(epoch FROM clock_timestamp())*1000)::bigint::text now_ms FROM poms.auth_session t WHERE id=$1", [id]);
    assert(row); return { ...row, id };
  });
}
async function waitDue(ctx, actorKey, label) {
  const throttle = Number(ctx.options['throttle-seconds']);
  assert(Number.isSafeInteger(throttle) && throttle >= 1 && throttle <= 300, 'Root must supply actual API throttle, e.g. --throttle-seconds 60; do not fabricate DB dates');
  const started = await sessionRow(ctx, actorKey);
  ctx.artifact(`${label}-natural-wait.json`, { actorKey, throttleSeconds: throttle, before: started }, { kind: 'actual-session-natural-due-wait', throttleSeconds: throttle, databaseChangedToForgeDue: false });
  for (;;) {
    const current = await sessionRow(ctx, actorKey);
    const remaining = Number(BigInt(current.last_ms) + BigInt(throttle * 1000 + 1100) - BigInt(current.now_ms));
    if (remaining <= 0) return current;
    await sleep(Math.min(remaining, 5000));
  }
}
async function assertOnlyRawTouch(ctx, before, after, sessionId, expectedDue) {
  const changes = difference(before, after);
  for (const change of changes) {
    assert.equal(change.database, ctx.database, 'Native DB must remain exactly unchanged');
    assert.equal(change.table, 'auth_session', 'No business/audit/association row may survive a required-write failure');
    assert.equal(change.added.length, 0); assert.equal(change.missing.length, 0); assert(change.changed.length <= 1);
    for (const pair of change.changed) {
      assert.deepEqual(pair.after.key, [sessionId]);
      const b = JSON.parse(pair.before.raw), a = JSON.parse(pair.after.raw);
      assert.equal(a.row_version, b.row_version + 1, 'Only prior independent raw touch may commit');
      assert(Date.parse(a.last_seen_at) > Date.parse(b.last_seen_at));
      const { rows } = await ctx.db(c => c.query("SELECT k FROM jsonb_object_keys($1::jsonb) AS keys(k) WHERE ($1::jsonb->k) IS DISTINCT FROM ($2::jsonb->k) ORDER BY k", [pair.before.raw, pair.after.raw]));
      const allowed = new Set(['last_seen_at', 'last_ip', 'idle_expires_at', 'row_version', 'updated_at']);
      assert(rows.every(r => allowed.has(r.k)), 'Raw touch changed an unapproved auth field');
    }
  }
  if (expectedDue) assert(changes.some(c => c.table === 'auth_session' && c.changed.length === 1), 'Natural due raw touch must be proven');
  return changes.map(c => ({ database: c.database, table: c.table, added: c.added.length, changed: c.changed.length, missing: c.missing.length }));
}
export async function faults(ctx, h, stage, label) {
  const fixture = await ensureFixtures(ctx, h); await ensureControl(ctx);
  const targets = stage === 'pending' ? ['auth_session'] : ['platform_user', 'user_role_assignment', 'user_org_membership', 'audit_log'];
  if (stage === 'pending') { await h.login('pendingP0001'); await h.login('pending23505'); }
  const results = [];
  const cases = targets.flatMap(target => ['P0001', '23505'].map(code => ({ target, code, constraint: 'userfix_other_unique' })));
  if (stage === 'faults') cases.push({ target: 'audit_log', code: '23505', constraint: 'platform_user_username_unique' });
  for (let index = 0; index < cases.length; index++) {
    const { target, code, constraint } = cases[index], caseLabel = `${label}-${index + 1}`;
    const actor = stage === 'pending' ? `pending${code}` : 'admin';
    if (stage === 'pending') await waitDue(ctx, actor, caseLabel);
    const body = userBody(ctx, `fi-${stage}-${index + 1}`, { initialRoleIds: [fixture.roleA, fixture.roleB], primaryOrgUnitId: fixture.orgA });
    const sessionBefore = await sessionRow(ctx, actor);
    await configure(ctx, { mode: 'fi', target_kind: target, target_username: body.username, session_id: sessionBefore.id, error_code: code, constraint_name: constraint });
    const beforeHits = await counts(ctx), before = await capture(ctx, `${caseLabel}-failure-before`);
    let response;
    try { response = await h.request('PlatformController_createUser', null, body, actor); }
    finally { await configure(ctx, { mode: '' }); }
    const after = await capture(ctx, `${caseLabel}-failure-after`), afterHits = await counts(ctx);
    assert.equal(response.status, 500, 'Every injected required-write error, including unrelated 23505, must return 500');
    assert.equal(BigInt(afterHits.hit) - BigInt(beforeHits.hit), 1n, 'Failure hook must actually execute once; status alone is not FI evidence');
    const delta = await assertOnlyRawTouch(ctx, before, after, sessionBefore.id, stage === 'pending');
    const sessionAfter = await sessionRow(ctx, actor);
    if (stage === 'pending') {
      assert.equal(BigInt(afterHits.raw) - BigInt(beforeHits.raw), 1n);
      assert.equal(BigInt(sessionAfter.version), BigInt(sessionBefore.version) + 1n);
    }
    const retry = await h.request('PlatformController_createUser', null, body, actor); assert.equal(retry.status, h.success('PlatformController_createUser'));
    await verifyUser(ctx, body, body.initialRoleIds, body.primaryOrgUnitId);
    results.push({ target, code, constraint, status: response.status, retryStatus: retry.status, hitCount: '1', rawTouchCommitted: sessionBefore.version !== sessionAfter.version, failedRequestId: response.requestId, retryRequestId: retry.requestId, delta });
    ctx.artifact(`${caseLabel}-FI-proof.json`, { target, code, constraint, body, beforeHits, afterHits, sessionBefore, sessionAfter, delta, failedRequestId: response.requestId, retryRequestId: retry.requestId, originalBoundary: 'AuthService resolves and commits due raw touch before user business transaction; user+links+create audit+second managed session update rollback together. Auth global behavior is unchanged.' }, { kind: 'required-write-real-FI-proof', target, sqlstate: code, observedFailureStatus: 500, hookHits: '1', retryStatus: retry.status, rawTouchIsSeparateCommittedPrecondition: true });
  }
  ctx.public(`${label}-${stage}-results.json`, { stage, results, requiredWriteHitProof: true, naturalThrottleOnly: stage === 'pending', businessProducerFixtureBySQL: false });
  return { stage, passed: results.length, managedPendingCovered: stage === 'pending', rawTouchRollbackClaimed: false };
}
