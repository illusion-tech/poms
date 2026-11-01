// Public run metadata plus a controlled guard model; never an actual birth proof.
// No private bytes, SQL, browser, process signal or network is read/executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {an7c01aReferences,decodeAn7c01aInputs,validateClosedAn7c01a} from './recover-closed-an7c01a.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const run='c3647513-cdd8-4d70-9d00-a63583162c73';
const metadata=JSON.parse(fs.readFileSync('tmp/rust-r2m-continuation01/an7c01a-recovery-metadata01.json'));
const report=JSON.parse(fs.readFileSync(an7c01aReferences.report.file));
const owner=JSON.parse(fs.readFileSync(an7c01aReferences.owner.file));
const helper=fs.readFileSync('tools/rust-r2m/recover-closed-an7c01a.mjs','utf8');
const tree=ts.createSourceFile('recover-closed-an7c01a.mjs',helper,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function model(){
    const objects=[];let sequence=0;
    for(const[table,count]of Object.entries(metadata.objectsByTable)){
        const fixed=[...new Set([...metadata.localObjects.files.filter(item=>item.table===table).map(item=>item.id),...metadata.mutations.filter(item=>item.table===table).map(item=>item.id)])];
        assert(fixed.length<=count);
        for(let index=0;index<count;index++)objects.push({table,id:fixed[index]??'a0000000-0000-4000-8000-'+String(++sequence).padStart(12,'0'),creationProof:{kind:'pure-guard-model-no-actual-birth-claim'},postcondition:{independentlyVisible:true}});
    }
    const tables=Object.keys(metadata.objectsByTable).map(table=>({table,rows:[]}));
    while(tables.length<107)tables.push({table:'pure_table_'+tables.length,rows:[]});
    for(const file of metadata.localObjects.files)tables.find(item=>item.table===file.table).rows.push({id:file.id,storage_key:file.key,provider_type:'local'});
    const mutations=metadata.mutations.map((item,index)=>{const before={id:item.id,[index===0?'is_latest':'is_default']:true,row_version:1};return{table:item.table,id:item.id,reason:'R2M named source-prepared consumption mutation',values:item.values,transaction:String(12345+index),expectedXmin:String(12345+index),before,state:'committed',after:{...before,...item.values}}});
    return{metadata:structuredClone(metadata),report:structuredClone(report),owner:structuredClone(owner),cap:{id:'r2m-c01-joint01',candidate:'9dcfb498b175e9fdaae7584aff1d5d3f93bf814f',manifestSha256:'7f456aac3c108832b08268fcc8f197e3aeda5bb93d948bb2514714fb9cd79cfd'},ledger:{namespace:'poms-r2m',marker:metadata.marker,backend:'nest',database:metadata.database,runId:run,state:'prepared',revision:7,objects,intents:[{state:'adopted'},{state:'absent'}],directCreates:[{state:'promoted'}],mutations,localObjects:structuredClone(metadata.localObjects),fixtureProfile:structuredClone(metadata.fixtureProfile)},baseline:{kind:'global-before-prepare-full107',record:{runId:run,backend:'nest',tables:tables.map(item=>({...item,rows:[]}))}},sdk:{kind:'actual-API-original-SDK-PG-and-queryPID-before-certification',record:{originalNativeTrace:{kind:'mikro-orm-L-original-create-outer-commit-witness',complete:true,openTransactions:[],pendingStartCount:0}}},latestFacts:{kind:'complete-full107-private-facts',record:{runId:run,backend:'nest',tables,unknownCreates:0,unknownMutations:0}}};
}
function rejects(changes){for(const change of changes){const data=model();change(data);assert.throws(()=>validateClosedAn7c01a(data));}}
test('actual CLI reference keys decode ledger/owner/latestFacts into the production validator',()=>{
    const data=model(),raw=Object.fromEntries(Object.keys(an7c01aReferences).map(key=>[key,Buffer.from(JSON.stringify(data[key]))]));
    const decoded={metadata:data.metadata,...decodeAn7c01aInputs(raw)};
    assert.equal(validateClosedAn7c01a(decoded),true);assert.equal(decoded.ledger.objects.length,143);assert.equal(decoded.owner.ownerBudgetMs,900000);
    for(const[from,to]of[['ledger','journal'],['owner','worker'],['latestFacts','facts']]){const bad={...raw,[to]:raw[from]};delete bad[from];assert.throws(()=>decodeAn7c01aInputs(bad));}
});
test('the exact c01 run and fixed owner/cap are required; old or quarantined targets reject',()=>rejects([
    x=>x.ledger.database='poms_r2m_rust',x=>x.ledger.database='poms_r2m_nest',x=>x.ledger.marker='1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',x=>x.report.runId='foreign',x=>x.cap.id='r2m-joint28',x=>x.cap.manifestSha256='0'.repeat(64),x=>x.metadata.oldRustNeverTarget=false,x=>x.owner.result='observed',x=>x.owner.capSha256='0'.repeat(64),x=>x.owner.privateContentsExported=true,x=>x.report.recovery.rawBytesSha256='0'.repeat(64)
]));
test('all seven real caseClosed facts and the original partial/M5 failures remain unchanged',()=>{
    const data=model();assert.equal(validateClosedAn7c01a(data),true);assert.deepEqual(data.report.observation.cases.map(item=>item.result),['observed','observed','observed','observed','observed','fail','fail']);
    rejects([x=>x.report.observation.cases[1].caseClosed=false,x=>x.report.observation.cases[6].result='observed',x=>x.report.result='observed',x=>x.report.G3Certified=true,x=>x.report.observation.selection.pop()]);
});
test('all three real stopped writers, extension idle/fault restore and original observer footprint are binding',()=>rejects([
    x=>x.report.closeout.writers.pop(),x=>x.report.closeout.writers[0].stopped=false,x=>x.report.closeout.writers[2].identity='foreign',x=>x.report.closeout.extensionClose.faultsRestored=false,x=>x.report.closeout.extensionClose.activeRequests=1,x=>x.report.closeout.extensionClose.pendingTransactions=1,x=>x.report.closeout.pg.observerFootprintRestored=false,x=>x.report.closeout.pg.observerFootprintCatalogSha256='0'.repeat(64),x=>x.report.closeout.failures.push({kind:'unknown-close'})
]));
test('143 previously certified objects, zero pending/unknown and exact profile32 are required',()=>rejects([
    x=>x.ledger.objects.pop(),x=>x.ledger.objects[0].postcondition.independentlyVisible=false,x=>x.ledger.intents[0].state='planned',x=>x.ledger.directCreates[0].state='outcome-unknown',x=>x.latestFacts.record.unknownCreates=1,x=>x.latestFacts.record.unknownMutations=1,x=>x.latestFacts.record.tables.pop(),x=>x.ledger.fixtureProfile.sources.push({file:'future-ui33'}),x=>x.ledger.fixtureProfile.sourceSetSha256='0'.repeat(64),x=>x.metadata.observerModule.rawBytesSha256='6d9',x=>x.ledger.baselineSettingLease={},x=>x.ledger.numberLease={},x=>x.ledger.scopeCorrections=[]
]));
test('only the three exact committed preparations are consumed without reverse writes',()=>{
    rejects([x=>x.ledger.mutations[0].state='outcome-unknown',x=>x.ledger.mutations[1].values={is_default:true},x=>x.ledger.mutations[2].id=x.ledger.mutations[1].id,x=>x.ledger.mutations[0].id='foreign',x=>x.ledger.mutations[0].reason='unlisted',x=>x.ledger.mutations[0].before.is_latest=false,x=>x.ledger.mutations[1].after.extra='changed',x=>x.ledger.mutations[2].expectedXmin='999',x=>x.ledger.mutations.reverse()]);
    assert(!/\.updateOwned\(/.test(helper));
});
test('seven exact already-certified local file keys include the real ZIP; no invented state is required',()=>{
    const data=model();assert.equal(data.ledger.localObjects.files.length,7);assert.equal(data.ledger.localObjects.files.filter(item=>item.table==='attachment_download_package').length,1);assert(data.ledger.localObjects.files.every(item=>!Object.hasOwn(item,'state')));assert.equal(validateClosedAn7c01a(data),true);
    rejects([x=>x.ledger.localObjects.files.pop(),x=>x.ledger.localObjects.files[5].file='/tmp/foreign.zip',x=>x.ledger.localObjects.beforePrefixAbsent=false,x=>x.ledger.localObjects.files[0].key+='\\foreign',x=>x.ledger.localObjects.files[0].actualRowStorageKeyConfirmed=false,x=>x.ledger.localObjects.files[0].id='foreign',x=>x.latestFacts.record.tables.find(t=>t.table==='attachment_download_package').rows[0].storage_key='other']);
});
test('the original Native SDK trace must be complete with no open transaction/start',()=>rejects([
    x=>x.sdk.record.originalNativeTrace.complete=false,x=>x.sdk.record.originalNativeTrace.openTransactions.push({}),x=>x.sdk.record.originalNativeTrace.pendingStartCount=1,x=>x.baseline.record.tables.pop()
]));
test('the production fresh-PID guard requires ESRCH for each real writer and rejects live/foreign/EPERM',async()=>{
    const node=tree.statements.find(item=>ts.isFunctionDeclaration(item)&&item.name?.text==='assertWriterAbsent');assert(node);
    const fake=kill=>vm.runInNewContext('('+node.getText(tree)+')',{assert,process:{kill}},{timeout:1000});
    const absent=fake(()=>{throw Object.assign(new Error('Fake absent'),{code:'ESRCH'});});
    for(const identity of['2000532:native-app','2000617','2000658'])assert.equal((await absent({identity})).absent,true);
    await assert.rejects(fake(()=>{})({identity:'2000532:native-app'}));await assert.rejects(absent({identity:'12345'}));await assert.rejects(fake(()=>{throw Object.assign(new Error('Fake denied'),{code:'EPERM'});})({identity:'2000658'}));
});
test('real snapshot/error labels obey the unchanged safe regex; no new adoption/deletion/selector path exists',()=>{
    const labels=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='save'){assert(ts.isStringLiteral(node.arguments[0]));labels.push(node.arguments[0].text);}ts.forEachChild(node,visit);}visit(tree);
    assert.deepEqual(labels,['original-ledger-cd0dd18c','after-full107','failure','close-failure']);assert(labels.every(label=>/^[a-z0-9-]+$/.test(label)));
    assert(!/\.adoptIntents\(|\.recoverDirectCreates\(|\.restoreBaselineSetting\(|\.selector\s*=|scopeCorrections\s*=|unlinkSync\(/.test(helper));
    assert(helper.includes("from '../rust-r2m-continuation01/fixture-guard.mjs'"));assert(helper.includes("import('../rust-r2m-continuation01/fixture.mjs')"));assert(helper.includes('assert.equal(record.cleanup[0].deleted,143)'));assert(helper.includes('assert.equal(record.cleanup[0].objects.changed,7)'));
});
