// Freeze only the six reviewed current-record and custom-wire corrections.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const R=C.root,H='/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/source15-lease-tax121-current-selector-G1-supplement01';
const F=R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-current-selector-design-review02';
const O=R+'/tools/rust-r4ghi/runtime-recovery121/g1B-current-wire-append01';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const manifest=checked(H+'/manifest-current-selector121-02.json','5a299de4c6367a63676f5fc74e41b0cafdf8d207cc12b7a03b28d2cb7f78c3a6');
const proposal=checked(H+'/proposal-current-selector121-02.json','28db7ca53ea47069bd43e115fbd115ba2b646076e251bf128d9bb852b4e52e0e');
const review=checked(F+'/review-current-selector-wire-G1-supplement02.json','833a6b2735757ee82d63a900bfd37a30b87f882e863479862bf918a5101ab0b3');
const rm=checked(F+'/manifest.json','1dce6e45bd0a3ca430b56b8587651bbb74361fbf83fc55a2a74ec592f8c02c40');
const p=json(proposal),m=json(manifest),r=json(review);assert.equal(r.verdict,'recommend-code-only-append');assert.equal(r.reviewerIsAuthor,false);assert.deepEqual(r.proposal,proposal);assert.deepEqual(m.proposal,proposal);
assert.equal(p.finiteChanges.length,6);assert.equal(r.scope.HConsumerMOD,24);assert.equal(r.scope.HProtected,18);assert.equal(r.scope.caller120MOD,11);assert.equal(r.scope.caller120Protected,14);assert.equal(r.scope.H3Complete,229);assert.equal(r.scope.externalComplete,55);
const newPaths=p.finiteChanges.filter(x=>x.operation==='PROTECT_TO_MOD').map(x=>x.file).sort();assert.deepEqual(newPaths,[...r.centralCoordination.appendExactlyToExternalChanges121].sort());
for(const q of p.finiteChanges){read(q.before);if(q.operation==='PROTECT_TO_MOD')assert.equal(pin(R+'/'+q.file).rawBytesSha256,q.before.rawBytesSha256);}
const parent=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json','be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');
const sources=[manifest,proposal,review,rm,m.parent,m.readerKeyAudit,p.selectorInventory];for(const q of sources)read(q);
assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const [at,q]of sources.entries()){const file=O+'/'+String(at+1).padStart(2,'0')+'-'+q.file.split('/').at(-1);fs.writeFileSync(local(file),read(q),{flag:'wx'});const copy=checked(file,q.rawBytesSha256);assert.equal(copy.bytes,q.bytes);copies.push({original:q,copy});}
const value={kind:'Root-frozen-runtime121-G1B-current-selector-and-every-wire-append',schemaVersion:1,recordedAt:new Date().toISOString(),issue:121,parentG1B:parent,exactProposal:proposal,independentDesignReview:review,parentHCodeNotReady:p.parentCodeNotReady,finiteChanges:p.finiteChanges,
  authoritativeScope:{HConsumerMOD:24,HProtected:18,caller120MOD:11,caller120Protected:14,H3MOD:4,H3ADD:0,H3PlannedComplete:229,currentExternalPlanned:55,backendSources:420,compileInputs:528,productionADD:0},
  centralCoordination:r.centralCoordination,requirements:r.requiredCodeReviewChecks,everyWireContract:p.everyWireContract,
  precedence:['finiteChanges6 and H24/18/#12011/14 are authoritative; inherited validationPlan four/20 wording is stale and grants nothing','Prewire check is outside transport catch; a guard rejection is not an HTTP observation','Raw ACK/response original must be durably recorded before postguard; a postguard rejection stops additional cleanup/reconcile/effects','Preserve original necessary transaction finally release/rollback semantics; no automatic new lease or control-uninstall fiction','Old taxContinuation15 and all original producer/history/failed labels remain immutable; actual current121 references do not alias history'],
  codeImplementationGranted:true,IExistingCoreThreePathListChangeGranted:true,IExistingNativeFixedTechnicalG1SHAAdditionGranted:true,RootPromotionGranted:false,codeReady:false,actualG2Authorized:false,actualAPI:null,nativeAuthorityGranted:false,businessG3:false,businessG4:false};
const file=O+'/Root-G1B-current-wire-append01.json';fs.writeFileSync(local(file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({copies,actualEffects:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({append:pin(file),codeOnly:true,newProtectedMOD:newPaths.length,actualG2:false}));
