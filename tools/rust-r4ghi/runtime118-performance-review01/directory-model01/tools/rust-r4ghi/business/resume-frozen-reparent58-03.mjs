// Root-only exact continuation of the already committed create200. No HTTP.
// Reconcile is metadata + read-only snapshots; remaining delegates to the
// existing parent-locked, always-ROLLBACK four-probe executor without changes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createContext } from './context.mjs';
import { sha } from './pure.mjs';
import { capture, loadSnapshot } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { assertSweepRollback } from './fault-sweep.mjs';
import { continueFrozenReparent58, assertFrozenResumeCases58 } from './frozen-reparent58.mjs';
export const FIXED_RESUME58_03 = Object.freeze({
  epoch: 'g2-business12', run: 'main01', namespace: 'poms-r4ghi', sequence: 6943,
  draftAssignmentId: '1817b9ae-ec3a-4910-aebd-07a2b6963975', projectId: '389793fb-0f5b-48ea-a5f1-8515ee572d7f',
  mainAssignmentId: '4fb574d1-1552-4a8a-8340-175d2da12b84', mainProjectId: '51d60c76-6de2-432a-8714-10e3ed3234f3',
  liveStateSHA256: '6aff8ae1bc2dc2b2ec69e52b42862cf3e20b732982ffa952f53f5049969c1915',
  createSHA256: '97da24bb0bc675bf217e2f99d2b65bef5e75490b54035491aa276962193752d7', ledgerSHA256: 'dfd7c3f0f41bec528163a89e8f1771617d7d756da62df986192a87351a26dc8c',
  case1ObservationSHA256: 'ed05a8636fac0b0b7a4b9452d8495aa5f0976ad5d7769ff044502c41563c3cb0', case1AfterSHA256: 'cf32a34c2544bc55b051b23ba439ec2e581405f6d8b0f22c94f60071c228c947',
});
const F = FIXED_RESUME58_03, folder = '/home/wangzishi/.local/share/poms-r4ghi/private/business/' + F.epoch + '/' + F.run;
const oldUIPartials58_03 = [
  ['http/error-1.log', 'ad5abde528fae4efcfcb888b49e5707753fe0e3aaf71d945fedde2f6300832db'],
  ['linux-failure.log', '660d1c9b8d68847a6f77c9b1dc145a8f577d773f2df02ec718b66d3f93adbc15'],
  ['done.json', 'af416571a4b858abcbba349a594ecd5c4e562c9a9fb0876f8fda378141b78062'],
].map(([name, rawBytesSha256]) => ({ file: '/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/role18-source12-02/' + name, rawBytesSha256 }));
const read = pin => { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file)); const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return bytes; };
const json = pin => JSON.parse(read(pin));
const samePin = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
const recordOf = state => state.consumerChecks?.frozenReparent58?.[F.draftAssignmentId];
export function projectedResumeState58_03(state) { const value = structuredClone(state); delete value.sequence; const resumes = value.consumerChecks?.frozenReparent58Resume03; if (resumes) { delete resumes[F.draftAssignmentId]; if (!Object.keys(resumes).length) delete value.consumerChecks.frozenReparent58Resume03; } return value; }
export function validateFixedResumeState58_03(state, originalRecord) {
  assert.equal(state.epoch, F.epoch); assert.equal(state.run, F.run); assert.equal(state.namespace, F.namespace); assert(!state.activeFault && !state.blockedObservation && !state.cleaned && !state.cleanupPlan);
  const record = recordOf(state); assert(record); assert.equal(record.projectId, F.projectId); assert.equal(record.draftAssignmentId, F.draftAssignmentId); assert.equal(record.mainProjectId, F.mainProjectId); assert.equal(record.mainAssignmentId, F.mainAssignmentId);
  assert.deepEqual(record, originalRecord); assertFrozenResumeCases58(record, originalRecord.cases['zero-reparent-to-draft']);
  return record;
}
function validatePlan(plan) {
  assert.equal(plan.kind, 'exact-case1-preserving-frozen58-resume03'); assert.equal(plan.schemaVersion, 1); assert.equal(plan.epoch, F.epoch); assert.equal(plan.run, F.run);
  assert.equal(plan.draftAssignmentId, F.draftAssignmentId); assert.equal(plan.projectId, F.projectId); assert.equal(plan.expectedSequence, F.sequence); assert.equal(plan.expectedLiveStateSHA256, F.liveStateSHA256);
  assert.equal(plan.createReceipt.rawBytesSha256, F.createSHA256); assert.equal(plan.createLedger.rawBytesSha256, F.ledgerSHA256); assert.equal(plan.case1Observation.rawBytesSha256, F.case1ObservationSHA256); assert.equal(plan.case1After.rawBytesSha256, F.case1AfterSHA256);
  assert(/^[a-f0-9]{64}$/.test(plan.originalRecordSHA256)); assert(/^[a-f0-9]{64}$/.test(plan.sourcePinsSHA256)); read(plan.currentHelperGraph);
  assert.equal(plan.repeatCreate, false); assert.equal(plan.repeatCompletedCase1, false); assert.equal(plan.parentlessOrCommitWindow, false); assert.equal(plan.G3Certified, false);
  for (const pin of [plan.createReceipt, plan.createLedger, plan.case1Observation, plan.case1After, ...plan.oldUIPartials]) read(pin);
  assert.equal(plan.oldUIPartials.length, 3); for (let index = 0; index < oldUIPartials58_03.length; index += 1) assert(samePin(plan.oldUIPartials[index], oldUIPartials58_03[index]), 'Preserve the exact failedRole02 partials, never overwrite or replace them'); return plan;
}
function validateOriginalInputs(plan, oldState) {
  const record = recordOf(oldState); assert.equal(sha(JSON.stringify(record)), plan.originalRecordSHA256); validateFixedResumeState58_03(oldState, record);
  assert.equal(sha(JSON.stringify(oldState.sourcePins)), plan.sourcePinsSHA256); assert.equal(oldState.sequence, F.sequence);
  assert(samePin(record.createReceipt, plan.createReceipt) && samePin(record.createLedger, plan.createLedger)); assert(samePin(record.cases['zero-reparent-to-draft'].observation, plan.case1Observation));
  const response = json(plan.createReceipt), ledger = json(plan.createLedger), observation = json(plan.case1Observation);
  assert.equal(response.attempt.operationId, 'CommissionController_createRoleAssignment'); assert.equal(response.attempt.status, 200); assert.equal(response.attempt.expectedStatus, 200); assert.equal(response.attempt.responseComplete, true);
  assert.equal(response.attempt.body.id, F.draftAssignmentId); assert.equal(response.attempt.pathParams.projectId, F.projectId); assert.equal(ledger.requestId, response.attempt.requestId); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
  assert.equal(observation.failure.code, '23514'); assert.equal(observation.failure.message, 'assignment participant cannot be reparented'); assert.equal(observation.infrastructureFailure, null); assert.equal(observation.commitAttempted, false); assert(samePin(observation.after, plan.case1After));
  return { record, observation };
}
async function equalFresh(ctx, label, case1After) { const name = ctx.next(label); ctx.persist(); const snapshot = await capture(ctx, name); assertSweepRollback(ctx, case1After, snapshot, { sessionId: null }, null); assertRecorded(ctx, snapshot); return snapshot; }
export async function resumeFrozen58_03({ planFile, approvedPlanSHA256, mode }) {
  assert.equal(process.platform, 'linux'); assert(['reconcile', 'remaining'].includes(mode)); const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), approvedPlanSHA256); const plan = validatePlan(JSON.parse(planBytes));
  const stateFile = folder + '/state.json', liveBytes = fs.readFileSync(stateFile), live = JSON.parse(liveBytes); assert(!fs.existsSync(folder + '/driver.lock'), 'No concurrent UI/HTTP/business driver');
  let originalBytes, original;
  if (mode === 'reconcile') { assert.equal(sha(liveBytes), F.liveStateSHA256); originalBytes = liveBytes; original = live; assert(!live.consumerChecks?.frozenReparent58Resume03?.[F.draftAssignmentId]); assert(!fs.readdirSync(folder).some(name => name.includes('006944')), 'The failed label produced no6944 artifact; reconcile unexpected files rather than overwrite'); }
  else { const prior = live.consumerChecks?.frozenReparent58Resume03?.[F.draftAssignmentId]; assert(prior && prior.phase === 'metadata-reconciled' && prior.approvedPlanSHA256 === approvedPlanSHA256); originalBytes = read(prior.originalState); original = JSON.parse(originalBytes); assert.equal(sha(originalBytes), F.liveStateSHA256); assert.deepEqual(projectedResumeState58_03(live), projectedResumeState58_03(original)); }
  const { record, observation } = validateOriginalInputs(plan, original); validateFixedResumeState58_03(live, record);
  const ctx = createContext({ epoch: F.epoch, run: F.run }); assert.deepEqual(json(plan.currentHelperGraph), ctx.helperPins, 'Root must bind the exact post-promotion complete graph, not an old UI graph');
  const lock = folder + '/driver.lock', nonce = randomUUID(); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'frozen58-resume03-' + mode }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const case1Before = loadSnapshot(ctx, observation.before), case1After = loadSnapshot(ctx, plan.case1After); assertSweepRollback(ctx, case1Before, case1After, { sessionId: null }, null);
    if (mode === 'reconcile') {
      const saved = ctx.artifact(ctx.next('f58r-state-before') + '.json', originalBytes); ctx.persist();
      const first = await equalFresh(ctx, 'f58r-fresh1', case1After), second = await equalFresh(ctx, 'f58r-fresh2', case1After);
      const receipt = ctx.artifact(ctx.next('f58r-reconciled') + '.json', { kind: 'actual-metadata-only-frozen58-continuation-ready', approvedPlanSHA256, originalState: saved, originalRecordSHA256: plan.originalRecordSHA256, originalCase1Observation: plan.case1Observation, originalCase1After: plan.case1After, oldUIPartials: plan.oldUIPartials, fresh: [first.manifest, second.manifest], createReplayed: false, completedCase1Replayed: false, SQLDMLExecuted: false, businessWrites: 0, HTTPRequests: 0 });
      ctx.state.consumerChecks.frozenReparent58Resume03 ??= {}; ctx.state.consumerChecks.frozenReparent58Resume03[F.draftAssignmentId] = { phase: 'metadata-reconciled', approvedPlanSHA256, originalState: saved, reconciliation: receipt };
      assert.deepEqual(projectedResumeState58_03(ctx.state), projectedResumeState58_03(original)); ctx.persist(); return { mode, reconciliation: receipt, readyForOnlyRemainingFour: true, businessWrites: 0, HTTPRequests: 0 };
    }
    const resume = ctx.state.consumerChecks.frozenReparent58Resume03[F.draftAssignmentId], fresh = await equalFresh(ctx, 'f58r-remaining-fresh', case1After);
    resume.phase = 'remaining-starting'; ctx.persist();
    const proof = await continueFrozenReparent58(ctx, { draftAssignmentId: F.draftAssignmentId, projectId: F.projectId, createReceipt: plan.createReceipt, createLedger: plan.createLedger }, { kind: 'exact-case1-preserving-frozen58-continuation03', approvedPlanSHA256, originalRecord: structuredClone(record), completedFirstCase: structuredClone(record.cases['zero-reparent-to-draft']), initial: fresh, reconciliation: resume.reconciliation });
    const done = recordOf(ctx.state); assert.equal(Object.keys(done.cases).length, 5); assert(Object.values(done.cases).every(value => value.phase === 'verified')); assert.deepEqual(done.cases['zero-reparent-to-draft'], record.cases['zero-reparent-to-draft']);
    for (const key of ['owned', 'borrowed', 'fixtures', 'actors', 'objects', 'sourcePins', 'baseline']) assert.deepEqual(ctx.state[key], original[key]);
    resume.phase = 'completed'; resume.proof = proof; ctx.state.consumerChecks.uiRoleFrozenReparent58 = proof; ctx.persist(); return { mode, proof, actualCaseCount: 5, retainedOriginalCaseCount: 1, remainingActualCaseCount: 4, committedSQLDML: false, HTTPRequests: 0, G3Certified: false };
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
}
async function main() { if (process.argv.includes('--help')) { process.stdout.write('Root only: --plan <private.json> --approved-plan-sha <SHA> --mode reconcile|remaining --execute\nExact draft/create/case1 only; no HTTP, no parentless SQL, all4 DML probes always ROLLBACK.\n'); return; }
  const args = process.argv.slice(2); assert.equal(args.length, 7); assert.equal(args[0], '--plan'); assert.equal(args[2], '--approved-plan-sha'); assert.equal(args[4], '--mode'); assert.equal(args[6], '--execute');
  process.stdout.write(JSON.stringify(await resumeFrozen58_03({ planFile: args[1], approvedPlanSHA256: args[3], mode: args[5] })) + '\n'); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
