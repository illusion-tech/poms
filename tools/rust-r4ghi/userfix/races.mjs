import assert from 'node:assert/strict';
import { ensureFixtures, userBody, verifyUser } from './scenarios.mjs';
import { ensureControl, configure, counts } from './control.mjs';
import { sleep } from './pure.mjs';

async function activity(ctx) {
  return ctx.db(async c => (await c.query("SELECT pid::text,wait_event_type,wait_event,query,array_to_json(pg_blocking_pids(pid))::text blockers,xact_start::text FROM pg_stat_activity WHERE datname=current_database() AND usename=$1 AND state<>'idle' ORDER BY pid", [ctx.app])).rows);
}
async function waitActivity(ctx, predicate, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const rows = await activity(ctx), match = rows.find(predicate);
    if (match) { ctx.artifact(`${label}-actual-lock-wait.json`, { match, rows }, { kind: 'actual-pg-stat-activity-lock-witness', waitEventType: match.wait_event_type, waitEvent: match.wait_event, backendPid: match.pid }); return match; }
    await sleep(100);
  }
  ctx.artifact(`${label}-missing-lock-witness.json`, { rows: await activity(ctx) }, { kind: 'lock-witness-missing', passed: false });
  throw new Error('Actual expected backend lock wait was not observed; race remains uncertified');
}
const settled = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
export async function races(ctx, h, label) {
  await ensureFixtures(ctx, h); await ensureControl(ctx);
  await h.login('raceCreate'); await h.login('raceDeactivate');
  const results = [];
  for (const kind of ['role', 'org']) for (const order of ['deactivate-first', 'create-first']) {
    const n = results.length + 1, caseLabel = `${label}-race-${n}`;
    const isRole = kind === 'role', sourceTable = isRole ? 'role' : 'org_unit';
    const fixture = await h.request(isRole ? 'PlatformController_createRole' : 'PlatformController_createOrgUnit', null, isRole ? { roleKey: `${ctx.state.prefix}-${caseLabel}`, name: `#115 race role ${n}` } : { code: `${ctx.state.prefix}-${caseLabel}`, name: `#115 race org ${n}`, parentId: null });
    assert.equal(fixture.status, h.success(isRole ? 'PlatformController_createRole' : 'PlatformController_createOrgUnit')); const id = fixture.body.id; assert(id);
    const body = userBody(ctx, `reference-race-${n}`, isRole ? { initialRoleIds: [id] } : { primaryOrgUnitId: id });
    const deactivateOp = isRole ? 'PlatformController_deactivateRole' : 'PlatformController_deactivateOrgUnit';
    const gateA = 115, gateB = 100000 + parseInt(ctx.state.prefix.slice(-6), 16) + n;
    await configure(ctx, { mode: order === 'create-first' ? 'gate-create' : 'gate-deactivate', target_kind: order === 'create-first' ? 'platform_user' : sourceTable, target_username: body.username, target_id: id, session_id: null, gate_a: gateA, gate_b: gateB });
    const before = await counts(ctx), holder = await ctx.client();
    let first, second, gateWitness, blockedWitness;
    try {
      await holder.query('SELECT pg_advisory_lock($1::integer,$2::integer)', [gateA, gateB]);
      const create = () => h.request('PlatformController_createUser', null, body, 'raceCreate');
      const deactivate = () => h.request(deactivateOp, id, { reason: '#115 controlled real reference deactivation' }, 'raceDeactivate');
      first = settled(order === 'create-first' ? create() : deactivate());
      gateWitness = await waitActivity(ctx, row => row.wait_event_type === 'Lock' && row.wait_event === 'advisory', `${caseLabel}-first`);
      assert.equal(BigInt((await counts(ctx)).gate) - BigInt(before.gate), 1n);
      second = settled(order === 'create-first' ? deactivate() : create());
      blockedWitness = await waitActivity(ctx, row => row.pid !== gateWitness.pid && row.wait_event_type === 'Lock' && JSON.parse(row.blockers).includes(Number(gateWitness.pid)), `${caseLabel}-second`);
      assert.notEqual(blockedWitness.wait_event, 'advisory', 'Second request must block on actual reference row/transaction, not its own test gate');
    } finally {
      await holder.query('SELECT pg_advisory_unlock($1::integer,$2::integer)', [gateA, gateB]).catch(() => {});
      await holder.end();
      // Preserve both original attempts even when lock admission failed.
      const settledAttempts = await Promise.all([first, second].filter(Boolean));
      ctx.artifact(`${caseLabel}-attempt-settlement.json`, settledAttempts.map(a => a.ok ? { ok: true, status: a.value.status, requestId: a.value.requestId } : { ok: false, name: a.error.name, message: a.error.message }), { kind: 'reference-race-actual-attempt-settlement', attempts: settledAttempts.length });
      await configure(ctx, { mode: '' });
    }
    const a = await first, b = await second; assert(a.ok && b.ok);
    const created = order === 'create-first' ? a.value : b.value, deactivated = order === 'create-first' ? b.value : a.value;
    assert.equal(deactivated.status, 200); assert.equal(created.status, order === 'create-first' ? h.success('PlatformController_createUser') : 409);
    await verifyUser(ctx, body, body.initialRoleIds, body.primaryOrgUnitId, order === 'create-first');
    const actual = await ctx.db(c => c.query(`SELECT is_active FROM poms.${sourceTable} WHERE id=$1`, [id])); assert.equal(actual.rows[0].is_active, false);
    results.push({ kind, order, createStatus: created.status, deactivateStatus: deactivated.status, createRequestId: created.requestId, deactivateRequestId: deactivated.requestId, gateBackendPid: gateWitness.pid, realBlockedBackendPid: blockedWitness.pid });
  }
  ctx.public(`${label}-races-results.json`, { kind: 'actual-HTTP-reference-FOR-SHARE-races', results, controlledAdvisoryGate: true, pgStatActivityObserved: true, referenceDeactivationBySQL: false });
  return { stage: 'races', passed: results.length, actualRowLockWaits: true };
}
