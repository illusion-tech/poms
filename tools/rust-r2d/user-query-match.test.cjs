'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describeSql } = require('../rust-r2c/witness-query-core.cjs');
const { barrierSpecs, canonicalUuid, matchesUserQuery } = require('./user-query-match.cjs');
const { validateWitnessEnvironment, resolveWitnessDirectory, readControlFile, validateBarrierPlan, validateRelease, installUserQueryCapture } = require('./user-query-preload.cjs');
const { witnessCases, planSha256 } = require('./nest-witness-plan.mjs');

const runId = '10000000-0000-4000-8000-000000000001';
const user = 'a0000000-0000-4000-8000-000000000001';
const other = 'a0000000-0000-4000-8000-000000000002';
const role = 'b0000000-0000-4000-8000-000000000001';
const org = 'c0000000-0000-4000-8000-000000000001';
const session = 'd0000000-0000-4000-8000-000000000001';
const username = `r2d_u000_${runId.replaceAll('-', '')}`;
const targets = { targetUserId: user, targetRoleId: role, targetOrgId: org, targetSessionId: session, targetUsername: username };
function matches(kind, sql, values = [], target = targets, phase = barrierSpecs[kind].phase) { return matchesUserQuery(kind, phase, describeSql(sql), [sql, values], target); }
function planFor(kind, patch = {}) {
    const spec = barrierSpecs[kind];
    return { formatVersion: 1, runId, barrierId: 'test-barrier', caseId: witnessCases.find((entry) => entry.barrierKinds.includes(kind)).id,
        planSha256, kind, parties: 1, skipMatches: 0,
        ...Object.fromEntries([spec.target, spec.secondTarget].filter(Boolean).map((key) => [key, targets[key]])), ...patch };
}
const userSelect = 'select "p0".* from "poms"."platform_user" as "p0" where "p0"."id" = $1 limit $2';
const usernameSelect = 'select "p0".* from "poms"."platform_user" as "p0" where "p0"."username" = $1 limit $2';
const userCas = 'update "poms"."platform_user" set "display_name"=$1,"row_version"="row_version"+1 where "id"=$2 and "row_version"=$3 returning "row_version"';
const managedSession = 'update "poms"."auth_session" set "last_seen_at"=$1,"row_version"="row_version"+1 where "id"=$2 and "row_version"=$3 returning "row_version"';
const rawTouch = 'update "poms"."auth_session" set "last_seen_at"=$1,"last_ip"=coalesce($2,"last_ip"),"idle_expires_at"=least($3,"absolute_expires_at"),"row_version"="row_version"+1 where "id"=$4 and "status"=$5 and "last_seen_at"<=$6 and "idle_expires_at">$7 and "absolute_expires_at">$8 returning "last_seen_at","row_version" as "rowVersion"';

test('observer UUID identity accepts enumerated PG spellings without changing product strings', () => {
    for (const value of [user, user.toUpperCase(), user.replaceAll('-', ''), `{${user.toUpperCase()}}`]) assert.equal(canonicalUuid(value), user);
    for (const value of [null, 'bad', `${user};delete`, `%61${user.slice(1)}`, `{{${user}}}`]) assert.equal(canonicalUuid(value), null);
});

test('by-ID reads require exact target in actual original query arguments', () => {
    assert(matches('after-user-by-id-select', userSelect, [user, 1]));
    assert(matches('after-user-by-id-select', userSelect, [user.toUpperCase(), 1]));
    assert(!matches('after-user-by-id-select', userSelect, [other, 1]));
    assert(!matches('after-user-by-id-select', userSelect, [user, 1], targets, 'before'));
    assert(!matches('after-user-by-id-select', userSelect.replace('"p0"."id" = $1', '"p0"."username" = $1'), [user, 1]));
});

test('inline UUID and object-form prepared query are privately matched', () => {
    const sql = userSelect.replace('$1', `'${user}'`);
    assert(matches('after-user-by-id-select', sql, []));
    assert(matchesUserQuery('after-user-by-id-select', 'after', describeSql(userSelect), [{ text: userSelect, values: [user, 1] }], targets));
    assert(!matchesUserQuery('after-user-by-id-select', 'after', describeSql(sql), [userSelect, [user, 1]], targets));
});

test('username precheck identifies owned fixture username and excludes login active-user shape', () => {
    assert(matches('after-user-username-select', usernameSelect, [username, 1]));
    assert(!matches('after-user-username-select', usernameSelect, ['another-account', 1]));
    assert(!matches('after-user-username-select', usernameSelect.replace(' limit', ' and "p0"."is_active"=$3 limit'), [username, 1, true]));
});

test('target binding rejects OR, subquery, join, comment and statement spoofing', () => {
    for (const sql of [userSelect.replace(' limit', ' or "p0"."id"=$3 limit'), userSelect.replace('select "p0".*', 'select (select 1)'), userSelect.replace(' where', ' join poms.role on true where'), `${userSelect}; select 1`, 'select * from poms.platform_user where username=$1 /* id=$2 */']) assert(!matches('after-user-by-id-select', sql, [user, 1, other]));
    assert(!matches('before-user-cas-update', userCas.replace(' and "row_version"', ' or "row_version"'), ['name', user, 1]));
});

test('full-table and status-only reads freeze real order/filter and disclose structural scope', () => {
    assert(matches('after-users-list-select', 'select p0.* from poms.platform_user as p0 order by p0.created_at desc'));
    assert(!matches('after-users-list-select', 'select p0.* from poms.platform_user as p0 order by p0.created_at desc,p0.id asc'));
    assert(matches('after-orgs-list-select', 'select o0.* from poms.org_unit as o0 order by o0.display_order asc,o0.created_at asc'));
    assert(matches('after-roles-list-select', 'select r0.* from poms.role as r0 order by r0.display_order asc,r0.created_at asc'));
    for (const [kind, table] of [['after-role-assignments-select', 'user_role_assignment'], ['after-org-memberships-select', 'user_org_membership'], ['after-role-permissions-select', 'role_permission_assignment']]) {
        assert(matches(kind, `select x.* from poms.${table} as x where x.status=$1`, ['active']));
        assert(!matches(kind, `select x.* from poms.${table} as x where x.status=$1`, ['revoked']));
        assert(!matches(kind, `select x.* from poms.${table} as x where x.status=$1 order by x.id`, ['active']));
        assert.equal(barrierSpecs[kind].structural, true);
    }
});

test('roles lookup requires the owned UUID within equality, IN or bound ANY', () => {
    assert(matches('after-roles-by-ids-select', 'select r0.* from poms.role as r0 where r0.id in ($1,$2)', [other, role]));
    assert(matches('after-roles-by-ids-select', 'select r0.* from poms.role as r0 where r0.id=any($1::uuid[])', [[role]]));
    assert(!matches('after-roles-by-ids-select', 'select r0.* from poms.role as r0 where r0.id in ($1)', [other]));
});

test('native deletes match exact user-only filter and never broader status/history deletion', () => {
    for (const [kind, table] of [['after-role-assignments-delete', 'user_role_assignment'], ['after-org-memberships-delete', 'user_org_membership']]) {
        assert(matches(kind, `delete from poms.${table} where user_id=$1`, [user]));
        assert(!matches(kind, `delete from poms.${table} where user_id=$1`, [other]));
        assert(!matches(kind, `delete from poms.${table} where user_id=$1 and status=$2`, [user, 'active']));
        assert(!matches(kind, `delete from poms.${table}`, []));
    }
});

test('CAS is an optimistic WHERE plus singleton RETURNING, never RETURNING-only', () => {
    assert(matches('before-user-cas-update', userCas, ['name', user, 1]));
    assert(!matches('before-user-cas-update', userCas.replace(' and "row_version"=$3', ''), ['name', user, 1]));
    assert(!matches('before-user-cas-update', userCas.replace('returning "row_version"', 'returning "id","row_version"'), ['name', user, 1]));
    assert(!matches('before-user-cas-update', userCas, ['name', other, 1]));
    assert(matches('before-managed-session-update', managedSession, ['date', session, 1]));
    assert(!matches('before-managed-session-update', managedSession, ['date', other, 1]));
});

test('CAS rejects negated targets, IS FALSE and additional boolean conditions', () => {
    for (const [kind, sql, targetId] of [['before-user-cas-update', userCas, user], ['before-managed-session-update', managedSession, session]]) {
        for (const condition of ['not ("id"=$2)', '"id"=$2 is false', '"id"=$2 is not true', '"id"=$2 and true', '"id"=$2 and "is_active"=$4']) {
            assert(!matches(kind, sql.replace('"id"=$2', condition), ['name-or-date', targetId, 1, true]), condition);
        }
        assert(matches(kind, sql.replace('"id"=$2 and "row_version"=$3', '("row_version"=$3) and ("id"=$2)'), ['name-or-date', targetId, 1]));
    }
});

test('actual raw-touch shape and managed session CAS remain disjoint', () => {
    const values = ['date', null, 'expiry', session, 'active', 'before', 'now', 'now'];
    assert(matches('after-raw-session-touch', rawTouch, values));
    assert(!matches('before-managed-session-update', rawTouch, values));
    assert(!matches('after-raw-session-touch', managedSession, ['date', session, 1]));
    assert(!matches('after-raw-session-touch', rawTouch, ['date', null, 'expiry', other, 'active', 'before', 'now', 'now']));
    for (const condition of ['not ("id"=$4)', '"id"=$4 is false', '"id"=$4 and true']) assert(!matches('after-raw-session-touch', rawTouch.replace('"id"=$4', condition), values));
    assert(!matches('after-raw-session-touch', rawTouch.replace(' and "absolute_expires_at">$8', ''), values));
});

test('insert matching binds required targets in the same actual row', () => {
    assert(matches('before-user-insert', 'insert into poms.platform_user (username,display_name) values ($1,$2) returning id', [username, 'name']));
    assert(!matches('before-user-insert', 'insert into poms.platform_user (username) values ($1)', ['other']));
    // Boolean defaults occur in the real W01 original Nest INSERT shape.
    const actualShape = `insert into "poms"."platform_user" ("username","display_name","email_verified","phone_verified","is_active","created_at") values ('${username}','synthetic',false,false,true,'2020-01-01T00:00:00Z') returning "id","row_version"`;
    assert(matches('before-user-insert', actualShape));
    const roles = 'insert into poms.user_role_assignment (user_id,role_id,status) values ($1,$2,$3),($4,$5,$6) returning id';
    assert(matches('before-role-assignments-insert', roles, [user, role, 'active', other, role, 'active']));
    assert(!matches('before-role-assignments-insert', roles, [user, other, 'active', other, role, 'active']));
    assert(matches('before-org-memberships-insert', 'insert into poms.user_org_membership (user_id,org_unit_id,membership_type) values ($1,$2,$3)', [user, org, 'primary']));
    assert(!matches('before-org-memberships-insert', 'insert into poms.user_org_membership (user_id,org_unit_id) values (default,$1)', [org]));
});

test('audit barrier matches PlatformUser target and optional exact event without retaining JSON data', () => {
    const sql = 'insert into poms.audit_log (target_id,target_type,event_type,metadata) values ($1,$2,$3,$4) returning id';
    const values = [user, 'PlatformUser', 'platform.user.updated', { hidden: 'must-not-record' }];
    assert(matches('before-audit-insert', sql, values));
    assert(matches('after-audit-insert', sql, values, { ...targets, targetEventType: 'platform.user.updated' }));
    assert(!matches('before-audit-insert', sql, [user, 'PlatformRole', ...values.slice(2)]));
    assert(!matches('before-audit-insert', sql, values, { ...targets, targetEventType: 'platform.user.created' }));
});

test('barrier plans are exact frozen case/kind/target protocols', () => {
    for (const kind of Object.keys(barrierSpecs)) assert.equal(validateBarrierPlan(planFor(kind), runId).kind, kind);
    const valid = planFor('after-user-by-id-select');
    for (const patch of [{ arbitrarySql: 'select 1' }, { runId: other }, { planSha256: '0'.repeat(64) }, { caseId: 'W99-anything' }, { targetUserId: user.toUpperCase() }, { targetUserId: undefined }, { targetRoleId: role }, { parties: 3 }, { skipMatches: -1 }, { skipMatches: 1.1 }, { skipMatches: 33 }]) assert.throws(() => validateBarrierPlan({ ...valid, ...patch }, runId));
    assert.throws(() => validateBarrierPlan(planFor('after-users-list-select', { parties: 2 }), runId));
    assert.throws(() => validateBarrierPlan(planFor('before-user-insert', { targetUsername: `r2d_u256_${runId.replaceAll('-', '')}` }), runId));
    assert.throws(() => validateBarrierPlan(planFor('before-user-insert', { targetUsername: `r2d_${runId.replaceAll('-', '')}_u000` }), runId));
    for (const name of ['admin', 'viewer', 'u000', 'u255']) assert(validateBarrierPlan(planFor('before-user-insert', { targetUsername: `r2d_${name}_${runId.replaceAll('-', '')}` }), runId));
});

test('release and ambient config reject stale/extra/overriding values', () => {
    const plan = planFor('after-user-by-id-select');
    const release = { formatVersion: 1, runId, barrierId: plan.barrierId };
    assert(validateRelease(release, plan));
    for (const patch of [{ runId: other }, { barrierId: 'old' }, { extra: true }]) assert(!validateRelease({ ...release, ...patch }, plan));
    assert.equal(validateWitnessEnvironment({ POMS_R2D_WITNESS_RUN_ID: runId }), runId);
    for (const key of ['POMS_R2D_WITNESS_DIRECTORY', 'POMS_R2D_QUERY_OUTPUT', 'POMS_R2D_SQL_FILE', 'NODE_OPTIONS', 'node_options', 'poms_r2d_witness_run_id']) assert.throws(() => validateWitnessEnvironment({ POMS_R2D_WITNESS_RUN_ID: runId, [key]: 'override' }));
    assert.throws(() => validateWitnessEnvironment({ POMS_R2D_WITNESS_RUN_ID: '../escape' }));
});

function temporaryRoot() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-r2d-query-test-'));
    return { directory, cleanup() {
        const actual = fs.realpathSync(directory), expectedParent = fs.realpathSync(os.tmpdir());
        assert.equal(path.dirname(actual), expectedParent); assert(path.basename(actual).startsWith('poms-r2d-query-test-'));
        fs.rmSync(actual, { recursive: true });
    } };
}

test('control files are fixed private regular files; paths do not escape the repository', () => {
    const fixture = temporaryRoot();
    try {
        const directory = path.join(fixture.directory, 'tmp/rust-r2d/witness', runId);
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        assert.equal(resolveWitnessDirectory(fixture.directory, runId), directory);
        const file = path.join(directory, 'barrier.json');
        assert.equal(readControlFile(file), null);
        fs.writeFileSync(file, '{}', { mode: 0o600 }); assert.deepEqual(readControlFile(file), {});
        fs.writeFileSync(file, 'x'.repeat(4097)); assert.throws(() => readControlFile(file));
        fs.unlinkSync(file); fs.mkdirSync(file); assert.throws(() => readControlFile(file));
        assert.throws(() => resolveWitnessDirectory(fixture.directory, '../escape'));
    } finally { fixture.cleanup(); }
});

test('POSIX public modes and symlinked run/control paths are rejected', { skip: process.platform === 'win32' }, () => {
    const fixture = temporaryRoot();
    try {
        const directory = path.join(fixture.directory, 'tmp/rust-r2d/witness', runId); fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        fs.chmodSync(directory, 0o755); assert.throws(() => resolveWitnessDirectory(fixture.directory, runId)); fs.chmodSync(directory, 0o700);
        const target = path.join(fixture.directory, 'private.json'); fs.writeFileSync(target, '{}', { mode: 0o600 });
        const file = path.join(directory, 'barrier.json'); fs.symlinkSync(target, file); assert.throws(() => readControlFile(file)); fs.unlinkSync(file);
        fs.writeFileSync(file, '{}', { mode: 0o644 }); assert.throws(() => readControlFile(file)); fs.unlinkSync(file);
        fs.rmdirSync(directory); fs.symlinkSync(fixture.directory, directory); assert.throws(() => resolveWitnessDirectory(fixture.directory, runId));
    } finally { fixture.cleanup(); }
});

test('driver observer preserves actual result and errors and never logs values/rows', async () => {
    const rows = [], result = { command: 'SELECT', rowCount: 1, rows: [{ password: 'row-secret-do-not-record' }] };
    const failure = Object.assign(new Error('driver secret do not log'), { code: '23505' });
    class Client { query(sql) { return sql.startsWith('bad') ? Promise.reject(failure) : Promise.resolve(result); } }
    const original = Client.prototype.query;
    const capture = installUserQueryCapture(Client, { runId, workerIdentity: { pid: 99, startTicks: '123' }, append: (row) => rows.push(row) });
    try {
        assert.equal(await new Client().query('select $1', ['bind-secret-do-not-record']), result);
        await assert.rejects(new Client().query('bad secret'), (error) => error === failure);
        assert(!JSON.stringify(rows).includes('bind-secret-do-not-record')); assert(!JSON.stringify(rows).includes('row-secret-do-not-record')); assert(!JSON.stringify(rows).includes('driver secret do not log'));
        assert(rows.every((row) => row.workerPid === 99 && row.workerStartTicks === '123'));
        assert.equal(rows.at(-1).code, '23505');
    } finally { capture.uninstall(); assert.equal(Client.prototype.query, original); }
});

test('parallel query arguments are isolated and barrier captures only its owned target', async () => {
    const rows = [], plan = planFor('after-user-by-id-select');
    class Client { processID = 321; query() { return new Promise((resolve) => setImmediate(() => resolve({ command: 'SELECT', rowCount: 1 }))); } }
    const capture = installUserQueryCapture(Client, { runId, workerIdentity: { pid: 99, startTicks: '123' }, append: (row) => rows.push(row), readPlan: () => plan });
    try {
        await Promise.all([new Client().query(userSelect, [other, 1]), new Client().query(userSelect, [user, 1])]);
        const hits = rows.filter((row) => row.phase === 'barrier-hit'); assert.equal(hits.length, 1); assert.equal(hits[0].queryId, 2); assert.equal(hits[0].backendPid, 321);
        assert.equal(hits[0].barrierProof.targetMatched, true); assert.deepEqual(hits[0].barrierProof.targets, { targetUserId: user });
        assert.equal(capture.isIncomplete(), false);
    } finally { capture.uninstall(); }
});

test('skip and party claims are precise and structural reads never claim a UUID match', async () => {
    const rows = []; let plan = planFor('after-user-by-id-select', { skipMatches: 1, parties: 2 });
    class Client { query() { return Promise.resolve({ command: 'SELECT', rowCount: 1 }); } }
    const capture = installUserQueryCapture(Client, { runId, workerIdentity: { pid: 99, startTicks: '123' }, append: (row) => rows.push(row), readPlan: () => plan });
    try {
        for (let index = 0; index < 4; index++) await new Client().query(userSelect, [user, 1]);
        assert.deepEqual(rows.filter((row) => row.phase === 'barrier-hit').map((row) => [row.queryId, row.barrierProof.party]), [[2, 1], [3, 2]]);
        plan = planFor('after-users-list-select', { barrierId: 'structural' });
        await new Client().query('select p0.* from poms.platform_user as p0 order by p0.created_at desc');
        const hit = rows.filter((row) => row.phase === 'barrier-hit').at(-1); assert.equal(hit.barrierProof.proofKind, 'structural-full-read'); assert.equal(hit.barrierProof.targetMatched, null); assert.deepEqual(hit.barrierProof.targets, {});
    } finally { capture.uninstall(); }
});

test('invalid controls and failed barriers mark evidence incomplete while preserving SQL behavior', async () => {
    const result = { command: 'SELECT', rowCount: 1 }, rows = []; let plan = planFor('after-user-by-id-select');
    class Client { query() { return Promise.resolve(result); } }
    const capture = installUserQueryCapture(Client, { runId, workerIdentity: { pid: 99, startTicks: '123' }, append: (row) => rows.push(row), readPlan: () => plan, awaitRelease: async () => false });
    try {
        assert.equal(await new Client().query(userSelect, [user, 1]), result); assert.equal(capture.isIncomplete(), true);
        assert(rows.some((row) => row.phase === 'barrier-timeout'));
        plan = { ...plan, targetUserId: other }; assert.equal(await new Client().query(userSelect, [other, 1]), result); assert.equal(capture.isIncomplete(), true);
    } finally { capture.uninstall(); }
});
