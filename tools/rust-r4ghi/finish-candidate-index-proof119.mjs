// Finish the already-staged exact92 set; never repeats add or changes source bytes.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O = R + '/tmp/rust-r4ghi/root/candidate-source-index-proof01', sha = b => createHash('sha256').update(b).digest('hex');
function read(file, h) { const b = fs.readFileSync(file); if (h) assert.equal(sha(b), h, file); return b; }
const linux = file => file.startsWith('/mnt/e/') ? 'E:/' + file.slice(7) : '//wsl.localhost/Debian' + file;
function git(args, input) { const r = spawnSync('git', args, { cwd: R, windowsHide: true, encoding: null, input, maxBuffer: 256 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout; }
const decision = JSON.parse(read(O + '/exact-staging-decision.json')), staged = decision.staged;
assert.equal(staged.length, 92); assert.equal(new Set(staged.map(p => p.file)).size, 92);
assert.deepEqual(git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort(), staged.map(p => p.file).sort());
for (const p of staged) read(R + '/' + p.file, p.sha256);
const check = spawnSync('git', ['diff', '--cached', '--check'], { cwd: R, windowsHide: true, encoding: null });
fs.writeFileSync(O + '/diff-check-stdout.bin', check.stdout, { flag: 'wx' }); fs.writeFileSync(O + '/diff-check-stderr.bin', check.stderr, { flag: 'wx' });
assert.equal(check.stderr.length, 0);
const diagnostic = check.stdout.toString().replace(/\r\n/g, '\n');
assert.equal(check.status, 2); assert.equal(diagnostic, 'tools/rust-r4ghi/legacy-authority15-284/driver284.mjs:53: new blank line at EOF.\n');
const frozenDriver = staged.find(p => p.file === 'tools/rust-r4ghi/legacy-authority15-284/driver284.mjs'); assert(frozenDriver);
const inventory = JSON.parse(read(P + '/source15-build119-inventory34402-01/inventory-copy.json', '3ac1a8a7ccc0b50c5bb470034e0a313ecd7413c304e910fc5762ee4c99b841f0'));
const compiles = JSON.parse(read(linux(inventory.compilePins.file), inventory.compilePins.rawBytesSha256));
const helpers = JSON.parse(read(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1'));
const api = JSON.parse(read(P + '/source15-api119-start15-01/process.json', 'b42e176e4b77a63136cfee4a7fdc9f294552e1fd279acf3d951f066fa21a520c'));
const executor = JSON.parse(read(R + '/tools/rust-r4ghi/tax15-invocation118/tests/non-author-review01/review118-code01.json', 'b3d57cf0a7f4b08929001f9365c8c31176fd8bbc49b315f998caed59d55ae563')).executionSources;
const relative = file => { const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'; assert(file.startsWith(root)); return file.slice(root.length); };
const covered = [...compiles, ...helpers, ...api.code.map(p => ({ file: relative(p.file), sha256: p.rawBytesSha256 })), ...executor.map(p => ({ file: relative(p.file), sha256: p.rawBytesSha256 })), ...staged];
const expected = new Map(); for (const p of covered) { if (expected.has(p.file)) assert.equal(expected.get(p.file), p.sha256); expected.set(p.file, p.sha256); }
const entries = new Map(); for (const line of git(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean)) {
  const m = line.match(/^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/); assert(m); if (expected.has(m[4])) { assert.equal(m[3], '0'); assert(['100644', '100755'].includes(m[1])); entries.set(m[4], { oid: m[2], mode: m[1] }); }
}
assert.equal(entries.size, expected.size);
const oids = [...new Set([...entries.values()].map(e => e.oid))], batch = git(['cat-file', '--batch'], Buffer.from(oids.join('\n') + '\n')), blobs = new Map(); let offset = 0;
for (const oid of oids) { const end = batch.indexOf(10, offset); assert(end >= 0); const h = batch.subarray(offset, end).toString().split(' '); assert.equal(h[0], oid); assert.equal(h[1], 'blob'); const length = Number(h[2]); assert(Number.isSafeInteger(length)); const b = batch.subarray(end + 1, end + 1 + length); assert.equal(b.length, length); assert.equal(batch[end + 1 + length], 10); blobs.set(oid, { bytes: length, rawBytesSha256: sha(b) }); offset = end + 2 + length; }
assert.equal(offset, batch.length);
const verified = []; for (const [file, hash] of expected) { const e = entries.get(file), blob = blobs.get(e.oid); assert.equal(blob.rawBytesSha256, hash, file); read(R + '/' + file, hash); verified.push({ file, gitBlob: e.oid, gitMode: e.mode, ...blob }); }
const proof = { kind: 'Root-actual-Git-index-tested-source-byte-equivalence', indexTreeBeforeEvidence: git(['write-tree']).toString().trim(),
  stagedSourceFiles: 92, fullCompiledInputs: compiles.length, fullHelpers: helpers.length, nativeSources: api.code.length, executor118Sources: executor.length, uniqueCoveredFiles: verified.length,
  workingTreeEqualsGitBlob: true, noGitEOLNormalizationDifference: true, verified,
  diffCheck: { exitCode: 2, diagnostic, exactScopedException: frozenDriver, rationale: 'Preserve the independently sealed/installed current25 raw bytes and inverse source evidence; the only diagnostic is the existing final blank line. No lint pass or source change is claimed.' },
  comparisonScope: 'Candidate source bytes equal tested Root/mirror and reviewed code. No fresh checkout execution or business certification is claimed.',
  testsRerun: false, newBusinessCertified: 0, businessG3: false, businessG4: false };
const file = O + '/git-index-source-equivalence.json'; fs.writeFileSync(file, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ proof: { file, bytes: fs.statSync(file).size, rawBytesSha256: sha(fs.readFileSync(file)) }, staged: 92, uniqueCovered: verified.length, rawBytesEqual: true, diffCheck: 'one exact frozen EOF-blank-line exception', newBusinessCertified: 0 }));
