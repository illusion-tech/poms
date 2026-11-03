// Root adopts only independently isolated, sealed author deliveries.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { admission, pin } from './source-guard.mjs';
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
const frozen = admission(), commit = '546c6c243ea6162077cb065ced54c5a8188afe23';
const records = [], deliverables = [];
const defs = [
  { key: 'a', root: 'E:/projects/worktrees/poms-r3co-a/poms', manifest: 'source-manifest01.json', allowed: ['leads/service.rs', 'leads/store.rs', 'leads/scoring.rs'] },
  { key: 'b', root: 'E:/projects/worktrees/poms-r3co-b/poms', manifest: 'delivery01.json', allowed: ['customers/service.rs', 'customers/store.rs', 'customer_contacts/service.rs', 'customer_contacts/store.rs'] },
];
const norm = p => ({ file: p.file || p.path, bytes: p.bytes, rawBytesSha256: p.rawBytesSha256 || p.sha256 });
for (const d of defs) {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d.root, encoding: 'utf8' }).trim(), commit);
  const allowed = d.allowed.map(p => 'apps/poms-api-rust/src/' + p).sort();
  const changed = execFileSync('git', ['diff', '--name-only'], { cwd: d.root, encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, allowed, 'Author scope changed');
  const sourceManifest = `tmp/rust-r3m/g2-${d.key}/${d.manifest}`, m = JSON.parse(fs.readFileSync(d.root + '/' + sourceManifest));
  const sourcePins = (m.sources || m.productFiles).map(norm);
  for (const file of allowed) {
    const expected = sourcePins.find(p => p.file === file); assert(expected, file);
    const actualSource = pin(d.root + '/' + file); assert.equal(actualSource.bytes, expected.bytes); assert.equal(actualSource.rawBytesSha256, expected.rawBytesSha256);
    const previous = frozen.rustFiles.find(p => p.file === file); assert(previous);
    assert.deepEqual(pin(file), previous, 'Root product changed before author integration');
    fs.copyFileSync(d.root + '/' + file, file);
    assert.equal(pin(file).rawBytesSha256, expected.rawBytesSha256);
    records.push({ author: d.key, previous, authorSource: actualSource, integrated: pin(file) });
  }
  const target = `tmp/rust-r3m/g2-${d.key}`; assert(!fs.existsSync(target));
  fs.cpSync(d.root + '/' + target, target, { recursive: true });
  deliverables.push({ author: d.key, manifest: pin(target + '/' + d.manifest), originalSourceRoot: d.root });
}
const dRoot = 'E:/projects/worktrees/poms-r3co-c/poms', dPath = 'tmp/rust-r3m/g2-d/delivery01.json';
const d = JSON.parse(fs.readFileSync(dRoot + '/' + dPath)); assert.equal(d.files.length, 6);
for (const p of d.files) {
  assert(p.file.startsWith('tools/rust-r3m/e1-') && !p.file.includes('..'));
  const actual = pin(dRoot + '/' + p.file); assert.equal(actual.bytes, p.bytes); assert.equal(actual.rawBytesSha256, p.rawBytesSha256);
  assert(!fs.existsSync(p.file)); fs.copyFileSync(dRoot + '/' + p.file, p.file);
  records.push({ author: 'd', authorSource: actual, integrated: pin(p.file) });
}
assert(!fs.existsSync('tmp/rust-r3m/g2-d')); fs.cpSync(dRoot + '/tmp/rust-r3m/g2-d', 'tmp/rust-r3m/g2-d', { recursive: true });
deliverables.push({ author: 'd', manifest: pin(dPath), originalSourceRoot: dRoot });
fs.writeFileSync('tmp/rust-r3m/root/g2-integration01.json', JSON.stringify({ kind: 'R3-closeout-bounded-author-integration', baselineCommit: commit, records, deliverables, sourceOnly: true, buildOrBusinessAcceptanceExecuted: false, productFiles: 7, E1SupportFiles: 6, oldWorktreeOrPrivateModified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ productFiles: 7, E1SupportFiles: 6, authorDeliveriesUnchanged: true, executionPending: true }));
