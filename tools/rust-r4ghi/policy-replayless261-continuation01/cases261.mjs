// External261: actual public producers/H reads, no frozen helper interception.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {pathToFileURL}from'node:url';import{ROOT261,PROJECT261,FIXED261,OP261}from'./core261.mjs';
export const MUTABLE261=Object.freeze(['project_operating_head','operating_baseline_package','project_operating_snapshot','project_cost_inclusion_head','project_actual_cost_record','operating_signal_gate_binding','commission_gate_review_record']);
async function originalTools261(){const module=async name=>import(pathToFileURL(ROOT261+'/tools/rust-r4ghi/business/'+name).href);const[pure,snapshot,capture,values,handover]=await Promise.all(['pure.mjs','snapshot.mjs','policy-boundary-capture26.mjs','policy-boundary-values26.mjs','handover.mjs'].map(module));return{...pure,...snapshot,...capture,...values,...handover};}
const cell=row=>JSON.parse(row.raw),sameRow=(a,b)=>{assert(a&&b);assert.equal(a.sha256,b.sha256);assert.equal(a.xmin,b.xmin);assert.equal(a.raw,b.raw);};
function all(ctx,snapshot,table,readRows){return readRows(snapshot.databases[ctx.database].tables[table]);}
export function assertBindingSupersedes261(ctx,before,after,newIds,signalId,readRows){
 const project=ctx.state.fixtures.project.id;assert.equal(project,PROJECT261);const bg=all(ctx,before,'operating_signal_gate_binding',readRows),ag=all(ctx,after,'operating_signal_gate_binding',readRows),old=bg.filter(r=>cell(r).project_id===project&&cell(r).status==='active'),oldIds=new Set(old.map(r=>r.key[0]));assert.equal(old.length,4);assert.equal(new Set(old.map(r=>cell(r).gate_stage_type)).size,4);const actualNew=ag.filter(r=>!bg.some(b=>b.key[0]===r.key[0]));assert.equal(actualNew.length,4);assert.deepEqual(actualNew.map(r=>r.key[0]).sort(),Object.values(newIds).sort());
 function superseded(b,a){const x=cell(b),y=cell(a);assert.equal(y.status,'superseded');assert.equal(y.row_version,x.row_version+1);assert.equal(y.updated_by,ctx.state.actors.manager.id);assert.notEqual(a.xmin,b.xmin);const mutable=new Set(['status','row_version','updated_at','updated_by']);assert.deepEqual(Object.fromEntries(Object.entries(x).filter(([k])=>!mutable.has(k))),Object.fromEntries(Object.entries(y).filter(([k])=>!mutable.has(k))));}
 for(const row of bg){const found=ag.find(r=>r.key[0]===row.key[0]);assert(found,'No old H binding deletion');if(oldIds.has(row.key[0]))superseded(row,found);else sameRow(row,found);}
 for(const[stage,id]of Object.entries(newIds)){const row=ag.find(r=>r.key[0]===id),v=cell(row);assert.equal(v.project_id,project);assert.equal(v.signal_evaluation_id,signalId);assert.equal(v.status,'active');assert.equal(v.row_version,1);assert.equal(v.gate_stage_type,stage);assert.equal(v.producer_version,1);assert.equal(v.supersedes_id,old.find(r=>cell(r).gate_stage_type===stage).key[0]);}
 const br=all(ctx,before,'commission_gate_review_record',readRows),ar=all(ctx,after,'commission_gate_review_record',readRows);assert.equal(ar.length,br.length,'G/H evaluation may supersede an active gate review but cannot create/delete one');for(const row of br){const found=ar.find(r=>r.key[0]===row.key[0]);if(cell(row).status==='active'&&oldIds.has(cell(row).binding_id))superseded(row,found);else sameRow(row,found);}return{oldBindingIds:[...oldIds],newBindingIds:Object.values(newIds),affectedExistingReviewCount:br.filter(r=>cell(r).status==='active'&&oldIds.has(cell(r).binding_id)).length};
}
export function assertAutomaticHDelta261(ctx,before,after,command,readRows){const result=assertBindingSupersedes261(ctx,before,after,command.evaluationRefs.bindingIds,command.evaluationRefs.signalEvaluationId,readRows);for(const table of ['operating_signal_evaluation_result','operating_signal_review_record','operating_gate_summary_payload','approval_summary_snapshot','approval_summary_field_projection','project_operating_snapshot','operating_source_context','operating_source_member']){const old=all(ctx,before,table,readRows),now=all(ctx,after,table,readRows);for(const row of old)sameRow(row,now.find(r=>JSON.stringify(r.key)===JSON.stringify(row.key)));}return result;}
function expectedAction261(name, stage) { return name === 'h01' ? stage === 'first' ? 'prompt' : 'block' : name === 'below' ? 'review' : name === 'h04' ? stage === 'first' ? 'prompt' : 'review' : stage === 'first' ? 'review' : 'block'; }
async function readFour261(ctx, api, ids, name, context, evaluationHash, reviewId, tools) {
  const {data,uuid,loadSnapshot,oneStoredRow26,POLICY26,sha,canonical26}=tools;
  assert.deepEqual(Object.keys(ids).sort(), ['final', 'first', 'retention', 'second']); assert.equal(new Set(Object.values(ids)).size, 4);
  const result = [];
  for (const [stage, id] of Object.entries(ids)) {
    const response = await api.request('ProjectCostController_getCommissionGateBinding', { id: uuid(id) }, null, 'manager'), gate = data(response);
    assert.equal(gate.projectId, context.projectId); assert.equal(gate.gateStageType, stage); assert.equal(gate.evaluationContext.sourceHash, context.sourceHash); assert.equal(gate.evaluationContext.evaluationHash, evaluationHash);
    assert.equal(gate.bindingAction, expectedAction261(name, stage), 'Four independent stages must keep their frozen actions');
    const after = loadSnapshot(ctx, response.after), stored = oneStoredRow26(ctx, after, 'operating_signal_gate_binding', id), summary = oneStoredRow26(ctx, after, 'operating_gate_summary_payload', gate.summarySnapshotId);
    assert.equal(stored.value.project_id, context.projectId); assert.equal(stored.value.current_summary_id, gate.summarySnapshotId); assert.equal(stored.value.status, 'active');
    assert.equal(summary.value.project_id, context.projectId); assert.equal(summary.value.snapshot_id, context.snapshot.id); assert.equal(summary.value.binding_id, id); assert.equal(summary.value.signal_review_id, reviewId);
    assert.equal(summary.value.source_hash, context.sourceHash); assert.equal(summary.value.evaluation_hash, evaluationHash); assert.equal(summary.value.policy_hash, POLICY26);
    assert.equal(sha(JSON.stringify(canonical26(summary.value.frozen_payload))), summary.value.payload_hash);
    assert.equal(summary.value.frozen_payload.bindingAction, expectedAction261(name, stage));
    if (name === 'h04') { assert(summary.value.frozen_payload.reasonItems.some(reason => reason.ruleId === 'H04')); assert(!summary.value.frozen_payload.reasonItems.some(reason => reason.ruleId === 'H08')); }
    result.push({ stage, id, gate, receipt: response.receiptId, bindingRow: stored.row, summaryRow: summary.row });
  }
  assert.equal(new Set(result.map(row => row.gate.summarySnapshotId)).size, 4); return result;
}
export async function captureNext261(ctx, api, name) {
  assert(['equal','above'].includes(name)); const tools=await originalTools261(); const {prepare26,inclusionDecisions26,expectedRef,data,uuid,loadSnapshot,oneStoredRow26,assertFrozenCase26,sha,canonical26}=tools;
  const f = ctx.state.fixtures; assert(f.operatingBaselineCommand); assert(name === 'h01' ? !f.expense && !f.receipts26 : f.actualExpenseStageComplete && f.zeroTax26);
  const prepared = await prepare26(ctx, api, 'snapshot-create', name === 'h01' ? null : f.actualCost.id), p = prepared.value; assert.equal(p.selectedBaselinePackageRef.id, f.operatingBaselineCommand.targetId);
  const body = { inputVersion: 'server-derived-v1', projectId: f.project.id, expectedVersion: p.headVersion, expectedProjectVersion: p.projectVersion, expectedInputHash: p.expectedInputHash, assertions: null,
    baselinePackageRef: expectedRef(p.selectedBaselinePackageRef), snapshotMode: 'realtime', periodKey: null, costDecisions: inclusionDecisions26(p, name === 'h01' ? null : f.actualCost.id) };
  const response = await api.request('ProjectCostController_createProjectOperatingSnapshot', {}, body, 'manager', { responseBirths: [{ table: 'project_operating_snapshot', pointer: '/targetId' }], mutableTables: MUTABLE261 });
  const command = data(response), id = uuid(command.snapshotId ?? command.targetId), after = loadSnapshot(ctx, response.after);
  assertAutomaticHDelta261(ctx,loadSnapshot(ctx,response.before),after,command,tools.readRows);
  const snapshot = oneStoredRow26(ctx, after, 'project_operating_snapshot', id), context = oneStoredRow26(ctx, after, 'operating_source_context', snapshot.value.source_context_id), frozen = context.value.frozen_payload;
  assert.equal(snapshot.value.project_id, f.project.id); assert.equal(context.value.project_id, f.project.id); assert.equal(context.value.snapshot_id, id); assert.equal(frozen.projectId, f.project.id); assert.equal(frozen.snapshot.id, id);
  assert.equal(context.value.source_hash, command.sourceHash); assert.equal(frozen.sourceHash, command.sourceHash); assert.equal(sha(JSON.stringify(canonical26(frozen))), context.value.payload_hash);
  const view = data(await api.request('ProjectCostController_getProjectOperatingSnapshot', { id }, null, 'manager')); assert.equal(view.evaluationStatus, 'evaluated'); assert.equal(view.certification, 'verified'); assert.equal(view.sourceHash, frozen.sourceHash); assert(view.evaluationRefs);
  const signal = data(await api.request('ProjectCostController_getOperatingSignalEvaluation', { id: view.evaluationRefs.signalEvaluationId }, null, 'manager')); assertFrozenCase26(frozen, signal, name);
  const gates = await readFour261(ctx, api, view.evaluationRefs.bindingIds, name, frozen, signal.evaluationContext.evaluationHash, null, tools);
  const proof = ctx.artifact(`${ctx.next('H26-' + name + '-published')}.json`, { kind: 'actual-normal-producer-published-G-H-rule-case', case: name, projectId: f.project.id,
    preparation: prepared.receipt, command: response.receiptId, commandBefore: response.before, commandAfter: response.after, actualContext: context.row, actualSnapshot: snapshot.row, signal, gates,
    formalEligibilityAndMaturityFromServer: true, SQLContextFixture: false, G3Certified: false, G4Certified: false });
  const result = { kind: 'actual-published-H26-case', name, projectId: f.project.id, snapshotId: id, sourceContextId: context.value.id, sourceHash: frozen.sourceHash, signalId: signal.signalEvaluationId, proof,
    immutableFacts: [{ table: 'project_operating_snapshot', id, sha256: snapshot.row.sha256, xmin: snapshot.row.xmin }, { table: 'operating_source_context', id: context.value.id, sha256: context.row.sha256, xmin: context.row.xmin }] };
  f.publishedCases26 ??= {}; f.publishedCases26[name] = result; if (name === 'h01') f.h01Published26 = result; ctx.persist(); return result;
}
export async function attentionOverlay261(ctx, api, rationale) {
  const tools=await originalTools261(); const {data,materialityBody26,loadSnapshot,oneStoredRow26,sha,canonical26,POLICY26,readRows}=tools;
  const f = ctx.state.fixtures, published = f.publishedCases26.below; assert(published && !f.attentionReview26);
  const signal = data(await api.request('ProjectCostController_getOperatingSignalEvaluation', { id: published.signalId }, null, 'manager'));
  assert.equal(signal.riskLevel, 'unknown'); assert.equal(signal.systemRiskLevel, 'unknown'); assert.equal(signal.dataMaturityLevel, 'mature');
  const body = materialityBody26(signal, rationale, randomUUID());
  const response = await api.request('ProjectCostController_reviewOperatingSignalEvaluation', { id: signal.signalEvaluationId }, body, 'manager', { responseBirths: [{ table: 'operating_signal_review_record', pointer: '/reviewRecordId' }],
    mutableTables: ['operating_signal_evaluation_result', 'operating_signal_gate_binding', 'operating_signal_review_record', 'approval_summary_snapshot', 'commission_gate_review_record'], updatedAnchors: [{ table: 'operating_signal_evaluation_result', id: signal.signalEvaluationId, requestBinding: 'path:id' }] });
  const review = data(response), before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
  assertBindingSupersedes261(ctx,before,after,review.gateBindingIds,published.signalId,tools.readRows);
  const stored = oneStoredRow26(ctx, after, 'operating_signal_review_record', review.reviewRecordId), value = stored.value, payload = value.review_payload;
  assert.equal(value.signal_evaluation_id, published.signalId); assert.equal(value.handled_by, ctx.state.actors.manager.id); assert.equal(value.source_hash, published.sourceHash); assert.equal(value.producer_version, 1);
  assert.equal(sha(JSON.stringify(canonical26(payload))), value.payload_hash); assert.equal(payload.policyHash, POLICY26); assert.equal(payload.sourceHash, published.sourceHash);
  assert.equal(payload.verifiedMaterialityReview.riskDecision, 'attention'); assert.deepEqual(payload.verifiedMaterialityReview.evidenceRefs, body.manualMaterialityReview.evidenceRefs);
  assert(payload.effectiveOutput.allReasons.some(reason => reason.ruleId === 'H04')); assert(!payload.effectiveOutput.allReasons.some(reason => reason.ruleId === 'H08'));
  assert.equal(payload.effectiveOutput.systemRiskLevel, 'unknown'); assert.equal(payload.effectiveOutput.effectiveRiskLevel, 'attention'); assert.equal(payload.effectiveOutput.costReadiness.dataMaturityLevel, signal.dataMaturityLevel);
  assert.equal(review.dataMaturityLevel, signal.dataMaturityLevel); assert.equal(review.costActionRecommendation, signal.costActionRecommendation); assert.equal(review.riskLevel, 'attention'); assert.equal(review.systemRiskLevel, 'unknown');
  for (const table of ['project_operating_snapshot', 'operating_source_context', 'operating_evaluation_reason', 'operating_source_member']) assert.deepEqual(readRows(after.databases[ctx.database].tables[table]), readRows(before.databases[ctx.database].tables[table]), 'Overlay changed immutable source/base reasons');
  const context = oneStoredRow26(ctx, after, 'operating_source_context', published.sourceContextId).value.frozen_payload;
  const old = readRows(before.databases[ctx.database].tables.operating_signal_gate_binding).filter(row => JSON.parse(row.raw).signal_evaluation_id === published.signalId);
  assert.equal(old.length, 4); assert(Object.values(review.gateBindingIds).every(id => !old.some(row => row.key[0] === id)), 'Manual review must append four genuinely new bindings');
  for (const row of old) assert.equal(oneStoredRow26(ctx, after, 'operating_signal_gate_binding', row.key[0]).value.status, 'superseded');
  const gates = await readFour261(ctx, api, review.gateBindingIds, 'h04', context, review.evaluationContext.evaluationHash, review.reviewRecordId, tools);
  const proof = ctx.artifact(`${ctx.next('H26-real-H04-overlay')}.json`, { kind: 'actual-H08-attention-overlay-and-new-H04-bindings', review, reviewRow: stored.row, request: body, before: response.before, after: response.after, gates,
    H04CheckedInReviewPayloadAndAllFourSummaries: true, originalBaseReasonsPreserved: true, sourceFactsUnchanged: true, qualitativeJudgmentOnly: true, G3Certified: false, G4Certified: false });
  f.attentionReview26 = { reviewRecordId: review.reviewRecordId, proof, commandReceipt: response.receiptId }; ctx.persist(); return f.attentionReview26;
}

export async function verifyExistingBelow261(ctx,api,original,reconciliation){
 const tools=await originalTools261(),{data,oneStoredRow26,assertFrozenCase26,sha,canonical26}=tools,f=ctx.state.fixtures;assert(!f.publishedCases26.below);assert.equal(f.project.id,PROJECT261);const command=original.response,after=original.after,id=command.snapshotId,snapshot=oneStoredRow26(ctx,after,'project_operating_snapshot',id),context=oneStoredRow26(ctx,after,'operating_source_context',snapshot.value.source_context_id),frozen=context.value.frozen_payload;assert.equal(snapshot.value.producer_version,1);assert.equal(snapshot.value.row_version,1);assert.equal(context.value.producer_version,1);assert.equal(context.value.project_id,f.project.id);assert.equal(frozen.projectId,f.project.id);assert.equal(frozen.snapshot.id,id);assert.equal(frozen.sourceHash,command.sourceHash);assert.equal(sha(JSON.stringify(canonical26(frozen))),context.value.payload_hash);
 // Intentionally no G POST and no G GET: actual317 is already committed.
 const signal=data(await api.request('ProjectCostController_getOperatingSignalEvaluation',{id:command.evaluationRefs.signalEvaluationId},null,'manager'));assertFrozenCase26(frozen,signal,'below');assert.equal(signal.signalEvaluationId,command.evaluationRefs.signalEvaluationId);const gates=await readFour261(ctx,api,command.evaluationRefs.bindingIds,'below',frozen,signal.evaluationContext.evaluationHash,null,tools);const proof=ctx.artifact(ctx.next('h261-below-H-GET')+'.json',{kind:'actual-normal-producer-published-G-H-rule-case',case:'below',projectId:f.project.id,command:FIXED261.http,commandBefore:FIXED261.before,commandAfter:FIXED261.after,originalLedger:FIXED261.ledger,originalLedgerStillIncomplete:true,targetedOwnershipReconciliation:reconciliation,actualContext:context.row,actualSnapshot:snapshot.row,signal,gates,committedGPOSTReplayed:false,onlyRealHGETForBelow:true,formalEligibilityAndMaturityFromServer:true,SQLContextFixture:false,sourceGeneration:13,producerEpoch:ctx.epoch,G3Certified:false,G4Certified:false});const result={kind:'actual-published-H26-case',name:'below',projectId:f.project.id,snapshotId:id,sourceContextId:context.value.id,sourceHash:frozen.sourceHash,signalId:signal.signalEvaluationId,proof,immutableFacts:[{table:'project_operating_snapshot',id,sha256:snapshot.row.sha256,xmin:snapshot.row.xmin},{table:'operating_source_context',id:context.value.id,sha256:context.row.sha256,xmin:context.row.xmin}],continuation261:{original317:FIXED261.http,reconciliation,domainPOSTReplayed:false}};f.publishedCases26.below=result;ctx.persist();return result;
}
