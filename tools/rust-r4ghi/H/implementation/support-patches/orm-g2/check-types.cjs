// Typecheck the proposed file at its intended product path without copying it
// there. Existing referenced entities are the real checkout files, not mocks.
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const installed = createRequire('E:/projects/poms/package.json');
const ts = installed('typescript');
const root = path.resolve(__dirname, '../../../../../..');
const file = path.join(__dirname, 'rust-r4ghi-entities.entity.ts');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'sql-target-catalog.json'), 'utf8'));
const virtualFile = path.join(root, catalog.targetFile);
const overlay=process.argv.includes('--overlay');
const proposed=path.join(__dirname,'proposed');
const config = ts.readConfigFile(path.join(root, 'tsconfig.base.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = {
    ...parsed.options, noEmit: true, types: [],
    paths: { ...parsed.options.paths, '@mikro-orm/core': ['E:/projects/poms/node_modules/@mikro-orm/core'], zod: ['E:/projects/poms/node_modules/zod'] },
    typeRoots: ['E:/projects/poms/node_modules/@types']
};
const host = ts.createCompilerHost(options);
const overlayPath=(name)=>{const relative=path.relative(root,name);const target=path.join(proposed,relative);return !relative.startsWith('..')&&fs.existsSync(target)?target:name;};
const readFile=host.readFile.bind(host);host.readFile=(name)=>readFile(overlay?overlayPath(name):name);
host.fileExists=(name)=>ts.sys.fileExists(overlay?overlayPath(name):name);
const originalGetSourceFile=host.getSourceFile.bind(host);
host.getSourceFile=(name,version,...args)=>overlay&&overlayPath(name)!==name?ts.createSourceFile(name,host.readFile(name),version,true):originalGetSourceFile(name,version,...args);
host.resolveModuleNames = (names, containingFile) => names.map((name) => ts.resolveModuleName(name, !overlay&&path.resolve(containingFile) === path.resolve(file) ? virtualFile : containingFile, options, host).resolvedModule);
const roots=overlay?[virtualFile,...JSON.parse(fs.readFileSync(path.join(__dirname,'existing-mapping-plan.json'),'utf8')).files.filter((entry)=>entry.path.endsWith('.entity.ts')).map((entry)=>path.join(root,entry.path))]:[file];
const program = ts.createProgram(roots, options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
    process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: (name) => name, getNewLine: () => '\n' }));
    process.exitCode = 1;
} else console.log(JSON.stringify({ status: 'passed-real-MikroORM7-types-with-real-existing-entity-imports-no-DB', newEntities: 19,overlayExistingMappings:overlay }));
