import test from 'node:test';
import assert from 'node:assert/strict';
import { freshOverflowInput59, recoverOverflowState59 } from './a05-overflow-guards59.mjs';
test('overflow keeps old body and uses only the actual fresh public body and CAS', () => {
  const stale = { receipt: 'old-public', body: { projectId: 'project', expectedInputHash: 'a'.repeat(64) } };
  const fresh = { receipt: 'new-public', body: { inputVersion: 'server-derived-v1', projectId: 'project', expectedInputHash: 'b'.repeat(64), expectedVersion: 4, expectedProjectVersion: 5, snapshotMode: 'realtime', periodKey: null } };
  const original = structuredClone(stale); assert.equal(freshOverflowInput59(stale, fresh), fresh); assert.deepEqual(stale, original);
  assert.throws(() => freshOverflowInput59(stale, { ...fresh, body: { ...fresh.body, expectedInputHash: stale.body.expectedInputHash } }));
});
test('exact metadata recovery preserves submitted receipt, old source, published proof and all other state', () => {
  const input = { receipt: 'old-public', body: { expectedInputHash: 'real-old' } }, cash = { receipt: { id: 'cash', status: 'confirmed' }, basisVerified: { file: 'real-basis' } };
  const state = { epoch: 'consumer', run: 'run', owned: { unchanged: true }, fixtures: { unrelatedFixture: { immutable: true }, a05Boundaries26: { views: { 'max-zero': { sourcePinsSHA256: 'old-producer', stages: { 'aggregate-overflow': { phase: 'running' }, 'published-G-H': { phase: 'verified' } }, fixtures: { project: { id: 'project' }, operatingComplete: true, a05SnapshotHTTP: { proof: 'published-original', proofPending: false }, a05Overflow26: { input, extraCash: cash } } } } } } };
  const original = structuredClone(state), entry = { epoch: 'consumer', run: 'run', projectId: 'project', oldInput: input, extraCash: cash }, stale = { code: 'operating_input_hash_changed', status: 409, response: 'actual-original' };
  const next = recoverOverflowState59(state, entry, stale); assert.deepEqual(state, original);
  const revert = structuredClone(next); revert.fixtures.a05Boundaries26.views['max-zero'].stages['aggregate-overflow'] = { phase: 'running' }; delete revert.fixtures.a05Boundaries26.views['max-zero'].fixtures.a05Overflow26.staleAttempt59;
  assert.deepEqual(revert, original); assert.throws(() => recoverOverflowState59(next, entry, stale));
  assert.throws(() => recoverOverflowState59(state, { ...entry, extraCash: { receipt: { id: 'other' } } }, stale));
});
