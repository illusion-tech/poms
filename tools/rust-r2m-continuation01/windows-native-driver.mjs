// Fixed Windows anchor. No private read, application import or listener before
// Root independently inspects the actual Windows process and ACKs its profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const NATIVE_BRIDGE_PREFIX='POMS_M_NATIVE_BRIDGE_V1 ';
const ROOT=path.resolve(import.meta.dirname,'../..'),NODE='C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe';
const NODE_SHA='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
const sha=value=>createHash('sha256').update(value).digest('hex');
const privateFailure=error=>({name:error.name,message:error.message,stack:error.stack,...(Array.isArray(error.privateCauses)?{causes:error.privateCauses}:{})});
const sourceFiles=['tools/rust-r2m-continuation01/windows-native-driver.mjs','tools/rust-r2m-continuation01/windows-native-server.mjs','tools/rust-r2m-continuation01/windows-managed-environment.cjs','tools/rust-r2m-continuation01/managed-environment.cjs','tools/rust-r2m-continuation01/native-write-witness.mjs','tools/rust-r2m-continuation01/query-pid-witness.cjs','tools/rust-r2m-continuation01/acceptance-dispatch.mjs','tools/rust-r2m-continuation01/fixture-guard.mjs','tools/rust-r1b/shared-manifest.json','docs/design/rust-r2m/acceptance-input.json'];

export function verifyWindowsNativeSources(pins){
    assert(Array.isArray(pins));for(const name of sourceFiles){const selected=pins.filter(pin=>pin.file===name);assert.equal(selected.length,1,'Every fixed Native source requires one Root pin');const pin=selected[0],file=path.join(ROOT,name),stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=fs.readFileSync(file);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.rawBytesSha256)}return{kind:'Root-pinned-Windows-Native-tools',files:sourceFiles.length};
}

export function createNativeDriverChannel({input,output,controller,ackTimeoutMs=20000,configurationTimeoutMs=20000}){
    const pending=new Map();let sequence=0,closing=false,failed,profileAcknowledged=false,configured=false,handler,queue=Promise.resolve(),configureResolve,configureReject;
    const configuration=new Promise((resolve,reject)=>{configureResolve=resolve;configureReject=reject});configuration.catch(()=>{});
    const timer=setTimeout(()=>fail('configuration-deadline'),configurationTimeoutMs);timer.unref?.();
    function emit(value){if(output.destroyed||output.writableEnded){fail('stdout-closed');return}try{output.write(NATIVE_BRIDGE_PREFIX+JSON.stringify(value)+'\n')}catch{fail('stdout-write')}}
    function fail(code){if(failed||closing)return;failed=new Error('Windows Native channel '+code);clearTimeout(timer);configureReject(failed);for(const item of pending.values()){clearTimeout(item.timer);item.reject(failed)}pending.clear();if(!controller.signal.aborted)controller.abort(failed)}
    const lines=readline.createInterface({input,crlfDelay:Infinity});
    lines.on('line',line=>{if(closing||failed)return;try{
        assert(Buffer.byteLength(line)<=32*1024*1024);const value=JSON.parse(line);
        if(value.type==='abort'){fail('Root-abort');return}
        if(value.type==='configuration'){assert(profileAcknowledged&&!configured);configured=true;clearTimeout(timer);configureResolve(value.options);return}
        if(value.type==='ack'){const item=pending.get(value.id);assert(item);pending.delete(value.id);clearTimeout(item.timer);if(value.ok!==true){item.reject(new Error('Root rejected Native channel request'));fail('Root-rejection');return}if(item.type==='profile')profileAcknowledged=true;item.resolve(value.identity??value.receipt??null);return}
        assert(value.type==='command'&&profileAcknowledged&&configured&&handler&&/^r-[1-9][0-9]*$/.test(value.id));
        queue=queue.then(async()=>{if(failed)return;try{const result=await handler(value.name,value.payload??{});emit({type:'response',id:value.id,ok:true,result})}catch(error){emit({type:'response',id:value.id,ok:false,error:{category:'Windows-Native-command-or-required-proof-failed',name:error.name,publicRawErrorIncluded:false},privateFailure:privateFailure(error)});fail('command-failed')}}).catch(()=>fail('command-queue'));
    }catch{fail('invalid-input')}});
    lines.once('close',()=>{if(!closing)fail('stdin-EOF')});lines.once('error',()=>fail('readline-error'));input.once('error',()=>fail('stdin-error'));output.once('error',()=>fail('stdout-error'));
    function request(type,fields={}){if(failed||closing)return Promise.reject(failed??new Error('Native channel closed'));const id='d-'+(++sequence),promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>fail(type+'-ACK-deadline'),ackTimeoutMs);timer.unref?.();pending.set(id,{type,resolve,reject,timer});emit({type,id,...fields})});promise.catch(()=>{});return promise}
    return{configuration,request,emit,fail,pendingCount:()=>pending.size,setCommandHandler(value){assert(!handler&&typeof value==='function');handler=value},async idle(){await queue},close(){closing=true;clearTimeout(timer);configureReject(new Error('Native channel closed'));for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Native channel closed'))}pending.clear();lines.close();input.pause()}};
}

async function main(){
    assert.equal(process.platform,'win32');assert.equal(process.version,'v24.19.0');assert.equal(process.argv.length,4);assert.equal(process.argv[2],'--bridge-id');assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(process.argv[3]));process.chdir(ROOT);
    const bridgeId=process.argv[3],executable=fs.realpathSync(process.execPath),driverPath=fs.realpathSync(fileURLToPath(import.meta.url));assert.equal(executable.toLowerCase(),NODE.toLowerCase());assert.equal(sha(fs.readFileSync(executable)),NODE_SHA);
    const controller=new AbortController(),channel=createNativeDriverChannel({input:process.stdin,output:process.stdout,controller});let native,closed=false,totalTimer,sqlOffset=0,sdkOffset=0;const committed=[],contexts=new Map();let terminateResolve;
    const terminate=new Promise(resolve=>{terminateResolve=resolve});controller.signal.addEventListener('abort',()=>{terminateResolve();if(native)void native.close().catch(()=>{})},{once:true});
    function state(){const trace=native.witness.snapshot(),sql=native.sql.slice(sqlOffset),rows=committed.slice(sdkOffset),report=native.report();sqlOffset=native.sql.length;sdkOffset=committed.length;return{snapshot:trace,sql,committed:rows,report,activeRequests:report.activeRequests}}
    try{
        const identity=await channel.request('profile',{bridgeId,windowsPid:process.pid,node:process.version,executable,executableRawBytesSha256:NODE_SHA,driverPath,driverRawBytesSha256:sha(fs.readFileSync(driverPath)),driverArgv:process.argv.slice(),privateEnvironmentRead:false,applicationStarted:false});assert(identity&&identity.pid===process.pid);
        const options=await channel.configuration;verifyWindowsNativeSources(options.sourcePins);assert(typeof options.sourceCapId==='string'&&options.backend==='nest');assert(Number.isInteger(options.totalTimeoutMs)&&options.totalTimeoutMs>=1000&&options.totalTimeoutMs<=1800000);
        totalTimer=setTimeout(()=>channel.fail('driver-total-deadline'),options.totalTimeoutMs);totalTimer.unref();
        const {startWindowsNativeServer}=await import('./windows-native-server.mjs');native=await startWindowsNativeServer({tag:options.tag,runId:options.runId,environmentProof:options.environmentProof,onCommitted:rows=>committed.push(...rows),admittedContexts:contexts,signal:controller.signal});
        assert(!controller.signal.aborted,'Native startup canceled');
        channel.setCommandHandler(async(name,payload)=>{
            if(name==='admit'){assert(!closed);return native.admitContext(payload.correlationId,payload.context)}
            if(name==='drain'){assert(!closed);await native.drain();return state()}
            if(name==='request'){assert(!closed);return await native.request(payload)}
            if(name==='close'){if(!closed){await native.drain();const before=state(),receipt=await native.close();closed=true;return{...before,receipt}}return{alreadyClosed:true}}
            if(name==='terminate'){assert(closed);setImmediate(terminateResolve);return{terminating:true,windowsPid:process.pid}}
            assert.fail('Unknown fixed Native RPC command');
        });
        await channel.request('ready',{bridgeId,sourceCapId:options.sourceCapId,metadata:native.metadata,...state()});await terminate;
    }catch(error){process.exitCode=1;channel.emit({type:'failure',bridgeId,error:{category:'Windows-Native-startup-or-channel-failed',name:error.name,publicRawErrorIncluded:false},privateFailure:privateFailure(error),applicationStarted:!!native})}
    finally{clearTimeout(totalTimer);if(native&&!closed)try{await native.close();closed=true}catch(error){process.exitCode=1;channel.emit({type:'failure',bridgeId,stage:'driver-finally-close',error:{category:'Windows-Native-close-proof-failed',publicRawErrorIncluded:false},privateFailure:privateFailure(error)})}channel.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase())await main();
