// Root alone executes real version chains, locked races and required-write faults.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context01.mjs';
import {buildVersionBusinessRegressionPlan,buildVersionCostRequest,buildVersionBidRequest,buildVersionPricingRequest,versionBusinessFamilies} from '../../tmp/rust-r3hijk/version-business-regression01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});
ctx.addSource('tools/rust-r3hijk/version-business01.mjs');ctx.addSource('tmp/rust-r3hijk/version-business-regression01.mjs');
let completed=false,error=null;
const tables=[...new Set(['project',...Object.values(versionBusinessFamilies).flatMap(f=>[f.table,...f.children.map(c=>c.table)])])];
async function snapshot(names){const result={};for(const table of names){assert(tables.includes(table));result[table]=(await ctx.db.query('select to_jsonb(t)::text raw from poms.'+table+' t order by id')).rows.map(x=>x.raw);}return result;}
const send=(label,request)=>ctx.step(label,request.method,request.path,{actor:request.actor||'admin',...(Object.hasOwn(request,'json')?{json:request.json}:{})});
try{
 let ids;
 await ctx.case('V-real-parent-child-producers',async()=>{
  const project=await ctx.produceProject('version-chain-'+phase),marker='hijkV-'+phase;
  const cost=await ctx.step('V.producer.cost','POST','/api/projects/'+project.id+'/technical-cost-packages',{json:buildVersionCostRequest(marker+'-seed-cost')},201);
  const bid=await ctx.step('V.producer.bid','POST','/api/projects/'+project.id+'/bid-commercial-processes',{json:buildVersionBidRequest(project.id,marker+'-seed-bid')},201);
  const pricing=await ctx.step('V.producer.pricing','POST','/api/projects/'+project.id+'/pricing-margin-reviews',{json:buildVersionPricingRequest(cost.body.id,bid.body.id,marker+'-seed-pricing')},201);
  ids={projectId:project.id,marker,actorUserId:ctx.ids.adminUserId,otherUserId:ctx.ids.otherUserId,staleCostId:cost.body.id,staleBidId:bid.body.id};
  return{project,cost,bid,pricing,allActualHTTPProducers:true};
 });
 const state={},plan=buildVersionBusinessRegressionPlan(ids);
 assert.equal(plan.cases.length,16);
 for(const definition of plan.cases)await ctx.case(definition.name,async()=>{
  const observation=definition.observation||{},beforeRows=await snapshot(observation.beforeRows||[]);
  let exchange,evidence={beforeRows};
  if(definition.kind==='concurrent'){
   const requests=definition.requests(state),projectId=definition.lock.projectId;
   assert(ctx.ownedIds.has(projectId));await ctx.db.query('begin');let held=true,pending=[];
   try{
    const lockRow=(await ctx.db.query('select id from poms.project where id=$1 for update',[projectId])).rows;assert.equal(lockRow.length,1);
    pending=requests.map((request,i)=>send(definition.name+'.'+i,request));let waiters=[];
    for(let i=0;i<120;i++){await ctx.db.query('select pg_stat_clear_snapshot()');waiters=(await ctx.db.query("select pid,query,wait_event_type,wait_event,pg_blocking_pids(pid) blockers from pg_stat_activity where datname=current_database() and usename='poms_r3hijk_app' and wait_event_type='Lock' and query ilike '%poms.project%' and query ilike '%FOR UPDATE%' order by pid")).rows;if(waiters.length>=2)break;await new Promise(r=>setTimeout(r,30));}
    assert.equal(waiters.length,2);assert(waiters.every(w=>w.blockers.length>0));
    await ctx.db.query('commit');held=false;exchange=await Promise.all(pending);
    evidence={...evidence,lock:{table:'project',projectId,waitingBeforeRelease:waiters.length,released:true,waiters}};
   }finally{if(held)await ctx.db.query('rollback');await Promise.allSettled(pending);}
  }else if(definition.kind==='fault'){
   const {table,privilege}=definition.fault;assert(tables.includes(table)&&table!=='project'&&privilege==='INSERT');
   assert.equal((await ctx.db.query("select has_table_privilege('poms_r3hijk_app',$1,$2) allowed",['poms.'+table,privilege])).rows[0].allowed,true);
   await ctx.db.query('revoke INSERT on poms.'+table+' from poms_r3hijk_app');
   try{exchange=await send(definition.name,definition.request(state));}finally{await ctx.db.query('grant INSERT on poms.'+table+' to poms_r3hijk_app');}
  }else exchange=await send(definition.name,definition.request(state));
  evidence.afterRows=await snapshot(observation.afterRows||[]);
  if(definition.kind==='concurrent'){
   evidence.historyResponse=await send(definition.name+'.history',observation.historyRequest);
   evidence.workspaceResponse=await send(definition.name+'.workspace',observation.workspaceRequest);
  }
  await ctx.observe('V-actual-before-business-assert.'+definition.name,{kind:definition.kind,exchange,evidence});
  definition.assert(exchange,state,evidence);state[definition.name]=exchange;
  return{kind:definition.kind,operationId:definition.operationId,exchange,evidence,allBusinessAssertionsPassed:true};
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
