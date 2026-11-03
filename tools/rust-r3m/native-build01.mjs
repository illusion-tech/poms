// Root actual original-backend build for the new isolated stage environment.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { guardNative, pin, admission } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(process.cwd(), root);
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
const out = 'tmp/rust-r3m/native-build01'; assert(!fs.existsSync(out)); fs.mkdirSync(out);
guardNative();
const inputs = admission().protectedFiles.filter(x => !x.file.startsWith('apps/poms-admin/')).map(x => pin(x.file));
const env = {};
for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, { PATH: path.dirname(process.execPath) + ':' + env.PATH, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', CI: 'true', NO_PROXY: 'localhost,127.0.0.1,::1' });
const stdout = fs.openSync(out + '/stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/stderr-original.bin', 'wx');
let result; const startedAt = new Date().toISOString();
try { result = spawnSync(process.execPath, ['node_modules/nx/dist/bin/nx.js', 'build', 'poms-api', '--skip-nx-cache'], { env, stdio: ['ignore', stdout, stderr], timeout: 300000 }); }
finally { fs.closeSync(stdout); fs.closeSync(stderr); }
guardNative(); for (const p of inputs) assert.deepEqual(pin(p.file), p);
const receipt = { kind: 'R3-closeout-current-Native-build', startedAt, completedAt: new Date().toISOString(), exitCode: result.status, errorName: result.error?.name || null, inputs, stdout: pin(out + '/stdout-original.bin'), stderr: pin(out + '/stderr-original.bin'), artifact: result.status === 0 ? pin('dist/apps/poms-api/main.js') : null, actualStageAcceptance: false };
fs.writeFileSync(out + '/report01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.cpSync(out, win + '/' + out, { recursive: true });
console.log(JSON.stringify({ exitCode: result.status, inputs: inputs.length, artifact: receipt.artifact }));
assert.equal(result.status, 0);
