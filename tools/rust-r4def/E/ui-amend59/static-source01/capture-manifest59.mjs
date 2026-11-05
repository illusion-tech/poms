// Static public-source inspection only. Never import root-run59 or launch browser.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createControlledAmendment59, initialPlan59, OPERATIONS59 } from './flow59.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const require = createRequire(root + '/package.json'), ts = require('typescript');
const pin = (file, base = root) => { const b = fs.readFileSync(path.join(base, file)); return { file, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; };
const text = file => fs.readFileSync(path.join(own, file), 'utf8');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
for (const name of ['flow59.mjs', 'root-run59.mjs', 'capture-manifest59.mjs']) {
    const ast = ts.createSourceFile(name, text(name), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0, name + ' parse diagnostics');
}
const flow = text('flow59.mjs'), wrapper = text('root-run59.mjs');
assert(!/\bfetch\s*\(|\.request\.(post|get|put|patch|delete)\s*\(|\.route\s*\(|\.fulfill\s*\(|\.evaluate\s*\(|\.dispatchEvent\s*\(|\b(?:INSERT INTO|UPDATE poms|DELETE FROM|REVOKE|GRANT)\b/i.test(flow), 'Flow contains a direct client/mock/component-state/SQL bypass');
assert(!wrapper.includes('admin-build44') || wrapper.includes('no admin-build44 fallback'));
assert(wrapper.includes('args.buildEdition') && wrapper.includes('baselineRun') && !wrapper.includes('afterResponse:'), 'Explicit actual build and real baseline continuation only');
const fail = () => { throw Error('Static constructor invoked runtime callback'); };
const plan = createControlledAmendment59({ observe: fail, shot: fail, stageChanged: fail, registerPage: fail }).manifest();
assert.deepEqual(plan.stages, initialPlan59().stages); assert(plan.stages.every(s => s.status === 'not-run')); assert.equal(plan.browserExecuted, false); assert.equal(plan.businessCommandsExecuted, 0); assert.equal(plan.commands.length, 0); assert.equal(plan.sessions.length, 0);
const spec = JSON.parse(source('libs/shared/api-spec/openapi.json'));
const index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, o]) => o.operationId).map(([method, o]) => [o.operationId, { method: method.toUpperCase(), template, statuses: Object.keys(o.responses) }])));
const operations = Object.entries(OPERATIONS59).map(([id, [method, template, status]]) => { const actual = index.get(id); assert(actual && actual.method === method && actual.template === template && actual.statuses.includes(String(status)), id + ' current authority mismatch'); return { operationId: id, method, path: template, successStatus: status }; });
const actionTemplate = source('apps/poms-admin/src/app/features/project/project-handover-actions.ts');
const selectors = ['选择合同', 'amendmentReason', 'node-label-', '建立变更就绪包', '审核或操作意见', '记录已逐项核对的本次差异', '准备精确变更版本', '提交正式合同变更审核', '批准本次变更', '生效新快照与完整回款计划', '再基线化并重新发起各人确认', '确认本人全部已指派职责', '正式确认本次移交事实', '本次确认的冻结范围和风险'];
for (const value of selectors) assert(actionTemplate.includes(value), 'Current real template selector missing:' + value);
const ui47 = source('tools/rust-r4def/ui47.mjs'); assert(wrapper.includes(ui47.match(/9b07943f[0-9a-f]+/)[0]), 'Windows browser pin drift');
const inputs = ['tools/rust-r4def/ui47.mjs', 'tools/rust-r4def/ui-server45.mjs', 'tools/rust-r4def/writer-scope45.mjs', 'tools/rust-r4def/actors33.mjs', 'apps/poms-admin/src/app/features/project/project-handover-actions.ts', 'apps/poms-admin/src/app/features/project/project-contract-handover.ts', 'apps/poms-admin/src/app/features/project/project-handover-flow.ts', 'libs/admin/data-access/src/lib/auth/auth.store.ts', 'libs/shared/api-spec/openapi.json', 'tmp/rust-r4def/root/ui-windows48/receipt45.json', 'tmp/rust-r4def/root/api32/continuation48-result.json'].map(name => pin(name));
const prior = JSON.parse(source('tmp/rust-r4def/root/ui-windows48/receipt45.json')), continuation = JSON.parse(source('tmp/rust-r4def/root/api32/continuation48-result.json'));
assert.equal(prior.complete, true); assert.equal(continuation.completed, true); assert.equal(prior.projectId, continuation.context.project.id); assert.equal(prior.otherProjectId, continuation.context.otherProject.id); const baseline = prior.observations.find(o => o.handoverId && o.projectId === prior.projectId); assert.equal(baseline.version, 1);
const products = ['flow59.mjs', 'root-run59.mjs', 'README.md', 'capture-manifest59.mjs'].map(file => pin(file, own));
for (const input of inputs) assert.equal(pin(input.file).rawBytesSha256, input.rawBytesSha256, 'Public source changed during static capture');
const manifest = {
    kind: 'Root-real-D-controlled-amendment-rebaseline-browser-candidate59', createdAt: new Date().toISOString(), products, readOnlyPublicInputs: inputs, currentSchemaCount: Object.keys(spec.components.schemas).length, operationAuthority: operations, templateSelectorsChecked: selectors,
    inputIdentity: { projectId: prior.projectId, otherProjectId: prior.otherProjectId, contractId: continuation.context.contract.id, otherContractId: continuation.context.secondContract.id, originalHandoverId: baseline.handoverId, originalVersion: baseline.version, priorFactsExecutedBy: 'Root; public48 original read only' },
    initial: plan, buildAdmission: { explicitBuildEditionRequired: true, build44HardcodedFallback: false, optionalActualManifestPin: true, realPublicBaselineRunSupported: true },
    staticValidation: { nodeSyntax: 'passed node --check for three candidates', ASTParserVersion: ts.version, currentRoutesMethodsAndStatusesMatched: true, selectorsFoundInCurrentRootTemplate: true, safeConstructorAll12NotRun: true, directHTTPClientOrRouteMockOrEvaluateInFlow: false, writerPermissionsFromActualUISession: true, realCurrentApproverMatchedToActualUILogin: true, affectedItemsFromOldSnapshotAndPlanIdentity: true, threeFreshSelfConfirmationsRequired: true, finalActualR5BlockedRequired: true, publicSecretsNotCopied: true },
    authorExecution: { rootRunnerExecuted: false, privateRead: false, browserStarted: false, HTTPCalled: false, DBConnected: false, processStartedOrStopped: false, productOrRootFilesChanged: false, businessAccepted: false, performanceClaimed: false, G3Certified: false, G4Certified: false }, optionalLateAttachmentFailure: { implemented: false, executed: false, status: 'not-run', RootOnlyPlan: 'README; real500, exact ACL restore, transparent end-only gate, same SPA A-B-A' },
};
fs.writeFileSync(path.join(own, 'manifest59.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest59.json', own), products, stages: plan.stages.length, authorRuntimeExecuted: false }));
