// SOURCE-only until Root invokes the bounded owner entrypoint after review.
// This runs the ORIGINAL Native binary against one fresh L database. Selecting
// backend=rust selects that database, never claims a Rust HTTP comparison.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { LFixture } from './l-fixture.mjs';
import { startOriginalNative } from './native-app.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { captureRuntimeInput } from './preserve-runtime-input.mjs';
import { sourceHead, marker, databaseFor, validateSource } from './fixture-guard.mjs';
import { caseIdentity, digest, rowIdentity } from './fixture-core.mjs';
import { ident, verifyFullCatalog } from './catalog-complete.mjs';
import { catalog as full107Catalog } from '../rust-r2c/schema-check.mjs';
import { inspectCommissionPreparedSource, buildCommissionPreparedRows } from './commission-prepared-source.mjs';
import * as recipe from './l-producer-recipes.mjs';
import { installPgCreateObserver, observedTables } from './l-pg-create-observer.mjs';

const require = createRequire(import.meta.url);
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const SOURCE = 'tools/rust-r2l/l-commission-native-calibration.mjs';
const PRIVATE_ROOT = '/home/wangzishi/.local/share/poms-r2l/private';
const VP = '00000000-0000-4000-8000-000000000008', FINANCE = '00000000-0000-4000-8000-000000000014';
const ORIGINAL_ADMIN = '00000000-0000-4000-8000-000000000001', ORIGINAL_VIEWER = '00000000-0000-4000-8000-000000000002';
const ORIGINAL_ORG = '10000000-0000-4000-8000-000000000001';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const SECRET_KEY = /^(?:token|csrfToken|sessionToken|accessToken|refreshToken|password|passwordHash|password_hash|token_hash|csrf_token_hash|setCookie)$/i;

export const commissionCalibrationPlan = Object.freeze({
    kind: 'source-only-original-Native-commission-calibration-plan',
    originalPrepared: { mappings: 21, rows: 18, tables: 15, preparedNotNativeGenerated: true, canonicalDefinitionsReadOnly: 3 },
    principals: { initiator: 'fresh owned admin with original complete manifest', vp: VP, finance: FINANCE, readonlySeedPrincipals: true },
    stages: ['contract reject/approve', 'first reject/resubmit/approve', 'second approve', 'two fresh adjustment drafts for reject and approve',
        'final reject/resubmit/approve without current', 'fresh calculation and second final approve with both current snapshots',
        'actual final register 2040', 'retention receipt 360 confirm', 'actual departure decision', 'retention submit/reject/resubmit/approve', 'actual retention register 360'],
    snapshotObservation: 'Whole owned raw rows and actual SQL; Views do not supply FSS/Rule PK, version or supersedes.',
    pgShadow: 'SDK owns every actual Native create. PG7 separately certifies eligible preplanned common/snapshot creates; it never admits SDK-only producer tables.',
    deferred: ['injected failures after either middle flush', 'simultaneous final/retention chain writers', 'caller-owned outer transaction with a second dirty row of one metadata group'],
    RustEqualityCertified: false, fullR3R4R5Certified: false,
});

export function preparedUuidMappings(inspection, { adminId, viewerId, adminOrgId, projectId, freshUuid = randomUUID }) {
    assert.equal(inspection.requiredUuidMappings.length, 21);
    const fixed = new Map([[ORIGINAL_ADMIN, adminId], [ORIGINAL_VIEWER, viewerId], [ORIGINAL_ORG, adminOrgId], [inspection.originalFixture.projectId, projectId]]);
    for (const key of fixed.keys()) assert(inspection.requiredUuidMappings.some((entry) => entry.from === key), 'Named original identity missing from exact source closure');
    const mappings = Object.fromEntries(inspection.requiredUuidMappings.map(({ from }) => [from, fixed.get(from) ?? freshUuid()]));
    assert.equal(new Set(Object.values(mappings)).size, 21); return mappings;
}
function redacted(value) {
    if (Array.isArray(value)) return value.map(redacted);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SECRET_KEY.test(key) && entry !== null
        ? { redacted: true, bytes: Buffer.byteLength(typeof entry === 'string' ? entry : JSON.stringify(entry)), sha256: sha(typeof entry === 'string' ? entry : JSON.stringify(entry)) }
        : redacted(entry)]));
}
function privateDirectory(directory) {
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
    const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
}
function writePrivate(file, value, first = false) {
    const target = first ? file : file + '.' + randomUUID() + '.tmp', fd = fs.openSync(target, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (!first) fs.renameSync(target, file);
    const directory = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
function bytesReceipt(file) { return { file, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)), contentsExported: false }; }

export async function runCommissionNativeCalibration({ tag, backend = 'nest' }) {
    assert.equal(process.platform, 'linux'); assert(/^[a-z0-9-]{1,30}$/.test(tag)); assert(['nest','rust'].includes(backend));
    assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l'); validateSource();
    const output = `tmp/rust-r2l/native-commission-${backend}-${tag}.json`; assert(!fs.existsSync(output));
    const runId = randomUUID(), contexts = new Map(), committed = [], pgClients = new Set();
    const directory = `${PRIVATE_ROOT}/commission-calibrations`; privateDirectory(directory);
    const privateFile = `${directory}/${backend}-${runId}-${tag}.json`;
    const raw = { formatVersion: 1, kind: 'private-actual-original-Native-commission-calibration', runId, tag, backend, requests: [], failure: null, source: { file: SOURCE, sha256: sha(fs.readFileSync(SOURCE)) } };
    writePrivate(privateFile, raw, true);
    const report = { formatVersion: 1, kind: 'actual-original-Native-L-commission-calibration-not-Rust-acceptance', result: 'pending', tag, backend, runId, sourceHead,
        database: databaseFor(backend), marker, startedAt: new Date().toISOString(), sourcePlan: commissionCalibrationPlan, requests: [], chains: [], cleanup: [], resourceCloseout: [],
        pg7SnapshotPositiveRequests: [], RustEqualityCertified: false, fullR3R4R5Certified: false };
    const save = () => { writePrivate(privateFile, raw); fs.writeFileSync(output, JSON.stringify(report,null,2) + '\n'); };
    let f, native, pg, project, contract, prepared, admin, finance, vp, privateDefinitions;

    function scope(caseId, anonymous = false) {
        return f.defineCase(caseId, { actors: [f.actors.admin,f.actors.viewer], projects: project ? [project.id] : [],
            borrowedActors: [VP,FINANCE], borrowedDefinitions: privateDefinitions ?? [], anonymous });
    }
    async function facts() {
        const result = {};
        for (const table of [...f.supportedTables].sort()) {
            const ids = f.j.objects.filter((item) => item.table === table).map((item) => item.id);
            result[table] = ids.length ? (await f.client.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(table)} t WHERE id=ANY($1::uuid[]) ORDER BY id`,[ids])).rows.map((item) => item.row) : [];
        }
        return result;
    }
    async function ownedRow(table, id) {
        const item = f.j.objects.find((entry) => entry.table === table && entry.id === id); assert(item?.creationProof, 'Response ID is not ownership');
        const rows = (await f.client.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(table)} t WHERE id=$1::uuid`,[id])).rows;
        assert.equal(rows.length,1); assert.equal(digest(rowIdentity(table,rows[0].row)),digest(item.identity)); return rows[0].row;
    }
    function sdkAuthority() {
        const source = 'tools/rust-r2l/k-native-write-witness.mjs';
        return { id: randomUUID(), kind: 'mikro-orm-afterCreate-outer-commit', runId, backend, database: databaseFor(backend), marker,
            source: { file: source, sha256: sha(fs.readFileSync(source)) }, trace: native.witness.snapshot() };
    }
    async function certify(from, intents, caseId, shadowRows, requireSnapshotShadow, shadowEnabled) {
        await native.witness.drain(); native.witness.assertComplete();
        const receipt = sdkAuthority(), authorityId = f.registerNativeAuthority(receipt), actual = committed.slice(from);
        const certified = actual.map((item) => {
            const candidates = intents.filter((intent) => intent.table === item.table); assert.equal(candidates.length,1,'Unexpected/unregistered actual Native INSERT ' + item.table);
            return { ...item, authorityId, intentId: candidates[0].id };
        });
        const shadow = [];
        for (const item of shadowRows) {
            assert(actual.some((entry) => entry.table === item.table && entry.id === item.id), 'PG observation has no matching strict SDK create');
            const current = (await f.client.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(item.table)} t WHERE id=$1::uuid`,[item.id])).rows;
            assert.equal(current.length,1); assert.equal(digest(rowIdentity(item.table,current[0].row)),digest(item.identity));
            shadow.push({ table: item.table, id: item.id, identitySha256: digest(item.identity) });
        }
        const snapshots = actual.filter((item) => ['commission_final_settlement_snapshot','commission_rule_explanation_snapshot'].includes(item.table));
        if (requireSnapshotShadow) {
            assert.equal(snapshots.filter((item) => item.table === 'commission_final_settlement_snapshot').length,1);
            assert.equal(snapshots.filter((item) => item.table === 'commission_rule_explanation_snapshot').length,1);
            for (const item of snapshots) assert(shadowRows.some((other) => other.table === item.table && other.id === item.id),'Real snapshot lacks PG7 positive certificate');
            report.pg7SnapshotPositiveRequests.push({ caseId, snapshots: snapshots.map(({ table,id }) => ({ table,id })) });
        }
        // SDK and PG are independent proof kinds. Do not double-admit an ID or
        // fill SDK proof objects with invented PG transaction/xmin fields.
        if (certified.length) f.recordCommittedCreates(certified);
        await f.resolveNoCreates(caseId); await f.adoptIntents();
        return { sdkAuthorityId: authorityId, sdkComplete: true, sdkCreates: actual.map(({ table,id }) => ({ table,id })),
            pgShadowDeclared:shadowEnabled,pgShadow: shadow, pgShadowUsedAsOwnershipAuthority: false,
            pg7SdkCreatesWithoutShadow:shadowEnabled ? actual.filter((item) => observedTables.includes(item.table) && !shadowRows.some((other) => other.table === item.table && other.id === item.id)).map(({ table,id }) => ({ table,id })) : [],
            sdkOnlyGeneratedTables: actual.filter((item) => !observedTables.includes(item.table)).map(({ table,id }) => ({ table,id })) };
    }
    async function call(session, name, method, route, options = {}, watch = [], { shadow = false, snapshots = false } = {}) {
        const s = scope(name,session.userId === null); session.identity = caseIdentity(runId,name);
        const context = { runId, caseId: name, index: report.requests.length, op: 'l.producer' }, correlationId = 'l-commission-' + randomUUID(); contexts.set(correlationId,context);
        const all = [['audit_log',{ request_id:s.requestId }],['security_event',{ request_id:s.requestId }],...watch];
        assert.equal(new Set(all.map(([table]) => table)).size,all.length,'One explicit pre-intent per possible generated table');
        const intents = []; for (const [table,selector] of all) intents.push(await f.intent(table,selector,{ caseId:name }));
        const from = committed.length, sqlStart = native.sql.length, before = await facts(), startedAt = new Date().toISOString();
        if (shadow) { assert(pg); await pg.beginCase({ caseId:name,index:context.index,op:context.op }); }
        const privateRequest = { name,method,route,startedAt,context,intents,
            requestBodyBase64:Object.hasOwn(options,'json') ? Buffer.from(JSON.stringify(options.json)).toString('base64') : null,
            before,certification:{ state:'pending' },sqlStart };
        const publicRequest = { name,method,path:route,startedAt,request:Object.hasOwn(options,'json') ? { body:redacted(options.json) } : {},before:redacted(before),sqlStart,certificates:{ state:'pending' } };
        raw.requests.push(privateRequest); report.requests.push(publicRequest); save();
        let response;
        try {
            response = await session.request(method,route,{ ...options,requestId:s.requestId,correlationId });
            const httpFinishedAt = new Date().toISOString();
            privateRequest.httpFinishedAt = httpFinishedAt;
            privateRequest.response = { status:response.status,contentType:response.contentType,bodyBytesBase64:response.bodyBytes.toString('base64'),setCookie:response.setCookie,parseError:response.parseError };
            publicRequest.httpFinishedAt = httpFinishedAt;
            publicRequest.response = { status:response.status,contentType:response.contentType,body:redacted(response.body),wireBodyBytes:response.bodyBytes.length,wireBodySha256:sha(response.bodyBytes),exactBytesRetainedPrivately:true,parseError:response.parseError };
            // Preserve the actual response before a certificate/adoption check
            // can reject. Pending evidence is not silently relabelled complete.
            save();
        }
        finally { await native.witness.drain(); native.witness.assertComplete(); }
        const shadowRows = shadow ? await pg.drainCase() : [];
        privateRequest.shadowRows = shadowRows; writePrivate(privateFile,raw);
        const certificates = await certify(from,intents,name,shadowRows,snapshots,shadow), after = await facts(), finishedAt = new Date().toISOString();
        Object.assign(privateRequest,{ finishedAt,after,certification:{ state:'complete' },certificates,sqlEnd:native.sql.length });
        Object.assign(publicRequest,{ finishedAt,after:redacted(after),sqlEnd:native.sql.length,certificates });
        save(); console.log(JSON.stringify({ case:name,status:response.status,SDKCreates:certificates.sdkCreates.length,PGShadow:certificates.pgShadow.length }));
        return response;
    }
    async function send(session,name,spec,expectedStatus,watch = [],shadow = {}) {
        const response = await call(session,name,spec.method,'/api' + spec.path,Object.hasOwn(spec,'body') ? { json:spec.body } : {},watch,shadow);
        report.requests.at(-1).expectedStatus = expectedStatus; save();
        assert.equal(response.status,expectedStatus, name + ' original HTTP status'); assert.equal(response.parseError,null); return response.body;
    }
    async function login(slot, principal, credentials) {
        const session = new NavigationHttpSession(native.origin,runId);
        assert.equal((await call(session,slot + '.csrf','GET','/api/auth/csrf-token')).status,200);
        const response = await call(session,slot + '.login','POST','/api/auth/sessions',{ json:credentials },[['auth_session',{ user_id:principal }]]);
        assert.equal(response.status,200); assert.equal(response.body.authenticated,true); assert.equal(response.body.user.id,principal);
        session.userId = principal; session.profile = response.body.user; assert(session.cookies.has('poms_session')); return session;
    }
    async function due(session) {
        const tokenHash = sha(session.cookies.get('poms_session')), current = (await f.client.query('SELECT id::text FROM poms.auth_session WHERE token_hash=$1',[tokenHash])).rows;
        assert.equal(current.length,1); assert(f.j.objects.some((item) => item.table === 'auth_session' && item.id === current[0].id));
        await f.updateOwned('auth_session',current[0].id,{ last_seen_at:new Date(Date.now()-120000).toISOString() },'Only this run actual owned session made due to observe original raw-touch plus managed coflush');
    }
    function commonWatch(type,id) {
        return [['approval_record',{ project_id:project.id,target_object_type:type,target_object_id:id }],['todo_item',{ project_id:project.id,target_object_type:type,target_object_id:id }]];
    }
    const snapshotWatch = (actor) => [['commission_final_settlement_snapshot',{ project_id:project.id,created_by:actor }],['commission_rule_explanation_snapshot',{ project_id:project.id,created_by:actor }]];
    async function payout(id,name) {
        const rows = await send(admin,name,{ method:'GET',path:`/projects/${project.id}/commission-payouts` },200);
        assert(Array.isArray(rows)); const item = rows.find((entry) => entry.id === id); assert(item); await ownedRow('commission_payout',id); return item;
    }
    async function approvalFor(type,id,name) {
        const session = type === 'contract' ? vp : finance;
        const todos = await send(session,name + '.todos',{ method:'GET',path:'/me/todos' },200);
        assert(Array.isArray(todos)); const selected = todos.filter((todo) => todo.targetObjectType === type && todo.targetObjectId === id && todo.status === 'open'); assert.equal(selected.length,1);
        const record = await send(session,name + '.detail',{ method:'GET',path:`/approval-records/${selected[0].sourceId}` },200);
        await ownedRow('approval_record',record.id); assert.equal(record.currentStatus,'pending'); assert.equal(record.currentApproverUserId,session.userId); return record;
    }
    async function decide(type,id,choice,name,{ stage,makeDue = true } = {}) {
        const session = type === 'contract' ? vp : finance, record = await approvalFor(type,id,name + '.pending');
        const requests = recipe.approvalRequests(record,{ targetType:type,payoutStage:stage,comment:'  L Native校准 ' + name + '  ',reason:'  L Native原拒绝理由  ' });
        if (makeDue) await due(session);
        const writesSnapshots = choice === 'approve' && type === 'commission-payout' && ['final','retention'].includes(stage);
        const result = await send(session,name,requests[choice],200,writesSnapshots ? snapshotWatch(FINANCE) : [],{ shadow:writesSnapshots,snapshots:writesSnapshots });
        assert.equal(result.targetId,id); assert.equal(result.targetType,type); assert.equal(result.resultStatus,choice === 'approve' ? 'approved' : 'rejected');
        const stored = await ownedRow('approval_record',record.id); assert.equal(stored.row_version,record.rowVersion+1); assert.equal(stored.current_approver_user_id,null); assert(stored.decided_at && stored.closed_at);
        await send(session,name + '.closed-detail',requests.detail,200);
        const todos = await send(session,name + '.closed-todos',requests.todos,200);
        assert(!todos.some((todo) => todo.targetObjectType === type && todo.targetObjectId === id && ['open','processing'].includes(todo.status)));
        return result;
    }
    async function chains(name,expected,{ previous = null,commandSnapshotId } = {}) {
        const all = await facts(), finals = all.commission_final_settlement_snapshot.filter((row) => row.project_id === project.id), rules = all.commission_rule_explanation_snapshot.filter((row) => row.project_id === project.id);
        const final = finals.filter((row) => row.is_current), rule = rules.filter((row) => row.is_current); assert.equal(final.length,1); assert.equal(rule.length,1);
        assert.equal(final[0].status,'active'); assert.equal(rule[0].status,'active'); assert.equal(rule[0].final_settlement_snapshot_id,final[0].id);
        for (const [field,value] of Object.entries(expected)) assert.equal(final[0][field],value,name + ' stored ' + field);
        if (commandSnapshotId !== undefined) assert.equal(commandSnapshotId,final[0].id);
        if (previous) { assert.equal(final[0].supersedes_id,previous.final.id); assert.equal(final[0].version,previous.final.version+1); assert.equal(rule[0].supersedes_id,previous.rule.id); assert.equal(rule[0].version,previous.rule.version+1); }
        else { assert.equal(final[0].supersedes_id,null); assert.equal(rule[0].supersedes_id,null); assert.equal(final[0].version,1); assert.equal(rule[0].version,1); }
        const result = { final:final[0],rule:rule[0] }; report.chains.push({ name,...redacted(result),allFinalVersions:finals.map((row) => ({ id:row.id,version:row.version,rowVersion:row.row_version,isCurrent:row.is_current,status:row.status,supersedesId:row.supersedes_id })),allRuleVersions:rules.map((row) => ({ id:row.id,version:row.version,rowVersion:row.row_version,isCurrent:row.is_current,status:row.status,supersedesId:row.supersedes_id })) }); save(); return result;
    }
    async function createCalculation(rule,name) {
        const created = await send(admin,name + '.create',recipe.calculationRequest(project,rule),201,[['commission_calculation',{ project_id:project.id }]]); await ownedRow('commission_calculation',created.id);
        const effective = await send(admin,name + '.approve',recipe.approveCalculationRequest(created),200); assert.equal(effective.status,'effective'); assert.equal(effective.commissionPoolProjection.value,'2400.00'); return effective;
    }
    async function createPayout(calculation,stage,name,expectedCap) {
        const item = await send(admin,name,recipe.payoutRequest(project,calculation,stage),201,[['commission_payout',{ project_id:project.id,calculation_id:calculation.id,stage_type:stage,payout_kind:'primary' }]]);
        await ownedRow('commission_payout',item.id); assert.equal(item.status,'draft'); assert.equal(item.theoreticalCapAmountProjection.value,expectedCap); return item;
    }
    async function submitPayout(item,name,evidence) {
        const retention = item.stageType === 'retention', watches = [...commonWatch('commission-payout',item.id),...(retention ? snapshotWatch(f.actors.admin) : [])];
        const result = await send(admin,name,recipe.submitPayoutRequest(item,evidence),200,watches,{ shadow:true,snapshots:retention });
        assert.equal(result.id,item.id); assert.equal(result.status,'pending-approval'); assert.equal(result.approvalRecordId,undefined); return result;
    }
    async function trackedPgInstall() {
        const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg'), previous = Client.prototype.query;
        const wrapper = function(...args) { if (this.connectionParameters?.application_name === 'poms-r2l-pg-create-observer-owner' && this.connectionParameters?.database === databaseFor(backend)) pgClients.add(this); return previous.apply(this,args); };
        Client.prototype.query = wrapper;
        try { return await installPgCreateObserver(f); } finally { assert.equal(Client.prototype.query,wrapper); Client.prototype.query = previous; }
    }

    try {
        report.runtimeInput = await captureRuntimeInput('native-commission-' + backend + '-' + tag);
        f = await LFixture.open(backend,runId); report.base = await f.prepare(); report.borrowedPrincipals = await f.borrowSeedPrincipals(); report.borrowedDefinitions = await f.borrowCanonicalDefinitions(); privateDefinitions = report.borrowedDefinitions.ids;
        const inspection = await inspectCommissionPreparedSource(); assert.equal(inspection.requiredUuidMappings.length,21);
        scope('commission.bootstrap'); const projectId = await f.planProject('commission.bootstrap');
        const mapping = preparedUuidMappings(inspection,{ adminId:f.actors.admin,viewerId:f.actors.viewer,adminOrgId:f.base.accounts.find((entry) => entry.account === 'admin').orgId,projectId });
        const plan = await buildCommissionPreparedRows({ uuidMappings:mapping,names:{ projectNo:'L-CM-P-' + runId,projectName:'L Native commission ' + runId,contractNo:'L-CM-C-' + runId },logicalIds:[runId] });
        const returned = await f.insertPreparedBatch(plan,{ caseId:'commission.bootstrap' }); assert.equal(returned.length,18);
        const actual = (table) => { const selected = plan.rows.filter((row) => row.table === table); assert.equal(selected.length,1); const found = returned.find((row) => row.id === selected[0].values.id); assert(found); return found; };
        project = actual('project'); contract = actual('contract');
        const handover = actual('project_handover'), operatingSummary = returned.find((row) => row.summary_package_id === plan.readonlyBorrowedDefinitions.operatingSignalSummaryPackageId); assert(operatingSummary);
        prepared = { projectId:project.id,contractId:contract.id,handoverId:handover.id,handoverSummarySnapshotId:handover.summary_snapshot_id,
            baselinePackageId:actual('operating_baseline_package').id,operatingSnapshotId:actual('project_operating_snapshot').id,
            signalEvaluationId:actual('operating_signal_evaluation_result').id,gateBindingId:actual('operating_signal_gate_binding').id,
            summaryPackageKey:operatingSummary.summary_package_key,summarySnapshotId:operatingSummary.id };
        report.preparedSource = { inspection,plan,actualReturnedRows:redacted(returned),preparedDescriptor:prepared,preparedNotNativeGenerated:true };
        assert.equal(contract.status,'active'); assert.equal(actual('receipt_record').status,'confirmed'); assert.equal(Number(actual('receipt_record').receipt_amount),100000); assert.equal(Number(actual('payment_record').amount_excluding_tax),70000);
        report.full107Before = await full107Catalog(f.client); await verifyFullCatalog(f.client); save();
        native = await startOriginalNative({ tag,backend,admittedContexts:contexts,onCommitted:(rows) => { committed.push(...rows); } }); report.nativeStart = native.report(); report.nativeMetadata = native.metadata;
        admin = await login('initiator',f.actors.admin,fixtureCredentials(runId,'admin'));
        finance = await login('finance',FINANCE,{ username:'finance_mgr',password:'finance_mgr123' });
        vp = await login('vp',VP,{ username:'vp_owner',password:'vp_owner123' });
        pg = await trackedPgInstall(); report.pgObserverRegistration = pg.receipt(); raw.pgObserver = { registration:pg.receipt(),journalFile:pg.journalFile }; save(); await f.registerPgObserver(pg.receipt());

        // Independent contract-domain decisions leave the main active contract
        // available to the original calculation's real revenue/cost checks.
        scope('contract.prepared');
        const reviewInput = { ...plan.rows.find((row) => row.table === 'contract').values,id:randomUUID(),contract_no:'L-CM-REVIEW-' + runId,status:'draft',current_snapshot_id:null };
        const reviewContract = await f.insert('contract',reviewInput,{ caseId:'contract.prepared' }); report.additionalPreparedContract = { id:reviewContract.id,source:'original selected contract INSERT projection with named draft/no-current-snapshot overrides',preparedNotNativeGenerated:true };
        let review = { id:reviewContract.id,rowVersion:reviewContract.row_version };
        await send(admin,'contract.submit.reject',recipe.contractRequests(review,{ comment:'L Native contract reject' }).submit,200,commonWatch('contract',review.id),{ shadow:true });
        await decide('contract',review.id,'reject','contract.reject'); assert.equal((await ownedRow('contract',review.id)).status,'draft');
        review = { id:review.id,rowVersion:(await ownedRow('contract',review.id)).row_version };
        await send(admin,'contract.submit.approve',recipe.contractRequests(review,{ comment:'L Native contract approve' }).submit,200,commonWatch('contract',review.id),{ shadow:true });
        await decide('contract',review.id,'approve','contract.approve'); assert.equal((await ownedRow('contract',review.id)).status,'pending-review');

        for (const [name,route,status] of [
            ['lookup.project','/api/projects:lookup?projectNo=' + encodeURIComponent(project.project_no),200],
            ['lookup.contract','/api/contracts:lookup?contractNo=' + encodeURIComponent(contract.contract_no),200],
            ['lookup.old-project','/api/projects/code/' + encodeURIComponent(project.project_no),404],
            ['lookup.old-contract','/api/contracts/no/' + encodeURIComponent(contract.contract_no),404],
            ['lookup.empty','/api/projects:lookup?projectNo=',400],
        ]) assert.equal((await call(admin,name,'GET',route)).status,status);

        const signal = await ownedRow('operating_signal_evaluation_result',prepared.signalEvaluationId), binding = await ownedRow('operating_signal_gate_binding',prepared.gateBindingId);
        const operating = recipe.operatingReviewRequests(prepared,{ signalVersion:signal.row_version,bindingVersion:binding.row_version,reviewComment:'L actual original evidence review' });
        await send(admin,'producer.signal-review',operating.signal,200,[['operating_signal_review_record',{ signal_evaluation_id:prepared.signalEvaluationId }]]);
        const gateReview = await send(admin,'producer.gate-review',operating.gate,200,[['commission_gate_review_record',{ binding_id:prepared.gateBindingId }]]); await ownedRow('commission_gate_review_record',gateReview.gateReviewRecordId);
        const ruleRequest = recipe.commissionRuleRequest('L-' + runId), rule = await send(admin,'producer.rule-create',ruleRequest,201,[['commission_rule_version',{ rule_code:ruleRequest.body.ruleCode }]]);
        await ownedRow('commission_rule_version',rule.id); const activeRule = await send(admin,'producer.rule-activate',recipe.activateRuleRequest(rule),200);
        const assignment = await send(admin,'producer.role-create',recipe.roleAssignmentRequest(project,admin.profile),201,[['commission_role_assignment',{ project_id:project.id }]]); await ownedRow('commission_role_assignment',assignment.id);
        const frozen = await send(admin,'producer.role-freeze',recipe.freezeAssignmentRequest(assignment,prepared),200); assert.equal(frozen.targetId,assignment.id); assert.equal(frozen.newVersionId,assignment.id);
        const currentAssignment = await send(admin,'producer.role-current',{ method:'GET',path:`/projects/${project.id}/commission-role-assignment` },200); assert.equal(currentAssignment.id,frozen.targetId); assert.equal(currentAssignment.status,'frozen'); assert(currentAssignment.rowVersion > assignment.rowVersion);
        const calculation = await createCalculation(activeRule,'producer.calc-one');

        const first = await createPayout(calculation,'first','producer.first-create','480.00');
        await submitPayout(first,'producer.first-submit-reject'); await decide('commission-payout',first.id,'reject','first.reject',{ stage:'first' });
        let currentFirst = await payout(first.id,'first.after-reject'); assert.equal(currentFirst.status,'draft');
        const firstRaw = await ownedRow('commission_payout',first.id); for (const field of ['approved_amount','approved_at','approved_by']) assert.equal(firstRaw[field],null);
        await submitPayout(currentFirst,'producer.first-resubmit'); await decide('commission-payout',first.id,'approve','first.approve',{ stage:'first' });
        currentFirst = await payout(first.id,'first.after-approve'); assert.equal(currentFirst.approvedAmountProjection.value,'480.00');
        const second = await createPayout(calculation,'second','producer.second-create','1680.00');
        await submitPayout(second,'producer.second-submit'); await decide('commission-payout',second.id,'approve','second.approve',{ stage:'second' });

        for (const choice of ['reject','approve']) {
            const request = recipe.adjustmentRequest(project,calculation,currentFirst,'L real adjustment ' + choice);
            const adjustment = await send(admin,'producer.adjustment-' + choice + '-create',request,201,[['commission_adjustment',{ project_id:project.id,related_payout_id:first.id }]]); await ownedRow('commission_adjustment',adjustment.id);
            await send(admin,'producer.adjustment-' + choice + '-submit',recipe.submitAdjustmentRequest(adjustment),200,commonWatch('commission-adjustment',adjustment.id),{ shadow:true });
            await decide('commission-adjustment',adjustment.id,choice,'adjustment.' + choice);
            const actualAdjustment = await ownedRow('commission_adjustment',adjustment.id); assert.equal(actualAdjustment.status,choice === 'approve' ? 'approved' : 'rejected'); assert.equal(actualAdjustment.executed_at,null);
        }

        const finalOne = await createPayout(calculation,'final','producer.final-one-create','2400.00');
        await submitPayout(finalOne,'producer.final-one-submit-reject'); await decide('commission-payout',finalOne.id,'reject','final.reject',{ stage:'final' });
        const finalDraft = await payout(finalOne.id,'final.after-reject'); await submitPayout(finalDraft,'producer.final-one-resubmit');
        const initialFinal = await decide('commission-payout',finalOne.id,'approve','final.approve-initial',{ stage:'final' });
        let chain = await chains('final.initial',{ final_settlement_status:'pending-final-settlement',non_retention_settlement_status:'pending-non-retention',retention_settlement_status:'waiting-retention' },{ commandSnapshotId:initialFinal.snapshotId });
        const calculationTwo = await createCalculation(activeRule,'producer.calc-two');
        const finalTwo = await createPayout(calculationTwo,'final','producer.final-two-create','2400.00'); await submitPayout(finalTwo,'producer.final-two-submit');
        const replacement = await decide('commission-payout',finalTwo.id,'approve','final.approve-with-existing-current',{ stage:'final' });
        chain = await chains('final.replacement',{ final_settlement_status:'pending-final-settlement' },{ previous:chain,commandSnapshotId:replacement.snapshotId });
        const approvedFinal = await payout(finalTwo.id,'final.two-approved');
        await send(admin,'producer.final-register',recipe.registerPayoutRequest(approvedFinal,{ paidRecordAmount:'2040.00' }),200,snapshotWatch(f.actors.admin),{ shadow:true,snapshots:true });
        chain = await chains('final.registered',{ final_settlement_status:'pending-retention-settlement',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'waiting-retention' },{ previous:chain });
        const retention = await createPayout(calculationTwo,'retention','producer.retention-create','360.00');
        const receipt = await send(admin,'producer.retention-receipt-create',recipe.fundingReceiptRequests(contract,{ receiptAmount:'360.00',receiptDate:new Date().toISOString() }),201,[['receipt_record',{ project_id:project.id,contract_id:contract.id,source_type:'manual' }]]); await ownedRow('receipt_record',receipt.id);
        const confirmedReceipt = await send(admin,'producer.retention-receipt-confirm',recipe.confirmReceiptRequest(receipt),200); assert.equal(confirmedReceipt.status,'confirmed');
        // This producer creates its departure parent and snapshot in one tx.
        // PG7 cannot pre-own that non-seven-table parent; certify via SDK only.
        const departure = await send(admin,'producer.departure-create',recipe.departureRequest(project,frozen,prepared,{ departureScenarioCode:'employee-left-company',decisionCode:'allow-retention-with-successor',decisionSummary:'允许进入质保金结算',confirmationRequirementSummary:null }),201,
            [['commission_departure_exception_decision',{ project_id:project.id,freeze_version_id:frozen.targetId }],...snapshotWatch(f.actors.admin)]); await ownedRow('commission_departure_exception_decision',departure.id);
        chain = await chains('retention.departure-ready',{ final_settlement_status:'pending-retention-settlement' },{ previous:chain });
        const evidence = recipe.retentionSubmitEvidence(prepared,gateReview,frozen,confirmedReceipt,departure);
        await submitPayout(retention,'producer.retention-submit-reject',evidence);
        chain = await chains('retention.submitted-ready',{ final_settlement_status:'pending-retention-settlement',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'ready-retention' },{ previous:chain });
        await decide('commission-payout',retention.id,'reject','retention.reject',{ stage:'retention' });
        const retentionDraft = await payout(retention.id,'retention.after-reject'); assert.equal(retentionDraft.status,'draft'); await submitPayout(retentionDraft,'producer.retention-resubmit',evidence);
        chain = await chains('retention.resubmitted-ready',{ retention_settlement_status:'ready-retention' },{ previous:chain });
        const retentionApproved = await decide('commission-payout',retention.id,'approve','retention.approve',{ stage:'retention' });
        chain = await chains('retention.approved-still-ready',{ final_settlement_status:'pending-retention-settlement',retention_settlement_status:'ready-retention' },{ previous:chain,commandSnapshotId:retentionApproved.snapshotId });
        const approvedRetention = await payout(retention.id,'retention.approved-summary'); assert.equal(approvedRetention.approvedAmountProjection.value,'360.00');
        await send(admin,'producer.retention-register',recipe.registerPayoutRequest(approvedRetention,{ paidRecordAmount:'360.00',summarySnapshotId:prepared.summarySnapshotId }),200,snapshotWatch(f.actors.admin),{ shadow:true,snapshots:true });
        await chains('retention.registered-settled',{ final_settlement_status:'settled-all',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'settled-retention' },{ previous:chain });
        await send(admin,'read.final-view',{ method:'GET',path:`/projects/${project.id}/commission-final-settlement` },200);
        await send(admin,'read.rule-view',{ method:'GET',path:`/projects/${project.id}/commission-rule-explanation` },200);
        report.result = 'observed'; report.scope = 'Original Native producer/consumer calibration only. No Rust equality, G3, complete R3-R5 producer certification or deployment claim.';
    } catch (error) {
        raw.failure = { name:error.name,message:error.message,stack:error.stack }; report.result = 'partial'; report.failure = { name:error.name,detailsRetainedPrivately:true }; process.exitCode = 1;
    } finally {
        const close = async (name,run) => { try { await run(); report.resourceCloseout.push({ name,result:'pass' }); return true; } catch (error) { raw.closeoutFailures ??= []; raw.closeoutFailures.push({ name,error:{ name:error.name,message:error.message,stack:error.stack } }); report.resourceCloseout.push({ name,result:'fail',detailsRetainedPrivately:true }); report.result = 'partial'; process.exitCode = 1; return false; } };
        if (native) await close('native-witness-final',async () => { try { await native.witness.drain(); } finally { report.nativeFinal = native.report(); report.sql = native.sql; } native.witness.assertComplete(); });
        if (pg) await close('pg7-observer-restore',async () => { report.pgObserverRestore = await pg.restore(); });
        if (native) await close('native-owner-close',() => native.close());
        for (const client of pgClients) await close('pg7-owner-connection-close',() => client.end());
        if (f) {
            await close('whole-owned-final-facts',async () => { const finalFacts = await facts(); raw.finalFacts = finalFacts; report.finalFacts = redacted(finalFacts); });
            if (report.result === 'observed') await close('exact-owned-cleanup-double-zero',async () => {
                report.preCleanup = await f.preflight(); for (let index=0;index<2;index++) report.cleanup.push(await f.cleanup());
                assert.equal(report.cleanup[1].deleted,0); report.doubleZero = true; report.full107After = await full107Catalog(f.client); await verifyFullCatalog(f.client); assert.deepEqual(report.full107After,report.full107Before);
            });
            else report.cleanupPending = 'Preserve actual partial rows/private ownership evidence. No query-match adoption, guessed DELETE or claimed double zero.';
            await close('fixture-connection-close',() => f.close());
        }
        report.finishedAt = new Date().toISOString(); raw.result = report.result; writePrivate(privateFile,raw); report.privateReceipt = bytesReceipt(privateFile);
        fs.writeFileSync(output,JSON.stringify(report,null,2) + '\n'); console.log(JSON.stringify({ result:report.result,file:output,requests:report.requests.length,pgSnapshotPositiveRequests:report.pg7SnapshotPositiveRequests.length,doubleZero:report.doubleZero === true,resourceCloseout:report.resourceCloseout }));
    }
    return report;
}

async function ownerEntry(tag,backend) {
    assert.equal(process.platform,'linux'); assert(/^[a-z0-9-]{1,30}$/.test(tag ?? '')); assert(['nest','rust'].includes(backend)); assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2l');
    privateDirectory(PRIVATE_ROOT); const directory = PRIVATE_ROOT + '/execution-logs'; privateDirectory(directory);
    const log = `${directory}/native-commission-${backend}-${tag}.log`, output = `tmp/rust-r2l/native-commission-${backend}-${tag}-owner.json`; assert(!fs.existsSync(log) && !fs.existsSync(output));
    const runtime = require('../e2e/runtime.cjs'), report = { formatVersion:1,result:'pending',kind:'bounded-owned-original-Native-commission-process',tag,backend,startedAt:new Date().toISOString(),privateStdoutExported:false };
    try {
        await runtime.assertPortAvailable(runtime.resolveTarget({ mode:'external',baseUrl:'http://127.0.0.1:9700' }));
        // Original bounded-command helper permits at most 300000 ms. Keep its
        // real guard unchanged; the source plan does not grant a longer lease.
        const owned = await runtime.runOwnedCommand({ executable:process.execPath,args:[SOURCE,tag,backend,'--owner-child'],cwd:process.cwd(),env:{ PATH:process.env.PATH,HOME:process.env.HOME,LANG:process.env.LANG ?? 'C.UTF-8' },logPath:path.resolve(log),timeoutMs:300000 });
        report.exitCode = owned.code; report.result = 'pass';
    } catch (error) { report.result = 'fail'; report.failure = { name:error.name,message:error.message }; process.exitCode = 1; }
    finally { if (fs.existsSync(log)) { fs.chmodSync(log,0o600); report.privateLog = bytesReceipt(log); } report.finishedAt = new Date().toISOString(); fs.writeFileSync(output,JSON.stringify(report,null,2) + '\n',{ flag:'wx' }); console.log(JSON.stringify(report)); }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    if (process.argv.includes('--check')) {
        const inspection = await inspectCommissionPreparedSource();
        const mapping = preparedUuidMappings(inspection,{ adminId:randomUUID(),viewerId:randomUUID(),adminOrgId:randomUUID(),projectId:randomUUID() });
        const logical = randomUUID(), plan = await buildCommissionPreparedRows({ uuidMappings:mapping,names:{ projectNo:'L-CM-P-' + logical,projectName:'L Native commission ' + logical,contractNo:'L-CM-C-' + logical },logicalIds:[logical] });
        assert.equal(plan.rows.length,18); assert.equal(plan.selectedTables.length,15); assert.equal(Object.keys(mapping).length,21);
        assert.equal(commissionCalibrationPlan.RustEqualityCertified,false);
        console.log(JSON.stringify({ kind:'pure-commission-driver-source-check',rows:18,tables:15,mappings:21,SQLExecuted:false,HTTPExecuted:false,NativeStarted:false,PostgreSQLExecuted:false }));
    } else if (process.argv.includes('--owner-child')) await runCommissionNativeCalibration({ tag:process.argv[2],backend:process.argv[3] ?? 'nest' });
    else await ownerEntry(process.argv[2],process.argv[3] ?? 'nest');
}
