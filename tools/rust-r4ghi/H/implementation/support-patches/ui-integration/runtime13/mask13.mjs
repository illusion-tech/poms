// SourceBaseSHA256: 1c334f019df35b28975f433a80db196bfd091b7102124d9193bc14c95c26da46; original export body preserved except reviewed new-epoch guard.
import { bindActualContext } from './binding13.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAX, maxExpenseRequest } from '../append06/max-fixture06.mjs';
import { getSingleOwnedRoleUser } from '../append06/mask-fixture09/user-proof09.mjs';

const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
export const PERSON_PERMISSIONS = Object.freeze(['project:read', 'project:write', 'contract:finance:manage']);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const data = response => response?.body?.data ?? response?.body;
const list = value => { const rows = Array.isArray(value) ? value : value?.items; assert(Array.isArray(rows)); return rows; };
const version = value => { assert(Number.isSafeInteger(value) && value > 0 && value <= 2147483647); return value; };
const unchangedFixtures = f => Object.fromEntries(Object.entries(f).filter(([key]) => !key.startsWith('mask')));
const identity = actor => ({ id: actor.id, roleId: actor.roleId, orgId: actor.orgId, permissions: actor.permissions });
const own = (ctx, table, id) => { assert(ctx.state.owned[JSON.stringify([ctx.database, table, [id]])], 'A real owned row proof is required'); };
const exactPermissions = (actual, expected) => { assert(Array.isArray(actual)); assert.deepEqual([...actual].sort(), [...expected].sort(), 'Actual permission set differs; do not replace an unrelated or already broadened role'); };
const full = (projection, amount) => { assert.equal(projection?.mode, 'full'); assert.equal(projection.value, amount); };
const expenseNulls = expense => { for (const field of ['amountIncludingTax', 'amountExcludingTax', 'taxAmount', 'expenseDescription', 'evidenceSummary', 'voidReason']) assert.equal(expense[field], null); };
const costNulls = cost => { for (const field of ['amountIncludingTax', 'amountExcludingTax', 'taxCostAmount', 'sourceId', 'sourceRefNo', 'costDescription', 'evidenceSummary', 'taxImpactSummary', 'riskNote', 'voidReason', 'sourceStatusSummary', 'measurementBasisSummary']) assert.equal(cost[field], null); };

export function assertMaskedSourceRow(row) {
  assert.equal(row.rowKind, 'direct-cost'); assert.equal(row.sourceRef.kind, 'ProjectActualCostRecord');
  assert(['masked', 'denied'].includes(row.financialProjection.mode)); assert.equal(row.financialProjection.value, null);
  assert(typeof row.financialProjection.displayText === 'string' && row.financialProjection.displayText.length > 0);
}

/** Root executes only. New business facts exclusively use the existing public API + exact ledger. */
export async function actualMaskFixture(ctx, api, { businessDate, executionBinding, approvedBindingSHA256, bindingBytes }) {
  assert.equal(ctx.namespace, 'poms-r4ghi'); bindActualContext(ctx, executionBinding, approvedBindingSHA256, bindingBytes); assert.equal(ctx.win, ROOT);
  assert.equal(ctx.api, 'http://127.0.0.1:31441'); assert(ctx.state.baseline && !ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation && !ctx.state.activeFault);
  const f = ctx.state.fixtures, manager = ctx.state.actors.manager, person = ctx.state.actors.person;
  assert(f.maxFixtureComplete && f.maxProject && f.maxCost && f.customer?.id && f.platformComplete, 'Keep the original independent MAX06 complete and manager-visible first');
  assert(person?.id && person.roleId === f.roles?.person?.id && person.orgId === f.org?.id && person.id !== manager?.id);
  own(ctx, 'role', person.roleId); own(ctx, 'platform_user', person.id);
  const beforeFixtures = hash(unchangedFixtures(f)), beforePins = hash(ctx.state.sourcePins), beforeHelpers = hash(ctx.helperPins);
  const otherActors = Object.fromEntries(Object.entries(ctx.state.actors).filter(([key]) => key !== 'person').map(([key, actor]) => [key, identity(actor)]));
  const call = async (operationId, params = {}, body = null, actorKey = 'manager', binding = {}) => data(await api.request(operationId, params, body, actorKey, binding));
  const managerAuth = await call('AuthController_getCurrentAuthSession');
  assert(managerAuth.authenticated && managerAuth.user?.id === manager.id);
  exactPermissions(managerAuth.permissions, api.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum);
  const role = await call('PlatformController_getRole', { id: person.roleId });
  assert.equal(role.id, person.roleId); assert.equal(role.roleKey, f.roles.person.roleKey); assert(role.isActive && !role.isSystemRole); assert.equal(role.assignedUserCount, 1, 'Person role is not exclusive to one real user');
  const personUserAttempt = await api.request('PlatformController_getUser', { id: person.id }, null, 'manager');
  const beforeUser = getSingleOwnedRoleUser(ctx, personUserAttempt, { userId: person.id, role });
  const personUser = beforeUser.user; f.maskUserRoleProofBefore = beforeUser.proof; ctx.persist();
  assert(personUser.orgUnits.some(org => org.id === person.orgId && ['primary', 'secondary'].includes(org.membershipType)), 'Actual active M is missing');
  const ownerReference = await call('PlatformController_listOwnerReferenceData');
  assert(ownerReference.users.some(user => user.id === person.id && user.isActive)); assert(ownerReference.orgUnits.some(org => org.id === person.orgId && org.isActive));
  exactPermissions(role.permissionKeys, f.maskPermissionExtended ? PERSON_PERMISSIONS : ['project:read', 'project:write']);
  if (!f.maskBusinessDate) { assert(/^\d{4}-\d{2}-\d{2}$/.test(businessDate)); f.maskBusinessDate = businessDate; ctx.persist(); }
  else assert.equal(f.maskBusinessDate, businessDate);
  if (!f.maskProject) {
    f.maskProject = await call('ProjectController_create', {}, { projectName: `R4GHI-${ctx.state.prefix}-MASK-DOM`, customerId: f.customer.id, customerProjectNo: `MASK-${ctx.state.prefix}`, currentStage: 'assessment' }, 'manager',
      { responseBirths: [{ table: 'project', pointer: '/id' }], number: { scope: 'project', pointer: '/projectNo' } }); ctx.persist();
  }
  assert.notEqual(f.maskProject.id, f.project?.id); assert.notEqual(f.maskProject.id, f.maxProject.id); own(ctx, 'project', f.maskProject.id);
  if (!f.maskReassignment) {
    const before = await call('ProjectController_getById', { id: f.maskProject.id });
    assert.equal(before.scopeKind, 'full-project'); assert.equal(before.currentStage, 'assessment'); assert.equal(before.ownerUserId, manager.id); assert.equal(before.ownerOrgId, manager.orgId);
    const expenses = list(await call('ProjectCostController_listExpenseRecords', { projectId: f.maskProject.id }));
    const costs = list(await call('ProjectCostController_listProjectActualCostRecords', { projectId: f.maskProject.id }));
    assert.equal(expenses.length, f.maskExpense ? 1 : 0); if (f.maskExpense) assert.equal(expenses[0].id, f.maskExpense.id);
    assert.equal(costs.length, f.maskCostCommand ? 1 : 0); if (f.maskCostCommand) assert.equal(costs[0].id, f.maskCostCommand.targetId);
    if (!f.maskExpenseCategory) {
      const categories = list(await call('DictionaryController_list', {}, null, 'manager', { query: { domain: 'expense-category', status: 'active' } }));
      const category = categories.find(row => typeof row.code === 'string' && row.status === 'active'); assert(category); f.maskExpenseCategory = category.code; ctx.persist();
    }
    if (!f.maskExpense) {
      f.maskExpense = await call('ProjectCostController_createExpenseRecord', { projectId: f.maskProject.id }, { ...maxExpenseRequest({ businessDate, expenseCategory: f.maskExpenseCategory }), expenseDescription: '独立 MASK DOM 真实 MAX 费用，保持 MAX06 原项目不变。' }, 'manager', { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }); ctx.persist();
    }
    assert.equal(f.maskExpense.projectId, f.maskProject.id); assert.equal(f.maskExpense.contractId, null);
    expenseNulls(f.maskExpense);
    for (const [field, amount] of [['amountIncludingTax', MAX], ['amountExcludingTax', MAX], ['taxAmount', '0.00']]) { assert.equal(f.maskExpense[field], null); full(f.maskExpense.financialProjection[field], amount); }
    if (f.maskExpense.status !== 'confirmed') {
      assert.equal(f.maskExpense.status, 'recorded');
      f.maskExpense = await call('ProjectCostController_confirmExpenseRecord', { id: f.maskExpense.id }, { expectedVersion: version(f.maskExpense.rowVersion) }, 'manager',
        { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: f.maskExpense.id, requestBinding: 'path:id' }] }); ctx.persist();
    }
    assert.equal(f.maskExpense.status, 'confirmed'); assert.equal(f.maskExpense.confirmedBy, manager.id); own(ctx, 'expense_record', f.maskExpense.id);
    expenseNulls(f.maskExpense);
    if (!f.maskCostCommand) {
      f.maskCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.maskProject.id }, { costType: 'expense', expenseRecordId: f.maskExpense.id, expectedSourceVersion: version(f.maskExpense.rowVersion), costDescription: 'MASK 独立项目真实费用来源成本，金额由 E 读取。', evidenceSummary: '本次真实费用已确认，零税、CNY 与净含税金额由来源复算。' }, 'manager',
        { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist();
    }
    f.maskCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.maskCostCommand.targetId }); ctx.persist(); own(ctx, 'project_actual_cost_record', f.maskCost.id);
    assert.equal(f.maskCost.projectId, f.maskProject.id); assert.equal(f.maskCost.sourceType, 'expense-record');
    costNulls(f.maskCost);
    for (const [field, amount] of [['amountIncludingTax', MAX], ['amountExcludingTax', MAX], ['taxCostAmount', '0.00']]) { assert.equal(f.maskCost[field], null); full(f.maskCost.financialProjection[field], amount); }
    full(f.maskCost.financialProjection.sourceId, f.maskExpense.id);
    const fullPrepAttempt = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.maskProject.id }, null, 'manager', { query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' } });
    f.maskFullPreparation = data(fullPrepAttempt);
    const fullRows = f.maskFullPreparation.preparation?.sourceRows.filter(row => row.rowKind === 'direct-cost'); assert.equal(fullRows.length, 1); assert.equal(fullRows[0].sourceRef.id, f.maskCost.id);
    assert.equal(fullRows[0].financialProjection.mode, 'full'); assert.equal(f.maskFullPreparation.officialCurrent, null);
    for (const key of ['gross', 'net', 'tax']) assert.equal(fullRows[0].financialProjection.value[key].knowledge, 'known');
    assert.equal(fullRows[0].financialProjection.value.gross.value, MAX); assert.equal(fullRows[0].financialProjection.value.net.value, MAX); assert.equal(fullRows[0].financialProjection.value.tax.value, '0.00');
    f.maskTruth = { amountIncludingTax: fullRows[0].financialProjection.value.gross.value, sourceRef: fullRows[0].sourceRef, actualResponseBodySHA256: sha(fullPrepAttempt.bytes), HTTPReceipt: fullPrepAttempt.receiptId }; ctx.persist();
    const current = await call('ProjectController_getById', { id: f.maskProject.id });
    f.maskReassignment = await call('ProjectController_reassignOwner', { id: f.maskProject.id }, { ownerUserId: person.id, ownerOrgId: person.orgId, expectedVersion: version(current.projectRowVersion), reason: '独立 MASK 验收：把本项目真实销售主责改派给本 run 唯一 person，核验三权限与原主责失权。' }, 'manager',
      { responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.maskProject.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  assert.equal(f.maskReassignment.targetId, f.maskProject.id); assert.equal(f.maskReassignment.previousOwnerUserId, manager.id); assert.equal(f.maskReassignment.newOwnerUserId, person.id); assert.equal(f.maskReassignment.newOwnerOrgId, person.orgId);
  own(ctx, 'project_owner_reassignment_record', f.maskReassignment.projectOwnerReassignmentRecordId);
  if (!f.maskPermissionExtended) {
    // No mutableTables for role/permission tables: the kept two rows may not be revoked or rewritten.
    const permissionAttempt = await api.request('PlatformController_assignRolePermissions', { id: person.roleId }, { permissionKeys: PERSON_PERMISSIONS }, 'manager');
    const proofBytes = fs.readFileSync(permissionAttempt.ledger.file); assert.equal(sha(proofBytes), permissionAttempt.ledger.rawBytesSha256);
    const proof = JSON.parse(proofBytes), births = proof.recorded.filter(row => row.table === 'role_permission_assignment' && row.kind === 'birth');
    assert.equal(births.length, 1, 'Only the single new owned role permission child may be born');
    assert(!proof.recorded.some(row => row.table === 'role_permission_assignment' && row.kind !== 'birth'), 'Existing permission rows changed');
    const permissionOwn = ctx.state.owned[JSON.stringify([ctx.database, 'role_permission_assignment', births[0].key])];
    assert.equal(permissionOwn.proof.roleId, person.roleId); assert.equal(permissionOwn.proof.permissionKey, 'contract:finance:manage');
    f.maskPermissionProof = permissionAttempt.ledger; f.maskPermissionExtended = true; ctx.persist();
  }
  const finalRole = await call('PlatformController_getRole', { id: person.roleId }); assert.equal(finalRole.assignedUserCount, 1); exactPermissions(finalRole.permissionKeys, PERSON_PERMISSIONS);
  const finalUserAttempt = await api.request('PlatformController_getUser', { id: person.id }, null, 'manager');
  const afterUser = getSingleOwnedRoleUser(ctx, finalUserAttempt, { userId: person.id, role: finalRole });
  f.maskUserRoleProofAfter = afterUser.proof; ctx.persist();
  await api.login('person'); exactPermissions(ctx.state.actors.person.permissions, PERSON_PERMISSIONS);
  const actualPersonSession = await call('AuthController_getCurrentAuthSession', {}, null, 'person'); assert(actualPersonSession.authenticated && actualPersonSession.user?.id === person.id); exactPermissions(actualPersonSession.permissions, PERSON_PERMISSIONS);
  f.maskCurrentProject = await call('ProjectController_getById', { id: f.maskProject.id }, null, 'person'); assert.equal(f.maskCurrentProject.scopeKind, 'full-project'); assert.equal(f.maskCurrentProject.ownerUserId, person.id); assert.equal(f.maskCurrentProject.ownerOrgId, person.orgId);
  f.maskMaskedCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.maskCost.id }, null, 'person');
  costNulls(f.maskMaskedCost);
  for (const field of ['amountIncludingTax', 'amountExcludingTax', 'taxCostAmount']) { assert.equal(f.maskMaskedCost[field], null); assert(['masked', 'denied'].includes(f.maskMaskedCost.financialProjection[field].mode)); assert.equal(f.maskMaskedCost.financialProjection[field].value, null); }
  f.maskPreparation = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.maskProject.id }, null, 'person', { query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' } });
  const maskedRows = f.maskPreparation.preparation?.sourceRows.filter(row => row.rowKind === 'direct-cost'); assert.equal(maskedRows.length, 1); assert.equal(maskedRows[0].sourceRef.id, f.maskCost.id); assertMaskedSourceRow(maskedRows[0]);
  assert.deepEqual(maskedRows[0].sourceRef, f.maskTruth.sourceRef, 'Masked row must be the identical version/hash of the recorded real MAX cost');
  assert.equal(f.maskPreparation.officialCurrent, null);
  const managerStillAll = await call('AuthController_getCurrentAuthSession'); assert(managerStillAll.authenticated && managerStillAll.user?.id === manager.id); exactPermissions(managerStillAll.permissions, managerAuth.permissions);
  await api.request('ProjectController_getById', { id: f.maskProject.id }, null, 'manager', { expectedStatus: 404 });
  await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.maskProject.id }, null, 'manager', { query: { view: 'preparation', intent: 'snapshot-create' }, expectedStatus: 404 });
  const originalMax = await call('ProjectController_getById', { id: f.maxProject.id }); assert.equal(originalMax.scopeKind, 'full-project'); assert.equal(originalMax.ownerUserId, manager.id);
  assert.equal(hash(unchangedFixtures(f)), beforeFixtures, 'Original MAX/main fixtures were changed'); assert.equal(hash(ctx.state.sourcePins), beforePins); assert.equal(hash(ctx.helperPins), beforeHelpers);
  assert.deepEqual(Object.fromEntries(Object.entries(ctx.state.actors).filter(([key]) => key !== 'person').map(([key, actor]) => [key, identity(actor)])), otherActors);
  f.maskFixtureComplete = true; ctx.persist();
  return { kind: 'actual-independent-reassigned-three-permission-MAX-mask-fixture', completed: true, factsThroughPublicHTTP: true, projectPointer: '/fixtures/maskProject/id', truthPointer: '/fixtures/maskTruth/amountIncludingTax',
    actorKey: 'person', exactPermissions: PERSON_PERMISSIONS, originalMaxProjectPreserved: true, originalMainProjectPreserved: true, priorManagerFullAndPreparationBoth404: true, rawCompatibilityKeysNull: true,
    actualMaskedSourceProjection: true, permissionRowsRewritten: false, publishedOperatingSnapshot: false, DOMExecuted: false, G3Certified: false, G4Certified: false };
}

