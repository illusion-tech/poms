// Frozen-artifact filesystem readback only. No browser, HTTP, SQL, or live state.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createHash } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', out = path.dirname(fileURLToPath(import.meta.url));
const local = f => f.startsWith('/mnt/e/') ? 'E:/' + f.slice(7) : f.startsWith('/home/') ? '//wsl.localhost/Debian' + f : f;
const sha = b => createHash('sha256').update(b).digest('hex'), inputs = [];
function read(file, expected) { const b = fs.readFileSync(local(file)), hash = sha(b); if (expected) assert.equal(hash, expected, file); inputs.push({ file, bytes: b.length, rawBytesSha256: hash }); return b; }
const json = (file, expected) => JSON.parse(read(file, expected)), pinned = p => json(p.file, p.rawBytesSha256);
const receiptFile = root + '/tmp/rust-r4ghi/root/ui-runtime14/dom14-source12-06b/receipt10.json';
const receiptSHA = '7341507ba26ab8f4833ba49531a0b4a72f6db94b54d8921a58f0dd80166898e9';
const receipt = json(receiptFile, receiptSHA), windows = root + '/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-06b';
assert.equal(receipt.epoch, 'g2-business12'); assert.equal(receipt.status, 'passed-bound-cases-only'); assert.equal(receipt.allSixCasesPassed, false);
assert.deepEqual(receipt.unboundCases, ['creator', 'execution-owner']); assert.deepEqual(receipt.proxyFailures, []); assert.equal(receipt.close.serverClosed, true); assert.equal(receipt.close.pending, 0); assert.equal(receipt.close.failures, 0);
assert.equal(receipt.actualSourceBinding.migrations, 97); assert.equal(receipt.actualSourceBinding.processBinarySHA256, 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff'); pinned(receipt.actualSourceBinding.sourceManifest);
const worker = json(windows + '/windows-complete.json'); assert.deepEqual(worker.cases, receipt.cases);
const { classifyFontBoundary32: classify } = await import(pathToFileURL(root + '/tools/rust-r4ghi/business/ui-font-boundary32.mjs'));
const http = '/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/dom14-source12-06b/http';
const actualCases = [], allWires = [], writes = [];
for (let index = 0; index < receipt.cases.length; index++) {
  const c = receipt.cases[index], directory = windows + '/case-' + index; assert.equal(c.status, 'passed'); assert.equal(c.pageErrors, 0);
  for (const p of c.privateWindowsArtifacts) read(directory + '/' + p.file, p.rawBytesSha256);
  const log = json(directory + '/browser-log.json'), font = json(directory + '/font-boundary32.json'); assert.deepEqual(log.pageErrors, []);
  const classification = classify({ failedRequests: font.failedRequests, consoleRecords: font.consoleRecords, consoleErrors: log.consoleErrors, blocked: log.blockedOrigins }); assert.deepEqual(classification, font.verification); assert.equal(classification.classifiedPairs.length, 1);
  for (const e of c.exchanges) {
    const w = json(http + '/' + e.privateRaw.file, e.privateRaw.rawBytesSha256); assert.equal(w.response.status, e.status); assert.equal(w.request.method, e.method); assert.equal(w.response.complete, true); assert.equal(w.failure, null);
    const ledger = pinned(e.ledger); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
    const observer = receipt.observerReceipts.find(r => r.ledger.rawBytesSha256 === e.ledger.rawBytesSha256); assert(observer); assert.equal(observer.status, e.status);
    const pub = json(root + '/tmp/rust-r4ghi/business/g2-business12/main01/' + observer.publicReceipt); assert.equal(pub.requestId, ledger.requestId); assert.deepEqual(pub.ledger, e.ledger);
    const original = pinned(pub.originals), intent = pinned(pub.intent); assert.equal(original.bodyBase64, w.response.bodyBase64); assert.equal(intent.bodyBase64, w.request.bodyBase64);
    allWires.push({ method: w.request.method, path: w.request.path, status: w.response.status, rawSHA256: e.privateRaw.rawBytesSha256 });
    if (!['GET', 'HEAD'].includes(w.request.method)) { assert.equal(index, 0); writes.push({ e, w, ledger, pub, original }); }
  }
  if (index !== 0) { assert.equal(c.businessWritePerformed, false); assert(c.exchanges.every(e => ['GET', 'HEAD'].includes(e.method))); }
  actualCases.push({ kind: c.kind, status: c.status, pageErrors: 0, strictFontPairs: classification.classifiedPairs.length, businessWritePerformed: c.businessWritePerformed });
}
assert.deepEqual(actualCases.map(c => c.kind), ['own-condition', 'legacy-anchor', 'money-max', 'sensitive-mask']); assert.equal(writes.length, 5);
const un = x => x?.data ?? x, requestBody = x => JSON.parse(Buffer.from(x.w.request.bodyBase64, 'base64')), responseBody = x => un(JSON.parse(Buffer.from(x.w.response.bodyBase64, 'base64')));
const create = writes.find(x => x.w.request.path === '/api/attachment-upload-sessions'), upload = writes.find(x => x.w.request.method === 'PUT'), complete = writes.find(x => x.w.request.path.endsWith(':complete')), close = writes.find(x => x.w.request.path.endsWith(':close'));
assert(create && upload && complete && close); assert.equal(create.w.response.status, 201); assert.equal(close.w.response.status, 200);
const ui = receipt.cases[0].uiWriteResult, createBody = requestBody(create), completed = responseBody(complete), closed = responseBody(close), closeBody = requestBody(close), actor = closed.closedBy;
assert.equal(ui.parentId, '7d923602-3e01-4e17-be37-8aec28980862'); assert.equal(ui.childId, 'f5704473-b662-4bb0-86e6-2de5cb7ddde0'); assert.equal(ui.actualClosureId, '04fae3b0-3777-4074-90bb-1d8edf58a59f'); assert.equal(ui.actualUploadedAttachmentId, '193d8466-b30a-4724-ae1f-70397e066b2e');
assert.deepEqual(createBody.completionConditionContext, { completionRecordId: ui.parentId, conditionId: ui.childId }); assert.equal(createBody.targetId, '89df00c2-3342-4454-9974-6685c210d2e8');
assert.equal(close.w.request.path, `/api/project-completion-records/${ui.parentId}/conditions/${ui.childId}:close`); assert.equal(closed.conditionStatus, 'closed'); assert.equal(closed.scopeKind, 'own-condition-only'); assert.equal(closed.closureRecordId, ui.actualClosureId);
const bytes = Buffer.from(upload.w.request.bodyBase64, 'base64'); assert.equal(sha(bytes), '0f99354f7bc6e27f59217bd3d85ec1a854ff15efaa5ba53a0cbfaac3755c03e7'); assert.equal(bytes.length, 322); assert.equal(completed.checksumSha256, sha(bytes)); assert.equal(completed.id, ui.actualUploadedAttachmentId);
assert.equal(closeBody.evidenceRefs.length, 1); assert.equal(closeBody.evidenceRefs[0].attachmentLinkId, completed.links[0].id); assert.equal(closed.closureEvidenceRefs.length, 1); assert.equal(closed.closureEvidenceRefs[0].attachmentId, completed.id); assert.equal(closed.closureEvidenceRefs[0].checksumSha256, sha(bytes));
assert.equal(closeBody.expectedConditionVersion, 1); assert.equal(closeBody.expectedCompletionVersion, 1);
const before = pinned(close.ledger.before), after = pinned(close.ledger.after), database = 'poms_r4ghi_rust';
const rows = (snapshot, db, table) => { const m = snapshot.databases[db].tables[table]; return read(m.file, m.rawBytesSha256).toString().split('\n').filter(Boolean).map(line => { const r = JSON.parse(line); assert.equal(sha(r.raw), r.sha256); return r; }); };
const one = (snapshot, table, id) => { const found = rows(snapshot, database, table).filter(r => r.key[0] === id); assert.equal(found.length, 1, table + ':' + id); return found[0]; };
const session = JSON.parse(one(after, 'attachment_upload_session', responseBody(create).id).raw); assert.equal(session.status, 'completed'); assert.equal(session.project_scope_context_version, 1); assert.equal(session.completion_record_id, ui.parentId); assert.equal(session.completion_condition_id, ui.childId); assert.equal(session.completed_attachment_id, completed.id); assert.equal(session.created_by, actor);
for (const [table, id] of [['attachment', 'fe07ecbc-c2c7-4595-adb1-74e7a18190e3'], ['attachment_upload_session', '851ec38b-422e-46e0-b5ed-9a050d475de7']]) { const a = one(before, table, id), b = one(after, table, id); assert.equal(a.sha256, b.sha256); assert.equal(a.xmin, b.xmin); }
const expected = close.ledger.recorded.map(r => JSON.stringify([database, r.table, r.key])).sort(), differences = [], xmins = new Set();
for (const db of Object.keys(before.databases)) {
  assert.deepEqual(before.databases[db].meta, after.databases[db].meta); assert.deepEqual(before.objects[db], after.objects[db]);
  for (const table of Object.keys(before.databases[db].tables)) {
    const a = new Map(rows(before, db, table).map(r => [JSON.stringify(r.key), r])), b = new Map(rows(after, db, table).map(r => [JSON.stringify(r.key), r]));
    for (const key of new Set([...a.keys(), ...b.keys()])) if (a.get(key)?.sha256 !== b.get(key)?.sha256 || a.get(key)?.xmin !== b.get(key)?.xmin) { const next = b.get(key); assert(next); differences.push(JSON.stringify([db, table, next.key])); xmins.add(next.xmin); }
  }
}
assert.deepEqual(differences.sort(), expected); assert.equal(xmins.size, 1); assert.equal(expected.length, 5);
const conditionBefore = JSON.parse(one(before, 'project_completion_condition', ui.childId).raw), conditionAfter = JSON.parse(one(after, 'project_completion_condition', ui.childId).raw); assert.equal(conditionBefore.status, 'pending'); assert.equal(conditionAfter.status, 'closed');
for (const f of receipt.build.files) read(receipt.build.directory + '/' + f.file, f.rawBytesSha256);
const report = { kind: 'H32-actual06b-independent-FS-readback86b', createdAt: new Date().toISOString(), receipt: { file: receiptFile, rawBytesSha256: receiptSHA }, source: { epoch: 'g2-business12', API: '135', migrations: 97, sourceManifest: receipt.actualSourceBinding.sourceManifest, binarySHA256: receipt.actualSourceBinding.processBinarySHA256 },
  conclusion: 'four-bound-cases-and-actual-own-purpose-closure-FS-verified', cases: actualCases, actualRawHTTPCount: allWires.length, actualWriteCommands: writes.map(x => ({ method: x.w.request.method, path: x.w.request.path, status: x.w.response.status, requestId: x.ledger.requestId })),
  own: { ...ui, actor, exactDoubleUUIDInSessionAndClosePath: true, exactPurposeContextVersion: 1, fileBytes: bytes.length, onlyNewAttachmentAdopted: true, old05UploadAndAttachmentPreserved: true, fiveNecessaryWritesSameXmin: [...xmins][0], allOtherRowsIncludingNativeUnchangedAcrossClose: true, catalogSequencesAndObjectsUnchangedAcrossClose: true, completionConditionStatusAfter: closed.completionConditionStatus },
  allSixCasesPassed: false, unboundCases: receipt.unboundCases, original04And05StillFailed: true, EO05NotReplayedOrRelabeled: true,
  limits: ['No browser, HTTP, SQL, process, Git or product/helper mutation by reviewer.', 'DOM artifacts were read and hashed; this report does not claim a separate interactive browser session.', 'Legacy remains controlled compatibility-negative evidence, not a real historical producer.', 'No Role/Expense/GH/Lifecycle forms, same-task CAS/race, or Source13 certification is implied.'],
  G3Certified: false, G4Certified: false, inputs };
fs.writeFileSync(path.join(out, 'readback86b.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ cases: actualCases.length, rawHTTP: allWires.length, businessWrites: writes.length, closureNecessaryRows: expected.length, sameXmin: [...xmins][0], buildLeaves: receipt.build.files.length, allSixCasesPassed: false, G3Certified: false }));
