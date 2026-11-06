import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { api } from './http.mjs';
import { capture } from './snapshot.mjs';

const userBody = (ctx, suffix, extra = {}) => ({ username: `${ctx.state.prefix}-${ctx.phaseLabel ?? 'stage'}-${suffix}`, displayName: `#115 ${suffix}`, primaryOrgUnitId: null, initialRoleIds: [], ...extra });
export { userBody };
export async function ensureFixtures(ctx, h) {
  if (!ctx.state.actors.admin?.id) await h.login('admin');
  const fixture = ctx.state.fixtures;
  for (const key of ['roleA', 'roleB', 'roleInactive']) if (!fixture[key]) {
    const r = await h.request('PlatformController_createRole', null, { roleKey: `${ctx.state.prefix}-${key}`, name: `#115 ${key}` });
    assert.equal(r.status, h.success('PlatformController_createRole')); assert(r.body?.id); fixture[key] = r.body.id; ctx.persist();
  }
  for (const key of ['orgA', 'orgInactive']) if (!fixture[key]) {
    const r = await h.request('PlatformController_createOrgUnit', null, { code: `${ctx.state.prefix}-${key}`, name: `#115 ${key}`, parentId: null, displayOrder: 0 });
    assert.equal(r.status, h.success('PlatformController_createOrgUnit')); assert(r.body?.id); fixture[key] = r.body.id; ctx.persist();
  }
  if (!fixture.inactiveReady) {
    assert.equal((await h.request('PlatformController_deactivateRole', fixture.roleInactive, { reason: '#115 actual inactive reference fixture' })).status, 200);
    assert.equal((await h.request('PlatformController_deactivateOrgUnit', fixture.orgInactive, { reason: '#115 actual inactive reference fixture' })).status, 200);
    fixture.inactiveReady = true; ctx.persist();
  }
  return fixture;
}
export async function verifyUser(ctx, body, expectedRoles, expectedOrg, expectExists = true) {
  return ctx.db(async c => {
    const { rows } = await c.query('SELECT id::text,primary_org_unit_id::text FROM poms.platform_user WHERE username=$1', [body.username]);
    assert.equal(rows.length, expectExists ? 1 : 0);
    if (!expectExists) return null;
    const id = rows[0].id; assert.equal(rows[0].primary_org_unit_id, expectedOrg?.toLowerCase() ?? null);
    const roles = (await c.query("SELECT role_id::text,status FROM poms.user_role_assignment WHERE user_id=$1 ORDER BY role_id", [id])).rows;
    assert.deepEqual(roles, [...expectedRoles].map(id => id.toLowerCase()).sort().map(role_id => ({ role_id, status: 'active' })));
    const memberships = (await c.query('SELECT org_unit_id::text,membership_type,status FROM poms.user_org_membership WHERE user_id=$1 ORDER BY id', [id])).rows;
    assert.deepEqual(memberships, expectedOrg ? [{ org_unit_id: expectedOrg.toLowerCase(), membership_type: 'primary', status: 'active' }] : []);
    const audit = (await c.query("SELECT after_snapshot::text raw FROM poms.audit_log WHERE event_type='platform.user.created' AND target_id=$1", [id])).rows;
    assert.equal(audit.length, 1);
    const after = JSON.parse(audit[0].raw);
    assert.equal(after.username, body.username);
    assert.equal(after.primaryOrgUnitId?.toLowerCase() ?? null, expectedOrg?.toLowerCase() ?? null);
    assert.deepEqual([...after.initialRoleIds].map(v => v.toLowerCase()).sort(), expectedRoles.map(v => v.toLowerCase()).sort());
    ctx.artifact(`${ctx.next('user-proof')}.json`, { body, actualId: id, roles, memberships, audit }, { kind: 'actual-PG-user-association-and-create-audit-proof', userId: id, roleCount: roles.length, primaryMembershipCount: memberships.length });
    return id;
  });
}
async function smoke(ctx, h) {
  const f = await ensureFixtures(ctx, h), results = [];
  const cases = [
    ['none', {}], ['one-role', { initialRoleIds: [f.roleA] }], ['two-roles', { initialRoleIds: [f.roleB, f.roleA] }],
    ['org-only', { primaryOrgUnitId: f.orgA }], ['combined', { primaryOrgUnitId: f.orgA, initialRoleIds: [f.roleA, f.roleB] }],
    ['uuid-uppercase', { primaryOrgUnitId: f.orgA.toUpperCase(), initialRoleIds: [f.roleA.toUpperCase()] }],
  ];
  for (const [name, extra] of cases) {
    const body = userBody(ctx, name, extra), r = await h.request('PlatformController_createUser', null, body);
    assert.equal(r.status, h.success('PlatformController_createUser')); assert(/^[0-9a-f-]{36}$/i.test(r.body?.id));
    const id = await verifyUser(ctx, body, body.initialRoleIds, body.primaryOrgUnitId);
    assert.equal(id, r.body.id);
    const detail = await h.request('PlatformController_getUser', id, null); assert.equal(detail.status, 200);
    // Detail hydration is also an actual HTTP consumer, not a manufactured DTO.
    assert.equal(detail.body.id, id);
    assert.equal(detail.body.primaryOrgUnitId?.toLowerCase() ?? null, body.primaryOrgUnitId?.toLowerCase() ?? null);
    const expectedNames = body.initialRoleIds.map(role => role.toLowerCase() === f.roleA ? '#115 roleA' : '#115 roleB').sort();
    assert.deepEqual([...detail.body.roleNames].sort(), expectedNames);
    assert.deepEqual(detail.body.orgUnits.map(o => ({ id: o.id, membershipType: o.membershipType })), body.primaryOrgUnitId ? [{ id: body.primaryOrgUnitId.toLowerCase(), membershipType: 'primary' }] : []);
    results.push({ name, status: r.status, userId: id, requestId: r.requestId });
  }
  const bad = [
    ['role-duplicate', { initialRoleIds: [f.roleA, f.roleA] }, 409],
    ['role-case-duplicate', { initialRoleIds: [f.roleA, f.roleA.toUpperCase()] }, 409],
    ['role-unknown', { initialRoleIds: [randomUUID()] }, 404],
    ['role-inactive', { initialRoleIds: [f.roleInactive] }, 409],
    ['org-unknown', { primaryOrgUnitId: randomUUID() }, 404],
    ['org-inactive', { primaryOrgUnitId: f.orgInactive }, 409],
    ['role-malformed', { initialRoleIds: ['not-a-uuid'] }, 400],
    ['org-malformed', { primaryOrgUnitId: 'not-a-uuid' }, 400],
  ];
  for (const [name, extra, status] of bad) {
    const body = userBody(ctx, name, extra), r = await h.request('PlatformController_createUser', null, body);
    assert.equal(r.status, status); await verifyUser(ctx, body, [], null, false);
    results.push({ name, status: r.status, requestId: r.requestId });
  }
  await h.login('viewer', 'viewer'); assert(!ctx.state.actors.viewer.permissions.includes('platform:users:manage'));
  for (const [name, actor, meta, status] of [['anonymous', 'anonymous', {}, 401], ['forbidden', 'viewer', {}, 403], ['csrf-omit', 'admin', { csrf: 'omit' }, 403], ['csrf-wrong', 'admin', { csrf: 'wrong' }, 403]]) {
    const body = userBody(ctx, name), r = await h.request('PlatformController_createUser', null, body, actor, meta);
    assert.equal(r.status, status); await verifyUser(ctx, body, [], null, false); results.push({ name, status: r.status, requestId: r.requestId });
  }
  await h.login('concurrentA'); await h.login('concurrentB');
  const duplicate = userBody(ctx, 'same-name-race', { initialRoleIds: [f.roleA], primaryOrgUnitId: f.orgA });
  const pair = await Promise.all([h.request('PlatformController_createUser', null, duplicate, 'concurrentA'), h.request('PlatformController_createUser', null, duplicate, 'concurrentB')]);
  assert.deepEqual(pair.map(r => r.status).sort((a, b) => a - b), [h.success('PlatformController_createUser'), 409]);
  await verifyUser(ctx, duplicate, [f.roleA], f.orgA);
  results.push({ name: 'same-username-concurrent', statuses: pair.map(r => r.status), requestIds: pair.map(r => r.requestId) });
  ctx.public(`${ctx.next('smoke-results')}.json`, { kind: 'real-HTTP-PG-userfix-smoke', results, caseCount: results.length, fixturesViaDeliveredHTTP: true, faultAndLockRaceCoverageClaimed: false });
  return { stage: 'smoke', passed: results.length, pending: ['faults', 'pending-session', 'reference-lock-races'] };
}
export async function runStage(ctx, stage, label) {
  assert(['smoke', 'faults', 'pending', 'races', 'reconcile-roleA'].includes(stage));
  assert(!ctx.state.stages?.[stage], 'Completed stage cannot be overwritten in this run');
  ctx.phaseLabel = label;
  const before = await capture(ctx, `${label}-before`), h = api(ctx);
  let result;
  try {
    if (stage === 'reconcile-roleA') result = await (await import('./reconcile.mjs')).reconcileObservedRoleA(ctx, label);
    else if (stage === 'smoke') result = await smoke(ctx, h);
    else if (stage === 'races') result = await (await import('./races.mjs')).races(ctx, h, label);
    else result = await (await import('./faults.mjs')).faults(ctx, h, stage, label);
    ctx.state.stages ??= {}; ctx.state.stages[stage] = { label, at: new Date().toISOString(), result }; ctx.persist();
    return result;
  } finally {
    const after = await capture(ctx, `${label}-after`);
    ctx.artifact(`${label}-stage-snapshots.json`, { stage, before: before.manifest, after: after.manifest, completed: Boolean(result) }, { kind: 'full-stage-private-increment', stage, completed: Boolean(result) });
  }
}
