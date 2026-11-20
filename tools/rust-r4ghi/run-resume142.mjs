// Keep assertion details containing private snapshots out of terminal output.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform, 'linux'); const mode = process.argv[2]; assert(['reconcile', 'remaining'].includes(mode));
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', dir = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14';
const sha = b => createHash('sha256').update(b).digest('hex'), planFile = dir + '/role02-resume58-03-plan141.json', approved = 'e381aa929e8af745be9c0bc3b1be3b1a450da3d4a7d3cc76118ec3c3ab6b2896';
assert.equal(sha(fs.readFileSync(planFile)), approved); const out = dir + '/resume58-' + mode + '-142'; fs.mkdirSync(out, { mode: 0o700 });
const stdout = fs.openSync(out + '/stdout.json', 'wx', 0o600), stderr = fs.openSync(out + '/stderr.log', 'wx', 0o600);
let result; try { result = spawnSync(process.execPath, [root + '/tools/rust-r4ghi/business/resume-frozen-reparent58-03.mjs', '--plan', planFile, '--approved-plan-sha', approved, '--mode', mode, '--execute'],
  { cwd: root, env: process.env, stdio: ['ignore', stdout, stderr], timeout: 240000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
if (result.status === 0) console.log(JSON.stringify({ status: 'completed', ...JSON.parse(fs.readFileSync(out + '/stdout.json')), stdout: pin(out + '/stdout.json') }));
else { console.error(JSON.stringify({ status: 'failed-or-partial-no-blind-retry', mode, exitCode: result.status, stdout: pin(out + '/stdout.json'), stderr: pin(out + '/stderr.log'), privateDetailsPublished: false })); process.exitCode = 1; }
