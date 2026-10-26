import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { equal, seedRoles, validateSnapshot, validateStepResult } from './system-lease-model.mjs';
import { createSystemPermissionTieNormalizer } from './system-permission-tie.mjs';

const require = createRequire(import.meta.url);
const { steps, maxLeaseMs, uuid } = require('./system-lease-protocol.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const authority = JSON.parse(readFileSync(new URL('./roles-authority.json', import.meta.url), 'utf8'));
const timeKeys = new Set(['createdAt', 'updatedAt', 'created_at', 'updated_at', 'assigned_at', 'revoked_at', 'occurredAt', 'occurred_at', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'revokedAt', 'deadlineAt']);
function epoch(value) {
    assert.equal(typeof value, 'string');
    const time = Date.parse(value);
    assert(Number.isFinite(time), 'Valid timestamp required');
    return time;
}
function inRequest(value, row) {
    assert(epoch(value) >= epoch(row.startedAt) - 5 && epoch(value) <= epoch(row.finishedAt) + 5, row.step + ': changed timestamp outside the observed request');
}
function metadata(value, expected) {
    for (const [key, item] of Object.entries(expected)) assert.deepEqual(value[key], item);
}

export function normalizeSystemReport(run, backend) {
    assert.equal(run.formatVersion, 1);
    assert.equal(run.result, 'pass');
    assert.equal(run.backend, backend);
    assert(uuid.test(run.runId));
    assert.equal(run.serverStopped, true);
    assert.equal(run.zeroResidual.matched, 0);
    assert.equal(run.zeroResidual.changed, 0);
    assert(!run.restoreFailed && !run.cleanupFailed && !run.cleanupDeferredUntilSystemRestored);
    assert(!Object.hasOwn(run, 'failurePhase') && !Object.hasOwn(run, 'failureReason'));
    assert.equal(run.release.restored, true);
    assert.equal(run.release.completed, 22);
    assert.equal(run.finalJournal.state, 'restored');
    assert.equal(run.finalJournal.pending, null);
    assert.equal(run.finalJournal.completed.length, 22);
    assert.equal(run.finalJournal.backend, backend);
    assert.equal(run.finalJournal.sourceHead, '9734515f84ebe1a4833d207124adbfbe378f691f');
    assert.equal(run.finalJournal.runId, run.runId);
    assert.equal(run.finalJournal.leaseId, run.lease.leaseId);
    assert.equal(run.finalJournal.actorId, run.lease.actorId);
    assert.equal(epoch(run.finalJournal.deadlineAt) - epoch(run.finalJournal.createdAt), maxLeaseMs);
    assert(epoch(run.finalJournal.createdAt) >= epoch(run.startedAt) && epoch(run.finalJournal.createdAt) <= epoch(run.cases[0].startedAt));
    const matrix = [true, false].flatMap((due) => steps.map((step) => ({ step, due })));
    assert.deepEqual(
        run.cases.map(({ step, due }) => ({ step, due })),
        matrix
    );
    validateSnapshot(run.initial);
    validateSnapshot(run.finalJournal.base);
    validateSnapshot(run.finalJournal.authorized);
    assert(equal(run.initial, run.finalJournal.base), 'Restoration journal must retain the exact initial snapshot');
    const permissionTies = createSystemPermissionTieNormalizer(run);
    metadata(run.lease, { formatVersion: 1, backend, runId: run.runId, sequence: 0, action: 'acquire', event: 'ready', roles: seedRoles });
    metadata(run.release, { formatVersion: 1, backend, runId: run.runId, leaseId: run.lease.leaseId, sequence: 45, action: 'release', event: 'released' });
    const ids = new Map(),
        labels = new Map();
    function register(id, label) {
        assert(uuid.test(id), 'Only exact known UUIDs may be normalized');
        if (ids.has(id)) assert.equal(ids.get(id), label);
        if (labels.has(label)) assert.equal(labels.get(label), id);
        ids.set(id, label);
        labels.set(label, id);
    }
    const cleanRun = (value) => value.replaceAll(run.runId, '<run>').replaceAll(run.runId.replaceAll('-', ''), '<run-compact>');
    register(run.runId, 'run');
    register(run.lease.actorId, 'actor:admin');
    register(run.lease.leaseId, 'lease');
    for (const role of seedRoles) {
        const initial = run.initial.roles.find((item) => item.id === role.id);
        assert.equal(initial.role_key, role.key);
        register(role.id, 'system-role:' + role.key);
    }
    function fixedReference(value) {
        if (value !== null && !ids.has(value)) register(value, 'fixed-reference:' + value);
    }
    for (const role of run.initial.roles) for (const key of ['created_by', 'updated_by']) fixedReference(role[key]);
    for (const relation of [...run.initial.permissions, ...run.initial.userRoles]) {
        for (const key of ['assigned_by', 'created_by', 'revoked_by']) fixedReference(relation[key]);
        if (Object.hasOwn(relation, 'user_id')) fixedReference(relation.user_id);
    }
    function initialRelations(rows, type, field) {
        const groups = new Map();
        for (const row of rows) {
            const key = `${type}:${ids.get(row.role_id)}:${row[field]}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(row);
        }
        for (const [key, values] of groups) {
            values.sort((left, right) => (left.assigned_at < right.assigned_at ? -1 : left.assigned_at > right.assigned_at ? 1 : left.created_at < right.created_at ? -1 : left.created_at > right.created_at ? 1 : 0));
            for (let index = 0; index < values.length; index++) {
                if (index) assert(values[index].assigned_at !== values[index - 1].assigned_at || values[index].created_at !== values[index - 1].created_at, 'Ambiguous initial history generation is not normalization authority');
                register(values[index].id, `${key}:initial:${index}`);
            }
        }
    }
    initialRelations(run.initial.permissions, 'permission', 'permission_key');
    initialRelations(run.initial.userRoles, 'user-role', 'user_id');
    run.initial.audits.forEach((audit, index) => {
        fixedReference(audit.operator_id);
        register(audit.id, 'initial-audit:' + index);
    });
    let previous = run.initial;
    for (const [index, row] of run.cases.entries()) {
        validateSnapshot(row.systemBefore);
        validateSnapshot(row.systemAfter);
        assert(equal(row.systemBefore, previous), 'System state must continue exactly between acknowledged steps');
        assert(equal(row.systemAfter.catalog, run.initial.catalog));
        assert(equal(row.systemAfter.userRoles, run.initial.userRoles));
        const newAudits = row.systemAfter.audits.filter((item) => !row.systemBefore.audits.some((old) => old.id === item.id));
        assert.equal(newAudits.length, 1);
        register(newAudits[0].id, 'step-audit:' + index);
        for (const relation of row.systemAfter.permissions)
            if (!ids.has(relation.id)) {
                assert.equal(relation.assigned_by, run.lease.actorId);
                assert.equal(relation.created_by, run.lease.actorId);
                register(relation.id, `permission:${ids.get(relation.role_id)}:${relation.permission_key}:step:${index}`);
            }
        register(row.before.session.id, 'session:admin');
        assert.equal(row.after.session.id, row.before.session.id);
        assert.equal(row.before.securityEvents.length, 0);
        assert.equal(row.after.securityEvents.length, 0);
        previous = row.systemAfter;
    }
    assert(equal(previous, run.finalJournal.authorized), 'Final journal must retain the last complete system state');
    function normalize(value, key = '') {
        if (value === null) return null;
        if (timeKeys.has(key)) {
            epoch(value);
            return '<validated-time>';
        }
        if (Array.isArray(value)) return value.map((item) => normalize(item));
        if (typeof value === 'object') {
            const object = Object.hasOwn(value, 'id') && (Object.hasOwn(value, 'eventType') || Object.hasOwn(value, 'event_type')) ? permissionTies.normalizeAudit(value) : value;
            return Object.fromEntries(Object.entries(object).map(([name, item]) => [name, normalize(item, name)]));
        }
        if (typeof value !== 'string') return value;
        if (uuid.test(value)) {
            assert(ids.has(value), `Unknown UUID in ${key}`);
            return ids.get(value);
        }
        let result = cleanRun(value);
        for (const [id, label] of ids) result = result.replaceAll(id, `<${label}>`);
        return result;
    }
    function systemSnapshot(value) {
        const result = normalize(value);
        // capture() orders these database sets by random UUID. Their logical
        // history identity is registered above. Audit row order is retained;
        // the separate native-key proof admits only six before-key tie buckets.
        for (const key of ['permissions', 'userRoles']) result[key].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
        return result;
    }
    const ordinaryState = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id'));
    const cases = run.cases.map((row, index) => {
        metadata(row.plan, { formatVersion: 1, runId: run.runId, backend, leaseId: run.lease.leaseId, sequence: index * 2 + 1, action: 'before', event: 'step-ready', step: row.step });
        metadata(row.acknowledgement, { formatVersion: 1, runId: run.runId, backend, leaseId: run.lease.leaseId, sequence: index * 2 + 2, action: 'after', event: 'step-complete', step: row.step });
        const auditId = validateStepResult({ ...run.finalJournal, state: 'active', authorized: row.systemBefore, pending: { step: row.step, startedAt: row.startedAt } }, row.systemAfter, authority);
        assert.equal(row.acknowledgement.auditId, auditId);
        assert.equal(run.finalJournal.completed[index].auditId, auditId);
        assert.equal(run.finalJournal.completed[index].step, row.step);
        assert.equal(row.status, row.plan.expectedStatus);
        assert.equal(row.setCookieCount, 0);
        assert.equal(row.auditDelta, 1);
        assert.equal(row.sessionVersionDelta, row.due ? 2 : 0);
        assert.deepEqual(row.after.audits.slice(0, row.before.audits.length), row.before.audits);
        assert.equal(row.after.audits.length - row.before.audits.length, 1);
        assert.equal(row.after.audits.at(-1).id, auditId);
        assert.equal(row.after.audits.at(-1).operatorId, run.lease.actorId);
        assert.equal(row.after.audits.at(-1).requestId, null);
        inRequest(row.after.audits.at(-1).occurredAt, row);
        const rawAudit = row.systemAfter.audits.find((item) => item.id === auditId);
        inRequest(rawAudit.occurred_at, row);
        const temporal = {};
        for (const key of ['lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'updatedAt', 'revokedAt']) temporal['session:' + key + ':unchanged'] = row.before.session[key] === row.after.session[key];
        assert.equal(row.sessionVersionDelta, row.after.session.rowVersion - row.before.session.rowVersion);
        assert.equal(row.before.session.absoluteExpiresAt, row.after.session.absoluteExpiresAt);
        if (row.before.session.lastSeenAt !== row.after.session.lastSeenAt) {
            inRequest(row.after.session.lastSeenAt, row);
            assert.equal(epoch(row.after.session.idleExpiresAt), Math.min(epoch(row.after.session.lastSeenAt) + 900000, epoch(row.after.session.absoluteExpiresAt)));
        }
        if (row.before.session.updatedAt !== row.after.session.updatedAt) inRequest(row.after.session.updatedAt, row);
        for (const role of row.systemAfter.roles) {
            const old = row.systemBefore.roles.find((item) => item.id === role.id);
            assert.equal(role.created_at, old.created_at);
            temporal[role.role_key + ':updatedUnchanged'] = role.updated_at === old.updated_at;
            if (role.updated_at !== old.updated_at) inRequest(role.updated_at, row);
        }
        for (const relation of row.systemAfter.permissions) {
            const old = row.systemBefore.permissions.find((item) => item.id === relation.id);
            if (!old) for (const key of ['assigned_at', 'created_at']) inRequest(relation[key], row);
            if (relation.revoked_at !== null && old?.revoked_at !== relation.revoked_at) inRequest(relation.revoked_at, row);
        }
        if (row.status === 200) {
            const role = row.systemAfter.roles.find((item) => item.id === row.plan.roleId);
            assert.equal(row.response.id, role.id);
            for (const [wire, database] of [
                ['createdAt', 'created_at'],
                ['updatedAt', 'updated_at']
            ]) {
                assert.equal(new Date(row.response[wire]).toISOString(), row.response[wire]);
                assert.equal(epoch(row.response[wire]), epoch(role[database]));
            }
        }
        const plan = normalize(row.plan),
            acknowledgement = normalize(row.acknowledgement);
        plan.backend = '<backend>';
        acknowledgement.backend = '<backend>';
        return {
            step: row.step,
            due: row.due,
            plan,
            acknowledgement,
            status: row.status,
            response: normalize(row.response),
            setCookieCount: row.setCookieCount,
            auditDelta: row.auditDelta,
            sessionVersionDelta: row.sessionVersionDelta,
            sessionBefore: normalize(ordinaryState(row.before.session)),
            sessionAfter: normalize(ordinaryState(row.after.session)),
            auditsBefore: normalize(row.before.audits),
            auditsAfter: normalize(row.after.audits),
            systemBefore: systemSnapshot(row.systemBefore),
            systemAfter: systemSnapshot(row.systemAfter),
            temporal
        };
    });
    const finalJournal = { ...normalize(run.finalJournal), backend: '<backend>', base: systemSnapshot(run.finalJournal.base), authorized: systemSnapshot(run.finalJournal.authorized) };
    return { initial: systemSnapshot(run.initial), permissionTiePartitions: permissionTies.evidence().partitionShapes, cases, finalJournal, release: { ...normalize(run.release), backend: '<backend>' } };
}

function difference(left, right, location = '$') {
    if (isDeepStrictEqual(left, right)) return null;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return { path: location, nest: left, rust: right };
    for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) return { path: location + '.' + key, nestHasField: Object.hasOwn(left, key), rustHasField: Object.hasOwn(right, key) };
        const found = difference(left[key], right[key], location + '.' + key);
        if (found) return found;
    }
    return { path: location, nest: left, rust: right };
}
export function compareSystemReports(nest, rust) {
    assert.deepEqual(nest.sourceFiles, rust.sourceFiles, 'The same final frozen system harness must be used');
    const left = normalizeSystemReport(nest, 'nest'),
        right = normalizeSystemReport(rust, 'rust');
    const comparisons = [
        { id: 'initial', left: left.initial, right: right.initial },
        { id: 'permission-before-native-sort-buckets', left: left.permissionTiePartitions, right: right.permissionTiePartitions },
        ...left.cases.map((row, index) => ({ id: row.step + ':' + row.due, left: row, right: right.cases[index] })),
        { id: 'final-journal', left: left.finalJournal, right: right.finalJournal },
        { id: 'release', left: left.release, right: right.release }
    ].map(({ id, left: first, right: second }) => {
        const found = difference(first, second);
        return { id, result: found ? 'fail' : 'pass', ...(found ? { difference: found } : {}) };
    });
    return {
        formatVersion: 1,
        result: comparisons.every((row) => row.result === 'pass') ? 'pass' : 'fail',
        comparedCases: 22,
        normalization:
            'Only fixed/known fixture and history-generation UUIDs plus checked timestamps. Initial/complete system columns and catalog retained; observer UUID order only removed from database relation sets. Only six exact permission-step audit beforeSnapshot.permissionKeys pair within complete native assigned_at/created_at microsecond tie buckets; their complete partition shapes remain compared. afterSnapshot request Set order, every other audit field and all audit-row/API arrays retain order.',
        permissionTiePartitions: { nest: left.permissionTiePartitions, rust: right.permissionTiePartitions },
        comparisons
    };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert.equal(process.argv.length, 2);
    const inputs = ['nest', 'rust'].map((backend) => {
        const file = `tmp/rust-r2b/system-${backend}.json`,
            bytes = readFileSync(path.join(root, file));
        return { file, sha256: createHash('sha256').update(bytes).digest('hex'), value: JSON.parse(bytes) };
    });
    let report;
    try {
        report = compareSystemReports(inputs[0].value, inputs[1].value);
    } catch (error) {
        report = { formatVersion: 1, result: 'fail', failureType: 'invalid-evidence', failureReason: error.name };
    }
    report.inputs = inputs.map(({ file, sha256 }) => ({ file, sha256 }));
    writeFileSync(path.join(root, 'tmp/rust-r2b/system-comparison.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    if (report.result !== 'pass') process.exitCode = 1;
    console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, failed: report.comparisons?.filter((row) => row.result === 'fail').map((row) => row.id), failureType: report.failureType }));
}
