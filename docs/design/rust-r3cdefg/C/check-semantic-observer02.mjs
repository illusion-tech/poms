// C static observer reconciliation only; no SQL/HTTP/product invocation.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3cdefg-next16/poms');
const output='tmp/rust-r3cdefg/c-review/g2-semantic-observer-review02.json';assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}},read=f=>JSON.parse(fs.readFileSync(f));
const observerFiles=['tmp/rust-r3cdefg/observer-parity01-nest-02/exact-numeric-and-side-effects01.json','tmp/rust-r3cdefg/observer-parity03-rust-02/exact-numeric-and-side-effects01.json'];
const sqlFiles=['tmp/rust-r3cdefg/observer-parity01-nest-02/SQL-authority01.json','tmp/rust-r3cdefg/observer-parity03-rust-02/SQL-authority01.json'];
const obs=observerFiles.map(read),sql=sqlFiles.map(read),analysis=read('tmp/rust-r3cdefg/c-review/g2-semantic-parity-analysis02.json');
const core=[read('tmp/rust-r3cdefg/semantics-parity01-nest/report01.json'),read('tmp/rust-r3cdefg/semantics-parity03-rust/report01.json')];
const extra=[read('tmp/rust-r3cdefg/semantics-extra-parity01-nest/report01.json'),read('tmp/rust-r3cdefg/semantics-extra-parity03-rust/report01.json')];
const cov=[read('tmp/rust-r3cdefg/coverage-parity01-nest/report01.json'),read('tmp/rust-r3cdefg/coverage-parity03-rust/report01.json')];
const maps=[new Map,new Map],identityPairs=[...analysis.identityPairs];for(const p of identityPairs){maps[0].set(p.native.toLowerCase(),p.logical);maps[1].set(p.rust.toLowerCase(),p.logical)}
function bind(a,b,path){if(a.toLowerCase()===b.toLowerCase())return;const aa=maps[0].get(a.toLowerCase()),bb=maps[1].get(b.toLowerCase());if(aa||bb){assert(aa&&bb&&aa===bb,'identity '+path);return}const key='observer-generated.'+identityPairs.length;maps[0].set(a.toLowerCase(),key);maps[1].set(b.toLowerCase(),key);identityPairs.push({native:a,rust:b,logical:key,origin:path})}
function discover(a,b,path){if(Array.isArray(a)&&Array.isArray(b)){assert.equal(a.length,b.length,'cardinality '+path);for(let i=0;i<a.length;i++)discover(a[i],b[i],path+'.'+i);return}if(a&&b&&typeof a==='object'&&typeof b==='object'){if(typeof a.id==='string'&&typeof b.id==='string')bind(a.id,b.id,path+'.actual.id');for(const k of Object.keys(a))if(Object.hasOwn(b,k))discover(a[k],b[k],path+'.'+k)}}
for(let i=0;i<1124;i++){discover(cov[0].events[i].response.body,cov[1].events[i].response.body,'coverage.response.'+i);bind(cov[0].events[i].response.requestId,cov[1].events[i].response.requestId,'coverage.request.'+i)}
const uuid=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
function idText(v,side){return v.replace(uuid,id=>{const k=maps[side].get(id.toLowerCase());return k?(id===id.toUpperCase()&&/[A-F]/.test(id)?'UPPER:':'')+k:id})}
// Audit and security identities join on an already paired actual requestId.
for(const field of['audits','security'])for(const a of obs[0][field]){
 const key=idText(a.request_id,0),b=obs[1][field].find(x=>idText(x.request_id,1)===key&&x.event_type===a.event_type);assert(b,'matching '+field+' '+key);bind(a.id,b.id,field+'.request.'+key);
}
const checks=[],failures=[];
function check(label,side,name,fn){try{const facts=fn();checks.push({label,backend:side?'rust':'native',name,result:'Pass',facts})}catch(e){failures.push({label,backend:side?'rust':'native',name,error:e.message})}}
for(let side=0;side<2;side++){
 assert.equal(obs[side].runId,core[side].runId);assert.equal(sql[side].runId,core[side].runId);assert.equal(sql[side].coveredCases.length,45);
 for(const label of['extra-contact-two-readers-CAS','extra-followup-replace-two-readers-CAS']){
  const c=extra[side].cases.find(x=>x.label===label),winner=c.responses.find(x=>x.status===200),loser=c.responses.find(x=>x.status===500);
  check(label,side,'unique audit binds actual winner and PG',()=>{
   const rows=obs[side].audits.filter(x=>[winner.requestId,loser.requestId].includes(x.request_id));assert.equal(rows.length,1);const a=rows[0];
   assert.equal(a.request_id,winner.requestId);assert.equal(a.operator_id,winner.body.updatedBy);assert.equal(a.target_id,c.before.id);assert.equal(a.result,'success');
   if(label.includes('contact')){assert.equal(a.event_type,'customer-contact.updated');assert.deepEqual(a.after_snapshot,{name:winner.body.name});assert.deepEqual(a.before_snapshot,{name:c.before.name});assert.equal(c.after.name,winner.body.name);assert.equal(c.after.updated_by,winner.body.updatedBy);assert.deepEqual(a,c.actualAudits[0])}
   else{assert.equal(a.event_type,'sales-follow-up.replaced');assert.equal(a.target_type,'sales-follow-up-record');assert.equal(a.before_snapshot,null);assert.equal(a.after_snapshot,null);assert.equal(a.reason,null);assert.equal(a.metadata.replacementId,winner.body.id);assert.equal(a.metadata.replacementReason,winner.body.replacementReason);assert.equal(a.metadata.before.summary,c.before.summary);assert.equal(a.metadata.before.status,'active');assert.equal(a.metadata.before.rowVersion,c.before.row_version);assert.equal(a.metadata.after.summary,winner.body.summary);assert.equal(a.metadata.after.supersedesId,c.before.id);assert.equal(a.metadata.after.rowVersion,winner.body.rowVersion);const r=obs[side].followups.find(x=>x.id===winner.body.id);assert(r);assert.equal(r.summary,winner.body.summary);assert.equal(r.created_by,winner.body.createdBy);assert.equal(r.updated_by,winner.body.updatedBy)}
   return{auditId:a.id,winnerRequestId:winner.requestId,loserRequestId:loser.requestId,auditCount:1,eventType:a.event_type};
  });
 }
}
const generated=new Set(['generatedAt','generated_at','createdAt','created_at','updatedAt','updated_at','effectiveAt','effective_at','voidedAt','voided_at','completedAt','completed_at','canceledAt','canceled_at']);
const winnerChanges=[];
function normalize(v,side,path='',key='',parent=null){
 if(Array.isArray(v))return v.map((x,i)=>normalize(x,side,path+'.'+i,key,v));
 if(v&&typeof v==='object'){
  const race=extra[side].cases.find(c=>c.label==='extra-contact-two-readers-CAS'),winner=race.responses.find(r=>r.status===200);
  if(v.target_id===race.before.id&&v.event_type==='customer-contact.updated'){
   assert.equal(v.operator_id,winner.body.updatedBy);assert.deepEqual(v.after_snapshot,{name:winner.body.name});winnerChanges.push({side,path,keys:['operator_id','after_snapshot.name']});v={...v,operator_id:'proven-contact-winner-actor',after_snapshot:{name:'proven-contact-winner-name'}};
  }
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k],side,path+'.'+k,k,v)]));
 }
 if(typeof v!=='string')return v;
 if((generated.has(key)||(key==='occurred_at'&&parent&&Object.hasOwn(parent,'event_type')))&&Number.isFinite(Date.parse(v)))return'generated-server-time';
 // actor username embeds the generated cohort UUID without hyphens.
 const rawRun=core[side].runId.replaceAll('-','');return idText(v.replaceAll(rawRun,'generated-cohort-username'),side);
}
function diffs(a,b,path='',out=[]){if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(!Object.hasOwn(a,k)||!Object.hasOwn(b,k))out.push({path:path+'.'+k,nativePresent:Object.hasOwn(a,k),rustPresent:Object.hasOwn(b,k),native:a[k],rust:b[k]});else diffs(a[k],b[k],path+'.'+k,out)}}else if(!Object.is(a,b))out.push({path,native:a,rust:b});return out}
// Numeric observer intentionally contains no item FK. For the still-anonymous
// generated child IDs, compare exact numeric-text tuples as a multiset. Do not
// claim this can prove each child's parent FK; all parent IDs are explicit.
const anonymousNumericIdentityBinding=[];
for(const nt of obs[0].exactNumericText){
 const rt=obs[1].exactNumericText.find(t=>t.table===nt.table);assert(rt);
 const tuple=r=>JSON.stringify(Object.fromEntries(Object.keys(r).filter(k=>k!=='id').sort().map(k=>[k,r[k]])));
 const left=nt.rows.filter(r=>!maps[0].has(r.id.toLowerCase())).sort((a,b)=>tuple(a).localeCompare(tuple(b))||a.id.localeCompare(b.id));
 const right=rt.rows.filter(r=>!maps[1].has(r.id.toLowerCase())).sort((a,b)=>tuple(a).localeCompare(tuple(b))||a.id.localeCompare(b.id));
 assert.equal(left.length,right.length);
 for(let i=0;i<left.length;i++){assert.equal(tuple(left[i]),tuple(right[i]),'exact anonymous numeric tuple');bind(left[i].id,right[i].id,nt.table+'.anonymous-generated-child-id-exact-numeric-multiset');anonymousNumericIdentityBinding.push({table:nt.table,nativeId:left[i].id,rustId:right[i].id,exactTuple:JSON.parse(tuple(left[i]))})}
}
const nativeFollowKeys=new Set(obs[0].followups.map(r=>idText(r.id,0)));
const selectedFollowups=obs.map((o,side)=>o.followups.filter(r=>nativeFollowKeys.has(idText(r.id,side))));
assert.equal(selectedFollowups[0].length,selectedFollowups[1].length);
const selectedTodos=obs.map((o,side)=>o.todos.filter(r=>nativeFollowKeys.has(idText(r.source_id,side))));
// Todo identities join using the actual generated source and assignee, not the
// arbitrary final query order. In this cohort each source/assignee has one row.
for(const a of selectedTodos[0]){const candidates=selectedTodos[1].filter(b=>idText(a.source_id,0)===idText(b.source_id,1)&&idText(a.assignee_user_id,0)===idText(b.assignee_user_id,1));assert.equal(candidates.length,1);bind(a.id,candidates[0].id,'actual-todo-source-and-assignee')}
const excludedObserverRows=obs.map((o,side)=>({backend:side?'rust':'native',rawFollowupCount:o.followups.length,selectedFollowupCount:selectedFollowups[side].length,rawTodoCount:o.todos.length,selectedTodoCount:selectedTodos[side].length,excludedFollowups:o.followups.filter(r=>!nativeFollowKeys.has(idText(r.id,side))),excludedTodos:o.todos.filter(r=>!nativeFollowKeys.has(idText(r.source_id,side))),classification:'Later observer is a superset after supplementary work. Only exact known45+1124 identities are compared. Excluded rows are retained here, not asserted equivalent or harmless; year0000 drift remains outside this comparison and uncertified.'}));
const pgComparisons=[];
for(const field of['exactNumericText','audits','security','followups','todos']){
 const shape=(side)=>{
  if(field==='exactNumericText')return obs[side][field].map(t=>({table:t.table,numericColumnsExplicitlyCastToText:t.numericColumnsExplicitlyCastToText,rows:[...t.rows].sort((a,b)=>idText(a.id,side).localeCompare(idText(b.id,side)))})).sort((a,b)=>a.table.localeCompare(b.table));
  const rows=field==='followups'?selectedFollowups[side]:field==='todos'?selectedTodos[side]:obs[side][field];
  return [...rows].sort((a,b)=>idText(a.id,side).localeCompare(idText(b.id,side)));
 };
 const differences=diffs(normalize(shape(0),0,field),normalize(shape(1),1,field),field);
 pgComparisons.push({field,nativeCount:field==='exactNumericText'?obs[0][field].reduce((n,t)=>n+t.rows.length,0):obs[0][field].length,rustCount:field==='exactNumericText'?obs[1][field].reduce((n,t)=>n+t.rows.length,0):obs[1][field].length,differences});
}
function tableOf(e){return /(?:insert into|update|from)\s+(?:(?:"poms"|poms)\.)?(?:"([a-z_]+)"|([a-z_]+))/i.exec(e.statementShape)?.slice(1).find(Boolean)||null}
const txSummaries=[];
for(let side=0;side<2;side++){
 const active=new Map,transactions=[],unassigned=[];
 for(let i=0;i<sql[side].entries.length;i++){
  const e=sql[side].entries[i];if(!e.pid){unassigned.push({index:i,case:e.case,operation:e.operation,table:tableOf(e)});continue}
  const op=e.operation.toUpperCase();
  if(op==='BEGIN'){assert(!active.has(e.pid),'nested BEGIN');active.set(e.pid,{pid:e.pid,case:e.case,beginIndex:i,operations:[]})}
  else if(op==='COMMIT'||op==='ROLLBACK'){const tx=active.get(e.pid);assert(tx,'terminal without BEGIN '+e.pid);tx.terminal=op;tx.endIndex=i;transactions.push(tx);active.delete(e.pid)}
  else if(active.has(e.pid))active.get(e.pid).operations.push({index:i,operation:op,table:tableOf(e),versionPredicate:!!e.rowVersionPredicate});
 }
 assert.equal(active.size,0);
 const raceTx=[];
 for(const label of['project_technical_cost_package-concurrent-first','project_bid_commercial_process-concurrent-first','extra-contact-two-readers-CAS','extra-followup-replace-two-readers-CAS']){
  const table=label.startsWith('project_')?label.replace('-concurrent-first',''):label.includes('contact')?'customer_contact':'sales_follow_up_record';
  let selected=transactions.filter(tx=>tx.case===label&&tx.operations.some(o=>o.table===table&&(label.includes('contact')?o.operation==='UPDATE':o.operation==='INSERT INTO')));
  if(label.includes('followup'))selected=selected.slice(-2);
  check(label,side,'two product transactions one COMMIT one ROLLBACK',()=>{assert.equal(selected.length,2);assert.deepEqual(selected.map(t=>t.terminal).sort(),['COMMIT','ROLLBACK']);return{transactions:selected}});
  raceTx.push({label,transactions:selected});
 }
 txSummaries.push({backend:side?'rust':'native',statements:sql[side].entries.length,coveredLabels:sql[side].coveredCases.length,recordedErrorCount:sql[side].errors.length,closedTransactions:transactions.length,openTransactions:active.size,unassignedEntries:unassigned,transactions,raceTransactions:raceTx,actualErrors:sql[side].errors});
}
const allDiffs=pgComparisons.flatMap(x=>x.differences);
const report={kind:'C-independent-current03-public-PG-SQL-audit-reconciliation',createdAt:new Date().toISOString(),inputs:[...observerFiles,...sqlFiles].map(pin),checks,failures,PG:pgComparisons,SQL:txSummaries,allPGDifferences:allDiffs,contactWinnerAuditNormalizations:winnerChanges,anonymousNumericIdentityBinding,excludedObserverRows,normalizationPolicy:'Numeric::text strings/scale/null and every business state/date exact; only explicit generated IDs/time and proved contact winner audit values; table result arrays align by actual logical identity, HTTP array ordering unchanged elsewhere. Raw loopback IP differences remain visible. Anonymous numeric-child identity matching proves exact tuple multiset, not item-to-parent FK.',IPBaseline:pin('docs/design/archive/slices/rust-r3ab/evidence/ip-context-original.json'),independentProductExecution:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,pin:pin(output),checks:checks.length,failures,PG:pgComparisons.map(x=>({field:x.field,counts:[x.nativeCount,x.rustCount],differences:x.differences.length})),firstDifferences:allDiffs.slice(0,25),SQL:txSummaries.map(x=>({backend:x.backend,closed:x.closedTransactions,open:x.openTransactions,unassigned:x.unassignedEntries.length}))}));
