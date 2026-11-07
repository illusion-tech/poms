import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { sha } from './business/pure.mjs';
const ctx=createContext({epoch:'g2-business12',run:'main01'}),lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'exact-noop-empty400-reconciliation73'})+'\n',{flag:'wx',mode:0o600});
const pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))});
try{
 const slot=ctx.state.consumerChecks72.noop;assert.equal(slot.phase,'running');assert.equal(slot.noops.length,0);assert(slot.projectId&&slot.reassigned&&slot.afterAssignment);assert(!slot.emptyValidation);
 const httpFile=ctx.out+'/004465-http-http.json',http=JSON.parse(fs.readFileSync(httpFile));assert.equal(http.status,400);assert.equal(http.operationId,'ProjectController_updateBasicInfo');assert.equal(http.responseComplete,true);
 const response=JSON.parse(fs.readFileSync(http.originals.responseBody.file));assert.equal(response.statusCode,400);assert(response.errors.some(e=>e.message==='At least one field is required for update'));
 const ledgerFile=ctx.priv+'/004466-ledger.json',ledger=JSON.parse(fs.readFileSync(ledgerFile));assert.equal(ledger.requestId,http.requestId);assert(ledger.ownershipComplete);assert.deepEqual(ledger.recorded,[]);assert.deepEqual(ledger.blockers,[]);
 const before=loadSnapshot(ctx,ledger.before),after=loadSnapshot(ctx,ledger.after),fresh=await capture(ctx,ctx.next('noop73-current'));assertRecorded(ctx,fresh);
 for(const db of ctx.databases){assert.deepEqual(before.databases[db].meta,after.databases[db].meta);assert.deepEqual(after.databases[db].meta,fresh.databases[db].meta);assert.deepEqual(before.objects[db],after.objects[db]);assert.deepEqual(after.objects[db],fresh.objects[db]);
  for(const table of Object.keys(before.databases[db].tables)){const identities=s=>readRows(s.databases[db].tables[table]).map(r=>[r.key,r.sha256,r.xmin]);assert.deepEqual(identities(before),identities(after));assert.deepEqual(identities(after),identities(fresh));}}
 const receipt=ctx.artifact(ctx.next('noop73-empty400-reconciled')+'.json',{kind:'exact-rejected-empty-PATCH-source-validation-reconciliation',http:pin(httpFile),ledger:pin(ledgerFile),response:http.originals.responseBody,before:ledger.before,after:ledger.after,current:fresh.manifest,
  actualStatus:400,reason:'At least one field is required for update',allRowsXminCatalogSequencesObjectsUnchanged:true,originalExpected200FailurePreserved:true,projectCreationOrReassignmentReplayed:false,businessSQLOrHTTPExecutedByReconciliation:false,G3Certified:false});
 slot.emptyValidation={actualStatus:400,proof:receipt};slot.phase='ready-after-empty400';ctx.persist();console.log(JSON.stringify({reconciled:true,actualStatus:400,projectCreationOrReassignmentReplayed:false,receipt}));
}finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
