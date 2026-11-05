// ROOT EXECUTION ONLY. Import does not connect/read private files/write objects.
// h = actual api-harness32; db = db33.connect; fault = a fresh fault-core47
// instance. Its unscoped probe is deliberately NOT used; snapshots are evidence
// infrastructure only. All active trigger predicates below are owned-row scoped.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createK78,contextFromPublic71,SHA78} from './request-driver78.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
const identifier=s=>'"'+String(s).replaceAll('"','""')+'"';
const clean=value=>JSON.parse(JSON.stringify(value));
const PINS={
 'apps/poms-api-rust/src/attachments/service.rs':'0fbd8afc1c22fec87e3034b9e31d9c89a3cfea92d85cb8f0ef1866dd23bcceab',
 'apps/poms-api-rust/src/attachments/store.rs':'525028f45ce39a5935f4a1565eee662b76a2976f07a212a580c23f862e899899',
 'apps/poms-api-rust/src/attachment_storage/registry.rs':'617f734af15f7e75db2cc69de63343c04104abbd446f322809fb1f1bfc625765',
};
export const VERTICAL7=Object.freeze(['complete-oldflag','complete-attachment-insert','complete-second-link','complete-session-completed','complete-audit','complete-deferred-audit','void-history-next-version']);

export async function createRootRunner78({h,db,fault,publicBefore71,context,runtimeEdition,selection='critical16',localRoot,withActualReadFault}={}) {
 assert.equal(process.platform,'linux');assert.equal(typeof db,'function');assert.equal(typeof fault?.snapshot,'function');
 assert.equal(h.base,'http://127.0.0.1:31341');assert(/^\d+$/.test(runtimeEdition??''),'explicit actual final runtime epoch required');
 context??=contextFromPublic71(publicBefore71,{author:h.actor('full'),tag:'k78'});
 assert.match(context.tag,/^[a-z0-9_-]{1,12}$/);assert.equal(context.environment.apiOrigin,h.base);
 for(const [file,pin] of Object.entries(PINS))assert.equal(sha(fs.readFileSync(path.join(h.win,file))),pin,'Root source must match final K98');
 const runtime=JSON.parse(fs.readFileSync(path.join(h.priv,`rust-api${runtimeEdition}-process.json`)));
 assert.equal(sha(fs.readFileSync(runtime.binary)),runtime.binarySha256,'actual runtime binary hash');
 const ctrl=await db(),observeClient=await db(),watch=await db();
 const functionName='r4def_k78_owned_'+context.tag;let registered=false;
 try {
 const {rows:[identity]}=await observeClient.query("SELECT current_database() AS database,instance_id,(SELECT count(*)::int FROM poms.poms_migrations) AS migration_count FROM r4def_control.marker");
 assert.equal(identity.database,'poms_r4def_rust');assert.equal(identity.instance_id,context.environment.instanceId);assert.equal(identity.migration_count,94);
 const folder=path.join(h.win,'tmp/rust-r4def/root/K78-'+context.tag),privateFolder=path.join(h.priv,'K78-'+context.tag);
 assert(!fs.existsSync(folder)&&!fs.existsSync(privateFolder),'new immutable result directories required');fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(privateFolder,{mode:0o700});
 localRoot=path.resolve(localRoot??path.join(h.priv,'..','objects','rust'));assert(fs.statSync(localRoot).isDirectory());
 let sequence=0,probeNo=0,closed=false;const results=[];
 async function persist(kind,body,meta={}) {
  const label=String(++sequence).padStart(4,'0')+'-'+kind.replace(/[^a-z0-9-]/gi,'-'),raw=Buffer.from(JSON.stringify({meta,body:clean(body)},null,2)+'\n');
  const file=path.join(privateFolder,label+'.json');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});
  const receiptId=`tmp/rust-r4def/root/K78-${context.tag}/${label}.json`;
  fs.writeFileSync(path.join(h.win,receiptId),JSON.stringify({kind:'K78-actual-'+kind,meta,identity,privateOriginal:{file,bytes:raw.length,rawBytesSha256:sha(raw)},credentialsPublished:false},null,2)+'\n',{flag:'wx'});
  return{body:clean(body),receiptId};
 }
 async function actualAuthId(actorId) {
  // Exact cookie->hash->session lookup only inside Root runtime. Never select a
  // guessed latest session, never expose the cookie/hash in observations.
  assert(path.resolve(h.stateFile).startsWith(path.resolve(h.priv)+path.sep));
  const state=JSON.parse(fs.readFileSync(h.stateFile)),slot=state.actors[context.author.key??context.author.id];assert.equal(slot?.id,actorId);
  const token=slot.cookies.poms_session;assert.equal(typeof token,'string');
  const {rows}=await watch.query("SELECT id FROM poms.auth_session WHERE token_hash=$1 AND user_id=$2 AND status='active'",[sha(decodeURIComponent(token)),actorId]);assert.equal(rows.length,1);return rows[0].id;
 }
 async function observe(scope,meta={}) {
  const authIds=scope.authSessionIds??[await actualAuthId(scope.actorId)];
  await observeClient.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');let body;
  try {
   const {rows:attachments}=await observeClient.query('SELECT * FROM poms.attachment WHERE id=ANY($1::uuid[]) OR COALESCE(version_group_id,id)=ANY($2::uuid[]) ORDER BY id',[scope.attachmentIds??[],scope.groupIds??[]]);
   const ids=attachments.map(a=>a.id);
   const {rows:sessions}=await observeClient.query('SELECT * FROM poms.attachment_upload_session WHERE id=ANY($1::uuid[]) ORDER BY id',[scope.sessionIds??[]]);
   const {rows:links}=await observeClient.query('SELECT * FROM poms.attachment_link WHERE attachment_id=ANY($1::uuid[]) ORDER BY id',[ids]);
   const targetIds=[...new Set([...ids,...(scope.attachmentIds??[]),...(scope.sessionIds??[])])];
   const {rows:audits}=await observeClient.query("SELECT * FROM poms.audit_log WHERE (target_type='attachment' AND target_id=ANY($1::text[])) OR metadata->>'uploadSessionId'=ANY($2::text[]) ORDER BY id",[targetIds,scope.sessionIds??[]]);
   const {rows:authSessions}=await observeClient.query('SELECT id,user_id,row_version,status,last_seen_at,idle_expires_at,absolute_expires_at,updated_at FROM poms.auth_session WHERE id=ANY($1::uuid[]) ORDER BY id',[authIds]);
   body={attachments,links,sessions,audits,authSessions};await observeClient.query('COMMIT');
  }catch(error){await observeClient.query('ROLLBACK');throw error;}
  return persist('owned-readonly-PG',body,meta);
 }
 function ownedFile(key) {const file=path.resolve(localRoot,key.replaceAll('\\','/'));assert(file.startsWith(localRoot+path.sep));return file;}
 function readFileProof(key) {
  const file=ownedFile(key);try{const actual=fs.realpathSync(file);assert(actual.startsWith(fs.realpathSync(localRoot)+path.sep));const stat=fs.statSync(actual);assert(stat.isFile()&&stat.size<=4096,'only tiny owned witnesses may be read');const bytes=fs.readFileSync(actual);return{exists:true,bytes:bytes.length,sha256:sha(bytes)};}catch(error){if(error.code==='ENOENT')return{exists:false};throw error;}
 }
 async function observeObjects(scope,meta={}) {
  const state=(await observe(scope,{...meta,label:'object-source-identities'})).body,objects=[];
  for(const a of state.attachments){assert.equal(a.storage_provider,'local','S3 explicitly unaccepted');objects.push({kind:'attachment',attachmentId:a.id,status:a.status,...readFileProof(a.storage_key)});}
  for(const s of state.sessions){assert.equal(s.provider_type,'local');objects.push({kind:'staging',sessionId:s.id,status:s.status,...readFileProof(s.storage_key)});}
  return persist('owned-object-readonly',objects,meta);
 }
 const definition=`CREATE FUNCTION r4def_control.${identifier(functionName)}() RETURNS trigger LANGUAGE plpgsql AS $k78$
 DECLARE spec jsonb:=TG_ARGV[2]::jsonb; actual jsonb:=to_jsonb(NEW); hits integer; aid text;
 BEGIN
  IF NOT (actual @> COALESCE(spec->'match','{}'::jsonb)) THEN RETURN NEW; END IF;
  IF spec ? 'metadata' AND NOT (COALESCE(actual->'metadata','{}'::jsonb) @> (spec->'metadata')) THEN RETURN NEW; END IF;
  IF spec ? 'queryContains' AND position((spec->>'queryContains') in current_query())=0 THEN RETURN NEW; END IF;
  IF spec ? 'parentAttachment' AND NOT EXISTS(SELECT 1 FROM poms.attachment a WHERE a.id=(actual->>'attachment_id')::uuid AND to_jsonb(a) @> (spec->'parentAttachment')) THEN RETURN NEW; END IF;
  hits:=COALESCE(NULLIF(current_setting('poms_r4def_k78.hits',true),''),'0')::integer+1; PERFORM set_config('poms_r4def_k78.hits',hits::text,true);
  IF hits < TG_ARGV[1]::integer THEN RETURN NEW; END IF;
  aid:=CASE TG_TABLE_NAME WHEN 'attachment' THEN actual->>'id' WHEN 'attachment_link' THEN actual->>'attachment_id' WHEN 'attachment_upload_session' THEN actual->>'completed_attachment_id' WHEN 'audit_log' THEN actual->>'target_id' ELSE NULL END;
  IF aid ~ '^[0-9a-f-]{36}$' THEN PERFORM set_config('application_name','k78:${context.tag}:'||aid,true); END IF;
  PERFORM pg_advisory_xact_lock(194078,TG_ARGV[0]::integer);
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='owned K78 necessary-write fault';
 END $k78$`;
 assert.equal((await ctrl.query('SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2',['r4def_control',functionName])).rowCount,0);
 await ctrl.query(definition);
 registered=true;
 async function until(inspect,done,label,limit=15000){const end=Date.now()+limit;while(Date.now()<end){const value=await inspect();if(done(value))return value;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Controlled barrier not observed: '+label);}
 async function faultProbe(plan,invoke) {
  const n=++probeNo,key=780000+n,trigger=`r4def_k78_${context.tag}_${n}`,t=plan.target;
  assert(['attachment','attachment_link','attachment_upload_session','audit_log','auth_session'].includes(t.table));assert(['INSERT','UPDATE'].includes(t.event));assert(Number.isInteger(t.nth)&&t.nth>=1);
  assert(t.match&&Object.keys(t.match).length);assert(t.match.id||t.match.version_group_id||t.parentAttachment||t.metadata?.uploadSessionId||t.match.target_id,'owned predicate required');
  const before=await observe(plan.scope,{caseId:plan.caseId,label:'before'});await fault.snapshot(`k78-${n}-before`);
  let armed=false,held=false,pending,response,error,hit;
  try {
   await ctrl.query(`CREATE ${t.deferred?'CONSTRAINT ':''}TRIGGER ${identifier(trigger)} ${t.deferred?'AFTER':'BEFORE'} ${t.event} ON poms.${t.table} ${t.deferred?'DEFERRABLE INITIALLY DEFERRED ':''}FOR EACH ROW EXECUTE FUNCTION r4def_control.${identifier(functionName)}(${literal(key)},${literal(t.nth)},${literal(JSON.stringify(t))})`);armed=true;
   await ctrl.query('SELECT pg_advisory_lock(194078,$1::integer)',[key]);held=true;
   pending=Promise.resolve().then(invoke).then(r=>(response=r),e=>(error=e));
   hit=await until(async()=>{const {rows}=await watch.query("SELECT a.pid,a.application_name,l.granted,l.classid::text,l.objid::text,a.wait_event_type,a.wait_event FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND l.classid=194078 AND l.objid=$1::oid AND NOT l.granted AND a.usename='poms_r4def_rust_app' AND a.datname=current_database()",[key]);if(error)throw error;if(response)throw Error('Fault returned before scoped barrier: '+response.status);assert(rows.length<=1);return rows[0];},Boolean,plan.caseId);
   const blocked=await observe(plan.scope,{caseId:plan.caseId,label:'blocked-post-eager'});await fault.snapshot(`k78-${n}-blocked`);
   await ctrl.query('SELECT pg_advisory_unlock(194078,$1::integer)',[key]);held=false;await pending;if(error)throw error;
   await ctrl.query(`DROP TRIGGER ${identifier(trigger)} ON poms.${t.table}`);armed=false;
   const after=await observe(plan.scope,{caseId:plan.caseId,label:'after'});await fault.snapshot(`k78-${n}-after`);
   const attemptId=/([0-9a-f-]{36})$/.exec(hit.application_name??'')?.[1];let attemptObjectProof=null;
   if(attemptId&&!(plan.scope.attachmentIds??[]).includes(attemptId)) {
    const session=blocked.body.sessions.find(s=>s.id===plan.sourceSessionId);assert(session?.provider_type==='local');
    const at=session.storage_key.lastIndexOf('attachments/uploads/');assert(at>=0);const prefix=session.storage_key.slice(0,at);const days=new Set([new Date().toISOString().slice(0,10),new Date(Date.now()-86400000).toISOString().slice(0,10)]);const files=[];
    for(const day of days){const dir=ownedFile(prefix+'attachments/completed/'+day.replaceAll('-','/')+'/'+attemptId);if(fs.existsSync(dir)){for(const nonce of fs.readdirSync(dir)){assert.match(nonce,/^[0-9a-f-]{36}$/);for(const file of fs.readdirSync(path.join(dir,nonce))){const rel=path.relative(localRoot,path.join(dir,nonce,file));files.push(readFileProof(rel));}}}}
    if(t.deferred){assert.equal(files.length,1,'Unknown COMMIT must retain the private final');assert.equal(files[0].sha256,SHA78);}else assert.equal(files.length,0,'Known rollback must clean its own final');
    attemptObjectProof=await persist('owned-attempt-object-readonly',{attemptId,commitDisposition:plan.commitDisposition,files},{caseId:plan.caseId});
   }
   const receipt=await persist('owned-scoped-fault',{plan,functionDefinition:definition,hit,before:before.receiptId,blocked:blocked.receiptId,after:after.receiptId,status:response.status,HTTPReceiptId:response.receiptId,attemptObjectProof:attemptObjectProof?.receiptId??null,privateAttemptObjectObserved:Boolean(attemptObjectProof)},{caseId:plan.caseId});
   const result={...receipt,before,blocked,after,response,hit,attemptObjectProof};results.push({caseId:plan.caseId,receiptId:receipt.receiptId,retryPending:true});return result;
  }finally{if(held)await ctrl.query('SELECT pg_advisory_unlock(194078,$1::integer)',[key]);if(pending)await pending;if(armed)await ctrl.query(`DROP TRIGGER ${identifier(trigger)} ON poms.${t.table}`);}
 }
 async function holdGroup(plan,invokes,expectedWaiters) {
  const name='poms:attachment-group:'+plan.groupId;const {rows:[r]}=await watch.query('SELECT hashtextextended($1,0)::text AS key',[name]);
  await ctrl.query('SELECT pg_advisory_lock($1::bigint)',[r.key]);let held=true;const responses=[],errors=[];
  const pending=invokes.map((fn,i)=>Promise.resolve().then(fn).then(v=>(responses[i]=v),e=>(errors[i]=e)));
  try {
   const waits=await until(async()=>{if(errors.some(Boolean))throw errors.find(Boolean);if(responses.some(Boolean))throw Error('No-op/complete returned without held group barrier');const {rows}=await watch.query("SELECT a.pid,l.granted,a.wait_event_type,a.wait_event FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND l.objsubid=1 AND l.classid=(($1::bigint>>32)&4294967295)::oid AND l.objid=($1::bigint&4294967295)::oid AND NOT l.granted AND a.usename='poms_r4def_rust_app' AND a.datname=current_database()",[r.key]);return rows;},rows=>rows.length===expectedWaiters,name);
   const receipt=await persist('controlled-group-barrier',{groupId:plan.groupId,key:r.key,waits,sourceEpoch:'K98',sameSession:false});
   await ctrl.query('SELECT pg_advisory_unlock($1::bigint)',[r.key]);held=false;await Promise.all(pending);if(errors.some(Boolean))throw errors.find(Boolean);
   return{receiptId:receipt.receiptId,barrier:{proven:true,waiters:waits},responses,response:responses[0]};
  }finally{if(held)await ctrl.query('SELECT pg_advisory_unlock($1::bigint)',[r.key]);await Promise.allSettled(pending);}
 }
 const hooks={request:h.request,binaryRequest:h.binaryRequest,observe,observeObjects,fault:faultProbe,withActualReadFault,
  retry:async(plan,failure,response)=>{const row=results.find(r=>r.receiptId===failure.receiptId);assert(row);assert(response.status>=200&&response.status<300);row.retryPending=false;row.retryReceiptId=response.receiptId;await persist('one-fresh-unarmed-retry',row,{caseId:plan.caseId});},
  concurrency:{noop:(plan,invoke)=>holdGroup(plan,[invoke],1),group:(plan,invokes)=>{assert.equal(plan.sameSession,false,'critical suite uses two distinct actual Sessions');return holdGroup(plan,invokes,2);}}
 };
 const selected=selection==='vertical7'?VERTICAL7:undefined;assert(['vertical7','critical16'].includes(selection));
 const suite=createK78(context,hooks,{cases:selected});
 fs.writeFileSync(path.join(folder,'before.json'),JSON.stringify({kind:'K78-actual-root-start',context,runtime:{epoch:runtimeEdition,pid:runtime.pid,binarySha256:runtime.binarySha256},sourcePins:PINS,selection,manifest:suite.manifest(),S3Accepted:false,latePUTSchemeRepeated:false},null,2)+'\n',{flag:'wx'});
 return{manifest:suite.manifest,async runAll(){const result=await suite.runAll();result.scopedFaultResults=results;result.core47SummaryIsInfrastructureOnly=true;result.unarmedRetriesAcknowledged=results.every(r=>!r.retryPending);fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;},async close(){if(closed)return;closed=true;try{await ctrl.query(`DROP FUNCTION r4def_control.${identifier(functionName)}()`);registered=false;await persist('owned-trigger-function-cleanup',{temporaryOwnedFunctionRemoved:true,scopedProbeCount:results.length});}finally{await Promise.allSettled([watch.end(),observeClient.end(),ctrl.end()]);}}};
 }catch(error){if(registered)await ctrl.query(`DROP FUNCTION IF EXISTS r4def_control.${identifier(functionName)}()`).catch(()=>{});await Promise.allSettled([watch.end(),observeClient.end(),ctrl.end()]);throw error;}
}
