// Governance only. Reads fixed failure evidence; never imports a runtime context.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms';
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const D=P+'/business/g2-business14/main01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const physical=f=>f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
function pin(file,expected){const b=fs.readFileSync(physical(file));if(expected)assert.equal(sha(b),expected);return {file,bytes:b.length,rawBytesSha256:sha(b)};}
function read(p){const b=fs.readFileSync(physical(p.file));assert.equal(sha(b),p.rawBytesSha256);return JSON.parse(b);}
const [reviewFile,reviewSHA]=process.argv.slice(2);assert(reviewFile&&/^[a-f0-9]{64}$/.test(reviewSHA));
const independentReview=pin(reviewFile,reviewSHA),review=read(independentReview);
assert.equal(review.kind,'non-author-Tax-prepare341-failure-triage');
assert.equal(review.verdict,'not-ready-retain-failure-no-replay');
assert.equal(review.findings.length,2);assert.equal(review.source14EffectReattemptApproved,false);
const command=pin(P+'/tax341-command-logs/prepare-tax-e6f0b91f-f367-45f3-93e6-a516e78d272c/receipt.json','45863755804e97934c822682ce8f331b28e0d780a15f27a5da123d03e7d28b7d');
assert.equal(read(command).exitCode,1);
const partial=pin(D+'/000001-tax14-prepare341-partial.json','a84f82ca83378a16c80b165563482a7ba02932b94d889a430674f43f4e64d820');
assert.equal(read(partial).mode,'prepare-tax');
const fixedAfter=pin(P+'/tax341-command-logs/prepare-tax-e6f0b91f-f367-45f3-93e6-a516e78d272c/state-after.json','bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97');
const state=read(fixedAfter);assert.equal(state.sequence,24);assert.equal(state.taxContinuation14.taxPreparation,null);assert.equal(state.taxContinuation14.sweep,null);assert(!state.activeFault&&!state.blockedObservation);
pin(D+'/state.json',fixedAfter.rawBytesSha256);
const serverPacket=pin(D+'/000024-tax14-complete-server-targets.json','0ee4109167a393ef7e376588db06603e26d947235347dc3661d708b632932a3d');
const packet=read(serverPacket),targets=packet.primary.preparation.proposedAffectedTargets;
assert.equal(targets.length,5);assert.equal(packet.packets.length,5);assert.equal(packet.TaxCorrectionPOSTExecuted,false);
const previous=read(pin(R+'/docs/design/rust-r4ghi/continuation-status342.json','dec1e2d5f8eea9ad3c0482ff0d585a4d108e200e121145a3338ac280431fed70'));
const status={...previous,kind:'R4-Tax14-failed-preparation-status344',recordedAt:new Date().toISOString()};
status.Tax14={...previous.Tax14,prepareOnlyDispatched:true,preparationResultsNotYetClaimed:false,prepareExitCode:1,successfulPreparation:false,failedPreparationPreserved:true,commandReceipt:command,partial,immutableAfterState:fixedAfter,serverPacket,independentFailureTriage:independentReview,serverTargetCount:5,helperTemporalTargetCount:2,FIExecuted:false,normalTaxPOSTExecuted:false,MainPOSTReplayed:false,old341ReplayApproved:false};
status.currentBlockingFindings=[
 {id:'P2-peer-inferred-root',scope:'project_operating/restatement.rs',classification:'new-real-drift',finding:'Full physical peer-batch rows are compared with a per-project frozen source projection, allowing an unchanged foreign peer share to become an inferred new root. Do not repair by trimming or accepting all five targets.'},
 {id:'P2-restatement-future-allocation',scope:'project_operating/context.rs',classification:'new-real-drift',finding:'Restatement source rows identify a true post-cutoff allocation, but context construction still tries to qualify it and fails on its future Cost. Retain legitimate late corrections and complete physical batches.'}
];
status.remainingDiagnosticGap=review.remainingGap;
status.source15={status:'proposal-only',admitted:false,implemented:false,reason:'Registered Source14/Reg4/B1/source420/binary identity cannot be replaced in place; preserve the actual 339 and failed 341 records before a new bounded admission.'};
status.remaining=[
 'Freeze the bounded two-finding corrective scope and the real Source14-retained to Source15 admission inputs; no old341 replay or fabricated preparation.',
 'After actual successful preparation: exact complete FI inventory and one separately approved normal Tax command.',
 ...previous.remaining.slice(1)
];
status.evidence={...previous.evidence,failedTax14Prepare:command,failedTax14Partial:partial,failedTax14AfterState:fixedAfter,actualServerPreparation:serverPacket,independentFailureTriage:independentReview};
assert.equal(status.G3Certified,false);assert.equal(status.G4Certified,false);
const out=R+'/docs/design/rust-r4ghi/continuation-status344.json';fs.writeFileSync(out,JSON.stringify(status,null,2)+'\n',{flag:'wx'});
const file=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(file));
assert.equal(index.officialNewDelivered,0);assert.equal(index.G3Certified,false);assert.equal(index.G4Certified,false);
index.currentCorrective.latestExecutionStatus344='rust-r4ghi/continuation-status344.json';
index.currentCorrective.currentRuntimeStatus='Source14 technical G2 is historical valid evidence; Tax14 prepare failed with two independently investigated production findings, no Tax/Main domain POST or FI; Source15 proposal only.';
index.currentCorrective.source14FailedPreparation344={status:pin(out),command,partial,immutableAfterState:fixedAfter,serverPacket,independentReview,successfulPreparation:false,FI:false,TaxNormalPOST:false,MainReplay:false,currentBusinessCertified:false};
index.currentCorrective.activeTechnicalRuntime339.currentBusinessAcceptanceEligible=false;
index.currentCorrective.nextProductScope='Bounded peer-root/cutoff corrective checkpoint and Source15 admission proposal, then genuine preparation, full FI, unique normal, remaining H46/Main/Receiver/period/role matrix and independent G3/G4.';
index.periodAcceptance.status='natural-boundary-passed; Tax preparation failed before FI/normal; Receiver and period acceptance wait bounded correction and a new admitted candidate';
fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({status:pin(out),newCertified:0,G3:false,G4:false,issue57:'OPEN',noRuntimeMutation:true}));
