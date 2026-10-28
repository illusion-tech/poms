import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {databaseClient,privateRoot} from './database-client.mjs';
import {executeBatchFixture} from './batch-fixture.mjs';
const require=createRequire(import.meta.url),{runOwnedCommand}=require('../e2e/runtime.cjs');
const [mode,tag]=process.argv.slice(2);assert.equal(process.argv.length,4);assert(['nest-number','rust-pg'].includes(mode)&&/^[a-z0-9-]{1,35}$/.test(tag));assert.equal(process.platform,'linux');
const backend=mode==='nest-number'?'nest':'rust',runId=randomUUID(),output=`tmp/rust-r2ef/database-${mode}-${tag}.json`;assert(!existsSync(output));
const request=action=>({formatVersion:1,runId,backend,action,account:'none'});
const report={formatVersion:1,backend,mode,runId,tag,node:process.version,result:'pending',steps:[],startedAt:new Date().toISOString()};let client,failed=false;
const safe=error=>({name:error.name,...(/^[a-z_]+$|^[0-9A-Z]{5}$/.test(error.code??'')?{code:error.code}:{})});
try{
    client=await databaseClient(backend);const prepared=await executeBatchFixture(client,request('prepare'));report.steps.push({action:'prepare',state:prepared.state,matched:prepared.matched,changed:prepared.changed});
    if(mode==='nest-number'){
        const {runNestNumberWitness}=await import('./nest-number-witness.mjs');const r=await runNestNumberWitness({runId,tag});report.witness={result:r.report.result,output:r.output,sha256:createHash('sha256').update(readFileSync(r.output)).digest('hex')};assert.equal(r.report.result,'observed');
    }else{
        const fixture=path.join(privateRoot,'runs',`${backend}-${runId}-epg.json`);writeFileSync(fixture,JSON.stringify(prepared.extension.ePgFixture)+'\n',{flag:'wx',mode:0o600});
        const log=`tmp/rust-r2ef/database-rust-pg-${tag}.log`;report.test={log,result:'pending',fixtureSha256:createHash('sha256').update(readFileSync(fixture)).digest('hex')};
        const repo='/home/wangzishi/projects/poms-rust-r2ef',state='/home/wangzishi/.local/share/poms-r2ef',old='/home/wangzishi/.local/share/poms-r2d';
        const args=['--cgroup-manager=cgroupfs','run','--rm','--network=container:poms-r0e-pg15','--workdir=/workspace/apps/poms-api-rust','--mount',`type=bind,source=${repo},destination=/workspace`,'--mount',`type=bind,source=${state}/target,destination=/target`,'--mount',`type=bind,source=${old}/cargo-registry,destination=/usr/local/cargo/registry,readonly`,'--mount',`type=bind,source=${old}/cargo-git,destination=/usr/local/cargo/git,readonly`,'--mount',`type=bind,source=${privateRoot},destination=/r2ef-private,readonly`,'--env','CARGO_TARGET_DIR=/target','--env','CARGO_NET_OFFLINE=true','--env','POMS_R2EF_DATABASE_TEST=1','--env','POMS_ENV_FILE=/r2ef-private/rust.env','--env',`POMS_R2EF_PG_FIXTURE_FILE=/r2ef-private/runs/${backend}-${runId}-epg.json`,'ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273','cargo','test','--locked','--offline','--test','e_foundation_database','--','--ignored','--test-threads=1'];
        await runOwnedCommand({executable:'/usr/bin/podman',args,cwd:repo,env:{...process.env},logPath:path.resolve(log),timeoutMs:180000});report.test.result='pass';report.test.logSha256=createHash('sha256').update(readFileSync(log)).digest('hex');
    }
    const facts=await executeBatchFixture(client,request('facts'));report.facts=facts.extension;
}catch(error){failed=true;report.error=safe(error);console.log(JSON.stringify({mode,tag,error:report.error}));}
finally{
    if(client){for(let pass=0;pass<2;pass++){const step={action:'cleanup',pass};report.steps.push(step);try{const r=await executeBatchFixture(client,request('cleanup'));step.result='pass';step.response=r;assert.equal(r.state,'cleaned');if(pass===1){assert.equal(r.matched,0);assert.equal(r.changed,0);}}catch(error){step.result='fail';step.error=safe(error);failed=true;}}await client.end();}
    report.result=failed?'fail':'pass';report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({mode,tag,result:report.result,output,steps:report.steps.map(s=>({action:s.action,pass:s.pass,result:s.result,state:s.state,changed:s.changed,error:s.error}))}));
}if(failed)process.exitCode=1;
