// Independent filesystem-only audit. No runtime helpers, HTTP, SQL or process APIs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const iRoot = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const linuxHome = '/home/wangzishi';
const uncHome = '//wsl.localhost/Debian/home/wangzishi';
const native = `${linuxHome}/.local/share/poms-r4ghi/private/native-reference92/source12-native01`;
const out = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const checked = new Map();
let stage = 'start';
const where = p => p.startsWith(`${linuxRoot}/`) ? `${root}/${p.slice(linuxRoot.length + 1)}`
  : p.startsWith(`${linuxHome}/`) ? `${uncHome}/${p.slice(linuxHome.length + 1)}` : p;
function bytes(p, expected = null) {
  const actual = where(p), value = fs.readFileSync(actual), digest = sha(value);
  if (expected) assert.equal(digest, expected, 'Pinned bytes changed');
  const prior = checked.get(p); if (prior) assert.equal(prior.rawBytesSha256, digest, 'A file changed during this audit');
  checked.set(p, { file: p, rawBytesSha256: digest, bytes: value.length });
  return value;
}
const json = p => JSON.parse(bytes(p));
const pinJson = p => JSON.parse(bytes(p.file, p.rawBytesSha256));
const pinNow = p => { bytes(p); return checked.get(p); };
const equal = (a, b, message = 'Exact structural equality required') => assert.deepEqual(a, b, message);
const rowCache = new Map(), rowFileCache = new Map(), snapshotCache = new Map();
const count = { snapshotManifests: 0, tableFiles: 0, rowChecks: 0, comparisons: 0, tableComparisons: 0, rawSessionTouches: 0 };
function rows(table) {
  const previous = rowFileCache.get(table.file);
  if (previous) { assert.equal(previous.digest, table.rawBytesSha256); assert.equal(previous.rows.length, table.count); return previous.rows; }
  const raw = bytes(table.file, table.rawBytesSha256); count.tableFiles++;
  let value = rowCache.get(table.rawBytesSha256);
  if (!value) {
    value = raw.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    for (const row of value) { assert.equal(sha(row.raw), row.sha256, 'Captured raw row SHA mismatch'); count.rowChecks++; }
    rowCache.set(table.rawBytesSha256, value);
  }
  assert.equal(value.length, table.count, 'Captured row count mismatch');
  assert.equal(new Set(value.map(row => JSON.stringify(row.key))).size, value.length, 'Captured duplicate PK');
  assert.equal(sha(value.map(row => row.raw).join('\n')), table.logicalRowsSha256, 'Captured logical row hash mismatch');
  rowFileCache.set(table.file, { digest: table.rawBytesSha256, rows: value });
  return value;
}
function snapshot(pin) {
  const value = pinJson(pin); if (snapshotCache.has(pin.rawBytesSha256)) return snapshotCache.get(pin.rawBytesSha256);
  assert.equal(value.epoch, 'native-reference92'); assert.equal(value.run, 'source12-native01');
  equal(Object.keys(value.databases), ['poms_r4ghi_native', 'poms_r4ghi_rust']);
  for (const db of Object.values(value.databases)) {
    assert.equal(Object.keys(db.tables).length, 139); assert.equal(db.meta.tables.length, 139);
    for (const table of Object.values(db.tables)) rows(table);
  }
  snapshotCache.set(pin.rawBytesSha256, value); count.snapshotManifests++;
  return value;
}
function rawTouch(before, after, sid, uid) {
  assert.equal(before.key[0], sid); assert.equal(after.key[0], sid);
  const b = JSON.parse(before.raw), a = JSON.parse(after.raw);
  assert.equal(b.user_id, uid); assert.equal(a.user_id, uid); assert.equal(b.status, 'active'); assert.equal(a.status, 'active');
  assert.equal(a.row_version, b.row_version + 1);
  assert(Number.isFinite(Date.parse(a.last_seen_at)) && Date.parse(a.last_seen_at) > Date.parse(b.last_seen_at));
  assert.equal(Date.parse(a.updated_at), Date.parse(a.last_seen_at));
  assert(Date.parse(a.idle_expires_at) <= Date.parse(a.absolute_expires_at));
  assert(Date.parse(a.idle_expires_at) >= Date.parse(b.idle_expires_at));
  const columns = new Set(['last_seen_at', 'last_ip', 'idle_expires_at', 'row_version', 'updated_at']);
  const stable = v => Object.fromEntries(Object.entries(v).filter(([key]) => !columns.has(key)));
  equal(stable(a), stable(b), 'Raw session touch changed immutable fields'); count.rawSessionTouches++;
}
function compare(before, after, mode = 'same', sid = null, uid = null, cookieHash = null) {
  count.comparisons++;
  equal(before.objects, after.objects, 'Captured object inventory changed');
  equal(Object.keys(before.databases), Object.keys(after.databases));
  const delta = [];
  for (const [database, b] of Object.entries(before.databases)) {
    const a = after.databases[database]; equal(a.meta, b.meta, 'Catalog/ACL/sequence changed');
    equal(Object.keys(a.tables), Object.keys(b.tables));
    for (const table of Object.keys(b.tables)) {
      count.tableComparisons++;
      equal(a.tables[table].pk, b.tables[table].pk); equal(a.tables[table].columns, b.tables[table].columns);
      const br = rows(b.tables[table]), ar = rows(a.tables[table]);
      const bm = new Map(br.map(row => [JSON.stringify(row.key), row]));
      const am = new Map(ar.map(row => [JSON.stringify(row.key), row]));
      for (const old of br) assert(am.has(JSON.stringify(old.key)), 'A captured row was deleted');
      for (const row of ar) {
        const old = bm.get(JSON.stringify(row.key));
        if (!old) {
          assert.equal(mode, 'login'); assert.equal(database, 'poms_r4ghi_native'); assert.equal(table, 'auth_session'); assert.equal(row.key[0], sid);
          const v = JSON.parse(row.raw); assert.equal(v.user_id, uid); assert.equal(v.status, 'active'); assert.equal(v.token_hash, cookieHash);
          delta.push({ kind: 'birth', database, table, key: row.key, rowSHA256: row.sha256, xmin: row.xmin }); continue;
        }
        if (old.sha256 === row.sha256 && old.xmin === row.xmin) continue;
        assert.equal(mode, 'modern'); assert.equal(database, 'poms_r4ghi_native'); assert.equal(table, 'auth_session');
        rawTouch(old, row, sid, uid); delta.push({ kind: 'touch', database, table, key: row.key, rowSHA256: row.sha256, xmin: row.xmin });
      }
      if (mode !== 'login' || database !== 'poms_r4ghi_native' || table !== 'auth_session') assert.equal(ar.length, br.length);
    }
  }
  if (mode === 'login') { assert.equal(delta.length, 1); assert.equal(delta[0].kind, 'birth'); }
  return delta;
}
const headerValues = (raw, name) => {
  const values = []; for (let at = 0; at < raw.length; at += 2) if (raw[at].toLowerCase() === name.toLowerCase()) values.push(raw[at + 1]); return values;
};
function cookie(raw, name) {
  const found = headerValues(raw, 'set-cookie').filter(v => v.startsWith(`${name}=`)); assert.equal(found.length, 1, 'Exactly one real Set-Cookie required');
  return found[0].slice(name.length + 1).split(';')[0];
}
function allStrings(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(allStrings);
}
function main() {
  stage = 'sealed-author-inputs';
  const authorManifest = `${iRoot}/tools/rust-r4ghi/I/implementation/native-modern-reference92/manifest92.json`;
  const author = json(authorManifest), base = path.dirname(authorManifest);
  for (const item of author.files) bytes(`${base}/${item.file}`, item.rawBytesSha256);
  for (const item of author.products) bytes(`${root}/${item.file}`, item.afterSHA256);
  stage = 'actual-plan-and-source';
  const planPin = { file: `${native}/plan.json`, rawBytesSha256: '8856601ec2992e7540954627504714366d25251660c1d9e56317505c20cf8f01' };
  const plan = pinJson(planPin); assert.equal(plan.tables, 139); assert.equal(plan.migrations, 97);
  equal(plan.authorizedStages, { RustDriverFinished: true, NativeOnly: true, NoConcurrentRustHTTP: true });
  assert.equal(plan.sourcePins.length, 576); assert.equal(new Set(plan.sourcePins.map(p => p.file)).size, 576);
  for (const item of plan.sourcePins) bytes(`${root}/${item.file}`, item.rawBytesSha256);
  const actualHelpers = fs.readdirSync(`${root}/tools/rust-r4ghi/business`).filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => `tools/rust-r4ghi/business/${n}`);
  equal(plan.sourcePins.filter(p => p.file.startsWith('tools/rust-r4ghi/business/')).map(p => p.file).sort(), actualHelpers);
  const buildBinding = pinJson(plan.build.bindingReceipt), build = pinJson(buildBinding.buildReceipt);
  assert.equal(buildBinding.kind, 'Root-fresh-Native-build04-source-and-output-binding103');
  assert.equal(build.exitCode, 0); assert.equal(build.sourceStable, true); assert.equal(build.databaseConnect, false);
  assert.equal(build.inputManifestSHA256, buildBinding.sourceInputManifestSHA256);
  assert.equal(build.inputs.length, buildBinding.actualCompleteSourceInputs);
  for (const item of build.inputs) bytes(`${root}/${item.file}`, item.rawBytesSha256);
  for (const item of buildBinding.output.files) bytes(`${root}/dist/apps/poms-api/${item.file}`, item.rawBytesSha256);
  bytes(plan.build.entry.file, plan.build.entry.rawBytesSha256); bytes(plan.preload.file, plan.preload.rawBytesSha256);
  bytes(plan.node.file, plan.node.rawBytesSha256); for (const item of plan.runtimeModules) bytes(item.file, item.rawBytesSha256);
  // Credentials/env are only hashed here. Their contents are never included in a report.
  for (const item of [plan.originalEnv, plan.env, plan.credentials, plan.nativeCredentialSource, plan.nativeSeedReceipt, plan.identity, plan.provision]) bytes(item.file, item.rawBytesSha256);
  const frozenRust = pinJson(plan.rustBoundary.frozenState), boundary = pinJson(plan.rustBoundary.finishedReceipt);
  assert.equal(frozenRust.epoch, 'g2-business12'); assert.equal(frozenRust.run, 'main01');
  assert(!frozenRust.activeFault && !frozenRust.blockedObservation); assert.equal(boundary.noConcurrentRustHTTP, true); assert.equal(boundary.UI04StillFailed, true);
  equal(boundary.currentRustState, plan.rustBoundary.frozenState);
  stage = 'actual-process-and-modern17-proof';
  const proofPin = { file: `${native}/000043-modern17-proof.json`, rawBytesSha256: 'fd95fd07f45984786a55bd9f50be1698e1df5fe93982d55169778211c89ab284' };
  const proof = pinJson(proofPin), processRecord = pinJson(proof.process), stopped = json(`${native}/process-stopped.json`);
  assert.equal(processRecord.pid, 237076); assert.equal(processRecord.startTime, '6534358'); assert.equal(processRecord.port, 31442);
  assert.equal(processRecord.planSHA256, planPin.rawBytesSha256); assert.equal(processRecord.nonce, plan.processNonce);
  equal(processRecord.entry, plan.build.entry); equal(processRecord.env, plan.env); equal(processRecord.preload, plan.preload);
  assert.equal(stopped.pid, processRecord.pid); assert.equal(stopped.startTime, processRecord.startTime);
  assert.equal(stopped.processSHA256, proof.process.rawBytesSha256); assert.equal(stopped.stopped, true);
  assert.equal(proof.NativeOnly, true); assert.equal(proof.actualAPI, 'http://127.0.0.1:31442');
  for (const field of ['legacyPositiveHTTPExecuted', 'RustAcceptanceClaimed', 'G3Certified', 'G4Certified']) assert.equal(proof[field], false);
  const inventory = pinJson(proof.inventory); equal(proof.inventory, plan.inventory); assert.equal(inventory.exactCaseCount, 17);
  for (const item of inventory.inputs) bytes(item.file, item.rawBytesSha256);
  for (const item of inventory.sourcePins) bytes(`${root}/${item.file}`, item.rawBytesSha256);
  const actual17 = proof.actualNative422Operations; assert.equal(actual17.length, 17);
  equal(actual17.map(p => p.operationId), inventory.controllerCases.map(p => p.operationId));
  const inv = new Map(inventory.controllerCases.map(p => [p.operationId, p]));
  const publicRoot = `${root}/tmp/rust-r4ghi/native-reference92/source12-native01`;
  const baselineReceipt = json(`${publicRoot}/snapshot-000001-before-start.json.receipt.json`);
  const baselinePin = baselineReceipt.original, baseline = snapshot(baselinePin), startup = snapshot(proof.startupNoEffects);
  compare(baseline, startup);
  const occupied = new Set(Object.values(baseline.databases).flatMap(db => Object.values(db.tables).flatMap(t => rows(t).flatMap(r => r.key))));
  const authPins = ['000003', '000005', '000007'].map(label => json(`${publicRoot}/${label}-native-http-http.json`).observation);
  const pins = [...authPins, ...actual17.map(p => p.observation)], results = [];
  let prior = startup, sessionHash = null, sessionBirth = null, loginBodyHasSessionUUID = null;
  const sessionId = proof.nativeSessionId, actorId = plan.expectedNativeUserId;
  stage = 'all20-raw-http-snapshot-and-ledger-pairs';
  for (const observationPin of pins) {
    const o = pinJson(observationPin), a = o.attempt, request = pinJson(o.originals.requestConfig);
    const requestBytes = bytes(o.originals.requestBody.file, o.originals.requestBody.rawBytesSha256);
    const responseHeaders = pinJson(o.originals.responseHeaders), responseBytes = bytes(o.originals.responseBody.file, o.originals.responseBody.rawBytesSha256);
    equal(JSON.parse(responseBytes), a.body); assert.equal(o.policyError, null);
    assert.equal(a.responseComplete, true); assert.equal(a.transportFailure, false); assert.equal(a.transport, 'actual-Native-reference31442-not-Rust');
    assert.equal(request.operationId, a.operationId); assert.equal(request.requestId, a.requestId); assert.equal(request.headers['X-Request-Id'], a.requestId);
    assert.equal(responseHeaders.status, a.status); assert.equal(a.actorId, actorId);
    const before = snapshot(o.before), after = snapshot(o.after); compare(prior, before);
    const isLogin = a.operationId === 'AuthController_createPasswordAuthSession';
    if (isLogin) {
      sessionHash = sha(decodeURIComponent(cookie(responseHeaders.rawHeaders, 'poms_session')));
      const body = a.body?.data ?? a.body; assert.equal(body.authenticated, true); assert.equal(body.user.id, actorId);
      loginBodyHasSessionUUID = allStrings(body).includes(sessionId); assert.equal(loginBodyHasSessionUUID, false);
    }
    const mode = isLogin ? 'login' : a.operationId === 'AuthController_getCsrfToken' ? 'same' : 'modern';
    const delta = compare(before, after, mode, sessionId, actorId, sessionHash);
    if (isLogin) sessionBirth = delta[0];
    const ledger = pinJson(o.ledger); assert.equal(ledger.requestId, a.requestId); assert.equal(ledger.operationId, a.operationId);
    equal(ledger.before, o.before); equal(ledger.after, o.after); equal(ledger.blockers, []); assert.equal(ledger.ownershipComplete, true); assert.equal(ledger.responseStatusIsAcceptance, false);
    if (isLogin) { assert.equal(ledger.recorded.length, 1); assert.equal(ledger.recorded[0].proofKind, 'HTTP-real-response-ID'); equal(ledger.recorded[0].key, [sessionId]); }
    else assert.equal(ledger.recorded.length, delta.length);
    if (inv.has(a.operationId)) {
      const item = inv.get(a.operationId); assert.equal(a.status, 422); assert.equal(a.body.code, 'rust_r4ghi_protocol_unsupported_by_native_reference');
      assert.equal(a.body.message, `Frozen Native reference cannot execute ${item.expectedMessageReason}; use the Rust implementation.`);
      assert.equal(request.method, 'POST'); assert.equal(requestBytes.toString(), JSON.stringify({ inputVersion: 'server-derived-v1' }));
      equal(a.requestValue, { inputVersion: 'server-derived-v1' });
      const expected = item.runtimePath.replace(/\{([^}]+)\}/g, (_, name) => {
        const id = a.pathParams[name]; assert(/^[a-f0-9-]{36}$/i.test(id)); assert(!occupied.has(id)); return id;
      });
      assert.equal(request.url, `http://127.0.0.1:31442${expected}`);
      const cookieHeader = request.headers.Cookie; assert.equal(typeof cookieHeader, 'string');
      const matches = cookieHeader.split('; ').filter(v => v.startsWith('poms_session=')); assert.equal(matches.length, 1);
      assert.equal(sha(decodeURIComponent(matches[0].slice('poms_session='.length))), sessionHash);
      const csrf = cookieHeader.split('; ').filter(v => v.startsWith('poms_csrf=')); assert.equal(csrf.length, 1);
      assert.equal(request.headers['X-CSRF-Token'], decodeURIComponent(csrf[0].slice('poms_csrf='.length)));
    } else {
      assert.equal(a.status, 200);
      if (a.operationId === 'AuthController_getCurrentAuthSession') {
        const body = a.body?.data ?? a.body; assert.equal(body.authenticated, true); assert.equal(body.user.id, actorId);
        for (const permission of plan.permissionUnion) assert(body.permissions.includes(permission));
      }
    }
    results.push({ operationId: a.operationId, status: a.status, complete: true, newRows: delta.filter(p => p.kind === 'birth').length, exactRawTouches: delta.filter(p => p.kind === 'touch').length, observation: observationPin, ledger: o.ledger });
    prior = after;
  }
  stage = 'same-cookie-session-birth-and-cleanup-before';
  const ownershipFile = `${native}/ownership.jsonl`, ownership = bytes(ownershipFile).toString().split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.equal(ownership.length, 1); const owned = ownership[0];
  equal(JSON.parse(owned.key), ['poms_r4ghi_native', 'auth_session', [sessionId]]); assert.equal(owned.rowSHA256, sessionBirth.rowSHA256);
  assert.equal(owned.proof.kind, 'HTTP-real-response-ID'); assert.equal(owned.proof.responsePointer, 'HTTP-real-cookie-token-hash'); assert.equal(owned.proof.id, sessionId); assert.equal(owned.proof.beforeAbsent, true);
  const login = pinJson(authPins[1]); equal(owned.proof.beforeSnapshot, login.before); equal(owned.proof.afterSnapshot, login.after);
  const cleanupReceipt = json(`${publicRoot}/snapshot-000044-cleanup-before.json.receipt.json`), cleanupBefore = snapshot(cleanupReceipt.original);
  compare(prior, cleanupBefore); const cleanupSession = rows(cleanupBefore.databases.poms_r4ghi_native.tables.auth_session);
  assert.equal(cleanupSession.length, 1); assert.equal(cleanupSession[0].key[0], sessionId); assert.equal(JSON.parse(cleanupSession[0].raw).token_hash, sessionHash);
  assert.equal(rows(baseline.databases.poms_r4ghi_native.tables.auth_session).length, 0);
  stage = 'object-leaves-once';
  for (const objects of Object.values(baseline.objects)) for (const object of objects.files) bytes(object.file, object.sha256);
  const report = {
    kind: 'independent-Native92-actual17-filesystem-review', status: 'LIMITED_FS_ACTUAL17_PASS_CLEANUP_PENDING',
    proof: proofPin, authorManifest: checked.get(authorManifest), plan: planPin,
    process: proof.process, processStopped: checked.get(`${native}/process-stopped.json`),
    sourcePins: plan.sourcePins.length, helperPins: actualHelpers.length, buildInputs: build.inputs.length, distLeaves: buildBinding.output.files.length, runtimeModules: plan.runtimeModules.length,
    boundaryFrozenState: plan.rustBoundary.frozenState, boundaryReceipt: plan.rustBoundary.finishedReceipt,
    snapshotCounts: count, baseline: baselinePin, startup: proof.startupNoEffects, cleanupBefore: cleanupReceipt.original,
    actualHTTP: results.length, modernDedicated422: actual17.length, results,
    originalNativePlatformUsers: baseline.databases.poms_r4ghi_native.tables.platform_user.count,
    allOriginalNativeUsersRowsXminUnchanged: true, allRustRowsXminCatalogObjectsUnchanged: true,
    onlyActualNewRow: { database: 'poms_r4ghi_native', table: 'auth_session', key: [sessionId], cookieTokenHashIndependentlyMatched: true, beforeAbsent: true },
    proofKindErratum: { storedKind: 'HTTP-real-response-ID', storedResponsePointer: 'HTTP-real-cookie-token-hash', loginJSONContainsSessionUUID: loginBodyHasSessionUUID,
      interpretation: 'cookie-derived anchor reclassified by generic two-pass birthProof; not a JSON response session ID', targetedCleanupMustReproveCookieBirth: true },
    newP1: 0, newP2: 0, knownCleanupKindMismatch: true, cleanupComplete: false,
    noLiveStateRead: true, noLiveProcessClaim: true, noAuthorSQLHTTPOrProcess: true, noRootWrites: true,
    legacyPositiveHTTPExecuted: false, RustAcceptanceClaimed: false, G3Certified: false, G4Certified: false,
    checkedFiles: checked.size
  };
  fs.writeFileSync(`${out}/actual17-review92.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(`${out}/checked-files92.json`, `${JSON.stringify([...checked.values()], null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ status: report.status, actualHTTP: report.actualHTTP, modernDedicated422: report.modernDedicated422, checkedFiles: report.checkedFiles, snapshotCounts: count, cleanupComplete: false }));
}
try { main(); } catch {
  // Assertion diffs can contain authentication values; never print them.
  console.error(JSON.stringify({ status: 'audit-stopped', stage, secretValuesPrinted: false })); process.exitCode = 1;
}
