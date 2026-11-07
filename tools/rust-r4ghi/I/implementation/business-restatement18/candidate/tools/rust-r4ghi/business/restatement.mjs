// Public real producers only. All SQL below is immutable observation, never fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { data, uuid, sha, keyOf } from './pure.mjs';
import { expectedRef } from './handover.mjs';
import { expenseDecisions } from './operating.mjs';
import { loadSnapshot, readRows, difference } from './snapshot.mjs';
import { assertFrozenPreserved, assertLateSource, assertLateCostDelta, completeLiveTargets } from './restatement-assertions.mjs';

const op = 'ProjectCostController_createOperatingRestatement';
const rv = value => { assert(Number.isSafeInteger(value?.rowVersion) && value.rowVersion > 0 && value.rowVersion <= 2147483647); return value.rowVersion; };
function sourcesUnchanged(ctx) {
  const pins = JSON.parse(fs.readFileSync(new URL('./restatement-sources18.json', import.meta.url)));
  for (const pin of pins) assert.equal(ctx.pins.find(p => p.file === pin.file)?.sha256, pin.sha256, 'Prepared G/E/F/H producer source changed'); return pins;
}
export async function frozenSnapshot(ctx, snapshotId) {
  uuid(snapshotId); assert(ctx.state.owned[keyOf(ctx.database, 'project_operating_snapshot', [snapshotId])]);
  return ctx.db(async c => {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      const rows = (await c.query(`SELECT s.id::text "snapshotId",s.project_id::text "projectId",s.source_context_id::text "contextId",s.source_hash "sourceHash",c.payload_hash "sourcePayloadHash",s.currency,
        s.source_window_end::text "sourceWindowEnd",c.knowledge_cutoff "knowledgeCutoff",s.snapshot_mode "snapshotMode",s.period_end_snapshot_id::text "periodEndSnapshotId",
        (to_jsonb(s)-ARRAY['status','is_current','row_version','updated_at','updated_by'])::text "frozenSnapshotRaw",row_to_json(c)::text "sourceContextRaw",
        s.effective_contract_total::text "effectiveContract",s.receivable_confirmed_total::text "confirmedReceipt",s.included_cost_total::text "includedCost",s.gross_margin_amount::text "grossMargin",
        s.tax_pending_knowledge "taxPendingKnowledge",s.tax_impact_pending_amount::text "taxPending"
        FROM poms.project_operating_snapshot s JOIN poms.operating_source_context c ON c.id=s.source_context_id AND c.snapshot_id=s.id AND c.project_id=s.project_id
        WHERE s.id=$1::uuid AND s.producer_version=1 AND c.producer_version=1`, [snapshotId])).rows;
      assert.equal(rows.length, 1); const row = rows[0]; assert.equal(row.projectId, ctx.state.fixtures.project.id);
      const sourceMemberRows = (await c.query('SELECT row_to_json(m)::text raw FROM poms.operating_source_member m WHERE context_id=$1::uuid ORDER BY member_key', [row.contextId])).rows.map(r => r.raw);
      const costMemberRows = (await c.query('SELECT row_to_json(m)::text raw FROM poms.operating_snapshot_cost_member m WHERE snapshot_id=$1::uuid ORDER BY unit_key', [snapshotId])).rows.map(r => r.raw);
      const costAmounts = (await c.query('SELECT unit_key "unitKey",net_knowledge "netKnowledge",amount_excluding_tax::text net,tax_cost_amount::text tax,amount_including_tax::text gross FROM poms.operating_snapshot_cost_member WHERE snapshot_id=$1::uuid ORDER BY unit_key', [snapshotId])).rows;
      const metrics = Object.fromEntries(['effectiveContract', 'confirmedReceipt', 'includedCost', 'grossMargin', 'taxPendingKnowledge', 'taxPending'].map(k => [k, row[k]]));
      for (const key of Object.keys(metrics)) delete row[key];
      await c.query('COMMIT'); return { ...row, knowledgeCutoff: row.knowledgeCutoff.toISOString(), sourceMemberRows, costMemberRows, costAmounts, metrics };
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
}
async function lateExpense(ctx, api, original) {
  const f = ctx.state.fixtures, state = f.liveRestatement;
  assert(f.expenseCategory && f.costBusinessDate && f.contractRuns?.[0]?.contract?.id);
  const call = async (id, params, body = null, binding = {}) => data(await api.request(id, params, body, 'manager', binding));
  if (!state.expense) {
    state.expense = await call('ProjectCostController_createExpenseRecord', { projectId: f.project.id }, { contractId: f.contractRuns[0].contract.id, expenseCategory: f.expenseCategory,
      expenseDescription: '旧G快照之后才真实登记的同一业务日费用，用于晚到事实重述。', expenseDate: f.costBusinessDate, currency: 'CNY', amountIncludingTax: '5650.00', amountExcludingTax: '5000.00', taxAmount: '650.00',
      sourceType: 'manual', evidenceSummary: '真实HTTP费用生产；不回填createdAt、不SQL伪造成本或重述。', attachmentCount: 0 }, { responseBirths: [{ table: 'expense_record', pointer: '/id' }] }); ctx.persist();
  }
  if (state.expense.status !== 'confirmed') {
    state.expense = await call('ProjectCostController_confirmExpenseRecord', { id: state.expense.id }, { expectedVersion: rv(state.expense) },
      { mutableTables: ['expense_record'], updatedAnchors: [{ table: 'expense_record', id: state.expense.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  if (!state.actualCostCommand) {
    state.actualCostCommand = await call('ProjectCostController_createProjectActualCostRecord', { projectId: f.project.id }, { costType: 'expense', expenseRecordId: uuid(state.expense.id), expectedSourceVersion: rv(state.expense),
      costDescription: '真实晚到费用通过E映射成为实际成本，再由F真实阶段来源确认。', evidenceSummary: '已确认费用实际版本，金额与币种由E读取。' },
      { responseBirths: [{ table: 'project_actual_cost_record', pointer: '/targetId' }], number: { scope: 'cost-expense', pointer: '/recordNo', rowSource: { table: 'project_actual_cost_record', responsePointer: '/targetId', column: 'record_no' } } }); ctx.persist();
  }
  state.cost = await call('ProjectCostController_getProjectActualCostRecordDetail', { id: uuid(state.actualCostCommand.targetId) }); ctx.persist();
  if (!state.stage) {
    const stages = await ctx.db(async c => (await c.query("SELECT id::text,sequence_no,to_stage,timezone('Asia/Hong_Kong',entered_at)::date::text day FROM poms.project_stage_record WHERE id=$1::uuid AND project_id=$2::uuid", [f.execution.projectStageRecordId, f.project.id])).rows);
    assert.equal(stages.length, 1); const stage = stages[0]; assert.equal(stage.to_stage, 'execution'); assert.equal(stage.day, f.costBusinessDate);
    assert(Number.isSafeInteger(stage.sequence_no) && stage.sequence_no > 0);
    state.stage = await call('ProjectCostController_confirmCostStageAttribution', { id: state.cost.id }, { stageAttributionMode: 'auto', attributedStage: 'execution', expectedVersion: rv(state.cost),
      attributionSummary: '真实晚到同日费用沿实际执行ledger确认，不从mutable当前阶段猜区间。', attributionEvidence: { kind: 'source', sourceType: 'project-stage-record', sourceId: stage.id,
        sourceVersion: stage.sequence_no, businessDate: stage.day, reason: '确切ledger sequence_no/entered_at，只证明同一业务日milestone。' } },
      { responseBirths: [{ table: 'cost_stage_attribution_snapshot', pointer: '/targetId' }], mutableTables: ['project_actual_cost_record'], updatedAnchors: [{ table: 'project_actual_cost_record', id: state.cost.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  const costs = await ctx.db(async c => (await c.query('SELECT id::text,project_id::text "projectId",source_type "sourceType",source_id::text "sourceId",occurred_on::text "businessDate",created_at "createdAt",currency,amount_excluding_tax::text "amountExcludingTax",tax_cost_amount::text "taxCostAmount",amount_including_tax::text "amountIncludingTax" FROM poms.project_actual_cost_record WHERE id=$1::uuid', [state.cost.id])).rows);
  assert.equal(costs.length, 1); const cost = { ...costs[0], createdAt: costs[0].createdAt.toISOString() };
  assert.equal(cost.sourceType, 'expense-record'); assert.equal(cost.sourceId, state.expense.id); assertLateSource(original, cost);
  state.lateSource = cost; state.lateProducerProof = ctx.artifact(`${ctx.next('late-producer')}.json`, { cost, originalSnapshot: original.snapshotId, originalKnowledgeCutoff: original.knowledgeCutoff,
    realExpenseId: state.expense.id, realStageCommand: state.stage }, { kind: 'actual-late-arriving-E-expense-and-F-stage-source', genuinePostCaptureProducer: true, SQLBusinessFixtures: false }); ctx.persist();
}
function matchingNew(database, after, before, table, test) {
  const previous = new Map(readRows(before.databases[database].tables[table]).map(r => [JSON.stringify(r.key), r]));
  return readRows(after.databases[database].tables[table]).filter(row => !previous.has(JSON.stringify(row.key)) && test(JSON.parse(row.raw)));
}
function atomicRestatement(ctx, response) {
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after), result = data(response), id = uuid(result.targetId), snapshot = uuid(result.snapshotId);
  const created = (table, predicate) => matchingNew(ctx.database, after, before, table, predicate);
  const records = created('operating_restatement_record', row => result.restatementIds.includes(row.id)); assert.equal(records.length, result.restatementIds.length); assert(records.length > 0);
  const anchor = records.find(row => row.key[0] === id); assert(anchor); const xid = anchor.xmin;
  const snapshotIds = records.map(row => JSON.parse(row.raw).restated_snapshot_id);
  const snapshots = created('project_operating_snapshot', row => snapshotIds.includes(row.id)); assert.equal(snapshots.length, records.length);
  const contexts = created('operating_source_context', row => snapshotIds.includes(row.snapshot_id)); assert.equal(contexts.length, records.length);
  const contextIds = contexts.map(row => row.key[0]);
  const signals = created('operating_signal_evaluation_result', row => snapshotIds.includes(row.referenced_snapshot_id)); assert.equal(signals.length, records.length);
  const signalIds = signals.map(row => row.key[0]);
  const bindings = created('operating_signal_gate_binding', row => signalIds.includes(row.signal_evaluation_id)); assert.equal(bindings.length, records.length * 4);
  const summaryIds = bindings.map(row => JSON.parse(row.raw).current_summary_id);
  const evidence = created('operating_evaluation_evidence', row => snapshotIds.includes(row.snapshot_id)); assert.equal(evidence.length, records.length);
  const evidenceIds = evidence.map(row => row.key[0]);
  assert(Object.values(result.evaluationRefs.bindingIds).every(id => bindings.some(row => row.key[0] === id)));
  assert(Object.values(result.evaluationRefs.summarySnapshotIds).every(id => summaryIds.includes(id)));
  const families = {
    restatements: records, snapshots, contexts,
    costMembers: created('operating_snapshot_cost_member', row => snapshotIds.includes(row.snapshot_id)),
    sourceMembers: created('operating_source_member', row => contextIds.includes(row.context_id)),
    maturity: created('data_maturity_evaluation_result', row => snapshotIds.includes(row.referenced_snapshot_id)),
    signals, evidence, bindings,
    summaries: created('approval_summary_snapshot', row => summaryIds.includes(row.id)),
    summaryPayloads: created('operating_gate_summary_payload', row => summaryIds.includes(row.summary_snapshot_id)),
    summaryFields: created('approval_summary_field_projection', row => summaryIds.includes(row.summary_snapshot_id)),
    reasons: created('operating_evaluation_reason', row => evidenceIds.includes(row.evidence_id)),
    commandReceipt: created('operating_command_receipt', row => row.operation_id === op && row.actor_id === ctx.state.actors.manager.id && row.authorized_response?.targetId === id),
    audit: created('audit_log', row => row.request_id === response.requestId && row.event_type === op && result.restatementIds.includes(row.target_id) && row.operator_id === ctx.state.actors.manager.id && row.result === 'success'),
    policyAudit: created('audit_log', row => row.request_id === response.requestId && row.event_type === 'OperatingPolicy_evaluate' && signalIds.includes(row.target_id) && row.operator_id === ctx.state.actors.manager.id && row.result === 'success'),
  };
  assert.equal(families.summaries.length, records.length * 4); assert.equal(families.summaryPayloads.length, records.length * 4);
  assert.equal(families.summaryFields.length, records.length * 16); assert.equal(families.maturity.length, records.length); assert.equal(families.commandReceipt.length, 1);
  assert.equal(families.audit.length, records.length); assert.equal(families.policyAudit.length, records.length);
  for (const [family, rows] of Object.entries(families)) { assert(rows.length > 0, `No actual required ${family}`); for (const row of rows) assert.equal(row.xmin, xid, `Required ${family} escaped the actual outer transaction`); }
  return { actualCommonXmin: xid, families: Object.fromEntries(Object.entries(families).map(([name, rows]) => [name, rows.map(row => ({ key: row.key, rowSHA256: row.sha256, xmin: row.xmin }))])), clientOuterTxClaimsUsed: false };
}
function unchangedBusinessRetry(ctx, attempt) {
  const before = loadSnapshot(ctx, attempt.before), after = loadSnapshot(ctx, attempt.after);
  const changes = difference(before, after).filter(ch => !(ch.database === ctx.database && ch.table === 'auth_session'));
  assert.equal(changes.length, 0, 'Idempotent same-body retry / rejected changed body left business or audit changes');
  for (const database of ctx.databases) {
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta); assert.deepEqual(before.objects[database], after.objects[database]);
    for (const table of Object.keys(before.databases[database].tables)) {
      if (database === ctx.database && table === 'auth_session') continue;
      const facts = meta => readRows(meta).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
      assert.deepEqual(facts(before.databases[database].tables[table]), facts(after.databases[database].tables[table]), 'Read/retry/rejection changed a persisted business fact or xmin');
    }
  }
}
export async function operatingLiveRestatement(ctx, api) {
  const f = ctx.state.fixtures; assert(f.operatingComplete && !f.lifecycleComplete && !f.liveRestatementComplete);
  const sourcePins = sourcesUnchanged(ctx); f.liveRestatement ??= {}; const state = f.liveRestatement;
  const call = async (id, params, body = null, binding = {}) => api.request(id, params, body, 'manager', binding);
  if (!state.original) {
    const id = uuid(f.operatingSnapshot.id); const original = await frozenSnapshot(ctx, id);
    assert.equal(original.periodEndSnapshotId, null); assert.equal(original.snapshotMode, 'realtime');
    state.original = ctx.artifact(`${ctx.next('original-frozen')}.json`, original, { kind: 'actual-pre-late-source-frozen-snapshot', localBusinessHashMinted: false }); state.originalSnapshotId = id; ctx.persist();
  }
  const bytes = fs.readFileSync(state.original.file); assert.equal(sha(bytes), state.original.rawBytesSha256); const original = JSON.parse(bytes);
  await lateExpense(ctx, api, original); assertFrozenPreserved(original, await frozenSnapshot(ctx, original.snapshotId));
  if (!state.command) {
    const prepResponse = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null,
      { query: { view: 'preparation', intent: 'restatement', restatesSnapshotId: original.snapshotId } });
    const preparation = data(prepResponse).preparation, targets = completeLiveTargets(preparation, f.project.id, original.snapshotId);
    const actualCosts = [f.actualCost.id, state.cost.id], costDecisions = expenseDecisions(preparation, actualCosts);
    assert(costDecisions.some(d => d.target.id === state.cost.id));
    const others = [];
    for (const target of targets.others) {
      const p = data(await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: target.projectId }, null,
        { query: { view: 'preparation', intent: 'restatement', restatesSnapshotId: target.restatesSnapshotRef.id } })).preparation;
      others.push({ ...target, costDecisions: expenseDecisions(p, actualCosts) });
    }
    const body = { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: preparation.headVersion, expectedProjectVersion: preparation.projectVersion,
      expectedInputHash: preparation.expectedInputHash, assertions: null, scope: 'live', periodEndSnapshotRef: null, restatesSnapshotRef: targets.primary.restatesSnapshotRef,
      restatementReason: '原不可变快照之后实际生产同业务日费用及真实E/F来源，显式纳入受控晚到事实重述。', restatementSummary: '保留原快照、上下文与来源集合；新快照、重述及H评价由服务器同事务生成。',
      costDecisions, laborCorrections: [], allocationCorrections: [], affectedTargets: others, acknowledgedChangedSourceRefs: [], stageCorrections: [], taxCorrections: [] };
    if (!state.invalidHashBlocked) {
      const bad = structuredClone(body); bad.restatesSnapshotRef.payloadHash = (bad.restatesSnapshotRef.payloadHash[0] === '0' ? '1' : '0') + bad.restatesSnapshotRef.payloadHash.slice(1);
      const rejected = await call(op, {}, bad, { expectedStatus: 409 }); unchangedBusinessRetry(ctx, rejected); state.invalidHashBlocked = rejected.receiptId; ctx.persist();
    }
    const response = await call(op, {}, body, { responseBirths: [{ table: 'operating_restatement_record', pointer: '/targetId' }, { table: 'project_operating_snapshot', pointer: '/snapshotId' }],
      mutableTables: ['project_operating_head', 'project_operating_snapshot', 'project_cost_inclusion_head', 'project_actual_cost_record'],
      updatedAnchors: [{ table: 'project_operating_snapshot', id: original.snapshotId, requestBinding: 'body:/restatesSnapshotRef/id' }] });
    state.command = data(response); state.atomicInput = ctx.artifact(`${ctx.next('restatement-attempt')}.json`, { before: response.before, after: response.after, requestId: response.requestId, body: state.command, receiptId: response.receiptId }); state.commandBody = ctx.artifact(`${ctx.next('restatement-command')}.json`, body); state.commandReceipt = response.receiptId; ctx.persist();
    state.transaction = ctx.artifact(`${ctx.next('restatement-atomic')}.json`, atomicRestatement(ctx, response), { kind: 'actual-restatement-G-H-audit-receipt-common-transaction', actualXminBound: true }); ctx.persist();
  }
  if (!state.transaction) {
    assert(state.atomicInput, 'Successful command requires its original immutable before/after attempt; Root reconciles, never replay the business POST');
    const bytes = fs.readFileSync(state.atomicInput.file); assert.equal(sha(bytes), state.atomicInput.rawBytesSha256);
    state.transaction = ctx.artifact(`${ctx.next('restatement-atomic-reconcile')}.json`, atomicRestatement(ctx, JSON.parse(bytes)), { kind: 'actual-restatement-transaction-observation-reconciled', businessReexecuted: false }); ctx.persist();
  }
  const result = state.command, viewResponse = await call('ProjectCostController_getOperatingRestatement', { id: uuid(result.targetId) }), view = data(viewResponse);
  const listResponse = await call('ProjectCostController_listOperatingRestatements', { projectId: f.project.id }), list = data(listResponse); assert(Array.isArray(list));
  assert(list.some(r => r.id === result.targetId)); assert.equal(view.scope, 'live'); assert.equal(view.periodEndSnapshotRef, null);
  assert.equal(view.restatesSnapshotRef.id, original.snapshotId); assert.equal(view.rootSnapshotRef.id, original.snapshotId); assert.equal(view.restatedSnapshotRef.id, result.snapshotId);
  assert(view.causalitySourceRefs.some(ref => ref.kind === 'ProjectActualCostRecord' && ref.id === state.cost.id), 'Actual late source must be present in server causal closure');
  assert(view.sourceRows.some(row => row.sourceRef.kind === 'ProjectActualCostRecord' && row.sourceRef.id === state.cost.id));
  const current = await frozenSnapshot(ctx, uuid(result.snapshotId)); assert.notEqual(current.sourceHash, original.sourceHash);
  assertFrozenPreserved(original, await frozenSnapshot(ctx, original.snapshotId)); const amounts = assertLateCostDelta(original, current, state.cost.id, state.lateSource);
  const bodyBytes = fs.readFileSync(state.commandBody.file); assert.equal(sha(bodyBytes), state.commandBody.rawBytesSha256); const body = JSON.parse(bodyBytes);
  if (!state.idempotentRetry) {
    const retry = await call(op, {}, body); assert.deepEqual(data(retry), result); unchangedBusinessRetry(ctx, retry); state.idempotentRetry = retry.receiptId; ctx.persist();
  }
  if (!state.changedBodyRetryBlocked) {
    const rejected = await call(op, {}, { ...body, restatementSummary: body.restatementSummary + '禁止以相同requestKey篡改正文。' }, { expectedStatus: 409 });
    unchangedBusinessRetry(ctx, rejected); state.changedBodyRetryBlocked = rejected.receiptId; ctx.persist();
  }
  state.verification = ctx.artifact(`${ctx.next('restatement-verified')}.json`, { sourcePins, original: state.original, newSnapshot: current, amounts,
    detailReceipt: viewResponse.receiptId, listReceipt: listResponse.receiptId, idempotentRetry: state.idempotentRetry, changedBodyRetryBlocked: state.changedBodyRetryBlocked,
    invalidReferenceHashBlocked: state.invalidHashBlocked, transaction: state.transaction }, { kind: 'actual-live-late-source-restatement-three-HTTP-operations', originalFrozenFactsUnchanged: true,
      sourceHashChangedFromRealProducer: true, realIdempotentRetry: true, realChangedBodyConflict: true, exactCents: true, sourceClosureIsServerProduced: true });
  f.liveRestatementComplete = true; ctx.persist();
  return { kind: 'actual-G-live-late-expense-restatement', completed: true, actualOperations: 3, realEExpenseAndFStageProducer: true, realServerRefsAndInputHash: true,
    immutableOldFactsPreserved: true, necessaryWritesFI: 'not-run', crossProjectMultiSourceCorrections: 'not-covered-by-this-bounded-fixture', periodClose: 'blocked-pending-user-decision7',
    G3Certified: false, G4Certified: false };
}
