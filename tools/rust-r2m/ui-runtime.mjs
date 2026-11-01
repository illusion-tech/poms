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

const ROOT=path.resolve(import.meta.dirname,'../..'),LINUX_ROOT='/home/wangzishi/projects/poms-rust-r2m';
const PRIVATE='/home/wangzishi/.local/share/poms-r2m/private';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REQUIRED=['tools/rust-r2m/ui-runtime.mjs','tools/rust-r2m/ui-runtime-server.mjs','tools/rust-r2m/ui-runtime-browser.mjs','tools/rust-r2m/ui-runtime-cache.mjs','tools/rust-r2m/acceptance-ui-browser.mjs','tools/rust-r2m/acceptance-prepared.mjs','tools/rust-r2m/native-app.mjs','tools/rust-r2m/rust-app.mjs','tools/rust-r2m/fixture.mjs','tools/rust-r2m/pg-create-observer.mjs','tools/e2e/runtime.cjs','tools/e2e/runtime-worker.cjs'];

export function uiRuntimePlan({backend,tag,selection=['UI1'],runId}){
    assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,24}$/.test(tag??''));
    assert(UUID.test(runId));assert.deepEqual(selection,['UI1'],'This first reviewed Linux owner entry supports exactly UI1; other journeys remain explicit pending work');
    return{kind:'R2M-Linux-managed-original-UI-owner-plan',backend,tag,runId,selection,platform:'linux',origin:'http://127.0.0.1:10080',apiPorts:[10070,...(backend==='rust'?[10071]:[])],notRun:['UI2','UI3','UI4'],G3Certified:false,G4Certified:false};
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

export function verifyUiOwnerInputs({sourceCap,input,browser,backend,tag,runId,selection=['UI1']}){
    const plan=uiRuntimePlan({backend,tag,runId,selection});verifySourceCap(sourceCap,{candidate:sourceCap.candidate,files:REQUIRED});
    const reader=new SourceReader({root:ROOT,pins:sourceCap.files,sourceEpoch:sourceCap.id});for(const pin of sourceCap.files)reader.read(pin.file);
    assert(input?.sourceProtection?.currentSurface?.length===115);
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
    let f,native,rust,pg,server,browser,context,page,current=null,index=0,pgActive=false;
    const attempted={browser:false,server:false,native:false,rust:false},stopped={browser:false,server:false,native:false,rust:false};
    const controller=new AbortController();const cancel=()=>{controller.abort();if(context)void context.close().catch(()=>{})};
    process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
    let baseBefore,globalBefore;
    const [{Fixture},{startOriginalNative},{startActualRust},{installPgCreateObserver},{fixtureCredentials},{marker,databaseFor},{digest},{prepareUiTodoSource}]=await Promise.all([
        import('./fixture.mjs'),import('./native-app.mjs'),import('./rust-app.mjs'),import('./pg-create-observer.mjs'),import('./fixture-credentials.mjs'),import('./fixture-guard.mjs'),import('./fixture-core.mjs'),import('./acceptance-prepared.mjs')
    ]);
    async function certifyStep(){
        assert(current&&pgActive);await server.idle();await native.witness.drain();native.witness.assertComplete();
        const pgRows=await pg.drainCase();pgActive=false;const sdk=committed.slice(current.from);
        const nativeRows=[];
        if(sdk.length){const source='tools/rust-r2m/native-write-witness.mjs',authority=f.registerNativeAuthority(f.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:databaseFor(backend),marker,source:{file:source,sha256:sha(fs.readFileSync(path.join(ROOT,source)))},trace:native.witness.snapshot()}));
            for(const row of sdk){const match=pgRows.filter(item=>item.table===row.table&&item.id===row.id);assert.equal(match.length,1,'Actual SDK create requires its distinct real PG INSERT/COMMIT shadow');nativeRows.push(f.creationEnvelope({...row,authorityId:authority,intentId:match[0].intentId}))}
            f.recordCommittedCreates(nativeRows);
        }
        const remaining=pgRows.filter(row=>!sdk.some(item=>item.table===row.table&&item.id===row.id));
        if(backend==='nest')assert.equal(remaining.length,0,'Native-only UI create cannot be relabelled as Rust');
        else if(remaining.length){assert(current.exchanges.every(row=>row.executionBackend==='rust'),'Mixed UI step requires finer producer attribution before PG-only adoption');f.recordCommittedCreates(remaining.map(row=>f.creationEnvelope(row)))}
        await f.resolveNoCreates(current.scope.caseId);await f.adoptIntents();
        const facts=await f.facts();assert.equal(facts.unknownCreates,0);assert.equal(facts.unknownMutations,0);
        const evidence=await remember({kind:'actual-UI-step-complete-facts-and-certificates',record:{sourceCapId:sourceCap.id,descriptor:current.descriptor,context:current.context,window:{startedAt:current.startedAt,finishedAt:new Date().toISOString()},before:current.before,after:facts,sdk,pg:pgRows,ledger:f.j,network:current.exchanges}});
        const receipt={actualEvidenceRetained:true,allActualWritesCertified:true,evidenceSha256:evidence.rawBytesSha256,created:{sdk:sdk.length,pg:pgRows.length},unknownCreates:0,unknownMutations:0};current=null;return receipt;
    }
    try{
        const browserPin=verifyBrowserPin(options.browser);
        f=await Fixture.open(backend,runId);assert(f.j.state==='planned'&&f.j.base===null,'Do not reopen a prior UI run');
        globalBefore=await f.facts();await remember({kind:'UI-global-full107-before-preparation',record:globalBefore});await f.prepare();await f.borrowSeedPrincipals();await f.borrowCanonicalDefinitions();await f.planObjectPrefix();
        pg=await installPgCreateObserver(f);await f.registerPgObserver(f.creationEnvelope(pg.receipt()));
        if(backend==='rust'){attempted.rust=true;const binary=sourceCap.artifacts.find(item=>item.kind==='rust-release');assert(binary);rust=await startActualRust({tag:'ui-'+tag,expectedBinarySha256:binary.rawBytesSha256})}
        attempted.native=true;native=await startOriginalNative({tag:'ui-'+tag,backend,admittedContexts:contexts,onCommitted:rows=>committed.push(...rows)});
        const todo=await prepareUiTodoSource({fixture:f,native,sourceReader:checked.reader,sourceCapId:sourceCap.id,retain:remember});
        baseBefore=await f.facts();await remember({kind:'UI-source-ready-full107-before-browser',record:{todo,fullFacts:baseBefore}});
        attempted.server=true;server=await startManagedUiServer({backend,input,sourceCapId:sourceCap.id,buildDirectory:checked.buildDirectory,buildFiles:checked.buildFiles,retain:remember,
            async onBeforeExchange(exchange){assert(current,'No UI request outside its source-bound actual step');const correlationId='m-ui-'+randomUUID(),context={...current.context};contexts.set(correlationId,context);current.exchanges.push({index:exchange.index,method:exchange.method,path:exchange.path,executionBackend:exchange.executionBackend});return{...context,requestId:current.scope.requestId,correlationId,userAgent:current.scope.userAgent}},
            async onAfterExchange(exchange){assert(current&&exchange.fixtureContext?.caseId===current.scope.caseId);assert(exchange.transportComplete===true);}
        });
        const require=createRequire(import.meta.url),playwright=require('@playwright/test');
        const version=require('@playwright/test/package.json').version;attempted.browser=true;
        browser=await playwright.chromium.launch({executablePath:options.browser.executable,headless:true,env:browserChildEnvironment(process.env,options.browser),args:browserLaunchArguments()});
        context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context.newPage();
        report.browser={engine:'chromium',playwrightVersion:version,platform:process.platform,pin:browserPin,launchArguments:browserLaunchArguments(),environmentKeys:Object.keys(browserChildEnvironment(process.env,options.browser)).sort(),NativeDatabaseOrJwtEnvironmentInherited:false,ownedCommandGroup:processOwner.anchor.pid};
        report.browser.cacheInput=await installUncachedUiInput({context,page,sourceCapId:sourceCap.id,retain:remember});
        const inputs={origin:server.origin,sourceCapId:sourceCap.id,credentials:{admin:fixtureCredentials(runId,'admin'),viewer:fixtureCredentials(runId,'viewer')},authRole:todo.authRole,minimumTodoCount:todo.minimumTodoCount};
        report.observation=await runUiJourneys({page,context,expect:playwright.expect,inputs,selection:checked.plan.selection,signal:controller.signal,
            async onBeforeStep(descriptor){
                assert(!current&&!pgActive);const caseId='m.ui1.integration',scope=f.defineCase(caseId,{actors:Object.values(f.actors),projects:[todo.project.id],anonymous:true});
                const before=await f.facts();await f.intent('audit_log',{request_id:scope.requestId},{caseId,expectedMax:256});await f.intent('security_event',{request_id:scope.requestId},{caseId,expectedMax:256});
                if(['login-restore','relogin-and-topbar-logout'].includes(descriptor.id))await f.intent('auth_session',{user_id:f.actors.viewer},{caseId,expectedMax:2});
                if(descriptor.details.fixtureOperation){assert.deepEqual(descriptor.details.fixtureOperation,{operation:'expire-owned-ui-session',role:'viewer',idleOffsetMs:-1000});const cookies=await context.cookies(),token=cookies.find(item=>item.name==='poms_session')?.value;assert(token);const match=f.j.objects.filter(item=>item.table==='auth_session'&&item.identity.token_hash===sha(Buffer.from(token)));assert.equal(match.length,1);assert.equal(match[0].identity.user_id,f.actors.viewer);await f.updateOwned('auth_session',match[0].id,{idle_expires_at:new Date(Date.now()-1000).toISOString()},'R2M UI1 exact current owned viewer browser session expiry')}
                const contextValue={runId,caseId,index:index++,op:backend==='rust'?'m.producer':'m.http'};
                current={descriptor,scope,before,context:contextValue,from:committed.length,startedAt:new Date().toISOString(),exchanges:[]};await pg.beginCase(contextValue);pgActive=true;
            },
            async onAfterStep(){return certifyStep()},
            async retainScreenshot({label,bytes}){const evidence=await remember({kind:'actual-original-UI-screenshot',record:{label,mimeType:'image/png',bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}});return{label,bytes:bytes.length,rawBytesSha256:sha(bytes),privateEvidence:evidence}},
            async retainFailure(record){return remember({kind:'actual-original-UI-failure-private',record:{...record,runtimeState:{caseId:current?.scope?.caseId??null,pgActive,index,caseIds:f.j.cases.map(row=>row.caseId)}}})},
            async retainDownload(){assert.fail('UI1 has no download; an unexpected download is not silently accepted')}
        });
        checked.reader.assertUnchanged();if(report.observation.result==='observed'){assert(!current&&!pgActive);report.result='observed-comparison-pending'}else report.failure={category:'original-UI-failure-preserved',phase:report.observation.failure?.phase??null,privateEvidence:report.observation.failure?.privateEvidence??null,privatePageEvidence:report.observation.failure?.privatePageEvidence??null};
    }catch(error){report.failure={category:'actual-UI-or-required-proof-failed',rawErrorIncluded:false};await remember({kind:'private-UI-failure',record:{name:error.name,message:error.message,stack:error.stack}}).catch(()=>{});}
    finally{
        const close=async(name,callback)=>{try{await callback();report.resources.push({name,result:'stopped-or-restored'});return true}catch(error){await remember({kind:'private-UI-owner-close-failure',stage:name,record:{name:error.name,message:error.message,stack:error.stack}}).catch(()=>{});report.resources.push({name,result:'incomplete-preserved'});report.result='partial-preserved';return false}};
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
    const args=process.argv.slice(2),value={};for(let at=0;at<args.length;at++){const key=args[at];assert(['--run','--worker','--check','--backend','--tag','--cap','--input','--browser-pin','--run-id'].includes(key));if(['--run','--worker','--check'].includes(key))value[key]=true;else{assert(args[at+1]);value[key]=args[++at]}}
    assert([value['--run'],value['--worker'],value['--check']].filter(Boolean).length===1);const sourceCap=readUiPublicInput(value['--cap']),input=readUiPublicInput(value['--input']??'docs/design/rust-r2m/acceptance-input.json'),browser=readUiPublicInput(value['--browser-pin']);
    const options={sourceCap,input,browser,backend:value['--backend'],tag:value['--tag'],runId:value['--run-id']??randomUUID(),selection:['UI1']};
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
