// Independent live40 nonempty-E/F/all-target FI path; old17/19 are unchanged.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha,quote,uuid } from './pure.mjs';
import { capture,loadSnapshot,readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { requireOwnedScope } from './required-write-inventory.mjs';
import { assertSweepRollback,waitForActualPendingAuth,rowsWritten } from './fault-sweep.mjs';
import { EF40_OPERATION,deriveEFCorrectionFacts40,efCorrectionWriteInventory40,efSelectorSql40,efWriteMatches40,expectedEFRows40 } from './ef-write-inventory40.mjs';
const kind='source-bound-ef-all-target-sweep40';
const identitySHA=value=>sha(JSON.stringify(value));
const exactStatus=attempt=>assert(attempt.status===500&&attempt.responseComplete===true&&!attempt.transportFailure,'Actual complete500 and rollback are required; missing ACK is not rollback');
export function verifyEFSources40(ctx){
 const file='tools/rust-r4ghi/business/required-write-sources40.json',raw=fs.readFileSync(ctx.win+'/'+file),manifest=JSON.parse(raw);
 assert.equal(manifest.kind,'exact-product-and-helper-source-closure-live40');
 assert.equal(ctx.helperPins.find(pin=>pin.file===file)?.sha256,sha(raw),'This invocation must capture the actual source40 manifest bytes');
 assert.deepEqual(manifest.productSources,ctx.pins,'All product404 inputs must be the exact actual new10 source epoch');
 for(const pin of [...manifest.productSources,...manifest.helperSources])assert.equal(sha(fs.readFileSync(ctx.win+'/'+pin.file)),pin.sha256,'Source40 bytes changed: '+pin.file);
 return {file,sha256:sha(raw),productSources:manifest.productSources,helperSources:manifest.helperSources};
}

export async function installEFFault40(ctx,descriptor,requestId,before){
 assert.equal(process.platform,'linux');assert(!ctx.state.activeFault);assert.equal(descriptor.kind,kind);assert(/^[A-Za-z0-9_-]{1,100}$/.test(requestId));
 const sourcePins=verifyEFSources40(ctx),scope=descriptor.scope;
 assert.deepEqual(deriveEFCorrectionFacts40(ctx,before,scope,readRows),scope.efFacts,'Actual branch facts changed before control installation');
 const inventory=efCorrectionWriteInventory40(EF40_OPERATION,scope),selected=inventory.find(d=>d.key===descriptor.key);assert(selected);assert.deepEqual(selected,descriptor.selected);
 const sessionId=requireOwnedScope(ctx,before,scope),binding={requestId,sessionId};
 const suffix=ctx.next('ef40-fi').replaceAll('-','_');
 const primary=controlNames(ctx,selected.table,selected.event,suffix+'_p',selected.deferred===true);
 // Every exact summary event precedes this final G receipt. An early per-target
 // audit fallback would incorrectly mask a later target's deferred primary.
 const fallback=controlNames(ctx,'operating_command_receipt','INSERT',suffix+'_f',true);
 const receipt=inventory.find(d=>d.key==='EF-GH-command-receipt');assert(receipt);
 assert(before.databases[ctx.database].tables[primary.table]);assert(before.databases[ctx.database].tables[fallback.table]);
 const active={kind,phase:'install-intent',requestId,operationId:EF40_OPERATION,key:selected.key,scope,selected,sourcePins,sessionId,before:before.manifest,primary,fallback};
 active.intent=ctx.artifact(`${ctx.next('ef40-install-intent')}.json`,active,{kind:'exact-owned-E-F-all-target-FI-intent',writeFamily:active.key,businessFixtureSQL:false});
 ctx.state.activeFault=active;ctx.persist();
 await ctx.db(async c=>{await c.query('BEGIN');try{
  await createControl(c,ctx,primary,efSelectorSql40(selected,binding),'primary');
  await createControl(c,ctx,fallback,efSelectorSql40(receipt,binding),'fallback');
  active.primary.identity=await inspect(c,primary);active.primary.identitySHA=identitySHA(active.primary.identity);
  active.fallback.identity=await inspect(c,fallback);active.fallback.identitySHA=identitySHA(active.fallback.identity);
  active.phase='commit-pending';ctx.persist();await c.query('COMMIT');
 }catch(error){await c.query('ROLLBACK');throw error;}});
 active.phase='installed';ctx.persist();
 ctx.artifact(`${ctx.next('ef40-installed')}.json`,active,{kind:'actual-owned-E-F-all-target-FI-installed',writeFamily:active.key,primaryTiming:primary.deferred?'after-write-deferred-to-commit':'before-write-immediate',businessFixtureSQL:false});
 return active;
}

export function verifyEFFinalWrites40(ctx,before,after,attempt,inventory,sessionId){
 const allRows=table=>readRows(after.databases[ctx.database].tables[table]);
 const changed=(table,event)=>rowsWritten(readRows(before.databases[ctx.database].tables[table]),allRows(table),event);
 const binding={requestId:attempt.requestId,sessionId};
 const root=inventory.find(d=>d.key==='required-success-audit');assert(root);
 const audits=changed('audit_log','INSERT').filter(row=>efWriteMatches40(root,row,allRows,binding));assert.equal(audits.length,1);
 const xmin=audits[0].xmin,writes=[];
 for(const descriptor of inventory){
  let candidates=changed(descriptor.table,descriptor.event);
  if(descriptor.insertedThenUpdated){
   // The source INSERT and later UPDATE are distinct primary FI events. Their
   // final row is new relative to before; its exact final version/state and
   // common xmin prove the actual successful continuation without inventing
   // an intermediate SQL row in the observation.
   assert.equal(descriptor.event,'UPDATE');candidates=changed(descriptor.table,'INSERT');
  }
  const matches=candidates.filter(row=>efWriteMatches40(descriptor,row,allRows,binding));
  const expected=expectedEFRows40(descriptor,allRows);assert(Number.isInteger(expected)&&expected>0);
  assert.equal(matches.length,expected,'Missing exact source-selected mandatory rows: '+descriptor.key);
  for(const row of matches){assert.equal(row.xmin,xmin,'Necessary write escaped the actual outer transaction: '+descriptor.key);
   writes.push({family:descriptor.key,table:descriptor.table,key:row.key,rowSHA256:row.sha256,xmin,source:descriptor.source,
    primaryTiming:descriptor.deferred?'after-write-deferred-to-commit':'before-write-immediate',insertedThenUpdated:descriptor.insertedThenUpdated===true});}
 }
 return {actualCommonOuterXmin:xmin,writes,allTargetFamiliesVerified:true,localMoneyOrBusinessHashMinted:false};
}

export function verifyEFOldFactsAndCurrent40(ctx,before,after,facts,sessionId){
 const rows=(snapshot,table)=>readRows(snapshot.databases[ctx.database].tables[table]);
 const values=(snapshot,table)=>rows(snapshot,table).map(row=>JSON.parse(row.raw));
 const allowed=new Map();
 const permit=(table,predicate,columns)=>{for(const row of rows(before,table)){if(predicate(JSON.parse(row.raw)))allowed.set(table+':'+JSON.stringify(row.key),columns);}};
 const touched=['status','row_version','updated_at','updated_by'];
 permit('project_actual_cost_record',v=>v.id===facts.laborId,['record_status','row_version','updated_at','updated_by']);
 permit('project_actual_cost_record',v=>v.id===facts.stageCostId,['execution_stage_code','stage_derived_from_type','stage_derived_from_id','stage_derived_at','stage_locked_at','row_version','updated_at','updated_by']);
 permit('cost_stage_attribution_snapshot',v=>v.id===facts.stageId,touched);
 permit('accounting_tax_treatment_snapshot',v=>v.id===facts.taxId,touched);
 permit('shared_cost_allocation_basis',v=>v.id===facts.basisId,touched);
 permit('shared_cost_allocation_result',v=>facts.results.some(r=>r.id===v.id),touched);
 permit('shared_cost_allocation_source_snapshot',v=>v.basis_id===facts.basisId&&v.is_current===true,['is_current']);
 permit('project_operating_snapshot',v=>facts.targets.some(t=>t.restatesSnapshotRef.id===v.id),touched);
 permit('project_operating_head',v=>facts.projects.some(p=>p.projectId===v.project_id),['baseline_package_id','current_snapshot_id','row_version','updated_at','updated_by']);
 permit('project_cost_inclusion_head',v=>v.project_id===facts.laborProjectId&&v.unit_key==='cost:'+facts.stageCostId,['decision_id','row_version','updated_at','updated_by']);
 permit('operating_signal_gate_binding',v=>facts.projects.some(p=>p.oldBindingIds.includes(v.id)),touched);
 permit('commission_gate_review_record',v=>facts.projects.some(p=>p.oldGateReviewIds.includes(v.id)),touched);
 permit('business_number_sequence',v=>v.scope==='cost-labor'&&v.period===facts.counterPeriod,['next_value','updated_at']);
 permit('auth_session',v=>v.id===sessionId&&v.user_id===facts.actorId,['last_seen_at','last_ip','idle_expires_at','row_version','updated_at']);
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

export async function verifyEFActualAmounts40(ctx,after,facts){
 const costRows=readRows(after.databases[ctx.database].tables.project_actual_cost_record);
 const replacement=costRows.find(row=>JSON.parse(row.raw).supersedes_record_id===facts.laborId);assert(replacement);
 const cost=JSON.parse(replacement.raw);const basis=readRows(after.databases[ctx.database].tables.shared_cost_allocation_basis).map(row=>JSON.parse(row.raw)).find(row=>row.supersedes_id===facts.basisId);assert(basis);
 return ctx.db(async c=>{
  const labor=(await c.query('SELECT id::text,rate_version_id::text,actual_hours::text,internal_cost_rate::text,currency,amount_excluding_tax::text,tax_cost_amount::text,amount_including_tax::text,xmin::text FROM poms.project_actual_cost_record WHERE id=$1::uuid',[cost.id])).rows;assert.equal(labor.length,1);
  assert.equal(labor[0].xmin,replacement.xmin);assert.equal(labor[0].currency,'CNY');assert.equal(labor[0].actual_hours.replace(/\.0+$/,''),'9');assert.equal(labor[0].internal_cost_rate.replace(/\.0+$/,''),'100');
  assert.equal(labor[0].amount_excluding_tax,'900.00');assert.equal(labor[0].tax_cost_amount,'0.00');assert.equal(labor[0].amount_including_tax,'900.00');
  const results=(await c.query('SELECT id::text,project_id::text,currency,allocated_amount_excluding_tax::text,allocated_tax_cost_amount::text,allocated_amount_including_tax::text,xmin::text FROM poms.shared_cost_allocation_result WHERE basis_id=$1::uuid ORDER BY project_id',[basis.id])).rows;assert.equal(results.length,2);
  for(const row of results){assert.equal(row.currency,'CNY');const net=row.project_id===facts.laborProjectId?'600.00':'300.00';assert.equal(row.allocated_amount_excluding_tax,net);assert.equal(row.allocated_tax_cost_amount,'0.00');assert.equal(row.allocated_amount_including_tax,net);assert.equal(row.xmin,replacement.xmin);}
  const snapshots=(await c.query('SELECT id::text,project_id::text,included_cost_total::text,tax_pending_knowledge,tax_impact_pending_amount::text,xmin::text FROM poms.project_operating_snapshot WHERE supersedes_id=ANY($1::uuid[]) ORDER BY project_id,id',[facts.targets.map(t=>t.restatesSnapshotRef.id)])).rows;
  assert.equal(snapshots.length,facts.targets.length);
  for(const row of snapshots){assert.equal(row.xmin,replacement.xmin);
   if(row.project_id===facts.laborProjectId){assert.equal(row.included_cost_total,'10600.00');assert.equal(row.tax_pending_knowledge,'unknown');assert.equal(row.tax_impact_pending_amount,null);}
   else{assert.equal(row.included_cost_total,'300.00');assert.equal(row.tax_pending_knowledge,'known');assert.equal(row.tax_impact_pending_amount,'0.00');}
  }
  return {kind:'actual-PG-text-money-readback-of-controlled-real-producer-fixture',labor,results,snapshots,SQLBusinessWrites:0,moneyFloatRoundTrip:false,
   taxPartialCoverageUnknownPreserved:true,sharedLaborTaxActuallyZero:true,sourceProjectPendingNotCopied:true};
 });
}

export async function runEFCorrectionSweep40(ctx,api){
 const saved=ctx.state.fixtures.efCrossProject40?.prepared;assert(saved);
 const raw=fs.readFileSync(saved.artifact.file);assert.equal(sha(raw),saved.artifact.rawBytesSha256);const original=JSON.parse(raw);assert.deepEqual(original.body,saved.body);
 const body=structuredClone(saved.body),bodySHA256=sha(JSON.stringify(body)),sourcePins=verifyEFSources40(ctx);
 const actor='manager',scope={operationId:EF40_OPERATION,projectId:uuid(body.projectId),actorId:uuid(ctx.state.actors[actor].id),actorKey:actor,params:{},body};
 const observed=await capture(ctx,ctx.next('ef40-facts'));assertRecorded(ctx,observed);
 scope.efFacts=deriveEFCorrectionFacts40(ctx,observed,scope,readRows);
 const inventory=efCorrectionWriteInventory40(EF40_OPERATION,scope);
 const stateKey=sha(JSON.stringify({operationId:EF40_OPERATION,actorId:scope.actorId,bodySHA256}));
 ctx.state.efRequiredWriteSweeps40??={};let state=ctx.state.efRequiredWriteSweeps40[stateKey];
 if(!state){state={kind,bodySHA256,sourcePins,scope,inventory,failures:[],finalSuccess:null,
  actualDerivedInventory:ctx.artifact(`${ctx.next('ef40-actual-inventory')}.json`,{sourcePins,scope,inventory,before:observed.manifest},{kind:'actual-observation-derived-E-F-all-target-FI-inventory',targets:scope.efFacts.targets.length,families:inventory.length,actualSourcePreflightOnly:true,FIExecuted:false})};
  ctx.state.efRequiredWriteSweeps40[stateKey]=state;ctx.persist();}
 assert.deepEqual(state.sourcePins,sourcePins);assert.deepEqual(state.scope,scope);assert.deepEqual(state.inventory,inventory);
 assert.equal(state.finalSuccess,null,'This exact correction already committed; reconcile its originals instead of replaying the POST');
 const binding={...saved.binding,restatementLaborCounter:'one-owned-labor-replacement-v1'};
 for(const selected of inventory){
  const prior=state.failures.find(row=>row.key===selected.key);
  if(prior){const bytes=fs.readFileSync(prior.observation.file);assert.equal(sha(bytes),prior.observation.rawBytesSha256);const value=JSON.parse(bytes);
   assert.equal(value.bodySHA256,bodySHA256);assert.deepEqual(value.descriptor,selected);assert.equal(value.failed.fault.hitCount,1);assert.equal(value.failed.fault.fallbackHitCount,0);assert.equal(value.rollback.allBusinessAuditSecurityRowsAndXminUnchanged,true);continue;}
  if(selected.key==='pending-auth-coflush')await waitForActualPendingAuth(ctx,actor);
  verifyEFSources40(ctx);assert.equal(sha(JSON.stringify(body)),bodySHA256,'No CAS/hash/body refresh during a sweep');
  const failed=await api.request(EF40_OPERATION,{},body,actor,{...binding,expectedStatus:500,fi:{kind,key:selected.key,operationId:EF40_OPERATION,scope,selected}});
  exactStatus(failed);assert.equal(failed.requestBodySha256,bodySHA256);
  const rollback=assertSweepRollback(ctx,loadSnapshot(ctx,failed.before),loadSnapshot(ctx,failed.after),failed.fault,scope.actorId);
  const observation=ctx.artifact(`${ctx.next('ef40-failure')}.json`,{bodySHA256,descriptor:selected,failed:{receipt:failed.receiptId,before:failed.before,after:failed.after,fault:failed.fault},rollback},
   {kind:'actual-nonempty-E-F-all-target-write-failure',writeFamily:selected.key,primaryTiming:selected.deferred?'after-write-deferred-to-commit':'before-write-immediate',primaryHits:failed.fault.hitCount,fallbackHits:failed.fault.fallbackHitCount,
    coveragePassed:failed.fault.hitCount===1&&failed.fault.fallbackHitCount===0,rollbackObserved:true});
  assert.equal(failed.fault.hitCount,1,'A missed primary is not coverage, even when the receipt fallback rolled back');assert.equal(failed.fault.fallbackHitCount,0);
  state.failures.push({key:selected.key,observation});ctx.persist();
 }
 assert.deepEqual(state.failures.map(row=>row.key).sort(),inventory.map(row=>row.key).sort());
 await waitForActualPendingAuth(ctx,actor);verifyEFSources40(ctx);assert.equal(sha(JSON.stringify(body)),bodySHA256);
 const successful=await api.request(EF40_OPERATION,{},body,actor,binding);
 state.finalSuccess={receipt:successful.receiptId,requestId:successful.requestId,status:successful.status,before:successful.before,after:successful.after,postconditions:'pending'};ctx.persist();
 assert.equal(successful.requestBodySha256,bodySHA256);
 const before=loadSnapshot(ctx,successful.before),after=loadSnapshot(ctx,successful.after),sessionId=requireOwnedScope(ctx,before,scope);
 state.finalSuccess.transaction=verifyEFFinalWrites40(ctx,before,after,successful,inventory,sessionId);ctx.persist();
 state.finalSuccess.immutableAndCurrent=verifyEFOldFactsAndCurrent40(ctx,before,after,scope.efFacts,sessionId);ctx.persist();
 state.finalSuccess.actualAmounts=await verifyEFActualAmounts40(ctx,after,scope.efFacts);state.finalSuccess.postconditions='verified';ctx.persist();
 const receipt=ctx.artifact(`${ctx.next('ef40-complete')}.json`,state,{kind:'actual-nonempty-E-F-all-target-necessary-write-sweep',mandatoryFamilies:inventory.length,actualOneHitFailures:state.failures.length,
  successfulRequests:1,ordinaryFixtureRetrospectivelyCertified:false,periodPositiveCovered:false,G3Certified:false,G4Certified:false});
 return {kind:'actual-live40-nonempty-producer-and-all-target-FI',receipt,targets:scope.efFacts.targets.length,mandatoryFamilies:inventory.length,
  actualCoverageOnly:true,periodPositiveCovered:false,G3Certified:false,G4Certified:false};
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
export async function removeEFFault40(ctx) {
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
