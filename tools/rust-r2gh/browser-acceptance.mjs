import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sanitizeBrowserText, sanitizeBrowserArtifacts } from './browser-sanitizer.mjs';
const require = createRequire(import.meta.url),
    runtime = require('../e2e/runtime.cjs');
const [backend, receiptFile, upstreamTag, tag] = process.argv.slice(2);
assert.equal(process.argv.length, 6);
assert(['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,35}$/.test(tag) && /^[a-z0-9-]{1,35}$/.test(upstreamTag));
const receipt = JSON.parse(readFileSync(receiptFile));
assert.equal(receipt.backend, backend);
assert.equal(receipt.sourceHead, '126ede22bb4b379ae656ccde9cee9d82da383be4');
assert.equal(receipt.origin, 'http://127.0.0.1:' + (backend === 'nest' ? '5700' : '5701'));
const stem = `tmp/rust-r2gh/browser-${process.platform}-${backend}-${tag}`,
    out = stem + '.json',
    jsonReport = stem + '/report.json',
    log = stem + '.log';
assert(!existsSync(out) && !existsSync(stem));
mkdirSync(stem, { recursive: true, mode: 0o700 });
const report = {
    formatVersion: 1,
    backend,
    tag,
    sourceHead: receipt.sourceHead,
    node: process.version,
    platform: process.platform,
    receiptFile,
    receiptSha256: createHash('sha256').update(readFileSync(receiptFile)).digest('hex'),
    log,
    jsonReport,
    result: 'pending',
    startedAt: new Date().toISOString(),
    boundary: 'Original Angular pages against separately owned real API and controlled synthetic upstream; traces/video off and protocol values sanitized in persisted reports'
};
const inputs = [
    'tools/rust-r2gh/browser-acceptance.mjs',
    'tools/rust-r2gh/browser-sanitizer.mjs',
    'tools/rust-r2gh/g-browser.spec.ts',
    'tools/rust-r2gh/h-browser.spec.ts',
    'tools/rust-r2gh/playwright.config.ts',
    'tools/rust-r2gh/batch-client.cjs',
    'tools/rust-r2gh/batch-cli.mjs',
    'tools/rust-r2gh/batch-protocol.cjs',
    'tools/rust-r2gh/owned-fixture.mjs',
    'tools/rust-r2gh/fixture-snapshot.mjs',
    'tools/e2e/admin-launcher.cjs',
    'tools/e2e/api-server.cjs'
];
mkdirSync(stem + '/inputs', { mode: 0o700 });
report.inputSnapshot = inputs.map((file, index) => {
    const bytes = readFileSync(file),
        snapshot = stem + '/inputs/' + String(index).padStart(2, '0') + '-' + path.basename(file);
    writeFileSync(snapshot, bytes, { flag: 'wx', mode: 0o600 });
    return { file, snapshot, bytes: bytes.length, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') };
});
try {
    const env = {
        ...process.env,
        POMS_ADMIN_E2E_SUITE: 'identity-directory',
        POMS_E2E_MODE: 'external',
        POMS_E2E_ENV_PROFILE: 'r2gh',
        POMS_E2E_SUITE: 'foundation',
        POMS_R2GH_BACKEND: backend,
        POMS_R2GH_UPSTREAM_TAG: upstreamTag,
        POMS_API_BASE_URL: receipt.origin,
        POMS_ADMIN_PORT_SEED: '1400',
        PLAYWRIGHT_JSON_OUTPUT_FILE: path.resolve(jsonReport),
        NX_DAEMON: 'false',
        NX_TUI: 'false',
        CI: 'true'
    };
    if (process.platform === 'win32') {
        const cache = path.resolve('tmp/rust-r2ef/windows-browser-cache'),
            executable = path.join(cache, 'chromium-1243/chrome-win64/chrome.exe');
        assert(existsSync(executable), 'Preserved task-local browser must exist; this runner never installs browsers');
        env.PLAYWRIGHT_BROWSERS_PATH = cache;
        const version = execFileSync('pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '(Get-Item -LiteralPath $env:POMS_BROWSER_METADATA_EXE).VersionInfo.ProductVersion'], {
            env: { ...process.env, POMS_BROWSER_METADATA_EXE: executable },
            encoding: 'utf8',
            windowsHide: true
        }).trim();
        report.browser = { revision: '1243', version, executable, cacheUse: 'existing task-local cache; no installation or system-browser/profile change' };
    } else if (process.platform === 'linux') {
        const executable = require('@playwright/test').chromium.executablePath();
        assert(existsSync(executable), 'Fixed image Chromium must already exist');
        const version = execFileSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
        report.browser = { executable, version, cacheUse: 'existing fixed-image browser; no installation or host-browser/profile change' };
    }
    for (const key of ['POMS_ENV_FILE', 'POMS_E2E_FIXTURE_RUN_ID', 'POMS_E2E_USERNAME', 'POMS_E2E_PASSWORD', 'NODE_OPTIONS']) delete env[key];
    const pkg = require.resolve('@playwright/test/package.json'),
        p = JSON.parse(readFileSync(pkg)),
        cli = path.resolve(path.dirname(pkg), typeof p.bin === 'string' ? p.bin : p.bin.playwright);
    report.playwrightVersion = p.version;
    await runtime.runOwnedCommand({
        executable: process.execPath,
        args: [cli, 'test', '--config', 'tools/rust-r2gh/playwright.config.ts', '--workers=1', '--reporter=' + path.resolve('tools/rust-r2gh/browser-sanitizer.mjs') + ',list,json', '--output=' + stem + '/results'],
        cwd: process.cwd(),
        env,
        logPath: path.resolve(log),
        timeoutMs: 300000
    });
    const raw = JSON.parse(readFileSync(jsonReport));
    assert.equal(raw.stats.expected, 2);
    assert.equal(raw.stats.unexpected, 0);
    assert.equal(raw.stats.skipped, 0);
    report.stats = raw.stats;
    report.result = 'pass';
} catch (error) {
    report.result = 'fail';
    report.error = { name: error.name, message: sanitizeBrowserText(error.message) };
    if (existsSync(jsonReport)) report.stats = JSON.parse(readFileSync(jsonReport)).stats;
    process.exitCode = 1;
} finally {
    report.artifactSanitization = sanitizeBrowserArtifacts(stem);
    for (const file of [log, jsonReport])
        if (existsSync(file)) {
            const before = readFileSync(file, 'utf8'),
                sanitized = sanitizeBrowserText(before);
            if (before !== sanitized) writeFileSync(file, sanitized, { mode: 0o600 });
        }
    try {
        await runtime.assertPortAvailable({ host: '127.0.0.1', port: 5800 });
        report.adminPortReleased = true;
    } catch {
        report.adminPortReleased = false;
        report.result = 'fail';
        process.exitCode = 1;
    }
    report.finishedAt = new Date().toISOString();
    report.sourceFiles = [
        'tools/rust-r2gh/browser-acceptance.mjs',
        'tools/rust-r2gh/browser-sanitizer.mjs',
        'tools/rust-r2gh/g-browser.spec.ts',
        'tools/rust-r2gh/h-browser.spec.ts',
        'tools/rust-r2gh/playwright.config.ts',
        'tools/e2e/admin-launcher.cjs',
        'tools/e2e/api-server.cjs'
    ].map((file) => ({ file, rawBytesSha256: createHash('sha256').update(readFileSync(file)).digest('hex') }));
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ backend, platform: process.platform, result: report.result, stats: report.stats, adminPortReleased: report.adminPortReleased, output: out, log }));
}
