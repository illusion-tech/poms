// Public metadata/report + controlled in-memory guards; no private/DB/OS signal.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {an4cReferences,decodeAn4cInputs,validateClosedAn4c} from './recover-closed-an4c.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),run='3cc41db5-c2e0-492a-b90e-262e56b32c90';
const metadata=JSON.parse(fs.readFileSync('tmp/rust-r2m/an4c-recovery-metadata02.json')),report=JSON.parse(fs.readFileSync(an4cReferences.report.file));
function model(){
    const objects=[];let sequence=0;for(const[table,count]of Object.entries(metadata.objectsByTable))for(let i=0;i<count;i++)objects.push({table,id:table==='attachment_upload_session'?metadata.actualVersionNegative.uploadRows[i].id:table==='attachment'?metadata.actualVersionNegative.attachments[i].id:'a0000000-0000-4000-8000-'+String(++sequence).padStart(12,'0'),creationProof:{kind:'pure-guard-model-no-actual-birth-claim'},postcondition:{independentlyVisible:true}});
    const root='/home/wangzishi/.local/share/poms-r2m/objects/nest/server01',local={root,prefix:root+'/poms-r2m/'+run,beforePrefixAbsent:true,files:metadata.actualVersionNegative.uploadRows.slice(0,6).map((row,index)=>{const key='poms-r2m/'+run+'/pure-guard-file-'+index+'.txt';return{table:'attachment_upload_session',id:row.id,key,file:root+'/'+key,actualRowStorageKeyConfirmed:true,bytes:5,sha256:'a'.repeat(64)}})};
    const tables=Object.keys(metadata.objectsByTable).map(table=>({table,rows:[]}));while(tables.length<107)tables.push({table:'pure_table_'+tables.length,rows:[]});
    tables.find(item=>item.table==='attachment_upload_session').rows=metadata.actualVersionNegative.uploadRows.map((row,index)=>({id:row.id,status:row.status,row_version:row.rowVersion,operation_type:row.operationType,failed_reason:null,provider_type:index<6?'local':'huawei-obs-s3',storage_key:local.files[index]?.key??'pure-obs-key'}));
    tables.find(item=>item.table==='attachment').rows=metadata.actualVersionNegative.attachments.map(row=>({id:row.id,version_no:row.versionNo,is_latest:row.isLatest,is_final:row.isFinal,status:row.status}));
    const old=structuredClone(tables.find(item=>item.table==='attachment').rows[0]),before={...old,is_latest:true},mutation={table:'attachment',id:old.id,reason:'R2M named source-prepared consumption mutation',values:{is_latest:false},transaction:'12345',expectedXmin:'12345',before,state:'committed',after:{...before,is_latest:false}};const providerObjects=objects.filter(item=>item.table==='attachment_storage_provider_config'),providerRows=providerObjects.map((item,index)=>({id:item.id,provider_type:index===0?'local':'huawei-obs-s3',is_default:index===0,row_version:4}));tables.find(item=>item.table==='attachment_storage_provider_config').rows=providerRows;const mutations=[mutation,...providerRows.map(row=>{const old={...row,is_default:true};return{table:'attachment_storage_provider_config',id:row.id,reason:'R2M named source-prepared consumption mutation',values:{is_default:false},transaction:'12346',expectedXmin:'12346',before:old,state:'committed',after:{...old,is_default:false}}})];
    return{metadata:structuredClone(metadata),report:structuredClone(report),cap:{id:'r2m-joint28',candidate:'9dcfb498b175e9fdaae7584aff1d5d3f93bf814f',manifestSha256:'173feb5285dc0765f212deae45a1471bf6b2eab05b1a5d63bde3a9c6691de2ac'},ledger:{namespace:'poms-r2m',marker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',backend:'nest',database:'poms_r2m_nest',runId:run,state:'prepared',revision:7,objects,intents:[{state:'adopted'},{state:'absent'}],directCreates:[{state:'promoted'}],mutations,localObjects:local},baseline:{kind:'global-before-prepare-full107',record:{runId:run,backend:'nest',tables:tables.map(item=>({...item,rows:[]}))}},sdk:{kind:'actual-API-original-SDK-PG-and-queryPID-before-certification',record:{originalNativeTrace:{kind:'mikro-orm-L-original-create-outer-commit-witness',complete:true,openTransactions:[],pendingStartCount:0}}},latestFacts:{kind:'complete-full107-private-facts',record:{runId:run,backend:'nest',tables,unknownCreates:0,unknownMutations:0}}};
}
test('fixed production reference key map ledger/latestFacts reaches the actual validator without aliases',()=>{
    const data=model(),raw=Object.fromEntries(Object.keys(an4cReferences).map(key=>[key,Buffer.from(JSON.stringify(data[key]))])),decoded={metadata:data.metadata,...decodeAn4cInputs(raw)};assert.equal(validateClosedAn4c(decoded),true);assert.equal(decoded.ledger.runId,run);assert.equal(decoded.latestFacts.record.tables.length,107);
    const wrong={...raw,journal:raw.ledger};delete wrong.ledger;assert.throws(()=>decodeAn4cInputs(wrong));const wrongFacts={...raw,facts:raw.latestFacts};delete wrongFacts.latestFacts;assert.throws(()=>decodeAn4cInputs(wrongFacts));
});
test('foreign run/cap/ledger digest metadata, unclosed case/writer and PG footprint reject',()=>{
    const changes=[x=>x.report.runId='foreign',x=>x.cap.id='r2m-other',x=>x.report.recovery.rawBytesSha256='0'.repeat(64),x=>x.report.observation.cases[0].caseClosed=false,x=>x.report.closeout.writers[0].stopped=false,x=>x.report.closeout.pg.observerFootprintRestored=false,x=>x.report.closeout.extensionClose.faultsRestored=false,x=>x.report.closeout.extensionClose.pendingTransactions=1];
    for(const change of changes){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data));}
});
test('only117 certified objects/no pending/one exact committed latest mutation/no lease/no selector correction are admitted',()=>{
    const changes=[x=>x.ledger.objects.pop(),x=>x.ledger.objects[0].postcondition.independentlyVisible=false,x=>x.ledger.intents[0].state='planned',x=>x.ledger.directCreates[0].state='outcome-unknown',x=>x.ledger.mutations.push({state:'committed'}),x=>x.ledger.baselineSettingLease={state:'restored'},x=>x.ledger.numberLease={},x=>x.ledger.scopeCorrections=[]];
    for(const change of changes){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data));}
});
test('original SDK trace, full107 unknown0 and literal version500 residues remain binding',()=>{
    const changes=[x=>x.sdk.record.originalNativeTrace.complete=false,x=>x.sdk.record.originalNativeTrace.openTransactions.push({}),x=>x.sdk.record.originalNativeTrace.pendingStartCount=1,x=>x.latestFacts.record.tables.pop(),x=>x.latestFacts.record.unknownCreates=1,x=>x.latestFacts.record.tables.find(t=>t.table==='attachment').rows[0].is_latest=true,x=>x.latestFacts.record.tables.find(t=>t.table==='attachment_upload_session').rows[1].status='failed'];
    for(const change of changes){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data));}
});
test('only the original exact committed old-latest=false mutation is reusable, with no reversal before cleanup',()=>{
    for(const change of[x=>x.ledger.mutations[0].state='outcome-unknown',x=>x.ledger.mutations[0].values.is_latest=true,x=>x.ledger.mutations[0].id='foreign',x=>x.ledger.mutations[0].reason='unlisted',x=>x.ledger.mutations[0].before.is_latest=false,x=>x.ledger.mutations[0].after.extra='changed',x=>x.ledger.mutations[0].expectedXmin='999']){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data));}
});
test('three exact committed preparation channels bind the original typed rows and are never reversed',()=>{
    assert.equal(validateClosedAn4c(model()),true);for(const change of[x=>x.ledger.mutations[1].values.is_default=true,x=>x.ledger.mutations[2].id=x.ledger.mutations[1].id,x=>x.ledger.mutations[1].table='attachment',x=>x.latestFacts.record.tables.find(t=>t.table==='attachment_storage_provider_config').rows[0].id='foreign']){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data))}assert(!/\.updateOwned\(/.test(helper));
});
test('six local files stay under exact before-absent run prefix and already-certified row/key',()=>{
    const changes=[x=>x.ledger.localObjects.beforePrefixAbsent=false,x=>x.ledger.localObjects.files.pop(),x=>x.ledger.localObjects.files[0].file='/tmp/foreign',x=>x.ledger.localObjects.files[0].key+='\\foreign',x=>x.ledger.localObjects.files[0].actualRowStorageKeyConfirmed=false,x=>x.ledger.localObjects.files[0].id='foreign',x=>x.latestFacts.record.tables.find(t=>t.table==='attachment_upload_session').rows[0].storage_key='other'];
    for(const change of changes){const data=model();change(data);assert.throws(()=>validateClosedAn4c(data));}
});
const helper=fs.readFileSync('tools/rust-r2m/recover-closed-an4c.mjs','utf8'),tree=ts.createSourceFile('recover-closed-an4c.mjs',helper,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
test('the real fresh-PID function runs only against Fake kill: ESRCH is required; live/foreign/EPERM stop',async()=>{
    const node=tree.statements.find(item=>ts.isFunctionDeclaration(item)&&item.name?.text==='assertWriterAbsent');assert(node);
    function fake(kill){return vm.runInNewContext('('+node.getText(tree)+')',{assert,process:{kill}},{timeout:1000});}
    const absent=fake(()=>{throw Object.assign(new Error('Fake absent'),{code:'ESRCH'});});assert.equal((await absent({kind:'native',identity:'1897421:native-app'})).absent,true);assert.equal((await absent({kind:'controlled-obs',identity:'1897500'})).absent,true);
    await assert.rejects(fake(()=>{} )({identity:'1897421:native-app'}));await assert.rejects(absent({identity:'12345'}));await assert.rejects(fake(()=>{throw Object.assign(new Error('Fake denied'),{code:'EPERM'});})({identity:'1897421:native-app'}));
});
test('production snapshot/failure labels obey unchanged safe regex and no adoption/selector rewrite is introduced',()=>{
    const labels=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='save'){assert(ts.isStringLiteral(node.arguments[0]));labels.push(node.arguments[0].text);}ts.forEachChild(node,visit);}visit(tree);assert.deepEqual(labels,['original-ledger-404c888f','after-full107','failure','close-failure']);assert(labels.every(label=>/^[a-z0-9-]+$/.test(label)));assert(!/\.adoptIntents\(|\.recoverDirectCreates\(|\.restoreBaselineSetting\(|\.selector\s*=|scopeCorrections\s*=|unlinkSync\(/.test(helper));
});

test('only the original M4.2 caseClosed=false is preserved; final ledger unknown/pending must still be zero',()=>{const data=model();assert.deepEqual(data.report.observation.cases.map(x=>x.caseClosed),[true,false,true,true]);assert.equal(validateClosedAn4c(data),true);for(const change of[x=>x.report.observation.cases[1].caseClosed=true,x=>x.report.observation.cases[2].caseClosed=false,x=>x.latestFacts.record.unknownCreates=1,x=>x.ledger.intents.push({state:'planned'})]){const wrong=model();change(wrong);assert.throws(()=>validateClosedAn4c(wrong))}});
