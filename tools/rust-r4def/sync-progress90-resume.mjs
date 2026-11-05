// Reconcile the TLS-uncertain write before submitting any new Issue comment.
import fs from'node:fs';import assert from'node:assert/strict';import{execFileSync}from'node:child_process';
const out='tmp/rust-r4def/root/github-progress90-resume';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const text=fs.readFileSync('tmp/rust-r4def/root/github-progress90/106-comment.md','utf8');
for(const n of [108,109,101,57]){
 const raw=execFileSync('gh',['issue','view',String(n),'--json','number,state,body,comments'],{encoding:'utf8',maxBuffer:4000000}),before=JSON.parse(raw);assert.equal(before.state,'OPEN');fs.writeFileSync(out+'/'+n+'-before.json',raw,{flag:'wx'});let url=before.comments.find(c=>c.body===text)?.url,submitted=false;
 if(!url){const file=out+'/'+n+'-comment.md';fs.writeFileSync(file,text,{flag:'wx'});url=execFileSync('gh',['issue','comment',String(n),'--body-file',file],{encoding:'utf8'}).trim();submitted=true;}
 const readback=execFileSync('gh',['issue','view',String(n),'--json','number,state,body,comments'],{encoding:'utf8',maxBuffer:4000000}),after=JSON.parse(readback);assert.equal(after.state,'OPEN');assert.equal(after.body,before.body);assert(after.comments.some(c=>c.body===text));fs.writeFileSync(out+'/'+n+'-after.json',readback,{flag:'wx'});console.log(JSON.stringify({issue:n,state:after.state,submitted,comment:url,readback:true}));
}
