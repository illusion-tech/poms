// Preserve the actual ancestor-format finding; no new code or namespace grant.
import fs from 'node:fs';import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();const R=C.root,F=R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-B-code04-review01',O=R+'/tools/rust-r4ghi/independent/runtime121-I04-NOTREADY';
const checked=(f,h)=>{const p=pin(f);assert.equal(p.rawBytesSha256,h);return p;};
const manifest=checked(F+'/manifest.json','148423856e8e241357da5527c88be2d6f6ab5fea4da416349f44270cba9d2c87'),review=checked(F+'/review-I04-NOTREADY121.json','8aff6de9b4f94ccee553ca16f9ffa25171114c421b1009bb0c23ef16c98bd6a8');assert.equal(json(review).reviewerIsAuthor,false);
const files=[manifest,...json(manifest).files];for(const p of files)read(p);assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const copies=[];for(const p of files){const f=O+'/'+p.file.split('/').at(-1);fs.writeFileSync(local(f),read(p),{flag:'wx'});const copy=checked(f,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-retained-I04-historical-Stat5-NOTREADY',copies,I04NeverPromoted:true,newI05RequiresIndependentReview:true,APIStarted:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({preserved:review,I04NeverPromoted:true}));
