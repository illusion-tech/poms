// Preserve live attested bytes. Record exact CRLF reconstruction from Git blobs.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O = R + '/tmp/rust-r4ghi/root/candidate-source-index-proof01', sha = b => createHash('sha256').update(b).digest('hex');
function read(file, h) { const b = fs.readFileSync(file); if (h) assert.equal(sha(b), h, file); return b; }
const linux = file => file.startsWith('/mnt/e/') ? 'E:/' + file.slice(7) : '//wsl.localhost/Debian' + file;
function git(args, input) { const r = spawnSync('git', args, { cwd: R, windowsHide: true, encoding: null, input, maxBuffer: 256 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout; }
const decision = JSON.parse(read(O + '/exact-staging-decision.json')), staged = decision.staged;
assert.equal(staged.length, 92); assert.deepEqual(git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort(), staged.map(p => p.file).sort());
const diagnostic = read(O + '/diff-check-stdout.bin').toString().replace(/\r\n/g, '\n');
assert.equal(diagnostic, 'tools/rust-r4ghi/legacy-authority15-284/driver284.mjs:53: new blank line at EOF.\n'); assert.equal(read(O + '/diff-check-stderr.bin').length, 0);
const inventory = JSON.parse(read(P + '/source15-build119-inventory34402-01/inventory-copy.json', '3ac1a8a7ccc0b50c5bb470034e0a313ecd7413c304e910fc5762ee4c99b841f0'));
const compiles = JSON.parse(read(linux(inventory.compilePins.file), inventory.compilePins.rawBytesSha256));
const helpers = JSON.parse(read(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1'));
const api = JSON.parse(read(P + '/source15-api119-start15-01/process.json', 'b42e176e4b77a63136cfee4a7fdc9f294552e1fd279acf3d951f066fa21a520c'));
const executor = JSON.parse(read(R + '/tools/rust-r4ghi/tax15-invocation118/tests/non-author-review01/review118-code01.json', 'b3d57cf0a7f4b08929001f9365c8c31176fd8bbc49b315f998caed59d55ae563')).executionSources;
const relative = file => { const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'; assert(file.startsWith(root)); return file.slice(root.length); };
const expected = new Map();
for (const p of [...compiles, ...helpers, ...api.code.map(p => ({ file: relative(p.file), sha256: p.rawBytesSha256 })), ...executor.map(p => ({ file: relative(p.file), sha256: p.rawBytesSha256 })), ...staged]) {
  if (expected.has(p.file)) assert.equal(expected.get(p.file), p.sha256); expected.set(p.file, p.sha256);
}
const entries = new Map(); for (const line of git(['ls-files', '--stage', '-z']).toString().split('\0').filter(Boolean)) {
  const m = line.match(/^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/); assert(m);
  if (expected.has(m[4])) { assert.equal(m[3], '0'); assert(['100644', '100755'].includes(m[1])); entries.set(m[4], { oid: m[2], mode: m[1] }); }
}
assert.equal(entries.size, expected.size);
const oids = [...new Set([...entries.values()].map(e => e.oid))], batch = git(['cat-file', '--batch'], Buffer.from(oids.join('\n') + '\n')), blobs = new Map(); let offset = 0;
for (const oid of oids) { const end = batch.indexOf(10, offset); assert(end >= 0); const h = batch.subarray(offset, end).toString().split(' '); assert.equal(h[0], oid); assert.equal(h[1], 'blob'); const length = Number(h[2]); assert(Number.isSafeInteger(length)); const b = batch.subarray(end + 1, end + 1 + length); assert.equal(b.length, length); assert.equal(batch[end + 1 + length], 10); blobs.set(oid, b); offset = end + 2 + length; }
assert.equal(offset, batch.length);
function lf(buffer) { const out = []; for (let i = 0; i < buffer.length; i++) { if (buffer[i] === 13 && buffer[i + 1] === 10) continue; out.push(buffer[i]); } return Buffer.from(out); }
const verified = []; let exact = 0;
for (const [file, hash] of expected) {
  const entry = entries.get(file), blob = blobs.get(entry.oid), live = read(R + '/' + file, hash);
  const base = { file, gitBlob: entry.oid, gitMode: entry.mode, gitBlobBytes: blob.length, gitBlobSHA256: sha(blob), testedRawBytes: live.length, testedRawSHA256: hash };
  if (blob.equals(live)) { verified.push({ ...base, rawBytesEqual: true, reconstruction: 'identity' }); exact++; continue; }
  // Any difference beyond CRLF positions is a hard failure, never a normalizer.
  assert.deepEqual(Buffer.from(blob.toString('utf8')), blob); assert.deepEqual(Buffer.from(live.toString('utf8')), live);
  const normalized = lf(blob); assert.deepEqual(normalized, lf(live), file + ': non-EOL source difference');
  const lines = []; let line = 0; for (let i = 0; i < live.length; i++) if (live[i] === 10) { line++; if (i > 0 && live[i - 1] === 13) lines.push(line); }
  const crlf = new Set(lines), reconstructed = []; line = 0;
  for (const byte of normalized) { if (byte === 10) { line++; if (crlf.has(line)) reconstructed.push(13); } reconstructed.push(byte); }
  const raw = Buffer.from(reconstructed); assert.deepEqual(raw, live); assert.equal(sha(raw), hash);
  verified.push({ ...base, rawBytesEqual: false, differenceOnlyCRLF: true, normalizedLFBytes: normalized.length, normalizedLFSHA256: sha(normalized),
    reconstruction: 'Normalize Git CRLF to LF, then insert CR before LF at the one-based LF line numbers below', crlfLineNumbers: lines, reconstructedRawSHA256: sha(raw), exactRoundTrip: true });
}
const proof = { kind: 'Root-Git-candidate-exact-tested-source-reconstruction', indexTreeBeforeEvidence: git(['write-tree']).toString().trim(),
  stagedSourceFiles: 92, compileInputs: compiles.length, helpers: helpers.length, native14: api.code.length, executor118: executor.length, uniqueCoveredFiles: verified.length,
  identityFiles: exact, onlyCRLFMappingFiles: verified.length - exact, allExactReconstructionVerified: true, liveSourceFilesModified: false,
  freshDefaultCheckoutRawEqualityClaimed: false, freshCheckoutBuildExecuted: false, gitEOLPolicy: 'Existing text=auto/eol=lf with core.autocrlf=input; some unchanged live Rust inputs predate that checkout policy and contain CRLF',
  diffCheck: { exitCode: 2, diagnostic, exactFrozenEOFBlankException: true, noLintPassClaimed: true },
  verified, newBusinessCertified: 0, businessG3: false, businessG4: false };
const file = O + '/git-source-reconstruction.json'; fs.writeFileSync(file, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ proof: { file, bytes: fs.statSync(file).size, rawBytesSha256: sha(fs.readFileSync(file)) }, staged: 92, covered: verified.length, identity: exact, CRLFMaps: verified.length - exact, exactRoundTrip: true, noLiveSourceChange: true }));
