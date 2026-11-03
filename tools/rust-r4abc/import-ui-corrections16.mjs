import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const[label,hash]of [['ui-corrections02','64eeb4f1bfdaaf79f7c0ac6eb86d80d3fbe493d71b589131782aebb1fed3ae1c'],['ui-test-corrections03','758ef68a64bd0d2e5ddd07d01f4880eadbbdee66c053c411d0e26030fef66cf3']]){
 const src='E:/projects/worktrees/poms-r4c-finance/poms/tmp/rust-r4abc/'+label,manifestName=label==='ui-corrections02'?'manifest02.json':'manifest03.json',raw=fs.readFileSync(src+'/'+manifestName);assert.equal(sha(raw),hash);
 const manifest=JSON.parse(raw),out='docs/design/rust-r4abc/g2-corrections07/'+label;assert(!fs.existsSync(out));
 const checked=manifest.files.map(p=>{const before=fs.readFileSync(p.path),next=fs.readFileSync(src+'/products/'+p.path);assert.equal(sha(before),p.baseSha256,p.path+' base');assert.equal(sha(next),p.newSha256,p.path+' new');return{...p,next}});
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/'+manifestName+'.bin',raw,{flag:'wx'});
 for(const p of checked){const dest=out+'/author/'+p.path+'.bin';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,p.next,{flag:'wx'});fs.writeFileSync(p.path,p.next);}
 fs.writeFileSync(out+'/import16.json',JSON.stringify({label,manifestSha256:hash,files:manifest.files,actualApplied:true,checksPending:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({label,applied:checked.length}));
}
