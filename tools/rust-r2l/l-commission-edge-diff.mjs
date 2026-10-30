// Read-only comparison of the twelve actual G1 hook windows. This is separate
// from controlled114/full-prefix equality and never upgrades a partial epoch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { EdgeEvidence } from './l-commission-edge-model.mjs';
import { originalEdgeProjection } from './l-commission-edge-projection.mjs';
import { strictContractDiff } from './l-contract-diff.mjs';
import { edgeCases, failedEpochs, planForReport, sha256 } from './l-commission-edge-plan.mjs';
import { assertApprovalWindow, assertSnapshotBarrier, assertWindowCounterconditions, originalAuthTransitions, assertRecordedAuthDelta } from './l-commission-edge-window.mjs';
const windowCount={ 'final-gate':4,'retention-gate':6,'retention-date':3,'retention-approve-nonret':1,'retention-approve-payout-status':1,'retention-approve-confirmation':1,'retention-approve-summary':1,'retention-approve-gate-record':1,'initial-current-race':1,'replacement-current-race':1,'late-initial':1,'late-replacement':1 };
function captureFailure(model,at,fn) { try{return fn();}catch(error){model.failures.push({path:model.backend+'.'+at,reason:String(error.message).slice(0,2200)});return null;} }
function validateOwnerBindings(model) {
    const r=model.actual,a=model.a,owners=a.sourceOwners,plan=model.plan;
    model.check(owners?.privateOwnerLogRead===false,'sourceOwners','Owner log privacy boundary missing');
    const companion=owners?.companion?.report,owner=owners?.owner?.report;
    for(const item of [companion,owner])model.check(item?.tag===r.tag&&item?.backend===r.backend&&item?.scenario===plan.scenario,'sourceOwners.identity','Wrong independent owner/companion run');
    model.check(companion?.result==='observed'&&owner?.result==='pass'&&owner.exitCode===0&&owner.timeoutMs===300000,'sourceOwners.result','Original bounded owner or companion was not successful');
    model.check(companion?.consumerReport?.rawBytesSha256===a.actualReport.sha256&&companion.consumerReport.requestCount===r.requests.length&&companion.consumerReport.doubleZero===true&&isDeepStrictEqual(companion.consumerReport.resourceCloseout,r.resourceCloseout),'sourceOwners.actualBinding','Companion consumer binding differs from exact report bytes/closeouts');
    model.check(companion?.source?.sha256===plan.hook&&companion?.driver?.sha256===plan.driver,'sourceOwners.source','Companion source epoch differs');
    if(r.backend==='rust'&&(plan.scenario.endsWith('-race')||plan.scenario.startsWith('late-'))) {
        const p=companion?.passiveIdentityObserver;
        model.check(p?.closed===true&&p.rawSocketClosed===true&&p.workerExitCode===0&&p.forcedWorkerStop===false&&p.stderrBytes===0&&p.payloadsPersisted===false&&p.uidAfterDrop===1000,'sourceOwners.passiveClose','Passive privileged socket owner was not actually dropped/closed');
        const physical=r.captureBatches[0].barrier.commandOwnershipProof.physical;
        model.check(p?.admissions?.length===1&&isDeepStrictEqual(p.admissions[0],physical),'sourceOwners.passiveAdmission','Actual passive observer admission differs from barrier hard-binding proof');
        model.check(r.runtimeInput.files.some(item=>item.source===p?.source.file&&item.rawBytesSha256===p.source.rawBytesSha256),'sourceOwners.passiveSource','Passive original BackendKeyData source is not captured');
    }
}
function analyse(report,evidence,backend) {
    const model=new EdgeEvidence(report,evidence,backend),view=captureFailure(model,'completeSourceModel',()=>model.analyse());
    if(!view)return {model,view:null,windows:[],auth:null};
    const projection=originalEdgeProjection();
    for(const file of projection.files)model.check(report.runtimeInput.files.some(item=>item.source===file.file&&item.normalizedLfSha256===file.normalizedLfSha256),'projectionSource.'+file.file,'Original pure source projection differs from captured exact runtime input');
    captureFailure(model,'sourceOwners',()=>validateOwnerBindings(model));
    const auth=captureFailure(model,'originalAuthSourceTransitions',()=>originalAuthTransitions(report,model.r.requests,evidence.sessionBindings,view.lifecycleUs));
    const hook=report.phaseHooks[0],plan=model.plan,context={...report,scenario:plan.scenario},windows=[];
    const units=model.r.requests.filter(q=>q.sourceIndex>=hook.requestIndex&&(q.requests||q.method==='POST'&&/^\/api\/approval-records\/[0-9a-f-]{36}:approve$/.test(q.path)));
    model.check(units.length===windowCount[plan.scenario],'windowCount','The complete declared original hook decision windows were not captured');
    for(const q of units) {
        const result=captureFailure(model,q.name+'.originalTransition',()=>assertApprovalWindow(q,projection));
        const conditions=captureFailure(model,q.name+'.counterconditions',()=>assertWindowCounterconditions(context,q,projection));
        const barrier=q.requests?captureFailure(model,q.name+'.barrier',()=>assertSnapshotBarrier(report,q)):null;
        if(q.requests)captureFailure(model,q.name+'.authDelta',()=>assertRecordedAuthDelta(q,hook.evidence.authDelta));
        windows.push({caseId:q.name,sourceIndex:q.sourceIndex,beforeAfterViewIndex:model.r.requests.indexOf(q),transition:result,counterconditions:conditions,barrier});
    }
    const last=model.r.requests.at(-1),positive=report.requests.filter(q=>q.name.startsWith('edge.')&&q.method==='POST'&&q.path.startsWith('/api/approval-records/')&&q.response.status===200).at(-1);
    if(hook.evidence.positiveResult)model.check(positive&&isDeepStrictEqual(hook.evidence.positiveResult,positive.response.body),'phase.positiveResult','Hook summary command result differs from the actual complete response');
    if(hook.evidence.currentPair){for(const [key,table]of[['final','commission_final_settlement_snapshot'],['rule','commission_rule_explanation_snapshot']]){const actual=last.after[table].filter(row=>row.is_current);model.check(actual.length===1&&isDeepStrictEqual(actual[0],hook.evidence.currentPair[key]),'phase.currentPair.'+key,'Hook current-pair whole-row summary differs from actual after state');}}
    return {model,view,windows,auth};
}
function naturalAdminDifference(difference,left,right) {
    const match=/^\$\.views\.(\d+)\.(before|after)\.auth_session\.(\d+)\.fields\.(idle_expires_at|last_seen_at|updated_at|row_version)(?:\.clock)?$/.exec(difference.path);
    if(!match)return false;const i=Number(match[1]),n=Number(match[3]),slot='create.initiator.login.auth_session.0';
    return left.views[i]?.[match[2]].auth_session[n]?.slot===slot&&right.views[i]?.[match[2]].auth_session[n]?.slot===slot;
}
export function compareCommissionEdges(native,rust,nativeEvidence,rustEvidence) {
    let a,b;const ingest=[];
    try{a=analyse(native,nativeEvidence,'nest');}catch(error){ingest.push({path:'nest.ingest',reason:String(error.message).slice(0,1500)});}
    try{b=analyse(rust,rustEvidence,'rust');}catch(error){ingest.push({path:'rust.ingest',reason:String(error.message).slice(0,1500)});}
    const failures=[...ingest,...(a?.model.failures??[]),...(b?.model.failures??[])],gaps=[...(a?.model.gaps??[]),...(b?.model.gaps??[])];
    if(a&&b&&a.model.plan.scenario!==b.model.plan.scenario)failures.push({path:'pairedScenario',reason:'Different original edge scenarios cannot form a comparison'});
    const differences=a?.view&&b?.view?strictContractDiff(a.view,b.view):[],naturalInputDifferences=[],conditionalRaceDifferences=[],unclassifiedDifferences=[];
    const race=a?.model.plan.scenario.endsWith('-race'),winnerA=a?.windows.at(-1)?.transition?.winnerCallers,winnerB=b?.windows.at(-1)?.transition?.winnerCallers,winnerDiffers=race&&!isDeepStrictEqual(winnerA,winnerB);
    const indexA=a?.windows.at(-1)?.beforeAfterViewIndex,indexB=b?.windows.at(-1)?.beforeAfterViewIndex;
    for(const difference of differences) {
        if(naturalAdminDifference(difference,a.view,b.view))naturalInputDifferences.push({...difference,classification:'Preserved actual independent natural admin input; both source-conditioned raw/managed transitions checked'});
        else if(winnerDiffers&&indexA===indexB&&new RegExp('^\\$\\.views\\.'+indexA+'\\.(after|responses)\\.').test(difference.path))conditionalRaceDifferences.push({...difference,classification:'Different actual successful caller; every full after row and complete DTO separately checked against its own raw before and original service source'});
        else unclassifiedDifferences.push(difference);
    }
    const pass=!failures.length&&!gaps.length&&!unclassifiedDifferences.length;
    return {formatVersion:1,kind:'strict-source-conditioned-twelve-G1-edge-window-comparison',scenario:a?.model.plan.scenario??null,result:pass?'pass-bounded-hook-window':'fail-or-uncertified',
        fullPrefix40EqualityClaimed:false,controlled114PassTransferred:false,oldPartialOrRecoveryPromoted:false,G3Certified:false,G4Certified:false,
        coverage:{actualHttpRecords:{nest:native.requests?.length,rust:rust.requests?.length},hookWindows:{nest:a?.windows.length??0,rust:b?.windows.length??0},all40TablesAndAllPhysicalColumnsChecked:!!a?.view&&!!b?.view,allNonAuthBeforeAfterRowsSourceChecked:pass,
            completeResponseAndErrorFieldsPreserved:true,DTOArrayOrderPreserved:true,typedUUIDSourcesRequired:true,rawRowVersionsNeverRemoved:true,realWaitingPIDAndCancelBeforeReleaseRequired:!!(a?.model.plan.scenario.includes('race')||a?.model.plan.scenario.startsWith('late-')),
            generatedPairSDKPGProofKindsKeptSeparate:true,sourceClockSlotsBoundedToActualInputOrRequest:true},
        checks:(a?.model.checks??0)+(b?.model.checks??0)+(a?.auth?.checks??0)+(b?.auth?.checks??0)+[...(a?.windows??[]),...(b?.windows??[])].reduce((n,w)=>n+(w.transition?.checks??0)+(w.counterconditions?.checks??0)+(w.barrier?.checks??0),0),
        failures,gaps,unclassifiedDifferences,naturalInputDifferences,conditionalRaceDifferences,
        actualRaceWinner:{nest:winnerA??[],rust:winnerB??[],differentActualCallerPermittedOnlyAfterCompleteSourceTransitionChecks:!!race,callerToIndividualRustPidClaimed:false},
        windows:{nest:a?.windows??[],rust:b?.windows??[]},authTransitions:{nest:a?.auth??null,rust:b?.auth??null},
        sourcePreparations:{nest:a?.model.mutationEvidence??[],rust:b?.model.mutationEvidence??[]},
        sourceDeclaredNativeSdkOnlySnapshotProvenance:{nest:a?.model.nativeSdkOnlySnapshotProvenance??[],rust:b?.model.nativeSdkOnlySnapshotProvenance??[]},
        identities:{nest:a?.model.identityEvidence??[],rust:b?.model.identityEvidence??[]},clocks:{nest:a?.model.clockEvidence??[],rust:b?.model.clockEvidence??[]},nonces:{nest:a?.model.nonceEvidence??[],rust:b?.model.nonceEvidence??[]},
        binaryScope:{native:native.nativeFinal?.binaryRawBytesSha256,rust:rust.rustRuntime?.binaryRawBytesSha256},
        excludedFailedEpochs:failedEpochs,
        boundary:'Saved public reports plus Root/C exported original private response/ownership/PG bindings only. No DB/HTTP/env/private read by comparator. Natural auth and actual race branch differences stay explicit; this result certifies only each actual source-conditioned hook window, not a same-input full-prefix run or joint G3.',
    };
}
function readPublic(file) {
    const real=fs.realpathSync(file);assert(!real.replaceAll('\\','/').split('/').includes('private'),'Comparator cannot read task-private material');
    const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=fs.readFileSync(file);return {file,bytes:bytes.length,sha256:sha256(bytes),data:JSON.parse(bytes)};
}
export function compareCommissionEdgeFiles(files,output) {
    assert.equal(files.length,4);assert(!fs.existsSync(output));const input=files.map(readPublic),result=compareCommissionEdges(...input.map(x=>x.data));
    result.inputs=input.map(({data,...item})=>item);fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}
export function edgeInventory(root) {
    return {kind:'public-actual-edge-input-inventory',result:'saved-files-hashed-only',cases:edgeCases.map(plan=>({scenario:plan.scenario,
        inputs:['nest','rust'].map(backend=>{const tag=plan[backend],files=[`commission-http-${backend}-${tag}.json`,`commission-g1-edges-${backend}-${tag}.json`,`commission-g1-edges-${backend}-${tag}-owner.json`];
            return {backend,tag,files:files.map(name=>{const {data,...metadata}=readPublic(path.join(root,'tmp/rust-r2l',name));return metadata;})};})})),excludedFailedEpochs:failedEpochs,newRuntimeClaimed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
    const [mode,...args]=process.argv.slice(2);
    try {
        if(mode==='inventory'){const[root,output]=args;assert(root&&output&&!fs.existsSync(output));const result=edgeInventory(root);fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:result.result,cases:result.cases.length,output}));}
        else if(mode==='pair'){assert.equal(args.length,5);const result=compareCommissionEdgeFiles(args.slice(0,4),args[4]);console.log(JSON.stringify({scenario:result.scenario,result:result.result,checks:result.checks,failures:result.failures.length,gaps:result.gaps.length,differences:result.unclassifiedDifferences.length,naturalInputDifferences:result.naturalInputDifferences.length}));process.exitCode=result.result==='pass-bounded-hook-window'?0:1;}
        else if(mode==='matrix'){
            const[root,evidenceDir,outputDir]=args;assert(root&&evidenceDir&&outputDir);assert(!fs.existsSync(outputDir));fs.mkdirSync(outputDir,{recursive:false});const results=[];
            for(const p of edgeCases){const files=['nest','rust'].map(b=>path.join(root,'tmp/rust-r2l',`commission-http-${b}-${p[b]}.json`)).concat(['nest','rust'].map(b=>path.join(evidenceDir,`commission-edge-evidence-${b}-${p[b]}.json`)));const output=path.join(outputDir,p.scenario+'.json'),r=compareCommissionEdgeFiles(files,output);results.push({scenario:p.scenario,result:r.result,checks:r.checks,failures:r.failures.length,gaps:r.gaps.length,unclassifiedDifferences:r.unclassifiedDifferences.length,naturalInputDifferences:r.naturalInputDifferences.length,conditionalRaceDifferences:r.conditionalRaceDifferences.length,output,sha256:sha256(fs.readFileSync(output))});console.log(JSON.stringify(results.at(-1)));}
            const result={kind:'actual-saved-twelve-edge-window-comparison-matrix',result:results.every(x=>x.result==='pass-bounded-hook-window')?'pass-bounded-12-windows':'fail-or-uncertified',cases:results,excludedFailedEpochs:failedEpochs,fullPrefix40EqualityClaimed:false,G3Certified:false,G4Certified:false};fs.writeFileSync(path.join(outputDir,'matrix.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});process.exitCode=result.result==='pass-bounded-12-windows'?0:1;
        } else assert.fail('Use inventory <root> <newOutput>, pair <nestReport> <rustReport> <nestEvidence> <rustEvidence> <newOutput>, or matrix <root> <evidenceDir> <newOutputDir>');
    } catch(error){console.error(JSON.stringify({result:'failed-readonly-edge-comparison',name:error.name,reason:String(error.message).slice(0,400)}));process.exitCode=1;}
}
