import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
import {NavigationHttpSession} from './http-client.mjs';
import {sha} from './j-command-fixtures.mjs';
const [tag,nestOwner,rustOwner]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestOwner,rustOwner].every(value=>/^[a-z0-9-]{1,35}$/.test(value??'')));
const output=`tmp/rust-r2ij/j-upload-path-${tag}.json`;assert(!existsSync(output));const runId=randomUUID();
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:'Three actual J path/type-order probes per backend, with real authenticated or anonymous HTTP and PG absence proof; no mock/fallback business objects',toolSha256:sha(readFileSync('tools/rust-r2ij/j-upload-path-probes.mjs')),backends:[]};
for(const [backend,ownerTag] of [['nest',nestOwner],['rust',rustOwner]]){
    let fixture;const item={backend,ownerTag,result:'pending',cases:[]};report.backends.push(item);
    try{
        const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,raw=readFileSync(ownerFile),owner=JSON.parse(raw);assert.equal(owner.backend,backend);process.kill(owner.pid,0);assert.equal(sha(readFileSync(owner.binary)),owner.binarySha256);item.ownerReceiptSha256=sha(raw);item.binarySha256=owner.binarySha256;item.sourceHead=owner.sourceHead;
        fixture=await OwnedFixture.open(backend,runId);const admin=await fixture.login(owner.origin),anonymous=new NavigationHttpSession(owner.origin,runId),missing=randomUUID();item.absentId=missing;
        fixture.journal.intents.push({id:randomUUID(),kind:'negative-uuid-input',uuid:missing,meaning:'Deliberately absent UUID input; no row or domain object is claimed to exist',at:new Date().toISOString()});fixture.store.write(fixture.journal);
        const absent=(await fixture.client.query('select (select count(*)::int from poms.attachment where id=$1::uuid) as attachment,(select count(*)::int from poms.attachment_upload_session where id=$1::uuid) as session',[missing])).rows[0];assert.deepEqual(absent,{attachment:0,session:0});item.actualPgAbsence=absent;
        const cases=[{name:'authorized-invalid-uuid-pg-error',url:'/api/attachments/not-a-uuid',session:admin,expected:500},{name:'authorized-valid-absent-uuid',url:'/api/attachments/'+missing,session:admin,expected:404},{name:'anonymous-matched-malformed-percent-before-guard',url:'/api/attachments/%E0%A4',session:anonymous,expected:400}];
        for(const [index,c] of cases.entries()){
            const requestId=`r2ij:${runId}:path:${index}`,startedAt=new Date().toISOString(),response=await fixture.request(c.session,'GET',c.url,{requestId});
            await fixture.adoptRuntime();const guardEvents=(await fixture.client.query('select event_type,actor_id,path,method,permission_key,result,details from poms.security_event where request_id=$1 order by occurred_at,id',[requestId])).rows;
            item.cases.push({name:c.name,method:'GET',url:c.url,status:response.status,body:response.body,contentType:response.contentType,startedAt,finishedAt:new Date().toISOString(),guardEvents,facts:await fixture.facts(),expectedStatus:c.expected});
        }
        for(const c of item.cases)assert.equal(c.status,c.expectedStatus,c.name);assert.equal(item.cases[2].guardEvents.length,0,'Malformed matched capture rejects before authorization guard');item.result='pass';
    }catch(error){item.result='fail';item.failure={name:error.name,message:error.message};process.exitCode=1;}
    finally{if(fixture){try{item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert(item.cleanup1.zero&&item.cleanup2.zero);assert.equal(item.cleanup2.matched,0);assert.equal(item.cleanup2.changed,0);}catch(error){item.result='fail';item.cleanupFailure={name:error.name,message:error.message};process.exitCode=1;}await fixture.close();}}
    if(item.result!=='pass')break;
}
try{
    assert.equal(report.backends.length,2);assert(report.backends.every(item=>item.result==='pass'));
    const normalized=report.backends.map(item=>item.cases.map(({name,method,url,status,body,contentType,guardEvents,facts})=>({name,method,url:url.replaceAll(item.absentId,'$absent'),status,body:JSON.parse(JSON.stringify(body).replaceAll(item.absentId,'$absent')),contentType,guardEvents,facts})));
    assert.deepEqual(normalized[1],normalized[0]);report.result='pass';
}catch(error){report.result='fail';report.comparisonFailure={name:error.name,message:error.message};process.exitCode=1;}
report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,backends:report.backends.map(item=>({backend:item.backend,result:item.result,statuses:item.cases.map(row=>row.status),actualPgAbsence:item.actualPgAbsence,failure:item.failure,cleanup2:item.cleanup2&&{matched:item.cleanup2.matched,changed:item.cleanup2.changed,zero:item.cleanup2.zero}})),comparisonFailure:report.comparisonFailure}));
