// Root-only metadata capture AFTER exact promotion. Never invents a promotion receipt or executes tools.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private', PREFIX = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function readPin(pin) { assert.equal(path.resolve(pin.file), pin.file); assert(pin.file.startsWith(ROOT + '/') || pin.file.startsWith(PRIVATE + '/')); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(pin.file), pin.file); const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes); }
function main() {
  assert.equal(process.platform, 'linux'); const a = process.argv.slice(2); assert(a.length === 5 && a[0] === '--input' && a[2] === '--approved-input-sha' && a[4] === '--execute');
  const bytes = fs.readFileSync(a[1]); assert.equal(sha(bytes), a[3]); const input = JSON.parse(bytes);
  assert.deepEqual(Object.keys(input).sort(), ['schemaVersion', 'kind', 'originalCopyPlan', 'correctionManifest', 'promotionReceipt', 'outputFile'].sort());
  assert.equal(input.schemaVersion, 1); assert.equal(input.kind, 'capture-actually-promoted-tool-closure54');
  const original = readPin(input.originalCopyPlan), correction = readPin(input.correctionManifest); readPin(input.promotionReceipt);
  assert.equal(input.originalCopyPlan.file, `${ROOT}/${PREFIX}/handoff16/exact-copy-plan16.json`); assert.equal(original.files.length, 20);
  assert.equal(correction.kind, 'Root-reviewable-H-tool-consumer-admission54-compatibility');
  for (const product of correction.products) { const target = `${ROOT}/${product.file}`; assert.equal(sha(fs.readFileSync(target)), product.candidateRawBytesSha256, 'Root must actually exact-promote every correction first'); }
  const files = original.files.map(item => {
    const relative = `${PREFIX}/${item.relativeFile}`, actual = fs.readFileSync(`${ROOT}/${relative}`), product = correction.products.find(product => product.file === relative);
    assert.equal(sha(actual), product?.candidateRawBytesSha256 ?? item.rawBytesSha256);
    if (product) assert.equal(product.baseRawBytesSha256, item.rawBytesSha256);
    return { relativeFile: item.relativeFile, baseRawBytesSha256: item.rawBytesSha256, bytes: actual.length, rawBytesSha256: sha(actual) };
  });
  assert(input.outputFile.startsWith(PRIVATE + '/ui-config/runtime14/') && path.basename(input.outputFile) === input.outputFile.split('/').at(-1));
  assert.equal(path.resolve(input.outputFile), input.outputFile);
  const output = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'Root-reviewed-exact-tool-corrective-closure54', baseCopyPlanRawBytesSha256: input.originalCopyPlan.rawBytesSha256,
    correctionManifest: input.correctionManifest, promotionReceipt: input.promotionReceipt, files }, null, 2) + '\n');
  fs.writeFileSync(input.outputFile, output, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ promotedToolClosure: { file: input.outputFile, rawBytesSha256: sha(output) }, promotionReceiptInvented: false, copiedFiles: false, HTTPExecuted: false, DBExecuted: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
