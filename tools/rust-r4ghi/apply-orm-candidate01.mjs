// Apply exact reviewed candidate bytes only over their registered original.
// The original Windows diff is retained; it is not rewritten for LF matching.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const base = root + '/tools/rust-r4ghi/H/implementation/support-patches/orm-g2';
const manifestPath = base + '/orm-candidate-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(fs.readFileSync(manifestPath)), 'ca5e78a36158e8c54dce2a29b6f62c0e09e4d95c2db535fc11553bc552a7e267');
const inputs = [];
for (const file of manifest.files) {
  assert(file.path.startsWith('apps/poms-api/src/app/features/') && !file.path.split('/').includes('..'));
  const current = root + '/' + file.path, proposed = base + '/proposed/' + file.path;
  const bytes = fs.readFileSync(proposed); assert.equal(sha(bytes), file.sha256);
  if (file.originalSha256) assert.equal(sha(fs.readFileSync(current)), file.originalSha256, 'Original mapping differs: ' + file.path);
  else assert(!fs.existsSync(current), 'New mapping already exists: ' + file.path);
  inputs.push({ ...file, bytes });
}
for (const input of inputs) { const target = root + '/' + input.path; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, input.bytes); }
const receipt = { kind: 'actual-Root-ORM-source-promotion', capturedAt: new Date().toISOString(), manifestSHA256: sha(fs.readFileSync(manifestPath)), files: inputs.map(({ bytes, ...entry }) => entry), exactOriginalBytesVerified: true, newTables: 19, actualDatabaseCompared: false, acceptancePassed: false };
fs.writeFileSync(root + '/docs/design/rust-r4ghi/orm-promotion01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: inputs.length, exactOriginalBytesVerified: true, databaseCompared: false }));
