// Actual unified Rust check. No database opt-ins or credentials inherited.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const edition = process.argv[2]; assert(/^\d{2}$/.test(edition));
const root = '/home/wangzishi/projects/poms-rust-r4ghi';
const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const out = win + '/tmp/rust-r4ghi/root/business-cargo-check' + edition;
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = JSON.parse(fs.readFileSync(root + '/.poms-r4ghi-inputs.json', 'utf8')).filter(item => item.file.startsWith('apps/poms-api-rust/') || JSON.parse(fs.readFileSync(root + '/.poms-r4ghi-include-inputs.json', 'utf8')).some(extra => extra.file === item.file));
assert(inputs.every(item => sha(fs.readFileSync(root + '/' + item.file)) === item.rawBytesSha256 && sha(fs.readFileSync(win + '/' + item.file)) === item.rawBytesSha256));
const env = { HOME: process.env.HOME, USER: process.env.USER, LANG: 'C.UTF-8', PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_TARGET_DIR: '/home/wangzishi/.cache/poms-r4ghi-target-ROOT', CARGO_BUILD_JOBS: '2' };
const args = ['+1.99.1', 'check', '--manifest-path', 'apps/poms-api-rust/Cargo.toml', '--locked', '--offline', '--lib', '--message-format=json'];
const stdout = fs.openSync(out + '/stdout.jsonl', 'wx'), stderr = fs.openSync(out + '/stderr.log', 'wx');
const startedAt = new Date().toISOString(); let result;
try { result = spawnSync('/home/wangzishi/.cargo/bin/cargo', args, { cwd: root, env, stdio: ['ignore', stdout, stderr], timeout: 900_000 }); }
finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const stable = inputs.every(item => sha(fs.readFileSync(root + '/' + item.file)) === item.rawBytesSha256 && sha(fs.readFileSync(win + '/' + item.file)) === item.rawBytesSha256);
const diagnostics = fs.readFileSync(out + '/stdout.jsonl', 'utf8').split('\n').filter(Boolean).flatMap(line => { try { const item = JSON.parse(line); return item.reason === 'compiler-message' ? [item] : []; } catch { return []; } });
const errors = diagnostics.filter(item => item.message.level === 'error');
fs.writeFileSync(out + '/diagnostics.json', JSON.stringify(diagnostics, null, 2) + '\n');
fs.writeFileSync(out + '/receipt.json', JSON.stringify({ kind: 'actual-unified-business-cargo-check', startedAt, completedAt: new Date().toISOString(), args, exitCode: result.status, errorCode: result.error?.code ?? null, sourceStable: stable, inputs, errors: errors.length, noDatabaseRun: true, noProductAcceptanceClaim: true }, null, 2) + '\n');
console.log(JSON.stringify({ exitCode: result.status, errors: errors.length, sourceStable: stable, diagnostics: out + '/diagnostics.json' }));
for (const item of errors.slice(0, 12)) console.log(item.message.rendered);
if (result.status !== 0 || !stable) process.exitCode = 1;
