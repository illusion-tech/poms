import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { executeShared } from '../rust-r2a/export-navigation.oracle.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const nest = require('@nestjs/common');
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SOURCE_HEAD = '9734515f84ebe1a4833d207124adbfbe378f691f';
const SHARED = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const SERVICE = 'apps/poms-api/src/app/features/platform/platform.service.ts';
const SPEC = 'libs/shared/api-spec/openapi.json';
const SCOPE = [
    'apps/poms-api/src/app/features/platform',
    'apps/poms-api/src/app/core/auth',
    'apps/poms-api/src/app/core/runtime-audit',
    'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts',
    'apps/poms-api/src/seeders/platform-bootstrap.seeder.ts',
    'libs/shared/contracts/src',
    'libs/api/contracts/src',
    'libs/vendor/nestjs-zod/src',
    SPEC,
    'docs/design/api-route-canonical-inventory.md',
    'package.json',
    'pnpm-lock.yaml'
];
const normalize = (text) => text.replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const read = (root, path) => normalize(readFileSync(resolve(root, path), 'utf8'));
const git = (root, args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
        .split('\0')
        .filter(Boolean);

export function assertSourceGuard(root = ROOT) {
    const changes = [
        ...git(root, ['diff', '--name-only', '-z', '--no-ext-diff', SOURCE_HEAD, '--', ...SCOPE]),
        ...git(root, ['diff', '--cached', '--name-only', '-z', '--no-ext-diff', SOURCE_HEAD, '--', ...SCOPE]),
        ...git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...SCOPE])
    ];
    assert.equal(changes.length, 0, `Frozen role authority differs (working/index/untracked): ${changes.join(', ')}`);
}

function originalService(text, shared) {
    const exports = {};
    const placeholders = Object.fromEntries(['OrgUnit', 'PlatformRepository', 'PlatformRole', 'NavigationService', 'RuntimeAuditService'].map((name) => [name, class {}]));
    const imports = {
        '@poms/shared-contracts': shared,
        '@nestjs/common': nest,
        bcryptjs: require('bcryptjs'),
        '../../core/runtime-audit/runtime-audit.service': placeholders,
        '../navigation/navigation.service': placeholders,
        './org-unit.entity': placeholders,
        './platform.repository': placeholders,
        './role.entity': placeholders
    };
    const source = `${text}\nexport const __r2bMinimum = SYSTEM_ROLE_MINIMUM_PERMISSION_KEYS;\n`;
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: false } });
    new Script(compiled.outputText, { filename: SERVICE }).runInNewContext(
        {
            exports,
            require: (name) => {
                assert(Object.hasOwn(imports, name), `Unreviewed original service import ${name}`);
                return imports[name];
            }
        },
        { timeout: 5000 }
    );
    const service = new exports.PlatformService({}, {}, {});
    return { permissions: service.listPermissions(), minimumPermissions: exports.__r2bMinimum };
}

function subset(spec) {
    const paths = Object.fromEntries(Object.entries(spec.paths).filter(([path]) => /^\/api\/platform\/(permissions$|roles(?:\/|$))/.test(path)));
    assert.equal(Object.keys(paths).length, 6);
    assert.equal(
        Object.values(paths).reduce((count, item) => count + Object.keys(item).length, 0),
        8
    );
    const schemas = {};
    function visit(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
            const name = value.$ref.split('/').at(-1);
            if (!Object.hasOwn(schemas, name)) {
                assert(Object.hasOwn(spec.components.schemas, name), `Missing schema ${name}`);
                schemas[name] = spec.components.schemas[name];
                visit(schemas[name]);
            }
        }
        for (const child of Object.values(value)) visit(child);
    }
    visit(paths);
    return { openapi: spec.openapi, paths, components: { schemas: Object.fromEntries(Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b))), securitySchemes: spec.components.securitySchemes } };
}

function golden(shared) {
    const cases = [];
    function add(schema, name, value, raw = value === undefined ? null : JSON.stringify(value)) {
        let expected;
        try {
            const parsed = shared[`${schema}Schema`].safeParse(raw === null ? undefined : JSON.parse(raw));
            expected = parsed.success ? { success: true, dataRaw: JSON.stringify(parsed.data) } : { success: false, errors: parsed.error.issues };
        } catch (error) {
            assert(error instanceof TypeError, `Unexpected original schema exception: ${error}`);
            expected = { success: false, internalError: { name: error.name, message: error.message } };
        }
        cases.push({ name: `${schema}:${name}`, schema, inputRaw: raw, expected });
    }
    for (const schema of ['CreateRoleRequest', 'UpdateRoleRequest', 'UpdateRoleActivationRequest', 'AssignRolePermissionsRequest']) {
        for (const [name, value] of [
            ['missing', undefined],
            ['null', null],
            ['array', []],
            ['string', 'x'],
            ['empty', {}]
        ])
            add(schema, name, value);
    }
    const create = { roleKey: ' key ', name: ' Name ' };
    add('CreateRoleRequest', 'minimal-trim', create);
    add('CreateRoleRequest', 'strip', { ...create, isSystemRole: true, isActive: false, unknown: '\ud800' });
    add('CreateRoleRequest', 'nullable', { ...create, description: null, displayOrder: 0 });
    for (const field of ['roleKey', 'name', 'description', 'displayOrder']) {
        for (const [name, value] of [
            ['null', null],
            ['boolean', true],
            ['array', []],
            ['object', {}]
        ])
            add('CreateRoleRequest', `${field}-${name}`, { ...create, [field]: value });
    }
    for (const [field, max] of [
        ['roleKey', 64],
        ['name', 128],
        ['description', 1000]
    ]) {
        for (const size of [max, max + 1]) add('CreateRoleRequest', `${field}-astral-${size}`, { ...create, [field]: '😀'.repeat(size) });
        add('CreateRoleRequest', `${field}-surrogate`, { ...create, [field]: '\ud800' });
        // A check's explicit `when` can run after invalid_type. Generate the
        // resulting complete issues from the real schemas, including JS length
        // coercion and the TypeError raised by an unconvertible JSON object.
        for (const [label, value] of [
            ['array-one', [0]],
            ['array-too-long', Array(max + 1).fill(null)],
            ['length-zero', { length: 0 }],
            ['length-large', { length: max + 1 }],
            ['length-string', { length: '0' }],
            ['length-radix', { length: '0x1000' }],
            ['length-null', { length: null }],
            ['length-bool', { length: true }],
            ['length-empty-array', { length: [] }],
            ['length-array', { length: [max + 1] }],
            ['length-object', { length: {} }],
            ['length-unconvertible', { length: { toString: null } }]
        ])
            add('CreateRoleRequest', `${field}-${label}`, { ...create, [field]: value });
    }
    for (const value of ['', '  ', '\ufeff\u00a0x\u202f', '\u0085x\u0085']) add('CreateRoleRequest', `trim-${JSON.stringify(value)}`, { ...create, roleKey: value });
    for (const value of [-1, -0, 1.5, -1.5, '3', 2147483648, 9007199254740991, 9007199254740992, -9007199254740992]) {
        add('CreateRoleRequest', `number-${value}`, { ...create, displayOrder: value });
        add('UpdateRoleRequest', `number-${value}`, { displayOrder: value });
        add('UpdateRoleActivationRequest', `version-${value}`, { expectedVersion: value });
    }
    add('UpdateRoleRequest', 'infinity', null, '{"displayOrder":1e999}');
    add('UpdateRoleRequest', 'strip-only', { roleKey: 'other', expectedVersion: 1 });
    add('UpdateRoleRequest', 'empty-name', { name: ' ' });
    add('UpdateRoleRequest', 'clear-description', { description: null });
    add('UpdateRoleRequest', 'null-name', { name: null });
    add('UpdateRoleRequest', 'three-invalid', { name: 1, description: false, displayOrder: 'x' });
    add('UpdateRoleRequest', 'length-nan', { name: { length: {} } });
    add('UpdateRoleRequest', 'length-unconvertible', { name: { length: { toString: null } } });
    add('UpdateRoleActivationRequest', 'ignored-but-valid', { reason: '', comment: ' c ', expectedVersion: 999 });
    add('UpdateRoleActivationRequest', 'three-nulls', { reason: null, comment: null, expectedVersion: null });
    add('UpdateRoleActivationRequest', 'long-reason-comment', { reason: 'a'.repeat(1001), comment: 'a'.repeat(1001) });
    add('UpdateRoleActivationRequest', 'array-length', { reason: [], comment: Array(1001).fill(null) });
    add('UpdateRoleActivationRequest', 'length-nan', { reason: { length: {} }, comment: { length: -1 } });
    add('UpdateRoleActivationRequest', 'length-unconvertible', { reason: { length: { toString: null } } });
    for (const value of [[], ['project:read', 'project:read'], shared.PERMISSION_KEYS, ['legacy:unknown', null, 9, {}], null, 'project:read']) add('AssignRolePermissionsRequest', `permissions-${cases.length}`, { permissionKeys: value });
    return { formatVersion: 1, sourceHead: SOURCE_HEAD, oracle: 'Actual original shared Zod schemas; successful payloads and complete raw issues', cases };
}

export function buildArtifacts(root = ROOT) {
    assertSourceGuard(root);
    assert.equal(ts.version, '6.0.3');
    assert.equal(require('zod/package.json').version, '4.6.1');
    assert.equal(process.versions.node.split('.')[0], '24');
    const shared = executeShared(read(root, SHARED));
    const authority = originalService(read(root, SERVICE), shared);
    assert.equal(authority.permissions.length, 37);
    assert.equal(JSON.stringify(authority.permissions.map((entry) => entry.key)), JSON.stringify(shared.PERMISSION_KEYS));
    const openapi = subset(JSON.parse(read(root, SPEC)));
    const cases = golden(shared);
    const manifest = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        authority: { shared: SHARED, service: SERVICE, completeOpenApi: SPEC, rule: 'TypeScript is the sole editable role/permission authority; outputs are one-way generated' },
        hashRule: 'SHA256 of UTF8 decoded text with CRLF replaced by LF only; not raw bytes',
        sourceGuard: { reference: SOURCE_HEAD, axes: ['working', 'index', 'untracked'], scope: SCOPE },
        sources: git(root, ['ls-files', '-z', '--', ...SCOPE])
            .sort()
            .map((path) => ({ path, normalizedUtf8Sha256: sha(read(root, path)) })),
        helpers: ['tools/rust-r2b/export-roles.mjs', 'tools/rust-r2b/export-roles.test.mjs', 'tools/rust-r2a/export-navigation.oracle.mjs'].map((path) => ({ path, normalizedUtf8Sha256: sha(read(root, path)) })),
        dependencies: { node: '24.x', typescript: ts.version, zod: '4.6.1' },
        evidence: { operations: 8, paths: 6, permissions: 37, schemas: Object.keys(openapi.components.schemas).length, schemaCases: cases.cases.length, boundary: 'Pure original-source/schema execution; not Nest HTTP or database evidence' }
    };
    return new Map(
        [
            ['tools/rust-r2b/roles-authority.json', authority],
            ['tools/rust-r2b/roles-openapi.json', openapi],
            ['tools/rust-r2b/roles-golden.json', cases],
            ['tools/rust-r2b/roles-source.json', manifest]
        ].map(([path, value]) => [path, `${JSON.stringify(value, null, 2)}\n`])
    );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const check = process.argv.slice(2);
    assert(check.length === 0 || (check.length === 1 && check[0] === '--check'), 'Usage: export-roles.mjs [--check]');
    for (const [path, expected] of buildArtifacts()) {
        if (check.length) assert.equal(readFileSync(resolve(ROOT, path), 'utf8'), expected, `Generated role artifact differs: ${path}`);
        else {
            mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
            writeFileSync(resolve(ROOT, path), expected);
        }
    }
    console.log(JSON.stringify({ result: 'pass', mode: check.length ? 'check' : 'write', operations: 8, paths: 6, permissions: 37 }));
}
