// Preserve the single original-container G2 before its one actual dispatch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read, shape, verifySources, verifyStates } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const F=C.root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-pg-start-exactG2-review01';
const O=C.root+'/tools/rust-r4ghi/independent/runtime121-pg-start-G2-01';
const D=C.private+'/runtime121-A-inputs/pg-start/d785af86-078b-4ba2-b325-b1fbc53028b0';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const review=checked(F+'/review-pg-start-exactG2-121.json','e93494ab737905e5be463b1f161cfffa67ab43c168cc1bd28fab4f377b5bcd15');
const manifest=checked(F+'/manifest-pgstartG2-review121.json','b7914caf488762438d15be30e2d16b45fbd3a5717a1d556026c4cf0aac29958a');
const request=checked(D+'/request-exact-G2.json','43b318f8d283737d78019079b8abe150286554a867b9a0721bcd729eeab052e2');
const r=json(review),q=json(request),p=shape(json(q.input));
assert.equal(r.kind,'non-author-runtime121-A-exact-G2');assert.equal(r.mode,'pg-start');assert.equal(r.verdict,'approved-one-original-pg-start-only');assert.equal(r.reviewerIsAuthor,false);
assert.deepEqual(r.approvedInput,q.input);assert.deepEqual(r.expectedRootReview,q.expectedRootReview);verifySources(p);verifyStates(p);
assert(!fs.existsSync(local(q.expectedRootReview.file)));assert(!fs.existsSync(local(p.outputDirectory)));assert(!fs.existsSync(local(O)));
const sources=[manifest,review,request,q.input,...json(manifest).files];
const unique=[...new Map(sources.map(p=>[p.file,p])).values()];for(const p of unique)read(p);
fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const p of unique){const file=O+'/'+p.file.split('/').at(-1);assert(!fs.existsSync(local(file)));fs.writeFileSync(local(file),read(p),{flag:'wx'});const copy=checked(file,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-original-PG-start-exact-G2-copies',copies,PGStarted:false,APIStarted:false,dataConservationObserved:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({copies:copies.length,review,PGStarted:false}));
