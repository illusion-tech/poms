// Executes the actual pure UI helper. This is not Angular type/build/browser evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('E:/projects/worktrees/poms-r3hijk-next28/poms/node_modules/typescript');
const root = path.resolve(import.meta.dirname, '../../..');
const relative = 'apps/poms-admin/src/app/features/project/project-handover-flow.ts';
const source = fs.readFileSync(path.join(root, relative), 'utf8');
const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
assert.equal((transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
const exports = {};
new Function('exports', transpiled.outputText)(exports);
const tests = [];
function test(name, run) { run(); tests.push({ name, result: 'pass' }); }
test('same person retains multiple explicit responsibilities and no fabricated confirmation status', () => {
    const result = exports.handoverParticipants([{ roleKey: 'sales-owner', userId: 'A', responsibilitySummary: 'sales' }, { roleKey: 'execution-owner', userId: 'A', responsibilitySummary: ' execution ' }]);
    assert.deepEqual(result, [{ userId: 'A', responsibilities: [{ roleKey: 'sales-owner', responsibilitySummary: 'sales' }, { roleKey: 'execution-owner', responsibilitySummary: 'execution' }] }]);
    assert.equal(Object.hasOwn(result[0], 'participantStatus'), false);
});
test('empty responsibility is rejected instead of consent', () => assert.throws(() => exports.handoverParticipants([{ roleKey: 'execution-owner', userId: 'A', responsibilitySummary: ' ' }])));
test('duplicate own duty is rejected', () => assert.throws(() => exports.handoverParticipants([{ roleKey: 'sales-owner', userId: 'A', responsibilitySummary: 'one' }, { roleKey: 'sales-owner', userId: 'A', responsibilitySummary: 'two' }])));
test('A to B to A never resurrects a late command acknowledgement', () => {
    const epoch = new exports.HandoverRouteEpoch(); epoch.enter('A'); const old = epoch.ticket(); epoch.enter('B'); epoch.enter('A');
    assert.equal(epoch.accepts(old), false); assert.equal(epoch.accepts(epoch.ticket()), true);
});
const report = { kind: 'D-actual-pure-UI-helper-tests', createdAt: new Date().toISOString(), source: relative,
    rawBytesSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'),
    typescript: ts.version, tests, passed: tests.length, angularTypeChecked: false, angularBuilt: false, browserRun: false,
    limitation: 'transpile-and-execute pure helper only; no generated client resolution, Angular template, HTTP, DB or browser claim' };
const destination = path.join(import.meta.dirname, `pure-ui-${report.createdAt.replaceAll(/[^0-9]/g, '')}.json`);
fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: destination, passed: tests.length, angularTypeChecked: false, browserRun: false }, null, 2));
