// Root: new checkout + offline dependencies only after actual online G1 authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const root = '/home/wangzishi/projects/poms-rust-r3m';
const out = win + '/tmp/rust-r3m/root/linux-bootstrap01';
const commit = '546c6c243ea6162077cb065ced54c5a8188afe23';
assert.equal(process.platform, 'linux');
const gate = JSON.parse(fs.readFileSync(win + '/docs/design/rust-r3m/g1-gate-authority01.json'));
assert(gate.G1Certified && gate.G2Authorized && gate.baselineCommit === commit);
assert(!fs.existsSync(root), 'Do not overwrite an existing checkout');
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: sha(b) }; };
execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--no-checkout', '/mnt/e/projects/poms', root]);
execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });
execFileSync('git', ['checkout', '--quiet', '--detach', commit], { cwd: root });
execFileSync('git', ['remote', 'set-url', 'origin', 'https://github.com/illusion-tech/poms.git'], { cwd: root });
for (const dir of ['tools/rust-r3m', 'docs/design/rust-r3m']) fs.cpSync(win + '/' + dir, root + '/' + dir, { recursive: true });
fs.mkdirSync(root + '/tmp/rust-r3m/root', { recursive: true });
const manifest = JSON.parse(fs.readFileSync(root + '/docs/design/rust-r3m/g1-input-manifest01.json'));
for (const p of [...manifest.rustFiles, ...manifest.protectedFiles]) {
  const b = fs.readFileSync(root + '/' + p.file);
  assert.equal(b.length, p.bytes, p.file); assert.equal(sha(b), p.rawBytesSha256, p.file);
}
const env = {};
for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, { PATH: path.dirname(process.execPath) + ':' + env.PATH, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', CI: 'true', npm_config_manage_package_manager_versions: 'false', COREPACK_ENABLE_AUTO_PIN: '0' });
const pm = '/home/wangzishi/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs';
assert(fs.existsSync(pm));
const lockFile = root + '/pnpm-lock.yaml', before = fs.readFileSync(lockFile);
const stdout = fs.openSync(out + '/stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/stderr-original.bin', 'wx');
let result;
const startedAt = new Date().toISOString();
try { result = spawnSync(process.execPath, [pm, 'install', '--offline', '--frozen-lockfile', '--config.manage-package-manager-versions=false'], { cwd: root, env, stdio: ['ignore', stdout, stderr], timeout: 300000 }); }
finally { fs.closeSync(stdout); fs.closeSync(stderr); }
assert(before.equals(fs.readFileSync(lockFile)), 'Protected dependency lock changed');
const receipt = { kind: 'R3-closeout-new-Linux-checkout-bootstrap', startedAt, completedAt: new Date().toISOString(), commit, base: gate.base, root, Node: process.version, pnpm: '12.3.4', exitCode: result.status, errorName: result.error?.name || null, protectedSourcePins: manifest.protectedFiles.length, RustSourcePins: manifest.rustFiles.length, lockUnchanged: true, stdout: pin(out + '/stdout-original.bin'), stderr: pin(out + '/stderr-original.bin'), oldPrivateRead: false, productAcceptanceExecuted: false };
fs.writeFileSync(out + '/report01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ root, exitCode: result.status, errorName: receipt.errorName, lockUnchanged: true, protectedSourcePins: receipt.protectedSourcePins }));
assert.equal(result.status, 0);
