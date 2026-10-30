// Derived from frozen c0c71302 exporter; a separate edge epoch, not a new runtime.
// Root/C SOURCE-only exporter. Reads only this batch's saved new private
// evidence; opens no DB/HTTP and exports no raw password/token/cookie material.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { marker, sourceHead, databaseFor } from './fixture-guard.mjs';
import { planForReport, actualUnits, edgeCases } from './l-commission-edge-plan.mjs';
import { contractInstant } from './l-contract-diff.mjs';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
const sha = (value) => createHash('sha256').update(value).digest('hex');
function redacted(value) {
    if (Array.isArray(value)) return value.map(redacted);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /^(?:token|csrfToken|sessionToken|accessToken|refreshToken|password|passwordHash|password_hash|token_hash|csrf_token_hash|setCookie)$/i.test(key) && item !== null
        ? { redacted: true, bytes: Buffer.byteLength(typeof item === 'string' ? item : JSON.stringify(item)), sha256: sha(typeof item === 'string' ? item : JSON.stringify(item)) } : redacted(item)]));
}
const emptyObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0;
const originalDateIso=value=>{assert(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value),'Original serialized pg Date must retain its exact ISO milliseconds');assert.equal(new Date(value).toISOString(),value);return contractInstant(value).us;};
const pgTextInstant=value=>{assert(typeof value==='string'&&/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,6})?[+-]\d\d(?::\d\d)?$/.test(value),'Invalid exact original pg timestamptz text');return contractInstant(value.replace(' ','T').replace(/([+-]\d\d)$/,'$1:00')).us;};
// The captured original redacted() enumerated Date's own properties and wrote
// {}. Its separate private JSON.stringify retained Date.toJSON ISO strings.
// Replay only these source-declared pg result/cancel fields, never arbitrary
// strings or DTO/business columns. Both originals remain unchanged.
export function replayHistoricalBarrierProjection(privateBarrier,publicBarrier) {
    const projected=structuredClone(privateBarrier),dates=[];
    assert(privateBarrier&&publicBarrier&&privateBarrier.kind==='real-owned-snapshot-SQL-lock-barrier');
    assert.equal(privateBarrier.caseId,publicBarrier.caseId);assert.equal(privateBarrier.action,publicBarrier.action);
    const waiting=privateBarrier.barrier.waiting,published=publicBarrier.barrier.waiting;
    assert([1,2].includes(waiting.length));assert.equal(waiting.length,privateBarrier.expectedWaiters);assert.equal(published.length,waiting.length);
    const command=contractInstant(privateBarrier.commandStartedAt).us,observed=contractInstant(privateBarrier.barrier.observedAt).us;
    assert(command<=observed);
    const retain=(parent,publicParent,key,path,textField=null)=>{
        const value=parent[key],us=originalDateIso(value);assert(emptyObject(publicParent[key]),'Historical public pg Date projection must be exactly empty object at '+path);
        let text=null,textUs=null;if(textField){text=parent[textField];textUs=pgTextInstant(text);assert.equal(new Date(Number(textUs/1000n)).toISOString(),value,'Original pg text does not hydrate to its retained private Date ISO');}
        dates.push({path,originalPrivateDateIso:value,historicalPublicValue:{},pgTextField:textField,originalPgText:text,pgTextUs:textUs===null?null:String(textUs),
            precision:'Original node-pg Date ISO milliseconds; original *_text independently preserves pg microseconds where the source sampled it'});parent[key]={};return us;
    };
    for(const[index,original]of waiting.entries()) {
        const copy=projected.barrier.waiting[index],pub=published[index];assert.equal(original.pid,pub.pid);
        const backend=retain(copy,pub,'backend_start',`barrier.waiting.${index}.backend_start`,'backend_start_text');
        const xact=retain(copy,pub,'xact_start',`barrier.waiting.${index}.xact_start`);
        const query=retain(copy,pub,'query_start',`barrier.waiting.${index}.query_start`,'query_start_text');
        assert(backend<=xact&&xact<=query,'Original private pg backend/transaction/query ordering changed');
        assert(xact>=command&&query>=command&&query<=observed,'Original private active transaction/query is outside actual dispatch/admission window');
        const queryText=pgTextInstant(original.query_start_text);assert(queryText>=command&&queryText<=observed+999n,'Original microsecond query text is outside millisecond dispatch/admission boundaries');
    }
    if(privateBarrier.action==='cancel') {
        assert.equal(waiting.length,1);assert.equal(privateBarrier.cancellation.pid,waiting[0].pid);
        assert.equal(privateBarrier.cancellation.backendStart,waiting[0].backend_start,'Cancellation must retain the very same original waiting backend Date');
        retain(projected.cancellation,publicBarrier.cancellation,'backendStart','cancellation.backendStart');
        const settled=privateBarrier.cancellation.settledWhileLockHeld;
        if(settled.backend!==null)assert.equal(settled.backend.xact_start,null,'Ended cancelled outer transaction cannot retain a Date-valued xact_start');
    } else assert.equal(privateBarrier.action,'release');
    // All unlisted fields still have to match the original public trace exactly.
    assert.deepEqual(redacted(projected),publicBarrier);
    return {projected,dates,sourceRule:'Captured original redacted(Date) => Object.entries(Date) => {}; original private JSON.stringify(Date) => ISO; exact paths only',
        originalPrivateBarrierSha256:sha(JSON.stringify(privateBarrier)),historicalPublicBarrierSha256:sha(JSON.stringify(publicBarrier)),hashBasis:'JSON.stringify of the original parsed nested barrier object; whole raw private/public files remain separately hash-bound',newDatesFabricated:false,originalsModified:false};
}
export function verifyHistoricalBarrierDateBinding(publicBarrier,binding) {
    assert(binding&&binding.newDatesFabricated===false&&binding.originalsModified===false);
    const restored=structuredClone(publicBarrier),rows=binding.dates;assert(Array.isArray(rows));
    const expected=publicBarrier.barrier.waiting.length*3+(publicBarrier.action==='cancel'?1:0);assert.equal(rows.length,expected);assert.equal(new Set(rows.map(x=>x.path)).size,expected);
    for(const item of rows){const parts=item.path.split('.');assert(/^barrier\.waiting\.[01]\.(?:backend_start|xact_start|query_start)$/.test(item.path)||item.path==='cancellation.backendStart','Unrecognized historical pg Date path');
        let parent=restored;for(const part of parts.slice(0,-1)){assert(Object.hasOwn(parent,part));parent=parent[part];}const key=parts.at(-1);assert(emptyObject(parent[key]));parent[key]=item.originalPrivateDateIso;}
    const replay=replayHistoricalBarrierProjection(restored,publicBarrier);assert.deepEqual(replay.dates,rows);
    assert.equal(replay.originalPrivateBarrierSha256,binding.originalPrivateBarrierSha256);assert.equal(replay.historicalPublicBarrierSha256,binding.historicalPublicBarrierSha256);return true;
}
function privateBytes(file) {
    assert(file.startsWith(PRIVATE + '/')); const stat = fs.lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.nlink === 1); return fs.readFileSync(file);
}
export function exportCommissionEdgeEvidence(reportFile, expectedReportSha256, output) {
    assert.equal(process.platform, 'linux'); assert(!fs.existsSync(output));
    assert(/^[0-9a-f]{64}$/.test(expectedReportSha256));
    const bytes = fs.readFileSync(reportFile); assert.equal(sha(bytes), expectedReportSha256);
    const report = JSON.parse(bytes), plan = planForReport(report); assert(report.result === 'edges-observed' && report.doubleZero);
    const companionFile=path.join(path.dirname(reportFile),`commission-g1-edges-${report.backend}-${report.tag}.json`),companionRaw=fs.readFileSync(companionFile),companion=JSON.parse(companionRaw);
    const ownerFile=path.join(path.dirname(reportFile),`commission-g1-edges-${report.backend}-${report.tag}-owner.json`),ownerRaw=fs.readFileSync(ownerFile),owner=JSON.parse(ownerRaw);
    for(const item of [companion,owner]) { assert.equal(item.tag,report.tag);assert.equal(item.backend,report.backend);assert.equal(item.scenario,plan.scenario); }
    assert.equal(companion.result,'observed');assert.equal(owner.result,'pass');assert.equal(owner.exitCode,0);
    assert.equal(companion.consumerReport.rawBytesSha256,sha(bytes));assert.equal(companion.consumerReport.requestCount,plan.records);
    assert.deepEqual(companion.consumerReport.resourceCloseout,report.resourceCloseout);
    assert.equal(companion.source.sha256,plan.hook);assert.equal(companion.driver.sha256,plan.driver);
    if(report.backend==='rust'&&(plan.scenario.endsWith('-race')||plan.scenario.startsWith('late-'))) {
        const observer=companion.passiveIdentityObserver;assert(observer?.closed&&observer.rawSocketClosed&&observer.workerExitCode===0&&observer.forcedWorkerStop===false);
        assert.equal(observer.stderrBytes,0);assert.equal(observer.payloadsPersisted,false);
    }
    assert(['nest', 'rust'].includes(report.backend)); assert(/^[0-9a-f-]{36}$/.test(report.runId)); assert.equal(report.marker, marker); assert.equal(report.sourceHead, sourceHead);
    const journalFile = PRIVATE + '/l-runs/' + report.backend + '-' + report.runId + '.json', journalRaw = privateBytes(journalFile), journal = JSON.parse(journalRaw);
    assert(journal.namespace === 'poms-r2l' && journal.marker === marker && journal.sourceHead === sourceHead && journal.runId === report.runId && journal.backend === report.backend && journal.database === databaseFor(report.backend) && journal.state === 'cleaned');
    const rawFile = report.privateReceipt.file; assert(rawFile.includes(report.runId)); const httpRaw = privateBytes(rawFile); assert.equal(sha(httpRaw), report.privateReceipt.sha256); const http = JSON.parse(httpRaw); assert.equal(http.runId, report.runId);
    const sourcePlan = report.preparedSource.plan, baseRows = journal.base.rows;
    const originalColumns = (table, id) => {
        const base = baseRows.find((row) => row.table === table && row.values.id === id); if (base) return { kind: 'original-fresh-base-source-plan', columns: Object.keys(base.values) };
        const prepared = sourcePlan.rows.find((row) => row.table === table && row.values.id === id); if (prepared) return { kind: 'original-named-prepared-literal-INSERT', columns: prepared.source.columns, source: prepared.source };
        assert(table === 'contract' && id === report.additionalPreparedContract.id, 'Unknown direct source row');
        return { kind: 'original-selected-contract-INSERT-with-declared-draft-overrides', columns: sourcePlan.rows.find((row) => row.table === 'contract').source.columns };
    };
    const directCreates = journal.directCreates.map((intent) => {
        assert(intent.beforeAbsent && intent.state === 'promoted'); assert.equal(String(BigInt(intent.transaction) % 4294967296n), intent.expectedXmin);
        return { caseId: intent.caseId, transaction: intent.transaction, xmin: intent.expectedXmin, beforeAbsent: intent.beforeAbsent, state: intent.state,
            rows: intent.captured.map((row) => ({ table: row.table, id: row.id, identity: redacted(row.identity), row: redacted(row.row), original: originalColumns(row.table, row.id) })) };
    });
    const objects = journal.objects.map((object) => ({ table: object.table, id: object.id, caseId: object.caseId, projectId: object.projectId, projectIds: object.projectIds,
        identity: redacted(object.identity), creationProof: redacted(object.creationProof), postcondition: object.postcondition }));
    const committedCreates = journal.committedCreates.map((item) => ({ table: item.table, id: item.id, caseId: item.caseId, intentId: item.intentId, authorityId: item.authorityId,
        identity: item.identity ? redacted(item.identity) : undefined, proof: redacted(item.proof) }));
    const units = actualUnits(report), responseBindings = [], sessionBindings = [];
    const batchBindings = (report.captureBatches ?? []).map(batch => {
        const matches = (http.captureBatches ?? []).filter(item => item.name === batch.name); assert.equal(matches.length, 1);
        const raw = matches[0]; assert.equal(raw.certification.state, 'complete');
        for (const key of ['before', 'after', 'bindings', 'certificates', 'snapshotCounts']) assert.deepEqual(redacted(raw[key]), batch[key]);
        const historicalBarrierDates=replayHistoricalBarrierProjection(raw.barrier,batch.barrier);
        assert.deepEqual(raw.requests.map(item => item.name), report.requests.filter(item => item.captureBatch === batch.name).map(item => item.name));
        return { name: batch.name, originalPrivateComplete: true, sharedBeforeAfterEqualOriginalPrivateRows: true,
            actualBindingsEqualOriginal: true, actualCertificatesEqualOriginal: true, actualBarrierEqualOriginal: true,
            historicalBarrierDates: {dates:historicalBarrierDates.dates,sourceRule:historicalBarrierDates.sourceRule,originalPrivateBarrierSha256:historicalBarrierDates.originalPrivateBarrierSha256,historicalPublicBarrierSha256:historicalBarrierDates.historicalPublicBarrierSha256,hashBasis:historicalBarrierDates.hashBasis,newDatesFabricated:false,originalsModified:false,
                capturedDriverSource:{file:'tools/rust-r2l/l-commission-http-actual.mjs',rawBytesSha256:plan.driver},
                capturedPgBarrierSource:report.runtimeInput.files.filter(item=>item.source==='tools/rust-r2l/l-snapshot-sql-barrier.mjs').map(item=>({file:item.source,rawBytesSha256:item.rawBytesSha256}))} };
    });
    for (const request of report.requests) {
        const matches = http.requests.filter((item) => item.name === request.name); assert.equal(matches.length, 1); const raw = matches[0];
        assert(raw.response && raw.certification.state === 'complete'); const response = Buffer.from(raw.response.bodyBytesBase64, 'base64');
        assert.equal(response.length, request.response.wireBodyBytes); assert.equal(sha(response), request.response.wireBodySha256); assert.equal(raw.response.status, request.response.status);
        assert.equal(raw.response.contentType,request.response.contentType);
        const text=response.toString('utf8'),parsed=text && raw.response.contentType.includes('application/json') ? JSON.parse(text) : text || null;
        assert.deepEqual(redacted(parsed),request.response.body);
        if (request.captureBatch) {
            assert.equal(raw.certification.sharedCase, request.captureBatch);
            assert.equal(raw.certification.perCallerPgEventAttributionClaimed, false);
            assert.equal(raw.captureBatch, request.captureBatch);
            assert(batchBindings.some(item => item.name === request.captureBatch));
        } else { assert.deepEqual(redacted(raw.before),request.before); assert.deepEqual(redacted(raw.after),request.after); }
        if (report.authFreshnessPolicy==='fresh-except-named-due') assert.deepEqual(raw.authInputPreparation,request.authInputPreparation);
        responseBindings.push({ name: request.name, status: raw.response.status, bytes: response.length, sha256: sha(response), originalPrivateComplete: true,
            parsedPublicBodyEqualsOriginalBytes:true,publicBeforeAfterMatchOriginalPrivateRows:true });
        if (!request.name.endsWith('.login')) continue;
        const cookies = new Map(raw.response.setCookie.map((cookie) => { const pair = cookie.split(';', 1)[0], at = pair.indexOf('='); return [pair.slice(0, at), pair.slice(at + 1)]; }));
        const token = cookies.get('poms_session'), csrf = cookies.get('poms_csrf'); assert(/^[A-Za-z0-9_-]{43}$/.test(token ?? '') && /^[A-Za-z0-9_-]{43}$/.test(csrf ?? ''));
        const candidates = raw.after.auth_session.filter((row) => row.token_hash === sha(token)); assert.equal(candidates.length, 1); const row = candidates[0]; assert.equal(row.csrf_token_hash, sha(csrf));
        assert(journal.objects.some((object) => object.table === 'auth_session' && object.id === row.id && object.identity.user_id === row.user_id));
        sessionBindings.push({ caseId: request.name, id: row.id, userId: row.user_id, actualCookieToStoredHashVerified: true,
            tokenHashFingerprint: sha(row.token_hash), csrfHashFingerprint: sha(row.csrf_token_hash), rawTokenOrCookieExported: false });
    }
    const definitions = journal.borrowed.definitions.map(({ id, row, fullRowSha256 }) => ({ id, approvalScenarioKey: row.approval_scenario_key, packageKey: row.summary_package_key,
        beforeFullRowSha256: fullRowSha256, afterFullRowSha256: journal.borrowed.definitionChecks.at(-1).rowSha256.find((entry) => entry.id === id).fullRowSha256, neverOwned: !objects.some((object) => object.id === id) }));
    for (const entry of definitions) assert(entry.beforeFullRowSha256 === entry.afterFullRowSha256 && entry.neverOwned);
    // Read only the already restored observer journal. Never reopen/reinstall,
    // query a source PK, or mint a fresh PG/SDK certificate in this exporter.
    const pgFile = report.pgObserverRestore.journalFile, pgRaw = privateBytes(pgFile), pg = JSON.parse(pgRaw);
    assert.equal(pg.kind, 'scoped-pg-after-insert-observer'); assert.equal(pg.state, 'restored');
    assert.equal(pg.runId, report.runId); assert.equal(pg.backend, report.backend);
    assert.equal(pg.database, report.database); assert.equal(pg.marker, marker);
    assert.deepEqual(pg.registration, report.pgObserverRegistration);
    assert.equal(pg.exports.at(-1).sha256, report.pgObserverRestore.eventExportSha256);
    assert.equal(pg.exports.at(-1).events.length, report.pgObserverRestore.exportedEvents);
    assert.equal(sha(JSON.stringify(pg.exports.at(-1).events)), report.pgObserverRestore.eventExportSha256);
    const pgCases = pg.cases.map(item => {
        assert.equal(item.state, 'drained'); assert(item.context.runId === report.runId);
        const unit = units.find(unit => unit.name === item.context.caseId); assert(unit);
        return { context: redacted(item.context), state: item.state, rows: redacted(item.rows) };
    });
    const capturedSources = report.runtimeInput.files.filter(item => !item.target.startsWith('artifacts/') || item.target === 'artifacts/commission-phase-hooks.mjs');
    for (const item of capturedSources) {
        assert(!item.snapshot.includes('/private/') && !item.snapshot.includes('..'));
        const sourceBytes = fs.readFileSync(item.snapshot); assert.equal(sourceBytes.length, item.bytes); assert.equal(sha(sourceBytes), item.rawBytesSha256);
    }
    if (report.authFreshnessPolicy==='fresh-except-named-due') {
        assert.equal(http.authFreshnessPolicy,report.authFreshnessPolicy);
        const publicEntries=http.authInputPreparations.map(({ before,after,mutation,...entry }) => entry); assert.deepEqual(publicEntries,report.authInputPreparations);
    }
    const evidence = { formatVersion: 1, kind: 'public-commission-edge-saved-ownership-and-response-bindings', result: 'pass-saved-evidence-only', backend: report.backend, runId: report.runId, sourceHead, marker,
        actualReport: { file: reportFile, bytes: bytes.length, sha256: sha(bytes), canonicalSha256: sha(JSON.stringify(report)) },
        sourcePrivateJournal: { file: journalFile, bytes: journalRaw.length, sha256: sha(journalRaw), rawCopied: false },
        sourcePrivateHttp: { file: rawFile, bytes: httpRaw.length, sha256: sha(httpRaw), rawCopied: false },
        base: { accounts: journal.base.accounts, roles: journal.base.roles, orgs: journal.base.orgs, rows: baseRows.map((row) => ({ table: row.table, values: redacted(row.values) })) },
        objects, directCreates, committedCreates, intents: journal.intents.map(({ id, table, selector, caseId, beforeObserved, beforeIds, state }) => ({ id, table, selector: redacted(selector), caseId, beforeObserved, beforeIds, state })),
        authorities: journal.authorities.map(({ id, kind, source, sourceAuthority, observerId, functionOid, approvedDefinitionSha256 }) => ({ id, kind, source, sourceAuthority, observerId, functionOid, approvedDefinitionSha256 })),
        responseBindings, sessionBindings, readonlyDefinitions: definitions, batchBindings,
        pgSavedEvidence: { journalFile: pgFile, bytes: pgRaw.length, sha256: sha(pgRaw), rawCopied: false,
            registration: redacted(pg.registration), restored: true, exportedEvents: report.pgObserverRestore.exportedEvents,
            eventExportSha256: report.pgObserverRestore.eventExportSha256, cases: pgCases },
        capturedSources: { actualVerifiedCount: capturedSources.length, allBytesAndHashesVerified: true,
            filesManifestSha256: report.runtimeInput.filesManifestSha256, privateEnvironmentOrBinaryRead: false },
        scenario: plan.scenario,
        sourceOwners:{ companion:{file:companionFile,bytes:companionRaw.length,sha256:sha(companionRaw),report:companion},
            owner:{file:ownerFile,bytes:ownerRaw.length,sha256:sha(ownerRaw),report:owner}, privateOwnerLogRead:false },
        mutations: journal.mutations.map((item) => ({ table: item.table, id: item.id, reason: item.reason, values: redacted(item.values), before: redacted(item.before), after: redacted(item.after), transaction: item.transaction, expectedXmin: item.expectedXmin, state: item.state })),
        boundary: { DBOrHTTPOpened: false, newRuntimeOrCommitClaimed: false, rawPasswordsTokensCookiesOrPrivateCopied: false, onlyThisNewIsolatedFixtureSavedArtifacts: true } };
    fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' }); return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [report, expectedSha256, output] = process.argv.slice(2);
    try {
        assert(report && expectedSha256 && output);
        if(report==='--inventory') {
            const inventory=JSON.parse(fs.readFileSync(expectedSha256));assert.equal(inventory.kind,'public-actual-edge-input-inventory');assert.equal(inventory.cases.length,12);assert(!fs.existsSync(output));
            assert.deepEqual(inventory.cases.map(item=>item.scenario),edgeCases.map(item=>item.scenario));fs.mkdirSync(output);
            const completed=[];
            try {
                for(const [index,item]of inventory.cases.entries())for(const input of item.inputs) {
                    assert(['nest','rust'].includes(input.backend));assert.equal(input.tag,edgeCases[index][input.backend]);
                    const actual=input.files.find(file=>path.basename(file.file)===`commission-http-${input.backend}-${input.tag}.json`);assert(actual);
                    const target=path.join(output,`commission-edge-evidence-${input.backend}-${input.tag}.json`),evidence=exportCommissionEdgeEvidence(actual.file,actual.sha256,target);
                    const metadata={scenario:item.scenario,backend:input.backend,tag:input.tag,file:target,bytes:fs.statSync(target).size,sha256:sha(fs.readFileSync(target)),objects:evidence.objects.length,responses:evidence.responseBindings.length};completed.push(metadata);console.log(JSON.stringify(metadata));
                }
                assert.equal(completed.length,24);
            } finally {
                fs.writeFileSync(path.join(output,'export-attempt.json'),JSON.stringify({kind:'saved-private-edge-evidence-export-attempt',result:completed.length===24?'pass-saved-evidence-only':'partial',completed,DBOrHTTPExecuted:false,sourcePrivateCopied:false},null,2)+'\n',{flag:'wx'});
            }
        } else { const result = exportCommissionEdgeEvidence(report, expectedSha256, output); console.log(JSON.stringify({ result: result.result, backend: result.backend, scenario: result.scenario, objects: result.objects.length, responses: result.responseBindings.length, sessions: result.sessionBindings.length, output })); }
    }
    catch (error) { console.error(JSON.stringify({ result: 'failed-saved-evidence-export', name: error.name, sourceLocation:String(error.stack).split('\n').find(line=>/^\s*at /.test(line))?.trim()??null,privateOrActualObjectsPrinted: false })); process.exitCode = 1; }
}
