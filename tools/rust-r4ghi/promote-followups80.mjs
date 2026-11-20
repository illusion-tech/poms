import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = b => createHash('sha256').update(b).digest('hex');
const iRelative = 'tools/rust-r4ghi/I/implementation/business-frozen-reparent58-02';
const proposals = [
  { source: 'E:/projects/worktrees/poms-r4i-lifecycle/poms/' + iRelative, archive: root + '/' + iRelative, manifest: 'manifest58-02.json', expected: '652c8b00b0c8a20f46ac2410f5de7fc0ca8aee814d3aec20c39ade2cd2e6204e' },
  { source: root + '/tools/rust-r4ghi/independent/review05/restatement-readback-fix78', manifest: 'manifest78.json', expected: '23d8446a7e10e6bfe1cf0b4c801033392e5e7603cd35609bff33ba8b062e741b' },
];
const receipts = [];
for (const proposal of proposals) {
  const bytes = fs.readFileSync(proposal.source + '/' + proposal.manifest);
  assert.equal(sha(bytes), proposal.expected);
  const manifest = JSON.parse(bytes);
  for (const pin of manifest.contractPins ?? []) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
  for (const pin of manifest.sourcePins ?? []) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.rawSHA256);
  if (manifest.appendOnlyDependencyRegistration) {
    const registration = fs.readFileSync(proposal.source + '/' + manifest.appendOnlyDependencyRegistration.file);
    assert.equal(sha(registration), manifest.appendOnlyDependencyRegistration.sha256);
    const value = JSON.parse(registration);
    for (const binding of value.bindings) {
      assert.equal(sha(fs.readFileSync(root + '/' + binding.originalManifest)), binding.originalManifestSHA256);
      assert.equal(sha(fs.readFileSync(root + '/' + binding.dependency)), binding.afterSHA256);
    }
    assert.equal(sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/lifecycle-sources57.json')), value.productSources57JSONUnchanged);
    assert.equal(sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/frozen-reparent-sources58.json')), value.productSources58JSONUnchanged);
  }
  for (const entry of manifest.files) {
    assert(entry.file.startsWith('tools/rust-r4ghi/') && !entry.file.includes('..'));
    assert.equal(sha(fs.readFileSync(proposal.source + '/' + entry.candidate)), entry.afterSHA256);
    if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file));
    else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
  }
  if (proposal.archive) {
    const files = new Set(fs.readdirSync(proposal.source, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name));
    for (const entry of manifest.files) files.add(entry.candidate);
    for (const file of files) {
      const target = proposal.archive + '/' + file;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(proposal.source + '/' + file, target, fs.constants.COPYFILE_EXCL);
    }
  }
  for (const entry of manifest.files) fs.copyFileSync(proposal.source + '/' + entry.candidate, root + '/' + entry.file);
  receipts.push({ manifest: proposal.archive ? iRelative + '/' + proposal.manifest : path.relative(root, proposal.source + '/' + proposal.manifest).replaceAll('\\', '/'), rawBytesSha256: proposal.expected, files: manifest.files });
}
fs.writeFileSync(root + '/docs/design/rust-r4ghi/followup-tools80-promotion.json', JSON.stringify({ kind: 'Root-nonauthor-exact-I58-modern200-and-restatement78-mapping-tool-promotion', receipts, businessOrContractWritten: false, oldFailuresAndOriginalManifestsPreserved: true, HTTPExecuted: false, SQLExecuted: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotedCandidates: 2, modifiedBusinessHelper: 1, newReadbackTools: 2, HTTPExecuted: false, SQLExecuted: false }));
