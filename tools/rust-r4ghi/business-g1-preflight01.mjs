import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

process.chdir('E:/projects/worktrees/poms-r3hijk-next28/poms');
const out = 'tmp/rust-r4ghi/root/business-g1-preflight01';
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const checks = [], sha = bytes => createHash('sha256').update(bytes).digest('hex');
const node = process.execPath;
function run(label, executable, args) {
  const result = spawnSync(executable, args, { encoding: null, windowsHide: true, maxBuffer: 12_000_000, timeout: 55_000 });
  for (const stream of ['stdout', 'stderr']) fs.writeFileSync(`${out}/${label}-${stream}.bin`, result[stream] ?? Buffer.alloc(0), { flag: 'wx' });
  checks.push({ label, executable, args, exitCode: result.status, stdoutSHA256: sha(result.stdout ?? Buffer.alloc(0)), stderrSHA256: sha(result.stderr ?? Buffer.alloc(0)), passed: result.status === 0 });
  fs.writeFileSync(`${out}/progress.json`, JSON.stringify(checks, null, 2) + '\n');
  return result.stdout?.toString('utf8') ?? '';
}
const changed = run('tracked-changes', 'git', ['diff', '--name-only']).split(/\r?\n/).filter(Boolean);
checks.push({ label: 'no-GHI-product-edit-before-G1', paths: changed, passed: changed.every(file => file.startsWith('docs/design/')) });
run('whitespace', 'git', ['diff', '--check']);
run('markdown-format', 'E:/.cargo/bin/deno.exe', ['task', 'format:md:check']);
for (const name of ['freeze-business-input01', 'freeze-business-online01', 'prepare-business-g1-docs01', 'business-g1-preflight01']) run(`syntax-${name}`, node, ['--check', `tools/rust-r4ghi/${name}.mjs`]);
const structural = run('effective-v2-verify', 'wsl', ['-d', 'Debian', '--', '/usr/bin/python3', '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/joint-g1/effective-v2/verify.py']);
try {
  const report = JSON.parse(structural);
  checks.push({ label: 'effective-v2-report', passed: report.status === 'PASS' && report.G1Certified === false && report.G2Authorized === false && report.SQLExecuted === false, observed: report.observed, checks: report.checks?.length });
} catch {
  checks.push({ label: 'effective-v2-report', passed: false });
}
const manifest = JSON.parse(fs.readFileSync('docs/design/rust-r4ghi/g1-source-manifest01.json', 'utf8'));
const changedPins = manifest.entries.filter(entry => sha(fs.readFileSync(entry.path)) !== entry.sha256).map(entry => entry.path);
checks.push({ label: 'all-Root-manifest-current-raw-bytes', count: manifest.entries.length, changedPins, passed: changedPins.length === 0 });
const report = { kind: 'actual-Root-business-G1-design-preflight', capturedAt: new Date().toISOString(), passed: checks.every(check => check.passed), G1Certified: false, G2Authorized: false, productAcceptanceRun: false, checks };
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, G1Certified: false, productAcceptanceRun: false }));
assert.equal(report.passed, true, 'inspect preserved preflight before recapture');
