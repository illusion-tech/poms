import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receiptFile = root + '/tmp/rust-r4ghi/root/api-build04-closure62/receipt.json', receiptBytes = fs.readFileSync(receiptFile), receipt = JSON.parse(receiptBytes);
assert.equal(receipt.check, 'api-build'); assert.equal(receipt.edition, '04'); assert.equal(receipt.exitCode, 0); assert.equal(receipt.sourceStable, true); assert.equal(receipt.inputs.length, 2838);
for (const input of receipt.inputs) assert.equal(sha(fs.readFileSync(root + '/' + input.file)), input.rawBytesSha256);
const directory = root + '/dist/apps/poms-api', files = fs.readdirSync(directory).sort().map(file => {
  const stat = fs.lstatSync(directory + '/' + file); assert(stat.isFile() && !stat.isSymbolicLink());
  const bytes = fs.readFileSync(directory + '/' + file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
});
assert.deepEqual(files.map(file => file.file), ['main.js', 'main.js.map', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']);
const record = { kind: 'Root-fresh-Native-build04-source-and-output-binding103', buildReceipt: { file: receiptFile, rawBytesSha256: sha(receiptBytes) },
  actualCompleteSourceInputs: 2838, sourceInputManifestSHA256: receipt.inputManifestSHA256, allCurrentInputsStillExact: true,
  output: { directory, files, manifestSHA256: sha(JSON.stringify(files)) },
  databaseConnectedByThisCapture: false, NativeHTTPExecuted: false, runtimeStillRequiresExplicitOwnedEnvironmentAndProcessBinding: true, G3Certified: false };
const output = root + '/tmp/rust-r4ghi/root/native-build-binding103'; fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + '/receipt.json', JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt: output + '/receipt.json', rawBytesSha256: sha(fs.readFileSync(output + '/receipt.json')),
  actualSourceInputs: 2838, outputFiles: files.length, mainJSRawSHA256: files.find(file => file.file === 'main.js').rawBytesSha256, NativeHTTPExecuted: false }));
