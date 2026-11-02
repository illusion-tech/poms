// Independent C: static readback/hash/Git inspection only; writes this review only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const A='docs/design/archive/slices/rust-r3hijk';
const out='tmp/rust-r3hijk/c-review/g4-independent-actual-review01.json';
assert(!fs.existsSync(out));
const sha=v=>createHash('sha256').update(v).digest('hex');
const raw=p=>fs.readFileSync(p);
const J=p=>JSON.parse(raw(p));
const pin=p=>{const b=raw(p);return {file:p,bytes:b.length,rawBytesSha256:sha(b)};};
const checkPin=(p,f=p.file)=>{const b=raw(f);assert.equal(b.length,p.bytes,f);assert.equal(sha(b),p.rawBytesSha256,f);return pin(f);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16000000,windowsHide:true}).trim();
const impl='5ca4adfa7f8351a7515b14cdb3d08b6f7f2d1875';
const archived='a720101037e7cbff06de132909991de1c746e0c2';
const before='b3b55f472febd6d129eae1150831b1a2a64d865f';
const main='f7199c06c4023d5d4824a94b44a26fd70f0cf870';
const planFile=A+'/g4-plan01/plan01.json',permitFile=A+'/C/g4-closeout-preflight01.json';
const plan=J(planFile),permit=J(permitFile),receiptFile=A+'/g4-online-receipt01.json',receipt=J(receiptFile);
checkPin({file:planFile,bytes:21082,rawBytesSha256:'212ab4fd6a15b83ecfb7a632f51f5fe30ef5eba86dd8f434329236eabc1894bb'});
checkPin({file:permitFile,bytes:15177,rawBytesSha256:'3c04dcc047db6c22230c18dc738c0fc5715646ca18ad53cb616cca3383cb4069'});
assert(permit.closeoutAllowed&&permit.reviewCompleted&&!permit.G4Certified);
assert.deepEqual(permit.approvedPlan,pin(planFile));
assert.deepEqual(plan.closeIssues,[93,94,95,96]);assert.deepEqual(plan.keepOpen,[85,57]);assert.equal(plan.entries.length,6);
assert.equal(plan.implementation,impl);assert.equal(plan.archiveCommit,archived);
assert.equal(receipt.actualConditionsSatisfied,true);assert.equal(receipt.fullStageCertified,false);
assert.deepEqual(receipt.plan,pin(planFile));assert.deepEqual(receipt.permit,pin(permitFile));
assert.equal(receipt.implementation,impl);assert.equal(receipt.archiveCommit,archived);checkPin(receipt.source);
assert.deepEqual(receipt.closedIssues,[93,94,95,96]);assert(receipt.parent85Open&&receipt.overall57Open);assert.equal(receipt.formalR3After,58);

const fresh=A+'/g4-actual-online-snapshot01',freshReceipt=J(fresh+'/receipt01.json');
assert.equal(freshReceipt.records.length,6);assert(freshReceipt.nativeSubIssuesVerified);checkPin(freshReceipt.source);
const freshPins=[];
for(const name of fs.readdirSync(fresh).sort()){
  const f=fresh+'/'+name,t='tmp/rust-r3hijk/online-g4-actual01/'+name;
  assert(raw(f).equals(raw(t)),f+' original copy');freshPins.push(pin(f));
}
assert.equal(freshPins.length,8);
const online=[];
for(const entry of plan.entries){
  const n=entry.issue,wrapperFile=fresh+'/issue'+n+'.json',wrapper=J(wrapperFile),issue=wrapper.issue;
  const r=freshReceipt.records.find(x=>x.number===n),applied=receipt.applied.find(x=>x.issue===n);
  assert(r&&applied);checkPin(r,wrapperFile);assert.equal(issue.number,n);assert.equal(issue.state,entry.desiredState);
  assert.equal(issue.body,entry.body);assert.equal(sha(issue.body),entry.bodySha256);assert.equal(issue.html_url,'https://github.com/illusion-tech/poms/issues/'+n);
  assert.equal(r.state,issue.state);assert.equal(r.title,issue.title);assert.equal(applied.state,issue.state);
  assert.equal(applied.bodySha256,entry.bodySha256);assert(applied.exactPlanReadBack);
  const marked=wrapper.comments.filter(c=>c.body.includes(entry.marker));assert.equal(marked.length,1,'unique '+n);
  const c=marked[0];assert.equal(c.body,entry.comment);assert.equal(sha(c.body),entry.commentSha256);
  assert.equal(c.id,applied.commentId);assert.equal(c.html_url,applied.commentUrl);assert.equal(c.issue_url,issue.url);
  assert.equal(applied.commentSha256,entry.commentSha256);
  const checked=(issue.body.match(/^- \[x\]/gm)||[]).length,unchecked=(issue.body.match(/^- \[ \]/gm)||[]).length;
  if(n>=93){assert.equal(checked,6);assert.equal(unchecked,0);assert.equal(issue.state_reason,'completed');assert.equal(issue.parent_issue_url,'https://api.github.com/repos/illusion-tech/poms/issues/85');}
  if(n===85){assert.equal(issue.parent_issue_url,'https://api.github.com/repos/illusion-tech/poms/issues/57');assert(unchecked>=2);}
  if(n===57)assert(unchecked>=5);
  online.push({issue:n,state:issue.state,checkedBoxes:checked,uncheckedBoxes:unchecked,bodySha256:entry.bodySha256,commentSha256:entry.commentSha256,uniqueMarkerComments:1,commentId:c.id,commentUrl:c.html_url,bodyAndCommentExact:true,snapshot:pin(wrapperFile)});
}
const subissues=J(fresh+'/parent85-subissues.json');assert(Array.isArray(subissues));
for(const n of [93,94,95,96]){const c=subissues.filter(x=>x.number===n);assert.equal(c.length,1);assert.equal(c[0].state,'closed');assert.equal(c[0].parent_issue_url,'https://api.github.com/repos/illusion-tech/poms/issues/85');}

const journal=receipt.originalsDirectory;assert.equal(journal,A+'/evidence/online-g4/attempt01');
const journalNames=fs.readdirSync(journal).sort();assert(!journalNames.includes('failure.json'));
const journalPins=journalNames.map(n=>pin(journal+'/'+n));assert.equal(journalNames.length,115);
const stdoutNames=journalNames.filter(n=>/-stdout-original\.json$/.test(n));assert.equal(stdoutNames.length,49);
for(const f of stdoutNames)J(journal+'/'+f);
assert.deepEqual(J(journal+'/progress.json').applied,receipt.applied);
assert(journalNames.filter(n=>/-stderr-original\.bin$/.test(n)).every(n=>raw(journal+'/'+n).length===0));

const statusFile='docs/design/rust-r3hijk-delivery-status.json',status=J(statusFile),invFile='docs/design/rust-r3-operation-slices.json',inv=J(invFile);
assert.equal(status.phase,'Done');assert(status.G1Certified&&status.G3Certified&&status.G4Certified&&status.fixedCommitCertified&&status.mainIntegrated);
assert.equal(status.implementation,impl);assert.equal(status.currentFormalR3Delivered,58);assert.equal(status.currentRustOperations,173);
assert(status.parent85Open&&status.overall57Open&&!status.stageIntegrationComplete);assert.deepEqual(status.closedIssues,[93,94,95,96]);
assert.equal(status.G4IndependentActualReviewStatus,'Pending-independent-actual-readback-audit');
checkPin(status.G4Online);checkPin(status.G4ClosePermission);
assert.equal(inv.operations.length,58);assert(inv.operations.every(x=>x.rustDelivered&&x.G4Certified));
assert.equal(new Set(inv.operations.map(x=>x.operationId)).size,58);
assert.equal(inv.summary.currentRustR3Delivered,58);assert.equal(inv.summary.authorizedNextBatch,0);assert.equal(inv.summary.currentRemaining,0);assert.equal(inv.summary.laterUnstarted,0);assert.equal(inv.summary.latestClosedBatch,28);
assert.equal(inv.finalBatchDelivery.phase,'Done');assert.equal(inv.finalBatchDelivery.operations,28);assert(inv.finalBatchDelivery.G4Certified&&!inv.finalBatchDelivery.stageIntegrationComplete);checkPin(inv.finalBatchDelivery.source);
const previousInv=JSON.parse(git('show',before+':'+invFile));
const newOps=inv.operations.filter(x=>[93,94,95,96].includes(x.issue)),oldOps=inv.operations.filter(x=>![93,94,95,96].includes(x.issue));
assert.equal(oldOps.length,30);assert.equal(newOps.length,28);
for(const x of oldOps)assert.deepEqual(x,previousInv.operations.find(p=>p.operationId===x.operationId));
for(const x of newOps){const old=previousInv.operations.find(p=>p.operationId===x.operationId);const changed=Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(old[k])).sort();assert.deepEqual(changed,['G4Certified','rustDelivered']);assert.equal(x.implementation,impl);}
assert.deepEqual([93,94,95,96].map(n=>newOps.filter(x=>x.issue===n).length),[14,10,2,2]);
const tFile='docs/design/rust-migration-execution-tracker.md',t=fs.readFileSync(tFile,'utf8');
assert(t.slice(0,650).includes('HTTP58/58'));assert(t.slice(0,650).includes('Rust173'));assert(/^\| R3\s+\| Doing/m.test(t));
for(const [letter,n,count] of [['H',93,14],['I',94,10],['J',95,2],['K',96,2]])assert(new RegExp('^\\| R3'+letter+'[^\\n]+\\| #'+n+'\\s+\\| '+count+'\\s+\\| Done / G4','m').test(t));
const governanceDocs=['docs/design/backend-rust-migration-plan.md','docs/design/phase2-development-execution-tracker.md',tFile,A+'-closeout.md'];
for(const f of governanceDocs){const s=fs.readFileSync(f,'utf8');assert(s.includes('实际线上 G4'));assert(s.slice(-3500).includes('58/58'));assert(s.slice(-3500).includes('85')&&s.slice(-3500).includes('57'));assert(s.slice(-3500).includes('完整'));}

for(const ref of ['HEAD','main','origin/main'])assert.equal(git('rev-parse',ref),main);
for(const ref of ['HEAD','main','origin/main'])assert.equal(git('-C','E:/projects/poms','rev-parse',ref),main);
assert.equal(git('-C','E:/projects/poms','status','--porcelain'),'');
assert.equal(git('rev-parse',main+'^'),before);assert.equal(git('rev-parse',before+'^'),archived);assert.equal(git('rev-parse',archived+'^'),impl);
const changedPaths=git('diff','--name-only',before,main).split('\n'),changes=new Set(changedPaths);
const manifestFile=A+'/g3-input-manifest03.json';checkPin({file:manifestFile,bytes:856269,rawBytesSha256:'20d02317cf3ab6908d36d9a5b4412f90990576e3d7e8fe7cbd42e8f5809d2630'});
const manifest=J(manifestFile);assert.equal(manifest.productInputs.length,235);assert.equal(manifest.protectedNativeInputs.length,1373);
const protectedPaths=[...manifest.productInputs,...manifest.protectedNativeInputs].map(x=>x.file);
const allFixedChanges=new Set(git('diff','--name-only',impl,main).split('\n'));
assert(protectedPaths.every(p=>!allFixedChanges.has(p)));
assert(protectedPaths.every(p=>!changes.has(p)));
const g3File=A+'/C/g3-independent-review02.json',fixedFile=A+'/C/fixed-commit-review01.json';
checkPin({file:g3File,bytes:19936,rawBytesSha256:'6e9b594d2741cf97b64ba7233451726f7b487b79103bdf3ce5ab8380b32a1c62'});
checkPin({file:fixedFile,bytes:8158,rawBytesSha256:'759b1d69346e44b6dcdb4bafb4595d7eef9b7701623485561ea7351577641186'});
assert(J(g3File).G3Certified&&J(fixedFile).fixedCommitCertified);
const pushDir='tmp/rust-r3hijk/metadata-push-g4-applied04',push=J(pushDir+'/receipt01.json');
assert.equal(push.before,before);assert.equal(push.after,main);assert(push.remoteMainReadBack&&push.primaryWasClean&&!push.productChanged);checkPin(push.source);
for(const n of ['05.bin','08.bin','11.bin'])assert.equal(fs.readFileSync(pushDir+'/'+n,'utf8').trim(),main);
const pushPins=fs.readdirSync(pushDir).sort().map(n=>pin(pushDir+'/'+n));

const mapFile=A+'/archive-origin-map.json';checkPin({file:mapFile,bytes:827722,rawBytesSha256:'104434240ea4af61df20adbacee80fac5b81ecb0a8532cdf4aaf65b73ee23334'});
const map=J(mapFile);assert.equal(map.records.length,2161);assert.equal(map.completedLifecycleRootAliases,0);assert.equal(map.immutableInputSnapshots.length,21);
const oldPublic=[],newMapFile=A+'/public-evidence-origin-map07.json',newMap=J(newMapFile);
for(const f of fs.readdirSync(A).filter(f=>/^public-evidence-origin-map.*\.json$/.test(f)&&f!=='public-evidence-origin-map07.json'))oldPublic.push(...J(A+'/'+f).records);
assert.equal(oldPublic.length,1797);assert(oldPublic.every(p=>!changes.has(p.archivePath||p.formalPath)));
assert(map.records.every(p=>!changes.has(p.archivePath)));
assert.equal(newMap.priorOriginalsUnchanged,1797);assert.equal(newMap.records.length,22);assert.equal(newMap.privateCopied,false);
for(const p of newMap.records){checkPin(p,p.archivePath);checkPin(p,p.originalPath);}
const commonFile=A+'/evidence/common-checks08/report01.json',common=J(commonFile);assert(common.allChecksPassed);assert.equal(common.receipts.length,3);checkPin(common.source);
assert.deepEqual(common.receipts.map(x=>x.exitCode),[0,0,0]);for(const r of common.receipts)for(const stream of r.streams){checkPin(stream);const p=newMap.records.find(p=>p.originalPath===stream.file);assert(p);checkPin(stream,p.archivePath);}

const E1=permit.E1;assert(permit.E1Approved);assert.equal(E1.regularAliases,5);assert.equal(E1.totalBytes,419264);assert.equal(E1.actualDirectLiteralConsumers,23);assert.equal(E1.consumerPaths.length,23);
assert.equal(E1.originalDeadline,'2026-11-09');assert.equal(E1.deadlineExtended,false);assert.equal(E1.owner,'Root /root');
for(const f of E1.files){checkPin(f);checkPin(f,f.canonicalArchive);}
for(const f of E1.consumerPaths){assert(fs.existsSync(f));assert(!changes.has(f));}
const toolsChanged=changedPaths.filter(p=>p.startsWith('tools/'));
for(const p of [...toolsChanged,'tools/rust-r3hijk/apply-final-g4-review01.mjs']){const s=fs.readFileSync(p,'utf8');for(const f of E1.files)assert(!s.includes(f.file));}

const sensitive=new Set(['password','password_hash','token_hash','csrf_token_hash','tokenHash','csrfTokenHash','accessToken','refreshToken','clientSecret']);
let scanCount=0;const privacyFindings=[];
function scan(v,file,path='$'){if(Array.isArray(v)){for(let i=0;i<v.length;i++)scan(v[i],file,path+'['+i+']');return;}if(!v||typeof v!=='object')return;for(const[k,value]of Object.entries(v)){if(sensitive.has(k)&&typeof value==='string'&&value.trim()&&!/redact|\*\*\*/i.test(value))privacyFindings.push({file,path:path+'.'+k});scan(value,file,path+'.'+k);}}
const scanFiles=[...new Set([...freshPins.map(p=>p.file),...journalPins.map(p=>p.file),...newMap.records.map(p=>p.archivePath),receiptFile,...pushPins.map(p=>p.file)])].filter(p=>p.endsWith('.json'));
for(const f of scanFiles){scan(J(f),f);scanCount++;}assert.deepEqual(privacyFindings,[]);

const finalizerFile='tools/rust-r3hijk/apply-final-g4-review01.mjs',finalizer=fs.readFileSync(finalizerFile,'utf8');
assert(finalizer.includes("assert(review.reviewCompleted&&review.G4Certified&&review.verdict==='Pass')"));assert(finalizer.includes("status.G4IndependentActualReviewStatus='Pass'"));assert(!/\b(?:execFileSync|spawnSync|fetch)\s*\(/.test(finalizer));
const review={
  kind:'C-independent-R3HIJK-actual-G4-review01',createdAt:new Date().toISOString(),reviewCompleted:true,
  reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',modelTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  verdict:'Pass',G4Certified:true,G1Certified:true,G3Certified:true,fixedCommitCertified:true,mainIntegrationCertified:true,
  scopeIssues:[93,94,95,96],closedIssues:[93,94,95,96],operations:28,operationSplit:[14,10,2,2],parentsRemainOpen:[85,57],parent85Open:true,overall57Open:true,
  fullStageCertified:false,stageIntegrationComplete:false,formalR3HTTPDelivered:58,R3HTTPInventory:58,currentRustOperations:173,
  findingCounts:{P1:0,P2:0},findings:[],implementation:impl,archiveCommit:archived,mainReviewed:main,
  approvedPlan:pin(planFile),closeoutPermission:pin(permitFile),actualOnline:pin(receiptFile),
  actualOnlineReview:{
    freshReadbackReceipt:pin(fresh+'/receipt01.json'),collectorSource:checkPin(freshReceipt.source),publisherSource:checkPin(receipt.source),
    CDirectGitHubAPIExecution:false,method:'Independent static comparison of actual Root GH API raw stdout originals and a separate later live GET snapshot; no C HTTP or external writes.',
    sixBodyAndStateExact:true,sixCommentsExactAndEachMarkerUnique:true,allReceiptCommentIdsAndURLsMatchFreshGET:true,
    fourChildrenClosedCompletedAndSixOfSix:true,twoParentsOpen:true,parent85NativeChildMembershipExact:true,parent85NativeParent57:true,
    entries:online,freshSnapshotPins:freshPins,allEightFreshCopiesEqualOriginalTmpBytes:true,
    rawJournal:{directory:journal,files:journalPins.length,actualRawAPIResponses:stdoutNames.length,allJSONParsed:true,allStderrEmpty:true,noPartialFailureReceipt:true,progressMatchesAllSixApplied:true,sortedPinArraySha256:sha(JSON.stringify(journalPins))}
  },
  localGovernance:{
    status:pin(statusFile),inventory:pin(invFile),phase:'Done',G4Certified:true,formalR3HTTPDelivered:58,currentRustOperations:173,latestClosedBatch:28,authorizedNextBatch:0,currentRemaining:0,
    all58OwnersAndOperationIdsUnique:true,all58RowsDeliveredAndG4:true,old30RowsUnchanged:true,new28RowsOnlyDeliveredAndG4Changed:true,new28BoundToFixedImplementation:true,
    inventoryStatusSourcePinExact:true,latestBatchCorrection:'Only if(done) latestClosedBatch=28; existing Ready path unaffected.',
    trueRustExecutionTracker:pin(tFile),currentHeaderHTTP58AndRust173:true,R3ParentRowDoing:true,fourCurrentHIKJRowsDoneG4:true,
    currentPlansAndCloseoutSynced:governanceDocs.map(pin),historicalG4ReadyAndFormal30ParagraphsRetainTheirDatedMeaning:true,
    independentActualReviewStatusAtInput:status.G4IndependentActualReviewStatus,signatureReferencePublicationPending:true
  },
  mainAndProduct:{
    worktreeHeadMainOriginMainExact:true,primaryHeadMainOriginMainExact:true,primaryClean:true,linearFixedArchiveReadyActualMetadataChain:true,
    productInputs:235,protectedNativeInputs:1373,noAdmittedProductOrProtectedNativeDiffFromFixedImplementationToMain:true,
    allPrior1608BlobPinsAnd15PreexistingPrimaryCRLFBytesRetainedByUnchangedSourceAndPriorPrecloseReview:true,
    activeG3Manifest:pin(manifestFile),priorCompleteG3:pin(g3File),priorFixedReview:pin(fixedFile),priorMainAndTerminalReview:pin(permitFile),
    actualMetadataPush:pin(pushDir+'/receipt01.json'),actualMetadataPushOriginals:pushPins,actualRemoteReadbackTrueAndThreeMainRawReadsExact:true,
    noNewBuildRuntimeBrowserOrDeploymentCertification:true
  },
  archiveAndPrivacy:{
    authority:pin(mapFile),movedOriginals:2161,immutableInputSnapshots:21,rootLifecycleCompatibilityAliases:0,
    G1ResolvedInputsCarriedForward:246,G3ResolvedInputsCarriedForward:3840,priorCompleteRawResolutionCarriedForward:true,
    noGitDiffTouchesAny2161MovedOriginalOr1797PreviouslyReviewedPublicOriginal:true,newPublicMap:pin(newMapFile),newPublicOriginals:22,totalMappedPublicOriginals:1819,
    all22NewPublicAndOriginalTmpPinsExact:true,rawG4APIStepsAndFreshEightSnapshotsParsed:true,
    publicJSONObjectsFilesScanned:scanCount,sensitiveLiteralFindings:0,secretValuesNeverPrinted:true,
    rawPrivateOrQuarantineReadOrCopied:false,priorPartialFailuresAndPublic21DerivativeLabelsRemainUnchanged:true
  },
  E1:{
    approved:true,approvalSource:pin(permitFile),decision:'The explicit fresh current-batch closeout approval continues unchanged; not inherited from an older batch.',
    regularAliases:5,totalBytes:419264,files:E1.files,allFiveActiveAndCanonicalArchiveRawPinsExact:true,
    actualDirectLiteralConsumers:23,all23PrecloseConsumersPresentAndUnchanged:true,noNewPostPermitToolReferencesToFiveAliases:true,
    owner:'Root /root',originalDeadline:'2026-11-09',deadlineExtended:false,nextReview:E1.nextReview,exit:E1.exit,exitNotYetSatisfied:true,
    noNewHIJKLifecycleAliasesOrLargeCompatibilityTreeApproved:true
  },
  terminalAndLimits:{
    earlierCompleteG3AndPrecloseTerminalAcceptedWithoutRerunningUnchangedEnvironment:true,
    finalCandidate:'66db94ce84778e4cbf7b1141b34ba5211ecc229ff40f17f8950933d5034aef67',passed:294,ignored:54,
    onlyScopedHTTP28AndCausalReuseCertified:true,WindowsRustNativeServerCertified:false,
    originalFourUIBrowserPlatformCausalityAndOtherLimitsRetained:true,
    fullNonHTTPApprovalR3StageAndR4ToR7StillIncomplete:true,parents85And57RemainOpen:true,
    noDeploymentCutoverOrPerformanceConclusion:true,oldPG17AndPrivateNotRead:true
  },
  finalMetadataPublication:{
    pending:true,allowed:true,preparedLocalFinalizer:pin(finalizerFile),preparedFinalizerStaticScopeReviewed:true,
    allowedScope:'Append this exact C signature and authority/reference metadata; preserve fresh snapshots/push/audit originals with hashes and origin map; set independent actual review Pass and refresh derived status-source inventory pin; metadata-only commit/push. No product, approved plan, online body/comment, or older original rewrite.',
    currentFreshSnapshotsAndFinalizerUntrackedExpected:true,noAdditionalGitHubActionsAuthorizedByThisReview:true,noAdditionalBusinessOrStageGateImplied:true
  },
  noProductOrRootExecutorWriting:true,noRootExecutorProductBuildTestDBHTTPBrowserOrRuntimeExecution:true,
  noGitMutationOrGitHubExternalWrite:true,noPrivateRead:true,onlyOwnCReviewArtifactsWritten:true,
  ownStaticVerifier:pin('tmp/rust-r3hijk/c-review/write-g4-independent-actual-review01.mjs')
};
fs.writeFileSync(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({review:pin(out),verdict:review.verdict,G4Certified:true,reviewCompleted:true,closed:[93,94,95,96],parentsOpen:[85,57],formalHTTP:58,fullStage:false}));
