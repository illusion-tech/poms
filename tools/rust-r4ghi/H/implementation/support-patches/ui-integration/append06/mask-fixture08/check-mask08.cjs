// Real current canonical request parsing + pure negative projection guard only.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createRequire } = require('node:module'), { pathToFileURL } = require('node:url'), { createHash } = require('node:crypto');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', installed = createRequire(root + '/package.json'), ts = installed('typescript'), cache = new Map(), inputs = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
  const bytes = fs.readFileSync(file); inputs.set(file, sha(bytes)); const moduleValue = { exports: {} }; cache.set(file, moduleValue);
  const source = ts.transpileModule(bytes.toString(), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const request = name => { if (!name.startsWith('.')) return installed(name); const base = path.resolve(path.dirname(file), name); for (const next of [base, base + '.ts', path.join(base, 'index.ts')]) if (fs.existsSync(next) && fs.statSync(next).isFile()) return load(next); throw new Error('Unresolved canonical local import'); };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(request, moduleValue, moduleValue.exports); return moduleValue.exports;
}
(async () => {
  const canonical = load(path.join(root, 'libs/shared/contracts/src/lib/shared-contracts.ts'));
  const { assertMaskedSourceRow, PERSON_PERMISSIONS } = await import(pathToFileURL(path.join(__dirname, 'mask-fixture08.mjs')).href);
  const id = '00000000-0000-4000-8000-000000000001'; let cases = 0; const check = fn => { fn(); cases++; };
  const owner = { ownerUserId: id, ownerOrgId: id, expectedVersion: 2, reason: '本地纯请求形状，实际改派由 Root 公开 API 核验' };
  check(() => assert.equal(canonical.ReassignProjectOwnerRequestSchema.safeParse(owner).success, true));
  check(() => assert.equal(canonical.ReassignProjectOwnerRequestSchema.safeParse({ ...owner, expectedVersion: 0 }).success, false));
  check(() => assert.equal(canonical.ReassignProjectOwnerRequestSchema.safeParse({ ...owner, ownerUserId: 'not-a-uuid' }).success, false));
  check(() => assert.equal(canonical.AssignRolePermissionsRequestSchema.safeParse({ permissionKeys: PERSON_PERMISSIONS }).success, true));
  check(() => assert.equal(new Set(PERSON_PERMISSIONS).size, 3));
  check(() => assert(PERSON_PERMISSIONS.every(key => !key.includes(':sensitive:read'))));
  const row = { rowKind: 'direct-cost', sourceRef: { kind: 'ProjectActualCostRecord' }, financialProjection: { mode: 'masked', value: null, displayText: '经营敏感字段已隐藏' } };
  check(() => assert.doesNotThrow(() => assertMaskedSourceRow(row)));
  check(() => assert.throws(() => assertMaskedSourceRow({ ...row, financialProjection: { ...row.financialProjection, value: '9999999999999999.99' } })));
  check(() => assert.throws(() => assertMaskedSourceRow({ ...row, financialProjection: { ...row.financialProjection, value: 0 } })));
  check(() => assert.throws(() => assertMaskedSourceRow({ ...row, financialProjection: { ...row.financialProjection, mode: 'full' } })));
  check(() => assert.throws(() => assertMaskedSourceRow({ ...row, rowKind: 'supporting-source' })));
  check(() => assert.throws(() => assertMaskedSourceRow({ ...row, sourceRef: { kind: 'invented-source' } })));
  for (const [file, hash] of inputs) assert.equal(sha(fs.readFileSync(file)), hash);
  const report = { schemaVersion: 1, status: 'passed-current-canonical-and-pure-mask-guards-only', cases, sourceStable: true, realRoleMutationExecuted: false, realReassignmentExecuted: false, HTTPExecuted: false, DBExecuted: false, browserExecuted: false,
    inputs: [...inputs].map(([file, rawBytesSha256]) => ({ file: path.relative(root, file).replaceAll('\\', '/'), rawBytesSha256 })) };
  fs.writeFileSync(path.join(__dirname, 'unit-mask08.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, cases }));
})().catch(error => { console.error(error); process.exitCode = 1; });
