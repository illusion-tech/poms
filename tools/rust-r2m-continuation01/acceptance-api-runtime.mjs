// Actual Root entry. Only an explicit --run invocation opens the new R2M
// private/DB/HTTP environment. Import and --check never open those resources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SourceReader,verifySourceCap} from './acceptance-source.mjs';
import {runAcceptance} from './acceptance-api.mjs';
import {projectCompleteFacts} from './acceptance-facts.mjs';
import {buildRuntimeCaseBindings,readBorrowedCredentials} from './acceptance-api-bindings.mjs';
import {applyExactPreparedSource,preserveCertifiedLocalProject,preserveCertifiedHandoverProject} from './acceptance-prepared-result.mjs';
import {auditApiPlans,apiCaseAllowsAnonymous,declaredAnonymousScopeCases,firstApiSubset} from './acceptance-api-scenario.mjs';
import {preflightNamedApiBindings} from './acceptance-api-preflight.mjs';
import {preflightFullApiBindings} from './acceptance-api20-preflight.mjs';
import {certifyExistingLocalObjects} from './acceptance-api-local-objects.mjs';
import {platformBusinessAuditProfile} from './acceptance-api-audit-source.mjs';
import {resolveSettingHeaderIdentity,settingHeaderSteps} from './acceptance-api-request-identity.mjs';
import {observeUserRequestWrites,userCompatibilitySources} from './acceptance-api-user-compatibility.mjs';
import {externalAuditSources,externalBusinessAuditProfile} from './acceptance-api-external-audit-source.mjs';
import {archiveReaderSources} from './acceptance-api-zip.mjs';
import {readonlyPrincipalLoginSources} from './acceptance-api-principal-source.mjs';
import {draftEntitySources,m3InputCompatibilitySources} from './acceptance-api-prepared-source-check.mjs';
import {m4VersionCompatibilitySources} from './acceptance-api-m4-source-check.mjs';
import {attachmentProviderAuditSources,attachmentProviderBusinessAuditProfile} from './audit-attachment-source.mjs';
import {buildScenarioPlans,caseNames,settingKey,settingLeaseScope} from './acceptance-api-scenario.mjs';

const ROOT=path.resolve(import.meta.dirname,'../..');
const LINUX_ROOT='/home/wangzishi/projects/poms-rust-r2m';
const PRIVATE='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonHash=value=>sha(Buffer.from(JSON.stringify(value)));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_HEADER=/^(?:cookie|set-cookie|authorization)$/i;
const API_RUNTIME_SOURCES=[...new Set(['tools/rust-r2m-continuation01/acceptance-api-runtime.mjs','tools/rust-r2m-continuation01/fixture-package-intent.mjs','tools/rust-r2m-continuation01/fixture.mjs','tools/rust-r2m-continuation01/fixture-core.mjs','tools/rust-r2m-continuation01/fixture-journal.mjs','tools/rust-r2m-continuation01/fixture-profile.mjs','tools/rust-r2m-continuation01/acceptance-api.mjs','tools/rust-r2m-continuation01/acceptance-api-scenario.mjs','tools/rust-r2m-continuation01/acceptance-api-expected.mjs','tools/rust-r2m-continuation01/acceptance-api-bindings.mjs','tools/rust-r2m-continuation01/acceptance-api-preflight.mjs','tools/rust-r2m-continuation01/acceptance-api20-preflight.mjs','tools/rust-r2m-continuation01/acceptance-api-attachment-recipes.mjs','tools/rust-r2m-continuation01/acceptance-api-m4-source-check.mjs',...m4VersionCompatibilitySources.map(row=>row.file),'tools/rust-r2m-continuation01/acceptance-api-external-recipes.mjs','tools/rust-r2m-continuation01/acceptance-api-external-audit-source.mjs','tools/rust-r2m-continuation01/acceptance-api-principal-source.mjs','tools/rust-r2m-continuation01/acceptance-api-zip.mjs','tools/rust-r2m-continuation01/acceptance-api-audit-source.mjs','tools/rust-r2m-continuation01/acceptance-api-request-identity.mjs','tools/rust-r2m-continuation01/acceptance-api-local-objects.mjs','tools/rust-r2m-continuation01/acceptance-api-user-compatibility.mjs','tools/rust-r2m-continuation01/fixture-audit-identity.mjs','tools/rust-r2m-continuation01/acceptance-facts.mjs','tools/rust-r2m-continuation01/acceptance-prepared-result.mjs','tools/rust-r2m-continuation01/acceptance-prepared.mjs','tools/rust-r2m-continuation01/acceptance-dispatch.mjs','tools/rust-r2m-continuation01/acceptance-source.mjs','docs/design/rust-r2m/acceptance-input.json','libs/shared/api-spec/openapi.json',...userCompatibilitySources.map(row=>row.file),...archiveReaderSources.map(row=>row.file),...externalAuditSources.map(row=>row.file),...readonlyPrincipalLoginSources.map(row=>row.file),'tools/rust-r2m-continuation01/acceptance-api-prepared-source-check.mjs',...draftEntitySources.map(row=>row.file),...m3InputCompatibilitySources.map(row=>row.file),'tools/rust-r2m-continuation01/audit-attachment-source.mjs',...attachmentProviderAuditSources.map(row=>row.file)])];
const shapeRow=row=>({...row,...Object.fromEntries(Object.entries(row).filter(([key])=>key.includes('_')).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value]))});

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
export function assertEmptyAttachmentProviderBaseline(raw){
    assert(raw?.kind==='R2M-actual-full107-private-row-snapshot'&&raw.namespace==='poms-r2m'&&raw.tables?.length===107&&new Set(raw.tables.map(table=>table.table)).size===107,'Actual complete107 facts required before provider mutation');const table=raw.tables.find(table=>table.table==='attachment_storage_provider_config');assert(table&&Array.isArray(table.rows)&&table.rows.length===0,'M4.1 requires an actually empty provider baseline before any provider mutation; existing rows are never borrowed or owned');return{kind:'actual-full107-empty-provider-before-mutation',table:'attachment_storage_provider_config',rows:0,ownershipGranted:false};
}
export function assertAttachmentProviderAuditApproval({selection,approval,sourceCapId}){
    if(!selection.some(id=>['M4.1','M4.4'].includes(id)))return false;
    assert(approval?.kind==='Root-R2M-source-bound-audit-identity-admission'&&approval.rootApproved===true&&approval.namespace==='poms-r2m'&&approval.marker==='abd093b8-c584-45b3-9c62-6357ad6dfa5d'&&approval.sourceCapId===sourceCapId&&Array.isArray(approval.allowedSourceKinds)&&approval.allowedSourceKinds.includes('attachment-provider-null')&&typeof approval.sourceReview?.file==='string'&&/^(?:docs\/design\/rust-r2m|tmp\/rust-r2m)\/[a-zA-Z0-9_.-]+\.json$/.test(approval.sourceReview.file)&&/^[0-9a-f]{64}$/.test(approval.sourceReview.rawBytesSha256),'M4 provider mutations require their exact reviewed new-run attachment-provider-null approval before fixture/supplier preparation');return true;
}
export function assertPackageItemAdmission({selection,admission,sourceCapId,backend,runId}){
    if(!selection.includes('M4.2'))return false;
    assert(admission?.kind==='Root-R2M-exact-package-item-before-intent-admission'&&admission.rootApproved===true&&admission.namespace==='poms-r2m'&&admission.marker==='abd093b8-c584-45b3-9c62-6357ad6dfa5d'&&admission.sourceCapId===sourceCapId&&admission.logicalCase==='M4.2'&&admission.stepId==='package'&&admission.caseId==='m4.integration'&&admission.maximumItems===10&&UUID.test(admission.runId),'M4.2 requires its exact reviewed generated-package-child admission before fixture/supplier preparation');
    if(backend){assert.equal(admission.backend,backend);assert.equal(admission.database,'poms_r2m_c01_'+backend)}if(runId)assert.equal(admission.runId,runId);
    assert(/^docs\/design\/rust-r2m\/[a-z0-9-]+\.json$/.test(admission.sourceReview?.file??'')&&/^[0-9a-f]{64}$/.test(admission.sourceReview?.rawBytesSha256??''));return true;
}
export async function reserveGeneratedPackageItemsForRequest({fixture,request,context,sourceCapId,admission}){
    if(request.logicalCase!=='M4.2'||request.stepId!=='package')return null;
    assert(context?.runId===fixture.runId&&context.caseId==='m4.integration'&&context.op==='m.http'&&Number.isSafeInteger(context.index)&&context.index>=0,'Only the actual allocated M4.2 HTTP context may reserve this child');
    assert.equal(typeof fixture.intentForGeneratedPackageItems,'function');const parents=fixture.j.intents.filter(intent=>intent.caseId===context.caseId&&intent.table==='attachment_download_package'&&intent.state==='planned');assert.equal(parents.length,1,'Exactly one original Max1 package before-intent is required');assert.equal(parents[0].expectedMax,1);
    return fixture.intentForGeneratedPackageItems({caseId:context.caseId,index:context.index,op:context.op,sourceCapId,request:{logicalCase:request.logicalCase,stepId:request.stepId,method:request.method,path:request.path,body:request.body},parentIntentId:parents[0].id,expectedMax:10},admission);
}

export async function createAcceptanceApiRuntime({backend,tag,candidate,sourceCap,input,runId:requestedRunId=null,settingAdmission=null,auditIdentityApproval=null,packageItemAdmission=null,extensions={},selection=firstApiSubset}){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),LINUX_ROOT);assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,25}$/.test(tag));
    if(selection.some(id=>/^M[45]\./.test(id)))assert(tag.length<=22,'Owned supplier tags reserve two suffix characters');
    verifySourceCap(sourceCap,{candidate,files:API_RUNTIME_SOURCES});const reader=new SourceReader({root:ROOT,pins:sourceCap.files,sourceEpoch:sourceCap.id});for(const row of sourceCap.files)reader.read(row.file);
    await(selection.every(id=>firstApiSubset.includes(id))?preflightNamedApiBindings(input,{selection,sourceReader:reader}):preflightFullApiBindings(input,{selection,sourceReader:reader}));if(selection.includes('M2.2'))assert(settingAdmission,'M2.2 requires its reviewed new-run exact singleton setting admission before any fixture I/O');
    if(selection.some(id=>['M1.2','M1.3','M2.1','M2.2','M2.3','M4.1','M4.4','M5.1','M5.2'].includes(id)))assert(auditIdentityApproval,'Exact Root/C source-bound audit identity approval required before fixture I/O');
    assertAttachmentProviderAuditApproval({selection,approval:auditIdentityApproval,sourceCapId:sourceCap.id});
    assertPackageItemAdmission({selection,admission:packageItemAdmission,sourceCapId:sourceCap.id,backend,runId:requestedRunId});
    if(selection.some(id=>/^M[45]\./.test(id)))for(const method of['beforeCase','supplier','beforeDrainClose'])assert.equal(typeof extensions[method],'function','Selected supplier/fault cases require their reviewed Root hook before fixture I/O: '+method);
    if(selection.some(id=>['M2.4','M3.4'].includes(id)))assert.equal(typeof extensions.internal,'function','Selected internal case requires its reviewed Root hook before fixture I/O');
    if(selection.includes('M2.4'))for(const method of['additionalRowIsScoped','afterDrainRestore'])assert.equal(typeof extensions[method],'function','Numbering requires its exact Root lease hook before fixture I/O: '+method);
    const [{Fixture},{startOriginalNative},{startActualRust},{authority},{identities,digest},{fixtureCredentials},{marker,databaseFor}]=await Promise.all([
        import('./fixture.mjs'),import('./native-app.mjs'),import('./rust-app.mjs'),import('./catalog-complete.mjs'),import('./fixture-core.mjs'),import('./fixture-credentials.mjs'),import('./fixture-guard.mjs')
    ]);
    const {installPgCreateObserver}=await import('./pg-create-observer.mjs');
    if(selection.some(id=>['M5.1','M5.2'].includes(id)))for(const method of['admitExternalAuditSet','intentWithExternalAuditIdentity','bindExternalAuditIntentFromCertifiedCreate'])assert.equal(typeof Fixture.prototype[method],'function','Future M5 requires its separately reviewed exact fixture capability before any I/O: '+method);
    const anonymousScopeDeclarations=declaredAnonymousScopeCases(input,{selection}),predeclaredAnonymousScopes=new Set(anonymousScopeDeclarations.map(row=>row.scopeCaseId));
    if(selection.includes('M4.2'))assert.equal(typeof Fixture.prototype.intentForGeneratedPackageItems,'function','Reviewed exact package-child fixture capability required before fixture I/O');
    const runId=requestedRunId??settingAdmission?.runId??auditIdentityApproval?.runId??packageItemAdmission?.runId??randomUUID();assert(UUID.test(runId),'Exact new run UUID required');for(const admission of[settingAdmission,auditIdentityApproval,packageItemAdmission].filter(Boolean))assert.equal(admission.runId,runId);
    const retain=privateRecorder(backend,runId),fixture=await Fixture.open(backend,runId),contexts=new Map(),committed=[],sessionMap=new Map(),requests=[],faultRestores=[];
    let native,rust,pg,index=0,closed=false,globalBaseline,metadata;
    const scopes=new Map(),sourceFile='tools/rust-r2m-continuation01/native-write-witness.mjs';
    function scope(caseId,{anonymous=false,projects=[]}={}){caseId=actualSourceCase(caseId);if(scopes.has(caseId))return scopes.get(caseId);const current=fixture.j.cases.find(item=>item.caseId===caseId);if(current){scopes.set(caseId,current);return current}const actual=fixture.defineCase(caseId,{actors:Object.values(fixture.actors),projects,borrowedActors:['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014'],borrowedDefinitions:fixture.j.borrowed.definitions.map(item=>item.id),anonymous:anonymous||apiCaseAllowsAnonymous(caseId)||predeclaredAnonymousScopes.has(caseId)});scopes.set(caseId,actual);return actual}
    function session(name){if(!sessionMap.has(name))sessionMap.set(name,new AcceptanceHttpSession({runId,userId:fixture.actors[name]??(name==='approver'?'00000000-0000-4000-8000-000000000008':name==='finance'?'00000000-0000-4000-8000-000000000014':null)}));return sessionMap.get(name)}
    function nativeAuthority(){return fixture.creationEnvelope({id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend,database:databaseFor(backend),marker,source:{file:sourceFile,sha256:sha(fs.readFileSync(path.join(ROOT,sourceFile)))},trace:native.witness.snapshot()})}
    async function ensureIntent(table,selector,caseId,expectedMax=64){const present=fixture.j.intents.filter(item=>item.caseId===caseId&&item.table===table&&item.state==='planned');if(present.length){assert.equal(present.length,1,'One planned actual create selector per table/request');return present[0]}return fixture.intent(table,selector,{caseId,expectedMax})}
    async function autoIntents(request,active,context,auditIdentity,externalAuditSet){
        if(externalAuditSet)for(const item of externalAuditSet.items)await fixture.intentWithExternalAuditIdentity('audit_log',item.auditSelector,{caseId:active.caseId,index:context.index,admissionId:externalAuditSet.id,eventType:item.eventType,expectedMax:1});
        else if(auditIdentity)await fixture.intentWithRequestIdentity('audit_log',auditIdentity.auditSelector,{caseId:active.caseId,index:context.index,admissionId:auditIdentity.id,expectedMax:1});else await ensureIntent('audit_log',{request_id:active.requestId},active.caseId);
        await ensureIntent('security_event',{request_id:active.requestId},active.caseId);
        if(request.method==='POST'&&request.path==='/api/auth/sessions'){const account=Object.keys(fixture.actors).find(name=>fixtureCredentials(runId,name).username===request.body?.username);const userId=account?fixture.actors[account]:request.body?.username==='vp_owner'?'00000000-0000-4000-8000-000000000008':request.body?.username==='finance_mgr'?'00000000-0000-4000-8000-000000000014':null;if(userId)await ensureIntent('auth_session',{user_id:userId},active.caseId)}
        const role=/^\/api\/platform\/roles\/([0-9a-f-]{36})\/permissions$/.exec(request.path);if(role&&request.method==='PUT')await ensureIntent('role_permission_assignment',{role_id:role[1]},active.caseId,64);
        const member=/^\/api\/platform\/users\/([0-9a-f-]{36})\/org-memberships$/.exec(request.path);if(member&&request.method==='PUT')await ensureIntent('user_org_membership',{user_id:member[1]},active.caseId,64);
        const assigned=/^\/api\/platform\/users\/([0-9a-f-]{36})\/roles$/.exec(request.path);if(assigned&&request.method==='PUT')await ensureIntent('user_role_assignment',{user_id:assigned[1]},active.caseId,64);
    }
    async function certifyActual({from,caseId,executionBackend,pgRows=[],externalAuditSet=null}){
        await native.witness.drain();native.witness.assertComplete();const actual=committed.slice(from),intents=fixture.j.intents.filter(item=>item.caseId===caseId&&item.state==='planned');
        if(executionBackend==='rust')assert.equal(actual.length,0,'Rust request cannot be certified by Native SDK');
        if(actual.length){const authorityId=fixture.registerNativeAuthority(nativeAuthority()),rows=[];for(const item of actual){let intentId;if(item.table==='audit_log'&&externalAuditSet){await retain({kind:'actual-external-audit-SDK-authority-and-committed-create-before-intent-match',record:{caseId,admissionId:externalAuditSet.id,authorityId,actualCreate:item}});intentId=await fixture.bindExternalAuditIntentFromCertifiedCreate(fixture.creationEnvelope({...item,authorityId}),{caseId,index:item.proof.createContext.index,admissionId:externalAuditSet.id});assert(UUID.test(intentId),'Exact fixture SDK-source audit match must return its original intent ID')}else{const matching=intents.filter(intent=>intent.table===item.table);assert.equal(matching.length,1,'Actual SDK INSERT lacks one reviewed immutable intent');intentId=matching[0].id}rows.push(fixture.creationEnvelope({...item,authorityId,intentId}))}fixture.recordCommittedCreates(rows)}
        if(executionBackend==='rust'&&pgRows.length)fixture.recordCommittedCreates(pgRows.map(item=>fixture.creationEnvelope(item)));
        if(executionBackend==='nest'&&pgRows.length)assert(pgRows.every(item=>actual.some(row=>row.table===item.table&&row.id===item.id)),'PG shadow has no actual SDK INSERT');
        await fixture.resolveNoCreates(caseId);await fixture.adoptIntents();return{sdk:actual.length,pg:pgRows.length};
    }
    async function perform(request){
        const handle=session(request.session??'admin'),active=scope(request.caseId,{anonymous:handle.userId===null});let sessionCondition=null;
        const context={runId,caseId:active.caseId,index:index++,op:request.executionBackend==='nest'&&backend==='rust'?'m.producer':'m.http'},generatedCorrelationId='m-'+randomUUID();let correlationId=generatedCorrelationId,wireRequestId=active.requestId,auditIdentity=null,externalAuditSet=null,requestIdentitySource=null;
        if(settingHeaderSteps.includes(request.stepId)){
            requestIdentitySource=resolveSettingHeaderIdentity({sourceReader:reader,sourceCapId:sourceCap.id,backend,step:request,context,ownershipRequestId:active.requestId,generatedCorrelationId});
            auditIdentity=await fixture.admitAuditIdentity({sourceKind:'E-setting',descriptor:requestIdentitySource,context},auditIdentityApproval);correlationId=requestIdentitySource.actualCorrelationId;wireRequestId=requestIdentitySource.actualRequestId;
        }else{
            assert(!Object.keys(request.headers??{}).some(key=>/^(?:x-request-id|x-correlation-id)$/i.test(key)),'Only the two precise original E cells may override fixture transport identity');
            if(handle.userId!==null)requestIdentitySource=platformBusinessAuditProfile({sourceReader:reader,sourceCapId:sourceCap.id,context,request,actorId:handle.userId})??attachmentProviderBusinessAuditProfile({sourceReader:reader,sourceCapId:sourceCap.id,context,request,actorId:handle.userId});
            if(requestIdentitySource)auditIdentity=await fixture.admitAuditIdentity({sourceKind:requestIdentitySource.kind==='R2M-original-attachment-provider-null-audit-source-profile'?'attachment-provider-null':'platform-null',descriptor:requestIdentitySource,request,context},auditIdentityApproval);
            const externalProfile=externalBusinessAuditProfile({sourceReader:reader,sourceCapId:sourceCap.id,context,request,inputs:request.externalAuditInputs});if(externalProfile){assert(!auditIdentity);externalAuditSet=await fixture.admitExternalAuditSet({descriptor:externalProfile,request,context,inputs:request.externalAuditInputs},auditIdentityApproval)}
        }
        await reserveGeneratedPackageItemsForRequest({fixture,request,context,sourceCapId:sourceCap.id,admission:packageItemAdmission});
        await autoIntents(request,active,context,auditIdentity,externalAuditSet);assert(!contexts.has(correlationId),'Exact actual HTTP correlation must not be rebound');contexts.set(correlationId,context);
        const from=committed.length,sqlFrom=native.sql.length,sdkEventFrom=native.witness.snapshot().events.length;let response,pgRows=[];
        // PG observer uses the exact immutable (sourceCase,index) token.
        await pg.beginCase(context);
        try{response=await handle.request({...request,requestId:wireRequestId,correlationId});await retain({kind:'actual-raw-HTTP-response-before-write-certification',record:{index:context.index,context,method:request.method,path:request.path,executionBackend:request.executionBackend,requestIdentitySource,auditIdentity,externalAuditSet,ownershipRequestId:active.requestId,actualRequestId:wireRequestId,actualCorrelationId:correlationId,sessionCondition,response}});assert.equal(response.parseError,null,'Actual JSON parsing failed')}
        catch(error){await retain({kind:'private-API-original-transport-or-response-failure',record:{name:error.name,message:error.message,stack:error.stack}});throw error}
        finally{
            const drainFailures=[];
            try{await native.witness.drain();native.witness.assertComplete()}catch(error){drainFailures.push(error);try{await retain({kind:'private-API-SDK-drain-failure',record:{name:error.name,message:error.message,stack:error.stack}})}catch(retainError){drainFailures.push(retainError)}}
            try{pgRows=await pg.drainCase()}catch(error){drainFailures.push(error);try{await retain({kind:'private-API-PG-drain-failure',record:{name:error.name,message:error.message,stack:error.stack}})}catch(retainError){drainFailures.push(retainError)}}
            await retain({kind:'actual-API-original-SDK-PG-and-queryPID-before-certification',record:{context,method:request.method,path:request.path,response:response??null,committedCreates:committed.slice(from),pgRows,originalNativeSql:native.sql.slice(sqlFrom),originalNativeTrace:native.witness.snapshot()}});
            if(drainFailures.length)throw new Error('Actual SDK/PG drain incomplete; original private diagnostics retained');
            const certified=await certifyActual({from,caseId:active.caseId,executionBackend:request.executionBackend,pgRows,externalAuditSet});
            if(response){
                const scopedSql=native.sql.slice(sqlFrom).filter(row=>row.context?.runId===runId&&row.context?.caseId===context.caseId&&row.context?.index===context.index),sdkEvents=native.witness.snapshot().events.slice(sdkEventFrom);
                response.actualWriteOutcome={...observeUserRequestWrites({executionBackend:request.executionBackend,sourceCaseId:context.caseId,index:context.index,sdkCommittedCreates:certified.sdk,pgCommittedCreates:certified.pg,sql:scopedSql,sdkEvents,sqlCaptureComplete:native.report().pgCaptureComplete}),nativeSdkEventRange:{from:sdkEventFrom,to:sdkEventFrom+sdkEvents.length}};
                await retain({kind:'actual-API-post-certification-request-write-outcome',record:{context,method:request.method,path:request.path,outcome:response.actualWriteOutcome,scopedSql,sdkEvents}});
            }
        }
        if(active.caseId===settingLeaseScope&&['GET','PATCH'].includes(request.method)&&request.path==='/api/platform/system-settings/'+settingKey){await fixture.recordBaselineSettingAfter({namespace:'poms-r2m',marker,runId,backend,caseId:active.caseId,requestId:wireRequestId,method:request.method,path:request.path,status:response.status,completed:response.transportComplete,requestSha256:jsonHash(request.body??null),responseSha256:response.bodyBytesSha256,logicalCase:request.logicalCase??request.caseId,stepId:request.stepId??null,...(auditIdentity?{ownershipRequestId:active.requestId,actualRequestId:wireRequestId,actualCorrelationId:correlationId,auditIdentityAdmissionId:auditIdentity.id,index:context.index,sourceStepId:request.stepId,requestBodySha256:jsonHash(request.body)}:{})})}
        const record={kind:'actual-fixed-dispatch-request',index:context.index,context,method:request.method,path:request.path,executionBackend:request.executionBackend,sessionCondition,response};requests.push(record);await retain({kind:'actual-request-private-cookies-body-and-SDK-PG',record});return response;
    }
    function currentAdmissions(){const ledgerDigest=digest(fixture.j);return fixture.j.objects.map(item=>({kind:'r2m-fixture-admission',runId,sourceCapId:sourceCap.id,table:item.table,identity:item.identity,slot:item.caseId+'.'+item.table+'.'+fixture.j.objects.filter(other=>other.caseId===item.caseId&&other.table===item.table).findIndex(other=>other.id===item.id),ledgerDigest,certificateSha256:digest({creationProof:item.creationProof,postcondition:item.postcondition})}))}
    function projectedFacts(raw){return projectCompleteFacts({raw,baseline:globalBaseline,journal:fixture.j,authority,additionalRowIsScoped:(table,row)=>extensions.additionalRowIsScoped?.(table,row)===true})}
    async function bootstrap(name,credentials,userId){const target=session(name);target.userId=userId;const active=scope('m.bootstrap.'+name,{anonymous:false});const a=await perform({executionBackend:backend,method:'GET',path:'/api/auth/csrf-token',session:name,caseId:active.caseId,purpose:'business'});assert.equal(a.status,200);const b=await perform({executionBackend:backend,method:'POST',path:'/api/auth/sessions',body:credentials,session:name,caseId:active.caseId,purpose:'business'});assert.equal(b.status,200);assert.equal(b.body.user.id,userId);return b.body.user}
    try{
        assert(fixture.j.state==='planned'&&fixture.j.base===null,'New actual entry cannot silently reuse an old/partial run journal');
        await retain({kind:'source-declared-anonymous-case-scopes-before-setup',record:{sourceCapId:sourceCap.id,declarations:anonymousScopeDeclarations,auditNullOperatorPermissionGranted:false}});
        globalBaseline=await fixture.facts();await retain({kind:'global-before-prepare-full107',record:globalBaseline});await fixture.prepare();await fixture.borrowSeedPrincipals();await fixture.borrowCanonicalDefinitions();await fixture.planObjectPrefix();
        pg=await installPgCreateObserver(fixture);await fixture.registerPgObserver(fixture.creationEnvelope(pg.receipt()));
        if(backend==='rust')rust=await startActualRust({tag,expectedBinarySha256:sourceCap.artifacts.find(item=>item.kind==='rust-release').rawBytesSha256});
        native=await startOriginalNative({tag,backend,admittedContexts:contexts,onCommitted:rows=>committed.push(...rows)});metadata=native.metadata;
        const credentials={admin:fixtureCredentials(runId,'admin'),viewer:fixtureCredentials(runId,'viewer')},profiles={};
        profiles.admin=await bootstrap('admin',credentials.admin,fixture.actors.admin);profiles.viewer=await bootstrap('viewer',credentials.viewer,fixture.actors.viewer);
        // Authenticate readonly decision actors before any business intents
        // are planned; the Fixture intentionally refuses to adopt an unrelated
        // still-planned future intent during an interleaved login.
        if(selection.includes('M3.1'))profiles.approver=await bootstrap('approver',readBorrowedCredentials(reader,'approver'),'00000000-0000-4000-8000-000000000008');
        if(selection.some(id=>['M3.2','M3.3'].includes(id)))profiles.finance=await bootstrap('finance',readBorrowedCredentials(reader,'finance'),'00000000-0000-4000-8000-000000000014');
        const base=fixture.base,bindings={runId,actors:fixture.actors,borrowedActors:{approver:'00000000-0000-4000-8000-000000000008',finance:'00000000-0000-4000-8000-000000000014'},roles:Object.fromEntries(base.accounts.map(item=>[item.account,item.roleId])),orgs:Object.fromEntries(base.accounts.map(item=>[item.account,item.orgId])),profile:profiles,credentials,missingId:randomUUID(),sourceCapId:sourceCap.id};
        if(settingAdmission){scope(settingLeaseScope);assert(settingAdmission.runId===runId,'Root admission must name this exact new run');await fixture.admitBaselineSetting(settingAdmission,{caseId:settingLeaseScope})}
        const deps={
            async request(request){return perform(request)},
            async facts({caseId,tables}){const raw=await fixture.facts();await retain({kind:'complete-full107-private-facts',caseId,record:raw});return projectedFacts(raw,tables)},
            async prepare(options){
                const caseId=actualSourceCase(options.caseId);const active=scope(caseId,{anonymous:options.step?.session==='anonymous'||options.step?.session==='absent'||apiCaseAllowsAnonymous(caseId)});
                if(options.phase==='bindings-only'){
                    if(options.caseId==='M4.1'){const beforeProvider=await fixture.facts();await retain({kind:'M4.1-actual-full107-before-provider-mutation-guard',record:{sourceCapId:sourceCap.id,caseId:options.caseId,fullFacts:beforeProvider}});assertEmptyAttachmentProviderBaseline(beforeProvider)}
                    const names=caseNames(runId,options.caseId),sourceBindings=await buildRuntimeCaseBindings({caseId:options.caseId,sourceCaseId:caseId,fixture,bindings:options.bindings,sourceReader:reader}),fullValues={...options.bindings,...sourceBindings,names};
                    if(extensions.beforeCase)await extensions.beforeCase({fixture,bindings:fullValues,caseId:options.caseId,sourceCaseId:caseId,retain,sourceReader:reader,sourceCap,sourceCapId:sourceCap.id});
                    return{sourceCapId:sourceCap.id,businessProducerRequests:0,businessRowsInserted:0,metadata,bindings:fullValues};
                }
                if(options.phase==='step-scope-only')return{...active,sourceCapId:sourceCap.id,businessProducerRequests:0,businessRowsInserted:0};
                if(options.phase==='baseline-setting-lease'){assert(settingAdmission&&fixture.j.baselineSettingLease,'Reviewed exact setting admission required');return{sourceCapId:sourceCap.id,key:settingKey,owned:false,deleteAllowed:false,environmentBaselineSettingAdmission:{approved:true,rawBytesSha256:digest(settingAdmission)}}}
                if(options.phase==='exact-owned-mutation'){
                    if(options.operation==='expire-owned-session'){const handle=session(options.input.session),token=handle.cookies.get('poms_session');assert(token);const row=fixture.j.objects.find(item=>item.table==='auth_session'&&item.identity.token_hash===sha(Buffer.from(token)));assert(row);await fixture.updateOwned('auth_session',row.id,{idle_expires_at:new Date(Date.now()+options.input.idleOffsetMs).toISOString()},'R2M named exact owned-session expiry')}
                    else if(options.operation==='update-owned-fields'){await fixture.updateOwned(options.input.table,options.input.id,options.input.values,'R2M named source-prepared consumption mutation')}
                    else assert.fail('Undefined bounded fixture mutation');return{sourceCapId:sourceCap.id,exactOwnedIdentity:true};
                }
                if(options.phase==='insert-exact-source-plan'){const applied=await applyExactPreparedSource({fixture,sourceReader:reader,sourceCapId:sourceCap.id,sourcePlan:options.sourcePlan,caseId,retain});if(options.logicalCaseId==='M4.1')return preserveCertifiedLocalProject({fixture,sourcePlan:options.sourcePlan,operation:applied});if(options.logicalCaseId==='M4.2')return preserveCertifiedHandoverProject({fixture,sourcePlan:options.sourcePlan,operation:applied});return applied;}
                assert.fail('Undefined Root preparation phase');
            },
            async certify({caseId}){const raw=await fixture.facts();assert.equal(raw.unknownCreates,0);assert.equal(raw.unknownMutations,0);const localObjects=await certifyExistingLocalObjects({fixture,raw,sourceCapId:sourceCap.id,retain}),registeredRows=currentAdmissions();return{complete:true,traceComplete:true,caseId,runId,sourceCapId:sourceCap.id,registeredRows,ledgerDigest:digest(fixture.j),creationCertificates:fixture.j.committedCreates,mutationCertificates:fixture.j.mutations,localObjects,unknownCreates:[],unknownMutations:[]}},
            async internal(options){assert.equal(typeof extensions.internal,'function','Root reviewed actual internal probe extension required');const nextContext=(caseId,op)=>{assert(['m.internal-uow','m.internal-numbers'].includes(op));fixture.scope(caseId);return{runId,caseId,index:index++,op}},nativeCommittedCount=()=>committed.length,certifyObservedCreates=parameters=>{assert(Number.isSafeInteger(parameters.from)&&parameters.from>=0&&parameters.from<=committed.length);assert(['nest','rust'].includes(parameters.executionBackend));return certifyActual(parameters)};return extensions.internal({...options,fixture,native,rust,pg,perform,retain,sourceReader:reader,sourceCap,nextContext,nativeCommittedCount,certifyObservedCreates})},
            async supplier(options){assert.equal(typeof extensions.supplier,'function','Root reviewed actual supplier extension required');return extensions.supplier({...options,fixture,native,rust,pg,perform,retain,sourceReader:reader,sourceCap})},
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
        return{fixture,bindings,deps,reader,retain,requests,sourceCapId:sourceCap.id,async close({allowCleanup=false}={}){
            if(closed)return;closed=true;
            const receipt={kind:'r2m-actual-API-runtime-closeout',runId,backend,sourceCapId:sourceCap.id,writers:[],cleanup:[],failures:[],result:'partial-preserved'};
            const preserve=async(stage,error)=>{receipt.failures.push({stage,name:error.name,rawErrorIncluded:false});try{await retain({kind:'private-API-runtime-close-failure',stage,record:{name:error.name,message:error.message,stack:error.stack}})}catch{receipt.failures.push({stage:stage+'-private-retention',privateWriteFailed:true})}};
            let stopped=true,restored=false;
            for(const[name,owner]of[['rust',rust],['native',native]])if(owner)try{await owner.close();receipt.writers.push({kind:name,identity:name==='rust'?String(owner.report.processIdentity.pid):String(process.pid)+':native-app',stopped:true})}catch(error){stopped=false;receipt.writers.push({kind:name,stopped:false});await preserve(name,error)}
            try{receipt.pg=await pg.restore();restored=true}catch(error){stopped=false;await preserve('pg-observer-restore',error)}
            if(extensions.beforeDrainClose)try{const extra=await extensions.beforeDrainClose({fixture,native,rust,pg,retain});assert(extra&&extra.activeRequests===0&&extra.pendingTransactions===0&&Array.isArray(extra.writers)&&extra.writers.every(item=>item.stopped===true));receipt.extensionClose=extra;receipt.writers.push(...extra.writers)}catch(error){stopped=false;await preserve('extensions-before-drain-close',error)}
            if(stopped&&restored&&allowCleanup)try{
                fixture.drain({namespace:'poms-r2m',runId,backend,marker,activeRequests:0,pendingTransactions:0,observersRestored:true,writers:receipt.writers,sourceCapsuleSha256:sourceCap.manifestSha256});
                if(extensions.afterDrainRestore)receipt.extensionsRestore=await extensions.afterDrainRestore({fixture,retain});
                if(fixture.j.baselineSettingLease)receipt.setting=await fixture.restoreBaselineSetting();
                receipt.cleanup.push(await fixture.cleanup());receipt.cleanup.push(await fixture.cleanup());assert.equal(receipt.cleanup[1].deleted,0);assert.equal(receipt.cleanup[1].objects.changed,0);receipt.result='owned-double-zero-recorded';
            }catch(error){receipt.result='cleanup-incomplete-preserved';await preserve('fixture-drain-restore-double-cleanup',error)}
            try{await fixture.close()}catch(error){receipt.result='fixture-client-close-incomplete';await preserve('fixture-client-close',error)}
            try{reader.assertUnchanged()}catch(error){receipt.result='source-changed-preserved';await preserve('source-unchanged',error)}
            if(receipt.failures.length&&receipt.result==='owned-double-zero-recorded')receipt.result='close-proof-incomplete-preserved';
            await retain({kind:'actual-API-runtime-closeout',record:receipt});return receipt;
        }};
    }catch(error){
        const failures=[];
        const retainFailure=async(stage,actual)=>{try{const receipt=await retain({kind:'private-runtime-prepare-failure',stage,record:{name:actual.name,message:actual.message,stack:actual.stack}});failures.push({stage,receipt})}catch{failures.push({stage,privateWriteFailed:true})}};
        await retainFailure('original-prepare',error);
        // Every owned resource gets its own close attempt. A failed earlier
        // owner must not prevent later owners/observer/client from draining.
        for(const[name,resource,operation]of[['rust',rust,'close'],['native',native,'close'],['pg-observer',pg,'restore']])if(resource)try{await resource[operation]()}catch(closeError){await retainFailure(name+'-close',closeError)}
        if(extensions.beforeDrainClose)try{await extensions.beforeDrainClose({fixture,native,rust,pg,retain})}catch(closeError){await retainFailure('extensions-before-drain-close',closeError)}
        try{await fixture.close()}catch(closeError){await retainFailure('fixture-client-close',closeError)}
        throw Object.assign(new Error('R2M-runtime-preparation-failed'),{runId,journalFile:fixture.store.file,privateFailureReceipts:failures});
    }
}

export function runtimePlan({mode,selection=[]}){assert.equal(mode,'api','This independent epoch executes only named API recipes');return{kind:'r2m-runtime-plan-not-executed',mode,selection,requiredModules:['fixture.mjs','native-app.mjs','rust-app.mjs','pg-create-observer.mjs'],actualExecution:false};}

async function cli(){
    const args=process.argv.slice(2),values={};for(let at=0;at<args.length;at++){const key=args[at];assert(/^--(?:run|check|backend|tag|cap|mode|selection|setting-admission|audit-identity-admission|package-item-admission)$/.test(key),'Unknown argument');if(['--run','--check'].includes(key))values[key]=true;else values[key]=args[++at]}
    assert(Boolean(values['--run'])!==Boolean(values['--check']),'Choose explicit --check or --run');
    const mode=values['--mode']??'api',selection=(values['--selection']??'').split(',').filter(Boolean);runtimePlan({mode,selection});
    const cap=publicInput(values['--cap']),input=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/design/rust-r2m/acceptance-input.json'),'utf8'));verifySourceCap(cap,{candidate:cap.candidate,files:API_RUNTIME_SOURCES});
    if(values['--check']){const reader=new SourceReader({root:ROOT,pins:cap.files,sourceEpoch:cap.id});for(const row of cap.files)reader.read(row.file);const chosen=selection.length?selection:firstApiSubset,plans=await(chosen.every(id=>firstApiSubset.includes(id))?preflightNamedApiBindings(input,{selection:chosen,sourceReader:reader}):preflightFullApiBindings(input,{selection:chosen,sourceReader:reader}));const checked=reader.assertUnchanged();console.log(JSON.stringify({result:'source-input-check-not-actual-acceptance',...runtimePlan({mode,selection}),plans,source:{sourceEpoch:checked.sourceEpoch,digest:checked.digest,files:checked.files.length}}));return}
    assert(selection.length>0&&selection.every(id=>buildScenarioPlans(input).some(plan=>plan.id===id)),'Only an explicit finite current API selection is executable');
    const backend=values['--backend'],tag=values['--tag'];assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,25}$/.test(tag??''),'Fixed backend/tag required');if(selection.some(id=>/^M[45]\./.test(id)))assert(tag.length<=22,'Owned supplier tags reserve two suffix characters');const output=path.join(ROOT,'tmp/rust-r2m-continuation01/acceptance-api-'+backend+'-'+tag+'.json');assert(!fs.existsSync(output),'Never overwrite an earlier actual receipt');
    const settingAdmission=values['--setting-admission']?publicInput(values['--setting-admission']):null,auditIdentityApproval=values['--audit-identity-admission']?publicInput(values['--audit-identity-admission']):null,packageItemAdmission=values['--package-item-admission']?publicInput(values['--package-item-admission']):null,runId=settingAdmission?.runId??auditIdentityApproval?.runId??packageItemAdmission?.runId??randomUUID();assert(UUID.test(runId));for(const admission of[settingAdmission,auditIdentityApproval,packageItemAdmission].filter(Boolean))assert.equal(admission.runId,runId);
    assertAttachmentProviderAuditApproval({selection,approval:auditIdentityApproval,sourceCapId:cap.id});assertPackageItemAdmission({selection,admission:packageItemAdmission,sourceCapId:cap.id,backend,runId});
    let runtime,record={kind:'Root-R2M-actual-API-acceptance-subset',mode,backend,tag,runId,result:'partial-preserved',G3Certified:false,G4Certified:false};
    try{let extensions={};if(mode==='api'&&selection.some(id=>id==='M2.4'||id==='M3.4'||/^M[45]\./.test(id))){const preflight=new SourceReader({root:ROOT,pins:cap.files,sourceEpoch:cap.id});for(const file of cap.files)preflight.read(file.file);const{createAcceptanceExtensions}=await import('./acceptance-extensions.mjs');extensions=await createAcceptanceExtensions({backend,tag,sourceCap:cap})}runtime=await createAcceptanceApiRuntime({backend,tag,runId,candidate:cap.candidate,sourceCap:cap,input,settingAdmission,auditIdentityApproval,packageItemAdmission,extensions,selection});const options={backend,candidate:cap.candidate,sourceCap:cap,input,fixture:runtime.fixture,bindings:runtime.bindings,deps:runtime.deps,retain:runtime.retain,sourceReader:runtime.reader,spec:runtime.reader.json('libs/shared/api-spec/openapi.json')};const observed=await runAcceptance({...options,selection});record.observation=observed.report;record.result=observed.report.result==='observed'?'observed-comparison-pending':'partial-preserved'}catch(error){record.failure={category:'actual-wrapper-or-required-proof-failed',rawErrorIncluded:false};try{const directory=PRIVATE+'/acceptance-runs/'+backend+'-'+runId;for(const part of[PRIVATE,PRIVATE+'/acceptance-runs',directory]){if(part!==PRIVATE&&!fs.existsSync(part))fs.mkdirSync(part,{mode:0o700});const stat=fs.lstatSync(part);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0)}const file=directory+'/entry-failure-'+randomUUID()+'.json',bytes=Buffer.from(JSON.stringify({name:error.name,message:error.message,stack:error.stack})+'\n'),fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}record.failure.privateEvidence={file,bytes:bytes.length,rawBytesSha256:sha(bytes)}}catch{record.failure.privateEvidenceWriteFailed=true}process.exitCode=1}
    finally{if(runtime){try{record.closeout=await runtime.close({allowCleanup:record.result==='observed-comparison-pending'});if(record.closeout.result!=='owned-double-zero-recorded')process.exitCode=1}catch{record.closeout={result:'closeout-incomplete-preserved'};process.exitCode=1}}const journal=PRIVATE+'/m-runs/'+backend+'-'+runId+'.json';if(fs.existsSync(journal)){const stat=fs.lstatSync(journal);assert(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0);const raw=fs.readFileSync(journal);record.recovery={runId,file:journal,bytes:raw.length,rawBytesSha256:sha(raw),contentsExported:false}}else record.recovery={runId,file:journal,exists:false,contentsExported:false};fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:path.relative(ROOT,output),result:record.result,runId,recovery:record.recovery,sourceCapId:cap.id,closeout:record.closeout?.result??'not-opened',G3Certified:false}))}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(()=>{process.exitCode=1;console.error('{"kind":"R2M-acceptance-entry-failure","rawErrorIncluded":false}')});
