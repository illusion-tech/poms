// The first preflight used a WSL Python without jsonschema. Keep that failure;
// reuse the unchanged passed checks and rerun only the failed structural check
// with the already-installed Windows Python used by the input author.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const out = 'tmp/rust-r4ghi/root/business-g1-preflight02';
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const firstPath = 'tmp/rust-r4ghi/root/business-g1-preflight01/report.json';
const first = JSON.parse(fs.readFileSync(firstPath, 'utf8'));
assert.deepEqual(first.checks.filter(check => !check.passed).map(check => check.label), ['effective-v2-verify', 'effective-v2-report']);
const interpreter = 'C:/Users/ynh2/AppData/Local/Microsoft/WindowsApps/PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0/python.exe';
const script = 'tools/rust-r4ghi/joint-g1/effective-v2/verify.py';
const result = spawnSync(interpreter, [script], { encoding: null, windowsHide: true, timeout: 55_000, maxBuffer: 12_000_000 });
for (const stream of ['stdout', 'stderr']) fs.writeFileSync(`${out}/${stream}.bin`, result[stream] ?? Buffer.alloc(0), { flag: 'wx' });
assert.equal(result.status, 0, 'inspect retry raw output');
const structural = JSON.parse(result.stdout);
assert.equal(structural.status, 'PASS');
assert.equal(structural.G1Certified, false);
assert.equal(structural.SQLExecuted, false);
const manifestPath = 'docs/design/rust-r4ghi/g1-source-manifest01.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.entries.every(entry => sha(fs.readFileSync(entry.path)) === entry.sha256));
const report = {
  kind: 'actual-business-G1-preflight-environment-correction', capturedAt: new Date().toISOString(),
  passed: true, G1Certified: false, G2Authorized: false, productAcceptanceRun: false,
  prior: { path: firstPath, sha256: sha(fs.readFileSync(firstPath)), status: 'FAILED-preserved', classification: 'tool-environment; WSL interpreter lacks jsonschema', inheritedUnchangedPassedChecks: first.checks.filter(check => check.passed).map(check => check.label) },
  retry: { interpreter, args: [script], exitCode: result.status, stdoutSHA256: sha(result.stdout), stderrSHA256: sha(result.stderr), checks: structural.checks.length, observed: structural.observed, status: structural.status },
  sourceManifestSHA256: sha(fs.readFileSync(manifestPath)), allCurrentPinsUnchanged: true,
};
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, structuralChecks: structural.checks.length, priorFailurePreserved: true, G1Certified: false }));
