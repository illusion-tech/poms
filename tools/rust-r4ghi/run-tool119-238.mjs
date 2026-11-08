// Fixed actual plan; each FS-only mode has distinct immutable stdout/stderr.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01', mode = process.argv[2], sha = v => createHash('sha256').update(v).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(['inspect', 'publish', 'make-b2'].includes(mode)); assert.equal(process.argv.length, 3);
assert(!fs.existsSync(D + '/driver.lock')); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
const plan = D + '/tool119-republish237/plan119-237.json', expected = '171d9eaab71fd1c6f0e2e61c9fe9021496fb6c1788e80922a9dc108b11d5233d'; assert.equal(sha(fs.readFileSync(plan)), expected);
const tool = R + '/tools/rust-r4ghi/admit-resource-tool119.mjs'; assert.equal(sha(fs.readFileSync(tool)), 'f7dfdee2393743d22f0f96210b53213f757f5a4c0945317e7f11a067147bcd83');
const out = P + '/tool119-238-' + mode; fs.mkdirSync(out, { mode: 0o700 }); const o = fs.openSync(out + '/stdout.json', 'wx', 0o600), e = fs.openSync(out + '/stderr.json', 'wx', 0o600);
const argv = [tool, '--plan', plan, '--approved-plan-sha', expected, '--' + mode]; if (mode === 'make-b2') argv.push(D + '/B2-Source13-tool119-admitted238.json');
let result; try { result = spawnSync(process.execPath, argv, { cwd: R, env: process.env, stdio: ['ignore', o, e], timeout: 600000 }); } finally { fs.closeSync(o); fs.closeSync(e); }
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const receipt = { mode, argv, exitCode: result.status, signal: result.signal, stdout: pin(out + '/stdout.json'), stderr: pin(out + '/stderr.json'), noBlindRetry: true };
fs.writeFileSync(out + '/command238.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
if (result.status === 0) { const data = JSON.parse(fs.readFileSync(out + '/stdout.json')); console.log(JSON.stringify({ completed: true, mode, result: data, command: pin(out + '/command238.json') })); }
else { console.error(JSON.stringify({ completed: false, mode, command: pin(out + '/command238.json'), stdout: receipt.stdout, stderr: receipt.stderr, noBlindRetry: true })); process.exitCode = 1; }
