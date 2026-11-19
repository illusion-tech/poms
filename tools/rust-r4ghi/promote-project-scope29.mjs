import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='tools/rust-r4ghi/independent/review05/project-update-scope-candidate29';
const raw=fs.readFileSync(base+'/manifest29.json'),m=JSON.parse(raw);assert.equal(m.files.length,4);
const expected=new Set(['projects/service.rs','projects/http.rs','project_action_authorization/mod.rs','customers/service.rs'].map(p=>'apps/poms-api-rust/src/'+p));
const changes=m.files.map(row=>{assert(expected.delete(row.path));const before=fs.readFileSync(row.path),next=fs.readFileSync(base+'/proposed/'+row.path);assert.equal(sha(before),row.baseSHA256);assert.equal(sha(next),row.candidateSHA256);return{row,next};});assert.equal(expected.size,0);
for(const{row,next}of changes)fs.writeFileSync(row.path,next);
fs.writeFileSync('docs/design/rust-r4ghi/project-update-scope-promotion29.json',JSON.stringify({kind:'Root-non-author-reviewed-project-owner-metadata-gate-and-canonical-status',
  capturedAt:new Date().toISOString(),manifest:base+'/manifest29.json',manifestSHA256:sha(raw),files:m.files,
  oldEpochCleanup:'000712-cleanup-apply02-complete.json',review:['Current verified ownerWrite gate precedes customer/material reads; no Part or creator scope promotion',
    'One physical borrowed Common transaction contains project CAS, dirty audit and necessary managed auth',
    'No-op preserves project version/time and skips business audit', 'Create201 remains; Reassign200 matches sole canonical status; original actual201 remains failed'],
  fullCargoPending:true,actualPGHTTPPending:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,currentOwnerOnly:true,reassignSuccess:200,G3Certified:false}));
