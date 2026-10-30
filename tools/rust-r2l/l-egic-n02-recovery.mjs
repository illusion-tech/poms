// Dedicated Root/C recovery SOURCE for one failed barrier capture. Import is
// pure. No observer is installed/reopened and no new Native/HTTP producer runs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {LFixture} from './l-fixture.mjs';
import {validateJournal} from './fixture-journal.mjs';
import {assertCreationProof,digest,rowIdentity,uuid,supportedTables} from './fixture-core.mjs';
import {resolveOwnedProjectIds} from './fixture-references.mjs';
import {marker,sourceHead,databaseFor,verifyConnection,validateSource} from './fixture-guard.mjs';
import {ident,verifyFullCatalog} from './catalog-complete.mjs';
import {catalog as full107Catalog} from '../rust-r2c/schema-check.mjs';
const require=createRequire(import.meta.url),sha=value=>createHash('sha256').update(value).digest('hex');
const ROOT='/home/wangzishi/projects/poms-rust-r2l',PRIVATE='/home/wangzishi/.local/share/poms-r2l/private';
const SOURCE='tools/rust-r2l/l-egic-n02-recovery.mjs';
export const egicRecoverySelection=Object.freeze({
    report:'tmp/rust-r2l/commission-http-nest-egic-n02.json',reportSha256:'a87e14b1416335bfdc79e47ba635c472df14b77f69127de816139f4dea6aa93b',
    runId:'5f9a4e99-e170-46f3-a40c-a7a1db3ded7c',caseId:'edge.initial-current-race',tag:'egic-n02',backend:'nest',
    sdkSource:'tools/rust-r2l/k-native-write-witness.mjs',sdkSha256:'4421685beeb559b6bc5e8dd852f8803853a5623409926e00d7d84c85525c6da9',
    pgSource:'tools/rust-r2l/l-pg-create-observer.mjs',pgSha256:'e2d059eb2611027615802078d53cd2dbcd425867aaa5e0cf78eb8c533402e19d',
    nativeSha256:'0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4',
});
const TABLES=['commission_final_settlement_snapshot','commission_rule_explanation_snapshot'];
const PARENTS={commission_final_settlement_snapshot:[['freeze_version_id','commission_role_assignment',false],['gate_review_record_id','commission_gate_review_record',false],['summary_snapshot_id','approval_summary_snapshot',false],['retention_receipt_record_id','receipt_record',true],['departure_exception_decision_id','commission_departure_exception_decision',true],['supersedes_id','commission_final_settlement_snapshot',true]],commission_rule_explanation_snapshot:[['final_settlement_snapshot_id','commission_final_settlement_snapshot',false],['supersedes_id','commission_rule_explanation_snapshot',true]]};
export function assertEgicRecoverySelection(reportSha256,runId) {assert.equal(reportSha256,egicRecoverySelection.reportSha256);assert.equal(runId,egicRecoverySelection.runId);return egicRecoverySelection;}
export function assertOriginalPgEventExport(event,exportedEvent) {
    // Both original drain and restore SELECTs include pg_xact_status AS
    // top_status. Compare their complete objects, without projecting fields.
    assert.deepEqual(exportedEvent,event);assert.equal(exportedEvent.top_status,'committed');assert.equal(event.top_status,'committed');
}
export function selectOriginalEgicSdkPair(report) {
    const s=egicRecoverySelection,w=report.nativeFinal?.witness;
    assert.equal(report.runId,s.runId);assert.equal(report.tag,s.tag);assert.equal(report.backend,'nest');assert.equal(report.consumerBackend,'native');
    assert.equal(report.result,'partial');assert.equal(report.marker,marker);assert.equal(report.sourceHead,sourceHead);assert.equal(report.database,databaseFor('nest'));
    assert(w?.complete && w.diagnostics.length===0 && w.openTransactions.length===0 && w.pendingStartCount===0 && report.nativeFinal.pgCaptureComplete===true);
    assert.equal(report.nativeFinal.binaryRawBytesSha256,s.nativeSha256);assert.equal(report.nativeFinal.binaryUnchanged,true);
    const names=['native-witness-final','pg7-observer-restore','native-owner-close','pg7-owner-connection-close','whole-owned-final-facts','fixture-connection-close'];
    assert.deepEqual(report.resourceCloseout.map(x=>x.name).sort(),names.sort());assert(report.resourceCloseout.every(x=>x.result==='pass'));assert.equal(report.cleanup.length,0);
    const matches=w.committed.filter(item=>item.proof.createContext.runId===s.runId && item.proof.createContext.caseId===s.caseId);
    assert.equal(matches.length,2);assert.deepEqual(matches.map(x=>x.table).sort(),[...TABLES].sort());assert.equal(new Set(matches.map(x=>x.id)).size,2);
    assert(matches.every(item=>item.proof.kind==='mikro-orm-afterCreate-outer-commit' && item.proof.sdkVersion==='7.0.11' && item.proof.outerTransaction===matches[0].proof.outerTransaction));
    const batches=report.captureBatches.filter(x=>x.name===s.caseId);assert.equal(batches.length,1);const batch=batches[0];assert.equal(batch.certificates.state,'pending');assert.equal(batch.bindings.length,2);
    const calls=report.requests.filter(q=>q.captureBatch===s.caseId);assert.equal(calls.length,2);assert.deepEqual(calls.map(q=>q.response.status).sort(),[200,500]);
    for(const item of matches) {
        assert.deepEqual(item.proof.commitContext,item.proof.createContext);
        const binding=batch.bindings.find(x=>x.index===item.proof.createContext.index);assert(binding);assert.deepEqual(binding.context,item.proof.createContext);
        const q=calls.find(q=>q.name===s.caseId+'.request-'+binding.offset);assert(q && q.response.status===200 && q.path===binding.route && q.dispatch==='response-durable');
    }
    assert(batch.before.commission_final_settlement_snapshot.length===0 && batch.before.commission_rule_explanation_snapshot.length===0,'This recovery is restricted to the original initial-current pair');
    return {sdk:matches,batch,calls};
}
export function validateSavedEgicEvidence({report,fixtureJournal:j,pgJournal:pg,httpRaw:raw}) {
    const s=egicRecoverySelection,selected=selectOriginalEgicSdkPair(report),registration=report.pgObserverRegistration;
    validateJournal(j,'nest',s.runId);assert.equal(j.state,'prepared');assert.equal(j.namespace,'poms-r2l');assert.equal(supportedTables.length,40);
    assert(j.directCreates.every(x=>['promoted','absent','rolled-back'].includes(x.state)));assert(j.mutations.every(x=>['committed','recovered-committed','rolled-back'].includes(x.state)));
    assert(j.intents.filter(x=>x.state==='planned').every(x=>x.caseId===s.caseId),'A different unresolved case needs an independent recovery review');
    const reportedOwned=Object.entries(report.finalFacts).flatMap(([table,rows])=>rows.map(row=>table+':'+row.id)).sort();assert.deepEqual(j.objects.map(x=>x.table+':'+x.id).sort(),reportedOwned,'Original journal ownership changed after the closed partial report');
    assert.equal(pg.kind,'scoped-pg-after-insert-observer');assert.equal(pg.runId,s.runId);assert.equal(pg.backend,'nest');assert.equal(pg.database,j.database);assert.equal(pg.marker,marker);assert.equal(pg.state,'restored');
    assert.deepEqual(pg.registration,registration);assert.equal(pg.source.file,s.pgSource);assert.equal(pg.source.sha256,s.pgSha256);
    assert.equal(report.pgObserverRestore.observerFootprintRestored,true);assert.equal(report.pgObserverRestore.observerId,pg.observerId);assert.equal(report.pgObserverRestore.observerFootprintCatalogSha256,sha(JSON.stringify(pg.before)));
    const exported=pg.exports.at(-1);assert.equal(exported.events.length,22);assert.equal(exported.sha256,sha(JSON.stringify(exported.events)));assert.equal(exported.sha256,report.pgObserverRestore.eventExportSha256);
    const active=pg.cases.at(-1);assert.equal(active.context.caseId,s.caseId);assert.equal(active.context.runId,s.runId);assert.equal(active.context.op,'l.producer');assert.equal(active.context.index,selected.batch.bindings[0].index);
    assert.equal(active.state,'drained');assert.equal(active.rawEvents.length,2);assert.equal(active.rows.length,2);assert.deepEqual(active.rows.map(x=>x.table).sort(),[...TABLES].sort());
    assert(pg.cases.every(x=>['drained','discarded'].includes(x.state)),'Another observer case is unresolved');
    const scopes=j.cases.filter(x=>x.caseId===s.caseId);assert.equal(scopes.length,1);const caseScope=scopes[0];
    assert.equal(active.scope.requestId,caseScope.requestId);assert.deepEqual([...active.scope.actors].sort(),[...caseScope.actors,...caseScope.borrowedActors].sort());assert.deepEqual([...active.scope.projects].sort(),[...caseScope.projects].sort());
    const registered=j.authorities.find(x=>x.id===registration.id);assert(registered);for(const key of ['kind','observerId','functionOid','approvedDefinitionSha256','source'])assert.deepEqual(registered[key],registration[key]);assert.equal(registered.sourceAuthority,s.pgSha256);
    assert.equal(raw.runId,s.runId);assert.equal(raw.tag,s.tag);assert.equal(raw.result,'partial');
    const batches=raw.captureBatches.filter(x=>x.name===s.caseId);assert.equal(batches.length,1);const pending=batches[0];assert.equal(pending.certification.state,'pending');assert.deepEqual(pending.bindings,selected.batch.bindings);
    assert.deepEqual(pending.intents.map(x=>x.id).sort(),active.scope.intents.map(x=>x.id).sort());
    for(const q of selected.calls) {
        const originals=raw.requests.filter(x=>x.name===q.name);assert.equal(originals.length,1);const original=originals[0];assert.equal(original.dispatch,'response-durable');assert.equal(original.certification.state,'pending');
        const bytes=Buffer.from(original.response.bodyBytesBase64,'base64');assert.equal(sha(bytes),q.response.wireBodySha256);assert.equal(bytes.length,q.response.wireBodyBytes);assert.equal(original.response.status,q.response.status);
        const binding=pending.bindings.find(x=>x.correlationId===original.correlationId);assert(binding);assert.deepEqual(original.context,binding.context);
    }
    const ids=new Set(selected.sdk.map(x=>x.table+':'+x.id));assert(selected.sdk.every(x=>!j.objects.some(o=>o.table===x.table&&o.id===x.id)));
    const pgRows=active.rows;assert(pgRows.every(x=>ids.has(x.table+':'+x.id)));assert.equal(new Set(pgRows.map(x=>x.table+':'+x.id)).size,2);
    const parentChecks=[];
    for(const item of pgRows) {
        assert.deepEqual(rowIdentity(item.table,item.identity),item.identity);const p=item.proof,event=active.rawEvents.find(e=>e.event_id===p.eventId);assert(event);
        const exportedEvent=exported.events.filter(e=>e.event_id===p.eventId);assert.equal(exportedEvent.length,1);
        assertOriginalPgEventExport(event,exportedEvent[0]);
        assert.equal(item.authorityId,registration.id);assert.equal(p.observerId,registration.observerId);assert.equal(p.functionOid,registration.functionOid);assert.equal(p.sourceAuthority,s.pgSha256);assert.deepEqual(p.createContext,active.context);
        const intent=j.intents.find(x=>x.id===item.intentId);assert(intent && intent.table===item.table && intent.caseId===s.caseId && intent.state==='planned' && intent.beforeObserved && !intent.beforeIds.includes(item.id));
        const originalIntent=active.scope.intents.find(x=>x.id===item.intentId);assert(originalIntent);assert.deepEqual(originalIntent.selector,intent.selector);assert.deepEqual(originalIntent.beforeIds,intent.beforeIds);
        assertCreationProof(j,item,intent);
        assert.equal(event.source_table,item.table);assert.equal(uuid(event.source_id),item.id);assert.equal(event.source_database,j.database);assert.equal(event.intent_id,intent.id);assert.equal(event.run_id,s.runId);assert.equal(event.observer_id,registration.id);assert.equal(event.case_id,s.caseId);assert.equal(event.case_index,active.context.index);assert.equal(event.op,active.context.op);
        assert.equal(event.top_status,'committed');assert.equal(event.top_xid,p.topXid8);assert.equal(event.event_xmin,p.eventXmin);assert.deepEqual(event.identity_snapshot,item.identity);assert.deepEqual(p.immutableIdentityAtInsert,item.identity);
        assert.equal(p.topXid8,pgRows[0].proof.topXid8);assert.equal(String(BigInt(p.eventXid8)%4294967296n),p.eventXmin);assert(BigInt(p.observedFullXid8)-BigInt(p.topXid8)<2147483648n);
        const deferred=p.deferredSubjectValidation;assert.equal(deferred.kind,'committed-snapshot-parents-at-drain');assert.equal(deferred.visibleFromIndependentOwnerConnection,true);assert.equal(deferred.actorId,item.identity.created_by);assert.deepEqual(deferred.projectIds,[item.identity.project_id]);assert(active.scope.actors.includes(item.identity.created_by) && active.scope.projects.includes(item.identity.project_id));assert.deepEqual(deferred.referencesAtInsert,event.parent_snapshot);
        assert.deepEqual(Object.keys(event.parent_snapshot).sort(),PARENTS[item.table].map(x=>x[0]).sort());
        for(const [column,table,nullable]of PARENTS[item.table]) {
            const id=event.parent_snapshot[column];if(id===null){assert(nullable);continue;}uuid(id);
            const proofParents=deferred.parents.filter(x=>x.column===column&&x.table===table&&x.id===id);assert.equal(proofParents.length,1);const parent=proofParents[0];assert.deepEqual(parent.projectIds,[item.identity.project_id]);
            const known=active.scope.ownedParents.find(x=>x.table===table&&x.id===id),created=pgRows.find(x=>x.table===table&&x.id===id);
            assert(known||created);if(known){assert.equal(parent.source,'owned-before-case');assert.equal(parent.eventId,null);const owned=j.objects.find(x=>x.table===table&&x.id===id);assert(owned?.creationProof&&owned.postcondition?.independentlyVisible);assert.deepEqual(owned.identity,known.identity);assert.deepEqual(known.projectIds,[item.identity.project_id]);}
            else{assert.equal(parent.source,'same-case-committed-insert');assert.equal(parent.eventId,created.proof.eventId);assert.equal(created.proof.topXid8,p.topXid8);}
            parentChecks.push({column,table,id,identity:known?.identity??created.identity,projectId:item.identity.project_id});
        }
        assert.equal(deferred.parents.length,PARENTS[item.table].filter(([column])=>event.parent_snapshot[column]!==null).length);
    }
    assert.equal(pgRows.find(x=>x.table===TABLES[1]).proof.deferredSubjectValidation.referencesAtInsert.final_settlement_snapshot_id,pgRows.find(x=>x.table===TABLES[0]).id);
    const originalKeys=new Set(j.objects.map(x=>x.table+':'+x.id));for(const row of report.nativeFinal.witness.committed)if(row.proof.createContext.runId===s.runId)assert(originalKeys.has(row.table+':'+row.id)||ids.has(row.table+':'+row.id),'An additional unowned original SDK create requires a different recovery review');
    assert(!j.committedCreates.some(x=>ids.has(x.table+':'+x.id)),'This dedicated first recovery refuses a partially recorded earlier recovery');
    return {...selected,pgRows,active,parentChecks,caseScope};
}
function regularBytes(file,privateOnly=false) {
    const absolute=path.resolve(file);if(privateOnly)assert(absolute.startsWith(PRIVATE+'/'));
    const parsed=path.parse(absolute);let current=parsed.root;
    for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const stat=fs.lstatSync(current);assert(!stat.isSymbolicLink());if(privateOnly && current.startsWith(PRIVATE))assert((stat.mode&0o077)===0);}
    const before=fs.lstatSync(absolute,{bigint:true});assert(before.isFile()&&before.nlink===1n);assert(before.size<=64n*1024n*1024n);
    const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[key],after[key]);return bytes;
}
function privateDirectory(file) {if(!fs.existsSync(file))fs.mkdirSync(file,{mode:0o700});const s=fs.lstatSync(file);assert(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0);}
function durablePrivate(file,bytes,first=false) {
    const target=first?file:file+'.'+randomUUID()+'.tmp',fd=fs.openSync(target,'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(!first)fs.renameSync(target,file);const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
function snapshotSource(report,file,expected) {const source=report.runtimeInput.files.filter(x=>x.source===file);assert.equal(source.length,1);assert.equal(source[0].rawBytesSha256,expected);assert.equal(sha(regularBytes(path.resolve(ROOT,source[0].snapshot))),expected);return source[0];}
export async function recoverEgicN02(reportSha256,runId,execution={phase:'selection',businessDMLAttempted:false}) {
    const selection=assertEgicRecoverySelection(reportSha256,runId);assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.equal(process.cwd(),ROOT);validateSource();
    const bytes=regularBytes(selection.report);assert.equal(sha(bytes),selection.reportSha256);const report=JSON.parse(bytes);selectOriginalEgicSdkPair(report);
    assert.equal(sha(regularBytes(report.runtimeInput.manifest)),report.runtimeInput.manifestRawBytesSha256);snapshotSource(report,selection.sdkSource,selection.sdkSha256);snapshotSource(report,selection.pgSource,selection.pgSha256);snapshotSource(report,'dist/apps/poms-api/main.js',selection.nativeSha256);
    assert.equal(sha(regularBytes(selection.sdkSource)),selection.sdkSha256,'Original SDK authority implementation changed');assert.equal(sha(regularBytes(selection.pgSource)),selection.pgSha256,'Original PG source changed');
    const runtime=require('../e2e/runtime.cjs');for(const port of [9700,9701,9800])await runtime.assertPortAvailable(runtime.resolveTarget({mode:'external',baseUrl:'http://127.0.0.1:'+port}));
    assert(Number.isSafeInteger(report.nativeFinal.processId)&&report.nativeFinal.processId>1&&report.nativeFinal.processId!==process.pid);
    try{process.kill(report.nativeFinal.processId,0);assert.fail('Original Native owner process is still alive');}catch(error){assert.equal(error.code,'ESRCH','Cannot prove original owner has exited');}
    const journalFile=PRIVATE+'/l-runs/nest-'+selection.runId+'.json',pgFile=report.pgObserverRestore.journalFile,httpFile=report.privateReceipt.file;
    assert.equal(pgFile,PRIVATE+'/pg-create-observers/nest-'+selection.runId+'-'+report.pgObserverRegistration.id+'.json');assert.equal(httpFile,PRIVATE+'/commission-calibrations/consumer-nest-'+selection.runId+'-egic-n02.json');
    execution.phase='saved-private-evidence-validation';
    const jBytes=regularBytes(journalFile,true),pgBytes=regularBytes(pgFile,true),httpBytes=regularBytes(httpFile,true);assert.equal(sha(httpBytes),report.privateReceipt.sha256);assert.equal(httpBytes.length,report.privateReceipt.bytes);
    const journal=JSON.parse(jBytes),pg=JSON.parse(pgBytes),raw=JSON.parse(httpBytes),validated=validateSavedEgicEvidence({report,fixtureJournal:journal,pgJournal:pg,httpRaw:raw});
    const directory=PRIVATE+'/recoveries';privateDirectory(PRIVATE);privateDirectory(directory);const work=directory+'/egic-n02-source-recovery01';assert(!fs.existsSync(work),'Preserve the earlier recovery; review a new recovery source epoch instead of overwriting it');privateDirectory(work);
    durablePrivate(work+'/fixture-journal.before.json',jBytes,true);
    const privateFile=work+'/receipt.json',output='tmp/rust-r2l/egic-n02-source-recovery01.json';assert(!fs.existsSync(output));
    const priv={kind:'private-egic-n02-source-only-adoption-and-cleanup',state:'validated-saved-evidence',originalReportSha256:selection.reportSha256,originalFixtureSha256:sha(jBytes),originalPgSha256:sha(pgBytes),originalHttpSha256:sha(httpBytes),sdk:validated.sdk,pg:validated.pgRows,phases:[]};
    durablePrivate(privateFile,JSON.stringify(priv)+'\n',true);
    const result={formatVersion:1,kind:'egic-n02-cleanup-only-recovery-not-race-acceptance',result:'pending',runId,caseId:selection.caseId,startedAt:new Date().toISOString(),source:{file:SOURCE,sha256:sha(regularBytes(SOURCE))},original:{report:selection.report,sha256:selection.reportSha256,result:'partial',barrierAcceptance:'failed-preserved'},cleanup:[],resourceCloseout:[],originalSourcesPreserved:true};
    let owner,f;const save=()=>durablePrivate(privateFile,JSON.stringify(priv)+'\n');
    try {
        execution.phase='read-only-source-PK-validation';
        const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
        owner=new Client({host:'127.0.0.1',port:19432,database:databaseFor('nest'),user:'poms_r0e_owner',password:regularBytes(PRIVATE+'/owner-password',true).toString('utf8'),connectionTimeoutMillis:5000,query_timeout:15000,application_name:'poms-r2l-egic-n02-recovery-owner'});
        await owner.connect();await verifyConnection(owner,databaseFor('nest'),true);
        // Match the original app connection's display context for pg_get_expr
        // and pg_get_constraintdef. This SET changes only this new connection.
        await owner.query('SET search_path TO poms,public');
        result.catalogOwnerSessionSearchPath='poms,public';
        const quiet=await owner.query("SELECT pid,usename,application_name,state FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid() AND (usename='poms_r2l_app' OR (usename='poms_r0e_owner' AND xact_start IS NOT NULL)) ORDER BY pid",[databaseFor('nest')]);assert.equal(quiet.rows.length,0,'An original app/owner writer remains connected or active');
        assert.deepEqual(await full107Catalog(owner),report.full107Before);result.full107Before=await verifyFullCatalog(owner);
        const sourceRows=new Map();async function sourcePk(table,id) {const key=table+':'+uuid(id);if(sourceRows.has(key))return sourceRows.get(key);const found=await owner.query('SELECT to_jsonb(t) AS row,t.xmin::text AS xmin FROM poms.'+ident(table)+' t WHERE id=$1::uuid',[id]);assert.equal(found.rows.length,1,'Source-proven PK not independently visible');sourceRows.set(key,found.rows[0]);return found.rows[0];}
        for(const item of validated.pgRows) {
            const current=await sourcePk(item.table,item.id);assert.deepEqual(rowIdentity(item.table,current.row),item.identity);for(const [column,value]of Object.entries(item.proof.deferredSubjectValidation.referencesAtInsert))assert.deepEqual(current.row[column]??null,value);
            for(const xid of [...new Set([item.proof.topXid8,item.proof.eventXid8])])assert.equal((await owner.query('SELECT pg_xact_status($1::xid8) AS status',[xid])).rows[0].status,'committed');
            priv.phases.push({kind:'independent-source-PK-visible',table:item.table,id:item.id,currentXmin:current.xmin,sourceInsertXmin:item.proof.eventXmin,sourceXminAtDrain:item.proof.sourceXminAtDrain,xminEqualityNotAssumedAfterUpdates:true,row:current.row});save();
        }
        const additional=validated.pgRows.map(item=>({table:item.table,id:item.id,row:sourceRows.get(item.table+':'+item.id).row}));
        for(const parent of validated.parentChecks) {const current=await sourcePk(parent.table,parent.id);assert.deepEqual(rowIdentity(parent.table,current.row),parent.identity);assert.deepEqual(resolveOwnedProjectIds(journal,parent.table,current.row,{additional}),[parent.projectId]);}
        assert.equal(sha(regularBytes(journalFile,true)),sha(jBytes),'Fixture writer changed before recovery admission');
        execution.phase='original-fixture-journal-admission';
        f=await LFixture.open('nest',selection.runId);assert.equal(f.j.namespace,'poms-r2l');assert.equal(f.supportedTables.length,40);
        const ownFixturePid=(await f.client.query('SELECT pg_backend_pid()::int AS pid')).rows[0].pid;assert(Number.isSafeInteger(ownFixturePid));
        const lateWriters=await owner.query("SELECT pid,usename,application_name,state FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid() AND pid<>$2 AND (usename='poms_r2l_app' OR (usename='poms_r0e_owner' AND xact_start IS NOT NULL)) ORDER BY pid",[databaseFor('nest'),ownFixturePid]);assert.equal(lateWriters.rows.length,0,'A writer appeared before recovery admission');
        for(const port of [9700,9701,9800])await runtime.assertPortAvailable(runtime.resolveTarget({mode:'external',baseUrl:'http://127.0.0.1:'+port}));
        const authority={id:randomUUID(),kind:'mikro-orm-afterCreate-outer-commit',runId,backend:'nest',database:databaseFor('nest'),marker,source:{file:selection.sdkSource,sha256:selection.sdkSha256},trace:structuredClone(report.nativeFinal.witness)};
        // This registers the unchanged saved original trace, not new SDK events.
        const authorityId=f.registerNativeAuthority(authority),items=validated.sdk.map(item=>{const pgItem=validated.pgRows.find(other=>other.table===item.table&&other.id===item.id);return{...structuredClone(item),authorityId,intentId:pgItem.intentId};});
        for(const item of items){const original=validated.sdk.find(x=>x.table===item.table);assert.deepEqual(item.proof,original.proof);assertCreationProof(f.j,item,f.j.intents.find(x=>x.id===item.intentId));}
        f.recordCommittedCreates(items);priv.phases.push({kind:'original-SDK-proof-registered',authorityId,proofSha256:items.map(x=>({table:x.table,id:x.id,sha256:sha(JSON.stringify(x.proof))}))});save();
        await f.resolveNoCreates(selection.caseId);await f.adoptIntents();assert.equal(f.j.objects.length,journal.objects.length+2);
        result.adoptedFromOriginalSdkOnly=items.map(({table,id})=>({table,id}));result.totalOwnedBeforeCleanup=f.j.objects.length;priv.phases.push({kind:'adopted-original-committed-source-creates',owned:f.j.objects.length});save();
        result.preflight=await f.preflight();for(let n=0;n<2;n++){execution.phase='business-cleanup-'+n;execution.businessDMLAttempted=true;result.cleanup.push(await f.cleanup());priv.phases.push({kind:'cleanup-completed',index:n,receipt:result.cleanup.at(-1)});save();}
        assert.equal(result.cleanup[0].deleted,journal.objects.length+2);assert.equal(result.cleanup[1].deleted,0);result.doubleZero=true;
        assert.deepEqual(await full107Catalog(owner),report.full107Before);result.full107After=await verifyFullCatalog(owner);result.result='recovered-original-commits-cleaned-double-zero';
    } catch(error) {priv.failure={name:error.name,message:error.message,stack:error.stack};result.result='partial-recovery-preserved';result.failure={name:error.name,detailsRetainedPrivately:true};process.exitCode=1;save();}
    finally {
        const close=async(name,fn)=>{try{await fn();result.resourceCloseout.push({name,result:'pass'});}catch(error){priv.closeoutFailures??=[];priv.closeoutFailures.push({name,error:{name:error.name,message:error.message}});result.resourceCloseout.push({name,result:'fail'});result.result='partial-recovery-preserved';process.exitCode=1;}};
        if(f)await close('fixture-connection-close',()=>f.close());if(owner)await close('read-only-owner-connection-close',()=>owner.end());
        assert.equal(sha(regularBytes(selection.report)),selection.reportSha256);assert.equal(sha(regularBytes(pgFile,true)),sha(pgBytes));assert.equal(sha(regularBytes(httpFile,true)),sha(httpBytes));
        priv.result=result.result;priv.finishedAt=result.finishedAt=new Date().toISOString();save();const finalBytes=regularBytes(privateFile,true);result.privateReceipt={file:privateFile,bytes:finalBytes.length,sha256:sha(finalBytes),contentsExported:false};
        result.scope='Cleanup-only recovery of already committed source-certified rows. Original partial report, failed barrier and admission remain unchanged; no fresh race/runtime/G3/G4 Pass.';
        fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,result:result.result,adopted:result.adoptedFromOriginalSdkOnly?.length??0,doubleZero:result.doubleZero===true,originalPartialUnchanged:true}));
    }
    return result;
}
function persistEntrypointFailure(error,execution) {
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),ROOT);
    privateDirectory(PRIVATE);const directory=PRIVATE+'/recoveries';privateDirectory(directory);
    const failureId=randomUUID(),file=directory+'/egic-n02-validation-failure-'+failureId+'.json';
    const diagnostic={kind:'private-egic-n02-recovery-validation-failure',at:new Date().toISOString(),runId:egicRecoverySelection.runId,originalReportSha256:egicRecoverySelection.reportSha256,execution,
        error:{name:error?.name,code:error?.code,message:error?.message,stack:error?.stack,actual:error?.actual,expected:error?.expected,operator:error?.operator}};
    const bytes=Buffer.from(JSON.stringify(diagnostic,(_key,value)=>typeof value==='bigint'?value.toString():value)+'\n');durablePrivate(file,bytes,true);
    const receipt={formatVersion:1,kind:'egic-n02-recovery-validation-failure',result:execution.businessDMLAttempted?'failed-after-business-DML-stage-preserved':'failed-before-business-DML',phase:execution.phase,
        runId:egicRecoverySelection.runId,originalReportSha256:egicRecoverySelection.reportSha256,businessDMLAttempted:execution.businessDMLAttempted,
        privateDiagnostic:{file,bytes:bytes.length,sha256:sha(bytes),contentsExported:false},originalPartialRewritten:false,rawErrorObjectsExported:false};
    const output='tmp/rust-r2l/egic-n02-recovery-validation-failure-'+failureId+'.json';fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return{file:output,...receipt};
}
export async function runEgicRecoveryEntrypoint(reportSha256,runId,{recover=recoverEgicN02,persistFailure=persistEntrypointFailure,say=value=>console.log(JSON.stringify(value))}={}) {
    const execution={phase:'selection',businessDMLAttempted:false};
    try{return await recover(reportSha256,runId,execution);}
    catch(error){
        process.exitCode=1;let receipt;
        try{receipt=await persistFailure(error,execution);}
        catch{receipt={kind:'egic-n02-recovery-validation-failure',result:'failure-diagnostic-persistence-unavailable',phase:execution.phase,businessDMLAttempted:execution.businessDMLAttempted,rawErrorObjectsExported:false};}
        // Never pass the original Error/AssertionError or private comparison
        // objects to stdout, including failures before the normal work receipt.
        say(receipt);return receipt;
    }
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))await runEgicRecoveryEntrypoint(process.argv[2],process.argv[3]);
