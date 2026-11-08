import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const [directory, manifestLeaf, approvedSHA] = process.argv.slice(2); assert.equal(process.argv.length, 5); assert(/^[a-z0-9-]+$/.test(directory));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', rel = 'tools/rust-r4ghi/H/implementation/support-patches/' + directory, source = 'E:/projects/worktrees/poms-r4h-signals/poms/' + rel, sha = value => createHash('sha256').update(value).digest('hex');
const raw = fs.readFileSync(source + '/' + manifestLeaf); assert.equal(sha(raw), approvedSHA); const m = JSON.parse(raw);
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private'; assert(!fs.existsSync(priv + '/business/g2-business13/main01/state.json')); assert(!fs.existsSync(priv + '/business/g2-business12/main01/driver.lock'));
const stateFile = priv + '/business/g2-business12/main01/state.json', oldState = fs.readFileSync(stateFile); assert(JSON.parse(oldState).retention139);
for (const p of m.files) assert.equal(sha(fs.readFileSync(source + '/' + p.file)), p.rawBytesSha256);
for (const p of m.products) { if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.file)); else assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); assert.equal(sha(fs.readFileSync(source + '/' + p.candidate)), p.afterSHA256); }
const backup = root + '/tools/rust-r4ghi/checkpoints/source13-h178/' + directory; fs.mkdirSync(backup, { recursive: true });
for (const p of m.products.filter(p => p.beforeSHA256 !== null)) { const file = backup + '/' + p.file + '.before.bin'; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(root + '/' + p.file, file, fs.constants.COPYFILE_EXCL); }
for (const p of [...m.files, { file: manifestLeaf }]) { const dest = root + '/' + rel + '/' + p.file, bytes = fs.readFileSync(source + '/' + p.file); fs.mkdirSync(path.dirname(dest), { recursive: true }); if (fs.existsSync(dest)) assert.deepEqual(fs.readFileSync(dest), bytes); else fs.writeFileSync(dest, bytes, { flag: 'wx' }); }
for (const p of m.products) { const file = root + '/' + p.file; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(source + '/' + p.candidate, file); }
const receiptFile = root + '/docs/design/rust-r4ghi/' + directory + '-promotion178.json', receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-pre-H0-Source13-exact-H-tool-staging178', manifest: { file: rel + '/' + manifestLeaf, rawBytesSha256: approvedSHA }, products: m.products,
  Source13StateMinted: false, finalH0Frozen: false, runtimeInputsFilled: false, M98Executed: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(receiptFile, receiptBytes, { flag: 'wx' });
assert.deepEqual(fs.readFileSync(stateFile), oldState);
console.log(JSON.stringify({ stagedTools: m.products.length, helperCount: fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, receipt: { file: receiptFile, rawBytesSha256: sha(receiptBytes) }, M98Executed: false, Source13StateMinted: false }));
