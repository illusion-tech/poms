import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {OwnedFixture} from './owned-fixture.mjs';
import {NavigationHttpSession} from './http-client.mjs';
import {analyzeSql,parseSqlJsonl} from '../rust-r2c/witness-sql.mjs';
const [receiptFile,upstreamFile,tag]=process.argv.slice(2);assert.equal(process.argv.length,5);assert(/^[a-z0-9-]{1,35}$/.test(tag));
const receipt=JSON.parse(readFileSync(receiptFile)),upstream=JSON.parse(readFileSync(upstreamFile));assert.equal(receipt.backend,'nest');process.kill(receipt.pid,0);process.kill(upstream.pid,0);
const out=`tmp/rust-r2gh/nest-edge-${tag}.json`;assert(!existsSync(out));const runId=randomUUID(),sha=value=>createHash('sha256').update(value).digest('hex');
const planFile=path.resolve('tmp/rust-r2gh/witness',receipt.tag,'plan.json'),sqlFile=path.resolve('tmp/rust-r2gh/witness',receipt.tag,'sql.jsonl');
const writePlan=(file,value)=>{const temp=file+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});renameSync(temp,file);};
const safeRoute=value=>{const url=new URL(value,'http://127.0.0.1');for(const key of ['state','code','ticket'])if(url.searchParams.has(key))url.searchParams.set(key,'[sha256:'+sha(url.searchParams.get(key))+']');return url.pathname+url.search+url.hash;};
const sanitize=value=>{if(Array.isArray(value))return value.map(sanitize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,typeof item==='string'&&(/encrypted/i.test(key)||/^(?:ticket|state|accessToken|refreshToken|ticket_hash|ticketHash)$/i.test(key))?{sanitized:true,length:item.length,sha256:sha(item)}:typeof item==='string'&&/authorizeUrl|authorizationUrl|location/.test(key)?safeRoute(item):sanitize(item)]));return value;};
const report={formatVersion:1,kind:'original-Nest-edge-HTTP-SQL-PG',tag,runId,node:process.version,result:'pending',receiptFile,receiptSha256:sha(readFileSync(receiptFile)),cases:[],cleanup:[],startedAt:new Date().toISOString(),boundary:'Real original Nest HTTP/SQL/isolated PG with controlled upstream; sensitive protocol values compared in memory and only sanitized receipts persisted'};
let fixture,admin,context;
async function one(id,session,method,route,options,expected,{due=false,after=()=>undefined}={}){
    const caseId=runId+':'+id;writePlan(planFile,{caseId});if(due)await fixture.base('session-due','admin',{sessionHash:sha(admin.cookies.get('poms_session'))});
    const before=sanitize(await fixture.facts()),row={id,caseId,method,route:safeRoute(route),request:sanitize(options),before,result:'pending'};report.cases.push(row);
    const response=await session.request(method,route,options);await after(response);
    row.response={status:response.status,body:sanitize(response.body),contentType:response.contentType,vary:response.vary,location:response.location?safeRoute(response.location):null};row.after=sanitize(await fixture.facts());row.sql=parseSqlJsonl(readFileSync(sqlFile,'utf8')).filter(row=>row.caseId===caseId);row.analysis=analyzeSql(row.sql);
    if(expected!==null)assert.equal(response.status,expected,`${id} original status`);row.result='observed';writePlan(planFile,{caseId:'idle'});console.log(JSON.stringify({id,status:response.status,transactions:row.analysis.transactions.length}));return response;
}
try{
    fixture=await OwnedFixture.connect('nest',runId);context=await fixture.prepare();admin=new NavigationHttpSession(receipt.origin,runId);await admin.login('admin');const compact=runId.replaceAll('-',''),provider=context.providerId,user=admin.userId;
    const plan={formatVersion:1,caseId:runId+':oauth',appId:context.clientId,secretSha256:sha(`synthetic-gh-secret-${compact}`),subject:context.subject,code:'gh-synthetic-code',tree:{}};writePlan(upstream.planFile,plan);
    await fixture.plan('binding','external_identity',{identity_provider_config_id:provider,poms_user_id:user,subject_id:context.subject},2);
    const binding=await one('g-bind-create-due',admin,'POST',`/api/platform/users/${user}/external-identities`,{json:{identityProviderConfigId:provider,subjectId:context.subject,subjectDisplayName:'GH bound user'}},201,{due:true,after:()=>fixture.adopt('binding')});
    const bindingId=binding.body.id;
    const grantAuthorize=await one('g-grant-authorize-due',admin,'GET',`/api/platform/identity-provider-oauth-grants/${provider}:authorize`,{},200,{due:true});
    const grantState=new URL(grantAuthorize.body.authorizeUrl).searchParams.get('state');assert(grantState);
    await fixture.plan('grant','identity_provider_oauth_grant',{identity_provider_config_id:provider,poms_user_id:user},1);
    const publicSession=new NavigationHttpSession(receipt.origin,runId);
    await one('g-grant-public-callback',publicSession,'GET','/api/platform/identity-provider-oauth-grants:callback?'+new URLSearchParams({code:plan.code,state:grantState}),{rawHeaders:['Accept','application/json']},200,{after:()=>fixture.adopt('grant')});
    await one('g-search-due',admin,'GET',`/api/platform/identity-providers/${provider}/external-users?`+new URLSearchParams({q:'GH a+b $:[],',limit:'5'}),{},200,{due:true});
    await fixture.plan('tickets','external_login_ticket',{identity_provider_config_id:provider,external_identity_id:bindingId,poms_user_id:user},10);
    async function issue(id){const auth=await one(id+'-authorize',publicSession,'GET',`/api/auth/identity-providers/${provider}:authorize`,{},200);const state=new URL(auth.body.authorizeUrl).searchParams.get('state');return one(id+'-callback',publicSession,'GET','/api/auth/identity-providers:callback?'+new URLSearchParams({code:plan.code,state}),{},200,{after:()=>fixture.adopt('tickets')});}
    const issued=await issue('g-login');await publicSession.request('GET','/api/auth/csrf-token');
    await one('g-ticket-consume',publicSession,'POST','/api/auth/external-login-sessions',{json:{ticket:issued.body.ticket}},200);
    await one('g-ticket-reconsume',publicSession,'POST','/api/auth/external-login-sessions',{json:{ticket:issued.body.ticket}},401);
    const issuedInactive=await issue('g-login-inactive');await fixture.base('disable','admin');const fresh=new NavigationHttpSession(receipt.origin,runId);await fresh.request('GET','/api/auth/csrf-token');
    await one('g-ticket-consume-disabled-user',fresh,'POST','/api/auth/external-login-sessions',{json:{ticket:issuedInactive.body.ticket}},401);await fixture.base('restore','admin');
    await one('g-unbind-due',admin,'POST',`/api/platform/external-identities/${bindingId}:unbind`,{json:{}},200,{due:true});
    await one('g-bind-reactivate-due',admin,'POST',`/api/platform/users/${user}/external-identities`,{json:{identityProviderConfigId:provider,subjectId:context.subject}},201,{due:true});
    const lone='GH lone '+String.fromCharCode(0xd800);
    await one('g-scalar-lone-surrogate-audit',admin,'PATCH',`/api/platform/identity-providers/${provider}`,{json:{displayName:lone}},500,{due:true});
    await one('g-scalar-recover-normal',admin,'PATCH',`/api/platform/identity-providers/${provider}`,{json:{displayName:'GH normal after lone'}},200);
    await one('g-jsonb-lone-surrogate',admin,'PATCH',`/api/platform/identity-providers/${provider}`,{json:{loginScopes:[String.fromCharCode(0xd800)]}},500,{due:true});
    await fixture.plan('source','external_org_source',{provider_config_id:provider,external_tenant_id:context.tenant},1);
    const source=await one('h-source-create',admin,'POST','/api/platform/external-org-sources',{json:{provider:'feishu',externalTenantId:context.tenant,displayName:'GH mapping source',providerConfigId:provider,authoritativeOrgUnitId:context.rootId}},201,{after:()=>fixture.adopt('source')});const sourceId=source.body.id;
    await fixture.plan('mappings','external_department_mapping',{source_id:sourceId},10);
    const item={externalDepartmentId:'gh-overlap',externalDepartmentName:'GH original',externalSnapshot:{controlled:true}};
    await one('h-replace-initial',admin,'PUT',`/api/platform/external-org-sources/${sourceId}/department-mappings`,{json:{items:[item]}},200,{due:true,after:()=>fixture.adopt('mappings')});
    await one('h-replace-overlap',admin,'PUT',`/api/platform/external-org-sources/${sourceId}/department-mappings`,{json:{items:[{...item,externalDepartmentName:'GH replaced'}]}},null,{due:true,after:()=>fixture.adopt('mappings')});
    await one('h-jsonb-lone-surrogate',admin,'PATCH',`/api/platform/external-org-sources/${sourceId}`,{json:{syncScopes:[String.fromCharCode(0xd800)]}},500,{due:true});
    await one('h-scalar-lone-surrogate-audit',admin,'PATCH',`/api/platform/external-org-sources/${sourceId}`,{json:{displayName:lone}},500,{due:true});
    report.fixture=fixture.receipt();report.result='pass';
}catch(error){report.result='fail';report.failureType=error.name;if(error.name==='AssertionError')report.assertion=String(error.message).slice(0,800);process.exitCode=1;}
finally{writePlan(planFile,{caseId:'idle'});writePlan(upstream.planFile,{formatVersion:1,caseId:'idle'});if(fixture){try{report.cleanup.push(await fixture.cleanup());report.cleanup.push(await fixture.cleanup());assert.equal(report.cleanup[1].zero,true);}catch(error){report.cleanupFailure={type:error.name,assertion:error.name==='AssertionError'?error.message:undefined};report.result='fail';process.exitCode=1;}finally{await fixture.close();}}report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,out,cases:report.cases.length,assertion:report.assertion,cleanupFailure:report.cleanupFailure,cleanup:report.cleanup.map(row=>({changed:row.changed,zero:row.zero}))}));}
