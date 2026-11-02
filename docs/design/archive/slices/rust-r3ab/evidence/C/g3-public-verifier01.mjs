// Independent C: saved public bytes and read-only Git inspection only.
// Does not import or execute acceptance producers, checker, DB, HTTP or browsers.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd().replaceAll('\\','/');
assert.equal(root,'E:/projects/worktrees/poms-r3ab-customer-project/poms');
const base='a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d';
const marker='08609152-7a46-4b18-8861-f0f8a38d9e3e';
const linux='/home/wangzishi/projects/poms-rust-r3ab/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(f));
const pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
const checked=new Map();
function verify(ref,file=ref.file){
  assert(!file.replaceAll('\\','/').split('/').includes('private'),'C must not read private bytes');
  const p=pin(file);
  assert.equal(p.bytes,ref.bytes,'length: '+file);
  assert.equal(p.rawBytesSha256,ref.rawBytesSha256,'hash: '+file);
  checked.set(file,p);return p;
}
function publicOriginal(ref){
  assert(ref.file.startsWith(linux+'tmp/rust-r3ab/'));
  const suffix=ref.file.slice((linux+'tmp/rust-r3ab/').length);
  const f='tmp/rust-r3ab/linux-original01/'+suffix;
  assert(!suffix.split('/').includes('..'));verify(ref,f);return f;
}
const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024});
const normText=b=>Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'));
function walk(dir){const files=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,e.name);assert(!fs.lstatSync(f).isSymbolicLink());
  if(e.isDirectory())files.push(...walk(f));else{assert(e.isFile());files.push(f.replaceAll('\\','/'));}
}return files.sort();}

const evidenceFile='docs/design/rust-r3ab/acceptance-evidence01.json';
const evidence=json(evidenceFile),proofFile='docs/design/rust-r3ab/source-and-format-proof01.json',proof=json(proofFile);
assert.equal(evidence.base,base);assert.equal(evidence.G3Certified,false);assert.equal(evidence.G4Certified,false);
assert.deepEqual(evidence.issues,{A:86,B:87,parent:85,overall:57});
assert.equal(evidence.delivery.currentCountBeforeG4,0);assert.equal(evidence.delivery.laterOperations,44);
assert.equal(evidence.retainedRawCopies.length,46);
for(const pair of evidence.retainedRawCopies){verify(pair.source);verify(pair.archive);assert(fs.readFileSync(pair.source.file).equals(fs.readFileSync(pair.archive.file)));}
for(const p of evidence.productionSources)verify(p);
const prior=json('tmp/rust-r3ab/c-review/api-pg-scoped-review01.json');
assert.deepEqual(evidence.productionSources,prior.sourceAndScopeAssessment.productSourcePins);
assert.deepEqual(proof.currentProductionSources,evidence.productionSources);
for(const p of proof.stagedRawSourceOrFormalInputs){verify(p);assert.equal(sha(git('show',':'+p.file)),p.rawBytesSha256,'index bytes '+p.file);}
const manifest=json('docs/design/rust-r3ab/g1-input-manifest02.json');
assert.equal(manifest.formalFiles.length,12);assert.equal(manifest.nativeFiles.length,872);
for(const p of [...manifest.formalFiles,...manifest.nativeFiles])verify(p);
for(const p of [...Object.values(evidence.artifacts).filter(p=>p.file),...evidence.artifacts.archivePacks,...evidence.checks.logs])verify(p);
verify(proof.activeAttributes);verify(proof.originalSixGuardGeneration);
verify(proof.checks.diffCheck.log);verify(proof.checks.markdown.log);
assert.equal(fs.readFileSync(proof.checks.diffCheck.log.file,'utf8'),'');
assert(fs.readFileSync(proof.checks.markdown.log.file,'utf8').includes('deno run --allow-read tools/format-md-tables.ts --check docs/'));

const clientLog=fs.readFileSync(proof.originalSixGuardGeneration.file,'utf8');
const client=clientLog.split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l)).find(r=>r.kind==='R3AB-frozen-checkout-original-runClient-result');
assert(client.allSixOriginalGuardsPreserved);assert.equal(client.result.result,'pass');
assert.equal(client.result.clientFiles,579);assert.equal(client.result.sourceManifest.length,6);
assert.equal(client.result.clientWritten,false);assert(client.result.metadataPreserved);assert.deepEqual(client.result.differences,[]);
const baseline=json('tools/openapi/shared-api-client-baseline.json');
assert.equal(sha(JSON.stringify(baseline)),client.result.parsedBaselineSha256);
assert.equal(sha(normText(fs.readFileSync('tools/openapi/shared-api-client.mjs'))),client.result.toolSha256);
assert.deepEqual(client.result.sourceManifest,baseline.protectedSources);
assert.equal(client.result.generator.jarSha256,baseline.generator.jarSha256);
assert.equal(client.result.generator.version,'7.20.0');assert(client.result.generator.directJar);
const activePaths=client.currentActiveRawPins.map(p=>({...p,file:p.file.slice(linux.length)}));
assert.equal(activePaths.length,585);assert.equal(new Set(activePaths.map(p=>p.file)).size,585);
for(const p of activePaths.filter(p=>p.file!=='.gitattributes'))verify(p);
const clientPaths=walk('libs/shared/api-client');
assert.equal(clientPaths.length,579);
assert.deepEqual(clientPaths,activePaths.filter(p=>p.file.startsWith('libs/shared/api-client/')).map(p=>p.file).sort());
for(const p of baseline.protectedSources.filter(p=>p.file!=='.gitattributes'))assert.equal(sha(normText(fs.readFileSync(p.file))),p.sha256);
const originalAttributes=normText(git('show',base+':.gitattributes')).toString('utf8');
assert.equal(fs.readFileSync('.gitattributes','utf8'),originalAttributes+proof.onlyNewR3AttributeRules);
for(const l of proof.onlyNewR3AttributeRules.split('\n').filter(l=>l.trim()&&!l.startsWith('#')))
  assert(/^(docs\/design\/rust-r3ab\/|docs\/design\/archive\/slices\/rust-r3ab\/|tools\/rust-r3ab\/)/.test(l));
const attrInput=activePaths.map(p=>p.file).join('\n')+'\n';
const attrs=args=>execFileSync('git',[...args,'--all','--stdin'],{input:attrInput,encoding:'utf8'});
const actualAttrs=attrs(['check-attr']);
assert.equal(actualAttrs,attrs(['check-attr','--cached']));
assert.equal(actualAttrs,attrs(['check-attr','--source='+baseline.sourceHead]));

const apiReports=evidence.API.attempt05.map(p=>{verify(p);return json(p.file)});
assert.equal(apiReports.length,2);
for(const r of apiReports){assert(r.completed);assert.equal(r.events.length,263);assert.equal(r.observations.length,34);assert.equal(r.marker,marker);}
verify(evidence.API.comparison);assert.equal(pin(evidence.API.comparison.file).rawBytesSha256,prior.inputs.comparison.rawBytesSha256);
assert.equal(pin('tools/rust-r3ab/compare.mjs').rawBytesSha256,prior.inputs.normalizer.rawBytesSha256);
assert.equal(prior.replay.result,'Pass');assert.equal(prior.replay.exitCode,0);

verify(evidence.faults.additional);const faults=json(evidence.faults.additional.file);
verify(faults.source,'tools/rust-r3ab/missing-faults.mjs');
assert.equal(faults.checksPerBackend,3);assert.equal(faults.result,'Pass');
const faultSummaries=[];
function sessionDeltas(before,after,expected){
  assert.equal(before.length,after.length);assert.deepEqual(before.map(s=>s.id).sort(),after.map(s=>s.id).sort());
  const values=after.map(a=>{const b=before.find(b=>b.id===a.id);assert.equal(a.user_id,b.user_id);return a.row_version-b.row_version});
  assert.equal(values.filter(v=>v===expected).length,1);assert(values.every(v=>v===0||v===expected));return values;
}
for(const rec of faults.records){
  const report=json(publicOriginal(rec.report));assert.equal(rec.runId,report.runId);assert(report.completed);
  assert.equal(report.events.length,263);assert.equal(report.observations.length,34);
  assert.deepEqual(rec.runtime,report.runtime);assert.equal(rec.runtime.artifactSha256,apiReports.find(r=>r.backend===rec.backend).runtime.artifactSha256);
  assert.deepEqual(rec.initialPrivileges,{number_insert:true,security_insert:true});assert.deepEqual(rec.finalPrivileges,rec.initialPrivileges);assert(rec.ACLRestored);
  assert.equal(rec.cases.length,3);const cases=[];
  for(const c of rec.cases){assert.equal(c.HTTP.status,500);const delta=sessionDeltas(c.beforeSession,c.afterSession,1);
    assert.deepEqual(c.versionDeltas.map(x=>x.delta),delta);
    if(c.name.startsWith('B35')){
      assert.equal(c.actualEvents,0);assert(c.businessUnchanged);assert(c.pendingManagedSessionFlushRolledBack);
      assert.equal(c.recovery.status,200);assert.equal(c.recovery.body.id,c.targetId);
      assert.equal(c.recovery.body.currentContractSummary.signedAmountProjection.mode,'masked');assert.equal(c.recovery.body.currentContractSummary.signedAmountProjection.value,null);
      const recovered=sessionDeltas(c.recoveryBefore,c.recoveryAfter,2);assert.deepEqual(c.recoveryDeltas.map(x=>x.delta),recovered);
      assert.equal(c.actualRecoveryEvents.length,1);const ev=c.actualRecoveryEvents[0];assert.equal(ev.request_id,c.recovery.requestId);assert.equal(ev.event_type,'sensitive_field.masked');assert.equal(ev.details.targetId,c.targetId);
      assert(c.beforeSession.every(s=>s.user_id===ev.actor_id));
      cases.push({name:c.name,HTTP:500,eventCount:0,sessionVersionDeltas:delta,recoveryHTTP:200,recoveryEvents:1,recoveryDeltas:recovered});
    }else{assert.deepEqual(c.beforeCounters,c.afterCounters);assert.equal(c.entityRows,0);assert(c.pendingBusinessFlushAbsent);cases.push({name:c.name,HTTP:500,countersUnchanged:true,entityRows:0,sessionVersionDeltas:delta});}
  }
  faultSummaries.push({backend:rec.backend,runId:rec.runId,cases});
}

const uiSummaries=[];
for(const cell of evidence.UI){
  verify(cell.report);const r=json(cell.report.file);assert.equal(r.result,'Pass');assert(r.completed);assert.equal(r.observations.length,8);assert.equal(r.network.length,cell.HTTP);
  assert.equal(r.marker,marker);assert.equal(r.apiRunId,apiReports.find(a=>a.backend===r.backend).runId);
  assert.deepEqual(r.staticBuild,evidence.artifacts.Angular);assert.equal(r.closure.pending,0);assert(r.closure.browserClosed&&r.closure.serverClosed&&r.closure.allRawExchangesRetained);
  for(const p of r.producerSources){const f=p.file.startsWith(linux)?p.file.slice(linux.length):p.file.slice(root.length+1);verify(p,f);}
  const values=new Map(r.observations.map(o=>[o.label,o.value]));
  const created=values.get('customers.ui.create-response'),workspace=values.get('customers.ui.workspace-response'),alias=values.get('customers.ui.alias-response'),deleted=values.get('customers.ui.alias-deletion'),edited=values.get('customers.ui.edit-response'),listed=values.get('customers.ui.list-after-edit'),p=values.get('B.ui.actual-list-detail-customer-edit-save'),outside=values.get('B.ui.actual-out-of-scope-requests');
  assert.equal(workspace.customerId,created.id);assert.equal(alias.customerId,created.id);assert.equal(deleted.aliasId,alias.id);assert.equal(deleted.status,204);assert.equal(deleted.responseText,'');
  assert.equal(edited.id,created.id);assert(!edited.aliases.some(a=>a.id===alias.id));assert(listed.some(c=>c.id===edited.id&&c.displayName===edited.displayName));
  assert.equal(p.after.id,p.projectId);assert.equal(p.after.customer_id,p.customerId);assert.equal(p.after.project_name,p.projectName);assert(p.actualProjectPatch);assert.deepEqual(outside.stillPendingAtDefinitionExit,[]);
  const requests=[['POST','/api/customers',201],['GET','/api/customers/'+created.id+'/workspace-overview',200],['POST','/api/customers/'+created.id+'/aliases',201],['DELETE','/api/customer-aliases/'+alias.id,204],['PATCH','/api/customers/'+created.id,200],['GET','/api/projects',200],['GET','/api/projects/'+p.projectId,200],['PATCH','/api/projects/'+p.projectId,200]];
  for(const [method,route,status]of requests)assert(r.network.some(n=>n.method===method&&n.path.split('?')[0]===route&&n.status===status),'UI actual '+method+' '+route);
  assert(r.network.every(n=>Number.isInteger(n.status)&&n.completedAt&&n.privateRaw));
  const allowedOutside=/^\/api\/(?:customer-contacts|business-discussions|sales-follow-up-records|opportunity-stakeholders|competitor-intelligence-records|sales-discovery-records|sales-intelligence-gaps)(?:\?|$)|^\/api\/projects\/[0-9a-f-]{36}\/(?:timeline|archive-records)(?:\?|$)/;
  const bad=r.network.filter(n=>n.status>=400);assert(bad.every(n=>n.status===404&&allowedOutside.test(n.path)));
  uiSummaries.push({label:r.label,backend:r.backend,platform:r.platform,observations:8,HTTP:r.network.length,outOfScope404Retained:bad.length,allExpectedReachableOperationsObserved:true,projectPGRowMatchesSavedResponse:true,browserServerClosedPending0:true});
}
const uiFiles=walk('tmp/rust-r3ab/ui-build/browser').map(f=>{const p=pin(f);return{...p,file:f.slice('tmp/rust-r3ab/ui-build/browser/'.length)}});
assert.equal(uiFiles.length,422);assert.equal(sha(JSON.stringify(uiFiles)),evidence.artifacts.Angular.manifestSha256);

verify(evidence.terminal);const terminal=json(evidence.terminal.file);assert.equal(terminal.result,'Pass');assert.equal(terminal.marker,marker);assert.equal(terminal.HTTPPGCohorts.length,9);
const terminals=[];
for(const row of terminal.HTTPPGCohorts){const t=json(publicOriginal(row.terminal));assert.equal(t.runId,row.runId);assert.equal(t.marker,marker);assert.equal(t.sourceBase,base);assert.equal(t.removedRows,row.removedRows);assert.equal(t.fullBaselineTables,107);assert(t.fullBaselineRawJsonRowsEqual&&t.runtimeStopped);assert.equal(t.terminalState,'cleaned');assert.equal(t.externalBootTermination===true,row.externalBootTermination);if(row.tag==='attempt06'){assert(t.externalBootTermination);assert.equal(t.signalSentNow,false);const report=json('tmp/rust-r3ab/linux-original01/acceptance-attempt06-'+row.backend+'/report01.json');assert.equal(t.runtimePID,report.runtime.pid);assert.equal(t.removedRows,278);}else assert.notEqual(t.externalBootTermination,true);terminals.push({runId:t.runId,tag:row.tag,backend:row.backend,rows:t.removedRows,externalBootTermination:t.externalBootTermination===true,signalSentNow:t.signalSentNow});}
const witness=json(publicOriginal(terminal.NativeWitness.receipt));assert.equal(witness.fullBaselineTables,107);assert(witness.fullBaselineRawJsonRowsEqual);
const boot=json(publicOriginal(terminal.bootChangeReceipts[0]));
for(const r of boot.records){const f='tmp/rust-r3ab/linux-original01/runtime/'+r.backend+'-parity06.json',runtime=json(f);const {healthStatus,privateLogRetained,...originalRuntime}=runtime;assert.equal(healthStatus,200);assert(privateLogRetained);assert.equal(sha(JSON.stringify(originalRuntime,null,2)+'\n'),r.runtimeRecordSha256,'Source-defined runtime.mjs public envelope reconstructs original metadata; no private read');assert.equal(runtime.bootId,r.previousBoot);assert.notEqual(r.previousBoot,r.currentBoot);assert.equal(r.pid,runtime.pid);assert(r.ownedRuntimeEndedByBootChange&&r.portFree);assert.equal(r.signalSent,false);}
const recovery=json(publicOriginal(terminal.bootChangeReceipts[1]));assert.equal(recovery.onlyContainer,'poms-r3ab-pg15');assert(recovery.labelsAndVolumeVerifiedBeforeStart);assert.equal(recovery.markerVerifiedAfterStart,marker);
assert(terminal.onlyNewPG15Stopped&&terminal.PG15VolumeRetained);assert.equal(terminal.currentOwnedLinuxUIProcesses,0);assert.deepEqual(terminal.ownedLinuxPortsFree,[11100,11200,11300]);
for(const d of terminal.databases){assert.equal(d.marker,marker);assert(d.all107BaselineTablesExact&&d.ACLRestored);assert(Object.values(d.privileges).every(Boolean));}

const logs=json('tmp/rust-r3ab/public-check-logs01/manifest01.json');for(const p of logs.records)verify(p);
verify(evidence.checks.schema);const schema=json(evidence.checks.schema.file);
assert.equal(schema.existingValidatedChecks.length,168);assert.equal(schema.newUnclassifiedStatements,0);assert.equal(schema.DDLExecuted,false);
function canonicalCheck(s){return s.replace(/^.*?\bcheck\s*/i,'').replace(/;$/,'').replace(/::(?:character varying|text|numeric|integer|smallint|boolean)(?:\[\])?/g,'').replace(/"/g,'').replace(/[()\s]/g,'').replace(/=ANYARRAY\[([^\]]*)\]/gi,(_,a)=>'in'+a).replace(/in('[^']*')(?!,|')/g,(_,a)=>'='+a).toLowerCase();}
const checkDiffs=schema.existingValidatedChecks.filter(c=>canonicalCheck(c.SQL)!==canonicalCheck(c.actual.definition)||!c.actual.convalidated);
assert.deepEqual(checkDiffs,[],'Public CHECK predicates differ after finite PostgreSQL IN/ANY/cast formatting canonicalization');
const dump=fs.readFileSync('tmp/rust-r3ab/public-check-logs01/original-schema-dump.log','utf8').replace(/\x1b\[[0-9;]*m/g,'').split('\n').filter(l=>!l.startsWith('◇')).join('\n');
let remaining=dump;for(const c of schema.existingValidatedChecks){assert(remaining.includes(c.SQL));remaining=remaining.replace(c.SQL,'');}
for(const s of [schema.existingBaselineComment.SQL,"set names 'utf8';",'drop table if exists "r3ab_control"."marker" cascade;','drop schema if exists "r3ab_control";'])remaining=remaining.replace(s,'');assert.equal(remaining.trim(),'');
const rustTests=fs.readFileSync('tmp/rust-r3ab/root/rust-full-tests03.log','utf8');const summaries=[...rustTests.matchAll(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored/g)];assert.equal(summaries.reduce((n,m)=>n+Number(m[1]),0),232);assert.equal(summaries.reduce((n,m)=>n+Number(m[2]),0),0);assert.equal(summaries.reduce((n,m)=>n+Number(m[3]),0),54);
assert(fs.readFileSync('tmp/rust-r3ab/public-check-logs01/native-unit-tests.log','utf8').includes('863 passed'));
assert(fs.readFileSync('tmp/rust-r3ab/public-check-logs01/admin-utc-check01.log','utf8').includes('368 passed'));
assert(fs.readFileSync('tmp/rust-r3ab/public-check-logs01/admin-unit-tests.log','utf8').replace(/\x1b\[[0-9;]*m/g,'').includes('1 failed, 367 passed'));

const preservationFile='tmp/rust-r3ab/root/primary-preservation01.json',preservation=json(preservationFile);
assert.equal(preservation.memberCount,732);assert.equal(preservation.bytes,211083968);assert.equal(preservation.privateJournalsCopied,false);assert.equal(sha(JSON.stringify(preservation.files)),preservation.manifestSha256);
for(const p of preservation.files){verify(p,preservation.source+'/'+p.file);verify(p,preservation.destination+'/'+p.file);}
assert.equal(preservation.files.reduce((n,p)=>n+p.bytes,0),preservation.bytes);

const result={kind:'R3AB-independent-C-public-G3-byte-and-relation-verification',createdAt:new Date().toISOString(),result:'Pass',reviewerScript:pin('tmp/rust-r3ab/c-review/g3-public-verifier01.mjs'),evidence:pin(evidenceFile),sourceAndFormatProof:pin(proofFile),publicFilesHashed:checked.size,formalInputs:12,frozenNativeInputs:872,unchangedPreviouslyReviewedProductionSources:15,stagedRawSourceFiles:proof.stagedRawSourceOrFormalInputs.length,client:{originalSixGuardsRetained:true,currentRawMembersEqualOriginalActualRun:584,currentWorkingIndexFrozenAttributesEqual:585,generatedMembers:579,activeAttributesOnlyR3Appends:true,originalActiveCLIFailureRetained:true},API05:{reusedIndependentPureReplayReceipt:'tmp/rust-r3ab/c-review/api-pg-scoped-review01.json',replayInputAndSourceHashesUnchanged:true,HTTPPerBackend:263,observationsPerBackend:34},additionalFaults:faultSummaries,UI:uiSummaries,AngularRawMembers:422,terminal:{cohorts:terminals,witnessRows:witness.removedRows,all107TablesExactPerRootActualRows:true,bootChangeExplicitlySeparated:true,noCrossBootPIDKill:true,ACLRestored:true,onlyNewPG15StoppedVolumeRetained:true},schema:{existingValidatedPredicatesIndependentlyCompared:168,finitePostgreSQLFormattingCanonicalizationEqual:true,remainingOriginalDumpStatements:0,DDLExecutedByRoot:false},common:{RustPassed:232,RustIgnored:54,NativePassed:863,AdminUTCPassed:368,AdminJSTOriginalFailureRetained:true},primaryPreservation:{receipt:pin(preservationFile),memberCount:732,bytes:211083968,sourceAndDestinationHashesIndependentlyMatched:true,privateRead:false},limits:{noLiveRuntimeOrPrivateAccess:true,noBuildProductTestsOrBrowserExecution:true,actualRuntimeAssertionsComeFromRootSavedOriginals:true},G3Certified:false,G4Certified:false};
fs.writeFileSync('tmp/rust-r3ab/c-review/g3-public-verification01.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:result.result,publicFilesHashed:checked.size,stagedRawSourceFiles:result.stagedRawSourceFiles,UI:uiSummaries.map(c=>({label:c.label,HTTP:c.HTTP})),closedMissingFaults:6,cohorts:10,privateRead:false,G3Certified:false}));
