import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readinessDiffReviewMutationProof } from './candidate/tools/rust-r4ghi/business/readiness-bindings.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01';
const win=unix=>'//wsl.localhost/Debian'+unix;
const read=name=>JSON.parse(fs.readFileSync(root+'/'+name));
const pin=receipt=>{const b=fs.readFileSync(win(receipt.file));assert.equal(hash(b),receipt.rawBytesSha256);return JSON.parse(b);};
const rows=meta=>{const b=fs.readFileSync(win(meta.file));assert.equal(hash(b),meta.rawBytesSha256);return b.toString().split('\n').filter(Boolean).map(JSON.parse);};
const state=read('state.json'), ledger=read('000125-ledger.json');
assert.equal(state.blockedObservation.rawBytesSha256,hash(fs.readFileSync(root+'/000125-ledger.json')));
const before=pin(ledger.before),after=pin(ledger.after),database='poms_r4ghi_rust';
const req=read('000124-http-request.json'),body=read('000124-http-request-body.bin'),response=read('000124-http-response-body.bin'),headers=read('000124-http-response-headers.json');
const base=new URL(req.url),baseline=base.pathname.split('/').at(-1).split(':')[0];
const cookies=Object.fromEntries(req.headers.Cookie.split(';').map(v=>v.trim()).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
const tokenHash=hash(decodeURIComponent(cookies.poms_session));
const auth=rows(before.databases[database].tables.auth_session).map(r=>JSON.parse(r.raw)).find(r=>r.token_hash===tokenHash);
assert(auth);assert.equal(auth.user_id,state.actors.manager.id);
const publicFile='E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/business/g2-business08/main01/000124-http-http.json';
const httpReceipt=JSON.parse(fs.readFileSync(publicFile));
assert.equal(httpReceipt.requestId,ledger.requestId);assert.equal(httpReceipt.status,200);assert.equal(httpReceipt.expectedStatus,200);assert.equal(httpReceipt.responseComplete,true);assert.equal(httpReceipt.transportFailure,false);
for(const receipt of Object.values(httpReceipt.originals)){if(receipt?.file&&receipt?.rawBytesSha256){const b=fs.readFileSync(win(receipt.file));assert.equal(hash(b),receipt.rawBytesSha256);}}
const attempt={operationId:req.operationId,requestId:req.requestId,pathParams:{id:baseline},requestValue:body,body:response,actorId:auth.user_id,status:headers.status,expectedStatus:200,responseComplete:httpReceipt.responseComplete,transportFailure:httpReceipt.transportFailure};
assert.equal(req.method,'POST');assert.equal(req.headers['X-Request-Id'],ledger.requestId);assert.equal(req.requestId,ledger.requestId);
const k=ledger.blockers[0].key;
const beforeRow=rows(before.databases[database].tables.contract_readiness_package_item).find(r=>JSON.stringify(r.key)===JSON.stringify(k));
const afterRow=rows(after.databases[database].tables.contract_readiness_package_item).find(r=>JSON.stringify(r.key)===JSON.stringify(k));
const proof=readinessDiffReviewMutationProof({database,table:'contract_readiness_package_item',beforeRow,afterRow,attempt,before,after,readRows:rows});
assert(proof,'Exact actual snapshots must satisfy source-bound transition proof');
const owned=state.owned[JSON.stringify([database,'contract_readiness_package_item',k])];assert(owned);assert.equal(owned.latestSha256,beforeRow.sha256);assert.equal(owned.latestXmin,beforeRow.xmin);
const plan={kind:'proposed exact blocked observation reconciliation; not executed',epoch:state.epoch,run:state.run,marker:state.marker,blockedObservation:state.blockedObservation,before:ledger.before,after:ledger.after,requestId:attempt.requestId,operationId:attempt.operationId,status:attempt.status,actualHeaderCookieBoundToActor:true,httpReceipt:{file:publicFile.replace('E:/projects/worktrees/poms-r3hijk-next28/poms','/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'),sha256:hash(fs.readFileSync(publicFile))},proof,
 originals:Object.fromEntries(['000114-prepare01-partial.json','000120-http-request.json','000120-http-response-body.bin','000121-ledger.json','000124-http-request.json','000124-http-request-body.bin','000124-http-response-body.bin','000124-http-response-headers.json','000125-ledger.json'].map(name=>[name,{file:root.replace('//wsl.localhost/Debian','')+'/'+name,sha256:hash(fs.readFileSync(root+'/'+name))}])),
 oldGET:{operationId:'ContractReadinessController_getDiffHistory',requestId:read('000121-ledger.json').requestId,actualRecorded:[],actualBlockers:[],lazyWriteCertified:false},
 proposedRecovery:['Root reviews exact code and plan SHA; never modify original partial/ledger/HTTP originals.','Before apply capture a fresh complete two-DB/catalog/object snapshot and require same logical rows/catalog/objects as pinned after.','Revalidate exact request/actor/audit/review/parent/item status proof and existing ownership; dry-run prospective one-row ownership state through assertRecorded.','Append one exact source-proven ownership update for this child only; keep blocked pin until all checks pass.','Bind actual successful HTTP review response into matching contractRuns slot.diffReview to prevent duplicate POST; append immutable recovery receipt that references old incomplete ledger.','Only after prospective full ownership validation, replace blockedObservation with a completed reconciliation entry; original false receipt remains unchanged.'],businessDBChangedByAuthor:false,privateStateChangedByAuthor:false,rootExecutionPending:true};
fs.writeFileSync('tools/rust-r4ghi/I/implementation/business-recovery15/recovery-plan15.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({proofAccepted:true,table:proof.table,key:proof.key,xmin:proof.actualCommitXmin,changedColumns:proof.changedColumns,planSHA256:hash(fs.readFileSync('tools/rust-r4ghi/I/implementation/business-recovery15/recovery-plan15.json')),privateModified:false}));
