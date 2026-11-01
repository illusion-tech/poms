// Independent next API epoch. Old M0/URI/UI recipes remain byte-frozen.
import assert from 'node:assert/strict';
import {buildScenarioPlans as originalPlans,materializeRequest as originalRequest,ref,nativeProducerRoutes as originalNativeProducerRoutes} from './scenario-input.mjs';
import {eHttpCases} from '../rust-r2ef/e-http-plan.mjs';
import {ownershipIdentities} from './fixture-policy.mjs';
import {extendAttachmentAcceptancePlan} from './acceptance-api-attachment-recipes.mjs';
import {extendExternalAcceptancePlan} from './acceptance-api-external-recipes.mjs';
export * from './scenario-input.mjs';

export const firstApiSubset=Object.freeze(['M1.1','M1.2','M1.3','M1.4','M2.1','M2.2','M2.3','M2.4']);
export const nativeProducerRoutes=Object.freeze([...originalNativeProducerRoutes,Object.freeze({method:'POST',path:'/api/commission-adjustments/{id}:execute'})]);
export const anonymousAuthFailureCases=Object.freeze(['m1.1','m1.3','m1.4']);
export function apiCaseAllowsAnonymous(caseId){return anonymousAuthFailureCases.includes(caseId)}
export function declaredAnonymousScopeCases(input,{selection=firstApiSubset}={}){
    const declared=selection.filter(id=>apiCaseAllowsAnonymous(id.toLowerCase())).map(id=>({scopeCaseId:id.toLowerCase(),logicalCaseId:id,reason:'named-original-auth-failure-probe',auditOperatorNullPermission:false}));
    if(selection.includes('M5.1')){const plan=buildScenarioPlans(input).find(plan=>plan.id==='M5.1'),steps=plan.steps.filter(step=>step.requiresPredeclaredAnonymousScope);assert.deepEqual(steps.map(step=>step.id),['authorize','ticket-replay'],'Only the two source-bound M5 public conditions may predeclare this shared scope');declared.push({scopeCaseId:'m5.integration',logicalCaseId:'M5.1',reason:'named-original-public-auth-conditions',sourceSteps:steps.map(step=>({id:step.id,...step.requiresPredeclaredAnonymousScope})),auditOperatorNullPermission:false,externalAuditNullNeedsSeparateExactSet:true})}
    return declared;
}
const snapshotIntents=actor=>['commission_final_settlement_snapshot','commission_rule_explanation_snapshot'].map(table=>({table,selector:{project_id:ref('project.id'),created_by:ref(actor)},expectedMax:1}));
const todoRead=(id,approval,target)=>({kind:'request',id,method:'GET',path:'/api/me/todos',session:'finance',purpose:'business',expectedStatus:200,expect:'owned-pending-approval-todo',sourceApprovalId:ref(approval+'.id'),sourceTargetId:ref(target+'.id'),sourceAssigneeId:ref('borrowedActors.finance')});

export function buildScenarioPlans(input){
    return Object.freeze(originalPlans(input).map(plan=>{
        let steps=plan.steps.map(step=>({...step}));
        if(plan.id==='M2.2')steps=steps.map(step=>Object.hasOwn(step,'settingBeforeAbsentRequired')?{...step,settingBeforeAbsentRequired:false,environmentBaselineSettingAdmissionRequired:true}:step);
        if(['M4.1','M4.4'].includes(plan.id))steps=steps.map(step=>step.kind==='request'&&step.intents?.some(intent=>intent.table==='attachment_storage_provider_config')?{...step,intents:step.intents.map(intent=>intent.table==='attachment_storage_provider_config'?{...intent,selector:Object.fromEntries(Object.entries(intent.selector).filter(([key])=>key!=='key_prefix'))}:intent)}:step);
        if(plan.id==='M4.1')steps.unshift({kind:'prepared-source',id:'attachment-project-anchors',sourceKind:'draft-contract',input:ref('prepared.contractInput'),selectPreparedTables:['customer','project'],bindPrepared:{customer:'customer',project:'project'},nativeProducerClaimed:false,actualSqlExecuted:false});
        if(plan.id==='M4.2')steps=steps.map(step=>step.sourceKind==='handover'?{...step,bindPrepared:{project:'project',contract:'contract',project_handover:'handover'}}:step);
        if(plan.id==='M2.3'){
            // A current115 real user create gives the target audit read a real
            // owned event; a source-prepared customer would have no API audit.
            steps=steps.filter(step=>step.id!=='audit-customer-source');
            steps.unshift({kind:'request',id:'audit-user-source',method:'POST',path:'/api/platform/users',session:'admin',purpose:'business',body:{username:ref('names.username'),displayName:'R2M actual audit user',primaryOrgUnitId:ref('orgs.admin'),initialRoleIds:[ref('roles.viewer')]},expectedStatus:201,intents:[{table:'platform_user',selector:{username:ref('names.username')},expectedMax:1},{table:'user_org_membership',selector:{org_unit_id:ref('orgs.admin')},expectedMax:1},{table:'user_role_assignment',selector:{role_id:ref('roles.viewer')},expectedMax:1}],bindRows:[{table:'platform_user',slot:'auditUser',selector:{username:ref('names.username')},exactly:1,view:{id:'id',rowVersion:'row_version'}}]});
            steps=steps.map(step=>step.id==='target-audit'?{...step,path:'/api/audit-logs?targetType=PlatformUser&targetId={auditUser.id}',expect:'owned-platform-user-audit'}:step);
        }
        if(['M2.1','M2.3'].includes(plan.id)){
            const originalId=plan.id==='M2.1'?'user':'audit-user-source',positiveId=plan.id==='M2.1'?'user-empty-relations':'audit-user-empty-relations';
            steps=steps.flatMap(step=>{
                if(step.id!==originalId)return[step];
                const originalFailure={...step,id:originalId+'-original-relations-rollback',expectedStatus:500,expect:'inherited-user-relationships-rollback',expectedNativeFailureBoundary:'business-write-rollback-observed',bindRows:undefined,originalSourceStepId:originalId,previousCandidateExpectedStatus:201,originalRequestBodyPreserved:true};
                const positive={...step,id:positiveId,body:{...step.body,primaryOrgUnitId:null,initialRoleIds:[]},expectedStatus:201,intents:step.intents.filter(intent=>intent.table==='platform_user'),correctiveNewRequest:true,originalRelationshipFailurePreservedAs:originalFailure.id};
                const duplicate={...positive,id:'duplicate-username',body:{...positive.body,displayName:'R2M duplicate must not commit'},expectedStatus:409,expect:'inherited-user-duplicate-unchanged',intents:undefined,bindRows:undefined};
                const roles={kind:'request',id:'assign-new-user-roles',method:'PUT',path:'/api/platform/users/{newUser.id}/roles',body:{roleIds:[ref('newRole.id')]},session:'admin',purpose:'business',expectedStatus:200,expect:'owned-new-user-roles',intents:[{table:'user_role_assignment',selector:{user_id:ref('newUser.id')},expectedMax:1}]};
                return plan.id==='M2.1'?[originalFailure,positive,duplicate,roles]:[originalFailure,positive];
            });
            if(plan.id==='M2.1')steps=steps.map(step=>step.id==='stale'?{...step,id:'ignored-request-version',expectedStatus:200,expect:'inherited-user-request-version-ignored',originalRequestBodyPreserved:true,previousCandidateExpectedStatus:409}:step.id==='memberships'?{...step,expect:'owned-new-user-memberships',intents:[{table:'user_org_membership',selector:{user_id:ref('newUser.id')},expectedMax:2}]}:step);
        }
        if(plan.id==='M3.2'){
            steps=steps.map(step=>step.id==='retention-receipt'?{...step,bindRows:step.bindRows.map(binding=>({...binding,selector:{...binding.selector,source_type:'manual',receipt_amount:360}}))}:step);
            const reviews=steps.filter(step=>['signal-review','gate-review'].includes(step.id));steps=steps.filter(step=>!reviews.includes(step));const beforeRule=steps.findIndex(step=>step.id==='rule-create');assert(beforeRule>0);steps.splice(beforeRule,0,...reviews);
            steps=steps.flatMap(step=>{
                if(step.id==='signal-review')step={...step,expectedStatus:200,intents:[{table:'operating_signal_review_record',selector:{signal_evaluation_id:ref('prepared.commissionEvidence.signalEvaluationId'),created_by:ref('actors.admin')},expectedMax:1}]};
                if(step.id==='gate-review')step={...step,expectedStatus:200,intents:[{table:'commission_gate_review_record',selector:{binding_id:ref('gate.id'),created_by:ref('actors.admin')},expectedMax:1}]};
                if(['final-approve','retention-approve'].includes(step.id))return[todoRead(step.id+'-todos',step.id==='final-approve'?'finalApproval':'retentionApproval',step.id==='final-approve'?'final':'retention'),{...step,intents:[...(step.intents??[]),...snapshotIntents('borrowedActors.finance')]}];
                if(['register-final','retention-submit','departure'].includes(step.id))step={...step,intents:[...(step.intents??[]),...(step.id==='departure'?[{table:'commission_departure_exception_decision',selector:{project_id:ref('project.id'),created_by:ref('actors.admin')},expectedMax:1}]:[]),...snapshotIntents('actors.admin')]};
                return[step];
            });
            const statuses={'final-approve':{final_settlement_status:'pending-final-settlement',non_retention_settlement_status:'pending-non-retention',retention_settlement_status:'waiting-retention'},'register-final':{final_settlement_status:'pending-retention-settlement',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'waiting-retention'},departure:{final_settlement_status:'pending-retention-settlement'},'retention-submit':{final_settlement_status:'pending-retention-settlement',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'ready-retention'},'retention-approve':{final_settlement_status:'pending-retention-settlement',retention_settlement_status:'ready-retention'}};
            steps=steps.map(step=>statuses[step.id]?{...step,settlementSnapshotExpectation:statuses[step.id],snapshotActorId:ref(['final-approve','retention-approve'].includes(step.id)?'borrowedActors.finance':'actors.admin')}:step);
        }
        if(plan.id==='M3.3')steps=steps.flatMap(step=>{
            if(step.id==='first-approve')return[todoRead('first-todos-before','firstApproval','first'),step];
            if(step.id==='adjustment-submit')return[step,todoRead('adjustment-todos-before','adjustmentApproval','adjustment'),{kind:'request',id:'stale-approval-version',method:'POST',path:'/api/approval-records/{adjustmentApproval.id}:approve',body:{expectedVersion:2147483647},session:'finance',purpose:'business',expectedStatus:409,expect:'owned-approval-stale-unchanged'}];
            if(step.id==='adjustment-resubmit'){
                const{intents,bindRows,...originalDenied}=step;
                return[{...originalDenied,expectedStatus:400,expect:'owned-rejected-adjustment-resubmit-unchanged',originalRequestBodyPreserved:true,sameEntityResubmissionPermitted:false},
                    {kind:'original-source-request',id:'fresh-adjustment-create',source:'tools/rust-r2l/l-producer-recipes.mjs',exportName:'adjustmentRequest',args:[ref('project'),ref('calculation'),ref('firstApproved'),'R2M actual adjustment'],session:'admin',purpose:'producer',expectedStatus:201,intents:[{table:'commission_adjustment',selector:{project_id:ref('project.id')},expectedMax:1}],bindRows:[{table:'commission_adjustment',slot:'freshAdjustment',selector:{project_id:ref('project.id'),status:'draft'},exactly:1,view:{id:'id',rowVersion:'row_version'}}],freshIndependentTarget:true},
                    {kind:'original-source-request',id:'fresh-adjustment-submit',source:'tools/rust-r2l/l-producer-recipes.mjs',exportName:'submitAdjustmentRequest',args:[ref('freshAdjustment')],session:'admin',purpose:'producer',expectedStatus:200,intents:[{table:'approval_record',selector:{target_object_id:ref('freshAdjustment.id')},expectedMax:1},{table:'todo_item',selector:{target_object_id:ref('freshAdjustment.id')},expectedMax:2}],bindRows:[{table:'approval_record',slot:'freshAdjustmentApproval',selector:{target_object_id:ref('freshAdjustment.id'),current_status:'pending'},exactly:1,view:{id:'id',rowVersion:'row_version'}}],freshIndependentTarget:true}];
            }
            if(step.id==='approve')return[{...step,path:'/api/approval-records/{freshAdjustmentApproval.id}:approve',body:{expectedVersion:ref('freshAdjustmentApproval.rowVersion')},expect:'owned-fresh-adjustment-approved',sameEntityResubmissionClaimed:false},
                {kind:'request',id:'fresh-adjustment-execute',method:'POST',path:'/api/commission-adjustments/{freshAdjustment.id}:execute',body:{expectedVersion:ref('freshAdjustment.rowVersion')},session:'admin',purpose:'producer',expectedStatus:200,expect:'owned-fresh-adjustment-executed',originalNativeProducerOnly:true}];
            return[step];
        });
        if(plan.id==='M3.1')steps=steps.map(step=>step.id==='todos-before'?{...step,expect:'owned-pending-approval-todo',sourceApprovalId:ref('approval.id'),sourceTargetId:ref('contract.id'),sourceAssigneeId:ref('borrowedActors.approver')}:step.id==='todos-after'?{...step,sourceTargetId:ref('contract.id')}:step);
        if(plan.id==='M5.1')steps=steps.map(step=>{
            if(step.id==='bind-external')return{...step,bindRows:[{table:'external_identity',slot:'externalIdentity',selector:{identity_provider_config_id:ref('identityProvider.id'),poms_user_id:ref('actors.viewer'),subject_id:ref('inputs.externalSubject')},exactly:1,view:{id:'id',rowVersion:'row_version'}}]};
            if(step.id==='authorize')return{...step,saveAs:undefined,saveResponseAs:'authorize'};
            if(step.id==='callback')return{...step,expectedStatus:200,saveAs:undefined,saveResponseAs:'callback',intents:[{table:'external_login_ticket',selector:{identity_provider_config_id:ref('identityProvider.id'),external_identity_id:ref('externalIdentity.id'),poms_user_id:ref('actors.viewer')},expectedMax:1}]};
            if(step.id==='grant-callback')return{...step,saveResponseAs:'grantCallback'};
            return step;
        });
        if(plan.id==='M5.2')steps=steps.map(step=>step.id==='preview'?{...step,intents:[...(step.intents??[]),{table:'org_sync_diff_item',selector:{external_department_id:'m-department-a'},expectedMax:1}],bindRows:[...(step.bindRows??[]),{table:'external_department_mapping',slot:'mapping',selector:{source_id:ref('orgSource.id'),external_department_id:'m-department-a'},exactly:1,view:{id:'id',rowVersion:'row_version'}}]}:step);
        steps=steps.map(step=>{
            if(step.kind!=='original-source-request'||step.expectedStatus!==undefined)return step;
            const creates=new Set(['commissionRuleRequest','roleAssignmentRequest','calculationRequest','payoutRequest','adjustmentRequest','fundingReceiptRequests','departureRequest']);
            return{...step,expectedStatus:creates.has(step.exportName)?201:200};
        });
        if(['M3.2','M3.3'].includes(plan.id))steps=steps.filter(step=>step.id!=='commission-customer');
        // The actual Fixture requires each approval/Todo intent's immutable
        // project parent before the request. The target ID alone is not proof.
        if(plan.id.startsWith('M3.'))steps=steps.map(step=>({...step,...(step.intents?{intents:step.intents.map(intent=>ownershipIdentities[intent.table]?.includes('project_id')?{...intent,selector:{...intent.selector,project_id:ref('project.id')}}:intent)}:{})}));
        const extended=extendExternalAcceptancePlan(extendAttachmentAcceptancePlan({...plan,steps}));
        return Object.freeze({...extended,...(plan.id==='M2.2'?{settingBeforeAbsentRequired:false,environmentBaselineSettingAdmissionRequired:true}:{}),steps:Object.freeze(extended.steps),fullPhysicalFactProjectionRequired:107,anonymousAuthFailureProbe:apiCaseAllowsAnonymous(plan.id.toLowerCase())});
    }));
}

export function materializeRequest(step,values){
    const built=originalRequest(step,values);
    if(step.kind==='source-E-case'){
        const found=eHttpCases({dictionaryId:values.dictionary?.id??values.missingId,missingId:values.missingId,createCode:values.names.dictionaryCode}).find(item=>item.id==='e:'+step.name);assert(found,'Protected original E source case required');
        if(found.headers)built.headers={...found.headers};
    }
    return built;
}

export function auditApiPlans(input,{selection=firstApiSubset}={}){
    const plans=buildScenarioPlans(input);assert.equal(plans.length,20);assert(Array.isArray(selection)&&selection.length>0&&new Set(selection).size===selection.length&&selection.every(id=>plans.some(plan=>plan.id===id)),'Finite known API selection required');
    let intents=0;for(const plan of plans)for(const step of plan.steps)for(const intent of step.intents??[]){const allowed=ownershipIdentities[intent.table];assert(Array.isArray(allowed)&&Object.keys(intent.selector).every(key=>allowed.includes(key)),'API intent contains a non-immutable field');intents++}
    return{kind:'r2m-API-source-only-plan-preflight',logicalPlans:plans.length,selection:[...selection],selectedLogicalPlans:selection.length,intentsValidated:intents,fullFactTablesRequired:107,actualExecution:false};
}
