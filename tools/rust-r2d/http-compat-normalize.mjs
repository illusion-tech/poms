import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dtoCases, frozenGolden, sequentialCases, rejectedDtoHttpExpectation } from './http-compat-cases.mjs';
import { responseUsers, validateProjection, validateHeadReference } from './http-compat.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidShape = /\{?(?:(?:[0-9a-f]{8}|%[0-9a-f]{2}[0-9a-f]{7})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})\}?/gi;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const factTables = Object.freeze(['platform_user', 'local_credential', 'auth_session', 'user_role_assignment', 'user_org_membership', 'role', 'org_unit', 'role_permission_assignment', 'audit_log', 'security_event']);
const timeKeys = new Set(['createdAt', 'updatedAt', 'occurredAt', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'revokedAt', 'expiresAt', 'lastLoginAt', 'created_at', 'updated_at', 'occurred_at', 'last_seen_at', 'idle_expires_at', 'absolute_expires_at', 'assigned_at', 'revoked_at', 'expires_at', 'last_login_at']);
const fixedTimeCeiling = 1609459200000000n;

export function epochMicros(value) {
    assert.equal(typeof value, 'string', 'Timestamp string required');
    const match = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    assert(match, 'Timestamp must keep explicit timezone and PG microseconds');
    const [year, month, day, hour, minute, second] = match[1].match(/\d+/g).map(Number);
    assert(month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour < 24 && minute < 60 && second < 60, 'Valid timestamp calendar required');
    const seconds = Date.parse(match[1] + match[3]);
    assert(Number.isFinite(seconds), 'Valid timestamp timezone required');
    return BigInt(seconds) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0'));
}
function inRequest(value, row) {
    const epoch = epochMicros(value);
    assert(epoch >= epochMicros(row.startedAt) - 5000n && epoch <= epochMicros(row.finishedAt) + 5000n, row.id + ': changed time outside actual request');
}
export function validateNewRowTimes(value, table, row) {
    const times = Object.fromEntries(Object.entries(value).filter(([key, child]) => timeKeys.has(key) && child !== null).map(([key, child]) => [key, epochMicros(child)]));
    const deadlines = new Set(['idle_expires_at', 'absolute_expires_at', 'expires_at']);
    for (const key of Object.keys(times)) if (!deadlines.has(key)) inRequest(value[key], row);
    if (Object.hasOwn(times, 'created_at') && Object.hasOwn(times, 'updated_at')) assert(times.updated_at >= times.created_at, row.id + ': new ' + table + ' updated_at precedes created_at');
    if (Object.hasOwn(times, 'assigned_at') && Object.hasOwn(times, 'revoked_at')) assert(times.revoked_at >= times.assigned_at, row.id + ': new ' + table + ' revoked_at precedes assignment');
    if (Object.hasOwn(times, 'last_seen_at') && Object.hasOwn(times, 'idle_expires_at')) assert(times.idle_expires_at >= times.last_seen_at, row.id + ': new session idle deadline precedes last_seen_at');
    if (Object.hasOwn(times, 'idle_expires_at') && Object.hasOwn(times, 'absolute_expires_at')) assert(times.absolute_expires_at >= times.idle_expires_at, row.id + ': new session absolute deadline precedes idle deadline');
    const keys = Object.keys(times).sort(), order = {};
    for (const [index, left] of keys.entries()) for (const right of keys.slice(index + 1)) order[left + ':' + right] = times[left] < times[right] ? -1 : times[left] > times[right] ? 1 : 0;
    // Calendar/window checks precede dynamic time normalization. Retain every
    // same-row equality and order relation, including separate onCreate calls.
    return { newRow: true, timeOrder: order };
}
function wireTime(value, fact, label) {
    if (fact === null) { assert.equal(value, null, label + ': nullable wire time'); return; }
    assert.equal(new Date(value).toISOString(), value, label + ': Date.toISOString wire form');
    assert.equal(BigInt(Date.parse(value)), epochMicros(fact) / 1000n, label + ': wire time must match its own PG row');
}
function idsEqual(actual, expected, message) {
    assert.deepEqual(actual, expected, message);
    assert.equal(new Set(actual).size, actual.length, message + ': duplicates');
}
function responseOrgs(body, operation, status, method) {
    if (method === 'HEAD' || ![200, 201].includes(status) || !body) return [];
    return operation === 'orgs' && Array.isArray(body) ? body : operation === 'owner-reference' ? body.orgUnits ?? [] : body.orgUnits ?? [];
}
export function validateResponseFacts(run, body, operation, status, method, facts, row) {
    assert.equal(facts?.database, 'poms_r2d_' + run.backend, row.id + ': fixed response observer database');
    assert.equal(facts.readOnly, true, row.id + ': read-only response observer');
    const users = responseUsers(body, operation, status, method), orgs = responseOrgs(body, operation, status, method);
    const roles = operation === 'roles' && status === 200 && method !== 'HEAD' && Array.isArray(body) ? body : [];
    const orgIds = [...new Set(orgs.map(org => org.id))];
    idsEqual(facts.requestedUserIds, users.map(user => user.id), row.id + ': every response user in original order');
    idsEqual(facts.requestedOrgIds, orgIds, row.id + ': every response organization in original encounter order');
    idsEqual(facts.requestedRoleIds, roles.map(role => role.id), row.id + ': every response role in original order');
    for (const [name, ids] of [['users', facts.requestedUserIds], ['organizations', orgIds], ['roles', facts.requestedRoleIds]]) {
        idsEqual(facts[name].map(value => value.id), ids, row.id + ': exact ' + name + ' observer coverage');
        assert(facts[name].every(value => uuid.test(value.id)), row.id + ': canonical observed entity IDs');
    }
    inRequest(facts.startedAt, row); inRequest(facts.finishedAt, row);
    assert(epochMicros(facts.finishedAt) >= epochMicros(facts.startedAt), row.id + ': observer time order');
    for (const [index, user] of users.entries()) {
        const fact = facts.users[index];
        for (const [key, dbKey] of [['username', 'username'], ['displayName', 'display_name'], ['email', 'email'], ['phone', 'phone'], ['avatarUrl', 'avatar_url'], ['emailVerified', 'email_verified'], ['phoneVerified', 'phone_verified'], ['isActive', 'is_active'], ['rowVersion', 'row_version'], ['createdBy', 'created_by'], ['updatedBy', 'updated_by']]) {
            if (Object.hasOwn(user, key)) assert.deepEqual(user[key], fact[dbKey], row.id + ': wire/PG user field ' + key);
        }
        if (['create', 'activate', 'deactivate'].includes(operation) && Object.hasOwn(user, 'primaryOrgUnitId')) assert.equal(user.primaryOrgUnitId, fact.primary_org_unit_id, row.id + ': raw primary org field');
        for (const [key, dbKey] of [['createdAt', 'created_at'], ['updatedAt', 'updated_at'], ['lastLoginAt', 'last_login_at']]) if (Object.hasOwn(user, key)) wireTime(user[key], fact[dbKey], row.id + '/' + key);
    }
    const orgById = new Map(facts.organizations.map(value => [value.id, value]));
    for (const org of orgs) {
        const fact = orgById.get(org.id);
        for (const [key, dbKey] of [['name', 'name'], ['code', 'code'], ['description', 'description'], ['isActive', 'is_active']]) if (Object.hasOwn(org, key)) assert.deepEqual(org[key], fact[dbKey], row.id + ': wire/PG org field ' + key);
        for (const [key, dbKey] of [['createdAt', 'created_at'], ['updatedAt', 'updated_at']]) if (Object.hasOwn(org, key)) wireTime(org[key], fact[dbKey], row.id + '/org/' + key);
    }
    for (const [index, role] of roles.entries()) {
        const fact = facts.roles[index];
        for (const [key, dbKey] of [['name', 'name'], ['roleKey', 'role_key'], ['description', 'description'], ['isActive', 'is_active'], ['displayOrder', 'display_order'], ['isSystemRole', 'is_system_role']]) if (Object.hasOwn(role, key)) assert.deepEqual(role[key], fact[dbKey], row.id + ': wire/PG role field ' + key);
        for (const [key, dbKey] of [['createdAt', 'created_at'], ['updatedAt', 'updated_at']]) if (Object.hasOwn(role, key)) wireTime(role[key], fact[dbKey], row.id + '/role/' + key);
    }
    validateProjection(body, operation, status, method);
}

function validateState(state, row, label) {
    assert(state && typeof state === 'object', row.id + ': ' + label + ' state required');
    assert.deepEqual(Object.keys(state.facts).sort(), [...factTables].sort(), row.id + ': complete ten-table owned facts');
    for (const table of factTables) {
        const rows = state.facts[table]; assert(Array.isArray(rows), row.id + ': facts array ' + table);
        assert(rows.every(value => uuid.test(value.id)), row.id + ': canonical fact IDs ' + table);
        assert.equal(new Set(rows.map(value => value.id)).size, rows.length, row.id + ': unique fact IDs ' + table);
        for (const value of rows) for (const secret of ['password_hash', 'token_hash', 'csrf_token_hash']) assert(!Object.hasOwn(value, secret), row.id + ': facts must contain only redacted fingerprints');
    }
    const { snapshot, facts } = state, session = facts.auth_session.find(value => value.id === snapshot.session.id);
    assert(session, row.id + ': selected session must exist in complete facts');
    for (const [key, dbKey] of [['id', 'id'], ['rowVersion', 'row_version'], ['status', 'status'], ['revokedReason', 'revoked_reason']]) assert.deepEqual(snapshot.session[key], session[dbKey], row.id + ': selected session ' + key);
    for (const [key, dbKey] of [['lastSeenAt', 'last_seen_at'], ['idleExpiresAt', 'idle_expires_at'], ['absoluteExpiresAt', 'absolute_expires_at'], ['updatedAt', 'updated_at'], ['revokedAt', 'revoked_at']]) wireTime(snapshot.session[key], session[dbKey], row.id + '/session/' + key);
    for (const [name, table, fields] of [
        ['audits', 'audit_log', { id: 'id', eventType: 'event_type', targetType: 'target_type', targetId: 'target_id', operatorId: 'operator_id', requestId: 'request_id', result: 'result', reason: 'reason', beforeSnapshot: 'before_snapshot', afterSnapshot: 'after_snapshot', metadata: 'metadata' }],
        ['securityEvents', 'security_event', { id: 'id', eventType: 'event_type', actorId: 'actor_id', principal: 'principal', requestId: 'request_id', path: 'path', method: 'method', permissionKey: 'permission_key', result: 'result', details: 'details' }]
    ]) {
        const byId = new Map(facts[table].map(value => [value.id, value]));
        assert.equal(snapshot[name].length, byId.size, row.id + ': complete snapshot ' + name);
        assert.equal(new Set(snapshot[name].map(value => value.id)).size, byId.size, row.id + ': unique snapshot ' + name);
        for (const value of snapshot[name]) {
            const fact = byId.get(value.id); assert(fact, row.id + ': snapshot row in facts');
            for (const [key, dbKey] of Object.entries(fields)) assert.deepEqual(value[key], fact[dbKey], row.id + ': snapshot audit/security field ' + key);
            wireTime(value.occurredAt, fact.occurred_at, row.id + '/history');
        }
        const ordered = [...snapshot[name]].sort((a, b) => epochMicros(a.occurredAt) < epochMicros(b.occurredAt) ? -1 : epochMicros(a.occurredAt) > epochMicros(b.occurredAt) ? 1 : a.id.localeCompare(b.id));
        assert.deepEqual(snapshot[name], ordered, row.id + ': source snapshot history order');
    }
}
export function validateTransition(row) {
    validateState(row.beforeState, row, 'before'); validateState(row.afterState, row, 'after');
    const before = row.beforeState.facts, after = row.afterState.facts, temporal = {};
    assert.equal(row.beforeState.snapshot.session.id, row.afterState.snapshot.session.id, row.id + ': selected session identity');
    for (const table of factTables) {
        const old = new Map(before[table].map(value => [value.id, value])), current = new Map(after[table].map(value => [value.id, value]));
        for (const value of before[table]) {
            const next = current.get(value.id);
            if (['local_credential', 'audit_log', 'security_event'].includes(table)) assert.deepEqual(next, value, row.id + ': immutable existing credential/history row');
            if (!next) continue;
            const changes = {};
            for (const key of Object.keys(value).filter(key => timeKeys.has(key))) {
                const same = value[key] === null || next[key] === null ? value[key] === next[key] : epochMicros(value[key]) === epochMicros(next[key]);
                changes[key] = same;
                if (key === 'created_at') assert(same, row.id + ': existing created_at is immutable');
                if (!same && next[key] !== null && ['updated_at', 'last_seen_at', 'revoked_at'].includes(key)) inRequest(next[key], row);
            }
            temporal[table + ':' + value.id] = changes;
        }
        if (table === 'local_credential') assert.equal(current.size, old.size, row.id + ': routes never create a credential');
        for (const value of after[table]) if (!old.has(value.id)) temporal[table + ':' + value.id] = validateNewRowTimes(value, table, row);
    }
    const first = row.beforeState.snapshot.session, last = row.afterState.snapshot.session;
    assert.equal(first.absoluteExpiresAt, last.absoluteExpiresAt, row.id + ': session absolute deadline is unchanged');
    const delta = last.rowVersion - first.rowVersion; assert(Number.isSafeInteger(delta) && delta >= 0, row.id + ': monotonic selected session version');
    if (first.lastSeenAt !== last.lastSeenAt) {
        assert.equal(epochMicros(last.idleExpiresAt), [epochMicros(last.lastSeenAt) + 900000000n, epochMicros(last.absoluteExpiresAt)].reduce((a, b) => a < b ? a : b), row.id + ': idle deadline uses actual touch');
    }
    if (row.group === 'profile' && row.due && row.status === 200) assert.equal(delta, 2, row.id + ': original due profile two-flush session delta');
    return { temporal, sessionVersionDelta: delta, auditDelta: after.audit_log.length - before.audit_log.length, securityDelta: after.security_event.length - before.security_event.length };
}

export function declaredEntries(run) {
    const username = 'r2d_u000_' + run.runId.replaceAll('-', ''), displayName = 'R2D u000 ' + run.runId.slice(0, 8);
    return [{ id: 'create:target', route: '/api/platform/users', createSlot: 'u000', json: { username, displayName, primaryOrgUnitId: null, initialRoleIds: [] }, expectedStatus: 201 }, ...sequentialCases({
        userId: run.identities.users.u000, roleId: run.identities.roles.alpha, orgId: run.identities.orgs.alpha, viewerOrgId: run.identities.orgs.viewer,
        inactiveRoleId: run.identities.roles.inactive, inactiveOrgId: run.identities.orgs.inactive, username, displayName, missingUserId: run.identities.missingUser
    })];
}
export function expectedFixtureTrace(run) {
    const expected = [{ action: 'prepare', account: 'none' }];
    for (const entry of declaredEntries(run)) {
        const monitor = entry.account === 'none' ? 'admin' : entry.account ?? 'admin';
        for (const action of entry.before ?? []) expected.push({ account: 'none', ...action });
        expected.push({ action: entry.due ? 'session-due' : 'session-non-due', account: monitor }, { action: 'snapshot', account: monitor });
        if (entry.createSlot) expected.push({ action: 'user-plan', account: 'none', userSlot: entry.createSlot }, { action: 'user-adopt', account: 'none', userSlot: entry.createSlot });
        expected.push({ action: 'snapshot', account: monitor });
    }
    expected.push({ action: 'cleanup', account: 'none' }, { action: 'cleanup', account: 'none' }); return expected;
}
export function validateFixtureTrace(run) {
    assert.deepEqual(run.fixtureActions.map(value => Object.fromEntries(Object.entries(value).filter(([key]) => !['matched', 'changed', 'state'].includes(key)))), expectedFixtureTrace(run), 'Every precise fixture command must be recorded in its declared order');
    for (const value of run.fixtureActions) {
        assert(Number.isSafeInteger(value.matched) && value.matched >= 0 && Number.isSafeInteger(value.changed) && value.changed >= 0, 'Actual finite fixture receipt counts required');
        const state = ({ prepare: 'prepared', cleanup: 'cleaned', 'user-plan': 'planned', 'user-adopt': 'adopted' })[value.action] ?? value.action;
        assert.equal(value.state, state, 'Actual precise fixture receipt state');
    }
}
function sameRows(before, after, table, except = new Set()) {
    const a = new Map(before[table].filter(value => !except.has(value.id)).map(value => [value.id, value])), b = new Map(after[table].filter(value => !except.has(value.id)).map(value => [value.id, value]));
    assert.equal(a.size, b.size, 'Undeclared between-request row addition/deletion: ' + table);
    for (const [id, value] of a) assert.deepEqual(b.get(id), value, 'Undeclared between-request row mutation: ' + table);
}
function assertFixtureSession(row, previous) {
    const current = row.beforeState.facts.auth_session.find(value => value.id === row.beforeState.snapshot.session.id);
    const delay = row.due ? 61000000n : 0n, anchor = epochMicros(current.last_seen_at) + delay;
    assert(anchor >= epochMicros(row.startedAt) - 5000n && anchor <= epochMicros(row.finishedAt) + 5000n, row.id + ': exact fixture last_seen clock window');
    inRequest(current.updated_at, row);
    assert(epochMicros(current.updated_at) >= anchor, row.id + ': fixture clock_timestamp order');
    if (previous) {
        const old = previous.auth_session.find(value => value.id === current.id); assert(old, row.id + ': known selected session');
        const expected = { ...old, last_seen_at: current.last_seen_at, updated_at: current.updated_at, row_version: old.row_version + 1 };
        assert.deepEqual(current, expected, row.id + ': only exact fixture session fields/version may change');
    }
    return current.id;
}
export function validateFactContinuity(previous, row, run, actions = [], sessionFixture = false) {
    const before = row.beforeState.facts, userId = run.identities.users.u000, userChanges = actions.filter(value => value.action.startsWith('user-profile-'));
    const known = new Set(['user-profile-values', 'user-profile-verified', 'user-role-matrix', 'user-membership-matrix', 'permissions-none', 'permissions-default', 'permissions-lead-write', 'permissions-lead-assign', 'permissions-project-write', 'permissions-users-manage', 'permissions-orgs-manage']);
    assert(actions.every(value => known.has(value.action)), row.id + ': no unadmitted fixture continuity exception');
    if (sessionFixture) {
        const sessionId = assertFixtureSession(row, previous);
        sameRows(previous, before, 'auth_session', new Set([sessionId]));
    } else sameRows(previous, before, 'auth_session');
    if (userChanges.length) {
        assert(userChanges.every(value => value.userSlot === 'u000'), row.id + ': exact fixture target slot');
        const old = previous.platform_user.find(value => value.id === userId), current = before.platform_user.find(value => value.id === userId); assert(old && current, row.id + ': known fixture user');
        const expected = { ...old, row_version: old.row_version + userChanges.length, updated_at: current.updated_at };
        for (const action of userChanges) {
            if (action.action === 'user-profile-values') {
                Object.assign(expected, { email: 'witness@example.test', phone: '12345', avatar_url: 'https://example.test/avatar.png', primary_org_unit_id: run.identities.orgs.alpha, last_login_at: current.last_login_at });
                assert.equal(epochMicros(current.last_login_at), epochMicros('2020-02-03T04:05:06.123Z'), row.id + ': fixed fixture last-login value');
            } else Object.assign(expected, { email_verified: true, phone_verified: true });
        }
        inRequest(current.updated_at, row); assert.deepEqual(current, expected, row.id + ': exact fixture user fields/version');
        sameRows(previous, before, 'platform_user', new Set([userId]));
    } else sameRows(previous, before, 'platform_user');
    const permissions = actions.filter(value => value.action.startsWith('permissions-'));
    for (const [table, actionName, foreignKey] of [['user_role_assignment', 'user-role-matrix', 'user_id'], ['user_org_membership', 'user-membership-matrix', 'user_id'], ['role_permission_assignment', null, 'role_id']]) {
        const enabled = actionName ? actions.some(value => value.action === actionName) : permissions.length > 0;
        if (!enabled) { sameRows(previous, before, table); continue; }
        if (actionName) assert(actions.filter(value => value.action === actionName).every(value => value.userSlot === 'u000'), row.id + ': exact matrix fixture slot');
        else assert.equal(permissions.length, 1, row.id + ': one exact permission fixture action');
        const target = actionName ? userId : run.identities.roles.viewer;
        if (!actionName) assert.equal(permissions[0].account, 'viewer', row.id + ': exact permission fixture actor');
        const old = previous[table].filter(value => value[foreignKey] === target), current = before[table].filter(value => value[foreignKey] === target);
        const replacedIds = new Set([...old, ...current].map(value => value.id)); sameRows(previous, before, table, replacedIds);
        const oldIds = new Set(old.map(value => value.id)), newIds = new Set(current.map(value => value.id));
        assert(before[table].every(value => !oldIds.has(value.id)), row.id + ': exact fixture deletes old relation identities');
        assert(previous[table].every(value => !newIds.has(value.id)), row.id + ': exact fixture creates new relation identities');
        const expectedKeys = actionName ? ['admin', 'viewer', 'alpha', 'inactive'] : ({ 'permissions-none': [], 'permissions-default': ['nav:dashboard:view'], 'permissions-lead-write': ['lead:write'], 'permissions-lead-assign': ['lead:assign'], 'permissions-project-write': ['project:write'], 'permissions-users-manage': ['platform:users:manage'], 'permissions-orgs-manage': ['platform:org-units:manage'] })[permissions[0].action];
        assert.equal(current.length, expectedKeys.length, row.id + ': exact fixture relation count');
        for (const [index, slot] of expectedKeys.entries()) {
            const value = current.find(value => table === 'user_role_assignment' ? value.role_id === run.identities.roles[slot] : table === 'user_org_membership' ? value.org_unit_id === run.identities.orgs[slot] : value.permission_key === slot);
            assert(value, row.id + ': exact fixture relation identity/key');
            assert.equal(value.status, actionName && index === 0 ? 'revoked' : 'active', row.id + ': exact fixture relation status');
            if (table === 'user_org_membership') {
                assert.equal(value.membership_type, ['secondary', 'primary', 'unexpected', 'secondary'][index], row.id + ': exact fixture membership type');
                assert.equal(epochMicros(value.revoked_at), epochMicros('2020-01-01T00:00:00Z'), row.id + ': exact historical revoked time');
            } else assert.equal(value.revoked_at, null, row.id + ': exact fixture revoked time');
            for (const key of ['created_at', 'assigned_at']) inRequest(value[key], row);
            assert.equal(epochMicros(value.created_at), epochMicros(value.assigned_at), row.id + ': same fixture transaction defaults');
            for (const key of ['created_by', 'assigned_by', 'revoked_by', 'change_reason']) assert.equal(value[key], null, row.id + ': exact fixture relation metadata');
        }
    }
    for (const table of ['local_credential', 'role', 'org_unit', 'audit_log', 'security_event']) sameRows(previous, before, table);
}
export function validateRunContinuity(run) {
    const entries = declaredEntries(run), traced = run.observations.length === entries.length;
    if (traced) validateFixtureTrace(run);
    let previous;
    for (const [index, row] of run.observations.entries()) {
        if (previous) validateFactContinuity(previous, row, run, traced ? entries[index].before ?? [] : [], traced);
        else if (traced) assertFixtureSession(row);
        previous = row.afterState.facts;
    }
}

export function makeNormalizer(run) {
    assert(uuid.test(run.runId), 'Canonical run identity required');
    const registry = new Map(), labels = new Map(), fingerprints = new Map();
    const cleanRun = value => value.replaceAll(run.runId, '<run>').replaceAll(run.runId.replaceAll('-', ''), '<run-compact>').replaceAll(run.runId.slice(0, 8), '<run-short>');
    const register = (id, label) => {
        assert(uuid.test(id), 'Only canonical observed IDs may enter registry');
        if (registry.has(id)) assert.equal(registry.get(id), label, 'One observed ID has one logical label');
        else { assert(!labels.has(label), 'Distinct observed IDs cannot share a logical label'); registry.set(id, label); labels.set(label, id); }
    };
    register(run.identities.admin, 'actor:admin'); register(run.identities.viewer, 'actor:viewer');
    register(run.identities.missingUser, 'missing-user-role-org');
    for (const [kind, prefix] of [['users', 'user'], ['roles', 'role'], ['orgs', 'org']]) for (const [slot, id] of Object.entries(run.identities[kind])) register(id, prefix + ':' + slot);
    for (const row of run.observations) for (const observed of [row.responseFacts, row.headReferenceFacts].filter(Boolean)) {
        for (const [collection, field, prefix] of [['users', 'username', 'baseline-user'], ['organizations', 'code', 'baseline-org'], ['roles', 'role_key', 'baseline-role']]) for (const value of observed[collection]) if (!registry.has(value.id)) register(value.id, prefix + ':' + cleanRun(value[field]));
    }
    const label = id => { assert(registry.has(id), 'Unregistered identity reference'); return registry.get(id); };
    const counters = new Map(), immutableRows = new Map(), createdTimes = new Map(), absoluteDeadlines = new Map();
    const pinObservedRow = (table, value, owned = true, observedAt) => {
        const rowKey = table + ':' + value.id;
        if (!owned) {
            const ceiling = epochMicros(observedAt) + 5000n;
            for (const [key, child] of Object.entries(value)) if (timeKeys.has(key) && child !== null && !['idle_expires_at', 'absolute_expires_at', 'expires_at'].includes(key)) assert(epochMicros(child) <= ceiling, 'Non-owned past event time is later than its actual observer completion');
            if (value.created_at !== null && value.created_at !== undefined && value.updated_at !== null && value.updated_at !== undefined) assert(epochMicros(value.updated_at) >= epochMicros(value.created_at), 'Non-owned updated_at precedes created_at');
        }
        if (Object.hasOwn(value, 'created_at')) {
            const created = value.created_at === null ? null : epochMicros(value.created_at);
            if (createdTimes.has(rowKey)) assert.equal(createdTimes.get(rowKey), created, 'Existing observed creation time changed between observations');
            else createdTimes.set(rowKey, created);
        }
        if (!owned || ['local_credential', 'audit_log', 'security_event'].includes(table)) {
            if (immutableRows.has(rowKey)) assert.deepEqual(value, immutableRows.get(rowKey), 'Existing credential/history/non-owned row mutated between observations');
            else immutableRows.set(rowKey, value);
        }
        if (table === 'auth_session') {
            const absolute = epochMicros(value.absolute_expires_at);
            if (absoluteDeadlines.has(value.id)) assert.equal(absoluteDeadlines.get(value.id), absolute, 'Session absolute deadline changed between observations');
            else absoluteDeadlines.set(value.id, absolute);
        }
    };
    const relate = (id, base) => {
        if (registry.has(id)) return;
        const n = counters.get(base) ?? 0; counters.set(base, n + 1); register(id, base + ':' + n);
    };
    for (const observation of run.observations) for (const state of [observation.beforeState, observation.afterState]) {
        if (!state) continue;
        for (const table of factTables) {
            const rows = [...state.facts[table]].sort((a, b) => {
                const aTime = a.occurred_at ?? a.created_at, bTime = b.occurred_at ?? b.created_at;
                return aTime && bTime && epochMicros(aTime) !== epochMicros(bTime) ? epochMicros(aTime) < epochMicros(bTime) ? -1 : 1 : 0;
            });
            for (const value of rows) {
                pinObservedRow(table, value);
                if (['platform_user', 'role', 'org_unit'].includes(table)) { assert(registry.has(value.id), 'Owned base entity absent from identity registry'); continue; }
                if (table === 'auth_session') { if (!registry.has(value.id)) register(value.id, 'session:' + label(value.user_id)); }
                else if (table === 'local_credential') { if (!registry.has(value.id)) register(value.id, 'credential:' + label(value.user_id)); }
                else if (table === 'user_role_assignment') relate(value.id, 'user-role:' + label(value.user_id) + ':' + label(value.role_id));
                else if (table === 'user_org_membership') relate(value.id, 'user-org:' + label(value.user_id) + ':' + label(value.org_unit_id) + ':' + value.membership_type);
                else if (table === 'role_permission_assignment') relate(value.id, 'role-permission:' + label(value.role_id) + ':' + value.permission_key);
                else { const actor = value[table === 'audit_log' ? 'operator_id' : 'actor_id']; relate(value.id, table + ':' + observation.id + ':' + value.event_type + ':' + (actor === null ? 'none' : label(actor))); }
                for (const key of ['passwordFingerprint', 'tokenFingerprint', 'csrfFingerprint']) if (Object.hasOwn(value, key)) {
                    assert(/^[0-9a-f]{64}$/.test(value[key]), 'Redacted fingerprint required');
                    const name = label(value.id) + ':' + key;
                    if (fingerprints.has(name)) assert.equal(fingerprints.get(name), value[key], 'Credential/session secret fingerprint changed inside one run');
                    else fingerprints.set(name, value[key]);
                }
            }
        }
    }
    const ownedByTable = { platform_user: new Set([run.identities.admin, run.identities.viewer, ...Object.values(run.identities.users)]), role: new Set(Object.values(run.identities.roles)), org_unit: new Set(Object.values(run.identities.orgs)) };
    for (const row of run.observations) for (const response of [row.responseFacts, row.headReferenceFacts].filter(Boolean)) for (const [collection, table] of [['users', 'platform_user'], ['organizations', 'org_unit'], ['roles', 'role']]) for (const value of response[collection]) pinObservedRow(table, value, ownedByTable[table].has(value.id), response.finishedAt);
    const aliases = new Map();
    for (const [id, name] of registry) {
        aliases.set(id, '<' + name + '>'); aliases.set(id.replaceAll('-', ''), '<' + name + ':compact>'); aliases.set('{' + id + '}', '<' + name + ':braces>');
        aliases.set(id.replace(/^./, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase()), '<' + name + ':percent-first>');
        if (id.toUpperCase() !== id) aliases.set(id.toUpperCase(), '<' + name + ':uppercase>');
    }
    const string = value => {
        uuidShape.lastIndex = 0;
        const result = value.replace(uuidShape, spelling => {
            if (spelling === run.runId) return '<run>';
            if (spelling === run.runId.replaceAll('-', '')) return '<run-compact>';
            assert(aliases.has(spelling), 'Unknown UUID spelling outside frozen DTO literal');
            return aliases.get(spelling);
        });
        return cleanRun(result);
    };
    const normalize = (value, key = '', parent) => {
        if (value === null) return null;
        if (timeKeys.has(key)) { const time = epochMicros(value); return time < fixedTimeCeiling ? '<fixed-time:' + time + '>' : '<valid-dynamic-time>'; }
        if (['passwordFingerprint', 'tokenFingerprint', 'csrfFingerprint'].includes(key)) return '<stable-secret-fingerprint:' + label(parent.id) + ':' + key + '>';
        if (Array.isArray(value)) return value.map(entry => normalize(entry));
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, normalize(child, name, value)]));
        return typeof value === 'string' ? string(value) : value;
    };
    const facts = value => Object.fromEntries(factTables.map(table => [table, normalize(value[table]).sort((a, b) => a.id.localeCompare(b.id))]));
    const temporal = value => Object.fromEntries(Object.entries(value).map(([key, fields]) => {
        const index = key.indexOf(':'); return [key.slice(0, index) + ':<' + label(key.slice(index + 1)) + '>', fields];
    }).sort(([a], [b]) => a.localeCompare(b)));
    return { normalize, facts, temporal, string };
}

function normalizedWire(wire, method, normalize) {
    assert(wire && typeof wire === 'object', 'Actual wire response required');
    assert.deepEqual(Object.keys(wire).sort(), ['status', 'body', 'contentType', 'bodyByteLength', 'headers', 'setCookieCount'].sort(), 'Only sanitized actual wire response fields');
    assert(!Object.hasOwn(wire.headers, 'set-cookie'), 'Set-Cookie values never enter evidence');
    assert(Number.isSafeInteger(wire.bodyByteLength) && wire.bodyByteLength >= 0, 'Actual body byte length required');
    assert(Number.isSafeInteger(wire.setCookieCount) && wire.setCookieCount >= 0, 'Actual Set-Cookie count required');
    const headers = { ...wire.headers };
    if (method === 'HEAD') assert.equal(wire.bodyByteLength, 0, 'HEAD body must be empty');
    else if (headers['content-length'] !== undefined) assert.equal(Number(headers['content-length']), wire.bodyByteLength, 'Content-Length matches actual received bytes');
    delete headers['content-length'];
    return { status: wire.status, body: normalize(wire.body), contentType: wire.contentType, headers, setCookieCount: wire.setCookieCount,
        lengthSemantics: method === 'HEAD' ? 'empty-HEAD-matches-own-GET' : wire.headers['content-length'] === undefined ? 'length-not-declared' : 'matches-actual-received-bytes' };
}
export function normalizeUserCreatedOrder(body, operation, status, method, observed, normalize) {
    if (!['list', 'owner-reference'].includes(operation) || status !== 200 || method !== 'GET') return null;
    const users = responseUsers(body, operation, status, method);
    assert.equal(observed?.readOnly, true, 'User ordering needs the actual read-only PG observer');
    idsEqual(observed.requestedUserIds, users.map(user => user.id), 'User order retains every original wire identity');
    idsEqual(observed.users.map(user => user.id), users.map(user => user.id), 'User order keeps the complete PG observer in original wire order');
    assert(users.every(user => uuid.test(user.id)), 'Canonical user identities required for order evidence');
    const times = observed.users.map(user => epochMicros(user.created_at));
    assert(times.every((value, index) => index === 0 || times[index - 1] >= value), 'Original user response must keep PG created_at DESC before tie comparison');
    const keys = users.map(user => normalize(user.id));
    assert(keys.every(key => typeof key === 'string') && new Set(keys).size === keys.length, 'User order needs distinct registered logical identities');
    const indices = [], groups = [];
    for (let start = 0; start < users.length;) {
        let end = start + 1;
        while (end < users.length && times[end] === times[start]) end++;
        const group = Array.from({ length: end - start }, (_, offset) => start + offset);
        group.sort((a, b) => keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : 0);
        indices.push(...group); groups.push(group.map(index => keys[index])); start = end;
    }
    // The public response and observed PG rows stay untouched. Only a comparison
    // copy may permute a contiguous block with exactly equal PG microseconds.
    // Retain the partition so a one-microsecond split cannot become equivalent.
    const ordered = indices.map(index => users[index]);
    return {
        body: normalize(operation === 'list' ? ordered : { ...body, users: ordered }),
        users: normalize(indices.map(index => observed.users[index])),
        ordering: { key: 'created_at DESC with exact PG-microsecond ties', groups }
    };
}
export function normalizeRun(run) {
    const normalizer = makeNormalizer(run), { normalize, facts, temporal } = normalizer;
    validateRunContinuity(run);
    const frozen = new Map(dtoCases(frozenGolden(), run.identities.users.u000).map(value => [value.id, value]));
    const observations = run.observations.map(row => {
        assert.equal(row.result, 'observed', row.id + ': complete actual observation');
        assert.deepEqual(row.captureErrors, [], row.id + ': no suppressed capture errors');
        assert(epochMicros(row.finishedAt) >= epochMicros(row.startedAt), row.id + ': actual request time order');
        const transition = validateTransition(row);
        assert.equal(row.beforeState.facts.auth_session.find(value => value.id === row.beforeState.snapshot.session.id).user_id, run.identities[row.monitorAccount], row.id + ': monitored actor');
        validateResponseFacts(run, row.response, row.operation, row.status, row.method, row.responseFacts, row);
        const ownedAfter = new Map(row.afterState.facts.platform_user.map(value => [value.id, value]));
        for (const value of row.responseFacts.users) if (ownedAfter.has(value.id)) assert.deepEqual(value, ownedAfter.get(value.id), row.id + ': wire observer equals watched committed user');
        assert.equal(row.wire.status, row.status, row.id + ': wire status evidence');
        assert.deepEqual(row.wire.body, row.response, row.id + ': wire body evidence');
        if (Object.hasOwn(row, 'expectedStatus')) assert.equal(row.status, row.expectedStatus, row.id + ': declared status');
        const bytes = Object.hasOwn(row.request, 'json') ? Buffer.from(JSON.stringify(row.request.json)) : Object.hasOwn(row.request, 'body') ? Buffer.from(row.request.body) : undefined;
        assert.deepEqual(row.sent, { method: row.method, rawPath: row.route, bodySha256: bytes ? digest(bytes) : null, bodyByteLength: bytes?.length ?? 0 }, row.id + ': exact raw sent descriptor');
        const userOrder = normalizeUserCreatedOrder(row.response, row.operation, row.status, row.method, row.responseFacts, normalize);
        let request, response, wire, headReference;
        if (row.group === 'dto-rejected-wire') {
            const expected = frozen.get(row.id); assert(expected, row.id + ': frozen rejected DTO case');
            assert.deepEqual(row.request, expected.options ?? {}, row.id + ': original raw rejected DTO input');
            const http = rejectedDtoHttpExpectation(expected);
            assert.equal(row.httpEntry, http.entry, row.id + ': exact parser/DTO entry');
            assert.equal(row.status, http.status, row.id + ': original rejected wire status');
            assert.deepEqual(row.response, http.response, row.id + ': complete original same-case ' + http.entry + ' error payload');
            request = structuredClone(row.request); response = structuredClone(row.response);
            wire = normalizedWire(row.wire, row.method, value => structuredClone(value));
        } else { request = normalize(row.request); response = normalize(row.response); wire = normalizedWire(row.wire, row.method, normalize); }
        if (userOrder) { response = userOrder.body; wire.body = userOrder.body; }
        if (row.method === 'HEAD') {
            const lengthPolicy = validateHeadReference(row);
            wire.lengthSemantics = lengthPolicy === 'finalhandler-not-found' ? 'empty-HEAD-matches-finalhandler-method-body' : 'empty-HEAD-matches-own-GET';
            validateResponseFacts(run, row.headReference.body, row.operation, row.headReference.status, 'GET', row.headReferenceFacts, row);
            const referenceOrder = normalizeUserCreatedOrder(row.headReference.body, row.operation, row.headReference.status, 'GET', row.headReferenceFacts, normalize);
            headReference = { lengthPolicy, wire: normalizedWire(row.headReference, 'GET', normalize), responseFacts: referenceOrder?.users ?? normalize(row.headReferenceFacts.users), orgFacts: normalize(row.headReferenceFacts.organizations), roleFacts: normalize(row.headReferenceFacts.roles) };
            if (referenceOrder) { headReference.wire.body = referenceOrder.body; headReference.userOrdering = referenceOrder.ordering; }
        }
        return { id: row.id, group: row.group, operation: row.operation, method: row.method, account: row.account, monitorAccount: row.monitorAccount, due: row.due,
            route: normalize(row.route), request, status: row.status, ...(row.group === 'dto-rejected-wire' ? { httpEntry: row.httpEntry } : {}), response, wire, sent: { method: row.sent.method, rawPath: normalize(row.sent.rawPath), bodyByteLength: row.sent.bodyByteLength },
            before: { snapshot: normalize(row.beforeState.snapshot), facts: facts(row.beforeState.facts) }, after: { snapshot: normalize(row.afterState.snapshot), facts: facts(row.afterState.facts) },
            responseFacts: { users: userOrder?.users ?? normalize(row.responseFacts.users), organizations: normalize(row.responseFacts.organizations), roles: normalize(row.responseFacts.roles) },
            temporal: temporal(transition.temporal), sessionVersionDelta: transition.sessionVersionDelta, auditDelta: transition.auditDelta, securityDelta: transition.securityDelta,
            ...(userOrder ? { userOrdering: userOrder.ordering } : {}),
            ...(headReference ? { headReference } : {}) };
    });
    return { observations, fixtureActions: run.fixtureActions.map(action => normalize(action)) };
}
