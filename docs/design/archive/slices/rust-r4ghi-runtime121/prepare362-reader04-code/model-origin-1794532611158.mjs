// Complete frozen data-only factory relations. No ctx/brand/Native import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const ORIGIN18=['kind','protocolVersion','prepared15','fullInventory','bodySHA256','originalRecord','originalRuntime','originalEntryAndExit','originalInput','originalReview','sourceArchive','failedAttemptDisposition','PGConservation','runtimeAdmission121','retainedPreparationOnly','currentEffectsGranted','serverTargetsRefreshed','bodyRefreshed'];

export function validateRetainedPreparationOrigin362({recordOrigin,observedOrigin,runtimeOrigin,before,after,registry,registryPin},io){
 const eq=(a,b,label)=>assert.deepEqual(a,b,label),keys=(v,n)=>{assert(v&&Object.getPrototypeOf(v)===Object.prototype);eq(Object.keys(v).sort(),[...n].sort(),'Closed retained-origin data');};
 const pin121=p=>{assert(p&&typeof p.file==='string'&&p.file.startsWith('/')&&typeof p.rawBytesSha256==='string'&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(p.bytes!==undefined)assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);return p;};
 const samePin121=(a,b)=>{pin121(a);pin121(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);},same=(a,b)=>a?.file===b?.file&&a?.rawBytesSha256===b?.rawBytesSha256;
 const sha121=b=>createHash('sha256').update(b).digest('hex'),read121=p=>io.raw(pin121(p)),json121=p=>JSON.parse(read121(p)),C121={epoch:'g2-business15',run:'main01',failedNonce:'7f75088b-9f3d-4dbf-93f9-288ea96c8258'};
 const independent121=(r,kind,verdict)=>{assert.equal(r.kind,kind);assert.equal(r.verdict,verdict);assert.equal(r.reviewerIsAuthor,false);if(r.author!==undefined&&r.reviewer!==undefined)assert.notEqual(r.author,r.reviewer);};
 keys(recordOrigin,ORIGIN18);keys(observedOrigin,ORIGIN18);keys(runtimeOrigin,['prepared15','fullInventory','bodySHA256']);assert.equal(recordOrigin.kind,'verified-retained-tax15-preparation-origin121');assert.equal(recordOrigin.protocolVersion,1);assert.equal(recordOrigin.retainedPreparationOnly,true);for(const k of ['currentEffectsGranted','serverTargetsRefreshed','bodyRefreshed'])assert.equal(recordOrigin[k],false);
 const base=registry.retained;assert(base);eq(after.taxContinuation15,before.taxContinuation15,'Original retained preparation record stays immutable');eq(after.consumerChecks?.tax15Invocation118,before.consumerChecks?.tax15Invocation118,'Complete original prepare/failure journal container stays immutable');
 const a=json121(base.sourceArchive121),b=json121(base.sourceArchiveSupplement121);assert.equal(a.kind,'Root-private-original-Source15-source-archive121');assert.equal(b.kind,'Root-private-original-Source15-source-archive-supplement121');samePin121(b.baseArchive,base.sourceArchive121);samePin121(a.originalReg5,base.codeAdmission15);samePin121(a.originalPlan,base.approvedCodePlan15);samePin121(a.originalH3Pins,base.helperPins227);assert.equal(a.uniqueSourceCount,266);assert.equal(a.mappings.length,266);assert.equal(b.sourceCount,4);assert.equal(b.mappings.length,4);assert.equal(b.combinedUniqueSourceCount,270);for(const k of ['originalPinsAndPathsUnmodified','currentSourcesNotPromoted'])assert.equal(a[k],true);for(const k of ['oldSourceExecutionGranted','nativeAuthorityGranted'])assert.equal(a[k],false);assert.equal(b.originalsUnmodified,true);assert.equal(b.baseArchiveUnmodified,true);assert.equal(b.oldSourceExecutionGranted,false);
 const index=new Map();for(const m of [...a.mappings,...b.mappings]){pin121(m.originalPin);pin121(m.privateRawCopy);assert(!index.has(m.originalPin.file));assert.notEqual(m.originalPin.file,m.privateRawCopy.file);assert.equal(m.originalPin.rawBytesSha256,m.privateRawCopy.rawBytesSha256);if(m.originalPin.bytes!==undefined&&m.privateRawCopy.bytes!==undefined)assert.equal(m.originalPin.bytes,m.privateRawCopy.bytes);index.set(m.originalPin.file,m);}assert.equal(index.size,270);const archive={index};
function historicalSource121(archive,pin) {
  pin121(pin);const found=archive.index.get(pin.file);assert(found,'No historical-source fallback');
  samePin121(found.originalPin,pin);
  // Reread immutable copy, never import or evaluate it.
  return read121(found.privateRawCopy);
}

function failedOrigin121(base,state,archive) {
  assert.equal(base.failedInvocationReview.rawBytesSha256,
    '45b6cae5e0532130e5a9b1893766d710a20c6763c89e1ae49dffcc10e41b5e57');
  const review=json121(base.failedInvocationReview);
  independent121(review,'non-author-actual-Tax15-fi118-failure-readback',
    'NOT_READY-runtime-identity-lost-before-FI');
  assert.equal(review.nonce,C121.failedNonce);assert.equal(review.phase,'failed-preserve');
  samePin121(review.failedState,base.retainedState15);samePin121(review.ownershipLog,base.ownership15);
  samePin121(review.partial,base.failedInvocation);
  samePin121(review.identityEvidence.RootRuntimeObservation353,base.runtimeLossObservation);
  for(const key of ['input','actualRootApproval','consumedExactG2','outer','stderr','intent',
    'partial','failedBookend','preservationMapping'])read121(review[key]);
  const failed=state.consumerChecks?.tax15Invocation118?.invocations?.[C121.failedNonce];
  assert(failed);assert.equal(failed.phase,'failed-preserve');
  assert.equal(failed.mode,'fi-closed-set');assert.equal(failed.entryGuard,null);
  assert.deepEqual(failed.families,[]);assert.deepEqual(failed.httpAttempts,[]);
  samePin121(failed.input,review.input);samePin121(failed.exactReview,review.actualRootApproval);
  for(const key of ['exitGuard','closedJournal','completion','sidecar'])
    assert(!failed[key], 'Failed preserve must not be relabeled successful');
  const partial=json121(base.failedInvocation),outer=json121(review.outer),intent=json121(review.intent);
  assert.equal(partial.kind,'partial-Tax15-invocation118-preserve');
  assert.equal(partial.mode,'fi-closed-set');samePin121(partial.input,review.input);
  samePin121(partial.review,review.actualRootApproval);
  assert.equal(partial.result,null);assert.equal(partial.closed,null);
  assert.equal(partial.blindRetryForbidden,true);assert.equal(outer.exitCode,1);
  assert.equal(outer.normalTaxPOSTGranted,false);assert.equal(outer.blindRetryForbidden,true);
  assert.equal(intent.nonce,C121.failedNonce);samePin121(intent.input,review.input);
  const entry=review.entryBoundary,exit=review.exitBoundary,reach=review.businessReachability;
  assert.equal(entry.actualConstructorReturned,true);assert.equal(entry.privateCapabilityAllocated,true);
  for(const key of ['capabilityReturned','actualEntryGuardGenerated','createWireReached','loginReached','runFIReached'])
    assert.equal(entry[key],false);
  for(const key of ['wholeExitVerificationCompleted','actualExitGuardGenerated',
    'actualClosedJournalGenerated','actualCompleteGenerated'])assert.equal(exit[key],false);
  for(const key of ['newCanonicalHTTP','newAuthenticationCalls','actualFITrials',
    'controlsInstalledByThisCaller','normalTaxOrMainOrClassificationCommands'])assert.equal(reach[key],0);
  for(const key of ['sweepInitialized','pendingTrial','ACK','activeFault'])assert.equal(reach[key],false);
  assert.equal(reach.noCallerOwnedDBClientPathReachedBeforeGuardFailure,true);
  assert.equal(review.metadataReadback.actorsOwnedBorrowedTaxAndAllOtherStateExactEntry,true);
  assert.equal(review.newExecutionAuthorization,false);
  const map=json121(review.preservationMapping);
  assert.equal(map.originalsUnmodified,true);assert.equal(map.failedJournalNotCleared,true);
  assert(map.mappings.some(x=>same(x.privateRetainedCopy,base.retainedState15)));
  assert(map.mappings.some(x=>same(x.privateRetainedCopy,base.ownership15)));
  for(const entry of review.sourceCausality)historicalSource121(archive,entry.file);
  return {review:base.failedInvocationReview,partial:base.failedInvocation,input:review.input,
    intent:review.intent,outer:review.outer,failedBookend:review.failedBookend,
    phase:'failed-preserve',newHTTP:0,newFI:0,controls:0,currentEffectsGranted:false};
}

function preparationOrigin121(base,state,archive,code) {
  const record=state.taxContinuation15;
  assert(record&&record.taxPreparation&&!record.complete&&!record.sidecar&&!record.sweep);
  const saved=record.taxPreparation,prepared=json121(base.prepared15),inventory=json121(base.fullInventory);
  samePin121(saved.artifact,base.prepared15);samePin121(saved.fullInventory,base.fullInventory);
  assert.equal(saved.postconditions,'prepared-for-Root-review-only');
  assert.equal(saved.bodySHA256,base.bodySHA256);
  assert.equal(sha121(JSON.stringify(saved.body)),base.bodySHA256);
  assert.deepEqual(inventory,saved.inventory);assert.equal(inventory.length,67);
  for(const key of ['body','packets','fullPacket','facts','inventory','fullInventory'])
    assert.deepEqual(prepared[key],saved[key]);
  samePin121(prepared.before,base.preparedBaseline);
  const journal=state.consumerChecks?.tax15Invocation118;assert(journal);
  const matches=Object.values(journal.invocations).filter(x=>x.mode==='prepare-only'&&
    x.phase==='closed-verified'&&same(x.result,base.prepared15));
  assert.equal(matches.length,1);const original=matches[0];
  assert.deepEqual(original.families,[]);assert.equal(original.httpAttempts.length,7);
  const entry=json121(original.entryGuard),exit=json121(original.exitGuard),closed=json121(original.closedJournal);
  assert.equal(entry.kind,'actual-native15-tax118-entry');assert.equal(entry.phase,'entry-verified');
  assert.equal(exit.kind,'actual-native15-tax118-exit');assert.equal(exit.phase,'exit-verified');
  assert.equal(exit.failed,false);assert.equal(exit.activeControlsRetained,false);
  for(const value of [entry,exit,closed]) {
    assert.equal(value.nonce,original.nonce);samePin121(value.input,original.input);
    assert.equal(value.epoch,C121.epoch);assert.equal(value.run,C121.run);
  }
  samePin121(exit.result,base.prepared15);samePin121(exit.entryGuard,original.entryGuard);
  const {closedJournal:ignored,...journalOriginal}=original;
  assert.deepEqual(closed,journalOriginal);assert.equal(closed.phase,'closed-verified');
  samePin121(original.current15.codeAdmission15,base.codeAdmission15);
  samePin121(original.current15.candidate,base.codeCandidate15);
  samePin121(original.current15.apiProcess,code.plan.consumer.apiProcess);
  samePin121(original.current15.helperPins,base.helperPins227);
  const input=json121(original.input),approval=json121(original.exactReview);
  assert.equal(input.mode,'prepare-only');assert.equal(input.prepared15,null);
  samePin121(approval.approvedInput,original.input);
  assert.equal(approval.normalTaxPOSTGranted,false);assert.equal(approval.FIGranted,false);
  for(const pin of [...original.executionSources,...original.prepareFactsSources])
    historicalSource121(archive,pin);
  for(const attempt of original.httpAttempts) {
    const http=json121(attempt.http);assert.equal(http.responseComplete,true);
    assert.equal(http.transportFailure,false);
    assert(http.method==='GET'||http.method==='POST'&&
      http.operationId==='AuthController_createPasswordAuthSession'&&http.status===200,
    'Successful preparation contains only canonical reads/auth200, never domain writes');
    for(const pin of [attempt.http,attempt.ledger,attempt.before,attempt.after])read121(pin);
  }
  for(const pin of original.commandLedgers)read121(pin);
  return {prepared15:base.prepared15,fullInventory:base.fullInventory,bodySHA256:base.bodySHA256,
    originalRecord:saved,originalRuntime:original.current15.runtimeBindings,
    originalEntryAndExit:{entry:original.entryGuard,exit:original.exitGuard,closed:original.closedJournal},
    originalInput:original.input,originalReview:original.exactReview};
}

 const core=preparationOrigin121(base,before,archive,{plan:json121(base.approvedCodePlan15)}),disposition=failedOrigin121(base,before,archive);
 const expected={kind:'verified-retained-tax15-preparation-origin121',protocolVersion:1,...core,sourceArchive:{base:base.sourceArchive121,supplement:base.sourceArchiveSupplement121},failedAttemptDisposition:disposition,PGConservation:registry.current.PGConservation,runtimeAdmission121:{file:registryPin.file,rawBytesSha256:registryPin.rawBytesSha256},retainedPreparationOnly:true,currentEffectsGranted:false,serverTargetsRefreshed:false,bodyRefreshed:false};
 eq(recordOrigin,expected,'Full frozen Native enriched18 factory reconstruction');eq(observedOrigin,recordOrigin,'Observed enriched18 equals complete record18, not runtime3');const projected={prepared15:recordOrigin.prepared15,fullInventory:recordOrigin.fullInventory,bodySHA256:recordOrigin.bodySHA256};eq(projected,runtimeOrigin,'Exact three-field runtime projection');
 keys(recordOrigin.originalEntryAndExit,['entry','exit','closed']);read121(core.originalRuntime);const originalInput=json121(core.originalInput);samePin121(originalInput.runtimeBindings,core.originalRuntime);for(const p of [recordOrigin.PGConservation,recordOrigin.runtimeAdmission121,base.sourceArchive121,base.sourceArchiveSupplement121])read121(p);
 return projected;
}
