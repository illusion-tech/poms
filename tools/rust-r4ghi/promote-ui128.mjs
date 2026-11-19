import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', ar = 'E:/projects/worktrees/poms-r4h-signals/poms';
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/', sha = b => createHash('sha256').update(b).digest('hex');
const configurations = [['ui-runtime32', 'manifest32.json', 'd110f7b6dcf625f70d61b7cae3ec87b9d0178bf6b936f0197c2378298dea4d05'],
  ['ui-runtime32-02', 'manifest32-02.json', '0c8acdf4f85c383061936bdf029d50c6b1d146bd6b4507e7987948057fa1b912'],
  ['role-plan31', 'manifest31.json', '06f11e372ea86d266bb39c47d4ffdb3dad95bdfff9800fa54ab30d48559b774b']];
assert(!fs.existsSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
const packages = configurations.map(([directory, leaf, expected]) => { const dir = ar + '/' + prefix + directory, bytes = fs.readFileSync(dir + '/' + leaf); assert.equal(sha(bytes), expected); const manifest = JSON.parse(bytes);
  for (const pin of manifest.files) assert.equal(sha(fs.readFileSync(dir + '/' + pin.file)), pin.rawBytesSha256); return { directory, leaf, expected, dir, manifest }; });
const effective = new Map();
for (const p of packages) for (const product of p.manifest.products ?? []) { const prior = effective.get(product.file);
  if (prior) assert.equal(prior.product.afterSHA256, product.beforeSHA256); else if (product.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + product.file)); else assert.equal(sha(fs.readFileSync(root + '/' + product.file)), product.beforeSHA256);
  assert.equal(sha(fs.readFileSync(p.dir + '/' + product.candidate)), product.afterSHA256); effective.set(product.file, { product, dir: p.dir, initialBefore: prior ? prior.initialBefore : product.beforeSHA256 }); }
assert.equal(effective.size, 8);
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14', lp = priv.replace('//wsl.localhost/Debian', '');
const oldLeaf = 'consumer12-promoted20-readback119-01.json', oldBytes = fs.readFileSync(priv + '/' + oldLeaf); assert.equal(sha(oldBytes), '2e0331e02292c673772741c399d4875148bcd4ae633113d1a931e0f10a51bf6c');
const backup = root + '/tools/rust-r4ghi/checkpoints/ui128'; fs.mkdirSync(backup, { recursive: true });
for (const [file, p] of effective) if (p.initialBefore !== null) fs.copyFileSync(root + '/' + file, backup + '/' + path.basename(file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const p of packages) for (const pin of [...p.manifest.files, { file: p.leaf }]) { const target = root + '/' + prefix + p.directory + '/' + pin.file; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(p.dir + '/' + pin.file, target, fs.constants.COPYFILE_EXCL); }
for (const [file, p] of effective) fs.copyFileSync(p.dir + '/' + p.product.candidate, root + '/' + file);
const count = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).length; assert.equal(count, 168);
const receiptPath = 'docs/design/rust-r4ghi/ui128-tool-promotion.json', receipt = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-strict-font-classification-and-real-label-tool32-plus02-promotion',
  manifests: packages.map(p => ({ file: prefix + p.directory + '/' + p.leaf, rawBytesSha256: p.expected })), effectiveProducts: [...effective].map(([file, p]) => ({ file, beforeSHA256: p.initialBefore, afterSHA256: p.product.afterSHA256 })),
  UI05StillFailed: true, EOStartAndOwnUploadPreserved: true, oldBusinessPOSTsReplayed: false, noExternalNetworkOrResponseMock: true, newBusinessHelperCount: count, productSourceChanged: false,
  actualFontClassificationStillRequiresReadonlySmoke: true, DOMExecutedByPromotion: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptPath, receipt, { flag: 'wx' });
const closure = JSON.parse(oldBytes);
for (const e of closure.files) { const b = fs.readFileSync(root + '/' + prefix + e.relativeFile), p = effective.get(prefix + e.relativeFile); assert.equal(e.rawBytesSha256, p ? p.initialBefore : sha(b)); e.bytes = b.length; e.rawBytesSha256 = sha(b); }
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifests = packages.slice(0, 2).map(p => ({ file: lr + '/' + prefix + p.directory + '/' + p.leaf, rawBytesSha256: p.expected })); closure.promotionReceipt = { file: lr + '/' + receiptPath, rawBytesSha256: sha(receipt) };
const leaf = 'consumer12-promoted20-ui128-01.json', bytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n'); fs.writeFileSync(priv + '/' + leaf, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ promotedProducts: effective.size, businessHelpers: count, closure: { file: lp + '/' + leaf, rawBytesSha256: sha(bytes) }, DOMExecuted: false }));
