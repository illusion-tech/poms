import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r4e-cost-base/poms', file = 'tools/rust-r4def/E/delivery04.json';
const hash = b => createHash('sha256').update(b).digest('hex'), raw = fs.readFileSync(root + '/' + file);
assert.equal(hash(raw), 'cf1fbb6bdc3def8ea606d40b2c33e232e844c5ac66ab8ee34ea4bb417d92ed77');
const old = JSON.parse(fs.readFileSync('tools/rust-r4def/E/delivery01.json')), current = JSON.parse(raw);
for (const p of current.productFiles) {
    assert(p.file.startsWith('apps/poms-api-rust/src/project_actual_cost/')); const previous = old.productFiles.find(v => v.file === p.file); assert(previous);
    assert.equal(hash(fs.readFileSync(p.file)), previous.rawBytesSha256, 'Do not overwrite an unrecorded Root fix'); const b = fs.readFileSync(root + '/' + p.file); assert.equal(hash(b), p.rawBytesSha256); fs.writeFileSync(p.file, b);
}
for (const p of current.supportFiles) {
    assert(p.file.startsWith('tools/rust-r4def/E/')); const b = fs.readFileSync(root + '/' + p.file); assert.equal(hash(b), p.rawBytesSha256); fs.mkdirSync(path.dirname(p.file), { recursive: true });
    if (fs.existsSync(p.file)) assert(fs.readFileSync(p.file).equals(b), 'Never rewrite previous evidence'); else fs.writeFileSync(p.file, b, { flag: 'wx' });
}
fs.writeFileSync(file, raw, { flag: 'wx' }); console.log(JSON.stringify({ E04Imported: true, old01And03Preserved: true, newProducerSha: hash(fs.readFileSync('apps/poms-api-rust/src/project_actual_cost/mod.rs')) }));
