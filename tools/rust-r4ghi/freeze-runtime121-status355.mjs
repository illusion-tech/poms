// Current actual A facts and bounded code steps; no runtime/B authorization.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, holderFacts, json, pin, stateFiles, stateSHAs } from './runtime-recovery121/root/facts121.mjs';
import { inspectOriginalPG121 } from './runtime-recovery121/root/resume-original-pg121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const R=C.root,P=C.private,checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const holder=checked(P+'/runtime121-A/holder-start/18922a5d-22d8-45c8-871a-8a0339649653/holder-ready.json','0961936de6be3ca430db57d1feaf0529501e58aa554326f89b75f7afd4db18d6');
holderFacts({holder});
const PGStart=checked(P+'/runtime121-A/pg-start/d785af86-078b-4ba2-b325-b1fbc53028b0/complete.json','981d63c82ea17fdd19101e87bd0035f8c4b9f675fb36be64dcbf9573af0aa98a');assert.deepEqual(inspectOriginalPG121(),json(PGStart).after);
const conservation=checked(P+'/runtime121-A/pg-observe/4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c/complete.json','9c8334b7423d680eeea336716271220aaada126d8a2d2534987ee7f31999aac1');
const readback=checked(R+'/tools/rust-r4ghi/independent/runtime121-conservation-actual01/review-actual-conservation121.json','5fd27f05a4994be5b61236a48e62728a2cec7ed54ee8d8b6d4d7c2fb8ed60f56');assert.equal(json(readback).verdict,'approved-actual-original-PG-conservation-readback');
const components=checked(R+'/tools/rust-r4ghi/independent/runtime121-components03-steps/components.json','d70a73eda70004c381f8d4e12387ef35002c4a2efd79619a57fe1e3a19bbf5c9');assert.equal(json(components).allThreeBoundedCodeStepsApproved,true);
const states=Object.fromEntries(Object.entries(stateFiles).map(([key,file])=>[key,checked(file,stateSHAs[key])]));
const helpers=fs.readdirSync(R+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n));assert.equal(helpers.length,227);
for(const name of ['rust-api121-process.json','rust-api121.env'])assert(!fs.existsSync(P+'/'+name));
const p=json(conservation),r=json(readback),value={kind:'R4-runtime121-A-conserved-bounded-components-status355',recordedAt:new Date().toISOString(),issue121:{state:'OPEN',currentDependencyReady:false},
  actualA:{holder,PGStart,conservation,independentReadback:readback,observations:p.observations,baseline:p.baseline,tablesPerDB:139,rows:p.first.counts,independentTableFiles:834,independentRows:14808,allThreeComparisonsEqual:true,observedInterval:r.actualObservedInterval,noCrossDatabaseAtomicityClaim:true,actualThreeModesExecuted:true,allThreeNoncesConsumed:true,blindReplayForbidden:true},
  code:{boundedComponentSteps:components,allThreeComponentsIndependentlyReviewed:true,Root8:'687b6a158bd902d2637262471b7423c97c8ec331f7872c5d66240a447b00b6b3',I03:'274f4ebe7469be27bee7bfdcd3369d2a9e21152485ad3d03a6bafaea5b50f87b',H03:'8816ac8c1e9ba065dc1fc361fa0f82ef649cffd1e0b89b8d90d693fbf2e529ac',RootIsolated:55,RootIndependent:64,IIndependent:66,HIndependentGroups:16,wholeNamespacePositive:false},
  current:{PGStarted:true,logicalDataConservationObserved:true,APIStarted:false,NativeContextGranted:false,actualHelperDirectoryCount:227,actualCurrent229Graph:null,actualCurrent55External:null,actualRuntimeRegistry:null,actualRuntimeCandidate:null,actualPreparedContinuation:null,TaxOrFIExecutedAfterFailure:false,sourcePromotionExecuted:false,APIStartG2Signed:false,fullRuntimeReady:false},
  planned:{promotionCopyFiles:33,promotionMOD:29,promotionADD:4,Root8VerifyOnly:8,helperComplete:229,helperADD:2,helperMOD:9,externalComplete:55,externalBase:45,externalADD:10,externalMOD:20,archivedOriginalSources:272,HConsumerMOD:24,HProtected:18,caller120MOD:11,caller120Protected:14},
  unchangedBookends:states,retained:{oldFIInvocation:'7f75088b-9f3d-4dbf-93f9-288ea96c8258',oldFIResult:'failed-preserve-before-HTTP',oldPrepareSHA256:'08e3eb6cff5297609a1d11e092382afc4f52b0ebedf9ee19c5dd5f8442412338',oldInventory67SHA256:'fdb957d8c82c0630eefa8ef0517bfa24cc0ec073fcf33bd923c78da09440946b',oldBodySHA256:'0f92913cd78146402e5eb3a004f10a55c8e47417d961301210d2e7d5376dcc98',old15AndReg5B1ProcessUnmodified:true,Main13Once201ReplayForbidden:true},
  next:['Exact reviewed SourceSafety package before33 file promotion and fresh actual229/55 measurement','Separate same-byte API exactG2 and real process/readiness readback','Actual Native FS publication, real constructor acceptance, fresh complete prepare121/body67 equality and independent readback','Only then new FI, separate one normal201 and remaining original batch acceptance'],
  official:{Rust:240,R4Delivered:67,R4Total:95,batchCandidate:32,newCertified:0},businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN',technical119HistoricalG4:'CLOSED'};
const out=R+'/docs/design/rust-r4ghi/continuation-status355.json';fs.writeFileSync(out,JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:pin(out),PGStarted:true,APIStarted:false,newBusinessCertified:0}));
