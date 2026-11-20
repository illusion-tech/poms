// Exact one-literal derivatives; original committed orchestration stays untouched.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', sha = b => createHash('sha256').update(b).digest('hex');
const derived = [];
for (const [original, target] of [
  ['execute-observe15-119-once.mjs', 'execute-observe15-119-once02.mjs'],
  ['prepare-plan15-119.mjs', 'prepare-plan15-119-observe02.mjs'],
]) {
  const relative = 'tools/rust-r4ghi/' + original, file = R + '/' + relative, before = fs.readFileSync(file);
  const g = spawnSync('git', ['show', 'b9a48d85b4d8aea47e02e33d91d42eaff6c7fea7:' + relative], { cwd: R, windowsHide: true, encoding: null });
  assert.equal(g.status, 0); assert.deepEqual(g.stdout, before);
  const from = '/observe15-119-prepared01', to = '/observe15-119-prepared02', text = before.toString();
  assert.equal(text.split(from).length, 2); const after = Buffer.from(text.replace(from, to));
  assert.deepEqual(Buffer.from(after.toString().replace(to, from)), before);
  const out = R + '/tools/rust-r4ghi/' + target; fs.writeFileSync(out, after, { flag: 'wx' });
  derived.push({ original: { file, bytes: before.length, rawBytesSha256: sha(before) },
    derivative: { file: out, bytes: after.length, rawBytesSha256: sha(after) }, onlyChange: { from, to }, inverseExact: true });
}
fs.writeFileSync(R + '/tools/rust-r4ghi/observe02-orchestration-derivation119.json', JSON.stringify({ kind: 'Root-exact-observe02-path-only-orchestration-derivation119', derived, nativeSourceModified: false, actualModes: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ derived, nativeSourceModified: false, actualModes: 0 }));
