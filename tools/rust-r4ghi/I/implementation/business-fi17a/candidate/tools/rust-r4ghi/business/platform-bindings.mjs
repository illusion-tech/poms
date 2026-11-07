// Existing R2 role/org commands deliberately use separate business/audit TXs
// and NULL request_id. This is source-bound fixture ownership, not a claim that
// those legacy command transactions are atomic.
import assert from 'node:assert/strict';
import { uuid, keyOf, valueAt } from './pure.mjs';

const createAudit = {
  PlatformController_createOrgUnit: { table: 'org_unit', event: 'platform.org-unit.created', type: 'OrgUnit', source: 'apps/poms-api-rust/src/org_units/store.rs' },
  PlatformController_createRole: { table: 'role', event: 'platform.role.created', type: 'PlatformRole', source: 'apps/poms-api-rust/src/roles/store.rs' },
  PlatformController_createUser: { table: 'platform_user', event: 'platform.user.created', type: 'PlatformUser', source: 'apps/poms-api-rust/src/users/store.rs' },
};
export function platformBirthProof(ctx, table, row, attempt, anchors) {
  if (!(attempt.status >= 200 && attempt.status < 300 && attempt.responseComplete)) return null;
  const cell = JSON.parse(row.raw), create = createAudit[attempt.operationId];
  if (table === 'audit_log' && create) {
    const target = valueAt(attempt.body, '/id'), anchor = anchors.find(a => a.table === create.table && a.id === target);
    if (anchor && cell.event_type === create.event && cell.target_type === create.type && cell.target_id === target && cell.operator_id === attempt.actorId && cell.result === 'success') {
      return { kind: 'HTTP-source-bound-exact-new-target-audit', targetTable: create.table, targetId: target, exactEvent: create.event, exactOperatorId: attempt.actorId,
        sourcePin: ctx.pins.find(pin => pin.file === create.source), separateLegacyAuditTransactionPreserved: true };
    }
  }
  if (attempt.operationId !== 'PlatformController_assignRolePermissions') return null;
  const roleId = uuid(attempt.pathParams.id), owned = ctx.state.owned[keyOf(ctx.database, 'role', [roleId])];
  assert(owned && !owned.deleted && attempt.body?.id === roleId, 'Permission child/audit birth requires the actual response for this newly owned role');
  if (table === 'role_permission_assignment' && cell.role_id === roleId && cell.status === 'active' && cell.assigned_by === attempt.actorId && attempt.requestValue?.permissionKeys?.includes(cell.permission_key)) {
    return { kind: 'HTTP-source-bound-exact-owned-role-permission-child', roleId, permissionKey: cell.permission_key, exactOperatorId: attempt.actorId,
      sourcePin: ctx.pins.find(pin => pin.file === 'apps/poms-api-rust/src/roles/store.rs'), independentPermissionTransactionPreserved: true };
  }
  if (table === 'audit_log' && cell.event_type === 'platform.role.permissions.replaced' && cell.target_type === 'PlatformRole' && cell.target_id === roleId && cell.operator_id === attempt.actorId && cell.result === 'success') {
    return { kind: 'HTTP-source-bound-exact-owned-role-permission-audit', roleId, exactEvent: cell.event_type, exactOperatorId: attempt.actorId,
      sourcePin: ctx.pins.find(pin => pin.file === 'apps/poms-api-rust/src/roles/store.rs'), separateLegacyAuditTransactionPreserved: true };
  }
  return null;
}
