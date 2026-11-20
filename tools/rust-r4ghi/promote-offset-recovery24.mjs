import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),rel='tools/rust-r4ghi/I/implementation/business-offset-recovery24',author='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+rel;
const raw=fs.readFileSync(author+'/manifest24.json');assert.equal(sha(raw),'b70c49f49e7412c3fcca03de34646e8040b70a9df34c0a04a48f71cd5c02b0fc');
const m=JSON.parse(raw);assert.equal(m.files.length,6);
const changes=m.files.map(f=>{const b=fs.readFileSync(author+'/'+f.candidate);assert.equal(sha(b),f.afterSHA256);if(f.kind==='add')assert(!fs.existsSync(f.file));else assert.equal(sha(fs.readFileSync(f.file)),f.beforeSHA256);return{f,b};});
const plan=fs.readFileSync(author+'/recovery-plan24.json');assert.equal(sha(plan),'16da19881237e447acbe41dee6fc1d7e20a63270b33e391656106422c2d539da');
assert(!fs.existsSync(rel));for(const name of ['manifest24.json','patch24.diff','README24.md','recovery-plan24.json','offline-tests24.log']){fs.mkdirSync(rel,{recursive:true});fs.writeFileSync(rel+'/'+name,fs.readFileSync(author+'/'+name),{flag:'wx'});}
for(const{f,b}of changes){for(const candidate of [f.candidate,f.beforeCandidate].filter(Boolean)){fs.mkdirSync(path.dirname(rel+'/'+candidate),{recursive:true});fs.writeFileSync(rel+'/'+candidate,fs.readFileSync(author+'/'+candidate),{flag:'wx'});}fs.writeFileSync(f.file,b);}
fs.writeFileSync('docs/design/rust-r4ghi/offset-recovery24-tool-promotion.json',JSON.stringify({kind:'Root-non-author-reviewed-timezone-proof-and-exact-slot-recovery',manifest:rel+'/manifest24.json',manifestSHA256:sha(raw),files:m.files,
  review:'Gregorian integral seconds plus signed offset and exact BigInt fractional nanoseconds; all original producer/source/audit/xmin checks retained. Canonical operation precheck before HTTP. Recovery only proves the exact already-committed default slot from pinned originals and current exact targets; no new business write or ownership/hash/blocked rewrite.',
  approvedRecoveryPlanSHA256:sha(plan),businessRecoveryExecuted:false,productSourceChanged:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:6,approvedPlanSHA256:sha(plan),businessWrites:0}));
