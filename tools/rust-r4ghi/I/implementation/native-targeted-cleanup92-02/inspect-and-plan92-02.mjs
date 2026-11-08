// FS-only exact evidence verification and reviewable cleanup-plan template.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TARGET92_02 as T, verifyBirth92_02 } from './proposed/tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs';
const out = path.dirname(fileURLToPath(import.meta.url)), dir = '/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/source12-native01';
const sha = b => createHash('sha256').update(b).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
function read(p) { const bytes = fs.readFileSync(p.file); assert.equal(sha(bytes), p.rawBytesSha256); return JSON.parse(bytes); }
function rows(t) { const bytes = fs.readFileSync(t.file); assert.equal(sha(bytes), t.rawBytesSha256); return bytes.toString().split('\n').filter(Boolean).map(JSON.parse); }
const statePin = pin(`${dir}/state.json`); assert.equal(statePin.rawBytesSha256, T.originalStateSHA256); const state = read(statePin);
const oldPlan = pin(`${dir}/plan.json`); assert.equal(oldPlan.rawBytesSha256, T.oldPlanSHA256); const old = read(oldPlan);
const proof17 = pin(`${dir}/000043-modern17-proof.json`); assert.equal(proof17.rawBytesSha256, T.proof17SHA256); const actual17 = read(proof17); assert.equal(actual17.actualNative422Operations.length, 17);
const loginPin = state.attempts.find(a => a.role === 'login').observation, login = read(loginPin), headers = read(login.originals.responseHeaders), owned = Object.values(state.owned).filter(x => !x.deleted); assert.equal(owned.length, 1);
const before = read(login.before), after = read(login.after);
const birth = verifyBirth92_02({ owned: owned[0], login, headers, beforeRows: rows(before.databases[T.database].tables.auth_session), afterRows: rows(after.databases[T.database].tables.auth_session) });
const actualLedger = read(login.ledger); assert.equal(actualLedger.ownershipComplete, true); assert.equal(actualLedger.requestId, login.attempt.requestId);
const orphan44 = pin(`${dir}/snapshot-000044-cleanup-before.json`), orphan = read(orphan44); assert.equal(orphan.label, '000044-cleanup-before');
const target = rows(orphan.databases[T.database].tables.auth_session).find(row => row.key[0] === T.id); assert.equal(target.sha256, T.rowSHA256); assert.equal(target.xmin, T.xmin);
const bodyBytes = fs.readFileSync(login.originals.responseBody.file); assert.equal(sha(bodyBytes), login.originals.responseBody.rawBytesSha256); const body = JSON.parse(bodyBytes);
const paths = []; function find(value, p = '') { if (value === T.id) paths.push(p); if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) find(v, p + '/' + k); } find(body); assert.equal(paths.length, 0);
const evidence = { kind: 'FS-only-exact-Native-cleanup92-02-evidence', originalStateObservedPin: statePin, originalStateClassification: 'mutable pre-reconciliation observation; actual bytes will be preserved privately by the new cleanup tool before any change',
  originalPlan: oldPlan, native17Proof: proof17, loginObservation: loginPin, loginHeaders: login.originals.responseHeaders, loginBody: login.originals.responseBody, loginLedger: login.ledger,
  birthSnapshots: { before: login.before, after: login.after }, existingOrphan44: orphan44, stateSequence: state.sequence, snapshot44SequenceAlreadyConsumedInFilesystem: true,
  target: T, verifiedBirth: { ...birth, tokenHash: 'verified-in-memory-not-exported' }, actualBodyContainsSessionID: false,
  genericClassification: 'First cookie-token-hash anchor is fed to the second birthProof pass, producing HTTP-real-response-ID with pointer literal HTTP-real-cookie-token-hash. No JSON response session ID is claimed.',
  plannedMetadataTransition: '43->44 plus a cleanup92_02 overlay only; original plan/source164/proof17/owned identities unchanged; snapshot44 never overwritten',
  SQL: false, HTTP: false, RootWritten: false, CredentialOrCookieValuesExported: false };
fs.writeFileSync(`${out}/evidence92-02.json`, JSON.stringify(evidence, null, 2) + '\n');
const plan = { kind: 'Root-reviewed-one-Native-session-cleanup92-02', target: T, originalState: statePin, oldPlan, native17Proof: proof17, orphan44,
  stoppedProcessReceipt: pin(`${dir}/process-stopped.json`), currentGraph: null,
  toolSHA256: sha(fs.readFileSync(`${out}/proposed/tools/rust-r4ghi/business/native-targeted-cleanup92-02.mjs`)),
  scope: 'New cleanup-only plan/current graph; never run modified code under the old Native17 plan; Root fills currentGraph after exact promotion and review. No HTTP/process/producer replay.' };
fs.writeFileSync(`${out}/plan-template92-02.json`, JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify({ evidence: `${out}/evidence92-02.json`, originalStateSHA256: statePin.rawBytesSha256, existing44SHA256: orphan44.rawBytesSha256, exactCookieDerivedTupleVerified: true, actualJSONSessionID: false, cookieValuesExported: false, SQL: false, HTTP: false }));
