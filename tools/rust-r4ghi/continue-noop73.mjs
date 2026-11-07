import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { data } from './business/pure.mjs';
import { loadSnapshot,readRows } from './business/snapshot.mjs';
import { faultSweepAndRetry } from './business/fault-sweep.mjs';
import { assertMetadataAudit25 } from './business/metadata-patch25.mjs';
const ctx=createContext({epoch:'g2-business12',run:'main01'}),lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-noop73-continuation'})+'\n',{flag:'wx',mode:0o600});
const rows=(s,db,table)=>readRows(s.databases[db].tables[table]),identities=a=>a.map(r=>[r.key,r.sha256,r.xmin]);
const project=(s,id)=>{const a=rows(s,ctx.database,'project').filter(r=>r.key[0]===id);assert.equal(a.length,1);return a[0];};
function unchanged(response,id){const before=loadSnapshot(ctx,response.before),after=loadSnapshot(ctx,response.after);for(const db of ctx.databases){assert.deepEqual(before.databases[db].meta,after.databases[db].meta);assert.deepEqual(before.objects[db],after.objects[db]);
 for(const table of Object.keys(before.databases[db].tables)){if(db===ctx.database&&['auth_session','security_event'].includes(table))continue;assert.deepEqual(identities(rows(before,db,table)),identities(rows(after,db,table)),table);}}
 const p=project(after,id);return{before:response.before,after:response.after,rowSHA256:p.sha256,xmin:p.xmin,values:JSON.parse(p.raw),allBusinessRowsAndAuditUnchanged:true};}
try{
 const slot=ctx.state.consumerChecks72.noop;assert.equal(slot.phase,'ready-after-empty400');assert.equal(slot.emptyValidation.actualStatus,400);assert(!slot.validSameValue&& !slot.dirty);
 const id=slot.projectId,original=project(loadSnapshot(ctx,slot.afterAssignment),id),value=JSON.parse(original.raw),same={projectName:value.project_name};
 const api=createApi(ctx);for(const key of ['manager','execution','finance','unrelated'])await api.login(key);
 assert.equal(value.owner_user_id,ctx.state.actors.execution.id);assert.equal(value.updated_by,ctx.state.actors.manager.id);
 slot.phase='valid-same-value-starting';ctx.persist();const noop=await api.request('ProjectController_updateBasicInfo',{id},same,'execution'),proof=unchanged(noop,id);
 assert.equal(proof.rowSHA256,original.sha256);assert.equal(proof.xmin,original.xmin);assert.equal(proof.values.updated_by,ctx.state.actors.manager.id);assert.equal(data(noop).rowVersion,value.row_version);
 slot.validSameValue={receipt:noop.receiptId,proof};slot.denied=[];ctx.persist();
 for(const actor of ['manager','finance','unrelated']){const denied=await api.request('ProjectController_updateBasicInfo',{id},same,actor,{expectedStatus:404});slot.denied.push({actor,receipt:denied.receiptId,proof:unchanged(denied,id),validBodyCannotBypassCurrentOwner:true});ctx.persist();}
 const body={projectName:ctx.state.prefix+'-new-owner-dirty73'};
 const result=await faultSweepAndRetry(ctx,api,{operationId:'ProjectController_updateBasicInfo',projectId:id,params:{id},body,actor:'execution',binding:{mutableTables:['project'],updatedAnchors:[{table:'project',id,requestBinding:'path:id'}]}});
 const successful=result.successful,before=loadSnapshot(ctx,successful.before),after=loadSnapshot(ctx,successful.after),a=JSON.parse(project(before,id).raw),current=project(after,id),b=JSON.parse(current.raw);
 assert.equal(b.project_name,body.projectName);assert.equal(b.row_version,a.row_version+1);assert.equal(b.updated_by,ctx.state.actors.execution.id);
 const audits=rows(after,ctx.database,'audit_log').filter(r=>JSON.parse(r.raw).request_id===successful.requestId);assert.equal(audits.length,1);assert.equal(audits[0].xmin,current.xmin);
 assertMetadataAudit25(JSON.parse(audits[0].raw),{projectId:id,actorId:ctx.state.actors.execution.id,oldName:a.project_name,newName:body.projectName,beforeVersion:a.row_version});
 slot.dirty={receipt:successful.receiptId,sweep:result.receipt,primaryHitFailures:result.failures.length,projectAuditCommonXmin:current.xmin};ctx.persist();
 const post=await api.request('ProjectController_updateBasicInfo',{id},body,'execution'),postProof=unchanged(post,id);assert.equal(postProof.xmin,current.xmin);slot.postDirtyNoop={receipt:post.receiptId,proof:postProof};slot.phase='verified';
 const receipt=ctx.artifact(ctx.next('noop73-complete')+'.json',slot,{kind:'actual-API135-new-owner-same-value-and-real-dirty-metadata',emptyRequestValidation400:true,newOwnerSameValue200NoBusinessWrite:true,validScopeDenials404:3,dirtyFIFamilies:3,dirtySuccesses:1,postDirtyNoop:true,projectCreationOrReassignmentReplayed:false,G3Certified:false});ctx.state.consumerChecks72.noopReceipt=receipt;ctx.persist();console.log(JSON.stringify({status:'completed',receipt,emptyValidation400:true,validSameValue200:true,scopeDenials404:3,dirtyFIFamilies:3,G3Certified:false}));
}catch(error){const original=ctx.artifact(ctx.next('noop73-partial')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed-or-partial',privateOriginal:original}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
