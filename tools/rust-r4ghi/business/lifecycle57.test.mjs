import test from 'node:test';
import assert from 'node:assert/strict';
import { exactPath } from './pure.mjs';
import { lifecycleConsumer57, ownTask57, taskBody57 } from './lifecycle-consumer57.mjs';
import { blockedByControl } from './creator-proofs.mjs';
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222', c = '33333333-3333-4333-8333-333333333333';
test('A07 dual UUID request never substitutes child for parent', () => {
  assert.equal(exactPath('/api/project-completion-records/{completionRecordId}/conditions/{id}:close', { completionRecordId: a, id: b }), `/api/project-completion-records/${a}/conditions/${b}:close`);
});
test('task body uses actual minimal own-list parent and child CAS, with no FullProject read', async () => {
  const calls = [], body = { scopeKind: 'own-condition-only', projectId: a, items: [{ completionRecordId: b, completionRowVersion: 4, ownTasks: [{ conditionId: c, conditionRowVersion: 2, responsibleUserId: 'actor', status: 'pending' }] }] };
  const ctx = { state: { fixtures: { project: { id: a } }, actors: { unrelated: { id: 'actor' } } } }, api = { request: async (...args) => { calls.push(args); return { body, receiptId: 'actual' }; } };
  const result = await taskBody57(ctx, api, 'unrelated', b, a); assert.equal(result.body.expectedCompletionVersion, 4); assert.equal(result.body.expectedConditionVersion, 2);
  assert.deepEqual(result.params, { completionRecordId: b, id: c }); assert.equal(calls.length, 1); assert.equal(calls[0][0], 'ProjectController_listProjectCompletionRecords');
  assert.throws(() => ownTask57({ body }, 'other', b));
});
test('consumer check upload and closure metadata never mutate retained Own/A05 producer fixtures', () => {
  const state = { fixtures: { uiFixtureViews23: { own: { original: true } }, a05Boundaries26: { original: true } }, owned: {}, actors: {} }, before = JSON.stringify(state.fixtures);
  let serialized; const root = { state, persist: () => { serialized = JSON.stringify(state); } }, view = lifecycleConsumer57(root, 'same-task', a);
  view.ctx.state.fixtures.uploads.example = { actualReceipt: 'real-upload' }; view.ctx.persist();
  assert.equal(JSON.stringify(state.fixtures), before); assert(serialized.includes('actualReceipt')); assert.equal(view.ctx.state.owned, state.owned);
  assert.throws(() => { view.ctx.state.fixtures = {}; });
});
test('two real waiters may be blocked indirectly by the project lock ahead of controlled parent', () => {
  const graph = [{ pid: 1, blocked_by: [9] }, { pid: 2, blocked_by: [1] }, { pid: 3, blocked_by: [] }];
  assert(blockedByControl(1, graph, 9)); assert(blockedByControl(2, graph, 9)); assert(!blockedByControl(3, graph, 9));
});
