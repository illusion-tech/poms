// Sign only an exactly reviewed concrete source request. Never run promotion.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {C,assertOperatorHost121,json,pin,read,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');assert.equal(process.argv.length,10);
assert.deepEqual([process.argv[2],process.argv[4],process.argv[6],process.argv[8]],['--request','--request-sha','--peer-review','--peer-review-sha']);
const request=pin(process.argv[3]);assert.equal(request.rawBytesSha256,process.argv[5]);const q=json(request),p=json(q.input);
assert.equal(q.kind,'Root-runtime121-single-Native-source-safety-request');assert.equal(q.RootApprovalSigned,false);assert.equal(q.sourceUpdateExecuted,false);
const D=C.private+'/runtime121-native06-source-inputs/'+p.nonce;assert.equal(request.file,D+'/request-exact-review.json');
const peerPin=pin(process.argv[7]);assert.equal(peerPin.rawBytesSha256,process.argv[9]);const peer=json(peerPin);
assert.equal(p.operator.file,C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-native06-once.mjs');read(p.operator);
const {rootApprovalBody06,peerApproval06}=await import(pathToFileURL(p.operator.file).href);
assert.deepEqual(q.expectedRootApprovalBody,rootApprovalBody06(p,q.input));assert.equal(q.expectedRootApproval.file,D+'/Root-approval.json');peerApproval06(peer,p,q.input,q.expectedRootApproval);
assert(!fs.existsSync(q.expectedRootApproval.file));assert(!fs.existsSync(p.outputDirectory));assert(!fs.existsSync(C.private+'/runtime121-native06-source-promotion.lock'));
const approval=writeWx(D,'Root-approval.json',q.expectedRootApprovalBody);assert.deepEqual(approval,q.expectedRootApproval);
console.log(JSON.stringify({approval,peer:peerPin,sourcePromotionExecuted:false,APIStarted:false}));
