import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', H = 'E:/projects/worktrees/poms-r4h-signals/poms';
const O = R + '/tools/rust-r4ghi/candidate-source-evidence119-120', sha = b => createHash('sha256').update(b).digest('hex');
const sources = [
  ['whole119-code02-manifest.json', I + '/tools/rust-r4ghi/I/implementation/source15-admission119-code02/sealed-code02/manifest119-code02.json', '37ac7622343defd6a4f2139de0170593e79ecb23ce31b1c331e467c2b0a74994'],
  ['H9-code02-manifest.json', H + '/tools/rust-r4ghi/H/implementation/support-patches/source15-policy-tax-readers-code02/manifest-H15-readers-code02.json', '6e67323c6b25ef8666ca8a860c43c4f265e679c322e6dbf180c2ae7a90f98883'],
  ['callers120-code02-manifest.json', I + '/tools/rust-r4ghi/I/implementation/source15-callers-code02/sealed-code02/manifest120-code02.json', '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a'],
  ['bounded-source-delivery-report.json', H + '/tools/rust-r4ghi/H/implementation/independent-technical119-code-scope01/report-code-delivery01.json', '1a12a21e2d29eeb202609709e52f8af84251bb48baccdc9fd9df236b6bdbc0c1'],
  ['bounded-source-delivery-manifest.json', H + '/tools/rust-r4ghi/H/implementation/independent-technical119-code-scope01/manifest-code-delivery01.json', 'ad264d45c915c8fc93d4fcf12d14336117a9d168f5a04069df63eaaf68081481'],
  ['exact-source-reconstruction.json', R + '/tmp/rust-r4ghi/root/candidate-source-index-proof01/git-source-reconstruction.json', '1109f2a90e341dbb9dd76a0fb359ef54fe19dd0905a5e03e84da16cd2facf10e'],
  ['Root-callers120-promotion-source-safety.json', I + '/tools/rust-r4ghi/I/independent-root-callers120-promotion-review01/review-callers120-promotion-source-safety01.json', 'e964fc46af11bfa5beb6bde8987ddcd5fe2afd4b0327df3b89f370b55b592d6d'],
];
assert(!fs.existsSync(O)); const known = sources.map(([name, file, h]) => { const b = fs.readFileSync(file); assert.equal(sha(b), h, file); JSON.parse(b); return { name, original: { file, bytes: b.length, rawBytesSha256: h }, b }; });
fs.mkdirSync(O); const copies = known.map(({ name, original, b }) => { const file = O + '/' + name; fs.writeFileSync(file, b, { flag: 'wx' }); assert.equal(sha(fs.readFileSync(file)), original.rawBytesSha256); return { original, copy: { file, bytes: b.length, rawBytesSha256: sha(b) }, rawByteIdentical: true }; });
const index = { kind: 'Root-retained-reviewed-candidate-source-evidence119-120', copies, originalScopesAndFailedLabelsUnchanged: true,
  codeSourceCandidateOnly: true, businessOperationsNewCertified: 0, businessG3: false, businessG4: false };
fs.writeFileSync(O + '/provenance.json', JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ copied: copies.length, rawByteIdentical: true, businessNewCertified: 0 }));
