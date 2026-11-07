// Synthetic framing/selector regressions only. No PG/HTTP or producer proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
let source=fs.readFileSync(new URL('./candidate/tools/rust-r4ghi/business/ef-write-inventory40.mjs',import.meta.url),'utf8');
source=source.replace("'./pure.mjs'",JSON.stringify(new URL('../../../../business/pure.mjs',import.meta.url).href));
const {EF40_OPERATION:OP,deriveEFCorrectionFacts40:derive,efCorrectionWriteInventory40:inventory,efSelectorSql40:sql,efWriteMatches40:matches,expectedEFRows40:expectedRows}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id=n=>`44444444-4444-4444-8444-${String(n).padStart(12,'0')}`;
const ref=(n,kind='ProjectOperatingSnapshot',version=1)=>({kind,id:id(n),expectedVersion:version,payloadHash:'a'.repeat(64)});
const sha=x=>createHash('sha256').update(x).digest('hex');
function frame(){
 const tables={},owned={};const add=(table,value,key=[value.id])=>{const raw=JSON.stringify(value),row={key,raw,sha256:sha(raw),xmin:'100'};(tables[table]??=[]).push(row);
  owned[JSON.stringify(['db',table,key])]={proof:{transport:'HTTP'},latestSha256:row.sha256,latestXmin:row.xmin};return value;};
 const actor=id(1),p1=id(2),p2=id(3),l=id(4),c=id(5),stage=id(6),tax=id(7),basis=id(8),r1=id(9),r2=id(10);
 add('project',{id:p1,row_version:1});add('project',{id:p2,row_version:1});
 add('project_actual_cost_record',{id:l,project_id:p1,cost_type:'labor',row_version:2,record_status:'confirmed',is_included_in_project_cost:false,record_no:'AC-LBR-2026-000002',occurred_on:'2026-11-07'});
 add('project_actual_cost_record',{id:c,project_id:p1,cost_type:'expense',row_version:3,record_status:'included',is_included_in_project_cost:true,occurred_on:'2026-11-07'});
 add('cost_stage_attribution_snapshot',{id:stage,cost_record_id:c,row_version:1,status:'active'});add('accounting_tax_treatment_snapshot',{id:tax,row_version:1,status:'active'});
 add('shared_cost_allocation_basis',{id:basis,row_version:1,status:'active'});
 add('shared_cost_allocation_source_snapshot',{basis_id:basis,cost_record_id:l,is_current:true},[basis,l]);
 add('shared_cost_allocation_result',{id:r1,project_id:p1,basis_id:basis,status:'active',is_included_in_project_cost:true});
 add('shared_cost_allocation_result',{id:r2,project_id:p2,basis_id:basis,status:'active',is_included_in_project_cost:true});
 for(const [p,n,v] of [[p1,11,3],[p2,12,2]]){
  add('project_operating_head',{project_id:p,row_version:v,current_snapshot_id:id(n),baseline_package_id:id(n+20)},[p]);
  for(let i=0;i<4;i++)add('operating_signal_gate_binding',{id:id(n*10+i),project_id:p,status:'active'});
 }
 tables.commission_gate_review_record=[];
 for(const [p,n] of [[p1,11],[p2,12],[p1,13]])add('project_operating_snapshot',{id:id(n),project_id:p,row_version:1,status:'active',producer_version:1,period_end_snapshot_id:null,source_window_end:'2026-11-07'});
 for(const [p,unit,n] of [[p1,'cost:'+l,40],[p1,'cost:'+c,41],[p1,'allocation:'+r1,42],[p2,'allocation:'+r2,43]]){
  add('project_cost_inclusion_decision',{id:id(n),project_id:p});add('project_cost_inclusion_head',{project_id:p,unit_key:unit,decision_id:id(n)},[p,unit]);
 }
 add('business_number_sequence',{id:id(50),scope:'cost-labor',period:'2026'});
 const body={projectId:p1,scope:'live',periodEndSnapshotRef:null,expectedVersion:3,expectedProjectVersion:1,restatesSnapshotRef:ref(11),costDecisions:[],acknowledgedChangedSourceRefs:[],
  laborCorrections:[{supersededCostRef:ref(4,'ProjectActualCostRecord',2)}],allocationCorrections:[{basisRef:ref(8,'SharedCostAllocationBasis'),projectShareItems:[{expectedCurrentResultRef:ref(9)},{expectedCurrentResultRef:ref(10)}]}],
  stageCorrections:[{costRef:ref(5,'ProjectActualCostRecord',3),stageAttributionRef:ref(6,'CostStageAttributionSnapshot')}],taxCorrections:[{taxTreatmentRef:ref(7,'AccountingTaxTreatmentSnapshot')}],
  affectedTargets:[{projectId:p1,expectedVersion:3,restatesSnapshotRef:ref(13),periodEndSnapshotRef:null,costDecisions:[]},{projectId:p2,expectedVersion:2,restatesSnapshotRef:ref(12),periodEndSnapshotRef:null,costDecisions:[]}]};
 const scope={operationId:OP,projectId:p1,actorId:actor,actorKey:'manager',body,params:{}};
 const ctx={database:'db',state:{owned,actors:{manager:{id:actor,permissions:['operating:finance:sensitive:read','labor-cost-rate:sensitive:read']}},fixtures:{efCrossProject40:{prepared:{body},projectIds:[p1,p2]}}}};
 return {ctx,snapshot:{capturedAt:'2026-11-07T10:00:00Z',databases:{db:{tables}}},scope,readRows:v=>v,tables,add};
}
test('all observed live terminals and every E/F producer get their own mandatory descriptors',()=>{
 const f=frame();f.scope.efFacts=derive(f.ctx,f.snapshot,f.scope,f.readRows);const list=inventory(OP,f.scope);
 assert.equal(f.scope.efFacts.targets.length,3);assert.equal(new Set(list.map(d=>d.key)).size,list.length);
 for(const target of f.scope.efFacts.targets)for(const family of ['G-context','G-snapshot','G-head-cas','H-bindings','H-summaries','H-summary-fields','G-restatement'])assert(list.some(d=>d.key===family+':'+target.restatesSnapshotRef.id));
 for(const key of ['E-old-labor','E-new-labor','E-cost-labor-counter','F-labor-first-stage','F-stage-evidence','F-new-tax','F-new-basis','F-old-source-snapshot','EF-GH-command-receipt','pending-auth-coflush'])assert(list.some(d=>d.key===key));
 assert.equal(list.filter(d=>d.deferred).length,6);assert.equal(list.filter(d=>d.insertedThenUpdated).length,3);
});
test('missing project/terminal, an additional transitive batch, or an unowned predecessor fails before arming',()=>{
 for(const change of [f=>{f.scope.body.affectedTargets.pop();},f=>{f.add('shared_cost_allocation_source_snapshot',{basis_id:id(99),cost_record_id:id(4),is_current:true},[id(99),id(4)]);},
  f=>{delete f.ctx.state.owned[JSON.stringify(['db','project_actual_cost_record',[id(4)]])];}]){
  const f=frame();change(f);assert.throws(()=>derive(f.ctx,f.snapshot,f.scope,f.readRows));
 }
});
test('unregistered period, duplicate labor correction and modified saved body are not inferred into live coverage',()=>{
 for(const change of [f=>{f.scope.body.affectedTargets[0].periodEndSnapshotRef=ref(90,'PeriodClosingSnapshot');},
  f=>f.scope.body.laborCorrections.push(f.scope.body.laborCorrections[0]),f=>{f.scope.body={...f.scope.body,restatementReason:'edited'};}]){
  const f=frame();change(f);assert.throws(()=>derive(f.ctx,f.snapshot,f.scope,f.readRows));
 }
});
test('selectors are rendered only from reviewed AST and exact runtime request/session strings',()=>{
 const f=frame();f.scope.efFacts=derive(f.ctx,f.snapshot,f.scope,f.readRows);const list=inventory(OP,f.scope);
 for(const d of list){const value=sql(d,{requestId:'actual-request40',sessionId:id(70)});assert(value.length>10);assert(!value.includes('undefined'));}
 assert.throws(()=>sql(list.find(d=>d.key==='required-success-audit'),{requestId:"';DROP TABLE poms.project;--",sessionId:id(70)}));
 assert.throws(()=>sql({match:{relation:{outer:['id'],table:'project;bad',inner:['id'],condition:{eq:{path:['id'],value:id(2)}}}}},{}));
});
test('a terminal selector cannot match a peer project or another root lineage',()=>{
 const f=frame();f.scope.efFacts=derive(f.ctx,f.snapshot,f.scope,f.readRows);const d=inventory(OP,f.scope).find(d=>d.key==='G-context:'+id(11));
 const row=value=>({raw:JSON.stringify(value)}),value={project_id:id(2),frozen_payload:{snapshot:{restatesSnapshotRef:{id:id(11)}}}};
 assert(matches(d,row(value),()=>[],{}));assert(!matches(d,row({...value,project_id:id(3)}),()=>[],{}));
 assert(!matches(d,row({project_id:id(2),frozen_payload:{snapshot:{restatesSnapshotRef:{id:id(13)}}}}),()=>[],{}));
});
test('summary joins follow actual binding to signal and exact restated snapshot, without project-only guesses',()=>{
 const f=frame();f.scope.efFacts=derive(f.ctx,f.snapshot,f.scope,f.readRows);const d=inventory(OP,f.scope).find(d=>d.key==='H-summaries:'+id(11));
 const rs=value=>({raw:JSON.stringify(value)}),t={project_operating_snapshot:[rs({id:id(60),project_id:id(2),supersedes_id:id(11),snapshot_mode:'restated'})],
  operating_signal_evaluation_result:[rs({id:id(61),project_id:id(2),referenced_snapshot_id:id(60)})],operating_signal_gate_binding:[rs({id:id(62),project_id:id(2),signal_evaluation_id:id(61)})]};
 const summary=rs({target_id:id(62),target_type:'operating-signal-gate-binding',approval_scenario_key:'commission-gate-review',summary_package_key:'project-operating-commission-gate-v1',created_by:id(1)});
 assert(matches(d,summary,table=>t[table]??[],{}));t.project_operating_snapshot[0]=rs({id:id(60),project_id:id(2),supersedes_id:id(13),snapshot_mode:'restated'});
 assert(!matches(d,summary,table=>t[table]??[],{}));
});
test('dynamic required member/cost/reason counts come from the actual new frozen context/evidence',()=>{
 const row=value=>({raw:JSON.stringify(value)});const tables={operating_source_context:[row({id:id(60),frozen_payload:{snapshot:{restatesSnapshotRef:{id:id(11)}},scope:{closureEvidenceRefs:[1,2,3]},costs:[1,2]}})],
  operating_evaluation_evidence:[row({source_context_id:id(60),frozen_output:{allReasons:[1,2,3,4]}})]};
 for(const [kind,count] of [['context-members',3],['context-costs',2],['evaluation-reasons',4]])assert.equal(expectedRows({expectedRows:{kind,target:id(11)}},table=>tables[table]??[]),count);
 tables.operating_source_context.push(tables.operating_source_context[0]);assert.throws(()=>expectedRows({expectedRows:{kind:'context-costs',target:id(11)}},table=>tables[table]??[]));
});
