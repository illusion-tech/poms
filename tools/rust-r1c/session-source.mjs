// Exact original classes/methods with real MikroORM entities and repositories.
// Only DI construction and the environment-loader boundary are supplied here.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
assert(nodeMajor === 24 && nodeMinor >= 9, 'Session bridge requires Node 24 >=24.9');
const core = require('@mikro-orm/core');
const nest = require('@nestjs/common');
const mikroNest = require('@mikro-orm/nestjs');
const bcrypt = require('bcryptjs');
const nodeCrypto = require('node:crypto');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
const platformDirectory = 'apps/poms-api/src/app/features/platform';
const authDirectory = 'apps/poms-api/src/app/core/auth';
const entityFiles = [
    `${authDirectory}/auth-session.entity.ts`,
    ...['platform-user', 'local-credential', 'role', 'user-role-assignment', 'role-permission-assignment', 'org-unit', 'user-org-membership'].map((name) => `${platformDirectory}/${name}.entity.ts`),
    ...['audit-log', 'security-event'].map((name) => `apps/poms-api/src/app/core/runtime-audit/${name}.entity.ts`)
];
const sessionFile = `${authDirectory}/auth-session.service.ts`;
const repositoryFile = `${authDirectory}/auth-session.repository.ts`;
const platformFile = `${platformDirectory}/platform.service.ts`;
const platformRepositoryFile = `${platformDirectory}/platform.repository.ts`;
const sourceFiles = [
    ...entityFiles,
    sessionFile,
    repositoryFile,
    platformFile,
    platformRepositoryFile,
    'package.json',
    'pnpm-lock.yaml',
    '.gitattributes',
    'tools/rust-r0f/data-compat/r1-persistence.json',
    'tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json'
].sort();
export const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
export const sha = (text) => createHash('sha256').update(text).digest('hex');
for (const args of [
    ['diff', '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles],
    ['diff', '--cached', '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles],
    ['ls-files', '--others', '--exclude-standard', '--', ...sourceFiles]
])
    assert.equal(execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim(), '', 'Session bridge refuses changed/unreviewed frozen source');

const sourceManifest = sourceFiles.map((file) => ({ file, sha256: sha(read(file)) }));
const sources = new Map(sourceFiles.map((file) => [file, read(file)]));
const excerpts = [];
const globals = { Array, Object, Set, Map, Number, String, Boolean, Date, Math, JSON, Promise, RegExp, Error, TypeError, RangeError, Symbol, BigInt, NaN, Infinity, undefined };
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
            throw new Error('No oracle emit');
        }
    };
    const program = ts.createProgram(['/oracle.js', '/globals.d.ts'], { allowJs: true, checkJs: true, noEmit: true, noLib: true, noResolve: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: [] }, host);
    const unknown = program.getSemanticDiagnostics().filter((diagnostic) => [2304, 2552, 2663].includes(diagnostic.code));
    assert.equal(unknown.length, 0, 'Unknown lexical dependency in original session/platform source');
}
function evaluate(text, file, imports = {}, supplied = {}) {
    const transpiled = ts.transpileModule(text, { fileName: file, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } });
    assert(!transpiled.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error), 'Original TypeScript did not transpile');
    rejectUnknownNames(transpiled.outputText, Object.keys(supplied));
    const module = { exports: {} };
    const context = vm.createContext({
        ...globals,
        ...supplied,
        module,
        exports: module.exports,
        require(specifier) {
            assert(Object.hasOwn(imports, specifier), `Unapproved source import: ${specifier}`);
            return imports[specifier];
        }
    });
    new vm.Script(transpiled.outputText, { filename: file }).runInContext(context, { timeout: 10000 });
    return module.exports;
}
const loaded = new Map();
function loadEntity(file) {
    if (loaded.has(file)) return loaded.get(file);
    assert(entityFiles.includes(file), 'Unapproved entity dependency');
    const text = sources.get(file);
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const imports = { '@mikro-orm/core': core };
    for (const node of ast.statements.filter(ts.isImportDeclaration)) {
        const specifier = node.moduleSpecifier.text;
        if (specifier.startsWith('.')) {
            const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), `${specifier}.ts`));
            imports[specifier] = loadEntity(dependency);
        }
    }
    const result = evaluate(text, file, imports);
    loaded.set(file, result);
    return result;
}
for (const file of entityFiles) loadEntity(file);
const platformMethods = ['verifyCredentials', 'resolveActiveAuthUser', 'getPermissionsForUser', 'getSanitizedUserProfile', '#loadUserAggregationContext', '#buildUserOrgUnits'];
const platformAst = ts.createSourceFile(platformFile, sources.get(platformFile), ts.ScriptTarget.Latest, true);
const platformClass = platformAst.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'PlatformService');
const allowedThis = ['platformRepository', ...platformMethods];
function visit(node, action) {
    action(node);
    ts.forEachChild(node, (child) => visit(child, action));
}
const members = platformMethods.map((name) => {
    const methods = platformClass.members.filter((node) => ts.isMethodDeclaration(node) && node.name.getText() === name);
    assert.equal(methods.length, 1, 'Missing/duplicate original platform method');
    const method = methods[0];
    visit(method.body, (node) => {
        if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword) assert(allowedThis.includes(node.name.getText()), 'Unapproved this dependency');
        if (ts.isElementAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword) throw new Error('Computed this dependency is not approved');
    });
    excerpts.push({ file: platformFile, className: 'PlatformService', method: name, line: platformAst.getLineAndCharacterOfPosition(method.getStart()).line + 1, sha256: sha(method.getText()) });
    return method.getText();
});
const { PlatformService } = evaluate(`class PlatformService { constructor(repository) { this.platformRepository=repository; } ${members.join('\n')} } module.exports={PlatformService};`, platformFile, {}, { compare: bcrypt.compare });
const repositoryImports = { '@mikro-orm/core': core, '@mikro-orm/nestjs': mikroNest, '@nestjs/common': nest };
for (const [file, exports] of loaded) {
    const relative = `./${path.posix.basename(file, '.ts')}`;
    if (file.startsWith(platformDirectory)) repositoryImports[relative] = exports;
}
const { PlatformRepository } = evaluate(sources.get(platformRepositoryFile), platformRepositoryFile, repositoryImports);
const sessionEntities = loaded.get(`${authDirectory}/auth-session.entity.ts`);
const sessionRepository = evaluate(sources.get(repositoryFile), repositoryFile, {
    '@mikro-orm/core': core,
    '@mikro-orm/nestjs': mikroNest,
    '@nestjs/common': nest,
    './auth-session.entity': sessionEntities
});
const environment = { AUTH_SESSION_IDLE_TIMEOUT_SECONDS: 900, AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: 28800, AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: 60 };
const sessionService = evaluate(sources.get(sessionFile), sessionFile, {
    'node:crypto': nodeCrypto,
    '@nestjs/common': nest,
    '../../../config/load-env': { loadValidatedEnv: () => ({ ...environment }) },
    '../../features/platform/platform.service': { PlatformService },
    './auth-session.entity': sessionEntities,
    './auth-session.repository': sessionRepository
});

export const entities = Object.fromEntries([...loaded.values()].flatMap((exports) => Object.entries(exports)).filter(([name, value]) => typeof value === 'function' && !name.endsWith('Schema')));
// Reuse the very same original classes/error identities in the narrow real
// HTTP+PG module; no parallel TypeScript business implementation is introduced.
export const originalModules = new Map([...loaded, [sessionFile, sessionService], [repositoryFile, sessionRepository], [platformFile, { PlatformService }], [platformRepositoryFile, { PlatformRepository }]]);
export function createServices(entityManager) {
    const repository = new PlatformRepository(...['PlatformUser', 'PlatformRole', 'OrgUnit', 'UserRoleAssignment', 'UserOrgMembership', 'RolePermissionAssignment', 'LocalCredential'].map((name) => entityManager.getRepository(entities[name])));
    const platform = new PlatformService(repository);
    const session = new sessionService.AuthSessionService(new sessionRepository.AuthSessionRepository(entityManager.getRepository(entities.AuthSession)), platform);
    return { session, platform };
}
export function provenance() {
    return {
        formatVersion: 1,
        sourceHead,
        normalization: 'UTF-8 CRLF -> LF only',
        sourceManifest,
        sourceManifestSha256: sha(JSON.stringify(sourceManifest)),
        excerpts,
        versions: {
            nodeRequirement: '24 >=24.9',
            typescript: require('typescript/package.json').version,
            mikroOrm: JSON.parse(readFileSync(require.resolve('@mikro-orm/core/package.json'), 'utf8')).version,
            bcryptjs: JSON.parse(readFileSync(path.join(path.dirname(require.resolve('bcryptjs')), '../package.json'), 'utf8')).version
        },
        evidence:
            'Full original 10 entity modules, AuthSessionService, AuthSessionRepository, PlatformRepository; six exact original PlatformService methods with DI-only constructor glue. Real MikroORM EntityManager/repositories/driver; environment-loader boundary is a fixed synthetic map; no algorithm stub. Runtime entropy is real. Private helpers/unknown this/import/lexical dependencies fail closed.',
        limits: 'Only explicitly requested controlled PG15 actions are executed. No migration/seed/reset. Source preflight alone is not DB/HTTP acceptance.'
    };
}

export const sourceGuardTests = () => {
    assert.throws(() => evaluate('module.exports=()=>unprovidedSessionName;', 'negative.ts'), /Unknown lexical dependency/);
    assert.throws(() => evaluate('module.exports=require("node:fs");', 'negative.ts'), /Unapproved source import/);
};
