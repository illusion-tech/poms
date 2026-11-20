import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel='tools/rust-r4ghi/I/implementation/support-patches/tax-pending-assertion21';
const author='E:/projects/worktrees/poms-r4i-lifecycle/poms';
const raw=fs.readFileSync(author+'/'+rel+'/apply-manifest21.json');
assert.equal(sha(raw),'95474513d0e29b49aeea2c90ebe1e45cc9c7e8d310641bcbae48e5e056c7079f');
const m=JSON.parse(raw);assert.equal(m.files.length,2);
const changes=m.files.map(row=>{const bytes=fs.readFileSync(author+'/'+row.candidate);assert.equal(sha(fs.readFileSync(row.path)),row.beforeSHA256);assert.equal(sha(bytes),row.afterSHA256);return{row,bytes};});
const evidence=['apply-manifest21.json','diagnosis21.json','README.md','source-inputs21.json','static-check21.json','tax-pending-assertion21.patch'];
assert(!fs.existsSync(rel));fs.mkdirSync(rel,{recursive:true});
for(const name of evidence)fs.writeFileSync(rel+'/'+name,fs.readFileSync(author+'/'+rel+'/'+name),{flag:'wx'});
for(const {row,bytes}of changes){fs.mkdirSync(path.dirname(row.candidate),{recursive:true});fs.writeFileSync(row.candidate,bytes,{flag:'wx'});fs.writeFileSync(row.path,bytes);}
const receipt='docs/design/rust-r4ghi/tax-pending-promotion21.json';
fs.writeFileSync(receipt,JSON.stringify({kind:'Root-non-author-reviewed-tax-pending-correction',manifest:rel+'/apply-manifest21.json',manifestSHA256:sha(raw),
  files:m.files,oldEpoch:'g2-business08',oldEpochCleanup:'000712-cleanup-apply02-complete.json',
  review:'Missing assessment preserves actual G unknown/null; currency-unavailable earlier branch retained; known zero and assessed pending remain exact; H02 derives preliminary.',
  testsAdded:6,actualCargoTestsPending:true,newHTTPAcceptancePending:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,oldEpochCleaned:true,actualChecksPending:true}));
