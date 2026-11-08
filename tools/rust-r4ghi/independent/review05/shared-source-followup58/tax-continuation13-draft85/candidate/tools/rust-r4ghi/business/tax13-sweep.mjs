// Root-only Source13 exact necessary-write FI. Importing performs no I/O.
import fs from 'node:fs';import assert from 'node:assert/strict';import {setTimeout as delay} from 'node:timers/promises';
import {sha,quote,uuid,keyOf} from './pure.mjs';import {capture,loadSnapshot,readRows} from './snapshot.mjs';import {assertRecorded} from './ledger.mjs';
import {readPin54} from './consumer-admission54.mjs';import {loadActualAuthConfig} from './auth-config-binding.mjs';
import {requireOwnedScope} from './required-write-inventory.mjs';import {assertSweepRollback} from './fault-sweep.mjs';
import {efSelectorSql40} from './ef-write-inventory40.mjs';import {verifyEFFinalWrites40} from './ef-fault-sweep40.mjs';
import {verifyTax13Sources} from './tax13-provenance.mjs';import {deriveTax13Facts,inventoryTax13,TAX13_OPERATION} from './tax13-facts.mjs';import {correctionBindingTax13} from './tax13-main.mjs';import {verifyTax13Semantics} from './tax13-semantics.mjs';
export const TAX13_FAULT_KIND='source-bound-tax-continuation13-sweep';
const identitySHA=value=>sha(JSON.stringify(value));
function preparedTax13(ctx,manifest){
 verifyTax13Sources(ctx,manifest);const record=ctx.state.taxContinuation13;assert(record&&record.mainCompletion?.postconditions==='verified');assert.equal(record.identity.sourcePinsSHA256,manifest.current.sourcePinsSHA256);const saved=record.taxPreparation;assert(saved);const original=JSON.parse(readPin54(saved.artifact));assert.deepEqual(original.body,saved.body);assert.equal(sha(JSON.stringify(saved.body)),saved.bodySHA256);assert.deepEqual(original.facts,saved.facts);assert.deepEqual(original.inventory,saved.inventory);return {record,saved,legacy:{...record.legacyReferences,projectIds:[record.legacyReferences.sourceProjectId,record.legacyReferences.mainProjectId]}};
}
export async function waitForTax13PendingAuth(ctx,manifest,actorKey='manager'){
 verifyTax13Sources(ctx,manifest);const settings=loadActualAuthConfig(ctx),actor=ctx.state.actors[actorKey];assert(actor?.cookies?.poms_session);assert(settings.throttleSeconds+2<settings.idleSeconds);const tokenHash=sha(decodeURIComponent(actor.cookies.poms_session));let waits=0,first=null;
 for(;;){const rows=await ctx.db(async c=>(await c.query("SELECT id::text,user_id::text,status,last_seen_at,clock_timestamp() now,idle_expires_at,absolute_expires_at FROM poms.auth_session WHERE token_hash=$1",[tokenHash])).rows);assert.equal(rows.length,1);const row=rows[0];assert.equal(row.user_id,actor.id);assert.equal(row.status,'active');assert(ctx.state.owned[keyOf(ctx.database,'auth_session',[uuid(row.id)])]);const now=Date.parse(row.now),deadline=Math.min(Date.parse(row.idle_expires_at),Date.parse(row.absolute_expires_at)),remaining=Date.parse(row.last_seen_at)+settings.throttleSeconds*1000+100-now;assert(deadline-now>2000,'Root must really re-login an expired session; no401 domain fiction');first??={sessionId:row.id,observedAt:row.now,lastSeen:row.last_seen_at,settings};if(remaining<=0)return ctx.artifact(ctx.next('tax13-real-auth-due')+'.json',{first,observedAt:row.now,lastSeen:row.last_seen_at,waits,SQLBackdating:false});assert(remaining+2000<deadline-now);if(waits%6===0)console.log(JSON.stringify({kind:'awaiting-real-Source13-auth-throttle',remainingSeconds:Math.ceil(remaining/1000),actorKey}));await delay(Math.min(5000,Math.ceil(remaining)));waits++;}
}
export async function installTax13Fault(ctx,descriptor,requestId,before){
 assert.equal(process.platform,'linux');assert(!ctx.state.activeFault);assert.equal(descriptor.kind,TAX13_FAULT_KIND);assert(/^[A-Za-z0-9_-]{1,100}$/.test(requestId));const {saved,legacy}=preparedTax13(ctx,descriptor.manifest),scope=descriptor.scope;assert.equal(scope.operationId,TAX13_OPERATION);assert.deepEqual(scope.body,saved.body);assert.deepEqual(deriveTax13Facts(ctx,before,scope.body,legacy,saved.packets,readRows),scope.sharedFacts);const inventory=inventoryTax13(scope.sharedFacts),selected=inventory.find(d=>d.key===descriptor.key);assert(selected);assert.deepEqual(selected,descriptor.selected);const sessionId=requireOwnedScope(ctx,before,scope),binding={requestId,sessionId},suffix=ctx.next('tax13-fi').replaceAll('-','_');const primary=controlNames(ctx,selected.table,selected.event,suffix+'_p',selected.deferred===true),fallback=controlNames(ctx,'operating_command_receipt','INSERT',suffix+'_f',true),receipt=inventory.find(d=>d.key==='SHARED-GH-command-receipt');assert(receipt);
 const active={kind:TAX13_FAULT_KIND,phase:'install-intent',requestId,operationId:TAX13_OPERATION,key:selected.key,scope,selected,sessionId,before:before.manifest,primary,fallback,sourcePinsSHA256:descriptor.manifest.current.sourcePinsSHA256,bindingSHA256:sha(JSON.stringify(descriptor.manifest))};active.intent=ctx.artifact(ctx.next('tax13-fi-intent')+'.json',active,{kind:'exact-Source13-owned-required-FI-intent',writeFamily:selected.key,businessFixtureSQL:false});ctx.state.activeFault=active;ctx.persist();
 await ctx.db(async c=>{await c.query('BEGIN');try{await createControl(c,ctx,primary,efSelectorSql40(selected,binding),'primary');await createControl(c,ctx,fallback,efSelectorSql40(receipt,binding),'fallback');active.primary.identity=await inspect(c,primary);active.primary.identitySHA=identitySHA(active.primary.identity);active.fallback.identity=await inspect(c,fallback);active.fallback.identitySHA=identitySHA(active.fallback.identity);active.phase='commit-pending';ctx.persist();await c.query('COMMIT');}catch(error){await c.query('ROLLBACK');throw error;}});active.phase='installed';ctx.persist();ctx.artifact(ctx.next('tax13-fi-installed')+'.json',active,{kind:'actual-Source13-owned-required-FI-installed',writeFamily:selected.key,businessFixtureSQL:false});return active;
}
export function assertEffectsReadyTax13(saved){assert(saved&&Array.isArray(saved.packets));for(const packet of saved.packets){assert.equal(packet.preparation.formalEligibility.status,'eligible');assert.deepEqual(packet.preparation.blockingReasonCodes,[]);assert.equal(packet.target.periodEndSnapshotRef,null,'A complete period target is retained for review, never removed to run this live-only effect adapter');}}
export async function fiTax13(ctx,api,manifest){
 const {record,saved,legacy}=preparedTax13(ctx,manifest);assertEffectsReadyTax13(saved);assert(!record.pendingMain&&!record.pendingTaxTrial&&!record.normalTaxPending,'Reconcile uncertain prior requests before any retry');assert(!record.sweep?.finalSuccess,'A committed Tax correction cannot be sent again');await api.login('manager');verifyTax13Sources(ctx,manifest);const body=structuredClone(saved.body),bodySHA256=sha(JSON.stringify(body)),scope={operationId:TAX13_OPERATION,branch:'tax',projectId:body.projectId,actorId:ctx.state.actors.manager.id,actorKey:'manager',params:{},body};const observed=await capture(ctx,ctx.next('tax13-dynamic-inventory'));assertRecorded(ctx,observed);scope.sharedFacts=deriveTax13Facts(ctx,observed,body,legacy,saved.packets,readRows);const inventory=inventoryTax13(scope.sharedFacts);assert.deepEqual(inventory,saved.inventory);assert.deepEqual(scope.sharedFacts,saved.facts);
 const state=record.sweep??={kind:TAX13_FAULT_KIND,bodySHA256,scope,inventory,sourcePinsSHA256:manifest.current.sourcePinsSHA256,failures:[],finalSuccess:null,actualDerivedInventory:ctx.artifact(ctx.next('tax13-actual-inventory')+'.json',{scope,inventory,before:observed.manifest,prepared:saved.artifact,actualFIExecuted:false})};ctx.persist();assert.equal(state.bodySHA256,bodySHA256);assert.deepEqual(state.scope,scope);assert.deepEqual(state.inventory,inventory);assert.equal(state.sourcePinsSHA256,manifest.current.sourcePinsSHA256);
 for(const selected of inventory){const prior=state.failures.find(f=>f.key===selected.key);if(prior){const proof=JSON.parse(readPin54(prior.observation));assert.deepEqual(proof.descriptor,selected);assert.equal(proof.bodySHA256,bodySHA256);assert.equal(proof.failed.fault.hitCount,1);assert.equal(proof.failed.fault.fallbackHitCount,0);assert(proof.rollback.allBusinessAuditSecurityRowsAndXminUnchanged);continue;}if(selected.key==='pending-auth-coflush')await waitForTax13PendingAuth(ctx,manifest);verifyTax13Sources(ctx,manifest);record.pendingTaxTrial={key:selected.key,bodySHA256};ctx.persist();const failed=await api.request(TAX13_OPERATION,{},body,'manager',{...correctionBindingTax13,expectedStatus:500,fi:{kind:TAX13_FAULT_KIND,key:selected.key,operationId:TAX13_OPERATION,scope,selected,manifest}});assert.equal(failed.status,500);assert.equal(failed.responseComplete,true);assert.equal(failed.transportFailure,false);assert.equal(failed.requestBodySha256,bodySHA256);assert.equal(failed.fault.hitCount,1);assert.equal(failed.fault.fallbackHitCount,0);const rollback=assertSweepRollback(ctx,loadSnapshot(ctx,failed.before),loadSnapshot(ctx,failed.after),failed.fault,scope.actorId),observation=ctx.artifact(ctx.next('tax13-required-failure')+'.json',{bodySHA256,descriptor:selected,failed:{receipt:failed.receiptId,before:failed.before,after:failed.after,fault:failed.fault},rollback},{kind:'actual-Source13-Tax-full-target-required-FI',writeFamily:selected.key,primaryHits:1,fallbackHits:0,G3Certified:false});state.failures.push({key:selected.key,observation});delete record.pendingTaxTrial;ctx.persist();}
 assert.deepEqual(state.failures.map(f=>f.key).sort(),inventory.map(d=>d.key).sort());const original=ctx.artifact(ctx.next('tax13-fi-only-complete')+'.json',{scope,inventory,bodySHA256,failures:state.failures,normalTaxPOSTExecuted:false},{kind:'Source13-Tax-FI-complete-STOP-for-Root-review',mandatoryFamilies:inventory.length,normalTaxPOSTExecuted:false,G3Certified:false});state.fiComplete=original;ctx.persist();return {kind:'Source13-Tax-FI-STOP',original,mandatoryFamilies:inventory.length,normalTaxPOSTExecuted:false,G3Certified:false};
}
export async function commitTax13(ctx,api,manifest){
 const {record,saved}=preparedTax13(ctx,manifest);assert(!record.pendingMain&&!record.pendingTaxTrial&&!record.normalTaxPending);const state=record.sweep;assert(state&&state.fiComplete&&!state.finalSuccess,'Only an explicitly reviewed completed FI series can reach its separate normal invocation');const body=structuredClone(saved.body),bodySHA256=sha(JSON.stringify(body)),scope=state.scope,inventory=state.inventory;assert.equal(state.bodySHA256,bodySHA256);assert.deepEqual(inventory,saved.inventory);assertEffectsReadyTax13(saved);readPin54(state.fiComplete);assert.deepEqual(state.failures.map(f=>f.key).sort(),inventory.map(d=>d.key).sort());for(const failure of state.failures){const proof=JSON.parse(readPin54(failure.observation)),selected=inventory.find(d=>d.key===failure.key);assert.deepEqual(proof.descriptor,selected);assert.equal(proof.bodySHA256,bodySHA256);assert.equal(proof.failed.fault.hitCount,1);assert.equal(proof.failed.fault.fallbackHitCount,0);const receipt=JSON.parse(fs.readFileSync(proof.failed.receipt));assert.equal(receipt.status,500);assert.equal(receipt.responseComplete,true);assert.equal(receipt.transportFailure,false);assert.equal(sha(readPin54(receipt.originals.requestBody)),bodySHA256);assertSweepRollback(ctx,loadSnapshot(ctx,proof.failed.before),loadSnapshot(ctx,proof.failed.after),proof.failed.fault,scope.actorId);}
 await api.login('manager');assert.equal(ctx.state.actors.manager.id,scope.actorId);await waitForTax13PendingAuth(ctx,manifest);verifyTax13Sources(ctx,manifest);record.normalTaxPending={bodySHA256,operationId:TAX13_OPERATION};ctx.persist();const response=await api.request(TAX13_OPERATION,{},body,'manager',correctionBindingTax13);state.finalSuccess={status:response.status,requestId:response.requestId,receipt:response.receiptId,before:response.before,after:response.after,postconditions:'pending'};delete record.normalTaxPending;ctx.persist();assert.equal(response.requestBodySha256,bodySHA256);const before=loadSnapshot(ctx,response.before),after=loadSnapshot(ctx,response.after),sessionId=requireOwnedScope(ctx,before,scope);state.finalSuccess.transaction=verifyEFFinalWrites40(ctx,before,after,response,inventory,sessionId);ctx.persist();state.finalSuccess.semantics=verifyTax13Semantics(ctx,before,after,response,scope.sharedFacts,saved.packets,state.finalSuccess.transaction,sessionId);state.finalSuccess.postconditions='verified';ctx.persist();const original=ctx.artifact(ctx.next('tax13-current-consumer-complete')+'.json',state,{kind:'actual-Source13-retained-tax-consumer-complete',mandatoryFamilies:inventory.length,targets:scope.sharedFacts.targets.length,producerEpoch:'g2-business12',consumerEpoch:ctx.epoch,G3Certified:false,G4Certified:false});record.complete=original;ctx.persist();return {kind:'actual-Source13-retained-tax-continuation',original,mandatoryFamilies:inventory.length,targets:scope.sharedFacts.targets.length,retainedProducerRecordsEdited:false,G3Certified:false,G4Certified:false};
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
export async function removeTax13Fault(ctx) {
  const active = ctx.state.activeFault; assert.equal(active?.kind, TAX13_FAULT_KIND);
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
  const receipt = ctx.artifact(`${ctx.next('sweep-disarmed')}.json`, { active, counts, identityMatched: true }, { kind: 'actual-Source13-Tax-required-FI-disarmed', operationId: active.operationId, writeFamily: active.key, primaryHits: counts.primary, fallbackHits: counts.fallback, exactOwnedControlsOnly: true });
  delete ctx.state.activeFault; ctx.persist();
  return { hitCount: counts.primary, fallbackHitCount: counts.fallback, sessionId: active.sessionId, key: active.key, receipt };
}
