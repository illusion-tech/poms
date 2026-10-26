import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeShared, extractOpenApi, extractTree, goldenCases, normalizeText, sha256 } from './export-navigation.oracle.mjs';

const require = createRequire(import.meta.url);
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SOURCE_HEAD = '19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3';
export const SHARED_PATH = 'libs/shared/contracts/src/lib/shared-contracts.ts';
export const CONSTANTS_PATH = 'apps/poms-api/src/app/features/navigation/navigation.constants.ts';
export const SERVICE_PATH = 'apps/poms-api/src/app/features/navigation/navigation.service.ts';
export const SPEC_PATH = 'libs/shared/api-spec/openapi.json';
export const TREE_PATH = 'tools/rust-r2a/navigation-tree.json';
export const GOLDEN_PATH = 'tools/rust-r2a/navigation-golden.json';
export const OPENAPI_PATH = 'tools/rust-r2a/navigation-openapi.json';
export const SOURCE_PATH = 'tools/rust-r2a/navigation-source.json';
export const SOURCE_SCOPE = [
    '.gitattributes',
    '.prettierrc.json',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.base.json',
    'apps/poms-api/src/app/features/navigation',
    'apps/poms-api/src/app/features/platform/platform.controller.ts',
    'apps/poms-api/src/app/features/platform/platform.service.ts',
    'apps/poms-api/src/app/core/runtime-audit',
    'apps/poms-api/src/app/core/auth',
    'libs/shared/contracts/src',
    'libs/api/contracts/src',
    'libs/vendor/nestjs-zod/src',
    SPEC_PATH,
    'docs/design/api-route-canonical-inventory.md'
];
const GENERATORS = ['tools/rust-r2a/export-navigation.mjs', 'tools/rust-r2a/export-navigation.oracle.mjs', 'tools/rust-r2a/export-navigation.test.mjs'];
const read = (root, file) => normalizeText(readFileSync(resolve(root, file), 'utf8'));
function dependencyVersion(name) {
    let directory = dirname(require.resolve(name));
    while (true) {
        try {
            const metadata = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
            if (metadata.name === name) return metadata.version;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        const parent = dirname(directory);
        if (parent === directory) throw new Error(`Cannot locate dependency metadata ${name}`);
        directory = parent;
    }
}
function git(root, args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
        .split('\0')
        .filter(Boolean);
}

export function assertSourceGuard(root = ROOT) {
    const working = git(root, ['diff', '--name-only', '-z', '--no-ext-diff', SOURCE_HEAD, '--', ...SOURCE_SCOPE]);
    const index = git(root, ['diff', '--cached', '--name-only', '-z', '--no-ext-diff', SOURCE_HEAD, '--', ...SOURCE_SCOPE]);
    const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...SOURCE_SCOPE]);
    if (working.length || index.length || untracked.length)
        throw new Error(`Navigation source inputs differ from reviewed reference ${SOURCE_HEAD} (working/index/untracked); review the frozen input deliberately.\n${[...working, ...index, ...untracked].join('\n')}`);
}

export function buildArtifacts(root = ROOT) {
    assertSourceGuard(root);
    const dependencies = ['typescript', 'zod', '@nestjs/common', 'reflect-metadata'].map((name) => ({ name, version: dependencyVersion(name) }));
    assert.equal(process.versions.node.split('.')[0], '24', 'Navigation export requires Node 24.x');
    assert.equal(dependencies.find((item) => item.name === 'typescript').version, '6.0.3');
    assert.equal(dependencies.find((item) => item.name === 'zod').version, '4.6.1');
    const shared = executeShared(read(root, SHARED_PATH));
    const tree = extractTree(read(root, CONSTANTS_PATH), shared);
    const cases = goldenCases(read(root, SERVICE_PATH), tree, shared);
    const spec = JSON.parse(read(root, SPEC_PATH));
    const openapi = extractOpenApi(spec);
    const original = {
        fullTree: cases[0].observed.fullTree,
        snapshot: cases[0].observed.snapshot,
        cases: cases.filter((item) => item.tree === 'ssot' && item.kind === 'filtered').map((item) => ({ id: item.name, permissions: item.permissions, expectedTree: item.observed.navigation }))
    };
    const golden = { formatVersion: 1, sourceHead: SOURCE_HEAD, source: 'Actual original NavigationService methods; synthetic trees replace data only, never the algorithm', original, cases };
    const sourceFiles = git(root, ['ls-files', '-z', '--', ...SOURCE_SCOPE])
        .sort()
        .map((path) => ({ path, normalizedUtf8Sha256: sha256(read(root, path)) }));
    const generatorManifest = GENERATORS.map((path) => ({ path, normalizedUtf8Sha256: sha256(read(root, path)) }));
    const source = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        textNormalization: { encoding: 'utf8', rule: "text.replace(/\\r\\n/g, '\\n')", preserves: 'BOM, bare CR, Unicode, other whitespace and escape sequences', hashes: 'sha256 of normalized UTF-8 text, not raw bytes' },
        sourceGuard: { axes: ['working-vs-reference', 'index-vs-reference', 'untracked-scoped-inputs'], scope: SOURCE_SCOPE, checkIsReadOnly: true },
        dependencies,
        node: '24.x; actual patch version is reported by the runner, not embedded in portable payloads',
        authority: { tree: CONSTANTS_PATH, service: SERVICE_PATH, shared: SHARED_PATH, completeOpenApi: SPEC_PATH },
        nativeOracle: {
            sharedImports: ['zod'],
            serviceImports: ['node:crypto:createHash', '@nestjs/common:Injectable', './navigation.constants:NAVIGATION_TREE'],
            originalMethods: ['getNavigationForUser', 'getAllNavigationItems', 'getNavigationAuditSnapshot'],
            syntheticBoundary: 'Only the const tree binding is replaced in the controlled process. Shared schemas and original methods execute unchanged.',
            notClaimed: 'No Nest HTTP, browser, database, adapter, transaction or deployment execution; vm is not a security boundary for untrusted code.'
        },
        coverage: {
            permissions: shared.PERMISSION_KEYS.length,
            nodes: original.snapshot.nodeCount,
            routes: original.snapshot.routeCount,
            fieldsPerNode: 13,
            originalTreePermissionCases: original.cases.length,
            cases: cases.length,
            syntheticCases: cases.filter((item) => item.synthetic).length,
            openApiOperations: 3,
            openApiSchemas: Object.keys(openapi.components.schemas ?? {}).length
        },
        sourceFiles,
        generatorManifest
    };
    const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
    return new Map([
        [TREE_PATH, json(tree)],
        [GOLDEN_PATH, json(golden)],
        [OPENAPI_PATH, json(openapi)],
        [SOURCE_PATH, json(source)]
    ]);
}

export function checkArtifacts(expected, root = ROOT) {
    for (const [file, value] of expected) {
        let actual;
        try {
            actual = read(root, file);
        } catch {
            throw new Error(`Missing navigation artifact ${file}; run --write explicitly`);
        }
        if (actual !== value) throw new Error(`Stale or modified navigation artifact ${file}; edit TypeScript authority and regenerate explicitly`);
    }
}

export function main(args = process.argv.slice(2), root = ROOT) {
    assert(args.length === 1 && ['--write', '--check'].includes(args[0]), 'Usage: node tools/rust-r2a/export-navigation.mjs --write|--check');
    const outputs = buildArtifacts(root);
    if (args[0] === '--write')
        for (const [file, text] of outputs) {
            mkdirSync(dirname(resolve(root, file)), { recursive: true });
            writeFileSync(resolve(root, file), text, 'utf8');
        }
    else checkArtifacts(outputs, root);
    console.log(
        JSON.stringify({ mode: args[0], actualNodeVersion: process.versions.node, coverage: JSON.parse(outputs.get(SOURCE_PATH)).coverage, artifacts: [...outputs].map(([path, text]) => ({ path, normalizedUtf8Sha256: sha256(text) })) }, null, 2)
    );
    return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
