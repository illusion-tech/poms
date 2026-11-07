// Execute the original complete OpenAPI exporter with a public, isolated static environment.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert(JSON.parse(fs.readFileSync('docs/design/rust-r4ghi/g1-online01.json')).G2Authorized);
const edition = process.argv[2] ?? '02'; assert(/^\d{2}$/.test(edition));
const out = `tmp/rust-r4ghi/root/openapi${edition}`; assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const specFile = 'libs/shared/api-spec/openapi.json'; const before = fs.readFileSync(specFile); fs.writeFileSync(out + '/full-spec-before-original.bin', before, { flag: 'wx' });
const envFile = path.resolve(out, 'public-static.env');
fs.writeFileSync(envFile, 'NODE_ENV=test\nJWT_SECRET=poms-r4ghi-static-schema-export-placeholder-only\nDB_HOST=127.0.0.1\nDB_PORT=1\nDB_DATABASE=openapi-placeholder\nDB_USER=openapi-placeholder\nDB_PASSWORD=public-static-placeholder\n', { flag: 'wx' });
const env = {};
for (const [key, value] of Object.entries(process.env)) if (['PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROCESSOR_ARCHITECTURE'].includes(key.toUpperCase())) env[key] = value;
Object.assign(env, { POMS_ENV_FILE: envFile, NODE_ENV: 'test', NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', CI: 'true' });
const stdout = fs.openSync(out + '/stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/stderr-original.bin', 'wx'); let result;
const args = ['--max-old-space-size=8192', 'node_modules/ts-node/dist/bin.js', '-r', 'tsconfig-paths/register', '-P', 'apps/poms-api/tsconfig.app.json', 'apps/poms-api/src/openapi.ts'];
const startedAt = new Date().toISOString();
try { result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, stdio: ['ignore', stdout, stderr], windowsHide: true, timeout: 300000 }); } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; };
const receipt = { kind: 'original-complete-OpenAPI-export', startedAt, completedAt: new Date().toISOString(), command: [process.execPath, ...args], exitCode: result.status, stdout: pin(out + '/stdout-original.bin'), stderr: pin(out + '/stderr-original.bin'), staticPublicEnvironment: true, oldPrivateEnvRead: false, databaseConnect: false, businessRuntimeAcceptance: false };
if (result.status === 0) {
    const full = JSON.parse(fs.readFileSync(specFile)), prior = JSON.parse(before); const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    const rows = doc => Object.entries(doc.paths).flatMap(([p, verbs]) => Object.entries(verbs).filter(([m]) => methods.includes(m)).map(([m, op]) => `${m} ${p} ${op.operationId}`));
    const current = new Set(rows(full)), old = rows(prior); const removedOperations = old.filter(k => !current.has(k)); assert.equal(removedOperations.length, 0);
    receipt.counts = { paths: Object.keys(full.paths).length, operations: current.size, schemas: Object.keys(full.components.schemas).length };
    receipt.removedSchemas = Object.keys(prior.components.schemas).filter(k => !full.components.schemas[k]);
    receipt.addedSchemas = Object.keys(full.components.schemas).filter(k => !prior.components.schemas[k]);
    receipt.spec = pin(specFile);
    fs.writeFileSync(out + '/full-spec-after-original.bin', fs.readFileSync(specFile), { flag: 'wx' });
}
fs.writeFileSync(out + '/receipt02.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
if (result.status !== 0) { console.log(fs.readFileSync(out + '/stderr-original.bin', 'utf8').slice(-6000)); process.exitCode = 1; }
