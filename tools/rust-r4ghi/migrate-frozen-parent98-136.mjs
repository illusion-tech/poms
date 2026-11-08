// Normal MikroORM forward migration, one fixed namespace database per process.
// This source is a proposal until the exact Source13 G2 approval file exists.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const N = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const REL = 'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs', TARGET = 'Migration20261108090000_rust_frozen_assignment_parent_lock';
const TS = 'apps/poms-api/src/migrations/' + TARGET + '.ts', SQL = 'docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql';
const TS_SHA = 'daf3656ec2a726c30ebaba8b0ba91945404f9b7a5848d8d293546bc3c7fa4916', SQL_SHA = '90b091eb36a7f58ae0cf3a9504b2426ea6de868a4bab9af5a2c1e6bd89e0106e';
const DBS = ['poms_r4ghi_native', 'poms_r4ghi_rust'], sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(fs.realpathSync(process.execPath), N); assert.deepEqual(process.execArgv, []);
assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH, 'No ambient Node preload or module remapping');
const args = process.argv.slice(2); assert(args.length === 3 && args[0] === '--database' && DBS.includes(args[1]) && args[2] === '--execute'); const database = args[1];
assert.deepEqual(process.argv, [N, R + '/' + REL, '--database', database, '--execute']);
const runner = { file: R + '/' + REL, rawBytesSha256: sha(fs.readFileSync(R + '/' + REL)) }, node = { file: N, rawBytesSha256: sha(fs.readFileSync(N)) };
const approvalFile = R + '/docs/design/rust-r4ghi/source13-g2-freeze136.json', approvalBytes = fs.readFileSync(approvalFile), approval = JSON.parse(approvalBytes);
assert.equal(approval.kind, 'Root-frozen-Source13-corrective-G2-136'); assert.equal(approval.G2Authorized, true); assert.equal(approval.actualM98Applied, false);
assert.deepEqual(approval.forwardMigration.databases, DBS); assert.equal(approval.forwardMigration.from, 97); assert.equal(approval.forwardMigration.to, 98);
assert.equal(approval.forwardMigration.name, TARGET); assert.equal(approval.forwardMigration.mechanism, 'programmatic-MikroORM-migrator-up-only'); assert.deepEqual(approval.forwardMigration.runner, runner); assert.deepEqual(approval.forwardMigration.node, node);
assert.equal(sha(fs.readFileSync(R + '/' + TS)), TS_SHA); assert.equal(sha(fs.readFileSync(R + '/' + SQL)), SQL_SHA);
assert.equal(approval.forwardMigration.migrationTS.rawBytesSha256, TS_SHA); assert.equal(approval.forwardMigration.migrationSQL.rawBytesSha256, SQL_SHA);
const identity = JSON.parse(fs.readFileSync('/home/wangzishi/.local/share/poms-r4ghi/identity.json'));
assert.equal(identity.namespace, 'poms-r4ghi'); assert.equal(identity.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f'); assert.equal(identity.port, 25434); assert.deepEqual(identity.databases, DBS);
const provision = JSON.parse(fs.readFileSync(R + '/tmp/rust-r4ghi/root/environment01/provision01.json'));
assert.equal(provision.marker, identity.marker); assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock'));
for (const port of [31441, 31442]) await new Promise((resolve, reject) => { const socket = net.createConnection({ host: '127.0.0.1', port }); socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Unknown listener status before migration')); });
  socket.once('connect', () => { socket.destroy(); reject(new Error('An API must not be running during the approved forward migration')); }); socket.once('error', e => e.code === 'ECONNREFUSED' ? resolve() : reject(e)); });
const require = createRequire('/home/wangzishi/projects/poms-rust-r4ghi/package.json'), { Migration, Migrator } = require('@mikro-orm/migrations'), { MikroORM } = require('@mikro-orm/postgresql'), ts = require('typescript');
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const passwordFile = P + '/owner-password', passwordStat = fs.lstatSync(passwordFile); assert(passwordStat.isFile() && !passwordStat.isSymbolicLink() && passwordStat.nlink === 1 && (passwordStat.mode & 0o077) === 0);
const password = fs.readFileSync(passwordFile, 'utf8'); assert(/^[a-f0-9]{64}$/.test(password));
const names = fs.readdirSync(R + '/apps/poms-api/src/migrations').filter(n => /^Migration\d{14}.*\.ts$/.test(n)).sort(); assert.equal(names.length, 98);
const migrations = names.map(name => { const file = 'apps/poms-api/src/migrations/' + name, bytes = fs.readFileSync(R + '/' + file), module = { exports: {} };
  assert.equal(approval.forwardMigration.inputs.find(p => p.file === file)?.rawBytesSha256, sha(bytes));
  const js = ts.transpileModule(bytes.toString(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { require: key => { assert.equal(key, '@mikro-orm/migrations'); return { Migration }; }, module, exports: module.exports }, { filename: name, timeout: 5000 });
  const classes = Object.values(module.exports); assert.equal(classes.length, 1); return { name: path.basename(name, '.ts'), class: classes[0] }; });
assert.equal(approval.forwardMigration.inputs.length, 98);
async function guard(c, count) { const row = (await c.query("SELECT current_database() db,current_user usr,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid")).rows[0];
  assert.deepEqual(row, { db: database, usr: 'poms_r0e_owner', port: '15432', version: '150012', isolated: 'on', oid: provision.databaseOids.find(d => d.database === database).oid });
  assert.deepEqual((await c.query('SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker')).rows, [{ instance_id: identity.marker, namespace: identity.namespace, source_base: identity.base }]);
  assert.equal((await c.query('SELECT count(*)::int n FROM poms.poms_migrations')).rows[0].n, count);
  assert.equal((await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r'")).rows[0].n, 139);
  assert.equal((await c.query('SELECT count(*)::int n FROM pg_stat_activity WHERE datname=ANY($1::text[]) AND usename=ANY($2::text[])', [DBS, ['poms_r4ghi_native_app', 'poms_r4ghi_rust_app']])).rows[0].n, 0);
}
const out = P + '/migration98-136/' + database; fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 }); fs.mkdirSync(out, { mode: 0o700 });
const artifact = (name, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = out + '/' + name; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { file, rawBytesSha256: sha(bytes) }; };
const intent = { kind: 'Root-fixed-only-up-M98-command136-intent', direction: 'up', database, migrationName: TARGET, argv: [...process.argv], runner, node,
  approval: { file: approvalFile, rawBytesSha256: sha(approvalBytes) }, migratorMethod: 'up', migratorOptions: { migrations: [TARGET] }, from: 97, to: 98 };
artifact('intent.json', intent); let orm;
try {
  const client = new Client({ host: '127.0.0.1', port: 25434, database, user: 'poms_r0e_owner', password, connectionTimeoutMillis: 8000 }); await client.connect(); try { await guard(client, 97); } finally { await client.end(); }
  orm = await MikroORM.init({ host: '127.0.0.1', port: 25434, dbName: database, user: 'poms_r0e_owner', password, schema: 'poms', entities: [], discovery: { warnWhenNoEntities: false }, extensions: [Migrator], ensureDatabase: false,
    debug: false, logger: () => {}, migrations: { migrationsList: migrations, tableName: 'poms_migrations', transactional: true, allOrNothing: true, safe: true, snapshot: false } });
  const actual = await orm.em.getConnection().execute('SELECT current_database() db,current_user usr,(SELECT instance_id::text FROM r4ghi_control.marker) marker'); assert.deepEqual(actual, [{ db: database, usr: 'poms_r0e_owner', marker: identity.marker }]);
  const pending = await orm.migrator.getPending(); assert.equal(pending.length, 1); assert.equal(pending[0].name, TARGET);
  const applied = await orm.migrator.up({ migrations: [TARGET] }); assert.equal(applied.length, 1); assert.equal(applied[0].name, TARGET); assert.equal((await orm.migrator.getExecuted()).length, 98);
  await orm.close(true); orm = null;
  const after = new Client({ host: '127.0.0.1', port: 25434, database, user: 'poms_r0e_owner', password, connectionTimeoutMillis: 8000 }); await after.connect(); try { await guard(after, 98); } finally { await after.end(); }
  const result = artifact('execution.json', { ...intent, kind: 'actual-fixed-only-up-M98-command136', pendingBefore: [TARGET], applied: [TARGET], executedAfter: 98, exitCode: 0 });
  console.log(JSON.stringify({ completed: true, database, direction: 'up', migrationName: TARGET, migrations: 98, execution: result, G3Certified: false }));
} catch (error) { artifact('failure.json', { ...intent, name: error.name, code: error.code ?? null, message: error.message, noBlindRetryAfterUnknownCommit: true }); console.error('M98 fixed-forward command failed; preserve private evidence and reconcile actual state.'); process.exitCode = 1; }
finally { if (orm) await orm.close(true); }
