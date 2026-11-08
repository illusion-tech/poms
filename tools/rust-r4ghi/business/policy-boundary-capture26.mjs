import { assertClassificationOnly26 } from './policy-runtime46.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { data, sha, uuid } from './pure.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { expectedRef } from './handover.mjs';
import { POLICY26, canonical26, assertFrozenCase26, materialityBody26 } from './policy-boundary-values26.mjs';
const mutable = ['project_operating_head', 'operating_baseline_package', 'project_operating_snapshot', 'project_cost_inclusion_head', 'project_actual_cost_record'];
export function oneStoredRow26(ctx, snapshot, table, id) {
  const rows = readRows(snapshot.databases[ctx.database].tables[table]).filter(row => row.key[0] === id); assert.equal(rows.length, 1, `One actual ${table} row required`);
  return { row: rows[0], value: JSON.parse(rows[0].raw) };
}
export function inclusionDecisions26(preparation, costId = null) {
  const rows = preparation.sourceRows.filter(row => ['direct-cost', 'allocation-share', 'supporting-source'].includes(row.rowKind));
  if (costId === null) { assert.equal(rows.length, 0, 'H01 must be a genuinely empty collected cost scope'); return []; }
  assert.equal(rows.length, 1); const row = rows[0]; assert.equal(row.rowKind, 'direct-cost'); assert.equal(row.sourceRef.id, costId);
  if (row.currentDecisionRef) return []; // Keep the actual previous include; do not manufacture repeated source revisions.
  return [{ target: expectedRef(row.sourceRef), expectedVersion: 0, decision: 'include', recognitionRole: 'direct-source', reasonCode: 'actual-expense',
    reasonText: '显式纳入本独立项目真实25元已确认费用经E/F生产的唯一实际成本。', primaryCostRef: null, supportingSourceRefs: row.sourceMembers.map(expectedRef),
    evidenceRefs: [expectedRef(row.sourceRef), ...row.sourceMembers.map(expectedRef)] }];
}
export async function prepare26(ctx, api, intent, classificationCostId = null) {
  const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: ctx.state.fixtures.project.id }, null, 'manager', { query: { view: 'preparation', intent, snapshotMode: 'realtime' } });
  const p = data(response).preparation; assert.equal(p.kind, 'preparation-only'); assert.equal(p.projectId, ctx.state.fixtures.project.id); assert.equal(p.intent, intent);
  if (!p.allowedCommandCodes.includes(intent)) assertClassificationOnly26(p, classificationCostId); // Only the actual single cost can be supplied as an explicit same-TX classification. H01 passes null and still stops on any denial.
  return { value: p, receipt: response.receiptId, before: response.before, after: response.after };
}
export async function activate26(ctx, api) {
  const f = ctx.state.fixtures; assert(f.handoverComplete && !f.operatingBaselineCommand);
  const prepared = await prepare26(ctx, api, 'baseline-activation'), p = prepared.value;
  assert.equal(p.selectedBaselinePackageRef, null); assert.equal(p.proposedOriginalCostRef.id, f.cost.id);
  const refs = [p.proposedOriginalCostRef, ...p.sourceRows.flatMap(row => [row.sourceRef, ...row.sourceMembers])].filter(Boolean), basis = refs.find(ref => ref.id === f.handover.handoverBasisSnapshotId); assert(basis);
  const response = await api.request('ProjectCostController_activateOperatingBaselinePackage', {}, { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion,
    expectedInputHash: p.expectedInputHash, assertions: null, expectedCurrentPackageRef: null, originalAdoptedCostRef: expectedRef(p.proposedOriginalCostRef), selectedHandoverBasisRef: expectedRef(basis),
    handoverRebaselineRef: null, approvedChangeRefs: [], reason: '按实际已确认移交采用唯一真实CNY零税30元项目估算；尚无实收款或实际成本。' }, 'manager',
  { responseBirths: [{ table: 'operating_baseline_package', pointer: '/targetId' }], mutableTables: mutable });
  f.operatingBaselineCommand = data(response); assert.equal(f.operatingBaselineCommand.evaluationRefs, null); assert.equal(f.operatingBaselineCommand.snapshotId, null); ctx.persist();
  return { kind: 'actual-baseline30-only-not-H-evaluation', preparationReceipt: prepared.receipt, commandReceipt: response.receiptId, baselineId: f.operatingBaselineCommand.targetId };
}
function expectedAction26(name, stage) { return name === 'h01' ? stage === 'first' ? 'prompt' : 'block' : name === 'below' ? 'review' : name === 'h04' ? stage === 'first' ? 'prompt' : 'review' : stage === 'first' ? 'review' : 'block'; }
async function readFour26(ctx, api, ids, name, context, evaluationHash, reviewId = null) {
  assert.deepEqual(Object.keys(ids).sort(), ['final', 'first', 'retention', 'second']); assert.equal(new Set(Object.values(ids)).size, 4);
  const result = [];
  for (const [stage, id] of Object.entries(ids)) {
    const response = await api.request('ProjectCostController_getCommissionGateBinding', { id: uuid(id) }, null, 'manager'), gate = data(response);
    assert.equal(gate.projectId, context.projectId); assert.equal(gate.gateStageType, stage); assert.equal(gate.evaluationContext.sourceHash, context.sourceHash); assert.equal(gate.evaluationContext.evaluationHash, evaluationHash);
    assert.equal(gate.bindingAction, expectedAction26(name, stage), 'Four independent stages must keep their frozen actions');
    const after = loadSnapshot(ctx, response.after), stored = oneStoredRow26(ctx, after, 'operating_signal_gate_binding', id), summary = oneStoredRow26(ctx, after, 'operating_gate_summary_payload', gate.summarySnapshotId);
    assert.equal(stored.value.project_id, context.projectId); assert.equal(stored.value.current_summary_id, gate.summarySnapshotId); assert.equal(stored.value.status, 'active');
    assert.equal(summary.value.project_id, context.projectId); assert.equal(summary.value.snapshot_id, context.snapshot.id); assert.equal(summary.value.binding_id, id); assert.equal(summary.value.signal_review_id, reviewId);
    assert.equal(summary.value.source_hash, context.sourceHash); assert.equal(summary.value.evaluation_hash, evaluationHash); assert.equal(summary.value.policy_hash, POLICY26);
    assert.equal(sha(JSON.stringify(canonical26(summary.value.frozen_payload))), summary.value.payload_hash);
    assert.equal(summary.value.frozen_payload.bindingAction, expectedAction26(name, stage));
    if (name === 'h04') { assert(summary.value.frozen_payload.reasonItems.some(reason => reason.ruleId === 'H04')); assert(!summary.value.frozen_payload.reasonItems.some(reason => reason.ruleId === 'H08')); }
    result.push({ stage, id, gate, receipt: response.receiptId, bindingRow: stored.row, summaryRow: summary.row });
  }
  assert.equal(new Set(result.map(row => row.gate.summarySnapshotId)).size, 4); return result;
}
export async function captureCase26(ctx, api, name) {
  const f = ctx.state.fixtures; assert(f.operatingBaselineCommand); assert(name === 'h01' ? !f.expense && !f.receipts26 : f.actualExpenseStageComplete && f.zeroTax26);
  const prepared = await prepare26(ctx, api, 'snapshot-create', name === 'h01' ? null : f.actualCost.id), p = prepared.value; assert.equal(p.selectedBaselinePackageRef.id, f.operatingBaselineCommand.targetId);
  const body = { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion, expectedInputHash: p.expectedInputHash, assertions: null,
    baselinePackageRef: expectedRef(p.selectedBaselinePackageRef), snapshotMode: 'realtime', periodKey: null, costDecisions: inclusionDecisions26(p, name === 'h01' ? null : f.actualCost.id) };
  const response = await api.request('ProjectCostController_createProjectOperatingSnapshot', {}, body, 'manager', { responseBirths: [{ table: 'project_operating_snapshot', pointer: '/targetId' }], mutableTables: mutable });
  const command = data(response), id = uuid(command.snapshotId ?? command.targetId), after = loadSnapshot(ctx, response.after);
  const snapshot = oneStoredRow26(ctx, after, 'project_operating_snapshot', id), context = oneStoredRow26(ctx, after, 'operating_source_context', snapshot.value.source_context_id), frozen = context.value.frozen_payload;
  assert.equal(snapshot.value.project_id, f.project.id); assert.equal(context.value.project_id, f.project.id); assert.equal(context.value.snapshot_id, id); assert.equal(frozen.projectId, f.project.id); assert.equal(frozen.snapshot.id, id);
  assert.equal(context.value.source_hash, command.sourceHash); assert.equal(frozen.sourceHash, command.sourceHash); assert.equal(sha(JSON.stringify(canonical26(frozen))), context.value.payload_hash);
  const view = data(await api.request('ProjectCostController_getProjectOperatingSnapshot', { id }, null, 'manager')); assert.equal(view.evaluationStatus, 'evaluated'); assert.equal(view.certification, 'verified'); assert.equal(view.sourceHash, frozen.sourceHash); assert(view.evaluationRefs);
  const signal = data(await api.request('ProjectCostController_getOperatingSignalEvaluation', { id: view.evaluationRefs.signalEvaluationId }, null, 'manager')); assertFrozenCase26(frozen, signal, name);
  const gates = await readFour26(ctx, api, view.evaluationRefs.bindingIds, name, frozen, signal.evaluationContext.evaluationHash);
  const proof = ctx.artifact(`${ctx.next('H26-' + name + '-published')}.json`, { kind: 'actual-normal-producer-published-G-H-rule-case', case: name, projectId: f.project.id,
    preparation: prepared.receipt, command: response.receiptId, commandBefore: response.before, commandAfter: response.after, actualContext: context.row, actualSnapshot: snapshot.row, signal, gates,
    formalEligibilityAndMaturityFromServer: true, SQLContextFixture: false, G3Certified: false, G4Certified: false });
  const result = { kind: 'actual-published-H26-case', name, projectId: f.project.id, snapshotId: id, sourceContextId: context.value.id, sourceHash: frozen.sourceHash, signalId: signal.signalEvaluationId, proof,
    immutableFacts: [{ table: 'project_operating_snapshot', id, sha256: snapshot.row.sha256, xmin: snapshot.row.xmin }, { table: 'operating_source_context', id: context.value.id, sha256: context.row.sha256, xmin: context.row.xmin }] };
  f.publishedCases26 ??= {}; f.publishedCases26[name] = result; if (name === 'h01') f.h01Published26 = result; ctx.persist(); return result;
}
export async function attentionOverlay26(ctx, api, rationale) {
  const f = ctx.state.fixtures, published = f.publishedCases26.below; assert(published && !f.attentionReview26);
  const signal = data(await api.request('ProjectCostController_getOperatingSignalEvaluation', { id: published.signalId }, null, 'manager'));
  assert.equal(signal.riskLevel, 'unknown'); assert.equal(signal.systemRiskLevel, 'unknown'); assert.equal(signal.dataMaturityLevel, 'mature');
  const body = materialityBody26(signal, rationale, randomUUID());
  const response = await api.request('ProjectCostController_reviewOperatingSignalEvaluation', { id: signal.signalEvaluationId }, body, 'manager', { responseBirths: [{ table: 'operating_signal_review_record', pointer: '/reviewRecordId' }],
    mutableTables: ['operating_signal_evaluation_result', 'operating_signal_gate_binding', 'operating_signal_review_record', 'approval_summary_snapshot'], updatedAnchors: [{ table: 'operating_signal_evaluation_result', id: signal.signalEvaluationId, requestBinding: 'path:id' }] });
  const review = data(response), before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
  const stored = oneStoredRow26(ctx, after, 'operating_signal_review_record', review.reviewRecordId), value = stored.value, payload = value.review_payload;
  assert.equal(value.signal_evaluation_id, published.signalId); assert.equal(value.handled_by, ctx.state.actors.manager.id); assert.equal(value.source_hash, published.sourceHash); assert.equal(value.producer_version, 1);
  assert.equal(sha(JSON.stringify(canonical26(payload))), value.payload_hash); assert.equal(payload.policyHash, POLICY26); assert.equal(payload.sourceHash, published.sourceHash);
  assert.equal(payload.verifiedMaterialityReview.riskDecision, 'attention'); assert.deepEqual(payload.verifiedMaterialityReview.evidenceRefs, body.manualMaterialityReview.evidenceRefs);
  assert(payload.effectiveOutput.allReasons.some(reason => reason.ruleId === 'H04')); assert(!payload.effectiveOutput.allReasons.some(reason => reason.ruleId === 'H08'));
  assert.equal(payload.effectiveOutput.systemRiskLevel, 'unknown'); assert.equal(payload.effectiveOutput.effectiveRiskLevel, 'attention'); assert.equal(payload.effectiveOutput.costReadiness.dataMaturityLevel, signal.dataMaturityLevel);
  assert.equal(review.dataMaturityLevel, signal.dataMaturityLevel); assert.equal(review.costActionRecommendation, signal.costActionRecommendation); assert.equal(review.riskLevel, 'attention'); assert.equal(review.systemRiskLevel, 'unknown');
  for (const table of ['project_operating_snapshot', 'operating_source_context', 'operating_evaluation_reason', 'operating_source_member']) assert.deepEqual(readRows(after.databases[ctx.database].tables[table]), readRows(before.databases[ctx.database].tables[table]), 'Overlay changed immutable source/base reasons');
  const context = oneStoredRow26(ctx, after, 'operating_source_context', published.sourceContextId).value.frozen_payload;
  const old = readRows(before.databases[ctx.database].tables.operating_signal_gate_binding).filter(row => JSON.parse(row.raw).signal_evaluation_id === published.signalId);
  assert.equal(old.length, 4); assert(Object.values(review.gateBindingIds).every(id => !old.some(row => row.key[0] === id)), 'Manual review must append four genuinely new bindings');
  for (const row of old) assert.equal(oneStoredRow26(ctx, after, 'operating_signal_gate_binding', row.key[0]).value.status, 'superseded');
  const gates = await readFour26(ctx, api, review.gateBindingIds, 'h04', context, review.evaluationContext.evaluationHash, review.reviewRecordId);
  const proof = ctx.artifact(`${ctx.next('H26-real-H04-overlay')}.json`, { kind: 'actual-H08-attention-overlay-and-new-H04-bindings', review, reviewRow: stored.row, request: body, before: response.before, after: response.after, gates,
    H04CheckedInReviewPayloadAndAllFourSummaries: true, originalBaseReasonsPreserved: true, sourceFactsUnchanged: true, qualitativeJudgmentOnly: true, G3Certified: false, G4Certified: false });
  f.attentionReview26 = { reviewRecordId: review.reviewRecordId, proof, commandReceipt: response.receiptId }; ctx.persist(); return f.attentionReview26;
}
export function assertPreviousFacts26(ctx, after) {
  for (const value of Object.values(ctx.state.fixtures.publishedCases26)) for (const fact of value.immutableFacts) {
    const actual = oneStoredRow26(ctx, after, fact.table, fact.id).row; assert.equal(actual.sha256, fact.sha256); assert.equal(actual.xmin, fact.xmin);
  }
}
