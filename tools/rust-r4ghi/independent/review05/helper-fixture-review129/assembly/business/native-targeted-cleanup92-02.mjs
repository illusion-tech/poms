// Root-only cleanup for one completed Native phase. No HTTP/process/producer API.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
export const TARGET92_02 = Object.freeze({ phaseRun: 'source12-native01', database: 'poms_r4ghi_native', table: 'auth_session', id: '24a89525-deff-4fe1-a871-2df3ab1b203e',
  oldPlanSHA256: '8856601ec2992e7540954627504714366d25251660c1d9e56317505c20cf8f01', proof17SHA256: 'fd95fd07f45984786a55bd9f50be1698e1df5fe93982d55169778211c89ab284',
  originalStateSHA256: 'f103aab760cd393c9350ce617cddfc9410db158db2ee2fe7328930e2d986b343', rowSHA256: '5603cbb3528d2bfac0f920c96509e5795bac0da4a18f5f1ecce575366565aa3b', xmin: '4393' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function read(pin) { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), pin.file); const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes); }
const filePin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
function rows(table) { const bytes = fs.readFileSync(table.file); assert.equal(sha(bytes), table.rawBytesSha256); return bytes.toString().split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return row; }); }
export function verifyBirth92_02({ owned, login, headers, beforeRows, afterRows }, expected = TARGET92_02) {
  assert.equal(owned.database, expected.database); assert.equal(owned.table, 'auth_session'); assert.deepEqual(owned.key, [expected.id]); assert(!owned.deleted);
  const proof = owned.proof; assert.equal(proof.kind, 'HTTP-real-response-ID'); assert.equal(proof.responsePointer, 'HTTP-real-cookie-token-hash'); assert.equal(proof.id, expected.id);
  assert.equal(proof.operationId, 'AuthController_createPasswordAuthSession'); assert.equal(proof.requestId, login.attempt.requestId); assert.equal(proof.status, 200); assert.equal(proof.responseComplete, true); assert.equal(proof.beforeAbsent, true);
  assert.equal(login.attempt.status, 200); assert.equal(login.attempt.responseComplete, true); assert.equal(login.attempt.transportFailure, false); assert.equal(login.attempt.operationId, proof.operationId);
  assert.equal(login.attempt.transport, 'actual-Native-reference31442-not-Rust'); assert.deepEqual(proof.beforeSnapshot, login.before); assert.deepEqual(proof.afterSnapshot, login.after);
  assert.equal(headers.status, 200); const cookies = [];
  for (let i = 0; i < headers.rawHeaders.length; i += 2) if (headers.rawHeaders[i].toLowerCase() === 'set-cookie') {
    const first = headers.rawHeaders[i + 1].split(';', 1)[0], at = first.indexOf('='); if (first.slice(0, at) === 'poms_session') cookies.push(decodeURIComponent(first.slice(at + 1)));
  }
  assert.equal(cookies.length, 1); assert(cookies[0]); const tokenHash = sha(cookies[0]);
  assert(!beforeRows.some(row => row.key[0] === expected.id)); const beforeKeys = new Set(beforeRows.map(row => JSON.stringify(row.key)));
  const born = afterRows.filter(row => !beforeKeys.has(JSON.stringify(row.key))); assert.equal(born.length, 1);
  const row = born[0], value = JSON.parse(row.raw); assert.deepEqual(row.key, [expected.id]); assert.equal(sha(row.raw), row.sha256); assert.equal(value.id, expected.id);
  assert.equal(value.token_hash, tokenHash); assert.equal(value.user_id, login.attempt.actorId); assert.equal(value.user_id, login.attempt.body.user.id); assert.equal(value.status, 'active');
  assert.equal(owned.firstSha256, row.sha256); assert.equal(row.sha256, expected.rowSHA256); assert.equal(row.xmin, expected.xmin);
  // The label is a cookie-derived second-pass anchor, not a JSON session-ID claim.
  return { id: expected.id, tokenHash, birthRowSHA256: row.sha256, birthXmin: row.xmin, responseJSONSessionIDClaimed: false, cookieDerivedAnchorTupleVerified: true };
}
export function consume44Metadata92_02(state, orphanPin, newPlanPin) {
  assert.equal(state.planSHA256, TARGET92_02.oldPlanSHA256); assert.equal(state.phase, 'complete'); assert.equal(state.sequence, 43); assert.equal(state.sessionId, TARGET92_02.id);
  assert(!state.cleanupIntent && !state.cleanup92_02 && !state.blockedObservation);
  const next = structuredClone(state); next.sequence = 44; next.cleanup92_02 = { kind: 'explicit-new-cleanup-only-admission92-02', plan: newPlanPin, originalPlanSHA256: state.planSHA256,
    oldNative17ProofUnchanged: true, consumedExisting44: orphanPin, phase: 'metadata-reconciled-no-SQL-write', previousSequence: 43 };
  assert.deepEqual({ ...next, sequence: state.sequence, cleanup92_02: undefined }, { ...state, cleanup92_02: undefined }); return next;
}
function start(pid) { const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); return text.slice(text.lastIndexOf(') ') + 2).split(' ')[19]; }
function same(a, b) {
  assert.deepEqual(a.objects, b.objects); assert.deepEqual(Object.keys(a.databases), Object.keys(b.databases));
  for (const database of Object.keys(a.databases)) { const x = a.databases[database], y = b.databases[database]; assert.deepEqual(x.meta, y.meta); assert.deepEqual(Object.keys(x.tables), Object.keys(y.tables));
    for (const table of Object.keys(x.tables)) assert.deepEqual(rows(x.tables[table]).map(r => [r.key, r.sha256, r.xmin]), rows(y.tables[table]).map(r => [r.key, r.sha256, r.xmin])); }
}
function onlySession(base, observed, birth) {
  const copy = structuredClone(observed), target = copy.databases[TARGET92_02.database].tables.auth_session;
  const actual = rows(target), selected = actual.filter(row => row.key[0] === TARGET92_02.id); assert.equal(selected.length, 1);
  assert.equal(selected[0].sha256, birth.birthRowSHA256); assert.equal(selected[0].xmin, birth.birthXmin);
  const original = rows(base.databases[TARGET92_02.database].tables.auth_session);
  assert.deepEqual(actual.filter(r => r.key[0] !== TARGET92_02.id), original);
  copy.databases[TARGET92_02.database].tables.auth_session = base.databases[TARGET92_02.database].tables.auth_session; same(base, copy);
}

export async function execute92_02(planPin) {
  assert.equal(process.platform, 'linux'); assert.equal(fileURLToPath(import.meta.url), `${R}/tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs`);
  const plan = read(planPin), dir = `${P}/native-reference92/source12-native01`; assert.equal(plan.kind, 'Root-reviewed-one-Native-session-cleanup92-02'); assert.deepEqual(plan.target, TARGET92_02);
  assert.equal(plan.originalState.file, `${dir}/state.json`); assert.equal(plan.originalState.rawBytesSha256, TARGET92_02.originalStateSHA256);
  assert.equal(plan.oldPlan.file, `${dir}/plan.json`); assert.equal(plan.oldPlan.rawBytesSha256, TARGET92_02.oldPlanSHA256);
  assert.equal(plan.native17Proof.file, `${dir}/000043-modern17-proof.json`); assert.equal(plan.native17Proof.rawBytesSha256, TARGET92_02.proof17SHA256);
  assert.equal(plan.orphan44.file, `${dir}/snapshot-000044-cleanup-before.json`);
  const old = read(plan.oldPlan), state = read(plan.originalState), proof17 = read(plan.native17Proof), orphan = read(plan.orphan44);
  assert.equal(proof17.NativeOnly, true); assert.equal(proof17.actualAPI, 'http://127.0.0.1:31442'); assert.equal(proof17.actualNative422Operations.length, 17); assert.equal(proof17.nativeSessionId, TARGET92_02.id);
  assert.deepEqual(state.proof, plan.native17Proof); assert.equal(orphan.label, '000044-cleanup-before'); assert.equal(orphan.run, 'source12-native01');
  assert(!fs.existsSync(`${dir}/driver.lock`)); assert(!fs.existsSync(`${P}/business/${old.rustBoundary.epoch}/${old.rustBoundary.run}/driver.lock`));
  assert.equal(sha(fs.readFileSync(`${P}/business/${old.rustBoundary.epoch}/${old.rustBoundary.run}/state.json`)), old.rustBoundary.frozenState.rawBytesSha256);
  for (const pin of old.sourcePins) assert.equal(sha(fs.readFileSync(`${R}/${pin.file}`)), pin.rawBytesSha256, 'Old164 source remains historical and exact');
  const graph = read(plan.currentGraph), actualNames = fs.readdirSync(`${R}/tools/rust-r4ghi/business`).filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => `tools/rust-r4ghi/business/${n}`);
  assert.deepEqual(graph.map(p => p.file).sort(), actualNames); for (const pin of graph) assert.equal(sha(fs.readFileSync(`${R}/${pin.file}`)), pin.rawBytesSha256);
  const oldNames = old.sourcePins.filter(p => p.file.startsWith('tools/rust-r4ghi/business/')).map(p => p.file);
  assert.deepEqual(actualNames.filter(name => !oldNames.includes(name)), ['tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs']);
  assert.equal(sha(fs.readFileSync(fileURLToPath(import.meta.url))), plan.toolSHA256);
  const oldProcess = read(state.process); assert.equal(oldProcess.pid, 237076); assert.equal(oldProcess.startTime, '6534358'); assert.equal(oldProcess.nonce, old.processNonce);
  read(plan.stoppedProcessReceipt); assert(!fs.existsSync(`/proc/${oldProcess.pid}/stat`) || start(oldProcess.pid) !== oldProcess.startTime, 'The original owned Native process must be gone');
  const loginPin = state.attempts.find(a => a.operationId === 'AuthController_createPasswordAuthSession').observation, login = read(loginPin);
  const owned = Object.values(state.owned).filter(row => !row.deleted); assert.equal(owned.length, 1); const target = owned[0];
  assert.equal(target.latestSha256, TARGET92_02.rowSHA256); assert.equal(target.latestXmin, TARGET92_02.xmin);
  const birth = verifyBirth92_02({ owned: target, login, headers: read(login.originals.responseHeaders), beforeRows: rows(read(login.before).databases[TARGET92_02.database].tables.auth_session), afterRows: rows(read(login.after).databases[TARGET92_02.database].tables.auth_session) });
  const ledger = read(login.ledger); assert.equal(ledger.ownershipComplete, true); assert.equal(ledger.requestId, login.attempt.requestId);
  const baseline = read(state.baseline); onlySession(baseline, orphan, birth);
  const helper = name => import(pathToFileURL(`${R}/tools/rust-r4ghi/business/${name}.mjs`).href), { FIXED, guard } = await helper('context'), { capture } = await helper('snapshot');
  assert.equal(FIXED.migrations, 97); assert.equal(FIXED.tables, 139); const identity = read(old.identity), provision = read(old.provision); assert.equal(identity.marker, provision.marker); assert.equal(identity.namespace, 'poms-r4ghi');
  const passwordBytes = fs.readFileSync(old.ownerPassword.file); assert.equal(sha(passwordBytes), old.ownerPassword.rawBytesSha256);
  const require = createRequire(`${FIXED.mirror}/package.json`), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
  const output = `${dir}/cleanup92-02`; fs.mkdirSync(output, { mode: 0o700 }); assert.equal(fs.realpathSync(output), output);
  const lock = `${output}/driver.lock`, lockValue = { pid: process.pid, plan: planPin, startTime: start(process.pid) };
  fs.writeFileSync(lock, JSON.stringify(lockValue) + '\n', { flag: 'wx', mode: 0o600 });
  let current = state;
  const persist = () => { const temp = `${dir}/state92-02.tmp`; fs.writeFileSync(temp, JSON.stringify(current, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, `${dir}/state.json`); };
  const artifact = (name, value) => { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = `${output}/${name}`; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { file, rawBytesSha256: sha(bytes) }; };
  const ctx = { ...FIXED, identity, provision, database: TARGET92_02.database, priv: output, state: current, epoch: 'native-cleanup92-02', run: 'source12-native01',
    artifact, public: () => {} };
  ctx.db = async (fn, database = TARGET92_02.database) => { assert(FIXED.databases.includes(database)); const c = new Client({ host: FIXED.host, port: FIXED.port, user: FIXED.owner, password: passwordBytes.toString(), database, connectionTimeoutMillis: 8000, query_timeout: 45000, options: '-c statement_timeout=45000 -c lock_timeout=10000' }); await c.connect(); try { await guard(ctx, c, database); return await fn(c); } finally { await c.end(); } };
  const next = name => { current.sequence += 1; persist(); return `${String(current.sequence).padStart(6, '0')}-${name}`; };
  try {
    const originalStateCopy = artifact('source-state43.json', fs.readFileSync(plan.originalState.file)); assert.equal(originalStateCopy.rawBytesSha256, TARGET92_02.originalStateSHA256);
    current = consume44Metadata92_02(current, plan.orphan44, planPin); ctx.state = current; persist();
    artifact('sequence44-metadata-only-reconciliation.json', { originalStateCopy, consumedExistingSnapshot44: plan.orphan44, oldNativePlanUnchanged: plan.oldPlan, Native17ProofUnchanged: plan.native17Proof, businessSQLWrites: 0, HTTPRequests: 0 });
    const fresh = await capture(ctx, next('fresh-owned-before-delete')); same(orphan, fresh); onlySession(baseline, fresh, birth);
    const actualRow = rows(fresh.databases[TARGET92_02.database].tables.auth_session).find(r => r.key[0] === TARGET92_02.id); assert.equal(actualRow.sha256, target.latestSha256); assert.equal(actualRow.xmin, target.latestXmin);
    assert(!fresh.databases[TARGET92_02.database].meta.foreignKeys.some(f => f.parent === 'auth_session')); assert(!fresh.databases[TARGET92_02.database].meta.externalForeignKeys.some(f => f.parent === 'auth_session'));
    current.cleanup92_02.intent = artifact(next('exact-delete-intent') + '.json', { target: TARGET92_02, birth: { ...birth, tokenHash: 'verified-in-memory-not-exported' }, latestRow: { key: actualRow.key, rowSHA256: actualRow.sha256, xmin: actualRow.xmin }, fresh: fresh.manifest }); current.cleanup92_02.phase = 'delete-intent-no-replay'; persist();
    await ctx.db(async c => { await c.query('BEGIN'); try { const records = (await c.query('SELECT row_to_json(s)::text raw,s.xmin::text xmin FROM poms.auth_session s WHERE id=$1::uuid FOR UPDATE', [TARGET92_02.id])).rows; assert.equal(records.length, 1); assert.equal(sha(records[0].raw), TARGET92_02.rowSHA256); assert.equal(records[0].xmin, TARGET92_02.xmin); const removed = await c.query('DELETE FROM poms.auth_session WHERE id=$1::uuid AND xmin::text=$2', [TARGET92_02.id, TARGET92_02.xmin]); assert.equal(removed.rowCount, 1); await c.query('COMMIT'); } catch (error) { await c.query('ROLLBACK'); throw error; } });
    Object.values(current.owned).find(row => row.key[0] === TARGET92_02.id).deleted = true; persist();
    const after = await capture(ctx, next('after-delete')); same(baseline, after); const first = await capture(ctx, next('fresh-noop1')); same(after, first); const second = await capture(ctx, next('fresh-noop2')); same(first, second);
    current.cleanup92_02.phase = 'verified-S0-conserved'; current.cleanup92_02.proof = artifact(next('cleanup-proof') + '.json', { NativeOnlyCleanup: true, Native17SourceOrProofRelabelled: false, oldPlan: plan.oldPlan, actual17: plan.native17Proof,
      old44Preserved: plan.orphan44, baseline: state.baseline, after: after.manifest, fresh1: first.manifest, fresh2: second.manifest, deletedOnlyTargetNewPK: [TARGET92_02.id], allOriginalRowsXminCatalogSequencesObjectsEqualS0: true, RustStateWritten: false, HTTPRequestsSent: 0, G3Certified: false });
    current.phase = 'cleaned-conserved-by-92-02'; persist(); return current.cleanup92_02.proof;
  } catch (error) { current.cleanup92_02 ??= {}; current.cleanup92_02.phase = 'blocked-preserve-no-retry'; current.cleanup92_02.failure = artifact('partial.json', { name: error.name, code: error.code ?? null, noBlindRetryAfterUnknownCommit: true }); persist(); throw error; }
  finally { assert.deepEqual(JSON.parse(fs.readFileSync(lock)), lockValue); fs.unlinkSync(lock); }
}
async function main(argv) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root fixed-phase Native cleanup only: --plan FILE --plan-sha SHA --execute. No HTTP or process start/stop.'); return; }
  assert.equal(argv.length, 5); assert.equal(argv[0], '--plan'); assert.equal(argv[2], '--plan-sha'); assert.equal(argv[4], '--execute');
  const proof = await execute92_02({ file: argv[1], rawBytesSha256: argv[3] }); console.log(JSON.stringify({ proof, NativeOnlyCleanup: true, HTTPRequestsSent: 0, G3Certified: false }));
}
if (globalThis.process.argv[1] && path.resolve(globalThis.process.argv[1]) === fileURLToPath(import.meta.url)) main(globalThis.process.argv.slice(2)).catch(() => { console.error('Targeted Native cleanup blocked; preserve all actual private evidence and never retry a DELETE blindly.'); globalThis.process.exitCode = 1; });
