// Actual R2 RolePermissions removes rights by revoking owned relation rows.
// No DELETE, SQL permission fixture, seed role or table-wide mutation allowance.
import assert from 'node:assert/strict';
import { keyOf, uuid } from './pure.mjs';

export function executionRoleRevocationProof(ctx, table, beforeRow, afterRow, attempt) {
  if (table !== 'role_permission_assignment' || attempt.operationId !== 'PlatformController_assignRolePermissions'
    || attempt.status !== 200 || !attempt.responseComplete || attempt.transportFailure || attempt.actorKey !== 'manager') return null;
  const roleId = uuid(attempt.pathParams.id), wanted = attempt.requestValue?.permissionKeys;
  if (roleId !== ctx.state.fixtures.roles?.execution?.id || attempt.body?.id !== roleId
    || !Array.isArray(wanted) || JSON.stringify([...wanted].sort()) !== JSON.stringify(['project:read', 'project:write'])) return null;
  const ownedRole = ctx.state.owned[keyOf(ctx.database, 'role', [roleId])];
  const ownedRelation = ctx.state.owned[keyOf(ctx.database, table, beforeRow.key)];
  assert(ownedRole && !ownedRole.deleted && ownedRelation && !ownedRelation.deleted, 'Only this run dedicated owned EO role/relations may be restricted');
  const a = JSON.parse(beforeRow.raw), b = JSON.parse(afterRow.raw);
  if (JSON.stringify(beforeRow.key) !== JSON.stringify(afterRow.key) || a.role_id !== roleId || b.role_id !== roleId
    || wanted.includes(a.permission_key) || a.status !== 'active' || b.status !== 'revoked' || b.revoked_by !== attempt.actorId
    || typeof b.revoked_at !== 'string' || !Number.isFinite(Date.parse(b.revoked_at))) return null;
  const mutable = new Set(['status', 'revoked_at', 'revoked_by']);
  if (JSON.stringify(Object.keys(a).sort()) !== JSON.stringify(Object.keys(b).sort())
    || Object.keys(a).some(key => !mutable.has(key) && JSON.stringify(a[key]) !== JSON.stringify(b[key]))) return null;
  return { kind: 'HTTP-source-bound-exact-owned-EO-permission-revocation', roleId, relationId: beforeRow.key[0], permissionKey: a.permission_key,
    actorId: attempt.actorId, changedColumns: ['status', 'revoked_at', 'revoked_by'], beforeSHA256: beforeRow.sha256, afterSHA256: afterRow.sha256,
    sourcePin: ctx.pins.find(pin => pin.file === 'apps/poms-api-rust/src/roles/store.rs'),
    separateLegacyPermissionAndAuditTransactionsPreserved: true, physicalRelationDeleted: false };
}
