// Root-only outer admission for unmodified sealed14. Full plan/build are approved by the binding.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateBindingShape } from '../H/implementation/support-patches/ui-integration/runtime13/binding13.mjs';
import { validatePlanIdentity } from '../H/implementation/support-patches/ui-integration/runtime14/dom-common14.mjs';
import { sha } from '../H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
import { leafManifest } from '../H/implementation/support-patches/ui-integration/handoff16/source-closure16.mjs';
const ROOT = 'E:/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const unc = file => { assert(file.startsWith('/home/wangzishi/.local/share/poms-r4ghi/private/')); return PRIVATE + file.slice('/home/wangzishi/.local/share/poms-r4ghi/private'.length); };
function verify(planFile, bindingFile, approvedBindingSHA256) {
  const bindingBytes = fs.readFileSync(bindingFile); assert.equal(sha(bindingBytes), approvedBindingSHA256); const binding = validateBindingShape(JSON.parse(bindingBytes));
  assert.equal(binding.purpose, 'dom'); assert.equal(binding.actorBindingsFinal, true); assert(binding.plan && binding.metadata16);
  const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), binding.plan.rawBytesSha256, 'Entire Root-approved plan changed');
  const plan = JSON.parse(planBytes), locations = validatePlanIdentity(plan); assert.equal(path.resolve(planFile).toLowerCase(), path.resolve(locations.windowsPlan).toLowerCase()); assert.equal(binding.plan.file, locations.linuxPlan);
  assert.deepEqual(binding.metadata16, plan.metadata16); assert.equal(plan.metadata16.purpose, 'dom'); assert.equal(sha(Buffer.from(JSON.stringify(plan.writeActions))), binding.writeActionsSHA256);
  if (plan.metadata16.promotedToolClosure) {
    const metaFile = item => item.file.startsWith('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/') ? ROOT + item.file.slice('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'.length) : unc(item.file);
    const pin = plan.metadata16.promotedToolClosure, bytes = fs.readFileSync(metaFile(pin)); assert.equal(sha(bytes), pin.rawBytesSha256);
    const current = JSON.parse(bytes); assert.equal(current.kind, 'Root-reviewed-exact-tool-corrective-closure54'); assert.deepEqual(current.promotionReceipt, plan.metadata16.toolPromotionReceipt);
    assert.equal(sha(fs.readFileSync(metaFile(current.promotionReceipt))), current.promotionReceipt.rawBytesSha256);
  }
  assert(plan.metadata16.linuxNode.executable.startsWith('/')); assert.equal(sha(fs.readFileSync(`//wsl.localhost/Debian${plan.metadata16.linuxNode.executable}`)), plan.metadata16.linuxNode.rawBytesSha256);
  for (const item of plan.sourceBases) { const bytes = fs.readFileSync(path.join(ROOT, item.file)); assert.equal(sha(bytes), item.rawBytesSha256); assert.equal(bytes.length, item.bytes); }
  const manifestBytes = fs.readFileSync(unc(plan.metadata16.buildManifest.file)); assert.equal(sha(manifestBytes), plan.metadata16.buildManifest.rawBytesSha256);
  const frozen = JSON.parse(manifestBytes), actual = leafManifest(`${ROOT}/dist/apps/poms-admin/browser`);
  assert.equal(frozen.kind, 'actual-dist-browser-leaf-manifest16'); assert.equal(frozen.manifestSha256, plan.metadata16.buildManifestSha256); assert.deepEqual(actual.files, frozen.files); assert.equal(actual.memberCount, plan.metadata16.buildLeafCount);
  assert.equal(actual.manifestSha256, frozen.manifestSha256); return { plan, locations, bindingSHA256: sha(bindingBytes) };
}
function main() {
  assert.equal(process.platform, 'win32'); const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-binding-sha' && args[4] === '--execute');
  const initialPlan = JSON.parse(fs.readFileSync(args[1])), locations = validatePlanIdentity(initialPlan), before = verify(args[1], locations.windowsBinding, args[3]);
  assert.equal(path.resolve(process.execPath).toLowerCase(), path.resolve(before.plan.windows.node.executablePath).toLowerCase());
  assert.equal(before.plan.cases.length,1);assert.equal(before.plan.cases[0].kind,'role-forms');const child = spawnSync(process.execPath, [`${ROOT}/tools/rust-r4ghi/business/ui-role18-windows.mjs`, '--plan', args[1], '--approved-binding-sha', args[3], '--execute'], { cwd: ROOT, windowsHide: true, stdio: 'inherit' });
  verify(args[1], locations.windowsBinding, args[3]); if (child.error) throw child.error; assert(child.status !== null, 'Owned child did not exit with a status');
  console.log(JSON.stringify({ kind: 'exact-plan-and-build-outer-runtime16', childExitCode: child.status, beforeAfterPlanBuildPinsEqual: true, approvedBindingSHA256: before.bindingSHA256, G3Certified: false })); process.exitCode = child.status;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
