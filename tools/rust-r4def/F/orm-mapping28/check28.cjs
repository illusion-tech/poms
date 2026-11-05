const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const ts = require(path.join(root, 'node_modules/typescript'));
const out = __dirname;
const runId = process.argv[2] || 'static-checks28-02';
if (!/^[a-z0-9-]+$/.test(runId)) throw new Error('Invalid check run ID');
const receiptPath = path.join(out, runId + '.json');
if (fs.existsSync(receiptPath)) throw new Error('Preserve the previous check receipt; choose a new run ID');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'candidate-manifest28.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(out, 'inventory28.json'), 'utf8'));
const delivery25 = JSON.parse(fs.readFileSync(path.join(out, '../delivery25.json'), 'utf8'));
const fRoot = path.resolve(out, '../../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalize = name => path.resolve(name).toLowerCase();
const manifestRawSha256 = sha(fs.readFileSync(path.join(out, 'candidate-manifest28.json')));
const candidateInputsBefore = manifest.files.map(f => ({ file: f.target, rawBytesSha256: sha(fs.readFileSync(path.join(out, f.candidate))) }));
const overlays = new Map(manifest.files.map(f => [normalize(path.join(root, f.target)), fs.readFileSync(path.join(out, f.candidate), 'utf8')]));
const syntax = [];
const schemas = new Map();
const metadata = new Map();
for (const [file, text] of overlays) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    syntax.push(...source.parseDiagnostics);
    function key(node) { return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined; }
    function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'defineEntity' && ts.isObjectLiteralExpression(node.arguments[0])) {
            const attrs = new Map(node.arguments[0].properties.filter(ts.isPropertyAssignment).map(p => [key(p.name), p]));
            const table = attrs.get('tableName')?.initializer.text;
            const properties = attrs.get('properties')?.initializer;
            if (table && properties && ts.isObjectLiteralExpression(properties)) {
                const columns = new Map();
                for (const prop of properties.properties.filter(ts.isPropertyAssignment)) {
                    const name = key(prop.name);
                    const expression = prop.initializer.getText(source);
                    const column = expression.match(/\.fieldName\(['"]([^'"]+)['"]\)/)?.[1] || name.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
                    columns.set(column, expression);
                }
                schemas.set(table, columns);
                const sections = new Map();
                for (const section of ['checks', 'uniques', 'indexes']) {
                    const values = new Map();
                    const array = attrs.get(section)?.initializer;
                    if (array && ts.isArrayLiteralExpression(array)) for (const element of array.elements) {
                        if (!ts.isObjectLiteralExpression(element)) continue;
                        const entries = new Map(element.properties.filter(ts.isPropertyAssignment).map(p => [key(p.name), p.initializer]));
                        const name = entries.get('name');
                        if (name && ts.isStringLiteral(name)) values.set(name.text, entries);
                    }
                    sections.set(section, values);
                }
                metadata.set(table, sections);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const mismatches = [];
for (const col of inventory.catalog.columns) {
    if (!schemas.get(col.table_name)?.has(col.column_name)) mismatches.push(`Unmapped catalog column: ${col.table_name}.${col.column_name}`);
}
const fieldMatrix = JSON.parse(fs.readFileSync(path.join(out, 'field-matrix28.json'), 'utf8'));
for (const action of inventory.columnChanges) {
    if (!fieldMatrix.mappings.some(m => m.table === action.table && m.column === action.column)) mismatches.push(`Unmapped DDL action: ${action.sql}`);
}
for (const mapped of fieldMatrix.mappings) {
    const expression = schemas.get(mapped.table)?.get(mapped.column) || '';
    if (expression.includes('.nullable()') !== (mapped.catalog.is_nullable === 'YES')) mismatches.push(`Nullability mismatch: ${mapped.table}.${mapped.column}`);
    if (mapped.catalog.udt_name === 'numeric' && (!expression.includes(`.precision(${mapped.catalog.numeric_precision})`) || !expression.includes(`.scale(${mapped.catalog.numeric_scale})`))) mismatches.push(`Numeric type mismatch: ${mapped.table}.${mapped.column}`);
}
for (const index of inventory.newIndexes) {
    const expected = inventory.catalog.indexes.find(c => c.tablename === index.table && c.indexname === index.name)?.indexdef;
    const expression = metadata.get(index.table)?.get(index.unique ? 'uniques' : 'indexes')?.get(index.name)?.get('expression');
    if (!expression || !ts.isStringLiteral(expression) || expression.text !== expected) mismatches.push(`Changed index predicate mismatch: ${index.table}.${index.name}`);
}
const constraints = JSON.parse(fs.readFileSync(path.join(out, 'constraint-matrix28.json'), 'utf8')).constraints;
for (const c of constraints) {
    if (c.contype === 'c') {
        const expression = metadata.get(c.table_name)?.get('checks')?.get(c.conname)?.get('expression');
        if (!expression || !ts.isStringLiteral(expression) || expression.text !== c.definition.replace(/^CHECK\s*/, '')) mismatches.push(`CHECK mismatch: ${c.table_name}.${c.conname}`);
    }
    if (c.contype === 'u' && !metadata.get(c.table_name)?.get('uniques')?.has(c.conname)) mismatches.push(`Unique constraint missing: ${c.table_name}.${c.conname}`);
    if (c.contype === 'x') {
        const expression = metadata.get(c.table_name)?.get('indexes')?.get(c.conname)?.get('expression');
        if (!expression || !ts.isStringLiteral(expression) || expression.text !== `ALTER TABLE poms.${c.table_name} ADD CONSTRAINT ${c.conname} ${c.definition}`) mismatches.push(`Exclusion DDL mismatch: ${c.table_name}.${c.conname}`);
    }
}
const generated = schemas.get('project_actual_cost_record')?.get('labor_scope_key') || '';
if (!/\.generated\(["']as \(/.test(generated) || !/stored["']\)/.test(generated)) mismatches.push('labor_scope_key generated AS (...) STORED is not mapped');
for (const [table, column, precision, scale] of [
    ['project_actual_cost_record', 'internal_cost_rate', 15, 4],
    ['project_actual_cost_record', 'actual_hours', 10, 2],
    ['project_actual_cost_record', 'actual_person_days', 10, 2],
    ['internal_cost_rate_version', 'rate_value', 15, 4]
]) {
    const expression = schemas.get(table)?.get(column) || '';
    if (!expression.includes(`.precision(${precision})`) || !expression.includes(`.scale(${scale})`)) mismatches.push(`Protected precision drift: ${table}.${column}`);
}
for (const file of manifest.files) {
    const actual = path.join(root, file.target);
    if (file.sourceBeforeSha256 && sha(fs.readFileSync(actual)) !== file.sourceBeforeSha256) mismatches.push(`Root input changed: ${file.target}`);
    if (!file.sourceBeforeSha256 && fs.existsSync(actual)) mismatches.push(`Root new target already exists: ${file.target}`);
    if (sha(fs.readFileSync(path.join(out, file.candidate))) !== file.candidateSha256) mismatches.push(`Candidate changed: ${file.target}`);
}
for (const item of delivery25.productFiles) {
    if (sha(fs.readFileSync(path.join(fRoot, item.file))) !== item.rawBytesSha256) mismatches.push(`F25 frozen source changed: ${item.file}`);
}
const configPath = path.join(root, 'apps/poms-api/tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const options = { ...parsed.options, configFilePath: configPath, noEmit: true, incremental: false, composite: false };
const host = ts.createCompilerHost(options);
host.getCurrentDirectory = () => root;
const originalGetSource = host.getSourceFile.bind(host);
const originalRead = host.readFile.bind(host);
const originalExists = host.fileExists.bind(host);
host.readFile = file => overlays.get(normalize(file)) ?? originalRead(file);
host.fileExists = file => overlays.has(normalize(file)) || originalExists(file);
host.getSourceFile = (file, version, onError, shouldCreateNewSourceFile) => overlays.has(normalize(file))
    ? ts.createSourceFile(file, overlays.get(normalize(file)), version, true, ts.ScriptKind.TS)
    : originalGetSource(file, version, onError, shouldCreateNewSourceFile);
const program = ts.createProgram(manifest.files.map(f => path.join(root, f.target)), options, host);
const diagnostics = [...parsed.errors, ...syntax, ...ts.getPreEmitDiagnostics(program)];
const candidateInputsAfter = manifest.files.map(f => ({ file: f.target, rawBytesSha256: sha(fs.readFileSync(path.join(out, f.candidate))) }));
if (JSON.stringify(candidateInputsBefore) !== JSON.stringify(candidateInputsAfter)) mismatches.push('Candidate inputs changed during check');
const applicationInputs = program.getSourceFiles()
    .filter(s => normalize(s.fileName).startsWith(normalize(root) + path.sep) && !normalize(s.fileName).includes(path.sep + 'node_modules' + path.sep) && !overlays.has(normalize(s.fileName)))
    .map(s => {
        const compiledTextSha256 = sha(Buffer.from(s.text));
        const currentText = ts.sys.readFile(s.fileName);
        const currentTextSha256 = currentText == null ? null : sha(Buffer.from(currentText));
        if (compiledTextSha256 !== currentTextSha256) mismatches.push('Root transitive source changed during check: ' + s.fileName);
        return { file: s.fileName, compiledTextSha256, currentTextSha256 };
    });
const result = {
    kind: 'R4DEF-ORM-candidate-offline-static-checks',
    capturedAt: new Date().toISOString(),
    typescriptVersion: ts.version,
    method: 'TypeScript CompilerHost in-memory source overlay at Root paths; no Root files or environment loaded/written',
    candidateManifestRawSha256: manifestRawSha256,
    candidateInputsBefore, candidateInputsAfter, applicationInputs,
    candidateFiles: manifest.files.length,
    catalogTablesCovered: new Set(inventory.catalog.columns.map(c => c.table_name)).size,
    catalogColumnsCovered: inventory.catalog.columns.length,
    ddlColumnActionsCovered: inventory.columnChanges.length,
    changedOrNewColumnMappingsChecked: fieldMatrix.mappings.length,
    constraintMappingsChecked: constraints.length,
    indexPredicatesChecked: inventory.newIndexes.length,
    staticMismatches: mismatches,
    diagnosticCount: diagnostics.length,
    diagnostics: diagnostics.map(d => ({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n'), file: d.file?.fileName, ...(d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : {}) })),
    rootFilesUnchanged: !mismatches.some(m => m.startsWith('Root')),
    frozenF25Unchanged: !mismatches.some(m => m.startsWith('F25')),
    databaseAccessed: false, migrationCheck: 'not-run-Root-owned', environmentOrCredentialsLoaded: false
};
fs.writeFileSync(receiptPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, candidateInputsBefore: candidateInputsBefore.length, candidateInputsAfter: candidateInputsAfter.length, applicationInputs: applicationInputs.length, diagnostics: result.diagnostics.slice(0, 12) }, null, 2));
process.exitCode = diagnostics.length || mismatches.length ? 1 : 0;
