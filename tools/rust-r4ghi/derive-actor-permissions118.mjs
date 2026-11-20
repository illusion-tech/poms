// Offline evidence only. Reads successful cold snapshots and an actual new15 state.
// It never uses permission caches, invokes context/native APIs, or executes SQL/HTTP.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const O = P + '/tax15-prepare118-actor-evidence01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, hash) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), file);
  const b = fs.readFileSync(file); if (hash) assert.equal(sha(b), hash, file);
  return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } };
}
const json = p => JSON.parse(read(p.file, p.rawBytesSha256).b);
assert.equal(process.platform, 'linux');
const args = process.argv.slice(2); assert.equal(args.length, 4); assert.deepEqual([args[0], args[2]], ['--state', '--state-sha']);
assert.equal(args[1], P + '/business/g2-business15/main01/state.json');
assert(!fs.existsSync(O));
const statePin = read(args[1], args[3]).pin, state = json(statePin);
assert.equal(state.namespace, 'poms-r4ghi'); assert.equal(state.epoch, 'g2-business15'); assert.equal(state.run, 'main01');
const actorId = state.actors.manager.id; assert(/^[0-9a-f-]{36}$/.test(actorId));
const registry = json(state.codeEpochAdmission15.registry), parent = json(registry.producerState);
assert.equal(registry.producerState.rawBytesSha256, 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97');
assert.equal(parent.actors.manager.id, actorId);
const commandPin = read(P + '/observe15-119-prepared02/run01/command-receipt.json', '44f6c4d8150b42de61fb7c071d897123e47c8f54d53ee65d799cb772952cd93b').pin;
const command = json(commandPin); assert.equal(command.exitCode, 0);
const result = json(command.stdout), coldPin = result.receipt, cold = json(coldPin);
assert.equal(coldPin.rawBytesSha256, '8f2543fa1d353ba0d3b2611778b85edf1c27754c1895a1b35575941fe717f620');
assert.equal(cold.kind, 'actual-source15-state-free-M98-observation119'); assert.equal(cold.stableObservations.length, 2);
assert.equal(cold.retainedSnapshot.rawBytesSha256, cold.stableObservations[1].rawBytesSha256);
const tables = ['platform_user', 'user_role_assignment', 'role', 'role_permission_assignment'];
function projection(snapshotPin) {
  const snapshot = json(snapshotPin); assert.equal(snapshot.epoch, 'g2-business15');
  const descriptors = snapshot.databases.poms_r4ghi_rust.tables, provenance = {};
  const rows = Object.fromEntries(tables.map(table => {
    const descriptor = descriptors[table], file = read(descriptor.file, descriptor.rawBytesSha256);
    const lines = file.b.toString().split('\n').filter(Boolean).map(JSON.parse); assert.equal(lines.length, descriptor.count);
    const values = lines.map(row => { assert.equal(sha(row.raw), row.sha256); return JSON.parse(row.raw); });
    provenance[table] = { ...file.pin, count: values.length };
    return [table, values];
  }));
  const users = rows.platform_user.filter(row => row.id === actorId);
  assert.equal(users.length, 1, 'Manager must match one real platform account'); assert.equal(users[0].is_active, true);
  const assigned = new Set(rows.user_role_assignment.filter(row => row.user_id === actorId && row.status === 'active').map(row => row.role_id));
  const activeRoles = new Set(rows.role.filter(row => assigned.has(row.id) && row.is_active).map(row => row.id));
  const permissions = [...new Set(rows.role_permission_assignment.filter(row => activeRoles.has(row.role_id) && row.status === 'active').map(row => row.permission_key))].sort();
  assert(permissions.every(permission => typeof permission === 'string' && permission.length > 0));
  return { actorId, accountIsActive: true, activeRoleIds: [...activeRoles].sort(), permissions, provenance };
}
const a = projection(cold.stableObservations[0]), b = projection(cold.stableObservations[1]);
assert.deepEqual({ ...a, provenance: null }, { ...b, provenance: null });
read(statePin.file, statePin.rawBytesSha256);
fs.mkdirSync(O, { mode: 0o700 });
const file = O + '/manager-permissions-facts118.json';
fs.writeFileSync(file, JSON.stringify({
  kind: 'Root-actual-offline-Source15-manager-permission-evidence118', source15State: statePin,
  actualColdObservation: coldPin, actualColdCommand: commandPin, actualSnapshots: cold.stableObservations,
  actorId, accountIsActive: true, activeRoleIds: b.activeRoleIds, expectedActorPermissions: b.permissions,
  bothSnapshotTableProvenance: [a.provenance, b.provenance], fullSetNotSubset: true,
  exactRuleSource: 'tax15-once-effects.mjs permissionSet118; no additional filters',
  currentRuntimeFreshAccountRolePermissionSessionChecksStillRequired: true,
  ordinaryContextCreated: false, SQLHTTP: false, permissionGrantedOrChanged: false, actualG2Authorized: false,
}, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ evidence: read(file).pin, permissionCount: b.permissions.length, ordinaryContextCreated: false, SQLHTTP: false }));
