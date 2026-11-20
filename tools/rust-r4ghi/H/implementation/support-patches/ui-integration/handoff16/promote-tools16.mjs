// Root-only exact source-file promotion; no execution of copied tools, HTTP, DB or browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, file) => { const relative = path.relative(root, file); return relative && !relative.startsWith('..') && !path.isAbsolute(relative); };
export function promote(plan, approvedPlanSHA256, planBytes) {
  assert.equal(sha(planBytes), approvedPlanSHA256); assert.equal(plan.kind, 'proposed-exact-sealed-UI14-runtime-file-copy-only');
  const sourceBase = path.resolve('E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration');
  const destinationBase = path.resolve('E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration');
  assert.equal(path.resolve(plan.sourceBase), sourceBase); assert.equal(path.resolve(plan.destinationBase), destinationBase);
  assert.equal(plan.files.length, 20); const copied = [], alreadyExact = [];
  for (const item of plan.files) {
    const source = path.resolve(sourceBase, item.relativeFile), destination = path.resolve(destinationBase, item.relativeFile);
    assert(inside(sourceBase, source) && inside(destinationBase, destination));
    assert(/^(runtime14\/[^/]+|runtime13\/binding13\.mjs|append06\/(ui06\.candidate08\.mjs|ui-server06\.mjs))$/.test(item.relativeFile));
    const bytes = fs.readFileSync(source); assert.equal(sha(bytes), item.rawBytesSha256); assert.equal(bytes.length, item.bytes);
    if (fs.existsSync(destination)) { assert.equal(sha(fs.readFileSync(destination)), item.rawBytesSha256, 'Never overwrite an unknown Root tool revision'); alreadyExact.push(item.relativeFile); }
    else { fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes, { flag: 'wx' }); assert.equal(sha(fs.readFileSync(destination)), item.rawBytesSha256); copied.push(item.relativeFile); }
  }
  return { kind: 'exact-sealed-runtime-files-copied', approvedPlanSHA256, copied, alreadyExact, filesExecuted: 0, HTTPExecuted: false, DBExecuted: false, browserExecuted: false };
}
function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-plan-sha' && args[4] === '--execute'); const bytes = fs.readFileSync(args[1]); console.log(JSON.stringify(promote(JSON.parse(bytes), args[3], bytes))); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
