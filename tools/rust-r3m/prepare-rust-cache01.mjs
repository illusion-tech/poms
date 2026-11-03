// Root copies only public crate/build caches into the new owned namespace.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { base, pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', state = '/home/wangzishi/.local/share/poms-r3m';
const previous = '/home/wangzishi/.local/share/poms-r3hijk';
assert.equal(process.cwd(), root);
const identity = JSON.parse(fs.readFileSync(state + '/identity.json')); assert.equal(identity.base, base); assert.equal(identity.namespace, 'poms-r3m');
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
assert(!fs.existsSync(state + '/cargo-home'));
const out = 'tmp/rust-r3m/rust-cache01'; assert(!fs.existsSync(out)); fs.mkdirSync(out);
const pairs = [['cargo-home/registry', 'registry'], ['cargo-home/git', 'git'], ['target', 'build-target']];
const rows = [], skippedSymlinks = [];
function allowed(file) {
  assert(file.startsWith(previous + '/cargo-home/') || file.startsWith(previous + '/target'));
  const st = fs.lstatSync(file);
  if (st.isSymbolicLink()) { skippedSymlinks.push(file); return false; }
  if (file.split('/').includes('incremental')) return false;
  // Preserve the admitted diagnostic executable; the original remains in artifacts/.
  if (file === previous + '/target/release/poms-api-rust') return false;
  return true;
}
async function hash(file) { const h = createHash('sha256'); for await (const chunk of fs.createReadStream(file)) h.update(chunk); return h.digest('hex'); }
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const p = dir + '/' + e.name; if (!allowed(p)) return []; return e.isDirectory() ? files(p) : [p]; }).sort(); }
const copied = [];
for (const [relative, label] of pairs) {
  const from = previous + '/' + relative, to = state + '/' + relative; assert(fs.existsSync(from));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, preserveTimestamps: true, mode: fs.constants.COPYFILE_FICLONE, filter: allowed });
  const list = files(from); let bytes = 0;
  for (const source of list) {
    const target = to + source.slice(from.length), before = fs.statSync(source);
    const hashes = await Promise.all([hash(source), hash(target)]);
    const after = fs.statSync(source), dest = fs.statSync(target);
    assert.equal(before.size, after.size); assert.equal(before.mtimeMs, after.mtimeMs); assert.equal(hashes[0], hashes[1]); assert.equal(dest.size, before.size);
    rows.push({ source, target, bytes: before.size, rawBytesSha256: hashes[0] }); bytes += before.size;
  }
  copied.push({ label, from, to, files: list.length, bytes, sourceReadOnly: true, allCopiedRegularBytesSha256Equal: true });
  console.log(JSON.stringify({ cache: label, files: list.length, bytes, allSha256Equal: true }));
}
fs.writeFileSync(out + '/copy-raw-manifest01.json', JSON.stringify({ kind: 'R3-public-cache-copy-raw-byte-manifest', rows, skippedSymlinks: [...new Set(skippedSymlinks)].sort() }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + '/report01.json', JSON.stringify({ kind: 'R3-new-owned-public-Rust-caches', base, copied, rawManifest: pin(out + '/copy-raw-manifest01.json'), oldPrivateRead: false, credentialsCopied: false, sourceCachesModified: false, cacheIsAcceptanceEvidence: false }, null, 2) + '\n', { flag: 'wx' });
