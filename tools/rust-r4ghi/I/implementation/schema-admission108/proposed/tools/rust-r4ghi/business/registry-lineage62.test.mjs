import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { sha } from './pure.mjs';
import { makeChainedAdmissions62, validateRegistryLineage62, entrySource62, quarantineEvidence62 } from './registry-lineage62.mjs';
import { assertAdmittedFixtureSource } from './consumer-admission54.mjs';
const projection = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['UICommandObserved', 'UICommandObserverReceipt', 'UICommandResponseOriginal', 'UICommandOperationId'].includes(key)));

function synthetic62() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-lineage62-unit-')).split(path.sep).join('/');
  const pin = (relative, value) => { const file = `${dir}/${relative}`, bytes = Buffer.from(JSON.stringify(value)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); return { file, rawBytesSha256: sha(bytes) }; };
  const row = id => { const raw = JSON.stringify({ id }); return { key: [id], raw, sha256: sha(raw), xmin: '7' }; }, a = row('old-project'), b = row('new11-project');
  const snapshot = (epoch, values, name) => {
    const bytes = Buffer.from(values.map(value => JSON.stringify(value)).join('\n') + '\n'), file = `${dir}/business/${epoch}/main/${name}.jsonl`; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
    return { epoch, run: 'main', marker: 'marker', databases: { db: { tables: { project: { file, rawBytesSha256: sha(bytes) } } } } };
  };
  const pins10 = [{ file: 'source10', sha256: 'a'.repeat(64) }], pins11 = [{ file: 'source11', sha256: 'b'.repeat(64) }], pins12 = [{ file: 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md', sha256: 'c'.repeat(64) }, { file: 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md', sha256: 'd'.repeat(64) }];
  const record10 = { sourcePinsSHA256: sha(JSON.stringify(pins10)), fixtures: { project: { id: 'old-project' } }, UICommandObserved: false };
  const ownedA = { database: 'db', table: 'project', key: a.key, latestSha256: a.sha256, latestXmin: a.xmin, firstSha256: a.sha256 };
  const state10 = { epoch: 'e10', run: 'main', marker: 'marker', sourcePins: pins10, owned: { a: ownedA }, fixtures: { uiFixtureViews23: { eo: record10 } } };
  const retained10 = pin('retention/e10/snapshot.json', snapshot('e10', [a], 'retained')), statePin10 = pin('retention/e10/state.json', state10);
  const oldEntry = { registryPath: '/fixtures/uiFixtureViews23/eo', mode: 'immutable-ui-producer', projectIds: ['old-project'], identity: [{ path: '/sourcePinsSHA256', value: record10.sourcePinsSHA256 }], producerRecordSHA256: sha(JSON.stringify(record10)), producerProjectionSHA256: sha(JSON.stringify(projection(record10))), receipts: [] };
  const registry11 = { schemaVersion: 1, kind: 'verified-retained-data-consumer-registry54', namespace: 'poms-r4ghi', marker: 'marker', producer: { epoch: 'e10', run: 'main', sourcePinsSHA256: sha(JSON.stringify(pins10)), sourceCount: 1 },
    consumer: { epoch: 'e11', run: 'main', sourcePinsSHA256: sha(JSON.stringify(pins11)), sourceCount: 1, sourcePins: pin('business/e11/main/sources.json', pins11) }, producerState: statePin10, retainedSnapshot: retained10,
    retentionIndex: pin('retention/e10/index.json', { producerEpoch: 'e10', run: 'main', frozenState: statePin10, retainedSnapshot: retained10 }), fixtureAdmissions: [oldEntry] };
  const priorRegistry = pin('business/e11/main/registry.json', registry11);
  const before = pin('business/e11/main/birth-before.json', snapshot('e11', [a], 'before')), after = pin('business/e11/main/birth-after.json', snapshot('e11', [a, b], 'after'));
  const ownedB = { database: 'db', table: 'project', key: b.key, latestSha256: b.sha256, latestXmin: b.xmin, firstSha256: b.sha256, proof: { transport: 'HTTP', status: 201, responseComplete: true, beforeAbsent: true, beforeSnapshot: before, afterSnapshot: after } };
  const published = pin('business/e11/main/cent-published.json', { actualPublishedSnapshot: true, stored: [{ frozen_payload: { projectId: 'new11-project', snapshot: { id: 'published-b' } } }] });
  const record11 = { sourcePinsSHA256: sha(JSON.stringify(pins11)), fixtures: { project: { id: 'new11-project' }, a05SnapshotHTTP: { proof: published, proofPending: false } }, result: { published: { snapshotId: 'published-b', proof: published } } };
  const state11 = { epoch: 'e11', run: 'main', marker: 'marker', sourcePins: pins11, owned: { a: ownedA, b: ownedB }, consumerAdmission54: { registry: priorRegistry }, fixtures: { uiFixtureViews23: { eo: record10 }, a05Boundaries26: { views: { 'cent-max': record11 } } } };
  const statePin11 = pin('retention/e11/state.json', state11), retained11 = pin('retention/e11/snapshot.json', snapshot('e11', [a, b], 'retained'));
  const impactReview = pin('business/e12/main/impact.json', { kind: 'approved-retained-evidence-impact-review62', producerEpoch: 'e11', consumerEpoch: 'e12', producerSourcePinsSHA256: sha(JSON.stringify(pins11)), consumerSourcePinsSHA256: sha(JSON.stringify(pins12)), retainHistoricalLabels: true, currentConsumerCertificationGranted: false,
    reviewer: 'synthetic-unit-only', sourceComparisonReceipt: pin('business/e12/main/source-comparison.json', { synthetic: true }), evidenceGroups: [{ producerEpoch: 'e11', use: 'historical-by-impact-review', certifiesCurrentConsumerExecution: false, receipt: pin('business/e11/main/historical-result.json', { synthetic: true }) }] });
  const registry12 = { schemaVersion: 2, kind: 'verified-retained-data-consumer-registry54', namespace: 'poms-r4ghi', marker: 'marker', producer: { epoch: 'e11', run: 'main', sourcePinsSHA256: sha(JSON.stringify(pins11)), sourceCount: 1 },
    consumer: { epoch: 'e12', run: 'main', sourcePinsSHA256: sha(JSON.stringify(pins12)), sourceCount: pins12.length, sourcePins: pin('business/e12/main/sources.json', pins12), impactReview },
    producerState: statePin11, retainedSnapshot: retained11, priorRegistry, impactReview, retentionIndex: pin('retention/e11/index.json', { producerEpoch: 'e11', run: 'main', frozenState: statePin11, retainedSnapshot: retained11 }) };
  const centEntry = { registryPath: '/fixtures/a05Boundaries26/views/cent-max', mode: 'continuable-project-producer', projectIds: ['new11-project'], identity: [{ path: '/sourcePinsSHA256', value: record11.sourcePinsSHA256 }], producerRecordSHA256: sha(JSON.stringify(record11)), producerProjectionSHA256: sha(JSON.stringify(projection(record11))), receipts: [] };
  const ctx = { namespace: 'poms-r4ghi', private: dir, win: `${dir}/public`, database: 'db', state: { marker: 'marker' } };
  return { dir, pin, ctx, registry11, registry12, oldEntry, centEntry, published, state11, pins12 };
}
function cleanup62(dir) { const target = fs.realpathSync(dir); assert.equal(path.dirname(target), fs.realpathSync(os.tmpdir())); assert(path.basename(target).startsWith('poms-lineage62-unit-')); fs.rmSync(target, { recursive: true }); }
function built62(f) { const value = makeChainedAdmissions62(f.ctx, f.registry12, [f.oldEntry, f.centEntry]); return { ...f.registry12, fixtureAdmissions: value.entries, sourceHistory: value.sources }; }
function consumer62(f, value) {
  const process = { namespace: f.ctx.namespace, root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: 'd'.repeat(64) }, processPin = f.pin('business/e12/main/process.json', process);
  value.consumer.apiProcess = processPin; value.consumer.binarySHA256 = process.binarySha256;
  const registry = f.pin('business/e12/main/registry.json', value);
  return { ...f.ctx, migrations: 97, epoch: 'e12', run: 'main', priv: `${f.dir}/business/e12/main`, pins: f.pins12, state: { ...structuredClone(f.state11), epoch: 'e12', sourcePins: f.pins12, apiProcess: { ...processPin, record: process }, consumerAdmission54: { registry } } };
}
test('a second explicit admission retains old10 birth and new11 birth independently', () => {
  const f = synthetic62(); try {
    const value = built62(f); validateRegistryLineage62(f.ctx, value);
    assert.equal(entrySource62(value, value.fixtureAdmissions[0]).epoch, 'e10'); assert.equal(entrySource62(value, value.fixtureAdmissions[1]).epoch, 'e11');
    assert.equal(value.fixtureAdmissions[0].retainedAt.epoch, 'e11'); assert.equal(value.sourceHistory.length, 2);
    const receipt = value.fixtureAdmissions[1].receiptProvenance.find(row => row.pin.file === f.published.file); assert.equal(receipt.source.epoch, 'e11');
  } finally { cleanup62(f.dir); }
});
test('dropping the prior registry, changing its raw bytes or lying about birth source fails closed', () => {
  const f = synthetic62(); try {
    const value = built62(f), forged = structuredClone(value); forged.fixtureAdmissions[0].birthSource = forged.fixtureAdmissions[1].birthSource; assert.throws(() => validateRegistryLineage62(f.ctx, forged));
    assert.throws(() => validateRegistryLineage62(f.ctx, { ...value, priorRegistry: undefined }));
    fs.appendFileSync(f.registry12.priorRegistry.file, ' '); assert.throws(() => validateRegistryLineage62(f.ctx, value));
  } finally { cleanup62(f.dir); }
});
test('the new11 published proof is explicit and cannot be reassigned to old10 or replaced with an unpinned proof', () => {
  const f = synthetic62(); try {
    const value = built62(f), missing = structuredClone(value); missing.fixtureAdmissions[1].receipts = []; missing.fixtureAdmissions[1].receiptProvenance = []; assert.throws(() => validateRegistryLineage62(f.ctx, missing));
    const wrong = structuredClone(value); wrong.fixtureAdmissions[1].receiptProvenance[0].source = wrong.fixtureAdmissions[0].birthSource; assert.throws(() => validateRegistryLineage62(f.ctx, wrong));
    fs.appendFileSync(f.published.file, ' '); assert.throws(() => validateRegistryLineage62(f.ctx, value));
  } finally { cleanup62(f.dir); }
});
test('an old project cloned into an unregistered new11 view lacks a genuine new11 HTTP birth', () => {
  const f = synthetic62(); try {
    const clone = { ...f.oldEntry, registryPath: '/fixtures/a05Boundaries26/views/cent-max', projectIds: ['old-project'] };
    assert.throws(() => makeChainedAdmissions62(f.ctx, f.registry12, [clone]));
  } finally { cleanup62(f.dir); }
});
test('a pinned impact review never promotes old results to new consumer certification', () => {
  const f = synthetic62(); try {
    const review = JSON.parse(fs.readFileSync(f.registry12.impactReview.file)); review.currentConsumerCertificationGranted = true;
    const bad = f.pin('business/e12/main/impact-bad.json', review); f.registry12.impactReview = bad; f.registry12.consumer.impactReview = bad;
    assert.throws(() => built62(f));
  } finally { cleanup62(f.dir); }
});
test('the existing synchronous H bridge returns per-entry birth rather than the immediate producer for old10/new11', () => {
  const f = synthetic62(); try {
    const ctx = consumer62(f, built62(f));
    const eo = ctx.state.fixtures.uiFixtureViews23.eo, cent = ctx.state.fixtures.a05Boundaries26.views['cent-max'];
    const old = assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: eo, projectIds: ['old-project'] });
    const newer = assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/a05Boundaries26/views/cent-max', record: cent, projectIds: ['new11-project'], producerReceipt: f.published });
    assert.equal(old.producerEpoch, 'e10'); assert.equal(newer.producerEpoch, 'e11'); assert.equal(newer.consumerEpoch, 'e12'); assert.equal(old.retainedAtEpoch, 'e11');
    eo.UICommandObserved = true; eo.UICommandObserverReceipt = 'actual-new-consumer-observer'; assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: eo, projectIds: ['old-project'] });
    eo.sourcePinsSHA256 = sha(JSON.stringify(ctx.pins)); assert.throws(() => assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: eo, projectIds: ['old-project'] }));
  } finally { cleanup62(f.dir); }
});
test('new12 current labels cannot clone an unregistered old11 project or omit the real anchor', () => {
  const f = synthetic62(); try {
    const ctx = consumer62(f, built62(f)), record = { sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), fixtures: { project: { id: 'new11-project' } } }; ctx.state.fixtures.clone = record;
    for (const projectIds of [[], ['new11-project']]) assert.throws(() => assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/clone', record, projectIds }));
    const pin = ctx.state.consumerAdmission54.registry, reg = JSON.parse(fs.readFileSync(pin.file)); reg.schemaVersion = 1; ctx.state.consumerAdmission54.registry = f.pin('business/e12/main/old-schema.json', reg);
    assert.throws(() => assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: ctx.state.fixtures.uiFixtureViews23.eo, projectIds: ['old-project'] }));
  } finally { cleanup62(f.dir); }
});
test('new consumer keeps both historical generations and empties active FI/auth/seam without rebasing owned facts', () => {
  const old = { inheritedProducerEvidence54: { source10: 'original' }, consumerEvidenceHistory62: [{ prior: 'retained' }], owned: { id: 'actual-latest' }, fixtures: { oldSource: 'unchanged' },
    requiredWriteSweeps: { operating102: 'actual134-only' }, efRequiredWriteSweeps40: { cost: 'old134' }, actualAuthConfigurations: { process134: 'old' }, trustedSummarySeam: 'old134', statusSourcePins: ['old134'] };
  const before = structuredClone(old), next = structuredClone(old), evidence = { source11: 'raw-pinned-state', oldRequiredWriteSweeps: old.requiredWriteSweeps, consumerCertificationGranted: false };
  quarantineEvidence62(next, old, evidence); assert.deepEqual(old, before); assert.deepEqual(next.owned, old.owned); assert.deepEqual(next.fixtures, old.fixtures); assert.deepEqual(next.inheritedProducerEvidence54, old.inheritedProducerEvidence54);
  assert.equal(next.consumerEvidenceHistory62.length, 2); assert.deepEqual(next.consumerEvidenceHistory62[1].oldRequiredWriteSweeps, old.requiredWriteSweeps);
  for (const key of ['requiredWriteSweeps', 'efRequiredWriteSweeps40', 'actualAuthConfigurations']) assert.deepEqual(next[key], {});
  assert(!Object.hasOwn(next, 'trustedSummarySeam')); assert(!Object.hasOwn(next, 'statusSourcePins'));
});
