// Root reuses only the public exact-source executable for pre-fix diagnostics.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { base, admission, guardNative, pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const state = '/home/wangzishi/.local/share/poms-r3m';
assert.equal(process.cwd(), root);
const gate = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json'));
assert(gate.G1Certified && gate.G2Authorized);
const identity = JSON.parse(fs.readFileSync(state + '/identity.json'));
assert.equal(identity.base, base); assert.equal(identity.namespace, 'poms-r3m');
guardNative();
const oldManifestFile = 'docs/design/archive/slices/rust-r3hijk/g3-input-manifest03.json';
const oldBuildFile = 'docs/design/archive/slices/rust-r3hijk/evidence/rust-check11/report01.json';
const oldManifest = JSON.parse(fs.readFileSync(oldManifestFile)), build = JSON.parse(fs.readFileSync(oldBuildFile));
assert.equal(oldManifest.productInputs.length, 235);
for (const p of oldManifest.productInputs) assert.deepEqual(pin(p.file), p);
assert(build.allExecutedChecksPassed);
assert.equal(build.artifact.rawBytesSha256, '66db94ce84778e4cbf7b1141b34ba5211ecc229ff40f17f8950933d5034aef67');
assert.deepEqual(pin(build.artifact.file), build.artifact);
const manifest = admission();
for (const p of manifest.rustFiles) assert.deepEqual(pin(p.file), p);
for (const dir of [state + '/artifacts', state + '/target/release']) fs.mkdirSync(dir, { recursive: true });
const binary = state + '/artifacts/baseline01-poms-api-rust';
fs.copyFileSync(build.artifact.file, binary, fs.constants.COPYFILE_EXCL);
fs.copyFileSync(binary, state + '/target/release/poms-api-rust', fs.constants.COPYFILE_EXCL);
fs.chmodSync(binary, 0o500); fs.chmodSync(state + '/target/release/poms-api-rust', 0o500);
assert.equal(pin(binary).rawBytesSha256, build.artifact.rawBytesSha256);
const capsule = {
  kind: 'R3-closeout-pre-fix-diagnostic-candidate', base, label: 'baseline01',
  candidatePurpose: 'Actual new-namespace pre-fix witnesses only; no final-stage certification',
  G1Authority: pin('docs/design/rust-r3m/g1-gate-authority01.json'),
  artifact: pin(binary), currentRuntimeEntry: pin(state + '/target/release/poms-api-rust'),
  sourceReuseProof: { oldManifest: pin(oldManifestFile), oldBuild: pin(oldBuildFile), unchangedOldProductPins: 235, currentRustProjectPins: manifest.rustFiles.length, additionalFiles: 'README, gitignore and three standalone examples are not runtime binary inputs', historicalRunCountsNotRecounted: true },
  productFiles: [...manifest.rustFiles, ...manifest.protectedAllowedG2Deltas.map(pin)],
  allowedProtectedDeltas: [], stageIntegrationComplete: false,
};
for (const file of ['tmp/rust-r3m/root/candidate-baseline01.json', 'tmp/rust-r3m/root/current-candidate.json']) {
  fs.writeFileSync(file, JSON.stringify(capsule, null, 2) + '\n', { flag: 'wx' });
  fs.copyFileSync(file, win + '/' + file, fs.constants.COPYFILE_EXCL);
}
console.log(JSON.stringify({ baseline: 'baseline01', exactOldProductPins: 235, actualCurrentRustPins: manifest.rustFiles.length, binarySha256: capsule.artifact.rawBytesSha256, previousPrivateRead: false, currentStageAcceptance: false }));
