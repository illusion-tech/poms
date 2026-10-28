import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {NavigationHttpSession} from './http-client.mjs';
const require=createRequire(import.meta.url),{invokeBatchFixture}=require('./batch-client.cjs');
const tag=process.argv[2];assert.equal(process.argv.length,3);assert(/^[a-z0-9-]{1,35}$/.test(tag));const out=`tmp/rust-r2ef/e-transport-${process.platform}-${tag}.json`;assert(!existsSync(out));
const report={formatVersion:1,tag,copies:[],result:'pending'};let failed=false;
for(const backend of ['nest','rust']){
    const runId=randomUUID(),row={backend,runId,cases:[],cleanup:[]};report.copies.push(row);const invoke=action=>invokeBatchFixture({formatVersion:1,backend,runId,action,account:'none'});const session=new NavigationHttpSession('http://127.0.0.1:'+(backend==='nest'?'5500':'5501'),runId);
    try{await invoke('prepare');
        for(const actor of ['none','admin']){if(actor==='admin')await session.login('admin');
            for(const param of ['%FF','%ZZ'])for(const [method,route,json] of [['GET','/api/dictionaries/'+param,undefined],['PATCH','/api/dictionaries/'+param,{name:'probe'}],['GET','/api/platform/system-settings/'+param,undefined],['PATCH','/api/platform/system-settings/'+param,{value:50}]]){
                const response=await session.request(method,route,json?{json}:{});row.cases.push({id:actor+':'+method+':'+route,actor,method,route,status:response.status,body:response.body,contentType:response.contentType});
            }
        }
        for(const [id,query] of [['1001-pairs',Array(1000).fill('u=1').join('&')+'&domain=invalid'],['1000-empty-pairs','&'.repeat(1000)+'domain=invalid']]){const response=await session.request('GET','/api/dictionaries?'+query);row.cases.push({id,status:response.status,body:response.body,contentType:response.contentType,query});}
    }catch(error){failed=true;row.error={name:error.name};}
    finally{if(session.cookies.has('poms_session'))try{await session.request('POST','/api/auth/session:logout',{json:{}});}catch{failed=true;}session.cookies.clear();for(let pass=0;pass<2;pass++)try{const r=await invoke('cleanup');row.cleanup.push({pass,result:r});assert.equal(r.extension.zero,true);if(pass===1){assert.equal(r.matched,0);assert.equal(r.changed,0);}}catch(error){failed=true;row.cleanup.push({pass,error:{name:error.name}});}}
    console.log(JSON.stringify({backend,cases:row.cases.map(c=>({id:c.id,status:c.status})),error:row.error}));
}
report.result=failed?'fail':'observed';writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});if(failed)process.exitCode=1;
