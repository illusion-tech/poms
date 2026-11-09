// Independent fixed-FS/pure postcondition probes. No execute/HTTP/context/live state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const h='E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/policy-replayless261';
const sha=v=>createHash('sha256').update(v).digest('hex');
const map=f=>f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f;
const read=p=>{assert(!/(^|[\\/])state\.json$/.test(p.file));const x=fs.readFileSync(map(p.file));assert.equal(sha(x),p.rawBytesSha256);return x;};
read({file:h+'/continuation02/proposed/cases261.mjs',rawBytesSha256:'587cab75d5eadbfbf9047e393a6313c117aae3ecd33d3c63cc01904a2ba14035'});
read({file:h+'/continuation02/proposed/core261.mjs',rawBytesSha256:'0fe889f86e59c253ca8e397338b535509d5ec0485a8ab09f6c5a7abf5bfef6d3'});
const core=await import(pathToFileURL(h+'/continuation02/proposed/core261.mjs').href);
const c=await import(pathToFileURL(h+'/continuation02/proposed/cases261.mjs').href);
const b=core.inspectCommitted317261(read),rows=m=>read({file:m.file,rawBytesSha256:m.rawBytesSha256}).toString().split('\n').filter(Boolean).map(JSON.parse);
const ctx={database:'poms_r4ghi_rust',state:{fixtures:b.record.fixtures,actors:b.state.actors}};
const attempt={...b.http,actorId:b.state.actors.manager.id,requestValue:b.request,pathParams:{}};
const checks=[];
const pass=(name,fn)=>{fn();checks.push({name,pass:true});};
const reject=(name,fn)=>pass(name,()=>assert.throws(fn));
pass('actual317 exact65',()=>assert.equal(c.assertClosedG261(ctx,b.before,b.after,b.response,rows,attempt).closedDeltaRows,65));
const alter=(table,fn)=>m=>{const list=rows(m);if(m.file===b.after.databases[ctx.database].tables[table].file)fn(list);return list;};
const change=(r,fn)=>{const v=JSON.parse(r.raw);fn(v);r.raw=JSON.stringify(v);r.sha256=sha(r.raw);r.xmin='4806';};
for(const table of ['project_actual_cost_record','project_operating_head','operating_baseline_package','project_cost_inclusion_head'])reject('C01 foreign '+table,()=>c.assertClosedG261(ctx,b.before,b.after,b.response,alter(table,list=>{const r=list.find(r=>JSON.parse(r.raw).project_id!==ctx.state.fixtures.project.id);assert(r);change(r,v=>v.row_version=(v.row_version??0)+1);}),attempt));
for(const table of ['operating_snapshot_cost_member','operating_evaluation_reason','approval_summary_field_projection','operating_command_receipt','audit_log','auth_session','security_event','platform_user'])reject('unknown new '+table,()=>c.assertClosedG261(ctx,b.before,b.after,b.response,alter(table,list=>{const value={id:'00000000-0000-4000-8000-999999999999',project_id:ctx.state.fixtures.project.id};const raw=JSON.stringify(value);list.push({key:[value.id],raw,sha256:sha(raw),xmin:'4806'});}),attempt));
reject('delete existing row',()=>c.assertClosedG261(ctx,b.before,b.after,b.response,alter('project_actual_cost_record',list=>list.pop()),attempt));
reject('wrong business xmin',()=>c.assertClosedG261(ctx,b.before,b.after,b.response,alter('audit_log',list=>{const r=list.find(x=>JSON.parse(x.raw).request_id===attempt.requestId);r.xmin='9999';}),attempt));
pass('exactMAX raw one-cent',()=>{c.exactMoneyField261({raw:'{"amount":9999999999999999.99}'},'amount','9999999999999999.99');assert.throws(()=>c.exactMoneyField261({raw:'{"amount":9999999999999999.99}'},'amount','9999999999999999.98'));});
// Reuse only the sealed author's explicitly synthetic36-row fixture, then
// independently mutate its lineage. This is not an actual H04 observation.
const source=read({file:h+'/continuation02/closure02.test.mjs',rawBytesSha256:'88b4665ad81950bae5fd0874dc6e41fda7bbb76a78317d1f1b742cdc0109ce9e'}).toString().replaceAll('\r\n','\n');
const start=source.indexOf('function h04Model()'),end=source.indexOf("\ntest('H04 whole-delta",start);assert(start>=0&&end>start);
const model=new Function('b','ctx','rows','sha261',source.slice(start,end)+';return h04Model;')(b,ctx,rows,core.sha261);
pass('syntheticH04 exact36 scope only',()=>{const x=model();assert.equal(c.assertClosedH04261(ctx,x.before,x.after,x.review,x.rr,x.attempt).closedDeltaRows,36);});
const x=model();const newReview=x.table('operating_signal_review_record').find(r=>r.key[0]===x.review.reviewRecordId);
const foreign=x.table('operating_signal_review_record').find(r=>r.key[0]!==x.review.reviewRecordId&&JSON.parse(r.raw).signal_evaluation_id!==x.review.targetId);assert(foreign,'Need an actual retained foreign review as a valid FK target');
change(newReview,v=>v.supersedes_id=foreign.key[0]);newReview.xmin='5000';
let foreignPredecessorAccepted=false;try{c.assertClosedH04261(ctx,x.before,x.after,x.review,x.rr,x.attempt);foreignPredecessorAccepted=true;}catch{}
const result={kind:'independent-guard02-postcondition-fixedFS-probes',node:process.version,checks,passed:checks.length,failed:0,C01ForeignFamiliesRejected:true,H04FixtureSynthetic:true,H04ForeignPredecessorAccepted:foreignPredecessorAccepted,RootWrites:false,SQL:false,HTTP:false,PIDRead:false,liveStateRead:false,actualContinuation:false,G3:false,G4:false};
fs.writeFileSync(root+'/tools/rust-r4ghi/independent/final-gates13/policy261-continuation-review01/probe-guard02.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
