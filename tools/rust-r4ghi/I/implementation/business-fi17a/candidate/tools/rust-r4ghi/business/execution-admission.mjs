import assert from 'node:assert/strict';
import { data, uuid, keyOf } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';

const permissions = Object.freeze(['project:read', 'project:write']);
export async function restrictExecutionRole(ctx, api) {
  const f = ctx.state.fixtures, actor = ctx.state.actors.execution, role = f.roles?.execution;
  assert(f.handoverComplete && !f.executionComplete && actor && role && role.id === actor.roleId);
  assert(ctx.state.owned[keyOf(ctx.database, 'role', [uuid(role.id)])], 'Never restrict an original/shared seed role');
  if (!f.executionMinimalRole) {
    const before = await capture(ctx, ctx.next('eo-role-before')); assertRecorded(ctx, before);
    const memberships = readRows(before.databases[ctx.database].tables.user_role_assignment).map(row => ({ row, value: JSON.parse(row.raw) }))
      .filter(({ value }) => value.role_id === role.id && value.status === 'active');
    assert.equal(memberships.length, 1, 'This dedicated new EO role must not affect any other user');
    assert.equal(memberships[0].value.user_id, actor.id);
    assert(ctx.state.owned[keyOf(ctx.database, 'user_role_assignment', memberships[0].row.key)]);
    const result = await api.request('PlatformController_assignRolePermissions', { id: role.id }, { permissionKeys: [...permissions] }, 'manager',
      { mutableTables: ['role'], executionRoleNarrowing: true });
    assert.equal(data(result).id, role.id);
    f.executionMinimalRole = { roleId: role.id, commandReceipt: result.receiptId, actualBefore: before.manifest, expectedPermissions: [...permissions] }; ctx.persist();
  }
  await api.login('execution');
  assert.deepEqual([...actor.permissions].sort(), [...permissions], 'Actual EO session must have exactly project:read/write');
  assert(!actor.permissions.includes('commission:assignments:manage'));
  f.executionMinimalRole.effectivePermissionsObserved = true; ctx.persist();
}

export async function executionAdmissionFromEO(ctx, api) {
  const f = ctx.state.fixtures;
  assert(f.executionMinimalRole?.effectivePermissionsObserved && f.roleAssignment && !f.executionComplete);
  if (!f.executionRoleGetDenied) {
    const current = await api.request('CommissionController_getCurrentRoleAssignment', { projectId: f.project.id }, null, 'execution', { expectedStatus: 403 });
    const detail = await api.request('CommissionRoleAssignmentController_getRoleAssignmentDetail', { id: f.roleAssignment.id }, null, 'execution', { expectedStatus: 403 });
    f.executionRoleGetDenied = { currentReceipt: current.receiptId, detailReceipt: detail.receiptId }; ctx.persist();
  }
  const observed = await api.request('ProjectController_getById', { id: f.project.id }, null, 'execution');
  const project = data(observed), context = project.executionAdmissionContext;
  assert.equal(project.scopeKind, 'full-project'); assert.equal(project.currentStage, 'handover');
  assert(context && typeof context === 'object' && !Array.isArray(context));
  const start = api.spec.components.schemas.StartProjectExecutionRequest;
  const keys = Object.keys(start.properties).filter(key => !['inputVersion', 'expectedProjectVersion', 'reason'].includes(key)).sort();
  assert.equal(keys.length, 6); assert.deepEqual(Object.keys(context).sort(), keys);
  assert.equal(uuid(context.handoverStageRecordId), project.currentStageRecordId);
  assert.equal(uuid(context.commissionRoleAssignmentId), f.roleAssignment.id);
  for (const key of ['handoverSummarySnapshotId', 'sourceHandoverId']) uuid(context[key]);
  assert(Number.isSafeInteger(context.expectedRoleAssignmentVersion) && context.expectedRoleAssignmentVersion > 0 && context.expectedRoleAssignmentVersion <= 2147483647);
  assert(/^[a-f0-9]{64}$/.test(context.sourcePayloadHash));
  assert(Number.isSafeInteger(project.projectRowVersion) && project.projectRowVersion > 0 && project.projectRowVersion <= 2147483647);
  f.executionAdmissionFromEO = { projectDetailReceipt: observed.receiptId, permissionKeys: [...ctx.state.actors.execution.permissions], context, projectRowVersion: project.projectRowVersion };
  ctx.persist();
  return { project, body: { ...context, inputVersion: 'server-derived-v1', expectedProjectVersion: project.projectRowVersion,
    reason: '真实EO仅以ProjectRead/Write读取本人的真实执行准入六项并提交；没有RoleGET权限，不由manager/SQL代构。' } };
}
