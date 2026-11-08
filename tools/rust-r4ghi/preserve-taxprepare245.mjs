// Immutable FS-only diagnostic input after the failed prepare; no retry/effects.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',O=D+'/taxprepare-failure245',sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');assert(!fs.existsSync(D+'/driver.lock'));assert(!fs.existsSync(O));
const raw=fs.readFileSync(D+'/state.json'),state=JSON.parse(raw);assert(!state.activeFault&&!state.blockedObservation);assert.equal(state.taxContinuation13.mainCompletion.postconditions,'verified');assert(!state.taxContinuation13.taxPreparation&&!state.taxContinuation13.sweep&&!state.taxContinuation13.normalTaxPending);
fs.mkdirSync(O,{mode:0o700});const file=O+'/state-after-prepare-failure245.json';fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});const pin=f=>({file:f,rawBytesSha256:sha(fs.readFileSync(f))});
const result={kind:'actual-FS-retained-post-Tax-preparation-failure245',state:pin(file),failedPreparation:pin(D+'/000055-tax242-prepare-tax-partial.json'),command:pin(P+'/tax242-prepare-tax/command242.json'),
 MainGActual201Verified:true,TaxCorrectionCommitted:false,FIStarted:false,ordinaryStateUnchangedByThisRetention:true,SQLOrHTTP:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(O+'/receipt245.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});assert.deepEqual(fs.readFileSync(D+'/state.json'),raw);console.log(JSON.stringify({retention:pin(O+'/receipt245.json'),immutableState:pin(file),mainVerified:true,TaxCommitted:false,FIStarted:false}));
