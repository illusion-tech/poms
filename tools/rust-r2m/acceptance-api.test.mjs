// Synthetic source/protocol checks only. No fixture, private environment,
// HTTP, database, container or browser is opened by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildScenarioPlans,auditApiPlans,firstApiSubset,anonymousAuthFailureCases,materializeRequest,caseNames,nativeProducerRoutes} from './acceptance-api-scenario.mjs';
import {buildRuntimeCaseBindings} from './acceptance-api-bindings.mjs';
import {schemaIssues,assertApiSemantic} from './acceptance-api-expected.mjs';
import {createDispatch} from './acceptance-dispatch.mjs';
import {runAcceptance} from './acceptance-api.mjs';
import {sourceCapDigest} from './acceptance-source.mjs';

const input=JSON.parse(fs.readFileSync(new URL('../../docs/design/rust-r2m/acceptance-input.json',import.meta.url),'utf8')),authority=JSON.parse(fs.readFileSync(new URL('./reference-authority.json',import.meta.url),'utf8'));
const runId='10000000-0000-4000-8000-000000000001',admin='20000000-0000-4000-8000-000000000002',viewer='30000000-0000-4000-8000-000000000003',org='40000000-0000-4000-8000-000000000004',h='a'.repeat(64),candidate='b'.repeat(40);
const base={runId,actors:{admin,viewer},roles:{admin,viewer},orgs:{admin:org,viewer:org},profile:{admin:{userId:admin},viewer:{userId:viewer}},credentials:{admin:{username:'pure-only',password:'pure-not-used'},viewer:{username:'pure-viewer',password:'pure-not-used'}},missingId:'50000000-0000-4000-8000-000000000005'};
const frame=()=>({readOnly:true,complete:true,completeProjection:'all107-owned-and-exact-leases',catalogDigest:h,columns:Object.fromEntries(authority.tables.map(table=>[table.name,table.columns.map(column=>column.name)])),primaryKeys:Object.fromEntries(authority.tables.map(table=>[table.name,table.primaryKey.columns])),rows:Object.fromEntries(authority.tables.map(table=>[table.name,[]])),outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:[]}});
const files=['acceptance-api.mjs','acceptance-api-scenario.mjs','acceptance-api-expected.mjs','acceptance-dispatch.mjs'].map(name=>{const file='tools/rust-r2m/'+name,bytes=fs.readFileSync(new URL('./'+name,import.meta.url));return{file,bytes:bytes.length,rawBytesSha256:createHash('sha256').update(bytes).digest('hex')}}),cap={kind:'r2m-source-cap',id:'pure-api-only',candidate,complete:true,privateCopied:false,files,manifestSha256:sourceCapDigest(files),artifacts:[{kind:'native-main',bytes:1,rawBytesSha256:h}]};

test('the independent20 plans retain named8 readiness, precise anonymous cases, K draft binds and provider immutable identities',()=>{
    const plans=buildScenarioPlans(input),audit=auditApiPlans(input);assert.equal(plans.length,20);assert.equal(audit.selectedLogicalPlans,8);assert.equal(audit.fullFactTablesRequired,107);assert.equal(audit.actualExecution,false);assert.deepEqual(anonymousAuthFailureCases,['m1.1','m1.3','m1.4']);
    for(const id of['M4.1','M4.4']){const provider=plans.find(plan=>plan.id===id).steps.find(step=>step.intents?.some(intent=>intent.table==='attachment_storage_provider_config'));assert.deepEqual(Object.keys(provider.intents[0].selector).sort(),['created_by','provider_type'])}
    assert.equal(plans.find(plan=>plan.id==='M4.1').steps[0].sourceKind,'draft-contract');assert.deepEqual(plans.find(plan=>plan.id==='M4.2').steps[0].bindPrepared,{project:'project',contract:'contract',project_handover:'handover'});
    assert.equal(plans.find(plan=>plan.id==='M2.2').settingBeforeAbsentRequired,false);assert.equal(plans.find(plan=>plan.id==='M2.2').environmentBaselineSettingAdmissionRequired,true);
});

test('all named8 binding constructors and ordered requests materialize without hidden preparation or missing slots',async()=>{
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});let planned=0,requests=0,ordinal=10;
    const fixture={runId,actors:base.actors,base:{accounts:[{account:'admin',orgId:org}]},j:{borrowed:{definitions:[]}},scope(){},async planProject(){planned++;throw new Error('Named8 must not conceal a source-prepared project')}};
    let shared={...base};
    for(const id of firstApiSubset){const made=await buildRuntimeCaseBindings({caseId:id,sourceCaseId:id.toLowerCase(),fixture,bindings:shared,sourceReader:{}});assert.equal(made.businessRowsInserted,0);assert.equal(made.businessProducerRequests,0);const values={...shared,...made,names:caseNames(runId,id)};
        for(const original of buildScenarioPlans(input).find(plan=>plan.id===id).steps){const step=materializeRequest(original,values);if(step.kind==='request'){const route=dispatch.resolve({method:step.method,path:step.path,backend:'rust',purpose:step.purpose});assert.equal(route.executionBackend,'rust');requests++}for(const binding of step.bindRows??[]){const id='60000000-0000-4000-8000-'+String(ordinal++).padStart(12,'0');values[binding.slot]=Object.fromEntries(Object.entries(binding.view).map(([key,column])=>[key,column==='id'?id:column==='row_version'?1:null]))}}
        shared=values;
    }
    assert.equal(planned,0);assert(requests>35);
});

test('empty JSON schemas allow nested null while typed nonnullable values and false schemas remain rejected',()=>{
    const spec={components:{schemas:{Text:{type:'string'}}}};assert.deepEqual(schemaIssues({nested:{one:null,two:[null]}},{type:'object',additionalProperties:{}},spec),[]);assert.deepEqual(schemaIssues(null,{$ref:'#/components/schemas/Text',nullable:true},spec),[]);assert.deepEqual(schemaIssues(null,{allOf:[{$ref:'#/components/schemas/Text'}],nullable:true},spec),[]);assert(schemaIssues(null,{type:'string'},spec).length);assert(schemaIssues('x',false,spec).length);
    assert.throws(()=>schemaIssues(null,{$ref:'https://example.invalid/foreign',nullable:true},spec));assert.throws(()=>schemaIssues(null,{$ref:'#/components/schemas/Missing',nullable:true},spec));
});

test('target audit consumption cannot pass on an empty response or an unobserved physical event',()=>{
    const id='70000000-0000-4000-8000-000000000007',bindings={auditUser:{id:admin}},step={expect:'owned-platform-user-audit'},after={rows:{audit_log:[{id,target_id:admin,target_type:'PlatformUser',event_type:'platform.user.created'}]}};
    assert.throws(()=>assertApiSemantic({body:[]},step,bindings,after));assertApiSemantic({body:[{id,targetId:admin,eventType:'platform.user.created'}]},step,bindings,after);assert.throws(()=>assertApiSemantic({body:[{id,targetId:admin,eventType:'platform.user.created'}]},step,bindings,{rows:{audit_log:[]}}));
});

test('the next source epoch preserves both original E headers and uses the correct unified platform audit query',()=>{
    const plans=buildScenarioPlans(input),values={...base,names:caseNames(runId,'M2.2')},setting=plans.find(plan=>plan.id==='M2.2');
    const explicit=materializeRequest(setting.steps.find(step=>step.id==='E-settings-update'),values),empty=materializeRequest(setting.steps.find(step=>step.id==='E-settings-update-noop'),values);assert.deepEqual(explicit.headers,{'x-request-id':'e-explicit-request','x-correlation-id':'e-ignored-correlation'});assert.deepEqual(empty.headers,{'x-request-id':''});
    const target=plans.find(plan=>plan.id==='M2.3').steps.find(step=>step.id==='target-audit');assert.equal(target.path,'/api/audit-logs?targetType=PlatformUser&targetId={auditUser.id}');assert(!target.path.startsWith('/api/audit-logs/targets/PlatformUser'));
});
test('source04 retains both original relationship-failing requests and adds separate legal creation and relation commands',()=>{
    const plans=buildScenarioPlans(input),userPlan=plans.find(plan=>plan.id==='M2.1'),auditPlan=plans.find(plan=>plan.id==='M2.3');
    for(const[plan,negativeId,positiveId]of[[userPlan,'user-original-relations-rollback','user-empty-relations'],[auditPlan,'audit-user-source-original-relations-rollback','audit-user-empty-relations']]){
        const negative=plan.steps.find(step=>step.id===negativeId),positive=plan.steps.find(step=>step.id===positiveId);assert.equal(negative.expectedStatus,500);assert(negative.body.primaryOrgUnitId);assert.equal(negative.body.initialRoleIds.length,1);assert.equal(negative.originalRequestBodyPreserved,true);assert.equal(negative.bindRows,undefined);assert.equal(positive.expectedStatus,201);assert.equal(positive.body.primaryOrgUnitId,null);assert.deepEqual(positive.body.initialRoleIds,[]);assert.equal(positive.body.username,negative.body.username);assert.deepEqual(positive.intents.map(intent=>intent.table),['platform_user']);
    }
    assert.equal(userPlan.steps.find(step=>step.id==='assign-new-user-roles').method,'PUT');assert.equal(userPlan.steps.find(step=>step.id==='duplicate-username').expectedStatus,409);const ignored=userPlan.steps.find(step=>step.id==='ignored-request-version');assert.equal(ignored.expectedStatus,200);assert.deepEqual(ignored.body,{displayName:'not committed',expectedVersion:2147483647});assert(!userPlan.steps.some(step=>step.id==='stale'));
});

function pureDeps(retained,{brokenFacts=false,requestFailure=false}={}){return{prepare:async()=>({sourceCapId:cap.id,businessRowsInserted:0,businessProducerRequests:0,requestId:'pure',bindings:{}}),facts:async()=>{const value=frame();if(brokenFacts)value.rows.lead=[{id:admin}];return value},request:async()=>{if(requestFailure)throw new Error('private-api-protocol-marker');return{status:200,body:{},headers:{},bodyBytesSha256:h,bodyBytesLength:2,transportComplete:true,executionBackend:'nest'}},certify:async({caseId})=>({complete:true,traceComplete:true,caseId,runId,sourceCapId:cap.id,unknownCreates:[],unknownMutations:[],registeredRows:[],ledgerDigest:h}),internal:async()=>{},supplier:async()=>{},finishCase:async({caseId})=>({caseId,requiredFaultsRestored:true,noUnknownCaseWriter:true})}}
const observe=async options=>{const retained=[],fixture={runId,intent:async()=>{}};const out=await runAcceptance({backend:'nest',candidate,sourceCap:cap,input,fixture,bindings:base,selection:['M1.1'],deps:pureDeps(retained,options),retain:async value=>{retained.push(value);return{file:'pure-memory-only',rawBytesSha256:h}}});return{...out,retained}};

test('a physical omission in a table outside the logical plan still blocks the complete107 API frame',async()=>{
    const result=await observe({brokenFacts:true});assert.equal(result.report.result,'fail');assert(result.retained.some(item=>item.kind==='private-API-case-or-prepare-failure'));assert.equal(result.report.counts.requests,0);
});

test('a real dependency failure keeps its original private diagnostic and exposes only the fixed public category',async()=>{
    const result=await observe({requestFailure:true});assert.equal(result.report.result,'fail');assert(result.retained.some(item=>item.record?.message==='private-api-protocol-marker'));assert(!JSON.stringify(result.report).includes('private-api-protocol-marker'));assert.equal(result.rawCases[0].steps[0].before.completeProjection,'all107-owned-and-exact-leases');
});
