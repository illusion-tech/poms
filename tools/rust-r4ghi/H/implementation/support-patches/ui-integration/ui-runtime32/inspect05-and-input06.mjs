// Filesystem-only effect inventory and an explicitly unbound continuation input.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { ownEvidenceFile } from 'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/write-policy14.mjs';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',L='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',H='/home/wangzishi',U='//wsl.localhost/Debian/home/wangzishi';
const P=`${H}/.local/share/poms-r4ghi/private`,http=`${P}/ui/runtime14/dom14-source12-05/http`,windows=`${R}/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-05`,O=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),checked=[]; const local=f=>f.startsWith(`${L}/`)?`${R}/${f.slice(L.length+1)}`:f.startsWith(`${H}/`)?`${U}/${f.slice(H.length+1)}`:f;
function bytes(file,expected){const b=fs.readFileSync(local(file)),rawBytesSha256=sha(b);if(expected)assert.equal(rawBytesSha256,expected);checked.push({file,rawBytesSha256,bytes:b.length});return b;}
const json=(file,expected)=>JSON.parse(bytes(file,expected)),pin=file=>{bytes(file);return checked.at(-1);},pjson=p=>json(p.file,p.rawBytesSha256),unwrap=v=>v?.data??v;
const save=(name,value)=>fs.writeFileSync(`${O}/${name}`,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function row(snapshot,table,id){const t=snapshot.databases.poms_r4ghi_rust.tables[table];assert(t);const data=bytes(t.file,t.rawBytesSha256).toString().split('\n').filter(Boolean).map(v=>JSON.parse(v));for(const r of data)assert.equal(sha(r.raw),r.sha256);const found=data.filter(r=>r.key[0]===id);assert.equal(found.length,1);return found[0];}
const wires=fs.readdirSync(local(http)).filter(n=>/^http-\d+\.json$/.test(n)).sort().map(n=>{const rawPin=pin(`${http}/${n}`),raw=pjson(rawPin);return{rawPin,raw};});
const writes=wires.filter(v=>!['GET','HEAD'].includes(v.raw.request.method));assert.equal(writes.length,5);
const effects=writes.map(({rawPin,raw})=>{
  const requestId=Object.entries(raw.request.headers).find(([k])=>k.toLowerCase()==='x-request-id')?.[1];assert(requestId);
  const match=/-(\d{6}-ui10-http)-/.exec(requestId);assert(match);
  const publicPin=pin(`${L}/tmp/rust-r4ghi/business/g2-business12/main01/${match[1]}-browser-http.json`),receipt=pjson(publicPin),intent=pjson(receipt.intent),original=pjson(receipt.originals),ledger=pjson(receipt.ledger);
  assert.equal(receipt.requestId,requestId);assert.equal(receipt.status,raw.response.status);assert.equal(receipt.responseComplete,true);assert.equal(receipt.transportFailure,false);assert.equal(raw.response.complete,true);assert.equal(raw.failure,null);
  assert.equal(original.attempt.requestId,requestId);assert.equal(original.attempt.status,raw.response.status);assert.equal(original.attempt.responseComplete,true);assert.equal(original.attempt.transportFailure,false);
  assert.equal(original.bodyBase64,raw.response.bodyBase64);assert.equal(intent.bodyBase64,raw.request.bodyBase64);assert.equal(ledger.requestId,requestId);assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);assert.deepEqual(ledger.before,receipt.before);assert.deepEqual(ledger.after,receipt.after);
  const response=unwrap(JSON.parse(Buffer.from(raw.response.bodyBase64,'base64')));
  return{rawPin,publicPin,operationId:receipt.operationId,requestId,method:raw.request.method,path:raw.request.path,status:raw.response.status,intent:receipt.intent,originals:receipt.originals,before:receipt.before,after:receipt.after,ledger:receipt.ledger,ownershipComplete:true,recorded:ledger.recorded,response,actorId:original.attempt.actorId,raw};
});
const eo=effects.find(e=>e.operationId==='ProjectController_startExecution');assert(eo);assert.equal(eo.status,200);assert.equal(eo.response.businessStatusAfter,'execution');assert.equal(eo.response.enteredBy,eo.actorId);
const eoBefore=pjson(eo.before),eoAfter=pjson(eo.after),eoProjectBefore=row(eoBefore,'project',eo.response.targetId),eoProjectAfter=row(eoAfter,'project',eo.response.targetId);
assert.equal(JSON.parse(eoProjectBefore.raw).current_stage,'handover');assert.equal(JSON.parse(eoProjectAfter.raw).current_stage,'execution');assert.equal(JSON.parse(eoProjectAfter.raw).row_version,eo.response.projectRowVersion);
const stage=row(eoAfter,'project_stage_record',eo.response.projectStageRecordId);assert.equal(stage.xmin,eoProjectAfter.xmin);
const create=effects.find(e=>e.operationId==='AttachmentUploadSessionController_create'),put=effects.find(e=>e.operationId==='AttachmentUploadSessionController_proxyUploadObject'),complete=effects.find(e=>e.operationId==='AttachmentUploadSessionController_complete');assert(create&&put&&complete);
assert.equal(create.status,201);assert.equal(complete.status,200);assert.equal(create.response.id,'851ec38b-422e-46e0-b5ed-9a050d475de7');assert.equal(complete.response.id,'fe07ecbc-c2c7-4595-adb1-74e7a18190e3');
const primaryPin=pin(`${windows}/case-2/primary-response.json`),primary=pjson(primaryPin);assert.equal(primary.scopeKind,'own-condition-only');
const pending=primary.items.flatMap(parent=>parent.ownTasks.filter(task=>task.status==='pending'&&task.responsibleUserId===create.actorId).map(task=>({parent,task})));assert.equal(pending.length,1);const {parent,task}=pending[0];
const createIntent=pjson(create.intent),body=JSON.parse(Buffer.from(createIntent.bodyBase64,'base64'));assert.deepEqual(body.completionConditionContext,{completionRecordId:parent.completionRecordId,conditionId:task.conditionId});assert.equal(body.targetId,primary.projectId);
const beforeUpload=pjson(create.before),afterUpload=pjson(complete.after);
for(const [table,id]of[['project_completion_record',parent.completionRecordId],['project_completion_condition',task.conditionId]]){const a=row(beforeUpload,table,id),b=row(afterUpload,table,id);assert.equal(a.sha256,b.sha256);assert.equal(a.xmin,b.xmin);}
const condition=row(afterUpload,'project_completion_condition',task.conditionId);assert.equal(JSON.parse(condition.raw).status,'pending');
const upload=row(afterUpload,'attachment_upload_session',create.response.id),session=JSON.parse(upload.raw);assert.equal(session.status,'completed');assert.equal(session.project_scope_context_version,1);assert.equal(session.completion_record_id,parent.completionRecordId);assert.equal(session.completion_condition_id,task.conditionId);assert.equal(session.completed_attachment_id,complete.response.id);assert.equal(session.created_by,create.actorId);
row(afterUpload,'attachment',complete.response.id);
const actualOldBytes=Buffer.from(put.raw.request.bodyBase64,'base64');assert.equal(sha(actualOldBytes),complete.response.checksumSha256);assert.equal(actualOldBytes.length,complete.response.sizeBytes);
assert(!writes.some(v=>v.raw.request.path.includes('/conditions/')&&v.raw.request.path.endsWith(':close')));

const inputPin={file:`${P}/ui-config/runtime14/dom14-source12-05-prepare-input16.json`,rawBytesSha256:'41585423a91f4b38e9bf06f82b6f8aa65f9c995b0bc0097b35ad6f43a15e1eac'},old=pjson(inputPin),next=structuredClone(old);
const oldOwn=old.plan.writeActions.find(v=>v.kind==='own-condition'),oldFile=ownEvidenceFile({projectId:primary.projectId,completionRecordId:parent.completionRecordId,conditionId:task.conditionId,actorId:create.actorId,evidenceText:oldOwn.evidenceText});assert.deepEqual(oldFile.bytes,actualOldBytes);
const newText='本人为同一待闭合条件提交第二份独立补充证明，内容与前份不同，核对本次新材料后再提交闭合。';assert.notEqual(newText,oldOwn.evidenceText);
const newFile=ownEvidenceFile({projectId:primary.projectId,completionRecordId:parent.completionRecordId,conditionId:task.conditionId,actorId:create.actorId,evidenceText:newText});assert.notEqual(newFile.checksumSha256,oldFile.checksumSha256);
next.plan.cases=next.plan.cases.filter(v=>v.kind!=='execution-owner');next.plan.writeActions=next.plan.writeActions.filter(v=>v.kind!=='execution-owner');assert.equal(next.plan.cases.length,5);assert.equal(next.plan.writeActions.length,1);next.plan.writeActions[0].evidenceText=newText;
assert.deepEqual(next.plan.cases,old.plan.cases.filter(v=>v.kind!=='execution-owner'));
const oldRun=next.plan.uiRun,newRun='dom14-source12-06';next.plan.uiRun=newRun;
for(const[k,v]of Object.entries(next.plan.paths)){assert(v.includes(oldRun));next.plan.paths[k]=v.replaceAll(oldRun,newRun);}
for(const[k,v]of Object.entries(next.plan.relay24.paths)){assert(v.includes(oldRun));next.plan.relay24.paths[k]=v.replaceAll(oldRun,newRun);}
next.plan.sourceBases=[];delete next.plan.metadata16;next.promotedToolClosure={file:null,rawBytesSha256:null};
save('ui06-prepare-input32.unbound.json',next);
const publicEffects=effects.map(({response,actorId,raw,...v})=>({...v,actorId,actualResponseIDs:{id:response.id??null,projectStageRecordId:response.projectStageRecordId??null,links:response.links?.map(x=>({id:x.id,targetId:x.targetId,targetType:x.targetType}))??[]}}));
save('ui05-effects32.json',{kind:'FS-only-actual-UI05-effects-before-tool-failures',originalUI05Passed:false,successfulWrites:publicEffects,
  EO:{projectId:eo.response.targetId,actualStageRecordId:eo.response.projectStageRecordId,enteredBy:eo.actorId,ProjectAndStageCommonXmin:stage.xmin,oldStage:'handover',actualStage:'execution',consumed:true,replayAllowed:false},
  Own:{projectId:primary.projectId,completionRecordId:parent.completionRecordId,conditionId:task.conditionId,responsibleUserId:create.actorId,actualPurposeSessionId:create.response.id,actualCompletedAttachmentId:complete.response.id,completedUploadChecksum:complete.response.checksumSha256,completedUploadBytes:complete.response.sizeBytes,closurePOSTObserved:false,parentAndChildSHAAndXminUnchangedAcrossUpload:true,conditionStillPending:true,oldUploadedEvidenceNotAdoptedIntoClosure:true,replayOldUploadAllowed:false},
  font05:{recordedBlockedOrigins:['https://fonts.googleapis.com'],fullRequestfailedAndConsoleLocationNotRecorded:true,strictRetroactiveClassificationClaimed:false,new32MustCollectExactTuples:true},
  RootStateRead:false,RootWritten:false,SQL:false,HTTP:false,G3Certified:false,G4Certified:false});
save('ui06-input-delta32.json',{kind:'unbound-new-run-continuation-not-UI05-rewrite',source:inputPin,oldRun,newRun,
  removedCases:['execution-owner'],removedActions:['execution-owner'],remainingCases:next.plan.cases.map(v=>v.kind),remainingActions:next.plan.writeActions.map(v=>v.kind),
  ownNewCommand:{oldEvidenceText:oldOwn.evidenceText,newEvidenceText:newText,oldChecksum:oldFile.checksumSha256,newChecksum:newFile.checksumSha256,oldBytes:oldFile.sizeBytes,newBytes:newFile.sizeBytes,oldSuccessfulUploadPreserved:true,oldSelectionInjected:false,newDistinctUploadRequiresFreshPendingProof:true},
  fullClosureAndPromotedToolReceiptExplicitlyUnbound:true,RootMustCaptureNewSourceBasesBuildActorProofAndPlanSHA:true,NoActorsFinalDefault:true,NoCompletedEOReplay:true,all05FailureArtifactsPreserved:true,checked});
console.log(JSON.stringify({kind:'UI05-effects-and-unbound06-FS-only',successfulWrites:effects.length,EOConsumed:true,OwnUploadCompleted:true,OwnClosePosted:false,newOwnChecksum:newFile.checksumSha256,remainingCases:5,RootWritten:false}));
