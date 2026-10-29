// One-way finite source/DTO/helper extraction. Never starts a server or storage.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const zod = require('zod');
const ROOT = resolve(import.meta.dirname, '../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');
const snapshot = JSON.parse(read('tmp/rust-r2ij/i-g1-sources.json'));
const protectedRows = snapshot.sources.filter(s => s.path.startsWith('apps/poms-api/') || s.path.startsWith('libs/') || s.path === 'apps/poms-api-rust/src/auth/crypto.rs');
for (const source of protectedRows) {
    const bytes = readFileSync(resolve(ROOT, source.path));
    assert(hash(bytes) === source.rawBytesSha256 || hash(bytes.toString('utf8').replace(/\r\n/g, '\n')) === source.normalizedUtf8Sha256, 'Original product authority changed: ' + source.path);
}
function execute(text, dependencies) {
    const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
    const exports = {};
    const context = { exports, module: { exports }, require(name) { assert(Object.hasOwn(dependencies, name), name); return dependencies[name]; }, Date, Error, Buffer };
    new Script(compiled).runInNewContext(context, { timeout: 5000 });
    return context.module.exports;
}
const shared = execute(read('libs/shared/contracts/src/lib/shared-contracts.ts'), { zod });
function describe(node) {
    const def = node._zod.def;
    const out = { type: def.type };
    if (def.type === 'optional' || def.type === 'nullable') out.inner = describe(def.innerType);
    if (def.type === 'object') out.fields = Object.entries(node.shape).map(([key, rule]) => ({ key, rule: describe(rule) }));
    if (def.type === 'enum') out.values = Object.values(def.entries);
    if (def.coerce) out.coerce = true;
    if (def.checks?.length) out.checks = def.checks.map(c => Object.fromEntries(Object.entries(c._zod.def).filter(([k, v]) => k !== 'when' && k !== 'error' && typeof v !== 'function')));
    return out;
}
const names = ['AttachmentStorageProviderConfigListQuery', 'CreateAttachmentStorageProviderConfigRequest', 'UpdateAttachmentStorageProviderConfigRequest', 'TestAttachmentStorageProviderConnectionRequest', 'SetDefaultAttachmentStorageProviderRequest'];
const rules = { sourceHead: snapshot.sourceHead, schemas: Object.fromEntries(names.map(name => [name, describe(shared[name + 'Schema'])])) };
const spec = JSON.parse(read('libs/shared/api-spec/openapi.json'));
const paths = Object.fromEntries(Object.entries(spec.paths).filter(([path]) => path.startsWith('/api/platform/attachment-storage-providers')));
const schemas = {};
function refs(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
        const name = value.$ref.split('/').at(-1);
        if (!Object.hasOwn(schemas, name)) { schemas[name] = spec.components.schemas[name]; refs(schemas[name]); }
    }
    for (const child of Object.values(value)) refs(child);
}
refs(paths);
const openapi = { openapi: spec.openapi, info: spec.info, paths, components: { schemas, securitySchemes: spec.components.securitySchemes } };
const corpus = [];
function capture(schema, value, raw) {
    const result = shared[schema + 'Schema'].safeParse(value);
    corpus.push({ schema, inputRaw: raw ?? JSON.stringify(value), expected: result.success ? { success: true, dataRaw: JSON.stringify(result.data) } : { success: false, errors: result.error.issues } });
}
for (const schema of names) {
    for (const value of [undefined, null, [], '', true, 42, {}, { unexpected: true }, { expectedVersion: 1 }, { expectedVersion: 0 }, { expectedVersion: null }, { expectedVersion: 1.5 }, { expectedVersion: 1e100 }, { expectedVersion: '1' }]) capture(schema, value);
}
for (const enabled of ['', 'false', '0', 'true', null, false, 0, [], ['false'], {}]) capture(names[0], { enabled });
const base = { providerType: 'local', displayName: 'Synthetic local' };
for (const displayName of ['', ' ', '\ufeff a \u3000', '😀'.repeat(64), '😀'.repeat(65), '\ud800', 'x'.repeat(129)]) capture(names[1], { ...base, displayName });
for (const providerType of ['local', 'huawei-obs-s3', 's3', null, 1]) capture(names[1], { ...base, providerType });
for (const field of ['endpoint', 'region', 'bucket', 'keyPrefix', 'accessKeyId', 'secretAccessKey']) for (const value of [undefined, null, '', ' x ', 1, [], { length: 0 }]) capture(names[1], { ...base, [field]: value });
for (const value of [{ displayName: ' x ' }, { secretAccessKey: null }, { providerType: 'local' }, { isDefault: true }, { enabled: false }, { endpoint: null }, { expectedVersion: 1, unknown: true }, { displayName: '', expectedVersion: 0 }]) capture(names[2], value);
const exports = new Map([
    ['i-dto-rules.json', rules], ['i-openapi.json', openapi],
    ['i-dto-golden.json', { sourceHead: snapshot.sourceHead, kind: 'Finite original unchanged Zod evaluation; no storage/runtime', cases: corpus }],
    ['i-authority.json', { sourceHead: snapshot.sourceHead, operations: snapshot.operations.map(({ method, path, operationId }) => ({ method, path, operationId })), schemas: Object.keys(schemas).sort(), sources: protectedRows }]
]);
const check = process.argv.includes('--check');
mkdirSync(resolve(ROOT, 'tools/rust-r2ij'), { recursive: true });
for (const [file, value] of exports) {
    const output = JSON.stringify(value, null, 2) + '\n';
    const path = resolve(ROOT, 'tools/rust-r2ij', file);
    if (check) assert.equal(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), output, 'Stale I export: ' + file);
    else writeFileSync(path, output);
}
console.log(JSON.stringify({ check, files: exports.size, operations: Object.values(paths).reduce((n, v) => n + Object.keys(v).length, 0), schemas: Object.keys(schemas).length, originalSourceChecks: protectedRows.length, dtoCases: corpus.length, node: process.version, execution: 'Finite source/Zod only; no HTTP/DB/filesystem storage provider' }));
