import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linux = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/', rel = prefix + 'creator-readback29';
const authorRoot = 'E:/projects/worktrees/poms-r4h-signals/poms', author = authorRoot + '/' + rel;
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14', lp = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length, 6); assert.equal(process.argv[2], '--native-conservation'); assert.equal(process.argv[4], '--approved-sha');
const nativeBytes = fs.readFileSync(process.argv[3]); assert.equal(sha(nativeBytes), process.argv[5]);
const native = JSON.parse(nativeBytes); assert.equal(native.allOriginalRowsXminCatalogSequencesObjectsEqualS0, true); assert.equal(native.RustStateWritten, false); assert.equal(native.HTTPRequestsSent, 0);
assert(!fs.existsSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
const raw = fs.readFileSync(author + '/manifest29.json'); assert.equal(sha(raw), '2206c4e1372c79b72960be369e57fc3236525b50eca529b6f542b4a5d08a789c'); const m = JSON.parse(raw);
for (const p of m.files) assert.equal(sha(fs.readFileSync(author + '/' + p.file)), p.rawBytesSha256);
for (const p of m.products) { assert.equal(sha(fs.readFileSync(author + '/' + p.candidate)), p.afterSHA256); if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.file)); else assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); }
const oldLeaf = 'consumer12-promoted20-origin109-01.json', oldBytes = fs.readFileSync(priv + '/' + oldLeaf); assert.equal(sha(oldBytes), '71961dfb0065416500c494943acf07dc86403b6943daba17d72eb03443ea6f07');
const backup = root + '/tools/rust-r4ghi/checkpoints/readback119'; fs.mkdirSync(backup, { recursive: true });
for (const p of m.products.filter(p => p.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const p of [...m.files, { file: 'manifest29.json' }]) { const dest = root + '/' + rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
for (const p of m.products) fs.copyFileSync(author + '/' + p.candidate, root + '/' + p.file);
const inputRel = prefix + 'ui05-input30', inputDir = authorRoot + '/' + inputRel, inputManifestBytes = fs.readFileSync(inputDir + '/manifest30.json');
assert.equal(sha(inputManifestBytes), '43c854ffff7b5a57d38dc4942ede50456932366c352005944dd4c5da9ff87b42');
for (const p of [...JSON.parse(inputManifestBytes).files, { file: 'manifest30.json', rawBytesSha256: sha(inputManifestBytes) }]) { const b = fs.readFileSync(inputDir + '/' + p.file); assert.equal(sha(b), p.rawBytesSha256); const dest = root + '/' + inputRel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b, { flag: 'wx' }); }
const receiptPath = 'docs/design/rust-r4ghi/readback119-tool-promotion.json';
const receipt = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-Creator-readonly-reload29-promotion', manifest: { file: rel + '/manifest29.json', rawBytesSha256: sha(raw) }, products: m.products,
  nativeConservation: { file: process.argv[3].replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(nativeBytes) }, creatorAssignmentReplayed: false, original04StillFailed: true, UI05Executed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptPath, receipt, { flag: 'wx' });
const closure = JSON.parse(oldBytes);
for (const e of closure.files) { const b = fs.readFileSync(root + '/' + prefix + e.relativeFile), changed = m.products.find(p => p.file === prefix + e.relativeFile); assert.equal(e.rawBytesSha256, changed ? changed.beforeSHA256 : sha(b)); e.bytes = b.length; e.rawBytesSha256 = sha(b); }
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifest = { file: linux + '/' + rel + '/manifest29.json', rawBytesSha256: sha(raw) }; closure.promotionReceipt = { file: linux + '/' + receiptPath, rawBytesSha256: sha(receipt) };
const leaf = 'consumer12-promoted20-readback119-01.json', bytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n'); fs.writeFileSync(priv + '/' + leaf, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ products: 6, closure: { file: lp + '/' + leaf, rawBytesSha256: sha(bytes) }, old04StillFailed: true, UIExecuted: false }));
