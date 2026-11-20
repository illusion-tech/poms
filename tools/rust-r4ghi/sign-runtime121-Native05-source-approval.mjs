// Only after the concrete non-author source-only approval; never runs the tool.
import fs from 'node:fs';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
import{C,assertOperatorHost121,json,pin,read,writeWx}from'./runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');assert.equal(process.argv.length,6);assert.deepEqual([process.argv[2],process.argv[4]],['--peer-review','--peer-review-sha']);
const D=C.private+'/runtime121-native05-source-inputs/fc2b594f-e5a6-45af-b7bb-b9542c652cef',request=pin(D+'/request-exact-review.json');assert.equal(request.rawBytesSha256,'2150ece8040223097cc1e34c9b907e98e13c9045c8e9e1e68b78a14f6cfa527b');const q=json(request),p=json(q.input);
const peerPin=pin(process.argv[3]);assert.equal(peerPin.rawBytesSha256,process.argv[5]);const peer=json(peerPin);read(p.operator);
const {rootApprovalBody05,peerApproval05}=await import(pathToFileURL(p.operator.file).href);assert.deepEqual(q.expectedRootApprovalBody,rootApprovalBody05(p,q.input));peerApproval05(peer,p,q.input,q.expectedRootApproval);
assert(!fs.existsSync(q.expectedRootApproval.file));assert(!fs.existsSync(p.outputDirectory));assert(!fs.existsSync(C.private+'/runtime121-native05-source-promotion.lock'));
const approval=writeWx(D,'Root-approval.json',q.expectedRootApprovalBody);assert.deepEqual(approval,q.expectedRootApproval);console.log(JSON.stringify({approval,peer:peerPin,sourcePromotionExecuted:false,APIStarted:false}));
