import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const author = 'E:/projects/worktrees/poms-r4h-signals/poms/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const packages = [
  ['public-role-race23', 'runtime-seal23.json', 'b4a4920a66b1dafa77d9f3a9717b9e23381d1be3e35a90ae3bf2946d8e461b31'],
  ['public-role-race23-02', 'manifest23-02.json', '680a03d5d68edd3d43713884e64b4de94b83c9b087f325f0c5858c827e5a6a3c'],
  ['tcp-relay24', 'manifest24.json', 'f0c5ddf491de8c76925d16c651b9826dace16512e1192c8da9602b88f51c586f'],
];
const manifests = packages.map(([directory, leaf, expected]) => {
  const source = author + prefix + directory, bytes = fs.readFileSync(source + '/' + leaf); assert.equal(sha(bytes), expected);
  const manifest = JSON.parse(bytes); for (const pin of manifest.files) assert.equal(sha(fs.readFileSync(source + '/' + pin.file)), pin.rawBytesSha256);
  return { directory, leaf, expected, source, manifest };
});
for (const pin of manifests[2].manifest.runtimeDependenciesAtFreeze) assert.equal(sha(fs.readFileSync(root + '/' + pin.file)), pin.rawBytesSha256);
const effective = new Map();
for (const item of manifests) for (const entry of item.manifest.products) {
  const prior = effective.get(entry.file);
  if (prior) assert.equal(prior.entry.afterSHA256, entry.beforeSHA256);
  else if (entry.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + entry.file));
  else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), entry.beforeSHA256);
  effective.set(entry.file, { entry, source: item.source, initialBeforeSHA256: prior ? prior.initialBeforeSHA256 : entry.beforeSHA256 });
}
const backup = root + '/tools/rust-r4ghi/checkpoints/ui98'; fs.mkdirSync(backup, { recursive: true });
for (const [file, value] of effective) if (value.initialBeforeSHA256 !== null) {
  const target = backup + '/' + path.basename(file) + '.before.bin';
  if (fs.existsSync(target)) assert.equal(sha(fs.readFileSync(target)), value.initialBeforeSHA256, 'Keep the exact partial-promotion backup');
  else fs.copyFileSync(root + '/' + file, target, fs.constants.COPYFILE_EXCL);
}
for (const item of manifests) {
  const archive = root + '/' + prefix + item.directory;
  const files = new Set(fs.readdirSync(item.source, { withFileTypes: true }).filter(entry => entry.isFile() && !/\.(?:exe|pdb|rlib|rmeta)$/.test(entry.name)).map(entry => entry.name));
  for (const pin of item.manifest.files) files.add(pin.file);
  for (const file of files) { const target = archive + '/' + file; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(item.source + '/' + file, target, fs.constants.COPYFILE_EXCL); }
}
for (const [file, value] of effective) { fs.copyFileSync(value.source + '/' + value.entry.candidate, root + '/' + file); assert.equal(sha(fs.readFileSync(root + '/' + file)), value.entry.afterSHA256); }
const count = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(?:mjs|json)$/.test(file)).length; assert.equal(count, 157);
fs.writeFileSync(root + '/docs/design/rust-r4ghi/ui98-tool-promotion.json', JSON.stringify({ kind: 'Root-nonauthor-exact-23-plus02-and-transparent-relay24-promotion',
  manifests: manifests.map(item => ({ file: prefix + item.directory + '/' + item.leaf, rawBytesSha256: item.expected })),
  effectiveProducts: [...effective].map(([file, value]) => ({ file, beforeSHA256: value.initialBeforeSHA256, afterSHA256: value.entry.afterSHA256 })),
  nonauthorIReviewManifestSHA256: '3344c02bca87a5b1fb4d057601df84e570a923658793982fa412ce32adb62539',
  previousStage87ActualProofPreserved: true, old152GraphUnusedForFurtherDrivers: true, actualBusinessHelpers: count,
  productSourceOrOriginal20Changed: false, HTTPExecuted: false, SQLExecuted: false, listenersStarted: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ effectiveProducts: effective.size, actualBusinessHelpers: count, productInputsUnchanged: 406, original20Unchanged: true, listenersStarted: false, HTTPExecuted: false }));
