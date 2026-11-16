import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, uuid } from './pure.mjs';
import { assertAdmittedFixtureSource } from './consumer-admission54.mjs';

export function assertPublishedArtifact57(source, proof) {
  const projectId = uuid(source.fixtures.project.id), snapshotId = uuid(source.result.published.snapshotId);
  assert.equal(source.fixtures.a05SnapshotHTTP.proofPending, false);
  assert.deepEqual(source.result.published.proof, source.fixtures.a05SnapshotHTTP.proof);
  assert.equal(source.fixtures.operatingSnapshotCommand.snapshotId ?? source.fixtures.operatingSnapshotCommand.targetId, snapshotId);
  assert.equal(proof.actualPublishedSnapshot, true); assert.equal(proof.preparationWasNotCountedAsSnapshot, true); assert.equal(proof.actualHReloadProducedFourBindings, true);
  assert.equal(proof.stored.length, 1); const stored = proof.stored[0];
  assert.equal(stored.frozen_payload.projectId, projectId); assert.equal(stored.frozen_payload.snapshot.id, snapshotId);
  assert.equal(stored.frozen_payload.sourceHash, stored.source_hash); assert.equal(proof.actualSignal.evaluationContext.sourceHash, stored.source_hash);
  assert.equal(proof.actualBindings.length, 4); for (const binding of proof.actualBindings) assert.equal(binding.evaluationContext.sourceHash, stored.source_hash);
}

// Validate the actual persisted source before creating a new view or API.
export function requirePublishedA05Source57(ctx) {
  const source = ctx.state.fixtures.a05Boundaries26?.views?.['cent-max']; assert(source?.result?.published && source.fixtures.a05SnapshotHTTP?.proof);
  const projectId = uuid(source.fixtures.project.id), pin = source.fixtures.a05SnapshotHTTP.proof;
  assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/a05Boundaries26/views/cent-max', record: source, projectIds: [projectId], producerReceipt: pin });
  const root = fs.realpathSync(ctx.private), actual = fs.realpathSync(pin.file), relative = path.relative(root, actual);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); assert.equal(actual, path.resolve(pin.file));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); if (pin.bytes !== undefined) assert.equal(bytes.length, pin.bytes);
  assertPublishedArtifact57(source, JSON.parse(bytes)); return source;
}
