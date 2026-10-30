// Build the full original Angular application with an acceptance-only entry.
// No browser, HTTP server, database, private directory or old run evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBaseline, assertFrozenSources } from '../openapi/shared-api-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = '/home/wangzishi/projects/poms-rust-r2l-generator';
const IMAGE = 'ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
const MODULES = '/home/wangzishi/projects/poms-rust-r2d/node_modules';
const NODE = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const NODE_SHA = 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12';
const tag = process.argv[3];
assert.equal(process.platform, 'linux'); assert(/^[a-z0-9-]{1,30}$/.test(tag ?? '')); process.chdir(ROOT);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const row = (file) => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const baseline = loadBaseline(), sourceHead = baseline.sourceHead;
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHead);
const stem = 'tmp/rust-r2l/l-ui-build-' + tag; fs.mkdirSync('tmp/rust-r2l', { recursive: true });
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap((entry) => {
    const file = directory + '/' + entry.name; assert(!entry.isSymbolicLink());
    return entry.isDirectory() ? walk(file) : (assert(entry.isFile()), [file]);
});

if (process.argv[2] === '--container') {
    assert.equal(ROOT, SCRATCH); assert.equal(sha(fs.readFileSync(NODE)), NODE_SHA);
    const anchors = () => ['.modules.yaml', '.pnpm/lock.yaml'].map((file) => row(MODULES + '/' + file));
    const before = anchors(), log = stem + '-container.log'; assert(!fs.existsSync(log) && !fs.existsSync(stem + '-container.json'));
    assert.equal(execFileSync('podman', ['--cgroup-manager=cgroupfs', 'image', 'inspect', '--format', '{{.Id}}', IMAGE], { encoding: 'utf8' }).trim(), IMAGE);
    const args = ['--cgroup-manager=cgroupfs', 'run', '--rm', '--pull=never', '--network=none', '--name', 'poms-r2l-ui-build-' + tag,
        '--workdir=/workspace', '--mount', 'type=bind,source=' + ROOT + ',destination=/workspace', '--volume', MODULES + ':' + MODULES + ':O',
        '--mount', 'type=bind,source=' + NODE + ',destination=/usr/local/bin/node,readonly', '--env', 'CI=true',
        '--entrypoint', '/usr/local/bin/node', IMAGE, 'tools/rust-r2l/l-ui-build.mjs', '--inside', tag];
    const fd = fs.openSync(log, 'wx', 0o600); let exitCode;
    try {
        exitCode = await new Promise((resolve, reject) => {
            const child = spawn('podman', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            for (const stream of [child.stdout, child.stderr]) stream.on('data', (bytes) => { fs.writeSync(fd, bytes); process.stdout.write(bytes); });
            child.once('error', reject); child.once('close', resolve);
        });
    } finally { fs.closeSync(fd); }
    const after = anchors(); assert.deepEqual(after, before);
    const report = { formatVersion: 1, kind: 'L-original-full-app-Angular-container', result: exitCode === 0 ? 'pass' : 'fail',
        sourceHead, image: IMAGE, node: row(NODE), network: 'none', args, exitCode, log: row(log),
        lowerAnchorsBefore: before, lowerAnchorsAfter: after, lowerAnchorsUnchanged: true, temporaryDependencyUpper: true,
        databasePrivateOrEnvMounted: false, browserApiOrDatabaseStarted: false };
    json(stem + '-container.json', report); console.log(JSON.stringify({ report: stem + '-container.json', result: report.result }));
    if (exitCode !== 0) process.exitCode = 1;
} else {
    assert.equal(process.argv[2], '--inside'); assert.equal(ROOT, '/workspace'); assert.equal(process.version, 'v24.19.0');
    assert.equal(sha(fs.readFileSync(process.execPath)), NODE_SHA); assertFrozenSources(ROOT, baseline);
    assert(!fs.existsSync('.env') && !fs.existsSync('apps/poms-admin/.env'));
    const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
    const pkg = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    const declared = pkg('package.json');
    for (const name of ['@angular/core', '@angular/common', '@angular/platform-browser']) {
        assert.equal(declared.dependencies[name], '22.1.6'); assert.equal(pkg('node_modules/' + name + '/package.json').version, '22.1.6');
    }
    const originalMain = fs.readFileSync('apps/poms-admin/src/main.ts', 'utf8').replace(/\r\n/g, '\n');
    assert(originalMain.includes("import { appConfig } from './app.config';"));
    assert(originalMain.includes("import { AppComponent } from './app.component';"));
    assert(originalMain.includes('bootstrapApplication(AppComponent, appConfig).catch('));
    const admin = pkg('apps/poms-admin/project.json'); assert.equal(admin.targets.build.executor, '@angular-devkit/build-angular:application');
    assert.equal(admin.targets.build.options.browser, 'apps/poms-admin/src/main.ts');
    const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'libs', 'tools', 'package.json', 'pnpm-lock.yaml', 'openapitools.json', '.gitattributes', 'nx.json', 'tsconfig.base.json'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
    const trackedBefore = tracked.map(row), qaFile = 'tmp/rust-r2l/b-scratch-after-client02.json', qa = pkg(qaFile);
    assert.equal(qa.result, 'pass'); assert.equal(qa.sourceHead, sourceHead); assert.equal(qa.sourceFilesUnchanged, true);
    assert.equal(sha(JSON.stringify(trackedBefore)), qa.sourceBefore.manifestSha256, 'Current source differs from actual same-S3 dependency proof');
    assert.equal(qa.sourceBefore.manifestSha256, qa.sourceAfter.manifestSha256);
    const dependencyProofs = ['native-build', 'shared-api-client-build', 'admin-data-access-build'].map((id) => {
        const step = qa.steps.find((entry) => entry.id === id); assert.equal(step?.result, 'pass'); assert.equal(step.exitCode, 0);
        assert.equal(row(step.log).sha256, step.logIdentity.sha256); return { id, log: row(step.log) };
    });
    assert(fs.readFileSync(dependencyProofs[0].log.file, 'utf8').includes('Done compiling TypeScript files for project "shared-contracts".'));
    const inputs = [...new Set([...tracked, 'tools/rust-r2l/l-ui-main.ts', 'tools/rust-r2l/l-ui-tsconfig.json', 'tools/rust-r2l/l-ui-build.mjs'])].sort();
    const before = inputs.map(row);
    const nxFile = require.resolve('nx/package.json'), nxPackage = pkg(nxFile);
    const nx = path.resolve(path.dirname(nxFile), typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin.nx);
    const tsc = require.resolve('typescript/bin/tsc'); assert.equal(pkg('node_modules/typescript/package.json').version, '6.0.3');
    const env = { PATH: process.env.PATH, HOME: process.env.HOME ?? '/tmp', TMPDIR: '/tmp', NX_DAEMON: 'false', NX_TUI: 'false', NX_SKIP_NX_CACHE: 'true', NG_CLI_ANALYTICS: 'false', CI: 'true' };
    const report = { formatVersion: 1, kind: 'L-full-original-App-with-typed-DI-read-bridge', result: 'pending', sourceHead,
        angularVersion: '22.1.6', node: row(process.execPath), startedAt: new Date().toISOString(), inputs: before,
        originalBootstrapSources: ['apps/poms-admin/src/main.ts', 'apps/poms-admin/src/app.component.ts', 'apps/poms-admin/src/app.config.ts', 'apps/poms-admin/src/app.routes.ts'].map(row),
        dependencyExclusion: { evidence: row(qaFile), sameSourceManifestSha256: qa.sourceBefore.manifestSha256, proofs: dependencyProofs, scope: 'Only actual same-S3/source/config successful shared-contracts, shared-api-client and admin-data-access dependencies; no old receipts' },
        bridge: { originalProviders: true, actualGeneratedMethods: ['ProjectApi.projectControllerGetByCode', 'ContractApi.contractControllerGetByNo', 'ApprovalApi.approvalControllerGetApprovalRecord'], handwrittenQueryOrDTO: false },
        browserApiOrDatabaseStarted: false, privateOrDatabaseMounted: false, steps: [] };
    const plans = [['typescript', [tsc, '--project', 'tools/rust-r2l/l-ui-tsconfig.json', '--noEmit', '--pretty', 'false']]];
    for (const configuration of ['development', 'production']) {
        const directory = 'dist/tools/rust-r2l-ui-' + tag + '-' + configuration; assert(!fs.existsSync(directory), 'Keep prior/partial Angular build output');
        plans.push([configuration, [nx, 'run', 'poms-admin:build:' + configuration, '--browser=tools/rust-r2l/l-ui-main.ts', '--tsConfig=tools/rust-r2l/l-ui-tsconfig.json', '--outputPath=' + directory, '--skip-nx-cache', '--output-style=static', '--excludeTaskDependencies'], directory]);
    }
    for (const [id, args, directory] of plans) {
        const step = { id, args, directory, log: stem + '-' + id + '.log', result: 'pending', startedAt: new Date().toISOString() }; report.steps.push(step);
        assert(!fs.existsSync(step.log));
        try {
            const result = await runtime.runOwnedCommand({ executable: process.execPath, args, cwd: ROOT, env, logPath: path.join(ROOT, step.log), timeoutMs: 300000 });
            step.exitCode = result.code; step.result = 'pass';
            if (directory) { step.outputs = walk(directory).map(row); step.outputsManifestSha256 = sha(JSON.stringify(step.outputs)); }
        } catch (error) { step.result = 'fail'; step.failure = { name: error.name, message: error.message }; report.result = 'fail'; if (directory && fs.existsSync(directory)) step.partialOutputs = walk(directory).map(row); }
        step.logIdentity = row(step.log); step.finishedAt = new Date().toISOString();
        console.log(JSON.stringify({ step: id, result: step.result, outputFiles: step.outputs?.length, failure: step.failure }));
    }
    assertFrozenSources(ROOT, baseline); assert.deepEqual(inputs.map(row), before); report.inputsUnchanged = true;
    if (report.result === 'pending') report.result = 'pass'; report.finishedAt = new Date().toISOString(); json(stem + '.json', report);
    console.log(JSON.stringify({ report: stem + '.json', result: report.result, browserApiOrDatabaseStarted: false }));
    if (report.result !== 'pass') process.exitCode = 1;
}
