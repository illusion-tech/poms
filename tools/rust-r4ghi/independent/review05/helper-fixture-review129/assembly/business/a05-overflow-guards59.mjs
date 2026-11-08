import assert from 'node:assert/strict';

export function freshOverflowInput59(stale, actualPublicPreparation) {
  assert(stale?.receipt && actualPublicPreparation?.receipt);
  const old = stale.body, fresh = actualPublicPreparation.body;
  assert.equal(fresh.inputVersion, 'server-derived-v1'); assert.equal(fresh.projectId, old.projectId);
  assert(/^[a-f0-9]{64}$/.test(fresh.expectedInputHash)); assert.notEqual(fresh.expectedInputHash, old.expectedInputHash, 'New receipt must have a fresh real server source hash');
  assert(Number.isInteger(fresh.expectedVersion) && Number.isInteger(fresh.expectedProjectVersion));
  assert.equal(fresh.snapshotMode, 'realtime'); assert.equal(fresh.periodKey, null);
  return actualPublicPreparation;
}

export function recoverOverflowState59(state, original, staleAttempt) {
  assert.equal(state.epoch, original.epoch); assert.equal(state.run, original.run); assert(!state.blockedObservation && !state.activeFault && !state.cleaned);
  const record = state.fixtures.a05Boundaries26.views['max-zero'], f = record.fixtures, overflow = f.a05Overflow26;
  assert.deepEqual(record.stages['aggregate-overflow'], { phase: 'running' }); assert(!overflow.failedAttempt && !overflow.proof && !overflow.staleAttempt59 && !overflow.freshInput && !overflow.freshCaptureAttempt59);
  assert.equal(f.project.id, original.projectId); assert.deepEqual(overflow.input, original.oldInput); assert.deepEqual(overflow.extraCash, original.extraCash);
  assert(f.operatingComplete && f.a05SnapshotHTTP.proof && f.a05SnapshotHTTP.proofPending === false);
  assert.equal(staleAttempt.code, 'operating_input_hash_changed'); assert.equal(staleAttempt.status, 409);
  const next = structuredClone(state), target = next.fixtures.a05Boundaries26.views['max-zero'];
  delete target.stages['aggregate-overflow']; target.fixtures.a05Overflow26.staleAttempt59 = staleAttempt;
  return next;
}
