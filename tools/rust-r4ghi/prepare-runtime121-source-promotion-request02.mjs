// Prepare exact source-only input; no Root approval, source writes or runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { C, assertOperatorHost121, directory121, json, pin, read, sha, writeWx } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const R=C.root,P=C.private,checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const plan=checked('/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/runtime121-finite-promotion-plan01/promotion-plan01.json','a11dbaa8a582487d5d3b3b0fa0919c513e5c45661b64238456029168cf8b05a8');
const components=checked(R+'/tools/rust-r4ghi/independent/runtime121-components03-steps/components.json','d70a73eda70004c381f8d4e12387ef35002c4a2efd79619a57fe1e3a19bbf5c9');
const status=checked(R+'/docs/design/rust-r4ghi/continuation-status355.json','60c462e9d87786904d532201647343c45fcab80a6e10e89a6d7065fb47372420');
for(const p of Object.values(json(status).unchangedBookends))read(p);
assert.equal(json(components).allThreeBoundedCodeStepsApproved,true);const planned=json(plan);assert.equal(planned.copyOperations33.length,33);assert.equal(planned.alreadyDeliveredVerifyOnlyRoot8.length,8);
for(const op of planned.copyOperations33){read(op.sourceCandidate);if(op.expectedOldSHA256===null)assert(!fs.existsSync(op.target.file));else assert.equal(pin(op.target.file).rawBytesSha256,op.expectedOldSHA256);}
for(const op of planned.alreadyDeliveredVerifyOnlyRoot8)assert.equal(pin(op.target.file).rawBytesSha256,op.expectedNewSHA256);
const operator=pin(R+'/tmp/rust-r4ghi/root/source-promotion121/promote-once02.mjs'),{approvalBody121}=await import(pathToFileURL(operator.file).href);assert.deepEqual(pin(operator.file),operator);
const nonce=randomUUID(),dir=P+'/runtime121-source-promotion-inputs/'+nonce,p={kind:'Root-runtime121-reviewed-source-promotion-input',schemaVersion:1,namespace:'poms-r4ghi',nonce,assembledPlan:plan,reviewedComponents:components,statusSnapshot:status,operator,outputDirectory:P+'/runtime121-source-promotion/'+nonce};
assert(!fs.existsSync(p.outputDirectory));assert(!fs.existsSync(P+'/runtime121-source-promotion.lock'));directory121(dir,{exclusive:true});const input=writeWx(dir,'input.json',p),body=approvalBody121(p,input),bytes=Buffer.from(JSON.stringify(body,null,2)+'\n'),expectedRootApproval={file:dir+'/Root-review.json',bytes:bytes.length,rawBytesSha256:sha(bytes)};
const request=writeWx(dir,'request-exact-review.json',{kind:'Root-runtime121-source-promotion-exact-review-request',recordedAt:new Date().toISOString(),input,expectedRootApproval,expectedRootApprovalBody:body,RootApprovalSigned:false,effectsExecuted:false});
const O=R+'/tools/rust-r4ghi/runtime-recovery121/source-safety-request02';assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});const copies=[];
for(const [p,name]of [[plan,'H-planned-promotion.json'],[components,'components.json'],[status,'status355.json'],[operator,'operator-source.mjs.txt'],[input,'actual-input.json'],[request,'actual-request.json']]){const q=writeWx(O,name,read(p));assert.equal(q.rawBytesSha256,p.rawBytesSha256);copies.push({original:p,copy:q});}
const provenance=writeWx(O,'raw-copies-provenance.json',{kind:'Root-source-safety-exact-request-copies',copies,RootApprovalSigned:false,effectsExecuted:false});
console.log(JSON.stringify({request,input,expectedRootApproval,operator,provenance,effectsExecuted:false}));
