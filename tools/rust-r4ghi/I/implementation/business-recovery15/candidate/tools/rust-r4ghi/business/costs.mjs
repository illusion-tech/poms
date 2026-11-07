import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
export async function actualExpenseAndStage(ctx, api) {
  const f = ctx.state.fixtures; assert(f.executionComplete && !f.actualExpenseStageComplete);
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, 'manager', binding));
  f.costBusinessDate ??= await ctx.db(async c => (await c.query("SELECT timezone('Asia/Hong_Kong',now())::date::text day")).rows[0].day);
  if (!f.expenseCategory) {
    const categories = await call('DictionaryController_list', {}, null, { query: { domain: 'expense-category', status: 'active' } });
    const found = (Array.isArray(categories) ? categories : categories.items).find(row => row.code && row.status === 'active'); assert(found); f.expenseCategory = found.code; ctx.persist();
  }
  if (!f.expense) {
    f.expense = await call('ProjectCostController_createExpenseRecord', { projectId: f.project.id }, { contractId: f.contractRuns[0].contract.id, expenseCategory: f.expenseCategory,
      expenseDescription: '本隔离验收通过真实费用生产者登记的实施费用。', expenseDate: f.costBusinessDate, currency: 'CNY', amountIncludingTax: '5650.00', amountExcludingTax: '5000.00', taxAmount: '650.00',
      sourceType: 'manual', evidenceSummary: '当前实际项目、已生效合同与真实费用生产命令。', attachmentCount: 0 }, { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }); ctx.persist();
  }
  if (f.expense.status !== 'confirmed') {
    f.expense = await call('ProjectCostController_confirmExpenseRecord', { id: f.expense.id }, { expectedVersion: rv(f.expense) }, { mutableTables: ['expense_record'],
      updatedAnchors: [{ table: 'expense_record', id: f.expense.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  if (!f.actualCostCommand) {
    f.actualCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.project.id }, { costType: 'expense', expenseRecordId: uuid(f.expense.id), expectedSourceVersion: rv(f.expense),
      costDescription: '从真实已确认费用生产实际成本；不复制接收成本SQL。', evidenceSummary: '实际费用原始来源版本与精确CNY净税金额由服务器读取。' },
      { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist();
  }
  f.actualCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: uuid(f.actualCostCommand.targetId) }); ctx.persist();
  if (!f.costStage) {
    const stages = await ctx.db(async c => (await c.query("SELECT id::text,sequence_no,to_stage,timezone('Asia/Hong_Kong',entered_at)::date::text day FROM poms.project_stage_record WHERE id=$1::uuid AND project_id=$2::uuid", [f.execution.projectStageRecordId, f.project.id])).rows);
    assert.equal(stages.length, 1); const stage = stages[0]; assert.equal(stage.to_stage, 'execution'); assert(Number.isSafeInteger(stage.sequence_no) && stage.sequence_no > 0);
    f.costStage = await call('ProjectCostController_confirmCostStageAttribution', { id: f.actualCost.id }, { stageAttributionMode: 'auto', attributedStage: 'execution', expectedVersion: rv(f.actualCost),
      attributionSummary: '由真实I执行阶段ledger确认费用成本归属。', attributionEvidence: { kind: 'source', sourceType: 'project-stage-record', sourceId: stage.id,
        sourceVersion: stage.sequence_no, businessDate: stage.day, reason: '实际不可变阶段ledger sequence_no为来源版本，entered_at为发生时间。' } },
      { responseBirths: [{ table: 'cost_stage_attribution_snapshot', pointer: '/targetId' }], mutableTables: ['project_actual_cost_record'],
        updatedAnchors: [{ table: 'project_actual_cost_record', id: f.actualCost.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  f.actualExpenseStageComplete = true; ctx.persist();
  return { kind: 'actual-E-expense-cost-and-F-stage-producers', completed: true, businessFactsThroughHTTP: true, stageVersionUsesRealSequenceNo: true,
    laborAllocationTaxCorrectionCases: 'not-run', nextStage: 'operating', G3Certified: false, G4Certified: false };
}
