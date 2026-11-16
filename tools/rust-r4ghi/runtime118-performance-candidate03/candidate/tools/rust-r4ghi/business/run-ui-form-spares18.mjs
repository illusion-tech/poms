// Root-only. Source/epoch/process/actors are supplied by a newly approved actual binding.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateBindingShape, bindActualContext, sha } from '../H/implementation/support-patches/ui-integration/runtime13/binding13.mjs';
import { verifyPreparedPlan } from '../H/implementation/support-patches/ui-integration/handoff16/source-closure16.mjs';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
function files(binding) {
  assert(binding.plan?.file?.startsWith('/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/'));
  const bytes = fs.readFileSync(binding.plan.file); assert.equal(sha(bytes), binding.plan.rawBytesSha256); const plan = JSON.parse(bytes);
  assert.equal(plan.metadata16?.purpose, 'fixtures'); assert.deepEqual(plan.metadata16, binding.metadata16); verifyPreparedPlan(ROOT, plan);
  for (const name of ['fixture-view18.mjs', 'ui-form-spares18.mjs', 'run-ui-form-spares18.mjs']) assert(plan.sourceBases.some(item => item.file === `tools/rust-r4ghi/business/${name}`), 'Capture new helper bytes before execution');
}
async function main() {
  assert.equal(process.platform, 'linux'); const a = process.argv.slice(2); assert(a.length === 7 && a[0] === '--binding' && a[2] === '--approved-binding-sha' && a[4] === '--stage' && a[6] === '--execute');
  assert(['role-create', 'gh-capture'].includes(a[5])); const bytes = fs.readFileSync(a[1]); assert.equal(sha(bytes), a[3]); const binding = validateBindingShape(JSON.parse(bytes));
  assert.equal(binding.purpose, 'fixtures'); assert.equal(binding.actorBindingsFinal, false); files(binding);
  const lock = `/home/wangzishi/.local/share/poms-r4ghi/private/business/${binding.epoch}/${binding.run}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-ui-form-spares18', stage: a[5], approvedBindingSHA256: a[3] }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const { createContext } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/context.mjs`).href);
    const ctx = createContext({ epoch: binding.epoch, run: binding.run, 'api-process-record': binding.apiProcess.file }); const bound = bindActualContext(ctx, binding, a[3], bytes);
    for (const actor of ['manager', 'execution', 'finance', 'unrelated']) assert(bound.actorKeys.includes(actor));
    const { prepareFormSpare18 } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/ui-form-spares18.mjs`).href);
    const result = await prepareFormSpare18(ctx, a[5]); files(binding); console.log(JSON.stringify({ kind: result.kind, projectId: result.projectId, formSpare: result.formSpare, actualCommandHTTPNotSent: true, realDOMStillRequired: true, G3Certified: false }));
  } finally { try { files(binding); } finally { if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock)).pid === process.pid) fs.unlinkSync(lock); } }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
