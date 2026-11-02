// Root actual corrective witness: legal UTF-16 error echoes and ASCII-only F codes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {HttpSession} from './wire-client.mjs';
import {buildCostRequest} from '../../docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs';
const root=process.cwd(),state='/home/wangzishi/.local/share/poms-r3cdefg',priv=state+'/private';
assert.equal(root,'/home/wangzishi/projects/poms-rust-r3cdefg');
const [backend,tag,attempt='01']=process.argv.slice(2);
assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]+$/.test(tag)&&/^\d{2}$/.test(attempt));
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const core=JSON.parse(fs.readFileSync(`tmp/rust-r3cdefg/semantics-${tag}-${backend}/report01.json`)),runId=core.runId;
const context=JSON.parse(fs.readFileSync(priv+'/acceptance-'+runId+'/context.json'));
const runtime=JSON.parse(fs.readFileSync(priv+'/'+backend+'-'+tag+'.json'));
const out=`tmp/rust-r3cdefg/raw-errors-${tag}-${backend}-${attempt}`,directory=priv+'/acceptance-'+runId+'/raw-errors'+attempt;
assert(!fs.existsSync(out)&&!fs.existsSync(directory));fs.mkdirSync(out,{recursive:true});fs.mkdirSync(directory,{mode:0o700});
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}};
const sources=['tools/rust-r3cdefg/raw-errors.mjs','tools/rust-r3cdefg/wire-client.mjs','apps/poms-api-rust/src/project_technical_cost/service.rs','apps/poms-api-rust/src/project_technical_cost/http.rs'].map(pin);
const db=new Client({host:'127.0.0.1',port:22432,database:context.database,user:'poms_r0e_owner',password:fs.readFileSync(priv+'/owner-password','utf8'),application_name:'poms-r3cdefg-raw-error-correction',query_timeout:20000});
await db.connect();assert.equal((await db.query('select instance_id::text id from r3cdefg_control.marker')).rows[0].id,core.marker);
const client=new HttpSession('http://127.0.0.1:'+(backend==='nest'?12100:12200),{journal:directory+'/raw-wire',label:'admin'}),actor=context.actors.find(x=>x.label==='admin');
const events=[],observations=[];let completed=false,error=null;
const units=s=>Array.from({length:s.length},(_,i)=>s.charCodeAt(i));
try {
 await client.login(actor.username,actor.password);
 const customerId=core.created.customer[0];
 for(const [label,currency,match] of [
  ['high','A\ud800B',false],['low','A\udc00B',false],['astral','A😀B',false],['ascii','USD',false],
  ['nul','A\u0000B',false],['quote','A"B',false],['slash','A\\B',false],
  ['trim-high',' \tA\ud800B\u00a0',false],['matched-high','A\ud800B',true],['matched-low','A\udc00B',true],['matched-astral','A😀B',true],
 ]) {
  const p=await client.request('POST','/api/projects',{json:{customerId,projectName:'R3CG raw errors '+tag+' '+attempt+' '+label}});assert.equal(p.status,201);
  const input=buildCostRequest({currencyCode:currency});if(match)input.costItems[0].currencyCode=currency;
  const HTTP=await client.request('POST',`/api/projects/${p.body.id}/technical-cost-packages`,{json:input});
  events.push({label:'cost.'+label,request:input,projectId:p.body.id,HTTP});
  const rows=(await db.query('select id::text,currency_code from poms.project_technical_cost_package where project_id=$1',[p.body.id])).rows;
  const auditCount=(await db.query('select count(*)::int n from poms.audit_log where request_id=$1',[HTTP.requestId])).rows[0].n;
  const message=HTTP.body?.message;
  observations.push({label:'cost.'+label,status:HTTP.status,requestCodeUnits:units(currency),messageCodeUnits:typeof message==='string'?units(message):null,
   originalBodyCurrency:HTTP.body?.currencyCode??null,originalItemCurrency:HTTP.body?.costItems?.[0]?.currencyCode??null,
   storedCurrencies:rows.map(r=>r.currency_code),rowCount:rows.length,auditCount});
  assert.equal(HTTP.status,match?201:400,label);assert.equal(rows.length,match?1:0,label);assert.equal(auditCount,0);
 }
 for(const [label,followUpType] of [['high','A\ud800B'],['low','A\udc00B'],['astral','A😀B']]) {
  const input={customerId,followUpType,occurredAt:'2026-11-02T00:00:00.000Z',summary:'ASCII-only dictionary negative',outcome:'progress'};
  const HTTP=await client.request('POST','/api/sales-follow-up-records',{json:input});events.push({label:'followup.'+label,request:input,HTTP});
  assert.equal(HTTP.status,400);observations.push({label:'followup.'+label,status:HTTP.status,body:HTTP.body});
 }
 completed=true;
} catch(e) {error={name:e.name,message:e.message};fs.writeFileSync(directory+'/original-error.json',JSON.stringify({...error,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}
finally {
 assert.deepEqual(sources.map(p=>pin(p.file)),sources);
 fs.writeFileSync(out+'/report01.json',JSON.stringify({kind:'R3CDEFG-actual-original-UTF16-error-correction-witness',createdAt:new Date().toISOString(),backend,tag,attempt,runId,marker:core.marker,artifactSha256:runtime.artifactSha256,sources,completed,error,events,observations,credentialsOnlyPrivate:true,comparisonNormalization:'None for fixed error bodies, code units and explicit PG currencies',cleanup:'Owned whole cohort terminal pending',G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
 await db.end();console.log(JSON.stringify({backend,tag,attempt,completed,events:events.length,error,report:out+'/report01.json'}));
}
