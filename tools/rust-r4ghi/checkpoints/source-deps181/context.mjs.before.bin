import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { sha, segment, keyOf } from './pure.mjs';
import { assertAdmittedContext54 } from './consumer-admission54.mjs';

export const FIXED = Object.freeze({ namespace: 'poms-r4ghi', base: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee',
  win: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror: '/home/wangzishi/projects/poms-rust-r4ghi',
  stateRoot: '/home/wangzishi/.local/share/poms-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner', database: 'poms_r4ghi_rust',
  databases: ['poms_r4ghi_native', 'poms_r4ghi_rust'], apps: ['poms_r4ghi_native_app', 'poms_r4ghi_rust_app'],
  api: 'http://127.0.0.1:31441', origin: 'http://127.0.0.1:44551', tables: 139, migrations: 98 });

export function ownedFile(file) {
  const st = fs.lstatSync(file);
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1, 'Regular unlinked owned input required');
  assert.equal(fs.realpathSync(file), path.resolve(file), 'No input redirection');
  return fs.readFileSync(file);
}
const directFiles = ['docs/design/rust-r4ghi/acceptance-plan01.json', 'docs/design/rust-r4ghi/operation-map01.json',
  'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md',
  'docs/design/rust-r4ghi/g2-project-metadata-noop61.md',
  'docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql',
  'docs/design/rust-r4ghi/source13-g2-freeze136.json',
  'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs',
  'docs/design/rust-r4ghi/g1-online01.json', 'docs/design/rust-r4ghi/g2-corrective01.md',
  'docs/design/rust-r4ghi/g2-public-delta01.json', 'docs/design/rust-r4ghi/g2-public-delta02.json',
  'docs/design/rust-r4ghi/g2-public-delta03.json', 'docs/design/rust-r4ghi/user-decision-org-create04.json',
  'docs/design/rust-r4ghi/user-decision-period05.json', 'docs/design/rust-r4ghi/g2-initial-ownership03.sql',
  'docs/design/rust-r4ghi/initial-ownership-migration-promotion03.json',
  'docs/design/rust-r4ghi/migration-promotion01.json', 'docs/design/rust-r4ghi/attachment-migration-promotion02.json',
  'tools/rust-r4ghi/joint-g1/effective-v2/sources.json', 'tools/rust-r4ghi/joint-g1/effective-v2/scope-response-contract.json',
  'tools/rust-r4ghi/joint-g1/effective-v2/source-context.schema.json', 'tools/rust-r4ghi/joint-g1/effective-v2/policy-definition.json',
  'tools/rust-r2ef/e-authority.json', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock',
  'libs/shared/api-spec/openapi.json'];
function walk(root, suffix) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(root, e.name), suffix) : e.isFile() && suffix.some(s => e.name.endsWith(s)) ? [path.join(root, e.name)] : []).sort();
}
export function sourcePins() {
  const files = [...directFiles.map(f => `${FIXED.win}/${f}`), ...walk(`${FIXED.win}/apps/poms-api-rust/src`, ['.rs']),
    ...walk(`${FIXED.win}/apps/poms-api/src/migrations`, ['.ts']), ...walk(`${FIXED.win}/libs/shared/contracts/src`, ['.ts'])];
  return [...new Set(files)].sort().map(file => ({ file: path.relative(FIXED.win, file).split(path.sep).join('/'), sha256: sha(fs.readFileSync(file)) }));
}
export function createContext(options, admissionBootstrap = null) {
  assert.equal(process.platform, 'linux', 'Root execution only in owned Debian WSL');
  const epoch = segment(options.epoch), run = segment(options.run);
  assert.equal(fs.realpathSync(FIXED.private), FIXED.private);
  const identity = JSON.parse(ownedFile(`${FIXED.stateRoot}/identity.json`));
  for (const [key, value] of Object.entries({ namespace: FIXED.namespace, base: FIXED.base, container: 'poms-r4ghi-pg15', volume: 'poms-r4ghi-pg15-data', port: FIXED.port })) assert.equal(identity[key], value);
  assert.deepEqual(identity.databases, FIXED.databases);
  const gate = JSON.parse(fs.readFileSync(`${FIXED.win}/docs/design/rust-r4ghi/g1-online01.json`));
  assert(gate.G1Certified === true && gate.G2Authorized === true && gate.G3Certified !== true && gate.G4Certified !== true);
  assert.equal(gate.counts.total, 32); assert.equal(gate.inputCommit, '9e010077e3010ff09447e9d77cb1bf1f7adbf68d');
  assert.deepEqual([gate.counts.G, gate.counts.H, gate.counts.I, gate.counts.R5Minimum, gate.counts.newPublic], [9, 8, 11, 4, 3]);
  const provisionFile = options['provision-receipt'] ?? `${FIXED.win}/tmp/rust-r4ghi/root/environment01/provision01.json`;
  const provision = JSON.parse(ownedFile(provisionFile));
  assert.equal(provision.namespace, identity.namespace); assert.equal(provision.marker, identity.marker);
  assert.equal(provision.container, identity.container); assert.equal(provision.volume, identity.volume);
  assert(Array.isArray(provision.databaseOids) && provision.databaseOids.length === 2, 'Original namespace provision receipt with DB OIDs required');
  const priv = `${FIXED.private}/business/${epoch}/${run}`, out = `${FIXED.win}/tmp/rust-r4ghi/business/${epoch}/${run}`;
  for (const folder of [priv, out]) { fs.mkdirSync(folder, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(folder), folder); }
  const stateFile = `${priv}/state.json`, pins = sourcePins();
  const state = fs.existsSync(stateFile) ? JSON.parse(ownedFile(stateFile)) : { schemaVersion: 1, namespace: identity.namespace, marker: identity.marker, epoch, run,
    createdAt: new Date().toISOString(), prefix: `bg${sha(epoch + ':' + run).slice(0, 10)}`, sequence: 0, actors: {}, owned: {}, borrowed: {}, fixtures: {}, sourcePins: pins,
    ...(admissionBootstrap ? { admissionPending54: admissionBootstrap.admissionPlanSHA256 } : {}) };
  assert.equal(state.marker, identity.marker); assert.equal(state.epoch, epoch); assert.equal(state.run, run);
  assert.deepEqual(state.sourcePins, pins, 'Frozen source bytes changed: preserve this run and review a new input epoch');
  if (state.admissionPending54) assert.equal(admissionBootstrap?.admissionPlanSHA256, state.admissionPending54, 'Pending retained-data context is unavailable to ordinary drivers');
  if (admissionBootstrap) assert(/^[a-f0-9]{64}$/.test(admissionBootstrap.admissionPlanSHA256));
  if (!admissionBootstrap) assert(state.consumerAdmission54 && state.schemaComparison108, 'M98 may only consume retained data through explicit schema3 admission; never reset its business baseline');
  if (state.consumerAdmission54) assertAdmittedContext54({ ...FIXED, epoch, run, priv, state, pins });
  const password = ownedFile(`${FIXED.private}/owner-password`).toString(); assert(/^[a-f0-9]{64}$/.test(password));
  const require = createRequire(`${FIXED.mirror}/package.json`), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
  const ctx = { ...FIXED, identity, epoch, run, priv, out, state, options, pins, provision, require };
  const helperDir = path.dirname(fileURLToPath(import.meta.url));
  ctx.helperPins = fs.readdirSync(helperDir).filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => ({ file: `tools/rust-r4ghi/business/${n}`, sha256: sha(fs.readFileSync(path.join(helperDir, n))) }));
  ctx.persist = () => { const temp = `${stateFile}.${randomUUID()}.tmp`; fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, stateFile); };
  ctx.next = label => `${String(++state.sequence).padStart(6, '0')}-${segment(label)}`;
  ctx.artifact = (name, value, summary = null) => {
    assert.equal(path.basename(name), name); assert(!name.includes('\\'));
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
    const file = `${priv}/${name}`; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
    const receipt = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
    if (summary) ctx.public(`${name}.receipt.json`, { ...summary, original: receipt, secretsAndPayloadPublished: false });
    return receipt;
  };
  ctx.public = (name, value) => { assert.equal(path.basename(name), name); assert(!name.includes('\\')); fs.writeFileSync(`${out}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
  ctx.client = async (database = FIXED.database) => {
    assert(FIXED.databases.includes(database));
    const client = new Client({ host: FIXED.host, port: FIXED.port, user: FIXED.owner, password, database, application_name: `${state.prefix}-observer`, connectionTimeoutMillis: 8000,
      query_timeout: 45000, options: '-c statement_timeout=45000 -c lock_timeout=10000' });
    await client.connect(); try { await guard(ctx, client, database); } catch (e) { await client.end(); throw e; } return client;
  };
  ctx.db = async (fn, database = FIXED.database) => { const c = await ctx.client(database); try { return await fn(c); } finally { await c.end(); } };
  ctx.instant = async () => ctx.db(async c => (await c.query(`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') instant`)).rows[0].instant);
  ctx.own = (database, table, row, proof) => {
    const key = keyOf(database, table, row.key), previous = state.owned[key];
    if (previous) { previous.latestSha256 = row.sha256; previous.latestXmin = row.xmin; previous.latestProof = proof; }
    else state.owned[key] = { database, table, key: row.key, firstSha256: row.sha256, latestSha256: row.sha256, latestXmin: row.xmin, proof, latestProof: proof };
    fs.appendFileSync(`${priv}/ownership.jsonl`, JSON.stringify({ at: new Date().toISOString(), key, rowSha256: row.sha256, proof }) + '\n', { mode: 0o600 }); ctx.persist();
  };
  ctx.persist(); return ctx;
}
export async function guard(ctx, c, database) {
  const { rows: [r] } = await c.query("SELECT current_database() db,current_user usr,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,current_setting('TimeZone') timezone,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid");
  assert.equal(r.db, database); assert.equal(r.usr, FIXED.owner); assert.equal(r.port, '15432'); assert.equal(r.version, '150012'); assert.equal(r.isolated, 'on'); assert.equal(r.timezone, 'Etc/GMT-8');
  assert.equal(r.oid, ctx.provision.databaseOids.find(d => d.database === database)?.oid, 'DB OID changed since original provision');
  const { rows } = await c.query('SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker');
  assert.deepEqual(rows, [{ instance_id: ctx.identity.marker, namespace: FIXED.namespace, source_base: FIXED.base }]);
  const roles = (await c.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname', [[FIXED.owner, ...FIXED.apps]])).rows;
  assert.equal(roles.length, 3); for (const role of roles.filter(row => row.rolname !== FIXED.owner)) assert(!role.rolsuper && !role.rolcreatedb && !role.rolcreaterole && !role.rolreplication && !role.rolbypassrls);
  const migrations = await c.query('SELECT count(*)::int count FROM poms.poms_migrations'); assert.equal(migrations.rows[0].count, FIXED.migrations);
  return { ...r, roles };
}
