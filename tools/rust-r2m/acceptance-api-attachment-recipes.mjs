// Future full20 ordered requests only. Every generated PK is later bound from
// the fixture's independent actual create certificate, never from a response.
import {ref} from './scenario-input.mjs';
const request=(id,method,path,body,rest={})=>({kind:'request',id,method,path,...(body===undefined?{}:{body}),session:'admin',purpose:'business',...rest});
const owned=(table,selector,expectedMax=1)=>({table,selector,expectedMax});
const bind=(table,slot,selector,extra={})=>({table,slot,selector,exactly:1,view:{id:'id',rowVersion:'row_version',...extra}});
function versionSteps(){
    const original=[
        request('version-create','POST','/api/attachment-upload-sessions',{operationType:'create-version',baseAttachmentId:ref('localAttachment.id'),originalName:ref('upload.version.name'),displayName:ref('upload.version.name'),sizeBytes:ref('upload.version.size'),checksumSha256:ref('upload.version.sha256'),mimeType:'text/plain',changeNote:'R2M actual version two'},{expectedStatus:201,intents:[owned('attachment_upload_session',{created_by:ref('actors.admin'),operation_type:'create-version',original_name:ref('upload.version.name')})],bindRows:[bind('attachment_upload_session','versionSession',{created_by:ref('actors.admin'),original_name:ref('upload.version.name')})]}),
        request('version-put','PUT','/api/attachment-upload-sessions/{versionSession.id}/object',ref('upload.version.bytes'),{expectedStatus:200,contentType:'application/octet-stream'}),
        request('version-complete','POST','/api/attachment-upload-sessions/{versionSession.id}:complete',{}, {expectedStatus:500,expect:'inherited-unprepared-version-complete-500',originalUnpreparedInputPreserved:true,intents:[owned('attachment',{uploaded_by:ref('actors.admin')}),owned('attachment_link',{target_type:'project',target_id:ref('project.id')})]})
    ];
    return[...original,
        request('version-positive-create','POST','/api/attachment-upload-sessions',{...original[0].body,originalName:ref('upload.versionPositive.name'),displayName:ref('upload.versionPositive.name')},{expectedStatus:201,intents:[owned('attachment_upload_session',{created_by:ref('actors.admin'),operation_type:'create-version',original_name:ref('upload.versionPositive.name')})],bindRows:[bind('attachment_upload_session','versionPositiveSession',{created_by:ref('actors.admin'),original_name:ref('upload.versionPositive.name')})],freshIndependentUploadSession:true,sourcePayload:'upload.version-exact-original-bytes'}),
        request('version-positive-put','PUT','/api/attachment-upload-sessions/{versionPositiveSession.id}/object',ref('upload.version.bytes'),{expectedStatus:200,contentType:'application/octet-stream'}),
        {kind:'owned-mutation',id:'version-prepare-old-latest',operation:'update-owned-fields',input:{table:'attachment',id:ref('localAttachment.id'),values:{is_latest:false}},preparedSource:{kind:'exact-original-K-owned-latest-precondition',file:'tools/rust-r2k/k-advanced-cases.mjs',rawBytesSha256:'cb755b332d6a6e3424f9027005bbe6a57d0f6c560110a4d2b435279aa52e7452',productRepairClaimed:false,markOldFinalNotIncluded:true}},
        request('version-positive-complete','POST','/api/attachment-upload-sessions/{versionPositiveSession.id}:complete',{}, {expectedStatus:200,expect:'owned-K-prepared-version-positive',intents:[owned('attachment',{uploaded_by:ref('actors.admin')}),owned('attachment_link',{target_type:'project',target_id:ref('project.id')})],bindRows:[bind('attachment','localVersionAttachment',{uploaded_by:ref('actors.admin'),original_name:ref('upload.versionPositive.name')},{versionGroupId:'version_group_id'})],preparedPreconditionRequired:true,naturalUnpreparedSuccessClaimed:false})
    ];
}
function sensitiveSteps(){
    return[
        request('sensitive-create','POST','/api/attachment-upload-sessions',{operationType:'create-attachment',originalName:ref('upload.sensitive.name'),displayName:ref('upload.sensitive.name'),sizeBytes:ref('upload.sensitive.size'),checksumSha256:ref('upload.sensitive.sha256'),mimeType:'text/plain',targetType:'project',targetId:ref('project.id'),category:'demand',securityLevel:'sensitive'},{expectedStatus:201,intents:[owned('attachment_upload_session',{created_by:ref('actors.admin'),operation_type:'create-attachment',original_name:ref('upload.sensitive.name')})],bindRows:[bind('attachment_upload_session','sensitiveSession',{created_by:ref('actors.admin'),original_name:ref('upload.sensitive.name')})]}),
        request('sensitive-put','PUT','/api/attachment-upload-sessions/{sensitiveSession.id}/object',ref('upload.sensitive.bytes'),{expectedStatus:200,contentType:'application/octet-stream'}),
        request('sensitive-complete','POST','/api/attachment-upload-sessions/{sensitiveSession.id}:complete',{}, {expectedStatus:200,intents:[owned('attachment',{uploaded_by:ref('actors.admin')}),owned('attachment_link',{target_type:'project',target_id:ref('project.id')})],bindRows:[bind('attachment','sensitiveAttachment',{uploaded_by:ref('actors.admin'),original_name:ref('upload.sensitive.name')},{versionGroupId:'version_group_id'})]})
    ];
}
export function extendAttachmentAcceptancePlan(plan){
    let steps=plan.steps;
    if(['M4.1','M4.4'].includes(plan.id))steps=steps.map(step=>{
        const binding=step.id==='local-provider'?'localProvider':step.id==='obs-provider'?'obsProvider':null;if(!binding)return step;
        return{...step,bindRows:step.bindRows.map(row=>row.table==='attachment_storage_provider_config'?{...row,selector:{provider_type:ref('inputs.'+binding+'.providerType'),display_name:ref('inputs.'+binding+'.displayName'),created_by:ref('actors.admin'),key_prefix:ref('inputs.'+binding+'.keyPrefix')}}:row)};
    });
    if(plan.id==='M4.1')steps=steps.flatMap(step=>{
        if(step.id==='final')return[...versionSteps(),{...step,path:'/api/attachments/{localVersionAttachment.id}:mark-final'}];
        if(step.id==='versions')return[{...step,path:'/api/attachments/{localVersionAttachment.id}/versions',expect:'owned-actual-two-version-chain'}];
        if(step.id==='download')return[{...step,path:'/api/attachments/{localVersionAttachment.id}/download',binaryExpected:ref('upload.version.sha256')},request('original-version-download','GET','/api/attachments/{localAttachment.id}/download',undefined,{expectedStatus:200,binaryExpected:ref('upload.local.sha256')})];
        return[step];
    });
    if(plan.id==='M4.2')steps=steps.flatMap(step=>{
        if(step.id==='native-handover')return[{...step,saveAs:'handoverDetail',expect:'owned-original-handover-detail'}];
        if(step.id==='native-confirm')return[{...step,intents:[owned('project_receipt_judgment_freeze',{project_id:ref('project.id'),source_type:'project-handover',source_id:ref('handover.id'),created_by:ref('actors.admin')})],expect:'owned-original-handover-confirmation'}];
        if(step.id==='checklist')return[...sensitiveSteps(),{...step,expect:'owned-handover-ordinary-and-sensitive-candidates'}];
        if(step.id==='package')return[{...step,body:{confirmedSensitiveExclusion:true},saveAs:'packageCreated',intents:step.intents.filter(intent=>intent.table!=='attachment_download_package_item').map(intent=>intent.table==='attachment_download_package'?{...intent,selector:{...intent.selector,project_id:ref('project.id')}}:intent),generatedPackageItemsReservation:{kind:'exact-M4.2-package-child-at-real-request-context',table:'attachment_download_package_item',expectedMax:10,parentTable:'attachment_download_package',ordinaryIntentDeferred:true},bindRows:step.bindRows.map(binding=>binding.table==='attachment_download_package'?{...binding,selector:{...binding.selector,project_id:ref('project.id')}}:binding)}];
        if(step.id==='package-read')return[{...step,saveAs:'packageSummary',expect:'owned-ready-package-summary'}];
        return[step];
    });
    if(plan.id==='M4.3')steps=steps.flatMap(step=>{
        if(step.id==='fault-create')return[{...step,body:{...step.body,targetId:ref('handoverProject.id')}}];
        if(step.id==='fault-complete')return[{...step,intents:step.intents.map(intent=>intent.table==='attachment_link'?{...intent,selector:{...intent.selector,target_id:ref('handoverProject.id')}}:intent)}];
        if(step.id==='viewer-download')return[{...step,expectedStatus:403,expectedFromNative:undefined},request('other-owned-target-list','GET','/api/attachments?targetType=project&targetId={localProject.id}',undefined,{expectedStatus:200,expect:'owned-other-attachment-target-isolation'})];
        if(step.id==='stale')return[{...step,expectedStatus:409,expectedFromNative:undefined}];
        if(step.id==='failed-download')return[{...step,expectedStatus:404,expectedFromNative:undefined,expect:'owned-missing-local-object'}];
        return[step];
    });
    if(plan.id==='M4.4')steps=steps.flatMap(step=>{
        const previous=step.id==='obs-default'?'localProvider':step.id==='local-default'?'obsProvider':null;if(!previous)return[step];
        return[{kind:'owned-mutation',id:step.id==='obs-default'?'prepare-owned-local-default-off':'prepare-owned-obs-default-off',operation:'update-owned-fields',input:{table:'attachment_storage_provider_config',id:ref(previous+'.id'),values:{is_default:false}},preparedSource:{kind:'exact-original-K-owned-previous-default-off',file:'tools/rust-r2k/k-obs-actual.mjs',rawBytesSha256:'b907fbd27b6143f125414c3b958be1b6bcf6af89744a2d70050fe155a0453c1a',productRepairClaimed:false,previousProviderBinding:previous}},{...step,expect:'owned-K-prepared-single-provider-default',preparedPreviousProviderBinding:previous}];
    });
    return{...plan,steps};
}
