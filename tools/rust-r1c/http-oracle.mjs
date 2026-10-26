import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const require = createRequire(import.meta.url);
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
const mode = process.argv[2] ?? '--check';
assert(['--write', '--check'].includes(mode) && process.argv.length <= 3, 'Usage: http-oracle.mjs [--check|--write]');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
assert(nodeMajor === 24 && nodeMinor >= 9, 'R1C HTTP oracle requires Node 24 >=24.9');
const normalize = (text) => text.replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const read = (file) => normalize(readFileSync(path.isAbsolute(file) ? file : path.resolve(root, file), 'utf8'));
const scopes = [
    'apps/poms-api/src',
    'apps/poms-api/tsconfig.app.json',
    'libs/api/contracts/src',
    'libs/shared/contracts/src',
    'libs/vendor/nestjs-zod/src',
    'libs/shared/api-spec/openapi.json',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.base.json',
    '.prettierrc.json',
    '.gitattributes'
];
function git(args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `git source check failed: ${result.stderr}`);
    return result.stdout.trim();
}
for (const args of [
    ['diff', '--name-only', '--no-ext-diff', sourceHead],
    ['diff', '--cached', '--name-only', '--no-ext-diff', sourceHead],
    ['ls-files', '--others', '--exclude-standard']
])
    assert.equal(git([...args, '--', ...scopes]), '', 'R1C HTTP oracle source drift (working/index/untracked)');
const sourceManifest = git(['ls-files', '--', ...scopes])
    .split('\n')
    .filter(Boolean)
    .sort()
    .map((file) => ({ path: file, sha256: sha(read(file)) }));
const generatorFiles = ['http-env.mock.ts', 'http-jest.config.cjs', 'http-oracle.mjs', 'http-oracle.spec.ts', 'http-preload.cjs', 'http-tsconfig.json'];
const generatorManifest = generatorFiles.map((name) => ({ path: `tools/rust-r1c/${name}`, sha256: sha(read(path.join(directory, name))) }));
const nestRequire = createRequire(require.resolve('@nestjs/platform-express'));
const expressRequire = createRequire(nestRequire.resolve('express'));
const bodyParserRequire = createRequire(expressRequire.resolve('body-parser'));
const implementationPaths = [
    require.resolve('@nestjs/core/exceptions/base-exception-filter.js'),
    require.resolve('@nestjs/core/router/router-execution-context.js'),
    require.resolve('@nestjs/platform-express/adapters/express-adapter.js'),
    expressRequire.resolve('body-parser'),
    bodyParserRequire.resolve('./lib/types/json.js'),
    bodyParserRequire.resolve('./lib/types/urlencoded.js'),
    require.resolve('bcryptjs')
];
const dependencies = ['typescript', 'ts-jest', 'jest', '@nestjs/core', '@nestjs/common', '@nestjs/platform-express', 'zod', 'bcryptjs', 'prettier'].map((name) => ({ name, version: JSON.parse(read(`node_modules/${name}/package.json`)).version }));
const temporary = mkdtempSync(path.join(tmpdir(), 'poms-r1c-http-'));
try {
    const output = path.join(temporary, 'observed.json');
    const env = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR']) if (process.env[key] !== undefined) env[key] = process.env[key];
    Object.assign(env, { NODE_ENV: 'test', TZ: 'UTC', CI: 'true', FORCE_COLOR: '0', R1C_HTTP_OUTPUT: output });
    const result = spawnSync(
        process.execPath,
        [
            '--experimental-vm-modules',
            '--require',
            path.join(directory, 'http-preload.cjs'),
            path.resolve(root, 'node_modules/jest/bin/jest.js'),
            '--config',
            path.join(directory, 'http-jest.config.cjs'),
            '--runInBand',
            '--no-cache',
            '--cacheDirectory',
            path.join(temporary, 'jest-cache')
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }
    );
    if (result.status !== 0) {
        process.stderr.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        throw new Error(`Original Nest HTTP oracle failed: ${result.status ?? result.error?.message}`);
    }
    const observed = JSON.parse(readFileSync(output, 'utf8'));
    const artifact = {
        formatVersion: 1,
        provenance: {
            sourceHead,
            sourceManifest,
            sourceManifestSha256: sha(JSON.stringify(sourceManifest)),
            generatorManifest,
            dependencies,
            implementation: implementationPaths.map((file) => ({ logicalName: path.basename(file), sha256: sha(read(file)) })),
            textNormalization: 'UTF-8 CRLF→LF only; decoded JS string code units preserved',
            nodeCompatibility: '24 >=24.9; actual patch version reported separately',
            databaseConnected: false
        },
        ...observed
    };
    const profiles = {
        source: 'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts',
        sourceSha256: sourceManifest.find((item) => item.path === 'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts').sha256,
        scope: 'Original controller fallback only; never credential lookup, seed or evidence of successful authentication',
        profiles: artifact.fallbackProfiles
    };
    delete artifact.fallbackProfiles;
    const spec = JSON.parse(read('libs/shared/api-spec/openapi.json'));
    const selectedPaths = Object.fromEntries(['/api/auth/sessions', '/api/auth/session', '/api/auth/csrf-token', '/api/auth/session:logout'].map((path) => [path, spec.paths[path]]));
    const schemas = {};
    function refs(value) {
        if (Array.isArray(value)) value.forEach(refs);
        else if (value && typeof value === 'object') {
            if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
                const name = value.$ref.slice('#/components/schemas/'.length);
                if (!Object.hasOwn(schemas, name)) {
                    assert(spec.components.schemas[name], `missing schema ${name}`);
                    schemas[name] = spec.components.schemas[name];
                    refs(schemas[name]);
                }
            }
            Object.values(value).forEach(refs);
        }
    }
    refs(selectedPaths);
    const openapi = { openapi: spec.openapi, info: { title: 'POMS R1C auth documentation metadata exported from TS SSOT', version: '0.1.0' }, paths: selectedPaths, components: { schemas, securitySchemes: spec.components.securitySchemes } };
    const artifacts = [
        ['http-golden.json', artifact],
        ['http-profile-fallback.json', profiles],
        ['http-openapi.json', openapi]
    ];
    for (const [name, value] of artifacts) {
        const text = await format(JSON.stringify(value), { ...JSON.parse(read('.prettierrc.json')), parser: 'json', endOfLine: 'lf' });
        const file = path.join(directory, name);
        if (mode === '--write') {
            mkdirSync(directory, { recursive: true });
            writeFileSync(file, text);
        } else assert.equal(read(file), text, `Frozen ${name} differs; check does not refresh`);
    }
    console.log(JSON.stringify({ status: 'PASS', mode, node: process.versions.node, cases: artifact.cases.length, hermetic: artifact.hermetic, goldenSha256: sha(read('tools/rust-r1c/http-golden.json')) }));
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
