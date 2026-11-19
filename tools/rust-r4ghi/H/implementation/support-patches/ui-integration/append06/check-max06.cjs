// Pure factories + real current canonical Zod parsing. Never imports business context/http.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createRequire } = require('node:module'), { pathToFileURL } = require('node:url'), { createHash } = require('node:crypto');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', installed = createRequire(root + '/package.json'), ts = installed('typescript');
const sha = value => createHash('sha256').update(value).digest('hex'), inputs = new Map(), cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
  const bytes = fs.readFileSync(file); inputs.set(file, sha(bytes));
  const moduleValue = { exports: {} }; cache.set(file, moduleValue);
  const source = ts.transpileModule(bytes.toString(), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const requireValue = name => {
    if (!name.startsWith('.')) return installed(name);
    const base = path.resolve(path.dirname(file), name);
    for (const candidate of [base, base + '.ts', path.join(base, 'index.ts')]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return load(candidate);
    throw new Error('Canonical local import is unresolved');
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(requireValue, moduleValue, moduleValue.exports);
  return moduleValue.exports;
}
(async () => {
  const canonical = load(path.join(root, 'libs/shared/contracts/src/lib/shared-contracts.ts'));
  const { MAX, maxExpenseRequest } = await import(pathToFileURL(path.join(__dirname, 'max-fixture06.mjs')).href);
  let cases = 0; const check = fn => { fn(); cases++; };
  const body = maxExpenseRequest({ businessDate: '2026-11-07', expenseCategory: 'pure-test-real-code-required-at-runtime' });
  check(() => assert.equal(canonical.CreateExpenseRecordRequestSchema.safeParse(body).success, true));
  check(() => assert.equal(body.contractId, null));
  check(() => assert.equal(BigInt(body.amountIncludingTax.replace('.', '')), 999999999999999999n));
  check(() => assert.equal(BigInt(body.amountExcludingTax.replace('.', '')) + BigInt(body.taxAmount.replace('.', '')), BigInt(MAX.replace('.', ''))));
  check(() => assert.equal(canonical.CreateExpenseRecordRequestSchema.safeParse({ ...body, expenseDate: '2026-02-30' }).success, false));
  check(() => assert.equal(canonical.CreateExpenseRecordRequestSchema.safeParse({ ...body, contractId: 'not-a-real-uuid' }).success, false));
  const command = { costType: 'expense', expenseRecordId: '00000000-0000-4000-8000-000000000001', expectedSourceVersion: 2, costDescription: '纯请求形状单元输入，实际来源在 Root 运行时核验' };
  check(() => assert.equal(canonical.CreateExpenseProjectActualCostRecordRequestSchema.safeParse(command).success, true));
  check(() => assert.equal(canonical.CreateExpenseProjectActualCostRecordRequestSchema.safeParse({ ...command, amountIncludingTax: MAX }).success, false));
  check(() => assert.equal(canonical.ConfirmExpenseRecordRequestSchema.safeParse({ expectedVersion: 2 }).success, true));
  for (const [file, hash] of inputs) assert.equal(sha(fs.readFileSync(file)), hash, 'Canonical input changed during parser validation');
  const report = { schemaVersion: 1, status: 'passed-pure-request-and-current-canonical-parser-only', cases, inputSourceStable: true,
    requestAcceptedByCurrentSchema: true, serverCapacityOrStageAccepted: false, realProducerExecuted: false, HTTPExecuted: false, DBExecuted: false, browserExecuted: false,
    currentCanonicalInputs: [...inputs].map(([file, rawBytesSha256]) => ({ file: path.relative(root, file).replaceAll('\\', '/'), rawBytesSha256 })) };
  fs.writeFileSync(path.join(__dirname, 'max-unit06.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, cases }));
})().catch(error => { console.error(error); process.exitCode = 1; });
