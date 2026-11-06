import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root=win+'/tmp/rust-r4ghi/root';
const priv='/home/wangzishi/.local/share/poms-r4ghi/private/userfix/userfix115/run01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,rawBytesSha256:sha(b)};};
const read=file=>JSON.parse(fs.readFileSync(file));
const checks={};let expected=null;
for(const name of ['rust-fmt01','rust-clippy02','rust-test01','rust-build01']){
 const file=root+'/'+name+'/receipt.json',value=read(file);assert.equal(value.exitCode,0);assert.equal(value.sourceStable,true);
 const inputs=new Map(value.inputs.map(p=>[p.file,p.rawBytesSha256]));
 if(expected){assert.equal(inputs.size,expected.size);for(const [p,h] of inputs)assert.equal(h,expected.get(p));}else expected=inputs;
 for(const [p,h] of inputs)assert.equal(sha(fs.readFileSync(win+'/'+p)),h);
 checks[name]={receipt:pin(file),inputsVerified:inputs.size};
}
const results=[...fs.readFileSync(root+'/rust-test01/stdout.log','utf8').matchAll(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored;/g)];
const testTotals={groups:results.length,passed:results.reduce((n,m)=>n+Number(m[1]),0),failed:results.reduce((n,m)=>n+Number(m[2]),0),ignored:results.reduce((n,m)=>n+Number(m[3]),0)};assert.equal(testTotals.passed,416);assert.equal(testTotals.ignored,54);assert.equal(testTotals.failed,0);
const state=read(priv+'/state.json');assert.equal(state.cleaned,true);assert.equal(state.cleanedByPlanSha256,'69c50b931b2dd3f0a3f959b7e186710087356d52653cc476bdfc41e82bc6a3ee');
const acceptance={};for(const key of ['smoke','faults','pending','races']){assert(state.stages[key]);acceptance[key]=state.stages[key];}
assert.equal(acceptance.smoke.result.passed,19);assert.equal(acceptance.faults.result.passed,9);assert.equal(acceptance.pending.result.passed,2);assert.equal(acceptance.races.result.passed,4);
const cleanup=read(priv+'/00130-cleanup-apply01-complete.json');assert.equal(cleanup.deleteCount,121);assert.equal(cleanup.restoreCount,0);assert.equal(cleanup.noop.freshConnectionRounds,2);assert.equal(cleanup.noop.byteExactRowsAndLogicalCatalogAndSequences,true);
const apiStop=read(root+'/userfix-stop01.json'),pgStop=read(root+'/environment01/stopped01.json');assert(apiStop.processGone&&apiStop.portFree&&pgStop.stopped);assert.equal(pgStop.container,'poms-r4ghi-pg15');
const objectRoots={};for(const backend of ['native','rust']){const folder='/home/wangzishi/.local/share/poms-r4ghi/objects/'+backend;assert.deepEqual(fs.readdirSync(folder),[]);objectRoots[backend]={files:0,rootRetained:true};}
const products=['apps/poms-api-rust/src/users/service.rs','apps/poms-api-rust/src/users/store.rs','apps/poms-api-rust/tests/users_database.rs'].map(p=>({...pin(win+'/'+p),file:p}));
const value={kind:'actual-user-create-fix-validation-and-terminal-checkpoint',capturedAt:new Date().toISOString(),issue:115,inputCommit:'21e9124160f92dce38a5029786273fdb893759f0',productFiles:products,checks,testTotals,acceptance,necessaryWriteFI:11,cleanRetries:11,rawAuthenticationTouch:'Independent prior auth touch may commit; all user/relationship/create-audit/managed session command writes rollback together',contractComparison:pin(root+'/contract01/receipt.json'),UI:{result:'N/A',reason:'Only Rust command/store and guarded test change; no frontend/TS DTO/route/client delta. Existing runtime OpenAPI exports byte-identical, actual getUser verifies id/primary org/roleNames/orgUnits. No browser pass is claimed.'},cleanup:{original:pin(priv+'/00130-cleanup-apply01-complete.json'),planSHA256:state.cleanedByPlanSha256,exactDeletedRows:121,originalRowsRewritten:0,tablesPerDatabase:120,originalRowsPerDatabase:532,freshConnectionNoopRounds:2,byteExactRowsAndLogicalCatalogAndSequences:true},apiStop:pin(root+'/userfix-stop01.json'),pgStop:pin(root+'/environment01/stopped01.json'),objectRoots,retainedFailures:[{phase:'initial baseline',classification:'tool-noise',reason:'Postgres name[] needed text[] parser; read-only partial retained'},{phase:'smoke01',classification:'tool-noise',reason:'Tool expected 200 for existing CREATED 201; original role receipt and exact reconciliation retained'},{phase:'clippy01',classification:'tool-noise',reason:'New mirror lacked include assets; original failure retained, final four checks bind same343 complete inputs'}],existingBaselineDrift:[{scope:'OpenAPI declaration of three platform creates',declaredStatus:200,actualExistingAndCurrentStatus:201,changedByThisFix:false,sourceWitness:'userfix/status.mjs and actual HTTP; Rust remains semantically CREATED'}],G3Certified:false,G4Certified:false,readyForIndependentG3:true,officialNewRustOperations:0,fullR4Complete:false};
fs.mkdirSync(win+'/docs/design/rust-r4ghi/user-fix',{recursive:true});
fs.writeFileSync(win+'/docs/design/rust-r4ghi/user-fix/validation01.json',JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({issue:115,tests:testTotals,actualSmoke:19,FI:11,referenceRaces:4,cleanupDeleted:121,originalRowsRewritten:0,readyForIndependentG3:true,G3Certified:false}));
