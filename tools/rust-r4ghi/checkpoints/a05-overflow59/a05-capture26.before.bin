import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';
import { expectedRef } from './handover.mjs';
import { expenseDecisions } from './operating.mjs';
import { assertA05Metrics26 } from './a05-values26.mjs';
import { loadSnapshot } from './snapshot.mjs';
import { assertSweepRollback } from './fault-sweep.mjs';
import { requireOwnedScope } from './required-write-inventory.mjs';
import { actualReceipt26 } from './a05-finance26.mjs';

const mutable = ['project_operating_head', 'operating_baseline_package', 'project_operating_snapshot', 'project_cost_inclusion_head', 'project_actual_cost_record'];
export async function prepareSnapshotBody26(ctx, api) {
  const f = ctx.state.fixtures, response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null, 'manager', { query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' } });
  const p = data(response).preparation; assert.equal(p.kind, 'preparation-only'); assert(p.selectedBaselinePackageRef);
  return { receipt: response.receiptId, body: { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion,
    expectedInputHash: p.expectedInputHash, assertions: null, baselinePackageRef: expectedRef(p.selectedBaselinePackageRef), snapshotMode: 'realtime', periodKey: null, costDecisions: expenseDecisions(p, [f.actualCost.id]) } };
}
export async function publishBoundary26(ctx, api, scenario) {
  const f = ctx.state.fixtures;
  if (!f.operatingBaselineCommand) {
    const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null, 'manager', { query: { view: 'preparation', intent: 'baseline-activation' } });
    const p = data(response).preparation, refs = [p.proposedOriginalCostRef, p.selectedBaselinePackageRef, ...p.sourceRows.flatMap(row => [row.sourceRef, ...row.sourceMembers])].filter(Boolean);
    const basis = refs.find(ref => ref.id === f.handover.handoverBasisSnapshotId); assert(basis && p.proposedOriginalCostRef.id === f.cost.id);
    const command = await api.request('ProjectCostController_activateOperatingBaselinePackage', {}, { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion,
      expectedInputHash: p.expectedInputHash, assertions: null, expectedCurrentPackageRef: p.selectedBaselinePackageRef ? expectedRef(p.selectedBaselinePackageRef) : null,
      originalAdoptedCostRef: expectedRef(p.proposedOriginalCostRef), selectedHandoverBasisRef: expectedRef(basis), handoverRebaselineRef: null, approvedChangeRefs: [], reason: 'A05单合同真实项目采用一次真实项目估算，不把MAX合同值或实际费用伪装成基线。' }, 'manager',
    { responseBirths: [{ table: 'operating_baseline_package', pointer: '/targetId' }], mutableTables: mutable });
    f.operatingBaselineCommand = data(command); f.operatingBaselineReceipt = command.receiptId; ctx.persist(); assert.equal(f.operatingBaselineCommand.evaluationRefs, null);
  }
  if (!f.operatingSnapshotCommand) {
    const prepared = await prepareSnapshotBody26(ctx, api); f.a05SnapshotInput = prepared; ctx.persist();
    const response = await api.request('ProjectCostController_createProjectOperatingSnapshot', {}, prepared.body, 'manager', { responseBirths: [{ table: 'project_operating_snapshot', pointer: '/targetId' }], mutableTables: mutable });
    f.operatingSnapshotCommand = data(response); f.a05SnapshotHTTP = { receipt: response.receiptId, before: response.before, after: response.after, proofPending: true }; ctx.persist();
  }
  const id = uuid(f.operatingSnapshotCommand.snapshotId ?? f.operatingSnapshotCommand.targetId), response = await api.request('ProjectCostController_getProjectOperatingSnapshot', { id }, null, 'manager'), view = data(response);
  assert.equal(view.id, id); assert.equal(view.certification, 'verified'); assert(view.evaluationRefs); assert.equal(view.financialProjection.mode, 'full');
  const actual = await ctx.db(async c => (await c.query('SELECT c.id::text,c.source_hash,c.payload_hash,c.frozen_payload,s.gross_margin_amount::text,s.gross_margin_rate::text,s.receivable_confirmed_total::text,s.included_cost_total::text FROM poms.project_operating_snapshot s JOIN poms.operating_source_context c ON c.id=s.source_context_id AND c.project_id=s.project_id WHERE s.id=$1::uuid AND s.project_id=$2::uuid', [id, f.project.id])).rows);
  assert.equal(actual.length, 1); const row = actual[0]; assert.equal(row.source_hash, view.sourceHash); assert.equal(row.id, view.sourceContextId); assertA05Metrics26(row.frozen_payload, scenario);
  assert.equal(row.gross_margin_amount, scenario.margin); assert.equal(row.gross_margin_rate, scenario.ratio); assert.equal(row.receivable_confirmed_total, scenario.cashNet); assert.equal(row.included_cost_total, scenario.costNet);
  const evaluation = view.evaluationRefs; assert.equal(new Set(Object.values(evaluation.bindingIds)).size, 4); assert.equal(new Set(Object.values(evaluation.summarySnapshotIds)).size, 4);
  const signal = data(await api.request('ProjectCostController_getOperatingSignalEvaluation', { id: evaluation.signalEvaluationId }, null, 'manager')); assert.equal(signal.evaluationContext.sourceHash, view.sourceHash);
  if (scenario.cashGross === '0.01') {
    assert(signal.reasonItems.some(reason => reason.ruleId === 'H03')); assert(signal.reasonItems.some(reason => reason.ruleId === 'H08'));
    assert.equal(signal.metricKnowledge.grossMarginRateUse, 'observation-only'); assert.equal(signal.metricKnowledge.grossMarginRateReason, 'low-receipt-ratio'); assert.equal(signal.metricKnowledge.ratiosStable, false);
  }
  const bindings = [];
  for (const bindingId of Object.values(evaluation.bindingIds)) { const gate = data(await api.request('ProjectCostController_getCommissionGateBinding', { id: bindingId }, null, 'manager')); assert.equal(gate.evaluationContext.sourceHash, view.sourceHash); bindings.push(gate); }
  const proof = ctx.artifact(`${ctx.next('a05-actual-published-metrics')}.json`, { snapshotReceipt: response.receiptId, stored: actual, actualSignal: signal, actualBindings: bindings,
    actualPublishedSnapshot: true, preparationWasNotCountedAsSnapshot: true, actualHReloadProducedFourBindings: true, independentProject: true, businessFixturesSQL: false });
  f.a05SnapshotHTTP.proofPending = false; f.a05SnapshotHTTP.proof = proof; f.operatingComplete = true; ctx.persist(); return { kind: 'actual-A05-published-boundary', snapshotId: id, proof };
}
export async function overflowBoundary26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.operatingComplete && f.a05SnapshotHTTP.proof && f.a05SnapshotHTTP.proofPending === false);
  f.a05Overflow26 ??= {}; const state = f.a05Overflow26;
  if (state.proof) return { kind: 'actual-A05-atomic-capacity-rejection', proof: state.proof, noCommandReplay: true };
  assert(!state.failedAttempt, 'Inspect the original overflow response/rollback proof before any retry');
  // Save a genuine next-version body before adding the lawful second receipt.
  // Its key differs from the already committed first snapshot, so it cannot be
  // mistaken for that snapshot's idempotent response. No input hash is minted.
  if (!state.input) { state.input = await prepareSnapshotBody26(ctx, api); assert.notEqual(state.input.body.expectedInputHash, f.a05SnapshotInput.body.expectedInputHash); ctx.persist(); }
  state.extraCash ??= {}; ctx.persist();
  await actualReceipt26(ctx, api, state.extraCash, '0.01', { net: '0.01', tax: '0.00', rate: '0.0000' });
  const response = await api.request('ProjectCostController_createProjectOperatingSnapshot', {}, state.input.body, 'manager', { expectedStatus: 422, mutableTables: mutable });
  state.failedAttempt = { receipt: response.receiptId, before: response.before, after: response.after, proofPending: true }; ctx.persist();
  const error = data(response); assert.equal(error.code, 'operating_money_capacity_exceeded');
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
  const sessionId = requireOwnedScope(ctx, before, { projectId: f.project.id, actorId: ctx.state.actors.manager.id, actorKey: 'manager' });
  const rollback = assertSweepRollback(ctx, before, after, { sessionId }, ctx.state.actors.manager.id);
  state.proof = ctx.artifact(`${ctx.next('a05-atomic-capacity422')}.json`, { receipt: response.receiptId, before: response.before, after: response.after, rollback,
    actualExtraReceipt: state.extraCash, aggregateCategory: 'confirmed cash gross/net', expectedAggregate: '10000000000000000.00', code: error.code,
    earlierPublishedMAXSnapshotStillImmutable: true, businessDatabaseWritesByRejectedCapture: 0, aggregateOrEvidenceInsertsCommitted: 0, staleHashWasNotSubstitutedWithLocalHash: true });
  state.failedAttempt.proofPending = false; ctx.persist(); return { kind: 'actual-A05-atomic-capacity-rejection', proof: state.proof };
}
