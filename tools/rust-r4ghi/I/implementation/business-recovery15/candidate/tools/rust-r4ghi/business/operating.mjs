import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { data, uuid } from './pure.mjs';
import { expectedRef } from './handover.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
const refsOf = preparation => [preparation.proposedOriginalCostRef, preparation.selectedBaselinePackageRef, ...preparation.sourceRows.flatMap(row => [row.sourceRef, ...row.sourceMembers])].filter(Boolean);
function decisions(preparation, actualCostIds) {
  const result = [];
  for (const row of preparation.sourceRows.filter(row => ['direct-cost', 'allocation-share', 'supporting-source'].includes(row.rowKind))) {
    if (row.rowKind === 'direct-cost') {
      assert(actualCostIds.includes(row.sourceRef.id), 'Do not implicitly classify a source outside this explicit fixture');
      result.push({ target: expectedRef(row.sourceRef), expectedVersion: row.currentDecisionRef ? rv(row.currentDecisionRef) : 0,
        decision: 'include', recognitionRole: 'direct-source', reasonCode: 'actual-expense', reasonText: '显式纳入本项目真实已确认费用经E/F生产的实际成本；金额和阶段由服务端计算。',
        primaryCostRef: null, supportingSourceRefs: row.sourceMembers.map(expectedRef), evidenceRefs: [expectedRef(row.sourceRef), ...row.sourceMembers.map(expectedRef)] });
    } else if (row.rowKind === 'supporting-source') throw new Error('An upstream fact lacks a real E mapping; G cannot classify it into an invented cost');
    else throw new Error('Allocation fixture was not produced by this minimal expense case; do not infer classifications');
  }
  return result;
}
function rawNulls(api, operationId, value) {
  const op = api.operations.get(operationId), ref = op.op.responses[String(api.success(operationId))].content['application/json'].schema.$ref;
  if (!ref) return;
  const schema = api.spec.components.schemas[ref.split('/').at(-1)];
  for (const [key, rule] of Object.entries(schema.properties ?? {})) if (rule.enum?.length === 1 && rule.enum[0] === null) assert.equal(value[key], null, 'Sensitive compatibility keys must be literal null even for a fully permitted caller');
}
export async function operatingCaptureAndReview(ctx, api) {
  const f = ctx.state.fixtures; assert(f.actualExpenseStageComplete && !f.operatingComplete);
  const call = async (op, params, body = null, binding = {}) => {
    const value = data(await api.request(op, params, body, 'manager', binding)); rawNulls(api, op, value); return value;
  };
  const prep = async intent => {
    const value = await call('ProjectCostController_getProjectUnifiedAccounting', { projectId: f.project.id }, null, { query: { view: 'preparation', intent } });
    assert(value.preparation?.kind === 'preparation-only' && value.preparation.intent === intent); return value.preparation;
  };
  const mutable = ['project_operating_head', 'operating_baseline_package', 'project_operating_snapshot', 'project_cost_inclusion_head', 'project_actual_cost_record', 'shared_cost_allocation_result'];
  if (!f.operatingBaselineCommand) {
    const p = await prep('baseline-activation'); assert(p.proposedOriginalCostRef && p.proposedOriginalCostRef.id === f.cost.id);
    const basis = refsOf(p).find(ref => ref.id === f.handover.handoverBasisSnapshotId); assert(basis, 'Use only the actual preparation handover basis reference');
    f.operatingBaselineCommand = await call('ProjectCostController_activateOperatingBaselinePackage', {}, { inputVersion: 'server-derived-v1', projectId: f.project.id,
      expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion, expectedInputHash: p.expectedInputHash, assertions: null,
      expectedCurrentPackageRef: p.selectedBaselinePackageRef ? expectedRef(p.selectedBaselinePackageRef) : null, originalAdoptedCostRef: expectedRef(p.proposedOriginalCostRef),
      selectedHandoverBasisRef: expectedRef(basis), handoverRebaselineRef: null, approvedChangeRefs: [], reason: '从两份真实批准激活合同采用同一项目估算一次，固定已确认移交依据。' },
      { responseBirths: [{ table: 'operating_baseline_package', pointer: '/targetId' }], mutableTables: mutable }); ctx.persist();
    assert.equal(f.operatingBaselineCommand.evaluationRefs, null, 'Baseline activation must not pretend to evaluate H');
    const rows = await ctx.db(async c => (await c.query("SELECT id::text,evaluation_hash FROM poms.operating_command_receipt WHERE operation_id=$1 AND actor_id=$2::uuid AND authorized_response->>'targetId'=$3", ['ProjectCostController_activateOperatingBaselinePackage', ctx.state.actors.manager.id, f.operatingBaselineCommand.targetId])).rows);
    assert.equal(rows.length, 1); assert.equal(rows[0].evaluation_hash, null);
    f.baselineNoEvaluationEvidence = ctx.artifact(`${ctx.next('baseline-no-eval')}.json`, rows, { kind: 'actual-baseline-command-evaluation-hash-is-null', evaluationPretended: false }); ctx.persist();
  }
  f.operatingBaseline = await call('ProjectCostController_getCurrentOperatingBaselinePackage', { projectId: f.project.id });
  if (!f.operatingSnapshotCommand) {
    const p = await prep('snapshot-create'); assert(p.selectedBaselinePackageRef);
    f.operatingSnapshotCommand = await call('ProjectCostController_createProjectOperatingSnapshot', {}, { inputVersion: 'server-derived-v1', projectId: f.project.id,
      expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion, expectedInputHash: p.expectedInputHash, assertions: null, baselinePackageRef: expectedRef(p.selectedBaselinePackageRef),
      snapshotMode: 'realtime', periodKey: null, costDecisions: decisions(p, [f.actualCost.id]) },
      { responseBirths: [{ table: 'project_operating_snapshot', pointer: '/targetId' }], mutableTables: mutable }); ctx.persist();
  }
  f.operatingSnapshot = await call('ProjectCostController_getProjectOperatingSnapshot', { id: uuid(f.operatingSnapshotCommand.snapshotId ?? f.operatingSnapshotCommand.targetId) }); ctx.persist();
  assert.equal(f.operatingSnapshot.evaluationStatus, 'evaluated'); assert(f.operatingSnapshot.evaluationRefs);
  const evaluation = f.operatingSnapshot.evaluationRefs;
  assert.equal(new Set(Object.values(evaluation.bindingIds)).size, 4); assert.equal(new Set(Object.values(evaluation.summarySnapshotIds)).size, 4);
  let signal = await call('ProjectCostController_getOperatingSignalEvaluation', { id: uuid(evaluation.signalEvaluationId) });
  if (!f.signalReview) {
    f.signalReview = await call('ProjectCostController_reviewOperatingSignalEvaluation', { id: signal.signalEvaluationId }, { inputVersion: 'server-derived-v1', reviewDecision: 'approve',
      resolvedDataMaturityLevel: signal.dataMaturityLevel, costActionRecommendation: signal.costActionRecommendation, referencedBaselineVersion: signal.referencedBaselineVersion,
      referencedSnapshotVersion: signal.referencedSnapshotVersion, expectedSourceHash: signal.evaluationContext.sourceHash, expectedEvaluationHash: signal.evaluationContext.evaluationHash,
      expectedVersion: rv(signal), requestKey: randomUUID(), manualMaterialityReview: null, reviewComment: '按真实不可变来源完成复核，不改变系统成熟度、金额、hard constraint或未知质性结论。' },
      { responseBirths: [{ table: 'operating_signal_review_record', pointer: '/reviewRecordId' }], mutableTables: ['operating_signal_evaluation_result', 'operating_signal_gate_binding', 'operating_signal_review_record', 'approval_summary_snapshot'],
        updatedAnchors: [{ table: 'operating_signal_evaluation_result', id: signal.signalEvaluationId, requestBinding: 'path:id' }] }); ctx.persist();
  }
  signal = await call('ProjectCostController_getOperatingSignalEvaluation', { id: signal.signalEvaluationId });
  const currentBindings = f.signalReview.gateBindingIds; assert(currentBindings && new Set(Object.values(currentBindings)).size === 4);
  f.gateViews ??= {};
  for (const [stage, id] of Object.entries(currentBindings)) {
    const gate = await call('ProjectCostController_getCommissionGateBinding', { id: uuid(id) }); assert.equal(gate.gateStageType, stage); f.gateViews[stage] = gate; ctx.persist();
  }
  if (!f.gateReview) {
    const gate = f.gateViews.first;
    const blockingReasonCodes = [...new Set(gate.reasonItems.filter(reason => reason.stageActions?.[gate.gateStageType] === 'block').map(reason => reason.code))].sort();
    f.gateReview = await call('ProjectCostController_reviewCommissionGateBinding', { id: gate.bindingId }, { inputVersion: 'server-derived-v1', expectedVersion: rv(gate),
      bindingAction: gate.bindingAction, gateReviewDecision: 'blocked', reviewAction: 'tighten-block', blockingReasonCodes, blockingReasonCode: null,
      baselineSelectionSource: gate.baselineSelectionSource, summaryPackageKey: gate.summaryPackageKey, summarySnapshotId: uuid(gate.summarySnapshotId),
      referencedBaselineVersion: gate.referencedBaselineVersion, referencedSnapshotVersion: gate.referencedSnapshotVersion,
      expectedSourceHash: gate.evaluationContext.sourceHash, expectedEvaluationHash: gate.evaluationContext.evaluationHash, requestKey: randomUUID(),
      comment: '本次实际人工职责选择更严格阻断；不提升系统成熟度，不改原事实，不冒充提成发放批准。' },
      { responseBirths: [{ table: 'commission_gate_review_record', pointer: '/reviewRecordId' }], mutableTables: ['operating_signal_gate_binding', 'commission_gate_review_record', 'approval_summary_snapshot'],
        updatedAnchors: [{ table: 'operating_signal_gate_binding', id: gate.bindingId, requestBinding: 'path:id' }] }); ctx.persist();
  }
  for (const op of ['ProjectCostController_getProjectBusinessOutcomeOverview', 'ProjectCostController_getProjectUnifiedAccounting', 'ProjectCostController_getProjectVarianceRiskExplanation', 'ProjectCostController_getBusinessAccountingFeedback']) {
    await call(op, { projectId: f.project.id });
  }
  f.operatingComplete = true; ctx.persist();
  return { kind: 'actual-G-live-capture-and-H-eight-operation-paths', completed: true, oneProjectEstimateAdoptedAcrossTwoContracts: true, exactServerInputHashes: true,
    stageBindings: 4, humanReviewOnlyTightens: true, literalNullCompatibilityKeysChecked: true, numericPolicyThresholdBoundaryCertification: 'not-run',
    periodClose: 'not-run-pending-user-current-selection', restatementAndOtherProducers: 'not-run', G3Certified: false, G4Certified: false };
}
