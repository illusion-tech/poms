// Root-only read-only CLI/catalog draft. No product DDL is sent to PostgreSQL.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parse } from 'dotenv';
import { guardCandidate, guardNative, pin, sha, base } from '../../../tools/rust-r3m/source-guard.mjs';
const self = 'tmp/rust-r3m/guard-contract-draft/schema-run01.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', state = '/home/wangzishi/.local/share/poms-r3m', priv = state + '/private';
assert.equal(process.cwd(), root); assert.equal(process.platform, 'linux');
const [attempt] = process.argv.slice(2); assert.match(attempt, /^\d{2}$/);
const out = 'tmp/rust-r3m/schema-check' + attempt, privateOut = priv + '/schema-check' + attempt;
assert(!fs.existsSync(out) && !fs.existsSync(privateOut)); fs.mkdirSync(out); fs.mkdirSync(privateOut, { mode: 0o700 });
guardCandidate(); guardNative();
const identity = JSON.parse(fs.readFileSync(state + '/identity.json')); assert.equal(identity.base, base); assert.equal(identity.namespace, 'poms-r3m');
const oldFile = 'docs/design/archive/slices/rust-r3cdefg/evidence/original/schema-classification01.json';
const old = JSON.parse(fs.readFileSync(oldFile)); assert.equal(old.newUnclassifiedStatements, 0); assert(old.existingValidatedChecks.length > 100);
const sourceFiles = [self, oldFile, 'apps/poms-api/project.json', 'apps/poms-api/src/mikro-orm.config.ts', 'apps/poms-api/src/app/core/persistence/persistence.config.ts', 'package.json', 'pnpm-lock.yaml'];
const sources = sourceFiles.map(pin), require = createRequire(import.meta.url), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const cliPackageFile = require.resolve('@mikro-orm/cli/package.json'), cliPackage = JSON.parse(fs.readFileSync(cliPackageFile)), cli = path.join(path.dirname(cliPackageFile), 'cli.js');
assert.equal(cliPackage.version, '7.0.11'); assert.equal(cliPackage.bin['mikro-orm'], './cli.js');
const target = JSON.parse(fs.readFileSync('apps/poms-api/project.json')).targets['migration-check'];
assert.equal(target.options.command, 'corepack pnpm exec mikro-orm migration:check'); assert.deepEqual(target.options.args, ['--config', 'apps/poms-api/src/mikro-orm.config.ts']);
const cliPins = [cliPackageFile, cli].map(pin), receipts = [];
function safeEnv() { const e = {}; for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[k]) e[k] = process.env[k]; e.PATH = path.dirname(process.execPath) + ':' + e.PATH; return e; }
async function connect(backend, owner) {
  const db = new Client({ host: '127.0.0.1', port: 23433, database: 'poms_r3m_' + backend, user: owner ? 'poms_r0e_owner' : 'poms_r3m_app', password: fs.readFileSync(priv + '/' + (owner ? 'owner' : 'app') + '-password', 'utf8'), options: '-c default_transaction_read_only=on', application_name: 'poms-r3m-readonly-schema-check', query_timeout: 20000, connectionTimeoutMillis: 5000 });
  await db.connect();
  const actual = (await db.query("select current_database() database,current_user::text role,current_setting('port') port,current_setting('server_version_num') version,current_setting('default_transaction_read_only') readonly,(select instance_id::text from r3m_control.marker) marker")).rows[0];
  assert.deepEqual(actual, { database: 'poms_r3m_' + backend, role: owner ? 'poms_r0e_owner' : 'poms_r3m_app', port: '15432', version: '150012', readonly: 'on', marker: identity.marker });
  return db;
}
const queries = {
  tables: "select c.relname,obj_description(c.oid,'pg_class') comment from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relkind='r' order by c.relname",
  columns: "select table_name,column_name,ordinal_position,column_default,is_nullable,data_type,character_maximum_length,numeric_precision,numeric_scale,udt_schema,udt_name from information_schema.columns where table_schema='poms' order by table_name,ordinal_position",
  constraints: "select t.relname table_name,c.conname,c.convalidated,pg_get_constraintdef(c.oid,true) definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' order by t.relname,c.conname",
  indexes: "select tablename,indexname,indexdef from pg_indexes where schemaname='poms' order by tablename,indexname",
  triggers: "select t.relname table_name,g.tgname,pg_get_triggerdef(g.oid,true) definition,pg_get_functiondef(g.tgfoid) function from pg_trigger g join pg_class t on t.oid=g.tgrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' and not g.tgisinternal order by t.relname,g.tgname",
  migrations: 'select name from poms.poms_migrations order by name',
  privileges: "select t.relname table_name,p.privilege,has_table_privilege('poms_r3m_app',format('%I.%I',n.nspname,t.relname),p.privilege) allowed from pg_class t join pg_namespace n on n.oid=t.relnamespace cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE'))p(privilege) where n.nspname='poms' and t.relkind='r' order by t.relname,p.privilege",
};
async function snapshot(db, backend, label) {
  await db.query('begin isolation level repeatable read read only');
  try {
    const catalog = {}; for (const [key, sql] of Object.entries(queries)) catalog[key] = (await db.query(sql)).rows;
    assert.equal(catalog.tables.length, 107); assert.equal(catalog.columns.length, 1778); assert.equal(catalog.migrations.length, 92);
    assert.equal(catalog.privileges.length, 428); assert(catalog.privileges.every(x => x.allowed));
    const qaObjects = (await db.query("select n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('poms','r3m_control') and p.proname like 'r3m_qa_%' order by n.nspname,p.proname")).rows; assert.deepEqual(qaObjects, []);
    assert(!catalog.triggers.some(x => x.tgname.startsWith('r3m_qa_')));
    const rows = {}; for (const table of catalog.tables) { assert.match(table.relname, /^[a-z_0-9]+$/); rows[table.relname] = (await db.query('select to_jsonb(t)::text row from poms."' + table.relname + '" t')).rows.map(x => x.row).sort(); }
    const rawFile = privateOut + '/' + backend + '-' + label + '-original.json'; fs.writeFileSync(rawFile, JSON.stringify({ catalog, rows }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    const file = out + '/' + backend + '-' + label + '-catalog.json'; fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n', { flag: 'wx' });
    return { catalog, rowsSha256: sha(JSON.stringify(rows)), original: pin(rawFile), publicCatalog: pin(file) };
  } finally { await db.query('rollback'); }
}
function run(backend, operation) {
  const envFile = priv + '/' + backend + '.env', own = parse(fs.readFileSync(envFile));
  assert.equal(own.DB_HOST, '127.0.0.1'); assert.equal(own.DB_PORT, '23433'); assert.equal(own.DB_DATABASE, 'poms_r3m_' + backend); assert.equal(own.DB_USER, 'poms_r3m_app');
  const env = { ...safeEnv(), ...own, POMS_ENV_FILE: envFile, NODE_ENV: 'test', DB_DEBUG: 'false', PGOPTIONS: '-c default_transaction_read_only=on', MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json', NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NO_PROXY: 'localhost,127.0.0.1,::1' };
  const args = [cli, operation === 'migration-check' ? 'migration:check' : 'schema:update', ...(operation === 'schema-dump' ? ['--dump'] : []), ...target.options.args];
  const startedAt = new Date().toISOString(), result = spawnSync(process.execPath, args, { cwd: root, env, encoding: null, maxBuffer: 32000000, timeout: 180000 });
  const logs = [];
  for (const key of ['stdout', 'stderr']) { const file = privateOut + '/' + backend + '-' + operation + '-' + key + '-original.bin'; fs.writeFileSync(file, result[key] || Buffer.alloc(0), { flag: 'wx', mode: 0o600 }); logs.push(pin(file)); }
  return { name: operation, backend, args, startedAt, completedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal, spawnError: result.error?.name || null, logs, text: Buffer.concat([result.stdout || Buffer.alloc(0), result.stderr || Buffer.alloc(0)]).toString('utf8'), readonlyStartupForced: true, launcher: 'same-locked-installed-MikroORM-CLI; original Nx/corepack launcher not claimed' };
}
async function classify(db, check, dump, before) {
  assert(!check.spawnError && !dump.spawnError && !check.signal && !dump.signal); assert.equal(dump.exitCode, 0);
  let clean = dump.text.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).filter(l => !l.startsWith('◇')).join('\n');
  const statements = [...clean.matchAll(/alter table "poms"\."([a-z_]+)" add constraint "([a-z_0-9]+)" check [^\n]+;/g)].map(m => ({ table: m[1], constraint: m[2], SQL: m[0] }));
  if (check.exitCode === 0 && !clean.trim()) return { classification: [], result: 'clean', proposedSqlExecuted: false };
  assert.equal(check.exitCode, 1); assert.match(check.text, /changes detected/i);
  assert.deepEqual(statements.map(s => s.SQL).sort(), old.existingValidatedChecks.map(s => s.SQL).sort(), 'Exact complete known CHECK proposal set required');
  for (const statement of statements) {
    const reference = old.existingValidatedChecks.find(s => s.table === statement.table && s.constraint === statement.constraint);
    const current = before.catalog.constraints.filter(c => c.table_name === statement.table && c.conname === statement.constraint);
    assert.equal(current.length, 1); assert.deepEqual({ convalidated: current[0].convalidated, definition: current[0].definition }, reference.actual, 'Existing validated CHECK expression unchanged');
    clean = clean.replace(statement.SQL, '');
  }
  assert(clean.includes(old.existingBaselineComment.SQL)); clean = clean.replace(old.existingBaselineComment.SQL, '');
  const comment = (await db.query("select col_description('poms.lead_score_override'::regclass,attnum) comment from pg_attribute where attrelid='poms.lead_score_override'::regclass and attname='status'")).rows[0]; assert.deepEqual(comment, old.existingBaselineComment.actual);
  const markerDrop = 'drop table if exists "r3m_control"."marker" cascade;', schemaDrop = 'drop schema if exists "r3m_control";';
  const markerDropProposed = clean.includes(markerDrop), schemaDropProposed = clean.includes(schemaDrop);
  clean = clean.replace("set names 'utf8';", '').replace(markerDrop, '').replace(schemaDrop, '').trim();
  assert.equal(clean, '', 'Every emitted statement must be explicitly classified; never execute the dump');
  return { result: 'classified-existing-baseline-drift-and-tool-noise', classification: ['existing-baseline-drift: exact original low-privilege CHECK introspection proposals', 'existing-baseline-drift: unchanged lead_score_override.status comment', ...(markerDropProposed || schemaDropProposed ? ['tool-noise: owned QA marker outside product ORM metadata'] : [])], CHECKs: statements.length, exactKnownProposedSQLSet: true, actualValidatedConstraintExpressionsEqualArchived: true, existingComment: comment, markerDropProposed, schemaDropProposed, newUnclassifiedStatements: 0, proposedSqlExecuted: false };
}
let completed = false, failure = null;
try {
  for (const backend of ['nest', 'rust']) {
    const owner = await connect(backend, true), app = await connect(backend, false);
    try {
      const before = await snapshot(owner, backend, 'before');
      const visibility = {}; for (const [key, db] of [['owner', owner], ['app', app]]) visibility[key] = (await db.query("select count(*)::int count from information_schema.constraint_column_usage where table_schema='poms'")).rows[0].count;
      const check = run(backend, 'migration-check'), dump = run(backend, 'schema-dump');
      const after = await snapshot(owner, backend, 'after'); assert.deepEqual(after.catalog, before.catalog); assert.equal(after.rowsSha256, before.rowsSha256);
      const classification = await classify(owner, check, dump, before);
      const withoutText = x => { const { text, ...metadata } = x; return metadata; };
      receipts.push({ backend, before: { original: before.original, publicCatalog: before.publicCatalog, rowsSha256: before.rowsSha256 }, after: { original: after.original, publicCatalog: after.publicCatalog, rowsSha256: after.rowsSha256 }, visibility, check: withoutText(check), dump: withoutText(dump), classification, actualCatalogAndAll107TableRowsUnchanged: true });
      console.log(JSON.stringify({ backend, checkExit: check.exitCode, dumpExit: dump.exitCode, classification: classification.result, DDLExecuted: false }));
    } finally { await Promise.allSettled([owner.end(), app.end()]); }
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(receipts[0].before.publicCatalog.file)), JSON.parse(fs.readFileSync(receipts[1].before.publicCatalog.file)));
  completed = true;
} catch (e) { failure = { name: e.name, rawMessageOmitted: true }; fs.writeFileSync(privateOut + '/original-error.log', e.stack || String(e), { flag: 'wx', mode: 0o600 }); process.exitCode = 1; }
finally {
  try { guardCandidate(); guardNative(); assert.deepEqual(sources.map(p => pin(p.file)), sources); assert.deepEqual(cliPins.map(p => pin(p.file)), cliPins); }
  catch (e) { completed = false; failure = { name: e.name, rawMessageOmitted: true, sourceGuardFailed: true }; process.exitCode = 1; }
  fs.writeFileSync(out + '/report01.json', JSON.stringify({ kind: 'R3M-actual-readonly-original-CLI-schema-check', createdAt: new Date().toISOString(), completed, failure, sources, cliPins, receipts, bothSchemasCompared: completed, DDLExecuted: false, originalNxLauncherExecuted: false, originalInstalledLockedCliExecuted: true, expectedKnownMigrationCheckExitIsOneNotPass: true, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
}
