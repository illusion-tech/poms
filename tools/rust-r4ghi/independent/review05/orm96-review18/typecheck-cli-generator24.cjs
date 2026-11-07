const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const installed = createRequire(path.join(root, 'package.json'));
const ts = installed('typescript');
const proposed = path.join(__dirname, 'cli-generator-driver-candidate24');
const paths = [
    'apps/poms-api/src/app/core/persistence/poms-postgresql-driver.ts',
    'apps/poms-api/src/app/core/persistence/persistence.config.ts'
];
const config = ts.readConfigFile(path.join(root, 'tsconfig.base.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = { ...parsed.options, noEmit: true, strict: true, skipLibCheck: true, types: ['node'] };
const host = ts.createCompilerHost(options);
const candidate = (name) => {
    const relative = path.relative(root, name).replaceAll('\\', '/');
    return paths.includes(relative) ? path.join(proposed, relative) : name;
};
host.readFile = (name) => ts.sys.readFile(candidate(name));
host.fileExists = (name) => ts.sys.fileExists(candidate(name));
const original = host.getSourceFile.bind(host);
host.getSourceFile = (name, version, ...args) => candidate(name) !== name
    ? ts.createSourceFile(name, host.readFile(name), version, true)
    : original(name, version, ...args);
const program = ts.createProgram(paths.map((name) => path.join(root, name)), options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
fs.writeFileSync(path.join(__dirname, 'cli-generator-typecheck24.json'), JSON.stringify({
    kind: 'actual-typescript-real-MikroORM7-generator-extension-typecheck-no-emit',
    version: ts.version, diagnostics: diagnostics.map((d) => ({ code: d.code, file: d.file?.fileName, text: ts.flattenDiagnosticMessageText(d.messageText, '\n') }))
}, null, 2) + '\n');
if (diagnostics.length) {
    process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: (name) => name, getNewLine: () => '\n' }));
    process.exitCode = 1;
} else console.log(JSON.stringify({ version: ts.version, diagnostics: 0, realMikroORM7: true, emitted: false }));
