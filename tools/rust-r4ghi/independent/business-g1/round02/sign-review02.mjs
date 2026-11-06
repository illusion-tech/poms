import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const own='tools/rust-r4ghi/independent/business-g1/round02',p=`${own}/final01`;
const approvedInputCommit='9e010077e3010ff09447e9d77cb1bf1f7adbf68d';
const sourceManifest='docs/design/rust-r4ghi/g1-source-manifest01.json';
const sourceManifestSHA256='89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9';
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=path=>JSON.parse(readFileSync(path));
function evidence(file){const b=readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};}
const integrity=load(`${p}/integrity02.json`),schema=load(`${p}/schema-checks01.json`),semantic=load(`${p}/semantic-checks04.json`),completion=load(`${p}/completion-checks05.json`);
assert.equal(completion.passed,true);assert.equal(schema.failed.length,0);assert.equal(schema.checks.length,45);
assert(integrity.checks.filter(c=>c.id!=='operation-map-exact-blueprint-operations-and-hash').every(c=>c.passed));
assert(semantic.checks.filter(c=>!['preserved-inputs.json-closed-in-root-manifest','actual-acceptance-plan-remains-planned'].includes(c.id)).every(c=>c.passed));
const manifestBytes=readFileSync(sourceManifest);assert.equal(sha(manifestBytes),sourceManifestSHA256);
const manifest=JSON.parse(manifestBytes);assert.equal(manifest.entries.length,223);
for(const e of manifest.entries){const b=readFileSync(e.path);assert.equal(sha(b),e.sha256);assert.equal(b.length,e.bytes);}
const git=(args)=>{const r=spawnSync('git',args,{shell:false,windowsHide:true,maxBuffer:4*1024*1024});assert.equal(r.status,0);return r.stdout;};
assert.equal(git(['rev-parse','HEAD']).toString().trim(),approvedInputCommit);
const worktree=git(['status','--porcelain','-z','--untracked-files=all']).toString().split('\0').filter(Boolean);
const unexpectedChanges=worktree.filter(e=>!e.slice(3).startsWith(own+'/'));
assert.deepEqual(unexpectedChanges,[],'review cannot sign after unrelated worktree drift');
const review={
 kind:'independent-R4GHI-minimalR5-joint-G1-second-round-review',schemaVersion:1,gate:'G1',decision:'Pass',signedAt:new Date().toISOString(),
 approvedInputCommit,productBase:manifest.productBase,sourceManifest,sourceManifestSHA256,
 nonAuthor:true,reviewer:'r4ghi_gate_review',G1Certified:true,certificationScope:'Frozen design/input review only; no product, SQL, HTTP, browser, G3 or G4 acceptance.',
 readyForOnlineFreeze:true,G2Authorized:false,onlineFreezeCompleted:false,unresolvedFindings:[],openP0P1P2:0,
 scope:{issues:[110,111,112,113,114,117],referenceOnlyParents:[57,101,116],G:9,H:8,I:11,R5Minimum:4,total:32,existing:29,newPublic:3,currentOfficialRust:240,forecastRust:272,currentR4Delivered:67,R4PlannedTotal:95,forecastIsNotDelivery:true,officialNewDelivered:0,userfix115Separate:true},
 formalInputs:{baseline:evidence('docs/design/rust-r4ghi-next32-baseline.md'),operationMap:evidence('docs/design/rust-r4ghi/operation-map01.json'),acceptancePlan:evidence('docs/design/rust-r4ghi/acceptance-plan01.json'),sourceManifest:evidence(sourceManifest),blueprint:evidence('tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json'),migration:evidence('tools/rust-r4ghi/joint-g1/effective-v2/migration.sql'),effectiveManifest:evidence('tools/rust-r4ghi/joint-g1/effective-v2/manifest.json')},
 resolvedFindings:[
  {id:'BG1-01',priority:1,status:'resolved-in-design',resolution:'Both G snapshot families accept SQL NULL plus explicit knowledge. Producer1 known/value and unknown/NULL constraints, immutable context/paired-snapshot comparison and nullable18,2 ORM target agree. Legacy producer0 stored values are preserved; real SQL/rollback cases remain required.'},
  {id:'BG1-02',priority:1,status:'resolved-in-design',resolution:'Exact strict scopeKind unions separate full project, own-condition task and creator-first-assignment anchor. Narrow list/close schemas reject parent acceptance/completion/evidence fields; own task frontend loads the existing list directly and evidence authority stays tied to actual own task/closure links.'},
  {id:'BG1-03',priority:2,status:'resolved-in-design',resolution:'Participant assignment_id UPDATE is unconditionally rejected; DELETE checks OLD parent, other DML checks the actual same parent. Frozen participant mutations reject and exact deferred millionths total is retained; the zero-weight movement SQL counterexample remains planned acceptance.'},
  {id:'BG1-04',priority:1,status:'resolved-in-design',resolution:'blueprint.inputPreEffectHash, blueprint.ssot.sourceBeforeEffect and source-context.x-preEffectInputHashWhitelist are deeply equal. The exact whitelist binds the complete sorted affected project/head/baseline/current snapshot/terminal-root IDs, versions and payload hashes before any producer effects.'}
 ],
 semanticConclusions:[
  'Consumed labor/allocation/stage/tax corrections use the actual producers under private same-outerTX permits. Stage correction preserves included status/money/confirmation; shared lineage refreshes a complete real allocation batch. All affected projects, sensitive permissions, sorted locks and live/period terminal restatements are mandatory and atomic.',
  'Access proofs and correction permits bind a private lifetime-bound Root OuterTxToken, not request_id. Root owns common types/hash/loader/scope and all shared/critical producer changes; G/H/I consume those exact contracts.',
  'Legacy current baseline/period/frozen assignment is queried across producers before interpreting a missing new head. Unsupported legacy admission and nonexistent correction producers fail closed before insertion; actual missing assignment is200/null.',
  'The sixth user scope decision is frozen as true creator first assignment with provenance and permanent consumption, followed by current responsibility-chain authority. Old unknown origins, same organization, role names or bare permissions never manufacture scope.',
  'Conditional completion is consistently represented in public stage/archive enums, project CHECK and terminal ledger matching; closure changes aggregate condition state only. Only the designated actor closes an exact parent/child condition under double CAS.',
  'Money remains exact cents/numeric18,2 with checked pre-insert capacity rejection; unknown/null differs from evidenced zero. Policy hash, all11 rules, separate four-stage gates, source windows, immutable capture and acyclic output references remain frozen.'
 ],
 validation:{
  inputIntegrity:'223/223 frozen raw-byte inputs exactly match both worktree and approved Git objects; no line-ending exception.133/133 product Git blobs match d5c79 and their recorded base identities. Candidate changes are confined to docs/tools.',
  sourceGraph:'174 author source pins and effective manifest entries close in the Root graph. All26 promised historical preserved inputs are exact at the approved commit; seven old generator/check/index files are supplementary historical references, not executable targets.',
  independentStaticChecks:{run:true,checks:45,passed:45,qualification:'Schema, routing, strict minimal DTO injection rejection, numeric bounds and exact hash-contract checks only.'},
  RootStructuralChecks:{runByReviewer:false,rawEvidenceIndependentlyVerified:true,checks:41,passed:41,qualification:'Existing exact final-script result carried forward after verifying raw stdout/stderr hashes and every unchanged input pin.'},
  docsChecks:{gitDiffCheck:'Root actual preflight passed; immutable raw streams verified',markdownFormat:'Root actual preflight passed; unchanged docs source pins verified'},
  actualRemoteReadback:{main:integrity.remoteMain,feature:integrity.remoteFeature,issuesOpen:integrity.issues.map(i=>i.number),G1OnlineNotYetCertified:true},
  productSQLHTTPUI:'not required to sign design G1; not run by this reviewer. All actual PG/HTTP/UI/FI/concurrency/security/cleanup and risk-scaled build/lint/test requirements remain explicit in the frozen acceptance plan.',
  gateExceptions:[],
 },
 metadataAdjudications:[
  {subject:'operation-map inventoryStatus',conclusion:'Three new-route Root annotations new-planned-canonical-decided and blueprint planned have the same planned meaning. Every other operation field is identical and the authoritative canonical rows remain planned; no contract drift or implementation claim.'},
  {subject:'preserved historical tools',conclusion:'Seven old generator/check/index files are not promoted into the Root normative target graph. Their hashes and approved-commit bytes are independently verified in completion-checks05; the original historical labels are preserved.'}
 ],
 retainedFailuresAndLimits:{RootPreflight01:'Failed-preserved: WSL Python lacked jsonschema. Narrow Windows Python retry passed41 without rerunning unchanged passed checks.',reviewerToolNoise:['preread01/verifier-clarification01.json','final01/verifier-clarification02.json'],strictComparisonRefinements:['final01/operation-map-comparison03.json','final01/completion-checks05.json'],priorReviewsNotRewritten:true,model:{requested:'gpt-6.1-sol',requestedReasoningEffort:'max',runtimeModelIndependentlyVerified:false,Fast:'unverified'}},
 evidence:[evidence(`${p}/candidate-inputs.json`),evidence(`${p}/integrity02.json`),evidence(`${p}/schema-checks01.json`),evidence(`${p}/semantic-checks04.json`),evidence(`${p}/completion-checks05.json`),evidence(`${p}/preread-final-comparison.json`)],
 nextGate:'Root may commit/push this certificate and execute the already-reviewed exact online-freeze plan. Only successful actual online freeze and readback may authorize G2. This certificate grants no G2, product acceptance, Issue closure, main integration or deployment.',
 independence:{authoredProductOrFrozenDesign:false,productEdits:false,gitMutations:false,GitHubMutations:false,databaseConnections:0,productRuntimeStarted:false,productTestsRerun:false,readOnlyExternalCalls:'gh api --method GET',writableBoundary:own+'/**'}
};
const certificate=`${own}/g1-review02.json`;
writeFileSync(certificate,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
const md=`# R4 GHI + 最小 R5 联合 G1 第二轮独立终审\n\n结论：**Pass（仅设计/冻结输入）**。非作者审查固定提交 \`${approvedInputCommit}\`；source manifest SHA-256 \`${sourceManifestSHA256}\`。\n\n32项为G9/H8/I11/R5最小4，29既有、3新增；正式交付仍Rust240、R4已67，272/95均为预测。本次\`G1Certified=true\`、\`readyForOnlineFreeze=true\`、\`G2Authorized=false\`；未闭P0/P1/P2为0。\n\nBG1-01未知税额、BG1-02最小响应、BG1-03冻结参与人改挂、BG1-04完整影响集hash白名单均在最终设计解决。F四类真实producer纠正、全影响项目/终端权限与锁、legacy current fail-closed、第六项首派责任链、conditional stage和private OuterTxToken已核闭合。\n\n223项原字节与当前工作树/候选Git完全一致，133产品blob与d5c79相同；独立45静态检查全通过，Root已有41项结构检查原始stdout/hash已独立核实。main仍d5c79、feature为固定候选，九个本批/父Issue均Open。三处planned元数据同义注解不构成契约漂移；26份旧输入原字节均保留。原失败/预审/工具噪声及严格比较修订均追加留证。\n\n真实SQL、HTTP、UI、故障并发、编译/lint/test、清理和G3/G4仍按冻结验收计划完成。本次未运行产品/数据库或进行Git/GitHub写入；#115独立补审不复测。Root提交发布证书后可执行线上冻结，成功读回后才准入G2。Fast仍未核实。\n\n完整证书：\`g1-review02.json\`；固定字节、原件与检查：\`final01/\`。\n`;
writeFileSync(`${own}/g1-review02.md`,md,{flag:'wx'});
console.log(JSON.stringify({decision:review.decision,G1Certified:true,readyForOnlineFreeze:true,G2Authorized:false,approvedInputCommit,sourceManifestSHA256,unresolvedFindings:review.unresolvedFindings,certificate:evidence(certificate)},null,2));
