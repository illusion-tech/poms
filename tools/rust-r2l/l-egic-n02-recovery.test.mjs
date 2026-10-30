// Public actual report plus synthetic in-memory negatives only. No private
// journal/environment/PG/HTTP is read or opened by these assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertEgicRecoverySelection,selectOriginalEgicSdkPair,egicRecoverySelection,assertOriginalPgEventExport,runEgicRecoveryEntrypoint} from './l-egic-n02-recovery.mjs';
const file=['tmp/rust-r2l/egic-n02-public-input.json',egicRecoverySelection.report].find(fs.existsSync);assert(file,'Root public egic-n02 report is required');
const bytes=fs.readFileSync(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),egicRecoverySelection.reportSha256);const original=JSON.parse(bytes);
function reject(change){const value=structuredClone(original);change(value);assert.throws(()=>selectOriginalEgicSdkPair(value));}
test('fixed CLI rejects every other report hash or run before private/DB access',()=>{assertEgicRecoverySelection(egicRecoverySelection.reportSha256,egicRecoverySelection.runId);assert.throws(()=>assertEgicRecoverySelection('0'.repeat(64),egicRecoverySelection.runId));assert.throws(()=>assertEgicRecoverySelection(egicRecoverySelection.reportSha256,'other'));});
test('actual saved public partial contains exactly the source SDK pair and a shared-race winner binding',()=>{const r=selectOriginalEgicSdkPair(original);assert.equal(r.sdk.length,2);assert.equal(r.sdk[0].proof.outerTransaction,'tx41');assert.equal(r.batch.bindings[0].index,91);assert(r.sdk.every(x=>x.proof.createContext.index===92));assert.equal(original.result,'partial');});
test('incomplete global SDK/PG observation refuses recovery',()=>reject(r=>{r.nativeFinal.witness.complete=false;r.nativeFinal.pgCaptureComplete=false;}));
test('an active transaction or pending start refuses recovery',()=>reject(r=>{r.nativeFinal.witness.openTransactions.push({id:'synthetic'});r.nativeFinal.witness.pendingStartCount=1;}));
test('missing writer closeout refuses recovery',()=>reject(r=>{r.resourceCloseout=r.resourceCloseout.filter(x=>x.name!=='native-owner-close');}));
test('failed writer closeout refuses recovery',()=>reject(r=>{r.resourceCloseout.find(x=>x.name==='native-owner-close').result='fail';}));
test('extra SDK source birth cannot be inferred or silently adopted',()=>reject(r=>{const pair=selectOriginalEgicSdkPair(r);r.nativeFinal.witness.committed.push(structuredClone(pair.sdk[0]));}));
test('SDK pair from two outer commits is rejected',()=>reject(r=>{const pair=selectOriginalEgicSdkPair(r);pair.sdk[1].proof.outerTransaction='synthetic-other';}));
test('SDK context cannot be moved onto the losing caller',()=>reject(r=>{const pair=selectOriginalEgicSdkPair(r),proof=pair.sdk[0].proof;proof.createContext.index=91;proof.commitContext.index=91;}));
test('SDK outer commit context cannot be changed',()=>reject(r=>{selectOriginalEgicSdkPair(r).sdk[0].proof.commitContext.caseId='other';}));
test('a rewritten successful report cannot replace the actual Partial',()=>reject(r=>{r.result='observed';}));
test('a different race response/status cannot use this recovery',()=>reject(r=>{r.requests.find(q=>q.name==='edge.initial-current-race.request-0').response.status=200;}));
test('an existing initial snapshot cannot enter this dedicated absence scope',()=>reject(r=>{r.captureBatches[0].before.commission_final_settlement_snapshot.push({id:'synthetic'});}));
test('a report already claiming cleanup cannot be reused',()=>reject(r=>{r.cleanup=[{deleted:1}];}));
const event={event_id:'synthetic-event',source_table:'commission_final_settlement_snapshot',identity_snapshot:{id:'synthetic-id'},top_xid:'100',event_xmin:'100',top_status:'committed'};
test('original drain and restore full event shapes both include committed top_status',()=>assertOriginalPgEventExport(event,structuredClone(event)));
test('dropping top_status from either side is rejected',()=>{const missing={...event};delete missing.top_status;assert.throws(()=>assertOriginalPgEventExport(event,missing));assert.throws(()=>assertOriginalPgEventExport(missing,event));});
test('both missing top_status still fail the independent committed checks',()=>{const missing={...event};delete missing.top_status;assert.throws(()=>assertOriginalPgEventExport(missing,structuredClone(missing)));});
test('equal noncommitted event objects cannot certify a commit',()=>assert.throws(()=>assertOriginalPgEventExport({...event,top_status:'aborted'},{...event,top_status:'aborted'})));
test('an extra original export field is not projected away',()=>assert.throws(()=>assertOriginalPgEventExport(event,{...event,extra:'changed'})));
test('changed original identity/xid fields cannot be normalized',()=>{assert.throws(()=>assertOriginalPgEventExport(event,{...event,event_xmin:'101'}));assert.throws(()=>assertOriginalPgEventExport(event,{...event,identity_snapshot:{id:'other'}}));});
test('early private assertion objects go only to the failure persister',async()=>{
    const old=process.exitCode,spoken=[];let captured;
    const error=new assert.AssertionError({actual:{privateValue:'synthetic-private-event'},expected:{privateValue:'different'},operator:'deepStrictEqual'});
    try{const result=await runEgicRecoveryEntrypoint('unused','unused',{recover:async(_sha,_run,execution)=>{execution.phase='saved-private-evidence-validation';throw error;},persistFailure:async(value,execution)=>{captured={value,execution};return{result:'failed-before-business-DML',phase:execution.phase,privateDiagnostic:{sha256:'0'.repeat(64),contentsExported:false}};},say:value=>spoken.push(value)});
        assert.equal(captured.value,error);assert.equal(captured.execution.businessDMLAttempted,false);assert.equal(result.result,'failed-before-business-DML');assert(!JSON.stringify(spoken).includes('synthetic-private-event'));
    }finally{process.exitCode=old;}
});
test('a persister failure still cannot print the original private Error',async()=>{
    const old=process.exitCode,spoken=[];try{const result=await runEgicRecoveryEntrypoint('unused','unused',{recover:async()=>{throw new Error('synthetic-private-error');},persistFailure:async()=>{throw new Error('synthetic-private-persistence-error');},say:value=>spoken.push(value)});assert.equal(result.result,'failure-diagnostic-persistence-unavailable');assert(!JSON.stringify(spoken).includes('synthetic-private'));}finally{process.exitCode=old;}
});
