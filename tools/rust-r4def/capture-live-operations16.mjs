// Static current-controller policy/spec join for the shared 37+30 transport.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
const rows = [...JSON.parse(fs.readFileSync('tools/rust-r4abc/operation-map01.json')).operations, ...JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/operation-map06.json')).operations];
const spec = JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json'));
assert.equal(rows.length, 67); assert.equal(new Set(rows.map(o => o.operationId)).size, 67);
const decs = n => ts.canHaveDecorators(n) ? ts.getDecorators(n) ?? [] : [];
const name = d => ts.isCallExpression(d.expression) ? d.expression.expression.getText() : null;
const pins = new Map();
const operations = rows.map(row => {
    const file = row.controller.file, bytes = fs.readFileSync(file), ast = ts.createSourceFile(file, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
    pins.set(file, { file, bytes: bytes.length, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') });
    const cl = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === row.controller.class); assert(cl, row.operationId);
    const method = cl.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === row.controller.handler); assert(method, row.operationId);
    const policy = decs(method).find(d => name(d) === 'HasPermissions') ?? decs(cl).find(d => name(d) === 'HasPermissions'); assert(policy);
    const permissions = policy.expression.arguments.map(a => { assert(ts.isStringLiteralLike(a)); return a.text; });
    assert.deepEqual(permissions, row.permissions);
    const code = decs(method).find(d => name(d) === 'HttpCode'); const text = code?.expression.arguments[0].getText(ast);
    const successStatus = text === 'HttpStatus.OK' ? 200 : text === 'HttpStatus.CREATED' ? 201 : text ? Number(text) : row.method === 'POST' ? 201 : 200;
    assert.equal(successStatus, row.successStatus); assert.equal(spec.paths[row.path]?.[row.method.toLowerCase()]?.operationId, row.operationId);
    return { group: row.group, method: row.method, path: row.path, operationId: row.operationId, permissions, successStatus, controller: { ...row.controller, rawSha256: pins.get(file).rawBytesSha256 } };
});
fs.writeFileSync('tools/rust-r4def/combined-operation-map16.json', JSON.stringify({ kind: 'current-67-operation-controller-spec-policy', operations, sourcePins: [...pins.values()] }, null, 2) + '\n');
const patterns = new Map(), seen = new Set();
function walk(v, owner) { if (!v || typeof v !== 'object') return; if (v.$ref) { const n = v.$ref.split('/').at(-1); if (!seen.has(n)) { seen.add(n); walk(spec.components.schemas[n], n); } } if (v.pattern) patterns.set(v.pattern, [...new Set([...(patterns.get(v.pattern) ?? []), owner])]); Object.values(v).forEach(x => walk(x, owner)); }
for (const op of operations) { const v = spec.paths[op.path][op.method.toLowerCase()]; walk(v.requestBody, op.operationId); walk(v.parameters, op.operationId); }
console.log(JSON.stringify({ operations: operations.length, patterns: [...patterns].map(([pattern, owners]) => ({ pattern, owners: owners.slice(0, 3) })) }));
