// Independent metadata-only probe. Never connects or invokes SQL/schema updates.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..');
const installed = createRequire(path.join(root, 'package.json'));
const ts = installed('typescript');
const core = installed('@mikro-orm/core');
const { MikroORM } = installed('@mikro-orm/postgresql');
const catalogPath = path.join(root, 'tools/rust-r4ghi/H/implementation/support-patches/orm-g2/sql-target-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath));
const modules = new Map();
const inputs = new Map();
const overlay = false;
const useGenerator = process.argv.includes('--platform-driver');
const periodOverlay = false;
if (overlay && periodOverlay) throw new Error('Only one explicit candidate overlay per proof');
const overlayPaths = new Set([
    'apps/poms-api/src/app/features/project/project.entity.ts',
    'apps/poms-api/src/app/features/project-cost/project-operating-snapshot.entity.ts'
]);
const periodPath = 'apps/poms-api/src/app/features/project-cost/operating-restatement-record.entity.ts';
function consumedPath(file, relative) {
    if (relative === 'apps/poms-api/src/app/core/persistence/poms-postgresql-driver.ts') return path.join(__dirname, 'cli-generator-driver-candidate24', relative);
    if (overlay && overlayPaths.has(relative)) return path.join(__dirname, 'pk-default-candidates', relative);
    if (periodOverlay && relative === periodPath) return path.join(__dirname, 'period-no-action-candidate', relative);
    return file;
}
function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const consumed = consumedPath(file, relative);
    const bytes = fs.readFileSync(consumed);
    inputs.set(file, { file: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    const code = ts.transpileModule(bytes.toString('utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, experimentalDecorators: true }
    }).outputText;
    const requireForFile = (name) => {
        if (name === '@poms/shared-contracts') return load(path.join(root, 'libs/shared/contracts/src/index.ts'));
        if (name.startsWith('.')) {
            const base = path.resolve(path.dirname(file), name);
            for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return load(candidate);
            }
            throw new Error(`Unresolved source import: ${name} from ${file}`);
        }
        return installed(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(requireForFile, module, module.exports);
    return module.exports;
}
async function main() {
    for (const file of new Set([...Object.values(catalog.entityFiles), catalog.targetFile])) load(path.join(root, file));
    const schemas = [...new Set([...modules.values()].flatMap((module) => Object.values(module.exports)).filter((value) => value instanceof core.EntitySchema))];
    const generatorPath = path.join(root, 'apps/poms-api/src/app/core/persistence/poms-schema-generator.ts');
    const Generator = load(generatorPath).PomsSchemaGenerator;
    const Driver = load(path.join(root, 'apps/poms-api/src/app/core/persistence/poms-postgresql-driver.ts')).PomsPostgreSqlDriver;
    const cliOptions = {};
    await core.loadOptionalDependencies(cliOptions);
    const declared = {
        driver: useGenerator ? Driver : installed('@mikro-orm/postgresql').PostgreSqlDriver,
        extensions: [Generator],
        entities: schemas, dbName: 'independent_offline_no_database', connect: false, ensureDatabase: false,
        metadataCache: { enabled: false }, schema: 'poms', debug: false,
        discovery: { checkDuplicateTableNames: true, checkDuplicateFieldNames: true },
        migrations: { snapshot: false, safe: true }
    };
    // Exact CLIHelper.getConfiguration merge: autoloaded options replace config extensions.
    const cliMerged = core.Utils.mergeConfig({}, declared, {}, cliOptions);
    if (cliMerged.extensions.includes(Generator)) throw new Error('CLI negative control did not drop config extension');
    const orm = await MikroORM.init(cliMerged);
    try {
        // Metadata -> target schema only; no connection/introspection call.
        const schema = orm.schema.getTargetSchema();
        if (useGenerator && !(orm.schema instanceof Generator)) throw new Error('Supported extension registration was not used');
        const expected = new Generator(orm.em).getTargetSchema();
        const migrator = orm.migrator;
        // In-memory from-schema seam only; no storage/init/DB/migration write runs.
        migrator.getSchemaFromSnapshot = async () => expected;
        let targetCalls = 0;
        const originalTarget = orm.schema.getTargetSchema.bind(orm.schema);
        orm.schema.getTargetSchema = (...args) => { targetCalls += 1; return originalTarget(...args); };
        const checkHasChanges = await migrator.checkSchema();
        const callsAfterCheck = targetCalls;
        const createDiff = await migrator.getSchemaDiff(false, false);
        const callsAfterCreate = targetCalls;
        const initialCreateDiff = await migrator.getSchemaDiff(false, true);
        if (useGenerator && (checkHasChanges || createDiff.up.length !== 0)) throw new Error('Platform generator did not reach both migration paths');
        if (!useGenerator && (!checkHasChanges || !createDiff.up.some((sql) => sql.includes('drop default')))) throw new Error('CLI failure negative control disappeared');
        if (!(callsAfterCheck > 0 && callsAfterCreate > callsAfterCheck && targetCalls > callsAfterCreate)) throw new Error('Migrator did not reuse registered generator');
        const metadata = [...orm.getMetadata().getAll().values()];
        const relevant = metadata.filter((m) => ['project', 'project_operating_snapshot', 'attachment_upload_session', 'operating_restatement_record'].includes(m.tableName));
        const output = {
            kind: 'actual-MikroORM7-offline-target-metadata-no-DB-no-DDL',
            connected: false, tableCount: schema.getTables().length,
            actualDriver: orm.em.getDriver().constructor.name,
            actualGenerator: orm.schema.constructor.name,
            cliMergedExtensions: cliMerged.extensions.map((extension) => extension.name),
            configuredGeneratorRemovedByCLI: true,
            migrationPaths: { inMemoryFromSchemaOnly: true, checkHasChanges, createDiff, initialCreateSQL: initialCreateDiff.up, callsAfterCheck, callsAfterCreate, finalTargetCalls: targetCalls, migrationFilesWritten: false },
            sourceInputs: [...inputs.values()],
            targetSchema: schema.toJSON(),
            overlappingProperties: relevant.map((m) => ({ table: m.tableName, properties: m.props.filter((p) => p.fieldNames.some((f) => ['id', 'period_end_snapshot_id', 'project_scope_context_version', 'completion_record_id', 'completion_condition_id'].includes(f))).map((p) => ({ name: p.name, kind: p.kind, fieldNames: p.fieldNames, defaultRaw: p.defaultRaw ?? null, nullable: p.nullable ?? null, ownColumns: p.ownColumns ?? null, createForeignKeyConstraint: p.createForeignKeyConstraint ?? null, foreignKeyName: p.foreignKeyName ?? null })) }))
        };
        for (const x of inputs.values()) {
            const consumed = consumedPath(path.join(root, x.file), x.file);
            const actual = crypto.createHash('sha256').update(fs.readFileSync(consumed)).digest('hex');
            if (actual !== x.sha256) throw new Error(`Source changed during offline metadata discovery: ${x.file}`);
        }
        output.overlayTwoPKOrderCandidates = overlay;
        output.overlayExplicitPeriodFKRules = periodOverlay;
        output.supportedSchemaGeneratorExtensionActive = useGenerator;
        const outputFile = useGenerator ? 'cli-generator-candidate24.json' : 'cli-generator-base24.json';
        fs.writeFileSync(path.join(__dirname, outputFile), JSON.stringify(output, null, 2) + '\n');
        console.log(JSON.stringify({ kind: output.kind, tableCount: output.tableCount, sourceCount: output.sourceInputs.length, sourceStable: true, connected: false }));
    } finally { await orm.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
