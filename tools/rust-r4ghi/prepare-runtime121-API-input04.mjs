// Concrete data only; namespace Native preflight is a separate reviewed command.
import fs from 'node:fs';import assert from 'node:assert/strict';import { randomUUID } from 'node:crypto';
import { C, assertOperatorHost121, directory121, json, pin, read, sha, stateFiles, stateSHAs, writeWx } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'linux');
const R=C.root,P=C.private,checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const args=process.argv.slice(2);assert.equal(args.length,8);assert.deepEqual([args[0],args[2],args[4],args[6]],['--composition','--composition-sha','--Root-code-review','--Root-code-review-sha']);
const compositionResult=checked(args[1],args[3]),c=json(compositionResult);assert(compositionResult.file.startsWith(P+'/'));
assert.equal(c.kind,'Root-runtime121-Native06-composition-materialized');
for(const key of ['nativeOrHelperExecuted','runtimeAuthorityGranted','actualG2Granted','APIStartGranted','businessG3','businessG4'])assert.equal(c[key],false);
assert.equal(c.rootSourceRawRechecked,true);assert.equal(c.oldInputsUnmodified,true);
const sourcePromotion=c.sourceSafetyComplete,source=json(sourcePromotion);assert.equal(source.kind,'actual-single-Native-source-promotion-complete121');
assert.deepEqual(source.copiedExactly,[{file:'tools/rust-r4ghi/business/runtime-admission121.mjs',beforeSHA256:'575332154922858204cd0088528001a540606cc3cd52217e39a251b0ebe97993',afterSHA256:'ef958a654e517cf417fe39c21f4deaadcb942aab69bf3a51602e6aed92636f38'}]);
assert.deepEqual(c.actualGraphs,{helper:source.helperPins,external:source.externalPins,execution:source.executionSources});
for(const key of ['APIStarted','nativeAuthorityGranted','SQLHTTP','businessStateWrite','G3','G4'])assert.equal(source[key],false);
const composition=json(c.planComposition);assert.deepEqual(Object.keys(composition).sort(),['externalComposition','helperComposition','independentCodeReviews']);
assert.deepEqual(composition.helperComposition,c.helperComposition);assert.deepEqual(composition.externalComposition,c.externalComposition);
const execution=json(source.executionSources);assert.equal(execution.length,284);for(const p of execution)read(p);
const baseSpec=checked(R+'/tools/rust-r4ghi/runtime-recovery121/retained-preparation01/base18/base-spec121.json','da64371a483b18b17f2af3cb47fa72572b051f26f6ee4097d81ed848d0df86de'),base=json(baseSpec);assert.equal(Object.keys(base).length,18);
const originalPlan=json(base.approvedCodePlan15),asPin=({file,bytes,rawBytesSha256})=>({file,bytes,rawBytesSha256}),binary=asPin(originalPlan.consumer.binary),summaryBinary=asPin(originalPlan.consumer.summaryBinary);
function currentBinary(p){const s=fs.lstatSync(p.file,{bigint:true});assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink>=1n);assert.equal(fs.realpathSync(p.file),p.file);const b=fs.readFileSync(p.file);assert.equal(sha(b),p.rawBytesSha256);return{file:p.file,rawBytesSha256:p.rawBytesSha256,bytes:b.length,dev:String(s.dev),ino:String(s.ino),nlink:Number(s.nlink)};}
const binaryFiles=[currentBinary(binary),currentBinary(summaryBinary)];
const G1B=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json','be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc'),operatorBaseline=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json','ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad');
const codeReview=checked(args[5],args[7]),review=json(codeReview);assert.equal(review.kind,'non-author-runtime121-finite-code-step');assert.equal(review.verdict,'approved-bounded-step-only');assert.equal(review.reviewerIsAuthor,false);assert.equal(review.entries.length,8);assert.equal(review.technicalG1.rawBytesSha256,operatorBaseline.rawBytesSha256);
const lifetimeOwner=checked(P+'/runtime121-lifetime-owner01/bundle.json','15884d2a46b43ab1cfcca1d9142b039b62d41287f207b84eb89b252ec4eeaef2');
const PGStart=checked(P+'/runtime121-A/pg-start/d785af86-078b-4ba2-b325-b1fbc53028b0/complete.json','981d63c82ea17fdd19101e87bd0035f8c4b9f675fb36be64dcbf9573af0aa98a'),PGConservation=checked(P+'/runtime121-A/pg-observe/4a48e0ae-2c5a-4f5f-b1d4-067d04b7892c/complete.json','9c8334b7423d680eeea336716271220aaada126d8a2d2534987ee7f31999aac1');
const expectedStates=Object.fromEntries(Object.entries(stateFiles).map(([k,f])=>[k,checked(f,stateSHAs[k])]));const nodeExecutable=checked(C.node,C.nodeSHA);
const baseNormalEnv=pin(P+'/rust.env'),envStat=fs.lstatSync(baseNormalEnv.file,{bigint:true});assert(envStat.isFile()&&!envStat.isSymbolicLink()&&envStat.nlink===1n&&envStat.uid===1000n&&(envStat.mode&0o777n)===0o600n);
const nonce=randomUUID(),directory=P+'/runtime121-B-inputs/api-start/'+nonce,p={kind:'Root-runtime121-B-API-operation-input',schemaVersion:1,namespace:'poms-r4ghi',epoch:'g2-business15',run:'main01',nonce,G1B,operatorBaseline,codeReview,base,
  current:{sourcePins:base.sourcePins,compilePins:base.compilePins,helperPins:source.helperPins,helperCount:229,binary,summaryBinary,binaryFiles,nodeExecutable,lifetimeOwner,PGStart,PGConservation,baseNormalEnv},composition,expectedStates,executionSources:execution,outputDirectory:P+'/runtime121-B/api-start/'+nonce,processFile:P+'/rust-api121-process.json',normalEnvFile:P+'/rust-api121.env'};
assert.equal(Object.keys(p).length,17);assert.equal(Object.keys(p.current).length,12);for(const f of [p.outputDirectory,p.processFile,p.normalEnvFile])assert(!fs.existsSync(f));directory121(directory,{exclusive:true});const input=writeWx(directory,'input.json',p);
const O=R+'/tools/rust-r4ghi/runtime-recovery121/API-start-input04';assert(!fs.existsSync(O));fs.mkdirSync(O,{recursive:true});const copy=writeWx(O,'actual-input.json',read(input));assert.equal(copy.rawBytesSha256,input.rawBytesSha256);
const receipt=writeWx(O,'metadata-preparation.json',{kind:'Root-runtime121-concrete-API-input-prepared',input,compositionResult,sourcePromotion,baseSpec,codeReview,binaryCurrentFacts:binaryFiles,originalEnvValuesPrinted:false,RootReviewSigned:false,NamespaceNativeCalled:false,APIStarted:false,actualG2Authorized:false});
console.log(JSON.stringify({input,receipt,preflightNotYetRun:true,APIStarted:false}));
