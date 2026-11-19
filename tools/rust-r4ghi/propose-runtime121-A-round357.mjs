// New-boot reuse proposal only. No code, host configuration or runtime changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,local,pin,read} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const checked=(f,h)=>{const p=pin(f);assert.equal(p.rawBytesSha256,h);return p;};
const loss=checked(C.private+'/runtime-loss357-observation01/observation.json','9c3c49edae6a5cac755bc6bf91ff94b99058ba76ea386a961b64fa12ed650571'),ob=json(loss);
assert.equal(ob.bootId,'a077fa56-73ab-485c-924d-8676f7585f01');assert.equal(ob.originalContainer.id,C.container);assert.equal(ob.originalContainer.running,false);assert.equal(ob.dataConservationNotYetObserved,true);
const codeReview=checked(C.root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-code-review02/review-A-code02b.json','0071eb7c620ea57cf5213a8e3ce008552ab1d33b98b2dc11a2fb4a04b60b5126'),code=json(codeReview);assert.equal(code.executionSources.length,7);for(const p of code.executionSources)read(p);
const windowsManifest=checked('/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/independent-runtime-loss121-Windows01/manifest-holder-loss01.json','da91511164b9aed1c36b53bbb8b8dae765f7a9c71fc22bbfa879377d81e40ec3');
const reuseNote=checked('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-A-reuse-after-boot-loss01/A7-new-boot-reuse-note121.json','e2a218176c641c88d2cfca4f5cc7edec5754c3318ff94edb22d93a077781a523');
const O=C.root+'/tools/rust-r4ghi/runtime-recovery121/g1A-round357-append01';assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
const proposal={kind:'Root-proposed-runtime121-A-new-boot-reuse-G1-append357',recordedAt:new Date().toISOString(),issue:121,parentG1:checked(C.G1,C.G1SHA),originalCodeReview:codeReview,originalA7ExecutionSources:code.executionSources,
  currentLossObservation:loss,currentBootId:ob.bootId,priorHolder:ob.priorHolder,hostShutdownEvidence:windowsManifest,readOnlyReuseAnalysis:reuseNote,
  inputCompatibility:{inputKeysRemain:15,G1SlotRemainsOriginal:true,historicalLossAnchor:checked(C.loss,C.lossSHA),newLossSupportIsSeparateFromFixedInput:true,baseline:checked(C.baseline,C.baselineSHA),retention:checked(C.retention,C.retentionSHA)},
  modes:[{mode:'holder-start',fresh:['nonce','input','exact-G2','Root-review','dispatch','Windows-launch','Linux-ready','actual-identity-readback']},{mode:'pg-start',fresh:['nonce','input','exact-G2','Root-review','new-holder-reference','before-after-original-container','readiness','command','complete','actual-readback']},{mode:'pg-observe',fresh:['nonce','input','exact-G2','Root-review','new-holder-reference','new-PG-start-reference','two-default-RO-explicit-RO-snapshots','complete','independent-conservation-readback']}],
  requirements:{eachNewExactG2BindsThisAppendAndCurrentLoss:true,checkCurrentBootBeforeAndAfterEachDispatch:true,noConsumedNonceOrOldLiveReceiptReuse:true,originalContainerImageVolumePortsAndOIDOnly:true,fullTwoDatabase139TableConservationAgainstOriginalBaseline:true,noCrossDatabaseAtomicityClaim:true,newStrictFourKeyLifetimeOwnerBundle:true,APIInputMustUseNewOwnerPGAndConservationPins:true,keepAllOldFactsAndFailureLabels:true},
  unchanged:{A7RawBytes:true,Native06AndRoot8RawBytes:true,sourceGraphCounts:{helper:229,external:55,execution:284},noRustRebuild:true,noNewRoutes:true,noNewBusinessOperations:true},
  limits:{holderOnly:true,originalPGResumeOnly:true,readonlyConservationOnly:true,hostConfiguration:false,scheduledTasksOrAutostart:false,newContainersOrVolumes:false,migrationRestoreOrBaselineReset:false,APIStart:false,NativeContext:false,domainSQLHTTP:false,businessG3:false,businessG4:false},
  actualG2Authorized:false,anyModeExecuted:false,independentDesignReview:null};
const file=O+'/proposal-G1A-round357.json';fs.writeFileSync(local(file),JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({proposal:pin(file),actualG2Authorized:false,anyModeExecuted:false}));
