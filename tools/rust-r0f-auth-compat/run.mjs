import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const ownDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(ownDirectory, '../..');
const productHead = '033aedd028fc25ea990450a7854fc92c567cfb8a';
const captureDeliveryHead = '08daaf45b12307bc4d53e01e509f23d265532de6';
const fixturePath = path.join(ownDirectory, 'fixtures/auth-compat.v1.json');
const mode = process.argv[2] ?? '--check';
assert(['--check', '--write'].includes(mode) && process.argv.length <= 3, 'Usage: node tools/rust-r0f-auth-compat/run.mjs [--check|--write]');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
assert(nodeMajor === 24 && nodeMinor >= 9, 'This oracle runner requires Node 24 >=24.9 for Nest12 synchronous ESM in Jest');

function git(args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, `git ${args[0]} failed: ${result.stderr}`);
    return result.stdout.trim();
}
const scopes = ['apps/poms-api/src', 'libs/api/contracts/src', 'libs/shared/contracts/src', 'libs/vendor/nestjs-zod/src', 'package.json', 'pnpm-lock.yaml', 'tsconfig.base.json', '.prettierrc.json'];
assert.equal(git(['diff', '--name-only', productHead, '--', ...scopes]), '', 'Frozen product inputs differ from 033 baseline (including staged/worktree changes)');
assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', ...scopes]), '', 'Untracked product inputs cannot be certified');
git(['merge-base', '--is-ancestor', captureDeliveryHead, 'HEAD']);

const sha = (value) => createHash('sha256').update(value).digest('hex');
const lf = (value) => value.replaceAll('\r\n', '\n');
const tracked = git(['ls-files', '--', ...scopes])
    .split('\n')
    .filter(Boolean);
const manifest = tracked.map((file) => ({ path: file, sha256: sha(lf(readFileSync(path.join(root, file), 'utf8'))) }));
function ownFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolute = path.join(directory, entry.name);
        if (entry.name === 'fixtures' || entry.name === 'README.md') return [];
        return entry.isDirectory() ? ownFiles(absolute) : [absolute];
    });
}
const generatorManifest = ownFiles(ownDirectory)
    .sort()
    .map((file) => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(lf(readFileSync(file, 'utf8'))) }));
const packages = ['typescript', 'jest', 'ts-jest', '@nestjs/common', '@nestjs/core', '@nestjs/swagger', 'zod', 'rxjs', 'reflect-metadata', 'prettier'];
const dependencies = packages.map((name) => {
    const relative = `node_modules/${name}/package.json`;
    const raw = readFileSync(path.join(root, relative), 'utf8');
    return { name, version: JSON.parse(raw).version, packageJsonSha256: sha(lf(raw)) };
});
const filterRelativePath = 'node_modules/@nestjs/core/exceptions/base-exception-filter.js';
const implementationPaths = [
    filterRelativePath,
    'node_modules/@nestjs/core/services/reflector.service.js',
    ...['http', 'bad-request', 'unauthorized', 'forbidden', 'internal-server-error'].map((name) => `node_modules/@nestjs/common/exceptions/${name}.exception.js`)
];
const dependencyImplementation = implementationPaths.map((file) => ({ path: file, sha256: sha(lf(readFileSync(path.join(root, file), 'utf8'))) }));
const temporary = mkdtempSync(path.join(tmpdir(), 'poms-r0f-auth-'));
try {
    const output = path.join(temporary, 'observed.json');
    const childEnv = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR']) {
        if (process.env[key] !== undefined) childEnv[key] = process.env[key];
    }
    Object.assign(childEnv, { NODE_ENV: 'test', TZ: 'UTC', CI: 'true', FORCE_COLOR: '0', R0F_AUTH_OUTPUT: output });
    const args = [
        '--experimental-vm-modules',
        '--require',
        path.join(ownDirectory, 'support/preload.cjs'),
        path.join(root, 'node_modules/jest/bin/jest.js'),
        '--config',
        path.join(ownDirectory, 'jest.config.cjs'),
        '--runInBand',
        '--no-cache',
        '--cacheDirectory',
        path.join(temporary, 'jest-cache')
    ];
    const child = spawnSync(process.execPath, args, { cwd: root, env: childEnv, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    if (child.status !== 0) {
        process.stderr.write(child.stdout ?? '');
        process.stderr.write(child.stderr ?? '');
        throw new Error(`Hermetic oracle suite failed (${child.status ?? child.error?.message})`);
    }
    if (!existsSync(output)) {
        process.stderr.write(child.stdout ?? '');
        process.stderr.write(child.stderr ?? '');
        throw new Error('Oracle suite did not emit its result');
    }
    const observed = JSON.parse(readFileSync(output, 'utf8'));
    const artifact = {
        schemaVersion: 1,
        baseline: {
            productHead,
            captureDeliveryHead,
            meaning: 'Product inputs are frozen at 033; delivery head identifies R0A-E. Later documentation/process commits are allowed only when all guarded product inputs remain unchanged.',
            normalization: 'UTF-8 text; CRLF -> LF only; sorted path manifest',
            sourceManifestSha256: sha(JSON.stringify(manifest))
        },
        sourceManifest: manifest,
        generatorManifest,
        dependencies,
        dependencyImplementation,
        runtime: {
            nodeRequirement: '24 >=24.9; actual invocation version is reported by runner, not rewritten into the deterministic golden',
            timezone: 'UTC',
            implementation: 'Existing TypeScript decisions; boundary mocks; explicit synthetic vendor contexts. No HTTP listener or database.'
        },
        ...observed
    };
    const text = await format(JSON.stringify(artifact), { ...JSON.parse(readFileSync(path.join(root, '.prettierrc.json'), 'utf8')), parser: 'json', endOfLine: 'lf' });
    if (mode === '--write') {
        mkdirSync(path.dirname(fixturePath), { recursive: true });
        writeFileSync(fixturePath, text, 'utf8');
    } else {
        assert(existsSync(fixturePath), 'Golden is absent; use explicit --write after review');
        assert.equal(lf(readFileSync(fixturePath, 'utf8')), text, 'Frozen golden differs; inspect changes before explicit --write');
    }
    process.stdout.write(`${mode} PASS: ${artifact.cases.length} cases; node=${process.versions.node}; groups=${[...new Set(artifact.cases.map((entry) => entry.group))].join(',')}; sha256=${sha(text)}\n`);
    process.stdout.write(`hermetic=${JSON.stringify(artifact.hermetic)}\n`);
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
