// Structural full20 rehearsal over source constructors and explicitly fake
// identities. No fixture, row ownership, Native producer or HTTP is invoked.
import assert from 'node:assert/strict';
import {buildRuntimeCaseBindings} from './acceptance-api-bindings.mjs';
import {auditApiPlans,buildScenarioPlans,caseNames,declaredAnonymousScopeCases,materializeRequest,materializePrepared,nativeProducerRoutes} from './acceptance-api-scenario.mjs';
import {createDispatch} from './acceptance-dispatch.mjs';
import {canonicalDefinitions,ownershipIdentities} from './fixture-policy.mjs';
import {preparedSourceIdentities} from './acceptance-prepared-result.mjs';
import {randomUUID} from 'node:crypto';
import {verifyUserCompatibilitySource} from './acceptance-api-user-compatibility.mjs';
import {verifyReadonlyPrincipalLoginSource} from './acceptance-api-principal-source.mjs';
import {externalAuditProjectionInputs,externalBusinessAuditProfile} from './acceptance-api-external-audit-source.mjs';
import {originalDraftSourceMetadata,assertSourceIntentProjectParents,verifyM3InputCompatibilitySource} from './acceptance-api-prepared-source-check.mjs';
import {buildSharedUowCohortPlan,uowVariants} from './acceptance-producers.mjs';
import {verifyM4VersionCompatibilitySource} from './acceptance-api-m4-source-check.mjs';
export const apiCaseDependencies=Object.freeze({'M4.2':['M4.1'],'M4.3':['M4.1','M4.2'],'M4.4':['M4.1'],'M5.2':['M5.1'],'M5.3':['M5.1','M5.2']});
export function validateApiCaseOrder(selection){for(const[id,dependencies]of Object.entries(apiCaseDependencies))if(selection.includes(id))for(const dependency of dependencies)assert(selection.includes(dependency)&&selection.indexOf(dependency)<selection.indexOf(id),'Exact case dependency must run first: '+dependency+' -> '+id);return true}
export function assertM4ImmutableProjectParents(step){for(const intent of step.intents??[])if(ownershipIdentities[intent.table]?.includes('project_id'))assert(typeof intent.selector.project_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(intent.selector.project_id),'M4 immutable project_id requires its explicit already-bound project: '+intent.table);return true;}
const alias=row=>({...row,...Object.fromEntries(Object.entries(row).filter(([key])=>key.includes('_')).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value]))});
// The source INSERT may omit a database-default row_version. Its synthetic
// rehearsal value is a binding placeholder, never a metadata or SQL receipt.
const structuralRow=row=>alias({row_version:1,...row});

export async function preflightFullApiBindings(input,{selection=buildScenarioPlans(input).map(plan=>plan.id),sourceReader}={}){
    assert(sourceReader,'Explicit pinned public source reader required');const audit=auditApiPlans(input,{selection}),plans=buildScenarioPlans(input),dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    if(selection.some(id=>['M2.1','M2.3'].includes(id)))verifyUserCompatibilitySource(sourceReader);
    if(selection.some(id=>id.startsWith('M3.'))){verifyReadonlyPrincipalLoginSource(sourceReader);verifyM3InputCompatibilitySource(sourceReader)}
    if(selection.some(id=>id.startsWith('M4.')))verifyM4VersionCompatibilitySource(sourceReader);
    validateApiCaseOrder(selection);const authority=sourceReader.json('tools/rust-r2m/reference-authority.json');for(const plan of plans)for(const step of plan.steps)for(const binding of step.bindRows??[]){const table=authority.tables.find(row=>row.name===binding.table);for(const column of Object.values(binding.view))assert(table?.columns.some(row=>row.name===column),'Binding must name an actual physical column: '+binding.table+'.'+column)}
    const sourceMetadata=originalDraftSourceMetadata(sourceReader),runId=randomUUID(),admin=randomUUID(),viewer=randomUUID(),org=randomUUID();let plannedProjects=0,requestRecipes=0,internalProbeRecipes=0,supplierRecipes=0,preparedRecipes=0,sourceBoundExternalAuditRequests=0,externalAuditSelectors=0,realPreparedConstructors=0,sharedUowCohortConstructors=0;
    const next=randomUUID,fixture={runId,actors:{admin,viewer},base:{accounts:[{account:'admin',orgId:org}]},j:{borrowed:{definitions:canonicalDefinitions.map(row=>({...row,readOnly:true}))}},scope(caseId){return{caseId}},async planProject(){plannedProjects++;return next()}};
    let shared={runId,actors:{admin,viewer},borrowedActors:{approver:'00000000-0000-4000-8000-000000000008',finance:'00000000-0000-4000-8000-000000000014'},roles:{admin,viewer},orgs:{admin:org,viewer:org},profile:{admin:{id:admin,userId:admin,displayName:'source-only'},viewer:{id:viewer,userId:viewer}},credentials:{admin:{username:'source-only',password:'not-used'},viewer:{username:'source-only-viewer',password:'not-used'}},missingId:'50000000-0000-4000-8000-000000000005'};
    for(const caseId of selection){
        const made=await buildRuntimeCaseBindings({caseId,sourceCaseId:caseId.startsWith('M4.')?'m4.integration':caseId.startsWith('M5.')?'m5.integration':caseId.toLowerCase(),fixture,bindings:shared,sourceReader});assert(made.businessRowsInserted===0&&made.businessProducerRequests===0);const values={...shared,...made,names:caseNames(runId,caseId)};
        for(const original of plans.find(plan=>plan.id===caseId).steps){
            let step;try{step=materializeRequest(original,values)}catch(error){error.message='Full20 source-only '+caseId+'/'+original.id+': '+error.message;throw error}
            if(step.kind==='request'){dispatch.resolve({method:step.method,path:step.path,backend:'rust',purpose:step.purpose});if(caseId.startsWith('M3.'))assertSourceIntentProjectParents(step);if(caseId.startsWith('M4.'))assertM4ImmutableProjectParents(step);requestRecipes++;if(caseId.startsWith('M5.')){const profile=externalBusinessAuditProfile({sourceReader,sourceCapId:'pure-constructor-rehearsal',context:{runId,caseId:'m5.integration',index:requestRecipes,op:'m.http'},request:{...step,logicalCase:caseId,stepId:step.id},inputs:externalAuditProjectionInputs(values)});if(profile){sourceBoundExternalAuditRequests++;externalAuditSelectors+=profile.items.length}}}
            if(step.kind==='internal-probe'){internalProbeRecipes++;if(step.operation==='common-shared-uow')for(const{variant}of uowVariants){const source=await buildSharedUowCohortPlan({runId,adminId:admin,viewerId:viewer,orgId:org,projectId:next(),variant,sourceReader});assert.equal(source.plan.rows.length,18);assert.equal(source.originalProjectCustomerId,null);sharedUowCohortConstructors++;}}
            if(step.kind==='supplier'){
                supplierRecipes++;
                if(step.operation==='owned-oauth-callback-input')values.oauth={callbackQuery:'code=source-only&state=source-only'};
                if(step.operation==='owned-oauth-grant-callback-input')values.oauthGrant={callbackQuery:'code=source-only&state=source-only'};
                if(step.operation==='owned-external-ticket-from-response')values.oauth={...values.oauth,ticket:'source-only-not-an-actual-ticket-0000000000000000'};
            }
            if(step.kind==='prepared-source'){
                preparedRecipes++;let rowPlans;
                const source=await materializePrepared(step,values,{sourceReader,metadata:sourceMetadata.metadata});realPreparedConstructors++;
                rowPlans=Array.isArray(source.plan.rows)?source.plan.rows:preparedSourceIdentities(source).map(row=>({table:row.table,values:{id:row.id,row_version:1,project_id:step.input.fixture.projectId}}));
                for(const[table,slot]of Object.entries(step.bindPrepared??{})){const found=rowPlans.filter(row=>row.table===table);assert.equal(found.length,1);values[slot]=structuralRow(found[0].values)}
                if(caseId==='M4.2'&&source.sourceKind==='handover')values.handoverProject=structuredClone(values.project);
            }
            for(const binding of step.bindRows??[]){
                const id=next(),stage=step.intents?.find(intent=>intent.selector.stage_type)?.selector.stage_type;
                values[binding.slot]=Object.fromEntries(Object.entries(binding.view).map(([key,column])=>[key,column==='id'?id:column==='row_version'?1:column==='stage_type'?stage:column==='candidate_snapshot_json'?{targetCode:'pure-source-'+runId,targetName:'M controlled department',targetParentOrgUnitId:org}:null]));
            }
            if(step.saveAs&&step.kind==='source-value')values[step.saveAs]=step.value;
            else if(step.saveAs){const current=values[step.saveAs]??{},stage=step.id.includes('retention')?'retention':step.id.includes('final')?'final':'first';values[step.saveAs]={id:current.id??next(),rowVersion:current.rowVersion??1,stageType:current.stageType??stage,...current,targetId:values.assignment?.id??next(),gateReviewRecordId:next(),status:'effective'}}
            if(step.saveResponseAs)values[step.saveResponseAs]={status:200,headers:{},body:{ticket:'source-only-not-an-actual-ticket-0000000000000000',pomsUserId:viewer,authorizeUrl:'http://127.0.0.1:10090/oauth/authorize?state=source-only'}};
        }
        shared=values;
    }
    sourceReader.assertUnchanged();return{...audit,kind:'r2m-full20-structural-source-rehearsal-not-runtime-evidence',requestRecipes,internalProbeRecipes,supplierRecipes,preparedRecipes,realPreparedConstructors,sharedUowCohortConstructors,sourceBoundExternalAuditRequests,externalAuditSelectors,anonymousScopeDeclarations:declaredAnonymousScopeCases(input,{selection}),syntheticProjectInputs:plannedProjects,metadataInvented:false,sourceStaticFieldMapUsed:true,NativeMetadataCertified:false,actualRequests:0,actualBusinessRowsInserted:0,ownershipGranted:false,allTwentyReadyForActual:false};
}
