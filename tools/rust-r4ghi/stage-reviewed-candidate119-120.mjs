// Root explicitly adopts the bounded, reviewed candidate source set. No add -A.
// The Git index is checked byte-for-byte against the tested live input graphs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const H = 'E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/independent-technical119-code-scope01';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O = R + '/tmp/rust-r4ghi/root/candidate-source-index-proof01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, h) { const b = fs.readFileSync(file); if (h) assert.equal(sha(b), h, file); return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } }; }
function run(args, input) { const r = spawnSync('git', args, { cwd: R, windowsHide: true, encoding: null, input, maxBuffer: 256 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout; }
const linux = file => file.startsWith('/mnt/e/') ? 'E:/' + file.slice('/mnt/e/'.length) : '//wsl.localhost/Debian' + file;
assert(!fs.existsSync(O)); assert.equal(run(['rev-parse', 'HEAD']).toString().trim(), 'b9a48d85b4d8aea47e02e33d91d42eaff6c7fea7');
assert.equal(run(['diff', '--cached', '--name-only']).length, 0, 'Preserve another staged set; do not combine implicitly');
const scopeManifest = JSON.parse(read(H + '/manifest-code-delivery01.json', 'ad264d45c915c8fc93d4fcf12d14336117a9d168f5a04069df63eaaf68081481').b);
const scopeEntry = scopeManifest.files.find(p => p.file.endsWith('/bounded-pending67.json')); assert(scopeEntry);
const scope = JSON.parse(read(linux(scopeEntry.file), scopeEntry.rawBytesSha256).b); assert.equal(scope.files.length, 67);
const callers = JSON.parse(read(I + '/tools/rust-r4ghi/I/implementation/source15-callers-code02/sealed-code02/manifest120-code02.json', '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a').b);
const finalCallersReview = read(R + '/tools/rust-r4ghi/independent/final-gates13/callers120-code-review02/review-callers120-code02-final.json', 'ff66299b80860079d77db44dda731f8f75054658355a1d46c81ef98106ed96d4').pin;
const actualCallersReview = read(R + '/tools/rust-r4ghi/independent/final-gates13/callers120-actual-FS-readback01/review-actual-callers120-filesystem.json', 'f5e0ebb532888ad3bbe288073fe04f1829f3cbced81a56c00ea02e8670e8e7b1').pin;
const staged = [...scope.files.map(p => ({ file: p.file, sha256: p.sha256, group: p.group })),
  ...callers.production.map(p => ({ file: p.file, sha256: p.afterSHA256, group: 'reviewed-current25-caller-code02' }))];
assert.equal(staged.length, 92); assert.equal(new Set(staged.map(p => p.file)).size, 92);
for (const p of staged) { assert(!p.file.includes('\\') && !p.file.split('/').includes('..')); read(R + '/' + p.file, p.sha256); }
const inventory = JSON.parse(read(P + '/source15-build119-inventory34402-01/inventory-copy.json', '3ac1a8a7ccc0b50c5bb470034e0a313ecd7413c304e910fc5762ee4c99b841f0').b);
const compiles = JSON.parse(read(linux(inventory.compilePins.file), inventory.compilePins.rawBytesSha256).b);
const helpers = JSON.parse(read(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1').b);
const process = JSON.parse(read(P + '/source15-api119-start15-01/process.json', 'b42e176e4b77a63136cfee4a7fdc9f294552e1fd279acf3d951f066fa21a520c').b);
const executor = JSON.parse(read(R + '/tools/rust-r4ghi/tax15-invocation118/tests/non-author-review01/review118-code01.json', 'b3d57cf0a7f4b08929001f9365c8c31176fd8bbc49b315f998caed59d55ae563').b).executionSources;
const covered = [...compiles, ...helpers, ...process.code.map(p => ({ file: p.file.slice('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'.length), sha256: p.rawBytesSha256 })),
  ...executor.map(p => ({ file: p.file.slice('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'.length), sha256: p.rawBytesSha256 })), ...staged];
const expected = new Map(); for (const p of covered) { if (expected.has(p.file)) assert.equal(expected.get(p.file), p.sha256); expected.set(p.file, p.sha256); }
fs.mkdirSync(O); fs.writeFileSync(O + '/exact-staging-decision.json', JSON.stringify({ kind: 'Root-explicit-reviewed-candidate-staging-decision',
  scopeManifest: read(H + '/manifest-code-delivery01.json').pin, staged, finalCallersReview, actualCallersReview,
  codeCandidateOnly: true, newBusinessCertified: 0, businessG3: false, businessG4: false }, null, 2) + '\n', { flag: 'wx' });
run(['add', '--', ...staged.map(p => p.file)]);
const actualStaged = run(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort();
assert.deepEqual(actualStaged, staged.map(p => p.file).sort()); run(['diff', '--cached', '--check']);
const entries = new Map();
for (const line of run(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean)) {
  const match = line.match(/^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/); assert(match);
  if (expected.has(match[4])) { assert.equal(match[3], '0'); assert(['100644', '100755'].includes(match[1])); entries.set(match[4], { oid: match[2], mode: match[1] }); }
}
assert.equal(entries.size, expected.size, 'Every tested current source/helper/native/executor/caller must be in the Git candidate');
const oids = [...new Set([...entries.values()].map(p => p.oid))];
const batch = run(['cat-file', '--batch'], Buffer.from(oids.join('\n') + '\n')), blobs = new Map(); let offset = 0;
for (const oid of oids) {
  const end = batch.indexOf(10, offset); assert(end >= 0); const header = batch.subarray(offset, end).toString().split(' ');
  assert.equal(header[0], oid); assert.equal(header[1], 'blob'); const bytes = Number(header[2]); assert(Number.isSafeInteger(bytes));
  const body = batch.subarray(end + 1, end + 1 + bytes); assert.equal(body.length, bytes); assert.equal(batch[end + 1 + bytes], 10);
  blobs.set(oid, { bytes, rawBytesSha256: sha(body) }); offset = end + 2 + bytes;
}
assert.equal(offset, batch.length);
const verified = [];
for (const [file, hash] of expected) {
  const entry = entries.get(file), blob = blobs.get(entry.oid); assert.equal(blob.rawBytesSha256, hash, file); read(R + '/' + file, hash);
  verified.push({ file, gitBlob: entry.oid, gitMode: entry.mode, ...blob });
}
const proof = { kind: 'Root-actual-Git-index-tested-source-byte-equivalence', indexTreeBeforeEvidence: run(['write-tree']).toString().trim(),
  stagedSourceFiles: 92, fullCompiledInputs: compiles.length, fullHelpers: helpers.length, nativeSources: process.code.length, executor118Sources: executor.length,
  uniqueCoveredFiles: verified.length, verified, workingTreeEqualsGitBlob: true, noGitEOLNormalizationDifference: true,
  comparisonScope: 'Candidate source bytes equal already-tested Root/mirror and reviewed code; no new checkout execution or business certification is claimed',
  testsRerun: false, newBusinessCertified: 0, businessG3: false, businessG4: false };
const file = O + '/git-index-source-equivalence.json'; fs.writeFileSync(file, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ proof: read(file).pin, staged: 92, uniqueCovered: verified.length, rawBytesEqual: true, newBusinessCertified: 0 }));
