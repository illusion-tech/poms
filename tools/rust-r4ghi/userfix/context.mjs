import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sha, quote, requireSafeSegment, keyOf } from './pure.mjs';

export const FIXED = Object.freeze({
  namespace: 'poms-r4ghi', base: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee',
  win: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror: '/home/wangzishi/projects/poms-rust-r4ghi',
  state: '/home/wangzishi/.local/share/poms-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner', databases: ['poms_r4ghi_native', 'poms_r4ghi_rust'],
  database: 'poms_r4ghi_rust', app: 'poms_r4ghi_rust_app', api: 'http://127.0.0.1:31441', origin: 'http://127.0.0.1:44551',
});
const SOURCE_FILES = ['docs/design/rust-r4ghi-user-create-fix-baseline.md', 'docs/design/rust-r4ghi/user-fix-online01.json',
  'apps/poms-api-rust/src/users/service.rs', 'apps/poms-api-rust/src/users/store.rs', 'apps/poms-api-rust/tests/users_database.rs',
  'apps/poms-api-rust/src/auth/service.rs', 'apps/poms-api-rust/src/auth/store.rs', 'apps/poms-api-rust/src/config.rs',
  'libs/shared/api-spec/openapi.json'];
function realFile(file) {
  const s = fs.lstatSync(file); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1, 'Private input must be a regular owned file');
  return fs.readFileSync(file);
}
export function createContext(options) {
  assert.equal(process.platform, 'linux', 'Execution only in the new Debian WSL namespace');
  const epoch = requireSafeSegment(options.epoch), run = requireSafeSegment(options.run);
  assert.equal(fs.realpathSync(FIXED.private), FIXED.private, 'No private-root redirection');
  const identity = JSON.parse(realFile(`${FIXED.state}/identity.json`));
  assert.equal(identity.namespace, FIXED.namespace); assert.equal(identity.base, FIXED.base);
  assert.equal(identity.container, 'poms-r4ghi-pg15'); assert.equal(identity.volume, 'poms-r4ghi-pg15-data');
  assert.deepEqual(identity.databases, FIXED.databases); assert.equal(identity.port, FIXED.port);
  const gate = JSON.parse(fs.readFileSync(`${FIXED.win}/docs/design/rust-r4ghi/user-fix-online01.json`));
  assert(gate.G1Certified && gate.G2Authorized && gate.issue === 115);
  const priv = `${FIXED.private}/userfix/${epoch}/${run}`;
  const out = `${FIXED.win}/tmp/rust-r4ghi/userfix/${epoch}/${run}`;
  for (const folder of [priv, out]) fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  assert.equal(fs.realpathSync(priv), priv);
  const stateFile = `${priv}/state.json`;
  const pins = SOURCE_FILES.map(file => ({ file, sha256: sha(fs.readFileSync(`${FIXED.win}/${file}`)) }));
  const state = fs.existsSync(stateFile) ? JSON.parse(realFile(stateFile)) : {
    schemaVersion: 1, namespace: FIXED.namespace, marker: identity.marker, epoch, run, createdAt: new Date().toISOString(),
    prefix: `uf${sha(epoch + ':' + run).slice(0, 10)}`, sequence: 0, actors: {}, owned: {}, fixtures: {}, sourcePins: pins,
  };
  assert.equal(state.marker, identity.marker); assert.equal(state.epoch, epoch); assert.equal(state.run, run);
  assert.deepEqual(state.sourcePins, pins, 'Frozen product inputs changed; use a new explicit epoch/run after review');
  const secret = realFile(`${FIXED.private}/owner-password`).toString(); assert(/^[a-f0-9]{64}$/.test(secret));
  const require = createRequire(`${FIXED.mirror}/package.json`);
  const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
  const ctx = { ...FIXED, identity, epoch, run, priv, out, state, options, pins, sequence: 0 };
  const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
  ctx.helperPins = fs.readdirSync(helperDirectory).filter(n => n.endsWith('.mjs')).sort().map(name => ({ file: `tools/rust-r4ghi/userfix/${name}`, sha256: sha(fs.readFileSync(path.join(helperDirectory, name))) }));
  ctx.persist = () => {
    const next = `${stateFile}.${randomUUID()}.tmp`;
    fs.writeFileSync(next, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    fs.renameSync(next, stateFile);
  };
  ctx.artifact = (name, value, publicValue = null) => {
    assert(!name.includes('/') && !name.includes('\\'));
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
    const file = `${priv}/${name}`; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
    const receipt = { file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
    if (publicValue) fs.writeFileSync(`${out}/${name}.receipt.json`, JSON.stringify({ ...publicValue, original: receipt, secretsPublished: false }, null, 2) + '\n', { flag: 'wx' });
    return receipt;
  };
  ctx.public = (name, value) => { assert(!name.includes('/') && !name.includes('\\')); fs.writeFileSync(`${out}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
  ctx.next = label => `${String(++state.sequence).padStart(5, '0')}-${requireSafeSegment(label)}`;
  ctx.client = async (database = FIXED.database) => {
    assert(FIXED.databases.includes(database));
    const c = new Client({ host: FIXED.host, port: FIXED.port, user: FIXED.owner, password: secret, database,
      application_name: `${state.prefix}-observer`, connectionTimeoutMillis: 8000, query_timeout: 45000, options: '-c statement_timeout=45000 -c lock_timeout=20000' });
    await c.connect();
    try { await guard(c, database, identity); } catch (e) { await c.end(); throw e; }
    return c;
  };
  ctx.db = async (fn, database = FIXED.database) => { const c = await ctx.client(database); try { return await fn(c); } finally { await c.end(); } };
  ctx.own = (database, table, row, proof) => {
    const key = keyOf(database, table, row.key), previous = state.owned[key];
    if (previous) { assert.equal(previous.birthKind, proof.kind ?? previous.birthKind); previous.latestSha256 = row.sha256; previous.latestProof = proof; }
    else state.owned[key] = { database, table, key: row.key, birthKind: proof.kind, firstSha256: row.sha256, latestSha256: row.sha256, proof, latestProof: proof };
    fs.appendFileSync(`${priv}/ownership.jsonl`, JSON.stringify({ at: new Date().toISOString(), key, rowSha256: row.sha256, proof }) + '\n', { mode: 0o600 });
    ctx.persist();
  };
  ctx.persist(); return ctx;
}
export async function guard(c, database, identity) {
  const { rows: [r] } = await c.query("SELECT current_database() db,current_user usr,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,current_setting('TimeZone') timezone,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid");
  assert.equal(r.db, database); assert.equal(r.usr, FIXED.owner); assert.equal(r.port, '15432');
  assert.equal(r.version, '150012'); assert.equal(r.isolated, 'on'); assert.equal(r.timezone, 'Etc/GMT-8');
  const { rows } = await c.query('SELECT instance_id::text,namespace,source_base FROM r4ghi_control.marker');
  assert.deepEqual(rows, [{ instance_id: identity.marker, namespace: FIXED.namespace, source_base: FIXED.base }]);
  return r;
}
export async function rawSelected(c, table, predicate, args, pk = ['id']) {
  assert(/^[a-z_]+$/.test(table));
  const result = await c.query(`SELECT row_to_json(t)::text raw,json_build_array(${pk.map(p => `t.${quote(p)}::text`).join(',')})::text key FROM poms.${quote(table)} t WHERE ${predicate} ORDER BY ${pk.map(p => `t.${quote(p)}`).join(',')}`, args);
  return result.rows.map(r => ({ key: JSON.parse(r.key), raw: r.raw, sha256: sha(r.raw) }));
}

