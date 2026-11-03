import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const source = 'E:/projects/worktrees/poms-r4a-readiness/poms/tmp/rust-r4abc/enum-export-candidate01';
const out = 'docs/design/rust-r4abc/g2-enum-tool06';
const sha = b => createHash('sha256').update(b).digest('hex');
const manifestBytes = fs.readFileSync(source + '/manifest01.json');
assert.equal(sha(manifestBytes), 'b35e09c33cbaca75c268f0ad77ddd8f9a61167d8804b15000ecf50778427749a');
assert(!fs.existsSync(out));
const manifest = JSON.parse(manifestBytes);
const checked = manifest.products.map(p => {
 const before = fs.readFileSync(p.path), next = fs.readFileSync(source + '/' + p.candidatePath);
 assert.equal(sha(before), p.baseSha256, p.path + ' base');
 assert.equal(sha(next), p.newSha256, p.path + ' candidate');
 return { ...p, before, next };
});
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/author-manifest01.json.bin', manifestBytes, { flag: 'wx' });
for (const p of checked) {
 const raw = out + '/author/' + p.path + '.bin';
 fs.mkdirSync(path.dirname(raw), { recursive: true });
 fs.writeFileSync(raw, p.next, { flag: 'wx' });
 fs.writeFileSync(p.path, p.next);
}
for (const p of manifest.artifacts) {
 const b = fs.readFileSync(source + '/' + p.path); assert.equal(sha(b), p.sha256);
 fs.writeFileSync(out + '/' + p.path + '.bin', b, { flag: 'wx' });
}
const log = 'tmp/rust-r4abc/root/shared-enum-export05'; assert(!fs.existsSync(log)); fs.mkdirSync(log, { recursive: true });
const commands = [];
for (const [label, args] of [['write', ['tools/rust-r1b/export-shared.mjs', '--write']], ['check', ['tools/rust-r1b/export-shared.mjs', '--check']], ['tests', ['--test', 'tools/rust-r1b/export-shared.test.mjs']]]) {
 const r = spawnSync(process.execPath, args, { encoding: null, windowsHide: true, timeout: 180000, maxBuffer: 16000000 });
 for (const stream of ['stdout', 'stderr']) fs.writeFileSync(log + '/' + label + '-' + stream + '-original.bin', r[stream] || Buffer.alloc(0), { flag: 'wx' });
 commands.push({ label, args, exitCode: r.status, error: r.error?.name ?? null });
 fs.writeFileSync(log + '/progress.json', JSON.stringify({ commands }, null, 2) + '\n');
 assert.equal(r.status, 0, label + ' failed; see retained original streams');
}
const outputs = ['tools/rust-r1b/shared-manifest.json', 'apps/poms-api-rust/src/shared/generated.rs', 'apps/poms-api-rust/tests/shared_generated.rs'].map(file => ({ file, sha256: sha(fs.readFileSync(file)), bytes: fs.statSync(file).size }));
const report = { author: manifest.author, sourceHead: manifest.sourceHead, products: manifest.products, commands, outputs, runtimeAccepted: false };
fs.writeFileSync(log + '/receipt05.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + '/import01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ oneWayWriteCheckAndTests: true, outputs, runtimeAccepted: false }));
