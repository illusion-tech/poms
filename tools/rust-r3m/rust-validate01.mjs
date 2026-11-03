// Root alone formats, lints, tests and builds the integrated source candidate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { base, admission, guardNative, pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', state = '/home/wangzishi/.local/share/poms-r3m';
assert.equal(process.cwd(), root);
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
assert.equal(fs.realpathSync(state + '/target'), state + '/target');
const out = 'tmp/rust-r3m/rust-check01'; assert(!fs.existsSync(out)); fs.mkdirSync(out);
const m = admission(), beforeWin = [...m.rustFiles.map(p => p.file), ...m.protectedAllowedG2Deltas].map(file => ({ ...pin(win + '/' + file), file }));
for (const p of beforeWin) { fs.mkdirSync(path.dirname(root + '/' + p.file), { recursive: true }); fs.copyFileSync(win + '/' + p.file, root + '/' + p.file); }
const extra = new Map(), queue = m.rustFiles.filter(p => p.file.endsWith('.rs')).map(p => p.file), scanned = new Set();
function admit(file) {
  file = path.posix.normalize(file); assert(!file.startsWith('../') && !path.posix.isAbsolute(file) && !file.includes('/private/'));
  assert(fs.existsSync(file), 'Compilation input missing: ' + file);
  if (!m.rustFiles.some(p => p.file === file)) extra.set(file, pin(file));
  if (file.endsWith('.rs') && !scanned.has(file)) queue.push(file);
}
const cargo = fs.readFileSync('apps/poms-api-rust/Cargo.toml', 'utf8');
for (const match of cargo.matchAll(/^path\s*=\s*"([^"]+)"/gm)) admit(path.posix.join('apps/poms-api-rust', match[1]));
while (queue.length) {
  const file = queue.shift(); if (scanned.has(file)) continue; scanned.add(file);
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/include_(?:str|bytes)!\(\s*"([^"]+)"\s*\)/g)) admit(path.posix.join(path.posix.dirname(file), match[1]));
  for (const match of text.matchAll(/#\[path\s*=\s*"([^"]+)"\]/g)) admit(path.posix.join(path.posix.dirname(file), match[1]));
}
const extraInputs = [...extra.values()].sort((a, b) => a.file.localeCompare(b.file));
const before = [...m.rustFiles.map(p => pin(p.file)), ...m.protectedAllowedG2Deltas.map(pin), ...extraInputs];
const buildCapsule = { kind: 'R3-build-source-admission', base, label: 'build01', productFiles: before, allowedProtectedDeltas: m.protectedAllowedG2Deltas.map(pin), artifact: null, stageIntegrationComplete: false };
fs.writeFileSync('tmp/rust-r3m/root/candidate-build01.json', JSON.stringify(buildCapsule, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync('tmp/rust-r3m/root/current-candidate.json', JSON.stringify(buildCapsule, null, 2) + '\n');
guardNative();
const env = {};
for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, { PATH: '/home/wangzishi/.cargo/bin:' + env.PATH, CARGO_HOME: state + '/cargo-home', CARGO_TARGET_DIR: state + '/target', CARGO_NET_OFFLINE: 'true' });
const commands = [];
function run(name, args) {
  const stdout = fs.openSync(out + '/' + name + '-stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/' + name + '-stderr-original.bin', 'wx');
  let result; const startedAt = new Date().toISOString();
  try { result = spawnSync('/home/wangzishi/.cargo/bin/cargo', ['+1.99.1', ...args], { cwd: root + '/apps/poms-api-rust', env, stdio: ['ignore', stdout, stderr], timeout: 300000 }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  commands.push({ name, args, startedAt, completedAt: new Date().toISOString(), exitCode: result.status, errorName: result.error?.name || null, stdout: pin(out + '/' + name + '-stdout-original.bin'), stderr: pin(out + '/' + name + '-stderr-original.bin') });
  console.log(JSON.stringify({ name, exitCode: result.status, errorName: result.error?.name || null }));
  return result.status === 0;
}
let ok = run('clean-own-package', ['clean', '-p', 'poms-api-rust']);
if (ok) ok = run('cargo-fmt', ['fmt', '--all']);
if (ok) {
  for (const p of beforeWin) assert.deepEqual({ ...pin(win + '/' + p.file), file: p.file }, p, 'Root or author changed sources during formatting');
  for (const p of extraInputs) assert.deepEqual(pin(p.file), p, 'Formatter changed a historical external input; inspect before adopting');
  for (const p of m.rustFiles) fs.copyFileSync(root + '/' + p.file, win + '/' + p.file);
  ok = run('cargo-clippy', ['clippy', '--locked', '--offline', '--all-targets', '--', '-D', 'warnings']);
}
if (ok) ok = run('cargo-test', ['test', '--locked', '--offline', '--all-targets']);
if (ok) ok = run('cargo-release', ['build', '--release', '--locked', '--offline']);
const after = [...m.rustFiles.map(p => pin(p.file)), ...m.protectedAllowedG2Deltas.map(pin), ...extraInputs.map(p => pin(p.file))];
const executable = state + '/target/release/poms-api-rust';
const receipt = { kind: 'R3-closeout-integrated-Rust-checks', base, source: pin('tools/rust-r3m/rust-validate01.mjs'), before, after, additionalCompilationResources: extraInputs, commands, allExecutedChecksPassed: ok, artifact: ok ? pin(executable) : null, actualBusinessStageAcceptance: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(out + '/report01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
if (ok) {
  const binary = state + '/artifacts/final01-poms-api-rust'; fs.copyFileSync(executable, binary, fs.constants.COPYFILE_EXCL); fs.chmodSync(binary, 0o500);
  const capsule = { kind: 'R3-closeout-current-source-candidate', base, label: 'final01', productFiles: after, allowedProtectedDeltas: m.protectedAllowedG2Deltas.map(pin), artifact: pin(binary), currentRuntimeEntry: pin(executable), build: pin(out + '/report01.json'), stageIntegrationComplete: false };
  fs.writeFileSync('tmp/rust-r3m/root/candidate-final01.json', JSON.stringify(capsule, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync('tmp/rust-r3m/root/current-candidate.json', JSON.stringify(capsule, null, 2) + '\n');
}
for (const p of ['tmp/rust-r3m/root/candidate-build01.json', ...(ok ? ['tmp/rust-r3m/root/candidate-final01.json', 'tmp/rust-r3m/root/current-candidate.json'] : [])]) fs.copyFileSync(p, win + '/' + p);
fs.cpSync(out, win + '/' + out, { recursive: true });
if (!ok) process.exitCode = 1;
