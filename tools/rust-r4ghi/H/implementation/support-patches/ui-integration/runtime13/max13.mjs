// SourceBaseSHA256: 8e1930300d1cf08e2e945626d16aa4b9e7c973edfa1e0ee3fdaa3b258afee269; original export body preserved except reviewed new-epoch guard.
import { bindActualContext } from './binding13.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
export const MAX = '9999999999999999.99';
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rv = (value) => { assert(Number.isSafeInteger(value?.rowVersion) && value.rowVersion > 0 && value.rowVersion <= 2147483647); return value.rowVersion; };
const rows = (value) => { const result = Array.isArray(value) ? value : value?.items; assert(Array.isArray(result), 'Actual list response is not an array/list'); return result; };
const data = (response) => response?.body?.data ?? response?.body;
const ordinaryFixtures = (fixtures) => Object.fromEntries(Object.entries(fixtures).filter(([key]) => !key.startsWith('max')));

export function maxExpenseRequest({ businessDate, expenseCategory }) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(businessDate)); assert(typeof expenseCategory === 'string' && expenseCategory.length > 0);
  return { contractId: null, expenseCategory, expenseDescription: '独立 MAX 精确金额 DOM 验收费用；不纳入主项目来源。', expenseDate: businessDate, currency: 'CNY',
    amountIncludingTax: MAX, amountExcludingTax: MAX, taxAmount: '0.00', sourceType: 'manual', evidenceSummary: 'Root 授权的独立 assessment 项目，一笔真实费用、零税和真实 E 成本来源。', attachmentCount: 0 };
}

function fullProjection(projection, expected) {
  assert.equal(projection?.mode, 'full', 'Actual finance projection is not authorized');
  assert.equal(projection.value, expected, 'Actual producer did not preserve the exact amount');
}
function expenseAssertions(expense, projectId) {
  assert.equal(expense.projectId, projectId); assert.equal(expense.contractId, null); assert.equal(expense.currency, 'CNY');
  for (const field of ['amountIncludingTax', 'amountExcludingTax', 'taxAmount', 'expenseDescription', 'evidenceSummary', 'voidReason']) assert.equal(expense[field], null, 'Expense raw compatibility keys must stay literal null');
  fullProjection(expense.financialProjection?.amountIncludingTax, MAX); fullProjection(expense.financialProjection?.amountExcludingTax, MAX); fullProjection(expense.financialProjection?.taxAmount, '0.00');
}
function costAssertions(cost, projectId, expenseId) {
  assert.equal(cost.projectId, projectId); assert.equal(cost.costType, 'expense'); assert.equal(cost.sourceType, 'expense-record'); assert.equal(cost.currency, 'CNY');
  for (const field of ['amountIncludingTax', 'amountExcludingTax', 'taxCostAmount', 'sourceId', 'sourceRefNo', 'costDescription', 'evidenceSummary', 'taxImpactSummary', 'riskNote', 'voidReason']) assert.equal(cost[field], null, 'Cost raw compatibility keys must stay literal null');
  fullProjection(cost.financialProjection?.amountIncludingTax, MAX); fullProjection(cost.financialProjection?.amountExcludingTax, MAX); fullProjection(cost.financialProjection?.taxCostAmount, '0.00');
  fullProjection(cost.financialProjection?.sourceId, expenseId);
}

/** Root-only runtime. Every business birth/update uses its existing recorded HTTP API.
 * The imported observer owns before/after snapshots, exact births and number ledgers.
 * This function has no SQL, no lifecycle shortcut, no direct cost INSERT, and no snapshot capture command.
 */
export async function actualMaxFixture(ctx, api, { businessDate, executionBinding, approvedBindingSHA256, bindingBytes }) {
  assert.equal(ctx.namespace, 'poms-r4ghi'); bindActualContext(ctx, executionBinding, approvedBindingSHA256, bindingBytes);
  assert.equal(ctx.win, ROOT); assert.equal(ctx.api, 'http://127.0.0.1:31441');
  assert(ctx.state.baseline && !ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation && !ctx.state.activeFault);
  const f = ctx.state.fixtures, manager = ctx.state.actors.manager;
  assert(f.platformComplete && f.customer?.id && manager?.id && manager.orgId === f.org?.id, 'Real customer, personal M and active org are prerequisites');
  const previous = hash(ordinaryFixtures(f)), sourcePins = hash(ctx.state.sourcePins), helperPins = hash(ctx.helperPins);
  const call = async (operationId, params = {}, body = null, binding = {}) => data(await api.request(operationId, params, body, 'manager', binding));
  const auth = await call('AuthController_getCurrentAuthSession');
  assert(auth.authenticated && auth.user?.id === manager.id);
  for (const permission of ['project:read', 'project:write', 'contract:finance:manage', 'operating:finance:sensitive:read']) assert(auth.permissions.includes(permission), 'Real manager actor lacks the existing producer/projection permission');
  if (f.maxBusinessDate) assert.equal(f.maxBusinessDate, businessDate, 'Do not silently change the established fixture date');
  else { assert(/^\d{4}-\d{2}-\d{2}$/.test(businessDate), 'Root must explicitly supply the real business date'); f.maxBusinessDate = businessDate; ctx.persist(); }
  if (!f.maxProject) {
    f.maxProject = await call('ProjectController_create', {}, { projectName: `R4GHI-${ctx.state.prefix}-MAX-DOM`, customerId: f.customer.id, customerProjectNo: `MAX-${ctx.state.prefix}`, currentStage: 'assessment' },
      { responseBirths: [{ table: 'project', pointer: '/id' }], number: { scope: 'project', pointer: '/projectNo' } }); ctx.persist();
  }
  assert.notEqual(f.maxProject.id, f.project?.id, 'Never reuse the frozen main project');
  assert(ctx.state.owned[JSON.stringify([ctx.database, 'project', [f.maxProject.id]])], 'Actual project birth ownership proof is missing');
  const project = await call('ProjectController_getById', { id: f.maxProject.id });
  assert.equal(project.scopeKind, 'full-project'); assert.equal(project.currentStage, 'assessment'); assert.equal(project.ownerUserId, manager.id); assert.equal(project.ownerOrgId, manager.orgId);
  const assertOnlyKnownRows = async () => {
    const expenses = rows(await call('ProjectCostController_listExpenseRecords', { projectId: f.maxProject.id }));
    const costs = rows(await call('ProjectCostController_listProjectActualCostRecords', { projectId: f.maxProject.id }));
    assert.equal(expenses.length, f.maxExpense ? 1 : 0, 'Independent MAX project contains an unexpected expense');
    if (f.maxExpense) assert.equal(expenses[0].id, f.maxExpense.id);
    assert.equal(costs.length, f.maxCostCommand ? 1 : 0, 'Independent MAX project contains an unexpected cost; do not aggregate beyond MAX');
    if (f.maxCostCommand) assert.equal(costs[0].id, f.maxCostCommand.targetId);
  };
  await assertOnlyKnownRows();
  if (!f.maxExpenseCategory) {
    const categories = rows(await call('DictionaryController_list', {}, null, { query: { domain: 'expense-category', status: 'active' } }));
    const category = categories.find((row) => typeof row.code === 'string' && row.status === 'active');
    assert(category, 'No real active expense category exists; do not invent a dictionary value');
    f.maxExpenseCategory = category.code; ctx.persist();
  }
  if (!f.maxExpense) {
    f.maxExpense = await call('ProjectCostController_createExpenseRecord', { projectId: f.maxProject.id }, maxExpenseRequest({ businessDate, expenseCategory: f.maxExpenseCategory }),
      { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }); ctx.persist();
  }
  expenseAssertions(f.maxExpense, f.maxProject.id);
  if (f.maxExpense.status !== 'confirmed') {
    assert.equal(f.maxExpense.status, 'recorded', 'Do not repair or resurrect an unexpected expense status');
    f.maxExpense = await call('ProjectCostController_confirmExpenseRecord', { id: f.maxExpense.id }, { expectedVersion: rv(f.maxExpense) },
      { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: f.maxExpense.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  expenseAssertions(f.maxExpense, f.maxProject.id); assert.equal(f.maxExpense.status, 'confirmed');
  assert(ctx.state.owned[JSON.stringify([ctx.database, 'expense_record', [f.maxExpense.id]])], 'Actual expense birth ownership proof is missing');
  assert(f.maxExpense.confirmedAt && f.maxExpense.confirmedBy === manager.id, 'Actual confirmed expense authority is incomplete');
  if (!f.maxCostCommand) {
    f.maxCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.maxProject.id }, { costType: 'expense', expenseRecordId: f.maxExpense.id,
      expectedSourceVersion: rv(f.maxExpense), costDescription: '独立 MAX 费用的真实 E 来源成本。', evidenceSummary: '金额、零税、币种由已确认费用来源读取；请求不复制成本金额。' },
      { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist();
  }
  f.maxCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.maxCostCommand.targetId }); ctx.persist();
  assert(ctx.state.owned[JSON.stringify([ctx.database, 'project_actual_cost_record', [f.maxCost.id]])], 'Actual E cost birth ownership proof is missing');
  costAssertions(f.maxCost, f.maxProject.id, f.maxExpense.id);
  await assertOnlyKnownRows();
  f.maxPreparation = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.maxProject.id }, null, { query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' } }); ctx.persist();
  assert.equal(f.maxPreparation.view, 'preparation'); assert.equal(f.maxPreparation.preparation?.kind, 'preparation-only');
  const members = f.maxPreparation.preparation.sourceRows.filter((row) => row.rowKind === 'direct-cost');
  assert.equal(members.length, 1, 'MAX preparation must contain just the actual E cost once');
  assert.equal(members[0].sourceRef.kind, 'ProjectActualCostRecord'); assert.equal(members[0].sourceRef.id, f.maxCost.id);
  const amounts = members[0].financialProjection;
  assert.equal(amounts.mode, 'full');
  for (const key of ['net', 'gross']) { assert.equal(amounts.value?.[key].knowledge, 'known'); assert.equal(amounts.value[key].value, MAX); }
  assert.equal(amounts.value?.tax.knowledge, 'known'); assert.equal(amounts.value.tax.value, '0.00');
  assert.equal(f.maxPreparation.officialCurrent, null, 'This fixture must not publish an invented G snapshot/evaluation');
  assert.equal(hash(ordinaryFixtures(f)), previous, 'A pre-existing main/business fixture was changed');
  assert.equal(hash(ctx.state.sourcePins), sourcePins); assert.equal(hash(ctx.helperPins), helperPins);
  f.maxFixtureComplete = true; ctx.persist();
  return { kind: 'actual-public-producer-independent-MAX-expense-cost-preparation', completed: true, businessFactsThroughHTTP: true,
    projectPointer: '/fixtures/maxProject/id', expensePointer: '/fixtures/maxExpense/id', costPointer: '/fixtures/maxCost/id',
    exactAmount: MAX, currency: 'CNY', taxAmount: '0.00', ownExpenseCount: 1, ownCostCount: 1, mainFixturesChanged: false,
    publishesOperatingSnapshot: false, promotesFormalEligibility: false, DOMExecuted: false, G3Certified: false, G4Certified: false };
}

