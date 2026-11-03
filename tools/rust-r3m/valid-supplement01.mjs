// Root fills the exact remaining successful route receipts, with committed facts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { openAcceptanceContext } from './acceptance-context03.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});ctx.addSource('tools/rust-r3m/valid-supplement01.mjs');let completed=false,error=null;
try {
  await ctx.case('valid.public-pool-claim-assignment-close-and-read',async()=>{
    const created=await ctx.step('valid.pool.create','POST','/api/leads',{json:ctx.build.publicPoolLeadRequest(ctx.ids.customerId,ctx.ids.sourceCode,{leadName:'R3CO valid pool '+phase})},201),id=created.body.id;
    assert.equal(created.body.ownerUserId,null);
    const claimed=await ctx.step('valid.pool.claim','POST','/api/leads/'+id+':claim',{json:ctx.build.claimLeadRequest(created.body.rowVersion)},200);assert.equal(claimed.body.ownerUserId,ctx.ids.adminUserId);
    const assigned=await ctx.step('valid.pool.assign','POST','/api/leads/'+id+':assignOwner',{json:ctx.build.assignLeadRequest(ctx.ids.otherUserId,claimed.body.rowVersion,{ownerOrgId:ctx.ids.otherOrgId})},200);assert.equal(assigned.body.ownerUserId,ctx.ids.otherUserId);
    const closed=await ctx.step('valid.pool.close','POST','/api/leads/'+id+':close',{json:ctx.build.closeLeadRequest()},200);assert.equal(closed.body.status,'closed');
    const read=await ctx.step('valid.pool.detail','GET','/api/leads/'+id,{},200);assert.equal(read.body.id,id);assert.equal(read.body.status,'closed');assert.equal(read.body.ownerUserId,ctx.ids.otherUserId);
    const query=new URLSearchParams(ctx.build.leadListQuery({pageSize:'100',customerId:ctx.ids.customerId})).toString(),list=await ctx.step('valid.lead.list','GET','/api/leads?'+query,{},200);assert(Array.isArray(list.body.items));assert(list.body.items.some(x=>x.id===id));
    const history=await ctx.step('valid.pool.history','GET','/api/leads/'+id+'/score-history',{},200);assert.equal(history.body.leadId,id);assert(history.body.snapshots.length>=1);
    const row=await ctx.row('lead',id);assert(row && row.status==='closed' && row.owner_user_id===ctx.ids.otherUserId);const assignments=await ctx.rows('lead_owner_assignment_record',{lead_id:id});assert.equal(assignments.length,2);
    return{created,claimed,assigned,closed,read,list,history,row,assignments,nonemptyRealFacts:true};
  });
  await ctx.case('valid.override-reject-and-revoke-lifecycle',async()=>{
    const lead=await ctx.produceLead('valid-decisions'),first=await ctx.step('valid.reject.submit','POST','/api/leads/'+lead.id+'/score-overrides',{json:ctx.build.submitScoreOverrideRequest(lead.rowVersion)},201),rejected=await ctx.step('valid.reject','POST','/api/lead-score-overrides/'+first.body.id+':reject',{json:ctx.build.rejectScoreOverrideRequest(first.body.rowVersion)},200);assert.equal(rejected.body.status,'rejected');
    const current=await ctx.row('lead',lead.id),second=await ctx.step('valid.revoke.submit','POST','/api/leads/'+lead.id+'/score-overrides',{json:ctx.build.submitScoreOverrideRequest(current.row_version)},201),approved=await ctx.step('valid.revoke.approve','POST','/api/lead-score-overrides/'+second.body.id+':approve',{json:ctx.build.approveScoreOverrideRequest(second.body.rowVersion)},200),revoked=await ctx.step('valid.revoke','POST','/api/lead-score-overrides/'+second.body.id+':revoke',{json:ctx.build.revokeScoreOverrideRequest(approved.body.rowVersion)},200);assert.equal(revoked.body.status,'revoked');
    const history=await ctx.step('valid.revoke.history','GET','/api/leads/'+lead.id+'/score-history',{},200);assert.equal(history.body.effectiveScoreSource,'system');assert.equal(history.body.activeOverride,null);assert(history.body.overrides.some(x=>x.id===first.body.id&&x.status==='rejected'));assert(history.body.overrides.some(x=>x.id===second.body.id&&x.status==='revoked'));assert(history.body.snapshots.some(x=>x.snapshotKind==='override-revoked'));
    return{lead,first,rejected,second,approved,revoked,history,allStatesActuallyCommitted:true};
  });
  const integration=ctx.ids.integration;assert(integration && integration.leadId);
  for(const spec of [
    {table:'competitor_intelligence_record',path:'/api/competitor-intelligence-records',id:integration.competitorId,build:()=>ctx.build.buildCompetitorUpdate({},'R3CO actual revised'),field:'competitor_name',wire:'competitorName'},
    {table:'sales_discovery_record',path:'/api/sales-discovery-records',id:null,build:()=>ctx.build.buildDiscoveryUpdate({},'R3CO actual revised'),field:'procurement_process',wire:'procurementProcess'},
  ])await ctx.case('valid.'+spec.table+'-changed-update-and-nonempty-list',async()=>{
    const source=spec.id?await ctx.row(spec.table,spec.id):(await ctx.rows(spec.table,{lead_id:integration.leadId}))[0];assert(source&&source.id);
    const beforeLead=await ctx.row('lead',integration.leadId),input=spec.build(),response=await ctx.step('valid.'+spec.table+'.PATCH','PATCH',spec.path+'/'+source.id,{json:input},200),after=await ctx.row(spec.table,source.id);assert.equal(after.row_version,source.row_version+1);assert.equal(after[spec.field],input[spec.wire]);assert.equal(response.body[spec.wire],input[spec.wire]);
    const list=await ctx.step('valid.'+spec.table+'.GET','GET',spec.path+'?leadId='+integration.leadId,{},200);assert(Array.isArray(list.body));assert(list.body.some(x=>x.id===source.id&&x[spec.wire]===input[spec.wire]));
    const afterLead=await ctx.row('lead',integration.leadId);assert.deepEqual(afterLead,beforeLead,'I writes do not automatically refresh Lead score/version');
    return{source,input,response,after,list,beforeLead,afterLead,actualChangedMutation:true,nonemptyList:true};
  });
  completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
