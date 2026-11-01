// R2M common01 recovery: preserve its failure and rerun only failed/unrun work.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const IMAGE = 'ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
const MODULES = '/home/wangzishi/projects/poms-rust-r2d/node_modules';
const NODE = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const SOURCE = '9dcfb498b175e9fdaae7584aff1d5d3f93bf814f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const tag = process.argv[3];
assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '') && tag !== 'common01');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), SOURCE);

function immutable(file) { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; }
function inheritedCommon01() {
    const reference = immutable('tmp/rust-r2m/node-validation-common01.json');
    const original = JSON.parse(fs.readFileSync(reference.file));
    assert.equal(original.sourceHead, SOURCE); assert.equal(original.result, 'failed-preserved');
    for (const name of ['native-build', 'api-lint', 'admin-lint', 'api-test']) {
        const step = original.steps.find(item => item.name === name); assert.equal(step?.exitCode, 0);
        assert.equal(sha(fs.readFileSync(step.log)), step.logSha256);
    }
    assert.equal(original.steps.find(item => item.name === 'admin-test')?.exitCode, 1);
    return { reference, original };
}
if (process.argv[2] === '--container') {
    assert.equal(ROOT, '/home/wangzishi/projects/poms-rust-r2m');
    assert.equal(sha(fs.readFileSync(NODE)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
    const inherited = inheritedCommon01();
    const output = `tmp/rust-r2m/node-container-${tag}.json`, log = `tmp/rust-r2m/node-container-${tag}.log`;
    assert(!fs.existsSync(output) && !fs.existsSync(log)); const fd = fs.openSync(log, 'wx', 0o600);
    const args = ['--cgroup-manager=cgroupfs', 'run', '--rm', '--pull=never', '--network=none', '--userns=keep-id', '--user', '1000:1000',
        '--name', 'poms-r2m-node-' + tag, '--workdir', '/workspace', '--mount', `type=bind,source=${ROOT},destination=/workspace`,
        '--volume', `${MODULES}:${MODULES}:O`, '--mount', `type=bind,source=${NODE},destination=/usr/local/bin/node,readonly`,
        '--env', 'CI=true', '--entrypoint', '/usr/local/bin/node', IMAGE, 'tools/rust-r2m/node-validation.mjs', '--inside', tag];
    let code;
    try { code = await new Promise((resolve, reject) => { const child = spawn('podman', args, { cwd: ROOT, stdio: ['ignore', fd, fd] }); child.once('error', reject); child.once('close', resolve); }); }
    finally { fs.fsyncSync(fd); fs.closeSync(fd); }
    assert.equal(sha(fs.readFileSync(inherited.reference.file)), inherited.reference.rawBytesSha256);
    const record = { kind: 'R2M-only-failed-unrun-Node-QA-container', result: code === 0 ? 'pass' : 'failed-preserved', exitCode: code,
        sourceHead: SOURCE, image: IMAGE, network: 'none', pureDependencyOverlay: true, privateOrDatabaseMounted: false,
        inheritedCommon01: inherited.reference, alreadyPassedNotRerun: ['native-build', 'api-lint', 'admin-lint', 'api-test'],
        source: immutable('tools/rust-r2m/node-validation.mjs'), log, logSha256: sha(fs.readFileSync(log)) };
    fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(record)); process.exitCode = code ?? 1;
} else {
    assert.equal(process.argv[2], '--inside'); assert.equal(ROOT, '/workspace');
    const inherited = inheritedCommon01(), require = createRequire(import.meta.url);
    const nxPackage = require.resolve('nx/package.json'), nxJson = JSON.parse(fs.readFileSync(nxPackage));
    const nx = path.resolve(path.dirname(nxPackage), typeof nxJson.bin === 'string' ? nxJson.bin : nxJson.bin.nx);
    const tsc = require.resolve('typescript/bin/tsc'), tsPackage = require.resolve('typescript/package.json');
    const scope = ['apps/poms-api/src', 'apps/poms-admin', 'libs/admin/data-access', 'libs/shared/api-client', 'libs/shared/contracts', 'libs/api/contracts', 'package.json', 'pnpm-lock.yaml', 'nx.json', 'tsconfig.base.json'];
    const qualify = () => {
        for (const args of [['diff', SOURCE, '--', ...scope], ['diff', '--cached', SOURCE, '--', ...scope], ['ls-files', '--others', '--exclude-standard', '--', ...scope]]) {
            assert.equal(execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }), '', 'Node source drift requires explicit requalification');
        }
        return { sourceHead: SOURCE, scopes: scope, currentWorkingTreeIndexAndUntrackedMatchFrozenSource: true, rawWholeTreeClaimed: false };
    };
    const output = `tmp/rust-r2m/node-validation-${tag}.json`; assert(!fs.existsSync(output));
    const record = { kind: 'R2M-only-failed-unrun-current-Node-checks', result: 'pending', sourceHead: SOURCE, node: process.version,
        inheritedCommon01: inherited.reference, sourceQualification: qualify(), runner: immutable('tools/rust-r2m/node-validation.mjs'),
        compiler: { package: immutable(tsPackage), entry: immutable(tsc), version: JSON.parse(fs.readFileSync(tsPackage)).version },
        alreadyPassedNotRerun: ['native-build', 'api-lint', 'admin-lint', 'api-test'], steps: [], UIbrowserTypecheck: 'Deferred to B current browser config/source delivery' };
    const targets = [
        ['admin-test', [nx, 'run', 'poms-admin:test', '--maxWorkers=2', '--skip-nx-cache', '--output-style=static']],
        ['shared-client-same-TypeScript-CLI', [tsc, '-b', 'libs/shared/api-client/tsconfig.lib.json', '--pretty', 'false']],
        ['admin-data-access-same-TypeScript-CLI', [tsc, '-b', 'libs/admin/data-access/tsconfig.lib.json', '--pretty', 'false']],
        ['admin-production-build', [nx, 'run', 'poms-admin:build:production', '--excludeTaskDependencies', '--skip-nx-cache', '--output-style=static']]
    ];
    for (const [name, args] of targets) {
        const log = `tmp/rust-r2m/node-${tag}-${name}.log`; assert(!fs.existsSync(log)); const fd = fs.openSync(log, 'wx', 0o600);
        const env = { ...process.env, NX_DAEMON: 'false', NX_SKIP_NX_CACHE: 'true', JEST_WORKERS: '2', NX_PARALLEL: '2', TZ: 'UTC' };
        for (const key of Object.keys(env)) if (/^NODE_OPTIONS$/i.test(key)) delete env[key];
        let code;
        try { code = await new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { cwd: ROOT, env, stdio: ['ignore', fd, fd] }); child.once('error', reject); child.once('close', resolve); }); }
        finally { fs.fsyncSync(fd); fs.closeSync(fd); }
        const dependencyEvidence = name === 'admin-production-build' ? {
            skipTaskGraphDependenciesExplicit: true, sourceQualification: record.sourceQualification,
            currentSuccessfulCLIRefs: record.steps.filter(item => item.name.endsWith('same-TypeScript-CLI')).map(item => ({ name: item.name, exitCode: item.exitCode, log: item.log, logSha256: item.logSha256 })),
            frozenNativeDependencyBuild: { original: inherited.reference, step: inherited.original.steps.find(item => item.name === 'native-build') },
            originalPnpmLaunchersClaimed: false
        } : undefined;
        if (dependencyEvidence) assert.equal(dependencyEvidence.currentSuccessfulCLIRefs.filter(item => item.exitCode === 0).length, 2);
        record.steps.push({ name, args, exitCode: code, log, logSha256: sha(fs.readFileSync(log)), NODE_OPTIONS: 'absent', timezone: 'UTC',
            ...(name.endsWith('same-TypeScript-CLI') ? { launcherQualification: 'Same installed TypeScript6.0.3 CLI at project target args; original pnpm launcher not executed.' } : {}),
            ...(dependencyEvidence ? { dependencyEvidence } : {}) });
        record.sourceQualificationAfterStep = qualify(); fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n'); console.log(JSON.stringify({ name, exitCode: code }));
        if (code !== 0) { record.result = 'failed-preserved'; process.exitCode = code ?? 1; break; }
    }
    if (record.steps.length === targets.length && record.steps.every(item => item.exitCode === 0)) record.result = 'pass';
    assert.equal(sha(fs.readFileSync(inherited.reference.file)), inherited.reference.rawBytesSha256);
    record.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n');
}
