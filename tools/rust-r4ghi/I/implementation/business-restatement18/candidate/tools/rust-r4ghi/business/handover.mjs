import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';
import { actualActorFor } from './actors.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647, 'Actual current rowVersion required'); return row.rowVersion; };
export function expectedRef(ref) {
  uuid(ref?.id); assert(typeof ref.kind === 'string' && /^[a-f0-9]{64}$/.test(ref.payloadHash));
  return { kind: ref.kind, id: ref.id, expectedVersion: rv(ref), payloadHash: ref.payloadHash };
}
export async function receipts(ctx, api) {
  const f = ctx.state.fixtures; assert(f.contractFinishComplete && !f.receiptsComplete);
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, 'manager', binding));
  for (const slot of f.contractRuns) {
    if (slot.receiptBasisVerified) continue;
    if (!slot.receipt) {
      slot.receipt = await call('ContractFinanceController_createReceipt', { contractId: slot.contract.id }, { receiptAmount: '56500.00', receiptDate: await ctx.instant(), sourceType: 'manual' },
        { responseBirths: [{ table: 'receipt_record', pointer: '/id' }] }); ctx.persist();
    }
    const prepared = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null,
      { query: { view: 'preparation', intent: 'receipt-basis', receiptId: slot.receipt.id } });
    const preparation = prepared.preparation; assert(preparation?.kind === 'preparation-only' && preparation.intent === 'receipt-basis');
    const terms = preparation.sourceRows.filter(row => row.sourceRef?.kind === 'ContractTermSnapshot' && row.sourceRef?.id === slot.activated.snapshotId);
    assert.equal(terms.length, 1); assert.equal(terms[0].state, 'ready', 'Fresh activated terms must expose certified tax/currency source');
    slot.contract = await call('ContractController_getById', { id: slot.contract.id }); ctx.persist();
    const reference = expectedRef(terms[0].sourceRef);
    slot.receipt = await call('ContractFinanceController_confirmReceipt', { id: slot.receipt.id }, { inputVersion: 'server-derived-v1', mode: 'confirm',
      expectedVersion: rv(slot.receipt), expectedContractVersion: rv(slot.contract), basis: { termSnapshotRef: reference, currencyBasisRef: reference, evidenceRefs: [],
        selectionPolicy: 'receipt-date-effective-terms', reason: '新合同实际激活条款的已冻结CNY/13%依据；按真实收款日期生效条款确认全部合同现金。' } },
      { mutableTables: ['receipt_record'], updatedAnchors: [{ table: 'receipt_record', id: slot.receipt.id, requestBinding: 'path:id' }] }); ctx.persist();
    assert.equal(slot.receipt.status, 'confirmed');
    const verified = await ctx.db(async c => {
      const rows = (await c.query('SELECT id::text,receipt_id::text,term_snapshot_id::text,currency,cash_gross::text,amount_excluding_tax::text,tax_amount::text,tax_rate::text,capture_mode,selection_policy,rounding_policy,producer_version,row_version FROM poms.receipt_accounting_basis WHERE receipt_id=$1::uuid', [slot.receipt.id])).rows;
      assert.equal(rows.length, 1); const row = rows[0];
      assert.equal(row.term_snapshot_id, slot.activated.snapshotId); assert.equal(row.currency, 'CNY'); assert.equal(row.cash_gross, '56500.00'); assert.equal(row.amount_excluding_tax, '50000.00'); assert.equal(row.tax_amount, '6500.00');
      assert.equal(row.tax_rate, '0.1300'); assert.equal(row.capture_mode, 'confirm'); assert.equal(row.selection_policy, 'receipt-date-effective-terms'); assert.equal(row.rounding_policy, 'gross-net-HALF_UP-cents-v1'); assert.equal(row.producer_version, 1);
      return row;
    });
    slot.receiptBasisVerified = ctx.artifact(`${ctx.next('receipt-basis')}.json`, verified, { kind: 'actual-new-receipt-accounting-basis-assertion', grossNetTaxConserved: true, guessedHistoricalTaxOrCurrency: false }); ctx.persist();
  }
  f.receiptsComplete = true; ctx.persist();
  return { kind: 'actual-two-contract-full-cash-confirmations-with-immutable-basis', completed: true, confirmedReceipts: f.contractRuns.length,
    serverDerivedNetTaxAndCurrency: true, historicalBasisCase: 'not-run', nextStage: 'handover', G3Certified: false, G4Certified: false };
}
export async function handover(ctx, api) {
  const f = ctx.state.fixtures; assert(f.receiptsComplete && !f.handoverComplete);
  const call = async (op, params, body = null, binding = {}, actor = 'manager') => data(await api.request(op, params, body, actor, binding));
  const key = name => `ProjectHandoverController_${name}`;
  const tables = ['project_handover', 'confirmation_record', 'confirmation_participant', 'todo_item', 'approval_summary_snapshot', 'project'];
  const read = async () => call(key('getProjectHandoverDetailByHandover'), { id: uuid(f.handover.handoverId) });
  if (!f.handover) {
    const summary = await call(key('getContractHandoverSummary'), { projectId: f.project.id });
    assert(summary.allowedActions?.includes('prepare-project-handover') && /^[a-f0-9]{64}$/.test(summary.sourcePayloadHash));
    const responsibilities = {
      manager: ['sales-owner', 'business-admin', 'technical-support'], execution: ['execution-owner'], finance: ['finance'],
    };
    const participants = Object.entries(responsibilities).map(([actor, roles]) => ({ userId: uuid(ctx.state.actors[actor].id), responsibilities: roles.map(roleKey => ({ roleKey, responsibilitySummary: `本人真实承担本隔离验收项目 ${roleKey} 职责并核对固定材料。` })) }));
    f.handover = await call(key('prepareProjectHandover'), { projectId: f.project.id }, { executionOwnerUserId: ctx.state.actors.execution.id, participants, financeConfirmationRequired: true,
      receiptJudgmentMode: 'contract-separate', expectedProjectVersion: summary.projectRowVersion, expectedSourceHash: summary.sourcePayloadHash, comment: '按两份真实有效合同、各自全额回款及正式计划准备固定移交材料。' },
      { responseBirths: [{ table: 'project_handover', pointer: '/handoverId' }], mutableTables: tables }); ctx.persist();
  }
  for (const person of f.handover.participantConfirmationSummary.participants) {
    let current = await read();
    const own = current.participantConfirmationSummary.participants.find(p => p.participantId === person.participantId); assert(own);
    if (own.participantStatus === 'confirmed') continue;
    const actor = await actualActorFor(ctx, api, uuid(person.participantId)); assert.equal(ctx.state.actors[actor].id, person.participantId);
    f.handover = await call(key('confirmProjectHandoverParticipant'), { id: current.handoverId }, { summarySnapshotId: current.summarySnapshotId, handoverBasisSnapshotId: current.handoverBasisSnapshotId,
      expectedConfirmationVersion: rv(current.participantConfirmationSummary), comment: '本人核验同一实际固定材料，确认所指派职责，不代替其他人确认。' },
      { mutableTables: tables, updatedAnchors: [{ table: 'project_handover', id: current.handoverId, requestBinding: 'path:id' }] }, actor); ctx.persist();
  }
  const current = await read(); assert.equal(current.participantConfirmationSummary.status, 'confirmed');
  if (current.handoverStatus !== 'confirmed') {
    const participantConfirmations = current.participantConfirmationSummary.participants.flatMap(person => {
      assert.equal(person.participantStatus, 'confirmed'); return person.responsibilities.map(r => ({ participantId: person.participantId, participantRoleKey: r.roleKey, participantStatus: 'confirmed' }));
    });
    f.handoverConfirmation = await call(key('confirmProjectHandover'), { id: current.handoverId }, { participantConfirmations, receiptJudgmentMode: 'contract-separate', contractSummarySnapshotId: current.contractSummarySnapshotId,
      handoverBasisSnapshotId: current.handoverBasisSnapshotId, summarySnapshotId: current.summarySnapshotId, sourcePayloadHash: current.sourcePayloadHash, expectedVersion: rv(current), comment: '真实本人职责确认全部完成后正式固定移交事实。' },
      { mutableTables: tables, updatedAnchors: [{ table: 'project_handover', id: current.handoverId, requestBinding: 'path:id' }] }); ctx.persist();
  }
  f.handover = await read(); assert.equal(f.handover.handoverStatus, 'confirmed');
  const byProject = await call(key('getProjectHandoverDetailByProject'), { projectId: f.project.id }); assert.equal(byProject.handoverId, f.handover.handoverId);
  assert.equal(f.handover.executionAdmission?.allowed, false, 'Role freeze still required; handover does not certify execution entry');
  f.handoverComplete = true; ctx.persist();
  return { kind: 'actual-personal-duty-confirmed-handover', completed: true, participants: f.handover.participantConfirmationSummary.participants.length,
    executionAdmission: 'not-yet-allowed-role-freeze-required', nextStage: 'roles-and-execution', G3Certified: false, G4Certified: false };
}
