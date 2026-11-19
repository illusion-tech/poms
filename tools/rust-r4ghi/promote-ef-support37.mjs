import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='tools/rust-r4ghi/independent/review05/ef-cross-project-support37',raw=fs.readFileSync(base+'/manifest37.json'),m=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(m.files.length,4);
const changes=m.files.map(p=>{assert(p.file.startsWith('tools/rust-r4ghi/business/'));const bytes=fs.readFileSync(base+'/candidate/'+p.file);assert.equal(sha(bytes),p.candidateRawSha256);assert.equal(bytes.length,p.candidateBytes);if(p.baseExists)assert.equal(sha(fs.readFileSync(p.file)),p.baseRawSha256);else assert(!fs.existsSync(p.file));return{p,bytes};});
for(const{p,bytes}of changes)fs.writeFileSync(p.file,bytes);
fs.writeFileSync('docs/design/rust-r4ghi/ef-support37-tool-promotion.json',JSON.stringify({kind:'Root-non-author-reviewed-nonempty-correction-preparation-and-internal-number-proof',manifest:base+'/manifest37.json',manifestSHA256:sha(raw),files:m.files,
  review:['Read-only body planner consumes actual owned stored source refs and complete server targets; never POSTS',
   'Exactly one owned labor predecessor and before-absent successor with actual supersedes, same project/currency/actor and two real E audits',
   'G response restatement plus snapshot anchors, successor and exact official labor counter all share actual xmin',
   'Original response-ID number guards remain; failed attempts get no success proof; multiple replacements fail closed'],
  EFPGLiveExecuted:false,producerSpecificFIInventoryStillRequired:true,periodPositiveUnavailableUntilNaturalBoundary:true,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:4,readOnlyPlanner:true,RootActualEFCorrectionPending:true}));
