// Actual helper functions, Fake approval/owner/reader only. No env, PG, HTTP or
// process ownership. Fake proofs below confer no real resource ownership.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {packageIntentSources} from './fixture-package-intent.mjs';
import {Fixture} from './fixture.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const file='tools/rust-r2m/fixture-package-intent.mjs',raw=fs.readFileSync(file),text=raw.toString('utf8'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const reviewedFiles=[file,'tools/rust-r2m/fixture.mjs','tools/rust-r2m/fixture-core.mjs','tools/rust-r2m/fixture-journal.mjs','tools/rust-r2m/fixture-profile.mjs'];
const body=tree.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(tree).replace(/^export /,'')).join('\n').replaceAll('import.meta.dirname','TASK_MODULE_DIR');
let fakeReviewResult='SourceReady',publicHelperReads=0;
class FakeSourceReader{
 constructor(options){this.options=options}
 read(publicFile){assert(packageIntentSources.some(pin=>pin.file===publicFile));return fs.readFileSync(publicFile)}
 json(publicFile){assert.equal(publicFile,'docs/design/rust-r2m/fake-package-intent-source-review.json');return{result:fakeReviewResult,reviewedSources:reviewedFiles.map(file=>({file,rawBytesSha256:sha(fs.readFileSync(file))}))}}
 assertUnchanged(){}
}
const helper=new Function('assert','createHash','randomUUID','fs','path','SourceReader','TASK_MODULE_DIR',body+'\nreturn {intentForGeneratedPackageItems,validatePackageReservation,generatedPackageForIntent,assertGeneratedPackageProof,assertGeneratedPackageItemBinding,validatePackageReservationJournal};')(assert,createHash,randomUUID,{readFileSync(publicFile){assert(reviewedFiles.some(file=>path.resolve(file)===path.resolve(publicFile)));publicHelperReads++;return fs.readFileSync(publicFile)}},path,FakeSourceReader,path.dirname(fileURLToPath(new URL('./fixture-package-intent.mjs',import.meta.url))));
const id=n=>'00000000-0000-4000-9000-'+String(n).padStart(12,'0'),run=id(1),actor=id(2),project=id(3),handover=id(4),parentIntent=id(5),generatedParent=id(6),generatedItem=id(7),oldPackage=id(8),CASE='m4.integration',PARENT='attachment_download_package',CHILD='attachment_download_package_item';
const context={runId:run,caseId:CASE,index:71,op:'m.http'};
function model(){
 const own=(table,id,identity)=>({table,id,caseId:CASE,identity:{id,...identity},creationProof:{kind:'Fake-existing-proof'},postcondition:{independentlyVisible:true}});
 const parent={id:parentIntent,table:PARENT,caseId:CASE,selector:{handover_id:handover,project_id:project,created_by:actor},expectedMax:1,beforeObserved:true,beforeIds:[],state:'planned'};
 const j={namespace:'poms-r2m',marker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',database:'poms_r2m_nest',backend:'nest',runId:run,state:'prepared',cases:[{caseId:CASE,actors:[actor],projects:[project]}],objects:[own('platform_user',actor,{username:'pure-owned-admin'}),own('project',project,{project_no:'pure-project',created_by:actor}),own('project_handover',handover,{project_id:project,created_by:actor}),own(PARENT,oldPackage,{handover_id:handover,project_id:project,created_by:actor})],intents:[parent],committedCreates:[]};
 const calls=[],fixture={runId:run,backend:'nest',j,actors:{admin:actor},scope(caseId){assert.equal(caseId,CASE);return j.cases[0]},async preflight(){calls.push('full107-preflight')},client:{async query(sql,args){assert.equal(sql,'select to_jsonb(t) as row from poms."attachment_download_package_item" t where "handover_id" is not distinct from $1::uuid');assert.deepEqual(args,[handover]);calls.push('exact-before-query');return{rows:[]}}},save(){calls.push('save');helper.validatePackageReservationJournal(j)}};
 const options={caseId:CASE,index:71,op:'m.http',sourceCapId:'r2m-pure-package01',request:{logicalCase:'M4.2',stepId:'package',method:'POST',path:'/api/project-handovers/'+handover+'/attachment-download-packages',body:{confirmedSensitiveExclusion:true}},parentIntentId:parentIntent,expectedMax:10};
 const approval={kind:'Root-R2M-exact-package-item-before-intent-admission',rootApproved:true,namespace:'poms-r2m',marker:j.marker,runId:run,backend:'nest',database:j.database,sourceCapId:options.sourceCapId,logicalCase:'M4.2',stepId:'package',caseId:CASE,maximumItems:10,sourceReview:{file:'docs/design/rust-r2m/fake-package-intent-source-review.json',rawBytesSha256:'a'.repeat(64)}};
 return{fixture,options,approval,j,parent,calls};
}
async function reserved(){const data=model();data.child=await helper.intentForGeneratedPackageItems(data.fixture,data.options,data.approval);return data}
function committed(data,kind='mikro-orm-afterCreate-outer-commit'){
 const proof=()=>({kind,createContext:structuredClone(context),...(kind==='mikro-orm-afterCreate-outer-commit'?{commitContext:structuredClone(context),outerTransaction:'Fake-parent-or-child-separate-real-proof-required'}:{outerCommitObserved:true,visibleFromIndependentOwnerConnection:true})});
 const parentCertificate={table:PARENT,id:generatedParent,intentId:parentIntent,proof:proof()},parentCapture={...parentCertificate,row:{id:generatedParent,...data.parent.selector},postcondition:{independentlyVisible:true}},child={table:CHILD,id:generatedItem,intentId:data.child.id,proof:proof(),row:{id:generatedItem,package_id:generatedParent,handover_id:handover,attachment_id:null,version_group_id:id(9)},postcondition:{independentlyVisible:true}};
 data.j.committedCreates.push(parentCertificate);return{parentCertificate,parentCapture,child};
}
test('source pins bind the unchanged original Max1 package / Max10 child source and original package+items flush',()=>{
 for(const pin of packageIntentSources)assert.equal(sha(fs.readFileSync(pin.file)),pin.rawBytesSha256);
 const source=fs.readFileSync(packageIntentSources[0].file,'utf8');assert(source.includes("intent('attachment_download_package_item',{handover_id:ref('handover.id')},10)"));
 assert(text.includes('placeholderParentCreated:false'));assert(!/INSERT INTO|updateOwned\(|adoptIntents\(/.test(text));
});
test('real reservation path takes full107/pre-existing-row checks, never fills a future UUID, and grants no ownership',async()=>{
 const d=await reserved();assert.deepEqual(d.calls,['full107-preflight','exact-before-query','save']);assert.equal(d.j.objects.length,4);assert.deepEqual(d.child.selector,{handover_id:handover});assert(!Object.hasOwn(d.child.selector,'package_id'));assert.deepEqual(d.child.beforeIds,[]);assert.equal(d.child.expectedMax,10);assert.equal(d.j.generatedPackageReservations[0].ownershipGranted,false);assert(publicHelperReads>0);
});
test('the ordinary Fixture.intent still rejects a missing generated package parent before any Fake query',async()=>{const d=model(),ordinary=Object.assign(Object.create(Fixture.prototype),{j:d.j,runId:run,preflight:d.fixture.preflight,client:d.fixture.client});await assert.rejects(()=>ordinary.intent(CHILD,{handover_id:handover},{caseId:CASE,expectedMax:10}),/Missing immutable project parent/);assert.deepEqual(d.calls,[])});
test('a matching before-query foreign row is refused and never becomes owned',async()=>{const d=model();d.fixture.client.query=async()=>({rows:[{row:{id:id(98),handover_id:handover,package_id:oldPackage,attachment_id:null,version_group_id:id(99)}}]});await assert.rejects(()=>helper.intentForGeneratedPackageItems(d.fixture,d.options,d.approval));assert.equal(d.j.objects.length,4);assert.equal(d.j.intents.length,1);assert.equal(d.j.generatedPackageReservations,undefined)});
test('an existing parent context index is immutable and every unlisted environment is refused before the Fake query',async()=>{for(const change of[d=>{d.parent.contextIndex=72},d=>{d.j.marker='foreign'},d=>{d.j.database='poms_r2m_c01_nest'},d=>{d.options.index=1000001}]){const d=model();change(d);await assert.rejects(()=>helper.intentForGeneratedPackageItems(d.fixture,d.options,d.approval));assert.deepEqual(d.calls,[])}});
for(const[name,change]of[
 ['other logical case',d=>{d.options.request.logicalCase='M4.3'}],['UI4',d=>{d.options.caseId='m.ui4.integration'}],['another step',d=>{d.options.request.stepId='package-read'}],['producer op',d=>{d.options.op='m.producer'}],['query-suffixed path',d=>{d.options.request.path+='?x=1'}],['changed request body',d=>{d.options.request.body.selectionIds=[]}],['parentMax2',d=>{d.parent.expectedMax=2}],['missing parent before',d=>{d.parent.beforeObserved=false}],['already resolved parent',d=>{d.parent.state='absent'}],['wrong parent actor',d=>{d.parent.selector.created_by=id(90)}],['wrong project',d=>{d.parent.selector.project_id=id(91)}],['wrong handover',d=>{d.parent.selector.handover_id=id(92)}],['unproven handover',d=>{delete d.j.objects[2].creationProof}],['invisible project',d=>{d.j.objects[1].postcondition.independentlyVisible=false}],['itemsMax11',d=>{d.options.expectedMax=11}],['itemsMax0',d=>{d.options.expectedMax=0}],['foreign approval database',d=>{d.approval.database='poms_r2m_rust'}],['missing Root approval',d=>{d.approval.rootApproved=false}]
])test(name+' refuses before HTTP or any fake query',async()=>{const d=model();change(d);await assert.rejects(()=>helper.intentForGeneratedPackageItems(d.fixture,d.options,d.approval));assert.deepEqual(d.calls,[])});
test('a non-SourceReady review refuses and an index/parent cannot be rebound',async()=>{
 const d=model();fakeReviewResult='Pending';try{await assert.rejects(()=>helper.intentForGeneratedPackageItems(d.fixture,d.options,d.approval));assert.deepEqual(d.calls,[])}finally{fakeReviewResult='SourceReady'}
 const fresh=await reserved();fresh.options.index++;await assert.rejects(()=>helper.intentForGeneratedPackageItems(fresh.fixture,fresh.options,fresh.approval));assert.equal(fresh.j.generatedPackageReservations.length,1);
});
test('SDK parent and child bind their own actual same-request proofs/outer-COMMIT and independent rows, without equating tx IDs',async()=>{
 const d=await reserved(),e=committed(d);e.parentCertificate.proof.outerTransaction='Fake-parent-transaction-1';e.parentCapture.proof=e.parentCertificate.proof;e.child.proof.outerTransaction='Fake-child-transaction-2';
 helper.assertGeneratedPackageProof(d.j,e.parentCertificate,d.parent);helper.assertGeneratedPackageProof(d.j,e.child,d.j.intents[1]);helper.assertGeneratedPackageItemBinding(d.j,e.child,[e.parentCapture,e.child]);
});
test('PG parent and child keep their separate committed-proof shape; no SDK/XID substitution is invented',async()=>{const d=await reserved(),e=committed(d,'pg-after-insert-observed-outer-commit');helper.assertGeneratedPackageProof(d.j,e.child,d.j.intents[1]);helper.assertGeneratedPackageItemBinding(d.j,e.child,[e.parentCapture,e.child])});
for(const[name,change]of[
 ['child points at an old owned package',(d,e)=>{e.child.row.package_id=oldPackage}],['child wrong index',(d,e)=>{e.child.proof.createContext.index++}],['child wrong op',(d,e)=>{e.child.proof.createContext.op='m.producer'}],['SDK child outer commit index differs',(d,e)=>{e.child.proof.commitContext.index++}],['parent birth wrong index',(d,e)=>{e.parentCertificate.proof.createContext.index++}],['parent outer commit wrong op',(d,e)=>{e.parentCertificate.proof.commitContext.op='m.producer'}],['query-only parent',(d)=>{d.j.committedCreates=[]}],['invisible parent',(d,e)=>{e.parentCapture.postcondition.independentlyVisible=false}],['foreign parent project',(d,e)=>{e.parentCapture.row.project_id=id(94)}],['foreign parent actor',(d,e)=>{e.parentCapture.row.created_by=id(95)}],['foreign child handover',(d,e)=>{e.child.row.handover_id=id(96)}],['duplicate parent birth',(d,e)=>{d.j.committedCreates.push({...e.parentCertificate,id:id(97)})}]
])test(name+' cannot gain a final parent binding',async()=>{const d=await reserved(),e=committed(d);change(d,e);assert.throws(()=>helper.assertGeneratedPackageItemBinding(d.j,e.child,[e.parentCapture,e.child]))});
test('reservation scope/selector/beforeMax and original context remain immutable through journal validation',async()=>{
 const original=await reserved();for(const change of[d=>{d.j.generatedPackageReservations[0].context.index++},d=>{d.parent.selector.project_id=id(80)},d=>{d.j.intents[1].selector.package_id=oldPackage},d=>{d.j.intents[1].expectedMax=11},d=>{d.j.intents[1].beforeIds.push(id(81))},d=>{d.parent.contextIndex++}]){const d=structuredClone({j:original.j,parent:original.parent});d.parent=d.j.intents[0];change(d);assert.throws(()=>helper.validatePackageReservationJournal(d.j))}
});
test('persisted owned child keeps the exact original parent birth binding on journal reopen; an old-package alias still rejects',async()=>{const d=await reserved(),e=committed(d);d.j.committedCreates.push({...e.child});for(const captured of[e.parentCapture,e.child])d.j.objects.push({table:captured.table,id:captured.id,caseId:CASE,identity:structuredClone(captured.row),creationProof:captured.proof,postcondition:{independentlyVisible:true}});helper.validatePackageReservationJournal(d.j);d.j.objects.find(row=>row.table===CHILD).identity.package_id=oldPackage;assert.throws(()=>helper.validatePackageReservationJournal(d.j))});
