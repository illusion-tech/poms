// Actual MikroORM7 metadata discovery with real referenced checkout entities.
// connect:false + ensureDatabase:false; no SQL/migration/schema command runs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const installed = createRequire('E:/projects/poms/package.json');
const ts = installed('typescript');
const core = installed('@mikro-orm/core');
const { MikroORM } = installed('@mikro-orm/postgresql');
const root = path.resolve(__dirname, '../../../../../..');
const overlay=process.argv.includes('--overlay');
const proposedRoot=path.join(__dirname,'proposed');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'sql-target-catalog.json'), 'utf8'));
const virtual = path.join(root, catalog.targetFile);
const candidate = overlay?virtual:path.join(__dirname, 'rust-r4ghi-entities.entity.ts');
const modules = new Map();
function sourcePath(file){const relative=path.relative(root,file);const alternative=path.join(proposedRoot,relative);return overlay&&!relative.startsWith('..')&&fs.existsSync(alternative)?alternative:file;}

function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const source = fs.readFileSync(sourcePath(file), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, experimentalDecorators: true } }).outputText;
    const requireForFile = (name) => {
        if (name === '@poms/shared-contracts') return load(path.join(root, 'libs/shared/contracts/src/index.ts'));
        if (name.startsWith('.')) {
            const base = path.resolve(path.dirname(file === candidate ? virtual : file), name);
            for (const proposed of [base, `${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(sourcePath(proposed)) && fs.statSync(sourcePath(proposed)).isFile()) return load(proposed);
            throw new Error(`Unresolved real entity import: ${name} from ${file}`);
        }
        return installed(name);
    };
    const wrapper = vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file });
    wrapper(requireForFile, module, module.exports);
    return module.exports;
}

async function main() {
    load(candidate);
    if(overlay)for(const file of JSON.parse(fs.readFileSync(path.join(__dirname,'existing-mapping-plan.json'),'utf8')).files.filter((file)=>file.path.endsWith('.entity.ts')))load(path.join(root,file.path));
    const schemas = [...new Set([...modules.values()].flatMap((module) => Object.values(module.exports)).filter((value) => value instanceof core.EntitySchema))];
    const orm = await MikroORM.init({ entities: schemas, dbName: 'H_metadata_only_no_database', connect: false, ensureDatabase: false, metadataCache:{enabled:false}, schema: 'poms', discovery: { checkDuplicateTableNames: true, checkDuplicateFieldNames: true }, debug: false });
    try {
        const metadata = [...orm.getMetadata().getAll().values()];
        let columns = 0; let foreignKeys = 0;
        for (const table of Object.values(catalog.tables).filter((table) => table.new||overlay)) {
            const meta = metadata.find((meta) => meta.tableName === table.name);
            assert.ok(meta, `${table.name} must be discovered`);
            const primary = meta.primaryKeys.flatMap((key) => meta.properties[key].fieldNames);
            if(table.new)assert.deepEqual(primary, table.primaryKey, `${table.name} exact PK; scope columns must not be added`);
            for (const [name, column] of Object.entries(table.columns)) {
                const property = meta.properties[column.property];
                assert.ok(property, `${table.name}.${name} physical property`);
                assert.deepEqual(property.fieldNames, [name]);
                if('nullable'in column)assert.equal(!!property.nullable, column.nullable, `${table.name}.${name} nullability`);
                if (column.sqlType?.startsWith('numeric')) {
                    const [precision, scale] = column.sqlType.match(/\d+/g).map(Number);
                    assert.equal(property.precision, precision); assert.equal(property.scale, scale);
                }
                columns += 1;
            }
            for (const fk of table.foreignKeys) {
                const property = meta.props.find((property) => property.foreignKeyName === fk.name);
                assert.ok(property, `${table.name} relation ${fk.name}`);
                assert.deepEqual(property.fieldNames, fk.columns);
                assert.deepEqual(property.referencedColumnNames, fk.targetColumns);
                assert.equal(property.targetMeta.tableName, fk.targetTable);
                assert.equal(property.deleteRule, fk.deleteRule); assert.equal(property.updateRule, fk.updateRule);
                assert.equal(property.deferMode === 'deferred', fk.deferred);
                foreignKeys += 1;
            }
        }
        console.log(JSON.stringify({ status: 'passed-real-metadata-only-no-DB-no-DDL', newTables: 19, columns, foreignKeys, actualReferenceClosureTables: metadata.length,overlayExistingMappings:overlay }));
    } finally { await orm.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
