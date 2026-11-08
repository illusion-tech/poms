// Root current13 read-only observations. No createContext/persist/HTTP/DML/DDL.
// Both fresh captures precede the FS-only119 publisher. Root separately captures
// after publication too; this pair alone does not claim post-publication proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { FIXED, guard, sourcePins, ownedFile } from './business/context.mjs';
import { capture, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { sha } from './business/pure.mjs';
const R = FIXED.win, P = FIXED.private, D = P + '/business/g2-business13/main01', O = D + '/tool119-observe216-03';
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.deepEqual(process.argv.slice(2), ['--execute']);
assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.equal(FIXED.migrations, 98); assert.equal(FIXED.tables, 139); assert(!fs.existsSync(O));
const pin = (file, expected) => { const raw = ownedFile(file); if (expected) assert.equal(sha(raw), expected); return { file, bytes: raw.length, rawBytesSha256: sha(raw) }; };
const write = (file, value) => { const raw = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return pin(file); };
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'state-free-tool119-observation216-03' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const retained = JSON.parse(ownedFile(pin(P + '/source13-tool119-h0-215/receipt215.json', 'ce85e8a8f3ac77b779d064ecb56df8c57f75d1d995a5fc83a30df84306f0a9f5').file));
  const stateRaw = ownedFile(D + '/state.json'); assert.equal(sha(stateRaw), retained.beforeState.rawBytesSha256);
  const state = JSON.parse(stateRaw); assert.equal(state.epoch, 'g2-business13'); assert.equal(state.run, 'main01');
  assert(!state.toolAdmission119 && !state.activeFault && !state.blockedObservation && !state.cleaned && !state.cleanupPlan);
  const sourceInput = pin(P + '/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
  const helperInput = pin(P + '/source13-preparation183/helperH0.json', 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
  const sources = JSON.parse(ownedFile(sourceInput.file)), helpers = JSON.parse(ownedFile(helperInput.file)); assert.deepEqual(sourcePins(), sources); assert.deepEqual(state.sourcePins, sources);
  const verifyInputs = () => { assert.deepEqual(sourcePins(), sources); for (const item of [...sources, ...helpers]) assert.equal(sha(ownedFile(R + '/' + item.file)), item.sha256); assert.equal(fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, helpers.length); };
  verifyInputs();
  const identity = JSON.parse(ownedFile(FIXED.stateRoot + '/identity.json')); assert.equal(identity.namespace, FIXED.namespace); assert.equal(identity.marker, state.marker); assert.equal(identity.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f');
  assert.equal(identity.base, FIXED.base); assert.equal(identity.container, 'poms-r4ghi-pg15'); assert.equal(identity.volume, 'poms-r4ghi-pg15-data'); assert.equal(identity.port, 25434); assert.deepEqual(identity.databases, FIXED.databases);
  const provision = JSON.parse(ownedFile(R + '/tmp/rust-r4ghi/root/environment01/provision01.json')); assert.equal(provision.marker, identity.marker); assert.equal(provision.namespace, identity.namespace);
  const apiPin = pin(P + '/rust-api136-process.json', '0b5817a0f32f4ad12fce36a4035c59c06d852611f65891dec349e6eccf505f6f');
  const api = JSON.parse(ownedFile(apiPin.file)); assert.deepEqual(state.apiProcess.record, api); assert.equal(api.binarySha256, '2d9ed8f711818b83b1cff440b72265bcacf9ff2f31f409d2d7d5a9aabd346e13');
  const liveAPI = () => { const stat = fs.readFileSync('/proc/' + api.pid + '/stat', 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], api.startTime); assert.equal(fs.realpathSync('/proc/' + api.pid + '/exe'), api.binary); const binaryStat = fs.lstatSync(api.binary); assert(binaryStat.isFile() && !binaryStat.isSymbolicLink()); assert.equal(fs.realpathSync(api.binary), path.resolve(api.binary)); assert.equal(sha(fs.readFileSync(api.binary)), api.binarySha256); /* Cargo legitimately retains two hard links; source pins still require nlink1. */ }; liveAPI();
  const require = createRequire(FIXED.mirror + '/package.json'), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
  const password = ownedFile(P + '/owner-password').toString(); assert(/^[a-f0-9]{64}$/.test(password));
  fs.mkdirSync(O, { mode: 0o700 }); const entryState = write(O + '/entry-state-before119.json', stateRaw);
  const ctx = { ...FIXED, identity, provision, state, pins: sources, helperPins: helpers, epoch: state.epoch, run: state.run, priv: O };
  ctx.artifact = (name, value) => { assert.equal(path.basename(name), name);
    // Existing capture37 omits namespace; this new observation explicitly adds
    // the verified marker namespace before its first immutable write.
    return write(O + '/' + name, { ...value, namespace: FIXED.namespace, namespaceAnnotationProducer: 'state-free-tool119-observation216-03' }); };
  ctx.db = async (fn, database) => { assert(FIXED.databases.includes(database)); const client = new Client({ host: FIXED.host, port: FIXED.port, database, user: FIXED.owner, password,
    application_name: 'r4ghi-tool119-readonly216', connectionTimeoutMillis: 8000, query_timeout: 45000,
    options: '-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000' }); await client.connect();
    try { assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on'); await guard(ctx, client, database); return await fn(client); } finally { await client.end(); } };
  const before = await capture(ctx, 'tool119-before216'); assertRecorded(ctx, before);
  const after = await capture(ctx, 'tool119-after216'); assertRecorded(ctx, after);
  const counts = {};
  for (const database of FIXED.databases) {
    const a = before.databases[database], b = after.databases[database]; assert.deepEqual(a.meta, b.meta); assert.deepEqual(before.objects[database], after.objects[database]);
    assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables)); assert.equal(Object.keys(a.tables).length, 139);
    counts[database] = 0;
    for (const table of Object.keys(a.tables)) { const first = readRows(a.tables[table]), last = readRows(b.tables[table]); assert.deepEqual(first, last); counts[database] += first.length; }
  }
  verifyInputs(); liveAPI(); assert.deepEqual(ownedFile(D + '/state.json'), stateRaw);
  const receipt = write(O + '/receipt216-03.json', { kind: 'actual-state-free-current13-tool119-fresh-pair216', entryState, beforeSnapshot: before.manifest, afterSnapshot: after.manifest,
    sourcePins: sourceInput, helperH0: helperInput, apiProcess: apiPin, actualReadonlyConnections: true, fullRowsXminCatalogSequenceObjectsEqual: true, originalStateAndCounterUnchanged: true,
    source416AndH0Unchanged: true, counts, bothSnapshotsPrecedeFSPublication: true, post119PublicationObserved: false,
    SQLDMLOrDDL: false, HTTP: false, migrationsExecuted: false, G3Certified: false, G4Certified: false });
  console.log(JSON.stringify({ receipt, entryState, beforeSnapshot: before.manifest, afterSnapshot: after.manifest, counts, fullEquivalence: true, post119PublicationObserved: false, HTTPOrDMLExecuted: false }));
} catch (error) {
  if (!fs.existsSync(O)) fs.mkdirSync(O, { mode: 0o700 });
  const partial = write(O + '/partial216-03.json', { name: error.name, message: error.message, stack: error.stack, noBlindRetry: true });
  console.error(JSON.stringify({ completed: false, partial, noBlindRetry: true })); process.exitCode = 1;
} finally { const owner = JSON.parse(ownedFile(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
