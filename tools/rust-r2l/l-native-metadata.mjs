// Execute the original AppModule/entity registration with the original SDK and
// the same connect:false persistence replacement used by the OpenAPI exporter.
// No product schema is reconstructed here, and no PostgreSQL observation is claimed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = '/home/wangzishi/projects/poms-rust-r2l-generator';
const base = '02b8956759352b2612bec5980cbe55ae77d0293f';
const nodeSha = 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12';
const output = process.argv[2];
assert.equal(process.platform, 'linux');
assert(['/workspace', scratch].includes(root));
assert.equal(process.version, 'v24.19.0');
assert.equal(process.argv.length, 3);
assert(/^tmp\/rust-r2l\/metadata-export01\/metadata(?:-attempt[0-9]{2})?\.json$/.test(output));
process.chdir(root);

const sha = (value) => createHash('sha256').update(value).digest('hex');
const fileRow = (file) => {
    const bytes = fs.readFileSync(file);
    return { file, bytes: bytes.length, rawBytesSha256: sha(bytes), normalizedLfSha256: sha(bytes.toString('utf8').replace(/\r\n/g, '\n')) };
};
assert.equal(sha(fs.readFileSync(process.execPath)), nodeSha);
assert.equal(sha(fs.readFileSync('dist/apps/poms-api/main.js')), '0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), base);
assert(!fs.existsSync('.env') && !fs.existsSync('apps/poms-api/.env'));
assert(!fs.existsSync(output));
fs.mkdirSync(path.dirname(output), { recursive: true });

const domainNames = [
    'Contract', 'ContractTermSnapshot', 'CommissionPayout', 'CommissionAdjustment', 'CommissionRoleAssignment',
    'OperatingSignalToCommissionGateBinding', 'CommissionGateReviewRecord', 'CommissionFinalSettlementSnapshot',
    'CommissionRuleExplanationSnapshot', 'ReceiptRecord', 'CommissionDepartureExceptionDecision',
    'CommissionFreezeDisputeRecord', 'Project', 'Lead', 'Customer'
];
const commonNames = [
    'ApprovalRecord', 'TodoItem', 'ConfirmationRecord', 'ConfirmationParticipant',
    'ApprovalSummaryPackageDefinition', 'ApprovalSummarySnapshot', 'ApprovalSummaryFieldProjection'
];
const selectedNames = new Set([...domainNames, ...commonNames]);
const functions = new Map();
const functionRef = (value) => {
    if (typeof value !== 'function') return null;
    const source = Function.prototype.toString.call(value);
    const sourceSha256 = sha(source);
    functions.set(sourceSha256, { name: value.name, source, sourceSha256 });
    return { name: value.name, sourceSha256 };
};
function valueView(value, seen = new WeakSet()) {
    if (value === undefined) return { kind: 'undefined' };
    if (typeof value === 'function') return { kind: 'function', ...functionRef(value) };
    if (typeof value === 'bigint') return { kind: 'bigint', text: String(value) };
    if (value === null || typeof value !== 'object') return { kind: typeof value, value };
    if (value instanceof Date) return { kind: 'Date', value: Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString() };
    if (seen.has(value)) return { kind: 'circular-reference', constructor: value.constructor?.name };
    seen.add(value);
    if (Array.isArray(value)) return { kind: 'array', value: value.map((item) => valueView(item, seen)) };
    return { kind: 'object', constructor: value.constructor?.name, value: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, valueView(item, seen)])) };
}
function typeView(type, property, platform) {
    if (!type) return null;
    const methods = {};
    for (const key of ['getColumnType', 'compareAsType', 'ensureComparable', 'convertToJSValue', 'convertToDatabaseValue', 'convertToJSValueSQL', 'convertToDatabaseValueSQL']) {
        if (typeof type[key] === 'function') methods[key] = functionRef(type[key]);
    }
    const calls = {};
    for (const [key, args] of [['getColumnType', [property, platform]], ['compareAsType', []], ['ensureComparable', []]]) {
        if (typeof type[key] !== 'function') continue;
        try { calls[key] = { result: valueView(type[key](...args)) }; }
        catch (error) { calls[key] = { error: { name: error.name, message: error.message } }; }
    }
    return {
        constructor: type.constructor?.name,
        ownKeys: Object.keys(type),
        ownScalarAttributes: Object.fromEntries(Object.entries(type).filter(([, value]) => value === null || !['object'].includes(typeof value)).map(([key, value]) => [key, valueView(value)])),
        methods, pureMetadataCalls: calls
    };
}
function propertyView(property, platform) {
    const attributes = {};
    for (const [key, value] of Object.entries(property)) {
        if (['targetMeta', 'customType', 'mappedType', 'referencedPKs', 'referencedTableName'].includes(key)) continue;
        if (value === null || typeof value !== 'object' || Array.isArray(value)) attributes[key] = valueView(value);
    }
    return {
        name: property.name, fieldNames: property.fieldNames, columnTypes: property.columnTypes,
        type: valueView(property.type), runtimeType: valueView(property.runtimeType), kind: property.kind,
        primary: property.primary ?? false, nullable: property.nullable ?? false, version: property.version ?? false,
        mapToPk: property.mapToPk ?? false, persist: property.persist ?? true,
        precision: valueView(property.precision), scale: valueView(property.scale), length: valueView(property.length),
        defaultPresent: Object.hasOwn(property, 'default'), default: valueView(property.default),
        defaultRawPresent: Object.hasOwn(property, 'defaultRaw'), defaultRaw: valueView(property.defaultRaw),
        onCreate: functionRef(property.onCreate), onUpdate: functionRef(property.onUpdate),
        customType: typeView(property.customType, property, platform), mappedType: typeView(property.mappedType, property, platform),
        targetClassName: property.targetMeta?.className ?? null,
        observedOwnKeys: Object.keys(property), scalarAndArrayAttributes: attributes
    };
}
const networkAttempts = [];
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    networkAttempts.push({ argumentTypes: args.map((value) => typeof value) });
    throw new Error('Metadata-only export prohibits all socket connections');
};

const startedAt = new Date().toISOString();
const require = createRequire(import.meta.url);
let moduleRef;
let unregisterPaths;
let orm;
const report = { formatVersion: 1, kind: 'original-SDK-connect-false-entity-metadata', result: 'pending', sourceHead: base, startedAt, connection: false, PostgreSQLOrSQLExecuted: false, databaseOrApiStarted: false };
try {
    require('reflect-metadata');
    const ts = require('typescript');
    const configFile = ts.readConfigFile(path.join(root, 'apps/poms-api/tsconfig.app.json'), ts.sys.readFile);
    assert(!configFile.error);
    const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.join(root, 'apps/poms-api'));
    assert.equal(config.errors.length, 0);
    require('ts-node').register({ project: path.join(root, 'apps/poms-api/tsconfig.app.json') });
    unregisterPaths = require('tsconfig-paths').register({ baseUrl: config.options.baseUrl, paths: config.options.paths });
    const { Global, Module } = require('@nestjs/common');
    const { Test } = require('@nestjs/testing');
    const { MikroOrmModule } = require('@mikro-orm/nestjs');
    const { MikroORM } = require('@mikro-orm/core');
    const { PostgreSqlDriver } = require('@mikro-orm/postgresql');
    const { AppModule } = require(path.join(root, 'apps/poms-api/src/app/app.module.ts'));
    const { PersistenceModule } = require(path.join(root, 'apps/poms-api/src/app/core/persistence/persistence.module.ts'));
    class MetadataPersistenceModule {}
    Global()(MetadataPersistenceModule);
    Module({ imports: [MikroOrmModule.forRoot({
        driver: PostgreSqlDriver, dbName: 'metadata-placeholder', connect: false,
        autoLoadEntities: true, registerRequestContext: false, discovery: { warnWhenNoEntities: false }
    })] })(MetadataPersistenceModule);
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideModule(PersistenceModule).useModule(MetadataPersistenceModule).compile();
    orm = moduleRef.get(MikroORM, { strict: false });
    assert.equal(orm.config.get('connect'), false);
    const metadata = [...orm.getMetadata().getAll().values()];
    const platform = orm.em.getDriver().getPlatform();
    report.allEntityIndex = metadata.map((meta) => ({ className: meta.className, constructorName: meta.class?.name, schema: meta.schema, tableName: meta.tableName, properties: Object.keys(meta.properties).length }));
    const selectedNative = metadata.filter((meta) => selectedNames.has(meta.class?.name));
    const allMetadata = metadata.map((meta) => ({
        className: meta.className, constructorName: meta.class?.name, schema: meta.schema, tableName: meta.tableName,
        primaryKeys: meta.primaryKeys, versionProperty: meta.versionProperty,
        properties: Object.values(meta.properties).map((property) => propertyView(property, platform)),
        hooks: valueView(meta.hooks), indexes: valueView(meta.indexes), uniques: valueView(meta.uniques), checks: valueView(meta.checks)
    }));
    const selectedMetadata = allMetadata.filter((meta) => selectedNames.has(meta.constructorName));
    assert.equal(selectedMetadata.length, 22);
    for (const name of selectedNames) assert.equal(selectedMetadata.filter((meta) => meta.constructorName === name).length, 1, name);
    const hydration = [];
    for (const meta of selectedNative) {
        for (const property of Object.values(meta.properties)) {
            const columnType = property.columnTypes?.[0] ?? '';
            const numeric = /^(?:numeric|decimal)/.test(columnType);
            const dateOnly = columnType === 'date';
            const dateTime = /^(?:timestamp|datetime)/.test(columnType);
            if (!numeric && !dateOnly && !dateTime) continue;
            const samples = numeric ? ['123.40', 123.4] : dateOnly ? ['2026-04-14', new Date('2026-04-14T12:34:56.789Z')] : ['2026-04-14T12:34:56.789Z', new Date('2026-04-14T12:34:56.789Z')];
            for (const rawValue of samples) {
                const observation = { className: meta.className, tableName: meta.tableName, property: property.name, fieldName: property.fieldNames?.[0], columnType, rawInput: valueView(rawValue) };
                try {
                    const em = orm.em.fork({ clear: true });
                    const data = { [meta.properties[meta.primaryKeys[0]].fieldNames[0]]: '84000000-0000-4000-8000-000000000001', [property.fieldNames[0]]: rawValue };
                    const entity = em.map(meta.class, data, { refresh: true });
                    observation.sdkHydrated = valueView(entity[property.name]);
                    em.clear();
                } catch (error) { observation.error = { name: error.name, message: error.message }; }
                hydration.push(observation);
            }
        }
    }
    const loadedSources = Object.keys(require.cache).filter((file) => file.startsWith(root + path.sep) && !file.includes('/node_modules/')).sort().map(fileRow);
    const entityFiles = loadedSources.filter((row) => row.file.endsWith('.entity.ts'));
    for (const row of entityFiles) {
        const relative = path.relative(root, row.file).split(path.sep).join('/');
        const original = execFileSync('git', ['show', base + ':' + relative], { maxBuffer: 8 * 1024 * 1024 });
        assert.equal(row.normalizedLfSha256, sha(original.toString('utf8').replace(/\r\n/g, '\n')), relative + ' entity changed');
    }
    Object.assign(report, {
        result: 'pass-metadata-only', nativeBundleReference: fileRow('dist/apps/poms-api/main.js'),
        execution: 'Original TS AppModule through original ts-node/config aliases and actual Nest/MikroORM SDK; original persistence module replaced exactly as OpenAPI connect:false registration',
        node: fileRow(process.execPath), typescript: ts.version, helper: fileRow('tools/rust-r2l/l-native-metadata.mjs'),
        sdkPackages: ['@mikro-orm/core', '@mikro-orm/nestjs', '@mikro-orm/postgresql', '@nestjs/core', '@nestjs/testing', 'typescript', 'ts-node'].map((name) => {
            const directory = fs.realpathSync(path.join(root, 'node_modules', name));
            const file = path.join(directory, 'package.json');
            return { name, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, package: fileRow(file) };
        }),
        compilerConfig: fileRow('apps/poms-api/tsconfig.app.json'), aliasConfig: fileRow('tsconfig.base.json'),
        allEntityCount: allMetadata.length, allPropertyCount: allMetadata.reduce((sum, meta) => sum + meta.properties.length, 0),
        domainEntityCount: domainNames.length, commonEntityCount: commonNames.length,
        domainPropertyCount: selectedMetadata.filter((meta) => domainNames.includes(meta.constructorName)).reduce((sum, meta) => sum + meta.properties.length, 0),
        commonPropertyCount: selectedMetadata.filter((meta) => commonNames.includes(meta.constructorName)).reduce((sum, meta) => sum + meta.properties.length, 0),
        metadata: selectedNative.map((meta) => ({
            className: meta.className, constructorName: meta.class?.name, schema: meta.schema, tableName: meta.tableName,
            properties: Object.values(meta.properties).map((property) => ({
                name: property.name, fieldNames: property.fieldNames, columnTypes: property.columnTypes,
                type: property.type, runtimeType: property.runtimeType, kind: property.kind,
                primary: property.primary ?? false, nullable: property.nullable ?? false,
                version: property.version ?? false, mapToPk: property.mapToPk ?? false,
                precision: property.precision, scale: property.scale, length: property.length,
                default: property.default, defaultRaw: property.defaultRaw,
                onCreate: functionRef(property.onCreate), onUpdate: functionRef(property.onUpdate),
                customTypeClass: property.customType?.constructor?.name ?? null,
                mappedTypeClass: property.mappedType?.constructor?.name ?? null
            }))
        })),
        selectedMetadata, allMetadata, functions: [...functions.values()], loadedSources,
        entitySourcesMatchBase02: entityFiles.length, memoryHydration: {
            method: 'Actual EntityManager.map on a fresh clear fork, explicit labelled raw values, no SQL or connection', observations: hydration,
            limit: 'This observes SDK in-memory hydration only; PostgreSQL wire types, SQL defaults, rounding, constraints and update timing require real Native/PG calibration'
        },
        boundary: 'Metadata/SDK execution is real; it is not a database catalog, a SQL execution, a persisted default/hook observation, or an approval UoW proof'
    });
} catch (error) {
    report.result = 'fail';
    report.error = { name: error.name, message: error.message, stack: error.stack };
} finally {
    try { if (moduleRef) await moduleRef.close(); else if (orm) await orm.close(true); }
    catch (error) { report.result = 'fail'; report.closeError = { name: error.name, message: error.message }; }
    unregisterPaths?.();
    net.Socket.prototype.connect = originalConnect;
    report.networkAttempts = networkAttempts;
    report.noConnectionAttempts = networkAttempts.length === 0;
    if (networkAttempts.length) report.result = 'fail';
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ result: report.result, output, allEntities: report.allEntityCount, selectedEntities: report.selectedMetadata?.length, domainProperties: report.domainPropertyCount, commonProperties: report.commonPropertyCount, noConnectionAttempts: report.noConnectionAttempts, error: report.error }));
if (report.result !== 'pass-metadata-only') process.exitCode = 1;
