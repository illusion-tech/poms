import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const source of[
 {from:'E:/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/proposal-mainbasis45',to:'tools/rust-r4def/F/proposal-mainbasis45',manifest:'proposal45-manifest.json',hash:'21e42cc9c027efe25bd7714aba81c6a2a1051f45653e8edaf3c89a4c69ea3943',key:'artifacts'},
 {from:'E:/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/fault32',to:'tools/rust-r4def/F/fault32',manifest:'delivery32.json',hash:'e741161ee0dd3894e5623619ce8d8792e0bfa6f2a8f82f1372f7933b5d12e019',key:'artifacts'},
 {from:'E:/projects/worktrees/poms-r4e-cost-base/poms/tools/rust-r4def/E/attachments47',to:'tools/rust-r4def/E/attachments47',manifest:'manifest47.json',hash:'4aa8ea7da317421fa0f4b916ab2f352fd5a5365a8c2295f99ce043130fbe7fd5',key:'products'},
]){
 const raw=fs.readFileSync(source.from+'/'+source.manifest);assert.equal(sha(raw),source.hash);const d=JSON.parse(raw);
 for(const p of d[source.key]){assert(!p.file.split('/').includes('..'));const b=fs.readFileSync(source.from+'/'+p.file);assert.equal(sha(b),p.rawBytesSha256);const target=source.to+'/'+p.file;fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))assert(fs.readFileSync(target).equals(b));else fs.writeFileSync(target,b,{flag:'wx'});}
 fs.writeFileSync(source.to+'/'+source.manifest,raw,{flag:'wx'});
}
const from='E:/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/fault32/E41-readback33/readback33.json',to='tools/rust-r4def/F/fault32/E41-readback33/readback33.json',b=fs.readFileSync(from);assert.equal(sha(b),'b3c732f91244d8677896731e4a2d5eb207ac2022e25863c5bbe6c5649ca685c6');fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,b,{flag:'wx'});
console.log(JSON.stringify({candidateBundlesImported:3,offlineReadback80Preserved:true,runtimeAcceptanceClaimed:false}));
