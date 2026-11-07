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
const overlay = process.argv.includes('--overlay-pk-order');
const periodOverlay = process.argv.includes('--overlay-period-no-action');
if (overlay && periodOverlay) throw new Error('Only one explicit candidate overlay per proof');
const overlayPaths = new Set([
    'apps/poms-api/src/app/features/project/project.entity.ts',
    'apps/poms-api/src/app/features/project-cost/project-operating-snapshot.entity.ts'
]);
const periodPath = 'apps/poms-api/src/app/features/project-cost/operating-restatement-record.entity.ts';
function consumedPath(file, relative) {
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
    const orm = await MikroORM.init({
        entities: schemas, dbName: 'independent_offline_no_database', connect: false, ensureDatabase: false,
        metadataCache: { enabled: false }, schema: 'poms', debug: false,
        discovery: { checkDuplicateTableNames: true, checkDuplicateFieldNames: true }
    });
    try {
        // Metadata -> target schema only; no connection/introspection call.
        const schema = orm.schema.getTargetSchema();
        const metadata = [...orm.getMetadata().getAll().values()];
        const relevant = metadata.filter((m) => ['project', 'project_operating_snapshot', 'attachment_upload_session', 'operating_restatement_record'].includes(m.tableName));
        const output = {
            kind: 'actual-MikroORM7-offline-target-metadata-no-DB-no-DDL',
            connected: false, tableCount: schema.getTables().length,
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
        const outputFile = periodOverlay ? 'offline-metadata19-period-no-action.json' : overlay ? 'offline-metadata18-pk-order.json' : 'offline-metadata18.json';
        fs.writeFileSync(path.join(__dirname, outputFile), JSON.stringify(output, null, 2) + '\n');
        console.log(JSON.stringify({ kind: output.kind, tableCount: output.tableCount, sourceCount: output.sourceInputs.length, sourceStable: true, connected: false }));
    } finally { await orm.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
