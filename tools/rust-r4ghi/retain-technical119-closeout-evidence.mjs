// Copies report metadata only; raw private state, cookies and env files stay private.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', H = 'E:/projects/worktrees/poms-r4h-signals/poms';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O = R + '/docs/design/archive/slices/rust-r4ghi-source15-119/evidence';
const sha = b => createHash('sha256').update(b).digest('hex');
const inputs = [
  ['actual-technical-runtime-G3.json', R + '/tools/rust-r4ghi/independent/final-gates13/actual15-technical-publication119-readback01/review-actual-technical-publication119.json', '8308018883de481f9abfc3e6d2a2a403d4bfdc1a51252d7c97ff878fb7798dae'],
  ['final-scope-B0-review.json', R + '/tools/rust-r4ghi/independent/final-gates13/final15-scope-B0-review119-01/review-final15-scope-B0-119.json', '66e479fd013f49bfb2221d7d5e7370a4016aac3861d1486c81e7f9d16d656561'],
  ['capture-capability-supplement.json', R + '/tools/rust-r4ghi/independent/final-gates13/capture-code-readiness-append119-01/review-capture-capability-append119.json', '42e404cba5c65ddfd0320525bcd424239e573b2302c4a6a1a3d01f92ab460b97'],
  ['actual-cold-data-readback.json', H + '/tools/rust-r4ghi/H/implementation/independent-observe02-actual-readback119-01/review-actual-observe02-119.json', '766524fac8b68f9287cd48dd076e81a90fd2ed2336ec43348cd1252d16bf7db7'],
  ['initial-state-private-mapping.json', P + '/source15-initial-state-retained119-01/retained-initial15-mapping.json', 'ad81bc5848415c6a38b5afd95186b73ad98fd367cc5a98ea12dc04ac583f7f7e'],
  ['actual-publication-original.json', P + '/business/g2-business15/main01/publication119-d9c7686b-cb40-4744-889b-7ebb0f8bafde.json', 'a9bb04cf275c9734536a5360324a9fddc0a3c4ce871fd7201c04bfd97a9debdb'],
  ['prepare118-source01-NOTREADY.json', I + '/tools/rust-r4ghi/I/independent-root-prepare118-input-review01/review-prepare-input118-source01.json', '643df4f3b80139212bb8b38c5fb3d164b3409090dcb0fb3b664fe132d0f7444a'],
  ['prepare118-source02-readiness.json', I + '/tools/rust-r4ghi/I/independent-root-prepare118-input-review01/review-prepare-input118-source02.json', '2076853459ad4199799b0909c4b13f229c28b7e529c470b3b2166666641190db'],
  ['actor-permissions-extractor-source-review.json', I + '/tools/rust-r4ghi/I/independent-root-actor-permissions118-review01/review-derive-permissions118-source01.json', 'cfeec1728eb6cf0ba20d88a1d52a1cd31b7f55c8a5394dbd399eff1cdcc389fa'],
];
assert(!fs.existsSync(O)); const prepared = inputs.map(([name, file, hash]) => { const b = fs.readFileSync(file); assert.equal(sha(b), hash, file); JSON.parse(b); return { name, b, original: { file, bytes: b.length, rawBytesSha256: hash } }; });
fs.mkdirSync(O); const copies = prepared.map(({ name, b, original }) => { const file = O + '/' + name; fs.writeFileSync(file, b, { flag: 'wx' }); assert.equal(sha(fs.readFileSync(file)), original.rawBytesSha256); return { original, copy: { file, bytes: b.length, rawBytesSha256: sha(b) }, rawByteIdentical: true }; });
fs.writeFileSync(O + '/provenance-before-code-G4.json', JSON.stringify({ kind: 'Root-retained-technical119-report-evidence', copies,
  originalScopeLabelsUnchanged: true, initialMutableStateMustBeReadThroughRecordedImmutableMapping: true,
  sourceCodeG4PendingAtCopy: true, prepareExecutionAuthorizedByThisCopy: false, businessG3: false, businessG4: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ copiedReports: copies.length, privateStateAndSecretsCopied: false, executionGranted: false }));
