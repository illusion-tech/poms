// Exact semantic verifier under synthetic snapshot arrays; no database is used.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const file=new URL('./candidate/tools/rust-r4ghi/business/ef-fault-sweep40.mjs',import.meta.url),text=fs.readFileSync(file,'utf8');
const a=text.indexOf('export function verifyEFOldFactsAndCurrent40('),b=text.indexOf('\nexport async function verifyEFActualAmounts40(',a);assert(a>=0&&b>a);
const module=await import('data:text/javascript;base64,'+Buffer.from("import assert from 'node:assert/strict'; const readRows=v=>v??[];\n"+text.slice(a,b)).toString('base64'));
const verify=module.verifyEFOldFactsAndCurrent40,sha=s=>createHash('sha256').update(s).digest('hex'),id=n=>`66666666-6666-4666-8666-${String(n).padStart(12,'0')}`;
const rawRow=(raw,xmin='100')=>({raw,key:[JSON.parse(raw).id],sha256:sha(raw),xmin});const row=(v,xmin)=>rawRow(JSON.stringify(v),xmin);
function frame(){
 const tables=()=>Object.fromEntries(['project_actual_cost_record','cost_stage_attribution_snapshot','accounting_tax_treatment_snapshot','shared_cost_allocation_basis','shared_cost_allocation_result','shared_cost_allocation_source_snapshot',
 'project_operating_snapshot','project_operating_head','project_cost_inclusion_head','operating_signal_gate_binding','commission_gate_review_record','business_number_sequence','auth_session','operating_signal_evaluation_result','other_original'].map(t=>[t,[]]));
 const before={databases:{db:{tables:tables(),meta:{fixed:true}},native:{tables:tables(),meta:{fixed:true}}},objects:{db:[],native:[]}},after=structuredClone(before);
 const facts={laborId:id(4),stageCostId:id(5),stageId:id(6),taxId:id(7),basisId:id(8),results:[],actorId:id(1),counterPeriod:'2026',projects:[],targets:[]};
 for(const [pid,old,newId,baseline] of [[id(2),id(11),id(101),id(201)],[id(3),id(12),id(102),id(202)]]){
  const oldSnapshot={id:old,project_id:pid,root_snapshot_id:old,source_window_start:null,source_window_end:'2026-11-07',period_end_snapshot_id:null,status:'active',row_version:1};
  before.databases.db.tables.project_operating_snapshot.push(row(oldSnapshot));
  after.databases.db.tables.project_operating_snapshot.push(row({...oldSnapshot,status:'superseded',row_version:2},'200'),row({...oldSnapshot,id:newId,supersedes_id:old},'200'));
  before.databases.db.tables.project_operating_head.push(row({id:pid,project_id:pid,current_snapshot_id:old,baseline_package_id:baseline,row_version:1}));
  after.databases.db.tables.project_operating_head.push(row({id:pid,project_id:pid,current_snapshot_id:newId,baseline_package_id:baseline,row_version:2},'200'));
  const signal=id(pid===id(2)?301:302);after.databases.db.tables.operating_signal_evaluation_result.push(row({id:signal,referenced_snapshot_id:newId},'200'));
  const oldIds=[];
  for(let n=0;n<4;n++){const oldBinding=id((pid===id(2)?400:410)+n);oldIds.push(oldBinding);const oldValue={id:oldBinding,project_id:pid,status:'active',row_version:1};
   before.databases.db.tables.operating_signal_gate_binding.push(row(oldValue));after.databases.db.tables.operating_signal_gate_binding.push(row({...oldValue,status:'superseded',row_version:2},'200'),row({id:id((pid===id(2)?500:510)+n),project_id:pid,status:'active',signal_evaluation_id:signal},'200'));}
  facts.projects.push({projectId:pid,currentSnapshotId:old,baselineId:baseline,headVersion:1,oldBindingIds:oldIds,oldGateReviewIds:[]});
  facts.targets.push({projectId:pid,restatesSnapshotRef:{id:old},selectedCurrent:true});
 }
 before.databases.db.tables.project_actual_cost_record.push(rawRow(`{"id":"${id(5)}","row_version":3,"amount_excluding_tax":9999999999999999.99}`));
 after.databases.db.tables.project_actual_cost_record.push(rawRow(`{"id":"${id(5)}","row_version":4,"amount_excluding_tax":9999999999999999.99}`,'200'));
 before.databases.native.tables.other_original.push(row({id:id(900),unchanged:'yes'}));after.databases.native.tables.other_original=structuredClone(before.databases.native.tables.other_original);
 return {ctx:{database:'db',databases:['db','native']},before,after,facts};
}
test('only the exact actual current live successor and its four bindings may be current',()=>{const f=frame();assert.equal(verify(f.ctx,f.before,f.after,f.facts,id(700)).currentMoves.length,2);});
test('baseline-row xmin-only drift is rejected even if logical bytes are identical',()=>{const f=frame();f.after.databases.native.tables.other_original[0].xmin='201';assert.throws(()=>verify(f.ctx,f.before,f.after,f.facts,id(700)));});
test('old money beyond JS exact integer precision is compared through original lexical bytes',()=>{
 const f=frame();f.after.databases.db.tables.project_actual_cost_record[0]=rawRow(`{"id":"${id(5)}","row_version":4,"amount_excluding_tax":9999999999999999.98}`,'200');
 assert.equal(JSON.parse(f.before.databases.db.tables.project_actual_cost_record[0].raw).amount_excluding_tax,JSON.parse(f.after.databases.db.tables.project_actual_cost_record[0].raw).amount_excluding_tax);
 assert.throws(()=>verify(f.ctx,f.before,f.after,f.facts,id(700)));
});
test('current head cannot remain old or point to an unrelated same-project signal',()=>{
 const f=frame();const head=JSON.parse(f.after.databases.db.tables.project_operating_head[0].raw);f.after.databases.db.tables.project_operating_head[0]=row({...head,current_snapshot_id:id(11)},'200');assert.throws(()=>verify(f.ctx,f.before,f.after,f.facts,id(700)));
 const other=frame();other.after.databases.db.tables.operating_signal_evaluation_result[0]=row({id:id(301),referenced_snapshot_id:id(11)},'200');assert.throws(()=>verify(other.ctx,other.before,other.after,other.facts,id(700)));
});
