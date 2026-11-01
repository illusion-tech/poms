// Pure supplement to the pinned mature STORE/CRC reader and original K cohort.
// Caller supplies complete actual bytes/rows/proofs. No env/fs/DB/network access.
import {createHash} from 'node:crypto';

const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Object.prototype.toString.call(value)==='[object Date]'?value.toISOString():Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>{let text;try{text=JSON.stringify(canonical(value));}catch(error){fail('canonical_json',error);}check(typeof text==='string','canonical_json');return sha(text);};
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const hex=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)&&!Buffer.isBuffer(value);
const MARKER='abd093b8-c584-45b3-9c62-6357ad6dfa5d',TABLE='contract_readiness_package',COLUMN='initialized_receivable_plan_version_id';
const SEEDER='apps/poms-api/src/seeders/database.seeder.ts',READER='tools/rust-r2k/r4-prepared-source.mjs';
const SEEDER_SHA='c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd',READER_SHA='70978ae60f59e1331964894d7ec50abf75060f2b0f1e639667aaac27380b1e36';
export const zipLogicalOriginalSourcePins=Object.freeze([
    {scope:'zip',file:'apps/poms-api/src/app/features/attachment/attachment.service.ts',rawBytesSha256:'b5362da2690283fa930740bf3dbbdc77f56a7429613d64394bd726094cd9cbf2'},
    {scope:'zip',file:'tools/rust-r2k/k-ui-browser.mjs',rawBytesSha256:'07338ba55c91c1593c5e1713f007f4e6eef3959ecc7d73772b82d1fdc012e2bf'},
    {scope:'zip',file:'tools/rust-r2m-continuation01/acceptance-api-zip.mjs',rawBytesSha256:'a50ace3ccbcd46e3c5930ab5d8840edb47cb229fe5928b1cb8c04ed477eb5e74'},
    {scope:'logical',file:READER,rawBytesSha256:READER_SHA},
    {scope:'logical',file:SEEDER,rawBytesSha256:SEEDER_SHA},
    {scope:'logical',file:'tools/rust-r2m-continuation01/fixture-handover-prepared.mjs',rawBytesSha256:'cc05a655e20a42ba1dd7454491dea22448b33c4e8f2c3b34b5a1ba851047b10d'},
    {scope:'logical',file:'tools/rust-r2m-continuation01/fixture.mjs',rawBytesSha256:'2dc2436613b1ff4b5cb8a80c0c76acc8e6e724cc2d6a51a282f4344fad29860c'},
    {scope:'logical',file:'tools/rust-r2m-continuation01/fixture-references.mjs',rawBytesSha256:'9cc9e69185f956cd8b566d45dc9c4f6979f999405b9a59a747003bd9e0e4c6b6'},
    {scope:'logical',file:'tools/rust-r2m-continuation01/fixture-journal.mjs',rawBytesSha256:'48786e51f92013c4c50659af68462055f9d96e11c633b48b16a56263f8823a1e'},
    {scope:'logical',file:'tools/rust-r2m-continuation01/fixture-policy.mjs',rawBytesSha256:'32a0b93e12023a7dc4c82ba16259275b0d902cdd42593f813072fe780be0aa97'}
].map(Object.freeze));
function fail(code,cause){const error=new Error('R2M ZIP/logical comparison: '+code,cause?{cause}:undefined);error.code='R2M_ZIP_LOGICAL_'+code.toUpperCase();throw error;}
function check(condition,code){if(!condition)fail(code);}
const equal=(a,b,code)=>check(digest(a)===digest(b),code);
function exactly(rows,predicate,code){check(Array.isArray(rows),code);const found=rows.filter(predicate);check(found.length===1,code);return found[0];}
function exactKeys(value,keys,code){check(record(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),code);}
export function assertZipLogicalSourcePins(pins,scope){check(['zip','logical'].includes(scope)&&Array.isArray(pins),'source_pin_scope');for(const expected of zipLogicalOriginalSourcePins.filter(pin=>pin.scope===scope)){const pin=exactly(pins,row=>row?.file===expected.file,'source_pin_count');check(pin.rawBytesSha256===expected.rawBytesSha256,'source_pin_changed');}return true;}
function common(input,scope){check(record(input)&&uuid(input.runId)&&typeof input.sourceCapId==='string'&&/^r2m-[a-z0-9-]{1,80}$/.test(input.sourceCapId),'context');assertZipLogicalSourcePins(input.sourcePins,scope);}
function milliseconds(value,code){check(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value),code);const time=Date.parse(value);check(Number.isFinite(time)&&new Date(time).toISOString()===value,code);return time;}
function actualWindow(window){check(record(window),'writer_window');const start=milliseconds(window.startedAt,'writer_window'),end=milliseconds(window.finishedAt,'writer_window');check(start<=end,'writer_window');return{start,end};}
function physicalPackageTime(value){
    check(typeof value==='string','archive_physical_manifest_clock');const parts=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|([+-])(\d\d):(\d\d))$/.exec(value);check(parts,'archive_physical_manifest_clock');
    const hours=Number(parts[5]??0),minutes=Number(parts[6]??0);check(hours<=23&&minutes<=59,'archive_physical_manifest_clock');const baseMs=Date.parse(parts[1]+parts[3]),offset=(hours*60+minutes)*(parts[4]==='-'?-1:1);check(Number.isFinite(baseMs)&&new Date(baseMs+offset*60000).toISOString().slice(0,19)===parts[1],'archive_physical_manifest_clock');
    const fraction=(parts[2]??'').padEnd(6,'0');return{microseconds:BigInt(baseMs)*1000n+BigInt(fraction),jsMilliseconds:baseMs+Number(fraction.slice(0,3))};
}
function sourceContext(a,b){return record(a)&&record(b)&&['runId','caseId','index','op'].every(key=>a[key]===b[key]);}
function packageProof(input){
    const row=input.packageRow,proof=input.typedPackageProof,owned=proof?.ownedRow;
    check(record(row)&&uuid(row.id)&&proof?.kind==='R2M-comparison-owned-row-proof'&&proof.namespace==='poms-r2m'&&proof.runId===input.runId&&proof.sourceCapId===input.sourceCapId&&proof.ordinaryBirthVerified===true,'package_typed_proof');
    check(owned?.table==='attachment_download_package'&&owned.id===row.id&&owned.caseId==='m4.integration'&&owned.postcondition?.independentlyVisible===true,'package_owned_row');
    exactKeys(owned.identity,['id','handover_id','project_id','created_by'],'package_identity_shape');for(const key of Object.keys(owned.identity))check(owned.identity[key]===row[key],'package_identity_value');
    const birth=owned.creationProof;check(record(birth)&&hex(proof.creationProofSha256)&&digest(birth)===proof.creationProofSha256&&['mikro-orm-afterCreate-outer-commit','pg-after-insert-observed-outer-commit'].includes(birth.kind),'package_birth');
    const context=birth.createContext;check(context?.runId===input.runId&&context.caseId===owned.caseId&&Number.isSafeInteger(context.index)&&context.index>=0&&['m.http','m.producer'].includes(context.op),'package_birth_context');
    if(birth.kind==='mikro-orm-afterCreate-outer-commit')check(sourceContext(context,birth.commitContext),'package_outer_commit');
    check(input.writer?.sourceMethod==='AttachmentService.buildZipArchive'&&sourceContext(input.writer.context,context),'writer_source_context');return row;
}
function decodeDos(dosTime,dosDate){
    const second=(dosTime&31)*2,minute=(dosTime>>>5)&63,hour=(dosTime>>>11)&31,day=dosDate&31,month=(dosDate>>>5)&15,year=1980+(dosDate>>>9);
    check(second<=58&&minute<=59&&hour<=23&&day>=1&&day<=31&&month>=1&&month<=12,'dos_calendar');const start=Date.UTC(year,month-1,day,hour,minute,second),date=new Date(start);
    check(date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day,'dos_calendar');return{start,endExclusive:start+2000};
}

export function verifyStoreZipUtcDos(input){
    common(input,'zip');check(input.slot==='M4.2.package.archive','archive_slot');const pkg=packageProof(input),raw=input.archiveBytes;
    check(Buffer.isBuffer(raw)&&raw.length>22&&raw.length<=32*1024*1024&&raw.length===input.archiveLength&&hex(input.archiveSha256)&&sha(raw)===input.archiveSha256,'archive_complete_bytes');
    const content=input.archiveContentProof;check(content?.kind==='actual-R2M-mature-K-ZIP-and-source-payload-verification'&&content.matureKReaderReused===true&&content.actualArchiveSha256===input.archiveSha256&&content.packageId===pkg.id&&content.projectId===pkg.project_id&&content.handoverId===pkg.handover_id&&content.allLocalCentralAndCrcChecks===true&&content.actualUploadedSourceBytesEqual===true&&content.sourceRefsAndPackageItemsEqual===true,'archive_content_proof');
    check(typeof input.readMatureStoreZip==='function','mature_reader_required');let parsed;const readerInput=Buffer.from(raw);
    try{parsed=input.readMatureStoreZip(readerInput);}catch(error){fail('mature_reader_rejected',error);}
    check(sha(readerInput)===input.archiveSha256,'mature_reader_mutated_bytes');check(parsed?.matureKReaderReused===true&&parsed.readerSource?.file==='tools/rust-r2k/k-ui-browser.mjs'&&parsed.readerSource.rawBytesSha256===zipLogicalOriginalSourcePins[1].rawBytesSha256&&Array.isArray(parsed.entries)&&parsed.entries.length>1,'mature_reader_shape');
    check(Array.isArray(content.entries)&&content.entries.length===parsed.entries.length,'archive_entry_count');const entries=parsed.entries;
    for(const[index,entry]of entries.entries()){
        check(typeof entry.name==='string'&&Buffer.isBuffer(entry.data)&&entry.bytes===entry.data.length&&hex(entry.sha256)&&entry.sha256===sha(entry.data)&&Number.isInteger(entry.crc32)&&entry.crc32>=0&&entry.crc32<=0xffffffff,'mature_entry_shape');
        equal(content.entries[index],{name:entry.name,bytes:entry.bytes,sha256:entry.sha256,crc32:entry.crc32},'archive_content_entry_binding');
    }
    check(entries[0].name==='manifest.json'&&content.manifestSha256===entries[0].sha256&&parsed.manifest?.packageId===pkg.id&&parsed.manifest.handoverId===pkg.handover_id&&parsed.manifest.projectId===pkg.project_id,'archive_manifest_binding');
    const created=physicalPackageTime(pkg.created_at),expires=physicalPackageTime(pkg.expires_at);check(pkg.status==='ready'&&pkg.storage_provider==='local'&&expires.microseconds-created.microseconds===86400000000n&&parsed.manifest.createdAt===new Date(created.jsMilliseconds).toISOString()&&parsed.manifest.expiresAt===new Date(expires.jsMilliseconds).toISOString(),'archive_physical_manifest_clock');
    check(raw.length>=30,'archive_local_header');const dosTime=raw.readUInt16LE(10),dosDate=raw.readUInt16LE(12),bucket=decodeDos(dosTime,dosDate),window=actualWindow(input.writer.window);
    check(bucket.start<=window.end&&bucket.endExclusive>window.start,'dos_bucket_outside_writer_window');
    // Reconstruct only the original fixed header layout over mature verified
    // members. The mature reader owns parsing/STORE/CRC; it exposes no offsets.
    const localParts=[],centralParts=[],sites=[];let localOffset=0;
    for(const[index,entry]of entries.entries()){
        const name=Buffer.from(entry.name,'utf8'),local=Buffer.alloc(30),central=Buffer.alloc(46);
        check(name.length<=65535&&entry.data.length<=0xffffffff,'zip32_limits');
        local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(0,8);local.writeUInt16LE(dosTime,10);local.writeUInt16LE(dosDate,12);local.writeUInt32LE(entry.crc32,14);local.writeUInt32LE(entry.bytes,18);local.writeUInt32LE(entry.bytes,22);local.writeUInt16LE(name.length,26);local.writeUInt16LE(0,28);
        central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(0,10);central.writeUInt16LE(dosTime,12);central.writeUInt16LE(dosDate,14);central.writeUInt32LE(entry.crc32,16);central.writeUInt32LE(entry.bytes,20);central.writeUInt32LE(entry.bytes,24);central.writeUInt16LE(name.length,28);central.writeUInt16LE(0,30);central.writeUInt16LE(0,32);central.writeUInt16LE(0,34);central.writeUInt16LE(0,36);central.writeUInt32LE(0,38);central.writeUInt32LE(localOffset,42);
        sites.push({entryIndex:index,section:'local',offset:localOffset+10,length:4});localParts.push(local,name,entry.data);centralParts.push(central,name);localOffset+=30+name.length+entry.bytes;
    }
    check(entries.length<=65535,'zip32_limits');const directory=Buffer.concat(centralParts),end=Buffer.alloc(22);let centralOffset=localOffset;
    for(const[index,entry]of entries.entries()){sites.push({entryIndex:index,section:'central',offset:centralOffset+12,length:4});centralOffset+=46+Buffer.byteLength(entry.name,'utf8');}
    end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(localOffset,16);end.writeUInt16LE(0,20);
    const expected=Buffer.concat([...localParts,directory,end]);check(raw.equals(expected),'original_header_or_member_layout');
    return Object.freeze({kind:'R2M-source-verified-STORE-ZIP-UTC-DOS-sites',sourceCapId:input.sourceCapId,slot:input.slot,archiveSha256:input.archiveSha256,archiveLength:raw.length,packageId:pkg.id,entries:Object.freeze(entries.map(({name,bytes,sha256,crc32})=>Object.freeze({name,bytes,sha256,crc32}))),dosTime,dosDate,bucketStartedAt:new Date(bucket.start).toISOString(),bucketEndExclusive:new Date(bucket.endExclusive).toISOString(),writerWindowIntersectsBucket:true,oneWriterInstantForAllMembers:true,allOriginalHeaderBytesAndMemberOrderVerified:true,physicalPackageTtlExact:true,physicalPackageTtlMicroseconds:'86400000000',manifestClockProjection:'original-JavaScript-Date-milliseconds',comparisonSites:Object.freeze(sites.map(Object.freeze)),siteLabel:'source-created-UTC-DOS-two-second-bucket',wholeArchiveOpaqueAliasGranted:false,ownershipGranted:false});
}

function journalContext(input){
    const journal=input.journal;check(input.ordinaryBirthVerified===true&&input.originalSourcePlanVerified===true&&journal?.namespace==='poms-r2m'&&journal.marker===MARKER&&journal.sourceHead==='9dcfb498b175e9fdaae7584aff1d5d3f93bf814f'&&journal.runId===input.runId&&['nest','rust'].includes(journal.backend)&&journal.database==='poms_r2m_c01_'+journal.backend,'logical_journal');
    for(const key of['objects','preparedBatches','directCreates','logicalReferences'])check(Array.isArray(journal[key]),'logical_journal_arrays');return journal;
}
export function verifyKLogicalReferenceSite(input){
    common(input,'logical');const journal=journalContext(input),row=input.row,site=input.site;exactKeys(site,['table','rowId','column'],'logical_exact_site');
    check(site.table===TABLE&&site.column===COLUMN&&uuid(site.rowId)&&record(row)&&row.id===site.rowId&&uuid(row[COLUMN]),'logical_physical_site');
    const logicalId=row[COLUMN],ref=exactly(journal.logicalReferences,entry=>entry.id===logicalId,'logical_reference_unique');
    check(ref.role==='receivable-plan-version-no-row'&&ref.rowOwned===false&&ref.caseId==='m4.integration'&&ref.table===TABLE&&ref.column===COLUMN&&ref.rowId===row.id&&ref.projectId===row.project_id&&uuid(ref.sourcePlanId),'logical_ledger_site');
    check(logicalId!==input.runId&&!journal.objects.some(object=>object.id===logicalId)&&!journal.borrowed?.definitions?.some(object=>object.id===logicalId)&&!['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014','68000000-0000-4000-8000-000000000001','68000000-0000-4000-8000-000000000002','69000000-0000-4000-8000-000000000003'].includes(logicalId),'logical_not_owned_or_borrowed');
    const plan=exactly(journal.preparedBatches,entry=>entry.id===ref.sourcePlanId,'logical_source_plan'),original=plan.originalPlan;
    check(plan.caseId===ref.caseId&&plan.state==='promoted'&&hex(plan.sourcePlanSha256)&&plan.sourcePlanSha256===ref.sourcePlanSha256&&digest(original)===plan.sourcePlanSha256,'logical_plan_digest_or_state');
    check(original?.kind==='R2M-original-handover-draft-source-cohort'&&Array.isArray(original.rows)&&original.rows.length>0,'logical_original_plan_kind');
    const expectedRef={id:logicalId,role:ref.role,table:TABLE,rowId:row.id,column:COLUMN};equal(original.logicalReferences,[expectedRef],'logical_original_reference');
    const boundary=plan.sourceBoundary;check(boundary?.actualNativeProducerClaimed===false&&boundary.preparedDraftOnly===true&&boundary.actualNativeConfirmationRequired===true&&boundary.logicalReceivablePlanRowSynthesized===false,'logical_source_boundary');
    check(plan.defaultSources?.reader?.file===READER&&plan.defaultSources.reader.normalizedLfSha256===READER_SHA,'logical_original_reader');
    const k=original.originalKPlan;check(k?.kind==='originalSeeder-prepared-state-pure-source-plan'&&k.result==='pure-plan'&&k.recipe?.entry==='seedProjectHandoverE2EFixture'&&(!k.recipe.fixture.handoverStatus||k.recipe.fixture.handoverStatus==='draft'),'logical_original_k_plan');
    check(k.source?.file===SEEDER&&k.source.rawBytesSha256===SEEDER_SHA&&k.source.normalizedLfSha256===SEEDER_SHA,'logical_original_seeder');equal(plan.defaultSources.originalSeeder,k.source,'logical_seeder_binding');
    check(k.boundary?.actualSqlExecutions===0&&k.boundary.definitionInsertOrUpsert===false&&k.boundary.receivablePlanTableSynthesized===false&&k.boundary.ownershipOrCommitCertified===false,'logical_pure_source_boundary');equal(k.recipe.conditionalSourceExecuted,[],'logical_conditional_source');
    check(k.recipe.fixture.receivablePlanVersionId===logicalId&&k.recipe.fixture.readinessPackageId===row.id&&k.recipe.fixture.projectId===row.project_id&&k.recipe.fixture.baselineId===row.source_baseline_id,'logical_recipe_site');
    check(Array.isArray(k.statements),'logical_statements');equal(boundary.sourceTables,[...new Set(k.statements.map(statement=>statement.table))],'logical_source_tables');
    equal(original.rebuildInput?.fixture,k.recipe.fixture,'logical_rebuild_fixture');
    const occurrences=[],originalDeclared=[],sourceTables=new Set(['project','contract','contract_term_snapshot','receipt_record','payment_record','commercial_release_baseline','commercial_baseline_diff_result','contract_readiness_package','approval_summary_snapshot','project_handover','confirmation_record','confirmation_participant','project_receipt_judgment_freeze']);
    for(const statement of k.statements){
        check(statement.schema==='poms'&&sourceTables.has(statement.table)&&['INSERT','UPDATE'].includes(statement.kind)&&typeof statement.sql==='string'&&typeof statement.rawSql==='string'&&sha(statement.sql)===statement.sqlSha256&&sha(statement.rawSql)===statement.rawSqlSha256&&Array.isArray(statement.uuidRefs),'logical_statement_binding');
        const pks=statement.uuidRefs.filter(token=>token.column==='id');if(statement.kind==='INSERT'){check(pks.length===statement.rows,'logical_original_pk_count');for(const token of pks)originalDeclared.push({table:statement.table,id:token.uuid});}
        else check(statement.table==='commercial_release_baseline'&&Array.isArray(statement.columns)&&statement.columns.every(column=>['latest_diff_result_id','id'].includes(column)),'logical_original_update');
        for(const token of statement.uuidRefs)if(token.uuid===logicalId)occurrences.push({table:statement.table,column:token.column,rowIndex:token.rowIndex,statement});
    }
    check(occurrences.length===1&&occurrences[0].table===TABLE&&occurrences[0].column===COLUMN&&occurrences[0].statement.kind==='INSERT','logical_single_original_occurrence');
    check(occurrences[0].statement.uuidRefs.some(token=>token.column==='id'&&token.rowIndex===occurrences[0].rowIndex&&token.uuid===row.id),'logical_original_row_occurrence');
    const direct=exactly(journal.directCreates,entry=>entry.id===plan.directCreateIntentId&&entry.sourcePlanId===plan.id,'logical_direct_cohort');
    check(direct.caseId===ref.caseId&&direct.state==='promoted'&&direct.beforeAbsent===true&&direct.independentPostCommitCaptureVerified===true&&(direct.commitAcknowledged===true||direct.recoveredCommittedStatus===true)&&direct.provenance==='prepared-original-seeder-source-not-Native-generated','logical_direct_commit');
    check(/^[0-9]+$/.test(String(direct.transaction))&&String(BigInt(direct.transaction)%4294967296n)===String(direct.expectedXmin),'logical_direct_xmin');
    const declared=original.rows.map(entry=>({table:entry.table,id:entry.values?.id}));check(declared.every(entry=>uuid(entry.id)&&entry.id!==logicalId)&&new Set(declared.map(entry=>entry.table+':'+entry.id)).size===declared.length,'logical_cohort_pk');equal(declared,originalDeclared,'logical_original_cohort_rows');equal(direct.rows,declared,'logical_cohort_rows');
    check(Array.isArray(direct.captured)&&direct.captured.length===declared.length,'logical_cohort_capture');
    for(const declaredRow of declared){
        const captured=exactly(direct.captured,entry=>entry.table===declaredRow.table&&entry.id===declaredRow.id,'logical_captured_row'),owned=exactly(journal.objects,entry=>entry.table===declaredRow.table&&entry.id===declaredRow.id,'logical_owned_cohort_row'),birth=owned.creationProof;
        check(captured.row?.id===declaredRow.id&&owned.caseId===ref.caseId&&owned.postcondition?.independentlyVisible===true&&birth?.kind==='direct-committed-insert'&&birth.sourcePlanId===plan.id&&birth.provenance===direct.provenance&&birth.beforeAbsent===true&&(birth.commitAcknowledged===true||birth.recoveredByXminAndXactStatus===true)&&String(birth.transaction)===String(direct.transaction)&&String(birth.xmin)===String(direct.expectedXmin)&&String(owned.postcondition.observedXmin)===String(direct.expectedXmin),'logical_owned_direct_birth');
    }
    const captured=exactly(direct.captured,entry=>entry.table===TABLE&&entry.id===row.id,'logical_captured_site'),owned=exactly(journal.objects,entry=>entry.table===TABLE&&entry.id===row.id,'logical_owned_site');
    check(captured.row[COLUMN]===logicalId&&captured.row.project_id===row.project_id&&captured.row.source_baseline_id===row.source_baseline_id,'logical_actual_direct_site');exactKeys(owned.identity,['id','project_id','source_baseline_id'],'logical_owned_identity');for(const key of Object.keys(owned.identity))check(owned.identity[key]===row[key]&&owned.identity[key]===captured.row[key],'logical_current_identity');
    return Object.freeze({kind:'R2M-source-verified-K-readiness-logical-reference-site',sourceCapId:input.sourceCapId,sourcePlanId:plan.id,sourcePlanSha256:plan.sourcePlanSha256,site:Object.freeze({table:TABLE,rowId:row.id,column:COLUMN}),comparisonSiteLabel:'K-source-logical-receivable-plan-version',valueSha256:sha(logicalId),singleOriginalOccurrence:true,sourceBoundaryVerified:true,wholeOriginalDirectCohortCommittedAndVisible:true,ordinaryRowOwnershipReused:true,logicalRowOwned:false,globalUuidAliasGranted:false,cleanupPermission:false,ownershipGranted:false});
}
