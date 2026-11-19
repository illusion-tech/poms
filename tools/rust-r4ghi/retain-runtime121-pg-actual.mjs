// Retain the completed original PG start; no Podman, SQL or process control.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const F=C.root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-pg-start-actual-readback01';
const A=C.private+'/runtime121-A/pg-start/d785af86-078b-4ba2-b325-b1fbc53028b0';
const D=C.private+'/runtime121-A-inputs/pg-start/d785af86-078b-4ba2-b325-b1fbc53028b0';
const O=C.root+'/tools/rust-r4ghi/independent/runtime121-pg-start-actual01';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const review=checked(F+'/review-actual-pg-start121.json','a08460c71d37bf3e2c51956cdb5b1ab4238adfd1aac7e0cf11801af976125a6e');
const manifest=checked(F+'/manifest-actual-pgstart121.json','f0cc9e01312a8dcbfe6741ce4a727d7547790272408422b30ab17e467bd0cf9e');
const complete=checked(A+'/complete.json','981d63c82ea17fdd19101e87bd0035f8c4b9f675fb36be64dcbf9573af0aa98a');
const command=checked(A+'/command-receipt.json','9af38eea6e4301b05ad58bc51e8fb800aabf1b0d6bbf17796fa527296ac6f37e');
const r=json(review),c=json(command),p=json(complete);assert.equal(r.verdict,'approved-actual-original-pg-start-readback');assert.equal(r.reviewerIsAuthor,false);
assert.equal(c.exitCode,0);assert.equal(c.signal,null);assert.equal(c.processError,null);assert.equal(p.kind,'actual-runtime121-A-original-PG-resumed');assert.equal(p.APIStarted,false);assert.equal(p.dataConservationNotYetObserved,true);
const sources=[review,manifest,complete,command,p.input,p.RootReview,p.intent,c.dispatch,c.stdout,c.stderr,...p.readiness,...json(manifest).files.map(({file,bytes,rawBytesSha256})=>({file,bytes,rawBytesSha256}))];
for(const name of ['before.json','start-command.json','start-stdout.log','start-stderr.log'])sources.push(pin(A+'/'+name));
sources.push(pin(D+'/request-exact-G2.json'));
const unique=[...new Map(sources.map(p=>[p.file,p])).values()];for(const p of unique)read(p);
assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const p of unique){const file=O+'/'+p.file.split('/').at(-1);assert(!fs.existsSync(local(file)));fs.writeFileSync(local(file),read(p),{flag:'wx'});const copy=checked(file,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-retained-original-PG-start-actual',copies,PGStarted:true,APIStarted:false,dataConservationObserved:false,innerCgroupWarningsPreserved:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({copies:copies.length,complete,PGStarted:true,APIStarted:false,dataConservationObserved:false}));
