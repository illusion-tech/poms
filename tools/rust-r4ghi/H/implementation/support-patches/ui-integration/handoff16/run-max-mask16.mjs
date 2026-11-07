// Root-only max/mask wrapper. No obsolete13 Creator/EO/Own stop helper is imported or executed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bindActualContext, validateBindingShape, sha } from '../runtime13/binding13.mjs';
import { validatePlanIdentity } from '../runtime14/dom-common14.mjs';
import { verifyPreparedPlan } from './source-closure16.mjs';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
function verifyFiles(binding) {
  assert(binding.plan?.file?.startsWith('/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/'));
  const planBytes = fs.readFileSync(binding.plan.file); assert.equal(sha(planBytes), binding.plan.rawBytesSha256, 'Entire Root-approved fixture plan changed');
  const plan = JSON.parse(planBytes), locations = validatePlanIdentity(plan); assert.equal(binding.plan.file, locations.linuxPlan);
  assert.equal(plan.metadata16?.purpose, 'fixtures'); assert.deepEqual(binding.metadata16, plan.metadata16);
  assert.equal(sha(Buffer.from(JSON.stringify(plan.writeActions))), binding.writeActionsSHA256);
  verifyPreparedPlan(ROOT, plan);
  const manifestBytes = fs.readFileSync(plan.metadata16.buildManifest.file); assert.equal(sha(manifestBytes), plan.metadata16.buildManifest.rawBytesSha256);
  const manifest = JSON.parse(manifestBytes); assert.equal(manifest.manifestSha256, plan.metadata16.buildManifestSha256); assert.equal(manifest.memberCount, plan.metadata16.buildLeafCount);
  assert.equal(fs.realpathSync(process.execPath), plan.metadata16.linuxNode.executable); assert.equal(sha(fs.readFileSync(process.execPath)), plan.metadata16.linuxNode.rawBytesSha256);
}
async function main() {
  assert.equal(process.platform, 'linux'); const args = process.argv.slice(2), options = {};
  assert(args.at(-1) === '--execute'); for (let i = 0; i < args.length - 1; i += 2) { assert(/^--[a-z-]+$/.test(args[i]) && args[i + 1]); const key = args[i].slice(2); assert(!Object.hasOwn(options, key)); options[key] = args[i + 1]; }
  assert.deepEqual(Object.keys(options).sort(), ['binding', 'approved-binding-sha', 'business-date', 'stage'].sort()); assert(['max', 'mask'].includes(options.stage)); assert(/^\d{4}-\d{2}-\d{2}$/.test(options['business-date']));
  const bytes = fs.readFileSync(options.binding); assert.equal(sha(bytes), options['approved-binding-sha']); const binding = validateBindingShape(JSON.parse(bytes)); assert.equal(binding.purpose, 'fixtures'); assert.equal(binding.actorBindingsFinal, false);
  verifyFiles(binding);
  const lock = `/home/wangzishi/.local/share/poms-r4ghi/private/business/${binding.epoch}/${binding.run}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-max-mask16', stage: options.stage, approvedBindingSHA256: options['approved-binding-sha'] }) + '\n', { flag: 'wx', mode: 0o600 });
  let ctx, label;
  try {
    const { createContext } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/context.mjs`).href), { createApi } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/http.mjs`).href);
    ctx = createContext({ epoch: binding.epoch, run: binding.run, 'api-process-record': binding.apiProcess.file }); const api = createApi(ctx);
    const bound = bindActualContext(ctx, binding, options['approved-binding-sha'], bytes); assert((options.stage === 'max' ? ['manager'] : ['manager', 'person']).every(key => bound.actorKeys.includes(key)));
    const stages = ctx.state.HFixtureRuns16 ??= {}; assert(!stages[options.stage], 'Do not replay an existing complete/partial stage; Root must reconcile exact originals first');
    label = ctx.next(`H-${options.stage}-fixture16`); stages[options.stage] = { phase: 'running', approvedBindingSHA256: options['approved-binding-sha'], businessDate: options['business-date'] }; ctx.persist();
    const parameters = { businessDate: options['business-date'], executionBinding: binding, approvedBindingSHA256: options['approved-binding-sha'], bindingBytes: bytes };
    // Producer modules are loaded only after the full approved filesystem closure.
    verifyFiles(binding); const producer = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime13/${options.stage === 'max' ? 'max13' : 'mask13'}.mjs`).href);
    const result = await (options.stage === 'max' ? producer.actualMaxFixture : producer.actualMaskFixture)(ctx, api, parameters);
    // MASK legitimately changes the person role; this checks file closure only.
    verifyFiles(binding);
    const receipt = ctx.artifact(`${label}-complete.json`, result, { kind: 'actual-public-assessment-MAX-or-MASK-fixture', stage: options.stage, G3Certified: false, formalSnapshotOrHEvaluationCertified: false });
    stages[options.stage] = { ...stages[options.stage], phase: 'complete', receipt }; ctx.persist(); console.log(JSON.stringify({ stage: options.stage, receipt, formalSnapshotOrHEvaluationCertified: false }));
  } catch (error) {
    if (ctx && label) { const receipt = ctx.artifact(`${label}-partial.json`, { name: error.name, message: error.message }, { kind: 'actual-MAX-MASK16-partial', noAutomaticRetry: true }); ctx.state.HFixtureRuns16[options.stage] = { ...ctx.state.HFixtureRuns16[options.stage], phase: 'partial', receipt }; ctx.persist(); }
    throw error;
  } finally {
    try { verifyFiles(binding); }
    finally { if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock)).pid === process.pid) fs.unlinkSync(lock); }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
