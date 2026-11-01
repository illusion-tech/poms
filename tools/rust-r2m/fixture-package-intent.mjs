// Only the named M4.2 package request may reserve items before its package UUID
// exists. This is not a certificate, parent placeholder or generic intent bypass.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {SourceReader} from './acceptance-source.mjs';
const ROOT=path.resolve(import.meta.dirname,'../..'),MARKER='1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5';
const CASE='m4.integration',PARENT='attachment_download_package',CHILD='attachment_download_package_item';
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>sha(JSON.stringify(canonical(value)));
const uuid=value=>{assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));return value};
const SOURCE='tools/rust-r2m/fixture-package-intent.mjs';
export const packageIntentSources=Object.freeze([
 Object.freeze({file:'tools/rust-r2m/scenario-input.mjs',rawBytesSha256:'543627852d74ead5838569e25650e19715c6d83ab6cb85220aab493b997774f7'}),
 Object.freeze({file:'apps/poms-api/src/app/features/attachment/attachment.service.ts',rawBytesSha256:'b5362da2690283fa930740bf3dbbdc77f56a7429613d64394bd726094cd9cbf2'}),
 Object.freeze({file:'apps/poms-api/src/app/features/attachment/attachment.repository.ts',rawBytesSha256:'9bfc1074b3ebe6a3baa2499425439ffce4ef939612c464a9a81779715c15da5f'})
]);
const verifiedSource=new Set();
function verifySources(sourceCapId){
 assert(typeof sourceCapId==='string'&&/^r2m-[a-z0-9-]{1,64}$/.test(sourceCapId));
 if(verifiedSource.has(sourceCapId))return;
 const reader=new SourceReader({root:ROOT,pins:packageIntentSources,sourceEpoch:sourceCapId});for(const pin of packageIntentSources)reader.read(pin.file);reader.assertUnchanged();verifiedSource.add(sourceCapId);
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
 assert(request?.logicalCase==='M4.2'&&request.stepId==='package'&&request.method==='POST');
 assert.deepEqual(request.body,{confirmedSensitiveExclusion:true});
 const match=/^\/api\/project-handovers\/([0-9a-f-]{36})\/attachment-download-packages$/.exec(request.path);assert(match);uuid(match[1]);
 return{logicalCase:'M4.2',stepId:'package',method:'POST',path:request.path,body:structuredClone(request.body),handoverId:match[1]};
}
function validateApproval(approval,entry,journal){
 assert(approval?.kind==='Root-R2M-exact-package-item-before-intent-admission'&&approval.rootApproved===true&&approval.namespace==='poms-r2m'&&approval.marker===MARKER);
 for(const[key,value]of Object.entries({runId:journal.runId,backend:journal.backend,database:'poms_r2m_'+journal.backend,sourceCapId:entry.sourceCapId}))assert.equal(approval[key],value);
 assert.equal(approval.logicalCase,'M4.2');assert.equal(approval.stepId,'package');assert.equal(approval.caseId,CASE);assert.equal(approval.maximumItems,10);
 assert(approval.sourceReview&&/^[0-9a-f]{64}$/.test(approval.sourceReview.rawBytesSha256)&&/^docs\/design\/rust-r2m\/[a-z0-9-]+\.json$/.test(approval.sourceReview.file));
}
export function validatePackageReservation(entry,journal){
 assert(entry?.kind==='R2M-exact-M4-package-generated-parent-before-intent'&&entry.ownershipGranted===false&&entry.placeholderParentCreated===false);
 uuid(entry.id);assert.equal(journal.namespace,'poms-r2m');assert.equal(journal.marker,MARKER);assert.equal(journal.database,'poms_r2m_'+journal.backend);
 assert(entry.context?.runId===journal.runId&&entry.context.caseId===CASE&&Number.isSafeInteger(entry.context.index)&&entry.context.index>=0&&entry.context.index<=1000000&&entry.context.op==='m.http');
 verifySources(entry.sourceCapId);assert.equal(digest(entry.sources),digest(packageIntentSources));assert.equal(digest(entry.request),digest(requestProjection(entry.request)));
 validateApproval(entry.approval,entry,journal);assert.equal(entry.approvalSha256,digest(entry.approval));
 const scope=journal.cases.find(row=>row.caseId===CASE);assert(scope&&scope.actors.includes(entry.actorId)&&scope.projects.includes(entry.projectId));own(journal,'platform_user',entry.actorId);own(journal,'project',entry.projectId);
 const handover=own(journal,'project_handover',entry.request.handoverId);assert.equal(handover.identity.project_id,entry.projectId);
 const parent=journal.intents.find(row=>row.id===entry.parentIntentId);assert(parent&&parent.table===PARENT&&parent.caseId===CASE&&parent.beforeObserved===true&&parent.expectedMax===1&&['planned','adopted','absent'].includes(parent.state));
 assert.deepEqual(Object.keys(parent.selector).sort(),['handover_id','project_id','created_by'].sort());assert.deepEqual(parent.selector,{handover_id:entry.request.handoverId,project_id:entry.projectId,created_by:entry.actorId});
 assert.equal(digest(parentBefore(parent)),digest(entry.parentBefore));assert.equal(parent.generatedPackageReservationId,entry.id);assert.equal(parent.generatedPackageRole,'parent');assert.equal(parent.contextIndex,entry.context.index);
 const child=journal.intents.find(row=>row.id===entry.childIntentId);assert(child&&child.table===CHILD&&child.caseId===CASE&&child.beforeObserved===true&&['planned','adopted','absent'].includes(child.state));
 assert.equal(digest(parentBefore(child)),digest(entry.childBefore),'Original child before-query/selector/max evidence is immutable');
 assert.deepEqual(child.selector,{handover_id:entry.request.handoverId});assert(Number.isSafeInteger(entry.expectedMax)&&entry.expectedMax>0&&entry.expectedMax<=10);assert.equal(child.expectedMax,entry.expectedMax);assert.equal(child.generatedPackageReservationId,entry.id);assert.equal(child.generatedPackageRole,'child');assert.equal(child.contextIndex,entry.context.index);
 for(const intent of[parent,child]){assert(Array.isArray(intent.beforeIds)&&new Set(intent.beforeIds).size===intent.beforeIds.length);intent.beforeIds.forEach(uuid)}
 return entry;
}
export function generatedPackageForIntent(journal,intent,context){
 if(!intent.generatedPackageReservationId)return null;
 const entry=journal.generatedPackageReservations?.find(row=>row.id===intent.generatedPackageReservationId);assert(entry);validatePackageReservation(entry,journal);
 assert(intent.id===(intent.generatedPackageRole==='parent'?entry.parentIntentId:entry.childIntentId));assert(['parent','child'].includes(intent.generatedPackageRole));
 if(context)for(const key of['runId','caseId','index','op'])assert.equal(context[key],entry.context[key]);return entry;
}
export function assertGeneratedPackageProof(journal,item,intent){
 const entry=generatedPackageForIntent(journal,intent,item.proof?.createContext);if(!entry)return;
 exactContext(item.proof,entry.context);
}
export function assertGeneratedPackageItemBinding(journal,item,additional=[]){
 const intent=journal.intents.find(row=>row.id===item.intentId);if(!intent?.generatedPackageReservationId)return;
 const entry=generatedPackageForIntent(journal,intent,item.proof?.createContext);exactContext(item.proof,entry.context);
 if(intent.generatedPackageRole==='parent')return;
 const certified=journal.committedCreates.filter(row=>row.table===PARENT&&row.intentId===entry.parentIntentId);assert.equal(certified.length,1,'One exact parent intent must have its own actual committed birth');const certificate=certified[0];exactContext(certificate.proof,entry.context);
 const parentCandidates=[...additional,...journal.objects].filter(row=>row.table===PARENT&&row.id===certificate.id&&(row.proof??row.creationProof)&&row.postcondition?.independentlyVisible===true);
 assert(parentCandidates.length>0,'Generated package parent needs its independent actual row capture');
 for(const candidate of parentCandidates){const proof=candidate.proof??candidate.creationProof;assert.equal(digest(proof),digest(certificate.proof));const row=candidate.row??candidate.identity;assert.equal(row.id,certificate.id);for(const[key,value]of Object.entries(entry.parentBefore.selector))assert.equal(row[key],value)}
 assert.equal(item.row.package_id,certificate.id,'A child may not bind another previously owned package');assert.equal(item.row.handover_id,entry.request.handoverId);
 // Original assertRowReferences/resolveOwnedProjectIds still run immediately
 // after this check with the actual independently captured whole cohort.
}
export async function intentForGeneratedPackageItems(fixture,{caseId,index,op,sourceCapId,request,parentIntentId,expectedMax=10},approval){
 assert(fixture.j.state==='prepared'&&!fixture.j.writerDrain&&caseId===CASE&&op==='m.http'&&Number.isSafeInteger(index)&&index>=0&&index<=1000000);
 assert(fixture.j.namespace==='poms-r2m'&&fixture.j.marker===MARKER&&fixture.j.runId===fixture.runId&&['nest','rust'].includes(fixture.j.backend)&&fixture.j.database==='poms_r2m_'+fixture.j.backend);
 const projected=requestProjection(request),parent=fixture.j.intents.find(row=>row.id===uuid(parentIntentId));assert(parent&&parent.state==='planned'&&parent.beforeObserved===true&&parent.table===PARENT&&parent.caseId===CASE&&parent.expectedMax===1&&!parent.generatedPackageReservationId&&!parent.generatedPackageRole);
 assert(!Object.hasOwn(parent,'contextIndex')||parent.contextIndex===index,'Parent intent cannot be rebound from another actual index');
 assert.deepEqual(Object.keys(parent.selector).sort(),['handover_id','project_id','created_by'].sort());assert.equal(parent.selector.handover_id,projected.handoverId);assert.equal(parent.selector.created_by,fixture.actors.admin);
 const scope=fixture.scope(CASE),projectId=uuid(parent.selector.project_id),actorId=uuid(parent.selector.created_by);assert(scope.projects.includes(projectId)&&scope.actors.includes(actorId));own(fixture.j,'project',projectId);own(fixture.j,'platform_user',actorId);assert.equal(own(fixture.j,'project_handover',projected.handoverId).identity.project_id,projectId);
 assert(Number.isSafeInteger(expectedMax)&&expectedMax>0&&expectedMax<=10);assert(!(fixture.j.generatedPackageReservations??[]).some(row=>row.parentIntentId===parent.id||row.context.index===index||row.request.stepId==='package'),'This one named source step cannot reserve another index or parent');
 assert(!fixture.j.intents.some(row=>row.caseId===CASE&&row.table===CHILD&&row.state==='planned'));
 const entry={kind:'R2M-exact-M4-package-generated-parent-before-intent',id:randomUUID(),sourceCapId,sources:structuredClone(packageIntentSources),context:{runId:fixture.runId,caseId,index,op},request:projected,parentIntentId:parent.id,parentBefore:parentBefore(parent),actorId,projectId,expectedMax,approval:structuredClone(approval),approvalSha256:digest(approval),ownershipGranted:false,placeholderParentCreated:false};validateApproval(approval,entry,fixture.j);verifySources(sourceCapId);
 const reviewReader=new SourceReader({root:ROOT,pins:[approval.sourceReview],sourceEpoch:sourceCapId}),review=reviewReader.json(approval.sourceReview.file);assert.equal(review.result,'SourceReady');for(const file of[SOURCE,'tools/rust-r2m/fixture.mjs','tools/rust-r2m/fixture-core.mjs','tools/rust-r2m/fixture-journal.mjs','tools/rust-r2m/fixture-profile.mjs'])assert(review.reviewedSources.some(row=>row.file===file&&row.rawBytesSha256===sha(fs.readFileSync(path.join(ROOT,file)))),'C must bind the actual narrow reservation and each necessary wiring source');
 await fixture.preflight();
 const result=await fixture.client.query('select to_jsonb(t) as row from poms."attachment_download_package_item" t where "handover_id" is not distinct from $1::uuid',[projected.handoverId]);
 for(const{row}of result.rows){const previous=own(fixture.j,CHILD,row.id);for(const[key,value]of Object.entries(previous.identity))assert.equal(digest(row[key]),digest(value),'Reservation before-query cannot claim foreign or changed rows')}
 const child={id:randomUUID(),table:CHILD,selector:{handover_id:projected.handoverId},caseId,expectedMax,beforeObserved:true,beforeIds:result.rows.map(({row})=>uuid(row.id)),state:'planned',generatedPackageReservationId:entry.id,generatedPackageRole:'child',contextIndex:index};entry.childIntentId=child.id;entry.childBefore=parentBefore(child);
 parent.generatedPackageReservationId=entry.id;parent.generatedPackageRole='parent';parent.contextIndex=index;fixture.j.intents.push(child);fixture.j.generatedPackageReservations??=[];fixture.j.generatedPackageReservations.push(entry);validatePackageReservation(entry,fixture.j);fixture.save();return structuredClone(child);
}
export function validatePackageReservationJournal(journal){
 const entries=journal.generatedPackageReservations??[];assert(Array.isArray(entries)&&entries.length<=1);for(const entry of entries)validatePackageReservation(entry,journal);
 for(const intent of journal.intents)if(intent.generatedPackageReservationId)generatedPackageForIntent(journal,intent);
 for(const object of journal.objects.filter(row=>row.table===CHILD)){
  const certificates=journal.committedCreates.filter(row=>row.table===CHILD&&row.id===object.id),reserved=certificates.filter(certificate=>journal.intents.some(intent=>intent.id===certificate.intentId&&intent.generatedPackageReservationId));
  for(const certificate of reserved){assert.equal(digest(object.creationProof),digest(certificate.proof));assertGeneratedPackageItemBinding(journal,{...certificate,row:object.identity},journal.objects)}
 }
}
