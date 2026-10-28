import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {databaseClient} from './database-client.mjs';
import {executeBatchFixture} from './batch-fixture.mjs';
import {NavigationHttpSession} from './http-client.mjs';
import {analyzeSql,parseSqlJsonl} from '../rust-r2c/witness-sql.mjs';
import {sourceHead,validateSource} from './fixture-guard.mjs';
const [receiptFile,tag]=process.argv.slice(2);assert.equal(process.argv.length,4);assert.equal(process.platform,'linux');assert(/^[a-z0-9-]{1,35}$/.test(tag));validateSource();
const receipt=JSON.parse(readFileSync(receiptFile));assert.equal(receipt.backend,'nest');assert.equal(receipt.sourceHead,sourceHead);assert.equal(receipt.origin,'http://127.0.0.1:5500');process.kill(receipt.pid,0);
const dir=path.resolve('tmp/rust-r2ef/witness',receipt.tag),runId=randomUUID(),out=`tmp/rust-r2ef/nest-sql-${tag}.json`;assert(!existsSync(out));
const planFile=path.join(dir,'plan.json'),sqlFile=path.join(dir,'sql.jsonl');if(existsSync(planFile))assert.deepEqual(JSON.parse(readFileSync(planFile)),{caseId:'idle'});
writeFileSync(`tmp/rust-r2ef/nest-sql-${tag}-runner.mjs`,readFileSync(import.meta.filename),{flag:'wx',mode:0o600});
const report={formatVersion:1,sourceHead,runId,tag,receiptFile,receiptSha256:createHash('sha256').update(readFileSync(receiptFile)).digest('hex'),node:process.version,result:'pending',cases:[],cleanup:[],startedAt:new Date().toISOString()};
let client,prepared,failed=false;const sessions={},key='attachment.max-upload-size-mb';
const request=(action,account='none',extra={})=>({formatVersion:1,backend:'nest',runId,action,account,...extra});
const safe=error=>({name:error.name,...(/^[a-z_]+$|^[0-9A-Z]{5}$/.test(error.code??'')?{code:error.code}:{}),...(error.name==='AssertionError'?{assertion:String(error.message).slice(0,300)}:{})});
const writePlan=value=>{const tmp=planFile+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});renameSync(tmp,planFile);};
const hashToken=session=>createHash('sha256').update(session.cookies.get('poms_session')).digest('hex');
async function sessionRow(session){const r=await client.query('select id::text,user_id::text,row_version,status,last_seen_at::text,idle_expires_at::text,absolute_expires_at::text,updated_at::text from poms.auth_session where user_id=$1 and token_hash=$2',[session.userId,hashToken(session)]);assert.equal(r.rows.length,1);return r.rows[0];}
async function freshness(account,due){return executeBatchFixture(client,request(due?'session-due':'session-non-due',account,{sessionHash:hashToken(sessions[account])}));}
async function facts(){return (await executeBatchFixture(client,request('facts'))).extension;}
async function one(id,account,method,route,options,expectedStatus,{due=false,check=()=>undefined}={}){
    await freshness(account,due);const session=sessions[account],before=await facts(),beforeSession=await sessionRow(session);
    const captureCaseId=runId+':'+id;const row={id,captureCaseId,account,method,route,request:options,expectedStatus,before,beforeSession,result:'pending',startedAt:new Date().toISOString()};report.cases.push(row);writePlan({caseId:captureCaseId});
    try{const response=await session.request(method,route,options);row.response={status:response.status,body:response.body,contentType:response.contentType};row.afterSession=await sessionRow(session);row.after=await facts();
        row.sql= parseSqlJsonl(readFileSync(sqlFile,'utf8')).filter(e=>e.caseId===captureCaseId);row.analysis=analyzeSql(row.sql);assert.equal(response.status,expectedStatus,'original HTTP status');
        assert(row.sql.every(e=>e.workerPid===receipt.pid&&Number.isSafeInteger(e.backendPid)&&e.backendPid>0),'Actual worker and PG backend identity');
        await check(row);row.result='observed';console.log(JSON.stringify({id,status:response.status,transactions:row.analysis.transactions.map(t=>({outcome:t.outcome,statements:t.statements.map(s=>s.statement)}))}));
    }catch(error){row.result='fail';row.error=safe(error);throw error;}finally{row.finishedAt=new Date().toISOString();writePlan({caseId:'idle'});}
}
const writes=(row,table,command)=>row.analysis.completed.filter(q=>q.command===command&&q.relations.includes(table));
const managed=row=>writes(row,'auth_session','UPDATE').filter(q=>/where .*row_version\s*=/i.test(q.sqlShape.replaceAll('"','')));
const businessAndAudit=row=>{
    const first=row.analysis.transactions.find(t=>t.statements.some(s=>s.relations.includes('system_setting')&&['UPDATE','INSERT'].includes(s.command))||t.statements.some(s=>s.relations.includes('auth_session')&&s.command==='UPDATE'));
    const audit=row.analysis.transactions.find(t=>t.statements.some(s=>s.relations.includes('audit_log')&&s.command==='INSERT'));assert(first&&audit&&first!==audit,'independent business/session and audit flushes');assert(first.endQueryId<audit.beginQueryId);assert.equal(audit.statements.filter(s=>s.relations.includes('auth_session')).length,0,'second flush cannot consume first pending session');
};
try{
    client=await databaseClient('nest');prepared=await executeBatchFixture(client,request('prepare'));for(const account of ['admin','viewer']){sessions[account]=new NavigationHttpSession(receipt.origin,runId);await sessions[account].login(account);}
    const ext=prepared.extension,item='/api/dictionaries/'+ext.dictionaryUpdateId;
    await one('dictionary-create-due','admin','POST','/api/dictionaries',{json:{domain:'lead-source',code:ext.eCreatedCode,name:'SQL Created'}},201,{due:true,check(row){const insert=writes(row,'dictionary_item','INSERT')[0],update=managed(row)[0];assert(insert&&update&&insert.sequence<update.sequence,'original CREATE precedes pending session UPDATE');assert.equal(row.analysis.transactions.length,1);}});
    await one('dictionary-dirty-due','admin','PATCH',item,{json:{name:'SQL Updated',description:null,sortOrder:102}},200,{due:true,check(row){assert.equal(writes(row,'dictionary_item','UPDATE').length,1);assert.equal(managed(row).length,1);}});
    await one('dictionary-noop-due','admin','PATCH',item,{json:{name:'SQL Updated',description:null,sortOrder:102}},200,{due:true,check(row){assert.equal(writes(row,'dictionary_item','UPDATE').length,0);assert.equal(managed(row).length,1);assert.equal(row.analysis.transactions.length,1);}});
    await one('dictionary-noop-non-due','admin','PATCH',item,{json:{name:'SQL Updated',description:null,sortOrder:102}},200,{check(row){assert.equal(writes(row,'dictionary_item','UPDATE').length,0);assert.equal(managed(row).length,0);assert.equal(row.analysis.transactions.length,0);}});
    await one('setting-dirty-due','admin','PATCH','/api/platform/system-settings/'+key,{json:{value:123}},200,{due:true,check(row){assert.equal(writes(row,'system_setting','UPDATE').length,1);assert.equal(managed(row).length,1);businessAndAudit(row);}});
    await one('setting-noop-due','admin','PATCH','/api/platform/system-settings/'+key,{json:{value:123}},200,{due:true,check(row){assert.equal(writes(row,'system_setting','UPDATE').length,0);assert.equal(managed(row).length,1);businessAndAudit(row);}});
    await one('setting-noop-non-due','admin','PATCH','/api/platform/system-settings/'+key,{json:{value:123}},200,{check(row){assert.equal(writes(row,'system_setting','UPDATE').length,0);assert.equal(managed(row).length,0);assert.equal(writes(row,'audit_log','INSERT').length,1);assert.equal(row.analysis.transactions.length,1);}});
    await one('setting-audit-storage-failure','admin','PATCH','/api/platform/system-settings/'+key,{json:{value:124},requestId:'x'.repeat(65)},500,{due:true,check(row){assert.equal(row.after.settings.value_json,124);assert.equal(row.after.settings.row_version,row.before.settings.row_version+1);const attempted=writes(row,'audit_log','INSERT');assert.equal(attempted.length,1);assert.equal(attempted[0].phase,'error');assert.equal(attempted[0].code,'22001');assert(row.analysis.transactions.some(t=>t.outcome==='COMMIT'&&t.statements.some(s=>s.relations.includes('system_setting'))));assert(row.analysis.transactions.some(t=>t.outcome==='ROLLBACK'&&t.statements.some(s=>s.relations.includes('audit_log'))));}});
    await one('route-denied-due','viewer','POST','/api/security-events:recordRouteDenied',{json:{path:'/r2ef/sql/'+runId,requiredPermissions:['project:read']}},202,{due:true,check(row){const insert=writes(row,'security_event','INSERT')[0],update=managed(row)[0];assert(insert&&update&&insert.sequence<update.sequence);assert.equal(row.analysis.transactions.length,1);assert.equal(row.after.securityEvents.length,row.before.securityEvents.length+1);}});
    await one('route-denied-non-due','viewer','POST','/api/security-events:recordRouteDenied',{json:{path:'/r2ef/sql/'+runId,requiredPermissions:['project:read']}},202,{check(row){assert.equal(managed(row).length,0);assert.equal(writes(row,'security_event','INSERT').length,1);}});
    await executeBatchFixture(client,request('setting-absent'));
    writePlan({caseId:'setting-absent-read'});const absent=await sessions.admin.request('GET','/api/platform/system-settings/'+key);assert.equal(absent.status,200);assert.equal(absent.body.value,50);assert.equal(absent.body.rowVersion,0);assert.equal(absent.body.updatedAt,null);assert.equal((await facts()).settings,null);report.absentRead={status:absent.status,body:absent.body,storedRow:null};
    await one('setting-create-due','admin','PATCH','/api/platform/system-settings/'+key,{json:{value:125,expectedVersion:0}},200,{due:true,check(row){assert.equal(row.response.body.rowVersion,1);const insert=writes(row,'system_setting','INSERT')[0],update=managed(row)[0];assert(insert&&update&&insert.sequence<update.sequence);businessAndAudit(row);const audit=row.after.audits.filter(a=>!row.before.audits.some(b=>b.id===a.id));assert.equal(audit.length,1);assert.equal(audit[0].before_snapshot,null);}});
    report.result='observed';
}catch(error){failed=true;report.result='fail';report.error=safe(error);console.log(JSON.stringify({error:report.error}));}
finally{
    writePlan({caseId:'cleanup'});
    for(const [account,session] of Object.entries(sessions))try{const r=await session.request('POST','/api/auth/session:logout',{json:{}});report.logouts??=[];report.logouts.push({account,status:r.status});}catch{failed=true;}finally{session.cookies.clear();}
    if(client){for(let pass=0;pass<2;pass++)try{const r=await executeBatchFixture(client,request('cleanup'));report.cleanup.push({pass,result:r});assert.equal(r.state,'cleaned');assert.equal(r.extension.zero,true);if(pass===1){assert.equal(r.matched,0);assert.equal(r.changed,0);}}catch(error){failed=true;report.cleanup.push({pass,error:safe(error)});}await client.end();}
    writePlan({caseId:'idle'});if(failed)report.result='fail';report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,cases:report.cases.length,output:out}));
}if(failed)process.exitCode=1;
