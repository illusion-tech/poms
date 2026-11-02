// C writes only its own immutable review from independently checked public evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const C='tmp/rust-r3cdefg/c-review',A='docs/design/archive/slices/rust-r3cdefg';
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};},read=f=>JSON.parse(fs.readFileSync(f));
const auditFile=C+'/g4-actual-incremental-audit01.json',audit=read(auditFile);assert.equal(pin(auditFile).rawBytesSha256,'7f98f71b028058430fffb752e70b6e20c5be76f4cc702b3c68620342eddb2000');
const preflight=read(A+'/C/g4-closeout-preflight01.json'),plan=read(audit.approvedPlan.file);
const review={
  kind:'R3CDEFG-non-author-independent-actual-G4-final-review',
  createdAt:new Date().toISOString(),
  reviewer:{agent:'/root/r3_next16_review',role:'Independent non-author C',method:'Read-only public JSON, exact bytes, fixed Git blobs and independent live GitHub readback; own static validator only'},
  decision:'Pass',G4Certified:true,
  certificationType:'Actual scoped closeout after independent G3, fixed implementation review, main integration, approved archive/E1 preflight and exact online execution',
  findingCounts:{P0:0,P1:0,P2:0,P3:0},findings:[],
  implementation:audit.implementation,
  reviewedMain:audit.reviewedMain,
  archiveCommit:audit.archiveCommit,
  preCloseAuthorityMain:audit.authorityMain,
  approvedPlan:audit.approvedPlan,
  independentPreflight:audit.independentPreflight,
  actualOnlineReceipt:audit.actualOnlineReceipt,
  independentLiveReadback:{...audit.independentLiveReadback,capturedAt:audit.liveReadbackAt,independentlyFetchedIssues:7,independentlyFetchedCommentCollections:5},
  scope:{
    batch:'RUST-R3C/D/E/F/G',operations:16,
    countsByChild:{88:3,89:3,90:3,91:4,92:3},
    closedIssues:[88,89,90,91,92],keepOpen:[85,57],
    priorDelivered:14,currentDelivered:30,totalR3:58,remaining:28,
    remainingBreakdown:{lead:14,intelligenceOtherThanContacts:10,discussion:2,projectCompleteWorkspace:2},
    fullR3G1Certified:false,fullR3G3Certified:false,fullR3G4Certified:false,fullStageComplete:false,
    completeNonHttpApprovalAndStageIntegration:false,R4ThroughR7Complete:false,
    NativeGovernanceIssuesNotRecounted:[61,82,83,84],
    realFollowUpTodoProducer:{delivered:true,targets:['customer','lead','project'],completeLeadDetailUI:false}
  },
  onlineConclusions:{
    approvedBeforeBodyHashesAllExact:true,
    approvedSevenIssueIdsAndExactMutationVariables:true,
    mutationOnlyFiveAddCommentAndSevenUpdateIssue:true,
    beforeMutationAfterRawGraphQLPreserved:true,
    noGraphQLErrors:true,
    issueBodiesExactStringAndUtf8BytesFromPlanThroughRootAndIndependentReadback:true,
    fiveChildrenClosedWithSixOfSixCheckboxes:true,
    oneExactApprovedG4CommentPerChild:true,
    bothParentsOpenAndFullStageIncomplete:true,
    approvalSignaturePlanAndMainProofAlreadyPresentIn688bBeforeFirstClosure:true,
    issues:audit.onlineRows
  },
  currentMetadataConclusions:{
    status:audit.currentStatus,inventory:audit.inventory,
    phase:'Done',G1Certified:true,G3Certified:true,G4Certified:true,
    thisBatchRowsCertified:16,currentDeliveredRows:30,remainingRows:28,all58OperationIdsMutuallyCounted:true,
    fullInventoryGateBooleansRemainFalse:true,
    currentStatusSixteenRowsAndInventoryRowsAgree:true,
    fourGlobalIndexesAndCurrentScopeAndCloseoutAgree:true,
    historicalDatedReadyAndPendingParagraphsRetainedAsHistory:true,
    actualDeliveredFollowUpProducerRemovedFromFutureOnlyList:true,
    independentFinalActualPendingPlaceholderMayNowBeReplacedWithThisExactSignature:true
  },
  fixedMainConclusions:{
    primary:audit.main.primary,primaryClean:true,branchAndRemoteMain:audit.reviewedMain,
    independentLsRemote:audit.main.remote,
    onlyMetadataChangedSinceArchiveCommit:true,
    protectedNativeAngularContractsClientSpecAndRustProductTreesUnchangedFromImplementation:true,
    RustSourceFilesByteEqual09AndFixedImplementation:203,
    frozenClosures:audit.closures,
    archivedOriginalsByteEqual:668,
    allCurrentResolvedFilesAlsoEqualFixedMainBlobs:true,
    originalPlanAndOriginMapNotModified:true,
    actualMetadataCommandOriginals:audit.metadataExecutionOriginals
  },
  E1:{
    approved:true,approvalWasNewForThisBatch:true,approvalAuthority:audit.independentPreflight,
    scope:'Only five regular same-byte active machine inputs; no lifecycle Markdown or bulk evidence mirror',
    files:audit.E1.files,totalBytes:419264,owner:'Root /root',
    reviewDue:'Next R3 G1 or 2026-11-09, whichever is earlier',
    exitCondition:plan.compatibilityException.exitCondition,
    originalQualification:plan.compatibilityException.qualification,
    onlyFiveAliasesCurrentlyExist:true,archivedCopiesAndActiveAliasesExact:true,
    oldR3ABApprovalNotInherited:true,noExpansionApproved:true
  },
  publicPreservation:{
    ...audit.preservation,
    conclusion:'The two public preservation originals and all 1140 destinations/available public sources were byte checked; first 1069 retained, 71 added, no different bytes overwritten. C did not read private or re-probe runtime/host.',
    privateAndStoppedVolume:'Own private/PG15 retained in the previously approved locations according to already certified terminal evidence; older private/PG17 not accessed by this audit'
  },
  retainedAcceptanceAndLimits:{
    G3Review:pin(A+'/C/g3-independent-review02.json'),
    fixedCommitReview:pin(A+'/C/fixed-commit-review01.json'),
    artifact:'c042513c98182fcf9e70a72cd71fd0b5231bc785fac86dac3ffd7b93d852c128',
    productAcceptanceNotRepeatedByThisG4Review:true,
    Rust235PassedAnd54IgnoredRemainSeparate:true,
    actual45And1691And14AndPGAndTodoEvidenceRemainOriginal:true,
    UI898EvidenceStillBelongsToEcArtifactWithPreviouslyApprovedNarrowSourceCausalTransfer:true,
    noClaimThatC042RanOldEcUI:true,
    allFailedPartialStoppedUncertifiedAndKnownNativeBaselineLabelsRetained:true,
    schemaTimezoneIpQuarantineIsolationAndHistoricalMissingEarliest46BinaryLimitsRemain:true,
    noDeploymentTrafficPerformanceOrCompleteR3Certification:true
  },
  finalPublication:{
    actualG4IsCertifiedByThisReview:true,
    remainingWork:'Root append this exact signature and its audit/live originals, current references and final incremental public preservation; make metadata-only branch/primary FF/main publication and read back the resulting commit.',
    allowedChanges:'Additive signature/proof/preservation files and current independent-final-review references only.',
    productApprovedPlanOriginMapAndOnlineBodiesMustRemainUnchanged:true,
    pendingPreSignatureAdditiveFiles:audit.pendingAdditiveFinalSeal,
    noSecondProductAcceptanceOrNewOnlineMutationRequired:true,
    finalMainPublicationAndReadbackNotClaimedAlreadyDone:true
  },
  evidencePins:{
    incrementalAudit:pin(auditFile),validator:pin(C+'/g4-actual-incremental-audit01.mjs'),
    beforeCloseDetailedAudit:pin(A+'/C/g4-closeout-byte-plan-audit01.json'),
    plan:audit.approvedPlan,preflight:audit.independentPreflight,
    receipt:audit.actualOnlineReceipt,live:audit.independentLiveReadback,
    originMap:pin(A+'/archive-origin-map.json'),currentMetadata:audit.metadata
  },
  noIndependentProductBuildTestLintDbHttpBrowserOrHostExecution:true,
  noPrivateRead:true,noGitHubWrite:true,noProductOrRootToolModification:true
};
assert.equal(preflight.E1Approved,true);assert.equal(preflight.actualG4ReviewRequired,true);
const out=C+'/g4-independent-actual-review01.json';fs.writeFileSync(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({review:pin(out),decision:review.decision,G4Certified:review.G4Certified,main:review.reviewedMain,scope:review.scope}));
