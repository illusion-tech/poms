// Root-owned contract files only. Never overwrite D's implementation/UI paths.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const destination = 'E:/projects/worktrees/poms-r4d-handover/poms';
const files = ['libs/shared/contracts/src/lib/shared-contracts.ts', 'libs/shared/api-spec/openapi.json'];
function list(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const file = `${dir}/${e.name}`; assert(!e.isSymbolicLink()); if (e.isDirectory()) list(file); else if (e.isFile()) files.push(file); } }
list('libs/shared/api-client');
const copied = [];
for (const file of files) {
    assert(file.startsWith('libs/shared/')); const raw = fs.readFileSync(file), to = destination + '/' + file; fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, raw);
    const sha256 = createHash('sha256').update(raw).digest('hex'); assert.equal(createHash('sha256').update(fs.readFileSync(to)).digest('hex'), sha256); copied.push({ file, bytes: raw.length, sha256 });
}
fs.mkdirSync('tmp/rust-r4def/root/D-contract-sync25', { recursive: true }); fs.writeFileSync('tmp/rust-r4def/root/D-contract-sync25/receipt25.json', JSON.stringify({ destination, copied, generatorSourceHead: '4f0ad88e78622a75b88b4e3cc72aded9da67458a', handEditedClient: false }, null, 2) + '\n');
console.log(JSON.stringify({ copied: copied.length, clientFiles: copied.length - 2, DProductPathsChanged: false }));
