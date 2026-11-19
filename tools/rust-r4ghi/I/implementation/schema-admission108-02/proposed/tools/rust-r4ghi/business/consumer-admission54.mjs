// Synchronous, read-only provenance checks. No top-level I/O/await or permission mint.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateRegistryLineage62, entrySource62 } from './registry-lineage62.mjs';
import { verifySchemaBinding108 } from './schema-comparison108.mjs';
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
function within54(root, file) {
  const actualRoot = fs.realpathSync(root), actual = fs.realpathSync(file), relative = path.relative(actualRoot, actual);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Pinned registry/state must resolve inside the exact consumer directory');
}
function primaryProjects54(record) {
  return [...new Set([record.fixtures?.project?.id, record.pause?.result?.projectId, record.uiSpareProjectId, record.projectId, record.project?.id].filter(value => typeof value === 'string' && value))];
}
function allProjectAnchors54(value, output = new Set()) {
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value)) {
    if (['projectId', 'project_id', 'uiSpareProjectId'].includes(key) && typeof child === 'string') output.add(child);
    if (key === 'project' && child && typeof child.id === 'string') output.add(child.id);
    if (['projectIds', 'affectedProjectIds'].includes(key) && Array.isArray(child)) for (const id of child) if (typeof id === 'string') output.add(id);
    allProjectAnchors54(child, output);
  }
  return output;
}
function assertFreshProjects54(ctx, record, projectIds, registry) {
  const anchors = [...allProjectAnchors54(record)];
  assert(anchors.every(id => projectIds.includes(id)), 'Caller omitted an existing project anchor from a supposed fresh record');
  if (!projectIds.length) { assert.equal(anchors.length, 0, 'Only a genuinely empty producer initialization may omit project IDs'); return; }
  const producer = registry ? JSON.parse(readPin54(registry.producerState)) : null;
  const old = new Set(Object.values(producer?.owned ?? {}).filter(row => row.table === 'project').map(row => row.key[0]));
  if (registry) {
    const retained = JSON.parse(readPin54(registry.retainedSnapshot));
    for (const database of Object.values(retained.databases ?? {})) {
      const table = database.tables?.project; if (!table) continue;
      const bytes = readPin54({ file: table.file, rawBytesSha256: table.rawBytesSha256 });
      for (const line of bytes.toString('utf8').split('\n').filter(Boolean)) { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); old.add(row.key[0]); }
    }
  }
  for (const id of projectIds) {
    assert(!old.has(id), 'A new current-source record cannot launder an old producer project');
    const owned = Object.values(ctx.state.owned ?? {}).find(row => row.table === 'project' && row.key.length === 1 && row.key[0] === id && !row.deleted);
    assert(owned, 'Fresh fixture requires an actual current consumer owned project');
    const proof = owned.proof;
    assert(proof?.transport === 'HTTP' && proof.responseComplete === true && proof.status >= 200 && proof.status < 300
      && proof.beforeSnapshot?.file.startsWith(ctx.priv + '/') && proof.afterSnapshot?.file.startsWith(ctx.priv + '/'), 'Fresh project requires this consumer real HTTP birth, not a relabelled old ownership key');
    const before = JSON.parse(readPin54(proof.beforeSnapshot)), after = JSON.parse(readPin54(proof.afterSnapshot));
    assert.equal(before.epoch, ctx.epoch); assert.equal(after.epoch, ctx.epoch); assert.equal(before.marker, ctx.state.marker); assert.equal(after.marker, ctx.state.marker);
    const projectRows = snapshot => {
      const table = snapshot.databases[ctx.database].tables.project;
      return readPin54({ file: table.file, rawBytesSha256: table.rawBytesSha256 }).toString('utf8').split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return row; });
    };
    assert(!projectRows(before).some(row => row.key[0] === id), 'Fresh project must be absent from its real original before snapshot');
    const born = projectRows(after).filter(row => row.key[0] === id); assert.equal(born.length, 1); assert.equal(born[0].sha256, owned.firstSha256);
  }
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
  within54(ctx.priv, admission.registry.file); const registry = JSON.parse(readPin54(admission.registry));
  assert.equal(registry.kind, 'verified-retained-data-consumer-registry54'); assert.equal(registry.namespace, ctx.namespace); assert.equal(registry.marker, ctx.state.marker);
  assert.equal(registry.consumer.epoch, ctx.epoch); assert.equal(registry.consumer.run, ctx.run);
  const digest = sha(JSON.stringify(ctx.pins)); assert.equal(digest, registry.consumer.sourcePinsSHA256); assert.deepEqual(ctx.state.sourcePins, ctx.pins);
  const pins = JSON.parse(readPin54(registry.consumer.sourcePins)); assert.deepEqual(pins, ctx.pins);
  assert(pins.some(pin => pin.file === 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md'), 'Consumer correction54 must be a real source pin');
  assert([1, 2, 3].includes(registry.schemaVersion));
  if (pins.some(pin => pin.file === 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md')) assert([2, 3].includes(registry.schemaVersion), 'A chained retained consumer requires an explicit chained registry, never a one-hop relabel');
  if (registry.schemaVersion === 3) { assert.equal(ctx.migrations, 98); verifySchemaBinding108(ctx, ctx.state.schemaComparison108, registry); }
  else { assert.equal(ctx.migrations, 97); assert(!ctx.state.schemaComparison108, 'M97 registry cannot conceal schema advancement'); }
  if (sourceFiles) for (const pin of pins) { assert(!path.isAbsolute(pin.file) && !pin.file.split('/').includes('..')); assert.equal(sha(fs.readFileSync(`${ctx.win}/${pin.file}`)), pin.sha256); }
  const currentProcess = apiProcess54(ctx, registry.consumer.apiProcess, liveProcess); assert.equal(currentProcess.binarySha256, registry.consumer.binarySHA256);
  readPin54(registry.retentionIndex); readPin54(registry.producerState); readPin54(registry.retainedSnapshot);
  if ([2, 3].includes(registry.schemaVersion)) validateRegistryLineage62(ctx, registry);
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
    assertFreshProjects54(ctx, record, projectIds, registry);
    return { registryPath, producerEpoch: ctx.epoch, consumerEpoch: ctx.epoch, producerSourcePinsSHA256: current, consumerSourcePinsSHA256: current, retainedProducerOnly: false };
  }
  assert(projectIds.length > 0, 'An old fixture admission cannot be expanded into a new unbound producer');
  assert(primaryProjects54(record).every(id => projectIds.includes(id)), 'All actual EO/Own/A05/Creator/Legacy project anchors must be declared');
  assert(projectIds.every(id => entry.projectIds.includes(id)), 'Requested project is outside this exact old producer fixture');
  for (const identity of entry.identity) assert.deepEqual(pointer54(record, identity.path), identity.value, `Original resource identity changed: ${identity.path}`);
  if (entry.mode === 'immutable-ui-producer' || entry.mode === 'legacy-compatibility') assert.equal(sha(JSON.stringify(producerProjection54(record))), entry.producerProjectionSHA256, 'Old producer facts changed outside the four explicit UI observer fields');
  const birthSource = entrySource62(registry, entry);
  if (record.sourcePinsSHA256 !== undefined) assert.equal(record.sourcePinsSHA256, birthSource.sourcePinsSHA256, 'Old source label must remain its real birth producer source');
  if (producerReceipt) {
    assert(entry.receipts.some(pin => pin.file === producerReceipt.file && pin.rawBytesSha256 === producerReceipt.rawBytesSha256), 'Only the exact pinned producer receipt is admitted'); readPin54(producerReceipt);
  }
  assert(entry.mode !== 'legacy-compatibility' || producerReceipt, 'Legacy compatibility requires its exact real seed receipt');
  return { registryPath, producerEpoch: birthSource.epoch, consumerEpoch: registry.consumer.epoch, producerSourcePinsSHA256: birthSource.sourcePinsSHA256,
    consumerSourcePinsSHA256: registry.consumer.sourcePinsSHA256, retainedProducerOnly: true,
    ...([2, 3].includes(registry.schemaVersion) ? { retainedAtEpoch: entry.retainedAt.epoch, retainedAtSourcePinsSHA256: entry.retainedAt.sourcePinsSHA256 } : {}) };
}
export function readAdmittedConsumerContext({ statePin }) {
  assert.equal(process.platform, 'linux'); const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
  within54(privateRoot + '/business', statePin.file); const state = JSON.parse(readPin54(statePin));
  assert(/^[A-Za-z0-9_-]{1,48}$/.test(state.epoch) && /^[A-Za-z0-9_-]{1,48}$/.test(state.run));
  const priv = `${privateRoot}/business/${state.epoch}/${state.run}`; assert.equal(statePin.file, `${priv}/state.json`); assert(!state.admissionPending54);
  const ctx = { namespace: state.namespace, epoch: state.epoch, run: state.run, private: privateRoot, priv, win, pins: state.sourcePins, state, tables: 139, migrations: state.schemaComparison108 ? 98 : 97, database: 'poms_r4ghi_rust' };
  // The proposed version is only accepted after the full binding and registry
  // checks below, never merely because an unverified state field exists.
  assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true }); return ctx;
}
