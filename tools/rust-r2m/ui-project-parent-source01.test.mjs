// Original UI source variant plus real fixture guards over controlled rows.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{uiStepScope}from'./ui-runtime-sources-project-parent01.mjs';
import{Fixture}from'./fixture.mjs';import{caseIdentity,identities}from'./fixture-core.mjs';
const runId='10000000-0000-4000-8000-000000000001',actors={admin:'20000000-0000-4000-8000-000000000002',viewer:'30000000-0000-4000-8000-000000000003'},projectId='40000000-0000-4000-8000-000000000004',contractId='50000000-0000-4000-8000-000000000005',handoverId='60000000-0000-4000-8000-000000000006';
const prepared={contract:{project:{id:projectId},contract:{id:contractId}},handover:{project:{id:projectId},handover:{id:handoverId},upload:{name:'controlled.txt'}}};
function fake(caseId){let queries=0;const scope={...caseIdentity(runId,caseId),actors:Object.values(actors),projects:[projectId],borrowedActors:[],borrowedDefinitions:[]},creationProof={kind:'direct-committed-insert'},postcondition={independentlyVisible:true};const f=Object.create(Fixture.prototype);Object.assign(f,{runId,backend:'nest',j:{runId,state:'prepared',cases:[scope],objects:[{table:'project',id:projectId,caseId,identity:{id:projectId,created_by:actors.admin},creationProof,postcondition},{table:'project_handover',id:handoverId,caseId,identity:{id:handoverId,project_id:projectId,created_by:actors.admin},creationProof,postcondition}],intents:[]},preflight:async()=>{},save(){},client:{async query(){queries++;return{rows:[]}}}});return{f,queries:()=>queries}}

test('the real unchanged fixture rejects old project-less approval/Todo selectors and accepts the exact UI3 proved project',async()=>{
    const spec=uiStepScope({descriptor:{journey:'UI3',id:'original-native-resubmit'},prepared,actors});
    for(const table of['approval_record','todo_item']){const row=spec.intents.find(x=>x.table===table);assert.equal(row.selector.project_id,projectId);const before=fake(spec.caseId);await assert.rejects(()=>before.f.intent(table,{target_object_id:contractId},{caseId:spec.caseId,expectedMax:2}),/Missing explicit project parent/);assert.equal(before.queries(),0);const after=fake(spec.caseId);await after.f.intent(table,row.selector,{caseId:spec.caseId,expectedMax:2});assert.equal(after.queries(),1)}
});

test('each current UI step table whose original immutable identity requires project_id supplies the source-owned project',async()=>{
    for(const[journey,ids]of[['UI3',['original-native-resubmit']],['UI4',['upload','checklist-refresh-select','package-create','package-download','cancel-upload-dialog']]])for(const id of ids){const spec=uiStepScope({descriptor:{journey,id},prepared,actors});for(const intent of spec.intents)if(identities[intent.table].includes('project_id')){assert.equal(intent.selector.project_id,projectId,intent.table);const{f}=fake(spec.caseId);await f.intent(intent.table,intent.selector,{caseId:spec.caseId,expectedMax:intent.expectedMax})}}
});

test('the adoption variant has only known project selectors and keeps its original Native submit scope without any new audit/profile dependency',()=>{
    const body=fs.readFileSync('tools/rust-r2m/ui-runtime-sources-project-parent01.mjs','utf8');assert(body.includes("{table:'approval_record',selector:{target_object_id:contractId,project_id:projectId},expectedMax:2}"));assert(body.includes("{table:'todo_item',selector:{target_object_id:contractId,project_id:projectId},expectedMax:2}"));assert(!body.includes('audit-attachment-source'));assert(!body.includes('auditIdentityApproval'));assert(body.includes("op:'m.producer'"));
});
