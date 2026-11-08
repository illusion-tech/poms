// Pure actual-row facts; no SQL, HTTP, context construction, or permissions.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const C219 = Object.freeze({ namespace:'poms-r4ghi',epoch:'g2-business13',run:'main01',
  projects:['4d9e57ad-4890-4f53-80da-c6d224ce576b','51d60c76-6de2-432a-8714-10e3ed3234f3'],
  receiver:'4d9e57ad-4890-4f53-80da-c6d224ce576b',sourceSHA:'5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',
  binarySHA:'2d9ed8f711818b83b1cff440b72265bcacf9ff2f31f409d2d7d5a9aabd346e13',
  operation:'ProjectCostController_createOperatingRestatement',kind:'external-mixed-period-allocation219',periodKey:'2026-W45' });
export const sha219 = x => createHash('sha256').update(x).digest('hex');
export const key219 = (database,table,key) => JSON.stringify([database,table,key]);
export const pinSame219 = (a,b) => {assert(a&&b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);};
export const one219 = (rows,test,why='Exactly one actual row') => {const a=rows.filter(test);assert.equal(a.length,1,why);return a[0];};
export const exact219 = row => JSON.parse(row.raw,(k,v,c)=>typeof v==='number'&&/amount|total|ratio|rate|weight|margin|baseline_cost|^cash_gross$/.test(k)?c.source:v);
export function cents219(value){assert(typeof value==='string'&&/^-?(?:0|[1-9]\d*)\.\d{2}$/.test(value));return BigInt(value.replace('.',''));}
export function money219(value){const n=value<0n?-value:value;return (value<0n?'-':'')+(n/100n)+'.'+String(n%100n).padStart(2,'0');}
export function scaled219(value){assert(typeof value==='string'&&/^\d+(?:\.\d{1,6})?$/.test(value));const [a,b='']=value.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));}
export function ref219(value){assert(value&&typeof value.id==='string'&&/^[a-f0-9-]{36}$/.test(value.id));assert(typeof value.kind==='string'&&/^[a-f0-9]{64}$/.test(value.payloadHash));const v=value.expectedVersion??value.rowVersion;assert(Number.isSafeInteger(v)&&v>0);if(value.rowVersion!==undefined&&value.expectedVersion!==undefined)assert.equal(value.rowVersion,value.expectedVersion);return {kind:value.kind,id:value.id,expectedVersion:v,payloadHash:value.payloadHash};}
export const targetKey219 = t => t.projectId+':'+t.restatesSnapshotRef.id;
export const targets219 = body => [{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:body.periodEndSnapshotRef,costDecisions:body.costDecisions},...body.affectedTargets];
export function sameTargets219(a,b){const project=t=>({projectId:t.projectId,expectedVersion:t.expectedVersion,restatesSnapshotRef:ref219(t.restatesSnapshotRef),periodEndSnapshotRef:t.periodEndSnapshotRef?ref219(t.periodEndSnapshotRef):null,costDecisions:t.costDecisions??[]});const normalize=x=>x.map(project).sort((u,v)=>targetKey219(u).localeCompare(targetKey219(v)));assert(a.length>0);assert.equal(new Set(a.map(targetKey219)).size,a.length);assert.deepEqual(normalize(a),normalize(b),'Never trim actual live or period terminals');}
export function rows219(ctx,snapshot,readRows,{historicalHTTPBefore=false}={}){
 const raw=t=>readRows(snapshot.databases[ctx.database].tables[t]),values=t=>raw(t).map(exact219);
 const ownRaw=(table,row)=>{const owner=ctx.state.owned[key219(ctx.database,table,row.key)];assert(owner&&!owner.deleted&&owner.proof?.transport==='HTTP','Only real HTTP-owned rows may enter this producer');if(!historicalHTTPBefore){assert.equal(owner.latestSha256,row.sha256);assert.equal(owner.latestXmin,row.xmin);}return row;};
 const owned=(table,id)=>exact219(ownRaw(table,one219(raw(table),r=>r.key.length===1&&r.key[0]===id,'Actual owned '+table)));
 return {raw,values,owned,ownRaw};
}
export function currentBatch219(rows,basisId){
 const basis=rows.owned('shared_cost_allocation_basis',basisId);assert.equal(basis.status,'active');assert.equal(basis.governance_schema_version,1);assert.equal(basis.currency,'CNY');
 // This witness uses the real Tax Expense batch. All known even-cent layers
 // make its approved1:1 result exact; no guessed rounding or new tax judgment.
 assert.equal(basis.measurement_basis,'excluding-tax');
 const amounts={net:basis.source_amount_excluding_tax,tax:basis.source_tax_cost_amount,gross:basis.source_amount_including_tax};
 for(const x of Object.values(amounts)){assert(cents219(x)>0n);assert.equal(cents219(x)%2n,0n,'Fresh changed/odd source needs separate Root review; never alter it');}
 assert.equal(cents219(amounts.net)+cents219(amounts.tax),cents219(amounts.gross));assert.equal(basis.measurement_amount,amounts.net);
 const slots=rows.raw('shared_cost_allocation_source_snapshot').filter(r=>exact219(r).basis_id===basis.id).map(r=>exact219(rows.ownRaw('shared_cost_allocation_source_snapshot',r)));
 assert(slots.length>0&&slots.every(s=>s.is_current));assert.equal(new Set(slots.map(s=>s.cost_record_id)).size,slots.length);
 const costs=slots.map(s=>{const c=rows.owned('project_actual_cost_record',s.cost_record_id);assert.equal(c.currency,'CNY');assert.equal(c.record_status,'confirmed');assert.equal(c.source_type,'expense-record');assert.equal(c.is_included_in_project_cost,false);assert.equal(c.row_version,s.cost_row_version);assert(C219.projects.includes(c.project_id));return c;});
 const results=rows.values('shared_cost_allocation_result').filter(r=>r.basis_id===basis.id).map(r=>rows.owned('shared_cost_allocation_result',r.id));
 assert.equal(results.length,2);assert.deepEqual(results.map(r=>r.project_id).sort(),C219.projects);assert(results.every(r=>r.status==='active'&&r.governance_schema_version===1&&r.is_included_in_project_cost===true));
 assert.deepEqual(results.map(r=>scaled219(r.allocation_weight).toString()).sort(),['1000000','2000000']);
 return {basis,slots,costs,results,amounts,half:Object.fromEntries(Object.entries(amounts).map(([k,v])=>[k,money219(cents219(v)/2n)]))};
}
export function frozenRef219(rows,snapshotId,kind,id){const snapshot=rows.owned('project_operating_snapshot',snapshotId),members=rows.values('operating_source_member').filter(m=>m.context_id===snapshot.source_context_id&&m.source_kind===kind&&m.source_id===id);const m=one219(members,()=>true,'A real frozen source reference is mandatory');return ref219({kind,id,rowVersion:m.source_row_version,payloadHash:m.source_payload_hash});}
export function compose219(primary,all,correction,periodTarget,reason){
 assert.equal(primary.kind,'preparation-only');assert.equal(primary.intent,'restatement');assert.equal(primary.projectId,C219.receiver);assert.equal(primary.formalEligibility.status,'eligible');assert.deepEqual(primary.blockingReasonCodes,[]);assert(primary.allowedCommandCodes.includes('restatement'));
 sameTargets219(primary.proposedAffectedTargets,all);assert(all.some(t=>t.periodEndSnapshotRef));assert(all.some(t=>!t.periodEndSnapshotRef));
 const first=one219(all,t=>targetKey219(t)===targetKey219(periodTarget),'Actual Receiver W45 period terminal is primary');assert(first.periodEndSnapshotRef);assert.equal(first.expectedVersion,primary.headVersion);
 assert.deepEqual([...new Set(all.map(t=>t.projectId))].sort(),C219.projects);
 const item=t=>({projectId:t.projectId,expectedVersion:t.expectedVersion,restatesSnapshotRef:ref219(t.restatesSnapshotRef),periodEndSnapshotRef:t.periodEndSnapshotRef?ref219(t.periodEndSnapshotRef):null,costDecisions:[]});
 return {inputVersion:'server-derived-v1',projectId:first.projectId,expectedVersion:primary.headVersion,expectedProjectVersion:primary.projectVersion,expectedInputHash:primary.expectedInputHash,assertions:null,
   scope:'period',periodEndSnapshotRef:ref219(first.periodEndSnapshotRef),restatesSnapshotRef:ref219(first.restatesSnapshotRef),restatementReason:reason,restatementSummary:'按真实完整来源批次将两项目显式整批调整为1:1；一次事务完整重述全部适用实时及期间终端，原期间根和历史事实不回填。',
   costDecisions:[],laborCorrections:[],allocationCorrections:[correction],stageCorrections:[],taxCorrections:[],affectedTargets:all.filter(t=>targetKey219(t)!==targetKey219(first)).map(item),acknowledgedChangedSourceRefs:[]};
}
export function derive219(ctx,snapshot,body,packets,readRows,h){
 const rows=rows219(ctx,snapshot,readRows);assert.equal(body.inputVersion,'server-derived-v1');assert.equal(body.scope,'period');assert(body.periodEndSnapshotRef);assert.equal(body.projectId,C219.receiver);
 for(const k of ['costDecisions','laborCorrections','stageCorrections','taxCorrections','acknowledgedChangedSourceRefs'])assert.deepEqual(body[k],[]);
 assert.equal(body.allocationCorrections.length,1);const correction=body.allocationCorrections[0],batch=currentBatch219(rows,correction.basisRef.id);assert.equal(correction.basisRef.kind,'SharedCostAllocationBasis');assert.equal(correction.basisRef.expectedVersion,batch.basis.row_version);
 assert.deepEqual(correction.sourceCostRefs.map(r=>r.id).sort(),batch.costs.map(c=>c.id).sort());assert.equal(new Set(correction.sourceCostRefs.map(r=>r.id)).size,batch.costs.length);
 for(const c of batch.costs){const r=one219(correction.sourceCostRefs,r=>r.id===c.id);assert.equal(r.kind,'ProjectActualCostRecord');assert.equal(r.expectedVersion,c.row_version);}
 assert.deepEqual(correction.projectShareItems.map(s=>s.projectId).sort(),C219.projects);assert.equal(correction.projectShareItems.length,2);
 for(const share of correction.projectShareItems){assert.equal(share.allocationWeight,'1');assert(share.reason.trim().length>8);const r=one219(batch.results,r=>r.project_id===share.projectId);assert.equal(share.expectedCurrentResultRef.kind,'SharedCostAllocationResult');assert.equal(share.expectedCurrentResultRef.id,r.id);assert.equal(share.expectedCurrentResultRef.expectedVersion,r.row_version);}
 const ordered=targets219(body);assert.equal(new Set(ordered.map(targetKey219)).size,ordered.length);assert(ordered.some(t=>t.periodEndSnapshotRef)&&ordered.some(t=>!t.periodEndSnapshotRef));
 assert.deepEqual([...new Set(ordered.map(t=>t.projectId))].sort(),C219.projects);assert.equal(packets.length,ordered.length);
 const allSnapshots=rows.values('project_operating_snapshot'),maxDay=batch.costs.map(c=>c.occurred_on).sort().at(-1);
 const terminals=allSnapshots.filter(s=>C219.projects.includes(s.project_id)&&s.producer_version===1&&s.status==='active'&&!allSnapshots.some(c=>c.producer_version===1&&c.supersedes_id===s.id)&&s.source_window_end>=maxDay);
 assert.deepEqual(ordered.map(targetKey219).sort(),terminals.map(s=>s.project_id+':'+s.id).sort(),'Every actually applicable terminal must be present independently of submitted target lists');
 const projects=C219.projects.map(projectId=>{const p=rows.owned('project',projectId),head=one219(rows.values('project_operating_head'),h=>h.project_id===projectId),bindings=rows.values('operating_signal_gate_binding').filter(b=>b.project_id===projectId&&b.status==='active').map(b=>rows.owned('operating_signal_gate_binding',b.id));assert.equal(bindings.length,4);return {projectId,projectVersion:p.row_version,headVersion:head.row_version,currentSnapshotId:head.current_snapshot_id,baselineId:head.baseline_package_id,oldBindingIds:bindings.map(b=>b.id).sort(),oldGateReviewIds:rows.values('commission_gate_review_record').filter(r=>bindings.some(b=>b.id===r.binding_id)&&r.status==='active').map(r=>rows.owned('commission_gate_review_record',r.id).id).sort()};});
 assert.equal(projects.find(p=>p.projectId===body.projectId).projectVersion,body.expectedProjectVersion);
 const seen=new Map(),targets=ordered.map(t=>{assert.deepEqual(t.costDecisions,[]);const old=rows.owned('project_operating_snapshot',t.restatesSnapshotRef.id),p=projects.find(p=>p.projectId===t.projectId),packet=one219(packets,x=>targetKey219(x.target)===targetKey219(t));sameTargets219(packet.preparation.proposedAffectedTargets,ordered);
   assert.equal(packet.preparation.formalEligibility.status,'eligible');assert.deepEqual(packet.preparation.blockingReasonCodes,[]);assert.equal(old.project_id,t.projectId);assert.equal(old.row_version,t.restatesSnapshotRef.expectedVersion);assert.equal(t.expectedVersion,p.headVersion);
   const context=rows.owned('operating_source_context',old.source_context_id).frozen_payload;
   if(t.periodEndSnapshotRef){assert.equal(old.period_end_snapshot_id,t.periodEndSnapshotRef.id);const period=rows.owned('period_closing_snapshot',t.periodEndSnapshotRef.id);assert.equal(period.project_id,t.projectId);assert.equal(period.row_version,t.periodEndSnapshotRef.expectedVersion);assert.equal(old.root_snapshot_id??old.id,period.project_snapshot_id);assert.equal(period.producer_version,1);assert.equal(period.status,'active');assert.equal(context.snapshot.periodKey,period.period_key);}
   else assert.equal(old.period_end_snapshot_id,null);
   const count=(seen.get(t.projectId)??0)+1;seen.set(t.projectId,count);const expectedCostScope=h.expectedCostScopeTax13(packet.preparation,h.rowsTax13(ctx,snapshot,readRows));const result=one219(batch.results,r=>r.project_id===t.projectId);const unit=one219(expectedCostScope.units,u=>u.id===result.id);assert.equal(unit.decision.decision,'include');assert.equal(unit.decision.role,'allocation-share');
   return {...t,selectedCurrent:p.currentSnapshotId===old.id,newHeadVersion:p.headVersion+count,finalHeadVersion:p.headVersion+ordered.filter(x=>x.projectId===t.projectId).length,expectedCostScope,oldRootSnapshotId:old.root_snapshot_id??old.id,originalWindow:{start:old.source_window_start,end:old.source_window_end},oldBaselineRef:context.baseline.baselinePackageRef};});
 for(const p of projects)assert(targets.some(t=>t.projectId===p.projectId&&t.selectedCurrent),'The actual live current must not be lost among period targets');
 const results=batch.results.map(r=>{const head=one219(rows.values('project_cost_inclusion_head'),d=>d.project_id===r.project_id&&d.unit_key==='allocation:'+r.id),decision=rows.owned('project_cost_inclusion_decision',head.decision_id);assert.equal(decision.decision,'include');assert.equal(decision.recognition_role,'allocation-share');return {id:r.id,projectId:r.project_id,oldDecisionId:decision.id};});
 return {version:219,branch:'explicit-allocation-mixed-period',actorId:ctx.state.actors.manager.id,primaryProjectId:body.projectId,basisId:batch.basis.id,sourceCount:batch.slots.length,sourceCostIds:batch.costs.map(c=>c.id).sort(),sourceBusinessDate:maxDay,projects,targets,results,amounts:batch.amounts,expectedHalf:batch.half,allActualTerminalsIncluded:true,allocationWeightsChangedExplicitly:true};
}
export function reweightedScope219(expected,resultIds,half){
 const output=structuredClone(expected);for(const u of output.units)if(resultIds.includes(u.id))for(const k of ['net','tax','gross']){assert.equal(u.amounts[k].knowledge,'known');u.amounts[k].value=half[k];}
 const sum=filter=>({currency:'CNY',...Object.fromEntries(['net','tax','gross'].map(k=>{const units=output.units.filter(filter),known=units.every(u=>u.amounts[k].knowledge==='known');return [k,known?{knowledge:'known',value:money219(units.reduce((n,u)=>n+cents219(u.amounts[k].value),0n))}:{knowledge:'unknown',value:null}];}))});
 output.included=sum(u=>u.decision.decision==='include'&&['direct-source','allocation-share'].includes(u.decision.role));output.excluded=sum(u=>u.decision.decision==='exclude');return output;
}
