// Real pure exports, I-owned 278 table-row fixtures and explicit client/FS
// doubles only. Never connect, call capture121/observe121 or read actual objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.platform === 'win32'
  ? 'E:/projects/worktrees/poms-r3hijk-next28/poms'
  : '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const folder = root + '/tools/rust-r4ghi/runtime-recovery121/root';
const file = folder + '/facts121.mjs';
assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  '6f81a1cd71f2ced84e0cb5190e18fd5ef86d2f1a4dfad0dee42110c832748382');
const f = await import(pathToFileURL(file).href);
const observerFile = folder + '/observe-conservation121.mjs';
const observerSource = fs.readFileSync(observerFile);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(observerSource),
  'adcbfd9d07ef5d98a5675cd3b15adc54771c787bba6ef585e20973e9ad30c7ca',
  'Bind actual new observer source explicitly if Root changes it');
const o = await import(pathToFileURL(observerFile).href);
const clone = value => structuredClone(value);
const dir = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.readonly121-fixtures-'));
const linux = process.platform === 'win32'
  ? '/mnt/' + dir[0].toLowerCase() + '/' + dir.slice(3).replaceAll('\\', '/')
  : dir;
let nextFile = 0;

function row(id, value = 'unit', xmin = '51') {
  const raw = JSON.stringify({ id, value });
  return { key: [id], cells: { id }, raw, sha256: hash(raw), xmin };
}
function descriptor(rows, basename) {
  const bytes = Buffer.from(rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  const pin = f.writeWx(linux, basename ?? 'changed-' + (++nextFile) + '.jsonl', bytes);
  return { file: pin.file, count: rows.length, pk: ['id'], columns: ['id', 'value'],
    rawBytesSha256: pin.rawBytesSha256, logicalRowsSha256: hash(rows.map(r => r.raw).join('\n')) };
}
const snapshot = { marker: f.C.marker, databases: {}, objects: {} };
for (const [index, database] of f.C.databases.entries()) {
  const tables = {};
  for (let i = 0; i < 139; i++) {
    const name = 'table_' + String(i).padStart(3, '0');
    const rows = i === 0
      ? [row(database + '-own'), row(database + '-peer', 'peer source')]
      : [row(database + '-' + i)];
    tables[name] = descriptor(rows, database + '-' + name + '.jsonl');
  }
  snapshot.databases[database] = {
    meta: { tables: Object.keys(tables), foreignKeys: [{ name: 'fk_unit', child: 'table_001',
      parent: 'table_000', childColumns: ['id'], parentColumns: ['id'] }],
    externalForeignKeys: [], normative: { relations: ['{"unit":true}'], roles: ['{"owner":"unit"}'] },
    sequences: [{ schema: 'poms', name: 'unit_seq', oid: String(100 + index),
      value: '7', is_called: true }] }, tables,
  };
  snapshot.objects[database] = { root: '/unit/objects/' + database, existed: true,
    files: [{ key: 'unit.bin', file: '/unit/objects/' + database + '/unit.bin',
      bytes: 4, sha256: hash('unit') }], directories: [''] };
}
const database = f.C.databases[0], tableName = 'table_000';

test('actual pure snapshot comparison reads every one of 278 synthetic table files', () => {
  const result = o.equalSnapshots121(snapshot, clone(snapshot));
  assert.deepEqual(result.counts, Object.fromEntries(f.C.databases.map(d => [d, 140])));
  assert.equal(result.tablesPerDB, 139);
  assert.equal(result.allRawXminMetaSequencesObjectsEqual, true);
  assert.equal(result.crossDatabaseAtomicityClaimed, false);
});

test('actual snapshot comparison rejects missing/extra database or table inventory and marker', () => {
  for (const mutate of [
    s => { s.marker = 'foreign-marker'; },
    s => { delete s.databases[f.C.databases[1]]; },
    s => { s.databases.other = clone(s.databases[database]); },
    s => { delete s.databases[database].tables.table_138; },
    s => { s.databases[database].tables.extra = clone(s.databases[database].tables.table_138); },
  ]) {
    const s = clone(snapshot); mutate(s);
    assert.throws(() => o.equalSnapshots121(snapshot, s));
  }
});

test('actual snapshot comparison rejects every table descriptor component, meta and sequences', () => {
  for (const key of ['count', 'pk', 'columns', 'rawBytesSha256', 'logicalRowsSha256']) {
    const s = clone(snapshot), t = s.databases[database].tables[tableName];
    t[key] = key === 'count' ? t.count + 1 : Array.isArray(t[key])
      ? [...t[key], 'changed'] : 'd'.repeat(64);
    assert.throws(() => o.equalSnapshots121(snapshot, s), key);
  }
  for (const mutate of [
    s => { s.databases[database].meta.normative.roles.push('{"extra":true}'); },
    s => { s.databases[database].meta.sequences[0].value = '8'; },
    s => { s.databases[database].meta.foreignKeys[0].childColumns = ['changed']; },
  ]) {
    const s = clone(snapshot); mutate(s);
    assert.throws(() => o.equalSnapshots121(snapshot, s));
  }
});

test('actual checkedRows rejects internally invalid raw/hash/xmin/key/cells/count/logical files', () => {
  for (const mutate of [
    rows => { rows[0].sha256 = 'f'.repeat(64); },
    rows => { rows[0].xmin = 'not-an-xmin'; },
    rows => { rows[0].key = 'wrong-key'; },
    rows => { rows[0].cells = null; },
  ]) {
    const rows = [row('checked-row')]; mutate(rows);
    assert.throws(() => o.checkedRows121(descriptor(rows)));
  }
  const d = descriptor([row('checked-valid')]);
  assert.equal(o.checkedRows121(d).rows.length, 1);
  assert.throws(() => o.checkedRows121({ ...d, count: 2 }));
  assert.throws(() => o.checkedRows121({ ...d, logicalRowsSha256: 'e'.repeat(64) }));
});

test('actual comparator rejects raw, xmin, cells or peer loss even with unchanged aggregate count', () => {
  const originalRows = o.checkedRows121(snapshot.databases[database].tables[tableName]).rows;
  for (const mutate of [
    rows => { rows[0] = row(rows[0].key[0], 'changed same count'); },
    rows => { rows[0].xmin = '52'; },
    rows => { rows[0].cells.id = 'changed-cell'; },
    rows => { rows[1] = row('foreign-replacement-peer', 'same number of rows'); },
  ]) {
    const rows = clone(originalRows); mutate(rows);
    const changed = descriptor(rows), s = clone(snapshot);
    // Keep every authoritative original descriptor hash, changing only file:
    // the actual bytes must be read and cannot be trusted from supplied counts.
    s.databases[database].tables[tableName].file = changed.file;
    assert.throws(() => o.equalSnapshots121(snapshot, s));
  }
});

test('actual comparator rejects object bytes/hash/shape/directory differences', () => {
  for (const mutate of [
    s => { s.objects[database].files[0].sha256 = 'f'.repeat(64); },
    s => { s.objects[database].files[0].bytes += 1; },
    s => { s.objects[database].files = []; },
    s => { s.objects[database].directories.push('extra'); },
    s => { s.objects[database].existed = false; },
  ]) {
    const s = clone(snapshot); mutate(s); assert.throws(() => o.equalSnapshots121(snapshot, s));
  }
});

function client(overrides = {}) {
  const calls = [], physical = { db: database, usr: 'poms_r0e_owner', port: '15432',
    version: '150012', isolated: 'on', timezone: 'Etc/GMT-8', oid: f.C.oids[0],
    ...overrides.physical };
  return { calls, async query(sql) {
    calls.push(sql);
    if (sql === 'SHOW default_transaction_read_only')
      return { rows: [{ default_transaction_read_only: overrides.defaultRO ?? 'on' }] };
    if (sql === 'SHOW transaction_read_only')
      return { rows: [{ transaction_read_only: overrides.transactionRO ?? 'on' }] };
    if (sql.startsWith('SELECT current_database()')) return { rows: [physical] };
    if (sql === 'SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker')
      return { rows: [{ instance_id: overrides.marker ?? f.C.marker,
        namespace: f.C.namespace, source_base: f.C.base }] };
    if (sql === 'SELECT count(*)::int count FROM poms.poms_migrations')
      return { rows: [{ count: overrides.migrations ?? 98 }] };
    throw Error('Unapproved query reached the explicit readonly client double: ' + sql);
  } };
}

test('actual guardClient uses only explicit SHOW/SELECT and requires both RO settings (client double)', async () => {
  const c = client(); await o.guardClient121(c, database);
  assert.equal(c.calls.length, 5);
  assert(c.calls.every(sql => /^(SHOW|SELECT) /.test(sql)));
  await assert.rejects(o.guardClient121(client({ defaultRO: 'off' }), database));
  await assert.rejects(o.guardClient121(client({ transactionRO: 'off' }), database));
});

test('actual guardClient rejects each physical identity/OID/marker/migration mismatch (client double)', async () => {
  for (const key of ['db', 'usr', 'port', 'version', 'isolated', 'timezone', 'oid'])
    await assert.rejects(o.guardClient121(client({ physical: { [key]: 'wrong' } }), database));
  await assert.rejects(o.guardClient121(client({ marker: 'other' }), database));
  await assert.rejects(o.guardClient121(client({ migrations: 99 }), database));
  await assert.rejects(o.guardClient121(client(), 'foreign_database'));
});

test('actual catalog export enforces139 and all catalog queries remain SELECT (client double)', async () => {
  function catalogClient(count) {
    const calls = [];
    return { calls, async query(sql) {
      calls.push(sql); assert(sql.startsWith('SELECT '), 'Catalog must not execute DML/DDL');
      if (sql.startsWith('SELECT c.relname name'))
        return { rows: Array.from({ length: count }, (_, i) => ({
          name: 't_' + i, oid: String(i), pk: ['id'], columns: ['id'] })) };
      if (sql.startsWith('SELECT row_to_json(x)::text raw')) return { rows: [{ raw: '{"unit":true}' }] };
      if (sql.startsWith('SELECT n.nspname schema')) return { rows: [] };
      if (sql.startsWith('SELECT x.conname name') || sql.startsWith('SELECT x.oid::text oid'))
        return { rows: [] };
      throw Error('Unexpected catalog query');
    } };
  }
  const c = catalogClient(139), result = await o.catalog121(c, 139);
  assert.equal(result.tables.length, 139);
  assert.deepEqual(Object.keys(result.normative), [
    'relations', 'schemas', 'columns', 'constraints', 'indexes', 'triggers',
    'functions', 'roles', 'memberships',
  ]);
  assert(c.calls.every(sql => sql.startsWith('SELECT ')));
  await assert.rejects(o.catalog121(catalogClient(138), 139));
  await assert.rejects(o.catalog121(catalogClient(140), 139));
});

test('actual capture source fixes defaultRO and REPEATABLE READ READ ONLY, rollback/end and complete row bytes', () => {
  const s = observerSource.toString();
  const begin = s.indexOf("await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')");
  assert(begin > 0 && s.indexOf('await guardClient121(c,database)', begin) > begin);
  assert.match(s, /options:'-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000'/);
  assert.match(s, /row_to_json\(t\)::text raw,t\.xmin::text xmin/);
  assert.match(s, /pk:t\.pk,columns:t\.columns,rawBytesSha256:pin\.rawBytesSha256/);
  assert.match(s, /await c\.query\('COMMIT'\)/);
  assert.match(s, /await c\.query\('ROLLBACK'\)\.catch\(\(\)=>\{\}\);throw e;\}finally\{await c\.end\(\);\}/);
  assert.match(s, /capture121\(Client,p,'observation01'\)/);
  assert.match(s, /capture121\(Client,p,'observation02'\)/);
  assert.match(s, /equalSnapshots121\(a\.snapshot,b\.snapshot\)/);
});

test('actual observer source binds predecessor holder/boot and inspects same container before and after', () => {
  const s = observerSource.toString();
  assert.match(s, /samePin\(pg\.holder,p\.holder\)/);
  assert.match(s, /assert\.equal\(pg\.bootId,holder\.bootId\)/);
  const matches = [...s.matchAll(/assert\.deepEqual\(inspectOriginalPG121\(\),pg\.after\)/g)];
  assert.equal(matches.length, 2);
  const firstCapture = s.indexOf("capture121(Client,p,'observation01')");
  const secondCapture = s.indexOf("capture121(Client,p,'observation02')");
  assert(matches[0].index < firstCapture && matches[1].index > secondCapture);
  assert.match(s, /assert\.equal\(pg\.after\.id,C\.container\)/);
  assert.match(s, /assert\.equal\(pg\.after\.image,C\.image\)/);
  assert.match(s, /assert\.equal\(pg\.after\.volumeSource,C\.volumeRoot\)/);
});

test('actual objects span rejects symlink/hardlink and hashes full object bytes (explicit in-memory FS double)', () => {
  function run(kind) {
    const objectRoot = '/unit/objects/native', data = Buffer.from('unit object bytes');
    const dependencies = {
      assert, C: { private: '/unit/private', databases: [...f.C.databases] },
      path: path.posix, sha: hash,
      fs: {
        existsSync: () => kind !== 'absent',
        realpathSync: x => kind === 'alias' ? '/unit/foreign' : x,
        lstatSync: x => ({
          isDirectory: () => x === objectRoot,
          isSymbolicLink: () => kind === 'symlink',
          isFile: () => x !== objectRoot,
          nlink: kind === 'hardlink' ? 2 : 1,
        }),
        readdirSync: () => [{ name: 'file.bin' }],
        readFileSync: x => { assert.equal(x, objectRoot + '/file.bin'); return data; },
      },
    };
    const keys = Object.keys(dependencies);
    const fn = vm.compileFunction('return (' + o.objects121.toString() + ')', keys)(
      ...keys.map(k => dependencies[k]));
    return fn(database);
  }
  const good = run('regular');
  assert.equal(good.files[0].sha256, hash('unit object bytes'));
  assert.equal(good.files[0].bytes, Buffer.byteLength('unit object bytes'));
  assert.equal(run('absent').existed, false);
  for (const kind of ['alias', 'symlink', 'hardlink'])
    assert.throws(() => run(kind), kind);
});

test('actual pure pg-observe review grants readonly only and no service/business/API writes', () => {
  const input = { mode: 'pg-observe', nonce: 'unit-nonce',
    G1: { file: '/unit/g1', rawBytesSha256: 'a'.repeat(64) },
    codeReview: { file: '/unit/review', rawBytesSha256: 'b'.repeat(64) } };
  const review = f.reviewBody(input, { file: '/unit/input', rawBytesSha256: 'c'.repeat(64) });
  assert.equal(review.readonlyPG, true);
  assert.equal(review.processControl, false);
  assert.equal(review.APIStart, false);
  assert.equal(review.businessDML, false);
  assert.equal(review.createReplaceRestoreMigrate, false);
});

