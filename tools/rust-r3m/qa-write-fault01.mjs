// Root-only, explicitly approved QA fixture DDL. Never used in product schemas.
import fs from'node:fs';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{spawnSync}from'node:child_process';
import{pin,base}from'./source-guard.mjs';
const reviewFile='tmp/rust-r3m/c-review/g2-fault-tool-clarification01.json';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function catalog(ctx){return{triggers:(await ctx.db.query("select t.oid::text oid,t.tgname,t.tgfoid::text function_oid,pg_get_triggerdef(t.oid) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='poms'::regnamespace and not t.tgisinternal order by t.tgname")).rows,functions:(await ctx.db.query("select p.oid::text oid,p.proname,pg_get_functiondef(p.oid) definition from pg_proc p where p.pronamespace='r3m_control'::regnamespace order by p.proname")).rows};}
async function seedGuard(ctx){const file=ctx.lineage+'/baseline-before.json',baseline=JSON.parse(fs.readFileSync(file));assert.equal(baseline.length,107);let checked=0;for(const table of baseline){if(table.name==='business_number_sequence')continue;assert(/^[a-z_]+$/.test(table.name));const now=new Set((await ctx.db.query('select to_jsonb(t)::text raw from poms."'+table.name+'" t')).rows.map(r=>r.raw));for(const raw of table.rows){assert(now.has(raw),'Existing seed row changed in '+table.name);checked++;}}return{baseline:pin(file),checkedSeedRows:checked,allOriginalSeedRowsPresentAndExact:true,approvedIndependentNumberReservationsExcluded:true};}
async function acl(ctx){return(await ctx.db.query("select c.relname,v.privilege,has_table_privilege('poms_r3m_app',format('poms.%I',c.relname),v.privilege) allowed from pg_class c cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE'))v(privilege) where c.relnamespace='poms'::regnamespace and c.relkind='r' order by c.relname,v.privilege")).rows;}
export async function withQaWriteFault(ctx,{table,leadId,overrideId=null,snapshotKind=null,expectHit=true},action){
 assert.equal(ctx.runtime.backend,'rust');assert.equal(ctx.runtime.database,'poms_r3m_rust');assert.equal(ctx.identity.namespace,'poms-r3m');assert.equal(ctx.identity.base,base);assert(ctx.ownedIds.has(leadId)&&uuid.test(leadId));assert(['lead','lead_score_snapshot'].includes(table));
 const review=JSON.parse(fs.readFileSync(reviewFile));assert(review.reviewCompleted&&review.clarificationApproved&&!review.actualFaultAcceptanceCertified);assert.equal(pin(reviewFile).rawBytesSha256,'eef424dd28fe8ea0c17dd6236851779fa8c6ad422878956bf9b688bd57447851');
 const actual=(await ctx.db.query('select current_database() db,(select instance_id::text from r3m_control.marker) marker')).rows[0];assert.equal(actual.db,'poms_r3m_rust');assert.equal(actual.marker,ctx.identity.marker);
 const lead=await ctx.row('lead',leadId);assert(lead&&ctx.actors.some(a=>a.userId===lead.created_by));
 if(table==='lead_score_snapshot'){assert(uuid.test(overrideId)&&ctx.ownedIds.has(overrideId));assert(['manual-override','override-revoked'].includes(snapshotKind));const row=await ctx.row('lead_score_override',overrideId);assert(row&&row.lead_id===leadId);}
 const nonce=randomUUID().replaceAll('-','').slice(0,16),fn='r3m_qa_f_'+nonce,tr='r3m_qa_t_'+nonce,marker='POMS_R3M_QA_HIT_'+nonce,protocol='POMS_R3M_QA_PROTOCOL_'+nonce;
 const beforeCatalog=await catalog(ctx),beforeACL=await acl(ctx),seedBefore=await seedGuard(ctx);assert(beforeACL.every(r=>r.allowed));
 const oldSnapshotIds=(await ctx.rows('lead_score_snapshot',{lead_id:leadId})).map(s=>s.id);for(const id of oldSnapshotIds)assert(uuid.test(id));
 const exclusion=oldSnapshotIds.length?'array['+oldSnapshotIds.map(id=>"'"+id+"'::uuid").join(',')+']::uuid[]':"array[]::uuid[]";
 let predicate="current_user='poms_r3m_app' AND NEW.id='"+leadId+"'::uuid",body="RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='"+marker+":lead="+leadId+":write=UPDATE';";
 if(table==='lead_score_snapshot'){
  predicate="current_user='poms_r3m_app' AND NEW.lead_id='"+leadId+"'::uuid AND NEW.snapshot_kind='"+snapshotKind+"' AND NEW.source_record_id='"+overrideId+"'::uuid";
  body="SELECT s.id INTO system_id FROM poms.lead_score_snapshot s WHERE s.lead_id=NEW.lead_id AND s.snapshot_kind='system' AND s.source_record_id=NEW.source_record_id AND NOT(s.id=ANY("+exclusion+")) ORDER BY s.created_at DESC,s.id DESC LIMIT 1; IF system_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='"+protocol+":missing-new-system-snapshot'; END IF; RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='"+marker+":lead="+leadId+":record="+overrideId+":system='||system_id::text;";
 }
 const definition='CREATE FUNCTION r3m_control."'+fn+'"() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $r3m_qa$ DECLARE system_id uuid; BEGIN IF '+predicate+' THEN '+body+' END IF; RETURN NEW; END $r3m_qa$';
 const trigger='CREATE TRIGGER "'+tr+'" BEFORE '+(table==='lead'?'UPDATE':'INSERT')+' ON poms."'+table+'" FOR EACH ROW EXECUTE FUNCTION r3m_control."'+fn+'"()';
 const ledger=ctx.directory+'/qa-write-fault-'+nonce+'-ledger-original.jsonl';fs.writeFileSync(ledger,JSON.stringify({event:'intent',nonce,table,leadId,overrideId,snapshotKind,definition,trigger,review:pin(reviewFile)})+'\n',{flag:'wx',mode:0o600});
 let fnOid=null,trOid=null,response,hit=null,rawLogs=[],restored=false;const since=new Date().toISOString();
 try{
  await ctx.db.query(definition);fnOid=(await ctx.db.query("select oid::text oid from pg_proc where pronamespace='r3m_control'::regnamespace and proname=$1",[fn])).rows[0].oid;
  await ctx.db.query('REVOKE ALL ON FUNCTION r3m_control."'+fn+'"() FROM PUBLIC');await ctx.db.query('GRANT EXECUTE ON FUNCTION r3m_control."'+fn+'"() TO poms_r3m_app');
  await ctx.db.query(trigger);trOid=(await ctx.db.query('select oid::text oid from pg_trigger where tgname=$1 and tgrelid=$2::regclass and tgfoid=$3::oid',[tr,'poms.'+table,fnOid])).rows[0].oid;
  fs.appendFileSync(ledger,JSON.stringify({event:'installed-committed',fnOid,trOid,armedLeadId:leadId,expectedRole:'poms_r3m_app',securityInvoker:true})+'\n');
  response=await action();
  const logs=spawnSync('podman',['--cgroup-manager=cgroupfs','logs','--since',since,ctx.identity.container],{encoding:null,maxBuffer:128000000});assert.equal(logs.status,0);
  const text=[];for(const[name,b]of[['stdout',logs.stdout],['stderr',logs.stderr]]){const file=ctx.directory+'/qa-write-fault-'+nonce+'-postgres-'+name+'-original.bin';fs.writeFileSync(file,b,{flag:'wx',mode:0o600});rawLogs.push(pin(file));text.push(b.toString('utf8'));}
  const errorLines=text.join('\n').split('\n').filter(line=>line.includes('ERROR:')&&line.includes(marker));
  if(expectHit){assert.equal(response.status,500);assert(errorLines.length>0,'A real named test database error must be observed');const line=errorLines[0];assert(line.includes('user=poms_r3m_app')&&line.includes('db=poms_r3m_rust'));const match=line.match(/:system=([0-9a-f-]{36})/i);if(table==='lead_score_snapshot'){assert(match&&uuid.test(match[1]));assert(!oldSnapshotIds.includes(match[1]));}hit={marker,sqlState:'P0001',actualErrorLine:line,systemSnapshotId:match?.[1]||null,leadId,overrideId,declaredPublicDerivativeOfPrivateError:true,rawLogs};}
  else{assert.equal(response.status,200);assert.equal(errorLines.length,0);hit={marker,armedButNotTriggered:true,actualDatabaseErrorObserved:false,rawLogs};}
 }finally{
  if(trOid){const rows=(await ctx.db.query('select oid::text oid,tgfoid::text function_oid from pg_trigger where tgname=$1 and tgrelid=$2::regclass',[tr,'poms.'+table])).rows;assert.equal(rows.length,1);assert.equal(rows[0].oid,trOid);assert.equal(rows[0].function_oid,fnOid);await ctx.db.query('DROP TRIGGER "'+tr+'" ON poms."'+table+'"');}
  if(fnOid){const rows=(await ctx.db.query("select oid::text oid from pg_proc where pronamespace='r3m_control'::regnamespace and proname=$1",[fn])).rows;assert.equal(rows.length,1);assert.equal(rows[0].oid,fnOid);await ctx.db.query('DROP FUNCTION r3m_control."'+fn+'"()');}
  assert.deepEqual(await catalog(ctx),beforeCatalog,'QA trigger/function catalog must be exactly restored');assert.deepEqual(await acl(ctx),beforeACL,'Table ACL must remain exact');const seedAfter=await seedGuard(ctx);restored=true;
  fs.appendFileSync(ledger,JSON.stringify({event:'removed-and-restored',fnOid,trOid,catalogRestored:true,ACLRestored:true,seedAfter})+'\n');await ctx.observe('QA-only-write-fault-restored-'+nonce,{table,leadId,overrideId,snapshotKind,fnOid,trOid,securityInvoker:true,catalogRestored:true,ACLRestored:true,seedBefore,seedAfter,ledger:pin(ledger),hit});
 }
 assert(restored);return{response,hit,fixture:{nonce,table,leadId,overrideId,snapshotKind,oldSnapshotIds,securityInvoker:true,fnOid,trOid,catalogRestored:true,ACLRestored:true,ledger:pin(ledger)},testOnlyDDL:true,productSchemaChanged:false};
}
