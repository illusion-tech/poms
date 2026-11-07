// Instrumentation inventory from actual owned rows, never an authorization or money calculator.
import assert from 'node:assert/strict';
import { keyOf, uuid } from './pure.mjs';

export const ghWriteOperations = Object.freeze([
  'ProjectCostController_activateOperatingBaselinePackage', 'ProjectCostController_createProjectOperatingSnapshot',
  'ProjectCostController_createPeriodClosingSnapshot', 'ProjectCostController_createOperatingRestatement',
  'ProjectCostController_reviewOperatingSignalEvaluation', 'ProjectCostController_reviewCommissionGateBinding',
]);
export const isGHWrite = operation => ghWriteOperations.includes(operation);
const sorted = values => [...new Set(values)].sort();
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
function unchangedDecision(input, prior) {
  const previous = prior?.frozen_payload?.input;
  if (!previous || prior.source_row_version !== input.target.expectedVersion) return false;
  if (['decision', 'recognitionRole', 'reasonCode', 'reasonText', 'primaryCostRef'].some(k => stable(input[k]) !== stable(previous[k]))) return false;
  return ['supportingSourceRefs', 'evidenceRefs'].every(k => Array.isArray(input[k]) && Array.isArray(previous[k]) && stable(input[k].map(stable).sort()) === stable(previous[k].map(stable).sort()));
}
export function deriveGHWriteFacts(ctx, snapshot, operationId, scope, readRows) {
  assert(isGHWrite(operationId)); const { projectId, actorId, actorKey, params, body } = scope;
  const actor = ctx.state.actors[actorKey]; assert.equal(actor.id, actorId);
  for (const permission of ['operating:finance:sensitive:read', 'labor-cost-rate:sensitive:read']) assert(actor.permissions.includes(permission), 'This positive inventory requires the real source-sensitive actor; masked/denied-event paths need their own inventory');
  const rows = table => readRows(snapshot.databases[ctx.database].tables[table]).map(r => ({ row: r, value: JSON.parse(r.raw) }));
  const values = table => rows(table).map(r => r.value);
  const owned = (table, id) => { uuid(id); const row = rows(table).find(r => r.row.key.length === 1 && r.row.key[0] === id); assert(row, `Missing actual ${table} row`); const proof = ctx.state.owned[keyOf(ctx.database, table, row.row.key)]; assert(proof && !proof.deleted, 'Never arm FI on an original or foreign source'); return row.value; };
  owned('project', projectId); owned('platform_user', actorId);
  const head = values('project_operating_head').find(r => r.project_id === projectId) ?? null;
  const result = { version: 1, projectId, headPresent: Boolean(head), baselineId: head?.baseline_package_id ?? null,
    currentSnapshotId: head?.current_snapshot_id ?? null, captureCount: 0, snapshotMode: null, terminalIds: [], costUnits: [], costUpdates: [],
    decisionInserts: [], oldBindingIds: [], oldGateReviewIds: [], oldSignalReviewId: null, oldSummaryId: null, targetSignalId: null, targetBindingId: null, selectedGateStage: null };
  const currentGateRows = () => values('operating_signal_gate_binding').filter(r => r.project_id === projectId && r.status === 'active');
  const oldGates = () => {
    result.oldBindingIds = sorted(currentGateRows().map(r => owned('operating_signal_gate_binding', r.id).id));
    result.oldGateReviewIds = sorted(values('commission_gate_review_record').filter(r => result.oldBindingIds.includes(r.binding_id) && r.status === 'active').map(r => owned('commission_gate_review_record', r.id).id));
  };
  if (operationId.endsWith('reviewOperatingSignalEvaluation')) {
    const signal = owned('operating_signal_evaluation_result', params.id); assert.equal(signal.project_id, projectId); result.targetSignalId = signal.id;
    const previous = values('operating_signal_review_record').filter(r => r.signal_evaluation_id === signal.id && r.status === 'active'); assert(previous.length <= 1);
    result.oldSignalReviewId = previous[0] ? owned('operating_signal_review_record', previous[0].id).id : null;
    assert.equal(head?.current_snapshot_id, signal.referenced_snapshot_id, 'Positive review needs the actual current source'); oldGates(); return result;
  }
  if (operationId.endsWith('reviewCommissionGateBinding')) {
    const binding = owned('operating_signal_gate_binding', params.id); assert.equal(binding.project_id, projectId);
    const signal = owned('operating_signal_evaluation_result', binding.signal_evaluation_id); assert.equal(head?.current_snapshot_id, signal.referenced_snapshot_id);
    result.targetSignalId = signal.id; result.targetBindingId = binding.id; result.selectedGateStage = binding.gate_stage_type;
    result.oldSummaryId = owned('approval_summary_snapshot', binding.current_summary_id).id;
    result.oldGateReviewIds = values('commission_gate_review_record').filter(r => r.binding_id === binding.id && r.status === 'active').map(r => owned('commission_gate_review_record', r.id).id); assert(result.oldGateReviewIds.length <= 1); return result;
  }
  assert.equal(body.projectId, projectId); assert.equal(body.expectedVersion, head?.row_version ?? 0, 'Body must use the actual observed G head before arming');
  if (operationId.endsWith('activateOperatingBaselinePackage')) {
    result.oldBaselineId = body.expectedCurrentPackageRef ? owned('operating_baseline_package', body.expectedCurrentPackageRef.id).id : null;
    assert.equal(result.oldBaselineId, result.baselineId);
    result.changePackageIds = (body.approvedChangeRefs ?? []).map(r => owned('project_technical_cost_package', r.id).id); return result;
  }
  assert(result.baselineId); owned('operating_baseline_package', result.baselineId);
  let decisionInputs = body.costDecisions ?? [];
  if (operationId.endsWith('createOperatingRestatement')) {
    for (const key of ['laborCorrections', 'allocationCorrections', 'stageCorrections', 'taxCorrections']) assert.equal(body[key]?.length, 0, 'Actual E/F correction branches need their producer-specific inventory; never infer them from the historical late-expense case');
    assert.equal(body.scope, 'live'); assert.equal(body.periodEndSnapshotRef, null);
    const targets = [{ projectId, restatesSnapshotRef: body.restatesSnapshotRef, periodEndSnapshotRef: null }, ...(body.affectedTargets ?? [])];
    assert(targets.every(t => t.projectId === projectId && t.periodEndSnapshotRef === null), 'This source-bound late-expense inventory is one-project/live; do not truncate multi-project/period targets');
    result.terminalIds = sorted(targets.map(t => { const s = owned('project_operating_snapshot', t.restatesSnapshotRef.id); assert.equal(s.project_id, projectId); assert.equal(s.status, 'active'); return s.id; }));
    assert.equal(result.terminalIds.length, targets.length); result.captureCount = targets.length; result.snapshotMode = 'restated';
    decisionInputs = [...decisionInputs, ...(body.affectedTargets ?? []).flatMap(t => t.costDecisions)];
    if (result.terminalIds.includes(result.currentSnapshotId)) oldGates();
  } else {
    result.captureCount = 1; result.snapshotMode = operationId.endsWith('createPeriodClosingSnapshot') ? 'period-end' : body.snapshotMode;
    assert(['realtime', 'period-end'].includes(result.snapshotMode));
    // Current source explicitly leaves ordinary paired period captures unselected.
    // The runtime wrapper blocks period writes while decision7 is pending.
    if (result.snapshotMode === 'realtime') oldGates();
  }
  const seen = new Map();
  for (const input of decisionInputs) {
    assert.equal(input.target.kind, 'ProjectActualCostRecord', 'Shared allocation correction/consumption is not silently covered by an expense fixture');
    const cost = owned('project_actual_cost_record', input.target.id); assert.equal(cost.project_id, projectId);
    const unit = `cost:${cost.id}`; result.costUnits.push(unit);
    const priorInput = seen.get(unit); if (priorInput) { assert.equal(stable(priorInput), stable(input), 'Same root cannot supply conflicting repeated cost decisions'); continue; } seen.set(unit, input);
    const hRow = rows('project_cost_inclusion_head').find(r => r.value.project_id === projectId && r.value.unit_key === unit);
    if (hRow) assert(ctx.state.owned[keyOf(ctx.database, 'project_cost_inclusion_head', hRow.row.key)], 'Existing composite classification head must also be this run owned');
    const h = hRow?.value;
    const prior = h ? owned('project_cost_inclusion_decision', h.decision_id) : null;
    if (prior && unchangedDecision(input, prior)) continue;
    result.decisionInserts.push({ unit, headEvent: h ? 'UPDATE' : 'INSERT' });
    if (input.decision === 'include' && cost.is_included_in_project_cost !== true) {
      assert.equal(input.recognitionRole, 'direct-source'); assert.equal(cost.record_status, 'confirmed'); result.costUpdates.push(cost.id);
    }
  }
  if (!result.costUnits.length) result.costUnits = values('project_cost_inclusion_head').filter(r => r.project_id === projectId).map(r => r.unit_key);
  result.costUnits = sorted(result.costUnits); assert(result.costUnits.length, 'Do not claim cost membership FI for an empty/unproven cost-scope case');
  result.costUpdates = sorted(result.costUpdates); result.decisionInserts.sort((a, b) => a.unit.localeCompare(b.unit)); return result;
}
