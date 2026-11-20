import test from 'node:test';
import assert from 'node:assert/strict';
import { keyOf, sha } from './pure.mjs';
import { deriveGHWriteFacts, ghWriteOperations } from './gh-write-facts.mjs';
import { ghWriteInventory } from './gh-write-inventory.mjs';
import { selectorSql } from './required-write-inventory.mjs';
import { rowsWritten, assertPeriodSweepPolicy } from './fault-sweep.mjs';
import { assertObservedTaxKnowledge } from './cost-readiness.mjs';

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const project = id(1), actor = id(2), baseline = id(3), cost = id(4), snapshot = id(5), signal = id(6), decision = id(7);
const row = (value, key = [value.id], xmin = '10') => { const raw = JSON.stringify(value); return { raw, key, sha256: sha(raw), xmin }; };
function fixture() {
  const tables = {}, ctx = { database: 'db', state: { owned: {}, actors: { manager: { id: actor, permissions: ['operating:finance:sensitive:read', 'labor-cost-rate:sensitive:read'] } } } };
  const put = (table, value, key) => { const item = row(value, key); (tables[table] ??= { rows: [] }).rows.push(item); ctx.state.owned[keyOf('db', table, item.key)] = { latestSha256: item.sha256 }; return value; };
  put('project', { id: project }); put('platform_user', { id: actor });
  const observed = { databases: { db: { tables: new Proxy(tables, { get: (target, key) => target[key] ?? { rows: [] } }) } } };
  const input = { target: { kind: 'ProjectActualCostRecord', id: cost, expectedVersion: 2, payloadHash: 'a'.repeat(64) }, expectedVersion: 0,
    decision: 'include', recognitionRole: 'direct-source', reasonCode: 'actual-expense', reasonText: 'actual fixture', primaryCostRef: null, supportingSourceRefs: [], evidenceRefs: [{ kind: 'ProjectActualCostRecord', id: cost, expectedVersion: 2, payloadHash: 'a'.repeat(64) }] };
  const scope = body => ({ projectId: project, actorId: actor, actorKey: 'manager', params: {}, body });
  const derive = (op, s) => deriveGHWriteFacts(ctx, observed, op, s, meta => meta.rows);
  const base = () => { put('operating_baseline_package', { id: baseline, project_id: project }); put('project_operating_head', { project_id: project, baseline_package_id: baseline, current_snapshot_id: snapshot, row_version: 1 }, [project]);
    put('project_operating_snapshot', { id: snapshot, project_id: project, status: 'active' }); put('project_actual_cost_record', { id: cost, project_id: project, row_version: 2, record_status: 'confirmed', is_included_in_project_cost: false }); };
  return { ctx, observed, put, input, scope, derive, base };
}
test('first baseline source inventory is real source/package/head/audit/receipt/auth and no H evaluation', () => {
  const f = fixture(), s = f.scope({ projectId: project, expectedVersion: 0, expectedCurrentPackageRef: null, approvedChangeRefs: [] });
  const facts = f.derive(ghWriteOperations[0], s); const inventory = ghWriteInventory(ghWriteOperations[0], { ...s, ghFacts: facts });
  assert.equal(inventory.length, 6); assert.equal(inventory.find(d => d.key === 'G-head-cas').event, 'INSERT');
  assert(!inventory.some(d => d.key.startsWith('H-')));
});
test('first expense snapshot declares20 real write families, including consumption and decision/head inserts', () => {
  const f = fixture(); f.base(); const s = f.scope({ projectId: project, expectedVersion: 1, snapshotMode: 'realtime', costDecisions: [f.input] });
  const facts = f.derive(ghWriteOperations[1], s), inventory = ghWriteInventory(ghWriteOperations[1], { ...s, ghFacts: facts });
  assert.equal(inventory.length, 20); assert.deepEqual(facts.costUpdates, [cost]);
  assert.equal(inventory.find(d => d.key === 'H-summary-snapshot').expectedRows, 4); assert.equal(inventory.find(d => d.key === 'H-summary-last-field').expectedRows, 4);
  for (const descriptor of inventory) assert(selectorSql(descriptor, { requestId: 'actual-request', sessionId: id(99) }).length > 10);
});
test('existing frozen pre-consumption refs genuinely trigger a new decision and UPDATE head', () => {
  const f = fixture(); f.base(); const currentCost = f.observed.databases.db.tables.project_actual_cost_record.rows[0];
  Object.assign(currentCost, row({ id: cost, project_id: project, row_version: 3, record_status: 'included', is_included_in_project_cost: true }));
  f.put('project_cost_inclusion_decision', { id: decision, project_id: project, source_row_version: 3, frozen_payload: { input: f.input } });
  f.put('project_cost_inclusion_head', { project_id: project, unit_key: `cost:${cost}`, decision_id: decision, row_version: 1 }, [project, `cost:${cost}`]);
  const changed = structuredClone(f.input); changed.target.expectedVersion = 3; changed.evidenceRefs[0].expectedVersion = 3; changed.expectedVersion = 1;
  const body = { projectId: project, expectedVersion: 1, scope: 'live', periodEndSnapshotRef: null, restatesSnapshotRef: { id: snapshot }, costDecisions: [changed], affectedTargets: [], laborCorrections: [], allocationCorrections: [], stageCorrections: [], taxCorrections: [] };
  const facts = f.derive(ghWriteOperations[3], f.scope(body));
  assert.deepEqual(facts.costUpdates, []); assert.deepEqual(facts.decisionInserts, [{ unit: `cost:${cost}`, headEvent: 'UPDATE' }]);
  const sameInput = { ...changed, evidenceRefs: f.input.evidenceRefs }; body.costDecisions = [sameInput];
  assert.deepEqual(f.derive(ghWriteOperations[3], f.scope(body)).decisionInserts, []);
});
test('H signal and gate review inventories follow actual existing binding/summary rows', () => {
  const f = fixture(); f.base(); f.put('operating_signal_evaluation_result', { id: signal, project_id: project, referenced_snapshot_id: snapshot });
  for (const [n, stage] of ['first', 'second', 'final', 'retention'].entries()) {
    f.put('approval_summary_snapshot', { id: id(30 + n), target_id: id(20 + n) });
    f.put('operating_signal_gate_binding', { id: id(20 + n), project_id: project, signal_evaluation_id: signal, status: 'active', current_summary_id: id(30 + n), gate_stage_type: stage });
  }
  let s = { ...f.scope({}), params: { id: signal } }; let facts = f.derive(ghWriteOperations[4], s);
  let inventory = ghWriteInventory(ghWriteOperations[4], { ...s, ghFacts: facts }); assert.equal(inventory.length, 13);
  assert.equal(inventory.filter(d => d.key.startsWith('H-old-binding:')).length, 4); assert(!inventory.some(d => d.table === 'data_maturity_evaluation_result'));
  s = { ...f.scope({}), params: { id: id(20) } }; facts = f.derive(ghWriteOperations[5], s); inventory = ghWriteInventory(ghWriteOperations[5], { ...s, ghFacts: facts }); assert.equal(inventory.length, 9);
  assert(inventory.some(d => d.key === 'H-old-summary:' + id(30))); assert.equal(inventory.find(d => d.key === 'H-summary-snapshot').expectedRows, 1);
});
test('actual operation type keeps summary INSERT separate from predecessor UPDATE', () => {
  const before = row({ id: id(40), status: 'active' }), changed = row({ id: id(40), status: 'superseded' }, undefined, '11'), added = row({ id: id(41), status: 'active' }, undefined, '11');
  assert.deepEqual(rowsWritten([before], [changed, added], 'INSERT').map(r => r.key[0]), [id(41)]);
  assert.deepEqual(rowsWritten([before], [changed, added], 'UPDATE').map(r => r.key[0]), [id(40)]);
});
test('period inventory is preparable but runtime cannot infer decision7 approval from any flag', () => {
  const f = fixture(); f.base(); const s = f.scope({ projectId: project, expectedVersion: 1, periodKey: '2026-10', costDecisions: [f.input] });
  const facts = f.derive(ghWriteOperations[2], s), inventory = ghWriteInventory(ghWriteOperations[2], { ...s, ghFacts: facts });
  assert(inventory.some(d => d.key === 'G-paired-period')); assert.equal(inventory.find(d => d.key === 'G-snapshot').match.values.snapshot_mode, 'period-end');
  assert.throws(() => assertPeriodSweepPolicy(ghWriteOperations[2], { ...s.body, approved: true, decision7Approved: true }));
  assert.throws(() => assertPeriodSweepPolicy(ghWriteOperations[1], { snapshotMode: 'period-end', approved: true }));
  assertPeriodSweepPolicy(ghWriteOperations[1], { snapshotMode: 'realtime' });
});
test('unproduced F tax stays unknown; real knowledge is not replaced with a fixture default', () => {
  assertObservedTaxKnowledge({ financialProjection: { value: { taxPending: { knowledge: 'unknown', value: null, unknownReasonCode: 'tax-assessment-missing' } } } }, 0);
  assert.throws(() => assertObservedTaxKnowledge({ financialProjection: { value: { taxPending: { knowledge: 'known', value: '0.00' } } } }, 0));
  assert.throws(() => assertObservedTaxKnowledge({ financialProjection: { value: { taxPending: { knowledge: 'unknown', value: '0.00' } } } }, 0));
});
