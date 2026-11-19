import fs from 'node:fs';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const priv='/home/wangzishi/.local/share/poms-r4ghi/private';
const record=priv+'/rust-api131-process.json',raw=fs.readFileSync(record),p=JSON.parse(raw);
assert.equal(p.namespace,'poms-r4ghi');assert.equal(p.pid,19534);assert.equal(p.port,31441);
assert.equal(p.binarySha256,'4e42e3012c6901285b96c324abbef88245b34012134d9a98480e1dd34bea0ede');
const target=priv+'/rust-api131-stopped08.json';assert(!fs.existsSync(target));
const r=spawnSync(process.execPath,['/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/api-runtime01.mjs','stop','131'],{encoding:'utf8',timeout:20000});
assert.equal(r.status,0);const actual=JSON.parse(r.stdout.trim());assert.equal(actual.pid,p.pid);assert.equal(actual.processGone,true);
let gone=false;try{process.kill(p.pid,0);}catch(e){assert.equal(e.code,'ESRCH');gone=true;}assert(gone);
await new Promise((resolve,reject)=>{const s=net.createConnection({host:'127.0.0.1',port:p.port});s.setTimeout(2000,()=>{s.destroy();reject(new Error('Port observation timed out'));});s.once('connect',()=>{s.destroy();reject(new Error('Listener remains'));});s.once('error',e=>e.code==='ECONNREFUSED'?resolve():reject(e));});
const receipt={namespace:p.namespace,pid:p.pid,port:p.port,binarySha256:p.binarySha256,processGone:true,portFree:true,capturedAt:new Date().toISOString(),
  processRecord:{file:record,rawBytesSha256:createHash('sha256').update(raw).digest('hex')},exactOwnedStopOutput:actual};
fs.writeFileSync(target,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({stopped:receipt.pid,processGone:true,portFree:true,receipt:target,privateEvidenceRetained:true}));
