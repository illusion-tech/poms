import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
const PRIVATE='/home/wangzishi/.local/share/poms-r2ij/private';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function connectObs(tag){
    assert.equal(process.platform,'linux');assert(/^[a-z0-9-]{1,30}$/.test(tag));
    const file=`${PRIVATE}/obs/${tag}/control.json`,st=lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.uid===process.getuid());const control=JSON.parse(readFileSync(file));assert.equal(control.scope,'rust-r2ij-obs');assert.equal(control.tag,tag);assert.equal(control.origin,'http://127.0.0.1:6900');process.kill(control.pid,0);
    async function call(action,body={}){const result=await fetch(control.origin+'/__r2ij_obs_control',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:control.token,action,...body})});assert.equal(result.status,200,'Controlled OBS admission rejected');return result.json();}
    return {
        registerRun:(runId,backend,config)=>call('register',{runId,backend,...config}),
        planOwned:async(object,runId,bytes)=>{assert.equal(object.provider,'huawei-obs-s3');return call('plan',{runId,bucket:object.bucket,key:object.key,...(bytes===undefined?{}:{expected:{sha256:hash(bytes),size:bytes.length}})});},
        headOwned:async(object,runId)=>{assert.equal(object.provider,'huawei-obs-s3');return call('head',{runId,bucket:object.bucket,key:object.key});},
        removeOwned:async(object,runId,expectedHash)=>{assert.equal(object.provider,'huawei-obs-s3');return call('remove',{runId,bucket:object.bucket,key:object.key,expectedHash});},
        setRule:(object,runId,rule)=>call('rule',{runId,bucket:object.bucket,key:object.key,rule}),
        snapshotRun:(runId,bucket)=>call('snapshot',{runId,bucket}),
        assertRunZero:async(runId,bucket)=>{const s=await call('snapshot',{runId,bucket});assert(s.objects.every(o=>!o.present)&&s.events.every(e=>!e.active));return {objects:0,active:0,zero:true};},
        shutdown:()=>call('shutdown')
    };
}
