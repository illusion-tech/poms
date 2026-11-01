// Explicit Root actual entry. Import/--check never opens private/DB/HTTP/browser.
// Linux managed runtime is a real Linux Native/Rust process plus a real browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SourceReader,verifySourceCap} from './acceptance-source.mjs';
import {verifyUiBuild,startManagedUiServer} from './ui-runtime-server.mjs';
import {runUiJourneys} from './acceptance-ui-browser.mjs';
import {browserChildEnvironment,verifyBrowserPin,browserLaunchArguments} from './ui-runtime-browser.mjs';
import {installUncachedUiInput} from './ui-runtime-cache.mjs';
import {createUiSourcePreparer,uiStepScope,uiNativeReadModels,uiExchangeIntents} from './ui-runtime-sources.mjs';
import {settingLeaseScope,settingKey} from './scenario-input.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..'),LINUX_ROOT='/home/wangzishi/projects/poms-rust-r2m';
const PRIVATE='/home/wangzishi/.local/share/poms-r2m/private';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REQUIRED=['tools/rust-r2m/fixture-ui-package-intent.mjs','tools/rust-r2m/ui-runtime-full.mjs','tools/rust-r2m/ui-runtime-sources.mjs','tools/rust-r2m/ui-runtime-server.mjs','tools/rust-r2m/ui-runtime-browser.mjs','tools/rust-r2m/ui-runtime-cache.mjs','tools/rust-r2m/audit-attachment-source.mjs','tools/rust-r2m/acceptance-runtime.mjs','tools/rust-r2m/acceptance-ui-browser.mjs','tools/rust-r2m/acceptance-prepared.mjs','tools/rust-r2m/native-app.mjs','tools/rust-r2m/rust-app.mjs','tools/rust-r2m/fixture.mjs','tools/rust-r2m/pg-create-observer.mjs','tools/e2e/runtime.cjs','tools/e2e/runtime-worker.cjs'];

export function uiRuntimePlan({backend,tag,selection,runId}){
    assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,24}$/.test(tag??''));
    assert(UUID.test(runId));assert(Array.isArray(selection)&&selection.length>0&&new Set(selection).size===selection.length&&selection.every(id=>['UI1','UI2','UI3','UI4'].includes(id)),'Explicit finite UI selection required');
    return{kind:'R2M-Linux-managed-original-UI-owner-plan',backend,tag,runId,selection,platform:'linux',origin:'http://127.0.0.1:10080',apiPorts:[10070,...(backend==='rust'?[10071]:[])],notRun:['UI1','UI2','UI3','UI4'].filter(id=>!selection.includes(id)),G3Certified:false,G4Certified:false};
}

function regularPath(file){
    const absolute=path.resolve(file);let current=path.parse(absolute).root;
    for(const part of absolute.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink(),'Symlink refused')}
    const stat=fs.lstatSync(absolute);assert(stat.isFile()&&stat.nlink===1);assert.equal(fs.realpathSync(absolute),absolute);return absolute;
}
export function readUiPublicInput(file){
    assert(typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['private','.env'].includes(part)));
    assert(file.startsWith('tmp/rust-r2m/')||file.startsWith('docs/design/rust-r2m/'));
    return JSON.parse(fs.readFileSync(regularPath(path.join(ROOT,file)),'utf8'));
}

function privateRecorder(backend,runId){
    assert.equal(process.platform,'linux');const root=PRIVATE+'/ui-runs',directory=root+'/'+backend+'-'+runId;
    let current='';for(const part of PRIVATE.split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink())}
    assert.equal(fs.lstatSync(PRIVATE).mode&0o077,0);
    for(const dir of[root,directory]){if(!fs.existsSync(dir))fs.mkdirSync(dir,{mode:0o700});const stat=fs.lstatSync(dir);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0)}
    let index=0;
    return async function retain({kind,record,...metadata}){
        const file=directory+'/'+String(index++).padStart(5,'0')+'.json',bytes=Buffer.from(JSON.stringify({kind,...metadata,record})+'\n');
        const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
        try{const before=fs.fstatSync(fd);assert(before.isFile()&&before.nlink===1&&(before.mode&0o777)===0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);const after=fs.lstatSync(file);assert(after.ino===before.ino&&after.dev===before.dev&&!after.isSymbolicLink())}finally{fs.closeSync(fd)}
        return{file,bytes:bytes.length,rawBytesSha256:sha(bytes),private:true};
    };
}

function ownedLinuxIdentity(runId){
    assert.equal(process.env.POMS_E2E_RUN_ID,'r2m-ui-'+runId,'Exact runtime.cjs owned-command identity required');
    const read=pid=>{const text=fs.readFileSync('/proc/'+pid+'/stat','utf8'),fields=text.slice(text.lastIndexOf(')')+2).split(' ');return{pid,parentPid:Number(fields[1]),group:Number(fields[2]),startTicks:fields[19]}};
    const worker=read(process.pid),anchor=read(process.ppid);assert.equal(worker.group,anchor.pid);assert.equal(anchor.group,anchor.pid);
    assert.equal(fs.readlinkSync('/proc/'+anchor.pid+'/cwd'),ROOT);assert.equal(fs.realpathSync('/proc/'+anchor.pid+'/exe'),fs.realpathSync(process.execPath));
    const argv=fs.readFileSync('/proc/'+anchor.pid+'/cmdline','utf8').split('\0').filter(Boolean);assert.deepEqual(argv,[process.execPath,path.join(ROOT,'tools/e2e/runtime-worker.cjs')]);
    return{worker,anchor,anchorSource:'tools/e2e/runtime-worker.cjs',kind:'actual-owned-Linux-process-group'};
}

export function verifyUiOwnerInputs({sourceCap,input,browser,backend,tag,runId,selection,settingAdmission,auditIdentityApproval,uiPackageItemAdmission}){
    const plan=uiRuntimePlan({backend,tag,runId,selection});verifySourceCap(sourceCap,{candidate:sourceCap.candidate,files:REQUIRED});
    const reader=new SourceReader({root:ROOT,pins:sourceCap.files,sourceEpoch:sourceCap.id});for(const pin of sourceCap.files)reader.read(pin.file);
    assert(input?.sourceProtection?.currentSurface?.length===115);
    if(selection.includes('UI2'))assert(settingAdmission?.runId===runId&&settingAdmission.caseId===settingLeaseScope,'UI2 requires Root exact new-environment singleton admission for this run');
    if(selection.includes('UI4'))assert(auditIdentityApproval?.kind==='Root-R2M-source-bound-audit-identity-admission'&&auditIdentityApproval.rootApproved===true&&auditIdentityApproval.runId===runId&&auditIdentityApproval.backend===backend&&auditIdentityApproval.database==='poms_r2m_'+backend&&auditIdentityApproval.sourceCapId===sourceCap.id&&auditIdentityApproval.allowedSourceKinds?.includes('attachment-provider-null'),'UI4 requires the exact fresh Root/C provider audit admission before fixture I/O');
    if(selection.includes('UI4'))assert(uiPackageItemAdmission?.kind==='Root-R2M-exact-UI4-package-item-before-intent-admission'&&uiPackageItemAdmission.rootApproved===true&&uiPackageItemAdmission.marker==='1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5'&&uiPackageItemAdmission.runId===runId&&uiPackageItemAdmission.backend===backend&&uiPackageItemAdmission.database==='poms_r2m_'+backend&&uiPackageItemAdmission.sourceCapId===sourceCap.id&&uiPackageItemAdmission.caseId==='m.ui4.integration'&&uiPackageItemAdmission.logicalCase==='UI4'&&uiPackageItemAdmission.stepId==='package-create'&&uiPackageItemAdmission.maximumItems===64,'UI4 requires its independently reviewed exact real-browser package reservation before fixture I/O');
    const artifact=sourceCap.artifacts.filter(item=>item.kind==='ui-build');assert.equal(artifact.length,1);const ui=artifact[0];
    assert.equal(sha(Buffer.from(JSON.stringify(ui.members))),ui.rawBytesSha256,'Exact UI artifact manifest must belong to this capsule');
    const directory=path.resolve(ROOT,ui.buildDirectory);assert(directory.startsWith(ROOT+path.sep));
    const buildFiles=ui.members.map(item=>{const absolute=path.resolve(ROOT,item.file);assert(absolute.startsWith(directory+path.sep));return{file:path.relative(directory,absolute).split(path.sep).join('/'),bytes:item.bytes,rawBytesSha256:item.rawBytesSha256}});
    verifyUiBuild({buildDirectory:directory,buildFiles});
    assert(browser&&typeof browser.executable==='string'&&/^[0-9a-f]{64}$/.test(browser.rawBytesSha256));
    assert(path.isAbsolute(browser.executable)&&!browser.executable.includes('/poms-r2l/')&&!browser.executable.includes('/private/'));
    return{plan,reader,buildDirectory:directory,buildFiles,browser:{...browser},uiArtifact:{bytes:ui.bytes,rawBytesSha256:ui.rawBytesSha256}};
}

// Called only inside this file's precise owned Linux worker. Nothing launches
// on import. Inputs contain executable pins, never credentials or old state.
export async function runManagedUi(options){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),LINUX_ROOT);assert.equal(process.version,'v24.19.0');
    assert.equal(options.ownedWorker,true,'Actual UI requires the owned-command worker');
    const checked=verifyUiOwnerInputs(options),{backend,tag,runId,sourceCap,input}=options;
    const processOwner=ownedLinuxIdentity(runId);
    const retain=privateRecorder(backend,runId),references=[],contexts=new Map(),committed=[];
    const report={...checked.plan,kind:'R2M-Linux-managed-original-UI-actual',sourceCapId:sourceCap.id,sourceCapsuleSha256:sourceCap.manifestSha256,result:'partial-preserved',startedAt:new Date().toISOString(),processOwner,evidence:references,resources:[],cleanup:[],privateContentsExported:false};
    const remember=async value=>{const receipt=await retain(value);references.push({kind:value.kind,...receipt});return receipt};
    let f,native,rust,pg,server,browser,context,page,sourcePreparer,current=null,index=0,pgActive=false,exchangeTail=Promise.resolve(),halted=false;
    const requests=new Map(),exchangeAbort=new AbortController();
    const attempted={browser:false,server:false,native:false,rust:false},stopped={browser:false,server:false,native:false,rust:false};
    const controller=new AbortController();const cancel=()=>{controller.abort();if(context)void context.close().catch(()=>{})};
    process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
    let baseBefore,globalBefore;
    const [{Fixture},{startOriginalNative},{startActualRust},{installPgCreateObserver},{fixtureCredentials},{marker,databaseFor},{digest},{prepareUiTodoSource},{AcceptanceHttpSession}]=await Promise.all([
        import('./fixture.mjs'),import('./native-app.mjs'),import('./rust-app.mjs'),import('./pg-create-observer.mjs'),import('./fixture-credentials.mjs'),import('./fixture-guard.mjs'),import('./fixture-core.mjs'),import('./acceptance-prepared.mjs'),import('./acceptance-runtime.mjs')
    ]);
    async function certifyExchange(exchange,active){
        assert(current&&pgActive);await native.witness.drain();native.witness.assertComplete();
        const pgRows=await pg.drainCase();pgActive=false;const sdk=committed.slice(active.from);
        const nativeRows=[];
        if(exchange.executionBackend==='rust')assert.equal(sdk.length,0,'A Rust HTTP request cannot receive a Native SDK producer claim');
        if(sdk.length){const source='tools/rust-r2m/native-write-witness.mjs',authority=f.registerNativeAuthority(f.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:databaseFor(backend),marker,source:{file:source,sha256:sha(fs.readFileSync(path.join(ROOT,source)))},trace:native.witness.snapshot()}));
            for(const row of sdk){const match=pgRows.filter(item=>item.table===row.table&&item.id===row.id);assert.equal(match.length,1,'Actual SDK create requires its distinct real PG INSERT/COMMIT shadow');nativeRows.push(f.creationEnvelope({...row,authorityId:authority,intentId:match[0].intentId}))}
            f.recordCommittedCreates(nativeRows);
        }
        const remaining=pgRows.filter(row=>!sdk.some(item=>item.table===row.table&&item.id===row.id));
        if(exchange.executionBackend==='nest')assert.equal(remaining.length,0,'Native-only UI create cannot be relabelled as Rust');
        else if(remaining.length)f.recordCommittedCreates(remaining.map(row=>f.creationEnvelope(row)));
        await f.resolveNoCreates(active.scope.caseId);await f.adoptIntents();
        if(active.scope.caseId===settingLeaseScope&&['GET','PATCH'].includes(exchange.method)&&exchange.path.split('?',1)[0]==='/api/platform/system-settings/'+settingKey)await f.recordBaselineSettingAfter({namespace:'poms-r2m',marker,runId,backend,caseId:settingLeaseScope,requestId:active.scope.requestId,method:exchange.method,path:'/api/platform/system-settings/'+settingKey,status:exchange.status,completed:exchange.transportComplete,requestSha256:exchange.request.bodySha256,responseSha256:exchange.response.bodySha256,logicalCase:current.descriptor.journey,stepId:current.descriptor.id});
        const facts=await f.facts();assert.equal(facts.unknownCreates,0);assert.equal(facts.unknownMutations,0);
        for(const table of['attachment','attachment_download_package'])for(const row of facts.tables.find(item=>item.table===table).ownedRows)if(row.storage_provider==='local'&&row.storage_key)await f.certifyLocalObject(table,row.id,row.storage_key);
        const evidence=await remember({kind:'actual-UI-one-HTTP-producer-certification',record:{sourceCapId:sourceCap.id,descriptor:current.descriptor,context:active.context,exchange,before:active.before,after:facts,sdk,pg:pgRows,ledger:f.j}});
        current.certificates.push({index:exchange.index,evidence,sdk:sdk.length,pg:pgRows.length});
    }
    async function certifyStep(){
        assert(current);await server.idle();assert(!pgActive&&!halted);const facts=await f.facts();assert.equal(facts.unknownCreates,0);assert.equal(facts.unknownMutations,0);
        const evidence=await remember({kind:'actual-UI-step-complete-facts-and-certificates',record:{sourceCapId:sourceCap.id,descriptor:current.descriptor,window:{startedAt:current.startedAt,finishedAt:new Date().toISOString()},before:current.before,after:facts,certificates:current.certificates,ledger:f.j,network:current.exchanges}});
        current=null;return{actualEvidenceRetained:true,allActualWritesCertified:true,evidenceSha256:evidence.rawBytesSha256,unknownCreates:0,unknownMutations:0};
    }
    try{
        const browserPin=verifyBrowserPin(options.browser);
        f=await Fixture.open(backend,runId);assert(f.j.state==='planned'&&f.j.base===null,'Do not reopen a prior UI run');
        globalBefore=await f.facts();await remember({kind:'UI-global-full107-before-preparation',record:globalBefore});await f.prepare();await f.borrowSeedPrincipals();await f.borrowCanonicalDefinitions();await f.planObjectPrefix();
        if(options.settingAdmission){f.defineCase(settingLeaseScope,{actors:Object.values(f.actors),anonymous:true});await f.admitBaselineSetting(options.settingAdmission,{caseId:settingLeaseScope})}
        pg=await installPgCreateObserver(f);await f.registerPgObserver(f.creationEnvelope(pg.receipt()));
        if(backend==='rust'){attempted.rust=true;const binary=sourceCap.artifacts.find(item=>item.kind==='rust-release');assert(binary);rust=await startActualRust({tag:'ui-'+tag,expectedBinarySha256:binary.rawBytesSha256})}
        attempted.native=true;native=await startOriginalNative({tag:'ui-'+tag,backend,admittedContexts:contexts,onCommitted:rows=>committed.push(...rows)});
        const prepared={};if(checked.plan.selection.includes('UI1'))prepared.todo=await prepareUiTodoSource({fixture:f,native,sourceReader:checked.reader,sourceCapId:sourceCap.id,retain:remember});
        sourcePreparer=createUiSourcePreparer({fixture:f,native,pg,contexts,committed,sourceReader:checked.reader,sourceCapId:sourceCap.id,retain:remember,nextIndex:()=>index++,makeHttpSession:args=>new AcceptanceHttpSession(args),marker,databaseFor,auditIdentityApproval:options.auditIdentityApproval});Object.assign(prepared,await sourcePreparer.prepare(checked.plan.selection));
        baseBefore=await f.facts();await remember({kind:'UI-source-ready-full107-before-browser',record:{prepared,fullFacts:baseBefore}});
        attempted.server=true;server=await startManagedUiServer({backend,input,sourceCapId:sourceCap.id,buildDirectory:checked.buildDirectory,buildFiles:checked.buildFiles,nativeReadModels:uiNativeReadModels({sourceReader:checked.reader,input,selection:checked.plan.selection}),retain:remember,
            async onBeforeExchange(exchange){
                assert(current,'No UI request outside its source-bound actual step');const previous=exchangeTail;let release;exchangeTail=new Promise(resolve=>{release=resolve});
                let abortHandler;const abort=new Promise((_,reject)=>{abortHandler=()=>reject(new Error('Owned UI exchange cancelled'));if(exchangeAbort.signal.aborted)abortHandler();else exchangeAbort.signal.addEventListener('abort',abortHandler,{once:true})});
                try{
                    try{await Promise.race([previous,abort])}finally{exchangeAbort.signal.removeEventListener('abort',abortHandler)}assert(!halted&&!pgActive&&current,'No later request after an unresolved UI writer');
                    const pathname=exchange.path.split('?',1)[0],caseId=f.j.baselineSettingLease&&['GET','PATCH'].includes(exchange.method)&&pathname==='/api/platform/system-settings/'+settingKey?settingLeaseScope:current.scope.caseId,scope=f.scope(caseId);
                    const before=await f.facts(),intents=[{table:'audit_log',selector:{request_id:scope.requestId},expectedMax:256},{table:'security_event',selector:{request_id:scope.requestId},expectedMax:256},...uiExchangeIntents({descriptor:current.descriptor,prepared,actors:f.actors,request:exchange.request,accounts:f.base.accounts,isOwned:(table,id)=>f.j.objects.some(row=>row.table===table&&row.id===id&&row.creationProof&&row.postcondition?.independentlyVisible)})];
                    const uiPackage=current.descriptor.journey==='UI4'&&current.descriptor.id==='package-create'&&exchange.method==='POST'&&exchange.path==='/api/project-handovers/'+prepared.handover.handover.id+'/attachment-download-packages';
                    for(const item of intents)if(!(uiPackage&&item.table==='attachment_download_package_item'))await f.intent(item.table,item.selector,{caseId,expectedMax:item.expectedMax});
                    const context={runId,caseId,index:index++,op:exchange.executionBackend==='nest'&&backend==='rust'?'m.producer':'m.http'};
                    if(uiPackage){const parents=f.j.intents.filter(item=>item.table==='attachment_download_package'&&item.caseId===caseId&&item.state==='planned');assert.equal(parents.length,1);const declared=intents.filter(item=>item.table==='attachment_download_package_item');assert.equal(declared.length,1);assert.equal(declared[0].expectedMax,64);const body=JSON.parse(Buffer.from(exchange.request.bodyBase64,'base64').toString('utf8'));await f.intentForUiGeneratedPackageItems({caseId,index:context.index,op:context.op,sourceCapId:sourceCap.id,request:{logicalCase:'UI4',stepId:'package-create',method:exchange.method,path:exchange.path,body},parentIntentId:parents[0].id,expectedMax:64},options.uiPackageItemAdmission)}
                    const correlationId='m-ui-'+randomUUID();contexts.set(correlationId,context);
                    const active={context,scope,before,from:committed.length,release};requests.set(exchange.index,active);current.exchanges.push({index:exchange.index,method:exchange.method,path:exchange.path,executionBackend:exchange.executionBackend,context});await pg.beginCase(context);pgActive=true;return{...context,requestId:scope.requestId,correlationId,userAgent:scope.userAgent};
                }catch(error){halted=true;release();throw error}
            },
            async onAfterExchange(exchange){const active=requests.get(exchange.index);assert(active);try{assert(current&&exchange.fixtureContext?.caseId===active.scope.caseId&&exchange.transportComplete===true);await certifyExchange(exchange,active)}catch(error){halted=true;throw error}finally{active.release();requests.delete(exchange.index)}}
        });
        const require=createRequire(import.meta.url),playwright=require('@playwright/test');
        const version=require('@playwright/test/package.json').version;attempted.browser=true;
        browser=await playwright.chromium.launch({executablePath:options.browser.executable,headless:true,env:browserChildEnvironment(process.env,options.browser),args:browserLaunchArguments()});
        context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context.newPage();
        report.browser={engine:'chromium',playwrightVersion:version,platform:process.platform,pin:browserPin,launchArguments:browserLaunchArguments(),environmentKeys:Object.keys(browserChildEnvironment(process.env,options.browser)).sort(),NativeDatabaseOrJwtEnvironmentInherited:false,ownedCommandGroup:processOwner.anchor.pid};
        report.browser.cacheInput=await installUncachedUiInput({context,page,sourceCapId:sourceCap.id,retain:remember});
        const inputs={origin:server.origin,sourceCapId:sourceCap.id,credentials:{admin:fixtureCredentials(runId,'admin'),viewer:fixtureCredentials(runId,'viewer'),...(prepared.contract?{approver:prepared.contract.approver}:{})},...(prepared.todo?{authRole:prepared.todo.authRole,minimumTodoCount:prepared.todo.minimumTodoCount}:{}),...(options.settingAdmission?{settingValue:51}:{}),...(prepared.contract?{contract:{id:prepared.contract.contract.id,contractNo:prepared.contract.contract.contract_no}}:{}),...(prepared.handover?{project:prepared.handover.project,handover:prepared.handover.handover,upload:prepared.handover.upload}:{})};
        report.observation=await runUiJourneys({page,context,expect:playwright.expect,inputs,selection:checked.plan.selection,signal:controller.signal,
            async onBeforeStep(descriptor){
                assert(!current&&!pgActive&&!halted);const spec=uiStepScope({descriptor,prepared,actors:f.actors}),scope=f.j.cases.find(row=>row.caseId===spec.caseId)??f.defineCase(spec.caseId,{actors:Object.values(f.actors),projects:spec.projects,borrowedActors:spec.borrowedActors,anonymous:true});
                const before=await f.facts();
                if(descriptor.details.fixtureOperation){assert.deepEqual(descriptor.details.fixtureOperation,{operation:'expire-owned-ui-session',role:'viewer',idleOffsetMs:-1000});const cookies=await context.cookies(),token=cookies.find(item=>item.name==='poms_session')?.value;assert(token);const match=f.j.objects.filter(item=>item.table==='auth_session'&&item.identity.token_hash===sha(Buffer.from(token)));assert.equal(match.length,1);assert.equal(match[0].identity.user_id,f.actors.viewer);await f.updateOwned('auth_session',match[0].id,{idle_expires_at:new Date(Date.now()-1000).toISOString()},'R2M UI1 exact current owned viewer browser session expiry')}
                current={descriptor,scope,before,startedAt:new Date().toISOString(),exchanges:[],certificates:[]};
            },
            async onAfterStep(){return certifyStep()},
            async retainScreenshot({label,bytes}){const evidence=await remember({kind:'actual-original-UI-screenshot',record:{label,mimeType:'image/png',bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}});return{label,bytes:bytes.length,rawBytesSha256:sha(bytes),privateEvidence:evidence}},
            async retainFailure(record){return remember({kind:'actual-original-UI-failure-private',record:{...record,runtimeState:{caseId:current?.scope?.caseId??null,pgActive,halted,index,caseIds:f.j.cases.map(row=>row.caseId)}}})},
            async retainDownload({download,label}){assert(current?.descriptor.journey==='UI4'&&current.descriptor.id==='package-download');const stream=await download.createReadStream();assert(stream);const chunks=[];let length=0;for await(const chunk of stream){length+=chunk.length;assert(length<=32*1024*1024);chunks.push(chunk)}const bytes=Buffer.concat(chunks),evidence=await remember({kind:'actual-original-UI-package-download',record:{label,bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}});return{bytes,privateEvidence:evidence}}
        });
        checked.reader.assertUnchanged();if(report.observation.result==='observed'){assert(!current&&!pgActive);report.result='observed-comparison-pending'}else report.failure={category:'original-UI-failure-preserved',phase:report.observation.failure?.phase??null,privateEvidence:report.observation.failure?.privateEvidence??null,privatePageEvidence:report.observation.failure?.privatePageEvidence??null};
    }catch(error){report.failure={category:'actual-UI-or-required-proof-failed',rawErrorIncluded:false};await remember({kind:'private-UI-failure',record:{name:error.name,message:error.message,stack:error.stack}}).catch(()=>{});}
    finally{
        const close=async(name,callback)=>{try{await callback();report.resources.push({name,result:'stopped-or-restored'});return true}catch(error){await remember({kind:'private-UI-owner-close-failure',stage:name,record:{name:error.name,message:error.message,stack:error.stack}}).catch(()=>{});report.resources.push({name,result:'incomplete-preserved'});report.result='partial-preserved';return false}};
        exchangeAbort.abort();if(sourcePreparer?.state().pgCaseActive)pgActive=true;
        if(browser)stopped.browser=await close('browser-context-and-process',async()=>{if(context)await context.close();await browser.close();assert(!browser.isConnected())});
        if(server)stopped.server=await close('UI-server-owned-sockets-and-evidence',()=>server.close());
        if(native)await close('Native-final-witness',async()=>{await native.witness.drain();native.witness.assertComplete();await remember({kind:'actual-Native-final-SDK-and-SQL',record:{report:native.report(),sql:native.sql}})});
        if(rust)stopped.rust=await close('Rust-managed-owner',()=>rust.close());
        if(native)stopped.native=await close('Native-managed-owner',()=>native.close());
        const writersStopped=Object.keys(attempted).every(name=>!attempted[name]||stopped[name]);let restored=!pg;
        if(pg&&writersStopped&&!pgActive)restored=await close('PG-observer-exact-restore',async()=>{await remember({kind:'actual-PG-observer-restore',record:{before:pg.receipt(),restore:await pg.restore()}})});
        if(f&&writersStopped&&restored&&!pgActive&&report.result==='observed-comparison-pending')await close('fixture-final-drain-and-double-zero',async()=>{
            f.drain({namespace:'poms-r2m',marker,runId,backend,activeRequests:0,pendingTransactions:0,observersRestored:true,sourceCapsuleSha256:sourceCap.manifestSha256,writers:Object.keys(attempted).filter(name=>attempted[name]).map(name=>({kind:name,identity:'ui-'+backend+'-'+tag,stopped:stopped[name]}))});
            if(f.j.baselineSettingLease)await f.restoreBaselineSetting();report.cleanup.push(await f.cleanup());report.cleanup.push(await f.cleanup());assert.equal(report.cleanup[1].deleted,0);assert.equal(report.cleanup[1].objects.changed,0);report.doubleZero=true;
            const after=await f.facts();assert.equal(digest(after.tables.map(row=>({table:row.table,rows:row.rows}))),digest(globalBefore.tables.map(row=>({table:row.table,rows:row.rows}))),'Full107 baseline must be exactly restored');await remember({kind:'UI-full107-after-double-zero',record:after});
        });
        if(f)await close('fixture-client-close',()=>f.close());report.cleanupPending=report.doubleZero!==true;
        try{checked.reader.assertUnchanged()}catch{report.result='source-changed-preserved'}report.finishedAt=new Date().toISOString();report.writerLifecycle={attempted,stopped,writersStopped,observerRestored:restored,activePgCasePreserved:pgActive};
        process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
    }
    return report;
}

async function cli(){
    const args=process.argv.slice(2),value={};for(let at=0;at<args.length;at++){const key=args[at];assert(['--run','--worker','--check','--backend','--tag','--cap','--input','--browser-pin','--run-id','--selection','--setting-admission','--audit-identity-admission','--ui-package-item-admission'].includes(key));if(['--run','--worker','--check'].includes(key))value[key]=true;else{assert(args[at+1]);value[key]=args[++at]}}
    assert([value['--run'],value['--worker'],value['--check']].filter(Boolean).length===1);const sourceCap=readUiPublicInput(value['--cap']),input=readUiPublicInput(value['--input']??'docs/design/rust-r2m/acceptance-input.json'),browser=readUiPublicInput(value['--browser-pin']);
    const settingAdmission=value['--setting-admission']?readUiPublicInput(value['--setting-admission']):null,auditIdentityApproval=value['--audit-identity-admission']?readUiPublicInput(value['--audit-identity-admission']):null,uiPackageItemAdmission=value['--ui-package-item-admission']?readUiPublicInput(value['--ui-package-item-admission']):null;
    const options={sourceCap,input,browser,backend:value['--backend'],tag:value['--tag'],runId:value['--run-id']??settingAdmission?.runId??auditIdentityApproval?.runId??randomUUID(),selection:(value['--selection']??'').split(',').filter(Boolean),settingAdmission,auditIdentityApproval,uiPackageItemAdmission};
    const checked=verifyUiOwnerInputs(options);
    if(value['--check']){console.log(JSON.stringify({result:'SourceReady-input-check',...checked.plan,sourceCapId:sourceCap.id,sourceFiles:checked.reader.receipt().files.length,buildFiles:checked.buildFiles.length,privateRead:false,actualExecution:false}));return}
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),LINUX_ROOT);const output='tmp/rust-r2m/ui-linux-'+options.backend+'-'+options.tag+'.json';assert(!fs.existsSync(output));
    if(value['--worker']){const report=await runManagedUi({...options,ownedWorker:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,result:report.result,doubleZero:report.doubleZero??false,G3Certified:false}));if(report.result!=='observed-comparison-pending'||!report.doubleZero)process.exitCode=1;return}
    const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs'),log=PRIVATE+'/ui-owner-'+options.backend+'-'+options.tag+'.log';
    let directory='';for(const part of PRIVATE.split('/').filter(Boolean)){directory+='/'+part;const stat=fs.lstatSync(directory);assert(stat.isDirectory()&&!stat.isSymbolicLink())}assert.equal(fs.lstatSync(PRIVATE).mode&0o077,0);const fd=fs.openSync(log,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);fs.closeSync(fd);
    const forwarded=args.filter(key=>key!=='--run');forwarded.push('--worker');if(!value['--run-id'])forwarded.push('--run-id',options.runId);
    const receipt=await runtime.runOwnedCommand({executable:process.execPath,args:[fileURLToPath(import.meta.url),...forwarded],cwd:ROOT,env:{...process.env,DEBUG:'pw:browser'},runId:'r2m-ui-'+options.runId,logPath:log,timeoutMs:300000});
    console.log(JSON.stringify({kind:'R2M-owned-Linux-UI-command-completed',file:output,runId:options.runId,code:receipt.code,logPrivate:true,G3Certified:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(()=>{process.exitCode=1;console.error('{"kind":"R2M-UI-entry-failure","rawErrorIncluded":false,"partialEvidencePreserved":true}')});
