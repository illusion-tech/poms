import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', author = 'E:/projects/worktrees/poms-r4h-signals/poms';
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/', sha = b => createHash('sha256').update(b).digest('hex');
const specs = [['role-select34', 'manifest34.json', 'f4eec1845fd0fef246027b99dde7333331e1ed9d97049c57cbcdfe8f23c88011'],
  ['expense-query35', 'manifest35.json', '1af0ef45eb0391f1f785a0aa748a8c3b458f18f467a5e4c3b2bf2527f361574b']];
assert(!fs.existsSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
const packages = specs.map(([dir, leaf, expected]) => { const base = author + '/' + prefix + dir, raw = fs.readFileSync(base + '/' + leaf); assert.equal(sha(raw), expected); const m = JSON.parse(raw);
  for (const p of m.files) assert.equal(sha(fs.readFileSync(base + '/' + p.file)), p.rawBytesSha256);
  for (const p of m.products) { assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); assert.equal(sha(fs.readFileSync(base + '/' + p.candidate)), p.afterSHA256); }
  return { dir, leaf, expected, base, m }; });
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14', lp = priv.replace('//wsl.localhost/Debian', '');
const oldLeaf = 'consumer12-promoted20-ui128-01.json', oldBytes = fs.readFileSync(priv + '/' + oldLeaf); assert.equal(sha(oldBytes), 'f9e2184fec6990aae588b42c6872fa09086e2f74c3df23341b2622d8f39911ec');
const backup = root + '/tools/rust-r4ghi/checkpoints/ui137'; fs.mkdirSync(backup, { recursive: true });
for (const x of packages) { for (const p of x.m.products) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
  for (const p of [...x.m.files, { file: x.leaf }]) { const dest = root + '/' + prefix + x.dir + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(x.base + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
  for (const p of x.m.products) fs.copyFileSync(x.base + '/' + p.candidate, root + '/' + p.file); }
const receiptPath = 'docs/design/rust-r4ghi/ui137-tool-promotion.json', bytes = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-actual-pre-submit-Role-and-Expense-tool-correction137', manifests: packages.map(x => ({ file: prefix + x.dir + '/' + x.leaf, rawBytesSha256: x.expected })),
  products: packages.flatMap(x => x.m.products), originalRole01AndExpense01StillFailed: true, oldBusinessPOSTReplayed: false, productOrAPIChanged: false, businessHelpers: 168, DOMExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptPath, bytes, { flag: 'wx' });
const closure = JSON.parse(oldBytes); for (const e of closure.files) assert.equal(sha(fs.readFileSync(root + '/' + prefix + e.relativeFile)), e.rawBytesSha256);
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifests = packages.map(x => ({ file: lr + '/' + prefix + x.dir + '/' + x.leaf, rawBytesSha256: x.expected })); closure.promotionReceipt = { file: lr + '/' + receiptPath, rawBytesSha256: sha(bytes) };
const leaf = 'consumer12-promoted20-ui137-01.json', cb = Buffer.from(JSON.stringify(closure, null, 2) + '\n'); fs.writeFileSync(priv + '/' + leaf, cb, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ products: 2, businessHelpers: 168, closure: { file: lp + '/' + leaf, rawBytesSha256: sha(cb) }, HTTPExecuted: false }));
