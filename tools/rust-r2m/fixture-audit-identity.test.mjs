// Synthetic in-memory proof models plus protected public source projections.
// No DB, HTTP, private file, Native observer, or real Root/C admission is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SourceReader} from './acceptance-source.mjs';
import {platformBusinessAuditProfile} from './acceptance-api-audit-source.mjs';
import {resolveSettingHeaderIdentity,settingHeaderRecipe} from './acceptance-api-request-identity.mjs';
import {validateAuditAdmission,auditIdentityForIntent,assertAuditRowScope,validateAuditIdentityJournal,validateSettingAuditRequestReceipt,admitAuditIdentity} from './fixture-audit-identity.mjs';
import {Fixture} from './fixture.mjs';
import {caseIdentity,digest,assertCreationProof,fixtureProfile} from './fixture-core.mjs';
const root=path.resolve(import.meta.dirname,'../..'),runId='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000002',targetId='30000000-0000-4000-8000-000000000003',auditId='40000000-0000-4000-8000-000000000004',leaseCase='m2-ui2.attachment-max-upload-size';
const sha=b=>createHash('sha256').update(b).digest('hex'),marker='1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5';
const publicFiles=['tools/rust-r2ef/e-http-plan.mjs','apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts','apps/poms-api/src/app/features/system-setting/system-setting.controller.ts','apps/poms-api/src/app/features/platform/platform.service.ts','apps/poms-api/src/app/features/platform/platform.controller.ts','apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts'];
const reader=()=>new SourceReader({root,sourceEpoch:'synthetic-model-only',pins:publicFiles.map(file=>({file,rawBytesSha256:sha(fs.readFileSync(path.join(root,file)))}))});
const owned=(table,id,caseId='base',identity={})=>({table,id,caseId,identity:{id,...identity},creationProof:{kind:'direct-committed-insert',beforeAbsent:true,commitAcknowledged:true,transaction:'10',xmin:'10'},postcondition:{independentlyVisible:true}});
function model({sourceKind='platform-null',caseId='m1.2',stepId='replace-permissions',method='PUT',requestPath='/api/platform/roles/'+targetId+'/permissions',body={permissionKeys:[]},index=7,backend='nest'}={}){
 const scope={...caseIdentity(runId,caseId),actors:[actorId],projects:[],borrowedActors:[],borrowedDefinitions:[]},context={runId,caseId,index,op:'m.http'},j={runId,backend,cases:[scope],objects:[owned('platform_user',actorId),owned('role',targetId)],committedCreates:[],intents:[],state:'prepared',base:{accounts:[{account:'admin',userId:actorId}]}};
 const approval={kind:'Root-R2M-source-bound-audit-identity-admission',rootApproved:true,namespace:'poms-r2m',marker,runId,backend,database:'poms_r2m_'+backend,sourceCapId:'synthetic-model-only',allowedSourceKinds:[sourceKind],sourceReview:{kind:'synthetic-model-only-never-actual'}};
 let descriptor,request={stepId,method,path:requestPath,body},auditSelector,expectedParent,wireRequestId=scope.requestId;
 if(sourceKind==='E-setting'){
  const recipe=settingHeaderRecipe(reader(),stepId);descriptor=resolveSettingHeaderIdentity({sourceReader:reader(),sourceCapId:'synthetic-model-only',backend,step:{...recipe,headers:recipe.headers},context,ownershipRequestId:scope.requestId,generatedCorrelationId:'m-50000000-0000-4000-8000-000000000005'});
  auditSelector={event_type:'platform.system_setting.updated',target_type:'SystemSetting',target_id:'attachment.max-upload-size-mb',operator_id:actorId,request_id:descriptor.actualRequestId};expectedParent={kind:'environment-baseline-setting-lease',key:'attachment.max-upload-size-mb'};wireRequestId=descriptor.actualRequestId;
  j.baselineSettingLease={caseId:leaseCase,admissionSha256:'a'.repeat(64)};approval.settingLeaseAdmissionSha256=j.baselineSettingLease.admissionSha256;request=undefined;
 }else{descriptor=platformBusinessAuditProfile({sourceReader:reader(),sourceCapId:'synthetic-model-only',context,request,actorId});assert(descriptor);auditSelector=descriptor.auditSelector;expectedParent=descriptor.expectedParent}
 const entry={kind:'R2M-source-bound-audit-request-identity-admission',id:'60000000-0000-4000-8000-000000000006',sourceKind,descriptor,...(request?{request}:{}),context,actorId,backend,ownershipRequestId:scope.requestId,wireRequestId,auditSelector,expectedParent,descriptorSha256:digest(descriptor),approval,approvalSha256:digest(approval),ordinaryScopeRequestIdChanged:false,resourceOwnershipGranted:false};
 j.auditIdentityAdmissions=[entry];const intent={id:'70000000-0000-4000-8000-000000000007',table:'audit_log',caseId,selector:structuredClone(auditSelector),expectedMax:1,contextIndex:index,auditIdentityAdmissionId:entry.id};j.intents.push(intent);return{j,scope,context,entry,intent};
}
function proofRow(data){const row={id:auditId,...data.entry.auditSelector};data.j.committedCreates.push({table:'audit_log',id:auditId,proof:{createContext:structuredClone(data.context)}});return row}

test('all named platform handlers retain actual source null metadata and exact event/typed target/actor',()=>{
 const cases=[['m1.2','replace-permissions','PUT','roles/'+targetId+'/permissions'],['m1.2','replace-default','PUT','roles/'+targetId+'/permissions'],['m1.3','memberships','PUT','users/'+targetId+'/org-memberships'],['m1.3','disable','POST','users/'+targetId+':deactivate'],['m2.1','memberships','PUT','users/'+targetId+'/org-memberships'],['m2.1','assign-new-user-roles','PUT','users/'+targetId+'/roles'],['m2.1','ignored-request-version','PATCH','users/'+targetId],['m2.1','org','POST','org-units',{code:'m_'+runId.replaceAll('-','')}],['m2.1','role','POST','roles',{roleKey:'m_'+runId.replaceAll('-','')}],['m2.1','user-empty-relations','POST','users',{username:'m_'+runId.replaceAll('-','')}],['m2.3','audit-user-empty-relations','POST','users',{username:'m_'+runId.replaceAll('-','')}]];
 for(const[caseId,stepId,method,route,body]of cases){const data=model({caseId,stepId,method,requestPath:'/api/platform/'+route,body});validateAuditAdmission(data.entry,data.j);assert.equal(data.entry.auditSelector.request_id,null);assert.equal(data.entry.wireRequestId,data.scope.requestId);auditIdentityForIntent(data.j,data.intent,data.context)}
});
test('ordinary null/empty audit and security IDs still fail without a source-bound actual creation context',()=>{
 const data=model();for(const table of['audit_log','security_event'])for(const request_id of[null,'','foreign'])assert.throws(()=>assertAuditRowScope({...data.j,auditIdentityAdmissions:[]},table,{id:auditId,request_id},data.scope));
 assertAuditRowScope(data.j,'security_event',{request_id:data.scope.requestId},data.scope);
 const row=proofRow(data);assertAuditRowScope(data.j,'audit_log',row,data.scope);for(const mutate of[d=>d.j.committedCreates=[],d=>d.j.committedCreates[0].proof.createContext.index++,d=>d.j.committedCreates[0].proof.createContext.op='m.producer']){const d=model();const r=proofRow(d);mutate(d);assert.throws(()=>assertAuditRowScope(d.j,'audit_log',r,d.scope))}
});
test('the alternate intent is audit-only, exact selector/index and bounded to one actual row',async()=>{
 const data=model();for(const mutate of[i=>i.table='security_event',i=>i.contextIndex++,i=>i.expectedMax=2,i=>i.selector.event_type='foreign']){const intent=structuredClone(data.intent);mutate(intent);assert.throws(()=>auditIdentityForIntent(data.j,intent,data.context))}
 const fake=Object.create(Fixture.prototype);Object.assign(fake,{j:data.j,runId,backend:'nest',client:{query:async()=>({rows:[]})},save(){},preflight:async()=>{}});
 await assert.rejects(fake.intent('audit_log',data.entry.auditSelector,{caseId:data.scope.caseId}));
 const intent=await fake.intentWithRequestIdentity('audit_log',data.entry.auditSelector,{caseId:data.scope.caseId,index:data.context.index,admissionId:data.entry.id});assert.equal(intent.expectedMax,1);assert.equal(intent.contextIndex,data.context.index);
});
test('the actual Native outer COMMIT must retain the admitted audit request index',()=>{
 const data=model(),authorityId='90000000-0000-4000-8000-000000000009',proof={kind:'mikro-orm-afterCreate-outer-commit',sdkVersion:'7.0.11',createEventSeq:2,createTransaction:'tx1',createContext:structuredClone(data.context),releases:[],outerTransaction:'tx1',outerBeforeCommitEventSeq:3,outerCommitEventSeq:4,commitContext:structuredClone(data.context)},item={table:'audit_log',id:auditId,intentId:data.intent.id,authorityId,proof,fixtureProfile:fixtureProfile.journalTag};
 Object.assign(data.intent,{beforeObserved:true,beforeIds:[]});data.j.authorities=[{id:authorityId,kind:proof.kind,database:'poms_r2m_nest',marker,fixtureProfile:fixtureProfile.journalTag,trace:{complete:true,diagnostics:[],openTransactions:[],pendingStartCount:0,events:[{seq:1,event:'afterTransactionStart',transaction:'tx1',parent:null,savepointName:null},{seq:2,event:'afterCreate',table:'audit_log'},{seq:3,event:'beforeTransactionCommit',transaction:'tx1'},{seq:4,event:'afterTransactionCommit',transaction:'tx1'}],committed:[{table:'audit_log',id:auditId,proof:structuredClone(proof)}]}}];
 assertCreationProof(data.j,item,data.intent);item.proof.commitContext.index++;data.j.authorities[0].trace.committed[0].proof=structuredClone(item.proof);assert.throws(()=>assertCreationProof(data.j,item,data.intent),/exact actual request context/);
 item.proof.commitContext.index=data.context.index;item.proof.commitContext.op='m.producer';data.j.authorities[0].trace.committed[0].proof=structuredClone(item.proof);assert.throws(()=>assertCreationProof(data.j,item,data.intent),/exact actual request operation/);
});
test('null generated targets require independently visible same-index committed typed parents',()=>{
 const data=model({caseId:'m2.3',stepId:'audit-user-empty-relations',method:'POST',requestPath:'/api/platform/users',body:{username:'m_'+runId.replaceAll('-','')}}),row=proofRow(data);row.target_id=targetId;
 assert.throws(()=>assertAuditRowScope(data.j,'audit_log',row,data.scope));data.j.objects.push({...owned('platform_user',targetId,'m2.3',{username:data.entry.expectedParent.selector.username}),creationProof:{kind:'pg-after-insert-observed-outer-commit',createContext:structuredClone(data.context)}});assertAuditRowScope(data.j,'audit_log',row,data.scope);
 for(const mutate of[p=>p.table='role',p=>p.creationProof.createContext.index++,p=>p.creationProof.createContext.op='m.producer',p=>p.postcondition.independentlyVisible=false,p=>p.identity.username='foreign']){const d=structuredClone(data);mutate(d.j.objects.at(-1));assert.throws(()=>assertAuditRowScope(d.j,'audit_log',row,d.scope))}
});
test('the generated Native parent outer COMMIT must belong to the exact admitted request context',()=>{
 const data=model({caseId:'m2.3',stepId:'audit-user-empty-relations',method:'POST',requestPath:'/api/platform/users',body:{username:'m_'+runId.replaceAll('-','')}}),row=proofRow(data);row.target_id=targetId;
 const parent={...owned('platform_user',targetId,'m2.3',{username:data.entry.expectedParent.selector.username}),creationProof:{kind:'mikro-orm-afterCreate-outer-commit',createContext:structuredClone(data.context),commitContext:structuredClone(data.context)}};data.j.objects.push(parent);assertAuditRowScope(data.j,'audit_log',row,data.scope);
 for(const name of['runId','caseId','index','op']){const changed=structuredClone(data);changed.j.objects.at(-1).creationProof.commitContext[name]=name==='index'?data.context.index+1:'foreign';assert.throws(()=>assertAuditRowScope(changed.j,'audit_log',row,changed.scope))}
});
test('the two original E cells keep actual wire IDs explicit/empty, without lying about ordinary ownership',()=>{
 for(const stepId of['E-settings-update','E-settings-update-noop']){const data=model({sourceKind:'E-setting',caseId:leaseCase,stepId}),descriptor=data.entry.descriptor;validateAuditAdmission(data.entry,data.j);assertAuditRowScope(data.j,'audit_log',proofRow(data),data.scope);
  const receipt={auditIdentityAdmissionId:data.entry.id,index:data.context.index,sourceStepId:stepId,ownershipRequestId:data.scope.requestId,requestId:descriptor.actualRequestId,actualRequestId:descriptor.actualRequestId,actualCorrelationId:descriptor.actualCorrelationId,method:descriptor.method,path:descriptor.path,requestBodySha256:sha(JSON.stringify(descriptor.body))};validateSettingAuditRequestReceipt(data.j,receipt,data.scope);
  for(const mutate of[r=>r.requestId=data.scope.requestId,r=>r.index++,r=>r.actualCorrelationId='foreign',r=>r.requestBodySha256='0'.repeat(64)]){const r=structuredClone(receipt);mutate(r);assert.throws(()=>validateSettingAuditRequestReceipt(data.j,r,data.scope))}
  const duplicate=model({sourceKind:'E-setting',caseId:leaseCase,stepId,index:8}).entry;duplicate.id='80000000-0000-4000-8000-000000000008';data.j.auditIdentityAdmissions.push(duplicate);assert.throws(()=>validateAuditIdentityJournal(data.j));
 }
});
test('source projection, precise Root approval, exact lease and C file pin are required before an actual admission',()=>{
 const data=model();for(const mutate of[d=>d.entry.auditSelector.request_id='',d=>d.entry.actorId=targetId,d=>d.entry.context.index++,d=>d.entry.context.op='m.producer',d=>d.entry.approval.marker='old-marker']){const d=structuredClone(data);mutate(d);assert.throws(()=>validateAuditAdmission(d.entry,d.j))}
 const fake={j:data.j,backend:'nest',actors:{admin:actorId},scope:()=>data.scope};assert.throws(()=>admitAuditIdentity(fake,{sourceKind:data.entry.sourceKind,descriptor:data.entry.descriptor,request:data.entry.request,context:data.context},data.entry.approval));
 const setting=model({sourceKind:'E-setting',caseId:leaseCase,stepId:'E-settings-update'});setting.j.baselineSettingLease.caseId='other';assert.throws(()=>validateAuditAdmission(setting.entry,setting.j));
});
