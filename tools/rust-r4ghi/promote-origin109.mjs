import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linux = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/creator-origin28';
const author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + relative;
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const lp = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(author + '/manifest28.json'); assert.equal(sha(raw), '422955616382490b207473ac096875369329e7d2c1f935070bf00a6a29e2d824');
const manifest = JSON.parse(raw);
for (const pin of manifest.files) assert.equal(sha(fs.readFileSync(author + '/' + pin.file)), pin.rawBytesSha256);
for (const entry of manifest.products) {
  assert.equal(sha(fs.readFileSync(author + '/' + entry.candidate)), entry.afterSHA256);
  if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file)); else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
}
const oldLeaf = 'consumer12-promoted20-cookie104-01.json', oldBytes = fs.readFileSync(priv + '/' + oldLeaf);
assert.equal(sha(oldBytes), 'a22d70983d2d30fbfdda79865fb929f0d1b43778e6c122e716f6950baa558167');
const stateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01';
assert(!fs.existsSync(stateRoot + '/driver.lock'));
const state = JSON.parse(fs.readFileSync(stateRoot + '/state.json'));
assert.equal(state.blockedObservation.rawBytesSha256, '6474c401c5fd2f86c5646eca07fe95668d4051d4eda0a93c6572530e91d76b76'); assert(!state.activeFault);
const backup = root + '/tools/rust-r4ghi/checkpoints/origin109'; fs.mkdirSync(backup, { recursive: true });
for (const entry of manifest.products.filter(p => p.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + entry.file, backup + '/' + path.basename(entry.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const pin of [...manifest.files, { file: 'manifest28.json' }]) {
  const dest = root + '/' + relative + '/' + pin.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + pin.file, dest, fs.constants.COPYFILE_EXCL);
}
for (const entry of manifest.products) fs.copyFileSync(author + '/' + entry.candidate, root + '/' + entry.file);
const receiptPath = 'docs/design/rust-r4ghi/origin109-tool-promotion.json';
const receipt = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-exact-Origin28-tool-promotion', manifest: { file: relative + '/manifest28.json', rawBytesSha256: sha(raw) }, products: manifest.products,
  priorBackendCommitted: true, priorBrowserACK: 502, old04StillFailed: true, businessCommandsReplayed: 0, metadataRecoveryExecuted: false, productFilesChanged: false, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptPath, receipt, { flag: 'wx' });
const closure = JSON.parse(oldBytes), prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
for (const entry of closure.files) {
  const current = fs.readFileSync(root + '/' + prefix + entry.relativeFile), changed = manifest.products.find(p => p.file === prefix + entry.relativeFile);
  assert.equal(entry.rawBytesSha256, changed ? changed.beforeSHA256 : sha(current)); entry.bytes = current.length; entry.rawBytesSha256 = sha(current);
}
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) };
closure.correctionManifest = { file: linux + '/' + relative + '/manifest28.json', rawBytesSha256: sha(raw) };
closure.promotionReceipt = { file: linux + '/' + receiptPath, rawBytesSha256: sha(receipt) };
const leaf = 'consumer12-promoted20-origin109-01.json', bytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n');
fs.writeFileSync(priv + '/' + leaf, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ products: manifest.products.length, newClosure: { file: lp + '/' + leaf, rawBytesSha256: sha(bytes) }, metadataRecoveryExecuted: false, G3Certified: false }));
