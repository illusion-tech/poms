// Root probes two valid new facts racing on one initially empty owner/target stream.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context01.mjs';
import {buildFoundationFollowUpRequest} from '../../tmp/rust-r3hijk/foundation-business-regression01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});ctx.addSource('tools/rust-r3hijk/followup-empty-stream01.mjs');ctx.addSource('tmp/rust-r3hijk/foundation-business-regression01.mjs');let completed=false,error=null;
try{await ctx.case('F-two-new-facts-one-empty-reminder-stream',async()=>{
 const project=await ctx.produceProject('F-empty-stream-'+phase),ids={marker:'F-empty-'+phase,actorUserId:ctx.ids.adminUserId,actorOrgId:ctx.ids.adminOrgId,otherUserId:ctx.ids.otherUserId,otherOrgId:ctx.ids.otherOrgId,followUpTypeCode:(await ctx.db.query("select code from poms.dictionary_item where domain='sales-follow-up-type' and status='active' order by sort_order,code limit 1")).rows[0].code,times:{occurredAt:'2026-11-03T00:00:00.000Z',nextFollowUpAt:'2027-02-01T00:00:00.000Z'}};
 const before=await ctx.rows('todo_item',{target_object_type:'project',target_object_id:project.id});assert.equal(before.length,0);
 await ctx.db.query('begin');let held=true,pending=[];
 try{
  await ctx.db.query('lock table poms.todo_item in share mode');
  const requests=['admin','other'].map((actor,i)=>({actor,json:buildFoundationFollowUpRequest(ctx.ids.customerId,project.id,ids,{summary:'F-empty-'+phase+'-'+i,ownerUserId:ctx.ids.adminUserId,ownerOrgId:ctx.ids.adminOrgId})}));
  pending=requests.map((r,i)=>ctx.step('F.empty.create.'+i,'POST','/api/sales-follow-up-records',r));
  let waiters=[];for(let i=0;i<120;i++){await ctx.db.query('select pg_stat_clear_snapshot()');waiters=(await ctx.db.query("select pid,query,wait_event_type,wait_event,pg_blocking_pids(pid) blockers from pg_stat_activity where datname=current_database() and usename='poms_r3hijk_app' and wait_event_type='Lock' and query ilike '%todo_item%' and query ilike '%INSERT%' order by pid")).rows;if(waiters.length>=2)break;await new Promise(r=>setTimeout(r,30));}
  assert.equal(waiters.length,2);await ctx.db.query('commit');held=false;
  const responses=await Promise.all(pending),records=await ctx.rows('sales_follow_up_record',{project_id:project.id}),todos=await ctx.rows('todo_item',{target_object_type:'project',target_object_id:project.id}),active=todos.filter(x=>['open','processing'].includes(x.status));
  const observed={project,requests,before,waiters,responses,records,todos,activeCount:active.length};await ctx.observe('F-empty-stream-actual-before-business-assert',observed);
  assert.deepEqual(responses.map(r=>r.status),[201,201]);assert.equal(records.length,2);assert.equal(active.length,1,'An owner/target stream must have exactly one current reminder');return observed;
 }finally{if(held)await ctx.db.query('rollback');await Promise.allSettled(pending);}
});completed=true;}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
