import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha } from './pure.mjs';
import { assertAdmittedFixtureSource, producerProjection54 } from './consumer-admission54.mjs';
import { assertSameRetained54 } from './retained-admission54.mjs';

function synthetic() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-consumer54-unit-'));
  const pin = (name, value) => { const file = path.join(dir, name).split(path.sep).join('/'), bytes = Buffer.from(JSON.stringify(value)); fs.writeFileSync(file, bytes); return { file, rawBytesSha256: sha(bytes) }; };
  const pins = [{ file: 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md', sha256: 'a'.repeat(64) }], current = sha(JSON.stringify(pins)), old = 'b'.repeat(64);
  const record = { key: 'eo', sourcePinsSHA256: old, fixtures: { project: { id: 'project-a' } }, pause: { result: { commandActorId: 'actor-a' } }, UICommandObserved: false };
  const process = { namespace: 'poms-r4ghi', root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: 'c'.repeat(64) }, apiPin = pin('process.json', process);
  const entry = { registryPath: '/fixtures/uiFixtureViews23/eo', mode: 'immutable-ui-producer', projectIds: ['project-a', 'project-b'], identity: [{ path: '/fixtures/project/id', value: 'project-a' }],
    producerProjectionSHA256: sha(JSON.stringify(producerProjection54(record))), receipts: [] };
  const registry = { kind: 'verified-retained-data-consumer-registry54', namespace: 'poms-r4ghi', marker: 'marker', producer: { epoch: 'old10', sourcePinsSHA256: old },
    consumer: { epoch: 'new11', run: 'main', sourcePinsSHA256: current, sourcePins: pin('sources.json', pins), apiProcess: apiPin, binarySHA256: process.binarySha256 },
    retentionIndex: pin('retention.json', {}), producerState: pin('old-state.json', {}), retainedSnapshot: pin('retained.json', {}), fixtureAdmissions: [entry] };
  const registryPin = pin('registry.json', registry), state = { marker: 'marker', sourcePins: pins, apiProcess: { ...apiPin, record: process }, consumerAdmission54: { registry: registryPin }, fixtures: { uiFixtureViews23: { eo: record } } };
  const ctx = { namespace: 'poms-r4ghi', epoch: 'new11', run: 'main', priv: dir.split(path.sep).join('/'), pins, state };
  return { dir, pin, ctx, record, entry, registry };
}
function removeUnitDir54(dir) {
  const absolute = fs.realpathSync(dir), parent = path.resolve(fs.realpathSync(os.tmpdir()));
  assert.equal(path.dirname(absolute), parent); assert(path.basename(absolute).startsWith('poms-consumer54-unit-'));
  fs.rmSync(absolute, { recursive: true });
}
test('consumer bridge preserves original source and accepts only explicit project subsets', () => {
  const f = synthetic(); try {
    const before = JSON.stringify(f.record), verdict = assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] });
    assert.equal(verdict.producerEpoch, 'old10'); assert.equal(verdict.consumerEpoch, 'new11'); assert.equal(JSON.stringify(f.record), before);
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['foreign'] }));
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: [] }));
  } finally { removeUnitDir54(f.dir); }
});
test('only four actual UI observer fields may differ from the retained producer projection', () => {
  const f = synthetic(); try {
    Object.assign(f.record, { UICommandObserved: true, UICommandObserverReceipt: 'actual-observer', UICommandResponseOriginal: 'actual-response', UICommandOperationId: 'canonical' });
    assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] });
    f.record.fixtures.project.name = 'forged producer'; assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
  } finally { removeUnitDir54(f.dir); }
});
test('unlisted record, changed source label and corrupt pinned registry cannot be admitted', () => {
  const f = synthetic(); try {
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/missing', record: f.record, projectIds: ['project-a'] }));
    f.record.sourcePinsSHA256 = 'd'.repeat(64); assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
    fs.appendFileSync(f.ctx.state.consumerAdmission54.registry.file, ' '); assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
  } finally { removeUnitDir54(f.dir); }
});
test('new-source empty producer view can initialize without expanding an old admitted view', () => {
  const pins = [], record = { sourcePinsSHA256: sha(JSON.stringify(pins)) }, ctx = { epoch: 'new', pins, state: { fixtures: { fresh: record } } };
  const value = assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/fresh', record, projectIds: [] }); assert.equal(value.retainedProducerOnly, false);
});
test('an admitted old path cannot relabel itself current and bypass its original producer facts', () => {
  const f = synthetic(); try {
    f.record.sourcePinsSHA256 = sha(JSON.stringify(f.ctx.pins)); f.record.fixtures.project.name = 'changed-old-producer';
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
    delete f.record.fixtures.project.name;
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
    const fresh = { sourcePinsSHA256: sha(JSON.stringify(f.ctx.pins)) }; f.ctx.state.fixtures.fresh = fresh;
    assert.equal(assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/fresh', record: fresh, projectIds: [] }).retainedProducerOnly, false);
  } finally { removeUnitDir54(f.dir); }
});
test('snapshot admission rejects row xmin/catalog/object drift even with identical logical money', () => {
  const tables = Object.fromEntries(Array.from({ length: 139 }, (_, i) => [`table${i}`, []])); tables.table0 = [{ key: ['a'], sha256: 'same', xmin: '10' }];
  const before = { databases: { db: { meta: { marker: 'old' }, tables } }, objects: { db: { files: ['one'] } } };
  assertSameRetained54(before, structuredClone(before), ['db'], rows => rows);
  for (const mutate of [s => { s.databases.db.tables.table0[0].xmin = '11'; }, s => { s.databases.db.meta.marker = 'changed'; }, s => { s.objects.db.files.push('other'); }]) {
    const after = structuredClone(before); mutate(after); assert.throws(() => assertSameRetained54(before, after, ['db'], rows => rows));
  }
});
