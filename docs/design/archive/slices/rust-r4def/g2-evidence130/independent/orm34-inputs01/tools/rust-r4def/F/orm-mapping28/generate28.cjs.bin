const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = __dirname;
const ts = require(path.join(root, 'node_modules/typescript'));
const inventory = JSON.parse(fs.readFileSync(path.join(out, 'inventory28.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'tmp/rust-r4def/root/catalog25/native-catalog.json'), 'utf8'));
const namedConstraints = new Set(inventory.namedAlterConstraints.map(c => `${c.table}.${c.name}`));
const newTables = new Set(Object.keys(inventory.newTables));
const allTables = new Set([...newTables, ...Object.keys(inventory.alterations)]);
const schemas = new Map();
const files = new Map();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const slash = name => name.replaceAll('\\', '/');
const camel = name => name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const quote = text => JSON.stringify(text);
function write(relative, text) {
    const target = path.resolve(out, relative);
    if (!target.startsWith(path.resolve(out) + path.sep)) throw new Error('Candidate output escaped its allowed directory');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
}
function walk(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(folder, e.name)) : [path.join(folder, e.name)]);
}
function key(node) { return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined; }
function members(object) { return new Map(object.properties.filter(ts.isPropertyAssignment).map(p => [key(p.name), p])); }
function parse(file, text) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const found = [];
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(source) === 'defineEntity') {
            const object = node.initializer.arguments[0];
            if (!ts.isObjectLiteralExpression(object)) throw new Error('Unsupported entity definition');
            const attributes = members(object);
            const table = attributes.get('tableName')?.initializer;
            if (table && ts.isStringLiteral(table)) {
                const schemaName = node.name.getText(source);
                const classMatch = text.match(new RegExp('export class (\\w+) extends ' + schemaName + '\\.class'));
                if (!classMatch) throw new Error('Missing entity class: ' + schemaName);
                const propertyObject = attributes.get('properties').initializer;
                const properties = new Map();
                for (const p of propertyObject.properties.filter(ts.isPropertyAssignment)) {
                    const property = key(p.name);
                    const expression = p.initializer.getText(source);
                    const column = expression.match(/\.fieldName\(['"]([^'"]+)['"]\)/)?.[1] || property.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
                    properties.set(column, { node: p, property, expression });
                }
                found.push({ file, text, source, object, attributes, table: table.text, schemaName, className: classMatch[1], propertyObject, properties });
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return found;
}
for (const file of walk(path.join(root, 'apps/poms-api/src/app')).filter(f => f.endsWith('.entity.ts'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const schema of parse(file, text)) schemas.set(schema.table, schema);
}
const newLocations = {
    project_handover_basis_snapshot: ['project-handover', 'ProjectHandoverBasisSnapshot'],
    project_handover_contract_basis: ['project-handover', 'ProjectHandoverContractBasis'],
    project_handover_basis_item: ['project-handover', 'ProjectHandoverBasisItem'],
    project_handover_participant_role: ['project-handover', 'ProjectHandoverParticipantRole'],
    project_handover_summary_payload: ['project-handover', 'ProjectHandoverSummaryPayload'],
    cost_governance_evidence: ['project-cost', 'CostGovernanceEvidence'],
    shared_cost_allocation_source_snapshot: ['project-cost', 'SharedCostAllocationSourceSnapshot']
};
for (const [table, [folder, className]] of Object.entries(newLocations)) {
    const file = path.join(root, 'apps/poms-api/src/app/features', folder, table.replaceAll('_', '-') + '.entity.ts');
    if (fs.existsSync(file)) throw new Error('New target already exists: ' + file);
    schemas.set(table, { table, file, className, schemaName: className + 'Schema', properties: new Map(), text: '' });
}
function constraints(table) { return catalog.constraints.filter(c => c.table_name === table); }
function columns(table) { return catalog.columns.filter(c => c.table_name === table).sort((a, b) => a.ordinal_position - b.ordinal_position); }
function foreign(c) {
    const m = c.definition.match(/^FOREIGN KEY \(([^)]+)\) REFERENCES (?:poms\.)?(\w+)\(([^)]+)\)(.*)$/);
    if (!m) throw new Error('Unsupported catalog FK: ' + c.definition);
    return { constraint: c, local: m[1].split(',').map(s => s.trim()), target: m[2], referenced: m[3].split(',').map(s => s.trim()), suffix: m[4] };
}
const newColumns = new Set(inventory.columnChanges.filter(c => c.action === 'ADD COLUMN').map(c => c.table + '.' + c.column));
function chosenConstraint(table, c) {
    if (newTables.has(table) || namedConstraints.has(table + '.' + c.conname)) return true;
    return inventory.columnChanges.some(a => a.table === table && a.action === 'ADD COLUMN' && /CHECK\s*\(/.test(a.sql) && c.conname === `${table}_${a.column}_check`);
}
function primaryColumns(table) { return constraints(table).filter(c => c.contype === 'p').flatMap(c => c.definition.match(/\(([^)]+)\)/)[1].split(',').map(x => x.trim())); }
const referenceHint = {
    project_id: 'project', contract_id: 'contract', source_readiness_id: 'contract_readiness_package', readiness_package_id: 'contract_readiness_package',
    source_preparation_id: 'contract_term_preparation', preparation_id: 'contract_term_preparation', source_review_id: 'contract_review_binding',
    before_snapshot_id: 'contract_term_snapshot', after_snapshot_id: 'contract_term_snapshot', term_snapshot_id: 'contract_term_snapshot', currency_source_snapshot_id: 'contract_term_snapshot',
    contract_amendment_id: 'contract_amendment', source_amendment_id: 'contract_amendment', plan_version_id: 'receivable_plan_version',
    basis_snapshot_id: 'project_handover_basis_snapshot', basis_before_id: 'project_handover_basis_snapshot', basis_after_id: 'project_handover_basis_snapshot', source_basis_item_id: 'project_handover_basis_item',
    handover_id: 'project_handover', source_handover_id: 'project_handover', replacement_handover_id: 'project_handover',
    confirmation_record_id: 'confirmation_record', confirmation_participant_id: 'confirmation_participant'
};
const imports = new Map();
function relationTarget(schema, table) {
    const target = schemas.get(table);
    if (!target) throw new Error('No real Native target entity: ' + table);
    if (target.file !== schema.file) {
        const set = imports.get(schema.file) || new Map();
        set.set(target.className, target.file);
        imports.set(schema.file, set);
    }
    return target.className;
}
function comment(expression) {
    if (!expression) return '';
    const source = ts.createSourceFile('comment.ts', 'const value = ' + expression + ';', ts.ScriptTarget.Latest, true);
    let result = '';
    function visit(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'comment') result = '.comment(' + node.arguments.map(a => a.getText(source)).join(', ') + ')';
        ts.forEachChild(node, visit);
    }
    visit(source);
    return result;
}
function definition(schema, col, prior = '') {
    const table = schema.table;
    const fks = constraints(table).filter(c => c.contype === 'f').map(foreign);
    const single = fks.find(f => f.local.length === 1 && f.local[0] === col.column_name);
    const compound = fks.filter(f => f.local.length > 1 && f.local.includes(col.column_name));
    let expression, relation = false;
    if (single) {
        expression = `p.manyToOne(${relationTarget(schema, single.target)}).mapToPk()`;
        relation = true;
    } else if (col.udt_name === 'uuid' && compound.length && referenceHint[col.column_name]) {
        expression = `p.manyToOne(${relationTarget(schema, referenceHint[col.column_name])}).mapToPk()`;
        relation = true;
    } else {
        switch (col.udt_name) {
            case 'uuid': expression = 'p.uuid()'; break;
            case 'varchar': expression = `p.string().length(${col.character_maximum_length})`; break;
            case 'bpchar': expression = `p.string().columnType('char(${col.character_maximum_length})').length(${col.character_maximum_length})`; break;
            case 'text': expression = 'p.text()'; break;
            case 'int2': expression = "p.integer().columnType('smallint')"; break;
            case 'int4': expression = 'p.integer()'; break;
            case 'bool': expression = 'p.boolean()'; break;
            case 'numeric': expression = `p.string().columnType('numeric(${col.numeric_precision},${col.numeric_scale})').precision(${col.numeric_precision}).scale(${col.numeric_scale})`; break;
            case 'jsonb': expression = (col.column_name === 'source_references' ? "p.json<unknown[]>()" : "p.json<Record<string, unknown>>()") + ".columnType('jsonb')"; break;
            case 'date': expression = 'p.date()'; break;
            case 'timestamptz': expression = "p.datetime().columnType('timestamptz')"; break;
            default: throw new Error('Unmapped column type: ' + JSON.stringify(col));
        }
    }
    if (primaryColumns(table).includes(col.column_name)) expression += '.primary()';
    if (col.column_name === 'row_version') expression += '.version()';
    if (col.is_nullable === 'YES') expression += '.nullable()';
    const value = col.column_default;
    if (value != null) {
        if (/^-?\d+$/.test(value)) expression += `.default(${value})`;
        else if (value === 'true' || value === 'false') expression += `.default(${value})`;
        else if (/^'.*'::/.test(value)) expression += `.default(${quote(value.match(/^'(.*)'::/)[1].replaceAll("''", "'"))})`;
        else expression += `.defaultRaw(${quote(value)})`;
    }
    if (table === 'project_actual_cost_record' && col.column_name === 'labor_scope_key') {
        expression += `.generated(${quote("as (CASE WHEN cost_type = 'labor' THEN CASE WHEN labor_person_id IS NOT NULL THEN 'person:' || labor_person_id::text WHEN labor_role IS NOT NULL THEN 'role:' || labor_role END END) stored")})`;
    }
    expression += `.fieldName(${quote(col.column_name)})`;
    if (single) {
        expression += `.foreignKeyName(${quote(single.constraint.conname)}).updateRule('no action').deleteRule(${quote(single.suffix.match(/ON DELETE (RESTRICT|CASCADE|SET NULL|SET DEFAULT)/)?.[1].toLowerCase() || 'no action')})`;
        if (single.constraint.condeferrable) expression += `.deferMode('${single.constraint.condeferred ? 'deferred' : 'immediate'}')`;
    } else if (relation) expression += '.createForeignKeyConstraint(false)';
    expression += comment(prior);
    return relation ? `() => ${expression}` : expression;
}
const matrices = [], constraintMatrix = [], fileEdits = new Map();
function edit(file, start, end, text) {
    const list = fileEdits.get(file) || [];
    list.push({ start, end, text });
    fileEdits.set(file, list);
}
function sectionEntries(schema, section) {
    const node = schema.attributes?.get(section)?.initializer;
    const result = new Map();
    if (node && ts.isArrayLiteralExpression(node)) {
        for (const entry of node.elements) {
            if (!ts.isObjectLiteralExpression(entry)) continue;
            const name = members(entry).get('name')?.initializer;
            if (name && ts.isStringLiteral(name)) result.set(name.text, entry.getText(schema.source));
        }
    }
    return result;
}
function addSections(schema) {
    const sections = { checks: sectionEntries(schema, 'checks'), uniques: sectionEntries(schema, 'uniques'), indexes: sectionEntries(schema, 'indexes') };
    for (const c of constraints(schema.table)) {
        if (!chosenConstraint(schema.table, c)) continue;
        if (c.contype === 'c') sections.checks.set(c.conname, `{ name: ${quote(c.conname)}, expression: ${quote(c.definition.replace(/^CHECK\s*/, ''))} }`);
        if (c.contype === 'x') sections.indexes.set(c.conname, `{ name: ${quote(c.conname)}, expression: ${quote(`ALTER TABLE poms.${schema.table} ADD CONSTRAINT ${c.conname} ${c.definition}`)} }`);
        if (c.contype === 'u') {
            const cols = c.definition.match(/UNIQUE \(([^)]+)\)/)[1].split(',').map(s => s.trim());
            sections.uniques.set(c.conname, `{ name: ${quote(c.conname)}, properties: ${JSON.stringify(cols.map(col => schema.properties.get(col)?.property || camel(col)))} }`);
        }
    }
    for (const index of inventory.newIndexes.filter(i => i.table === schema.table)) {
        const actual = catalog.indexes.find(i => i.tablename === schema.table && i.indexname === index.name);
        if (!actual) throw new Error('Missing actual migrated index: ' + index.name);
        const section = index.unique ? 'uniques' : 'indexes';
        sections[section].set(index.name, `{ name: ${quote(index.name)}, expression: ${quote(actual.indexdef)} }`);
    }
    return sections;
}
for (const table of allTables) {
    const schema = schemas.get(table);
    if (!schema) throw new Error('Missing changed table mapping: ' + table);
    files.set(schema.file, schema.text);
    const additions = [];
    const changes = inventory.columnChanges.filter(c => c.table === table);
    const changedColumns = new Set(changes.map(c => c.column));
    if (newTables.has(table)) for (const col of columns(table)) changedColumns.add(col.column_name);
    for (const fk of constraints(table).filter(c => c.contype === 'f' && chosenConstraint(table, c)).map(foreign)) if (fk.local.length === 1) changedColumns.add(fk.local[0]);
    for (const column of changedColumns) {
        const col = columns(table).find(c => c.column_name === column);
        if (!col) throw new Error('SQL column missing from actual catalog: ' + table + '.' + column);
        const prior = schema.properties.get(column);
        let expression;
        if (prior && changes.some(c => c.column === column && /TYPE numeric/.test(c.sql))) {
            expression = prior.expression.replace(/\.precision\(\d+\)/, `.precision(${col.numeric_precision})`).replace(/\.scale\(\d+\)/, `.scale(${col.numeric_scale})`).replace(/numeric\(\d+,\d+\)/, `numeric(${col.numeric_precision},${col.numeric_scale})`);
        } else expression = definition(schema, col, prior?.expression);
        const property = prior?.property || camel(column);
        const text = `${property}: ${expression}`;
        if (prior) edit(schema.file, prior.node.getStart(schema.source), prior.node.end, text);
        else additions.push('        ' + text);
        matrices.push({ table, column, property, candidateFile: slash(path.relative(root, schema.file)), action: newTables.has(table) ? 'CREATE TABLE column' : changes.filter(c => c.column === column).map(c => c.action + ' ' + c.sql).join(' | ') || 'new single-column FK', catalog: col, expression });
    }
    const sections = addSections(schema);
    if (newTables.has(table)) {
        let text = "import { defineEntity } from '@mikro-orm/core';\n\nconst p = defineEntity.properties;\n\n";
        text += `export const ${schema.schemaName} = defineEntity({\n    name: ${quote(schema.className)},\n    tableName: ${quote(table)},\n    schema: 'poms',\n`;
        for (const [name, entries] of Object.entries(sections)) if (entries.size) text += `    ${name}: [\n        ${[...entries.values()].join(',\n        ')}\n    ],\n`;
        text += '    properties: {\n' + additions.join(',\n') + `\n    }\n});\n\nexport class ${schema.className} extends ${schema.schemaName}.class {}\n\n${schema.schemaName}.setClass(${schema.className});\n`;
        files.set(schema.file, text);
    } else {
        if (additions.length) {
            const last = [...schema.propertyObject.properties].at(-1);
            const comma = schema.text.slice(last.end, schema.propertyObject.end - 1).includes(',') ? '' : ',';
            edit(schema.file, last.end, last.end, comma + '\n' + additions.join(',\n'));
        }
        for (const [name, entries] of Object.entries(sections)) {
            const original = schema.attributes.get(name);
            if (!entries.size) continue;
            const value = '[\n        ' + [...entries.values()].join(',\n        ') + '\n    ]';
            if (original) edit(schema.file, original.initializer.getStart(schema.source), original.initializer.end, value);
            else edit(schema.file, schema.propertyObject.parent.getStart(schema.source), schema.propertyObject.parent.getStart(schema.source), `${name}: ${value},\n    `);
        }
    }
    for (const c of constraints(table)) {
        if (!chosenConstraint(table, c) && !(c.contype === 'f' && foreign(c).local.some(col => newColumns.has(table + '.' + col)))) continue;
        let handling = c.contype === 'c' ? 'Native checks' : c.contype === 'u' ? 'Native uniques' : c.contype === 'p' ? 'Native primary properties' : 'Native mapToPk single-column FK';
        if (c.contype === 'f' && foreign(c).local.length > 1) handling = 'SQL-only exact composite UNIQUE-scope FK; no weaker scalar FK';
        if (c.contype === 'x') handling = 'Native indexes.expression exact PostgreSQL EXCLUDE DDL; real schema diff still required';
        constraintMatrix.push({ ...c, handling, ...(c.contype === 'f' ? foreign(c) : {}) });
    }
}
const fileMatrix = [];
for (const [file, baseText] of files) {
    const relative = slash(path.relative(root, file));
    const originalExists = fs.existsSync(file);
    const originalBytes = originalExists ? fs.readFileSync(file) : null;
    let text = baseText;
    const changes = (fileEdits.get(file) || []).sort((a, b) => b.start - a.start);
    let boundary = Infinity;
    for (const change of changes) {
        if (change.end > boundary) throw new Error('Overlapping AST edits: ' + file);
        boundary = change.start;
        text = text.slice(0, change.start) + change.text + text.slice(change.end);
    }
    const importGroups = new Map();
    for (const [className, target] of imports.get(file) || []) {
        const currentImports = parse(file, baseText).length ? baseText : '';
        if (new RegExp('import\\s*{[^}]*\\b' + className + '\\b[^}]*}').test(currentImports)) continue;
        let module = slash(path.relative(path.dirname(file), target)).replace(/\.ts$/, '');
        if (!module.startsWith('.')) module = './' + module;
        const names = importGroups.get(module) || [];
        names.push(className);
        importGroups.set(module, names);
    }
    const importLines = [];
    for (const [module, names] of importGroups) {
        const escaped = module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = new RegExp('import\\s*\\{([^}]+)\\}\\s*from\\s*([\'"])' + escaped + '\\2\\s*;');
        if (existing.test(text)) text = text.replace(existing, (_whole, originalNames, delimiter) => `import { ${[...new Set([...originalNames.split(',').map(n => n.trim()).filter(Boolean), ...names])].join(', ')} } from ${delimiter}${module}${delimiter};`);
        else importLines.push(`import { ${names.sort().join(', ')} } from ${quote(module)};`);
    }
    if (importLines.length) text = importLines.join('\n') + '\n' + text;
    text = text.replaceAll('\r\n', '\n');
    write('files/' + relative, text);
    if (originalBytes) write('originals/' + relative + '.bin', originalBytes);
    fileMatrix.push({ target: relative, candidate: 'files/' + relative, sourceBeforeSha256: originalBytes ? sha(originalBytes) : null, sourceBeforeBytes: originalBytes?.length || 0, candidateSha256: sha(Buffer.from(text)), candidateBytes: Buffer.byteLength(text), action: originalExists ? 'modify' : 'create' });
}
write('field-matrix28.json', JSON.stringify({ columnActions: inventory.columnChanges, mappings: matrices }, null, 2) + '\n');
write('constraint-matrix28.json', JSON.stringify({ constraints: constraintMatrix, indexes: inventory.newIndexes.map(i => ({ ...i, catalog: catalog.indexes.find(a => a.tablename === i.table && a.indexname === i.name) })) }, null, 2) + '\n');
write('candidate-manifest28.json', JSON.stringify({ kind: 'R4DEF-Native-ORM-candidate-only', rootCheckoutReadOnly: root, inputs: inventory.inputs, newTables: [...newTables], alteredTables: Object.keys(inventory.alterations), files: fileMatrix, runtimeAcceptance: 'not-run', migrationCheck: 'not-run-Root-owned', rootActualFilesWritten: false, credentialsRead: false }, null, 2) + '\n');
console.log(JSON.stringify({ candidateFiles: fileMatrix.length, newTables: newTables.size, fieldMappings: matrices.length, constraintMappings: constraintMatrix.length, sqlOnlyConstraints: constraintMatrix.filter(c => c.handling.startsWith('SQL-only')).length, files: fileMatrix.map(f => f.target) }));
