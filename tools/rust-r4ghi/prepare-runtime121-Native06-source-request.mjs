// Concrete metadata only. Never sign or execute this request here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {C,assertOperatorHost121,directory121,json,pin,read,sha,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
assert.equal(process.argv.length,6);assert.deepEqual([process.argv[2],process.argv[4]],['--package','--package-sha']);
const packagePin=pin(process.argv[3]);assert.equal(packagePin.rawBytesSha256,process.argv[5]);
const pack=json(packagePin);assert.equal(pack.kind,'Root-Native06-single-source-data-and-operator-package');
for(const k of ['SourceSafetyApproved','RootApprovalSigned','sourcePromotionExecuted','APIStarted'])assert.equal(pack[k],false);
const operator=pack.operator;assert.equal(operator.file,C.root+'/tools/rust-r4ghi/runtime-recovery121/promote-native06-once.mjs');read(operator);
const {inputShape06,rootApprovalBody06,limits06}=await import(pathToFileURL(operator.file).href);
const p=json(pack.inputTemplate);for(const k of ['nonce','operator','outputDirectory'])assert.equal(p[k],null);
p.nonce=randomUUID();p.operator=operator;p.outputDirectory=C.private+'/runtime121-native06-source-promotion/'+p.nonce;inputShape06(p);
for(const k of ['plan','NativeCodeReview','Root8CodeReview','statusBookends','basePromotion','baseReadback'])read(p[k]);
const D=C.private+'/runtime121-native06-source-inputs/'+p.nonce;
assert(!fs.existsSync(p.outputDirectory));assert(!fs.existsSync(C.private+'/runtime121-native06-source-promotion.lock'));directory121(D,{exclusive:true});
const input=writeWx(D,'input.json',p),body=rootApprovalBody06(p,input),b=Buffer.from(JSON.stringify(body,null,2)+'\n');
const expectedRootApproval={file:D+'/Root-approval.json',bytes:b.length,rawBytesSha256:sha(b)};
const request=writeWx(D,'request-exact-review.json',{kind:'Root-runtime121-single-Native-source-safety-request',recordedAt:new Date().toISOString(),input,operator,expectedRootApproval,expectedRootApprovalBody:body,limits:limits06,RootApprovalSigned:false,sourceUpdateExecuted:false});
const O=C.root+'/tools/rust-r4ghi/runtime-recovery121/Native06-source-request01';assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});
const copies=[];for(const [q,name] of [[packagePin,'package-manifest.json'],[pack.inputTemplate,'input-template.json'],[operator,'operator-source.mjs.txt'],[input,'actual-input.json'],[request,'actual-request.json']]){const copy=writeWx(O,name,read(q));assert.equal(copy.rawBytesSha256,q.rawBytesSha256);copies.push({original:q,copy});}
writeWx(O,'raw-copies-provenance.json',{copies,RootApprovalSigned:false,sourceUpdateExecuted:false,APIStarted:false});
console.log(JSON.stringify({request,input,operator,expectedRootApproval,RootApprovalSigned:false,sourceUpdateExecuted:false}));
