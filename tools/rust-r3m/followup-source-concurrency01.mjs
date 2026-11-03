// Root executes the independently authored source-row race definitions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context03.mjs';
import {buildFollowUpConcurrencyBusinessPlan} from '../../tmp/rust-r3m/followup-concurrency-business01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});
ctx.addSource('tools/rust-r3m/followup-source-concurrency01.mjs');ctx.addSource('tmp/rust-r3m/followup-concurrency-business01.mjs');ctx.addSource('tmp/rust-r3m/foundation-business-regression01.mjs');
let completed=false,error=null;
try{
 const ids={raceMarker:'r3m-f-'+phase,actorUserId:ctx.ids.adminUserId,actorOrgId:ctx.ids.adminOrgId,otherUserId:ctx.ids.otherUserId,otherOrgId:ctx.ids.otherOrgId,followUpTypeCode:(await ctx.db.query("select code from poms.dictionary_item where domain='sales-follow-up-type' and status='active' order by sort_order,code limit 1")).rows[0].code,times:{occurredAt:'2026-11-03T00:00:00.000Z',replacementOccurredAt:'2026-11-03T01:00:00.000Z',nextFollowUpAt:'2027-02-01T00:00:00.000Z',replacementNextFollowUpAt:'2027-02-02T00:00:00.000Z'},fixtures:{}};
 for(const key of ['replace-replace','void-void','replace-void'])ids.fixtures[key]={customerId:ctx.ids.customerId,projectId:(await ctx.produceProject('F-race-'+key+'-'+phase)).id};
 const state={};
 const send=(label,request)=>ctx.step(label,request.method,request.path,{json:request.json,actor:request.actor,requestId:request.headers['x-request-id']});
 for(const definition of buildFollowUpConcurrencyBusinessPlan(ids).cases)await ctx.case(definition.name,async()=>{
  const producer=await send(definition.producer.name,definition.producer.request());definition.producer.assert(producer);state[definition.producer.name]=producer;
  const requests=definition.requests(state),lock=definition.sourceLock(state),sourceId=producer.body.id,projectId=definition.fixture.projectId;
  async function graph(){return{sales_follow_up_record:await ctx.rows('sales_follow_up_record',{project_id:projectId}),todo_item:await ctx.rows('todo_item',{target_object_type:'project',target_object_id:projectId})};}
  async function snapshot(){const value=await graph();value.audit_log=(await ctx.db.query('select * from poms.audit_log where target_id=$1 or request_id=any($2::text[]) order by id',[sourceId,requests.map(r=>r.headers['x-request-id'])])).rows;return value;}
  const beforeRows=await snapshot();await ctx.db.query('begin');let held=true,pending=[];
  try{
   const locked=await ctx.db.query(lock.sql,lock.params);assert.equal(locked.rows[0].id,sourceId);
   pending=requests.map((request,i)=>send(definition.name+'.contender'+i,request));
   let waiters=[];
   for(let i=0;i<120;i++){await ctx.db.query('select pg_stat_clear_snapshot()');waiters=(await ctx.db.query("select pid,wait_event_type,wait_event,query,pg_blocking_pids(pid) blockers from pg_stat_activity where datname=current_database() and usename='poms_r3m_app' and wait_event_type='Lock' and query ilike '%sales_follow_up_record%' and query ilike '%FOR UPDATE%' order by pid")).rows;if(waiters.length===2)break;await new Promise(r=>setTimeout(r,30));}
   assert.equal(waiters.length,2);assert(waiters.every(w=>w.blockers.length>0));
   await ctx.db.query('commit');held=false;
   const race={waitingBeforeRelease:waiters.length,waiters,responses:await Promise.all(pending)},afterRows=await snapshot(),evidence={lockTable:lock.table,lockSourceId:sourceId,sourceRowLockHeldUntilTwoWaiters:true,beforeRows,afterRows};
   await ctx.observe('F-race-actual-before-business-assert.'+definition.name,{requests,lock,race,evidence});
   const verified=definition.assert(race,state,evidence);
   return{producer,requests,lock,race,evidence,verified,allBusinessAssertionsPassed:true};
  }finally{if(held)await ctx.db.query('rollback');await Promise.allSettled(pending);}
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
