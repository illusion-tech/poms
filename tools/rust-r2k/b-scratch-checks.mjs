// Independent S2 Node checks. Never imports the managed environment or PG tools.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFrozenSources, loadBaseline } from '../openapi/shared-api-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = '/home/wangzishi/projects/poms-rust-r2k-generator';
const S2 = 'ee0f4847cae292fe5cee1d1eec065b7194607683';
const IMAGE = 'ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
const MODULES = '/home/wangzishi/projects/poms-rust-r2d/node_modules';
const NODE = '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const NODE_SHA = 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const row = (file) => ({ file, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const tag = process.argv[3];
assert.equal(process.platform, 'linux');
assert(/^[a-z0-9-]{1,30}$/.test(tag ?? ''));
assert.equal(head(), S2);
process.chdir(ROOT);
fs.mkdirSync('tmp/rust-r2k', { recursive: true });

if (process.argv[2] === '--container') {
    assert.equal(ROOT, SCRATCH);
    assert.equal(sha(fs.readFileSync(NODE)), NODE_SHA);
    const anchor = () => ['.modules.yaml', '.pnpm/lock.yaml'].map((file) => row(`${MODULES}/${file}`));
    const before = anchor(), stem = `tmp/rust-r2k/b-scratch-container-${tag}`;
    for (const suffix of ['.log', '.json', '.cid']) assert(!fs.existsSync(stem + suffix));
    const inspected = execFileSync('podman', ['--cgroup-manager=cgroupfs', 'image', 'inspect', '--format', '{{.Id}}|{{index .Labels "org.poms.scope"}}', IMAGE], { encoding: 'utf8' }).trim();
    assert.equal(inspected, `${IMAGE}|rust-r1c`);
    const args = ['--cgroup-manager=cgroupfs', 'run', '--rm', '--pull=never', '--network=none',
        '--name', `poms-r2k-b-scratch-${tag}`, '--cidfile', path.join(ROOT, stem + '.cid'), '--workdir=/workspace',
        '--mount', `type=bind,source=${ROOT},destination=/workspace`,
        '--volume', `${MODULES}:${MODULES}:O`,
        '--mount', `type=bind,source=${NODE},destination=/usr/local/bin/node,readonly`,
        '--env', 'CI=true', '--entrypoint', '/usr/local/bin/node', IMAGE,
        'tools/rust-r2k/b-scratch-checks.mjs', '--inside', tag];
    const fd = fs.openSync(stem + '.log', 'wx', 0o600);
    let exitCode;
    try {
        exitCode = await new Promise((resolve, reject) => {
            const child = spawn('podman', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
            for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => { fs.writeSync(fd, data); process.stdout.write(data); });
            child.once('error', reject); child.once('close', resolve);
        });
    } finally { fs.closeSync(fd); }
    const after = anchor(); assert.deepEqual(after, before, 'Old dependency lower anchors changed');
    const report = { formatVersion: 1, result: exitCode === 0 ? 'pass' : 'fail', kind: 'S2-independent-scratch-container',
        sourceHead: S2, scratch: ROOT, image: IMAGE, exitCode, args,
        network: 'none', oldDependencyLowerUnchanged: true, temporaryDependencyUpper: true, before, after,
        nodeHost: row(NODE), log: row(stem + '.log'), databaseOrPrivateMounted: false };
    json(stem + '.json', report); console.log(JSON.stringify(report));
    if (exitCode !== 0) process.exitCode = 1;
} else {
    assert.equal(process.argv[2], '--inside'); assert.equal(ROOT, '/workspace');
    assert.equal(process.version, 'v24.19.0'); assert.equal(sha(fs.readFileSync(process.execPath)), NODE_SHA);
    const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
    const baseline = loadBaseline(); assert.equal(baseline.sourceHead, S2); assertFrozenSources(ROOT, baseline);
    const files = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'libs', 'tools', 'package.json', 'pnpm-lock.yaml',
        'openapitools.json', '.gitattributes', 'nx.json', 'tsconfig.base.json'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
    const trackedFingerprint = () => files.map(row);
    const before = trackedFingerprint(), sourceDigest = sha(Buffer.from(JSON.stringify(before)));
    const project = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    const apiProject = project('apps/poms-api/project.json'), adminProject = project('apps/poms-admin/project.json');
    assert.equal(apiProject.targets.build.options.command, 'webpack-cli build');
    assert.equal(adminProject.targets.build.executor, '@angular-devkit/build-angular:application');
    assert.equal(adminProject.targets.test.executor, '@nx/jest:jest');
    assert.deepEqual(Object.keys(project('apps/poms-admin-e2e/project.json').targets), ['e2e']);
    const nxPackageFile = require.resolve('nx/package.json'), nxPackage = project(nxPackageFile);
    const nx = path.resolve(path.dirname(nxPackageFile), typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin.nx);
    const eslint = path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
    const tsc = require.resolve('typescript/bin/tsc'), tsPackage = require.resolve('typescript/package.json');
    assert.equal(project(tsPackage).version, '6.0.3');
    assert.equal(project('package.json').devDependencies.typescript, '6.0.3');
    const libraryPlans = [['shared-api-client', 'libs/shared/api-client'], ['admin-data-access', 'libs/admin/data-access']].map(([name, directory]) => {
        const projectFile = `${directory}/project.json`, config = project(projectFile), tsconfig = `${directory}/tsconfig.lib.json`;
        assert.equal(config.name, name); assert.equal(config.targets.build.executor, 'nx:run-commands');
        assert.equal(config.targets.build.options.command, `pnpm exec tsc -b ${tsconfig} --pretty false`);
        return { target: `${name}:build`, projectFile, tsconfig, originalCommand: config.targets.build.options.command,
            actualExecutable: 'same Node24.19 installed TypeScript6.0.3 CLI', actualArgs: [tsc, '-b', tsconfig, '--pretty', 'false'],
            compilerPackage: row(tsPackage), compilerEntry: row(tsc),
            classification: 'pnpm bootstrap launcher substitution only; original pnpm target not claimed executed' };
    });
    const env = { ...process.env, NX_DAEMON: 'false', NX_TUI: 'false', NX_SKIP_NX_CACHE: 'true', NG_CLI_ANALYTICS: 'false', CI: 'true' };
    for (const key of Object.keys(env)) if (/^(?:PG|DB_|MIKRO_)/i.test(key) || ['DATABASE_URL', 'JWT_SECRET', 'NODE_OPTIONS', 'POMS_ENV_FILE'].includes(key)) delete env[key];
    env.DB_CONNECT = 'false'; env.NODE_ENV = 'test';
    const stem = `tmp/rust-r2k/b-scratch-${tag}`;
    assert(!fs.existsSync(stem + '.json'));
    const report = { formatVersion: 1, result: 'pending', kind: 'S2-independent-Node-regression', sourceHead: S2,
        node: process.version, nodeExecutable: row(process.execPath), helper: row('tools/rust-r2k/b-scratch-checks.mjs'), startedAt: new Date().toISOString(),
        sourceBefore: { files: before.length, manifestSha256: sourceDigest }, generatorGuardBefore: true,
        generatorWriteOrCheckRepeated: false, launcherSubstitutions: libraryPlans,
        notApplicable: [{ project: 'poms-admin-e2e', targets: ['lint', 'test'], reason: 'Only e2e target exists; browser source typecheck is separate, actual UI owned by Root' }],
        steps: [] };
    const steps = [
        ['native-build', [nx, 'run', 'poms-api:build', '--skip-nx-cache', '--output-style=static']],
        ['controller-eslint', [eslint,
            'apps/poms-api/src/app/features/project-handover/project-handover.controller.ts',
            'apps/poms-api/src/app/features/project-handover/project-handover.controller.spec.ts', '--max-warnings', '0']],
        ['api-admin-lint-tests', [nx, 'run-many', '--targets=lint,test', '--projects=poms-api,poms-admin', '--parallel=2', '--skip-nx-cache', '--output-style=static']],
        ['shared-api-client-build', libraryPlans[0].actualArgs],
        ['admin-data-access-lint', [nx, 'run', 'admin-data-access:lint', '--skip-nx-cache', '--output-style=static']],
        ['admin-data-access-build', libraryPlans[1].actualArgs],
        ['admin-production-build', [nx, 'run', 'poms-admin:build:production', '--skip-nx-cache', '--output-style=static', '--excludeTaskDependencies']],
        ['admin-e2e-typecheck', [tsc, '--project', 'tools/e2e/browser-tsconfig.json', '--noEmit', '--pretty', 'false']]
    ];
    try {
        for (const [id, args] of steps) {
            const step = { id, args, log: `${stem}-${id}.log`, result: 'pending', startedAt: new Date().toISOString() };
            report.steps.push(step);
            if (id === 'admin-production-build') {
                const native = report.steps.find((s) => s.id === 'native-build');
                const proofs = ['shared-api-client-build', 'admin-data-access-build'].map((name) => report.steps.find((s) => s.id === name));
                const contractsCompiled = native?.result === 'pass' && fs.readFileSync(native.log, 'utf8').includes('Done compiling TypeScript files for project "shared-contracts".');
                if (!contractsCompiled || !proofs.every((s) => s?.result === 'pass')) {
                    step.result = 'blocked-dependency-proof'; report.result = 'fail'; continue;
                }
                assert.deepEqual(trackedFingerprint(), before);
                step.dependencyProofs = [native, ...proofs].map((s) => ({ step: s.id, log: s.log, logSha256: s.logIdentity.sha256 }));
                step.dependencyFlag = 'Skip only same-run, same-source successful shared-contracts/shared-api-client/admin-data-access builds';
            }
            try {
                const result = await runtime.runOwnedCommand({ executable: process.execPath, args, cwd: ROOT, env,
                    logPath: path.join(ROOT, step.log), timeoutMs: 300000 });
                step.result = 'pass'; step.exitCode = result.code;
                if (id === 'native-build') {
                    assertFrozenSources(ROOT, baseline); assert.deepEqual(trackedFingerprint(), before);
                    const binary = row('dist/apps/poms-api/main.js');
                    const ready = { formatVersion: 1, result: 'build-pass-not-runtime', sourceHead: S2, binary,
                        buildStep: { args, log: row(step.log), exitCode: result.code }, sourceFilesUnchanged: true,
                        sourceManifestSha256: sourceDigest, databaseOrApiStarted: false, transferOwner: 'Root' };
                    json(`${stem}-native-ready.json`, ready); console.log(JSON.stringify({ nativeReady: `${stem}-native-ready.json`, ...ready }));
                }
            } catch (error) {
                step.result = 'fail'; step.failureType = error.name; step.failureMessage = error.message; report.result = 'fail';
            }
            if (fs.existsSync(step.log)) step.logIdentity = row(step.log);
            step.finishedAt = new Date().toISOString(); console.log(JSON.stringify(step));
        }
        assert.equal(head(), S2); assertFrozenSources(ROOT, baseline); report.generatorGuardAfter = true;
        const after = trackedFingerprint(); assert.deepEqual(after, before); report.sourceFilesUnchanged = true;
        report.sourceAfter = { files: after.length, manifestSha256: sha(Buffer.from(JSON.stringify(after))) };
        if (report.result === 'pending') report.result = 'pass';
    } catch (error) {
        report.result = 'fail'; report.failureType = error.name; report.failureMessage = error.message;
    } finally {
        report.finishedAt = new Date().toISOString(); json(stem + '.json', report);
    }
    if (report.result !== 'pass') process.exitCode = 1;
}
