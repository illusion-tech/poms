// Metadata only: forms the concrete review request; does not sign or promote.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {C,assertOperatorHost121,json,pin,read,sha,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
import {G3_361,rootBody361} from './runtime-recovery121/promote-corrective361-once.mjs';

assertOperatorHost121();assert.equal(process.platform,'linux');
const a=process.argv.slice(2),names=['production-manifest','production-review','data-manifest','data-review'];
assert.equal(a.length,16);const refs={};
for(const[i,name]of names.entries()){
  assert.equal(a[i*4],'--'+name);assert.equal(a[i*4+2],'--'+name+'-sha');
  refs[name]=pin(a[i*4+1]);assert.equal(refs[name].rawBytesSha256,a[i*4+3]);
}
const freeze=json(G3_361),baselines=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/baseline-pins361.json');
assert.equal(baselines.rawBytesSha256,'8e3660761c3b9e3c44750b5e6b6922aa6340280abf4d38c0c9ec2c695c1917a1');
const production=json(refs['production-manifest']),data=json(refs['data-manifest']);
assert.equal(production.production.length,4);assert.equal(data.production.length,2);
const products=[...production.production,...data.production];
assert.equal(new Set(products.map(p=>p.file)).size,6);
const operations=freeze.exactBeforeSources.map(before=>{
  const file=before.file.slice(C.root.length+1),product=products.find(x=>x.file===file);assert(product);
  assert.equal(product.operation,'MOD');assert.equal(product.beforeSHA256,before.rawBytesSha256);
  assert.equal(product.candidate.rawBytesSha256,product.afterSHA256);assert.notEqual(product.afterSHA256,product.beforeSHA256);read(product.candidate);read(before);
  return{file,before,candidate:product.candidate};
});
const nonce=randomUUID(),directory=C.private+'/runtime121-corrective361-source-inputs/'+nonce;
assert(!fs.existsSync(C.private+'/runtime121-corrective361-source/'+nonce));
assert(!fs.existsSync(C.private+'/runtime121-corrective361-source.lock'));directory121(directory,{exclusive:true});
const sourcePlan=writeWx(directory,'six-source-plan.json',{kind:'Root-runtime121-corrective361-six-source-plan',G3:G3_361,productionManifest:refs['production-manifest'],productionCodeReview:refs['production-review'],dataManifest:refs['data-manifest'],dataCodeReview:refs['data-review'],operations,baselinePins:baselines});
const operator=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-corrective361-once.mjs');
const body={kind:'Root-runtime121-corrective361-source-promotion-input',protocolVersion:1,nonce,G3:G3_361,sourcePlan,operator,outputDirectory:C.private+'/runtime121-corrective361-source/'+nonce};
const input=writeWx(directory,'input.json',body),approvalBody=rootBody361(body,input),approvalBytes=Buffer.from(JSON.stringify(approvalBody,null,2)+'\n');
const expectedRootApproval={file:directory+'/Root-approval.json',bytes:approvalBytes.length,rawBytesSha256:sha(approvalBytes)};
const request=writeWx(directory,'request-exact-review.json',{kind:'Root-runtime121-corrective361-exact-source-safety-request',recordedAt:new Date().toISOString(),input,sourcePlan,operator,expectedRootApproval,expectedRootApprovalBody:approvalBody,RootApprovalSigned:false,sourcePromotionExecuted:false,canonicalStateWritten:false});
console.log(JSON.stringify({request,input,sourcePlan,operator,expectedRootApproval,RootApprovalSigned:false,sourcePromotionExecuted:false}));
