// New cohort starts from the restored seed; no deleted actor or old private lineage is reused.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context01.mjs';
const ctx=await openAcceptanceContext({backend:'rust',tag:'candidate05',phase:'48'});ctx.addSource('tools/rust-r3hijk/start-uuid-cohort01.mjs');let completed=false,error=null;
try{
 await ctx.case('UUID-correction-fresh-real-producers',async()=>{
  ctx.ids.sourceCode=(await ctx.db.query("select code from poms.dictionary_item where domain='lead-source' and status='active' order by sort_order,code limit 1")).rows[0].code;
  const customer=await ctx.produceCustomer('UUID-new-cohort');ctx.ids.customerId=customer.id;
  const project=await ctx.produceProject('UUID-new-cohort',customer.id);ctx.ids.projectId=project.id;
  const contact=await ctx.produceContact(customer.id,'UUID-new-cohort');ctx.ids.contactId=contact.id;
  const lead=await ctx.produceLead('UUID-new-cohort');ctx.ids.leadId=lead.id;
  const receipt={kind:'R3HIJK-new-UUID-correction-cohort',createdAt:new Date().toISOString(),runId:ctx.runId,marker:ctx.identity.marker,backend:'rust',tag:'candidate05',database:ctx.runtime.database,ids:ctx.ids,allParentsRealHTTP:true,baselineTables:107,oldLineagesAlreadyTerminal:true};
  fs.writeFileSync('tmp/rust-r3hijk/root/uuid-cohort01.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return{customer,project,contact,lead,receipt};
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
