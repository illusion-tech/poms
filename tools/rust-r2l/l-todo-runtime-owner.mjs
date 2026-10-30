// Root-only bounded launcher. Parent imports STANDARD MODULES ONLY and never
// loads Core, managed environment, DB, consumer or credentials. The existing
// runtime-worker IPC anchor starts a separate child with todo42 selected first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const TODO42_TAG='4794a1721f8d838f50bb4831dcceace568c72a07e9f45b25758c35a78dc06134';
const ROOT='/home/wangzishi/projects/poms-rust-r2l',PRIVATE='/home/wangzishi/.local/share/poms-r2l/private',SOURCE='tools/rust-r2l/l-todo-runtime-owner.mjs';
const PROFILE='tools/rust-r2l/l-todo-runtime-profile.json',BINARY='/home/wangzishi/.local/share/poms-r2l/target/release/poms-api-rust',FINAL='5b9ec4424e17e4e9bfd57055e6141e80594526dc437fde497ab95bfc2f464b16';
const CANDIDATE08=Object.freeze({tag:'candidate08',bindingFile:'tmp/rust-r2l/rust-candidate08-binary-source.json',bindingBytes:32552,bindingSha256:'f9c79ee04f593645715e48f680236dc4c807d64bca63dacdf5e8f4bfecbe7dbb',binaryBytes:34026504,binarySha256:'ee558d02f8a5ee7f49d3e3aced266338282e958cf84bf1cb96ef2e3b61b8b475',sourceFiles:169,filesManifestSha256:'306bf96aac19bf9f7c5ebb696e51df07c92a233348afaf8bd66f4622da33f56a'});
const sha=value=>createHash('sha256').update(value).digest('hex');
export function todoRuntimeOptions(backend,tag,buildTag='candidate08') {
    assert(['nest','rust'].includes(backend));assert(/^[a-z0-9-]{1,24}$/.test(tag??''));assert(/^candidate0[678]$/.test(buildTag));return{backend,tag,buildTag,profile:'todo42'};
}
export function readTodoRuntimeProfile(read=file=>fs.readFileSync(file)) {
    const bytes=read(PROFILE),manifest=JSON.parse(bytes);assert.equal(manifest.profile,'todo42');assert.equal(manifest.namespace,'poms-r2l-todo42');assert.equal(manifest.sources.length,20);assert.equal(manifest.sourceSetSha256,TODO42_TAG);assert.equal(sha(JSON.stringify(manifest.sources)),TODO42_TAG);
    assert.equal(new Set(manifest.sources.map(x=>x.file)).size,20);assert.deepEqual(manifest.sources.map(x=>x.file),manifest.sources.map(x=>x.file).toSorted());assert.deepEqual(manifest.candidate08Artifact,CANDIDATE08);return manifest;
}
export function verifyTodoCandidate08Source(bytes) {
    assert.equal(bytes.length,CANDIDATE08.bindingBytes);assert.equal(sha(bytes),CANDIDATE08.bindingSha256);const r=JSON.parse(bytes);
    assert.equal(r.tag,CANDIDATE08.tag);assert.equal(r.result,'pass-build-source-binding-not-runtime');assert.equal(r.files.length,CANDIDATE08.sourceFiles);assert.equal(new Set(r.files.map(x=>x.file)).size,CANDIDATE08.sourceFiles);
    assert.equal(r.filesManifestSha256,CANDIDATE08.filesManifestSha256);assert.equal(sha(JSON.stringify(r.files)),CANDIDATE08.filesManifestSha256);assert.equal(r.binary.file,BINARY);assert.equal(r.binary.bytes,CANDIDATE08.binaryBytes);assert.equal(r.binary.rawBytesSha256,CANDIDATE08.binarySha256);return r;
}
export function verifyTodoSource20(read=file=>fs.readFileSync(file)) {
    const manifest=readTodoRuntimeProfile(read);for(const item of manifest.sources){const bytes=read(item.file);assert.equal(bytes.length,item.bytes,'Todo42 source size changed: '+item.file);assert.equal(sha(bytes),item.rawBytesSha256,'Todo42 source bytes changed: '+item.file);}return manifest;
}
export function verifyTodoRuntimeCapture(runtimeInput,manifest,read=file=>fs.readFileSync(file)) {
    assert.equal(runtimeInput.result,'pass');assert.equal(sha(read(runtimeInput.manifest)),runtimeInput.manifestRawBytesSha256);
    for(const expected of manifest.sources){const rows=runtimeInput.files.filter(x=>x.source===expected.file);assert.equal(rows.length,1);assert.equal(rows[0].rawBytesSha256,expected.rawBytesSha256);assert.equal(rows[0].bytes,expected.bytes);const bytes=read(rows[0].snapshot);assert.equal(bytes.length,expected.bytes);assert.equal(sha(bytes),expected.rawBytesSha256);}return true;
}
export function todoRustBuildBinding(buildTag='candidate08',read=file=>fs.readFileSync(file)) {
    assert(/^candidate0[678]$/.test(buildTag));const file=`tmp/rust-r2l/rust-${buildTag}-binary-source.json`,bytes=read(file),r=buildTag==='candidate08'?verifyTodoCandidate08Source(bytes):JSON.parse(bytes),expected=buildTag==='candidate08'?CANDIDATE08.binarySha256:FINAL;
    assert.equal(r.result,'pass-build-source-binding-not-runtime');assert.equal(r.binary.file,BINARY);assert.equal(r.binary.rawBytesSha256,expected);assert.equal(sha(read(BINARY)),expected);
    for(const item of r.files){const raw=read(item.file);assert.equal(raw.length,item.bytes);assert.equal(sha(raw),item.rawBytesSha256);}return{file,rawBytesSha256:sha(bytes),expectedBinarySha256:expected,binary:BINARY,sourceFiles:r.files.length,...(buildTag==='candidate08'?{filesManifestSha256:CANDIDATE08.filesManifestSha256,binaryBytes:CANDIDATE08.binaryBytes}: {})};
}
export async function todoPortFree(port) {assert([9700,9701,9800].includes(port));await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(new Error('Todo42 owned listener port is unavailable')));server.listen({host:'127.0.0.1',port,exclusive:true},()=>server.close(error=>error?reject(new Error('Todo42 port probe did not close')):resolve()));});}
function privateDir(directory){if(!fs.existsSync(directory))fs.mkdirSync(directory,{mode:0o700});const s=fs.lstatSync(directory);assert(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0);}
function identity(pid){try{const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8'),parts=stat.slice(stat.lastIndexOf(')')+2).split(' ');return{pid,group:Number(parts[2]),startTicks:parts[19],state:parts[0]};}catch(error){if(['ENOENT','ESRCH'].includes(error.code))return null;throw error;}}
function groupMembers(pid){return fs.readdirSync('/proc').filter(x=>/^\d+$/.test(x)).map(x=>identity(Number(x))).filter(x=>x&&x.pid!==pid&&x.group===pid&&x.state!=='Z');}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function boundedOwner(options) {
    assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.equal(process.cwd(),ROOT);verifyTodoSource20();
    if(options.backend==='rust')todoRustBuildBinding(options.buildTag);for(const port of [9700,9701])await todoPortFree(port);
    privateDir(PRIVATE);privateDir(PRIVATE+'/execution-logs');const log=PRIVATE+`/execution-logs/todo42-${options.backend}-${options.tag}.log`,output=`tmp/rust-r2l/todo42-${options.backend}-${options.tag}-owner.json`;assert(!fs.existsSync(log)&&!fs.existsSync(output));
    const fd=fs.openSync(log,'wx',0o600),leaseId=randomUUID(),record={formatVersion:1,kind:'bounded-std-only-parent-Todo42-owner',result:'pending',...options,sourceSetSha256:TODO42_TAG,startedAt:new Date().toISOString(),privateStdoutExported:false};
    let anchor,anchorId,backendId,backendExit=false,backendCode=null,cancel=false,cancelSent=false,cancelAt=0,timedOut=false,released=false;
    const requestCancel=()=>{cancel=true;};process.on('SIGINT',requestCancel);process.on('SIGTERM',requestCancel);
    try {
        // Spawn the already-reviewed generic IPC anchor without importing it.
        // It owns only this exact backend process group and handles owner death.
        anchor=spawn(process.execPath,['tools/e2e/runtime-worker.cjs'],{cwd:ROOT,env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:process.env.LANG??'C.UTF-8'},detached:true,stdio:['ignore',fd,fd,'ipc']});
        anchor.on('message',message=>{if(message?.runId!==leaseId)return;if(message.type==='backend-spawned')backendId=identity(message.pid);if(message.type==='backend-exit'){backendExit=true;backendCode=message.code;}if(message.type==='backend-error'){backendExit=true;backendCode=1;}});
        await new Promise((resolve,reject)=>{anchor.once('spawn',resolve);anchor.once('error',()=>reject(new Error('Todo42 private anchor spawn failed')));});anchorId=identity(anchor.pid);assert(anchorId&&anchorId.group===anchor.pid);
        anchor.send({type:'start',runId:leaseId,executable:process.execPath,args:[SOURCE,'--child',options.backend,options.tag,options.buildTag],cwd:ROOT,
            env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:process.env.LANG??'C.UTF-8',POMS_R2L_FIXTURE_PROFILE:'todo42'}});
        const deadline=Date.now()+300000;
        while(!backendExit){
            if(Date.now()>=deadline){timedOut=true;cancel=true;if(!backendId)throw new Error('Todo42 backend identity handshake deadline exceeded');}
            if(cancel&&!cancelSent&&backendId){const current=identity(backendId.pid);assert(current&&current.startTicks===backendId.startTicks&&current.group===backendId.group);process.kill(backendId.pid,'SIGTERM');cancelSent=true;cancelAt=Date.now();}
            if(cancelSent&&Date.now()-cancelAt>30000)throw new Error('Todo42 graceful child deadline exceeded; preserve pending journal');
            if(anchor.exitCode!==null||anchor.signalCode!==null)throw new Error('Todo42 anchor exited before backend closeout');await sleep(25);
        }
        record.backendExitCode=backendCode;record.timedOut=timedOut;record.cancelRequested=cancel;
        assert.equal(groupMembers(anchorId.pid).length,0,'Owned backend descendants remain');anchor.send({type:'release',runId:leaseId});released=true;
        const childFile=`tmp/rust-r2l/todo42-${options.backend}-${options.tag}.json`,report=JSON.parse(fs.readFileSync(childFile));
        assert.equal(backendCode,0);assert((['observed','cancelled-cleaned'].includes(report.result)&&report.doubleZero===true)||(report.result==='cancelled-before-fixture'&&report.fixtureNeverOpened===true));verifyTodoSource20();
        record.childReport={file:childFile,bytes:fs.statSync(childFile).size,sha256:sha(fs.readFileSync(childFile))};record.result=report.result==='observed'?'pass-owner-and-child-closeout':report.result;if(timedOut){record.result='timeout-cleaned-evidence';process.exitCode=1;}
    }catch(error){record.result='fail-preserve-evidence';record.failure={name:error.name,detailsInPrivateChildLog:true};process.exitCode=1;}
    finally {
        process.off('SIGINT',requestCancel);process.off('SIGTERM',requestCancel);fs.closeSync(fd);
        if(anchorId){const current=identity(anchorId.pid);if(current){assert.equal(current.startTicks,anchorId.startTicks);assert.equal(current.group,anchorId.pid);if(!backendExit||groupMembers(anchorId.pid).length){process.kill(-anchorId.pid,'SIGTERM');await sleep(1000);const late=identity(anchorId.pid);if(late){assert.equal(late.startTicks,anchorId.startTicks);process.kill(-anchorId.pid,'SIGKILL');}}else if(anchor.connected&&!released){anchor.send({type:'release',runId:leaseId});released=true;}}
            const deadline=Date.now()+5000;while((identity(anchorId.pid)||groupMembers(anchorId.pid).length)&&Date.now()<deadline)await sleep(25);record.ownedGroupStopped=identity(anchorId.pid)===null&&groupMembers(anchorId.pid).length===0;if(!record.ownedGroupStopped){record.result='fail-preserve-evidence';process.exitCode=1;}}
        record.privateLog={file:log,bytes:fs.statSync(log).size,sha256:sha(fs.readFileSync(log)),contentsExported:false};record.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,result:record.result,ownedGroupStopped:record.ownedGroupStopped}));
    }
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)) {
    try {
        if(process.argv[2]==='--check'){readTodoRuntimeProfile();console.log(JSON.stringify({kind:'pure-Todo42-launcher-plan-check',sourceTag:TODO42_TAG,profileSourceFiles:20,CoreImported:false,DBOrPrivateRead:false}));}
        else if(process.argv[2]==='--child') {
            const options=todoRuntimeOptions(...process.argv.slice(3));process.env.POMS_R2L_FIXTURE_PROFILE='todo42';verifyTodoSource20();
            const {runTodo42Runtime}=await import('./l-todo-runtime.mjs');await runTodo42Runtime(options,{verifyTodoSource20,verifyTodoRuntimeCapture,todoRustBuildBinding,todoPortFree});
        }else await boundedOwner(todoRuntimeOptions(...process.argv.slice(2)));
    }catch{process.exitCode=1;console.log(JSON.stringify({kind:'Todo42-owned-launcher-failure',rawErrorObjectsExported:false,priorEvidencePreserved:true}));}
}
