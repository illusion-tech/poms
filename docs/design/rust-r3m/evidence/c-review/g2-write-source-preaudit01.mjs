// C's own static reviewer. Does not import/run any author or Root product/tool.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',C='tmp/rust-r3m/c-review';
const roots={a:'E:/projects/worktrees/poms-r3co-a/poms',b:'E:/projects/worktrees/poms-r3co-b/poms',d:'E:/projects/worktrees/poms-r3co-c/poms'};
const base='546c6c243ea6162077cb065ced54c5a8188afe23';
const raw=f=>fs.readFileSync(f),J=f=>JSON.parse(raw(f)),sha=b=>createHash('sha256').update(b).digest('hex');
const pin=f=>{const b=raw(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)};};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16000000,windowsHide:true}).trim();
const check=(p,file=p.file||p.path)=>{const b=raw(file);assert.equal(b.length,p.afterBytes??p.bytes,file);assert.equal(sha(b),p.afterSha256||p.rawBytesSha256||p.sha256,file);return pin(file);};
assert.equal(git('rev-parse','HEAD'),base);
const authorityFile='docs/design/rust-r3m/g1-gate-authority01.json',authority=J(authorityFile);
assert(authority.G1Certified&&authority.G2Authorized&&!authority.G3Certified&&!authority.G4Certified);
assert.equal(authority.baselineCommit,base);assert(authority.parent85Open&&authority.overall57Open);assert.equal(authority.onlineComments.length,5);assert(authority.onlineComments.every(x=>x.bodyExact&&x.open));
check(authority.manifest);check(authority.independentReview);authority.supplements.forEach(p=>check(p));
const manifest=J(authority.manifest.file);
const deliveryPaths={a:'tmp/rust-r3m/g2-a/source-manifest01.json',b:'tmp/rust-r3m/g2-b/delivery01.json',d:'tmp/rust-r3m/g2-d/delivery01.json'};
const expected={a:{bytes:3347,hash:'048e5f68468989325274bdcbd3fcc11d236f590c56c611bc50c3c53b8c9f9520'},b:{bytes:8161,hash:'743e745fe003fb6b4e8efb2763680a4fe1c77dd234f72df470cf6dfc6ee2b8a5'},d:{bytes:3293,hash:'37cbc2c6c828e49a5e79dcefdab3ad2f9c033c785a7d7bafcb373bea9bad25a2'}};
const deliveries={},deliveryPins={},sourceRecords=[],purePins=[];
for(const who of ['a','b','d']){
  const file=roots[who]+'/'+deliveryPaths[who],p=pin(file);assert.equal(p.bytes,expected[who].bytes);assert.equal(p.rawBytesSha256,expected[who].hash);deliveries[who]=J(file);deliveryPins[who]=p;
  assert.equal(git('-C',roots[who],'rev-parse','HEAD'),base);
  const entries=who==='a'?deliveries.a.sources:who==='b'?deliveries.b.productFiles:deliveries.d.files;
  for(const p of entries){const relative=p.file||p.path,source=roots[who]+'/'+relative;check(p,source);sourceRecords.push({author:who,relative,original:pin(source)});}
  const defs=who==='a'?deliveries.a.artifacts:who==='b'?deliveries.b.pureDefinitions:[deliveries.d.stageMatrix];
  for(const p of defs){const source=roots[who]+'/'+(p.file||p.path);check(p,source);purePins.push({author:who,...pin(source)});}
}
assert.equal(sourceRecords.length,13);assert(deliveries.a.pausedAfterHandoff);assert.equal(deliveries.d.E1Exited,false);
const integrationFile='tmp/rust-r3m/root/g2-integration02.json',integration=J(integrationFile);assert.equal(integration.records.length,13);assert(integration.sourceOnly&&!integration.buildOrBusinessAcceptanceExecuted);
for(const r of integration.records){check(r.authorSource);assert.equal(r.authorSource.rawBytesSha256,r.integrated.rawBytesSha256);if(r.previous){const previous=manifest.rustFiles.find(p=>p.file===r.previous.file);assert.deepEqual(previous,r.previous);}}
const integratedNow=integration.records.map(r=>({file:r.integrated.file,atReceipt:r.integrated,now:pin(r.integrated.file),rawStillEqual:pin(r.integrated.file).rawBytesSha256===r.integrated.rawBytesSha256}));
const ui=['apps/poms-admin/src/app/features/lead/lead-list.ts','apps/poms-admin/src/app/features/lead/lead-list.spec.ts'];
for(const f of ui)sourceRecords.push({author:'RootUI',relative:f,original:pin(f)});
const allowedProduct=sourceRecords.filter(p=>p.author!=='d').map(p=>p.relative).sort();assert.equal(allowedProduct.length,9);
assert.deepEqual(git('diff','--name-only',base,'--','apps','libs').split('\n').sort(),allowedProduct);
const uiSource=fs.readFileSync(ui[0],'utf8'),uiTest=fs.readFileSync(ui[1],'utf8');assert(uiSource.includes('plannedSignAt: form.plannedSignAt ? form.plannedSignAt.toISOString() : null'));assert(uiTest.includes('ConvertLeadToProjectRequestSchema.safeParse'));
for(const p of manifest.protectedFiles)if(!ui.includes(p.file))check(p);

const aSource=fs.readFileSync(roots.a+'/apps/poms-api-rust/src/leads/service.rs','utf8'),aStore=fs.readFileSync(roots.a+'/apps/poms-api-rust/src/leads/store.rs','utf8');
assert(aSource.includes('let system = SystemScoreTuple::calculate(lead, &facts)?;'));assert(aSource.includes('fn build_snapshot(\n    system: &SystemScoreTuple,'));
assert(aSource.includes('store::system_snapshots_for_score(connection, lead)'));assert(aSource.includes('let (mut lead, before) = lock_override_lead'));
assert(aStore.includes('FOR UPDATE'));assert(aStore.includes('pub async fn update_recalculated_score'));
const bSource=fs.readFileSync(roots.b+'/apps/poms-api-rust/src/customers/service.rs','utf8');assert(bSource.includes('Ok(customer_updated_version(target, updated).map(Some))'));assert(bSource.includes('self.orgs.get(&id)'));
const aPureFile=roots.a+'/tmp/rust-r3m/g2-a/lead-correction-cases01.mjs',aPure=fs.readFileSync(aPureFile,'utf8');
assert(aPure.includes('jsonEqual(afterGraph, beforeGraph);'));assert(aPure.includes('export function assertFailedDecisionRolledBack'));
const sourceOnlyRisk={id:'C-G2-ORACLE-01',priority:'P2-evidence-guard',category:'Acceptance adapter input completeness, not a product transaction defect',source:pin(aPureFile),function:'assertFailedDecisionRolledBack',staticCounterexample:'Missing beforeGraph/afterGraph becomes assert.deepEqual(undefined,undefined), and two empty objects also compare equal; the naked helper can return true without a captured business graph.',executedByC:false,
  RootResponse:'Accepted in a direct Root message: actual adapter must reject missing/null/undefined/empty graphs, require every frozen table array and actual target Lead/override row, and apply the same complete-scope guard for B.',
  requiredClosure:'Bind and inspect that actual adapter code and its deliberate missing/empty/missing-table/absent-target rejection probes before using any rollback Pass. SourceReady pure A01 remains immutable.',
  state:'Root guard requirement accepted; actual adapter implementation/evidence not supplied in this source preaudit; pending G3 verification',G3EvidencePassAllowedBeforeClosure:false};

const aliasPins=manifest.E1Inputs,aliasState=aliasPins.map(p=>{const present=fs.existsSync(p.file);if(present){check(p);check(p.canonical);assert(raw(p.file).equals(raw(p.canonical.file)));}return{file:p.file,present};});
const previousReview=J('docs/design/rust-r3m/C/g1-independent-review01.json');const legacy=previousReview.E1.consumerPaths;
const rgArgs=['-l','-F',...aliasPins.flatMap(p=>['-e',p.file]),'tools','--glob','*.mjs','--glob','*.js','--glob','*.cjs'];
const currentLiteral=execFileSync('rg',rgArgs,{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/'));
const allLiteral=[...new Set([...currentLiteral,'tmp/rust-r3hijk/foundation-business-regression01.mjs'])].sort();
assert(legacy.every(f=>allLiteral.includes(f)));const additionalLiteral=allLiteral.filter(f=>!legacy.includes(f));
assert.deepEqual(additionalLiteral,['tools/rust-r3m/e1-registry01.mjs']);assert.equal(allLiteral.length,24);
const archiveMapPin={file:'docs/design/archive/slices/rust-r3cdefg/archive-origin-map.json',bytes:355382,rawBytesSha256:'74246bb91c6bae9d9e3f9277351386264f1f8534acdbbf309f56eb952608bfc8'};check(archiveMapPin);
const archiveMap=J(archiveMapPin.file);const mapTargets=[];
for(const p of aliasPins){const matches=archiveMap.records.filter(r=>{const s=r.source||{file:r.originalPath,bytes:r.bytes,rawBytesSha256:r.rawBytesSha256};return s.file===p.file&&s.bytes===p.bytes&&s.rawBytesSha256===p.rawBytesSha256;});assert.equal(matches.length,1);const t=matches[0].destination||{file:matches[0].archivePath,bytes:matches[0].bytes,rawBytesSha256:matches[0].rawBytesSha256};check(t);assert.deepEqual(t,p.canonical);mapTargets.push(t);}
const dRegistry=fs.readFileSync(roots.d+'/tools/rust-r3m/e1-registry01.mjs','utf8'),dResolver=fs.readFileSync(roots.d+'/tools/rust-r3m/e1-resolver01.mjs','utf8'),dReplay=fs.readFileSync(roots.d+'/tools/rust-r3m/e1-replay01.mjs','utf8');
for(const p of aliasPins){assert(dRegistry.includes(p.file));assert(dRegistry.includes(p.rawBytesSha256));}
assert(dResolver.includes('return slot.snapshot ?? slot.move'));assert(dResolver.includes('E1_MAP_CONFLICT'));assert(dResolver.includes('fs.lstatSync'));assert(dResolver.includes('O_NOFOLLOW'));assert(dResolver.includes('E1_SOURCE_CHANGED'));
assert(dReplay.includes('requireAliasesAbsent = true'));assert(dReplay.includes('E1_ALIAS_PRESENT'));assert(dReplay.includes('data:text/javascript;base64,'));assert(dReplay.includes('E1ExitCertified: false'));
const canonicalG1=J(aliasPins.find(p=>p.file.endsWith('/g1-input-manifest02.json')).canonical.file),canonicalNative=J(aliasPins.find(p=>p.file.endsWith('/preflight-native-source-manifest01.json')).canonical.file),canonicalOps=J(aliasPins.find(p=>p.file.endsWith('/g1-operation-slices-original.json')).canonical.file);
assert.equal(canonicalG1.nativeFiles.length,872);assert.equal(canonicalNative.nativeFiles.length,872);assert.equal(canonicalG1.formalFiles.length,44);assert.deepEqual(canonicalG1.nativeFiles,canonicalNative.nativeFiles);assert.equal(canonicalOps.operations.length,16);assert.equal(new Set(canonicalOps.operations.map(p=>p.path)).size,11);
const nativeSpec=J('libs/shared/api-spec/openapi.json');for(const p of canonicalOps.operations)assert.equal(nativeSpec.paths[p.path][p.method.toLowerCase()].operationId,p.operationId);

const diagnosticFile='tmp/rust-r3m/acceptance-rust-baseline01-03/report01.json',diagnostic=J(diagnosticFile);assert(diagnostic.completed);assert.equal(diagnostic.cases.length,7);assert.equal(diagnostic.events.length,24);assert.equal(diagnostic.runtime.artifactSha256,'66db94ce84778e4cbf7b1141b34ba5211ecc229ff40f17f8950933d5034aef67');
assert(diagnostic.cases.slice(0,6).every(c=>c.value.expectedPreFixViolationObserved===true));
const dateProbe=diagnostic.cases[6].value;assert(dateProbe.observedRejectedOriginalUIRequest&&dateProbe.sourceDerivedRequestOnly&&!dateProbe.realBrowserRun);assert.equal(dateProbe.response.status,400);
const noop=diagnostic.cases.find(c=>c.label==='baseline.customer-other-actor-business-noop').value;assert.equal(noop.after.row_version,noop.before.row_version+1);assert.equal(noop.audit.length,0);
for(const prefix of ['controlled-race.customer.','controlled-race.customer_contact.'])assert.deepEqual(diagnostic.events.filter(e=>e.label.startsWith(prefix)).map(e=>e.response.status).sort((a,b)=>a-b),[200,500]);
const partials=[1,2].map(n=>`tmp/rust-r3m/acceptance-rust-baseline01-0${n}/report01.json`).map(f=>({file:pin(f),completed:J(f).completed}));assert(partials.every(p=>p.completed===false));

const copyPlan=[...sourceRecords.map(r=>({...r,originalAbsolute:r.original.file})),...purePins.map(p=>({author:p.author+'-pure',relative:path.relative(roots[p.author],p.file).replaceAll('\\','/'),original:p,originalAbsolute:p.file})),...Object.entries(deliveryPins).map(([author,p])=>({author:author+'-delivery',relative:deliveryPaths[author],original:p,originalAbsolute:p.file}))];
const copied=[];
for(const row of copyPlan){const bytes=raw(row.originalAbsolute);assert.equal(sha(bytes),row.original.rawBytesSha256);const target=C+'/g2-source-originals01/'+row.author+'/'+row.relative+'.raw.bin';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});copied.push({author:row.author,logicalOriginal:row.originalAbsolute,snapshot:pin(target)});}
const checkpoints=['docs/design/rust-r3m/g2-corrective-checkpoint01.md'];
const report={
  kind:'C-independent-R3-closeout-G2-incremental-source-preaudit01',createdAt:new Date().toISOString(),reviewCompleted:true,reviewMode:'Source-only incremental preaudit; not complete G3/G4',
  reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',configuredTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  verdict:'Source-preaudit-complete-no-new-product-blocker-found',sourcePreauditCompleted:true,G3Certified:false,G4Certified:false,implementationAccepted:false,commitAllowed:false,stageIntegrationComplete:false,
  baselineCommit:base,batchIssue:97,scopeIssues:[98,99,100],parents85And57RemainOpen:true,HTTPDeliveredRemains58:true,
  authority:pin(authorityFile),G1ActualAuthorityFlagsAndFiveExactOpenCommentsVerified:true,checkpoint:checkpoints.map(pin),
  inputs:{authorDeliveries:deliveryPins,allA3B4D6SourceReadyHashesExact:true,authorPurePins:purePins,rootIntegration:pin(integrationFile),all13ReceiptAuthorPinsExactAndPriorG1PinsExact:true,integrationCurrentReadback:integratedNow,RootCurrentProducts:sourceRecords.filter(p=>p.author!=='d').map(p=>({author:p.author,relative:p.relative,pin:p.original})),trackedProductChangesExactlyNine:true,remaining1371MixedProtectedInputsRawExact:true,immutableCSourceSnapshots:copied},
  productFindingCounts:{P1:0,P2:0},newProductFindings:[],knownSevenCorrectionsStillNeedFinalArtifactAndActualAcceptance:true,
  A:{
    sourceStatus:'Now SourceReady and paused, after an initial provisional read; report binds final source-manifest01 hash.',
    tuple:'refresh_score collects once into owned SystemScoreTuple; snapshot builder takes that tuple and does not reread facts. All seven explicit system triggers pass it through.',
    history:'Normal decisions search system rows matching stored score/rating, then validate formula, current base components/gates and calculations from stored facts/reason. Coherent v1 preserves its formula; JSONB numeric integers normalize without binary64; unknown metadata retained.',
    fallback:'No matching coherent tuple invokes a real Lead system-score/version/time/actor update and a required system snapshot in the same outer override_transaction as decision CAS/manual or revoked snapshot/session/registered audit. No GET repair or new I/F/upload trigger.',
    locks:'Observe override nonlocking, lock Lead FOR UPDATE first, reread override/version/status, then old/new override CAS. Explicit Lead update now takes its successful Lead CAS before active-override/snapshot lookup. No FOR SHARE-to-UPDATE upgrade introduced.',
    responseCorrection:'command_summary reads approved override using the caller connection; update/qualify/close/noop immediate effective tuple uses the same summary rule as GET.',
    requiredActual:'Matched tuple after new real facts; controlled single-materialization interleave; v1/invalid/missing/same-score-different-facts fallback; each early and late necessary write fault/recovery; two same-record legacy decisions; replacement versus old-active revoke legal serial outcomes; concurrent Lead writer; all triggers and active/manual response/GET/PG consistency.',
    lateFailurePhase:'Startup denial of Lead UPDATE can only prove FOR UPDATE privilege failure; stage a post-lock privilege change for fallback DML, and a later decision-snapshot failure after system snapshot insertion. Verify statement/waiter identity, not independent visibility of uncommitted rows.'
  },
  B:{
    CAS:'Only store fetch_optional None maps to typed Conflict409 before commit. Both nested domain error and genuine sqlx error explicitly roll back; sqlx errors stay500. Contact audit and managed session remain in the same TX.',
    noOp:'customer_changes computes business fields before updated_by; parsed optional UUID identities make spelling-only owner changes nondirty. Actual dirty change records actor; no-op leaves business version/time/actor unchanged, session upkeep separate.',
    projection:'ListContext org map uses Uuid; raw ownerOrgId presentation remains possible, but name lookup is identity based. CustomerDetailView is flat; POST Summary has no ownerOrgName.',
    audit:'Customer changed/noop has no registered updated audit; no fabricated audit requirement. Contact changed audit is registered and must roll back with CAS/SQL loss.',
    pureChain:'Same actual canonical convertToProject request/response ID and Customer/Lead anchors required, followed by cost1/2, direct quote, bid1/2, bid quote, nine operation surface reads/creates, exact decimal parent/child ::text and stale/fault complete graph rollback.',
    requiredActual:'Two real UPDATE waiters/two sessions ->200/409 and unique winning row/actor/contact audit; other actor and UUID case noops; immediate flat ownerOrgName/GET/PG; real SQL faults500 and due enlisted session rollback; same converted Project C/D/G chain.'
  },
  RootUI:{files:ui,sourceEncoding:'Only plannedSignAt Date.toISOString; other date-only helpers unchanged.',unitChange:'Actual shared ConvertLeadToProjectRequestSchema.safeParse on mock-call DTO, dynamic local Date ISO expectation; it is still a unit and not real browser/network evidence.',requiredActual:'New final UI build; four original journeys across four browser/backend axes=16 cells, filled plannedSignAt per axis plus blank/null and local-calendar/GET/PG correspondence.',WindowsRustNativeServerCertified:false},
  D:{
    sourceReadyFiles:6,reviewedExportsNotExecutedByC:true,strictIdentity:'Full logical file/bytes/SHA; fixed pinned canonical map; snapshot before move, same-rank target conflict fail-closed, no active/latest fallback.',
    paths:'Reject absolute/drive/backslash/NUL/empty/dot/traversal/nonarchive targets; check parent lstat regularity/no symlink, readonly descriptor type/length/hash, pre/post identity/time and named path.',
    actualReplayDesign:'Load only two allowlisted exact hashed pure fixture byte buffers via data URL, no imports/dependency rewriting; actual four deterministic calls compared with independent literal expectations; reread canonical inputs/map and alias lstat states afterward.',
    sourceLevelPositiveReadiness:'C independently matched five actual map targets/canonical hashes, two Native pin lists872/44 formal structure and frozen16/11 operation projection against current Native spec. C did not execute resolver, replay, constructors or negatives.',
    nested872Or44SourcePayloadsNotCertifiedByReplay:true,pureNegativeDefinitions:{index:14,rootReadAndExit:8},
    requiredActual:'Positive before/after exact five removals, typed negatives and owned link/directory labs, actual module calls/output hashes, full old canonical/map/23 legacy original preservation and absence/no mirror checks.',
    literalAccounting:{legacyPayloadConsumerFiles:23,newLogicalIdentityRegistryFiles:1,totalLiteralSourceFiles:24,newRegistry:'tools/rust-r3m/e1-registry01.mjs',classification:'Logical pin metadata, no direct alias payload read; do not claim total literal search still23.'},
    aliasesAtThisInspection:aliasState,E1ExitCertified:false,owner:'Root /root',originalDeadline:'2026-11-09',deadlineExtended:false,exitRequiredBeforeCurrentG3:true
  },
  evidenceGuardRequirements:[sourceOnlyRisk],
  diagnostic:{report:pin(diagnosticFile),completed:true,groups:7,HTTP:24,artifact:diagnostic.runtime.artifactSha256,classification:'Actual pre-fix diagnostic only, not repaired candidate or stage acceptance.',sixBusinessDefectObservationsAndSourceDerivedDateAPIRejection:true,CustomerNoopBusinessVersionPlusOneAndAuditZeroIndependentlyRead:true,twoCASRaces200And500IndependentlyRead:true,dateOnlyCase:'Actual API400 plus source deduction; not an old filled-date browser run.',partialOriginals:partials,partial01And02NotPassedOrStageCounts:true,noPrivateRawStreamsRead:true},
  stillRequiredForG3:['Root final formatted integrated source/artifact and required fmt/clippy/unit/release/admin validation.','Guarded complete-scope actual acceptance adapter and explicit missing/empty graph rejection proof.','Post-fix regression of all seven defects plus controlled affected locks/late faults/recovery and full M0–M5 on the final candidate.','E1 actual replay/delete/replay and strict negatives; remaining16UI cells/source-contract/client/migration integrity.','Full owned graph/seed/privileges/logging restoration, second zero-change cleanup and owned environment terminal.'],
  noProductAuthorRootExecutorOrGovernanceWriting:true,noAuthorDefinitionsOrRootToolsImportedExecutedOrModified:true,noInstallBuildTestDBHTTPPGBrowserServiceOrWSLExecution:true,noPrivateRead:true,noGitMutationOrExternalWrite:true,onlyOwnCReviewArtifactsWritten:true,
  ownStaticVerifier:pin(C+'/g2-write-source-preaudit01.mjs')
};
const out=C+'/g2-source-preaudit01.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const md=C+'/g2-source-preaudit01.md';fs.writeFileSync(md,'# R3 收口 G2 增量源码独审 01\n\n已核 A3、B4、D6 SourceReady 原始哈希及 Root 集成回执，Root 产品9文件=7 Rust+2 UI；其余1371保护输入原字节相同。审查截至这些源pin，不是最终格式化产物或G3/G4。未发现新增产品P1/P2。\n\nA单次评分tuple、历史匹配/同TXfallback和Lead先锁顺序，以及即时有效评分修复，在源码层符合已冻结方向；B CAS0/真正SQL错误分流、跨actor/UUID同值no-op和组织名身份投影保留原TX和公开合同。Root日期仅两UI文件，真实16旅程尚待最终候选。D严格canonical/hash工具只读且无自运行，23旧消费者+1新logical registry=24字面源文件须如实分列；实际重放/删除尚未认证。\n\n验收防空洞 C-G2-ORACLE-01：A裸rollback helper可让缺失或空图相等通过。Root已接受在actual adapter前校验非空完整图、必需表数组及目标Lead/override行；该实现和负例证明仍待G3核验，不能只凭裸helper的true认证回滚。\n\nphase03是旧66db二进制的7组24HTTP未修诊断，01/02仍partial；日期仅API400与源码证据，非旧浏览器实跑。最终修复、并发、后段必要写失败、E1退出、16UI与全终态仍须实际验收。G3Certified=false、G4Certified=false、commitAllowed=false；85/57保持Open。\n',{flag:'wx'});
console.log(JSON.stringify({report:pin(out),Markdown:pin(md),productP1:0,productP2:0,evidenceGuardPending:1,G3Certified:false,G4Certified:false}));
