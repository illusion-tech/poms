import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out='tmp/rust-r4ghi/root/whole-s6-check05';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),paths=['tools/rust-r1b/shared-manifest.json','apps/poms-api-rust/src/shared/generated.rs','apps/poms-api-rust/tests/shared_generated.rs'];
const before=paths.map(file=>({file,sha256:sha(fs.readFileSync(file))})),startedAt=new Date().toISOString();
const stdout=fs.openSync(out+'/stdout.json','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let r;
try{r=spawnSync(process.execPath,['tools/rust-r1b/export-shared.mjs','--s5','--check'],{cwd:process.cwd(),env:process.env,stdio:['ignore',stdout,stderr],windowsHide:true,timeout:120000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const after=paths.map(file=>({file,sha256:sha(fs.readFileSync(file))}));assert.deepEqual(after,before);
if(r.status===0){const result=JSON.parse(fs.readFileSync(out+'/stdout.json'));assert.equal(result.sourceHead,'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a');assert.equal(result.coverage.generatedEnumFamilies,331);assert.equal(result.coverage.zEnumOccurrences,339);assert(result.sourceStable);}
const receipt={kind:'actual-archived-S6-guarded-whole-check-after-format-validation',startedAt,completedAt:new Date().toISOString(),exitCode:r.status,sourceHead:'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a',toolingCommit:'8c6e98db9cae598787da095084965c434ee1105a',before,after,
  stdout:{file:out+'/stdout.json',sha256:sha(fs.readFileSync(out+'/stdout.json'))},stderr:{file:out+'/stderr.log',sha256:sha(fs.readFileSync(out+'/stderr.log'))},productsUnchangedDuringCheck:true,productG3:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({exitCode:r.status,artifacts:3,sourceStable:true,receipt:out+'/receipt.json'}));if(r.status!==0)process.exitCode=1;
