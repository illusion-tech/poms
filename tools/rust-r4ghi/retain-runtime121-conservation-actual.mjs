// Safe metadata retention; original DB row files and observations remain private.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const F=C.root+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-A-conservation-actual-readback01';
const A=C.private+'/runtime121-A/pg-observe/4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c';
const D=C.private+'/runtime121-A-inputs/pg-observe/4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c';
const O=C.root+'/tools/rust-r4ghi/independent/runtime121-conservation-actual01';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const review=checked(F+'/review-actual-conservation121.json','5fd27f05a4994be5b61236a48e62728a2cec7ed54ee8d8b6d4d7c2fb8ed60f56');
const manifest=checked(F+'/manifest.json','c78d2320c978be87b6c4179614268330efd771d083b9c91d4b337710bfdf8e2b');
const complete=checked(A+'/complete.json','9c8334b7423d680eeea336716271220aaada126d8a2d2534987ee7f31999aac1');
const command=checked(A+'/command-receipt.json','bb19745007455ada58c7937fea510a2391b0ce6c7589b448f9742360cd5530c7');
const r=json(review),p=json(complete),c=json(command);assert.equal(r.verdict,'approved-actual-original-PG-conservation-readback');assert.equal(r.reviewerIsAuthor,false);assert.equal(c.exitCode,0);assert.equal(c.signal,null);assert.equal(c.processError,null);
for(const k of ['first','second','between']){assert.equal(p[k].allRawXminMetaSequencesObjectsEqual,true);assert.equal(p[k].tablesPerDB,139);assert.equal(p[k].crossDatabaseAtomicityClaimed,false);}
const sources=[review,manifest,complete,command,p.input,p.RootReview,p.intent,c.dispatch,c.stdout,c.stderr,pin(D+'/request-exact-G2.json'),...json(manifest).files];
const unique=[...new Map(sources.map(p=>[p.file,p])).values()];for(const p of unique)read(p);
assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const p of unique){const file=O+'/'+p.file.split('/').at(-1);assert(!fs.existsSync(local(file)));fs.writeFileSync(local(file),read(p),{flag:'wx'});const copy=checked(file,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-retained-original-PG-conservation-actual',copies,privateOriginalObservations:p.observations,privateBaseline:p.baseline,DBRowsPublished:false,PGStarted:true,APIStarted:false,nativeAuthorityGranted:false,businessG3:false,businessG4:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({safeCopies:copies.length,complete,conservationObserved:true,APIStarted:false}));
