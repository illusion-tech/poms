import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/windows-preflight22-02';
const author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + relative;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = '69f31df1330738961df43520c80ab1c694da0be446e836c941a4283b8b085d0d';
const bytes = fs.readFileSync(author + '/manifest22-02.json'); assert.equal(sha(bytes), expected);
const manifest = JSON.parse(bytes);
assert.equal(sha(fs.readFileSync(root + '/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/windows-preflight22/manifest22.json')), manifest.applyAfter.rawBytesSha256);
assert.equal(sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/ui-windows-preflight22.mjs')), manifest.applyAfter.helperRawBytesSha256);
for (const entry of manifest.files) assert.equal(sha(fs.readFileSync(author + '/' + entry.file)), entry.rawBytesSha256);
for (const entry of manifest.products) {
  assert(entry.file.startsWith('tools/rust-r4ghi/business/ui-') && entry.file.endsWith('18-windows.mjs'));
  assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
  assert.equal(sha(fs.readFileSync(author + '/' + entry.candidate)), entry.afterSHA256);
}
for (const entry of [...manifest.files, { file: 'manifest22-02.json' }]) {
  const target = root + '/' + relative + '/' + entry.file; fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(author + '/' + entry.file, target, fs.constants.COPYFILE_EXCL);
}
for (const entry of manifest.products) fs.copyFileSync(author + '/' + entry.candidate, root + '/' + entry.file);
fs.writeFileSync(root + '/docs/design/rust-r4ghi/ui-windows83-promotion.json', JSON.stringify({ kind: 'Root-nonauthor-exact-four18-Windows-PowerShell7-preflight22-02-promotion', manifest: { file: relative + '/manifest22-02.json', rawBytesSha256: expected }, products: manifest.products,
  helperActualPreflight: 'tmp/rust-r4ghi/root/ui-preflight81/receipt.json', existingCorrective20ClosureUnchanged: true, businessOrLinuxOrBrowserPolicyChanged: false, HTTPExecuted: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotedWindowsWorkers: 4, existingCorrective20ClosureUnchanged: true, HTTPExecuted: false }));
