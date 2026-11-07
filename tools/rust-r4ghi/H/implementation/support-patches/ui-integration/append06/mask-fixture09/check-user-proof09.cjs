const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createHash } = require('node:crypto'), { createRequire } = require('node:module'), { pathToFileURL } = require('node:url');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', installed = createRequire(root + '/package.json'), ts = installed('typescript'), cache = new Map(), inputs = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
  const bytes = fs.readFileSync(file); inputs.set(file, sha(bytes)); const m = { exports: {} }; cache.set(file, m);
  const js = ts.transpileModule(bytes.toString(), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const req = name => { if (!name.startsWith('.')) return installed(name); const base = path.resolve(path.dirname(file), name); for (const next of [base, base + '.ts', path.join(base, 'index.ts')]) if (fs.existsSync(next) && fs.statSync(next).isFile()) return load(next); throw new Error('Unresolved canonical local import'); };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(req, m, m.exports); return m.exports;
}
(async () => {
  const { assertSingleOwnedRoleMembership } = await import(pathToFileURL(path.join(__dirname, 'user-proof09.mjs')).href);
  const database = 'poms_r4ghi_rust', userId = '00000000-0000-4000-8000-000000000001', roleId = '00000000-0000-4000-8000-000000000002';
  const row = (id, user = userId, role = roleId, status = 'active', revoked_at = null) => { const raw = JSON.stringify({ id, user_id: user, role_id: role, status, revoked_at }); return { key: [id], raw, sha256: sha(Buffer.from(raw)), xmin: '11' }; };
  const current = row('00000000-0000-4000-8000-000000000003'), key = JSON.stringify([database, 'user_role_assignment', current.key]);
  const owned = { [key]: { latestSha256: current.sha256, latestXmin: current.xmin } };
  const verify = (rows = [current], authority = owned) => assertSingleOwnedRoleMembership({ database, userId, roleId, rows, owned: authority });
  let cases = 0; const check = fn => { fn(); cases++; };
  check(() => assert.equal(verify().roleId, roleId));
  check(() => assert.throws(() => verify([])));
  check(() => assert.throws(() => verify([current, row('4', userId, 'other-role')])));
  check(() => assert.throws(() => verify([current, row('5', 'other-user', roleId)])));
  check(() => assert.throws(() => verify([row('6', userId, 'other-role')])));
  check(() => assert.throws(() => verify([current], {})));
  check(() => assert.throws(() => verify([current], { [key]: { ...owned[key], deleted: true } })));
  check(() => assert.throws(() => verify([current], { [key]: { ...owned[key], latestSha256: 'wrong' } })));
  check(() => assert.throws(() => verify([current], { [key]: { ...owned[key], latestXmin: '12' } })));
  check(() => assert.throws(() => verify([{ ...current, raw: current.raw + ' ' }])));
  check(() => assert.throws(() => verify([row('7', userId, roleId, 'active', '2026-11-07T00:00:00Z')])));
  check(() => assert.throws(() => verify([row('8', userId, roleId, 'unknown')])));
  check(() => assert.doesNotThrow(() => verify([current, row('9', userId, 'old-role', 'revoked', '2026-11-01T00:00:00Z')])));
  const canonical = load(path.join(root, 'libs/shared/contracts/src/lib/shared-contracts.ts'));
  const original = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01/000524-http-response-body.bin';
  const bytes = fs.readFileSync(original), actual = JSON.parse(bytes);
  check(() => assert.equal(canonical.PlatformUserDetailSchema.safeParse(actual).success, true));
  check(() => assert(Array.isArray(actual.roleNames) && actual.roleNames.length === 1 && !Object.hasOwn(actual, 'roles') && !Object.hasOwn(actual, 'permissions')));
  for (const [file, hash] of inputs) assert.equal(sha(fs.readFileSync(file)), hash);
  const report = { schemaVersion: 1, status: 'passed-pure-single-owned-FK-guards-plus-actual-recorded-DTO-parser', cases, actualRecordedDTO: { privateOriginalName: '000524-http-response-body.bin', rawBytesSha256: sha(bytes), formalSchema: 'PlatformUserDetail', parsed: true, privateContentsCopied: false },
    currentCanonicalInputs: [...inputs].map(([file, rawBytesSha256]) => ({ file: path.relative(root, file).replaceAll('\\', '/'), rawBytesSha256 })), HTTPExecuted: false, DBExecuted: false, browserExecuted: false, roleMutationExecuted: false };
  fs.writeFileSync(path.join(__dirname, 'unit-user-proof09.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, cases, actualRecordedDTOParsed: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
