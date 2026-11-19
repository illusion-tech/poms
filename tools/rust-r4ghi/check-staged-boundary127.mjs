import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', git = args => execFileSync('git', args, { cwd: root, maxBuffer: 20000000, windowsHide: true });
const sha = b => createHash('sha256').update(b).digest('hex'), priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const planned = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4ghi/root/implementation-checkpoint124-02/stage-plan.json'));
const actual = git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort();
const extra = ['tools/rust-r4ghi/.gitattributes', 'tools/rust-r4ghi/check-staged-boundary127.mjs']; assert.deepEqual(actual, [...planned.files.map(p => p.file), ...extra].sort());
const needles = [];
for (const name of ['owner-password', 'jwt-secret', 'native-app-password', 'rust-app-password']) needles.push(fs.readFileSync(priv + '/' + name, 'utf8').trim());
const states = ['business/g2-business12/main01/state.json', 'retention/epoch10-before-correction53/state-at-retention53.json', 'retention/epoch11-before-noop70/state-at-retention70.json',
  'native-reference92/source12-native01/cleanup92-02/source-state43.json', 'native-reference92/source12-native01/state.json'];
for (const relative of states) { const state = JSON.parse(fs.readFileSync(priv + '/' + relative)); for (const actor of Object.values(state.actors ?? {})) { if (typeof actor.password === 'string' && actor.password.length >= 16) needles.push(actor.password); for (const value of Object.values(actor.cookies ?? {})) if (typeof value === 'string' && value.length >= 16) needles.push(value, decodeURIComponent(value)); } }
const currentNativeCredentials = JSON.parse(fs.readFileSync(priv + '/native-reference92/source12-native01/http-credentials.json')); needles.push(currentNativeCredentials.password);
const values = [...new Set(needles)].filter(v => v.length >= 8).map(v => Buffer.from(v)); const inputs = [];
for (const file of actual) { const bytes = git(['show', ':' + file]); assert.deepEqual(bytes, fs.readFileSync(root + '/' + file), 'Index must preserve actual working bytes: ' + file);
  const old = planned.files.find(p => p.file === file); if (old) assert.equal(sha(bytes), old.rawBytesSha256, 'Planned byte drift: ' + file);
  assert(!values.some(value => bytes.includes(value)), 'An actual namespace secret occurs in staged file: ' + file);
  inputs.push({ file, bytes: bytes.length, rawBytesSha256: sha(bytes) }); }
const tree = git(['write-tree']).toString().trim(), file = root + '/tmp/rust-r4ghi/root/staged-boundary127.json';
fs.writeFileSync(file, JSON.stringify({ kind: 'actual-index-raw-byte-and-owned-namespace-secret-boundary127', stagedTree: tree, inputs, matchedActualSecrets: 0,
  scope: 'Exact current/retained owned-namespace credentials and cookies only; not a general security certification', productSourceChanged: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ stagedFiles: actual.length, stagedTree: tree, allIndexRawBytesExact: true, actualSecretMatches: 0, compiledArtifactsStaged: false }));
