import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import { compareReports, firstDifference, validateDeclaredRequests, validateOwnerCloseout, validateReportAdmission, parseCompareOptions } from './http-compat-compare.mjs';
import { epochMicros, factTables, normalizeRun, normalizeUserCreatedOrder, validateNewRowTimes, expectedFixtureTrace, validateFixtureTrace, validateFactContinuity } from './http-compat-normalize.mjs';
import { completeHttpCasePlan, dtoCases, frozenGolden, httpCoverageManifest, sequentialCases, rejectedDtoHttpExpectation } from './http-compat-cases.mjs';

const sourceHead = 'a22cba7360346242cb7709740b7eb954b92d1fd4';
const digest = value => createHash('sha256').update(value).digest('hex');
const iso = offset => new Date(Date.UTC(2026, 9, 28, 0, 0, 0) + offset).toISOString();
function focusedFixture(backend = 'nest', offset = 0) {
    const identities = { admin: randomUUID(), viewer: randomUUID(), missingUser: randomUUID(), users: { u000: randomUUID() }, roles: Object.fromEntries(['admin', 'viewer', 'alpha', 'inactive'].map(slot => [slot, randomUUID()])), orgs: Object.fromEntries(['admin', 'viewer', 'alpha', 'inactive'].map(slot => [slot, randomUUID()])) };
    const runId = randomUUID(), facts = Object.fromEntries(factTables.map(table => [table, []]));
    const user = (id, username, displayName) => ({ id, username, display_name: displayName, email: null, phone: null, avatar_url: null, is_active: true, primary_org_unit_id: null, email_verified: false, phone_verified: false, last_login_at: null, created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z', created_by: null, updated_by: null, row_version: 1 });
    facts.platform_user = [user(identities.admin, 'r2d_admin_' + runId.replaceAll('-', ''), 'R2D admin ' + runId.slice(0, 8)), user(identities.viewer, 'r2d_viewer_' + runId.replaceAll('-', ''), 'R2D viewer ' + runId.slice(0, 8)), user(identities.users.u000, 'r2d_u000_' + runId.replaceAll('-', ''), 'R2D u000 ' + runId.slice(0, 8))];
    for (const account of ['admin', 'viewer']) {
        facts.local_credential.push({ id: randomUUID(), user_id: identities[account], created_at: iso(offset - 2000), updated_at: iso(offset - 2000), passwordFingerprint: digest(randomUUID()) });
        facts.auth_session.push({ id: randomUUID(), user_id: identities[account], status: 'active', row_version: 2, created_at: iso(offset - 1000), updated_at: iso(offset), last_seen_at: iso(offset), idle_expires_at: iso(offset + 900000), absolute_expires_at: iso(offset + 28800000), revoked_at: null, revoked_reason: null, tokenFingerprint: digest(randomUUID()), csrfFingerprint: digest(randomUUID()) });
    }
    for (const [slot, id] of Object.entries(identities.roles)) facts.role.push({ id, role_key: 'r2d_roles_' + slot + '_' + runId, name: 'R2D role ' + slot + ' ' + runId.slice(0, 8), is_active: slot !== 'inactive', created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z', row_version: 1 });
    for (const [slot, id] of Object.entries(identities.orgs)) facts.org_unit.push({ id, code: 'r2d_orgs_' + slot + '_' + runId, name: 'R2D org ' + slot + ' ' + runId.slice(0, 8), description: null, is_active: slot !== 'inactive', parent_id: null, created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z', row_version: 1 });
    for (const account of ['admin', 'viewer']) facts.user_role_assignment.push({ id: randomUUID(), user_id: identities[account], role_id: identities.roles[account], status: 'active', created_at: iso(offset - 2000), assigned_at: iso(offset - 2000), revoked_at: null });
    const target = facts.platform_user[2];
    const response = { id: target.id, username: target.username, displayName: target.display_name, email: null, phone: null, avatarUrl: null, isActive: true, primaryOrgUnitId: null, primaryOrgUnitName: null, roleNames: ['first', 'second'], createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', lastLoginAt: null, emailVerified: false, phoneVerified: false, orgUnits: [] };
    const session = facts.auth_session[0];
    const state = { facts, snapshot: { session: { id: session.id, rowVersion: session.row_version, status: session.status, lastSeenAt: session.last_seen_at, idleExpiresAt: session.idle_expires_at, absoluteExpiresAt: session.absolute_expires_at, updatedAt: session.updated_at, revokedAt: null, revokedReason: null }, audits: [], securityEvents: [] } };
    const row = { id: 'focus:detail', group: 'business', operation: 'detail', method: 'GET', account: 'admin', monitorAccount: 'admin', due: false, route: '/api/platform/users/' + target.id, request: {}, result: 'observed', status: 200, captureErrors: [],
        startedAt: iso(offset), finishedAt: iso(offset + 100), beforeState: state, afterState: structuredClone(state), response,
        responseFacts: { database: 'poms_r2d_' + backend, readOnly: true, requestedUserIds: [target.id], requestedOrgIds: [], requestedRoleIds: [], users: [structuredClone(target)], organizations: [], roles: [], startedAt: iso(offset + 10), finishedAt: iso(offset + 20) } };
    const run = { runId, backend, identities, fixtureActions: [], observations: [row] }; refreshWire(row); return run;
}
function refreshWire(row) {
    const bytes = Object.hasOwn(row.request, 'json') ? Buffer.from(JSON.stringify(row.request.json)) : Object.hasOwn(row.request, 'body') ? Buffer.from(row.request.body) : undefined;
    row.sent = { method: row.method, rawPath: row.route, bodySha256: bytes ? digest(bytes) : null, bodyByteLength: bytes?.length ?? 0 };
    const bodyByteLength = row.method === 'HEAD' ? 0 : Buffer.byteLength(JSON.stringify(row.response));
    row.wire = { status: row.status, body: structuredClone(row.response), contentType: 'application/json; charset=utf-8', bodyByteLength, headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': String(bodyByteLength) }, setCookieCount: 0 };
}
function owner(run) {
    run.serverReceipt = { sha256: 'a'.repeat(64), value: { backend: run.backend, sourceHead, origin: 'http://127.0.0.1:5500', pid: 123, aliveBefore: true, binarySha256: 'b'.repeat(64), processIdentity: { pid: 123, startTicks: '42' }, sourceFiles: [{ file: 'apps/poms-api/src/main.ts', sha256: 'c'.repeat(64) }] } };
    return { result: 'pass', sourceUnchanged: true, aliveAfter: true, stopped: true, serverReceiptSha256: run.serverReceipt.sha256, ...Object.fromEntries(['backend', 'origin', 'pid', 'binarySha256', 'sourceHead'].map(key => [key, run.serverReceipt.value[key]])), processIdentityAfter: { ...run.serverReceipt.value.processIdentity }, binarySha256After: run.serverReceipt.value.binarySha256, sourceFilesAfter: structuredClone(run.serverReceipt.value.sourceFiles) };
}
test('parser-root entry and complete parser payload cannot be relabeled as a DTO oracle result',()=>{
    for(const name of ['null','string','number','array']){
        const run=focusedFixture(),row=run.observations[0],entry=dtoCases(frozenGolden(),run.identities.users.u000).find(value=>value.schema==='CreatePlatformUserRequest'&&value.id.endsWith(':'+name));
        const expected=rejectedDtoHttpExpectation(entry);
        Object.assign(row,{id:entry.id,group:entry.group,operation:entry.operation,method:entry.method,route:entry.route,request:entry.options??{},httpEntry:entry.httpEntry,status:expected.status,response:expected.response});
        Object.assign(row.responseFacts,{requestedUserIds:[],requestedOrgIds:[],requestedRoleIds:[],users:[],organizations:[],roles:[]});refreshWire(row);
        assert.doesNotThrow(()=>normalizeRun(run));
        const wrongEntry=structuredClone(run);wrongEntry.observations[0].httpEntry=entry.httpEntry==='zod-dto'?'json-parser-strict-root':'zod-dto';
        assert.throws(()=>normalizeRun(wrongEntry),/exact parser\/DTO entry/);
        const wrongBody=structuredClone(run);wrongBody.observations[0].response={statusCode:400,message:'Validation failed',errors:entry.oracle.errors};refreshWire(wrongBody.observations[0]);
        if(name!=='array')assert.throws(()=>normalizeRun(wrongBody),/complete original same-case/);
        const altered=structuredClone(run);altered.observations[0].response.message+=' altered';refreshWire(altered.observations[0]);
        assert.throws(()=>normalizeRun(altered),/complete original same-case/);
    }
});
function declaredShell(backend = 'nest') {
    const run = focusedFixture(backend), username = 'r2d_u000_' + run.runId.replaceAll('-', ''), displayName = 'R2D u000 ' + run.runId.slice(0, 8);
    const binding = { userId: run.identities.users.u000, roleId: run.identities.roles.alpha, orgId: run.identities.orgs.alpha, viewerOrgId: run.identities.orgs.viewer, inactiveRoleId: run.identities.roles.inactive, inactiveOrgId: run.identities.orgs.inactive, username, displayName, missingUserId: run.identities.missingUser };
    const expected = [{ id: 'create:target', group: 'business', operation: 'create', method: 'POST', route: '/api/platform/users', json: { username, displayName, primaryOrgUnitId: null, initialRoleIds: [] }, expectedStatus: 201 }, ...sequentialCases(binding)];
    run.observations = expected.map(entry => ({ id: entry.id, group: entry.group, operation: entry.operation, method: entry.method, route: entry.route, request: { ...entry.options, ...(entry.json === undefined ? {} : { json: entry.json }) }, account: entry.account ?? 'admin', monitorAccount: entry.account === 'none' ? 'admin' : entry.account ?? 'admin', due: entry.due ?? false, ...(entry.expectedStatus === undefined ? {} : { expectedStatus: entry.expectedStatus }), result: 'observed' }));
    Object.assign(run, { formatVersion: 1, kind: 'r2d-sequential-http-observation', sourceHead, platform: 'win32', runtime: { node: process.version, icu: process.versions.icu }, result: 'observed', coverageComplete: true, sourcesUnchanged: true, coverage: httpCoverageManifest(), cleanupCompleted: true, cleanup: { state: 'cleaned' }, zeroResidual: { state: 'cleaned', matched: 0, changed: 0 }, sourcesBefore: [{ file: 'tools/rust-r2d/http-compat.mjs', normalizedLfSha256: 'd'.repeat(64) }] });
    run.fixture = { formatVersion: 1, runId: run.runId, backend, state: 'prepared', users: [],
        roles: Object.entries(run.identities.roles).map(([slot, id]) => ({ slot, id, key: 'r2d_roles_' + slot + '_' + run.runId })),
        orgs: Object.entries(run.identities.orgs).map(([slot, id]) => ({ slot, id, key: 'r2d_orgs_' + slot + '_' + run.runId })),
        accounts: ['admin', 'viewer'].map(account => ({ account, userId: run.identities[account], username: 'r2d_' + account + '_' + run.runId.replaceAll('-', ''), roleId: run.identities.roles[account], orgId: run.identities.orgs[account] })) };
    Object.assign(run.observations[0], { status: 201, response: { id: run.identities.users.u000, username }, adoption: { matched: 1, changed: 1, state: 'adopted', user: { slot: 'u000', username, userId: run.identities.users.u000 } } });
    run.fixtureActions = expectedFixtureTrace(run).map(value => ({ ...value, matched: 1, changed: 0, state: ({ prepare: 'prepared', cleanup: 'cleaned', 'user-plan': 'planned', 'user-adopt': 'adopted' })[value.action] ?? value.action }));
    run.sourcesAfter = structuredClone(run.sourcesBefore); return run;
}

test('focused independent runs align only registered identities and retain every array order without mutating reports', () => {
    const left = focusedFixture(), right = focusedFixture('rust', 500000), originals = structuredClone([left, right]);
    assert.deepEqual(normalizeRun(left), normalizeRun(right));
    assert.deepEqual([left, right], originals);
    right.observations[0].response.roleNames.reverse(); refreshWire(right.observations[0]);
    assert.notDeepEqual(normalizeRun(left), normalizeRun(right), 'Role name order is received behavior');
    const unknown = focusedFixture(); unknown.observations[0].request = { json: { unknownIdentity: randomUUID().toUpperCase() } }; refreshWire(unknown.observations[0]);
    assert.throws(() => normalizeRun(unknown), /Unknown UUID/);
});

test('user-list tie copies require exact PG microseconds, complete rows and matching cross-run partitions', () => {
    const ids = ['10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001'];
    const users = ids.map((id, index) => ({ id, displayName: 'User ' + index, roleNames: ['first', 'second'], createdAt: '2026-10-28T00:00:00.000Z' }));
    const pg = ['.000124Z', '.000123Z', '.000123Z', '.000122Z'].map((suffix, index) => ({ id: ids[index], created_at: '2026-10-28T00:00:00' + suffix }));
    const observer = { readOnly: true, requestedUserIds: [...ids], users: pg };
    const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'created_at' ? '<validated-dynamic-time>' : normalize(child)])) : value;
    const copy = (body, observed = observer) => normalizeUserCreatedOrder(body, 'list', 200, 'GET', observed, normalize);
    const original = structuredClone([users, observer]), baseline = copy(users);
    const permutation = [0, 2, 1, 3], reversed = permutation.map(index => users[index]);
    const permutedObserver = { ...observer, requestedUserIds: reversed.map(user => user.id), users: permutation.map(index => pg[index]) };
    assert.deepEqual(copy(reversed, permutedObserver), baseline);
    assert.deepEqual([users, observer], original, 'Public rows and exact PG facts remain in their received order');
    assert.deepEqual(baseline.ordering.groups, [[ids[0]], [ids[1], ids[2]], [ids[3]]]);
    const split = structuredClone(observer); split.users[1].created_at = '2026-10-28T00:00:00.000124Z';
    const changedPartition = copy(users, split);
    assert.deepEqual(changedPartition.body, baseline.body); assert.deepEqual(changedPartition.users, baseline.users);
    assert.notDeepEqual(changedPartition.ordering, baseline.ordering, 'Changing only a raw PG microsecond cannot erase the tie partition');
    const badOrder = [0, 3, 1, 2], badUsers = badOrder.map(index => users[index]);
    assert.throws(() => copy(badUsers, { ...observer, requestedUserIds: badUsers.map(user => user.id), users: badOrder.map(index => pg[index]) }), /created_at DESC/);
    for (const mutate of [value => { value.users.reverse(); }, value => { value.users.pop(); }, value => { value.users[1].created_at = undefined; }, value => { value.readOnly = false; }]) {
        const changed = structuredClone(observer); mutate(changed); assert.throws(() => copy(users, changed));
    }
    const removed = users.slice(0, -1); assert.notDeepEqual(copy(removed, { ...observer, requestedUserIds: removed.map(user => user.id), users: pg.slice(0, -1) }), baseline);
    const altered = structuredClone(users); altered[1].displayName = 'Changed'; assert.notDeepEqual(copy(altered), baseline);
    const roleOrder = structuredClone(users); roleOrder[1].roleNames.reverse(); assert.notDeepEqual(copy(roleOrder), baseline);
    assert.equal(normalizeUserCreatedOrder(users, 'detail', 200, 'GET', observer, normalize), null);
});

test('list and owner-reference GET and actual HEAD references preserve complete tie blocks without reordering other arrays', () => {
    function userListRun(backend, operation, method) {
        const run = focusedFixture(backend, backend === 'rust' ? 500000 : 0), row = run.observations[0], template = { ...row.response };
        for (const key of ['orgUnits', 'avatarUrl', 'lastLoginAt', 'emailVerified', 'phoneVerified']) delete template[key];
        const pgUsers = row.beforeState.facts.platform_user;
        const summaries = pgUsers.map(user => ({ ...template, id: user.id, username: user.username, displayName: user.display_name, roleNames: user.id === run.identities.users.u000 ? ['first', 'second'] : [] }));
        row.id = 'focus:' + operation; row.operation = operation; row.route = operation === 'list' ? '/api/platform/users' : '/api/platform/owner-reference';
        if (operation === 'list') row.response = summaries;
        else {
            row.response = { users: summaries.map(user => ({ id: user.id, displayName: user.displayName, isActive: user.isActive, primaryOrgUnitId: null, primaryOrgUnitName: null })), orgUnits: row.beforeState.facts.org_unit.slice(0, 2).map(org => ({ id: org.id, name: org.name, code: org.code, isActive: org.is_active })) };
            row.responseFacts.requestedOrgIds = row.response.orgUnits.map(org => org.id);
            row.responseFacts.organizations = structuredClone(row.beforeState.facts.org_unit.slice(0, 2));
        }
        row.responseFacts.requestedUserIds = summaries.map(user => user.id); row.responseFacts.users = structuredClone(pgUsers);
        if (backend === 'rust') {
            (operation === 'list' ? row.response : row.response.users).reverse();
            row.responseFacts.requestedUserIds.reverse(); row.responseFacts.users.reverse();
        }
        refreshWire(row);
        if (method === 'HEAD') {
            row.headReference = structuredClone(row.wire); row.headReferenceFacts = structuredClone(row.responseFacts);
            Object.assign(row, { method: 'HEAD', response: null });
            Object.assign(row.responseFacts, { requestedUserIds: [], requestedOrgIds: [], users: [], organizations: [] });
            refreshWire(row); row.wire.headers['content-length'] = row.headReference.headers['content-length'];
        }
        return run;
    }
    for (const operation of ['list', 'owner-reference']) for (const method of ['GET', 'HEAD']) {
        const left = userListRun('nest', operation, method), right = userListRun('rust', operation, method), original = structuredClone([left, right]);
        assert.deepEqual(normalizeRun(left), normalizeRun(right)); assert.deepEqual([left, right], original);
        if (method === 'GET') {
            const row = right.observations[0];
            if (operation === 'list') row.response.find(user => user.id === right.identities.users.u000).roleNames.reverse();
            else { row.response.orgUnits.reverse(); row.responseFacts.requestedOrgIds.reverse(); row.responseFacts.organizations.reverse(); }
            refreshWire(row); assert.notDeepEqual(normalizeRun(left), normalizeRun(right), 'Role names and owner organization order remain original behavior');
        }
    }
});

test('same raw UUID aliases stay distinct, and no unknown compact/braced/embedded spelling is admitted', () => {
    const run = focusedFixture(), row = run.observations[0];
    row.route = '/api/platform/users/' + run.identities.users.u000.toUpperCase(); refreshWire(row);
    const uppercase = normalizeRun(run); row.route = row.route.toLowerCase(); refreshWire(row);
    assert.notDeepEqual(uppercase, normalizeRun(run));
    for (const spell of [id => id.replaceAll('-', ''), id => '{' + id + '}', id => 'prefix:' + id + ':suffix', id => id.replace(/^./, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase())]) {
        const unknown = focusedFixture(); unknown.observations[0].request = { json: { id: spell(randomUUID()) } }; refreshWire(unknown.observations[0]); assert.throws(() => normalizeRun(unknown));
    }
});

test('only SQL observer table array order is ignored; statuses, versions and nullable fields remain compared', () => {
    const run = focusedFixture(), before = normalizeRun(run);
    for (const state of [run.observations[0].beforeState, run.observations[0].afterState]) for (const table of factTables) state.facts[table].reverse();
    assert.deepEqual(normalizeRun(run), before);
    run.observations[0].afterState.facts.user_role_assignment[0].status = 'revoked';
    assert.notDeepEqual(normalizeRun(run), before);
    const version = focusedFixture(), original = normalizeRun(version); version.observations[0].afterState.facts.platform_user[0].row_version++;
    assert.notDeepEqual(normalizeRun(version), original);
});

test('wire timestamps must match every observed PG row and immutable/changed timestamps keep semantics', () => {
    for (const mutate of [
        row => { row.response.updatedAt = '2020-01-01T00:00:01.000Z'; refreshWire(row); },
        row => { row.responseFacts.users[0].created_at = '2020-01-01T00:00:01Z'; },
        row => { row.afterState.facts.platform_user[0].created_at = iso(10); },
        row => { row.afterState.facts.platform_user[0].updated_at = iso(-10000); },
        row => { row.beforeState.snapshot.session.updatedAt = iso(9000); },
        row => { row.responseFacts.users.pop(); },
        row => { row.responseFacts.readOnly = false; }
    ]) { const run = focusedFixture(); mutate(run.observations[0]); assert.throws(() => normalizeRun(run)); }
    assert.equal(epochMicros('2020-01-02T00:00:00.123100Z') + 800n, epochMicros('2020-01-02T08:00:00.123900+08:00'));
    for (const value of ['2025-02-29T00:00:00Z', '2020-01-01T24:00:00Z', '2020-01-01T00:00:00', '2020-01-01T00:00:00.1234567Z']) assert.throws(() => epochMicros(value));
});

test('root independent new-user updatedAt mutation cannot escape through consistent wire and PG changes', () => {
    const run = focusedFixture(), row = run.observations[0], target = row.afterState.facts.platform_user[2];
    Object.assign(row, { id: 'focus:create', operation: 'create', method: 'POST', route: '/api/platform/users', status: 201 });
    row.beforeState.facts.platform_user.pop(); target.created_at = target.updated_at = iso(50);
    row.response = { id: target.id, username: target.username, displayName: target.display_name, email: null, phone: null, avatarUrl: null, isActive: true, primaryOrgUnitId: null, lastLoginAt: null, emailVerified: false, phoneVerified: false, rowVersion: 1, createdAt: iso(50), updatedAt: iso(50), createdBy: null, updatedBy: null };
    row.responseFacts.users[0] = structuredClone(target); refreshWire(row);
    const original = normalizeRun(run), changed = structuredClone(run), next = changed.observations[0];
    next.afterState.facts.platform_user[2].updated_at = next.responseFacts.users[0].updated_at = next.response.updatedAt = iso(500000); refreshWire(next);
    assert.throws(() => normalizeRun(changed), /outside actual request/);
    next.afterState.facts.platform_user[2].updated_at = next.responseFacts.users[0].updated_at = next.response.updatedAt = iso(60); refreshWire(next);
    assert.notDeepEqual(normalizeRun(changed), original, 'Even a valid later in-window update keeps its different created/updated equality shape');
    next.afterState.facts.platform_user[2].updated_at = next.responseFacts.users[0].updated_at = next.response.updatedAt = iso(40); refreshWire(next);
    assert.throws(() => normalizeRun(changed), /precedes created_at/);
});

test('new-row time admission is shared by every table and preserves all event-time equality/order relations', () => {
    const row = { id: 'focus:new-row-time', startedAt: iso(0), finishedAt: iso(100) };
    for (const table of ['platform_user', 'local_credential', 'auth_session', 'role', 'org_unit']) {
        const valid = { created_at: iso(20), updated_at: iso(20) }; assert.doesNotThrow(() => validateNewRowTimes(valid, table, row));
        assert.throws(() => validateNewRowTimes({ ...valid, updated_at: iso(500000) }, table, row), /outside actual request/);
        assert.throws(() => validateNewRowTimes({ ...valid, updated_at: iso(10) }, table, row), /precedes created_at/);
        assert.notDeepEqual(validateNewRowTimes(valid, table, row), validateNewRowTimes({ ...valid, updated_at: iso(30) }, table, row));
    }
    for (const [table, keys] of [['user_role_assignment', ['created_at', 'assigned_at', 'revoked_at']], ['user_org_membership', ['created_at', 'assigned_at', 'revoked_at']], ['role_permission_assignment', ['created_at', 'assigned_at', 'revoked_at']], ['audit_log', ['occurred_at']], ['security_event', ['occurred_at']]]) {
        const valid = Object.fromEntries(keys.map(key => [key, iso(30)]));
        assert.doesNotThrow(() => validateNewRowTimes(valid, table, row));
        for (const key of keys) assert.throws(() => validateNewRowTimes({ ...valid, [key]: iso(500000) }, table, row));
    }
    for (const key of ['last_seen_at', 'last_login_at']) assert.throws(() => validateNewRowTimes({ [key]: iso(500000) }, 'auth_session', row));
    assert.throws(() => validateNewRowTimes({ last_seen_at: iso(50), idle_expires_at: iso(40), absolute_expires_at: iso(10000) }, 'auth_session', row));
    assert.throws(() => validateNewRowTimes({ last_seen_at: iso(50), idle_expires_at: iso(10000), absolute_expires_at: iso(9000) }, 'auth_session', row));
});

test('B independent non-owned creation and owned cross-request update mutations are rejected', () => {
    const external = focusedFixture(), row = external.observations[0], seed = { ...row.responseFacts.users[0], id: randomUUID(), username: 'unowned-seed', display_name: 'Unowned seed', created_at: iso(-3600000), updated_at: iso(-3600000) };
    Object.assign(row.response, { id: seed.id, username: seed.username, displayName: seed.display_name, createdAt: seed.created_at, updatedAt: seed.updated_at });
    row.responseFacts.users = [seed]; row.responseFacts.requestedUserIds = [seed.id]; refreshWire(row);
    external.observations.push(structuredClone(row)); external.observations[1].id = 'focus:later'; assert.doesNotThrow(() => normalizeRun(external));
    const changedPast = structuredClone(external); changedPast.observations[1].response.createdAt = changedPast.observations[1].responseFacts.users[0].created_at = iso(-3601000); refreshWire(changedPast.observations[1]);
    assert.throws(() => normalizeRun(changedPast), /creation time changed/);
    external.observations[1].response.createdAt = external.observations[1].responseFacts.users[0].created_at = iso(500000); refreshWire(external.observations[1]);
    assert.throws(() => normalizeRun(external));
    const continuity = focusedFixture(), first = continuity.observations[0], target = continuity.identities.users.u000;
    for (const state of [first.beforeState, first.afterState]) state.facts.platform_user.find(value => value.id === target).updated_at = iso(-5000);
    first.responseFacts.users[0].updated_at = first.response.updatedAt = iso(-5000); refreshWire(first);
    continuity.observations.push(structuredClone(first)); continuity.observations[1].id = 'focus:later'; assert.doesNotThrow(() => normalizeRun(continuity));
    const later = continuity.observations[1];
    for (const state of [later.beforeState, later.afterState]) state.facts.platform_user.find(value => value.id === target).updated_at = iso(500000);
    later.responseFacts.users[0].updated_at = later.response.updatedAt = iso(500000); refreshWire(later);
    assert.throws(() => normalizeRun(continuity), /Undeclared between-request row mutation/);
});

test('non-owned first observation cannot admit consistently future or reversed creation/update/event timestamps', () => {
    const make = () => {
        const run = focusedFixture(), row = run.observations[0], seed = { ...row.responseFacts.users[0], id: randomUUID(), username: 'unowned-seed', display_name: 'Unowned seed', created_at: iso(-3600000), updated_at: iso(-3600000) };
        Object.assign(row.response, { id: seed.id, username: seed.username, displayName: seed.display_name, createdAt: seed.created_at, updatedAt: seed.updated_at });
        row.responseFacts.users = [seed]; row.responseFacts.requestedUserIds = [seed.id]; refreshWire(row);
        run.observations.push(structuredClone(row)); run.observations[1].id = 'focus:later'; return run;
    };
    assert.doesNotThrow(() => normalizeRun(make()));
    for (const fields of [['created_at', 'updated_at'], ['last_login_at']]) {
        const run = make();
        for (const row of run.observations) {
            for (const field of fields) row.responseFacts.users[0][field] = iso(500000);
            if (fields[0] === 'created_at') row.response.createdAt = row.response.updatedAt = iso(500000); else row.response.lastLoginAt = iso(500000);
            refreshWire(row);
        }
        assert.throws(() => normalizeRun(run), /later than its actual observer/);
    }
    const reversed = make(); for (const row of reversed.observations) { row.responseFacts.users[0].updated_at = row.response.updatedAt = iso(-3600001); refreshWire(row); }
    assert.throws(() => normalizeRun(reversed), /updated_at precedes/);
});

test('only the exact declared fixture fields, version count and receipt sequence can bridge two requests', () => {
    const run = focusedFixture(), row = run.observations[0], previous = structuredClone(row.beforeState.facts), target = row.beforeState.facts.platform_user[2];
    const actions = [{ action: 'user-profile-values', userSlot: 'u000' }, { action: 'user-profile-verified', userSlot: 'u000' }];
    Object.assign(target, { email: 'witness@example.test', phone: '12345', avatar_url: 'https://example.test/avatar.png', primary_org_unit_id: run.identities.orgs.alpha, last_login_at: '2020-02-03T04:05:06.123Z', email_verified: true, phone_verified: true, row_version: 3, updated_at: iso(30) });
    assert.doesNotThrow(() => validateFactContinuity(previous, row, run, actions));
    assert.throws(() => validateFactContinuity(previous, row, run, []), /Undeclared/);
    target.display_name = 'an undeclared field'; assert.throws(() => validateFactContinuity(previous, row, run, actions), /exact fixture user fields/);
    target.display_name = previous.platform_user[2].display_name; target.row_version = 4; assert.throws(() => validateFactContinuity(previous, row, run, actions));
    const shell = declaredShell(); assert.doesNotThrow(() => validateFixtureTrace(shell));
    for (const change of [trace => trace.splice(1, 1), trace => { trace[1].account = 'viewer'; }, trace => { trace[1].changed = -1; }, trace => { trace[1].state = 'invented'; }]) {
        const other = declaredShell(); change(other.fixtureActions); assert.throws(() => validateFixtureTrace(other));
    }
});

test('session fixture continuity permits its one due/non-due increment and refuses extra fields or future clocks', () => {
    for (const due of [false, true]) {
        const run = focusedFixture(), row = run.observations[0], previous = structuredClone(row.beforeState.facts), session = row.beforeState.facts.auth_session[0]; row.due = due;
        Object.assign(session, { last_seen_at: iso(due ? -60970 : 30), updated_at: iso(30), row_version: session.row_version + 1 });
        Object.assign(row.beforeState.snapshot.session, { lastSeenAt: session.last_seen_at, updatedAt: session.updated_at, rowVersion: session.row_version });
        assert.doesNotThrow(() => validateFactContinuity(previous, row, run, [], true));
        session.updated_at = iso(500000); assert.throws(() => validateFactContinuity(previous, row, run, [], true), /outside actual request/);
        session.updated_at = iso(30); session.revoked_reason = 'unobserved'; assert.throws(() => validateFactContinuity(previous, row, run, [], true), /only exact fixture session/);
    }
});

test('matrix continuity permits only exact new owned relation rows and cannot launder a foreign row or reused identity', () => {
    for (const [table, action, references, key] of [['user_role_assignment', 'user-role-matrix', 'roles', 'role_id'], ['user_org_membership', 'user-membership-matrix', 'orgs', 'org_unit_id']]) {
        const run = focusedFixture(), row = run.observations[0], previous = structuredClone(row.beforeState.facts), target = run.identities.users.u000;
        if (!previous[table].length) {
            const foreign = { id: randomUUID(), user_id: run.identities.admin, org_unit_id: run.identities.orgs.admin, membership_type: 'primary', status: 'active' };
            previous[table].push(foreign); row.beforeState.facts[table].push(structuredClone(foreign));
        }
        const owned = ['admin', 'viewer', 'alpha', 'inactive'].map((slot, index) => ({ id: randomUUID(), user_id: target, [key]: run.identities[references][slot], status: index === 0 ? 'revoked' : 'active', created_at: iso(30), assigned_at: iso(30), revoked_at: table === 'user_org_membership' ? '2020-01-01T00:00:00Z' : null, created_by: null, assigned_by: null, revoked_by: null, change_reason: null, ...(table === 'user_org_membership' ? { membership_type: ['secondary', 'primary', 'unexpected', 'secondary'][index] } : {}) }));
        row.beforeState.facts[table].push(...owned); const actions = [{ action, userSlot: 'u000' }];
        assert.doesNotThrow(() => validateFactContinuity(previous, row, run, actions));
        owned[1].status = 'revoked'; assert.throws(() => validateFactContinuity(previous, row, run, actions)); owned[1].status = 'active';
        owned[0].id = previous[table][0].id; assert.throws(() => validateFactContinuity(previous, row, run, actions));
    }
});

test('existing credentials and history cannot mutate or disappear; stable fingerprints are checked across requests', () => {
    for (const mutate of [row => { row.afterState.facts.local_credential[0].passwordFingerprint = 'e'.repeat(64); }, row => { row.afterState.facts.local_credential.pop(); }]) {
        const run = focusedFixture(); mutate(run.observations[0]); assert.throws(() => normalizeRun(run));
    }
    const run = focusedFixture(), next = structuredClone(run.observations[0]); next.id = 'focus:later'; run.observations.push(next);
    next.beforeState.facts.local_credential[0].passwordFingerprint = next.afterState.facts.local_credential[0].passwordFingerprint = 'f'.repeat(64);
    assert.throws(() => normalizeRun(run), /mutated between observations|fingerprint changed/);
});

test('audit changedFields and anonymous security records retain all fields and received history array order', () => {
    const add = (run, offset) => {
        const row = run.observations[0], audit = { id: randomUUID(), event_type: 'platform.user.updated', target_type: 'PlatformUser', target_id: run.identities.users.u000, operator_id: run.identities.admin, request_id: null, result: 'success', reason: null, before_snapshot: { email: null }, after_snapshot: { email: 'sample@example.test' }, metadata: { changedFields: ['email', 'emailVerified'] }, occurred_at: iso(offset + 30) };
        row.afterState.facts.audit_log.push(audit);
        row.afterState.snapshot.audits.push({ id: audit.id, eventType: audit.event_type, targetType: audit.target_type, targetId: audit.target_id, operatorId: audit.operator_id, requestId: null, result: 'success', reason: null, beforeSnapshot: audit.before_snapshot, afterSnapshot: audit.after_snapshot, metadata: audit.metadata, occurredAt: audit.occurred_at });
        const security = { id: randomUUID(), event_type: 'access.denied', actor_id: null, principal: null, request_id: 'r2d:' + run.runId, path: row.route, method: 'GET', permission_key: null, result: 'denied', details: { why: 'source-observed' }, occurred_at: iso(offset + 40) };
        row.afterState.facts.security_event.push(security);
        row.afterState.snapshot.securityEvents.push({ id: security.id, eventType: security.event_type, actorId: null, principal: null, requestId: security.request_id, path: security.path, method: 'GET', permissionKey: null, result: 'denied', details: security.details, occurredAt: security.occurred_at });
    };
    const left = focusedFixture(), right = focusedFixture('rust', 500000); add(left, 0); add(right, 500000);
    assert.deepEqual(normalizeRun(left), normalizeRun(right));
    right.observations[0].afterState.facts.audit_log[0].metadata.changedFields.reverse();
    assert.notDeepEqual(normalizeRun(left), normalizeRun(right), 'Audit metadata order is never sorted');
    const leaked = focusedFixture(); leaked.observations[0].afterState.facts.local_credential[0].password_hash = 'must-never-enter-evidence';
    assert.throws(() => normalizeRun(leaked));
});

test('the witnessed due profile two-flush version delta and actual idle lease are required', () => {
    const run = focusedFixture(), row = run.observations[0]; row.group = 'profile'; row.due = true;
    assert.throws(() => normalizeRun(run), /two-flush/);
    const before = row.beforeState.facts.auth_session[0], after = row.afterState.facts.auth_session[0];
    before.last_seen_at = iso(-61000); row.beforeState.snapshot.session.lastSeenAt = before.last_seen_at;
    Object.assign(after, { row_version: before.row_version + 2, updated_at: iso(50), last_seen_at: iso(40), idle_expires_at: iso(900040) });
    Object.assign(row.afterState.snapshot.session, { rowVersion: after.row_version, updatedAt: after.updated_at, lastSeenAt: after.last_seen_at, idleExpiresAt: after.idle_expires_at });
    assert.doesNotThrow(() => normalizeRun(run));
    after.idle_expires_at = iso(900041); row.afterState.snapshot.session.idleExpiresAt = after.idle_expires_at;
    assert.throws(() => normalizeRun(run), /idle deadline/);
});

test('complete source oracle errors and original rejected DTO bytes remain literal including UUID regex patterns', () => {
    const golden = frozenGolden(), candidate = dtoCases(golden, 'a0000000-0000-4000-8000-000000000001').find(row => row.oracle.errors?.some(issue => issue.pattern?.includes('ffffffff-ffff-ffff-ffff-ffffffffffff')));
    assert(candidate);
    const make = () => {
        const run = focusedFixture(), row = run.observations[0], expected = dtoCases(golden, run.identities.users.u000).find(value => value.id === candidate.id);
        Object.assign(row, { id: expected.id, group: expected.group, operation: expected.operation, method: expected.method, route: expected.route, request: structuredClone(expected.options ?? {}), httpEntry: expected.httpEntry, status: 400, response: { statusCode: 400, message: 'Validation failed', errors: structuredClone(expected.oracle.errors) } });
        Object.assign(row.responseFacts, { requestedUserIds: [], users: [] }); refreshWire(row); return run;
    };
    const run = make(); assert.doesNotThrow(() => normalizeRun(run));
    assert.deepEqual(normalizeRun(run).observations[0].response, run.observations[0].response);
    for (const mutate of [row => { row.request.body += ' '; }, row => { row.response.errors[0].message += 'changed'; }, row => { row.status = 500; }]) {
        const changed = make(); mutate(changed.observations[0]); refreshWire(changed.observations[0]); assert.throws(() => normalizeRun(changed));
    }
});

test('HEAD requires an actual same-backend GET with its exact byte length and complete PG coverage', () => {
    const run = focusedFixture(), row = run.observations[0], reference = structuredClone(row.wire), referenceFacts = structuredClone(row.responseFacts);
    row.method = 'HEAD'; row.response = null; Object.assign(row.responseFacts, { requestedUserIds: [], users: [] }); refreshWire(row);
    row.wire.headers['content-length'] = reference.headers['content-length']; row.headReference = reference; row.headReferenceFacts = referenceFacts;
    assert.doesNotThrow(() => normalizeRun(run));
    row.headReference.body.updatedAt = '2020-01-01T00:00:01.000Z'; assert.throws(() => normalizeRun(run));
    row.headReference.body.updatedAt = '2020-01-01T00:00:00.000Z'; row.wire.bodyByteLength = 1; assert.throws(() => normalizeRun(run));
});

test('unmatched HEAD normalization preserves the finite finalhandler policy without broadening matched HEAD lengths', () => {
    const run = focusedFixture(), row = run.observations[0];
    const body = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /api/auth/profile//</pre>\n</body>\n</html>\n';
    const type = 'text/html; charset=utf-8', headers = { 'content-type': type, 'content-length': '157', 'content-security-policy': "default-src 'none'", 'x-content-type-options': 'nosniff' };
    Object.assign(row, { id: 'head:profile:two-trailing-slashes', group: 'head', operation: 'profile', method: 'HEAD', route: '/api/auth/profile//', request: {}, status: 404, expectedStatus: 404, response: null });
    Object.assign(row.responseFacts, { requestedUserIds: [], requestedOrgIds: [], requestedRoleIds: [], users: [], organizations: [], roles: [] });
    row.headReferenceFacts = structuredClone(row.responseFacts);
    row.headReference = { status: 404, body, contentType: type, bodyByteLength: Buffer.byteLength(body), headers, setCookieCount: 0 };
    refreshWire(row);
    row.wire = { status: 404, body: null, contentType: type, bodyByteLength: 0, headers: { ...headers, 'content-length': '158' }, setCookieCount: 0 };
    const normalized = normalizeRun(run).observations[0];
    assert.equal(normalized.wire.lengthSemantics, 'empty-HEAD-matches-finalhandler-method-body');
    assert.equal(normalized.headReference.lengthPolicy, 'finalhandler-not-found');
    for (const mutate of [
        value => { value.wire.headers['content-length'] = '157'; },
        value => { value.wire.headers['content-length'] = '159'; },
        value => { value.headReference.body += ' '; },
        value => { delete value.wire.headers['content-security-policy']; },
        value => { value.id = 'head:profile:canonical'; },
        value => { value.route += '?unplanned=1'; },
        value => { value.status = value.wire.status = value.headReference.status = 200; }
    ]) { const changed = structuredClone(run); mutate(changed.observations[0]); assert.throws(() => normalizeRun(changed)); }
    const matched = focusedFixture(), current = matched.observations[0], reference = structuredClone(current.wire);
    Object.assign(current, { method: 'HEAD', response: null, headReference: reference, headReferenceFacts: structuredClone(current.responseFacts) });
    Object.assign(current.responseFacts, { requestedUserIds: [], users: [] }); refreshWire(current);
    current.wire.headers['content-length'] = reference.headers['content-length'];
    assert.equal(normalizeRun(matched).observations[0].headReference.lengthPolicy, 'get-handler');
    current.wire.headers['content-length'] = String(Number(reference.headers['content-length']) + 1);
    assert.throws(() => normalizeRun(matched), 'Matched HEAD still requires exact GET byte equality');
});

test('a shared prefix, invented request/body/account, missing raw DTO or partial report cannot satisfy the full566 declaration', () => {
    assert.equal(completeHttpCasePlan().length, 566);
    const shell = declaredShell(), closeout = owner(shell);
    assert.doesNotThrow(() => validateReportAdmission(shell, 'nest', closeout));
    const right = declaredShell('rust'), rightOwner = owner(right);
    assert.throws(() => compareReports(shell, right, { nest: closeout, rust: rightOwner }), 'Two full metadata shells with valid owner closeout still have no observations/facts proof');
    for (const mutate of [
        run => { run.observations.pop(); }, run => { run.observations = run.observations.slice(0, 11); }, run => { run.observations[0].id = 'invented'; },
        run => { run.observations[0].request.json.displayName = 'substituted'; }, run => { run.observations[0].request.json.avatarUrl = 'https://extra.test'; },
        run => { run.observations[2].account = 'viewer'; }, run => { run.observations[0].route += '/'; },
        run => { run.observations.find(row => row.group === 'dto-rejected-wire').request.body += ' '; }, run => { run.sourcesUnchanged = false; },
        run => { run.sourcesAfter[0].normalizedLfSha256 = '0'.repeat(64); }, run => { run.cleanupCompleted = false; }, run => { run.zeroResidual.changed = 1; }
    ]) { const changed = declaredShell(), after = owner(changed); mutate(changed); assert.throws(() => validateReportAdmission(changed, 'nest', after)); }
    assert.doesNotThrow(() => validateDeclaredRequests(declaredShell()));
});

test('external owner closeout rejects another worker/start tick, binary, source epoch and missing stop', () => {
    for (const change of [{ result: 'fail' }, { stopped: false }, { aliveAfter: false }, { sourceUnchanged: false }, { serverReceiptSha256: 'f'.repeat(64) }, { processIdentityAfter: { pid: 123, startTicks: '43' } }, { binarySha256After: 'f'.repeat(64) }, { sourceFilesAfter: [] }]) {
        const run = focusedFixture(), closeout = owner(run); assert.doesNotThrow(() => validateOwnerCloseout(run, closeout)); assert.throws(() => validateOwnerCloseout(run, { ...closeout, ...change }));
    }
});

test('comparison diagnostics reveal only the first structural path, and CLI is evidence-scoped/unique', () => {
    assert.equal(firstDifference({ secret: 'private' }, { secret: 'different-private' }), 'root.secret');
    assert.equal(firstDifference([{ a: 1 }], [{ a: 2 }]), 'root[0].a');
    assert.equal(firstDifference({ a: 1, b: 2 }, { b: 2, a: 1 }), null);
    const paths = ['nest', 'rust', 'nest-owner', 'rust-owner', 'new-result'].map(name => 'tmp/rust-r2d/synthetic-compare-' + name + '.json');
    assert.equal(parseCompareOptions(paths).length, 5);
    for (const args of [[], paths.slice(0, 4), [...paths.slice(0, 4), paths[0]], ['../secret.json', ...paths.slice(1)]]) assert.throws(() => parseCompareOptions(args));
});
