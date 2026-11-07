import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublishedArtifact57 } from './lifecycle-published-source57.mjs';
const projectId = '11111111-1111-4111-8111-111111111111', snapshotId = '22222222-2222-4222-8222-222222222222';
function frame() {
  const pin = { file: '/actual-proof', rawBytesSha256: 'a'.repeat(64) }, source = { result: { published: { snapshotId, proof: pin } }, fixtures: { project: { id: projectId }, operatingSnapshotCommand: { targetId: snapshotId }, a05SnapshotHTTP: { proof: pin, proofPending: false } } };
  const proof = { actualPublishedSnapshot: true, preparationWasNotCountedAsSnapshot: true, actualHReloadProducedFourBindings: true, stored: [{ source_hash: 'source', frozen_payload: { projectId, sourceHash: 'source', snapshot: { id: snapshotId } } }], actualSignal: { evaluationContext: { sourceHash: 'source' } }, actualBindings: Array.from({ length: 4 }, () => ({ evaluationContext: { sourceHash: 'source' } })) };
  return { source, proof };
}
test('truthy metadata or a preparation-only proof cannot certify published A05', () => {
  const { source, proof } = frame(); assertPublishedArtifact57(source, proof);
  assert.throws(() => assertPublishedArtifact57(source, {})); assert.throws(() => assertPublishedArtifact57(source, { ...proof, actualPublishedSnapshot: false }));
  assert.throws(() => assertPublishedArtifact57({ ...source, fixtures: { ...source.fixtures, a05SnapshotHTTP: { ...source.fixtures.a05SnapshotHTTP, proofPending: true } } }, proof));
});
test('the raw producer proof must bind this exact project, snapshot and four evaluation contexts', () => {
  const { source, proof } = frame(); const foreign = structuredClone(proof); foreign.stored[0].frozen_payload.projectId = snapshotId; assert.throws(() => assertPublishedArtifact57(source, foreign));
  const wrongSnapshot = structuredClone(proof); wrongSnapshot.stored[0].frozen_payload.snapshot.id = projectId; assert.throws(() => assertPublishedArtifact57(source, wrongSnapshot));
  const wrongBinding = structuredClone(proof); wrongBinding.actualBindings[3].evaluationContext.sourceHash = 'other'; assert.throws(() => assertPublishedArtifact57(source, wrongBinding));
});
