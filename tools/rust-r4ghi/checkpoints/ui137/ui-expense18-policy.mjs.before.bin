import assert from 'node:assert/strict';
const unwrap = value => value?.data ?? value;
const exact = (value, keys) => { assert(value && typeof value === 'object' && !Array.isArray(value)); assert.deepEqual(Object.keys(value).sort(), [...keys].sort()); };
const cents = value => { assert(typeof value === 'string' && /^[0-9]{1,16}(?:\.[0-9]{1,2})?$/.test(value)); const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')); };
export function exactMoneyRow18(raw) {
  const keys = new Set(['amount_including_tax', 'amount_excluding_tax', 'tax_amount', 'tax_cost_amount']);
  return JSON.parse(raw, (key, value, context) => { if (keys.has(key) && typeof value === 'number') { assert(typeof context?.source === 'string', 'Exact JSON numeric token access required'); return context.source; } return value; });
}
export function createExpensePolicy18({ ctx, scene, action, readRows }) {
  assert.equal(scene.kind, 'expense-cost-forms'); assert.equal(action.kind, scene.kind); assert.equal(scene.actor.id, ctx.state.actors[action.actorKey].id); assert.notEqual(scene.projectId, ctx.state.fixtures.project?.id);
  assert(cents(action.gross) > 0n && cents(action.gross) === cents(action.net) + cents(action.tax)); assert(/^[A-Z]{3}$/.test(action.currency));
  const projectId = scene.projectId, actorId = scene.actor.id, cache = { phase: 'initial', anchor: null, categories: [], expenses: [], costs: [], expense: null, cost: null, businessDates: new Set(), inflight: null, writes: [] };
  const one = (snapshot, table, id) => { const rows = readRows(snapshot.databases[ctx.database].tables[table]).map(row => exactMoneyRow18(row.raw)).filter(row => row.id === id); assert.equal(rows.length, 1); return rows[0]; };
  const project = before => { const row = one(before, 'project', projectId); assert.equal(row.current_stage, 'execution'); assert.equal(row.owner_user_id, actorId); assert.equal(row.owner_org_id, ctx.state.actors[action.actorKey].orgId); assert(cache.anchor?.scopeKind === 'full-project' && cache.anchor.id === projectId && cache.anchor.currentStage === 'execution'); return row; };
  function numberScope({ operationId, params, body }) { if (operationId !== 'ProjectCostController_createProjectActualCostRecord') return null; assert.equal(cache.phase, 'confirmed'); assert.equal(params.projectId, projectId); assert.equal(body.costType, 'expense'); assert.equal(body.expenseRecordId, cache.expense.id); assert.equal(body.expectedSourceVersion, cache.expense.rowVersion); return 'cost-expense'; }
  function admitRead({ operationId, params, rawPath }) {
    const url = new URL(rawPath, 'http://127.0.0.1:44551');
    if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/me/') || operationId.startsWith('NavigationController_') || operationId.startsWith('HealthController_')) return;
    if (operationId === 'ProjectController_getById') { assert.equal(params.id, projectId); return; }
    if (operationId === 'DictionaryController_list') { assert.equal(url.searchParams.get('domain'), 'expense-category'); assert.equal(url.searchParams.get('status'), 'active'); return; }
    if (['ContractController_list', 'ProjectCostController_listExpenseRecords', 'ProjectCostController_listProjectActualCostRecords'].includes(operationId)) { assert.equal(params.projectId, projectId); return; }
    if (operationId === 'ProjectCostController_getExpenseRecordDetail') { assert(cache.expense && params.id === cache.expense.id); return; }
    if (operationId === 'ProjectCostController_getProjectActualCostRecordDetail') { assert(cache.cost && params.id === cache.cost.id); return; }
    if (operationId === 'ProjectCostController_listCostStageAttributions') { assert(cache.cost && params.costRecordId === cache.cost.id); return; }
    throw new Error('Expense UI requested an unapproved listing, Role/other accounting view or another project');
  }
  function observeRead(operationId, response, metadata = {}) {
    const value = unwrap(response);
    if (operationId === 'ProjectController_getById') { assert.equal(value.id, projectId); assert.equal(value.scopeKind, 'full-project'); cache.anchor = value; }
    if (metadata.headers?.date && ['ProjectController_getById','ProjectCostController_listExpenseRecords','ProjectCostController_listProjectActualCostRecords'].includes(operationId)) cache.businessDates.add(new Date(Date.parse(metadata.headers.date) + 8 * 3_600_000).toISOString().slice(0, 10));
    if (operationId === 'DictionaryController_list') cache.categories = value;
    if (operationId === 'ProjectCostController_listExpenseRecords') { assert(Array.isArray(value) && value.every(row => row.projectId === projectId)); cache.expenses = value; }
    if (operationId === 'ProjectCostController_listProjectActualCostRecords') { assert(Array.isArray(value) && value.every(row => row.projectId === projectId)); cache.costs = value; }
    if (operationId === 'ProjectCostController_getExpenseRecordDetail') { assert.equal(value.id, cache.expense.id); assert.equal(value.projectId, projectId); cache.expense = value; }
    if (operationId === 'ProjectCostController_getProjectActualCostRecordDetail') { assert.equal(value.id, cache.cost.id); assert.equal(value.projectId, projectId); assert.equal(value.sourceType, 'expense-record'); assert.equal(value.sourceId, null); assert.equal(value.financialProjection.sourceId.mode, 'full'); assert.equal(value.financialProjection.sourceId.value, cache.expense.id); cache.cost = value; }
    if (operationId === 'ProjectCostController_listCostStageAttributions') assert(Array.isArray(value) && value.every(row => row.costRecordId === cache.cost.id));
  }
  function admit({ operationId, params, method, body, before }) {
    assert(!cache.inflight); assert.equal(method, 'POST'); project(before); let binding, allowed = {}, purpose;
    if (operationId === 'ProjectCostController_createExpenseRecord') {
      assert.equal(cache.phase, 'initial'); assert.equal(params.projectId, projectId); exact(body, ['contractId','expenseCategory','expenseDescription','expenseDate','currency','amountIncludingTax','amountExcludingTax','taxAmount','sourceType','evidenceSummary','attachmentCount']);
      assert.equal(body.contractId, null); assert.equal(body.expenseCategory, action.expenseCategory); assert(cache.categories.some(row => row.code === body.expenseCategory && row.domain === 'expense-category' && row.status === 'active'));
      assert.equal(body.expenseDescription, action.description); assert(cache.businessDates.has(body.expenseDate)); assert.equal(body.currency, action.currency); assert.equal(body.amountIncludingTax, action.gross); assert.equal(body.amountExcludingTax, action.net); assert.equal(body.taxAmount, action.tax); assert.equal(body.sourceType, 'manual'); assert.equal(body.evidenceSummary, action.expenseEvidenceSummary); assert.equal(body.attachmentCount, 0);
      binding = { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }; purpose = 'real-UI-expense-create';
    } else if (operationId === 'ProjectCostController_confirmExpenseRecord') {
      assert.equal(cache.phase, 'recorded'); assert.equal(params.id, cache.expense.id); assert(cache.expense.allowedActions?.includes('confirm')); exact(body, ['expectedVersion']); const row = one(before, 'expense_record', params.id); assert.equal(row.project_id, projectId); assert.equal(row.status, 'recorded'); assert.equal(body.expectedVersion, row.row_version); assert.equal(body.expectedVersion, cache.expense.rowVersion);
      binding = { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: params.id, requestBinding: 'path:id' }] }; allowed = { expense_record: [params.id] }; purpose = 'real-UI-expense-confirm';
    } else if (operationId === 'ProjectCostController_createProjectActualCostRecord') {
      numberScope({ operationId, params, body }); exact(body, ['costType','expenseRecordId','expectedSourceVersion','costDescription','evidenceSummary']); const row = one(before, 'expense_record', body.expenseRecordId); assert.equal(row.project_id, projectId); assert.equal(row.status, 'confirmed'); assert.equal(row.row_version, body.expectedSourceVersion); assert.equal(body.costDescription, action.costDescription); assert.equal(body.evidenceSummary, action.costEvidenceSummary);
      binding = { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }; purpose = 'real-UI-source-only-E-cost';
    } else {
      assert.equal(operationId, 'ProjectCostController_confirmCostStageAttribution'); assert.equal(cache.phase, 'cost-posted'); assert.equal(params.id, cache.cost.id); exact(body, ['stageAttributionMode','attributedStage','expectedVersion','attributionSummary','attributionEvidence']);
      const row = one(before, 'project_actual_cost_record', params.id); assert.equal(row.project_id, projectId); assert.equal(row.source_type, 'expense-record'); assert.equal(row.source_id, cache.expense.id); assert.equal(row.record_status, 'registered'); assert.equal(row.is_included_in_project_cost, false); assert.equal(body.expectedVersion, row.row_version); assert.equal(body.expectedVersion, cache.cost.rowVersion);
      assert.equal(body.stageAttributionMode, 'manual'); assert.equal(body.attributedStage, 'execution'); assert.equal(body.attributionSummary, action.attributionReason); exact(body.attributionEvidence, ['kind','businessDate','reason','evidenceSummary','attachmentIds']); assert.equal(body.attributionEvidence.kind, 'manual'); assert.equal(body.attributionEvidence.businessDate, cache.cost.occurredOn); assert.equal(body.attributionEvidence.reason, action.attributionReason); assert.equal(body.attributionEvidence.evidenceSummary, action.attributionEvidenceSummary); assert.deepEqual(body.attributionEvidence.attachmentIds, []);
      binding = { responseBirths: [{ table: 'cost_stage_attribution_snapshot', pointer: '/targetId' }], mutableTables: ['project_actual_cost_record'], updatedAnchors: [{ table: 'project_actual_cost_record', id: params.id, requestBinding: 'path:id' }] }; allowed = { project_actual_cost_record: [params.id] }; purpose = 'real-UI-F-manual-stage-attribution';
    }
    cache.inflight = { operationId, binding, allowed, purpose, body }; return cache.inflight;
  }
  function validateMutationRows(differences) { assert(cache.inflight); for (const change of differences) for (const item of change.changed) if ((cache.inflight.binding.mutableTables ?? []).includes(change.table)) assert(change.database === ctx.database && cache.inflight.allowed[change.table]?.includes(item.after.key[0])); }
  function money(row, response) {
    assert.equal(row.currency, action.currency); assert.equal(response.currency, action.currency);
    for (const field of ['expenseDescription','evidenceSummary','voidReason']) assert.equal(response[field], null);
    for (const [column, field, expected] of [['amount_including_tax','amountIncludingTax',action.gross],['amount_excluding_tax','amountExcludingTax',action.net],['tax_amount','taxAmount',action.tax]]) { if (row[column] !== undefined) assert.equal(cents(String(row[column])), cents(expected)); if (response?.financialProjection?.[field]) { assert.equal(response[field], null); assert.equal(response.financialProjection[field].mode, 'full'); assert.equal(cents(response.financialProjection[field].value), cents(expected)); } }
  }
  function observeWrite(operationId, response, after, differences) {
    assert.equal(cache.inflight?.operationId, operationId); validateMutationRows(differences); const value = unwrap(response), intent = cache.inflight;
    if (operationId === 'ProjectCostController_createExpenseRecord') { assert.equal(value.projectId, projectId); assert.equal(value.status, 'recorded'); const row = one(after, 'expense_record', value.id); assert.equal(row.project_id, projectId); assert.equal(row.status, 'recorded'); money(row, value); cache.expense = value; cache.phase = 'recorded'; }
    else if (operationId === 'ProjectCostController_confirmExpenseRecord') { assert.equal(value.id, cache.expense.id); const row = one(after, 'expense_record', value.id); assert.equal(row.confirmed_by, actorId); assert.equal(row.status, 'confirmed'); assert.equal(row.row_version, intent.body.expectedVersion + 1); money(row, value); cache.expense = value; cache.phase = 'confirmed'; }
    else if (operationId === 'ProjectCostController_createProjectActualCostRecord') { const row = one(after, 'project_actual_cost_record', value.targetId); assert.equal(row.project_id, projectId); assert.equal(row.source_id, cache.expense.id); assert.equal(row.source_type, 'expense-record'); assert.equal(row.cost_type, 'expense'); assert.equal(row.currency, action.currency); assert.equal(row.source_basis.sourceRowVersion, intent.body.expectedSourceVersion); assert.equal(cents(String(row.amount_excluding_tax)), cents(action.net)); assert.equal(cents(String(row.tax_cost_amount)), cents(action.tax)); assert.equal(cents(String(row.amount_including_tax)), cents(action.gross)); cache.cost = { id: value.targetId }; cache.phase = 'cost-posted'; }
    else { const row = one(after, 'project_actual_cost_record', cache.cost.id), stage = one(after, 'cost_stage_attribution_snapshot', value.attributionSnapshotId); assert.equal(row.project_id, projectId); assert.equal(row.confirmed_by, actorId); assert.equal(row.record_status, 'confirmed'); assert.equal(row.execution_stage_code, 'execution'); assert.equal(row.row_version, intent.body.expectedVersion + 1); assert.equal(stage.cost_record_id, row.id); assert.equal(stage.attribution_mode, 'manual'); assert.equal(stage.governance_evidence_id, value.evidenceId); assert.equal(stage.attributed_stage, 'execution'); cache.phase = 'attributed'; }
    cache.writes.push({ operationId, purpose: intent.purpose, responseTargetId: value.id ?? value.targetId }); cache.inflight = null;
  }
  return { cache, action, scene, numberScope, admitRead, observeRead, admit, validateMutationRows, observeWrite, completed: () => cache.phase === 'attributed' };
}
