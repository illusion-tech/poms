import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { data,sha } from './business/pure.mjs';
import { loadSnapshot,readRows } from './business/snapshot.mjs';
const ctx=createContext({epoch:'g2-business12',run:'main01'}),lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-current-restatement-list-detail-readback77'})+'\n',{flag:'wx',mode:0o600});
try{
 const oldFile=ctx.private+'/business/g2-business11/main01/003079-ef40-complete.json',oldBytes=fs.readFileSync(oldFile);assert.equal(sha(oldBytes),'360ff7f813c05dae0ef2f21d2351c7c4bc9130e377428605868dc07ca67c6eac');const old=JSON.parse(oldBytes);assert.equal(old.finalSuccess.postconditions,'verified');
 const http=JSON.parse(fs.readFileSync(old.finalSuccess.receipt)),raw=fs.readFileSync(http.originals.responseBody.file);assert.equal(sha(raw),http.originals.responseBody.rawBytesSha256);const body=data({body:JSON.parse(raw)});assert.equal(body.restatementIds.length,3);
 const snapshot=loadSnapshot(ctx,old.finalSuccess.after),stored=readRows(snapshot.databases[ctx.database].tables.operating_restatement_record).map(r=>JSON.parse(r.raw)).filter(row=>body.restatementIds.includes(row.id));assert.equal(stored.length,3);
 const api=createApi(ctx);await api.login('manager');const observations=[];
 for(const projectId of [...new Set(stored.map(r=>r.project_id))]){const response=await api.request('ProjectCostController_listOperatingRestatements',{projectId},null,'manager'),value=data(response),items=Array.isArray(value)?value:value.items;assert(Array.isArray(items));
  const required=stored.filter(r=>r.project_id===projectId);for(const row of required)assert(items.some(item=>item.id===row.id&&item.projectId===projectId));observations.push({operationId:response.operationId,receipt:response.receiptId,projectId,matchedActualHistoricalRecords:required.length});}
 for(const row of stored){const response=await api.request('ProjectCostController_getOperatingRestatement',{id:row.id},null,'manager'),value=data(response);assert.equal(value.id,row.id);assert.equal(value.projectId,row.project_id);assert.equal(value.certification,'verified');assert.equal(value.producerVersion,1);assert.equal(value.scope,'live');
  assert.equal(value.sourceContextId,row.source_context_id);assert.equal(value.sourceHash,row.source_hash);assert(value.restatesSnapshotRef&&value.restatedSnapshotRef&&value.rootSnapshotRef);assert.equal(value.reasonProjection.mode,'full');
  observations.push({operationId:response.operationId,receipt:response.receiptId,id:row.id,projectId:row.project_id,sourceContextId:value.sourceContextId,sourceHash:value.sourceHash});}
 const receipt=ctx.artifact(ctx.next('restatement-readback77-complete')+'.json',{kind:'actual-API135-historical-API134-restatement-list-detail-readback',producerEvidence:{file:oldFile,rawBytesSha256:sha(oldBytes)},observations,
  priorProducerAPI:134,currentReadAPI:135,recordSourceVersionUnchanged:true,oldPOSTNotRelabelledAsNewPOST:true,G3Certified:false},{kind:'actual-API135-restatement-list-and-detail-complete',listGETs:2,detailGETs:3,actualHistoricalRecords:3,G3Certified:false});
 ctx.state.consumerChecks77={restatementReadback:receipt};ctx.persist();console.log(JSON.stringify({status:'completed',listGETs:2,detailGETs:3,receipt,G3Certified:false}));
}catch(error){const original=ctx.artifact(ctx.next('restatement-readback77-partial')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed-or-partial',privateOriginal:original}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
