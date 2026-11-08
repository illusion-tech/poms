// FS-only promotion of an exact independently reviewed H tool seal, then a new unexecuted input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const [directory, manifestLeaf, approvedManifestSHA, priorClosureLeaf, priorClosureSHA, oldInputLeaf, newRun, approvedOldInputSHA] = process.argv.slice(2);
assert.equal(process.argv.length, 10); assert(/^[a-z0-9-]+$/.test(directory) && /^[a-z0-9-]+$/.test(newRun));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const rel = prefix + directory, source = 'E:/projects/worktrees/poms-r4h-signals/poms/' + rel, sha = value => createHash('sha256').update(value).digest('hex');
const manifestRaw = fs.readFileSync(source + '/' + manifestLeaf); assert.equal(sha(manifestRaw), approvedManifestSHA); const m = JSON.parse(manifestRaw);
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', ui = priv + '/ui-config/runtime14', lp = ui.replace('//wsl.localhost/Debian', '');
const stateFile = priv + '/business/g2-business12/main01/state.json', stateRaw = fs.readFileSync(stateFile), state = JSON.parse(stateRaw);
assert.equal(state.epoch, 'g2-business12'); assert(!state.activeFault && !state.blockedObservation && !state.processRestartPreparation1351); assert.equal(state.apiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'); assert(!fs.existsSync(path.dirname(stateFile) + '/driver.lock'));
const oldClosureRaw = fs.readFileSync(ui + '/' + priorClosureLeaf); assert.equal(sha(oldClosureRaw), priorClosureSHA); const closure = JSON.parse(oldClosureRaw);
for (const item of closure.files) { const raw = fs.readFileSync(root + '/' + prefix + item.relativeFile); assert.equal(sha(raw), item.rawBytesSha256); assert.equal(raw.length, item.bytes); }
const oldInputRaw = fs.readFileSync(ui + '/' + oldInputLeaf); assert.equal(sha(oldInputRaw), approvedOldInputSHA); const originalInput = JSON.parse(oldInputRaw); assert.equal(originalInput.plan.sourceBases.length, 0); assert(!originalInput.plan.metadata16);
for (const item of m.files) assert.equal(sha(fs.readFileSync(source + '/' + item.file)), item.rawBytesSha256);
for (const item of m.products) { if (item.beforeSHA256 === null) assert(!fs.existsSync(root + '/' + item.file)); else assert.equal(sha(fs.readFileSync(root + '/' + item.file)), item.beforeSHA256); assert.equal(sha(fs.readFileSync(source + '/' + item.candidate)), item.afterSHA256); }
const backup = root + '/tools/rust-r4ghi/checkpoints/reviewed162/' + newRun; fs.mkdirSync(backup, { recursive: true });
for (const item of m.products.filter(item => item.beforeSHA256 !== null)) { const dest = backup + '/' + item.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(root + '/' + item.file, dest, fs.constants.COPYFILE_EXCL); }
for (const item of [...m.files, { file: manifestLeaf }]) { const dest = root + '/' + rel + '/' + item.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); const raw = fs.readFileSync(source + '/' + item.file); if (fs.existsSync(dest)) assert.deepEqual(fs.readFileSync(dest), raw); else fs.writeFileSync(dest, raw, { flag: 'wx' }); }
for (const item of m.products) fs.copyFileSync(source + '/' + item.candidate, root + '/' + item.file);
const helperCount = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).length;
const receiptRel = 'docs/design/rust-r4ghi/' + newRun + '-promotion162.json', receiptRaw = Buffer.from(JSON.stringify({ kind: 'Root-exact-reviewed-UI-tool-promotion162', manifest: { file: rel + '/' + manifestLeaf, rawBytesSha256: approvedManifestSHA }, products: m.products,
  priorUnexecutedInput: { file: lp + '/' + oldInputLeaf, rawBytesSha256: approvedOldInputSHA }, newRun, businessHelperCount: helperCount, priorFailuresRewritten: false, acknowledgedCommandsReplayed: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'); fs.writeFileSync(root + '/' + receiptRel, receiptRaw, { flag: 'wx' });
for (const item of closure.files) { const raw = fs.readFileSync(root + '/' + prefix + item.relativeFile), product = m.products.find(p => p.file === prefix + item.relativeFile); assert.equal(sha(raw), product?.afterSHA256 ?? item.rawBytesSha256); item.rawBytesSha256 = sha(raw); item.bytes = raw.length; }
closure.priorCorrectiveClosure = { file: lp + '/' + priorClosureLeaf, rawBytesSha256: priorClosureSHA }; closure.correctionManifest = { file: lr + '/' + rel + '/' + manifestLeaf, rawBytesSha256: approvedManifestSHA }; closure.promotionReceipt = { file: lr + '/' + receiptRel, rawBytesSha256: sha(receiptRaw) };
const closureRaw = Buffer.from(JSON.stringify(closure, null, 2) + '\n'), closureLeaf = newRun + '-closure162.json'; fs.writeFileSync(ui + '/' + closureLeaf, closureRaw, { flag: 'wx', mode: 0o600 });
const input = JSON.parse(oldInputRaw.toString().replaceAll(originalInput.plan.uiRun, newRun)); input.promotedToolClosure = { file: lp + '/' + closureLeaf, rawBytesSha256: sha(closureRaw) };
const inputRaw = Buffer.from(JSON.stringify(input, null, 2) + '\n'), inputLeaf = newRun + '-prepare-input16.json'; fs.writeFileSync(ui + '/' + inputLeaf, inputRaw, { flag: 'wx', mode: 0o600 });
assert.deepEqual(fs.readFileSync(stateFile), stateRaw);
console.log(JSON.stringify({ promotedProducts: m.products.length, helperCount, newClosure: { file: lp + '/' + closureLeaf, rawBytesSha256: sha(closureRaw) }, newInput: { file: lp + '/' + inputLeaf, rawBytesSha256: sha(inputRaw) }, actualHTTPOrUIExecuted: false }));
