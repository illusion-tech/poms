import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const leaves = [
  ['apps/poms-api-rust/src/project_operating/restatement.rs', '7251664a65dd189b38ea9349ba6e54b8a2ea84ca307d128e3b01f29ba446890c'],
  ['apps/poms-api-rust/src/project_operating/context.rs', 'f0b18b53af2d3288a7b4078f15280a23cc8821a1d2792519733f64d935aaa0ac'],
  ['apps/poms-api-rust/src/project_operating/late_allocation.rs', 'f7c628545b0ec9822f680d5a6538d54c2ad7d24b944a2d9a84a96179b44e3170'],
  ['apps/poms-api-rust/src/project_operating/preparation.rs', 'a8f6b4aee081458836b38100036b54566b2aa9ac18fc3aa25423433285c4eef8'],
  ['apps/poms-api-rust/src/project_operating/inclusion.rs', '683bb9a82d27ce4de78b3ac62fc9906f3d891718c0eb8289c078b474525cd16d'],
  ['apps/poms-api-rust/src/project_operating/store.rs', '10144498fdf21b68dcddd8b543c6196919a1da3762a40fe4f0d7dc147c2d218a'],
  ['docs/design/rust-r4ghi/tax-preparation344-corrective-checkpoint.md', '4dc6dfa1a697c0e17e471917b6f606c5687c42b7f15a56f3517a9b9c1e35e673'],
];
function read(relative, expected) {
  const file = path.resolve(root, relative);
  const st = fs.lstatSync(file);
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1, relative);
  assert.equal(fs.realpathSync.native(file).toLowerCase(), file.toLowerCase());
  const bytes = fs.readFileSync(file);
  assert.equal(hash(bytes), expected, relative);
  return { file: file.replaceAll('\\', '/'), rawBytesSha256: expected, bytes: bytes.length };
}
const inputs = leaves.map(([relative, expected]) => ({ relative, ...read(relative, expected) }));
const text = relative => fs.readFileSync(path.resolve(root, relative), 'utf8');
const restatement = text(leaves[0][0]);
const context = text(leaves[1][0]);
const late = text(leaves[2][0]);
const preparation = text(leaves[3][0]);
assert.equal((restatement.match(/inferred_late_roots\(session, snapshot, &catalog\)/g) ?? []).length, 1);
assert(restatement.indexOf('roots.extend_from_slice(selected)') > restatement.indexOf('inferred_late_roots(session, snapshot, &catalog)'));
assert(context.includes('if members.is_empty() {\n        return Ok(false);') || context.includes('if members.is_empty() {\r\n        return Ok(false);'));
assert(context.includes('Timing::Restatement => {}'));
assert(late.includes('Qualification::FutureBusiness'));
assert(preparation.includes('knowledge_cutoff: now,'));
const witness = {
  kind: 'read-only-two-leaf-corrective-plan344',
  status: 'proposal-only-awaiting-Root-and-independent-scope-confirmation',
  inputs,
  proposedProductFiles: leaves.slice(0, 2).map(([file, beforeRawBytesSha256]) => ({ file, beforeRawBytesSha256, afterRawBytesSha256: null, candidate: null })),
  qualificationReuse: { admissionForAllInWindowRestatements: false, positiveProofForWholeFutureExclusionOnly: true, RootAcceptance: null },
  actual: { source15: null, targetInventory: null, tests: null, implementationAuthorized: false, productionFilesWritten: false, RootStateWritten: false, SQLHTTPOrServiceEffects: false, G3: false, G4: false },
};
fs.writeFileSync(path.join(out, 'source-witness344.json'), JSON.stringify(witness, null, 2) + '\n', { flag: 'wx' });
for (const [relative, expected] of leaves) read(relative, expected);
const products = ['PLAN344.md', 'seal-plan344.mjs', 'source-witness344.json'].map(name => {
  const file = path.join(out, name), bytes = fs.readFileSync(file);
  return { file: file.replaceAll('\\', '/'), bytes: bytes.length, rawBytesSha256: hash(bytes) };
});
const manifest = { kind: 'H-author-read-only-minimal-corrective-scheme344', edition: 'plan01', products, productionCandidates: [], implementationGranted: false, actualEffects: false, independentReview: null };
const target = path.join(out, 'manifest-plan344.json');
fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: target.replaceAll('\\', '/'), rawBytesSha256: hash(fs.readFileSync(target)), products: products.length, sourceFilesVerified: inputs.length, implementationGranted: false, actualEffects: false }));
