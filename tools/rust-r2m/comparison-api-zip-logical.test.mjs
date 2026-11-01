// Public source + original pure planner/reader and deterministic VM writer.
// All rows/journals are in-memory test evidence; no DB/private/HTTP/child work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {buildPreparedPlan} from '../rust-r2k/r4-prepared-source.mjs';
import {readMatureStoreZip,assertHandoverArchive} from './acceptance-api-zip.mjs';
import {zipLogicalOriginalSourcePins,assertZipLogicalSourcePins,verifyStoreZipUtcDos,verifyKLogicalReferenceSite} from './comparison-api-zip-logical.mjs';

const require=createRequire(import.meta.url),ts=require('typescript'),sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value,digest=value=>sha(JSON.stringify(canonical(value)));
const id=n=>'a0000000-0000-4000-8000-'+String(n).padStart(12,'0'),RUN=id(1),CAP='r2m-pure-zip-logical-source01',AT=Date.parse('2026-10-31T03:00:01.345Z'),iso=ms=>new Date(ms).toISOString();
const common=()=>({runId:RUN,sourceCapId:CAP,sourcePins:structuredClone(zipLogicalOriginalSourcePins)});
function reader(){const reads=new Map();return{read(file){const raw=readFileSync(file);reads.set(file,sha(raw));return raw;},assertUnchanged(){for(const[file,hash]of reads)assert.equal(sha(readFileSync(file)),hash);}};}
function originalWriter(now=AT){
    const file=zipLogicalOriginalSourcePins[0].file,text=readFileSync(file,'utf8'),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),klass=tree.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='AttachmentService');assert(klass);
    const methods=['buildZipArchive','toDosDateTime','crc32'].map(name=>{const member=klass.members.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(tree)===name);assert(member);return member.getText(tree);}).join('\n');
    const output=ts.transpileModule('class OriginalWriter{'+methods+'}\nmodule.exports=OriginalWriter;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
    class ControlledDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
    vm.runInNewContext(output,{module,Buffer,Date:ControlledDate},{timeout:1000});return new module.exports();
}
function packageFixture(){
    const project=id(2),handover=id(3),pkg=id(4),normal=id(5),sensitive=id(6),selection=id(7),omitted=id(8),actor=id(9),payload=Buffer.from('source-controlled original payload\n'),secret=Buffer.from('sensitive source must never be archived\n'),reason='Security level sensitive is excluded from ordinary handover download packages';
    const sourceRefs=[{sourceType:'project',sourceId:project,relationType:'attachment',label:'original source'}],summary={includedCount:1,excludedCount:1,includedAttachmentIds:[normal],excludedAttachmentIds:[sensitive],excludedReasons:[reason]},item={selectionId:selection,attachmentId:normal,versionGroupId:normal,displayName:'中文.txt',category:'demand',securityLevel:'normal',fileName:'001-中文.txt',sourceRefs};
    const row={id:pkg,project_id:project,handover_id:handover,created_by:actor,status:'ready',storage_provider:'local',storage_key:'poms-r2m/'+RUN+'/attachment-download-packages/pure.zip',created_at:iso(AT-20),expires_at:iso(AT-20+86400000),manifest_summary:summary};
    const manifest={packageId:pkg,handoverId:handover,projectId:project,createdAt:row.created_at,expiresAt:row.expires_at,manifestSummary:summary,items:[item]},entries=[{name:'manifest.json',data:Buffer.from(JSON.stringify(manifest,null,2))},{name:item.fileName,data:payload}];
    const bindings={runId:RUN,project:{id:project},handover:{id:handover},package:{id:pkg},packageAttachment:{id:normal},sensitiveAttachment:{id:sensitive},upload:{package:{bytes:payload},sensitive:{bytes:secret}}};
    const after={rows:{attachment_download_package:[row],attachment:[{id:normal,checksum_sha256:sha(payload),size_bytes:payload.length,updated_at:'2000-01-01T00:00:00.000Z'},{id:sensitive}],project_handover_attachment_selection:[{id:selection,handover_id:handover,attachment_id:normal,status:'included',security_level:'normal',display_name:item.displayName,category:item.category,version_group_id:normal,source_refs:sourceRefs},{id:omitted,handover_id:handover,attachment_id:sensitive,status:'sensitive-excluded',security_level:'sensitive',exclusion_reason:reason}],attachment_download_package_item:[{package_id:pkg,attachment_id:normal,status:'included',file_name:item.fileName,version_group_id:normal,source_refs:sourceRefs},{package_id:pkg,attachment_id:sensitive,status:'excluded',file_name:null,exclusion_reason:reason}]}};
    const context={runId:RUN,caseId:'m4.integration',index:23,op:'m.http'},birth={kind:'mikro-orm-afterCreate-outer-commit',createContext:context,commitContext:{...context}};
    const typedPackageProof={kind:'R2M-comparison-owned-row-proof',namespace:'poms-r2m',runId:RUN,sourceCapId:CAP,ordinaryBirthVerified:true,ownedRow:{table:'attachment_download_package',id:pkg,caseId:'m4.integration',identity:{id:pkg,handover_id:handover,project_id:project,created_by:actor},creationProof:birth,postcondition:{independentlyVisible:true}},creationProofSha256:digest(birth)};
    const bytes=originalWriter().buildZipArchive(entries);
    function input(actual=bytes){const response={bodyBytes:actual,bodyBytesSha256:sha(actual),bodyBytesLength:actual.length},archiveContentProof=assertHandoverArchive({sourceReader:reader(),response,bindings,after});return{...common(),slot:'M4.2.package.archive',archiveBytes:Buffer.from(actual),archiveLength:actual.length,archiveSha256:sha(actual),packageRow:structuredClone(row),typedPackageProof:structuredClone(typedPackageProof),archiveContentProof,readMatureStoreZip:raw=>readMatureStoreZip({sourceReader:reader(),bytes:raw}),writer:{sourceMethod:'AttachmentService.buildZipArchive',context:{...context},window:{startedAt:iso(AT-10),finishedAt:iso(AT+10)}}};}
    return{bytes,entries,input,context};
}
function reject(action,code){assert.throws(action,error=>error.message==='R2M ZIP/logical comparison: '+code&&error.code==='R2M_ZIP_LOGICAL_'+code.toUpperCase());}
function mutateAllDos(bytes,time,date){const out=Buffer.from(bytes),end=out.length-22,central=out.readUInt32LE(end+16),count=out.readUInt16LE(end+10);let cursor=central;for(let i=0;i<count;i++){const local=out.readUInt32LE(cursor+42);if(time!==undefined){out.writeUInt16LE(time,local+10);out.writeUInt16LE(time,cursor+12);}if(date!==undefined){out.writeUInt16LE(date,local+12);out.writeUInt16LE(date,cursor+14);}cursor+=46+out.readUInt16LE(cursor+28);}return out;}

async function logicalFixture(){
    const fixture={key:'r2m_pure_zip_logical',projectNo:'M-K-PURE',projectName:'Original K source-only synthetic plan',contractNo:'M-K-C-PURE',handoverStatus:'draft',confirmedReceiptAmount:'100000',receiptRecordId:id(30)};
    const keys=['projectId','contractId','contractSnapshotId','baselineId','diffResultId','readinessPackageId','receivablePlanVersionId','contractSummarySnapshotId','handoverSummarySnapshotId','handoverId','confirmationRecordId'];keys.forEach((key,index)=>fixture[key]=id(index+40));
    const input={fixture,actorId:{adminId:id(10),viewerId:id(11)},orgId:id(12),borrowedDefinitions:{contractSummaryPackageId:'68000000-0000-4000-8000-000000000001',projectHandoverSummaryPackageId:'68000000-0000-4000-8000-000000000002'},participantRowIds:{executionOwner:id(13),salesOwner:id(14)}};
    const k=await buildPreparedPlan(input),declared=[];for(const statement of k.statements.filter(statement=>statement.kind==='INSERT'))for(const token of statement.uuidRefs.filter(token=>token.column==='id'))declared.push({table:statement.table,id:token.uuid});
    const logicalId=fixture.receivablePlanVersionId,row={id:fixture.readinessPackageId,project_id:fixture.projectId,source_baseline_id:fixture.baselineId,initialized_receivable_plan_version_id:logicalId};
    const rebuildInput={...structuredClone(input),fixture:structuredClone(k.recipe.fixture)};
    assert.equal(digest(await buildPreparedPlan(rebuildInput)),digest(k));
    const ref={id:logicalId,role:'receivable-plan-version-no-row',table:'contract_readiness_package',rowId:row.id,column:'initialized_receivable_plan_version_id'},originalPlan={kind:'R2M-original-handover-draft-source-cohort',originalKPlan:k,rebuildInput,rows:declared.map(entry=>({table:entry.table,values:{id:entry.id}})),logicalReferences:[ref]},planId=id(80),intentId=id(81),planHash=digest(originalPlan);
    const sourcePlan={id:planId,caseId:'m4.integration',sourcePlanSha256:planHash,originalPlan,defaultSources:{reader:{file:'tools/rust-r2k/r4-prepared-source.mjs',normalizedLfSha256:'70978ae60f59e1331964894d7ec50abf75060f2b0f1e639667aaac27380b1e36'},originalSeeder:k.source},sourceBoundary:{actualNativeProducerClaimed:false,preparedDraftOnly:true,actualNativeConfirmationRequired:true,sourceTables:[...new Set(k.statements.map(statement=>statement.table))],logicalReceivablePlanRowSynthesized:false},state:'promoted',directCreateIntentId:intentId};
    const captured=declared.map(entry=>({...entry,row:entry.table==='contract_readiness_package'?structuredClone(row):{id:entry.id}})),objects=captured.map(entry=>({table:entry.table,id:entry.id,caseId:'m4.integration',identity:entry.table==='contract_readiness_package'?{id:row.id,project_id:row.project_id,source_baseline_id:row.source_baseline_id}:{id:entry.id},creationProof:{kind:'direct-committed-insert',sourcePlanId:planId,provenance:'prepared-original-seeder-source-not-Native-generated',beforeAbsent:true,transaction:'4294967396',xmin:'100',commitAcknowledged:true,recoveredByXminAndXactStatus:false},postcondition:{independentlyVisible:true,observedXmin:'100'}}));
    const direct={id:intentId,caseId:'m4.integration',rows:declared,beforeAbsent:true,transaction:'4294967396',expectedXmin:'100',captured,state:'promoted',sourcePlanId:planId,provenance:'prepared-original-seeder-source-not-Native-generated',commitAcknowledged:true,independentPostCommitCaptureVerified:true};
    const journal={namespace:'poms-r2m',marker:'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',sourceHead:'9dcfb498b175e9fdaae7584aff1d5d3f93bf814f',runId:RUN,backend:'nest',database:'poms_r2m_nest',objects,preparedBatches:[sourcePlan],directCreates:[direct],logicalReferences:[{...ref,rowOwned:false,caseId:'m4.integration',projectId:row.project_id,sourcePlanId:planId,sourcePlanSha256:planHash}],borrowed:{definitions:[]}};
    return{...common(),ordinaryBirthVerified:true,originalSourcePlanVerified:true,journal,row,site:{table:ref.table,rowId:row.id,column:ref.column}};
}
function refreshPlan(input){const plan=input.journal.preparedBatches[0];plan.sourcePlanSha256=digest(plan.originalPlan);input.journal.logicalReferences[0].sourcePlanSha256=plan.sourcePlanSha256;}

test('all10 original source pins match current public sources; missing/change/duplicate fail',()=>{
    const pins=zipLogicalOriginalSourcePins.map(pin=>({...pin,rawBytesSha256:sha(readFileSync(pin.file))}));assert.equal(assertZipLogicalSourcePins(pins,'zip'),true);assert.equal(assertZipLogicalSourcePins(pins,'logical'),true);
    reject(()=>assertZipLogicalSourcePins(pins.slice(1),'zip'),'source_pin_count');reject(()=>assertZipLogicalSourcePins([...pins,pins[0]],'zip'),'source_pin_count');const changed=structuredClone(pins);changed[0].rawBytesSha256='0'.repeat(64);reject(()=>assertZipLogicalSourcePins(changed,'zip'),'source_pin_changed');
});
test('original TS writer + actual mature reader certify DOS sites only, with exact full layout/payload proof',()=>{
    const f=packageFixture(),input=f.input(),proof=verifyStoreZipUtcDos(input);assert.equal(proof.oneWriterInstantForAllMembers,true);assert.equal(proof.allOriginalHeaderBytesAndMemberOrderVerified,true);assert.equal(proof.comparisonSites.length,4);assert.equal(proof.bucketStartedAt,'2026-10-31T03:00:00.000Z');assert.equal(proof.bucketEndExclusive,'2026-10-31T03:00:02.000Z');assert.equal(proof.wholeArchiveOpaqueAliasGranted,false);assert.equal(proof.ownershipGranted,false);assert(input.archiveBytes.equals(f.bytes));
    assert.notEqual(Date.parse(input.packageRow.created_at),AT); // writer time is not a per-entry modifiedAt or package-created equality
});
test('DOS bucket is half-open and must intersect actual source-create window',()=>{
    let input=packageFixture().input();input.writer.window={startedAt:'2026-10-31T03:00:02.000Z',finishedAt:'2026-10-31T03:00:02.010Z'};reject(()=>verifyStoreZipUtcDos(input),'dos_bucket_outside_writer_window');
    input=packageFixture().input();input.writer.window={startedAt:'2026-10-31T02:59:59.999Z',finishedAt:'2026-10-31T03:00:00.000Z'};assert.equal(verifyStoreZipUtcDos(input).writerWindowIntersectsBucket,true);
    input=packageFixture().input();input.writer.window={startedAt:'2026-10-31T03:00:00.000Z',finishedAt:'2026-10-31T02:59:59.999Z'};reject(()=>verifyStoreZipUtcDos(input),'writer_window');
});
test('local/central DOS mismatch or different member timestamp cannot pass mature reader gap',()=>{
    const f=packageFixture(),end=f.bytes.length-22,central=f.bytes.readUInt32LE(end+16);
    for(const offset of[10,central+12,central+46+Buffer.byteLength('manifest.json')+12]){const bad=Buffer.from(f.bytes);bad.writeUInt16LE(bad.readUInt16LE(offset)^1,offset);const input=f.input(bad);input.writer.window={startedAt:iso(AT-3000),finishedAt:iso(AT+3000)};reject(()=>verifyStoreZipUtcDos(input),'original_header_or_member_layout');}
});
test('impossible DOS seconds/calendar and same-but-outside actual window are rejected',()=>{
    const f=packageFixture();let bad=mutateAllDos(f.bytes,(3<<11)|31,undefined);reject(()=>verifyStoreZipUtcDos(f.input(bad)),'dos_calendar');
    bad=mutateAllDos(f.bytes,undefined,((2026-1980)<<9)|(2<<5)|30);reject(()=>verifyStoreZipUtcDos(f.input(bad)),'dos_calendar');
    const later=originalWriter(AT+60000).buildZipArchive(f.entries);reject(()=>verifyStoreZipUtcDos(f.input(later)),'dos_bucket_outside_writer_window');
});
test('writer version/disk/internal/external/EOCD layouts remain exact rather than dropped',()=>{
    const f=packageFixture(),end=f.bytes.length-22,central=f.bytes.readUInt32LE(end+16);
    for(const offset of[4,central+4,central+6,central+34,central+36,central+38]){const bad=Buffer.from(f.bytes);bad[offset]^=1;reject(()=>verifyStoreZipUtcDos(f.input(bad)),'original_header_or_member_layout');}
    const trailing=Buffer.concat([f.bytes,Buffer.from('unaccounted')]),input=f.input();input.archiveBytes=trailing;input.archiveLength=trailing.length;input.archiveSha256=sha(trailing);input.archiveContentProof.actualArchiveSha256=input.archiveSha256;reject(()=>verifyStoreZipUtcDos(input),'mature_reader_rejected');
});
test('complete archive hash/length bind before calling reader, and reader failures preserve original cause privately',()=>{
    let input=packageFixture().input(),calls=0;input.readMatureStoreZip=()=>{calls++;throw new Error('private parser sentinel');};input.archiveSha256='0'.repeat(64);reject(()=>verifyStoreZipUtcDos(input),'archive_complete_bytes');assert.equal(calls,0);
    input=packageFixture().input();const original=new Error('private parser sentinel');input.readMatureStoreZip=()=>{calls++;throw original;};assert.throws(()=>verifyStoreZipUtcDos(input),error=>error.code==='R2M_ZIP_LOGICAL_MATURE_READER_REJECTED'&&error.cause===original&&!Object.keys(error).includes('cause'));assert.equal(calls,1);
});
test('injected mature reader mutation or false membership/content receipts are not accepted',()=>{
    let input=packageFixture().input(),read=input.readMatureStoreZip;input.readMatureStoreZip=raw=>{const parsed=read(raw);raw[0]^=1;return parsed;};reject(()=>verifyStoreZipUtcDos(input),'mature_reader_mutated_bytes');
    input=packageFixture().input();input.archiveContentProof.entries[1].sha256='0'.repeat(64);reject(()=>verifyStoreZipUtcDos(input),'archive_content_entry_binding');
    input=packageFixture().input();input.archiveContentProof.actualUploadedSourceBytesEqual=false;reject(()=>verifyStoreZipUtcDos(input),'archive_content_proof');
});
test('package ordinary birth/outer COMMIT/index and manifest physical version are independently bound',()=>{
    let input=packageFixture().input();input.typedPackageProof.ordinaryBirthVerified=false;reject(()=>verifyStoreZipUtcDos(input),'package_typed_proof');
    input=packageFixture().input();input.writer.context.index++;reject(()=>verifyStoreZipUtcDos(input),'writer_source_context');
    input=packageFixture().input();input.typedPackageProof.ownedRow.creationProof.commitContext.index++;input.typedPackageProof.creationProofSha256=digest(input.typedPackageProof.ownedRow.creationProof);reject(()=>verifyStoreZipUtcDos(input),'package_outer_commit');
    input=packageFixture().input();input.packageRow.created_at=iso(AT-19);input.packageRow.expires_at=iso(AT-19+86400000);reject(()=>verifyStoreZipUtcDos(input),'archive_physical_manifest_clock');
});
test('physical24h TTL retains PG microseconds while original manifest uses its separate JS Date millisecond projection',()=>{
    for(const suffix of['.325001Z','.3251Z','.325001+08:00']){
        const input=packageFixture().input(),localHour=suffix.endsWith('+08:00')?'11':'03';input.packageRow.created_at='2026-10-31T'+localHour+':00:01'+suffix;input.packageRow.expires_at='2026-11-01T'+localHour+':00:01'+suffix;
        const proof=verifyStoreZipUtcDos(input);assert.equal(proof.physicalPackageTtlExact,true);assert.equal(proof.physicalPackageTtlMicroseconds,'86400000000');assert.equal(proof.manifestClockProjection,'original-JavaScript-Date-milliseconds');
    }
});
test('one-microsecond physical TTL excess/deficit cannot hide behind equal Date.parse millisecond projections',()=>{
    for(const fraction of['325002','325000']){const input=packageFixture().input();input.packageRow.created_at='2026-10-31T03:00:01.325001Z';input.packageRow.expires_at='2026-11-01T03:00:01.'+fraction+'Z';assert.equal(Date.parse(input.packageRow.expires_at)-Date.parse(input.packageRow.created_at),86400000);reject(()=>verifyStoreZipUtcDos(input),'archive_physical_manifest_clock');}
    const input=packageFixture().input();input.packageRow.created_at='2026-10-31T03:00:01.3251Z';input.packageRow.expires_at='2026-11-01T03:00:01.325101Z';assert.equal(Date.parse(input.packageRow.expires_at)-Date.parse(input.packageRow.created_at),86400000);reject(()=>verifyStoreZipUtcDos(input),'archive_physical_manifest_clock');
});
test('original K pure plan/direct cohort yields only one exact row/column comparison site',async()=>{
    const input=await logicalFixture(),proof=verifyKLogicalReferenceSite(input);assert.deepEqual(proof.site,input.site);assert.equal(proof.logicalRowOwned,false);assert.equal(proof.globalUuidAliasGranted,false);assert.equal(proof.cleanupPermission,false);assert.equal(proof.ownershipGranted,false);assert.equal(proof.wholeOriginalDirectCohortCommittedAndVisible,true);assert(!('logicalId' in proof));assert(!('idAlias' in proof));
});
test('wrong column/table/row, NULL or nested site never receives the logical alias',async()=>{
    for(const edit of[i=>i.site.column='other_column',i=>i.site.table='attachment_link',i=>i.site.rowId=id(999),i=>i.site.path=['json','id'],i=>i.row.initialized_receivable_plan_version_id=null]){const input=await logicalFixture();edit(input);assert.throws(()=>verifyKLogicalReferenceSite(input),error=>error.code.startsWith('R2M_ZIP_LOGICAL_'));}
});
test('planned/rolled-back/absent/outcome-unknown or incompletely visible cohort has no logical comparison authority',async()=>{
    for(const state of['planned-not-executed','executing','commit-attempted','committed','rolled-back','absent','outcome-unknown']){const input=await logicalFixture();input.journal.preparedBatches[0].state=state;reject(()=>verifyKLogicalReferenceSite(input),'logical_plan_digest_or_state');}
    let input=await logicalFixture();input.journal.directCreates[0].independentPostCommitCaptureVerified=false;reject(()=>verifyKLogicalReferenceSite(input),'logical_direct_commit');
    input=await logicalFixture();input.journal.objects.at(-1).postcondition.independentlyVisible=false;reject(()=>verifyKLogicalReferenceSite(input),'logical_owned_direct_birth');
});
test('logical UUID cannot be an owned row, borrowed definition, or run identity',async()=>{
    let input=await logicalFixture();input.journal.objects.push({table:'project',id:input.row.initialized_receivable_plan_version_id});reject(()=>verifyKLogicalReferenceSite(input),'logical_not_owned_or_borrowed');
    input=await logicalFixture();input.journal.borrowed.definitions.push({id:input.row.initialized_receivable_plan_version_id});reject(()=>verifyKLogicalReferenceSite(input),'logical_not_owned_or_borrowed');
});
test('exact sourcePlan digest, boundary and original SQL/token occurrence remain required',async()=>{
    let input=await logicalFixture();input.journal.preparedBatches[0].sourcePlanSha256='0'.repeat(64);reject(()=>verifyKLogicalReferenceSite(input),'logical_plan_digest_or_state');
    input=await logicalFixture();input.journal.preparedBatches[0].sourceBoundary.logicalReceivablePlanRowSynthesized=true;reject(()=>verifyKLogicalReferenceSite(input),'logical_source_boundary');
    input=await logicalFixture();input.journal.preparedBatches[0].originalPlan.originalKPlan.statements[0].sql+=' SELECT 1';refreshPlan(input);reject(()=>verifyKLogicalReferenceSite(input),'logical_statement_binding');
    input=await logicalFixture();const k=input.journal.preparedBatches[0].originalPlan.originalKPlan;k.statements[0].uuidRefs.push({uuid:input.row.initialized_receivable_plan_version_id,column:'unlisted',rowIndex:0});refreshPlan(input);reject(()=>verifyKLogicalReferenceSite(input),'logical_single_original_occurrence');
});
test('a source-shaped logical ref cannot replace actual captured row/direct COMMIT/xmin proofs',async()=>{
    let input=await logicalFixture();input.journal.directCreates[0].captured.find(entry=>entry.table==='contract_readiness_package').row.initialized_receivable_plan_version_id=id(999);reject(()=>verifyKLogicalReferenceSite(input),'logical_actual_direct_site');
    input=await logicalFixture();input.journal.directCreates[0].commitAcknowledged=false;reject(()=>verifyKLogicalReferenceSite(input),'logical_direct_commit');
    input=await logicalFixture();input.journal.directCreates[0].expectedXmin='101';reject(()=>verifyKLogicalReferenceSite(input),'logical_direct_xmin');
    input=await logicalFixture();input.journal.objects[0].creationProof.sourcePlanId=id(999);reject(()=>verifyKLogicalReferenceSite(input),'logical_owned_direct_birth');
});
test('omitted original cohort PK or changed rebuild fixture cannot be hidden by a recomputed source-plan hash',async()=>{
    let input=await logicalFixture();input.journal.preparedBatches[0].originalPlan.rows.pop();refreshPlan(input);reject(()=>verifyKLogicalReferenceSite(input),'logical_original_cohort_rows');
    input=await logicalFixture();input.journal.preparedBatches[0].originalPlan.rebuildInput.fixture.projectName='changed';refreshPlan(input);reject(()=>verifyKLogicalReferenceSite(input),'logical_rebuild_fixture');
});
test('Root ordinary/source-plan attestation and new-M marker remain explicit comparison prerequisites',async()=>{
    let input=await logicalFixture();input.ordinaryBirthVerified=false;reject(()=>verifyKLogicalReferenceSite(input),'logical_journal');
    input=await logicalFixture();input.originalSourcePlanVerified=false;reject(()=>verifyKLogicalReferenceSite(input),'logical_journal');
    input=await logicalFixture();input.journal.marker=id(999);reject(()=>verifyKLogicalReferenceSite(input),'logical_journal');
});
test('the precise existing recovered-committed direct proof is reusable after promotion',async()=>{
    const input=await logicalFixture(),direct=input.journal.directCreates[0];direct.commitAcknowledged=false;direct.recoveredCommittedStatus=true;for(const row of input.journal.objects){row.creationProof.commitAcknowledged=false;row.creationProof.recoveredByXminAndXactStatus=true;}assert.equal(verifyKLogicalReferenceSite(input).wholeOriginalDirectCohortCommittedAndVisible,true);
});
