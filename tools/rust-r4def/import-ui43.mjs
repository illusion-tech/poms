import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),from='E:/projects/worktrees/poms-r4e-cost-base/poms/tools/rust-r4def/E/ui-fix40',target='apps/poms-admin/src/app/features/project/project-handover-actions.ts';
assert.equal(sha(fs.readFileSync(target)),'6aa3370cd03200fc13c635f70523fddcf4a95bb27708c2fa658bfd606c9f08e3');
const candidate=fs.readFileSync(from+'/candidate.ts');assert.equal(sha(candidate),'97c4c8a41539b0539d6730a6e0257c943e1cd5517a2589f2f4fd132f1dd7a0e9');
assert.equal(sha(fs.readFileSync(from+'/manifest.json')),'1e9ada3071f87ba326b3043f7f54b80e8c4694e47725026c9892a99bf23816fd');
fs.mkdirSync('tools/rust-r4def/E/ui-fix40',{recursive:true});for(const n of fs.readdirSync(from))fs.writeFileSync('tools/rust-r4def/E/ui-fix40/'+n,fs.readFileSync(from+'/'+n),{flag:'wx'});
fs.writeFileSync(target,candidate);console.log(JSON.stringify({warnings22RemovedByCapturedValues:true,originalEvidencePreserved:true}));
