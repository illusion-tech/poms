// Fixed normal-closed an4c only. Root executes; no selector correction/adoption.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SourceReader,verifySourceCap} from './acceptance-source.mjs';
import {marker} from './fixture-guard.mjs';
import {digest,normalizedRows} from './audit-qa-common.mjs';
const ROOT='/home/wangzishi/projects/poms-rust-r2m',PRIVATE='/home/wangzishi/.local/share/poms-r2m/private';
const RUN='3cc41db5-c2e0-492a-b90e-262e56b32c90',CAP='r2m-joint28',MANIFEST='173feb5285dc0765f212deae45a1471bf6b2eab05b1a5d63bde3a9c6691de2ac';
const PG_SOURCE='6d9f8c9dea2c9af7cbbbd4cfa06fd452b41a84bbff8e3146f3b351beb2cdaba3',OBSERVER='c45e7c59-9fa8-4c99-b8b6-10f55373ff0b';
const directory=PRIVATE+'/acceptance-runs/nest-'+RUN,sha=value=>createHash('sha256').update(value).digest('hex');
export const an4cReferences=Object.freeze({
    "report": {
        "file": "tmp/rust-r2m/acceptance-api-nest-an4c.json",
        "bytes": 48300,
        "rawBytesSha256": "304a257834e31047413cf0314088a5cbab2c12d19e28df55e34ace332f351622"
    },
    "cap": {
        "file": "tmp/rust-r2m/source-cap-joint28.json",
        "bytes": 1432594,
        "rawBytesSha256": "7bab4e01a800b0c887fc2872aa31552f45aeb64ebb458fde4e4c49451740a22a"
    },
    "ledger": {
        "file": "/home/wangzishi/.local/share/poms-r2m/private/m-runs/nest-3cc41db5-c2e0-492a-b90e-262e56b32c90.json",
        "bytes": 1977818,
        "rawBytesSha256": "404c888fc6d88d2b505baf62c0c1c6a1b057a75a12f65a763ed201f69dc8f629"
    },
    "baseline": {
        "file": "/home/wangzishi/.local/share/poms-r2m/private/acceptance-runs/nest-3cc41db5-c2e0-492a-b90e-262e56b32c90/00001.json",
        "bytes": 432851,
        "rawBytesSha256": "6c2b95dfbd159096e528d1b112a84f8bb0b7dbe834588bbcd31f0333bb9c2a88"
    },
    "sdk": {
        "file": "/home/wangzishi/.local/share/poms-r2m/private/acceptance-runs/nest-3cc41db5-c2e0-492a-b90e-262e56b32c90/00333.json",
        "bytes": 74729,
        "rawBytesSha256": "47ecd4f02689a1b4c7cac9d2817cb984a40812738ed2c673ce1ba3e9e4733608"
    },
    "latestFacts": {
        "file": "/home/wangzishi/.local/share/poms-r2m/private/acceptance-runs/nest-3cc41db5-c2e0-492a-b90e-262e56b32c90/00342.json",
        "bytes": 569482,
        "rawBytesSha256": "4c4b30761c52014b5ecb0915eb49a1b4b2734e89cc4f3257629777412332363a"
    }
});
const metadataRef=Object.freeze({"file":"tmp/rust-r2m/an4c-recovery-metadata02.json","bytes":10667,"rawBytesSha256":"36026cc48bf143ef78f3de9832a147dcac5e34f292682ba17d5d8be501bb56dd"});
function parents(file){let current='';for(const part of path.dirname(file).split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink());if(current===PRIVATE||current.startsWith(PRIVATE+'/'))assert.equal(stat.mode&0o077,0);}}
function read(ref){const file=path.resolve(ref.file);assert(file.startsWith(ROOT+'/tmp/rust-r2m/')||file.startsWith(PRIVATE+'/'));parents(file);const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size===ref.bytes);if(file.startsWith(PRIVATE+'/'))assert.equal(stat.mode&0o777,0o600);const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const opened=fs.fstatSync(fd);assert(opened.ino===stat.ino&&opened.dev===stat.dev);const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['ino','dev','size','mtimeMs','ctimeMs'])assert.equal(opened[key],after[key]);assert.equal(raw.length,ref.bytes);assert.equal(sha(raw),ref.rawBytesSha256);return raw;}finally{fs.closeSync(fd);}}
function save(label,raw){assert(/^[a-z0-9-]+$/.test(label));const file=PRIVATE+'/execution-logs/an4c-recovery01-'+label+'.json';parents(file);const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return{file,bytes:raw.length,rawBytesSha256:sha(raw),private:true};}
export function decodeAn4cInputs(raw){assert.deepEqual(Object.keys(raw).sort(),Object.keys(an4cReferences).sort());return Object.fromEntries(Object.keys(an4cReferences).map(key=>{assert(Buffer.isBuffer(raw[key]));return[key,JSON.parse(raw[key])];}));}
export function validateClosedAn4c({metadata,report,cap,ledger,baseline,sdk,latestFacts}){
    assert(metadata.kind==='Root-one-normal-closed-M4-partial-public-metadata-with-local-files'&&metadata.runId===RUN);assert.deepEqual(metadata.refs,an4cReferences);
    assert(report.kind==='Root-R2M-actual-API-acceptance-subset'&&report.mode==='api'&&report.backend==='nest'&&report.tag==='an4c'&&report.runId===RUN&&report.result==='partial-preserved'&&report.G3Certified===false&&report.G4Certified===false);
    assert.deepEqual(report.observation.selection,['M4.1','M4.2','M4.3','M4.4']);assert.equal(report.observation.cases.length,4);assert.deepEqual(report.observation.cases.map(item=>item.caseId),['M4.1','M4.2','M4.3','M4.4']);assert.deepEqual(report.observation.cases.map(item=>item.caseClosed),[true,false,true,true]);assert.deepEqual(report.observation.cases.map(item=>item.result),['observed','fail','fail','observed']);
    assert(report.observation.sourceCapId===CAP&&report.observation.source.capId===CAP&&report.observation.source.manifestSha256===MANIFEST);assert(cap.id===CAP&&cap.candidate==='9dcfb498b175e9fdaae7584aff1d5d3f93bf814f'&&cap.manifestSha256===MANIFEST);
    assert.deepEqual(report.recovery,{runId:RUN,...an4cReferences.ledger,contentsExported:false});assert.deepEqual(report.closeout,metadata.lifecycle);const close=report.closeout;
    assert(close.kind==='r2m-actual-API-runtime-closeout'&&close.runId===RUN&&close.backend==='nest'&&close.sourceCapId===CAP&&close.result==='partial-preserved');assert.deepEqual(close.cleanup,[]);assert.deepEqual(close.failures,[]);
    assert.deepEqual(close.writers,[{kind:'native',identity:'1897421:native-app',stopped:true},{kind:'controlled-obs',identity:'1897500',stopped:true}]);assert(close.extensionClose.faultsRestored===true&&close.extensionClose.activeRequests===0&&close.extensionClose.pendingTransactions===0);assert.deepEqual(close.extensionClose.writers,[close.writers[1]]);
    assert(close.pg.observerId===OBSERVER&&close.pg.database==='poms_r2m_nest'&&close.pg.journalFile===PRIVATE+'/pg-create-observers/nest-'+RUN+'-'+OBSERVER+'.json'&&close.pg.result==='observer-footprint-restored'&&close.pg.observerFootprintRestored===true&&close.pg.observerSqlModifiesBusinessRows===false&&close.pg.observerFootprintCatalogSha256==='fa06480440bb01af6cfd9bb164eb3b2794f845dccaf96aa69ef05aa24646a238');
    assert(ledger.namespace==='poms-r2m'&&ledger.marker===marker&&ledger.backend==='nest'&&ledger.database==='poms_r2m_nest'&&ledger.runId===RUN&&ledger.state==='prepared'&&!ledger.writerDrain&&!ledger.scopeCorrections&&!ledger.baselineSettingLease&&!ledger.numberLease&&!ledger.numbersLease);
    assert.equal(ledger.objects.length,117);assert(ledger.objects.every(item=>item.creationProof&&item.postcondition?.independentlyVisible===true));const byTable={};for(const item of ledger.objects)byTable[item.table]=(byTable[item.table]??0)+1;assert.deepEqual(byTable,metadata.objectsByTable);
    assert(ledger.intents.every(item=>['adopted','absent'].includes(item.state)));assert(ledger.directCreates.every(item=>item.state==='promoted'));assert.equal(ledger.mutations.length,3);
    const expectedMutationTables=['attachment','attachment_storage_provider_config','attachment_storage_provider_config'];
    assert.deepEqual(ledger.mutations.map(item=>item.table),expectedMutationTables);assert.equal(new Set(ledger.mutations.map(item=>item.table+':'+item.id)).size,3);
    for(const[index,mutation]of ledger.mutations.entries()){
        const column=index===0?'is_latest':'is_default';assert(mutation.state==='committed'&&mutation.reason==='R2M named source-prepared consumption mutation');assert.deepEqual(mutation.values,{[column]:false});assert.deepEqual(Object.keys(mutation).sort(),['table','id','reason','values','transaction','expectedXmin','before','state','after'].sort());assert(mutation.before.id===mutation.id&&mutation.before[column]===true&&mutation.after.id===mutation.id&&mutation.after[column]===false);assert.deepEqual(mutation.after,{...mutation.before,[column]:false});assert(/^[0-9]+$/.test(String(mutation.transaction))&&String(BigInt(mutation.transaction)%4294967296n)===String(mutation.expectedXmin));assert(ledger.objects.some(item=>item.table===mutation.table&&item.id===mutation.id&&item.creationProof&&item.postcondition?.independentlyVisible));
        if(index===0)assert.equal(mutation.id,'f7b01c7b-ccc3-49db-b859-395806ce941c');
    }
    assert.deepEqual(metadata.mutationShape.map(item=>({table:item.table,state:item.state,valueColumns:item.valueColumns,reason:item.reason})),expectedMutationTables.map((table,index)=>({table,state:'committed',valueColumns:[index===0?'is_latest':'is_default'],reason:'R2M named source-prepared consumption mutation'})));
    assert.equal(metadata.objects,117);assert.deepEqual(metadata.pending,[]);assert.deepEqual(metadata.directStates,['promoted']);assert.deepEqual(metadata.mutationStates,['committed']);assert(metadata.hasSettingLease===false&&metadata.hasNumbersLease===false);
    assert(baseline.kind==='global-before-prepare-full107'&&baseline.record.runId===RUN&&baseline.record.backend==='nest'&&baseline.record.tables.length===107);assert(latestFacts.kind==='complete-full107-private-facts'&&latestFacts.record.runId===RUN&&latestFacts.record.backend==='nest'&&latestFacts.record.tables.length===107&&latestFacts.record.unknownCreates===0&&latestFacts.record.unknownMutations===0);
    assert(sdk.kind==='actual-API-original-SDK-PG-and-queryPID-before-certification');const witness=sdk.record.originalNativeTrace;assert(witness.kind==='mikro-orm-L-original-create-outer-commit-witness'&&witness.complete===true&&witness.openTransactions.length===0&&witness.pendingStartCount===0);assert.deepEqual(metadata.sdkWitness,{complete:true,openTransactions:0,pendingStartCount:0});
    const local=ledger.localObjects,root='/home/wangzishi/.local/share/poms-r2m/objects/nest/server01',prefix=root+'/poms-r2m/'+RUN;assert.deepEqual(Object.keys(local).sort(),['root','prefix','beforePrefixAbsent','files'].sort());assert.deepEqual(metadata.localObjects.keys,['root','prefix','beforePrefixAbsent','files']);assert(local.root===root&&local.prefix===prefix&&local.beforePrefixAbsent===true&&local.files.length===6);assert.equal(new Set(local.files.map(item=>item.key)).size,6);assert.equal(metadata.localObjects.fileCount,6);assert.deepEqual(metadata.localObjects.fileFieldKeys,['table','id','key','file','bytes','sha256','actualRowStorageKeyConfirmed']);assert(!Object.hasOwn(metadata.localObjects,'fileStates'),'Metadata02 records real field keys, not an invented state projection');
    for(const file of local.files){assert.deepEqual(Object.keys(file).sort(),metadata.localObjects.fileFieldKeys.slice().sort());assert(['attachment','attachment_upload_session'].includes(file.table)&&typeof file.key==='string'&&file.key.startsWith('poms-r2m/'+RUN+'/')&&!file.key.includes('\\')&&file.key.split('/').every(part=>part&&part!=='.'&&part!=='..'));assert(file.file===root+'/'+file.key&&file.file.startsWith(prefix+'/')&&file.actualRowStorageKeyConfirmed===true&&/^[0-9a-f]{64}$/.test(file.sha256)&&Number.isSafeInteger(file.bytes)&&file.bytes>0);assert(ledger.objects.some(item=>item.table===file.table&&item.id===file.id));const table=latestFacts.record.tables.find(item=>item.table===file.table),row=table?.rows.find(item=>item.id===file.id);assert(row?.storage_key===file.key&&(row.storage_provider??row.provider_type)==='local');}
    assert.equal(digest(metadata.actualVersionNegative),"8c690625a01e05b92c894eaa7bb9d23c469cd846c3077e062e18e69f7bb5c363");
    const sessions=latestFacts.record.tables.find(item=>item.table==='attachment_upload_session').rows,attachments=latestFacts.record.tables.find(item=>item.table==='attachment').rows;assert.equal(sessions.length,7);assert.equal(attachments.length,6);for(const expected of metadata.actualVersionNegative.uploadRows){const row=sessions.find(item=>item.id===expected.id);assert(row?.status===expected.status&&row.row_version===expected.rowVersion&&row.operation_type===expected.operationType&&row.failed_reason===null);}for(const expected of metadata.actualVersionNegative.attachments){const row=attachments.find(item=>item.id===expected.id);assert(row&&row.version_no===expected.versionNo&&row.is_latest===expected.isLatest&&row.is_final===expected.isFinal&&row.status===expected.status);}const providers=latestFacts.record.tables.find(item=>item.table==='attachment_storage_provider_config').rows;assert.equal(providers.length,2);assert.deepEqual(providers.map(item=>item.provider_type).sort(),['huawei-obs-s3','local']);
    for(const mutation of ledger.mutations.slice(1))assert(providers.some(row=>row.id===mutation.id),'Prepared-default mutation must belong to one of the two actual certified provider rows');
    // The final current provider/API version state is retained verbatim in the
    // hash-pinned latestFacts. Do not reverse either committed preparation.
    
    return true;
}
async function assertWriterAbsent(writer){const pid=Number(writer.identity.split(':')[0]);assert([1897421,1897500].includes(pid));let absent=false;try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')absent=true;else throw error;}assert(absent);return{kind:writer.kind,pid,absent:true};}
export async function recoverClosedAn4c(){
    assert(process.platform==='linux'&&process.cwd()===ROOT);const output='tmp/rust-r2m/recovered-api-nest-an4c01.json';assert(!fs.existsSync(output));const record={kind:'Root-one-normal-closed-an4c-owned-only-recovery',runId:RUN,backend:'nest',sourceCapId:CAP,result:'pending',cleanup:[],selectorCorrection:false,identityAdoption:false,oldBusinessResultChanged:false};let fixture,reader;
    try{
        const metadata=JSON.parse(read(metadataRef)),raw=Object.fromEntries(Object.entries(an4cReferences).map(([key,ref])=>[key,read(ref)])),data={metadata,...decodeAn4cInputs(raw)};validateClosedAn4c(data);verifySourceCap(data.cap,{candidate:data.cap.candidate});
        const files=[...data.ledger.fixtureProfile.sources];if(!files.some(item=>item.file==='tools/rust-r2m/pg-create-observer.mjs')){const pg=data.cap.files.find(item=>item.file==='tools/rust-r2m/pg-create-observer.mjs');assert(pg?.rawBytesSha256===PG_SOURCE);files.push(pg);}assert(files.find(item=>item.file==='tools/rust-r2m/pg-create-observer.mjs').rawBytesSha256===PG_SOURCE);
        reader=new SourceReader({root:ROOT,pins:files,sourceEpoch:CAP});for(const pin of files){assert(data.cap.files.some(item=>item.file===pin.file&&item.rawBytesSha256===pin.rawBytesSha256));reader.read(pin.file);}
        record.originalLedger=save('original-ledger-404c888f',raw.ledger);record.savedBeforeFixtureOpen=true;
        record.freshWriterAbsence=[];for(const writer of data.report.closeout.writers)record.freshWriterAbsence.push(await assertWriterAbsent(writer));const runtime=createRequire(import.meta.url)('../e2e/runtime.cjs');record.fivePortsFree=[];for(const port of[10070,10071,10080,10090,10091]){await runtime.assertPortAvailable(runtime.resolveTarget({mode:'external',baseUrl:'http://127.0.0.1:'+port}));record.fivePortsFree.push(port);}
        const{Fixture}=await import('./fixture.mjs');fixture=await Fixture.open('nest',RUN);const reopened=structuredClone(fixture.j);reopened.revision--;assert.equal(digest(reopened),digest(data.ledger),'Only the ordinary Fixture.open revision may precede recovery');
        assert.equal((await fixture.client.query("select count(*)::int n from pg_stat_activity where datname=current_database() and usename='poms_r2m_app' and pid<>pg_backend_pid()")).rows[0].n,0);assert.equal((await fixture.client.query('select count(*)::int n from pg_prepared_xacts where database=current_database()')).rows[0].n,0);record.appConnectionsAndPreparedTransactionsZero=true;
        const{reconcilePgCreateObserver}=await import('./pg-create-observer.mjs');record.observer=await reconcilePgCreateObserver(fixture,{journalFile:data.report.closeout.pg.journalFile});assert(record.observer.result==='exact-original-footprint-present'&&record.observer.observerFootprintRestored===true&&!record.observer.handle&&record.observer.observerId===OBSERVER);assert.equal(record.observer.event.observedCatalogSha256,data.report.closeout.pg.observerFootprintCatalogSha256);record.observerOriginalModuleSha256=PG_SOURCE;
        const before=await fixture.facts();assert(before.unknownCreates===0&&before.unknownMutations===0);assert.equal(digest(normalizedRows(before.tables)),digest(normalizedRows(data.latestFacts.record.tables)),'Closed-run current full107 differs from retained final facts');record.preflight=await fixture.preflight();assert.equal(record.preflight.tablesScanned,107);
        fixture.drain({namespace:'poms-r2m',marker,backend:'nest',runId:RUN,activeRequests:0,pendingTransactions:0,observersRestored:true,writers:data.report.closeout.writers,sourceCapsuleSha256:MANIFEST});record.normalClosedReceiptReused=true;
        record.cleanup.push(await fixture.cleanup());assert.equal(record.cleanup[0].deleted,117);assert.equal(record.cleanup[0].objects.changed,6);assert.equal(record.cleanup[0].secondObjects.changed,0);record.cleanup.push(await fixture.cleanup());assert(record.cleanup[1].deleted===0&&record.cleanup[1].objects.changed===0&&record.cleanup[1].secondObjects.changed===0);
        const after=await fixture.facts();assert(after.unknownCreates===0&&after.unknownMutations===0);assert.equal(digest(normalizedRows(after.tables)),digest(normalizedRows(data.baseline.record.tables)));record.afterFull107=save('after-full107',Buffer.from(JSON.stringify(after)+'\n'));reader.assertUnchanged();record.full107InitialBaselineRestored=true;record.result='recovered-exact-normal-closed-owned-double-zero-not-business-pass';
    }catch(error){record.result='recovery-incomplete-preserved';record.failureCategory='fixed-an4c-recovery-failed';try{record.privateFailure=save('failure',Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack,code:error.code})+'\n'));}catch{record.privateFailureRetentionFailed=true;}process.exitCode=1;
    }finally{
        if(fixture)try{await fixture.close();record.fixtureClientClosed=true;}catch(error){record.result='recovery-incomplete-preserved';record.fixtureClientClosed=false;try{record.privateCloseFailure=save('close-failure',Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack,code:error.code})+'\n'));}catch{record.privateCloseFailureRetentionFailed=true;}process.exitCode=1;}
        fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,result:record.result,deleted:record.cleanup[0]?.deleted,objects:record.cleanup[0]?.objects.changed,secondDeleted:record.cleanup[1]?.deleted,full107InitialBaselineRestored:record.full107InitialBaselineRestored??false}));
    }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv.length===3&&['--run','--check'].includes(process.argv[2]));if(process.argv[2]==='--run')await recoverClosedAn4c();else console.log(JSON.stringify({sourceOnly:true,actual:false,runId:RUN,sourceCapId:CAP,objects:117,files:6}));}
