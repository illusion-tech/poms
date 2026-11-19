import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),rel='tools/rust-r4ghi/I/implementation/business-ownership23',author='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+rel;
const raw=fs.readFileSync(author+'/manifest23.json');assert.equal(sha(raw),'861e03279124bfa89ae62e5b59adf64c4ec2f0105045305dee0dea4577022dea');
const m=JSON.parse(raw);assert.equal(m.files.length,13);assert.equal(m.requiredMigrations,97);assert.equal(m.requiredTables,139);
for(const pin of m.runtimeProductSourcePins)assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256);
const changes=m.files.map(f=>{assert(f.file.startsWith('tools/rust-r4ghi/business/')&&!f.file.split('/').includes('..'));const b=fs.readFileSync(author+'/'+f.candidate);assert.equal(sha(b),f.afterSHA256);assert.equal(b.length,f.bytes);if(f.kind==='add')assert(!fs.existsSync(f.file));else assert.equal(sha(fs.readFileSync(f.file)),f.beforeSHA256);return{f,b};});
assert(!fs.existsSync(rel));fs.mkdirSync(rel,{recursive:true});fs.writeFileSync(rel+'/manifest23.json',raw,{flag:'wx'});fs.writeFileSync(rel+'/patch23.diff',fs.readFileSync(author+'/patch23.diff'),{flag:'wx'});
for(const{f,b}of changes){const backup=rel+'/'+f.candidate;fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,b,{flag:'wx'});if(f.beforeCandidate){const old=fs.readFileSync(author+'/'+f.beforeCandidate);assert.equal(sha(old),f.beforeSHA256);fs.mkdirSync(path.dirname(rel+'/'+f.beforeCandidate),{recursive:true});fs.writeFileSync(rel+'/'+f.beforeCandidate,old,{flag:'wx'});}fs.writeFileSync(f.file,b);}
fs.writeFileSync('docs/design/rust-r4ghi/ownership23-tool-promotion.json',JSON.stringify({kind:'Root-reviewed-new09-ownership-and-controlled-legacy-test-tools',manifest:rel+'/manifest23.json',manifestSHA256:sha(raw),files:m.files,
 review:['Only real HTTP customer/default/org producer and source-bound original receipts','Two real sessions controlled by read-only row locks; full group observation and exact once origin/history','One new controlled synthetic legacy PK with real DB time, no v1 origin or modern duties; not historical/producer evidence','Spare fixture views retain actual root actors/owned sequence/persistence and stop before actual command without synthetic response'],
 actualExecutionPending:true,legacyControlledFixtureApprovedWithinExactPlan:true,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,sourcePinsVerified:m.runtimeProductSourcePins.length,RootRealExecutionPending:true}));
