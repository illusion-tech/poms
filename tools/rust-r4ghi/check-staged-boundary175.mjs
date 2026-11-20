import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', git = args => execFileSync('git', args, { cwd: root, windowsHide: true, maxBuffer: 20000000 }), sha = value => createHash('sha256').update(value).digest('hex');
const plan = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4ghi/root/implementation-checkpoint172/stage-plan.json')), files = git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort();
const extras = ['tools/rust-r4ghi/.gitattributes', 'tools/rust-r4ghi/check-planned-secrets174.mjs', 'tools/rust-r4ghi/check-staged-boundary175.mjs']; assert.deepEqual(files, [...new Set([...plan.files.map(entry => entry.file), ...extras])].sort());
assert(!files.some(file => /^(?:apps|libs)\//.test(file))); const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', needles = [];
for (const name of ['owner-password', 'jwt-secret', 'native-app-password', 'rust-app-password']) needles.push(fs.readFileSync(priv + '/' + name, 'utf8').trim());
for (const name of ['business/g2-business12/main01/state.json', 'retention/epoch10-before-correction53/state-at-retention53.json', 'retention/epoch11-before-noop70/state-at-retention70.json', 'retention/epoch12-before-source13-139/state-at-retention139.json', 'native-reference92/source12-native01/state.json']) {
  const state = JSON.parse(fs.readFileSync(priv + '/' + name)); for (const actor of Object.values(state.actors ?? {})) { if (typeof actor.password === 'string' && actor.password.length >= 8) needles.push(actor.password); for (const value of Object.values(actor.cookies ?? {})) if (typeof value === 'string' && value.length >= 8) needles.push(value, decodeURIComponent(value)); }
}
needles.push(JSON.parse(fs.readFileSync(priv + '/native-reference92/source12-native01/http-credentials.json')).password); const values = [...new Set(needles)].filter(value => value.length >= 8).map(value => Buffer.from(value)), inputs = [];
for (const file of files) { const raw = git(['show', ':' + file]); assert.deepEqual(raw, fs.readFileSync(root + '/' + file)); const planned = plan.files.find(entry => entry.file === file); if (planned) assert.equal(sha(raw), planned.rawBytesSha256);
  assert(!values.some(value => raw.includes(value)), 'Actual namespace credential occurs in staged file: ' + file); assert(!(raw[0] === 0x7f && raw.subarray(1, 4).toString() === 'ELF') && raw.subarray(0, 2).toString() !== 'MZ'); inputs.push({ file, bytes: raw.length, rawBytesSha256: sha(raw) }); }
const tree = git(['write-tree']).toString().trim(), raw = Buffer.from(JSON.stringify({ kind: 'actual-staged-Source12-tail-checkpoint175-boundary', stagedTree: tree, inputs, indexEqualsOriginalWorkingBytes: true, matchedActualNamespaceSecrets: 0, compiledArtifactsStaged: false,
  scope: 'Exact owned namespace values and index byte checks only; no broad security certification', productSourceChanged: false, Source13OrM98Applied: false, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/tmp/rust-r4ghi/root/staged-boundary175.json', raw, { flag: 'wx' }); console.log(JSON.stringify({ stagedFiles: inputs.length, stagedTree: tree, allIndexRawBytesExact: true, actualNamespaceSecretMatches: 0, compiledArtifactsStaged: false, productSourceChanged: false }));
