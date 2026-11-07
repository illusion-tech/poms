// Syntax-only evidence. This does not certify TS types, HTTP or browser behavior.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
const require = createRequire('E:/projects/poms/package.json');
const ts = require('typescript');
const { parseTemplate } = await import(pathToFileURL(require.resolve('@angular/compiler')).href);
const files = [
    'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.ts',
    'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts',
    'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.spec.ts',
    'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.spec.ts'
];
const results = [];
for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const output = ts.transpileModule(text, { fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true } });
    const template = /template:\s*`([\s\S]*?)`/.exec(text)?.[1];
    const errors = [...(output.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')), ...(template ? parseTemplate(template, file).errors ?? [] : []).map((e) => e.toString())];
    results.push({ file, sha256: createHash('sha256').update(text).digest('hex'), errors });
}
const roleSource = readFileSync(files[0], 'utf8');
const ast = ts.createSourceFile(files[0], roleSource, ts.ScriptTarget.Latest, true);
const weightFunction = ast.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === 'roleWeightUnits');
if (!weightFunction) throw new Error('Actual weight function missing');
const compiled = ts.transpileModule(weightFunction.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
runInNewContext(compiled, { exports });
const weightCases = [['1e-6', 1], ['0.1000000', 100000], ['1', 1000000], ['0', 0], ['1e-7', null], ['0.10000000000000001', null], ['-1', null], ['NaN', null], ['1.000001', null], ['Infinity', null]].map(([input, expected]) => {
    let actual = null;
    try { actual = exports.roleWeightUnits(input); } catch { /* Invalid case is deliberately rejected. */ }
    return { input, expected, actual, pass: actual === expected };
});
const result = { kind: 'typescript-transpile-and-angular-template-syntax-plus-actual-pure-weight-function', installedDependenciesFrom: 'E:/projects/poms/node_modules', results, weightCases, pass: results.every((r) => r.errors.length === 0) && weightCases.every((r) => r.pass), fullBuild: 'Root integration pending', angularTestbed: 'Root integration pending', browser: 'not run' };
writeFileSync('tools/rust-r4ghi/I/implementation/ui-syntax-result.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
if (!result.pass) process.exitCode = 1;
