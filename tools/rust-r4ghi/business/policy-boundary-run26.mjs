// Root execution entry. Importing this module does not create context or I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadApprovedPolicyRuntime46, assertApprovedPolicyRuntime46, assertPolicyRuntimeShape46, verifySchema3PolicyRuntime46, TEMPLATE46 } from './policy-runtime46.mjs';
import { sha, keyOf, segment, data } from './pure.mjs';
import { readPin54, assertAdmittedContext54, assertAdmittedFixtureSource } from './consumer-admission54.mjs';
import { POLICY26, FACTS26, CASH_STEPS26, canonical26, assertSchedule26 } from './policy-boundary-values26.mjs';
const SOURCE12 = '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa';
const API135 = 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private';
const BINARY = '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/examples/r4ghi_summary_producer08';
const PRODUCTS = ['policy-boundary-values26.mjs', 'policy-boundary-producers26.mjs', 'policy-boundary-capture26.mjs', 'policy-boundary-run26.mjs', 'policy-runtime46.mjs', 'policy-boundary-bindings46.json'].map(file => 'tools/rust-r4ghi/business/' + file);
function helperPins26(root) { return fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).sort().map(file => ({ file: 'tools/rust-r4ghi/business/' + file, sha256: sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + file)) })); }
export function assertPlanShape26(plan) {
  assertPolicyRuntimeShape46(plan);
  assert.equal(plan.kind, 'Root-approved-Source13-real-H01-20percent-H04-producers26'); assert.equal(plan.sourceGeneration, 13); assert.equal(plan.namespace, 'poms-r4ghi');
  segment(plan.epoch); segment(plan.run); assert.notEqual(plan.epoch, 'g2-business12'); assert(/^\d{4}-\d{2}-\d{2}$/.test(plan.plannedDate));
  assert(/^[0-9a-f]{64}$/.test(plan.sourcePinsSHA256)); assert.notEqual(plan.sourcePinsSHA256, SOURCE12, 'Source12 is not an implicit Source13 binding');
  assert(Number.isSafeInteger(plan.sourcePinCount) && plan.sourcePinCount > 0); assert(Number.isSafeInteger(plan.migrations) && plan.migrations >= 97); assert.equal(plan.tables, 139);
  assert(plan.apiProcess?.file && /^[0-9a-f]{64}$/.test(plan.apiProcess.rawBytesSha256)); assert(/^[0-9a-f]{64}$/.test(plan.binarySHA256)); assert.notEqual(plan.binarySHA256, API135);
  assert(plan.admission?.file && /^[0-9a-f]{64}$/.test(plan.admission.rawBytesSha256)); assert.equal(plan.trustedSummaryBinary?.file, BINARY); assert(/^[0-9a-f]{64}$/.test(plan.trustedSummaryBinary.rawBytesSha256));
  assert(plan.nodeExecutable?.file && /^v24\./.test(plan.nodeExecutable.version) && /^[0-9a-f]{64}$/.test(plan.nodeExecutable.rawBytesSha256));
  assert.equal(plan.policyHash, POLICY26); assert.deepEqual(plan.facts, FACTS26); assert.deepEqual(plan.cashSteps, CASH_STEPS26);
  assert.equal(plan.performAttentionOverlay, true); assert(typeof plan.materialityRationale === 'string' && plan.materialityRationale.trim().length > 0);
  assert(Array.isArray(plan.actorKeys) && new Set(plan.actorKeys).size === plan.actorKeys.length); for (const key of ['manager', 'execution', 'finance']) assert(plan.actorKeys.includes(key));
  assert(Array.isArray(plan.sourceBases) && plan.sourceBases.length > 0); const seen = new Set();
  for (const pin of plan.sourceBases) { assert(typeof pin.file === 'string' && !path.isAbsolute(pin.file) && !pin.file.includes('\\') && !pin.file.split('/').includes('..')); assert(/^[0-9a-f]{64}$/.test(pin.sha256) && !seen.has(pin.file)); seen.add(pin.file); }
  for (const file of PRODUCTS) assert(seen.has(file)); assertSchedule26(); return plan;
}
export function verifyPlanFiles26(plan, root = ROOT) {
  assertPlanShape26(plan);
  for (const pin of plan.sourceBases) { const target = root + '/' + pin.file, stat = fs.lstatSync(target); assert(stat.isFile() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(target), path.resolve(target)); assert.equal(sha(fs.readFileSync(target)), pin.sha256, 'Approved complete helper/source closure changed'); }
  for (const file of helperPins26(root)) assert(plan.sourceBases.some(pin => pin.file === file.file && pin.sha256 === file.sha256), 'A live business helper is outside the approved closure');
  readPin54(plan.apiProcess); readPin54(plan.admission);
  assert.equal(process.execPath, plan.nodeExecutable.file); assert.equal(process.version, plan.nodeExecutable.version); assert.equal(sha(fs.readFileSync(process.execPath)), plan.nodeExecutable.rawBytesSha256);
  const stat = fs.lstatSync(BINARY); assert(stat.isFile() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(BINARY), BINARY); assert.equal(sha(fs.readFileSync(BINARY)), plan.trustedSummaryBinary.rawBytesSha256);
  const policy = JSON.parse(fs.readFileSync(root + '/tools/rust-r4ghi/joint-g1/effective-v2/policy-definition.json')); assert.equal(sha(JSON.stringify(canonical26(policy))), POLICY26);
}
export function verifyContext26(ctx, plan) {
  verifyPlanFiles26(plan, ctx.win); verifySchema3PolicyRuntime46(ctx, plan); assert(!ctx.state.activeFault && !ctx.state.blockedObservation); assert.equal(ctx.epoch, plan.epoch); assert.equal(ctx.run, plan.run); assert.equal(ctx.namespace, plan.namespace);
  assert.equal(ctx.migrations, plan.migrations); assert.equal(ctx.tables, plan.tables); assert.equal(ctx.pins.length, plan.sourcePinCount); assert.equal(sha(JSON.stringify(ctx.pins)), plan.sourcePinsSHA256); assert.deepEqual(ctx.pins, ctx.state.sourcePins);
  for (const pin of ctx.pins) assert(plan.sourceBases.some(value => value.file === pin.file && value.sha256 === pin.sha256));
  assert.equal(ctx.state.consumerAdmission54?.registry.file, plan.admission.file, 'Use this actual Source13 retained-data registry, not an unrelated metadata pin');
  assert.equal(ctx.state.consumerAdmission54.registry.rawBytesSha256, plan.admission.rawBytesSha256);
  assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true });
  assert.equal(ctx.state.apiProcess.file, plan.apiProcess.file); assert.equal(ctx.state.apiProcess.rawBytesSha256, plan.apiProcess.rawBytesSha256); assert.equal(ctx.state.apiProcess.record.binarySha256, plan.binarySHA256);
  assert.equal(JSON.parse(readPin54(plan.apiProcess)).binarySha256, plan.binarySHA256);
}
// Metadata-only Root preparation. Requires explicit future inputs, never defaults
// an old source/process/build/actor to a final or approved state.
export function preparePolicyPlan26() { throw new Error('Source13 uses a Root-approved private bindings file after B1/R3; never fill the immutable business template or mint a helper-bound plan'); }
const otherFixturesSHA26 = root => { const { hPolicyCoverage26: ignored, ...other } = root.state.fixtures; return sha(JSON.stringify(other)); };
export function openPolicyView26(rootCtx, plan) {
  assert(!rootCtx.fixtureViewKey); const root = rootCtx.state.fixtures; assert(root.platformComplete && root.org && root.customer && root.roles);
  assert(rootCtx.state.owned[keyOf(rootCtx.database, 'customer', [root.customer.id])]);
  if (!root.hPolicyCoverage26) {
    root.hPolicyCoverage26 = { sourcePinsSHA256: plan.sourcePinsSHA256, producerEpoch: plan.epoch, fixtures: { platformComplete: true, org: structuredClone(root.org), customer: structuredClone(root.customer), roles: structuredClone(root.roles), plannedDate: plan.plannedDate }, stages: {} }; rootCtx.persist();
  }
  const record = root.hPolicyCoverage26; const runtime = assertApprovedPolicyRuntime46(rootCtx, plan); if (!record.runtimeBindings46) { assert(Object.keys(record.stages).length === 0 && !record.fixtures.project); record.runtimeBindings46 = runtime; rootCtx.persist(); } assert.deepEqual(record.runtimeBindings46, runtime); assert.equal(record.producerEpoch, plan.epoch); assert.equal(record.sourcePinsSHA256, plan.sourcePinsSHA256);
  assertAdmittedFixtureSource(rootCtx, { registryPath: '/fixtures/hPolicyCoverage26', record, projectIds: [record.fixtures.project?.id].filter(Boolean) });
  const state = new Proxy(rootCtx.state, { get(target, key, receiver) { return key === 'fixtures' ? record.fixtures : Reflect.get(target, key, receiver); }, set(target, key, value, receiver) { assert.notEqual(key, 'fixtures'); return Reflect.set(target, key, value, receiver); }, deleteProperty(target, key) { assert.notEqual(key, 'fixtures'); return Reflect.deleteProperty(target, key); } });
  return { ctx: { ...rootCtx, state, fixtureViewKey: 'H26-normal-policy' }, record };
}
async function step26(rootCtx, ctx, plan, planPin, record, name, run) {
  verifyContext26(rootCtx, plan); assertAdmittedFixtureSource(rootCtx, { registryPath: '/fixtures/hPolicyCoverage26', record, projectIds: [record.fixtures.project?.id].filter(Boolean) }); assert.equal(sha(readPin54(planPin)), planPin.rawBytesSha256); assert.equal(JSON.parse(fs.readFileSync(ctx.priv + '/driver.lock')).pid, process.pid);
  const previous = record.stages[name];
  if (previous) { assert.equal(previous.phase, 'verified', 'Preserve interrupted or committed attempts; Root exact reconciliation is required before any continuation'); return JSON.parse(readPin54(previous.receipt)); }
  const other = otherFixturesSHA26(rootCtx); record.stages[name] = { phase: 'running' }; ctx.persist();
  try {
    const value = await run(); verifyContext26(rootCtx, plan); assert.equal(sha(readPin54(planPin)), planPin.rawBytesSha256); assert.equal(otherFixturesSHA26(rootCtx), other, 'Main/UI/A05 fixture facts were changed or reused');
    const receipt = ctx.artifact(`${ctx.next('H26-' + name + '-step')}.json`, value, { kind: 'actual-public-policy-producer-stage', name, G3Certified: false, G4Certified: false });
    record.stages[name] = { phase: 'verified', receipt }; ctx.persist(); return value;
  } catch (error) {
    record.stages[name] = { phase: 'stopped-reconcile-originals-no-replay', failure: ctx.artifact(`${ctx.next('H26-' + name + '-stopped')}.json`, { name: error.name, message: error.message, originalHTTPAndLedgerDirectory: ctx.priv,
      actualH01MustPassBeforeLaterSteps: true, skippedToLaterSample: false, inferenceFromMock: false, noAutomaticReplay: true, preserveCommittedUpstreamFacts: true }) }; ctx.persist(); throw error;
  }
}
export async function runPolicyBoundary26(rootCtx, planPin) {
  const plan = assertPlanShape26(loadApprovedPolicyRuntime46(planPin, rootCtx.priv)); verifyContext26(rootCtx, plan); assert.equal(process.platform, 'linux');
  const { createApi } = await import('./http.mjs'), { normalSources26, contractAPI26, noCashHandover26, execution26, expenseAndZeroTax26 } = await import('./policy-boundary-producers26.mjs');
  const { produceActualSummary } = await import('./trusted.mjs'), { contractPrepare, contractFinish } = await import('./contracts.mjs'), { actualReceipt26 } = await import('./a05-finance26.mjs');
  const { activate26, captureCase26, attentionOverlay26, assertPreviousFacts26 } = await import('./policy-boundary-capture26.mjs'), { capture } = await import('./snapshot.mjs');
  const otherBefore = otherFixturesSHA26(rootCtx), { ctx, record } = openPolicyView26(rootCtx, plan), api = createApi(ctx), contractApi = contractAPI26(api), f = ctx.state.fixtures;
  assert(!record.result, 'Completed normal-business sample is not reissued');
  for (const key of plan.actorKeys) { await api.login(key); const actual = data(await api.request('AuthController_getCurrentAuthSession', {}, null, key)); assert(actual.authenticated && actual.user.id === ctx.state.actors[key].id); assert.deepEqual([...actual.permissions].sort(), [...ctx.state.actors[key].permissions].sort()); } // Always fresh known actors, never cookie-existence inference.
  const step = (name, run) => step26(rootCtx, ctx, plan, planPin, record, name, run);
  await step('normal-R3-sources', () => normalSources26(ctx, api));
  await step('actual-Common-summary', () => produceActualSummary(ctx));
  await step('real-contract-prepare', async () => { const result = await contractPrepare(ctx, contractApi); assert.equal(result.contracts, 1); return { ...result, kind: 'actual-one-contract-readiness-and-real-diff-review', originalHelperKind: result.kind }; });
  for (const [key, actor] of Object.entries(ctx.state.actors)) if (actor.borrowedSeedUser) await api.login(key);
  await step('actual-approval-activation-plan', async () => { const result = await contractFinish(ctx, api); assert.equal(result.contracts, 1); return { ...result, kind: 'actual-one-contract-approval-activation-plan', originalHelperKind: result.kind }; });
  for (const key of ['manager', 'execution', 'finance']) await api.login(key);
  await step('no-cash-real-D-handover', () => noCashHandover26(ctx, api));
  await step('adopt-real-budget30', () => activate26(ctx, api));
  await step('required-H01-before-any-cash-cost', () => captureCase26(ctx, api, 'h01'));
  assert(f.h01Published26, 'Do not skip a rejected H01 and continue the 20% samples');
  await step('normal-role-freeze-EO-execution', () => execution26(ctx, api));
  await api.login('manager'); await step('actual-expense25-stage-tax0', () => expenseAndZeroTax26(ctx, api));
  for (const cash of CASH_STEPS26) {
    await step('actual-receipt-' + cash.name, async () => { f.receipts26 ??= {}; assert(!f.receipts26[cash.name]); const entry = f.receipts26[cash.name] = {}; ctx.persist();
      return actualReceipt26(ctx, api, entry, cash.increment, { net: cash.increment, tax: '0.00', rate: '0.0000' }); });
    await step('fresh-G-H-' + cash.name, () => captureCase26(ctx, api, cash.name));
    if (cash.name === 'below') await step('real-H08-attention-H04-overlay', () => attentionOverlay26(ctx, api, plan.materialityRationale));
  }
  const final = await capture(ctx, ctx.next('H26-final-facts-observation')); assertPreviousFacts26(ctx, final); verifyContext26(rootCtx, plan); assert.equal(otherFixturesSHA26(rootCtx), otherBefore);
  const result = { kind: 'actual-normal-project-H01-exact-20percent-and-H04-coverage', projectId: f.project.id, plan: planPin, cases: f.publishedCases26, H04Review: f.attentionReview26,
    actualFinalObservation: final.manifest, sourceGeneration: 13, producerEpoch: ctx.epoch, sourcePinsSHA256: plan.sourcePinsSHA256, mainUIA05ProjectsReused: false,
    missingRulesNotFabricated: ['H06', 'H09', 'H10'], closedScopeZeroAndMaturityAndEligibilityServerDerived: true, SQLContextManufactured: false, G3Certified: false, G4Certified: false };
  record.result = ctx.artifact(`${ctx.next('H26-complete')}.json`, result, { kind: 'actual-policy-sample-complete-not-Gate-certificate', G3Certified: false, G4Certified: false }); ctx.persist(); return record.result;
}
async function main() {
  assert.equal(process.platform, 'linux'); const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--bindings' && args[2] === '--approved-bindings-sha' && args[4] === '--execute');
  const pin = { file: args[1], rawBytesSha256: args[3] }, plan = assertPlanShape26(loadApprovedPolicyRuntime46(pin, PRIVATE + '/business/g2-business13/main01')); verifyPlanFiles26(plan);
  const directory = `${PRIVATE}/business/${plan.epoch}/${plan.run}`; assert.equal(fs.realpathSync(directory), directory); const lock = directory + '/driver.lock';
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-real-policy-producers26', plan: pin }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const { createContext } = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/context.mjs').href);
    const ctx = createContext({ epoch: plan.epoch, run: plan.run, 'api-process-record': plan.apiProcess.file, 'planned-date': plan.plannedDate }); verifyContext26(ctx, plan);
    const result = await runPolicyBoundary26(ctx, pin); console.log(JSON.stringify({ kind: 'H26-completed-see-private-originals', result, G3Certified: false, G4Certified: false }));
  } finally { if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock)).pid === process.pid) fs.unlinkSync(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
