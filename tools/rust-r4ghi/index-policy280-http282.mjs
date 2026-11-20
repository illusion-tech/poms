// Fixed completed H04 receipts only; this indexer does not create a context.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',O=P+'/policy280-h04',PUB=R+'/tmp/rust-r4ghi/business/g2-business13/main01';
const sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');
const pin=(file,s)=>{const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(file),file);const b=fs.readFileSync(file);if(s)assert.equal(sha(b),s);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const json=p=>JSON.parse(fs.readFileSync(pin(p.file,p.rawBytesSha256).file));
const statePin=pin(O+'/state-after-h04-280.json','af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'),state=json(statePin);
assert.equal(state.sequence,366);assert.equal(state.fixtures.hPolicyCoverage26.continuation261.steps.h04.phase,'verified');
const files=fs.readdirSync(PUB).filter(f=>/^\d{6}-http-http\.json$/.test(f)&&Number(f.slice(0,6))>342&&Number(f.slice(0,6))<=366).sort(),entries=[];
for(const file of files){
  const httpPin=pin(PUB+'/'+file),http=json(httpPin);
  assert.equal(http.kind,'actual-business-HTTP-attempt');assert.equal(http.responseComplete,true);assert.equal(http.transportFailure,false);assert.equal(http.status,http.expectedStatus);assert(http.status>=200&&http.status<300);
  const originals=Object.fromEntries(Object.entries(http.originals).map(([k,p])=>[k,pin(p.file,p.rawBytesSha256)])),seq=Number(file.slice(0,6)),ledgerPin=pin(D+'/'+String(seq+1).padStart(6,'0')+'-ledger.json'),ledger=json(ledgerPin);
  assert.equal(ledger.requestId,http.requestId);assert.equal(ledger.operationId,http.operationId);assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);
  entries.push({http:httpPin,operationId:http.operationId,method:http.method,requestId:http.requestId,status:http.status,responseComplete:true,originals,before:pin(ledger.before.file,ledger.before.rawBytesSha256),after:pin(ledger.after.file,ledger.after.rawBytesSha256),ledger:ledgerPin,recorded:ledger.recorded.length});
}
assert.equal(entries.length,10);
const auth=entries.filter(e=>e.operationId.startsWith('AuthController_')),signals=entries.filter(e=>e.operationId==='ProjectCostController_getOperatingSignalEvaluation'),gates=entries.filter(e=>e.operationId==='ProjectCostController_getCommissionGateBinding'),review=entries.filter(e=>e.operationId==='ProjectCostController_reviewOperatingSignalEvaluation');
assert.deepEqual(auth.map(e=>e.operationId),['AuthController_getCsrfToken','AuthController_createPasswordAuthSession','AuthController_getCurrentAuthSession','AuthController_getCurrentAuthSession']);
assert.equal(signals.length,1);assert.equal(gates.length,4);assert.equal(review.length,1);assert.equal(review[0].method,'POST');assert.equal(review[0].status,200);assert([...signals,...gates].every(e=>e.method==='GET'&&e.status===200));assert.equal(entries.filter(e=>e.method==='POST').length,2);assert.equal(auth.length+signals.length+gates.length+review.length,entries.length);
const index={kind:'actual-fixed-Source13-h04-280-auth-review-and-H-HTTP-capture-index282',fixedCompletedState:statePin,entries,actualHTTPRequestCount:10,authRequestCount:4,HGETCount:5,HReviewPOSTCount:1,GRequestCount:0,allResponseBodiesHeadersConfigsAndLedgersPinned:true,actualCommandsExecutedByIndexer:0,original317Replayed:false,G3:false,G4:false};
const file=O+'/http-index282.json';fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({index:pin(file),requests:10,auth:4,HGET:5,HReviewPOST:1,GRequests:0,allCompleteAndOwned:true,newHTTPOrSQL:false}));
