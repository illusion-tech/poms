// Synchronous file integrity/provenance only. No process launch, DB, HTTP or
// top-level I/O. These records never replace the backend's fresh authorization.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifySchemaBinding108 } from './schema-comparison108.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const observers = new Set(['UICommandObserved', 'UICommandObserverReceipt', 'UICommandResponseOriginal', 'UICommandOperationId']);
const projection = value => Object.fromEntries(Object.entries(value).filter(([key]) => !observers.has(key)));
const pointer = (value, key) => key.split('/').slice(1).reduce((object, part) => object?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], value);
const samePin = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
const tupleKey = value => JSON.stringify([value.epoch, value.run]);
function pinBytes(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return bytes;
}
const read = pin => JSON.parse(pinBytes(pin));
function within(root, file) {
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Retained lineage file escaped its approved root');
}
function rows(snapshot, database, table) {
  const meta = snapshot.databases[database].tables[table], bytes = pinBytes({ file: meta.file, rawBytesSha256: meta.rawBytesSha256 });
  return bytes.toString('utf8').split('\n').filter(Boolean).map(text => { const row = JSON.parse(text); assert.equal(sha(row.raw), row.sha256); return row; });
}
const sourceTuple = (state, statePin) => ({ epoch: state.epoch, run: state.run, sourcePinsSHA256: sha(JSON.stringify(state.sourcePins)), sourceCount: state.sourcePins.length, sourceState: { file: statePin.file, rawBytesSha256: statePin.rawBytesSha256 } });
function sameSource(a, b) {
  return a?.epoch === b?.epoch && a?.run === b?.run && a?.sourcePinsSHA256 === b?.sourcePinsSHA256 && a?.sourceCount === b?.sourceCount && samePin(a?.sourceState, b?.sourceState);
}
export function entrySource62(registry, entry) { return [2, 3].includes(registry.schemaVersion) ? entry.birthSource : registry.producer; }
export function assertImpactReview62(impact, producer, consumer) {
  assert.equal(impact.kind, 'approved-retained-evidence-impact-review62'); assert.equal(impact.producerEpoch, producer.epoch); assert.equal(impact.consumerEpoch, consumer.epoch);
  assert.equal(impact.producerSourcePinsSHA256, producer.sourcePinsSHA256); assert.equal(impact.consumerSourcePinsSHA256, consumer.sourcePinsSHA256);
  assert.equal(impact.retainHistoricalLabels, true); assert.equal(impact.currentConsumerCertificationGranted, false);
  assert(typeof impact.reviewer === 'string' && impact.reviewer.trim()); pinBytes(impact.sourceComparisonReceipt);
  assert(Array.isArray(impact.evidenceGroups) && impact.evidenceGroups.length > 0);
  for (const group of impact.evidenceGroups) { assert.equal(group.producerEpoch, producer.epoch); assert.equal(group.use, 'historical-by-impact-review'); assert.equal(group.certifiesCurrentConsumerExecution, false); pinBytes(group.receipt); }
}

function retainedEntry(registry, entry, record) {
  for (const item of entry.identity) assert.deepEqual(pointer(record, item.path), item.value, `Retained identity changed: ${entry.registryPath}${item.path}`);
  if (['immutable-ui-producer', 'legacy-compatibility'].includes(entry.mode)) assert.equal(sha(JSON.stringify(projection(record))), entry.producerProjectionSHA256);
  if (record.sourcePinsSHA256 !== undefined) assert.equal(record.sourcePinsSHA256, entrySource62(registry, entry).sourcePinsSHA256, 'Birth label may not be rewritten to an intermediate/current consumer');
}

function frame(ctx, registry, seen, depth) {
  assert(depth < 12, 'Retained registry chain is bounded'); assert.equal(registry.kind, 'verified-retained-data-consumer-registry54'); assert.equal(registry.namespace, ctx.namespace); assert.equal(registry.marker, ctx.state.marker);
  assert([1, 2, 3].includes(registry.schemaVersion));
  if (registry.schemaVersion === 3) verifySchemaBinding108(ctx, registry.schemaComparison108, registry);
  for (const pin of [registry.retentionIndex, registry.producerState, registry.retainedSnapshot]) within(ctx.private, pin.file);
  const producerState = read(registry.producerState), retainedSnapshot = read(registry.retainedSnapshot), index = read(registry.retentionIndex), source = sourceTuple(producerState, registry.producerState);
  assert.equal(source.epoch, registry.producer.epoch); assert.equal(source.run, registry.producer.run); assert.equal(source.sourcePinsSHA256, registry.producer.sourcePinsSHA256); assert.equal(source.sourceCount, registry.producer.sourceCount);
  assert.equal(producerState.marker, registry.marker); assert.equal(retainedSnapshot.marker, registry.marker); assert.equal(retainedSnapshot.epoch, producerState.epoch);
  assert.equal(index.producerEpoch, producerState.epoch); assert.equal(index.run, producerState.run); assert(samePin(index.frozenState, registry.producerState)); assert(samePin(index.retainedSnapshot, registry.retainedSnapshot));
  const consumerPins = read(registry.consumer.sourcePins); assert.equal(sha(JSON.stringify(consumerPins)), registry.consumer.sourcePinsSHA256); assert.equal(consumerPins.length, registry.consumer.sourceCount);
  let previous = null;
  if ([2, 3].includes(registry.schemaVersion)) {
    assert(samePin(registry.impactReview, registry.consumer.impactReview)); const impact = read(registry.impactReview);
    assertImpactReview62(impact, source, registry.consumer);
    assert(samePin(registry.priorRegistry, producerState.consumerAdmission54?.registry), 'The direct producer original registry is mandatory, never silently rebound');
    within(ctx.private + '/business', registry.priorRegistry.file); const key = registry.priorRegistry.file + ':' + registry.priorRegistry.rawBytesSha256; assert(!seen.has(key), 'Registry chain cycle'); seen.add(key);
    previous = frame(ctx, read(registry.priorRegistry), seen, depth + 1);
    assert.equal(previous.registry.consumer.epoch, producerState.epoch); assert.equal(previous.registry.consumer.run, producerState.run); assert.equal(previous.registry.consumer.sourcePinsSHA256, source.sourcePinsSHA256);
  } else {
    assert(!producerState.consumerAdmission54, 'A subsequent retained consumer must use a chained registry');
  }
  return { registry, producerState, retainedSnapshot, source, previous };
}
function sourceHistory(current) {
  const output = current.previous ? sourceHistory(current.previous) : [];
  const existing = output.find(value => tupleKey(value) === tupleKey(current.source)); if (existing) assert(sameSource(existing, current.source)); else output.push(current.source);
  return output;
}
function ownedProject(ctx, state, snapshot, id) {
  const row = rows(snapshot, ctx.database, 'project').find(value => value.key.length === 1 && value.key[0] === id), owned = Object.values(state.owned).find(value => value.database === ctx.database && value.table === 'project' && value.key.length === 1 && value.key[0] === id);
  assert(row && owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin, 'Admitted project is not exact retained realOwned'); return owned;
}
function newHTTPBirth(ctx, current, id, owned) {
  const proof = owned.proof, privateRun = `${ctx.private}/business/${current.source.epoch}/${current.source.run}`;
  assert(proof?.transport === 'HTTP' && proof.responseComplete === true && proof.beforeAbsent === true && proof.status >= 200 && proof.status < 300, 'New registry entry needs an actual direct-producer HTTP birth');
  for (const pin of [proof.beforeSnapshot, proof.afterSnapshot]) within(privateRun, pin.file);
  const before = read(proof.beforeSnapshot), after = read(proof.afterSnapshot);
  for (const snapshot of [before, after]) { assert.equal(snapshot.epoch, current.source.epoch); assert.equal(snapshot.run, current.source.run); assert.equal(snapshot.marker, ctx.state.marker); }
  assert(!rows(before, ctx.database, 'project').some(row => row.key[0] === id)); const born = rows(after, ctx.database, 'project').filter(row => row.key[0] === id); assert.equal(born.length, 1); assert.equal(born[0].sha256, owned.firstSha256);
}
function receiptSource(ctx, pin, sources) {
  pinBytes(pin); const matches = sources.filter(source => [
    `${ctx.private}/business/${source.epoch}/${source.run}/`, `${ctx.win}/tmp/rust-r4ghi/business/${source.epoch}/${source.run}/`,
  ].some(prefix => pin.file.startsWith(prefix)));
  assert.equal(matches.length, 1, 'Producer receipt must retain its actual source epoch path'); return { pin: { file: pin.file, rawBytesSha256: pin.rawBytesSha256 }, source: matches[0] };
}

export function validateRegistryLineage62(ctx, registry) {
  const current = frame(ctx, registry, new Set(), 0), sources = sourceHistory(current);
  if (![2, 3].includes(registry.schemaVersion)) return { current, sources };
  assert.deepEqual(registry.sourceHistory, sources);
  for (const entry of registry.fixtureAdmissions) {
    const record = pointer(current.producerState, entry.registryPath); assert(record); assert.equal(entry.retainedRecordSHA256, sha(JSON.stringify(record)));
    assert.deepEqual(entry.retainedAt, { ...current.source, retainedSnapshot: registry.retainedSnapshot });
    const prior = current.previous.registry.fixtureAdmissions.find(value => value.registryPath === entry.registryPath);
    const birth = prior ? ([2, 3].includes(current.previous.registry.schemaVersion) ? prior.birthSource : current.previous.source) : current.source;
    assert(sameSource(entry.birthSource, birth)); assert(sources.some(source => sameSource(source, entry.birthSource)));
    if (prior) { retainedEntry(current.previous.registry, prior, record); assert(prior.projectIds.every(id => entry.projectIds.includes(id))); }
    for (const id of entry.projectIds) { const owned = ownedProject(ctx, current.producerState, current.retainedSnapshot, id); if (!prior) newHTTPBirth(ctx, current, id, owned); }
    retainedEntry(registry, entry, record);
    assert.equal(entry.receiptProvenance.length, entry.receipts.length);
    for (let i = 0; i < entry.receipts.length; i += 1) assert.deepEqual(entry.receiptProvenance[i], receiptSource(ctx, entry.receipts[i], sources));
    if (entry.registryPath.startsWith('/fixtures/a05Boundaries26/views/') && record.result?.published) {
      const pin = record.fixtures.a05SnapshotHTTP?.proof; assert(pin && record.fixtures.a05SnapshotHTTP.proofPending === false); assert(entry.receipts.some(value => samePin(value, pin)), 'A05 actual published proof must be explicitly registered');
      assert(samePin(record.result.published.proof, pin)); const proof = read(pin); assert.equal(proof.actualPublishedSnapshot, true); assert.equal(proof.stored.length, 1);
      assert.equal(proof.stored[0].frozen_payload.projectId, record.fixtures.project.id); assert.equal(proof.stored[0].frozen_payload.snapshot.id, record.result.published.snapshotId);
    }
  }
  return { current, sources };
}

export function makeChainedAdmissions62(ctx, registry, entries) {
  const current = frame(ctx, registry, new Set(), 0), sources = sourceHistory(current);
  const output = entries.map(value => {
    const entry = structuredClone(value), record = pointer(current.producerState, entry.registryPath), prior = current.previous.registry.fixtureAdmissions.find(item => item.registryPath === entry.registryPath);
    entry.birthSource = prior ? ([2, 3].includes(current.previous.registry.schemaVersion) ? prior.birthSource : current.previous.source) : current.source;
    entry.birthProducerRecordSHA256 = prior?.birthProducerRecordSHA256 ?? prior?.producerRecordSHA256 ?? entry.producerRecordSHA256;
    entry.retainedRecordSHA256 = sha(JSON.stringify(record)); entry.retainedAt = { ...current.source, retainedSnapshot: registry.retainedSnapshot };
    if (prior) for (const identity of prior.identity) { const found = entry.identity.find(item => item.path === identity.path); if (found) assert.deepEqual(found, identity); else entry.identity.push(identity); }
    const receipts = [...(prior?.receipts ?? []), ...entry.receipts];
    if (entry.registryPath.startsWith('/fixtures/a05Boundaries26/views/') && record.result?.published) receipts.push(record.fixtures.a05SnapshotHTTP.proof);
    entry.receipts = receipts.filter((pin, index) => receipts.findIndex(other => samePin(pin, other)) === index).map(pin => ({ file: pin.file, rawBytesSha256: pin.rawBytesSha256 }));
    entry.receiptProvenance = entry.receipts.map(pin => receiptSource(ctx, pin, sources)); return entry;
  });
  const next = { ...registry, sourceHistory: sources, fixtureAdmissions: output }; validateRegistryLineage62(ctx, next); return { entries: output, sources };
}

export function quarantineEvidence62(next, old, historicalEvidence) {
  next.consumerEvidenceHistory62 = [...(old.consumerEvidenceHistory62 ?? []), historicalEvidence];
  next.actualAuthConfigurations = {}; next.requiredWriteSweeps = {}; next.efRequiredWriteSweeps40 = {};
  delete next.trustedSummarySeam; delete next.statusSourcePins; delete next.admissionPending54;
}
