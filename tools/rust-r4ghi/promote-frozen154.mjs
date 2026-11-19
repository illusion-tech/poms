import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', linuxRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const rel = prefix + 'frozen-role38', source = 'E:/projects/worktrees/poms-r4h-signals/poms/' + rel, sha = value => createHash('sha256').update(value).digest('hex');
const manifestBytes = fs.readFileSync(source + '/manifest38.json'); assert.equal(sha(manifestBytes), '374fc51bc4b66add25071b026c4cd34e3d68a07c0a00779c0371b7a0bd19533e'); const m = JSON.parse(manifestBytes);
const privateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', ui = privateRoot + '/ui-config/runtime14', linuxUI = ui.replace('//wsl.localhost/Debian', '');
const stateBytes = fs.readFileSync(privateRoot + '/business/g2-business12/main01/state.json'), state = JSON.parse(stateBytes); assert(!fs.existsSync(privateRoot + '/business/g2-business12/main01/driver.lock')); assert(!state.activeFault && !state.blockedObservation && !state.processRestartPreparation1351);
assert.equal(state.processRestart1351.registry.rawBytesSha256, '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b');
for (const p of m.files) assert.equal(sha(fs.readFileSync(source + '/' + p.file)), p.rawBytesSha256);
for (const p of m.products) { if (p.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + p.file)); else assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); assert.equal(sha(fs.readFileSync(source + '/' + p.candidate)), p.afterSHA256); }
const backup = root + '/tools/rust-r4ghi/checkpoints/frozen154'; fs.mkdirSync(backup, { recursive: true });
for (const p of m.products.filter(p => p.beforeSHA256 !== null)) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const p of [...m.files, { file: 'manifest38.json' }]) { const dest = root + '/' + rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(source + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
for (const p of m.products) fs.copyFileSync(source + '/' + p.candidate, root + '/' + p.file);
const helpers = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).sort().map(file => ({ file: 'tools/rust-r4ghi/business/' + file, sha256: sha(fs.readFileSync(root + '/tools/rust-r4ghi/business/' + file)) })); assert.equal(helpers.length, 175);
const receiptRel = 'docs/design/rust-r4ghi/frozen154-tool-promotion.json', receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-post-1351-admission-read-only-Role38-promotion154', manifest: { file: rel + '/manifest38.json', rawBytesSha256: sha(manifestBytes) }, products: m.products, currentBusinessHelperCount: helpers.length,
  actualProcessRestartRegistry: state.processRestart1351.registry, actualCurrentApiProcess: state.apiProcess, oldRole03DidNotContainPostCurrentDetailGET: true, coldReadbackStillRequired: true,
  previousRestart150ClosureRequiresNewByteLengthCaptureForChangedBinding13: true, previousClosureUsedForUI: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptRel, receiptBytes, { flag: 'wx' });
const oldLeaf = 'consumer12-promoted20-restart150-01.json', oldBytes = fs.readFileSync(ui + '/' + oldLeaf); assert.equal(sha(oldBytes), 'c771b803fba8a054784e2262d7b369a8845802657705effa22bdcb76677d9826'); const closure = JSON.parse(oldBytes);
for (const p of closure.files) { const raw = fs.readFileSync(root + '/' + prefix + p.relativeFile); assert.equal(sha(raw), p.rawBytesSha256); p.bytes = raw.length; }
closure.priorCorrectiveClosure = { file: linuxUI + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifest = { file: linuxRoot + '/' + rel + '/manifest38.json', rawBytesSha256: sha(manifestBytes) }; closure.promotionReceipt = { file: linuxRoot + '/' + receiptRel, rawBytesSha256: sha(receiptBytes) };
const bytes = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), leaf = 'consumer12-promoted20-frozen154-01.json'; fs.writeFileSync(ui + '/' + leaf, bytes, { flag: 'wx', mode: 0o600 });
assert.deepEqual(fs.readFileSync(privateRoot + '/business/g2-business12/main01/state.json'), stateBytes);
console.log(JSON.stringify({ promotedProducts: m.products.length, helperCount: helpers.length, closure: { file: linuxUI + '/' + leaf, rawBytesSha256: sha(bytes) }, actualColdReadbackExecuted: false }));
