import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const names=['api-tsc07','api-lint07','api-build03','api-test04','admin-build06','admin-test05','admin-lint05','admin-data-lint04'];
const checks=names.map(name=>{const file=`tmp/rust-r4ghi/root/${name}-closure62/receipt.json`,bytes=fs.readFileSync(root+'/'+file),r=JSON.parse(bytes);
 assert.equal(r.exitCode,0);assert(r.sourceStable);assert.equal(r.inputs.length,2838);assert.equal(r.underlyingCheck.exitCode,0);
 return {name,file,rawBytesSha256:sha(bytes),inputManifestSHA256:r.inputManifestSHA256,inputFiles:r.inputs.length,node:r.node};});
assert.equal(new Set(checks.map(r=>r.inputManifestSHA256)).size,1);
for(const [name,count,suites] of [['api-test04',863,74],['admin-test05',463,66]]){const log=fs.readFileSync(root+`/tmp/rust-r4ghi/root/${name}/stderr.log`,'utf8');assert(log.includes(`${count} passed, ${count} total`));assert(log.includes(`${suites} passed, ${suites} total`));}
const result={kind:'actual-current-Native-admin-complete-input-bound-validation64',checks,inputFiles:2838,allSourceStable:true,nativeTests:{passed:863,suites:74},adminTests:{passed:463,suites:66},
 oldOutputsRelabelled:false,actualNativeHTTPClaimed:false,actualDOMClaimed:false,lintWarningBoundary:'See exact original stdout/stderr; exit0 does not assert zero historical warnings',G3Certified:false,G4Certified:false};
fs.writeFileSync(root+'/docs/design/rust-r4ghi/current-static-validation64.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const indexFile=root+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));
index.currentUIValidation={build:'../../tmp/rust-r4ghi/root/admin-build06/receipt.json',tests:463,suites:66,testReceipt:'../../tmp/rust-r4ghi/root/admin-test05/receipt.json',completeInputBoundValidation:'rust-r4ghi/current-static-validation64.json',inputFiles:2838,realDOMPassed:false};
index.currentStaticValidation='rust-r4ghi/current-static-validation64.json';fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,inputFiles:2838,sourceStable:true,nativeTests:863,adminTests:463,G3Certified:false}));
