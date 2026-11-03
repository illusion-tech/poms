// Independent C policy/source interpretation only; no driver, Node product or environment execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const C='tmp/rust-r3m/c-review',F='docs/design/rust-r3m';
const raw=p=>fs.readFileSync(p),J=p=>JSON.parse(raw(p)),text=p=>raw(p).toString('utf8');
const pin=p=>{const b=raw(p);return{file:p,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')};};
const check=p=>{const q=pin(p.file);assert.equal(q.bytes,p.bytes,p.file);assert.equal(q.rawBytesSha256,p.rawBytesSha256,p.file);return q;};
const checkpoint=F+'/g2-corrective-checkpoint02.md';
const manifestFile=F+'/g1-input-manifest01.json',m=J(manifestFile);
check({file:manifestFile,bytes:359370,rawBytesSha256:'7c41d08b0021ba0c7937948bd61ef990f4b4a7cac7bf4276d736a363a69b749e'});
const g1File=F+'/C/g1-independent-review01.json',g1=J(g1File);check({file:g1File,bytes:37986,rawBytesSha256:'2bdc08872f601cd7f14daf30b446a30ec2065b9f5e95fe406d8e0578f0384bfa'});
const d=J(F+'/originals/input-d/g1-input01.json');
const customer='tools/rust-r3cdefg/customer-journey01.mjs',project='tools/rust-r3cdefg/project-journey01.mjs';
for(const f of [customer,project])check(d.journeys.find(x=>x.canonical.file===f).canonical);
const customerSource=text(customer),projectSource=text(project);
assert(customerSource.includes("requestBody.gender === 'female'"));assert(customerSource.includes("contact.gender === 'unknown'"));assert(customerSource.includes("contactPgCreated.gender === 'unknown'"));
assert(projectSource.includes('assert.equal(bidSecond.status, 500)'));assert(projectSource.includes('assert.equal(pricingSecond.status, 500)'));assert(projectSource.includes('assert.deepEqual(bidAfter, bidBefore)'));assert(projectSource.includes('assert.deepEqual(pricingAfter, pricingBefore)'));
const controller='apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.controller.ts';
const contactService='apps/poms-api/src/app/features/sales-intelligence/sales-intelligence.service.ts';
const projectService='apps/poms-api/src/app/features/project/project.service.ts',repository='apps/poms-api/src/app/features/project/project.repository.ts';
const controllerSource=text(controller),createSection=controllerSource.slice(controllerSource.indexOf('create(@Body()'),controllerSource.indexOf("@Patch(':id')"));assert(createSection.includes('customerId: body.customerId'));assert(!createSection.includes('gender:'));
assert(text(contactService).includes('gender: input.gender ?? CustomerContactGenderValue.Unknown'));
assert(text(repository).includes('const entities = [input.currentProcess, ...input.materialItems, ...input.timelineItems]'));
assert(text(repository).includes('const entities: object[] = [input.currentReview, ...input.conditionItems]'));
for(const p of m.protectedFiles)if(!m.protectedAllowedG2Deltas.includes(p.file))check(p);
const migrationBid='apps/poms-api/src/migrations/Migration20260424190000_ex27_project_bid_commercial_process.ts';
const migrationPricing='apps/poms-api/src/migrations/Migration20260424203000_ex28_project_pricing_margin_review.ts';
assert(text(migrationBid).includes('uq_project_bid_commercial_process_current'));assert(text(migrationPricing).includes('uq_project_pricing_margin_review_current'));
const businessPolicy='docs/design/archive/slices/rust-r3hijk-business-semantics-corrective-checkpoint01.md';
const foundation='docs/design/archive/slices/rust-r3hijk-foundation-dependency-corrective-checkpoint02.md';
assert(text(businessPolicy).includes('不以 Node.js 的 bug 级对齐为目标'));assert(text(foundation).includes('female'));assert(text(foundation).includes('先替代、再写新父子记录'));
const previousG3File='docs/design/archive/slices/rust-r3hijk/C/g3-independent-review02.json';
check({file:previousG3File,bytes:19936,rawBytesSha256:'6e9b594d2741cf97b64ba7233451726f7b487b79103bdf3ce5ab8380b32a1c62'});assert(J(previousG3File).G3Certified);
const sources=[checkpoint,manifestFile,g1File,'docs/design/rust-r3-closeout-baseline.md',F+'/originals/input-d/g1-input01.json',F+'/originals/input-b/g1-input01.json',customer,project,controller,contactService,projectService,repository,migrationBid,migrationPricing,'libs/shared/contracts/src/lib/shared-contracts.ts',businessPolicy,foundation,previousG3File,'apps/poms-api-rust/src/customer_contacts/service.rs','apps/poms-api-rust/src/project_bid_commercial/service.rs','apps/poms-api-rust/src/project_pricing_margin/service.rs'];
const knownNative=[
  {
    id:'NATIVE-REFERENCE-CONTACT-CREATE-GENDER',legacyDefinition:pin(customer),anchors:['tools/rust-r3cdefg/customer-journey01.mjs:167','tools/rust-r3cdefg/customer-journey01.mjs:181','tools/rust-r3cdefg/customer-journey01.mjs:182','tools/rust-r3cdefg/customer-journey01.mjs:184','tools/rust-r3cdefg/customer-journey01.mjs:186'],
    actualSignature:'Real visible UI selects female; actual POST body.gender=female; Native201 body/list/owned PG row gender=unknown. Later edit retaining its existing normal checks remains real.',desiredBusiness:'Explicit female must survive POST, list and PG; absent gender alone defaults unknown.',
    source:'Native CustomerContactController.create at48-62 omits body.gender while service.create at73-93 defaults absent to Unknown.',sourcePins:[pin(controller),pin(contactService)],
    notAccepted:'A UI request that never sent female, wrong entity, missing HTTP/PG evidence, capture/driver failure, or other unexpected gender.'
  },
  {
    id:'NATIVE-REFERENCE-BID-SECOND-VERSION',legacyDefinition:pin(project),anchors:['tools/rust-r3cdefg/project-journey01.mjs:232','tools/rust-r3cdefg/project-journey01.mjs:239','tools/rust-r3cdefg/project-journey01.mjs:247','tools/rust-r3cdefg/project-journey01.mjs:256'],
    actualSignature:'Second valid visible UI save POST500/Internal server error; error feedback/dialog observed; original bid parent/material/timeline unchanged; GET/workspace/history still one current v1.',desiredBusiness:'Second legal save201, new version2/unique current, oldv1 superseded with retained history/children and correct supersedes identity.',
    source:'ProjectService478-549 forms old/new managed version entities; Repository470-481 persists new parent/children and old current in one ORM flush. The existing current partial unique index and prior defect evidence explain the known version replacement failure; source shape alone is not a new measured SQL witness.',
    sourcePins:[pin(projectService),pin(repository),pin(migrationBid)],knownConstraint:'uq_project_bid_commercial_process_current',
    notAccepted:'Any arbitrary500, malformed request/wrong prerequisite, lost before rows, infrastructure/permission failure, timeout or different graph outcome.'
  },
  {
    id:'NATIVE-REFERENCE-PRICING-SECOND-VERSION',legacyDefinition:pin(project),anchors:['tools/rust-r3cdefg/project-journey01.mjs:331','tools/rust-r3cdefg/project-journey01.mjs:339','tools/rust-r3cdefg/project-journey01.mjs:345','tools/rust-r3cdefg/project-journey01.mjs:352'],
    actualSignature:'Second valid pricing UI save POST500/Internal server error; visible error/dialog; original pricing parent unchanged; GET/workspace/history retain currentv1, upstream real cost/bid references unchanged.',desiredBusiness:'Second legal save201/currentv2; oldv1 superseded, history/conditions/current/reference invariants preserved.',
    source:'ProjectService557-647 and Repository484-490 persist new review/conditions and old current in one ORM flush; current partial unique index and prior accepted correction identify the known baseline issue.',sourcePins:[pin(projectService),pin(repository),pin(migrationPricing)],knownConstraint:'uq_project_pricing_margin_review_current',
    notAccepted:'An unexplained500 or partial/driver failure relabelled as this known defect; missing real source/cost/bid prerequisite or unexpected graph.'
  }
];
const axes=[
  {browser:'linux',backend:'Native',serverPlatform:'linux',kind:'native-reference-ui'},
  {browser:'linux',backend:'Rust',serverPlatform:'linux',kind:'rust-business-ui'},
  {browser:'win32',backend:'Native',serverPlatform:'win32',kind:'native-reference-ui'},
  {browser:'win32',backend:'Rust',serverPlatform:'linux',kind:'rust-business-ui'}
];
const names=['customerJourney','projectJourney','leadJourney','intelligenceDiscussionJourney'];
const slots=axes.flatMap(axis=>names.map(journey=>({...axis,journey,definition:journey==='customerJourney'?(axis.backend==='Rust'?'customer02':'canonical customer01'):journey==='projectJourney'?(axis.backend==='Rust'?'project02':'canonical project01'):journey==='leadJourney'?'current lead03':'current intelligenceDiscussion02',businessAcceptanceRequired:axis.backend==='Rust',NativeBusinessAcceptance:axis.backend==='Native'?false:null,status:'Not-certified-by-this-review'})));
const report={
  kind:'C-independent-R3-closeout-G2-UI-matrix-clarification01',createdAt:new Date().toISOString(),reviewCompleted:true,
  reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',configuredTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  verdict:'Pass',verdictScope:'Bounded validation interpretation/corrective policy only; no actual UI, product, E1, G3 or G4 acceptance.',clarificationApproved:true,G2MatrixInterpretationApproved:true,G3Certified:false,G4Certified:false,actualUIAcceptanceCertified:false,NativeBusinessAcceptance:false,commitAllowed:false,stageIntegrationComplete:false,
  batchIssue:97,scopeIssues:[98,99,100],stageIssue:85,overallIssue:57,parent85Open:true,overall57Open:true,
  reviewedCheckpoint:pin(checkpoint),sources:sources.map(pin),
  findingCounts:{policyP1:0,policyP2:0},unresolvedPolicyBlockers:[],
  G1OracleOmission:{acknowledged:true,description:'G1 verified the four journey origins/counts but omitted the legacy customer/project oracle meanings. Their expected unknown/500/v1 contradict already-adopted business correctness and corrected Rust. This is an input/test-oracle omission, not a new Rust product regression.',classification:'existing-baseline-drift',detailClass:'historical-test-oracle-defect',originalG1AndLegacyDefinitionsRetainedUnchanged:true,oldFailedOrPartialAttemptsMustRemainTheirRealLabels:true,noRetroactiveG1OrOldRunRewrite:true},
  decisionBasis:{
    humanPolicy:'Explicit user correctness/reasonableness policy takes priority over Node bug-level parity; prior business/foundation corrective checkpoints already require explicit gender preservation and legal version creation with one current/history.',
    priorRustCorrectionAccepted:pin(previousG3File),
    G1Alignment:'Keep all4journeys×4actualbrowser/backend axes; preserve source/artifact provenance, current two-file frontend build, no mocks/injection/fallback, failure/partial labels and known Native classification. G1 does not authorize copying Node errors or changing protected Node source to fabricate16 business passes.',
    R3Scope:'This is Rust R3 stage acceptance, not a project to repair the unchanged Native backend. Explicit reference capture of the known baseline defects supplies provenance without weakening Rust business assertions.',
    noNewHumanBusinessDecisionRequiredByThisInterpretation:true,noNewProductRouteDTOInterfaceMigrationPermissionOrHandler:true
  },
  matrix:{plannedActualSlots:16,RustBusinessSlots:8,NativeReferenceSlots:8,slots,actualCompletedByThisReview:null,
    requiredAccounting:['Actual attempted/completed/capture status for each of16 slots with exact definition/runtime/UI source pins.','Eight Rust business journey passes only after all actual assertions pass on the final candidate.','Eight Native reference capture/classification outcomes kept separate from business acceptance; evidenceKind=native-reference-ui and NativeBusinessAcceptance=false.','Named known Native deviations with desired/actual full HTTP and owned PG/signature evidence; unresolved unknown failures stay explicit.'],
    forbiddenSummary:'16 business journeys passed / 16 business pass',allowedSummaryAfterActualConditions:'16 actual executions/captures, Rust8/8 business Pass, Native8 reference captures with explicit known defects and unknown-failure status.',WindowsRustNativeServerCertified:false},
  knownNativeReferenceScope:knownNative,
  strictClassificationRules:[
    'Use the legacy01 assertions intentionally only in Native reference slots and label their successful driver completion as historical-reference capture, never Native business correctness.',
    'A known defect must match the actual valid request/target, unchanged Native source, full response, DOM feedback and precise before/after/GET PG graph. A bare500 is insufficient; retain linked server/SQL/constraint diagnostic when needed to identify the known version failure uniquely.',
    'Unknown statuses/data/SQL causes, invalid fixtures, browser/network capture errors, driver exceptions and timeouts are failures/partial/unresolved; do not blanket-catch them as known.',
    'If Native unexpectedly returns desired correct female/201v2, record that actual result and investigate/reconcile the legacy oracle/runtime observation; do not force unknown/500/v1 or silently pass a mismatching old driver.',
    'Lead03 and intelligenceDiscussion02 retain their current applicable assertions in Native reference captures; the three named deviations are not a waiver for other failures.',
    'Do not mutate Node code, responses, PG facts, frontend state or workflow to satisfy a reference oracle; normal declared real producers and owned cleanup remain mandatory.'
  ],
  derivedRustDefinitions:{
    expectedVersions:['customer02','project02'],implementationReviewedOrSealedByThisPolicyReview:false,sourceHashes:'Pending final authored/Root admitted derivative delivery; no invented pin here.',
    minimalAllowedChanges:'Correct the three old business expectations and their corresponding DOM/history/version assertions, keep real visible interactions, original request capture/PG/source identity/readonly checks and all unrelated assertions. Preserve01 as raw immutable input.',
    customer:'Actual female request must yield female response/list/PG; absent defaults remain distinct. Actual changed edit/null-clears/version and follow-up/noop assertions remain.',
    project:'Actual second bid/pricing save201, currentv2, v1superseded/retained, correct supersedes/row versions, current uniqueness, new children with correct parent IDs, historical children unchanged, DOM/history/reload and upstream cost/bid readonly assertions. Do not just delete the old500 checks.',
    actualRustEightMustFullyPass:true,old01FailuresOnCorrectRustAreOracleFailuresNotBusinessPasses:true,finalG3MustReviewMinimalSourceDiffAndActualFullResults:true,
    additionalG2ApprovalRoundNotRequiredForAlreadyAuthorizedBoundedPreparationAndExecution:true
  },
  otherG1Obligations:{
    sameCurrentFrontendBuildOnAllAxes:true,plannedSignAt:'Lead03 actually fills the date on each axis; request ISO/selected local calendar date/response/GET/page/PG and blank/null regression remain required.',
    projectJourneyScope:'Technical-cost/bid/pricing collaboration workspaces, not the six ProjectBasic operations.',RootProjectM0OperationIds:g1.ownershipAndPublicSurface.RootProjectOperationIds,allSixNeedOwnActualValidReceipts:true,sameConvertedProjectRealAPIChainStillRequired:true,
    sourceProtection:{originalMixedSet:1373,allowedUIFiles:m.protectedAllowedG2Deltas,otherMixedPins:1371,other1371CurrentlyRawExact:true,NativeBackendFiles:420,NativeBackendProductDeltaAllowed:0,terminology:'1371 is the mixed protected remainder, not1371 Node backend source files.'},
    M0M1M2M3M5AndFullStageGuardsStillRequired:true,SourceReadyBuildCountsOrReferenceCaptureNotStageAcceptance:true
  },
  progressOutsideThisReview:{RootReportedFinal01Artifact:'f6a9fdeddebcc6c3453c329ba5dbe6ba38f725e9577df006189b91bfff685747',RootReportedPassed:306,RootReportedIgnored:54,RootReportedCompilationSources311:'239 Rust +2UI +70external compile resources',RootReportedWindowsE1Before22After21:'exact five aliases removed; further Linux/primary/finalGate pending',buildAndE1NotRecertifiedHere:true,priorRollbackGraphGuardStillRequiresActualClosure:true},
  noProductAuthorRootExecutorOrGovernanceWriting:true,noAuthorDriversOrNodeProductDefinitionsImportedOrExecuted:true,noBuildTestHTTPDBPGBrowserOrEnvironmentExecution:true,noPrivateRead:true,noGitMutationOrExternalWrite:true,onlyOwnCReviewArtifactsWritten:true,
  ownStaticReviewer:pin(C+'/g2-write-ui-matrix-clarification01.mjs')
};
const jsonFile=C+'/g2-ui-matrix-clarification01.json',mdFile=C+'/g2-ui-matrix-clarification01.md';
assert(!fs.existsSync(jsonFile)&&!fs.existsSync(mdFile));
const md='# R3 收口 G2 UI 矩阵解释独审 01\n\n结论：**Pass，仅限 checkpoint02 的有界验收解释**；不是实际UI、产品、E1或G3/G4通过。\n\nG1确实漏检了customer01/project01的旧断言含义。原customer01选female并实际发送female，却要求响应/list/PG unknown；Native controller遗漏gender且service默认Unknown。原project01要求第二次合法竞标/报价保存500、旧v1及父子行不变；Native新旧实体同ORM flush与current唯一约束、前批正式纠偏解释了该历史异常。Rust前批已按公开合同保留female、合法第二版201/currentv2，不能用旧oracle拒绝正确Rust。原G1、01和失败/partial原件保持。\n\n同意保留四旅程×四轴16次实际执行：两个Rust轴使用最小correct02，8个业务旅程必须全部通过；两个Native轴的8次是明确native-reference-ui，NativeBusinessAcceptance=false。Lead03/情报02继续当前断言。最终分别列16执行/捕获、8Rust业务Pass、8Native参考及已知缺陷/未知失败，禁止称16业务全通过。这里没有认证任何实际格。\n\nNative已知分类仅限female→unknown、第二版bid/pricing500且完整PG/history仍v1的明确签名；需绑定真实有效请求、完整响应、DOM、源码、PG及必要错误归因。任意500、错fixture、超时或驱动错误都不能吞成known；若Native实际已正确，也保留真实结果，不强制造错。不得改Node源码/返回/PG去刷过。\n\n派生02仍须按实际源diff核验：保留真实控件、网络/PG、只读上游和其他检查，将失败/保留v1预期替换为201/v2、唯一current、旧版superseded与父子历史完整性；不能只删断言。新定义和实际8Rust结果待最终G3审查，不额外阻止已授权的有界G2准备/执行。\n\nProject旅程是协作工作区，Root M0六项目基础操作及同converted-Project完整API链仍须另证。1371为扣除两UI文件后的混合保护集；Native后端420文件均不允许修改。日期非空四轴实证、其余M0–M5、完整终态和独立G3/fixed/main/G4不变。#85/#57当前仍Open。\n';
fs.writeFileSync(mdFile,md,{flag:'wx'});report.readableCompanion=pin(mdFile);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({JSON:pin(jsonFile),Markdown:pin(mdFile),verdict:report.verdict,clarificationApproved:true,actualUIAcceptanceCertified:false,G3Certified:false,G4Certified:false}));
