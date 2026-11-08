// Pure assertions only. No FS, context, SQL, HTTP, process or permission action.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const PERIOD206 = Object.freeze({
  kind: 'Root-approved-Source13-H1-period-driver206', namespace: 'poms-r4ghi', epoch: 'g2-business13', run: 'main01',
  projectId: '4d9e57ad-4890-4f53-80da-c6d224ce576b', periodKey: '2026-W45',
  sourcePinsSHA256: '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',
  binarySHA256: '2d9ed8f711818b83b1cff440b72265bcacf9ff2f31f409d2d7d5a9aabd346e13',
  operation: 'ProjectCostController_createPeriodClosingSnapshot', faultKind: 'source-bound-required-write-sweep17',
});
export const sha206 = value => createHash('sha256').update(value).digest('hex');
export const samePin206 = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
export const rawPin206 = row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin });
export const sourceUnit206 = ref => {
  assert(['ProjectActualCostRecord', 'SharedCostAllocationResult'].includes(ref?.kind));
  return (ref.kind === 'ProjectActualCostRecord' ? 'cost:' : 'allocation:') + ref.id;
};
const keys206 = ['kind','namespace','epoch','run','phase','actualInputsComplete','projectId','periodKey','sourcePins','sourcePinsSHA256','helperH1','helperSources','apiProcess','binarySHA256','baseRegistry','toolAdmission119','candidate','taxCompletion','executionTools','approvedPrepared','approvedFIComplete','approvedNormalSuccess'];
const hash206 = value => assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value));
const pin206 = value => { assert(value && typeof value.file === 'string' && value.file.startsWith('/')); hash206(value.rawBytesSha256); };
export function assertPlanShape206(plan, mode) {
  assert(['prepare','fi-only','commit','read-verification'].includes(mode));
  assert.deepEqual(Object.keys(plan).sort(), [...keys206].sort());
  for (const key of ['kind','namespace','epoch','run','projectId','periodKey','sourcePinsSHA256','binarySHA256']) assert.equal(plan[key], PERIOD206[key]);
  assert.equal(plan.actualInputsComplete, true); assert(/^[A-Za-z0-9_-]{1,32}$/.test(plan.phase));
  for (const key of ['sourcePins','helperH1','apiProcess','baseRegistry','toolAdmission119','candidate','taxCompletion']) pin206(plan[key]);
  assert(Array.isArray(plan.helperSources) && plan.helperSources.length > 195);
  assert.equal(new Set(plan.helperSources.map(p => p.file)).size, plan.helperSources.length);
  for (const p of plan.helperSources) { assert(/^tools\/rust-r4ghi\/business\/[A-Za-z0-9_.-]+\.(mjs|json)$/.test(p.file)); hash206(p.sha256); }
  assert(Array.isArray(plan.executionTools) && plan.executionTools.length === 2);
  assert.equal(new Set(plan.executionTools.map(p => p.file)).size, 2); for (const p of plan.executionTools) pin206(p);
  if (mode === 'prepare') { assert.equal(plan.approvedPrepared, null); assert.equal(plan.approvedFIComplete, null); assert.equal(plan.approvedNormalSuccess, null); }
  else { pin206(plan.approvedPrepared); if (mode === 'fi-only') { assert.equal(plan.approvedFIComplete, null); assert.equal(plan.approvedNormalSuccess, null); }
    else { pin206(plan.approvedFIComplete); if (mode === 'commit') assert.equal(plan.approvedNormalSuccess, null); else pin206(plan.approvedNormalSuccess); } }
  return plan;
}
export function assertCalendar206(calendar) {
  assert.equal(calendar.current_week, '2026-W46'); assert.equal(calendar.prior_week, PERIOD206.periodKey);
  assert.equal(calendar.prior_start, '2026-11-02'); assert.equal(calendar.prior_end, '2026-11-08');
  assert(calendar.today >= '2026-11-09' && calendar.today < '2026-11-16', 'Only the real newly completed W45 is this approved positive case');
}
export function periodBody206(preparation, calendar) {
  assertCalendar206(calendar); const p = preparation;
  assert.equal(p.kind, 'preparation-only'); assert.equal(p.intent, 'period-close'); assert.equal(p.projectId, PERIOD206.projectId);
  assert.equal(p.periodKey, PERIOD206.periodKey); assert.equal(p.businessCutoff, calendar.prior_end);
  assert.equal(p.formalEligibility.status, 'eligible'); assert.deepEqual(p.blockingReasonCodes, []);
  assert.deepEqual(p.formalEligibility.blockingReasonCodes, []); assert(p.allowedCommandCodes.includes('period-close'));
  assert(Number.isSafeInteger(p.headVersion) && p.headVersion > 0); assert(Number.isSafeInteger(p.projectVersion) && p.projectVersion > 0);
  hash206(p.expectedInputHash); const b = p.selectedBaselinePackageRef;
  assert.equal(b?.kind, 'OperatingBaselinePackage'); assert(Number.isSafeInteger(b.rowVersion) && b.rowVersion > 0); hash206(b.payloadHash);
  assert(Array.isArray(p.sourceRows)); const costs = p.sourceRows.filter(r => ['direct-cost','allocation-share','supporting-source'].includes(r.rowKind));
  assert(costs.length > 0); assert(costs.every(r => r.rowKind !== 'supporting-source' && !r.blockingReasonCodes.includes('outside-business-cutoff')),
    'No truncation of unmapped/future economic roots to fit the bounded positive inventory');
  return { inputVersion: 'server-derived-v1', projectId: PERIOD206.projectId, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion,
    expectedInputHash: p.expectedInputHash, assertions: null, baselinePackageRef: { kind: b.kind, id: b.id, expectedVersion: b.rowVersion, payloadHash: b.payloadHash },
    periodKey: PERIOD206.periodKey, expectedPeriodSnapshotRef: null, costDecisions: [] };
}
const one206 = (values, predicate, label) => { const found = values.filter(predicate); assert.equal(found.length, 1, label); return found[0]; };
export function currentGraph206(rows, projectId = PERIOD206.projectId) {
  const head = one206(rows.raw('project_operating_head'), r => JSON.parse(r.raw).project_id === projectId, 'Exactly one actual operating head');
  const value = JSON.parse(head.raw), snapshot = one206(rows.raw('project_operating_snapshot'), r => JSON.parse(r.raw).id === value.current_snapshot_id, 'Actual selected current snapshot');
  const baseline = one206(rows.raw('operating_baseline_package'), r => JSON.parse(r.raw).id === value.baseline_package_id, 'Actual current baseline');
  const bindings = rows.raw('operating_signal_gate_binding').filter(r => { const v = JSON.parse(r.raw); return v.project_id === projectId && v.status === 'active'; });
  assert.equal(bindings.length, 4); assert.deepEqual(bindings.map(r => JSON.parse(r.raw).gate_stage_type).sort(), ['final','first','retention','second']);
  const ids = bindings.map(r => JSON.parse(r.raw).id).sort();
  for (const r of bindings) { const b = JSON.parse(r.raw), signal = one206(rows.values('operating_signal_evaluation_result'), s => s.id === b.signal_evaluation_id, 'Current signal owner'); assert.equal(signal.referenced_snapshot_id, value.current_snapshot_id); }
  const reviews = rows.raw('commission_gate_review_record').filter(r => { const v = JSON.parse(r.raw); return ids.includes(v.binding_id) && v.status === 'active'; });
  return { head: rawPin206(head), headValue: value, snapshot: rawPin206(snapshot), baseline: rawPin206(baseline),
    currentBindings: bindings.map(rawPin206).sort((a,b) => JSON.stringify(a.key).localeCompare(JSON.stringify(b.key))),
    currentReviews: reviews.map(rawPin206).sort((a,b) => JSON.stringify(a.key).localeCompare(JSON.stringify(b.key))) };
}
export function assertCurrentPreserved206(beforeGraph, afterGraph) {
  assert.equal(afterGraph.headValue.row_version, beforeGraph.headValue.row_version + 1);
  assert.equal(afterGraph.headValue.current_snapshot_id, beforeGraph.headValue.current_snapshot_id);
  assert.equal(afterGraph.headValue.baseline_package_id, beforeGraph.headValue.baseline_package_id);
  assert.deepEqual(afterGraph.snapshot, beforeGraph.snapshot); assert.deepEqual(afterGraph.baseline, beforeGraph.baseline);
  assert.deepEqual(afterGraph.currentBindings, beforeGraph.currentBindings); assert.deepEqual(afterGraph.currentReviews, beforeGraph.currentReviews);
}
export function assertReadViews206(period, snapshot, result, prepared) {
  const id = result.periodEndSnapshotId, sid = result.snapshotId;
  assert.equal(period.id, id); assert.equal(period.projectId, PERIOD206.projectId); assert.equal(period.periodKey, PERIOD206.periodKey);
  assert.equal(period.periodStart, prepared.calendar.prior_start); assert.equal(period.periodEnd, prepared.calendar.prior_end);
  assert.equal(period.businessTimezone, 'Asia/Hong_Kong'); assert.equal(period.originalFrozenUnchanged, true); assert.equal(period.latestRestatementRef, null);
  assert.equal(period.projectSnapshotRef.id, sid); assert.equal(snapshot.id, sid); assert.equal(snapshot.snapshotMode, 'period-end');
  assert.equal(snapshot.periodEndSnapshotRef.id, id); assert.equal(snapshot.projectId, PERIOD206.projectId);
  assert.equal(snapshot.sourceWindowStart, prepared.calendar.prior_start); assert.equal(snapshot.sourceWindowEnd, prepared.calendar.prior_end);
  assert.equal(period.sourceHash, result.sourceHash); assert.equal(snapshot.sourceHash, result.sourceHash);
  assert.equal(period.sourceContextId, snapshot.sourceContextId); assert.equal(period.sourcePayloadHash, snapshot.sourcePayloadHash);
  assert.equal(period.financialProjection.mode, 'full'); assert.equal(snapshot.financialProjection.mode, 'full');
  assert.deepEqual(period.financialProjection.value, snapshot.financialProjection.value); assert.deepEqual(period.sourceRows, snapshot.sourceRows);
  assert.deepEqual(snapshot.evaluationRefs, result.evaluationRefs);
  return { periodId: id, pairedSnapshotId: sid, actualPeriodAndSnapshotGET: true, fullProjectionPairIdentical: true };
}

export function verifyPeriodSuccess206(ctx, before, after, response, prepared, transaction, sessionId, h) {
  const old = h.rowsTax13(ctx, before, h.readRows), now = h.rowsTax13(ctx, after, h.readRows), value = response.body?.data ?? response.body;
  assert.equal(response.status, 201); assert.equal(response.responseComplete, true); assert.equal(response.transportFailure, false);
  assert.equal(response.requestBodySha256, prepared.bodySHA256); assert.equal(value.targetType, 'PeriodClosingSnapshot');
  assert.equal(value.targetId, value.periodEndSnapshotId); assert.equal(value.resultStatus, 'success');
  const period = now.owned('period_closing_snapshot', value.targetId), snapshot = now.owned('project_operating_snapshot', value.snapshotId);
  assert.equal(period.project_id, PERIOD206.projectId); assert.equal(period.period_key, PERIOD206.periodKey); assert.equal(period.project_snapshot_id, snapshot.id);
  assert.equal(period.period_start, prepared.calendar.prior_start); assert.equal(period.period_end, prepared.calendar.prior_end);
  assert.equal(period.business_timezone, 'Asia/Hong_Kong'); assert.equal(period.status, 'active'); assert.equal(period.producer_version, 1);
  assert.equal(snapshot.project_id, PERIOD206.projectId); assert.equal(snapshot.snapshot_mode, 'period-end'); assert.equal(snapshot.period_end_snapshot_id, period.id);
  assert.equal(snapshot.source_window_start, prepared.calendar.prior_start); assert.equal(snapshot.source_window_end, prepared.calendar.prior_end);
  assert.equal(snapshot.root_snapshot_id, snapshot.id); assert.equal(snapshot.supersedes_id, null); assert.equal(snapshot.status, 'active');
  const contextRow = now.owned('operating_source_context', snapshot.source_context_id), context = contextRow.frozen_payload;
  assert.equal(contextRow.snapshot_id, snapshot.id); assert.equal(context.contextId, contextRow.id);
  assert.equal(context.projectId, PERIOD206.projectId); assert.equal(context.snapshot.id, snapshot.id); assert.equal(context.snapshot.mode, 'period-end');
  assert.equal(context.snapshot.periodKey, PERIOD206.periodKey); assert.equal(context.snapshot.sourceWindowStart, prepared.calendar.prior_start);
  assert.equal(context.snapshot.sourceWindowEnd, prepared.calendar.prior_end); assert.equal(context.snapshot.businessTimezone, 'Asia/Hong_Kong');
  assert.equal(context.formalEligibility.status, 'eligible'); assert.deepEqual(context.formalEligibility.blockingReasonCodes, []);
  assert.equal(context.currency, 'CNY'); assert.equal(context.baseline.baselinePackageRef.id, prepared.body.baselinePackageRef.id);
  for (const item of [period, snapshot, contextRow]) assert.equal(item.source_hash, value.sourceHash);
  const economic = h.assertCostScopeTax13(context, snapshot, prepared.expectedCostScope, now);
  const cash = h.verifySharedCashValues58(context, snapshot, { receipts: old.values('receipt_record'), bases: old.values('receipt_accounting_basis'), terms: old.values('contract_term_snapshot') }, prepared.preparation);
  for (const field of ['effective_contract_total','receivable_confirmed_total','included_cost_total','original_baseline_cost','current_effective_baseline_cost','gross_margin_amount','gross_margin_rate','tax_impact_pending_amount','tax_pending_knowledge','source_context_id','source_hash']) assert.deepEqual(period[field], snapshot[field], 'Paired period facts diverged: ' + field);
  const beforeGraph = currentGraph206(old), afterGraph = currentGraph206(now); assert.deepEqual(beforeGraph, prepared.currentGraph); assertCurrentPreserved206(beforeGraph, afterGraph);
  assert.equal(value.newHeadVersion, afterGraph.headValue.row_version);
  const signal = now.owned('operating_signal_evaluation_result', value.evaluationRefs.signalEvaluationId), evidence = now.owned('operating_evaluation_evidence', signal.evidence_id);
  assert.equal(signal.project_id, PERIOD206.projectId); assert.equal(signal.referenced_snapshot_id, snapshot.id); assert.equal(evidence.snapshot_id, snapshot.id);
  assert.equal(evidence.source_hash, value.sourceHash); assert.equal(evidence.evaluation_hash, value.evaluationRefs.evaluationHash);
  const bindings = Object.values(value.evaluationRefs.bindingIds), summaries = Object.values(value.evaluationRefs.summarySnapshotIds);
  assert.equal(new Set(bindings).size, 4); assert.equal(new Set(summaries).size, 4);
  for (const [stage, id] of Object.entries(value.evaluationRefs.bindingIds)) {
    const b = now.owned('operating_signal_gate_binding', id); assert.equal(b.project_id, PERIOD206.projectId); assert.equal(b.signal_evaluation_id, signal.id);
    assert.equal(b.gate_stage_type, stage); assert.equal(b.status, 'superseded', 'A historical period binding is never published as current');
    assert.equal(b.current_summary_id, value.evaluationRefs.summarySnapshotIds[stage]);
    const s = now.owned('approval_summary_snapshot', b.current_summary_id); assert.equal(s.target_id, b.id);
  }
  const allowed = new Map([
    ['project_operating_head:' + JSON.stringify([PERIOD206.projectId]), ['row_version','updated_at','updated_by']],
    ['auth_session:' + JSON.stringify([sessionId]), ['last_seen_at','last_ip','idle_expires_at','row_version','updated_at']],
  ]);
  const immutable = h.immutableRowsTax13(ctx, before, after, allowed);
  const tableChecks = {
    operating_source_context: r => r.id === contextRow.id && r.snapshot_id === snapshot.id,
    project_operating_snapshot: r => r.id === snapshot.id,
    period_closing_snapshot: r => r.id === period.id,
    operating_source_member: r => r.context_id === contextRow.id,
    operating_snapshot_cost_member: r => r.snapshot_id === snapshot.id && prepared.scope.ghFacts.costUnits.includes(r.unit_key),
    operating_evaluation_evidence: r => r.id === evidence.id && r.snapshot_id === snapshot.id,
    operating_evaluation_reason: r => r.evidence_id === evidence.id,
    data_maturity_evaluation_result: r => r.id === value.evaluationRefs.maturityEvaluationId && r.referenced_snapshot_id === snapshot.id,
    operating_signal_evaluation_result: r => r.id === signal.id && r.referenced_snapshot_id === snapshot.id,
    operating_signal_gate_binding: r => bindings.includes(r.id) && r.signal_evaluation_id === signal.id,
    approval_summary_snapshot: r => summaries.includes(r.id) && bindings.includes(r.target_id),
    approval_summary_field_projection: r => summaries.includes(r.summary_snapshot_id),
    operating_gate_summary_payload: r => r.snapshot_id === snapshot.id && bindings.includes(r.binding_id) && summaries.includes(r.summary_snapshot_id),
    audit_log: r => [PERIOD206.operation,'OperatingPolicy_evaluate'].includes(r.event_type) && r.operator_id === prepared.scope.actorId && r.request_id === response.requestId && r.metadata?.projectId === PERIOD206.projectId,
    // Source13 service::save_receipt stores200 in this internal field. The
    // canonical actual HTTP status is separately required to be201 above.
    operating_command_receipt: r => r.operation_id === PERIOD206.operation && r.actor_id === prepared.scope.actorId && r.target_scope === PERIOD206.projectId && r.http_status === 200,
  };
  const counts = {}, tx = transaction.actualSharedBusinessAuditAuthXmin;
  for (const database of ctx.databases) for (const table of Object.keys(before.databases[database].tables)) {
    const previous = new Set(h.readRows(before.databases[database].tables[table]).map(r => JSON.stringify(r.key)));
    for (const row of h.readRows(after.databases[database].tables[table])) if (!previous.has(JSON.stringify(row.key))) {
      assert.equal(database, ctx.database); const check = tableChecks[table]; assert(check, 'An insertion escaped the bounded real period graph: ' + table);
      const cell = h.exactValueTax13(row); assert(check(cell), 'An inserted row belongs to another source/output graph: ' + table);
      assert.equal(row.xmin, tx, 'A new period graph row is outside the real business/audit transaction: ' + table);
      counts[table] = (counts[table] ?? 0) + 1;
    }
  }
  for (const table of ['operating_source_context','project_operating_snapshot','period_closing_snapshot','operating_evaluation_evidence','data_maturity_evaluation_result','operating_signal_evaluation_result','operating_command_receipt']) assert.equal(counts[table], 1);
  for (const table of ['operating_signal_gate_binding','approval_summary_snapshot','operating_gate_summary_payload']) assert.equal(counts[table], 4);
  assert.equal(counts.approval_summary_field_projection, 16); assert.equal(counts.audit_log, 2);
  assert.equal(counts.operating_snapshot_cost_member, prepared.scope.ghFacts.costUnits.length);
  assert.equal(counts.operating_source_member, context.scope.closureEvidenceRefs.length);
  const frozenRefs = context.scope.closureEvidenceRefs.map(r => JSON.stringify([r.kind,r.id,r.rowVersion,r.payloadHash])).sort();
  const actualRefs = now.values('operating_source_member').filter(r => r.context_id === contextRow.id).map(r => JSON.stringify([r.source_kind,r.source_id,r.source_row_version,r.source_payload_hash])).sort();
  assert.deepEqual(actualRefs, frozenRefs, 'The complete immutable factual closure must be persisted');
  const membership = now.values('operating_snapshot_cost_member').filter(r => r.snapshot_id === snapshot.id).map(r => r.unit_key).sort();
  assert.deepEqual(membership, [...prepared.scope.ghFacts.costUnits].sort());
  return { periodId: period.id, pairedSnapshotId: snapshot.id, economic, cash, immutable, actualInsertedRowsByTable: counts,
    realtimeCurrentPreserved: true, currentBindingsAndReviewsPreserved: true, periodBindingsPublishedAsCurrent: false,
    historicalBaselineReselectionApproved: false, allPeriodOutputsShareBusinessAuditTransaction: true, G3Certified: false, G4Certified: false };
}
