// Exact FS-only staging after Source12 preservation. Never opens a DB or mints Source13.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', sha = value => createHash('sha256').update(value).digest('hex');
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', oldStateFile = priv + '/business/g2-business12/main01/state.json', stateRaw = fs.readFileSync(oldStateFile), state = JSON.parse(stateRaw);
assert(!fs.existsSync(path.dirname(oldStateFile) + '/driver.lock')); assert(!state.activeFault && !state.blockedObservation && state.retention139); assert(!fs.existsSync(priv + '/business/g2-business13/main01/state.json'));
const indexRaw = fs.readFileSync(priv + '/retention/epoch12-before-source13-139/index.json'); assert.equal(sha(indexRaw), 'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7'); const index = JSON.parse(indexRaw);
assert.deepEqual(index.receipt, state.retention139); const retained = JSON.parse(fs.readFileSync('//wsl.localhost/Debian' + index.receipt.file)); assert.equal(retained.stoppedAPI.pid, 11616); assert.equal(retained.stoppedAPI.processGone, true);
const groups = [], composedRel = 'tools/rust-r4ghi/corrective-composed106', composedRaw = fs.readFileSync(root + '/' + composedRel + '/manifest106.json'); assert.equal(sha(composedRaw), '5adc6d8b0179b5d2505e318d24101d400fde725dfcd48384c4d8189143d97b27'); const composed = JSON.parse(composedRaw);
for (const item of composed.files) groups.push({ file: item.file, beforeSHA256: item.beforeSHA256, afterSHA256: item.afterSHA256, source: root + '/' + composedRel + '/' + item.candidate, origin: composedRel + '/manifest106.json' });
const iSettings = [{ rel: 'tools/rust-r4ghi/I/implementation/schema-admission108', leaf: 'manifest108.json', expected: '8943e0ac1fcabe40cee6171862cb6d2fca65186c78bf01784e61c75f372cba96' },
  { rel: 'tools/rust-r4ghi/I/implementation/schema-admission108-02', leaf: 'manifest108-02.json', expected: '53559669a4bdbe095ada4511703805224f26c60cbfaaa5b36c820f5d1e5d3ce5' }];
const packages = iSettings.map(setting => { const folder = author + '/' + setting.rel, raw = fs.readFileSync(folder + '/' + setting.leaf); assert.equal(sha(raw), setting.expected); const m = JSON.parse(raw), files = [...m.sidecars];
  for (const p of m.candidates) { files.push({ file: p.candidate, rawBytesSha256: p.afterSHA256 }); const before = p.beforeRoot ?? p.before; if (before && fs.existsSync(folder + '/' + before)) files.push({ file: before, rawBytesSha256: p.beforeRootSHA256 ?? p.beforeSHA256 }); }
  for (const p of m.deltaFrom108 ?? []) if (p.before108) files.push({ file: p.before108, rawBytesSha256: p.before108SHA256 });
  for (const p of files) assert.equal(sha(fs.readFileSync(folder + '/' + p.file)), p.rawBytesSha256, p.file); return { ...setting, folder, m, files }; });
const consumer = 'tools/rust-r4ghi/business/consumer-admission54.mjs', retained108 = 'tools/rust-r4ghi/business/retained-schema-admission108.mjs', future = root + '/tools/rust-r4ghi/I/implementation/process-restart1351/future-source13/';
for (const p of packages[1].m.candidates) {
  const item = { file: p.target, beforeSHA256: p.beforeRootSHA256, afterSHA256: p.afterSHA256, source: packages[1].folder + '/' + p.candidate, origin: packages[1].rel + '/' + packages[1].leaf };
  if (p.target === consumer) { assert.equal(p.beforeRootSHA256, '08f49d66466deb6fb150b4a788ffe1c3d132f1cb2eb692a043020dd5cb4811b2'); item.beforeSHA256 = '6fe5e30042956a776e122eff7adb3507cec873ccbc0dd570c6e9c017bd18963b'; item.afterSHA256 = '5e67049e566ea27eb28b7e4ea6a4b1e4affab6fe5a06f7540ebcf308527bf9de'; item.source = future + consumer; item.origin = 'process-restart1351/future-composition1351.json'; }
  if (p.target === retained108) { assert.equal(p.afterSHA256, '95f0254efdb880b101b955f5b7bfee789e827a94e4b6d0ef84d3ad7d88f8c462'); item.afterSHA256 = '4e87c06567a2ede0eae6fcf17e031b323d4d4b0c94b87e935a9c15effde7669d'; item.source = future + retained108; item.origin = 'process-restart1351/future-composition1351.json'; }
  groups.push(item);
}
const compositionRel = 'tools/rust-r4ghi/H/implementation/support-patches/independent-tax13-review40/composition40.json', taxComposition = JSON.parse(fs.readFileSync(root + '/' + compositionRel));
for (const pin of taxComposition.manifests) assert.equal(sha(fs.readFileSync(pin.file)), pin.rawBytesSha256);
const taxOriginal = JSON.parse(fs.readFileSync(taxComposition.manifests[0].file));
for (const p of taxComposition.products) { const before = taxOriginal.files.find(item => item.file === p.file); assert(before); groups.push({ file: p.file, beforeSHA256: before.beforeCurrentObservedSHA256, afterSHA256: p.sha256, source: p.source, origin: compositionRel }); }
assert.equal(groups.length, 31); assert.equal(new Set(groups.map(p => p.file)).size, groups.length);
for (const p of groups) { assert.equal(sha(fs.readFileSync(p.source)), p.afterSHA256, p.file); if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.file), p.file); else assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256, p.file); }
const backup = root + '/tools/rust-r4ghi/checkpoints/source13-177'; fs.mkdirSync(backup, { recursive: true });
for (const p of groups.filter(p => p.beforeSHA256 !== null)) { const dest = backup + '/' + p.file + '.before.bin'; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(root + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
for (const pack of packages) for (const p of [...pack.files, { file: pack.leaf }]) { const dest = root + '/' + pack.rel + '/' + p.file, raw = fs.readFileSync(pack.folder + '/' + p.file); fs.mkdirSync(path.dirname(dest), { recursive: true }); if (fs.existsSync(dest)) assert.deepEqual(fs.readFileSync(dest), raw); else fs.writeFileSync(dest, raw, { flag: 'wx' }); }
for (const p of groups) { const dest = root + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(p.source, dest); assert.equal(sha(fs.readFileSync(dest)), p.afterSHA256); }
assert.deepEqual(fs.readFileSync(oldStateFile), stateRaw);
const receipt = { kind: 'Root-exact-Source13-product-and-schema-tool-staging177', jointG1Unchanged: true, correctiveInput: 'docs/design/rust-r4ghi/g2-source13-corrective136.md', products: groups.map(({ source, ...item }) => item),
  oldSource12RetentionIndex: { file: indexFileName(), rawBytesSha256: sha(indexRaw) }, priorSource12StateNotRebound: true, oldConsumer6feNotOverwrittenByOld08fCandidate: true, future1351OverlayQuarantineIncluded: true,
  productFilesStaged: 10, schemaToolFilesStaged: 12, taxToolFilesStaged: 9, finalH0AndM98ApprovalStillRequired: true, finalH0Frozen: false, M98Executed: false, Source13StateMinted: false, processStarted: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false };
function indexFileName() { return '/home/wangzishi/.local/share/poms-r4ghi/private/retention/epoch12-before-source13-139/index.json'; }
const file = root + '/docs/design/rust-r4ghi/source13-staging177.json', raw = Buffer.from(JSON.stringify(receipt, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx' });
console.log(JSON.stringify({ exactFilesCopied: groups.length, businessHelpers: fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length, receipt: { file, rawBytesSha256: sha(raw) }, M98Executed: false, Source13StateMinted: false }));
