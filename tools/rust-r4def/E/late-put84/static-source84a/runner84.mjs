// Import-safe Root runner candidate. Actual I/O starts only inside run() after
// allowRootExecution=true and a real post-K86 runtime fence. Author never runs it.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const WITNESSES84 = Object.freeze({
    A64: Object.freeze({ text: 'A'.repeat(64), bytes: 64, sha256: 'd53eda7a637c99cc7fb566d96e9fa109bf15c478410a3f5eb4d4c4e26cd081f6' }),
    B64: Object.freeze({ text: 'B'.repeat(64), bytes: 64, sha256: 'c422e7070cb1cb455b5de9afee0d975e303d0239c72030cd7414ab5c382d3ae8' }),
    legacy39: Object.freeze({ bytes: 39, sha256: '7e092953bfd0e46ebf7b1f895b7ad2c7fb000ea717d406ec4cfe751e6ece5347' }),
});
const S = 'AttachmentStorageProviderController_', U = 'AttachmentUploadSessionController_', A = 'AttachmentController_';
export const OPERATIONS84 = Object.freeze({
    AuthController_getCurrentAuthSession: ['GET', '/api/auth/session', 200],
    ProjectController_getById: ['GET', '/api/projects/{id}', 200],
    DictionaryController_list: ['GET', '/api/dictionaries', 200],
    [S + 'listAttachmentStorageProviderConfigs']: ['GET', '/api/platform/attachment-storage-providers', 200],
    [S + 'createAttachmentStorageProviderConfig']: ['POST', '/api/platform/attachment-storage-providers', 201],
    [U + 'create']: ['POST', '/api/attachment-upload-sessions', 201],
    [U + 'createUploadTarget']: ['POST', '/api/attachment-upload-sessions/{id}/upload-targets', 200],
    [U + 'get']: ['GET', '/api/attachment-upload-sessions/{id}', 200],
    [U + 'proxyUploadObject']: ['PUT', '/api/attachment-upload-sessions/{id}/object', 200],
    [U + 'complete']: ['POST', '/api/attachment-upload-sessions/{id}:complete', 200],
    [A + 'download']: ['GET', '/api/attachments/{id}/download', 200],
});
const STAGES = ['admission-and-original-security', 'real-owned-prefix-provider-and-session', 'B-observed-relation-wait', 'same-B-observed-advisory-wait', 'A-real-PUT-complete-final-A', 'release-B-real-attachment-CAS409', 'independent-final-A-staging-B-and-legacy-proof', 'finally-exact-infrastructure-restoration'];
const sha = value => createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' && !(value instanceof Date) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const hash = value => sha(JSON.stringify(stable(value)));
const same = (a, b, message) => assert.equal(hash(a), hash(b), message);
const uid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)); return value; };
const ver = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0); return row.rowVersion; };
const payload = witness => new TextEncoder().encode(witness.text);
const unwrap = value => value?.data ?? value;
const SCHEMA = 'r4def_late_put84';
const TABLE = 'poms.attachment_storage_provider_config';
const APP = 'poms_r4def_rust_app';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function bounded(promise, ms) { let timer; try { return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(null), ms); })]); } finally { clearTimeout(timer); } }
const runtimeIdentity = r => ({ namespace: r.namespace, pid: r.pid, startTime: r.startTime, binarySha256: r.binarySha256, port: r.port, alive: r.alive });
export const initialPlan84 = () => ({ stages: STAGES.map(name => ({ name, status: 'not-run' })), complete: false, actualHTTP: 0, actualPGProofs: 0, actualObjectProofs: 0, infrastructureRestored: false, businessRowsInsertedBySQL: 0, authorExecuted: false, G3Certified: false, G4Certified: false });

export function contextFromRaces73(public73, options) {
    assert.equal(public73.kind, 'actual-R4DEF-two-session-and-third-project-context'); assert.equal(public73.onlyRealAPIProducers, true); assert.equal(public73.sqlBusinessWrites, 0); uid(public73.thirdProject.id); assert(public73.thirdProjectProducer);
    const { author, actorA, actorB, sessionProof, environment, runtimeFence, tag, category, legacyAttachmentId } = options;
    assert(author.id === public73.userId && author.id === actorA.id && author.id === actorB.id); assert(actorA.key !== actorB.key); assert(sessionProof.receiptId && sessionProof.userId === author.id); uid(sessionProof.A); uid(sessionProof.B); assert.notEqual(sessionProof.A, sessionProof.B);
    return { projectId: public73.thirdProject.id, projectProducerReceiptId: public73.thirdProjectProducer, author, actorA, actorB, sessionProof, environment, runtimeFence, tag, category, legacyAttachmentId: uid(legacyAttachmentId) };
}

export function createLatePut84({ allowRootExecution = false, context, harness, connectOwner, recordEvidence, observeObject, observeRuntime, pollIntervalMs = 20, timeoutMs = 8000 } = {}) {
    const result = initialPlan84(), evidence = [], HTTP = [], SQL = [], restoreErrors = [];
    let attempted = false, active = 'not-run', O, H, C, cTx = false, held = false, installed = false, installAttempted = false, policiesCommitted = false, beforeSecurity, installedSecurity, config, session, attachment, bPromise, bSettled = false, bResult, key, beforeAProof, barrierAuthB, configRowsBefore, legacyBefore, runtimeBefore;
    let holderPid, controllerPid, backendPid, expectedOid;
    async function proof(label, body, kind = 'actual-PG') { const r = await recordEvidence(label, body, { keepPrivate: true, namespace: 'poms-r4def' }); assert(r?.receiptId, 'Actual new-private original receipt required'); evidence.push({ kind, label, receiptId: r.receiptId, bodyHash: hash(body) }); if (kind === 'actual-PG') result.actualPGProofs++; if (kind === 'actual-object') result.actualObjectProofs++; return r; }
    async function q(c, text, values = []) { const r = await c.query(text, values); SQL.push({ stage: active, statementSha256: sha(text), rows: r.rowCount }); return r; }
    async function http(op, id = null, body = null, actor = context.author, { status = OPERATIONS84[op][2], binary = false, query = {} } = {}) {
        const [method, path] = OPERATIONS84[op], meta = { method, path: path.replace('{id}', id ?? ''), query, expectedStatus: status, caseId: 'late-put84-' + active, stepId: 'late-put84-' + (HTTP.length + 1), ...(binary && method === 'PUT' ? { contentType: 'application/octet-stream' } : {}) };
        const record = { index: HTTP.length + 1, operationId: op, actorKey: actor.key, actorId: actor.id, method, path: meta.path, expectedStatus: status, status: 'requested' }; HTTP.push(record);
        const response = await (binary ? harness.binaryRequest : harness.request)(op, id, body, actor, meta); assert(response?.receiptId); Object.assign(record, { actualStatus: response.status, receiptId: response.receiptId, requestId: response.requestId, status: response.status === status ? 'passed' : 'failed' }); result.actualHTTP++;
        await proof('HTTP-' + record.index, { operationId: op, id, body: body instanceof Uint8Array ? { bytes: body.length, sha256: sha(body) } : body, actorId: actor.id, response }, 'actual-HTTP'); assert.equal(response.status, status, 'Real HTTP status mismatch'); return { ...response, body: unwrap(response.body) };
    }
    async function stage(name, work) { active = name; const item = result.stages.find(s => s.name === name); try { await work(); item.status = 'passed'; } catch (e) { item.status = 'failed'; item.errorName = e.name; throw e; } }
    async function guard(c) {
        assert.equal(c.connectionParameters.host, '127.0.0.1'); assert.equal(Number(c.connectionParameters.port), 25433); assert.equal(c.connectionParameters.database, 'poms_r4def_rust');
        const r = (await q(c, "SELECT current_database() db,current_user::text principal,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,(SELECT oid::text FROM pg_database WHERE datname=current_database()) database_oid,pg_backend_pid() pid")).rows[0];
        assert(r.db === 'poms_r4def_rust' && r.principal === 'poms_r0e_owner' && r.port === '15432' && r.version === '150012' && r.isolated === 'on'); expectedOid ??= r.database_oid; assert.equal(r.database_oid, expectedOid);
        const marker = (await q(c, 'SELECT instance_id::text,namespace,source_base FROM r4def_control.marker')).rows; assert.deepEqual(marker, [{ instance_id: context.environment.instanceId, namespace: 'poms-r4def', source_base: '756d813c9578090fcf8e56821acce01b46b40420' }]);
        await q(c, "SET timezone='UTC'"); await q(c, "SET statement_timeout='10000ms'"); await q(c, "SET lock_timeout='3000ms'"); return r;
    }
    async function security() {
        await q(O, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        try {
            const table = (await q(O, `SELECT c.oid::text,c.relowner::text,c.relowner::regrole::text AS owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname='attachment_storage_provider_config'`)).rows[0];
            const policies = (await q(O, "SELECT * FROM pg_policies WHERE schemaname='poms' AND tablename='attachment_storage_provider_config' ORDER BY policyname")).rows;
            const columns = (await q(O, `SELECT a.attnum,a.attname,a.attacl::text FROM pg_attribute a WHERE a.attrelid=$1::oid AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`, [table.oid])).rows;
            const role = (await q(O, `SELECT r.oid::text,r.rolname,r.rolsuper,r.rolbypassrls,pg_has_role(r.oid,$1::oid,'USAGE') AS owner_privileges FROM pg_roles r WHERE r.rolname=$2`, [table.relowner, APP])).rows[0];
            const schema = (await q(O, 'SELECT oid::text,nspowner::regrole::text owner,nspacl::text FROM pg_namespace WHERE nspname=$1', [SCHEMA])).rows;
            await q(O, 'COMMIT'); return { table, policies, columns, role, schema };
        } catch (e) { await q(O, 'ROLLBACK'); throw e; }
    }
    const configs = async () => (await q(O, 'SELECT id::text,provider_type,status,enabled,is_default,bucket,key_prefix,row_version,created_at,created_by::text,updated_at,updated_by::text FROM poms.attachment_storage_provider_config ORDER BY id')).rows;
    async function authRow(id) { const rows = (await q(O, 'SELECT id::text,user_id::text,status,row_version,last_seen_at,idle_expires_at,absolute_expires_at,updated_at FROM poms.auth_session WHERE id=$1', [id])).rows; assert.equal(rows.length, 1); assert.equal(rows[0].user_id, context.author.id); assert.equal(rows[0].status, 'active'); return rows[0]; }
    async function legacy() { const row = (await q(O, 'SELECT id::text,storage_provider,storage_bucket,storage_key,size_bytes,checksum_sha256,status FROM poms.attachment WHERE id=$1', [context.legacyAttachmentId])).rows[0]; assert(row?.status === 'active' && row.storage_provider === 'local' && row.storage_bucket === null && row.size_bytes === 39 && row.checksum_sha256 === WITNESSES84.legacy39.sha256); return row; }
    async function downloadCheck(id, fixed, actor = context.actorA) { const r = await http(A + 'download', id, null, actor, { binary: true }); assert(r.bytes instanceof Uint8Array); assert.equal(r.bytes.length, fixed.bytes); assert.equal(sha(r.bytes), fixed.sha256); return r; }
    async function actualObject(location, fixed, label) {
        const r = await observeObject(location, { namespace: 'poms-r4def', instanceId: context.environment.instanceId, keyPrefix: 'k84/' + context.tag, label, keepPrivate: true }); assert(r?.receiptId && r.body?.regular === true && r.body.symlink === false && r.body.parentSymlinks === false && r.body.nlink === 1); assert.equal(r.body.bytes, fixed.bytes); assert.equal(r.body.sha256, fixed.sha256); assert.equal(r.body.namespace, 'poms-r4def'); assert.equal(r.body.instanceId, context.environment.instanceId); await proof(label, r, 'actual-object'); return r;
    }
    async function snapshot(extraRequestId = null) {
        await q(O, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        try {
            const s = (await q(O, 'SELECT to_jsonb(s) AS row FROM poms.attachment_upload_session s WHERE id=$1', [session.id])).rows[0]?.row; assert(s);
            const rows = s.completed_attachment_id ? (await q(O, 'SELECT to_jsonb(a) AS row FROM poms.attachment a WHERE id=$1 OR COALESCE(version_group_id,id)=$1 ORDER BY id', [s.completed_attachment_id])).rows.map(r => r.row) : [];
            const links = s.completed_attachment_id ? (await q(O, 'SELECT to_jsonb(l) AS row FROM poms.attachment_link l WHERE attachment_id=$1 ORDER BY id', [s.completed_attachment_id])).rows.map(r => r.row) : [];
            const audit = (await q(O, `SELECT id::text,event_type,target_type,target_id,operator_id::text,request_id,result,metadata,occurred_at FROM poms.audit_log WHERE target_id::text=ANY($1::text[]) OR metadata->>'uploadSessionId'=$2 OR request_id=$3 ORDER BY id`, [[session.id, s.completed_attachment_id].filter(Boolean), session.id, extraRequestId])).rows;
            await q(O, 'COMMIT'); return { session: s, attachments: rows, links, audit };
        } catch (e) { await q(O, 'ROLLBACK'); throw e; }
    }
    async function until(label, read, predicate) {
        const deadline = Date.now() + timeoutMs; let last;
        while (Date.now() < deadline) { assert(!bSettled, 'B completed before the required observable barrier'); last = await read(); if (predicate(last)) { await proof(label, last); return last; } await sleep(pollIntervalMs); }
        await proof(label + '-timeout', last); throw Error('Actual barrier timeout:' + label);
    }
    async function installInfra() {
        installAttempted = true;
        await q(C, 'BEGIN'); cTx = true;
        try {
            await q(C, `CREATE SCHEMA ${SCHEMA} AUTHORIZATION poms_r0e_owner`);
            await q(C, `CREATE TABLE ${SCHEMA}.control(singleton boolean PRIMARY KEY CHECK(singleton),namespace text NOT NULL,instance_id uuid NOT NULL,run_id text NOT NULL,config_id uuid NOT NULL,blocked_backend_pid integer NULL,lock_key bigint NOT NULL)`);
            await q(C, `INSERT INTO ${SCHEMA}.control VALUES(true,$1,$2,$3,$4,NULL,$5)`, ['poms-r4def', context.environment.instanceId, context.tag, config.id, key]);
            await q(C, `CREATE FUNCTION ${SCHEMA}.allow_location_read(config uuid) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $gate84$ DECLARE g record; BEGIN SELECT * INTO STRICT g FROM ${SCHEMA}.control WHERE singleton; IF pg_backend_pid()=g.blocked_backend_pid AND config=g.config_id THEN PERFORM pg_advisory_xact_lock(g.lock_key); END IF; RETURN true; END $gate84$`);
            await q(C, `REVOKE ALL ON FUNCTION ${SCHEMA}.allow_location_read(uuid) FROM PUBLIC`); await q(C, `GRANT USAGE ON SCHEMA ${SCHEMA} TO ${APP}`); await q(C, `GRANT EXECUTE ON FUNCTION ${SCHEMA}.allow_location_read(uuid) TO ${APP}`);
            await q(C, 'COMMIT'); cTx = false; installed = true;
        } catch (e) { await q(C, 'ROLLBACK'); cTx = false; throw e; }
    }
    async function restore() {
        if (cTx) { try { await q(C, 'ROLLBACK'); cTx = false; } catch (e) { restoreErrors.push({ part: 'controller-rollback', name: e.name }); } }
        if (held) { try { assert.equal((await q(H, 'SELECT pg_advisory_unlock($1::bigint) AS unlocked', [key])).rows[0].unlocked, true); held = false; } catch (e) { restoreErrors.push({ part: 'holder-unlock', name: e.name }); await H.end().catch(() => undefined); H = null; held = false; } }
        if (bPromise && !bSettled) { const settled = await bounded(bPromise, 15000); if (settled === null) restoreErrors.push({ part: 'B-not-settled-after-unlock', name: 'Timeout' }); }
        if (installAttempted && O) installed = (await q(O, 'SELECT oid FROM pg_namespace WHERE nspname=$1', [SCHEMA])).rows.length > 0;
        if (installed) {
            try {
                const marker = (await q(O, `SELECT namespace,instance_id::text,run_id,config_id::text FROM ${SCHEMA}.control WHERE singleton`)).rows; assert.deepEqual(marker, [{ namespace: 'poms-r4def', instance_id: context.environment.instanceId, run_id: context.tag, config_id: config.id }]);
                const current = await security(); same(current.columns, beforeSecurity.columns, 'Column ACL changed'); same(current.role, beforeSecurity.role, 'App role privileges changed'); const table = { ...current.table, relrowsecurity: false }; same(table, beforeSecurity.table, 'Only the owned RLS bit may differ');
                if (current.policies.length > 0) { assert(installedSecurity?.policies); same(current.policies, installedSecurity.policies, 'Refuse to remove unknown/changed policy'); policiesCommitted = true; }
                else { policiesCommitted = false; same(current.policies, beforeSecurity.policies, 'No unowned policy may be removed'); }
                await q(C, 'BEGIN'); cTx = true;
                if (policiesCommitted) { await q(C, `DROP POLICY late_put84_location_gate ON ${TABLE}`); await q(C, `DROP POLICY late_put84_allow_select ON ${TABLE}`); await q(C, `ALTER TABLE ${TABLE} DISABLE ROW LEVEL SECURITY`); }
                await q(C, `DROP FUNCTION ${SCHEMA}.allow_location_read(uuid)`); await q(C, `DROP TABLE ${SCHEMA}.control`); await q(C, `DROP SCHEMA ${SCHEMA} RESTRICT`); await q(C, 'COMMIT'); cTx = false; installed = false;
            } catch (e) { if (cTx) { await q(C, 'ROLLBACK').catch(() => undefined); cTx = false; } restoreErrors.push({ part: 'restore-owned-infrastructure', name: e.name }); await proof('restore-failure-original', { name: e.name, message: e.message, stack: e.stack }, 'restore-error').catch(() => undefined); }
        }
        if (beforeSecurity && O) { try { const after = await security(); same(after, beforeSecurity, 'Exact RLS/policies/table+column ACL/owner/schema restoration required'); const locks = (await q(O, "SELECT pid,granted FROM pg_locks WHERE locktype='advisory' AND classid=$1::oid AND objid=$2::oid AND objsubid=1 AND database=$3::oid", [(BigInt(key) >> 32n).toString(), (BigInt(key) & 0xffffffffn).toString(), expectedOid])).rows; assert.equal(locks.length, 0); await proof('security-and-own-locks-restored', { before: beforeSecurity, after, locks }); result.infrastructureRestored = true; } catch (e) { restoreErrors.push({ part: 'final-security-or-lock-compare', name: e.name }); } }
    }
    const manifest = () => structuredClone({ ...result, HTTP, SQL, evidence, restoreErrors, fixture: config ? { configId: config.id, keyPrefix: config.keyPrefix, keptAsOwnedActiveDefault: true } : null, uploadSessionId: session?.id ?? null, attachmentId: attachment?.id ?? null, BBackendPid: backendPid ?? null, requiresPostK86Runtime: true, responsesMocked: 0 });
    return {
        manifest,
        async run() {
            assert(!attempted); attempted = true; assert.equal(allowRootExecution, true, 'Explicit Root execution admission required before any I/O'); assert(context && harness && typeof connectOwner === 'function' && typeof recordEvidence === 'function' && typeof observeObject === 'function' && typeof observeRuntime === 'function');
            assert(context.environment.namespace === 'poms-r4def' && context.environment.instanceId && context.environment.receiptId && harness.base === 'http://127.0.0.1:31341'); assert(/^[a-z0-9-]{1,24}$/.test(context.tag)); assert(timeoutMs >= 1000 && timeoutMs <= 10000 && pollIntervalMs >= 5 && pollIntervalMs <= 100); assert(context.runtimeFence.postK86 === true && /^[0-9a-f]{64}$/.test(context.runtimeFence.binarySha256) && context.runtimeFence.authorityReceiptId);
            assert(context.author.id === context.actorA.id && context.author.id === context.actorB.id && context.actorA.key !== context.actorB.key && context.sessionProof.userId === context.author.id && context.sessionProof.receiptId); uid(context.sessionProof.A); uid(context.sessionProof.B); assert.notEqual(context.sessionProof.A, context.sessionProof.B);
            key = (BigInt('0x' + sha('poms-r4def:late-put84:' + context.tag).slice(0, 15)) + 1n).toString();
            let failure;
            try {
                await stage(STAGES[0], async () => {
                    runtimeBefore = await observeRuntime(context.runtimeFence); assert(runtimeBefore.namespace === 'poms-r4def' && runtimeBefore.binarySha256 === context.runtimeFence.binarySha256 && runtimeBefore.alive === true && runtimeBefore.port === 31341 && Number.isSafeInteger(runtimeBefore.pid) && runtimeBefore.startTime); await proof('actual-post-K86-runtime-before', runtimeBefore, 'runtime');
                    O = await connectOwner('rust'); H = await connectOwner('rust'); C = await connectOwner('rust'); await guard(O); holderPid = (await guard(H)).pid; controllerPid = (await guard(C)).pid;
                    beforeSecurity = await security(); assert(!beforeSecurity.table.relrowsecurity && !beforeSecurity.table.relforcerowsecurity && beforeSecurity.policies.length === 0 && beforeSecurity.schema.length === 0 && !beforeSecurity.role.rolsuper && !beforeSecurity.role.rolbypassrls && !beforeSecurity.role.owner_privileges); await proof('original-config-security', beforeSecurity);
                    for (const actor of [context.author, context.actorA, context.actorB]) { const r = (await http('AuthController_getCurrentAuthSession', null, null, actor)).body; assert(r.authenticated && r.user?.id === context.author.id); }
                    assert.notEqual(context.sessionProof.A, context.sessionProof.B); await authRow(context.sessionProof.A); await authRow(context.sessionProof.B);
                    const project = (await http('ProjectController_getById', context.projectId)).body; assert(project.id === context.projectId && project.status === 'active');
                    configRowsBefore = await configs(); assert(!configRowsBefore.some(c => c.enabled && c.is_default), 'Do not replace an existing default config');
                    legacyBefore = await legacy(); await downloadCheck(legacyBefore.id, WITNESSES84.legacy39); await proof('legacy52-binding-before', legacyBefore);
                });
                await stage(STAGES[1], async () => {
                    const list = (await http('DictionaryController_list', null, null, context.author, { query: { domain: 'attachment-category', status: 'active' } })).body; const categories = list.items ?? list; assert(Array.isArray(categories)); const category = categories.find(x => x.status === 'active' && (context.category ? x.code === context.category : true)); assert(category);
                    config = (await http(S + 'createAttachmentStorageProviderConfig', null, { providerType: 'local', displayName: 'R4DEF late-put84 ' + context.tag, enabled: true, isDefault: true, keyPrefix: 'k84/' + context.tag })).body; uid(config.id); assert(config.enabled && config.isDefault && config.status === 'active' && config.providerType === 'local' && config.keyPrefix === 'k84/' + context.tag);
                    same((await configs()).filter(c => c.id !== config.id), configRowsBefore, 'No original config row may be changed'); assert(!legacyBefore.storage_key.startsWith(config.keyPrefix + '/'));
                    session = (await http(U + 'create', null, { operationType: 'create-attachment', targetType: 'project', targetId: context.projectId, category: category.code, securityLevel: 'normal', relationType: 'normal', originalName: 'late-put84.txt', displayName: 'late-put84 ' + context.tag, mimeType: 'text/plain', sizeBytes: 64 })).body; uid(session.id); assert(session.checksumSha256 === null && session.status === 'pending' && ver(session) === 1 && session.providerType === 'local' && session.uploadMode === 'proxy');
                    const target = (await http(U + 'createUploadTarget', session.id, { expectedVersion: 1 })).body; assert(target.method === 'PUT' && target.url === `/api/attachment-upload-sessions/${session.id}/object`);
                    const state = await snapshot(); assert(state.session.status === 'uploading' && state.session.row_version === 2 && state.session.checksum_sha256 === null && state.session.storage_key.startsWith(config.keyPrefix + '/')); await proof('real-uploading2-checksum-null', state); assert.equal((await q(H, 'SELECT pg_try_advisory_lock($1::bigint) AS held', [key])).rows[0].held, true); held = true; await installInfra();
                });
                await stage(STAGES[2], async () => {
                    await q(C, 'BEGIN'); cTx = true; await q(C, `LOCK TABLE ${TABLE} IN ACCESS EXCLUSIVE MODE`);
                    bPromise = http(U + 'proxyUploadObject', session.id, payload(WITNESSES84.B64), context.actorB, { binary: true, status: 409 }).then(r => { bSettled = true; return bResult = { ok: true, response: r }; }, e => { bSettled = true; return bResult = { ok: false, error: e }; });
                    const rows = await until('B-exact-relation-wait', async () => (await q(O, `SELECT a.pid,a.usename,a.state,a.wait_event_type,a.wait_event,a.query,pg_blocking_pids(a.pid) blockers FROM pg_stat_activity a WHERE a.datname='poms_r4def_rust' AND a.usename=$1 AND a.query LIKE 'SELECT to_jsonb(c) AS data FROM poms.attachment_storage_provider_config c%' AND $2::integer=ANY(pg_blocking_pids(a.pid))`, [APP, controllerPid])).rows, rows => { assert(rows.length <= 1, 'Ambiguous B backend; no guessed PID'); return rows.length === 1 && rows[0].wait_event_type === 'Lock'; }); backendPid = rows[0].pid;
                    const lock = (await q(O, 'SELECT pid,mode,granted,relation::text FROM pg_locks WHERE relation=$1::oid AND pid=ANY($2::integer[]) ORDER BY pid,mode', [beforeSecurity.table.oid, [backendPid, controllerPid]])).rows; assert(lock.some(x => x.pid === backendPid && x.mode === 'AccessShareLock' && !x.granted) && lock.some(x => x.pid === controllerPid && x.mode === 'AccessExclusiveLock' && x.granted)); await proof('B-relation-locks', lock);
                    await q(C, `UPDATE ${SCHEMA}.control SET blocked_backend_pid=$1 WHERE singleton`, [backendPid]); await q(C, `CREATE POLICY late_put84_allow_select ON ${TABLE} AS PERMISSIVE FOR SELECT TO ${APP} USING(true)`); await q(C, `CREATE POLICY late_put84_location_gate ON ${TABLE} AS RESTRICTIVE FOR SELECT TO ${APP} USING(${SCHEMA}.allow_location_read(id))`); await q(C, `ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`); installedSecurity = { policies: (await q(C, "SELECT * FROM pg_policies WHERE schemaname='poms' AND tablename='attachment_storage_provider_config' ORDER BY policyname")).rows }; await q(C, 'COMMIT'); cTx = false; policiesCommitted = true;
                });
                await stage(STAGES[3], async () => {
                    const kHi = (BigInt(key) >> 32n).toString(), kLo = (BigInt(key) & 0xffffffffn).toString();
                    await until('same-B-exact-advisory-wait', async () => { const state = (await q(O, 'SELECT pid,wait_event_type,wait_event,pg_blocking_pids(pid) blockers FROM pg_stat_activity WHERE pid=$1', [backendPid])).rows; const locks = (await q(O, "SELECT pid,granted,classid::text,objid::text,objsubid FROM pg_locks WHERE locktype='advisory' AND classid=$1::oid AND objid=$2::oid AND objsubid=1 AND pid=ANY($3::integer[]) ORDER BY pid", [kHi, kLo, [backendPid, holderPid]])).rows; return { state, locks }; }, p => p.state.length === 1 && p.state[0].wait_event_type === 'Lock' && p.state[0].blockers.includes(holderPid) && p.locks.some(l => l.pid === backendPid && !l.granted) && p.locks.some(l => l.pid === holderPid && l.granted));
                    const state = await snapshot(); assert(state.session.status === 'uploading' && state.session.row_version === 2 && state.session.checksum_sha256 === null); barrierAuthB = await authRow(context.sessionProof.B); await proof('B-barrier-source-and-auth-baseline', { state, authB: barrierAuthB });
                });
                await stage(STAGES[4], async () => {
                    const put = (await http(U + 'proxyUploadObject', session.id, payload(WITNESSES84.A64), context.actorA, { binary: true })).body; assert(put.status === 'uploaded' && put.rowVersion === 3);
                    const complete = await http(U + 'complete', session.id, { expectedVersion: 3, checksumSha256: WITNESSES84.A64.sha256 }, context.actorA); attachment = complete.body; uid(attachment.id); assert(attachment.status === 'active' && attachment.versionNo === 1 && attachment.isLatest && !attachment.isFinal && attachment.sizeBytes === 64 && attachment.checksumSha256 === WITNESSES84.A64.sha256);
                    beforeAProof = await snapshot(); const s = beforeAProof.session, a = beforeAProof.attachments[0]; assert(beforeAProof.attachments.length === 1 && s.status === 'completed' && s.row_version === 4 && s.completed_attachment_id === attachment.id && s.checksum_sha256 === WITNESSES84.A64.sha256); assert(a.storage_key !== s.storage_key && a.storage_key.startsWith(config.keyPrefix + '/attachments/completed/') && a.storage_key.includes('/' + a.id + '/') && a.storage_provider === s.provider_type && a.storage_bucket === s.storage_bucket); const nonce = uid(a.storage_key.split('/' + a.id + '/')[1]?.split('/')[0]); assert(nonce !== a.id && nonce !== session.id); assert(a.row_version === 1 && a.is_latest && !a.is_final && a.status === 'active' && a.version_no === 1 && a.previous_attachment_id === null); assert(beforeAProof.links.length === 1 && beforeAProof.links[0].attachment_id === a.id && beforeAProof.links[0].target_type === 'project' && beforeAProof.links[0].target_id === context.projectId && beforeAProof.links[0].status === 'active');
                    const audits = beforeAProof.audit.filter(x => x.event_type === 'attachment.uploaded' && x.target_id === attachment.id); assert.equal(audits.length, 1); assert.equal(audits[0].request_id, complete.requestId); await proof('A-completed-new-final-and-one-audit', beforeAProof); await downloadCheck(attachment.id, WITNESSES84.A64); await actualObject({ provider: 'local', bucket: null, storageKey: a.storage_key }, WITNESSES84.A64, 'actual-owned-final-A-before-release');
                });
                await stage(STAGES[5], async () => {
                    assert.equal((await q(H, 'SELECT pg_advisory_unlock($1::bigint) AS unlocked', [key])).rows[0].unlocked, true); held = false;
                    const completed = await bounded(bPromise, 15000); assert(completed?.ok, 'B must actually finish with expected attachment conflict'); const message = completed.response.body?.message; assert.equal(Array.isArray(message) ? message.join('; ') : message, 'Attachment source or version changed; reload and retry', 'An unrelated auth409 is not this scenario');
                });
                await stage(STAGES[6], async () => {
                    const after = await snapshot(bResult.response.requestId); same(after, beforeAProof, 'Late B cannot change completed Session/Attachment/full flags/links/necessary audit'); same(await authRow(context.sessionProof.B), barrierAuthB, 'Failed B managed auth must match post-eager barrier baseline'); await proof('after-B409-no-business-or-pending-auth-change', { after, authB: await authRow(context.sessionProof.B) });
                    await downloadCheck(attachment.id, WITNESSES84.A64); await actualObject({ provider: 'local', bucket: null, storageKey: after.attachments[0].storage_key }, WITNESSES84.A64, 'actual-owned-final-A-after-B'); await actualObject({ provider: 'local', bucket: null, storageKey: after.session.storage_key }, WITNESSES84.B64, 'actual-owned-staging-B-after-B'); same(await legacy(), legacyBefore, 'Legacy52 storage binding must remain exactly unchanged'); await downloadCheck(legacyBefore.id, WITNESSES84.legacy39); same((await configs()).filter(c => c.id !== config.id), configRowsBefore, 'Existing provider rows untouched');
                    const runtimeAfter = await observeRuntime(context.runtimeFence); same(runtimeIdentity(runtimeAfter), runtimeIdentity(runtimeBefore), 'Pin same actual post-K86 running binary throughout'); await proof('actual-post-K86-runtime-after', runtimeAfter, 'runtime');
                });
            } catch (e) { failure = { stage: active, name: e.name }; await proof('failure-original', { name: e.name, message: e.message, stack: e.stack }, 'failure').catch(() => undefined); }
            finally {
                active = STAGES[7]; const s = result.stages[7]; try { await restore(); s.status = result.infrastructureRestored && restoreErrors.length === 0 ? 'passed' : 'failed'; } catch (e) { s.status = 'failed'; restoreErrors.push({ part: 'finally', name: e.name }); }
                for (const c of [C, H, O]) if (c) await c.end().catch(e => restoreErrors.push({ part: 'close-owned-connection', name: e.name }));
            }
            result.complete = !failure && restoreErrors.length === 0 && result.stages.every(s => s.status === 'passed'); return { ...manifest(), failure };
        },
    };
}
