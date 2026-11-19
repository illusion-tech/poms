import fs from 'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const O='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/technical121-preclose-independent01';
const b=execFileSync('gh',['api','--method','GET','repos/illusion-tech/poms/issues/119/comments?per_page=100'],{windowsHide:true,encoding:null,stdio:['ignore','pipe','pipe']});
fs.writeFileSync(O+'/comments-119.json',b,{flag:'wx'});
const comments=JSON.parse(b);const summary={kind:'independent-GET-only-historical119-G4-comments',recordedAt:new Date().toISOString(),method:'GET',file:O+'/comments-119.json',bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex'),comments:comments.map(c=>({id:c.id,url:c.html_url,createdAt:c.created_at,G4Mention:c.body.includes('G4'),body:c.body})),mutations:0};
fs.writeFileSync(O+'/history-119-safe.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({comments:summary.comments.map(c=>({id:c.id,G4Mention:c.G4Mention})),pin:{file:summary.file,bytes:summary.bytes,rawBytesSha256:summary.rawBytesSha256}}));
