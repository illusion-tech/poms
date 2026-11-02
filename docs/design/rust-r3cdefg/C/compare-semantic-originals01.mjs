// Independent C static reader. No product, HTTP, DB, private or Root runner execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='E:/projects/worktrees/poms-r3cdefg-next16/poms';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const output='tmp/rust-r3cdefg/c-review/g2-semantic-parity-analysis01.json';
assert(!fs.existsSync(output));
const paths=[
 'tmp/rust-r3cdefg/semantics-parity01-nest/report01.json',
 'tmp/rust-r3cdefg/semantics-extra-parity01-nest/report01.json',
 'tmp/rust-r3cdefg/semantics-parity03-rust/report01.json',
 'tmp/rust-r3cdefg/semantics-extra-parity03-rust/report01.json',
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>{const bytes=fs.readFileSync(file);return{file,bytes:bytes.length,rawBytesSha256:hash(bytes)}};
const reports=paths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
for(const r of reports)assert(r.completed&&r.failedAt===null);
const pairs=[...reports[0].cases.map((c,i)=>[c,reports[2].cases[i]]),...reports[1].cases.map((c,i)=>[c,reports[3].cases[i]])];
assert.equal(pairs.length,45);for(const[a,b]of pairs)assert.equal(a.label,b.label);
const ids=[new Map,new Map],reverse=[new Map,new Map],identityPairs=[];
function bind(a,b,context){
 assert.equal(typeof a,'string',context);assert.equal(typeof b,'string',context);
 const x=a.toLowerCase(),y=b.toLowerCase();
 if(x===y)return; // unchanged fixed UUID/sentinel need no normalization
 const ax=ids[0].get(x),by=ids[1].get(y);
 if(ax||by){assert(ax&&by&&ax===by,'Non-bijective identity '+context+' '+a+' '+b);return}
 const key='generated-id.'+identityPairs.length;ids[0].set(x,key);ids[1].set(y,key);reverse[0].set(key,x);reverse[1].set(key,y);
 identityPairs.push({logical:key,native:a,rust:b,origin:context});
}
for(let i=0;i<reports[0].actors.length;i++){
 const a=reports[0].actors[i],b=reports[2].actors[i];assert.equal(a.label,b.label);
 for(const key of ['userId','orgId','roleId'])bind(a[key],b[key],'actor.'+a.label+'.'+key);
}
bind(reports[0].runId,reports[2].runId,'actual-run-id');
for(const[n,r]of[[reports[0],reports[2]],[reports[1],reports[3]]])
 for(const type of Object.keys(n.created||{})){
  assert.equal(n.created[type].length,r.created[type].length);
  for(let i=0;i<n.created[type].length;i++)bind(n.created[type][i],r.created[type][i],'created.'+type+'.'+i);
 }
const actorFor=(side,index)=>reports[side?2:0].actors.find(a=>a.label===(index===0?'admin':'other'));
const raceFacts=[],invariants=[],issues=[];
function record(label,side,name,fn){
 try{const facts=fn();invariants.push({label,backend:side?'rust':'native',name,result:'Pass',facts});return facts}
 catch(e){issues.push({label,backend:side?'rust':'native',name,error:e.message});return null}
}
const raceLabels=new Set(['project_technical_cost_package-concurrent-first','project_bid_commercial_process-concurrent-first','extra-contact-two-readers-CAS','extra-followup-replace-two-readers-CAS']);
const isResponse=v=>v&&typeof v==='object'&&typeof v.status==='number'&&Object.hasOwn(v,'body')&&Object.hasOwn(v,'rawWire');
function clean(v){
 if(isResponse(v))return{status:v.status,body:clean(v.body)};
 if(Array.isArray(v))return v.map(clean);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['startedAt','completedAt'].includes(k)).map(([k,x])=>[k,clean(x)]));
 return v;
}
const workingPairs=pairs.map(([a,b])=>[clean(a),clean(b)]);
for(let ci=0;ci<pairs.length;ci++){
 const label=pairs[ci][0].label;if(!raceLabels.has(label))continue;
 for(let side=0;side<2;side++){
  const c=pairs[ci][side],w=workingPairs[ci][side];
  record(label,side,'two waiters and one successful participant',()=>{
   assert.equal(c.waitingBeforeRelease,2);assert.equal(c.responses.length,2);
   const successStatus=label.startsWith('project_')?201:200;
   assert.deepEqual(c.responses.map(x=>x.status).sort((a,b)=>a-b),[successStatus,500]);
   const index=c.responses.findIndex(x=>x.status===successStatus),winner=c.responses[index],loser=c.responses[1-index],actor=actorFor(side,index);
   assert.deepEqual(loser.body,{...(loser.body)});assert.equal(loser.body.statusCode,500);assert.equal(loser.body.message,'Internal server error');
   assert.equal(winner.body.updatedBy,actor.userId);assert.equal(winner.body.createdBy,label==='extra-contact-two-readers-CAS'?c.before.created_by:actor.userId);
   raceFacts.push({label,backend:side?'rust':'native',winnerIndex:index,winnerActor:index===0?'admin':'other',winnerId:winner.body.id,winnerRequestId:winner.requestId,loserRequestId:loser.requestId});
   w.responses=[clean(winner),clean(loser)];
   if(label.startsWith('project_')){
    assert.equal(c.after.length,1);const row=c.after[0];assert.equal(row.id,winner.body.id);assert.equal(row.created_by,actor.userId);assert.equal(row.updated_by,actor.userId);
    assert.equal(row.version,1);assert.equal(row.row_version,1);assert.equal(row.is_current,true);assert.equal(row.status,'effective');assert.equal(row.supersedes_id,null);
    w.responses[0].body.createdBy='proven-race-winner-actor';w.responses[0].body.updatedBy='proven-race-winner-actor';
    w.after[0].created_by='proven-race-winner-actor';w.after[0].updated_by='proven-race-winner-actor';
   }else if(label==='extra-contact-two-readers-CAS'){
    const expectedName=index===0?'G1 left':'G1 right';
    assert.equal(winner.body.id,c.before.id);assert.equal(winner.body.name,expectedName);assert.equal(c.after.id,winner.body.id);assert.equal(c.after.name,expectedName);assert.equal(c.after.updated_by,actor.userId);
    assert.equal(c.after.row_version,c.before.row_version+1);assert.equal(winner.body.rowVersion,c.after.row_version);
    const changed=new Set(['name','updated_by','updated_at','row_version']);
    for(const key of Object.keys(c.before))if(!changed.has(key))assert.deepEqual(c.after[key],c.before[key],'unchanged contact '+key);
    assert.equal(c.actualAudits.length,1);const audit=c.actualAudits[0];
    assert.equal(audit.request_id,winner.requestId);assert.equal(audit.operator_id,actor.userId);assert.equal(audit.target_id,c.before.id);assert.equal(audit.target_type,'customer-contact');assert.equal(audit.event_type,'customer-contact.updated');
    assert.deepEqual(audit.before_snapshot,{name:c.before.name});assert.deepEqual(audit.after_snapshot,{name:expectedName});
    assert.equal(audit.result,'success');assert.deepEqual(audit.metadata.changedFields,['name']);assert.deepEqual(audit.metadata.redactedFields,[]);
    w.responses[0].body.name='proven-race-winner-name';w.responses[0].body.updatedBy='proven-race-winner-actor';
    w.after.name='proven-race-winner-name';w.after.updated_by='proven-race-winner-actor';
    w.actualAudits[0].after_snapshot.name='proven-race-winner-name';w.actualAudits[0].operator_id='proven-race-winner-actor';
   }else{
    const expectedName=index===0?'G1 left':'G1 right';
    assert.equal(winner.body.summary,expectedName);assert.equal(winner.body.replacementReason,expectedName);
    assert.equal(c.oldAfter.id,c.before.id);assert.equal(c.oldAfter.row_version,c.before.row_version+1);assert.equal(c.oldAfter.status,'superseded');assert.equal(c.oldAfter.replaced_by_record_id,winner.body.id);
    assert.equal(c.oldAfter.updated_by,actor.userId);assert.equal(c.newRows.length,1);const nr=c.newRows[0];
    assert.equal(nr.id,winner.body.id);assert.equal(nr.created_by,actor.userId);assert.equal(nr.updated_by,actor.userId);assert.equal(nr.summary,expectedName);assert.equal(nr.replacement_reason,expectedName);
    assert.equal(nr.row_version,1);assert.equal(nr.supersedes_record_id,c.before.id);assert.equal(nr.status,'active');
    const oldTodo=c.todos.filter(x=>x.source_id===c.before.id),newTodo=c.todos.filter(x=>x.source_id===winner.body.id);
    assert.equal(oldTodo.length,1);assert.equal(newTodo.length,1);assert.equal(oldTodo[0].status,'completed');assert.equal(newTodo[0].status,'open');assert.equal(newTodo[0].summary,expectedName);assert.equal(newTodo[0].assignee_user_id,c.before.owner_user_id);
    w.responses[0].body.summary='proven-race-winner-text';w.responses[0].body.replacementReason='proven-race-winner-text';w.responses[0].body.createdBy='proven-race-winner-actor';w.responses[0].body.updatedBy='proven-race-winner-actor';
    w.oldAfter.updated_by='proven-race-winner-actor';
    w.newRows[0].summary='proven-race-winner-text';w.newRows[0].replacement_reason='proven-race-winner-text';w.newRows[0].created_by='proven-race-winner-actor';w.newRows[0].updated_by='proven-race-winner-actor';
    w.todos.find(x=>x.source_id===winner.body.id).summary='proven-race-winner-text';
   }
   return{winnerIndex:index,winnerActor:index===0?'admin':'other',winnerRequestId:winner.requestId,successStatus};
  });
 }
}
// Bind only generated row/entity IDs, session IDs and actual response request IDs.
// Fixed input UUIDs and arbitrary UUID-looking text are not auto-paired.
function discover(a,b,path=''){
 if(Array.isArray(a)&&Array.isArray(b)){assert.equal(a.length,b.length,'Array cardinality '+path);for(let i=0;i<a.length;i++)discover(a[i],b[i],path+'.'+i);return}
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return;
 if(typeof a.id==='string'&&typeof b.id==='string')bind(a.id,b.id,path+'.actual-entity.id');
 if(typeof a.requestId==='string'&&typeof b.requestId==='string')bind(a.requestId,b.requestId,path+'.actual-request.id');
 for(const k of Object.keys(a))if(Object.hasOwn(b,k))discover(a[k],b[k],path+'.'+k);
}
for(let ci=0;ci<pairs.length;ci++)discover(workingPairs[ci][0],workingPairs[ci][1],pairs[ci][0].label);
// Actual requestId is transport metadata omitted by clean(); bind corresponding
// response request IDs separately, success/loser ordered only for proved races.
function requestIds(a,b,path){
 if(isResponse(a)&&isResponse(b)){bind(a.requestId,b.requestId,path+'.requestId');return}
 if(Array.isArray(a)&&Array.isArray(b)){for(let i=0;i<Math.min(a.length,b.length);i++)requestIds(a[i],b[i],path+'.'+i);return}
 if(a&&b&&typeof a==='object'&&typeof b==='object')for(const k of Object.keys(a))if(Object.hasOwn(b,k)&&k!=='responses')requestIds(a[k],b[k],path+'.'+k);
}
for(const[a,b]of pairs){requestIds(a,b,a.label);if(raceLabels.has(a.label)){
 const aa=[...a.responses].sort((x,y)=>x.status-y.status),bb=[...b.responses].sort((x,y)=>x.status-y.status);
 for(let i=0;i<aa.length;i++)bind(aa[i].requestId,bb[i].requestId,a.label+'.ordered-response.'+i);
}}
const generatedKeys=new Set(['generatedAt','generated_at','voidedAt','voided_at','createdAt','created_at','updatedAt','updated_at','effectiveAt','effective_at','completedAt','completed_at','canceledAt','canceled_at','last_seen_at','idle_expires_at']);
const uuid=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const timeNorm=[],idNorm=[];
function normalize(v,side,path='',key='',parent=null){
 if(Array.isArray(v))return v.map((x,i)=>normalize(x,side,path+'.'+i,key,v));
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k],side,path+'.'+k,k,v)]));
 if(typeof v!=='string')return v;
 if((generatedKeys.has(key)||(key==='occurred_at'&&parent&&Object.hasOwn(parent,'event_type')))&&Number.isFinite(Date.parse(v))){
  timeNorm.push({side,path,original:v});return'generated-server-time';
 }
 return v.replace(uuid,id=>{const logical=ids[side].get(id.toLowerCase());if(!logical)return id;idNorm.push({side,path,original:id,logical});return(id===id.toUpperCase()&&/[A-F]/.test(id)?'UPPER:':'')+logical});
}
function diffs(a,b,path='',out=[]){
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
   if(!Object.hasOwn(a,k)||!Object.hasOwn(b,k))out.push({path:path+'.'+k,nativePresent:Object.hasOwn(a,k),rustPresent:Object.hasOwn(b,k),native:a[k],rust:b[k]});
   else diffs(a[k],b[k],path+'.'+k,out);
  }
 }else if(!Object.is(a,b))out.push({path,native:a,rust:b});
 return out;
}
const caseResults=[];
for(let i=0;i<pairs.length;i++){
 const label=pairs[i][0].label;
 const left=normalize(workingPairs[i][0],0,label),right=normalize(workingPairs[i][1],1,label);
 const differences=diffs(left,right,label);
 const session=[];
 for(let side=0;side<2;side++){
  const c=pairs[i][side];
  if(c.sessionBefore){
   const s=record(label,side,'session identity/version/time invariant',()=>{
    assert.equal(c.sessionBefore.length,c.sessionAfter.length);
    return c.sessionBefore.map((before,index)=>{
     const after=c.sessionAfter[index];assert.equal(before.id,after.id);assert.equal(before.user_id,after.user_id);
     assert(Date.parse(after.last_seen_at)>Date.parse(before.last_seen_at));assert(Date.parse(after.updated_at)>=Date.parse(before.updated_at));
     assert.equal(Date.parse(after.idle_expires_at)-Date.parse(after.last_seen_at),900000);
     assert.equal(before.last_ip,after.last_ip);
     return{rowVersionBefore:before.row_version,rowVersionAfter:after.row_version,delta:after.row_version-before.row_version,ipBefore:before.last_ip,ipAfter:after.last_ip,idleTtlMs:900000};
    });
   });session.push({backend:side?'rust':'native',facts:s});
  }
 }
 caseResults.push({label,result:differences.length?'Observed-differences':'Equal-under-declared-generated-fields-and-proved-winner-outcomes',differences,session});
}
// Concrete same-backend state-transition checks never normalize fields.
for(const[a,b]of pairs)for(const[c,side]of[[a,0],[b,1]]){
 const label=c.label;
 if(/^(cost|bid|pricing)-second-version$/.test(label))record(label,side,'parent INSERT rejection leaves old row byte-value-equivalent',()=>{assert.equal(c.HTTP.status,500);assert.equal(c.after.length,1);assert.deepEqual(c.after[0],c.before);return{oldRowUnchanged:true};});
 if(['contact-email-dto-db-length','contact-audit-failure-atomicity','extra-contact-update-denial-rolls-back-prior-audit'].includes(label))record(label,side,'contact failure unchanged row',()=>{assert.equal(c.HTTP.status,500);assert.deepEqual(c.before,c.after);if(Object.hasOwn(c,'actualAudits'))assert.equal(c.actualAudits,0);return{unchanged:true};});
 if(['cost-child-insert-failure','bid-child-insert-failure','cost-large-9999'].includes(label))record(label,side,'failed create no parent residual',()=>{assert.equal(c.HTTP.status,500);assert.deepEqual(c.rows,[]);return{parents:0};});
 if(['followup-todo-insert-failure-boundary','extra-followup-insert-denial-rolls-back-prior-todo','extra-followup-dictionary33-varchar32'].includes(label))record(label,side,'failed followup/Todo graph empty',()=>{assert.equal(c.HTTP.status,500);assert.deepEqual(c.todos,[]);assert.deepEqual(c.after??c.records,[]);return{records:0,todos:0};});
 if(label==='followup-postsave-audit-failure')record(label,side,'void committed despite audit500',()=>{assert.equal(c.HTTP.status,500);assert.equal(c.after.status,'voided');assert.equal(c.after.row_version,c.before.row_version+1);assert.equal(c.actualAudits,0);assert(c.todos.length>0&&c.todos.every(t=>t.status==='canceled'));return{businessCommitted:true,todoCanceled:true,audits:0};});
 if(label==='extra-followup-replace-postsave-audit-failure')record(label,side,'replace committed despite audit500',()=>{assert.equal(c.HTTP.status,500);assert.equal(c.oldAfter.status,'superseded');assert.equal(c.newRows.length,1);assert.equal(c.newRows[0].status,'active');assert.equal(c.oldAfter.replaced_by_record_id,c.newRows[0].id);assert.equal(c.newRows[0].supersedes_record_id,c.oldBefore.id);assert.equal(c.actualAudits,0);return{businessCommitted:true,audits:0};});
 if(/^extra-followup-replace-(same-owner-no-next|different-owner|null-owner)$/.test(label))record(label,side,'managed Todo overlay outcome',()=>{assert.equal(c.HTTP.status,200);const same=label.endsWith('same-owner-no-next');assert(c.oldTodosAfter.length>0);assert(c.oldTodosAfter.every(t=>t.status===(same?'completed':'canceled')));assert.equal(c.newTodos.length,label.endsWith('different-owner')?1:0);return{oldTodoStatus:same?'completed':'canceled',newTodos:c.newTodos.length};});
 if(label==='extra-null-owner-create-leaves-old-stream-open')record(label,side,'null-owner early return preserves stream',()=>{assert.equal(c.HTTP.status,201);assert.equal(c.HTTP.body.ownerUserId,null);assert(c.oldTodos.length>0&&c.oldTodos.every(t=>t.status==='open'));assert.deepEqual(c.newTodos,[]);return{oldOpen:true,newTodos:0};});
 if(label==='followup-replace-two-way-fk')record(label,side,'replacement links and Todo overlay',()=>{assert.equal(c.HTTP.status,200);assert.equal(c.oldAfter.status,'superseded');assert.equal(c.newAfter.status,'active');assert.equal(c.oldAfter.replaced_by_record_id,c.newAfter.id);assert.equal(c.newAfter.supersedes_record_id,c.oldAfter.id);const old=c.todos.find(t=>t.source_id===c.oldAfter.id),nt=c.todos.find(t=>t.source_id===c.newAfter.id);assert.equal(old.status,'completed');assert.equal(nt.status,'open');return{twoWayLinks:true,oldTodo:'completed',newTodo:'open'};});
}
const report={
 kind:'C-independent-read-only-deep-compare-of-Root-actual-semantic-originals',
 createdAt:new Date().toISOString(),inputs:paths.map(pin),caseCount:45,identityPairs,
 normalizations:{generatedIdBinding:'Explicit actors/run/created records, then actual entity IDs only; bidirectional reuse is asserted. Fixed input UUIDs are not auto-paired.',generatedTimes:[...generatedKeys],fixedDates:'Domain occurredAt/occurred_at/nextFollowUpAt/next_follow_up_at/dueAt/due_at remain exact. Audit occurred_at only is generated.',winnerOutcomes:'Only after two-waiter/status/actor/row/audit checks; scoped modified paths are explicit in this static reader.',transportMetadata:'HTTP status+full body compared; headers/raw-wire hashes are retained source evidence, not compared as business parity.'},
 raceFacts,caseResults,invariantChecks:invariants,invariantFailures:issues,
 differences:caseResults.flatMap(c=>c.differences.map(d=>({label:c.label,...d}))),
 normalizationAudit:{generatedTimes:timeNorm,generatedIDs:idNorm},
 independentlyExecutedProduct:false,independentStaticOriginalReading:true,
 G3Certified:false,G4Certified:false,
};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,pin:pin(output),cases:45,differences:report.differences.length,invariantFailures:issues,firstDifferences:report.differences.slice(0,45)}));
