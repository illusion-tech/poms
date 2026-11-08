import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const iRoot = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', hRoot = 'E:/projects/worktrees/poms-r4h-signals/poms';
const uiPrefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const sha = value => createHash('sha256').update(value).digest('hex');
const stateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', ui = stateRoot + '/ui-config/runtime14';
const linuxUI = ui.replace('//wsl.localhost/Debian', '');
const stateBytes = fs.readFileSync(stateRoot + '/business/g2-business12/main01/state.json');
assert.equal(sha(stateBytes), '8e297fdb95b88442ebded8c37c44863b73838798b2fe0dbd9f798e4a5064c605');
assert(!fs.existsSync(stateRoot + '/business/g2-business12/main01/driver.lock'));
const settings = [
  { author: iRoot, rel: 'tools/rust-r4ghi/I/implementation/process-restart1351', leaf: 'manifest1351.json', expected: '714c58b74bba60d89367a7c5826b24f555046f49f6ac89230521623f894106db' },
  { author: iRoot, rel: 'tools/rust-r4ghi/I/implementation/process-restart1351-02', leaf: 'manifest1351-02.json', expected: '2d926a49a1bbc50e54328fa92c6ea540395d2855ba731ed652f992eb1c0b818b' },
  { author: hRoot, rel: uiPrefix + 'restart-ui39', leaf: 'manifest39.json', expected: 'a828eca5ce10bfaa3efbac9c21bea763eebd12490f48d6aa66557749b4cfe114' },
];
const packages = settings.map(setting => {
  const folder = setting.author + '/' + setting.rel, raw = fs.readFileSync(folder + '/' + setting.leaf); assert.equal(sha(raw), setting.expected);
  const manifest = JSON.parse(raw), files = [...(manifest.files ?? manifest.sidecars ?? [])];
  if (manifest.candidates) {
    for (const item of manifest.candidates) {
      files.push({ file: item.candidate, rawBytesSha256: item.afterSHA256 });
      if (item.before && fs.existsSync(folder + '/' + item.before)) files.push({ file: item.before, rawBytesSha256: item.beforeSHA256 });
    }
    for (const item of manifest.futureSource13Only ?? []) files.push({ file: item.file, rawBytesSha256: item.afterSHA256 });
    for (const item of manifest.deltaFrom714c ?? []) files.push({ file: item.before1351, rawBytesSha256: item.before1351SHA256 });
  }
  for (const item of files) assert.equal(sha(fs.readFileSync(folder + '/' + item.file)), item.rawBytesSha256, item.file);
  return { ...setting, folder, raw, manifest, files };
});
const products = [...packages[1].manifest.candidates.map(item => ({ file: item.target, candidate: item.candidate, beforeSHA256: item.beforeSHA256, afterSHA256: item.afterSHA256, from: packages[1] })),
  ...packages[2].manifest.products.map(item => ({ ...item, from: packages[2] }))];
assert.equal(new Set(products.map(item => item.file)).size, 9);
for (const item of products) {
  if (item.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + item.file));
  else assert.equal(sha(fs.readFileSync(root + '/' + item.file)), item.beforeSHA256, item.file);
  assert.equal(sha(fs.readFileSync(item.from.folder + '/' + item.candidate)), item.afterSHA256);
}
const backup = root + '/tools/rust-r4ghi/checkpoints/restart150'; fs.mkdirSync(backup, { recursive: true });
for (const item of products.filter(item => item.beforeSHA256 !== null)) {
  const dest = backup + '/' + item.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(root + '/' + item.file, dest, fs.constants.COPYFILE_EXCL);
}
for (const item of packages) for (const member of [...item.files, { file: item.leaf }]) {
  const dest = root + '/' + item.rel + '/' + member.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(item.folder + '/' + member.file, dest, fs.constants.COPYFILE_EXCL);
}
for (const item of products) fs.copyFileSync(item.from.folder + '/' + item.candidate, root + '/' + item.file);
const helperPins = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).sort().map(file => ({ file: 'tools/rust-r4ghi/business/' + file, sha256: sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + file)) }));
assert.equal(helperPins.length, 174);
const graphBytes = Buffer.from(JSON.stringify(helperPins, null, 2) + '\n'), graphLeaf = 'source12-restart1351-helper150.json'; fs.writeFileSync(ui + '/' + graphLeaf, graphBytes, { flag: 'wx', mode: 0o600 });
const plan = JSON.parse(fs.readFileSync(packages[1].folder + '/prepare-plan-template1351.json'));
plan.currentHelperGraph = { file: linuxUI + '/' + graphLeaf, rawBytesSha256: sha(graphBytes) };
const planBytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'), planLeaf = 'source12-restart1351-prepare150.json'; fs.writeFileSync(ui + '/' + planLeaf, planBytes, { flag: 'wx', mode: 0o600 });
const receiptRel = 'docs/design/rust-r4ghi/restart150-tool-promotion.json';
const receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-current-M97-restart1351-02-and-process-bound-UI39-promotion150', manifests: packages.map(item => ({ file: item.rel + '/' + item.leaf, rawBytesSha256: item.expected })),
  products: products.map(({ from, ...item }) => item), helperCount: helperPins.length, helperGraph: plan.currentHelperGraph,
  preparationPlan: { file: linuxUI + '/' + planLeaf, rawBytesSha256: sha(planBytes) }, originalStateUnmodifiedSHA256: sha(stateBytes), futureSource13ProductsApplied: false,
  processStartedByPromotion: false, SQLOrHTTPExecuted: false, businessCommandsReplayed: false, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + receiptRel, receiptBytes, { flag: 'wx' });
const oldLeaf = 'consumer12-promoted20-role143-01.json', oldBytes = fs.readFileSync(ui + '/' + oldLeaf); assert.equal(sha(oldBytes), '0e12a4b99350d5157715de916befcbc34c829c5eac8f665328ca972e018a1a9d');
const closure = JSON.parse(oldBytes);
for (const entry of closure.files) {
  const relativeFile = uiPrefix + entry.relativeFile, changed = products.find(item => item.file === relativeFile);
  assert.equal(sha(fs.readFileSync(root + '/' + relativeFile)), changed?.afterSHA256 ?? entry.rawBytesSha256);
  if (changed) entry.rawBytesSha256 = changed.afterSHA256;
}
closure.priorCorrectiveClosure = { file: linuxUI + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) };
closure.correctionManifests = packages.map(item => ({ file: linuxRoot + '/' + item.rel + '/' + item.leaf, rawBytesSha256: item.expected }));
closure.promotionReceipt = { file: linuxRoot + '/' + receiptRel, rawBytesSha256: sha(receiptBytes) };
const closureBytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), closureLeaf = 'consumer12-promoted20-restart150-01.json'; fs.writeFileSync(ui + '/' + closureLeaf, closureBytes, { flag: 'wx', mode: 0o600 });
assert.deepEqual(fs.readFileSync(stateRoot + '/business/g2-business12/main01/state.json'), stateBytes);
console.log(JSON.stringify({ promotedProducts: products.length, helperCount: helperPins.length, preparePlan: { file: linuxUI + '/' + planLeaf, rawBytesSha256: sha(planBytes) }, closure: { file: linuxUI + '/' + closureLeaf, rawBytesSha256: sha(closureBytes) }, futureProductsApplied: false, actualRestartExecuted: false }));
