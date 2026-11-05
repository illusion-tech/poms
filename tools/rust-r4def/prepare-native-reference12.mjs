// Generate an explicitly frozen Native reference adapter; Rust owns new semantics.
// The snapshot is derived, never hand-maintained, and never exported as public DTO metadata.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
const authority = JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-gate-authority07.json', 'utf8'));
assert(authority.G1Certified && authority.G2Authorized);
const manifest = JSON.parse(fs.readFileSync(authority.inputManifest.file, 'utf8'));
const input = manifest.sources.find(p => p.file === 'libs/shared/contracts/src/lib/shared-contracts.ts');
const original = fs.readFileSync(input.original);
assert.equal(createHash('sha256').update(original).digest('hex'), input.rawBytesSha256);
const old = ts.createSourceFile('frozen-shared.ts', original.toString('utf8'), ts.ScriptTarget.Latest, true);
const changes = JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/schema-authority06.json', 'utf8')).schemas;
const changedTypes = new Set(Object.entries(changes).filter(([, v]) => v.before !== null).map(([name]) => name));
const oldSpecPin = manifest.sources.find(p => p.file === 'libs/shared/api-spec/openapi.json');
const oldSchemas = JSON.parse(fs.readFileSync(oldSpecPin.original, 'utf8')).components.schemas;
function dependsOnChanged(value) {
    if (!value || typeof value !== 'object') return false;
    if (typeof value.$ref === 'string' && changedTypes.has(value.$ref.split('/').at(-1))) return true;
    return Object.values(value).some(dependsOnChanged);
}
let expanded = true;
while (expanded) { expanded = false; for (const [name, schema] of Object.entries(oldSchemas)) if (!changedTypes.has(name) && dependsOnChanged(schema)) { changedTypes.add(name); expanded = true; } }
const schemaNames = new Map();
for (const s of old.statements) if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) {
    let expr = d.initializer;
    while (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
        if (expr.expression.name.text === 'meta' && ts.isObjectLiteralExpression(expr.arguments[0])) {
            const id = expr.arguments[0].properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === 'id');
            if (id && ts.isStringLiteralLike(id.initializer)) schemaNames.set(id.initializer.text, d.name.text);
        }
        expr = expr.expression.expression;
    }
}
const transformed = ts.transform(old, [ctx => {
    function visit(node) {
        // Metadata is irrelevant to source-reference validation and must not register duplicate IDs.
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'meta') return ts.visitNode(node.expression.expression, visit);
        return ts.visitEachChild(node, visit, ctx);
    }
    return root => ts.visitNode(root, visit);
}]);
const core = 'apps/poms-api/src/app/core/rust-r4def-frozen-native-reference.ts';
assert(!fs.existsSync(core));
const header = `/**\n * Generated frozen Native reference shapes from G1 ${authority.inputCommit}.\n * Original Shared raw SHA256 ${input.rawBytesSha256}.\n * Not a second business SSOT, not public API metadata, and not the new Rust implementation.\n * Remove with the retired Node runtime in R7; regenerate only from the pinned source.\n */\nimport { NotImplementedException } from '@nestjs/common';\n`;
const helper = `\n/** Reject new-only Rust inputs instead of inventing legacy values or identities. */\nexport function parseFrozenNativeReference<T>(schema: z.ZodType<T>, input: unknown): T {\n    if (schema instanceof z.ZodObject && input !== null && typeof input === 'object' && !Array.isArray(input)) {\n        if (Object.keys(input).some(key => !Object.prototype.hasOwnProperty.call(schema.shape, key))) throw new NotImplementedException('This controlled command shape is implemented by the Rust backend');\n    }\n    const parsed = schema.safeParse(input);\n    if (!parsed.success) throw new NotImplementedException('This controlled command shape is implemented by the Rust backend');\n    return parsed.data;\n}\n`;
fs.writeFileSync(core, header + ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed.transformed[0]) + helper, { flag: 'wx' });
transformed.dispose();
const candidates = [];
function scan(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const f = `${dir}/${entry.name}`; if (entry.isDirectory()) scan(f); else if (entry.isFile() && f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== core) candidates.push(f); } }
scan('apps/poms-api/src/app');
const updated = [];
for (const file of candidates) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('@poms/shared-contracts') && !file.endsWith('.controller.ts')) continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const edits = []; const typeImports = []; const valueImports = new Set();
    let relative = path.relative(path.dirname(file), core).replaceAll('\\', '/').replace(/\.ts$/, ''); if (!relative.startsWith('.')) relative = './' + relative;
    for (const statement of ast.statements) if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === '@poms/shared-contracts' && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
        const bindings = statement.importClause.namedBindings.elements;
        const changed = bindings.filter(spec => changedTypes.has(spec.propertyName?.text ?? spec.name.text));
        if (!changed.length) continue;
        typeImports.push(...changed.map(spec => spec.getText(ast).replace(/^type\s+/, '')));
        const keep = bindings.filter(spec => !changed.includes(spec));
        edits.push({ start: statement.getStart(), end: statement.end, text: keep.length ? `import ${statement.importClause.isTypeOnly ? 'type ' : ''}{ ${keep.map(spec => spec.getText(ast)).join(', ')} } from '@poms/shared-contracts';` : '' });
    }
    if (file.endsWith('.controller.ts')) {
        function walk(node) {
            if (ts.isMethodDeclaration(node) && node.body) {
                const bodies = new Map();
                for (const parameter of node.parameters) if (ts.isIdentifier(parameter.name) && parameter.type && ts.isTypeReferenceNode(parameter.type)) {
                    const type = parameter.type.typeName.getText(ast); const component = type.replace(/Dto$/, '');
                    const decorators = ts.canHaveDecorators(parameter) ? ts.getDecorators(parameter) ?? [] : [];
                    if (changedTypes.has(component) && decorators.some(d => ts.isCallExpression(d.expression) && d.expression.expression.getText(ast) === 'Body')) bodies.set(parameter.name.text, schemaNames.get(component));
                }
                function calls(n) {
                    if (ts.isCallExpression(n)) for (const arg of n.arguments) if (ts.isIdentifier(arg) && bodies.has(arg.text)) {
                        const schema = bodies.get(arg.text); assert(schema, file); valueImports.add(schema); valueImports.add('parseFrozenNativeReference');
                        edits.push({ start: arg.getStart(ast), end: arg.end, text: `parseFrozenNativeReference(${schema}, ${arg.text})` });
                    }
                    ts.forEachChild(n, calls);
                }
                calls(node.body);
            }
            ts.forEachChild(node, walk);
        }
        walk(ast);
    }
    if (!edits.length) continue;
    let output = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    const imports = [typeImports.length ? `import type { ${typeImports.join(', ')} } from ${JSON.stringify(relative)};` : '', valueImports.size ? `import { ${[...valueImports].sort().join(', ')} } from ${JSON.stringify(relative)};` : ''].filter(Boolean).join('\n');
    fs.writeFileSync(file, imports + '\n' + output);
    updated.push(file);
}
const out = 'tmp/rust-r4def/root/native-reference12'; fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/receipt12.json', JSON.stringify({ kind: 'frozen-Native-reference-compilation-adapter', input, core, updated, changedPublicTypes: [...changedTypes], publicDtoMetadataUntouched: true, rustBehaviorCertified: false, runtimeExecuted: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ core, updatedFiles: updated.length, publicDtoMetadataUntouched: true, rustBehaviorCertified: false }));
