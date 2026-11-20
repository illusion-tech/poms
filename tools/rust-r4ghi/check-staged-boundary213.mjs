import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const git = args => execFileSync('git', args, { cwd: R, windowsHide: true, maxBuffer: 30000000 });
const sha = value => createHash('sha256').update(value).digest('hex');
const plan = JSON.parse(fs.readFileSync(R + '/tmp/rust-r4ghi/root/implementation-checkpoint212/stage-plan.json'));
const files = git(['diff', '--cached', '--name-only', '-z']).toString().split('\0').filter(Boolean).sort(); assert.deepEqual(files, plan.files.map(p => p.file));
assert(!files.some(file => file.includes('/shadow-business/')));
const needles = ['owner-password', 'jwt-secret', 'native-app-password', 'rust-app-password'].map(file => fs.readFileSync(P + '/' + file, 'utf8').trim());
for (const file of ['business/g2-business13/main01/state.json', 'business/g2-business12/main01/state.json', 'retention/epoch10-before-correction53/state-at-retention53.json', 'retention/epoch11-before-noop70/state-at-retention70.json', 'retention/epoch12-before-source13-139/state-at-retention139.json', 'native-reference92/source12-native01/state.json']) {
  const state = JSON.parse(fs.readFileSync(P + '/' + file));
  for (const actor of Object.values(state.actors ?? {})) { if (actor.password?.length >= 8) needles.push(actor.password); for (const value of Object.values(actor.cookies ?? {})) if (typeof value === 'string' && value.length >= 8) needles.push(value, decodeURIComponent(value)); }
}
needles.push(JSON.parse(fs.readFileSync(P + '/native-reference92/source12-native01/http-credentials.json')).password);
const values = [...new Set(needles)].filter(value => value.length >= 8).map(value => Buffer.from(value)), inputs = [];
for (const entry of plan.files) {
  const raw = git(['show', ':' + entry.file]); assert.deepEqual(raw, fs.readFileSync(R + '/' + entry.file)); assert.equal(sha(raw), entry.rawBytesSha256);
  assert(!values.some(value => raw.includes(value)), 'Actual namespace secret in staged file: ' + entry.file);
  assert(!(raw[0] === 0x7f && raw.subarray(1, 4).toString() === 'ELF') && raw.subarray(0, 2).toString() !== 'MZ');
  inputs.push({ file: entry.file, bytes: raw.length, rawBytesSha256: sha(raw) });
}
for (const item of [...JSON.parse(fs.readFileSync(P + '/source13-preparation193/sourcePins.json')), ...JSON.parse(fs.readFileSync(P + '/source13-preparation183/helperH0.json'))]) assert.equal(sha(fs.readFileSync(R + '/' + item.file)), item.sha256);
const tree = git(['write-tree']).toString().trim(), receipt = { kind: 'actual-staged-Source13-M98-H0-checkpoint213-boundary', stagedTree: tree, inputs,
  indexEqualsOriginalWorkingBytes: true, matchedActualNamespaceSecrets: 0, compiledArtifactsStaged: false, Source13AndM98Applied: true,
  actual416And195Unchanged: true, temporaryShadowNotPublished: true, originalFailedLogsPreserved: true, G3Certified: false, G4Certified: false };
fs.writeFileSync(R + '/tmp/rust-r4ghi/root/staged-boundary213.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ stagedFiles: inputs.length, stagedTree: tree, allIndexRawBytesExact: true, actualNamespaceSecretMatches: 0, actual416And195Unchanged: true, compiledArtifactsStaged: false }));
