import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = (database, table, key) => JSON.stringify([database, table, key]);

/** Existing captured rows only. No SQL/HTTP, inferred role names, or permission-table mutation. */
export function assertSingleOwnedRoleMembership({ database, userId, roleId, rows, owned }) {
  const parsed = rows.map(row => { assert.equal(sha(Buffer.from(row.raw)), row.sha256, 'Captured role-link row bytes changed'); return { row, cell: JSON.parse(row.raw) }; });
  for (const { cell } of parsed.filter(({ cell }) => cell.user_id === userId || cell.role_id === roleId)) {
    assert(['active', 'revoked'].includes(cell.status), 'Unknown role-link status cannot prove a single active role');
    if (cell.status === 'active') assert.equal(cell.revoked_at, null, 'Inconsistent active/revoked role link cannot be treated as absent');
  }
  const active = parsed.filter(({ cell }) => cell.status === 'active' && cell.revoked_at === null);
  const forUser = active.filter(({ cell }) => cell.user_id === userId), forRole = active.filter(({ cell }) => cell.role_id === roleId);
  assert.equal(forUser.length, 1, 'Actual captured person has more or fewer than one active role link');
  assert.equal(forRole.length, 1, 'Actual captured role is shared with another active role link');
  const { row, cell } = forUser[0]; assert.equal(cell.role_id, roleId); assert.equal(forRole[0].cell.user_id, userId); assert.deepEqual(forRole[0].row.key, row.key);
  const authority = owned[keyOf(database, 'user_role_assignment', row.key)];
  assert(authority && !authority.deleted, 'Actual person-role FK must have a pre-existing owned birth proof');
  assert.equal(authority.latestSha256, row.sha256, 'Current role-link bytes differ from the exact ledger'); assert.equal(authority.latestXmin, row.xmin, 'Current role-link xmin differs from the exact ledger');
  return { table: 'user_role_assignment', key: row.key, userId, roleId, rowRawSha256: row.sha256, xmin: row.xmin };
}

function privateInput(ctx, file) {
  const root = path.resolve(ctx.priv), resolved = path.resolve(file), relative = path.relative(root, resolved);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Captured proof must stay inside this private business run');
  const stat = fs.lstatSync(resolved); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(resolved), resolved);
  return fs.readFileSync(resolved);
}

export function getSingleOwnedRoleUser(ctx, attempt, { userId, role }) {
  assert.equal(attempt.operationId, 'PlatformController_getUser'); assert.equal(attempt.pathParams.id, userId); assert.equal(attempt.actorKey, 'manager');
  assert.equal(attempt.status, 200); assert.equal(attempt.responseComplete, true);
  const user = attempt.body?.data ?? attempt.body;
  assert.equal(user.id, userId); assert.equal(user.isActive, true); assert.equal(role.assignedUserCount, 1); assert(role.isActive && !role.isSystemRole);
  // Formal PlatformUserDetail has roleNames and orgUnits. It has no roles or permissions keys.
  assert.deepEqual(user.roleNames, [role.name], 'Formal user detail is not the one expected role name');
  const pin = attempt.after; assert(pin?.file && pin.rawBytesSha256, 'Actual getUser after-snapshot pin is required');
  const manifestBytes = privateInput(ctx, pin.file); assert.equal(sha(manifestBytes), pin.rawBytesSha256);
  const manifest = JSON.parse(manifestBytes); assert.equal(manifest.marker, ctx.identity.marker); assert.equal(manifest.epoch, ctx.epoch); assert.equal(manifest.run, ctx.run);
  const table = manifest.databases[ctx.database].tables.user_role_assignment, bytes = privateInput(ctx, table.file); assert.equal(sha(bytes), table.rawBytesSha256);
  const rows = bytes.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const link = assertSingleOwnedRoleMembership({ database: ctx.database, userId, roleId: role.id, rows, owned: ctx.state.owned });
  return { user, proof: { kind: 'formal-user-detail-plus-actual-captured-unique-owned-FK', operationId: attempt.operationId, HTTPReceipt: attempt.receiptId, actualResponseBodySha256: sha(attempt.bytes), snapshotManifest: pin, ...link } };
}
