// Future full20 supplier/auth/sync requests. Real peers and ownership remain
// Root/A responsibilities; these recipes do not read or mutate an environment.
import {ref} from './scenario-input.mjs';
export function extendExternalAcceptancePlan(plan){
    let steps=plan.steps;
    if(plan.id==='M5.1')steps=steps.flatMap(step=>{
        if(step.id==='provider-test')return[{...step,body:{capability:'external-org-sync',externalRootDepartmentId:'m-root'},expect:'owned-supplier-readiness-success'}];
        if(step.id==='grant-callback')return[{...step,headers:{accept:'text/html'},expectedStatus:302,expectedFromNative:undefined,expect:'owned-oauth-grant-success',bindRows:[{table:'identity_provider_oauth_grant',slot:'oauthGrantRow',selector:{identity_provider_config_id:ref('identityProvider.id'),poms_user_id:ref('actors.admin')},exactly:1,view:{id:'id',rowVersion:'row_version'}}]}];
        if(step.id==='grant-read')return[{...step,expect:'owned-oauth-grant-summary'}];
        if(step.id==='public-providers')return[{kind:'request',id:'external-csrf',method:'GET',path:'/api/auth/csrf-token',session:'external',purpose:'business',expectedStatus:200},step];
        if(step.id==='callback')return[{...step,bindRows:[{table:'external_login_ticket',slot:'loginTicket',selector:{identity_provider_config_id:ref('identityProvider.id'),external_identity_id:ref('externalIdentity.id'),poms_user_id:ref('actors.viewer')},exactly:1,view:{id:'id',ticketHash:'ticket_hash'}}]}];
        if(step.id==='authorize')return[{...step,requiresPredeclaredAnonymousScope:{source:'original-public-authorize-fixed-null-operator',auditPermission:'exact-source-bound-set-only'}}];
        if(step.id==='ticket')return[{...step,expect:'owned-external-login-session'}];
        if(step.id==='ticket-replay')return[{...step,expectedStatus:401,expectedFromNative:undefined,expect:'owned-ticket-replay-rejected',requiresPredeclaredAnonymousScope:{source:'original-public-consume-ticket-unauthorized-failure',auditPermission:'none'}}];
        return[step];
    });
    if(plan.id==='M5.2')steps=steps.map(step=>{
        if(step.id==='preview')return{...step,expect:'owned-org-sync-preview'};
        if(step.id==='diff')return{...step,bindRows:[{table:'org_sync_diff_item',slot:'syncDiff',selector:{run_id:ref('syncRun.id'),external_department_id:'m-department-a',action:'create_org_unit'},exactly:1,view:{id:'id',rowVersion:'row_version',candidateSnapshot:'candidate_snapshot_json'}}]};
        if(step.id==='apply')return{...step,body:{...step.body,approvedDiffItemIds:[ref('syncDiff.id')]},intents:[{table:'org_unit',selector:{code:ref('syncDiff.candidateSnapshot.targetCode')},expectedMax:1}],bindRows:[{table:'org_unit',slot:'syncedOrg',selector:{code:ref('syncDiff.candidateSnapshot.targetCode')},exactly:1,view:{id:'id',rowVersion:'row_version',name:'name',code:'code'}}],expect:'owned-external-org-applied'};
        if(step.id==='platform-tree')return{...step,expect:'owned-synced-org-in-platform-tree'};
        if(step.id==='platform-user')return{...step,expect:'owned-viewer-in-platform-users'};
        return step;
    });
    if(plan.id==='M5.3')steps=steps.map(step=>step.id==='connection-timeout'?{...step,body:{capability:'external-org-sync',externalRootDepartmentId:'m-root'},expectedStatus:200,expectedFromNative:undefined,expect:'owned-supplier-readiness-timeout'}:step);
    return{...plan,steps};
}
