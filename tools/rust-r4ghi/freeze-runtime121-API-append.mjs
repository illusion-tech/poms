// Freeze the already named Root starter after finite auth-compatibility review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const R=C.root,H='/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H';
const O=R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append01';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const proposal=checked(R+'/tools/rust-r4ghi/runtime-recovery121/Root-B-API-proposal02/proposal-API121-02b.json','d02f625902bac5de853da003babb10b1e0d8543f415fec8cdf867a9b0e3a368e');
const review=checked(H+'/independent-runtime121-B-API-design02/review-API-design02.json','cdb28a126ed71ce4289a302a8fc4bab24dbe561cb6488fd7139f0de1309d2ae9');
const manifest=checked(H+'/independent-runtime121-B-API-design02/manifest-review-API-design02.json','947fe44f28d8bc68f62a8c8461704d66f3d5c511bf98a2efc0a0c410c27399b7');
const parent=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json','be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');
const g1A=checked(C.G1,C.G1SHA);
const codeA=checked(R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-code-review02/review-A-code02b.json','0071eb7c620ea57cf5213a8e3ce008552ab1d33b98b2dc11a2fb4a04b60b5126');
const p=json(proposal),r=json(review),a=json(codeA);assert.equal(r.verdict,'recommend-code-only-append');assert.equal(r.reviewerIsAuthor,false);assert.deepEqual(r.approvedProposal,proposal);
assert.equal(p.input.keys.length,17);assert.equal(p.record.keys.length,25);assert.equal(p.production.length,1);assert.equal(p.validationOnly.length,2);
for(const q of a.executionSources)read(q);assert.equal(a.executionSources.length,7);assert.equal(a.reviewerIsAuthor,false);assert.equal(a.verdict,'code-ready-for-exact-runtime121-A-input-review');read(p.protectedAuthReader);
const sources=[proposal,review,manifest,codeA,p.parentProposal,p.priorNotReadyReview];
for(const q of sources)read(q);assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
const copies=[];for(const [i,q]of sources.entries()){const file=O+'/'+String(i+1).padStart(2,'0')+'-'+q.file.split('/').at(-1);fs.writeFileSync(local(file),read(q),{flag:'wx'});const copy=checked(file,q.rawBytesSha256);assert.equal(copy.bytes,q.bytes);copies.push({original:q,copy});}
const value={kind:'Root-frozen-runtime121-G1B-API-operator-append',schemaVersion:1,recordedAt:new Date().toISOString(),issue:121,parentG1B:parent,parentG1A:g1A,exactProposal:proposal,independentDesignReview:review,protectedA7CodeReview:codeA,protectedA7ExecutionSources:a.executionSources,protectedAuthReader:p.protectedAuthReader,
  production:p.production,validationOnly:p.validationOnly,inputKeys:p.input.keys,RootReviewKeys:p.request.RootReviewKeys,APIRecordKeys:p.record.keys,processFile:p.input.processFile,normalEnvFile:p.input.normalEnvFile,requirements:r.implementationConditions,
  scope:{productionADD:1,productionMOD:0,A7Changes:0,H3PlannedComplete:229,backendSources:420,compileInputs:528,RootCodeComponent:8,currentExternalPlanned:55,actualCompleteGraphMeasured:false},
  Root8ComponentRule:'All eight are ADD(null) relative to the original270 baseline; implementation adds only starter1 now. Keep seven A bytes and their passed code-review provenance exact.',
  codeImplementationGranted:true,RootPromotionGranted:false,codeReady:false,actualG2Authorized:false,actualAPI:null,actualReadiness:null,nativeAuthorityGranted:false,businessG3:false,businessG4:false};
const file=O+'/Root-G1B-API-append01.json';fs.writeFileSync(local(file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({copies,actualEffects:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({append:pin(file),codeOnly:true,APIStarted:false}));
