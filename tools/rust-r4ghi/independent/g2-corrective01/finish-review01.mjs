import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='tools/rust-r4ghi/independent/g2-corrective01',sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(`${dir}/input-manifest02.json`));
const pin=(workspace,file)=>manifest.records.find(r=>r.workspace===workspace&&r.file===file);
const scope=pin('I','tools/rust-r4ghi/I/implementation/support-patches/project-action-authorization.rs.txt');
const schema=pin('Root','apps/poms-api-rust/src/project_operating_common/schema.rs');
const model=pin('Root','apps/poms-api-rust/src/project_operating_common/model.rs');
const freshness=manifest.records.filter(r=>r.exists).map(r=>({workspace:r.workspace,file:r.file,capturedSHA256:r.rawBytesSha256,currentSHA256:sha(readFileSync(r.absoluteSource))}));
const findings=[
 {id:'G2S-01',priority:1,classification:'new-real-drift',status:'open-in-captured-unapplied-proposal',title:'Legacy owner with no ownerOrg gets full project operating/commission read scope',file:scope.absoluteSource,start:699,end:708,sourceSHA256:scope.rawBytesSha256,
  evidence:['scope proposal699-708 defines owner_read solely by owner UUID, with no bounded-legacy distinction','scope proposal737-756 skips D for the allowed owner and sets full=owner_read||part','scope proposal775-845 grants FullProject to OperatingRead/ReadCommissionAssignment/ReadProjectAnchor and allows the read','scope proposal1017-1073 accepts that full proof into the read access set','frozen blueprint.scope.OwnerRead and IRefinements.factDefinitions.ownerRead allow only bounded non-sensitive anchor reading when ownerOrg is missing'],
  reproducibleFacts:'Matching active actor/session IDs; project.owner_user_id=actor.id; project.owner_org_id=NULL; no D participant; contract:finance:manage permission; even empty current memberships. require(OperatingRead,Project{id}) follows the recorded branches to FullProject.',
  consequence:'This expands an explicitly bounded legacy relation into the G/H or commission project scope. Per-field sensitive permissions cannot replace the missing project-scope boundary.',
  correction:'Distinguish bounded legacy anchor eligibility from full OwnerRead. Operating/commission/detail consumers must not receive FullProject from the old missing-org branch. Preserve an explicit bounded anchor response or fail closed for protected full reads.',
  verification:'Static branch trace only; proposal not applied, Rust/HTTP/DB not run.'},
 {id:'G2S-02',priority:2,classification:'new-real-drift',status:'open-in-captured-uncompiled-common',title:'Finite schema validator ignores the frozen not constraint',file:schema.absoluteSource,start:137,end:178,sourceSHA256:schema.rawBytesSha256,
  evidence:['matches_schema implements composition/if branches but has no not check','CreateProjectCompletionRecordRequest.allOf[0].else.not prohibits completionConditions for completed','normalize retains the known completionConditions field; generated request model1336-1357 accepts it as Option<Vec<...>>'],
  reproducibleRequest:`${dir}/counterexamples01.json#/completionNotKeyword/request`,
  expected:'400 modern structural validation before lifecycle/DB processing.',
  staticConsequence:'A completed request carrying a valid nonempty completionConditions array reaches typed deserialization despite violating the frozen contract. No claim that downstream lifecycle/SQL accepts bad facts.',
  correction:'Implement not for the frozen schema closure and add the supplied request rejection case. Keep unknown validation keywords fail closed when extending the finite closure.',
  verification:`${dir}/reference-check01.json proves the reference schema rejects exactly through allOf/0/else/not and accepts the same body without conditions; Rust runtime was not executed.`}
];
const report={
 kind:'independent-limited-G2-static-corrective-prereview',reviewedAt:new Date().toISOString(),decision:'Needs-correction in captured proposal/common',G3Certified:false,G4Certified:false,nonAuthor:true,
 roots:manifest.roots,heads:manifest.heads,inputManifest:`${dir}/input-manifest02.json`,scopeProposalSHA256:scope.rawBytesSha256,
 findings,unresolvedP1:1,unresolvedP2:1,
 positiveStaticObservations:[
  'Actor/session/snapshot equality and fresh active-account checks are explicit; physical transaction PID/XID is checked, request_id is not token authority. Access sets also bind actor/session permission snapshot and token nonce.',
  'Cross-department Delegated authority uses real D participant/confirmed role facts plus active organization conditions. The D bridge calls sources::fresh and does not add a second D collector.',
  'Creator bootstrap checks exact origin payload/hash, actual lead conversion, available never-personal state, membership, owner/project CAS prerequisites; direct personal or consumed origins do not regain creator privileges.',
  'Own-condition lookup binds parent/child/project and true acceptance/execution/terminal chain to the actual responsible actor. Closing by a full owner/admin still requires the own-condition relation.',
  'Ordinary DB failures propagate through await?. Optional independently-authorized branches only discard stale-domain Conflict/CodedConflict from D, not Database errors.',
  'ResourceKeys preserves completionRecordId and id independently; exact integer/weight normalization occurs before general Value/f64 parsing; StoredMaterialityReview remains distinct from non-Deserialize VerifiedMaterialityReview.'
 ],
 correctiveInputBoundary:'Read g2-corrective01.md/.sql and g2-public-delta01.json. Receipt NULL authority, classification public decision version/private head CAS, correctionSourceRefs/proposedAffectedTargets, inherited classification hard eligibility and head/H binding ordering remain required implementation/acceptance inputs; this review does not certify their runtime implementation.',
 pendingUserDecision:'Whether historical period closing advances live current remains Pending as instructed. No dependent implementation or publication conclusion is signed.',
 freshness:{checkedAt:new Date().toISOString(),records:freshness,changedAfterCapture:freshness.filter(r=>r.capturedSHA256!==r.currentSHA256)},
 limits:{scopeProposalApplied:false,unifiedCompilationRun:false,productHTTPRun:false,SQLRun:false,databaseConnections:0,productWrites:false,gitMutations:false,GitHubMutations:false,userfix115Retested:false,hashLoaderNotReviewed:'Root writing concurrently; excluded from this limited input capture',missingAuthorCommonFiles:manifest.records.filter(r=>!r.exists),onlyWritableBoundary:dir+'/**',runtimeModelIndependentlyVerified:false,Fast:'unverified'},
 evidence:[`${dir}/counterexamples01.json`,`${dir}/reference-check01.json`],
};
writeFileSync(`${dir}/review01.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const md=`# G2 限定静态预审 01\n\n结论：捕获版本有 **1 P1、1 P2** 待修；**不签 G3**。scope提案SHA-256 \`${scope.rawBytesSha256}\`，尚未应用；完整固定输入见\`input-manifest02.json\`。\n\n1. **G2S-01 / P1：旧缺ownerOrg的owner被授FullProject。** scope699–708只按owner UUID设置owner_read，756直接变full；775–845的经营/提成/详情读授完整scope。反例为真实owner、ownerOrg=NULL、无D关系、具finance permission；即使无active membership也能构造经营读access set。冻结OwnerRead明确仅允许有限非敏感锚点。须将该legacy关系与full OwnerRead分开，保护完整经营/提成读取。\n2. **G2S-02 / P2：schema.rs137–178漏实现not。** completed请求附合法completionConditions违反冻结allOf/else/not，却会通过当前形状层和可选Vec字段反序列化。\`reference-check01.json\`已证明冻结schema精确拒绝该反例；未声称下游SQL会写坏。\n\nactor/physicalTX、跨部门真实D职责、creator永久消费、own-condition双UUID、DB错误传播和raw数值规范化已作限定静态阅读；具体正向观察见JSON，不等于实际验收。Root D桥复用sources::fresh。期末是否推进live-current仍Pending。未统一编译、未跑产品/SQL/DB，未Git/GitHub写入；#115未复测。\n`;
writeFileSync(`${dir}/review01.md`,md,{flag:'wx'});
console.log(JSON.stringify({report:`${dir}/review01.json`,reportSHA256:sha(readFileSync(`${dir}/review01.json`)),P1:1,P2:1,G3Certified:false,changedAfterCapture:report.freshness.changedAfterCapture},null,2));
