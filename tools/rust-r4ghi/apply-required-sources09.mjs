import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),proposal=JSON.parse(fs.readFileSync('tools/rust-r4ghi/checkpoints/required-sources09/proposal09.json'));
const p=proposal.files.find(x=>x.file.endsWith('sources19.json'));assert.equal(p.changed.length,2);
assert.deepEqual(p.changed.map(x=>x.file).sort(),['apps/poms-api-rust/src/project_operating_signals/policy.rs','apps/poms-api-rust/src/project_operating_signals/tests.rs']);
assert.equal(sha(fs.readFileSync(p.file)),p.beforeSHA256);const bytes=fs.readFileSync(p.candidate);assert.equal(sha(bytes),p.afterSHA256);
for(const pin of JSON.parse(bytes))assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256);
fs.writeFileSync(p.file,bytes);
fs.writeFileSync('docs/design/rust-r4ghi/required-write-source-refreeze09.json',JSON.stringify({kind:'Root-reviewed-current-H-tax-knowledge-source-refreeze',proposal:'tools/rust-r4ghi/checkpoints/required-sources09/proposal09.json',file:p.file,beforeSHA256:p.beforeSHA256,afterSHA256:p.afterSHA256,
  old17SourceBytesRetained:true,sourceChanges:p.changed,semanticReview:'Only validated tax21 metric replay/H02 unknown maturity and six regressions; no required SQL family or selector mutation. Current full Rust tests490 and clippy pass.',
  oldEpoch08OriginalsPreserved:true,newCandidateActualFIStillRequired:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({updated:p.file,changedSourcePins:2,writeInventoryChanged:false}));
