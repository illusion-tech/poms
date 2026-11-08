import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// FS-only replay of genuine Source12 observations. It does not create a context,
// read a live state/process, call a database, or send a request.
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const OUT=R+'/tools/rust-r4ghi/independent/review05/tax-history-review122';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pinFile=file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,rawBytesSha256:digest(b)};};
const readPin=pin=>{const b=fs.readFileSync(pin.file);assert.equal(digest(b),pin.rawBytesSha256);if(pin.bytes!==undefined)assert.equal(b.length,pin.bytes);return JSON.parse(b);};
const statePin={file:P+'/retention/epoch12-before-source13-139/state-at-retention139.json',rawBytesSha256:'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628'};
const sourceNames=['tax13-facts.mjs','tax13-semantics.mjs','tax13-sweep.mjs','ledger.mjs','snapshot.mjs'];
const sourcePins=sourceNames.map(n=>pinFile(R+'/tools/rust-r4ghi/business/'+n));
assert.equal(sourcePins[0].rawBytesSha256,'e55e6cb5dce6169e1ae2737881d946638ce709414ad6633c829fa2eb7c8eee9b');
assert.equal(sourcePins[1].rawBytesSha256,'0c8cf1a203769174424097c24ba4e18de393da0dfe45e1aefe14695daf7c1120');
const {rowsTax13}=await import(pathToFileURL(sourcePins[0].file));
const {verifyTax13Semantics}=await import(pathToFileURL(sourcePins[1].file));
const {readRows}=await import(pathToFileURL(R+'/tools/rust-r4ghi/business/snapshot.mjs'));
const state=readPin(statePin),series=Object.values(state.sharedRequiredWriteSweeps58).filter(s=>s.branch==='stage');assert.equal(series.length,1);
const saved=series[0],success=saved.finalSuccess;assert.equal(success.status,201);assert.equal(success.postconditions,'verified');
const before=readPin(success.before),after=readPin(success.after);assert.equal(before.epoch,'g2-business12');assert.equal(after.epoch,'g2-business12');
assert.equal(before.manifest,undefined);assert.equal(after.manifest,undefined);
const observed=readPin(saved.raceAttempt.observation),attempts=observed.attempts.filter(a=>a.requestId===success.requestId);assert.equal(attempts.length,1);
const attempt=attempts[0];assert.equal(attempt.status,201);assert.equal(attempt.responseComplete,true);assert.equal(attempt.transportFailure,false);
assert.equal(attempt.operationId,'ProjectCostController_createOperatingRestatement');
const ledgerPin=pinFile(P+'/business/g2-business12/main01/006183-ledger.json'),ledger=readPin(ledgerPin);
assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);
const ctx={database:'poms_r4ghi_rust',state:{owned:state.owned}};
const old=rowsTax13(ctx,before,readRows),now=rowsTax13(ctx,after,readRows);
const cases=[['shared_cost_allocation_basis',saved.scope.sharedFacts.basisId],...saved.scope.sharedFacts.results.map(r=>['shared_cost_allocation_result',r.id]),...saved.scope.sharedFacts.targets.map(t=>['project_operating_snapshot',t.restatesSnapshotRef.id])];
const get=(snapshot,table,id)=>{const a=readRows(snapshot.databases[ctx.database].tables[table]).filter(r=>r.key.length===1&&r.key[0]===id);assert.equal(a.length,1);return a[0];};
const observations=[];
for(const [table,id]of cases){
 const a=get(before,table,id),b=get(after,table,id),owner=state.owned[JSON.stringify([ctx.database,table,[id]])];
 assert(owner);assert.equal(owner.proof.transport,'HTTP');assert.equal(owner.proof.beforeAbsent,true);
 assert.equal(owner.latestSha256,b.sha256);assert.equal(owner.latestXmin,b.xmin);
 assert.notEqual(a.sha256,b.sha256);assert.notEqual(a.xmin,b.xmin);
 assert.equal(owner.latestProof.kind,'HTTP-owned-row-update');assert.equal(owner.latestProof.requestId,attempt.requestId);assert.equal(owner.latestProof.operationId,attempt.operationId);
 assert.deepEqual(owner.latestProof.beforeSnapshot,success.before);assert.deepEqual(owner.latestProof.afterSnapshot,success.after);assert.equal(owner.latestProof.beforeSha256,a.sha256);
 const birthBefore=readPin(owner.proof.beforeSnapshot),birthAfter=readPin(owner.proof.afterSnapshot);
 assert(!readRows(birthBefore.databases[ctx.database].tables[table]).some(r=>JSON.stringify(r.key)===JSON.stringify(a.key)));
 assert.equal(get(birthAfter,table,id).sha256,owner.firstSha256);
 let failure;try{old.owned(table,id);}catch(e){failure={name:e.name,code:e.code,actual:e.actual,expected:e.expected};}
 assert.equal(failure?.code,'ERR_ASSERTION','The current strict reader must reproduce the post-reconciliation historical mismatch');
 const afterValue=now.owned(table,id);assert.equal(afterValue.id,id);
 observations.push({table,id,before:{sha256:a.sha256,xmin:a.xmin,status:JSON.parse(a.raw).status,rowVersion:JSON.parse(a.raw).row_version},after:{sha256:b.sha256,xmin:b.xmin,status:JSON.parse(b.raw).status,rowVersion:JSON.parse(b.raw).row_version},originalHttpBirthValidated:true,currentLatestAndExactUpdateBridgeValidated:true,historicalReadRejected:failure,afterReadPassed:true});
}
// Exercise the exact first expression of the exported semantic checker with the
// genuine Stage basis. This is not a Tax producer/POST or a Tax business pass.
let firstExpression;try{verifyTax13Semantics(ctx,before,after,attempt,{basisId:saved.scope.sharedFacts.basisId},[],{},null);}catch(e){firstExpression={name:e.name,code:e.code,message:e.message,stack:e.stack.split('\n').slice(0,6)};}
assert.equal(firstExpression?.code,'ERR_ASSERTION');assert.match(firstExpression.stack.join('\n'),/tax13-facts\.mjs:11/);
// An unchanged, genuinely owned immutable source row remains accepted in both.
const unchangedId=JSON.parse(get(before,'project_actual_cost_record',saved.scope.sharedFacts.sourceCostId).raw).governance_evidence_id;
let unchanged=null;
if(unchangedId){const a=get(before,'cost_governance_evidence',unchangedId),b=get(after,'cost_governance_evidence',unchangedId);assert.equal(a.sha256,b.sha256);assert.equal(a.xmin,b.xmin);old.owned('cost_governance_evidence',unchangedId);now.owned('cost_governance_evidence',unchangedId);unchanged={table:'cost_governance_evidence',id:unchangedId,sha256:a.sha256,xmin:a.xmin,bothStrictReadsPassed:true};}
for(const pin of sourcePins)assert.deepEqual(pinFile(pin.file),pin);readPin(statePin);readPin(success.before);readPin(success.after);
const report={schemaVersion:1,kind:'independent-FS-replay-of-existing-Source12-observations',finding:'IR122-01',severity:'P2',status:'confirmed-helper-post-commit-false-rejection',sourcePins,statePin,before:success.before,after:success.after,observation:saved.raceAttempt.observation,ledger:ledgerPin,actual201:{operationId:attempt.operationId,requestId:attempt.requestId,status:attempt.status,responseComplete:attempt.responseComplete,transportFailure:attempt.transportFailure,receipt:pinFile(success.receipt)},observations,firstExpression,unchanged,scope:{realNewHTTP:0,SQL:0,processReads:0,contextCreated:false,liveStateRead:false,producer:'g2-business12',TaxCorrectionExecuted:false,businessG3:false,businessG4:false},minimumRepair:['Keep rowsTax13 and every after reader strict against current latest SHA/xmin.','Use an attempt-scoped historical reader only for changed old rows: exact immutable before/after pins, supplied snapshot deep equality with readPin JSON, successful complete 201 attempt and ownership-complete ledger without blockers.','Require genuine original HTTP birth/first SHA, same database/table/PK in both snapshots, latest after SHA/xmin, exact update kind/request/operation/before SHA and snapshot pins; unchanged rows use the existing strict owned reader.','Do not edit old producer/ledger/220/221/223/195. A new helper revision/H1 and plan must be reviewed before 119 publication.']};
fs.writeFileSync(OUT+'/probe122.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,cases:observations.length,unchanged:!!unchanged,report:pinFile(OUT+'/probe122.json')}));
