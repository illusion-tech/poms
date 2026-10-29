import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {OwnedFixture} from './owned-fixture.mjs';
const backend=process.argv[2],tag=process.argv[3],ownerTag=process.argv[4];assert(['nest','rust'].includes(backend)&&process.argv.length===5&&[tag,ownerTag].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
assert(/^[0-9a-f-]{36}$/.test(process.env.POMS_R2IJ_SHARED_RUN??''));
const owner=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`));
assert.equal(owner.backend,backend);assert.equal(owner.origin,backend==='nest'?'http://127.0.0.1:6700':'http://127.0.0.1:6701');assert.equal(owner.sourceHead,'61d6df1e971e7e785382dc85c75273e584ee2545');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);
const planFile=path.resolve('tmp/rust-r2ij/witness',ownerTag,'plan.json');
function selectCase(caseId){if(backend==='rust')return;const temporary=planFile+'.next';writeFileSync(temporary,JSON.stringify({caseId})+'\n',{mode:0o600});renameSync(temporary,planFile);}
const report={formatVersion:1,tag,ownerTag,at:new Date().toISOString(),backend,scope:'Real HTTP/PG/local critical scenario; only the parent strict comparison certifies compatibility',sourceHead:owner.sourceHead,binarySha256:owner.binarySha256,result:'pending',cases:[]};
let fixture;
function safeFacts(facts){
    return Object.fromEntries(Object.entries(facts).map(([table,rows])=>[table,rows.map(row=>{
        const copy={...row};
        for(const key of ['encrypted_access_key_id','encrypted_secret_access_key'])if(Object.hasOwn(copy,key)){copy[key+'_configured']=copy[key]!==null;copy[key+'_sha256']=copy[key]===null?null:hash(Buffer.from(copy[key]));delete copy[key];}
        return copy;
    })]));
}
try{
    fixture=await OwnedFixture.open(backend,process.env.POMS_R2IJ_SHARED_RUN);report.runId=fixture.runId;const targets=await fixture.targets();report.actors=fixture.base.accounts.map(({account,userId})=>({account,userId}));
    selectCase('setup.login');const session=await fixture.login(owner.origin);
    async function request(name,method,url,options={}){
        selectCase(name);const startedAt=new Date().toISOString();
        const result=await fixture.request(session,method,url,options);
        await fixture.adoptRuntime();
        report.cases.push({name,method,url,startedAt,finishedAt:new Date().toISOString(),status:result.status,body:result.body,facts:safeFacts(await fixture.facts())});
        return result;
    }
    async function provider(name,input){
        await fixture.assertOwnedDefault();
        await fixture.planCreation('provider',{provider_type:input.providerType,key_prefix:input.keyPrefix});
        return request(name,'POST','/api/platform/attachment-storage-providers',{json:input});
    }
    const prefix='ij-'+fixture.runId;
    const first=await provider('default.first-create',{providerType:'local',displayName:'First '+fixture.runId,enabled:true,isDefault:true,keyPrefix:prefix+'/first'});
    assert.equal(first.status,201);
    assert.equal((await request('config.get-detail','GET',`/api/platform/attachment-storage-providers/${first.body.id}`)).status,200);
    const noOpDefault=await request('default.already-default','POST',`/api/platform/attachment-storage-providers/${first.body.id}:set-default`,{json:{expectedVersion:first.body.rowVersion}});assert.equal(noOpDefault.status,200);assert.equal(noOpDefault.body.rowVersion,first.body.rowVersion);
    assert.equal((await request('config.unchanged-fields-update','PATCH',`/api/platform/attachment-storage-providers/${first.body.id}`,{json:{displayName:first.body.displayName,enabled:true,expectedVersion:first.body.rowVersion}})).status,200);
    const falseFilter=await request('config.enabled-false-string-coerces-true','GET','/api/platform/attachment-storage-providers?enabled=false');assert.equal(falseFilter.status,200);assert.equal(falseFilter.body.length,1);assert.equal(falseFilter.body[0].id,first.body.id);
    const second=await provider('default.second-create',{providerType:'local',displayName:'Second '+fixture.runId,enabled:true,isDefault:true,keyPrefix:prefix+'/second'});
    assert([201,500].includes(second.status),'Unexpected original default creation status');
    const third=await provider('default.nondefault-create',{providerType:'local',displayName:'Nondefault '+fixture.runId,enabled:true,isDefault:false,keyPrefix:prefix+'/third'});
    assert.equal(third.status,201);
    await fixture.assertOwnedDefault();
    const set=await request('default.explicit-set','POST',`/api/platform/attachment-storage-providers/${third.body.id}:set-default`,{json:{expectedVersion:third.body.rowVersion}});
    assert([200,500].includes(set.status));
    const unicode=await provider('utf16.config-audit',{providerType:'local',displayName:'\ud800',keyPrefix:prefix+'/utf16'});
    assert([201,500].includes(unicode.status));
    const badHeader=await provider('headers.obs-create',{providerType:'huawei-obs-s3',displayName:'Headers '+fixture.runId,enabled:true,endpoint:'http://127.0.0.1:6900',region:'r2ij',bucket:'b-'+fixture.runId,keyPrefix:prefix+'/headers',forcePathStyle:true,accessKeyId:'a\nb',secretAccessKey:'r2ij-synthetic-header-key'});
    assert.equal(badHeader.status,201);
    const tested=await request('headers.test-connection','POST',`/api/platform/attachment-storage-providers/${badHeader.body.id}:testConnection`,{json:{expectedVersion:badHeader.body.rowVersion}});
    assert.equal(tested.status,200);assert.equal(tested.body.status,'failed');
    const category=(await fixture.client.query("select code from poms.dictionary_item where domain='attachment-category' and status='active' order by sort_order,code limit 1")).rows[0]?.code;assert(category);
    const bytes=Buffer.from('Original native upload '+fixture.runId+'\n');
    const originalName='witness-'+fixture.runId+'.txt';
    await fixture.planCreation('session',{original_name:originalName,operation_type:'create-attachment'});
    const created=await request('upload.session-create','POST','/api/attachment-upload-sessions',{json:{operationType:'create-attachment',originalName,sizeBytes:bytes.length,targetType:'customer',targetId:targets.customer,category,mimeType:'text/plain'}});
    assert.equal(created.status,201);await fixture.planObject(created.body.id,bytes);
    const uploaded=await request('upload.proxy-put','PUT',`/api/attachment-upload-sessions/${created.body.id}/object`,{body:bytes,contentType:'application/octet-stream'});assert.equal(uploaded.status,200);
    const complete=await request('upload.complete','POST',`/api/attachment-upload-sessions/${created.body.id}:complete`,{json:{}});assert.equal(complete.status,200);
    await fixture.planCreation('session',{original_name:originalName,operation_type:'create-version'});
    const version=await request('version.session-create','POST','/api/attachment-upload-sessions',{json:{operationType:'create-version',originalName,sizeBytes:bytes.length,baseAttachmentId:complete.body.id,changeNote:'Original UoW witness',mimeType:'text/plain'}});
    assert.equal(version.status,201);await fixture.planObject(version.body.id,bytes);
    const versionPut=await request('version.proxy-put','PUT',`/api/attachment-upload-sessions/${version.body.id}/object`,{body:bytes,contentType:'application/octet-stream'});assert.equal(versionPut.status,200);
    const completedVersion=await request('version.complete','POST',`/api/attachment-upload-sessions/${version.body.id}:complete`,{json:{}});assert([200,500].includes(completedVersion.status));
    report.observations={secondDefaultCreate:second.status,explicitSetDefault:set.status,loneSurrogateConfig:unicode.status,headerFailure:tested.body.message,versionComplete:completedVersion.status};
    report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{
    selectCase('cleanup');
    if(fixture){
        try{report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert.equal(report.cleanup2.changed,0);assert.equal(report.cleanup2.matched,0);assert(report.cleanup2.zero);}
        catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
        await fixture.close();
    }
    process.kill(owner.pid,0);assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);
    writeFileSync(`tmp/rust-r2ij/critical-${backend}-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({result:report.result,cases:report.cases.length,observations:report.observations,failure:report.failure,cleanupFailure:report.cleanupFailure,secondCleanup:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero}}));
}
