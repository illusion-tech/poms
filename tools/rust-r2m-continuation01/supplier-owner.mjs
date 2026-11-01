// Explicit Root-owned loopback protocol peers; imports do not open resources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { connectObs } from './obs-client.mjs';
const require=createRequire(import.meta.url),runtime=require('../e2e/runtime.cjs');
const root='/home/wangzishi/projects/poms-rust-r2m',priv='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
const sha=b=>createHash('sha256').update(b).digest('hex');
function safeDirectory(dir){const s=fs.lstatSync(dir);assert(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0);}
function readJson(file,publicReceipt=false){if(!publicReceipt)safeDirectory(path.dirname(file));else {const s=fs.lstatSync(path.dirname(file));assert(s.isDirectory()&&!s.isSymbolicLink());}const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const s=fs.fstatSync(fd);assert(s.isFile()&&s.nlink===1&&(publicReceipt||(s.mode&0o077)===0));return JSON.parse(fs.readFileSync(fd));}finally{fs.closeSync(fd)}}
function create(file,contents){safeDirectory(path.dirname(file));const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,contents);fs.fsyncSync(fd);}finally{fs.closeSync(fd)}}
export async function startSupplier({kind,tag}){
 assert.equal(process.cwd(),root);assert.equal(process.platform,'linux');assert(['obs','feishu'].includes(kind));assert(/^[a-z0-9-]{1,30}$/.test(tag));safeDirectory(priv);
 const port=kind==='obs'?10091:10090,scope='rust-r2m-'+kind,source=`tools/rust-r2m-continuation01/${kind}-server.mjs`,sourceHash=sha(fs.readFileSync(source));
 const target=runtime.resolveTarget({mode:'external',baseUrl:`http://127.0.0.1:${port}`});await runtime.assertPortAvailable(target);
 const logs=priv+'/execution-logs';if(!fs.existsSync(logs))fs.mkdirSync(logs,{mode:0o700});safeDirectory(logs);const log=`${logs}/${kind}-${tag}.log`;create(log,'');
 if(kind==='feishu'){const parent=priv+'/feishu';if(!fs.existsSync(parent))fs.mkdirSync(parent,{mode:0o700});safeDirectory(parent);}
 let handle,closed=false;const result={kind:'actual-controlled-loopback-supplier',supplier:kind,scope,tag,port,source,sourceHash,startedAt:new Date().toISOString(),cloudTenantClaimed:false};
 try{handle=await runtime.startOwned({kind:'nest',executable:process.execPath,args:[source,tag],cwd:root,env:Object.fromEntries(['PATH','HOME'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]])),host:'127.0.0.1',port,readyUrl:target.origin+'/health',validateReady:({status,bodyText})=>{try{const d=JSON.parse(bodyText);return status===200&&d.ready===true&&d.scope===scope&&d.tag===tag&&d.sourceHash===sourceHash}catch{return false}},logPath:log,timeoutMs:30000});
 const peer=kind==='obs'?connectObs(tag):null;result.pid=handle.serverPid;
 return{...result,peer,report:result,
  async setPlan(plan){assert(kind==='feishu'&&!closed);assert(plan?.formatVersion===1&&typeof plan.caseId==='string'&&/^[A-Za-z0-9:.-]{1,100}$/.test(plan.caseId));const dir=priv+'/feishu/'+tag;safeDirectory(dir);const original=dir+'/plan.json',s=fs.lstatSync(original);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&(s.mode&0o077)===0);const tmp=original+'.'+randomUUID()+'.tmp';create(tmp,JSON.stringify(plan)+'\n');fs.renameSync(tmp,original);return{caseId:plan.caseId,planSha256:sha(JSON.stringify(plan)),owned:true};},
  async close(){if(closed)return result;try{
   assert.equal(sha(fs.readFileSync(source)),sourceHash);
   if(peer){result.shutdown=await peer.shutdown();const file=`tmp/rust-r2m-continuation01/m-obs-server-${tag}-stop.json`;for(let n=0;n<250&&!fs.existsSync(file);n++)await new Promise(r=>setTimeout(r,20));const d=readJson(file,true);assert.equal(d.zero,true);assert.equal(d.sourceHash,sourceHash);result.peerStop=d;}
   else{const dir=priv+'/feishu/'+tag;create(dir+'/stop',tag+'\n');for(let n=0;n<250&&!fs.existsSync(dir+'/closeout.json');n++)await new Promise(r=>setTimeout(r,20));const d=readJson(dir+'/closeout.json');assert.equal(d.activeAtClose,0);assert.equal(d.stopped,true);assert.equal(d.sourceUnchanged,true);assert.equal(d.sourceSha256,sourceHash);result.peerStop=d;}
   result.gracefulPeerReceipt=true;
  }finally{await runtime.stopOwned(handle);await runtime.assertPortAvailable(target);closed=true;result.stopped=true;result.finishedAt=new Date().toISOString();}return result;}
 };
 }catch(error){if(handle)await runtime.stopOwned(handle);throw error;}
}
