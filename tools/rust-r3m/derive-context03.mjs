// Root adds explicit case/event provenance for the final stage evidence audit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const source = 'tools/rust-r3m/acceptance-context02.mjs', target = 'tools/rust-r3m/acceptance-context03.mjs';
let text = fs.readFileSync(source, 'utf8').replaceAll('acceptance-context02.mjs', 'acceptance-context03.mjs');
text = text.replace("phase='01',runId=null", "phase='01',runId=null,evidenceKind=null");
text = text.replace("current:'setup',logBefore:null", "current:'setup',activeCaseKind:'setup',evidenceKind:evidenceKind||(backend==='rust'?'candidate-business':'native-reference-api'),logBefore:null");
text = text.replace('ctx.events.push({label,actor,method,route,', 'ctx.events.push({label,kind:ctx.activeCaseKind,actor,method,route,');
const lines = text.split('\n'), index = lines.findIndex(l => l.startsWith(' ctx.case=async(label,fn)=>'));
assert(index >= 0);
lines[index] = ` ctx.case=async(label,fn,{kind='business'}={})=>{
 assert(/^[a-zA-Z0-9_.-]+$/.test(label));assert(['business','guard','setup','reference'].includes(kind));
 const previous=ctx.activeCaseKind;ctx.activeCaseKind=kind;ctx.current=label;const start=ctx.events.length;
 await db.query("select 'r3m-acceptance:"+runId+':'+phase+':'+label+":begin' marker");
 const startedAt=new Date().toISOString();try{const value=await fn();
 await db.query("select 'r3m-acceptance:"+runId+':'+phase+':'+label+":end' marker");
 const item={label,name:label,kind,completed:true,startedAt,completedAt:new Date().toISOString(),validatedEventRange:{start,end:ctx.events.length,exclusive:true},value};
 ctx.cases.push(item);write(out+'/'+String(ctx.cases.length).padStart(2,'0')+'-'+label+'.json',item);return value;
 }finally{ctx.activeCaseKind=previous;}
 };`;
text = lines.join('\n');
text = text.replace("kind:'R3CO-actual-bounded-G2-acceptance',backend", "kind:'R3CO-actual-bounded-G2-acceptance',evidenceKind:ctx.evidenceKind,backend");
assert(!fs.existsSync(target)); fs.writeFileSync(target, text, { flag: 'wx' });
fs.writeFileSync('tmp/rust-r3m/root/context-derivation03.json', JSON.stringify({ kind: 'R3-stage-case-event-provenance-derivation', original: pin(source), derived: pin(target), changes: ['Explicit report evidenceKind', 'Each finished case has business/guard/setup/reference kind and validated [start,end) event range', 'Events inherit active case kind; setup/guard/reference never substitute valid business calls'], actualExecutionPerformed: false }, null, 2) + '\n', { flag: 'wx' });
