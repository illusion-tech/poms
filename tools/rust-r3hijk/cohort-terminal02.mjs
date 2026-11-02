// Root reconciles only the two new, marked R3HIJK databases to their own seed snapshots.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createRequire } from 'node:module';
import { guardNative, pin, sha } from './source-guard.mjs';
const root='/home/wangzishi/projects/poms-rust-r3hijk',state='/home/wangzishi/.local/share/poms-r3hijk',priv=state+'/private';
const [mode,backend,attempt]=process.argv.slice(2);
assert.equal(process.cwd(),root); assert(['inspect','cleanup'].includes(mode)); assert(['nest','rust'].includes(backend)); assert(/^\d{2}$/.test(attempt));
assert.equal(backend,'rust');const runId=JSON.parse(fs.readFileSync('tmp/rust-r3hijk/root/uuid-cohort01.json')).runId;
const identity=JSON.parse(fs.readFileSync(state+'/identity.json'));
assert.equal(identity.namespace,'poms-r3hijk'); assert.equal(identity.marker,'3e225e17-88de-4880-92ea-4dad45646963');
const lineage=priv+'/acceptance-'+backend+'-'+runId;
const context=JSON.parse(fs.readFileSync(lineage+'/context.json'));
assert.equal(context.runId,runId); assert.equal(context.marker,identity.marker); assert.equal(context.database,'poms_r3hijk_'+backend);
const prefix='tmp/rust-r3hijk/cohort-'+mode+'-'+backend+attempt;
assert(!fs.existsSync(prefix)); fs.mkdirSync(prefix,{recursive:true});
const write=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
const q=n=>{assert(/^[a-z_0-9]+$/.test(n));return '"'+n+'"';};
const pk=p=>Array.isArray(p)?p:p==='{}'?[]:p.slice(1,-1).split(',').map(x=>x.replaceAll('"',''));
const baseline=JSON.parse(fs.readFileSync(lineage+'/baseline-before.json')).map(t=>({...t,pk:pk(t.pk)}));
assert.equal(baseline.length,107);
const key=(raw,keys)=>JSON.stringify(keys.map(k=>JSON.parse(raw)[k]));
const order=['business_discussion_comment','business_discussion_thread','project_archive_record','project_completion_record','acceptance_record','project_handover','contract_term_snapshot','approval_summary_snapshot','approval_summary_package_definition','contract','todo_item','sales_follow_up_record','project_pricing_margin_condition_item','project_pricing_margin_review','project_bid_commercial_material_item','project_bid_commercial_timeline_item','project_bid_commercial_process','project_technical_scope_item','project_technical_risk_item','project_technical_cost_item','project_technical_cost_package','opportunity_stakeholder','competitor_intelligence_record','sales_discovery_record','lead_score_snapshot','lead_score_override','lead_owner_assignment_record','attachment_upload_session','attachment_link','attachment','project_owner_reassignment_record','project','lead','customer_contact','customer_alias','customer','dictionary_item','audit_log','security_event','auth_session','role_permission_assignment','user_role_assignment','user_org_membership','local_credential','platform_user','org_unit','role','business_number_sequence'];
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const db=new Client({host:'127.0.0.1',port:22433,database:context.database,user:'poms_r0e_owner',password:fs.readFileSync(priv+'/owner-password','utf8'),application_name:'poms-r3hijk-owned-terminal',query_timeout:30000});
await db.connect(); let transaction=false;
async function snapshot(){const all=[];for(const t of baseline)all.push({...t,rows:(await db.query('select to_jsonb(t)::text raw from poms.'+q(t.name)+' t')).rows.map(x=>x.raw).sort()});return all;}
async function free(port){return await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});}
function objects(directory){const resolved=path.resolve(directory);assert(resolved.startsWith(state+'/objects/')||resolved.startsWith('/mnt/c/Users/ynh2/AppData/Local/poms-r3hijk/objects/'));if(!fs.existsSync(resolved))return [];return fs.readdirSync(resolved,{withFileTypes:true}).flatMap(e=>{const p=resolved+'/'+e.name;assert(!fs.lstatSync(p).isSymbolicLink());return e.isDirectory()?objects(p):[pin(p)];}).sort((a,b)=>a.file.localeCompare(b.file));}
try{
 assert.equal((await db.query('select instance_id::text marker from r3hijk_control.marker')).rows[0].marker,identity.marker);
 guardNative();
 if(mode==='cleanup'){
  assert(await free(backend==='nest'?12400:12500),'Owned Linux API must be stopped before cleanup');
  assert(await free(12600),'UI proxy must be closed before cleanup');
  if(backend==='nest')assert(await free(12410),'Owned Windows Native API must be stopped before cleanup');
 }
 await db.query(mode==='cleanup'?'begin':'begin isolation level repeatable read read only');transaction=true;
 if(mode==='cleanup')await db.query('lock table '+baseline.map(t=>'poms.'+q(t.name)).join(',')+' in access exclusive mode');
 const current=await snapshot(),deltas=new Map(),changes=[];
 for(const original of baseline){
  const now=current.find(t=>t.name===original.name);
  if(!original.pk.length){assert.deepEqual(now.rows,original.rows);continue;}
  const old=new Map(original.rows.map(r=>[key(r,original.pk),r])),nowMap=new Map(now.rows.map(r=>[key(r,original.pk),r]));
  for(const[k,row]of old){assert(nowMap.has(k),'Seed row missing '+original.name);if(nowMap.get(k)!==row){assert.equal(original.name,'business_number_sequence','Unexpected changed seed '+original.name);assert(['customer','project','lead'].includes(JSON.parse(row).scope));changes.push({table:original.name,pk:original.pk,before:row,current:nowMap.get(k)});}}
  const added=now.rows.filter(r=>!old.has(key(r,original.pk)));
  if(added.length){assert(order.includes(original.name),'Unexpected added table '+original.name);deltas.set(original.name,{pk:original.pk,rows:added});}
 }
 // Both fully registered and early partially created fixture actors carry this exact lineage prefix.
 const usernamePrefix='hijk_'+runId.replaceAll('-','')+'_';
 for(const raw of deltas.get('platform_user')?.rows||[])assert(JSON.parse(raw).username.startsWith(usernamePrefix),'Unexpected non-cohort user');
 for(const raw of deltas.get('org_unit')?.rows||[])assert(JSON.parse(raw).code.startsWith('hijk-'+runId+'-'),'Unexpected non-cohort org');
 for(const raw of deltas.get('role')?.rows||[])assert(JSON.parse(raw).role_key.startsWith('hijk-'+runId+'-'),'Unexpected non-cohort role');
 const privateSnapshot=lineage+'/terminal-'+mode+attempt+'-before.json';
 write(privateSnapshot,{current,deltas:[...deltas].map(([table,value])=>({table,...value})),changes});
 const objectEvidence=[...objects(state+'/objects/'+backend),...(backend==='nest'?objects('/mnt/c/Users/ynh2/AppData/Local/poms-r3hijk/objects/nest'):[])];
 const privileges=(await db.query("select c.relname table_name,v.privilege,has_table_privilege('poms_r3hijk_app',format('%I.%I',n.nspname,c.relname),v.privilege) allowed from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE')) v(privilege) where n.nspname='poms' and c.relkind='r' order by c.relname,v.privilege")).rows;
 assert.equal(privileges.length,428); assert(privileges.every(x=>x.allowed));
 const removed=[];
 if(mode==='cleanup'){
  for(const raw of deltas.get('lead')?.rows||[])await db.query('update poms.lead set converted_project_id=null where id=$1',[JSON.parse(raw).id]);
  for(const raw of deltas.get('project')?.rows||[])await db.query('update poms.project set source_lead_id=null where id=$1',[JSON.parse(raw).id]);
  for(const table of order){const delta=deltas.get(table);if(!delta)continue;
   // One statement per table deletes complete self-referencing version chains together.
   const payload='['+delta.rows.join(',')+']';
   const result=await db.query('delete from poms.'+q(table)+' target where exists(select 1 from jsonb_populate_recordset(null::poms.'+q(table)+',$1::jsonb) original where '+delta.pk.map(k=>'target.'+q(k)+'=original.'+q(k)).join(' and ')+')',[payload]);
   assert.equal(result.rowCount,delta.rows.length,'Exact owned delete '+table);
   removed.push({table,count:result.rowCount});
  }
  for(const change of changes){const row=JSON.parse(change.before),columns=Object.keys(row).filter(k=>!change.pk.includes(k)),params=[change.before,...change.pk.map(k=>row[k]),change.current];
   const result=await db.query('update poms.'+q(change.table)+' t set ('+columns.map(q).join(',')+')=(select '+columns.map(q).join(',')+' from jsonb_populate_record(null::poms.'+q(change.table)+',$1::jsonb)) where '+change.pk.map((k,i)=>'t.'+q(k)+'=$'+(i+2)).join(' and ')+' and to_jsonb(t)=$'+params.length+'::jsonb',params);
   assert.equal(result.rowCount,1);
  }
  assert.deepEqual(await snapshot(),baseline,'All 107 original seed tables must match raw JSON exactly');
 }
 await db.query('commit');transaction=false;
 const report={kind:'R3HIJK-UUID-correction-exact-owned-cohort-'+mode,createdAt:new Date().toISOString(),backend,runId,marker:identity.marker,database:context.database,source:pin('tools/rust-r3hijk/cohort-terminal02.mjs'),privateBeforeSnapshot:pin(privateSnapshot),baselinePin:pin(lineage+'/baseline-before.json'),deltaTables:[...deltas].map(([table,value])=>({table,count:value.rows.length,rawRowSetSha256:sha(Buffer.from('['+value.rows.join(',')+']'))})),changedSeedRows:changes.map(x=>({table:x.table,pk:x.pk})),removed,removedRows:removed.reduce((n,x)=>n+x.count,0),fullSeedTables:107,all107SeedRawJSONRowsExact:mode==='cleanup',individualPrivileges:428,allPrivilegesRestored:true,controlledCountersRestored:mode==='cleanup'?changes.length:0,localObjectsRetained:objectEvidence,privateAndVolumeRetained:true,oldPrivateOrPG17Touched:false,credentialsPublished:false,completed:true,G3Certified:false,G4Certified:false};
 write(prefix+'/report01.json',report);
 console.log(JSON.stringify({mode,backend,addedRows:report.deltaTables.reduce((n,x)=>n+x.count,0),tables:report.deltaTables.map(x=>({table:x.table,count:x.count})),removedRows:report.removedRows,seedExact:report.all107SeedRawJSONRowsExact,objectsRetained:objectEvidence.length}));
}catch(error){if(transaction)await db.query('rollback');write(lineage+'/terminal-'+mode+attempt+'-error.json',{name:error.name,message:error.message,stack:error.stack});console.error(JSON.stringify({mode,backend,failed:true,error:error.message.split('\n')[0],privateErrorRetained:true}));process.exitCode=1;}finally{await db.end();}
