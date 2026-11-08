// New explicit whole-allocation mixed live/period inventory219. No old writer/kind is invoked.
import assert from 'node:assert/strict';import {C219} from './facts219.mjs';
const F='apps/poms-api-rust/src/project_cost_governance/service.rs';
const G=name=>`apps/poms-api-rust/src/project_operating/${name}.rs`;
const H=name=>`apps/poms-api-rust/src/project_operating_signals/${name}.rs`;
const p=x=>Array.isArray(x)?x:[x],eq=(field,value)=>({eq:{path:p(field),value}}),all=(...and)=>({and});
const relation=(outer,table,inner,condition)=>({relation:{outer:p(outer),table,inner:p(inner),condition}});
const runtime=(field,name)=>({runtime:{path:p(field),name}}),exists=(table,condition)=>({exists:{table,condition}});
const andEq=values=>all(...Object.entries(values).map(([k,v])=>eq(k,v)));
export function inventory219(f){
 assert.equal(f.version,219);assert.equal(f.branch,'explicit-allocation-mixed-period');assert(f.targets.some(t=>t.periodEndSnapshotRef));assert(f.targets.some(t=>!t.periodEndSnapshotRef));
 const operationId=C219.operation,entries=[];const add=(key,table,event,match,source,options={})=>entries.push({key,table,event,match,source,expectedRows:1,...options});
 const newBasis=eq('supersedes_id',f.basisId);
 add('F-basis-evidence','cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationBasis'),eq(['frozen_payload','predecessorBasisId'],f.basisId)),F);add('F-old-basis','shared_cost_allocation_basis','UPDATE',andEq({id:f.basisId,status:'superseded'}),F);add('F-old-source-snapshot','shared_cost_allocation_source_snapshot','UPDATE',andEq({basis_id:f.basisId,is_current:false}),F,{expectedRows:f.sourceCount});add('F-new-basis','shared_cost_allocation_basis','INSERT',newBasis,F);add('F-new-source-snapshot','shared_cost_allocation_source_snapshot','INSERT',relation('basis_id','shared_cost_allocation_basis','id',newBasis),F,{expectedRows:f.sourceCount});
 for(const result of f.results){add('F-old-result:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({id:result.id,status:'superseded'}),F);add('F-result-evidence:'+result.id,'cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationResult'),eq(['frozen_payload','predecessorResultId'],result.id)),F);add('F-new-result:'+result.id,'shared_cost_allocation_result','INSERT',andEq({project_id:result.projectId,supersedes_id:result.id}),F);add('G-share-consumption:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({project_id:result.projectId,supersedes_id:result.id,is_included_in_project_cost:true,row_version:2}),G('inclusion'),{insertedThenUpdated:true});}
 const audit=(key,targetType,condition,projectId)=>add(key,'audit_log','INSERT',all(andEq({event_type:operationId,operator_id:f.actorId,result:'success',target_type:targetType}),runtime('request_id','requestId'),eq(['metadata','projectId'],projectId),condition),'apps/poms-api-rust/src/contract_support/mod.rs');
 for(const project of f.projects)audit('F-basis-audit:'+project.projectId,'SharedCostAllocationBasis',relation('target_id','shared_cost_allocation_basis','id',newBasis),project.projectId);
 const inherited=f.results.map(x=>({...x,headEvent:'INSERT'}));for(const item of inherited){const decision=andEq({project_id:item.projectId,supersedes_id:item.oldDecisionId});add('G-transition-decision:'+item.oldDecisionId,'project_cost_inclusion_decision','INSERT',decision,G('inclusion'));add('G-transition-head:'+item.oldDecisionId,'project_cost_inclusion_head',item.headEvent,relation('decision_id','project_cost_inclusion_decision','id',decision),G('inclusion'));}
  for(const target of f.targets){
    const key=target.restatesSnapshotRef.id,pid=target.projectId;
    const snapshot=andEq({project_id:pid,supersedes_id:key,snapshot_mode:'restated'});
    const context=andEq({project_id:pid}); const targetContext=all(context,eq(['frozen_payload','snapshot','restatesSnapshotRef','id'],key));
    const throughSnapshot=field=>relation(field,'project_operating_snapshot','id',snapshot);
    const throughContext=field=>relation(field,'operating_source_context','id',targetContext);
    const evidence=all(eq('project_id',pid),throughSnapshot('snapshot_id'));
    const throughEvidence=field=>relation(field,'operating_evaluation_evidence','id',evidence);
    const binding=all(eq('project_id',pid),relation('signal_evaluation_id','operating_signal_evaluation_result','id',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id'))));
    const summary=all(andEq({approval_scenario_key:'commission-gate-review',summary_package_key:'project-operating-commission-gate-v1',target_type:'operating-signal-gate-binding',created_by:f.actorId}),relation('target_id','operating_signal_gate_binding','id',binding));
    add('G-terminal-cas:'+key,'project_operating_snapshot','UPDATE',andEq({id:key,status:'superseded'}),G('restatement'));
    add('G-context:'+key,'operating_source_context','INSERT',targetContext,G('capture'));
    add('G-snapshot:'+key,'project_operating_snapshot','INSERT',snapshot,G('capture'));
    add('G-source-members:'+key,'operating_source_member','INSERT',throughContext('context_id'),G('capture'),{selector:all(throughContext('context_id'),eq('source_kind','OperatingBaselinePackage')),expectedRows:{kind:'context-members',target:key}});
    add('G-cost-members:'+key,'operating_snapshot_cost_member','INSERT',all(eq('project_id',pid),throughSnapshot('snapshot_id')),G('capture'),{expectedRows:{kind:'context-costs',target:key}});
    add('G-head-cas:'+key,'project_operating_head','UPDATE',andEq({project_id:pid,row_version:target.finalHeadVersion}),G('store'),{selector:andEq({project_id:pid,row_version:target.newHeadVersion})});
    add('H-evidence:'+key,'operating_evaluation_evidence','INSERT',all(evidence,eq('evaluated_by',f.actorId)),H('service'));
    add('H-reasons:'+key,'operating_evaluation_reason','INSERT',throughEvidence('evidence_id'),H('service'),{selector:all(throughEvidence('evidence_id'),eq('reason_index',0)),expectedRows:{kind:'evaluation-reasons',target:key}});
    add('H-maturity:'+key,'data_maturity_evaluation_result','INSERT',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')),H('service'));
    add('H-signal:'+key,'operating_signal_evaluation_result','INSERT',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')),H('service'));
    add('H-bindings:'+key,'operating_signal_gate_binding','INSERT',binding,H('service'),{selector:all(binding,eq('gate_stage_type','retention')),expectedRows:4});
    add('H-summaries:'+key,'approval_summary_snapshot','INSERT',summary,H('summary'),{deferred:true,selector:all(summary,relation('target_id','operating_signal_gate_binding','id',eq('gate_stage_type','retention'))),expectedRows:4});
    add('H-summary-fields:'+key,'approval_summary_field_projection','INSERT',relation('summary_snapshot_id','approval_summary_snapshot','id',summary),H('summary'),{deferred:true,selector:all(eq('field_order',3),relation('summary_snapshot_id','approval_summary_snapshot','id',all(summary,relation('target_id','operating_signal_gate_binding','id',eq('gate_stage_type','retention'))))),expectedRows:16});
    add('H-summary-payloads:'+key,'operating_gate_summary_payload','INSERT',all(eq('project_id',pid),throughSnapshot('snapshot_id')),H('summary'),{selector:all(eq('project_id',pid),throughSnapshot('snapshot_id'),eq('gate_stage_type','retention')),expectedRows:4});
    const record=andEq({project_id:pid,restates_snapshot_id:key});
    add('G-restatement:'+key,'operating_restatement_record','INSERT',record,G('service'));
    audit(target===f.targets[0]?'required-success-audit':'G-root-audit:'+key,'OperatingRestatementRecord',relation('target_id','operating_restatement_record','id',record),pid);
    add('H-policy-audit:'+key,'audit_log','INSERT',all(andEq({event_type:'OperatingPolicy_evaluate',operator_id:f.actorId,result:'success'}),runtime('request_id','requestId'),eq(['metadata','projectId'],pid),relation('target_id','operating_signal_evaluation_result','id',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')))),H('service'));
  }
  for(const project of f.projects){
    for(const id of project.oldBindingIds)add('H-old-binding:'+id,'operating_signal_gate_binding','UPDATE',andEq({id,status:'superseded'}),H('service'));
    for(const id of project.oldGateReviewIds)add('H-old-gate-review:'+id,'commission_gate_review_record','UPDATE',andEq({id,status:'superseded'}),H('service'));
  }
  const receipt=andEq({operation_id:operationId,actor_id:f.actorId,target_scope:f.primaryProjectId});
  add('A219-command-receipt','operating_command_receipt','INSERT',receipt,G('service'));
  add('pending-auth-coflush','auth_session','UPDATE',all(runtime('id','sessionId'),eq('user_id',f.actorId),exists('audit_log',all(runtime('request_id','requestId'),andEq({event_type:operationId,operator_id:f.actorId,result:'success'})))), 'apps/poms-api-rust/src/auth/store.rs');
  assert.equal(new Set(entries.map(x=>x.key)).size,entries.length);return entries;
}
