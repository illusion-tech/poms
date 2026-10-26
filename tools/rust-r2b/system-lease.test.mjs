import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { businessState, equal, planStep, seedRoles, validateJournal, validateSnapshot, validateStepResult } from './system-lease-model.mjs';
import { initializeSession, leaseStore, restoreLease } from './system-lease-storage.mjs';

const require = createRequire(import.meta.url);
const { parseMessage, maxLeaseMs, steps } = require('./system-lease-protocol.cjs');
const { attachLease } = require('./invoke-system-lease.cjs');
const authority = JSON.parse(readFileSync(new URL('./roles-authority.json', import.meta.url), 'utf8'));
const runId = '11111111-1111-4111-8111-111111111111';
const leaseId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const createdAt = '2026-10-27T00:00:00.000Z';
const operationAt = '2026-10-27T00:00:02.123Z';
const originalAt = '2026-10-20T08:00:00.123456+08:00';
const id = (number) => '60000000-0000-4000-8000-' + number.toString(16).padStart(12,'0');
function permission(roleId, key, number) {
    return { id: id(number), role_id: roleId, permission_key: key, status: 'active', assigned_at: originalAt,
        assigned_by: null, revoked_at: null, revoked_by: null, change_reason: null, created_at: originalAt, created_by: null };
}
function baseline() {
    const roles = seedRoles.map((role, index) => ({
        id: role.id, role_key: role.key, name: role.key, description: 'original',
        is_active: true, is_system_role: true, display_order: index * 10, row_version: 1,
        created_at: originalAt, created_by: null, updated_at: originalAt, updated_by: null
    }));
    const permissions = authority.minimumPermissions['platform-admin'].map((key,index) => permission(seedRoles[0].id,key,index + 1));
    const viewer = [...authority.minimumPermissions['project-viewer'],'customer:read','nav:customers:view'];
    permissions.push(...viewer.map((key,index) => permission(seedRoles[1].id,key,index + 100)));
    return validateSnapshot({ roles, permissions, userRoles: [], audits: [], catalog: [{ kind: 'original-schema' }] });
}
function journal(step) {
    const base = baseline();
    return {
        formatVersion: 1, backend: 'rust', runId, leaseId, actorId, state: 'active',
        sourceHead: '9734515f84ebe1a4833d207124adbfbe378f691f', base, authorized: structuredClone(base),
        pending: step ? { step, startedAt: '2026-10-27T00:00:01.000Z' } : null, completed: [], createdAt,
        deadlineAt: new Date(Date.parse(createdAt) + maxLeaseMs).toISOString()
    };
}
function audit(record, plan, before, after) {
    return { id: id(900), event_type: plan.eventType, target_type: 'PlatformRole', target_id: plan.roleId,
        operator_id: record.actorId, request_id: null, result: plan.expectedStatus === 409 ? 'rejected' : 'success',
        reason: plan.expectedStatus === 409 ? 'system-role-baseline-violation' : null,
        before_snapshot: before, after_snapshot: after,
        metadata: plan.expectedStatus === 409 ? { missingPermissionKeys: authority.minimumPermissions[record.authorized.roles.find((role) => role.id === plan.roleId).role_key] } : null,
        occurred_at: operationAt };
}
function rejected(record) {
    const current = structuredClone(record.authorized);
    current.audits.push(audit(record,planStep(record.pending.step,record,authority),null,null));
    return current;
}
function edited(record) {
    const current = structuredClone(record.authorized);
    const plan = planStep(record.pending.step,record,authority);
    const before = record.authorized.roles.find((role) => role.id === plan.roleId);
    const after = current.roles.find((role) => role.id === plan.roleId);
    after.name = plan.request.body.name; after.row_version++; after.updated_at = operationAt;
    current.audits.push(audit(record,plan,
        { name: before.name, description: before.description, displayOrder: before.display_order },
        { name: after.name, description: after.description, displayOrder: after.display_order }));
    return current;
}
test('strict protocol rejects caller SQL, role lists, actor overrides and unknown steps', () => {
    const base = { formatVersion: 1, runId, backend: 'rust', action: 'acquire', sequence: 0 };
    assert.deepEqual(parseMessage(Buffer.from(JSON.stringify(base))), base);
    for (const extra of [{ sql: 'delete' },{ roles: seedRoles },{ actorId },{ url: 'postgres://host' }]) {
        assert.throws(() => parseMessage(Buffer.from(JSON.stringify({ ...base,...extra }))));
    }
    assert.throws(() => parseMessage(Buffer.from(JSON.stringify({ ...base,backend:'prod' }))));
    assert.throws(() => parseMessage(Buffer.from(JSON.stringify({ ...base,action:'before',sequence:1,leaseId,step:'anything' }))));
});
test('fixed plans cover the real two minima and ignored activation inputs', () => {
    for (const step of steps) {
        const plan = planStep(step,journal(step),authority);
        assert(seedRoles.some((role) => role.id === plan.roleId));
        assert(plan.request.path.startsWith('/api/platform/roles/' + plan.roleId));
    }
    assert.equal(planStep('admin-reject-minimum',journal(),authority).expectedStatus,409);
    assert.equal(planStep('viewer-reject-minimum',journal(),authority).expectedStatus,409);
    assert.equal(planStep('admin-activate',journal(),authority).request.body.expectedVersion,9007199254740991);
    assert.equal(planStep('viewer-minimum-only',journal(),authority).request.body.permissionKeys.length,6);
});

test('app snapshot and owner restore explicitly share verified catalog deparser settings', async () => {
    const expected = ["SET TIME ZONE 'Etc/GMT-8'",'SET search_path TO poms, public',"SELECT current_setting('TimeZone') AS timezone,current_setting('search_path') AS search_path"];
    for (const searchPath of ['poms, public','"$user", public']) {
        const commands = [];
        const client = { async query(sql) {
            commands.push(sql);
            return { rows:[{ timezone:'Etc/GMT-8',search_path:searchPath }] };
        } };
        if (searchPath === 'poms, public') await initializeSession(client);
        else await assert.rejects(initializeSession(client),/system_lease_session/);
        assert.deepEqual(commands,expected);
    }
});
test('raw snapshot/journal keeps every original UUID and microsecond string', () => {
    const record = journal();
    validateJournal(record,'rust');
    assert.equal(record.base.roles[0].created_at,originalAt);
    const directory = mkdtempSync(join(tmpdir(),'poms-r2b-system-lease-'));
    try {
        const store = leaseStore('rust',directory);
        store.create(record);
        const read = store.active();
        assert.deepEqual(read,record);
        assert.equal(read.base.permissions[0].assigned_at,originalAt);
        const changed = structuredClone(record); changed.base.roles[0].created_at = new Date(originalAt).toISOString();
        assert.throws(() => store.write(changed),/immutable_snapshot/);
        assert.throws(() => store.create({ ...record,leaseId:id(999) }),/unrecovered/);
        record.state = 'restored'; store.write(record);
        store.create({ ...journal(),leaseId:id(999) });
        assert.equal(store.active().leaseId,id(999));
    } finally {
        assert(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'));
        rmSync(directory,{ recursive:true });
    }
});
test('sidecars are bounded and private-directory symlinks are refused', () => {
    const directory = mkdtempSync(join(tmpdir(),'poms-r2b-system-lease-'));
    try {
        const store = leaseStore('rust',directory);
        const large = journal(); large.base.catalog = [{ text:'x'.repeat(store.maximumBytes) }];
        assert.throws(() => store.create(large),/size/);
        assert.equal(store.active(),undefined);
        const link = join(directory,'link');
        symlinkSync(directory,link,process.platform === 'win32' ? 'junction' : 'dir');
        assert.throws(() => leaseStore('rust',link),/directory/);
    } finally {
        assert(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'));
        rmSync(directory,{ recursive:true });
    }
});
test('minimum rejection requires the known actor and exact rejected audit', () => {
    for (const step of ['admin-reject-minimum','viewer-reject-minimum']) {
        const record = journal(step); const current = rejected(record);
        assert.equal(validateStepResult(record,current,authority),id(900));
        const wrongActor = structuredClone(current); wrongActor.audits[0].operator_id = id(800);
        assert.throws(() => validateStepResult(record,wrongActor,authority));
        const wrongMissing = structuredClone(current); wrongMissing.audits[0].metadata.missingPermissionKeys = [];
        assert.throws(() => validateStepResult(record,wrongMissing,authority));
    }
});
test('edits accept only the registered fields and internal version increment', () => {
    const record = journal('admin-edit'); const current = edited(record);
    assert.equal(validateStepResult(record,current,authority),id(900));
    for (const change of [
        (value) => { value.roles[0].is_system_role = false; },
        (value) => { value.roles[0].row_version += 1; },
        (value) => { value.roles[1].description = 'foreign'; },
        (value) => { value.catalog.push({ kind:'new-trigger' }); }
    ]) {
        const invalid = structuredClone(current); change(invalid);
        assert.throws(() => validateStepResult(record,invalid,authority));
    }
});
test('role relationship changes and original audit deletion are never recovery authority', () => {
    const record = journal('admin-edit'); const current = edited(record);
    current.userRoles.push({ id:id(700),user_id:id(701),role_id:seedRoles[0].id,status:'active',assigned_at:originalAt,assigned_by:null,revoked_at:null,revoked_by:null,change_reason:null,created_at:originalAt,created_by:null });
    assert.throws(() => validateStepResult(record,current,authority));
    const unstarted = journal('admin-edit');
    assert.throws(() => validateStepResult(unstarted,unstarted.authorized,authority));
    assert.equal(validateStepResult(unstarted,unstarted.authorized,authority,{ permitUnstarted:true }),null);
});
test('permissions revoke and re-add preserve original history and require known new-row actor', () => {
    const record = journal('viewer-minimum-only');
    const plan = planStep(record.pending.step,record,authority);
    const current = structuredClone(record.authorized);
    const previous = current.permissions.filter((row) => row.role_id === plan.roleId).map((row) => row.permission_key);
    for (const row of current.permissions.filter((row) => row.role_id === plan.roleId && !plan.request.body.permissionKeys.includes(row.permission_key))) {
        row.status = 'revoked'; row.revoked_at = operationAt; row.revoked_by = actorId;
    }
    current.audits.push(audit(record,plan,{ permissionKeys:previous },{ permissionKeys:plan.request.body.permissionKeys }));
    assert.equal(validateStepResult(record,current,authority),id(900));
    const next = structuredClone(record); next.authorized = current; next.pending.step = 'viewer-readd-original';
    const added = structuredClone(current); const readd = planStep(next.pending.step,next,authority);
    let number = 1000;
    for (const key of ['customer:read','nav:customers:view']) {
        const row = permission(plan.roleId,key,number++);
        row.assigned_by = actorId; row.created_by = actorId; row.assigned_at = operationAt; row.created_at = operationAt;
        added.permissions.push(row);
    }
    const auditRow = audit(next,readd,{ permissionKeys:authority.minimumPermissions['project-viewer'] },{ permissionKeys:readd.request.body.permissionKeys });
    auditRow.id = id(901); added.audits.push(auditRow);
    assert.equal(validateStepResult(next,added,authority),id(901));
    const originalCount = record.base.permissions.length;
    assert.equal(added.permissions.length,originalCount + 2);
    assert(record.base.permissions.every((row) => added.permissions.some((value) => value.id === row.id)));
    added.permissions.at(-1).created_by = id(777);
    assert.throws(() => validateStepResult(next,added,authority));
});
function fakeChild({ invalidReady = false, closeDelay = 0 } = {}) {
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.closed = false;
    child.stdin.on('data',(chunk) => {
        const message = parseMessage(chunk);
        let value = { ...message, event:{ acquire:'ready',before:'step-ready',after:'step-complete',release:'released' }[message.action],leaseId };
        if (message.action === 'acquire') {
            value = { ...value,actorId,roles:seedRoles };
            if (invalidReady) value.backend = 'prod';
        } else if (message.action === 'before') {
            value = { ...value,...planStep(message.step,journal(message.step),authority) };
        } else if (message.action === 'after') value.auditId = id(900);
        else { value.restored = true; value.completed = 1; }
        child.stdout.write(JSON.stringify(value) + '\n');
    });
    child.stdin.on('finish',() => setTimeout(() => { child.closed = true; child.emit('close',0); },closeDelay));
    return child;
}
test('persistent adapter waits for released acknowledgement and child exit', async () => {
    const child = fakeChild({ closeDelay:25 });
    const handle = await attachLease(child,{ formatVersion:1,runId,backend:'rust',action:'acquire',sequence:0 });
    handle.assertAlive();
    const step = await handle.before('admin-edit');
    assert.equal(step.request.method,'PATCH');
    await handle.after('admin-edit');
    const released = await handle.release();
    assert.equal(released.restored,true);
    assert.equal(child.closed,true);
    assert.throws(() => handle.assertAlive());
});
test('persistent adapter refuses mismatched ready and never reflects stderr', async () => {
    const child = fakeChild({ invalidReady:true });
    child.stderr.write('sensitive database details');
    await assert.rejects(attachLease(child,{ formatVersion:1,runId,backend:'rust',action:'acquire',sequence:0 }),/invalid protocol/);
});

test('persistent adapter exposes only bounded static restore stage and PostgreSQL code', async () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.stdin.on('data',() => {
        child.stderr.write('sensitive database details\n');
        child.stderr.write(JSON.stringify({ formatVersion:1,code:'system_lease_failed',stage:'restore_permissions',sqlstate:'22003' }) + '\n');
        queueMicrotask(() => child.emit('close',1));
    });
    await assert.rejects(attachLease(child,{ formatVersion:1,runId,backend:'rust',action:'acquire',sequence:0 }),(error) => {
        assert.equal(error.diagnostic.code,'system_lease_failed');
        assert.equal(error.diagnostic.stage,'restore_permissions');
        assert.equal(error.diagnostic.sqlstate,'22003');
        assert(!error.message.includes('sensitive database details'));
        return true;
    });
});

// A deterministic transaction double checks the recovery state machine only.
// Real PostgreSQL row locks, casts and crash behavior remain separate acceptance.
function transactionDouble(initial, { failCommitAfterApply = false, failPermissionWrite = false } = {}) {
    let state = structuredClone(initial);
    let transaction;
    let commitFailure = failCommitAfterApply;
    let permissionFailure = failPermissionWrite;
    const commands = [];
    return {
        get state() { return state; },
        commands,
        async query(sql,args = []) {
            commands.push(sql);
            if (sql === 'BEGIN') { transaction = structuredClone(state); return {}; }
            if (sql === 'ROLLBACK') { if (transaction) state = transaction; transaction = undefined; return {}; }
            if (sql === 'COMMIT') {
                transaction = undefined;
                if (commitFailure) { commitFailure = false; throw new Error('synthetic lost commit acknowledgement'); }
                return {};
            }
            if (sql.startsWith('select id from')) return { rows:[] };
            if (sql.startsWith('select to_jsonb(r) as data from poms.role r')) return { rows:state.roles.map((data) => ({ data })) };
            if (sql.startsWith('select to_jsonb(r) as data from poms.role_permission_assignment')) return { rows:state.permissions.map((data) => ({ data })) };
            if (sql.startsWith('select to_jsonb(r) as data from poms.user_role_assignment')) return { rows:state.userRoles.map((data) => ({ data })) };
            if (sql.startsWith('select to_jsonb(r) as data from poms.audit_log')) return { rows:state.audits.map((data) => ({ data })) };
            if (sql.includes("'kind','column'")) return { rows:state.catalog.map((data) => ({ data })) };
            if (sql.includes("'kind','constraint'") || sql.includes("'kind','index'") || sql.includes("'kind','trigger'")) return { rows:[] };
            if (sql.startsWith('delete from poms.role_permission_assignment')) {
                const previous = state.permissions.length;
                state.permissions = state.permissions.filter((row) => !args[0].includes(row.id));
                return { rowCount:previous - state.permissions.length };
            }
            if (sql.startsWith('update poms.role r set')) {
                state.roles = JSON.parse(args[0]); return { rowCount:state.roles.length };
            }
            if (sql.startsWith('update poms.role_permission_assignment')) {
                if (permissionFailure) { permissionFailure = false; throw new Error('synthetic permission write failure'); }
                const original = JSON.parse(args[0]);
                state.permissions = state.permissions.map((row) => original.find((value) => value.id === row.id) ?? row);
                return { rowCount:original.length };
            }
            throw new Error('unexpected SQL in transaction double');
        }
    };
}
function completedEdit() {
    const record = journal('admin-edit');
    const current = edited(record);
    const auditId = validateStepResult(record,current,authority);
    record.completed.push({ step:record.pending.step,auditId });
    record.pending = null; record.authorized = current;
    return record;
}
function memoryStore() {
    const values = [];
    return { values, write(value) { validateJournal(value,'rust'); values.push(structuredClone(value)); } };
}
test('restore preserves original raw precision and leaves run audit as evidence', async () => {
    const record = completedEdit();
    const database = transactionDouble(record.authorized);
    const store = memoryStore();
    await restoreLease(database,store,record,authority);
    assert(equal(businessState(database.state),businessState(record.base)));
    assert.equal(database.state.roles[0].created_at,originalAt);
    assert.equal(database.state.permissions[0].assigned_at,originalAt);
    assert.equal(database.state.audits.length,1);
    assert.deepEqual(store.values.map((value) => value.state),['restoring','restored']);
});
test('unknown current change is refused before recovery DML', async () => {
    const record = completedEdit();
    const changed = structuredClone(record.authorized); changed.roles[1].name = 'third party';
    const database = transactionDouble(changed);
    await assert.rejects(restoreLease(database,memoryStore(),record,authority));
    assert(!database.commands.some((sql) => /^(update|delete)/.test(sql)));
    assert.equal(database.state.roles[1].name,'third party');
});

test('catalog mismatch is rejected before restore intent or DML and reports its safe stage', async () => {
    const record = completedEdit();
    const changed = structuredClone(record.authorized); changed.catalog[0].kind = 'different-deparser-or-ddl';
    const database = transactionDouble(changed);
    const store = memoryStore();
    await assert.rejects(restoreLease(database,store,record,authority),(error) => {
        assert.equal(error.message,'system_lease_catalog_changed');
        assert.equal(error.systemLeaseStage,'validate_snapshot');
        return true;
    });
    assert.equal(store.values.length,0);
    assert(!database.commands.some((sql) => /^(update|delete)/.test(sql)));
    assert.equal(record.state,'active');
});
test('crash after restore COMMIT before receipt is recognized without a second DML restore', async () => {
    const record = completedEdit();
    const database = transactionDouble(record.authorized,{ failCommitAfterApply:true });
    const store = memoryStore();
    await assert.rejects(restoreLease(database,store,record,authority),/commit acknowledgement/);
    const persisted = structuredClone(store.values.at(-1));
    assert.equal(persisted.state,'restoring');
    assert(equal(businessState(database.state),businessState(record.base)));
    const count = database.commands.filter((sql) => /^(update|delete)/.test(sql)).length;
    await restoreLease(database,store,persisted,authority);
    assert.equal(database.commands.filter((sql) => /^(update|delete)/.test(sql)).length,count);
    assert.equal(persisted.state,'restored');
});
test('restore write failure rolls back and the retained restoring receipt can be replayed', async () => {
    const record = completedEdit();
    const database = transactionDouble(record.authorized,{ failPermissionWrite:true });
    const store = memoryStore();
    await assert.rejects(restoreLease(database,store,record,authority),/permission write failure/);
    assert(equal(database.state,record.authorized));
    const persisted = structuredClone(store.values.at(-1));
    assert.equal(persisted.state,'restoring');
    await restoreLease(database,store,persisted,authority);
    assert(equal(businessState(database.state),businessState(record.base)));
    assert.equal(persisted.state,'restored');
});
test('unacknowledged pending work needs real completion evidence or a stopped backend', async () => {
    const record = journal('admin-edit');
    const database = transactionDouble(record.authorized);
    await assert.rejects(restoreLease(database,memoryStore(),record,authority));
    assert(!database.commands.some((sql) => /^(update|delete)/.test(sql)));
    await restoreLease(database,memoryStore(),record,authority,{ backendStopped:true });
    assert.equal(record.state,'restored');
});
