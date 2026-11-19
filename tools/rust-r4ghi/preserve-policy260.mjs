// Preserve the exact stopped H46 state before any reconciliation or new epoch.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',O=D+'/policy247-failure260',sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');assert(!fs.existsSync(D+'/driver.lock'));assert(!fs.existsSync(O));
const stateRaw=fs.readFileSync(D+'/state.json'),state=JSON.parse(stateRaw),stage=state.fixtures.hPolicyCoverage26.stages['fresh-G-H-below'];assert.equal(stage.phase,'stopped-reconcile-originals-no-replay');
const commandFile=P+'/policy247-actual/command247.json',commandRaw=fs.readFileSync(commandFile);assert.equal(sha(commandRaw),'8f0c6e4583349c1cd4daa5b56c1f26cd795904bf554cc97d0adfa8d4061b61f9');assert.equal(JSON.parse(commandRaw).exitCode,1);
fs.mkdirSync(O,{mode:0o700});const copy=O+'/state-after-policy-stop260.json';fs.writeFileSync(copy,stateRaw,{flag:'wx',mode:0o600});
const failureRaw=fs.readFileSync(stage.failure.file);assert.equal(sha(failureRaw),stage.failure.rawBytesSha256);const failure=JSON.parse(failureRaw);
const receipt={kind:'Root-preserved-actual-Source13-H46-below-stop260',state:{file:copy,rawBytesSha256:sha(stateRaw)},driverCommand:{file:commandFile,rawBytesSha256:sha(commandRaw)},stoppedStage:stage,failure:f=>f,belowReceiptVerified:state.fixtures.hPolicyCoverage26.stages['actual-receipt-below'].phase==='verified',blockedObservationPreserved:!!state.blockedObservation,activeFault:!!state.activeFault,driverExited:true,blindReplay:false,Source14Started:false,G3:false,G4:false};delete receipt.failure;
const file=O+'/receipt260.json';fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});assert.deepEqual(fs.readFileSync(D+'/state.json'),stateRaw);
const values=[];const collect=v=>{if(typeof v==='string'&&v.length>=8)values.push(v);else if(v&&typeof v==='object')for(const c of Object.values(v))collect(c);};collect(state.actors);
for(const f of ['owner-password','jwt-secret','native-app-password','rust-app-password'])values.push(fs.readFileSync(P+'/'+f,'utf8').trim());
let message=String(failure.message??'');for(const value of values.filter(Boolean).sort((a,b)=>b.length-a.length))message=message.split(value).join('<redacted>');
message=message.replace(/("(?:password_hash|passwordHash|password|authorization|poms_session|poms_csrf)"\s*:\s*")[^"]*(")/gi,'$1<redacted>$2').replace(/\$(?:argon2|2[aby])[^\s"',]*/g,'<redacted-hash>');
console.log(JSON.stringify({receipt:{file,rawBytesSha256:sha(fs.readFileSync(file))},state:receipt.state,errorName:failure.name,errorMessagePreview:message.slice(0,2400),errorMessageBytes:String(failure.message??'').length,blockedKeys:Object.keys(state.blockedObservation??{}),sequence:state.sequence,belowReceiptVerified:receipt.belowReceiptVerified,noReplay:true}));
