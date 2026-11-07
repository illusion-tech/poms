// Current API negatives; old admitted producer records supply real route IDs only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { operationMap, sha } from './business/pure.mjs';
import { loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertAdmittedContext54, readPin54 } from './business/consumer-admission54.mjs';
const ctx=createContext({epoch:'g2-business11',run:'main01'}),admission=assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});
assert(!ctx.state.blockedObservation&&!ctx.state.activeFault&&!ctx.state.cleaned&&!ctx.state.cleanupPlan);
const lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-modern-protocol56'})+'\n',{flag:'wx',mode:0o600});
try{
 const api=createApi(ctx);await api.login('manager');
 const mapping=JSON.parse(fs.readFileSync(ctx.win+'/docs/design/rust-r4ghi/operation-map01.json'));
 const definitions=mapping.operations.filter(r=>r.requestProtocol?.requiredInputVersion==='server-derived-v1');assert.equal(definitions.length,16);
 definitions.push({operationId:'ContractFinanceController_confirmReceipt',supportingExistingOperation:true});
 const map=operationMap(api.spec),attempts=[];
 const directories=[ctx.out,`${ctx.win}/tmp/rust-r4ghi/business/${admission.producer.epoch}/${admission.producer.run}`];
 for(const directory of directories)for(const name of fs.readdirSync(directory).filter(n=>/-http-http\.json$/.test(n)).sort()){
  const receipt=JSON.parse(fs.readFileSync(directory+'/'+name));
  if(receipt.responseComplete&&receipt.status>=200&&receipt.status<300)attempts.push(receipt);
 }
 const rows=[];
 for(const definition of definitions){
  const item=map.get(definition.operationId);assert(item&&item.method==='POST');let params={},routeProof=null;
  if(item.template.includes('{')){
   const previous=attempts.find(r=>r.operationId===definition.operationId);assert(previous,'An original real route resource is required');
   const request=JSON.parse(readPin54(previous.originals.requestConfig)),keys=[];
   const pattern=item.template.split(/(\{[^}]+\})/).map(part=>{if(part.startsWith('{')){keys.push(part.slice(1,-1));return'([^/]+)';}return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('');
   const match=new RegExp('^'+pattern+'$').exec(new URL(request.url).pathname);assert(match);
   params=Object.fromEntries(keys.map((key,i)=>[key,decodeURIComponent(match[i+1])]));routeProof=previous.originals.requestConfig;
  }
  for(const test of[{name:'missing-protocol-tag',body:{},status:422},{name:'modern-tag-with-invalid-shape',body:{inputVersion:'server-derived-v1'},status:400}]){
   const response=await api.request(definition.operationId,params,test.body,'manager',{expectedStatus:test.status});
   const before=loadSnapshot(ctx,response.before),after=loadSnapshot(ctx,response.after);
   for(const database of ctx.databases){
    assert.deepEqual(before.databases[database].meta,after.databases[database].meta);assert.deepEqual(before.objects[database],after.objects[database]);
    for(const table of Object.keys(before.databases[database].tables)){
     if(database===ctx.database&&['auth_session','audit_log','security_event'].includes(table))continue;
     assert.deepEqual(readRows(after.databases[database].tables[table]).map(r=>[r.key,r.sha256,r.xmin]),readRows(before.databases[database].tables[table]).map(r=>[r.key,r.sha256,r.xmin]),'Rejected protocol changed business rows/xmin: '+table);
    }
   }
   if(test.status===422)assert(JSON.stringify(response.body).includes('legacy_reference_input_unsupported'));
   rows.push({operationId:definition.operationId,case:test.name,actualStatus:response.status,routeProof,currentConsumerOnly:true,receipt:response.receiptId,ledger:response.ledger,businessRowsAndXminUnchanged:true});
  }
 }
 const result={kind:'actual-current-API134-sixteen-modern-write-plus-C-protocol-negatives',rows,sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),oldProducerUsedForResourcePathOnly:true,
  admittedPositiveBusinessBoundaryClaimed:false,NativeHTTPExecuted:false,moneyBoundaryClaimed:false,G3Certified:false,G4Certified:false};
 const receipt=ctx.artifact(ctx.next('modern-protocol56-complete')+'.json',result,{kind:result.kind,batchModernOperations:16,supportingExistingCOperations:1,actualNegativeRequests:rows.length,allMissingTags422:true,allInvalidModernShapes400:true,businessWrites:0,G3Certified:false});
 ctx.state.modernProtocol56=receipt;ctx.persist();console.log(JSON.stringify({status:'completed',actualNegativeRequests:rows.length,businessWrites:0,receipt,G3Certified:false}));
}catch(error){const original=ctx.artifact(ctx.next('modern-protocol56-partial')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed-or-partial',privateOriginal:original}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
