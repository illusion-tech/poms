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
    retentionIndex: pin('retention.json', {}), producerState: pin('old-state.json', { owned: { old: { table: 'project', key: ['old-main-project'] } } }), retainedSnapshot: pin('retained.json', {}), fixtureAdmissions: [entry] };
  const registryPin = pin('registry.json', registry), state = { marker: 'marker', sourcePins: pins, apiProcess: { ...apiPin, record: process }, consumerAdmission54: { registry: registryPin }, fixtures: { uiFixtureViews23: { eo: record } } };
  const ctx = { namespace: 'poms-r4ghi', epoch: 'new11', run: 'main', priv: dir.split(path.sep).join('/'), pins, state };
  return { dir, pin, ctx, record, entry, registry };
}
function removeUnitDir54(dir) {
  const absolute = fs.realpathSync(dir), parent = path.resolve(fs.realpathSync(os.tmpdir()));
  assert.equal(path.dirname(absolute), parent); assert(path.basename(absolute).startsWith('poms-consumer54-unit-'));
  fs.rmSync(absolute, { recursive: true });
}
function actualUnitBirth54(f, id) {
  const raw = JSON.stringify({ id }), row = { key: [id], raw, sha256: sha(raw) }, beforeFile = path.join(f.dir, 'before-projects.jsonl'), afterFile = path.join(f.dir, 'after-projects.jsonl');
  fs.writeFileSync(beforeFile, ''); const bytes = Buffer.from(JSON.stringify(row) + '\n'); fs.writeFileSync(afterFile, bytes); f.ctx.database = 'db';
  const snapshot = (file, digest) => ({ epoch: f.ctx.epoch, marker: f.ctx.state.marker, databases: { db: { tables: { project: { file, rawBytesSha256: digest } } } } });
  return { table: 'project', key: [id], firstSha256: row.sha256, proof: { transport: 'HTTP', responseComplete: true, status: 201,
    beforeSnapshot: f.pin('before-snapshot.json', snapshot(beforeFile, sha(Buffer.alloc(0)))), afterSnapshot: f.pin('after-snapshot.json', snapshot(afterFile, sha(bytes))) } };
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
test('unregistered current labels cannot clone old main/receiver projects or omit actual anchors', () => {
  const f = synthetic(); try {
    const clone = { sourcePinsSHA256: sha(JSON.stringify(f.ctx.pins)), fixtures: { project: { id: 'old-main-project' } } }; f.ctx.state.fixtures.clone = clone;
    f.ctx.state.owned = { claimed: { table: 'project', key: ['old-main-project'], proof: { transport: 'HTTP', responseComplete: true, status: 201, beforeSnapshot: { file: f.ctx.priv + '/before' }, afterSnapshot: { file: f.ctx.priv + '/after' } } } };
    for (const projectIds of [[], ['old-main-project']]) assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/clone', record: clone, projectIds }));
    clone.fixtures.project.id = 'actual-new'; f.ctx.state.owned.claimed = actualUnitBirth54(f, 'actual-new');
    assert.equal(assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/clone', record: clone, projectIds: ['actual-new'] }).retainedProducerOnly, false);
    for (const field of ['uiSpareProjectId', 'projectId']) { delete clone.fixtures; clone[field] = 'actual-new'; assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/clone', record: clone, projectIds: [] })); delete clone[field]; }
  } finally { removeUnitDir54(f.dir); }
});
test('fresh cannot reuse an original baseline project absent from old owned registry', () => {
  const f = synthetic(); try {
    const raw = JSON.stringify({ id: 'baseline-project' }), row = { key: ['baseline-project'], raw, sha256: sha(raw) }, tableBytes = Buffer.from(JSON.stringify(row) + '\n');
    const tableFile = path.join(f.dir, 'old-projects.jsonl'); fs.writeFileSync(tableFile, tableBytes);
    f.registry.retainedSnapshot = f.pin('retained.json', { databases: { db: { tables: { project: { file: tableFile, rawBytesSha256: sha(tableBytes) } } } } });
    f.ctx.state.consumerAdmission54.registry = f.pin('registry.json', f.registry);
    const clone = { sourcePinsSHA256: sha(JSON.stringify(f.ctx.pins)), projectId: 'baseline-project' }; f.ctx.state.fixtures.clone = clone;
    f.ctx.state.owned = { fake: { table: 'project', key: ['baseline-project'], proof: { transport: 'HTTP', responseComplete: true, status: 201, beforeSnapshot: { file: f.ctx.priv + '/before' }, afterSnapshot: { file: f.ctx.priv + '/after' } } } };
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/clone', record: clone, projectIds: ['baseline-project'] }));
  } finally { removeUnitDir54(f.dir); }
});
test('Legacy retains all producer qualification/hash/xmin/denial facts plus the exact old seed', () => {
  const f = synthetic(); try {
    const seed = f.pin('legacy-seed.json', { projectId: 'project-a' }), legacy = { projectId: 'project-a', counted32Producer: false, rowSHA256: 'original-row', xmin: '10', verified: true, denialReceipts: { exact: 'old403' }, receipt: seed };
    f.ctx.state.fixtures.legacyCompatibilityFixture = legacy;
    f.registry.fixtureAdmissions.push({ registryPath: '/fixtures/legacyCompatibilityFixture', mode: 'legacy-compatibility', projectIds: ['project-a'], identity: [{ path: '/projectId', value: 'project-a' }], producerProjectionSHA256: sha(JSON.stringify(producerProjection54(legacy))), receipts: [seed] });
    f.ctx.state.consumerAdmission54.registry = f.pin('registry.json', f.registry);
    const check = () => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/legacyCompatibilityFixture', record: legacy, projectIds: ['project-a'], producerReceipt: seed });
    check(); for (const [key, value] of [['counted32Producer', true], ['rowSHA256', 'changed'], ['xmin', '11'], ['verified', false], ['denialReceipts', {}]]) { const old = legacy[key]; legacy[key] = value; assert.throws(check); legacy[key] = old; }
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/legacyCompatibilityFixture', record: legacy, projectIds: ['project-a'] }));
  } finally { removeUnitDir54(f.dir); }
});
test('lexical prefix with parent traversal cannot redirect the registry outside consumer root', () => {
  const f = synthetic(); try {
    const inside = path.join(f.dir, 'inside'); fs.mkdirSync(inside); f.ctx.priv = inside.split(path.sep).join('/');
    const real = f.ctx.state.consumerAdmission54.registry;
    f.ctx.state.consumerAdmission54.registry = { ...real, file: f.ctx.priv + '/../registry.json' };
    assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record: f.record, projectIds: ['project-a'] }));
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
