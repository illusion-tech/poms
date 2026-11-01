import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';import{createRequire}from'node:module';
import{managed}from'./database-client.mjs';import{sourceHead,validateSource}from'./fixture-guard.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs'),binary='/home/wangzishi/.local/share/poms-r2m-continuation01/target/release/poms-api-rust',sha=b=>createHash('sha256').update(b).digest('hex');
function identity(pid){process.kill(pid,0);const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8');return{pid,startTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]};}
export async function startActualRust({tag,expectedBinarySha256}){
 assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');assert(/^[a-z0-9-]{1,60}$/.test(tag));assert(/^[0-9a-f]{64}$/.test(expectedBinarySha256));validateSource();
 const b=fs.readFileSync(binary);assert.equal(sha(b),expectedBinarySha256);assert(fs.lstatSync(binary).isFile()&&!fs.lstatSync(binary).isSymbolicLink());
 const env=managed('rust').childEnv,target=runtime.resolveTarget({mode:'managed-rust',host:'127.0.0.1',port:10071});await runtime.assertPortAvailable(target);
 const privateRoot='/home/wangzishi/.local/share/poms-r2m-continuation01/private',parent=fs.lstatSync(privateRoot);assert(parent.isDirectory()&&!parent.isSymbolicLink()&&(parent.mode&0o077)===0);
 const log=`${privateRoot}/rust-http-owner-${tag}.log`;const logFd=fs.openSync(log,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);fs.fsyncSync(logFd);fs.closeSync(logFd);const logIdentity=fs.lstatSync(log);assert(logIdentity.isFile()&&!logIdentity.isSymbolicLink()&&(logIdentity.mode&0o777)===0o600);let handle;
 try{handle=await runtime.startOwned({kind:'rust',executable:binary,args:[],cwd:process.cwd(),env,host:target.host,port:target.port,readyUrl:target.readinessUrl,logPath:path.resolve(log),timeoutMs:120000});}catch(error){if(handle)await runtime.stopOwned(handle);throw error;}
 const openedLog=fs.lstatSync(log);assert(openedLog.isFile()&&!openedLog.isSymbolicLink()&&openedLog.ino===logIdentity.ino&&openedLog.dev===logIdentity.dev);
 const owner=identity(handle.serverPid);let closed=false;
 const report={formatVersion:1,kind:'actual-Rust-release-full-HTTP-owner',sourceHead,tag,origin:target.origin,binary,binaryBytes:b.length,binaryRawBytesSha256:sha(b),processIdentity:owner,log,startedAt:new Date().toISOString()};
 return{origin:target.origin,report,async close(){if(closed)return;assert.deepEqual(identity(handle.serverPid),owner);assert.equal(sha(fs.readFileSync(binary)),expectedBinarySha256);await runtime.stopOwned(handle);await runtime.assertPortAvailable(target);closed=true;report.stoppedAt=new Date().toISOString();report.binaryUnchanged=true;report.stopped=true;}};
}
