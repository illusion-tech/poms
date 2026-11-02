// C non-author Gate record. No product or author tool invocation.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3cdefg-next16/poms');
const output='tmp/rust-r3cdefg/c-review/g3-independent-review01.json';assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}},read=f=>JSON.parse(fs.readFileSync(f));
const mf='docs/design/rust-r3cdefg/g3-candidate-manifest02.json',mp=pin(mf);assert.equal(mp.rawBytesSha256,'0edc75c5b825f496668e7db99276a827b9fece64c060ed8d8a9a34cc9f9e37d9');
const staticFile='tmp/rust-r3cdefg/c-review/g3-static-input-check01.json',sf=read(staticFile),semFile='tmp/rust-r3cdefg/c-review/g3-semantic-deep-compare01.json',sem=read(semFile),obsFile='tmp/rust-r3cdefg/c-review/g3-semantic-observer-review01.json',obs=read(obsFile),covFile='tmp/rust-r3cdefg/c-review/g3-coverage-winner-scope01.json',cov=read(covFile),addFile='tmp/rust-r3cdefg/c-review/g3-additional-bodies02.json',add=read(addFile),uiFile='tmp/rust-r3cdefg/c-review/g3-ui-terminal-and-exceptions01.json',ui=read(uiFile),numericFile='tmp/rust-r3cdefg/c-review/g3-numeric-parent-identity01.json',numeric=read(numericFile),familyFile='tmp/rust-r3cdefg/c-review/g3-dynamic-error-family-audit01.json',family=read(familyFile);
assert(sf.checks.every(c=>c.mismatches.length===0));assert.equal(sf.originMapping.mismatches.length,0);assert.equal(sf.CodeAfter07Index.mismatches.length,0);assert.equal(sf.manifestIndexRawDifferences.length,0);
assert.equal(sem.invariantFailures.length,0);assert.equal(obs.failures.length,0);assert.equal(cov.differenceCount,0);assert.equal(add.differenceCount,0);assert.equal(add.fixedPGDateDifferences,0);assert.equal(ui.UIHTTP,898);assert.equal(numeric.itemRows,8);assert.equal(family.totals.unsafeSites,1);
const unsafe=family.sites.find(s=>s.classification.startsWith('P2-'));
const finding={
 id:'G3-C-UTF16-ERROR-ECHO-01',priority:'P2',classification:'new-real-drift',
 title:'Cost currency mismatch converts legal original UTF16 to replacement characters before the400 response',
 Rust:{file:unsafe.file,line:unsafe.line,expression:unsafe.expression,transport:{file:'apps/poms-api-rust/src/project_technical_cost/http.rs',line:175,path:'Error::BadRequest(String) -> ApiError::message(StatusCode::BAD_REQUEST, message)'}},
 Native:{file:'apps/poms-api/src/app/features/project/project.service.ts',line:662,expression:'throw new BadRequestException(\u0060costItems[\u0024{index}].currencyCode must equal package currencyCode \u0024{input.currencyCode}\u0060);'},
 inputAuthority:{file:'libs/shared/contracts/src/lib/shared-contracts.ts',lines:'4661;4676',rule:'z.string().trim().min(3).max(16), no ASCII or Unicode-scalar restriction'},
 reproducer:{operation:'POST /api/projects/{freshEligibleProjectId}/technical-cost-packages',setup:'Valid Cookie/CSRF/project:write, actual eligible project, otherwise original buildCostRequest valid body',override:{currencyCode:'A\ud800B'},costItemsCurrencyCode:'CNY',controls:family.sourceDerivedVectors,stage:'currency mismatch preflight before parent/children INSERT'},
 impact:'Both sides can return400 while message code units differ. Original Node template/JSON keeps isolated U+D800/U+DC00; current Rust to_utf8_lossy replaces them with U+FFFD. Successful POST raw field overrides and later PG replacement cannot repair this already-lossy error message.',
 evidenceLevel:'Source-proved deterministic error construction discrepancy. C has not executed Native/Rust or run a mock product test. Root has accepted the finding and is opening a fresh raw-errors01 cohort for actual high/low/astral witness.',
 requiredCorrection:'Keep the validated raw currency JsString while constructing and emitting this module400 message, with a narrow error/Wire path. Preserve original DTO acceptance, guard/error order, envelope/status and zero business writes. Do not reject surrogates or globally normalize Unicode.',
 requiredVerification:'Root actual Native/current-candidate high+low surrogate and ordinary astral controls; strict raw JSON/body message code units. Then current fixed source/build/candidate binding and appropriate regression/terminal evidence, followed by a new independent G3 candidate review.',
 familyScope:'51 constructor/transport sites and34 dynamic interpolation sites across all five new modules inspected; one unconstrained raw UTF16 source. F DictionaryCode path is separately constrained ASCII, not another confirmed defect.',
};
const report={
 kind:'R3CDEFG-formal-independent-G3-review',
 createdAt:new Date().toISOString(),
 reviewer:{role:'C independent non-author',task:'/root/r3_next16_review',productAuthor:false},
 decision:'Needs-correction',
 Gate:'G3 only',
 candidateManifest:mp,
 previousCandidateOriginal:'docs/design/rust-r3cdefg/g3-candidate-manifest01.json remains preserved',
 candidate:{artifactSha256:'ec988ffcecebbe40c89dc7551304d7ae66634ef1fc9cabed7d948a09e7f82c78',bytes:40997208,source:'CodeAfter07',paths:116,operations:145,schemas:585,base:'0fced204c917a37b84a2ad50838e722e764b8f78',branch:'codex/poms-r3cdefg-next16'},
 scope:{issues:[88,89,90,91,92],operations:16,operationCounts:{R3C:3,R3D:3,R3E:3,R3F:4,R3G:3},deliveredBeforeOwnG4:'14/58',possibleAfterOwnG4:'30/58',remainingAfterBatch:28,parent85MustStayOpen:true,overall57MustStayOpen:true,fullR3OrNonHTTPOrStageCertified:false},
 findingCounts:{P0:0,P1:0,P2:1,P3:0},
 findings:[finding],
 decisionReason:'The1691 recorded request/body samples,45 semantic groups,12 UI runs and terminal evidence are credible in their actual scope, but do not include this legal raw-UTF16 currency error echo. A known new implementation mismatch prevents commit/push authorization under this candidate. Earlier provisional no-blocker commentary was withdrawn before any Pass was signed.',
 permissions:{allowScopedCommit:false,allowPush:false,allowFixedCommitApproval:false,allowPrimaryFFOrMainPush:false,allowIssueClosure:false,allowG4:false,requiresNewCandidateAndIndependentG3:true},
 acceptedEvidenceInItsRecordedScope:{
  inputIntegrity:{inputs560:0,Native872:0,G1Formal44:0,CodeAfter203:0,originMappings279:0,sourceAndManifestIndexRawDifferences:0,note:'Counts here are mismatch counts; originals and checks are bound in the static receipt. All product/input files present in Git index;449 staged files, no unstaged product changes at inspection.'},
  currentCodeBinding:'Current release07 and runtime04 artifact ec988ff/source203 re-read; prior03 certification was not reused.',
  core45:{cases:45,relations:sem.invariantChecks.length,observerRelations:obs.checks.length,relationFailures:0,recordedBusinessBodyOrPGDifferences:0,sessionGroups:16,rawSessionIPDifferencesRetained:32,rawSecurityIPDifferencesRetained:16,transactionsPerBackend:79,openTransactions:0,concurrentGroups:4,concurrentInvariant:'2waiters; one successful participant and one500; one target business COMMIT/oneROLLBACK; actual winner->PG->unique audit',actualErrorsPerBackend:17,SQLSTATE:'unrecorded, not fabricated'},
  eventBodies:{coverage1124:0,edges129:0,boundaries171:0,business183:0,temporal84:0,totalEvents1691:0,countsAre:'Independent full status/route/label/body difference counts. Coverage additionally compares request objects. Fixed input dates/money/errors/states retain exact values.',fixedPGDateTextChecks:21,fixedPGDateDifferences:0},
  numeric:{explicitNumericTextRowsPerBackend:19,differences:0,costItemRowsLinkedToKnownActualParentAndSortOrder:8,note:'Eight item values now joined through full raw owned snapshot parent IDs and compared with numeric::text, strengthening the earlier anonymous tuple-only check.'},
  priorFiveCorrections:{arrayErrorAccumulation:'Current129/1124 preserves accumulated Zod and coercion/origin/order cases',wideVersion:'C/G NewRow<i64> with original DBRow<i32>; actual2147483647 then500 old parent/children unchanged',unknownFHTML404:'Current original global not_found path and complete-router Native oracle regression; actual boundary/probe originals retained',year0000:'Current B/F/G request dates text-cast at original SQL position; all three500, fixed legal precision exact, final owned PG F/G/Todo residue0',voidSQLOrder:'Current no-new-row branch Todo UPDATE -> managed session UPDATE -> F CAS; independent current45 SQL confirms'},
  UI:{reports:12,platformBackendCells:4,mainObservationsEach:85,adminObservationsEach:44,readonlyObservationsEach:22,totalHTTP:898,allCompletedPassAndClosed:true,scope:'Original customer/contact/followup and C/D/G journeys; project F/stale409/no-insert/emptycost/read-only/Todo click supplement. Four cells are not the Cookie/Bearer dimension.'},
  realTodoConsumption:{backends:2,targetTypes:['customer','lead','project'],actualFProducerAndPGToPublicTodoRelations:6,LeadBoundary:'Lead context is a legal read fact; not Lead14 producer/detail/full-stage delivery'},
  contract:{NativePaths:237,NativeOperations:291,NativeSchemas:585,NativeClientFiles:579,RustPaths:116,RustOperations:145,RustSchemas:585,allSchemasExactlyEqual:true,allNew16OperationDefinitionsExactlyEqual:true},
  resourceTerminals:{NativeRemovedRows:2244,RustRemovedRows:1468,seedTablesPerDB:107,rawSeedRowsExact:true,privilegesPerDB:428,allOwnedRuntimesAndBrowsersStopped:true,ownedPortsFree:true,PG15StoppedVolumePrivateRetained:true,oldPG17AndOldPrivateUntouched:true,scope:'Read Root actual public receipts and source assertions; C did not run host or DB checks'},
  checks:{Rust07:['fmt0','check0','clippy-Dwarnings0','test0','release0'],testsPassed:233,testsIgnored:54,ignoredAreNotCertifiedPGTests:true,NativeLintApiUnitAdminBuild:'actual0',AdminUnit:'originalJST1 retained; actualUTC0'},
 },
 exceptionsAndLimits:[
  {scope:'E1 client frozen validation location',disposition:'Evidence sufficient for stated scope; original active CLI exit1 retained, original six guards unchanged; actual equivalent frozen checkout0 with current five raw inputs/579 outputs and585 matching path attributes. No global client guard waiver.'},
  {scope:'Existing loopback peer IP',classification:'existing-baseline-drift',disposition:'Retain all48 actual strings and source archived R3AB/current peer receipt; no IP normalization.'},
  {scope:'Schema/TZ/ignored',disposition:'MigrationCheck1/dump0 classified168 existing CHECK/comment/QA marker withoutDDL; original timezone failure and54ignored keep their labels.'},
  {scope:'Three failed DML execute-log visibility differences',disposition:'Actual ERROR/rollback/residuals agree; retain absent execute lines, do not fabricate SQL or an unproven Bind-phase explanation.'},
  {scope:'Earliest46 uncertified binary not retained',disposition:'Explicit historical evidence-availability limitation retained; hash/logs/HTTP/PG survive, no replay claim. Current/ca128/134/e782/ec retained artifacts are separate.'},
  {scope:'219 static risk groups and prepared facts',disposition:'Not219 runtime passes/all permutations;1011 of1124 are DTO negatives; legitimate history/reference/Lead facts do not certify future producers or full stage.'},
 ],
 evidencePins:[
  ...[staticFile,semFile,obsFile,covFile,addFile,uiFile,numericFile,familyFile].map(pin),
  pin('docs/design/rust-r3cdefg-g3-checkpoint.md'),pin('docs/design/rust-r3cdefg-validation-boundaries.md'),pin('docs/design/rust-r3cdefg-corrective-checkpoint01.md'),
  pin('docs/design/rust-r3cdefg/g3-delivery-audit01.json'),pin('docs/design/rust-r3cdefg/final-source-and-validation-proof01.json'),pin('docs/design/rust-r3cdefg/g3-evidence-origin-map01.json'),
  pin('tmp/rust-r3cdefg/c-review/g3-online-issues01.json'),pin('tmp/rust-r3cdefg/c-review/g3-online-comments01.json')
 ],
 dynamicErrorFamilyAudit:{source:pin(familyFile),totalSites:51,dynamicSites:34,unsafeSites:1,FDictionarySourceRule:'Native shared-contracts.ts2396-2401 /^[a-z][a-z0-9-]*$/ after trim/min1/max64; Rustvalidation91-103 code-unit whitelist, errors checked beforeService; require_dictionary436-451 only receives acceptedASCII. Surrogate followUpType stays DTO400.',otherDynamicSources:'Validated ASCII UUIDs; original valid-UTF8 decoded path; loaded PG UTF8 stage/status/current-cost currency; fixed field labels/index; static enum diagnostics. No second unconstrained UTF16 BadRequest/NotFound interpolation found.'},
 online:{snapshot:'Live Issues57,85,88-92 allOpen; five original G1 comments bind master/manifest02/C02. Root Ready sync later partly updated88/89 and is recovering TLS for remaining records; no complete Ready readback is claimed here. This does not affect the independent P2 denial.',ReadyIsNotG3Pass:true},
 independentExecutionBoundary:'C only read public source/raw JSON/hash/index/GitHub; ran own static data validators. No product/DB/HTTP/browser/build/test/lint/private/host mutation, no commit/push or external message.',
 followup:'Root completes same-family actual high/low/astral witness, narrow raw error Wire correction and new frozen candidate evidence. Preserve this Needs-correction original and all candidate02 passed/partial/failure raw artifacts. New independent G3 must decide current fixed source; only after Pass may scoped commit/push and fixed-commit review proceed.',
 G1Changed:false,G3Certified:false,G4Certified:false
};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:pin(output),decision:report.decision,findingCounts:report.findingCounts,allowCommit:false,allowPush:false,G4:false}));
