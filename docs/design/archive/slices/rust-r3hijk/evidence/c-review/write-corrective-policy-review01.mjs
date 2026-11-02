// Independent C policy-only review; does not inspect/approve a repaired implementation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const C='tmp/rust-r3hijk/c-review';
const pin=file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')};};
const file='docs/design/rust-r3hijk-business-semantics-corrective-checkpoint01.md',checkpoint=pin(file);
assert.equal(checkpoint.bytes,5197);assert.equal(checkpoint.rawBytesSha256,'c3f26b38f420fbdc73ae1c3faf379fede27c2115962414508adb5c6f90a86052');
const source=fs.readFileSync(file,'utf8');
for(const rule of ['1. **命令原子性。**','2. **并发与状态转换。**','3. **快照去重。**','4. **文本与输入。**','5. **标识符和错误。**','6. **情报读模型和 no-op。**'])assert(source.includes(rule));
assert(source.includes('整体回滚来自本次用户直接裁决'));assert(source.includes('既有 28 个 canonical 路由'));assert(source.includes('必要会话维护独立处理'));
const authority=pin(C+'/business-semantics-reclassification02.json');assert.equal(authority.rawBytesSha256,'628c50c0a06e3ccb90703d1163cee3467dbf10705fa207fbffe11fa5d36cf53d');
const ex54='docs/design/archive/slices/ex-54-lead-scoring-history-override-governance-baseline.md',lines=fs.readFileSync(ex54,'utf8').split(/\r?\n/);assert(lines[100].includes('componentFactsHash'));assert(lines[146].includes('必须校验 override rowVersion'));
const record={
 kind:'C-independent-R3HIJK-corrective-policy-review01',createdAt:new Date().toISOString(),
 reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',modelTarget:'gpt-6.1-sol/max',Fast:'unverified'},
 checkpoint,verdict:'Pass',policyExecutable:true,policyApprovedForBoundedCorrection:true,blockers:[],P1:0,P2:0,
 scope:'Only executability and authorized scope of the six corrective rules. This is not a repaired-product, runtime, G3, fixed-commit or G4 review.',G3Certified:false,G4Certified:false,newSliceCreated:false,
 authorityReview:{directUserDecision:'Whole-command rollback on failure of any required business write; independent unique number reservation may leave gaps and is never recycled.',existingBusinessDesign:'EX-54 already explicitly requires expected-version safeguards, optimistic concurrency, semantic facts/gates tuple de-duplication and required snapshot/audit facts.',distinctionCorrect:true,decisionSource:authority,design:pin(ex54),exactDesignLines:{semanticDedup:101,expectedLeadVersion:129,expectedOverrideVersion:147,optimisticConcurrency:218,overrideAuditRequirement:142,approvalAndRevocationAudit:[228,230],auditPayload:233}},
 rules:[
  {rule:1,lines:[19],verdict:'Pass',reason:'Required command state, score/override records, snapshots and audit share one transaction. Any required-write failure rolls the command back. Number reservation is explicitly separate and cannot justify a partial business commit.'},
  {rule:2,lines:[20],verdict:'Pass',reason:'Checks occur at the write boundary and include legal state/version. One pending override can transition once; the stale loser409 and its rollback outcome are explicit. The old/new override transition plus required records commits together.'},
  {rule:3,lines:[21],verdict:'Pass',reason:'Meaningful business facts/gates/formula/score/rating govern system snapshot history. Object property order and a name-only change with unchanged facts do not create a scoring event. Existing intentional history meanings remain protected by line30.'},
  {rule:4,lines:[22],verdict:'Pass',reason:'The bounded persisted-text policy clearly rejects NUL and unpaired surrogate400 before writes while preserving valid Unicode and public length constraints. It does not apply a text rule to arbitrary binary upload bytes or require redundant wrong-type Zod issues.'},
  {rule:5,lines:[23],verdict:'Pass',reason:'Known resource UUID syntax400, valid absent resource404, unknown route/command404 and protocol decode errors are separated. HTML/JSON rendering differences are explicitly non-business differences.'},
  {rule:6,lines:[24],verdict:'Pass',reason:'The public string[] projection, non-mutating null-as-empty behavior and semantic no-op are actionable. Valid legacy read arrays are not truncated by write-side max12; invalid objects cannot escape as the wrong DTO type. Domain no-op does not prevent required session maintenance.'}
 ],
 scopeReview:{issues:[93,94,95,96],operations:28,ownersUnchanged:true,canonicalRoutesUnchanged:true,noNewPublicCapabilitiesOrPermissionRules:true,noNewR4WriteSide:true,noNativeUIClientOrMigrationRewrite:true,existing92MigrationsRetained:true,oldEvidenceAndSignaturesPreserved:true,formalR3Delivered:30,totalR3HTTP:58,parentIssuesRemainOpen:[85,57],noDefectCompatibilityE1:true,noExtraHumanApprovalRequiredForTheseAlreadyDecidedRules:true},
 executionBoundary:'Root may have the original three authors make corrections within these six rules and their existing owned modules. Root retains shared routing/transaction integration and actual validation responsibility. The reclassification02 record is to be included in current formal corrective inputs as Root has stated.',
 acceptanceReview:{businessAssertionsRequired:['Whole-command rollback including all required snapshots/audit on injected required-write failures.','Exactly one approval per pending version and actionable409 for a stale competing write.','Semantic system-snapshot de-duplication without deleting intentional historical events.','Early400 for prohibited text and malformed recognized UUIDs while valid contracts remain valid.','focusAreas stable string[] reads, valid13-item legacy read intact, and no hidden domain version/time/actor/audit change on semantic no-op.'],candidateBinding:'Old261 passed/54 ignored and old5b runtime results remain tied to their original sources/artifact. Changed code must produce a new candidate with relevant actual checks; this policy Pass certifies none of those future checks.',noNodeByteParityGate:true,unresolvedFutureBusinessQuestions:'If a genuinely new business dispute appears, Root presents the concrete tradeoff to the user. This does not reopen the already decided overall rollback policy.'},
 implementationStatus:'Not evaluated by this policy-only review. Known business defects identified in earlier factual evidence are not marked repaired.',
 noProductOrTestsWritten:true,noBuildTestDBHTTPBrowserExecution:true,noPrivateRead:true,noGitHubWrite:true,onlyCReviewRecordAndWriterCreated:true
};
const out=C+'/corrective-policy-review01.json';fs.writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});assert.deepEqual(pin(file),checkpoint);console.log(JSON.stringify({review:pin(out),verdict:'Pass',policyApprovedForBoundedCorrection:true,G3Certified:false,G4Certified:false}));
