import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFrozenProbes58, exactFrozenFailure58, frozenProbeLabel58, assertFrozenResumeCases58 } from './frozen-reparent58.mjs';
import { segment } from './pure.mjs';
import { projectedResumeState58_03, validateFixedResumeState58_03, FIXED_RESUME58_03 as F } from './resume-frozen-reparent58-03.mjs';
const frozen = { id: 'frozen', project_id: 'main', status: 'frozen', producer_version: 1 }, draft = { id: 'draft', project_id: 'ui', status: 'draft', is_current: true, producer_version: 1 };
const participants = [
  { id: 'zero', assignment_id: 'frozen', user_id: 'manager', role_type: 'business-admin', weight_units: 0, zero_weight_reason: 'Real concurrent duty' },
  { id: 'sales', assignment_id: 'frozen', user_id: 'manager', role_type: 'sales-owner', weight_units: 500000 },
  { id: 'eo', assignment_id: 'frozen', user_id: 'execution', role_type: 'execution-owner', weight_units: 500000 },
];
test('frozen zero and positive reparent target an actual draft, while identity and weight stay valid-shaped', () => {
  const probes = buildFrozenProbes58(frozen, draft, participants); assert.equal(probes.length, 5);
  assert.equal(probes[0].participantId, 'zero'); assert.equal(probes[0].afterValue, 'draft'); assert.equal(probes[1].participantId, 'sales');
  assert.equal(probes.find(row => row.field === 'weight_units').afterValue, 1);
  assert.equal(probes.find(row => row.field === 'role_type').afterValue, 'execution-owner');
});
test('a frozen destination, absent zero or same-parent substitution cannot stand in for the missing case', () => {
  assert.throws(() => buildFrozenProbes58(frozen, { ...draft, status: 'frozen' }, participants));
  assert.throws(() => buildFrozenProbes58(frozen, { ...draft, id: frozen.id }, participants));
  assert.throws(() => buildFrozenProbes58(frozen, draft, participants.filter(row => row.id !== 'zero')));
});
test('a deferred sum, uniqueness or user rollback alone cannot impersonate the actual frozen guard rejection', () => {
  const message = 'assignment participant cannot be reparented'; exactFrozenFailure58({ code: '23514', message }, message);
  assert.throws(() => exactFrozenFailure58(null, message)); assert.throws(() => exactFrozenFailure58({ code: '23505', message }, message));
  assert.throws(() => exactFrozenFailure58({ code: '23514', message: 'assignment weights must sum exactly one million' }, message));
});
test('the exact49-character failed label is rejected; every controlled probe now uses a unique short capture label', () => {
  const failed = '006944-frozen58-positive-reparent-to-draft-before'; assert.equal(failed.length, 49); assert.throws(() => segment(failed));
  const labels = []; for (let index = 0; index < 5; index += 1) for (const phase of ['before', 'after']) { const value = '006944-' + frozenProbeLabel58(index, phase); segment(value); assert(value.length <= 48); labels.push(value); }
  assert.equal(new Set(labels).size, 10); assert.throws(() => frozenProbeLabel58(5, 'before')); assert.throws(() => frozenProbeLabel58(1, 'commit'));
});
const firstCase = () => ({ phase: 'verified', intent: { rawBytesSha256: 'original-intent' }, observation: { rawBytesSha256: F.case1ObservationSHA256 }, rollback: { allBusinessAuditSecurityRowsAndXminUnchanged: true, catalogSequencesAndObjectsUnchanged: true, separateActualRawAuthTouches: [] } });
const interrupted = () => ({ kind: 'actual-controlled-frozen-role-negative-probes', projectId: F.projectId, draftAssignmentId: F.draftAssignmentId, mainProjectId: F.mainProjectId, mainAssignmentId: F.mainAssignmentId, cases: { 'zero-reparent-to-draft': firstCase() } });
test('only the exact verified first case can be retained; pending/started later cases cannot be replayed', () => {
  const record = interrupted(), before = structuredClone(record); assertFrozenResumeCases58(record, firstCase()); assert.deepEqual(record, before);
  for (const mutate of [r => { r.cases['positive-reparent-to-draft'] = { phase: 'DML-starting' }; }, r => { r.cases['zero-reparent-to-draft'].phase = 'proof-pending'; }, r => { r.cases['zero-reparent-to-draft'].observation.rawBytesSha256 = 'changed'; }, r => { r.proof = {}; }]) { const bad = interrupted(); mutate(bad); assert.throws(() => assertFrozenResumeCases58(bad, firstCase())); }
});
test('fixed continuation rejects a different draft/project or faulted state without clearing original records', () => {
  const record = interrupted(), state = { namespace: F.namespace, epoch: F.epoch, run: F.run, activeFault: null, blockedObservation: null, consumerChecks: { frozenReparent58: { [F.draftAssignmentId]: record } } };
  validateFixedResumeState58_03(state, structuredClone(record));
  for (const mutate of [s => { s.activeFault = {}; }, s => { s.blockedObservation = {}; }, s => { s.consumerChecks.frozenReparent58[F.draftAssignmentId].projectId = 'other'; }]) { const bad = structuredClone(state); mutate(bad); assert.throws(() => validateFixedResumeState58_03(bad, record)); }
});
test('metadata projection permits only this resume registry and sequence; other fixture/actor/record edits remain visible', () => {
  const original = { sequence: 6943, actors: { real: 'same' }, fixtures: { project: 'same' }, consumerChecks: { frozenReparent58: { [F.draftAssignmentId]: interrupted() } } }, current = structuredClone(original);
  current.sequence = 6947; current.consumerChecks.frozenReparent58Resume03 = { [F.draftAssignmentId]: { phase: 'metadata-reconciled' } }; assert.deepEqual(projectedResumeState58_03(current), projectedResumeState58_03(original));
  for (const mutate of [s => { s.actors.real = 'changed'; }, s => { s.fixtures.project = 'changed'; }, s => { s.consumerChecks.frozenReparent58Resume03.other = {}; }, s => { s.consumerChecks.frozenReparent58[F.draftAssignmentId].cases['zero-reparent-to-draft'].phase = 'cleared'; }]) { const bad = structuredClone(current); mutate(bad); assert.notDeepEqual(projectedResumeState58_03(bad), projectedResumeState58_03(original)); }
});
