// Reviewed metadata-only withdrawal for the never domain-consumed first119.
// This preserves its history/counter and keeps ordinary contexts fail closed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FIXED, ownedFile } from './business/context.mjs';
import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';
import { readRows } from './business/snapshot.mjs';
import { sha } from './business/pure.mjs';
const R = FIXED.win, P = FIXED.private, D = P + '/business/g2-business13/main01';
assert.equal(fileURLToPath(import.meta.url), R + '/tools/rust-r4ghi/withdraw-unconsumed119-232.mjs');
const args = process.argv.slice(2); assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-plan-sha' && ['--inspect', '--withdraw'].includes(args[4]));
const pin = (file, expected) => { const raw = ownedFile(file); if (expected) assert.equal(sha(raw), expected); return { file, rawBytesSha256: sha(raw) }; };
const json = p => { pin(p.file, p.rawBytesSha256); return JSON.parse(ownedFile(p.file)); };
const contained = file => { const real = fs.realpathSync(path.dirname(file)); assert.equal(real, path.dirname(file)); const rel = path.relative(D, file); assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); };
const planPin = pin(args[1], args[3]); contained(planPin.file); const plan = json(planPin);
assert.equal(plan.kind, 'Root-approved-unconsumed-domain-tool119-metadata-withdrawal232');
const keys = ['kind','currentState','registry','approved119Plan','publication','B2','post228','preWithdrawal233','failed227','fixtureProposal','fixtureReview','withdrawalReview','sourcePins','currentH1','outputDirectory'];
assert.deepEqual(Object.keys(plan).sort(), keys.sort()); for (const value of Object.values(plan)) assert(value !== null && value !== undefined);
assert.equal(plan.outputDirectory, D + '/tool119-withdraw232');
const nonce = randomUUID(), lock = D + '/driver.lock', lockBytes = Buffer.from(JSON.stringify({ pid: process.pid, nonce, mode: 'unconsumed119-withdrawal232', approvedPlan: planPin }) + '\n');
fs.writeFileSync(lock, lockBytes, { flag: 'wx', mode: 0o600 }); let phase = 'locked', withdrawn = false;
const writeNew = (name, value) => { assert.equal(path.basename(name), name); const file = plan.outputDirectory + '/' + name, raw = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } return pin(file); };
try {
  assert.equal(plan.currentState.rawBytesSha256, 'b079c3644934ebdcd3a5167c975139704782e37147aa92b418dd391d5570f358'); assert.notEqual(plan.currentState.file, D + '/state.json');
  const stateFile = D + '/state.json', beforeRaw = ownedFile(stateFile); assert.equal(sha(beforeRaw), plan.currentState.rawBytesSha256); assert.deepEqual(beforeRaw, ownedFile(plan.currentState.file));
  const state = JSON.parse(beforeRaw); assert.equal(state.epoch, 'g2-business13'); assert.equal(state.run, 'main01'); assert.equal(state.namespace, FIXED.namespace); assert.equal(state.marker, '0ca66699-053b-4f40-ad5c-82fed4cf1a6f'); assert.equal(state.sequence, 38);
  for (const key of ['activeFault','blockedObservation','cleaned','cleanupPlan','admissionPending54']) assert(!state[key]); assert(!state.taxContinuation13);
  assert.equal(plan.registry.rawBytesSha256, '684acb155e2469e420ef27e2d9c633d501e647d81825d7395c162277d951d27e'); assert.equal(plan.approved119Plan.rawBytesSha256, 'c0a11f8980817e17f244601769d01a44848b02d98a6b9915c58c62472bdd0cee');
  assert.equal(plan.publication.rawBytesSha256, 'c5d3c3c06dad126a3d1c4f05b7fc452c59b1181fa719f113834f15486d353e03'); assert.equal(plan.B2.rawBytesSha256, '9f8a6c533eec86cb15b51a4a21f8f6ef79ab8363e30dcab5b428828742dee7b6');
  assert.deepEqual(state.toolAdmission119, { registry: plan.registry, approvedPlan: plan.approved119Plan }); const registry = json(state.consumerAdmission54.registry);
  const ctx = { ...FIXED, epoch: state.epoch, run: state.run, priv: D, state, pins: state.sourcePins }; assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true });
  const publication = json(plan.publication); assert.deepEqual(publication.registry, plan.registry); assert.deepEqual(publication.approvedPlan, plan.approved119Plan); assert.equal(publication.publishedState.rawBytesSha256, sha(beforeRaw));
  const B2 = json(plan.B2); assert.deepEqual(B2.toolRevision119.registry, plan.registry); assert.deepEqual(B2.toolRevision119.helperPins, plan.currentH1);
  assert.equal(plan.post228.rawBytesSha256, '93ce215b48eaae4d118a4bd3e723698b2ebb53410cd91ee0939757d30e2cef46'); const post = json(plan.post228), fresh = json(plan.preWithdrawal233);
  assert.equal(fresh.kind, 'actual-readonly-before-withdrawal119-full-data-conservation233'); assert.equal(fresh.publishedState.rawBytesSha256, sha(beforeRaw));
  const a = json(post.actualPostPublicationSnapshot), b = json(fresh.actualPreWithdrawalSnapshot); assert.equal(Object.keys(b.databases).length, 2);
  const counts = {};
  for (const db of FIXED.databases) { assert.deepEqual(a.databases[db].meta, b.databases[db].meta); assert.deepEqual(a.objects[db], b.objects[db]); assert.deepEqual(Object.keys(a.databases[db].tables), Object.keys(b.databases[db].tables)); assert.equal(Object.keys(b.databases[db].tables).length, 139); counts[db] = 0;
    for (const table of Object.keys(b.databases[db].tables)) { const before = readRows(a.databases[db].tables[table]), now = readRows(b.databases[db].tables[table]); assert.deepEqual(before, now); counts[db] += now.length; } }
  assert.equal(plan.failed227.rawBytesSha256, '907dce9e2cf7a29728d5e310cf4233461dead50d77f8270c9c95b538c03b80fa'); const failed = json(plan.failed227); assert.deepEqual([failed.tests,failed.pass,failed.fail], [211,209,2]);
  assert.equal(plan.fixtureProposal.rawBytesSha256, '803166aa0ae9a7dd409f047b3a69ad0961f0dad13b394dec000ba7bf9e096daa'); json(plan.fixtureProposal);
  assert.equal(plan.fixtureReview.rawBytesSha256, '60f8334ce3c2efa3ae67062ede2549f2aae1ff16130ceab1fdf9991b1270325f'); json(plan.fixtureReview);
  const approval = json(plan.withdrawalReview); assert.equal(approval.allowsMetadataWithdrawal, true); assert.equal(approval.onlyCounterPreservingUnconsumed119Withdrawal, true); assert.equal(approval.script.rawBytesSha256, sha(ownedFile(R + '/tools/rust-r4ghi/withdraw-unconsumed119-232.mjs')));
  assert.equal(plan.sourcePins.rawBytesSha256, 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'); const sources = json(plan.sourcePins);
  assert.equal(plan.currentH1.rawBytesSha256, '092483fc8fa018d425d765889f4389d8c136ec28aa8463acf92e8e5369781343'); const helpers = json(plan.currentH1); assert.deepEqual(state.sourcePins, sources);
  for (const item of [...sources,...helpers]) assert.equal(sha(ownedFile(R + '/' + item.file)), item.sha256);
  const next = structuredClone(state), history = state.toolAdmissionHistory119 ?? []; assert(Array.isArray(history));
  delete next.toolAdmission119;
  next.toolAdmissionHistory119 = [...history, { registry: plan.registry, approvedPlan: plan.approved119Plan, publication: plan.publication, B2: plan.B2,
    publishedState: plan.currentState, verifiedPost228: plan.post228, verifiedPreWithdrawal233: plan.preWithdrawal233, originalFailedSuite227: plan.failed227,
    withdrawalPlan: planPin, reason: 'unconsumed-domain-synthetic-test-fixture-input-correction', counterWasRetained: 38 }];
  const { toolAdmission119: ignored, toolAdmissionHistory119: oldHistory, ...oldRest } = state, { toolAdmissionHistory119: newHistory, ...newRest } = next; assert.deepEqual(newRest, oldRest); assert.equal(next.sequence, 38); assert.deepEqual(newHistory.slice(0,-1), history);
  assert.throws(() => assertAdmittedContext54({ ...ctx, state: next }, { liveProcess: false, sourceFiles: true }), /Changed\/unadmitted tools require an explicit119/);
  const nextRaw = Buffer.from(JSON.stringify(next, null, 2) + '\n'); phase = 'validated'; fs.mkdirSync(plan.outputDirectory, { recursive: true, mode: 0o700 });
  if (args[4] === '--inspect') { const receipt = writeNew('inspect232.json', { kind: 'validated-unconsumed119-withdrawal-not-applied232', plan: planPin, currentState: plan.currentState, prospectiveStateSHA256: sha(nextRaw), counts, onlyToolPointerRemovalAndHistoryAppend: true, counterRetained: 38, ordinaryContextWouldFailClosed: true, SQLOrHTTP: false }); console.log(JSON.stringify({ inspected: true, receipt, stateChanged: false })); }
  else {
    const prospective = writeNew('prospective-entry232.json', nextRaw); assert.equal(sha(ownedFile(stateFile)), plan.currentState.rawBytesSha256); assert.deepEqual(ownedFile(lock), lockBytes);
    const temp = D + '/state-withdraw119-' + nonce + '.tmp', fd = fs.openSync(temp, 'wx', 0o600); try { fs.writeFileSync(fd, nextRaw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.equal(sha(ownedFile(stateFile)), plan.currentState.rawBytesSha256); phase = 'commit-ready'; fs.renameSync(temp, stateFile); withdrawn = true; phase = 'withdrawn'; assert.deepEqual(ownedFile(stateFile), nextRaw);
    const receipt = writeNew('withdrawal232.json', { kind: 'actual-counter-preserving-unconsumed-tool119-metadata-withdrawal232', plan: planPin,
      beforeState: plan.currentState, actualNewEntry: prospective, oldRegistry: plan.registry, oldPlan: plan.approved119Plan, oldPublication: plan.publication, oldB2: plan.B2,
      original227Failure: plan.failed227, counts, onlyToolPointerRemovalAndHistoryAppend: true, counterRetained: 38, originalBusinessSourceSchemaFieldsUnchanged: true,
      ordinaryContextFailsClosedUntilNewAdmission: true, oldGraphAndAllOriginalsPreserved: true, SQLOrHTTP: false, G3Certified: false, G4Certified: false });
    console.log(JSON.stringify({ withdrawn: true, receipt, actualNewEntry: prospective, counterRetained: 38, ordinaryContextFailClosed: true, SQLOrHTTP: false }));
  }
} catch (error) { fs.mkdirSync(plan.outputDirectory, { recursive: true, mode: 0o700 }); const original = writeNew('partial232-' + nonce + '.json', { phase, withdrawn, name: error.name, message: error.message, stack: error.stack, plan: planPin, noBlindRetry: true }); console.error(JSON.stringify({ completed: false, withdrawn, original, noBlindRetry: true })); process.exitCode = 1; }
finally { assert.deepEqual(ownedFile(lock), lockBytes); fs.unlinkSync(lock); }
