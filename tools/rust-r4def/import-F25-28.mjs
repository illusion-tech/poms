import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r4f-cost-governance/poms', file = 'tools/rust-r4def/F/delivery25.json';
const hash = b => createHash('sha256').update(b).digest('hex'), raw = fs.readFileSync(root + '/' + file);
assert.equal(hash(raw), 'd8133264f1d0a266d51bcf6cfaea6ffd15ead1259815d9e26c20748d1f7cba1f');
const old = JSON.parse(fs.readFileSync('tools/rust-r4def/F/delivery01.json')), current = JSON.parse(raw);
for (const p of current.productFiles) {
    assert(p.file.startsWith('apps/poms-api-rust/src/project_cost_governance/')); const previous = old.productFiles.find(v => v.file === p.file); assert(previous);
    assert.equal(hash(fs.readFileSync(p.file)), previous.rawBytesSha256, 'Do not overwrite an unrecorded Root edit'); const b = fs.readFileSync(root + '/' + p.file); assert.equal(hash(b), p.rawBytesSha256); fs.writeFileSync(p.file, b);
}
for (const p of current.supportFiles) {
    assert(p.file.startsWith('tools/rust-r4def/F/')); const b = fs.readFileSync(root + '/' + p.file); assert.equal(hash(b), p.rawBytesSha256); fs.mkdirSync(path.dirname(p.file), { recursive: true });
    if (fs.existsSync(p.file)) assert(fs.readFileSync(p.file).equals(b), 'Never rewrite previous evidence'); else fs.writeFileSync(p.file, b, { flag: 'wx' });
}
fs.writeFileSync(file, raw, { flag: 'wx' });
const E = 'E:/projects/worktrees/poms-r4e-cost-base/poms';
for (const [name, expected] of [['api-acceptance-vectors21.mjs', '5de6abde2e0ded2795b396d637514c5a51c7eb14e05decd77ae204b4e3f537a8'], ['API-ACCEPTANCE-VECTORS21.md', '0d9aaabffcb57f72e600c0791ee08c1a841a1be1777ccde9b31429b03b220b14']]) {
    const p = 'tools/rust-r4def/E/' + name, b = fs.readFileSync(E + '/' + p); assert.equal(hash(b), expected); assert(!fs.existsSync(p)); fs.writeFileSync(p, b, { flag: 'wx' });
}
console.log(JSON.stringify({ F25Imported: true, oldF01Preserved: true, EApiDriverImported: true, runtimeCertified: false }));
