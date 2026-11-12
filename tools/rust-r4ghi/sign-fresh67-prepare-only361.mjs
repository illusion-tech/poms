// Root9 metadata after exact independent prepare-only input review. No mode call.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,sha,stateFiles,stateSHAs,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
function absent(file){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Existing entry requires Root reconciliation');}
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,8);assert.deepEqual([a[0],a[2],a[4],a[6]],['--request','--request-sha','--peer-review','--peer-review-sha']);
  const request=pin(a[1]);assert.equal(request.rawBytesSha256,a[3]);assert.equal(request.rawBytesSha256,'5157f208d4da22720b344d548ac604852a44cbe56c9d602676f307ae527a9f3e');
  const q=json(request),input=q.input,p=json(input),D=path.posix.dirname(input.file);
  assert.equal(D,C.private+'/business/g2-business15/main01/tax121-prepare-metadata-1899fb63-42e3-4bd5-94d2-f1fbd8c57d57');assert.equal(request.file,D+'/request-prepare-only-G2-review118.json');assert.equal(input.file,D+'/prepare-only-input118.json');assert.equal(input.bytes,7040);assert.equal(input.rawBytesSha256,'ae6879930c58bf6be0da322b048ec25f45b175084649b16a1586508eec019a9b');
  const independent=pin(a[5]);assert.equal(independent.rawBytesSha256,a[7]);const g=json(independent);
  assert.equal(g.kind,'non-author-Tax15-invocation118-exact-input-review');assert.equal(g.verdict,'approved-once-prepare-only121');assert.equal(g.reviewerIsAuthor,false);assert.deepEqual(g.approvedInput,input);assert.deepEqual(g.expectedRootReview,q.expectedRootReview);assert.deepEqual(g.expectedRootReviewBody,q.expectedRootReviewBody);
  const body=q.expectedRootReviewBody;assert.deepEqual(Object.keys(body).sort(),['kind','approvedInput','codeReview','expectedEntryState','mode','nonce','actualG2Authorized','normalTaxPOSTGranted','FIGranted'].sort());
  assert.equal(body.kind,'Root-approved-exact-Tax15-invocation118');assert.deepEqual(body.approvedInput,input);assert.equal(body.mode,'prepare-only');assert.equal(body.nonce,p.nonce);assert.equal(body.actualG2Authorized,true);assert.equal(body.normalTaxPOSTGranted,false);assert.equal(body.FIGranted,false);assert.deepEqual(body.expectedEntryState,p.expectedEntryState);assert.deepEqual(body.codeReview,p.codeReview);assert.equal(p.mode,'prepare-only');assert.equal(Object.keys(p).length,34);
  assert.equal(p.expectedEntryState.rawBytesSha256,'76ad68ccf87565192f6089294ede52ab77d977f423a364c9d1b1ebb5d3d3263d');assert(read(p.expectedEntryState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
  for(const key of ['state13','state14','ownership15'])assert.equal(pin(stateFiles[key]).rawBytesSha256,stateSHAs[key]);for(const source of p.executionSources)read(source);
  for(const epoch of [13,14,15])absent(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');
  const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n');assert.equal(bytes.length,1140);assert.equal(sha(bytes),'000eab1f722b07e62c871aed4f43fb252ef1fafc2f14b43da48a6c0e06d96a19');assert.equal(q.expectedRootReview.file,D+'/Root-exact-prepare-only-review118.json');assert.equal(q.expectedRootReview.bytes,bytes.length);assert.equal(q.expectedRootReview.rawBytesSha256,sha(bytes));
  for(const file of [q.expectedRootReview.file,D+'/Root-review-preparation.json'])absent(file);
  const RootReview=writeWx(D,'Root-exact-prepare-only-review118.json',bytes);assert.deepEqual(RootReview,q.expectedRootReview);
  const receipt=writeWx(D,'Root-review-preparation.json',{kind:'Root-exact-source361-fresh67-prepare-only-Root9-signed',recordedAt:new Date().toISOString(),request,input,independent,RootReview,sourceEntryStateStillEqual:true,prepareExecuted:false,NativeContextCreated:false,FIOrTaxOrMainGranted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({RootReview,receipt,prepareExecuted:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-prepare-only361-signing-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,modeExecuted:false}));process.exitCode=1;});
