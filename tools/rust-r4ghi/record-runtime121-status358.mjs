// Preserve unexecuted 357 materials and new observations. No runtime effect.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,local,pin,read} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();const R=C.root,P=C.private;
const check=(f,h)=>{const p=pin(f);assert.equal(p.rawBytesSha256,h);return p;};
const loss=check(P+'/runtime-loss358-observation01/observation.json','bfb54a98a7d3c215b269a20d49a5b93b343471eb2eab202abd9d5e2c3b1701db');
const host=check(R+'/tmp/rust-r4ghi/root/round358-host-preflight01/observation.json','b32f9b77a440bad6818039e527fca0c444ad2496d3368027ee073e157a8ff92f');
const ob=json(loss),h=json(host);assert.equal(h.d963RootReviewPresent,false);assert.equal(h.d963ActualOutputPresent,false);assert.equal(ob.priorUnexecuted357.supersededWithoutExecution,true);
const policy=check(R+'/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json','3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6');
const old=json(pin(R+'/docs/design/rust-r4ghi/continuation-status357.json'));
const O=R+'/tools/rust-r4ghi/runtime-recovery121/round358-observation01';assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
for(const [p,n]of[[loss,'loss-observation.json'],[host,'host-observation.json']]){fs.writeFileSync(local(O+'/'+n),read(p),{flag:'wx'});assert.equal(pin(O+'/'+n).rawBytesSha256,p.rawBytesSha256);}
const supersession={kind:'Root-round357-superseded-without-runtime-execution',recordedAt:new Date().toISOString(),holderInput:ob.priorUnexecuted357.input,auxSupportRequest:ob.priorUnexecuted357.transportRequest,RootReviewAbsent:true,actualOutputAbsent:true,reason:'Further host/runtime package and WSL boot changes before any actual G2. Use a stable reviewed policy with per-round exact runtime bindings.',oldSourceAndReviewLabelsRetained:true,codeOnlyWorkspaceDeliveryNotRuntimeExecution:true,anyModeExecuted:false};
fs.writeFileSync(local(O+'/unexecuted357-supersession.json'),JSON.stringify(supersession,null,2)+'\n',{flag:'wx'});
const current={...old,kind:'R4-runtime121-stable-holder-policy-status358',recordedAt:new Date().toISOString(),previousStatus:'rust-r4ghi/continuation-status357.json'};
current.secondLoss={...old.secondLoss,olderObservedBoot:old.secondLoss.currentBoot,currentBoot:ob.bootId,observation:loss,hostObservation:host,currentLogicalConservationPending:true,transientObservedBootNotFutureAuthority:true};
current.recoveryProposal=undefined;delete current.recoveryProposal;
current.stableHolderPolicy={policy,independentDesignReview:'148928b3d3619bd9ec0ab42140ad681dc63b106b4c5140c8899e4a67bb99b51f',codeImplementationGranted:true,actualG2Authorized:false,implementationPending:true,captureOwnHolderBootBeforeAfterAndRealIdentityRequired:true,perRoundExactExecutableAndLossBindingsRequired:true,originalA7Root8Native284BytesUnchanged:true};
current.prior357Unexecuted={record:pin(O+'/unexecuted357-supersession.json'),noRootReviewOrActualOutput:true};
current.next=['Finish aux358 one-source/two-platform bounded code review','Freeze concrete current-round pins and fresh holder exact G2; capture and verify actual before-after-ready boot at execution','Original PG and two readonly observations with fresh per-mode exact G2/readback','New owner/API runtime bindings; remaining original batch acceptance'];
for(const p of Object.values(old.unchangedBookends))read(p);
const out=R+'/docs/design/rust-r4ghi/continuation-status358.json';fs.writeFileSync(local(out),JSON.stringify(current,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:pin(out),policy,anyModeExecuted:false,APIStarted:false}));
