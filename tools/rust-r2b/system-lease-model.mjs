import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { steps, uuid, maxLeaseMs } = require('./system-lease-protocol.cjs');

export const seedRoles = Object.freeze([
    { key: 'platform-admin', id: '30000000-0000-4000-8000-000000000001' },
    { key: 'project-viewer', id: '30000000-0000-4000-8000-000000000002' }
]);
const roleFields = 'created_at,created_by,description,display_order,id,is_active,is_system_role,name,role_key,row_version,updated_at,updated_by';
const permissionFields = 'assigned_at,assigned_by,change_reason,created_at,created_by,id,permission_key,revoked_at,revoked_by,role_id,status';
const userRoleFields = 'assigned_at,assigned_by,change_reason,created_at,created_by,id,revoked_at,revoked_by,role_id,status,user_id';
const auditFields = 'after_snapshot,before_snapshot,event_type,id,metadata,occurred_at,operator_id,reason,request_id,result,target_id,target_type';
export function fail(code = 'system_lease_unexpected_change') { throw new Error(code); }
export function canonical(value) {
    if (Array.isArray(value)) return JSON.stringify(value.map((item) => JSON.parse(canonical(item))));
    if (value && typeof value === 'object') return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map((key) => [key, JSON.parse(canonical(value[key]))])));
    return JSON.stringify(value);
}
export const equal = (left, right) => canonical(left) === canonical(right);
export const fingerprint = (value) => createHash('sha256').update(canonical(value)).digest('hex');
function exact(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== fields) fail('system_lease_shape');
}
function id(value) { if (typeof value !== 'string' || !uuid.test(value)) fail('system_lease_shape'); }
function nullableId(value) { if (value !== null) id(value); }
function timestamp(value, nullable = false) {
    if (nullable && value === null) return;
    if (typeof value !== 'string' || value.length > 64 || !Number.isFinite(Date.parse(value))) fail('system_lease_shape');
}
function uniqueIds(rows) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length) fail('system_lease_shape');
}
export function validateSnapshot(value) {
    exact(value, 'audits,catalog,permissions,roles,userRoles');
    if (!Array.isArray(value.roles) || value.roles.length !== 2 || !Array.isArray(value.permissions) ||
        value.permissions.length > 4096 || !Array.isArray(value.userRoles) || value.userRoles.length > 4096 ||
        !Array.isArray(value.audits) || value.audits.length > 4096 || !Array.isArray(value.catalog) || value.catalog.length > 1024) fail('system_lease_shape');
    for (const expected of seedRoles) {
        const row = value.roles.find((item) => item.id === expected.id);
        exact(row, roleFields);
        if (row.role_key !== expected.key || row.is_system_role !== true || typeof row.name !== 'string' ||
            (row.description !== null && typeof row.description !== 'string') || typeof row.is_active !== 'boolean' ||
            !Number.isSafeInteger(row.display_order) || !Number.isSafeInteger(row.row_version) || row.row_version < 1) fail('system_lease_shape');
        timestamp(row.created_at); timestamp(row.updated_at); nullableId(row.created_by); nullableId(row.updated_by);
    }
    for (const row of value.permissions) {
        exact(row, permissionFields); id(row.id);
        if (!seedRoles.some((role) => role.id === row.role_id) || typeof row.permission_key !== 'string' || typeof row.status !== 'string') fail('system_lease_shape');
        timestamp(row.assigned_at); timestamp(row.created_at); timestamp(row.revoked_at, true);
        nullableId(row.assigned_by); nullableId(row.created_by); nullableId(row.revoked_by);
        if (row.change_reason !== null && typeof row.change_reason !== 'string') fail('system_lease_shape');
    }
    for (const row of value.userRoles) {
        exact(row, userRoleFields); id(row.id); id(row.user_id);
        if (!seedRoles.some((role) => role.id === row.role_id) || typeof row.status !== 'string') fail('system_lease_shape');
        timestamp(row.assigned_at); timestamp(row.created_at); timestamp(row.revoked_at, true);
        nullableId(row.assigned_by); nullableId(row.created_by); nullableId(row.revoked_by);
        if (row.change_reason !== null && typeof row.change_reason !== 'string') fail('system_lease_shape');
    }
    for (const row of value.audits) {
        exact(row, auditFields); id(row.id);
        if (!seedRoles.some((role) => role.id === row.target_id) || row.target_type !== 'PlatformRole') fail('system_lease_shape');
        timestamp(row.occurred_at); nullableId(row.operator_id);
    }
    uniqueIds(value.roles); uniqueIds(value.permissions); uniqueIds(value.userRoles); uniqueIds(value.audits);
    return value;
}
export function businessState(snapshot) {
    return { roles: snapshot.roles, permissions: snapshot.permissions, userRoles: snapshot.userRoles, catalog: snapshot.catalog };
}
export function validateJournal(value, backend) {
    exact(value, 'actorId,authorized,backend,base,completed,createdAt,deadlineAt,formatVersion,leaseId,pending,runId,sourceHead,state');
    if (value.formatVersion !== 1 || value.backend !== backend || !['nest','rust'].includes(backend) ||
        !['active','restoring','restored'].includes(value.state) || value.sourceHead !== '9734515f84ebe1a4833d207124adbfbe378f691f') fail('system_lease_journal');
    id(value.runId); id(value.leaseId); id(value.actorId);
    timestamp(value.createdAt); timestamp(value.deadlineAt);
    if (Date.parse(value.deadlineAt) - Date.parse(value.createdAt) !== maxLeaseMs) fail('system_lease_journal');
    validateSnapshot(value.base); validateSnapshot(value.authorized);
    if (!Array.isArray(value.completed) || value.completed.length > 64) fail('system_lease_journal');
    for (const item of value.completed) {
        exact(item, 'auditId,step'); id(item.auditId);
        if (!steps.includes(item.step)) fail('system_lease_journal');
    }
    if (value.pending !== null) {
        exact(value.pending, 'startedAt,step'); timestamp(value.pending.startedAt);
        if (!steps.includes(value.pending.step)) fail('system_lease_journal');
    }
    if (value.state !== 'active' && value.pending !== null) fail('system_lease_journal');
    return value;
}
function activeKeys(snapshot, roleId) {
    return snapshot.permissions.filter((row) => row.role_id === roleId && row.status === 'active').map((row) => row.permission_key);
}
export function planStep(step, journal, authority) {
    if (!steps.includes(step)) fail('system_lease_step');
    const role = seedRoles[step.startsWith('admin-') ? 0 : 1];
    const old = journal.authorized.roles.find((row) => row.id === role.id);
    let method; let body; let suffix = ''; let expectedStatus = 200; let eventType;
    if (step.endsWith('reject-minimum')) {
        method = 'PUT'; suffix = '/permissions'; body = { permissionKeys: [] }; expectedStatus = 409;
        eventType = 'platform.role.permissions.baseline.rejected';
    } else if (step.endsWith('-edit')) {
        method = 'PATCH'; body = { name: 'R2B ' + role.key + ' ' + journal.runId }; eventType = 'platform.role.updated';
    } else if (step.endsWith('-deactivate') || step.endsWith('-activate')) {
        method = 'POST'; suffix = step.endsWith('-deactivate') ? ':deactivate' : ':activate';
        body = { expectedVersion: 9007199254740991, reason: 'R2B ignored compatibility input', comment: 'R2B ignored compatibility input' };
        eventType = suffix === ':activate' ? 'platform.role.activated' : 'platform.role.deactivated';
    } else {
        method = 'PUT'; suffix = '/permissions'; eventType = 'platform.role.permissions.replaced';
        body = { permissionKeys: step === 'admin-retain-all' ? authority.permissions.map((item) => item.key)
            : step === 'viewer-minimum-only' ? [...authority.minimumPermissions['project-viewer']] : activeKeys(journal.base, role.id) };
    }
    if (!old) fail('system_lease_shape');
    return { roleId: role.id, eventType, expectedStatus, request: { method, path: '/api/platform/roles/' + role.id + suffix, body } };
}
function inWindow(value, journal) {
    timestamp(value);
    const instant = Date.parse(value);
    if (instant < Date.parse(journal.pending.startedAt) - 1000 || instant > Date.parse(journal.deadlineAt) + 10000) fail();
}
function without(row, keys) { return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key))); }
function sameSet(left, right) { return Array.isArray(left) && Array.isArray(right) && equal([...left].sort(), [...right].sort()); }
export function validateStepResult(journal, current, authority, { permitUnstarted = false } = {}) {
    validateSnapshot(current);
    if (!journal.pending) fail('system_lease_state');
    const previous = journal.authorized;
    if (!equal(previous.catalog, current.catalog) || !equal(previous.userRoles, current.userRoles)) fail();
    const plan = planStep(journal.pending.step, journal, authority);
    const oldAudit = new Map(previous.audits.map((row) => [row.id, row]));
    for (const [auditId, row] of oldAudit) if (!equal(current.audits.find((item) => item.id === auditId), row)) fail();
    const addedAudits = current.audits.filter((row) => !oldAudit.has(row.id));
    if (permitUnstarted && addedAudits.length === 0 && equal(businessState(previous), businessState(current))) return null;
    if (addedAudits.length !== 1) fail();
    const audit = addedAudits[0];
    if (audit.operator_id !== journal.actorId || audit.event_type !== plan.eventType ||
        audit.target_id !== plan.roleId || audit.request_id !== null) fail();
    inWindow(audit.occurred_at, journal);
    const before = previous.roles.find((row) => row.id === plan.roleId);
    const after = current.roles.find((row) => row.id === plan.roleId);
    if (!equal(previous.roles.filter((row) => row.id !== plan.roleId), current.roles.filter((row) => row.id !== plan.roleId))) fail();
    if (plan.expectedStatus === 409) {
        if (!equal(businessState(previous), businessState(current)) || audit.result !== 'rejected' ||
            audit.reason !== 'system-role-baseline-violation' || audit.before_snapshot !== null || audit.after_snapshot !== null ||
            !equal(audit.metadata, { missingPermissionKeys: authority.minimumPermissions[before.role_key] })) fail();
        return audit.id;
    }
    if (audit.result !== 'success' || audit.reason !== null || audit.metadata !== null) fail();
    if (plan.request.method === 'PATCH' || plan.request.method === 'POST') {
        if (!equal(previous.permissions, current.permissions)) fail();
        const patch = plan.request.method === 'PATCH' ? plan.request.body
            : { is_active: plan.request.path.endsWith(':activate') };
        const changed = Object.entries(patch).some(([key, value]) => before[key] !== value);
        if (!equal(without(after, [...Object.keys(patch), 'row_version','updated_at']), without(before, [...Object.keys(patch), 'row_version','updated_at'])) ||
            Object.entries(patch).some(([key, value]) => after[key] !== value) || after.row_version !== before.row_version + Number(changed)) fail();
        if (changed) inWindow(after.updated_at, journal); else if (after.updated_at !== before.updated_at) fail();
        const beforeSnapshot = plan.request.method === 'PATCH' ? { name: before.name, description: before.description, displayOrder: before.display_order } : { isActive: before.is_active };
        const afterSnapshot = plan.request.method === 'PATCH' ? { name: after.name, description: after.description, displayOrder: after.display_order } : { isActive: after.is_active };
        if (!equal(audit.before_snapshot, beforeSnapshot) || !equal(audit.after_snapshot, afterSnapshot)) fail();
    } else {
        if (!equal(before, after)) fail();
        const next = [...new Set(plan.request.body.permissionKeys)];
        const nextSet = new Set(next);
        const oldRows = new Map(previous.permissions.map((row) => [row.id,row]));
        for (const [rowId, row] of oldRows) {
            const now = current.permissions.find((item) => item.id === rowId);
            if (!now) fail();
            if (row.role_id !== plan.roleId || row.status !== 'active' || nextSet.has(row.permission_key)) {
                if (!equal(row, now)) fail();
            } else {
                if (!equal(without(row, ['status','revoked_at','revoked_by']), without(now, ['status','revoked_at','revoked_by'])) ||
                    now.status !== 'revoked' || now.revoked_by !== journal.actorId) fail();
                inWindow(now.revoked_at, journal);
            }
        }
        const previousKeys = activeKeys(previous, plan.roleId);
        const expectedNew = new Set(next.filter((key) => !previousKeys.includes(key)));
        const added = current.permissions.filter((row) => !oldRows.has(row.id));
        if (added.length !== expectedNew.size) fail();
        for (const row of added) {
            if (row.role_id !== plan.roleId || !expectedNew.delete(row.permission_key) || row.status !== 'active' ||
                row.assigned_by !== journal.actorId || row.created_by !== journal.actorId ||
                row.revoked_at !== null || row.revoked_by !== null || row.change_reason !== null) fail();
            inWindow(row.assigned_at, journal); inWindow(row.created_at, journal);
        }
        if (!audit.before_snapshot || Object.keys(audit.before_snapshot).join(',') !== 'permissionKeys' ||
            !sameSet(audit.before_snapshot.permissionKeys, previousKeys) || !equal(audit.after_snapshot, { permissionKeys: next })) fail();
    }
    return audit.id;
}
