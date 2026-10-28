import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { sanitizeBrowserText } from './browser-sanitizer.mjs';
const require = createRequire(import.meta.url);
const { invokeBatchFixture } = require('./batch-client.cjs');
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const runtime = require('../e2e/runtime.cjs');
const [backend, receiptFile, tag] = process.argv.slice(2);
assert.equal(process.argv.length, 5);
assert(['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,35}$/.test(tag));
const receipt = JSON.parse(readFileSync(receiptFile));
assert.equal(receipt.backend, backend);
assert.equal(receipt.sourceHead, '126ede22bb4b379ae656ccde9cee9d82da383be4');
assert.equal(receipt.origin, 'http://127.0.0.1:' + (backend === 'nest' ? '5700' : '5701'));
const runId = randomUUID();
const stem = `tmp/rust-r2gh/foundation-${process.platform}-${backend}-${tag}`;
const out = stem + '.json', log = stem + '.log';
assert(!existsSync(out) && !existsSync(stem));
mkdirSync(stem, { mode: 0o700 });
const sha = value => createHash('sha256').update(value).digest('hex');
const report = { formatVersion: 1, backend, tag, runId, sourceHead: receipt.sourceHead, node: process.version, platform: process.platform, receiptFile, receiptSha256: sha(readFileSync(receiptFile)), log, result: 'pending', steps: [], startedAt: new Date().toISOString() };
report.inputs = ['tools/rust-r2gh/foundation-acceptance.mjs', 'apps/poms-api-e2e/src/poms-api/foundation.e2e-spec.ts', 'tools/rust-r2gh/batch-cli.mjs', 'tools/rust-r2gh/owned-fixture.mjs'].map((file, index) => {
    const bytes = readFileSync(file), snapshot = stem + '/' + String(index).padStart(2, '0') + '-' + path.basename(file);
    writeFileSync(snapshot, bytes, { flag: 'wx', mode: 0o600 });
    return { file, snapshot, bytes: bytes.length, rawBytesSha256: sha(bytes) };
});
let failed = false;
const invoke = action => invokeBatchFixture({ formatVersion: 1, backend, runId, account: 'none', action });
try {
    const prepared = await invoke('prepare');
    report.steps.push({ action: 'prepare', state: prepared.state, matched: prepared.matched, changed: prepared.changed });
    const credentials = fixtureCredentials(runId, 'admin');
    const env = { ...process.env, POMS_E2E_MODE: 'external', POMS_E2E_SUITE: 'foundation', POMS_E2E_ENV_PROFILE: 'r2gh', POMS_API_BASE_URL: receipt.origin, POMS_E2E_FIXTURE_RUN_ID: runId, POMS_E2E_USERNAME: credentials.username, POMS_E2E_PASSWORD: credentials.password, NX_DAEMON: 'false', NX_TUI: 'false', CI: 'true' };
    const pkg = require.resolve('nx/package.json'), p = JSON.parse(readFileSync(pkg)), nx = path.resolve(path.dirname(pkg), typeof p.bin === 'string' ? p.bin : p.bin.nx);
    await runtime.runOwnedCommand({ executable: process.execPath, args: [nx, 'run', 'poms-api-e2e:e2e', '--skip-nx-cache'], cwd: process.cwd(), env, logPath: path.resolve(log), timeoutMs: 300000 });
    report.testResult = 'pass';
    const text = stripVTControlCharacters(readFileSync(log, 'utf8'));
    assert(/Tests:\s+13 passed, 13 total/.test(text));
    report.testsPassed = 13;
} catch (error) {
    failed = true;
    report.error = { name: error.name, message: sanitizeBrowserText(error.message) };
} finally {
    for (let pass = 0; pass < 2; pass++) {
        try {
            const result = await invoke('cleanup');
            report.steps.push({ action: 'cleanup', pass, result });
            assert.equal(result.state, 'cleaned');
            if (pass === 1) { assert.equal(result.matched, 0); assert.equal(result.changed, 0); assert.equal(result.zero ?? result.extension?.zero, true); }
        } catch (error) { failed = true; report.steps.push({ action: 'cleanup', pass, error: { name: error.name } }); }
    }
    if (existsSync(log)) { const sanitized = sanitizeBrowserText(readFileSync(log, 'utf8')); writeFileSync(log, sanitized, { mode: 0o600 }); report.logSha256 = sha(sanitized); }
    report.result = failed ? 'fail' : 'pass';
    report.finishedAt = new Date().toISOString();
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ backend, platform: process.platform, result: report.result, testsPassed: report.testsPassed, output: out, log }));
}
if (failed) process.exitCode = 1;
