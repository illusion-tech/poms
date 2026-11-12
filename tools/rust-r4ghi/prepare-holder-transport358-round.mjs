// Metadata only. Requires delivered reviewed code; never signs or dispatches.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {C,assertOperatorHost121,json,local,pin,read,shape,reviewBody,verifySources,verifyStates,writeWx,directory121} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();assert.equal(process.platform,'win32');
assert.equal(process.argv.length,6);assert.deepEqual([process.argv[2],process.argv[4]],['--options','--options-sha']);
const optionsPin=pin(process.argv[3]);assert.equal(optionsPin.rawBytesSha256,process.argv[5]);const o=json(optionsPin);
assert.deepEqual(Object.keys(o).sort(),['actualOperator','codeReview','currentLossObservation','executablePin','holderRequest','hostObservation'].sort());
const policy=pin(C.root+'/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json');assert.equal(policy.rawBytesSha256,'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6');const g=json(policy);
const q=json(o.holderRequest),p=shape(json(q.input));assert.equal(p.mode,'holder-start');verifySources(p);verifyStates(p);
assert.equal(q.kind,'Root-runtime121-A-exact-G2-request');assert.equal(q.mode,p.mode);assert.equal(q.actualG2,false);assert.equal(q.RootReviewSigned,false);assert.equal(q.effectsExecuted,false);
assert.equal(o.holderRequest.file,C.private+'/runtime121-A-inputs/holder-start/'+p.nonce+'/request-exact-G2.json');
const originalBody=reviewBody(p,q.input),originalBodyBytes=Buffer.from(JSON.stringify(originalBody,null,2)+'\n');assert.deepEqual(q.expectedRootReviewBody,originalBody);assert.equal(q.expectedRootReview.bytes,originalBodyBytes.length);assert.equal(q.expectedRootReview.rawBytesSha256,createHash('sha256').update(originalBodyBytes).digest('hex'));assert.equal(q.expectedRootReview.file,C.private+'/runtime121-A-inputs/holder-start/'+p.nonce+'/Root-review.json');
const r=json(o.codeReview);assert.equal(r.kind,g.codeReviewContract.kind);assert.equal(r.verdict,g.codeReviewContract.verdict);assert.equal(r.reviewerIsAuthor,false);assert(r.author&&r.reviewer&&r.author!==r.reviewer);assert.deepEqual(r.G1Policy,policy);assert.deepEqual(r.operator,o.actualOperator);assert.deepEqual(r.executionSources,[o.actualOperator]);read(o.actualOperator);
assert.equal(o.actualOperator.file,C.root+'/'+g.productionAllowlist[0].file);
const loss=json(o.currentLossObservation),host=json(o.hostObservation);assert.equal(loss.originalContainer.id,C.container);assert.equal(loss.originalContainer.running,false);assert.equal(loss.APIStarted,false);assert.equal(loss.dataConservationNotYetObserved,true);
const e=o.executablePin;assert.deepEqual(Object.keys(e).sort(),['file','bytes','rawBytesSha256'].sort());assert(new RegExp(g.immutableHostRules.trustedPowerShell.pathRegex).test(e.file));assert.equal(e.bytes,g.immutableHostRules.trustedPowerShell.bytes);assert.equal(e.rawBytesSha256,g.immutableHostRules.trustedPowerShell.rawBytesSha256);
const es=fs.lstatSync(e.file);assert(es.isFile()&&!es.isSymbolicLink()&&es.nlink>=1);assert.equal(fs.realpathSync(e.file),path.resolve(e.file));const b=fs.readFileSync(e.file);assert.equal(b.length,e.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),e.rawBytesSha256);assert.equal(host.currentPowerShell.version,g.immutableHostRules.trustedPowerShell.version);assert.deepEqual({file:host.currentPowerShell.file,bytes:host.currentPowerShell.bytes,rawBytesSha256:host.currentPowerShell.rawBytesSha256},e);
function absent(f){try{fs.lstatSync(local(f));}catch(error){if(error.code==='ENOENT')return;throw error;}throw Error('Existing entry requires reconciliation');}
for(const f of [q.expectedRootReview.file,p.outputDirectory])absent(f);
const roundId='round358-'+p.nonce,D=C.private+'/runtime121-A-current-rounds/'+roundId;directory121(D,{exclusive:true});
const round={kind:'Root-frozen-runtime121-A-current-recovery-round',recordedAt:new Date().toISOString(),G1Policy:policy,roundId,currentLossObservation:o.currentLossObservation,hostObservation:o.hostObservation,executablePin:e,powerShellVersion:g.immutableHostRules.trustedPowerShell.version,actualOperator:o.actualOperator,codeReview:o.codeReview,holderRequest:o.holderRequest,bootPolicy:g.holderExactG2.bootPolicyLiteral,limits:g.limits,actualG2Authorized:false};assert.equal(Object.keys(round).length,14);
const currentRound=writeWx(D,'current-round.json',round);
const transport358={G1Append:currentRound,newLossObservation:o.currentLossObservation,bootPolicy:round.bootPolicy,actualOperator:o.actualOperator,codeReview:o.codeReview,executablePin:e};
const support=writeWx(D,'request-transport358-exact-G2.json',{kind:'Root-runtime121-A-holder-transport358-exact-G2-support-request',recordedAt:new Date().toISOString(),originalRequest:o.holderRequest,input:q.input,expectedRootReview:q.expectedRootReview,expectedRootReviewBody:q.expectedRootReviewBody,mode:p.mode,peerKind:g.holderExactG2.peerKind,peerVerdict:g.holderExactG2.peerVerdict,transport358,G1Policy:policy,limits:g.limits,RootReviewSigned:false,holderStarted:false,PGStarted:false,APIStarted:false,actualG2Authorized:false});
console.log(JSON.stringify({currentRound,support,originalRequest:o.holderRequest,expectedRootReview:q.expectedRootReview,actualG2Authorized:false,holderStarted:false}));
