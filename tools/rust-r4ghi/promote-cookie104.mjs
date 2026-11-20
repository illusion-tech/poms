import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/proxy-error27';
const author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + relative;
const privateWindows = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const privateLinux = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(author + '/manifest27.json'); assert.equal(sha(bytes), '2dd99b8011bf5524eedf5c024ee1aa482e2f7c2c002137da8512812219f4899d'); const manifest = JSON.parse(bytes);
for (const pin of manifest.files) assert.equal(sha(fs.readFileSync(author + '/' + pin.file)), pin.rawBytesSha256);
for (const entry of manifest.products) {
  assert.equal(sha(fs.readFileSync(author + '/' + entry.candidate)), entry.afterSHA256);
  if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file)); else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
}
const oldClosureBytes = fs.readFileSync(privateWindows + '/consumer12-promoted20-81-01.json'); assert.equal(sha(oldClosureBytes), '3708e52876ab3d714e594a1af0a68b518c1042ab6634f910e20a0719e0f7eda5');
const backup = root + '/tools/rust-r4ghi/checkpoints/cookie104'; fs.mkdirSync(backup, { recursive: true });
for (const entry of manifest.products.filter(entry => entry.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + entry.file, backup + '/' + path.basename(entry.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const pin of [...manifest.files, { file: 'manifest27.json' }]) { const target = root + '/' + relative + '/' + pin.file; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(author + '/' + pin.file, target, fs.constants.COPYFILE_EXCL); }
for (const entry of manifest.products) fs.copyFileSync(author + '/' + entry.candidate, root + '/' + entry.file);
assert.equal(fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, 159);
const receiptRelative = 'docs/design/rust-r4ghi/cookie104-tool-promotion.json';
const receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-nonauthor-exact-real-cookie-scope-tool27-promotion', manifest: { file: relative + '/manifest27.json', rawBytesSha256: sha(bytes) }, products: manifest.products,
  actual03Boundary: { upstreamAuthAndCSRF200: 24, preForwardDuplicateCookieGETs: 30, businessPOSTPUT: 0 }, oldRunsAndDuplicateGuardPreserved: true,
  backendOrLinuxOrBusinessBrowserCasesChanged: false, actualBusinessHelpers: 159, scopeProofStillRequiresExplicitRootPreparation: true, HTTPExecuted: false, G3Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptRelative, receiptBytes, { flag: 'wx' });
const closure = JSON.parse(oldClosureBytes), prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
for (const entry of closure.files) {
  const current = fs.readFileSync(root + '/' + prefix + entry.relativeFile), changed = manifest.products.find(value => value.file === prefix + entry.relativeFile);
  if (changed) assert.equal(entry.rawBytesSha256, changed.beforeSHA256); else assert.equal(sha(current), entry.rawBytesSha256);
  entry.bytes = current.length; entry.rawBytesSha256 = sha(current);
}
closure.priorCorrectiveClosure = { file: privateLinux + '/consumer12-promoted20-81-01.json', rawBytesSha256: sha(oldClosureBytes) };
closure.correctionManifest = { file: linuxRoot + '/' + relative + '/manifest27.json', rawBytesSha256: sha(bytes) };
closure.promotionReceipt = { file: linuxRoot + '/' + receiptRelative, rawBytesSha256: sha(receiptBytes) };
const closureBytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), leaf = 'consumer12-promoted20-cookie104-01.json';
fs.writeFileSync(privateWindows + '/' + leaf, closureBytes, { flag: 'wx', mode: 0o600 });
const input = fs.readFileSync(author + '/cookie-source27-actual03-metadata-only.json'); assert.equal(sha(input), '773108e62168e0c97623f5de4f04bf6b16c03386cc46592bee33fdd175579695');
fs.writeFileSync(privateWindows + '/actual03-cookie-scope104-input.json', input, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ promotedProducts: 7, businessHelpers: 159, newCorrective20: { file: privateLinux + '/' + leaf, rawBytesSha256: sha(closureBytes) },
  scopeMetadataInput: { file: privateLinux + '/actual03-cookie-scope104-input.json', rawBytesSha256: sha(input) }, HTTPExecuted: false, G3Certified: false }));
