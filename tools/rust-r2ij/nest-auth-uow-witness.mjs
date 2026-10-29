import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {OwnedFixture} from './owned-fixture.mjs';
import {executeFixture} from './fixture-run.mjs';
import {validateSource} from './fixture-guard.mjs';
import {databaseClient} from './database-client.mjs';
import {localRootFor,resolveObject} from './fixture-objects.mjs';
const require=createRequire(import.meta.url),{parseFixtureRequest}=require('./fixture-protocol.cjs');
const [tag,ownerTag]=process.argv.slice(2);assert(process.argv.length===4&&[tag,ownerTag].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
const owner=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-nest-${ownerTag}-start.json`));assert.equal(owner.origin,'http://127.0.0.1:6700');process.kill(owner.pid,0);
const planFile=path.resolve('tmp/rust-r2ij/witness',ownerTag,'plan.json');
function select(name){const temporary=planFile+'.next';writeFileSync(temporary,JSON.stringify({caseId:tag+'.'+name})+'\n',{mode:0o600});renameSync(temporary,planFile);}
const report={formatVersion:1,tag,ownerTag,at:new Date().toISOString(),result:'pending',scope:'Original Nest due-auth/AUTO flush/coflush/batched-update race witnesses, no Rust success claim',cases:[]};
let fixture,poll;
try{
    fixture=await OwnedFixture.open('nest');report.runId=fixture.runId;const targets=await fixture.targets();select('login');const session=await fixture.login(owner.origin);
    const tokenHash=s=>createHash('sha256').update(s.cookies.get('poms_session')).digest('hex');
    async function auth(s){return (await fixture.client.query('select id::text,row_version,last_seen_at,idle_expires_at from poms.auth_session where user_id=$1::uuid and token_hash=$2',[fixture.actor().userId,tokenHash(s)])).rows[0];}
    async function due(s){const request=parseFixtureRequest(Buffer.from(JSON.stringify({...fixture.baseRequest('session-due'),sessionToken:s.cookies.get('poms_session')})));await executeFixture(fixture.client,request,validateSource(),fixture.baseStore);}
    async function call(name,method,url,options={},s=session){select(name);const before=await auth(s),startedAt=new Date().toISOString();const response=await fixture.request(s,method,url,options);await fixture.adoptRuntime();const after=await auth(s);report.cases.push({name,method,url,status:response.status,body:response.body,beforeAuth:before,afterAuth:after,startedAt,finishedAt:new Date().toISOString()});return response;}
    const prefix='ij-'+fixture.runId;
    await due(session);await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/one'});
    const first=await call('auto-create-enabled','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'One '+fixture.runId,enabled:true,keyPrefix:prefix+'/one'}});assert.equal(first.status,201);
    await due(session);await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/one'});
    const duplicate=await call('auto-create-duplicate','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'Duplicate '+fixture.runId,enabled:true,keyPrefix:prefix+'/one'}});assert([409,500].includes(duplicate.status));
    await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/one'});
    const disabled=await call('create-disabled-conflicting','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'Disabled '+fixture.runId,keyPrefix:prefix+'/one'}});assert.equal(disabled.status,201);
    await due(session);
    const enable=await call('auto-enable-conflicting','PATCH',`/api/platform/attachment-storage-providers/${disabled.body.id}`,{json:{enabled:true,expectedVersion:disabled.body.rowVersion}});assert([409,500].includes(enable.status));
    await due(session);await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/unicode'});
    const unicode=await call('unicode-after-business-auth-commit','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'\ud800',keyPrefix:prefix+'/unicode'}});assert.equal(unicode.status,500);
    const category=(await fixture.client.query("select code from poms.dictionary_item where domain='attachment-category' and status='active' order by sort_order,code limit 1")).rows[0].code;
    async function createSession(name){
        await fixture.planCreation('session',{original_name:name,operation_type:'create-attachment'});
        return call('session-create-'+name.slice(0,5),'POST','/api/attachment-upload-sessions',{json:{operationType:'create-attachment',targetType:'customer',targetId:targets.customer,category,originalName:name,sizeBytes:7,mimeType:'text/plain'}});
    }
    await due(session);const missing=await createSession('missing-'+fixture.runId+'.txt');assert.equal(missing.status,201);await fixture.planObject(missing.body.id);
    await due(session);const missingComplete=await call('complete-missing-object','POST',`/api/attachment-upload-sessions/${missing.body.id}:complete`,{json:{}});assert.equal(missingComplete.status,404);
    const pending=await createSession('preseed-'+fixture.runId+'.txt');assert.equal(pending.status,201);
    const bytes=Buffer.from('preseed'),object=await fixture.planObject(pending.body.id,bytes);
    const file=resolveObject(localRootFor('nest'),object.key);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx',mode:0o600});
    await due(session);const completed=await call('complete-pending-preseeded-object','POST',`/api/attachment-upload-sessions/${pending.body.id}:complete`,{json:{}});assert.equal(completed.status,200);
    // Isolate batch optimistic checking from auth CAS with two fresh cookies.
    select('batch-login-one');const left=await fixture.login(owner.origin);
    select('batch-login-two');const right=await fixture.login(owner.origin);
    await fixture.assertOwnedDefault();await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/default-a'});
    const a=await call('batch-default-a','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'A '+fixture.runId,enabled:true,isDefault:true,keyPrefix:prefix+'/default-a'}},left);assert.equal(a.status,201);
    await fixture.planCreation('provider',{provider_type:'local',key_prefix:prefix+'/default-b'});
    const b=await call('batch-default-b','POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'B '+fixture.runId,enabled:true,keyPrefix:prefix+'/default-b'}},left);assert.equal(b.status,201);
    poll=await databaseClient('nest');
    await fixture.client.query('begin');let locked=false;
    try{
        await fixture.client.query('select id from poms.attachment_storage_provider_config where id=any($1::uuid[]) order by id for update',[[a.body.id,b.body.id]]);locked=true;
        select('batch-race');
        const endpoint=`/api/platform/attachment-storage-providers/${b.body.id}:set-default`;
        const calls=[fixture.request(left,'POST',endpoint,{json:{expectedVersion:b.body.rowVersion}}),fixture.request(right,'POST',endpoint,{json:{expectedVersion:b.body.rowVersion}})];
        let waiting=[];const deadline=Date.now()+12000;
        while(Date.now()<deadline){
            const found=await poll.query("select pid,wait_event_type,wait_event from pg_stat_activity where datname='poms_r2ij_nest' and usename='poms_r2ij_app' and wait_event_type='Lock' and query ilike '%update%attachment_storage_provider_config%' and position($1 in query)>0 and position($2 in query)>0",[a.body.id,b.body.id]);
            waiting=found.rows;if(waiting.length===2)break;await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.equal(waiting.length,2,'Both original batch UPDATEs must be observed waiting after their version SELECTs');
        await fixture.client.query('commit');locked=false;
        const responses=await Promise.all(calls);await fixture.adoptRuntime();
        report.batchRace={waiting,requests:2,statuses:responses.map(r=>r.status),bodies:responses.map(r=>r.body),finalRows:(await fixture.facts()).attachment_storage_provider_config.filter(r=>[a.body.id,b.body.id].includes(r.id)).map(({id,is_default,row_version})=>({id,is_default,row_version}))};
    }finally{if(locked)await fixture.client.query('rollback');}
    report.facts=await fixture.facts();
    // Private ciphertext is not copied to the public receipt.
    for(const row of report.facts.attachment_storage_provider_config){delete row.encrypted_access_key_id;delete row.encrypted_secret_access_key;}
    report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{
    if(poll)await poll.end();select('cleanup');
    if(fixture){try{report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert.equal(report.cleanup2.changed,0);assert.equal(report.cleanup2.matched,0);assert(report.cleanup2.zero);}catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}await fixture.close();}
    writeFileSync(`tmp/rust-r2ij/nest-auth-uow-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({result:report.result,cases:report.cases.length,authChanges:report.cases.map(c=>({name:c.name,status:c.status,delta:c.afterAuth.row_version-c.beforeAuth.row_version})),race:report.batchRace&&{statuses:report.batchRace.statuses,finalRows:report.batchRace.finalRows},failure:report.failure,cleanupFailure:report.cleanupFailure,cleanup:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero}}));
}
