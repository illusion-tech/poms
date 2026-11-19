// Root-only FS publication. No context factory, SQL, HTTP or process control.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const PRIVATE='/home/wangzishi/.local/share/poms-r4ghi/private';
const DATA=PRIVATE+'/business/g2-business15/main01';
const SELF=ROOT+'/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(pin) {
  assert(pin&&typeof pin.file==='string'&&path.resolve(pin.file)===pin.file);
  assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  const st=fs.lstatSync(pin.file);
  assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);
  assert.equal(fs.realpathSync(pin.file),pin.file);
  const bytes=fs.readFileSync(pin.file);assert.equal(sha(bytes),pin.rawBytesSha256);
  if(pin.bytes!==undefined)assert.equal(pin.bytes,bytes.length);return bytes;
}
const json=pin=>JSON.parse(read(pin));
function pin(file) {const b=fs.readFileSync(file);const p={file,bytes:b.length,rawBytesSha256:sha(b)};read(p);return p;}
function privatePin(p) { assert(p.file.startsWith(PRIVATE+'/'));return read(p); }
function canonicalSources(list) {
  assert(Array.isArray(list));
  const result=list.map(p=>{
    assert(p.file.startsWith(ROOT+'/'));read(p);
    return{file:p.file,rawBytesSha256:p.rawBytesSha256};
  }).sort((a,b)=>Buffer.compare(Buffer.from(a.file),Buffer.from(b.file)));
  assert.equal(new Set(result.map(x=>x.file)).size,result.length);return result;
}
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

// Builtin-only, exact three-stage source proof; identical in all four consumers.
const IO362={
  "freeze": {
    "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/corrective362-g3-freeze01/Root-G3-code-input362.json",
    "bytes": 14235,
    "rawBytesSha256": "0bc2ad58712a8cc396f740701178b3e27cda8f16a615404c35f47f658ace10d2"
  },
  "priorPlan": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native-plan-data/337610a0-0a68-4445-862b-1b108cc47ce9/native-plan121.json",
    "bytes": 78055,
    "rawBytesSha256": "6c667cb813a789fafb3af26d3d5bf096bbdc8b2da24da6686292ad007dd31767"
  },
  "priorRegistry": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-337610a0-0a68-4445-862b-1b108cc47ce9/registry.json",
    "bytes": 134136,
    "rawBytesSha256": "3f7a1365d57755671fdefcaf5e5edd0ea9c78a85a9cf6656cd20b78f3f2808a8"
  },
  "priorCandidate": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-337610a0-0a68-4445-862b-1b108cc47ce9/candidate.json",
    "bytes": 126007,
    "rawBytesSha256": "a0521865327f9fe3a164f7d43ddd1fb1bbac6dcf76d0c22738a487b908ba655a"
  },
  "priorPublication": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-337610a0-0a68-4445-862b-1b108cc47ce9/complete.json",
    "bytes": 1522,
    "rawBytesSha256": "bd7d2a242ed2d2ca15d329a8ba1f9a59efcba004fa5532d43497a4047e8e5811"
  },
  "priorReadback": {
    "file": "/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/corrective361-publication-readback-337610a0-0a68-4445-862b-1b108cc47ce9/review-actual-publication361.json",
    "bytes": 73104,
    "rawBytesSha256": "91fb810b4c56274070efb4de73eddf28fa2eaeef24339446983dfded5c0c49f8"
  },
  "retainedState": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/after-state.json",
    "bytes": 14666792,
    "rawBytesSha256": "e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38"
  },
  "retainedOwnership": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/after-ownership.jsonl",
    "bytes": 7456,
    "rawBytesSha256": "eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989"
  },
  "failurePartial": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/tax118-invocation-1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/partial.json",
    "bytes": 1399,
    "rawBytesSha256": "475056ab1ad4cd83c48b02babdf6de3b3efff8a3565cbf1267be54915fe743ce"
  },
  "failureRetention": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/retention.json",
    "bytes": 7563,
    "rawBytesSha256": "23e42112aaf2b9d8005fbd86535845fddbf20f0b5e7c21726779c5924f78b4e9"
  },
  "failureReadback": {
    "file": "/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-prepare361-failure-independent01/evidence-failed-prepare361.json",
    "bytes": 20168,
    "rawBytesSha256": "04c743a9dd14f536e00e66a94265e1b664e45880b00f6b53fe78633d020a68ad"
  },
  "priorEntry": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-native-entry-snapshots361/337610a0-0a68-4445-862b-1b108cc47ce9/entry-state.json",
    "bytes": 14253205,
    "rawBytesSha256": "76ad68ccf87565192f6089294ede52ab77d977f423a364c9d1b1ebb5d3d3263d"
  },
  "entryGuard": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/000028-tax118-entry-guard.json",
    "bytes": 8301,
    "rawBytesSha256": "9d5d4c184c31a3e4e1719b2193de39e8f827b161715b30515e24c2ef9efc26eb"
  },
  "exitGuard": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/000038-tax118-exit-guard.json",
    "bytes": 5752,
    "rawBytesSha256": "0624a337c73c0f8b4d9b6c47a02b4a6d256c7e53d7546e54e1c849b8a8cb97e3"
  },
  "closedJournal": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/000039-tax118-closed-journal.json",
    "bytes": 12740,
    "rawBytesSha256": "68ce00627d44338597ebd89201638d5f24b98dc478abd49414d78a368dd09f55"
  },
  "retainedSix": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective362-predecessor-source01/manifest.json",
    "bytes": 4952,
    "rawBytesSha256": "07e274546d26f98b8ef2e35e43b1c4370cdb09a6adcee7323416d727d743958e"
  },
  "priorSourceComplete": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective361-source/a3d3040f-54ce-4f37-85ea-1aaacb18fe0d/complete.json",
    "bytes": 4303,
    "rawBytesSha256": "cf1cb797274fa45a7e08795782d32a888e362ec5720c922321d34a48a17d0a87"
  },
  "priorGraph": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective361-source/a3d3040f-54ce-4f37-85ea-1aaacb18fe0d/actual-execution-sources284.json",
    "bytes": 60810,
    "rawBytesSha256": "8cb6f1e5a6ee9d1e2ea093fa49aa61c3e56f774602b45b195eaaea5c8ebb105f"
  },
  "sixSources": [
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs",
      "bytes": 59431,
      "rawBytesSha256": "5acf886f286e1844a8078bb0dffb3797384c211511d40eba3570024a458bcf8b"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/tax15-invocation118/tax15-once-wire.mjs",
      "bytes": 21877,
      "rawBytesSha256": "b3bf45a8227c2c661c7853b6687bab456fcc8120a7e66681bdb667f90f79cebc"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/tax15-invocation118/tax15-once-effects.mjs",
      "bytes": 19541,
      "rawBytesSha256": "559ce23d665d4f0e2aec13ead55ac57af0265559a80a5c958965f5301efbfafc"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/runtime-admission121.mjs",
      "bytes": 123267,
      "rawBytesSha256": "ba6f97749d35904a4071ef1914ca51a6e2f563ecfd426013b449d12c05162957"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/runtime-admission-core121.mjs",
      "bytes": 33196,
      "rawBytesSha256": "ff4052b563f5ff359385a81c1cb71cc06c4aa9e0017886a997c797d1c0ba4559"
    },
    {
      "file": "/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/native/publish-runtime121.mjs",
      "bytes": 36826,
      "rawBytesSha256": "a8f28d8a16daca2853f966bd30157f2c228ee7ec0a04b277831e0cd469d7fa24"
    }
  ],
  "failureNonce": "1899fb63-42e3-4bd5-94d2-f1fbd8c57d57",
  "priorSuccessor": {
    "file": "/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective361-source/a3d3040f-54ce-4f37-85ea-1aaacb18fe0d/successor12.json",
    "bytes": 3062,
    "rawBytesSha256": "099d3ade7822aa0460eb72c6ec77340d1ed553b9aea11067a1afc18b82943903"
  }
};
const keys362=(v,k)=>{assert(v&&Object.getPrototypeOf(v)===Object.prototype);assert.deepEqual(Object.keys(v).sort(),[...k].sort());};
function pin362(p,full=false){keys362(p,full||Object.hasOwn(p??{},'bytes')?['file','bytes','rawBytesSha256']:['file','rawBytesSha256']);assert(typeof p.file==='string'&&p.file.startsWith('/')&&path.posix.resolve(p.file)===p.file&&!p.file.includes('\\')&&!p.file.includes('//')&&!/[\0\r\n]/.test(p.file));assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));if(p.bytes!==undefined)assert(Number.isSafeInteger(p.bytes)&&p.bytes>=0);return p;}
function same362(a,b){pin362(a);pin362(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);if(a.bytes!==undefined&&b.bytes!==undefined)assert.equal(a.bytes,b.bytes);}
const sourceRows362=a=>{assert(Array.isArray(a));const b=a.map(p=>{pin362(p);assert(p.file.startsWith('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/'));return{file:p.file,rawBytesSha256:p.rawBytesSha256};}).sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file)));assert.equal(new Set(b.map(p=>p.file)).size,b.length);return b;};
function descriptors362(a,n){assert(Array.isArray(a)&&a.length===n);for(const p of a){keys362(p,['file','sha256']);assert(typeof p.file==='string'&&!p.file.startsWith('/')&&!p.file.includes('\\')&&!p.file.includes('//')&&!p.file.split('/').some(x=>!x||x==='.'||x==='..'));assert(/^[a-f0-9]{64}$/.test(p.sha256));}assert.deepEqual(a,[...a].sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file))));assert.equal(new Set(a.map(p=>p.file)).size,n);return a;}
function reviews362(a,newReview){assert(Array.isArray(a)&&a.length===4);const b=[...a,newReview];b.forEach(p=>pin362(p,true));assert.equal(new Set(b.map(p=>p.file)).size,5);return b.sort((x,y)=>Buffer.compare(Buffer.from(x.file),Buffer.from(y.file)));}
function validateSourceSuccessor362(m){
 const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',s=m.successor,w=m.witness,p2=m.predecessorPlan,prior=m.prior;
 keys362(s,['kind','schemaVersion','predecessorPlan','predecessorRegistry','predecessorCandidate','predecessorPublication','predecessorReadback','retainedCurrentState','failurePartial','failureRetention','failureReadback','sourceWitness']);assert.equal(s.kind,'Root-runtime121-client-successor-handoff');assert.equal(s.schemaVersion,2);
 for(const[k,n]of Object.entries({predecessorPlan:'priorPlan',predecessorRegistry:'priorRegistry',predecessorCandidate:'priorCandidate',predecessorPublication:'priorPublication',predecessorReadback:'priorReadback',retainedCurrentState:'retainedState',failurePartial:'failurePartial',failureRetention:'failureRetention',failureReadback:'failureReadback'})){pin362(s[k],true);assert.deepEqual(s[k],IO362[n]);}pin362(s.sourceWitness,true);
 keys362(w,['kind','schemaVersion','baselineCompositionComplete','baselineHelperPins','baselineExternalPins','baselineExecutionSources','baselineStageManifest','retainedChangedSources','successorManifest','successorCodeReview','currentHelperPins','currentExternalPins','currentExecutionSources']);assert.equal(w.kind,'Root-runtime121-three-stage-client-source-witness');assert.equal(w.schemaVersion,2);for(const k of Object.keys(w).filter(k=>!['kind','schemaVersion'].includes(k)))pin362(w[k],true);
 assert.deepEqual(w.baselineCompositionComplete,IO362.priorPublication);assert.deepEqual(w.retainedChangedSources,IO362.retainedSix);assert.equal(p2.protocolVersion,2);same362(p2.stateTransfer.successor,IO362.priorSuccessor);same362(w.baselineHelperPins,p2.current.helperPins);same362(w.baselineHelperPins,prior.witness.currentHelperPins);same362(w.baselineExternalPins,prior.witness.currentExternalPins);same362(w.baselineExecutionSources,prior.witness.currentExecutionSources);same362(w.baselineExecutionSources,IO362.priorGraph);same362(w.baselineStageManifest,p2.tooling.manifest);same362(w.baselineStageManifest,prior.witness.successorManifest);assert.deepEqual(sourceRows362(p2.tooling.executionSources),sourceRows362(prior.executionSources));
 const r=m.retainedSix;keys362(r,['kind','recordedAt','priorSourceComplete','oldGraph','oldExecutionCount','mappings','remainingUnchangedMembers','allPrior284CurrentlyRawMatched','priorSource361AndM06Unmodified','newSourceOrGraphCreated','productionWritten','canonicalStateWritten','modeExecuted','actualG2Granted']);assert.equal(r.kind,'Root-fixed-six-predecessor-source-retained362');same362(r.priorSourceComplete,IO362.priorSourceComplete);same362(r.oldGraph,IO362.priorGraph);assert.equal(r.oldExecutionCount,284);assert.equal(r.remainingUnchangedMembers,278);assert.equal(r.allPrior284CurrentlyRawMatched,true);assert.equal(r.priorSource361AndM06Unmodified,true);for(const k of['newSourceOrGraphCreated','productionWritten','canonicalStateWritten','modeExecuted','actualG2Granted'])assert.equal(r[k],false);assert(Array.isArray(r.mappings)&&r.mappings.length===6);assert.deepEqual(r.mappings.map(q=>q.relative),IO362.sixSources.map(q=>q.file.slice(root.length+1)));for(const[q,i]of r.mappings.map((q,i)=>[q,i])){keys362(q,['relative','original','retainedCopy']);assert.deepEqual(q.original,IO362.sixSources[i]);pin362(q.retainedCopy,true);assert.equal(q.retainedCopy.file,'/home/wangzishi/.local/share/poms-r4ghi/private/runtime121-corrective362-predecessor-source01/'+(i+1)+'-'+path.posix.basename(q.relative)+'.bin');assert.equal(q.original.bytes,q.retainedCopy.bytes);assert.equal(q.original.rawBytesSha256,q.retainedCopy.rawBytesSha256);}
 const old=sourceRows362(prior.executionSources),now=sourceRows362(m.executionSources);assert.equal(old.length,284);assert.equal(now.length,284);assert.deepEqual(old.map(p=>p.file),now.map(p=>p.file));descriptors362(m.helpers,229);descriptors362(m.external,55);assert.deepEqual(sourceRows362([...m.helpers,...m.external].map(p=>({file:root+'/'+p.file,rawBytesSha256:p.sha256}))),now);assert.deepEqual(prior.helpers.map(p=>p.file),m.helpers.map(p=>p.file));assert.deepEqual(prior.external.map(p=>p.file),m.external.map(p=>p.file));const changed=now.filter((p,i)=>p.rawBytesSha256!==old[i].rawBytesSha256);assert.deepEqual(changed.map(p=>p.file).sort(),IO362.sixSources.map(p=>p.file).sort());
 const manifest=m.manifest,review=m.review;assert.equal(manifest.kind,'I-runtime121-code-candidate');assert.equal(manifest.edition,362);same362(manifest.correctiveG3,IO362.freeze);assert(Array.isArray(manifest.production)&&manifest.production.length===6);assert.deepEqual(manifest.production.map(p=>root+'/'+p.file).sort(),IO362.sixSources.map(p=>p.file).sort());assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');assert.equal(review.reviewerIsAuthor,false);assert(typeof review.author==='string'&&review.author&&typeof review.reviewer==='string'&&review.reviewer&&review.author!==review.reviewer);same362(review.componentManifest,w.successorManifest);same362(review.correctiveG3,IO362.freeze);same362(review.technicalG1,IO361.G1B);assert(Array.isArray(review.entries)&&review.entries.length===6);assert.equal(new Set(review.entries.map(p=>p.file)).size,6);for(const[p,i]of manifest.production.map((p,i)=>[p,i])){const before=old.find(q=>q.file===root+'/'+p.file),after=now.find(q=>q.file===root+'/'+p.file);assert(before&&after);assert.equal(p.operation,'MOD');assert.equal(p.beforeSHA256,before.rawBytesSha256);assert.equal(p.afterSHA256,after.rawBytesSha256);assert.notEqual(p.beforeSHA256,p.afterSHA256);pin362(p.candidate,true);assert.equal(p.candidate.rawBytesSha256,p.afterSHA256);const e=review.entries.find(e=>e.file===p.file);assert(e);assert.equal(e.beforeSHA256,p.beforeSHA256);assert.equal(e.afterSHA256,p.afterSHA256);assert.equal(e.productPointer,'/production/'+i);}
 same362(m.predecessorRegistry.approvedPlan,s.predecessorPlan);same362(m.predecessorCandidate.runtimeAdmission121,s.predecessorRegistry);same362(m.predecessorPublication.input,s.predecessorPlan);same362(m.predecessorPublication.registry,s.predecessorRegistry);same362(m.predecessorPublication.candidate,s.predecessorCandidate);assert.equal(m.predecessorPublication.statePublished,true);assert.equal(m.predecessorReadback.kind,'non-author-runtime121-corrective361-actual-FS-publication-readback');assert.equal(m.predecessorReadback.verdict,'approved-actual-exact-successor-FS-publication-readback');same362(m.predecessorReadback.complete,s.predecessorPublication);same362(m.predecessorReadback.plan,s.predecessorPlan);same362(m.predecessorReadback.registry,s.predecessorRegistry);same362(m.predecessorReadback.candidate,s.predecessorCandidate);same362(m.predecessorReadback.immutablePrivateEntrySnapshot,IO362.priorEntry);same362(m.retainedState.runtimeAdmission121.registry,s.predecessorRegistry);same362(m.retainedState.runtimeAdmission121.candidate,s.predecessorCandidate);assert.equal(m.retainedState.sequence,39);return m;
}
function loadSourceSuccessor362(reader,successorPin){
 const raw=p=>{pin362(p);return reader(p);},get=p=>JSON.parse(raw(p));pin362(successorPin,true);const freeze=get(IO362.freeze);assert.equal(freeze.kind,'Root-frozen-runtime121-corrective362-G3-code-input');assert.equal(freeze.codeImplementationGranted,true);assert.equal(freeze.sourcePromotionGranted,false);assert.equal(freeze.actualTimingOrG2Authorized,false);
 const successor=get(successorPin);keys362(successor,['kind','schemaVersion','predecessorPlan','predecessorRegistry','predecessorCandidate','predecessorPublication','predecessorReadback','retainedCurrentState','failurePartial','failureRetention','failureReadback','sourceWitness']);assert.equal(successor.kind,'Root-runtime121-client-successor-handoff');assert.equal(successor.schemaVersion,2);for(const[k,n]of Object.entries({predecessorPlan:'priorPlan',predecessorRegistry:'priorRegistry',predecessorCandidate:'priorCandidate',predecessorPublication:'priorPublication',predecessorReadback:'priorReadback',retainedCurrentState:'retainedState',failurePartial:'failurePartial',failureRetention:'failureRetention',failureReadback:'failureReadback'}))assert.deepEqual(successor[k],IO362[n]);
 const witness=get(successor.sourceWitness);keys362(witness,['kind','schemaVersion','baselineCompositionComplete','baselineHelperPins','baselineExternalPins','baselineExecutionSources','baselineStageManifest','retainedChangedSources','successorManifest','successorCodeReview','currentHelperPins','currentExternalPins','currentExecutionSources']);assert.equal(witness.kind,'Root-runtime121-three-stage-client-source-witness');assert.equal(witness.schemaVersion,2);assert.deepEqual(witness.retainedChangedSources,IO362.retainedSix);
 const retainedSix=get(witness.retainedChangedSources);assert(Array.isArray(retainedSix.mappings)&&retainedSix.mappings.length===6);const sixMap=new Map();for(const[q,i]of retainedSix.mappings.map((q,i)=>[q,i])){keys362(q,['relative','original','retainedCopy']);assert.deepEqual(q.original,IO362.sixSources[i]);pin362(q.retainedCopy,true);assert.equal(q.original.rawBytesSha256,q.retainedCopy.rawBytesSha256);assert.equal(q.original.bytes,q.retainedCopy.bytes);raw(q.retainedCopy);assert(!sixMap.has(q.original.file));sixMap.set(q.original.file,q);}
 // Exactly stage361 six preimages. The nested361 reader still owns a226/M06 four.
 const historicalRead=p=>{const q=sixMap.get(p.file);if(q){same362(p,q.original);return raw(q.retainedCopy);}return raw(p);};
 const predecessorPlan=get(successor.predecessorPlan);const prior=readSuccessorFiles361(predecessorPlan,historicalRead);same362(predecessorPlan.stateTransfer.successor,IO362.priorSuccessor);const priorSource=get(IO362.priorSourceComplete);same362(priorSource.sourceWitness,prior.successor.sourceWitness);same362(priorSource.successor,predecessorPlan.stateTransfer.successor);same362(priorSource.executionSources,witness.baselineExecutionSources);
 const m={successorPin,successor,witness,retainedSix,predecessorPlan,prior,predecessorRegistry:get(successor.predecessorRegistry),predecessorCandidate:get(successor.predecessorCandidate),predecessorPublication:get(successor.predecessorPublication),predecessorReadback:get(successor.predecessorReadback),retainedState:get(successor.retainedCurrentState),helpers:get(witness.currentHelperPins),external:get(witness.currentExternalPins),executionSources:get(witness.currentExecutionSources),manifest:get(witness.successorManifest),review:get(witness.successorCodeReview)};validateSourceSuccessor362(m);
 for(const p of[successor.failurePartial,successor.failureRetention,successor.failureReadback,IO362.priorEntry,IO362.retainedOwnership,...predecessorPlan.composition.independentCodeReviews])raw(p);for(const p of m.manifest.production)raw(p.candidate);for(const p of m.executionSources)raw(p);const baseLog=raw(predecessorPlan.base.ownership15),afterLog=raw(IO362.retainedOwnership);assert.equal(baseLog.length,5560);assert.equal(afterLog.length,7456);assert(afterLog.subarray(0,baseLog.length).equals(baseLog),'362 retained eb4a must preserve b76');
 return m;
}
function validatePlan362(plan,m,h,e){validateSourceSuccessor362(m);keys362(plan,['kind','protocolVersion','namespace','epoch','run','nonce','base','current','composition','stateTransfer','tooling','outputs']);assert.equal(plan.kind,'source15-append-runtime-plan121');assert.equal(plan.protocolVersion,3);for(const[k,v]of Object.entries({namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01'}))assert.equal(plan[k],v);assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(plan.nonce));assert.deepEqual(plan.base,m.predecessorPlan.base);keys362(plan.current,['sourcePins','compilePins','helperPins','helperCount','binary','summaryBinary','binaryFiles','nodeExecutable','lifetimeOwner','PGStart','PGConservation','apiProcess','readiness']);const expected=JSON.parse(JSON.stringify(m.predecessorPlan.current));expected.helperPins=m.witness.currentHelperPins;assert.deepEqual(plan.current,expected);keys362(plan.stateTransfer,['expectedState','expectedOwnership','actorCacheDelta','successor']);assert.deepEqual(plan.stateTransfer.expectedState,IO362.retainedState);assert.deepEqual(plan.stateTransfer.expectedOwnership,IO362.retainedOwnership);pin362(plan.stateTransfer.successor,true);same362(plan.stateTransfer.successor,m.successorPin);keys362(plan.stateTransfer.actorCacheDelta,['actorKeys','clearCookies','clearPermissions']);assert.deepEqual(plan.stateTransfer.actorCacheDelta,{actorKeys:Object.keys(m.retainedState.actors).sort(),clearCookies:false,clearPermissions:false});keys362(plan.composition,['helperComposition','externalComposition','independentCodeReviews']);assert.deepEqual(plan.composition.independentCodeReviews,reviews362(m.predecessorPlan.composition.independentCodeReviews,m.witness.successorCodeReview));keys362(h,['kind','schemaVersion','baseline','finalHelperPins','sourceWitness']);keys362(e,['kind','schemaVersion','baseline','finalSources','sourceWitness']);assert.equal(h.kind,'Root-Source15-runtime121-H3-successor-composition');assert.equal(e.kind,'Root-Source15-runtime121-external-successor-composition');assert.equal(h.schemaVersion,3);assert.equal(e.schemaVersion,3);same362(h.baseline,m.predecessorPlan.composition.helperComposition);same362(e.baseline,m.predecessorPlan.composition.externalComposition);same362(h.finalHelperPins,m.witness.currentHelperPins);same362(h.sourceWitness,m.successor.sourceWitness);same362(e.sourceWitness,m.successor.sourceWitness);assert.deepEqual(e.finalSources,m.external);keys362(plan.tooling,['manifest','executionSources']);same362(plan.tooling.manifest,m.witness.successorManifest);assert.deepEqual(plan.tooling.executionSources,m.executionSources);keys362(plan.outputs,['registryFile','candidateFile','receiptDirectory']);const d='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/runtime121-'+plan.nonce;assert.deepEqual(plan.outputs,{registryFile:d+'/registry.json',candidateFile:d+'/candidate.json',receiptDirectory:d});return plan;}
function readSuccessorFiles362(plan,reader){const m=loadSourceSuccessor362(reader,plan.stateTransfer.successor);const h=JSON.parse(reader(plan.composition.helperComposition)),e=JSON.parse(reader(plan.composition.externalComposition));validatePlan362(plan,m,h,e);return m;}

function preimport(plan,input,approvalPin=null) {
  // Only built-in local strict readers run before the complete module closure.
  assert.equal(plan.kind,'source15-append-runtime-plan121');
  assert.equal(plan.namespace,'poms-r4ghi');assert.equal(plan.epoch,'g2-business15');
  assert([1,2,3].includes(plan.protocolVersion));if(plan.protocolVersion===3)readSuccessorFiles362(plan,read);else if(plan.protocolVersion===2)readSuccessorFiles361(plan,read);
  privatePin(input);privatePin(plan.current.helperPins);
  const helpers=json(plan.current.helperPins);assert.equal(helpers.length,229);
  const names=fs.readdirSync(ROOT+'/tools/rust-r4ghi/business')
    .filter(n=>/\.(mjs|json)$/.test(n)).sort();
  assert.deepEqual(names,helpers.map(p=>path.posix.basename(p.file)));
  for(const p of helpers) {
    assert.equal(p.file,'tools/rust-r4ghi/business/'+path.posix.basename(p.file));
    assert(/^[a-f0-9]{64}$/.test(p.sha256));
    read({file:ROOT+'/'+p.file,rawBytesSha256:p.sha256});
  }
  const sources=canonicalSources(plan.tooling.executionSources);
  for(const name of ['runtime-admission121.mjs','runtime-admission-core121.mjs'])
    assert(sources.some(p=>p.file===ROOT+'/tools/rust-r4ghi/business/'+name));
  const self=pin(SELF);assert.equal(fileURLToPath(import.meta.url),SELF);
  assert(sources.some(p=>p.file===self.file&&p.rawBytesSha256===self.rawBytesSha256));
  const manifest=json(plan.tooling.manifest);assert.equal(manifest.kind,'I-runtime121-code-candidate');
  assert.equal(manifest.production.length,plan.protocolVersion===3?6:plan.protocolVersion===2?4:9);
  for(const e of manifest.production)
    assert(sources.some(p=>p.file===ROOT+'/'+e.file&&p.rawBytesSha256===e.afterSHA256));
  if(approvalPin) {
    privatePin(approvalPin);const approval=json(approvalPin);
    assert.equal(approval.kind,'Root-approved-exact-runtime-admission121');
    assert.equal(approval.actualG2Authorized,true);
    assert.equal(approval.FSStatePublicationGranted,true);
    for(const flag of ['APIStartGranted','PGWriteGranted','TaxHTTPGranted'])assert.equal(approval[flag],false);
    assert.deepEqual({file:approval.operator.file,rawBytesSha256:approval.operator.rawBytesSha256},
      {file:self.file,rawBytesSha256:self.rawBytesSha256});
    assert.deepEqual({file:approval.approvedPlan.file,rawBytesSha256:approval.approvedPlan.rawBytesSha256},
      {file:input.file,rawBytesSha256:input.rawBytesSha256});
  }
  return sources;
}
export function installWx121(file,value) {
  assert.equal(path.resolve(file),file);assert.equal(fs.realpathSync(path.dirname(file)),path.dirname(file));
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  const actual=pin(file);assert.equal(actual.rawBytesSha256,sha(bytes));return actual;
}
export function assertStateCAS121(file,expected) {
  const actual=pin(file);assert.equal(actual.rawBytesSha256,expected.rawBytesSha256);
  if(expected.bytes!==undefined)assert.equal(actual.bytes,expected.bytes);
  return fs.readFileSync(file);
}
export async function main121(args=process.argv.slice(2)) {
  if(args.length===1&&args[0]==='--help') {
    console.log('Root121 FS only: --input FILE --approved-input-sha SHA --inspect; or --input FILE --approved-input-sha SHA --review ROOT-G2 --approved-review-sha SHA --execute');return;
  }
  assert.equal(process.platform,'linux');assert.equal(process.cwd(),ROOT);assert.equal(process.getuid(),1000);
  assert.equal(process.version,'v24.19.0');assert.deepEqual(process.execArgv,[]);
  assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  const inspect=args.length===5&&args[4]==='--inspect';
  assert(inspect||args.length===9&&args[8]==='--execute');
  assert.equal(args[0],'--input');assert.equal(args[2],'--approved-input-sha');
  const input={file:args[1],rawBytesSha256:args[3]};privatePin(input);
  const plan=json(input);
  let approvalPin=null;
  if(!inspect) {
    assert.equal(args[4],'--review');assert.equal(args[6],'--approved-review-sha');
    approvalPin={file:args[5],rawBytesSha256:args[7]};
  }
  const sourceBefore=preimport(plan,input,approvalPin);
  const n=await import(pathToFileURL(ROOT+'/tools/rust-r4ghi/business/runtime-admission121.mjs').href);
  const c=await import(pathToFileURL(ROOT+'/tools/rust-r4ghi/business/runtime-admission-core121.mjs').href);
  assert.deepEqual(preimport(plan,input,approvalPin),sourceBefore);
  const facts=n.verifyRuntimePlan121(input);
  if(inspect) {
    console.log(JSON.stringify({kind:'runtime121-FS-plan-inspected',approvedPlan:input,
      scope121:c.scope121(plan),currentGranted:false,statePublished:false}));return;
  }
  const approval=json(approvalPin),reviewPin=approval.independentInputReview,review=json(reviewPin);
  c.assertRuntimeApproval121(plan,input,reviewPin,review,approval);
  const lock=DATA+'/driver.lock',lockBytes=Buffer.from(JSON.stringify({
    kind:'runtime121-exclusive-FS-publication',pid:process.pid,nonce:plan.nonce,input,approval:approvalPin,
  })+'\n');
  fs.writeFileSync(lock,lockBytes,{flag:'wx',mode:0o600});
  let made=false,published=false;
  try {
    const original=assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    assertStateCAS121(DATA+'/ownership.jsonl',plan.stateTransfer.expectedOwnership);
    c.publishIdle121(JSON.parse(original),plan);
    assert(!fs.existsSync(plan.outputs.receiptDirectory),'Existing/orphan runtime output requires Root reconciliation');
    assert.equal(path.dirname(plan.outputs.receiptDirectory),DATA);
    fs.mkdirSync(plan.outputs.receiptDirectory,{mode:0o700});made=true;
    installWx121(plan.outputs.receiptDirectory+'/intent.json',{
      kind:'actual-runtime121-FS-publication-intent',input,approval:approvalPin,review:reviewPin,
      sourceBefore,ordinaryContextCreated:false,SQLHTTP:false,
    });
    const refreshed=n.verifyRuntimePlan121(input);
    assert.deepEqual(refreshed.current,facts.current);
    const registry=c.registryBody121(plan,input,refreshed,reviewPin,approvalPin);
    const registryPin=installWx121(plan.outputs.registryFile,registry);
    assert.deepEqual(json(registryPin),registry);
    const candidate=c.candidateBody121(plan,registryPin,registry);
    const candidatePin=installWx121(plan.outputs.candidateFile,candidate);
    assert.deepEqual(json(candidatePin),candidate);
    assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    assertStateCAS121(DATA+'/ownership.jsonl',plan.stateTransfer.expectedOwnership);
    assert(fs.readFileSync(lock).equals(lockBytes));
    const state=c.stateBody121(JSON.parse(original),plan,{verifiedFromDisk:true,
      registryPin,registryBody:json(registryPin),candidatePin,candidateBody:json(candidatePin)},new Date().toISOString());
    const temp=DATA+'/state.json.runtime121-'+plan.nonce+'.tmp';
    const staged=installWx121(temp,state);
    assertStateCAS121(DATA+'/state.json',plan.stateTransfer.expectedState);
    if(plan.protocolVersion===3){
      const retainedOwnership=privatePin(plan.stateTransfer.expectedOwnership);
      const currentOwnership=assertStateCAS121(DATA+'/ownership.jsonl',plan.stateTransfer.expectedOwnership);
      assert(currentOwnership.equals(retainedOwnership),'Final362 ownership bytes differ from immutable retained ownership');
    }
    assert(fs.readFileSync(lock).equals(lockBytes));fs.renameSync(temp,DATA+'/state.json');published=true;
    const written=pin(DATA+'/state.json');assert.equal(written.rawBytesSha256,staged.rawBytesSha256);
    assert.deepEqual(json(written),state);
    const complete=installWx121(plan.outputs.receiptDirectory+'/complete.json',{
      kind:'actual-Source15-runtime121-FS-publication-complete',input,approval:approvalPin,
      registry:registryPin,candidate:candidatePin,state:written,ordinaryContextCreated:false,
      statePublished:true,APIStarted:false,SQLHTTP:false,G3:false,G4:false,
    });
    assert(fs.readFileSync(lock).equals(lockBytes));fs.unlinkSync(lock);
    console.log(JSON.stringify({complete,statePublished:true,realConstructorAcceptanceStillRequired:true}));
  } catch(error) {
    if(made)try {
      installWx121(plan.outputs.receiptDirectory+'/partial.json',{
        kind:'runtime121-FS-publication-partial-preserve',input,approval:approvalPin,
        error:{name:error.name,message:error.message},stateMayBePublished:published,
        orphanFilesAndLockPreserved:true,blindRetryForbidden:true,
      });
    } catch(secondary) { error.partialWriteError=secondary.message; }
    throw error;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main121().catch(error=>{console.error(JSON.stringify({
    kind:'runtime121-FS-stopped-preserve',message:error.message,
    partialWriteError:error.partialWriteError??null,blindRetryForbidden:true,
  }));process.exitCode=1;});
