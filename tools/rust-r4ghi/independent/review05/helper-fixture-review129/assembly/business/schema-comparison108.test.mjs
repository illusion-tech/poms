// Synthetic FS/policy regression only. No PG, HTTP or producer certification.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyM98Transition108, deriveComparisonBaseline108, verifySchemaBinding108, comparisonBaselinePin108, plBody108 } from './schema-comparison108.mjs';
import { assertSchemaPlanShape108 } from './retained-schema-admission108.mjs';
import { assertRecorded } from './ledger.mjs';
import { loadSnapshot, loadComparisonSnapshot108, difference } from './snapshot.mjs';
import { assertAdmittedFixtureSource, producerProjection54 } from './consumer-admission54.mjs';
import { makeChainedAdmissions62, validateRegistryLineage62, entrySource62 } from './registry-lineage62.mjs';
import { FIXED_M98_COMMAND136 as F136, assertFixedM98Invocation136 } from './migration-command136.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const databases = ['poms_r4ghi_native', 'poms_r4ghi_rust'];
const clone = structuredClone;
const row = (value, xmin = '1') => { const raw = JSON.stringify(value); return { raw, key: [String(value.id)], cells: { id: String(value.id) }, sha256: sha(raw), xmin }; };
const oldSQL = 'CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN RETURN OLD; END;\n$$;';
const newSQL = 'CREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nBEGIN RETURN NEW; END;\n$$;';
const migrationName = F136.target;
const APPROVED_SQL136 = "-- CONDITIONAL FORWARD CANDIDATE ONLY. Root decides registration/application.\n-- Keep M95/M97, existing triggers, frozen columns and deferred totals unchanged.\n-- No table/column/data/origin backfill. Only replace this existing guard body.\nCREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\nRETURNS trigger LANGUAGE plpgsql AS $$\nDECLARE\n parent_ids uuid[];\n parent_row record;\n has_frozen_parent boolean := false;\n expected_parent_count integer := 0;\n locked_parent_count integer := 0;\nBEGIN\n IF TG_OP='INSERT' THEN\n  parent_ids := ARRAY[NEW.assignment_id];\n ELSIF TG_OP='DELETE' THEN\n  parent_ids := ARRAY[OLD.assignment_id];\n ELSE\n  parent_ids := ARRAY[OLD.assignment_id,NEW.assignment_id];\n END IF;\n\n SELECT count(DISTINCT p.id)::integer INTO expected_parent_count\n FROM unnest(parent_ids) AS p(id) WHERE p.id IS NOT NULL;\n\n -- One deterministic order, with duplicate IDs naturally removed by the PK\n -- lookup. Take every existing OLD/NEW parent lock before making a decision.\n FOR parent_row IN\n  SELECT a.id,a.status\n  FROM poms.commission_role_assignment a\n  WHERE a.id=ANY(parent_ids)\n  ORDER BY a.id\n  FOR UPDATE OF a\n LOOP\n  locked_parent_count := locked_parent_count+1;\n  has_frozen_parent := has_frozen_parent OR parent_row.status='frozen';\n END LOOP;\n\n -- Moving any participant, including zero weight and draft-to-draft, remains\n -- forbidden. Preserve the existing SQLSTATE and diagnostic text.\n IF TG_OP='UPDATE' AND NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN\n  RAISE EXCEPTION 'assignment participant cannot be reparented' USING ERRCODE='23514';\n END IF;\n -- I/U must have locked every nonnull actual parent. Preserve DELETE's\n -- previous missing-parent behavior and let original not-null handle NULL.\n IF TG_OP IN ('INSERT','UPDATE') AND locked_parent_count<>expected_parent_count THEN\n  RAISE EXCEPTION 'assignment participant parent unavailable' USING ERRCODE='23503';\n END IF;\n IF has_frozen_parent THEN\n  RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';\n END IF;\n IF TG_OP='DELETE' THEN RETURN OLD; END IF;\n RETURN NEW;\nEND $$;\n"; // exact sealed65-02 UTF-8 bytes; never executed
const APPROVED_TS136 = "import { Migration } from \"@mikro-orm/migrations\";\n\n/** Conditional forward-only guard; Root has not registered or executed it. */\nexport class Migration20261108090000 extends Migration {\n    override async up(): Promise<void> {\n        this.addSql(\"-- CONDITIONAL FORWARD CANDIDATE ONLY. Root decides registration/application.\\n-- Keep M95/M97, existing triggers, frozen columns and deferred totals unchanged.\\n-- No table/column/data/origin backfill. Only replace this existing guard body.\\nCREATE OR REPLACE FUNCTION poms.jghi_assignment_participant_guard()\\nRETURNS trigger LANGUAGE plpgsql AS $$\\nDECLARE\\n parent_ids uuid[];\\n parent_row record;\\n has_frozen_parent boolean := false;\\n expected_parent_count integer := 0;\\n locked_parent_count integer := 0;\\nBEGIN\\n IF TG_OP='INSERT' THEN\\n  parent_ids := ARRAY[NEW.assignment_id];\\n ELSIF TG_OP='DELETE' THEN\\n  parent_ids := ARRAY[OLD.assignment_id];\\n ELSE\\n  parent_ids := ARRAY[OLD.assignment_id,NEW.assignment_id];\\n END IF;\\n\\n SELECT count(DISTINCT p.id)::integer INTO expected_parent_count\\n FROM unnest(parent_ids) AS p(id) WHERE p.id IS NOT NULL;\\n\\n -- One deterministic order, with duplicate IDs naturally removed by the PK\\n -- lookup. Take every existing OLD/NEW parent lock before making a decision.\\n FOR parent_row IN\\n  SELECT a.id,a.status\\n  FROM poms.commission_role_assignment a\\n  WHERE a.id=ANY(parent_ids)\\n  ORDER BY a.id\\n  FOR UPDATE OF a\\n LOOP\\n  locked_parent_count := locked_parent_count+1;\\n  has_frozen_parent := has_frozen_parent OR parent_row.status='frozen';\\n END LOOP;\\n\\n -- Moving any participant, including zero weight and draft-to-draft, remains\\n -- forbidden. Preserve the existing SQLSTATE and diagnostic text.\\n IF TG_OP='UPDATE' AND NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN\\n  RAISE EXCEPTION 'assignment participant cannot be reparented' USING ERRCODE='23514';\\n END IF;\\n -- I/U must have locked every nonnull actual parent. Preserve DELETE's\\n -- previous missing-parent behavior and let original not-null handle NULL.\\n IF TG_OP IN ('INSERT','UPDATE') AND locked_parent_count<>expected_parent_count THEN\\n  RAISE EXCEPTION 'assignment participant parent unavailable' USING ERRCODE='23503';\\n END IF;\\n IF has_frozen_parent THEN\\n  RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';\\n END IF;\\n IF TG_OP='DELETE' THEN RETURN OLD; END IF;\\n RETURN NEW;\\nEND $$;\\n\");\n    }\n}\n"; // exact sealed65-02 UTF-8 bytes; never executed
let activeVirtual136 = null, cachedSources136 = null;
afterEach(() => { if (activeVirtual136) activeVirtual136.restore(); });
function virtual136(dir) {
  assert(!activeVirtual136); const methods = ['readFileSync', 'lstatSync', 'realpathSync', 'readdirSync', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync'];
  const original = Object.fromEntries(methods.map(name => [name, fs[name]])), files = new Map(), memory = new Map(), directories = new Set([F136.private, F136.root]), claimed = new Set();
  const remember = file => { let parent = path.dirname(file); while (parent.startsWith(F136.private + '/') || parent === F136.private || parent.startsWith(F136.root + '/') || parent === F136.root) { directories.add(parent); parent = path.dirname(parent); } };
  if (!cachedSources136) {
    const runner = original.readFileSync(F136.root + '/' + F136.runner); assert.equal(sha(runner), F136.runnerSHA256);
    const names = original.readdirSync(F136.root + '/apps/poms-api/src/migrations').filter(name => /^Migration\d{14}.*\.ts$/.test(name) && name !== F136.target + '.ts').sort(); assert.equal(names.length, 97);
    cachedSources136 = { runner, migrations: names.map(name => ({ file: 'apps/poms-api/src/migrations/' + name, bytes: original.readFileSync(F136.root + '/apps/poms-api/src/migrations/' + name) })) };
  }
  const bind = (file, bytes) => { const value = Buffer.from(bytes); memory.set(file, value); claimed.add(file); remember(file); return { file, rawBytesSha256: sha(value) }; };
  const runner = bind(F136.root + '/' + F136.runner, cachedSources136.runner), node = bind(F136.node, 'synthetic-node-bytes-not-executed');
  const sql = bind(F136.root + '/' + F136.sql, APPROVED_SQL136), ts = bind(F136.root + '/apps/poms-api/src/migrations/' + F136.target + '.ts', APPROVED_TS136);
  assert.equal(sql.rawBytesSha256, F136.sqlSHA256); assert.equal(ts.rawBytesSha256, F136.tsSHA256);
  for (const item of cachedSources136.migrations) bind(F136.root + '/' + item.file, item.bytes);
  const inputs = [...cachedSources136.migrations.map(item => ({ file: item.file, rawBytesSha256: sha(item.bytes) })), { file: 'apps/poms-api/src/migrations/' + F136.target + '.ts', rawBytesSha256: ts.rawBytesSha256 }].sort((a, b) => a.file.localeCompare(b.file));
  const approval = bind(F136.root + '/' + F136.approval, JSON.stringify({ kind: 'Root-frozen-Source13-corrective-G2-136', G2Authorized: true, actualM98Applied: false, forwardMigration: { databases, from: 97, to: 98, name: F136.target, mechanism: 'programmatic-MikroORM-migrator-up-only', runner, node, migrationSQL: sql, migrationTS: ts, inputs } }));
  const missing = file => Object.assign(new Error('Synthetic virtual file absent: ' + file), { code: 'ENOENT' });
  const virtualOnly = file => claimed.has(file) || file === F136.private || file.startsWith(F136.private + '/');
  const text = (buffer, options) => { const encoding = typeof options === 'string' ? options : options?.encoding; return encoding ? buffer.toString(encoding) : Buffer.from(buffer); };
  fs.readFileSync = (file, options) => { const key = String(file); if (memory.has(key)) return text(memory.get(key), options); if (files.has(key)) return original.readFileSync(files.get(key), options); if (virtualOnly(key)) throw missing(key); return original.readFileSync(file, options); };
  fs.lstatSync = (file, options) => { const key = String(file); if (memory.has(key)) return { isFile: () => true, isSymbolicLink: () => false, nlink: 1 }; if (files.has(key)) return original.lstatSync(files.get(key), options); if (virtualOnly(key)) throw missing(key); return original.lstatSync(file, options); };
  fs.realpathSync = (file, options) => { const key = String(file); if (memory.has(key) || files.has(key) || directories.has(key)) return path.resolve(key); if (virtualOnly(key)) throw missing(key); return original.realpathSync(file, options); };
  fs.readdirSync = (file, options) => String(file) === F136.root + '/apps/poms-api/src/migrations' ? inputs.map(input => path.basename(input.file)) : original.readdirSync(file, options);
  for (const name of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync']) fs[name] = (file, ...args) => { const key = String(file); assert(!(key === F136.private || key.startsWith(F136.private + '/') || key === F136.root || key.startsWith(F136.root + '/') || key === F136.node), 'Pure fixtures may never write Root or real private paths'); return original[name](file, ...args); };
  const pin = (relative, value, bytesOnly = false) => { const physical = dir + '/' + relative, bytes = bytesOnly ? Buffer.from(value) : Buffer.from(JSON.stringify(value)), file = F136.private + '/' + relative; original.mkdirSync(path.dirname(physical), { recursive: true }); original.writeFileSync(physical, bytes); files.set(file, physical); claimed.add(file); remember(file); return { file, rawBytesSha256: sha(bytes) }; };
  const result = { pin, runner, node, sql, ts, approval, bind, remove: file => { memory.delete(file); }, restore: () => { for (const name of methods) fs[name] = original[name]; activeVirtual136 = null; } }; activeVirtual136 = result; return result;
}
function model108() {
  const empty = name => ({ file: '/synthetic-only/' + name, rawBytesSha256: sha(''), pk: ['id'], columns: ['id'], count: 0, logicalRowsSha256: sha(''), syntheticRows: [] });
  const tables = Object.fromEntries(['poms_migrations', 'project', ...Array.from({ length: 137 }, (_, i) => 'table' + String(i).padStart(3, '0'))].sort().map(name => [name, empty(name)]));
  tables.project.syntheticRows = [row({ id: 'original' })]; tables.poms_migrations.syntheticRows = Array.from({ length: 97 }, (_, i) => row({ id: i + 1, name: 'Migration' + String(i + 1), executed_at: '2026-11-01T00:00:00+08:00' }));
  const meta = { tables: Object.keys(tables).map(name => ({ name, oid: name, pk: ['id'], columns: ['id'] })), foreignKeys: [], externalForeignKeys: [], normative: {
    functions: [JSON.stringify({ oid: '111', schema: 'poms', proname: 'jghi_assignment_participant_guard', arguments: '', owner: 'owner', acl: null, prosecdef: false, proconfig: null, definition: oldSQL })],
    columns: [JSON.stringify({ schema: 'poms', table_name: 'poms_migrations', attname: 'id', default_expr: "nextval('poms.poms_migrations_id_seq'::regclass)" })],
    triggers: ['original-trigger'], constraints: ['original-constraint'], roles: ['non-super-app'], memberships: [], relations: ['same-OIDs'], schemas: ['same-schema'], indexes: ['same-index'],
  }, sequences: [{ schema: 'poms', name: 'poms_migrations_id_seq', oid: '222', value: '97', is_called: true }] };
  const originalBaseline = { schemaVersion: 1, epoch: 'old10', run: 'main', marker: F136.marker, databases: Object.fromEntries(databases.map(db => [db, { meta: clone(meta), tables: clone(tables) }])), objects: Object.fromEntries(databases.map(db => [db, { directories: [], files: [] }])) };
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
  const virtual = virtual136(dir), pin = virtual.pin;
  const emptyPin = pin('rows/empty.jsonl', '', true);
  const materialize = (snapshot, label) => { const out = clone(snapshot); for (const db of databases) for (const [name, meta] of Object.entries(out.databases[db].tables)) { const bytes = meta.syntheticRows.map(row => JSON.stringify(row)).join('\n') + (meta.syntheticRows.length ? '\n' : ''); const filePin = meta.syntheticRows.length ? pin('rows/' + label + '/' + db + '/' + name + '.jsonl', bytes, true) : emptyPin; meta.count = meta.syntheticRows.length; delete meta.syntheticRows; Object.assign(meta, filePin); } return out; };
  const f = model108(); f.approvedSQL = APPROVED_SQL136;
  const definition = APPROVED_SQL136.slice(APPROVED_SQL136.indexOf('CREATE OR REPLACE FUNCTION')).trim();
  for (const database of databases) { for (const snapshot of [f.after, f.fresh]) { const fn = JSON.parse(snapshot.databases[database].meta.normative.functions[0]); fn.definition = definition; snapshot.databases[database].meta.normative.functions[0] = JSON.stringify(fn); } f.evidence.databases[database].afterDefinitionSHA256 = sha(definition); f.evidence.databases[database].afterBodySHA256 = sha(plBody108(definition)); }
  for (const snapshot of [f.retained, f.before, f.after, f.fresh]) for (const id of extraProjects) snapshot.databases.poms_r4ghi_rust.tables.project.syntheticRows.push(row({ id }, '12'));
  const original = materialize(f.originalBaseline, 'original'), retained = materialize(f.retained, 'retained'), before = materialize(f.before, 'before'), after = materialize(f.after, 'after'), fresh = materialize(f.fresh, 'fresh');
  const basePin = pin('business/old10/main/baseline.json', original), retainedPin = pin('retention/old12/retained.json', retained), beforePin = pin('migration/before.json', before), afterPin = pin('migration/after.json', after), freshPin = pin('business/new13/main/fresh.json', fresh);
  const approvedSQL = virtual.sql, migrationSource = virtual.ts;
  const commands = databases.map(database => {
    const value = { kind: 'captured-fixed-programmatic-M98-command136', database, direction: 'up', migrationName, argv: [F136.node, F136.root + '/' + F136.runner, '--database', database, '--execute'], runner: virtual.runner, node: virtual.node, approval: virtual.approval, exitCode: 0 };
    const common = assertFixedM98Invocation136({ ...value, intent: { file: F136.private + '/migration98-136/' + database + '/intent.json' }, executionReceipt: { file: F136.private + '/migration98-136/' + database + '/execution.json' } });
    const intent = pin('migration98-136/' + database + '/intent.json', { kind: 'Root-fixed-only-up-M98-command136-intent', ...common });
    const executionReceipt = pin('migration98-136/' + database + '/execution.json', { kind: 'actual-fixed-only-up-M98-command136', ...common, pendingBefore: [migrationName], applied: [migrationName], executedAfter: 98, exitCode: 0 });
    return { ...value, intent, executionReceipt, stdout: pin('migration/' + database + '.out', JSON.stringify({ completed: true, database, direction: 'up', migrationName, migrations: 98, execution: executionReceipt, G3Certified: false }) + '\n', true), stderr: pin('migration/' + database + '.err', '', true) };
  });
  const actualReceipt = pin('migration/receipt.json', { kind: 'actual-normal-forward-M98-migration-receipt108', commandProtocol: 'fixed-programmatic-up-only-136', namespace: 'poms-r4ghi', marker: F136.marker, normalForward: true, fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, migrationName, approvedSQL, approvedMigrationSource: migrationSource, before: beforePin, after: afterPin, databases: f.evidence.databases, commands });
  const advance = { approvedSQL, approvedMigrationSource: migrationSource, actualMigrationReceipt: actualReceipt, migrationBefore: beforePin, migrationAfter: afterPin, migrationName, databases: f.evidence.databases };
  const verified = verifyM98Transition108({ ...f, originalBaseline: original, retained, before, after, fresh }), comparison = deriveComparisonBaseline108(original, verified), comparisonPin = pin('business/new13/main/comparison.json', comparison);
  const producer = { epoch: 'old12', run: 'main', sourcePinsSHA256: sha('[]') }, producerState = pin('retention/old12/state.json', { epoch: 'old12', run: 'main', marker: F136.marker, baseline: basePin, sourcePins: [] }), retentionIndex = pin('retention/old12/index.json', { producerEpoch: 'old12', run: 'main', marker: F136.marker, frozenState: producerState, retainedSnapshot: retainedPin }), priorRegistry = pin('business/old12/main/registry.json', { marker: F136.marker, originalBaseline: basePin, consumer: producer });
  const receipt = { kind: 'verified-M98-schema-comparison-receipt108', schemaVersion: 1, canonicalMetadataAdvanceOnly: true, originalBusinessBaselineRebased: false, businessRowsAndXminChangedByMigration: false, migrationExecutedByThisTool: false, originalBaseline: basePin, comparisonBaseline: comparisonPin, producer, consumer: { epoch: 'new13', run: 'main', sourcePins: pin('business/new13/main/sources.json', []), sourcePinsSHA256: sha('[]'), sourceCount: 0 },
    retainedSnapshot: retainedPin, retentionIndex, producerState, priorRegistry,
    migrationBefore: beforePin, migrationAfter: afterPin, freshCurrent: freshPin, approvedSQL, actualMigrationReceipt: actualReceipt, schemaAdvance: advance, migrationName, evidence: f.evidence };
  const receiptPin = pin('business/new13/main/verification.json', receipt), binding = { kind: 'verified-schema-comparison-binding108', schemaVersion: 1, fromMigrations: 97, toMigrations: 98, originalBaseline: basePin, comparisonBaseline: comparisonPin, verificationReceipt: receiptPin };
  return { dir, pin, receipt, binding, comparison, actualReceipt, virtual, ctx: { namespace: 'poms-r4ghi', private: F136.private, priv: F136.private + '/business/new13/main', win: F136.root, migrations: 98, state: { marker: F136.marker, baseline: basePin, schemaComparison108: binding } } };
}
function close108(dir) { if (activeVirtual136) activeVirtual136.restore(); const actual = fs.realpathSync(dir), root = fs.realpathSync(os.tmpdir()); assert.equal(path.dirname(actual), root); assert(path.basename(actual).startsWith('poms-schema108-unit-')); fs.rmSync(actual, { recursive: true }); }
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
    const state10 = { epoch: 'old10', run: 'main', marker: F136.marker, sourcePins: p10, baseline: f.binding.originalBaseline, owned: { a: owned('owned-http-project'), legacy: owned('legacy-project') }, fixtures: { uiFixtureViews23: { eo }, legacyCompatibilityFixture: legacy, a05Boundaries26: { views: { 'max-zero': max } } } };
    const statePin10 = f.pin('retention/old10/state.json', state10), snapshot10 = snapshot('old10', ['owned-http-project', 'legacy-project'], 'retained');
    const entries10 = [entry('/fixtures/uiFixtureViews23/eo', eo, 'owned-http-project'), entry('/fixtures/legacyCompatibilityFixture', legacy, 'legacy-project', 'legacy-compatibility'), entry('/fixtures/a05Boundaries26/views/max-zero', max, 'owned-http-project', 'continuable-project-producer')];
    const index = (epoch, statePin, retained) => f.pin('retention/' + epoch + '/index.json', { producerEpoch: epoch, run: 'main', marker: F136.marker, frozenState: statePin, retainedSnapshot: retained });
    const consumer = (epoch, sourcePins) => ({ epoch, run: 'main', sourcePinsSHA256: sha(JSON.stringify(sourcePins)), sourceCount: sourcePins.length, sourcePins: f.pin('business/' + epoch + '/main/sources.json', sourcePins) });
    const source = (epoch, sourcePins) => ({ epoch, run: 'main', sourcePinsSHA256: sha(JSON.stringify(sourcePins)), sourceCount: sourcePins.length });
    const registry11 = { schemaVersion: 1, kind: 'verified-retained-data-consumer-registry54', namespace: 'poms-r4ghi', marker: F136.marker, producer: source('old10', p10), consumer: consumer('old11', p11), producerState: statePin10, retainedSnapshot: snapshot10, retentionIndex: index('old10', statePin10, snapshot10), originalBaseline: f.binding.originalBaseline, fixtureAdmissions: entries10 };
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
    const registry12 = { schemaVersion: 2, kind: registry11.kind, namespace: 'poms-r4ghi', marker: F136.marker, producer: source('old11', p11), consumer: c12, producerState: statePin11, retainedSnapshot: snapshot11, retentionIndex: index('old11', statePin11, snapshot11), priorRegistry: registry11Pin, originalBaseline: f.binding.originalBaseline, impactReview: impact12 };
    const oldCtx = { private: F136.private, win: F136.root, namespace: 'poms-r4ghi', database: db, state: { marker: F136.marker } };
    const centEntry = entry('/fixtures/a05Boundaries26/views/cent-max', cent11, 'cent11-project', 'continuable-project-producer');
    const chained12 = makeChainedAdmissions62(oldCtx, registry12, [...entries10, centEntry]); Object.assign(registry12, { fixtureAdmissions: chained12.entries, sourceHistory: chained12.sources });
    const registry12Pin = f.pin('business/old12/main/registry.json', registry12), own12 = { sourcePinsSHA256: sha(JSON.stringify(p12)), fixtures: { project: { id: 'own12-project' } }, UICommandObserved: false };
    const state12 = { ...clone(state11), epoch: 'old12', sourcePins: p12, consumerAdmission54: { registry: registry12Pin }, owned: { ...state11.owned, own: owned('own12-project', birth('old12', ['owned-http-project', 'legacy-project', 'cent11-project'], ['owned-http-project', 'legacy-project', 'cent11-project', 'own12-project'])) } }; state12.fixtures.uiFixtureViews23.own = own12;
    const statePin12 = f.pin('retention/old12/state.json', state12), index12 = index('old12', statePin12, f.receipt.retainedSnapshot);
    const p13 = [{ file: 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md', sha256: sha('54') }, { file: 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md', sha256: sha('61') }], c13 = consumer('new13', p13), impact13 = impact(source('old12', p12), c13); c13.impactReview = impact13;
    // The synthetic schema3 consumer also declares the complete actual code
    // directory it is exercising. This is a unit fixture, not a live119 grant.
    const helperDirectory = path.join(F136.root, 'tools/rust-r4ghi/business');
    const completeHelpers = fs.readdirSync(helperDirectory).filter(name => /\.(mjs|json)$/.test(name)).sort().map(name => ({ file: 'tools/rust-r4ghi/business/' + name, sha256: sha(fs.readFileSync(path.join(helperDirectory, name))) }));
    c13.helperPins = f.pin('business/new13/main/complete-helpers.json', completeHelpers); f.ctx.helperPins = completeHelpers;
    const process = { namespace: 'poms-r4ghi', root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: sha('synthetic-process') }, processPin = f.pin('business/new13/main/process.json', process); c13.apiProcess = processPin; c13.binarySHA256 = process.binarySha256;
    Object.assign(f.receipt, { producer: source('old12', p12), consumer: c13, producerState: statePin12, retentionIndex: index12, priorRegistry: registry12Pin }); f.binding.verificationReceipt = f.pin('business/new13/main/verification3.json', f.receipt);
    const state13 = { ...clone(state12), epoch: 'new13', sourcePins: p13, schemaComparison108: f.binding, apiProcess: { ...processPin, record: process } };
    Object.assign(f.ctx, { namespace: 'poms-r4ghi', epoch: 'new13', run: 'main', pins: p13, database: db, state: state13 });
    const registry13 = { schemaVersion: 3, kind: registry11.kind, namespace: 'poms-r4ghi', marker: F136.marker, producer: source('old12', p12), consumer: c13, producerState: statePin12, retentionIndex: index12, retainedSnapshot: f.receipt.retainedSnapshot,
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

function rewriteCommands136(f, mutate) {
  const overall = JSON.parse(fs.readFileSync(f.actualReceipt.file));
  for (let index = 0; index < overall.commands.length; index += 1) {
    const command = overall.commands[index], originalDatabase = command.database, intent = JSON.parse(fs.readFileSync(command.intent.file)), execution = JSON.parse(fs.readFileSync(command.executionReceipt.file)), stdout = JSON.parse(fs.readFileSync(command.stdout.file));
    const controls = mutate({ command, intent, execution, stdout, index }) ?? {};
    command.intent = f.pin('migration98-136/' + originalDatabase + '/intent.json', intent);
    command.executionReceipt = f.pin('migration98-136/' + originalDatabase + '/execution.json', execution);
    if (!controls.keepWrongStdoutPin) stdout.execution = command.executionReceipt;
    command.stdout = f.pin('migration/' + originalDatabase + '.out', JSON.stringify(stdout) + '\n', true);
  }
  const pin = f.pin('migration/revised-wrapper.json', overall); f.receipt.actualMigrationReceipt = pin; f.receipt.schemaAdvance.actualMigrationReceipt = pin;
  f.binding.verificationReceipt = f.pin('business/new13/main/revised-verification.json', f.receipt);
}
for (const [name, mutate] of [
  ['mutually identical DOWN argv with UP labels', x => { x.command.argv = [F136.node, F136.root + '/' + F136.runner, 'migration:down']; x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; }],
  ['unrelated program with matching UP labels', x => { x.command.argv[1] = '/tmp/unrelated-program.mjs'; x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; }],
  ['wrong runner path with mutually matching source labels', x => { x.command.runner = { ...x.command.runner, file: '/tmp/not-reviewed.mjs' }; x.intent.runner = x.command.runner; x.execution.runner = x.command.runner; x.command.argv[1] = x.command.runner.file; x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; }],
  ['wrong target database consistently labelled', x => { x.command.database = 'poms_default'; x.command.argv[3] = x.command.database; x.intent.database = x.command.database; x.execution.database = x.command.database; x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; }],
  ['other allowed DB in argv while receipt names Native', x => { if (x.index === 0) { x.command.argv[3] = 'poms_r4ghi_rust'; x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; } }],
  ['wrong migration name consistently labelled', x => { x.command.migrationName = 'Migration20990101000000_wrong'; x.intent.migrationName = x.command.migrationName; x.execution.migrationName = x.command.migrationName; }],
  ['extra free direction argument', x => { x.command.argv.push('--direction', 'down'); x.intent.argv = x.command.argv; x.execution.argv = x.command.argv; }],
  ['down Migrator method behind fixed UP invocation', x => { x.intent.migratorMethod = 'down'; x.execution.migratorMethod = 'down'; }],
  ['non-unique or extra Migrator options', x => { x.intent.migratorOptions = { migrations: [migrationName], from: 'unapproved' }; x.execution.migratorOptions = x.intent.migratorOptions; }],
  ['different intent than actual execution', x => { x.intent.to = 99; }],
  ['additional pending migration', x => { x.execution.pendingBefore = [migrationName, 'extra']; }],
  ['wrong applied migration', x => { x.execution.applied = ['wrong']; }],
  ['executed count97 despite wrapper success', x => { x.execution.executedAfter = 97; }],
  ['stdout points at another execution raw original', x => { x.stdout.execution = { ...x.command.executionReceipt, rawBytesSha256: 'e'.repeat(64) }; return { keepWrongStdoutPin: true }; }],
  ['stdout completion false despite successful execution record', x => { x.stdout.completed = false; }],
]) test('136 receipt chain rejects ' + name, () => { const f = disk108(); try { rewriteCommands136(f, mutate); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding)); } finally { close108(f.dir); } });
test('136 receipt requires the actual frozen G2 original rather than an absent file with a claimed pin', () => {
  const f = disk108(); try { f.virtual.remove(F136.root + '/' + F136.approval); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding), { code: 'ENOENT' }); } finally { close108(f.dir); }
});
test('136 receipt rejects altered reviewed runner bytes despite matching runner labels', () => {
  const f = disk108(); try { f.virtual.bind(F136.root + '/' + F136.runner, 'not the independently reviewed UP-only source'); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding)); } finally { close108(f.dir); }
});
test('136 receipt binds actual Node bytes to the exact Node pin in G2, intent and execution', () => {
  const f = disk108(); try { f.virtual.bind(F136.node, 'different synthetic Node bytes'); assert.throws(() => verifySchemaBinding108(f.ctx, f.binding)); } finally { close108(f.dir); }
});
test('136 receipt rejects changed G2 mechanism even when both command chains adopt its new hash', () => {
  const f = disk108(); try {
    const approval = JSON.parse(fs.readFileSync(f.virtual.approval.file)); approval.forwardMigration.mechanism = 'free-direction-cli';
    const newPin = f.virtual.bind(f.virtual.approval.file, JSON.stringify(approval));
    rewriteCommands136(f, x => { x.command.approval = newPin; x.intent.approval = newPin; x.execution.approval = newPin; });
    assert.throws(() => verifySchemaBinding108(f.ctx, f.binding));
  } finally { close108(f.dir); }
});
