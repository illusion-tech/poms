// One-way extraction from the frozen original TS/Zod/full spec. No PG or I/O adapters.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const ROOT = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url), ts = require('typescript'), zod = require('zod');
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const frozen = JSON.parse(read('docs/design/rust-r2k/k-sources.json'));
const contractFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const serviceFile = 'apps/poms-api/src/app/features/attachment/attachment.service.ts';
const schemaNames = ['RefreshProjectHandoverAttachmentChecklistRequest', 'CreateProjectHandoverAttachmentDownloadPackageRequest'];

function loadShared() {
    const exports = {};
    const compiled = ts.transpileModule(read(contractFile), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    new Script(compiled, { filename: contractFile }).runInNewContext({ exports, module: { exports }, require(name) { assert.equal(name, 'zod'); return zod; } });
    return exports;
}

function describe(node) {
    const definition = node._zod.def, rule = { type: definition.type };
    if (definition.format) rule.format = definition.format;
    if (definition.pattern) rule.pattern = definition.pattern.toString();
    if (definition.innerType) rule.inner = describe(definition.innerType);
    if (definition.type === 'array') rule.element = describe(definition.element);
    if (definition.type === 'default') rule.defaultValue = definition.defaultValue;
    if (definition.type === 'object') rule.fields = Object.entries(node.shape).map(([key, value]) => ({ key, rule: describe(value) }));
    if (definition.type === 'enum') rule.values = Object.values(definition.entries);
    if (definition.checks?.length) rule.checks = definition.checks.map(check => Object.fromEntries(Object.entries(check._zod.def)
        .filter(([key, value]) => !['when', 'error'].includes(key) && typeof value !== 'function')
        .map(([key, value]) => [key, Object.prototype.toString.call(value) === '[object RegExp]' ? value.toString() : value])));
    return rule;
}

function helperArtifacts() {
    const source = ts.createSourceFile(serviceFile, read(serviceFile), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const original = source.statements.find(statement => ts.isClassDeclaration(statement) && statement.name?.text === 'AttachmentService');
    assert(original);
    const names = ['buildPackageFileName', 'buildPackageEntryName', 'sanitizeArchiveEntryName', 'buildZipArchive', 'toDosDateTime', 'crc32', 'buildManifestSummary'];
    const members = names.map(name => { const member = original.members.find(member => member.name?.getText(source) === name); assert(member, name); return member.getText(source); });
    const archive = original.members.find(member => member.name?.getText(source) === 'createDownloadPackageArchive');
    assert(archive && ts.isVariableStatement(archive.body.statements[0]));
    // The manifest construction statement is copied intact; no repository or storage call executes.
    const manifest = `manifestBytes(downloadPackage, includedSelections, manifestSummary) { ${archive.body.statements[0].getText(source)}; return entries[0].data; }`;
    const compiled = ts.transpileModule(`class OriginalHelpers { ${members.join('\n')} ${manifest} } exports.helpers = new OriginalHelpers();`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const now = Date.parse('2026-05-05T08:09:11.123Z');
    class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
    const exports = {};
    new Script(compiled, { filename: 'original-K-private-helpers' }).runInNewContext({ exports, Buffer, Date: FixedDate });
    const helpers = exports.helpers;
    const namesCorpus = ['需求说明.pdf', 'plain', '', ' ', '.', 'a/b\\c:*?"<>|', ' no-extension ', 'a.b/', '\ufeff 名称\u00a0', '😀'.repeat(91), 'a'.repeat(179) + '😀', 'bad\ud800name', 'a\nname', 'attachment.bin'];
    const filenames = namesCorpus.map((displayName, index) => ({ displayNameRaw: JSON.stringify(displayName), index, expectedRaw: JSON.stringify(helpers.buildPackageEntryName({ displayName }, index)), sanitizedRaw: JSON.stringify(helpers.sanitizeArchiveEntryName(displayName)) }));
    const zipCases = [[], [{ name: 'manifest.json', data: Buffer.from('{}') }], [{ name: 'manifest.json', data: Buffer.from('{"a":1}\n') }, { name: '001-需求 +😀.txt', data: Buffer.from([0, 1, 2, 255]) }], [{ name: '\ud800.bin', data: Buffer.from('synthetic') }]].map(entries => ({ entries: entries.map(({ name, data }) => ({ nameRaw: JSON.stringify(name), dataBase64: data.toString('base64') })), expectedBase64: helpers.buildZipArchive(entries).toString('base64') }));
    const overflowEntries = [{ name: 'a'.repeat(65536), data: Buffer.alloc(0) }];
    let overflowError; try { helpers.buildZipArchive(overflowEntries); } catch (error) { overflowError = { name: error.name, message: error.message }; }
    const packageRow = { id: 'a0000000-0000-4000-8000-000000000001', handoverId: 'a0000000-0000-4000-8000-000000000002', projectId: 'a0000000-0000-4000-8000-000000000003', createdAt: new Date(now), expiresAt: new Date(now + 86400000) };
    const included = [{ id: 'a0000000-0000-4000-8000-000000000004', attachmentId: 'a0000000-0000-4000-8000-000000000005', versionGroupId: 'a0000000-0000-4000-8000-000000000006', displayName: 'a'.repeat(179) + '😀', category: 'demand', securityLevel: 'normal', sourceRefs: [{ sourceType: 'project', sourceId: packageRow.projectId, relationType: 'belongs-to', label: '项目附件' }] }];
    const excluded = [{ attachmentId: null, status: 'excluded', exclusionReason: '' }, { attachmentId: 'a0000000-0000-4000-8000-000000000007', status: 'sensitive-excluded', exclusionReason: null }];
    const summary = helpers.buildManifestSummary(included, excluded);
    const dates = ['1970-01-01T00:00:00.000Z', '1980-01-01T00:00:00.000Z', '2026-05-05T08:09:11.123Z', '2107-12-31T23:59:59.999Z'].map(iso => ({ iso, expected: helpers.toDosDateTime(new Date(iso)) }));
    return { sourceFile: serviceFile, sourceRawSha256: hash(readFileSync(resolve(ROOT, serviceFile))), compiledSha256: hash(compiled), now, filenames, zipCases, overflowError, dates, crcCases: ['', '123456789', '需求'].map(text => ({ dataBase64: Buffer.from(text).toString('base64'), expected: helpers.crc32(Buffer.from(text)) })), manifest: { packageRow, included, excluded, summary, expectedUtf8: helpers.manifestBytes(packageRow, included, summary).toString('utf8') } };
}

export function artifacts() {
    const required = new Set([contractFile, serviceFile, 'apps/poms-api/src/app/features/attachment/attachment.repository.ts', 'apps/poms-api/src/app/features/attachment/attachment.entity.ts', 'apps/poms-api/src/app/features/attachment/attachment-handover.controller.ts', 'libs/api/contracts/src/lib/attachment/attachment.dto.ts']);
    const sources = frozen.sources.filter(source => required.has(source.file)).map(source => {
        const bytes = readFileSync(resolve(ROOT, source.file)), raw = hash(bytes), lf = hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
        assert(raw === source.rawBytesSha256 || lf === source.normalizedLfSha256, 'Frozen original authority changed: ' + source.file);
        return { file: source.file, rawBytesSha256: raw, normalizedLfSha256: lf };
    });
    assert.equal(sources.length, required.size);
    const shared = loadShared();
    const rules = { formatVersion: 1, sourceHead: frozen.baseHead, schemas: Object.fromEntries(schemaNames.map(name => [name, describe(shared[name + 'Schema'])])) };
    const cases = [];
    function capture(schema, name, inputRaw) {
        let expected;
        try { expected = { success: true, dataRaw: JSON.stringify(shared[schema + 'Schema'].parse(inputRaw === undefined ? undefined : JSON.parse(inputRaw))) }; }
        catch (error) { assert(Array.isArray(error.issues), error.message); expected = { success: false, response: { statusCode: 400, message: 'Validation failed', errors: error.issues } }; }
        cases.push({ schema, name, ...(inputRaw === undefined ? {} : { inputRaw }), expected });
    }
    const id = 'a0000000-0000-4000-8000-000000000001';
    for (const schema of schemaNames) {
        capture(schema, 'missing');
        for (const value of [null, [], false, 0, '', {}, { unknown: 'strip' }]) capture(schema, 'root-' + cases.length, JSON.stringify(value));
        for (const field of rules.schemas[schema].fields) for (const value of [null, true, false, 0, -1, 1.5, '', ' ', ' x ', '\ud800', [], {}, [id], [id, id], [id.toUpperCase()], [null], [{ selectionId: id, rowVersion: 1 }]]) capture(schema, field.key + '-' + cases.length, JSON.stringify({ [field.key]: value }));
    }
    for (const value of [[], [id, id], [id, id.toUpperCase()], ['not-uuid'], [id, null]]) capture(schemaNames[1], 'selection-list-' + cases.length, JSON.stringify({ selectionIds: value }));
    for (const rowVersion of [undefined, null, -1, 0, 1, 1.5, 9007199254740991, 9007199254740992, '1']) capture(schemaNames[1], 'expectation-' + cases.length, JSON.stringify({ expectedSelectionVersions: [{ selectionId: id, rowVersion, unknown: 'strip' }] }));
    for (const note of ['😀'.repeat(1000), '😀'.repeat(1001), '\ufeff x\u00a0', 'a'.repeat(1000), 'a'.repeat(1001), '\ud800']) capture(schemaNames[1], 'note-' + cases.length, JSON.stringify({ note }));
    const currentSpec = JSON.parse(read('libs/shared/api-spec/openapi.json')), paths = {}, schemas = {};
    function refs(value) { if (!value || typeof value !== 'object') return; if (value.$ref?.startsWith('#/components/schemas/')) { const name = value.$ref.slice(21); if (!Object.hasOwn(schemas, name)) { schemas[name] = currentSpec.components.schemas[name]; assert(schemas[name], name); refs(schemas[name]); } } Object.values(value).forEach(refs); }
    for (const operation of frozen.operations) {
        const value = currentSpec.paths[operation.path][operation.method.toLowerCase()];
        assert.deepEqual(value, operation.completeSpecOperation, 'Frozen complete K operation changed');
        (paths[operation.path] ??= {})[operation.method.toLowerCase()] = value; refs(value);
    }
    for (const [name, value] of Object.entries(frozen.transitiveOpenApiSchemas)) assert.deepEqual(schemas[name], value, 'Frozen K schema changed ' + name);
    assert.equal(Object.keys(schemas).length, 16);
    const authority = { formatVersion: 1, sourceHead: frozen.baseHead, authority: 'Frozen original K methods/shared Zod/full K operation/schema slice; no handwritten product oracle', sources };
    return new Map(Object.entries({
        'k-dto-rules.json': rules,
        'k-dto-golden.json': { ...authority, execution: 'Pure original Zod, finite synthetic input; no HTTP/PG/storage', cases },
        'k-openapi.json': { openapi: currentSpec.openapi, paths, components: { schemas, securitySchemes: currentSpec.components.securitySchemes } },
        'k-zip-golden.json': { ...authority, execution: 'Mechanical private helper/manifest-prefix extraction only; fixed clock; no repository/storage adapter execution', ...helperArtifacts() },
        'k-source.json': authority
    }).map(([name, value]) => [name, JSON.stringify(value, null, 2) + '\n']));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
    const outputs = artifacts(), check = process.argv.includes('--check');
    if (!check) mkdirSync(resolve(ROOT, 'tools/rust-r2k'), { recursive: true });
    for (const [name, value] of outputs) {
        const file = resolve(ROOT, 'tools/rust-r2k', name);
        if (check) assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), value, 'Stale K artifact ' + name);
        else writeFileSync(file, value);
    }
    console.log(JSON.stringify({ mode: check ? 'check' : 'export', operations: 5, schemas: 16, outputs: outputs.size, cases: JSON.parse(outputs.get('k-dto-golden.json')).cases.length, execution: 'pure source extraction only' }));
}
