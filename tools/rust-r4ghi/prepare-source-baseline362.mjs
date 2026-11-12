// Existing nonsecret pin descriptors for a future finite source-only operation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',L='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',I='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=f=>fs.readFileSync(f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f);
const read=p=>{const b=raw(p.file);assert.equal(sha(b),p.rawBytesSha256,p.file);if(p.bytes!==undefined)assert.equal(b.length,p.bytes,p.file);return JSON.parse(b);};
const full=(file,bytes,rawBytesSha256)=>({file,bytes,rawBytesSha256});
const g3=full(L+'/tools/rust-r4ghi/runtime-recovery121/corrective362-g3-freeze01/Root-G3-code-input362.json',14235,'0bc2ad58712a8cc396f740701178b3e27cda8f16a615404c35f47f658ace10d2');read(g3);
const previous=JSON.parse(fs.readFileSync(R+'/tools/rust-r4ghi/runtime-recovery121/corrective361-g3-freeze01/baseline-pins361.json'));
const sourceComplete=full(P+'/runtime121-corrective361-source/a3d3040f-54ce-4f37-85ea-1aaacb18fe0d/complete.json',4303,'cf1cb797274fa45a7e08795782d32a888e362ec5720c922321d34a48a17d0a87');
const source=read(sourceComplete),witness=read(source.sourceWitness);
const pubDir=P+'/business/g2-business15/main01/runtime121-337610a0-0a68-4445-862b-1b108cc47ce9';
const retainedDir=P+'/runtime121-prepare361-failed01/1899fb63-42e3-4bd5-94d2-f1fbd8c57d57';
const result={kind:'runtime121-corrective362-unique-existing-source-baselines',G3:g3,
 originalCodeParentState:previous.originalCodeParentState,originalBase18:previous.originalBase18,originalOwnership:previous.ownership,M06:previous.M06,
 priorSourceComplete:sourceComplete,priorSourceWitness:source.sourceWitness,oldHelper229:source.helperPins,oldExternal55:source.externalPins,oldExecution284:source.executionSources,oldStageManifest4:witness.successorManifest,
 oldPlan:full(P+'/runtime121-native-plan-data/337610a0-0a68-4445-862b-1b108cc47ce9/native-plan121.json',78055,'6c667cb813a789fafb3af26d3d5bf096bbdc8b2da24da6686292ad007dd31767'),
 oldRegistry:full(pubDir+'/registry.json',134136,'3f7a1365d57755671fdefcaf5e5edd0ea9c78a85a9cf6656cd20b78f3f2808a8'),oldCandidate:full(pubDir+'/candidate.json',126007,'a0521865327f9fe3a164f7d43ddd1fb1bbac6dcf76d0c22738a487b908ba655a'),oldPublication:full(pubDir+'/complete.json',1522,'bd7d2a242ed2d2ca15d329a8ba1f9a59efcba004fa5532d43497a4047e8e5811'),
 oldPublicationReadback:full(I+'/tools/rust-r4ghi/I/implementation/corrective361-publication-readback-337610a0-0a68-4445-862b-1b108cc47ce9/review-actual-publication361.json',73104,'91fb810b4c56274070efb4de73eddf28fa2eaeef24339446983dfded5c0c49f8'),
 currentFailedState:full(retainedDir+'/after-state.json',14666792,'e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38'),ownership:full(retainedDir+'/after-ownership.jsonl',7456,'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989'),
 failurePartial:full(P+'/business/g2-business15/main01/tax118-invocation-1899fb63-42e3-4bd5-94d2-f1fbd8c57d57/partial.json',1399,'475056ab1ad4cd83c48b02babdf6de3b3efff8a3565cbf1267be54915fe743ce'),failureRetention:full(retainedDir+'/retention.json',7563,'23e42112aaf2b9d8005fbd86535845fddbf20f0b5e7c21726779c5924f78b4e9'),failureReadback:full(I+'/tools/rust-r4ghi/I/implementation/runtime121-prepare361-failure-independent01/evidence-failed-prepare361.json',20168,'04c743a9dd14f536e00e66a94265e1b664e45880b00f6b53fe78633d020a68ad'),
 retainedChangedSources:full(P+'/runtime121-corrective362-predecessor-source01/manifest.json',4952,'07e274546d26f98b8ef2e35e43b1c4370cdb09a6adcee7323416d727d743958e'),
 APIProcess:previous.APIProcess,APIInitialReadback:previous.APIInitialReadback,oldFailedBookend:previous.oldFailedBookend,allAreExistingPins:true,futureInputOrAuthorityCreated:false};
// Verify existing descriptors, keeping state/ownership bytes entirely private.
for(const [key,q]of Object.entries(result)){if(q&&typeof q==='object'&&q.file){if(['currentFailedState','ownership','originalOwnership'].includes(key)){const b=raw(q.file);assert.equal(b.length,q.bytes);assert.equal(sha(b),q.rawBytesSha256);}else read(q);}}
const D=R+'/tools/rust-r4ghi/runtime-recovery121/corrective362-source-baseline01';assert(!fs.existsSync(D));fs.mkdirSync(D,{recursive:true});const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');fs.writeFileSync(D+'/baseline-pins362.json',bytes,{flag:'wx'});
console.log(JSON.stringify({baseline:{file:L+'/tools/rust-r4ghi/runtime-recovery121/corrective362-source-baseline01/baseline-pins362.json',bytes:bytes.length,rawBytesSha256:sha(bytes)},sourceOrCanonicalStateWritten:false,futureInputOrAuthorityCreated:false}));
