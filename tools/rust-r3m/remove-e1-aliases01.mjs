// Root removes only the five explicitly frozen regular compatibility files.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { E1_INPUTS } from './e1-registry01.mjs';
import { pin } from './source-guard.mjs';
const root = fs.realpathSync(process.cwd());
const gate = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')); assert(gate.G1Certified && gate.G2Authorized);
const before = JSON.parse(fs.readFileSync('tmp/rust-r3m/e1-before01/report01.json')); assert(before.completed && before.replay.allReplayAssertionsPassed);
const m = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-input-manifest01.json'));
const approved = m.E1Inputs.map(({ file, bytes, rawBytesSha256 }) => ({ file, bytes, rawBytesSha256 })).sort((a, b) => a.file.localeCompare(b.file));
const actual = Object.values(E1_INPUTS).sort((a, b) => a.file.localeCompare(b.file)); assert.deepEqual(actual, approved); assert.equal(actual.length, 5);
const proof = [];
for (const p of actual) {
  const absolute = path.resolve(root, ...p.file.split('/')); assert(absolute.startsWith(root + path.sep)); assert(p.file.startsWith('docs/design/rust-r3cdefg/'));
  const st = fs.lstatSync(absolute); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.deepEqual(pin(p.file), p);
  const canonical = m.E1Inputs.find(x => x.file === p.file).canonical;
  assert.deepEqual(pin(canonical.file), canonical); assert(fs.readFileSync(absolute).equals(fs.readFileSync(canonical.file)));
  proof.push({ original: p, resolvedAbsolute: absolute, canonical });
}
// No recursive operation, computed parent removal or unrelated file mutation.
for (const row of proof) fs.unlinkSync(row.resolvedAbsolute);
for (const row of proof) { assert(!fs.existsSync(row.resolvedAbsolute)); assert.deepEqual(pin(row.canonical.file), row.canonical); }
const file = 'tmp/rust-r3m/e1-removal-' + process.platform + '01.json';
fs.writeFileSync(file, JSON.stringify({ kind: 'R3-E1-approved-five-regular-alias-removal', repositoryRoot: root, beforeReplay: pin('tmp/rust-r3m/e1-before01/report01.json'), proof, removedFiles: 5, removedBytes: 419264, recursiveRemoval: false, canonicalBytesUnchanged: true, afterReplayRequired: true, E1ExitCertified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ platform: process.platform, removedFiles: 5, removedBytes: 419264, canonicalBytesUnchanged: true, afterReplayPending: true }));
