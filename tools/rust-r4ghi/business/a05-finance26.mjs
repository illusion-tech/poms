import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';
import { expectedRef } from './handover.mjs';

const rv = value => { assert(Number.isSafeInteger(value.rowVersion) && value.rowVersion > 0); return value.rowVersion; };
export async function actualReceipt26(ctx, api, entry, amount, expected) {
  const f = ctx.state.fixtures, slot = f.contractRuns[0]; assert.equal(f.contractRuns.length, 1);
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, 'manager', binding));
  if (!entry.receipt) { entry.receipt = await call('ContractFinanceController_createReceipt', { contractId: slot.contract.id }, { receiptAmount: amount, receiptDate: await ctx.instant(), sourceType: 'manual' },
    { responseBirths: [{ table: 'receipt_record', pointer: '/id' }] }); ctx.persist(); }
  if (!entry.basisVerified) {
    const prepared = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null, { query: { view: 'preparation', intent: 'receipt-basis', receiptId: entry.receipt.id } });
    const terms = prepared.preparation.sourceRows.filter(row => row.sourceRef?.kind === 'ContractTermSnapshot' && row.sourceRef.id === slot.activated.snapshotId); assert.equal(terms.length, 1); assert.equal(terms[0].state, 'ready');
    const ref = expectedRef(terms[0].sourceRef); slot.contract = await call('ContractController_getById', { id: slot.contract.id });
    entry.receipt = await call('ContractFinanceController_confirmReceipt', { id: entry.receipt.id }, { inputVersion: 'server-derived-v1', mode: 'confirm', expectedVersion: rv(entry.receipt), expectedContractVersion: rv(slot.contract),
      basis: { termSnapshotRef: ref, currencyBasisRef: ref, evidenceRefs: [], selectionPolicy: 'receipt-date-effective-terms', reason: '本独立边界case使用实际激活合同的明确CNY及税率事实，按真实收款日选择依据；不猜币种、税或默认净额。' } },
      { mutableTables: ['receipt_record'], updatedAnchors: [{ table: 'receipt_record', id: entry.receipt.id, requestBinding: 'path:id' }] }); ctx.persist();
    const actual = await ctx.db(async c => (await c.query('SELECT id::text,receipt_id::text,cash_gross::text,amount_excluding_tax::text,tax_amount::text,tax_rate::text,currency,term_snapshot_id::text,capture_mode,rounding_policy,producer_version FROM poms.receipt_accounting_basis WHERE receipt_id=$1::uuid', [entry.receipt.id])).rows);
    assert.equal(actual.length, 1); const basis = actual[0];
    assert.equal(basis.cash_gross, amount); assert.equal(basis.amount_excluding_tax, expected.net); assert.equal(basis.tax_amount, expected.tax); assert.equal(basis.tax_rate, expected.rate);
    assert.equal(basis.currency, 'CNY'); assert.equal(basis.term_snapshot_id, slot.activated.snapshotId); assert.equal(basis.capture_mode, 'confirm'); assert.equal(basis.producer_version, 1); assert.equal(basis.rounding_policy, 'gross-net-HALF_UP-cents-v1');
    entry.basisVerified = ctx.artifact(`${ctx.next('a05-actual-receipt-basis')}.json`, { actual, receiptId: entry.receipt.id, realTermReference: ref, exactGrossNetTax: true, producerTransport: 'actual-current-Rust-HTTP' }); ctx.persist();
  }
  return { kind: 'actual-cash-and-certified-basis26', receiptId: entry.receipt.id, basis: entry.basisVerified };
}
export async function actualCost26(ctx, api, scenario) {
  const f = ctx.state.fixtures; assert(f.executionComplete);
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, 'manager', binding));
  f.costBusinessDate ??= await ctx.db(async c => (await c.query("SELECT timezone('Asia/Hong_Kong',now())::date::text AS business_date")).rows[0].business_date);
  if (!f.expenseCategory) { const result = await call('DictionaryController_list', {}, null, { query: { domain: 'expense-category', status: 'active' } }); const category = (Array.isArray(result) ? result : result.items).find(row => row.status === 'active' && row.code); assert(category); f.expenseCategory = category.code; ctx.persist(); }
  if (!f.expense) { f.expense = await call('ProjectCostController_createExpenseRecord', { projectId: f.project.id }, { contractId: f.contractRuns[0].contract.id, expenseCategory: f.expenseCategory, expenseDescription: 'A05独立项目真实MAX/一分费用边界；不纳入主线。',
    expenseDate: f.costBusinessDate, currency: 'CNY', amountIncludingTax: scenario.costNet, amountExcludingTax: scenario.costNet, taxAmount: '0.00', sourceType: 'manual', evidenceSummary: '明确CNY及零税费用，由真实费用/E/F入口生产，非接收成本SQL。', attachmentCount: 0 },
    { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }); ctx.persist(); }
  if (f.expense.status !== 'confirmed') { f.expense = await call('ProjectCostController_confirmExpenseRecord', { id: f.expense.id }, { expectedVersion: rv(f.expense) },
    { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: f.expense.id, requestBinding: 'path:id' }] }); ctx.persist(); }
  if (!f.actualCostCommand) { f.actualCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.project.id }, { costType: 'expense', expenseRecordId: f.expense.id, expectedSourceVersion: rv(f.expense), costDescription: '真实边界费用E映射，不由调用方复制接收成本金额。', evidenceSummary: '按实际已确认费用来源版本读取币种/净税金额。' },
    { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist(); }
  f.actualCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.actualCostCommand.targetId }); ctx.persist();
  if (!f.costStage) {
    const stages = await ctx.db(async c => (await c.query("SELECT id::text,sequence_no,to_stage,timezone('Asia/Hong_Kong',entered_at)::date::text AS business_date FROM poms.project_stage_record WHERE id=$1::uuid AND project_id=$2::uuid", [f.execution.projectStageRecordId, f.project.id])).rows);
    assert.equal(stages.length, 1); const stage = stages[0]; assert.equal(stage.to_stage, 'execution'); assert.equal(stage.business_date, f.costBusinessDate);
    f.costStage = await call('ProjectCostController_confirmCostStageAttribution', { id: f.actualCost.id }, { stageAttributionMode: 'auto', attributedStage: 'execution', expectedVersion: rv(f.actualCost), attributionSummary: '实际同日I执行ledger的真实单日阶段依据。',
      attributionEvidence: { kind: 'source', sourceType: 'project-stage-record', sourceId: uuid(stage.id), sourceVersion: stage.sequence_no, businessDate: stage.business_date, reason: '真实sequence_no/entered_at，不推断跨日区间。' } },
      { responseBirths: [{ table: 'cost_stage_attribution_snapshot', pointer: '/targetId' }], mutableTables: ['project_actual_cost_record'], updatedAnchors: [{ table: 'project_actual_cost_record', id: f.actualCost.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  const actual = await ctx.db(async c => (await c.query('SELECT c.id::text,c.project_id::text,c.record_status,c.currency,c.amount_excluding_tax::text net,c.tax_cost_amount::text tax,c.amount_including_tax::text gross,s.attributed_stage,s.governance_schema_version FROM poms.project_actual_cost_record c JOIN poms.cost_stage_attribution_snapshot s ON s.id=c.stage_derived_from_id::uuid AND s.cost_record_id=c.id WHERE c.id=$1::uuid', [f.actualCost.id])).rows);
  assert.equal(actual.length, 1); assert.equal(actual[0].record_status, 'confirmed'); assert.equal(actual[0].net, scenario.costNet); assert.equal(actual[0].gross, scenario.costNet); assert.equal(actual[0].tax, '0.00'); assert.equal(actual[0].currency, 'CNY'); assert.equal(actual[0].attributed_stage, 'execution'); assert.equal(actual[0].governance_schema_version, 1);
  f.actualExpenseStageComplete = true; ctx.persist(); return { kind: 'actual-expense-E-F-single-day-stage26', actual };
}
