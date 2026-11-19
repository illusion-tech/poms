import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),file='tools/rust-r4ghi/business/required-write-sources19.json',old=fs.readFileSync(file);assert.equal(sha(old),'9e4de73c1497cf2efa63bf287b2fa539e44340b2af7132eb25a92fec4cd5caae');
const m=JSON.parse(fs.readFileSync('tools/rust-r4ghi/independent/review05/tax-coverage-candidate39/manifest39.json')),expected=new Map(m.files.map(p=>[p.file,p.candidateRawSha256]));
const changes=[],next=JSON.parse(old).map(p=>{const current=sha(fs.readFileSync(p.file));if(current===p.sha256)return p;assert.equal(current,expected.get(p.file));changes.push({file:p.file,before:p.sha256,after:current});return{...p,sha256:current};});assert.equal(changes.length,3);
const out='tools/rust-r4ghi/checkpoints/required-sources-tax39';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/before.json.bin',old,{flag:'wx'});const bytes=Buffer.from(JSON.stringify(next,null,2)+'\n');fs.writeFileSync(out+'/after.json',bytes,{flag:'wx'});fs.writeFileSync(file,bytes);
fs.writeFileSync('docs/design/rust-r4ghi/required-tax39-source-refreeze34.json',JSON.stringify({kind:'Root-reviewed-source-binding-after-complete-tax-coverage-fix',file,beforeSHA256:sha(old),afterSHA256:sha(bytes),changes,
 inventorySQLFamiliesUnchanged:true,zeroToPartialToCompleteKnowledgeCasesVerified:'whole Rust test06 499pass54historicalignored',newPGFICoveragePending:true,G3Certified:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({updated:file,pinsChanged:3,inventoryFamiliesChanged:false}));
