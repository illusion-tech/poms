// C's policy review only: reads sources and hashes, installs/runs no SQL or Root tool.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const C='tmp/rust-r3m/c-review',F='docs/design/rust-r3m';
const raw=f=>fs.readFileSync(f),J=f=>JSON.parse(raw(f)),read=f=>raw(f).toString('utf8');
const pin=f=>{const b=raw(f);return{file:f,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')};};
const check=p=>{const q=pin(p.file);assert.equal(q.bytes,p.bytes);assert.equal(q.rawBytesSha256,p.rawBytesSha256);};
const checkpoint=F+'/g2-corrective-checkpoint03.md',checkpointText=read(checkpoint);
assert(checkpointText.includes('manual-override'));assert(checkpointText.includes('poms_r3m_rust'));assert(checkpointText.includes('P0001'));assert(checkpointText.includes('CASCADE'));
const authorityFile=F+'/g1-gate-authority01.json',authority=J(authorityFile);assert(authority.G1Certified&&authority.G2Authorized&&!authority.G3Certified&&!authority.G4Certified);
check(authority.manifest);check(authority.independentReview);
const g1=J(authority.independentReview.file);assert(g1.matrixReview.M3.includes('necessary write failure'));assert(g1.businessContractReview.historicalFallback.wholeGraphRollbackAndSuccessfulRecoveryRequired);
const leadService='apps/poms-api-rust/src/leads/service.rs',service=read(leadService);assert(service.includes('"manual-override"'));assert(service.includes('"override-revoked"'));assert(service.includes('"approve-score-override"'));assert(service.includes('"revoke-score-override"'));
const sources=[checkpoint,authorityFile,authority.manifest.file,authority.independentReview.file,'docs/design/rust-r3-closeout-baseline.md',F+'/originals/input-a/g1-input01.json',F+'/originals/input-a/lead-stage-cases01.mjs',leadService,'apps/poms-api-rust/src/leads/store.rs','tools/rust-r3m/lead-repair01.mjs'];
const artifact='f6a9fdeddebcc6c3453c329ba5dbe6ba38f725e9577df006189b91bfff685747';
const actual18='tmp/rust-r3m/acceptance-rust-final01-18/report01.json';
const local18=fs.existsSync(actual18)?{availableLocally:true,pin:pin(actual18),completed:J(actual18).completed}:{availableLocally:false,actualReportNotReadByThisPolicyReview:true};
const conditions={
  exactEnvironment:{
    database:'poms_r3m_rust',PG:'Only the newly owned marked PG15 instance from this batch environment/authority receipts; verify database name/OID, instance/container/endpoint identity, namespace/run marker, original base and G1 baselineCommit by their distinct recorded fields.',
    appRole:'poms_r3m_app',candidateArtifact:artifact,
    forbidden:['poms_r3m_nest or any Native database','primary/development/remote databases','old PG17/private or another cohort','product route/DTO/permission/business-code/migration changes'],
    preflight:'All previous permission-revoke faults must already be restored. Verify original ACL/catalog state and no residual owned QA objects before arming a new case; no other Rust API/UI/fault writer in the fixture window.'
  },
  objectOwnership:{
    schema:'r3m_control',functionAndTriggerPrefix:'r3m_qa_',
    create:'Use validated unique bounded identifiers and exact function signatures; reject preexisting names. No CREATE OR REPLACE, wildcard deletion or alteration of existing functions/triggers. Tables only poms.lead_score_snapshot or poms.lead.',
    registry:'Persist exact intended and created names/OIDs/signatures/owners/target relations/definition hashes and preinstallation catalog/ACL state in an append-only owned fixture ledger. Commit installation before the independent app request can see it.',
    controlSchema:'Prefer the existing owned tooling schema. If it must be created, separately record ownership/ACL and remove only the newly owned empty schema with RESTRICT after its objects are gone; never drop an existing schema.',
    runtime:'Explicit SECURITY INVOKER and fixed safe search_path/fully qualified relation names. current_user must remain the real app role, not a SECURITY DEFINER owner. No privilege escalation, extension, job, cross-database call or autonomous business/diagnostic table write.',
    ACL:'Do not widen app permissions. Any fixture-local function/schema ACL adjustment must be declared and restored exactly; no unrelated table/default ACL edits.'
  },
  preciseTargets:{
    provenance:'Each target Lead UUID and override UUID is from this batch real HTTP producers and present in ownedIds and current PG graph; prepared legacy anomaly and its before/after preparation are separately labelled. Do not arm a seeded/unowned row.',
    manualSnapshot:'BEFORE INSERT on poms.lead_score_snapshot: AND current_user=poms_r3m_app, NEW.lead_id=the exact owned Lead, NEW.snapshot_kind=manual-override, and the expected override/source_record_id/source_command=approve-score-override. It must not reject system INSERT.',
    revokedSnapshot:'Separate declared case: snapshot_kind=override-revoked and source_command=revoke-score-override with the exact source_record_id of the revoked override. Current revoked snapshots have override_id null, so do not require a nonnull override_id that would make the predicate miss.',
    lateProof:'Before raising the intentional manual/revoked fault, the trigger function reads a newly inserted system snapshot visible in that same app transaction, with the same Lead and decision source_record_id; exclude all pre-request snapshot IDs. Capture its new ID and a unique case/run hit token in the diagnostic. An ordinary second connection cannot prove visibility of uncommitted rows.',
    preconditionFailure:'If that prior new system snapshot is absent or ambiguous, raise/report a different fixture-precondition marker. It is not the intended late fault and cannot count as a rollback acceptance pass.',
    leadUpdate:'BEFORE UPDATE on poms.lead: AND app role plus exact OLD/NEW owned Lead identity; reject actual row UPDATE only. SELECT/FOR UPDATE does not fire this row UPDATE trigger, so this can distinguish post-lock score DML from an early UPDATE-privilege failure.',
    noLooseMatching:'Keep every role/UUID/kind/source predicate conjunctive and explicit. No wildcard Lead scope, broad trigger for all app rows or blanket interception of arbitrary failures.'
  },
  evidence:{
    response:'Require the existing normal API500 plus the captured unique database injection marker and declared P0001 diagnostic. If ordinary server logs omit SQLSTATE, the exact immutable function definition declaring P0001 plus its matching captured error marker/phase must establish it. No product API error-envelope modification.',
    incomplete:'An arbitrary500, driver error, timeout, wrong target/role, precondition failure or200 is an injection miss/fixture error/partial, never a simulated necessary-write pass.',
    businessOracle:'Immediately before and after the armed request, require both nonempty complete frozen business graphs, every required table array and actual target Lead/override rows. Exact graph comparison includes score/version/time/actor, old/new overrides, all snapshots, dependent rows and registered audits; session/business-managed fields versus independent auth upkeep and number reservations remain separately observed.',
    control:'For the Lead UPDATE fixture, a normal matching-tuple decision must run on a target actually armed by the same predicate, succeed200 and leave its Lead row unchanged. A different unarmed UUID returning200 is not a valid no-UPDATE control. Do not use the intentionally failing manual-snapshot trigger as that200 control.',
    recovery:'After exact fixture cleanup/restoration, a real successful retry on a valid still-pending/approved fixture must prove recovery. Preserve full source/artifact/DDL definitions/request/response/PG error/before-after/restoration evidence.',
    privacy:'Original raw auth/SQL/error logs stay in current private storage with hashes; publish only declared bounded derivatives containing synthetic target IDs, marker/error/classification and source hashes. Do not read/copy old private.'
  },
  cleanup:{
    required:'Finally after the app transaction ends, DROP only the exact registered trigger ON its exact table, then its exact function signature; no CASCADE. Validate ownership/name/OID/definition before touching an existing object so a reused or foreign object is not deleted.',
    catalog:'Compare pg_trigger/pg_proc sets and definitions/owners plus relevant namespace/table/function/schema/default ACL and seed state against the preinstallation baseline. Record fixture objects all absent, preexisting objects unchanged, complete graph/permission restoration and successful retry.',
    interrupted:'On next startup recover only the exact outstanding owned ledger objects before any new mutable test. Unexpected dependencies, incomplete cleanup or residual trigger/function/privilege changes block further mutable stages and G3/G4 until exact restoration is proven.',
    truth:'Record fixtureDDLExecuted=true and temporary catalog delta while armed; productMigrationsChanged=false/productDDLChanged=false is a separate statement only when accurate. Never report generic no-DDL for a run that created QA triggers/functions.'
  }
};
const report={
  kind:'C-independent-R3-closeout-G2-fault-tool-clarification01',createdAt:new Date().toISOString(),reviewCompleted:true,
  reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',configuredTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  verdict:'Pass',clarificationApproved:true,actualFaultAcceptanceCertified:false,G3Certified:false,G4Certified:false,commitAllowed:false,stageIntegrationComplete:false,
  batchIssue:97,scopeIssues:[98,100],stageIssue:85,overallIssue:57,parent85Open:true,overall57Open:true,
  approvedCheckpoint:pin(checkpoint),reviewedSources:sources.map(pin),candidateArtifact:artifact,
  decision:{
    classification:'QA-only reversible fault-injection method change inside frozen M3 and Root-owned new-environment authorization.',
    productScopeChanged:false,productSourceRouteDTOOrMigrationChangeAuthorized:false,controlledFixtureDDLAllowed:true,
    exactPurpose:'Prove a necessary actual Lead UPDATE failure and a later decision-snapshot failure after the system fallback snapshot, without conflating FOR UPDATE privilege checks or ineffective midtransaction REVOKE with a measured write fault.',
    existingBoundedUserAuthorizationSufficient:true,noNewBusinessOrPermissionDecisionIntroduced:true,
    originalG1ProductDDLZeroRuleRetained:true,earlierPrivilegeOnlyOrNoNewTriggerSuggestedWitnessPlan:'Superseded only for these targeted test methods by this named checkpoint and policy; originals remain unchanged. Expected atomicity/normal/no-op assertions are not weakened.',
    RootMayImplementAndRunWithinAllConditions:true,anotherMandatoryG2ApprovalRoundNotCreated:true,actualToolSourceHitAndRestorationStillRequireIndependentG3Review:true,
    policyFindingCounts:{P1:0,P2:0},unresolvedPolicyBlockers:[]
  },
  installationConditions:conditions,
  acceptedFixtureKinds:['Exact owned Lead BEFORE UPDATE app-role DML failure','Exact owned Lead/override manual-override BEFORE INSERT after new same-TX system snapshot','Separately declared exact owned override-revoked BEFORE INSERT after new same-TX system snapshot'],
  priorPartial18:{
    RootReported:'First seven observations completed; eighth late-REVOKE snapshot-injection attempt returned200 and committed a valid approval. Wholephase18 remainspartial/notpassed.',
    localPublicReadback:local18,
    interpretation:'The attempted fault did not establish a necessary write failure. Successful200 business commit is not itself an atomicity defect; retain that committed graph and request as observed.',
    noPostgreSQLPrivilegeCacheCauseInferred:true,
    newProof:'Use a fresh valid owned fixture or transparently recorded owned preparation with a fresh immediate before graph. Do not silently rewind the successful approval or reuse an approved row as if it were stillpending.',
    newCompleteTargetedPhaseRequired:true,noRelabellingOrSplicingPartial18IntoPass:true,unaffectedStageEvidenceCanRetainItsOwnCandidateAndScope:true
  },
  remainingAcceptance:{
    intendedHitNotCertifiedHere:true,lateNewSystemSnapshotPresenceNeedsActualMarkerProof:true,exactFullGraphRollbackNotCertifiedHere:true,normalArmedControlAndRecoveryStillRequired:true,QAObjectACLAndSeedRestorationStillRequired:true,
    priorEmptyGraphOracleRiskNotClosedByThisPolicy:true,build306AndOtherStageResultsNotReauditedHere:true,noAllStageRerunDemandWithoutChangedSourceOrUnresolvedCause:true
  },
  noDDLInstalledOrExecutedByC:true,noRootOrAuthorToolImportedOrExecuted:true,noProductRootExecutorGovernanceWriting:true,noBuildTestDBHTTPPGBrowserServiceOrWSLExecution:true,noPrivateRead:true,noGitMutationOrExternalWrite:true,onlyOwnCReviewArtifactsWritten:true,
  ownStaticReviewer:pin(C+'/g2-write-fault-tool-clarification01.mjs')
};
const json=C+'/g2-fault-tool-clarification01.json',md=C+'/g2-fault-tool-clarification01.md';assert(!fs.existsSync(json)&&!fs.existsSync(md));
fs.writeFileSync(md,'# R3 收口 G2 故障工具解释独审 01\n\n结论：**Pass，仅限 checkpoint03 的受控 QA fixture 方法**。reviewCompleted/clarificationApproved=true；actualFaultAcceptanceCertified/G3/G4=false，不认证DDL安装、实际命中或回滚。\n\n这是既有M3必要写任一失败整体回滚的测量方法替换。产品源码、route/DTO、92migration和产品DDL零变更规则不变；临时QA触发器/函数的实际DDL必须单列，不能把执行过fixture DDL写成泛称“无DDL”。先前REVOKE未命中的原因不作推测。partial18的200正确提交和全原件保留；新完整目标phase另存，不拼旧partial成Pass。\n\n仅新marked poms_r3m_rust/已登记PG15实例、G1 base与namespace/run marker匹配、current_user=poms_r3m_app、实际owned HTTP Lead/override UUID；禁止Native/primary/PG17/远程库。独占r3m_control/r3m_qa_*新名字，不覆盖旧对象；显式SECURITY INVOKER、安全固定search_path。旧权限故障先恢复，安装提交后串行调用。\n\n晚快照故障必须精确manual-override或单列override-revoked及真实source_record_id；system INSERT不抛。在同一app TX内先确认本次新增system snapshot（排除before IDs），将其ID和唯一hit marker放入具名P0001诊断；无该前置证据是fixture错误，不算后段命中。Root第二连接不能见到未提交行，不能据其空结果或任意500猜测命中。\n\nLead BEFORE UPDATE只拦真实UPDATE而非SELECT/FOR UPDATE。正常匹配tuple200/Lead不变的对照，其真实target也必须被同一谓词武装；对无关UUID的200没有证明力。500须关联具名注入错误，完整非空required graph、必要审计、enlisted session与独立auth/counter分列后精确比较。\n\nfinally等待请求TX结束，按登记name/OID/definition精确DROP trigger及function，无CASCADE；核pg_trigger/pg_proc、相关catalog/ACL/seed恢复，旧对象不变、所有fixture消失，正常重试成功。中断用owned ledger恢复；残留或恢复失败必须停止后续可变测试并阻断G3/G4。原始DDL/网络/错误/图/恢复保留，private只限本批。\n\n本签署允许Root在以上条件内准备并执行有界工具，不另加一次G2批准流程。最终工具源码、预定命中、全图回滚、armed正常对照、恢复/重试与完整阶段仍由独立G3/G4审查。#85/#57当前保持Open。\n',{flag:'wx'});
report.readableCompanion=pin(md);fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({JSON:pin(json),Markdown:pin(md),verdict:'Pass',reviewCompleted:true,clarificationApproved:true,actualFaultAcceptanceCertified:false,G3Certified:false,G4Certified:false}));
