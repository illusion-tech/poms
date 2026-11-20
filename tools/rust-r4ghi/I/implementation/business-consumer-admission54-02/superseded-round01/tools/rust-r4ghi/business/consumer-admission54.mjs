// Synchronous, read-only provenance checks. No top-level I/O/await or permission mint.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const CONSUMER_OBSERVER_FIELDS54 = Object.freeze(['UICommandObserved', 'UICommandObserverReceipt', 'UICommandResponseOriginal', 'UICommandOperationId']);
export function producerProjection54(record) { return Object.fromEntries(Object.entries(record).filter(([key]) => !CONSUMER_OBSERVER_FIELDS54.includes(key))); }
export function pointer54(value, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/'));
  return pointer.split('/').slice(1).reduce((object, key) => object?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], value);
}
export function readPin54(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256, 'Pinned original changed'); return bytes;
}
function apiProcess54(ctx, binding, live) {
  const process = JSON.parse(readPin54(binding)); assert.equal(process.namespace, ctx.namespace); assert.equal(process.root, '/home/wangzishi/projects/poms-rust-r4ghi'); assert.equal(process.port, 31441);
  assert.equal(ctx.state.apiProcess.file, binding.file); assert.equal(ctx.state.apiProcess.rawBytesSha256, binding.rawBytesSha256); assert.deepEqual(ctx.state.apiProcess.record, process);
  if (live) {
    const stat = fs.readFileSync(`/proc/${process.pid}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], process.startTime);
    assert.equal(fs.realpathSync(`/proc/${process.pid}/exe`), process.binary);
    assert.equal(sha(fs.readFileSync(process.binary)), process.binarySha256);
  }
  return process;
}
export function assertAdmittedContext54(ctx, { liveProcess = false, sourceFiles = false } = {}) {
  assert.equal(ctx.namespace, 'poms-r4ghi');
  const admission = ctx.state.consumerAdmission54; assert(admission && admission.registry, 'Explicit retained-data admission is required');
  assert(admission.registry.file.startsWith(ctx.priv + '/')); const registry = JSON.parse(readPin54(admission.registry));
  assert.equal(registry.kind, 'verified-retained-data-consumer-registry54'); assert.equal(registry.namespace, ctx.namespace); assert.equal(registry.marker, ctx.state.marker);
  assert.equal(registry.consumer.epoch, ctx.epoch); assert.equal(registry.consumer.run, ctx.run);
  const digest = sha(JSON.stringify(ctx.pins)); assert.equal(digest, registry.consumer.sourcePinsSHA256); assert.deepEqual(ctx.state.sourcePins, ctx.pins);
  const pins = JSON.parse(readPin54(registry.consumer.sourcePins)); assert.deepEqual(pins, ctx.pins);
  assert(pins.some(pin => pin.file === 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md'), 'Consumer correction54 must be a real source pin');
  if (sourceFiles) for (const pin of pins) { assert(!path.isAbsolute(pin.file) && !pin.file.split('/').includes('..')); assert.equal(sha(fs.readFileSync(`${ctx.win}/${pin.file}`)), pin.sha256); }
  const currentProcess = apiProcess54(ctx, registry.consumer.apiProcess, liveProcess); assert.equal(currentProcess.binarySha256, registry.consumer.binarySHA256);
  readPin54(registry.retentionIndex); readPin54(registry.producerState); readPin54(registry.retainedSnapshot);
  return registry;
}
export function assertAdmittedFixtureSource(ctx, { registryPath, record, projectIds, producerReceipt = null }) {
  assert(Array.isArray(projectIds) && new Set(projectIds).size === projectIds.length);
  assert.deepEqual(pointer54(ctx.state, registryPath), record, 'Only the real persisted record may be consumed');
  const current = sha(JSON.stringify(ctx.pins));
  const registry = ctx.state.consumerAdmission54 ? assertAdmittedContext54(ctx) : null;
  const entry = registry?.fixtureAdmissions.find(value => value.registryPath === registryPath);
  // An explicitly retained path is permanently an old producer identity. Its
  // source label cannot turn it into a fresh record and bypass the projection.
  if (!entry) {
    assert.equal(record.sourcePinsSHA256, current, 'Old fixture is outside the reviewed consumer resource set');
    return { registryPath, producerEpoch: ctx.epoch, consumerEpoch: ctx.epoch, producerSourcePinsSHA256: current, consumerSourcePinsSHA256: current, retainedProducerOnly: false };
  }
  assert(projectIds.length > 0, 'An old fixture admission cannot be expanded into a new unbound producer');
  assert(projectIds.every(id => entry.projectIds.includes(id)), 'Requested project is outside this exact old producer fixture');
  for (const identity of entry.identity) assert.deepEqual(pointer54(record, identity.path), identity.value, `Original resource identity changed: ${identity.path}`);
  if (entry.mode === 'immutable-ui-producer') assert.equal(sha(JSON.stringify(producerProjection54(record))), entry.producerProjectionSHA256, 'Old producer facts changed outside the four explicit UI observer fields');
  if (record.sourcePinsSHA256 !== undefined) assert.equal(record.sourcePinsSHA256, registry.producer.sourcePinsSHA256, 'Old source label must remain its real producer source');
  if (producerReceipt) {
    assert(entry.receipts.some(pin => pin.file === producerReceipt.file && pin.rawBytesSha256 === producerReceipt.rawBytesSha256), 'Only the exact pinned producer receipt is admitted'); readPin54(producerReceipt);
  }
  assert(entry.mode !== 'legacy-compatibility' || producerReceipt, 'Legacy compatibility requires its exact real seed receipt');
  return { registryPath, producerEpoch: registry.producer.epoch, consumerEpoch: registry.consumer.epoch, producerSourcePinsSHA256: registry.producer.sourcePinsSHA256,
    consumerSourcePinsSHA256: registry.consumer.sourcePinsSHA256, retainedProducerOnly: true };
}
export function readAdmittedConsumerContext({ statePin }) {
  assert.equal(process.platform, 'linux'); const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
  assert(statePin.file.startsWith(privateRoot + '/business/')); const state = JSON.parse(readPin54(statePin));
  assert(/^[A-Za-z0-9_-]{1,48}$/.test(state.epoch) && /^[A-Za-z0-9_-]{1,48}$/.test(state.run));
  const priv = `${privateRoot}/business/${state.epoch}/${state.run}`; assert.equal(statePin.file, `${priv}/state.json`); assert(!state.admissionPending54);
  const ctx = { namespace: state.namespace, epoch: state.epoch, run: state.run, private: privateRoot, priv, win, pins: state.sourcePins, state, tables: 139, migrations: 97, database: 'poms_r4ghi_rust' };
  assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true }); return ctx;
}
