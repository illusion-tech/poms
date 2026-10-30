// SOURCE-only until Root invokes the bounded owner entrypoint after review.
// Derived from the actual original 114-request commission calibration SOURCE
// e660f97c. Only the existing L4 operations run on Rust9701; every upstream
// producer/lookup/auth/read-model request runs on original Native9700/rust DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { LFixture } from './l-fixture.mjs';
import { startOriginalNative } from './native-app.mjs';
import { startActualRust } from './rust-app.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { captureRuntimeInput } from './preserve-runtime-input.mjs';
import { sourceHead, marker, databaseFor, validateSource } from './fixture-guard.mjs';
import { caseIdentity, digest, rowIdentity } from './fixture-core.mjs';
import { ident, verifyFullCatalog } from './catalog-complete.mjs';
import { catalog as full107Catalog } from '../rust-r2c/schema-check.mjs';
import { inspectCommissionPreparedSource, buildCommissionPreparedRows } from './commission-prepared-source.mjs';
import * as recipe from './l-producer-recipes.mjs';
import { installPgCreateObserver, observedTables } from './l-pg-create-observer.mjs';
import { createCommissionRequestCapture } from './l-commission-capture-requests.mjs';
import { commissionAuthFreshnessPolicies, createCommissionAuthInputPolicy } from './commission-auth-input-policy.mjs';

const require = createRequire(import.meta.url);
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const SOURCE = 'tools/rust-r2l/l-commission-http-actual.mjs';
const ORIGINAL_SOURCE = 'tools/rust-r2l/l-commission-native-calibration.mjs';
const ORIGINAL_SOURCE_SHA256 = 'e660f97ca35537038cee1c1bf2f609efd1046de2fa061cd6303480cf908b6e84';
const RUST_BINARY = '/home/wangzishi/.local/share/poms-r2l/target/release/poms-api-rust';
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
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SECRET_KEY.test(key) && entry != null
        ? { redacted: true, bytes: Buffer.byteLength(typeof entry === 'string' ? entry : JSON.stringify(entry)), sha256: sha(typeof entry === 'string' ? entry : JSON.stringify(entry)) }
        : redacted(entry)]));
}
function hasSecretRequestField(value) {
    if (Array.isArray(value)) return value.some(hasSecretRequestField);
    return !!value && typeof value === 'object' && Object.entries(value).some(([key,entry]) => (SECRET_KEY.test(key) && entry != null) || hasSecretRequestField(entry));
}
export function requestByteEvidence(body) {
    const bytes = Buffer.from(JSON.stringify(body)), secret = hasSecretRequestField(body);
    return { typedBody:redacted(body),bytes:bytes.length,sha256:sha(bytes),rawBodyRetained:!secret,
        requestBodyBase64:secret ? null : bytes.toString('base64'),secretRequestFieldsPersisted:false };
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

export function isL4ConsumerRoute(route) {
    return route.startsWith('/api/approval-records/') || route === '/api/me/todos';
}

export function commissionBuildBinding(buildTag = 'candidate06') {
    assert(/^candidate[0-9]{2}$/.test(buildTag));
    const file = `tmp/rust-r2l/rust-${buildTag}-binary-source.json`, bytes = fs.readFileSync(file), binding = JSON.parse(bytes);
    assert.equal(binding.result,'pass-build-source-binding-not-runtime');
    assert.equal(binding.binary.file,RUST_BINARY); assert.equal(sha(fs.readFileSync(binding.binary.file)),binding.binary.rawBytesSha256);
    for (const row of binding.files) assert.equal(sha(fs.readFileSync(row.file)),row.rawBytesSha256,row.file);
    return { file,rawBytesSha256:sha(bytes),expectedBinarySha256:binding.binary.rawBytesSha256,sourceFiles:binding.files.length };
}

export async function runCommissionConsumersActual({ tag, backend = 'rust', consumerBackend = 'rust', expectedBinarySha256, buildBinding = null, hooks = {}, hookSource = null, authFreshnessPolicy = 'natural' }) {
    assert(commissionAuthFreshnessPolicies.includes(authFreshnessPolicy), 'Unknown auth freshness policy');
    assert.equal(process.platform, 'linux'); assert(/^[a-z0-9-]{1,24}$/.test(tag)); assert(['nest','rust'].includes(backend)); assert(['native','rust'].includes(consumerBackend));
    if (consumerBackend === 'rust') {
        assert.equal(backend,'rust');
        const buildTag = buildBinding?.file?.match(/^tmp\/rust-r2l\/rust-(candidate[0-9]{2})-binary-source\.json$/)?.[1] ?? 'candidate06';
        const verified = commissionBuildBinding(buildTag);
        if (buildBinding) assert.equal(verified.rawBytesSha256,buildBinding.rawBytesSha256);
        buildBinding = verified; expectedBinarySha256 ??= verified.expectedBinarySha256;
        assert.equal(expectedBinarySha256,verified.expectedBinarySha256);
    }
    const hookNames = ['beforeInitialFinal','beforeReplacementFinal','beforeRetentionSubmit','beforeRetentionApprove','afterMatrix'];
    assert(hooks && typeof hooks === 'object' && Object.keys(hooks).every((name) => hookNames.includes(name) && typeof hooks[name] === 'function'));
    if (authFreshnessPolicy !== 'natural') assert.equal(Object.keys(hooks).length,0,'Controlled114 freshness is a separate source epoch from shared-case edge hooks');
    if (Object.keys(hooks).length) {
        assert(/^tools\/rust-r2l\/[a-z0-9-]+\.mjs$/.test(hookSource?.file ?? '') && /^[0-9a-f]{64}$/.test(hookSource?.sha256 ?? ''));
        assert.equal(sha(fs.readFileSync(hookSource.file)),hookSource.sha256,'Root edge-hook SOURCE must be captured explicitly');
    }
    assert.equal(sha(fs.readFileSync(ORIGINAL_SOURCE)),ORIGINAL_SOURCE_SHA256,'Original observed114 SOURCE changed; review a new matrix epoch');
    assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l'); validateSource();
    const output = `tmp/rust-r2l/commission-http-${backend}-${tag}.json`; assert(!fs.existsSync(output));
    const runId = randomUUID(), contexts = new Map(), committed = [], pgClients = new Set();
    const directory = `${PRIVATE_ROOT}/commission-calibrations`; privateDirectory(directory);
    const privateFile = `${directory}/consumer-${backend}-${runId}-${tag}.json`;
    const raw = { formatVersion: 1, kind: 'private-selected-L-consumer-with-original-Native-producers', runId, tag, backend,consumerBackend, authFreshnessPolicy, authInputPreparations:[], requests: [], failure: null, source: { file: SOURCE, sha256: sha(fs.readFileSync(SOURCE)) } };
    writePrivate(privateFile, raw, true);
    const report = { formatVersion: 1, kind: 'actual-selected-four-L-commission-consumption-with-original-Native-producers', result: 'pending', tag, backend,consumerBackend, runId, sourceHead,
        database: databaseFor(backend), marker, startedAt: new Date().toISOString(), sourcePlan: commissionCalibrationPlan, authFreshnessPolicy, authInputPreparations:[], requests: [], chains: [], cleanup: [], resourceCloseout: [],
        pg7SnapshotPositiveRequests: [], RustEqualityCertified: false, fullR3R4R5Certified: false,buildBinding,
        originalMatrix:{ source:ORIGINAL_SOURCE,sha256:ORIGINAL_SOURCE_SHA256,requests:114 },phaseHooks:[],hookSource,
        SQLCoverage:'The in-process SQL witness captures original Native producer/read-model/auth requests. It does not pretend to capture out-of-process Rust SQLx statements.' };
    const save = () => { writePrivate(privateFile, raw); fs.writeFileSync(output, JSON.stringify(report,null,2) + '\n'); };
    let f, native, pg, project, contract, prepared, admin, finance, vp, privateDefinitions, rustRuntime;
    const workflow = {};
    const captureLease = { active: false };
    const authInputs = createCommissionAuthInputPolicy({ policy:authFreshnessPolicy,getFixture:() => f,ownedRow,
        record:async (privateEntry,publicEntry) => { raw.authInputPreparations.push(privateEntry); report.authInputPreparations.push(publicEntry); save(); } });
    const phaseCompletion = Symbol('Root reviewed edge phase completed');
    async function phase(name,details = {}) {
        if (!hooks[name]) return;
        const entry = { name,startedAt:new Date().toISOString(),requestIndex:report.requests.length,state:'running' }; report.phaseHooks.push(entry); save();
        const result = await hooks[name]({
            f,native,pg,rustRuntime,backend,consumerBackend,runId,report,project,contract,prepared,
            sessions:{ admin,finance,vp },call,send,captureRequests,facts,ownedRow,scope,commonWatch,snapshotWatch,decide,approvalFor,login,due,
            createCalculation,createPayout,submitPayout,payout,chains,recipe,workflow,
            ...workflow,...details,
        });
        entry.state = 'observed'; entry.finishedAt = new Date().toISOString(); entry.evidence = redacted(result?.evidence ?? null); save();
        if (result?.finish === true) { const stop = new Error('Root edge phase completed without claiming the original114 matrix'); stop[phaseCompletion] = name; throw stop; }
    }

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
    async function certify(from, intents, caseId, shadowRows, requireSnapshotShadow, shadowEnabled, executionBackend) {
        await native.witness.drain(); native.witness.assertComplete();
        const actual = committed.slice(from), rust = executionBackend === 'rust';
        if (rust) assert.equal(actual.length,0,'A Rust L request must not be certified as an original Native SDK create');
        const authorityId = rust ? null : f.registerNativeAuthority(sdkAuthority());
        const nativeCertified = actual.map((item) => {
            const candidates = intents.filter((intent) => intent.table === item.table); assert.equal(candidates.length,1,'Unexpected/unregistered actual Native INSERT ' + item.table);
            return { ...item, authorityId, intentId: candidates[0].id };
        });
        const shadow = [];
        for (const item of shadowRows) {
            if (!rust) assert(actual.some((entry) => entry.table === item.table && entry.id === item.id), 'PG observation has no matching strict SDK create');
            const current = (await f.client.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(item.table)} t WHERE id=$1::uuid`,[item.id])).rows;
            assert.equal(current.length,1); assert.equal(digest(rowIdentity(item.table,current[0].row)),digest(item.identity));
            shadow.push({ table: item.table, id: item.id, identitySha256: digest(item.identity) });
        }
        const created = rust ? shadowRows : actual;
        const snapshots = created.filter((item) => ['commission_final_settlement_snapshot','commission_rule_explanation_snapshot'].includes(item.table));
        if (requireSnapshotShadow) {
            assert.equal(snapshots.filter((item) => item.table === 'commission_final_settlement_snapshot').length,1);
            assert.equal(snapshots.filter((item) => item.table === 'commission_rule_explanation_snapshot').length,1);
            for (const item of snapshots) assert(shadowRows.some((other) => other.table === item.table && other.id === item.id),'Real snapshot lacks PG7 positive certificate');
            report.pg7SnapshotPositiveRequests.push({ caseId,executionBackend,proofSource:rust ? 'actual-PG-insert-and-outer-commit' : 'original-SDK-matched-PG-shadow',snapshots: snapshots.map(({ table,id }) => ({ table,id })) });
        }
        // SDK and PG are independent proof kinds. Do not double-admit an ID or
        // fill SDK proof objects with invented PG transaction/xmin fields.
        const certified = rust ? shadowRows.map((item) => {
            const intent = intents.find((candidate) => candidate.table === item.table); assert(intent);
            assert.equal(item.authorityId,pg.receipt().id); assert.equal(item.intentId,intent.id); assert.equal(item.proof.kind,'pg-after-insert-observed-outer-commit');
            return item;
        }) : nativeCertified;
        if (certified.length) f.recordCommittedCreates(certified);
        await f.resolveNoCreates(caseId); await f.adoptIntents();
        return { executionBackend,sdkAuthorityId: authorityId, sdkComplete: true, sdkCreates: actual.map(({ table,id }) => ({ table,id })),
            pgCommittedCreates:rust ? shadow : [],pgShadowDeclared:shadowEnabled && !rust,pgShadow:rust ? [] : shadow, pgUsedAsOwnershipAuthority:rust,
            pg7SdkCreatesWithoutShadow:shadowEnabled ? actual.filter((item) => observedTables.includes(item.table) && !shadowRows.some((other) => other.table === item.table && other.id === item.id)).map(({ table,id }) => ({ table,id })) : [],
            sdkOnlyGeneratedTables: actual.filter((item) => !observedTables.includes(item.table)).map(({ table,id }) => ({ table,id })) };
    }
    async function captureRequests(options) {
        return createCommissionRequestCapture({
            fixture:f,native,pg,rustRuntime,runId,backend,consumerBackend,contexts,committed,report,raw,
            scope,facts,certify,save,requestByteEvidence,redacted,lease:captureLease,
        })(options);
    }
    async function call(...args) {
        assert.equal(captureLease.active,false,'A normal call must not interleave the shared-case capture');
        captureLease.active = true;
        try { return await callOne(...args); } finally { captureLease.active = false; }
    }
    async function callOne(session, name, method, route, options = {}, watch = [], { shadow = false, snapshots = false } = {}) {
        const executionBackend = isL4ConsumerRoute(route) ? consumerBackend : 'native', observePg = executionBackend === 'rust' || shadow;
        const authInputPreparation = await authInputs.beforeCall(session,name);
        const s = scope(name,session.userId === null); session.identity = caseIdentity(runId,name);
        const context = { runId, caseId: name, index: report.requests.length, op: executionBackend === 'rust' ? 'l.http' : 'l.producer' }, correlationId = 'l-commission-' + randomUUID(); contexts.set(correlationId,context);
        const all = [['audit_log',{ request_id:s.requestId }],['security_event',{ request_id:s.requestId }],...watch];
        assert.equal(new Set(all.map(([table]) => table)).size,all.length,'One explicit pre-intent per possible generated table');
        const intents = []; for (const [table,selector] of all) intents.push(await f.intent(table,selector,{ caseId:name }));
        const from = committed.length, sqlStart = native.sql.length, before = await facts(), startedAt = new Date().toISOString();
        if (observePg) { assert(pg); await pg.beginCase({ caseId:name,index:context.index,op:context.op }); }
        const privateRequest = { name,executionBackend,method,route,startedAt,context,intents,authInputPreparation,
            requestBody:Object.hasOwn(options,'json') ? requestByteEvidence(options.json) : null,
            before,certification:{ state:'pending' },sqlStart };
        const publicRequest = { name,executionBackend,method,path:route,startedAt,authInputPreparation,request:Object.hasOwn(options,'json') ? { body:redacted(options.json) } : {},before:redacted(before),sqlStart,certificates:{ state:'pending' } };
        raw.requests.push(privateRequest); report.requests.push(publicRequest); save();
        let response; const originalOrigin = session.origin;
        session.origin = executionBackend === 'rust' ? rustRuntime.origin : native.origin;
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
        finally { session.origin = originalOrigin; await native.witness.drain(); native.witness.assertComplete(); }
        const shadowRows = observePg ? await pg.drainCase() : [];
        privateRequest.shadowRows = shadowRows; writePrivate(privateFile,raw);
        const certificates = await certify(from,intents,name,shadowRows,snapshots,observePg,executionBackend), after = await facts(), finishedAt = new Date().toISOString();
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
        authInputs.markNamedDue(session);
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
    async function decide(type,id,choice,name,{ stage,makeDue = true,hook,pendingPayout } = {}) {
        const session = type === 'contract' ? vp : finance, record = await approvalFor(type,id,name + '.pending');
        if (hook) await phase(hook,{ payout:pendingPayout,approval:record,stage,decisionSession:session,payoutRow:await ownedRow('commission_payout',id) });
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
        const result = { final:final[0],rule:rule[0] }; workflow.chain = result; report.chains.push({ name,...redacted(result),allFinalVersions:finals.map((row) => ({ id:row.id,version:row.version,rowVersion:row.row_version,isCurrent:row.is_current,status:row.status,supersedesId:row.supersedes_id })),allRuleVersions:rules.map((row) => ({ id:row.id,version:row.version,rowVersion:row.row_version,isCurrent:row.is_current,status:row.status,supersedesId:row.supersedes_id })) }); save(); return result;
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
        const extraFiles = consumerBackend === 'rust' ? [{ file:RUST_BINARY,snapshot:'artifacts/poms-api-rust',expectedSha256:expectedBinarySha256 }] : [];
        if (buildBinding) extraFiles.push({ file:path.resolve(buildBinding.file),snapshot:'artifacts/rust-build-source-binding.json',expectedSha256:buildBinding.rawBytesSha256 });
        if (hookSource) extraFiles.push({ file:path.resolve(hookSource.file),snapshot:'artifacts/commission-phase-hooks.mjs',expectedSha256:hookSource.sha256 });
        report.runtimeInput = await captureRuntimeInput('commission-http-' + backend + '-' + tag,{ extraFiles });
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
        // Resolve the managed Rust environment before original Native mutates
        // process.env. This ordering was calibrated by the contract HTTP owner.
        if (consumerBackend === 'rust') { rustRuntime = await startActualRust({ tag,expectedBinarySha256 }); report.rustRuntime = rustRuntime.report; }
        native = await startOriginalNative({ tag,backend,admittedContexts:contexts,onCommitted:(rows) => { committed.push(...rows); } }); report.nativeStart = native.report(); report.nativeMetadata = native.metadata;
        report.startupOrder = consumerBackend === 'rust' ? ['Rust9701-ready','original-Native9700-ready-same-rust-database'] : ['original-Native9700-ready'];
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
        workflow.gateReview = gateReview;
        const ruleRequest = recipe.commissionRuleRequest('L-' + runId), rule = await send(admin,'producer.rule-create',ruleRequest,201,[['commission_rule_version',{ rule_code:ruleRequest.body.ruleCode }]]);
        await ownedRow('commission_rule_version',rule.id); const activeRule = await send(admin,'producer.rule-activate',recipe.activateRuleRequest(rule),200);
        workflow.activeRule = activeRule;
        const assignment = await send(admin,'producer.role-create',recipe.roleAssignmentRequest(project,admin.profile),201,[['commission_role_assignment',{ project_id:project.id }]]); await ownedRow('commission_role_assignment',assignment.id);
        const frozen = await send(admin,'producer.role-freeze',recipe.freezeAssignmentRequest(assignment,prepared),200); assert.equal(frozen.targetId,assignment.id); assert.equal(frozen.newVersionId,assignment.id);
        const currentAssignment = await send(admin,'producer.role-current',{ method:'GET',path:`/projects/${project.id}/commission-role-assignment` },200); assert.equal(currentAssignment.id,frozen.targetId); assert.equal(currentAssignment.status,'frozen'); assert(currentAssignment.rowVersion > assignment.rowVersion);
        workflow.frozen = frozen; workflow.currentAssignment = currentAssignment;
        const calculation = await createCalculation(activeRule,'producer.calc-one');
        workflow.calculation = calculation;

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
        const finalDraft = await payout(finalOne.id,'final.after-reject'); const pendingFinalOne = await submitPayout(finalDraft,'producer.final-one-resubmit');
        const initialFinal = await decide('commission-payout',finalOne.id,'approve','final.approve-initial',{ stage:'final',hook:'beforeInitialFinal',pendingPayout:pendingFinalOne });
        let chain = await chains('final.initial',{ final_settlement_status:'pending-final-settlement',non_retention_settlement_status:'pending-non-retention',retention_settlement_status:'waiting-retention' },{ commandSnapshotId:initialFinal.snapshotId });
        const calculationTwo = await createCalculation(activeRule,'producer.calc-two');
        workflow.calculation = calculationTwo;
        const finalTwo = await createPayout(calculationTwo,'final','producer.final-two-create','2400.00'); const pendingFinalTwo = await submitPayout(finalTwo,'producer.final-two-submit');
        const replacement = await decide('commission-payout',finalTwo.id,'approve','final.approve-with-existing-current',{ stage:'final',hook:'beforeReplacementFinal',pendingPayout:pendingFinalTwo });
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
        workflow.retentionEvidence = evidence;
        await phase('beforeRetentionSubmit',{ payout:retention,evidence,confirmedReceipt,departure });
        await submitPayout(retention,'producer.retention-submit-reject',evidence);
        chain = await chains('retention.submitted-ready',{ final_settlement_status:'pending-retention-settlement',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'ready-retention' },{ previous:chain });
        await decide('commission-payout',retention.id,'reject','retention.reject',{ stage:'retention' });
        const retentionDraft = await payout(retention.id,'retention.after-reject'); assert.equal(retentionDraft.status,'draft'); const pendingRetention = await submitPayout(retentionDraft,'producer.retention-resubmit',evidence);
        chain = await chains('retention.resubmitted-ready',{ retention_settlement_status:'ready-retention' },{ previous:chain });
        const retentionApproved = await decide('commission-payout',retention.id,'approve','retention.approve',{ stage:'retention',hook:'beforeRetentionApprove',pendingPayout:pendingRetention });
        chain = await chains('retention.approved-still-ready',{ final_settlement_status:'pending-retention-settlement',retention_settlement_status:'ready-retention' },{ previous:chain,commandSnapshotId:retentionApproved.snapshotId });
        const approvedRetention = await payout(retention.id,'retention.approved-summary'); assert.equal(approvedRetention.approvedAmountProjection.value,'360.00');
        await send(admin,'producer.retention-register',recipe.registerPayoutRequest(approvedRetention,{ paidRecordAmount:'360.00',summarySnapshotId:prepared.summarySnapshotId }),200,snapshotWatch(f.actors.admin),{ shadow:true,snapshots:true });
        await chains('retention.registered-settled',{ final_settlement_status:'settled-all',non_retention_settlement_status:'settled-non-retention',retention_settlement_status:'settled-retention' },{ previous:chain });
        await send(admin,'read.final-view',{ method:'GET',path:`/projects/${project.id}/commission-final-settlement` },200);
        await send(admin,'read.rule-view',{ method:'GET',path:`/projects/${project.id}/commission-rule-explanation` },200);
        report.baselineMatrixEndReached = true; report.default114Only = Object.keys(hooks).length === 0;
        if (report.default114Only) assert.equal(report.requests.length,114,'The observed Native114 request matrix must remain unchanged by default');
        await phase('afterMatrix',{ payout:approvedRetention });
        report.result = 'observed'; report.scope = 'Actual selected L4 consumer with original Native-only producers/read models/auth/lookup. Cross-backend strict comparison and G1 edges remain independent; no self-certified G3/G4 or whole R3-R5 claim.';
    } catch (error) {
        if (error?.[phaseCompletion]) { report.result = 'edges-observed'; report.finishedEdgePhase = error[phaseCompletion]; report.default114Only = false; report.scope = 'Root source-bound edge hook completed; not the original114 matrix or cross-backend equality.'; }
        else { raw.failure = { name:error.name,message:error.message,stack:error.stack }; report.result = 'partial'; report.failure = { name:error.name,detailsRetainedPrivately:true }; process.exitCode = 1; }
    } finally {
        const close = async (name,run) => { try { await run(); report.resourceCloseout.push({ name,result:'pass' }); return true; } catch (error) { raw.closeoutFailures ??= []; raw.closeoutFailures.push({ name,error:{ name:error.name,message:error.message,stack:error.stack } }); report.resourceCloseout.push({ name,result:'fail',detailsRetainedPrivately:true }); report.result = 'partial'; process.exitCode = 1; return false; } };
        if (native) await close('native-witness-final',async () => { try { await native.witness.drain(); } finally { report.nativeFinal = native.report(); report.sql = native.sql; } native.witness.assertComplete(); });
        if (rustRuntime) await close('rust-owner-close',() => rustRuntime.close());
        if (pg) await close('pg7-observer-restore',async () => { report.pgObserverRestore = await pg.restore(); });
        if (native) await close('native-owner-close',() => native.close());
        for (const client of pgClients) await close('pg7-owner-connection-close',() => client.end());
        if (f) {
            await close('whole-owned-final-facts',async () => { const finalFacts = await facts(); raw.finalFacts = finalFacts; report.finalFacts = redacted(finalFacts); });
            if (['observed','edges-observed'].includes(report.result)) await close('exact-owned-cleanup-double-zero',async () => {
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

async function ownerEntry(tag,buildTag = 'candidate06') {
    assert.equal(process.platform,'linux'); assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '')); assert(/^candidate[0-9]{2}$/.test(buildTag)); assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2l');
    const backend = 'rust', binding = commissionBuildBinding(buildTag);
    privateDirectory(PRIVATE_ROOT); const directory = PRIVATE_ROOT + '/execution-logs'; privateDirectory(directory);
    const log = `${directory}/commission-http-rust-${tag}.log`, output = `tmp/rust-r2l/commission-http-rust-${tag}-owner.json`; assert(!fs.existsSync(log) && !fs.existsSync(output));
    const runtime = require('../e2e/runtime.cjs'), report = { formatVersion:1,result:'pending',kind:'bounded-owned-Rust-L4-with-original-Native-producers',tag,backend,buildBinding:binding,startedAt:new Date().toISOString(),privateStdoutExported:false };
    try {
        for (const port of [9700,9701]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode:'external',baseUrl:'http://127.0.0.1:' + port }));
        // Original bounded-command helper permits at most 300000 ms. Keep its
        // real guard unchanged; the source plan does not grant a longer lease.
        const owned = await runtime.runOwnedCommand({ executable:process.execPath,args:[SOURCE,tag,buildTag,binding.expectedBinarySha256,'--owner-child'],cwd:process.cwd(),env:{ PATH:process.env.PATH,HOME:process.env.HOME,LANG:process.env.LANG ?? 'C.UTF-8' },logPath:path.resolve(log),timeoutMs:300000 });
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
        assert.equal(sha(fs.readFileSync(ORIGINAL_SOURCE)),ORIGINAL_SOURCE_SHA256);
        for (const route of ['/api/me/todos','/api/approval-records/example','/api/approval-records/example:approve','/api/approval-records/example:reject']) assert(isL4ConsumerRoute(route));
        for (const route of ['/api/commission-payouts/example:submitApproval','/api/commission-payouts/example:registerPayout','/api/commission-rule-versions','/api/auth/sessions','/api/projects:lookup?projectNo=x']) assert(!isL4ConsumerRoute(route));
        const secretRequest = requestByteEvidence({ username:'synthetic',password:'memory-only-synthetic-value',nested:[{ csrfToken:'memory-only-synthetic-csrf' }] });
        assert.equal(secretRequest.requestBodyBase64,null); assert.equal(secretRequest.rawBodyRetained,false); assert(!JSON.stringify(secretRequest).includes('memory-only-synthetic-value'));
        const businessRequest = requestByteEvidence({ expectedVersion:1,comment:'business fixture' }); assert.equal(businessRequest.rawBodyRetained,true); assert.equal(Buffer.from(businessRequest.requestBodyBase64,'base64').toString('utf8'),JSON.stringify({ expectedVersion:1,comment:'business fixture' }));
        console.log(JSON.stringify({ kind:'pure-commission-consumer-driver-source-check',rows:18,tables:15,mappings:21,originalMatrixRequests:114,SQLExecuted:false,HTTPExecuted:false,NativeStarted:false,PostgreSQLExecuted:false }));
    } else if (process.argv.includes('--owner-child')) await runCommissionConsumersActual({ tag:process.argv[2],buildBinding:commissionBuildBinding(process.argv[3] ?? 'candidate06'),expectedBinarySha256:process.argv[4] });
    else await ownerEntry(process.argv[2],process.argv[3] ?? 'candidate06');
}
