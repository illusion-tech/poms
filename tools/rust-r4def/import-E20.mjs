// Import only the exact stable E whitelist, never the author's Root-owned scaffolding.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const source = 'E:/projects/worktrees/poms-r4e-cost-base/poms';
const deliveryFile = 'tools/rust-r4def/E/delivery01.json'; const raw = fs.readFileSync(source + '/' + deliveryFile);
assert.equal(createHash('sha256').update(raw).digest('hex'), '82085386663c5ce16cef4c0558220e9d98e0b4bbef980d165415cce21943f228');
const delivery = JSON.parse(raw); assert.equal(delivery.base, '756d813c9578090fcf8e56821acce01b46b40420');
const files = [...delivery.productFiles, ...delivery.supportFiles];
for (const entry of files) {
    assert(entry.file.startsWith('apps/poms-api-rust/src/project_actual_cost/') || entry.file.startsWith('tools/rust-r4def/E/'));
    const from = source + '/' + entry.file; assert(fs.lstatSync(from).isFile()); const bytes = fs.readFileSync(from);
    assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.rawBytesSha256);
    assert(!fs.existsSync(entry.file), `Do not overwrite a Root integration edit: ${entry.file}`);
    fs.mkdirSync(path.dirname(entry.file), { recursive: true }); fs.writeFileSync(entry.file, bytes, { flag: 'wx' });
    assert.equal(createHash('sha256').update(fs.readFileSync(entry.file)).digest('hex'), entry.rawBytesSha256);
}
fs.writeFileSync(deliveryFile, raw, { flag: 'wx' });
const out = 'tmp/rust-r4def/root/E-import20'; fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/receipt20.json', JSON.stringify({ source, base: delivery.base, productFiles: delivery.productFiles, supportFiles: delivery.supportFiles.length, RootScaffoldingImported: false, tests: 'author pure/type checks only; no DB/HTTP/UI/G3/G4 certification' }, null, 2) + '\n');
console.log(JSON.stringify({ product: delivery.productFiles.length, support: delivery.supportFiles.length, bytesVerified: true }));
