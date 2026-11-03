import fs from'node:fs';import assert from'node:assert/strict';import{pin}from'./source-guard.mjs';
const pureFrom='docs/design/archive/slices/rust-r3hijk/evidence/followup-concurrency-business01.mjs',pureTo='tmp/rust-r3m/followup-concurrency-business01.mjs';fs.copyFileSync(pureFrom,pureTo,fs.constants.COPYFILE_EXCL);const records=[{canonicalOriginal:pin(pureFrom),currentExactCopy:pin(pureTo)}];
for(const[oldName,newName]of[['followup-empty-stream02.mjs','followup-empty-stream01.mjs'],['uuid-business01.mjs','intelligence-identity01.mjs'],['concurrency-business01.mjs','intelligence-discussion-concurrency01.mjs'],['followup-concurrency-business01.mjs','followup-source-concurrency01.mjs']]){
 const source='tools/rust-r3hijk/'+oldName,target='tools/rust-r3m/'+newName;let text=fs.readFileSync(source,'utf8').replaceAll('r3hijk','r3m').replaceAll('R3HIJK','R3CO').replaceAll('HIJK','R3CO').replaceAll('hijk_','r3m_').replaceAll('hijk-','r3m-').replaceAll(oldName,newName).replaceAll('./acceptance-context01.mjs','./acceptance-context03.mjs');
 // A same-named pure library retains its own logical name while the executor
 // gets a distinct source path in the current namespace.
 if(oldName==='followup-concurrency-business01.mjs')text=text.replaceAll('tmp/rust-r3m/'+newName,'tmp/rust-r3m/followup-concurrency-business01.mjs');
 if(oldName==='uuid-business01.mjs'){
  text=text.replace('try{',"try{\n await ctx.case('uuid.current-real-contact-producer',async()=>{const contact=await ctx.produceContact(ctx.ids.customerId,'UUID-current');ctx.ids.contactId=contact.id;assert(await ctx.row('customer_contact',contact.id));ctx.saveContext();return{contact,actualHTTPProducer:true};});");
  assert(text.includes("for(const method of ['POST','PATCH'])"));text=text.replace("for(const method of ['POST','PATCH'])","for(const method of ['PATCH'])");
 }
 assert(!fs.existsSync(target));fs.writeFileSync(target,text,{flag:'wx'});records.push({originalRecipe:pin(source),derived:pin(target),actualPriorCountsNotRecounted:true});
}
fs.writeFileSync('tmp/rust-r3m/root/concurrency-runner-derivation01.json',JSON.stringify({kind:'R3-current-source-target-lock-source-CAS-and-identity-acceptance-adapters',records,correction:'I CREATE has no registered required audit; only actual PATCH audits are denied, no reuse of earlier partial report',oldPrivateRead:false,actualExecutionPerformed:false},null,2)+'\n',{flag:'wx'});
