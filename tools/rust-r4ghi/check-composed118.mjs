// Materialize the unapplied ten-file correction in an isolated compile directory.
// This cannot advance Source12, issue gates, schema, or the running API binary.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform, 'linux');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror = '/home/wangzishi/projects/poms-rust-r4ghi';
const dir = '/home/wangzishi/.local/share/poms-r4ghi/proposals/composed106-check01', out = root + '/tmp/rust-r4ghi/root/composed118';
const sha = b => createHash('sha256').update(b).digest('hex');
const manifestBytes = fs.readFileSync(root + '/tools/rust-r4ghi/corrective-composed106/manifest106.json');
assert.equal(sha(manifestBytes), '5adc6d8b0179b5d2505e318d24101d400fde725dfcd48384c4d8189143d97b27');
const manifest = JSON.parse(manifestBytes); assert.equal(manifest.files.length, 10); assert(!fs.existsSync(dir)); assert(!fs.existsSync(out));
const files = new Set(['apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'libs/shared/api-spec/openapi.json',
  'tools/rust-r2l/l-shared-uow-probe.rs', 'tools/rust-r2m/shared-uow-probe.rs', 'tools/rust-r2m/number-probe.rs']);
function scan(relative) { for (const ent of fs.readdirSync(root + '/' + relative, { withFileTypes: true })) { const f = relative + '/' + ent.name; if (ent.isDirectory()) scan(f); else { assert(ent.isFile()); files.add(f); } } }
scan('apps/poms-api-rust/src'); scan('apps/poms-api-rust/tests');
for (const p of JSON.parse(fs.readFileSync(mirror + '/.poms-r4ghi-include-inputs.json'))) { assert.equal(sha(fs.readFileSync(root + '/' + p.file)), p.rawBytesSha256); files.add(p.file); }
const inputs = [];
for (const file of [...files].sort()) { const b = fs.readFileSync(root + '/' + file), dest = dir + '/' + file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b, { flag: 'wx' }); inputs.push({ file, beforeSHA256: sha(b), afterSHA256: sha(b) }); }
for (const p of manifest.files) {
  assert.equal(p.beforeSHA256 === null ? null : sha(fs.readFileSync(root + '/' + p.file)), p.beforeSHA256);
  const b = fs.readFileSync(root + '/tools/rust-r4ghi/corrective-composed106/' + p.candidate); assert.equal(sha(b), p.afterSHA256);
  if (!p.file.startsWith('apps/poms-api-rust/')) continue;
  const dest = dir + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b, { flag: p.beforeSHA256 === null ? 'wx' : 'w' });
  const item = inputs.find(i => i.file === p.file); if (item) item.afterSHA256 = sha(b); else inputs.push({ file: p.file, beforeSHA256: null, afterSHA256: sha(b) });
}
inputs.sort((a, b) => a.file.localeCompare(b.file)); fs.mkdirSync(out, { recursive: true });
const env = Object.fromEntries(['HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_TARGET_DIR: '/home/wangzishi/.cache/poms-r4ghi-composed118-target', CARGO_BUILD_JOBS: '2' });
const results = [];
for (const mode of ['fmt', 'clippy', 'test', 'build']) {
  const args = ['+1.99.1', mode, '--manifest-path', 'apps/poms-api-rust/Cargo.toml'];
  if (mode === 'fmt') args.push('--check'); else args.push('--locked', '--offline');
  if (mode === 'clippy') args.push('--lib', '--no-deps', '--', '-D', 'warnings'); if (mode === 'build') args.push('--bin', 'poms-api-rust');
  const stdout = fs.openSync(out + '/' + mode + '-stdout.log', 'wx'), stderr = fs.openSync(out + '/' + mode + '-stderr.log', 'wx'), startedAt = new Date().toISOString();
  console.log(JSON.stringify({ started: mode, isolatedUnappliedProposal: true }));
  let r; try { r = spawnSync('/home/wangzishi/.cargo/bin/cargo', args, { cwd: dir, env, stdio: ['ignore', stdout, stderr], timeout: 900000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  const stable = inputs.every(i => sha(fs.readFileSync(dir + '/' + i.file)) === i.afterSHA256 && (i.beforeSHA256 === null ? !fs.existsSync(root + '/' + i.file) : sha(fs.readFileSync(root + '/' + i.file)) === i.beforeSHA256));
  const result = { mode, args, startedAt, completedAt: new Date().toISOString(), exitCode: r.status, errorCode: r.error?.code ?? null, sourceStable: stable };
  results.push(result); fs.writeFileSync(out + '/' + mode + '-receipt.json', JSON.stringify({ kind: 'isolated-unapplied-composition106-static-check118', ...result, manifestSHA256: sha(manifestBytes), directory: dir, inputs, ambientDatabaseOptInInherited: false, productCandidateApplied: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result)); if (r.status !== 0 || !stable) { process.exitCode = 1; break; }
}
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'isolated-composition106-check118', results, directory: dir, target: env.CARGO_TARGET_DIR, actualProductStillSource12: true, SQLHTTPExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
