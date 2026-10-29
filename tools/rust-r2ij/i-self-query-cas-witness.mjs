// One scheduled snapshot/CAS seam, exactly one subject PATCH per backend.
// Both original HTTP outcomes and committed product facts remain untouched.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
import {selfQueryGate} from './i-self-query-cas-owner.mjs';
const root='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(root);assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');
const [tag,nestTag,rustTag]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestTag,rustTag].every(v=>/^[a-z0-9-]{1,30}$/.test(v)));
const file=`tmp/rust-r2ij/i-self-query-cas-${tag}.json`;assert(!existsSync(file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),runId=randomUUID(),keyPrefix='ij-'+runId+'/self-query-cas';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
const report={formatVersion:1,kind:'One actual RLS/advisory scheduled initial-v1/self-query-v2 CAS observation; no product result substitution',tag,runId,at:new Date().toISOString(),result:'pending',schedule:{initial:{displayName:'Initial',rowVersion:1,isDefault:false},writer:{displayName:'Concurrent',rowVersion:2,isDefault:true},request:{displayName:'Requested',expectedVersion:1}},backends:[]};
function selected(backend,ownerTag,name){if(backend!=='nest')return;const path=`tmp/rust-r2ij/witness/${ownerTag}/plan.json`,temporary=path+'.self-cas-next';writeFileSync(temporary,JSON.stringify({caseId:'i.self-cas.'+tag+'.'+name})+'\n',{mode:0o600});renameSync(temporary,path);}
function safeFacts(facts){return Object.fromEntries(Object.entries(facts).map(([table,rows])=>[table,rows.map(row=>{const copy={...row};for(const key of ['encrypted_access_key_id','encrypted_secret_access_key'])if(Object.hasOwn(copy,key)){assert.equal(copy[key],null,'This local-only witness must never contain ciphertext');}return copy;})]));}
function publicResponse(response){return {status:response.status,body:response.body,rawBytesBase64:response.bodyBytes.toString('base64'),rawBytesSha256:hash(response.bodyBytes),contentType:response.contentType};}
function auditState(value){return value==null?null:{displayName:value.displayName??null,isDefault:value.isDefault??null,rowVersion:value.rowVersion??null,enabled:value.enabled??null,status:value.status??null};}
try{
    for(const [backend,ownerTag,priorTag] of [['nest',nestTag,'witness05'],['rust',rustTag,'api20']]){
        const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,owner=JSON.parse(readFileSync(ownerFile)),prior=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-${backend}-${priorTag}-start.json`));
        const sameBinary=owner.binarySha256===prior.binarySha256,priorSources=new Map(prior.sourceFiles.map(v=>[v.file,v.sha256]));assert.deepEqual(owner.sourceFiles.map(v=>v.file),prior.sourceFiles.map(v=>v.file));
        const deltas=owner.sourceFiles.filter(v=>v.sha256!==priorSources.get(v.file));
        if(backend==='nest'||sameBinary){assert(sameBinary);assert.deepEqual(deltas,[]);}else{assert.deepEqual(deltas.map(v=>v.file),['apps/poms-api-rust/src/attachment_storage/service.rs']);for(const row of deltas)assert.equal(hash(readFileSync(row.file)),row.sha256);}
        assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);
        const item={backend,ownerTag,binarySha256:owner.binarySha256,ownerReceiptSha256:hash(readFileSync(ownerFile)),sameProductAndBinaryAsAccepted20:sameBinary,allowedServiceOnlySourceDelta:deltas};report.backends.push(item);let fixture,gate,subject;
        try{
            fixture=await OwnedFixture.open(backend,runId);selected(backend,ownerTag,'login');const session=await fixture.login(owner.origin);await fixture.assertOwnedDefault();await fixture.planCreation('provider',{provider_type:'local',key_prefix:keyPrefix});
            selected(backend,ownerTag,'setup');const created=await fixture.request(session,'POST','/api/platform/attachment-storage-providers',{json:{providerType:'local',displayName:'Initial',enabled:true,isDefault:false,keyPrefix}});assert.equal(created.status,201);await fixture.adoptRuntime();item.setup=publicResponse(created);item.before=safeFacts(await fixture.facts());
            const target=item.before.attachment_storage_provider_config.find(r=>r.key_prefix===keyPrefix);assert(target&&target.row_version===1&&target.is_default===false&&target.display_name==='Initial');item.targetId=target.id;
            gate=await selfQueryGate(fixture,target.id);item.instrumentation=gate.receipt;item.locker=await gate.arm();
            selected(backend,ownerTag,'subject');const request={displayName:'Requested',expectedVersion:1},requestBytes=Buffer.from(JSON.stringify(request));item.request={method:'PATCH',path:`/api/platform/attachment-storage-providers/${target.id}`,body:request,rawBytesBase64:requestBytes.toString('base64'),rawBytesSha256:hash(requestBytes)};
            // Attach rejection handling immediately so finally can always release
            // the locker and await the real HTTP completion before DDL cleanup.
            subject=fixture.request(session,'PATCH',item.request.path,{body:requestBytes,contentType:'application/json'}).then(response=>({response}),error=>({error:{name:error.name,message:error.message}}));
            item.waitGraph=await gate.waitForBlockedApp();item.writer=await gate.writeConcurrent();await gate.release();const completed=await subject;assert(!completed.error,JSON.stringify(completed.error));item.response=publicResponse(completed.response);await fixture.adoptRuntime();
            item.notifications=await gate.assertSnapshots();item.after=safeFacts(await fixture.facts());const row=item.after.attachment_storage_provider_config.find(r=>r.id===target.id);assert(row);
            const audits=item.after.audit_log.filter(r=>r.target_type==='AttachmentStorageProviderConfig'&&r.target_id.replaceAll('-','')===target.id.replaceAll('-','')).toSorted((a,b)=>a.event_type.localeCompare(b.event_type));
            // Full raw bodies/audits remain in response/after. This decision
            // projection contains only the CAS seam's explicit state fields,
            // not generated IDs, actors, server times, or arbitrary metadata.
            item.observation={httpStatus:completed.response.status,response:completed.response.status>=400?null:{displayName:completed.response.body.displayName,isDefault:completed.response.body.isDefault,rowVersion:completed.response.body.rowVersion},pg:{displayName:row.display_name,isDefault:row.is_default,rowVersion:row.row_version},audits:audits.map(r=>({eventType:r.event_type,result:r.result,before:auditState(r.before_snapshot),after:auditState(r.after_snapshot),secretRedacted:r.metadata?.secretRedacted??null}))};item.result='observed';
        }finally{
            if(gate){try{await gate.release();}catch(error){item.releaseFailure={name:error.name,message:error.message};}if(subject){const completed=await subject;if(completed.response&&!item.response)item.response=publicResponse(completed.response);if(completed.error)item.subjectFailure=completed.error;}try{item.instrumentationRestore=await gate.restore();}catch(error){item.restoreFailure={name:error.name,code:error.code??null,message:error.message};await gate.closeConnectionsOnly();}}
            selected(backend,ownerTag,'cleanup');if(fixture){try{if(item.restoreFailure)item.cleanupNotAttempted='Exact instrumentation restore failed; private fault remains active for Root recovery';else{item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert(item.cleanup2.zero&&item.cleanup2.matched===0&&item.cleanup2.changed===0);}}finally{await fixture.close();}}assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);if(item.restoreFailure)throw new Error('Exact instrumentation restore failed: '+item.restoreFailure.message);
        }
    }
    const equal=JSON.stringify(canonical(report.backends[0].observation))===JSON.stringify(canonical(report.backends[1].observation));report.comparison={equal,scope:'HTTP status and success name/default/version; committed PG name/default/version; audit event/result plus before/after name/default/version/enabled/status and secretRedacted only. No IDs/actors/times enter this projection; complete raw bodies and audits remain unchanged for independent review.'};report.result=equal?'observed-match':'observed-difference';
}catch(error){report.result='tool-failure';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({tag,result:report.result,backends:report.backends.map(item=>({backend:item.backend,result:item.result,observation:item.observation,restore:item.instrumentationRestore,doubleCleanupZero:item.cleanup2?.zero,restoreFailure:item.restoreFailure})),failure:report.failure}));}
