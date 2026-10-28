import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { concurrencyCases, concurrencyManifest, concurrencyPlanSha256, userRowLockMode, queryKind, sanitizeActivity, dependencyPath, assertWaitProof, assertCaseProofs, assertStatuses, captureControlledRequests } from './http-concurrency-protocol.mjs';
import { parseConcurrencyOptions, safeEvidencePath, validateConcurrencyReceipt, assertPrivateDirectory, assertOriginalSelection } from './http-concurrency.mjs';
import { witnessCases } from './nest-witness-plan.mjs';

test('fixed concurrency plan covers each frozen family and limits symmetric exchange to two declared cases', () => {
    assert.deepEqual(concurrencyCases.map((row) => row.id), ['username-two-prechecks', 'roles-delete-insert-conflict', 'org-delete-stale-user', 'target-user-stale-version', 'alias-user-stale-version', 'profile-toggle-both-stale', 'late-session-dirty-user', 'late-session-noop-user', 'late-session-roles-empty', 'late-session-org-replace', 'self-null-to-value', 'self-value-to-null', 'other-null-to-value', 'caller-role-after-guard', 'caller-disable-after-guard', 'org-inactive-after-precheck']);
    assert.equal(new Set(concurrencyCases.map((row) => row.id)).size, 16); assert.equal(concurrencyManifest().planSha256, concurrencyPlanSha256); assert.equal(concurrencyPlanSha256, '3df6e03640430ac39be3959e1bf3fb68ed678b101edbd3f88281b0a26fa34a08');
    assert.deepEqual(concurrencyCases.filter((row) => row.symmetric).map((row) => row.id), ['username-two-prechecks', 'roles-delete-insert-conflict']);
    assert.equal(concurrencyCases.filter((row) => row.kind === 'session').length, 4); assert(concurrencyManifest().limits.includes('not private bind values'));
});
test('explicit invocation rejects old profile/evidence paths, traversal, unknown cases and missing selectors', () => {
    assert.equal(parseConcurrencyOptions(['--plan']).mode, 'plan');
    assert.equal(parseConcurrencyOptions(['--run', 'nest', 'tmp/rust-r2d/owner.json', 'race01']).selectedCaseIds.length, 16);
    assert.deepEqual(parseConcurrencyOptions(['--run', 'rust', 'tmp/rust-r2d/owner.json', 'race01', '--case', 'self-null-to-value']).selectedCaseIds, ['self-null-to-value']);
    for (const args of [[], ['--run', 'nest'], ['--run', 'pg17', 'tmp/rust-r2d/owner.json', 'race01'], ['--run', 'nest', 'tmp/rust-r2c/owner.json', 'race01'], ['--run', 'rust', 'tmp/rust-r2d/owner.json', '../old'], ['--run', 'nest', 'tmp/rust-r2d/owner.json', 'race01', '--case', 'unknown']]) assert.throws(() => parseConcurrencyOptions(args));
    for (const file of ['tmp/rust-r2d/../rust-r2c/x.json', 'tmp/rust-r2d//x.json', '/tmp/rust-r2d/x.json', 'C:/tmp/rust-r2d/x.json', 'tmp\\rust-r2d\\x.json']) assert.throws(() => safeEvidencePath(file));
});
test('organization dirty flush permits earlier membership FK key-share while still holding the user CAS', () => {
    assert.equal(userRowLockMode('org-cas'), 'FOR NO KEY UPDATE');
    for (const kind of ['username', 'user-cas', 'user-pair', 'nullable']) assert.equal(userRowLockMode(kind), 'FOR UPDATE');
});
test('historical W01 full-case selection and later ID selections are separately exact, never broadly coerced', () => {
    const objects = witnessCases.filter((row) => row.group === 'W01'), ids = objects.map((row) => row.id);
    assertOriginalSelection(objects, ids, true); assertOriginalSelection(ids, ids, false);
    assert.throws(() => assertOriginalSelection(ids, ids, true)); assert.throws(() => assertOriginalSelection(objects, ids, false));
    assert.throws(() => assertOriginalSelection(objects.map((row, index) => index ? row : { ...row, scenario: 'changed' }), ids, true));
    assert.throws(() => assertOriginalSelection(objects.slice(1), ids, true));
});
test('SQL phases require a complete positive CAS predicate and distinguish raw touch from managed flush', () => {
    const user = 'UPDATE poms.platform_user SET display_name=$1,row_version=row_version+1 WHERE id=$2 AND row_version=$3 RETURNING row_version';
    const session = 'UPDATE poms.auth_session SET updated_at=$1,row_version=row_version+1 WHERE (row_version=$3 AND id=$2) RETURNING row_version';
    const raw = "UPDATE poms.auth_session SET last_seen_at=$1,last_ip=coalesce($2,last_ip),idle_expires_at=least($3,absolute_expires_at),row_version=row_version+1 WHERE id=$4 AND status='active' AND last_seen_at<=$5 AND idle_expires_at>$1 AND absolute_expires_at>$1 RETURNING last_seen_at,last_ip,idle_expires_at,row_version,updated_at";
    assert.equal(queryKind(user), 'user-cas'); assert.equal(queryKind(session), 'managed-session-cas'); assert.equal(queryKind(raw), 'raw-session-touch');
    for (const sql of [user.replace('id=$2', 'NOT(id=$2)'), user.replace('id=$2', 'id=$2 IS FALSE'), user.replace('id=$2', 'id=$2 OR id=$4'), user.replace('row_version=$3', 'row_version=true'), user.replace('RETURNING row_version', 'RETURNING *'), user + '; UPDATE poms.platform_user SET is_active=false', raw.replace('status=\'active\'', 'NOT(status=\'active\')')]) assert.equal(queryKind(sql), 'other', sql);
    assert.equal(queryKind('SELECT id::text FROM poms.auth_session WHERE id=$1 AND user_id=$2 FOR UPDATE'), 'coordinator-session-lock');
    assert.equal(queryKind('INSERT INTO poms.platform_user (username,display_name) VALUES($1,$2) RETURNING id,row_version'), 'user-insert');
    assert.equal(queryKind('INSERT INTO poms.user_role_assignment (user_id,role_id) VALUES($1::text::uuid,$2::text::uuid) RETURNING id'), 'role-insert');
    assert.equal(queryKind('INSERT INTO poms.user_org_membership (user_id,org_unit_id) VALUES($1,$2) RETURNING id'), 'membership-insert');
});
test('SQL evidence contains shape/digest only and rejects incidental phase matches', () => {
    const secret = 'credential-and-session-must-never-be-in-evidence';
    const value = sanitizeActivity({ pid: 11, state: 'active', wait_event_type: 'Lock', wait_event: 'transactionid', blockers: [10], query: `UPDATE poms.platform_user SET display_name='${secret}',row_version=row_version+1 WHERE id='a0000000-0000-4000-8000-000000000001' AND row_version=1 RETURNING row_version` });
    assert.equal(value.kind, 'user-cas'); assert(!JSON.stringify(value).includes(secret)); assert(!JSON.stringify(value).includes('a0000000-0000-4000-8000-000000000001'));
    assert.equal(queryKind('UPDATE poms.org_unit SET row_version=row_version+1 WHERE id=$1 AND row_version=$2 RETURNING row_version'), 'other');
    assert.equal(queryKind('INSERT INTO poms.user_role_assignment (user_id,role_id) SELECT $1,$2'), 'other');
});
function proof() {
    const row = sanitizeActivity({ pid: 11, state: 'active', wait_event_type: 'Lock', wait_event: 'transactionid', blockers: [10], query: 'UPDATE poms.platform_user SET row_version=row_version+1 WHERE id=$1 AND row_version=$2 RETURNING row_version' });
    return { stage: 'owned-row', roots: [10], expectedCount: 1, expectedKind: 'user-cas', waiterPids: [11], rows: [row], at: '2026-10-28T00:00:00.000Z' };
}
test('a SQL shape alone is insufficient; every waiter and root need a real dependency path', () => {
    const p = proof(); assert.equal(assertWaitProof(p), true); assert.deepEqual(dependencyPath(p.rows, 11, [10]), [11, 10]);
    const linked = { ...p, rows: [{ ...p.rows[0], blockers: [12] }, { pid: 12, blockers: [10] }] }; assert.deepEqual(dependencyPath(linked.rows, 11, [10]), [11, 12, 10]); assertWaitProof(linked);
    for (const bad of [{ ...p, roots: [20] }, { ...p, expectedKind: 'managed-session-cas' }, { ...p, waiterPids: [11, 11], expectedCount: 2 }, { ...p, roots: [10, 20] }, { ...p, rows: [{ ...p.rows[0], state: 'idle in transaction' }] }, { ...p, rows: [{ ...p.rows[0], blockers: [] }] }]) assert.throws(() => assertWaitProof(bad));
    assert.equal(dependencyPath([{ pid: 11, blockers: [12] }, { pid: 12, blockers: [11] }], 11, [10]), null);
});
test('explicit symmetric results preserve original request order; deterministic cases cannot swap or silently broaden statuses', () => {
    const row = { id: 'username-two-prechecks', requests: [{ client: 0, status: 500, setCookieCount: 0 }, { client: 1, status: 201, setCookieCount: 0 }], followups: [] };
    assertStatuses(row); assert.equal(row.winnerClient, 1); assert.deepEqual(row.requests.map((r) => r.status), [500, 201]);
    assert.throws(() => assertStatuses({ ...row, requests: row.requests.map((r) => ({ ...r, status: 500 })) }));
    assert.throws(() => assertStatuses({ ...row, id: 'profile-toggle-both-stale' }));
    assert.throws(() => assertStatuses({ id: 'target-user-stale-version', requests: [{ status: 409, setCookieCount: 0 }] }));
});
test('relation proof must see committed deletion; no fake evidence promotes a nativeDelete omission', () => {
    const p = proof(), role = sanitizeActivity({ pid: 11, state: 'active', wait_event_type: 'Lock', wait_event: 'transactionid', blockers: [10], query: 'INSERT INTO poms.user_role_assignment (user_id,role_id) VALUES($1,$2) RETURNING id' });
    const row = { id: 'roles-delete-insert-conflict', proofs: [{ ...p, expectedCount: 2, expectedKind: 'role-insert', waiterPids: [11, 12], rows: [role, { ...role, pid: 12, blockers: [11] }] }], relationshipsDuringWait: [] };
    assertCaseProofs(row); assert.throws(() => assertCaseProofs({ ...row, relationshipsDuringWait: [{ id: 'old-history' }] }));
});
test('capture preserves settled responses/adoption and attempts all facts even after failed barriers or ownership recovery', async () => {
    for (const adoptionFailure of [false, true]) {
        const row = { requests: [] }, calls = [], barrierFailure = new Error('barrier failed');
        await assert.rejects(captureControlledRequests({ row, requests: [{ client: 0, method: 'POST', path: '/api/platform/users', input: {} }, { client: 1, method: 'POST', path: '/api/platform/users', input: {} }],
            send: async (request) => ({ status: request.client ? 500 : 201, body: { client: request.client }, setCookie: [] }), control: async () => { throw barrierFailure; }, release: async () => calls.push('rollback'),
            adopt: async () => { assert.deepEqual(row.requests.map((r) => r.status), [201, 500]); calls.push('adopt'); if (adoptionFailure) throw new Error('ownership refused'); return {}; },
            captureAfter: async () => { calls.push('facts'); return {}; }, captureSessions: async () => { calls.push('sessions'); return {}; }, verify: () => assert.fail('cannot verify a failed capture') }), (error) => error === barrierFailure);
        assert.equal(row.result, 'capture-incomplete'); assert.deepEqual(row.requests.map((r) => r.status), [201, 500]); assert.deepEqual(calls, ['rollback', 'adopt', 'facts', 'sessions']);
        assert.equal(row.captureErrors.some((error) => error.phase === 'adopt-created-user'), adoptionFailure);
    }
});
test('post-facts or verification failure cannot leave an observed label and transport error still releases locks', async () => {
    for (const stage of ['transport', 'facts', 'assertions']) {
        const row = { requests: [] }, calls = [];
        await assert.rejects(captureControlledRequests({ row, requests: [{ client: 0, method: 'PATCH', path: '/api/platform/users/id', input: {} }],
            send: async () => { if (stage === 'transport') throw new Error('closed'); return { status: 200, body: {}, setCookie: [] }; }, control: async () => undefined,
            release: async () => calls.push('release'), captureAfter: async () => { calls.push('facts'); if (stage === 'facts') throw new Error('facts'); return {}; }, captureSessions: async () => { calls.push('sessions'); return {}; }, verify: () => { if (stage === 'assertions') throw new Error('verify'); } }));
        assert.equal(row.result, 'capture-incomplete'); assert.deepEqual(calls, ['release', 'facts', 'sessions']); assert.equal(row.failurePhase, stage === 'transport' ? 'http-transport' : stage === 'facts' ? 'after' : 'assertions');
    }
});
test('followup transport failure retains the committed main response and independently attempts both fact captures', async () => {
    const row = { requests: [] }, calls = [], error = new Error('followup transport');
    await assert.rejects(captureControlledRequests({ row, requests: [{ client: 0, method: 'PATCH', path: '/api/platform/users/id', input: {} }], send: async () => ({ status: 200, body: { committed: true }, setCookie: [] }), control: async () => undefined, release: async () => calls.push('release'),
        captureFollowups: async () => { calls.push('followup'); throw error; }, captureAfter: async () => { calls.push('facts'); return { preserved: true }; }, captureSessions: async () => { calls.push('sessions'); return {}; }, verify: () => assert.fail('failed capture cannot pass') }), (actual) => actual === error);
    assert.deepEqual(calls, ['release', 'followup', 'facts', 'sessions']); assert.equal(row.requests[0].status, 200); assert.deepEqual(row.after, { preserved: true }); assert.equal(row.result, 'capture-incomplete'); assert.equal(row.failurePhase, 'followup-http');
});
test('server receipt cannot admit another backend, origin, source, recycled process or unsafe source path', () => {
    const receipt = { backend: 'nest', origin: 'http://127.0.0.1:5500', sourceHead: 'a22cba7360346242cb7709740b7eb954b92d1fd4', aliveBefore: true, ownerPlatform: 'linux', pid: 123, processIdentity: { pid: 123, startTicks: '12345' }, binarySha256: 'a'.repeat(64), sourceFiles: [{ file: 'tools/rust-r2d/http-concurrency.mjs', sha256: 'b'.repeat(64) }] };
    assert.equal(validateConcurrencyReceipt(receipt, 'nest', receipt.origin).pid, 123);
    for (const bad of [{ ...receipt, backend: 'rust' }, { ...receipt, sourceHead: 'a'.repeat(40) }, { ...receipt, aliveBefore: false }, { ...receipt, processIdentity: { pid: 124, startTicks: '12345' } }, { ...receipt, processIdentity: { pid: 123, startTicks: '0' } }, { ...receipt, sourceFiles: [{ file: '../outside', sha256: 'b'.repeat(64) }] }, { ...receipt, sourceFiles: [...receipt.sourceFiles, ...receipt.sourceFiles] }]) assert.throws(() => validateConcurrencyReceipt(bad, 'nest', receipt.origin));
});
test('POSIX evidence modes and symbolic links cannot bypass run/receipt admission', { skip: process.platform === 'win32' }, () => {
    const relative = `tmp/rust-r2d/c-concurrency-path-${randomUUID()}.json`, full = safeEvidencePath(relative), directory = full + '-private';
    mkdirSync(directory, { mode: 0o700 });
    try {
        assertPrivateDirectory(directory); chmodSync(directory, 0o755); assert.throws(() => assertPrivateDirectory(directory)); chmodSync(directory, 0o700);
        const target = path.join(directory, 'target.json'); writeFileSync(target, '{}', { flag: 'wx', mode: 0o600 });
        try { symlinkSync(target, full); assert.throws(() => safeEvidencePath(relative, true)); } finally { unlinkSync(full); }
        writeFileSync(full, '{}', { flag: 'wx', mode: 0o644 }); assert.throws(() => safeEvidencePath(relative, true)); chmodSync(full, 0o600); safeEvidencePath(relative, true); unlinkSync(full); unlinkSync(target);
    } finally { rmdirSync(directory); }
});
