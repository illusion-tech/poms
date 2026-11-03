// Root's static AST/spec/canonical inventory. This does not certify G1 or execute a domain.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ts = createRequire(import.meta.url)('typescript');
const out = 'docs/design/rust-r4def/inputs';
assert(!fs.existsSync(`${out}/surface28-source01.json`));
fs.mkdirSync(out, { recursive: true });
const fullFile = 'libs/shared/api-spec/openapi.json';
const canonicalFile = 'docs/design/api-route-canonical-inventory.md';
const rustFile = 'docs/design/archive/slices/rust-r4abc/g3-supplement59/final-openapi57/stdout-original.bin.bin';
const full = JSON.parse(fs.readFileSync(fullFile, 'utf8'));
const rust = JSON.parse(fs.readFileSync(rustFile, 'utf8'));
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const entries = spec => Object.entries(spec.paths).flatMap(([path, values]) => Object.entries(values).filter(([m]) => methods.includes(m)).map(([m, op]) => ({ method: m.toUpperCase(), path, ...op })));
const rustEntries = entries(rust);
assert.equal(rustEntries.length, 210);
assert.equal(entries(full).length, 291);
const delivered = new Set(rustEntries.map(op => op.operationId));
const canonical = fs.readFileSync(canonicalFile, 'utf8').split(/\r?\n/).flatMap((line, i) => {
    if (!line.startsWith('| `')) return [];
    const cells = line.split('|').slice(1, -1).map(s => s.trim().replaceAll('`', ''));
    return cells[2] && /^(GET|POST|PATCH|PUT|DELETE) \/\S+/.test(cells[2]) ? [{ line: i + 1, domain: cells[0], capability: cells[1], key: cells[2], status: cells.at(-1) }] : [];
});
const groups = {
    D: ['getContractHandoverSummary', 'getProjectHandoverDetailByProject', 'getProjectHandoverDetailByHandover', 'confirmProjectHandover', 'rebaselineContractHandover'],
    E: ['publishInternalCostRateVersion', 'createProjectActualCostRecord', 'listProjectActualCostRecords', 'getProjectActualCostRecordDetail', 'replaceLaborCostRecord', 'listExpenseRecords', 'getExpenseRecordDetail', 'createExpenseRecord', 'updateExpenseRecord', 'confirmExpenseRecord', 'voidExpenseRecord'],
    F: ['confirmSharedCostAllocationBasis', 'getSharedCostAllocationBasis', 'listSharedCostAllocationResults', 'replaceSharedCostAllocationResult', 'confirmCostStageAttribution', 'reclassifyCostStageAttribution', 'listCostStageAttributions', 'getCostStageAttribution', 'confirmAccountingTaxTreatment', 'replaceAccountingTaxTreatment', 'listAccountingTaxTreatments', 'getAccountingTaxTreatment'],
};
const decorations = node => ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
const call = dec => ts.isCallExpression(dec.expression) ? dec.expression : undefined;
const name = dec => call(dec)?.expression?.getText();
const arg = dec => call(dec)?.arguments?.[0] && ts.isStringLiteralLike(call(dec).arguments[0]) ? call(dec).arguments[0].text : '';
const pin = file => { const b = fs.readFileSync(file); return { file, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; };
const files = ['project-handover/project-handover.controller.ts', 'project-cost/project-cost.controller.ts'].map(p => `apps/poms-api/src/app/features/${p}`);
const operations = [];
for (const file of files) {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const cl of ast.statements.filter(ts.isClassDeclaration)) {
        const controller = decorations(cl).find(d => name(d) === 'Controller');
        if (!controller) continue;
        for (const member of cl.members.filter(ts.isMethodDeclaration)) {
            const handler = member.name.getText();
            const group = Object.keys(groups).find(g => groups[g].includes(handler));
            if (!group) continue;
            const verb = decorations(member).find(d => ['Get', 'Post', 'Patch', 'Put', 'Delete'].includes(name(d)));
            assert(verb);
            const method = name(verb).toUpperCase();
            const path = ('/api/' + [arg(controller), arg(verb)].filter(Boolean).join('/')).replace(/(^|\/)\:([A-Za-z_][\w]*)/g, '$1{$2}').replaceAll('\\:', ':');
            const op = full.paths[path]?.[method.toLowerCase()];
            assert.equal(op?.operationId, `${cl.name.text}_${handler}`);
            assert(!delivered.has(op.operationId), `${op.operationId} already delivered`);
            const key = method + ' ' + path.slice(4);
            const rows = canonical.filter(r => r.key === key);
            // One HTTP operation can own several documented union variants.
            assert(rows.length >= 1, key);
            assert(rows.every(row => row.status === 'aligned'), key);
            const policy = decorations(member).find(d => name(d) === 'HasPermissions') ?? decorations(cl).find(d => name(d) === 'HasPermissions');
            assert(policy, op.operationId);
            const permissions = call(policy).arguments.map(a => { assert(ts.isStringLiteralLike(a)); return a.text; });
            const status = decorations(member).find(d => name(d) === 'HttpCode');
            const code = status ? call(status).arguments[0].getText() : null;
            const successStatus = code === 'HttpStatus.OK' ? 200 : code === 'HttpStatus.CREATED' ? 201 : code ? Number(code) : method === 'POST' ? 201 : 200;
            assert(Number.isInteger(successStatus));
            operations.push({ group, method, path, key, operationId: op.operationId, permissions, successStatus, controller: { file, class: cl.name.text, handler, line: ast.getLineAndCharacterOfPosition(member.getStart()).line + 1 }, canonical: rows, parameters: op.parameters ?? [], requestBody: op.requestBody ?? null, responses: op.responses });
        }
    }
}
for (const [group, n] of [['D', 5], ['E', 11], ['F', 12]]) assert.equal(operations.filter(op => op.group === group).length, n);
assert.equal(new Set(operations.map(op => op.key)).size, 28);
const schemas = new Set();
function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    if (value.$ref?.startsWith('#/components/schemas/')) {
        const n = value.$ref.split('/').at(-1);
        if (!schemas.has(n)) { schemas.add(n); assert(full.components.schemas[n]); walk(full.components.schemas[n]); }
    }
    Object.values(value).forEach(walk);
}
operations.forEach(walk);
const surface = { kind: 'R4-next28-current-AST-spec-canonical-join', evidenceClass: 'static-input-only', base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), createdAt: new Date().toISOString(), counts: { D: 5, E: 11, F: 12, total: 28, existingRust: 210, overlap: 0, transitiveSchemas: schemas.size }, sourcePins: [...files, fullFile, canonicalFile, rustFile].map(pin), operations, schemas: Object.fromEntries([...schemas].sort().map(n => [n, full.components.schemas[n]])), claims: { G1Certified: false, G2Authorized: false, runtimeExecuted: false, businessParityWithNodeBugsIsNotGoal: true } };
fs.writeFileSync(`${out}/surface28-source01.json`, JSON.stringify(surface, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync('tools/rust-r4def/operation-map01.json', JSON.stringify({ kind: 'current-effective-R4-next28-operation-map', operations: operations.map(({ group, method, path, operationId, permissions, successStatus, controller }) => ({ group, method, path, operationId, permissions, successStatus, controller })) }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ counts: surface.counts, surface: pin(`${out}/surface28-source01.json`) }));
