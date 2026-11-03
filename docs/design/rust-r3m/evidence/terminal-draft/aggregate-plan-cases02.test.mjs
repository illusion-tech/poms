// Pure synthetic regressions for the ownership algorithm, never PG acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAggregate } from './aggregate-plan02.mjs';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const runId = '55555555-5555-4555-8555-555555555555';
function setup() {
  const required = ['platform_user','org_unit','role','customer','customer_alias','lead','project','business_number_sequence','security_event'];
  const names = [...required, ...Array.from({ length:107-required.length }, (_, i) => 'unchanged_table_' + i)].sort();
  const baseline = names.map(name => ({ name, pk:['id'], rows:[] }));
  const seed = { platform_user:{id:id(900),username:'original-seed-user'}, org_unit:{id:id(901),code:'original-org'}, role:{id:id(902),role_key:'original-role'}, customer:{id:id(903),display_name:'original-customer'}, lead:{id:id(904)}, project:{id:id(905)} };
  for (const [table,row] of Object.entries(seed)) baseline.find(t => t.name===table).rows.push(JSON.stringify(row));
  const current = structuredClone(baseline), actor = {runId,label:'admin',username:'r3m_'+runId.replaceAll('-','')+'_admin',userId:id(1),orgId:id(2),roleId:id(3),registration:{synthetic:true}};
  const add = (table,row) => current.find(t => t.name===table).rows.push(JSON.stringify(row));
  add('platform_user',{id:actor.userId,username:actor.username}); add('org_unit',{id:actor.orgId,code:'r3m-'+runId+'-admin'}); add('role',{id:actor.roleId,role_key:'r3m-'+runId+'-admin'});
  return {baseline,current,actors:[actor],foreignKeys:[],guardRequests:[],allowedNumberPeriods:['2026'],numberSpecs:{},actor,add,seed};
}
const fk = (table,column,refTable) => ({name:'fk_'+table+'_'+column,table,refSchema:'poms',refTable,columns:[column],refColumns:['id']});
test('valid exact actors, attributed customer, rooted child FK', () => { const x=setup(); x.add('customer',{id:id(10),created_by:x.actor.userId}); x.add('customer_alias',{id:id(11),customer_id:id(10)}); x.foreignKeys=[fk('customer_alias','customer_id','customer')]; const p=classifyAggregate(x); assert(p.ready); assert.equal(p.added.size,5); assert.equal(p.owned.size,5); });
test('seed-only FK and a remembered seed ID never establish ownership', () => { const x=setup(); x.add('customer_alias',{id:id(11),customer_id:x.seed.customer.id}); x.foreignKeys=[fk('customer_alias','customer_id','customer')]; x.ownedIds=[x.seed.customer.id]; const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); assert.equal(p.orphans[0].foreignKeys[0].targetIsSeed,true); });
test('unrooted self reference remains orphan', () => { const x=setup(); x.add('customer_alias',{id:id(11),parent_id:id(11)}); x.foreignKeys=[fk('customer_alias','parent_id','customer_alias')]; const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); });
test('unrooted two-row cycle cannot self-certify during iteration', () => { const x=setup(); x.add('customer_alias',{id:id(11),parent_id:id(12)}); x.add('customer_alias',{id:id(12),parent_id:id(11)}); x.foreignKeys=[fk('customer_alias','parent_id','customer_alias')]; const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,2); });
test('cycle connected to a genuine own attribution has an acyclic proof root', () => { const x=setup(); x.add('customer_alias',{id:id(11),parent_id:id(12),created_by:x.actor.userId}); x.add('customer_alias',{id:id(12),parent_id:id(11)}); x.foreignKeys=[fk('customer_alias','parent_id','customer_alias')]; const p=classifyAggregate(x); assert(p.ready); assert.equal([...p.owned.values()].filter(v=>v.kind==='actual-FK-to-already-owned-new-parent').length,1); });
test('current-looking actor prefix without an exact registry ID blocks', () => { const x=setup(); x.add('platform_user',{id:id(777),username:'r3m_'+runId.replaceAll('-','')+'_looks_owned'}); assert.throws(()=>classifyAggregate(x),/Unregistered new actor/); });
test('registered seed actor ID cannot be lent as an ownership root', () => { const x=setup(); x.actors[0].userId=x.seed.platform_user.id; assert.throws(()=>classifyAggregate(x),/seed ID/); });
test('any changed ordinary seed blocks the entire transaction plan', () => { const x=setup(); x.current.find(t=>t.name==='customer').rows[0]=JSON.stringify({...x.seed.customer,display_name:'changed'}); assert.throws(()=>classifyAggregate(x),/non-number changed seed/); });
test('unknown new row with no FK or attribution blocks', () => { const x=setup(); x.add('customer_alias',{id:id(12)}); const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); });
function securityFixture() { const x=setup(), requestId=id(888), route='/api/leads?page=invalid'; x.add('security_event',{id:id(33),actor_id:null,event_type:'auth.session.invalid',request_id:requestId,path:route,method:'GET'}); x.guardRequests=[{backend:'rust',targetBackend:'rust',runId,requestId,route,method:'GET',rawWireVerified:true,report:{synthetic:true},eventIndex:4,reportCompleted:false,rawWire:{synthetic:true}}]; return x; }
test('actor-null guard event requires exact validated request triple; partial is cleanup only', () => { const x=securityFixture(); const p=classifyAggregate(x); assert(p.ready); const proof=[...p.owned.values()].find(v=>v.kind==='actual-current-batch-guard-request'); assert.equal(proof.partialMayEstablishCleanupOwnershipOnly,true); });
test('actor-null event without exact request source remains orphan', () => { const x=securityFixture(); x.guardRequests=[]; assert.equal(classifyAggregate(x).orphans.length,1); });
test('same request ID with a different path cannot own an event', () => { const x=securityFixture(); x.guardRequests[0].route='/api/customers'; assert.equal(classifyAggregate(x).orphans.length,1); });
test('unregistered event type does not borrow a matching request root', () => { const x=securityFixture(); const table=x.current.find(t=>t.name==='security_event'), row=JSON.parse(table.rows[0]); row.event_type='other.unknown'; table.rows[0]=JSON.stringify(row); assert.equal(classifyAggregate(x).orphans.length,1); });
test('missing actual FK target rejects the plan rather than guessing', () => { const x=setup(); x.add('customer_alias',{id:id(11),customer_id:id(777)}); x.foreignKeys=[fk('customer_alias','customer_id','customer')]; assert.throws(()=>classifyAggregate(x),/no current target/); });
function randomActorFixture(suffix='deadbeef') {
  const x=setup(); x.actor.username='r3m_'+runId.replaceAll('-','')+'_'+suffix;
  for (const [table,field,value] of [['platform_user','username',x.actor.username],['org_unit','code','r3m-'+runId+'-'+x.actor.orgId.slice(0,8)],['role','role_key','r3m-'+runId+'-'+x.actor.roleId.slice(0,8)]]) {
    const rows=x.current.find(t=>t.name===table).rows, index=rows.findIndex(raw=>JSON.parse(raw).id==={platform_user:x.actor.userId,org_unit:x.actor.orgId,role:x.actor.roleId}[table]);
    const row=JSON.parse(rows[index]); row[field]=value; rows[index]=JSON.stringify(row);
  }
  return x;
}
test('registered fixture-actor random8 username with exact UUID-derived org/role codes is valid', () => { const x=randomActorFixture(); x.add('customer',{id:id(10),created_by:x.actor.userId}); const p=classifyAggregate(x); assert(p.ready); assert.equal(p.owned.size,4); });
test('registered random-style username still rejects an invalid suffix', () => { for(const suffix of ['deadbeef0','deadbeeZ','DEADBEEF','deadbee']) assert.throws(()=>classifyAggregate(randomActorFixture(suffix)),/Unapproved registered actor username suffix/); });
test('valid random8 prefix/suffix cannot replace the exact registered user ID', () => { const x=randomActorFixture(); x.add('platform_user',{id:id(777),username:'r3m_'+runId.replaceAll('-','')+'_cafebabe'}); assert.throws(()=>classifyAggregate(x),/Unregistered new actor ID/); });
test('random8 registration requires the complete organization code derived from its own registered UUID', () => { const x=randomActorFixture(), rows=x.current.find(t=>t.name==='org_unit').rows, index=rows.findIndex(raw=>JSON.parse(raw).id===x.actor.orgId), row=JSON.parse(rows[index]); row.code='r3m-'+runId+'-deadbeef'; rows[index]=JSON.stringify(row); assert.throws(()=>classifyAggregate(x),/Exact registered organization code/); });
test('random8 registration requires the complete role key derived from its own registered UUID', () => { const x=randomActorFixture(), rows=x.current.find(t=>t.name==='role').rows, index=rows.findIndex(raw=>JSON.parse(raw).id===x.actor.roleId), row=JSON.parse(rows[index]); row.role_key='r3m-'+runId+'-deadbeef'; rows[index]=JSON.stringify(row); assert.throws(()=>classifyAggregate(x),/Exact registered role key/); });
