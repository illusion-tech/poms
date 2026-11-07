import assert from 'node:assert/strict';
import { uuid } from './pure.mjs';
import { isGHWrite } from './gh-write-facts.mjs';

const g = name => `apps/poms-api-rust/src/project_operating/${name}.rs`;
const h = name => `apps/poms-api-rust/src/project_operating_signals/${name}.rs`;
const add = (key, table, event, match, source, rationale, expectedRows = 1) => ({ key, table, event, match, source, rationale, expectedRows });
const eq = (key, table, event, values, source, why, count = 1) => add(key, table, event, { kind: 'equals', values }, source, why, count);
export function ghWriteInventory(operationId, scope) {
  assert(isGHWrite(operationId)); const { projectId, actorId, params, body, ghFacts: facts } = scope;
  uuid(projectId); uuid(actorId); assert(facts?.version === 1 && facts.projectId === projectId);
  const root = (key, table, event, values = {}, source = g('capture'), why = 'Real source writes this owned project FK branch.', count = 1) => eq(key, table, event, { project_id: projectId, ...values }, source, why, count);
  const oldUpdates = (ids, table, source, prefix) => ids.map(id => eq(`${prefix}:${id}`, table, 'UPDATE', { id: uuid(id) }, source, 'Actual active owned predecessor observed before the command; test every addressed predecessor.'));
  const summary = (count, targetId = null) => [
    add('H-summary-snapshot', 'approval_summary_snapshot', 'INSERT', { kind: 'summary', actorId, scenario: 'commission-gate-review', packageKey: 'project-operating-commission-gate-v1', targetType: 'operating-signal-gate-binding', targetId }, h('summary'), 'The real producer creates each immutable gate summary; generated binding UUID is not fabricated by the harness.', count),
    add('H-summary-last-field', 'approval_summary_field_projection', 'INSERT', { kind: 'summary-field', summary: { actorId, scenario: 'commission-gate-review', packageKey: 'project-operating-commission-gate-v1', targetType: 'operating-signal-gate-binding', targetId }, fieldOrder: 3 }, h('summary'), 'Actual fourth mandatory financialFacts field; all real new summaries must share the final TX.', count),
    root('H-summary-payload', 'operating_gate_summary_payload', 'INSERT', targetId ? { binding_id: uuid(targetId) } : { gate_stage_type: 'retention' }, h('summary'), 'Actual immutable payload for this exact binding, or real last-stage retention payload.', targetId ? 1 : facts.captureCount || 1),
  ];
  let entries = [];
  const baseline = operationId.endsWith('activateOperatingBaselinePackage'), signalReview = operationId.endsWith('reviewOperatingSignalEvaluation'), gateReview = operationId.endsWith('reviewCommissionGateBinding');
  if (baseline) {
    entries = [root('G-baseline-source', 'operating_baseline_source', 'INSERT'), root('G-baseline-package', 'operating_baseline_package', 'INSERT')];
    if (facts.oldBaselineId) entries.push(...oldUpdates([facts.oldBaselineId], 'operating_baseline_package', g('capture'), 'G-old-baseline'));
    for (const id of facts.changePackageIds) entries.push(add(`G-approved-change-baseline:${id}`, 'change_package_baseline', 'INSERT', { kind: 'gh-change-baseline', projectId, actorId, changePackageId: id }, g('capture'), 'Only when the real input/derived approved transition exists; no invented change package.'));
  } else if (signalReview) {
    entries = [root('H-signal-cas', 'operating_signal_evaluation_result', 'UPDATE', { id: uuid(params.id) }, h('review')),
      eq('H-signal-review', 'operating_signal_review_record', 'INSERT', { signal_evaluation_id: uuid(params.id), handled_by: actorId }, h('review'), 'Actual immutable append after exact signal CAS.'),
      root('H-review-new-bindings', 'operating_signal_gate_binding', 'INSERT', { signal_evaluation_id: uuid(params.id), gate_stage_type: 'retention' }, h('service'), 'Four real replacement bindings; retention is the last fixed producer stage.'),
      ...summary(4), ...oldUpdates(facts.oldBindingIds, 'operating_signal_gate_binding', h('service'), 'H-old-binding'),
      ...oldUpdates(facts.oldGateReviewIds, 'commission_gate_review_record', h('service'), 'H-old-binding-review')];
    if (facts.oldSignalReviewId) entries.push(...oldUpdates([facts.oldSignalReviewId], 'operating_signal_review_record', h('review'), 'H-previous-signal-review'));
  } else if (gateReview) {
    entries = [root('H-binding-cas', 'operating_signal_gate_binding', 'UPDATE', { id: uuid(params.id) }, h('review')),
      eq('H-gate-review', 'commission_gate_review_record', 'INSERT', { binding_id: uuid(params.id), handled_by: actorId }, h('review'), 'Actual gate review append and exact actor.'),
      ...summary(1, params.id), ...oldUpdates([facts.oldSummaryId], 'approval_summary_snapshot', h('summary'), 'H-old-summary'),
      ...oldUpdates(facts.oldGateReviewIds, 'commission_gate_review_record', h('review'), 'H-previous-gate-review')];
  } else {
    const count = facts.captureCount; assert(Number.isSafeInteger(count) && count > 0);
    for (const id of facts.costUpdates) entries.push(root(`G-cost-consumption:${id}`, 'project_actual_cost_record', 'UPDATE', { id }, g('inclusion'), 'Only a real confirmed/nonincluded input takes this one-time consumption CAS.'));
    for (const d of facts.decisionInserts) {
      entries.push(root(`G-inclusion-decision:${d.unit}`, 'project_cost_inclusion_decision', 'INSERT', { unit_key: d.unit }, g('inclusion'), 'Actual input differs from the stored frozen prior; unchanged decisions deliberately do not write.'));
      entries.push(root(`G-inclusion-head:${d.unit}`, 'project_cost_inclusion_head', d.headEvent, { unit_key: d.unit }, g('inclusion'), 'INSERT for no real head, otherwise the actual existing composite-key CAS.'));
    }
    entries.push(root('G-source-context', 'operating_source_context', 'INSERT', {}, g('capture'), 'One real final immutable context per complete terminal capture.', count),
      root('G-snapshot', 'project_operating_snapshot', 'INSERT', { snapshot_mode: facts.snapshotMode }, g('capture'), 'Final source/canonical hash comes from the sole Rust collector.', count),
      add('G-source-member-baseline', 'operating_source_member', 'INSERT', { kind: 'gh-source-member', projectId, baselineId: facts.baselineId }, g('capture'), 'Actual mandatory baseline closure member joined through the inserted context/project.', count),
      root('G-cost-member', 'operating_snapshot_cost_member', 'INSERT', { unit_key: facts.costUnits.at(-1) }, g('capture'), 'Real selected input/current classification member; no synthetic cost.', count),
      root('H-evaluation-evidence', 'operating_evaluation_evidence', 'INSERT', { evaluated_by: actorId }, h('service'), 'H reloads the actual new G immutable context.', count),
      add('H-evaluation-reason', 'operating_evaluation_reason', 'INSERT', { kind: 'gh-reason', projectId, actorId, index: 0 }, h('service'), 'Real generated system reason0, joined to actual evaluation evidence. New source H08 is not silently resolved.', count),
      root('H-maturity', 'data_maturity_evaluation_result', 'INSERT', { created_by: actorId }, h('service'), 'Actual H maturity output, not a browser label.', count),
      root('H-signal', 'operating_signal_evaluation_result', 'INSERT', { created_by: actorId }, h('service'), 'Actual H system signal output.', count),
      root('H-gates', 'operating_signal_gate_binding', 'INSERT', { gate_stage_type: 'retention' }, h('service'), 'Real fixed last stage; final proof includes all source-selected rows.', count),
      ...summary(count * 4), ...oldUpdates(facts.oldBindingIds, 'operating_signal_gate_binding', h('service'), 'H-old-binding'),
      ...oldUpdates(facts.oldGateReviewIds, 'commission_gate_review_record', h('service'), 'H-old-binding-review'));
    if (facts.snapshotMode === 'period-end') entries.push(root('G-paired-period', 'period_closing_snapshot', 'INSERT', { period_key: body.periodKey }, g('capture'), 'The real paired period fact; runtime remains blocked pending decision7.'));
    if (operationId.endsWith('createOperatingRestatement')) {
      entries.push(...oldUpdates(facts.terminalIds, 'project_operating_snapshot', g('restatement'), 'G-terminal-cas'));
      for (const id of facts.terminalIds) entries.push(root(`G-restatement-record:${id}`, 'operating_restatement_record', 'INSERT', { restates_snapshot_id: id }, g('service'), 'Actual complete terminal root, causal source refs and shared batch from Rust.'));
    }
  }
  if (!signalReview && !gateReview) entries.push(root('G-head-cas', 'project_operating_head', facts.headPresent ? 'UPDATE' : 'INSERT', {}, g('store'), 'Exact actual head branch; no fabricated initial head.'));
  const auditCount = operationId.endsWith('createOperatingRestatement') ? facts.captureCount : 1;
  entries.push(add('required-success-audit', 'audit_log', 'INSERT', { kind: 'audit', operationId, actorId, projectId }, 'apps/poms-api-rust/src/contract_support/mod.rs', 'Mandatory exact root operation/request/actor/project audit; every complete terminal restatement audits its own record.', auditCount));
  if (!baseline && !signalReview && !gateReview) entries.push(add('H-policy-audit', 'audit_log', 'INSERT', { kind: 'audit', operationId: 'OperatingPolicy_evaluate', actorId, projectId }, h('service'), 'Real H evaluation audit in the same G outer transaction.', facts.captureCount));
  entries.push(eq('GH-command-receipt', 'operating_command_receipt', 'INSERT', { operation_id: operationId, actor_id: actorId, target_scope: signalReview || gateReview ? uuid(params.id) : projectId }, signalReview || gateReview ? h('store') : g('service'), 'Actual same-TX idempotency receipt; not a forged committed JSON claim.'));
  entries.push(add('pending-auth-coflush', 'auth_session', 'UPDATE', { kind: 'auth-coflush', operationId, actorId, projectId }, 'apps/poms-api-rust/src/auth/store.rs', 'Real pending-auth update only after the exact root audit; independent raw touch remains separate.'));
  assert.equal(new Set(entries.map(d => d.key)).size, entries.length); return entries;
}

export function ghSelectorSql(descriptor) {
  const m = descriptor.match; for (const key of ['projectId', 'actorId', 'baselineId', 'changePackageId']) if (m[key]) uuid(m[key]);
  if (m.kind === 'gh-source-member') return `j->>'source_kind'='OperatingBaselinePackage' AND j->>'source_id'='${m.baselineId}' AND EXISTS(SELECT 1 FROM poms.operating_source_context c WHERE c.id=(j->>'context_id')::uuid AND c.project_id='${m.projectId}'::uuid)`;
  if (m.kind === 'gh-reason') { assert.equal(m.index, 0); return `(j->>'reason_index')::int=0 AND EXISTS(SELECT 1 FROM poms.operating_evaluation_evidence e WHERE e.id=(j->>'evidence_id')::uuid AND e.project_id='${m.projectId}'::uuid AND e.evaluated_by='${m.actorId}'::uuid)`; }
  if (m.kind === 'gh-change-baseline') return `j->>'change_package_id'='${m.changePackageId}' AND j->>'created_by'='${m.actorId}' AND EXISTS(SELECT 1 FROM poms.operating_baseline_package b WHERE b.id=(j->>'baseline_package_id')::uuid AND b.project_id='${m.projectId}'::uuid)`;
  throw new Error('Unknown reviewed GH selector');
}
export function ghWriteMatches(descriptor, row, allRows) {
  const m = descriptor.match, v = JSON.parse(row.raw), find = (table, id) => allRows(table).map(r => JSON.parse(r.raw)).find(r => r.id === id);
  if (m.kind === 'gh-source-member') return v.source_kind === 'OperatingBaselinePackage' && v.source_id === m.baselineId && find('operating_source_context', v.context_id)?.project_id === m.projectId;
  if (m.kind === 'gh-reason') { const e = find('operating_evaluation_evidence', v.evidence_id); return v.reason_index === 0 && e?.project_id === m.projectId && e.evaluated_by === m.actorId; }
  if (m.kind === 'gh-change-baseline') return v.change_package_id === m.changePackageId && v.created_by === m.actorId && find('operating_baseline_package', v.baseline_package_id)?.project_id === m.projectId;
  throw new Error('Unknown reviewed GH final write');
}
