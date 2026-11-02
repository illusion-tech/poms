// C independent preflight authority for the exact proposed seven-Issue plan.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const out='tmp/rust-r3cdefg/c-review/g4-closeout-preflight01.json';assert(!fs.existsSync(out));
const hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f)),pin=f=>{assert(!f.replaceAll('\\','/').includes('/private/'));const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:hash(b)}};
const dir='docs/design/archive/slices/rust-r3cdefg',gov=dir+'/evidence/governance/',planFile=gov+'g4-closeout-plan01.json',plan=read(planFile),auditFile='tmp/rust-r3cdefg/c-review/g4-closeout-byte-plan-audit01.json',audit=read(auditFile);
assert.equal(pin(planFile).rawBytesSha256,'5c7bf3b4bf2254f933064777001bdc24b84001d9737ced1f32b7077ec4299e56');assert.equal(audit.plan.rawBytesSha256,pin(planFile).rawBytesSha256);assert.equal(audit.archivedOriginals.records,668);assert.equal(audit.compatibility.files.length,5);assert.equal(audit.compatibility.totalBytes,419264);
const beforeMapFile=gov+'precloseout-live-status-origin-map01.json',beforeMap=read(beforeMapFile);assert.equal(beforeMap.records.length,2);assert(beforeMap.mutableCurrentStatusWillAdvanceOnlyAfterIndependentAuthorityAndActualOnlineReadback);
for(const r of beforeMap.records){const a=pin(r.source),b=pin(r.snapshot);assert.equal(a.bytes,r.bytes);assert.equal(b.bytes,r.bytes);assert.equal(a.rawBytesSha256,r.rawBytesSha256);assert.equal(b.rawBytesSha256,r.rawBytesSha256)}
const scanFile=gov+'public-credential-scan03.json',scan=read(scanFile);assert(scan.pass);assert.equal(scan.actualPrivateCredentialAndCookieVariantsChecked,158);assert.equal(scan.credentialValuesOrHashesPublished,false);assert.equal(scan.files.length,777);for(const p of scan.files){const a=pin(p.file);assert.equal(a.bytes,p.bytes);assert.equal(a.rawBytesSha256,p.rawBytesSha256)}
const smokeFile=gov+'same-path-builder-import01.json',smoke=read(smokeFile);assert.equal(smoke.exitCode,0);assert.equal(smoke.productRuntimeNetworkDBBrowser,false);for(const p of[smoke.stdout,smoke.stderr]){const a=pin(p.file);assert.equal(a.bytes,p.bytes);assert.equal(a.rawBytesSha256,p.rawBytesSha256)}const stdout=JSON.parse(fs.readFileSync(smoke.stdout.file,'utf8'));assert(stdout.passed);assert.equal(stdout.samePathPureBuilderImports,2);assert.equal(stdout.productRuntimeOrNetwork,false);
const receipt={
 kind:'R3CDEFG-independent-G4-closeout-preflight',
 createdAt:new Date().toISOString(),
 reviewer:{role:'C independent non-author',task:'/root/r3_next16_review'},
 decision:'Pass',
 approvalType:'Concrete closeout-plan authorization; actual online G4 execution and independent final review remain pending',
 approvedPlan:pin(planFile),
 implementation:'fbc5ca10bb232519034437f8ef7406f145cfe34a',
 archiveMainCommit:'4947c1a4f5c12a89734dccdf8ae781f0e708fe3e',
 artifact:{rawBytesSha256:'c042513c98182fcf9e70a72cd71fd0b5231bc785fac86dac3ffd7b93d852c128',bytes:40997296},
 allowCloseIssues:[88,89,90,91,92],
 keepOpen:[85,57],
 allowOnlyExactPlanMutations:true,
 E1Approved:true,
 G4Certified:false,
 actualG4ReviewRequired:true,
 findingCounts:{P0:0,P1:0,P2:0,P3:0},findings:[],
 scope:{operations:16,perSlice:{R3C:3,R3D:3,R3E:3,R3F:4,R3G:3},trueFollowUpTodoProducer:true,deliveredBeforeExecution:14,deliveredAfterSuccessfulAllFiveOwnG4:30,totalR3:58,remainingAfterBatch:28,fullR3GateComplete:false,fullNonHTTPApprovalStageOrFutureLeadDelivery:false,NativeGovernance61_82_83_84NotCountedTwice:true},
 prerequisitesAlreadyVerified:{
  implementationAndMain:'Independent G3 review02 and exact fixed commit review01 passed; fbc implementation fast-forward/main push verified, then4947 metadata archive commit is its child and current branch/primary/remote main.',
  sourceAndRaw:'All203 product sources remain09/c042 bytes; no product changes in4947. All668 archived originals including7 top MDs verified as regular exact files in working tree and4947 Git blobs. All original fbc lifecycle/raw paths covered;578 map sources match fbc original blobs,90 additional original metadata/online records first preserved in4947 retain their recorded hashes.',
  frozenClosure:{G1Formal:44,Native:872,G3Inputs:740,postMainRust:203,allExactAfterReadOnlyLogicalResolution:true,historicalG3InventoryRetainedAsExactSnapshot:true},
  fiveAliases:{count:5,bytes:419264,regularNotSymlink:true,activeAndArchiveBytesExactlyEqual:true,noLifecycleMDOrBulkEvidenceMirror:true,activeDirectoryContainsOnlyThoseFiveFiles:true},
  resolver:'C read archive-paths.mjs and verify-archive.mjs and independently reproduced the hash/path resolution. Resolver does not rewrite frozen pin objects; exact historical path+SHA chooses moved original or immutable snapshot, including old inventory bytes.',
  RootCommands:'All actual archive-ready metadata command exit codes/output pins and22 copied durable records checked; main integration proof740/no reconciliation/clean verified. These are metadata checks, not new runtime passes.',
  beforeState:'Fresh independent GitHub reads show all7 issues OPEN; each exact Node ID is bound through original before GraphQL, and all7 live body SHA values match approved plan beforeBodySha256.',
  prospectiveState:'Five children each have six checked items, exact G4 comment and CLOSED; parents remain OPEN with30/58, remaining28 and incomplete full R3/stage/nonHTTP. No independent actual-G4-final Pass is falsely claimed.',
  currentStatus:'G4Ready/G4false/implementation fbc before actions; old current delivery-status and operation-inventory bytes saved with exact origin map before eventual Done writeback.',
  resourceEvidence:'Already-signed same source/runtime evidence remains:235passed/54ignored,45 semantic groups,1691 fixed events+14 UTF16 probes, exact PG/SQL/real public Todo and9 runtimes closed. Existing898 UI remains bound toec under the approved two-file source-causal boundary, not relabelled as c042 execution.',
  preservation:'1069 current public namespace files/85271774B verified equal in primary ignored preservation; no different bytes overwritten. Own private/retained stopped PG15 volume remain in place, no old private/PG17 touched.',
  credentialScan:{actualRootPublicFiles:777,actualPrivateCredentialCookieVariants:158,hits:0,credentialValuesOrHashesPublished:false,scope:'C read original result and independently hashed its777 public file pins, never read private needles.'},
  pureBuilderImport:{actualRootImports:2,defaultAssertions:true,exitCode:0,productNetworkDBBrowser:false,scope:'C read actual stdout/stderr and source. This is compatibility import evidence, not endpoint product acceptance.'}
 },
 E1:{
  approval:'New explicit approval for this batch only; not inherited from R3AB',
  id:'E1',
  files:plan.compatibilityException.files,
  totalBytes:419264,
  owner:'Root /root',
  approver:'Independent C via this preflight01',
  reviewDue:'Next R3 G1 or2026-11-09, whichever is earlier',
  exitCondition:plan.compatibilityException.exitCondition,
  qualification:plan.compatibilityException.qualification,
  approvedScope:'Only these five regular same-byte machine-input aliases. Normal replay/attestation needs the five old logical entry paths; Native pins have no moved logical paths and pure-builder same-path import was actually checked. Completed lifecycle MD and bulk raw evidence stay archived; no507-file tree mirror.',
  effectiveness:'Effective for normal replay only after Root publishes this exact approval alongside approved plan and4947 main proof before Issue mutations. Do not rewrite frozen originals or broaden aliases.',
  reviewAndExit:'At the earlier trigger, inventory all identified consumers; after archive-aware resolution and exact-hash replay confirmation, remove only the five active aliases. Any broader retention or changed scope requires a new explicit review.'
 },
 approvedIssueMutations:audit.planBeforeAndAfterMutations,
 executionConditions:[
  'Publish the exact38388B plan SHA5c7bf3b4bf2254f933064777001bdc24b84001d9737ced1f32b7077ec4299e56, this original signature and4947 main proof as metadata-only main successor; preserve203 product and all frozen/raw bytes. Confirm main publication before first online closure.',
  'Apply only the seven approved issue mutations. Recheck before body/state; on idempotent resume accept only the exact approved after-body/state and recorded comment. Do not silently overwrite divergent user edits or duplicate a successful comment.',
  'Close only88/89/90/91/92; keep85/57 Open. Treat30/58 as completed only after all five own G4 closures/readbacks succeed; full R3 and future28/stage remain incomplete.',
  'Preserve partial/failed/ambiguous API replies and complete readbacks. Do not report all five closed or final G4 on a partial run. Current local status/inventory/indices become Done/30 only on actual approved online readback, with their precloseout originals retained.',
  'After execution preserve actual issue IDs/bodies/comments/states, current local/main metadata, source203 and frozen/archive closure proof, metadata commit/push/FF and incremental public preservation including this signature and later receipts.',
  'Return actual executed results for independent actual G4 final review. This preflight does not itself certify that execution, any parent/full-stage G4, deployment or performance.'
 ],
 retainedLimits:'Existing IP/schema/TZ/quarantine/54ignored and historical uncertified46 missing binary retain original labels. Old assembler/publisher/freeze recipes and exact attributes prerequisites are not promised unchanged replay. Nothing here converts source-only/prepared/impossible/static219 groups into all-runtime Pass.',
 evidencePins:[
  pin(auditFile),pin('tmp/rust-r3cdefg/c-review/g4-preflight-live-issues01.json'),pin(dir+'/archive-origin-map.json'),pin(dir+'/main-integration-proof01.json'),
  pin('tmp/rust-r3cdefg/c-review/g3-independent-review02.json'),pin('tmp/rust-r3cdefg/c-review/fixed-commit-review01.json'),
  pin(beforeMapFile),...beforeMap.records.map(r=>pin(r.snapshot)),pin(scanFile),pin(smokeFile),pin(smoke.stdout.file),pin(smoke.stderr.file),
  pin(gov+'archive-ready-copy-map01.json'),pin(gov+'metadata-action-source.mjs'),pin('tmp/rust-r3cdefg/root/public-preservation01.json'),
  pin('tools/rust-r3cdefg/archive-paths.mjs'),pin('tools/rust-r3cdefg/verify-archive.mjs'),pin('tools/rust-r3ab/inventory.mjs')
 ],
 noIndependentProductOrHostExecution:true,
 noPrivateRead:true,
 noOnlineMutationByC:true,
 noActualG4FinalSignedYet:true
};
fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:pin(out),decision:'Pass',allowCloseIssues:receipt.allowCloseIssues,keepOpen:receipt.keepOpen,E1Approved:true,G4Certified:false,actualG4ReviewRequired:true}));
