// Next UI epoch only. Exact original prepared sources and real Native producer
// callbacks; no DB/HTTP/private/process operation occurs on import.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {buildPreparedContractRows} from '../rust-r2l/prepared-contract-source.mjs';
import {buildPreparedPlan} from '../rust-r2k/r4-prepared-source.mjs';
import {handoverPreparedInput,syntheticInputs,uploadInputs} from './acceptance-bindings.mjs';
import {observedTables} from './pg-create-observer.mjs';
import {settingLeaseScope,settingKey,nativeProducerRoutes} from './scenario-input.mjs';
import {attachmentProviderBusinessAuditProfile} from './audit-attachment-source.mjs';
const ROOT=path.resolve(import.meta.dirname,'../..'),VP='00000000-0000-4000-8000-000000000008';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const noSecrets=value=>({method:value.method,path:value.path,status:value.status});

const READ_MODELS=Object.freeze([
    '/api/projects/{id}','/api/projects/{projectId}/timeline','/api/projects/{projectId}/archive-records',
    '/api/projects/{projectId}/workspace-guidance','/api/projects/{projectId}/contract-handover','/api/projects/{projectId}/project-handover',
    '/api/contracts/{id}/approval-record','/api/business-discussions'
]);
export function uiNativeReadModels({sourceReader,input,selection}){
    const spec=sourceReader.json('libs/shared/api-spec/openapi.json');
    const existing=new Set([...input.sourceProtection.currentSurface,...nativeProducerRoutes].map(row=>row.method+' '+row.path));
    // Every original login enters Workbench, whose ngOnInit loads Projects.
    // This is the original permission-guarded Native GET, never a fake200.
    const required=['/api/projects',...(selection.some(id=>id==='UI3'||id==='UI4')?READ_MODELS:[])];
    return required.filter(route=>{assert(spec.paths[route]?.get,'Named original UI read-model must exist in pinned current spec');return!existing.has('GET '+route)}).map(route=>({method:'GET',path:route}));
}

export function uiStepScope({descriptor,prepared,actors}){
    const{id,journey}=descriptor;assert(['UI1','UI2','UI3','UI4'].includes(journey));
    const caseId=journey==='UI2'&&id==='setting-write'?settingLeaseScope:'m.'+journey.toLowerCase()+'.integration';
    const project=journey==='UI1'?prepared.todo?.project:journey==='UI3'?prepared.contract?.project:journey==='UI4'?prepared.handover?.project:null;
    const intents=[],add=(table,selector,expectedMax=8)=>intents.push({table,selector,expectedMax});
    let role=null;
    if(journey==='UI1'&&['login-restore','relogin-and-topbar-logout'].includes(id))role='viewer';
    if(journey==='UI2'&&id==='setting-write')role='admin';
    if(journey==='UI2'&&id==='viewer-route-and-backend-denial')role='viewer';
    if(journey==='UI3')role=id==='original-native-resubmit'?'admin':'approver';
    if(journey==='UI4'&&id==='upload')role='admin';
    if(role)add('auth_session',{user_id:role==='approver'?VP:actors[role]},2);
    if(journey==='UI3'&&id==='original-native-resubmit'){
        assert(prepared.contract);add('approval_record',{target_object_id:prepared.contract.contract.id,project_id:prepared.contract.project.id},2);add('todo_item',{target_object_id:prepared.contract.contract.id,project_id:prepared.contract.project.id},2);
    }
    if(journey==='UI4'){
        const source=prepared.handover;assert(source?.project&&source?.handover);
        if(id==='upload'){add('attachment_upload_session',{created_by:actors.admin,operation_type:'create-attachment',original_name:source.upload.name},1);add('attachment',{uploaded_by:actors.admin},1);add('attachment_link',{target_type:'project',target_id:source.project.id},2)}
        if(id==='checklist-refresh-select'){add('project_handover_attachment_selection',{handover_id:source.handover.id,project_id:source.project.id},64);add('attachment_link',{target_type:'project-handover',target_id:source.handover.id},64)}
        if(id==='package-create'){add('attachment_download_package',{handover_id:source.handover.id,project_id:source.project.id,created_by:actors.admin},1);add('attachment_download_package_item',{handover_id:source.handover.id},64)}
    }
    return{caseId,projects:project?[project.id]:[],borrowedActors:journey==='UI3'?[VP]:[],anonymous:true,intents,role};
}

export function uiExchangeIntents({descriptor,prepared,actors,request,accounts,isOwned}){
    const pathname=request.path.split('?',1)[0],method=request.method,intents=[];
    const source=uiStepScope({descriptor,prepared,actors});
    const addTable=table=>{const rows=source.intents.filter(row=>row.table===table);assert.equal(rows.length,1,'Actual UI request requires its one declared step producer selector');intents.push(rows[0])};
    if(method==='POST'&&pathname==='/api/auth/sessions'){
        const body=JSON.parse(Buffer.from(request.bodyBase64,'base64').toString('utf8')),principal=accounts.find(row=>row.username===body.username);
        const userId=principal?.userId??(descriptor.journey==='UI3'&&body.username==='vp_owner'?VP:null);assert(userId,'UI login principal is outside the exact owned/readonly current source');intents.push({table:'auth_session',selector:{user_id:userId},expectedMax:1});
    }
    if(method==='POST'&&/^\/api\/contracts\/[0-9a-f-]{36}:submitReview$/.test(pathname)){assert.equal(descriptor.journey,'UI3');assert.equal(pathname,'/api/contracts/'+prepared.contract.contract.id+':submitReview');addTable('approval_record');addTable('todo_item')}
    if(method==='POST'&&pathname==='/api/attachment-upload-sessions'){assert.equal(descriptor.journey,'UI4');addTable('attachment_upload_session')}
    const session=/^\/api\/attachment-upload-sessions\/([0-9a-f-]{36})(\/object|:complete)$/.exec(pathname);
    if(session){assert.equal(descriptor.journey,'UI4');assert(isOwned('attachment_upload_session',session[1]),'Browser response session ID is not ownership');if(method==='POST'&&session[2]===':complete'){addTable('attachment');addTable('attachment_link')}}
    const attachment=/^\/api\/attachments\/([0-9a-f-]{36})(?::mark-final|\/versions|\/download)?$/.exec(pathname);if(attachment)assert(isOwned('attachment',attachment[1]),'Browser response attachment ID is not ownership');
    if(method==='POST'&&descriptor.journey==='UI4'&&pathname==='/api/project-handovers/'+prepared.handover.handover.id+'/attachment-checklist:refresh'){addTable('project_handover_attachment_selection');addTable('attachment_link')}
    if(method==='POST'&&descriptor.journey==='UI4'&&pathname==='/api/project-handovers/'+prepared.handover.handover.id+'/attachment-download-packages'){addTable('attachment_download_package');addTable('attachment_download_package_item')}
    const packageId=/^\/api\/attachment-download-packages\/([0-9a-f-]{36})(?:\/download)?$/.exec(pathname);if(packageId)assert(isOwned('attachment_download_package',packageId[1]),'Browser package DTO is not ownership');
    return intents;
}

export function createUiSourcePreparer({fixture:f,native,pg,contexts,committed,sourceReader,sourceCapId,retain,nextIndex,makeHttpSession,marker,databaseFor,auditIdentityApproval}){
    for(const fn of[retain,nextIndex,makeHttpSession])assert.equal(typeof fn,'function');
    const runId=f.runId,backend=f.backend,sessions=new Map(),requests=[];let pgCaseActive=false;
    const scope=caseId=>{const old=f.j.cases.find(row=>row.caseId===caseId);return old??f.defineCase(caseId,{actors:Object.values(f.actors),projects:[],borrowedActors:caseId==='m.ui3.integration'?[VP]:[],borrowedDefinitions:f.j.borrowed.definitions.map(row=>row.id),anonymous:true})};
    const session=name=>{if(!sessions.has(name))sessions.set(name,makeHttpSession({runId,userId:f.actors.admin}));return sessions.get(name)};
    async function send({caseId,method,path:requestPath,body,intents=[],expectedStatus=200,auditSourceStep}){
        const active=scope(caseId),actualIntents=[],context={runId,caseId,index:nextIndex(),op:'m.producer'},correlationId='m-ui-source-'+randomUUID();contexts.set(correlationId,context);
        for(const item of intents)actualIntents.push(await f.intent(item.table,item.selector,{caseId,expectedMax:item.expectedMax??8}));
        let auditSource=null,auditAdmission=null;
        if(auditSourceStep){const request={logicalCase:'UI4',stepId:auditSourceStep,method,path:requestPath,body};auditSource=attachmentProviderBusinessAuditProfile({sourceReader,sourceCapId,context,request,actorId:f.actors.admin});assert(auditSource,'Only two exact UI4 Native provider source steps may use this channel');auditAdmission=f.admitAuditIdentity({sourceKind:'attachment-provider-null',descriptor:auditSource,request,context},auditIdentityApproval);actualIntents.push(await f.intentWithRequestIdentity('audit_log',auditAdmission.auditSelector,{caseId,index:context.index,admissionId:auditAdmission.id,expectedMax:1}));}
        else actualIntents.push(await f.intent('audit_log',{request_id:active.requestId},{caseId,expectedMax:256}));
        actualIntents.push(await f.intent('security_event',{request_id:active.requestId},{caseId,expectedMax:256}));
        const from=committed.length;let response,pgRows;
        await pg.beginCase(context);pgCaseActive=true;
        try{response=await session(caseId).request({executionBackend:'nest',method,path:requestPath,body,requestId:active.requestId,correlationId});await retain({kind:'actual-UI-original-Native-response-before-certification',record:{sourceCapId,context,method,path:requestPath,body,response,auditSource,auditAdmission}})}
        finally{
            await native.witness.drain();native.witness.assertComplete();pgRows=await pg.drainCase();pgCaseActive=false;const sdk=committed.slice(from);
            if(sdk.length){const file='tools/rust-r2m/native-write-witness.mjs',authority=f.registerNativeAuthority(f.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:databaseFor(backend),marker,source:{file,sha256:sha(fs.readFileSync(path.join(ROOT,file)))},trace:native.witness.snapshot()}));
                f.recordCommittedCreates(sdk.map(row=>{const matching=actualIntents.filter(item=>item.table===row.table);assert.equal(matching.length,1,'Original Native producer requires one real immutable before-intent');if(observedTables.includes(row.table))assert(pgRows.some(item=>item.table===row.table&&item.id===row.id),'Observer-covered SDK producer needs its real PG shadow');return f.creationEnvelope({...row,authorityId:authority,intentId:matching[0].id})}));
            }
            assert(pgRows.every(row=>sdk.some(item=>item.table===row.table&&item.id===row.id)),'Pure Native setup cannot adopt a PG-only create');await f.resolveNoCreates(caseId);await f.adoptIntents();
            await retain({kind:'actual-UI-original-Native-source-request',record:{sourceCapId,context,method,path:requestPath,body,response,sdk,pg:pgRows,full107:await f.facts()}});
        }
        assert.equal(response.status,expectedStatus);assert(response.transportComplete&&response.parseError===null);requests.push(noSecrets({method,path:requestPath,status:response.status}));return response.body;
    }
    async function login(caseId){const {fixtureCredentials}=await import('./fixture-credentials.mjs');await send({caseId,method:'GET',path:'/api/auth/csrf-token'});await send({caseId,method:'POST',path:'/api/auth/sessions',body:fixtureCredentials(runId,'admin'),intents:[{table:'auth_session',selector:{user_id:f.actors.admin},expectedMax:1}]})}
    async function owned(table,id){assert(f.j.objects.some(row=>row.table===table&&row.id===id&&row.creationProof&&row.postcondition?.independentlyVisible));const facts=await f.facts(),rows=facts.tables.find(row=>row.table===table).rows.filter(row=>row.id===id);assert.equal(rows.length,1);return rows[0]}
    async function prepareContract(){
        const caseId='m.ui3.integration';scope(caseId);const projectId=await f.planProject(caseId),orgId=f.base.accounts.find(row=>row.account==='admin').orgId;
        for(const file of['tools/rust-r2m/ui-runtime-sources.mjs','tools/rust-r2l/prepared-contract-source.mjs','apps/poms-api/src/seeders/dev-seed-data.ts'])sourceReader.read(file);
        const plan=buildPreparedContractRows({runId,actorId:f.actors.admin,orgId,customerId:randomUUID(),projectId,contractId:randomUUID(),metadata:native.metadata,numbers:{customerNo:'M-UI3-CUST-'+runId,projectNo:'M-UI3-P-'+runId,contractNo:'M-UI3-C-'+runId}});
        await retain({kind:'UI3-exact-original-draft-contract-source-plan',record:{sourceCapId,plan,preparedNotNativeGenerated:true}});
        for(const row of plan.rows)await f.insert(row.table,row.values,{caseId});
        const contractId=plan.rows.find(row=>row.table==='contract').values.id;await login(caseId);const contract=await owned('contract',contractId);
        await send({caseId,method:'POST',path:'/api/contracts/'+contractId+':submitReview',body:{expectedVersion:contract.row_version,comment:'R2M 原界面前置真实Native提交'},intents:[{table:'approval_record',selector:{target_object_id:contractId,project_id:projectId},expectedMax:2},{table:'todo_item',selector:{target_object_id:contractId,project_id:projectId},expectedMax:2}]});
        const source=sourceReader.text('apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts'),match=/username:\s*'vp_owner',\s*password:\s*'([^']+)'/.exec(source);assert(match,'Only current pinned readonly VP credential declaration may be used');
        const facts=await f.facts(),approval=facts.tables.find(row=>row.table==='approval_record').ownedRows.filter(row=>row.target_object_id===contractId&&row.current_status==='pending');assert.equal(approval.length,1);
        return{project:await owned('project',projectId),contract:await owned('contract',contractId),approver:{username:'vp_owner',password:match[1]},approvalId:approval[0].id};
    }
    async function prepareHandover(){
        const caseId='m.ui4.integration';scope(caseId);const projectId=await f.planProject(caseId),orgId=f.base.accounts.find(row=>row.account==='admin').orgId;
        for(const file of['tools/rust-r2m/ui-runtime-sources.mjs','tools/rust-r2m/acceptance-bindings.mjs','tools/rust-r2k/r4-prepared-source.mjs','apps/poms-api/src/seeders/database.seeder.ts'])sourceReader.read(file);
        const definition=key=>{const row=f.j.borrowed.definitions.find(item=>item.summary_package_key===key);assert(row?.readOnly);return row.id};
        const sourceInput=handoverPreparedInput({runId,adminId:f.actors.admin,viewerId:f.actors.viewer,orgId,definitions:{contractSummaryPackageId:definition('contract-handover-summary'),projectHandoverSummaryPackageId:definition('project-handover-confirmation')},ids:{projectId}});
        Object.assign(sourceInput.fixture,{handoverStatus:'draft',confirmedReceiptAmount:'100000',receiptRecordId:randomUUID()});
        const plan=await buildPreparedPlan(sourceInput);await retain({kind:'UI4-exact-original-handover-draft-cohort-plan',record:{sourceCapId,plan,preparedNotNativeGenerated:true}});const inserted=await f.insertHandoverPreparedBatch(plan,{caseId});
        await login(caseId);const handover=await owned('project_handover',sourceInput.fixture.handoverId);assert.equal(handover.status,'draft');
        const detail=await send({caseId,method:'GET',path:'/api/project-handovers/'+handover.id});
        assert(detail.handoverId===handover.id&&detail.handoverStatus==='draft'&&detail.blockingReasons.length===0&&detail.allowedActions.includes('confirm-project-handover'),'Prepared draft must be actually confirmable by the current original Native query');
        await send({caseId,method:'POST',path:'/api/project-handovers/'+handover.id+':confirm',body:{comment:'R2M UI4 原Native确认',contractSummarySnapshotId:sourceInput.fixture.contractSummarySnapshotId,expectedVersion:handover.row_version,receiptJudgmentMode:'milestone-receipt',participantConfirmations:[{participantId:f.actors.admin,participantRoleKey:'execution-owner',participantStatus:'confirmed'},{participantId:f.actors.viewer,participantRoleKey:'sales-owner',participantStatus:'confirmed'}]},intents:[{table:'project_receipt_judgment_freeze',selector:{project_id:projectId,source_type:'project-handover',source_id:handover.id,created_by:f.actors.admin},expectedMax:1}]});
        assert.equal((await owned('project_handover',handover.id)).status,'confirmed');
        const before=await f.facts();assert.equal(before.tables.find(row=>row.table==='attachment_storage_provider_config').rows.length,0,'UI4 never mutates or adopts a pre-existing default provider');
        const input=syntheticInputs({runId,adminId:f.actors.admin,viewerId:f.actors.viewer,orgId});
        const provider=await send({caseId,method:'POST',path:'/api/platform/attachment-storage-providers',body:input.localProvider,expectedStatus:201,auditSourceStep:'ui4-local-provider',intents:[{table:'attachment_storage_provider_config',selector:{provider_type:'local',created_by:f.actors.admin},expectedMax:1}]});
        assert(f.j.objects.some(row=>row.table==='attachment_storage_provider_config'&&row.id===provider.id),'Provider DTO cannot establish ownership');
        const physical=await owned('attachment_storage_provider_config',provider.id);assert.equal(physical.key_prefix,'poms-r2m/'+runId);
        await send({caseId,method:'POST',path:'/api/platform/attachment-storage-providers/'+provider.id+':set-default',body:{expectedVersion:physical.row_version},auditSourceStep:'ui4-local-default'});
        const dictionary=(await f.facts()).tables.find(row=>row.table==='dictionary_item').rows.filter(row=>row.domain==='attachment-category'&&row.code==='demand'&&row.status==='active');assert.equal(dictionary.length,1);
        const upload=uploadInputs(runId).package;return{project:await owned('project',projectId),handover:{...(await owned('project_handover',handover.id)),pagePath:'/projects/'+projectId+'/workspace/contract-handover'},upload:{...upload,categoryLabel:dictionary[0].name},preparedSource:inserted.receipt};
    }
    return{send,requests,state:()=>({pgCaseActive}),async prepare(selection){if(selection.includes('UI4'))assert(auditIdentityApproval?.rootApproved===true&&auditIdentityApproval.kind==='Root-R2M-source-bound-audit-identity-admission'&&auditIdentityApproval.allowedSourceKinds?.includes('attachment-provider-null'),'UI4 requires its exact Root/C provider audit admission before prepared business rows');const prepared={};if(selection.includes('UI3'))prepared.contract=await prepareContract();if(selection.includes('UI4'))prepared.handover=await prepareHandover();sourceReader.assertUnchanged();return prepared}};
}
