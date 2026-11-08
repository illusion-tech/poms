import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAllUiCompleted139, assertPinned1351Descriptors139, RETAIN1351 as F } from './isolated/tools/rust-r4ghi/retention-process1351-139-lib.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const complete = () => ({ fixtures: { uiFixtureViews23: { eo: { pause: { result: { projectId: 'actual-eo' } }, UICommandObserved: true }, own: { UICommandObserved: true } }, uiFormFixtureViews18: { 'role-create': { UICommandObserved: true }, 'gh-capture': { UICommandObserved: true } } }, uiExpense18Receipts: { 'actual-eo': { actual: true } }, uiLifecycle18Receipts: { 'actual-eo': { actual: true } } });
test('all six actual UI completion gates remain mandatory for retention/package', () => {
  assert.equal(assertAllUiCompleted139(complete()), 'actual-eo');
  for (const mutate of [s => { s.fixtures.uiFixtureViews23.eo.UICommandObserved = false; }, s => { s.fixtures.uiFixtureViews23.own.UICommandObserved = false; }, s => { s.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved = false; }, s => { s.fixtures.uiFormFixtureViews18['gh-capture'].UICommandObserved = false; }, s => { delete s.uiExpense18Receipts['actual-eo']; }, s => { delete s.uiLifecycle18Receipts['actual-eo']; }]) { const state = complete(); mutate(state); assert.throws(() => assertAllUiCompleted139(state)); }
});
test('1351 descriptor identity rejects old135/PID/process/overlay substitutions', () => {
  const state = { epoch: 'g2-business12', run: 'main01', apiProcess: { file: '/private/rust-api1351-process.json', rawBytesSha256: F.processSHA256, record: { pid: F.pid } }, processRestart1351: { registry: { file: '/run/007134-p1351-registry.json', rawBytesSha256: F.registrySHA256 } } };
  assertPinned1351Descriptors139(state, '/private', '/run');
  for (const mutate of [s => { s.apiProcess.file = '/private/rust-api135-process.json'; }, s => { s.apiProcess.record.pid = 108720; }, s => { s.apiProcess.rawBytesSha256 = 'old'; }, s => { s.processRestart1351.registry.rawBytesSha256 = 'old'; }, s => { s.epoch = 'future13'; }]) { const bad = structuredClone(state); mutate(bad); assert.throws(() => assertPinned1351Descriptors139(bad, '/private', '/run')); }
});
test('139 preserves original completion guard bytes and targets only1351 stop, with separate historical evidence', () => {
  const before = fs.readFileSync(root + '/before/tools/rust-r4ghi/retain-epoch12-before-source13-139.mjs', 'utf8'), after = fs.readFileSync(root + '/proposed/tools/rust-r4ghi/retain-epoch12-before-source13-139.mjs', 'utf8');
  const block = value => value.slice(value.indexOf('  const eoId = '), value.indexOf('  const native = ')); assert.equal(block(after), block(before));
  assert(after.includes("'stop', '1351'")); assert(!after.includes("'stop', '135'")); assert(after.includes('api1351.binary')); assert(after.includes('actualApiProcessState: ctx.state.apiProcess')); assert(after.includes('executionEvidence'));
});
test('140 packages newcandidate and preserves135 history without changing code406 archive membership', () => {
  const after = fs.readFileSync(root + '/proposed/tools/rust-r4ghi/package-retained-candidate140.mjs', 'utf8'); assert(after.includes('assertAllUiCompleted139(state)')); assert(after.includes(F.candidateSHA256)); assert(after.includes('historicalAPI135Candidate')); assert(after.includes('files: state.sourcePins')); assert(after.includes('frozenSourceFiles: 406')); assert(!after.includes('assert.equal(processRecord.pid, 108720)'));
});
