// Read-only active-process/history selection. Never stops/starts a process or DB.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './business/pure.mjs';
import { readRestartPin1351, verifyProcessRestart1351, restartPin1351 } from './business/same-source-process1351.mjs';
export const RETAIN1351 = Object.freeze({ pid: 11616,
  processSHA256: 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1',
  candidateSHA256: '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c',
  registrySHA256: '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b',
  oldCandidateSHA256: 'b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7' });
const read = pin => JSON.parse(readRestartPin1351(pin));
export function assertAllUiCompleted139(state) {
  const eoId = state.fixtures.uiFixtureViews23.eo.pause.result.projectId;
  assert(state.fixtures.uiFixtureViews23.eo.UICommandObserved && state.fixtures.uiFixtureViews23.own.UICommandObserved);
  assert(state.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved && state.fixtures.uiFormFixtureViews18['gh-capture'].UICommandObserved);
  assert(state.uiExpense18Receipts?.[eoId] && state.uiLifecycle18Receipts?.[eoId], 'Finish the authorized real forms before advancing product/schema');
  return eoId;
}
export function assertPinned1351Descriptors139(state, privateRoot, runRoot) {
  assert.equal(state.epoch, 'g2-business12'); assert.equal(state.run, 'main01'); assert.equal(state.apiProcess.file, privateRoot + '/rust-api1351-process.json'); assert.equal(state.apiProcess.rawBytesSha256, RETAIN1351.processSHA256); assert.equal(state.apiProcess.record.pid, RETAIN1351.pid);
  assert.equal(state.processRestart1351.registry.rawBytesSha256, RETAIN1351.registrySHA256); assert.equal(state.processRestart1351.registry.file, runRoot + '/007134-p1351-registry.json');
}
export function assertActual1351Retention(ctx) {
  assert.equal(ctx.epoch, 'g2-business12'); assert.equal(ctx.run, 'main01'); assertPinned1351Descriptors139(ctx.state, ctx.private, ctx.priv);
  const originalRegistry = read(ctx.state.consumerAdmission54.registry), overlay = verifyProcessRestart1351(ctx, originalRegistry, { liveProcess: true });
  assert.equal(overlay.candidateReceipt.rawBytesSha256, RETAIN1351.candidateSHA256); assert.equal(overlay.candidateReceipt.file, ctx.priv + '/007133-p1351-candidate.json'); assert.equal(ctx.state.processRestart1351.registry.file, ctx.priv + '/007134-p1351-registry.json');
  const candidate = read(overlay.candidateReceipt); assert.deepEqual(candidate.sourcePins, ctx.pins); assert.equal(candidate.process.rawBytesSha256, RETAIN1351.processSHA256); assert.deepEqual(candidate.process.record, ctx.state.apiProcess.record);
  const historicalCandidate = { file: ctx.priv + '/004534-candidate-source-binding12.json', rawBytesSha256: RETAIN1351.oldCandidateSHA256 }; read(historicalCandidate);
  return { generation: 'API1351', activeApiProcess: restartPin1351(ctx.state.apiProcess), activeRestartRegistry: restartPin1351(ctx.state.processRestart1351.registry), activeCandidate: restartPin1351(overlay.candidateReceipt),
    originalSchema2Registry: restartPin1351(ctx.state.consumerAdmission54.registry), historicalAPI135Process: restartPin1351(overlay.oldApiProcess), historicalAPI135Candidate: historicalCandidate, oldEvidenceRelabelledAs1351: false };
}
export function privateExecutionMaterials1351(ctx, active) {
  const overlay = read(active.activeRestartRegistry), prep = read(overlay.preparation), conserved = read(prep.dataConservation), items = [], seen = new Set();
  const add = (label, pin) => { if (!pin || seen.has(pin.file)) return; readRestartPin1351(pin); seen.add(pin.file); items.push({ label, original: restartPin1351(pin), privateOnly: true }); };
  const currentFile = (label, file) => add(label, { file, rawBytesSha256: sha(fs.readFileSync(file)) });
  add('active1351-process', active.activeApiProcess); add('active1351-candidate', active.activeCandidate); add('active1351-restart-registry', active.activeRestartRegistry);
  add('historical135-process', active.historicalAPI135Process); add('historical135-candidate', active.historicalAPI135Candidate); add('historical12-schema2-registry', active.originalSchema2Registry);
  add('restart-preparation', overlay.preparation); add('pre-restart135-state', overlay.originalState); add('pre-startup-snapshot', prep.beforeStartup); add('prepare-plan', prep.plan); add('historical135-auth-config', overlay.oldAuthConfiguration); add('same-container147', prep.containerTransition); add('conservation148', prep.dataConservation); add('original-provision', prep.provision);
  add('expense135-final-snapshot', overlay.expenseFinalAfter); add('expense135-success', prep.expenseUIReceipt); add('GH135-missing-process-partial', prep.oldGHPartial); add('conservation148-fresh1', conserved.fresh1); add('conservation148-fresh2', conserved.fresh2);
  for (let index = 0; index < overlay.startupFresh.length; index += 1) add('startup1351-fresh' + (index + 1), overlay.startupFresh[index]);
  for (const edition of ['135', '1351']) for (const suffix of ['.env', '-stdout-original.bin', '-stderr-original.bin']) currentFile((edition === '135' ? 'historical' : 'active') + edition + suffix, ctx.private + '/rust-api' + edition + suffix);
  return items;
}
