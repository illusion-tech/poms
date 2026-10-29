// Mechanical original-TypeScript loader. Installation/evaluation is explicit;
// compilePlan() only reads/transpiles source and never loads service/ORM code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');

const entryFiles = [
    'apps/poms-api/src/app/features/approval/approval-record.entity.ts',
    'apps/poms-api/src/app/features/approval/todo-item.entity.ts',
    'apps/poms-api/src/app/features/approval/confirmation-record.entity.ts',
    'apps/poms-api/src/app/features/approval-summary/approval-summary.entity.ts',
    'apps/poms-api/src/app/features/approval/approval.service.ts',
    'apps/poms-api/src/app/features/approval/confirmation.service.ts',
    'apps/poms-api/src/app/features/approval-summary/approval-summary.repository.ts',
    'apps/poms-api/src/app/features/approval-summary/approval-summary.service.ts'
];
const projectionExports = '\nexport const __l1ProbeMappings = { mapApprovalRecordToSummary, mapTodoItemToSummary, mapNodeName, mapPayoutTitle, mapAdjustmentTitle, mapPayoutStageName, mapAdjustmentTypeName, mapSalesFollowUpReminderNodeName, formatChinaDateTime };\n';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

function createNativeLoader({ root = path.resolve(__dirname, '../..') } = {}) {
    root = fs.realpathSync(root);
    const configured = ts.readConfigFile(path.join(root, 'tsconfig.base.json'), ts.sys.readFile);
    if (configured.error) throw new Error('Original tsconfig cannot be read');
    const converted = ts.convertCompilerOptionsFromJson(configured.config.compilerOptions, root);
    if (converted.errors.length) throw new Error('Original tsconfig aliases cannot be parsed');
    const options = {
        ...converted.options,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        importHelpers: false
    };
    const loaded = new Map();
    let installed = false;
    let oldExtension, oldResolve, extension, resolver;
    function compile(file) {
        const bytes = fs.readFileSync(file);
        const text = bytes.toString('utf8');
        const relative = path.relative(root, file).split(path.sep).join('/');
        const appended = relative === 'apps/poms-api/src/app/features/approval/approval.service.ts' ? projectionExports : '';
        const result = ts.transpileModule(text + appended, { compilerOptions: options, fileName: file, reportDiagnostics: true });
        if (result.diagnostics?.some((item) => item.category === ts.DiagnosticCategory.Error)) {
            throw new Error(`Original TypeScript transpile failed: ${relative}`);
        }
        return {
            code: result.outputText,
            record: {
                file: relative,
                rawBytesSha256: sha(bytes),
                lfSha256: sha(text.replaceAll('\r\n', '\n')),
                compiledSha256: sha(result.outputText),
                appendedExportShimSha256: appended ? sha(appended) : null
            }
        };
    }
    function install() {
        if (installed) return;
        installed = true;
        oldExtension = require.extensions['.ts'];
        oldResolve = Module._resolveFilename;
        extension = (mod, file) => {
            const { code, record } = compile(file);
            loaded.set(record.file, record);
            mod._compile(code, file);
        };
        resolver = function (request, parent, ...rest) {
            if (request.startsWith('@poms/')) {
                const resolution = ts.resolveModuleName(request, parent?.filename ?? path.join(root, 'index.ts'), options, ts.sys).resolvedModule;
                if (!resolution) throw new Error(`Original tsconfig alias is unresolved: ${request}`);
                const file = path.resolve(resolution.resolvedFileName);
                const relative = path.relative(root, file);
                if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Alias escapes the original checkout');
                return oldResolve.call(this, file, parent, ...rest);
            }
            return oldResolve.call(this, request, parent, ...rest);
        };
        require.extensions['.ts'] = extension;
        Module._resolveFilename = resolver;
    }
    function load() {
        install();
        const original = (file) => require(path.join(root, file));
        const approvalEntity = original(entryFiles[0]);
        const todoEntity = original(entryFiles[1]);
        const confirmationEntity = original(entryFiles[2]);
        const summaryEntity = original(entryFiles[3]);
        const approvalService = original(entryFiles[4]);
        const confirmationService = original(entryFiles[5]);
        const repositories = original(entryFiles[6]);
        const summaryService = original(entryFiles[7]);
        if (!approvalService.__l1ProbeMappings) throw new Error('Original approval module was cached without the mechanical export shim; use a fresh probe process');
        return {
            ...approvalEntity, ...todoEntity, ...confirmationEntity, ...summaryEntity,
            ...approvalService, ...confirmationService, ...repositories, ...summaryService,
            Contract: original('apps/poms-api/src/app/features/contract/contract.entity.ts').Contract,
            CommissionPayout: original('apps/poms-api/src/app/features/commission/commission-payout.entity.ts').CommissionPayout,
            CommissionAdjustment: original('apps/poms-api/src/app/features/commission/commission-adjustment.entity.ts').CommissionAdjustment,
            Project: original('apps/poms-api/src/app/features/project/project.entity.ts').Project,
            Lead: original('apps/poms-api/src/app/features/lead/lead.entity.ts').Lead,
            Customer: original('apps/poms-api/src/app/features/customer/customer.entity.ts').Customer
        };
    }
    function restore() {
        const extensionUnchanged = !installed || require.extensions['.ts'] === extension;
        const resolverUnchanged = !installed || Module._resolveFilename === resolver;
        if (installed && extensionUnchanged) {
            if (oldExtension) require.extensions['.ts'] = oldExtension;
            else delete require.extensions['.ts'];
        }
        if (installed && resolverUnchanged) Module._resolveFilename = oldResolve;
        installed = false;
        return { extensionUnchanged, resolverUnchanged };
    }
    return {
        root, load, restore,
        compilePlan: () => entryFiles.map((file) => compile(path.join(root, file)).record),
        report: () => ({
            typescript: ts.version,
            tsconfigRawSha256: sha(fs.readFileSync(path.join(root, 'tsconfig.base.json'))),
            sharedContractsAlias: configured.config.compilerOptions.paths['@poms/shared-contracts'],
            loaded: [...loaded.values()].sort((left, right) => left.file.localeCompare(right.file))
        })
    };
}

module.exports = { createNativeLoader, entryFiles };
