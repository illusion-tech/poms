// Read product sources and write reviewable copies/diffs under orm-g2 only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const installed = createRequire('E:/projects/poms/package.json');
const ts = installed('typescript');
const own = __dirname;
const root = path.resolve(process.argv[2] ?? path.join(own, '../../../../../..'));
const catalog = JSON.parse(fs.readFileSync(path.join(own, 'sql-target-catalog.json'), 'utf8'));
const proposed = path.join(own, 'proposed');
const targetNew = catalog.targetFile;
const files = new Map();
const report = [];

function name(node) { return node && (ts.isStringLiteralLike(node) || ts.isIdentifier(node)) ? node.text : ''; }
function prop(object, key) { return object.properties.find((node) => ts.isPropertyAssignment(node) && name(node.name) === key); }
function relativeImport(from, to) { const result = path.relative(path.dirname(from), to).replaceAll('\\', '/').replace(/\.ts$/, ''); return result.startsWith('.') ? result : `./${result}`; }
function fileState(relative) {
    if (files.has(relative)) return files.get(relative);
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const state = { relative, source, ast: ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), edits: [], imports: new Map() };
    files.set(relative, state); return state;
}
function importClass(state, targetTable) {
    const className = catalog.entityNames[targetTable] ?? targetTable.split('_').map((piece) => piece[0].toUpperCase() + piece.slice(1)).join('');
    const targetFile = catalog.tables[targetTable]?.new ? targetNew : catalog.entityFiles[targetTable];
    if (!targetFile) throw new Error(`Missing real relation class: ${targetTable}`);
    if (targetFile === state.relative) return;
    const module = relativeImport(state.relative, targetFile);
    const names = state.imports.get(module) ?? new Set(); names.add(className); state.imports.set(module, names);
}
function findEntity(state, table) {
    let result;
    const visit = (node) => {
        if (ts.isCallExpression(node) && node.expression.getText(state.ast) === 'defineEntity' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
            const object = node.arguments[0];
            if (name(prop(object, 'tableName')?.initializer) === table) result = object;
        }
        ts.forEachChild(node, visit);
    };
    visit(state.ast);
    if (!result) throw new Error(`Target defineEntity missing: ${table} in ${state.relative}`);
    return result;
}
function replaceArray(state, object, key, desired, remove = new Set()) {
    const original = prop(object, key);
    if (original && !ts.isArrayLiteralExpression(original.initializer)) throw new Error(`Non-literal ${key} cannot be replaced safely`);
    const additions = new Map(desired.map((entry) => [entry.name, entry]));
    const retained = [];
    for (const entry of original?.initializer.elements ?? []) {
        const existingName = ts.isObjectLiteralExpression(entry) ? name(prop(entry, 'name')?.initializer) : '';
        if (remove.has(existingName)) continue;
        if (additions.has(existingName)) { retained.push(JSON.stringify(additions.get(existingName))); additions.delete(existingName); }
        else retained.push(entry.getText(state.ast));
    }
    retained.push(...[...additions.values()].map((entry) => JSON.stringify(entry)));
    const output = `[\n${retained.map((entry) => `        ${entry}`).join(',\n')}\n    ]`;
    if (original) state.edits.push({ start: original.initializer.getStart(state.ast), end: original.initializer.end, text: output });
    else if (retained.length) state.edits.push({ start: object.getStart(state.ast) + 1, end: object.getStart(state.ast) + 1, text: `\n    ${key}: ${output},` });
}

for (const table of Object.values(catalog.tables).filter((table) => !table.new)) {
    const relative = catalog.entityFiles[table.name];
    if (!relative) throw new Error(`Existing entity source missing: ${table.name}`);
    const state = fileState(relative); const object = findEntity(state, table.name);
    const properties = prop(object, 'properties')?.initializer;
    if (!properties || !ts.isObjectLiteralExpression(properties)) throw new Error(`Non-literal properties in ${relative}`);
    const additions = [];
    const changes = [];
    for (const column of Object.values(table.columns)) {
        const original = prop(properties, column.property);
        if (!original) {
            if (!column.proposedBuilder) throw new Error(`Cannot infer an existing missing property ${table.name}.${column.column}`);
            additions.push(`${column.property}: ${column.proposedBuilder}`);
            const relation = table.foreignKeys.find((fk) => fk.columns.length === 1 && fk.columns[0] === column.column);
            if (relation) importClass(state, relation.targetTable);
            changes.push({ column: column.column, kind: 'add', expression: column.proposedBuilder });
        } else {
            let expression = original.initializer.getText(state.ast);
            if (column.nullable === true && !/\.nullable\(/.test(expression)) expression += '.nullable()';
            if (column.sqlType?.startsWith('numeric')) {
                const [precision, scale] = column.sqlType.match(/\d+/g);
                expression = expression.replace(/\.precision\(\s*\d+\s*\)/, `.precision(${precision})`).replace(/\.scale\(\s*\d+\s*\)/, `.scale(${scale})`);
            }
            if (expression !== original.initializer.getText(state.ast)) {
                state.edits.push({ start: original.initializer.getStart(state.ast), end: original.initializer.end, text: expression });
                changes.push({ column: column.column, kind: 'alter', expression });
            }
        }
    }
    for (const [index, fk] of table.foreignKeys.filter((fk) => fk.columns.length > 1).entries()) {
        const key = `jghiScopeConstraint${index + 1}`;
        if (prop(properties, key)) throw new Error(`Scope mapping already exists; regenerate against the applied metadata: ${table.name}.${key}`);
        const nullable = fk.columns.some((column) => table.columns[column]?.nullable);
        additions.push(`${key}: () => ${fk.proposedBuilder}${nullable ? '.nullable()' : ''}`);
        importClass(state, fk.targetTable);
    }
    if (additions.length) {
        const body = state.source.slice(properties.getStart(state.ast) + 1, properties.end - 1).trimEnd();
        const comma = body.trim() && !body.trimEnd().endsWith(',') ? ',' : '';
        state.edits.push({ start: properties.end - 1, end: properties.end - 1, text: `${comma}\n        ${additions.join(',\n        ')}\n    ` });
    }
    replaceArray(state, object, 'checks', table.checks.map(({ name, expression }) => ({ name, expression })), new Set(table.dropConstraints));
    replaceArray(state, object, 'uniques', [...table.uniques.map(({ name, columns }) => ({ name, properties: columns.map((column) => column.replace(/_([a-z])/g, (_, c) => c.toUpperCase())) })), ...table.indexes.filter((index) => index.unique).map(({ name, expression }) => ({ name, expression }))]);
    replaceArray(state, object, 'indexes', table.indexes.filter((index) => !index.unique).map(({ name, expression }) => ({ name, expression })));
    report.push({ table: table.name, path: relative, changes, compositeRelations: table.foreignKeys.filter((fk) => fk.columns.length > 1).length, notValidConstraints: table.foreignKeys.filter((fk) => fk.notValid).map((fk) => fk.name) });
}

// CLI discovers *.entity.ts automatically. Nest's autoLoadEntities requires the
// exact nineteen classes in an already imported forFeature registration.
const registration = fileState('apps/poms-api/src/app/features/project-cost/project-cost.module.ts');
registration.imports.set('./rust-r4ghi-entities.entity', new Set(['RUST_R4_GHI_ENTITIES']));
let feature;
const findFeature = (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(registration.ast) === 'MikroOrmModule.forFeature' && ts.isArrayLiteralExpression(node.arguments[0])) feature = node.arguments[0];
    ts.forEachChild(node, findFeature);
};
findFeature(registration.ast);
if (!feature) throw new Error('Native forFeature registration was not found');
registration.edits.push({ start: feature.getStart(registration.ast) + 1, end: feature.getStart(registration.ast) + 1, text: '\n            ...RUST_R4_GHI_ENTITIES,' });

const manifest = [];
for (const state of files.values()) {
    for (const [module, requested] of state.imports) {
        let existing;
        for (const statement of state.ast.statements) {
            if (ts.isImportDeclaration(statement) && name(statement.moduleSpecifier) === module && !statement.importClause?.isTypeOnly && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) existing = statement;
        }
        if (existing) {
            const names = new Set(existing.importClause.namedBindings.elements.map((specifier) => specifier.name.text));
            const fresh = [...requested].filter((item) => !names.has(item));
            if (fresh.length) {
                const bindings = existing.importClause.namedBindings;
                state.edits.push({ start: bindings.end - 1, end: bindings.end - 1, text: `${bindings.elements.length ? ',' : ''} ${fresh.join(', ')} ` });
            }
        } else state.edits.push({ start: 0, end: 0, text: `import { ${[...requested].sort().join(', ')} } from '${module}';\n` });
    }
    state.edits.sort((a, b) => b.start - a.start || b.end - a.end);
    let text = state.source;
    for (const edit of state.edits) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    const output = path.join(proposed, state.relative); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, text);
    manifest.push({ path: state.relative, sourceSHA256: crypto.createHash('sha256').update(state.source).digest('hex'), proposedSHA256: crypto.createHash('sha256').update(text).digest('hex') });
}
fs.mkdirSync(path.dirname(path.join(proposed, targetNew)), { recursive: true });
fs.copyFileSync(path.join(own, 'rust-r4ghi-entities.entity.ts'), path.join(proposed, targetNew));
fs.writeFileSync(path.join(own, 'existing-mapping-plan.json'), JSON.stringify({ status: 'Root-proposal-not-applied', productReadRoot: root, tables: report, files: manifest, registration: registration.relative }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'Root-proposal-not-applied', existingTables: report.length, productFilesProposed: manifest.length + 1 }));
