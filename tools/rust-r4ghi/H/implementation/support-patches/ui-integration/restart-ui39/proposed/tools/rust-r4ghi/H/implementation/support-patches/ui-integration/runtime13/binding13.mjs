import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const segment = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(value);
export function validateBindingShape(binding) {
  assert.equal(binding.schemaVersion, 1); assert.equal(binding.namespace, 'poms-r4ghi');
  assert(segment(binding.epoch) && binding.epoch !== 'g2-business08', 'New reviewed epoch is required; historical08 cannot be rebound'); assert(segment(binding.run));
  assert.equal(binding.tables, 139); assert.equal(binding.migrations, 97); assert.equal(binding.database, 'poms_r4ghi_rust');
  assert(typeof binding.marker === 'string' && binding.marker.length > 0); assert(digest(binding.sourcePinsSHA256)); assert(digest(binding.expectedCandidateBinarySHA256));
  for (const key of ['sourceManifest', 'candidateReceipt', 'actorManifest', 'apiProcess']) {
    const pin = binding[key]; assert(pin && typeof pin.file === 'string' && path.isAbsolute(pin.file) && digest(pin.rawBytesSha256), `Actual ${key} pin is required before execution`);
  }
  if (binding.processRestart1351 !== undefined) { const p=binding.processRestart1351; assert(p&&typeof p.file==='string'&&path.isAbsolute(p.file)&&digest(p.rawBytesSha256), 'Actual process-restart registry pin required'); }
  return binding;
}
function pinned(ctx, pin) {
  const file = path.resolve(pin.file); assert(file.startsWith(ctx.private + '/') || file.startsWith(ctx.win + '/'), 'Only the actual Root namespace/task inputs may bind execution');
  const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(file), file);
  const bytes = fs.readFileSync(file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes);
}
export function bindActualContext(ctx, binding, approvedBindingSHA256, bindingBytes) {
  validateBindingShape(binding); assert(digest(approvedBindingSHA256)); assert.equal(sha(bindingBytes), approvedBindingSHA256, 'Exact Root-reviewed source/candidate/actor/process binding required');
  assert.equal(ctx.namespace, binding.namespace); assert.equal(ctx.epoch, binding.epoch); assert.equal(ctx.run, binding.run); assert.equal(ctx.state.marker, binding.marker);
  assert.equal(ctx.tables, binding.tables); assert.equal(ctx.migrations, binding.migrations); assert.equal(ctx.database, binding.database);
  assert(!ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation && !ctx.state.activeFault);
  assert.equal(sha(Buffer.from(JSON.stringify(ctx.state.sourcePins))), binding.sourcePinsSHA256);
  pinned(ctx, binding.sourceManifest); pinned(ctx, binding.candidateReceipt);
  const processRecord = pinned(ctx, binding.apiProcess); assert.equal(processRecord.namespace, ctx.namespace); assert.equal(processRecord.port, 31441); assert.equal(processRecord.root, ctx.mirror);
  assert.equal(processRecord.binarySha256, binding.expectedCandidateBinarySHA256); assert.equal(ctx.state.apiProcess?.file, binding.apiProcess.file); assert.equal(ctx.state.apiProcess.rawBytesSha256, binding.apiProcess.rawBytesSha256); assert.deepEqual(ctx.state.apiProcess.record, processRecord);
  const stat = fs.readFileSync(`/proc/${processRecord.pid}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], processRecord.startTime);
  assert.equal(fs.realpathSync(`/proc/${processRecord.pid}/exe`), processRecord.binary); assert.equal(sha(fs.readFileSync(processRecord.binary)), binding.expectedCandidateBinarySHA256);
  const actors = pinned(ctx, binding.actorManifest); assert.equal(actors.namespace, ctx.namespace); assert.equal(actors.epoch, ctx.epoch); assert.equal(actors.run, ctx.run); assert.equal(actors.marker, binding.marker);
  assert(Array.isArray(actors.actors) && actors.actors.length > 0);
  if (ctx.state.processRestart1351) {
    const { assertRestartUIBinding1351 } = createRequire(import.meta.url)('../../../../../business/same-source-process1351.mjs');
    const proof = assertRestartUIBinding1351(ctx, binding, actors); assert(!(proof && typeof proof.then === 'function'), 'Process restart UI admission must finish synchronously before HTTP');
  }
  for (const expected of actors.actors) {
    const actual = ctx.state.actors[expected.key]; assert(actual?.id === expected.id && actual.roleId === expected.roleId && actual.orgId === expected.orgId);
    assert.deepEqual([...actual.permissions].sort(), [...expected.permissions].sort(), 'Refresh the actual actor manifest after an authorized role change; never silently rebase');
  }
  for (const fixture of binding.compatibilityFixtures ?? []) {
    assert.equal(fixture.kind, 'legacy-anchor'); assert.equal(fixture.qualification, 'controlled-compatibility-negative'); assert.equal(fixture.businessProducer, false);
    const receipt = pinned(ctx, fixture.seedReceipt), record = ctx.state.fixtures.legacyCompatibilityFixture;
    assert(record && record.projectId === fixture.projectId, 'Only the actual retained Legacy fixture may be consumed');
    assert.equal(record.receipt?.file, fixture.seedReceipt.file); assert.equal(record.receipt?.rawBytesSha256, fixture.seedReceipt.rawBytesSha256, 'Do not accept an arbitrary old JSON or invent an unregistered wrapper receipt');
    // Delayed synchronous loading keeps Windows validateBindingShape independent
    // of the Linux admission helper. Current source/candidate/actors/process above
    // remain mandatory and are never satisfied by this producer-era receipt.
    const { assertAdmittedFixtureSource } = createRequire(import.meta.url)('../../../../../business/consumer-admission54.mjs');
    const admitted = assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/legacyCompatibilityFixture', record, projectIds: [fixture.projectId], producerReceipt: fixture.seedReceipt });
    assert(admitted && typeof admitted.then !== 'function', 'Admission must finish synchronously before any HTTP');
    assert.equal(admitted.consumerEpoch, ctx.epoch); assert.equal(admitted.registryPath, '/fixtures/legacyCompatibilityFixture');
    if (receipt.epoch !== undefined) assert.equal(receipt.epoch, admitted.producerEpoch);
    if (receipt.namespace !== undefined) assert.equal(receipt.namespace, ctx.namespace);
    if (receipt.marker !== undefined) assert.equal(receipt.marker, binding.marker);
    assert.equal(receipt.projectId, fixture.projectId);
  }
  return { approvedBindingSHA256, epoch: ctx.epoch, run: ctx.run, tables: ctx.tables, migrations: ctx.migrations, processBinarySHA256: processRecord.binarySha256, actorKeys: actors.actors.map(actor => actor.key), sourceManifest: binding.sourceManifest, candidateReceipt: binding.candidateReceipt };
}
