// C-owned review output only. No product, author or Root module is imported/executed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const C='tmp/rust-r3hijk/c-review',A='docs/design/archive/slices/rust-r3cdefg';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f)),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const auditFile=C+'/g1-input-byte-prereview01.json',audit=read(auditFile);assert.equal(pin(auditFile).rawBytesSha256,'17f88177b3443d04c3f8a565c0f7e9edf727409cde67eab583f82b75c40c77fa');
const map=read(A+'/archive-origin-map.json'),createdAt=new Date().toISOString(),reviewer={agent:'/root/r3_next16_review',role:'Sole independent non-author C',method:'Public source/JSON/exact hashes/read-only Git; own static validator only',modelTarget:'gpt-6.1-sol/max',Fast:'unverified'};
const e1={
 kind:'R3HIJK-current-G1-triggered-R3CDEFG-E1-independent-rereview',createdAt,reviewer,base:audit.base,
 decision:'Conditionally-approved-continuation',E1Approved:true,approvalNewForThisReview:true,priorApprovalNotSilentlyInherited:true,
 reviewTrigger:'The newly authorized R3HIJK G1 preparation is the next-G1 review required by the original R3CDEFG E1.',
 exactScope:{files:audit.E1.files,regularFiles:5,totalBytes:419264,onlyTheseFiveActiveFiles:true,noSymlinks:true,activeArchiveAndBaseGitBytesExact:true},
 owner:'Root /root',approver:'Independent non-author C /root/r3_next16_review',
 deadline:{originalCalendarDeadline:'2026-11-09',calendarDeadlineExtended:false,reviewAgain:'Next subsequent R3 G1 or 2026-11-09, whichever is earlier',currentG1TriggerSatisfiedByThisReview:true},
 exitCondition:map.compatibility.exitCondition,
 exitConditionSatisfied:false,
 evidenceOfContinuedNeed:{
  directLiteralConsumers:audit.E1.directLiteralConsumerCount,
  sourceFilesScanned:audit.E1.sourceFilesScanned,
  fullConsumerPinsAndLineReferences:{file:auditFile,section:'E1.consumers'},
  examples:[
   {tool:'tools/rust-r3cdefg/semantics01.mjs',purpose:'Imports both pure fixture builders; reads the frozen G1 Native source guard and frozen preflight manifest at active paths.'},
   {tool:'tools/rust-r3cdefg/coverage.mjs',purpose:'Imports both pure fixture builders and reads frozen Native guard manifest.'},
   {tool:'tools/rust-r3cdefg/environment.mjs',purpose:'Reads frozen Native source admission manifest.'},
   {tool:'tools/rust-r3cdefg/attest-rust.mjs',purpose:'Reads original operation inventory for retained-candidate attestation; original runtime/artifact prerequisites still apply.'}
  ],
  conclusion:'Supported replay/import/guard readers still contain direct active-path accesses without the archive resolver. Removing the five files now would break those paths. The existing resolver alone does not meet the migration exit condition.',
  staticDetectionLimits:'Direct literal scan is a demonstrated lower bound, not a complete call-graph or successful replay claim. Historical assembler/publisher/freeze recipes remain outside unchanged-command guarantees.'
 },
 conditions:[
  'Keep exactly these five regular byte-identical files and their archived originals; no lifecycle Markdown, bulk raw evidence or extra alias copies.',
  'Keep the existing Root owner and original 2026-11-09 calendar deadline. This review does not approve any date extension.',
  'Do not rewrite old frozen manifests, source pins, historic labels or authority records to adopt new paths or this decision.',
  'When all identified supported replay consumers use archive-aware resolution and exact-hash verification, verify the exit and remove only the five active aliases.',
  'A consumer migration, scope increase, hash change or proposed date extension needs explicit fresh review; this continuation authorizes none of them.',
  'No broad rewrite of the old tool namespace is required as a condition of this current bounded 28-operation G1 preparation.'
 ],
 existingLimitsRetained:['No inherited R3AB approval','No guarantee all historic command recipes replay unchanged','No product/HTTP/DB/browser/runtime acceptance from static inspection','Own/older private and PG17 not accessed'],
 authorityPins:{originalPreflight:audit.E1.priorAuthority,previousActualG4:audit.E1.priorActualG4,originMap:audit.E1.originMap,currentIndependentByteAudit:pin(auditFile),archiveResolver:pin('tools/rust-r3cdefg/archive-paths.mjs')},
 G1Certified:false,G2Authorized:false,G3Certified:false,G4Certified:false,
 noProductOrEnvironmentExecution:true,noPrivateRead:true,noGitHubWrite:true
};
const e1File=C+'/e1-compatibility-rereview01.json';fs.writeFileSync(e1File,JSON.stringify(e1,null,2)+'\n',{flag:'wx'});
const preliminary={
 kind:'R3HIJK-independent-G1-static-prereview-A-D-and-E1',createdAt,reviewer,base:audit.base,branch:audit.branch,
 decision:'Needs-correction-before-joint-G1',formalJointG1Decision:false,G1Certified:false,G2Authorized:false,G3Certified:false,G4Certified:false,
 scope:{operations:28,groups:{H:14,I:10,J:2,K:2},currentDelivered:30,totalR3:58,parentsRemainOpen:[85,57],publicHttpCouldReach58OnlyAfterActualScopedG4:true,fullR3StageNonHttpApprovalAcceptanceSeparate:true},
 exactInputs:{byteAudit:pin(auditFile),catalog:audit.catalog,preflight:audit.preflight,sourceGroups:audit.sourceGroups,AReceipt:audit.AArtifactReceipt,definitionCounts:audit.authorDefinitionCounts,authorTextAndMatrixPins:audit.inputs},
 routeForecast:{...audit.operationCounts,meaning:'Static union of the full prior 145-operation runtime OpenAPI and 28 disjoint aligned operations. No runtime was launched or attested.'},
 findings:[{
  id:'G1-P2-01',priority:'P2',classification:'unsettled-input-contradiction',
  title:'A and D give incompatible astral-character length rules for source Zod string bounds',
  locations:[{file:'tmp/rust-r3hijk/a-input/input-review.txt',line:34,claim:'Zod4.6.1 min/max count codepoints; JS demand/audit lengths count UTF16.'},{file:'tmp/rust-r3hijk/d-input/input-review.txt',line:38,claim:'Discussion body trim().min(1).max(8000) counts UTF16 units.'},{file:'tmp/rust-r3hijk/d-input/shared-dependency-interface-draft01.json',field:'textAndDate.body',claim:'JS trim and UTF-16 1..8000.'},{file:'tmp/rust-r3hijk/d-input/acceptance-matrix.json',case:'J-U01',claim:'4001 astral emoji fail the max8000 source bound.'}],
  consequence:'A scalar-count implementation and a UTF16-unit implementation disagree at 4001 emoji, so both cannot be frozen as the same original Zod string check.',
  existingRustEvidence:{file:'apps/poms-api-rust/src/project_technical_cost/validation.rs',line:162,meaning:'decode_utf16(...).count() shows existing Rust codepoint counting only; it is not new Native evidence.'},
  requiredCorrection:'Preserve these original candidate bytes. Use Root original installed Zod schema and actual J HTTP/PG at 8000/8001 BMP,4000/4001/8000/8001 astral and trim/lone-surrogate controls; add corrected numbered author input with the measured source rule before joint G1. Keep business JS demand.length/audit.length as a separate UTF16 rule.',
  status:'Reported to Root; Root acknowledged fresh source-schema and Native HTTP/PG witnesses plus numbered D02 correction. Not yet certified by C.'
 }],
 highValueNativeWitnessesRequiredBeforeSemanticFreeze:[
  {id:'H-number-convert-managed-flush',source:['lead.service.ts:110-143,340-391','attachment.service.ts:862-924'],focus:'Actual physical transactions for lead/project number allocation; conversion with eligible real attachments; query/audit-triggered managed-graph flush order; failures at attachment audit, score snapshot and final flush; exact Lead/Project/link/audit/session/number residuals. Passing em is not proof of connection/commit scope.'},
  {id:'H-snapshots-and-effective-score',source:['lead-score.service.ts:94-240,282-367','lead.service.ts:293-331,541-569'],focus:'Approved→superseded plus new approval under original partial uniques; no-em snapshots after claim/assign/qualify/close; post-transaction override audit failures; JSON.stringify de-dup after JSONB reload; command summary system-effective versus read manual-effective. Capture SQL, actual errors and before/after independently of expected definitions.'},
  {id:'H-I-J-real-producer-chain',source:['lead-score-facts.service.ts','sales-intelligence.service.ts:requireOpportunityContext','business-discussion.service.ts'],focus:'Real H create→I stakeholder/competitor/discovery→changed H refresh→qualify→convert→J history aggregation; raw/canonical UUID string comparisons, both or nullable anchors, inactive existing contact, voided followup. Prepared rows may isolate invalid/timestamp cases but cannot prove domain producer delivery.'},
  {id:'J-first-thread-and-text',source:['business-discussion.repository.ts:110-117','business-discussion.service.ts:37-83'],focus:'Concurrent first-thread unique outcome and rollback graph without invented upsert/409; lone UTF16 immediate POST versus stored/re-read text; NUL database rejection; raw errors separate from SQL log. Resolve G1-P2-01 before freezing body length.'},
  {id:'K-exact-read-projections',source:['project-query.service.ts:51-187,590-748,1342-1674','project.repository.ts:171-261'],focus:'Raw malformed path errors for both K routes; snapshot selectors/exportPolicy; closed versus completed and permission some/every combinations; earliest signed contract and other exact lifecycle selectors with microseconds before Date formatting. Completely equal source sort keys remain explicitly undefined; R4 facts are prepared query projections only.'}
 ],
 minimalSharedInterfaceConclusions:[
  'A/I/J LeadRef id/customer_id/lead_name by_id and by_ids is sufficient; lookup only, raw path reaches original PG semantics, no active/status/owner/lock/new TX.',
  'I→H collect_lead_score_facts must use caller connection and exact seven booleans, lead-only predicate, original discovery updated_at-only selection. Do not reuse public OR-anchor lists or add H score refresh to I writes.',
  'I→J CompetitorRef id/customer_id/nullable lead_id/project_id is sufficient; D applies original nullable checks, not sourceLead equivalence or lifecycle filters.',
  'Root must freeze precise Service/error/Wire/session signatures and attachment-copy managed-graph/number/snapshot bridges after Native witnesses; all http.rs/Cargo/lib/shared older modules remain Root-owned.',
  'Retain source text in dynamic errors/JSON where Native retains raw UTF16; do not silently pass to lossy String during preflight or reuse a stricter active-only existing helper.'
 ],
 remainingGatePrerequisites:['Complete B source manifest/matrix/fixture package and independent source check','Root structured Native semantic witnesses and raw SQL/error/PG originals','Final Root shared-interface and ownership package','Final master/manifest with immutable author originals and explicit mutable-governance origin handling','Current G0 native subissue/parent readback and later same-byte online G1 freeze'],
 E1Review:{...pin(e1File),decision:e1.decision,E1Approved:true,files:5,totalBytes:419264,exitConditionSatisfied:false,calendarDeadline:'2026-11-09',deadlineExtended:false},
 noProductBuildTestFmtLintDbHttpBrowserHostOrPrivateExecution:true,noAuthorRootToolExecution:true,noGitHubWrite:true,
 conclusion:'Static A/D admission and route arithmetic pass exact-byte checks. One specific length-rule contradiction and the explicitly pending semantic/package prerequisites prevent any joint G1 signature or G2 start. Separate E1 continuation is approved only within its unchanged five-file/deadline boundary.'
};
const reviewFile=C+'/g1-static-prereview01.json';fs.writeFileSync(reviewFile,JSON.stringify(preliminary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({E1:pin(e1File),E1Approved:true,prereview:pin(reviewFile),decision:preliminary.decision,G1Certified:false,G2Authorized:false}));
