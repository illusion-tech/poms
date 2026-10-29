import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {OwnedFixture} from './owned-fixture.mjs';
import {seedHistory} from './fixture-history.mjs';
const [tag,ownerTag]=process.argv.slice(2);assert(process.argv.length===4&&[tag,ownerTag].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
const owner=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-nest-${ownerTag}-start.json`));assert.equal(owner.origin,'http://127.0.0.1:6700');process.kill(owner.pid,0);
const planFile=path.resolve('tmp/rust-r2ij/witness',ownerTag,'plan.json');
function select(name){const temporary=planFile+'.next';writeFileSync(temporary,JSON.stringify({caseId:tag+'.'+name})+'\n',{mode:0o600});renameSync(temporary,planFile);}
const report={formatVersion:1,tag,ownerTag,at:new Date().toISOString(),result:'pending',scope:'Original Nest multi-attachment UPDATE behavior over a declared valid pre-existing two-version fixture',cases:[]};
let fixture;
try{
    fixture=await OwnedFixture.open('nest');report.runId=fixture.runId;report.history=await seedHistory(fixture);select('login');const session=await fixture.login(owner.origin);
    const id=report.history.newerId;
    for(const [name,method,url,json] of [
        ['versions','GET',`/api/attachments/${id}/versions`],
        ['mark-with-existing-final','POST',`/api/attachments/${id}:mark-final`,{note:'Native batch witness'}],
        ['clear-final','POST',`/api/attachments/${id}:clear-final`,{reason:'Native batch witness'}],
        ['mark-single-final','POST',`/api/attachments/${id}:mark-final`,{note:'Native single final'}],
        ['void-latest-with-fallback','POST',`/api/attachments/${id}:void`,{reason:'Native batch fallback'}]
    ]){
        select(name);const response=await fixture.request(session,method,url,json===undefined?{}:{json});await fixture.adoptRuntime();
        const facts=await fixture.facts();report.cases.push({name,status:response.status,body:response.body,attachments:facts.attachment.map(({id,status,is_latest,is_final,row_version})=>({id,status,is_latest,is_final,row_version})),auditEvents:facts.audit_log.map(r=>r.event_type).sort()});
    }
    report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{
    select('cleanup');if(fixture){try{report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert.equal(report.cleanup2.changed,0);assert.equal(report.cleanup2.matched,0);assert(report.cleanup2.zero);}catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}await fixture.close();}
    writeFileSync(`tmp/rust-r2ij/nest-history-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({result:report.result,history:report.history,cases:report.cases.map(({name,status,attachments})=>({name,status,attachments})),failure:report.failure,cleanupFailure:report.cleanupFailure,cleanup:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero}}));
}
