// Static G1 join only: target contracts/SQL are design artifacts, not generated delivery.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const folder = 'docs/design/rust-r4def';
const edition = process.argv[2] ?? '02';
assert(/^\d{2}$/.test(edition));
const out = `${folder}/joint-g1-${edition}`;
assert(!fs.existsSync(out), 'Keep every previous candidate immutable');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const stable = value => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; };
const dFile = `${folder}/D-g1-candidate01.json`;
const eFile = `${folder}/E-g1-candidate02.json`;
const fFile = `${folder}/F-g1-candidate01.json`;
const d = read(dFile), e = read(eFile), f = read(fFile);
const full = read('libs/shared/api-spec/openapi.json');
const proposed = new Map();
for (const [owner, schemas] of [['D', { ...d.targetPublicContract.schemas, ...d.affectedContractSchemaProposals }], ['E', e.proposedSchemas], ['F', f.candidateSchemas]]) {
    assert(schemas && Object.keys(schemas).length > 0, owner);
    for (const [name, schema] of Object.entries(schemas)) {
        if (proposed.has(name)) assert.equal(stable(proposed.get(name).schema), stable(schema), `Conflicting schema owners: ${name}`);
        else proposed.set(name, { owner, schema });
    }
}
// Root's explicitly frozen financial source-currency extension adds no HTTP route.
for (const name of ['CreateInvoiceRecordRequest', 'UpdateInvoiceRecordRequest', 'InvoiceRecordSummary', 'InvoiceRecordDetailView']) {
    assert(!proposed.has(name));
    const schema = structuredClone(full.components.schemas[name]);
    schema.properties.currencyCode = { type: 'string', pattern: '^[A-Z]{3}$', ...(name.includes('Request') ? {} : { nullable: true }) };
    if (!name.includes('Request')) schema.required = [...new Set([...schema.required, 'currencyCode'])];
    proposed.set(name, { owner: 'Root', schema });
}
const target = structuredClone(full);
for (const [name, { schema }] of proposed) target.components.schemas[name] = schema;
const oldMap = read('tools/rust-r4def/operation-map01.json').operations;
const oldById = new Map(oldMap.map(op => [op.operationId, op]));
const operations = [];
for (const op of d.targetPublicContract.operations) {
    const metadata = oldById.get(op.operationId) ?? { group: 'D', method: op.method, path: op.path, operationId: op.operationId, permissions: op.permissions, successStatus: op.successStatus, controller: { file: 'apps/poms-api/src/app/features/project-handover/project-handover.controller.ts', class: 'ProjectHandoverController', handler: op.operationId.split('_').at(-1) } };
    const value = structuredClone(op);
    for (const key of ['method', 'path', 'group', 'inventoryStatus', 'permissions', 'successStatus']) delete value[key];
    target.paths[op.path] ??= {};
    target.paths[op.path][op.method.toLowerCase()] = value;
    operations.push({ ...metadata, permissions: op.permissions, successStatus: op.successStatus });
}
for (const op of e.operations) {
    const value = target.paths[op.path][op.method.toLowerCase()];
    const response = op.candidate?.response;
    assert(response && target.components.schemas[response], op.operationId);
    value.responses[String(op.successStatus)] = { description: 'Committed result or projected read model', content: { 'application/json': { schema: { $ref: `#/components/schemas/${response}` } } } };
    if (op.candidate.query) value.parameters = [...(value.parameters ?? []).filter(p => p.in !== 'query'), ...Object.entries(op.candidate.query.properties).map(([name, schema]) => ({ name, in: 'query', required: false, schema }))];
    operations.push(oldById.get(op.operationId));
}
for (const op of f.operations) {
    target.paths[op.path][op.method.toLowerCase()].responses[String(op.successStatus)] = op.candidateSuccessResponse;
    operations.push(oldById.get(op.operationId));
}
assert.equal(operations.length, 30);
assert(operations.every(Boolean));
assert.equal(new Set(operations.map(op => op.operationId)).size, 30);
const fullOperations = Object.entries(target.paths).flatMap(([p, values]) => Object.entries(values).filter(([m]) => ['get', 'post', 'patch', 'put', 'delete', 'head', 'options'].includes(m)).map(([m, v]) => ({ method: m, path: p, id: v.operationId })));
assert.equal(fullOperations.length, 293);
const refs = new Set();
function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    if (value.$ref?.startsWith('#/components/schemas/')) {
        const name = value.$ref.split('/').at(-1);
        assert(target.components.schemas[name], `Missing schema ${name}`);
        if (!refs.has(name)) { refs.add(name); walk(target.components.schemas[name]); }
    }
    Object.values(value).forEach(walk);
}
walk(target.paths);
const schemaChanges = [...proposed].filter(([name, { schema }]) => stable(schema) !== stable(full.components.schemas[name]));
const inputFiles = ['docs/design/rust-r4def-next30-baseline.md', `${folder}/protocol01.md`, `${folder}/user-decisions01.json`, `${folder}/root-decisions02.json`, `${folder}/root-source-currency01.sql`, dFile, `${folder}/D-g1-candidate01.md`, `${folder}/D-schema-candidate01.sql`, eFile, `${folder}/E-g1-candidate02.md`, `${folder}/${e.ddlCandidate?.file?.split('/').at(-1) ?? e.ddlCandidate?.path?.split('/').at(-1) ?? 'E-schema-candidate02.sql'}`, fFile, `${folder}/F-g1-candidate01.md`, `${folder}/F-schema-candidate01.sql`, 'docs/design/api-route-canonical-inventory.md', 'libs/shared/api-spec/openapi.json', 'tools/rust-r4def/build-g1-package01.mjs'];
// The corrected candidate must explicitly name a real SQL file.
const eSql = e.ddlCandidate?.file ?? e.ddlCandidate?.path ?? `${folder}/E-schema-candidate02.sql`;
assert(fs.existsSync(eSql));
const sqlFiles = [`${folder}/D-schema-candidate01.sql`, eSql, `${folder}/F-schema-candidate01.sql`, `${folder}/root-source-currency01.sql`];
for (const file of sqlFiles) assert(fs.existsSync(file));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/operation-map${edition}.json`, JSON.stringify({ kind: 'joint-G1-next30-operation-authority', operations }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(`${out}/schema-authority${edition}.json`, JSON.stringify({ kind: 'joint-G1-declared-schema-changes', schemas: Object.fromEntries(schemaChanges.map(([name, { owner, schema }]) => [name, { owner, before: full.components.schemas[name] ?? null, after: schema }])) }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(`${out}/target-full-spec${edition}.json`, JSON.stringify(target, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(`${out}/schema${edition}.sql`, sqlFiles.map(file => `-- SOURCE ${file}\n${fs.readFileSync(file, 'utf8')}\n`).join('\n').trimEnd() + '\n', { flag: 'wx' });
const readScope = new Set(inputFiles.filter(fs.existsSync));
for (const root of ['apps/poms-api-rust/src', 'apps/poms-api/src/app/features/project-handover', 'apps/poms-api/src/app/features/project-cost', 'apps/poms-api/src/app/features/contract', 'apps/poms-api/src/app/features/contract-readiness', 'apps/poms-api/src/app/features/contract-finance', 'apps/poms-api/src/migrations', 'libs/shared/contracts/src', 'libs/api/contracts/src']) {
    function scan(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = `${dir}/${entry.name}`; if (entry.isDirectory()) scan(file); else if (entry.isFile()) readScope.add(file); } } scan(root);
}
for (const file of ['project-lifecycle-design.md', 'contract-finance-design.md', 'interface-command-design.md', 'interface-openapi-dto-design.md', 'table-structure-freeze-design.md', 'schema-ddl-design.md', 'query-view-boundary-design.md', 'phase2-project-actual-cost-records.md', 'phase2-cost-source-to-project-record-mapping.md', 'phase2-contract-to-handover-workspace.md', 'phase2-project-handover-gate-workspace.md', 'phase2-handover-closure-rules.md', 'phase2-commission-freeze-at-handover.md', 'phase2-data-permission-and-sensitive-visibility-design.md']) readScope.add(`docs/design/${file}`);
const sources = [...readScope].sort().map(pin);
for (const source of sources) {
    assert(!path.isAbsolute(source.file) && !source.file.split('/').includes('..'));
    const dest = `${out}/source-originals/${source.file}.bin`;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, fs.readFileSync(source.file), { flag: 'wx' });
    assert.equal(pin(dest).rawBytesSha256, source.rawBytesSha256, `Changed input while capturing ${source.file}`);
    assert.equal(pin(source.file).rawBytesSha256, source.rawBytesSha256, `Unstable source ${source.file}`);
    source.original = dest;
}
const outputs = ['operation-map', 'schema-authority', 'target-full-spec', 'schema'].map(name => pin(`${out}/${name}${edition}.${name === 'schema' ? 'sql' : 'json'}`));
const manifest = { kind: 'R4-DEF-joint-G1-static-candidate02', createdAt: new Date().toISOString(), base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), counts: { D: 7, E: 11, F: 12, total: 30, existing: 28, new: 2, currentFull: 291, targetFull: 293, currentRust: 210, expectedRustAfterBatch: 240, changedSchemas: schemaChanges.length, targetSchemas: Object.keys(target.components.schemas).length, sourcePins: sources.length }, sources, outputs, sqlFiles, model: { authorsAndReviewer: 'gpt-6.1-sol', effort: 'max', fast: 'unverified' }, G1Certified: false, G2Authorized: false, runtimeExecuted: false, oldFailedAndPartialPreserved: true };
fs.writeFileSync(`${out}/manifest${edition}.json`, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ counts: manifest.counts, manifest: pin(`${out}/manifest${edition}.json`) }));
