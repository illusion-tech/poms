import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const rel='tools/rust-r4ghi/I/implementation/business-metadata25',author='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+rel,sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(author+'/manifest-pin25.json');assert.equal(sha(raw),'97725ca483fcc92111a8e39a8eb73f27a26bef8641630ea91f14eea2638f41e7');
const m=JSON.parse(raw),old=fs.readFileSync(m.file),next=fs.readFileSync(author+'/'+m.candidate);assert.equal(sha(old),m.beforeSHA256);assert.equal(sha(next),m.afterSHA256);
const a=JSON.parse(old),b=JSON.parse(next);assert.equal(a.length,13);assert.equal(b.length,13);assert.equal(a.filter((p,i)=>p.sha256!==b[i].sha256).length,1);
for(const p of b)assert.equal(sha(fs.readFileSync(p.file)),p.sha256);
for(const[name,bytes]of [['manifest-pin25.json',raw],[m.before,old],[m.candidate,next]]){const target=rel+'/'+name;assert(!fs.existsSync(target));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}
fs.writeFileSync(m.file,next);fs.writeFileSync('docs/design/rust-r4ghi/ownership-pin25-promotion.json',JSON.stringify({kind:'Root-reviewed-one-literal-audit-source-pin-refreeze',manifest:rel+'/manifest-pin25.json',before:m.beforeSHA256,after:m.afterSHA256,onlyChangedSource:m.changedPin,old23And24Preserved:true,newEpoch10Required:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({updated:m.file,changedPin:1,other12Unchanged:true}));
