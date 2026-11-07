import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/windows-preflight22';
const author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + relative;
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = '7d7f53690bbd4cb7b5a782267879236ccdd8c62167ca0fcf0ff3545617057ff2';
const bytes = fs.readFileSync(author + '/manifest22.json'); assert.equal(sha(bytes), expected);
const manifest = JSON.parse(bytes);
const oldBytes = fs.readFileSync(priv + '/consumer11-promoted20-54-01.json');
assert.equal(sha(oldBytes), '662953aca396435d4f82387017b85a68d7deb3166a3a162a5653034e796bd4b5');
const closure = JSON.parse(oldBytes);
const fragment = JSON.parse(fs.readFileSync(author + '/powershell22.plan-fragment.json'));
assert.equal(sha(fs.readFileSync(fragment.windows.powershell.executablePath)), fragment.windows.powershell.rawBytesSha256);
for (const entry of manifest.files) assert.equal(sha(fs.readFileSync(author + '/' + entry.file)), entry.rawBytesSha256);
for (const entry of manifest.products) {
  assert.equal(sha(fs.readFileSync(author + '/' + entry.candidate)), entry.afterSHA256);
  if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file));
  else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
}
for (const entry of [...manifest.files, { file: 'manifest22.json' }]) {
  const target = root + '/' + relative + '/' + entry.file;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(author + '/' + entry.file, target, fs.constants.COPYFILE_EXCL);
}
for (const entry of manifest.products) fs.copyFileSync(author + '/' + entry.candidate, root + '/' + entry.file);
const receiptRelative = 'docs/design/rust-r4ghi/ui-windows81-promotion.json';
const receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-nonauthor-exact-Windows-PowerShell7-preflight22-promotion',
  manifest: { file: relative + '/manifest22.json', rawBytesSha256: expected }, products: manifest.products,
  priorCorrective20ClosureSHA256: sha(oldBytes), actualPowerShellExecutableChecked: fragment.windows.powershell,
  oldRun01PreservedAndNotReused: true, businessSourceChanged: false, HTTPExecuted: false, ACLExecutedByThisPromotion: false, G3Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptRelative, receiptBytes, { flag: 'wx' });
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
for (const item of closure.files) {
  const actual = fs.readFileSync(root + '/' + prefix + item.relativeFile);
  const changed = manifest.products.find(entry => entry.file === prefix + item.relativeFile);
  if (changed) assert.equal(item.rawBytesSha256, changed.beforeSHA256);
  else assert.equal(sha(actual), item.rawBytesSha256);
  item.bytes = actual.length; item.rawBytesSha256 = sha(actual);
}
closure.priorCorrectiveClosure = { file: '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/consumer11-promoted20-54-01.json', rawBytesSha256: sha(oldBytes) };
closure.correctionManifest = { file: linuxRoot + '/' + relative + '/manifest22.json', rawBytesSha256: expected };
closure.promotionReceipt = { file: linuxRoot + '/' + receiptRelative, rawBytesSha256: sha(receiptBytes) };
const closureBytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n');
const leaf = 'consumer12-promoted20-81-01.json';
fs.writeFileSync(priv + '/' + leaf, closureBytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ promotedProducts: 2, cumulative20: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/' + leaf, rawBytesSha256: sha(closureBytes) }, old20Preserved: true, actualPowerShellExecutableChecked: true, HTTPExecuted: false }));
