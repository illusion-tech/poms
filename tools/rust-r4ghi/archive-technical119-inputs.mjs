// Archive frozen inputs by exact copies. Active attested paths keep their bytes.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', O = R + '/docs/design/archive/slices/rust-r4ghi-source15-119/frozen-inputs';
const sha = b => createHash('sha256').update(b).digest('hex');
const files = [
  ['source15-admission119-baseline.md', 'docs/design/rust-r4ghi/source15-admission119-baseline.md', 'c1037dc851858fc9ddbda8eaab091cdb192a1bc857a3081477f5ac0ace40934c'],
  ['source15-g0-119.json', 'docs/design/rust-r4ghi/source15-g0-119.json'],
  ['source15-g1-119.json', 'docs/design/rust-r4ghi/source15-g1-119.json'],
  ['Root-G1-source15-119.json', 'tools/rust-r4ghi/source15-admission119-g1/Root-G1-source15-119.json', 'b644c6b493e95126cfec32cf27624938bcaaf52b7c48c9813a93efa344018ffc'],
];
assert(!fs.existsSync(O));
const known = files.map(([name, relative, h]) => { const file = R + '/' + relative, b = fs.readFileSync(file); if (h) assert.equal(sha(b), h); return { name, original: { file, bytes: b.length, rawBytesSha256: sha(b) }, b }; });
fs.mkdirSync(O, { recursive: true });
const copies = known.map(({ name, original, b }) => { const file = O + '/' + name; fs.writeFileSync(file, b, { flag: 'wx' }); assert.equal(sha(fs.readFileSync(file)), original.rawBytesSha256); return { original, archived: { file, bytes: b.length, rawBytesSha256: sha(b) }, rawByteIdentical: true }; });
fs.writeFileSync(O + '/archive-provenance.json', JSON.stringify({ kind: 'Root-archived-frozen-Source15-119-inputs', copies,
  originalFrozenPathsRetainedForRuntimeCompatibility: true,
  reason: 'Active historical/native readers pin exact original paths and raw bytes and reject symlinks/hardlinks. Archive copies preserve the frozen inputs without changing live authority or old receipt identities.',
  taskStatusAuthority: 'GitHub issue119 and actual G3/G4 closeout; original G1 text keeps its original time label',
  actualG4PassedByThisCopy: false, businessNewCertified: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ archivedInputs: copies.length, rawByteIdentical: true, liveInputsModified: false, G4Granted: false }));
