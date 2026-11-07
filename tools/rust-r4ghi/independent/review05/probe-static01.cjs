const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const root = process.cwd();
const out = path.join(root, 'tools/rust-r4ghi/independent/review05');
const installed = createRequire(path.join(root, 'package.json'));
const ts = installed('typescript');
const rel = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/proposed/apps/poms-admin/src/app/features/project/project-governance-api.ts';
const input = path.join(out, 'inputs02/UI-candidate/apps/poms-admin/src/app/features/project/project-governance-api.ts.bin');
const source = fs.readFileSync(input, 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = { project: '00000000-0000-4000-8000-000000000001', parent: '00000000-0000-4000-8000-000000000002', child: '00000000-0000-4000-8000-000000000003', actor: '00000000-0000-4000-8000-000000000004', attachment: '00000000-0000-4000-8000-000000000005', link: '00000000-0000-4000-8000-000000000006' };
const events = [];
const clients = {};
for (const name of ['CommissionApi','CommissionRoleAssignmentsApi','ContractApi','ContractFinanceApi','DictionaryApi','ProjectApi','ProjectCostApi','ProjectHandoverApi']) clients[name] = class {};
Object.assign(clients, {ActiveInactiveStatus:{Active:'active'},AttachmentRelationType:{Evidence:'evidence'},AttachmentTargetType:{Project:'project'},DictionaryDomain:{AttachmentCategory:'attachment-category'}});
const AttachmentStore = class {};
const ownRecords = {scopeKind:'own-condition-only',projectId:ids.project,items:[{completionRecordId:ids.parent,completionRowVersion:7,conditionStatus:'pending',ownTasks:[{conditionId:ids.child,conditionRowVersion:3,responsibleUserId:ids.actor,status:'pending',evidenceRefs:[],closure:null}]}]};
const instances = new Map([
 [clients.ProjectApi, {projectControllerListProjectCompletionRecords:args=>{events.push({kind:'completion-list',args});return ownRecords;},projectControllerGetById:args=>{events.push({kind:'project-detail',args});throw Error('Own-only probe must not load full detail');},projectCompletionRecordControllerCloseCompletionCondition:args=>{events.push({kind:'close-client-call',args});return {scopeKind:'own-condition-only'};}}],
 [clients.DictionaryApi,{dictionaryControllerList:args=>{events.push({kind:'dictionary-list',args});return [{domain:'attachment-category',code:'acceptance',status:'active'}];}}],
 [AttachmentStore,{uploadAttachment:args=>{events.push({kind:'attachment-store-upload',args:{...args,file:'synthetic-file'}});return {id:ids.attachment,displayName:'synthetic',checksumSha256:'a'.repeat(64),links:[{id:ids.link,targetType:'project',targetId:ids.project,status:'active'}]};}}]
]);
for (const name of ['CommissionApi','CommissionRoleAssignmentsApi','ContractApi','ContractFinanceApi','ProjectCostApi','ProjectHandoverApi']) instances.set(clients[name],{});
const contracts = new Proxy({}, { get: (_target, name) => String(name).endsWith('Schema') ? {parse:value=>value} : undefined });
const stubs = {'@angular/core':{Injectable:()=>target=>target,inject:token=>{assert(instances.has(token));return instances.get(token);}},'@poms/admin-data-access':{AttachmentStore},'@poms/shared-api-client':clients,'@poms/shared-contracts':contracts,'rxjs':{firstValueFrom:value=>Promise.resolve(value)}};
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const moduleObject = {exports:{}};
vm.runInNewContext(js,{exports:moduleObject.exports,module:moduleObject,require:name=>{assert(Object.hasOwn(stubs,name),'Unexpected import '+name);return stubs[name];},setTimeout,URL,document:{}},{filename:rel});
(async()=>{
 const api = new moduleObject.exports.ProjectGovernanceApi();
 const scoped = api.lifecycleApi(ids.project,true,ids.actor);
 await scoped.loadCompletionRecords(ids.project);
 const firstRequestIsOwnCompletionList = events[0].kind === 'completion-list' && !events.some(x=>x.kind==='project-detail');
 let rejectedCrossParent=false;
 try {await scoped.uploadConditionEvidence(ids.project,'00000000-0000-4000-8000-000000000007',ids.child,{name:'synthetic'});}catch{rejectedCrossParent=true;}
 await scoped.uploadConditionEvidence(ids.project,ids.parent,ids.child,{name:'synthetic'});
 const upload=events.find(x=>x.kind==='attachment-store-upload');
 assert.deepEqual(upload.args.completionConditionContext,{completionRecordId:ids.parent,conditionId:ids.child});
 await scoped.closeCondition(ids.parent,ids.child,{inputVersion:'server-derived-v1',expectedCompletionVersion:7,expectedConditionVersion:3,closureSummary:'synthetic',evidenceRefs:[{attachmentLinkId:ids.link}]});
 const close=events.find(x=>x.kind==='close-client-call');
 const spec=JSON.parse(fs.readFileSync(path.join(root,'libs/shared/api-spec/openapi.json'),'utf8'));
 const op=spec.paths['/api/project-completion-records/{completionRecordId}/conditions/{id}:close'].post;
 const requiredPathKeys=op.parameters.filter(x=>x.in==='path'&&x.required).map(x=>x.name);
 const missingPathKeys=requiredPathKeys.filter(key=>!Object.hasOwn(close.args,key));
 const extraIdentityKeys=Object.keys(close.args).filter(key=>key.endsWith('Id')&&!requiredPathKeys.includes(key));
 assert.deepEqual(missingPathKeys,['id']);
 const report={kind:'independent-review05-pure-candidate-UI-call-probe',source:rel,sourceSHA256:sha(Buffer.from(source)),syntheticFixtures:true,schemaValidationStubbed:true,noHTTP:true,noDatabase:true,noAuthorizationAcceptance:true,firstRequestIsOwnCompletionList,rejectedCrossParent,purposeDualUUIDsPassedToAttachmentStore:true,requiredPathKeys,missingPathKeys,extraIdentityKeys,events};
 fs.writeFileSync(path.join(out,'candidate-ui-probe01.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 const tool=await import(pathToFileURL(path.join(root,'tools/openapi/shared-api-client.mjs')).href);
 const baseline=tool.loadBaseline(root),before=tool.treeManifest(path.join(root,'libs/shared/api-client'),{timestamps:true});
 let guardError=null;
 try{tool.assertFrozenSources(root,baseline);}catch(error){guardError=String(error.message);}
 const after=tool.treeManifest(path.join(root,'libs/shared/api-client'),{timestamps:true});
 assert(guardError?.includes('Frozen generator input differs'));
 assert.deepEqual(after,before);
 const guard={kind:'independent-review05-current-S4-guard-refuses-unfrozen-S5-input',baselineSourceHead:baseline.sourceHead,protectedSources:baseline.protectedSources.length,fullInventory:{paths:baseline.spec.paths.length,operations:baseline.spec.operations.length,schemas:baseline.spec.schemas.length},guardRejected:true,guardError,generatorInvoked:false,clientChanged:false,clientFiles:before.length,clientManifestSHA256:sha(JSON.stringify(before)),G3Certified:false,G4Certified:false};
 fs.writeFileSync(path.join(out,'sdk-guard-probe01.json'),JSON.stringify(guard,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({uiProbe:{firstRequestIsOwnCompletionList,rejectedCrossParent,purposeDualUUIDsPassedToAttachmentStore:true,missingPathKeys,extraIdentityKeys},sdkGuard:guard}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
