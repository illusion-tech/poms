// Original Angular build target in an independent scratch. No server or browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBaseline, assertFrozenSources } from '../openapi/shared-api-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = '/home/wangzishi/projects/poms-rust-r2k-generator';
const S2 = 'ee0f4847cae292fe5cee1d1eec065b7194607683';
const IMAGE = 'ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
const MODULES = '/home/wangzishi/projects/poms-rust-r2d/node_modules';
const NODE = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const NODE_SHA = 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const row = (file) => { const b = fs.readFileSync(file); return { file, bytes: b.length, sha256: sha(b) }; };
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const tag = process.argv[3]; assert(/^[a-z0-9-]{1,30}$/.test(tag ?? ''));
assert.equal(process.platform, 'linux'); process.chdir(ROOT);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), S2);
const stem = `tmp/rust-r2k/k-ui-build-${tag}`; fs.mkdirSync('tmp/rust-r2k', { recursive: true });
function walk(directory) {
    assert(fs.lstatSync(directory).isDirectory() && !fs.lstatSync(directory).isSymbolicLink());
    return fs.readdirSync(directory).sort().flatMap((name) => {
        const file = directory + '/' + name, stat = fs.lstatSync(file); assert(!stat.isSymbolicLink());
        return stat.isDirectory() ? walk(file) : (assert(stat.isFile()), [file]);
    });
}

if (process.argv[2] === '--container') {
    assert.equal(ROOT, SCRATCH); assert.equal(sha(fs.readFileSync(NODE)), NODE_SHA);
    const anchors = () => ['.modules.yaml', '.pnpm/lock.yaml'].map((file) => row(`${MODULES}/${file}`));
    const before = anchors(), log = stem + '-container.log', output = stem + '-container.json';
    assert(!fs.existsSync(log) && !fs.existsSync(output));
    const args = ['--cgroup-manager=cgroupfs', 'run', '--rm', '--pull=never', '--network=none',
        '--name', `poms-r2k-k-ui-build-${tag}`, '--workdir=/workspace',
        '--mount', `type=bind,source=${ROOT},destination=/workspace`, '--volume', `${MODULES}:${MODULES}:O`,
        '--mount', `type=bind,source=${NODE},destination=/usr/local/bin/node,readonly`,
        '--env', 'CI=true', '--entrypoint', '/usr/local/bin/node', IMAGE, 'tools/rust-r2k/k-ui-build.mjs', '--inside', tag];
    const fd = fs.openSync(log, 'wx', 0o600); let exitCode;
    try {
        exitCode = await new Promise((resolve, reject) => {
            const child = spawn('podman', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => { fs.writeSync(fd, data); process.stdout.write(data); });
            child.once('error', reject); child.once('close', resolve);
        });
    } finally { fs.closeSync(fd); }
    const after = anchors(); assert.deepEqual(after, before);
    const report = { formatVersion: 1, result: exitCode === 0 ? 'pass' : 'fail', sourceHead: S2, scratch: ROOT,
        image: IMAGE, network: 'none', node: row(NODE), exitCode, args, log: row(log),
        temporaryDependencyOverlay: true, lowerAnchorsBefore: before, lowerAnchorsAfter: after, lowerAnchorsUnchanged: true,
        sharedApiOrBrowserStarted: false, privateOrDatabaseMounted: false };
    json(output, report); console.log(JSON.stringify(report)); if (exitCode !== 0) process.exitCode = 1;
} else {
    assert.equal(process.argv[2], '--inside'); assert.equal(ROOT, '/workspace');
    assert.equal(process.version, 'v24.19.0'); assert.equal(sha(fs.readFileSync(process.execPath)), NODE_SHA);
    const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
    const baseline = loadBaseline(); assert.equal(baseline.sourceHead, S2); assertFrozenSources(ROOT, baseline);
    const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'libs', 'tools', 'package.json', 'pnpm-lock.yaml', 'openapitools.json', '.gitattributes', 'nx.json', 'tsconfig.base.json'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
    const previousFile = 'tmp/rust-r2k/b-scratch-node01.json', previous = JSON.parse(fs.readFileSync(previousFile));
    assert.equal(previous.result, 'pass'); assert.equal(previous.sourceHead, S2);
    const trackedBefore = tracked.map(row); assert.equal(sha(Buffer.from(JSON.stringify(trackedBefore))), previous.sourceBefore.manifestSha256);
    const proofs = ['native-build', 'shared-api-client-build', 'admin-data-access-build'].map((id) => {
        const step = previous.steps.find((item) => item.id === id); assert.equal(step?.result, 'pass');
        assert.equal(sha(fs.readFileSync(step.log)), step.logIdentity.sha256); return { id, log: step.log, sha256: step.logIdentity.sha256 };
    });
    assert(fs.readFileSync(proofs[0].log, 'utf8').includes('Done compiling TypeScript files for project "shared-contracts".'));
    const inputNames = [...new Set([...tracked, ...walk('tools/rust-r2k/k-ui-host'), 'tools/rust-r2k/k-ui-source.mjs', 'tools/rust-r2k/k-ui-build.mjs', 'tools/rust-r2k/k-ui-server.mjs'])].sort();
    const identity = (file) => {
        const b = fs.readFileSync(file); let normalizedLfSha256 = sha(b), lfRule = 'binary unchanged';
        if (!b.includes(0)) { try { const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); normalizedLfSha256 = sha(Buffer.from(text.replace(/\r\n/g, '\n'))); lfRule = 'UTF8 CRLF-to-LF only'; } catch {} }
        return { file, bytes: b.length, rawBytesSha256: sha(b), normalizedLfSha256, lfRule };
    };
    const before = inputNames.map(identity), env = { ...process.env, NX_DAEMON: 'false', NX_TUI: 'false', NX_SKIP_NX_CACHE: 'true', NG_CLI_ANALYTICS: 'false', CI: 'true' };
    for (const key of Object.keys(env)) if (/^(?:PG|DB_|MIKRO_)/i.test(key) || ['DATABASE_URL', 'JWT_SECRET', 'NODE_OPTIONS', 'POMS_ENV_FILE'].includes(key)) delete env[key];
    const packageFile = require.resolve('nx/package.json'), pkg = JSON.parse(fs.readFileSync(packageFile)), nx = path.resolve(path.dirname(packageFile), typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.nx);
    const directory = `dist/tools/rust-r2k-k-ui-host-${tag}`; assert(!fs.existsSync(directory), 'Keep prior/partial UI build output');
    const args = [nx, 'run', 'poms-admin:build:development', '--browser=tools/rust-r2k/k-ui-host/main.ts',
        '--tsConfig=tools/rust-r2k/k-ui-host/tsconfig.json', '--index=tools/rust-r2k/k-ui-host/index.html', `--outputPath=${directory}`,
        '--skip-nx-cache', '--output-style=static', '--excludeTaskDependencies'];
    const report = { formatVersion: 1, result: 'pending', kind: 'original-K-section-host-Angular-build', sourceHead: S2,
        node: process.version, startedAt: new Date().toISOString(), sourceMap: row('tools/rust-r2k/k-ui-host/source-map.json'),
        inputs: before, dependencyExclusion: { evidence: previousFile, evidenceSha256: sha(fs.readFileSync(previousFile)), proofs,
            scope: 'Only same-source/config successful shared-contracts/shared-api-client/admin-data-access dependencies' },
        args, directory, browserOrApiRun: false, fakeApiResponses: false, fullR4PageCertified: false };
    try {
        const sourceCheckLog = stem + '-source-check.log';
        await runtime.runOwnedCommand({ executable: process.execPath, args: ['tools/rust-r2k/k-ui-source.mjs', '--check'], cwd: ROOT, env, logPath: path.join(ROOT, sourceCheckLog), timeoutMs: 60000 });
        report.sourceCheck = { log: row(sourceCheckLog), exitCode: 0 };
        const log = stem + '.log';
        const result = await runtime.runOwnedCommand({ executable: process.execPath, args, cwd: ROOT, env, logPath: path.join(ROOT, log), timeoutMs: 300000 });
        report.build = { exitCode: result.code, log: row(log) };
        assertFrozenSources(ROOT, baseline); assert.deepEqual(inputNames.map(identity), before); report.inputsUnchanged = true;
        report.outputs = walk(directory).map(identity); report.outputsManifestSha256 = sha(Buffer.from(JSON.stringify(report.outputs)));
        report.result = 'pass';
    } catch (error) {
        report.result = 'fail'; report.failure = { name: error.name, message: error.message };
        if (fs.existsSync(stem + '.log')) report.failedBuildLog = row(stem + '.log');
        if (fs.existsSync(directory)) report.partialOutputs = walk(directory).map(identity);
        process.exitCode = 1;
    } finally {
        report.finishedAt = new Date().toISOString(); json(stem + '.json', report);
        console.log(JSON.stringify({ result: report.result, report: stem + '.json', directory, outputFiles: report.outputs?.length, failure: report.failure, browserOrApiRun: false }));
    }
}
