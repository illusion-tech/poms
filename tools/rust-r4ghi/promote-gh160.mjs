import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const rel = prefix + 'gh-reload43', author = 'E:/projects/worktrees/poms-r4h-signals/poms/' + rel, sha = value => createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(author + '/manifest43.json'); assert.equal(sha(bytes), '0a449555c996a1795c2a0db1b684209cfa189dbcb1c052f5bb48cd40d0c0ecee'); const m = JSON.parse(bytes);
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', ui = priv + '/ui-config/runtime14', lp = ui.replace('//wsl.localhost/Debian', '');
const stateBytes = fs.readFileSync(priv + '/business/g2-business12/main01/state.json'), state = JSON.parse(stateBytes); assert.equal(state.sequence, 7251); assert(!state.activeFault && !state.blockedObservation); assert(!fs.existsSync(priv + '/business/g2-business12/main01/driver.lock'));
for (const p of m.files) assert.equal(sha(fs.readFileSync(author + '/' + p.file)), p.rawBytesSha256);
for (const p of m.products) { assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256); assert.equal(sha(fs.readFileSync(author + '/' + p.candidate)), p.afterSHA256); }
const backup = root + '/tools/rust-r4ghi/checkpoints/gh160'; fs.mkdirSync(backup, { recursive: true }); for (const p of m.products) fs.copyFileSync(root + '/' + p.file, backup + '/' + path.basename(p.file) + '.before.bin', fs.constants.COPYFILE_EXCL);
for (const p of [...m.files, { file: 'manifest43.json' }]) { const dest = root + '/' + rel + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(author + '/' + p.file, dest, fs.constants.COPYFILE_EXCL); }
for (const p of m.products) fs.copyFileSync(author + '/' + p.candidate, root + '/' + p.file);
const receiptRel = 'docs/design/rust-r4ghi/gh160-tool-promotion.json', receiptBytes = Buffer.from(JSON.stringify({ kind: 'Root-reviewed-real-GH-intent-change-reload-action-correction160', manifest: { file: rel + '/manifest43.json', rawBytesSha256: sha(bytes) }, products: m.products,
  GH02StillFailed: true, GH02DomainCommands: 0, lifecycle01StillFailed: true, currentBusinessHelpers: 175, backendOrProductChanged: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptRel, receiptBytes, { flag: 'wx' });
const oldLeaf = 'consumer12-promoted20-frozen154-01.json', oldBytes = fs.readFileSync(ui + '/' + oldLeaf); assert.equal(sha(oldBytes), '060cff7959e3166fb736502ac13e0a8d02e038e35a6fb4188f7d0501d80add91'); const closure = JSON.parse(oldBytes);
for (const p of closure.files) { const raw = fs.readFileSync(root + '/' + prefix + p.relativeFile); assert.equal(sha(raw), p.rawBytesSha256); assert.equal(raw.length, p.bytes); }
closure.priorCorrectiveClosure = { file: lp + '/' + oldLeaf, rawBytesSha256: sha(oldBytes) }; closure.correctionManifest = { file: lr + '/' + rel + '/manifest43.json', rawBytesSha256: sha(bytes) }; closure.promotionReceipt = { file: lr + '/' + receiptRel, rawBytesSha256: sha(receiptBytes) };
const cb = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), leaf = 'consumer12-promoted20-gh160-01.json'; fs.writeFileSync(ui + '/' + leaf, cb, { flag: 'wx', mode: 0o600 });
const inputRaw = fs.readFileSync(ui + '/gh18-source12-02-prepare-input16.json'); assert.equal(sha(inputRaw), 'a5164e1967fade5e8871278e3b484a305368a7d3cd92109e5a731b433c421dcb');
const input = JSON.parse(inputRaw.toString().replaceAll('gh18-source12-02', 'gh18-source12-03')); input.promotedToolClosure = { file: lp + '/' + leaf, rawBytesSha256: sha(cb) }; assert.equal(input.plan.sourceBases.length, 0); assert(!input.plan.metadata16);
const ib = Buffer.from(JSON.stringify(input, null, 2) + '\n'), inputLeaf = 'gh18-source12-03-prepare-input16.json'; fs.writeFileSync(ui + '/' + inputLeaf, ib, { flag: 'wx', mode: 0o600 });
assert.deepEqual(fs.readFileSync(priv + '/business/g2-business12/main01/state.json'), stateBytes);
console.log(JSON.stringify({ promotedProducts: 1, newClosure: { file: lp + '/' + leaf, rawBytesSha256: sha(cb) }, newInput: { file: lp + '/' + inputLeaf, rawBytesSha256: sha(ib) }, actualHTTPOrUIExecuted: false }));
