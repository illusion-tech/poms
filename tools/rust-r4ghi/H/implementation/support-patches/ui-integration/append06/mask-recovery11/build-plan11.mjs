// Offline original-file review only. Never imports business context, SQL, HTTP or a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { proveReassignment } from './recover-mask11.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), linuxPrivate = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01', uncPrivate = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const physical = file => { assert(file.startsWith(linuxPrivate + '/')); return uncPrivate + file.slice(linuxPrivate.length); };
const raw = name => fs.readFileSync(`${uncPrivate}/${name}`), json = name => JSON.parse(raw(name));
const descriptor = name => ({ file: `${linuxPrivate}/${name}`, sha256: sha(raw(name)) });
const stateBytes = raw('state.json'), state = JSON.parse(stateBytes), request = json('000658-http-request.json'), body = json('000658-http-request-body.bin'), response = json('000658-http-response-body.bin'), ledger = json('000659-ledger.json');
const httpName = '/tmp/rust-r4ghi/business/g2-business08/main01/000658-http-http.json', httpBytes = fs.readFileSync(root + httpName), http = JSON.parse(httpBytes);
function snapshot(pin) { const bytes = fs.readFileSync(physical(pin.file)); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes); }
function rows(snapshot, table) { const meta = snapshot.databases.poms_r4ghi_rust.tables[table], bytes = fs.readFileSync(physical(meta.file)); assert.equal(sha(bytes), meta.rawBytesSha256); return bytes.toString().split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(Buffer.from(row.raw)), row.sha256); return row; }); }
const before = snapshot(ledger.before), after = snapshot(ledger.after), selected = value => Object.fromEntries(['project', 'project_owner_reassignment_record', 'audit_log', 'auth_session'].map(table => [table, rows(value, table)]));
const input = { state, database: 'poms_r4ghi_rust', request, body, response, http, ledger, beforeRows: selected(before), afterRows: selected(after) };
const proof = proveReassignment(input);
assert(!state.blockedObservation && !Object.hasOwn(state.fixtures, 'maskReassignment'));
const originals = Object.fromEntries(['000658-http-request.json', '000658-http-request-body.bin', '000658-http-response-headers.json', '000658-http-response-body.bin', '000659-ledger.json', '000626-H-mask-fixture09-partial.json'].map(name => [name, descriptor(name)]));
const plan = { schemaVersion: 1, kind: 'proposed-exact-committed-reassignment-failed-contract-metadata-recovery', namespace: state.namespace, epoch: state.epoch, run: state.run, marker: state.marker,
  reviewStateSHA256: sha(stateBytes), operationId: request.operationId, requestId: request.requestId, canonicalOpenApiSHA256: sha(fs.readFileSync(`${root}/libs/shared/api-spec/openapi.json`)), originals,
  httpReceipt: { file: linuxRoot + httpName, sha256: sha(httpBytes) }, before: ledger.before, after: ledger.after, proof,
  permittedMetadataChanges: ['fixtures.maskReassignment = exact actual 000658 response body', 'fixtures.maskReassignmentRecovery = approved exact-plan/private proof links', 'fixtures.maskReassignmentContractFailure = preserved actual201/canonical200 failure', 'sequence/private artifact bookkeeping only'],
  forbidden: ['business HTTP/SQL write', 'repeat reassignOwner POST', 'change canonical expected200 to201', 'fake successful200', 'mutate owned/borrowed row proof', 'clear/create blockedObservation', 'rewrite prior originals'], RootApprovalRequiredBeforeApply: true, applied: false, G3Certified: false, G4Certified: false };
const target = path.join(own, 'recovery-plan11.json'); assert(!fs.existsSync(target)); fs.writeFileSync(target, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
let cases = 0; const check = fn => { fn(); cases++; };
check(() => assert.equal(proof.contractPassed, false));
for (const mutation of [value => { value.http.status = 200; }, value => { value.http.expectedStatus = 201; }, value => { value.ledger.blockers = [{ kind: 'unresolved' }]; }, value => { value.body.expectedVersion = 0; }, value => { value.response.newOwnerUserId = value.state.actors.manager.id; }, value => { value.afterRows.project_owner_reassignment_record.find(row => row.key[0] === proof.reassignmentId).xmin = 'wrong-xmin'; }]) {
  const altered = structuredClone(input); mutation(altered); check(() => assert.throws(() => proveReassignment(altered)));
}
const result = { schemaVersion: 1, status: 'passed-offline-actual-original-proof-and-negative-guards', cases, actualStatus: 201, canonicalExpectedStatus: 200, contractPassed: false, threeRowsSameXminAndLatestOwned: true,
  freshLiveCurrentSnapshotTakenByAuthor: false, planSHA256: sha(fs.readFileSync(target)), metadataApplied: false, HTTPExecuted: false, DBExecuted: false, browserExecuted: false, privateOriginalsCopied: false };
fs.writeFileSync(path.join(own, 'unit-recovery11.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
