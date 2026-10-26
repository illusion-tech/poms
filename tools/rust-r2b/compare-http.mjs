import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createForbiddenPermissionNormalizer } from './forbidden-permission-set.mjs';
import { createSeedRoleTieNormalizer, seedTieInputFiles } from './seed-role-tie.mjs';

assert([3, 5].includes(process.argv.length));
const platform = process.argv[2];
assert(['linux', 'win32'].includes(platform));
const root = path.resolve(import.meta.dirname, '../..');
const inputs = ['nest', 'rust'].map((backend) => {
    const file = `tmp/rust-r2b/http-${platform}-${backend}.json`;
    const bytes = readFileSync(path.join(root, file));
    const value = JSON.parse(bytes);
    assert.equal(value.result, 'pass');
    assert.equal(value.backend, backend);
    assert.equal(value.platform, platform);
    assert.equal(value.serverStopped, true);
    assert.equal(value.zeroResidual.matched, 0);
    assert.equal(value.zeroResidual.changed, 0);
    assert.equal(value.observations.length, 179);
    assert.equal(new Set(value.observations.map((row) => row.id)).size, value.observations.length);
    return { file, sha256: createHash('sha256').update(bytes).digest('hex'), value };
});
const [nest, rust] = inputs.map((input) => input.value);
let seedTie = null;
let seedTieProof = null;
if (process.argv.length === 5) {
    assert.equal(platform, 'linux');
    assert.equal(process.argv[3], '--seed-tie-proof');
    const file = process.argv[4];
    assert(/^tmp\/rust-r2b\/sort-keys-[0-9a-f-]{36}\.json$/.test(file));
    const bytes = readFileSync(path.join(root, file));
    const proof = JSON.parse(bytes);
    seedTie = createSeedRoleTieNormalizer(
        proof,
        seedTieInputFiles.map(({ file: input }) => ({ file: input, bytes: readFileSync(path.join(root, input)) }))
    );
    seedTieProof = { file, sha256: createHash('sha256').update(bytes).digest('hex'), receiptId: proof.receiptId };
}
assert.deepEqual(nest.sourceFiles, rust.sourceFiles, 'Both backends must use the same frozen harness');
assert.deepEqual(
    nest.observations.map((row) => row.id),
    rust.observations.map((row) => row.id)
);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const timeKeys = new Set(['createdAt', 'updatedAt', 'created_at', 'updated_at', 'assigned_at', 'revoked_at', 'occurredAt', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'revokedAt']);
const epoch = (value) => {
    assert.equal(typeof value, 'string');
    const time = Date.parse(value);
    assert(Number.isFinite(time), 'Valid timestamp required');
    return time;
};

function normalizeRun(run) {
    const forbiddenPermissions = createForbiddenPermissionNormalizer(run);
    const ids = new Map();
    const cleanRun = (value) => value.replaceAll(run.runId, '<run>').replaceAll(run.runId.replaceAll('-', ''), '<run-compact>');
    const register = (id, label) => {
        assert(uuid.test(id));
        if (ids.has(id)) assert.equal(ids.get(id), label);
        else ids.set(id, label);
    };
    register(run.identities.admin, 'actor:admin');
    register(run.identities.viewer, 'actor:viewer');
    register(run.identities.adminRole, 'role:' + cleanRun(`r2b_admin_${run.runId}`));
    for (const role of run.identities.listRoles) register(role.id, 'role:' + cleanRun(role.roleKey));
    const assignmentCounts = new Map();
    for (const row of run.observations) {
        register(row.before.session.id, 'session:admin');
        assert.equal(row.before.session.id, row.after.session.id);
        for (const snapshot of [row.roleBefore, row.roleAfter].filter(Boolean)) {
            register(snapshot.role.id, 'role:' + cleanRun(snapshot.role.role_key));
            for (const [type, relations] of [
                ['permission', snapshot.permissions],
                ['user-role', snapshot.users]
            ]) {
                for (const relation of relations)
                    if (!ids.has(relation.id)) {
                        const base = `${type}:${ids.get(relation.role_id)}:${relation.permission_key ?? ids.get(relation.user_id)}`;
                        assert(!base.includes('undefined'));
                        const ordinal = (assignmentCounts.get(base) ?? 0) + 1;
                        assignmentCounts.set(base, ordinal);
                        register(relation.id, `${base}:${ordinal}`);
                    }
            }
        }
        row.after.audits.forEach((audit, index) => register(audit.id, `audit:${index}`));
        row.after.securityEvents.forEach((event, index) => register(event.id, `security-event:${index}`));
    }
    function normalize(value, key = '') {
        if (value === null) return null;
        if (timeKeys.has(key)) {
            epoch(value);
            return '<valid-time>';
        }
        if (Array.isArray(value)) return value.map((item) => normalize(item));
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
        if (typeof value !== 'string') return value;
        if (uuid.test(value)) {
            assert(ids.has(value), `Unrecognized UUID in ${key}`);
            return ids.get(value);
        }
        let result = cleanRun(value);
        for (const [id, label] of ids) result = result.replaceAll(id, `<${label}>`);
        return result;
    }
    const normalizeSnapshot = (value) => {
        const result = normalize(value);
        // These are database relation sets. Their observer uses UUID as a tie
        // breaker; response and audit permission arrays retain source ordering.
        if (result) for (const key of ['permissions', 'users']) result[key].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        return result;
    };
    return run.observations.map((row) => {
        const inRequest = (value) => assert(epoch(value) >= epoch(row.startedAt) - 5 && epoch(value) <= epoch(row.finishedAt) + 5, row.id + ': changed time must belong to request');
        assert.deepEqual(row.after.audits.slice(0, row.before.audits.length), row.before.audits, row.id + ': prior audit rows immutable');
        const audits = row.after.audits.slice(row.before.audits.length);
        assert.equal(audits.length, row.auditDelta);
        for (const audit of audits) {
            assert.equal(audit.operatorId, run.identities.admin);
            assert.equal(audit.requestId, null);
            assert.equal(audit.targetType, 'PlatformRole');
            inRequest(audit.occurredAt);
        }
        const temporal = {};
        for (const field of ['lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'updatedAt', 'revokedAt']) temporal['session:' + field + ':unchanged'] = row.before.session[field] === row.after.session[field];
        assert.equal(row.before.session.absoluteExpiresAt, row.after.session.absoluteExpiresAt);
        if (row.before.session.lastSeenAt !== row.after.session.lastSeenAt) {
            inRequest(row.after.session.lastSeenAt);
            assert.equal(epoch(row.after.session.idleExpiresAt), Math.min(epoch(row.after.session.lastSeenAt) + 900000, epoch(row.after.session.absoluteExpiresAt)));
        }
        if (row.before.session.updatedAt !== row.after.session.updatedAt) inRequest(row.after.session.updatedAt);
        if (row.roleAfter) {
            if (!row.roleBefore) for (const key of ['created_at', 'updated_at']) inRequest(row.roleAfter.role[key]);
            else if (row.roleBefore.role.updated_at !== row.roleAfter.role.updated_at) inRequest(row.roleAfter.role.updated_at);
            const prior = new Map([...(row.roleBefore?.permissions ?? []), ...(row.roleBefore?.users ?? [])].map((item) => [item.id, item]));
            for (const relation of [...row.roleAfter.permissions, ...row.roleAfter.users]) {
                if (!prior.has(relation.id)) for (const key of ['assigned_at', 'created_at']) inRequest(relation[key]);
                if (relation.revoked_at !== null && prior.get(relation.id)?.revoked_at !== relation.revoked_at) inRequest(relation.revoked_at);
            }
        }
        if (row.roleBefore && row.roleAfter) {
            assert.equal(row.roleBefore.role.created_at, row.roleAfter.role.created_at);
            temporal.roleUpdatedUnchanged = row.roleBefore.role.updated_at === row.roleAfter.role.updated_at;
            for (const before of [...row.roleBefore.permissions, ...row.roleBefore.users]) {
                const after = [...row.roleAfter.permissions, ...row.roleAfter.users].find((item) => item.id === before.id);
                assert(after, row.id + ': assignment history must remain');
                for (const key of ['created_at', 'assigned_at', 'created_by', 'assigned_by']) assert.equal(after[key], before[key]);
                if (before.status === 'revoked') assert.deepEqual(after, before, row.id + ': revoked history immutable');
            }
        }
        const body = row.response;
        if (Array.isArray(body)) for (const item of body) if (item && Object.hasOwn(item, 'roleKey')) for (const key of ['createdAt', 'updatedAt']) assert.equal(new Date(item[key]).toISOString(), item[key]);
        if (body && !Array.isArray(body) && typeof body === 'object' && Object.hasOwn(body, 'roleKey') && row.roleAfter) {
            assert.equal(body.id, row.roleAfter.role.id);
            for (const [wire, db] of [
                ['createdAt', 'created_at'],
                ['updatedAt', 'updated_at']
            ]) {
                assert.equal(new Date(body[wire]).toISOString(), body[wire]);
                assert.equal(epoch(body[wire]), epoch(row.roleAfter.role[db]));
            }
        }
        const sessionState = (session) => Object.fromEntries(Object.entries(session).filter(([key]) => key !== 'id'));
        return {
            id: row.id,
            method: row.method,
            route: normalize(row.route),
            due: row.due,
            status: row.status,
            response: normalize(seedTie && row.id === 'role-list-includes-inactive' ? seedTie.normalizeList(body, { kind: 'http', backend: run.backend, report: run, caseId: row.id }) : body),
            setCookieCount: row.setCookieCount,
            auditDelta: row.auditDelta,
            sessionVersionDelta: row.sessionVersionDelta,
            roleVersionDelta: row.roleVersionDelta,
            sessionBefore: normalize(sessionState(row.before.session)),
            sessionAfter: normalize(sessionState(row.after.session)),
            roleBefore: normalizeSnapshot(row.roleBefore),
            roleAfter: normalizeSnapshot(row.roleAfter),
            audits: normalize(audits),
            securityBefore: normalize(forbiddenPermissions.normalizeEvents(row.before.securityEvents)),
            securityAfter: normalize(forbiddenPermissions.normalizeEvents(row.after.securityEvents)),
            temporal
        };
    });
}
const normalized = inputs.map(({ value }) => normalizeRun(value));
const comparisons = normalized[0].map((left, index) => {
    assert.deepEqual(normalized[1][index], left, left.id + ': complete response, persistence, audit and session semantics');
    return { id: left.id, status: left.status, result: 'pass' };
});
const report = {
    formatVersion: 1,
    result: 'pass',
    platform,
    comparedCases: comparisons.length,
    inputs: inputs.map(({ file, sha256 }) => ({ file, sha256 })),
    normalization:
        'Known run IDs, registered entity UUIDs and validated time instants only; timestamp equality, row history, actor and temporal bounds checked separately. Only the eight exact forbidden-case security events compare their verified unique four-member details.userPermissions union as a set; requiredPermissions and other arrays retain order.' +
        (seedTie
            ? ' The explicitly bound proof permits pairing only the first fifteen fixed seed roles by ID after exact SQL microsecond sort keys and response created/updated times are verified; all full objects and remaining array positions are retained.'
            : ''),
    ...(seedTieProof ? { seedTieProof } : {}),
    comparisons
};
writeFileSync(path.join(root, `tmp/rust-r2b/http-comparison-${platform}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ result: 'pass', platform, comparedCases: comparisons.length }));
