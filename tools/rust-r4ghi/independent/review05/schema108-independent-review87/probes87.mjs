// Independent synthetic FS/policy probes. No DB, HTTP, migration or product I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/schema-admission108';
const out = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const inputs = [];
function read(f, expected) { const b = fs.readFileSync(f); const hash = sha(b); if (expected) assert.equal(hash, expected, f); inputs.push({ file: f, rawBytesSha256: hash, bytes: b.length }); return b; }
const manifest = JSON.parse(read(author + '/manifest108.json', '8943e0ac1fcabe40cee6171862cb6d2fca65186c78bf01784e61c75f372cba96'));
for (const c of manifest.candidates) { assert.equal(read(author + '/' + c.candidate, c.afterSHA256).length, c.bytes); if (c.before) { read(author + '/' + c.before, c.beforeSHA256); read(root + '/' + c.target, c.beforeSHA256); } else assert(!fs.existsSync(root + '/' + c.target)); }
for (const c of manifest.sidecars) assert.equal(read(author + '/' + c.file, c.rawBytesSha256).length, c.bytes);
for (const c of manifest.unchangedRootDependencies) read(root + '/' + c.path, c.sha256);
for (const c of manifest.designInputs) read(root + '/' + c.file, c.sha256);
const policy = await import(pathToFileURL(author + '/proposed/tools/rust-r4ghi/business/schema-comparison108.mjs'));
const dbs = ['poms_r4ghi_native', 'poms_r4ghi_rust'];
const oldSQL = 'CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN RETURN OLD; END;\n$$;';
const newSQL = oldSQL.replace('RETURN OLD', 'RETURN NEW');
const migrationName = 'Migration20990101000000_independent_synthetic87';
const row = (value, xmin = '1') => { const raw = JSON.stringify(value); return { key: [String(value.id)], cells: { id: String(value.id) }, raw, sha256: sha(raw), xmin }; };
const names = ['poms_migrations', 'project', ...Array.from({ length: 137 }, (_, i) => 'table' + String(i).padStart(3, '0'))].sort();
const model = () => {
  const tables = Object.fromEntries(names.map(name => [name, { file: '/synthetic-only/' + name, rawBytesSha256: sha(''), rows: [], count: 0, pk: ['id'], columns: ['id'] }]));
  tables.project.rows.push(row({ id: 'original-business-row' }));
  tables.poms_migrations.rows = Array.from({ length: 97 }, (_, i) => row({ id: i + 1, name: 'Migration' + (i + 1), executed_at: '2026-11-01T00:00:00+08:00' }));
  const meta = { tables: names.map(name => ({ name, oid: name, pk: ['id'], columns: ['id'] })), foreignKeys: [], externalForeignKeys: [], normative: {
    functions: [JSON.stringify({ oid: '111', schema: 'poms', proname: 'jghi_assignment_participant_guard', arguments: '', owner: 'owner', acl: null, prosecdef: false, proconfig: null, definition: oldSQL })],
    columns: [JSON.stringify({ schema: 'poms', table_name: 'poms_migrations', attname: 'id', default_expr: "nextval('poms.poms_migrations_id_seq'::regclass)" })],
    triggers: [], constraints: [], roles: [], memberships: [], relations: [], schemas: [], indexes: [] }, sequences: [{ schema: 'poms', name: 'poms_migrations_id_seq', oid: '222', value: '97', is_called: true }] };
  const originalBaseline = { marker: 'synthetic-review87-only', epoch: 'old10', run: 'main', databases: Object.fromEntries(dbs.map(db => [db, { meta: structuredClone(meta), tables: structuredClone(tables) }])), objects: Object.fromEntries(dbs.map(db => [db, { directories: [], files: [] }])) };
  const retained = structuredClone(originalBaseline); retained.epoch = 'old12'; retained.databases.poms_r4ghi_rust.tables.project.rows.push(row({ id: 'real-shaped-owned-unit-fixture' }, '12'));
  retained.objects.poms_r4ghi_rust.files.push({ key: 'synthetic-owned-object', sha256: sha('owned') });
  const before = structuredClone(retained), after = structuredClone(before), evidence = { kind: 'exact-owned-forward-schema-advance108', fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, databases: {} };
  for (const db of dbs) { const a = before.databases[db], b = after.databases[db], fn = JSON.parse(b.meta.normative.functions[0]); fn.definition = newSQL; b.meta.normative.functions[0] = JSON.stringify(fn); b.meta.sequences[0].value = '98'; const added = row({ id: 98, name: migrationName, executed_at: '2026-11-08T00:00:00+08:00' }, '98'); b.tables.poms_migrations.rows.push(added);
    evidence.databases[db] = { functionOID: '111', beforeDefinitionSHA256: sha(oldSQL), afterDefinitionSHA256: sha(newSQL), afterBodySHA256: sha(policy.plBody108(newSQL)), migrationRow: { key: added.key, rowSHA256: added.sha256, xmin: added.xmin, name: migrationName }, actualSequenceDeltas: [{ before: structuredClone(a.meta.sequences[0]), after: structuredClone(b.meta.sequences[0]) }] }; }
  return { originalBaseline, retained, before, after, fresh: structuredClone(after), approvedSQL: newSQL, migrationName, evidence };
};
const memoryRows = meta => meta.rows;
const f = model(), verified = policy.verifyM98Transition108(f, memoryRows), derived = policy.deriveComparisonBaseline108(f.originalBaseline, verified);
for (const db of dbs) { for (const name of names.filter(n => n !== 'poms_migrations')) assert.deepEqual(derived.databases[db].tables[name], f.originalBaseline.databases[db].tables[name]); assert.equal(derived.databases[db].tables.poms_migrations.rows.length, 98); }
assert.deepEqual(derived.objects, f.originalBaseline.objects);
const rejected = [];
for (const [name, mutate] of [
  ['original business xmin drift', v => { v.after.databases.poms_r4ghi_rust.tables.project.rows[0].xmin = 'other'; }],
  ['original migration xmin drift', v => { v.after.databases.poms_r4ghi_rust.tables.poms_migrations.rows[0].xmin = 'other'; }],
  ['function OID replacement', v => { const fn = JSON.parse(v.after.databases.poms_r4ghi_native.meta.normative.functions[0]); fn.oid = '333'; v.after.databases.poms_r4ghi_native.meta.normative.functions[0] = JSON.stringify(fn); }],
  ['function frame changed with same approved body', v => { const db = 'poms_r4ghi_rust', fn = JSON.parse(v.after.databases[db].meta.normative.functions[0]); fn.definition = fn.definition.replace('LANGUAGE plpgsql', 'LANGUAGE sql'); v.evidence.databases[db].afterDefinitionSHA256 = sha(fn.definition); v.after.databases[db].meta.normative.functions[0] = JSON.stringify(fn); }],
  ['additional migration record', v => { v.after.databases.poms_r4ghi_native.tables.poms_migrations.rows.push(row({ id: 99, name: 'extra' }, '99')); }],
  ['extra nextval', v => { const db = 'poms_r4ghi_rust'; v.after.databases[db].meta.sequences[0].value = '99'; v.evidence.databases[db].actualSequenceDeltas[0].after.value = '99'; }],
  ['objects changed during migration', v => { v.after.objects.poms_r4ghi_rust.files.push({ key: 'unexpected' }); }]
]) { const candidate = model(); mutate(candidate); candidate.fresh = structuredClone(candidate.after); assert.throws(() => policy.verifyM98Transition108(candidate, memoryRows), name); rejected.push(name); }

// Separate synthetic FS originals stay inside this review directory. Never execute argv.
const sandbox = path.join(out, 'synthetic87'); fs.mkdirSync(sandbox, { recursive: true });
const pin = (rel, value, raw = false) => { const file = path.join(sandbox, rel), bytes = raw ? Buffer.from(value) : Buffer.from(JSON.stringify(value)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file, rawBytesSha256: sha(bytes) }; };
const empty = pin('rows/empty.jsonl', '', true);
function materialize(snapshot, label) { const next = structuredClone(snapshot); for (const db of dbs) for (const [name, table] of Object.entries(next.databases[db].tables)) { const rows = table.rows; delete table.rows; const bytes = rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''); const p = rows.length ? pin('rows/' + label + '/' + db + '/' + name + '.jsonl', bytes, true) : empty; Object.assign(table, p, { count: rows.length }); } return next; }
const snapshots = Object.fromEntries(['originalBaseline', 'retained', 'before', 'after', 'fresh'].map(k => [k, materialize(f[k], k)]));
const pins = Object.fromEntries(Object.entries(snapshots).map(([k, v]) => [k, pin('private/snapshots/' + k + '.json', v)]));
const approvedSQL = pin('root/approved.sql', newSQL, true), approvedMigrationSource = pin('root/' + migrationName + '.ts', 'this.addSql(' + JSON.stringify(newSQL) + ');', true);
const commands = dbs.map(database => { const value = { database, direction: 'up', onlyMigration: migrationName,
  argv: ['node', 'node_modules/.bin/mikro-orm', 'migration:down', '--only', migrationName], exitCode: 0,
  stdout: pin('private/migration/' + database + '.stdout', '', true), stderr: pin('private/migration/' + database + '.stderr', '', true) };
  return { ...value, executionReceipt: pin('private/migration/' + database + '.execution.json', { ...value, kind: 'actual-owned-normal-migration-command108', syntheticReviewOnly: true, namespace: 'poms-r4ghi', marker: 'synthetic-review87-only', host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner' }) }; });
const actualMigrationReceipt = pin('private/migration/receipt.json', { kind: 'actual-normal-forward-M98-migration-receipt108', syntheticReviewOnly: true, namespace: 'poms-r4ghi', marker: 'synthetic-review87-only', normalForward: true, fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, migrationName, approvedSQL, approvedMigrationSource, before: pins.before, after: pins.after, databases: f.evidence.databases, commands });
const advance = { actualMigrationReceipt, approvedSQL, approvedMigrationSource, migrationBefore: pins.before, migrationAfter: pins.after, migrationName, databases: f.evidence.databases };
const ctx = { namespace: 'poms-r4ghi', private: path.join(sandbox, 'private'), win: path.join(sandbox, 'root'), migrations: 98, state: { marker: 'synthetic-review87-only', baseline: pins.originalBaseline } };
const accepted = policy.verifyMigrationReceipt108(ctx, advance); assert.equal(accepted.commands[0].argv[2], 'migration:down');
const proof = { kind: 'independent-I108-synthetic-policy-probes87', authorManifest: '8943e0ac1fcabe40cee6171862cb6d2fca65186c78bf01784e61c75f372cba96',
  exactAdvanceAndDerivedPreservationPassed: true, rejectedMutations: rejected,
  counterexample: { name: 'wrapper-and-execution-up-annotations-do-not-validate-actual-argv-direction', acceptedByVerifyMigrationReceipt108: true, actualArgvContains: 'migration:down', commandsExecuted: 0, PGOrHTTPAuthority: false, candidateLocation: 'schema-comparison108.mjs:125-132' },
  SQL: 0, HTTP: 0, productWrites: 0, RootHelperWrites: 0, Source13Certified: false, G3Certified: false, G4Certified: false, inputs };
fs.writeFileSync(path.join(out, 'probes87.json'), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ exactAdvance: true, negativePolicyChecks: rejected.length, mismatchedActualArgvDirectionAccepted: true, commandsExecuted: 0 }));
