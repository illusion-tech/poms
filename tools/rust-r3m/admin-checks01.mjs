// Root required checks for the precisely bounded Angular datetime correction.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { guardCandidate, guardNative, pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(process.cwd(), root); const candidate = guardCandidate(); guardNative();
const out = 'tmp/rust-r3m/admin-checks01'; assert(!fs.existsSync(out)); fs.mkdirSync(out);
const env = {};
for (const k of ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[k]) env[k] = process.env[k];
Object.assign(env, { PATH: path.dirname(process.execPath) + ':' + env.PATH, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', CI: 'true', NG_BUILD_MAX_WORKERS: '2' });
const nx = 'node_modules/nx/dist/bin/nx.js', results = [];
const commands = [
  ['admin-lint', [nx, 'lint', 'poms-admin', '--skip-nx-cache']],
  ['lead-unit', [nx, 'test', 'poms-admin', '--runInBand', '--testFile=apps/poms-admin/src/app/features/lead/lead-list.spec.ts', '--skip-nx-cache']],
  ['admin-production-build', [nx, 'build', 'poms-admin', '--skip-nx-cache']],
];
for (const [name, args] of commands) {
  const stdout = fs.openSync(out + '/' + name + '-stdout-original.bin', 'wx'), stderr = fs.openSync(out + '/' + name + '-stderr-original.bin', 'wx');
  let result; const startedAt = new Date().toISOString();
  try { result = spawnSync(process.execPath, args, { cwd: root, env, stdio: ['ignore', stdout, stderr], timeout: 300000 }); }
  finally { fs.closeSync(stdout); fs.closeSync(stderr); }
  results.push({ name, args, startedAt, completedAt: new Date().toISOString(), exitCode: result.status, errorName: result.error?.name || null, stdout: pin(out + '/' + name + '-stdout-original.bin'), stderr: pin(out + '/' + name + '-stderr-original.bin') });
  console.log(JSON.stringify({ name, exitCode: result.status, errorName: result.error?.name || null }));
  guardCandidate(); guardNative();
}
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]).sort();
const buildPassed = results.find(x => x.name === 'admin-production-build').exitCode === 0;
const artifacts = buildPassed ? walk('dist/apps/poms-admin/browser').map(pin) : [];
const bridgeMarkers = ['__POMS_E2E', 'poms-e2e-session-bridge', 'POMS_E2E_BACKEND'];
const productionBridgeHits = [];
for (const p of artifacts.filter(x => /\.(?:js|html|json|map)$/.test(x.file))) {
  const text = fs.readFileSync(p.file, 'utf8'); for (const marker of bridgeMarkers) if (text.includes(marker)) productionBridgeHits.push({ file: p.file, marker });
}
assert.equal(productionBridgeHits.length, 0);
const report = { kind: 'R3-Angular-correction-required-checks', candidateLabel: candidate.label, completed: results.every(x => x.exitCode === 0), results, artifacts, productionBridgeHits, browserAcceptanceExecuted: false, noOriginalContractsOrGeneratedClientsChanged: true };
fs.writeFileSync(out + '/report01.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); fs.cpSync(out, win + '/' + out, { recursive: true });
if (!report.completed) process.exitCode = 1;
