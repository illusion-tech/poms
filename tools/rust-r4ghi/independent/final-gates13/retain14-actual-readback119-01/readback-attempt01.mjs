import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Immutable FS data only: no product imports, context, DB, HTTP, process or Git.
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const D=P+'/business/g2-business14/main01';
const PRE=P+'/retain14-119-prepared01';
const dir=D+'/retained-capture119-ab8c0d21-43a6-49c8-8898-5cb3f4800738';
const here=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const map=p=>p.startsWith('/mnt/e/')?'E:/'+p.slice(7):p.startsWith('/home/')?'//wsl.localhost/Debian'+p:p;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const key=(db,t,k)=>JSON.stringify([db,t,k]);
const cache=new Map();
let rowFiles=0, objectFiles=0;
async function raw(p){
  assert(p&&p.file&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  const host=map(p.file),st=await fs.lstat(host);
  assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1,'regular single-link data: '+p.file);
  const b=await fs.readFile(host); assert.equal(sha(b),p.rawBytesSha256,p.file);
  if(p.bytes!==undefined)assert.equal(b.length,p.bytes);
  return b;
}
const json=async p=>JSON.parse(await raw(p));
async function readRows(m){
  if(cache.has(m.file))return cache.get(m.file);
  const b=await raw(m),a=b.toString().split('\n').filter(Boolean).map(JSON.parse);
  assert.equal(a.length,m.count);assert.equal(sha(a.map(r=>r.raw).join('\n')),m.logicalRowsSha256);
  assert.equal(new Set(a.map(r=>JSON.stringify(r.key))).size,a.length);
  for(const r of a){assert.equal(sha(r.raw),r.sha256);assert(Array.isArray(r.key));assert(/^\d+$/.test(r.xmin));assert(r.cells&&typeof r.cells==='object');JSON.parse(r.raw);}
  cache.set(m.file,a);rowFiles++;return a;
}
const receiptPin={file:dir+'/retention-final-source14-M98.json',bytes:51052,rawBytesSha256:'0b09bf34fe28bff11c404bef89780c8b400419ca97f3852c9e081a8bdb6184ef'};
const inputPin={file:PRE+'/retain14-input119.json',bytes:8577,rawBytesSha256:'4532ab780caa462993b62bc823ccfa211f7312dd2a7bd0102436fc6bcccd4586'};
const commandPin={file:PRE+'/run01/command-receipt.json',rawBytesSha256:'1af4de9fe8446c25f28f220acf7fc3e4a3b56deb63e0561c293675c20176fb5a'};
const r=await json(receiptPin),input=await json(inputPin),command=await json(commandPin);
const approval=await json(r.approval),request=await json({file:PRE+'/request-retain14-G2-review119.json',bytes:8383,rawBytesSha256:'36fc4ba8aa43544d0c8ede65790f623013bc09a652a363d2d5516f42c04202d7'});
assert.deepEqual(approval,request.expectedApprovalBody);
assert.equal(command.exitCode,0);assert.equal(command.stderr.bytes,0);await raw(command.stderr);
const stdout=JSON.parse((await raw(command.stdout)).toString());assert.deepEqual(stdout.receipt,receiptPin);
assert.equal(stdout.stateMinted,false);assert.equal(stdout.Source15Admitted,false);
const dispatchBytes=await fs.readFile(map(PRE+'/run01/dispatch.json')),dispatch=JSON.parse(dispatchBytes);
assert.deepEqual(dispatch.commandArguments,request.commandArguments);assert.deepEqual(dispatch.approval,request.expectedApproval);
assert.equal(dispatch.independentExactG2.rawBytesSha256,'f64726366c99048db354039ff9819981d578731fb9853a78bb26d207094e7833');
await raw(dispatch.independentExactG2);assert.equal(dispatch.executionCountAuthorized,1);assert.equal(dispatch.expectedMode,'retain14');
assert.equal(r.kind,'actual-final-source14-M98-retention119');assert.equal(r.finalRetainedPoint,true);assert.equal(r.diagnosticOnly,false);
for(const name of ['sourcePins','helperPins','archive344','archive344Review','registry4','apiProcess','apiBinary','summaryBinary','binaryFiles','tooling'])assert.deepEqual(r[name],input[name]);
assert.equal(r.input.file,inputPin.file);assert.equal(r.input.rawBytesSha256,inputPin.rawBytesSha256);
assert.equal(r.approval.rawBytesSha256,request.expectedApproval.rawBytesSha256);
await raw(input.tooling.capture);await raw(input.tooling.manifest);await raw(input.tooling.independentCodeReview);
const state=await json(r.frozenState),ownRaw=await raw(r.frozenOwnership),ownLog=ownRaw.toString().split('\n').filter(Boolean).map(JSON.parse);
assert.equal(r.frozenState.rawBytesSha256,input.state14.rawBytesSha256);assert.equal(r.frozenState.bytes,input.state14.bytes);
assert.equal(r.frozenOwnership.rawBytesSha256,input.ownership14.rawBytesSha256);assert.equal(r.frozenOwnership.bytes,input.ownership14.bytes);
assert.equal(state.sequence,24);assert.equal(state.epoch,'g2-business14');assert.equal(ownLog.length,2);
const old13=await json(r.Main13Bridge.producerState);
assert.equal(r.Main13Bridge.producerState.rawBytesSha256,input.state13.rawBytesSha256);
assert.deepEqual(old13.baseline,state.baseline);assert.deepEqual(old13.schemaComparison108,state.schemaComparison108);
assert.deepEqual(old13.taxContinuation13,state.taxContinuation13);assert.deepEqual(old13.fixtures.hPolicyCoverage26,state.fixtures.hPolicyCoverage26);
assert.equal(state.baseline.rawBytesSha256,'f4026a1464d843d45b986f999d4dbbedbce967e941736e386512cb1103fe734d');
await raw(state.baseline);await raw(state.schemaComparison108.verificationReceipt);
const baseline=await json(state.schemaComparison108.comparisonBaseline);
const a=await json(r.stableObservations[0]),b=await json(r.stableObservations[1]);assert.deepEqual(r.retainedSnapshot,r.stableObservations[1]);
const lastLedger=await json({file:D+'/000023-ledger.json',bytes:762,rawBytesSha256:'7c60e7e4861c897b02b30a18176dcdaaf4f1f32f0ba37045a80a71be29e26b6d'});
assert(lastLedger.ownershipComplete);assert.deepEqual(lastLedger.blockers,[]);const last=await json(lastLedger.after);
async function sameData(x,y){
  assert.equal(x.schemaVersion,1);assert.equal(y.schemaVersion,1);assert.equal(x.marker,y.marker);
  assert.deepEqual(Object.keys(x.databases),Object.keys(y.databases));assert.deepEqual(x.objects,y.objects);
  const counts={};
  for(const db of Object.keys(x.databases)){
    const u=x.databases[db],v=y.databases[db];assert.deepEqual(u.meta,v.meta);assert.equal(Object.keys(u.tables).length,139);
    assert.deepEqual(Object.keys(u.tables),Object.keys(v.tables));let n=0;
    for(const t of Object.keys(u.tables)){
      const shape=m=>Object.fromEntries(Object.entries(m).filter(([k])=>k!=='file'));
      assert.deepEqual(shape(u.tables[t]),shape(v.tables[t]),db+'/'+t+' metadata');
      const ur=await readRows(u.tables[t]),vr=await readRows(v.tables[t]);assert.deepEqual(ur,vr,db+'/'+t+' raw/key/cells/SHA/xmin');n+=ur.length;
      if(t==='poms_migrations')assert.equal(ur.length,98);
    }counts[db]=n;
  }return counts;
}
const counts=await sameData(a,b);assert.deepEqual(await sameData(last,a),counts);
assert.deepEqual(counts,{poms_r4ghi_native:542,poms_r4ghi_rust:4393});
let ownedMatched=0,borrowedMatched=0,originalRows=0,baselineXminOnly=0;
const allRows=new Map();
for(const db of Object.keys(b.databases)){
  const base=baseline.databases[db],now=b.databases[db];
  assert.deepEqual(now.meta.normative,base.meta.normative);assert.deepEqual(now.meta.sequences,base.meta.sequences);
  assert.deepEqual(Object.keys(now.tables),Object.keys(base.tables));
  for(const t of Object.keys(now.tables)){
    const oldRows=await readRows(base.tables[t]),fresh=await readRows(now.tables[t]);
    const oldMap=new Map(oldRows.map(q=>[JSON.stringify(q.key),q])),freshMap=new Map(fresh.map(q=>[JSON.stringify(q.key),q]));
    for(const old of oldRows)assert(freshMap.has(JSON.stringify(old.key)),'original row deleted');
    for(const row of fresh){
      const k=key(db,t,row.key),old=oldMap.get(JSON.stringify(row.key));allRows.set(k,row);
      if(!old){
        assert.equal(db,'poms_r4ghi_rust');assert.notEqual(t,'poms_migrations');
        const own=state.owned[k];assert(own&&!own.deleted);assert.equal(own.latestSha256,row.sha256);assert.equal(own.latestXmin,row.xmin);ownedMatched++;
      }else if(old.sha256!==row.sha256){
        assert.equal(db,'poms_r4ghi_rust');assert.notEqual(t,'poms_migrations');
        const borrowed=state.borrowed[k];assert(borrowed);assert.equal(borrowed.baselineSha256,old.sha256);assert.equal(borrowed.latestSha256,row.sha256);
        const ov=JSON.parse(old.raw),nv=JSON.parse(row.raw);for(const c of new Set([...Object.keys(ov),...Object.keys(nv)]))if(JSON.stringify(ov[c])!==JSON.stringify(nv[c]))assert(borrowed.allowedColumns.includes(c),'unallowed borrowed column');borrowedMatched++;
      }else{originalRows++;if(old.xmin!==row.xmin)baselineXminOnly++;}
    }
  }
}
assert.equal(baselineXminOnly,0,'unattributed baseline xmin-only rewrite');
assert.equal(ownedMatched,Object.keys(state.owned).length);assert.equal(borrowedMatched,Object.keys(state.borrowed).length);
for(const [k,o]of Object.entries(state.owned)){assert.equal(k,key(o.database,o.table,o.key));assert.notEqual(o.table,'poms_migrations');const row=allRows.get(k);assert(row&&!o.deleted);assert.equal(o.latestSha256,row.sha256);assert.equal(o.latestXmin,row.xmin);assert(/^[a-f0-9]{64}$/.test(o.firstSha256));assert(o.proof&&o.latestProof);}
for(const [k,v]of Object.entries(old13.owned))assert.deepEqual(state.owned[k],v,'historical owned proof changed');
assert.deepEqual(old13.borrowed,state.borrowed);assert.deepEqual(old13.objects,state.objects);
const newOwn=Object.entries(state.owned).filter(([k])=>!old13.owned[k]);assert.equal(newOwn.length,1);
const [newKey,newSession]=newOwn[0];assert.equal(newSession.table,'auth_session');assert.equal(newSession.proof.requestId,r.actualHTTP14.loginRequestId);
assert.equal(newSession.proof.status,200);assert.equal(newSession.proof.operationId,'AuthController_createPasswordAuthSession');
assert(ownLog.every(v=>v.key===newKey));assert.equal(ownLog[0].rowSha256,newSession.firstSha256);assert.equal(ownLog.at(-1).rowSha256,newSession.latestSha256);
assert.deepEqual(ownLog[0].proof,newSession.proof);assert.deepEqual(ownLog.at(-1).proof,newSession.latestProof);
for(const db of Object.keys(b.objects)){
  const old=baseline.objects[db],now=b.objects[db];const oldMap=new Map(old.files.map(f=>[f.key,f]));
  for(const f of now.files){
    assert(f.file.startsWith(now.root+'/'));await raw({file:f.file,bytes:f.bytes,rawBytesSha256:f.sha256});objectFiles++;
    if(oldMap.has(f.key))assert.deepEqual(f,oldMap.get(f.key));else{assert.equal(db,'poms_r4ghi_rust');const own=state.objects[key(db,'object',[f.key])];assert(own&&!own.deleted);assert.equal(own.latestSha256,f.sha256);assert.equal(own.bytes,f.bytes);}
  }
  for(const f of old.files)assert(now.files.some(v=>v.key===f.key));for(const d of old.directories)assert(now.directories.includes(d));
}
assert.equal(objectFiles,Object.keys(state.objects).length);
assert.equal(r.Main13Bridge.producerEpoch,'g2-business13');assert.equal(r.Main13Bridge.replayForbidden,true);assert.equal(r.Main13Bridge.currentConsumerCertified,false);
assert.deepEqual(r.Main13Bridge.record,state.taxContinuation13.mainCompletion);assert.deepEqual(r.Main13Bridge.retainedThrough14,r.frozenState);
assert.equal(r.Main13Bridge.original.bytes,4524);assert.equal(r.Main13Bridge.original.rawBytesSha256,'c075de72639a418cb4c76932d6fd325e012d77e9552f55377249bf88bb0ff09c');await raw(r.Main13Bridge.original);
assert.equal(r.Main13Bridge.record.status,201);assert.equal(r.Main13Bridge.record.postconditions,'verified');
assert.equal(r.original14Sequence,24);assert.equal(r.Source13Complete,false);assert.equal(r.successfulTaxPreparation14,false);
assert.equal(r.actualHTTP14.loginPOSTStatus,200);assert.equal(r.actualHTTP14.domainPOSTs,0);assert.deepEqual(r.actualHTTP14.attempts,input.http14Attempts);
const http=[];
for(const p of input.http14Attempts){const h=await json(p);assert.equal(h.status,200);assert(h.responseComplete&&!h.transportFailure);for(const q of Object.values(h.originals))await raw(q);http.push({method:h.method,operationId:h.operationId,requestId:h.requestId});}
assert.equal(http.length,10);assert.equal(http.filter(x=>x.method==='POST').length,1);assert.equal(http.find(x=>x.method==='POST').requestId,r.actualHTTP14.loginRequestId);
const registry=await json(r.registry4);assert.deepEqual(r.resources,registry.fixtureAdmissions);
const plan=await json(registry.approvedPlan);for(const [name,other]of [['apiProcess','apiProcess'],['apiBinary','binary'],['summaryBinary','summaryBinary']]){assert.equal(r[name].file,plan.consumer[other].file);assert.equal(r[name].rawBytesSha256,plan.consumer[other].rawBytesSha256);}assert.deepEqual(r.binaryFiles,plan.consumer.binaryFiles);await raw(r.apiProcess);
assert.deepEqual(command.state13,input.state13);assert.deepEqual(command.state14,input.state14);assert.equal(command.Source15StateExists,false);assert.equal(command.driverLockRemaining,false);
for(const f of ['stateMinted','Source15Admitted','G3Certified','G4Certified'])assert.equal(r[f],false);for(const f of ['noDomainHTTP','noStateRewrite','noMigration','noBusinessBaselineReset'])assert.equal(r[f],true);
const result={kind:'independent-actual-retain14-full-FS-readback119',reviewer:'/root/r4ghi_final_gates13',receipt:receiptPin,command:commandPin,
  dispatch:{file:PRE+'/run01/dispatch.json',bytes:dispatchBytes.length,rawBytesSha256:sha(dispatchBytes)},input:inputPin,
  observations:r.stableObservations,counts,totalRows:4935,twoObservationsRawKeyCellsSHAXminMetaSequencesObjectsEqual:true,
  unchangedFromLastCompleted341After:lastLedger.after,fullRowFilesRead:rowFiles,
  fullOwnership:{ownedMatched,borrowedMatched,originalRows,baselineXminOnly,old13OwnedWholeProofsUnchanged:true,onlyNew14OwnedRow:'one actual login200 auth_session',complete14OwnershipLogLines:ownLog.length,objectFilesMatched:objectFiles},
  frozenState:r.frozenState,frozenOwnership:r.frozenOwnership,originalM97Baseline:state.baseline,canonicalM98Comparison:state.schemaComparison108,
  Main13Original:r.Main13Bridge.original,Main13Once201RetainedNotReplayed:true,source13PartialAndTax14FailedLabelsPreserved:true,
  originalCommandExit:0,originalStdoutBytes:command.stdout.bytes,originalStderrBytes:0,
  actualPipelineEvidence:true,typedOriginal339TupleReused:true,oldBigBinariesRehashed:false,
  currentMutableStateRead:false,currentGuardOr252Invoked:false,SQLHTTP:false,processQueryOrSignal:false,
  source15StateAbsenceIsActualCommandBookendEvidenceNotReviewerLiveObservation:true,
  crossDatabaseAtomicity:false,Source15Admission:false,G3:false,G4:false};
await fs.writeFile(path.join(here,'verification-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verdict:'pass-full-fixed-retain14-readback',counts,ownedMatched,borrowedMatched,objectFiles,rowFiles,result:path.join(here,'verification-result.json')}));
