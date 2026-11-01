// Uses the same real binding/request constructors over explicit synthetic
// identities before any actual fixture opens. No ID is an ownership claim.
import assert from 'node:assert/strict';
import {buildRuntimeCaseBindings} from './acceptance-api-bindings.mjs';
import {auditApiPlans,buildScenarioPlans,caseNames,firstApiSubset,materializeRequest,nativeProducerRoutes} from './acceptance-api-scenario.mjs';
import {createDispatch} from './acceptance-dispatch.mjs';
import {verifyUserCompatibilitySource} from './acceptance-api-user-compatibility.mjs';

export async function preflightNamedApiBindings(input,{selection=firstApiSubset,sourceReader}={}){
    const plan=auditApiPlans(input,{selection});assert(selection.every(id=>firstApiSubset.includes(id)),'Only the named8 source implementation is ready');
    if(selection.some(id=>['M2.1','M2.3'].includes(id)))verifyUserCompatibilitySource(sourceReader);
    const runId='10000000-0000-4000-8000-000000000001',admin='20000000-0000-4000-8000-000000000002',viewer='30000000-0000-4000-8000-000000000003',org='40000000-0000-4000-8000-000000000004';let ordinal=10,requestRecipes=0,internalProbeRecipes=0;
    let shared={runId,actors:{admin,viewer},roles:{admin,viewer},orgs:{admin:org,viewer:org},profile:{admin:{userId:admin},viewer:{userId:viewer}},credentials:{admin:{username:'source-only',password:'not-used'},viewer:{username:'source-only-viewer',password:'not-used'}},missingId:'50000000-0000-4000-8000-000000000005'};
    const fixture={runId,actors:shared.actors,base:{accounts:[{account:'admin',orgId:org}]},j:{borrowed:{definitions:[]}},scope(caseId){return{caseId}},async planProject(){assert.fail('The named8 constructor may not conceal project preparation')}};
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    for(const caseId of selection){
        const built=await buildRuntimeCaseBindings({caseId,sourceCaseId:caseId.toLowerCase(),fixture,bindings:shared,sourceReader});assert(built.businessRowsInserted===0&&built.businessProducerRequests===0);const values={...shared,...built,names:caseNames(runId,caseId)};
        for(const original of buildScenarioPlans(input).find(item=>item.id===caseId).steps){
            const step=materializeRequest(original,values);if(step.kind==='request'){const actual=dispatch.resolve({method:step.method,path:step.path,backend:'rust',purpose:step.purpose});assert.equal(actual.executionBackend,'rust');requestRecipes++}if(step.kind==='internal-probe')internalProbeRecipes++;
            for(const binding of step.bindRows??[]){const id='60000000-0000-4000-8000-'+String(ordinal++).padStart(12,'0');values[binding.slot]=Object.fromEntries(Object.entries(binding.view).map(([key,column])=>[key,column==='id'?id:column==='row_version'?1:null]))}
        }
        shared=values;
    }
    return{...plan,kind:'r2m-named8-same-constructor-binding-preflight',requestRecipes,internalProbeRecipes,syntheticIdentitiesOnly:true,actualBusinessRowsInserted:0,actualRequests:0,actualExecution:false};
}
