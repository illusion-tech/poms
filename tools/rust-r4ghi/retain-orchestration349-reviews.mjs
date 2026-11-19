// Exact raw copies of non-author source reviews; original identities are retained.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', H = 'E:/projects/worktrees/poms-r4h-signals/poms';
const O = R + '/tools/rust-r4ghi/root119-orchestration-reviews349';
const sha = b => createHash('sha256').update(b).digest('hex');
const entries = [
  ['bind-source-interface.json', I + '/tools/rust-r4ghi/I/independent-root-bind119-interface-review01/review-bind119-source-interface01.json', '4a75ba1cbfdcd79d2614ffd5db57d4ba594764e469b771354b76d50b480169ee'],
  ['startplan-source-interface.json', I + '/tools/rust-r4ghi/I/independent-root-startplan119-interface-review01/review-startplan119-source-interface01.json', '688c21dd6c5ac4d4d10f4c081e5d80a23a537b9bde197491f63caf9b01c14e05'],
  ['five-wrappers-source-interface.json', H + '/tools/rust-r4ghi/H/implementation/independent-root119-orchestration-review01/review119-wrappers01.json', '200ece7f262e5fbb949aa37a9d17ea46f43fe4a984bb28938a68135e0b9b2b8f'],
  ['final-preparation-source-interface.json', H + '/tools/rust-r4ghi/H/implementation/independent-root-final119-preparation-review01/review-final119-preparation01.json', '51b6fd49ea059c14bf66d9e2cff0d73741e14273986aae9a60b71336df1a1412'],
];
assert(!fs.existsSync(O));
const known = entries.map(([name, file, hash]) => {
  const b = fs.readFileSync(file); assert.equal(sha(b), hash); JSON.parse(b);
  return { name, original: { file, bytes: b.length, rawBytesSha256: hash }, b };
});
fs.mkdirSync(O);
const copies = known.map(({ name, original, b }) => {
  const file = O + '/' + name; fs.writeFileSync(file, b, { flag: 'wx' }); assert.equal(sha(fs.readFileSync(file)), original.rawBytesSha256);
  return { original, copy: { file, bytes: b.length, rawBytesSha256: original.rawBytesSha256 }, rawByteIdentical: true };
});
fs.writeFileSync(O + '/provenance.json', JSON.stringify({ kind: 'Root-retained-exact-non-author-orchestration-source-reviews349', copies, originalReviewScopeUnchanged: true, actualModeAdmission: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ copies: copies.length, rawByteIdentical: true, actualModeAdmission: false }));
