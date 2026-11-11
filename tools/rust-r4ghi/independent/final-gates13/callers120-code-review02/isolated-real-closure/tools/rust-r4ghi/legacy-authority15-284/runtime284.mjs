// Typed252 validation and the identical sealed270 completion reader. No import effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { ROOT284, read284, json284, sha284, samePin284 } from './facts284.mjs';

export function preImport284(plan) {
    const r=plan.runtime,sources=json284(r.sourcePins),helpers=json284(r.helperH3);
    assert.equal(sources.length,r.sourceCount);assert.equal(sha284(JSON.stringify(sources)),r.sourcePinsSHA256);assert.equal(helpers.length,r.helperCount);
    for(const entries of [sources,helpers]){
        assert.equal(new Set(entries.map(x=>x.file)).size,entries.length);
        for(const p of entries){assert(typeof p.file==='string'&&!path.isAbsolute(p.file)&&!p.file.includes('\\')&&!p.file.split('/').includes('..'));read284({file:ROOT284+'/'+p.file,rawBytesSha256:p.sha256});}
    }
    const actual=fs.readdirSync(ROOT284+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).sort().map(n=>({file:'tools/rust-r4ghi/business/'+n,sha256:sha284(fs.readFileSync(ROOT284+'/tools/rust-r4ghi/business/'+n))}));
    assert.deepEqual(actual,helpers,'The entire actual H2 graph must be fixed before importing a helper');
    return {sources,helpers};
}

export function verifyRuntime284(ctx,plan,h) {
    const r=plan.runtime,registry=h.currentCodeRegistry15(ctx,{liveProcess:true,sourceFiles:true});
    assert.equal(ctx.epoch,'g2-business15');assert.equal(registry.schemaVersion,5);
    h.assertRuntimeBinding15(ctx,registry,{codeAdmission15:r.codeAdmission15,candidate:r.candidate});
    samePin284(ctx.state.consumerAdmission54.registry,r.codeAdmission15);samePin284(ctx.state.apiProcess,r.apiProcess);
    samePin284(registry.consumer.sourcePins,r.sourcePins);assert.deepEqual(ctx.pins,json284(r.sourcePins));
    assert.equal(ctx.pins.length,r.sourceCount);assert.equal(sha284(JSON.stringify(ctx.pins)),r.sourcePinsSHA256);
    assert.equal(registry.consumer.sourceCount,r.sourceCount);assert.equal(registry.consumer.sourcePinsSHA256,r.sourcePinsSHA256);
    assert.equal(registry.consumer.binary.rawBytesSha256,r.binarySHA256);
    assert.deepEqual(ctx.helperPins,json284(r.helperH3));assert.equal(ctx.helperPins.length,r.helperCount);
    samePin284(h.effectiveHelperPins15(ctx,registry),r.helperH3);
    samePin284(h.trustedSummaryBinary15(ctx,registry),r.trustedSummaryBinary);
    return registry;
}

export function normalizeTaxRuntime284(ctx,r){
    const keys=['sourcePins','sourcePinsSHA256','sourceCount','helperH3','helperCount','codeAdmission15','candidate','apiProcess','binarySHA256','trustedSummaryBinary','taxRuntimeBindings','taxCompletion'];assert.deepEqual(Object.keys(r).sort(),keys.sort());
    return{sourcePins:r.sourcePins,sourcePinsSHA256:r.sourcePinsSHA256,sourceCount:r.sourceCount,helperPins:r.helperH3,helperCount:r.helperCount,helperSources:ctx.helperPins,apiProcess:r.apiProcess,binarySHA256:r.binarySHA256,codeAdmission15:r.codeAdmission15,candidate:r.candidate,taxRuntimeBindings:r.taxRuntimeBindings,taxCompletion:r.taxCompletion};
}
export function canonicalSources284(list){assert(Array.isArray(list));const seen=new Set();return list.map(p=>{assert(p&&typeof p.file==='string'&&p.file.startsWith(ROOT284+'/')&&!p.file.includes('\\')&&path.posix.normalize(p.file)===p.file&&/^[a-f0-9]{64}$/.test(p.rawBytesSha256));assert(!seen.has(p.file));seen.add(p.file);return{file:p.file,rawBytesSha256:p.rawBytesSha256};}).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));}
export async function verifyCompletedTax284(ctx,plan,h,registry){
    assert.equal(plan.case,'period','The baseline branch has no added Tax prerequisite');const r=plan.runtime;assert(r.taxRuntimeBindings&&r.taxCompletion,'Actual completed Tax15 plus execution sidecar are required');const normalized=normalizeTaxRuntime284(ctx,r),consumerId='shared15-284',consumerInput=ctx.input284,registration=plan.tax118ConsumerRegistration;assert.equal(ctx.win,ROOT284);assert.equal(ctx.epoch,'g2-business15');assert(consumerInput.file.startsWith(ctx.priv+'/')&&registration.file.startsWith(ctx.priv+'/'));
    const input=json284(consumerInput),reg=json284(registration);assert.deepEqual(input,plan);samePin284(input.tax118ConsumerRegistration,registration);read284(input.taxExecution118Sidecar);assert.equal(reg.kind,'Root-reviewed-Source15-Tax118-consumer-registration');assert.equal(reg.schemaVersion,1);assert.equal(reg.consumerId,consumerId);assert.equal(reg.effectsGranted,false);
    const expected=['run-tax15-once.mjs','invocation-proof.mjs','retained-tax-proof.mjs','tax15-once-effects.mjs','tax15-once-wire.mjs','tax15-once-ledger.mjs'].map(n=>ROOT284+'/tools/rust-r4ghi/tax15-invocation118/'+n);assert.deepEqual(canonicalSources284(reg.producerExecutionSources).map(p=>p.file),expected.sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))));for(const p of reg.producerExecutionSources)read284(p);
    const readers=['runtime15.mjs','facts15.mjs'].map(n=>ROOT284+'/tools/rust-r4ghi/tax15-readonly/'+n);assert.deepEqual(canonicalSources284(reg.readerSources).map(p=>p.file),readers.sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))));for(const p of reg.readerSources)read284(p);assert.deepEqual(json284(reg.callerCodeReview).sourceClosures?.[consumerId],canonicalSources284(reg.callerExecutionSources));for(const p of reg.callerExecutionSources)read284(p);
    const entry=ROOT284+'/tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs';const {consumeTax15Completion}=await import(pathToFileURL(entry).href);const result=await consumeTax15Completion(ctx,{consumerId,consumerInput,registration}),proof=result.invocation118Sidecar;assert(proof&&proof.externalExecutorVerified===true&&proof.effectsGranted===false&&proof.consumerId===consumerId);samePin284(proof.registration,registration);samePin284(proof.consumerInput,consumerInput);samePin284(proof.sidecar,plan.taxExecution118Sidecar);read284(proof.afterVerifiedFrame);
    const current=result.manifest.current;assert.equal(current.sourcePinsSHA256,normalized.sourcePinsSHA256);assert.equal(current.sourceCount,normalized.sourceCount);samePin284(current.helperPins,normalized.helperPins);assert.deepEqual(current.helperSources,normalized.helperSources);samePin284(current.codeAdmission15,normalized.codeAdmission15);samePin284(current.candidate,normalized.candidate);samePin284(current.apiProcess,normalized.apiProcess);read284(consumerInput);read284(registration);for(const p of reg.producerExecutionSources)read284(p);return result;
}
