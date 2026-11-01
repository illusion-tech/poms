// Fixed c01 normal-closed an7c01a only. Uses frozen derived profile32.
// Root executes after all active counterparts stop; no old-Rust target/adoption.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SourceReader,verifySourceCap} from '../rust-r2m-continuation01/acceptance-source.mjs';
import {marker} from '../rust-r2m-continuation01/fixture-guard.mjs';
import {digest,normalizedRows} from './continuation01-common.mjs';
const ROOT='/home/wangzishi/projects/poms-rust-r2m',PRIVATE='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
const RUN='c3647513-cdd8-4d70-9d00-a63583162c73',CAP='r2m-c01-joint01',MANIFEST='7f456aac3c108832b08268fcc8f197e3aeda5bb93d948bb2514714fb9cd79cfd';
const PG_SOURCE='7988f0a0fb5f7e9fd88a2889dc5faf3fe6381cd16568b94a54926c76c8f74322',OBSERVER='504e4729-2542-412b-b852-c9daf073f705';
const directory=PRIVATE+'/acceptance-runs/nest-'+RUN,sha=value=>createHash('sha256').update(value).digest('hex');
export const an7c01aReferences=Object.freeze({
    "report": {
        "file": "tmp/rust-r2m-continuation01/acceptance-api-nest-an7c01a.json",
        "bytes": 77678,
        "rawBytesSha256": "07d4387b9abd29acc45d4b4cfdf9196e1c30f881a31c4840d91be462e682a999"
    },
    "owner": {
        "file": "tmp/rust-r2m-continuation01/acceptance-api-owner-nest-an7c01a.json",
        "bytes": 1075,
        "rawBytesSha256": "16a3a8aa97965aae30b250669823a93472e49fae87f824b0349cbc53d210f9e4"
    },
    "cap": {
        "file": "tmp/rust-r2m-continuation01/source-cap-c01-joint01.json",
        "bytes": 1546318,
        "rawBytesSha256": "ed0d84de8b2b03e5d265612e76f4413dd1a39dfdbfce6d645b7059f70dd5dd2c"
    },
    "ledger": {
        "file": "/home/wangzishi/.local/share/poms-r2m-continuation01/private/m-runs/nest-c3647513-cdd8-4d70-9d00-a63583162c73.json",
        "bytes": 3450282,
        "rawBytesSha256": "cd0dd18c8e969f684a9c88d3ecbe8bcfc7f090fc79750828acedf1dbabc51a14"
    },
    "baseline": {
        "file": "/home/wangzishi/.local/share/poms-r2m-continuation01/private/acceptance-runs/nest-c3647513-cdd8-4d70-9d00-a63583162c73/00001.json",
        "bytes": 432855,
        "rawBytesSha256": "1cb0e84519bcf7d26da6edd789bd450fd125c3e0e28afa7557b17786e7f5b51e"
    },
    "sdk": {
        "file": "/home/wangzishi/.local/share/poms-r2m-continuation01/private/acceptance-runs/nest-c3647513-cdd8-4d70-9d00-a63583162c73/00545.json",
        "bytes": 94719,
        "rawBytesSha256": "cf91560bbb2a1e1a0153cc70813fb1ec2c9a37994cb260b5b80e95c8a60f9422"
    },
    "latestFacts": {
        "file": "/home/wangzishi/.local/share/poms-r2m-continuation01/private/acceptance-runs/nest-c3647513-cdd8-4d70-9d00-a63583162c73/00555.json",
        "bytes": 613806,
        "rawBytesSha256": "a6af37596b38f59bf96c6afb7803d401127f9edaaa30c7b639f4d6e33d5531bf"
    }
});
const metadataRef=Object.freeze({"file":"tmp/rust-r2m-continuation01/an7c01a-recovery-metadata01.json","bytes":25389,"rawBytesSha256":"56b078958cb7fda7e1792c47a99b69d978f2ba6e783f5e76b4365e57f99128c0"});
function parents(file){let current='';for(const part of path.dirname(file).split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink());if(current===PRIVATE||current.startsWith(PRIVATE+'/'))assert.equal(stat.mode&0o077,0);}}
function read(ref){const file=path.resolve(ref.file);assert(file.startsWith(ROOT+'/tmp/rust-r2m-continuation01/')||file.startsWith(PRIVATE+'/'));parents(file);const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size===ref.bytes);if(file.startsWith(PRIVATE+'/'))assert.equal(stat.mode&0o777,0o600);const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const opened=fs.fstatSync(fd);assert(opened.ino===stat.ino&&opened.dev===stat.dev);const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['ino','dev','size','mtimeMs','ctimeMs'])assert.equal(opened[key],after[key]);assert.equal(raw.length,ref.bytes);assert.equal(sha(raw),ref.rawBytesSha256);return raw;}finally{fs.closeSync(fd);}}
function save(label,raw){assert(/^[a-z0-9-]+$/.test(label));const file=PRIVATE+'/execution-logs/an7c01a-recovery01-'+label+'.json';parents(file);const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return{file,bytes:raw.length,rawBytesSha256:sha(raw),private:true};}
export function decodeAn7c01aInputs(raw){assert.deepEqual(Object.keys(raw).sort(),Object.keys(an7c01aReferences).sort());return Object.fromEntries(Object.keys(an7c01aReferences).map(key=>{assert(Buffer.isBuffer(raw[key]));return[key,JSON.parse(raw[key])];}));}
export function validateClosedAn7c01a({metadata,report,owner,cap,ledger,baseline,sdk,latestFacts}){
    assert(metadata.kind==='Root-fixed-normal-closed-c01-an7c01a-recovery-metadata'&&metadata.marker===marker&&metadata.database==='poms_r2m_c01_nest'&&metadata.oldRustNeverTarget===true&&metadata.runId===RUN);assert.deepEqual(metadata.refs,an7c01aReferences);
    assert(report.kind==='Root-R2M-actual-API-acceptance-subset'&&report.mode==='api'&&report.backend==='nest'&&report.tag==='an7c01a'&&report.runId===RUN&&report.result==='partial-preserved'&&report.G3Certified===false&&report.G4Certified===false);
    const cases=['M4.1','M4.2','M4.3','M4.4','M5.1','M5.2','M5.3'];assert.deepEqual(report.observation.selection,cases);assert.equal(report.observation.cases.length,7);assert.deepEqual(report.observation.cases.map(item=>item.caseId),cases);assert(report.observation.cases.every(item=>item.caseClosed===true));assert.deepEqual(report.observation.cases.map(item=>item.result),['observed','observed','observed','observed','observed','fail','fail']);assert.deepEqual(metadata.cases,report.observation.cases.map(item=>({caseId:item.caseId,result:item.result,caseClosed:item.caseClosed,rawEvidence:item.rawEvidence})));
    assert(owner.kind==='Root-bounded-current-R2M-acceptance-owner'&&owner.backend==='nest'&&owner.mode==='api'&&owner.tag==='an7c01a'&&owner.result==='failed-preserved'&&owner.cap===an7c01aReferences.cap.file&&owner.capSha256===an7c01aReferences.cap.rawBytesSha256&&owner.privateContentsExported===false&&Date.parse(owner.finishedAt)>=Date.parse(owner.startedAt));
    assert(report.observation.sourceCapId===CAP&&report.observation.source.capId===CAP&&report.observation.source.manifestSha256===MANIFEST);assert(cap.id===CAP&&cap.candidate==='9dcfb498b175e9fdaae7584aff1d5d3f93bf814f'&&cap.manifestSha256===MANIFEST);
    assert.deepEqual(report.recovery,{runId:RUN,...an7c01aReferences.ledger,contentsExported:false});assert.deepEqual(report.closeout,metadata.lifecycle);const close=report.closeout;
    assert(close.kind==='r2m-actual-API-runtime-closeout'&&close.runId===RUN&&close.backend==='nest'&&close.sourceCapId===CAP&&close.result==='partial-preserved');assert.deepEqual(close.cleanup,[]);assert.deepEqual(close.failures,[]);
    assert.deepEqual(close.writers,[{kind:'native',identity:'2000532:native-app',stopped:true},{kind:'controlled-obs',identity:'2000617',stopped:true},{kind:'controlled-feishu',identity:'2000658',stopped:true}]);assert(close.extensionClose.faultsRestored===true&&close.extensionClose.activeRequests===0&&close.extensionClose.pendingTransactions===0);assert.deepEqual(close.extensionClose.writers,[close.writers[1],close.writers[2]]);
    assert(close.pg.observerId===OBSERVER&&close.pg.database==='poms_r2m_c01_nest'&&close.pg.journalFile===PRIVATE+'/pg-create-observers/nest-'+RUN+'-'+OBSERVER+'.json'&&close.pg.result==='observer-footprint-restored'&&close.pg.observerFootprintRestored===true&&close.pg.observerSqlModifiesBusinessRows===false&&close.pg.observerFootprintCatalogSha256==='d3c98b371e258137622d257f3f2850611da515f5886dee6e1e1e1cbf95777256');
    assert(ledger.namespace==='poms-r2m'&&ledger.marker===marker&&ledger.backend==='nest'&&ledger.database==='poms_r2m_c01_nest'&&ledger.runId===RUN&&ledger.state==='prepared'&&!ledger.writerDrain&&!ledger.scopeCorrections&&!ledger.baselineSettingLease&&!ledger.numberLease&&!ledger.numbersLease);
    assert.equal(ledger.objects.length,143);assert(ledger.objects.every(item=>item.creationProof&&item.postcondition?.independentlyVisible===true));const byTable={};for(const item of ledger.objects)byTable[item.table]=(byTable[item.table]??0)+1;assert.deepEqual(byTable,metadata.objectsByTable);
    assert(ledger.intents.every(item=>['adopted','absent'].includes(item.state)));assert(ledger.directCreates.every(item=>item.state==='promoted'));assert.equal(ledger.mutations.length,3);
    const expectedMutationTables=['attachment','attachment_storage_provider_config','attachment_storage_provider_config'];
    assert.deepEqual(ledger.mutations.map(item=>item.table),expectedMutationTables);assert.equal(new Set(ledger.mutations.map(item=>item.table+':'+item.id)).size,3);
    for(const[index,mutation]of ledger.mutations.entries()){
        const column=index===0?'is_latest':'is_default';assert(mutation.state==='committed'&&mutation.reason==='R2M named source-prepared consumption mutation');assert.deepEqual(mutation.values,{[column]:false});assert.deepEqual(Object.keys(mutation).sort(),['table','id','reason','values','transaction','expectedXmin','before','state','after'].sort());assert(mutation.before.id===mutation.id&&mutation.before[column]===true&&mutation.after.id===mutation.id&&mutation.after[column]===false);assert.deepEqual(mutation.after,{...mutation.before,[column]:false});assert(/^[0-9]+$/.test(String(mutation.transaction))&&String(BigInt(mutation.transaction)%4294967296n)===String(mutation.expectedXmin));assert(ledger.objects.some(item=>item.table===mutation.table&&item.id===mutation.id&&item.creationProof&&item.postcondition?.independentlyVisible));
        if(index===0)assert.equal(mutation.id,'7f4ca064-f755-4b95-bf33-604be0bf865f');
    }
    assert.deepEqual(ledger.mutations.map(({table,id,state,values})=>({table,id,state,values})),metadata.mutations);
    assert.equal(metadata.objects,143);assert.deepEqual(metadata.pending,[]);assert.deepEqual(metadata.directStates,['promoted']);assert.deepEqual(metadata.mutationStates,['committed']);assert(metadata.hasSettingLease===false&&metadata.hasNumbersLease===false);
    assert(baseline.kind==='global-before-prepare-full107'&&baseline.record.runId===RUN&&baseline.record.backend==='nest'&&baseline.record.tables.length===107);assert(latestFacts.kind==='complete-full107-private-facts'&&latestFacts.record.runId===RUN&&latestFacts.record.backend==='nest'&&latestFacts.record.tables.length===107&&latestFacts.record.unknownCreates===0&&latestFacts.record.unknownMutations===0);
    assert(sdk.kind==='actual-API-original-SDK-PG-and-queryPID-before-certification');const witness=sdk.record.originalNativeTrace;assert(witness.kind==='mikro-orm-L-original-create-outer-commit-witness'&&witness.complete===true&&witness.openTransactions.length===0&&witness.pendingStartCount===0);assert.deepEqual(metadata.sdkWitness,{complete:true,openTransactions:0,pendingStartCount:0});
    const local=ledger.localObjects,root='/home/wangzishi/.local/share/poms-r2m-continuation01/objects/nest/server01',prefix=root+'/poms-r2m/'+RUN;assert.deepEqual(local,metadata.localObjects);assert.deepEqual(Object.keys(local).sort(),['root','prefix','beforePrefixAbsent','files'].sort());assert(local.root===root&&local.prefix===prefix&&local.beforePrefixAbsent===true&&local.files.length===7);assert.equal(new Set(local.files.map(item=>item.key)).size,7);const fileFields=['table','id','key','file','bytes','sha256','actualRowStorageKeyConfirmed'];
    for(const file of local.files){assert.deepEqual(Object.keys(file).sort(),fileFields.slice().sort());assert(['attachment','attachment_upload_session','attachment_download_package'].includes(file.table)&&typeof file.key==='string'&&file.key.startsWith('poms-r2m/'+RUN+'/')&&!file.key.includes('\\')&&file.key.split('/').every(part=>part&&part!=='.'&&part!=='..'));assert(file.file===root+'/'+file.key&&file.file.startsWith(prefix+'/')&&file.actualRowStorageKeyConfirmed===true&&/^[0-9a-f]{64}$/.test(file.sha256)&&Number.isSafeInteger(file.bytes)&&file.bytes>0);assert(ledger.objects.some(item=>item.table===file.table&&item.id===file.id));const table=latestFacts.record.tables.find(item=>item.table===file.table),row=table?.rows.find(item=>item.id===file.id);assert(row?.storage_key===file.key&&(row.storage_provider??row.provider_type)==='local');}
    assert.deepEqual(ledger.fixtureProfile,metadata.fixtureProfile);assert.equal(ledger.fixtureProfile.sources.length,32);assert.equal(ledger.fixtureProfile.name,'r2m-stage-continuation01');assert.equal(metadata.observerModule.rawBytesSha256,PG_SOURCE);assert.deepEqual(metadata.latestFacts,{unknownCreates:0,unknownMutations:0});

    return true;
}
async function assertWriterAbsent(writer){const pid=Number(writer.identity.split(':')[0]);assert([2000532,2000617,2000658].includes(pid));let absent=false;try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')absent=true;else throw error;}assert(absent);return{kind:writer.kind,pid,absent:true};}
export async function recoverClosedAn7c01a(){
    assert(process.platform==='linux'&&process.cwd()===ROOT);const output='tmp/rust-r2m-continuation01/recovered-api-nest-an7c01a01.json';assert(!fs.existsSync(output));const record={kind:'Root-one-normal-closed-an7c01a-owned-only-recovery',runId:RUN,backend:'nest',sourceCapId:CAP,result:'pending',cleanup:[],selectorCorrection:false,identityAdoption:false,oldBusinessResultChanged:false};let fixture,reader;
    try{
        const metadata=JSON.parse(read(metadataRef)),raw=Object.fromEntries(Object.entries(an7c01aReferences).map(([key,ref])=>[key,read(ref)])),data={metadata,...decodeAn7c01aInputs(raw)};validateClosedAn7c01a(data);verifySourceCap(data.cap,{candidate:data.cap.candidate});
        const files=[...data.ledger.fixtureProfile.sources];if(!files.some(item=>item.file==='tools/rust-r2m-continuation01/pg-create-observer.mjs')){const pg=data.cap.files.find(item=>item.file==='tools/rust-r2m-continuation01/pg-create-observer.mjs');assert(pg?.rawBytesSha256===PG_SOURCE);files.push(pg);}assert(files.find(item=>item.file==='tools/rust-r2m-continuation01/pg-create-observer.mjs').rawBytesSha256===PG_SOURCE);
        reader=new SourceReader({root:ROOT,pins:files,sourceEpoch:CAP});for(const pin of files){assert(data.cap.files.some(item=>item.file===pin.file&&item.rawBytesSha256===pin.rawBytesSha256));reader.read(pin.file);}
        record.originalLedger=save('original-ledger-cd0dd18c',raw.ledger);record.savedBeforeFixtureOpen=true;
        record.freshWriterAbsence=[];for(const writer of data.report.closeout.writers)record.freshWriterAbsence.push(await assertWriterAbsent(writer));const runtime=createRequire(import.meta.url)('../e2e/runtime.cjs');record.fivePortsFree=[];for(const port of[10070,10071,10080,10090,10091]){await runtime.assertPortAvailable(runtime.resolveTarget({mode:'external',baseUrl:'http://127.0.0.1:'+port}));record.fivePortsFree.push(port);}
        const{Fixture}=await import('../rust-r2m-continuation01/fixture.mjs');fixture=await Fixture.open('nest',RUN);const reopened=structuredClone(fixture.j);reopened.revision--;assert.equal(digest(reopened),digest(data.ledger),'Only the ordinary Fixture.open revision may precede recovery');
        assert.equal((await fixture.client.query("select count(*)::int n from pg_stat_activity where datname=current_database() and usename='poms_r2m_c01_app' and pid<>pg_backend_pid()")).rows[0].n,0);assert.equal((await fixture.client.query('select count(*)::int n from pg_prepared_xacts where database=current_database()')).rows[0].n,0);record.appConnectionsAndPreparedTransactionsZero=true;
        const{reconcilePgCreateObserver}=await import('../rust-r2m-continuation01/pg-create-observer.mjs');record.observer=await reconcilePgCreateObserver(fixture,{journalFile:data.report.closeout.pg.journalFile});assert(record.observer.result==='exact-original-footprint-present'&&record.observer.observerFootprintRestored===true&&!record.observer.handle&&record.observer.observerId===OBSERVER);assert.equal(record.observer.event.observedCatalogSha256,data.report.closeout.pg.observerFootprintCatalogSha256);record.observerOriginalModuleSha256=PG_SOURCE;
        const before=await fixture.facts();assert(before.unknownCreates===0&&before.unknownMutations===0);assert.equal(digest(normalizedRows(before.tables)),digest(normalizedRows(data.latestFacts.record.tables)),'Closed-run current full107 differs from retained final facts');record.preflight=await fixture.preflight();assert.equal(record.preflight.tablesScanned,107);
        fixture.drain({namespace:'poms-r2m',marker,backend:'nest',runId:RUN,activeRequests:0,pendingTransactions:0,observersRestored:true,writers:data.report.closeout.writers,sourceCapsuleSha256:MANIFEST});record.normalClosedReceiptReused=true;
        record.cleanup.push(await fixture.cleanup());assert.equal(record.cleanup[0].deleted,143);assert.equal(record.cleanup[0].objects.changed,7);assert.equal(record.cleanup[0].secondObjects.changed,0);record.cleanup.push(await fixture.cleanup());assert(record.cleanup[1].deleted===0&&record.cleanup[1].objects.changed===0&&record.cleanup[1].secondObjects.changed===0);
        const after=await fixture.facts();assert(after.unknownCreates===0&&after.unknownMutations===0);assert.equal(digest(normalizedRows(after.tables)),digest(normalizedRows(data.baseline.record.tables)));record.afterFull107=save('after-full107',Buffer.from(JSON.stringify(after)+'\n'));reader.assertUnchanged();record.full107InitialBaselineRestored=true;record.result='recovered-exact-normal-closed-owned-double-zero-not-business-pass';
    }catch(error){record.result='recovery-incomplete-preserved';record.failureCategory='fixed-an7c01a-recovery-failed';try{record.privateFailure=save('failure',Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack,code:error.code})+'\n'));}catch{record.privateFailureRetentionFailed=true;}process.exitCode=1;
    }finally{
        if(fixture)try{await fixture.close();record.fixtureClientClosed=true;}catch(error){record.result='recovery-incomplete-preserved';record.fixtureClientClosed=false;try{record.privateCloseFailure=save('close-failure',Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack,code:error.code})+'\n'));}catch{record.privateCloseFailureRetentionFailed=true;}process.exitCode=1;}
        fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,result:record.result,deleted:record.cleanup[0]?.deleted,objects:record.cleanup[0]?.objects.changed,secondDeleted:record.cleanup[1]?.deleted,full107InitialBaselineRestored:record.full107InitialBaselineRestored??false}));
    }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv.length===3&&['--run','--check'].includes(process.argv[2]));if(process.argv[2]==='--run')await recoverClosedAn7c01a();else console.log(JSON.stringify({sourceOnly:true,actual:false,runId:RUN,sourceCapId:CAP,objects:143,files:7}));}
