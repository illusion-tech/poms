// Root produces all J/K prerequisite entities through delivered real APIs.
import fs from'node:fs';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{openAcceptanceContext}from'./acceptance-context01.mjs';import{addActor}from'./fixture-actor03.mjs';import*as plan from'../../tmp/rust-r3hijk/d-business-g2-definitions/index.mjs';
const[backend,tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend,tag,phase,runId});ctx.addSource('tools/rust-r3hijk/jk-setup04.mjs');ctx.addSource('tools/rust-r3hijk/fixture-actor03.mjs');for(const name of['index','discussion-plan','guidance-plan','timeline-plan','prepared-facts'])ctx.addSource('tmp/rust-r3hijk/d-business-g2-definitions/'+name+'.mjs');let completed=false,error=null;
const ids=plan.adaptRootIds({ids:ctx.ids,runId:ctx.runId},{runTag:ctx.runId.slice(0,18),missingUuid:randomUUID(),guidanceProjects:{},factIds:{},orderCommentIds:[]});
function capture(key,value){const path=key.split('.');let p=ids;for(const k of path.slice(0,-1))p=p[k]??={};p[path.at(-1)]=value;}
async function call(r){const response=await ctx.step(r.id,r.method,r.path,{...(r.body!==undefined?{json:r.body}:{}),actor:'admin'},r.expect?.status);if(r.captureIdAs)capture(r.captureIdAs,response.body.id);if(r.captureReceiptAs)capture(r.captureReceiptAs,response.body);if(r.expect?.captureCommentAs)capture(r.expect.captureCommentAs,response.body.id);return response;}
async function project(role,customer=ids.customerA){const p=await ctx.produceProject('D-'+role,customer);ids[role]=p.id;if(role==='projectRename')ids.projectRenameOriginalName=p.projectName;return p;}
try{
 await ctx.case('JK-all-real-prerequisite-producers',async()=>{
  ids.customerB=(await ctx.produceCustomer('D-customerB')).id;ids.customerEmpty=(await ctx.produceCustomer('D-customerEmpty')).id;
  ids.leadSameCustomerOther=(await ctx.produceLead('D-same-customer')).id;
  ids.leadOtherCustomer=(await ctx.produceLead('D-other-customer',{customerId:ids.customerB})).id;
  ids.leadClosed=(await ctx.produceLead('D-closed')).id;await ctx.step('D.producer.close','POST','/api/leads/'+ids.leadClosed+':close',{json:ctx.build.closeLeadRequest()},200);
  for(const role of['projectSameCustomerOther','projectRename','projectUnusedForRace','projectOrder','projectFkFailure','projectNullCustomer','projectGuidance','projectTimeline'])await project(role);
  const nullBefore=await ctx.row('project',ids.projectNullCustomer);await ctx.prepare('project',ids.projectNullCustomer,{customer_id:null});await ctx.db.query('update poms.project set customer_name=NULL where id=$1::uuid',[ids.projectNullCustomer]);ctx.preparedFacts.push({kind:'owned-legacy-nullable-project-read-context-not-H-producer',before:nullBefore,after:await ctx.row('project',ids.projectNullCustomer)});
  for(const[role,customer]of[['contactInactiveA',ids.customerA],['contactOtherCustomer',ids.customerB],['contactFkDisposable',ids.customerA]])ids[role]=(await ctx.produceContact(customer,'D-'+role)).id;
  ids.followUpType=(await ctx.db.query("select code from poms.dictionary_item where domain='sales-follow-up-type' and status='active' order by sort_order,code limit 1")).rows[0].code;
  for(const r of plan.buildAssociationProducerRequests(ids))await call(r);
  for(const r of plan.buildHistoricalProducerRequests(ids)){const response=await call(r);if(r.id==='D.producer.replace-followup'){ids.followUpSupersededA=ids.followUpForReplaceReceipt.id;ids.followUpReplacementReceipt=response.body;}}
  for(const r of plan.buildStageProducerRequests(ids))await call(r);
  ids.projectGuidanceRow=(await ctx.db.query('select to_jsonb(t) row from poms.project t where id=$1::uuid',[ids.projectGuidance])).rows[0].row;
  ids.projectTimelineRow=(await ctx.db.query('select to_jsonb(t) row from poms.project t where id=$1::uuid',[ids.projectTimeline])).rows[0].row;
  ids.operatorDisplayName=(await ctx.row('platform_user',ids.operatorUserId)).display_name;ids.operatorOrgName=(await ctx.row('org_unit',ids.operatorOrgId)).name;
  ids.emptyUserId=(await addActor(ctx,'emptyReadContext',['project:read'])).userId;
  for(const[role,keys]of Object.entries(plan.permissionSets))if(role!=='admin')await addActor(ctx,'d_'+role,keys);
  for(const r of plan.buildCommentOrderCases(ids)[0].requests)await call(r);
  for(const role of plan.preparedFactIdRoles){ids.factIds[role]=randomUUID();ctx.ownedIds.add(ids.factIds[role]);}
  assert.deepEqual(plan.missingBindings(ids),[]);ctx.ids.jk=ids;ctx.saveContext();return{ids,allCustomerLeadContactOpportunityFollowUpProjectReferencesActualHTTP:true,projectionUUIDsAllocatedOnly:true};
 });completed=true;
}catch(e){error={name:e.name,message:e.message};ctx.ids.jk=ids;fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({...error,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
