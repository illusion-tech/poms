// Root-only actual FI controls. Importing never connects to PG or sends HTTP.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {sha,quote,uuid} from './pure.mjs';import {capture,loadSnapshot,readRows} from './snapshot.mjs';import {assertRecorded} from './ledger.mjs';
import {requireOwnedScope} from './required-write-inventory.mjs';import {assertSweepRollback,waitForActualPendingAuth,exactRawTouch} from './fault-sweep.mjs';
import {efSelectorSql40} from './ef-write-inventory40.mjs';import {verifyEFFinalWrites40} from './ef-fault-sweep40.mjs';
import {SHARED58_OPERATION,deriveSharedFacts58,sharedWriteInventory58} from './shared-source-inventory58.mjs';import {verifySharedSources58} from './shared-source-preparation58.mjs';
import {secondaryLockFailure58,correctionCaptureRace58} from './shared-source-race58.mjs';
import {verifySharedCashValues58} from './shared-cash-proof58.mjs';
const kind='source-bound-shared-auto-batch-sweep58',identitySHA=value=>sha(JSON.stringify(value));
export async function installSharedFault58(ctx,descriptor,requestId,before){
 assert.equal(process.platform,'linux');assert(!ctx.state.activeFault);assert.equal(descriptor.kind,kind);assert(/^[A-Za-z0-9_-]{1,100}$/.test(requestId));
 const sourcePins=verifySharedSources58(ctx),scope=descriptor.scope;
 assert.deepEqual(deriveSharedFacts58(ctx,before,scope,readRows),scope.sharedFacts,'Actual branch facts changed before control installation');
 const inventory=sharedWriteInventory58(SHARED58_OPERATION,scope),selected=inventory.find(d=>d.key===descriptor.key);assert(selected);assert.deepEqual(selected,descriptor.selected);
 const sessionId=requireOwnedScope(ctx,before,scope),binding={requestId,sessionId};
 const suffix=ctx.next('shared58-fi').replaceAll('-','_');
 const primary=controlNames(ctx,selected.table,selected.event,suffix+'_p',selected.deferred===true);
 // Every exact summary event precedes this final G receipt. An early per-target
 // audit fallback would incorrectly mask a later target's deferred primary.
 const fallback=controlNames(ctx,'operating_command_receipt','INSERT',suffix+'_f',true);
 const receipt=inventory.find(d=>d.key==='SHARED-GH-command-receipt');assert(receipt);
 assert(before.databases[ctx.database].tables[primary.table]);assert(before.databases[ctx.database].tables[fallback.table]);
 const active={kind,phase:'install-intent',requestId,operationId:SHARED58_OPERATION,key:selected.key,scope,selected,sourcePins,sessionId,before:before.manifest,primary,fallback};
 active.intent=ctx.artifact(`${ctx.next('shared58-install-intent')}.json`,active,{kind:'exact-owned-E-F-all-target-FI-intent',writeFamily:active.key,businessFixtureSQL:false});
 ctx.state.activeFault=active;ctx.persist();
 await ctx.db(async c=>{await c.query('BEGIN');try{
  await createControl(c,ctx,primary,efSelectorSql40(selected,binding),'primary');
  await createControl(c,ctx,fallback,efSelectorSql40(receipt,binding),'fallback');
  active.primary.identity=await inspect(c,primary);active.primary.identitySHA=identitySHA(active.primary.identity);
  active.fallback.identity=await inspect(c,fallback);active.fallback.identitySHA=identitySHA(active.fallback.identity);
  active.phase='commit-pending';ctx.persist();await c.query('COMMIT');
 }catch(error){await c.query('ROLLBACK');throw error;}});
 active.phase='installed';ctx.persist();
 ctx.artifact(`${ctx.next('shared58-installed')}.json`,active,{kind:'actual-owned-E-F-all-target-FI-installed',writeFamily:active.key,primaryTiming:primary.deferred?'after-write-deferred-to-commit':'before-write-immediate',businessFixtureSQL:false});
 return active;
}

export function verifySharedHistory58(ctx,before,after,facts,sessionId,concurrentTouch=null){
 const rows=(snapshot,table)=>readRows(snapshot.databases[ctx.database].tables[table]);
 const values=(snapshot,table)=>rows(snapshot,table).map(row=>JSON.parse(row.raw));
 const allowed=new Map();
 const permit=(table,predicate,columns)=>{for(const row of rows(before,table)){if(predicate(JSON.parse(row.raw)))allowed.set(table+':'+JSON.stringify(row.key),columns);}};
 const touched=['status','row_version','updated_at','updated_by'];
 if(facts.branch==='stage')permit('project_actual_cost_record',v=>v.id===facts.sourceCostId,['execution_stage_code','stage_derived_from_type','stage_derived_from_id','stage_derived_at','stage_locked_at','row_version','updated_at','updated_by']);
 if(facts.branch==='stage')permit('cost_stage_attribution_snapshot',v=>v.id===facts.stageId,touched);
 if(facts.branch==='tax')permit('accounting_tax_treatment_snapshot',v=>v.id===facts.taxId,touched);
 permit('shared_cost_allocation_basis',v=>v.id===facts.basisId,touched);
 permit('shared_cost_allocation_result',v=>facts.results.some(r=>r.id===v.id),touched);
 permit('shared_cost_allocation_source_snapshot',v=>v.basis_id===facts.basisId&&v.is_current===true,['is_current']);
 permit('project_operating_snapshot',v=>facts.targets.some(t=>t.restatesSnapshotRef.id===v.id),touched);
 permit('project_operating_head',v=>facts.projects.some(p=>p.projectId===v.project_id),['baseline_package_id','current_snapshot_id','row_version','updated_at','updated_by']);
 if(facts.branch==='stage')permit('project_cost_inclusion_head',v=>v.project_id===facts.sourceProjectId&&v.unit_key==='cost:'+facts.sourceCostId,['decision_id','row_version','updated_at','updated_by']);
 permit('operating_signal_gate_binding',v=>facts.projects.some(p=>p.oldBindingIds.includes(v.id)),touched);
 permit('commission_gate_review_record',v=>facts.projects.some(p=>p.oldGateReviewIds.includes(v.id)),touched);
 permit('auth_session',v=>v.id===sessionId&&v.user_id===facts.actorId,['last_seen_at','last_ip','idle_expires_at','row_version','updated_at']);
 if(concurrentTouch){assert.notEqual(concurrentTouch.sessionId,sessionId);const a=rows(before,'auth_session').find(x=>x.key[0]===concurrentTouch.sessionId),b=rows(after,'auth_session').find(x=>x.key[0]===concurrentTouch.sessionId);assert(a&&b&&exactRawTouch(a,b,concurrentTouch.sessionId,facts.actorId));assert.equal(a.sha256,concurrentTouch.beforeSHA256);assert.equal(b.sha256,concurrentTouch.afterSHA256);assert.equal(a.xmin,concurrentTouch.beforeXmin);assert.equal(b.xmin,concurrentTouch.afterXmin);permit('auth_session',v=>v.id===concurrentTouch.sessionId,['last_seen_at','last_ip','idle_expires_at','row_version','updated_at']);}
 const exactJSON=raw=>JSON.parse(raw,(key,value,context)=>{
  if(typeof value!=='number')return value;
  assert(typeof context?.source==='string','Node24 original numeric lexemes are mandatory for immutable money comparisons');
  return {exactOriginalNumericLexeme:context.source};
 });
 let checkedRows=0;
 for(const database of ctx.databases){
  assert.deepEqual(before.databases[database].meta,after.databases[database].meta);assert.deepEqual(before.objects[database],after.objects[database]);
  for(const table of Object.keys(before.databases[database].tables)){
   const oldRows=readRows(before.databases[database].tables[table]),newRows=new Map(readRows(after.databases[database].tables[table]).map(row=>[JSON.stringify(row.key),row]));
   for(const previous of oldRows){const current=newRows.get(JSON.stringify(previous.key));assert(current,'No old fact may be deleted');checkedRows++;
    if(current.sha256===previous.sha256&&current.xmin===previous.xmin)continue;
    const columns=database===ctx.database?allowed.get(table+':'+JSON.stringify(previous.key)):null;assert(columns,'An unlisted old business/authority/audit/evidence fact changed: '+table);
    const a=exactJSON(previous.raw),b=exactJSON(current.raw);for(const column of columns){delete a[column];delete b[column];}
    assert.deepEqual(b,a,'An old immutable amount/source/window/payload changed: '+table);
   }
  }
 }
 const moved=[];
 for(const project of facts.projects){
  const head=values(after,'project_operating_head').find(row=>row.project_id===project.projectId);assert(head);
  const newCurrent=values(after,'project_operating_snapshot').filter(row=>row.project_id===project.projectId&&row.supersedes_id===project.currentSnapshotId);
  assert.equal(newCurrent.length,1);assert.equal(head.current_snapshot_id,newCurrent[0].id);assert.equal(head.baseline_package_id,project.baselineId);
  assert.equal(head.row_version,project.headVersion+facts.targets.filter(t=>t.projectId===project.projectId).length);
  const active=values(after,'operating_signal_gate_binding').filter(row=>row.project_id===project.projectId&&row.status==='active');assert.equal(active.length,4);
  for(const binding of active){const signal=values(after,'operating_signal_evaluation_result').find(row=>row.id===binding.signal_evaluation_id);assert.equal(signal?.referenced_snapshot_id,newCurrent[0].id);}
  moved.push({projectId:project.projectId,beforeSnapshotId:project.currentSnapshotId,afterSnapshotId:newCurrent[0].id,activeBindingIds:active.map(row=>row.id).sort()});
 }
 for(const target of facts.targets){
  const old=values(before,'project_operating_snapshot').find(row=>row.id===target.restatesSnapshotRef.id);
  const next=values(after,'project_operating_snapshot').filter(row=>row.supersedes_id===old.id&&row.project_id===old.project_id);assert.equal(next.length,1);
  assert.equal(next[0].root_snapshot_id,old.root_snapshot_id??old.id);assert.equal(next[0].source_window_end,old.source_window_end);assert.equal(next[0].source_window_start,old.source_window_start);
  assert.equal(next[0].period_end_snapshot_id,null);
  const signals=values(after,'operating_signal_evaluation_result').filter(row=>row.referenced_snapshot_id===next[0].id);assert.equal(signals.length,1);
  const bindings=values(after,'operating_signal_gate_binding').filter(row=>row.signal_evaluation_id===signals[0].id);assert.equal(bindings.length,4);
  assert(bindings.every(row=>row.status===(target.selectedCurrent?'active':'superseded')));
 }
 return {allOldRowsChecked:checkedRows,immutableMoneyAndSourcesComparedWithOriginalNumericLexemes:true,onlyExactListedCASOrStatusColumnsChanged:true,currentMoves:moved,periodPositiveCovered:false};
}


function exactRows58(snapshot,database,table){return readRows(snapshot.databases[database].tables[table]).map(row=>({row,value:JSON.parse(row.raw,(key,value,context)=>typeof value==='number'&&/amount|total|ratio|rate|weight|margin|variance|^cash_gross$/.test(key)?context.source:value)}));}
export function verifySharedSemantics58(ctx,before,after,facts,transaction,concurrentTouch=null){
 const old=table=>exactRows58(before,ctx.database,table),now=table=>exactRows58(after,ctx.database,table);
 const oldBasis=old('shared_cost_allocation_basis').find(x=>x.value.id===facts.basisId),newBasis=now('shared_cost_allocation_basis').filter(x=>x.value.supersedes_id===facts.basisId);assert(oldBasis);assert.equal(newBasis.length,1);const basis=newBasis[0].value;
 for(const field of ['source_cost_scope_key','basis_type','allocation_method','currency','measurement_basis','source_amount_excluding_tax','source_tax_cost_amount','source_amount_including_tax','measurement_amount','allocation_algorithm'])assert.deepEqual(basis[field],oldBasis.value[field],'Implicit replacement changed preserved layer/algorithm: '+field);
 const oldSlots=old('shared_cost_allocation_source_snapshot').filter(x=>x.value.basis_id===facts.basisId),slots=now('shared_cost_allocation_source_snapshot').filter(x=>x.value.basis_id===basis.id);assert.equal(slots.length,oldSlots.length);assert.deepEqual(slots.map(x=>x.value.cost_record_id).sort(),oldSlots.map(x=>x.value.cost_record_id).sort());
 for(const x of slots){const cost=now('project_actual_cost_record').find(c=>c.value.id===x.value.cost_record_id);assert(cost);assert.equal(x.value.cost_row_version,cost.value.row_version);for(const field of ['amount_excluding_tax','tax_cost_amount','amount_including_tax','currency'])assert.deepEqual(x.value[field],cost.value[field]);}
 const replacements=[];for(const prior of facts.results){const previous=old('shared_cost_allocation_result').find(x=>x.value.id===prior.id),next=now('shared_cost_allocation_result').filter(x=>x.value.supersedes_id===prior.id);assert(previous);assert.equal(next.length,1);assert.equal(next[0].value.basis_id,basis.id);for(const field of ['project_id','allocation_weight','allocation_ratio','allocated_amount','allocated_amount_excluding_tax','allocated_tax_cost_amount','allocated_amount_including_tax','residual_minor_units','currency'])assert.deepEqual(next[0].value[field],previous.value[field],'Implicit result changed previous exact allocation: '+field);replacements.push({before:prior.id,after:next[0].value.id,projectId:prior.projectId,weight:next[0].value.allocation_weight});}
 assert.equal(now('project_actual_cost_record').length,old('project_actual_cost_record').length,'Stage/tax branch cannot invent E costs');
 const snapshots=now('project_operating_snapshot'),contexts=now('operating_source_context');const checked=[];const preparedPin=ctx.state.fixtures.sharedSourceFollowup58[facts.branch].prepared.artifact,preparedBytes=fs.readFileSync(preparedPin.file);assert.equal(sha(preparedBytes),preparedPin.rawBytesSha256);const freshPreparations=JSON.parse(preparedBytes).targetPreparations;assert.equal(freshPreparations.length,facts.targets.length);const valueProof=value=>JSON.parse(JSON.stringify(value),(key,v)=>key==='basisRefs'?undefined:v);
 for(const target of facts.targets){const previous=old('project_operating_snapshot').find(x=>x.value.id===target.restatesSnapshotRef.id),next=snapshots.filter(x=>x.value.supersedes_id===target.restatesSnapshotRef.id);assert(previous);assert.equal(next.length,1);for(const field of ['included_cost_total','tax_pending_knowledge','tax_impact_pending_amount','effective_contract_total'])assert.deepEqual(next[0].value[field],previous.value[field],'Same-stage/same-pending correction changed preserved cost/tax/contract metric: '+field);const context=contexts.find(x=>x.value.id===next[0].value.source_context_id),oldContext=old('operating_source_context').find(x=>x.value.id===previous.value.source_context_id);assert(context&&oldContext);const c=context.value.frozen_payload;for(const field of ['effectiveContractAmounts','includedCostAmounts','excludedCostAmounts','taxPendingAmount','costVarianceNet'])assert.deepEqual(valueProof(c.metrics[field]),valueProof(oldContext.value.frozen_payload.metrics[field]),'Same-stage/same-pending correction changed immutable economic layer: '+field);const matching=freshPreparations.filter(x=>x.target.projectId===target.projectId&&x.target.restatesSnapshotRef.id===target.restatesSnapshotRef.id);assert.equal(matching.length,1);const actualCash=verifySharedCashValues58(c,next[0].value,{receipts:old('receipt_record').map(x=>x.value),bases:old('receipt_accounting_basis').map(x=>x.value),terms:old('contract_term_snapshot').map(x=>x.value)},matching[0].preparation);
  if(facts.branch==='tax'){assert.equal(next[0].value.tax_pending_knowledge,'unknown');assert.equal(next[0].value.tax_impact_pending_amount,null);assert.equal(c.metrics.taxPendingAmount.knowledge,'unknown');assert.equal(c.metrics.taxPendingAmount.value,null);const shared=c.costs.filter(x=>replacements.some(r=>r.after===x.allocationResultRef?.id));assert(shared.length>0);for(const x of shared)assert.deepEqual(x.taxTreatmentRefs,[],'Source-project assessment is not a local receiver tax assessment');}
  checked.push({before:target.restatesSnapshotRef.id,after:next[0].value.id,projectId:target.projectId,preservedCostTaxAndContractMetrics:true,actualWindowQualifiedCash:actualCash,taxPendingKnowledge:next[0].value.tax_pending_knowledge});}
 const writeKeys=new Set(transaction.writes.map(x=>x.table+':'+JSON.stringify(x.key)));let exactActualRows=0;
 for(const database of ctx.databases)for(const table of Object.keys(before.databases[database].tables)){const prev=new Map(readRows(before.databases[database].tables[table]).map(x=>[JSON.stringify(x.key),x]));for(const row of readRows(after.databases[database].tables[table])){const a=prev.get(JSON.stringify(row.key));if(!a||a.sha256!==row.sha256||a.xmin!==row.xmin){const rawOnly=database===ctx.database&&table==='auth_session'&&concurrentTouch&&row.key[0]===concurrentTouch.sessionId&&row.sha256===concurrentTouch.afterSHA256&&row.xmin===concurrentTouch.afterXmin&&a?.sha256===concurrentTouch.beforeSHA256&&a?.xmin===concurrentTouch.beforeXmin;assert(rawOnly||(database===ctx.database&&writeKeys.has(table+':'+JSON.stringify(row.key))),'An actual durable write has no registered necessary FI family or exact losing-session precondition: '+table);if(!rawOnly)exactActualRows++;}}}
 return {implicitWholeBatch:true,preservedBasisLayersAndAlgorithm:true,preservedResultWeightsAndAmounts:replacements,allTargets:checked,actualBusinessAndManagedRowsCoveredByNecessaryInventory:exactActualRows,separateConcurrentRawAuthTouch:concurrentTouch,noNewCostRows:true,sourcePendingNotCopied:true,receiverAssessmentInvented:false};
}
export async function runSharedCorrectionSweep58(ctx,api,branch,options={}){
 const successMode=options.successMode??'plain';assert(['plain','ordered-race'].includes(successMode));if(successMode==='ordered-race')assert.equal(branch,'stage');
 const saved=ctx.state.fixtures.sharedSourceFollowup58?.[branch]?.prepared;assert(saved);const original=JSON.parse(fs.readFileSync(saved.artifact.file));assert.equal(sha(fs.readFileSync(saved.artifact.file)),saved.artifact.rawBytesSha256);assert.deepEqual(original.body,saved.body);
 const body=structuredClone(saved.body),bodySHA256=sha(JSON.stringify(body)),sourcePins=verifySharedSources58(ctx),actor='manager';const scope={operationId:SHARED58_OPERATION,branch,projectId:uuid(body.projectId),actorId:uuid(ctx.state.actors[actor].id),actorKey:actor,params:{},body};const observed=await capture(ctx,ctx.next('shared58-'+branch+'-facts'));assertRecorded(ctx,observed);scope.sharedFacts=deriveSharedFacts58(ctx,observed,scope,readRows);const inventory=sharedWriteInventory58(SHARED58_OPERATION,scope);const key=sha(JSON.stringify({branch,bodySHA256,actorId:scope.actorId}));ctx.state.sharedRequiredWriteSweeps58??={};let state=ctx.state.sharedRequiredWriteSweeps58[key];
 if(!state){state={kind,branch,successMode,bodySHA256,sourcePins,scope,inventory,failures:[],finalSuccess:null,actualDerivedInventory:ctx.artifact(ctx.next('shared58-'+branch+'-inventory')+'.json',{scope,inventory,before:observed.manifest,sourcePins},{kind:'actual-derived-shared-source-implicit-batch-inventory',actualFIExecuted:false})};ctx.state.sharedRequiredWriteSweeps58[key]=state;ctx.persist();}assert.equal(state.successMode,successMode,'A different final strategy needs an explicit reviewed series');assert.deepEqual(state.scope,scope);assert.deepEqual(state.inventory,inventory);assert.deepEqual(state.sourcePins,sourcePins);assert.equal(state.finalSuccess,null,'A committed correction is never POSTed again');assert(!state.normalPending&&!state.pendingTrial,'Uncertain prior HTTP must be reconciled from originals before another attempt');
 for(const selected of inventory){const prior=state.failures.find(x=>x.key===selected.key);if(prior){const b=fs.readFileSync(prior.observation.file);assert.equal(sha(b),prior.observation.rawBytesSha256);const v=JSON.parse(b);assert.equal(v.bodySHA256,bodySHA256);assert.deepEqual(v.descriptor,selected);assert.equal(v.failed.fault.hitCount,1);assert.equal(v.failed.fault.fallbackHitCount,0);assert(v.rollback.allBusinessAuditSecurityRowsAndXminUnchanged);continue;}if(selected.key==='pending-auth-coflush')await waitForActualPendingAuth(ctx,actor);verifySharedSources58(ctx);assert.equal(sha(JSON.stringify(body)),bodySHA256);state.pendingTrial={key:selected.key,bodySHA256};ctx.persist();const send=()=>api.request(SHARED58_OPERATION,{},body,actor,{...saved.binding,expectedStatus:500,fi:{kind,key:selected.key,operationId:SHARED58_OPERATION,scope,selected}});const held=successMode==='ordered-race'&&selected.key==='F-stage-evidence'&&!state.secondaryProbeAttempt?await secondaryLockFailure58(ctx,api,state,scope,selected,send):null;const failed=held?.failed??await send();assert.equal(failed.status,500);assert.equal(failed.responseComplete,true);assert.equal(failed.transportFailure,false);assert.equal(failed.requestBodySha256,bodySHA256);assert.equal(failed.fault.hitCount,1);assert.equal(failed.fault.fallbackHitCount,0);const rollback=assertSweepRollback(ctx,loadSnapshot(ctx,failed.before),loadSnapshot(ctx,failed.after),failed.fault,scope.actorId);const observation=ctx.artifact(ctx.next('shared58-'+branch+'-failure')+'.json',{bodySHA256,descriptor:selected,failed:{receipt:failed.receiptId,before:failed.before,after:failed.after,fault:failed.fault},rollback},{kind:'actual-shared-source-implicit-batch-write-failure',branch,writeFamily:selected.key,primaryHits:1,fallbackHits:0,G3Certified:false});state.failures.push({key:selected.key,observation});delete state.pendingTrial;ctx.persist();}
 assert.deepEqual(state.failures.map(x=>x.key).sort(),inventory.map(x=>x.key).sort());if(successMode==='ordered-race'){assert.equal(state.secondaryProbeAttempt?.phase,'verified','An actual secondary affected-project waiter+rollback proof is required');const pin=state.secondaryProbeAttempt.proof;assert.equal(sha(fs.readFileSync(pin.file)),pin.rawBytesSha256);}else await waitForActualPendingAuth(ctx,actor);verifySharedSources58(ctx);state.normalPending={bodySHA256,operationId:SHARED58_OPERATION};ctx.persist();const response=successMode==='ordered-race'?await correctionCaptureRace58(ctx,api,state,scope,saved.binding):await api.request(SHARED58_OPERATION,{},body,actor,saved.binding);state.finalSuccess={receipt:response.receiptId,requestId:response.requestId,status:response.status,before:response.before,after:response.after,raceProof:response.raceProof??null,concurrentRawAuthTouch:response.concurrentRawAuthTouch??null,postconditions:'pending'};delete state.normalPending;ctx.persist();assert.equal(response.requestBodySha256,bodySHA256);const before=loadSnapshot(ctx,response.before),after=loadSnapshot(ctx,response.after),sessionId=requireOwnedScope(ctx,before,scope);state.finalSuccess.transaction=verifyEFFinalWrites40(ctx,before,after,response,inventory,sessionId);ctx.persist();state.finalSuccess.history=verifySharedHistory58(ctx,before,after,scope.sharedFacts,sessionId,response.concurrentRawAuthTouch??null);ctx.persist();state.finalSuccess.semantics=verifySharedSemantics58(ctx,before,after,scope.sharedFacts,state.finalSuccess.transaction,response.concurrentRawAuthTouch??null);state.finalSuccess.postconditions='verified';ctx.persist();const receipt=ctx.artifact(ctx.next('shared58-'+branch+'-complete')+'.json',state,{kind:'actual-shared-source-implicit-batch-sweep',branch,mandatoryFamilies:inventory.length,actualOneHitFailures:state.failures.length,successfulRequests:1,periodPositiveCovered:false,G3Certified:false,G4Certified:false});return {kind:'actual-shared-source-implicit-batch-followup',branch,receipt,mandatoryFamilies:inventory.length,targets:scope.sharedFacts.targets.length,G3Certified:false,G4Certified:false};
}
function controlNames(ctx, table, event, suffix, deferred = false) {
  const prefix = `${ctx.state.prefix}_${suffix}`;
  const control = { table, event, deferred, function: `${prefix}_fn`, trigger: `${prefix}_tg`, sequence: `${prefix}_hits` };
  for (const name of [control.function, control.trigger, control.sequence]) { quote(name); assert(name.length <= 63); }
  return control;
}
async function inspect(c, control) {
  const fn = (await c.query("SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1", [control.function])).rows;
  const trigger = (await c.query('SELECT oid::text,pg_get_triggerdef(oid,true) definition,tgenabled FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass', [control.trigger, `poms.${control.table}`])).rows;
  const sequence = (await c.query("SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'", [control.sequence])).rows;
  assert.equal(fn.length, 1); assert.equal(trigger.length, 1); assert.equal(sequence.length, 1);
  return { fn, trigger, sequence };
}
async function createControl(c, ctx, control, selector, marker) {
  assert(/^[a-z0-9-]+$/.test(marker));
  await c.query(`CREATE SEQUENCE r4ghi_control.${quote(control.sequence)} START 1 MINVALUE 1 NO CYCLE`);
  await c.query(`CREATE FUNCTION r4ghi_control.${quote(control.function)}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r4ghi_sweep40$
DECLARE j jsonb:=to_jsonb(NEW);
BEGIN
 IF current_user<>'${ctx.owner}' THEN RAISE EXCEPTION 'Unexpected FI definer'; END IF;
 IF ${selector} THEN
  PERFORM nextval('r4ghi_control.${control.sequence}'::regclass);
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='r4ghi-required-write-${marker}';
 END IF;
 RETURN NEW;
END; $r4ghi_sweep40$`);
  await c.query(`REVOKE ALL ON FUNCTION r4ghi_control.${quote(control.function)}() FROM PUBLIC`);
  await c.query(`GRANT EXECUTE ON FUNCTION r4ghi_control.${quote(control.function)}() TO ${quote(ctx.apps[1])}`);
  const timing = control.deferred ? 'CREATE CONSTRAINT TRIGGER' : 'CREATE TRIGGER';
  const phase = control.deferred ? 'AFTER' : 'BEFORE';
  const deferral = control.deferred ? ' DEFERRABLE INITIALLY DEFERRED' : '';
  await c.query(`${timing} ${quote(control.trigger)} ${phase} ${control.event} ON poms.${quote(control.table)}${deferral} FOR EACH ROW EXECUTE FUNCTION r4ghi_control.${quote(control.function)}()`);
}
export async function removeSharedFault58(ctx) {
  const active = ctx.state.activeFault; assert.equal(active?.kind, kind);
  assert(['installed', 'commit-pending'].includes(active.phase) && active.primary.identitySHA && active.fallback.identitySHA, 'Interrupted install needs exact Root catalog reconciliation; never drop unverifiable objects');
  const counts = await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      for (const control of [active.primary, active.fallback]) assert.equal(identitySHA(await inspect(c, control)), control.identitySHA, 'OID/definition/owner/ACL changed; preserve controls and stop');
      const result = {};
      for (const [name, control] of [['primary', active.primary], ['fallback', active.fallback]]) {
        const hit = (await c.query(`SELECT last_value::text,is_called FROM r4ghi_control.${quote(control.sequence)}`)).rows[0];
        result[name] = hit.is_called ? Number(hit.last_value) : 0; assert(Number.isSafeInteger(result[name]));
        await c.query(`DROP TRIGGER ${quote(control.trigger)} ON poms.${quote(control.table)}`);
        await c.query(`DROP FUNCTION r4ghi_control.${quote(control.function)}()`);
        await c.query(`DROP SEQUENCE r4ghi_control.${quote(control.sequence)}`);
      }
      await c.query('COMMIT'); return result;
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  const receipt = ctx.artifact(`${ctx.next('sweep-disarmed')}.json`, { active, counts, identityMatched: true }, { kind: 'actual-source-bound-required-write-FI-disarmed', operationId: active.operationId, writeFamily: active.key, primaryHits: counts.primary, fallbackHits: counts.fallback, exactOwnedControlsOnly: true });
  delete ctx.state.activeFault; ctx.persist();
  return { hitCount: counts.primary, fallbackHitCount: counts.fallback, sessionId: active.sessionId, key: active.key, receipt };
}
