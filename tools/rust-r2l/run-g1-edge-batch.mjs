// Root orchestration only. Every scenario retains its own fresh fixture,
// bounded owner, immutable input, result and independent resource closeout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
const ROOT = '/home/wangzishi/projects/poms-rust-r2l';
assert.equal(process.cwd(), ROOT);
const tag = process.argv[2], buildTag = process.argv[3] ?? 'candidate06';
const attempt = process.argv[4] ?? '01', startScenario = process.argv[5] ?? 'retention-gate';
assert(/^[a-z0-9-]{1,20}$/.test(tag ?? '') && /^candidate[0-9]{2}$/.test(buildTag));
assert(/^[0-9]{2}$/.test(attempt));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const file = `tmp/rust-r2l/g1-edge-batch-${tag}.json`; assert(!fs.existsSync(file));
const allScenarios = [['rg', 'retention-gate'], ['rd', 'retention-date'], ['rn', 'retention-approve-nonret'],
    ['rp', 'retention-approve-payout-status'], ['rc', 'retention-approve-confirmation'], ['rs', 'retention-approve-summary'],
    ['rr', 'retention-approve-gate-record'], ['ic', 'initial-current-race'], ['xc', 'replacement-current-race'],
    ['li', 'late-initial'], ['lr', 'late-replacement']];
const startIndex = allScenarios.findIndex(([, name]) => name === startScenario); assert(startIndex >= 0);
const scenarios = allScenarios.slice(startIndex);
const pins = ['l-commission-http-actual.mjs', 'l-commission-capture-requests.mjs', 'l-commission-g1-edges.mjs',
    'l-snapshot-sql-barrier.mjs', 'l-snapshot-waiter-admission.mjs', 'native-app.mjs', 'l-query-pid-witness.cjs',
    'l-pg-backend-identity.mjs', 'l-pg-backend-key-observer.py', 'l-fixture.mjs', 'fixture-core.mjs', 'l-pg-create-observer.mjs']
    .map(name => { const source = 'tools/rust-r2l/' + name; return { file: source, rawBytesSha256: sha(fs.readFileSync(source)) }; });
const report = { kind: 'sequential-bounded-actual-G1-edge-scenarios', result: 'running', tag, buildTag,
    startedAt: new Date().toISOString(), attempt, startScenario, pins, steps: [], priorFinalGate: ['egfg-n01', 'egfg-r01'], G3Certified: false, G4Certified: false };
const save = () => fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n'); save();
try {
    for (const [code, scenario] of scenarios) for (const backend of ['nest', 'rust']) {
        for (const pin of pins) assert.equal(sha(fs.readFileSync(pin.file)), pin.rawBytesSha256, 'Do not run a silently changed runtime epoch');
        const runTag = 'eg' + code + '-' + backend[0] + attempt;
        const ownerFile = `tmp/rust-r2l/commission-g1-edges-${backend}-${runTag}-owner.json`;
        assert(!fs.existsSync(ownerFile));
        const step = { scenario, backend, runTag, startedAt: new Date().toISOString(), result: 'running' }; report.steps.push(step); save();
        const env = Object.fromEntries(['PATH', 'HOME', 'LANG', 'WSL_INTEROP', 'WSLENV'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
        const child = spawn(process.execPath, ['tools/rust-r2l/l-commission-g1-edges.mjs', runTag, backend, scenario, buildTag],
            { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout = createHash('sha256'), stderr = createHash('sha256'); let outBytes = 0, errBytes = 0;
        child.stdout.on('data', bytes => { stdout.update(bytes); outBytes += bytes.length; });
        child.stderr.on('data', bytes => { stderr.update(bytes); errBytes += bytes.length; });
        step.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
        step.commandOutput = { stdoutBytes: outBytes, stdoutSha256: stdout.digest('hex'), stderrBytes: errBytes, stderrSha256: stderr.digest('hex'), payloadsCopied: false };
        step.owner = { file: ownerFile, rawBytesSha256: sha(fs.readFileSync(ownerFile)) };
        const owner = JSON.parse(fs.readFileSync(ownerFile));
        assert.equal(step.exitCode, 0); assert.equal(owner.result, 'pass');
        const companionFile = `tmp/rust-r2l/commission-g1-edges-${backend}-${runTag}.json`, companion = JSON.parse(fs.readFileSync(companionFile));
        assert.equal(companion.result, 'observed'); assert.equal(companion.consumerReport.result, 'edges-observed');
        assert.equal(companion.consumerReport.doubleZero, true); assert(companion.consumerReport.resourceCloseout.every(row => row.result === 'pass'));
        assert.equal(sha(fs.readFileSync(companion.consumerReport.file)), companion.consumerReport.rawBytesSha256);
        step.companion = { file: companionFile, rawBytesSha256: sha(fs.readFileSync(companionFile)) };
        step.consumer = companion.consumerReport; step.result = 'observed'; step.finishedAt = new Date().toISOString(); save();
        console.log(JSON.stringify({ scenario, backend, result: step.result, requests: companion.consumerReport.requestCount, completed: report.steps.length, total: scenarios.length * 2 }));
    }
    report.result = 'observed-all-planned-cases';
} catch (error) {
    report.result = 'stopped-on-first-failed-scenario'; report.failure = { name: error.name, message: error.message };
    if (report.steps.length && report.steps.at(-1).result === 'running') report.steps.at(-1).result = 'failed-or-incomplete'; process.exitCode = 1;
} finally { report.finishedAt = new Date().toISOString(); save(); console.log(JSON.stringify({ result: report.result, file, completed: report.steps.filter(step => step.result === 'observed').length, G3Certified: false })); }
