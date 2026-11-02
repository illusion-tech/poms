import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3cdefg-next16/poms');
const output='tmp/rust-r3cdefg/c-review/g2-semantic-parity-review01.json';assert(!fs.existsSync(output));
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}},read=f=>JSON.parse(fs.readFileSync(f));
const af='tmp/rust-r3cdefg/c-review/g2-semantic-parity-analysis02.json',of='tmp/rust-r3cdefg/c-review/g2-semantic-observer-review02.json',cf='tmp/rust-r3cdefg/c-review/g2-coverage-winner-scope01.json';
const analysis=read(af),observer=read(of),coverage=read(cf),releaseFile='tmp/rust-r3cdefg/rust-candidate-parity03/release-proof01.json',release=read(releaseFile),ipFile='docs/design/archive/slices/rust-r3ab/evidence/ip-context-original.json',ip=read(ipFile);
assert.equal(analysis.caseCount,45);assert.equal(analysis.invariantFailures.length,0);assert.equal(observer.failures.length,0);assert.equal(coverage.differenceCount,0);
assert.equal(analysis.differences.length,32);assert(analysis.differences.every(x=>x.path.endsWith('.last_ip')&&x.native==='::ffff:127.0.0.1'&&x.rust==='127.0.0.1'));
assert.equal(observer.allPGDifferences.length,16);assert(observer.allPGDifferences.every(x=>/^security\.\d+\.ip$/.test(x.path)&&x.native==='::ffff:127.0.0.1'&&x.rust==='127.0.0.1'));
assert.equal(ip.classification,'existing-baseline-drift');assert.equal(ip.sameExplicitHeaderContextExact,true);
const tx=observer.SQL.map(x=>x.transactions),sqlShapeDifferences=[];
assert.equal(tx[0].length,79);assert.equal(tx[1].length,79);
for(let i=0;i<79;i++){
 const shape=t=>({case:t.case,terminal:t.terminal,dml:t.operations.filter(o=>['INSERT INTO','UPDATE','DELETE FROM'].includes(o.operation)).map(o=>({operation:o.operation,table:o.table,rowVersionPredicate:o.versionPredicate}))});
 const n=shape(tx[0][i]),r=shape(tx[1][i]);assert.equal(n.case,r.case);assert.equal(n.terminal,r.terminal);
 if(JSON.stringify(n)!==JSON.stringify(r))sqlShapeDifferences.push({transactionIndex:i,native:n,rust:r});
}
assert.equal(sqlShapeDifferences.length,4);
const expectedLogPhases=new Set(['cost-large-9999','contact-email-dto-db-length','extra-followup-dictionary33-varchar32']);
const voidOrder=sqlShapeDifferences.find(x=>x.native.case==='followup-postsave-audit-failure');assert(voidOrder);
const logPhase=sqlShapeDifferences.filter(x=>expectedLogPhases.has(x.native.case));assert.equal(logPhase.length,3);
const errorShape=x=>JSON.stringify({case:x.case,constraint:x.constraint,summary:x.summary,SQLSTATEObserved:x.SQLSTATEObserved});
assert.deepEqual(observer.SQL[0].actualErrors.map(errorShape).sort(),observer.SQL[1].actualErrors.map(errorShape).sort());
const evidence=[...analysis.inputs,...observer.inputs,pin(cf),pin(af),pin(of),pin(releaseFile),pin(ipFile),pin('tools/rust-r3cdefg/compare-coverage.mjs'),pin('tmp/rust-r3cdefg/coverage-compare-parity01-05.json')];
const rowChecks=analysis.caseResults.map(c=>({
 label:c.label,HTTPAndRecordedPGValues:'Equal after explicit generated identity/time mapping and independently proved participant outcome',
 remainingRawDifferences:c.differences,
 rawDifferenceDisposition:c.differences.length?'Only pre-existing loopback peer representation; retain original strings':'none',
 session:c.session,
 independentRelationChecks:analysis.invariantChecks.filter(x=>x.label===c.label),
 independentSQLOrAuditChecks:observer.checks.filter(x=>x.label===c.label),
 notCertified:'Unrecorded variants, later supplemental cases, final candidate/G3/G4 are outside this review',
}));
const finding={
 id:'SEM03-C-SQL-VOID-ORDER-01',priority:'P2',
 classification:'new-real-drift in observed in-transaction operation order; these45 show equal final business state',
 case:'followup-postsave-audit-failure',
 native:'Committed business transaction: Todo UPDATE -> managed auth_session UPDATE -> sales_follow_up_record UPDATE',
 rust03:'Committed business transaction: managed auth_session UPDATE -> Todo UPDATE -> sales_follow_up_record UPDATE',
 evidence:voidOrder,
 implication:'Do not claim SQL/failure-point identity. A Todo UPDATE rejection and session-CAS conflict can reach different first failing statements; both are currently in one business transaction, and this45 observed committed state is the same.',
 requiredDisposition:'Prefer the narrow void-path ordering correction followed by actual Native/Rust SQL and fault observation, or explicitly assess and classify the remaining difference. This pre-review gives no silent waiver or formal G3 permission.',
};
const report={
 kind:'R3CDEFG-independent-non-author-G2-deep-semantic-prereview',
 createdAt:new Date().toISOString(),
 reviewer:'C /root/r3_next16_review; non-author',
 workspace:'E:/projects/worktrees/poms-r3cdefg-next16/poms',
 scope:'Only retained Native parity01 24+21 versus Rust parity03 24+21, current03 public observer and the1124 coverage request/response comparison',
 decision:'45 recorded HTTP/business PG comparisons supported, existing IP values retained; one P2 SQL void-order difference needs disposition. Rust03 is not the final candidate and this is not G3/G4.',
 independentlyExecutedProduct:false,
 independentWork:'Read Root actual public originals, code and hashes; ran only own static JSON validators. No HTTP/DB/browser/build/test/lint/private/host/product or Root-tool mutation.',
 candidate:{artifact:release.artifact,semanticRuntimeArtifact:'1346892e7d1ef825b8479392eab513da5871ff4fa22d7cbd0c288b3369a62333',commands:release.commands.map(x=>({name:x.name,exitCode:x.exitCode})),testCounts:release.testCounts,workingSourceClaim:'Release original pins identify03; no claim current editing source is still03 or that03 can be final accepted'},
 evidencePins:evidence,
 ownStaticValidatorPins:[
  pin('tmp/rust-r3cdefg/c-review/compare-semantic-originals02.mjs'),
  pin('tmp/rust-r3cdefg/c-review/check-semantic-observer02.mjs'),
  pin('tmp/rust-r3cdefg/c-review/check-coverage-winner-scope01.mjs'),
  pin('tmp/rust-r3cdefg/c-review/write-g2-semantic-review01.mjs')
 ],
 results:{
  semanticCases:45,
  independentRelations:analysis.invariantChecks.length,
  independentRelationFailures:0,
  observerAuditAndTransactionChecks:observer.checks.length,
  observerCheckFailures:0,
  businessHTTPOrRecordedPGDifferencesAfterPermittedMapping:0,
  generatedIdentityPairs:analysis.identityPairs.length,
  sessions:{groups:16,rawIPFieldDifferences:32,versionDeltasAndIdentity:'Exact between backends',idleExpiresMinusLastSeenMs:900000,reads:'All8 due-session reads only+1',successfulBusinessFlush:'Cost first/F create/F replace and committed void with failed later audit +2',rollback:'Recorded failed business flushes only direct touch +1'},
  exactNumericText:{tables:3,rowsPerBackend:19,differences:0,anonymousChildRowsMatchedAsExactTupleMultiset:observer.anonymousNumericIdentityBinding.length,limitation:'Item numeric observer omits parent FK. Anonymous generated item IDs align by exact numeric tuple multiset; this proves exact values/null/scale, not each anonymous item-to-parent FK.'},
  audits:{rowsPerBackend:9,fullDifferencesAfterProvedContactWinnerMapping:0,concurrentContactAndF:'Each actual winner requestId/operator/target binds exactly one committed audit; F uses metadata.before/after/replacementId/replacementReason and null before_snapshot/after_snapshot/reason as actually emitted.'},
  security:{rowsPerBackend:16,businessOrOtherFieldDifferences:0,rawIPFieldDifferences:16},
  finalPGSubset:{followupsCompared:20,todosCompared:16,differences:0,laterRustObserverRawFollowups:28,laterRustObserverRawTodos:24,excludedLaterRowsPerTable:8,limitation:'Rust observer is later superset. Selection uses exact generated45+1124 identities, with all excluded rows retained in observer-review02. No equivalence/harmlessness is claimed for those extra records, including any supplemental date probes.'},
  SQL:{labelsPerBackend:45,nativeStatements:1152,rustStatements:1227,closedTransactionsPerBackend:79,openTransactions:0,transactionCaseAndCommitRollbackSequenceDifferences:0,recordedErrorsPerBackend:17,errorClassNameSummaryDifferences:0,SQLSTATE:'Not recorded; never inferred or fabricated',races:'All4 concurrent groups prove2waiters and exactly one target business COMMIT and one ROLLBACK; preparer/audit commits remain separate',dmlShapeDifferences:4},
  coverage:{events:1124,requestAndFullResponseDifferences:0,contactWinnerNormalizedObjects:4,scope:'Exactly index46/47 contact list objects, two per backend; only proven entity name/updatedBy. rowVersion and all other keys remain exact.',independentArtifact:pin(cf)}
 },
 normalizations:{
  IDs:'Explicit generated actors/run/producer/entity IDs with strict bidirectional reuse; fixed-input UUIDs not freely paired. One prior F source_id is explicitly tied to retained actual producer source.',
  times:'Only generated server/audit/session time fields. Fixed occurred/due/next input strings and stored instants, monetary strings/scales, error issue arrays and all business states remain exact.',
  winners:'Success/loser ordered only after2waiter/status/actor/DB invariants. No global actor substitution; contact race laterlist and audit changed fields are locally proven.',
  PGArrays:'Final table result sets align by known logical IDs; HTTP response array order is preserved.',
  IP:'No normalization. All48 raw differences remain in auxiliary originals and are classified only through the explicit existing R3AB peer-context receipt.'
 },
 findings:[finding],
 observedLoggingDifferences:logPhase.map(x=>({...x,classification:'Observed execute-log visibility difference at failed numeric/varchar assignment, not an invented success or absent attempted write',boundary:'Both actual ERROR class/message and ROLLBACK/residual rows match. A Bind/execute log-stage explanation is plausible but not independently proven from safe SQL alone. Do not fabricate an unlogged DML statement.'})),
 preExistingIPClassification:{source:pin(ipFile),finding:ip.finding,classification:ip.classification,boundary:ip.boundary,sameExplicitHeaderContextExact:true,allAuditFieldByteEqualityClaimed:false},
 knownOutsideSelectedSnapshot:{year0000:'Root reports an independently found actual Native500/Rust03 201 date-binding drift in B/F/G. It is outside these45+1124 cases, remains unresolved in03, and blocks treating this candidate as final. This C review does not reconstruct or certify that supplemental84 date run.',future:'Root will narrow-fix text::timestamptz binding, rebuild/reexecute final candidate, finish all UI/supplements/owned terminal evidence and seek independent formal G3 later.'},
 immutableReviewHistory:{active:[af,of,cf],preservedEarlierOwnStaticAnalyses:['tmp/rust-r3cdefg/c-review/g2-semantic-parity-analysis01.json','tmp/rust-r3cdefg/c-review/g2-semantic-observer-review01.json'],note:'Earlier C reader diagnostics used incomplete identity/audit-SQL shape assumptions. Their raw artifacts remain; active02 readers correct these assumptions without changing any product or Root originals.'},
 cases:rowChecks,
 formalGateBoundary:{G1Changed:false,G3Certified:false,G4Certified:false,IssueClosureAuthorized:false,deliveryCountChanged:false}
};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:pin(output),cases:45,findings:report.findings.map(f=>({id:f.id,priority:f.priority})),relations:90,bodyPGDifferences:0,coverageDifferences:0,G3:false,G4:false}));
