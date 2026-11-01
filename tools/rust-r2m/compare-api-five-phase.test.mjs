// Synthetic held values over exact public entity bytes. No private/runtime I/O.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyCommonUpdatedAtPhase,commonUpdatedAtSources} from './compare-api-five-phase.mjs';
const id='b5000000-0000-4000-8000-000000000001',context={runId:'b5000000-0000-4000-8000-000000000002',caseId:'m3.uow.v3',index:7,op:'m.internal-uow'},names=['parent-loaded','parent-second-Todo-dirty','after-original-service-child','after-outer-action-held-bindings','after-cached-reread','after-clear-reread-with-held-bindings'];
function sample(first=3,value='700'){
    const table='todo_item',source=commonUpdatedAtSources.find(p=>p.table===table),old='2026-10-31T00:00:00.100Z',current='2026-10-31T00:00:00.'+value+'Z',times=['200','300','600','800','850','900'],observation={kind:'private-actual-original-shared-parent-UoW-observation',context,result:'observed',stages:names.map((name,n)=>({name,at:'2026-10-31T00:00:00.'+times[n]+'Z',managed:[],held:{todoB:{table,id,properties:{updatedAt:{kind:'date',value:n>=first?current:old}}}}}))};
    return{table,id,value:'2026-10-31T08:00:00.'+value+'+08:00',context,sourceCap:{id:'pure-phase-only',files:[source]},entitySourceBytes:fs.readFileSync(source.file),observation};
}
test('source-pinned original callback and first actual held-property stage distinguish child from outer without an overall-window alias',()=>{
    const child=classifyCommonUpdatedAtPhase(sample(2,'500')),outer=classifyCommonUpdatedAtPhase(sample());assert.equal(child.result,'source-phase-proved');assert.equal(child.phase,'child');assert.equal(outer.phase,'outer');assert.notEqual(child.sourceWindowSha256,outer.sourceWindowSha256);assert.equal(outer.precisionAllowanceMs,0);assert.equal(outer.crossBackendEquivalenceClaimed,false);assert.equal(outer.ownershipGranted,false);
});
test('one-microsecond mismatch, a late cached first observation or a clock outside the proven stage stay Pending',()=>{
    for(const args of[{...sample(),value:'2026-10-31T08:00:00.700001+08:00'},sample(4,'700'),sample(2,'700')]){const out=classifyCommonUpdatedAtPhase(args);assert.equal(out.result,'source-phase-pending');assert.equal(out.phase,null);}const wrongType=sample();wrongType.observation.stages[3].held.todoB.properties.updatedAt.kind='string';wrongType.observation.stages[4].held.todoB.properties.updatedAt.kind='string';wrongType.observation.stages[5].held.todoB.properties.updatedAt.kind='string';assert.equal(classifyCommonUpdatedAtPhase(wrongType).result,'source-phase-pending');
});
test('different original entity bytes, missing phase inventory and an HTTP context cannot certify an internal phase',()=>{
    const args=sample();assert.throws(()=>classifyCommonUpdatedAtPhase({...args,entitySourceBytes:Buffer.from(args.entitySourceBytes.toString().replace('onUpdate','onCreate'))}));const stages=sample();stages.observation.stages.pop();assert.throws(()=>classifyCommonUpdatedAtPhase(stages));assert.throws(()=>classifyCommonUpdatedAtPhase({...args,context:{...context,op:'m.http'}}));
});
