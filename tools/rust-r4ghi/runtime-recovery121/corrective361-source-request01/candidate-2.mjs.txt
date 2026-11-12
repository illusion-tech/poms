// Fixed same-Source15 runtime121. No top-level task I/O/effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { C121, GH121, H3Changes121, ExternalChanges121, ExternalAdds121,
  sha121, plain121, keys121, canonical121, copy121, freeze121, pin121,
  pinOnly121, samePin121, sameIdentity121, pointer121, relative121, sources121,
  descriptors121, finiteDelta121, parentShape121, planShape121, scope121,
  assertRuntimeApproval121, registryBody121, candidateBody121, CORRECTIVE361,
  successorShape121, sourceWitnessShape121, retainedFourShape121, sourceOverlay121, successorHistory121 } from './runtime-admission-core121.mjs';
import { C15, GH15, sha15, pin15, pinOnly15, samePin15, keys15, pointer15,
  assertPlanShape15, assertApprovals15, scope15, exactDeltas15, assertStateTransfer15,
  resourceEntries15, registryBody15, admittedBody15, bootstrapBody15,
  producerHistory15, assertRetainedOwnership15, assertRawHistoryIdentity15,
  cargoEnvironment15 } from './source15-admission-core.mjs';
import { readPin15, json15, rows15, leaf15, helpers15, cargoFiles15,
  verifyArchive344For15 } from './retained-source14-for15.mjs';
import { verifyProductComposition15, verifyHelperComposition15, parseProc15 } from './source15-admission.mjs';
import { C252, sha252, samePin252, pointer252, assertPlanShape252,
  assertFinalProducer252, assertDataEqual252, sourceDeltas252, projectAnchors252,
  resourceProjection252, verifyProducerProjectBirth252, verifyRetainedMain252,
  assertApprovals252, producerHistory252, assertImmutableParents252 } from './same-m98-code-core252.mjs';
import { verifyLossEvidence25203, assertSupplementUnion25203 } from './same-m98-code-runtime-loss25203.mjs';
import { assertAuthorities25203, assertClosureDelta25203 } from './same-m98-code-composition25203.mjs';
import { verifySchemaBinding108 } from './schema-comparison108.mjs';
import { validateRegistryLineage62 } from './registry-lineage62.mjs';
import { verifyRetainedToolAdmission119252 } from './resource-tool-admission119.mjs';
import { assertRecorded } from './ledger.mjs';
import { bootstrapBody252, admittedBody252, registryBody252 } from './same-m98-code-admission252.mjs';
import { holderFacts, shape as rootAShape121, reviewBody as rootAReview121,
  verifySources as rootASources121 } from '../runtime-recovery121/root/facts121.mjs';
import { createContext as originalCreateContext } from './context.mjs';
import { newWitnessView284 } from '../legacy-authority15-284/facts284.mjs';
import { openConsumerView287 } from '../policy-continuation15-287/facts287.mjs';

const IO361={
  "freeze": {
    "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/Root-G3-code-input361.json",
    "bytes": 4167,
    "rawBytesSha256": "820f727595c37cbe7eae6aa53ff3b9606ae6f0922be237f63fb8eb26f534ae07"
  },
  "M06": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json",
    "bytes": 6150,
    "rawBytesSha256": "9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a"
  },
  "oldHelper229": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native06-source-promotion/e226bfb4-59e2-4fdb-9682-504c9a6cde61/actual-helper-pins229.json",
    "bytes": 35523,
    "rawBytesSha256": "df6c313c7e073704ccd4654b1521e4b28ab4fe9b18543b8d98f2823e519b0737"
  },
  "oldExternal55": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native06-source-promotion/e226bfb4-59e2-4fdb-9682-504c9a6cde61/actual-external-pins55.json",
    "bytes": 8818,
    "rawBytesSha256": "2b38bfa2b1a40ffa5b963809121ecdbd18d1e233d0459413059be62dea35b14e"
  },
  "oldExecution284": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native06-source-promotion/e226bfb4-59e2-4fdb-9682-504c9a6cde61/actual-execution-sources284.json",
    "bytes": 66309,
    "rawBytesSha256": "b196532840eaac9501b90032477ba74a3ee5810f1b32e010f6099b46ba4fc1c3"
  },
  "oldNativeStageManifest9": {
    "file": "/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime-recovery121-code06/sealed-code06/manifest-I121-code06.json",
    "bytes": 33419,
    "rawBytesSha256": "a3ea6d6ab4a656acac615447613a648e3a19a17f0f8bbe23771754ae4e158443"
  },
  "oldPlan": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native-plan-data/8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/native-plan121.json",
    "bytes": 77418,
    "rawBytesSha256": "4f1223c46875c7871414485526bb26728523e78dfbf281f3c491adcc8980c41e"
  },
  "oldRegistry": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/registry.json",
    "bytes": 133822,
    "rawBytesSha256": "873185734ca68b5ecd7bcc7e51b26046aefa75e0b8ccc0165a895f3c4049a83d"
  },
  "oldCandidate": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/candidate.json",
    "bytes": 126012,
    "rawBytesSha256": "fdef26addc5520c7ed4ee4008b9f6ba53e8f48df6403f125bdd274de37865af5"
  },
  "oldPublication": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/complete.json",
    "bytes": 1522,
    "rawBytesSha256": "03a7a4864a819ecd10fbf1c81fb7c9df30372d97fb8ac4bffe76666f3b76d4eb"
  },
  "oldPublicationReadback": {
    "file": "/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-Native-actual-publication-readback01/review-actual-Native-publication121.json",
    "bytes": 73073,
    "rawBytesSha256": "de863d7e0cd8b985f7c6470192a97ff5f807858ac5c2cb736d9fc2495d2dc394"
  },
  "currentFailedState32bd": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-prepare-failed01/82321806-8586-4210-b5cd-ef16311f63ce/after-state.json",
    "bytes": 14645579,
    "rawBytesSha256": "32bd6587911328886fc32e0ea40848107275fcaab889e2780098c2729097987b"
  },
  "failurePartial": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/tax118-invocation-82321806-8586-4210-b5cd-ef16311f63ce/partial.json",
    "bytes": 1493,
    "rawBytesSha256": "bc442c68bdf87b5bdc6a2328a0cadd6476f3c996392aaaff5e971a76a69e1045"
  },
  "failureRetention": {
    "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/prepare121-failed01/private-retention-metadata.json",
    "bytes": 4304,
    "rawBytesSha256": "73cd760679553eb181b3cf91e07093f305b79eb6958f8b00aa077eee38873ba6"
  },
  "failureReadback": {
    "file": "/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-prepare823-failure-diagnosis01/review-failure-diagnosis121.json",
    "bytes": 2930,
    "rawBytesSha256": "487ff3e2572c12059897fe574246e204b850587bb3bdc147073fe47ee3249d0e"
  },
  "retainedChangedSources": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective361-predecessor-source01/manifest.json",
    "bytes": 3631,
    "rawBytesSha256": "a226e77c98ff7546fe66354fa72b44e68cadfe23f0e45cdbc53e87b20142175a"
  },
  "old4Sources": [
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs",
      "bytes": 55792,
      "rawBytesSha256": "774eb76ed16eb1b6395e829b0087cf06a1f8e8f2ccf6d9b8df0609f139c034a8"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/runtime-admission-core121.mjs",
      "bytes": 17259,
      "rawBytesSha256": "58fea2219a71af3b643e932f440339f330d5f4223567e4a3bcb7b2d84221dd43"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/runtime-admission121.mjs",
      "bytes": 93676,
      "rawBytesSha256": "ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs",
      "bytes": 9945,
      "rawBytesSha256": "b85d0d4904d682dad322ec9ea2a48efbaec3950b825fa34cfcf42a9255ef8924"
    }
  ],
  "APIProcess": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/rust-api121-process.json",
    "bytes": 5775,
    "rawBytesSha256": "f822ffcd0e027c93c20ca6f5630bb2be44d738c1127199d30cbe3abfc2caa38f"
  },
  "failureNonce": "82321806-8586-4210-b5cd-ef16311f63ce",
  "G1B": {
    "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json",
    "bytes": 5254,
    "rawBytesSha256": "be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc"
  },
  "predecessorEntry": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native-entry-snapshots06/8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/entry-state.json",
    "bytes": 14246666,
    "rawBytesSha256": "952f661ec8330472f83b3e6bb309d11cb7c2faaaca52fed5782d287ac4004a53"
  }
};
const OLD_H3_361=["tools/rust-r4ghi/business/consumer-admission54.mjs","tools/rust-r4ghi/business/fault-sweep.mjs","tools/rust-r4ghi/business/gh-write-facts.mjs","tools/rust-r4ghi/business/http.mjs","tools/rust-r4ghi/business/labor-mask15.mjs","tools/rust-r4ghi/business/policy-current-h46-15.mjs","tools/rust-r4ghi/business/policy-security-bindings15.json","tools/rust-r4ghi/business/policy-security-runtime15.mjs","tools/rust-r4ghi/business/runtime-admission-core121.mjs","tools/rust-r4ghi/business/runtime-admission121.mjs","tools/rust-r4ghi/business/trusted.mjs"];
const OLD_EXT_361=["tools/rust-r4ghi/legacy-authority15-284/driver284.mjs","tools/rust-r4ghi/legacy-authority15-284/runtime284.mjs","tools/rust-r4ghi/legacy-authority15-284/wire284.mjs","tools/rust-r4ghi/legacy-authority15-284/witness284.mjs","tools/rust-r4ghi/mixed15-271/driver271.mjs","tools/rust-r4ghi/mixed15-271/facts271.mjs","tools/rust-r4ghi/mixed15-271/runtime271.mjs","tools/rust-r4ghi/mixed15-271/transport271.mjs","tools/rust-r4ghi/period15-270/driver270.mjs","tools/rust-r4ghi/period15-270/runtime270.mjs","tools/rust-r4ghi/policy-continuation15-287/run287.mjs","tools/rust-r4ghi/policy-role15/setup-role15.mjs","tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs","tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs","tools/rust-r4ghi/tax15-invocation118/run-tax15-once.mjs","tools/rust-r4ghi/tax15-invocation118/tax15-once-effects.mjs","tools/rust-r4ghi/tax15-invocation118/tax15-once-wire.mjs","tools/rust-r4ghi/tax15-invocation118/tax15-prepare.mjs","tools/rust-r4ghi/tax15-readonly/facts15.mjs","tools/rust-r4ghi/tax15-readonly/runtime15.mjs","tools/rust-r4ghi/runtime-recovery121/native/input121.template.json","tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs","tools/rust-r4ghi/runtime-recovery121/root/dispatch121.mjs","tools/rust-r4ghi/runtime-recovery121/root/facts121.mjs","tools/rust-r4ghi/runtime-recovery121/root/hold-runtime121.mjs","tools/rust-r4ghi/runtime-recovery121/root/observe-conservation121.mjs","tools/rust-r4ghi/runtime-recovery121/root/prepare121.mjs","tools/rust-r4ghi/runtime-recovery121/root/resume-original-pg121.mjs","tools/rust-r4ghi/runtime-recovery121/root/start-api121.mjs","tools/rust-r4ghi/runtime-recovery121/root/start-holder121.ps1"];

// Built-in-only file proof. Kept byte-identical in Native and preimport publisher.
function readSuccessorFiles361(plan,reader){
 const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',priv='/home/wangzishi/.local/share/poms-r4ghi/private';
 const keys=(v,k)=>{assert(v&&Object.getPrototypeOf(v)===Object.prototype);assert.deepEqual(Object.keys(v).sort(),[...k].sort());};
 const shape=p=>{keys(p,Object.hasOwn(p??{},'bytes')?['file','bytes','rawBytesSha256']:['file','rawBytesSha256']);assert(typeof p.file==='string'&&p.file.startsWith('/')&&path.posix.resolve(p.file)===p.file&&!p.file.includes('\\')&&!p.file.includes('//')&&!/[\0\r\n]/.test(p.file));assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(p.bytes!==undefined)assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);};
 const same=(a,b)=>{shape(a);shape(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);if(a.bytes!==undefined&&b.bytes!==undefined)assert.equal(a.bytes,b.bytes);};
 const full=p=>{keys(p,['file','bytes','rawBytesSha256']);shape(p);};
 const raw=p=>{shape(p);return reader(p);},get=p=>JSON.parse(raw(p));
 const norm=a=>{assert(Array.isArray(a));const b=a.map(p=>{shape(p);assert(p.file.startsWith(root+'/'));return{file:p.file,rawBytesSha256:p.rawBytesSha256};}).sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file)));assert.equal(new Set(b.map(p=>p.file)).size,b.length);return b;};
 const desc=(a,n)=>{assert(Array.isArray(a)&&a.length===n);for(const p of a){keys(p,['file','sha256']);assert(typeof p.file==='string'&&!p.file.startsWith('/')&&!p.file.includes('\\')&&!p.file.includes('//')&&!p.file.split('/').some(x=>!x||x==='.'||x==='..'));assert(/^[a-f0-9]{64}$/.test(p.sha256));}assert.deepEqual(a,[...a].sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file))));assert.equal(new Set(a.map(p=>p.file)).size,n);return a;};
 const merged=(h,e)=>norm([...h,...e].map(p=>({file:root+'/'+p.file,rawBytesSha256:p.sha256})));
 const pointer=(o,p)=>{assert(typeof p==='string'&&/^\/(?:production)\/(?:0|[1-9][0-9]*)$/.test(p));return p.slice(1).split('/').reduce((v,k)=>v[k],o);};
 const freeze=get(IO361.freeze);assert.equal(freeze.kind,'Root-frozen-runtime121-corrective361-G3-code-input');assert.equal(freeze.codeImplementationGranted,true);assert.equal(freeze.actualG2Authorized,false);
 keys(plan,['kind','protocolVersion','namespace','epoch','run','nonce','base','current','composition','stateTransfer','tooling','outputs']);keys(plan.current,['sourcePins','compilePins','helperPins','helperCount','binary','summaryBinary','binaryFiles','nodeExecutable','lifetimeOwner','PGStart','PGConservation','apiProcess','readiness']);keys(plan.composition,['helperComposition','externalComposition','independentCodeReviews']);keys(plan.tooling,['manifest','executionSources']);keys(plan.outputs,['registryFile','candidateFile','receiptDirectory']);assert.equal(plan.protocolVersion,2);keys(plan.stateTransfer,['expectedState','expectedOwnership','actorCacheDelta','successor']);full(plan.stateTransfer.successor);
 const successor=get(plan.stateTransfer.successor);keys(successor,['kind','schemaVersion','predecessorPlan','predecessorRegistry','predecessorCandidate','predecessorPublication','predecessorReadback','retainedCurrentState','failurePartial','failureRetention','failureReadback','sourceWitness']);assert.equal(successor.kind,'Root-runtime121-client-successor-handoff');assert.equal(successor.schemaVersion,1);
 const sf={predecessorPlan:'oldPlan',predecessorRegistry:'oldRegistry',predecessorCandidate:'oldCandidate',predecessorPublication:'oldPublication',predecessorReadback:'oldPublicationReadback',retainedCurrentState:'currentFailedState32bd',failurePartial:'failurePartial',failureRetention:'failureRetention',failureReadback:'failureReadback'};
 for(const[k,name]of Object.entries(sf)){full(successor[k]);assert.deepEqual(successor[k],IO361[name]);raw(successor[k]);}full(successor.sourceWitness);same(plan.stateTransfer.expectedState,successor.retainedCurrentState);
 const witness=get(successor.sourceWitness);keys(witness,['kind','schemaVersion','baselineCompositionComplete','baselineHelperPins','baselineExternalPins','baselineExecutionSources','baselineStageManifest','retainedChangedSources','successorManifest','successorCodeReview','currentHelperPins','currentExternalPins','currentExecutionSources']);assert.equal(witness.kind,'Root-runtime121-two-stage-client-source-witness');assert.equal(witness.schemaVersion,1);
 const wf={baselineCompositionComplete:'M06',baselineHelperPins:'oldHelper229',baselineExternalPins:'oldExternal55',baselineExecutionSources:'oldExecution284',baselineStageManifest:'oldNativeStageManifest9',retainedChangedSources:'retainedChangedSources'};for(const[k,name]of Object.entries(wf)){full(witness[k]);assert.deepEqual(witness[k],IO361[name]);}for(const k of['successorManifest','successorCodeReview','currentHelperPins','currentExternalPins','currentExecutionSources'])full(witness[k]);same(witness.successorManifest,plan.tooling.manifest);same(witness.currentHelperPins,plan.current.helperPins);
 const retained=get(witness.retainedChangedSources);keys(retained,['kind','recordedAt','compositionComplete','oldGraph','oldExecutionCount','mappings','remainingUnchangedMembers','allOld284CurrentlyRawMatched','oldM06AndReviewsUnmodified','newSourceOrGraphCreated','productionWritten','canonicalStateWritten','modeExecuted','actualG2Granted']);assert.equal(retained.kind,'Root-fixed-four-predecessor-source-retained361');same(retained.compositionComplete,witness.baselineCompositionComplete);same(retained.oldGraph,witness.baselineExecutionSources);assert.equal(retained.oldExecutionCount,284);assert.equal(retained.remainingUnchangedMembers,280);assert.equal(retained.allOld284CurrentlyRawMatched,true);assert.equal(retained.oldM06AndReviewsUnmodified,true);for(const k of['newSourceOrGraphCreated','productionWritten','canonicalStateWritten','modeExecuted','actualG2Granted'])assert.equal(retained[k],false);assert(Array.isArray(retained.mappings)&&retained.mappings.length===4);const copies=new Map();
 for(const m of retained.mappings){keys(m,['relative','original','retainedCopy']);const p=IO361.old4Sources.find(p=>p.file===root+'/'+m.relative);assert(p&&!copies.has(p.file));full(m.original);assert.deepEqual(m.original,p);full(m.retainedCopy);assert(m.retainedCopy.file.startsWith(priv+'/runtime121-corrective361-predecessor-source01/'));assert.equal(m.retainedCopy.bytes,p.bytes);assert.equal(m.retainedCopy.rawBytesSha256,p.rawBytesSha256);raw(m.retainedCopy);copies.set(p.file,m);}
 assert.equal(copies.size,4);const historicalRead=p=>{const m=copies.get(p.file);if(m){same(p,m.original);return raw(m.retainedCopy);}return raw(p);};
 const historicalJSON=p=>JSON.parse(historicalRead(p));
 const baseline=get(witness.baselineCompositionComplete);assert.equal(baseline.kind,'Root-runtime121-Native06-composition-materialized');assert.equal(baseline.rootSourceRawRechecked,true);assert.equal(baseline.oldInputsUnmodified,true);same(baseline.actualGraphs.helper,witness.baselineHelperPins);same(baseline.actualGraphs.external,witness.baselineExternalPins);same(baseline.actualGraphs.execution,witness.baselineExecutionSources);
 const oldHelpers=desc(get(witness.baselineHelperPins),229),oldExternal=desc(get(witness.baselineExternalPins),55),oldGraph=get(witness.baselineExecutionSources);assert.equal(oldGraph.length,284);assert.deepEqual(merged(oldHelpers,oldExternal),norm(oldGraph));assert.deepEqual(norm(get(baseline.normalizedExecutionSources)),norm(oldGraph));
 const baselineComposition=get(baseline.planComposition);keys(baselineComposition,['helperComposition','externalComposition','independentCodeReviews']);same(baselineComposition.helperComposition,baseline.helperComposition);same(baselineComposition.externalComposition,baseline.externalComposition);assert(Array.isArray(baselineComposition.independentCodeReviews)&&baselineComposition.independentCodeReviews.length===3);
 const oldPlan=get(successor.predecessorPlan),oldRegistry=get(successor.predecessorRegistry),oldCandidate=get(successor.predecessorCandidate),oldPublication=get(successor.predecessorPublication),oldReadback=get(successor.predecessorReadback),predecessorState=get(successor.retainedCurrentState);assert.equal(oldPlan.kind,'source15-append-runtime-plan121');assert.equal(oldPlan.protocolVersion,1);assert.deepEqual(oldPlan.base,plan.base);same(oldPlan.current.helperPins,witness.baselineHelperPins);same(oldPlan.tooling.manifest,witness.baselineStageManifest);assert.deepEqual(norm(oldPlan.tooling.executionSources),norm(oldGraph));assert.deepEqual(oldPlan.composition,baselineComposition);for(const key of Object.keys(oldPlan.current).filter(k=>k!=='helperPins'))assert.deepEqual(plan.current[key],oldPlan.current[key],'Client successor cannot replace service/current evidence '+key);same(plan.current.apiProcess,IO361.APIProcess);
 same(oldRegistry.approvedPlan,successor.predecessorPlan);same(oldCandidate.runtimeAdmission121,successor.predecessorRegistry);assert.equal(oldPublication.kind,'actual-Source15-runtime121-FS-publication-complete');assert.equal(oldPublication.statePublished,true);same(oldPublication.input,successor.predecessorPlan);same(oldPublication.registry,successor.predecessorRegistry);same(oldPublication.candidate,successor.predecessorCandidate);assert.equal(oldReadback.kind,'non-author-runtime121-actual-FS-publication-readback');assert.equal(oldReadback.verdict,'approved-actual-exact-FS-runtime-publication-readback');assert.equal(oldReadback.reviewerIsPublicationExecutor,false);same(oldReadback.complete,successor.predecessorPublication);same(oldReadback.plan,successor.predecessorPlan);same(oldReadback.registry,successor.predecessorRegistry);same(oldReadback.candidate,successor.predecessorCandidate);same(oldReadback.immutablePrivateEntrySnapshot,IO361.predecessorEntry);assert.equal(oldReadback.entrySnapshotRawEqualCanonicalAndPhysicalInodeDistinct,true);raw(IO361.predecessorEntry);
 same(predecessorState.runtimeAdmission121.registry,successor.predecessorRegistry);same(predecessorState.runtimeAdmission121.candidate,successor.predecessorCandidate);assert.equal(predecessorState.taxContinuation121?.kind,'current-Source15-runtime121-consumer-of-retained-real-tax-producer');assert.equal(predecessorState.consumerChecks?.taxInvocation121?.invocations?.[IO361.failureNonce]?.phase,'failed-preserve');
 const historicalTooling=get(witness.baselineStageManifest);assert.equal(historicalTooling.kind,'I-runtime121-code-candidate');assert.equal(historicalTooling.production.length,9);for(const e of historicalTooling.production){const p=oldGraph.find(p=>p.file===root+'/'+e.file);assert(p&&p.rawBytesSha256===e.afterSHA256);}
 const h=historicalJSON(baseline.helperComposition),e=historicalJSON(baseline.externalComposition);assert.equal(h.kind,'Root-Source15-runtime121-H3-composition');assert.equal(e.kind,'Root-Source15-runtime121-external-composition');same(h.finalHelperPins,witness.baselineHelperPins);same(h.baseHelperPins,oldPlan.base.helperPins227);assert.deepEqual(e.finalSources,oldExternal);
 const apply=(before,after,frames,allowed)=>{const map=new Map(before.map(p=>[p.file,p.sha256])),seen=new Set();for(const f of frames){keys(f,['file','operation','beforeSHA256','afterSHA256','candidate','componentManifest','productPointer','independentReview','technicalG1']);assert(allowed.includes(f.file)&&!seen.has(f.file));seen.add(f.file);assert.equal(f.beforeSHA256,map.get(f.file)??null);assert.equal(f.operation,f.beforeSHA256===null?'ADD':'MOD');assert.notEqual(f.beforeSHA256,f.afterSHA256);assert.equal(f.candidate.rawBytesSha256,f.afterSHA256);historicalRead(f.candidate);raw(f.technicalG1);assert(['c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b','96f0090e2965cc96e9557ff297192ecad15f712b74e39934bb00b2396e1a4b3c','ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad','b4d05c19a867b4f4e1990e36b4a742cd23e00958fb0bae6e7e5725e96cc7b15f','be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc','72dc2677f51b2a430b5970a81b40b9301aaf3d97dd9f00f2b8fe6356a90748cb','77083554eb09b8cfb24ddee8bfe4fdc75d2261f01a5a6462a0a309815dcfe714'].includes(f.technicalG1.rawBytesSha256));const m=historicalJSON(f.componentManifest),node=pointer(m,f.productPointer),r=historicalJSON(f.independentReview);assert.equal(node.file,f.file);assert.equal(node.beforeSHA256,f.beforeSHA256);assert.equal(node.afterSHA256,f.afterSHA256);same(node.candidate,f.candidate);assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);assert(typeof r.author==='string'&&r.author&&typeof r.reviewer==='string'&&r.reviewer&&r.author!==r.reviewer);same(r.componentManifest,f.componentManifest);same(r.technicalG1,f.technicalG1);assert(baselineComposition.independentCodeReviews.some(p=>p.file===f.independentReview.file&&p.rawBytesSha256===f.independentReview.rawBytesSha256));assert(r.entries.some(q=>q.file===f.file&&q.beforeSHA256===f.beforeSHA256&&q.afterSHA256===f.afterSHA256&&q.productPointer===f.productPointer));map.set(f.file,f.afterSHA256);}assert.deepEqual([...seen].sort(),[...allowed].sort());assert.deepEqual([...map].map(([file,sha256])=>({file,sha256})).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file))),after);};
 apply(desc(historicalJSON(h.baseHelperPins),227),oldHelpers,h.frames,OLD_H3_361);apply(desc(e.baseSources,45),oldExternal,e.frames,OLD_EXT_361);for(const p of oldGraph)historicalRead(p);for(const p of baselineComposition.independentCodeReviews)historicalRead(p);
 const currentHelpers=desc(get(witness.currentHelperPins),229),currentExternal=desc(get(witness.currentExternalPins),55),currentGraph=get(witness.currentExecutionSources);assert.equal(currentGraph.length,284);assert.deepEqual(merged(currentHelpers,currentExternal),norm(currentGraph));assert.deepEqual(currentGraph,plan.tooling.executionSources);assert.deepEqual(norm(currentGraph),norm(plan.tooling.executionSources));assert.deepEqual(norm(currentGraph).map(p=>p.file),norm(oldGraph).map(p=>p.file));assert.deepEqual(oldHelpers.map(p=>p.file),currentHelpers.map(p=>p.file));assert.deepEqual(oldExternal.map(p=>p.file),currentExternal.map(p=>p.file));
 const manifest=get(witness.successorManifest),review=get(witness.successorCodeReview);assert.equal(manifest.kind,'I-runtime121-code-candidate');assert.equal(manifest.edition,361);same(manifest.correctiveG3,IO361.freeze);assert(Array.isArray(manifest.production)&&manifest.production.length===4);assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');assert.equal(review.reviewerIsAuthor,false);assert(typeof review.author==='string'&&review.author&&typeof review.reviewer==='string'&&review.reviewer&&review.author!==review.reviewer);same(review.componentManifest,witness.successorManifest);same(review.technicalG1,IO361.G1B);same(review.correctiveG3,IO361.freeze);assert(Array.isArray(review.entries)&&review.entries.length===4);
 const seenNew=new Set();for(const [i,p]of manifest.production.entries()){const old=IO361.old4Sources.find(q=>q.file===root+'/'+p.file);assert(old&&!seenNew.has(p.file));seenNew.add(p.file);assert.equal(p.operation,'MOD');assert.equal(p.beforeSHA256,old.rawBytesSha256);const now=currentGraph.find(q=>q.file===old.file);assert(now&&now.rawBytesSha256===p.afterSHA256);assert.notEqual(p.beforeSHA256,p.afterSHA256);full(p.candidate);assert.equal(p.candidate.rawBytesSha256,p.afterSHA256);raw(p.candidate);assert(review.entries.some(q=>q.file===p.file&&q.beforeSHA256===p.beforeSHA256&&q.afterSHA256===p.afterSHA256&&q.productPointer==='/production/'+i));}
 assert.deepEqual([...seenNew].sort(),IO361.old4Sources.map(p=>p.file.slice(root.length+1)).sort());const changed=[];const oldIds=norm(oldGraph),newIds=norm(currentGraph);for(let i=0;i<oldIds.length;i++)if(oldIds[i].rawBytesSha256!==newIds[i].rawBytesSha256)changed.push(oldIds[i].file);assert.deepEqual(changed.sort(),IO361.old4Sources.map(p=>p.file).sort());for(const p of currentGraph)raw(p);
 const helperComposition=get(plan.composition.helperComposition),externalComposition=get(plan.composition.externalComposition);keys(helperComposition,['kind','schemaVersion','baseline','finalHelperPins','sourceWitness']);assert.equal(helperComposition.kind,'Root-Source15-runtime121-H3-successor-composition');assert.equal(helperComposition.schemaVersion,2);same(helperComposition.baseline,baseline.helperComposition);same(helperComposition.finalHelperPins,witness.currentHelperPins);same(helperComposition.sourceWitness,successor.sourceWitness);keys(externalComposition,['kind','schemaVersion','baseline','finalSources','sourceWitness']);assert.equal(externalComposition.kind,'Root-Source15-runtime121-external-successor-composition');assert.equal(externalComposition.schemaVersion,2);same(externalComposition.baseline,baseline.externalComposition);assert.deepEqual(externalComposition.finalSources,currentExternal);same(externalComposition.sourceWitness,successor.sourceWitness);
 const reviewIds=a=>{assert(Array.isArray(a));const b=a.map(p=>{shape(p);return{file:p.file,rawBytesSha256:p.rawBytesSha256};}).sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file)));assert.equal(new Set(b.map(p=>p.file)).size,b.length);return b;};assert.deepEqual(reviewIds(plan.composition.independentCodeReviews),reviewIds([...baselineComposition.independentCodeReviews,witness.successorCodeReview]));
 return{successor,witness,retained,copies,predecessorState,oldPlan,oldRegistry,oldCandidate,oldPublication,baseline,baselineComposition,oldHelpers,oldExternal,oldGraph,helpers:currentHelpers,external:currentExternal,executionSources:norm(currentGraph),manifest,review,historicalRead,historicalJSON,helperComposition,externalComposition};
}

const data15=C121.private+'/business/'+C121.epoch+'/'+C121.run;
const json=json15,readPin252=readPin15,rows252=rows15,sort=x=>[...x].sort();
const same=(a,b)=>sameIdentity121(a,b);
function inside(root,file) {
  assert(file.startsWith(root+'/')); assert.equal(fs.realpathSync(file),file);
}
function read121(pin) {
  pin121(pin); assert.equal(path.resolve(pin.file),pin.file);
  const st=fs.lstatSync(pin.file); assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);
  assert.equal(fs.realpathSync(pin.file),pin.file);
  const bytes=fs.readFileSync(pin.file);assert.equal(sha121(bytes),pin.rawBytesSha256);
  if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes);return bytes;
}
const json121=pin=>JSON.parse(read121(pin));
function binaryBytes121(pin) {
  pin121(pin);assert.equal(path.resolve(pin.file),pin.file);
  const st=fs.lstatSync(pin.file,{bigint:true});
  assert(st.isFile()&&!st.isSymbolicLink());assert.equal(fs.realpathSync(pin.file),pin.file);
  assert(st.nlink>=1n);const bytes=fs.readFileSync(pin.file);
  assert.equal(sha121(bytes),pin.rawBytesSha256);
  if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes);
  return {file:pin.file,rawBytesSha256:pin.rawBytesSha256,bytes:bytes.length,
    dev:st.dev.toString(),ino:st.ino.toString(),nlink:Number(st.nlink)};
}
function historicalBinaryIdentity121(value) {
  // Finite historical union only. Ordinary/current inputs still use pin121.
  plain121(value,'historical binary identity');
  const typed=['dev','ino','nlink'].some(key=>Object.hasOwn(value,key));
  if(!typed)return pin121(value);
  keys121(value,['file','bytes','rawBytesSha256','dev','ino','nlink'],'historical typed binary');
  const identity=pin121({file:value.file,bytes:value.bytes,rawBytesSha256:value.rawBytesSha256});
  for(const key of ['dev','ino'])assert(typeof value[key]==='string'&&/^\d+$/.test(value[key]));
  assert(Number.isSafeInteger(value.nlink)&&value.nlink>=1);
  return identity;
}
function historicalBinary121(pin,facts) {
  // Old stat remains the original six-key record, never a current stat claim.
  const identity=historicalBinaryIdentity121(pin);assert(Array.isArray(facts));
  const f=facts.find(x=>x.file===identity.file);assert(f);
  // Actual Source14 facts omit bytes; never fill that old record from now.
  const hasBytes=Object.hasOwn(f,'bytes');
  keys121(f,hasBytes?['file','bytes','rawBytesSha256','dev','ino','nlink']:
    ['file','rawBytesSha256','dev','ino','nlink'],'historical binary fact');
  const historical=pin121(hasBytes?{file:f.file,bytes:f.bytes,rawBytesSha256:f.rawBytesSha256}:
    {file:f.file,rawBytesSha256:f.rawBytesSha256});
  for(const key of ['dev','ino'])assert(typeof f[key]==='string'&&/^\d+$/.test(f[key]));
  assert(Number.isSafeInteger(f.nlink)&&f.nlink>=1);samePin121(historical,identity);
  if(identity.bytes!==undefined&&hasBytes)assert.equal(identity.bytes,historical.bytes);
  if(Object.hasOwn(pin,'dev'))for(const key of ['dev','ino','nlink'])assert.equal(pin[key],f[key]);
  const observed=binaryBytes121(identity);if(hasBytes)assert.equal(observed.bytes,historical.bytes);
  return f;
}
function currentBinary121(pin,facts) {
  const observed=binaryBytes121(pin),f=facts.find(x=>x.file===pin.file);assert(f);
  samePin121(f,pin);
  for(const key of ['dev','ino','nlink'])assert.equal(f[key],observed[key]);
  if(f.bytes!==undefined)assert.equal(f.bytes,observed.bytes);
  return observed;
}
function independent121(review,kind,verdict) {
  assert.equal(review.kind,kind);assert.equal(review.verdict,verdict);
  assert.equal(review.reviewerIsAuthor,false);
  if(review.author!==undefined&&review.reviewer!==undefined)assert.notEqual(review.author,review.reviewer);
}
function archive121(base) {
  const a=json121(base.sourceArchive121),b=json121(base.sourceArchiveSupplement121);
  assert.equal(a.kind,'Root-private-original-Source15-source-archive121');
  assert.equal(b.kind,'Root-private-original-Source15-source-archive-supplement121');
  samePin121(b.baseArchive,base.sourceArchive121);
  samePin121(a.originalReg5,base.codeAdmission15);
  samePin121(a.originalPlan,base.approvedCodePlan15);
  samePin121(a.originalH3Pins,base.helperPins227);
  assert.equal(a.uniqueSourceCount,266);assert.equal(a.mappings.length,266);
  assert.equal(b.sourceCount,4);assert.equal(b.mappings.length,4);assert.equal(b.combinedUniqueSourceCount,270);
  for(const flag of ['originalPinsAndPathsUnmodified','currentSourcesNotPromoted'])assert.equal(a[flag],true);
  for(const flag of ['oldSourceExecutionGranted','nativeAuthorityGranted'])assert.equal(a[flag],false);
  assert.equal(b.originalsUnmodified,true);assert.equal(b.baseArchiveUnmodified,true);
  assert.equal(b.oldSourceExecutionGranted,false);
  const index=new Map();
  for(const item of [...a.mappings,...b.mappings]) {
    pin121(item.originalPin);pin121(item.privateRawCopy);
    assert(item.originalPin.file.startsWith(C121.root+'/'));
    assert(item.privateRawCopy.file.startsWith(C121.private+'/base-source15-retained121'));
    assert.notEqual(item.privateRawCopy.file,item.originalPin.file);
    assert(!index.has(item.originalPin.file),'Duplicate original-source map');
    assert.equal(item.privateRawCopy.rawBytesSha256,item.originalPin.rawBytesSha256);
    const bytes=read121(item.privateRawCopy);
    if(item.originalPin.bytes!==undefined)assert.equal(bytes.length,item.originalPin.bytes);
    index.set(item.originalPin.file,{...item,bytes});
  }
  assert.equal(index.size,270);
  const helper=json121(base.helperPins227);descriptors121(helper,227);
  const originalPlan=json121(base.approvedCodePlan15);
  const taxManifest=json121(a.TaxCode02Manifest),callerManifest=json121(a.callerCode02Manifest);
  assert.equal(a.TaxCode02Manifest.rawBytesSha256,
    'e798873c3abf8adac3d1b29104aee13725b5ac2b0ab8ae01190e88eb30bcd548');
  assert.equal(a.callerCode02Manifest.rawBytesSha256,
    '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');
  const entries=manifest=>{
    const list=manifest.production??manifest.products;
    assert(Array.isArray(list));return list;
  };
  const expected=new Map();
  const add=(file,hash)=>{
    assert(file.startsWith(C121.root+'/'));assert(/^[a-f0-9]{64}$/.test(hash));
    if(expected.has(file))assert.equal(expected.get(file),hash);
    expected.set(file,hash);
  };
  for(const p of helper)add(C121.root+'/'+p.file,p.sha256);
  for(const p of originalPlan.tooling.executionSources)add(p.file,p.rawBytesSha256);
  for(const manifest of [taxManifest,callerManifest])for(const e of entries(manifest))
    add(C121.root+'/'+e.file,e.afterSHA256??e.afterRawBytesSha256);
  for(const n of ['tax15-readonly/runtime15.mjs','tax15-readonly/facts15.mjs',
    'policy-role15/setup-role15.mjs','policy-role15/input15.template.json']) {
    const file=C121.root+'/tools/rust-r4ghi/'+n,item=index.get(file);assert(item);
    add(file,item.originalPin.rawBytesSha256);
  }
  assert.equal(expected.size,270);
  assert.deepEqual([...index.keys()].sort(),[...expected.keys()].sort());
  for(const [file,hash]of expected)assert.equal(index.get(file).originalPin.rawBytesSha256,hash);
  return {base:a,supplement:b,index,helper,originalPlan};
}
function historicalSource121(archive,pin) {
  pin121(pin);const found=archive.index.get(pin.file);assert(found,'No historical-source fallback');
  samePin121(found.originalPin,pin);
  // Reread immutable copy, never import or evaluate it.
  return read121(found.privateRawCopy);
}

function originalCode15_121(base,archive,parent14) {
  const p=archive.originalPlan;assertPlanShape15(p,'publish');
  const source=json121(base.sourcePins),compile=json121(base.compilePins),helper=archive.helper;
  descriptors121(source,420);descriptors121(compile,528);
  samePin121(p.consumer.sourcePins,base.sourcePins);
  samePin121(p.consumer.compilePins,base.compilePins);
  samePin121(p.consumer.helperPins,base.helperPins227);
  samePin121(p.consumer.buildBinding,base.buildBinding);
  assert.equal(p.consumer.sourceCount,420);assert.equal(p.consumer.helperCount,227);
  assert.equal(p.consumer.sourcePinsSHA256,sha121(JSON.stringify(source)));
  const deltas=verifyProductComposition15(p.productComposition,parent14,source,compile);
  assert.deepEqual(p.sourceDeltas,deltas);
  const helperComposition=verifyHelperComposition15(p.helperComposition,parent14,helper);
  const manifest=json121(p.tooling.manifest),review=json121(p.tooling.independentCodeReview);
  assert.equal(manifest.kind,'source15-admission119-code-candidate');
  assert.equal(review.kind,'non-author-source15-admission119-code-review');
  assert.equal(review.complete119CodeReady,true);assert.equal(review.actualG2Authorized,false);
  samePin121(review.toolingManifest,p.tooling.manifest);
  assert.equal(manifest.production.length,14);assert.equal(p.tooling.executionSources.length,14);
  for(const e of manifest.production) {
    const file=C121.root+'/'+e.file,pin=p.tooling.executionSources.find(x=>x.file===file);
    assert(pin);assert.equal(pin.rawBytesSha256,e.afterSHA256);
    historicalSource121(archive,pin);
    if(e.group==='H3')assert.equal(helper.find(x=>x.file===e.file)?.sha256,e.afterSHA256);
  }
  historicalBuild15_121(p.consumer,source,compile,helper,parent14);
  assertStateTransfer15(p.stateTransfer,parent14.state);
  assert.deepEqual(p.resources,resourceEntries15(parent14));
  assertApprovals15(p,json121(p.independentReview),json121(p.RootExecutionApproval));
  const process=json121(p.consumer.apiProcess);
  assert.equal(process.kind,'actual-source15-owned-API-process119');
  assert.equal(process.epoch,C121.epoch);assert.equal(process.namespace,C121.namespace);
  assert.equal(process.binary,p.consumer.binary.file);
  assert.equal(process.binarySha256,p.consumer.binary.rawBytesSha256);
  assert.deepEqual(process.binaryFiles,p.consumer.binaryFiles);
  samePin121(process.buildBinding,p.consumer.buildBinding);
  assert.deepEqual(process.code,p.tooling.executionSources);
  for(const pin of process.code)historicalSource121(archive,pin);
  read121(process.input);read121(process.normalEnv);read121(process.baseNormalEnv);
  const rawReady=json121(process.readinessAttempt),ready=json121(p.consumer.readiness);
  assert.equal(rawReady.method,'GET');assert.equal(rawReady.url,'http://127.0.0.1:31441/api/health/readiness');
  assert.equal(rawReady.status,200);assert.equal(JSON.parse(rawReady.body).status,'ready');
  assert.deepEqual(ready,{mode:'start',port:31441,readiness:200,
    privateCredentialsPrinted:false,pid:process.pid,binarySha256:process.binarySha256});
  const b0=json121(p.consumer.bootstrapCandidate),bootstrapPlan=json121(b0.candidateInput);
  const bootstrapApproval=json121(b0.bootstrapOnlyG2);
  assertPlanShape15(bootstrapPlan,'bootstrap');assert.equal(scope15(bootstrapPlan),scope15(p));
  assert.equal(bootstrapApproval.kind,'Root-authorized-source15-bootstrap-only119');
  samePin121(bootstrapApproval.candidateInput,b0.candidateInput);
  assert.equal(bootstrapApproval.scope15,scope15(p));
  for(const key of ['publishState','ordinaryContext','domainEffects'])assert.equal(bootstrapApproval[key],false);
  assert.deepEqual(b0,bootstrapBody15(bootstrapPlan,b0.candidateInput,b0.bootstrapOnlyG2,process));
  const reg=json121(base.codeAdmission15),b1=json121(base.codeCandidate15);
  samePin121(reg.approvedPlan,base.approvedCodePlan15);
  const facts={parent:parent14,apiRecord:process,sourcePins:source,compilePins:compile,helperPins:helper,helperComposition};
  assert.deepEqual(reg,registryBody15(p,base.approvedCodePlan15,facts));
  assert.deepEqual(b1,admittedBody15(p,base.codeAdmission15,b0));
  samePin121(b1.consumerAdmission.registry,base.codeAdmission15);
  return {plan:p,registry:reg,candidate:b1,process,source,compile,helper};
}

function failedOrigin121(base,state,archive) {
  assert.equal(base.failedInvocationReview.rawBytesSha256,
    'da94da8ebcb29666a614bcd3f9377eb45fe8c05206396cb2eb82b3c0ce293ecd');
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

export function verifyRetainedSource15For121(base) {
  parentShape121(base);
  const archive=archive121(base),p=archive.originalPlan;
  const parent14=verifyRetained14Body15(p.parent14,true);
  const code=originalCode15_121(base,archive,parent14),state=json121(base.retainedState15);
  read121(base.ownership15);assert.equal(state.namespace,C121.namespace);
  assert.equal(state.epoch,C121.epoch);assert.equal(state.run,C121.run);
  assert(!Object.hasOwn(state,'runtimeAdmission121'));
  samePin121(state.consumerAdmission54.registry,base.codeAdmission15);
  samePin121(state.codeEpochAdmission15.registry,base.codeAdmission15);
  samePin121(state.codeEpochAdmission15.candidate,base.codeCandidate15);
  samePin121(state.codeEpochAdmission15.approvedPlan,base.approvedCodePlan15);
  samePin121(state.apiProcess,p.consumer.apiProcess);assert.deepEqual(state.apiProcess.record,code.process);
  assert.deepEqual(state.sourcePins,code.source);
  for(const key of ['baseline','schemaComparison108','taxContinuation13','taxContinuation14',
    'producerExecutionHistory252'])assert.deepEqual(state[key],parent14.state[key]);
  assert.deepEqual(state.producerExecutionHistory15,
    [...(parent14.state.producerExecutionHistory15??[]),producerHistory15(parent14.state,p)]);
  assertRetainedOwnership15(state,parent14.state);
  assert.deepEqual(code.registry.fixtureAdmissions,resourceEntries15(parent14));
  for(const entry of code.registry.fixtureAdmissions) {
    const value=pointer121(state,entry.registryPath);
    assert.equal(sha121(JSON.stringify(resourceProjection252(value,entry.mode))),entry.retainedProjectionSHA256);
  }
  const preparation=preparationOrigin121(base,state,archive,code);
  const failure=failedOrigin121(base,state,archive);
  return {kind:'verified-retained-source15-parent121',retainedParentOnly:true,
    currentRuntimeGranted:false,currentEffectsGranted:false,
    state,statePin:base.retainedState15,ownership:base.ownership15,resources:code.registry.fixtureAdmissions,
    Main13Bridge:parent14.Main13Bridge,preparationOrigin:preparation,failedAttemptDisposition:failure,
    archive:{base:base.sourceArchive121,supplement:base.sourceArchiveSupplement121},
    sourceArchive:archive,code};
}

function composition121(plan,parent,history=null) {
  if(plan.protocolVersion===2)return compositionSuccessor121(plan,parent);
  const stepRead121=history?history.historicalRead:read121, stepJSON121=history?history.historicalJSON:json121;
  const h=stepJSON121(plan.composition.helperComposition);
  assert.equal(h.kind,'Root-Source15-runtime121-H3-composition');
  samePin121(h.baseHelperPins,plan.base.helperPins227);
  samePin121(h.finalHelperPins,plan.current.helperPins);
  const helpers=stepJSON121(plan.current.helperPins);descriptors121(helpers,229);
  finiteDelta121(parent.code.helper,helpers,h.frames,H3Changes121);
  const beforeExternal=[...parent.sourceArchive.index.values()]
    .map(x=>({file:x.originalPin.file.slice(C121.root.length+1),sha256:x.originalPin.rawBytesSha256}))
    .filter(x=>!x.file.startsWith('tools/rust-r4ghi/business/'))
    .sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  const e=stepJSON121(plan.composition.externalComposition);
  assert.equal(e.kind,'Root-Source15-runtime121-external-composition');
  const dependency=protectedDependencies121(e.protectedDependencies,plan);
  for(const p of dependency.sources)beforeExternal.push({
    file:p.file.slice(C121.root.length+1),sha256:p.rawBytesSha256,
  });
  beforeExternal.sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  assert.equal(beforeExternal.length,45);
  assert.deepEqual(e.baseSources,beforeExternal);
  const external=e.finalSources;descriptors121(external);
  finiteDelta121(beforeExternal,external,e.frames,[...ExternalChanges121,...ExternalAdds121]);
  for(const frame of [...h.frames,...e.frames]) {
    stepRead121(frame.candidate);stepRead121(frame.technicalG1);
    assert([
      'c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b',
      '96f0090e2965cc96e9557ff297192ecad15f712b74e39934bb00b2396e1a4b3c',
      'ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad',
      'b4d05c19a867b4f4e1990e36b4a742cd23e00958fb0bae6e7e5725e96cc7b15f',
      C121.G1B,C121.CtorAppend,C121.policyAppend,
    ].includes(frame.technicalG1.rawBytesSha256),'Outside fixed source/protocol G1');
    const manifest=stepJSON121(frame.componentManifest),node=pointer121(manifest,frame.productPointer);
    assert(node);assert.equal(node.file,frame.file);
    assert.equal(node.beforeSHA256,frame.beforeSHA256);assert.equal(node.afterSHA256,frame.afterSHA256);
    samePin121(node.candidate,frame.candidate);
    const review=stepJSON121(frame.independentReview);
    independent121(review,'non-author-runtime121-finite-code-step','approved-bounded-step-only');
    assert(typeof review.author==='string'&&review.author&&typeof review.reviewer==='string'&&review.reviewer);
    assert.notEqual(review.author,review.reviewer);
    assert(plan.composition.independentCodeReviews.some(p=>same(p,frame.independentReview)),
      'Step review must belong to the approved complete review set');
    samePin121(review.componentManifest,frame.componentManifest);
    samePin121(review.technicalG1,frame.technicalG1);
    assert(review.entries.some(x=>x.file===frame.file&&x.beforeSHA256===frame.beforeSHA256&&
      x.afterSHA256===frame.afterSHA256&&x.productPointer===frame.productPointer));
  }
  for(const pin of plan.composition.independentCodeReviews)stepRead121(pin);
  const all=[...helpers,...external].map(x=>({file:C121.root+'/'+x.file,rawBytesSha256:x.sha256}));
  const expected=sources121(all,C121.root);
  assert.deepEqual(sources121(plan.tooling.executionSources,C121.root),expected);
  const tooling=stepJSON121(plan.tooling.manifest);
  assert.equal(tooling.kind,'I-runtime121-code-candidate');assert.equal(tooling.production.length,9);
  for(const entry of tooling.production) {
    const actual=expected.find(x=>x.file===C121.root+'/'+entry.file);assert(actual);
    assert.equal(actual.rawBytesSha256,entry.afterSHA256);
  }
  assert.equal(external.length,55);
  return {helpers,external,executionSources:expected,dependencySupplement:dependency.archive};
}
function compositionSuccessor121(plan,parent){
 const b=readSuccessorFiles361(plan,read121);successorShape121(b.successor);sourceWitnessShape121(b.witness);retainedFourShape121(b.retained);planShape121(b.oldPlan);
 const prior=composition121(b.oldPlan,parent,b);assert.deepEqual(prior.helpers,b.oldHelpers);assert.deepEqual(prior.external,b.oldExternal);assert.deepEqual(sources121(prior.executionSources,C121.root),sources121(b.oldGraph,C121.root));
 sourceOverlay121(b.oldGraph,plan.tooling.executionSources,b.oldHelpers,b.helpers,b.oldExternal,b.external,b.manifest.production);
 return{helpers:b.helpers,external:b.external,executionSources:b.executionSources,dependencySupplement:prior.dependencySupplement,successor:b};
}
function protectedDependencies121(r,plan) {
  keys121(r,['kind','sourceManifest','sourcePointer','sources','archive','independentReview','RootAppendFreeze']);
  assert.equal(r.kind,'Root-runtime121-fixed-protected261-registration');
  assert.equal(r.sourceManifest.rawBytesSha256,
    '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a');
  assert.equal(r.sourcePointer,'/protected261GenericDependencyOnly');
  const manifest=json121(r.sourceManifest),original=pointer121(manifest,r.sourcePointer);
  const fixed=[
    {file:C121.root+'/tools/rust-r4ghi/policy-replayless261-continuation03/cases261.mjs',
      rawBytesSha256:'a75d9dbed57869ca3299c7edcc2dd3bbdf526cf2a8cd21235e2aa8c0611f9331'},
    {file:C121.root+'/tools/rust-r4ghi/policy-replayless261-continuation03/core261.mjs',
      rawBytesSha256:'0fe889f86e59c253ca8e397338b535509d5ec0485a8ab09f6c5a7abf5bfef6d3'},
  ];
  assert.deepEqual(sources121(original,C121.root),sources121(fixed,C121.root));
  assert.deepEqual(sources121(r.sources,C121.root),sources121(fixed,C121.root));
  assert.equal(r.archive.rawBytesSha256,C121.dependencyArchive);
  assert.equal(r.RootAppendFreeze.rawBytesSha256,C121.dependencyAppend);
  assert.equal(r.independentReview.rawBytesSha256,
    '42226f43be965d3985f0140a66c946f7619e1f5f1eac32c80c096a67b1853b2f');
  read121(r.RootAppendFreeze);read121(r.independentReview);
  const map=json121(r.archive);
  assert.equal(map.kind,'Root-private-unchanged-generic261-source-supplement121');
  samePin121(map.baseArchive,plan.base.sourceArchive121);
  samePin121(map.H9Supplement,plan.base.sourceArchiveSupplement121);
  samePin121(map.originalCode120Manifest,r.sourceManifest);
  assert.equal(map.originalPointer,r.sourcePointer);
  assert.equal(map.sourceCount,2);assert.equal(map.combinedUniqueSourceCount,272);
  assert.equal(map.productionChanges,0);assert.equal(map.H3Changes,0);
  assert.equal(map.newCurrentRegistrationGranted,false);assert.equal(map.oldPinsAndSourcesUnmodified,true);
  assert.equal(map.mappings.length,2);
  assert.deepEqual(sources121(map.mappings.map(x=>x.originalPin),C121.root),sources121(fixed,C121.root));
  for(const m of map.mappings) {
    assert(m.privateRawCopy.file.startsWith(C121.private+'/base-source15-retained121-dependency-supplement01/'));
    assert.equal(m.originalPin.rawBytesSha256,m.privateRawCopy.rawBytesSha256);
    const bytes=read121(m.privateRawCopy);if(m.originalPin.bytes!==undefined)assert.equal(m.originalPin.bytes,bytes.length);
  }
  return r;
}
function currentTree121(plan,parent,composition) {
  const source=json121(plan.current.sourcePins),compile=json121(plan.current.compilePins);
  assert.deepEqual(source,parent.code.source);assert.deepEqual(compile,parent.code.compile);
  assert.equal(source.length,420);assert.equal(compile.length,528);
  for(const root of [C121.root,C121.mirror]) {
    for(const pin of compile)leaf15(root,pin.file,pin.sha256);
    const complete=cargoFiles15(root);
    assert.deepEqual(complete,compile.filter(p=>p.file.startsWith('apps/poms-api-rust/')||
      p.file.startsWith('.cargo/')).map(p=>p.file).sort());
  }
  for(const pin of source)leaf15(C121.root,pin.file,pin.sha256);
  assert.deepEqual(helpers15(C121.root),composition.helpers);
  for(const pin of composition.executionSources)read121(pin);
  return {source,compile,helper:composition.helpers};
}
function currentOwner121(plan) {
  const bundle=json121(plan.current.lifetimeOwner);
  keys121(bundle,['kind','holderReady','windowsLaunch','launchCommand'],'lifetime owner');
  assert.equal(bundle.kind,'actual-runtime121-lifetime-owner');
  for(const key of ['holderReady','windowsLaunch','launchCommand'])read121(bundle[key]);
  const holder=holderFacts({holder:bundle.holderReady});
  assert.equal(holder.PGStarted,false);assert.equal(holder.APIStarted,false);
  assert.equal(holder.contextCreated,false);
  const input=json121(holder.input);
  assert.equal(bundle.holderReady.file,input.outputDirectory+'/holder-ready.json');
  assert.equal(bundle.windowsLaunch.file,input.outputDirectory+'/windows-launch.json');
  assert.equal(bundle.launchCommand.file,input.outputDirectory+'/command-receipt.json');
  const windows=json121(bundle.windowsLaunch),command=json121(bundle.launchCommand);
  assert.equal(windows.kind,'actual-runtime121-A-Windows-holder-launch');
  assert(Number.isSafeInteger(windows.windowsPid)&&windows.windowsPid>0);
  assert.equal(windows.nonce,holder.nonce);
  assert.equal(windows.inputFile,holder.input.file);assert.equal(windows.inputSha,holder.input.rawBytesSha256);
  assert.equal(windows.reviewFile,holder.review.file);assert.equal(windows.reviewSha,holder.review.rawBytesSha256);
  assert.equal(windows.APIStarted,false);assert.equal(windows.PGStarted,false);
  assert.equal(windows.executable,'C:/Windows/System32/wsl.exe');
  assert.deepEqual(windows.argv,['-d','Debian','--cd',C121.root,'--exec',holder.node.file,
    holder.source.file,...holder.argv.slice(2)]);
  assert.equal(command.kind,'actual-runtime121-A-command');assert.equal(command.mode,'holder-start');
  assert.equal(command.exitCode,0);assert.equal(command.signal,null);assert.equal(command.processError,null);
  const dispatch=json121(command.dispatch);assert.equal(dispatch.kind,'actual-runtime121-A-single-dispatch');
  samePin121(dispatch.input,holder.input);samePin121(dispatch.RootReview,holder.review);
  assert.equal(dispatch.mode,'holder-start');
  for(const key of ['stdout','stderr'])read121(command[key]);
  return holder;
}
function conservation121(plan,parent) {
  const proof=json121(plan.current.PGConservation),pg=json121(plan.current.PGStart);
  assert.equal(proof.kind,'actual-runtime121-A-original-data-conserved');
  assert.equal(proof.mode,'pg-observe');samePin121(proof.originalPGStart,plan.current.PGStart);
  const owner=json121(plan.current.lifetimeOwner);
  samePin121(proof.holder,owner.holderReady);samePin121(pg.holder,owner.holderReady);
  samePin121(proof.baseline,plan.base.preparedBaseline);
  for(const key of ['defaultReadOnly','transactionReadOnly'])assert.equal(proof[key],true);
  for(const key of ['newAPIStarted','nativeAuthorityGranted','businessDML','baselineReset','backupRestore'])
    assert.equal(proof[key],false);
  assert.equal(pg.kind,'actual-runtime121-A-original-PG-resumed');
  for(const [value,mode]of [[proof,'pg-observe'],[pg,'pg-start']]) {
    const input=rootAShape121(json121(value.input));
    assert.equal(input.mode,mode);samePin121(input.holder,value.holder);
    assert.deepEqual(json121(value.RootReview),rootAReview121(input,value.input));
    rootASources121(input);
    const intent=json121(value.intent);
    assert.equal(intent.kind,'actual-runtime121-A-operation-intent');
    assert.equal(intent.mode,mode);assert.equal(intent.nonce,input.nonce);
    samePin121(intent.input,value.input);samePin121(intent.RootReview,value.RootReview);
    if(mode==='pg-observe') {
      samePin121(input.pgStart,plan.current.PGStart);
      samePin121(input.baseline,plan.base.preparedBaseline);
    }
  }
  for(const key of ['containerCreated','volumeCreated','migrationOrBackupRestore','businessDML','APIStarted'])
    assert.equal(pg[key],false);
  assert.equal(pg.before.status,'exited');assert.equal(pg.before.running,false);assert.equal(pg.before.pid,0);
  assert.equal(pg.after.status,'running');assert.equal(pg.after.running,true);assert(pg.after.pid>0);
  assert.equal(pg.after.volumeTarget,'/var/lib/postgresql/data');
  assert.equal(pg.after.mountCount,1);assert.equal(pg.after.volumeReadWrite,true);
  assert.equal(proof.observations.length,2);assert.notEqual(proof.observations[0].file,proof.observations[1].file);
  const baseline=json121(plan.base.preparedBaseline);
  assert.equal(baseline.epoch,C121.epoch);assert.equal(baseline.run,C121.run);
  const snapshots=proof.observations.map(json121);
  const observeInput=json121(proof.input);
  for(const snapshot of snapshots) {
    assert.equal(snapshot.epoch,'runtime-recovery121-A');assert.equal(snapshot.run,observeInput.nonce);
    assertDataEqual252(baseline,snapshot,rows15);
  }
  assertDataEqual252(snapshots[0],snapshots[1],rows15);
  assert.equal(baseline.marker,parent.state.marker);return proof;
}
function currentAPI121(plan,parent,composition) {
  const c=plan.current,r=json121(c.apiProcess);
  assert.equal(r.kind,'actual-source15-owned-API-process121');assert.equal(r.protocolVersion,1);
  for(const key of ['namespace','epoch','run'])assert.equal(r[key],C121[key]);
  assert.equal(r.root,C121.mirror);assert.equal(r.port,31441);
  samePin121(r.baseAPIProcess,parent.code.plan.consumer.apiProcess);
  samePin121(r.baseBuildBinding,plan.base.buildBinding);
  for(const key of ['sourcePins','compilePins','lifetimeOwner'])samePin121(r[key],c[key]);
  if(plan.protocolVersion===1)samePin121(r.helperPins,c.helperPins);else{
    const b=composition.successor;assert(b);const startup=json121(r.input);assert.equal(startup.kind,'Root-runtime121-B-API-operation-input');assert.equal(startup.schemaVersion,1);samePin121(r.helperPins,startup.current.helperPins);samePin121(r.helperPins,b.witness.baselineHelperPins);samePin121(c.helperPins,b.witness.currentHelperPins);assert.deepEqual(startup.composition,b.baselineComposition);assert.deepEqual(sources121(startup.executionSources,C121.root),sources121(b.oldGraph,C121.root));for(const key of ['sourcePins','compilePins','lifetimeOwner'])samePin121(startup.current[key],c[key]);
  }
  assert.equal(r.binary,c.binary.file);assert.equal(r.binarySha256,c.binary.rawBytesSha256);
  samePin121(c.binary,parent.code.plan.consumer.binary);
  samePin121(c.summaryBinary,parent.code.plan.consumer.summaryBinary);
  assert.deepEqual(r.binaryFiles,c.binaryFiles);
  currentBinary121(c.binary,c.binaryFiles);currentBinary121(c.summaryBinary,c.binaryFiles);
  assert(Number.isSafeInteger(r.pid)&&r.pid>1&&/^\d+$/.test(r.startTime));
  assert.deepEqual(parseProc15(fs.readFileSync('/proc/'+r.pid+'/stat','utf8')),
    {pid:r.pid,startTime:r.startTime});
  assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),r.bootId);
  assert.equal(fs.realpathSync('/proc/'+r.pid+'/exe'),r.binary);
  assert.equal(fs.realpathSync('/proc/'+r.pid+'/cwd'),r.root);
  const executable=fs.statSync('/proc/'+r.pid+'/exe',{bigint:true}),fact=c.binaryFiles.find(x=>x.file===r.binary);
  assert.equal(executable.dev.toString(),fact.dev);assert.equal(executable.ino.toString(),fact.ino);
  inside(C121.private,r.normalEnv.file);assert.equal(r.baseNormalEnv.file,C121.private+'/rust.env');
  read121(r.input);
  assert.deepEqual(sources121(r.code,C121.root),composition.executionSources.filter(p=>p.file.startsWith(
    C121.root+'/tools/rust-r4ghi/runtime-recovery121/root/')));
  for(const pin of r.code)read121(pin);
  const allowed=['NODE_ENV','HOST','PORT','DB_CONNECT','DB_HOST','DB_PORT','DB_DATABASE',
    'DB_USER','DB_PASSWORD','DB_SCHEMA','JWT_SECRET','CORS_ORIGIN',
    'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY','IDENTITY_PROVIDER_SECRET_KEY',
    'IDENTITY_PROVIDER_STATE_KEY','POMS_ATTACHMENT_LOCAL_ROOT'],env=new Map();
  for(const line of read121(r.baseNormalEnv).toString().split(/\r?\n/)) {
    if(!line.trim()||line.trim().startsWith('#'))continue;
    const m=/^([A-Z_][A-Z0-9_]*)=([^\r\n]*)$/.exec(line);assert(m);
    assert(allowed.includes(m[1])&&!env.has(m[1]));assert(!/["'#$\u0060\\]/.test(m[2]));
    env.set(m[1],m[2]);
  }
  assert.deepEqual([...env.keys()].sort(),allowed.sort());
  for(const [key,value]of Object.entries({DB_CONNECT:'true',DB_HOST:'127.0.0.1',DB_PORT:'25434',
    DB_DATABASE:'poms_r4ghi_rust',DB_USER:'poms_r4ghi_rust_app',DB_SCHEMA:'poms',
    POMS_ATTACHMENT_LOCAL_ROOT:'/home/wangzishi/.local/share/poms-r4ghi/objects/rust'}))
    assert.equal(env.get(key),value);
  env.set('HOST','127.0.0.1');env.set('PORT','31441');
  env.set('CORS_ORIGIN','http://127.0.0.1:44551,http://localhost:44551');
  assert(read121(r.normalEnv).equals(Buffer.from([...env].map(([k,v])=>k+'='+v).join('\n')+'\n')),'Runtime API environment bytes differ from the approved derivation');
  const actualEnv=Object.fromEntries(fs.readFileSync('/proc/'+r.pid+'/environ').toString()
    .split('\0').filter(Boolean).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
  assert(canonical121(actualEnv)===canonical121({PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',HOME:'/home/wangzishi',
    USER:'wangzishi',LANG:'C.UTF-8',POMS_ENV_FILE:r.normalEnv.file}),'Runtime API process environment differs from the approved shape');
  const sockets=[];
  for(const [version,file]of [[4,'/proc/net/tcp'],[6,'/proc/net/tcp6']])
    for(const line of fs.readFileSync(file,'utf8').trim().split('\n').slice(1)) {
      const fields=line.trim().split(/\s+/);
      if(fields.length>=10&&fields[3]==='0A'&&parseInt(fields[1].split(':')[1],16)===31441)
        sockets.push({version,host:fields[1].split(':')[0],inode:fields[9]});
    }
  assert.equal(sockets.length,1);assert.equal(sockets[0].version,4);assert.equal(sockets[0].host,'0100007F');
  const targets=[];
  for(const fd of fs.readdirSync('/proc/'+r.pid+'/fd'))
    try { targets.push(fs.readlinkSync('/proc/'+r.pid+'/fd/'+fd)); }
    catch(e) { if(e.code!=='ENOENT')throw e; }
  assert(targets.includes('socket:['+sockets[0].inode+']'));
  const ready=json121(c.readiness),attempt=json121(r.readinessAttempt);
  assert.deepEqual(ready,{mode:'start',port:31441,readiness:200,privateCredentialsPrinted:false,
    pid:r.pid,binarySha256:r.binarySha256});
  assert.equal(attempt.method,'GET');assert.equal(attempt.url,'http://127.0.0.1:31441/api/health/readiness');
  assert.equal(attempt.status,200);const body=JSON.parse(attempt.body);
  assert.equal(body.service,'poms-api');assert.equal(body.status,'ready');
  assert.equal(body.checks?.process?.status,'pass');assert.equal(body.checks?.database?.status,'pass');
  return r;
}
function currentFacts121(plan,parent,composition) {
  assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');
  assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  assert.equal(process.cwd(),C121.root);assert.equal(process.getuid(),1000);
  const tree=currentTree121(plan,parent,composition),holder=currentOwner121(plan);
  const apiRecord=currentAPI121(plan,parent,composition);assert.equal(holder.bootId,apiRecord.bootId);
  assert.equal(process.execPath,plan.current.nodeExecutable.file);binaryBytes121(plan.current.nodeExecutable);
  return {namespace:C121.namespace,epoch:C121.epoch,run:C121.run,marker:parent.state.marker,
    prefix:parent.state.prefix,api:'http://127.0.0.1:31441',apiProcess:plan.current.apiProcess,apiRecord,
    sourcePins:plan.current.sourcePins,sources:tree.source,
    sourcePinsSHA256:parent.code.plan.consumer.sourcePinsSHA256,sourceCount:420,
    compilePins:plan.current.compilePins,helperPins:plan.current.helperPins,
    helperSources:tree.helper,helperCount:229,binary:plan.current.binary,
    summaryBinary:plan.current.summaryBinary,trustedSummaryBinary:plan.current.summaryBinary,
    binaryFiles:plan.current.binaryFiles,buildBinding:plan.base.buildBinding,readiness:plan.current.readiness,
    nodeExecutable:{...plan.current.nodeExecutable,version:process.version},
    lifetimeOwner:plan.current.lifetimeOwner,PGConservation:plan.current.PGConservation};
}
export function verifyRuntimePlan121(planPin) {
  for(const [relative,hash]of [
    ['g1B/Root-G1B-121.json',C121.G1B],
    ['g1B-Ctor-append01/Root-G1B-Ctor-append01.json',C121.CtorAppend],
    ['g1B-policy-append01/Root-G1B-policy-append01.json',C121.policyAppend],
    ['g1B-protected261-append01/Root-G1B-protected261-append01.json',C121.dependencyAppend],
  ])read121({file:C121.root+'/tools/rust-r4ghi/runtime-recovery121/'+relative,rawBytesSha256:hash});
  const plan=planShape121(json121(planPin)),parent=verifyRetainedSource15For121(plan.base);
  const composition=composition121(plan,parent);
  conservation121(plan,parent);const current=currentFacts121(plan,parent,composition);
  return {kind:'verified-source15-runtime-append-plan121',planPin,plan,parent,composition,current,
    ...(plan.protocolVersion===2?{successor:composition.successor}:{}),
    ordinaryContextGranted:false,effectsGranted:false,statePublished:false};
}

const brands121=new WeakMap(),verified121=new WeakMap();
const rootMethods121=Object.freeze(['persist','next','artifact','public','client','db','instant','own']);
let construction121=null;
function marker121(state) {
  const m=state.runtimeAdmission121;
  keys121(m,['kind','protocolVersion','registry','candidate','baseCodeRegistry','baseCodeCandidate']);
  assert.equal(m.kind,'current-source15-runtime-lease121');assert.equal(m.protocolVersion,1);
  for(const key of ['registry','candidate','baseCodeRegistry','baseCodeCandidate'])pin121(m[key]);
  inside(data15,m.registry.file);inside(data15,m.candidate.file);return m;
}
function retainedState121(state,facts) {
  const old=facts.parent.state,m=marker121(state),p=facts.plan;
  for(const key of ['namespace','epoch','run'])assert.equal(state[key],C121[key]);
  assert.equal(state.marker,old.marker);assert.equal(state.prefix,old.prefix);
  assert(Number.isSafeInteger(state.sequence)&&state.sequence>=old.sequence);
  samePin121(m.registry,facts.authorityPin);samePin121(m.candidate,facts.candidatePin);
  samePin121(m.baseCodeRegistry,p.base.codeAdmission15);samePin121(m.baseCodeCandidate,p.base.codeCandidate15);
  assert.deepEqual(state.consumerAdmission54,old.consumerAdmission54);
  assert.deepEqual(state.codeEpochAdmission15,old.codeEpochAdmission15);
  for(const key of ['baseline','schemaComparison108','taxContinuation13','taxContinuation14',
    'taxContinuation15','producerExecutionHistory252','producerExecutionHistory15'])
    assert.deepEqual(state[key],old[key],'Immutable retained field: '+key);
  assert.deepEqual(state.consumerChecks?.tax15Invocation118,old.consumerChecks.tax15Invocation118);
  assert.deepEqual(state.sourcePins,facts.parent.code.source);
  samePin121(state.apiProcess,p.current.apiProcess);
  assert.deepEqual(state.apiProcess.record,facts.current.apiRecord);
  assertRetainedOwnership15(state,old);
  for(const entry of facts.parent.resources) {
    const record=pointer121(state,entry.registryPath);
    assert.equal(sha121(JSON.stringify(resourceProjection252(record,entry.mode))),entry.retainedProjectionSHA256);
  }
  if(p.protocolVersion===2){
    const b=facts.successor;assert(b);const predecessor=b.predecessorState;assert(Number.isSafeInteger(state.sequence)&&state.sequence>=predecessor.sequence);assert(Array.isArray(state.runtimeHistory121)&&state.runtimeHistory121.length===predecessor.runtimeHistory121.length+1);assert.deepEqual(state.runtimeHistory121.slice(0,-1),predecessor.runtimeHistory121);const appended=state.runtimeHistory121.at(-1);assert.deepEqual(appended,successorHistory121(predecessor,p,appended.recordedAt));const failedNonce=CORRECTIVE361.failureNonce;assert.deepEqual(state.consumerChecks.taxInvocation121.invocations[failedNonce],predecessor.consumerChecks.taxInvocation121.invocations[failedNonce]);if(state.taxContinuation121){samePin121(state.taxContinuation121.runtimeAdmission121,facts.authorityPin);samePin121(state.taxContinuation121.identity.runtimeAdmission121,facts.authorityPin);assert.equal(state.taxContinuation121.kind,'current-Source15-runtime121-consumer-of-retained-real-tax-producer');}return;
  }
  assert(Array.isArray(state.runtimeHistory121)&&state.runtimeHistory121.length===(old.runtimeHistory121?.length??0)+1);
  const h=state.runtimeHistory121.at(-1);
  assert.equal(h.kind,'retained-original-source15-runtime121');
  samePin121(h.retainedState,p.base.retainedState15);samePin121(h.ownership,p.base.ownership15);
  assert.deepEqual(h.originalAPI,old.apiProcess);
  samePin121(h.originalRegistry,p.base.codeAdmission15);samePin121(h.originalCandidate,p.base.codeCandidate15);
  samePin121(h.failedInvocation,p.base.failedInvocation);
  samePin121(h.failedInvocationReview,p.base.failedInvocationReview);
  samePin121(h.archive,p.base.sourceArchive121);samePin121(h.supplement,p.base.sourceArchiveSupplement121);
  assert.equal(h.originalFailedLabelsPreserved,true);
}
function fullPublished121(state) {
  const m=marker121(state),authority=json121(m.registry);
  assert.equal(authority.kind,'verified-Source15-append-runtime-registry121');
  assert.equal(authority.schemaVersion,1);assert.equal(authority.protocolVersion,1);
  const facts=verifyRuntimePlan121(authority.approvedPlan);
  const review=json121(authority.independentInputReview),approval=json121(authority.RootExecutionApproval);
  assertRuntimeApproval121(facts.plan,authority.approvedPlan,authority.independentInputReview,review,approval);
  assert.deepEqual(authority,registryBody121(facts.plan,authority.approvedPlan,facts,
    authority.independentInputReview,authority.RootExecutionApproval));
  assert.equal(m.registry.file,facts.plan.outputs.registryFile);
  assert.equal(m.candidate.file,facts.plan.outputs.candidateFile);
  const candidate=json121(m.candidate);
  assert.deepEqual(candidate,candidateBody121(facts.plan,m.registry,authority));
  const full={...facts,authorityPin:m.registry,authority,candidatePin:m.candidate,candidate};
  retainedState121(state,full);return full;
}
function actualBrand121(ctx) {
  const brand=ctx&&brands121.get(ctx);
  assert(brand,'Only actual fixed Native constructor/factory returns are branded');
  const rootBrand=brands121.get(brand.root);assert(rootBrand&&rootBrand.type==='root');
  const rootState=Object.getOwnPropertyDescriptor(brand.root,'state');
  assert(rootState&&Object.hasOwn(rootState,'value')&&rootState.value===rootBrand.state);
  for(const name of rootMethods121) {
    const d=Object.getOwnPropertyDescriptor(brand.root,name);
    assert(d&&Object.hasOwn(d,'value')&&d.value===rootBrand.methods[name],
      'Actual Root method changed: '+name);
  }
  const actualState=Object.getOwnPropertyDescriptor(ctx,'state');
  assert(actualState&&Object.hasOwn(actualState,'value')&&actualState.value===brand.state);
  return brand;
}
function contextFacts121(ctx,facts,partial=false) {
  for(const key of ['namespace','epoch','run'])assert.equal(ctx[key],C121[key]);
  for(const [key,value]of Object.entries({win:C121.root,mirror:C121.mirror,private:C121.private,
    priv:data15,migrations:98,tables:139,api:'http://127.0.0.1:31441'}))assert.equal(ctx[key],value);
  assert.deepEqual(ctx.pins,facts.parent.code.source);
  if(ctx.helperPins===undefined)assert(partial,'Only the private real constructor partial lacks helperPins');
  else assert.deepEqual(ctx.helperPins,facts.composition.helpers);
  retainedState121(ctx.state,facts);
}
function fresh121(ctx,facts) {
  const m=marker121(ctx.state);
  samePin121(m.registry,facts.authorityPin);samePin121(m.candidate,facts.candidatePin);
  assert.deepEqual(json121(m.registry),facts.authority);
  assert.deepEqual(json121(m.candidate),facts.candidate);
  const disk=JSON.parse(read121({file:data15+'/state.json',
    rawBytesSha256:sha121(fs.readFileSync(data15+'/state.json'))}));
  assert.deepEqual(marker121(disk),m);
  assert.deepEqual(disk.apiProcess,ctx.state.apiProcess);
  retainedState121(disk,facts);
  const current=currentFacts121(facts.plan,facts.parent,facts.composition);
  assert.deepEqual(current,facts.current);contextFacts121(ctx,facts);
  const oldLog=read121(facts.plan.base.ownership15),now=fs.readFileSync(data15+'/ownership.jsonl');
  assert(now.length>=oldLog.length&&now.subarray(0,oldLog.length).equals(oldLog),
    'Original ownership log prefix changed');
}
function binding121(ctx,facts) {
  const value=freeze121(copy121({
    kind:'verified-current-source15-runtime121',protocolVersion:1,
    authorityPin:facts.authorityPin,authority:facts.authority,
    code:{registryPin:facts.plan.base.codeAdmission15,registry:facts.parent.code.registry,
      candidatePin:facts.plan.base.codeCandidate15,candidate:facts.parent.code.candidate,
      approvedPlanPin:facts.plan.base.approvedCodePlan15,producerState:facts.parent.code.registry.producerState},
    retained:{statePin:facts.plan.base.retainedState15,ownershipPin:facts.plan.base.ownership15,
      sourceArchive:facts.plan.base.sourceArchive121,sourceArchiveSupplement:facts.plan.base.sourceArchiveSupplement121,
      prepared15:facts.plan.base.prepared15,fullInventory:facts.plan.base.fullInventory},
    current:{...facts.current,runtimeAdmission121:facts.authorityPin,candidate:facts.candidatePin},
  }));
  verified121.set(value,{ctx,facts});return value;
}
export function currentRuntime121(ctx) {
  const brand=actualBrand121(ctx);
  // The complete immutable entry proof belongs to this actual returned ctx only.
  // Every access still rereads every current source/process/lease/state boundary.
  fresh121(ctx,brand.facts);
  if(!brand.binding)brand.binding=binding121(ctx,brand.facts);
  return brand.binding;
}
export function assertCurrentLease121(ctx,value) {
  actualBrand121(ctx);const v=verified121.get(value);
  assert(v&&v.ctx===ctx,'No JSON, Root/view exchange or unbranded proof');
  fresh121(ctx,v.facts);return value;
}
export function assertRuntimeBinding121(ctx,{runtimeAdmission121,candidate}) {
  const brand=actualBrand121(ctx);
  // Explicit full bookend: do not reuse the constructor immutable entry seal.
  const facts=fullPublished121(ctx.state);
  samePin121(runtimeAdmission121,facts.authorityPin);samePin121(candidate,facts.candidatePin);
  contextFacts121(ctx,facts);fresh121(ctx,facts);
  brand.facts=facts;brand.binding=binding121(ctx,facts);return brand.binding;
}
export function assertRuntimeContext121(ctx,baseCodeRegistry) {
  if(brands121.has(ctx)) {
    const b=currentRuntime121(ctx);assert.deepEqual(baseCodeRegistry,b.code.registry);return baseCodeRegistry;
  }
  const frame=construction121;
  assert(frame&&frame.stage==='original-constructor'&&!frame.partial,
    'A fake partial cannot create or register a Native brand');
  assert.deepEqual(ctx.state,frame.stateSnapshot);
  contextFacts121(ctx,frame.facts,true);
  currentFacts121(frame.facts.plan,frame.facts.parent,frame.facts.composition);
  assert.deepEqual(baseCodeRegistry,frame.facts.parent.code.registry);
  frame.partial=ctx;frame.state=ctx.state;return baseCodeRegistry;
}
function options121(options) {
  plain121(options,'constructor options');
  const keys=Object.keys(options);
  assert(keys.includes('epoch')&&keys.includes('run'));
  assert(keys.every(k=>['epoch','run','api-process-record','provision-receipt','planned-date'].includes(k)));
  for(const value of Object.values(options))assert.equal(typeof value,'string');
  assert.equal(options.epoch,C121.epoch);assert.equal(options.run,C121.run);
  if(Object.hasOwn(options,'planned-date')) {
    const date=options['planned-date'];assert(/^\d{4}-\d{2}-\d{2}$/.test(date));
    assert.equal(new Date(date+'T00:00:00.000Z').toISOString().slice(0,10),date);
  }
  return freeze121(copy121(options));
}
export function createContext121(options) {
  assert.equal(construction121,null,'Fixed constructor cannot reenter');
  const frozen=options121(options);
  const state=JSON.parse(read121({file:data15+'/state.json',
    rawBytesSha256:sha121(fs.readFileSync(data15+'/state.json'))}));
  const facts=fullPublished121(state);
  if(frozen['api-process-record']!==undefined)
    assert.equal(frozen['api-process-record'],facts.plan.current.apiProcess.file);
  const frame={stage:'original-constructor',facts,stateSnapshot:state,partial:null,state:null};
  construction121=frame;
  try {
    const root=originalCreateContext(frozen);
    assert(frame.partial&&frame.state===root.state,'Only the original actual return may be branded');
    const methods={};
    for(const name of rootMethods121) {
      const d=Object.getOwnPropertyDescriptor(root,name);
      assert(d&&Object.hasOwn(d,'value')&&typeof d.value==='function');methods[name]=d.value;
    }
    const brand={type:'root',root,state:root.state,methods,facts,binding:null};
    brands121.set(root,brand);
    try { contextFacts121(root,facts);fresh121(root,facts); }
    catch(error) { brands121.delete(root);throw error; }
    return root;
  } finally { construction121=null; }
}
function viewBrand121(root,view,facts) {
  assert(view!==root&&view&&typeof view==='object');
  assert.equal(brands121.has(view),false);assert(view.state&&view.state!==root.state);
  const brand={type:'view',root,state:view.state,facts,binding:null};
  brands121.set(view,brand);
  try { contextFacts121(view,facts);fresh121(view,facts); }
  catch(error) { brands121.delete(view);throw error; }
  return view;
}
export function createWitnessView121(root,baseReg5) {
  const brand=actualBrand121(root);assert.equal(brand.type,'root');
  const facts=fullPublished121(root.state);assert.deepEqual(baseReg5,facts.parent.code.registry);
  const file=C121.root+'/tools/rust-r4ghi/legacy-authority15-284/facts284.mjs';
  const expected=facts.composition.executionSources.find(p=>p.file===file);assert(expected);read121(expected);
  const actual=newWitnessView284(root,baseReg5);
  viewBrand121(root,actual.ctx,facts);return actual;
}
export function createPolicyView121(root,record,baseReg5) {
  const brand=actualBrand121(root);assert.equal(brand.type,'root');
  assert.equal(record,root.state.consumerChecks?.hPolicyContinuation15);
  plain121(record,'Actual current policy record');
  const facts=fullPublished121(root.state);assert.deepEqual(baseReg5,facts.parent.code.registry);
  const file=C121.root+'/tools/rust-r4ghi/policy-continuation15-287/facts287.mjs';
  const expected=facts.composition.executionSources.find(p=>p.file===file);assert(expected);read121(expected);
  const actual=openConsumerView287(root,record,baseReg5);
  return viewBrand121(root,actual,facts);
}
export function effectiveHelperPins121(ctx) {
  return currentRuntime121(ctx).current.helperPins;
}
export function assertRetainedFixture121(ctx,{registryPath,record,projectIds,producerReceipt=null}) {
  const b=currentRuntime121(ctx),brand=actualBrand121(ctx);
  const entry=brand.facts.parent.resources.find(x=>x.registryPath===registryPath);
  assert(entry,'Outside exact original Reg5 retained resources');
  assert.equal(pointer121(ctx.state,registryPath),record,'Only the actual persisted resource may be consumed');
  assert(Array.isArray(projectIds)&&projectIds.length>0&&new Set(projectIds).size===projectIds.length);
  assert(projectIds.every(id=>entry.projectIds.includes(id)),'Retained resource cannot expand project authority');
  assert.equal(sha121(JSON.stringify(resourceProjection252(record,entry.mode))),entry.retainedProjectionSHA256);
  if(producerReceipt) {
    assert(entry.receipts.some(p=>same(p,producerReceipt)));read121(producerReceipt);
  }
  assert(entry.mode!=='legacy-compatibility'||producerReceipt);
  return freeze121(copy121({registryPath,originalProducerState:entry.originalProducerState,
    retainedProducerState:b.retained.statePin,retainedAtEpoch:C121.epoch,
    producerEpoch:entry.recordBirth.epoch,consumerEpoch:C121.epoch,retainedProducerOnly:true,
    codeAdmission15:b.code.registryPin,runtimeAdmission121:b.authorityPin,projectBirths:entry.projectBirths}));
}
export function readRetainedCommand121(ctx,{pointer,receipt}) {
  const b=currentRuntime121(ctx),brand=actualBrand121(ctx);
  assert.equal(pointer,'/taxContinuation13/mainCompletion');
  const bridge=brand.facts.parent.Main13Bridge;samePin121(receipt,bridge.original);
  assert.deepEqual(pointer121(ctx.state,pointer),bridge.record);
  // Historical Main13 is never checked against mutable current owned.latest.
  return freeze121(copy121({...bridge,retainedThrough15:b.retained.statePin,
    codeAdmission15:b.code.registryPin,runtimeAdmission121:b.authorityPin}));
}
export function readRetainedPreparation121(ctx,{prepared15,fullInventory,bodySHA256}) {
  const b=currentRuntime121(ctx),brand=actualBrand121(ctx),origin=brand.facts.parent.preparationOrigin;
  samePin121(prepared15,origin.prepared15);samePin121(fullInventory,origin.fullInventory);
  assert.equal(bodySHA256,origin.bodySHA256);
  return freeze121(copy121({kind:'verified-retained-tax15-preparation-origin121',protocolVersion:1,
    ...origin,sourceArchive:brand.facts.parent.archive,
    failedAttemptDisposition:brand.facts.parent.failedAttemptDisposition,
    PGConservation:b.current.PGConservation,runtimeAdmission121:b.authorityPin,
    retainedPreparationOnly:true,currentEffectsGranted:false,serverTargetsRefreshed:false,bodyRefreshed:false}));
}
export function assertGHCurrentSource121(ctx,operationId) {
  assert(GH121.includes(operationId),'No null/unknown GH effect or static graph fallback');
  const b=currentRuntime121(ctx);
  return freeze121(copy121({registryPin:b.code.registryPin,runtimeAdmission121:b.authorityPin,
    candidate:b.current.candidate,sourcePins:b.current.sources,helperPinsPin:b.current.helperPins}));
}
export function trustedSummaryBinary121(ctx) {
  const b=currentRuntime121(ctx);
  currentBinary121(b.current.trustedSummaryBinary,b.current.binaryFiles);
  return b.current.trustedSummaryBinary;
}
export function runtimeReference121(ctx,value) {
  const b=assertCurrentLease121(ctx,value);
  return freeze121(copy121({kind:'actual-runtime-lease-reference121',protocolVersion:1,
    runtimeAdmission121:b.authorityPin,candidate:b.current.candidate,
    baseCodeRegistry:b.code.registryPin,baseCodeCandidate:b.code.candidatePin,
    apiProcess:b.current.apiProcess,sourcePins:b.current.sourcePins,
    sourcePinsSHA256:b.current.sourcePinsSHA256,compilePins:b.current.compilePins,
    helperPins:b.current.helperPins}));
}

// HISTORICAL14-COPY: inserted below from protected reviewed implementation.

function producer252(ctx,p){const index=json(p.producer.retentionIndex),old=json(p.producer.frozenState);assertFinalProducer252(index,old,p);assert.equal(index.retentionMode,'post-runtime-loss-partial25203');assert.deepEqual(index.runtimeLoss,p.runtimeLoss);samePin252(p.runtimeLoss.frozenState,p.producer.frozenState);samePin252(p.runtimeLoss.partialOutcome,index.H46Outcome);samePin252(p.runtimeLoss.sourcePins13,p.producer.sourcePins);samePin252(p.runtimeLoss.helperH1,p.producer.helperPins);samePin252(p.runtimeLoss.oldAPI136,p.producer.apiProcess);const lossFacts=verifyLossEvidence25203({claims:p.runtimeLoss,state:old,readJSON:json,readBytes:readPin252,readRows:rows252,assertDataEqual:assertDataEqual252});assertSupplementUnion25203(p.evidenceSupplements,lossFacts.externalSourceFiles);assert.notEqual(p.producer.frozenState.file,ctx.private+'/business/g2-business13/main01/state.json');inside(ctx.private+'/business/g2-business13/main01',p.producer.frozenState.file);assert.equal(json(p.producer.helperPins).length,198);
 for(const s of index.evidenceSupplements){for(const f of s.sourceFiles)readPin252(f);for(const k of['independentReview','actualReconciliation','actualContinuation'])readPin252(s[k]);}const origin=json(p.producer.registry3),legacy=oldContext252(ctx,p,old);verifySchemaBinding108(legacy,old.schemaComparison108,origin);validateRegistryLineage62(legacy,origin);const stable=index.stableObservations.map(json);for(const s of stable){assert.equal(s.epoch,C252.producerEpoch);assert.equal(s.run,C252.run);assert.equal(s.marker,old.marker);assertRecorded(legacy,s);}assertDataEqual252(stable[0],stable[1],rows252);const administrativeAfter=json(json(p.runtimeLoss.administrative28602).after);for(const s of stable)assertDataEqual252(administrativeAfter,s,rows252);
 const history=verifyRetainedToolAdmission119252(legacy,origin,{kind:'sealed-source13-code-parent252',frozenState:p.producer.frozenState,sourcePins:p.producer.sourcePins,helperPins:p.producer.helperPins,codeRoot:p.producer.archiveRoot,archiveManifest:p.producer.archiveManifest,apiBinary:p.producer.apiBinary,summaryBinary:p.producer.summaryBinary,binaryFiles:p.producer.binaryFiles,candidateB2:p.producer.candidateB2});return{index,old,origin,legacy,history};}

function fullResource252(ctx,p,frame){const output=[];for(const d of p.resources){assert(typeof d.registryPath==='string'&&d.registryPath.startsWith('/fixtures/'));const record=pointer252(frame.old,d.registryPath);assert(record);const allIds=sort([...projectAnchors252(record)]);let ids=allIds;if(d.kind==='registry3'){const admitted=frame.origin.fixtureAdmissions.find(x=>x.registryPath===d.registryPath);assert(admitted,'Published R3 resource required');ids=sort(admitted.projectIds);for(const id of ids)assert(allIds.includes(id),'Published R3 project must remain an actual frozen record anchor');}assert.deepEqual(sort(d.projectIds),ids,'Declared resource must equal published R3 scope or every new-resource anchor');assert(ids.length>0);let birth,prior=null,projectBirths=[];
  if(d.kind==='registry3'){prior=frame.origin.fixtureAdmissions.find(x=>x.registryPath===d.registryPath);assert(prior);assert.deepEqual(sort(prior.projectIds),ids);birth=prior.birthSource??frame.origin.producer;for(const item of prior.identity)assert.deepEqual(pointer252(record,item.path),item.value);if(['immutable-ui-producer','legacy-compatibility'].includes(prior.mode)){const projection=Object.fromEntries(Object.entries(record).filter(([k])=>!['UICommandObserved','UICommandObserverReceipt','UICommandResponseOriginal','UICommandOperationId'].includes(k)));assert.equal(sha252(JSON.stringify(projection)),prior.producerProjectionSHA256);}projectBirths=ids.map(id=>({projectId:id,kind:'original-registry-lineage',priorRegistry:p.producer.registry3,recordBirth:birth}));}
  else if(d.kind==='tool119'){assert.equal(d.registryPath,'/fixtures/sharedSourceFollowup58');const r=frame.history.registry.derived.resource;assert.equal(sha252(JSON.stringify(record)),r.recordSHA256);assert.deepEqual(r.projectIds,ids);birth=r.recordProducerSource;projectBirths=r.projectBirths;prior={mode:'retained-tool119',receipts:r.receipts.map(x=>x.pin)};}
  else{assert.equal(d.kind,'producer13');assert.equal(record.sourcePinsSHA256,C252.producerSourceSHA);birth={epoch:C252.producerEpoch,run:C252.run,sourcePinsSHA256:C252.producerSourceSHA,sourceCount:416,sourceState:p.producer.frozenState};
   for(const id of ids){const entry=frame.index.projectBirths.find(e=>e.registryPath===d.registryPath&&e.projectId===id);assert(entry,'Each new13 project requires exact original HTTP and complete ledger pins');const verified=verifyProducerProjectBirth252({state:frame.old,entry,database:ctx.database,readJSON:json,readRows:rows252});projectBirths.push({...verified,source:birth});}
  }
  if(record.sourcePinsSHA256!==undefined)assert.equal(record.sourcePinsSHA256,birth.sourcePinsSHA256);const mode=prior?.mode??'immutable-producer13',receipts=[...(prior?.receipts??[]),...(d.receipts??[]),...projectBirths.filter(x=>x.kind==='original-Source13-HTTP-birth').flatMap(x=>[x.http,x.ledger])];if(d.registryPath==='/fixtures/hPolicyCoverage26'){samePin252(d.producerOutcome,frame.index.H46Outcome);readPin252(d.producerOutcome);assert(receipts.some(q=>same(q,d.producerOutcome)),'Actual13 H46 success/partial outcome must be explicitly retained');if(record.result)assert(receipts.some(q=>same(q,record.result)),'Actual13 H46 completion must be explicitly retained');}for(const r of receipts)readPin252(r);output.push({registryPath:d.registryPath,mode,recordBirth:birth,originalProducerState:birth.sourceState,projectIds:ids,projectBirths,retainedRecordSHA256:sha252(JSON.stringify(record)),retainedProjectionSHA256:sha252(JSON.stringify(resourceProjection252(record,mode))),receipts});
 }for(const entry of frame.origin.fixtureAdmissions)assert(output.some(x=>x.registryPath===entry.registryPath),'Original R3 entry omitted');for(const b of frame.index.projectBirths)assert(output.some(x=>x.registryPath===b.registryPath&&x.projectBirths.some(p=>p.kind==='original-Source13-HTTP-birth'&&p.projectId===b.projectId)),'Orphan/unselected13 birth entry is not authority');assert(output.some(x=>x.registryPath==='/fixtures/sharedSourceFollowup58'));assert(output.some(x=>x.registryPath==='/fixtures/hPolicyCoverage26'&&x.recordBirth.epoch===C252.producerEpoch));return output;}

function historicalBuild14(p, archive) {
  const b = json15(p.consumer.buildBinding), root = json15(b.Root.receipt), mirror = json15(b.mirror.receipt);
  assert.equal(b.kind, 'actual-source14-owned-root-mirror-build252'); assert.equal(b.namespace, C15.namespace);
  assert.equal(root.kind, 'actual-Source14-source-inventory-and-copy'); assert.equal(root.operation, 'source-inventory-and-copy'); assert.equal(root.root, C15.root); assert.equal(root.sourceStable, true);
  assert.equal(mirror.kind, 'actual-Source14-owned-mirror-cargo-checks-and-build'); assert.equal(mirror.operation, 'fmt-clippy-test-build'); assert.equal(mirror.root, C15.mirror); assert.equal(mirror.sourceStable, true);
  assert.equal(mirror.targetDirectory, p.consumer.binaryRoot); assert.equal(b.targetDirectory, p.consumer.binaryRoot);
  const canonical = (items, base) => items.map(x => ({ file: path.posix.relative(base, x.file), sha256: x.sha256 ?? x.rawBytesSha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  for (const [list, base] of [[root.inputs, root.root], [root.copiedInputs, root.destinationRoot], [mirror.inputs, mirror.root]]) assert.deepEqual(canonical(list, base), archive.compile);
  assert.equal(root.destinationRoot, mirror.root); assert.equal(b.completeCompileInputCount, 528); assert.equal(b.completeCompileInputsSHA256, sha15(JSON.stringify(archive.compile)));
  assert.equal(b.sourcePinsSHA256, C15.source14SHA); assert.equal(b.sourceCount, 420); samePin15(b.sourcePins, p.consumer.sourcePins); samePin15(b.helperPins, p.consumer.helperPins);
  const composition = json15(p.compositionManifest), originalArchive = json15(p.producer.archiveManifest), oldCompile = json15(originalArchive.completeCompileInventory);
  const oldCanonical = canonical(oldCompile.inputs, oldCompile.root);
  assertAuthorities25203(composition, json15);
  const closure = assertClosureDelta25203(composition, json15(p.producer.sourcePins), archive.source, oldCanonical, archive.compile);
  assert.deepEqual(closure.sourceDelta.map(x => ({ file: x.file, beforeSHA256: x.beforeSHA256, afterSHA256: x.afterSHA256 })), p.sourceDeltas);
  for (const e of composition.entries) for (const step of e.steps) if (step.artifact) readPin15(step.artifact);
  for (const v of composition.validationArtifacts) { readPin15(v.after); /* Validation artifacts remain separately pinned; not counterfeit Cargo inputs. */ }
  const suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const name of Object.keys(suffixes)) {
    const s = mirror.steps[name]; assert.equal(s.kind, 'actual-owned-mirror-cargo-command'); assert.equal(s.command, name); assert.equal(s.exitCode, 0); assert.equal(s.cwd, C15.mirror); assert.equal(s.targetDirectory, p.consumer.binaryRoot);
    assert.deepEqual(s.argv, ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', C15.mirror + '/apps/poms-api-rust/Cargo.toml', ...suffixes[name]]); readPin15(s.stdout); readPin15(s.stderr);
  }
  assert.deepEqual(b.binaryFiles, p.consumer.binaryFiles);
  for (const k of ['binary', 'summaryBinary']) { samePin15(b[k], p.consumer[k]); samePin15(mirror[k], p.consumer[k]); historicalBinary121(p.consumer[k], p.consumer.binaryFiles); }
  const ready = json15(p.consumer.readiness), process = json15(p.consumer.apiProcess);
  assert.equal(ready.mode, 'start'); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.privateCredentialsPrinted, false); assert.equal(ready.pid, process.pid); assert.equal(ready.binarySha256, process.binarySha256);
  return process;
}

function historicalRegistry14(spec, state, archive) {
  const reg = json15(spec.registry4), p = json15(reg.approvedPlan);
  assert.equal(reg.schemaVersion, 4); assertPlanShape252(p); samePin15(state.codeEpochAdmission252.registry, spec.registry4); samePin15(state.consumerAdmission54.registry, spec.registry4);
  const ctx = { namespace: C15.namespace, base: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee', win: C15.root, mirror: C15.mirror, private: C15.private, stateRoot: C15.private.slice(0, -8), epoch: 'g2-business14', run: 'main01', priv: C15.private + '/business/g2-business14/main01',
    host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner', apps: ['poms_r4ghi_native_app', 'poms_r4ghi_rust_app'], api: 'http://127.0.0.1:31441', origin: 'http://127.0.0.1:44551',
    state, pins: state.sourcePins, helperPins: archive.helper, database: 'poms_r4ghi_rust', databases: ['poms_r4ghi_native', 'poms_r4ghi_rust'], migrations: 98, tables: 139 };
  const frame = producer252(ctx, p), resources = fullResource252(ctx, p, frame), process = historicalBuild14(p, archive);
  assert.deepEqual(state.sourcePins, archive.source); assert.deepEqual(json15(p.consumer.sourcePins), archive.source); assert.deepEqual(json15(p.consumer.helperPins), archive.helper);
  sourceDeltas252(frame.old.sourcePins, archive.source, p.sourceDeltas); sourceDeltas252(json15(p.producer.helperPins), archive.helper, p.helperDeltas);
  assertApprovals252(p, json15(p.independentReview), json15(p.G2Approval));
  assert.equal(process.namespace, C15.namespace); assert.equal(process.root, C15.mirror); assert.equal(process.port, 31441);
  assert.equal(process.binary, p.consumer.binary.file); assert.equal(process.binarySha256, p.consumer.binary.rawBytesSha256); assert.deepEqual(state.apiProcess.record, process);
  samePin15(spec.apiProcess14, p.consumer.apiProcess); samePin15(spec.binary14, p.consumer.binary); samePin15(spec.summaryBinary14, p.consumer.summaryBinary); assert.deepEqual(spec.binaryFiles14, p.consumer.binaryFiles);
  samePin15(spec.candidateB0_14, p.consumer.bootstrap); samePin15(spec.candidateB1_14, state.codeEpochAdmission252.candidate ?? spec.candidateB1_14);
  const b0 = json15(spec.candidateB0_14), b1 = json15(spec.candidateB1_14);
  // Only these original data constructors are used; never its current guard.
  assert.deepEqual(b0, bootstrapBody252(p, process)); assert.deepEqual(b1, admittedBody252(p, spec.registry4, b0));
  assert.equal(b0.kind, 'actual-Source14-bootstrap-code-candidate252'); assert.equal(b0.epoch, 'g2-business14'); assert.equal(b0.originalReadinessInherited, false);
  assert.equal(b1.kind, 'actual-Source14-admitted-code-candidate252'); samePin15(b1.consumerAdmission.registry, spec.registry4); samePin15(b1.bootstrapCandidate, spec.candidateB0_14);
  for (const key of ['sourcePinsSHA256', 'sourceCount', 'plainSourcePins', 'helperPins', 'process', 'binary', 'summaryBinary', 'trustedSummaryBinary', 'buildBinding', 'readinessOriginal', 'readiness', 'originalReadinessInherited']) assert.deepEqual(b1[key], b0[key]);
  assert.equal(b0.sourcePinsSHA256, C15.source14SHA); assert.equal(b0.sourceCount, 420); samePin15(b0.plainSourcePins, p.consumer.sourcePins); samePin15(b0.helperPins, p.consumer.helperPins); samePin15(b0.buildBinding, p.consumer.buildBinding); samePin15(b0.readinessOriginal, p.consumer.readiness); assert.deepEqual(b0.process.record, process);
  const observations = p.consumer.freshSnapshots.map(json15); assert.equal(observations.length, 2);
  const conservation = observations.map(s => { assert.equal(s.epoch, 'g2-business14'); assert.equal(s.marker, state.marker); return assertDataEqual252(json15(p.producer.retainedSnapshot), s, rows15); });
  const observed = json15(p.consumer.observationReceipt);
  assert.equal(observed.kind, 'actual-source14-state-free-M98-observation252');
  for (const [a, b] of [[observed.retentionIndex, p.producer.retentionIndex], [observed.frozenState, p.producer.frozenState], [observed.sourcePins, p.consumer.sourcePins], [observed.helperPins, p.consumer.helperPins], [observed.apiProcess, p.consumer.apiProcess]]) samePin15(a, b);
  assert.deepEqual(observed.binaryFiles, p.consumer.binaryFiles); assert.deepEqual(observed.freshSnapshots, p.consumer.freshSnapshots);
  for (const k of ['stateMinted', 'noDomainHTTP', 'noMigration']) assert.equal(observed[k], k !== 'stateMinted');
  const impact = json15(p.consumer.impactReview); assert.equal(impact.kind, 'approved-same-M98-code-epoch-impact252'); assert.equal(impact.producerSourcePinsSHA256, C252.producerSourceSHA); assert.equal(impact.consumerSourcePinsSHA256, C15.source14SHA); assert.equal(impact.retainHistoricalLabels, true); assert.equal(impact.currentConsumerCertificationGranted, false);
  const tooling = json15(p.tooling.manifest); assert.equal(tooling.kind, 'same-M98-code-epoch-composition25203-proposal');
  for (const k of ['capture', 'publisher', 'core']) { readPin15(p.tooling[k]); assert(tooling.files.some(f => f.rawBytesSha256 === p.tooling[k].rawBytesSha256 && f.file.endsWith('/' + path.basename(p.tooling[k].file)))); }
  const expected = { schemaVersion: 4, kind: 'verified-retained-data-consumer-registry54', namespace: C252.namespace, marker: frame.old.marker, approvedPlan: reg.approvedPlan,
    producer: { epoch: C252.producerEpoch, run: C252.run, sourcePinsSHA256: C252.producerSourceSHA, sourceCount: 416, binarySHA256: C252.producerBinarySHA },
    consumer: { epoch: C252.consumerEpoch, run: C252.run, sourcePins: p.consumer.sourcePins, sourcePinsSHA256: p.consumer.sourcePinsSHA256, sourceCount: p.consumer.sourceCount, helperPins: p.consumer.helperPins, binarySHA256: p.consumer.binary.rawBytesSha256, apiProcess: p.consumer.apiProcess, trustedSummaryBinary: p.consumer.trustedSummaryBinary, candidateReceipt: p.consumer.bootstrap, impactReview: p.consumer.impactReview },
    originalBaseline: frame.old.baseline, schemaComparison108: frame.old.schemaComparison108, priorRegistry: p.producer.registry3, retentionIndex: p.producer.retentionIndex, producerState: p.producer.frozenState, retainedSnapshot: p.producer.retainedSnapshot,
    historical119: { status: 'actual-published-and-consumed-at-Source13', registry: p.producer.tool119, candidateB2: p.producer.candidateB2, helperPins: p.producer.helperPins }, codeEpoch252: { kind: 'same-M98-code-only-consumer252', protocolVersion: 3, compositionManifest: p.compositionManifest, runtimeLoss: p.runtimeLoss, freshSnapshots: p.consumer.freshSnapshots, archiveManifest: p.producer.archiveManifest, buildBinding: p.consumer.buildBinding, conservation, migrationExecuted: false, businessBaselineReset: false }, fixtureAdmissions: resources, inheritedProducerEvidenceIsNotCurrentConsumerAcceptance: true, G3Certified: false, G4Certified: false };
  assert.deepEqual(reg, expected);
  assert.deepEqual(reg, registryBody252(ctx, p, reg.approvedPlan, { frame, resources, conservation }));
  assertImmutableParents252(state, frame.old, resources); assert.deepEqual(state.producerExecutionHistory252, [...(frame.old.producerExecutionHistory252 ?? []), producerHistory252(frame.old, p)]);
  for (const k of p.stateTransfer.preserveTopLevel.filter(k => !['actors', 'owned', 'borrowed', 'fixtures', 'objects'].includes(k))) assert.deepEqual(state[k], frame.old[k]);
  const command = frame.index.commands.find(x => x.pointer === '/taxContinuation13/mainCompletion'); assert(command);
  const Main13Bridge = { record: verifyRetainedMain252({ state: frame.old, current: state, entry: command, receipt: command.original, database: ctx.database, readJSON: json15, readRows: rows15 }), producerEpoch: 'g2-business13', producerState: p.producer.frozenState, retainedThrough14: spec.frozenState14, original: command.original, replayForbidden: true, currentConsumerCertified: false };
  return { registry: reg, resources, Main13Bridge, ctx, process, plan: p };
}

function verifyActualHTTP14(index, state) {
  const pins = index.actualHTTP14.attempts, public14 = C15.root + '/tmp/rust-r4ghi/business/g2-business14/main01';
  assert(Array.isArray(pins) && pins.length === 10);
  assert.deepEqual(pins.map(p => p.file), fs.readdirSync(public14).filter(n => /^\d{6}-http-http\.json$/.test(n)).sort().map(n => public14 + '/' + n));
  let login = null;
  for (const pin of pins) {
    const http = json15(pin), cfg = json15(http.originals.requestConfig);
    assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
    assert(typeof http.requestId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId) && http.requestId.startsWith(state.prefix + '-'));
    assert.equal(cfg.requestId, http.requestId); assert.equal(cfg.headers?.['X-Request-Id'], http.requestId); assert.equal(cfg.operationId, http.operationId); assert.equal(cfg.method, http.method); assert(cfg.url.startsWith('http://127.0.0.1:31441/api/'));
    for (const p of Object.values(http.originals)) { inside(C15.private + '/business/g2-business14/main01', p.file); readPin15(p); }
    assert.equal(json15(http.originals.responseHeaders).status, 200);
    if (http.method === 'POST') { assert.equal(login, null); assert.equal(http.operationId, 'AuthController_createPasswordAuthSession'); login = http; } else assert.equal(http.method, 'GET');
  }
  assert(login); assert.equal(index.actualHTTP14.loginRequestId, login.requestId);
  const owner = Object.values(state.owned).filter(x => x.table === 'auth_session' && x.proof?.requestId === login.requestId); assert.equal(owner.length, 1);
  for (const [k, v] of Object.entries({ transport: 'HTTP', status: 200, responseComplete: true, beforeAbsent: true, operationId: login.operationId })) assert.equal(owner[0].proof[k], v);
}

function verifyRetained14Body15(spec, requireRetired) {
  keys15(spec, ['archive344', 'archive344Review', 'finalRetention14', 'finalRetentionReview', 'frozenState14', 'ownership14', 'registry4', 'candidateB0_14', 'candidateB1_14', 'sourcePins14', 'compilePins14', 'helperPins14', 'apiProcess14', 'binary14', 'summaryBinary14', 'binaryFiles14', 'retirement14'], 'parent14');
  for (const k of Object.keys(spec).filter(k => k !== 'binaryFiles14' && (requireRetired || k !== 'retirement14'))) pin15(spec[k]);
  if (!requireRetired) assert.equal(spec.retirement14, null, 'Retire preparation cannot pre-invent its result');
  const archive = verifyArchive344For15(spec), index = json15(spec.finalRetention14), state = json15(spec.frozenState14);
  assert.equal(index.kind, 'actual-final-source14-M98-retention119'); assert.equal(index.finalRetainedPoint, true); assert.equal(index.diagnosticOnly, false);
  samePin15(index.frozenState, spec.frozenState14); samePin15(index.frozenOwnership, spec.ownership14); samePin15(index.registry4, spec.registry4); samePin15(index.archive344, spec.archive344);
  assert.equal(spec.frozenState14.rawBytesSha256, C15.state14SHA); assert(spec.frozenState14.file.startsWith(C15.private + '/business/g2-business14/main01/retained-capture119-'));
  assert.equal(spec.ownership14.rawBytesSha256, archive.archive.ownership.rawBytesSha256); readPin15(spec.ownership14);
  assert.equal(state.namespace, C15.namespace); assert.equal(state.epoch, C15.producerEpoch); assert.equal(state.run, C15.run); assert.equal(state.sequence, 24);
  assert.equal(state.baseline.rawBytesSha256, C15.originalBaselineSHA); assert(!state.taxContinuation14?.sweep?.finalSuccess);
  for (const k of ['stateMinted', 'Source15Admitted', 'G3Certified', 'G4Certified', 'successfulTaxPreparation14']) assert.equal(index[k], false);
  for (const k of ['noDomainHTTP', 'noStateRewrite', 'noMigration', 'noBusinessBaselineReset']) assert.equal(index[k], true);
  assert.equal(index.authPOSTStatus, 200); assert.equal(index.actualHTTP14.loginPOSTStatus, 200); assert.equal(index.actualHTTP14.domainPOSTs, 0);
  verifyActualHTTP14(index, state);
  const legacy = historicalRegistry14(spec, state, archive);
  assert.deepEqual(index.resources, legacy.resources); assert.deepEqual(index.Main13Bridge, legacy.Main13Bridge);
  const stable = index.stableObservations.map(json15); assert.equal(stable.length, 2); samePin15(index.retainedSnapshot, index.stableObservations[1]);
  assert.notEqual(index.stableObservations[0].file, index.stableObservations[1].file);
  for (const s of stable) { assert.equal(s.epoch, C15.producerEpoch); assert.equal(s.run, C15.run); assert.equal(s.marker, state.marker); assertRecorded(legacy.ctx, s); }
  const conservation = assertDataEqual252(stable[0], stable[1], rows15);
  const review = json15(spec.finalRetentionReview); assert.equal(spec.finalRetentionReview.rawBytesSha256, '66f3a8973de24e06779d16d00b7aa693e894e756ff4c3e244e61484672cecb58'); assert.equal(review.kind, 'non-author-final-source14-retention-readback119'); assert.equal(review.verdict, 'approved-final14-retention-only'); samePin15(review.finalRetention14, spec.finalRetention14); samePin15(review.frozenState14, spec.frozenState14); samePin15(review.frozenOwnership14, spec.ownership14);
  assert.equal(review.reviewerIsCaptureAuthor, false); assert.equal(review.full139x2CaptureReadback, true); assert.equal(review.actualSource15Admission, false); assert.equal(review.source15EffectReadmission, false); assert.equal(review.actualG2ForSource15, false);
  if (requireRetired) {
   const retired = json15(spec.retirement14); assert.equal(retired.kind, 'actual-source14-API-retirement-for15'); samePin15(retired.apiProcess14, spec.apiProcess14); assert.deepEqual(retired.processRecord, legacy.process); assert.equal(retired.signalOwnedIdentityVerified, true); assert.equal(retired.stopped, true);
   if (fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() === legacy.process.bootId && fs.existsSync('/proc/' + legacy.process.pid + '/stat')) {
    const stat = fs.readFileSync('/proc/' + legacy.process.pid + '/stat', 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], legacy.process.startTime, 'Retired API14 must not still be the same live process');
   }
  }
  return { kind: 'verified-fixed14-retained-parent-for15', frozenState14: spec.frozenState14, registry4: spec.registry4, archive344: spec.archive344, finalRetention14: spec.finalRetention14,
    state, resources: legacy.resources, Main13Bridge: legacy.Main13Bridge, conservation, source14: archive.source, compile14: archive.compile, helper14: archive.helper, retirementVerified: requireRetired, retainedParentOnly: true, current15Granted: false };
}

function verifyRustExecutionHistory15(binding, parent, sourcePin, compilePin) {
  const history = json15(binding.rustExecutionHistory), review = json15(binding.rustExecutionReview);
  assert.equal(history.kind, 'Root-actual-raw-build119-execution-history'); assert.equal(history.namespace, C15.namespace);
  assert.deepEqual(history.modes.map(x => x.mode), ['inventory-copy', 'checks-build']);
  for (const k of ['actualHelperBinding', 'actualAPI15', 'actualState15']) assert.equal(history[k], null);
  assert.equal(review.kind, 'non-author-actual-raw-build119-history-readback'); assert.equal(review.verdict, 'approved-raw-build-only'); assert.equal(review.reviewerIsRootExecutor, false); samePin15(review.history, binding.rustExecutionHistory); samePin15(review.rawPair, history.rawPair); samePin15(review.sourcePins, sourcePin); samePin15(review.compilePins, compilePin); assert.equal(review.actualEightCargoCommandsVerified, true); assert.equal(review.actualSource15Admission, false); assert.equal(review.G3, false); assert.equal(review.G4, false);
  const archive = json15(parent.archive344), archivalHelpers = new Map(archive.files.filter(x => x.relative.startsWith('tools/rust-r4ghi/business/')).map(x => [x.relative, x.archive]));
  for (const m of history.modes) {
    const input = json15(m.input), approval = json15(m.approval), intent = json15(m.intent), complete = json15(m.complete);
    assert.equal(input.kind, 'Root-source15-119-build-input'); assert.equal(input.mode, m.mode); assert.equal(approval.kind, 'Root-exact-source15-119-build'); samePin15(approval.input, m.input); assert.equal(approval.mode, m.mode); samePin15(approval.toolingManifest, input.tooling.manifest);
    assert.equal(approval.stateMinted, false); assert.equal(approval.domainHTTP, false); assert.equal(approval.ordinaryContextCreated, false); assert.equal(approval.runsCargo, m.mode === 'checks-build'); assert.equal(approval.mirrorSourceCopy, m.mode === 'inventory-copy'); assert.equal(approval.helperFSBinding, false);
    samePin15(intent.input, m.input); samePin15(intent.approval, m.approval); assert.equal(intent.mode, m.mode);
    assert.equal(complete.kind, 'actual-source15-build-mode-complete119'); assert.equal(complete.mode, m.mode); samePin15(complete.input, m.input); samePin15(complete.approval, m.approval); samePin15(complete.result, m.mode === 'inventory-copy' ? history.inventory : history.rawPair); assert.equal(complete.Source15Admitted, false);
    assert.equal(m.intent.file, input.outputDirectory + '/intent.json'); assert.equal(m.complete.file, input.outputDirectory + '/complete.json');
    if (m.mode === 'checks-build') samePin15(input.inventory, history.inventory); else assert.equal(input.inventory, null);
    assert.equal((m.mode === 'inventory-copy' ? history.inventory : history.rawPair).file, input.outputDirectory + (m.mode === 'inventory-copy' ? '/inventory-copy.json' : '/build-pair.json'));
    assert.equal(input.retirement14, null); assert.equal(input.helperPins, null); assert.equal(input.preAPIPlan, null); assert.equal(input.buildPair, null);
    assert.deepEqual(json15(input.currentHelperPins), parent.helper14); assert.equal(input.currentHelperPins.rawBytesSha256, C15.helper14SHA);
    for (const p of parent.helper14) { const stored = archivalHelpers.get(p.file); assert(stored); assert.equal(stored.rawBytesSha256, p.sha256); readPin15(stored); }
    const manifest = json15(input.tooling.manifest), codeReview = json15(input.tooling.independentCodeReview); assert.equal(manifest.kind, 'source15-admission119-code-candidate'); assert.equal(manifest.production.length, 1); assert.equal(manifest.production[0].file, 'tools/rust-r4ghi/source15-admission119/build-source15.mjs'); assertRawHistoryIdentity15(m.mode, manifest.production[0].afterSHA256, input.tooling.manifest.rawBytesSha256, manifest.edition);
    assert.equal(codeReview.kind, 'non-author-source15-admission119-code-review'); samePin15(codeReview.toolingManifest, input.tooling.manifest); assert.equal(codeReview.rawBuildCodeReady, true); assert.deepEqual(codeReview.coveredModes, ['inventory-copy', 'checks-build']); assert.equal(codeReview.actualG2Authorized, false);
    assert.equal(input.tooling.executionSources.length, 1); assert.equal(m.codeMappings.length, 1); const declared = input.tooling.executionSources[0], mapping = m.codeMappings[0]; assert.equal(mapping.target, declared.target); assert.equal(mapping.original.file, C15.root + '/' + mapping.target); samePin15(mapping.original, declared); samePin15(mapping.original, input.tooling.entry); assert.equal(mapping.original.rawBytesSha256, manifest.production[0].afterSHA256);
    assert(mapping.retained.file.startsWith(C15.private + '/')); assert.notEqual(mapping.retained.file, mapping.original.file); assert.equal(mapping.retained.rawBytesSha256, mapping.original.rawBytesSha256); readPin15(mapping.retained);
    // Never read mapping.original as current code: it was truthfully executed
    // at that path and may since have an independently approved successor.
  }
  const pair = json15(history.rawPair); assert.equal(pair.kind, 'actual-source15-eight-Cargo-steps119'); samePin15(pair.inventory, history.inventory); assert.equal(pair.helperPins, null); assert.equal(pair.NodeHelpersWereCargoInputs, false); samePin15(pair.inventory, binding.Root.receipt); samePin15(pair.Root, binding.Root.cargoReceipt); samePin15(pair.mirror, binding.mirror.receipt);
  const inventory = json15(history.inventory); samePin15(inventory.sourcePins, sourcePin); samePin15(inventory.compilePins, compilePin);
  return history;
}

function historicalBuild15_121(consumer, source, compile, helpers, parent) {
  const b = json15(consumer.buildBinding); assert.equal(b.kind, 'actual-source15-owned-root-mirror-build119'); assert.equal(b.namespace, C15.namespace); assert.equal(b.targetDirectory, consumer.binaryRoot);
  for (const [a, p] of [[b.sourcePins, consumer.sourcePins], [b.compilePins, consumer.compilePins], [b.helperPins, consumer.helperPins], [b.binary, consumer.binary], [b.summaryBinary, consumer.summaryBinary]]) samePin15(a, p);
  assert.equal(b.sourcePinsSHA256, sha15(JSON.stringify(source))); assert.equal(b.sourceCount, source.length); assert.equal(b.helperCount, helpers.length); assert.deepEqual(b.binaryFiles, consumer.binaryFiles);
  assert.equal(b.NodeHelpersWereCargoInputs, false); verifyRustExecutionHistory15(b, parent, consumer.sourcePins, consumer.compilePins);
  const inventory = json15(b.Root.receipt), rootCargo = json15(b.Root.cargoReceipt), mirrorCargo = json15(b.mirror.receipt);
  assert.equal(inventory.kind, 'actual-Source15-source-inventory-and-copy119'); assert.equal(inventory.root, C15.root); assert.equal(inventory.destinationRoot, C15.mirror); assert.equal(inventory.sourceStable, true);
  assert.deepEqual(canonicalInputs(inventory.inputs, C15.root), compile); assert.deepEqual(canonicalInputs(inventory.copiedInputs, C15.mirror), compile);
  const suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const [r, root, target] of [[rootCargo, C15.root, b.Root.targetDirectory], [mirrorCargo, C15.mirror, consumer.binaryRoot]]) {
    assert.equal(r.kind, 'actual-Source15-owned-cargo-checks-and-build119'); assert.equal(r.root, root); assert.equal(r.sourceStable, true); assert.equal(r.targetDirectory, target); assert(target.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/'));
    assert.deepEqual(canonicalInputs(r.inputs, root), compile);
    for (const name of Object.keys(suffixes)) { const s = r.steps[name]; assert.equal(s.kind, 'actual-source15-owned-cargo-command119'); assert.equal(s.command, name); assert.equal(s.cwd, root); assert.equal(s.targetDirectory, target); assert.equal(s.exitCode, 0); assert.deepEqual(s.env, cargoEnvironment15(target), 'Actual checks03 child environment is fully recorded, task cache only, offline and two jobs'); assert.deepEqual(s.argv, ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', root + '/apps/poms-api-rust/Cargo.toml', ...suffixes[name]]); readPin15(s.stdout); readPin15(s.stderr); }
    for (const k of ['binary', 'summaryBinary']) historicalBinary121(r[k], r.binaryFiles);
  }
  assert.notEqual(b.Root.targetDirectory, consumer.binaryRoot);
  for (const k of ['binary', 'summaryBinary']) { samePin15(mirrorCargo[k], consumer[k]); historicalBinary121(consumer[k], consumer.binaryFiles); inside(consumer.binaryRoot, consumer[k].file); }
  assert.deepEqual(mirrorCargo.binaryFiles, consumer.binaryFiles);
  for (const root of [C15.root, C15.mirror]) { for (const p of compile) leaf15(root, p.file, p.sha256); assert.deepEqual(cargoFiles15(root), compile.map(x => x.file).filter(f => f.startsWith('apps/poms-api-rust/') || f.startsWith('.cargo/')).sort()); }
  return b;
}

// Exact protected historical data-frame helper; never a current context brand.
function oldContext252(ctx,p,old){return{...ctx,epoch:C252.producerEpoch,run:C252.run,priv:ctx.private+'/business/'+C252.producerEpoch+'/'+C252.run,state:old,pins:old.sourcePins,helperPins:json(p.producer.helperPins)};}

const canonicalInputs = (list, root) => list.map(x => ({ file: path.posix.relative(root, x.file), sha256: x.sha256 ?? x.rawBytesSha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
