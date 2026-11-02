// Shared read-only source admission used by Root's new-batch executors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const base = '5041275d7ad82af4becbb4462e7213ffe465bc7a';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function pin(file) {
  const b = fs.readFileSync(file);
  return { file, bytes: b.length, rawBytesSha256: sha(b) };
}
export function admission() {
  const m = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-input-manifest01.json'));
  assert.equal(m.base, base);
  return m;
}
export function guardNative() {
  const m = admission();
  const current = fs.existsSync('tmp/rust-r3m/root/current-candidate.json')
    ? JSON.parse(fs.readFileSync('tmp/rust-r3m/root/current-candidate.json')) : null;
  if (current) assert.equal(current.base, base);
  for (const original of m.protectedFiles) {
    const replacement = current?.allowedProtectedDeltas.find(x => x.file === original.file);
    if (replacement) assert(m.protectedAllowedG2Deltas.includes(original.file));
    assert.deepEqual(pin(original.file), replacement || original, 'Protected source changed: ' + original.file);
  }
  return m.protectedFiles.length;
}
export function guardCandidate() {
  const current = JSON.parse(fs.readFileSync('tmp/rust-r3m/root/current-candidate.json'));
  assert.equal(current.base, base);
  for (const p of current.productFiles) assert.deepEqual(pin(p.file), p, 'Candidate changed: ' + p.file);
  guardNative();
  return current;
}
