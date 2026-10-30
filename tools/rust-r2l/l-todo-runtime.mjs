// Root/C SOURCE-only actual child. No Core/consumer/managed/DB module loads on
// import. The std-only parent sets todo42 BEFORE dynamically invoking this file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const PRIVATE='/home/wangzishi/.local/share/poms-r2l/private',sha=value=>createHash('sha256').update(value).digest('hex');
const SECRET=/^(?:password|passwordHash|password_hash|token|csrfToken|token_hash|csrf_token_hash|sessionToken|accessToken|refreshToken|cookie|setCookie|authorization|secret)$/i;
export function todoEvidenceValue(value,{publicValue=true,passwords=[]}={},key='') {
    if(value===null||value===undefined)return value;
    if(typeof value==='string'&&passwords.some(password=>password&&value.includes(password)))return{withheld:true,privacyClass:'request-password-echo',bytes:Buffer.byteLength(value),sha256:sha(value)};
    if(publicValue&&SECRET.test(key)){const text=typeof value==='string'?value:JSON.stringify(value);return{redacted:true,type:typeof value,bytes:Buffer.byteLength(text),sha256:sha(text)};}
    if(value instanceof Error)return todoEvidenceValue({name:value.name,message:value.message,stack:value.stack},{publicValue,passwords});
    if(Array.isArray(value))return value.map(item=>todoEvidenceValue(item,{publicValue,passwords}));
    if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[passwords.some(password=>password&&name.includes(password))?'withheld-key-'+sha(name):name,todoEvidenceValue(item,{publicValue,passwords},name)]));
    return value;
}
export function todoReceivedEvidence(response,passwords=[]) {
    assert(Buffer.isBuffer(response.bodyBytes)&&Array.isArray(response.setCookie));
    const text=JSON.stringify(response.parseError??null),echo=passwords.some(password=>password&&(response.bodyBytes.includes(Buffer.from(password))||response.setCookie.some(cookie=>cookie.includes(password))||text.includes(password)));
    return{status:response.status,contentType:response.contentType,bodyBytesBase64:echo?null:response.bodyBytes.toString('base64'),setCookie:echo?null:[...response.setCookie],parseError:todoEvidenceValue(response.parseError,{publicValue:false,passwords}),
        bytes:response.bodyBytes.length,sha256:sha(response.bodyBytes),rawOriginalRetainedPrivately:!echo,...(echo?{policyWithheld:'Request-password echo; original bytes/cookies withheld, only length/hash kept'}:{})};
}
function instant(value){const match=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d:\d\d)$/.exec(value);assert(match);return BigInt(Date.parse(value))*1000n+BigInt(((match[2]??'').padEnd(6,'0')).slice(3));}
export function assertTodoOriginalQuery({before,response,userId,oracle}) {
    assert.equal(response.status,200);assert.equal(response.parseError,null);assert(Array.isArray(response.body));
    const selected=before.todo_item.filter(row=>row.assignee_user_id===userId&&['open','processing'].includes(row.status));
    assert.deepEqual(response.body.map(row=>row.id).sort(),selected.map(row=>row.id).sort(),'Entire original assignee/status selection must match, with no missing/extra/duplicate DTO');
    let previous=null;
    for(const dto of response.body){const row=selected.find(row=>row.id===dto.id);assert(row);const at=instant(row.created_at);assert(previous===null||previous<=at,'Original createdAt ASC ordering changed');previous=at;
        const related=row.target_object_type==='project'?{project:{projectName:before.project.find(item=>item.id===row.target_object_id)?.project_name}}:row.target_object_type==='lead'?{lead:{leadName:before.lead.find(item=>item.id===row.target_object_id)?.lead_name}}:row.target_object_type==='customer'?{customer:{displayName:before.customer.find(item=>item.id===row.target_object_id)?.display_name}}:null;
        assert(related,'This bounded prepared slice contains only Project/Lead/Customer facts');assert.deepEqual(dto,oracle.project(oracle.hydrateTodo(row),related),'All DTO fields must equal the original complete mapper over actual committed rows');
    }
    return{selected:selected.length,fullDTOFieldsCompared:true,createdAtAscending:true,IDOrderForTiesImposed:false};
}
function directory(name){if(!fs.existsSync(name))fs.mkdirSync(name,{mode:0o700});const stat=fs.lstatSync(name);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0);}
export function todoCleanupDecision({portsFree,nativeAttempted,nativeHandle,nativeClosed,rustAttempted,rustHandle,rustClosed,resolved,fixtureState,result}) {
    const writersStopped=!!portsFree&&(!nativeAttempted||!!nativeHandle&&!!nativeClosed)&&(!rustAttempted||!!rustHandle&&!!rustClosed);
    return{writersStopped,mayCleanup:writersStopped&&!!resolved&&fixtureState==='prepared'&&['observed','cancelled'].includes(result)};
}
export async function runTodo42Runtime(options,helpers) {
    assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2l');assert.equal(process.env.POMS_R2L_FIXTURE_PROFILE,'todo42');
    const manifest=helpers.verifyTodoSource20(),{backend,tag,buildTag}=options;
    const [{LFixture},core,guards,{ident,verifyFullCatalog},{catalog:full107Catalog},{captureRuntimeInput},{startOriginalNative},{startActualRust},{NavigationHttpSession},{buildPreparedContractRows},consumer,recipe]=await Promise.all([
        import('./l-fixture.mjs'),import('./fixture-core.mjs'),import('./fixture-guard.mjs'),import('./catalog-complete.mjs'),import('../rust-r2c/schema-check.mjs'),import('./preserve-runtime-input.mjs'),import('./native-app.mjs'),import('./rust-app.mjs'),import('./http-client.mjs'),import('./prepared-contract-source.mjs'),import('./l-todo-consumption.mjs'),import('./l-todo-facts-source.mjs')]);
    assert.equal(core.fixtureProfile.name,'todo42');assert.equal(core.fixtureProfile.namespace,'poms-r2l-todo42');assert.equal(core.fixtureProfile.journalTag.sourceSetSha256,manifest.sourceSetSha256);assert.deepEqual(core.fixtureProfile.journalTag.sources,manifest.sources);assert.equal(core.supportedTables.length,42);
    const require=createRequire(import.meta.url),{fixtureCredentials}=require('./fixture-protocol.cjs');
    const output=`tmp/rust-r2l/todo42-${backend}-${tag}.json`;assert(!fs.existsSync(output));directory(PRIVATE);directory(PRIVATE+'/todo42-runtimes');
    const runId=randomUUID(),privateFile=PRIVATE+`/todo42-runtimes/${backend}-${runId}-${tag}.json`,passwords=[],contexts=new Map(),committed=[];
    const priv={formatVersion:1,kind:'private-new-isolated-Todo42-actual-evidence',backend,runId,tag,requests:[],prepared:[],cases:[],closeout:[],state:'pending'},report={formatVersion:1,kind:'actual-Todo42-prepared-source-consumption',result:'pending',backend,tag,runId,sourceHead:guards.sourceHead,marker:guards.marker,database:guards.databaseFor(backend),fixtureProfile:core.fixtureProfile,startedAt:new Date().toISOString(),requests:[],prepared:[],cases:[],cleanup:[],resourceCloseout:[],PG7Installed:false,NativeProducerCertifiedForPreparedSalesRows:false,G3Certified:false,G4Certified:false};
    let lastPrivateHash=null,f,native,rust,project,customer,fixtureAttempted=false,nativeAttempted=false,rustAttempted=false,nativeClosed=false,rustClosed=false,cancelled=false;
    const privateValue=value=>todoEvidenceValue(value,{publicValue:false,passwords}),publicValue=value=>todoEvidenceValue(value,{publicValue:true,passwords});
    const save=()=>{if(lastPrivateHash){const stat=fs.lstatSync(privateFile);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o077)===0);assert.equal(sha(fs.readFileSync(privateFile)),lastPrivateHash);}
        const bytes=Buffer.from(JSON.stringify(privateValue(priv))+'\n');assert(bytes.length<128*1024*1024);const target=lastPrivateHash?privateFile+'.'+randomUUID()+'.tmp':privateFile,fd=fs.openSync(target,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(lastPrivateHash)fs.renameSync(target,privateFile);const dir=fs.openSync(path.dirname(privateFile),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}lastPrivateHash=sha(bytes);fs.writeFileSync(output,JSON.stringify(publicValue(report),null,2)+'\n');};
    const signal=()=>{cancelled=true;},checkCancelled=()=>{if(cancelled){const error=new Error('Owned Todo42 cancellation requested');error.name='Todo42Cancelled';throw error;}};process.on('SIGTERM',signal);process.on('SIGINT',signal);save();
    const ids={lead:randomUUID(),followups:[randomUUID(),randomUUID(),randomUUID()],todos:[randomUUID(),randomUUID(),randomUUID()]};
    async function facts(){const result={};for(const table of f.supportedTables){const pk=f.j.objects.filter(item=>item.table===table).map(item=>item.id);result[table]=pk.length?(await f.client.query('SELECT to_jsonb(t) AS row FROM poms.'+ident(table)+' t WHERE id=ANY($1::uuid[]) ORDER BY id',[pk])).rows.map(item=>item.row):[];}return result;}
    function scope(name,anonymous=false){return f.defineCase(name,{actors:Object.values(f.actors),projects:project?[project.id]:[],ownedCustomerIds:customer?[customer.id]:[],ownedLeadIds:f.j.objects.some(item=>item.table==='lead'&&item.id===ids.lead)?[ids.lead]:[],anonymous});}
    async function call(session,name,method,route,requestJson,watch=[]) {
        checkCancelled();const selected=scope(name,session.userId===null),executionBackend=route==='/api/me/todos'&&backend==='rust'?'rust':'native';
        const context={runId,caseId:name,index:report.requests.length,op:executionBackend==='rust'?'l.http':'l.producer'},correlationId='l-todo42-'+randomUUID();contexts.set(correlationId,context);session.identity=core.caseIdentity(runId,name);
        const intents=[];for(const [table,selector]of [['audit_log',{request_id:selected.requestId}],['security_event',{request_id:selected.requestId}],...watch])intents.push(await f.intent(table,selector,{caseId:name}));
        const before=await facts(),from=committed.length,startedAt=new Date().toISOString(),sqlStart=native.sql.length;
        if(requestJson?.password)passwords.push(requestJson.password);const rawRequestBytes=requestJson===undefined?null:Buffer.from(JSON.stringify(requestJson));
        const raw={name,method,route,executionBackend,context,intents,before,startedAt,request:rawRequestBytes?{typedRedacted:publicValue(requestJson),bytes:rawRequestBytes.length,sha256:sha(rawRequestBytes),rawRequestBytesRetained:false}:null,
            requestCookies:[...session.cookies].map(([cookie,value])=>({name:cookie,bytes:Buffer.byteLength(value),sha256:sha(value)})),certification:{state:'pending'}};
        const pub={name,method,path:route,executionBackend,startedAt,before:publicValue(before),request:raw.request,sqlStart,certificates:{state:'pending'}};priv.requests.push(raw);report.requests.push(pub);save();
        const originalOrigin=session.origin;let response;session.origin=executionBackend==='rust'?rust.origin:native.origin;
        try {
            response=await session.request(method,route,{...(requestJson===undefined?{}:{json:requestJson}),requestId:selected.requestId,correlationId});raw.httpReceivedAt=pub.httpReceivedAt=new Date().toISOString();raw.response=todoReceivedEvidence(response,passwords);
            pub.response={status:response.status,contentType:response.contentType,body:publicValue(response.body),wireBodyBytes:raw.response.bytes,wireBodySha256:raw.response.sha256,rawOriginalRetainedPrivately:raw.response.rawOriginalRetainedPrivately,parseError:publicValue(raw.response.parseError)};save();
            assert.equal(raw.response.rawOriginalRetainedPrivately,true,'Do not certify withheld request-password echoes as complete raw evidence');
            await native.witness.drain();native.witness.assertComplete();const creates=committed.slice(from);if(executionBackend==='rust')assert.equal(creates.length,0,'Rust Todo GET cannot mint an original Native create');
            let authorityId=null;if(executionBackend==='native')authorityId=f.registerNativeAuthority(f.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:guards.databaseFor(backend),marker:guards.marker,source:{file:'tools/rust-r2l/k-native-write-witness.mjs',sha256:sha(fs.readFileSync('tools/rust-r2l/k-native-write-witness.mjs'))},trace:native.witness.snapshot()}));
            const certified=creates.map(item=>{const possible=intents.filter(intent=>intent.table===item.table);assert.equal(possible.length,1,'Unexpected original SDK create lacks a unique real before-intent');return f.creationEnvelope({...item,authorityId,intentId:possible[0].id});});
            if(certified.length)f.recordCommittedCreates(certified);await f.resolveNoCreates(name);await f.adoptIntents();
            const after=await facts();raw.after=after;raw.certification={state:'complete',SDKCreates:certified};pub.after=publicValue(after);pub.certificates={state:'complete',sdkComplete:true,authorityId,sdkCreates:creates.map(({table,id})=>({table,id})),PGCertificatesUsed:false};raw.finishedAt=pub.finishedAt=new Date().toISOString();pub.sqlEnd=native.sql.length;
            if(route==='/api/me/todos'){assert.equal(f.j.objects.length,raw.beforeCount??beforeCount(before));pub.originalQuery=assertTodoOriginalQuery({before,response,userId:session.userId,oracle:recipe.originalTodoProjection()});}
            await f.preflight();save();checkCancelled();return response;
        }catch(error){raw.failure=privateValue(error);pub.failure={name:error.name,detailsRetainedPrivately:true};save();throw error;}
        finally{session.origin=originalOrigin;}
    }
    const beforeCount=value=>Object.values(value).reduce((sum,rows)=>sum+rows.length,0);
    try {
        const binding=backend==='rust'?helpers.todoRustBuildBinding(buildTag):null;report.buildBinding=binding;
        const extraFiles=binding?[{file:binding.binary,snapshot:'artifacts/poms-api-rust',expectedSha256:binding.expectedBinarySha256},{file:path.resolve(binding.file),snapshot:'artifacts/todo42-rust-build-binding.json',expectedSha256:binding.rawBytesSha256}]:[];
        report.runtimeInput=await captureRuntimeInput(`todo42-${backend}-${tag}`,{extraFiles});helpers.verifyTodoRuntimeCapture(report.runtimeInput,manifest);helpers.verifyTodoSource20();checkCancelled();
        fixtureAttempted=true;f=await LFixture.open(backend,runId);assert.equal(f.fixtureProfile.journalTag.sourceSetSha256,manifest.sourceSetSha256);assert.equal(f.j.namespace,'poms-r2l-todo42');report.fixtureJournal={file:f.store.file,contentsExported:false};
        report.full107Before=await full107Catalog(f.client);report.catalogBefore=await verifyFullCatalog(f.client);report.base=await f.prepare();checkCancelled();
        if(backend==='rust'){rustAttempted=true;rust=await startActualRust({tag:'todo42-'+tag,expectedBinarySha256:binding.expectedBinarySha256});report.rustRuntime=rust.report;}
        nativeAttempted=true;native=await startOriginalNative({tag:'todo42-'+tag,backend,admittedContexts:contexts,onCommitted:rows=>committed.push(...rows)});report.nativeStart=native.report();report.nativeMetadata=native.metadata;report.startupOrder=backend==='rust'?['Rust9701-ready','original-Native9700-ready-same-rust-database']:['original-Native9700-ready'];save();checkCancelled();
        scope('todo42.bootstrap');const projectId=await f.planProject('todo42.bootstrap'),customerId=randomUUID(),contractId=randomUUID(),orgId=f.base.accounts.find(account=>account.account==='admin').orgId;
        const plan=buildPreparedContractRows({runId,actorId:f.actors.admin,orgId,customerId,projectId,contractId,metadata:native.metadata});priv.bootstrapPlan=plan;report.bootstrapPlan=publicValue({...plan,selectedTables:['customer','project'],unusedDraftContractProjectionNotInserted:true});save();
        for(const row of plan.rows.filter(row=>['customer','project'].includes(row.table))){const actual=await f.insert(row.table,row.values,{caseId:'todo42.bootstrap'});if(row.table==='customer')customer=actual;else project=actual;}
        assert(customer&&project&&project.customer_id===customer.id);report.bootstrapActual=publicValue({customer,project});save();checkCancelled();
        const viewer=new NavigationHttpSession(native.origin,runId);assert.equal((await call(viewer,'todo42.viewer.csrf','GET','/api/auth/csrf-token')).status,200);
        const login=await call(viewer,'todo42.viewer.login','POST','/api/auth/sessions',fixtureCredentials(runId,'viewer'),[['auth_session',{user_id:f.actors.viewer}]]);assert.equal(login.status,200);assert.equal(login.body.authenticated,true);assert.equal(login.body.user.id,f.actors.viewer);assert.deepEqual([...login.body.permissions].sort(),f.j.basePreparationConfig.viewerPermissions);viewer.userId=f.actors.viewer;assert(viewer.cookies.has('poms_session'));
        const consumed=await consumer.runExtraTodoFacts({fixture:f,customer,project,ids,assigneeSession:viewer,otherActorId:f.actors.admin,call,facts,
            retainPrepared:async data=>{priv.prepared.push(data);report.prepared.push(publicValue(data));save();checkCancelled();},
            retainCase:async data=>{const {actualResponse,...observations}=data;const row={...observations,responseBinding:{bytes:actualResponse.bodyBytes.length,sha256:sha(actualResponse.bodyBytes)}};priv.cases.push(row);report.cases.push(publicValue(row));save();checkCancelled();}});
        assert.equal(consumed.cases.length,5);assert.equal(report.requests.length,7);report.consumer=publicValue(consumed);report.result='observed';report.scope='Actual fresh viewer authentication and original Project/Lead/Customer Todo query+mapper consumption only. Seven prepared source facts are not Native business producers; cross-backend strict comparison remains separate.';
    }catch(error){priv.failure=privateValue(error);report.failure={name:error.name,detailsRetainedPrivately:true};report.result=error.name==='Todo42Cancelled'?'cancelled':'partial';if(report.result==='partial')process.exitCode=1;save();}
    finally {
        const close=async(name,fn)=>{try{await fn();report.resourceCloseout.push({name,result:'pass'});return true;}catch(error){priv.closeout.push({name,error:privateValue(error)});report.resourceCloseout.push({name,result:'fail',detailsRetainedPrivately:true});report.result='partial';process.exitCode=1;return false;}};
        if(native)await close('original-SDK-and-Native-SQL-final',async()=>{try{await native.witness.drain();}finally{report.nativeFinal=native.report();report.sql=native.sql;priv.nativeFinal=report.nativeFinal;}native.witness.assertComplete();assert.equal(report.nativeFinal.pgCaptureComplete,true);});
        if(rust)rustClosed=await close('actual-Rust-owner-close',()=>rust.close());if(native)nativeClosed=await close('original-Native-owner-close',()=>native.close());
        const portsFree=await close('actual-listener-ports-free',async()=>{await helpers.todoPortFree(9700);await helpers.todoPortFree(9701);});
        const {writersStopped:stopped}=todoCleanupDecision({portsFree,nativeAttempted,nativeHandle:native,nativeClosed,rustAttempted,rustHandle:rust,rustClosed});report.allWritersProvenStopped=stopped;
        if(!fixtureAttempted&&stopped&&report.result==='cancelled'){report.result='cancelled-before-fixture';report.fixtureNeverOpened=true;}
        if(f){await close('all42-owned-final-facts',async()=>{priv.finalFacts=await facts();report.finalFacts=publicValue(priv.finalFacts);save();});
            const resolved=!f.j.intents.some(x=>!['adopted','absent'].includes(x.state))&&f.j.directCreates.every(x=>['promoted','absent','rolled-back'].includes(x.state))&&f.j.mutations.every(x=>['committed','recovered-committed','rolled-back'].includes(x.state));
            if(todoCleanupDecision({portsFree,nativeAttempted,nativeHandle:native,nativeClosed,rustAttempted,rustHandle:rust,rustClosed,resolved,fixtureState:f.j.state,result:report.result}).mayCleanup)await close('full107-exact-owned-cleanup-double-zero',async()=>{
                helpers.verifyTodoSource20();helpers.verifyTodoRuntimeCapture(report.runtimeInput,manifest);if(backend==='rust')helpers.todoRustBuildBinding(buildTag);
                const others=await f.client.query('SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND pid<>pg_backend_pid()');assert.equal(others.rows.length,0,'An app writer remains connected after actual owner close');
                report.preCleanup=await f.preflight();report.ownedBeforeCleanup=f.j.objects.length;for(let i=0;i<2;i++){report.cleanup.push(await f.cleanup());save();}assert.equal(report.cleanup[0].deleted,report.ownedBeforeCleanup);assert.equal(report.cleanup[1].deleted,0);report.doubleZero=true;
                report.full107After=await full107Catalog(f.client);assert.deepEqual(report.full107After,report.full107Before);report.catalogAfter=await verifyFullCatalog(f.client);helpers.verifyTodoSource20();helpers.verifyTodoRuntimeCapture(report.runtimeInput,manifest);if(report.result==='cancelled')report.result='cancelled-cleaned';
            });
            else report.cleanupPending='Preserve partial/unknown startup, unresolved intents or commit outcomes; no guessed adoption/deletion or claimed double zero.';
            await close('fixture-connection-close',()=>f.close());
        }
        process.off('SIGTERM',signal);process.off('SIGINT',signal);report.finishedAt=new Date().toISOString();priv.state=report.result;save();const raw=fs.readFileSync(privateFile);report.privateReceipt={file:privateFile,bytes:raw.length,sha256:sha(raw),contentsExported:false};fs.writeFileSync(output,JSON.stringify(publicValue(report),null,2)+'\n');
        console.log(JSON.stringify({file:output,result:report.result,HTTPRequests:report.requests.length,consumerCases:report.cases.length,doubleZero:report.doubleZero===true}));
    }
    return report;
}
