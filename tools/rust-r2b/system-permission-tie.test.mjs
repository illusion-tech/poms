import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createSystemPermissionTieNormalizer, permissionTimestampMicroseconds } from './system-permission-tie.mjs';
import { seedRoles } from './system-lease-model.mjs';

const require = createRequire(import.meta.url);
const { steps } = require('./system-lease-protocol.cjs');
const id = (value) => '70000000-0000-4000-8000-' + String(value).padStart(12, '0');
const actorId = id(1);
const time = '2026-10-27T01:00:00.123456+08:00';
const permissionSteps = new Set(['admin-retain-all', 'viewer-minimum-only', 'viewer-readd-original']);
const keys = ['b', 'a', 'd', 'c'];

// These self-contained fixtures prove only the helper contract. They are never
// execution evidence for an HTTP backend, a system lease or PostgreSQL.
function synthetic({ allTie = false } = {}) {
    const roles = seedRoles.map(({ id: roleId, key }) => ({
        id: roleId,
        role_key: key,
        name: key,
        description: null,
        display_order: 0,
        is_active: true,
        is_system_role: true,
        row_version: 1,
        created_at: time,
        updated_at: time,
        created_by: null,
        updated_by: null
    }));
    const run = { formatVersion: 1, backend: 'nest', result: 'pass', runId: id(2), lease: { actorId }, cases: [] };
    const rawAudits = [];
    const wireAudits = [];
    for (const [index, item] of [true, false].flatMap((due) => steps.map((step) => ({ step, due }))).entries()) {
        const row = { ...item, before: { audits: structuredClone(wireAudits) }, after: { audits: structuredClone(wireAudits) } };
        run.cases.push(row);
        if (!permissionSteps.has(row.step)) continue;
        const roleId = seedRoles[row.step.startsWith('admin-') ? 0 : 1].id;
        const permissions = keys.map((key, keyIndex) => ({
            id: id(100 + index * 10 + keyIndex),
            role_id: roleId,
            permission_key: key,
            status: 'active',
            assigned_at: time,
            created_at: allTie || keyIndex < 2 ? time : '2026-10-27T01:00:00.123457+08:00',
            assigned_by: null,
            created_by: null,
            revoked_at: null,
            revoked_by: null,
            change_reason: null
        }));
        row.plan = { roleId, eventType: 'platform.role.permissions.replaced', expectedStatus: 200, request: { method: 'PUT', path: '/api/platform/roles/' + roleId + '/permissions', body: { permissionKeys: ['c', 'b', 'c', 'a', 'd'] } } };
        row.status = 200;
        row.systemBefore = { roles: structuredClone(roles), permissions, userRoles: [], catalog: [], audits: structuredClone(rawAudits) };
        const raw = {
            id: id(1000 + index),
            event_type: 'platform.role.permissions.replaced',
            target_type: 'PlatformRole',
            target_id: roleId,
            operator_id: actorId,
            request_id: null,
            result: 'success',
            reason: null,
            before_snapshot: { permissionKeys: [...keys] },
            after_snapshot: { permissionKeys: ['c', 'b', 'a', 'd'] },
            metadata: null,
            occurred_at: time
        };
        const wire = {
            id: raw.id,
            eventType: raw.event_type,
            targetType: raw.target_type,
            targetId: raw.target_id,
            operatorId: raw.operator_id,
            requestId: raw.request_id,
            result: raw.result,
            reason: raw.reason,
            beforeSnapshot: structuredClone(raw.before_snapshot),
            afterSnapshot: structuredClone(raw.after_snapshot),
            metadata: raw.metadata,
            occurredAt: '2026-10-26T17:00:00.123Z'
        };
        rawAudits.push(raw);
        wireAudits.push(wire);
        row.systemAfter = { ...structuredClone(row.systemBefore), audits: structuredClone(rawAudits) };
        row.after.audits = structuredClone(wireAudits);
        row.acknowledgement = { auditId: raw.id };
    }
    run.finalJournal = { base: { audits: [] }, authorized: { audits: structuredClone(rawAudits) } };
    return run;
}

function first(run) {
    const row = run.cases.find((item) => permissionSteps.has(item.step));
    return { row, raw: row.systemAfter.audits.at(-1), wire: row.after.audits.at(-1) };
}

function rewriteAuditBefore(value, auditId, permissionKeys) {
    if (!value || typeof value !== 'object') return;
    if (value.id === auditId) {
        if (value.before_snapshot) value.before_snapshot.permissionKeys = [...permissionKeys];
        if (value.beforeSnapshot) value.beforeSnapshot.permissionKeys = [...permissionKeys];
    }
    for (const item of Object.values(value)) rewriteAuditBefore(item, auditId, permissionKeys);
}

test('native timestamp parsing retains one microsecond and requires an offset', () => {
    assert.equal(permissionTimestampMicroseconds(time) + 1n, permissionTimestampMicroseconds('2026-10-27T01:00:00.123457+08:00'));
    assert.equal(permissionTimestampMicroseconds(time), permissionTimestampMicroseconds('2026-10-26T17:00:00.123456Z'));
    for (const value of ['2026-10-27T01:00:00.123456', '2026-10-27T01:00:00.1234567Z', 'bad', 1]) assert.throws(() => permissionTimestampMicroseconds(value));
});

test('only complete native tie buckets change in six registered raw and wire audits', () => {
    const run = synthetic();
    const original = structuredClone(run);
    const normalizer = createSystemPermissionTieNormalizer(run);
    const { raw, wire } = first(run);
    const rawResult = normalizer.normalizeAudit(raw);
    const wireResult = normalizer.normalizeAudit(wire);
    assert.deepEqual(rawResult, { ...raw, before_snapshot: { permissionKeys: ['a', 'b', 'c', 'd'] } });
    assert.deepEqual(wireResult, { ...wire, beforeSnapshot: { permissionKeys: ['a', 'b', 'c', 'd'] } });
    assert.deepEqual(wireResult.afterSnapshot.permissionKeys, ['c', 'b', 'a', 'd']);
    assert.equal(normalizer.evidence().partitionShapes.length, 6);
    assert.deepEqual(
        normalizer.evidence().partitionShapes[0].buckets.map((bucket) => bucket.size),
        [2, 2]
    );
    assert.deepEqual(run, original);
});

test('different full-microsecond partitions remain a separately compared difference', () => {
    const split = createSystemPermissionTieNormalizer(synthetic());
    const joined = createSystemPermissionTieNormalizer(synthetic({ allTie: true }));
    assert.deepEqual(split.normalizeAudit(first(synthetic()).wire), joined.normalizeAudit(first(synthetic({ allTie: true })).wire));
    assert.throws(() => assert.deepEqual(split.evidence().partitionShapes, joined.evidence().partitionShapes));
});

test('the helper requires the complete fixed step and due matrix', () => {
    for (const mutate of [(run) => run.cases.pop(), (run) => (run.cases[8].step = 'unregistered'), (run) => (run.cases[8].due = false), (run) => (run.result = 'observed'), (run) => (run.backend = 'other')]) {
        const run = synthetic();
        mutate(run);
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('a key moved across native SQL buckets is rejected', () => {
    const run = synthetic();
    const { raw } = first(run);
    // Keep raw, wire and every later immutable copy mutually consistent so the
    // rejection must come from the actual native bucket membership guard.
    rewriteAuditBefore(run, raw.id, ['d', 'a', 'b', 'c']);
    assert.throws(() => createSystemPermissionTieNormalizer(run), /Only a complete contiguous native SQL tie bucket/);
});

test('missing, duplicate and extra before keys are rejected', () => {
    for (const value of [
        ['b', 'a', 'd'],
        ['b', 'a', 'd', 'd'],
        ['b', 'a', 'd', 'c', 'extra']
    ]) {
        const run = synthetic();
        first(run).raw.before_snapshot.permissionKeys = value;
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('duplicate active rows and ambiguous relation identity are rejected', () => {
    for (const mutate of [(rows) => (rows[1].permission_key = rows[0].permission_key), (rows) => (rows[1].id = rows[0].id)]) {
        const run = synthetic();
        mutate(first(run).row.systemBefore.permissions);
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('actor, target and the entire audit schema are checked before registration', () => {
    for (const mutate of [
        (raw) => (raw.operator_id = id(99)),
        (raw) => (raw.target_id = seedRoles[1].id),
        (raw) => (raw.target_type = 'Other'),
        (raw) => (raw.event_type = 'platform.role.updated'),
        (raw) => (raw.request_id = id(98)),
        (raw) => (raw.result = 'rejected'),
        (raw) => (raw.reason = 'different'),
        (raw) => (raw.metadata = { extra: true }),
        (raw) => (raw.extra = true)
    ]) {
        const run = synthetic();
        mutate(first(run).raw);
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('wrong role request, status or acknowledgement is rejected', () => {
    for (const mutate of [(row) => (row.plan.roleId = seedRoles[1].id), (row) => (row.plan.request.method = 'PATCH'), (row) => (row.plan.request.path += '/extra'), (row) => (row.status = 409), (row) => (row.acknowledgement.auditId = id(99))]) {
        const run = synthetic();
        mutate(first(run).row);
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('afterSnapshot retains first-occurrence request Set order', () => {
    const run = synthetic();
    first(run).raw.after_snapshot.permissionKeys.reverse();
    assert.throws(() => createSystemPermissionTieNormalizer(run));
});

test('wire and raw objects must agree in every field including snapshot order', () => {
    for (const mutate of [(wire) => wire.beforeSnapshot.permissionKeys.reverse(), (wire) => (wire.operatorId = id(77)), (wire) => (wire.occurredAt = '2026-10-26T17:00:00.124Z'), (wire) => (wire.extra = true)]) {
        const run = synthetic();
        mutate(first(run).wire);
        assert.throws(() => createSystemPermissionTieNormalizer(run));
    }
});

test('later repeated registered audits must remain identical before normalization', () => {
    const run = synthetic();
    run.cases.at(-1).after.audits[0].beforeSnapshot.permissionKeys.reverse();
    assert.throws(() => createSystemPermissionTieNormalizer(run));
});

test('post-registration field changes cannot be laundered by the exception', () => {
    const run = synthetic();
    const normalizer = createSystemPermissionTieNormalizer(run);
    for (const mutate of [(wire) => (wire.reason = 'changed'), (wire) => wire.afterSnapshot.permissionKeys.reverse(), (wire) => wire.beforeSnapshot.permissionKeys.reverse()]) {
        const wire = structuredClone(first(run).wire);
        mutate(wire);
        assert.throws(() => normalizer.normalizeAudit(wire));
    }
});

test('other audit objects and the entire audit array order are preserved', () => {
    const run = synthetic();
    const normalizer = createSystemPermissionTieNormalizer(run);
    const other = { id: id(555), eventType: 'platform.role.updated', beforeSnapshot: { permissionKeys: ['z', 'a'] }, afterSnapshot: { permissionKeys: ['q', 'b'] }, metadata: { field: 'keep' } };
    const rows = [other, first(run).wire, { ...other, id: id(556) }];
    const normalized = rows.map(normalizer.normalizeAudit);
    assert.deepEqual(
        normalized.map((audit) => audit.id),
        rows.map((audit) => audit.id)
    );
    assert.deepEqual(normalized[0], other);
    assert.deepEqual(normalized[2], rows[2]);
    const changed = structuredClone(other);
    changed.metadata.field = 'changed';
    assert.notDeepEqual(normalizer.normalizeAudit(changed), normalizer.normalizeAudit(other));
    assert.notDeepEqual([...normalized].reverse(), normalized);
});

test('evidence and derived objects cannot mutate the captured originals', () => {
    const run = synthetic();
    const normalizer = createSystemPermissionTieNormalizer(run);
    const evidence = normalizer.evidence();
    evidence.partitionShapes[0].buckets[0].permissionKeys.push('extra');
    const normalized = normalizer.normalizeAudit(first(run).wire);
    normalized.beforeSnapshot.permissionKeys.push('extra');
    assert.equal(normalizer.evidence().partitionShapes[0].buckets[0].size, 2);
    assert.deepEqual(normalizer.normalizeAudit(first(run).wire).beforeSnapshot.permissionKeys, ['a', 'b', 'c', 'd']);
});
