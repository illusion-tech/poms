// Pure input constructors for the next runtime epoch. Actual PK absence,
// INSERT/COMMIT/SDK/PG ownership is supplied only by the new Fixture/owners.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mapCommissionSource,preparedEvidenceFromPlan} from './acceptance-producers.mjs';
import {inspectCommissionPreparedSource,buildCommissionPreparedRows} from './fixture-prepared-source.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readBorrowedCredentials(sourceReader,session){
    const username={approver:'vp_owner',finance:'finance_mgr'}[session];assert(username,'Only the two frozen readonly principals');
    const source=sourceReader.text('apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts'),found=new RegExp("username:\\s*'"+username+"',\\s*password:\\s*'([^']+)'").exec(source);assert(found,'Pinned original seed credential declaration required');return{username,password:found[1]};
}

export function handoverPreparedInput({runId,adminId,viewerId,orgId,definitions,ids={},uuid=randomUUID}){
    for(const value of[runId,adminId,viewerId,orgId])assert(uuidPattern.test(value));
    const required=['projectId','contractId','contractSnapshotId','baselineId','diffResultId','readinessPackageId','receivablePlanVersionId','contractSummarySnapshotId','handoverSummarySnapshotId','handoverId','confirmationRecordId'];
    const supplied=Object.fromEntries(required.map(key=>[key,ids[key]??uuid()]));assert.equal(new Set(Object.values(supplied)).size,required.length);
    const fixture={key:'r2m_'+runId.replaceAll('-',''),projectNo:'M-K-P-'+runId,projectName:'R2M 原移交 '+runId,contractNo:'M-K-C-'+runId,...supplied};
    const borrowedDefinitions={contractSummaryPackageId:definitions.contractSummaryPackageId,projectHandoverSummaryPackageId:definitions.projectHandoverSummaryPackageId};
    for(const value of Object.values(borrowedDefinitions))assert(uuidPattern.test(value));
    return{fixture,actorId:{adminId,viewerId},orgId,borrowedDefinitions,participantRowIds:{executionOwner:ids.executionOwner??uuid(),salesOwner:ids.salesOwner??uuid()}};
}

export async function commissionPreparedInput({runId,adminId,viewerId,orgId,projectId,sourceReader,suffix='main'}){
    assert(/^[a-z0-9-]{1,12}$/.test(suffix));
    sourceReader.read('tools/rust-r2m-continuation01/fixture-prepared-source.mjs');sourceReader.read('apps/poms-api/src/seeders/database.seeder.ts');
    const inspection=await inspectCommissionPreparedSource();
    const input={uuidMappings:mapCommissionSource(inspection,{adminId,viewerId,orgId,projectId}),names:{projectNo:'M-CM-P-'+runId+'-'+suffix,projectName:'R2M Native commission '+runId+' '+suffix,contractNo:'M-CM-C-'+runId+'-'+suffix},logicalIds:[runId]};
    const plan=await buildCommissionPreparedRows(input),evidence=preparedEvidenceFromPlan(plan);sourceReader.assertUnchanged();
    const originalProjectCustomerId=plan.rows.find(item=>item.table==='project').values.customer_id;assert.equal(originalProjectCustomerId,null,'The exact original commission cohort has a NULL customer reference');
    return{input,plan,evidence,originalProjectCustomerId,preparedNotNativeGenerated:true};
}

export function syntheticInputs({runId,adminId,viewerId,orgId}){
    for(const value of[runId,adminId,viewerId,orgId])assert(uuidPattern.test(value));
    const compact=runId.replaceAll('-',''),keyPrefix='poms-r2m/'+runId;
    const clientSecret='M-synthetic-only-'+hash(runId+'-feishu'),accessKeyId='M'+compact.slice(0,20),secretAccessKey=hash(runId+'-obs');
    return{
        externalSubject:'m-subject-'+compact,
        localProvider:{providerType:'local',displayName:'M local '+compact,enabled:true,keyPrefix},
        obsProvider:{providerType:'huawei-obs-s3',displayName:'M OBS '+compact,enabled:true,endpoint:'http://127.0.0.1:10091',region:'r2m',bucket:'m-'+compact,keyPrefix,forcePathStyle:true,accessKeyId,secretAccessKey},
        identityProvider:{provider:'feishu',tenantId:'m-tenant-'+compact,displayName:'M Feishu '+compact,clientId:'m-client-'+compact,clientSecret,enabled:true,loginEnabled:true,bindingEnabled:true,searchEnabled:true,redirectUri:'http://127.0.0.1:10080/api/auth/identity-providers:callback',searchRedirectUri:'http://127.0.0.1:10080/api/platform/identity-provider-oauth-grants:callback',loginScopes:['contact:user.base:readonly'],searchScopes:['contact:user.base:readonly'],searchGrantMode:'per-admin'},
        identityProviderUpdate:{displayName:'M Feishu enabled '+compact,enabled:true,loginEnabled:true,bindingEnabled:true,searchEnabled:true,clientSecret},
        orgSource:{provider:'feishu',externalTenantId:'m-tenant-'+compact,displayName:'M org source '+compact,providerConfigId:{$binding:'identityProvider.id'},authoritativeOrgUnitId:orgId,externalRootDepartmentId:'m-root',syncScopes:['controlled-departments']},
        confirmHandover:{comment:'R2M 原Native确认',contractSummarySnapshotId:{$binding:'prepared.handoverInput.fixture.contractSummarySnapshotId'},expectedVersion:{$binding:'handover.rowVersion'},receiptJudgmentMode:'milestone-receipt',participantConfirmations:[{participantId:adminId,participantRoleKey:'execution-owner',participantStatus:'confirmed'},{participantId:viewerId,participantRoleKey:'sales-owner',participantStatus:'confirmed'}]},
        operatingReview:{signalVersion:{$binding:'signal.rowVersion'},bindingVersion:{$binding:'gate.rowVersion'},reviewComment:'R2M 原Native运营复核'},
        departure:{departureScenarioCode:'employee-left-company',decisionCode:'allow-retention-with-successor',decisionSummary:'允许进入质保金结算',confirmationRequirementSummary:null},
        routeDenied:{path:'/platform/users',returnUrl:'/dashboard',requiredPermissions:['platform:users:manage']},
        sourceOnly:true,actualCredentials:false,realTenantClaimed:false
    };
}

export function uploadInputs(runId){
    assert(uuidPattern.test(runId));const out={};
    for(const label of['local','package','sensitive','fault','obs','version']){const bytes=Buffer.from('R2M actual '+label+' bytes '+runId+'\n');out[label]={name:'m-'+label+'-'+runId+'.txt',bytes,size:bytes.length,sha256:hash(bytes)}}
    out.versionPositive={...out.version,name:'m-version-positive-'+runId+'.txt',sourcePayload:'upload.version-exact-original-bytes'};
    return out;
}

// Root invokes this only in the new runtime's explicit bindings phase. The
// only fixture operation here is the named project's before-PK-absence plan;
// source rows and real producer HTTP remain ordered recipe steps afterwards.
export async function buildRuntimeCaseBindings({caseId,sourceCaseId,fixture:f,bindings,sourceReader}){
    assert(/^M[1-5]\.[1-5]$/.test(caseId));f.scope(sourceCaseId);
    const runId=f.runId,adminId=f.actors.admin,viewerId=f.actors.viewer,orgId=f.base.accounts.find(item=>item.account==='admin').orgId;
    const prepared={...(bindings.prepared??{})},inputs={...(bindings.inputs??{}),...syntheticInputs({runId,adminId,viewerId,orgId})},upload=uploadInputs(runId);
    const draftInput=(projectId,customerId=randomUUID())=>({runId,actorId:adminId,orgId,customerId,projectId,contractId:randomUUID(),numbers:{customerNo:'M-CUST-'+runId+'-'+caseId,projectNo:'M-PRJ-'+runId+'-'+caseId,contractNo:'M-CON-'+runId+'-'+caseId}});
    if(['M3.1','M3.5','M4.1'].includes(caseId))prepared.contractInput=draftInput(await f.planProject(sourceCaseId));
    if(['M3.2','M3.3'].includes(caseId)){
        const actualSource=await commissionPreparedInput({runId,adminId,viewerId,orgId,projectId:await f.planProject(sourceCaseId),sourceReader,suffix:caseId.toLowerCase().replace('.','-')});
        prepared.commissionInput=actualSource.input;prepared.commissionEvidence=actualSource.evidence;
        prepared.originalCommissionProjectCustomerId=actualSource.originalProjectCustomerId;
    }
    if(caseId==='M3.5')prepared.todoInput={runId,actorId:adminId,orgId,customer:{$binding:'customer'},project:{$binding:'project'},ids:{lead:randomUUID(),followups:Array.from({length:3},()=>randomUUID()),todos:Array.from({length:3},()=>randomUUID())},assigneeId:viewerId};
    if(caseId==='M4.2'){
        assert(bindings.project?.id&&bindings.localVersionAttachment?.id,'M4.2 requires the actual M4.1 local provider/project/version chain');
        const definition=key=>{const item=f.j.borrowed.definitions.find(row=>row.summary_package_key===key);assert(item?.readOnly);return item.id};
        prepared.handoverInput=handoverPreparedInput({runId,adminId,viewerId,orgId,definitions:{contractSummaryPackageId:definition('contract-handover-summary'),projectHandoverSummaryPackageId:definition('project-handover-confirmation')},ids:{projectId:await f.planProject(sourceCaseId)}});
    }
    if(caseId==='M4.3')assert(bindings.localProject?.id&&bindings.handoverProject?.id&&bindings.localProject.id!==bindings.handoverProject.id,'M4.3 requires two distinct actually certified local/K project bindings; a failed M4.2 cannot fall back to the local project');
    return{...(caseId==='M4.2'?{localProject:bindings.project}:{}),prepared,inputs,upload,sourceOnlyBindings:true,businessRowsInserted:0,businessProducerRequests:0};
}
