// Root-only byte-preserving metadata copy into the existing private request dir.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const source=pin('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-API-start-exact-G2-independent01/review-exact-API-start121.json');
assert.equal(source.bytes,5730);assert.equal(source.rawBytesSha256,'6d157309af7fac2ad326d248373c8960366dd74722abb3f8cc88b102cce5ed5e');
const D=C.private+'/runtime121-B-inputs/api-start/7fa5bece-bc64-4810-b6d1-8ce1af03024d',q=json(pin(D+'/request-exact-G2.json')),g=json(source);
assert.equal(g.kind,'non-author-runtime121-B-API-exact-G2');assert.equal(g.verdict,'approved-one-same-byte-API-start-readiness-only');assert.equal(g.reviewerIsAuthor,false);
assert.deepEqual(g.approvedInput,q.input);assert.deepEqual(g.expectedRootReview,q.expectedRootReview);assert.equal(q.effectsExecuted,false);assert.equal(q.RootReviewSigned,false);
for(const f of [D+'/Root-review.json',D+'/independent-review.json',D+'/independent-review-copy-proof.json']){try{fs.lstatSync(f);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing control entry requires reconciliation');}
directory121(D);const privatePeer=writeWx(D,'independent-review.json',read(source));assert.equal(privatePeer.rawBytesSha256,source.rawBytesSha256);assert.equal(privatePeer.bytes,source.bytes);
const copyProof=writeWx(D,'independent-review-copy-proof.json',{kind:'Root-exact-API-input06-independent-peer-raw-copy',recordedAt:new Date().toISOString(),source,privatePeer,rawBytesUnchanged:true,RootReviewSigned:false,APIStarted:false});
console.log(JSON.stringify({privatePeer,copyProof,APIStarted:false}));
