import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', base = 'tools/rust-r4ghi/I/implementation/', sha = value => createHash('sha256').update(value).digest('hex');
const settings = [{ rel: base + 'retention1351-139-140', leaf: 'manifest139-140.json', expected: '33e59105aa066e61072e3e4c6dc06e73cd3beaac877c9aa8b3b8a48062002b7b' },
  { rel: base + 'retention1351-139-140-02', leaf: 'manifest139-140-02.json', expected: '6fd13ad32179df6ab9d8545dc2adc18f81207d5cfb68da9735ac63a2c6ee8b5d' }];
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01'; assert(!fs.existsSync(priv + '/driver.lock')); const stateRaw = fs.readFileSync(priv + '/state.json'), state = JSON.parse(stateRaw); assert(!state.activeFault && !state.blockedObservation);
const packages = settings.map(setting => { const folder = author + '/' + setting.rel, raw = fs.readFileSync(folder + '/' + setting.leaf); assert.equal(sha(raw), setting.expected); const m = JSON.parse(raw), files = [...m.sidecars];
  for (const p of m.candidates) { files.push({ file: p.candidate, rawBytesSha256: p.afterSHA256 }); if (p.before && fs.existsSync(folder + '/' + p.before)) files.push({ file: p.before, rawBytesSha256: p.beforeSHA256 }); }
  for (const p of m.deltaFrom33e ?? []) files.push({ file: p.before33e, rawBytesSha256: p.before33eSHA256 });
  for (const p of files) assert.equal(sha(fs.readFileSync(folder + '/' + p.file)), p.rawBytesSha256); return { ...setting, folder, m, files }; });
for (const p of packages[1].m.candidates) { if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.target)); else assert.equal(sha(fs.readFileSync(root + '/' + p.target)), p.beforeSHA256); }
const backup = root + '/tools/rust-r4ghi/checkpoints/retention167'; fs.mkdirSync(backup, { recursive: true });
for (const p of packages[1].m.candidates.filter(p => p.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + p.target, backup + '/' + path.basename(p.target) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const pack of packages) for (const p of [...pack.files, { file: pack.leaf }]) { const dest = root + '/' + pack.rel + '/' + p.file, raw = fs.readFileSync(pack.folder + '/' + p.file); fs.mkdirSync(path.dirname(dest), { recursive: true }); if (fs.existsSync(dest)) assert.deepEqual(fs.readFileSync(dest), raw); else fs.writeFileSync(dest, raw, { flag: 'wx' }); }
for (const p of packages[1].m.candidates) fs.copyFileSync(packages[1].folder + '/' + p.candidate, root + '/' + p.target);
const receipt = { kind: 'Root-reviewed-1351-retention139140-02-sequence-promotion167', manifests: settings.map(p => ({ file: p.rel + '/' + p.leaf, rawBytesSha256: p.expected })), products: packages[1].m.candidates,
  actualSixUIGatesStillRequired: true, completed140PacketMustPrecede139Stop: true, source140OrRetention139Executed: false, processStartedOrStopped: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false };
const file = root + '/docs/design/rust-r4ghi/retention167-tool-promotion.json', raw = Buffer.from(JSON.stringify(receipt, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx' }); assert.deepEqual(fs.readFileSync(priv + '/state.json'), stateRaw);
console.log(JSON.stringify({ promotedProducts: 3, receipt: { file, rawBytesSha256: sha(raw) }, actualRetentionExecuted: false }));
