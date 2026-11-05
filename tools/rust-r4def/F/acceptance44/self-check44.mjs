// No suite.run and no mock success callback: only import/contract/arithmetic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createFAcceptanceSuite44, describeFAcceptance44, WITNESSES } from './request-suite44.mjs';
import { OPERATIONS, SOURCE_PINS } from './contract44.mjs';
const folder=path.dirname(fileURLToPath(import.meta.url));
const runId=process.argv[2]||'static-checks44-02';assert(/^[a-z0-9-]+$/.test(runId));
const output=path.join(folder,runId+'.json');
assert(!fs.existsSync(output),'Preserve earlier static evidence');
const source=fs.readFileSync(path.join(folder,'request-suite44.mjs'),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
const check=(name,fn)=>{fn();checks.push({name,status:'passed-pure-static'});};
const cents=value=>{assert.equal(typeof value,'string');assert(/^\d{1,16}\.\d{2}$/.test(value));return BigInt(value.replace('.',''));};
check('F12-closed-canonical-method-path-operation-coverage',()=>{
  const f=Object.entries(OPERATIONS).filter(([,value])=>value.group==='F');assert.equal(f.length,12);
  for(const [operationId,definition] of f){assert(['GET','POST'].includes(definition.method));assert(source.includes("'"+operationId.split('_')[1]+"'"));assert(definition.path.startsWith('/api/'));}
});
check('all-eleven-cases-start-not-run-and-have-no-network-on-import',()=>{
  const cases=describeFAcceptance44();assert.equal(cases.length,11);assert(cases.every(c=>c.status==='not-run'&&c.requests.length===0));
  const manifest=createFAcceptanceSuite44({}).manifest();assert.equal(manifest.f12Operations.length,12);assert.equal(manifest.publicDtoOrProductChanges,false);
  assert(!/fetch\(|process\.env|readFile|pg\.Client|child_process|exec\(/.test(source));
});
check('fixed-money-witnesses-preserve-each-known-layer-and-each-project',()=>{
  for(const witness of Object.values(WITNESSES))for(const kind of ['initial','replacement'])if(witness[kind]){
    const rows=witness[kind];
    for(let layer=0;layer<3;layer++)if(witness.layers[layer]===null)assert(rows.every(row=>row[layer]===null));else assert.equal(rows.reduce((sum,row)=>sum+cents(row[layer]),0n),cents(witness.layers[layer]));
    for(const row of rows)if(row[0]!==null&&row[1]!==null)assert.equal(cents(row[0])+cents(row[1]),cents(row[2]));
  }
});
check('user-gross-primary-counterexample-and-precise-maximum-are-not-derived-from-server',()=>{
  assert.deepEqual(WITNESSES.mainPriority.initial.map(row=>row[2]),['0.06','0.06']);
  assert.deepEqual(WITNESSES.mainPriority.initial.map(row=>row[1]),['0.00','0.01']);
  assert.equal(cents(WITNESSES.maximum.layers[0]),999999999999999999n);
  assert.equal(cents(WITNESSES.maximum.initial[0][2]),500000000000000000n);
  assert.equal(cents(WITNESSES.maximum.initial[1][2]),499999999999999999n);
  assert(source.includes("C+'createPayable'"));assert(source.includes("costType:'procurement'"));
});
check('actual-F46-and-E04-source-pins-match-current-author-files',()=>{
  assert.equal(SOURCE_PINS.filter(pin=>pin.group==='F46').length,6);assert.equal(SOURCE_PINS.filter(pin=>pin.group==='E04').length,4);
  for(const pin of SOURCE_PINS)assert.equal(sha(fs.readFileSync(pin.file)),pin.rawBytesSha256,pin.file);
});
check('guards-unknown-layer-history-and-labor-inverse-scenarios-present',()=>{
  for(const token of ['lockedBySnapshotId:randomUUID()','sourceVersion:version(value.expense)+1','known.financialProjection.amountIncludingTax','protectedOwn.laborSensitiveProjection.laborAmount','measurementBasis:\'excluding-tax\'','Root-frozen-reviewed-F46-policy-required','sourceReferences:[refs[1]]'])assert(source.includes(token),token);
});
const result={kind:'F44-request-only-candidate-static-checks',capturedAt:new Date().toISOString(),nodeVersion:process.version,passed:checks.length,failed:0,checks,actualHttpRequests:0,actualDatabaseConnections:0,productionSuccessMocked:false,suiteRunInvoked:false,manifest:createFAcceptanceSuite44({}).manifest(),driverRawSha256:sha(Buffer.from(source))};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passedPureStatic:checks.length,actualHttpRequests:0,actualDatabaseConnections:0,cases:11,F12:12}));
