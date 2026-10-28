import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync,renameSync } from 'node:fs';
import path from 'node:path';
import { OwnedFixture } from './owned-fixture.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { analyzeSql,parseSqlJsonl } from '../rust-r2c/witness-sql.mjs';
const [receiptFile,upstreamStartFile,tag]=process.argv.slice(2);assert.equal(process.argv.length,5);assert(/^[a-z0-9-]{1,35}$/.test(tag));assert.equal(process.platform,'linux');
const receipt=JSON.parse(readFileSync(receiptFile)),upstream=JSON.parse(readFileSync(upstreamStartFile));assert.equal(receipt.backend,'nest');assert.equal(receipt.origin,'http://127.0.0.1:5700');process.kill(receipt.pid,0);process.kill(upstream.pid,0);
const reportFile=`tmp/rust-r2gh/nest-witness-${tag}.json`;assert(!existsSync(reportFile));
const runId=randomUUID(),sha=value=>createHash('sha256').update(value).digest('hex');
const dir=path.resolve('tmp/rust-r2gh/witness',receipt.tag),planFile=path.join(dir,'plan.json'),sqlFile=path.join(dir,'sql.jsonl');
const report={formatVersion:1,kind:'original-Nest-HTTP-SQL-PG-witness',tag,runId,node:process.version,result:'pending',receiptFile,receiptSha256:sha(readFileSync(receiptFile)),upstreamStartFile,startedAt:new Date().toISOString(),cases:[],cleanup:[],boundary:'Actual original Nest adapters over controlled loopback protocol fixture and new GH PG15; no live Feishu certification'};
const writePlan=(file,value)=>{const temporary=file+'.'+randomUUID()+'.tmp';writeFileSync(temporary,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});renameSync(temporary,file);};
const redact=value=>{if(Array.isArray(value))return value.map(redact);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/^(?:ticket|state|accessToken|refreshToken|encryptedClientSecret|encrypted_client_secret|ticket_hash|ticketHash)$/i.test(key)&&typeof item==='string'?{sanitized:true,length:item.length,sha256:sha(item)}:/authorizationUrl|authorizeUrl/.test(key)&&typeof item==='string'?(()=>{const u=new URL(item);for(const name of ['state','code'])if(u.searchParams.has(name))u.searchParams.set(name,'[sanitized]');return u.href;})():redact(item)]));return value;};
let fixture,session,context;
const facts=async()=>redact(await fixture.facts());
async function one(id,method,route,options,status,check=()=>undefined,due=false){
    const caseId=runId+':'+id;writePlan(planFile,{caseId});
    if(due)await fixture.base('session-due','admin',{sessionHash:sha(session.cookies.get('poms_session'))});
    const before=await facts(),row={id,caseId,method,route,request:redact(options),expectedStatus:status,before,result:'pending'};report.cases.push(row);
    const response=await session.request(method,route,options);
    row.response={status:response.status,body:redact(response.body),contentType:response.contentType};row.after=await facts();row.sql=parseSqlJsonl(readFileSync(sqlFile,'utf8')).filter(entry=>entry.caseId===caseId);row.analysis=analyzeSql(row.sql);
    assert.equal(response.status,status,`${id} original status`);await check(row,response);row.result='observed';writePlan(planFile,{caseId:'idle'});console.log(JSON.stringify({id,status:response.status,transactions:row.analysis.transactions.length}));return response;
}
try {
    fixture=await OwnedFixture.connect('nest',runId);context=await fixture.prepare();session=new NavigationHttpSession(receipt.origin,runId);await session.login('admin');
    const compact=runId.replaceAll('-','');
    const provider=context.providerId;
    await one('g-config-noop-due','PATCH',`/api/platform/identity-providers/${provider}`,{json:{displayName:`GH owned provider ${compact}`}},200,()=>undefined,true);
    await one('g-config-dirty-due','PATCH',`/api/platform/identity-providers/${provider}`,{json:{displayName:`GH renamed provider ${compact}`}},200,()=>undefined,true);
    await one('g-config-version-only-rejected','PATCH',`/api/platform/identity-providers/${provider}`,{json:{expectedVersion:2}},400);
    const tenant=`gh-created-${compact}`;await fixture.plan('created-provider','identity_provider_config',{tenant_id:tenant},1);
    await one('g-config-create-due','POST','/api/platform/identity-providers',{json:{provider:'feishu',tenantId:tenant,displayName:`GH created ${compact}`,clientId:`gh-created-client-${compact}`}},201,async()=>{await fixture.adopt('created-provider');},true);
    await fixture.plan('created-source','external_org_source',{external_tenant_id:context.tenant,provider_config_id:provider},1);
    const sourceResponse=await one('h-source-create-due','POST','/api/platform/external-org-sources',{json:{provider:'feishu',externalTenantId:context.tenant,displayName:`GH witness source ${compact}`,providerConfigId:provider,authoritativeOrgUnitId:context.rootId,externalRootDepartmentId:'gh-root'}},201,async()=>{await fixture.adopt('created-source');},true);
    const sourceId=sourceResponse.body.id;
    await one('h-source-activate-due','POST',`/api/platform/external-org-sources/${sourceId}:activate`,{json:{}},200,()=>undefined,true);
    const externalParent=`gh-parent-${compact}`,externalChild=`gh-child-${compact}`;
    const upstreamPlan={formatVersion:1,caseId:runId+':tree',appId:context.clientId,secretSha256:sha(`synthetic-gh-secret-${compact}`),subject:context.subject,tree:{'gh-root':[{open_department_id:externalParent,name:`GH Parent ${compact}`,parent_department_id:'gh-root',order:1}],[externalParent]:[{open_department_id:externalChild,name:`GH Child ${compact}`,parent_department_id:externalParent,order:2}],[externalChild]:[]}};
    writePlan(upstream.planFile,upstreamPlan);
    await fixture.plan('preview-run','org_sync_run',{source_id:sourceId},1);await fixture.plan('preview-mappings','external_department_mapping',{source_id:sourceId},2);await fixture.planDerived('preview-diffs','org_sync_diff_item','preview-run','run_id',2);
    const preview=await one('h-preview-due','POST',`/api/platform/external-org-sources/${sourceId}/org-sync-runs`,{json:{}},201,async()=>{await fixture.adopt('preview-run');await fixture.adopt('preview-mappings');await fixture.adopt('preview-diffs');},true);
    const syncId=preview.body.id;assert.equal(preview.body.status,'previewed');
    const diffs=await one('h-diff-list','GET',`/api/platform/org-sync-runs/${syncId}/diff-items`,{},200);
    report.originalCreateCandidates=diffs.body.map(item=>({id:item.id,action:item.action,externalDepartmentId:item.externalDepartmentId,candidateSnapshot:item.candidateSnapshot}));
    for(const [index,item] of diffs.body.entries()){if(item.action==='create_org_unit')await fixture.plan(`generated-org-${index}`,'org_unit',{code:item.candidateSnapshot.targetCode},1);}
    await one('h-apply-parent-child-due','POST',`/api/platform/org-sync-runs/${syncId}:apply`,{json:{}},200,async(row)=>{for(const intent of fixture.j.intents.filter(intent=>intent.table==='org_unit'))await fixture.adopt(intent.key);row.after=await facts();},true);
    await one('h-apply-again-rejected','POST',`/api/platform/org-sync-runs/${syncId}:apply`,{json:{}},400);
    await one('h-source-noop','PATCH',`/api/platform/external-org-sources/${sourceId}`,{json:{displayName:`GH witness source ${compact}`}},200);
    writePlan(upstream.planFile,{...upstreamPlan,caseId:runId+':readiness',mode:'readiness-unfiltered',tree:{'gh-root':[{open_department_id:'read-A',name:'Read A'},{open_department_id:'read-B',name:'Read B'}]}});
    await one('g-readiness-valid-items','POST',`/api/platform/identity-providers/${provider}:testConnection`,{json:{capability:'external-org-sync',externalRootDepartmentId:'gh-root'}},200);
    report.fixture=fixture.receipt();report.result='pass';
} catch(error){report.result='fail';report.failureType=error.name;if(error.name==='AssertionError')report.assertion=String(error.message).slice(0,1000);process.exitCode=1;}
finally {
    writePlan(planFile,{caseId:'idle'});writePlan(upstream.planFile,{formatVersion:1,caseId:'idle'});
    if(fixture){try{report.cleanup.push(await fixture.cleanup());report.cleanup.push(await fixture.cleanup());assert.equal(report.cleanup[1].zero,true);}catch(error){report.cleanupFailure={type:error.name,message:error.name==='AssertionError'?String(error.message).slice(0,500):undefined};report.result='fail';process.exitCode=1;}finally{await fixture.close();}}
    report.finishedAt=new Date().toISOString();writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,reportFile,cases:report.cases.length,cleanup:report.cleanup.map(row=>({changed:row.changed,zero:row.zero})),failureType:report.failureType,assertion:report.assertion,cleanupFailure:report.cleanupFailure}));
}
