// Pure synthetic regressions for the ownership algorithm, never PG acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAggregate } from './aggregate-plan03.mjs';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const runId = '55555555-5555-4555-8555-555555555555';
function setup() {
  const required = ['platform_user','org_unit','role','customer','customer_alias','lead','project','business_number_sequence','security_event','attachment','attachment_link','audit_log','todo_item','sales_follow_up_record'];
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
test('only the four explicit authoritative actor columns establish direct roots', () => {
  const x=setup();
  for(const [table,column,n] of [['attachment','uploaded_by',40],['attachment_link','linked_by',41],['audit_log','operator_id',42],['security_event','actor_id',43]]) x.add(table,{id:id(n),[column]:x.actor.userId});
  const p=classifyAggregate(x); assert(p.ready); assert.equal([...p.owned.values()].filter(v=>v.kind==='source-defined-own-user-attribution').length,4); assert([...p.owned.values()].filter(v=>v.kind==='source-defined-own-user-attribution').every(v=>v.actualForeignKey===false));
});
test('unknown and seed users do not establish any of the four new direct roots', () => {
  for(const [table,column] of [['attachment','uploaded_by'],['attachment_link','linked_by'],['audit_log','operator_id'],['security_event','actor_id']]) for(const userId of [id(777),id(900)]) { const x=setup(); x.add(table,{id:id(40),[column]:userId}); const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); }
});
test('whitelisted column names on an unrelated table remain ineffective', () => { const x=setup(); x.add('customer_alias',{id:id(40),uploaded_by:x.actor.userId,linked_by:x.actor.userId,operator_id:x.actor.userId,actor_id:x.actor.userId}); const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); });
test('a different actor-like column on a whitelisted table is not adopted', () => { const x=setup(); x.add('attachment',{id:id(40),uploaded_by:null,operator_id:x.actor.userId}); assert.equal(classifyAggregate(x).orphans.length,1); });
function alterCurrent(x,table,identity,patch) { const rows=x.current.find(t=>t.name===table).rows,index=rows.findIndex(raw=>JSON.parse(raw).id===identity); assert(index>=0); rows[index]=JSON.stringify({...JSON.parse(rows[index]),...patch}); }
function todoFixture(kind='customer',sourceByFK=false) {
  const x=setup();
  x.add('customer',{id:id(10),created_by:x.actor.userId}); x.add('lead',{id:id(11),created_by:x.actor.userId}); x.add('project',{id:id(12),created_by:x.actor.userId});
  const source={id:id(20),customer_id:id(10),lead_id:kind==='customer'?null:id(11),project_id:kind==='project'?id(12):null,owner_user_id:x.actor.userId,created_by:sourceByFK?null:x.actor.userId,status:'active'};
  x.add('sales_follow_up_record',source);
  const todo={id:id(30),source_type:'sales-follow-up-record',source_id:source.id,todo_type:'sales-follow-up-reminder',business_domain:'sales',assignee_user_id:x.actor.userId,target_object_type:kind,target_object_id:kind==='project'?id(12):kind==='lead'?id(11):id(10),project_id:kind==='project'?id(12):null,status:'open'};
  x.add('todo_item',todo); if(sourceByFK) x.foreignKeys=[fk('sales_follow_up_record','customer_id','customer')];
  return {...x,source,todo};
}
test('all three F target priorities establish an explicit logical reminder edge', () => {
  for(const kind of ['customer','lead','project']) { const x=todoFixture(kind),p=classifyAggregate(x); assert(p.ready); assert.equal(p.logicalEdges.length,1); assert.equal(p.logicalEdges[0].actualForeignKey,false); assert([...p.owned.values()].some(v=>v.kind==='source-defined-logical-sales-follow-up-reminder')); }
});
test('logical Todo ownership waits for its F source to gain an independent real FK root', () => { const x=todoFixture('customer',true),p=classifyAggregate(x); assert(p.ready); assert([...p.owned.values()].some(v=>v.kind==='actual-FK-to-already-owned-new-parent')); assert.equal(p.logicalEdges.length,1); });
test('a seed F source cannot be lent as a logical ownership root', () => {
  const x=todoFixture(),seedSource={id:id(67),customer_id:x.seed.customer.id,lead_id:null,project_id:null,owner_user_id:x.seed.platform_user.id};
  for(const list of [x.baseline,x.current]) list.find(t=>t.name==='sales_follow_up_record').rows.push(JSON.stringify(seedSource));
  alterCurrent(x,'todo_item',x.todo.id,{source_id:seedSource.id}); const p=classifyAggregate(x); assert.equal(p.orphans.length,1); assert.match(p.orphans[0].reason,/not-an-added-F/);
});
test('missing F source and a bare assignee or invented creator column do not own Todo', () => { const x=todoFixture(); alterCurrent(x,'todo_item',x.todo.id,{source_id:id(777),created_by:x.actor.userId}); const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,1); });
test('an unowned new F cannot become rooted merely because its Todo points back', () => { const x=todoFixture(); alterCurrent(x,'sales_follow_up_record',x.source.id,{created_by:null}); const p=classifyAggregate(x); assert(!p.ready); assert.equal(p.orphans.length,2); assert.equal(p.logicalEdges.length,0); });
test('unknown source type, Todo type and business domain each block logical adoption', () => {
  for(const patch of [{source_type:'approval-record'},{source_type:'sales-follow-up'},{todo_type:'approval'},{business_domain:'commission'}]) { const x=todoFixture(); alterCurrent(x,'todo_item',x.todo.id,patch); assert.equal(classifyAggregate(x).orphans.length,1); }
});
test('matching unknown or seed F owner and Todo assignee still do not qualify', () => {
  for(const assignee of [id(777),id(900)]) { const x=todoFixture(); alterCurrent(x,'sales_follow_up_record',x.source.id,{owner_user_id:assignee}); alterCurrent(x,'todo_item',x.todo.id,{assignee_user_id:assignee}); const p=classifyAggregate(x); assert.equal(p.orphans.length,1); assert.match(p.orphans[0].reason,/not-a-present-exact-registered-new-user/); }
});
test('a registered Todo assignee must still match its exact F owner', () => { const x=todoFixture(); alterCurrent(x,'sales_follow_up_record',x.source.id,{owner_user_id:id(777)}); const p=classifyAggregate(x); assert.equal(p.orphans.length,1); assert.match(p.orphans[0].reason,/does-not-match-its-F-owner/); });
test('mismatched Todo target type, target identity or project context blocks', () => {
  for(const patch of [{target_object_type:'lead'},{target_object_id:id(777)},{project_id:id(12)}]) { const x=todoFixture('customer'); alterCurrent(x,'todo_item',x.todo.id,patch); const p=classifyAggregate(x); assert.equal(p.orphans.length,1); assert.match(p.orphans[0].reason,/does-not-match-its-F-source/); }
});
test('historical completed and canceled reminders retain the same owned source relation', () => {
  for(const [sourceStatus,todoStatus] of [['replaced','completed'],['voided','canceled']]) { const x=todoFixture('lead'); alterCurrent(x,'sales_follow_up_record',x.source.id,{status:sourceStatus}); alterCurrent(x,'todo_item',x.todo.id,{status:todoStatus}); assert(classifyAggregate(x).ready); }
});
