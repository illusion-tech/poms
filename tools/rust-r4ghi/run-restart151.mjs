// Capture private assertion details while carrying out the exact reviewed two-plan transition.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform, 'linux'); const [mode, planFile, approvedSHA] = process.argv.slice(2); assert(['prepare', 'admit'].includes(mode));
const sha = value => createHash('sha256').update(value).digest('hex'); assert(/^[a-f0-9]{64}$/.test(approvedSHA)); assert.equal(sha(fs.readFileSync(planFile)), approvedSHA);
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', folder = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/restart151-' + mode; fs.mkdirSync(folder, { mode: 0o700 });
const stdout = fs.openSync(folder + '/stdout.json', 'wx', 0o600), stderr = fs.openSync(folder + '/stderr.log', 'wx', 0o600);
let result; try { result = spawnSync(process.execPath, [root + '/tools/rust-r4ghi/business/run-process-restart1351.mjs', '--plan', planFile, '--approved-plan-sha', approvedSHA, '--mode', mode, '--execute'], { cwd: root, env: process.env, stdio: ['ignore', stdout, stderr], timeout: 240000 }); }
finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
if (result.status === 0) console.log(JSON.stringify({ status: 'completed', ...JSON.parse(fs.readFileSync(folder + '/stdout.json')), stdout: pin(folder + '/stdout.json') }));
else { console.error(JSON.stringify({ status: 'failed-or-partial-no-blind-retry', mode, exitCode: result.status, stdout: pin(folder + '/stdout.json'), stderr: pin(folder + '/stderr.log'), privateDetailsPublished: false })); process.exitCode = 1; }
