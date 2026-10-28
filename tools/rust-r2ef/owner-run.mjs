import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {validateSource,sourceHead} from './fixture-guard.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
const {loadManagedEnvironment}=require('./managed-environment.cjs');
const [backend,tag]=process.argv.slice(2);assert.equal(process.argv.length,4);assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,35}$/.test(tag));
const stem=`tmp/rust-r2ef/owner-${backend}-${tag}`;for(const s of ['-start.json','-closeout.json','-stop'])assert(!existsSync(stem+s));
const sha=x=>createHash('sha256').update(x).digest('hex');
function sources(){const files=['tools/rust-r2ef/owner-run.mjs','tools/rust-r2ef/managed-environment.cjs','tools/e2e/runtime.cjs','tools/e2e/runtime-worker.cjs',...(backend==='nest'?['tools/rust-r2ef/nest-query-preload.cjs','tools/rust-r2c/witness-query-core.cjs','tools/rust-r2d/user-query-match.cjs']:['apps/poms-api-rust/Cargo.toml','apps/poms-api-rust/Cargo.lock'])];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())walk(f);else if(e.isFile())files.push(f);}}for(const dir of ['apps/poms-api/src','libs/shared/contracts/src','libs/api/contracts/src',...(backend==='rust'?['apps/poms-api-rust/src']:[])])walk(dir);return files.sort().map(file=>({file,sha256:sha(readFileSync(file))}));}
function identity(pid){process.kill(pid,0);if(process.platform==='win32'){const startTicks=execFileSync('pwsh.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',`[System.Diagnostics.Process]::GetProcessById(${pid}).StartTime.ToUniversalTime().Ticks.ToString()`],{encoding:'utf8',windowsHide:true}).trim();assert(/^[0-9]+$/.test(startTicks));return {pid,startTicks};}const stat=readFileSync(`/proc/${pid}/stat`,'utf8');return {pid,startTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]};}
let handle,target,binary,initial,before,receipt;const report={formatVersion:1,backend,tag,sourceHead,node:process.version,platform:process.platform,startedAt:new Date().toISOString(),result:'pending'};
try{
    validateSource();before=sources();const managed=loadManagedEnvironment({mode:'managed-'+backend});target=runtime.resolveTarget({mode:'managed-'+backend,host:managed.host,port:managed.port});await runtime.assertPortAvailable(target);
    let executable,args;
    if(backend==='nest'){
        const build=JSON.parse(readFileSync(`tmp/rust-r2ef/nest-build-${process.env.POMS_R2EF_BUILD_TAG}.json`));assert.equal(build.result,'pass');assert.equal(build.sourceHead,sourceHead);binary=path.resolve(build.binary);assert.equal(sha(readFileSync(binary)),build.sha256);
        const witness=path.resolve(`tmp/rust-r2ef/witness/${tag}`);assert(!existsSync(witness));mkdirSync(witness,{recursive:true,mode:0o700});managed.childEnv.POMS_R2EF_WITNESS_TAG=tag;
        executable=process.execPath;args=['--require',path.resolve('tools/rust-r2ef/nest-query-preload.cjs'),binary];
    }else{binary=path.resolve(process.env.POMS_RUST_API_BINARY);assert(existsSync(binary));executable=binary;args=[];}
    handle=await runtime.startOwned({kind:backend,executable,args,cwd:process.cwd(),env:managed.childEnv,host:target.host,port:target.port,readyUrl:target.readinessUrl,logPath:path.resolve(stem+'.log'),timeoutMs:120000});
    initial=identity(handle.serverPid);receipt={formatVersion:1,backend,tag,sourceHead,node:process.version,platform:process.platform,origin:target.origin,pid:handle.serverPid,aliveBefore:true,processIdentity:initial,binary,binarySha256:sha(readFileSync(binary)),sourceFiles:before,startedAt:new Date().toISOString()};
    writeFileSync(stem+'-start.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});Object.assign(report,{pid:receipt.pid,origin:receipt.origin,binarySha256:receipt.binarySha256,receiptSha256:sha(readFileSync(stem+'-start.json'))});console.log(JSON.stringify({state:'ready',backend,tag,pid:receipt.pid,receipt:stem+'-start.json'}));
    const deadline=Date.now()+50*60*1000;while(!existsSync(stem+'-stop')){assert(Date.now()<deadline);assert.deepEqual(identity(receipt.pid),initial);await new Promise(r=>setTimeout(r,1000));}assert.equal(readFileSync(stem+'-stop','utf8').trim(),tag);report.result='pass';
}catch(error){report.result='fail';report.failureType=error.name;process.exitCode=1;}
finally{
    if(handle){try{assert.deepEqual(identity(receipt.pid),initial);assert.equal(sha(readFileSync(binary)),receipt.binarySha256);assert.deepEqual(sources(),before);report.aliveAfter=true;report.sourceUnchanged=true;report.binaryUnchanged=true;}catch{report.result='fail';process.exitCode=1;}
        try{await runtime.stopOwned(handle);await runtime.assertPortAvailable(target);report.stopped=true;}catch{report.stopped=false;report.result='fail';process.exitCode=1;}}
    report.finishedAt=new Date().toISOString();writeFileSync(stem+'-closeout.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({backend,tag,result:report.result,stopped:report.stopped}));
}
