const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const source = 'apps/poms-api/src/app/features/attachment/attachment-upload-session.entity.ts';
const target = 'apps/poms-api/src/app/features/project-cost/rust-r4ghi-entities.entity.ts';
const proposed = path.join(__dirname, 'upload-purpose-fk-candidate22');
const graph = new Map();
const inputs = [];
const dynamic = [];
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
function resolve(from, name) {
    if (name === '@poms/shared-contracts') return 'libs/shared/contracts/src/index.ts';
    if (!name.startsWith('.')) return undefined;
    const base = path.resolve(root, path.dirname(from), name);
    for (const file of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(file) && fs.statSync(file).isFile()) return relative(file);
    }
    throw new Error(`Unresolved runtime source import ${from} -> ${name}`);
}
function visit(file) {
    if (graph.has(file)) return;
    const actual = file === source ? path.join(proposed, file) : path.join(root, file);
    const raw = fs.readFileSync(actual);
    inputs.push({ file, sha256: crypto.createHash('sha256').update(raw).digest('hex') });
    const ast = ts.createSourceFile(file, raw.toString('utf8'), ts.ScriptTarget.Latest, true);
    const edges = [];
    graph.set(file, edges);
    for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
        if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) || statement.isTypeOnly) continue;
        if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) continue;
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings) && !statement.importClause.name && bindings.elements.every((entry) => entry.isTypeOnly)) continue;
        const resolved = resolve(file, statement.moduleSpecifier.text);
        if (resolved) {
            edges.push(resolved);
            visit(resolved);
        }
    }
    const scan = (node) => {
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) dynamic.push(file);
        ts.forEachChild(node, scan);
    };
    scan(ast);
    if (file === source) {
        let deferred = false;
        const check = (node) => {
            if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'completionConditionScope') {
                assert.ok(ts.isArrowFunction(node.initializer));
                assert.match(node.initializer.body.getText(ast), /manyToOne\(ProjectCompletionCondition\)/);
                deferred = true;
            }
            ts.forEachChild(node, check);
        };
        check(ast);
        assert.ok(deferred, 'New target class reference must remain inside a deferred relation builder');
    }
}
visit(source);
assert.ok(graph.get(source).includes(target));
const closure = new Set();
function reach(file) {
    if (closure.has(file)) return;
    closure.add(file);
    for (const edge of graph.get(file) ?? []) reach(edge);
}
reach(target);
assert.ok(!closure.has(source), 'New edge must not introduce a module cycle back to the upload session');
assert.deepEqual(dynamic, []);
const output = { kind: 'actual-TypeScript-runtime-import-closure-analysis-of-M96-candidate', source, target, sourceCount: inputs.length, targetRuntimeClosureSize: closure.size, targetDoesNotReachUploadSession: true, newEdgeCreatesNoModuleCycle: true, targetReferenceDeferredInArrowBuilder: true, dynamicModuleEdges: dynamic, inputs, graph: Object.fromEntries(graph), SQLExecuted: false, G3Certified: false };
fs.writeFileSync(path.join(__dirname, 'upload-fk-import-proof22.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ sourceCount: inputs.length, noNewModuleCycle: true, relationReferenceDeferred: true }));
