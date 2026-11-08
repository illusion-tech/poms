// FS-only preparation of sealed proposals and an exact prospective H1.
// No runtime helper, mutable state, DB or HTTP is changed here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const H = '/mnt/e/projects/worktrees/poms-r4h-signals/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business13/main01', O = D + '/tool119-h1-218';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!fs.existsSync(O));
const read = file => { const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); return fs.readFileSync(file); };
const write = (file, raw) => { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, raw, { flag: 'wx', mode: file.startsWith(P + '/') ? 0o600 : 0o644 }); assert.deepEqual(read(file), raw); return { file, rawBytesSha256: sha(raw) }; };
const nonce = randomUUID(), lock = D + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'FS-only-prepare-H1-218' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const stateRaw = read(D + '/state.json'); assert.equal(sha(stateRaw), '6ab38a685881557707d48c41270e891a3b5773abeb73c2156a9757d8bcf1f358');
  const h0 = JSON.parse(read(P + '/source13-preparation183/helperH0.json')), sources = JSON.parse(read(P + '/source13-preparation193/sourcePins.json'));
  const checkOriginal = () => { for (const p of [...sources, ...h0]) assert.equal(sha(read(R + '/' + p.file)), p.sha256); assert.equal(fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).length, 195); };
  checkOriginal(); const copies = [], manifests = [];
  for (const [name, manifestName, expected] of [
    ['resource-tool-admission119', 'manifest119-code01.json', 'e6ccd4a3e3b8787fe8e91f5e4a3a6fb5ff0efaf92b60332a5d47bf8103d4c70e'],
    ['resource-tool-admission119-02', 'manifest119-code02.json', '43b9c1b0a51a59b0286620bc225b2c4b5446d5cd1d0e4a9480b8fd46bcdf3eb9'],
  ]) {
    const relative = 'tools/rust-r4ghi/H/implementation/support-patches/' + name, raw = read(H + '/' + relative + '/' + manifestName); assert.equal(sha(raw), expected);
    const manifest = JSON.parse(raw), entries = [...manifest.files, ...manifest.bases, ...(manifest.support ?? []), ...(manifest.interface ? [manifest.interface] : [])];
    for (const p of entries) { const bytes = read(H + '/' + relative + '/' + p.file); assert.equal(sha(bytes), p.rawBytesSha256); copies.push(write(R + '/' + relative + '/' + p.file, bytes)); }
    manifests.push({ ...write(R + '/' + relative + '/' + manifestName, raw), value: manifest });
  }
  const periodFile = R + '/tools/rust-r4ghi/period205-04/manifest205-04.json', periodRaw = read(periodFile);
  assert.equal(sha(periodRaw), 'f2ec3aefe405e1dc6b4d7dd12762d0c682e518d0fe40142ad083b9a45ec52073');
  const period = JSON.parse(periodRaw), actual = manifests[1], graph = new Map(h0.map(p => [p.file, p.sha256])), targets = [];
  for (const product of actual.value.products) {
    const candidate = path.dirname(actual.file) + '/' + product.candidate, bytes = read(candidate); assert.equal(sha(bytes), product.afterSHA256);
    if (product.beforeSHA256 === null) assert(!fs.existsSync(R + '/' + product.file)); else assert.equal(sha(read(R + '/' + product.file)), product.beforeSHA256);
    targets.push({ file: product.file, beforeSHA256: product.beforeSHA256, candidate: { file: candidate, rawBytesSha256: product.afterSHA256 } });
    if (product.file.startsWith('tools/rust-r4ghi/business/')) graph.set(product.file, product.afterSHA256);
  }
  for (const product of period.changes) {
    assert(!targets.some(p => p.file === product.file), 'No conflicting composition');
    const candidate = R + '/' + product.after.file, bytes = read(candidate); assert.equal(sha(bytes), product.after.rawBytesSha256);
    const before = product.before?.rawBytesSha256 ?? null; if (before === null) assert(!fs.existsSync(R + '/' + product.file)); else assert.equal(sha(read(R + '/' + product.file)), before);
    targets.push({ file: product.file, beforeSHA256: before, candidate: { file: candidate, rawBytesSha256: product.after.rawBytesSha256 } }); graph.set(product.file, product.after.rawBytesSha256);
  }
  const H1 = [...graph].map(([file, sha256]) => ({ file, sha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0); assert.equal(H1.length, 198);
  fs.mkdirSync(O, { mode: 0o700 }); const forecast = write(O + '/H1-forecast218.json', Buffer.from(JSON.stringify(H1, null, 2) + '\n'));
  const receipt = write(O + '/preparation218.json', Buffer.from(JSON.stringify({ kind: 'FS-prepared-sealed-H119-02-plus-period205-04-prospective-H1',
    sourcePinsSHA256: '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e', originalH0Count: 195, prospectiveH1Count: H1.length,
    H1: forecast, H1ArraySHA256: sha(JSON.stringify(H1)), deltaManifests: [{ file: actual.file, rawBytesSha256: sha(read(actual.file)) }, { file: periodFile, rawBytesSha256: sha(periodRaw) }],
    copiedSealedProposalFiles: copies.length + manifests.length, targets, RootRuntimeHelpersChanged: false, H1Admitted: false,
    finalIndependentReview: null, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n'));
  checkOriginal(); assert.deepEqual(read(D + '/state.json'), stateRaw);
  console.log(JSON.stringify({ preparation: receipt, prospectiveH1: forecast, prospectiveH1Count: 198, copiedProposalFiles: copies.length + manifests.length, RootRuntimeHelpersChanged: false, H1Admitted: false }));
} finally { const owner = JSON.parse(read(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }
