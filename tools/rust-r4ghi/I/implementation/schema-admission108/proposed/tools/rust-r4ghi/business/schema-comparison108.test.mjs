// Synthetic FS/policy regression only. No PG, HTTP or producer certification.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyM98Transition108, deriveComparisonBaseline108, verifySchemaBinding108, comparisonBaselinePin108, plBody108 } from './schema-comparison108.mjs';
import { assertSchemaPlanShape108 } from './retained-schema-admission108.mjs';
import { assertRecorded } from './ledger.mjs';
import { loadSnapshot, loadComparisonSnapshot108, difference } from './snapshot.mjs';
import { assertAdmittedFixtureSource, producerProjection54 } from './consumer-admission54.mjs';
import { makeChainedAdmissions62, validateRegistryLineage62, entrySource62 } from './registry-lineage62.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const databases = ['poms_r4ghi_native', 'poms_r4ghi_rust'];
const clone = structuredClone;
const row = (value, xmin = '1') => { const raw = JSON.stringify(value); return { raw, key: [String(value.id)], cells: { id: String(value.id) }, sha256: sha(raw), xmin }; };
const oldSQL = 'CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN RETURN OLD; END;\n$$;';
const newSQL = 'CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN RETURN NEW; END;\n$$;';
const migrationName = 'Migration20990101000000_synthetic_guard';
function model108() {
  const empty = name => ({ file: '/synthetic-only/' + name, rawBytesSha256: sha(''), pk: ['id'], columns: ['id'], count: 0, logicalRowsSha256: sha(''), syntheticRows: [] });
  const tables = Object.fromEntries(['poms_migrations', 'project', ...Array.from({ length: 137 }, (_, i) => 'table' + String(i).padStart(3, '0'))].sort().map(name => [name, empty(name)]));
  tables.project.syntheticRows = [row({ id: 'original' })]; tables.poms_migrations.syntheticRows = Array.from({ length: 97 }, (_, i) => row({ id: i + 1, name: 'Migration' + String(i + 1), executed_at: '2026-11-01T00:00:00+08:00' }));
  const meta = { tables: Object.keys(tables).map(name => ({ name, oid: name, pk: ['id'], columns: ['id'] })), foreignKeys: [], externalForeignKeys: [], normative: {
    functions: [JSON.stringify({ oid: '111', schema: 'poms', proname: 'jghi_assignment_participant_guard', arguments: '', owner: 'owner', acl: null, prosecdef: false, proconfig: null, definition: oldSQL })],
    columns: [JSON.stringify({ schema: 'poms', table_name: 'poms_migrations', attname: 'id', default_expr: "nextval('poms.poms_migrations_id_seq'::regclass)" })],
    triggers: ['original-trigger'], constraints: ['original-constraint'], roles: ['non-super-app'], memberships: [], relations: ['same-OIDs'], schemas: ['same-schema'], indexes: ['same-index'],
  }, sequences: [{ schema: 'poms', name: 'poms_migrations_id_seq', oid: '222', value: '97', is_called: true }] };
  const originalBaseline = { schemaVersion: 1, epoch: 'old10', run: 'main', marker: 'unit-marker', databases: Object.fromEntries(databases.map(db => [db, { meta: clone(meta), tables: clone(tables) }])), objects: Object.fromEntries(databases.map(db => [db, { directories: [], files: [] }])) };
  const retained = clone(originalBaseline); retained.epoch = 'old12'; retained.databases.poms_r4ghi_rust.tables.project.syntheticRows.push(row({ id: 'owned-http-project' }, '12'));
  retained.objects.poms_r4ghi_rust.files.push({ key: 'owned-object', sha256: sha('owned') });
  const before = clone(retained), after = clone(before), evidence = { kind: 'exact-owned-forward-schema-advance108', fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, databases: {} };
  for (const database of databases) {
    const a = before.databases[database], b = after.databases[database], fn = JSON.parse(b.meta.normative.functions[0]); fn.definition = newSQL; b.meta.normative.functions[0] = JSON.stringify(fn);
    b.meta.sequences[0].value = '98'; const added = row({ id: 98, name: migrationName, executed_at: '2026-11-08T11:00:00.123456+08:00' }, '98'); b.tables.poms_migrations.syntheticRows.push(added);
    evidence.databases[database] = { functionOID: '111', beforeDefinitionSHA256: sha(oldSQL), afterDefinitionSHA256: sha(newSQL), afterBodySHA256: sha(plBody108(newSQL)),
      migrationRow: { key: added.key, rowSHA256: added.sha256, xmin: added.xmin, name: migrationName }, actualSequenceDeltas: [{ before: clone(a.meta.sequences[0]), after: clone(b.meta.sequences[0]) }] };
  }
  return { originalBaseline, retained, before, after, fresh: clone(after), approvedSQL: newSQL, migrationName, evidence };
}
const memoryRows = meta => meta.syntheticRows;
const verify = value => verifyM98Transition108(value, memoryRows);
function changedFunction(snapshot, change) { const fn = JSON.parse(snapshot.databases.poms_r4ghi_rust.meta.normative.functions[0]); change(fn); snapshot.databases.poms_r4ghi_rust.meta.normative.functions[0] = JSON.stringify(fn); }
test('normal forward accepts exact function/log/sequence; original objects may have real owned additions', () => {
  const f = model108(), before = clone(f); const verified = verify(f); assert.equal(verified.businessRowsUnchanged, true); assert.deepEqual(f, before);
  const derived = deriveComparisonBaseline108(f.originalBaseline, verified); assert.equal(derived.businessBaselineRebased, false);
  assert.deepEqual(derived.objects, f.originalBaseline.objects); assert.notDeepEqual(derived.objects, f.before.objects);
  for (const db of databases) for (const name of Object.keys(f.originalBaseline.databases[db].tables)) assert.deepEqual(derived.databases[db].tables[name], (name === 'poms_migrations' ? f.after : f.originalBaseline).databases[db].tables[name]);
  assert.equal(derived.databases.poms_r4ghi_rust.tables.project.syntheticRows.length, 1); assert.equal(f.after.databases.poms_r4ghi_rust.tables.project.syntheticRows.length, 2);
});
for (const [name, mutate] of [
  ['business row SHA change', f => { f.after.databases.poms_r4ghi_rust.tables.project.syntheticRows[0] = row({ id: 'original', changed: true }, '99'); }],
  ['original business xmin change', f => { f.after.databases.poms_r4ghi_native.tables.project.syntheticRows[0].xmin = '99'; }],
  ['original migration xmin change', f => { f.after.databases.poms_r4ghi_rust.tables.poms_migrations.syntheticRows[0].xmin = '99'; }],
  ['function OID replacement', f => changedFunction(f.after, fn => { fn.oid = 'replacement'; })],
  ['function ACL change', f => changedFunction(f.after, fn => { fn.acl = 'expanded'; })],
  ['function security/config change', f => changedFunction(f.after, fn => { fn.prosecdef = true; fn.proconfig = ['search_path=public']; })],
  ['unapproved function body', f => changedFunction(f.after, fn => { fn.definition = newSQL.replace('RETURN NEW', 'RETURN NULL'); })],
  ['function language/header change with correct approved body', f => { changedFunction(f.after, fn => { fn.definition = newSQL.replace('LANGUAGE plpgsql', 'LANGUAGE sql'); f.evidence.databases.poms_r4ghi_rust.afterDefinitionSHA256 = sha(fn.definition); }); }],
  ['trigger drift', f => { f.after.databases.poms_r4ghi_rust.meta.normative.triggers.push('changed'); }],
  ['role privilege drift', f => { f.after.databases.poms_r4ghi_native.meta.normative.roles.push('superuser'); }],
  ['second added migration row', f => { f.after.databases.poms_r4ghi_native.tables.poms_migrations.syntheticRows.push(row({ id: 99, name: 'extra' })); }],
  ['missing original migration row', f => { f.after.databases.poms_r4ghi_rust.tables.poms_migrations.syntheticRows.shift(); }],
  ['migration name substitution', f => { const rows = f.after.databases.poms_r4ghi_rust.tables.poms_migrations.syntheticRows; rows[97] = row({ id: 98, name: 'different', executed_at: '2026-11-08' }, '98'); }],
  ['missing sequence evidence', f => { f.evidence.databases.poms_r4ghi_rust.actualSequenceDeltas = []; }],
  ['two nextvals instead of normal one', f => { const db = 'poms_r4ghi_rust'; f.after.databases[db].meta.sequences[0].value = '99'; f.evidence.databases[db].actualSequenceDeltas[0].after.value = '99'; }],
  ['unrelated sequence registered as migration delta', f => { const db = 'poms_r4ghi_rust'; f.after.databases[db].meta.normative.columns[0] = f.after.databases[db].meta.normative.columns[0].replace('poms_migrations_id_seq', 'unrelated_seq'); }],
  ['namespace marker switch', f => { f.after.marker = 'other'; }],
  ['object drift during migration', f => { f.after.objects.poms_r4ghi_native.files.push({ key: 'new' }); }],
  ['fresh post-migration business drift', f => { f.fresh.databases.poms_r4ghi_rust.tables.project.syntheticRows.push(row({ id: 'racing' })); }],
  ['139th table excluded', f => { delete f.after.databases.poms_r4ghi_rust.tables.table136; }],
]) test('schema delta rejects ' + name, () => { const f = model108(); mutate(f); if (name !== 'fresh post-migration business drift') f.fresh = clone(f.after); assert.throws(() => verify(f)); });
test('M98 may not silently use original baseline when schema binding is absent', () => { assert.throws(() => comparisonBaselinePin108({ migrations: 98, state: { baseline: { file: 'old' } } })); assert.deepEqual(comparisonBaselinePin108({ migrations: 97, state: { baseline: { file: 'old' } } }), { file: 'old' }); });
test('all-null future plan remains non-executable rather than certifying a future Source13', () => { assert.throws(() => assertSchemaPlanShape108({ kind: 'retained-schema-consumer-admission108', schemaVersion: 3, policy: {}, producer: {}, consumer: {} })); });

// Actual FS pin/receipt verification over synthetic files. Same strict reader
// used by ledger/cleanup; all generated resources live in the test TMPDIR.
function disk108(extraProjects = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-schema108-unit-')).split(path.sep).join('/');
  const pin = (relative, value, bytesOnly = false) => { const file = dir + '/' + relative, bytes = bytesOnly ? Buffer.from(value) : Buffer.from(JSON.stringify(value)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); return { file, rawBytesSha256: sha(bytes) }; };
  const emptyPin = pin('rows/empty.jsonl', '', true);
  const materialize = (snapshot, label) => { const out = clone(snapshot); for (const db of databases) for (const [name, meta] of Object.entries(out.databases[db].tables)) { const bytes = meta.syntheticRows.map(row => JSON.stringify(row)).join('\n') + (meta.syntheticRows.length ? '\n' : ''); const filePin = meta.syntheticRows.length ? pin('rows/' + label + '/' + db + '/' + name + '.jsonl', bytes, true) : emptyPin; meta.count = meta.syntheticRows.length; delete meta.syntheticRows; Object.assign(meta, filePin); } return out; };
  const f = model108(); for (const snapshot of [f.retained, f.before, f.after, f.fresh]) for (const id of extraProjects) snapshot.databases.poms_r4ghi_rust.tables.project.syntheticRows.push(row({ id }, '12'));
  const original = materialize(f.originalBaseline, 'original'), retained = materialize(f.retained, 'retained'), before = materialize(f.before, 'before'), after = materialize(f.after, 'after'), fresh = materialize(f.fresh, 'fresh');
  const basePin = pin('business/old10/main/baseline.json', original), retainedPin = pin('retention/old12/retained.json', retained), beforePin = pin('migration/before.json', before), afterPin = pin('migration/after.json', after), freshPin = pin('business/new13/main/fresh.json', fresh);
  const approvedSQL = pin('root/approved.sql', newSQL, true), migrationSource = pin('root/' + migrationName + '.ts', 'this.addSql(' + JSON.stringify(newSQL) + ');', true);
  const commands = databases.map(database => {
    const value = { database, direction: 'up', onlyMigration: migrationName, argv: ['synthetic-never-executed'], exitCode: 0, stdout: pin('migration/' + database + '.out', '', true), stderr: pin('migration/' + database + '.err', '', true) };
    return { ...value, executionReceipt: pin('migration/' + database + '-command.json', { ...value, kind: 'actual-owned-normal-migration-command108', synthetic: true, namespace: 'poms-r4ghi', marker: 'unit-marker', host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner' }) };
  });
  const actualReceipt = pin('migration/receipt.json', { kind: 'actual-normal-forward-M98-migration-receipt108', namespace: 'poms-r4ghi', marker: 'unit-marker', normalForward: true, fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, migrationName, approvedSQL, approvedMigrationSource: migrationSource, before: beforePin, after: afterPin, databases: f.evidence.databases, commands });
  const advance = { approvedSQL, approvedMigrationSource: migrationSource, actualMigrationReceipt: actualReceipt, migrationBefore: beforePin, migrationAfter: afterPin, migrationName, databases: f.evidence.databases };
  const verified = verifyM98Transition108({ ...f, originalBaseline: original, retained, before, after, fresh }), comparison = deriveComparisonBaseline108(original, verified), comparisonPin = pin('business/new13/main/comparison.json', comparison);
  const producer = { epoch: 'old12', run: 'main', sourcePinsSHA256: sha('[]') }, producerState = pin('retention/old12/state.json', { epoch: 'old12', run: 'main', marker: 'unit-marker', baseline: basePin, sourcePins: [] }), retentionIndex = pin('retention/old12/index.json', { producerEpoch: 'old12', run: 'main', marker: 'unit-marker', frozenState: producerState, retainedSnapshot: retainedPin }), priorRegistry = pin('business/old12/main/registry.json', { marker: 'unit-marker', originalBaseline: basePin, consumer: producer });
  const receipt = { kind: 'verified-M98-schema-comparison-receipt108', schemaVersion: 1, canonicalMetadataAdvanceOnly: true, originalBusinessBaselineRebased: false, businessRowsAndXminChangedByMigration: false, migrationExecutedByThisTool: false, originalBaseline: basePin, comparisonBaseline: comparisonPin, producer, consumer: { epoch: 'new13', run: 'main', sourcePins: pin('business/new13/main/sources.json', []), sourcePinsSHA256: sha('[]'), sourceCount: 0 },
    retainedSnapshot: retainedPin, retentionIndex, producerState, priorRegistry,
    migrationBefore: beforePin, migrationAfter: afterPin, freshCurrent: freshPin, approvedSQL, actualMigrationReceipt: actualReceipt, schemaAdvance: advance, migrationName, evidence: f.evidence };
  const receiptPin = pin('business/new13/main/verification.json', receipt), binding = { kind: 'verified-schema-comparison-binding108', schemaVersion: 1, fromMigrations: 97, toMigrations: 98, originalBaseline: basePin, comparisonBaseline: comparisonPin, verificationReceipt: receiptPin };
  return { dir, pin, receipt, binding, comparison, actualReceipt, ctx: { namespace: 'poms-r4ghi', private: dir, priv: dir + '/business/new13/main', win: dir + '/root', migrations: 98, state: { marker: 'unit-marker', baseline: basePin, schemaComparison108: binding } } };
}
function close108(dir) { const actual = fs.realpathSync(dir), root = fs.realpathSync(os.tmpdir()); assert.equal(path.dirname(actual), root); assert(path.basename(actual).startsWith('poms-schema108-unit-')); fs.rmSync(actual, { recursive: true }); }
test('read-only binding reproduces exact derived comparison and keeps original baseline separate', () => {
  const f = disk108(); try { const verdict = verifySchemaBinding108(f.ctx, f.binding); assert.equal(verdict.baseline.kind, 'derived-schema-comparison-baseline108'); assert.deepEqual(comparisonBaselinePin108(f.ctx), f.binding.comparisonBaseline); assert.notDeepEqual(f.ctx.state.baseline, f.binding.comparisonBaseline); } finally { close108(f.dir); }
});
test('derived comparison cannot launder all retained business rows into original', () => {
  const f = disk108(); try { const current = JSON.parse(fs.readFileSync(f.receipt.freshCurrent.file)); f.comparison.databases.poms_r4ghi_rust.tables.project = current.databases.poms_r4ghi_rust.tables.project;
    const replacement = f.pin('business/new13/main/forged-comparison.json', f.comparison); f.binding.comparisonBaseline = replacement; f.receipt.comparisonBaseline = replacement; f.binding.verificationReceipt = f.pin('business/new13/main/forged-verification.json', f.receipt); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding)); } finally { close108(f.dir); }
});
test('only real zero-exit migration receipt may explain canonical advancement', () => {
  const f = disk108(); try { const bad = JSON.parse(fs.readFileSync(f.actualReceipt.file)); bad.commands[1].exitCode = 1; const replacement = f.pin('migration/failed.json', bad); f.receipt.schemaAdvance.actualMigrationReceipt = replacement; f.receipt.actualMigrationReceipt = replacement; f.binding.verificationReceipt = f.pin('business/new13/main/failed-verification.json', f.receipt); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding)); } finally { close108(f.dir); }
});
test('matching new consumer baseline fields cannot override the frozen producer original baseline pin', () => {
  const f = disk108(); try {
    f.binding.originalBaseline = f.receipt.migrationBefore; f.receipt.originalBaseline = f.receipt.migrationBefore; f.ctx.state.baseline = f.receipt.migrationBefore;
    f.binding.verificationReceipt = f.pin('business/new13/main/rebased-verification.json', f.receipt);
    assert.throws(() => verifySchemaBinding108(f.ctx, f.binding), /frozen producer original M97/);
  } finally { close108(f.dir); }
});
test('wrapper success cannot replace a different exit code in the real execution receipt pin', () => {
  const f = disk108(); try {
    const receipt = JSON.parse(fs.readFileSync(f.actualReceipt.file)), command = receipt.commands[0], execution = JSON.parse(fs.readFileSync(command.executionReceipt.file)); execution.exitCode = 1;
    command.executionReceipt = f.pin('migration/actual-failed-command.json', execution); const replaced = f.pin('migration/false-wrapper-success.json', receipt);
    f.receipt.actualMigrationReceipt = replaced; f.receipt.schemaAdvance.actualMigrationReceipt = replaced; f.binding.verificationReceipt = f.pin('business/new13/main/false-wrapper-verification.json', f.receipt);
    assert.throws(() => verifySchemaBinding108(f.ctx, f.binding));
  } finally { close108(f.dir); }
});
test('ledger sees canonical M98 in both databases but still requires each HTTP-owned business/object addition', () => {
  const f = disk108(); try {
    const current = JSON.parse(fs.readFileSync(f.receipt.freshCurrent.file)), owned = current.databases.poms_r4ghi_rust.tables.project;
    const project = fs.readFileSync(owned.file, 'utf8').trim().split('\n').map(line => JSON.parse(line)).find(row => row.key[0] === 'owned-http-project');
    Object.assign(f.ctx, { databases, database: 'poms_r4ghi_rust' });
    f.ctx.state.owned = { [JSON.stringify(['poms_r4ghi_rust', 'project', project.key])]: { table: 'project', database: 'poms_r4ghi_rust', key: project.key, latestSha256: project.sha256, latestXmin: project.xmin } };
    f.ctx.state.objects = { [JSON.stringify(['poms_r4ghi_rust', 'object', ['owned-object']])]: { database: 'poms_r4ghi_rust', key: 'owned-object', latestSha256: sha('owned') } };
    f.ctx.state.borrowed = {}; assertRecorded(f.ctx, current);
    assert.equal(loadSnapshot(f.ctx).databases.poms_r4ghi_native.tables.poms_migrations.count, 97);
    assert.equal(loadComparisonSnapshot108(f.ctx).databases.poms_r4ghi_native.tables.poms_migrations.count, 98);
    const changes = difference(loadComparisonSnapshot108(f.ctx), current); assert.equal(changes.length, 1); assert.equal(changes[0].table, 'project');
    const projectOwned = f.ctx.state.owned; f.ctx.state.owned = {}; assert.throws(() => assertRecorded(f.ctx, current)); f.ctx.state.owned = projectOwned;
    const extra = row({ id: 99, name: 'unapproved-extra' }, '99'), meta = current.databases.poms_r4ghi_rust.tables.poms_migrations;
    Object.assign(meta, f.pin('observed-extra-migration.jsonl', fs.readFileSync(meta.file, 'utf8') + JSON.stringify(extra) + '\n', true), { count: 99 });
    f.ctx.state.owned[JSON.stringify(['poms_r4ghi_rust', 'poms_migrations', extra.key])] = { database: 'poms_r4ghi_rust', table: 'poms_migrations', key: extra.key, latestSha256: extra.sha256, latestXmin: extra.xmin };
    assert.throws(() => assertRecorded(f.ctx, current), 'A generic owned entry cannot grant migration registration authority');
  } finally { close108(f.dir); }
});

test('schema3 preserves mixed10/11/12 births, late published receipts and exact legacy/UI projections', () => {
  const f = disk108(['legacy-project', 'cent11-project', 'own12-project']);
  try {
    const db = 'poms_r4ghi_rust', read = pin => JSON.parse(fs.readFileSync(pin.file)), retained12 = read(f.receipt.retainedSnapshot);
    const rows = fs.readFileSync(retained12.databases[db].tables.project.file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const pins = epoch => [{ file: 'synthetic-' + epoch, sha256: sha(epoch) }], p10 = pins('old10'), p11 = pins('old11'), p12 = pins('old12');
    const snapshot = (epoch, ids, label) => {
      const value = clone(retained12); value.epoch = epoch; value.run = 'main'; const values = rows.filter(row => row.key[0] === 'original' || ids.includes(row.key[0]));
      const raw = values.map(row => JSON.stringify(row)).join('\n') + '\n', tablePin = f.pin('business/' + epoch + '/main/' + label + '-rows.jsonl', raw, true);
      Object.assign(value.databases[db].tables.project, tablePin, { count: values.length }); return f.pin('retention/' + epoch + '/' + label + '.json', value);
    };
    const owned = (id, proof = undefined) => { const row = rows.find(row => row.key[0] === id); return { database: db, table: 'project', key: row.key, firstSha256: row.sha256, latestSha256: row.sha256, latestXmin: row.xmin, ...(proof ? { proof } : {}) }; };
    const birth = (epoch, beforeIds, afterIds) => {
      const move = (pin, label) => f.pin('business/' + epoch + '/main/' + label + '.json', read(pin));
      return { transport: 'HTTP', status: 201, responseComplete: true, beforeAbsent: true, beforeSnapshot: move(snapshot(epoch, beforeIds, 'birth-before'), 'birth-before'), afterSnapshot: move(snapshot(epoch, afterIds, 'birth-after'), 'birth-after') };
    };
    const entry = (registryPath, record, id, mode = 'immutable-ui-producer') => ({ registryPath, mode, projectIds: [id], producerRecordSHA256: sha(JSON.stringify(record)), producerProjectionSHA256: sha(JSON.stringify(producerProjection54(record))),
      identity: ['sourcePinsSHA256', 'projectId'].filter(key => record[key] !== undefined).map(key => ({ path: '/' + key, value: record[key] })), receipts: record.receipt ? [record.receipt] : [] });
    const eo = { sourcePinsSHA256: sha(JSON.stringify(p10)), fixtures: { project: { id: 'owned-http-project' } }, UICommandObserved: false };
    const legacy = { projectId: 'legacy-project', counted32Producer: false, rowSHA256: 'legacy-real-projection', xmin: '12', receipt: f.pin('business/old10/main/legacy.json', { synthetic: true }) };
    const max = { sourcePinsSHA256: sha(JSON.stringify(p10)), fixtures: { project: { id: 'owned-http-project' } } };
    const state10 = { epoch: 'old10', run: 'main', marker: 'unit-marker', sourcePins: p10, baseline: f.binding.originalBaseline, owned: { a: owned('owned-http-project'), legacy: owned('legacy-project') }, fixtures: { uiFixtureViews23: { eo }, legacyCompatibilityFixture: legacy, a05Boundaries26: { views: { 'max-zero': max } } } };
    const statePin10 = f.pin('retention/old10/state.json', state10), snapshot10 = snapshot('old10', ['owned-http-project', 'legacy-project'], 'retained');
    const entries10 = [entry('/fixtures/uiFixtureViews23/eo', eo, 'owned-http-project'), entry('/fixtures/legacyCompatibilityFixture', legacy, 'legacy-project', 'legacy-compatibility'), entry('/fixtures/a05Boundaries26/views/max-zero', max, 'owned-http-project', 'continuable-project-producer')];
    const index = (epoch, statePin, retained) => f.pin('retention/' + epoch + '/index.json', { producerEpoch: epoch, run: 'main', marker: 'unit-marker', frozenState: statePin, retainedSnapshot: retained });
    const consumer = (epoch, sourcePins) => ({ epoch, run: 'main', sourcePinsSHA256: sha(JSON.stringify(sourcePins)), sourceCount: sourcePins.length, sourcePins: f.pin('business/' + epoch + '/main/sources.json', sourcePins) });
    const source = (epoch, sourcePins) => ({ epoch, run: 'main', sourcePinsSHA256: sha(JSON.stringify(sourcePins)), sourceCount: sourcePins.length });
    const registry11 = { schemaVersion: 1, kind: 'verified-retained-data-consumer-registry54', namespace: 'poms-r4ghi', marker: 'unit-marker', producer: source('old10', p10), consumer: consumer('old11', p11), producerState: statePin10, retainedSnapshot: snapshot10, retentionIndex: index('old10', statePin10, snapshot10), originalBaseline: f.binding.originalBaseline, fixtureAdmissions: entries10 };
    const registry11Pin = f.pin('business/old11/main/registry.json', registry11);
    const published = (name, projectId) => f.pin('business/old11/main/' + name + '-published.json', { actualPublishedSnapshot: true, stored: [{ frozen_payload: { projectId, snapshot: { id: name + '-snapshot' } } }] });
    const maxPublished = published('max-zero', 'owned-http-project'), centPublished = published('cent-max', 'cent11-project');
    const publish = (record, pin, name) => ({ ...clone(record), fixtures: { ...record.fixtures, a05SnapshotHTTP: { proof: pin, proofPending: false } }, result: { published: { snapshotId: name + '-snapshot', proof: pin } } });
    const max11 = publish(max, maxPublished, 'max-zero'), cent11 = publish({ sourcePinsSHA256: sha(JSON.stringify(p11)), fixtures: { project: { id: 'cent11-project' } } }, centPublished, 'cent-max');
    const state11 = { ...clone(state10), epoch: 'old11', sourcePins: p11, consumerAdmission54: { registry: registry11Pin }, owned: { ...state10.owned, cent: owned('cent11-project', birth('old11', ['owned-http-project', 'legacy-project'], ['owned-http-project', 'legacy-project', 'cent11-project'])) } };
    state11.fixtures.a05Boundaries26.views = { 'max-zero': max11, 'cent-max': cent11 };
    const statePin11 = f.pin('retention/old11/state.json', state11), snapshot11 = snapshot('old11', ['owned-http-project', 'legacy-project', 'cent11-project'], 'retained');
    const impact = (producer, consumer) => f.pin('business/' + consumer.epoch + '/main/impact.json', { kind: 'approved-retained-evidence-impact-review62', producerEpoch: producer.epoch, consumerEpoch: consumer.epoch, producerSourcePinsSHA256: producer.sourcePinsSHA256, consumerSourcePinsSHA256: consumer.sourcePinsSHA256,
      retainHistoricalLabels: true, currentConsumerCertificationGranted: false, reviewer: 'synthetic-unit-only', sourceComparisonReceipt: f.pin('business/' + consumer.epoch + '/main/impact-source-comparison.json', { synthetic: true }), evidenceGroups: [{ producerEpoch: producer.epoch, use: 'historical-by-impact-review', certifiesCurrentConsumerExecution: false, receipt: f.pin('business/' + producer.epoch + '/main/historical.json', { synthetic: true }) }] });
    const c12 = consumer('old12', p12), impact12 = impact(source('old11', p11), c12); c12.impactReview = impact12;
    const registry12 = { schemaVersion: 2, kind: registry11.kind, namespace: 'poms-r4ghi', marker: 'unit-marker', producer: source('old11', p11), consumer: c12, producerState: statePin11, retainedSnapshot: snapshot11, retentionIndex: index('old11', statePin11, snapshot11), priorRegistry: registry11Pin, originalBaseline: f.binding.originalBaseline, impactReview: impact12 };
    const oldCtx = { private: f.dir, win: f.dir + '/root', namespace: 'poms-r4ghi', database: db, state: { marker: 'unit-marker' } };
    const centEntry = entry('/fixtures/a05Boundaries26/views/cent-max', cent11, 'cent11-project', 'continuable-project-producer');
    const chained12 = makeChainedAdmissions62(oldCtx, registry12, [...entries10, centEntry]); Object.assign(registry12, { fixtureAdmissions: chained12.entries, sourceHistory: chained12.sources });
    const registry12Pin = f.pin('business/old12/main/registry.json', registry12), own12 = { sourcePinsSHA256: sha(JSON.stringify(p12)), fixtures: { project: { id: 'own12-project' } }, UICommandObserved: false };
    const state12 = { ...clone(state11), epoch: 'old12', sourcePins: p12, consumerAdmission54: { registry: registry12Pin }, owned: { ...state11.owned, own: owned('own12-project', birth('old12', ['owned-http-project', 'legacy-project', 'cent11-project'], ['owned-http-project', 'legacy-project', 'cent11-project', 'own12-project'])) } }; state12.fixtures.uiFixtureViews23.own = own12;
    const statePin12 = f.pin('retention/old12/state.json', state12), index12 = index('old12', statePin12, f.receipt.retainedSnapshot);
    const p13 = [{ file: 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md', sha256: sha('54') }, { file: 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md', sha256: sha('61') }], c13 = consumer('new13', p13), impact13 = impact(source('old12', p12), c13); c13.impactReview = impact13;
    const process = { namespace: 'poms-r4ghi', root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: sha('synthetic-process') }, processPin = f.pin('business/new13/main/process.json', process); c13.apiProcess = processPin; c13.binarySHA256 = process.binarySha256;
    Object.assign(f.receipt, { producer: source('old12', p12), consumer: c13, producerState: statePin12, retentionIndex: index12, priorRegistry: registry12Pin }); f.binding.verificationReceipt = f.pin('business/new13/main/verification3.json', f.receipt);
    const state13 = { ...clone(state12), epoch: 'new13', sourcePins: p13, schemaComparison108: f.binding, apiProcess: { ...processPin, record: process } };
    Object.assign(f.ctx, { namespace: 'poms-r4ghi', epoch: 'new13', run: 'main', pins: p13, database: db, state: state13 });
    const registry13 = { schemaVersion: 3, kind: registry11.kind, namespace: 'poms-r4ghi', marker: 'unit-marker', producer: source('old12', p12), consumer: c13, producerState: statePin12, retentionIndex: index12, retainedSnapshot: f.receipt.retainedSnapshot,
      priorRegistry: registry12Pin, impactReview: impact13, originalBaseline: f.binding.originalBaseline, schemaComparison108: f.binding, freshSchemaAdvancedSnapshot: f.receipt.freshCurrent, retainedSnapshotEquivalent: false, schemaAdvanceOnly: true };
    const ownEntry = entry('/fixtures/uiFixtureViews23/own', own12, 'own12-project'), chained13 = makeChainedAdmissions62(f.ctx, registry13, [...registry12.fixtureAdmissions, ownEntry]); Object.assign(registry13, { sourceHistory: chained13.sources, fixtureAdmissions: chained13.entries });
    validateRegistryLineage62(f.ctx, registry13); state13.consumerAdmission54 = { registry: f.pin('business/new13/main/registry.json', registry13) };
    assert.deepEqual(registry13.fixtureAdmissions.map(entry => entrySource62(registry13, entry).epoch), ['old10', 'old10', 'old10', 'old11', 'old12']);
    assert.equal(registry13.sourceHistory.length, 3); const maxEntry = registry13.fixtureAdmissions[2]; assert.equal(maxEntry.receiptProvenance.find(item => item.pin.file === maxPublished.file).source.epoch, 'old11');
    const record = state13.fixtures.uiFixtureViews23.eo; record.UICommandObserved = true;
    const verdict = assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record, projectIds: ['owned-http-project'] }); assert.equal(verdict.producerEpoch, 'old10'); assert.equal(verdict.consumerEpoch, 'new13'); assert.equal(verdict.retainedAtEpoch, 'old12');
    state13.fixtures.legacyCompatibilityFixture.counted32Producer = true; assert.throws(() => assertAdmittedFixtureSource(f.ctx, { registryPath: '/fixtures/legacyCompatibilityFixture', record: state13.fixtures.legacyCompatibilityFixture, projectIds: ['legacy-project'], producerReceipt: legacy.receipt }));
  } finally { close108(f.dir); }
});
