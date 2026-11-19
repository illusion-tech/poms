// Metadata only, after real independent successor-publication readback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,4);assert.deepEqual([a[0],a[2]],['--publication-readback','--publication-readback-sha']);
const reviewPin=pin(a[1]);assert.equal(reviewPin.rawBytesSha256,a[3]);const review=json(reviewPin);
assert.equal(review.kind,'non-author-runtime121-corrective361-actual-FS-publication-readback');assert.equal(review.verdict,'approved-actual-exact-successor-FS-publication-readback');
for(const key of ['exactThreeTopStateDeltas','historyCompleteOldPrefixPlusOne','original823JournalPreserved','allActorsAndCounterAndAPIAndOwnershipPreserved','source13And14BooksPreserved','activeTaxSlotNull','privateSnapshotRawEqualAndInodeDistinct','all284CurrentSourceBytesReread'])assert.equal(review.checks[key],true);
assert.equal(review.limits.RootOrPrivateWritten,false);assert.equal(review.limits.NativeContextCreated,false);assert.equal(review.limits.realConstructorAcceptanceStillRequired,true);
const complete=json(review.complete);assert.equal(complete.kind,'actual-Source15-runtime121-FS-publication-complete');assert.equal(complete.statePublished,true);assert.equal(complete.SQLHTTP,false);assert.equal(complete.ordinaryContextCreated,false);
const plan=json(complete.input);assert.equal(plan.protocolVersion,2);assert.equal(plan.nonce,'337610a0-0a68-4445-862b-1b108cc47ce9');
const expectedEntryState=review.immutablePrivateEntrySnapshot;assert.equal(expectedEntryState.rawBytesSha256,'76ad68ccf87565192f6089294ede52ab77d977f423a364c9d1b1ebb5d3d3263d');assert(read(expectedEntryState).equals(read(complete.state)));
const compositionComplete=pin(C.private+'/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json');assert.equal(compositionComplete.rawBytesSha256,'9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a');
const codeReadyCarrier=pin('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-tax8-code-ready-carrier36101/review-current-Tax8-code-ready361.json');assert.equal(codeReadyCarrier.bytes,27353);assert.equal(codeReadyCarrier.rawBytesSha256,'5c9d22740f2621d867ad9c322dfcc27bac9daebe220da6c62517461536393a94');
const carrier=json(codeReadyCarrier);assert.equal(carrier.kind,'non-author-Tax15-invocation118-code-review');assert.equal(carrier.verdict,'code-ready-for-exact-input-review');assert.equal(carrier.reviewerIsAuthor,false);
const nonce=randomUUID(),directory=C.private+'/runtime121-tax-prepare-options361/'+nonce,outputDirectory=C.private+'/business/g2-business15/main01/tax121-prepare-metadata-'+nonce;
try{fs.lstatSync(outputDirectory);throw Error('Existing Tax metadata output requires reconciliation');}catch(e){if(e.code!=='ENOENT')throw e;}
directory121(directory,{exclusive:true});
const options=writeWx(directory,'options.json',{nativePublication:{complete:review.complete,expectedEntryState},compositionComplete,codeReadyCarrier,nonce,phase:'tax121_prepare36101',outputDirectory});
const preparation=writeWx(directory,'preparation.json',{kind:'Root-current361-Tax-prepare-options-prepared',recordedAt:new Date().toISOString(),publicationReadback:reviewPin,options,codeReadyCarrier,canonicalStateWritten:false,NativeOrContextCalled:false,authenticationOrSQLHTTP:false,prepareExecuted:false,actualG2Granted:false,businessG3:false,businessG4:false});
console.log(JSON.stringify({options,preparation,nonce,prepareExecuted:false,actualG2Granted:false}));
