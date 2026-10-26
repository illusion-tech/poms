import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createSeedRoleTieNormalizer, seedTieInputFiles } from './seed-role-tie.mjs';

const require = createRequire(import.meta.url);
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const expectedCases = [
    ['role-cas-after-independent-read', 1, [500], 0, 0, 1],
    ['duplicate-key-after-both-prechecks', 2, [201, 500], 1, 0, null],
    ['permission-partial-unique-race', 2, [200, 500], 1, 0, 0],
    ['late-session-cas-rolls-back-role-insert', 1, [500], 0, 2, null],
    ['assigned-role-early-snapshot-get', 1, [200], 0, 1, null],
    ['assigned-role-list-null-hydration', 1, [200], 0, 1, null]
];
const timeKeys = new Set(['createdAt', 'updatedAt', 'created_at', 'updated_at', 'assigned_at', 'revoked_at', 'occurredAt', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'revokedAt']);
function epoch(value) {
    assert.equal(typeof value, 'string');
    const result = Date.parse(value);
    assert(Number.isFinite(result), 'A valid timestamp is required');
    return result;
}
function requestTime(value, row) {
    assert(epoch(value) >= epoch(row.startedAt) - 5 && epoch(value) <= epoch(row.finishedAt) + 5, row.id + ': timestamp outside the observed request');
}

export function normalizeConcurrencyReport(run, backend, seedTie = null) {
    assert.equal(run.formatVersion, 1);
    assert.equal(run.result, 'observed');
    assert.equal(run.backend, backend);
    assert.equal(run.platform, 'linux');
    assert(uuid.test(run.runId));
    assert.equal(run.serverStopped, true);
    assert.equal(run.zeroResidual.matched, 0);
    assert.equal(run.zeroResidual.changed, 0);
    assert.deepEqual(
        run.cases.map((row) => row.id),
        expectedCases.map(([id]) => id)
    );
    const ids = new Map(),
        labels = new Map();
    const cleanRun = (value) => value.replaceAll(run.runId, '<run>').replaceAll(run.runId.replaceAll('-', ''), '<run-compact>');
    function register(id, label) {
        assert(uuid.test(id), 'Only canonical known UUIDs may be registered');
        if (ids.has(id)) assert.equal(ids.get(id), label, 'One UUID cannot name two entities');
        if (labels.has(label)) assert.equal(labels.get(label), id, 'Two UUIDs cannot name the same entity');
        ids.set(id, label);
        labels.set(label, id);
    }
    register(run.identities.admin, 'actor:admin');
    register(run.identities.adminRole, 'role:r2b_admin_<run>');
    for (const [slot, id] of Object.entries(run.identities.roles)) register(id, 'role:' + cleanRun(roleFixtureSpec(run.runId, slot).databaseKey));
    const permissions = new Map();
    for (const row of run.cases) {
        register(row.before.session.id, 'session:admin');
        assert.equal(row.after.session.id, row.before.session.id);
        for (const response of row.responses) {
            const summaries = Array.isArray(response.body) ? response.body : [response.body];
            for (const role of summaries)
                if (role && Object.hasOwn(role, 'roleKey')) {
                    if (ids.has(role.id)) assert.equal(ids.get(role.id), 'role:' + cleanRun(role.roleKey));
                    else if (role.roleKey === `r2b_viewer_${run.runId}`) register(role.id, 'role:r2b_viewer_<run>');
                    else register(role.id, 'fixed-role:' + role.id);
                }
        }
        for (const snapshot of [row.roleBefore, row.roleAfter].filter(Boolean)) {
            assert.equal(ids.get(snapshot.role.id), 'role:' + cleanRun(snapshot.role.role_key));
            for (const relation of snapshot.permissions)
                if (!ids.has(relation.id)) {
                    const base = `permission:${ids.get(relation.role_id)}:${relation.permission_key}`;
                    assert(!base.includes('undefined'));
                    const ordinal = (permissions.get(base) ?? 0) + 1;
                    permissions.set(base, ordinal);
                    register(relation.id, `${base}:${ordinal}`);
                }
            assert.equal(snapshot.users.length, 0, 'The six race fixtures do not assign their created target roles');
        }
        for (const snapshot of [row.before, row.after]) {
            snapshot.audits.forEach((audit, index) => register(audit.id, `audit:${index}`));
            assert.equal(snapshot.securityEvents.length, 0, 'These authenticated races do not produce security events');
        }
    }
    function normalize(value, key = '') {
        if (value === null) return null;
        if (timeKeys.has(key)) {
            epoch(value);
            return '<validated-time>';
        }
        if (Array.isArray(value)) return value.map((item) => normalize(item));
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, normalize(item, name)]));
        if (typeof value !== 'string') return value;
        if (uuid.test(value)) {
            assert(ids.has(value), `Unknown UUID in ${key}`);
            return ids.get(value);
        }
        let result = cleanRun(value);
        for (const [id, label] of ids) result = result.replaceAll(id, `<${label}>`);
        return result;
    }
    function databaseSnapshot(value) {
        const normalized = normalize(value);
        // Only database relation sets have an observer UUID tie-break. HTTP
        // lists, response permission arrays and audit arrays retain their order.
        if (normalized) for (const key of ['permissions', 'users']) normalized[key].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
        return normalized;
    }
    return run.cases.map((row, index) => {
        const [, blockedCount, statuses, auditDelta, sessionDelta, roleDelta] = expectedCases[index];
        assert.equal(row.blockedCount, blockedCount);
        assert.deepEqual(row.statuses, statuses);
        assert.deepEqual(
            row.responses.map((response) => response.status).sort((a, b) => a - b),
            statuses
        );
        assert.equal(row.auditDelta, auditDelta);
        assert.equal(row.sessionVersionDelta, sessionDelta);
        assert.equal(row.roleVersionDelta, roleDelta);
        assert.equal(row.after.session.rowVersion - row.before.session.rowVersion, sessionDelta);
        assert.deepEqual(row.after.audits.slice(0, row.before.audits.length), row.before.audits, row.id + ': prior audits changed');
        const audits = row.after.audits.slice(row.before.audits.length);
        assert.equal(audits.length, auditDelta);
        for (const audit of audits) {
            assert.equal(audit.operatorId, run.identities.admin);
            assert.equal(audit.targetType, 'PlatformRole');
            assert.equal(audit.requestId, null);
            requestTime(audit.occurredAt, row);
        }
        const temporal = {};
        for (const key of ['lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'updatedAt', 'revokedAt']) temporal['session:' + key + ':unchanged'] = row.before.session[key] === row.after.session[key];
        assert.equal(row.before.session.absoluteExpiresAt, row.after.session.absoluteExpiresAt);
        if (!temporal['session:lastSeenAt:unchanged']) {
            requestTime(row.after.session.lastSeenAt, row);
            assert.equal(epoch(row.after.session.idleExpiresAt), Math.min(epoch(row.after.session.lastSeenAt) + 900000, epoch(row.after.session.absoluteExpiresAt)));
        }
        if (!temporal['session:updatedAt:unchanged']) requestTime(row.after.session.updatedAt, row);
        if (row.roleAfter) {
            if (row.roleBefore) {
                assert.equal(row.roleAfter.role.row_version - row.roleBefore.role.row_version, roleDelta);
                assert.equal(row.roleBefore.role.created_at, row.roleAfter.role.created_at);
                temporal.roleUpdatedUnchanged = row.roleBefore.role.updated_at === row.roleAfter.role.updated_at;
                if (!temporal.roleUpdatedUnchanged) requestTime(row.roleAfter.role.updated_at, row);
                for (const prior of row.roleBefore.permissions)
                    assert.deepEqual(
                        row.roleAfter.permissions.find((item) => item.id === prior.id),
                        prior
                    );
            } else for (const key of ['created_at', 'updated_at']) requestTime(row.roleAfter.role[key], row);
            const previousIds = new Set((row.roleBefore?.permissions ?? []).map((item) => item.id));
            for (const relation of row.roleAfter.permissions) if (!previousIds.has(relation.id)) for (const key of ['created_at', 'assigned_at']) requestTime(relation[key], row);
        }
        if (index === 0) assert.equal(row.roleAfter.role.name, 'R2B concurrent winner');
        if (index === 3) assert.equal(row.roleAfter, null, 'Late session CAS must roll back the inserted role');
        for (const response of row.responses) {
            assert.equal(response.setCookieCount, 0);
            const summaries = Array.isArray(response.body) ? response.body : [response.body];
            for (const role of summaries)
                if (role && Object.hasOwn(role, 'roleKey')) {
                    for (const key of ['createdAt', 'updatedAt']) assert.equal(new Date(role[key]).toISOString(), role[key]);
                    if (row.roleAfter && role.id === row.roleAfter.role.id) {
                        assert.equal(epoch(role.createdAt), epoch(row.roleAfter.role.created_at));
                        assert.equal(epoch(role.updatedAt), epoch(row.roleAfter.role.updated_at));
                    }
                }
        }
        if (index === 4) assert.equal(row.responses[0].body.id, run.identities.adminRole);
        if (index === 5) {
            assert(Array.isArray(row.responses[0].body), 'The complete raw role list must remain present');
            assert.deepEqual(
                row.actorRoleResponse,
                row.responses[0].body.find((role) => role.id === run.identities.adminRole)
            );
            requestTime(row.actorRoleResponse.updatedAt, row);
        }
        const sessionState = (session) => Object.fromEntries(Object.entries(session).filter(([key]) => key !== 'id'));
        const sessionBefore = sessionState(row.before.session),
            sessionAfter = sessionState(row.after.session);
        // Concurrent response completion order is nondeterministic. Status is
        // unique within each two-request case, so preserve each full body while
        // pairing the winner and loser by status rather than request arrival.
        const responses = row.responses
            .map((response) => normalize(seedTie && index === 5 ? { ...response, body: seedTie.normalizeList(response.body, { kind: 'concurrency', backend, report: run, caseId: row.id }) } : response))
            .sort((left, right) => left.status - right.status);
        return {
            id: row.id,
            due: row.due,
            blockedCount,
            statuses: row.statuses,
            responses,
            auditDelta,
            sessionVersionDelta: sessionDelta,
            roleVersionDelta: roleDelta,
            sessionBefore: normalize(sessionBefore),
            sessionAfter: normalize(sessionAfter),
            auditsBefore: normalize(row.before.audits),
            auditsAfter: normalize(row.after.audits),
            roleBefore: databaseSnapshot(row.roleBefore),
            roleAfter: databaseSnapshot(row.roleAfter),
            ...(Object.hasOwn(row, 'actorRoleResponse') ? { actorRoleResponse: normalize(row.actorRoleResponse) } : {}),
            temporal
        };
    });
}

function firstDifference(left, right, location = '$') {
    if (isDeepStrictEqual(left, right)) return null;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return { path: location, nest: left, rust: right };
    const names = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of names) {
        if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) return { path: location + '.' + key, nestHasField: Object.hasOwn(left, key), rustHasField: Object.hasOwn(right, key) };
        const difference = firstDifference(left[key], right[key], location + '.' + key);
        if (difference) return difference;
    }
    return { path: location, nest: left, rust: right };
}

export function compareConcurrencyReports(nest, rust, { seedTie = null } = {}) {
    assert.deepEqual(nest.sourceFiles, rust.sourceFiles, 'Both backends must use the same frozen concurrency harness');
    const left = normalizeConcurrencyReport(nest, 'nest', seedTie),
        right = normalizeConcurrencyReport(rust, 'rust', seedTie);
    const comparisons = left.map((row, index) => {
        const difference = firstDifference(row, right[index]);
        return { id: row.id, result: difference ? 'fail' : 'pass', ...(difference ? { difference } : {}) };
    });
    return {
        formatVersion: 1,
        result: comparisons.every((row) => row.result === 'pass') ? 'pass' : 'fail',
        platform: 'linux',
        comparedCases: comparisons.length,
        normalization:
            'Only known run/fixture UUIDs and checked timestamps; fixed seeded UUIDs retained, database relation sets sorted, full HTTP lists/audit arrays preserved, unique-status concurrent responses paired.' +
            (seedTie
                ? ' The explicitly bound proof permits pairing only the first fifteen fixed seed roles by ID after exact SQL microsecond sort keys and response created/updated times are verified; full member objects and all later list positions remain compared.'
                : ''),
        comparisons
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert([2, 4].includes(process.argv.length));
    const inputs = ['nest', 'rust'].map((backend) => {
        const file = `tmp/rust-r2b/concurrency-${backend}.json`,
            bytes = readFileSync(path.join(root, file));
        return { file, sha256: createHash('sha256').update(bytes).digest('hex'), value: JSON.parse(bytes) };
    });
    let report;
    try {
        let seedTie = null;
        let seedTieProof = null;
        if (process.argv.length === 4) {
            assert.equal(process.argv[2], '--seed-tie-proof');
            const file = process.argv[3];
            assert(/^tmp\/rust-r2b\/sort-keys-[0-9a-f-]{36}\.json$/.test(file));
            const bytes = readFileSync(path.join(root, file));
            const proof = JSON.parse(bytes);
            seedTie = createSeedRoleTieNormalizer(
                proof,
                seedTieInputFiles.map(({ file: input }) => ({ file: input, bytes: readFileSync(path.join(root, input)) }))
            );
            seedTieProof = { file, sha256: createHash('sha256').update(bytes).digest('hex'), receiptId: proof.receiptId };
        }
        report = compareConcurrencyReports(inputs[0].value, inputs[1].value, { seedTie });
        if (seedTieProof) report.seedTieProof = seedTieProof;
    } catch (error) {
        report = { formatVersion: 1, result: 'fail', platform: 'linux', failureType: 'invalid-evidence', failureReason: error.name };
    }
    report.inputs = inputs.map(({ file, sha256 }) => ({ file, sha256 }));
    writeFileSync(path.join(root, 'tmp/rust-r2b/concurrency-comparison-linux.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (report.result !== 'pass') process.exitCode = 1;
    console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, failedCases: report.comparisons?.filter((row) => row.result === 'fail').map((row) => row.id), failureType: report.failureType }));
}
