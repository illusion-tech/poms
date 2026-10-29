// Only the exact fresh IJ OBS owner may be stopped, after all admitted runs
// have no present objects or active streams. This never controls API owners.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {connectObs} from './obs-client.mjs';
const ROOT='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(ROOT);
const [tag]=process.argv.slice(2);assert(process.argv.length===3&&/^[a-z0-9-]{1,30}$/.test(tag));
const privateFile=`/home/wangzishi/.local/share/poms-r2ij/private/obs/${tag}/state.json`,st=lstatSync(privateFile);assert(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.uid===process.getuid());
const state=JSON.parse(readFileSync(privateFile));assert.equal(state.scope,'rust-r2ij-obs');assert.equal(state.tag,tag);
assert(state.objects.every(o=>!o.present)&&state.events.every(e=>!e.active));
const start=JSON.parse(readFileSync(`tmp/rust-r2ij/obs-server-${tag}-start.json`));assert.equal(state.pid,start.pid);assert.equal(state.sourceHash,start.sourceHash);
const source=tag==='obs01'?'tools/rust-r2ij/obs-server.mjs':'tools/rust-r2ij/obs-server-v2.mjs';assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),state.sourceHash);
const response=await connectObs(tag).shutdown();assert.equal(response.stopping,true);
let stopped=false;for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,50));try{process.kill(state.pid,0);}catch(error){assert.equal(error.code,'ESRCH');stopped=true;break;}}
assert(stopped,'Exact OBS owner did not exit');
const receipt=JSON.parse(readFileSync(`tmp/rust-r2ij/obs-server-${tag}-stop.json`));assert.equal(receipt.pid,state.pid);assert.equal(receipt.zero,true);assert.equal(receipt.sourceHash,state.sourceHash);
const portRelease=[];for(const host of ['127.0.0.1','::1']){const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host,port:6900,ipv6Only:host==='::1'},resolve);});await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));portRelease.push({host,port:6900,exclusiveBindAndClose:true});}
const report={tag,pid:state.pid,at:new Date().toISOString(),sourceUnchanged:true,stopped:true,zero:true,runs:state.runs.length,objects:state.objects.length,events:state.events.length,portRelease};
writeFileSync(`tmp/rust-r2ij/obs-server-${tag}-closeout.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
