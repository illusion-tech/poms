// Next API source epoch only. Import opens no environment, private files or DB.
// The actual Fixture remains the authority for absence/COMMIT/visibility.
import assert from 'node:assert/strict';
import {insertPreparedTodoSource} from './acceptance-prepared.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const shapeRow=row=>({...row,...Object.fromEntries(Object.entries(row).filter(([key])=>key.includes('_')).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value]))});

export function preparedSourceIdentities(sourcePlan){
    const {sourceKind,plan}=sourcePlan;let rows;
    if(sourceKind==='handover'){
        assert.equal(plan?.kind,'originalSeeder-prepared-state-pure-source-plan');assert.equal(plan.result,'pure-plan');
        rows=plan.statements.filter(statement=>statement.kind==='INSERT').flatMap(statement=>statement.uuidRefs.filter(reference=>reference.column==='id').map(reference=>({table:statement.table,id:reference.uuid})));
    }else{assert(Array.isArray(plan?.rows),'Exact original source row list required');rows=plan.rows.map(row=>({table:row.table,id:row.values.id}))}
    assert(rows.length>0&&rows.every(row=>typeof row.table==='string'&&uuid.test(row.id)),'Exact source table/PK pairs required');
    rows=rows.map(row=>({...row,id:row.id.toLowerCase()}));assert.equal(new Set(rows.map(row=>row.table+':'+row.id)).size,rows.length,'Duplicate source physical PK');assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Source physical PK cannot ambiguously name two tables');
    return rows;
}

export function bindAppliedPreparedRows({sourcePlan,rows,fixture}){
    assert(Array.isArray(rows),'Fixture direct result must expose its actual row array');const identities=preparedSourceIdentities(sourcePlan);
    assert.equal(rows.length,identities.length,'Every original prepared row must have one actual result');
    const indexed=new Map();for(const row of rows){assert(uuid.test(row.id));const matches=identities.filter(item=>item.id===row.id.toLowerCase());assert.equal(matches.length,1,'Actual result is absent from original source physical PKs');const declared=matches[0],key=declared.table+':'+declared.id;assert(!indexed.has(key),'Duplicate actual prepared result');
        const owned=fixture.j.objects.filter(item=>item.table===declared.table&&item.id===declared.id);assert.equal(owned.length,1,'Prepared response/query ID is not a fixture ownership proof');assert.equal(owned[0].creationProof?.kind,'direct-committed-insert');assert.equal(owned[0].postcondition?.independentlyVisible,true);
        for(const[key,value]of Object.entries(owned[0].identity))assert.deepEqual(row[key],value,'Actual prepared row differs from its independently proven identity');indexed.set(key,row);
    }
    const bindings={};for(const[table,slot]of Object.entries(sourcePlan.bindPrepared??{})){const selected=identities.filter(item=>item.table===table);assert.equal(selected.length,1,'Prepared binding must name exactly one original physical row');bindings[slot]=shapeRow(indexed.get(table+':'+selected[0].id))}
    return bindings;
}

export function preserveCertifiedLocalProject({fixture,sourcePlan,operation}){
    assert.equal(sourcePlan.sourceKind,'draft-contract');assert.equal(sourcePlan.bindPrepared?.project,'project');assert(operation?.preparedSource===true&&operation.nativeProducerClaimed===false);const project=operation.bindings?.project;assert(uuid.test(project?.id),'Actual prepared project binding required before K can replace project');
    const original=preparedSourceIdentities(sourcePlan).filter(row=>row.table==='project'&&row.id===project.id);assert.equal(original.length,1);const owned=fixture.j.objects.filter(row=>row.table==='project'&&row.id===project.id);assert.equal(owned.length,1,'The preserved project must already have its original fixture admission');assert.equal(owned[0].creationProof?.kind,'direct-committed-insert');assert.equal(owned[0].postcondition?.independentlyVisible,true);for(const[column,value]of Object.entries(owned[0].identity))assert.deepEqual(project[column],value);
    return{...operation,bindings:{...operation.bindings,localProject:structuredClone(project)},localProjectSource:{kind:'actual-already-certified-original-local-project-binding',table:'project',id:project.id,producerClaimed:false,ownershipGranted:false}};
}
export function preserveCertifiedHandoverProject({fixture,sourcePlan,operation}){
    assert.equal(sourcePlan.sourceKind,'handover');assert.equal(sourcePlan.bindPrepared?.project,'project');assert(operation?.preparedSource===true&&operation.nativeProducerClaimed===false&&operation.sourceBoundary?.preparedDraftOnly===true);const project=operation.bindings?.project;assert(uuid.test(project?.id));assert.equal(preparedSourceIdentities(sourcePlan).filter(row=>row.table==='project'&&row.id===project.id).length,1);const owned=fixture.j.objects.filter(row=>row.table==='project'&&row.id===project.id);assert.equal(owned.length,1);assert.equal(owned[0].creationProof?.kind,'direct-committed-insert');assert.equal(owned[0].creationProof?.sourcePlanId,operation.sourcePlanId);assert.equal(owned[0].postcondition?.independentlyVisible,true);for(const[column,value]of Object.entries(owned[0].identity))assert.deepEqual(project[column],value);
    return{...operation,bindings:{...operation.bindings,handoverProject:structuredClone(project)},handoverProjectSource:{kind:'actual-already-certified-original-K-project-binding',table:'project',id:project.id,producerClaimed:false,ownershipGranted:false}};
}

export async function applyExactPreparedSource({fixture,sourceReader,sourceCapId,sourcePlan,caseId,retain}){
    assert.equal(typeof retain,'function');sourceReader.read('tools/rust-r2m-continuation01/acceptance-prepared-result.mjs');const {sourceKind,plan}=sourcePlan;let rows,actualReceipt=null,sourceBoundary=null,sourcePlanId=null;
    if(sourceKind==='handover'){
        const applied=await fixture.insertHandoverPreparedBatch(plan,{caseId});rows=applied.rows;actualReceipt=applied.receipt;sourcePlanId=applied.sourcePlanId;
        assert.equal(actualReceipt?.kind,'original-handover-draft-cohort-actual-direct-commit');assert.equal(actualReceipt.NativeProducerClaimed,false);assert.equal(actualReceipt.currentActualNativeConfirmationStillRequired,true);
        const registered=fixture.j.preparedBatches.filter(item=>item.id===sourcePlanId);assert.equal(registered.length,1);sourceBoundary=registered[0].sourceBoundary;assert(sourceBoundary.preparedDraftOnly&&sourceBoundary.actualNativeConfirmationRequired&&sourceBoundary.actualNativeProducerClaimed===false);
    }else if(sourceKind==='commission')rows=await fixture.insertPreparedBatch(plan,{caseId});
    else if(sourceKind==='todo-six-facts'){
        const applied=await insertPreparedTodoSource({fixture,sourceReader,input:sourcePlan.input,casePrefix:caseId+'.todo',sourceCapId,retain});rows=applied.rows;actualReceipt=applied.receipt;assert.deepEqual(applied.plan,plan,'Actual prepared Todo adapter must execute the exact materialized original plan');
    }else{assert.equal(sourceKind,'draft-contract');rows=[];for(const row of plan.rows)rows.push(await fixture.insert(row.table,row.values,{caseId}))}
    const bindings=bindAppliedPreparedRows({sourcePlan,rows,fixture}),evidence=await retain({kind:'actual-exact-prepared-source-result',record:{sourceCapId,caseId,sourceKind,sourcePlanId,sourceBoundary,actualReceipt,originalPlan:plan,preparedNotNativeGenerated:true}});sourceReader.assertUnchanged();
    return{sourceCapId,preparedSource:true,nativeProducerClaimed:false,bindings,actualPreparedEvidence:evidence,...(sourceBoundary?{sourceBoundary}:{}),...(sourcePlanId?{sourcePlanId}:{}),...(actualReceipt?{actualReceipt}:{})};
}
