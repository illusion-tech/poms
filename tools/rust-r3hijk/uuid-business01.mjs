// Root checks UUID identity through real I producers, consumers and failed writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openAcceptanceContext} from './acceptance-context01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});ctx.addSource('tools/rust-r3hijk/uuid-business01.mjs');
const families={stakeholder:{route:'opportunity-stakeholders',table:'opportunity_stakeholder',build:ctx.build.buildStakeholderFullRequest,field:'communicationNotes'},competitor:{route:'competitor-intelligence-records',table:'competitor_intelligence_record',build:ctx.build.buildCompetitorFullRequest,field:'evidence'},discovery:{route:'sales-discovery-records',table:'sales_discovery_record',build:ctx.build.buildDiscoveryFullRequest,field:'remark'}};
const created={},tables=['customer','customer_contact','lead','project','opportunity_stakeholder','competitor_intelligence_record','sales_discovery_record','audit_log'];
async function snapshot(){const value={};for(const table of tables)value[table]=(await ctx.db.query('select to_jsonb(t)::text raw from poms.'+table+' t order by id')).rows.map(x=>x.raw);return value;}
const body=(family,anchor,patch={})=>families[family].build({customerId:ctx.ids.customerId.toUpperCase(),contactId:ctx.ids.contactId.toUpperCase(),[anchor+'Id']:ctx.ids[anchor+'Id'].toUpperCase(),...patch},'UUID identity '+family+' '+anchor);
let completed=false,error=null;
try{
 for(const anchor of ['lead','project'])for(const [family,config]of Object.entries(families))await ctx.case('uuid.same-identity.'+anchor+'.'+family,async()=>{
  const input=body(family,anchor),response=await ctx.step('uuid.create.'+anchor+'.'+family,'POST','/api/'+config.route,{json:input},201),stored=await ctx.row(config.table,response.body.id);
  assert.equal(stored.customer_id,ctx.ids.customerId);assert.equal(stored[anchor+'_id'],ctx.ids[anchor+'Id']);if(family==='stakeholder')assert.equal(stored.contact_id,ctx.ids.contactId);
  const lower=await ctx.step('uuid.list.lower.'+anchor+'.'+family,'GET','/api/'+config.route+'?'+anchor+'Id='+ctx.ids[anchor+'Id'],{},200),upper=await ctx.step('uuid.list.upper.'+anchor+'.'+family,'GET','/api/'+config.route+'?'+anchor+'Id='+ctx.ids[anchor+'Id'].toUpperCase(),{},200);
  assert.deepEqual(upper.body,lower.body);assert(upper.body.some(x=>x.id===response.body.id));created[anchor+'.'+family]=response.body;
  return{input,response,stored,lower,upper,samePersistedFK:true};
 });
 for(const anchor of ['lead','project'])await ctx.case('uuid.same-gap-collection.'+anchor,async()=>{const lower=await ctx.step('uuid.gaps.lower.'+anchor,'GET','/api/sales-intelligence-gaps?'+anchor+'Id='+ctx.ids[anchor+'Id'],{},200),upper=await ctx.step('uuid.gaps.upper.'+anchor,'GET','/api/sales-intelligence-gaps?'+anchor+'Id='+ctx.ids[anchor+'Id'].toUpperCase(),{},200);assert.deepEqual(upper.body,lower.body);return{lower,upper};});
 const otherCustomer=await ctx.produceCustomer('UUID-other-customer'),otherContact=await ctx.produceContact(otherCustomer.id,'UUID-other-contact'),missing=randomUUID();
 for(const [family,config]of Object.entries(families)){
  const negatives=[['different-lead-customer','lead',{customerId:otherCustomer.id.toUpperCase()},400],['different-project-customer','project',{customerId:otherCustomer.id.toUpperCase()},400],['missing-lead','lead',{leadId:missing},404],['invalid-lead','lead',{leadId:'NOT-A-UUID'},400]];
  if(family==='stakeholder')negatives.push(['different-contact-customer','lead',{contactId:otherContact.id.toUpperCase()},400]);
  for(const [name,anchor,patch,expected]of negatives)await ctx.case('uuid.reject.'+family+'.'+name,async()=>{const input=body(family,anchor,patch),before=await snapshot(),response=await ctx.step('uuid.reject.'+family+'.'+name,'POST','/api/'+config.route,{json:input},expected),after=await snapshot();assert.deepEqual(after,before);return{input,response,before,after,noBusinessWrite:true};});
  await ctx.case('uuid.normal-patch-noop.'+family,async()=>{const record=created['lead.'+family],json={[config.field]:'UUID normalized context ordinary update'},updated=await ctx.step('uuid.patch.'+family,'PATCH','/api/'+config.route+'/'+record.id.toUpperCase(),{json},200),before=await ctx.row(config.table,record.id),noop=await ctx.step('uuid.noop.'+family,'PATCH','/api/'+config.route+'/'+record.id.toUpperCase(),{json},200),after=await ctx.row(config.table,record.id);assert.deepEqual(after,before);assert.equal(updated.body[config.field],json[config.field]);assert.equal(noop.body.rowVersion,updated.body.rowVersion);assert.equal((await ctx.audit(noop.requestId)).length,0);return{updated,before,noop,after};});
  for(const method of ['POST','PATCH'])await ctx.case('uuid.required-audit-rollback.'+family+'.'+method,async()=>{const record=created['lead.'+family],json=method==='POST'?body(family,'lead'):{[config.field]:'UUID audit rollback '+phase},path='/api/'+config.route+(method==='PATCH'?'/'+record.id.toUpperCase():''),before=await snapshot(),response=await ctx.withDenied('audit_log','INSERT',()=>ctx.step('uuid.audit-fault.'+family+'.'+method,method,path,{json},500)),after=await snapshot();assert.deepEqual(after,before);return{method,path,json,response,before,after,wholeRequiredBusinessRollback:true};});
 }
 await ctx.case('uuid.true-I-to-H-score-and-J-reference-consumers',async()=>{
  const before=await ctx.rows('lead_score_snapshot',{lead_id:ctx.ids.leadId}),refreshed=await ctx.step('uuid.H.refresh','PATCH','/api/leads/'+ctx.ids.leadId,{json:{leadName:'UUID identity real downstream facts'}},200),after=await ctx.rows('lead_score_snapshot',{lead_id:ctx.ids.leadId});
  assert.equal(after.length,before.length+1);const latest=after.find(x=>!before.some(b=>b.id===x.id)),component=latest.component_breakdown;
  assert.equal(component.salesIntelligenceFacts.decisionMakerKnown,true);assert.equal(component.salesIntelligenceFacts.competitorKnown,true);assert.equal(component.salesIntelligenceFacts.procurementProcessKnown,true);
  const comment=await ctx.step('uuid.J.associations','POST','/api/business-discussions',{json:{targetObjectType:'lead',targetObjectId:ctx.ids.leadId.toUpperCase(),discussionType:'general',body:'UUID身份一致的真实I引用',relatedContactId:ctx.ids.contactId.toUpperCase(),relatedCompetitorRecordId:created['lead.competitor'].id.toUpperCase()}},201),stored=await ctx.row('business_discussion_comment',comment.body.id);
  assert.equal(stored.related_contact_id,ctx.ids.contactId);assert.equal(stored.related_competitor_record_id,created['lead.competitor'].id);return{before,refreshed,after,component,comment,stored,realSharedFactAndReferenceConsumers:true};
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
