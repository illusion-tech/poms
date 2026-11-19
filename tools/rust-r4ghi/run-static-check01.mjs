import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const checks = {
 'spec-validate': ['-jar', 'tmp/rust-r4abc/public-generator/7.20.0.jar', 'validate', '-i', 'libs/shared/api-spec/openapi.json'],
 'api-tsc': ['node_modules/typescript/bin/tsc', '-p', 'apps/poms-api/tsconfig.app.json', '--noEmit', '--pretty', 'false'],
 'admin-tsc': ['node_modules/typescript/bin/tsc', '-p', 'apps/poms-admin/tsconfig.app.json', '--noEmit', '--pretty', 'false'],
 'api-lint': ['node_modules/nx/dist/bin/nx.js', 'run', 'poms-api:lint', '--skip-nx-cache'],
 'admin-lint': ['node_modules/nx/dist/bin/nx.js', 'run', 'poms-admin:lint', '--skip-nx-cache'],
 'api-build': ['node_modules/nx/dist/bin/nx.js', 'run', 'poms-api:build', '--skip-nx-cache'],
 'admin-build': ['node_modules/nx/dist/bin/nx.js', 'run', 'poms-admin:build', '--skip-nx-cache']
 ,'admin-test': ['node_modules/jest/bin/jest.js', '--config', 'apps/poms-admin/jest.config.cjs', '--runInBand', '--no-cache']
 ,'api-test': ['node_modules/jest/bin/jest.js', '--config', 'apps/poms-api/jest.config.js', '--runInBand', '--no-cache']
 ,'admin-data-lint': ['node_modules/nx/dist/bin/nx.js', 'run', 'admin-data-access:lint', '--skip-nx-cache']
};
const name = process.argv[2], edition = process.argv[3];
assert(checks[name] && /^\d{2}$/.test(edition));
const executable = name === 'spec-validate' ? 'C:/Program Files/Java/jdk-17/bin/java.exe' : process.execPath;
const inputSpec = name === 'spec-validate' ? fs.readFileSync('libs/shared/api-spec/openapi.json') : null;
if (name === 'spec-validate') {
    const jar = fs.readFileSync(checks[name][1]);
    assert.equal(createHash('sha256').update(jar).digest('hex'), '871e0155287a87b579ff31096b2d45b1f95a115edfe631411ec6cff4848d0f03');
}
const out = `tmp/rust-r4ghi/root/${name}${edition}`;
assert(!fs.existsSync(out));fs.mkdirSync(out, { recursive: true });
const env = {};
for (const [key, value] of Object.entries(process.env)) if (['PATHEXT','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SYSTEMROOT','COMSPEC','TEMP','TMP','PROGRAMFILES','PROGRAMFILES(X86)','PROCESSOR_ARCHITECTURE'].includes(key.toUpperCase())) env[key] = value;
env.Path = path.dirname(process.execPath) + path.delimiter + (process.env.PATH ?? process.env.Path ?? '');
Object.assign(env, { NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', CI: 'true', NODE_ENV: 'test' });
if(name==='api-test'){env.DB_CONNECT='false';env.NODE_OPTIONS='--experimental-vm-modules';}
const stdout = fs.openSync(out + '/stdout.log', 'wx'), stderr = fs.openSync(out + '/stderr.log', 'wx');
const startedAt = new Date().toISOString();let result;
try { result = spawnSync(executable, checks[name], { cwd: process.cwd(), env, stdio: ['ignore', stdout, stderr], windowsHide: true, timeout: 600000 }); }
finally { fs.closeSync(stdout);fs.closeSync(stderr); }
const pin = file => { const b = fs.readFileSync(file);return { file, bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; };
const receipt = { kind: 'actual-current-candidate-' + name, startedAt, completedAt: new Date().toISOString(), executable, command: checks[name], exitCode: result.status, errorCode: result.error?.code ?? null, stdout: pin(out + '/stdout.log'), stderr: pin(out + '/stderr.log'), databaseConnect: false, G3: false };
if (inputSpec) {
    receipt.inputSpec = { file: 'libs/shared/api-spec/openapi.json', bytes: inputSpec.length, sha256: createHash('sha256').update(inputSpec).digest('hex'), unchangedDuringCheck: inputSpec.equals(fs.readFileSync('libs/shared/api-spec/openapi.json')) };
    assert(receipt.inputSpec.unchangedDuringCheck);
}
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (result.status !== 0) { console.log(fs.readFileSync(out + '/stdout.log','utf8').slice(0,14000));console.log(fs.readFileSync(out + '/stderr.log','utf8').slice(-2000));process.exitCode = 1; }
