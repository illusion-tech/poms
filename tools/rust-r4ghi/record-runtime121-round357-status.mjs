// Record a real host restart and stopped input04 without restoring any runtime.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,local,pin,read} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();const R=C.root,P=C.private;
const check=(f,h)=>{const p=pin(f);assert.equal(p.rawBytesSha256,h);return p;};
const previous=json(pin(R+'/docs/design/rust-r4ghi/continuation-status356.json'));
const loss=check(P+'/runtime-loss357-observation01/observation.json','9c3c49edae6a5cac755bc6bf91ff94b99058ba76ea386a961b64fa12ed650571'),ob=json(loss);
const actualSource=check(P+'/runtime121-native06-source-promotion/e226bfb4-59e2-4fdb-9682-504c9a6cde61/complete.json','91a4ce4d701f0d81d509bca2f2e5c4f5e2c916a4d2854d129c437bcdf48ce19e'),source=json(actualSource);
const composition=check(P+'/runtime121-compositions06/17ca9a05-544f-486d-be19-2807de42b0c0/complete.json','9124829bdb1aa311055e99a4604767936914970c27d96b33ffc58e3fefb56c1a');
const command=pin(R+'/tmp/rust-r4ghi/root/API121-preflight04/command-receipt.json');assert.equal(json(command).exitCode,1);
const stderr=pin(R+'/tmp/rust-r4ghi/root/API121-preflight04/stderr-original.log'),failure=json(stderr);assert.equal(failure.frames[0].function,'holderFacts');assert.equal(failure.frames[0].line,110);
const O=R+'/tools/rust-r4ghi/runtime-recovery121/API-preflight04-actual';assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
const copies=[];function copy(p,name){const f=O+'/'+name;fs.writeFileSync(local(f),read(p),{flag:'wx'});const copy=pin(f);assert.equal(copy.rawBytesSha256,p.rawBytesSha256);copies.push({original:p,copy});}
for(const name of ['command-receipt.json','stdout-original.log','stderr-original.log'])copy(pin(R+'/tmp/rust-r4ghi/root/API121-preflight04/'+name),name);
copy(loss,'second-loss-observation.json');
const hostRoot='/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/independent-runtime-loss121-Windows01';
for(const name of ['manifest-holder-loss01.json','note-holder-loss01.json','selected-host-events01.json'])copy(pin(hostRoot+'/'+name),'host-'+name);
const reuse=check('/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime121-A-reuse-after-boot-loss01/A7-new-boot-reuse-note121.json','e2a218176c641c88d2cfca4f5cc7edec5754c3318ff94edb22d93a077781a523');copy(reuse,'A7-reuse-note.json');
for(const p of Object.values(previous.unchangedBookends))read(p);
const status={kind:'R4-runtime121-source-ready-second-host-restart-status357',recordedAt:new Date().toISOString(),previousStatus:'rust-r4ghi/continuation-status356.json',issue121:{state:'OPEN',currentDependencyReady:false},
  previousA:{...previous.actualA,currentRuntimeAuthority:false,observationsRemainHistorical:true},
  code:{...previous.code,I06:'b3b7e0929dc07a86ad4bdf428a4ea24225a88bb6cde285ca3478fa3d8d72dcb8',sourceCommit:'8db702a50f0b42c9d09492a5f99789e60e56fde2',wholeNamespacePositive:false},
  actualSource:{sourceComplete:actualSource,helper229:source.helperPins,external55:source.externalPins,execution284:source.executionSources,independentActualReadback:'eb41256aec6bb5aef4eed8f223b2f6dde586b823a236b3f941521c8ded0c7164',compositionComplete:composition,independentCompositionReadback:'1798e98bbddbd853050e5f90e1ead849bf01c965b0645381ee37734e7b6c2371',allRemainAsOfTheirObservedTime:true},
  current:{PGStarted:false,APIStarted:false,logicalDataConservationObservedForCurrentBoot:false,NativeContextGranted:false,actualHelperDirectoryCount:229,actualCurrent229Graph:source.helperPins,actualCurrent55External:source.externalPins,actualRuntimeRegistry:null,actualRuntimeCandidate:null,actualPreparedContinuation:null,TaxOrFIExecutedAfterFailure:false,sourcePromotionExecuted:true,APIStartG2Signed:false,fullRuntimeReady:false},
  stoppedPreflight:{input:pin(P+'/runtime121-B-inputs/api-start/24396a85-8b73-45c1-8462-55171a524b2e/input.json'),command,stderr,exitCode:1,firstFailure:{function:'holderFacts',line:110,cause:'original holder boot identity differs after host shutdown and reboot'},historicalReg5ReconstructionPassed:true,APIRequestCreated:false,RootReviewSigned:false,APIStarted:false,automaticRetry:false},
  secondLoss:{observation:loss,oldBoot:ob.priorHolder.bootId,currentBoot:ob.bootId,oldHolderWindowsPID:51024,oldHolderLinuxPID:4802,oldPGLinuxPID:6360,originalContainer:ob.originalContainer,PGVersion:ob.PGVersion,OIDDirectories:ob.originalDatabaseOIDDirectories,hostShutdownUTC:'2026-11-12T00:04:35.617Z',hostBootUTC:'2026-11-12T01:00:24.500Z',hostCauseEvidence:pin(hostRoot+'/note-holder-loss01.json'),shutdownOperatorAndDeeperCauseUnknown:true,currentLogicalConservationPending:true},
  recoveryProposal:pin(R+'/tools/rust-r4ghi/runtime-recovery121/g1A-round357-append01/proposal-G1A-round357.json'),
  unchangedBookends:previous.unchangedBookends,retained:previous.retained,official:previous.official,businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN',technical119HistoricalG4:'CLOSED',
  next:['New G1 append for unchanged A7 reuse and separate fresh exact G2 for each mode','New holder, original PG resume and two actual readonly conservation snapshots; new owner bundle','New API runtime input using genuine current records; separate API G2 and readback','FS admission/Ctor/fresh full67 and remaining original batch acceptance']};
const file=R+'/docs/design/rust-r4ghi/continuation-status357.json';fs.writeFileSync(local(file),JSON.stringify(status,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(local(O+'/copy-receipt.json'),JSON.stringify({kind:'Root-preflight04-and-host-restart-safe-retention',copies,status:pin(file),runtimeRestored:false,APIStarted:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:pin(file),copies:copies.length,currentPGStarted:false,APIStarted:false}));
