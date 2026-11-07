import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { data, keyOf } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';

// The only fixture SQL writer. A fresh HTTP-created user must already be owned;
// its credential must be absent, and the exact inserted PK gets a private proof.
export async function provisionCredential(ctx, actorKey) {
  const actor = ctx.state.actors[actorKey]; assert(actor?.id && actor.username);
  assert(ctx.state.owned[keyOf(ctx.database, 'platform_user', [actor.id])], 'No seed/borrowed user credential replacement');
  if (actor.credentialId) return;
  const label = ctx.next('credential'), before = await capture(ctx, `${label}-before`); assertRecorded(ctx, before);
  assert.equal(readRows(before.databases[ctx.database].tables.local_credential).filter(r => JSON.parse(r.raw).user_id === actor.id).length, 0);
  actor.password ??= randomBytes(32).toString('hex'); const id = randomUUID(); ctx.persist();
  const bcrypt = ctx.require('bcryptjs'), hash = await bcrypt.hash(actor.password, 10);
  ctx.artifact(`${label}-intent.json`, { kind: 'authentication-only-fresh-owned-credential', actorKey, userId: actor.id, credentialId: id, before: before.manifest, businessSQL: false });
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      const users = await c.query('SELECT id::text FROM poms.platform_user WHERE id=$1::uuid AND username=$2 AND is_active=true FOR UPDATE', [actor.id, actor.username]); assert.equal(users.rowCount, 1);
      const existing = await c.query('SELECT id FROM poms.local_credential WHERE user_id=$1::uuid', [actor.id]); assert.equal(existing.rowCount, 0);
      const inserted = await c.query('INSERT INTO poms.local_credential(id,user_id,password_hash) VALUES($1::uuid,$2::uuid,$3) RETURNING id::text,user_id::text', [id, actor.id, hash]);
      assert.deepEqual(inserted.rows, [{ id, user_id: actor.id }]); await c.query('COMMIT');
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  const after = await capture(ctx, `${label}-after`);
  const row = readRows(after.databases[ctx.database].tables.local_credential).find(r => r.key[0] === id); assert(row);
  ctx.own(ctx.database, 'local_credential', row, { kind: 'authentication-only-SQL-exact-INSERT', actorKey, realUserId: actor.id, credentialId: id, beforeAbsent: true, beforeSnapshot: before.manifest, afterSnapshot: after.manifest, businessFactCreated: false });
  actor.credentialId = id; ctx.persist(); assertRecorded(ctx, after);
  ctx.artifact(`${label}-complete.json`, { actorKey, credentialId: id, after: after.manifest }, { kind: 'auth-only-credential-provisioned', actorKey, businessFactCreatedBySQL: false });
}

export async function runPlatform(ctx, api) {
  assert(!ctx.state.fixtures.platformComplete, 'Already complete; do not duplicate platform fixtures');
  await api.bootstrap(); if (!ctx.state.actors.bootstrap.cookies?.poms_session) await api.login('bootstrap');
  const call = async (op, params, body, binding = {}) => data(await api.request(op, params, body, 'bootstrap', binding));
  ctx.state.fixtures.org ??= await call('PlatformController_createOrgUnit', {}, { code: `${ctx.state.prefix}-org`, name: `R4GHI ${ctx.state.prefix}`, parentId: null, displayOrder: 0 }, { responseBirths: [{ table: 'org_unit', pointer: '/id' }] }); ctx.persist();
  assert(ctx.state.fixtures.org.id); assert.equal(ctx.state.fixtures.org.isActive, true, 'Actual fresh owner organization must be active');
  const all = api.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum;
  assert(Array.isArray(all) && all.includes('project:write'));
  const profiles = {
    manager: all,
    execution: all,
    finance: all,
    person: ['project:read', 'project:write'],
    unrelated: ['project:read', 'project:write'],
    condition: ['project:read', 'project:write', 'attachment:read', 'attachment:upload'].filter(p => all.includes(p)),
  };
  ctx.state.fixtures.roles ??= {};
  for (const [key, permissions] of Object.entries(profiles)) {
    const role = ctx.state.fixtures.roles[key] ??= await call('PlatformController_createRole', {}, { roleKey: `${ctx.state.prefix}-${key}`, name: `R4GHI ${key}` }, { responseBirths: [{ table: 'role', pointer: '/id' }] }); ctx.persist();
    if (!role.permissionsBound) {
      await call('PlatformController_assignRolePermissions', { id: role.id }, { permissionKeys: permissions }, { mutableTables: ['role', 'role_permission_assignment'] });
      role.permissionsBound = true; ctx.persist();
    }
    let actor = ctx.state.actors[key];
    if (!actor) {
      const username = `${ctx.state.prefix}_${key}`, user = await call('PlatformController_createUser', {}, { username, displayName: `R4GHI ${key}`, primaryOrgUnitId: ctx.state.fixtures.org.id, initialRoleIds: [role.id] }, { responseBirths: [{ table: 'platform_user', pointer: '/id' }] });
      assert(user.id); actor = ctx.state.actors[key] = { key, id: user.id, username, permissions, cookies: {}, roleId: role.id, orgId: ctx.state.fixtures.org.id }; ctx.persist();
    }
    await provisionCredential(ctx, key);
    if (!actor.cookies?.poms_session) await api.login(key);
    assert.deepEqual(new Set(actor.permissions), new Set(permissions), 'Real current session must carry exactly the actual profile permissions');
  }
  ctx.state.fixtures.platformComplete = true; ctx.persist();
  return { kind: 'real-HTTP-platform-auth-fixture-stage', completed: true, authenticatedActors: Object.keys(profiles).length, orgCreatedThroughHTTP: true,
    rolesAndUsersCreatedThroughHTTP: true, businessFactsCreatedBySQL: false, downstreamBusinessAcceptance: 'not-run', G3Certified: false, G4Certified: false };
}
