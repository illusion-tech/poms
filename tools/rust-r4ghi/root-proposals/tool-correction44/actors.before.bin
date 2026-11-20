import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { sha, uuid } from './pure.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { allowBorrowed } from './ledger.mjs';

// Reuse an actual original dev-seeder credential privately, without changing
// that user's password, role assignments, org memberships or business data.
export function registerOriginalSeedActor(ctx, api, userId, actorKey) {
  uuid(userId);
  const file = `${ctx.win}/apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts`, bytes = fs.readFileSync(file);
  const pin = { file, rawBytesSha256: sha(bytes) };
  if (ctx.state.devSeedCredentialSource) assert.deepEqual(ctx.state.devSeedCredentialSource, pin); else ctx.state.devSeedCredentialSource = pin;
  const ts = ctx.require('typescript'), source = ts.transpileModule(bytes.toString('utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }, all = api.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => { assert.equal(name, '@poms/shared-contracts'); return { PERMISSION_KEYS: all }; } }, { filename: 'private-original-dev-seeder-fixtures', timeout: 5000 });
  const candidate = module.exports.DEV_USERS.find(user => user.id === userId); assert(candidate?.username && candidate.password, 'Actual approver/participant is not a known logged-in fixture or original dev-seeder actor; Root must provide its real session');
  const original = readRows(loadSnapshot(ctx).databases[ctx.database].tables.platform_user).find(row => row.key[0] === userId);
  assert(original && JSON.parse(original.raw).username === candidate.username && JSON.parse(original.raw).is_active === true);
  allowBorrowed(ctx, 'platform_user', original.key, ['last_login_at', 'updated_at', 'row_version'], 'Original dev-seeder actual designated approver authentication only; preserve password, roles and org memberships');
  const key = actorKey ?? `seed${sha(userId).slice(0, 10)}`;
  if (ctx.state.actors[key]) { assert.equal(ctx.state.actors[key].id, userId); return key; }
  ctx.state.actors[key] = { key, id: userId, username: candidate.username, password: candidate.password, cookies: {}, permissions: [], borrowedSeedUser: true, source: pin }; ctx.persist();
  return key;
}
export async function actualActorFor(ctx, api, userId) {
  uuid(userId);
  const known = Object.entries(ctx.state.actors).find(([, actor]) => actor.id === userId);
  const key = known ? known[0] : registerOriginalSeedActor(ctx, api, userId);
  if (!ctx.state.actors[key].cookies?.poms_session) await api.login(key); return key;
}
