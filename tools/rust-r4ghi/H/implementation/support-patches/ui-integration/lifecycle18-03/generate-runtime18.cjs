// FS-only derivation of the already reviewed14 workers. No services/HTTP/DB/browser.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const base = path.join(__dirname, '../runtime14'), output = path.join(__dirname, 'proposed/tools/rust-r4ghi/business'), prefix = '../H/implementation/support-patches/ui-integration';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest-runtime14.json')));
function source(name) { const bytes = fs.readFileSync(path.join(base, name)); assert.equal(sha(bytes), manifest.files.find(item => item.file === name).rawBytesSha256); return bytes.toString('utf8'); }
function replace(text, from, to) { assert(text.includes(from), 'SourceBase text changed'); return text.replace(from, to); }
let linux = source('linux14.mjs');
linux = replace(linux, "import { createWritePolicy } from './write-policy14.mjs';", "import { createLifecycleWritePolicy18 as createWritePolicy } from './ui-lifecycle18-policy.mjs';");
linux = replace(linux, "from './fixture-receipts14.mjs'", "from './ui-lifecycle18-fixtures.mjs'");
linux = replace(linux, "from '../runtime13/binding13.mjs'", `from '${prefix}/runtime13/binding13.mjs'`);
linux = replace(linux, "from '../append06/ui06.candidate08.mjs'", "from './ui-lifecycle18-fixtures.mjs'");
linux = replace(linux, "from './server14.mjs'", `from '${prefix}/runtime14/server14.mjs'`);
linux = replace(linux, "from './dom-common14.mjs'", `from '${prefix}/runtime14/dom-common14.mjs'`);
linux = replace(linux, 'resolveCases(ctx.state, plan.cases)', 'resolveCases(ctx, plan.cases)');
linux = replace(linux, "const isWrite=!['GET','HEAD'].includes(request.method);", "const isWrite=!['GET','HEAD'].includes(request.method); if(!isWrite){assert(activePolicy);activePolicy.admitRead({operationId:operation.operationId,params:operation.pathParams,rawPath:request.path});}");
linux = replace(linux, 'activePolicy.observeRead(observation.operationId,body)', 'activePolicy.observeRead(observation.operationId,body,{headers:upstream.headers})');
linux = replace(linux, 'operationId:observation.operationId,ledger,originals}', 'operationId:observation.operationId,ledger,originals,writes:structuredClone(activePolicy.cache.writes)}');
linux = linux.replaceAll("['creator','execution-owner','own-condition']", "['eo-lifecycle']");
linux = replace(linux, "if(test.kind==='creator'){assert(report.actualSourceBinding.actorKeys.includes(configured.targetOwnerActorKey));const owner=ctx.state.actors[configured.targetOwnerActorKey];assert(owner);writeAction.targetOwnerUserId=owner.id;writeAction.targetOwnerOrgId=owner.orgId;}if(test.kind==='own-condition')writeAction.completionRecordId=fixturePointer(ctx.state,configured.completionRecordIdPointer);", '');
linux = replace(linux, "const all = ['creator', 'legacy-anchor', 'own-condition', 'execution-owner', 'money-max', 'sensitive-mask'];", "const all = ['eo-lifecycle']; report.allA08FormsPassed = false;");
linux = linux.replaceAll('allSixCasesPassed', 'allLifecycleGroupsPassed');
linux = replace(linux, "report.status = report.allLifecycleGroupsPassed ? 'passed' : 'passed-bound-cases-only';", "report.status = 'passed-bound-cases-only';");
linux = replace(linux, '/receipt10.json', '/receipt18-03.json');
fs.writeFileSync(path.join(output, 'ui-lifecycle18-linux.mjs'), linux);
let windows = source('windows14.mjs');
windows = replace(windows, "from '../runtime13/binding13.mjs'", `from '${prefix}/runtime13/binding13.mjs'`);
windows = replace(windows, "from './browser-cases14.mjs'", "from './ui-lifecycle18-browser.mjs'");
windows = replace(windows, "from './dom-common14.mjs'", `from '${prefix}/runtime14/dom-common14.mjs'`);
windows = replace(windows, 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/linux14.mjs', 'tools/rust-r4ghi/business/ui-lifecycle18-linux.mjs');
fs.writeFileSync(path.join(output, 'ui-lifecycle18-windows.mjs'), windows);
const outerSource = path.join(__dirname, '../consumer54-binding/proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/run-dom16.mjs');
const consumerManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../consumer54-binding/manifest-consumer54.json')));
assert.equal(sha(fs.readFileSync(outerSource)), consumerManifest.products.find(item => item.file.endsWith('/handoff16/run-dom16.mjs')).candidateRawBytesSha256);
let outer = fs.readFileSync(outerSource, 'utf8');
outer = replace(outer, "from '../runtime13/binding13.mjs'", `from '${prefix}/runtime13/binding13.mjs'`);
outer = replace(outer, "from '../runtime14/dom-common14.mjs'", `from '${prefix}/runtime14/dom-common14.mjs'`);
outer = replace(outer, "from './binding-input16.mjs'", `from '${prefix}/handoff16/binding-input16.mjs'`);
outer = replace(outer, "from './source-closure16.mjs'", `from '${prefix}/handoff16/source-closure16.mjs'`);
outer = replace(outer, 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/windows14.mjs', 'tools/rust-r4ghi/business/ui-lifecycle18-windows.mjs');
outer = replace(outer, 'const child = spawnSync(', "assert.equal(before.plan.cases.length,1);assert.equal(before.plan.cases[0].kind,'eo-lifecycle');const child = spawnSync(");
fs.writeFileSync(path.join(output, 'ui-lifecycle18-run-dom.mjs'), outer);
fs.writeFileSync(path.join(__dirname, 'worker-source-bases18.json'), JSON.stringify({ kind: 'sealed-worker-source-derivation-only-not-runtime-success', linux14: manifest.files.find(item => item.file === 'linux14.mjs'), windows14: manifest.files.find(item => item.file === 'windows14.mjs'),
    currentConsumer54OuterCandidateRawSHA256: sha(fs.readFileSync(outerSource)), derivedWorkers: ['ui-lifecycle18-linux.mjs','ui-lifecycle18-windows.mjs','ui-lifecycle18-run-dom.mjs'].map(file => ({ file, rawBytesSha256: sha(fs.readFileSync(path.join(output,file))) })), runtimeExecuted: false }, null, 2) + '\n');
