// ID and wall-clock normalization only. Observable array order, raw UTF-16,
// null/undefined, all errors and SQLSTATE, versions and every DB column remain.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const tag=process.argv[2],revision=process.argv[3]??'01';assert([3,4].includes(process.argv.length)&&/^[a-z0-9-]{1,35}$/.test(tag??'')&&/^[a-z0-9-]{1,20}$/.test(revision));
const input=`tmp/rust-r2l1/common-acceptance-${tag}.json`,output=`tmp/rust-r2l1/common-diff-${tag}-${revision}.json`;assert(!fs.existsSync(output));
const raw=fs.readFileSync(input),source=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
const report={formatVersion:1,input,inputRawBytesSha256:sha(raw),normalizerRawBytesSha256:sha(fs.readFileSync(new URL(import.meta.url))),result:'pending',cases:[],normalization:{ids:'bijection keyed by fixed fixture IDs and generated-row natural identity, unknown rolled-back IDs by first occurrence within the same case',wallClock:'Before substitution: creation/write step bounds, unchanged persisted fields, Native mutation template, returned Date to actual PG milliseconds or historical before values. Whole-run bound is only secondary. Fixed2020 exact; required-error entity Date literals must come from actual create step.',arrayOrder:'preserved except confirmation.progress/latest participants may permute within exactly equal original created_at keys. Tie bucket sizes and outside-tie order are compared. Unordered DB fact sets sort by normalized PK.',errors:'kind/status/message/SQLSTATE all compared exactly after ID substitution; no error-message exclusion'}};
const uuid=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
const preparedMaps=new Map();
function prepare(backend){
 const b=source.backends[backend];assert.equal(b.result,'observed');assert(b.doubleZero);const map=new Map(Object.entries(source.ids).map(([k,id])=>[id,'fixture:'+k]));
 for(const [k,id]of Object.entries(b.actors)){map.set(id,'actor:'+k);map.set(id.toUpperCase(),'ACTOR:'+k.toUpperCase());}
 const rows=Object.fromEntries(Object.keys(b.cases[0].after).map(k=>[k,new Map()]));for(const c of b.cases)for(const [table,rs]of Object.entries(c.after))for(const r of rs)rows[table].set(r.id,r);
 const known=v=>typeof v==='string'?(map.get(v)??v):v;
 const add=(table,key)=>{for(const r of rows[table].values())if(!map.has(r.id))map.set(r.id,table+':'+key(r));};
 add('approval_summary_package_definition',r=>r.approval_scenario_key+':'+r.summary_package_key);
 add('approval_summary_snapshot',r=>known(r.target_id)+':'+r.approval_scenario_key+':'+r.projection_level);
 add('confirmation_record',r=>known(r.target_id)+':'+r.confirmation_type);
 add('approval_summary_field_projection',r=>known(r.summary_snapshot_id)+':'+r.field_key);
 add('confirmation_participant',r=>known(r.confirmation_record_id)+':'+known(r.participant_id)+':'+r.participant_role_key);
 add('todo_item',r=>known(r.source_id)+':'+known(r.assignee_user_id)+':'+r.todo_type);
 assert.equal(new Set(map.values()).size,map.size,'Normalization must be injective');
 preparedMaps.set(backend,map);
 let unknown=new Map();
 const inWindow=(value,timing)=>{const t=Date.parse(value);return timing&&Number.isFinite(t)&&t>=Date.parse(timing.startedAt)-1&&t<=Date.parse(timing.finishedAt)+1;};
 function checkClocks(c){
  const native=source.backends.nest.cases.find(n=>n.input.caseId===c.input.caseId),nativeMap=preparedMaps.get('nest');
  const nativeRow=(table,row,facts)=>facts[table].find(r=>nativeMap.get(r.id)===map.get(row.id));
  assert.equal(c.stepTimings.length,c.observation.steps.length,'Every observed step requires actual timing');
  for(const [i,t]of c.stepTimings.entries()){assert.equal(t.index,c.observation.steps[i].index);assert(Date.parse(t.startedAt)<=Date.parse(t.finishedAt));}
  const timing=index=>c.stepTimings.find(t=>t.index===index),steps=c.input.steps;
  const successful=i=>c.observation.steps.some(s=>s.index===i&&s.ok);
  const lastIndex=predicate=>{const indexes=steps.map((s,i)=>predicate(s,i)?i:-1).filter(i=>i>=0&&successful(i));return indexes.at(-1);};
  const sourceSql=source.backends.nest.sql.filter(q=>q.caseId===c.input.caseId&&q.phase==='start'&&q.command==='UPDATE'&&/updated_at/.test(q.sqlShape??''));
  const updatedIndex=table=>sourceSql.filter(q=>q.relations.includes(table)).map(q=>q.step).at(-1);
  const createdIndex=(table,row)=>{
   const op=table==='approval_summary_package_definition'?'summary.definition.create':table==='approval_summary_snapshot'?'summary.snapshot.create':table==='approval_summary_field_projection'?'summary.projection.create':null;
   const direct=lastIndex(s=>s.op===op&&s.input?.id===row.id);if(direct!==undefined)return direct;
   if(['approval_summary_snapshot','approval_summary_field_projection'].includes(table)){const snapshot=table==='approval_summary_snapshot'?row:c.after.approval_summary_snapshot.find(r=>r.id===row.summary_snapshot_id);return lastIndex(s=>s.op==='summary.create'&&s.input?.targetId===snapshot?.target_id);}
   const record=table==='confirmation_record'?row:table==='confirmation_participant'?c.after.confirmation_record.find(r=>r.id===row.confirmation_record_id):table==='todo_item'?c.after.confirmation_record.find(r=>r.id===row.source_id):null;
   return record?lastIndex(s=>s.op==='confirmation.create'&&s.input?.input?.targetId===record.target_id):undefined;
  };
  function mutationIndex(table,row){
   const n=nativeRow(table,row,native.after),old=nativeRow(table,row,native.before);assert(n);
   if(old&&JSON.stringify(n)===JSON.stringify(old))return undefined;
   // An UPDATE of another row in this same table must not make a historical
   // row appear to require a new timestamp. The original actual row is the
   // mutation template; returned Rust dates still have to satisfy its stage.
   if(old&&n.updated_at===old.updated_at&&n.row_version===old.row_version&&Object.keys(n).every(k=>k.endsWith('_at')||JSON.stringify(n[k])===JSON.stringify(old[k])))return undefined;
   if(table==='confirmation_participant'||table==='todo_item'){
    const actor=table==='confirmation_participant'?row.participant_id:row.assignee_user_id,record=table==='confirmation_participant'?row.confirmation_record_id:row.source_id;
    const closed=table==='confirmation_participant'?row.participant_status==='closed':row.status==='canceled';
    const index=lastIndex(s=>(closed?s.op==='confirmation.close':s.op==='confirmation.confirm')&&s.input?.id===record&&(closed||s.input?.actorId===actor));if(index!==undefined)return index;
   }
   return updatedIndex(table);
  }
  for(const [table,rs]of Object.entries(c.after))for(const row of rs){
   const before=c.before[table].find(r=>r.id===row.id),create=createdIndex(table,row),update=mutationIndex(table,row);
   for(const [key,value]of Object.entries(row))if(/_at$/.test(key)&&typeof value==='string'){
    const old=before?.[key];
    if(key==='updated_at'&&update!==undefined){assert(inWindow(value,timing(update)),`${table}.${key} did not refresh in actual write step ${update}`);continue;}
    if(before&&old===value)continue;
    if(!before&&create!==undefined&&/^202[6-9]-/.test(value)){assert(inWindow(value,timing(create)),`${table}.${key} outside creation step ${create}`);continue;}
    if(before&&old!==value){assert(!['created_at','generated_at','submitted_at'].includes(key),'Immutable generated timestamp changed');assert(update!==undefined&&inWindow(value,timing(update)),`${table}.${key} outside actual mutation step`);}
   }
  }
  const findRow=(id,facts)=>Object.values(facts).flat().find(r=>r.id===id);
  function linkedDates(value,nativeValue,index,parentRecord){
   if(Array.isArray(value)){value.forEach((v,i)=>linkedDates(v,nativeValue?.[i],index,parentRecord));return;}
   if(!value||typeof value!=='object')return;
   const currentRecord=value.confirmationType?value.id:parentRecord;
   const row=value.id?findRow(value.id,c.after):value.participantId&&currentRecord?c.after.confirmation_participant.find(r=>r.confirmation_record_id===currentRecord&&r.participant_id===value.participantId):null;
   const nativeRecord=nativeValue?.confirmationType?nativeValue.id:undefined;
   const nativeRow=nativeValue?.id?findRow(nativeValue.id,native.after):nativeValue?.participantId&&parentRecord?native.after.confirmation_participant.find(r=>r.participant_id===nativeValue.participantId&&r.confirmation_record_id===native.observation.steps.find(s=>s.index===index)?.value?.id):null;
   for(const [key,v]of Object.entries(value)){
    if(/At$/.test(key)&&typeof v==='string'){
     const column=key.replace(/[A-Z]/g,ch=>'_'+ch.toLowerCase()),nv=nativeValue?.[key],nr=nativeRow?.[column];
     const oldRow=nativeValue?.id?findRow(nativeValue.id,native.before):null,ownOldRow=value.id?findRow(value.id,c.before):null;
     if(row&&nr&&Date.parse(nv)===Date.parse(nr))assert.equal(Date.parse(v),Date.parse(row[column]),`Returned ${key} must match actual PG Date milliseconds`);
     else if(oldRow?.[column]&&ownOldRow&&Date.parse(nv)===Date.parse(oldRow[column]))assert.equal(Date.parse(v),Date.parse(ownOldRow[column]),`Returned historical ${key} must retain actual pre-case value`);
     else if(typeof nv==='string'&&/^202[6-9]-/.test(nv)){
      const stage=native.stepTimings.find(t=>t.index<=index&&inWindow(nv,t));if(stage)assert(inWindow(v,timing(stage.index)),`Returned ${key} outside original generating step`);
     }
    }else linkedDates(v,nativeValue?.[key],index,currentRecord??nativeRecord);
   }
  }
  for(const observation of c.observation.steps){
   const n=native.observation.steps.find(s=>s.index===observation.index);if(observation.ok&&observation.defined)linkedDates(observation.value,n?.value,observation.index);
   const message=observation.error?.message;if(typeof message==='string'&&/^Value for .* is required,/.test(message)&&message.includes('\nentity:'))for(const match of message.matchAll(/(?:createdAt|updatedAt): (20\d\d-\d\d-\d\dT[0-9:.]+Z)/g))assert(steps.some((s,i)=>s.op.endsWith('.create')&&inWindow(match[1],timing(i))),'Required-error Date does not come from actual entity creation step');
  }
 }
 function normalize(value,key=''){
  if(typeof value==='string'){
   if(/(?:At|_at)$/.test(key)&&/^202[6-9]-/.test(value)){
    const time=Date.parse(value);assert(Number.isFinite(time)&&time>=Date.parse(source.at)-1000&&time<=Date.parse(source.finishedAt)+1000,'Generated time outside actual run');
    return '<generated-time:'+key+'>';
   }
   const text=key==='message'&&/^Value for .* is required,/.test(value)&&value.includes('\nentity:')?value.replace(/((?:createdAt|updatedAt): )20\d\d-\d\d-\d\dT[0-9:.]+Z/g,'$1<actual-creation-time>'):value;
   return text.replace(uuid,id=>{if(map.has(id))return map.get(id);if(!unknown.has(id))unknown.set(id,'case-generated:'+unknown.size);return unknown.get(id);});
  }
  if(Array.isArray(value))return value.map(v=>normalize(v,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k],k)]));
  return value;
 }
 return {cases:b.cases,normalizeCase:c=>{checkClocks(c);unknown=new Map();const steps=normalize(c.observation.steps);
  for(let index=0;index<steps.length;index++){
   const step=steps[index],original=c.observation.steps[index];
   if(!['confirmation.progress','confirmation.latest'].includes(step.op)||!step.ok||!step.value)continue;
   const participants=original.value.participants,buckets=[];let last;
   for(let i=0;i<participants.length;i++){
    const p=participants[i],r=c.after.confirmation_participant.find(r=>r.confirmation_record_id===original.value.id&&r.participant_id===p.participantId);assert(r,'Progress participant is not in actual persisted facts');const time=Date.parse(r.created_at);assert(Number.isFinite(time));assert(last===undefined||time>=last,'Original created_at order violated');
    if(time!==last)buckets.push([]);buckets.at(-1).push(step.value.participants[i]);last=time;
   }
   step.participantCreatedAtTieBucketSizes=buckets.map(b=>b.length);step.value.participants=buckets.flatMap(bucket=>bucket.sort((a,b)=>(a.participantId+':'+a.participantRoleKey).localeCompare(b.participantId+':'+b.participantRoleKey)));
  }
  for(const r of c.after.confirmation_record){const participants=c.after.confirmation_participant.filter(p=>p.confirmation_record_id===r.id);assert.equal(r.required_count,participants.length);assert.equal(r.confirmed_count,participants.filter(p=>p.participant_status==='confirmed').length);for(const p of participants){const todo=c.after.todo_item.find(t=>t.source_type==='confirmation-record'&&t.source_id===r.id&&t.assignee_user_id===p.participant_id);assert(todo);if(p.participant_status==='confirmed'){assert.equal(todo.status,'completed');assert.equal(todo.completed_at,p.confirmed_at);}else assert.equal(todo.status,p.participant_status==='closed'?'canceled':'open');}}
  return {input:normalize(c.input),steps,before:Object.fromEntries(Object.entries(c.before).map(([t,rs])=>[t,normalize(rs).sort((a,b)=>a.id.localeCompare(b.id))])),after:Object.fromEntries(Object.entries(c.after).map(([t,rs])=>[t,normalize(rs).sort((a,b)=>a.id.localeCompare(b.id))]))};}};
}
try{
 assert.equal(source.result,'observed');assert(source.sourceUnchanged);const left=prepare('nest'),right=prepare('rust');assert.equal(left.cases.length,right.cases.length);
 for(let i=0;i<left.cases.length;i++){
  const a=left.cases[i],b=right.cases[i];assert.equal(a.input.caseId,b.input.caseId);const row={caseId:a.input.caseId,result:'pending'};report.cases.push(row);
  const x=left.normalizeCase(a),y=right.normalizeCase(b);row.nativeNormalizedSha256=sha(JSON.stringify(x));row.rustNormalizedSha256=sha(JSON.stringify(y));
  try{assert.deepEqual(y,x);row.result='pass';}catch(error){row.result='fail';row.difference=error.message;}
 }
 report.result=report.cases.every(c=>c.result==='pass')?'pass':'fail';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,cases:report.cases.length,failed:report.cases.filter(c=>c.result==='fail').map(c=>c.caseId),failure:report.failure??null,output}));if(report.result!=='pass')process.exitCode=1;
