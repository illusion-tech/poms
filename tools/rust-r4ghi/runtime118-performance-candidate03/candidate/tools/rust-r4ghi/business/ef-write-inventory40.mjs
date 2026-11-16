// Narrow live40 branch inventory. No business UUID, money or authority is minted.
import assert from 'node:assert/strict';
import { keyOf, quote, uuid } from './pure.mjs';

export const EF40_OPERATION = 'ProjectCostController_createOperatingRestatement';
const E = 'apps/poms-api-rust/src/project_actual_cost/mod.rs';
const F = 'apps/poms-api-rust/src/project_cost_governance/service.rs';
const C = 'apps/poms-api-rust/src/project_cost_governance/correction.rs';
const G = name => `apps/poms-api-rust/src/project_operating/${name}.rs`;
const H = name => `apps/poms-api-rust/src/project_operating_signals/${name}.rs`;
const p = value => Array.isArray(value) ? value : [value];
const eq = (field, value) => ({ eq: { path: p(field), value } });
const all = (...nodes) => ({ and: nodes });
const relation = (outer, table, inner, condition) => ({ relation: { outer: p(outer), table, inner: p(inner), condition } });
const exists = (table, condition) => ({ exists: { table, condition } });
const runtime = (field, name) => ({ runtime: { path: p(field), name } });
const andEq = values => all(...Object.entries(values).map(([key, value]) => eq(key, value)));
const cell = (value, keys) => keys.reduce((current, key) => current?.[key], value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function deriveEFCorrectionFacts40(ctx, snapshot, scope, readRows) {
  const { body, actorId, actorKey } = scope; assert.equal(scope.operationId, EF40_OPERATION); assert.equal(body.scope, 'live'); assert.equal(body.periodEndSnapshotRef, null);
  assert.equal(ctx.state.actors[actorKey]?.id, actorId);
  for (const permission of ['operating:finance:sensitive:read', 'labor-cost-rate:sensitive:read']) assert(ctx.state.actors[actorKey].permissions.includes(permission));
  const saved = ctx.state.fixtures.efCrossProject40?.prepared; assert(saved, 'First produce and checkpoint the actual live40 fixture');
  assert.deepEqual(body, saved.body, 'Do not silently edit the server-prepared correction/CAS body');
  for (const key of ['laborCorrections','allocationCorrections','stageCorrections','taxCorrections']) assert.equal(body[key]?.length, 1);
  assert.deepEqual(body.costDecisions, []); assert.deepEqual(body.acknowledgedChangedSourceRefs, []);
  assert(body.affectedTargets.every(t => t.periodEndSnapshotRef === null && t.costDecisions.length === 0), 'A real period or classification branch needs its own inventory, never discard it');
  const observed = table => readRows(snapshot.databases[ctx.database].tables[table]);
  const values = table => observed(table).map(row => JSON.parse(row.raw));
  const owned = (table, id) => {
    uuid(id); const rows = observed(table).filter(row => row.key.length === 1 && row.key[0] === id); assert.equal(rows.length, 1);
    const row = rows[0], proof = ctx.state.owned[keyOf(ctx.database, table, row.key)];
    assert(proof && !proof.deleted && proof.proof?.transport === 'HTTP'); assert.equal(proof.latestSha256, row.sha256); assert.equal(proof.latestXmin, row.xmin);
    return JSON.parse(row.raw);
  };
  const labor = owned('project_actual_cost_record', body.laborCorrections[0].supersededCostRef.id);
  const stageCost = owned('project_actual_cost_record', body.stageCorrections[0].costRef.id);
  const stage = owned('cost_stage_attribution_snapshot', body.stageCorrections[0].stageAttributionRef.id);
  const tax = owned('accounting_tax_treatment_snapshot', body.taxCorrections[0].taxTreatmentRef.id);
  const basis = owned('shared_cost_allocation_basis', body.allocationCorrections[0].basisRef.id);
  assert.notEqual(labor.id, stageCost.id); assert.equal(labor.cost_type, 'labor'); assert.equal(stageCost.cost_type, 'expense');
  assert.equal(labor.record_status, 'confirmed'); assert.equal(labor.is_included_in_project_cost, false);
  assert.equal(stageCost.record_status, 'included'); assert.equal(stageCost.is_included_in_project_cost, true);
  assert.equal(stage.cost_record_id, stageCost.id); assert.equal(stage.status, 'active'); assert.equal(tax.status, 'active'); assert.equal(basis.status, 'active');
  assert.equal(labor.row_version, body.laborCorrections[0].supersededCostRef.expectedVersion);
  assert.equal(stageCost.row_version, body.stageCorrections[0].costRef.expectedVersion);
  assert.equal(stage.row_version, body.stageCorrections[0].stageAttributionRef.expectedVersion); assert.equal(tax.row_version, body.taxCorrections[0].taxTreatmentRef.expectedVersion);
  const sources = observed('shared_cost_allocation_source_snapshot').filter(row => JSON.parse(row.raw).basis_id === basis.id && JSON.parse(row.raw).is_current);
  assert.equal(sources.length, 1); assert.equal(JSON.parse(sources[0].raw).cost_record_id, labor.id);
  assert(ctx.state.owned[keyOf(ctx.database,'shared_cost_allocation_source_snapshot',sources[0].key)]);
  const dependent = values('shared_cost_allocation_source_snapshot').filter(row => row.is_current && [labor.id,stageCost.id].includes(row.cost_record_id));
  assert(dependent.every(row => row.basis_id === basis.id), 'A transitive second batch needs a larger actual inventory');
  const results = values('shared_cost_allocation_result').filter(row => row.basis_id === basis.id && row.status === 'active').map(row => owned('shared_cost_allocation_result',row.id));
  assert.equal(results.length,2); assert(results.every(row => row.is_included_in_project_cost === true));
  assert.deepEqual(results.map(row=>row.id).sort(),body.allocationCorrections[0].projectShareItems.map(row=>row.expectedCurrentResultRef.id).sort());
  const decision = (projectId,unit) => {
    const headRows=observed('project_cost_inclusion_head').filter(row=>{const v=JSON.parse(row.raw);return v.project_id===projectId&&v.unit_key===unit;});assert.equal(headRows.length,1);
    assert(ctx.state.owned[keyOf(ctx.database,'project_cost_inclusion_head',headRows[0].key)]);
    return owned('project_cost_inclusion_decision',JSON.parse(headRows[0].raw).decision_id);
  };
  const targets=[{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:null},...body.affectedTargets];
  assert(new Set(targets.map(t=>t.projectId)).size>=2);assert.equal(new Set(targets.map(t=>t.projectId+':'+t.restatesSnapshotRef.id)).size,targets.length);
  const fixtureProjects=ctx.state.fixtures.efCrossProject40.projectIds;assert(Array.isArray(fixtureProjects)&&fixtureProjects.length===2);
  assert.deepEqual([...new Set(targets.map(t=>t.projectId))].sort(),[...fixtureProjects].sort());
  assert(typeof labor.occurred_on==='string'&&typeof stageCost.occurred_on==='string');
  const snapshots=values('project_operating_snapshot');
  const expectedTerminals=snapshots.filter(row=>fixtureProjects.includes(row.project_id)&&row.producer_version===1&&row.status==='active'
    &&!snapshots.some(child=>child.supersedes_id===row.id)
    &&typeof row.source_window_end==='string'&&row.source_window_end>=(row.project_id===labor.project_id?(labor.occurred_on<stageCost.occurred_on?labor.occurred_on:stageCost.occurred_on):labor.occurred_on));
  assert(expectedTerminals.every(row=>row.period_end_snapshot_id===null),'A genuine affected period requires another explicit source inventory, never omission');
  assert.deepEqual(targets.map(t=>t.projectId+':'+t.restatesSnapshotRef.id).sort(),expectedTerminals.map(row=>row.project_id+':'+row.id).sort(),'Every actual affected live40 terminal must be retained');
  const projects=[...new Set(targets.map(t=>t.projectId))].sort().map(id=>{
    const project=owned('project',id);const head=values('project_operating_head').find(row=>row.project_id===id);assert(head);
    const raw=observed('project_operating_head').find(row=>JSON.parse(row.raw).project_id===id);assert(ctx.state.owned[keyOf(ctx.database,'project_operating_head',raw.key)]);
    assert(targets.filter(t=>t.projectId===id).every(t=>t.expectedVersion===head.row_version));
    const oldBindings=values('operating_signal_gate_binding').filter(row=>row.project_id===id&&row.status==='active').map(row=>owned('operating_signal_gate_binding',row.id));
    assert.equal(oldBindings.length,4);
    const oldGateReviews=values('commission_gate_review_record').filter(row=>oldBindings.some(b=>b.id===row.binding_id)&&row.status==='active').map(row=>owned('commission_gate_review_record',row.id));
    return {projectId:id,projectVersion:project.row_version,headVersion:head.row_version,currentSnapshotId:head.current_snapshot_id,baselineId:head.baseline_package_id,
      oldBindingIds:oldBindings.map(row=>row.id).sort(),oldGateReviewIds:oldGateReviews.map(row=>row.id).sort()};
  });
  assert.equal(projects.find(row=>row.projectId===body.projectId).projectVersion,body.expectedProjectVersion);
  const order=new Map();
  const terminalTargets=targets.map(target=>{
    const previous=owned('project_operating_snapshot',target.restatesSnapshotRef.id);assert.equal(previous.project_id,target.projectId);assert.equal(previous.producer_version,1);assert.equal(previous.status,'active');
    assert.equal(previous.row_version,target.restatesSnapshotRef.expectedVersion);assert.equal(previous.period_end_snapshot_id,null);
    const number=(order.get(target.projectId)??0)+1;order.set(target.projectId,number);
    const project=projects.find(row=>row.projectId===target.projectId);
    return {...target,selectedCurrent:project.currentSnapshotId===previous.id,newHeadVersion:project.headVersion+number,finalHeadVersion:project.headVersion+targets.filter(t=>t.projectId===target.projectId).length};
  });
  for(const project of projects)assert(terminalTargets.some(t=>t.projectId===project.projectId&&t.selectedCurrent),'The full live40 closure must retain each actual current terminal');
  const number=/^AC-LBR-(\d{4})-\d{6,}$/.exec(labor.record_no);assert(number);
  const utcYear=number[1];assert.equal(snapshot.capturedAt.slice(0,4),utcYear,'A UTC-year rollover requires a newly reviewed number-counter branch');
  const counter=values('business_number_sequence').find(row=>row.scope==='cost-labor'&&row.period===utcYear);assert(counter,'The real phase1 labor producer must already have created its counter');
  return {version:40,operationId:EF40_OPERATION,actorId,primaryProjectId:body.projectId,projects,targets:terminalTargets,
    laborId:labor.id,laborProjectId:labor.project_id,laborVersion:labor.row_version,stageCostId:stageCost.id,stageCostVersion:stageCost.row_version,stageId:stage.id,taxId:tax.id,basisId:basis.id,
    results:results.map(row=>({id:row.id,projectId:row.project_id,oldDecisionId:decision(row.project_id,'allocation:'+row.id).id})).sort((a,b)=>a.projectId.localeCompare(b.projectId)),
    laborDecisionId:decision(labor.project_id,'cost:'+labor.id).id,stageDecisionId:decision(stageCost.project_id,'cost:'+stageCost.id).id,counterPeriod:utcYear,
    sourceCount:1,fixtureAmountsNotRecomputed:true,factsAreAuthority:false};
}

export function efCorrectionWriteInventory40(operationId, scope) {
  assert.equal(operationId,EF40_OPERATION);const f=scope.efFacts;assert.equal(f?.version,40);
  const entries=[];
  const add=(key,table,event,match,source,options={})=>{entries.push({key,table,event,match,source,expectedRows:1,...options});};
  const newLabor=andEq({supersedes_record_id:f.laborId,project_id:f.laborProjectId,cost_type:'labor'});
  const newBasis=eq('supersedes_id',f.basisId);
  const newStage=eq('supersedes_id',f.stageId);
  const newTax=eq('supersedes_id',f.taxId);
  add('E-old-labor','project_actual_cost_record','UPDATE',andEq({id:f.laborId,record_status:'replaced'}),E);
  add('E-new-labor','project_actual_cost_record','INSERT',newLabor,E);
  add('E-cost-labor-counter','business_number_sequence','UPDATE',andEq({scope:'cost-labor',period:f.counterPeriod}),'apps/poms-api-rust/src/business_numbers/service.rs');
  add('F-labor-first-stage-evidence','cost_governance_evidence','INSERT',all(eq('target_type','CostStageAttributionSnapshot'),eq(['frozen_payload','costBefore','supersedes_record_id'],f.laborId)),F);
  add('F-labor-first-stage','cost_stage_attribution_snapshot','INSERT',relation('cost_record_id','project_actual_cost_record','id',newLabor),F);
  add('F-labor-confirm-cas','project_actual_cost_record','UPDATE',all(newLabor,eq('record_status','confirmed'),eq('row_version',2)),F,{insertedThenUpdated:true});
  add('F-stage-evidence','cost_governance_evidence','INSERT',all(eq('target_type','CostStageAttributionSnapshot'),eq(['frozen_payload','predecessorAttributionId'],f.stageId)),F);
  add('F-old-stage','cost_stage_attribution_snapshot','UPDATE',andEq({id:f.stageId,status:'superseded'}),F);
  add('F-new-stage','cost_stage_attribution_snapshot','INSERT',newStage,F);
  add('F-stage-cost-cas','project_actual_cost_record','UPDATE',andEq({id:f.stageCostId,row_version:f.stageCostVersion+1}),F);
  add('F-tax-evidence','cost_governance_evidence','INSERT',all(eq('target_type','AccountingTaxTreatmentSnapshot'),eq(['frozen_payload','predecessorTaxTreatmentId'],f.taxId)),F);
  add('F-old-tax','accounting_tax_treatment_snapshot','UPDATE',andEq({id:f.taxId,status:'superseded'}),F);
  add('F-new-tax','accounting_tax_treatment_snapshot','INSERT',newTax,F);
  add('F-basis-evidence','cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationBasis'),eq(['frozen_payload','predecessorBasisId'],f.basisId)),F);
  add('F-old-basis','shared_cost_allocation_basis','UPDATE',andEq({id:f.basisId,status:'superseded'}),F);
  add('F-old-source-snapshot','shared_cost_allocation_source_snapshot','UPDATE',andEq({basis_id:f.basisId,is_current:false}),F,{expectedRows:f.sourceCount});
  add('F-new-basis','shared_cost_allocation_basis','INSERT',newBasis,F);
  add('F-new-source-snapshot','shared_cost_allocation_source_snapshot','INSERT',relation('basis_id','shared_cost_allocation_basis','id',newBasis),F,{expectedRows:f.sourceCount});
  for(const result of f.results){
    add('F-old-result:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({id:result.id,status:'superseded'}),F);
    add('F-result-evidence:'+result.id,'cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationResult'),eq(['frozen_payload','predecessorResultId'],result.id)),F);
    add('F-new-result:'+result.id,'shared_cost_allocation_result','INSERT',andEq({project_id:result.projectId,supersedes_id:result.id}),F);
    add('G-share-consumption:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({project_id:result.projectId,supersedes_id:result.id,is_included_in_project_cost:true,row_version:2}),G('inclusion'),{insertedThenUpdated:true});
  }
  const audit=(key,targetType,condition,projectId)=>add(key,'audit_log','INSERT',all(andEq({event_type:operationId,operator_id:f.actorId,result:'success',target_type:targetType}),runtime('request_id','requestId'),
    eq(['metadata','projectId'],projectId),condition),'apps/poms-api-rust/src/contract_support/mod.rs');
  audit('E-old-labor-audit','ProjectActualCostRecord',eq('target_id',f.laborId),f.laborProjectId);
  audit('E-new-labor-audit','ProjectActualCostRecord',relation('target_id','project_actual_cost_record','id',newLabor),f.laborProjectId);
  audit('F-labor-stage-audit','CostStageAttributionSnapshot',relation('target_id','cost_stage_attribution_snapshot','id',relation('cost_record_id','project_actual_cost_record','id',newLabor)),f.laborProjectId);
  audit('F-stage-audit','CostStageAttributionSnapshot',relation('target_id','cost_stage_attribution_snapshot','id',newStage),f.laborProjectId);
  audit('F-tax-audit','AccountingTaxTreatmentSnapshot',relation('target_id','accounting_tax_treatment_snapshot','id',newTax),f.laborProjectId);
  for(const project of f.projects)audit('F-basis-audit:'+project.projectId,'SharedCostAllocationBasis',relation('target_id','shared_cost_allocation_basis','id',newBasis),project.projectId);
  const inherited=[{projectId:f.laborProjectId,oldDecisionId:f.laborDecisionId,headEvent:'INSERT'},
    {projectId:f.laborProjectId,oldDecisionId:f.stageDecisionId,headEvent:'UPDATE'},...f.results.map(row=>({...row,headEvent:'INSERT'}))];
  for(const item of inherited){const decision=andEq({project_id:item.projectId,supersedes_id:item.oldDecisionId});
    add('G-transition-decision:'+item.oldDecisionId,'project_cost_inclusion_decision','INSERT',decision,G('inclusion'));
    add('G-transition-head:'+item.oldDecisionId,'project_cost_inclusion_head',item.headEvent,relation('decision_id','project_cost_inclusion_decision','id',decision),G('inclusion'));
  }
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
  add('EF-GH-command-receipt','operating_command_receipt','INSERT',receipt,G('service'));
  add('pending-auth-coflush','auth_session','UPDATE',all(runtime('id','sessionId'),eq('user_id',f.actorId),exists('audit_log',all(runtime('request_id','requestId'),andEq({event_type:operationId,operator_id:f.actorId,result:'success'})))), 'apps/poms-api-rust/src/auth/store.rs');
  assert.equal(new Set(entries.map(value=>value.key)).size,entries.length);return entries;
}

const checkedPath=keys=>{assert(Array.isArray(keys)&&keys.length);for(const key of keys)assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(key));return keys;};
const literal=value=>{assert(value===null||typeof value==='boolean'||Number.isSafeInteger(value)||typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(value));return value===null?'NULL':`'${String(value)}'`;};
export function efSelectorSql40(descriptor,context){
  let index=0;const extract=(expression,keys)=>`${expression}#>>'{${checkedPath(keys).join(',')}}'`;
  const compile=(node,expression)=>{
    if(node.and)return '('+node.and.map(child=>compile(child,expression)).join(' AND ')+')';
    if(node.eq){const x=extract(expression,node.eq.path);return node.eq.value===null?x+' IS NULL':x+'='+literal(node.eq.value);}
    if(node.runtime){assert(['requestId','sessionId'].includes(node.runtime.name));return extract(expression,node.runtime.path)+'='+literal(context[node.runtime.name]);}
    const r=node.relation??node.exists;assert(r);quote(r.table);const alias='q'+(++index);const where=compile(r.condition,`to_jsonb(${alias})`);
    return `EXISTS(SELECT 1 FROM poms.${quote(r.table)} ${alias} WHERE `+(node.relation?extract(`to_jsonb(${alias})`,r.inner)+'='+extract(expression,r.outer)+' AND ':'')+where+')';
  };
  return compile(descriptor.selector??descriptor.match,'j');
}
export function efWriteMatches40(descriptor,row,allRows,context){
  const evaluate=(node,value)=>{
    if(node.and)return node.and.every(child=>evaluate(child,value));
    if(node.eq)return same(cell(value,node.eq.path)??null,node.eq.value);
    if(node.runtime)return cell(value,node.runtime.path)===context[node.runtime.name];
    const r=node.relation??node.exists;assert(r);
    return allRows(r.table).some(row=>{const candidate=JSON.parse(row.raw);return (!node.relation||same(cell(candidate,r.inner),cell(value,r.outer)))&&evaluate(r.condition,candidate);});
  };
  return evaluate(descriptor.match,JSON.parse(row.raw));
}
export function expectedEFRows40(descriptor,allRows){
  if(Number.isInteger(descriptor.expectedRows))return descriptor.expectedRows;
  const e=descriptor.expectedRows;const contexts=allRows('operating_source_context').map(row=>JSON.parse(row.raw)).filter(row=>row.frozen_payload?.snapshot?.restatesSnapshotRef?.id===e.target);assert.equal(contexts.length,1);
  const context=contexts[0];
  if(e.kind==='context-members')return context.frozen_payload.scope.closureEvidenceRefs.length;
  if(e.kind==='context-costs')return context.frozen_payload.costs.length;
  assert.equal(e.kind,'evaluation-reasons');const evidence=allRows('operating_evaluation_evidence').map(row=>JSON.parse(row.raw)).filter(row=>row.source_context_id===context.id);assert.equal(evidence.length,1);return evidence[0].frozen_output.allReasons.length;
}
