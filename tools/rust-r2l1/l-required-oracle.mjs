// Pure locked-SDK required-check/render oracle. Display fixtures are not ORM
// entities or database models; no original service, ORM instance or PG runs.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
const require = createRequire(import.meta.url);
const coreRoot = path.dirname(require.resolve('@mikro-orm/core'));
const { EntityHelper } = require(path.join(coreRoot, 'entity/EntityHelper.js'));
const { ChangeSetPersister } = require(path.join(coreRoot, 'unit-of-work/ChangeSetPersister.js'));
const { ReferenceKind } = require(path.join(coreRoot, 'enums.js'));
const ts = require('typescript');
if (process.env.MIKRO_ORM_LOG_EM_ID) throw new Error('Pure oracle requires the same absent EM-id logging option as the admitted Native probe');
const actual = JSON.parse(fs.readFileSync('tmp/rust-r2l1/native-calibration-alpha03.json', 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sdk = ['unit-of-work/ChangeSetPersister.js', 'entity/validators.js', 'errors.js', 'entity/EntityHelper.js', 'logging/inspect.js'];
const files = sdk.map((file) => {
    const bytes = fs.readFileSync(path.join(coreRoot, file));
    return { file: '@mikro-orm/core/' + file, rawBytesSha256: hash(bytes), lfSha256: hash(bytes.toString('utf8').replaceAll('\r\n', '\n')) };
});
const sqlRequire = createRequire(require.resolve('@mikro-orm/postgresql'));
const driverPath = path.join(path.dirname(sqlRequire.resolve('@mikro-orm/sql')), 'AbstractSqlDriver.js');
const driverBytes = fs.readFileSync(driverPath);
files.push({ file: '@mikro-orm/sql/AbstractSqlDriver.js', rawBytesSha256: hash(driverBytes), lfSha256: hash(driverBytes.toString('utf8').replaceAll('\r\n', '\n')) });
const driverAst = ts.createSourceFile(driverPath, driverBytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const driverClass = driverAst.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'AbstractSqlDriver');
const insertMethod = driverClass?.members.find((node) => ts.isMethodDeclaration(node) && node.name.getText(driverAst) === 'nativeInsertMany');
const addParamsStatement = insertMethod?.body?.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(driverAst) === 'addParams'));
if (!addParamsStatement) throw new Error('Original INSERT parameter helper is missing');
const parameterSource = `module.exports=function(prop,row,ReferenceKind){const params=[];const options={convertCustomTypes:false};${addParamsStatement.getText(driverAst)} addParams(prop,row);return params;};`;
const parameterModule = { exports: {} };
new Function('module', ts.transpileModule(parameterSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(parameterModule);
function fixture(meta, input) {
    class DisplayFixture {}
    Object.defineProperty(DisplayFixture, 'name', { value: meta.className === 'confirmation-record' ? 'ConfirmationRecord' : meta.className });
    const props = meta.properties.map((property) => ({ ...property }));
    const metadata = { className: meta.className, root: {}, props, properties: Object.fromEntries(props.map((property) => [property.name, property])), prototype: DisplayFixture.prototype };
    EntityHelper.defineCustomInspect(metadata);
    const entity = Object.assign(new DisplayFixture(), input);
    Object.defineProperty(entity, '__meta', { value: metadata });
    Object.defineProperty(entity, '__helper', { value: { __meta: metadata, __initialized: true } });
    return entity;
}
const ids = '00000000-0000-4000-8000-000000000081';
const date = new Date('2020-01-01T00:00:00.123Z');
const encode = (value) => value === undefined ? { $undefined: true } : value instanceof Date ? { $date: value.toISOString() } : value;
const cases = [];
for (const meta of actual.metadata) {
    const required = meta.properties.find((property) => !property.nullable && !property.default && !property.defaultRaw);
    if (!required) throw new Error('Each mapped table should have an original required field');
    for (const missing of [null, undefined]) {
        const input = {};
        for (const property of meta.properties) {
            if (property.nullable) continue;
            input[property.name] = property.default ?? (property.columnTypes[0] === 'timestamptz' ? date : property.columnTypes[0] === 'int' ? 0 : property.columnTypes[0] === 'uuid' ? ids : property.name + '-value');
        }
        input[required.name] = missing;
        const entity = fixture(meta, input);
        let message;
        try { ChangeSetPersister.prototype.validateRequired.call({}, entity); }
        catch (error) { message = error.message; }
        if (typeof message !== 'string') throw new Error('Original SDK did not reject the missing field');
        cases.push({ table: meta.tableName, missing: missing === null ? 'null' : 'undefined', input: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, encode(value)])), message });
    }
    const sparse = { createdAt: date };
    const sparseEntity = fixture(meta, sparse);
    let sparseMessage;
    try { ChangeSetPersister.prototype.validateRequired.call({}, sparseEntity); }
    catch (error) { sparseMessage = error.message; }
    cases.push({ table: meta.tableName, missing: 'sparse-undefined', input: { createdAt: encode(date) }, message: sparseMessage });
}
const scalarInputs = ['plain', "a'b", 'a"b', 'a\'"b', 'a\'"`b', '${x}\'"b', '\ud800', '\udc00', '\udaff', '😀', '\x00\x01\x07\b\t\n\v\f\r\x1f\x7f\x85', '\u2028\u2029', '\\'];
const scalars = scalarInputs.map((input) => ({ input, output: inspect(input) }));
const insertParams = [];
for (const [table, property, values] of [
    ['approval_summary_package_definition', 'status', [undefined, null, 'inactive']],
    ['confirmation_record', 'confirmedCount', [undefined, null, 2]],
    ['approval_summary_snapshot', 'supersedesId', [null]]
]) {
    const prop = actual.metadata.find((meta) => meta.tableName === table).properties.find((prop) => prop.name === property);
    for (const input of values) {
        const row = { [property]: input };
        const [parameter] = parameterModule.exports(prop, row, ReferenceKind);
        if (!Object.is(row[property], input)) throw new Error('Original addParams unexpectedly changed the entity payload');
        insertParams.push({ table, property, input: encode(input), expected: encode(parameter), entityStillOriginal: true });
    }
}
const output = { formatVersion: 1, kind: 'pure-sdk-required-and-render-oracle', sdkHelpersEvaluated: true, originalServiceOrmInstancePgExecuted: false, files, parameterSourceSha256: hash(parameterSource), nodeInspectSourceSha256: hash(process.binding('natives')['internal/util/inspect']), cases, scalars, insertParams };
const target = 'tools/rust-r2l1/l-required-golden.json';
const serialized = JSON.stringify(output, null, 2) + '\n';
let portableCheck;
if (process.argv.includes('--check')) {
    // These are observed Node 24.19 sources, not an ignored source-hash field.
    // Check the actual platform provenance first, then project only this one
    // metadata field to the immutable Windows-origin Golden for strict compare.
    const observedSources = {
        win32: 'd4394ce8d707925ec3b844c22c977ebe037390cc5389e261b8519bff5785394d',
        linux: '578e96c3e776b17152dfc9331befe13fb84953575197b1bea7db78564efaa8c7'
    };
    if (process.version !== 'v24.19.0' || !Object.hasOwn(observedSources, process.platform) ||
        output.nodeInspectSourceSha256 !== observedSources[process.platform]) {
        throw new Error(`Unobserved Node inspect provenance: ${process.platform}/${process.version}/${output.nodeInspectSourceSha256}`);
    }
    const goldenText = fs.readFileSync(target, 'utf8');
    const golden = JSON.parse(goldenText);
    if (golden.nodeInspectSourceSha256 !== observedSources.win32) throw new Error('Original Golden inspect provenance changed');
    const projected = { ...output, nodeInspectSourceSha256: golden.nodeInspectSourceSha256 };
    if (JSON.stringify(projected, null, 2) + '\n' !== goldenText) throw new Error('Original required/render oracle changed outside the verified provenance field');
    portableCheck = { platform: process.platform, node: process.version, nodeInspectSourceSha256: output.nodeInspectSourceSha256, provenanceVerified: true, projectedMetadataField: 'nodeInspectSourceSha256', semanticEquality: true };
} else fs.writeFileSync(target, serialized, 'utf8');
console.log(JSON.stringify({ kind: output.kind, result: 'Pass', tables: 7, cases: cases.length, scalarCases: scalars.length, insertParams, ...(portableCheck ? { portableCheck } : {}), originalServiceOrmInstancePgExecuted: false }));
