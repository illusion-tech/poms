import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/I/implementation/business-receipt-terms-race66';
const author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms/' + relative;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = '061c0122235b7b2f015feb04b31f65abbac54c062522476d37104ee85d6086ab';
const bytes = fs.readFileSync(author + '/manifest66.json'); assert.equal(sha(bytes), expected);
const manifest = JSON.parse(bytes);
for (const pin of [...manifest.productSources, ...manifest.runtimeDependencies]) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.sha256);
for (const entry of manifest.files) {
  assert(entry.file.startsWith('tools/rust-r4ghi/business/') && !entry.file.includes('..') && entry.beforeSHA256 === null);
  assert(!fs.existsSync(root + '/' + entry.file)); assert.equal(sha(fs.readFileSync(author + '/' + entry.candidate)), entry.afterSHA256);
}
const archiveFiles = new Set(fs.readdirSync(author, { withFileTypes: true }).filter(e => e.isFile() && !/\.(exe|pdb|rlib|rmeta)$/.test(e.name)).map(e => e.name));
for (const entry of manifest.files) archiveFiles.add(entry.candidate);
for (const file of archiveFiles) {
  const target = root + '/' + relative + '/' + file; fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(author + '/' + file, target, fs.constants.COPYFILE_EXCL);
}
for (const entry of manifest.files) fs.copyFileSync(author + '/' + entry.candidate, root + '/' + entry.file);
fs.writeFileSync(root + '/docs/design/rust-r4ghi/receipt-terms84-tool-promotion.json', JSON.stringify({ kind: 'Root-nonauthor-exact-public-C-original-terms-race66-tool-promotion', manifest: { file: relative + '/manifest66.json', rawBytesSha256: expected }, files: manifest.files,
  businessSourceChanged: false, candidatePlanStillRequiresActualResourceAndSourceBinding: true, HTTPExecuted: false, SQLExecuted: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotedNewHelpers: manifest.files.length, allEightProductAndEightRuntimeDependenciesExact: true, HTTPExecuted: false, SQLExecuted: false }));
