// Exact v3 Root12 metadata only. Never publishes state or calls Native.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
function mustAbsent362(file){
  try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return;throw e;}
  throw Error('Existing entry requires Root reconciliation');
}
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);
  assert.equal(a.length,12);assert.deepEqual([a[0],a[2],a[4],a[6],a[8],a[10]],['--plan','--plan-sha','--peer-review','--peer-review-sha','--inspection','--inspection-sha']);
  const planPin=pin(a[1]);assert.equal(planPin.rawBytesSha256,a[3]);const p=json(planPin);
  assert.equal(p.kind,'source15-append-runtime-plan121');assert.equal(p.protocolVersion,3);assert.equal(Object.keys(p).length,12);
  const directory=C.private+'/runtime121-native-plan-data/'+p.nonce;assert.equal(planPin.file,directory+'/native-plan121.json');
  assert.equal(Object.keys(p.stateTransfer).length,4);assert.equal(p.stateTransfer.actorCacheDelta.clearCookies,false);assert.equal(p.stateTransfer.actorCacheDelta.clearPermissions,false);
  assert.equal(p.base.retainedState15.rawBytesSha256,'4c354c9190cdae04135ddedd1da7e8652fe5aa6e0aa8f5c74805faef9bc903ea');
  assert.equal(p.stateTransfer.expectedState.rawBytesSha256,'e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38');
  assert.equal(p.stateTransfer.expectedOwnership.rawBytesSha256,'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989');
  const peer=pin(a[5]);assert.equal(peer.rawBytesSha256,a[7]);const g=json(peer);
  assert.deepEqual(Object.keys(g).sort(),['kind','approvedPlan','scope121','operator','reviewerIsAuthor','verdict','sourceClosures'].sort());
  assert.equal(g.kind,'non-author-runtime121-input-review');assert.equal(g.verdict,'approved-exact-FS-runtime-publication-only');assert.equal(g.reviewerIsAuthor,false);
  assert.equal(g.approvedPlan.file,planPin.file);assert.equal(g.approvedPlan.rawBytesSha256,planPin.rawBytesSha256);
  const inspection=pin(a[9]);assert.equal(inspection.rawBytesSha256,a[11]);const inspected=json(inspection);
  assert.equal(inspected.kind,'runtime121-FS-plan-inspected');assert.equal(inspected.approvedPlan.file,planPin.file);assert.equal(inspected.approvedPlan.rawBytesSha256,planPin.rawBytesSha256);
  assert.equal(inspected.scope121,g.scope121);assert(/^[a-f0-9]{64}$/.test(g.scope121));assert.equal(inspected.currentGranted,false);assert.equal(inspected.statePublished,false);
  const canonical=xs=>xs.map(x=>({file:x.file,rawBytesSha256:x.rawBytesSha256})).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  assert.equal(g.sourceClosures.length,284);assert.equal(new Set(g.sourceClosures.map(x=>x.file)).size,284);assert.deepEqual(canonical(g.sourceClosures),canonical(p.tooling.executionSources));
  for(const q of p.tooling.executionSources)read(q);
  const operator=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs');assert.equal(operator.file,g.operator.file);assert.equal(operator.rawBytesSha256,g.operator.rawBytesSha256);
  for(const q of [
    {file:C.private+'/business/g2-business13/main01/state.json',rawBytesSha256:'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'},
    {file:C.private+'/business/g2-business14/main01/state.json',rawBytesSha256:'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'},
    {file:C.private+'/rust-api121-process.json',bytes:5775,rawBytesSha256:'f822ffcd0e027c93c20ca6f5630bb2be44d738c1127199d30cbe3abfc2caa38f'},
  ])read(q);
  assert(read(p.stateTransfer.expectedState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
  assert(read(p.stateTransfer.expectedOwnership).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/ownership.jsonl')));
  assert.equal(path.dirname(p.outputs.receiptDirectory),C.private+'/business/g2-business15/main01');mustAbsent362(p.outputs.receiptDirectory);
  for(const epoch of [13,14,15])mustAbsent362(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');
  for(const name of ['Root-FS-review.json','Root-FS-review-preparation.json'])mustAbsent362(directory+'/'+name);
  const approval=writeWx(directory,'Root-FS-review.json',{kind:'Root-approved-exact-runtime-admission121',approvedPlan:planPin,scope121:g.scope121,independentInputReview:peer,operator,expectedState:p.stateTransfer.expectedState,expectedOwnership:p.stateTransfer.expectedOwnership,actualG2Authorized:true,FSStatePublicationGranted:true,APIStartGranted:false,PGWriteGranted:false,TaxHTTPGranted:false});
  assert.equal(Object.keys(json(approval)).length,12);
  const preparation=writeWx(directory,'Root-FS-review-preparation.json',{kind:'Root-actual-corrective362-Native-FS-approval-prepared',recordedAt:new Date().toISOString(),approval,independentPeer:peer,actualInspection:inspection,scope121:g.scope121,successor:p.stateTransfer.successor,canonicalStateStillE0d9:true,statePublished:false,NativeContextCreated:false,SQLHTTPExecuted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({approval,preparation,statePublished:false,NativeContextCreated:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-Native362-approval-metadata-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,statePublished:false,preserveOriginals:true}));process.exitCode=1;});
