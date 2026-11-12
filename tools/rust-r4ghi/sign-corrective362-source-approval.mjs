// Root signs the independently reviewed exact finite input. Never promotes source/state.
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,writeWx} from './runtime-recovery121/root/facts121.mjs';
import {assertAbsent362,inputShape362,rootBody362,peerBody362,sourcePlan362} from './runtime-recovery121/promote-corrective362-once.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const a=process.argv.slice(2);assert.equal(a.length,8);assert.deepEqual([a[0],a[2],a[4],a[6]],['--request','--request-sha','--peer-review','--peer-review-sha']);
const request=pin(a[1]);assert.equal(request.rawBytesSha256,a[3]);const q=json(request),p=inputShape362(json(q.input));
assert.equal(q.kind,'Root-runtime121-corrective362-exact-source-safety-request');assert.equal(q.RootApprovalSigned,false);assert.equal(q.sourcePromotionExecuted,false);assert.equal(q.canonicalStateWritten,false);
const directory=C.private+'/runtime121-corrective362-source-inputs/'+p.nonce;assert.equal(request.file,directory+'/request-exact-review.json');assert.deepEqual(q.operator,p.operator);assert.deepEqual(q.sourcePlan,p.sourcePlan);read(q.sourcePlan);
assert.deepEqual(q.expectedRootApprovalBody,rootBody362(p,q.input));assert.equal(q.expectedRootApproval.file,directory+'/Root-approval.json');
const peer=pin(a[5]);assert.equal(peer.rawBytesSha256,a[7]);assert.deepEqual(json(peer),peerBody362(p,q.input,q.expectedRootApproval));
assertAbsent362(p.outputDirectory);assertAbsent362(C.private+'/runtime121-corrective362-source.lock');assertAbsent362(q.expectedRootApproval.file);sourcePlan362(p);
const approval=writeWx(directory,'Root-approval.json',q.expectedRootApprovalBody);assert.deepEqual(approval,q.expectedRootApproval);
console.log(JSON.stringify({approval,peerReview:peer,sourcePromotionExecuted:false,canonicalStateWritten:false}));
