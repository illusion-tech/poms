// Only the real original UI4 package-create browser request may reserve items before its package UUID
// exists. This is not a certificate, parent placeholder or generic intent bypass.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {SourceReader} from './acceptance-source.mjs';
const ROOT=path.resolve(import.meta.dirname,'../..'),MARKER='abd093b8-c584-45b3-9c62-6357ad6dfa5d';
const CASE='m.ui4.integration',PARENT='attachment_download_package',CHILD='attachment_download_package_item';
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>sha(JSON.stringify(canonical(value)));
const uuid=value=>{assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));return value};
const SOURCE='tools/rust-r2m-continuation01/fixture-ui-package-intent.mjs';
export const uiPackageIntentSources=Object.freeze([{"file":"tools/rust-r2m-continuation01/ui-runtime-sources.mjs","rawBytesSha256":"de73fde59ba3256355d2e8e23c414cb09bd4868e102ac2a42deedff705082003"},{"file":"tools/rust-r2m-continuation01/acceptance-ui-browser.mjs","rawBytesSha256":"9b6efbc89c412ba3c6bbffa39b147f3fb0f045e85d8c0727276624043cbb28d9"},{"file":"libs/admin/data-access/src/lib/project/project-workspace.store.ts","rawBytesSha256":"64f98b48536e824ecd929625d130751ddd97148c798d40409e448ab632206443"},{"file":"apps/poms-admin/src/app/features/project/project-contract-handover.ts","rawBytesSha256":"a396a1a906363c6755089b5104810030063ffb3f72fbcdef727432513ec48261"},{"file":"apps/poms-api/src/app/features/attachment/attachment.service.ts","rawBytesSha256":"b5362da2690283fa930740bf3dbbdc77f56a7429613d64394bd726094cd9cbf2"},{"file":"apps/poms-api/src/app/features/attachment/attachment.repository.ts","rawBytesSha256":"9bfc1074b3ebe6a3baa2499425439ffce4ef939612c464a9a81779715c15da5f"}].map(Object.freeze));
const verifiedSource=new Set();
function verifySources(sourceCapId){
 assert(typeof sourceCapId==='string'&&/^r2m-[a-z0-9-]{1,64}$/.test(sourceCapId));
 if(verifiedSource.has(sourceCapId))return;
 const reader=new SourceReader({root:ROOT,pins:uiPackageIntentSources,sourceEpoch:sourceCapId});for(const pin of uiPackageIntentSources)reader.read(pin.file);reader.assertUnchanged();verifiedSource.add(sourceCapId);
}
function own(journal,table,id){
 const found=journal.objects.filter(row=>row.table===table&&row.id===uuid(id));assert.equal(found.length,1,'An exact previously certified typed row is required');const item=found[0];assert(item.creationProof&&item.postcondition?.independentlyVisible===true);return item;
}
const parentBefore=intent=>({id:intent.id,table:intent.table,selector:structuredClone(intent.selector),caseId:intent.caseId,expectedMax:intent.expectedMax,beforeObserved:intent.beforeObserved,beforeIds:[...intent.beforeIds]});
function exactContext(proof,context){
 assert(['mikro-orm-afterCreate-outer-commit','pg-after-insert-observed-outer-commit'].includes(proof?.kind),'Generated package relation needs a genuine registered SDK/PG create proof');
 for(const key of['runId','caseId','index','op'])assert.equal(proof.createContext?.[key],context[key],'Package relation must keep the original actual request context');
 if(proof.kind==='mikro-orm-afterCreate-outer-commit')for(const key of['runId','caseId','index','op'])assert.equal(proof.commitContext?.[key],context[key],'Package relation requires its actual outer-COMMIT context');
}
function requestProjection(request){
 assert(request?.logicalCase==='UI4'&&request.stepId==='package-create'&&request.method==='POST');const body=request.body;assert(body&&typeof body==='object'&&!Array.isArray(body));assert.deepEqual(Object.keys(body).sort(),['selectionIds','expectedSelectionVersions','confirmedSensitiveExclusion','note'].sort());assert(body.confirmedSensitiveExclusion===true&&body.note==='由项目移交页面创建');assert(Array.isArray(body.selectionIds)&&body.selectionIds.length===1&&Array.isArray(body.expectedSelectionVersions)&&body.expectedSelectionVersions.length===1);const selectionId=uuid(body.selectionIds[0]),version=body.expectedSelectionVersions[0];assert.deepEqual(Object.keys(version).sort(),['selectionId','rowVersion'].sort());assert(version.selectionId===selectionId&&Number.isSafeInteger(version.rowVersion)&&version.rowVersion>=0);
 const match=/^\/api\/project-handovers\/([0-9a-f-]{36})\/attachment-download-packages$/.exec(request.path);assert(match);uuid(match[1]);return{logicalCase:'UI4',stepId:'package-create',method:'POST',path:request.path,body:structuredClone(body),handoverId:match[1],selectionId,rowVersion:version.rowVersion};
}
function validateApproval(approval,entry,journal){
 assert(approval?.kind==='Root-R2M-exact-UI4-package-item-before-intent-admission'&&approval.rootApproved===true&&approval.namespace==='poms-r2m'&&approval.marker===MARKER);
 for(const[key,value]of Object.entries({runId:journal.runId,backend:journal.backend,database:'poms_r2m_c01_'+journal.backend,sourceCapId:entry.sourceCapId}))assert.equal(approval[key],value);
 assert.equal(approval.logicalCase,'UI4');assert.equal(approval.stepId,'package-create');assert.equal(approval.caseId,CASE);assert.equal(approval.maximumItems,64);
 assert(approval.sourceReview&&/^[0-9a-f]{64}$/.test(approval.sourceReview.rawBytesSha256)&&/^docs\/design\/rust-r2m\/[a-z0-9-]+\.json$/.test(approval.sourceReview.file));
}
export function validateUiPackageReservation(entry,journal){
 assert(entry?.kind==='R2M-exact-UI4-package-generated-parent-before-intent'&&entry.ownershipGranted===false&&entry.placeholderParentCreated===false);
 uuid(entry.id);assert.equal(journal.namespace,'poms-r2m');assert.equal(journal.marker,MARKER);assert.equal(journal.database,'poms_r2m_c01_'+journal.backend);
 assert(entry.context?.runId===journal.runId&&entry.context.caseId===CASE&&Number.isSafeInteger(entry.context.index)&&entry.context.index>=0&&entry.context.index<=1000000&&entry.context.op==='m.http');
 verifySources(entry.sourceCapId);assert.equal(digest(entry.sources),digest(uiPackageIntentSources));assert.equal(digest(entry.request),digest(requestProjection(entry.request)));
 validateApproval(entry.approval,entry,journal);assert.equal(entry.approvalSha256,digest(entry.approval));
 const scope=journal.cases.find(row=>row.caseId===CASE);assert(scope&&scope.actors.includes(entry.actorId)&&scope.projects.includes(entry.projectId));own(journal,'platform_user',entry.actorId);own(journal,'project',entry.projectId);
 const handover=own(journal,'project_handover',entry.request.handoverId);assert.equal(handover.identity.project_id,entry.projectId);
 const selected=own(journal,'project_handover_attachment_selection',entry.request.selectionId);assert(selected.identity.handover_id===entry.request.handoverId&&selected.identity.project_id===entry.projectId);const selectionBefore=entry.selectionBefore;assert(selectionBefore?.independentlyReadCurrentRow===true&&selectionBefore.id===selected.id&&selectionBefore.creationProofSha256===digest(selected.creationProof)&&selectionBefore.row.row_version===entry.request.rowVersion&&selectionBefore.row.status==='included'&&/^[0-9]+$/.test(selectionBefore.xmin));for(const[key,value]of Object.entries(selected.identity))assert.equal(digest(selectionBefore.row[key]),digest(value));assert(selectionBefore.row.attachment_id);own(journal,'attachment',selectionBefore.row.attachment_id);

 const parent=journal.intents.find(row=>row.id===entry.parentIntentId);assert(parent&&parent.table===PARENT&&parent.caseId===CASE&&parent.beforeObserved===true&&parent.expectedMax===1&&['planned','adopted','absent'].includes(parent.state));
 assert.deepEqual(Object.keys(parent.selector).sort(),['handover_id','project_id','created_by'].sort());assert.deepEqual(parent.selector,{handover_id:entry.request.handoverId,project_id:entry.projectId,created_by:entry.actorId});
 assert.equal(digest(parentBefore(parent)),digest(entry.parentBefore));assert.equal(parent.uiGeneratedPackageReservationId,entry.id);assert.equal(parent.uiGeneratedPackageRole,'parent');assert.equal(parent.contextIndex,entry.context.index);
 const child=journal.intents.find(row=>row.id===entry.childIntentId);assert(child&&child.table===CHILD&&child.caseId===CASE&&child.beforeObserved===true&&['planned','adopted','absent'].includes(child.state));
 assert.equal(digest(parentBefore(child)),digest(entry.childBefore),'Original child before-query/selector/max evidence is immutable');
 assert.deepEqual(child.selector,{handover_id:entry.request.handoverId});assert(Number.isSafeInteger(entry.expectedMax)&&entry.expectedMax>0&&entry.expectedMax<=64);assert.equal(child.expectedMax,entry.expectedMax);assert.equal(child.uiGeneratedPackageReservationId,entry.id);assert.equal(child.uiGeneratedPackageRole,'child');assert.equal(child.contextIndex,entry.context.index);
 for(const intent of[parent,child]){assert(Array.isArray(intent.beforeIds)&&new Set(intent.beforeIds).size===intent.beforeIds.length);intent.beforeIds.forEach(uuid)}
 return entry;
}
export function uiGeneratedPackageForIntent(journal,intent,context){
 if(!intent.uiGeneratedPackageReservationId)return null;
 const entry=journal.uiGeneratedPackageReservations?.find(row=>row.id===intent.uiGeneratedPackageReservationId);assert(entry);validateUiPackageReservation(entry,journal);
 assert(intent.id===(intent.uiGeneratedPackageRole==='parent'?entry.parentIntentId:entry.childIntentId));assert(['parent','child'].includes(intent.uiGeneratedPackageRole));
 if(context)for(const key of['runId','caseId','index','op'])assert.equal(context[key],entry.context[key]);return entry;
}
export function assertUiGeneratedPackageProof(journal,item,intent){
 const entry=uiGeneratedPackageForIntent(journal,intent,item.proof?.createContext);if(!entry)return;
 exactContext(item.proof,entry.context);
}
export function assertUiGeneratedPackageItemBinding(journal,item,additional=[]){
 const intent=journal.intents.find(row=>row.id===item.intentId);if(!intent?.uiGeneratedPackageReservationId)return;
 const entry=uiGeneratedPackageForIntent(journal,intent,item.proof?.createContext);exactContext(item.proof,entry.context);
 if(intent.uiGeneratedPackageRole==='parent')return;
 const certified=journal.committedCreates.filter(row=>row.table===PARENT&&row.intentId===entry.parentIntentId);assert.equal(certified.length,1,'One exact parent intent must have its own actual committed birth');const certificate=certified[0];exactContext(certificate.proof,entry.context);
 const parentCandidates=[...additional,...journal.objects].filter(row=>row.table===PARENT&&row.id===certificate.id&&(row.proof??row.creationProof)&&row.postcondition?.independentlyVisible===true);
 assert(parentCandidates.length>0,'Generated package parent needs its independent actual row capture');
 for(const candidate of parentCandidates){const proof=candidate.proof??candidate.creationProof;assert.equal(digest(proof),digest(certificate.proof));const row=candidate.row??candidate.identity;assert.equal(row.id,certificate.id);for(const[key,value]of Object.entries(entry.parentBefore.selector))assert.equal(row[key],value)}
 assert.equal(item.row.package_id,certificate.id,'A child may not bind another previously owned package');assert.equal(item.row.handover_id,entry.request.handoverId);
 // Original assertRowReferences/resolveOwnedProjectIds still run immediately
 // after this check with the actual independently captured whole cohort.
}
export async function intentForUiGeneratedPackageItems(fixture,{caseId,index,op,sourceCapId,request,parentIntentId,expectedMax=64},approval){
 assert(fixture.j.state==='prepared'&&!fixture.j.writerDrain&&caseId===CASE&&op==='m.http'&&Number.isSafeInteger(index)&&index>=0&&index<=1000000);
 assert(fixture.j.namespace==='poms-r2m'&&fixture.j.marker===MARKER&&fixture.j.runId===fixture.runId&&['nest','rust'].includes(fixture.j.backend)&&fixture.j.database==='poms_r2m_c01_'+fixture.j.backend);
 const projected=requestProjection(request),parent=fixture.j.intents.find(row=>row.id===uuid(parentIntentId));assert(parent&&parent.state==='planned'&&parent.beforeObserved===true&&parent.table===PARENT&&parent.caseId===CASE&&parent.expectedMax===1&&!parent.uiGeneratedPackageReservationId&&!parent.uiGeneratedPackageRole);
 assert(!Object.hasOwn(parent,'contextIndex')||parent.contextIndex===index,'Parent intent cannot be rebound from another actual index');
 assert.deepEqual(Object.keys(parent.selector).sort(),['handover_id','project_id','created_by'].sort());assert.equal(parent.selector.handover_id,projected.handoverId);assert.equal(parent.selector.created_by,fixture.actors.admin);
 const scope=fixture.scope(CASE),projectId=uuid(parent.selector.project_id),actorId=uuid(parent.selector.created_by);assert(scope.projects.includes(projectId)&&scope.actors.includes(actorId));own(fixture.j,'project',projectId);own(fixture.j,'platform_user',actorId);assert.equal(own(fixture.j,'project_handover',projected.handoverId).identity.project_id,projectId);
 assert(Number.isSafeInteger(expectedMax)&&expectedMax>0&&expectedMax<=64);assert(!(fixture.j.uiGeneratedPackageReservations??[]).some(row=>row.parentIntentId===parent.id||row.context.index===index||row.request.stepId==='package-create'),'This one named source step cannot reserve another index or parent');
 assert(!fixture.j.intents.some(row=>row.caseId===CASE&&row.table===CHILD&&row.state==='planned'));
 const entry={kind:'R2M-exact-UI4-package-generated-parent-before-intent',id:randomUUID(),sourceCapId,sources:structuredClone(uiPackageIntentSources),context:{runId:fixture.runId,caseId,index,op},request:projected,parentIntentId:parent.id,parentBefore:parentBefore(parent),actorId,projectId,expectedMax,approval:structuredClone(approval),approvalSha256:digest(approval),ownershipGranted:false,placeholderParentCreated:false};validateApproval(approval,entry,fixture.j);verifySources(sourceCapId);
 const reviewReader=new SourceReader({root:ROOT,pins:[approval.sourceReview],sourceEpoch:sourceCapId}),review=reviewReader.json(approval.sourceReview.file);assert.equal(review.result,'SourceReady');for(const file of[SOURCE,'tools/rust-r2m-continuation01/fixture.mjs','tools/rust-r2m-continuation01/fixture-core.mjs','tools/rust-r2m-continuation01/fixture-journal.mjs','tools/rust-r2m-continuation01/fixture-profile.mjs','tools/rust-r2m-continuation01/ui-runtime-full.mjs','tools/rust-r2m-continuation01/windows-ui-runtime.mjs'])assert(review.reviewedSources.some(row=>row.file===file&&row.rawBytesSha256===sha(fs.readFileSync(path.join(ROOT,file)))),'C must bind the actual narrow reservation and each necessary wiring source');
 await fixture.preflight();
 const selected=own(fixture.j,'project_handover_attachment_selection',projected.selectionId);assert(selected.identity.handover_id===projected.handoverId&&selected.identity.project_id===projectId);const selectedRead=await fixture.client.query('select to_jsonb(t) as row,t.xmin::text as xmin from poms."project_handover_attachment_selection" t where id=$1::uuid',[projected.selectionId]);assert.equal(selectedRead.rows.length,1);const current=selectedRead.rows[0];assert(current.row.id===selected.id&&current.row.row_version===projected.rowVersion&&current.row.status==='included'&&/^[0-9]+$/.test(current.xmin));for(const[key,value]of Object.entries(selected.identity))assert.equal(digest(current.row[key]),digest(value));assert(current.row.attachment_id);own(fixture.j,'attachment',current.row.attachment_id);entry.selectionBefore={id:selected.id,row:structuredClone(current.row),xmin:current.xmin,creationProofSha256:digest(selected.creationProof),independentlyReadCurrentRow:true};
 const result=await fixture.client.query('select to_jsonb(t) as row from poms."attachment_download_package_item" t where "handover_id" is not distinct from $1::uuid',[projected.handoverId]);
 for(const{row}of result.rows){const previous=own(fixture.j,CHILD,row.id);for(const[key,value]of Object.entries(previous.identity))assert.equal(digest(row[key]),digest(value),'Reservation before-query cannot claim foreign or changed rows')}
 const child={id:randomUUID(),table:CHILD,selector:{handover_id:projected.handoverId},caseId,expectedMax,beforeObserved:true,beforeIds:result.rows.map(({row})=>uuid(row.id)),state:'planned',uiGeneratedPackageReservationId:entry.id,uiGeneratedPackageRole:'child',contextIndex:index};entry.childIntentId=child.id;entry.childBefore=parentBefore(child);
 parent.uiGeneratedPackageReservationId=entry.id;parent.uiGeneratedPackageRole='parent';parent.contextIndex=index;fixture.j.intents.push(child);fixture.j.uiGeneratedPackageReservations??=[];fixture.j.uiGeneratedPackageReservations.push(entry);validateUiPackageReservation(entry,fixture.j);fixture.save();return structuredClone(child);
}
export function validateUiPackageReservationJournal(journal){
 const entries=journal.uiGeneratedPackageReservations??[];assert(Array.isArray(entries)&&entries.length<=1);for(const entry of entries)validateUiPackageReservation(entry,journal);
 for(const intent of journal.intents)if(intent.uiGeneratedPackageReservationId)uiGeneratedPackageForIntent(journal,intent);
 for(const object of journal.objects.filter(row=>row.table===CHILD)){
  const certificates=journal.committedCreates.filter(row=>row.table===CHILD&&row.id===object.id),reserved=certificates.filter(certificate=>journal.intents.some(intent=>intent.id===certificate.intentId&&intent.uiGeneratedPackageReservationId));
  for(const certificate of reserved){assert.equal(digest(object.creationProof),digest(certificate.proof));assertUiGeneratedPackageItemBinding(journal,{...certificate,row:object.identity},journal.objects)}
 }
}
