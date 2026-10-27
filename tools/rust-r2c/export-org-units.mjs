import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeShared } from '../rust-r2a/export-navigation.oracle.mjs';
import { golden } from './org-units.oracle.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
export const ROOT = resolve(import.meta.dirname, '../..');
export const SOURCE_HEAD = '705973835d4c823ae8aa3988976e8d6a13b31dfe';
export const SCOPE = [
    'apps/poms-api/src',
    'libs/shared/contracts/src',
    'libs/api/contracts/src',
    'libs/vendor/nestjs-zod/src',
    'libs/shared/api-spec/openapi.json',
    'libs/shared/api-client',
    'docs/design/api-route-canonical-inventory.md',
    'package.json',
    'pnpm-lock.yaml',
    'tools/rust-r2b/collation',
    'tools/rust-r2b/collation-export',
    'tools/rust-r2b/export-roles-collation.mjs',
    'tools/rust-r2b/roles-authority.json'
];
export const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
export const orgRoutes = (spec) =>
    Object.keys(spec.paths)
        .filter((path) => /^\/api\/platform\/(org-unit-tree$|org-units(?:\/|$))/.test(path))
        .sort();
export const operationCount = (paths) => Object.values(paths).reduce((count, item) => count + Object.keys(item).filter((method) => METHODS.has(method)).length, 0);
const normalize = (text) => text.replace(/\r\n/g, '\n');
const read = (root, path) => normalize(readFileSync(resolve(root, path), 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (root, args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
        .split('\0')
        .filter(Boolean);

export function assertSourceGuard(root = ROOT, reference = SOURCE_HEAD) {
    for (const args of [
        ['diff', '--name-only', '-z', '--no-ext-diff', reference, '--', ...SCOPE],
        ['diff', '--cached', '--name-only', '-z', '--no-ext-diff', reference, '--', ...SCOPE],
        ['ls-files', '--others', '--exclude-standard', '-z', '--', ...SCOPE]
    ])
        assert.equal(git(root, args).length, 0, 'Frozen original authority differs in working tree, index or protected untracked files');
}

export function reachableSchemas(document, routes) {
    const names = new Set();
    function visit(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
            const name = value.$ref.slice('#/components/schemas/'.length);
            assert(Object.hasOwn(document.components.schemas, name), `Missing reachable schema ${name}`);
            if (!names.has(name)) {
                names.add(name);
                visit(document.components.schemas[name]);
            }
        }
        Object.values(value).forEach(visit);
    }
    for (const route of routes) visit(document.paths[route]);
    return names;
}

export function subset(spec) {
    const routes = orgRoutes(spec);
    assert.equal(routes.length, 6);
    const paths = Object.fromEntries(routes.map((path) => [path, spec.paths[path]]));
    assert.equal(operationCount(paths), 8);
    return { openapi: spec.openapi, paths, components: { schemas: Object.fromEntries([...reachableSchemas(spec, routes)].sort().map((name) => [name, spec.components.schemas[name]])), securitySchemes: spec.components.securitySchemes } };
}

export function buildArtifacts(root = ROOT) {
    assertSourceGuard(root);
    assert.equal(ts.version, '6.0.3');
    assert.equal(require('zod/package.json').version, '4.6.1');
    assert.equal(process.versions.node.split('.')[0], '24');
    const sharedPath = 'libs/shared/contracts/src/lib/shared-contracts.ts';
    const specPath = 'libs/shared/api-spec/openapi.json';
    const shared = executeShared(read(root, sharedPath));
    const openapi = subset(JSON.parse(read(root, specPath)));
    const cases = golden(shared, SOURCE_HEAD);
    const outputs = new Map(
        [
            ['tools/rust-r2c/org-units-openapi.json', openapi],
            ['tools/rust-r2c/org-units-golden.json', cases]
        ].map(([path, value]) => [path, JSON.stringify(value, null, 2) + '\n'])
    );
    const clientFiles = git(root, ['ls-files', '-z', '--', 'libs/shared/api-client']);
    assert.equal(clientFiles.length, 579);
    const binary = new Set(['tools/rust-r2b/collation/root.json', 'tools/rust-r2b/collation/jamo.json']);
    const manifest = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        authority: { shared: sharedPath, completeOpenApi: specPath, rule: 'Original TypeScript is the sole editable authority; generated Rust input only' },
        sourceGuard: { reference: SOURCE_HEAD, axes: ['working', 'index', 'untracked'], scope: SCOPE },
        sources: git(root, ['ls-files', '-z', '--', ...SCOPE])
            .sort()
            .map((path) => (binary.has(path) ? { path, rawBytesSha256: sha(readFileSync(resolve(root, path))), hashRule: 'opaque raw bytes' } : { path, normalizedUtf8Sha256: sha(read(root, path)), hashRule: 'UTF8 text CRLF to LF only' })),
        helpers: [
            'tools/rust-r2c/export-org-units.mjs',
            'tools/rust-r2c/org-units.oracle.mjs',
            'tools/rust-r2c/export-org-units.test.mjs',
            'tools/rust-r2c/verify-openapi.mjs',
            'tools/rust-r2c/verify-openapi.test.mjs',
            'tools/rust-r2a/export-navigation.oracle.mjs'
        ].map((path) => ({ path, normalizedUtf8Sha256: sha(read(root, path)) })),
        outputs: [...outputs].map(([path, text]) => ({ path, normalizedUtf8Sha256: sha(text) })),
        dependencies: { node: '24.x', typescript: ts.version, zod: '4.6.1' },
        evidence: {
            operations: 8,
            paths: 6,
            schemas: Object.keys(openapi.components.schemas).length,
            originalClientFiles: clientFiles.length,
            schemaCases: cases.cases.length,
            wireCases: cases.wireCases,
            nonWireCases: cases.nonWireCases,
            boundary: 'Pure source/schema execution; not Nest HTTP, database, browser or independent review'
        }
    };
    outputs.set('tools/rust-r2c/org-units-source.json', JSON.stringify(manifest, null, 2) + '\n');
    return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: export-org-units.mjs [--check]');
    for (const [path, text] of buildArtifacts()) {
        if (args.length) assert.equal(readFileSync(resolve(ROOT, path), 'utf8'), text, `Generated organization artifact differs: ${path}`);
        else {
            mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
            writeFileSync(resolve(ROOT, path), text);
        }
    }
    console.log(JSON.stringify({ result: 'pass', mode: args.length ? 'check' : 'write', operations: 8, paths: 6 }));
}
