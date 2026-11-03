// Root verifies serialization of empty streams, owner separation and rollback lock release.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context03.mjs';
import {buildFoundationFollowUpRequest} from '../../tmp/rust-r3m/foundation-business-regression01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});ctx.addSource('tools/rust-r3m/followup-empty-stream01.mjs');ctx.addSource('tmp/rust-r3m/foundation-business-regression01.mjs');let completed=false,error=null;
const ids={marker:'F-stream-'+phase,actorUserId:ctx.ids.adminUserId,actorOrgId:ctx.ids.adminOrgId,otherUserId:ctx.ids.otherUserId,otherOrgId:ctx.ids.otherOrgId,followUpTypeCode:(await ctx.db.query("select code from poms.dictionary_item where domain='sales-follow-up-type' and status='active' order by sort_order,code limit 1")).rows[0].code,times:{occurredAt:'2026-11-03T00:00:00.000Z',nextFollowUpAt:'2027-02-01T00:00:00.000Z'}};
async function graph(){const out={};for(const table of ['sales_follow_up_record','todo_item','audit_log'])out[table]=(await ctx.db.query('select to_jsonb(t)::text raw from poms.'+table+' t order by id')).rows.map(x=>x.raw);return out;}
try{
 for(const [type,differentOwners]of [['project',false],['lead',false],['customer',false],['project',true]])await ctx.case('F-empty-serialized.'+type+'.'+(differentOwners?'different-owners':'same-owner'),async()=>{
  const customer=type==='customer'?await ctx.produceCustomer('empty-customer-'+phase):{id:ctx.ids.customerId},target=type==='project'?await ctx.produceProject('empty-project-'+differentOwners+'-'+phase,customer.id):type==='lead'?await ctx.produceLead('empty-lead-'+phase):customer;
  const request=i=>{const other=differentOwners&&i===1;return{actor:i===0?'admin':'other',json:buildFoundationFollowUpRequest(customer.id,type==='project'?target.id:undefined,ids,{...(type==='lead'?{leadId:target.id}:{}),summary:'serialized-'+phase+'-'+type+'-'+i,ownerUserId:other?ctx.ids.otherUserId:ctx.ids.adminUserId,ownerOrgId:other?ctx.ids.otherOrgId:ctx.ids.adminOrgId})};};
  const before=await ctx.rows('todo_item',{target_object_type:type,target_object_id:target.id});assert.equal(before.length,0);
  await ctx.db.query('begin');let held=true,pending=[];
  try{
   await ctx.db.query('lock table poms.todo_item in share mode');const requests=[request(0),request(1)];pending=requests.map((r,i)=>ctx.step('F.stream.'+type+'.'+differentOwners+'.'+i,'POST','/api/sales-follow-up-records',r));
   let waiters=[];for(let i=0;i<120;i++){await ctx.db.query('select pg_stat_clear_snapshot()');waiters=(await ctx.db.query("select pid,query,wait_event_type,wait_event,pg_blocking_pids(pid) blockers from pg_stat_activity where datname=current_database() and usename='poms_r3m_app' and wait_event_type='Lock' and ((query ilike '%todo_item%' and query ilike '%INSERT%') or query ilike '%pg_advisory_xact_lock%') order by pid")).rows;if(waiters.length>=2)break;await new Promise(r=>setTimeout(r,30));}
   assert.equal(waiters.length,2);assert.equal(waiters.filter(w=>w.query.includes('pg_advisory_xact_lock')).length,1);assert.equal(waiters.filter(w=>w.query.toLowerCase().includes('insert into poms.todo_item')).length,1);
   await ctx.db.query('commit');held=false;const responses=await Promise.all(pending),todos=await ctx.rows('todo_item',{target_object_type:type,target_object_id:target.id}),records=await Promise.all(responses.map(r=>ctx.row('sales_follow_up_record',r.body.id))),active=todos.filter(t=>['open','processing'].includes(t.status));
   const evidence={type,differentOwners,customer,target,before,requests,waiters,responses,todos,records,activeCount:active.length};await ctx.observe('F-serialized-actual-before-assert.'+type+'.'+differentOwners,evidence);
   assert.deepEqual(responses.map(r=>r.status),[201,201]);assert.equal(records.length,2);assert(records.every(r=>r.status==='active'));assert.equal(todos.length,2);assert.equal(active.length,differentOwners?2:1);
   if(differentOwners)assert.equal(new Set(active.map(t=>t.assignee_user_id)).size,2);else{const prior=todos.filter(t=>t.status==='completed');assert.equal(prior.length,1);assert.equal(prior[0].row_version,2);assert(prior[0].completed_at);assert.equal(active[0].row_version,1);assert.notEqual(prior[0].source_id,active[0].source_id);}
   return{...evidence,allBusinessAssertionsPassed:true};
  }finally{if(held)await ctx.db.query('rollback');await Promise.allSettled(pending);}
 });
 for(const table of ['todo_item','sales_follow_up_record'])await ctx.case('F-stream-necessary-write-fault.'+table,async()=>{
  const project=await ctx.produceProject('stream-fault-'+table+'-'+phase),json=buildFoundationFollowUpRequest(ctx.ids.customerId,project.id,ids),before=await graph();
  assert.equal((await ctx.db.query("select has_table_privilege('poms_r3m_app',$1,'INSERT') allowed",['poms.'+table])).rows[0].allowed,true);await ctx.db.query('revoke INSERT on poms.'+table+' from poms_r3m_app');let response;
  try{response=await ctx.step('F.stream.fault.'+table,'POST','/api/sales-follow-up-records',{json},500);}finally{await ctx.db.query('grant INSERT on poms.'+table+' to poms_r3m_app');}
  const after=await graph();assert.deepEqual(after,before);const recovered=await ctx.step('F.stream.after-rollback.'+table,'POST','/api/sales-follow-up-records',{json},201),todos=await ctx.rows('todo_item',{target_object_type:'project',target_object_id:project.id});assert.equal(todos.filter(t=>t.status==='open').length,1);assert.equal(todos[0].source_id,recovered.body.id);
  return{table,before,response,after,recovered,todos,wholeBusinessRollback:true,transactionLockReleasedAfterRollback:true};
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
