// Existing TS/Zod oracles; no product constructors, env files, HTTP or database.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { format } from 'prettier';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const nest = require('@nestjs/common');
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const sourceHead = '033aedd028fc25ea990450a7854fc92c567cfb8a';
const deliveryReference = 'ef9fd7f4871eb87167bca1ae04fae8a992ef594c';
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every((arg) => ['--check', '--write'].includes(arg)), 'Usage: node tools/rust-r1b/json-compat-oracle.mjs [--check|--write]');
const mode = args[0] ?? '--check';
const lf = (text) => text.replaceAll('\r\n', '\n');
const read = (file) => lf(fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const sharedFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const guardFile = 'apps/poms-api/src/app/core/auth/guards/permissions.guard.ts';
const platformFile = 'apps/poms-api/src/app/features/platform/platform.service.ts';
const requestFile = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts';
const decoratorFiles = {
    IS_PUBLIC_KEY: 'apps/poms-api/src/app/core/auth/decorators/public.decorator.ts',
    IS_AUTHENTICATED_KEY: 'apps/poms-api/src/app/core/auth/decorators/authenticated.decorator.ts',
    PERMISSIONS_KEY: 'apps/poms-api/src/app/core/auth/decorators/has-permissions.decorator.ts',
    ANY_PERMISSIONS_KEY: 'apps/poms-api/src/app/core/auth/decorators/has-any-permissions.decorator.ts'
};
const sourceFiles = [
    sharedFile,
    guardFile,
    platformFile,
    requestFile,
    ...Object.values(decoratorFiles),
    'apps/poms-api/src/app/features/platform/role-permission-assignment.entity.ts',
    'apps/poms-api/src/app/features/platform/platform.repository.ts',
    'package.json',
    'pnpm-lock.yaml',
    '.gitattributes',
    '.prettierrc.json'
].sort();
function git(command) {
    return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim();
}
assert.equal(git(['diff', '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles]), '', 'Frozen product working source differs');
assert.equal(git(['diff', '--cached', '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles]), '', 'Frozen product index source differs');
assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', ...sourceFiles]), '', 'Untracked source inputs are not reviewed');
git(['merge-base', '--is-ancestor', deliveryReference, 'HEAD']);
const source = new Map(sourceFiles.map((file) => [file, read(file)]));
const ast = new Map([...source].filter(([file]) => file.endsWith('.ts')).map(([file, text]) => [file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)]));
const excerpts = [];
const globals = { Array, Object, Set, Map, Number, String, Boolean, Date, Intl, Math, JSON, Promise, RegExp, Error, TypeError, RangeError, Symbol, BigInt, URL, NaN, Infinity, undefined };

function rejectUnknownNames(javascript, supplied) {
    const files = new Map([
        ['/oracle.js', javascript],
        ['/globals.d.ts', [...new Set([...Object.keys(globals), ...supplied, 'module', 'exports', 'require'])].map((name) => `declare const ${name}: any;`).join('\n')]
    ]);
    const host = {
        getSourceFile: (file, languageVersion) => (files.has(file) ? ts.createSourceFile(file, files.get(file), languageVersion, true) : undefined),
        getDefaultLibFileName: () => '/no-lib.d.ts',
        getCurrentDirectory: () => '/',
        getDirectories: () => [],
        fileExists: (file) => files.has(file),
        readFile: (file) => files.get(file),
        getCanonicalFileName: (file) => file,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        writeFile: () => {
            throw new Error('Oracle must not emit source');
        }
    };
    const program = ts.createProgram(['/oracle.js', '/globals.d.ts'], { allowJs: true, checkJs: true, noEmit: true, noLib: true, noResolve: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: [] }, host);
    const unknown = program.getSemanticDiagnostics().filter((diagnostic) => [2304, 2552, 2663].includes(diagnostic.code));
    assert.equal(unknown.length, 0, `Unknown lexical dependency: ${unknown.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')).join('; ')}`);
}

function evaluate(text, file, dependencies = {}, imports = {}) {
    const transpiled = ts.transpileModule(text, { fileName: file, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    assert(!transpiled.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error), `Invalid original TS: ${file}`);
    rejectUnknownNames(transpiled.outputText, Object.keys(dependencies));
    const module = { exports: {} };
    const context = vm.createContext({
        ...globals,
        ...dependencies,
        module,
        exports: module.exports,
        require(specifier) {
            assert(Object.hasOwn(imports, specifier), `Unknown oracle import: ${specifier}`);
            return imports[specifier];
        }
    });
    new vm.Script(transpiled.outputText, { filename: file }).runInContext(context, { timeout: 10000 });
    return module.exports;
}

function visit(node, action) {
    action(node);
    ts.forEachChild(node, (child) => visit(child, action));
}
function method(file, className, name, fields, constructor, dependencies) {
    const declaration = ast.get(file).statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === className);
    const members = declaration?.members.filter((member) => ts.isMethodDeclaration(member) && member.name.getText() === name);
    assert.equal(members?.length, 1, `Missing/duplicate original ${className}.${name}`);
    const node = members[0];
    visit(node.body, (child) => {
        if (ts.isPropertyAccessExpression(child) && child.expression.kind === ts.SyntaxKind.ThisKeyword) assert(fields.includes(child.name.getText()), `Unknown this dependency: ${child.name.getText()}`);
        if (ts.isElementAccessExpression(child) && child.expression.kind === ts.SyntaxKind.ThisKeyword) throw new Error('Computed this dependency is unsupported');
    });
    excerpts.push({ file, className, method: name, line: ast.get(file).getLineAndCharacterOfPosition(node.getStart()).line + 1, sha256: sha(node.getText()), fields });
    return evaluate(`class Oracle { ${constructor} ${node.getText()} } module.exports = Oracle;`, file, dependencies);
}
function literalConstant(file, name) {
    let initializer;
    visit(ast.get(file), (node) => {
        if (ts.isVariableDeclaration(node) && node.name.getText() === name) {
            assert.equal(initializer, undefined, `Duplicate ${name}`);
            initializer = node.initializer;
        }
    });
    assert(initializer && ts.isStringLiteral(initializer), `Unsupported metadata constant ${name}`);
    return initializer.text;
}

const shared = evaluate(source.get(sharedFile), sharedFile, {}, { zod: require('zod') });
const requestUtilities = evaluate(source.get(requestFile), requestFile);
const metadataKeys = Object.fromEntries(Object.entries(decoratorFiles).map(([name, file]) => [name, literalConstant(file, name)]));
const Guard = method(guardFile, 'PermissionsGuard', 'canActivate', ['#reflector', '#runtimeAuditService'], '#reflector; #runtimeAuditService; constructor(reflector, audit) { this.#reflector=reflector; this.#runtimeAuditService=audit; }', {
    ...metadataKeys,
    ...requestUtilities,
    ForbiddenException: nest.ForbiddenException,
    HttpStatus: nest.HttpStatus
});
const Platform = method(platformFile, 'PlatformService', 'getPermissionsForUser', ['platformRepository'], 'constructor(repository) { this.platformRepository=repository; }', {});
const inputFile = 'tools/rust-r1b/json-compat-cases.json';
const cases = JSON.parse(read(inputFile));
const presence = (value) => (value === undefined ? { presence: 'missing' } : value === null ? { presence: 'null' } : { presence: 'value', value });
function hydrate(input) {
    assert(['missing', 'null', 'value'].includes(input.presence), 'Unknown input presence');
    return input.presence === 'missing' ? undefined : input.presence === 'null' ? null : input.value;
}
function selectedSchema(name, field) {
    assert(Object.hasOwn(shared, name) && typeof shared[name]?.safeParse === 'function', `Unknown source schema ${name}`);
    let schema = shared[name];
    while (schema._zod.def.type === 'lazy') schema = schema.unwrap();
    if (field !== undefined) {
        assert(schema.shape && Object.hasOwn(schema.shape, field), `Unknown source field ${name}.${field}`);
        schema = schema.shape[field];
    }
    return schema;
}
const observe = (schema, value) => {
    const result = schema.safeParse(value);
    return result.success ? { success: true, output: presence(result.data) } : { success: false, issues: result.error.issues.map(({ code, path: issuePath }) => ({ code, path: issuePath })) };
};
const objectDescriptors = new Map();
function descriptor(name, field) {
    const key = field === undefined ? name : `${name}.${field}`;
    if (objectDescriptors.has(key)) return objectDescriptors.get(key);
    let schema = selectedSchema(name, field);
    while (['nullable', 'optional'].includes(schema._zod.def.type)) schema = schema.unwrap();
    assert.equal(schema._zod.def.type, 'object', `Source is not an object scope: ${key}`);
    const catchall = schema._zod.def.catchall;
    assert(catchall === undefined || ['never', 'unknown'].includes(catchall._zod.def.type), `Unsupported constrained catchall: ${key}`);
    const result = {
        key,
        schema: name,
        ...(field === undefined ? {} : { field }),
        unknownKeys: catchall === undefined ? 'strip' : catchall._zod.def.type === 'never' ? 'reject' : 'preserve',
        fields: Object.entries(schema.shape).map(([fieldName, fieldSchema]) => {
            const missing = observe(fieldSchema, undefined);
            return { name: fieldName, required: !missing.success, nullable: fieldSchema.safeParse(null).success, missing };
        })
    };
    objectDescriptors.set(key, result);
    return result;
}
const fieldResults = cases.fieldCases.map((input) => {
    const parent = descriptor(input.schema);
    return { id: input.id, input, descriptor: parent.key, result: observe(selectedSchema(input.schema, input.field), hydrate(input.input)) };
});
const objectResults = cases.objectCases.map((input) => ({ id: input.id, input, descriptor: descriptor(input.schema, input.field).key, result: observe(selectedSchema(input.schema, input.field), input.input) }));
const permissionResults = [];
for (const input of cases.permissionCases) {
    for (const key of [...input.all, ...input.any]) assert(shared.PERMISSION_KEYS.includes(key), `Unknown requirement in synthetic case: ${key}`);
    const metadata = new Map([
        [metadataKeys.IS_PUBLIC_KEY, input.publicRoute],
        [metadataKeys.IS_AUTHENTICATED_KEY, input.authenticatedRoute],
        [metadataKeys.PERMISSIONS_KEY, input.all],
        [metadataKeys.ANY_PERMISSIONS_KEY, input.any]
    ]);
    const events = [];
    const guard = new Guard(
        { getAllAndOverride: (key) => metadata.get(key) },
        {
            recordSecurityEvent: async (event) => {
                events.push(event);
            }
        }
    );
    const request = { method: 'GET', originalUrl: '/synthetic', headers: {}, user: { sub: 'synthetic-user', username: 'synthetic', permissions: input.userPermissions } };
    let result;
    try {
        assert.equal(await guard.canActivate({ getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => request }) }), true);
        result = { decision: 'allow' };
    } catch (error) {
        assert(error instanceof nest.ForbiddenException, 'Unexpected original guard exception');
        const response = error.getResponse();
        result = { decision: response.code === 'permission_denied' ? 'insufficient_permissions' : 'missing_declaration', status: error.getStatus(), response };
    }
    permissionResults.push({ id: input.id, input, result, auditEventCount: events.length });
}
const rawPermissionResults = [];
for (const input of cases.rawPermissionCases) {
    const repository = { findActiveUserRoleAssignments: async () => input.activeUserRoles, findRolesByIds: async () => input.roles, findActiveRolePermissionAssignments: async () => input.activeRolePermissions };
    rawPermissionResults.push({
        id: input.id,
        input,
        permissions: await new Platform(repository).getPermissionsForUser(input.userId),
        evidence: 'unchanged original method with repository boundary double; no SQL or role aggregation implementation in Rust'
    });
}
const refusals = {};
for (const [name, attempt, expected] of [
    ['unknownLexical', () => evaluate('module.exports = () => unprovidedOracleName;', 'negative.ts'), 'Unknown lexical dependency'],
    ['unknownImport', () => evaluate('module.exports = require("node:fs");', 'negative.ts'), 'Unknown oracle import'],
    ['unknownThis', () => method(platformFile, 'PlatformService', 'getPermissionsForUser', [], 'constructor() {}', {}), 'Unknown this dependency']
]) {
    try {
        attempt();
        throw new Error(`Negative boundary accepted: ${name}`);
    } catch (error) {
        assert(error.message.includes(expected), error.message);
        refusals[name] = true;
    }
}
const sourceManifest = sourceFiles.map((file) => ({ file, sha256: sha(source.get(file)) }));
const versions = Object.fromEntries(
    ['typescript', 'zod', '@nestjs/common', 'prettier'].map((name) => {
        const file = name.startsWith('@nestjs/') ? path.join(path.dirname(require.resolve(name)), 'package.json') : require.resolve(`${name}/package.json`);
        return [name, JSON.parse(read(file)).version];
    })
);
const golden = {
    formatVersion: 1,
    provenance: {
        sourceHead,
        deliveryReference,
        normalization: 'UTF-8 CRLF -> LF only',
        sourceManifest,
        sourceManifestSha256: sha(JSON.stringify(sourceManifest)),
        generatorSha256: sha(read(fileURLToPath(import.meta.url))),
        casesSha256: sha(read(inputFile)),
        versions,
        excerpts,
        evidence: 'Actual shared Zod schemas and unchanged PermissionsGuard/PlatformService methods. Resolved metadata/repository/audit are boundary doubles. No HTTP/session/Cookie/DB/complete response projection.',
        limits: 'JSON helpers certify presence and one object key scope, not all Zod scalar/refinement rules. R1C retains authentication, metadata lookup, audit writes, raw persistence and complete response construction.'
    },
    descriptors: [...objectDescriptors.values()].sort((a, b) => a.key.localeCompare(b.key)),
    fieldResults,
    objectResults,
    permissionResults,
    rawPermissionResults,
    refusals
};
const rendered = await format(JSON.stringify(golden), { ...JSON.parse(read('.prettierrc.json')), parser: 'json', endOfLine: 'lf' });
const output = path.join(directory, 'json-compat-golden.json');
if (mode === '--write') fs.writeFileSync(output, rendered, 'utf8');
else assert.equal(read(output), rendered, 'JSON compatibility golden differs; inspect source/cases before explicit --write');
console.log(JSON.stringify({ status: 'ok', mode, node: process.version, fields: fieldResults.length, objects: objectResults.length, permissions: permissionResults.length, raw: rawPermissionResults.length, sha256: sha(rendered), refusals }));
