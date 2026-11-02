// Independent C: public-file static review only. Never imports or runs Root executors.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const C = 'tmp/rust-r3hijk/c-review';
const base = '7f970c992291c61477eb9bd83a48cec19a769d88';
const branch = 'codex/poms-r3hijk-next28';
const run = 'e4b1e704-9556-4e80-8efd-f5ad4f0e1411';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = file => {const b=fs.readFileSync(file); return {file,bytes:b.length,rawBytesSha256:sha(b)};};
const verify = p => {const actual=pin(p.file); assert.equal(actual.bytes,p.bytes,p.file+' byte size'); assert.equal(actual.rawBytesSha256,p.rawBytesSha256,p.file+' sha256'); return actual;};
const git = args => execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git(['rev-parse','HEAD']),base);
assert.equal(git(['branch','--show-current']),branch);
const priorFile=C+'/g1-native-evidence-preaudit01.json', prior=read(priorFile);
assert.equal(prior.base,base); assert.equal(prior.runId,run);
verify(prior.SQL.authority); verify(prior.SQL.observedIndex);
for(const r of prior.acceptedOriginalReports) verify(r.report);
for(const r of prior.failedOrPartialOriginals) verify(r.report);
for(const p of prior.sourceVersionOrigins) verify({...p,file:p.resolved});
for(const p of prior.D02.inputs) verify(p);

const sqlFile='tmp/rust-r3hijk/native-authority03/SQL-authority01.json', sql=read(sqlFile);
const summaryFile='tmp/rust-r3hijk/native-authority03/observed-summary01.json', summary=read(summaryFile);
const temporalFile='tmp/rust-r3hijk/native-authority03/bulk-original-SQL-timewindow01.json', temporal=read(temporalFile);
const old02File='tmp/rust-r3hijk/native-authority02/SQL-authority01.json', old02=read(old02File);
const reports=sql.sources.map(p=>{verify(p);const r=read(p.file);assert(r.completed);assert.equal(r.runId,run);assert.equal(r.base,base);return {phase:r.phase,file:p.file,r};});
assert.deepEqual(summary.sources,sql.sources); for(const p of summary.sources) verify(p);
assert.equal(reports.reduce((n,r)=>n+r.r.cases.length,0),54);
assert.equal(reports.reduce((n,r)=>n+r.r.events.length,0),193);
assert.equal(summary.actualCompletedCaseGroups,54); assert.equal(summary.actualHTTPEvents,193);
assert.equal(sql.bounds.length,54); assert.equal(sql.entries.length,3737); assert.equal(sql.errors.length,22);
assert.equal(sql.partialBeginMarkersExplicit.length,1);
assert.deepEqual(sql.partialBeginMarkersExplicit[0],{phase:'10',label:'H-bulk-override-competing-approvals',begin:false,end:true,entries:0});
assert(sql.bounds.filter(b=>b.phase!=='10').every(b=>b.begin&&b.end));
assert(!sql.entries.some(e=>e.phase==='10'));
for(const r of reports.filter(r=>['09','10'].includes(r.phase))) for(const p of r.r.sources) verify(p);

const table=e=>/^(?:insert into|update|delete from)\s+"?poms"?\."?([a-z_]+)"?/i.exec(e.statementShape)?.[1]||null;
const where=e=>(/\bwhere\b([\s\S]*?)(?=\breturning\b|$)/i.exec(e.statementShape)?.[1]||'').trim();
const hasVersion=e=>/\brow_version\b/i.test(where(e));
const strictCAS=e=>/\brow_version\b\s*(?:=|in\b|[<>])/i.test(where(e).replaceAll('"',''));
const rowKey=e=>[e.phase,e.label,e.sourceStream,e.sourceLineIndex].join('|');
const cut=e=>({phase:e.phase||'10-temporal',label:e.label||temporal.case,line:e.sourceLineIndex,pid:e.pid,transactionId:e.transactionId,operation:e.operation,table:table(e),where:where(e),versionPredicate:strictCAS(e)});
for(const e of sql.entries){assert.equal(e.whereClauseShape,where(e));assert.equal(e.rowVersionPredicate,hasVersion(e)); if(e.operation==='UPDATE')assert.equal(e.rowVersionPredicate,strictCAS(e));}
const current=new Map(sql.entries.map(e=>[rowKey(e),e]));
const stableFields=['phase','label','pid','user','transactionId','time','sourceStream','sourceLineIndex','operation','statementShape','actualAppStatement'];
function compareHistorical(old){const changes=[];for(const e of old.entries){const n=current.get(rowKey(e));assert(n);for(const k of stableFields)assert.equal(n[k],e[k]);if(e.rowVersionPredicate!==n.rowVersionPredicate)changes.push({...cut(n),oldReported:e.rowVersionPredicate});}return changes;}
const old01=read(prior.SQL.authority.file),corrected01=compareHistorical(old01),corrected02=compareHistorical(old02);
assert.equal(corrected01.length,27);
assert.equal(corrected01.filter(e=>e.table==='auth_session').length,26);
assert.equal(corrected01.filter(e=>e.table==='lead_score_override').length,1);
assert.equal(old02.entries.length,3737);

verify(temporal.sourceReport);
const ten=reports.find(r=>r.phase==='10').r, tenCase=ten.cases[0], v=tenCase.value;
assert.equal(ten.cases.length,1);assert.equal(ten.events.length,6);
assert.deepEqual(temporal.privateStreams,ten.privateOriginalSQLStreams);
assert.equal(temporal.firstBeginMarkerObserved,false);assert.equal(temporal.omittedMarkerNotInvented,true);
assert.equal(temporal.window.RootOriginalCaseStartedAt,tenCase.startedAt);
assert.equal(temporal.window.RootOriginalCaseCompletedAt,tenCase.completedAt);
assert.equal(temporal.entries.length,126);
const lower=Date.parse(tenCase.startedAt), upper=Date.parse(temporal.window.originalObservedEndMarkerTime);
assert.equal(upper,Date.parse(tenCase.completedAt));
assert.equal(new Set(temporal.entries.map(e=>e.sourceStream+'|'+e.sourceLineIndex)).size,126);
for(const e of temporal.entries){assert(Date.parse(e.time)>=lower&&Date.parse(e.time)<=upper);assert(temporal.privateStreams.some(s=>s.file===e.sourceStream));assert.equal(e.whereClauseShape,where(e));assert.equal(e.rowVersionPredicate,hasVersion(e));if(e.operation==='UPDATE')assert.equal(e.rowVersionPredicate,strictCAS(e));}
const bulk=temporal.entries.filter(e=>e.operation==='UPDATE'&&table(e)==='lead_score_override'&&/\bcase\b/i.test(e.statementShape)&&/\bin\s*\(/i.test(where(e)));
assert.equal(bulk.length,2);assert(bulk.every(e=>!strictCAS(e)));
const bulkCommits=bulk.map(u=>temporal.entries.find(e=>e.pid===u.pid&&e.transactionId===u.transactionId&&e.operation==='COMMIT'&&e.sourceLineIndex>u.sourceLineIndex));assert(bulkCommits.every(Boolean));
assert.equal(v.competition.waitingBeforeRelease,2);assert.deepEqual(v.competition.responses.map(r=>r.status),[200,200]);
const old=v.before.overrides.find(r=>r.status==='approved'),pending=v.before.overrides.find(r=>r.status==='pending');assert(old&&pending);
const oldAfter=v.after.overrides.find(r=>r.id===old.id),pendingAfter=v.after.overrides.find(r=>r.id===pending.id);
assert.equal(old.row_version,2);assert.equal(oldAfter.row_version,4);assert.equal(pending.row_version,1);assert.equal(pendingAfter.row_version,3);
assert.equal(oldAfter.status,'superseded');assert.equal(oldAfter.superseded_by_id,pending.id);assert.equal(pendingAfter.status,'approved');
assert.equal(v.after.snapshots.length-v.before.snapshots.length,2);assert.equal(v.audits.length,2);
const responses=v.competition.responses.map((r,i)=>{const a=v.audits[i];assert.equal(a.requestId,r.requestId);assert.equal(a.status,200);assert.equal(a.rows.length,1);assert.equal(a.rows[0].request_id,r.requestId);assert.equal(a.rows[0].target_id,pending.id);assert.equal(a.rows[0].event_type,'lead-score-override.approved');assert.equal(r.body.id,pending.id);return {requestId:r.requestId,status:r.status,responseVersion:r.body.rowVersion,auditRows:1,operatorId:a.rows[0].operator_id};});
assert.deepEqual(responses.map(r=>r.responseVersion),[2,3]);
const newSnapshots=v.after.snapshots.filter(s=>!v.before.snapshots.some(b=>b.id===s.id));assert.equal(newSnapshots.length,2);assert(newSnapshots.every(s=>s.override_id===pending.id));

const nine=reports.find(r=>r.phase==='09').r;
assert.equal(nine.cases.length,2);assert.equal(nine.events.length,6);
const singleRows=[];
for(const c of nine.cases){const v=c.value,success=c.label==='H-single-link-success';assert.equal(v.response.status,success?200:500);assert.equal(v.after.counter[0].next_value-v.before.counter[0].next_value,1);assert.equal(v.copySourceMetadataNotUpload,true);if(success){assert.equal(v.after.lead.status,'converted');assert.equal(v.after.lead.row_version,v.before.lead.row_version+1);assert.equal(v.after.projects.length,1);assert.equal(v.after.targetLinks.length,1);}else{assert.deepEqual(v.after.lead,v.before.lead);assert.equal(v.after.projects.length,0);assert.equal(v.after.targetLinks.length,0);}const all=sql.entries.filter(e=>e.phase==='09'&&e.label===c.label&&e.actualAppStatement),n=all.findLastIndex(e=>table(e)==='business_number_sequence'),conversion=all.slice(n+1).filter(e=>['INSERT INTO','UPDATE','COMMIT','ROLLBACK'].includes(e.operation));const observed=conversion.map(e=>table(e)||e.operation);assert.deepEqual(observed,success?['audit_log','attachment_link','project','auth_session','lead','lead_score_snapshot','COMMIT']:['audit_log','ROLLBACK']);singleRows.push({label:c.label,HTTP:v.response.status,leadBefore:v.before.lead.status,leadAfter:v.after.lead.status,versionBefore:v.before.lead.row_version,versionAfter:v.after.lead.row_version,projects:v.after.projects.length,targetLinks:v.after.targetLinks.length,numberDelta:1,conversionOrder:conversion.map(cut),metadataOnlyNotRealUpload:true});}

const terminalFile='tmp/rust-r3hijk/native-cohort-terminal01.json', terminal=read(terminalFile);
assert.equal(terminal.base,base);assert.equal(terminal.runId,run);assert.equal(terminal.removedRows,382);assert.equal(terminal.removed.reduce((n,r)=>n+r.count,0),382);
assert.equal(terminal.fullBaselineTables,107);assert.equal(terminal.individualPrivileges,428);
for(const k of ['ownedRuntimeStopped','port12400Free','all107SeedRawJSONRowsExact','allPrivilegesRestored','privateAndVolumeRetained','ownedPG15RemainsAvailableForG2'])assert.equal(terminal[k],true);
assert.equal(terminal.oldPG17OrPriorPrivateTouched,false);
const ownedFile='tmp/rust-r3hijk/owned-observation-before-terminal-native01.json',owned=read(ownedFile);assert.equal(owned.runId,run);assert.equal(owned.marker,terminal.marker);assert(owned.all107TablesDeltaReconciled);
for(const r of owned.rawBusinessRows){assert(r.rawTextNeverParsedForMoney);assert.equal(terminal.removed.find(t=>t.table===r.table).count,r.rawJSONRows.length);}
const cleanupSource=fs.readFileSync('tools/rust-r3hijk/cleanup-native-cohort.mjs','utf8');
assert(cleanupSource.indexOf('assert.deepEqual(await snapshot(),before)')<cleanupSource.indexOf("const result={kind:'R3HIJK-original-Native-G1-cohort-terminal'"));
assert(cleanupSource.includes("assert.equal(privileges.length,428)"));assert(cleanupSource.includes("assert(privileges.every(p=>p.allowed)"));

const dm=read('tmp/rust-r3hijk/d-input/acceptance-matrix02.json'),di=read('tmp/rust-r3hijk/d-input/shared-dependency-interface-draft02.json');
assert(dm.textLengthContract.schema.includes('4.6.1 code points'));assert(dm.textLengthContract.businessStringLength.includes('UTF-16'));assert(di.textAndDate.body.includes('1..8000 code points'));
for(const p of dm.revision.originalsPreserved)verify({file:'tmp/rust-r3hijk/d-input/'+p.file,bytes:p.bytes,rawBytesSha256:p.rawSha256});
verify({file:dm.nativeActual.schemaOracle.path,bytes:dm.nativeActual.schemaOracle.bytes,rawBytesSha256:dm.nativeActual.schemaOracle.rawSha256});
verify({file:dm.nativeActual.Native.path,bytes:dm.nativeActual.Native.bytes,rawBytesSha256:dm.nativeActual.Native.rawSha256});
const preflightFile='docs/design/rust-r3hijk/preflight-native-source-manifest01.json',preflight=read(preflightFile);assert.equal(preflight.base,base);
for(const p of [...preflight.nativeFiles,...preflight.rustBaseFiles])verify(p);

const e1File=C+'/e1-compatibility-rereview01.json',e1=read(e1File),byteReview=read(C+'/g1-input-byte-prereview01.json');
assert(e1.E1Approved);assert.equal(e1.exactScope.regularFiles,5);assert.equal(e1.exactScope.totalBytes,419264);
assert.equal(e1.deadline.originalCalendarDeadline,'2026-11-09');assert.equal(e1.deadline.calendarDeadlineExtended,false);assert.equal(e1.owner,'Root /root');
for(const p of e1.exactScope.files){verify(p);verify({...p,file:p.archiveFile});assert(fs.lstatSync(p.file).isFile());assert(!fs.lstatSync(p.file).isSymbolicLink());}
assert.equal(byteReview.E1.consumers.length,22);for(const p of byteReview.E1.consumers)verify(p.source);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name).replaceAll('\\','/')]);
const activeAliases=walk('docs/design/rust-r3cdefg');assert.equal(activeAliases.length,5);assert.deepEqual(activeAliases.sort(),e1.exactScope.files.map(p=>p.file).sort());

const record={kind:'C-independent-R3HIJK-G1-incremental-Native-evidence-preaudit02',createdAt:new Date().toISOString(),reviewer:{agent:'/root/r3hijk_review',role:'Independent non-author C',method:'Static public JSON/source/hash review; own read-only validator; no Root executors imported or run',modelTarget:'gpt-6.1-sol/max',actualModelAndEffortNotIndependentlyVisible:true,Fast:'unverified'},base,branch,runId:run,decision:'Incremental-evidence-accepted-P2-02-resolved-formal-joint-G1-pending',formalJointG1Decision:false,G1Certified:false,G2Authorized:false,G3Certified:false,G4Certified:false,incrementalUnresolvedP1P2:[],priorReview:pin(priorFile),findingResolution:{id:'G1-P2-02',priority:'P2',status:'Resolved-in-current-numbered-safe-SQL-authority',corrected01FalsePositives:27,authRawTouchFalsePositives:26,bulkOverrideFalsePositives:1,corrected02FalsePositives:corrected02.length,independentWhereExtraction:'Only WHERE text before RETURNING; UPDATE row_version predicate checked independently',all3737StatementClassificationsMatch:true,old01PinnedBytesUnchanged:true,old02CurrentPin:pin(old02File),old02EntryLineageExact:true,old02HistoricalBytePinNotAvailableInPriorCRecord:true,old01And02NotReplacedByThisReview:true,correctedRows:corrected01},sources:{SQL:pin(sqlFile),summary:pin(summaryFile),temporal:pin(temporalFile),extractor:pin('tools/rust-r3hijk/extract-native-authority.mjs'),temporalExtractor:pin('tools/rust-r3hijk/extract-bulk-timewindow.mjs'),newReports:reports.filter(r=>['09','10'].includes(r.phase)).map(r=>({phase:r.phase,report:pin(r.file),allSourcePinsExact:true,cases:r.r.cases.length,HTTP:r.r.events.length})),oldOriginalReportPinsUnchanged:true,priorSourceVersionOriginPinsUnchanged:true},observedCoverage:{completedCaseGroups:54,HTTPEvents:193,markerBoundSQLStatements:3737,markerBoundErrors:22,fullyObservedBeginEndGroups:53,phase10MarkerBoundSQLStatements:0,phase10BeginObserved:false,phase10EndObserved:true,temporalSupplementStatements:126,allTemporalSourceLineReferencesUnique:true,temporalWindow:temporal.window,temporalSupplementMustRemainSeparatelyLabelled:true,SQLSTATEWasNotRecorded:true,privateRawStreamsNotReadByC:true,RootSafeDerivationAndPublicHTTPPGRelationshipsReviewed:true,all54GroupsMustNotBeClaimedAsBothMarkersObserved:true},bulkOverride:{existingApprovedId:old.id,pendingId:pending.id,actualWaiters:2,responses,oldVersion:[2,4],pendingVersion:[1,3],oldStatus:'superseded',pendingStatus:'approved',newSnapshots:2,eachRequestAuditRows:1,bulkWHERE:'id IN; no row_version predicate',bulkUpdates:bulk.map(cut),bulkCommits:bulkCommits.map(cut),singleRowPriorCASResult:[200,500],bulkObservedResult:[200,200],mustFreezeObservedBulkSemanticsWithoutSilentlyAddingCAS:true,markerOmission:'Root attributes omitted first begin marker to asynchronous PG logging reload; public authority explicitly preserves the omission rather than inventing a marker',rawLogCausalExplanationNotIndependentlyReproduced:true},singleEligibleAttachment:{cases:singleRows,successWriteOrder:'audit_log -> attachment_link -> project -> managed auth_session -> lead -> lead_score_snapshot -> COMMIT',deniedAuditBeforeProjectOrLinkFlush:true,existingDualEligibleOrderRetainedFromPriorReview:true,preparedMetadataIsNotUploadProducerAcceptance:true,G2RequiresRealUploadProducer:true},terminal:{report:pin(terminalFile),ownedBeforeTerminal:pin(ownedFile),cleanupSource:pin('tools/rust-r3hijk/cleanup-native-cohort.mjs'),ownedRowsRemoved:382,fullSeedTables:107,rawJSONSeedRowsExact:true,privilegesRestored:428,NativeRuntimeStopped:true,port12400Free:true,PG15VolumeAndPrivateOriginalsRetained:true,oldPG17Untouched:true,publicOwnedBusinessCountsMatchRemovalCounts:true,methodLimit:'Root-produced terminal report and source invariant chain reviewed statically; C did not reconnect to DB, inspect private seed or credentials, or execute cleanup'},D02:{activeInputs:prior.D02.inputs.map(p=>verify(p)),lengthP2ResolvedRetained:true,originalsPinsUnchanged:true,schema:'Zod 4.6.1 trimmed 1..8000 code points / unicodeScalarsOrLoneUnits',explicitBusinessLength:'Original service JS .length remains UTF-16 code units',priorNativeThreeWayWireEvidenceRetained:true},E1:{authority:pin(e1File),decision:'Reuse-current-triggered-independent-approval-without-expanding-or-extending',files:5,totalBytes:419264,allFiveActiveArchivePinsExact:true,all22RecordedDirectConsumerPinsExact:true,consumerDetectionScope:byteReview.E1.consumerDetectionLimit,RootOwnerRetained:true,calendarDeadline:'2026-11-09',deadlineExtended:false,exitConditionSatisfied:false},protectedSourcePins:{preflight:pin(preflightFile),Native:preflight.nativeFiles.length,RustBaseline:preflight.rustBaseFiles.length,allCurrentBytesExact:true},failedOrPartialOriginals:prior.failedOrPartialOriginals.map(r=>({...r,stillPinnedExact:true,excludedFrom54And193:true})),remainingBeforeFormalJointG1:['Root must provide final baseline/shared-interface/master/manifest for independent C review and exact pins.','Freeze both single-row CAS and two-row bulk approval behavior; freeze zero/one/two eligible attachment flush order and numbering/rollback boundaries.','Keep phase10 temporal SQL separate from fully marker-bounded evidence; do not assert an observed begin marker.','Freeze the 28-operation H14/I10/J2/K2 boundary; existing delivered count remains30/58 and #85/#57 stay open.','Keep unobserved matrix cases source-only/planned; no full Native, Rust, UI or all-matrix acceptance follows from54groups/193HTTP.','G2 requires real upload/attachment producer cases rather than metadata preparation alone.','Per-case exact session-version deltas have not been independently established in this static incremental review.'],scopeBoundary:{operations:28,groups:{H:14,I:10,J:2,K:2},alreadyDelivered:30,R3Total:58,parentsMustRemainOpen:[85,57],noLiveGitHubStateReadInThisStaticIncrementalReview:true},noIndependentProductBuildTestFmtLintDBHTTPBrowserOrHostExecution:true,noAuthorOrRootExecutorRun:true,noPrivateRead:true,noGitHubWrite:true};
const out=C+'/g1-incremental02.json';fs.writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:pin(out),decision:record.decision,P2_02:'resolved',corrected02FalsePositives:corrected02.length,NativeGroups:54,HTTP:193,markerBoundSQL:3737,separateTemporalSQL:126,G1Certified:false,G2Authorized:false}));
