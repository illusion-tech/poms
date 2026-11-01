// Root-injected I/O only. Importing this module opens no environment/private,
// database, HTTP, container, process or browser. No catch-and-Native fallback.
import assert from 'node:assert/strict';
import { createDispatch } from './acceptance-dispatch.mjs';
import { verifySourceCap } from './acceptance-source.mjs';
import { buildScenarioPlans, buildSurfaceProbes, buildUriProbes, executionCaseId, materialize, materializePrepared, materializeRequest, nativeProducerRoutes, selectedECases } from './acceptance-api-scenario.mjs';
import {completeFactTables} from './acceptance-facts.mjs';
import {externalAuditProjectionInputs} from './acceptance-api-external-audit-source.mjs';
import { assertApiSemantic, assertResponse, publicResponseIdentity, validateFactFrame, valueDigest, verifyInternal } from './acceptance-api-expected.mjs';

const hash=/^[0-9a-f]{64}$/;
const requiredDeps=['request','facts','prepare','certify','internal','supplier','finishCase'];
const matches=(row,selector)=>Object.entries(selector).every(([key,value])=>Object.hasOwn(row,key)&&Object.is(row[key],value));

export function validateCertification(receipt,{caseId,runId,sourceCapId}) {
    assert(receipt?.complete===true&&receipt.traceComplete===true&&receipt.caseId===caseId&&receipt.runId===runId&&receipt.sourceCapId===sourceCapId,'Actual case/cap-bound complete certificate required');
    assert(Array.isArray(receipt.unknownCreates)&&receipt.unknownCreates.length===0&&Array.isArray(receipt.unknownMutations)&&receipt.unknownMutations.length===0,'Unknown actual write blocks acceptance');
    assert(Array.isArray(receipt.registeredRows)&&hash.test(receipt.ledgerDigest??''),'Fixture verified ledger receipt required');
    for(const row of receipt.registeredRows)assert(row.kind==='r2m-fixture-admission'&&row.runId===runId&&row.sourceCapId===sourceCapId&&row.ledgerDigest===receipt.ledgerDigest&&hash.test(row.certificateSha256??'')&&row.identity&&row.table,'Actual registered row admission missing');
    return {ledgerDigest:receipt.ledgerDigest,registeredRows:receipt.registeredRows.length,creationCertificates:receipt.creationCertificates?.length??0,mutationCertificates:receipt.mutationCertificates?.length??0,traceComplete:true};
}

export function bindCertifiedRows(bindings,specifications,after,receipt) {
    for(const specification of specifications??[]){
        const selector=materialize(specification.selector,bindings),found=(after.rows[specification.table]??[]).filter(row=>matches(row,selector));
        assert.equal(found.length,specification.exactly??1,'Unique source-selected physical row required for binding');
        const actual=found[0],admitted=receipt.registeredRows.filter(row=>row.table===specification.table&&matches(actual,row.identity));
        assert.equal(admitted.length,1,'Response/query identity is not an actual fixture admission');
        const value={};for(const [publicField,column]of Object.entries(specification.view)){assert(Object.hasOwn(actual,column),'Original physical binding column missing');value[publicField]=actual[column]}
        bindings[specification.slot]=value;
    }
}

function refreshOwnedVersions(value,after,receipt,seen=new WeakSet()) {
    if(!value||typeof value!=='object'||Buffer.isBuffer(value)||seen.has(value))return;seen.add(value);
    if(typeof value.id==='string'&&Object.hasOwn(value,'rowVersion')){
        const admitted=receipt.registeredRows.filter(row=>row.identity.id===value.id);
        if(admitted.length===1){const rows=(after.rows[admitted[0].table]??[]).filter(row=>matches(row,admitted[0].identity));if(rows.length===1&&Object.hasOwn(rows[0],'row_version'))value.rowVersion=rows[0].row_version}
    }
    for(const child of Object.values(value))refreshOwnedVersions(child,after,receipt,seen);
}

function publicFailure(category,caseId,stepId){return{category,caseId,stepId,rawErrorIncluded:false}}

export async function runAcceptance({backend,candidate,sourceCap,input,fixture,bindings={},deps,selection,sourceReader,spec,retain}) {
    assert(['nest','rust'].includes(backend)&&/^[0-9a-f]{40}$/.test(candidate??''),'Explicit backend/candidate required');
    for(const name of requiredDeps)assert.equal(typeof deps?.[name],'function','Missing Root I/O dependency: '+name);
    assert.equal(typeof retain,'function','Root raw evidence retention callback required');
    const source=verifySourceCap(sourceCap,{candidate,files:['tools/rust-r2m/acceptance-api.mjs','tools/rust-r2m/acceptance-api-scenario.mjs','tools/rust-r2m/acceptance-api-expected.mjs','tools/rust-r2m/acceptance-dispatch.mjs']});
    assert(sourceCap.artifacts.some(item=>item.kind===(backend==='rust'?'rust-release':'native-main')),'Current executed backend artifact absent from source cap');
    assert(typeof fixture?.runId==='string'&&fixture.runId===bindings.runId,'Fixture/run binding differs');
    const all=buildScenarioPlans(input),chosen=selection??all.map(plan=>plan.id);
    assert(chosen.length>0&&new Set(chosen).size===chosen.length&&chosen.every(id=>all.some(plan=>plan.id===id)),'Only a finite unique frozen selection allowed');
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    const report={kind:'r2m-current-ordered-acceptance-observation',backend,candidate,runId:fixture.runId,sourceCapId:sourceCap.id,source,result:'pending',comparisonPending:true,cleanupPending:true,selection:[...chosen],notRun:all.filter(plan=>!chosen.includes(plan.id)).map(plan=>plan.id),cases:[],counts:{logicalCases:0,requests:0,internalProbes:0,supplierOperations:0,preparedPlans:0}};
    const rawCases=[];let sharedBindings={...bindings};
    for(const caseId of chosen){
        const plan=all.find(item=>item.id===caseId),observed={caseId,backend,runId:fixture.runId,sourceCapId:sourceCap.id,result:'pending',fullPhysicalFactProjectionRequired:107,steps:[]},summary={caseId,result:'pending',fullPhysicalFactProjectionRequired:107,steps:[]};
        report.cases.push(summary);let values={...sharedBindings};
        try{
            // This phase allocates source inputs/opaque sessions/metadata only.
            // Business preparation is an explicit ordered prepared/source step.
            const base=await deps.prepare({phase:'bindings-only',caseId,backend,requirements:plan.requirements,fixture,bindings:values,sourceCapId:sourceCap.id});
            assert(base?.sourceCapId===sourceCap.id&&base.businessProducerRequests===0&&base.businessRowsInserted===0,'Opaque business preparation is forbidden');
            values={...values,...base.bindings};
            const queue=[...plan.steps];
            for(let index=0;index<queue.length;index++){
                let step=queue[index];
                if(step.kind==='source-E-selection'){queue.splice(index,1,...selectedECases(step,values));index--;continue}
                step=materializeRequest(step,values);
                const scopedCase=executionCaseId(step,caseId.toLowerCase());
                const scope=await deps.prepare({phase:'step-scope-only',caseId:scopedCase,logicalCaseId:caseId,backend,step,fixture,bindings:values,sourceCapId:sourceCap.id});
                assert(scope?.sourceCapId===sourceCap.id&&scope.businessProducerRequests===0&&scope.businessRowsInserted===0&&scope.requestId,'Step scope preparation cannot perform business operations');
                const before=await deps.facts({caseId:scopedCase,phase:'before',tables:plan.tables,scope});validateFactFrame(before,completeFactTables(before));
                for(const absent of step.beforeAbsentKeys??[])assert(!(before.rows[absent.table]??[]).some(row=>row.key===absent.key),'Exact source-defined key must be absent before first owned create');
                for(const item of step.intents??[]){const selector=materialize(item.selector,values);assert(item.table!=='system_setting','Baseline setting is never UUID-owned or adopted');await fixture.intent(item.table,selector,{caseId:scopedCase,expectedMax:item.expectedMax})}
                let response=null,operation=null,after=null,certificate=null,semantic=null,executionFailure=false;
                try{
                    if(step.kind==='request'){
                        const target=dispatch.resolve({method:step.method,path:step.path,backend,purpose:step.purpose});
                        response=await deps.request({...target,method:step.method,path:step.path,session:step.session,body:step.body,headers:step.headers,csrf:step.csrf,contentType:step.contentType,caseId:scopedCase,logicalCase:caseId,stepId:step.id,requestId:scope.requestId,purpose:step.purpose,...(caseId.startsWith('M5.')?{externalAuditInputs:externalAuditProjectionInputs(values)}:{})});
                        assert.equal(response.executionBackend,target.executionBackend,'Actual backend differs from fixed dispatch');
                        operation=assertResponse(response,step,{spec,operationId:target.operationId});report.counts.requests++;
                    }else if(step.kind==='prepared-source'){
                        const sourcePlan=await materializePrepared(step,values,{metadata:base.metadata,sourceReader});
                        operation=await deps.prepare({phase:'insert-exact-source-plan',caseId:scopedCase,logicalCaseId:caseId,backend,fixture,bindings:values,sourcePlan,sourceCapId:sourceCap.id});
                        assert(operation?.sourceCapId===sourceCap.id&&operation.preparedSource===true&&operation.nativeProducerClaimed===false,'Exact prepared/actual producer boundary missing');report.counts.preparedPlans++;
                    }else if(step.kind==='internal-probe'){
                        operation=await deps.internal({operation:step.operation,caseId:scopedCase,fixture,bindings:values,sourceCapId:sourceCap.id});verifyInternal(operation,step.operation);report.counts.internalProbes++;
                    }else if(step.kind==='supplier'){
                        operation=await deps.supplier({operation:step.operation,input:step.input,caseId:scopedCase,fixture,bindings:values,sourceCapId:sourceCap.id});
                        assert(operation?.operation===step.operation&&operation.complete===true&&operation.owned===true&&operation.sourceCapId===sourceCap.id,'Owned current supplier operation proof missing');report.counts.supplierOperations++;
                    }else if(step.kind==='owned-mutation'){
                        operation=await deps.prepare({phase:'exact-owned-mutation',operation:step.operation,input:step.input,caseId:scopedCase,fixture,bindings:values,sourceCapId:sourceCap.id});
                        assert(operation?.sourceCapId===sourceCap.id&&operation.exactOwnedIdentity===true,'Exact owned mutation proof missing');
                    }else if(step.kind==='baseline-setting-lease'||step.kind==='baseline-setting-restore'){
                        operation=await deps.prepare({phase:step.kind,caseId:scopedCase,key:step.key,fixture,bindings:values,sourceCapId:sourceCap.id,requires:'environmentBaselineSettingAdmission'});
                        assert(operation?.sourceCapId===sourceCap.id&&operation.key==='attachment.max-upload-size-mb'&&operation.owned===false&&operation.deleteAllowed===false&&operation.environmentBaselineSettingAdmission?.approved===true&&hash.test(operation.environmentBaselineSettingAdmission.rawBytesSha256??''),'Named reviewed environment baseline setting admission required');
                        if(step.kind==='baseline-setting-restore')assert(operation.fullRowExactRestored===true,'Full baseline singleton row must be restored exactly');
                    }else if(step.kind==='source-value')operation={value:step.value,sourceOnly:true};
                    else assert.fail('Unknown bounded recipe step');
                }catch(error){executionFailure=true;await retain({kind:'private-API-step-failure',caseId,stepId:step.id,record:{name:error.name,message:error.message,stack:error.stack}})}
                // Even a failed/partial transport can have committed effects.
                // Root must drain and certify them before a later cleanup.
                after=await deps.facts({caseId:scopedCase,phase:'after',tables:plan.tables,scope});validateFactFrame(after,completeFactTables(after));
                certificate=await deps.certify({caseId:scopedCase,logicalCaseId:caseId,runId:fixture.runId,sourceCapId:sourceCap.id,before,after,requests:response?[{step,response}]:[],operation,fixture});
                const certified=validateCertification(certificate,{caseId:scopedCase,runId:fixture.runId,sourceCapId:sourceCap.id});
                if(response&&!executionFailure)try{semantic=assertApiSemantic(response,step,values,after,{sourceReader,before})}catch(error){executionFailure=true;await retain({kind:'private-API-semantic-expectation-failure',caseId,stepId:step.id,record:{name:error.name,message:error.message,stack:error.stack}})}
                const raw={id:step.id,kind:step.kind,before,after,response,operation,certificate,semantic,executionFailure};observed.steps.push(raw);
                summary.steps.push({id:step.id,kind:step.kind,recipeSha256:valueDigest(queue[index]),...(response?{response:publicResponseIdentity(response)}:{}),certified,result:executionFailure?'fail':'observed'});
                if(executionFailure)throw new Error('r2m-step-failed');
                bindCertifiedRows(values,step.bindRows,after,certificate);
                if(operation?.bindings)values={...values,...operation.bindings};
                if(step.saveAs&&step.kind!=='source-value'){assert(response&&response.body!==undefined,'Response save binding missing');values[step.saveAs]=structuredClone(response.body)}
                if(step.saveResponseAs)values[step.saveResponseAs]=response;
                if(step.kind==='source-value'&&step.saveAs)values[step.saveAs]=step.value;
                refreshOwnedVersions(values,after,certificate);
            }
            observed.result='observed';summary.result='observed';sharedBindings=values;
        }catch(error){
            await retain({kind:'private-API-case-or-prepare-failure',caseId,record:{name:error.name,message:error.message,stack:error.stack}});
            observed.result='fail';summary.result='fail';summary.failure=publicFailure('recipe-or-required-evidence-failed',caseId,observed.steps.at(-1)?.id??'prepare');report.result='fail';
        }finally{
            try{
                const sourceCase=executionCaseId({kind:'runtime-case-closeout'},caseId.toLowerCase()),before=await deps.facts({caseId:sourceCase,phase:'before-case-closeout',tables:plan.tables});validateFactFrame(before,completeFactTables(before));
                const finished=await deps.finishCase({caseId,fixture,result:observed.result,sourceCapId:sourceCap.id});assert(finished?.caseId===caseId&&finished.requiredFaultsRestored===true&&finished.noUnknownCaseWriter===true,'Case writer/fault closeout missing');
                const after=await deps.facts({caseId:sourceCase,phase:'after-case-closeout',tables:plan.tables});validateFactFrame(after,completeFactTables(after));
                const certificate=await deps.certify({caseId:sourceCase,runId:fixture.runId,sourceCapId:sourceCap.id,before,after,fixture});validateCertification(certificate,{caseId:sourceCase,runId:fixture.runId,sourceCapId:sourceCap.id});
                observed.steps.push({id:'runtime-case-closeout',kind:'actual-owned-runtime-closeout',before,after,response:null,operation:finished,certificate,executionFailure:false});summary.steps.push({id:'runtime-case-closeout',kind:'actual-owned-runtime-closeout',fullFactTables:107,result:'observed'});summary.caseClosed=true;if(observed.result==='observed')report.counts.logicalCases++;
            }catch(error){await retain({kind:'private-API-finish-case-failure',caseId,record:{name:error.name,message:error.message,stack:error.stack}});summary.caseClosed=false;summary.result='fail';observed.result='fail';report.result='fail'}
            const saved=await retain({kind:'actual-case-with-complete-private-facts',caseId,backend,sourceCapId:sourceCap.id,record:observed});
            assert(saved&&hash.test(saved.rawBytesSha256??'')&&typeof saved.file==='string','Actual retained raw evidence identity required');summary.rawEvidence={file:saved.file,rawBytesSha256:saved.rawBytesSha256};rawCases.push(observed);
        }
    }
    if(sourceReader){const checked=sourceReader.assertUnchanged();report.sourceReads={sourceEpoch:checked.sourceEpoch,digest:checked.digest,files:checked.files.length,privateRead:false,inputExecuted:false}}
    if(report.result==='pending')report.result='observed';
    report.fullMatrixObserved=report.result==='observed'&&report.notRun.length===0&&report.counts.logicalCases===20;
    // Cross-backend complete comparison and Root final namespace closeout are
    // separate mandatory steps. This function never labels G3/G4 as passed.
    return {report,rawCases};
}

export function validateCloseout(receipt,{runId,sourceCapId}) {
    assert(receipt?.runId===runId&&receipt.sourceCapId===sourceCapId&&receipt.allWritersClosed===true&&receipt.pendingTransactions===0&&receipt.unknownWriters===0,'Complete matching writer drain required');
    assert(receipt.fullReferenceScan?.tablesScanned===107&&receipt.fullReferenceScan.unownedReferences===0&&receipt.borrowedRowsUnchanged===true,'Full reference/borrow check required');
    assert(Array.isArray(receipt.cleanup)&&receipt.cleanup.length===2,'Two actual cleanup attempts required');
    assert(receipt.cleanup.every(item=>item.state==='cleaned'&&item.objects===0&&item.logicalReferences===0),'Actual after-COMMIT zero required');
    assert(receipt.cleanup[1].matched===0&&receipt.cleanup[1].changed===0&&receipt.cleanup[1].objects===0,'Second cleanup must be a real no-op');
    assert(receipt.baselineSettingLease?.used===false||receipt.baselineSettingLease?.used===true&&receipt.baselineSettingLease.fullRowExactRestored===true&&receipt.baselineSettingLease.owned===false&&receipt.baselineSettingLease.deleted===false,'Named baseline setting lease must be exactly restored after drain');
    assert(receipt.portsReleased===true&&receipt.oldInstancesTouched===false&&receipt.r2mVolumeRetained===true,'Owned-only final environment closeout required');
    return {kind:'r2m-actual-owned-closeout',runId,sourceCapId,result:'pass',doubleZero:true,oldInstancesTouched:false};
}

export async function runProbeMatrix({kind,backend,candidate,sourceCap,input,fixture,bindings,deps,retain}) {
    assert(['surface','uri'].includes(kind)&&['nest','rust'].includes(backend),'Named finite probe matrix required');
    verifySourceCap(sourceCap,{candidate});for(const name of ['request','facts','prepare','certify'])assert.equal(typeof deps?.[name],'function');assert.equal(typeof retain,'function');
    const cells=kind==='surface'?buildSurfaceProbes(input,bindings):buildUriProbes({userId:bindings.actors.viewer});
    assert.equal(cells.length,kind==='surface'?115:27,'Exact frozen probe count required');
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    const tables=bindings.probeTables;assert(Array.isArray(tables)&&tables.length>0,'Explicit full fact projection for probe writes required');
    const raw={kind:'r2m-actual-'+kind+'-matrix',backend,candidate,runId:fixture.runId,sourceCapId:sourceCap.id,caseId:'M0.'+kind,result:'pending',steps:[]};
    const report={kind:raw.kind,backend,candidate,runId:raw.runId,sourceCapId:raw.sourceCapId,result:'pending',comparisonPending:true,cleanupPending:true,planned:cells.length,attempted:0,actual:0,transportCompleted:0,cells:[]};
    for(const step of cells){
        const caseId='m0.'+step.id;let before,after,response,failed=false,requestDispatched=false;report.attempted++;
        const transport=()=>({requestDispatched,responseObserved:typeof response?.transportComplete==='boolean',complete:typeof response?.transportComplete==='boolean'?response.transportComplete:null});
        try{
            const scope=await deps.prepare({phase:'step-scope-only',caseId,logicalCaseId:raw.caseId,step,backend,fixture,bindings,sourceCapId:sourceCap.id});
            assert(scope?.sourceCapId===sourceCap.id&&scope.requestId&&scope.businessProducerRequests===0&&scope.businessRowsInserted===0,'Probe scope may not perform hidden business setup');
            before=await deps.facts({caseId,phase:'before',tables,scope});validateFactFrame(before,tables);
            const target=dispatch.resolve({method:step.method,path:step.path,backend,purpose:step.purpose});
            try{requestDispatched=true;response=await deps.request({...target,method:step.method,path:step.path,body:step.body,session:step.session,caseId,requestId:scope.requestId,purpose:step.purpose});if(typeof response?.transportComplete==='boolean'){report.actual++;if(response.transportComplete)report.transportCompleted++}assert.equal(response.executionBackend,target.executionBackend);assertResponse(response,step)}catch{failed=true}
            after=await deps.facts({caseId,phase:'after',tables,scope});validateFactFrame(after,tables);
            const certificate=await deps.certify({caseId,runId:fixture.runId,sourceCapId:sourceCap.id,before,after,requests:response?[{step,response}]:[],fixture});
            validateCertification(certificate,{caseId,runId:fixture.runId,sourceCapId:sourceCap.id});
            raw.steps.push({id:step.id,kind:'request',before,after,response,certificate,executionFailure:failed});
            report.cells.push({id:step.id,method:step.method,pathSha256:valueDigest(step.path),expectedFromNative:true,transport:transport(),...(response?{response:publicResponseIdentity(response)}:{}),result:failed?'fail':'observed'});
            if(failed)report.result='fail';
        }catch{report.result='fail';report.cells.push({id:step.id,result:'fail',transport:transport(),failure:publicFailure('probe-or-required-evidence-failed',raw.caseId,step.id)})}
    }
    if(report.result==='pending')report.result=report.actual===cells.length?'observed':'fail';raw.result=report.result;
    const saved=await retain({kind:'actual-probe-matrix-with-complete-private-facts',backend,sourceCapId:sourceCap.id,record:raw});assert(saved&&hash.test(saved.rawBytesSha256??''),'Raw probe capture receipt required');report.rawEvidence={file:saved.file,rawBytesSha256:saved.rawBytesSha256};
    return {report,raw};
}
