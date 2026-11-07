const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const installed = createRequire(path.join(root, 'package.json'));
const ts = installed('typescript');
const { ESLint } = installed('eslint');
const relative = 'apps/poms-api/src/app/core/persistence/poms-schema-generator.ts';
const logical = path.join(root, relative);
const candidate = path.join(__dirname, relative);
const before = fs.readFileSync(logical, 'utf8');
const after = fs.readFileSync(candidate, 'utf8');
const configPath = path.join(root, 'apps/poms-api/tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const options = { ...parsed.options, noEmit: true };
function check(useCandidate) {
    const host = ts.createCompilerHost(options);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (file, version, ...args) => useCandidate && path.resolve(file) === logical
        ? ts.createSourceFile(file, after, version, true)
        : original(file, version, ...args);
    // Single entry matches ts-node default files=false, not app include globs.
    const program = ts.createProgram([logical], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    return {
        diagnostics: diagnostics.map((d) => ({ code: d.code, text: ts.flattenDiagnosticMessageText(d.messageText, '\n') })),
        bridgeLoaded: program.getSourceFiles().some((f) => path.resolve(f.fileName) === path.join(root, 'apps/poms-api/src/types/mikro-orm-schema.d.ts'))
    };
}
async function main() {
    const baseline = check(false);
    const candidateResult = check(true);
    assert.equal(baseline.diagnostics.length, 6);
    assert.equal(baseline.bridgeLoaded, false);
    assert.deepEqual(candidateResult.diagnostics, []);
    assert.equal(candidateResult.bridgeLoaded, true);
    const transpile = (text) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true } }).outputText;
    assert.equal(transpile(before), transpile(after));
    const lint = await new ESLint({ cwd: root }).lintText(after, { filePath: logical });
    assert.ok(lint.every((r) => r.errorCount === 0 && r.warningCount === 0));
    const report = { kind: 'single-entry-no-files-type-reference-proof', typescript: ts.version, moduleResolution: ts.ModuleResolutionKind[options.moduleResolution], baseline, candidate: candidateResult, lint: lint.map((r) => ({ errors: r.errorCount, warnings: r.warningCount })), emittedExecutableJSIdentical: true, noRuntimeDtsImport: true, noToolFilesOverride: true, candidateSHA256: crypto.createHash('sha256').update(after).digest('hex'), actualOpenAPIExportStillRootWork: true, G3Certified: false };
    fs.writeFileSync(path.join(__dirname, 'proof30.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
