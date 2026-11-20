// Metadata only, after actual independent source readback. Never imports Native.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,4);assert.equal(a[0],'--source-readback');assert.equal(a[2],'--source-readback-sha');
const readback=pin(a[1]);assert.equal(readback.rawBytesSha256,a[3]);const facts=json(readback);assert.equal(facts.kind,'runtime121-corrective362-readonly-source-readback-facts');
for(const key of ['allFinal284RawRead','eightStepsAndBeforeCopiesVerified','wholeGuardHashesUnchanged','originalOwnershipPrefixVerified','originalM06AndSource361RawPinsPreserved','requiredAbsentEntriesVerified'])assert.equal(facts[key],true);
assert.equal(facts.privateStateOrOwnershipOrAuthOrEnvValuesParsedOrEmitted,false);assert.equal(facts.productionMOD,6);assert.equal(facts.outside284DataMOD,2);assert.equal(facts.unchangedExecutionMembers,278);
assert.equal(facts.complete.bytes,4847);assert.equal(facts.complete.rawBytesSha256,'91c58b430bce5450201d9a6bada096b6a5eef121e20f389a824068ada03005e9');
const actual=json(facts.complete);assert.equal(actual.kind,'actual-runtime121-corrective362-source-promotion-complete');assert.equal(actual.canonicalStateWritten,false);assert.equal(actual.modeExecuted,false);assert.deepEqual(actual.sourceWitness,facts.sourceWitness);assert.deepEqual(actual.successor,facts.successor);
const successor=json(actual.successor),witness=json(actual.sourceWitness);assert.equal(successor.schemaVersion,2);assert.equal(witness.kind,'Root-runtime121-three-stage-client-source-witness');assert.equal(witness.schemaVersion,2);assert.deepEqual(successor.sourceWitness,actual.sourceWitness);
assert(read(successor.retainedCurrentState).equals(fs.readFileSync(C.private+'/business/g2-business15/main01/state.json')));
const apiComplete=pin(C.private+'/runtime121-B/api-start/7fa5bece-bc64-4810-b6d1-8ce1af03024d/complete.json');assert.equal(apiComplete.bytes,2716);assert.equal(apiComplete.rawBytesSha256,'fac140eefbf4671e4d155023f0d9dabf852a05daa6f83fcd6f8312a12e3bd4da');
const compositionComplete=witness.baselineCompositionComplete;assert.deepEqual(compositionComplete,successor.predecessorPublication);assert.equal(compositionComplete.bytes,1522);assert.equal(compositionComplete.rawBytesSha256,'bd7d2a242ed2d2ca15d329a8ba1f9a59efcba004fa5532d43497a4047e8e5811');read(compositionComplete);
const nonce=randomUUID(),directory=C.private+'/runtime121-native-plan-options362/'+nonce,outputDirectory=C.private+'/runtime121-native-plan-data/'+nonce;
try{fs.lstatSync(outputDirectory);throw Error('Existing output requires reconciliation');}catch(e){if(e.code!=='ENOENT')throw e;}directory121(directory,{exclusive:true});
const options=writeWx(directory,'options.json',{apiComplete,compositionComplete,nonce,outputDirectory,successor:actual.successor});
const preparation=writeWx(directory,'preparation.json',{kind:'Root-corrective362-v3-Native-plan-options-prepared',recordedAt:new Date().toISOString(),actualSourceComplete:facts.complete,actualSourceReadback:readback,options,NativeCalled:false,canonicalStateWritten:false,FSStatePublicationGranted:false,businessG3:false,businessG4:false});
console.log(JSON.stringify({options,preparation,nonce,NativeCalled:false,canonicalStateWritten:false}));
