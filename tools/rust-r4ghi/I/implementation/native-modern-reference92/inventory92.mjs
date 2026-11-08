// FS only. Private inputs are represented by variable/key names and file pins.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror = '/home/wangzishi/projects/poms-rust-r4ghi';
const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private', stateRoot = path.dirname(privateRoot), out = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(`${mirror}/package.json`), ts = require('typescript'), dotenv = require('dotenv');
const sha = value => createHash('sha256').update(value).digest('hex'), read = file => JSON.parse(fs.readFileSync(file));
function pin(file) { const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink()); return { file, bytes: stat.size, rawBytesSha256: sha(fs.readFileSync(file)) }; }
const mapFile = `${root}/docs/design/rust-r4ghi/operation-map01.json`, specFile = `${root}/libs/shared/api-spec/openapi.json`;
const definitions = read(mapFile).operations.filter(row => row.method !== 'GET'); assert.equal(definitions.length, 16);
const spec = read(specFile), c = Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).map(([method, operation]) => ({ template, method, ...operation })))
    .find(row => row.operationId === 'ContractFinanceController_confirmReceipt'); assert(c);
definitions.push({ operationId: c.operationId, group: 'supportC', method: c.method.toUpperCase(), runtimePath: c.template, successStatus: 200 });
const controllerFiles = ['project-cost/project-cost.controller.ts', 'project/project.controller.ts', 'commission/commission.controller.ts', 'commission/commission-role-assignment.controller.ts', 'contract-finance/contract-finance.controller.ts'];
const decorators = node => ts.getDecorators(node) ?? [];
const call = (node, name) => decorators(node).map(d => d.expression).find(x => ts.isCallExpression(x) && x.expression.getText() === name);
const str = x => x && ts.isStringLiteralLike(x) ? x.text : null;
function canonical(value) { return value.replaceAll('\\:', '@').replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}').replaceAll('@', ':'); }
const methods = [];
for (const name of controllerFiles) {
    const file = `${root}/apps/poms-api/src/app/features/${name}`, source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const node of source.statements.filter(ts.isClassDeclaration)) {
        const controller = call(node, 'Controller'); if (!controller) continue;
        for (const method of node.members.filter(ts.isMethodDeclaration)) {
            const route = ['Post', 'Put', 'Patch', 'Delete', 'Get'].map(kind => ({ kind, expression: call(method, kind) })).find(x => x.expression);
            if (!route) continue;
            const className = node.name.text, methodName = method.name.getText(), guard = call(method, 'UseGuards');
            const fullPath = '/api/' + [str(controller.arguments[0]), str(route.expression.arguments[0])].filter(Boolean).join('/');
            methods.push({ operationId: `${className}_${methodName}`, file: path.relative(root, file), line: source.getLineAndCharacterOfPosition(method.getStart()).line + 1,
                method: route.kind.toUpperCase(), runtimePath: canonical(fullPath), methodGuard: guard?.arguments.some(x => x.getText() === 'RustR4GhiNativeProtocolGuard') === true,
                permissions: (call(method, 'HasPermissions')?.arguments ?? []).map(str),
                unconditionalNewLifecycleGuard: ['startExecution', 'startAcceptance', 'closeCompletionCondition'].includes(methodName) });
        }
    }
}
const cases = definitions.map(row => {
    const matches = methods.filter(m => m.operationId === row.operationId); assert.equal(matches.length, 1, row.operationId); const method = matches[0];
    assert.equal(method.method, row.method); assert.equal(method.runtimePath, row.runtimePath); assert(method.methodGuard, row.operationId);
    return { ...method, group: row.group, expectedStatus: 422, expectedCode: 'rust_r4ghi_protocol_unsupported_by_native_reference',
        expectedMessageReason: method.unconditionalNewLifecycleGuard ? 'this new lifecycle command' : 'an explicitly tagged server-derived command',
        modernTagEnvelopeOnly: { inputVersion: 'server-derived-v1' }, validModernBusinessDTOClaimed: false,
        realBusinessResourceRequiredBeforeGuard: false, legacySuccessReferenceOnly: row.legacyNativeSuccessStatus ?? row.legacySpec?.declaredSuccessStatuses ?? row.successStatus,
        legacyPositiveHTTPExecuted: false };
});
const envFile = `${privateRoot}/native.env`, envBytes = fs.readFileSync(envFile), values = dotenv.parse(envBytes);
const targetPredicates = Object.fromEntries(Object.entries({ PORT: '31442', DB_HOST: '127.0.0.1', DB_PORT: '25434', DB_DATABASE: 'poms_r4ghi_native', DB_USER: 'poms_r4ghi_native_app', DB_SCHEMA: 'poms' }).map(([key, value]) => [key, values[key] === value]));
if (values.DATABASE_URL) { try { const u = new URL(values.DATABASE_URL); targetPredicates.DATABASE_URL = u.hostname === '127.0.0.1' && u.port === '25434' && decodeURIComponent(u.pathname.slice(1)) === 'poms_r4ghi_native' && decodeURIComponent(u.username) === 'poms_r4ghi_native_app'; } catch { targetPredicates.DATABASE_URL = false; } }
const privateFiles = ['native.env', 'native-app-password', 'seed-native-intent.json', 'seed-native-completed.json', 'owner-password'];
const resources = privateFiles.filter(name => fs.existsSync(`${privateRoot}/${name}`)).map(name => {
    const file = `${privateRoot}/${name}`, result = { ...pin(file), classification: name.endsWith('.env') ? 'private-env-no-values-exported' : name.endsWith('.json') ? 'private-evidence-metadata-only' : 'private-credential-file-no-value-exported' };
    if (name.endsWith('.env')) result.variableNames = Object.keys(dotenv.parse(fs.readFileSync(file))).sort();
    if (name.endsWith('.json')) result.topLevelKeyNames = Object.keys(read(file)).sort();
    return result;
});
resources.push({ ...pin(`${stateRoot}/identity.json`), classification: 'original-owned-namespace-identity-pin' },
    { ...pin(`${root}/tmp/rust-r4ghi/root/environment01/provision01.json`), classification: 'original-owned-dual-database-OID-provision-pin' });
const dist = ['main.js', 'main.js.map', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map(name => pin(`${root}/dist/apps/poms-api/${name}`));
const freshBindingPin = pin(`${root}/tmp/rust-r4ghi/root/native-build-binding103/receipt.json`);
assert.equal(freshBindingPin.rawBytesSha256, 'ea852699545f4d46d9c18f744a5a8f4d01cb4b8b36937414db2baefe70923676');
const freshBinding = read(freshBindingPin.file), local = file => /^[A-Za-z]:[\\/]/.test(file) ? `/mnt/${file[0].toLowerCase()}/${file.slice(3).replaceAll('\\', '/')}` : file;
const actualBuildBytes = fs.readFileSync(local(freshBinding.buildReceipt.file)); assert.equal(sha(actualBuildBytes), freshBinding.buildReceipt.rawBytesSha256);
const actualBuild = JSON.parse(actualBuildBytes); assert.equal(actualBuild.exitCode, 0); assert.equal(actualBuild.sourceStable, true); assert.equal(actualBuild.databaseConnect, false);
assert.equal(actualBuild.inputs.length, freshBinding.actualCompleteSourceInputs); assert.equal(actualBuild.inputManifestSHA256, freshBinding.sourceInputManifestSHA256);
for (const item of actualBuild.inputs) assert.equal(pin(`${root}/${item.file}`).rawBytesSha256, item.rawBytesSha256);
for (const item of freshBinding.output.files) assert.equal(pin(`${root}/dist/apps/poms-api/${item.file}`).rawBytesSha256, item.rawBytesSha256);
const bundle = fs.readFileSync(`${root}/dist/apps/poms-api/main.js`, 'utf8'), sourceMap = read(`${root}/dist/apps/poms-api/main.js.map`);
const nativeRequire = createRequire(`${root}/dist/apps/poms-api/package.json`);
const runtimeModules = Object.keys(read(`${root}/dist/apps/poms-api/package.json`).dependencies).sort().map(name => ({ name, ...pin(nativeRequire.resolve(name)) }));
const router = path.join(path.dirname(nativeRequire.resolve('@nestjs/core')), 'router/router-execution-context.js');
const mapGuard = sourceMap.sources.findIndex(x => x.endsWith('/rust-r4ghi-native-protocol.guard.ts'));
const sourceFiles = ['apps/poms-api/src/main.ts', 'apps/poms-api/src/app/app.module.ts', 'apps/poms-api/src/config/load-env.ts', 'apps/poms-api/src/config/environment.schema.ts',
    'apps/poms-api/src/app/core/persistence/persistence.config.ts', 'apps/poms-api/src/app/core/auth/auth.module.ts',
    'apps/poms-api/src/app/core/auth/auth.controller.ts', 'apps/poms-api/src/app/core/auth/auth-session.service.ts',
    'apps/poms-api/src/app/core/auth/auth-session.repository.ts', 'apps/poms-api/src/app/features/platform/platform.service.ts',
    'apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts', 'apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts', 'apps/poms-api/src/app/core/auth/guards/permissions.guard.ts',
    'apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts', 'apps/poms-api/src/app/core/rust-r4ghi-frozen-native-reference.ts',
    ...controllerFiles.map(name => `apps/poms-api/src/app/features/${name}`), 'tools/rust-r4ghi/business/context.mjs', 'tools/rust-r4ghi/business/snapshot.mjs', 'tools/rust-r4ghi/business/objects.mjs'];
const sourcePins = sourceFiles.map(file => ({ file, rawBytesSha256: pin(`${root}/${file}`).rawBytesSha256 }));
const result = { kind: 'FS-only-Native17-modern-reference-source-and-owned-resource-inventory92', inputs: [pin(mapFile), pin(specFile)], sourcePins, controllerCases: cases,
    exactCaseCount: cases.length, permissionUnion: [...new Set(cases.flatMap(row => row.permissions))].sort(), runtimeModules,
    localNestLifecycleSource: { ...pin(router), inspection: 'fnCanActivate completes before interceptor handler closure invokes fnApplyPipes/callback; inspected installed primary runtime source' },
    guardOrder: ['global session authentication', 'global CSRF', 'global exact permissions', 'method Native protocol guard', 'pipes/legacy DTO', 'handler/producer'],
    nativeProjectOrFinancialSourceRequired: false, realNativeSessionAndExactPermissionsRequired: true,
    privateResources: resources, privateEnvironment: { file: pin(envFile), variableNames: Object.keys(values).sort(), requiredOwnedTargetPredicates: targetPredicates,
        secretValuesExported: false, sourceFileMayBeUsedAsIs: Object.values(targetPredicates).every(Boolean),
        correction: 'Root may create a fresh private copy changing only PORT to the reviewed dedicated31442; explicit POMS_ENV_FILE overrides process.env, so process PORT alone is insufficient' },
    dist: { files: dist, includesGuardName: bundle.includes('RustR4GhiNativeProtocolGuard'), includesUnsupportedCode: bundle.includes('rust_r4ghi_protocol_unsupported_by_native_reference'),
        sourceMapGuardEntryExists: mapGuard >= 0, sourceMapContentIsEmittedJS: mapGuard >= 0 && sourceMap.sourcesContent[mapGuard].startsWith('"use strict"'),
        rawTSMatchesCannotBeInferredFromEmittedJSMap: true, currentSourceBoundBuildReusabilityCertified: true, actualFreshBuildBinding: freshBindingPin,
        actualCompleteSourceInputs: actualBuild.inputs.length, allCurrentBuildInputsAnd5OutputLeavesRechecked: true,
        requiredBeforeStart: 'Recheck this actual source/output binding at use, plus fresh task-only preload/runtime/process/env pins. This certifies build reuse, not Native startup/HTTP.' },
    borrowedBootstrapUser: { sourceInspection: 'verifyCredentials reads only; createSession persists only new AuthSession. No borrowed-user mutation is assumed or authorized.',
        requiredActualCheck: 'Every original row including platform_user raw SHA+xmin must remain unchanged through startup/login/17cases; any drift is blocking, not a generic mutable table or invented xmin restore.' },
    startup: { automaticSeederCallFoundInReviewedBootstrap: false, migrationsOrSeedCLIAuthorized: false,
        noSideEffectsCertified: false, requiredActualCheck: 'Root takes full dual139-table/catalog/sequence/object snapshots before and after Native startup. Any unexplained seed/init effect blocks auth/test.' },
    boundaries: { FSOnly: true, SQL: false, HTTP: false, processStarted: false, RootWritten: false, privateValuesPrintedOrCopiedToRepo: false, G3Certified: false, G4Certified: false } };
fs.writeFileSync(`${out}/inventory92.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, nativeResourcesRequired: false, guardOrderVerified: true, privateVariableNamesOnly: true,
    envMismatchedKeys: Object.entries(targetPredicates).filter(([, ok]) => !ok).map(([key]) => key), existingDistSourceBindingCertified: true, sourceBuildInputs: actualBuild.inputs.length, directRuntimeModuleResolutions: runtimeModules.length, SQL: false, HTTP: false, RootWritten: false }));
