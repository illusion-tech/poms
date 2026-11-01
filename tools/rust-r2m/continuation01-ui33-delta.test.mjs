// Only public source parsing, exact inverse mapping and real callbacks with Fakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {collectVariantInputs,reverseVariantEdits} from './continuation01-variant.mjs';
import {deriveUi33ContinuationDelta,ui33DeltaNames} from './continuation01-ui33-delta.mjs';
import {uiExchangeIntents} from '../rust-r2m-continuation01/ui-runtime-sources.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=raw=>createHash('sha256').update(raw).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const data={oldManifest:read('tools/rust-r2m/continuation01-variant-generated01.json'),inputs:collectVariantInputs(),uiReview:read('docs/design/rust-r2m/ui-package-intent-source-review01.json'),enumPacket:read('tools/rust-r2m/m5-enum-input-source11.json'),enumReview:read('docs/design/rust-r2m/m5-enum-input-source-review01.json')};
const delta=deriveUi33ContinuationDelta(data),byName=new Map(delta.files.map(row=>[row.file.split('/').at(-1),row]));
const body=name=>Buffer.from(byName.get(name).rawBase64,'base64').toString('utf8');
test('exactly seven UI overlay files and the one Source11 enum overlay change; all other89 and active96 are unchanged',()=>{
 assert.equal(delta.files.length,8);assert.equal(delta.unchanged.length,89);assert.equal(delta.nextCount,97);assert.equal(delta.installed,false);assert.equal(delta.source10AllCurrentBytesEqual,false);
 assert.deepEqual([...byName.keys()].sort(),[...ui33DeltaNames].sort());
 for(const row of data.oldManifest.files)assert.equal(sha(fs.readFileSync(row.file)),row.rawBytesSha256);
 for(const row of delta.files){const candidate='tools/rust-r2m/continuation01-ui33-candidate01/'+row.file.split('/').at(-1);assert.equal(sha(fs.readFileSync(candidate)),row.rawBytesSha256);if(row.before)assert.equal(sha(Buffer.from(row.before.rawBase64,'base64')),row.before.rawBytesSha256)}
});
test('all eight complete mapped bodies invert byte-for-byte to their exact current approved originals',()=>{
 for(const row of delta.files){let rolled=Buffer.from(row.rawBase64,'base64').toString('utf8');for(const edits of[...row.stages].reverse())rolled=reverseVariantEdits(rolled,edits);assert.equal(rolled,data.inputs.get(row.originalFile).toString('utf8'));assert.equal(sha(Buffer.from(rolled)),row.originalRawBytesSha256)}
});
test('an unlisted original change, extra file, stale review or altered Source11 recipe cannot enter the delta',()=>{
 const changed=new Map(data.inputs);changed.set('tools/rust-r2m/fixture-guard.mjs',Buffer.concat([changed.get('tools/rust-r2m/fixture-guard.mjs'),Buffer.from('\n// unlisted')]));assert.throws(()=>deriveUi33ContinuationDelta({...data,inputs:changed}));
 const extra=new Map(data.inputs);extra.set('tools/rust-r2m/unlisted.mjs',Buffer.from('export const x=1;'));assert.throws(()=>deriveUi33ContinuationDelta({...data,inputs:extra}));
 const stale=structuredClone(data.uiReview);stale.result='Pending';assert.throws(()=>deriveUi33ContinuationDelta({...data,uiReview:stale}));
 const wrong=new Map(data.inputs);wrong.set('tools/rust-r2m/acceptance-api-external-recipes.mjs',Buffer.from(wrong.get('tools/rust-r2m/acceptance-api-external-recipes.mjs').toString().replace('create_org_unit','create-org-unit')));assert.throws(()=>deriveUi33ContinuationDelta({...data,inputs:wrong}));
});
test('forged previous derived bytes or an unknown old membership cannot be claimed as the preserved96',()=>{
 const bad=structuredClone(data.oldManifest);bad.files[0].rawBase64=Buffer.from('fake').toString('base64');assert.throws(()=>deriveUi33ContinuationDelta({...data,oldManifest:bad}));
 const smaller=structuredClone(data.oldManifest);smaller.files.pop();assert.throws(()=>deriveUi33ContinuationDelta({...data,oldManifest:smaller}));
});
test('Source11 actual enum inverse is only one literal; original Source10 manifest stays frozen',()=>{
 const source=body('acceptance-api-external-recipes.mjs');assert.equal(source.split("action:'create_org_unit'").length,2);assert.equal(source.replace("action:'create_org_unit'","action:'create-org-unit'"),Buffer.from(byName.get('acceptance-api-external-recipes.mjs').before.rawBase64,'base64').toString());assert.equal(sha(fs.readFileSync('tools/rust-r2m/acceptance-api20-source10.json')),'eeeb1e43daddcceb1978692c31c1b67737e0f8018485ef178d31da8bc63561ae');
});
function functionFrom(name){const tree=ts.createSourceFile('mapped-ui.mjs',body('fixture-ui-package-intent.mjs'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),node=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node);return node.getText(tree).replace(/^export /,'')}
test('the actual mapped approval function admits only the new c01 marker/pair and UI4 Max64',()=>{
 const validate=new Function('assert','MARKER','CASE',functionFrom('validateApproval')+';return validateApproval;')(assert,'abd093b8-c584-45b3-9c62-6357ad6dfa5d','m.ui4.integration');
 const journal={runId:'pure-run',backend:'nest'},entry={sourceCapId:'r2m-pure-ui33'},approval={kind:'Root-R2M-exact-UI4-package-item-before-intent-admission',rootApproved:true,namespace:'poms-r2m',marker:'abd093b8-c584-45b3-9c62-6357ad6dfa5d',runId:journal.runId,backend:'nest',database:'poms_r2m_c01_nest',sourceCapId:entry.sourceCapId,logicalCase:'UI4',stepId:'package-create',caseId:'m.ui4.integration',maximumItems:64,sourceReview:{file:'docs/design/rust-r2m/fake-review.json',rawBytesSha256:'a'.repeat(64)}};
 validate(approval,entry,journal);for(const patch of[{marker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5'},{database:'poms_r2m_nest'},{maximumItems:10},{caseId:'m4.integration'},{sourceCapId:'foreign'}])assert.throws(()=>validate({...approval,...patch},entry,journal));
});
test('actual mapped request projection keeps complete UI selected IDs/version/note; API-shaped bodies reject',()=>{
 const uuid=value=>{assert(/^[0-9a-f-]{36}$/.test(value));return value};const project=new Function('assert','uuid',functionFrom('requestProjection')+';return requestProjection;')(assert,uuid),selection='00000000-0000-4000-9000-000000000001';
 const request={logicalCase:'UI4',stepId:'package-create',method:'POST',path:'/api/project-handovers/00000000-0000-4000-9000-000000000002/attachment-download-packages',body:{selectionIds:[selection],expectedSelectionVersions:[{selectionId:selection,rowVersion:1}],confirmedSensitiveExclusion:true,note:'由项目移交页面创建'}};
 assert.deepEqual(project(request).body,request.body);assert.throws(()=>project({...request,body:{confirmedSensitiveExclusion:true}}));assert.throws(()=>project({...request,body:{...request.body,note:'other'}}));
});
const id=n=>'00000000-0000-4000-9000-'+String(n).padStart(12,'0');
for(const file of['ui-runtime-full.mjs','windows-ui-runtime.mjs'])for(const backend of['nest','rust'])test('mapped '+file+' '+backend+' runs the real serialized callback: Max1 parent then exact-body Max64 reservation then PG ACK',async()=>{
 const tree=ts.createSourceFile(file,body(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),hooks=[];function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='onBeforeExchange')hooks.push(node);ts.forEachChild(node,visit)}visit(tree);assert.equal(hooks.length,1);
 const events=[],intents=[],contexts=new Map(),requests=new Map(),runId=id(1),project=id(2),handover=id(3),actor=id(4),selection=id(5),scope={caseId:'m.ui4.integration',requestId:'r2m:'+runId+':pure',userAgent:'poms-r2m-fixture/'+runId},current={descriptor:{journey:'UI4',id:'package-create'},scope,exchanges:[]},sourceCap={id:'r2m-pure-ui33'},approval={kind:'Fake-only-Root-admission'};
 const actualBody={selectionIds:[selection],expectedSelectionVersions:[{selectionId:selection,rowVersion:1}],confirmedSensitiveExclusion:true,note:'由项目移交页面创建'};
 const f={actors:{admin:actor,viewer:id(9)},base:{accounts:[]},j:{intents,objects:[]},scope(){return scope},async facts(){events.push('facts');return{}},async intent(table,selector,options){assert.notEqual(table,'attachment_download_package_item');const item={id:id(10+intents.length),table,caseId:options.caseId,selector,expectedMax:options.expectedMax,state:'planned'};intents.push(item);events.push(table);return item},async intentForUiGeneratedPackageItems(options,passed){assert.equal(passed,approval);assert.equal(options.index,41);assert.equal(options.op,'m.http');assert.equal(options.expectedMax,64);assert.equal(options.parentIntentId,intents.find(row=>row.table==='attachment_download_package').id);assert.deepEqual(options.request.body,actualBody);events.push('UI4-reservation');return{id:id(99)}}};
 const pg={async beginCase(context){assert.equal(context.index,41);events.push('PGbegin')}},native={async admitContext(correlation,context){assert.equal(contexts.get(correlation),context);events.push('Windows-ACK')}};
 const inject={assert,Buffer,current,f,prepared:{handover:{project:{id:project},handover:{id:handover}}},backend,runId,sourceCap,committed:[],options:{uiPackageItemAdmission:approval},contexts,requests,pg,native,uiExchangeIntents,settingKey:'attachment.max-upload-size-mb',settingLeaseScope:'m2-ui2.attachment-max-upload-size',randomUUID:()=>id(100),AbortController};
 const hook=new Function(...Object.keys(inject),'let exchangeTail=Promise.resolve(),halted=false,pgActive=false,index=41;const exchangeAbort=new AbortController();return ({'+hooks[0].getText(tree)+'}).onBeforeExchange;')(...Object.values(inject));
 const exchange={index:1,method:'POST',path:'/api/project-handovers/'+handover+'/attachment-download-packages',executionBackend:backend,request:{method:'POST',path:'/api/project-handovers/'+handover+'/attachment-download-packages',bodyBase64:Buffer.from(JSON.stringify(actualBody)).toString('base64')}};
 const result=await hook(exchange);assert.equal(result.index,41);assert.equal(result.caseId,'m.ui4.integration');const parent=intents.find(row=>row.table==='attachment_download_package');assert.equal(parent.expectedMax,1);assert.deepEqual(parent.selector,{handover_id:handover,project_id:project,created_by:actor});assert(events.indexOf('attachment_download_package')<events.indexOf('UI4-reservation'));assert(events.indexOf('UI4-reservation')<events.indexOf('PGbegin'));requests.get(1).release();
});
