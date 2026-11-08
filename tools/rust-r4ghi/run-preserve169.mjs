// Root-only exact preservation entries; keep all assertion details in private files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv = '/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); const mode = process.argv[2]; assert(['packet', 'retain'].includes(mode));
const files = { 'package-retained-candidate140.mjs': '5b02ca8cf6fa05b639d69f89f85ba85a339056afcc07b891c33b82bb6c6b9557', 'retain-epoch12-before-source13-139.mjs': '2ad85e4c7ff843077cfc1d14dfcea6413a6e2bb5f5401bfd16a9dfb989056a58', 'retention-process1351-139-lib.mjs': 'd8c3e014d5dff02ba07113d3727e47c072b306e7d0e1fb315b88b108db4298d0' };
for (const [file, expected] of Object.entries(files)) assert.equal(sha(fs.readFileSync(root + '/tools/rust-r4ghi/' + file)), expected);
const out = priv + '/preservation169-' + mode; fs.mkdirSync(out, { mode: 0o700 }); const stdout = fs.openSync(out + '/stdout.json', 'wx', 0o600), stderr = fs.openSync(out + '/stderr.log', 'wx', 0o600);
let result; try { result = spawnSync(process.execPath, [root + '/tools/rust-r4ghi/' + (mode === 'packet' ? 'package-retained-candidate140.mjs' : 'retain-epoch12-before-source13-139.mjs')], { cwd: root, env: process.env, stdio: ['ignore', stdout, stderr], timeout: 240000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
if (result.status === 0) console.log(JSON.stringify({ status: 'completed', mode, actual: JSON.parse(fs.readFileSync(out + '/stdout.json')), stdout: pin(out + '/stdout.json') }));
else { console.error(JSON.stringify({ status: 'failed-or-partial-no-blind-retry', mode, exitCode: result.status, stdout: pin(out + '/stdout.json'), stderr: pin(out + '/stderr.log'), privateDetailsPublished: false })); process.exitCode = 1; }
