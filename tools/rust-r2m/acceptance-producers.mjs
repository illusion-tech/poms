// Root-invoked actual producer preparation for the next source epoch. No
// environment/private/DB/HTTP/process operation happens merely on import.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import * as recipe from '../rust-r2l/l-producer-recipes.mjs';
import {inspectCommissionPreparedSource,buildCommissionPreparedRows} from './fixture-prepared-source.mjs';

const VP='00000000-0000-4000-8000-000000000008',FINANCE='00000000-0000-4000-8000-000000000014';
const ORIGINAL_ADMIN='00000000-0000-4000-8000-000000000001',ORIGINAL_VIEWER='00000000-0000-4000-8000-000000000002',ORIGINAL_ORG='10000000-0000-4000-8000-000000000001';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const view=row=>({...row,...Object.fromEntries(Object.entries(row).filter(([key])=>key.includes('_')).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value]))});

export async function captureOriginalContractCancellation({native,context,approvalRecord,actorId,sourceCapId,retain}){
    const beforeCreateKeys=new Set(native.witness.snapshot().committed.map(item=>item.table+':'+item.id)),sqlFrom=native.sql.length,input={approvalRecordId:approvalRecord.id,actorUserId:actorId,reason:'M UoW actual original cancellation',expectedVersion:approvalRecord.row_version};let result;
    const evidence=()=>({sourceCapId,context,originalMethod:'ApprovalService.rejectRecord',input,beforeApproval:approvalRecord,commandResult:result??null,actualSql:native.sql.slice(sqlFrom),actualSdkTrace:native.witness.snapshot()});
    try{
        await native.withOriginalSdkScope(context,async({approval})=>{result=await approval.rejectRecord(input.approvalRecordId,input.actorUserId,{reason:input.reason,expectedVersion:input.expectedVersion});return result});await native.witness.drain();
        const record=evidence(),newCreates=record.actualSdkTrace.committed.filter(item=>!beforeCreateKeys.has(item.table+':'+item.id));await retain({kind:'actual-original-SDK-contract-cancellation-before-required-assertions',record:{...record,newCreates,noNewCreates:newCreates.length===0}});
        native.witness.assertComplete();assert.equal(newCreates.length,0,'Original contract reject must not invent a new creation path');return result;
    }catch(error){await retain({kind:'actual-original-SDK-contract-cancellation-failure-and-preserved-trace',record:{...evidence(),failure:{name:error.name,message:error.message,stack:error.stack}}});throw error}
}

export const uowVariants=Object.freeze([
    {variant:'success-commit',outer:'commit',childSuccess:true,continueAfterServiceError:false},
    {variant:'success-rollback',outer:'rollback',childSuccess:true,continueAfterServiceError:false},
    {variant:'gate-rollback',outer:'rollback',childSuccess:false,continueAfterServiceError:false},
    {variant:'gate-continue-commit',outer:'commit',childSuccess:false,continueAfterServiceError:true},
].map(Object.freeze));

export function mapCommissionSource(inspection,{adminId,viewerId,orgId,projectId,uuid=randomUUID}){
    assert.equal(inspection.requiredUuidMappings.length,21,'Exact original selected UUID closure required');
    const fixed=new Map([[ORIGINAL_ADMIN,adminId],[ORIGINAL_VIEWER,viewerId],[ORIGINAL_ORG,orgId],[inspection.originalFixture.projectId,projectId]]);
    for(const id of fixed.keys())assert(inspection.requiredUuidMappings.some(item=>item.from===id),'Named original mapping is absent');
    const mappings=Object.fromEntries(inspection.requiredUuidMappings.map(({from})=>[from,fixed.get(from)??uuid()]));
    assert.equal(new Set(Object.values(mappings)).size,21);return mappings;
}
export function originalRoleAssignmentSelector(projectId){assert(typeof projectId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId));return{project_id:projectId,created_by:null};}
export function originalCalculationSelector(projectId,ruleVersionId){originalRoleAssignmentSelector(ruleVersionId);return{...originalRoleAssignmentSelector(projectId),rule_version_id:ruleVersionId};}
export function originalFinalPayoutSelector(projectId,calculationId){originalRoleAssignmentSelector(calculationId);return{...originalRoleAssignmentSelector(projectId),calculation_id:calculationId,stage_type:'final',payout_kind:'primary'};}

export function preparedEvidenceFromPlan(plan){
    assert(plan.kind==='commission-prepared-original-source-typed-rows'&&plan.rows.length===18,'Exact reviewed18 source plan required');
    const one=table=>{const rows=plan.rows.filter(item=>item.table===table);assert.equal(rows.length,1,'One exact original table projection required');return rows[0].values};
    const summaries=plan.rows.filter(item=>item.table==='approval_summary_snapshot'&&item.values.summary_package_id===plan.readonlyBorrowedDefinitions.operatingSignalSummaryPackageId);assert.equal(summaries.length,1,'Exact readonly operating definition summary required');
    const handover=one('project_handover'),summary=summaries[0].values;
    return{projectId:one('project').id,contractId:one('contract').id,handoverId:handover.id,handoverSummarySnapshotId:handover.summary_snapshot_id,gateBindingId:one('operating_signal_gate_binding').id,signalEvaluationId:one('operating_signal_evaluation_result').id,baselinePackageId:one('operating_baseline_package').id,operatingSnapshotId:one('project_operating_snapshot').id,summarySnapshotId:summary.id,summaryPackageKey:summary.summary_package_key};
}

// The precise original 18-row cohort deliberately has no customer FK. Do not
// feed its NULL into a separate draft constructor or invent an extra anchor.
export async function buildSharedUowCohortPlan({runId,adminId,viewerId,orgId,projectId,variant,sourceReader}){
    const variantIndex=uowVariants.findIndex(item=>item.variant===variant);assert(variantIndex>=0);
    for(const value of[runId,adminId,viewerId,orgId,projectId])assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),'Every actual commission source UUID must be bound');
    for(const file of['tools/rust-r2m/fixture-prepared-source.mjs','apps/poms-api/src/seeders/database.seeder.ts'])sourceReader.read(file);
    const inspection=await inspectCommissionPreparedSource(),input={uuidMappings:mapCommissionSource(inspection,{adminId,viewerId,orgId,projectId}),names:{projectNo:'M-UOW-P-'+runId+'-'+variantIndex,projectName:'M UoW '+runId+' v'+variantIndex,contractNo:'M-UOW-C-'+runId+'-'+variantIndex},logicalIds:[runId]},plan=await buildCommissionPreparedRows(input);
    assert.equal(plan.rows.find(item=>item.table==='project').values.customer_id,null,'The original source NULL relationship must remain exact');sourceReader.assertUnchanged();return{input,plan,originalProjectCustomerId:null,customerAnchorInserted:false};
}

function publicSeedCredentials(reader,name){
    const file='apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts',source=reader.text(file);
    assert(['vp_owner','finance_mgr'].includes(name),'Only the two G1 readonly principals');
    const expression=new RegExp("username:\\s*'"+name+"',\\s*password:\\s*'([^']+)'"),found=expression.exec(source);
    assert(found,'Current pinned original seed credential declaration required');
    return {username:name,password:found[1]};
}

// Four invocations each build a new project/cohort. The callback executes one
// actual fixed-dispatch request and certifies it before returning; callbacks
// never grant ownership from the returned DTO ID.
export async function prepareSharedUowVariant({fixture:f,native,variant,sourceReader,sourceCapId,perform,retain,nextContext}){
    const variantIndex=uowVariants.findIndex(item=>item.variant===variant);assert(variantIndex>=0);
    for(const fn of[perform,retain,nextContext])assert.equal(typeof fn,'function');assert(native?.metadata&&sourceReader);
    const config=uowVariants[variantIndex],caseId='m3.uow.v'+variantIndex,runId=f.runId;
    for(const file of['tools/rust-r2m/acceptance-producers.mjs','tools/rust-r2l/l-producer-recipes.mjs','tools/rust-r2l/prepared-contract-source.mjs','tools/rust-r2m/fixture-prepared-source.mjs','apps/poms-api/src/seeders/database.seeder.ts','apps/poms-api/src/seeders/dev-seed-data.ts','apps/poms-api/src/app/features/approval/approval.service.ts'])sourceReader.read(file);
    const definitions=f.j.borrowed.definitions.map(item=>item.id),orgId=f.base.accounts.find(item=>item.account==='admin').orgId;
    f.defineCase(caseId,{actors:Object.values(f.actors),projects:[],borrowedActors:[VP,FINANCE],borrowedDefinitions:definitions});
    const projectId=await f.planProject(caseId),{plan}=await buildSharedUowCohortPlan({runId,adminId:f.actors.admin,viewerId:f.actors.viewer,orgId,projectId,variant,sourceReader});
    await retain({kind:'planned-exact-original-source-commission-cohort',record:{plan,originalProjectCustomerId:null,customerAnchorInserted:false,preparedNotNativeProduced:true}});
    await f.insertPreparedBatch(plan,{caseId});
    const owned=async(table,id)=>{
        assert(/^[a-z_]+$/.test(table),'Fixed catalog table required');
        const certificate=f.j.objects.find(item=>item.table===table&&item.id===id);assert(certificate?.creationProof&&certificate.postcondition?.independentlyVisible,'DTO/query ID is not ownership');
        const result=await f.client.query('select to_jsonb(t) as row from poms."'+table+'" t where id=$1::uuid',[id]);assert.equal(result.rows.length,1);return result.rows[0].row;
    };
    const project=await owned('project',projectId),contract=await owned('contract',plan.rows.find(item=>item.table==='contract').values.id);
    const byTable=table=>plan.rows.find(item=>item.table===table).values;
    const gate=byTable('operating_signal_gate_binding');
    const prepared=preparedEvidenceFromPlan(plan);
    for(const field of['handoverId','handoverSummarySnapshotId','gateBindingId','signalEvaluationId','baselinePackageId','operatingSnapshotId','summarySnapshotId','summaryPackageKey'])assert(prepared[field],'Missing exact original prepared evidence field');
    const watches=(table,selector,max=1)=>({table,selector,max});
    async function send(id,command,{status=200,watch=[],session='admin',executionBackend='nest'}={}){
        const body=command.body,pathname=command.path.startsWith('/api/')?command.path:'/api'+command.path;
        for(const item of watch)await f.intent(item.table,item.selector,{caseId,expectedMax:item.max});
        await retain({kind:'actual-producer-command-input',record:{sourceCapId,variant,caseId,id,method:command.method,path:pathname,body,originalSource:command.source,originalWrites:command.writes??[],expectedStatus:status}});
        const response=await perform({caseId,logicalCase:'M3.4',stepId:id,executionBackend,session,method:command.method,path:pathname,body,purpose:executionBackend===f.backend?'business':'producer'});
        assert.equal(response.status,status,'Actual original producer/selected consumer status changed');return response.body;
    }
    // These are actual current Cookie logins, not copied/authenticated cookies.
    for(const[session,username,id]of[['approver','vp_owner',VP],['finance','finance_mgr',FINANCE]]){
        await send('login-'+session+'-csrf',{method:'GET',path:'/auth/csrf-token'},{executionBackend:f.backend,session});
        await send('login-'+session,{method:'POST',path:'/auth/sessions',body:publicSeedCredentials(sourceReader,username)},{executionBackend:f.backend,session,watch:[watches('auth_session',{user_id:id})]});
    }
    const reviewInput={...plan.rows.find(item=>item.table==='contract').values,id:randomUUID(),contract_no:'M-UOW-REV-'+runId+'-'+variantIndex,status:'draft',current_snapshot_id:null};
    const review=await f.insert('contract',reviewInput,{caseId});
    await retain({kind:'exact-source-contract-draft-overrides',record:{source:plan.rows.find(item=>item.table==='contract').source,originalSelectedValues:plan.rows.find(item=>item.table==='contract').values,overrides:{id:review.id,contract_no:review.contract_no,status:'draft',current_snapshot_id:null},preparedNotNativeGenerated:true}});
    await send('contract.submit.reject',recipe.contractRequests(view(review),{comment:'M UoW actual Native submit'}).submit,{watch:[watches('approval_record',{project_id:projectId},2),watches('todo_item',{project_id:projectId},2)]});
    const current=(await f.facts()).tables;
    const approvalIds=new Set(f.j.objects.filter(item=>item.table==='approval_record').map(item=>item.id));
    const rejectedApproval=current.find(item=>item.table==='approval_record').rows.filter(item=>approvalIds.has(item.id)&&item.target_object_id===review.id&&item.current_status==='pending');assert.equal(rejectedApproval.length,1);
    const cancellationCase=caseId+'.cancel-source';f.defineCase(cancellationCase,{actors:Object.values(f.actors),projects:[projectId],borrowedActors:[VP],borrowedDefinitions:definitions});
    const context=native.admitOriginalSdkContext(nextContext(cancellationCase,'m.internal-uow'));
    const cancelSqlFrom=native.sql.length;
    const cancelled=await captureOriginalContractCancellation({native,context,approvalRecord:rejectedApproval[0],actorId:VP,sourceCapId,retain});
    const all=(await f.facts()).tables,todos=all.find(item=>item.table==='todo_item').rows.filter(item=>item.source_id===rejectedApproval[0].id&&item.project_id===projectId&&item.status==='canceled');assert.equal(todos.length,1);
    const dirtyTodo=await owned('todo_item',todos[0].id);assert.equal((await owned('contract',review.id)).status,'draft');
    await retain({kind:'actual-original-SDK-contract-cancellation-and-outer-events',record:{sourceCapId,context,originalMethod:'ApprovalService.rejectRecord',input:{approvalRecordId:rejectedApproval[0].id,actorUserId:VP,reason:'M UoW actual original cancellation',expectedVersion:rejectedApproval[0].row_version},beforeApproval:rejectedApproval[0],commandResult:cancelled,afterContract:await owned('contract',review.id),afterApproval:await owned('approval_record',rejectedApproval[0].id),dirtyTodo,actualSql:native.sql.slice(cancelSqlFrom),actualSdkTrace:native.witness.snapshot(),noNewCreates:true}});
    const originalGate=await owned('operating_signal_gate_binding',gate.id),originalSignal=await owned('operating_signal_evaluation_result',prepared.signalEvaluationId);
    const reviewRequests=recipe.operatingReviewRequests(prepared,{signalVersion:originalSignal.row_version,bindingVersion:originalGate.row_version,reviewComment:'M UoW original operating gate'});
    await send('signal-review',reviewRequests.signal,{watch:[watches('operating_signal_review_record',{signal_evaluation_id:prepared.signalEvaluationId,created_by:f.actors.admin})]});
    const gateReview=await send('gate-review',reviewRequests.gate,{watch:[watches('commission_gate_review_record',{binding_id:gate.id,created_by:f.actors.admin})]});
    const unique='M-'+runId.replaceAll('-','')+'-v'+variantIndex,ruleCommand=recipe.commissionRuleRequest(unique);
    let rule=await send('rule-create',ruleCommand,{status:201,watch:[watches('commission_rule_version',{rule_code:ruleCommand.body.ruleCode})]});await owned('commission_rule_version',rule.id);await send('rule-activate',recipe.activateRuleRequest(rule));rule=view(await owned('commission_rule_version',rule.id));
    const profile={id:f.actors.admin,displayName:'R2M admin'},assignment=await send('assignment-create',recipe.roleAssignmentRequest(view(project),profile),{status:201,watch:[watches('commission_role_assignment',originalRoleAssignmentSelector(projectId))]});await owned('commission_role_assignment',assignment.id);
    const frozen=await send('assignment-freeze',recipe.freezeAssignmentRequest(assignment,prepared));
    async function calculation(name){let row=await send(name+'-create',recipe.calculationRequest(view(project),rule),{status:201,watch:[watches('commission_calculation',originalCalculationSelector(projectId,rule.id))]});await owned('commission_calculation',row.id);row=await send(name+'-approve',recipe.approveCalculationRequest(row));assert.equal(row.status,'effective');return row}
    async function finalPayout(name,calculation){let row=await send(name+'-create',recipe.payoutRequest(view(project),calculation,'final'),{status:201,watch:[watches('commission_payout',originalFinalPayoutSelector(projectId,calculation.id))]});await owned('commission_payout',row.id);row=await send(name+'-submit',recipe.submitPayoutRequest(row),{watch:[watches('approval_record',{project_id:projectId},2),watches('todo_item',{project_id:projectId},2)]});return row}
    const calculationOne=await calculation('calculation-one'),finalOne=await finalPayout('final-one',calculationOne);
    async function approvalFor(target){const facts=await f.facts(),ids=new Set(f.j.objects.filter(item=>item.table==='approval_record').map(item=>item.id)),found=facts.tables.find(item=>item.table==='approval_record').rows.filter(item=>ids.has(item.id)&&item.target_object_id===target.id&&item.current_status==='pending');assert.equal(found.length,1);return owned('approval_record',found[0].id)}
    const initial=await approvalFor(finalOne);
    await send('initial-final-candidate-approve',{method:'POST',path:'/approval-records/'+initial.id+':approve',body:{expectedVersion:initial.row_version}},{session:'finance',executionBackend:f.backend,watch:[watches('commission_final_settlement_snapshot',{project_id:projectId,created_by:FINANCE}),watches('commission_rule_explanation_snapshot',{project_id:projectId,created_by:FINANCE})]});
    const calculationTwo=await calculation('calculation-two'),pending=await finalPayout('final-two',calculationTwo),approval=await approvalFor(pending);
    const facts=await f.facts(),finals=facts.tables.find(item=>item.table==='commission_final_settlement_snapshot').rows.filter(item=>item.project_id===projectId&&item.is_current),rules=facts.tables.find(item=>item.table==='commission_rule_explanation_snapshot').rows.filter(item=>item.project_id===projectId&&item.is_current);assert.equal(finals.length,1);assert.equal(rules.length,1);assert.equal(rules[0].final_settlement_snapshot_id,finals[0].id);
    if(!config.childSuccess)await f.updateOwned('operating_signal_gate_binding',gate.id,{binding_action:'block'},'M UoW exact original gate veto precondition');
    sourceReader.assertUnchanged();
    const result={kind:'actual-four-variant-source-preparation-one-world',variant,sourceCapId,caseId,project:await owned('project',projectId),approval:await owned('approval_record',approval.id),payout:await owned('commission_payout',pending.id),dirtyTodo,gateBindingId:gate.id,gateReview,currentPair:{final:finals[0],rule:rules[0]},frozen,prepared,config,nativeContractCancellation:cancelled,preparedCohortNativeGenerated:false,actualNativeProducerCommands:true};
    await retain({kind:'actual-shared-uow-variant-owned-inputs',record:result});return result;
}
