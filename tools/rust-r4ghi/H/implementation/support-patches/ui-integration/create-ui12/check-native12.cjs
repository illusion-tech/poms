// Real Nest/Zod packages; no application/module/listener or business producer.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { createRequire } = require('node:module');
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', installed = createRequire(root + '/package.json'), ts = installed('typescript');
const file = path.join(__dirname, 'proposed/apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts'), source = fs.readFileSync(file, 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, esModuleInterop: true } }).outputText;
const moduleValue = { exports: {} }; vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(installed, moduleValue, moduleValue.exports);
const { rejectUnsupportedInitialProjectOwnership: reject, RustR4GhiNativeProtocolGuard } = moduleValue.exports;
let cases = 0; const check = fn => { fn(); cases++; }, unsupported = fn => assert.throws(fn, error => error.getStatus() === 422 && error.getResponse().code === 'rust_r4ghi_protocol_unsupported_by_native_reference');
check(() => assert.doesNotThrow(() => reject({ projectName: 'pure-test' })));
check(() => assert.doesNotThrow(() => reject({ initialOwnership: 'creator' })));
for (const value of ['organization', null, 0, ' organization ', 'invented', undefined]) check(() => unsupported(() => reject({ initialOwnership: value })));
const guard = new RustR4GhiNativeProtocolGuard(); class ProjectController {} class OtherController {} function create() {}
const context = (body, controller = ProjectController) => ({ getClass: () => controller, getHandler: () => create, switchToHttp: () => ({ getRequest: () => ({ body }) }) });
check(() => unsupported(() => guard.canActivate(context({ initialOwnership: 'organization' }))));
check(() => assert.equal(guard.canActivate(context({ initialOwnership: 'creator' })), true));
check(() => assert.equal(guard.canActivate(context({})), true));
check(() => assert.equal(guard.canActivate(context({ initialOwnership: 'organization' }, OtherController)), true));
check(() => unsupported(() => guard.canActivate(context({ initialOwnership: 'creator', inputVersion: 'server-derived-v1' }))));
const result = { schemaVersion: 1, status: 'passed-native-unsupported-branch-pure-unit-only', cases, usesRealNestException: true, noExistingMockChanges: true, HTTPExecuted: false, DBExecuted: false, UICompiledAgainstS6: false };
fs.writeFileSync(path.join(__dirname, 'native-unit12.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
