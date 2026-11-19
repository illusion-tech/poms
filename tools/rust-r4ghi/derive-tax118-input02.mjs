// Keep the never-executed original and correct only the private runtime location.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', sha = b => createHash('sha256').update(b).digest('hex');
const original = R + '/tools/rust-r4ghi/prepare-tax15-118-input.mjs', target = R + '/tools/rust-r4ghi/prepare-tax15-118-input02.mjs';
const before = fs.readFileSync(original), text = before.toString();
const edits = [
  ["fs.mkdirSync(O, { mode: 0o700 });", "const runtimeFile = P + '/business/g2-business15/main01/tax-runtime15-118-prepare01.json';\nassert(!fs.existsSync(runtimeFile));\nfs.mkdirSync(O, { mode: 0o700 });"],
  ["const entryState = put('entry-state15.json', stateRead.b), runtimePin = put('tax-runtime15.json', runtime);", String.raw`const entryState = put('entry-state15.json', stateRead.b);
fs.writeFileSync(runtimeFile, JSON.stringify(runtime, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const runtimePin = read(runtimeFile).pin;`],
];
let derived = text;
for (const [from, to] of edits) { assert.equal(derived.split(from).length, 2); derived = derived.replace(from, to); }
let inverse = derived;
for (const [from, to] of [...edits].reverse()) { assert.equal(inverse.split(to).length, 2); inverse = inverse.replace(to, from); }
assert.equal(inverse, text);
const after = Buffer.from(derived); fs.writeFileSync(target, after, { flag: 'wx' });
const proof = { kind: 'Root-runtime-prefix-only-input118-preparation-correction',
  original: { file: original, bytes: before.length, rawBytesSha256: sha(before), actuallyExecuted: false },
  successor: { file: target, bytes: after.length, rawBytesSha256: sha(after), actuallyExecuted: false },
  sourceRule: 'invocation-proof.mjs openInvocation118 runtimeBindings.file must be under actual D15',
  changedSpans: edits, inverseExact: true, nativeReaderModified: false, nonceDirectoryCreated: false, actualMode: false };
fs.writeFileSync(R + '/tools/rust-r4ghi/tax118-input02-derivation.json', JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(proof));
