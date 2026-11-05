// ROOT EXECUTION CANDIDATE ONLY. Author must use --check, never execute modes.
// SQL business facts come only from original migrations/DatabaseSeeder and API.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import net from 'node:net';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = '/home/wangzishi/projects/poms-rust-r4def';
const WIN = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PARENT = '/home/wangzishi/.local/share/poms-r4def';
const STATE = '/home/wangzishi/.local/share/poms-r4def-precision56';
const PRIV = STATE + '/private';
const OUT = WIN + '/tmp/rust-r4def/root/precision56';
const RUNTIME = ROOT + '/tmp/rust-r4def/precision56-runtime';
const DB = 'poms_r4def_legacy_probe56', APP = 'poms_r4def_legacy_probe56_app';
const OWNER = 'poms_r0e_owner', NS = 'poms-r4def-precision56';
const BASE = '756d813c9578090fcf8e56821acce01b46b40420';
const PORT = 31343, PGPORT = 25433;
const BUNDLE_SHA = 'da0bc8804db5e5de3ee56f60d351238de604a2db709f3c0d2eaee76d5f7e0636';
const GUARD = 'R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite';
const IDENTITY = PRIV + '/identity56.json', PROCESS = PRIV + '/native-process56.json';
const require = createRequire(ROOT + '/package.json');
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const ts = require('typescript');
let phase = 'static-admission';
const mode = process.argv[2], action = process.argv[3];
assert.equal(process.platform, 'linux');
assert(['prepare', 'server', 'exercise', 'negative', 'cleanup', 'status'].includes(mode), 'Explicit owned probe mode required');
if (mode === 'server') assert(['start', 'status', 'stop'].includes(action));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: hash(b) }; };
const q = value => { assert(/^[a-z][a-z0-9_]*$/.test(value)); return '"' + value + '"'; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function writePrivate(file, value) {
    assert(file.startsWith(PRIV + '/') && !file.split('/').includes('..'));
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, Buffer.isBuffer(value) ? value : typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return pin(file);
}
function publicReceipt(name, value) {
    assert(/^[a-z0-9-]+$/.test(name)); fs.mkdirSync(OUT, { recursive: true });
    const file = OUT + '/' + name + '.json';
    fs.writeFileSync(file, JSON.stringify({ kind: 'precision56-owned-probe-tool-receipt', mode, at: new Date().toISOString(), namespace: NS, database: DB, ...value, businessAccepted: false, performanceClaimed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return pin(file);
}
function readRegular(file) {
    const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
    return fs.readFileSync(file, 'utf8');
}
function parentPassword() { const value = readRegular(PARENT + '/private/owner-password'); assert(/^[a-f0-9]{64}$/.test(value)); return value; }
function secret(name) { assert(['app-password', 'jwt-secret'].includes(name)); const value = readRegular(PRIV + '/' + name); assert(/^[a-f0-9]{64}$/.test(value)); return value; }
function identity() {
    const value = JSON.parse(readRegular(IDENTITY));
    assert.equal(value.namespace, NS); assert.equal(value.database, DB); assert.equal(value.appRole, APP); assert.equal(value.base, BASE); assert.equal(value.host, '127.0.0.1'); assert.equal(value.pgPort, PGPORT);
    assert(value.instanceId && value.parentMarker && value.databaseOid && value.appRoleOid); return value;
}
function podInspect() {
    const result = execFileSync('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'inspect', 'poms-r4def-pg15'], { encoding: 'utf8' });
    const container = JSON.parse(result)[0];
    assert.equal(container.Config.Labels['org.poms.scope'], 'poms-r4def'); assert.equal(container.Config.Labels['org.poms.base'], BASE); assert(container.State.Running);
    assert(container.Mounts.some(m => m.Name === 'poms-r4def-pg15-data'));
    assert(container.NetworkSettings.Ports['15432/tcp'].some(p => p.HostIp === '127.0.0.1' && p.HostPort === String(PGPORT))); return container.Id;
}
async function client(database, user = OWNER, password = parentPassword()) {
    assert(['postgres', 'poms_r4def_rust', DB].includes(database)); assert([OWNER, APP].includes(user));
    if (user === APP) assert.equal(database, DB);
    const c = new Client({ host: '127.0.0.1', port: PGPORT, database, user, password, application_name: 'poms-r4def-precision56', connectionTimeoutMillis: 10000, query_timeout: 30000 });
    await c.connect();
    try {
        const { rows: [s] } = await c.query("SELECT current_database() db,current_user::text principal,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated");
        assert.deepEqual(s, { db: database, principal: user, port: '15432', version: '150012', isolated: 'on' }); await c.query("SET timezone='UTC'"); return c;
    } catch (error) { await c.end(); throw error; }
}
async function parentGuard() {
    const p = JSON.parse(readRegular(PARENT + '/identity.json'));
    assert.equal(p.namespace, 'poms-r4def'); assert.equal(p.base, BASE); assert.equal(p.port, PGPORT); assert.equal(p.container, 'poms-r4def-pg15');
    const containerId = podInspect(), c = await client('poms_r4def_rust');
    try {
        await c.query('BEGIN READ ONLY');
        const { rows } = await c.query('SELECT instance_id::text,namespace,source_base FROM r4def_control.marker');
        assert.deepEqual(rows, [{ instance_id: p.marker, namespace: 'poms-r4def', source_base: BASE }]);
        await c.query('ROLLBACK'); return { marker: p.marker, containerId, base: BASE };
    } finally { await c.end(); }
}
async function probeClient() {
    const i = identity(); await parentGuard(); const c = await client(DB);
    try {
        const { rows: [d] } = await c.query('SELECT oid::text FROM pg_database WHERE datname=current_database()'); assert.equal(d.oid, i.databaseOid);
        const { rows } = await c.query('SELECT instance_id::text,namespace,source_base,parent_instance_id::text,parent_namespace FROM precision56_control.marker');
        assert.deepEqual(rows, [{ instance_id: i.instanceId, namespace: NS, source_base: BASE, parent_instance_id: i.parentMarker, parent_namespace: 'poms-r4def' }]);
        return c;
    } catch (error) { await c.end(); throw error; }
}
function migrationInputs() {
    const folder = WIN + '/apps/poms-api/src/migrations', names = fs.readdirSync(folder).filter(n => /^Migration.*\.ts$/.test(n)).sort();
    assert.equal(names.length, 94); assert.equal(names.at(-1), 'Migration20261104060000_rust_r4def_execution_cost.ts');
    return names.map(name => ({ name: name.slice(0, -3), file: folder + '/' + name, ...pin(folder + '/' + name) }));
}
async function migrate(include94) {
    const { Migration, Migrator } = await import(require.resolve('@mikro-orm/migrations'));
    const { MikroORM } = await import(require.resolve('@mikro-orm/postgresql'));
    const inputs = migrationInputs(), list = inputs.slice(0, include94 ? 94 : 93).map(input => {
        const module = { exports: {} };
        const context = vm.createContext({ module, exports: module.exports, require(name) { assert.equal(name, '@mikro-orm/migrations'); return { Migration }; } });
        vm.runInContext(ts.transpileModule(fs.readFileSync(input.file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context, { filename: input.file, timeout: 5000 });
        const classes = Object.values(module.exports); assert.equal(classes.length, 1); return { name: input.name, class: classes[0] };
    });
    const guard = await probeClient(); await guard.end();
    const orm = await MikroORM.init({ host: '127.0.0.1', port: PGPORT, dbName: DB, user: OWNER, password: parentPassword(), schema: 'poms', entities: [], discovery: { warnWhenNoEntities: false }, extensions: [Migrator], ensureDatabase: false, debug: false, logger: () => {}, migrations: { migrationsList: list, tableName: 'poms_migrations', transactional: true, allOrNothing: true, safe: true, snapshot: false } });
    try { const before = await orm.migrator.getExecuted(); assert.equal(before.length, include94 ? 93 : 0); const applied = await orm.migrator.up(); const after = await orm.migrator.getExecuted(); return { before: before.length, applied: applied.length, after: after.length, migrationPins: inputs }; }
    finally { await orm.close(true); }
}
function runtimeEnvironment(password, asOwner = false) {
    const key = secret('jwt-secret');
    return ['NODE_ENV=test', 'HOST=127.0.0.1', `PORT=${PORT}`, 'DB_CONNECT=true', 'DB_HOST=127.0.0.1', `DB_PORT=${PGPORT}`, `DB_DATABASE=${DB}`, `DB_USER=${asOwner ? OWNER : APP}`, `DB_PASSWORD=${password}`, 'DB_SCHEMA=poms', 'DB_DEBUG=false', 'MIGRATIONS_TABLE_NAME=poms_migrations', `JWT_SECRET=${key}`, `POMS_SECRET_KEY=${key}`, `ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY=${key}`, `IDENTITY_PROVIDER_SECRET_KEY=${key}`, `IDENTITY_PROVIDER_STATE_KEY=${key}`, 'CORS_ORIGIN=http://127.0.0.1:44451', `POMS_ATTACHMENT_LOCAL_ROOT=${STATE}/objects`].join('\n') + '\n';
}
async function oldColumnAndCounts(c) {
    const { rows: [state] } = await c.query("SELECT (SELECT count(*)::int FROM poms.poms_migrations) migrations,(SELECT count(*)::int FROM information_schema.tables WHERE table_schema='poms' AND table_type='BASE TABLE') tables");
    assert.deepEqual(state, { migrations: 93, tables: 113 });
    const { rows: [column] } = await c.query("SELECT numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='poms' AND table_name='expense_record' AND column_name='amount_including_tax'");
    assert.deepEqual(column, { numeric_precision: 15, numeric_scale: 4 }); return { ...state, ...column };
}
async function prepare() {
    phase = 'parent-namespace-admission'; const parent = await parentGuard();
    assert(!fs.existsSync(STATE), 'Never reuse/overwrite an existing precision56 scope');
    const admin = await client('postgres');
    try {
        assert.equal((await admin.query('SELECT oid FROM pg_database WHERE datname=$1', [DB])).rows.length, 0);
        assert.equal((await admin.query('SELECT oid FROM pg_roles WHERE rolname=$1', [APP])).rows.length, 0);
        migrationInputs();
        fs.mkdirSync(PRIV, { recursive: true, mode: 0o700 });
        writePrivate(PRIV + '/app-password', randomBytes(32).toString('hex')); writePrivate(PRIV + '/jwt-secret', randomBytes(32).toString('hex'));
        const intent = { namespace: NS, instanceId: randomUUID(), database: DB, appRole: APP, parentMarker: parent.marker, base: BASE, host: '127.0.0.1', pgPort: PGPORT, port: PORT, createdAt: new Date().toISOString() };
        writePrivate(PRIV + '/provision-intent56.json', intent);
        phase = 'create-owned-role-and-database'; const password = secret('app-password');
        await admin.query(`CREATE ROLE ${q(APP)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
        const { rows: [role] } = await admin.query('SELECT oid::text,rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=$1', [APP]);
        writePrivate(PRIV + '/created-role56.json', role);
        await admin.query(`CREATE DATABASE ${q(DB)} OWNER ${q(OWNER)}`);
        const { rows: [database] } = await admin.query('SELECT oid::text,datname FROM pg_database WHERE datname=$1', [DB]); writePrivate(PRIV + '/created-database56.json', database);
        const probe = await client(DB);
        try {
            await probe.query('BEGIN');
            await probe.query('CREATE SCHEMA precision56_control');
            await probe.query('CREATE TABLE precision56_control.marker(instance_id uuid PRIMARY KEY,namespace text NOT NULL,source_base text NOT NULL,parent_instance_id uuid NOT NULL,parent_namespace text NOT NULL)');
            // Infrastructure ownership marker, never a POMS business producer.
            await probe.query('INSERT INTO precision56_control.marker VALUES($1,$2,$3,$4,$5)', [intent.instanceId, NS, BASE, parent.marker, 'poms-r4def']);
            await probe.query('COMMIT');
        } finally { await probe.end(); }
        writePrivate(IDENTITY, { ...intent, databaseOid: database.oid, appRoleOid: role.oid, parentContainerId: parent.containerId });
    } finally { await admin.end(); }
    phase = 'original-first93-migrations'; const migrations = await migrate(false); assert.equal(migrations.after, 93);
    writePrivate(PRIV + '/migrations93-original.json', migrations);
    phase = 'original-DatabaseSeeder';
    const seedSource = ROOT + '/apps/poms-api/src/seeders/database.seeder.ts'; assert(fs.statSync(seedSource).isFile());
    writePrivate(PRIV + '/seed-owner.env', runtimeEnvironment(parentPassword(), true));
    writePrivate(PRIV + '/native-app.env', runtimeEnvironment(secret('app-password')));
    const env = { PATH: path.dirname(process.execPath) + ':/usr/bin:/bin', HOME: process.env.HOME, USER: process.env.USER, LANG: 'C.UTF-8', POMS_ENV_FILE: PRIV + '/seed-owner.env', NODE_ENV: 'test', DB_CONNECT: 'true', DB_HOST: '127.0.0.1', DB_PORT: String(PGPORT), DB_DATABASE: DB, DB_USER: OWNER, DB_PASSWORD: parentPassword(), DB_SCHEMA: 'poms', MIKRO_ORM_CLI_TS_CONFIG_PATH: 'tsconfig.base.json', NX_DAEMON: 'false' };
    const seedOut = fs.openSync(PRIV + '/original-seeder-stdout.bin', 'wx', 0o600), seedErr = fs.openSync(PRIV + '/original-seeder-stderr.bin', 'wx', 0o600);
    let result; try { result = spawnSync(process.execPath, [ROOT + '/node_modules/@mikro-orm/cli/cli.js', 'seeder:run', '--config', 'apps/poms-api/src/mikro-orm.config.ts'], { cwd: ROOT, env, stdio: ['ignore', seedOut, seedErr], timeout: 180000 }); } finally { fs.closeSync(seedOut); fs.closeSync(seedErr); }
    assert.equal(result.status, 0, 'Original DatabaseSeeder must succeed; inspect new private originals only');
    const c = await probeClient(); let facts;
    try {
        facts = await oldColumnAndCounts(c);
        await c.query(`GRANT CONNECT ON DATABASE ${q(DB)} TO ${q(APP)}`);
        await c.query(`GRANT USAGE ON SCHEMA poms,precision56_control TO ${q(APP)}`);
        await c.query(`GRANT SELECT ON precision56_control.marker TO ${q(APP)}`);
        await c.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA poms TO ${q(APP)}`);
        await c.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA poms TO ${q(APP)}`);
    } finally { await c.end(); }
    writePrivate(PRIV + '/prepare-complete56.json', { identity: identity(), originalSeeder: pin(seedSource), migrations: migrations.after, facts });
    publicReceipt('prepare56', { parent, identity: identity(), facts, originalSeeder: pin(seedSource), migrationPins: migrations.migrationPins, modeSucceeded: true });
}
function processStat(pid) {
    try { const value = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); const fields = value.slice(value.lastIndexOf(')') + 2).split(' '); return { start: fields[19], state: fields[0] }; } catch { return null; }
}
function ownProcess() {
    const i = identity(), record = JSON.parse(readRegular(PROCESS));
    assert.equal(record.namespace, NS); assert.equal(record.instanceId, i.instanceId); assert.equal(record.databaseOid, i.databaseOid); assert.equal(record.port, PORT); assert.equal(record.wrapper, RUNTIME + '/loopback.cjs'); assert.equal(record.bundleSha256, BUNDLE_SHA);
    const now = processStat(record.pid);
    if (now) {
        assert.equal(now.start, record.startTime, 'Do not signal a reused PID');
        if (now.state !== 'Z') assert(fs.readFileSync(`/proc/${record.pid}/cmdline`, 'utf8').split('\0').includes(record.wrapper), 'Only the owned precision56 launcher may be signaled');
    }
    return { ...record, alive: !!now && now.state !== 'Z' };
}
async function stopServer() {
    if (!fs.existsSync(PROCESS)) return { ownedProcessStarted: false, alive: false };
    const p = ownProcess();
    if (p.alive) { process.kill(p.pid, 'SIGTERM'); for (let n = 0; n < 120 && ownProcess().alive; n++) await sleep(125); }
    const after = ownProcess(); assert(!after.alive, 'Owned Native did not stop; no forced unrelated termination'); return after;
}
async function server() {
    const guard = await probeClient(); try { await oldColumnAndCounts(guard); } finally { await guard.end(); }
    if (action === 'status') { console.log(JSON.stringify(fs.existsSync(PROCESS) ? ownProcess() : { namespace: NS, started: false })); return; }
    if (action === 'stop') { const p = await stopServer(); publicReceipt('server-stopped56', { process: p, modeSucceeded: true }); return; }
    assert(fs.existsSync(PRIV + '/prepare-complete56.json')); assert(!fs.existsSync(PROCESS), 'Never overwrite an owned process identity');
    await new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(PORT, '127.0.0.1', () => s.close(resolve)); });
    const bundle = fs.readFileSync(WIN + '/dist/apps/poms-api/main.js'); assert.equal(hash(bundle), BUNDLE_SHA, 'Use the exact unmodified build50 Native bundle');
    assert(!fs.existsSync(RUNTIME)); fs.mkdirSync(RUNTIME, { recursive: true });
    fs.writeFileSync(RUNTIME + '/scope56.json', JSON.stringify({ namespace: NS, instanceId: identity().instanceId, database: DB }) + '\n', { flag: 'wx' });
    fs.writeFileSync(RUNTIME + '/main.cjs', bundle, { flag: 'wx' });
    fs.writeFileSync(RUNTIME + '/loopback.cjs', `const net=require('node:net');const original=net.Server.prototype.listen;net.Server.prototype.listen=function(...args){const port=typeof args[0]==='object'?args[0].port:args[0];if(Number(port)!==${PORT})throw Error('Unexpected precision56 fixture listener');if(typeof args[0]==='object')args[0]={...args[0],host:'127.0.0.1'};else args.splice(1,0,'127.0.0.1');return original.apply(this,args)};require('./main.cjs');\n`, { flag: 'wx' });
    const stdout = fs.openSync(PRIV + '/native-stdout-original.bin', 'wx', 0o600), stderr = fs.openSync(PRIV + '/native-stderr-original.bin', 'wx', 0o600);
    const child = spawn(process.execPath, [RUNTIME + '/loopback.cjs'], { cwd: ROOT, env: { PATH: path.dirname(process.execPath) + ':/usr/bin:/bin', HOME: process.env.HOME, USER: process.env.USER, LANG: 'C.UTF-8', POMS_ENV_FILE: PRIV + '/native-app.env' }, detached: true, stdio: ['ignore', stdout, stderr] }); child.unref(); fs.closeSync(stdout); fs.closeSync(stderr);
    let stat; for (let n = 0; n < 20 && !stat; n++) { stat = processStat(child.pid); if (!stat) await sleep(25); }
    assert(stat?.start);
    const record = { namespace: NS, instanceId: identity().instanceId, database: DB, databaseOid: identity().databaseOid, pid: child.pid, startTime: stat.start, wrapper: RUNTIME + '/loopback.cjs', bundleSha256: BUNDLE_SHA, port: PORT, host: '127.0.0.1', startedAt: new Date().toISOString() };
    writePrivate(PROCESS, record);
    let ready = false; for (let n = 0; n < 120 && ownProcess().alive; n++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.status === 200) { ready = true; break; } } catch {} await sleep(250); }
    assert(ready, 'Owned Native readiness failed; no product response is mocked');
    publicReceipt('server56', { process: record, readiness: 200, testLauncherOnlyLoopback: true, businessResponsesMocked: false, modeSucceeded: true });
}
async function snapshot(label) {
    assert(/^[a-z0-9-]+$/.test(label)); const c = await probeClient();
    try {
        await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'); const facts = await oldColumnAndCounts(c);
        const { rows: tables } = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='poms' AND table_type='BASE TABLE' ORDER BY table_name COLLATE \"C\""); assert.equal(tables.length, 113);
        const graph = {}, tableDigests = [];
        for (const { table_name: table } of tables) { const { rows } = await c.query(`SELECT to_jsonb(t)::text row FROM poms.${q(table)} t ORDER BY to_jsonb(t)::text COLLATE "C"`); graph[table] = rows.map(r => r.row); tableDigests.push({ table, count: rows.length, rawStringsSha256: hash(JSON.stringify(graph[table]) + '\n') }); }
        const ddl = {};
        ddl.columns = (await c.query("SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_expression,a.attidentity,a.attgenerated FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='poms' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname COLLATE \"C\",a.attnum")).rows;
        ddl.constraints = (await c.query("SELECT c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid,true) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname COLLATE \"C\",k.conname COLLATE \"C\"")).rows;
        ddl.indexes = (await c.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='poms' ORDER BY tablename COLLATE \"C\",indexname COLLATE \"C\"")).rows;
        ddl.triggers = (await c.query("SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND NOT t.tgisinternal ORDER BY c.relname COLLATE \"C\",t.tgname COLLATE \"C\"")).rows;
        ddl.functions = (await c.query("SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='poms' AND p.prokind IN('f','p') ORDER BY p.proname COLLATE \"C\",pg_get_function_identity_arguments(p.oid) COLLATE \"C\"")).rows;
        ddl.enums = (await c.query("SELECT t.typname,e.enumlabel,e.enumsortorder::text FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='poms' ORDER BY t.typname COLLATE \"C\",e.enumsortorder")).rows;
        ddl.views = (await c.query("SELECT c.relname,c.relkind,pg_get_viewdef(c.oid,true) definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind IN('v','m') ORDER BY c.relname COLLATE \"C\"")).rows;
        ddl.sequences = (await c.query("SELECT c.relname,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,s.seqcache::text,s.seqcycle FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname COLLATE \"C\"")).rows;
        const witness = JSON.parse(readRegular(PRIV + '/expense-api-produced56.json'));
        const { rows: [expense] } = await c.query('SELECT to_jsonb(e)||jsonb_build_object(\'amount_including_tax\',e.amount_including_tax::text) value FROM poms.expense_record e WHERE id=$1 AND project_id=$2', [witness.expenseId, witness.projectId]);
        assert.equal(expense?.value.amount_including_tax, '10.1230'); await c.query('ROLLBACK');
        const graphFile = writePrivate(PRIV + '/snapshots/' + label + '-all113-original-strings.json', graph), ddlFile = writePrivate(PRIV + '/snapshots/' + label + '-ddl-original.json', ddl);
        const result = { facts, graphFile, ddlFile, tableDigests, allRowsSignature: hash(JSON.stringify(tableDigests)), ddlSignature: hash(JSON.stringify(ddl)), witness: expense.value, ledgerSignature: hash(JSON.stringify(graph.poms_migrations)) };
        writePrivate(PRIV + '/snapshots/' + label + '-receipt.json', result); return result;
    } finally { await c.end(); }
}
async function exercise() {
    assert(fs.existsSync(PRIV + '/prepare-complete56.json')); assert(!fs.existsSync(PRIV + '/exercise-intent56.json')); const p = ownProcess(); assert(p.alive);
    const c = await probeClient(); try { await oldColumnAndCounts(c); } finally { await c.end(); }
    writePrivate(PRIV + '/exercise-intent56.json', { at: new Date().toISOString(), process: p, noAutomaticReplay: true });
    const spec = JSON.parse(fs.readFileSync(WIN + '/libs/shared/api-spec/openapi.json', 'utf8'));
    const ops = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, op]) => op.operationId).map(([method, op]) => [op.operationId, { method: method.toUpperCase(), template }])));
    const cookies = {}, receipts = []; let sequence = 0;
    async function api(operationId, body = null, key = null, query = {}) {
        const operation = ops.get(operationId); assert(operation); let concrete = operation.template;
        for (const match of concrete.matchAll(/\{([^}]+)\}/g)) { assert(typeof key === 'string' && key); concrete = concrete.replace(match[0], encodeURIComponent(key)); }
        const url = new URL(`http://127.0.0.1:${PORT}` + concrete); assert.equal(url.origin, `http://127.0.0.1:${PORT}`); for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
        const requestId = `precision56-${++sequence}-${randomUUID().slice(0, 8)}`, headers = { Origin: 'http://127.0.0.1:44451', 'X-Request-Id': requestId };
        if (Object.keys(cookies).length) headers.Cookie = Object.entries(cookies).map(([key, value]) => key + '=' + value).join('; ');
        if (operation.method !== 'GET' && cookies.poms_csrf) headers['X-CSRF-Token'] = decodeURIComponent(cookies.poms_csrf);
        if (body !== null) headers['Content-Type'] = 'application/json';
        const response = await fetch(url, { method: operation.method, headers, body: body === null ? undefined : JSON.stringify(body), redirect: 'manual' }); const text = await response.text(); let value; try { value = text ? JSON.parse(text) : null; } catch { value = text; }
        for (const raw of response.headers.getSetCookie()) { const pair = raw.split(';', 1)[0], at = pair.indexOf('='); if (at > 0) { const name = pair.slice(0, at); if (/max-age=0/i.test(raw)) delete cookies[name]; else cookies[name] = pair.slice(at + 1); } }
        const original = writePrivate(PRIV + '/http/' + String(sequence).padStart(3, '0') + '-original.json', { operationId, url: url.href, method: operation.method, requestId, headers, body, status: response.status, responseHeaders: [...response.headers], text });
        receipts.push({ operationId, method: operation.method, path: url.pathname, requestId, status: response.status, original });
        assert(response.status >= 200 && response.status < 300, 'Real Native API failed; never SQL-patch business rows'); return { status: response.status, value: value?.data ?? value };
    }
    await api('AuthController_getCsrfToken'); await api('AuthController_createPasswordAuthSession', { username: 'admin', password: 'admin123' });
    const session = (await api('AuthController_getCurrentAuthSession')).value, user = session.user ?? session.currentUser ?? session;
    const actorId = user.id ?? user.userId ?? user.sub, permissions = user.permissions ?? session.permissions; assert(typeof actorId === 'string' && Array.isArray(permissions) && permissions.includes('contract:finance:manage'));
    const customer = (await api('CustomerController_create', { displayName: 'Precision56真实Native客户', ownerUserId: actorId, sourceChannel: 'precision56-real-api' })).value; assert(customer.id);
    const project = (await api('ProjectController_create', { projectName: 'Precision56真实旧协议精度探针项目', customerId: customer.id, customerProjectNo: 'precision56', currentStage: 'commercial-closure' })).value; assert(project.id);
    const category = (await api('DictionaryController_create', { domain: 'expense-category', code: 'precision56-subcent', name: 'Precision56真实精度探针费用', description: '独立DB93旧协议API见证，不用于业务结算', sortOrder: 9999 })).value;
    const categories = (await api('DictionaryController_list', null, null, { domain: 'expense-category', status: 'active' })).value;
    assert(Array.isArray(categories) && categories.some(row => row.code === category.code && row.status === 'active'));
    const result = await api('ProjectCostController_createExpenseRecord', { expenseCategory: category.code, expenseDescription: 'Precision56真实旧Native API保存10.123见证', expenseDate: '2026-11-04', currency: 'CNY', amountIncludingTax: '10.123', taxAmount: null, amountExcludingTax: null, sourceType: 'manual', evidenceSummary: '只在独立probe DB93运行；禁止SQL更改金额', attachmentCount: 0 }, project.id);
    assert.equal(result.status, 201); assert(result.value.id);
    const proof = await probeClient(); let row;
    try { await oldColumnAndCounts(proof); row = (await proof.query("SELECT id::text,project_id::text,expense_description,amount_including_tax::text AS amount,status FROM poms.expense_record WHERE id=$1 AND project_id=$2", [result.value.id, project.id])).rows[0]; assert(row); assert.equal(row.amount, '10.1230', 'If actual old API/ORM/DB rejected or quantized precision, STOP; no SQL workaround'); assert.equal(row.status, 'recorded'); }
    finally { await proof.end(); }
    writePrivate(PRIV + '/expense-api-produced56.json', { expenseId: row.id, projectId: project.id, customerId: customer.id, categoryId: category.id, actorId, exactPGAmount: row.amount, status201: true, SQLBusinessRowInsertedByTool: false, receipts });
    const preserved = await snapshot('after-real-api');
    publicReceipt('exercise56', { modeSucceeded: true, producer: 'actual frozen Native HTTP only', expenseId: row.id, projectId: project.id, exactSyntheticPGAmount: row.amount, HTTPReceipts: receipts, snapshot: { facts: preserved.facts, graphFile: preserved.graphFile, ddlFile: preserved.ddlFile, allRowsSignature: preserved.allRowsSignature, ddlSignature: preserved.ddlSignature }, routeStillNotMigrationAcceptance: true });
}
async function negative() {
    assert(fs.existsSync(PRIV + '/expense-api-produced56.json')); assert(!fs.existsSync(PRIV + '/negative-intent56.json'));
    const stopped = await stopServer(); assert(!stopped.alive); writePrivate(PRIV + '/negative-intent56.json', { at: new Date().toISOString(), ownNativeStopped: stopped, migration94: migrationInputs().at(-1) });
    phase = 'preserve-after-stop-before94'; const before = await snapshot('before94');
    phase = 'formal-whole-migration94'; let error;
    try { await migrate(true); } catch (failure) { error = failure; }
    assert(error, '94 unexpectedly succeeded; preserve all evidence and stop');
    const errorOriginal = writePrivate(PRIV + '/migration94-error-original.log', error.stack ?? String(error));
    assert((error.stack ?? String(error)).includes(GUARD), 'Wrong failure is not a precision-guard pass');
    phase = 'read-only-after94-rollback'; const after = await snapshot('after94');
    assert.equal(after.allRowsSignature, before.allRowsSignature, 'All113 original row strings must be unchanged');
    assert.equal(after.ddlSignature, before.ddlSignature, 'All captured DDL signatures must be unchanged'); assert.equal(after.ledgerSignature, before.ledgerSignature); assert.deepEqual(after.witness, before.witness); assert.equal(after.witness.amount_including_tax, '10.1230');
    const result = { ownNativeStopped: stopped, guardMessageObserved: GUARD, errorOriginal, original93Facts: before.facts, afterFacts: after.facts, before: { graphFile: before.graphFile, ddlFile: before.ddlFile, allRowsSignature: before.allRowsSignature, ddlSignature: before.ddlSignature, ledgerSignature: before.ledgerSignature }, after: { graphFile: after.graphFile, ddlFile: after.ddlFile, allRowsSignature: after.allRowsSignature, ddlSignature: after.ddlSignature, ledgerSignature: after.ledgerSignature }, exactOriginalSyntheticAmount: '10.1230', all113TablesRowsDDLAndLedger93Unchanged: true, probeGuardRollbackVerified: true };
    writePrivate(PRIV + '/negative-verified56.json', result); publicReceipt('negative56', result);
}
async function cleanup() {
    const i = identity(); await parentGuard(); const stopped = await stopServer(); assert(!stopped.alive);
    const probe = await probeClient(); await probe.end(); const c = await client('postgres');
    try {
        const d = (await c.query('SELECT oid::text FROM pg_database WHERE datname=$1', [DB])).rows[0]; assert.equal(d?.oid, i.databaseOid);
        const role = (await c.query('SELECT oid::text,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=$1', [APP])).rows[0]; assert.equal(role?.oid, i.appRoleOid); assert(!role.rolsuper && !role.rolcreatedb && !role.rolcreaterole && !role.rolbypassrls);
        const sessions = (await c.query('SELECT pid,usename,application_name FROM pg_stat_activity WHERE datname=$1', [DB])).rows;
        assert.equal(sessions.length, 0, 'Probe sessions remain; refuse cleanup without stopping explicitly owned clients');
        await c.query(`DROP DATABASE ${q(DB)}`); await c.query(`DROP ROLE ${q(APP)}`);
        assert.equal((await c.query('SELECT oid FROM pg_database WHERE datname=$1', [DB])).rows.length, 0); assert.equal((await c.query('SELECT oid FROM pg_roles WHERE rolname=$1', [APP])).rows.length, 0);
    } finally { await c.end(); }
    publicReceipt('cleanup56', { ownedDatabaseOid: i.databaseOid, ownedRoleOid: i.appRoleOid, removedOnlyDatabase: DB, removedOnlyRole: APP, privateAndRuntimeOriginalsPreserved: true, recursiveDeleteUsed: false, forcedSessionTerminationUsed: false, modeSucceeded: true });
}
try {
    if (mode === 'prepare') await prepare();
    if (mode === 'server') await server();
    if (mode === 'exercise') { phase = 'real-Native-API-producer'; await exercise(); }
    if (mode === 'negative') await negative();
    if (mode === 'cleanup') { phase = 'owned-only-cleanup'; await cleanup(); }
    if (mode === 'status') { const c = await probeClient(); try { console.log(JSON.stringify({ namespace: NS, identity: identity(), facts: await oldColumnAndCounts(c), process: fs.existsSync(PROCESS) ? ownProcess() : { started: false }, businessAccepted: false })); } finally { await c.end(); } }
    if (mode !== 'status' && !(mode === 'server' && action === 'status')) console.log(JSON.stringify({ mode, action: action ?? null, modeSucceeded: true, namespace: NS, database: DB, businessAccepted: false, credentialsPrinted: false }));
} catch (error) {
    let original = null;
    if (fs.existsSync(PRIV) && fs.existsSync(PRIV + '/provision-intent56.json')) { try { original = writePrivate(PRIV + '/failure-' + Date.now() + '.log', error.stack ?? String(error)); } catch {} }
    console.error(JSON.stringify({ mode, phase, modeSucceeded: false, errorName: error.name, errorCode: error.code ?? null, original, businessAccepted: false, credentialsPrinted: false, noAutomaticReplay: true })); process.exitCode = 1;
}
