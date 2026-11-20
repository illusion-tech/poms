// Root-only frozen-contract approval metadata. Does not publish or call Native.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,stateFiles,stateSHAs,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_error,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');
  const D=C.private+'/runtime121-native-plan-data/8b6d8f9b-4bf8-4080-b8d2-63a3016772e1';
  const planPin=pin(D+'/native-plan121.json');assert.equal(planPin.rawBytesSha256,'4f1223c46875c7871414485526bb26728523e78dfbf281f3c491adcc8980c41e');
  const p=json(planPin),peer=pin('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-Native-FS-exact-G2-independent01/review-exact-Native-FS121.json');
  assert.equal(peer.bytes,63869);assert.equal(peer.rawBytesSha256,'b7ca419bb23035eec29a10f6019fdd375a557487e0149efc2a8699511dafc78f');
  const g=json(peer);assert.deepEqual(Object.keys(g).sort(),['kind','approvedPlan','scope121','operator','reviewerIsAuthor','verdict','sourceClosures'].sort());
  assert.equal(g.kind,'non-author-runtime121-input-review');assert.equal(g.verdict,'approved-exact-FS-runtime-publication-only');assert.equal(g.reviewerIsAuthor,false);
  assert.equal(g.approvedPlan.file,planPin.file);assert.equal(g.approvedPlan.rawBytesSha256,planPin.rawBytesSha256);
  const inspection=pin(C.root+'/tmp/rust-r4ghi/root/Native-inspect06-actual01/stdout.log');assert.equal(inspection.rawBytesSha256,'718ab5f6a251be62e2cee42fad7abbe99dc2d8cfe3001d50daf62d29b5936410');
  const inspected=json(inspection);assert.equal(inspected.kind,'runtime121-FS-plan-inspected');assert.equal(inspected.scope121,'dc6d68f6816ccc5b26ce906e4de4b3fcb3595bbc1c68b1684ea43f0e76e378b4');assert.equal(inspected.scope121,g.scope121);assert.equal(inspected.currentGranted,false);assert.equal(inspected.statePublished,false);
  const canonical=a=>a.map(v=>({file:v.file,rawBytesSha256:v.rawBytesSha256})).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  assert.equal(g.sourceClosures.length,284);assert.deepEqual(canonical(g.sourceClosures),canonical(p.tooling.executionSources));for(const q of p.tooling.executionSources)read(q);
  const operator=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs');assert.equal(operator.file,g.operator.file);assert.equal(operator.rawBytesSha256,g.operator.rawBytesSha256);
  const apiInput=json(pin(C.private+'/runtime121-B-inputs/api-start/7fa5bece-bc64-4810-b6d1-8ce1af03024d/input.json'));
  assert.deepEqual(Object.keys(apiInput.expectedStates).sort(),Object.keys(stateFiles).sort());
  for(const key of Object.keys(stateFiles)){assert.equal(apiInput.expectedStates[key].rawBytesSha256,stateSHAs[key]);assert(read(apiInput.expectedStates[key]).equals(fs.readFileSync(stateFiles[key])));}
  assert(read(p.stateTransfer.expectedState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
  assert(read(p.stateTransfer.expectedOwnership).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/ownership.jsonl')));
  const output=D+'/Root-FS-review.json',proof=D+'/Root-FS-review-preparation.json';
  for(const file of [output,proof]){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing approval metadata must be reconciled');}
  for(const epoch of [13,14,15]){try{fs.lstatSync(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing driver control entry');}
  const approval=writeWx(D,'Root-FS-review.json',{kind:'Root-approved-exact-runtime-admission121',approvedPlan:planPin,scope121:g.scope121,independentInputReview:peer,operator,expectedState:p.stateTransfer.expectedState,expectedOwnership:p.stateTransfer.expectedOwnership,actualG2Authorized:true,FSStatePublicationGranted:true,APIStartGranted:false,PGWriteGranted:false,TaxHTTPGranted:false});
  assert.equal(Object.keys(json(approval)).length,12);
  const preparation=writeWx(D,'Root-FS-review-preparation.json',{kind:'Root-actual-Native06-FS-approval-prepared',recordedAt:new Date().toISOString(),approval,independentPeer:peer,actualInspection:inspection,scope121:g.scope121,bookendContract:'B/Native expected-state raw equality; the A-only retained-copy file identity does not apply',canonicalStateStillOriginal:true,statePublished:false,NativeContextCreated:false,SQLHTTPExecuted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({approval,preparation,statePublished:false,NativeContextCreated:false}));
}
main().catch(error=>{console.error(JSON.stringify({kind:'Root-Native06-approval-metadata-stopped',name:error.name,code:error.code??null,frames:error.stack,valuesPublished:false,statePublished:false,preserveOriginals:true}));process.exitCode=1;});
