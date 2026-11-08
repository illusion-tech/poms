import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', relative = 'tools/rust-r4ghi/I/implementation/native-modern-reference92';
const author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms/' + relative, sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(author + '/manifest92.json'); assert.equal(sha(raw), '69df6fde97930bd03926c6ec74d2ff28587044d153e0739885dbfd6492303a3e');
const manifest = JSON.parse(raw);
for (const pin of manifest.files) assert.equal(sha(fs.readFileSync(author + '/' + pin.file)), pin.rawBytesSha256);
for (const product of manifest.products) { assert.equal(product.beforeSHA256, null); assert(!fs.existsSync(root + '/' + product.file)); assert.equal(sha(fs.readFileSync(author + '/' + product.candidate)), product.afterSHA256); }
assert(!fs.existsSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
for (const pin of [...manifest.files, { file: 'manifest92.json' }]) { const dest = root + '/' + relative + '/' + pin.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + pin.file, dest, fs.constants.COPYFILE_EXCL); }
for (const product of manifest.products) fs.copyFileSync(author + '/' + product.candidate, root + '/' + product.file, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(root + '/docs/design/rust-r4ghi/native111-tool-promotion.json', JSON.stringify({ kind: 'Root-nonauthor-reviewed-Native92-tool-promotion', manifest: { file: relative + '/manifest92.json', rawBytesSha256: sha(raw) }, products: manifest.products,
  pureRegressionPassed: 12, actualNativeHTTP: 0, nativeProcessStarted: false, RootStateChanged: false, productChanged: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotedProducts: 4, actualNativeHTTP: 0, processStarted: false }));
