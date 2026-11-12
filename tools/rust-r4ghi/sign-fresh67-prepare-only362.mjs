// Root9 metadata after exact independent prepare-only input review. No mode call.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,sha,stateFiles,stateSHAs,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
function absent(file){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Existing entry requires Root reconciliation');}
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,8);assert.deepEqual([a[0],a[2],a[4],a[6]],['--request','--request-sha','--peer-review','--peer-review-sha']);
  const request=pin(a[1]);assert.equal(request.rawBytesSha256,a[3]);assert.equal(request.rawBytesSha256,'9fbc9a245cccbe572d5b880f6573637bfe10ca10db599e47a24efa6cfd7eeeef');
  const q=json(request),input=q.input,p=json(input),D=path.posix.dirname(input.file);
  assert.equal(D,C.private+'/business/g2-business15/main01/tax121-prepare-metadata-6458f733-0fe1-4b5e-b2ff-076908543af3');assert.equal(request.file,D+'/request-prepare-only-G2-review118.json');assert.equal(input.file,D+'/prepare-only-input118.json');assert.equal(input.bytes,7040);assert.equal(input.rawBytesSha256,'1834a57d5d0e868422492b888df0654f1911b60bd07ea59025a56c0f3d93ae84');
  const independent=pin(a[5]);assert.equal(independent.rawBytesSha256,a[7]);const g=json(independent);
  assert.equal(g.kind,'non-author-Tax15-invocation118-exact-input-review');assert.equal(g.verdict,'approved-once-prepare-only121');assert.equal(g.reviewerIsAuthor,false);assert.deepEqual(g.approvedInput,input);assert.deepEqual(g.expectedRootReview,q.expectedRootReview);assert.deepEqual(g.expectedRootReviewBody,q.expectedRootReviewBody);
  const E1=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/prepare362-timing-E1-01/Root-E1-prepare362-timing.json');assert.equal(E1.bytes,4894);assert.equal(E1.rawBytesSha256,'a5530e1a98173cc3dcd58c4fa0fa15dcc63bef3d1af2d99d302e87ffcb33e0c4');const timing=json(E1);assert.deepEqual(timing.fixedExecution.input,input);assert.deepEqual(timing.fixedExecution.expectedRoot9,q.expectedRootReview);assert.equal(timing.authority.FIGranted,false);
  const body=q.expectedRootReviewBody;assert.deepEqual(Object.keys(body).sort(),['kind','approvedInput','codeReview','expectedEntryState','mode','nonce','actualG2Authorized','normalTaxPOSTGranted','FIGranted'].sort());
  assert.equal(body.kind,'Root-approved-exact-Tax15-invocation118');assert.deepEqual(body.approvedInput,input);assert.equal(body.mode,'prepare-only');assert.equal(body.nonce,p.nonce);assert.equal(body.actualG2Authorized,true);assert.equal(body.normalTaxPOSTGranted,false);assert.equal(body.FIGranted,false);assert.deepEqual(body.expectedEntryState,p.expectedEntryState);assert.deepEqual(body.codeReview,p.codeReview);assert.equal(p.mode,'prepare-only');assert.equal(Object.keys(p).length,34);
  assert.equal(p.expectedEntryState.rawBytesSha256,'dcacbdd8087aece6f1a17a62732b4243014650f91838a04a3b8444f67145da3d');assert(read(p.expectedEntryState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
  for(const key of ['state13','state14'])assert.equal(pin(stateFiles[key]).rawBytesSha256,stateSHAs[key]);assert.equal(pin(stateFiles.ownership15).rawBytesSha256,'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989');for(const source of p.executionSources)read(source);
  for(const epoch of [13,14,15])absent(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');
  const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n');assert.equal(bytes.length,1140);assert.equal(sha(bytes),'76e4b36bd1c444543a6416bccaa2bb0f3e4515fd5d68cf6a50aba1659c5397e4');assert.equal(q.expectedRootReview.file,D+'/Root-exact-prepare-only-review118.json');assert.equal(q.expectedRootReview.bytes,bytes.length);assert.equal(q.expectedRootReview.rawBytesSha256,sha(bytes));
  for(const file of [q.expectedRootReview.file,D+'/Root-review-preparation.json'])absent(file);
  const RootReview=writeWx(D,'Root-exact-prepare-only-review118.json',bytes);assert.deepEqual(RootReview,q.expectedRootReview);
  const receipt=writeWx(D,'Root-review-preparation.json',{kind:'Root-exact-source362-fresh67-prepare-only-Root9-signed',recordedAt:new Date().toISOString(),request,input,independent,RootReview,timingEvidenceBoundary:E1,budgetProvenBeforeRun:false,sourceEntryStateStillEqual:true,prepareExecuted:false,NativeContextCreated:false,FIOrTaxOrMainGranted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({RootReview,receipt,prepareExecuted:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-prepare-only362-signing-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,modeExecuted:false}));process.exitCode=1;});
