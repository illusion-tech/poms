// Independent filesystem/pure review of the fixed cleanup candidate and Root originals.
// No runtime context, network, SQL, process control or state persistence is imported.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TARGET92_02 as T, verifyBirth92_02, consume44Metadata92_02 } from 'file:///E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/native-targeted-cleanup92-02/proposed/tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs';

const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const LR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', LH = '/home/wangzishi', UH = '//wsl.localhost/Debian/home/wangzishi';
const P = `${LH}/.local/share/poms-r4ghi/private/native-reference92/source12-native01`, C = `${P}/cleanup92-02`;
const output = path.dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const checked = new Map(), rowFiles = new Map(); let stage = 'start';
const map = p => p.startsWith(`${LR}/`) ? `${R}/${p.slice(LR.length + 1)}` : p.startsWith(`${LH}/`) ? `${UH}/${p.slice(LH.length + 1)}` : p;
function readBytes(file, expected) {
  const b = fs.readFileSync(map(file)), digest = sha(b); if (expected) assert.equal(digest, expected);
  if (checked.has(file)) assert.equal(checked.get(file).rawBytesSha256, digest);
  checked.set(file, { file, rawBytesSha256: digest, bytes: b.length }); return b;
}
const json = p => JSON.parse(readBytes(p.file, p.rawBytesSha256));
const pin = file => { readBytes(file); return checked.get(file); };
const count = { rowFiles: 0, rowChecks: 0, snapshotPairs: 0, tablePairs: 0 };
function rows(t) {
  if (rowFiles.has(t.file)) { const old = rowFiles.get(t.file); assert.equal(old.digest, t.rawBytesSha256); return old.rows; }
  const b = readBytes(t.file, t.rawBytesSha256), values = b.toString().split('\n').filter(Boolean).map(v => JSON.parse(v));
  assert.equal(values.length, t.count); assert.equal(new Set(values.map(v => JSON.stringify(v.key))).size, values.length);
  for (const value of values) { assert.equal(sha(value.raw), value.sha256); count.rowChecks++; }
  assert.equal(sha(values.map(v => v.raw).join('\n')), t.logicalRowsSha256); count.rowFiles++;
  rowFiles.set(t.file, { digest: t.rawBytesSha256, rows: values }); return values;
}
function snapshot(p) {
  const value = json(p); assert.deepEqual(Object.keys(value.databases), ['poms_r4ghi_native', 'poms_r4ghi_rust']);
  for (const db of Object.values(value.databases)) { assert.equal(Object.keys(db.tables).length, 139); for (const t of Object.values(db.tables)) rows(t); }
  return value;
}
function same(a, b) {
  assert.deepEqual(a.objects, b.objects); count.snapshotPairs++;
  assert.deepEqual(Object.keys(a.databases), Object.keys(b.databases));
  for (const database of Object.keys(a.databases)) {
    const x = a.databases[database], y = b.databases[database]; assert.deepEqual(x.meta, y.meta); assert.deepEqual(Object.keys(x.tables), Object.keys(y.tables));
    for (const table of Object.keys(x.tables)) { count.tablePairs++; assert.deepEqual(x.tables[table].pk, y.tables[table].pk); assert.deepEqual(x.tables[table].columns, y.tables[table].columns);
      assert.deepEqual(rows(x.tables[table]).map(r => [r.key, r.sha256, r.xmin]), rows(y.tables[table]).map(r => [r.key, r.sha256, r.xmin])); }
  }
}
async function main() {
  stage = 'candidate-seal';
  const base = `${I}/tools/rust-r4ghi/I/implementation/native-targeted-cleanup92-02`;
  const authorPin = { file: `${base}/manifest92-02.json`, rawBytesSha256: '7a7bc5641b2378869f10de21cedfd5416e9dc26e9975a817489e11de16b157ae' }, author = json(authorPin);
  for (const f of author.files) readBytes(`${base}/${f.file}`, f.rawBytesSha256);
  readBytes(`${R}/${author.product.file}`, author.product.afterSHA256);
  stage = 'new-cleanup-plan-and-closed165-graph';
  const planPin = pin(`${P}/cleanup-plan92-02.json`), plan = json(planPin), graph = json(plan.currentGraph), old = json(plan.oldPlan);
  assert.equal(planPin.rawBytesSha256, '6f7224f58d77105fe42cdd1a49dd1347d402a5c96eca2319beb4dafe7c7250fd');
  assert.deepEqual(plan.target, T); assert.equal(plan.toolSHA256, author.product.afterSHA256); assert.equal(graph.length, 165);
  const oldHelpers = old.sourcePins.filter(p => p.file.startsWith('tools/rust-r4ghi/business/'));
  assert.equal(oldHelpers.length, 164);
  assert.deepEqual(graph.map(p => p.file).sort(), [...oldHelpers.map(p => p.file), author.product.file].sort());
  for (const f of old.sourcePins) readBytes(`${R}/${f.file}`, f.rawBytesSha256);
  for (const f of graph) readBytes(`${R}/${f.file}`, f.rawBytesSha256);
  stage = 'retained43-exact-birth-and-metadata-only44';
  const source43Pin = { file: `${C}/source-state43.json`, rawBytesSha256: T.originalStateSHA256 }, source43 = json(source43Pin);
  const reconciliationPin = pin(`${C}/sequence44-metadata-only-reconciliation.json`), reconciliation = json(reconciliationPin);
  assert.deepEqual(reconciliation.originalStateCopy, { file: source43Pin.file, rawBytesSha256: source43Pin.rawBytesSha256 });
  assert.deepEqual(reconciliation.consumedExistingSnapshot44, plan.orphan44); assert.deepEqual(reconciliation.oldNativePlanUnchanged, plan.oldPlan); assert.deepEqual(reconciliation.Native17ProofUnchanged, plan.native17Proof);
  assert.equal(reconciliation.businessSQLWrites, 0); assert.equal(reconciliation.HTTPRequests, 0);
  const next = consume44Metadata92_02(source43, plan.orphan44, planPin);
  assert.equal(next.sequence, 44); assert.equal(source43.sequence, 43);
  const active = Object.values(source43.owned).filter(v => !v.deleted); assert.equal(active.length, 1);
  assert.equal(active[0].latestSha256, T.rowSHA256); assert.equal(active[0].latestXmin, T.xmin);
  const login = json(source43.attempts.find(v => v.operationId === 'AuthController_createPasswordAuthSession').observation);
  const before = snapshot(login.before), after = snapshot(login.after), headers = json(login.originals.responseHeaders);
  const actualResponse = JSON.parse(readBytes(login.originals.responseBody.file, login.originals.responseBody.rawBytesSha256));
  assert.deepEqual(actualResponse, login.attempt.body);
  const birth = verifyBirth92_02({ owned: active[0], login, headers, beforeRows: rows(before.databases[T.database].tables.auth_session), afterRows: rows(after.databases[T.database].tables.auth_session) });
  assert.equal(birth.responseJSONSessionIDClaimed, false); assert.equal(birth.cookieDerivedAnchorTupleVerified, true);
  stage = 'actual-cleanup-proof-and-all278-table-conservation';
  const proofPin = { file: `${C}/000050-cleanup-proof.json`, rawBytesSha256: '18580667d292d56267dcec01992f99a3dedb8cd3c034a90fe4c5828566baa3e5' }, proof = json(proofPin);
  assert.equal(proof.NativeOnlyCleanup, true); assert.equal(proof.Native17SourceOrProofRelabelled, false); assert.equal(proof.RustStateWritten, false); assert.equal(proof.HTTPRequestsSent, 0); assert.equal(proof.G3Certified, false);
  assert.deepEqual(proof.deletedOnlyTargetNewPK, [T.id]); assert.deepEqual(proof.oldPlan, plan.oldPlan); assert.deepEqual(proof.actual17, plan.native17Proof); assert.deepEqual(proof.old44Preserved, plan.orphan44);
  const original17 = json(plan.native17Proof); assert.equal(original17.actualNative422Operations.length, 17);
  const baseline = snapshot(proof.baseline), orphan = snapshot(plan.orphan44);
  const intentPin = pin(`${C}/000046-exact-delete-intent.json`), intent = json(intentPin), fresh = snapshot(intent.fresh);
  assert.deepEqual(intent.target, T); assert.deepEqual(intent.latestRow, { key: [T.id], rowSHA256: T.rowSHA256, xmin: T.xmin });
  assert.equal(intent.birth.tokenHash, 'verified-in-memory-not-exported'); assert.equal(intent.birth.cookieDerivedAnchorTupleVerified, true);
  same(orphan, fresh);
  const freshRows = rows(fresh.databases[T.database].tables.auth_session); assert.equal(freshRows.length, 1); assert.equal(freshRows[0].sha256, T.rowSHA256); assert.equal(freshRows[0].xmin, T.xmin);
  assert.equal(rows(baseline.databases[T.database].tables.auth_session).length, 0);
  assert(!fresh.databases[T.database].meta.foreignKeys.some(f => f.parent === 'auth_session')); assert(!fresh.databases[T.database].meta.externalForeignKeys.some(f => f.parent === 'auth_session'));
  const removed = structuredClone(fresh); removed.databases[T.database].tables.auth_session = baseline.databases[T.database].tables.auth_session; same(baseline, removed);
  const actualAfter = snapshot(proof.after), fresh1 = snapshot(proof.fresh1), fresh2 = snapshot(proof.fresh2);
  same(baseline, actualAfter); same(actualAfter, fresh1); same(fresh1, fresh2);
  assert.equal(rows(actualAfter.databases[T.database].tables.auth_session).length, 0);
  const stopped = json(plan.stoppedProcessReceipt); assert.equal(stopped.pid, 237076); assert.equal(stopped.startTime, '6534358'); assert.equal(stopped.stopped, true);
  readBytes(old.rustBoundary.frozenState.file, old.rustBoundary.frozenState.rawBytesSha256);
  const report = {
    kind: 'independent-fixed-Native92-02-cleanup-static-and-actual-FS-review', status: 'LIMITED_STATIC_AND_ACTUAL_FS_CONSERVATION_PASS',
    authorManifest: authorPin, helper: { file: author.product.file, rawBytesSha256: author.product.afterSHA256 }, actualPlan: planPin, actualGraph: plan.currentGraph,
    preservedNative17Plan: plan.oldPlan, preservedNative17Proof: plan.native17Proof, old164SourcePinsUnchanged: true, actualCleanupGraphOnlyAdditionalHelper: true, graphCounts: { Native17: 164, cleanup92_02: 165 },
    actualCleanupProof: proofPin, source43: source43Pin, metadata44: reconciliationPin, original44: plan.orphan44, deleteIntent: intentPin,
    snapshotCounts: count, after: proof.after, fresh1: proof.fresh1, fresh2: proof.fresh2,
    fixedSessionCookieBirthReproved: true, JSONSessionIDClaimed: false, deletedOnlyActualNewSession: T.id,
    allOriginalNativeAndRustRowsRawXminCatalogSequencesObjectInventoriesEqualS0: true,
    originalUsersNotRestoredOrMutated: true, frozenRustStatePreserved: true, RustStateNoWriteStaticBoundary: true,
    noActiveRustOrNativeStateRead: true, noIndependentLivePIDClaim: true, noAuthorSQLHTTPOrProcess: true, noRootWrites: true,
    candidatePureTestsIndependentlyRun: { passed: 7, failed: 0 }, newP1: 0, newP2: 0, G3Certified: false, G4Certified: false,
    limitations: ['Filesystem review of Root originals; no independently executed cleanup or runtime PID probe.', 'Native17 is a protocol-reference negative matrix, not Rust business acceptance.', 'Historical164 and cleanup165 closures are distinct; later UI167 is not retroactive evidence.'],
    checkedFiles: checked.size
  };
  fs.writeFileSync(`${output}/cleanup92-02-review.json`, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(`${output}/cleanup92-02-checked-files.json`, `${JSON.stringify([...checked.values()], null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ status: report.status, checkedFiles: checked.size, snapshotCounts: count, newP1: 0, newP2: 0 }));
}
main().catch(() => { console.error(JSON.stringify({ status: 'audit-stopped', stage, secretValuesPrinted: false })); process.exitCode = 1; });
