// Root actual E1 acceptance. This runner never removes the real aliases.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { replayE1 } from './e1-replay01.mjs';
import { buildArchiveIndex, readCanonicalPin, verifyPinnedBytes } from './e1-resolver01.mjs';
import { ARCHIVE_AUTHORITY, E1_INPUTS, NATIVE_OPENAPI } from './e1-registry01.mjs';
import { e1IndexCases } from './e1-cases01.mjs';
import { pin } from './source-guard.mjs';
const mode = process.argv[2]; assert(['before', 'after'].includes(mode));
const root = process.cwd(), out = 'tmp/rust-r3m/e1-' + mode + '-linux02'; assert(!fs.existsSync(out)); fs.mkdirSync(out);
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
const sources = fs.readdirSync('tools/rust-r3m').filter(n => n.startsWith('e1-')).map(n => pin('tools/rust-r3m/' + n));
const d = JSON.parse(fs.readFileSync('tmp/rust-r3m/input-d/g1-input01.json'));
const legacy = d.E1.consumers.map(x => x.source); assert.equal(legacy.length, 23);
for (const p of legacy) assert.deepEqual(pin(p.file), p);
const sha = b => createHash('sha256').update(b).digest('hex'), cases = [];
const requireCode = (name, fn, code) => {
  let seen;
  try { fn(); } catch (e) { seen = { name: e.name, code: e.code }; }
  assert(seen, name + ': expected rejection'); assert.equal(seen.code, code, name);
  cases.push({ name, passed: true, observed: seen, expectedCode: code });
};
let completed = false, error = null, replay = null;
try {
  for (const c of e1IndexCases) {
    const bytes = Buffer.from(JSON.stringify(c.map));
    const authority = { file: 'docs/design/archive/slices/e1-lab/map.json', bytes: bytes.length, rawBytesSha256: sha(bytes) };
    const fn = () => buildArchiveIndex([{ pin: authority, rawBytes: bytes }]).resolve(c.input);
    if (c.expectedCode) requireCode(c.name, fn, c.expectedCode);
    else { const actual = fn(); assert.deepEqual(actual.canonical, c.expectedCanonical); assert.equal(actual.kind, c.expectedKind); cases.push({ name: c.name, passed: true, actual }); }
  }
  const tiny = Buffer.from('{}'), tinyPin = { file: 'docs/design/archive/slices/e1-lab/value.json', bytes: 2, rawBytesSha256: sha(tiny) };
  requireCode('authority-wrong-hash-before-parse', () => buildArchiveIndex([{ pin: { ...tinyPin, rawBytesSha256: '0'.repeat(64) }, rawBytes: tiny }]), 'E1_CONTENT_MISMATCH');
  requireCode('authority-wrong-length-before-parse', () => buildArchiveIndex([{ pin: { ...tinyPin, bytes: 3 }, rawBytes: tiny }]), 'E1_CONTENT_MISMATCH');
  requireCode('payload-wrong-hash', () => verifyPinnedBytes(tinyPin, Buffer.from('[]')), 'E1_CONTENT_MISMATCH');
  requireCode('payload-wrong-length', () => verifyPinnedBytes(tinyPin, Buffer.from('{}\n')), 'E1_CONTENT_MISMATCH');
  const lab = path.resolve('tmp/rust-r3m/e1-lab-' + mode + '-linux02'); assert(!fs.existsSync(lab));
  const canonical = path.join(lab, 'docs/design/archive/slices/e1-lab'); fs.mkdirSync(canonical, { recursive: true });
  fs.mkdirSync(path.join(canonical, 'directory.json'));
  requireCode('directory-cannot-be-canonical-file', () => readCanonicalPin(lab, { ...tinyPin, file: 'docs/design/archive/slices/e1-lab/directory.json' }), 'E1_NOT_REGULAR');
  const outside = path.join(lab, 'owned-outside-canonical'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'value.json'), tiny, { flag: 'wx' });
  fs.symlinkSync(outside, path.join(canonical, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  requireCode('symlink-or-junction-ancestor-is-rejected', () => readCanonicalPin(lab, { ...tinyPin, file: 'docs/design/archive/slices/e1-lab/link/value.json' }), 'E1_UNSAFE_PATH');
  const native = fs.readFileSync(NATIVE_OPENAPI.file); verifyPinnedBytes(NATIVE_OPENAPI, native);
  if (mode === 'before') {
    let refused; try { await replayE1({ repositoryRoot: root, nativeOpenAPIRawBytes: native }); } catch (e) { refused = e.code; }
    assert.equal(refused, 'E1_ALIAS_PRESENT'); cases.push({ name: 'default-refuses-existing-aliases', passed: true, code: refused });
    for (const p of Object.values(E1_INPUTS)) { const st = fs.lstatSync(p.file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.deepEqual(pin(p.file), p); }
  } else for (const p of Object.values(E1_INPUTS)) assert(!fs.existsSync(p.file), p.file);
  replay = await replayE1({ repositoryRoot: root, nativeOpenAPIRawBytes: native, requireAliasesAbsent: mode === 'after' });
  assert(replay.allReplayAssertionsPassed); assert.equal(replay.aliasStateAfter.allAbsent, mode === 'after');
  cases.push({ name: 'actual-manifest-projection-and-four-fixture-replays', passed: true, resultSHA256: replay.resultSHA256 });
  for (const p of legacy) assert.deepEqual(pin(p.file), p);
  for (const p of sources) assert.deepEqual(pin(p.file), p);
  assert.deepEqual(pin(ARCHIVE_AUTHORITY.file), ARCHIVE_AUTHORITY);
  completed = true;
} catch (e) { error = { name: e.name, code: e.code || null, message: e.message }; fs.writeFileSync(out + '/error-original.json', JSON.stringify({ ...error, stack: e.stack }, null, 2) + '\n', { flag: 'wx' }); process.exitCode = 1; }
const report = { kind: 'R3-E1-actual-supported-replay-acceptance', mode, completed, cases, replay, error, sources, legacySources: legacy, legacyCount: 23, additionalLogicalRegistryFiles: 1, realAliasesRemovedByThisRunner: false, canonicalAndLegacyBytesUnchanged: completed, E1ExitCertified: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(out + '/report01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ mode, completed, cases: cases.length, error, supportedReplaySHA256: replay?.resultSHA256 || null, E1ExitCertified: false }));
