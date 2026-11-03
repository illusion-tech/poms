// Independent non-author C: static preaudit, no full G1 or environment execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=p=>JSON.parse(fs.readFileSync(p));
const pin=p=>{const b=fs.readFileSync(p);return{file:p,bytes:b.length,rawBytesSha256:sha(b)};};
const ok=p=>{const q=pin(p.file);return q.bytes===p.bytes&&q.rawBytesSha256===p.rawBytesSha256;};
const base='5041275d7ad82af4becbb4462e7213ffe465bc7a';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base);
assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),'codex/poms-r3-closeout');
const dFile='tmp/rust-r3m/input-d/g1-input01.json',d=J(dFile),gFile='tmp/rust-r3m/root/g0-issue-registration.json',g=J(gFile);
assert.equal(g.base,base);assert.equal(g.batch.number,97);assert.deepEqual(g.children.map(x=>x.number),[98,99,100]);assert(g.files.every(ok));
const liveFile='tmp/rust-r3m/root/g0-online01/24-after-stdout-original.json',native=J(liveFile).data.repository;
assert.equal(native.p85.state,'OPEN');assert.equal(native.p57.state,'OPEN');assert.equal(native.batch.number,97);assert.equal(native.batch.state,'OPEN');
assert.deepEqual(native.batch.subIssues.nodes.map(x=>x.number),[98,99,100]);assert(native.batch.subIssues.nodes.every(x=>x.state==='OPEN'));
assert(native.p85.subIssues.nodes.some(x=>x.number===97&&x.state==='OPEN'));
for(let n=86;n<=96;n++)assert(native.p85.subIssues.nodes.some(x=>x.number===n&&x.state==='CLOSED'));
const statusFile='docs/design/rust-r3-closeout-status.json',status=J(statusFile);assert(!status.G1Certified&&!status.G3Certified&&!status.G4Certified&&!status.stageIntegrationComplete);
const bFile='docs/design/rust-r3-closeout-baseline.md',text=fs.readFileSync(bFile,'utf8'),bPin=pin(bFile);
const originalD=bPin.file&&d.formalInputs.find(x=>x.file===bFile);assert(originalD);
const inverse=text.replaceAll('project_technical_cost','project_costs').replaceAll('project_bid_commercial','project_bids').replaceAll('project_pricing_margin','project_pricing');
assert.equal(Buffer.byteLength(inverse),originalD.bytes);assert.equal(sha(Buffer.from(inverse)),originalD.rawBytesSha256);assert.equal(bPin.bytes-originalD.bytes,26);
assert(d.formalInputs.filter(x=>x.file!==bFile).every(ok));assert(d.caseDefinitions.every(ok));
const invFile='docs/design/rust-r3-operation-slices.json',inv=J(invFile);assert.equal(inv.operations.length,58);assert.equal(d.routeRows.length,58);
for(const r of d.routeRows){const o=inv.operations.find(x=>x.operationId===r.operationId);assert(o);assert.equal(r.method,o.method);assert.equal(r.path,o.path);assert.equal(r.issue,o.issue);assert.deepEqual(r.permissions,o.permissions);assert(r.freshSuccessfulReceiptRequired&&r.freshGuardRequired);}
assert.equal(d.ignored.length,54);assert.equal(d.ignored.filter(x=>x.class==='controlled-DB-PG15-opt-in').length,53);assert.equal(d.ignored.filter(x=>x.class==='explicit-child-fixture-invoked-by-parent').length,1);
for(const x of d.ignored){const s=fs.readFileSync(x.file,'utf8');assert.equal(s.split(/\r?\n/)[x.line-1].trim(),x.reason);assert(s.includes(x.test));}
const cases=d.caseDefinitions.flatMap(x=>J(x.file).cases);assert.equal(cases.length,18);assert.equal(new Set(cases.map(x=>x.id)).size,18);
const E=d.E1;assert(E.priorApprovalNotInherited);assert.equal(E.aliasCount,5);assert.equal(E.totalBytes,419264);assert.equal(E.directConsumerCount,23);assert.equal(E.consumers.length,23);
assert.equal(E.originalDeadline,'2026-11-09');assert.equal(E.deadlineExtension,false);assert.equal(E.exitBefore,'Current-batch-G3');
for(const x of E.aliases){assert(ok(x.logical)&&ok(x.canonical));assert(fs.lstatSync(x.logical.file).isFile());assert(!fs.lstatSync(x.logical.file).isSymbolicLink());assert.equal(x.freshG1Approved,false);}
assert(E.consumers.every(x=>ok(x.source)));assert(E.consumers.every(x=>x.unchangedLegacyCommandReplaySupported===false));
const review={
  kind:'C-independent-R3-closeout-Root-D-G1-preaudit01',createdAt:new Date().toISOString(),reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',configuredTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  status:'Preaudit-complete-awaiting-complete-joint-frozen-input',G1Certified:false,G2AuthorizedAfterOnlineFreeze:false,actualAcceptanceExecuted:false,
  base,branch:'codex/poms-r3-closeout',batchIssue:97,scopeIssues:[98,99,100],stageIssue:85,overallIssue:57,
  inputs:{rootBaseline:bPin,RootG0Registration:pin(gFile),DInput:pin(dFile),DMarkdown:pin('tmp/rust-r3m/input-d/g1-input01.md'),caseDefinitions:d.caseDefinitions,currentStatus:pin(statusFile),inventory:pin(invFile)},
  rootG0:{nativeGraphSnapshot:pin(liveFile),all64RegisteredOriginalPinsExact:true,graph:'57(open) ->85(open)->97(open)->98/99/100(open)',old86To96Closed:true,publicOperationsAdded:0,currentR3HTTPDelivered:58,currentStageIncomplete:true},
  preliminaryConclusion:{newProductOrBusinessScopeBlockersFound:[],RootAndDDesignBoundaryUsableForJointG1:true,finalAAndBInputsAndManifestRequired:true,noPrematureGatePass:true},
  sourceReconciliationRequiredInFormalManifest:{
    file:bFile,D01OriginalPin:originalD,currentRootAuthorityPin:bPin,onlyDelta:'Three directory names corrected from project_costs/project_bids/project_pricing to project_technical_cost/project_bid_commercial/project_pricing_margin.',
    byteDelta:26,inMemoryInverseExactToD01OriginalPin:true,businessScopeChanged:false,D01MustRemainOriginal:true,
    RootAcknowledged:'Formal source-reconciliation will retain D01 old pin and designate current joint baseline/manifest authority; final sealed record not yet inspected.'
  },
  rootAndDChecks:{
    all58OperationIdMethodPathIssueAndPermissionsMatchCurrentInventory:true,each58RequiresOwnActualSuccessReceipt:true,
    knownCounts:{RustOperations:173,RustPaths:138,RustSchemas:585,NativePaths:237,NativeOperations:291,NativeSchemas:585,clientFiles:579,migrations:92},
    countsAreInputFactsNotCurrentAcceptance:true,DFormalPinsMatching:38,DFormalPinsTotal:39,DCaseDefinitionPinsExact:true,
    ignored:{total:54,DBOptIn:53,explicitChildFixture:1,all54SourceAttributeLinesAndTestNamesVerified:true,defaultIgnoredNotPass:true,currentParentExecutionReceiptRequired:true},
    pureDefinitions:18,pureDefinitionsAreUnexecuted:true,
    boundaries:{R3Approval:'Existing Lead score submit/approve/reject/revoke only; no generic ApprovalRecord handler.',genericContract:'R4 contract/contract-review',genericCommission:'R5 payout/adjustment approval',schedulerAndTakeover:'R6/R7, no invented R3 scheduler',preparedFutureFacts:'Declared readonly projections only; no future producer completion'},
    scoring:'One materialized tuple for explicit refresh; normal manual/revoked snapshots retain matching stored system tuple; user-decided historical missing-match fallback recomputes system+snapshot before manual approval within one TX; GET does not backfill.',
    UI:{allowedFiles:['apps/poms-admin/src/app/features/lead/lead-list.ts','apps/poms-admin/src/app/features/lead/lead-list.spec.ts'],delta:'Nonempty plannedSignAt Date.toISOString(), datetime DTO unchanged, other date fields unchanged.',journeys:4,platformAxes:4,requiredActualJourneyCells:16,localCalendarDateAndPGTimestampMustAgree:true,blankNullRegressionRequired:true,WindowsRustNativeServerCertified:false},
    protected1373MixedSet:'Exactly the two declared UI files may change; all other original pins exact. Do not describe all1373 as unchanged Native backend sources.'
  },
  knownCorrectionCandidatesNotAcceptance:{
    A:['System refresh/build_snapshot separately collect facts; freeze a shared materialized tuple and matching stored system tuple selection.', 'Historical no-match approval fallback follows direct user decision and tests each necessary write rollback.'],
    B:['Customer/Contact CAS0 Protocol maps to500; freeze409 conflict and loser rollback.','Other actor equal business value PATCH must not dirty only updatedBy.','Uppercase ownerOrg identity immediate response must agree with subsequent GET.'],
    Root:['Original nonempty plannedSignAt UI sends date-only; exact two-file datetime serialization correction.'],
    state:'Known existing-baseline-drift correction candidates before G2, not current fixes or runtime passes; await A/B formal source and case pins.'
  },
  E1:{
    freshApprovalRequired:true,approvedByThisPreaudit:false,provisionalScopeEligibleForJointG1Decision:true,regularAliases:5,totalBytes:419264,actualDirectLiteralConsumers:23,
    allFiveActiveAndCanonicalRawPinsAndAll23ConsumerSourcePinsVerified:true,owner:'Root /root',originalDeadline:'2026-11-09',deadlineExtended:false,exitRequiredBeforeCurrentG3:true,
    onlyForCurrentBatchExitWork:true,noNewConsumerAliasMirrorOrPrivateReadAllowed:true,
    requiredExit:'Strict canonical (logical file,bytes,SHA) resolver; immutable snapshots before move mapping; no old-active/latest fallback; actual representative manifests/operation/fixture builder calls before and after deleting exactly five aliases, original archive hashes unchanged.',
    historicalScriptsRemainImmutableAndNotAdvertisedUnchangedRunnable:true,newSupportedEntryImplementationAndActualReplayStillPending:true
  },
  finalJointG1Remaining:['Sealed A and B inputs with exact sources/cases/ownership and tuple matching/fallback semantics.','Root manifest pinning all formal inputs, protected two-file delta and explicit D01 baseline reconciliation.','Fresh bounded E1 decision in final joint G1; pure preaudit does not approve it.','Complete independent joint G1 and exact online freeze before product G2.'],
  noProductOrRootExecutorOrGovernanceWriting:true,noInstallBuildTestDBHTTPBrowserServiceOrWSLExecution:true,noPrivateRead:true,noGitMutationOrGitHubExternalWrite:true,onlyOwnCReviewArtifactsWritten:true,
  staticVerifier:pin('tmp/rust-r3m/c-review/write-g1-root-d-preaudit01.mjs')
};
const out='tmp/rust-r3m/c-review/g1-root-d-preaudit01.json';fs.writeFileSync(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({review:pin(out),G1Certified:false,pending:'A/B + manifest + explicit E1 joint decision'}));
