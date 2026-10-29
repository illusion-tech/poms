// Pure tests of the comparator against deliberately corrupted copies of a
// complete actual observation. No service, ORM instance or database executes.
import assert from'node:assert/strict';import fs from'node:fs';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,35}$/.test(tag??''));const input=`tmp/rust-r2l1/common-acceptance-${tag}.json`,raw=fs.readFileSync(input),source=JSON.parse(raw),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(source.result,'observed');
const output=`tmp/rust-r2l1/common-diff-negative-${tag}.json`;assert(!fs.existsSync(output));const report={formatVersion:1,kind:'pure-comparator-negative-tests',actualServiceOrmPgExecuted:false,actualInput:{path:input,rawBytesSha256:hash(raw)},result:'pending',cases:[]};
try{
 for(const mode of ['stale-updated-at','return-pg-mismatch']){
  const copy=structuredClone(source),c=copy.backends.rust.cases.find(c=>c.input.caseId==='confirmation-two-participants');assert(c);
  copy.kind='synthetic-comparator-negative-input';copy.syntheticNegative={mode,actualPgClaim:false,baseInput:input,baseRawBytesSha256:hash(raw)};
  if(mode==='stale-updated-at'){const id=c.input.steps[0].input.id,old=c.before.confirmation_record.find(r=>r.id===id),row=c.after.confirmation_record.find(r=>r.id===id);assert(old&&row&&old.updated_at!==row.updated_at);row.updated_at=old.updated_at;}
  else{const step=c.observation.steps.find(s=>s.op==='confirmation.progress'&&s.value?.status==='confirmed');assert(step);step.value.confirmedAt=new Date(Date.parse(step.value.confirmedAt)+1).toISOString();}
  const negativeTag='negative-'+mode,path=`tmp/rust-r2l1/common-acceptance-${negativeTag}.json`;assert(!fs.existsSync(path));fs.writeFileSync(path,JSON.stringify(copy,null,2)+'\n',{flag:'wx'});
  const child=spawnSync(process.execPath,['tools/rust-r2l1/common-diff.mjs',negativeTag,tag],{encoding:'utf8',timeout:30000});assert.equal(child.status,1,'The synthetic wrong value must be rejected');
  const resultPath=`tmp/rust-r2l1/common-diff-${negativeTag}-${tag}.json`,result=JSON.parse(fs.readFileSync(resultPath));assert.equal(result.result,'fail');assert(result.failure,'Freshness/link proof must reject before normalizing the bad clock value');assert.match(result.failure.message,mode==='stale-updated-at'?/did not refresh in actual write step/:/must match actual PG Date milliseconds/);
  report.cases.push({mode,syntheticInput:path,syntheticInputRawBytesSha256:hash(fs.readFileSync(path)),rejection:resultPath,rejectionRawBytesSha256:hash(fs.readFileSync(resultPath)),expectedFailure:result.failure,result:'pass'});
 }
 report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:report.result,cases:report.cases.length,failure:report.failure??null,output}));
