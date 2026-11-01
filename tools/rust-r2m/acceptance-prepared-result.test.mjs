import test from 'node:test';
import assert from 'node:assert/strict';
import {preparedSourceIdentities,bindAppliedPreparedRows,applyExactPreparedSource} from './acceptance-prepared-result.mjs';

const projectId='10000000-0000-4000-8000-000000000001',handoverId='20000000-0000-4000-8000-000000000002',logicalId='30000000-0000-4000-8000-000000000003';
const plan={kind:'originalSeeder-prepared-state-pure-source-plan',result:'pure-plan',rows:2,statements:[{kind:'INSERT',table:'project',uuidRefs:[{column:'id',uuid:projectId}]},{kind:'INSERT',table:'project_handover',uuidRefs:[{column:'id',uuid:handoverId},{column:'project_id',uuid:projectId},{column:'logical_no_row',uuid:logicalId}]},{kind:'UPDATE',table:'project',uuidRefs:[{column:'id',uuid:projectId}]}]};
const sourcePlan={sourceKind:'handover',plan,bindPrepared:{project:'project',project_handover:'handover'}},rows=[{id:projectId,project_no:'pure-p',row_version:1},{id:handoverId,project_id:projectId,row_version:1,status:'draft'}];
const fixture=()=>({j:{objects:rows.map((row,index)=>({table:index?'project_handover':'project',id:row.id,identity:{id:row.id},creationProof:{kind:'direct-committed-insert'},postcondition:{independentlyVisible:true}})),preparedBatches:[{id:'pure-source-plan',sourceBoundary:{preparedDraftOnly:true,actualNativeConfirmationRequired:true,actualNativeProducerClaimed:false}}]},insertHandoverPreparedBatch:async()=>({rows,sourcePlanId:'pure-source-plan',receipt:{kind:'original-handover-draft-cohort-actual-direct-commit',NativeProducerClaimed:false,currentActualNativeConfirmationStillRequired:true}})});

test('original K count-shaped rows bind by source INSERT PKs, never UPDATE/ref-only logical IDs',()=>{
    assert.deepEqual(preparedSourceIdentities(sourcePlan),[{table:'project',id:projectId},{table:'project_handover',id:handoverId}]);const bindings=bindAppliedPreparedRows({sourcePlan,rows,fixture:fixture()});assert.equal(bindings.project.rowVersion,1);assert.equal(bindings.handover.projectId,projectId);
    assert.throws(()=>bindAppliedPreparedRows({sourcePlan,rows:[...rows,{id:logicalId}],fixture:fixture()}));const unowned=fixture();unowned.j.objects.pop();assert.throws(()=>bindAppliedPreparedRows({sourcePlan,rows,fixture:unowned}));
});

test('actual handover object-shaped result retains its original direct receipt and draft source boundary',async()=>{
    const retained=[],result=await applyExactPreparedSource({fixture:fixture(),sourceReader:{read(){},assertUnchanged(){}},sourceCapId:'pure-cap',sourcePlan,caseId:'m4.integration',retain:async value=>{retained.push(value);return{file:'pure-memory-only',rawBytesSha256:'a'.repeat(64)}}});
    assert.equal(result.bindings.handover.id,handoverId);assert.equal(result.sourceBoundary.actualNativeConfirmationRequired,true);assert.equal(result.actualReceipt.NativeProducerClaimed,false);assert.equal(retained[0].record.originalPlan,plan);
    const bad=fixture();bad.insertHandoverPreparedBatch=async()=>({rows,sourcePlanId:'pure-source-plan',receipt:{kind:'original-handover-draft-cohort-actual-direct-commit',NativeProducerClaimed:true,currentActualNativeConfirmationStillRequired:false}});await assert.rejects(()=>applyExactPreparedSource({fixture:bad,sourceReader:{read(){},assertUnchanged(){}},sourceCapId:'pure-cap',sourcePlan,caseId:'m4.integration',retain:async()=>({})}));
});
