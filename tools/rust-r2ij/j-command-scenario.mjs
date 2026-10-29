import assert from 'node:assert/strict';
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {OwnedFixture} from './owned-fixture.mjs';
import {seedHistory} from './fixture-history.mjs';
import {setOwnedPermissions} from './fixture-permissions.mjs';
import {commandCases} from './j-command-cases.mjs';
import {invalidMimeFault,localObjectFault,permissionFacts,sha} from './j-command-fixtures.mjs';

const [backend,tag,ownerTag]=process.argv.slice(2);
assert(process.argv.length===5&&['nest','rust'].includes(backend)&&[tag,ownerTag].every(value=>/^[a-z0-9-]{1,35}$/.test(value??'')));
const runId=process.env.POMS_R2IJ_SHARED_RUN;assert(/^[0-9a-f-]{36}$/.test(runId??''));
const output=`tmp/rust-r2ij/j-command-${backend}-${tag}.json`;assert(!existsSync(output),'Immutable run tag already exists');
const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,ownerRaw=readFileSync(ownerFile),owner=JSON.parse(ownerRaw);
assert.equal(owner.backend,backend);assert.equal(owner.sourceHead,'61d6df1e971e7e785382dc85c75273e584ee2545');
assert.equal(owner.origin,backend==='nest'?'http://127.0.0.1:6700':'http://127.0.0.1:6701');
function ownerProof(){
    process.kill(owner.pid,0);const stat=readFileSync(`/proc/${owner.pid}/stat`,'utf8');
    assert.equal(stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],owner.processIdentity.startTicks);
    assert.equal(sha(readFileSync(owner.binary)),owner.binarySha256);
    return {pid:owner.pid,startTicks:owner.processIdentity.startTicks,binarySha256:owner.binarySha256};
}
const proof=ownerProof(),planFile=path.resolve('tmp/rust-r2ij/witness',ownerTag,'plan.json');
function selectCase(caseId){if(backend==='nest'){const next=planFile+'.j-next';writeFileSync(next,JSON.stringify({caseId})+'\n',{mode:0o600});renameSync(next,planFile);}}
const toolFiles=['j-command-scenario.mjs','j-command-cases.mjs','j-command-fixtures.mjs','fixture-history.mjs','fixture-permissions.mjs','owned-fixture.mjs','http-client.mjs'];
const toolSources=toolFiles.map(file=>({file:'tools/rust-r2ij/'+file,sha256:sha(readFileSync('tools/rust-r2ij/'+file))}));
const report={formatVersion:1,backend,tag,runId,ownerTag,ownerReceipt:{file:ownerFile,sha256:sha(ownerRaw)},owner:proof,sourceHead:owner.sourceHead,at:new Date().toISOString(),toolSources,result:'pending',scope:'Actual public HTTP, real PG and registered local files; legacy history is an explicit SQL fixture, not API version-creation success',cases:[],fixtureSteps:[],faults:[],bindings:[],binaryScope:{lateStreamFailure:'Delegated to the real OBS transport harness; not claimed by this local-file runner'}};
let fixture,originalPermissions,activeFault;
const sessions=new Map();
const bind=(id,label)=>{assert(/^[0-9a-f-]{36}$/i.test(id),label);const found=report.bindings.find(row=>row.id===id);if(found)assert.equal(found.label,label);else report.bindings.push({id,label});};
function safeFacts(facts){return Object.fromEntries(Object.entries(facts).map(([table,rows])=>[table,rows.map(row=>{const copy={...row};for(const key of ['encrypted_access_key_id','encrypted_secret_access_key'])if(Object.hasOwn(copy,key)){copy[key+'_configured']=copy[key]!==null;copy[key+'_sha256']=copy[key]===null?null:sha(Buffer.from(copy[key]));delete copy[key];}return copy;})]));}
function bindFacts(facts){
    const targetById=new Map(Object.entries(fixture.journal.targets).map(([type,id])=>[id,type]));
    const known=new Map(report.bindings.map(row=>[row.id,row.label]));
    for(const row of facts.attachment_link){const a=known.get(row.attachment_id),target=targetById.get(row.target_id);assert(a&&target);bind(row.id,`link.${a}.${target}.${row.relation_type}`);}
    for(const table of ['contract_term_snapshot','approval_summary_snapshot'])for(const row of facts[table])bind(row.id,table==='contract_term_snapshot'?'target.term':'target.summary.'+row.target_type);
    // Audit identities are assigned on first actual appearance in this serial
    // run. This retains every repeated/no-op audit instead of deduplicating it.
    const seen=new Set(report.bindings.map(row=>row.id)),counts=new Map();
    for(const row of report.bindings.filter(row=>row.label.startsWith('audit.'))){const base=row.label.slice(0,row.label.lastIndexOf('.'));counts.set(base,Math.max(counts.get(base)??0,Number(row.label.slice(row.label.lastIndexOf('.')+1))));}
    for(const row of facts.audit_log.filter(row=>!seen.has(row.id)).sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.id.localeCompare(b.id))){
        const target=report.bindings.find(item=>item.id===row.target_id)?.label;assert(target,'Actual audit target must already be bound');
        const base=`audit.${row.event_type}.${target}`,ordinal=(counts.get(base)??0)+1;counts.set(base,ordinal);bind(row.id,base+'.'+ordinal);
    }
}
async function call(name,method,url,options={},account='admin',binary=false){
    selectCase(name);const startedAt=new Date().toISOString(),response=await fixture.request(sessions.get(account),method,url,options);
    await fixture.adoptRuntime();
    if(name.endsWith('.session-create')&&response.status===201)bind(response.body.id,'session.'+name.split('.')[0]);
    if(name.endsWith('.complete')&&response.status===200)bind(response.body.id,'attachment.'+name.split('.')[0]);
    const facts=safeFacts(await fixture.facts());bindFacts(facts);
    const row={name,method,url,account,startedAt,finishedAt:new Date().toISOString(),status:response.status,body:binary?undefined:response.body,contentType:response.contentType,contentLength:response.contentLength,binaryHeaders:response.binaryHeaders,permissions:await permissionFacts(fixture),facts,...(binary?{binary:true,bodyBase64:response.bodyBytes.toString('base64'),bodySha256:sha(response.bodyBytes),bodyLength:response.bodyBytes.length}:{}),};
    report.cases.push(row);return response;
}
function expectStatus(response,status,name){assert.equal(response.status,status,name);}
try{
    fixture=await OwnedFixture.open(backend,runId);report.actors=fixture.base.accounts.map(({account,userId})=>({account,userId}));
    const targets=await fixture.targets();report.targets=targets;for(const [type,id] of Object.entries(targets))bind(id,'target.'+type);
    for(const actor of fixture.base.accounts)bind(actor.userId,'user.'+actor.account);
    const history=await seedHistory(fixture);bind(history.olderId,'attachment.history.v1');bind(history.newerId,'attachment.history.v2');report.history=history;
    originalPermissions=await permissionFacts(fixture);
    selectCase('j-setup.login-admin');sessions.set('admin',await fixture.login(owner.origin,'admin'));
    selectCase('j-setup.login-viewer');sessions.set('viewer',await fixture.login(owner.origin,'viewer'));report.loginHttpRequests=4;
    await fixture.assertOwnedDefault();
    assert.equal((await fixture.client.query('select count(*)::int as n from poms.attachment_storage_provider_config where enabled and is_default')).rows[0].n,0,'This runner requires the clean original local fallback, not an unrelated default');
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6RyQAAAAASUVORK5CYII=','base64');
    const txt=Buffer.from('R2IJ actual text attachment\n中文 evidence '+runId+'\n');
    async function upload(label,bytes,mimeType,extension){
        const originalName=`预览 ' ! ~ 😀-${runId}-${label}.${extension}`;
        await fixture.planCreation('session',{operation_type:'create-attachment',original_name:originalName});
        const created=await call(label+'.session-create','POST','/api/attachment-upload-sessions',{json:{operationType:'create-attachment',originalName,sizeBytes:bytes.length,targetType:'customer',targetId:targets.customer,category:history.category,mimeType,checksumSha256:sha(bytes)}});
        expectStatus(created,201,label+' session');await fixture.planObject(created.body.id,bytes);
        const put=await call(label+'.proxy-put','PUT',`/api/attachment-upload-sessions/${created.body.id}/object`,{body:bytes,contentType:'application/octet-stream'});expectStatus(put,200,label+' proxy PUT');
        const complete=await call(label+'.complete','POST',`/api/attachment-upload-sessions/${created.body.id}:complete`,{json:{}});expectStatus(complete,200,label+' complete');
        assert.equal(complete.body.checksumSha256,sha(bytes));assert.equal(complete.body.links.length,1);assert.equal(complete.body.links[0].targetId,targets.customer);
        return {summary:complete.body,bytes,originalName,mimeType,sessionId:created.body.id};
    }
    const images={png:await upload('png',png,'image/png','png'),txt:await upload('txt',txt,'text/plain','txt')};
    report.payloads=Object.fromEntries(Object.entries(images).map(([label,value])=>[label,{id:value.summary.id,sessionId:value.sessionId,originalName:value.originalName,size:value.bytes.length,sha256:sha(value.bytes),mimeType:value.mimeType}]));
    for(const [label,suffix,method,range] of [
        ['png','download','GET'],['png','preview','GET'],['png','thumbnail','GET'],
        ['png','download','HEAD'],['png','preview','HEAD'],['png','thumbnail','HEAD'],
        ['png','download','GET','bytes=0-2'],['png','download','GET','bytes=-2'],['png','download','GET','bytes=999999-'],
        ['txt','download','GET'],['txt','download','HEAD']
    ]){
        const value=images[label],name=`binary.${label}.${suffix}.${method}${range?'.'+range:''}`;
        const response=await call(name,method,`/api/attachments/${value.summary.id}/${suffix}`,range?{rawHeaders:['Range',range]}:{},'admin',true);
        expectStatus(response,200,name);assert.deepEqual(response.bodyBytes,method==='HEAD'?Buffer.alloc(0):value.bytes,name+' exact original bytes');
        assert.equal(response.contentType,value.mimeType);assert.equal(response.binaryHeaders['cache-control'],'private, no-store');
        assert.equal(response.binaryHeaders['content-disposition'],`${suffix==='download'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(value.originalName)}`);
        assert.equal(response.binaryHeaders['content-range'],null);assert.equal(response.binaryHeaders['accept-ranges'],null);
    }
    for(const suffix of ['preview','thumbnail'])expectStatus(await call(`binary.txt.${suffix}.unsupported`,'GET',`/api/attachments/${images.txt.summary.id}/${suffix}`,{},'admin',true),415,suffix+' unsupported text');
    for(const [kind,status] of [['missing',404],['directory',400]]){
        activeFault=localObjectFault(fixture,images.png.summary.id,kind);report.faults.push(activeFault.receipt);
        try{for(const method of ['GET','HEAD']){
            const response=await call(`binary.png.${kind}.${method}`,method,`/api/attachments/${images.png.summary.id}/download`,{},'admin',true);
            expectStatus(response,status,kind+' '+method);
            if(method==='HEAD')assert.equal(response.bodyBytes.length,0);
            if(kind==='directory'&&method==='GET')assert.match(response.bodyBytes.toString('utf8'),/EISDIR/);
        }}finally{report.faults.push(await activeFault.restore());activeFault=null;}
    }
    activeFault=await invalidMimeFault(fixture,images.png.summary.id);report.faults.push(activeFault.receipt);
    try{for(const method of ['GET','HEAD']){
        const response=await call(`binary.png.invalid-mime.${method}`,method,`/api/attachments/${images.png.summary.id}/download`,{},'admin',true);
        expectStatus(response,500,'Non-Latin1 MIME header '+method);
        if(method==='HEAD')assert.equal(response.bodyBytes.length,0);
        else assert.deepEqual(response.body,{statusCode:500,message:'Internal server error'});
    }}finally{report.faults.push(await activeFault.restore());activeFault=null;}
    const iterator=commandCases({targets,png:images.png.summary,txt:images.txt.summary,history,categoryCode:history.category,restorePermissions:originalPermissions});
    let item=iterator.next();
    while(!item.done){
        const step=item.value;let response;
        if(step.kind==='fixture-permissions'){
            const before=await permissionFacts(fixture),changed=await setOwnedPermissions(fixture,step.keys,step.account),after=await permissionFacts(fixture);
            report.fixtureSteps.push({name:step.name,kind:step.kind,account:step.account,before:before[step.account],after:after[step.account],keys:changed.keys});
            assert.deepEqual(after[step.account],[...step.keys].sort());
        }else{
            response=await call(step.name,step.method,step.path,Object.hasOwn(step,'json')?{json:step.json}:{},step.session);
            const recorded=report.cases.at(-1);recorded.observeNative=step.observeNative??false;recorded.expectedStatus=step.expectedStatus??null;recorded.note=step.note??null;
            if(step.expectedStatus!==undefined)expectStatus(response,step.expectedStatus,step.name);
            if(step.name==='J command metadata-empty-noop'){
                const previous=report.cases.at(-2).facts.attachment.find(row=>row.id===images.png.summary.id),current=recorded.facts.attachment.find(row=>row.id===images.png.summary.id);
                assert.deepEqual(current,previous,'No-op metadata must preserve all persisted attachment fields');
            }
            if(step.name==='J command viewer-write-then-readback-403'){
                assert.equal(recorded.facts.attachment.find(row=>row.id===images.txt.summary.id).description,'J write-only persisted description');
                assert(recorded.facts.audit_log.some(row=>row.event_type==='attachment.metadata_updated'&&row.target_id===images.txt.summary.id&&row.operator_id===fixture.actor('viewer').userId),'Write-only403 follows the committed viewer audit');
            }
            if(step.name==='J command unlink-last-real-link-then-403')assert.equal(recorded.facts.attachment_link.find(row=>row.id===images.txt.summary.links[0].id).status,'unlinked');
        }
        item=iterator.next(response);
    }
    report.httpCount=report.cases.length;assert.equal(report.httpCount,58);assert.equal(report.cases.filter(row=>row.name.startsWith('J command ')).length,33);
    report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,code:error.code??null,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
    selectCase('j-command.cleanup');
    if(fixture){
        try{if(activeFault){report.faults.push(await activeFault.restore());activeFault=null;}if(originalPermissions)for(const account of ['viewer','admin'])await setOwnedPermissions(fixture,originalPermissions[account],account);}
        catch(error){report.result='fail';report.restoreFailure={name:error.name,message:error.message};process.exitCode=1;}
        try{report.cleanup1=await fixture.cleanup();report.cleanup2=await fixture.cleanup();assert(report.cleanup1.zero&&report.cleanup2.zero);assert.equal(report.cleanup2.changed,0);assert.equal(report.cleanup2.matched,0);}
        catch(error){report.result='fail';report.cleanupFailure={name:error.name,code:error.code??null,message:error.message,stack:error.stack};process.exitCode=1;}
        await fixture.close();
    }
    try{report.ownerAfter=ownerProof();for(const source of toolSources)assert.equal(sha(readFileSync(source.file)),source.sha256);}
    catch(error){report.result='fail';report.identityFailure={name:error.name,message:error.message};process.exitCode=1;}
    report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({result:report.result,backend,http:report.cases.length,fixtureSteps:report.fixtureSteps.length,failure:report.failure,cleanupFailure:report.cleanupFailure,cleanup1:report.cleanup1&&{zero:report.cleanup1.zero},cleanup2:report.cleanup2&&{matched:report.cleanup2.matched,changed:report.cleanup2.changed,zero:report.cleanup2.zero}}));
}
