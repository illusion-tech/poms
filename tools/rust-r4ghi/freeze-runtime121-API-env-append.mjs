// Concrete original env pin; no environment value is read or copied here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();
const R=C.root,F=R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-API-env-design-review01',O=R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02';
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const parent=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append01/Root-G1B-API-append01.json','96f0090e2965cc96e9557ff297192ecad15f712b74e39934bb00b2396e1a4b3c');
const proposal=checked(R+'/tools/rust-r4ghi/runtime-recovery121/Root-B-API-env-proposal01/proposal-env-pin121.json','75ad56724088781a0742fbf84908ce13a89fac4de8e1106667c7aefac99b6b1f');
const review=checked(F+'/review-API-env-pin-design121.json','b2a27ffe271fc711e11cb1586eb0faeeba3d071fa68dff5b0f7371f4ba00c0af');
const manifest=checked(F+'/manifest.json','9954b897d9a705c1e17082dbe1b9496cd75f00573c73c6011eb01ae80ca2356e');
const p=json(proposal),r=json(review),old=json(parent);assert.equal(r.verdict,'recommend-code-only-append');assert.equal(r.reviewerIsAuthor,false);assert.deepEqual(r.proposal,proposal);assert.deepEqual(r.parentAPIAppend,parent);assert.equal(r.scope.currentNestedKeys.after,12);
const sources=[parent,proposal,review,manifest,r.evidence];for(const q of sources)read(q);assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const copies=[];
for(const [at,q]of sources.entries()){const file=O+'/'+String(at+1).padStart(2,'0')+'-'+q.file.split('/').at(-1);fs.writeFileSync(local(file),read(q),{flag:'wx'});const copy=checked(file,q.rawBytesSha256);assert.equal(copy.bytes,q.bytes);copies.push({original:q,copy});}
const value={...old,edition:2,recordedAt:new Date().toISOString(),parentAPIAppend:parent,originalOperatorProposal:old.exactProposal,previousDesignReview:old.independentDesignReview,exactProposal:proposal,independentDesignReview:review,currentKeys:p.change.currentAfterKeys,
  baseNormalEnv:{file:C.private+'/rust.env',requiredPinKeys:['file','bytes','rawBytesSha256'],implicitDiscoveryForbidden:true,sourceValuesPublished:false},
  requirements:[...old.requirements,...r.mandatoryImplementationChecks],IExistingNativeFixedTechnicalG1SHAAdditionGranted:true,codeImplementationGranted:true,RootPromotionGranted:false,codeReady:false,actualG2Authorized:false,actualAPI:null};
const file=O+'/Root-G1B-API-append02.json';fs.writeFileSync(local(file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({copies,environmentValuesRead:false,actualEffects:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({append:pin(file),codeOnly:true,currentKeys:value.currentKeys.length,actualG2:false}));
