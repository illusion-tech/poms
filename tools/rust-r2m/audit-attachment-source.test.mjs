// Protected original source and controlled in-memory proofs only. No actual IO.
import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {SourceReader} from './acceptance-source.mjs';
import {attachmentProviderAuditSources,attachmentProviderBusinessAuditProfile} from './audit-attachment-source.mjs';
import {validateAuditAdmission,auditIdentityForIntent,assertAuditRowScope,admitAuditIdentity} from './fixture-audit-identity.mjs';
import {caseIdentity,digest} from './fixture-core.mjs';
const root=path.resolve(import.meta.dirname,'../..'),runId='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000002',providerId='30000000-0000-4000-8000-000000000003',auditId='40000000-0000-4000-8000-000000000004',marker='1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5';
const reader=()=>new SourceReader({root,pins:attachmentProviderAuditSources,sourceEpoch:'synthetic-only'});
const cases=[['M4.1','local-provider','local',true],['M4.1','default','local',false],['M4.4','obs-provider','huawei-obs-s3',true],['M4.4','obs-default','huawei-obs-s3',false],['M4.4','local-default','local',false],['UI4','ui4-local-provider','local',true],['UI4','ui4-local-default','local',false]];
function model(index=0){const[logicalCase,stepId,provider,create]=cases[index],caseId=logicalCase==='UI4'?'m.ui4.integration':'m4.integration',context={runId,caseId,index:11,op:logicalCase==='UI4'?'m.producer':'m.http'},scope={...caseIdentity(runId,caseId),actors:[actorId],borrowedActors:[],borrowedDefinitions:[],projects:[]},request={logicalCase,stepId,method:'POST',path:'/api/platform/attachment-storage-providers'+(create?'':'/'+providerId+':set-default'),body:create?{providerType:provider,keyPrefix:'poms-r2m/'+runId,enabled:true}:{expectedVersion:1}},descriptor=attachmentProviderBusinessAuditProfile({sourceReader:reader(),sourceCapId:'synthetic-only',context,request,actorId});
    const j={runId,backend:'nest',state:'prepared',cases:[scope],objects:[{table:'platform_user',id:actorId,caseId:'base',creationProof:{kind:'direct-committed-insert'},postcondition:{independentlyVisible:true}}],committedCreates:[],intents:[],base:{accounts:[{account:'admin',userId:actorId}]}};
    if(!create)j.objects.push({table:'attachment_storage_provider_config',id:providerId,caseId,identity:{id:providerId,provider_type:provider,created_by:actorId},creationProof:{kind:'direct-committed-insert'},postcondition:{independentlyVisible:true}});
    const approval={kind:'Root-R2M-source-bound-audit-identity-admission',rootApproved:true,namespace:'poms-r2m',marker,runId,backend:'nest',database:'poms_r2m_nest',sourceCapId:'synthetic-only',allowedSourceKinds:['attachment-provider-null'],sourceReview:{syntheticOnly:true}},entry={kind:'R2M-source-bound-audit-request-identity-admission',id:'50000000-0000-4000-8000-000000000005',sourceKind:'attachment-provider-null',descriptor,request,context,actorId,backend:'nest',ownershipRequestId:scope.requestId,wireRequestId:scope.requestId,auditSelector:descriptor.auditSelector,expectedParent:descriptor.expectedParent,descriptorSha256:digest(descriptor),approval,approvalSha256:digest(approval),ordinaryScopeRequestIdChanged:false,resourceOwnershipGranted:false};j.auditIdentityAdmissions=[entry];const intent={id:'60000000-0000-4000-8000-000000000006',table:'audit_log',caseId,selector:descriptor.auditSelector,expectedMax:1,contextIndex:11,auditIdentityAdmissionId:entry.id};j.intents.push(intent);return{j,scope,request,context,descriptor,entry,intent,create};
}
function auditRow(d){const row={id:auditId,...d.entry.auditSelector,target_id:providerId};d.j.committedCreates.push({table:'audit_log',id:auditId,proof:{createContext:structuredClone(d.context)}});return row}

test('only five frozen API provider steps and two exact UI4 prepared steps project original NULL request metadata',()=>{
    for(let i=0;i<cases.length;i++){const d=model(i);assert(d.descriptor);validateAuditAdmission(d.entry,d.j);auditIdentityForIntent(d.j,d.intent,d.context);assert.equal(d.descriptor.expectedAuditRequestId,null);assert.equal(d.descriptor.fixtureOwnershipGranted,false);assert.equal(d.entry.wireRequestId,d.scope.requestId);assert.equal(d.intent.expectedMax,1);assert.deepEqual(Object.keys(d.entry.expectedParent.selector).sort(),['created_by','provider_type']);assert(!Object.hasOwn(d.entry.expectedParent.selector,'key_prefix'))}
});

test('no unlisted method, step, source case or producer operation gains a provider audit projection',()=>{
    for(const mutate of[d=>d.request.stepId='arbitrary-update',d=>d.request.method='PATCH',d=>d.context.caseId='m5.integration',d=>d.context.op='m.producer',d=>d.request.logicalCase='UI4']){const d=model();mutate(d);assert.equal(attachmentProviderBusinessAuditProfile({sourceReader:reader(),sourceCapId:'synthetic-only',context:d.context,request:d.request,actorId}),null)}
    const d=model(5);d.context.caseId='m.ui3.integration';assert.equal(attachmentProviderBusinessAuditProfile({sourceReader:reader(),sourceCapId:'synthetic-only',context:d.context,request:d.request,actorId}),null);
});

test('default-set requires the real typed owned provider with its original immutable type and creator',()=>{
    const d=model(1);assertAuditRowScope(d.j,'audit_log',auditRow(d),d.scope);for(const mutate of[x=>x.j.objects.pop(),x=>x.j.objects.at(-1).identity.provider_type='huawei-obs-s3',x=>x.j.objects.at(-1).identity.created_by=providerId,x=>x.entry.auditSelector.operator_id=null]){const x=model(1);mutate(x);assert.throws(()=>validateAuditAdmission(x.entry,x.j))}
});

test('a new provider target needs independently visible actual same-index parent creation and exact Native outer COMMIT context',()=>{
    for(const index of[0,5]){const d=model(index),row=auditRow(d);assert.throws(()=>assertAuditRowScope(d.j,'audit_log',row,d.scope));const parent={table:'attachment_storage_provider_config',id:providerId,caseId:d.context.caseId,identity:{id:providerId,...d.entry.expectedParent.selector},creationProof:{kind:'mikro-orm-afterCreate-outer-commit',createContext:structuredClone(d.context),commitContext:structuredClone(d.context)},postcondition:{independentlyVisible:true}};d.j.objects.push(parent);assertAuditRowScope(d.j,'audit_log',row,d.scope);parent.creationProof.commitContext.index++;assert.throws(()=>assertAuditRowScope(d.j,'audit_log',row,d.scope))}
});

test('an original source descriptor does not itself grant Root/C approval, anonymous audit authority or a general NULL alias',()=>{
    const d=model(),fixture={j:d.j,actors:{admin:actorId},backend:'nest',scope:()=>d.scope};assert.throws(()=>admitAuditIdentity(fixture,{sourceKind:'attachment-provider-null',descriptor:d.descriptor,context:d.context,request:d.request},d.entry.approval));const row=auditRow(d);assert.throws(()=>assertAuditRowScope({...d.j,auditIdentityAdmissions:[]},'audit_log',row,d.scope));const x=model();x.entry.approval.rootApproved=false;x.entry.approvalSha256=digest(x.entry.approval);assert.throws(()=>validateAuditAdmission(x.entry,x.j));
});
