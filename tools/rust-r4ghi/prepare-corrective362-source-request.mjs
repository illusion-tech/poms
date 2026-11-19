// Metadata only. Creates a concrete eight-source review request, never approval/effects.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {C,assertOperatorHost121,json,pin,read,sha,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
import {G3_362,assertAbsent362,rootBody362,sourcePlan362} from './runtime-recovery121/promote-corrective362-once.mjs';

assertOperatorHost121();assert.equal(process.platform,'linux');
const a=process.argv.slice(2),names=['production-manifest','production-review','data-manifest','data-review'];
assert.equal(a.length,16);const refs={};
for(const[i,name]of names.entries()){
 assert.equal(a[i*4],'--'+name);assert.equal(a[i*4+2],'--'+name+'-sha');refs[name]=pin(a[i*4+1]);assert.equal(refs[name].rawBytesSha256,a[i*4+3]);
}
const freeze=json(G3_362),baselines=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/corrective362-source-baseline01/baseline-pins362.json');
assert.equal(baselines.bytes,7262);assert.equal(baselines.rawBytesSha256,'c32b27d54cb7a8b2ce57079854d74f092e9b99989f4598f2ae28031ed07e390b');
const production=json(refs['production-manifest']),data=json(refs['data-manifest']);assert.equal(production.production.length,6);assert.equal(data.production.length,2);
for(const[name,count]of [['production',6],['data',2]]){
 const m=json(refs[name+'-manifest']),r=json(refs[name+'-review']);assert.equal(m.kind,'I-runtime121-code-candidate');assert.equal(m.edition,362);assert.deepEqual(m.correctiveG3,G3_362);
 assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);assert.notEqual(r.author,r.reviewer);assert.deepEqual(r.componentManifest,refs[name+'-manifest']);assert.deepEqual(r.correctiveG3,G3_362);assert.equal(r.entries.length,count);assert.equal(r.technicalG1.rawBytesSha256,'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc');read(r.technicalG1);
 for(const[q,index]of m.production.map((q,i)=>[q,i])){const e=r.entries.find(e=>e.file===q.file);assert(e);assert.equal(e.productPointer,'/production/'+index);assert.equal(e.beforeSHA256,q.beforeSHA256);assert.equal(e.afterSHA256,q.afterSHA256);}
}
const products=[...production.production,...data.production];assert.equal(new Set(products.map(p=>p.file)).size,8);
const operations=freeze.exactBeforeSources.map(f=>{const before={file:C.root+'/'+f.file,bytes:f.beforeBytes,rawBytesSha256:f.beforeSHA256},product=products.find(q=>q.file===f.file);assert(product);assert.equal(product.operation,'MOD');assert.equal(product.beforeSHA256,before.rawBytesSha256);assert.equal(product.candidate.rawBytesSha256,product.afterSHA256);assert.notEqual(product.afterSHA256,product.beforeSHA256);read(product.candidate);read(before);return{file:f.file,before,candidate:product.candidate};});
const nonce=randomUUID(),directory=C.private+'/runtime121-corrective362-source-inputs/'+nonce,output=C.private+'/runtime121-corrective362-source/'+nonce;
assertAbsent362(output);assertAbsent362(C.private+'/runtime121-corrective362-source.lock');directory121(directory,{exclusive:true});
const sourcePlan=writeWx(directory,'eight-source-plan.json',{kind:'Root-runtime121-corrective362-eight-source-plan',G3:G3_362,productionManifest:refs['production-manifest'],productionCodeReview:refs['production-review'],dataManifest:refs['data-manifest'],dataCodeReview:refs['data-review'],operations,baselinePins:baselines});
const operator=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-corrective362-once.mjs');assert.equal(operator.bytes,16037);assert.equal(operator.rawBytesSha256,'af6e4f406cec2f84e711f13d7160b470eb8fea2322e2f4a48a3bb3632d93868d');
const body={kind:'Root-runtime121-corrective362-source-promotion-input',protocolVersion:1,nonce,G3:G3_362,sourcePlan,operator,outputDirectory:output};
sourcePlan362(body); // Genuine read-only source/namespace/identity preflight; no application import.
const input=writeWx(directory,'input.json',body),approvalBody=rootBody362(body,input),approvalBytes=Buffer.from(JSON.stringify(approvalBody,null,2)+'\n');
const expectedRootApproval={file:directory+'/Root-approval.json',bytes:approvalBytes.length,rawBytesSha256:sha(approvalBytes)};assertAbsent362(expectedRootApproval.file);
const request=writeWx(directory,'request-exact-review.json',{kind:'Root-runtime121-corrective362-exact-source-safety-request',recordedAt:new Date().toISOString(),input,sourcePlan,operator,expectedRootApproval,expectedRootApprovalBody:approvalBody,RootApprovalSigned:false,sourcePromotionExecuted:false,canonicalStateWritten:false});
console.log(JSON.stringify({request,input,sourcePlan,operator,expectedRootApproval,RootApprovalSigned:false,sourcePromotionExecuted:false,canonicalStateWritten:false}));
