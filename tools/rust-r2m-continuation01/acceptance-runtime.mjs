// Actual Root entry. Only an explicit --run invocation opens the new R2M
// private/DB/HTTP environment. Import and --check never open those resources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SourceReader,verifySourceCap} from './acceptance-source.mjs';
import {runAcceptance,runProbeMatrix} from './acceptance.mjs';
import {buildScenarioPlans,buildSurfaceProbes,buildUriProbes,caseNames,settingKey,settingLeaseScope,uploadInput} from './scenario-input.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..');
const LINUX_ROOT='/home/wangzishi/projects/poms-rust-r2m';
const PRIVATE='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonHash=value=>sha(Buffer.from(JSON.stringify(value)));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_HEADER=/^(?:cookie|set-cookie|authorization)$/i;
const shapeRow=row=>({...row,...Object.fromEntries(Object.entries(row).filter(([key])=>key.includes('_')).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value]))});

export function actualSurfaceBindings(viewerId,makeId=randomUUID){
    assert(UUID.test(viewerId),'Canonical owned viewer UUID required');
    return{id:viewerId,targetId:makeId(),linkId:makeId(),sourceId:makeId(),identityProviderId:makeId(),targetType:'project',key:settingKey};
}

export function restoreRetainedExpiredCookieSnapshot(handle,snapshot,row,{now=Date.now()}={}){
    assert(snapshot?.kind==='r2m-owned-backend-issued-expired-cookie-snapshot'&&UUID.test(snapshot.rowId)&&UUID.test(snapshot.userId)&&/^[0-9a-f]{64}$/.test(snapshot.tokenHash)&&/^[0-9a-f]{64}$/.test(snapshot.creationProofSha256),'Actual owned issued-session snapshot required');
    assert(row&&row.id===snapshot.rowId&&row.user_id===snapshot.userId&&row.token_hash===snapshot.tokenHash,'Cookie replay must select the exact already-owned session');
    assert(['active','expired'].includes(row.status)&&row.revoked_reason===null,'Retained expired session cannot be replaced with a revoked condition');
    assert(Number.isFinite(now)&&[row.idle_expires_at,row.absolute_expires_at].some(value=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=now),'Actual retained session expiry must remain in the past');
    const cookies=new Map(snapshot.cookies);assert.equal(sha(Buffer.from(cookies.get('poms_session')??'')),snapshot.tokenHash,'Replay cookie differs from actual backend-issued token');
    handle.cookies=cookies;
    return{kind:'r2m-retained-expired-URI-condition',sessionId:row.id,userId:row.user_id,tokenHash:snapshot.tokenHash,creationProofSha256:snapshot.creationProofSha256,issuedBackend:snapshot.issuedBackend,sourceCapId:snapshot.sourceCapId,status:row.status,idleExpiresAt:row.idle_expires_at,absoluteExpiresAt:row.absolute_expires_at,observedAt:new Date(now).toISOString(),databaseStateReset:false};
}

export class AcceptanceHttpSession {
    constructor({runId,userId=null}){assert(UUID.test(runId));this.runId=runId;this.userId=userId;this.cookies=new Map()}
    async request({executionBackend,method,path:requestPath,body,headers={},csrf,contentType,requestId,correlationId}){
        assert(['nest','rust'].includes(executionBackend)&&/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method));
        assert(typeof requestPath==='string'&&requestPath.startsWith('/api')&&!/[\r\n\0\\#]/.test(requestPath));
        const port=executionBackend==='rust'?10071:10070;
        const outgoing={host:'127.0.0.1:'+port,'user-agent':'poms-r2m-fixture/'+this.runId,'x-forwarded-for':'192.0.2.25','x-request-id':requestId,'x-correlation-id':correlationId,connection:'close'};
        for(const[key,value]of Object.entries(headers)){assert(!SECRET_HEADER.test(key),'Caller cannot supply credential headers');http.validateHeaderValue(key,value);outgoing[key]=value}
        if(this.cookies.size)outgoing.cookie=[...this.cookies].map(([key,value])=>key+'='+value).join('; ');
        if(!['GET','HEAD','OPTIONS'].includes(method)&&csrf!==false&&this.cookies.has('poms_csrf'))outgoing['x-csrf-token']=typeof csrf==='string'?csrf:this.cookies.get('poms_csrf');
        let payload;if(body!==undefined){payload=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));outgoing['content-type']=contentType??(Buffer.isBuffer(body)?'application/octet-stream':'application/json');outgoing['content-length']=String(payload.length)}
        const startedAt=new Date().toISOString(),sentSessionTokenSha256=this.cookies.has('poms_session')?sha(Buffer.from(this.cookies.get('poms_session'))):null;
        const result=await new Promise((resolve,reject)=>{
            const req=http.request({hostname:'127.0.0.1',port,path:requestPath,method,headers:outgoing},res=>{
                const chunks=[];let bytes=0,done=false;
                const finish=complete=>{if(done)return;done=true;const raw=Buffer.concat(chunks),type=String(res.headers['content-type']??'');let parsed=raw.length?raw.toString('utf8'):null,parseError=null;if(raw.length&&type.includes('application/json'))try{parsed=JSON.parse(raw.toString('utf8'))}catch{parseError='invalid-json'}resolve({status:res.statusCode,body:parsed,bodyBytes:raw,bodyBytesSha256:sha(raw),bodyBytesLength:raw.length,headers:res.headers,setCookie:res.headers['set-cookie']??[],executionBackend,transportComplete:complete,parseError,sentSessionTokenSha256,window:{startedAt,finishedAt:new Date().toISOString()}})};
                res.on('data',chunk=>{bytes+=chunk.length;if(bytes>32*1024*1024){req.destroy();return}chunks.push(chunk)});res.on('end',()=>finish(true));res.on('aborted',()=>finish(false));res.on('error',()=>finish(false));
            });req.setTimeout(25000,()=>req.destroy());req.on('error',()=>reject(new Error('R2M-owned-transport-failed')));req.end(payload);
        });
        for(const cookie of result.setCookie){const pair=cookie.split(';',1)[0],at=pair.indexOf('=');if(at>0){const name=pair.slice(0,at),value=pair.slice(at+1);if(value)this.cookies.set(name,value);else this.cookies.delete(name)}}
        return result;
    }
}

function publicInput(file){
    assert(typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(item=>['..','private','.env'].includes(item)));
    assert(file.startsWith('tmp/rust-r2m-continuation01/')||file.startsWith('docs/design/rust-r2m/'),'Only named public R2M JSON inputs');
    const absolute=path.resolve(ROOT,file);let current=ROOT;for(const part of path.relative(ROOT,absolute).split(path.sep)){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}assert(fs.statSync(absolute).isFile());return JSON.parse(fs.readFileSync(absolute,'utf8'));
}
function privateRecorder(backend,runId){
    const root=PRIVATE+'/acceptance-runs';for(const directory of[PRIVATE,root,root+'/'+backend+'-'+runId]){if(directory!==PRIVATE&&!fs.existsSync(directory))fs.mkdirSync(directory,{mode:0o700});const stat=fs.lstatSync(directory);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0)}
    const directory=root+'/'+backend+'-'+runId;let index=0;
    return async function retain({kind,record,...metadata}){const file=directory+'/'+String(index++).padStart(5,'0')+'.json';const bytes=Buffer.from(JSON.stringify({kind,...metadata,record})+'\n'),fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}return{file,bytes:bytes.length,rawBytesSha256:sha(bytes),private:true}};
}

export function actualSourceCase(logical){assert.equal(typeof logical,'string','Explicit source case label required');logical=logical.toLowerCase();let value;if(logical===settingLeaseScope)value=logical;else if(/^m4\./.test(logical))value='m4.integration';else if(/^m5\./.test(logical))value='m5.integration';else{const found=/^(m[1-5]\.\d)/.exec(logical);value=found?found[1]:logical}assert(/^[a-z][a-z0-9_.-]{0,79}$/.test(value),'Source case must satisfy the fixture case identity');return value}

export function preflightProbeScopes(input){const viewerId='10000000-0000-4000-8000-000000000001',surface=buildSurfaceProbes(input,{surface:actualSurfaceBindings(viewerId)}),uri=buildUriProbes({userId:viewerId});assert.equal(surface.length,115);assert.equal(uri.length,27);for(const cells of[surface,uri]){const labels=cells.map(step=>actualSourceCase('m0.'+step.id));assert.equal(new Set(labels).size,cells.length,'Probe source case labels must remain unique')}return{surfaceBindingsChecked:surface.length,uriScopesChecked:uri.length}}

export function uriProbeRequiresAnonymousScope({caseId,purpose}){return purpose==='uri-order'&&actualSourceCase(caseId).startsWith('m0.uri.')}

export async function createAcceptanceRuntime({backend,tag,candidate,sourceCap,input,runId:requestedRunId=null,settingAdmission=null,extensions={}}){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),LINUX_ROOT);assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,25}$/.test(tag));
    verifySourceCap(sourceCap,{candidate});const reader=new SourceReader({root:ROOT,pins:sourceCap.files,sourceEpoch:sourceCap.id});for(const row of sourceCap.files)reader.read(row.file);
    preflightProbeScopes(input);
    const [{Fixture},{startOriginalNative},{startActualRust},{authority},{identities,digest},{fixtureCredentials},{marker,databaseFor}]=await Promise.all([
        import('./fixture.mjs'),import('./native-app.mjs'),import('./rust-app.mjs'),import('./catalog-complete.mjs'),import('./fixture-core.mjs'),import('./fixture-credentials.mjs'),import('./fixture-guard.mjs')
    ]);
    const {installPgCreateObserver}=await import('./pg-create-observer.mjs');
    const runId=requestedRunId??settingAdmission?.runId??randomUUID();assert(UUID.test(runId),'Exact new run UUID required');
    const retain=privateRecorder(backend,runId),fixture=await Fixture.open(backend,runId),contexts=new Map(),committed=[],sessionMap=new Map(),requests=[],faultRestores=[];
    assert(fixture.j.state==='planned'&&fixture.j.base===null,'New actual entry cannot silently reuse an old/partial run journal');
    let native,rust,pg,index=0,closed=false,globalBaseline,metadata,retainedExpiredCookies=null;
    const scopes=new Map(),sourceFile='tools/rust-r2m-continuation01/native-write-witness.mjs';
    function scope(caseId,{anonymous=false,projects=[]}={}){caseId=actualSourceCase(caseId);if(scopes.has(caseId))return scopes.get(caseId);const current=fixture.j.cases.find(item=>item.caseId===caseId);if(current){scopes.set(caseId,current);return current}const actual=fixture.defineCase(caseId,{actors:Object.values(fixture.actors),projects,borrowedActors:['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014'],borrowedDefinitions:fixture.j.borrowed.definitions.map(item=>item.id),anonymous});scopes.set(caseId,actual);return actual}
    function session(name){if(!sessionMap.has(name))sessionMap.set(name,new AcceptanceHttpSession({runId,userId:fixture.actors[name]??(name==='approver'?'00000000-0000-4000-8000-000000000008':name==='finance'?'00000000-0000-4000-8000-000000000014':null)}));return sessionMap.get(name)}
    function nativeAuthority(){return fixture.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:databaseFor(backend),marker,source:{file:sourceFile,sha256:sha(fs.readFileSync(path.join(ROOT,sourceFile)))},trace:native.witness.snapshot()})}
    async function ensureIntent(table,selector,caseId,expectedMax=64){const present=fixture.j.intents.filter(item=>item.caseId===caseId&&item.table===table&&item.state==='planned');if(present.length){assert.equal(present.length,1,'One planned actual create selector per table/request');return present[0]}return fixture.intent(table,selector,{caseId,expectedMax})}
    async function autoIntents(request,active){
        await ensureIntent('audit_log',{request_id:active.requestId},active.caseId);await ensureIntent('security_event',{request_id:active.requestId},active.caseId);
        if(request.method==='POST'&&request.path==='/api/auth/sessions'){const account=Object.keys(fixture.actors).find(name=>fixtureCredentials(runId,name).username===request.body?.username);const userId=account?fixture.actors[account]:request.body?.username==='vp_owner'?'00000000-0000-4000-8000-000000000008':request.body?.username==='finance_mgr'?'00000000-0000-4000-8000-000000000014':null;if(userId)await ensureIntent('auth_session',{user_id:userId},active.caseId)}
        const role=/^\/api\/platform\/roles\/([0-9a-f-]{36})\/permissions$/.exec(request.path);if(role&&request.method==='PUT')await ensureIntent('role_permission_assignment',{role_id:role[1]},active.caseId,64);
        const member=/^\/api\/platform\/users\/([0-9a-f-]{36})\/org-memberships$/.exec(request.path);if(member&&request.method==='PUT')await ensureIntent('user_org_membership',{user_id:member[1]},active.caseId,64);
        const assigned=/^\/api\/platform\/users\/([0-9a-f-]{36})\/roles$/.exec(request.path);if(assigned&&request.method==='PUT')await ensureIntent('user_role_assignment',{user_id:assigned[1]},active.caseId,64);
    }
    async function certifyActual({from,caseId,executionBackend,pgRows=[]}){
        await native.witness.drain();native.witness.assertComplete();const actual=committed.slice(from),intents=fixture.j.intents.filter(item=>item.caseId===caseId&&item.state==='planned');
        if(executionBackend==='rust')assert.equal(actual.length,0,'Rust request cannot be certified by Native SDK');
        if(actual.length){const authorityId=fixture.registerNativeAuthority(nativeAuthority());const rows=actual.map(item=>{const matching=intents.filter(intent=>intent.table===item.table);assert.equal(matching.length,1,'Actual SDK INSERT lacks one reviewed immutable intent');return fixture.creationEnvelope({...item,authorityId,intentId:matching[0].id})});fixture.recordCommittedCreates(rows)}
        if(executionBackend==='rust'&&pgRows.length)fixture.recordCommittedCreates(pgRows.map(item=>fixture.creationEnvelope(item)));
        if(executionBackend==='nest'&&pgRows.length)assert(pgRows.every(item=>actual.some(row=>row.table===item.table&&row.id===item.id)),'PG shadow has no actual SDK INSERT');
        await fixture.resolveNoCreates(caseId);await fixture.adoptIntents();return{sdk:actual.length,pg:pgRows.length};
    }
    async function perform(request){
        const handle=session(request.session??'admin'),active=scope(request.caseId,{anonymous:handle.userId===null||uriProbeRequiresAnonymousScope(request)});let sessionCondition=null;
        if(request.session==='retained-expired'&&request.purpose==='uri-order'){
            assert(retainedExpiredCookies,'Actual retained expired session must already be issued and owned');const owned=fixture.j.objects.find(item=>item.table==='auth_session'&&item.id===retainedExpiredCookies.rowId);assert(owned&&digest(owned.creationProof)===retainedExpiredCookies.creationProofSha256,'Retained session must keep its original actual creation proof');
            const found=await fixture.client.query('select * from poms.auth_session where id=$1::uuid',[owned.id]);assert.equal(found.rows.length,1,'Actual retained expired session row must remain present');sessionCondition=restoreRetainedExpiredCookieSnapshot(handle,retainedExpiredCookies,found.rows[0]);
            await retain({kind:'URI-retained-expired-cookie-replay-preflight',caseId:active.caseId,record:{method:request.method,path:request.path,condition:sessionCondition,actualFullSessionRow:found.rows[0],httpResponseObserved:false}});
        }
        await autoIntents(request,active);
        const context={runId,caseId:active.caseId,index:index++,op:request.executionBackend==='nest'&&backend==='rust'?'m.producer':'m.http'},correlationId='m-'+randomUUID();contexts.set(correlationId,context);
        const from=committed.length;let response,pgRows=[];
        // PG observer uses the exact immutable (sourceCase,index) token.
        await pg.beginCase(context);
        try{response=await handle.request({...request,requestId:active.requestId,correlationId});await retain({kind:'actual-raw-HTTP-response-before-write-certification',record:{index:context.index,context,method:request.method,path:request.path,executionBackend:request.executionBackend,sessionCondition,response}});assert.equal(response.parseError,null,'Actual JSON parsing failed');if(sessionCondition)assert.equal(response.sentSessionTokenSha256,sessionCondition.tokenHash,'Actual sent cookie hash must equal the exact expired session')}
        finally{await native.witness.drain();native.witness.assertComplete();pgRows=await pg.drainCase();await certifyActual({from,caseId:active.caseId,executionBackend:request.executionBackend,pgRows})}
        if(active.caseId===settingLeaseScope&&['GET','PATCH'].includes(request.method)&&request.path==='/api/platform/system-settings/'+settingKey){await fixture.recordBaselineSettingAfter({namespace:'poms-r2m',marker,runId,backend,caseId:active.caseId,requestId:active.requestId,method:request.method,path:request.path,status:response.status,completed:response.transportComplete,requestSha256:jsonHash(request.body??null),responseSha256:response.bodyBytesSha256,logicalCase:request.logicalCase??request.caseId,stepId:request.stepId??null})}
        const record={kind:'actual-fixed-dispatch-request',index:context.index,context,method:request.method,path:request.path,executionBackend:request.executionBackend,sessionCondition,response};requests.push(record);await retain({kind:'actual-request-private-cookies-body-and-SDK-PG',record});return response;
    }
    function currentAdmissions(){const ledgerDigest=digest(fixture.j);return fixture.j.objects.map(item=>({kind:'r2m-fixture-admission',runId,sourceCapId:sourceCap.id,table:item.table,identity:item.identity,slot:item.caseId+'.'+item.table+'.'+fixture.j.objects.filter(other=>other.caseId===item.caseId&&other.table===item.table).findIndex(other=>other.id===item.id),ledgerDigest,certificateSha256:digest({creationProof:item.creationProof,postcondition:item.postcondition})}))}
    function projectedFacts(raw,tables){
        const ownedKeys=new Set(fixture.j.objects.map(item=>item.table+':'+item.id)),lease=fixture.j.baselineSettingLease;
        const additional=(table,row)=>{const allowed=extensions.additionalRowIsScoped?.(table,row)===true;if(allowed)assert.equal(table,'business_number_sequence','Only Root exact number-lease composite rows may extend the projection');return allowed};
        const outsideChanges=[];
        for(const item of raw.tables){const baseline=globalBaseline.tables.find(row=>row.table===item.table);const outside=rows=>rows.filter(row=>!ownedKeys.has(item.table+':'+row.id)&&!(item.table==='system_setting'&&lease&&row.key===settingKey)&&!additional(item.table,row));if(digest(outside(item.rows))!==digest(outside(baseline.rows)))outsideChanges.push({table:item.table,kind:'unexpected-complete-row-change'})}
        const rows={},columns={},primaryKeys={};for(const table of tables){const entry=raw.tables.find(item=>item.table===table),definition=authority.tables.find(item=>item.name===table);assert(entry&&definition);rows[table]=entry.rows.filter(row=>ownedKeys.has(table+':'+row.id)||table==='system_setting'&&lease&&row.key===settingKey||additional(table,row));columns[table]=definition.columns.map(item=>item.name);primaryKeys[table]=definition.primaryKey.columns}
        return{readOnly:true,complete:true,catalogDigest:digest(raw.catalog),columns,primaryKeys,rows,outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:outsideChanges},privateSnapshotDigest:digest(raw)};
    }
    async function bootstrap(name,credentials,userId){const target=session(name);target.userId=userId;const active=scope('m.bootstrap.'+name,{anonymous:false});const a=await perform({executionBackend:backend,method:'GET',path:'/api/auth/csrf-token',session:name,caseId:active.caseId,purpose:'business'});assert.equal(a.status,200);const b=await perform({executionBackend:backend,method:'POST',path:'/api/auth/sessions',body:credentials,session:name,caseId:active.caseId,purpose:'business'});assert.equal(b.status,200);assert.equal(b.body.user.id,userId);return b.body.user}
    try{
        globalBaseline=await fixture.facts();await retain({kind:'global-before-prepare-full107',record:globalBaseline});await fixture.prepare();await fixture.borrowSeedPrincipals();await fixture.borrowCanonicalDefinitions();await fixture.planObjectPrefix();
        pg=await installPgCreateObserver(fixture);await fixture.registerPgObserver(fixture.creationEnvelope(pg.receipt()));
        if(backend==='rust')rust=await startActualRust({tag,expectedBinarySha256:sourceCap.artifacts.find(item=>item.kind==='rust-release').rawBytesSha256});
        native=await startOriginalNative({tag,backend,admittedContexts:contexts,onCommitted:rows=>committed.push(...rows)});metadata=native.metadata;
        const credentials={admin:fixtureCredentials(runId,'admin'),viewer:fixtureCredentials(runId,'viewer')},profiles={};
        profiles.admin=await bootstrap('admin',credentials.admin,fixture.actors.admin);profiles.viewer=await bootstrap('viewer',credentials.viewer,fixture.actors.viewer);
        session('owned-valid').cookies=new Map(session('viewer').cookies);session('owned-valid').userId=fixture.actors.viewer;
        await bootstrap('retained-expired',credentials.viewer,fixture.actors.viewer);const expiredHandle=session('retained-expired'),token=expiredHandle.cookies.get('poms_session');const target=fixture.j.objects.find(item=>item.table==='auth_session'&&item.identity.token_hash===sha(Buffer.from(token)));assert(target);await fixture.updateOwned('auth_session',target.id,{idle_expires_at:new Date(Date.now()-1000).toISOString()},'R2M explicit retained-expired URI session only');
        retainedExpiredCookies=Object.freeze({kind:'r2m-owned-backend-issued-expired-cookie-snapshot',rowId:target.id,userId:fixture.actors.viewer,tokenHash:sha(Buffer.from(token)),creationProofSha256:digest(target.creationProof),issuedBackend:backend,sourceCapId:sourceCap.id,cookies:Object.freeze([...expiredHandle.cookies].map(pair=>Object.freeze([...pair])))});
        const base=fixture.base,bindings={runId,actors:fixture.actors,roles:Object.fromEntries(base.accounts.map(item=>[item.account,item.roleId])),orgs:Object.fromEntries(base.accounts.map(item=>[item.account,item.orgId])),profile:profiles,credentials,missingId:randomUUID(),surface:actualSurfaceBindings(fixture.actors.viewer),probeTables:fixture.supportedTables,sourceCapId:sourceCap.id};
        if(settingAdmission){scope(settingLeaseScope);assert(settingAdmission.runId===runId,'Root admission must name this exact new run');await fixture.admitBaselineSetting(settingAdmission,{caseId:settingLeaseScope})}
        const deps={
            async request(request){return perform(request)},
            async facts({caseId,tables}){const raw=await fixture.facts();await retain({kind:'complete-full107-private-facts',caseId,record:raw});return projectedFacts(raw,tables)},
            async prepare(options){
                const caseId=actualSourceCase(options.caseId);const active=scope(caseId,{anonymous:options.step?.session==='anonymous'||options.step?.session==='absent'||uriProbeRequiresAnonymousScope({caseId,purpose:options.step?.purpose})});
                if(options.phase==='bindings-only'){
                    const names=caseNames(runId,options.caseId),fresh={runId,actorId:fixture.actors.admin,orgId:base.accounts.find(item=>item.account==='admin').orgId,customerId:randomUUID(),projectId:randomUUID(),contractId:randomUUID(),numbers:{customerNo:'M-CUST-'+runId+'-'+options.caseId,projectNo:'M-PRJ-'+runId+'-'+options.caseId,contractNo:'M-CON-'+runId+'-'+options.caseId}};
                    return{sourceCapId:sourceCap.id,businessProducerRequests:0,businessRowsInserted:0,metadata,bindings:{names,prepared:{...(options.bindings.prepared??{}),contractInput:fresh},inputs:{...(options.bindings.inputs??{}),routeDenied:{path:'/platform/users',returnUrl:'/dashboard',requiredPermissions:['platform:users:manage']}}}};
                }
                if(options.phase==='step-scope-only')return{...active,sourceCapId:sourceCap.id,businessProducerRequests:0,businessRowsInserted:0};
                if(options.phase==='baseline-setting-lease'){assert(settingAdmission&&fixture.j.baselineSettingLease,'Reviewed exact setting admission required');return{sourceCapId:sourceCap.id,key:settingKey,owned:false,deleteAllowed:false,environmentBaselineSettingAdmission:{approved:true,rawBytesSha256:digest(settingAdmission)}}}
                if(options.phase==='exact-owned-mutation'){
                    if(options.operation==='expire-owned-session'){const handle=session(options.input.session),token=handle.cookies.get('poms_session');assert(token);const row=fixture.j.objects.find(item=>item.table==='auth_session'&&item.identity.token_hash===sha(Buffer.from(token)));assert(row);await fixture.updateOwned('auth_session',row.id,{idle_expires_at:new Date(Date.now()+options.input.idleOffsetMs).toISOString()},'R2M named exact owned-session expiry')}
                    else if(options.operation==='update-owned-fields'){await fixture.updateOwned(options.input.table,options.input.id,options.input.values,'R2M named source-prepared consumption mutation')}
                    else assert.fail('Undefined bounded fixture mutation');return{sourceCapId:sourceCap.id,exactOwnedIdentity:true};
                }
                if(options.phase==='insert-exact-source-plan'){
                    const prepared=options.sourcePlan.plan;let inserted;
                    if(options.sourcePlan.sourceKind==='commission')inserted=await fixture.insertPreparedBatch(prepared,{caseId});
                    else if(options.sourcePlan.sourceKind==='handover'){assert.equal(typeof fixture.insertHandoverPreparedBatch,'function','A reviewed narrow handover cohort entry required');inserted=await fixture.insertHandoverPreparedBatch(prepared,{caseId})}
                    else{inserted=[];for(const item of prepared.rows)inserted.push(await fixture.insert(item.table,item.values,{caseId}))}
                    const output={};for(const[table,slot]of Object.entries(options.sourcePlan.bindPrepared??{})){const matches=inserted.filter(row=>prepared.rows?.some(item=>item.table===table&&item.values.id===row.id));assert.equal(matches.length,1);output[slot]=shapeRow(matches[0])}
                    return{sourceCapId:sourceCap.id,preparedSource:true,nativeProducerClaimed:false,bindings:output};
                }
                assert.fail('Undefined Root preparation phase');
            },
            async certify({caseId}){const raw=await fixture.facts();assert.equal(raw.unknownCreates,0);assert.equal(raw.unknownMutations,0);const registeredRows=currentAdmissions();return{complete:true,traceComplete:true,caseId,runId,sourceCapId:sourceCap.id,registeredRows,ledgerDigest:digest(fixture.j),creationCertificates:fixture.j.committedCreates,mutationCertificates:fixture.j.mutations,unknownCreates:[],unknownMutations:[]}},
            async internal(options){assert.equal(typeof extensions.internal,'function','Root reviewed actual internal probe extension required');return extensions.internal({...options,fixture,native,rust,pg,perform,retain})},
            async supplier(options){assert.equal(typeof extensions.supplier,'function','Root reviewed actual supplier extension required');return extensions.supplier({...options,fixture,native,rust,pg,perform,retain})},
            async finishCase({caseId}){const viewer=fixture.j.objects.find(item=>item.table==='platform_user'&&item.id===fixture.actors.viewer);if(viewer){const found=await fixture.client.query('select is_active from poms.platform_user where id=$1::uuid',[viewer.id]);if(found.rows[0]?.is_active===false)await fixture.updateOwned('platform_user',viewer.id,{is_active:true},'R2M exact owned viewer restoration after deactivation case')}
                for(const name of['admin','viewer'])if(!session(name).cookies.has('poms_session'))await bootstrap(name,credentials[name],fixture.actors[name]);return{caseId,requiredFaultsRestored:faultRestores.length===0,noUnknownCaseWriter:true}},
        };
        // The generic observation layer deliberately publishes fixed failure
        // categories. Preserve the precise original I/O failure here first,
        // exclusively in this new run's private evidence directory.
        for(const[name,operation]of Object.entries(deps))deps[name]=async(...args)=>{
            try{return await operation(...args)}
            catch(error){await retain({kind:'private-runtime-dependency-failure',dependency:name,caseId:args[0]?.caseId??null,record:{name:error.name,message:error.message,stack:error.stack}});throw new Error('R2M-reviewed-I/O-dependency-failed')}
        };
        return{fixture,bindings,deps,reader,retain,requests,sourceCapId:sourceCap.id,async close({allowCleanup=false}={}){if(closed)return;closed=true;const receipt={kind:'r2m-actual-runtime-closeout',runId,backend,sourceCapId:sourceCap.id,writers:[],cleanup:[],result:'partial-preserved'};let stopped=true;for(const[name,owner]of[['rust',rust],['native',native]])if(owner)try{await owner.close();receipt.writers.push({kind:name,identity:name==='rust'?String(owner.report.processIdentity.pid):String(process.pid)+':native-app',stopped:true})}catch{stopped=false;receipt.writers.push({kind:name,stopped:false})}
            let restored=false;try{receipt.pg=await pg.restore();restored=true}catch{stopped=false}
            if(stopped&&restored&&extensions.beforeDrainClose)try{const extra=await extensions.beforeDrainClose({fixture,native,rust,pg,retain});assert(extra&&extra.activeRequests===0&&extra.pendingTransactions===0&&Array.isArray(extra.writers)&&extra.writers.every(item=>item.stopped===true),'Actual extension writer drain required');receipt.extensionClose=extra;receipt.writers.push(...extra.writers)}catch(error){await retain({kind:'private-extension-close-failure',record:{name:error.name,message:error.message,stack:error.stack}});stopped=false}
            if(stopped&&restored&&allowCleanup){try{fixture.drain({namespace:'poms-r2m',runId,backend,marker,activeRequests:0,pendingTransactions:0,observersRestored:true,writers:receipt.writers,sourceCapsuleSha256:sourceCap.manifestSha256});if(extensions.afterDrainRestore)receipt.extensionsRestore=await extensions.afterDrainRestore({fixture,retain});if(fixture.j.baselineSettingLease)receipt.setting=await fixture.restoreBaselineSetting();receipt.cleanup.push(await fixture.cleanup());receipt.cleanup.push(await fixture.cleanup());assert.equal(receipt.cleanup[1].deleted,0);assert.equal(receipt.cleanup[1].objects.changed,0);receipt.result='owned-double-zero-recorded'}catch(error){await retain({kind:'private-cleanup-failure',record:{name:error.name,message:error.message,stack:error.stack}});receipt.result='cleanup-incomplete-preserved'}}
            await retain({kind:'actual-runtime-closeout',record:receipt});await fixture.close();try{reader.assertUnchanged()}catch{receipt.result='source-changed-preserved'}return receipt;}};
    }catch(error){
        const failures=[];
        const retainFailure=async(stage,actual)=>{try{const receipt=await retain({kind:'private-runtime-prepare-failure',stage,record:{name:actual.name,message:actual.message,stack:actual.stack}});failures.push({stage,receipt})}catch{failures.push({stage,privateWriteFailed:true})}};
        await retainFailure('original-prepare',error);
        // Every owned resource gets its own close attempt. A failed earlier
        // owner must not prevent later owners/observer/client from draining.
        for(const[name,resource,operation]of[['rust',rust,'close'],['native',native,'close'],['pg-observer',pg,'restore']])if(resource)try{await resource[operation]()}catch(closeError){await retainFailure(name+'-close',closeError)}
        try{await fixture.close()}catch(closeError){await retainFailure('fixture-client-close',closeError)}
        throw Object.assign(new Error('R2M-runtime-preparation-failed'),{runId,journalFile:fixture.store.file,privateFailureReceipts:failures});
    }
}

export function runtimePlan({mode,selection=[]}){assert(['surface','uri','api'].includes(mode));return{kind:'r2m-runtime-plan-not-executed',mode,selection,requiredModules:['fixture.mjs','native-app.mjs','rust-app.mjs','pg-create-observer.mjs'],actualExecution:false};}

async function cli(){
    const args=process.argv.slice(2),values={};for(let at=0;at<args.length;at++){const key=args[at];assert(/^--(?:run|check|backend|tag|cap|mode|selection|setting-admission)$/.test(key),'Unknown argument');if(['--run','--check'].includes(key))values[key]=true;else values[key]=args[++at]}
    assert(Boolean(values['--run'])!==Boolean(values['--check']),'Choose explicit --check or --run');
    const mode=values['--mode']??'surface',selection=(values['--selection']??'').split(',').filter(Boolean);runtimePlan({mode,selection});
    const cap=publicInput(values['--cap']),input=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/design/rust-r2m/acceptance-input.json'),'utf8'));verifySourceCap(cap,{candidate:cap.candidate});
    if(values['--check']){const reader=new SourceReader({root:ROOT,pins:cap.files,sourceEpoch:cap.id});for(const row of cap.files)reader.read(row.file);buildScenarioPlans(input);const probes=preflightProbeScopes(input);const checked=reader.assertUnchanged();console.log(JSON.stringify({result:'SourceReady-input-check',...runtimePlan({mode,selection}),...probes,source:{sourceEpoch:checked.sourceEpoch,digest:checked.digest,files:checked.files.length}}));return}
    assert(mode!=='api'||selection.length>0,'Actual API subset must be explicit until full20 source is integrated');
    const backend=values['--backend'],tag=values['--tag'];assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,25}$/.test(tag??''),'Fixed backend/tag required');const output=path.join(ROOT,'tmp/rust-r2m-continuation01/acceptance-'+backend+'-'+tag+'.json');assert(!fs.existsSync(output),'Never overwrite an earlier actual receipt');
    const settingAdmission=values['--setting-admission']?publicInput(values['--setting-admission']):null,runId=settingAdmission?.runId??randomUUID();assert(UUID.test(runId));
    let runtime,record={kind:'Root-R2M-actual-acceptance-subset',mode,backend,tag,runId,result:'partial-preserved',G3Certified:false,G4Certified:false};
    try{let extensions={};if(mode==='api'&&selection.some(id=>id==='M2.4'||id==='M3.4'||/^M[45]\./.test(id))){const preflight=new SourceReader({root:ROOT,pins:cap.files,sourceEpoch:cap.id});for(const file of cap.files)preflight.read(file.file);const{createAcceptanceExtensions}=await import('./acceptance-extensions.mjs');extensions=await createAcceptanceExtensions({backend,tag,sourceCap:cap})}runtime=await createAcceptanceRuntime({backend,tag,runId,candidate:cap.candidate,sourceCap:cap,input,settingAdmission,extensions});const options={backend,candidate:cap.candidate,sourceCap:cap,input,fixture:runtime.fixture,bindings:runtime.bindings,deps:runtime.deps,retain:runtime.retain,sourceReader:runtime.reader,spec:runtime.reader.json('libs/shared/api-spec/openapi.json')};const observed=mode==='api'?await runAcceptance({...options,selection}):await runProbeMatrix({...options,kind:mode});record.observation=observed.report;record.result=observed.report.result==='observed'?'observed-comparison-pending':'partial-preserved'}catch(error){record.failure={category:'actual-wrapper-or-required-proof-failed',rawErrorIncluded:false};try{const directory=PRIVATE+'/acceptance-runs/'+backend+'-'+runId;for(const part of[PRIVATE,PRIVATE+'/acceptance-runs',directory]){if(part!==PRIVATE&&!fs.existsSync(part))fs.mkdirSync(part,{mode:0o700});const stat=fs.lstatSync(part);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0)}const file=directory+'/entry-failure-'+randomUUID()+'.json',bytes=Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack})+'\n'),fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}record.failure.privateEvidence={file,bytes:bytes.length,rawBytesSha256:sha(bytes)}}catch{record.failure.privateEvidenceWriteFailed=true}process.exitCode=1}
    finally{if(runtime){try{record.closeout=await runtime.close({allowCleanup:record.result==='observed-comparison-pending'});if(record.closeout.result!=='owned-double-zero-recorded')process.exitCode=1}catch{record.closeout={result:'closeout-incomplete-preserved'};process.exitCode=1}}const journal=PRIVATE+'/m-runs/'+backend+'-'+runId+'.json';if(fs.existsSync(journal)){const stat=fs.lstatSync(journal);assert(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0);const raw=fs.readFileSync(journal);record.recovery={runId,file:journal,bytes:raw.length,rawBytesSha256:sha(raw),contentsExported:false}}else record.recovery={runId,file:journal,exists:false,contentsExported:false};fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:path.relative(ROOT,output),result:record.result,runId,recovery:record.recovery,sourceCapId:cap.id,closeout:record.closeout?.result??'not-opened',G3Certified:false}))}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(()=>{process.exitCode=1;console.error('{"kind":"R2M-acceptance-entry-failure","rawErrorIncluded":false}')});
