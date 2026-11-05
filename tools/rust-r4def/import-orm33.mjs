import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const from = 'E:/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/orm-mapping28';
const to = 'tools/rust-r4def/F/orm-mapping28';
const hash = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(from + '/delivery28.json');
assert.equal(hash(raw), '59c1c12f53d4a949d66dde38bbfc5cbbb0f39133baef45b4dbcd187f6009b92e');
const delivery = JSON.parse(raw);
for (const f of delivery.candidateFiles) {
  assert(f.target.startsWith('apps/poms-api/src/app/features/') && f.target.endsWith('.entity.ts'));
  if (f.sourceBeforeSha256 === null) assert(!fs.existsSync(f.target));
  else assert.equal(hash(fs.readFileSync(f.target)), f.sourceBeforeSha256, f.target + ': unrecorded Root changes');
  const b = fs.readFileSync(from + '/' + f.candidate); assert.equal(hash(b), f.candidateSha256);
}
function preserve(relative = '') {
  for (const entry of fs.readdirSync(from + '/' + relative, { withFileTypes: true })) {
    const p = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) preserve(p);
    else { const b = fs.readFileSync(from + '/' + p); fs.mkdirSync(path.dirname(to + '/' + p), { recursive: true });
      if (fs.existsSync(to + '/' + p)) assert(fs.readFileSync(to + '/' + p).equals(b));
      else fs.writeFileSync(to + '/' + p, b, { flag: 'wx' }); }
  }
}
preserve();
for (const f of delivery.candidateFiles) { fs.mkdirSync(path.dirname(f.target), { recursive: true }); fs.writeFileSync(f.target, fs.readFileSync(from + '/' + f.candidate)); }
console.log(JSON.stringify({ imported: delivery.candidateFiles.length, originalEvidencePreserved: true, databaseCertified: false }));
