// Preserve the one readonly conservation G2 before its actual dispatch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read, shape, verifySources, verifyStates } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const F=C.root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-pg-observe-exactG2-review01';
const O=C.root+'/tools/rust-r4ghi/independent/runtime121-pg-observe-G2-01';
const D=C.private+'/runtime121-A-inputs/pg-observe/4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const review=checked(F+'/review-pg-observe-exactG2-121.json','c4a304f8cf2d586d9c17d8ad93fdeab63507aa388f2517a951742d44d45859c5');
const manifest=checked(F+'/manifest-pgobserveG2-review121.json','47b4d1f746823cb6f9e5f81827a383a8d3483c293ae4b6c5764e4dfa89ada84c');
const request=checked(D+'/request-exact-G2.json','f1a562ff8f914ae6112692e825fc207c4486d193a71d4a331aa3fb919c371a67');
const r=json(review),q=json(request),p=shape(json(q.input));
assert.equal(r.kind,'non-author-runtime121-A-exact-G2');assert.equal(r.mode,'pg-observe');assert.equal(r.verdict,'approved-one-readonly-original-conservation-only');assert.equal(r.reviewerIsAuthor,false);
assert.deepEqual(r.approvedInput,q.input);assert.deepEqual(r.expectedRootReview,q.expectedRootReview);verifySources(p);verifyStates(p);
assert(!fs.existsSync(local(q.expectedRootReview.file)));assert(!fs.existsSync(local(p.outputDirectory)));assert(!fs.existsSync(local(O)));
const sources=[manifest,review,request,q.input,...json(manifest).files];
const unique=[...new Map(sources.map(p=>[p.file,p])).values()];for(const p of unique)read(p);
fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const p of unique){const file=O+'/'+p.file.split('/').at(-1);assert(!fs.existsSync(local(file)));fs.writeFileSync(local(file),read(p),{flag:'wx'});const copy=checked(file,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-readonly-conservation-exact-G2-copies',copies,observationExecuted:false,APIStarted:false,dataConservationObserved:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({copies:copies.length,review,observationExecuted:false}));
