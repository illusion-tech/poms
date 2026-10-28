import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NavigationHttpSession } from './http-client.mjs';
import { validateSource, sourceHead, databaseFor, verifyConnection } from './fixture-guard.mjs';
import { assertSourceGuard } from './export-users.mjs';
import { frozenGolden, httpCoverageManifest, assertCompleteHttpCoverage, sequentialCases, rejectedDtoHttpExpectation } from './http-compat-cases.mjs';
import { requestWire, wireRequest } from './http-compat-wire.mjs';

const require=createRequire(import.meta.url);
const { invokeFixture }=require('./invoke-fixture.cjs');
const { userFixtureSpec }=require('./fixture-protocol.cjs');
const { loadManagedEnvironment }=require('./managed-environment.cjs');
const { Client }=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const root=path.resolve(import.meta.dirname,'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const specification=JSON.parse(readFileSync(path.join(root,'tools/rust-r2d/users-openapi.json'),'utf8'));

export function belowEvidence(name){
    const resolved=path.resolve(root,name);
    assert(resolved.startsWith(path.join(root,'tmp/rust-r2d')+path.sep)&&resolved.endsWith('.json'),'Only R2D JSON evidence paths');
    if(existsSync(resolved))assert(lstatSync(resolved).isFile()&&!lstatSync(resolved).isSymbolicLink(),'Evidence must be a regular file');
    return resolved;
}
export function validateServerReceipt(value,backend,origin){
    assert.equal(value.backend,backend);assert.equal(value.origin,origin);assert.equal(value.sourceHead,sourceHead);
    assert(Number.isSafeInteger(value.pid)&&value.pid>0);assert.equal(value.aliveBefore,true);
    assert(/^[0-9a-f]{64}$/.test(value.binarySha256));
    assert.deepEqual(Object.keys(value.processIdentity??{}).sort(),['pid','startTicks']);
    assert.equal(value.processIdentity.pid,value.pid);
    assert(/^[0-9]+$/.test(value.processIdentity.startTicks)&&BigInt(value.processIdentity.startTicks)>0n);
    assert(Array.isArray(value.sourceFiles)&&value.sourceFiles.length);
    for(const file of value.sourceFiles){
        assert.deepEqual(Object.keys(file).sort(),['file','sha256']);
        assert(typeof file.file==='string'&&!path.posix.isAbsolute(file.file)&&!file.file.includes('\\')&&!file.file.includes(':')&&file.file.split('/').every(part=>part&&part!=='.'&&part!=='..'));
        assert(/^[0-9a-f]{64}$/.test(file.sha256));
    }
    assert.equal(new Set(value.sourceFiles.map(file=>file.file)).size,value.sourceFiles.length);
    return Object.fromEntries(['backend','origin','pid','binarySha256','sourceHead','aliveBefore','ownerPlatform','processIdentity','sourceFiles'].filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
}
export function baselineSourceFile(exists=file=>existsSync(path.join(root,file))){
    const live='docs/design/rust-r2d-users-profile-baseline.md',archived='docs/design/archive/slices/rust-r2d-users-profile-baseline.md';
    if(exists(live))return live;
    assert(exists(archived),'R2D source manifest requires the live or archived baseline');
    return archived;
}
export function sourceFiles(){
    const files=['apps/poms-api-rust/Cargo.toml','apps/poms-api-rust/Cargo.lock','libs/shared/api-spec/openapi.json',baselineSourceFile(),'tools/e2e/runtime.cjs','tools/e2e/runtime-worker.cjs'];
    const walk=(folder,pattern)=>{
        for(const entry of readdirSync(path.join(root,folder),{withFileTypes:true})){
            const file=folder+'/'+entry.name;
            assert(!entry.isSymbolicLink(),'No symlinked validation source');
            if(entry.isDirectory())walk(file,pattern);
            else if(entry.isFile()&&pattern.test(entry.name))files.push(file);
        }
    };
    walk('apps/poms-api-rust/src',/\.rs$/);walk('tools/rust-r2d',/\.(?:mjs|cjs|json|cts|sh)$/);
    return files.sort().map(file=>({file,normalizedLfSha256:digest(readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'))}));
}
export function responseUsers(body,operation,status,method='GET'){
    if(method==='HEAD'||![200,201].includes(status))return [];
    if(operation==='list')return Array.isArray(body)?body:[];
    if(operation==='owner-reference')return body?.users??[];
    if(operation==='session')return body?.user?[body.user]:[];
    return body&&typeof body==='object'&&typeof body.id==='string'?[body]:[];
}
function responseOrgIds(body,operation,status){
    if(![200,201].includes(status)||!body)return [];
    return [...new Set((operation==='orgs'&&Array.isArray(body)?body:operation==='owner-reference'?body.orgUnits??[]:Array.isArray(body.orgUnits)?body.orgUnits:[]).map(org=>org.id))];
}
export function validateProjection(body,operation,status,method){
    if(method==='HEAD'||![200,201].includes(status))return;
    const schemaName=operation==='list'?'PlatformUserSummary':operation==='detail'||operation==='update'?'PlatformUserDetail':
        ['profile','update-profile','assign-roles','assign-org-memberships'].includes(operation)?'SanitizedUserWithOrgUnits':null;
    const users=responseUsers(body,operation,status,method);
    if(schemaName)for(const user of users)assert.deepEqual(Object.keys(user).sort(),Object.keys(specification.components.schemas[schemaName].properties).sort(),'Exact user projection: '+operation);
    if(['create','activate','deactivate'].includes(operation))for(const user of users){
        // Actual source-bound W01 create-none response, not the generic object spec.
        const keys=['id','username','displayName','email','emailVerified','phone','phoneVerified','avatarUrl','isActive','primaryOrgUnitId','lastLoginAt','rowVersion','createdAt','createdBy','updatedAt','updatedBy'];
        assert.deepEqual(Object.keys(user).sort(),keys.sort(),'Raw PlatformUser16 from fresh W01');
        assert.equal(typeof user.rowVersion,'number');
    }
    if(operation==='owner-reference'){
        assert.deepEqual(Object.keys(body).sort(),['orgUnits','users']);
        for(const user of users)assert.deepEqual(Object.keys(user).sort(),Object.keys(specification.components.schemas.OwnerReferenceUser.properties).sort());
        for(const org of body.orgUnits)assert.deepEqual(Object.keys(org).sort(),Object.keys(specification.components.schemas.OwnerReferenceOrgUnit.properties).sort());
    }
    if(['assign-roles','assign-org-memberships'].includes(operation))assert.deepEqual(body.permissions,[]);
}
export async function readResponseFacts(managed,backend,body,operation,status,method='GET',makeClient=config=>new Client(config)){
    const database=databaseFor(backend),env=managed.childEnv;
    for(const [key,value]of Object.entries({DB_HOST:'127.0.0.1',DB_PORT:'15432',DB_DATABASE:database,DB_USER:'poms_r2d_app',DB_SCHEMA:'poms',DB_CONNECT:'true'}))assert.equal(env[key],value,'Fixed response observer '+key);
    assert(/^[0-9a-f]{64}$/.test(env.DB_PASSWORD));
    const requestedUserIds=responseUsers(body,operation,status,method).map(user=>user.id),orgIds=responseOrgIds(body,operation,status);
    const roleIds=operation==='roles'&&status===200&&Array.isArray(body)?body.map(role=>role.id):[];
    assert(requestedUserIds.length<=4096&&orgIds.length<=4096&&roleIds.length<=4096);assert([...requestedUserIds,...orgIds,...roleIds].every(id=>uuid.test(id)));
    assert.equal(new Set(requestedUserIds).size,requestedUserIds.length);
    const result={database,readOnly:true,requestedUserIds,requestedOrgIds:orgIds,requestedRoleIds:roleIds,users:[],organizations:[],roles:[],startedAt:new Date().toISOString()};
    if(!requestedUserIds.length&&!orgIds.length&&!roleIds.length)return {...result,finishedAt:new Date().toISOString()};
    const client=makeClient({host:'127.0.0.1',port:15432,database,user:'poms_r2d_app',password:env.DB_PASSWORD,connectionTimeoutMillis:5000,query_timeout:10000,application_name:'poms-r2d-http-response-observer'});
    let transaction=false;
    try{
        await client.connect();await verifyConnection(client,database);await client.query('BEGIN READ ONLY');transaction=true;
        const found=await client.query('select to_jsonb(u) as data from poms.platform_user u where u.id=any($1::uuid[])',[requestedUserIds]);
        const byId=new Map(found.rows.map(row=>[row.data.id,row.data]));assert.equal(byId.size,requestedUserIds.length);assert.equal(found.rows.length,requestedUserIds.length);
        result.users=requestedUserIds.map(id=>byId.get(id));
        const orgs=await client.query('select to_jsonb(o) as data from poms.org_unit o where o.id=any($1::uuid[])',[orgIds]);
        const orgMap=new Map(orgs.rows.map(row=>[row.data.id,row.data]));assert.equal(orgMap.size,orgIds.length);assert.equal(orgs.rows.length,orgIds.length);
        result.organizations=orgIds.map(id=>orgMap.get(id));
        const roles=await client.query('select to_jsonb(r) as data from poms.role r where r.id=any($1::uuid[])',[roleIds]);
        const roleMap=new Map(roles.rows.map(row=>[row.data.id,row.data]));assert.equal(roleMap.size,roleIds.length);assert.equal(roles.rows.length,roleIds.length);
        result.roles=roleIds.map(id=>roleMap.get(id));
        return {...result,finishedAt:new Date().toISOString()};
    }finally{try{if(transaction)await client.query('ROLLBACK');}finally{await client.end();}}
}
export function sanitizedResponse(response){
    return {status:response.status,body:response.body,contentType:response.contentType,bodyByteLength:response.bodyByteLength,headers:response.headers,setCookieCount:response.setCookie.length};
}
export function validateHeadReference(row){
    assert.equal(row.method,'HEAD');assert(row.headReference,'Same-backend actual GET reference required');
    const reference=row.headReference;
    assert.equal(row.wire.bodyByteLength,0,'HEAD body must be empty');assert.equal(row.response,null);assert.equal(row.wire.body,null);
    assert.equal(row.status,reference.status,'HEAD/GET status');assert.equal(row.wire.status,row.status);
    assert.equal(Number(reference.headers['content-length']),reference.bodyByteLength,'Actual GET declared length must match its bytes');
    const unmatched=/^head:(profile|owner-reference|list|detail):(two-trailing-slashes|encoded-api)$/.exec(row.id);
    if(unmatched){
        assert.equal(row.group,'head');assert.equal(row.operation,unmatched[1]);assert.equal(row.status,404);
        const canonical=unmatched[2]==='two-trailing-slashes'?row.route.slice(0,-2):row.route.replace(/^\/%61pi\//,'/api/');
        const staticRoute={profile:'/api/auth/profile','owner-reference':'/api/platform/owner-reference',list:'/api/platform/users'}[row.operation];
        if(staticRoute)assert.equal(canonical,staticRoute);
        else{assert(canonical.startsWith('/api/platform/users/'));assert(uuid.test(canonical.slice('/api/platform/users/'.length)));}
        assert.equal(row.route,unmatched[2]==='two-trailing-slashes'?canonical+'//':canonical.replace('/api/','/%61pi/'),'Exact declared unmatched HEAD route');
        // Actual original finalhandler2.1.1 constructs a method-specific HTML
        // representation, then suppresses the body for HEAD. Only the eight
        // declared unmatched HEAD probes use this policy; matched GET handlers
        // retain the ordinary same-GET byte equality below.
        const html=method=>'<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot '+method+' '+row.route+'</pre>\n</body>\n</html>\n';
        const getBody=html('GET'),headBody=html('HEAD'),type='text/html; charset=utf-8';
        assert.equal(reference.body,getBody,'Complete original GET finalhandler representation');
        assert.equal(reference.bodyByteLength,Buffer.byteLength(getBody));
        const headers=method=>({'content-type':type,'content-length':String(Buffer.byteLength(method==='GET'?getBody:headBody)),'content-security-policy':"default-src 'none'",'x-content-type-options':'nosniff'});
        assert.equal(reference.contentType,type);assert.equal(row.wire.contentType,type);
        assert.deepEqual(reference.headers,headers('GET'));assert.deepEqual(row.wire.headers,headers('HEAD'),'Exact HEAD finalhandler representation length and security headers');
        assert.equal(reference.setCookieCount,0);assert.equal(row.wire.setCookieCount,0);
        return 'finalhandler-not-found';
    }
    assert.equal(row.wire.headers['content-length'],reference.headers['content-length'],'HEAD versus same-backend actual GET byte length');
    assert.equal(Number(row.wire.headers['content-length']),reference.bodyByteLength,'HEAD declared length equals actual GET bytes');
    return 'get-handler';
}
function assertCredentialStability(before,after){
    const previous=new Map(before.local_credential.map(row=>[row.user_id,row]));
    assert.equal(after.local_credential.length,previous.size,'R2D HTTP routes do not create credentials');
    for(const row of after.local_credential)assert.deepEqual(row,previous.get(row.user_id),'Existing credentials remain unchanged');
    for(const table of ['audit_log','security_event']){
        const remaining=new Map(after[table].map(row=>[row.id,row]));
        for(const row of before[table])assert.deepEqual(remaining.get(row.id),row,'Prior audit/security rows are immutable');
    }
}
// Captures are attempted independently. An HTTP result survives post-response
// fixture/observer failure and can never acquire an observed label by accident.
export async function captureHttpObservation({row,send,captureAfter,captureResponseFacts,afterResponse=async()=>undefined,verify=()=>undefined}){
    let firstError;row.captureErrors=[];
    const failure=(phase,error)=>{firstError??=error;row.failurePhase??=phase;row.captureErrors.push({phase,name:error.name});};
    try{
        const response=await send();Object.assign(row,{status:response.status,response:response.body,wire:sanitizedResponse(response)});
        try{await afterResponse(response);}catch(error){failure('after-response-action',error);}
    }catch(error){failure('http-request',error);}
    for(const [key,capture]of [['afterState',captureAfter],['responseFacts',captureResponseFacts]]){
        try{row[key]=await capture();}catch(error){failure(key,error);}
    }
    if(!firstError)try{verify();}catch(error){failure('assertions',error);}
    row.finishedAt=new Date().toISOString();row.result=firstError?'capture-incomplete':'observed';
    if(firstError)throw firstError;
    return row;
}
export async function runHttpCompat({backend,serverReceiptFile,tag='01'}){
    assert(['nest','rust'].includes(backend));assert(/^[a-z0-9][a-z0-9-]{0,39}$/.test(tag));
    assert.equal(process.env.POMS_E2E_MODE,'managed-'+backend);assert.equal(process.env.POMS_E2E_ENV_PROFILE,'r2d');
    const managed=loadManagedEnvironment({mode:'managed-'+backend}),origin='http://'+managed.host+':'+managed.port;
    const receiptBytes=readFileSync(belowEvidence(serverReceiptFile));
    const serverReceipt={file:serverReceiptFile,sha256:digest(receiptBytes),value:validateServerReceipt(JSON.parse(receiptBytes),backend,origin)};
    const output=belowEvidence('tmp/rust-r2d/http-'+process.platform+'-'+backend+'-'+tag+'.json');assert(!existsSync(output),'Preserve earlier HTTP reports');
    const runId=randomUUID(),golden=frozenGolden(),coverage=httpCoverageManifest(golden);
    const report={formatVersion:1,result:'pending',kind:'r2d-sequential-http-observation',backend,platform:process.platform,sourceHead,runId,serverReceipt,
        runtime:{node:process.version,icu:process.versions.icu},serviceOwnership:'Externally owned coordinator; runner never starts/stops services and cannot certify owner closeout',
        evidenceBoundary:coverage.boundary,coverage,observations:[],fixtureActions:[],identities:{users:{},roles:{},orgs:{}},startedAt:new Date().toISOString(),sourcesBefore:sourceFiles(),cleanupCompleted:false};
    const sessions={admin:new NavigationHttpSession(origin,runId),viewer:new NavigationHttpSession(origin,runId),none:new NavigationHttpSession(origin,runId)};
    let phase='admission',prepareAttempted=false,prepared;
    const fixture=async(action,account='none',active,extra={})=>{
        const value=await invokeFixture({formatVersion:1,runId,backend,action,account,...(active?{sessionToken:active.cookies.get('poms_session')}:{}),...extra});
        report.fixtureActions.push({action,account,...extra,matched:value.matched,changed:value.changed,state:value.state});
        return value;
    };
    const userFixture=(action,userSlot)=>fixture(action,'none',undefined,{userSlot});
    const state=async account=>{
        const value=await fixture('snapshot',account,sessions[account]);
        return {snapshot:value.snapshot,facts:value.facts};
    };
    async function observe(entry){
        phase=entry.id;
        const metadata=({id,group,operation,method})=>({id,group,operation,method});
        assert.deepEqual(metadata(entry),coverage.casePlan[report.observations.length],'Exact predeclared next case before any mutation');
        const account=entry.account??'admin',monitorAccount=account==='none'?'admin':account;
        const options={...entry.options,...(entry.json===undefined?{}:{json:entry.json})};
        const wire=wireRequest(sessions[account],entry.method,entry.route,options);
        const row={...metadata(entry),account,monitorAccount,due:entry.due??false,route:entry.route,result:'capture-incomplete',request:options,...(entry.httpEntry?{httpEntry:entry.httpEntry}:{}),...(entry.expectedStatus===undefined?{}:{expectedStatus:entry.expectedStatus}),
            sent:{method:entry.method,rawPath:entry.route,bodySha256:wire.body?digest(wire.body):null,bodyByteLength:wire.body?.length??0},startedAt:new Date().toISOString()};
        report.observations.push(row);
        for(const action of entry.before??[]){
            const {action:name,account:actor,...extra}=action;await fixture(name,actor??'none',undefined,extra);
        }
        await fixture(entry.due?'session-due':'session-non-due',monitorAccount,sessions[monitorAccount]);
        row.beforeState=await state(monitorAccount);
        if(entry.createSlot)await userFixture('user-plan',entry.createSlot);
        await captureHttpObservation({row,
            send:async()=>{
                if(entry.method==='HEAD'){
                    const reference=await requestWire(sessions[account],'GET',entry.route,options);row.headReference=sanitizedResponse(reference);
                    row.headReferenceFacts=await readResponseFacts(managed,backend,reference.body,entry.operation,reference.status,'GET');
                }
                return requestWire(sessions[account],entry.method,entry.route,options);
            },
            afterResponse:async()=>{
                if(entry.createSlot){row.adoption=await userFixture('user-adopt',entry.createSlot);if(row.adoption.user.userId)report.identities.users[entry.createSlot]=row.adoption.user.userId;}
            },
            captureAfter:()=>state(monitorAccount),
            captureResponseFacts:()=>readResponseFacts(managed,backend,row.response,entry.operation,row.status,entry.method),
            verify:()=>{
                if(entry.expectedStatus!==undefined)assert.equal(row.status,entry.expectedStatus,entry.id);
                validateProjection(row.response,entry.operation,row.status,entry.method);
                assertCredentialStability(row.beforeState.facts,row.afterState.facts);
                if(entry.group==='dto-rejected-wire'){
                    const expected=rejectedDtoHttpExpectation(entry);
                    assert.equal(row.httpEntry,expected.entry);assert.equal(row.status,expected.status);
                    assert.deepEqual(row.response,expected.response,'Complete original '+expected.entry+' HTTP error payload');
                }
                if(entry.method==='HEAD'){
                    validateHeadReference(row);
                }
            }
        });
        return row;
    }
    try{
        validateSource();assertSourceGuard();phase='prepare';prepareAttempted=true;
        prepared=await fixture('prepare');report.fixture=prepared.fixture;
        for(const account of ['admin','viewer']){await sessions[account].login(account);report.identities[account]=sessions[account].userId;}
        for(const role of prepared.fixture.roles)report.identities.roles[role.slot]=role.id;
        for(const org of prepared.fixture.orgs)report.identities.orgs[org.slot]=org.id;
        const spec=userFixtureSpec(runId,'u000');
        const created=await observe({id:'create:target',group:'business',operation:'create',method:'POST',route:'/api/platform/users',
            createSlot:'u000',json:{username:spec.username,displayName:spec.displayName,primaryOrgUnitId:null,initialRoleIds:[]},expectedStatus:201});
        assert(created.adoption.user.userId);report.identities.missingUser=randomUUID();
        const binding={userId:created.adoption.user.userId,roleId:report.identities.roles.alpha,orgId:report.identities.orgs.alpha,viewerOrgId:report.identities.orgs.viewer,
            inactiveRoleId:report.identities.roles.inactive,inactiveOrgId:report.identities.orgs.inactive,username:spec.username,displayName:spec.displayName,missingUserId:report.identities.missingUser};
        for(const entry of sequentialCases(binding,golden))await observe(entry);
        validateSource();assertSourceGuard();report.sourcesAfter=sourceFiles();assert.deepEqual(report.sourcesAfter,report.sourcesBefore,'HTTP source epoch changed');
        assertCompleteHttpCoverage(report,golden);report.coverageComplete=true;report.result='observed';
    }catch(error){report.result='fail';report.failurePhase=phase;report.failureReason=error.name;}
    finally{
        if(prepareAttempted){
            try{
                report.cleanup=await fixture('cleanup');report.zeroResidual=await fixture('cleanup');
                assert.equal(report.zeroResidual.matched,0);assert.equal(report.zeroResidual.changed,0);report.cleanupCompleted=true;
            }catch{report.cleanupFailure=true;report.result='fail';}
        }
        try{report.sourcesAfter=sourceFiles();report.sourcesUnchanged=JSON.stringify(report.sourcesAfter)===JSON.stringify(report.sourcesBefore);assert(report.sourcesUnchanged);}
        catch{report.sourcesUnchanged=false;report.result='fail';}
        report.finishedAt=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    }
    return {output,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    assert([4,5].includes(process.argv.length),'Usage: http-compat.mjs <nest|rust> <tmp/rust-r2d/server-receipt.json> [tag]');
    const {report,output}=await runHttpCompat({backend:process.argv[2],serverReceiptFile:process.argv[3],tag:process.argv[4]??'01'});
    console.log(JSON.stringify({result:report.result,output,runId:report.runId,cases:report.observations.length,cleanupCompleted:report.cleanupCompleted,failurePhase:report.failurePhase,failureReason:report.failureReason}));
    if(report.result!=='observed')process.exitCode=1;
}
