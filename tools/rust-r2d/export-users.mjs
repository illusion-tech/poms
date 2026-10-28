import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeShared } from '../rust-r2a/export-navigation.oracle.mjs';
import { golden } from './users.oracle.mjs';
import { schemaCoverageManifest, httpCoverageManifest } from './http-compat-cases.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
export const ROOT = resolve(import.meta.dirname, '../..');
export const SOURCE_HEAD = 'a22cba7360346242cb7709740b7eb954b92d1fd4';
export const SCOPE = [
    'apps/poms-api/src',
    'libs/shared/contracts/src',
    'libs/api/contracts/src',
    'libs/vendor/nestjs-zod/src',
    'libs/shared/api-spec/openapi.json',
    'libs/shared/api-client',
    'docs/design/api-route-canonical-inventory.md',
    'apps/poms-admin/src',
    'libs/admin/data-access/src',
    'package.json',
    'pnpm-lock.yaml',
    'tools/rust-r2b/collation',
    'tools/rust-r2b/collation-export',
    'tools/rust-r2b/export-roles-collation.mjs',
    'tools/rust-r2b/roles-authority.json'
];
export const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
export const USER_PATHS = [
    '/api/auth/profile',
    '/api/platform/owner-reference',
    '/api/platform/users',
    '/api/platform/users/{id}',
    '/api/platform/users/{id}:activate',
    '/api/platform/users/{id}:deactivate',
    '/api/platform/users/{id}/roles',
    '/api/platform/users/{id}/org-memberships'
];
export const usersRoutes = (spec) => USER_PATHS.filter((path) => Object.hasOwn(spec.paths, path)).sort();
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
    const routes = usersRoutes(spec);
    assert.equal(routes.length, 8);
    const paths = Object.fromEntries(routes.map((path) => [path, spec.paths[path]]));
    assert.equal(operationCount(paths), 11);
    return { openapi: spec.openapi, paths, components: { schemas: Object.fromEntries([...reachableSchemas(spec, routes)].sort().map((name) => [name, spec.components.schemas[name]])), securitySchemes: spec.components.securitySchemes } };
}

export function buildArtifacts(root = ROOT) {
    assertSourceGuard(root);
    assert.equal(ts.version, '6.0.3');
    assert.equal(require('zod/package.json').version, '4.6.1');
    assert.equal(process.versions.node.split('.')[0], '24');
    assert.equal(process.versions.icu, '78.3');
    const sharedPath = 'libs/shared/contracts/src/lib/shared-contracts.ts';
    const specPath = 'libs/shared/api-spec/openapi.json';
    const shared = executeShared(read(root, sharedPath));
    const openapi = subset(JSON.parse(read(root, specPath)));
    const cases = golden(shared, SOURCE_HEAD);
    const coreDirectory = dirname(require.resolve('zod/v4/core'));
    const formats = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        originalRuntime: { node: '24.x', zod: require('zod/package.json').version, icu: '78.3', exactVersionReceipt: 'Generator CLI reports the actual Node patch version; corpus bytes must regenerate identically on admitted Node24 runtimes' },
        implementation: ['schemas.cjs', 'checks.cjs', 'regexes.cjs'].map((file) => ({ packagePath: 'zod/v4/core/' + file, normalizedUtf8Sha256: sha(readFileSync(resolve(coreDirectory, file), 'utf8').replace(/\r\n/g, '\n')) })),
        url: { parser: 'Original Zod parseURLObject uses WHATWG new URL(trimmed)', options: { normalize: false, hostname: null, protocol: null }, output: 'ECMAScript UTF16 trim, parse for acceptance, delete all TAB/LF/CR from trimmed original; not URL.href', rustParser: 'Already locked url 2.5.8 WHATWG parser; no added Cargo dependency', boundary: 'Finite control/scheme/host/IPv4/IPv6/port/IDNA/file/opaque/percent/Unicode corpus; not complete Unicode or all WHATWG conformance', cases: cases.cases.filter((entry) => entry.name.startsWith('avatarUrl:') || entry.name.startsWith('url-')) },
        email: { rule: 'Unchanged original shared Zod email pattern; profile trim is an outer transform', cases: cases.cases.filter((entry) => entry.name.startsWith('email:')) },
        runtimeBehaviorClaim: false
    };
    const outputs = new Map(
        [
            ['tools/rust-r2d/users-openapi.json', openapi],
            ['tools/rust-r2d/users-format-source.json', formats],
            ['tools/rust-r2d/users-http-coverage.json', schemaCoverageManifest(cases)],
            ['tools/rust-r2d/users-http-plan.json', httpCoverageManifest(cases)],
            ['tools/rust-r2d/users-golden.json', cases]
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
            'tools/rust-r2d/export-users.mjs',
            'tools/rust-r2d/users.oracle.mjs',
            'tools/rust-r2d/export-users.test.mjs',
            'tools/rust-r2d/verify-openapi.mjs',
            'tools/rust-r2d/verify-openapi.test.mjs',
            'tools/rust-r2d/http-compat-cases.mjs',
            'tools/rust-r2a/export-navigation.oracle.mjs'
        ].map((path) => ({ path, normalizedUtf8Sha256: sha(read(root, path)) })),
        outputs: [...outputs].map(([path, text]) => ({ path, normalizedUtf8Sha256: sha(text) })),
        dependencies: { node: '24.x', typescript: ts.version, zod: '4.6.1' },
        evidence: {
            operations: 11,
            paths: 8,
            schemas: Object.keys(openapi.components.schemas).length,
            originalClientFiles: clientFiles.length,
            schemaCases: cases.cases.length,
            wireCases: cases.wireCases,
            nonWireCases: cases.nonWireCases,
            boundary: 'Pure source/schema execution; not Nest HTTP, database, browser or independent review'
        }
    };
    outputs.set('tools/rust-r2d/users-source.json', JSON.stringify(manifest, null, 2) + '\n');
    return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: export-users.mjs [--check]');
    for (const [path, text] of buildArtifacts()) {
        if (args.length) assert.equal(readFileSync(resolve(ROOT, path), 'utf8'), text, `Generated user artifact differs: ${path}`);
        else {
            mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
            writeFileSync(resolve(ROOT, path), text);
        }
    }
    console.log(JSON.stringify({ result: 'pass', mode: args.length ? 'check' : 'write', operations: 11, paths: 8, generatorNode: process.versions.node, generatorIcu: process.versions.icu }));
}
