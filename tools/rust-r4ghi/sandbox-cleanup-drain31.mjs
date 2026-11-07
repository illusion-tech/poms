import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createContext} from './business/context.mjs';
import {capture,loadSnapshot,readRows} from './business/snapshot.mjs';
import {sha} from './business/pure.mjs';
const ctx=createContext({epoch:'g2-business08',run:'main01'}),lock=ctx.priv+'/driver.lock';
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'TEMP-only-deferred-trigger-drain-sandbox31'})+'\n',{flag:'wx',mode:0o600});
const label=ctx.next('cleanup-drain31');ctx.persist();
function exact(a,b){for(const d of ctx.databases){assert.deepEqual(a.databases[d].meta,b.databases[d].meta);assert.deepEqual(a.objects[d],b.objects[d]);for(const t of Object.keys(a.databases[d].tables))assert.deepEqual(readRows(a.databases[d].tables[t]).map(r=>[r.key,r.sha256,r.xmin]),readRows(b.databases[d].tables[t]).map(r=>[r.key,r.sha256,r.xmin]));}}
try{
 const plan=JSON.parse(fs.readFileSync(ctx.state.cleanupPlan.file));
 const before=await capture(ctx,label+'-before');exact(loadSnapshot(ctx,plan.current),before);
 const cases=[];
 await ctx.db(async c=>{
  await c.query('BEGIN');
  try{
   await c.query('CREATE TEMP TABLE drain31_parent(id integer PRIMARY KEY) ON COMMIT DROP');
   await c.query('CREATE TEMP TABLE drain31_child(id integer PRIMARY KEY,parent_id integer NOT NULL REFERENCES drain31_parent(id) DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP');
   await c.query("CREATE FUNCTION pg_temp.drain31_frozen() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''TEMP frozen guard''; END'");
   await c.query("CREATE FUNCTION pg_temp.drain31_pending() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN OLD; END'");
   await c.query('CREATE TRIGGER drain31_frozen BEFORE DELETE ON drain31_child FOR EACH ROW EXECUTE FUNCTION pg_temp.drain31_frozen()');
   await c.query('CREATE CONSTRAINT TRIGGER drain31_pending AFTER DELETE ON drain31_child DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pg_temp.drain31_pending()');
   await c.query('INSERT INTO drain31_parent VALUES(1)');await c.query('INSERT INTO drain31_child VALUES(1,1)');
   await c.query('SET CONSTRAINTS ALL IMMEDIATE');await c.query('SET CONSTRAINTS ALL DEFERRED');
   const command='WITH dc AS (DELETE FROM drain31_child WHERE id=$1 RETURNING id),dp AS (DELETE FROM drain31_parent WHERE id=$1 RETURNING id) SELECT (SELECT count(*) FROM dc)::int child,(SELECT count(*) FROM dp)::int parent';
   for(const drain of [false,true]){
    await c.query('SAVEPOINT scenario');let state=null,observed=null;
    try{await c.query('ALTER TABLE drain31_child DISABLE TRIGGER drain31_frozen');
     assert.deepEqual((await c.query(command,[1])).rows,[{child:1,parent:1}]);
     if(drain)await c.query('SET CONSTRAINTS ALL IMMEDIATE');
     await c.query('ALTER TABLE drain31_child ENABLE TRIGGER drain31_frozen');
     observed=(await c.query("SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid='pg_temp.drain31_child'::regclass ORDER BY tgname")).rows;
     assert(observed.every(t=>t.tgenabled==='O'));
    }catch(e){state=e.code;ctx.artifact(label+'-'+(drain?'drained':'original')+'-failure.json',{name:e.name,message:e.message,code:e.code});}
    assert.equal(state,drain?null:'55006');
    await c.query('ROLLBACK TO SAVEPOINT scenario');await c.query('RELEASE SAVEPOINT scenario');
    assert.deepEqual((await c.query('SELECT (SELECT count(*) FROM drain31_parent)::int parent,(SELECT count(*) FROM drain31_child)::int child')).rows,[{parent:1,child:1}]);
    cases.push({drain,sqlState:state,guardRestored:drain,allSystemFKTriggersEnabled:drain,caseRolledBack:true});
   }
   await c.query('SAVEPOINT foreign_violation');let violation=null;
   try{await c.query('DELETE FROM drain31_parent WHERE id=1');await c.query('SET CONSTRAINTS ALL IMMEDIATE');}catch(e){violation=e.code;}
   assert.equal(violation,'23503');await c.query('ROLLBACK TO SAVEPOINT foreign_violation');await c.query('RELEASE SAVEPOINT foreign_violation');
   cases.push({name:'drain-enforces-real-deferrable-FK',sqlState:violation,violationRejected:true,caseRolledBack:true});
  }finally{await c.query('ROLLBACK');}
  assert.deepEqual((await c.query("SELECT to_regclass('pg_temp.drain31_parent')::text parent,to_regclass('pg_temp.drain31_child')::text child")).rows,[{parent:null,child:null}]);
 });
 const after=await capture(ctx,label+'-after');exact(before,after);
 const result={kind:'actual-PG15-TEMP-only-deferred-trigger-drain-sandbox',cases,allTEMPObjectsRolledBack:true,businessRowsAndXminUnchanged:true,catalogAndSequencesUnchanged:true,objectsUnchanged:true,
  priorFailedCleanupRolledBackExactly:true,originalPlanSHA256:ctx.state.cleanupPlan.rawBytesSha256,before:before.manifest,after:after.manifest,
  documentation:'https://www.postgresql.org/docs/15/sql-set-constraints.html',productAcceptance:false};
 const receipt=ctx.artifact(label+'-result.json',result,{kind:result.kind,cases,priorFailedCleanupRolledBackExactly:true,businessRowsChanged:false,G3Certified:false});
 ctx.state.constraintDrainSandbox=receipt;ctx.persist();
 console.log(JSON.stringify({receipt,allAssertionsPassed:true,priorFailedCleanupRolledBackExactly:true}));
}catch(e){ctx.artifact(label+'-partial.json',{name:e.name,message:e.message,stack:e.stack});console.error(JSON.stringify({status:'failed',label,rawPreserved:true}));process.exitCode=1;}
finally{ctx.persist();assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
