// Root-only same-source process transition. prepare/admit perform read-only
// snapshots and metadata writes; this entry never starts/stops API/container,
// performs DML/DDL/HTTP, changes epoch or replays an acknowledged command.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createContext } from './context.mjs';
import { capture, loadSnapshot } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { sha } from './pure.mjs';
import { RESTART1351 as F, readRestartPin1351, restartPin1351, assertExactSnapshot1351, validateContainerRestart1351, verifyDataConservation148, verifyRestartEnvironment1351, verifyProcessRestart1351 } from './same-source-process1351.mjs';
const folder = '/home/wangzishi/.local/share/poms-r4ghi/private/business/' + F.epoch + '/' + F.run, stateFile = folder + '/state.json';
const json = pin => JSON.parse(readRestartPin1351(pin));
const oldStateSHA = '8e297fdb95b88442ebded8c37c44863b73838798b2fe0dbd9f798e4a5064c605';
const expenseSHA = '9205a910aa03686a0f70973f8b4c606b001e54a49b055d80abdd10d07ddaa9df';
function plan1351(bytes) {
  const plan = JSON.parse(bytes); assert.equal(plan.kind, 'exact-same-source-Source12-process-restart1351'); assert.equal(plan.epoch, F.epoch); assert.equal(plan.run, F.run); assert.equal(plan.expectedStateSHA256, oldStateSHA); assert.equal(plan.expectedSequence, 7127);
  assert.equal(plan.expenseFinalAfter.rawBytesSha256, expenseSHA); assert.equal(plan.originalRegistry.rawBytesSha256, F.originalRegistrySHA256); assert.equal(plan.oldApiProcess.rawBytesSha256, F.oldProcessSHA256);
  assert.equal(plan.sourcePinsSHA256, F.sourcePinsSHA256); assert.equal(plan.sourceCount, 406); assert.equal(plan.binarySHA256, F.binarySHA256); assert.equal(plan.migrations, 97); assert.equal(plan.tables, 139); assert.equal(plan.businessReplay, false); assert.equal(plan.G3Certified, false);
  for (const pin of [plan.expenseFinalAfter, plan.originalRegistry, plan.oldApiProcess, plan.oldAuthConfiguration, plan.provision, plan.containerTransition, plan.dataConservation, plan.currentHelperGraph, plan.oldGHPartial, plan.expenseUIReceipt]) readRestartPin1351(pin); assert.equal(plan.containerTransition.rawBytesSha256, '9751ef3caf3427c103997c2dcf0105a23e1bfa8d3f8ae5df8d9052a67ce5a682');
  return plan;
}
function projected(state) { const value = structuredClone(state); delete value.sequence; delete value.processRestartPreparation1351; return value; }
async function fresh1351(ctx, label, expected) { const value = ctx.next(label); ctx.persist(); const snapshot = await capture(ctx, value); assertExactSnapshot1351(expected, snapshot); assertRecorded(ctx, snapshot); return snapshot; }
export async function admitProcessRestart1351({ mode, planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux'); assert(['prepare', 'admit'].includes(mode)); const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), approvedPlanSHA256); const plan = plan1351(planBytes);
  const raw = fs.readFileSync(stateFile), state = JSON.parse(raw); assert(!state.activeFault && !state.blockedObservation && !state.cleaned && !state.cleanupPlan && !state.processRestart1351); assert(!fs.existsSync(folder + '/driver.lock'));
  assert.equal(state.epoch, F.epoch); assert.equal(state.run, F.run); assert.equal(sha(JSON.stringify(state.sourcePins)), F.sourcePinsSHA256); assert.deepEqual(state.consumerAdmission54.registry, plan.originalRegistry); assert.equal(state.apiProcess.rawBytesSha256, F.oldProcessSHA256);
  const old = json(plan.oldApiProcess); const actualOldStat = '/proc/' + old.pid + '/stat';
  if (fs.existsSync(actualOldStat)) { const stat = fs.readFileSync(actualOldStat, 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], old.startTime, 'Old physical135 is still alive; never replace it'); }
  let originalBytes, original;
  if (mode === 'prepare') { assert.equal(sha(raw), oldStateSHA); assert.equal(state.sequence, 7127); assert(!state.processRestartPreparation1351); originalBytes = raw; original = state; }
  else { const prepared = state.processRestartPreparation1351; assert(prepared && prepared.approvedPlanSHA256 === plan.preparationPlanSHA256 && prepared.phase === 'prepared'); assert.equal(prepared.preparation.file, plan.preparation.file); assert.equal(prepared.preparation.rawBytesSha256, plan.preparation.rawBytesSha256); const preparation = json(plan.preparation), priorPlan = json(preparation.plan); for (const key of Object.keys(priorPlan).filter(key => !['newApiProcess', 'preparation', 'preparationPlanSHA256'].includes(key))) assert.deepEqual(plan[key], priorPlan[key], 'Do not silently change the prepared restart boundary: ' + key); originalBytes = readRestartPin1351(prepared.originalState); assert.equal(sha(originalBytes), oldStateSHA); original = JSON.parse(originalBytes); assert.equal(sha(JSON.stringify(projected(state))), sha(JSON.stringify(projected(original))), 'Only preparation metadata/sequence may change'); }
  const ctx = createContext({ epoch: F.epoch, run: F.run }); assert.deepEqual(json(plan.currentHelperGraph), ctx.helperPins, 'Exact post-promotion restart+H graph required'); validateContainerRestart1351(json(plan.containerTransition), json(plan.provision)); verifyDataConservation148(plan.dataConservation, plan.expenseFinalAfter);
  const lock = folder + '/driver.lock', nonce = randomUUID(); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'same-source-restart1351-' + mode }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const expense = loadSnapshot(ctx, plan.expenseFinalAfter);
    if (mode === 'prepare') {
      const saved = ctx.artifact(ctx.next('p1351-original-state') + '.json', originalBytes); ctx.persist(); const before = await fresh1351(ctx, 'p1351-before-start', expense);
      const receipt = ctx.artifact(ctx.next('p1351-prepared') + '.json', { kind: 'actual-same-source-process-restart-preparation1351', approvedPlanSHA256, plan: { file: path.resolve(planFile), rawBytesSha256: approvedPlanSHA256 }, originalState: saved, originalRegistry: plan.originalRegistry, oldApiProcess: plan.oldApiProcess, oldAuthConfiguration: plan.oldAuthConfiguration,
        expenseFinalAfter: plan.expenseFinalAfter, expenseUIReceipt: plan.expenseUIReceipt, oldGHPartial: plan.oldGHPartial, beforeStartup: before.manifest, containerTransition: plan.containerTransition, dataConservation: plan.dataConservation, provision: plan.provision, oldPhysicalProcessAbsent: true, businessWrites: 0, HTTPRequests: 0 });
      ctx.state.processRestartPreparation1351 = { phase: 'prepared', approvedPlanSHA256, originalState: saved, preparation: receipt }; assert.equal(sha(JSON.stringify(projected(ctx.state))), sha(JSON.stringify(projected(original))), 'Only preparation metadata/sequence may change'); ctx.persist(); return { mode, preparation: receipt, processNotStartedByTool: true, businessWrites: 0, HTTPRequests: 0 };
    }
    // New process/candidate inputs are deliberately unavailable in the template.
    assert(plan.newApiProcess); const process = verifyRestartEnvironment1351(ctx, plan.newApiProcess, plan.oldAuthConfiguration, true); assert(!(process.pid === old.pid && process.startTime === old.startTime)); assert(Date.parse(process.startedAt) > Date.parse(old.startedAt));
    const first = await fresh1351(ctx, 'p1351-startup1', expense), second = await fresh1351(ctx, 'p1351-startup2', expense);
    const next = structuredClone(ctx.state), prep = next.processRestartPreparation1351;
    const candidate = ctx.artifact(ctx.next('p1351-candidate') + '.json', { kind: 'actual-same-source-process-candidate1351', namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run, marker: ctx.state.marker,
      sourcePins: ctx.pins, sourcePinsSHA256: F.sourcePinsSHA256, sourceCount: F.sourceCount, tables: 139, migrations: 97, process: { ...restartPin1351(plan.newApiProcess), record: process }, preparation: prep.preparation,
      originalRegistry: plan.originalRegistry, oldPhysicalProcessRecord: plan.oldApiProcess, unchangedProductSourceAndBinary: true, businessCommandsReplayed: false, old135EvidenceCertifiedFor1351: false, G3Certified: false, G4Certified: false });
    const registryLabel = ctx.next('p1351-registry'); ctx.persist();
    const registry = { kind: 'verified-same-source-process-restart1351', schemaVersion: 1, namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run, marker: ctx.state.marker, sourcePinsSHA256: F.sourcePinsSHA256, sourceCount: F.sourceCount, migrations: 97, tables: 139,
      approvedPlanSHA256, originalRegistry: plan.originalRegistry, originalState: prep.originalState, oldApiProcess: plan.oldApiProcess, oldAuthConfiguration: plan.oldAuthConfiguration, newApiProcess: plan.newApiProcess, candidateReceipt: candidate,
      preparation: prep.preparation, expenseFinalAfter: plan.expenseFinalAfter, startupFresh: [first.manifest, second.manifest], admittedSequence: ctx.state.sequence,
      businessWrites: 0, HTTPRequests: 0, oldEvidenceRelabelledAsNew: false, businessStateBaselineReset: false, G3Certified: false, G4Certified: false };
    const registryPin = ctx.artifact(registryLabel + '.json', registry);
    next.processRestartHistory1351 = [...(next.processRestartHistory1351 ?? []), { originalState: prep.originalState, originalRegistry: plan.originalRegistry, oldApiProcess: original.apiProcess,
      oldActualAuthConfigurations: original.actualAuthConfigurations, oldTrustedSummarySeam: original.trustedSummarySeam, oldStatusSourcePins: original.statusSourcePins, oldRequiredWriteSweeps: original.requiredWriteSweeps, oldEFRequiredWriteSweeps40: original.efRequiredWriteSweeps40, labelsRemainAPI135: true }];
    next.apiProcess = { ...restartPin1351(plan.newApiProcess), record: process }; next.processRestart1351 = { registry: registryPin, approvedPlanSHA256 }; next.sequence = ctx.state.sequence; delete next.processRestartPreparation1351;
    next.actualAuthConfigurations = {}; next.requiredWriteSweeps = {}; next.efRequiredWriteSweeps40 = {}; delete next.trustedSummarySeam; delete next.statusSourcePins;
    for (const key of ['baseline', 'owned', 'borrowed', 'fixtures', 'objects', 'sourcePins', 'actors', 'consumerAdmission54']) assert.equal(sha(JSON.stringify(next[key])), sha(JSON.stringify(original[key])), 'No producer/data authority may be rebased during process restart: ' + key);
    verifyProcessRestart1351({ ...ctx, state: next }, json(plan.originalRegistry), { liveProcess: true });
    for (const key of Object.keys(ctx.state)) delete ctx.state[key]; Object.assign(ctx.state, next); ctx.persist();
    return { mode, registry: registryPin, candidateReceipt: candidate, apiProcess: plan.newApiProcess, epoch: ctx.epoch, sourcePinsSHA256: F.sourcePinsSHA256, generation: 'API1351', actorProofsMustBeNew: true, businessWrites: 0, HTTPRequests: 0, oldEvidenceRelabelledAsNew: false, G3Certified: false };
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
}
async function main() { if (process.argv.includes('--help')) { process.stdout.write('Root only: --plan <private.json> --approved-plan-sha <SHA> --mode prepare|admit --execute\nprepare before Root starts same-binary API1351; admit after startup. This tool never starts/stops a process or sends HTTP/DML.\n'); return; }
  const args = process.argv.slice(2); assert.equal(args.length, 7); assert.equal(args[0], '--plan'); assert.equal(args[2], '--approved-plan-sha'); assert.equal(args[4], '--mode'); assert.equal(args[6], '--execute'); process.stdout.write(JSON.stringify(await admitProcessRestart1351({ planFile: args[1], approvedPlanSHA256: args[3], mode: args[5] })) + '\n'); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
