import assert from 'node:assert/strict';
import {existsSync,lstatSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {OwnedFixture} from './owned-fixture.mjs';
import {setOwnedPermissions} from './fixture-permissions.mjs';
import {assertObjectIdentity} from './fixture-complete-references.mjs';
import {localRootFor,resolveObject} from './fixture-objects.mjs';
import {permissionFacts,sha} from './j-command-fixtures.mjs';
import {uploadedAuditFault} from './j-upload-owner-fault.mjs';
import {captureAuditDiagnostic} from './j-upload-diagnostics.mjs';

const [backend,tag,ownerTag]=process.argv.slice(2);assert(process.argv.length===5&&['nest','rust'].includes(backend)&&[tag,ownerTag].every(value=>/^[a-z0-9-]{1,35}$/.test(value??'')));
const runId=process.env.POMS_R2IJ_SHARED_RUN;assert(/^[0-9a-f-]{36}$/.test(runId??''));
const output=`tmp/rust-r2ij/j-upload-${backend}-${tag}.json`;assert(!existsSync(output));
const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,ownerRaw=readFileSync(ownerFile),owner=JSON.parse(ownerRaw);
assert.equal(owner.backend,backend);assert.equal(owner.origin,backend==='nest'?'http://127.0.0.1:6700':'http://127.0.0.1:6701');assert.equal(owner.sourceHead,'61d6df1e971e7e785382dc85c75273e584ee2545');
function proof(){process.kill(owner.pid,0);const stat=readFileSync(`/proc/${owner.pid}/stat`,'utf8');assert.equal(stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],owner.processIdentity.startTicks);assert.equal(sha(readFileSync(owner.binary)),owner.binarySha256);return {pid:owner.pid,startTicks:owner.processIdentity.startTicks,binarySha256:owner.binarySha256};}
const report={formatVersion:1,backend,tag,runId,ownerTag,sourceHead:owner.sourceHead,ownerReceipt:{file:ownerFile,sha256:sha(ownerRaw)},owner:proof(),at:new Date().toISOString(),result:'pending',scope:'Actual public upload lifecycle; all objects are real registered local bytes, no mock storage or API responses',cases:[],fixtureSteps:[],faults:[],bindings:[],payloads:{},toolSources:['j-upload-lifecycle-scenario.mjs','j-upload-owner-fault.mjs','j-upload-diagnostics.mjs','reference-authority.json','j-command-fixtures.mjs','fixture-permissions.mjs','owned-fixture.mjs','http-client.mjs'].map(name=>({file:'tools/rust-r2ij/'+name,sha256:sha(readFileSync('tools/rust-r2ij/'+name))}))};
let fixture,originalPermissions;const sessions=new Map(),labels=new Map(),activeFaults=[];
const planFile=path.resolve('tmp/rust-r2ij/witness',ownerTag,'plan.json');
function select(name){if(backend==='nest'){const next=planFile+'.j-upload-next';writeFileSync(next,JSON.stringify({caseId:name})+'\n',{mode:0o600});renameSync(next,planFile);}}
function bind(id,label){assert(/^[0-9a-f-]{36}$/i.test(id));const existing=report.bindings.find(row=>row.id===id);if(existing)assert.equal(existing.label,label);else report.bindings.push({id,label});}
function bindFacts(facts){
    for(const row of facts.attachment){const session=facts.attachment_upload_session.find(item=>item.storage_key===row.storage_key&&item.provider_type===row.storage_provider&&(item.storage_bucket??null)===(row.storage_bucket??null));assert(session&&labels.has(session.id));bind(row.id,'attachment.'+labels.get(session.id));}
    for(const row of facts.attachment_link){const attachment=report.bindings.find(item=>item.id===row.attachment_id)?.label;assert(attachment);const target=Object.entries(fixture.journal.targets).find(([,id])=>id===row.target_id)?.[0];assert(target);bind(row.id,`link.${attachment}.${target}.${row.relation_type}`);}
    for(const row of facts.contract_term_snapshot)bind(row.id,'target.term');for(const row of facts.approval_summary_snapshot)bind(row.id,'target.summary.'+row.target_type);
    for(const row of facts.audit_log.filter(row=>!report.bindings.some(item=>item.id===row.id)).sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.id.localeCompare(b.id))){const target=report.bindings.find(item=>item.id===row.target_id)?.label;assert(target);const base=`audit.${row.event_type}.${target}`,n=report.bindings.filter(item=>item.label.startsWith(base+'.')).length+1;bind(row.id,base+'.'+n);}
}
function objectFacts(){return fixture.journal.storageObjects.map(object=>{assert.equal(object.provider,'local');const file=resolveObject(localRootFor(backend),object.key);if(!existsSync(file))return {provider:object.provider,bucket:object.bucket,key:object.key,exists:false};const stat=lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=readFileSync(file);return {provider:object.provider,bucket:object.bucket,key:object.key,exists:true,bytes:bytes.length,sha256:sha(bytes)};}).sort((a,b)=>a.key.localeCompare(b.key));}
async function call(name,method,url,options={},account='admin',expected){
    select(name);const startedAt=new Date().toISOString(),response=await fixture.request(sessions.get(account),method,url,options);
    await fixture.adoptRuntime();
    if(name.endsWith('.create')&&response.status===201){const label=name.slice(0,-7);labels.set(response.body.id,label);bind(response.body.id,'session.'+label);}
    const facts=await fixture.facts();bindFacts(facts);report.cases.push({name,method,url,account,startedAt,finishedAt:new Date().toISOString(),status:response.status,body:response.body,permissions:await permissionFacts(fixture),facts,objects:objectFacts(),request:options.json!==undefined?{contentType:'application/json',json:options.json}:options.body!==undefined?{contentType:options.contentType,bytes:Buffer.byteLength(options.body),sha256:sha(Buffer.from(options.body))}:{},expectedStatus:expected??null});
    if(name==='audit.complete-later-flush-failure')report.cases.at(-1).auditDiagnostic=await captureAuditDiagnostic(fixture,report,report.cases.at(-1));
    if(expected!==undefined)assert.equal(response.status,expected,name);return response;
}
const route=id=>'/api/attachment-upload-sessions/'+id;
async function create(label,size=7,extra={},expected=201){
    const originalName=`lifecycle-${runId}-${label}.txt`;await fixture.planCreation('session',{original_name:originalName,operation_type:'create-attachment'});
    return call(label+'.create','POST','/api/attachment-upload-sessions',{json:{operationType:'create-attachment',originalName,mimeType:'text/plain',sizeBytes:size,targetType:'customer',targetId:fixture.journal.targets.customer,category:report.category,...extra}},'admin',expected);
}
async function put(label,id,bytes,contentType='application/octet-stream',account='admin',expected=200){
    await fixture.planObject(id,Buffer.from(bytes));if(contentType!=='application/octet-stream')await fixture.planObject(id,Buffer.alloc(0));return call(label,'PUT',route(id)+'/object',{body:bytes,contentType},account,expected);
}
async function preseed(id,bytes){const object=await fixture.planObject(id,bytes);assert.equal(object.provider,'local');const file=resolveObject(localRootFor(backend),object.key);assert(!existsSync(file));mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx',mode:0o600});assert.equal(sha(readFileSync(file)),sha(bytes));report.faults.push({kind:'j-preseed-local-object',sessionId:id,bytes:bytes.length,sha256:sha(bytes),scope:'Fixture bytes; no proxy-PUT success claim'});}
async function columnFault(id,column,value){
    assert(['expires_at','created_by','max_size_bytes'].includes(column));const registered=fixture.journal.objects.find(row=>row.table==='attachment_upload_session'&&row.id===id);assert(registered);
    const original=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment_upload_session t where id=$1::uuid',[id])).rows[0]?.row;assert(original);assertObjectIdentity(original,registered);
    const originalIdentity={...registered.identity},fault={id:randomUUID(),kind:'j-session-column',state:'active',sessionId:id,column,original:original[column],injected:value,identity:originalIdentity,at:new Date().toISOString()};
    fixture.journal.faults.push(fault);if(column==='created_by')registered.identity.created_by=value;fixture.store.write(fixture.journal);
    const changed=await fixture.client.query(`update poms.attachment_upload_session set "${column}"=$2 where id=$1::uuid`,[id,value]);assert.equal(changed.rowCount,1);
    const applied=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment_upload_session t where id=$1::uuid',[id])).rows[0].row;assert.deepEqual(applied,{...original,[column]:applied[column]});
    const handle={receipt:{id:fault.id,kind:fault.kind,sessionId:id,column,original:original[column],injected:applied[column]},async restore(){
        const before=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment_upload_session t where id=$1::uuid',[id])).rows[0]?.row;assert(before);assertObjectIdentity(before,registered);assert.deepEqual(before[column],applied[column]);
        const restored=await fixture.client.query(`update poms.attachment_upload_session set "${column}"=$2 where id=$1::uuid`,[id,original[column]]);assert.equal(restored.rowCount,1);
        const after=(await fixture.client.query('select to_jsonb(t) as row from poms.attachment_upload_session t where id=$1::uuid',[id])).rows[0].row;assert.deepEqual(after,{...before,[column]:original[column]},'Restore injected column only; retain every product state/version/audit effect');registered.identity=originalIdentity;fault.state='restored';fault.restoredAt=new Date().toISOString();fixture.store.write(fixture.journal);return {id:fault.id,restored:true,column,productFieldsPreserved:true};
    }};activeFaults.push(handle);report.faults.push(handle.receipt);return handle;
}
async function restore(handle){report.faults.push(await handle.restore());activeFaults.splice(activeFaults.indexOf(handle),1);}
try{
    fixture=await OwnedFixture.open(backend,runId);await fixture.targets();for(const [kind,id] of Object.entries(fixture.journal.targets))bind(id,'target.'+kind);report.actors=fixture.base.accounts.map(({account,userId})=>({account,userId}));for(const row of report.actors)bind(row.userId,'user.'+row.account);
    report.category=(await fixture.client.query("select code from poms.dictionary_item where domain='attachment-category' and status='active' order by sort_order,code limit 1")).rows[0].code;
    originalPermissions=await permissionFacts(fixture);await setOwnedPermissions(fixture,['customer:read','customer:write'],'viewer');
    select('lifecycle.login');sessions.set('admin',await fixture.login(owner.origin));sessions.set('viewer',await fixture.login(owner.origin,'viewer'));report.loginHttpRequests=4;await fixture.assertOwnedDefault();assert.equal((await fixture.client.query('select count(*)::int as n from poms.attachment_storage_provider_config where enabled and is_default')).rows[0].n,0);
    const seven=Buffer.from('seven!!'),large=Buffer.alloc(131073);for(let i=0;i<large.length;i++)large[i]=i%251;report.payloads={seven:{size:seven.length,sha256:sha(seven),mimeType:'text/plain',originalName:'controlled-seven'},large:{size:large.length,sha256:sha(large),mimeType:'text/plain',originalName:'controlled-large'}};
    const big=(await create('big',large.length)).body;await put('big.direct-pending-put',big.id,large);assert.equal(report.cases.at(-1).facts.attachment_upload_session.find(row=>row.id===big.id).checksum_sha256,sha(large));
    await call('big.stale-target','POST',route(big.id)+'/upload-targets',{json:{expectedVersion:1}},'admin',409);
    await call('big.complete','POST',route(big.id)+':complete',{json:{expectedVersion:2}},'admin',200);
    for(const [name,method,suffix,options] of [['complete','POST',':complete',{json:{}}],['target','POST','/upload-targets',{json:{}}],['put','PUT','/object',{body:large,contentType:'application/octet-stream'}],['abort','POST',':abort',{json:{}}]])await call('completed.'+name,method,route(big.id)+suffix,options,'admin',409);
    const aborted=(await create('aborted')).body;await call('aborted.target','POST',route(aborted.id)+'/upload-targets',{json:{}},'admin',200);await call('aborted.abort','POST',route(aborted.id)+':abort',{json:{reason:'  stop  '}},'admin',200);await call('aborted.repeat','POST',route(aborted.id)+':abort',{json:{}},'admin',200);
    await call('aborted.complete','POST',route(aborted.id)+':complete',{json:{}},'admin',409);await call('aborted.terminal-target','POST',route(aborted.id)+'/upload-targets',{json:{}},'admin',409);await put('aborted.terminal-put',aborted.id,seven,'application/octet-stream','admin',409);
    const parser=(await create('parser',2)).body;await put('parser.json-consumed',parser.id,Buffer.from('{}'),'application/json','admin',400);await put('parser.form-consumed',parser.id,Buffer.from('a=b'),'application/x-www-form-urlencoded','admin',400);await put('parser.wrong-size',parser.id,Buffer.from('x'),'application/octet-stream','admin',400);await put('parser.valid-put',parser.id,Buffer.from('ok'));
    await call('parser.completion-hash-mismatch','POST',route(parser.id)+':complete',{json:{checksumSha256:'z'.repeat(64)}},'admin',400);await call('parser.complete','POST',route(parser.id)+':complete',{json:{}},'admin',200);
    const missing=(await create('missing')).body;await call('missing.complete','POST',route(missing.id)+':complete',{json:{}},'admin',404);await call('failed.abort-noop','POST',route(missing.id)+':abort',{json:{}},'admin',200);await call('failed.target','POST',route(missing.id)+'/upload-targets',{json:{}},'admin',409);await call('failed.complete','POST',route(missing.id)+':complete',{json:{}},'admin',409);await put('failed.put',missing.id,seven,'application/octet-stream','admin',409);
    const ttl=(await create('ttl')).body,expiry=await columnFault(ttl.id,'expires_at','2000-01-01T00:00:00.000Z');
    await call('ttl.get-does-not-expire','GET',route(ttl.id),{},'admin',200);assert.equal(report.cases.at(-1).body.status,'pending');assert.equal(report.cases.at(-1).body.rowVersion,1);
    await call('ttl.target-expires','POST',route(ttl.id)+'/upload-targets',{json:{}},'admin',409);assert.equal(report.cases.at(-1).facts.attachment_upload_session.find(row=>row.id===ttl.id).status,'expired');
    await call('expired.complete','POST',route(ttl.id)+':complete',{json:{}},'admin',409);await put('expired.put',ttl.id,seven,'application/octet-stream','admin',409);await call('expired.abort-noop','POST',route(ttl.id)+':abort',{json:{}},'admin',200);await restore(expiry);
    const ownerSession=(await create('owner')).body;await call('owner.other-read','GET',route(ownerSession.id),{},'viewer',403);await put('owner.other-write',ownerSession.id,seven,'application/octet-stream','viewer',403);
    const nullable=await columnFault(ownerSession.id,'created_by',null);await call('owner.null-created-by-read','GET',route(ownerSession.id),{},'viewer',200);await restore(nullable);
    const nonhex=(await create('nonhex',7,{checksumSha256:'z'.repeat(64)})).body;await put('nonhex.proxy-rejects',nonhex.id,seven,'application/octet-stream','admin',400);await preseed(nonhex.id,seven);await call('nonhex.complete-head-has-no-checksum','POST',route(nonhex.id)+':complete',{json:{}},'admin',200);assert.equal(report.cases.at(-1).body.checksumSha256,'z'.repeat(64));
    const size=(await create('size')).body;await preseed(size.id,Buffer.from('six!!!'));await call('size.complete','POST',route(size.id)+':complete',{json:{}},'admin',409);
    const audit=(await create('audit')).body;await put('audit.put',audit.id,seven);const check=await uploadedAuditFault(fixture,audit.id);activeFaults.push(check);report.faults.push(check.receipt);await call('audit.complete-later-flush-failure','POST',route(audit.id)+':complete',{json:{}},'admin',500);await restore(check);
    const whole=(await create('whole')).body;await preseed(whole.id,seven);await call('whole.complete-read-buffer-hash','POST',route(whole.id)+':complete',{json:{}},'admin',200);assert.equal(report.cases.at(-1).body.checksumSha256,sha(seven));
    await create('overmax',big.maxSizeBytes+1,{},400);
    const max=await columnFault(ownerSession.id,'max_size_bytes',1);await put('max.captured-limit-observation',ownerSession.id,seven,'application/octet-stream','admin',200);await restore(max);
    assert.equal(report.cases.length,50);report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
    select('lifecycle.cleanup');if(fixture){
        try{for(const handle of [...activeFaults].reverse())await restore(handle);if(originalPermissions)await setOwnedPermissions(fixture,originalPermissions.viewer,'viewer');}
        catch(error){report.result='fail';report.restoreFailure={name:error.name,message:error.message};process.exitCode=1;}
        try{report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert(report.cleanup1.zero&&report.cleanup2.zero);assert.equal(report.cleanup2.matched,0);assert.equal(report.cleanup2.changed,0);}
        catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message,stack:error.stack};process.exitCode=1;}await fixture.close();
    }
    try{report.ownerAfter=proof();for(const source of report.toolSources)assert.equal(sha(readFileSync(source.file)),source.sha256);}catch(error){report.result='fail';report.identityFailure={name:error.name,message:error.message};process.exitCode=1;}
    report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,backend,http:report.cases.length,failure:report.failure,restoreFailure:report.restoreFailure,cleanupFailure:report.cleanupFailure,cleanup2:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero}}));
}
