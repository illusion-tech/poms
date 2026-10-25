/** R0F offline data oracle: original TS modules/methods, synthetic inputs, no DB. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const nest = require('@nestjs/common');
// Control host-local parsing of the synthetic short-string case only within
// this process; the original business-date module still selects Hong Kong.
process.env.TZ = 'UTC';
if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'UTC' || new Date(2026, 1, 9).toISOString() !== '2026-02-09T00:00:00.000Z') throw new Error('Oracle process timezone must be UTC');
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const sourceHead = '033aedd028fc25ea990450a7854fc92c567cfb8a';
const deliveryReference = '08daaf45b12307bc4d53e01e509f23d265532de6';
const normalizeText = (text) => text.replace(/\r\n/g, '\n');
const readText = (file) => normalizeText(fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const localPath = (name) => path.join(directory, name);
const visit = (node, action) => {
    action(node);
    ts.forEachChild(node, (child) => visit(child, action));
};
const dateFile = 'apps/poms-api/src/app/core/date/business-date.utils.ts';
const sharedFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const commissionFile = 'apps/poms-api/src/app/features/commission/commission.service.ts';
const costFile = 'apps/poms-api/src/app/features/project-cost/project-cost.service.ts';
const financeFile = 'apps/poms-api/src/app/features/contract-finance/contract-finance.service.ts';
const contractFile = 'apps/poms-api/src/app/features/contract/contract.service.ts';
const repositoryFile = 'apps/poms-api/src/app/core/auth/auth-session.repository.ts';
const authEntityFile = 'apps/poms-api/src/app/core/auth/auth-session.entity.ts';
const authServiceFile = 'apps/poms-api/src/app/core/auth/auth-session.service.ts';
const retentionFile = 'apps/poms-api/src/app/features/commission/commission-settlement-write-chain.ts';
const retentionTestFile = 'apps/poms-api/src/app/features/commission/commission-settlement-write-chain.spec.ts';
const repositoryTestFile = 'apps/poms-api/src/app/core/auth/auth-session.repository.spec.ts';
const tableNames = ['auth_session', 'platform_user', 'local_credential', 'role', 'user_role_assignment', 'role_permission_assignment', 'org_unit', 'user_org_membership', 'audit_log', 'security_event'];
const inventoryFile = 'docs/design/rust-r0-database-inventory.json';
const reviewedInventorySha256 = '4796b8a0eca31f6d59e7d36d3de5a2653ab2ab4dc5d818346c0ebe3de965cbc3';
const inventoryText = readText(inventoryFile);
if (sha(inventoryText) !== reviewedInventorySha256) throw new Error(`Reviewed R0 inventory input drift: ${inventoryFile}; review and re-freeze its normalized SHA before --check or --write`);
const artifactInputs = [{ file: inventoryFile, sha256: reviewedInventorySha256, normalizedUtf8Bytes: Buffer.byteLength(inventoryText, 'utf8'), referenceCommit: deliveryReference }];
const inventory = JSON.parse(inventoryText);
const tables = tableNames.map((table) => {
    const matches = inventory.entities.filter((e) => e.table === table);
    if (matches.length !== 1) throw new Error(`Expected exactly one mapped table: ${table}`);
    return matches[0];
});
const sourceFiles = [
    ...new Set([
        dateFile,
        sharedFile,
        commissionFile,
        costFile,
        financeFile,
        contractFile,
        repositoryFile,
        authEntityFile,
        authServiceFile,
        retentionFile,
        retentionTestFile,
        repositoryTestFile,
        'apps/poms-api/src/app/core/auth/auth-session.service.spec.ts',
        'apps/poms-api/src/app/features/platform/platform.service.ts',
        'apps/poms-api/src/app/features/platform/platform.repository.ts',
        'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts',
        'apps/poms-api/src/app/core/runtime-audit/runtime-audit.repository.ts',
        'apps/poms-api/src/app/core/auth/auth.controller.ts',
        'apps/poms-api/src/app/core/auth/guards/session-auth.guard.ts',
        'apps/poms-api/src/app/core/auth/guards/auth-csrf.guard.ts',
        ...tables.map((e) => e.file),
        'package.json',
        'pnpm-lock.yaml',
        '.gitattributes'
    ])
].sort();
const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles], { cwd: root, encoding: 'utf8' }).trim();
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...sourceFiles], { cwd: root, encoding: 'utf8' }).trim();
if (changed || untracked) throw new Error(`Oracle input drift from ${sourceHead}; review and re-freeze before generation:\n${[changed, untracked].filter(Boolean).join('\n')}`);
if (inventory.baseline.head !== sourceHead || inventory.formatVersion !== 2) throw new Error('Expected the reviewed normalized R0 database inventory');
const source = new Map(sourceFiles.map((file) => [file, readText(file)]));
const ast = new Map([...source].filter(([file]) => file.endsWith('.ts')).map(([file, text]) => [file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)]));
const excerpts = [];
const position = (file, node) => ({ file, line: ast.get(file).getLineAndCharacterOfPosition(node.getStart()).line + 1, endLine: ast.get(file).getLineAndCharacterOfPosition(node.end).line + 1 });
const globals = { Date, Intl, Number, String, Boolean, Math, Array, Object, Set, Map, JSON, Error, RangeError, TypeError, RegExp, Promise, Symbol, NaN, Infinity, undefined };

// TypeScript resolves lexical identifiers after types are erased. Unlike transpile-only,
// this rejects an unprovided free variable even when a fixture would not execute it.
function rejectUnknownLexicalNames(javascript, supplied) {
    const input = '/r0f/oracle.js';
    const declarations = '/r0f/globals.d.ts';
    const files = new Map([
        [input, javascript],
        [declarations, [...new Set([...Object.keys(globals), ...supplied, 'module', 'exports', 'require'])].map((name) => `declare const ${name}: any;`).join('\n')]
    ]);
    const host = {
        getSourceFile: (file, languageVersion) => (files.has(file) ? ts.createSourceFile(file, files.get(file), languageVersion, true) : undefined),
        getDefaultLibFileName: () => '/r0f/no-default-lib.d.ts',
        writeFile: () => {
            throw new Error('Oracle typecheck must not emit files');
        },
        getCurrentDirectory: () => '/r0f',
        getDirectories: () => [],
        fileExists: (file) => files.has(file),
        readFile: (file) => files.get(file),
        getCanonicalFileName: (file) => file,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n'
    };
    const program = ts.createProgram([input, declarations], { allowJs: true, checkJs: true, noEmit: true, noLib: true, noResolve: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: [] }, host);
    const unknown = program.getSemanticDiagnostics().filter((d) => [2304, 2552, 2663].includes(d.code));
    if (unknown.length) throw new Error(`Unprovided oracle lexical dependency: ${unknown.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')}`);
}

function evaluateTypescript(text, file, dependencies = {}, imports = {}) {
    const result = ts.transpileModule(text, { fileName: file, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    if (result.diagnostics?.some((d) => d.category === ts.DiagnosticCategory.Error)) throw new Error(`Oracle TS syntax failed: ${file}`);
    rejectUnknownLexicalNames(result.outputText, Object.keys(dependencies));
    const module = { exports: {} };
    const context = vm.createContext({
        ...globals,
        ...dependencies,
        module,
        exports: module.exports,
        require: (specifier) => {
            if (!Object.hasOwn(imports, specifier)) throw new Error(`Unprovided oracle import ${specifier} in ${file}`);
            return imports[specifier];
        }
    });
    new vm.Script(result.outputText, { filename: file }).runInContext(context, { timeout: 10000 });
    return module.exports;
}

function completeModule(file, imports = {}) {
    excerpts.push({ evidence: 'complete-existing-module', file, sha256: sha(source.get(file)) });
    return evaluateTypescript(source.get(file), file, {}, imports);
}

function constant(file, identifier) {
    let declaration;
    visit(ast.get(file), (node) => {
        if (ts.isVariableDeclaration(node) && node.name.getText() === identifier) {
            if (declaration) throw new Error(`Duplicate source constant ${identifier}`);
            declaration = node;
        }
    });
    if (!declaration?.initializer) throw new Error(`Missing source constant ${file}#${identifier}`);
    const text = `const ${declaration.getText()}; module.exports = ${identifier};`;
    excerpts.push({ evidence: 'existing-constant-ast', identifier, ...position(file, declaration), sha256: sha(declaration.getText()) });
    return evaluateTypescript(text, file);
}

function classOracle(file, className, methods, dependencies = {}, fields = []) {
    const cls = ast.get(file).statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === className);
    if (!cls) throw new Error(`Missing class ${className}`);
    const selected = methods.map((method) => {
        const matches = cls.members.filter((member) => ts.isMethodDeclaration(member) && member.name.getText() === method);
        if (matches.length !== 1) throw new Error(`Expected one original method ${className}.${method}`);
        const node = matches[0];
        visit(node.body, (child) => {
            if (ts.isPropertyAccessExpression(child) && child.expression.kind === ts.SyntaxKind.ThisKeyword) {
                const referenced = child.name.getText();
                if (!methods.includes(referenced) && !fields.includes(referenced)) throw new Error(`Unprovided this dependency ${className}.${referenced}`);
            }
        });
        excerpts.push({ evidence: 'unchanged-existing-method-ast', className, method, ...position(file, node), sha256: sha(node.getText()), declaredExternalFields: fields, suppliedLexicalDependencies: Object.keys(dependencies).sort() });
        return node.getText();
    });
    const adapter = `constructor(...fields) { ${fields.map((field, index) => `this.${field} = fields[${index}];`).join(' ')} }
        invoke(method, args) { switch(method) { ${methods.map((method) => `case ${JSON.stringify(method)}: return this.${method}(...args);`).join('\n')} default: throw new Error('Unknown oracle method'); } }`;
    const result = evaluateTypescript(`class ${className} { ${selected.join('\n')}\n${adapter} }\nmodule.exports = ${className};`, file, dependencies);
    return result;
}

function functionOracle(file, functions) {
    const selected = functions.map((name) => {
        const matches = ast.get(file).statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
        if (matches.length !== 1) throw new Error(`Expected source function ${name}`);
        const node = matches[0];
        excerpts.push({ evidence: 'unchanged-existing-function-ast', function: name, ...position(file, node), sha256: sha(node.getText()) });
        return node.getText();
    });
    return evaluateTypescript(`${selected.join('\n')}\nmodule.exports = {${functions.join(',')}};`, file);
}

function hydrate(value) {
    if (Array.isArray(value)) return value.map(hydrate);
    if (value && typeof value === 'object') {
        if (value.$type === 'Date') return new Date(value.value);
        if (value.$type === 'undefined') return undefined;
        if (value.$type === 'number' && value.value === '-0') return -0;
        if (Object.hasOwn(value, '$type')) throw new Error(`Unsupported fixture tag ${value.$type}`);
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, hydrate(child)]));
    }
    return value;
}
function encode(value) {
    if (value === undefined) return { $type: 'undefined' };
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) return { $type: 'number', value: Object.is(value, -0) ? '-0' : String(value) };
    if (value instanceof Date) return { $type: 'Date', value: Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString() };
    if (Array.isArray(value)) return value.map(encode);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)]));
    return value;
}
async function observe(action) {
    try {
        return { outcome: 'return', value: encode(await action()) };
    } catch (error) {
        return { outcome: 'throw', error: { name: error.name, message: error.message, ...(typeof error.getStatus === 'function' ? { status: error.getStatus() } : {}) } };
    }
}
const assertEqual = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Existing-test expectation differs: ${label}`);
};

const cases = JSON.parse(readText(localPath('cases.json')));
const shared = completeModule(sharedFile, { zod: require('zod') });
const dates = completeModule(dateFile);
const retention = completeModule(retentionFile, { '@poms/shared-contracts': shared, '../../core/date/business-date.utils': dates });
const sessionStatus = constant(authEntityFile, 'AuthSessionStatusValue');
const sessionReasons = constant(authEntityFile, 'AuthSessionRevokedReasonValue');
const authErrorCodes = constant(authServiceFile, 'AuthSessionErrorCodeValue');
const Commission = classOracle(commissionFile, 'CommissionService', ['#formatAmount', '#formatRate', '#toNumber', '#stringifyDecimal', '#parseDecimal'], { UnprocessableEntityException: nest.UnprocessableEntityException });
const Cost = classOracle(costFile, 'ProjectCostService', ['toNumber', 'formatAmount', 'formatRate', 'toNullableDecimal', 'toDate', 'toIsoDate', 'toNullableDate', 'toRequiredDateTime', 'toNullableDateTime'], {
    UnprocessableEntityException: nest.UnprocessableEntityException,
    toBusinessDateOnly: dates.toBusinessDateOnly
});
const Finance = classOracle(financeFile, 'ContractFinanceService', ['#formatAmount', '#toNumber', '#parsePositiveDecimal', '#parseNonNegativeDecimal'], { UnprocessableEntityException: nest.UnprocessableEntityException });
const Contract = classOracle(contractFile, 'ContractService', ['normalizeDateOnly']);
const returningSql = constant(repositoryFile, 'AUTH_SESSION_WRITE_RETURNING_SQL');
const Repository = classOracle(
    repositoryFile,
    'AuthSessionRepository',
    ['findWriteSnapshotById', 'touchLastSeenIfDue', 'rotateCsrfTokenForActiveSession', 'expireActiveSession', 'revokeActiveSession', 'revokeActiveSessionsForUser'],
    { AUTH_SESSION_WRITE_RETURNING_SQL: returningSql, AuthSessionStatusValue: sessionStatus },
    ['authSessionRepository']
);
const timestampFunctions = functionOracle(authServiceFile, ['toDate', 'applySessionWriteSnapshot']);
const commission = new Commission();
const cost = new Cost();
const finance = new Finance();
const contract = new Contract();

const dateResults = [];
for (const input of cases.dateCases) {
    const value = hydrate(input.value);
    dateResults.push({
        id: input.id,
        input,
        businessDateOnly: await observe(() => dates.toBusinessDateOnly(value, input.timeZone)),
        costDate: await observe(() => cost.invoke('toNullableDate', [value])),
        costTimestamp: await observe(() => cost.invoke('toNullableDateTime', [value]))
    });
}
const contractDateResults = [];
for (const input of cases.contractDateCases) contractDateResults.push({ id: input.id, input, result: await observe(() => contract.invoke('normalizeDateOnly', [hydrate(input.value)])) });
const retentionResults = [];
for (const input of cases.retentionTestVectors) {
    if (!source.get(retentionTestFile).includes(`it('${input.testTitle}'`)) throw new Error(`Missing existing test anchor ${input.testTitle}`);
    const result = retention.evaluateRetentionDueDate(hydrate(input.value), hydrate(input.now));
    assertEqual(result, input.expected, input.testTitle);
    retentionResults.push({ id: input.id, sourceTest: retentionTestFile, testTitle: input.testTitle, result });
}
const moneyResults = [];
for (const input of cases.moneyInputs) {
    const value = hydrate(input.value);
    moneyResults.push({
        id: input.id,
        input,
        commissionAmount: await observe(() => commission.invoke('#formatAmount', [commission.invoke('#toNumber', [value])])),
        commissionRate: await observe(() => commission.invoke('#formatRate', [commission.invoke('#toNumber', [value])])),
        commissionPassthrough: await observe(() => commission.invoke('#stringifyDecimal', [value])),
        commissionValidatedNumber: await observe(() => commission.invoke('#parseDecimal', [value, 'fixtureAmount'])),
        costAmount: await observe(() => cost.invoke('formatAmount', [cost.invoke('toNumber', [value])])),
        costRate: await observe(() => cost.invoke('formatRate', [cost.invoke('toNumber', [value])])),
        financeAmount: await observe(() => finance.invoke('#formatAmount', [finance.invoke('#toNumber', [value])])),
        financePositive: await observe(() => finance.invoke('#parsePositiveDecimal', [value, 'fixtureAmount']))
    });
}
const nullableDecimalResults = [];
for (const input of cases.nullableDecimalCases) nullableDecimalResults.push({ id: input.id, input, result: await observe(() => cost.invoke('toNullableDecimal', [hydrate(input.value)])) });
const schemaResults = cases.schemaCases.map((input) => {
    const schema = input.field ? shared[input.schema]?.shape?.[input.field] : shared[input.schema];
    if (typeof schema?.safeParse !== 'function') throw new Error(`Missing real schema ${input.schema}.${input.field ?? ''}`);
    const result = schema.safeParse(hydrate(input.value));
    return { id: input.id, input, result: result.success ? { success: true, data: encode(result.data) } : { success: false, issues: result.error.issues.map(({ code, path: issuePath, message }) => ({ code, path: issuePath, message })) } };
});

// These are synthetic database RETURNING rows, not a simulated SQL engine.
function fixtureRows(kind) {
    if (kind === 'empty') return [];
    if (kind === 'two-ids') return [{ id: '00000000-0000-4000-8000-000000000001' }, { id: '00000000-0000-4000-8000-000000000003' }];
    if (!['snapshot-date', 'snapshot-string'].includes(kind)) throw new Error(`Unknown synthetic row template ${kind}`);
    const timestamp = (value) => (kind === 'snapshot-date' ? new Date(value) : value);
    return [
        {
            status: 'active',
            csrfTokenHash: 'synthetic-csrf-hash',
            idleExpiresAt: timestamp('2026-06-10T07:45:43.000Z'),
            absoluteExpiresAt: timestamp('2026-06-10T15:30:43.000Z'),
            lastSeenAt: timestamp('2026-06-10T07:30:43.000Z'),
            lastIp: '192.0.2.10',
            revokedAt: null,
            revokedReason: null,
            rowVersion: 3,
            updatedAt: timestamp('2026-06-10T07:30:43.000Z')
        }
    ];
}
const repositoryResults = [];
for (const input of cases.repositoryCases) {
    const calls = [];
    const facade = {
        getEntityManager: () => ({
            getConnection: () => ({
                execute: async (sql, parameters) => {
                    calls.push({ sql, sha256: sha(sql), parameters: encode(parameters) });
                    return fixtureRows(input.rows).map((row) => ({ ...row, ...hydrate(input.rowOverrides ?? {}) }));
                }
            })
        })
    };
    const instance = new Repository(facade);
    const result = await observe(() => instance.invoke(input.method, hydrate(input.args)));
    if (calls.length !== 1) throw new Error(`Expected one recorded SQL call: ${input.id}`);
    repositoryResults.push({ id: input.id, input, evidence: 'actual repository method with recording connection double; SQL is not executed', calls, result });
}
const timestampResults = [];
for (const input of cases.timestampCases) {
    const snapshot = { ...fixtureRows(input.rows)[0], ...hydrate(input.overrides ?? {}) };
    const target = { id: '00000000-0000-4000-8000-000000000001' };
    const result = await observe(() => {
        timestampFunctions.applySessionWriteSnapshot(target, snapshot);
        return target;
    });
    timestampResults.push({ id: input.id, input: encode(snapshot), result });
}

// Negative self-checks test the extraction boundary, without editing source files.
let unknownLexicalRejected = false;
try {
    evaluateTypescript('module.exports = () => unprovidedLexicalName;', 'negative-lexical.ts');
} catch (error) {
    unknownLexicalRejected = error.message.includes('Unprovided oracle lexical dependency');
}
if (!unknownLexicalRejected) throw new Error('Oracle accepted an unknown lexical dependency');
let unknownMethodRejected = false;
try {
    classOracle(commissionFile, 'CommissionService', ['#requirePaidPayoutAmount']);
} catch (error) {
    unknownMethodRejected = error.message.includes('Unprovided this dependency');
}
if (!unknownMethodRejected) throw new Error('Oracle accepted an unknown this-method dependency');

// Reuse the reviewed R0 mapping, and independently match every field expression
// against its original entity AST before producing the narrower R1 projection.
for (const table of tables) {
    const expectedFileHash = inventory.fileHashes.find((entry) => entry.file === table.file)?.sha256;
    if (expectedFileHash !== sha(source.get(table.file))) throw new Error(`R0 entity source hash differs: ${table.file}`);
    let properties;
    visit(ast.get(table.file), (node) => {
        if (!ts.isCallExpression(node) || node.expression.getText() !== 'defineEntity') return;
        const object = node.arguments[0];
        if (!object || !ts.isObjectLiteralExpression(object)) return;
        const value = (key) => object.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === key)?.initializer;
        const name = value('tableName');
        if (name && ts.isStringLiteral(name) && name.text === table.table) properties = value('properties');
    });
    if (!properties || !ts.isObjectLiteralExpression(properties)) throw new Error(`Missing original properties: ${table.table}`);
    const fields = properties.properties.filter(ts.isPropertyAssignment);
    if (fields.length !== table.fields.length) throw new Error(`Field count differs: ${table.table}`);
    fields.forEach((field, index) => {
        const frozen = table.fields[index];
        if (field.name.getText() !== frozen.property || field.initializer.getText() !== frozen.expression) throw new Error(`R0 field expression differs from source: ${table.table}.${frozen.column}`);
    });
}
if (tables.length !== 10 || tables.reduce((sum, table) => sum + table.fields.length, 0) !== 121) throw new Error('R1 table/field coverage differs from 10/121');

const fileHashes = sourceFiles.map((file) => ({ file, sha256: sha(source.get(file)), normalizedUtf8Bytes: Buffer.byteLength(source.get(file), 'utf8') }));
const provenance = {
    sourceHead,
    deliveryReference,
    textNormalization: {
        encoding: 'utf8',
        lineEndings: 'CRLF-to-LF',
        rule: "text.replace(/\\r\\n/g, '\\n')",
        preserves: 'BOM, bare CR, Unicode, other whitespace and escape sequences',
        hashes: 'sha256 of normalized UTF-8 text; not raw working-tree bytes'
    },
    typescriptVersion: ts.version,
    oracleProcessTimezone: 'UTC',
    installedDependencies: {
        zod: require('zod/package.json').version,
        nestCommon: JSON.parse(readText(path.join(path.dirname(require.resolve('@nestjs/common')), 'package.json'))).version
    },
    extractorSha256: sha(readText(fileURLToPath(import.meta.url))),
    casesSha256: sha(readText(localPath('cases.json'))),
    sourceManifestSha256: sha(JSON.stringify({ sourceFiles: fileHashes, artifactInputs })),
    fileHashes,
    artifactInputs,
    excerpts,
    runtimeRequirements: 'Node >=24.9; installed locked TypeScript/Zod/Nest libraries; runtime patch version is reported separately, not hashed into golden content',
    databaseConnected: false,
    productConstructorsExecuted: false,
    limitations: [
        'A source-method oracle certifies only the selected helper behavior; it is not a whole-service or HTTP oracle.',
        'Recording doubles do not execute SQL, row locks, triggers, default values, transactions or driver decoding.',
        'Internal-helper acceptance does not bypass actual Zod/controller input validation.',
        'No old/new backend differential run, product schema, migration, seed, external service, performance or database concurrency is certified.'
    ]
};
const golden = {
    formatVersion: 2,
    provenance,
    counts: {
        dateCases: dateResults.length,
        contractDateCases: contractDateResults.length,
        existingRetentionTestVectors: retentionResults.length,
        moneyInputs: moneyResults.length,
        nullableDecimalCases: nullableDecimalResults.length,
        schemaCases: schemaResults.length,
        recordedRepositoryCalls: repositoryResults.length,
        timestampSnapshotCases: timestampResults.length,
        sourceFiles: fileHashes.length,
        tables: tables.length,
        fields: 121
    },
    dateResults,
    contractDateResults,
    retentionResults,
    moneyResults,
    nullableDecimalResults,
    schemaResults,
    repositoryResults,
    timestampResults,
    enumSources: {
        shared: { file: sharedFile, PERMISSION_KEYS: [...shared.PERMISSION_KEYS], USER_ORG_UNIT_MEMBERSHIP_TYPES: [...shared.USER_ORG_UNIT_MEMBERSHIP_TYPES] },
        backendLocal: [
            { file: authEntityFile, name: 'AuthSessionStatusValue', value: sessionStatus },
            { file: authEntityFile, name: 'AuthSessionRevokedReasonValue', value: sessionReasons },
            { file: authServiceFile, name: 'AuthSessionErrorCodeValue', value: authErrorCodes }
        ]
    },
    extractionGuards: { unknownLexicalRejected, unknownMethodRejected }
};
const persistence = {
    formatVersion: 2,
    sourceHead,
    sourceManifestSha256: provenance.sourceManifestSha256,
    upstreamInventory: artifactInputs[0],
    counts: { tables: 10, fields: 121 },
    tables: tables.map((table) => ({
        ...table,
        r1Access:
            table.table === 'auth_session'
                ? 'session read/insert/guarded atomic update'
                : ['audit_log', 'security_event'].includes(table.table)
                  ? 'minimum audit/security append; no platform audit administration API'
                  : 'read only for auth/current-profile/permission resolution; platform write APIs remain R2'
    })),
    sessionConnectionContract: {
        server: 'isolated PostgreSQL 15.12 only for TEST compatibility integration; existing PG17/TEST not touched by this oracle',
        schema: 'poms',
        driverStartupTimezone: 'SQLx 0.9.0 sends UTC',
        initializeEveryNewConnection: "SET TIME ZONE 'Etc/GMT-8'",
        verifyOnEveryNewConnection: "SELECT current_setting('TimeZone')",
        hook: 'PgPoolOptions::after_connect on each new connection, not one SET issued through a pool',
        r1IntegrationCases: [
            'two simultaneously acquired distinct backend PIDs each report Etc/GMT-8',
            'drop/reconnect creates another initialized connection',
            'callback initialization failure rejects connection',
            'cancel/timeout/rollback leaves no transaction or stale role/timezone for the next borrower'
        ],
        executionStatus: 'R1 integration input only; connection pool is not implemented or exercised by this R0F oracle'
    },
    transactionBoundaries: [
        {
            command: 'password login',
            source: 'core/auth/auth.controller.ts#createPasswordAuthSession/#createSessionResponse; features/platform/platform.service.ts#verifyCredentials',
            reads: ['platform_user', 'local_credential', 'user_role_assignment', 'role', 'role_permission_assignment'],
            writes: ['auth_session'],
            boundary: 'credential/permission reads then session save/flush, Cookie assignment then profile reads; no explicit enclosing transaction in current source',
            failureInput: 'session may already be persisted if subsequent profile/response construction fails; do not silently promise all-or-nothing login'
        },
        {
            command: 'resolve session / protected request',
            source: 'core/auth/auth-session.service.ts#resolveSessionToken',
            reads: ['auth_session', 'platform_user', 'user_role_assignment', 'role', 'role_permission_assignment'],
            writes: ['auth_session', 'security_event on guarded rejection'],
            boundary: 'conditional raw touch/expire/revoke is one UPDATE RETURNING; security-event save is a subsequent service call, no shared outer transaction',
            failureInput: 'zero RETURNING rows from concurrent touch is allowed; expired/revoked/disabled results retain existing precedence'
        },
        {
            command: 'rotate CSRF',
            source: 'core/auth/auth-session.service.ts#refreshCsrfToken',
            reads: ['auth_session', 'platform_user', 'user_role_assignment', 'role', 'role_permission_assignment'],
            writes: ['auth_session'],
            boundary: 'resolve/touch then conditional rotate UPDATE RETURNING; on empty RETURNING reread the latest write snapshot and classify current state',
            failureInput: 'do not overwrite concurrent revoke/expiry; preserve Date|string normalization'
        },
        {
            command: 'logout / revoke',
            source: 'core/auth/auth-session.repository.ts#revokeActiveSession/#revokeActiveSessionsForUser',
            writes: ['auth_session'],
            boundary: 'each guarded UPDATE is atomic; all-user revoke returns affected row count; no generated ORM flush is added to the raw path'
        },
        {
            command: 'minimum audit/security event',
            source: 'core/runtime-audit/runtime-audit.service.ts#recordAuditLog/#recordSecurityEvent',
            writes: ['audit_log', 'security_event'],
            boundary: 'recordAuditLog with supplied EntityManager only persist/enlist; default audit and all security events save/flush via repository; caller chooses transaction propagation',
            failureInput: 'keep explicit-em and default-save paths distinct; do not manufacture outer atomicity'
        },
        {
            command: 'current profile',
            source: 'features/platform/platform.service.ts#getSanitizedUserProfile',
            reads: ['platform_user', 'org_unit', 'user_org_membership', 'user_role_assignment', 'role'],
            writes: [],
            boundary: 'read aggregation only; last_login_at is not a login write in the examined auth path; dev fallback behavior must be frozen separately by auth/controller oracle'
        }
    ],
    requiredR1DatabaseEvidence: [
        'existing migration initializes a separate isolated PG15 schema under its current owner; R0F does not run it',
        'real optimistic conflict, unique/FK failure and all-or-nothing rollback where a command actually owns a transaction',
        'parallel session touch/CSRF rotate/expire/revoke and permissions/account-status changes',
        'database defaults/RETURNING/hooks/row_version on ORM and raw-SQL paths',
        'old-session new-backend / new-session old-backend and errors/side effects from the auth golden suite'
    ]
};

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--write', '--check'].includes(arg))) throw new Error('Usage: node oracle.mjs [--check|--write]');
for (const [name, result] of [
    ['golden.json', golden],
    ['r1-persistence.json', persistence]
]) {
    const rendered = JSON.stringify(result, null, 2) + '\n';
    if (args[0] === '--write') fs.writeFileSync(localPath(name), rendered, 'utf8');
    else if (!fs.existsSync(localPath(name)) || readText(localPath(name)) !== normalizeText(rendered)) throw new Error(`${name} differs; do not auto-refresh expectations during --check; review source/cases before explicit --write`);
    process.stdout.write(`${name} ${sha(rendered)}\n`);
}
process.stdout.write(`${JSON.stringify({ status: 'ok', mode: args[0] ?? '--check', counts: golden.counts, sourceManifestSha256: provenance.sourceManifestSha256, node: process.version, typescript: ts.version, databaseConnected: false })}\n`);
