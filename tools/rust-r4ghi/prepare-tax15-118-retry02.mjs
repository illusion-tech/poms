// New reviewed code, nonce and input only after a proven pre-HTTP opening failure.
// This never replays the failed invocation or creates a context.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash, randomUUID } from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',O=P+'/tax15-prepare118-prepared02';
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(file,h){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);assert.equal(fs.realpathSync(file),file);const b=fs.readFileSync(file);if(h)assert.equal(sha(b),h,file);return{b,pin:{file,bytes:b.length,rawBytesSha256:sha(b)}};}
const json=p=>JSON.parse(read(p.file,p.rawBytesSha256).b);
assert.equal(process.platform,'linux');assert.equal(process.cwd(),R);const args=process.argv.slice(2);assert.equal(args.length,4);assert.deepEqual([args[0],args[2]],['--code-review','--code-review-sha']);
assert(!fs.existsSync(O));const review=read(args[1],args[3]),code=JSON.parse(review.b);
assert.equal(code.kind,'non-author-Tax15-invocation118-code-review');assert.equal(code.verdict,'code-ready-for-exact-input-review');assert.equal(code.reviewerIsAuthor,false);assert.equal(code.executionSources.length,8);
for(const p of code.executionSources)read(p.file,p.rawBytesSha256);
const priorRequestPin=read(P+'/tax15-prepare118-prepared01/request-prepare-only-G2-review118.json','77f220c78f3b93f1291432defae2cf0992dfd4e75e2a33de43aa1bc940790baa').pin,priorRequest=json(priorRequestPin),prior=json(priorRequest.input);
const failedCommand=read(P+'/tax15-prepare118-prepared01/run01/command-receipt.json','16acf217fbbac315d6598dba9f722aa4bbc138f53ba7ef02496d4e52c16eef6c').pin,failed=json(failedCommand);assert.equal(failed.exitCode,1);assert.equal(failed.stdout.bytes,0);
const failureReview=read('/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/independent-prepare118-actual-failure01/review-actual-failure-NOTREADY01.json','46065e69e4c8dfb1b290354c4f9a3506ea583e834178f949074ab338d5768101').pin;
const partialPin=read(P+'/business/g2-business15/main01/tax118-invocation-88160fd3-c7d7-439b-89e6-70209be4e3c6/partial.json').pin,partial=json(partialPin);assert.equal(partial.message,'sha is not defined');assert.equal(partial.result,null);assert.equal(partial.closed,null);
const current=read(P+'/business/g2-business15/main01/state.json','a6fda93cca0b21d8377254b3bbe7bce80687108cfd67cc1c7380012fef00b7fd'),state=JSON.parse(current.b);assert.equal(state.sequence,0);assert(!state.taxContinuation15);
read(P+'/business/g2-business15/main01/ownership.jsonl','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
for(const e of[13,14,15])assert(!fs.existsSync(P+'/business/g2-business'+e+'/main01/driver.lock'));
// Runtime/actor/data facts are original immutable evidence; only code bindings,
// phase, nonce and a new exact entry-copy/input change for the new invocation.
for(const p of[prior.runtimeBindings,prior.actualHelperPins,prior.actualSourcePins,prior.actualCompilePins,prior.apiProcess,prior.technicalG1,prior.baseline,prior.wireSpec])read(p.file,p.rawBytesSha256);
const actor=json(priorRequest.actualOfflineActorEvidence);assert.equal(actor.expectedActorPermissions.length,37);assert.deepEqual(actor.expectedActorPermissions,prior.expectedActorPermissions);
assert.equal(actor.source15State.rawBytesSha256,current.pin.rawBytesSha256);assert.equal(state.actors.manager.id,prior.actorId);
fs.mkdirSync(O,{mode:0o700});function put(name,v){const file=O+'/'+name;fs.writeFileSync(file,Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});return read(file).pin;}
const entry=put('entry-state15.json',current.b),input=structuredClone(prior);input.nonce=randomUUID();input.phase='tax15-prepare02';input.expectedEntryState=entry;input.codeReview=review.pin;input.executionSources=code.executionSources;
assert.notEqual(input.nonce,prior.nonce);assert.equal(Object.keys(input).length,34);assert.equal(input.mode,'prepare-only');
const ip=put('prepare-only-input118.json',input),body={kind:'Root-approved-exact-Tax15-invocation118',approvedInput:ip,codeReview:input.codeReview,expectedEntryState:entry,mode:'prepare-only',nonce:input.nonce,actualG2Authorized:true,normalTaxPOSTGranted:false,FIGranted:false};
const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n'),expected={file:O+'/Root-exact-prepare-only-review118.json',bytes:bytes.length,rawBytesSha256:sha(bytes)};
const request=put('request-prepare-only-G2-review118.json',{kind:'Root-requested-Tax15-prepare-only118-exact-G2',recordedAt:new Date().toISOString(),mode:'prepare-only',input:ip,expectedRootReview:expected,expectedRootReviewBody:body,
 previousFailedRequest:priorRequestPin,previousFailedCommand:failedCommand,previousPartial:partialPin,independentFailureReview:failureReview,
 previousRealConstructorReturnedButNoNativeExit:true,noRetroactiveExitClaimed:true,previousSourceAndFailureUnmodified:true,
 actualTechnicalReadback:priorRequest.actualTechnicalReadback,actualSource15EntryState:current.pin,actualOfflineActorEvidence:priorRequest.actualOfflineActorEvidence,
 recoveryBasis:'Independent old attempt pre-HTTP/client failure, no state/ownership change; new corrected-code review, nonce, phase, entry and exact approval. No old request replay.',
 requestedAction:priorRequest.requestedAction,authenticationMayCreateSessionAndAuthAudit:true,actualG2:false,preparationAlreadyRun:false,RootReviewSigned:false});
console.log(JSON.stringify({request,input:ip,expectedRootReview:expected,newAttempt:true,actualContextCreated:false}));
