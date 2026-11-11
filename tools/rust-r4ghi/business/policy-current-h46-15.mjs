// A current15 continuation is distinct from the immutable partial13 producer.
// Importing is pure. This module never sends HTTP, SQL, or writes state.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import { readPin54 } from './consumer-admission54.mjs';
import { currentCodeRegistry15, assertRetainedFixture15, assertRuntimeBinding15 } from './source15-admission.mjs';
const PROJECT='d30c0da1-692e-4e7e-ba2c-ad81ad8898f0',PARTIAL='97928d111fc5e510360edaf1f2ec38081cfb143f3f87ccfb57266f91a6345e00';
const sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>{for(const p of[a,b])assert(p&&path.isAbsolute(p.file)&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);if(a.bytes!==undefined&&b.bytes!==undefined)assert.equal(a.bytes,b.bytes);};
function readonly15(value){const copy=structuredClone(value);const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};return freeze(copy);}
const json=(p,read)=>JSON.parse(read(p));
export function assertPartialProducerData15(record,partial){
    assert.equal(partial.kind,'actual-Source13-H46-partial-after-runtime-loss287');assert.equal(partial.producerEpoch,'g2-business13');assert.equal(partial.sourceGeneration,13);assert.equal(partial.projectId,PROJECT);
    assert.equal(partial.complete,false);assert.equal(partial.source13EffectReadmission,false);assert.equal(partial.newSource14Acceptance,false);assert.equal(partial.originalRecordUnchanged,true);assert.equal(partial.original317Replayed,false);
    assert.deepEqual(partial.completedCases,['H01','below-19.99','H04']);assert.deepEqual(partial.unexecutedCases,['equal-20.00','above-20.01']);
    assert.equal(record.producerEpoch,'g2-business13');assert.equal(record.fixtures.project.id,PROJECT);assert(!record.result);assert.equal(sha(JSON.stringify(record)),partial.resourceRecordSHA256);assert.equal(sha(JSON.stringify(record.stages)),partial.originalStoppedStagesSHA256);
    assert.equal(record.stages['fresh-G-H-below'].phase,'stopped-reconcile-originals-no-replay');assert.equal(record.continuation261.steps.below.phase,'verified');assert.equal(record.continuation261.steps.h04.phase,'verified');assert(!record.fixtures.receipts26.equal&&!record.fixtures.receipts26.above);
    assert.deepEqual(partial.caseRefs,{h01:record.fixtures.h01Published26,below:record.fixtures.publishedCases26.below,H04:record.fixtures.attentionReview26});return record;
}
export function verifyPartialH46Parent15(ctx,registry,partialPin,read=readPin54){
    assert.equal(ctx.epoch,'g2-business15');assert.equal(registry.schemaVersion,5);assert.equal(partialPin.rawBytesSha256,PARTIAL);
    const partial=json(partialPin,read),record=ctx.state.fixtures.hPolicyCoverage26;assertPartialProducerData15(record,partial);
    const retained=json(registry.producerState,read);assert.deepEqual(retained.fixtures.hPolicyCoverage26,record);
    const bridge=assertRetainedFixture15(ctx,registry,{registryPath:'/fixtures/hPolicyCoverage26',record,projectIds:[PROJECT],producerReceipt:partialPin});
    assert.equal(bridge.retainedProducerOnly,true);assert.equal(bridge.producerEpoch,'g2-business13');same(bridge.retainedProducerState,registry.producerState);same(bridge.originalProducerState,partial.frozenState);
    return{partialPin,partial,record,bridge,originalProducerComplete:false};
}
export function assertHTTPIndex15(ctx,index,mode,read=readPin54){
    assert.equal(index.kind,'actual-current15-H46-phase-HTTP-index15');assert.equal(index.mode,mode);assert.equal(index.sourceGeneration,15);assert.equal(index.consumerEpoch,'g2-business15');assert.equal(index.producerBornEpoch,'g2-business13');
    const ids=new Set(),mutations=[];for(const item of index.entries){
        const wire=json(item.http,read),ledger=json(item.ledger,read);assert.equal(wire.kind,'actual-business-HTTP-attempt');assert.equal(wire.responseComplete,true);assert.equal(wire.transportFailure,false);assert.equal(wire.status,wire.expectedStatus);assert(wire.status>=200&&wire.status<300);assert(wire.requestId.startsWith(ctx.state.prefix+'-'));assert(!ids.has(wire.requestId));ids.add(wire.requestId);
        assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);assert.equal(ledger.requestId,wire.requestId);assert.equal(ledger.operationId,wire.operationId);same(item.before,ledger.before);same(item.after,ledger.after);
        const config=json(wire.originals.requestConfig,read);assert.equal(config.operationId,wire.operationId);assert.equal(config.requestId,wire.requestId);assert.equal(config.headers['X-Request-Id'],wire.requestId);assert.equal(json(wire.originals.responseHeaders,read).status,wire.status);
        for(const p of Object.values(wire.originals))read(p);
        for(const p of [item.before,item.after]){const snapshot=json(p,read);assert.equal(snapshot.epoch,'g2-business15');assert.equal(snapshot.run,'main01');assert.equal(snapshot.marker,ctx.state.marker);}
        if(wire.method!=='GET'&&wire.method!=='HEAD')mutations.push(wire.operationId);
    }
    const permitted=['AuthController_createPasswordAuthSession',...(mode==='read-retained'?[]:['ContractFinanceController_createReceipt','ContractFinanceController_confirmReceipt','ProjectCostController_createProjectOperatingSnapshot'])];
    assert(mutations.every(op=>permitted.includes(op)));assert.equal(mutations.filter(op=>op==='AuthController_createPasswordAuthSession').length,1);
    for(const operation of permitted.filter(op=>op!=='AuthController_createPasswordAuthSession'))assert.equal(mutations.filter(op=>op===operation).length,1,'Each new business command is issued exactly once');
    assert.equal(index.entries.length,index.actualHTTPRequestCount);return index;
}
export function assertCurrentCaseData15(ctx,result,mode,identity,read=readPin54){
    assert.equal(result.kind,'actual-current15-H46-case15');assert.equal(result.mode,mode);assert.equal(result.projectId,PROJECT);assert.equal(result.sourceGeneration,15);assert.equal(result.consumerEpoch,'g2-business15');assert.equal(result.producerBornEpoch,'g2-business13');
    same(result.apiProcess,identity.apiProcess);same(result.codeAdmission15,identity.codeAdmission15);same(result.candidate,identity.candidate);assert.equal(result.sourcePinsSHA256,identity.sourcePinsSHA256);
    assertHTTPIndex15(ctx,json(result.HTTPIndex,read),mode,read);
    assert.equal(result.cashIncrement,'0.01');assert.equal(result.cumulativeCash,mode==='equal'?'20.00':'20.01');assert.equal(result.publishedCase.name,mode);assert.equal(result.publishedCase.projectId,PROJECT);
    const proof=json(result.publishedCase.proof,read);assert.equal(proof.kind,'actual-normal-producer-published-G-H-rule-case');assert.equal(proof.case,mode);assert.equal(proof.projectId,PROJECT);assert.equal(proof.formalEligibilityAndMaturityFromServer,true);assert.equal(proof.SQLContextFixture,false);
    const command=json(result.GCommand.http,read),ledger=json(result.GCommand.ledger,read);assert.equal(command.operationId,'ProjectCostController_createProjectOperatingSnapshot');assert.equal(command.method,'POST');assert.equal(command.canonicalTemplate,'/api/project-operating-snapshots');assert.equal(command.status,201);assert.equal(command.responseComplete,true);assert.equal(command.transportFailure,false);assert(command.requestId.startsWith(ctx.state.prefix+'-'));assert.equal(command.requestId,ledger.requestId);assert.equal(ledger.ownershipComplete,true);assert.deepEqual(ledger.blockers,[]);same(ledger.before,proof.commandBefore);same(ledger.after,proof.commandAfter);assert.equal(command.originals.requestBody.rawBytesSha256,result.GCommand.requestBodySHA256);
    const request=json(command.originals.requestBody,read);assert.equal(request.projectId,PROJECT);assert.equal(request.snapshotMode,'realtime');assert.equal(request.periodKey,null);assert(request.baselinePackageRef);
    const response=json(command.originals.responseBody,read),body=response.data??response;assert.equal(body.snapshotId??body.targetId,result.publishedCase.snapshotId);assert.equal(body.sourceHash,result.publishedCase.sourceHash);
    assert(result.receiptId&&result.receiptBasis);const basis=json(result.receiptBasis,read);assert.equal(basis.receiptId,result.receiptId);assert.equal(basis.exactGrossNetTax,true);assert.equal(basis.producerTransport,'actual-current-Rust-HTTP');assert.equal(basis.actual.length,1);assert.equal(basis.actual[0].cash_gross,'0.01');assert.equal(basis.actual[0].amount_excluding_tax,'0.01');assert.equal(basis.actual[0].tax_amount,'0.00');return result;
}
export async function verifyContinuedH46Completion15(ctx,registry,completion,read=readPin54){
    const actual=currentCodeRegistry15(ctx,{liveProcess:true,sourceFiles:true});assert.deepEqual(registry,actual);const record=ctx.state.consumerChecks?.hPolicyContinuation15;assert(record&&record.phase==='complete-current15');same(record.result,completion);
    const value=json(completion,read);assert.equal(value.kind,'actual-current15-H46-continuation15-complete');assert.equal(value.sourceGeneration,15);assert.equal(value.consumerEpoch,'g2-business15');assert.equal(value.producerBornEpoch,'g2-business13');assert.equal(value.originalProducerComplete,false);assert.equal(value.projectId,PROJECT);assert.equal(value.original317Replayed,false);assert.equal(value.originalProducerRecordUnchanged,true);
    same(value.source13Partial287,record.identity.source13Partial287);const producer=verifyPartialH46Parent15(ctx,registry,value.source13Partial287,read);
    same(value.codeAdmission15,ctx.state.consumerAdmission54.registry);same(value.apiProcess,registry.consumer.apiProcess);same(value.candidate,record.identity.candidate);assert.equal(value.sourcePinsSHA256,registry.consumer.sourcePinsSHA256);assertRuntimeBinding15(ctx,registry,{codeAdmission15:value.codeAdmission15,candidate:value.candidate});
    assert.equal(record.originalRecordSHA256,producer.partial.resourceRecordSHA256);assert.deepEqual(value.originalCoverage,producer.partial.caseRefs);assert.deepEqual(value.actualSteps,record.steps);assert.deepEqual(Object.keys(record.steps).sort(),['above','equal','read-retained']);
    const taxProofs=[];for(const mode of ['read-retained','equal','above']){const step=record.steps[mode];assert.equal(step.phase,'verified');const originalInput=json(step.input,read);assert(originalInput.tax118ConsumerRegistration);const taxProof=await consumeRegisteredTax15(ctx,{consumerId:'h15-287',consumerInput:step.input,registration:originalInput.tax118ConsumerRegistration});taxProofs.push(taxProof);const result=json(step.result,read);if(mode==='read-retained'){assert.equal(result.kind,'actual-current15-readback-of-preserved13-H46-facts15');assert.equal(result.originalProducerRecordUnchanged,true);assertHTTPIndex15(ctx,json(result.HTTPIndex,read),mode,read);}else assertCurrentCaseData15(ctx,result,mode,record.identity,read);}
    for(const tax of taxProofs.slice(1)){same(tax.completion,taxProofs[0].completion);same(tax.invocation118Sidecar.sidecar,taxProofs[0].invocation118Sidecar.sidecar);}assert.deepEqual(value.newCases,{equal:record.fixtures.publishedCases26.equal,above:record.fixtures.publishedCases26.above});
    return{completion,protocol:'Source13-partial-to-current15-H46-continuation15',projectId:PROJECT,sourceGeneration:15,consumerEpoch:'g2-business15',producerBornEpoch:'g2-business13',sourcePinsSHA256:value.sourcePinsSHA256,source13Partial287:value.source13Partial287,producerBridge:producer.bridge,originalProducerComplete:false,originalProducerRecordUnchanged:true,original317Replayed:false,currentConsumerCoverageVerified:true,taxProofs};
}

// This integration wrapper is not the #118 consumer implementation. It can
// only call the fixed future module after exact registered bytes are present.
export async function consumeRegisteredTax15(ctx,options){
 assert.deepEqual(Object.keys(options).sort(),['consumerId','consumerInput','registration']);const{consumerId}=options,consumerInput=readonly15(options.consumerInput),registration=readonly15(options.registration);
 assert(['h15-287','role15-setup'].includes(consumerId));
 const input=JSON.parse(readPin54(consumerInput));same(input.tax118ConsumerRegistration,registration);
 const reg=JSON.parse(readPin54(registration));assert.equal(reg.kind,'Root-reviewed-Source15-Tax118-consumer-registration');assert.equal(reg.schemaVersion,1);assert.equal(reg.consumerId,consumerId);assert.equal(reg.effectsGranted,false);
 assert(Array.isArray(reg.producerExecutionSources)&&reg.producerExecutionSources.length===6);const expected=['run-tax15-once.mjs','invocation-proof.mjs','retained-tax-proof.mjs','tax15-once-effects.mjs','tax15-once-wire.mjs','tax15-once-ledger.mjs'].map(name=>ctx.win+'/tools/rust-r4ghi/tax15-invocation118/'+name);assert.deepEqual(reg.producerExecutionSources.map(p=>p.file).sort(),expected.sort());
 for(const p of reg.producerExecutionSources){assert(p&&path.isAbsolute(p.file));const st=fs.lstatSync(p.file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(p.file),p.file);readPin54(p);}
 const file=ctx.win+'/tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs';const source=reg.producerExecutionSources.find(p=>p.file===file);assert(source,'Exact #118 consumer module is required; no native-only fallback');readPin54(source);
 const {consumeTax15Completion}=await import(pathToFileURL(file).href);assert.equal(typeof consumeTax15Completion,'function');
 const result=await consumeTax15Completion(ctx,{consumerId,consumerInput,registration});
 const proof=result.invocation118Sidecar;assert(proof&&proof.externalExecutorVerified===true&&proof.effectsGranted===false);assert.equal(proof.consumerId,consumerId);same(proof.consumerInput,consumerInput);same(proof.registration,registration);assert(proof.afterVerifiedFrame);readPin54(consumerInput);readPin54(registration);for(const p of reg.producerExecutionSources)readPin54(p);return readonly15(result);
}
