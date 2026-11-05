// Root unified source checks, using the isolated public Linux acceptance copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const mode = process.argv[2], edition = process.argv[3] ?? '27'; assert(['check', 'clippy', 'test', 'full-test', 'summary-build', 'build'].includes(mode)); assert(/^\d+[a-z]?$/.test(edition));
const root = '/home/wangzishi/projects/poms-rust-r4def', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const out = `${win}/tmp/rust-r4def/root/rust-${mode}${edition}`; assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const env = {};
for (const key of ['HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { PATH: '/home/wangzishi/.cargo/bin:/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_TARGET_DIR: '/home/wangzishi/.cache/poms-r4def-target-ROOT', CARGO_BUILD_JOBS: '2' });
const args = ['+1.99.1', mode==='full-test'?'test':mode==='summary-build'?'build':mode, '--locked', '--offline', '--manifest-path', 'apps/poms-api-rust/Cargo.toml'];
if (mode === 'check') args.push('--lib'); if (mode === 'clippy') args.push('--lib', '--no-deps', '--', '-D', 'warnings'); if (mode === 'test') args.push('--lib'); if (mode === 'build') args.push('--bin', 'poms-api-rust');
if (mode === 'summary-build') args.push('--example','r4def_summary_producer32');
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; };
const inputs = [];
function scan(dir) { for (const e of fs.readdirSync(root + '/' + dir, { withFileTypes: true })) { const p = dir + '/' + e.name; if (e.isDirectory()) scan(p); else if (e.isFile()) inputs.push(pin(root + '/' + p)); } }
scan('apps/poms-api-rust/src');
for (const f of ['apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'libs/shared/api-spec/openapi.json', 'tools/rust-r4def/combined-operation-map16.json', 'tools/rust-r4def/validation-input18.json', 'tools/rust-r4def/component-overrides27.json']) inputs.push(pin(root + '/' + f));
const stdout = fs.openSync(out + '/stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/stderr-original.bin', 'wx'); let result;
const startedAt = new Date().toISOString();
try { result = spawnSync('/home/wangzishi/.cargo/bin/cargo', args, { cwd: root, env, stdio: ['ignore', stdout, stderr], timeout: 600000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const stable = inputs.every(p => pin(p.file).sha256 === p.sha256);
const receipt = { kind: 'R4-DEF-unified-Rust-' + mode, startedAt, completedAt: new Date().toISOString(), root, args, exitCode: result.status, errorName: result.error?.name ?? null, inputs, sourceStable: stable, stdout: pin(out + '/stdout-original.bin'), stderr: pin(out + '/stderr-original.bin'), cargoHome: env.CARGO_HOME, target: env.CARGO_TARGET_DIR, databaseOptInEnvironmentInherited: false };
fs.writeFileSync(out + '/receipt27.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ mode, exitCode: result.status, sourceStable: stable, receipt: out + '/receipt27.json' }));
if (result.status !== 0) { console.log(fs.readFileSync(out + '/stderr-original.bin', 'utf8').slice(-7500)); process.exitCode = 1; }
