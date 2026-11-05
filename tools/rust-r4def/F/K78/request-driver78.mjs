// Candidate only. Import/constructor/manifest do not perform I/O. Root supplies
// real HTTP, scoped faults and independent PG/object observers at run time.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const U='AttachmentUploadSessionController_', A='AttachmentController_';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const BYTES78=Uint8Array.from(Buffer.from('%PDF-1.7\n'+'A'.repeat(55)));
export const SHA78=sha(BYTES78);
export const OPS78=Object.freeze({
 [U+'create']:['POST','/api/attachment-upload-sessions',201],
 [U+'get']:['GET','/api/attachment-upload-sessions/{id}',200],
 [U+'createUploadTarget']:['POST','/api/attachment-upload-sessions/{id}/upload-targets',200],
 [U+'proxyUploadObject']:['PUT','/api/attachment-upload-sessions/{id}/object',200],
 [U+'complete']:['POST','/api/attachment-upload-sessions/{id}:complete',200],
 [U+'abort']:['POST','/api/attachment-upload-sessions/{id}:abort',200],
 [A+'get']:['GET','/api/attachments/{id}',200],
 [A+'update']:['PATCH','/api/attachments/{id}',200],
 [A+'markFinal']:['POST','/api/attachments/{id}:mark-final',200],
 [A+'clearFinal']:['POST','/api/attachments/{id}:clear-final',200],
 [A+'void']:['POST','/api/attachments/{id}:void',200],
 [A+'link']:['POST','/api/attachments/{id}/links',200],
 [A+'unlink']:['DELETE','/api/attachments/{id}/links/{linkId}',200],
 [A+'download']:['GET','/api/attachments/{id}/download',200],
});
const COMPLETE_POINTS=['oldflag','attachment-insert','second-link','session-completed','audit','deferred-audit'];
const MUTATIONS=['metadata','final','void','link','unlink','abort'];
export const CASES78=Object.freeze([
 ...COMPLETE_POINTS.map(p=>'complete-'+p),
 ...MUTATIONS.map(m=>m+'-audit-fault'),
 'two-version-sessions-one-head',
 'void-history-next-version','put-size-63','put-size-65','actual-read-size-63','actual-read-size-65',
]);
const uid=s=>{assert.match(s??'',/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);return s;};
const ver=s=>{assert(Number.isSafeInteger(s?.rowVersion)&&s.rowVersion>0,'fresh actual Session rowVersion');return s.rowVersion;};
const data=r=>r.body?.data??r.body;
const sorted=a=>a.map(x=>JSON.stringify(x)).sort();
const targets=links=>sorted(links.filter(l=>l.status==='active').map(l=>[l.targetType??l.target_type,l.targetId??l.target_id,l.relationType??l.relation_type]));
const business=s=>({attachments:s.attachments,links:s.links,sessions:s.sessions,audits:s.audits});
export function contextFromPublic71(before,{author,tag='k78'}={}) {
 const c=before.context??before;assert(c.environment?.namespace==='poms-r4def');
 return {tag,projectId:uid(c.projectId),contractId:uid(c.contractId),attachmentCategory:c.attachmentCategory,author:author??c.author,environment:c.environment};
}
export function createK78(context,hooks={},options={}) {
 const selected=options.cases??CASES78;assert(Array.isArray(selected)&&selected.length&&selected.every(n=>CASES78.includes(n))&&new Set(selected).size===selected.length);
 const records=[],observations=[],stages=selected.map(name=>({name,status:'not-run'})),owned={sessions:[],attachments:[],groups:[]};
 let current='not-run',started=false,sequence=0;
 const actor=context.author;
 function meta(op,id,expected){const [method,path]=OPS78[op];return{method,path:path.replaceAll('{id}',typeof id==='object'?id.id:id??'').replaceAll('{linkId}',typeof id==='object'?id.linkId:''),caseId:'K78-'+current,stepId:'K78-'+(++sequence),expectedStatus:expected};}
 async function raw(op,id=null,body=null,expected=OPS78[op][2],binary=false){
  const m=meta(op,id,expected), record={operationId:op,...m,status:'requested',actorId:actor.id};records.push(record);
  const fn=binary?hooks.binaryRequest:hooks.request;assert.equal(typeof fn,'function');
  const r=await fn(op,id,body,actor,m);assert(r?.receiptId&&Number.isInteger(r.status),'actual HTTP receipt required');
  Object.assign(record,{receiptId:r.receiptId,requestId:r.requestId??null,httpStatus:r.status,status:(Array.isArray(expected)?expected:[expected]).includes(r.status)?'passed':'failed'});
  assert.equal(record.status,'passed',r.receiptId);return r;
 }
 const call=async(...args)=>data(await raw(...args));
 const getSession=id=>call(U+'get',id);
 const get=id=>call(A+'get',id);
 const addContract=(base,relation='evidence')=>call(A+'link',base.id,{targetType:'contract',targetId:context.contractId,relationType:relation});
 function createBody(label,base=null,size=64){return{operationType:base?'create-version':'create-attachment',...(base?{baseAttachmentId:base.id,changeNote:context.tag+'-'+label}:{targetType:'project',targetId:context.projectId,category:context.attachmentCategory,securityLevel:'normal',relationType:'normal'}),originalName:context.tag+'-'+label+'.pdf',displayName:context.tag+'-'+label,mimeType:'application/pdf',sizeBytes:size,checksumSha256:SHA78};}
 async function prepare(label,base=null){
  const body=createBody(label,base),s=await call(U+'create',null,body);uid(s.id);owned.sessions.push(s.id);
  const fresh=await getSession(s.id),target=await call(U+'createUploadTarget',s.id,{expectedVersion:ver(fresh)});
  assert.equal(target.uploadMode,'proxy','This suite requires the actual owned local proxy provider, not simulated S3');
  assert.equal(target.method,'PUT');assert.equal(target.url,`/api/attachment-upload-sessions/${s.id}/object`);
  await raw(U+'proxyUploadObject',s.id,BYTES78,200,true);
  const uploaded=await getSession(s.id);assert.equal(uploaded.status,'uploaded');assert.equal(uploaded.checksumSha256,SHA78);
  return{sessionId:s.id,body,base,session:uploaded};
 }
 async function completeRequest(p,expected=200){const s=await getSession(p.sessionId);return raw(U+'complete',p.sessionId,{expectedVersion:ver(s),checksumSha256:SHA78},expected);}
 function scope(base,p,extra={}) {return{actorId:actor.id,sessionIds:p?[p.sessionId]:[],attachmentIds:base?[base.id]:[],groupIds:base?[base.versionGroupId??base.id]:[],...extra};}
 async function observe(s,label){assert.equal(typeof hooks.observe,'function','Root independent PG observer required');const r=await hooks.observe(s,{caseId:current,label,readOnly:true});assert(r?.receiptId&&r.body);observations.push({kind:'PG',caseId:current,label,receiptId:r.receiptId,status:'passed'});return r.body;}
 async function objectProof(s,label){assert.equal(typeof hooks.observeObjects,'function','Root actual read-only owned object observer required');const r=await hooks.observeObjects(s,{caseId:current,label,readOnly:true});assert(r?.receiptId&&Array.isArray(r.body));for(const item of r.body){if(item.kind==='attachment'||(item.kind==='staging'&&item.status==='uploaded')){assert(item.exists);assert.equal(item.bytes,64);assert.equal(item.sha256,SHA78);}}observations.push({kind:'object',caseId:current,label,receiptId:r.receiptId,status:'passed'});return r.body;}
 async function download(a){const r=await raw(A+'download',a.id,null,200,true);assert(r.bytes instanceof Uint8Array);assert.equal(r.bytes.length,64);assert.equal(sha(r.bytes),SHA78);}
 async function published(p,a){
  uid(a.id);owned.attachments.push(a.id);owned.groups.push(a.versionGroupId??a.id);
  const s=await observe(scope(a,p),'published'),row=s.attachments.find(r=>r.id===a.id),session=s.sessions.find(r=>r.id===p.sessionId);assert(row&&session);
  assert.equal(session.status,'completed');assert.equal(session.completed_attachment_id,a.id);assert.equal(session.created_by,actor.id);
  assert.equal(row.storage_provider,session.provider_type);assert.equal(row.storage_bucket??null,session.storage_bucket??null);assert.notEqual(row.storage_key,session.storage_key);
  assert.equal(Number(row.size_bytes),64);assert.equal(row.checksum_sha256,SHA78);assert.equal(session.checksum_sha256,SHA78);
  const group=s.attachments.filter(r=>(r.version_group_id??r.id)===(a.versionGroupId??a.id));assert.equal(group.filter(r=>r.status==='active'&&r.is_latest).length,1);assert(group.filter(r=>r.status==='active'&&r.is_final).length<=1);
  assert.deepEqual(targets(a.links),targets(s.links.filter(r=>r.attachment_id===a.id)));
  if(p.base){assert.equal(a.previousAttachmentId,p.base.id);assert.deepEqual(targets(a.links),targets(p.base.links));}
  await download(a);return a;
 }
 async function finish(p){return published(p,data(await completeRequest(p)));}
 async function base(label){const p=await prepare(label);let a=await finish(p);a=await addContract(a);a=await call(A+'markFinal',a.id,{note:context.tag+' independent test group'});assert(a.isFinal);assert.equal(a.links.filter(l=>l.status==='active').length,2);return a;}
 async function fault(plan,invoke){
  assert.equal(typeof hooks.fault,'function','Root owned-only fault adapter required');
  const r=await hooks.fault(plan,invoke);assert(r?.receiptId&&r.before?.receiptId&&r.blocked?.receiptId&&r.after?.receiptId,'actual independent fault originals required');
  if(plan.conditional&&r.notReached){assert.equal(r.response.status,200);return r;}
  assert(r.hit?.pid&&r.hit?.granted===false,'observed actual app advisory waiter required');assert.equal(r.response.status,500);
  assert.deepEqual(business(r.blocked.body),business(r.before.body),'uncommitted owned business must be invisible');
  assert.deepEqual(business(r.after.body),business(r.before.body),'all owned business/audit rolled back');
  assert.deepEqual(r.after.body.authSessions,r.blocked.body.authSessions,'managed auth rolls back to actual post-eager baseline');
  observations.push({kind:'fault',caseId:current,receiptId:r.receiptId,status:'passed',point:plan.point});return r;
 }
 async function completeFault(point){
  const b=await base('cf-'+point),p=await prepare('cf-'+point+'-new',b),s=scope(b,p),parent={version_group_id:b.versionGroupId,previous_attachment_id:b.id,change_note:p.body.changeNote};
  let target={table:'attachment',event:'UPDATE',match:{id:b.id},nth:1};
  if(point==='attachment-insert')target={table:'attachment',event:'INSERT',match:parent,nth:1};
  if(point==='second-link')target={table:'attachment_link',event:'INSERT',match:{status:'active'},parentAttachment:parent,nth:2};
  if(point==='session-completed')target={table:'attachment_upload_session',event:'UPDATE',match:{id:p.sessionId,status:'completed'},nth:1};
  if(point==='audit'||point==='deferred-audit')target={table:'audit_log',event:'INSERT',match:{event_type:'attachment.version_created'},metadata:{uploadSessionId:p.sessionId},nth:1,deferred:point==='deferred-audit'};
  if(point==='pending-auth'){
   if(typeof hooks.actualAuthSession!=='function')return{notRun:'actual-current-auth-session-proof-required'};
   const auth=await hooks.actualAuthSession(actor);assert(auth?.receiptId);uid(auth.sessionId);s.authSessionIds=[auth.sessionId];
   target={table:'auth_session',event:'UPDATE',match:{id:auth.sessionId},queryContains:'status=CASE WHEN',nth:1};
  }
  const plan={caseId:current,point,scope:s,target,conditional:point==='pending-auth',commitDisposition:target.deferred?'unknown-retain':'known-rollback',sourceSessionId:p.sessionId};
  const result=await fault(plan,()=>completeRequest(p,500));
  if(result.notReached){await published(p,data(result.response));return{notApplicable:'no-managed-auth-UPDATE-observed-with-owned-query-filter',receiptId:result.receiptId};}
  const after=await getSession(p.sessionId);assert.equal(after.status,'uploaded');assert.equal(after.completedAttachmentId,null);
  await download(b);await objectProof(s,'source-after-fault');
  const retry=await completeRequest(p);await published(p,data(retry));await hooks.retry?.(plan,result,retry);
 }
 async function mutationFault(kind,point){
  let b=await base('mf-'+kind+'-'+point),p=null,id=b.id,op,body,event,table='attachment',match={id:b.id},sourceLink;
  if(kind==='metadata'){op=A+'update';body={displayName:context.tag+' corrected metadata',description:'owned K78 single transaction'};event='attachment.metadata_updated';}
  if(kind==='final'){await call(A+'clearFinal',b.id,{reason:'prepare real final transfer'});op=A+'markFinal';body={note:'owned K78 final'};event='attachment.final_marked';}
  if(kind==='clear-final'){op=A+'clearFinal';body={reason:'owned K78 clear'};event='attachment.final_cleared';}
  if(kind==='void'){op=A+'void';body={reason:'owned K78 void'};event='attachment.voided';}
  if(kind==='link'){op=A+'link';body={targetType:'contract',targetId:context.contractId,relationType:'source'};event='attachment.linked';table='attachment_link';match={attachment_id:b.id,target_type:'contract',target_id:context.contractId,relation_type:'source'};}
  if(kind==='unlink'){sourceLink=b.links.find(l=>l.targetType==='contract'&&l.relationType==='evidence');uid(sourceLink?.id);op=A+'unlink';id={id:b.id,linkId:sourceLink.id};body=null;event='attachment.unlinked';table='attachment_link';match={id:sourceLink.id};}
  if(kind==='abort'){p=await prepare('mf-abort-'+point,b);op=U+'abort';id=p.sessionId;event='attachment_upload_session.aborted';table='attachment_upload_session';match={id:p.sessionId,status:'aborted'};}
  const s=scope(b,p),target=point==='audit'?{table:'audit_log',event:'INSERT',match:{event_type:event,target_id:typeof id==='object'?id.id:id},nth:1}:{table,event:kind==='link'?'INSERT':'UPDATE',match,nth:1};
  const plan={caseId:current,point,scope:s,target,sourceSessionId:p?.sessionId??null};
  const invoke=async()=>{if(kind==='abort'){const fresh=await getSession(p.sessionId);body={expectedVersion:ver(fresh),reason:'owned K78 abort'};}return raw(op,id,body,500);};
  // Root fault adapter validates the response. Accept 200 only on the one retry.
  const result=await fault(plan,invoke);await download(b);await objectProof(s,'mutation-fault-preserves-objects');
  if(kind==='abort'){const fresh=await getSession(p.sessionId);body={expectedVersion:ver(fresh),reason:'owned K78 abort retry'};}
  const retry=await raw(op,id,body);const after=await observe(s,'mutation-retry');
  if(kind==='abort'){assert.equal(after.sessions.find(x=>x.id===p.sessionId)?.status,'aborted');const objects=await objectProof(s,'abort-after-ACK');assert(objects.some(x=>x.kind==='staging'&&x.sessionId===p.sessionId&&x.exists===false));}
  else {if(kind!=='void')b=await get(b.id);const row=after.attachments.find(x=>x.id===b.id);assert(row);if(kind==='void')assert.equal(row.status,'voided');if(kind==='metadata')assert.equal(row.display_name,body.displayName);if(kind==='final')assert(row.is_final);if(kind==='link')assert(after.links.some(l=>l.attachment_id===b.id&&l.relation_type==='source'&&l.status==='active'));if(kind==='unlink')assert.equal(after.links.find(l=>l.id===sourceLink.id)?.status,'unlinked');}
  await hooks.retry?.(plan,result,retry);
 }
 async function concurrent(mode){
  const b=await base('race-'+mode),p=await prepare('race-'+mode+'-one',b),q=mode==='two-version-sessions-one-head'?await prepare('race-'+mode+'-two',b):p;
  assert.equal(typeof hooks.concurrency?.group,'function');
  const s=scope(b,p,{sessionIds:[...new Set([p.sessionId,q.sessionId])]});
  const result=await hooks.concurrency.group({groupId:b.versionGroupId,sessionIds:s.sessionIds,scope:s,sameSession:p===q},[()=>raw(U+'complete',p.sessionId,{expectedVersion:ver(p.session),checksumSha256:SHA78},[200,409]),()=>raw(U+'complete',q.sessionId,{expectedVersion:ver(q.session),checksumSha256:SHA78},[200,409])]);
  assert(result?.receiptId&&result.barrier?.proven);assert.deepEqual(result.responses.map(r=>r.status).sort(),[200,409]);
  const winner=result.responses.find(r=>r.status===200),a=data(winner);const winningSession=(await getSession(p.sessionId)).completedAttachmentId===a.id?p:q;await published(winningSession,a);
  const observed=await observe(s,'race-after');assert.equal(observed.attachments.filter(a=>a.previous_attachment_id===b.id).length,1);assert.equal(observed.attachments.filter(a=>a.status==='active'&&a.is_latest).length,1);
 }
 async function linkRace(remove){
  let b=await base('race-link-'+remove);const p=await prepare('race-link-'+remove+'-new',b);const s=scope(b,p);
  assert.equal(typeof hooks.concurrency?.session,'function');
  const old=await observe(s,'before-link-race'),oldV=old.attachments.find(a=>a.id===b.id).row_version;
  const r=await hooks.concurrency.session({sessionId:p.sessionId,scope:s},()=>raw(U+'complete',p.sessionId,{expectedVersion:ver(p.session),checksumSha256:SHA78},409),async()=>{
   if(remove){const l=b.links.find(l=>l.targetType==='contract'&&l.relationType==='evidence');await call(A+'unlink',{id:b.id,linkId:uid(l?.id)},null);}else{await addContract(b,'source');}
  });
  assert(r?.receiptId&&r.barrier?.proven);assert.equal(r.response.status,409);
  const changed=await observe(s,'after-link-race');assert.equal(changed.attachments.find(a=>a.id===b.id).row_version,oldV,'Link change must be caught even when headVersion is unchanged');
  assert.equal(changed.attachments.length,1);b=await get(b.id);p.base=b;await finish(p);
 }
 async function noop(inactive){
  let b=await base('noop-'+inactive);const old=b.links.find(l=>l.targetType==='contract'&&l.relationType==='evidence');uid(old?.id);
  if(inactive){await call(A+'unlink',{id:b.id,linkId:old.id},null);b=await get(b.id);}
  const s=scope(b,null);assert.equal(typeof hooks.concurrency?.noop,'function');
  const before=await observe(s,'noop-before');
  const r=await hooks.concurrency.noop({groupId:b.versionGroupId,scope:s},()=>inactive?raw(A+'unlink',{id:b.id,linkId:old.id},null):raw(A+'link',b.id,{targetType:'contract',targetId:context.contractId,relationType:'evidence'}));
  assert(r?.receiptId&&r.barrier?.proven);assert.equal(r.response.status,200);
  const after=await observe(s,'noop-after');assert.deepEqual(business(after),business(before),'No-op must not mutate business versions, tuples or emit another business audit');await download(b);
 }
 async function history(){const b=await base('history-one'),p=await prepare('history-two',b),v2=await finish(p);await call(A+'void',v2.id,{reason:'real void before reappend'});const restored=await get(b.id);assert(restored.isLatest);const q=await prepare('history-three',restored),v3=await finish(q);assert.equal(v3.versionNo,3);assert.equal(v3.previousAttachmentId,b.id);const r=await observe(scope(b,q),'max-history');assert.deepEqual(r.attachments.map(a=>Number(a.version_no)).sort((a,b)=>a-b),[1,2,3]);}
 async function sizeGuard(size){const body=createBody('put-size-'+size),s=await call(U+'create',null,body);owned.sessions.push(s.id);await call(U+'createUploadTarget',s.id,{expectedVersion:ver(s)});await raw(U+'proxyUploadObject',s.id,new Uint8Array(size).fill(65),400,true);const observed=await observe({actorId:actor.id,sessionIds:[s.id],attachmentIds:[],groupIds:[]},'wrong-PUT-size');assert.equal(observed.sessions[0].completed_attachment_id,null);assert(!observed.sessions[0].completed_at);assert.equal(observed.attachments.length,0);}
 async function actualRead(size){
  if(typeof hooks.withActualReadFault!=='function')return{notRun:'Root-actual-owned-read-fault-hook-required; proxy-PUT400-is-not-complete-reader-coverage'};
  const b=await base('actual-read-'+size),p=await prepare('actual-read-'+size+'-new',b),s=scope(b,p);
  const r=await hooks.withActualReadFault({sessionId:p.sessionId,scope:s,declaredSize:64,actualReadSize:size,expectedChecksum:SHA78,producerReceiptRule:'Already produced by real 64-byte HTTP; fault is read-path corruption only, never a fabricated Session/Attachment'},()=>raw(U+'complete',p.sessionId,{expectedVersion:ver(p.session),checksumSha256:SHA78},409));
  assert(r?.receiptId&&r.realReadBytes===size&&r.response.status===409);const after=await observe(s,'actual-read-rejected');assert.equal(after.attachments.length,1);assert.equal(after.sessions.find(x=>x.id===p.sessionId).status,'uploaded');assert.equal(after.sessions.find(x=>x.id===p.sessionId).completed_attachment_id,null);await download(b);
 }
 const jobs=Object.fromEntries(CASES78.map(name=>[name,async()=>{
  if(name.startsWith('complete-'))return completeFault(name.slice(9));
  for(const kind of MUTATIONS){if(name===kind+'-business-fault')return mutationFault(kind,'business');if(name===kind+'-audit-fault')return mutationFault(kind,'audit');}
  if(name.startsWith('two-'))return concurrent(name);
  if(name==='noop-existing-link-group')return noop(false);if(name==='noop-inactive-unlink-group')return noop(true);
  if(name==='link-add-before-group')return linkRace(false);if(name==='unlink-before-group')return linkRace(true);
  if(name==='void-history-next-version')return history();
  if(name.startsWith('put-size-'))return sizeGuard(Number(name.slice(9)));
  if(name.startsWith('actual-read-size-'))return actualRead(Number(name.slice(17)));
  assert.fail('closed K78 case');
 }]));
 return {
  manifest:()=>({kind:'K78-request-only-candidate',stages:structuredClone(stages),mandatoryCases:selected.filter(n=>!n.startsWith('actual-read-')),optionalRootHookCases:selected.filter(n=>n.startsWith('actual-read-')),omittedCasesNotRun:CASES78.filter(n=>!selected.includes(n)),witness:{bytes:64,sha256:SHA78},authorExecutedHTTP:false,authorExecutedPG:false,authorExecutedObjectIO:false,latePUTSchemeRepeated:false,SQLBusinessProducerUsed:false,S3Accepted:false,G3Certified:false,G4Certified:false}),
  async runAll(){assert(!started,'single-use suite');started=true;uid(context.projectId);uid(context.contractId);uid(actor?.id);assert(Array.isArray(actor.permissions));assert.equal(context.environment?.namespace,'poms-r4def');assert.match(context.tag,/^[a-z0-9_-]{1,12}$/);let failed=null;
   for(const stage of stages){current=stage.name;try{const r=await jobs[current]();Object.assign(stage,r?.notRun?{status:'not-run',reason:r.notRun}:r?.notApplicable?{status:'not-applicable',reason:r.notApplicable,receiptId:r.receiptId}:{status:'passed'});}catch(e){stage.status='failed';stage.error=e.message;failed=current;break;}}
   return{kind:'K78-actual-run-result',completed:stages.filter(s=>!s.name.startsWith('actual-read-')).every(s=>['passed','not-applicable'].includes(s.status)),completeAll16Core:CASES78.filter(n=>!n.startsWith('actual-read-')).every(n=>stages.some(s=>s.name===n&&s.status==='passed')),omittedCasesNotRun:CASES78.filter(n=>!selected.includes(n)),actualCompleteReadFaultCovered:CASES78.filter(n=>n.startsWith('actual-read-')).every(n=>stages.some(s=>s.name===n&&s.status==='passed')),failed,stages,records,observations,owned,latePUTSchemeRepeated:false,SQLBusinessProducerUsed:false,S3Accepted:false,G3Certified:false,G4Certified:false};
  }
 };
}
