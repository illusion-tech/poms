// Concrete options from successful source promotion and independent file readback.
// Writes only metadata; never imports Native, publishes state or controls processes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');assert.equal(process.argv.length,2);
const readback=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/corrective361-source-actual01/independent-actual-source-readback.json');
assert.equal(readback.bytes,92858);assert.equal(readback.rawBytesSha256,'2a8ffaf44b345348b07f8d6dbd6c7821881b3a0428e8c713b72ba42b81443d38');
const audit=json(readback);assert.equal(audit.kind,'independent-actual-corrective361-source-promotion-file-readback');assert.equal(audit.verdict,'actual-six-source-promotion-files-match-reviewed-request');
const actual=json(audit.complete);assert.equal(actual.kind,'actual-runtime121-corrective361-source-promotion-complete');assert.equal(actual.canonicalStateWritten,false);assert.equal(actual.modeExecuted,false);
assert.equal(actual.successor.rawBytesSha256,'099d3ade7822aa0460eb72c6ec77340d1ed553b9aea11067a1afc18b82943903');
const successor=json(actual.successor);assert.deepEqual(successor.sourceWitness,actual.sourceWitness);read(actual.sourceWitness);
assert(read(successor.retainedCurrentState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
const apiComplete=pin(C.private+'/runtime121-B/api-start/7fa5bece-bc64-4810-b6d1-8ce1af03024d/complete.json');assert.equal(apiComplete.bytes,2716);assert.equal(apiComplete.rawBytesSha256,'fac140eefbf4671e4d155023f0d9dabf852a05daa6f83fcd6f8312a12e3bd4da');
const compositionComplete=pin(C.private+'/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json');assert.equal(compositionComplete.bytes,6150);assert.equal(compositionComplete.rawBytesSha256,'9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a');
const nonce=randomUUID(),directory=C.private+'/runtime121-native-plan-options361/'+nonce,outputDirectory=C.private+'/runtime121-native-plan-data/'+nonce;
try{fs.lstatSync(outputDirectory);throw Error('Existing output requires reconciliation');}catch(e){if(e.code!=='ENOENT')throw e;}
directory121(directory,{exclusive:true});
const options=writeWx(directory,'options.json',{apiComplete,compositionComplete,nonce,outputDirectory,successor:actual.successor});
const preparation=writeWx(directory,'preparation.json',{kind:'Root-corrective361-v2-Native-plan-options-prepared',recordedAt:new Date().toISOString(),actualSourceComplete:audit.complete,actualSourceReadback:readback,options,NativeCalled:false,canonicalStateWritten:false,FSStatePublicationGranted:false,businessG3:false,businessG4:false});
console.log(JSON.stringify({options,preparation,nonce,NativeCalled:false,canonicalStateWritten:false}));
