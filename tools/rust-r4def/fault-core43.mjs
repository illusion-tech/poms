// Root-only fault probes. Each fault is proven reached with a PostgreSQL advisory barrier.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{connect,priv,win}from'./db33.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export async function createFaultHarness43(h,edition='43') {
 assert(/^\d+$/.test(edition));const out=win+'/tmp/rust-r4def/root/fault'+edition;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
 const ctrl=await connect(),observe=await connect(),actors=JSON.parse(fs.readFileSync(priv+'/actors33.json')).actors;
 const{rows:tables}=await observe.query("SELECT table_name FROM information_schema.tables WHERE table_schema='poms' AND table_type='BASE TABLE' ORDER BY table_name");assert.equal(tables.length,120);const names=tables.map(x=>x.table_name);let sequence=0;
 const functionName='r4def_fault_'+edition;assert.equal((await ctrl.query('SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2',['r4def_control',functionName])).rows.length,0);
 await ctrl.query(`CREATE FUNCTION r4def_control.${functionName}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_advisory_xact_lock(194043,TG_ARGV[0]::integer); RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='r4def${edition} necessary write fault'; END $f$`);
 const results=[];
 async function snapshot(label){assert(/^[a-z0-9-]+$/.test(label));await observe.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');const graph={},summary=[];try{for(const table of names){assert(/^[a-z][a-z0-9_]*$/.test(table));const{rows}=await observe.query(`SELECT to_jsonb(t)::text value FROM poms."${table}" t ORDER BY to_jsonb(t)::text COLLATE "C"`);graph[table]=rows.map(r=>r.value);summary.push({table,count:rows.length,sha256:sha(JSON.stringify(graph[table]))});}await observe.query('COMMIT')}catch(e){await observe.query('ROLLBACK');throw e}
  const folder=priv+'/fault'+edition;fs.mkdirSync(folder,{recursive:true,mode:0o700});fs.writeFileSync(folder+'/'+label+'.json',JSON.stringify(graph)+'\n',{flag:'wx',mode:0o600});fs.writeFileSync(out+'/'+label+'.json',JSON.stringify({kind:'actual-120-table-read-only-digests',summary,privateRawRowsPreserved:true},null,2)+'\n',{flag:'wx'});return{graph,summary};}
 async function probe(operationId,id,body,actor,tablesToFail){for(const table of tablesToFail){assert(names.includes(table));const n=++sequence,key=Number(edition)*1000+n,tag=`p${n}-${table.replaceAll('_','-')}`,trigger='r4def_fault_'+edition;const seed=actors[actor.key??actor];assert(seed,'Only recorded owned actors may run fault probes');await h.login(seed);
  const before=await snapshot(tag+'-before');let armed=false,held=false,pending=null,response=null,waiter=null;
  try{
   await ctrl.query(`CREATE TRIGGER ${trigger} BEFORE INSERT OR UPDATE ON poms."${table}" FOR EACH ROW EXECUTE FUNCTION r4def_control.${functionName}('${key}')`);armed=true;
   await ctrl.query('SELECT pg_advisory_lock(194043,$1::integer)',[key]);held=true;
   pending=h.request(operationId,id,body,actor).then(r=>{response=r;return r});
   for(let tick=0;tick<200&&!waiter&&!response;tick++){const{rows}=await observe.query("SELECT a.pid,a.query,a.wait_event,a.wait_event_type,l.classid::text,l.objid::text,l.granted FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND l.classid=194043 AND l.objid=$1::oid AND NOT l.granted AND a.datname=current_database() AND a.usename='poms_r4def_rust_app'",[key]);if(rows.length){assert.equal(rows.length,1);waiter=rows[0];break;}await new Promise(r=>setTimeout(r,25));}
   assert(waiter,`Fault point not reached: ${table}; response ${response?.status}`);
   const blocked=await snapshot(tag+'-blocked');assert.deepEqual(blocked.graph,before.graph,'Pre-fault business state must be invisible while transaction is blocked');
   await ctrl.query('SELECT pg_advisory_unlock(194043,$1::integer)',[key]);held=false;
   response=await pending;assert.equal(response.status,500,response.receiptId);
   await ctrl.query(`DROP TRIGGER ${trigger} ON poms."${table}"`);armed=false;
   const after=await snapshot(tag+'-after');assert.deepEqual(after.graph,before.graph,`All 120 tables must roll back at ${table}`);
   const result={operationId,table,barrierWaiter:waiter,status:response.status,receiptId:response.receiptId,hitProven:true,all120TablesRolledBack:true,retryPending:true};results.push(result);fs.writeFileSync(out+'/'+tag+'-receipt.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  }finally{if(held)await ctrl.query('SELECT pg_advisory_unlock(194043,$1::integer)',[key]);if(pending&&!response)await pending;if(armed)await ctrl.query(`DROP TRIGGER ${trigger} ON poms."${table}"`);}
 }}
 async function recordRetry(operationId,receipt){assert(receipt.status>=200&&receipt.status<300);for(const r of results.filter(x=>x.operationId===operationId&&x.retryPending)){r.retryPending=false;r.successfulUnarmedRetryReceiptId=receipt.receiptId;}fs.writeFileSync(out+'/current-summary.json',JSON.stringify({faults:results.length,results},null,2)+'\n');}
 async function close(){await ctrl.query(`DROP FUNCTION r4def_control.${functionName}()`);await observe.end();await ctrl.end();fs.writeFileSync(out+'/final-summary.json',JSON.stringify({kind:'actual-advisory-barrier-fault-probes',results,faults:results.length,allHitProven:results.every(x=>x.hitProven),all120TablesRolledBack:results.every(x=>x.all120TablesRolledBack),allSameCommandRetryAcknowledged:results.every(x=>!x.retryPending),temporaryObjectsRemoved:true},null,2)+'\n',{flag:'wx'});}
 return{probe,recordRetry,close,snapshot,results};
}
