import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }), lock = ctx.priv + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'real-same-user-second-role-race-session123' }), { flag: 'wx', mode: 0o600 });
try {
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault);
  const key = 'manager-role-peer', m = ctx.state.actors.manager; assert(m?.id && m.username && m.password); assert(!ctx.state.actors[key]);
  ctx.state.actors[key] = { key, id: m.id, username: m.username, password: m.password, roleId: m.roleId, orgId: m.orgId, cookies: {}, permissions: [] }; ctx.persist();
  const api = createApi(ctx); await api.login(key);
  const peer = ctx.state.actors[key]; assert.equal(peer.id, m.id); assert.notEqual(peer.cookies.poms_session, m.cookies.poms_session); assert.deepEqual([...peer.permissions].sort(), [...m.permissions].sort());
  const receipt = ctx.artifact(ctx.next('role123-actual-second-session') + '.json', { kind: 'real-same-user-distinct-second-auth-session-for-public-role-race', actorKey: key, sourceActorKey: 'manager', actualUserId: m.id,
    permissionsExactlyMatchManager: true, actualDistinctSessionCookies: true, businessRowsOrRolesOrProjectOwnershipWritten: false, credentialValuesPublished: false, G3Certified: false });
  ctx.persist(); console.log(JSON.stringify({ actorKey: key, actualDistinctSameUserSession: true, receipt }));
} catch (error) {
  const partial = ctx.artifact(ctx.next('role123-peer-partial') + '.json', { name: error.name, stack: error.stack }); ctx.persist(); console.error(JSON.stringify({ status: 'partial-no-blind-replay', partial })); process.exitCode = 1;
} finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
