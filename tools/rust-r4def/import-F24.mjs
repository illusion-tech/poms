import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r4f-cost-governance/poms';
const manifestFile = 'tools/rust-r4def/F/delivery01.json', bytes = fs.readFileSync(root + '/' + manifestFile);
const hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes), 'e1a95fe65978ec9b7a28336065d47e9b6f44f65d5d32fe1e6fc640eb534e1c8a');
const m = JSON.parse(bytes); assert.equal(m.baseCommit, '756d813c9578090fcf8e56821acce01b46b40420');
for (const p of [...m.productFiles, ...m.supportFiles]) {
    assert(p.file.startsWith('apps/poms-api-rust/src/project_cost_governance/') || p.file.startsWith('tools/rust-r4def/F/'));
    const from = root + '/' + p.file; assert(fs.lstatSync(from).isFile()); const raw = fs.readFileSync(from); assert.equal(raw.length, p.bytes); assert.equal(hash(raw), p.rawBytesSha256);
    assert(!fs.existsSync(p.file), `Existing Root file ${p.file}`); fs.mkdirSync(path.dirname(p.file), { recursive: true }); fs.writeFileSync(p.file, raw, { flag: 'wx' }); assert.equal(hash(fs.readFileSync(p.file)), p.rawBytesSha256);
}
fs.writeFileSync(manifestFile, bytes, { flag: 'wx' });
console.log(JSON.stringify({ FProductFiles: m.productFiles.length, support: m.supportFiles.length, RootScaffoldingImported: false }));
