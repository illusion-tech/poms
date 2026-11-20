// Root-only exact Root9 metadata after non-author input review. No context/mode call.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,sha,stateFiles,stateSHAs,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');
  const D=C.private+'/business/g2-business15/main01/tax121-prepare-metadata-82321806-8586-4210-b5cd-ef16311f63ce';
  const request=pin(D+'/request-prepare-only-G2-review118.json');assert.equal(request.rawBytesSha256,'9311dbe1140617acc8707f0520699acba0d83f8e235cfcdedfd571f5ba557818');
  const q=json(request),input=pin(D+'/prepare-only-input118.json');assert.equal(input.rawBytesSha256,'ddf3cb693f8d6ca3172e8515ac8521a1772d30b8e7dae81311ad7774590b3f6a');assert.deepEqual(q.input,input);const p=json(input);
  const independent=pin('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-fresh67-prepare-only-exact-G2-independent01/review-exact-prepare-only121.json');assert.equal(independent.bytes,5788);assert.equal(independent.rawBytesSha256,'1111abbbeeb7178f9b1da20d05d8b4cbe0a363447156688b8ec2cc06d25d74a1');
  const g=json(independent);assert.equal(g.kind,'non-author-Tax15-invocation118-exact-input-review');assert.equal(g.verdict,'approved-once-prepare-only121');assert.equal(g.reviewerIsAuthor,false);assert.deepEqual(g.approvedInput,input);assert.deepEqual(g.expectedRootReview,q.expectedRootReview);assert.deepEqual(g.expectedRootReviewBody,q.expectedRootReviewBody);
  const body=q.expectedRootReviewBody;assert.equal(Object.keys(body).length,9);assert.equal(body.kind,'Root-approved-exact-Tax15-invocation118');assert.equal(body.mode,'prepare-only');assert.equal(body.nonce,p.nonce);assert.equal(body.actualG2Authorized,true);assert.equal(body.normalTaxPOSTGranted,false);assert.equal(body.FIGranted,false);assert.deepEqual(body.expectedEntryState,p.expectedEntryState);assert.deepEqual(body.codeReview,p.codeReview);assert.equal(p.mode,'prepare-only');
  assert(read(p.expectedEntryState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));for(const key of ['state13','state14','ownership15'])assert.equal(pin(stateFiles[key]).rawBytesSha256,stateSHAs[key]);for(const source of p.executionSources)read(source);
  for(const epoch of [13,14,15]){try{fs.lstatSync(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing driver control entry');}
  const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n');assert.equal(bytes.length,1136);assert.equal(sha(bytes),'214583d361caa4d5a49f389857152db83fa32659031601abe33a90f8a343bb36');assert.equal(q.expectedRootReview.file,D+'/Root-exact-prepare-only-review118.json');
  for(const file of [q.expectedRootReview.file,D+'/Root-review-preparation.json']){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing signing output requires reconciliation');}
  const RootReview=writeWx(D,'Root-exact-prepare-only-review118.json',bytes);assert.deepEqual(RootReview,q.expectedRootReview);
  const receipt=writeWx(D,'Root-review-preparation.json',{kind:'Root-exact-fresh67-prepare-only-Root9-signed',recordedAt:new Date().toISOString(),request,input,independent,RootReview,sourceEntryStateStillEqual:true,prepareExecuted:false,NativeContextCreated:false,FIOrTaxOrMainGranted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({RootReview,receipt,prepareExecuted:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-prepare-only121-signing-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,modeExecuted:false}));process.exitCode=1;});
