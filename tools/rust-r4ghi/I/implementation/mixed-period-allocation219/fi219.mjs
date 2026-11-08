// New external control installer. No old installFault/kind or monkeypatch.
import assert from 'node:assert/strict';
import{C219,sha219,derive219}from'./facts219.mjs';import{inventory219,fiInventory219}from'./inventory219.mjs';
import{verify219,verifyPackets219,verifyFIMapping219,json219,identity219,read219}from'./runtime219.mjs';
const identity=x=>sha219(JSON.stringify(x));
function names(ctx,table,event,suffix,deferred=false){const prefix=ctx.state.prefix+'_'+suffix;const c={table,event,deferred,function:prefix+'_fn',trigger:prefix+'_tg',sequence:prefix+'_hits'};for(const n of [c.function,c.trigger,c.sequence])assert(/^[a-z0-9_]+$/.test(n)&&n.length<=63);return c;}
async function inspect(ctx,c,h){return ctx.db(async db=>{
 const fn=(await db.query("SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1",[c.function])).rows;
 const trigger=(await db.query('SELECT oid::text,pg_get_triggerdef(oid,true) definition,tgenabled FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass',[c.trigger,'poms.'+c.table])).rows;
 const sequence=(await db.query("SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'",[c.sequence])).rows;
 assert.equal(fn.length,1);assert.equal(trigger.length,1);assert.equal(sequence.length,1);return {fn,trigger,sequence};
 });}
async function inspectOn(db,c){
 const fn=(await db.query("SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1",[c.function])).rows;
 const trigger=(await db.query('SELECT oid::text,pg_get_triggerdef(oid,true) definition,tgenabled FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass',[c.trigger,'poms.'+c.table])).rows;
 const sequence=(await db.query("SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'",[c.sequence])).rows;
 assert.equal(fn.length,1);assert.equal(trigger.length,1);assert.equal(sequence.length,1);return {fn,trigger,sequence};
}
async function create(db,ctx,c,selector,marker,h){
 const q=h.quote;assert(['primary','fallback'].includes(marker));assert.equal(ctx.owner,'poms_r0e_owner');
 await db.query(`CREATE SEQUENCE r4ghi_control.${q(c.sequence)} START 1 MINVALUE 1 NO CYCLE`);
 await db.query(`CREATE FUNCTION r4ghi_control.${q(c.function)}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r4ghi_219$
DECLARE j jsonb:=to_jsonb(NEW);
BEGIN
 IF current_user<>'poms_r0e_owner' THEN RAISE EXCEPTION 'Unexpected FI definer'; END IF;
 IF ${selector} THEN PERFORM nextval('r4ghi_control.${c.sequence}'::regclass); RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='r4ghi-219-${marker}'; END IF;
 RETURN NEW;
END; $r4ghi_219$`);
 await db.query(`REVOKE ALL ON FUNCTION r4ghi_control.${q(c.function)}() FROM PUBLIC`);await db.query(`GRANT EXECUTE ON FUNCTION r4ghi_control.${q(c.function)}() TO ${q(ctx.apps[1])}`);
 await db.query(`${c.deferred?'CREATE CONSTRAINT TRIGGER':'CREATE TRIGGER'} ${q(c.trigger)} ${c.deferred?'AFTER':'BEFORE'} ${c.event} ON poms.${q(c.table)}${c.deferred?' DEFERRABLE INITIALLY DEFERRED':''} FOR EACH ROW EXECUTE FUNCTION r4ghi_control.${q(c.function)}()`);
}
export async function install219(ctx,p,prepared,key,requestId,before,h){
 verify219(ctx,p,h);assert(!ctx.state.activeFault);assert(/^[a-zA-Z0-9_-]{1,100}$/.test(requestId));verifyPackets219(ctx,prepared);verifyFIMapping219(p,ctx.state.mixedPeriod219,prepared);
 const facts=derive219(ctx,before,prepared.body,prepared.packets,h.readRows,h);assert.deepEqual(facts,prepared.facts);const inventory=inventory219(facts);assert.deepEqual(inventory,prepared.inventory);
 assert.deepEqual(fiInventory219(facts,inventory),prepared.fiInventory);
 const selected=prepared.fiInventory.find(d=>d.key===key);assert(selected,'Only the exact actual derived required FI family is selectable');
 const scope={projectId:prepared.body.projectId,actorId:facts.actorId,actorKey:'manager'},sessionId=h.requireOwnedScope(ctx,before,scope),binding={requestId,sessionId};
 const suffix=ctx.next('a219').replaceAll('-','_'),primary=names(ctx,selected.table,selected.event,suffix+'_p',selected.deferred===true),fallback=names(ctx,'operating_command_receipt','INSERT',suffix+'_f',true);
 const final=inventory.find(d=>d.key==='A219-command-receipt');assert(final);assert(before.databases[ctx.database].tables[selected.table]);
 const active={kind:C219.kind,phase:'install-intent',key,requestId,sessionId,selected,before:before.manifest,runtimeIdentity:identity219(p),prepared:ctx.state.mixedPeriod219.prepared,primary,fallback};
 active.intent=ctx.artifact(ctx.next('a219-intent')+'.json',active);ctx.state.activeFault=active;ctx.persist();
 await ctx.db(async db=>{await db.query('BEGIN');try{
   await create(db,ctx,primary,h.efSelectorSql40(selected,binding),'primary',h);await create(db,ctx,fallback,h.efSelectorSql40(final,binding),'fallback',h);
   primary.identity=await inspectOn(db,primary);primary.identitySHA=identity(primary.identity);fallback.identity=await inspectOn(db,fallback);fallback.identitySHA=identity(fallback.identity);
   active.phase='commit-pending';ctx.persist();await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}});
 active.phase='installed';active.installed=ctx.artifact(ctx.next('a219-installed')+'.json',active);ctx.persist();return active;
}
export async function remove219(ctx,p,h){
 verify219(ctx,p,h,{allowOwnFault:true});const a=ctx.state.activeFault;assert.equal(a?.kind,C219.kind);assert.equal(a.phase,'installed');assert(a.installed&&a.primary.identitySHA&&a.fallback.identitySHA);
 const original=json219(a.installed),current={...a};delete current.installed;assert.deepEqual(current,original,'An installed control was not the original exact219 record');read219(a.intent);assert.deepEqual(a.runtimeIdentity,identity219(p));
 const result=await ctx.db(async db=>{await db.query('BEGIN');try{
   for(const c of [a.primary,a.fallback])assert.equal(identity(await inspectOn(db,c)),c.identitySHA,'Unchanged exact owned OID/definition/owner/ACL required before DROP');
   const counts={};for(const [name,c]of[['primary',a.primary],['fallback',a.fallback]]){const r=(await db.query(`SELECT last_value::text,is_called FROM r4ghi_control.${h.quote(c.sequence)}`)).rows[0];counts[name]=r.is_called?Number(r.last_value):0;assert(Number.isSafeInteger(counts[name]));await db.query(`DROP TRIGGER ${h.quote(c.trigger)} ON poms.${h.quote(c.table)}`);await db.query(`DROP FUNCTION r4ghi_control.${h.quote(c.function)}()`);await db.query(`DROP SEQUENCE r4ghi_control.${h.quote(c.sequence)}`);}
   await db.query('COMMIT');return counts;
 }catch(error){await db.query('ROLLBACK');throw error;}});
 const proof=ctx.artifact(ctx.next('a219-disarmed')+'.json',{kind:'actual-external-allocation219-exact-controls-disarmed',active:a,counts:result,identityMatched:true});delete ctx.state.activeFault;ctx.persist();
 return {kind:C219.kind,hitCount:result.primary,fallbackHitCount:result.fallback,key:a.key,sessionId:a.sessionId,receipt:proof};
}
