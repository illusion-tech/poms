import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFrozenProbes58, exactFrozenFailure58 } from './frozen-reparent58.mjs';
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
