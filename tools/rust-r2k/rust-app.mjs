import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';import{createRequire}from'node:module';
import{managed}from'./database-client.mjs';import{sourceHead,validateSource}from'./fixture-guard.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs'),binary='/home/wangzishi/.local/share/poms-r2k/target/release/poms-api-rust',sha=b=>createHash('sha256').update(b).digest('hex');
function identity(pid){process.kill(pid,0);const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8');return{pid,startTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]};}
export async function startActualRust({tag,expectedBinarySha256}){
 assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2k');assert(/^[a-z0-9-]{1,60}$/.test(tag));assert(/^[0-9a-f]{64}$/.test(expectedBinarySha256));validateSource();
 const b=fs.readFileSync(binary);assert.equal(sha(b),expectedBinarySha256);assert(fs.lstatSync(binary).isFile()&&!fs.lstatSync(binary).isSymbolicLink());
 const env=managed('rust').childEnv,target=runtime.resolveTarget({mode:'managed-rust',host:'127.0.0.1',port:8701});await runtime.assertPortAvailable(target);
 const log=`tmp/rust-r2k/rust-http-owner-${tag}.log`;assert(!fs.existsSync(log));let handle;
 try{handle=await runtime.startOwned({kind:'rust',executable:binary,args:[],cwd:process.cwd(),env,host:target.host,port:target.port,readyUrl:target.readinessUrl,logPath:path.resolve(log),timeoutMs:120000});}catch(error){if(handle)await runtime.stopOwned(handle);throw error;}
 const owner=identity(handle.serverPid);let closed=false;
 const report={formatVersion:1,kind:'actual-Rust-release-full-HTTP-owner',sourceHead,tag,origin:target.origin,binary,binaryBytes:b.length,binaryRawBytesSha256:sha(b),processIdentity:owner,log,startedAt:new Date().toISOString()};
 return{origin:target.origin,report,async close(){if(closed)return;assert.deepEqual(identity(handle.serverPid),owner);assert.equal(sha(fs.readFileSync(binary)),expectedBinarySha256);await runtime.stopOwned(handle);await runtime.assertPortAvailable(target);closed=true;report.stoppedAt=new Date().toISOString();report.binaryUnchanged=true;report.stopped=true;}};
}
