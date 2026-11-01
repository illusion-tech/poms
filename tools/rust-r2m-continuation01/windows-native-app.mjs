// Linux Root owns this fixed, attested Windows Node anchor. Actual HTTP/Nest/
// MikroORM run on win32; the WSL child PID never stands for a Windows identity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn,execFile} from 'node:child_process';
import readline from 'node:readline';
import {createHash,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {SourceReader,verifySourceCap} from './acceptance-source.mjs';
import {deriveWindowsNativeEnvironment} from './windows-native-environment.mjs';
import {NATIVE_BRIDGE_PREFIX} from './windows-native-driver.mjs';
import {validateNativeContext,nativeRequestId} from './windows-native-server.mjs';

const ROOT='/home/wangzishi/projects/poms-rust-r2m',MOUNT='/mnt/e/projects/worktrees/poms-r2ef-foundation-audit/poms';
const WINDOWS_ROOT='E:\\projects\\worktrees\\poms-r2ef-foundation-audit\\poms',NODE='/mnt/c/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe';
const EXE='C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe',NODE_SHA='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
const DRIVER=WINDOWS_ROOT+'\\tools\\rust-r2m-continuation01\\windows-native-driver.mjs',PROCESS=WINDOWS_ROOT+'\\tools\\rust-r2m-continuation01\\windows-native-process.ps1';
const PWSH='/mnt/c/Users/ynh2/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe';
const BUNDLE_SHA='0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4';
const sha=value=>createHash('sha256').update(value).digest('hex'),execAsync=promisify(execFile),samePath=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.replaceAll('/','\\').toLowerCase()===b.replaceAll('/','\\').toLowerCase();
const required=['tools/rust-r2m-continuation01/windows-native-app.mjs','tools/rust-r2m-continuation01/windows-native-driver.mjs','tools/rust-r2m-continuation01/windows-native-server.mjs','tools/rust-r2m-continuation01/windows-native-process.ps1','tools/rust-r2m-continuation01/windows-native-environment.mjs','tools/rust-r2m-continuation01/windows-managed-environment.cjs'];
const bounded=async(promise,ms,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms)})])}finally{clearTimeout(timer)}};

export function validateWindowsNativeProfile(value,bridgeId,driverSha){
    assert(value&&value.bridgeId===bridgeId&&Number.isSafeInteger(value.windowsPid)&&value.windowsPid>0&&value.windowsPid<=2147483647);
    assert(value.node==='v24.19.0'&&samePath(value.executable,EXE)&&value.executableRawBytesSha256===NODE_SHA&&samePath(value.driverPath,DRIVER)&&value.driverRawBytesSha256===driverSha);
    assert(Array.isArray(value.driverArgv)&&value.driverArgv.length===4&&samePath(value.driverArgv[0],EXE)&&samePath(value.driverArgv[1],DRIVER)&&value.driverArgv[2]==='--bridge-id'&&value.driverArgv[3]===bridgeId);
    assert(value.privateEnvironmentRead===false&&value.applicationStarted===false,'Identity must precede all private/configuration/application work');
}

export async function startWindowsOriginalNative({tag,runId,sourceCap,admittedContexts=new Map(),onCommitted,retain,append=()=>{},signal,totalTimeoutMs=900000}){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),ROOT);assert(/^[a-z0-9-]{1,30}$/.test(tag));assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId));assert(admittedContexts instanceof Map&&typeof onCommitted==='function'&&typeof retain==='function');assert(Number.isInteger(totalTimeoutMs)&&totalTimeoutMs>=1000&&totalTimeoutMs<=1800000);
    assert(!Object.keys(process.env).some(key=>/^(?:PG|DB_|MIKRO_)/i.test(key)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS)$/i.test(key)),'Native owner refuses ambient database/process overrides');
    verifySourceCap(sourceCap,{candidate:sourceCap.candidate,files:required});assert(sourceCap.artifacts.some(item=>item.kind==='native-main'&&item.rawBytesSha256===BUNDLE_SHA),'This exact original Native bundle must belong to the current capsule');const reader=new SourceReader({root:ROOT,pins:sourceCap.files,sourceEpoch:sourceCap.id});for(const pin of sourceCap.files)reader.read(pin.file);
    const sourcePins=sourceCap.files.filter(pin=>pin.file.startsWith('tools/rust-r2m-continuation01/')||pin.file==='tools/rust-r1b/shared-manifest.json'||pin.file==='docs/design/rust-r2m/acceptance-input.json');
    for(const pin of sourcePins){const raw=fs.readFileSync(MOUNT+'/'+pin.file);assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.rawBytesSha256,'Windows source differs from this exact capsule')}
    assert.equal(sha(fs.readFileSync(NODE)),NODE_SHA);assert.equal(sha(fs.readFileSync(MOUNT+'/tmp/rust-r2m-continuation01/windows-native-bundle/'+BUNDLE_SHA+'/main.cjs')),BUNDLE_SHA);
    const environmentProof=deriveWindowsNativeEnvironment();await retain({kind:'actual-Windows-Native-environment-derivation',record:environmentProof});
    const bridgeId=randomUUID(),driverSha=sha(fs.readFileSync(MOUNT+'/tools/rust-r2m-continuation01/windows-native-driver.mjs')),pending=new Map(),history=new Map(),sql=[];
    let profile,identity,metadata,snapshot,cachedReport,driverStatus,failure,closing=false,closed=false,sequence=0,deliveryFailed=false,queue=Promise.resolve(),stdioEvidence=Promise.resolve(),readyResolve,readyReject,exitResolve;
    const lifecycle={kind:'R2M-actual-Windows-Native-owner',bridgeId,sourceCapId:sourceCap.id,runId,tag,platform:'win32',profileAcknowledged:false,forcedStop:false,inspections:[]};
    const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});ready.catch(()=>{});const exited=new Promise(resolve=>{exitResolve=resolve});
    const child=spawn(NODE,[DRIVER,'--bridge-id',bridgeId],{cwd:ROOT,env:Object.fromEntries(['PATH','HOME','WSLENV','WSL_INTEROP','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]])),stdio:['pipe','pipe','pipe'],windowsHide:true});lifecycle.interopWrapperPid=child.pid;lifecycle.windowsPidSource='driver process.pid plus independently verified PS identity';
    function send(value){assert(!child.stdin.destroyed&&!child.stdin.writableEnded,'Windows Native stdin closed');child.stdin.write(JSON.stringify(value)+'\n')}
    function fail(category){if(failure)return;failure=new Error(category);readyReject(failure);for(const item of pending.values()){clearTimeout(item.timer);item.reject(failure)}pending.clear();try{send({type:'abort'})}catch{}lifecycle.failureCategory=category}
    async function inspect(mode,pid=profile?.windowsPid??0){
        const args=['-NoLogo','-NoProfile','-NonInteractive','-WindowStyle','Hidden','-File',PROCESS,'-Mode',mode,'-BridgeId',bridgeId];if(pid)args.push('-ProcessId',String(pid));
        try{const operation=execAsync(PWSH,args,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:2*1024*1024});operation.child.stdin.end(identity?JSON.stringify(identity):'');const result=await operation;return JSON.parse(result.stdout.replace(/^\ufeff/,'').trim())}
        catch(error){await retain({kind:'private-Windows-Native-identity-command-failure',record:{mode,bridgeId,windowsPid:pid,name:error.name,message:error.message,stdout:error.stdout??null,stderr:error.stderr??null}});throw new Error('Windows Native fixed identity command failed')}
    }
    function register(observed){assert(observed.exists&&observed.bridgeId===bridgeId&&observed.root&&samePath(observed.root.executablePath,EXE)&&observed.root.executableSha256===NODE_SHA);assert(/^[0-9]{15,20}$/.test(observed.root.startTimeUtcTicks));if(identity)assert.equal(observed.root.startTimeUtcTicks,identity.root.startTimeUtcTicks);for(const row of observed.members)history.set(row.pid+':'+row.startTimeUtcTicks,row);identity={...observed,members:[...history.values()]};lifecycle.inspections.push(observed)}
    async function inspectCurrent(){const observed=await inspect('Inspect');if(observed.exists)register(observed);return observed}
    async function applyState(value){assert(value&&Array.isArray(value.sql)&&Array.isArray(value.committed)&&value.snapshot&&value.report);sql.push(...value.sql);snapshot=value.snapshot;cachedReport=value.report;try{if(value.committed.length)await onCommitted(value.committed)}catch{deliveryFailed=true;throw new Error('Root actual SDK delivery failed')}return value}
    function rpc(name,payload={},ms=45000){assert(lifecycle.profileAcknowledged&&metadata&&!closed,'Actual ready Windows Native required');if(failure)return Promise.reject(failure);const id='r-'+(++sequence);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Windows Native RPC deadline'));fail('RPC-deadline')},ms);pending.set(id,{resolve,reject,timer});try{send({type:'command',id,name,payload})}catch{clearTimeout(timer);pending.delete(id);reject(new Error('Windows Native command write failed'));fail('RPC-write-failed')}})}
    const lines=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
    lines.on('line',line=>{append(JSON.stringify({kind:'Windows-Native-frame-hash-only',bytes:Buffer.byteLength(line),rawBytesSha256:sha(line),textExported:false}));if(!line.startsWith(NATIVE_BRIDGE_PREFIX))return;if(Buffer.byteLength(line)>32*1024*1024){fail('oversize-frame');return}
        queue=queue.then(async()=>{const message=JSON.parse(line.slice(NATIVE_BRIDGE_PREFIX.length));await retain({kind:'actual-Windows-Native-private-stdio-frame',record:message});
            if(message.type==='profile'){assert(!profile&&!closing);validateWindowsNativeProfile(message,bridgeId,driverSha);profile=message;const observed=await inspectCurrent();assert(observed.exists&&observed.root.pid===profile.windowsPid);send({type:'ack',id:message.id,ok:true,identity:observed.root});lifecycle.profileAcknowledged=true;send({type:'configuration',options:{backend:'nest',tag,runId,sourceCapId:sourceCap.id,sourcePins,environmentProof,totalTimeoutMs}});return}
            assert(profile&&lifecycle.profileAcknowledged,'No activity before Windows identity ACK');
            if(message.type==='ready'){assert(!metadata&&message.sourceCapId===sourceCap.id);await applyState(message);assert(message.report.platform==='win32'&&message.report.processId===profile.windowsPid&&message.report.binaryRawBytesSha256===BUNDLE_SHA);metadata=message.metadata;assert(Array.isArray(metadata)&&metadata.length>0);await inspectCurrent();send({type:'ack',id:message.id,ok:true});readyResolve();return}
            if(message.type==='response'){const item=pending.get(message.id);assert(item);pending.delete(message.id);clearTimeout(item.timer);if(message.ok)item.resolve(message.result);else{item.reject(new Error('Windows Native command required proof failed'));fail('command-or-proof-failed')}return}
            if(message.type==='failure'){fail('driver-reported-failure');return}assert.fail('Unknown Native driver frame');
        }).catch(()=>fail('frame-or-identity-proof-failed'));
    });
    function retainStdio(stream,bytes){const actual=Buffer.from(bytes);stdioEvidence=stdioEvidence.then(()=>retain({kind:'private-Windows-Native-original-stdio-chunk',record:{stream,bytes:actual.length,rawBytesSha256:sha(actual),encoding:'base64',bodyBase64:actual.toString('base64')}})).catch(()=>fail('private-stdio-retention-failed'))}
    child.stdout.on('data',bytes=>retainStdio('stdout',bytes));child.stderr.on('data',bytes=>{append(JSON.stringify({kind:'Windows-Native-stderr-hash-only',bytes:bytes.length,rawBytesSha256:sha(bytes),textExported:false}));retainStdio('stderr',bytes)});
    child.once('error',()=>{driverStatus={spawnError:true};exitResolve(driverStatus);fail('interop-spawn-failed')});child.once('exit',(code,exitSignal)=>{driverStatus={code,signal:exitSignal};exitResolve(driverStatus);if(!closing)fail('driver-exit-before-owned-close')});
    for(const stream of[child.stdin,child.stdout,child.stderr])stream.on('error',()=>fail('stdio-error'));lines.once('close',()=>{if(!closing)fail('stdout-EOF-before-owned-close')});
    const onAbort=()=>fail('Root-canceled');signal?.addEventListener('abort',onAbort,{once:true});const lifetime=setTimeout(()=>fail('Native-owner-total-deadline'),totalTimeoutMs);lifetime.unref();if(signal?.aborted)onAbort();
    async function close(){if(closed)return lifecycle;closing=true;const errors=[];let nativeClose;
        if(metadata&&!failure)try{const actual=await rpc('close',{},60000);await applyState(actual);nativeClose=actual.receipt;assert(nativeClose?.platform==='win32'&&nativeClose.appClosed&&nativeClose.portReleased);lifecycle.nativeClose=nativeClose}catch{errors.push('Native-cooperative-close-failed')}
        if(profile)try{await inspectCurrent()}catch{errors.push('Windows-final-identity-inspect-failed')}
        if(metadata&&!failure&&nativeClose)try{await rpc('terminate',{},10000)}catch{errors.push('Windows-driver-terminate-ACK-failed')}
        try{child.stdin.end()}catch{}
        try{await bounded(exited,15000,'Windows Native cooperative exit deadline')}catch{lifecycle.forcedStop=true}
        try{if(!identity){const observed=await inspect('Discover',0);if(observed.exists)register(observed)}if(identity){const stop=await inspect('Stop',identity.root.pid);assert.equal(stop.result,'owned-tree-stopped');lifecycle.windowsStop=stop}else lifecycle.noMatchingFixedWindowsAnchor=true}catch{errors.push('Exact-Windows-owned-tree-stop-incomplete')}
        try{await bounded(queue,15000,'Windows Native private evidence queue deadline')}catch{errors.push('Native-private-evidence-queue-incomplete')}
        try{await bounded(stdioEvidence,15000,'Windows Native original stdio retention deadline')}catch{errors.push('Native-original-stdio-retention-incomplete')}
        if(failure)errors.push('Native-owner-recorded-failure');
        clearTimeout(lifetime);signal?.removeEventListener('abort',onAbort);lines.close();closed=true;
        if(!driverStatus){child.unref?.();for(const stream of[child.stdin,child.stdout,child.stderr])stream.destroy()}else if(!child.stdin.destroyed)child.stdin.end();
        lifecycle.driverStatus=driverStatus??{notObserved:true};lifecycle.registeredWindowsIdentity=identity;lifecycle.originalSdkDelivered=!deliveryFailed;lifecycle.result=!errors.length&&nativeClose&&lifecycle.windowsStop?'actual-Windows-Native-closed-and-owned-tree-stopped':'partial-preserved';lifecycle.closeFailures=errors;
        try{reader.assertUnchanged()}catch{lifecycle.result='source-changed-preserved'}await retain({kind:'actual-Windows-Native-owner-closeout',record:lifecycle});if(lifecycle.result!=='actual-Windows-Native-closed-and-owned-tree-stopped')throw new Error('Windows Native closeout incomplete; preserve new run');return lifecycle;
    }
    try{await bounded(ready,120000,'Windows Native profile/startup deadline');return{origin:'http://127.0.0.1:10070',metadata,sql,admittedContexts,
        async admitContext(correlationId,context){const exact=validateNativeContext(correlationId,context,runId);if(admittedContexts.has(correlationId))assert.deepEqual(admittedContexts.get(correlationId),exact);const receipt=await rpc('admit',{correlationId,context:exact});assert(receipt.admitted&&receipt.platform==='win32'&&receipt.windowsPid===profile.windowsPid);admittedContexts.set(correlationId,exact);return receipt},
        witness:{async drain(){await applyState(await rpc('drain',{},60000))},snapshot(){assert(snapshot);return structuredClone(snapshot)},assertComplete(){assert(!deliveryFailed&&snapshot?.complete&&snapshot.diagnostics.length===0&&snapshot.openTransactions.length===0&&snapshot.pendingStartCount===0,'Actual Windows SDK trace/delivery incomplete')},sourceReport(){return structuredClone(cachedReport.sdk)}},
        async request(options){assert(admittedContexts.has(options.correlationId));const payload={...options,requestId:options.requestId??nativeRequestId(admittedContexts.get(options.correlationId))};if(Buffer.isBuffer(payload.body)){payload.bodyBase64=payload.body.toString('base64');delete payload.body}const response=await rpc('request',payload,35000),bytes=Buffer.from(response.rawBodyBase64,'base64');assert.equal(bytes.length,response.bodyBytesLength);assert.equal(sha(bytes),response.bodyBytesSha256);let body=bytes.length?bytes.toString('utf8'):null,parseError=null;if(bytes.length&&String(response.headers['content-type']??'').includes('application/json'))try{body=JSON.parse(body)}catch{parseError='invalid-json'}return{...response,body,bodyBytes:bytes,setCookie:response.headers['set-cookie']??[],parseError}},
        report(){return{...structuredClone(cachedReport),windowsOwner:{...lifecycle,registeredWindowsIdentity:identity},sourceCapId:sourceCap.id}},close};
    }catch{await close().catch(()=>{});throw new Error('Windows Native startup/identity failed; retained private evidence')}
}
