import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext, FIXED } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { data, sha } from './business/pure.mjs';
import { loadSnapshot, readRows } from './business/snapshot.mjs';
import { faultSweepAndRetry } from './business/fault-sweep.mjs';
import { assertMetadataAudit25 } from './business/metadata-patch25.mjs';
const epoch='g2-business12',run='main01',lock=`${FIXED.private}/business/${epoch}/${run}/driver.lock`;
assert.equal(process.platform,'linux');assert.equal(fs.realpathSync(`${FIXED.private}/business/${epoch}/${run}`),`${FIXED.private}/business/${epoch}/${run}`);
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-new-owner-noop72'})+'\n',{flag:'wx',mode:0o600});let ctx;
const identities=table=>readRows(table).map(row=>[row.key,row.sha256,row.xmin]);
function project(snapshot,id){const rows=readRows(snapshot.databases[ctx.database].tables.project).filter(row=>row.key[0]===id);assert.equal(rows.length,1);return rows[0];}
function unchanged(response,id){const before=loadSnapshot(ctx,response.before),after=loadSnapshot(ctx,response.after);
 for(const db of ctx.databases){assert.deepEqual(before.databases[db].meta,after.databases[db].meta);assert.deepEqual(before.objects[db],after.objects[db]);
  for(const table of Object.keys(before.databases[db].tables)){if(db===ctx.database&&['auth_session','security_event'].includes(table))continue;
   assert.deepEqual(identities(after.databases[db].tables[table]),identities(before.databases[db].tables[table]),'No-op/denied request changed business rows or audit/xmin: '+table);}}
 const row=project(after,id);return{before:response.before,after:response.after,rowSHA256:row.sha256,xmin:row.xmin,rowVersion:JSON.parse(row.raw).row_version,updatedBy:JSON.parse(row.raw).updated_by,businessAndAuditUnchanged:true};}
try{
 ctx=createContext({epoch,run});assert(ctx.state.consumerAdmission54&&!ctx.state.activeFault&&!ctx.state.blockedObservation);
 ctx.state.consumerChecks72??={};assert(!ctx.state.consumerChecks72.noop,'Never replay an interrupted or completed actual scenario');
 const slot=ctx.state.consumerChecks72.noop={phase:'running',sourcePinsSHA256:sha(JSON.stringify(ctx.pins))};ctx.persist();
 const api=createApi(ctx);for(const actor of ['manager','execution','finance','unrelated'])await api.login(actor);
 assert.deepEqual([...ctx.state.actors.execution.permissions].sort(),['project:read','project:write'].sort());
 const oldName=ctx.state.prefix+'-different-owner-noop72';
 const created=await api.request('ProjectController_create',{}, {projectName:oldName,customerId:ctx.state.fixtures.customer.id,currentStage:'assessment'},'manager',
  {responseBirths:[{table:'project',pointer:'/id'}],number:{scope:'project',pointer:'/projectNo'}});
 const p=data(created),id=p.id;assert(id&&p.ownerUserId===ctx.state.actors.manager.id);slot.projectId=id;slot.created=created.receiptId;ctx.persist();
 const assigned=await api.request('ProjectController_reassignOwner',{id},{ownerUserId:ctx.state.actors.execution.id,ownerOrgId:ctx.state.fixtures.org.id,expectedVersion:p.rowVersion,reason:'真实新主责无变化更新回归；改派操作人与新主责不同。'},'manager',
  {responseBirths:[{table:'project_owner_reassignment_record',pointer:'/projectOwnerReassignmentRecordId'}],mutableTables:['project','project_ownership_origin'],updatedAnchors:[{table:'project',id,requestBinding:'path:id'}]});
 const baseline=project(loadSnapshot(ctx,assigned.after),id),value=JSON.parse(baseline.raw);
 assert.equal(value.owner_user_id,ctx.state.actors.execution.id);assert.equal(value.updated_by,ctx.state.actors.manager.id);assert.notEqual(value.owner_user_id,value.updated_by);
 slot.reassigned=assigned.receiptId;slot.afterAssignment=assigned.after;slot.noops=[];ctx.persist();
 for(const [name,body] of [['empty',{}],['same-value',{projectName:oldName}]]){
  const response=await api.request('ProjectController_updateBasicInfo',{id},body,'execution');
  const proof=unchanged(response,id);assert.equal(proof.rowSHA256,baseline.sha256);assert.equal(proof.xmin,baseline.xmin);assert.equal(proof.updatedBy,ctx.state.actors.manager.id);
  assert.equal(data(response).rowVersion,value.row_version);slot.noops.push({name,receipt:response.receiptId,proof});ctx.persist();
 }
 slot.denied=[];for(const actor of ['manager','finance','unrelated']){
  const response=await api.request('ProjectController_updateBasicInfo',{id},{},actor,{expectedStatus:404});
  slot.denied.push({actor,receipt:response.receiptId,proof:unchanged(response,id),ProjectWriteDidNotGrantScope:true});ctx.persist();
 }
 const body={projectName:ctx.state.prefix+'-new-owner-dirty72'};
 const result=await faultSweepAndRetry(ctx,api,{operationId:'ProjectController_updateBasicInfo',projectId:id,params:{id},body,actor:'execution',
  binding:{mutableTables:['project'],updatedAnchors:[{table:'project',id,requestBinding:'path:id'}]}});
 const successful=result.successful,before=loadSnapshot(ctx,successful.before),after=loadSnapshot(ctx,successful.after),a=JSON.parse(project(before,id).raw),current=project(after,id),b=JSON.parse(current.raw);
 assert.equal(b.project_name,body.projectName);assert.equal(b.row_version,a.row_version+1);assert.equal(b.updated_by,ctx.state.actors.execution.id);
 const audits=readRows(after.databases[ctx.database].tables.audit_log).filter(row=>JSON.parse(row.raw).request_id===successful.requestId);assert.equal(audits.length,1);assert.equal(audits[0].xmin,current.xmin);
 assertMetadataAudit25(JSON.parse(audits[0].raw),{projectId:id,actorId:ctx.state.actors.execution.id,oldName:a.project_name,newName:body.projectName,beforeVersion:a.row_version});
 const last=await api.request('ProjectController_updateBasicInfo',{id},body,'execution');const lastProof=unchanged(last,id);assert.equal(lastProof.xmin,current.xmin);
 slot.dirty={receipt:successful.receiptId,sweep:result.receipt,primaryHitFailures:result.failures.length,commonProjectAuditXmin:current.xmin};slot.finalSameActorNoop={receipt:last.receiptId,proof:lastProof};slot.phase='verified';
 const proof=ctx.artifact(ctx.next('new-owner-noop72-complete')+'.json',slot,{kind:'actual-API135-new-owner-empty-and-same-value-noop',differentUpdaterAndOwner:true,differentActorNoops:2,scopeDenials:3,dirtyPrimaryHitFailures:3,dirtySuccesses:1,postDirtyNoop:1,businessNoopAuditAndXminUnchanged:true,counted32NewProducer:false,G3Certified:false});
 ctx.state.consumerChecks72.noopReceipt=proof;ctx.persist();console.log(JSON.stringify({status:'completed',proof,differentActorNoops:2,scopeDenials:3,dirtyFIFamilies:3,G3Certified:false}));
}catch(error){if(ctx){const original=ctx.artifact(ctx.next('noop72-partial')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed-or-partial',privateOriginal:original}));}else console.error(JSON.stringify({status:'setup-failed',name:error.name}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
