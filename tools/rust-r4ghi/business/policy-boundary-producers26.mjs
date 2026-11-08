// Real public producers only. This module performs no work on import.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as payload from '../../rust-r4abc/upstream-payloads01.mjs';
import { data, uuid } from './pure.mjs';
import { actualActorFor } from './actors.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { FACTS26, configureSourceRequest26 } from './policy-boundary-values26.mjs';
const rv = value => { assert(Number.isSafeInteger(value?.rowVersion) && value.rowVersion > 0); return value.rowVersion; };
const born = table => [{ table, pointer: '/id' }];
const call26 = (api, op, params, body = null, binding = {}, actor = 'manager') => api.request(op, params, body, actor, binding).then(data);
export function contractAPI26(api) {
  return { ...api, request(operationId, params = {}, body = null, actor = 'bootstrap', binding = {}) {
    const changed = ['ProjectController_createProjectPricingMarginReview', 'ContractReadinessController_createContractReadinessPackage'].includes(operationId);
    // Submit explicit lawful business inputs; never replace a server response,
    // current approver, source ref, CAS, completion flag, or approval evidence.
    return api.request(operationId, params, changed ? configureSourceRequest26(operationId, body) : body, actor, binding);
  } };
}
export async function normalSources26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.platformComplete && f.customer && !f.projectSourcesComplete && !f.project);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(f.plannedDate)); f.runId = randomUUID(); ctx.persist();
  const context = () => ({ ...f, actorId: ctx.state.actors.manager.id, ownerOrgId: f.org.id, tag: ctx.state.prefix, caseId: ctx.state.prefix,
    expectedInstanceId: ctx.identity.marker, contractInclusive: FACTS26.contract, contractExclusive: FACTS26.contract });
  f.project = await call26(api, 'ProjectController_create', {}, { projectName: `${ctx.state.prefix}-H26-normal-100`, customerId: f.customer.id, currentStage: 'assessment' },
    { responseBirths: born('project'), number: { scope: 'project', pointer: '/projectNo' } }); ctx.persist();
  f.cost = await call26(api, 'ProjectController_createProjectTechnicalCostPackage', { projectId: f.project.id }, configureSourceRequest26('ProjectController_createProjectTechnicalCostPackage', payload.cost(context()).body),
    { responseBirths: born('project_technical_cost_package'), mutableTables: ['project'] }); ctx.persist();
  f.bid = await call26(api, 'ProjectController_createProjectBidCommercialProcess', { projectId: f.project.id }, payload.bid(context(), 'direct').body,
    { responseBirths: born('project_bid_commercial_process'), mutableTables: ['project'] }); ctx.persist();
  f.contract = await call26(api, 'ContractController_create', {}, payload.draftContract(context()).body,
    { responseBirths: born('contract'), number: { scope: 'contract', pointer: '/contractNo' }, mutableTables: ['project'] }); ctx.persist();
  f.baseline = await call26(api, 'ContractReadinessController_createCommercialReleaseBaseline', {}, configureSourceRequest26('ContractReadinessController_createCommercialReleaseBaseline', payload.baseline(context()).body),
    { responseBirths: born('commercial_release_baseline'), mutableTables: ['project'] }); ctx.persist();
  f.contractRuns = [{ contract: f.contract }];
  const summaryInput = payload.summaryRequest(context()); Object.assign(summaryInput.fieldValues, { quoteAmountTaxInclusive: '100.00', quoteAmountTaxExclusive: '100.00', taxRate: '0.0000' });
  f.summaryInput = ctx.artifact(`${ctx.next('H26-real-Common-input')}.json`, summaryInput, { kind: 'actual-normal-project-quote-source-input', createsApproval: false });
  f.projectSourcesComplete = true; ctx.persist();
  return { kind: 'real-normal-one-contract-R3-source', projectId: f.project.id, contractId: f.contract.id, estimateId: f.cost.id, requestedFacts: FACTS26, actualCommonSummaryAndApprovalStillRequired: true };
}
export async function noCashHandover26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.contractFinishComplete && f.contractRuns.length === 1 && f.contractRuns[0].plan && !f.handoverComplete);
  assert(!Object.hasOwn(f, 'receiptsComplete') && !f.receipts26, 'H01 path must not claim cash receipts or fake standard-helper flags');
  const call = (name, params, body = null, binding = {}, actor = 'manager') => call26(api, 'ProjectHandoverController_' + name, params, body, binding, actor);
  const tables = ['project_handover', 'confirmation_record', 'confirmation_participant', 'todo_item', 'approval_summary_snapshot', 'project'];
  const summary = await call('getContractHandoverSummary', { projectId: f.project.id });
  assert(summary.allowedActions?.includes('prepare-project-handover'), 'Real D guard rejected lawful no-cash handover; stop before H01 and preserve actual response');
  const roles = { manager: ['sales-owner', 'business-admin', 'technical-support'], execution: ['execution-owner'], finance: ['finance'] };
  const participants = Object.entries(roles).map(([key, duties]) => ({ userId: uuid(ctx.state.actors[key].id), responsibilities: duties.map(roleKey => ({ roleKey, responsibilitySummary: `本人承担本真实单合同项目${roleKey}职责，核对正式合同/计划；尚无实收款或实际成本。` })) }));
  f.handover = await call('prepareProjectHandover', { projectId: f.project.id }, { executionOwnerUserId: ctx.state.actors.execution.id, participants, financeConfirmationRequired: true,
    receiptJudgmentMode: 'contract-separate', expectedProjectVersion: summary.projectRowVersion, expectedSourceHash: summary.sourcePayloadHash, comment: '真实单合同100元、零税、正式收款计划；尚无实收款/实际成本，按本人职责核对固定移交材料。' },
  { responseBirths: [{ table: 'project_handover', pointer: '/handoverId' }], mutableTables: tables }); ctx.persist();
  const read = () => call('getProjectHandoverDetailByHandover', { id: f.handover.handoverId });
  for (const person of f.handover.participantConfirmationSummary.participants) {
    const current = await read(); const own = current.participantConfirmationSummary.participants.find(row => row.participantId === person.participantId); assert(own);
    if (own.participantStatus === 'confirmed') continue;
    const actor = await actualActorFor(ctx, api, person.participantId);
    f.handover = await call('confirmProjectHandoverParticipant', { id: current.handoverId }, { summarySnapshotId: current.summarySnapshotId, handoverBasisSnapshotId: current.handoverBasisSnapshotId,
      expectedConfirmationVersion: rv(current.participantConfirmationSummary), comment: '本人确认固定合同/计划及指派职责；确认不等于已经发生实收款。' },
    { mutableTables: tables, updatedAnchors: [{ table: 'project_handover', id: current.handoverId, requestBinding: 'path:id' }] }, actor); ctx.persist();
  }
  const current = await read(); assert.equal(current.participantConfirmationSummary.status, 'confirmed');
  const participantConfirmations = current.participantConfirmationSummary.participants.flatMap(person => person.responsibilities.map(role => ({ participantId: person.participantId, participantRoleKey: role.roleKey, participantStatus: person.participantStatus })));
  f.handoverConfirmation = await call('confirmProjectHandover', { id: current.handoverId }, { participantConfirmations, receiptJudgmentMode: 'contract-separate', contractSummarySnapshotId: current.contractSummarySnapshotId,
    handoverBasisSnapshotId: current.handoverBasisSnapshotId, summarySnapshotId: current.summarySnapshotId, sourcePayloadHash: current.sourcePayloadHash, expectedVersion: rv(current), comment: '所有实际本人职责确认后固定无实收款的真实移交。' },
  { mutableTables: tables, updatedAnchors: [{ table: 'project_handover', id: current.handoverId, requestBinding: 'path:id' }] }); ctx.persist();
  f.handover = await read(); assert.equal(f.handover.handoverStatus, 'confirmed'); f.handoverComplete = true; ctx.persist();
  return { kind: 'real-D-handover-before-any-cash-or-actual-cost', handoverId: f.handover.handoverId, fabricatedReceiptsComplete: false };
}
export async function execution26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.h01Published26 && f.handoverComplete && !f.executionComplete);
  const call = (op, params, body = null, binding = {}, actor = 'manager') => call26(api, op, params, body, binding, actor);
  const actual = ctx.state.actors; assert.equal(await call('CommissionController_getCurrentRoleAssignment', { projectId: f.project.id }), null);
  const participants = [{ userId: actual.manager.id, roleType: 'sales-owner', weight: 0.5, zeroWeightReason: null, responsibilitySummary: '本人承担真实销售职责。' },
    { userId: actual.execution.id, roleType: 'execution-owner', weight: 0.499999, zeroWeightReason: null, responsibilitySummary: '本人承担真实交付执行职责。' },
    { userId: actual.finance.id, roleType: 'finance', weight: 0.000001, zeroWeightReason: null, responsibilitySummary: '本人承担真实回款核验职责。' },
    { userId: actual.manager.id, roleType: 'business-admin', weight: 0, zeroWeightReason: '兼任商务资料职责，不另计权重。', responsibilitySummary: '本人兼任已确认商务资料职责。' }];
  f.roleAssignment = await call('CommissionController_createRoleAssignment', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', expectedCurrentAssignmentId: null, expectedCurrentRowVersion: null, participants },
    { responseBirths: born('commission_role_assignment') }); ctx.persist();
  const detail = await call('CommissionRoleAssignmentController_getRoleAssignmentDetail', { id: f.roleAssignment.id }), handover = await call('ProjectHandoverController_getProjectHandoverDetailByProject', { projectId: f.project.id });
  f.roleFreezeResult = await call('CommissionRoleAssignmentController_freezeRoleAssignment', { id: f.roleAssignment.id }, { inputVersion: 'server-derived-v1', sourceHandoverId: handover.handoverId,
    handoverSummarySnapshotId: handover.summarySnapshotId, handoverBasisSnapshotId: handover.handoverBasisSnapshotId, expectedSourceHash: handover.sourcePayloadHash,
    expectedHandoverVersion: rv(handover), expectedVersion: rv(detail.freezeVersionSummary), comment: '按真实本人职责及精确权重冻结本正常项目角色。' },
  { mutableTables: ['commission_role_assignment', 'project_handover', 'approval_summary_snapshot'], updatedAnchors: [{ table: 'commission_role_assignment', id: f.roleAssignment.id, requestBinding: 'path:id' }] }); ctx.persist();
  await api.login('execution'); const project = await call('ProjectController_getById', { id: f.project.id }, null, {}, 'execution');
  assert.equal(project.scopeKind, 'full-project'); const admission = project.executionAdmissionContext; assert(admission);
  assert.deepEqual(Object.keys(admission).sort(), ['commissionRoleAssignmentId', 'expectedRoleAssignmentVersion', 'handoverStageRecordId', 'handoverSummarySnapshotId', 'sourceHandoverId', 'sourcePayloadHash']);
  const response = await api.request('ProjectController_startExecution', { id: f.project.id }, { ...admission, inputVersion: 'server-derived-v1', expectedProjectVersion: project.projectRowVersion, reason: '实际EO直接消费服务器六项准入来源，不用RoleGET或人工输入hash。' }, 'execution',
    { responseBirths: [{ table: 'project_stage_record', pointer: '/projectStageRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:id' }] });
  f.execution = data(response); f.executionHTTP26 = { receipt: response.receiptId, after: response.after }; assert.equal(f.execution.businessStatusAfter, 'execution'); f.executionComplete = true; ctx.persist();
  return { kind: 'actual-normal-role-freeze-and-EO-entry', stageRecordId: f.execution.projectStageRecordId, RolePermissionsChanged: false };
}
export async function expenseAndZeroTax26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.executionComplete && !f.expense);
  const call = (op, params, body = null, binding = {}) => call26(api, op, params, body, binding);
  const snapshot = loadSnapshot(ctx, f.executionHTTP26.after), stages = readRows(snapshot.databases[ctx.database].tables.project_stage_record).map(row => JSON.parse(row.raw));
  const stage = stages.find(row => row.id === f.execution.projectStageRecordId && row.project_id === f.project.id); assert(stage && stage.to_stage === 'execution');
  const date = await ctx.db(async client => (await client.query("SELECT timezone('Asia/Hong_Kong',now())::date::text business_date,timezone('Asia/Hong_Kong',$1::timestamptz)::date::text stage_date", [stage.entered_at])).rows[0]);
  assert.equal(date.business_date, date.stage_date, 'Same-day source evidence required; do not invent a cross-day stage interval');
  const categories = await call('DictionaryController_list', {}, null, { query: { domain: 'expense-category', status: 'active' } }), category = (Array.isArray(categories) ? categories : categories.items).find(row => row.status === 'active' && row.code); assert(category);
  f.expense = await call('ProjectCostController_createExpenseRecord', { projectId: f.project.id }, { contractId: f.contractRuns[0].contract.id, expenseCategory: category.code,
    expenseDescription: '本正常项目真实实施费用25元，用于回款20%边界观察。', expenseDate: date.business_date, currency: 'CNY', amountIncludingTax: '25.00', amountExcludingTax: '25.00', taxAmount: '0.00',
    sourceType: 'manual', evidenceSummary: '实际登记CNY未税/含税均25.00、税0.00的费用；无进项税额，不认证任何抵扣。', attachmentCount: 0 }, { responseBirths: born('expense_record') }); ctx.persist();
  f.expense = await call('ProjectCostController_confirmExpenseRecord', { id: f.expense.id }, { expectedVersion: rv(f.expense) }, { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: f.expense.id, requestBinding: 'path:id' }] }); ctx.persist();
  f.actualCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.project.id }, { costType: 'expense', expenseRecordId: f.expense.id, expectedSourceVersion: rv(f.expense),
    costDescription: '服务端从真实已确认25元费用读取成本。', evidenceSummary: '不在成本入口复制或改写费用金额/币种。' }, { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }],
    number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist();
  f.actualCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.actualCostCommand.targetId }); ctx.persist();
  f.costStage = await call('ProjectCostController_confirmCostStageAttribution', { id: f.actualCost.id }, { stageAttributionMode: 'auto', attributedStage: 'execution', expectedVersion: rv(f.actualCost), attributionSummary: '实际同日I执行阶段ledger作为费用成本阶段依据。',
    attributionEvidence: { kind: 'source', sourceType: 'project-stage-record', sourceId: uuid(stage.id), sourceVersion: stage.sequence_no, businessDate: date.business_date, reason: '真实entered_at与sequence_no，非伪造阶段证据。' } },
  { responseBirths: [{ table: 'cost_stage_attribution_snapshot', pointer: '/targetId' }], mutableTables: ['project_actual_cost_record'], updatedAnchors: [{ table: 'project_actual_cost_record', id: f.actualCost.id, requestBinding: 'path:id' }] }); ctx.persist();
  f.actualCost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: f.actualCost.id }); assert.equal(f.actualCost.recordStatus, 'confirmed');
  for (const [key, amount] of [['amountExcludingTax', '25.00'], ['amountIncludingTax', '25.00'], ['taxCostAmount', '0.00']]) { assert.equal(f.actualCost.financialProjection[key].mode, 'full'); assert.equal(f.actualCost.financialProjection[key].value, amount); }
  const cost = f.actualCost;
  const tax = await api.request('ProjectCostController_confirmAccountingTaxTreatment', { projectId: f.project.id }, { taxTreatmentType: 'H26-actual-zero-tax-expense', deductibilityStatus: 'non-deductible', taxImpactAmount: '0.00',
    taxImpactSummary: '实际来源费用/成本税额均0.00，本次无进项税额可抵扣；净成本调整0.00、待评估税额0.00。', taxPendingFlag: false, taxImpactPendingAmount: '0.00', currency: cost.currency,
    basisSummary: '责任人仅对本条真实零税来源确认无抵扣及零待评估；不向其他来源推断税务。', sourceReferences: [{ kind: 'source', sourceType: 'project-actual-cost-record', sourceId: cost.id, sourceVersion: rv(cost), businessDate: cost.occurredOn,
      reason: '实际来源当前版本与明确0.00税层，不假设税率或历史金额。' }] }, 'manager', { responseBirths: [{ table: 'accounting_tax_treatment_snapshot', pointer: '/targetId' }] });
  f.zeroTax26 = { command: data(tax), receipt: tax.receiptId, after: tax.after }; f.actualExpenseStageComplete = true; ctx.persist();
  return { kind: 'actual-expense25-E-F-stage-and-explicit-zero-tax-conclusion', expenseId: f.expense.id, costId: cost.id, taxId: f.zeroTax26.command.targetId, taxConclusionReceipt: tax.receiptId };
}
