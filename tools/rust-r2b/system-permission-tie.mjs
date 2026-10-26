import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { seedRoles, validateSnapshot } from './system-lease-model.mjs';

const require = createRequire(import.meta.url);
const { steps, uuid } = require('./system-lease-protocol.cjs');
const permissionSteps = new Set(['admin-retain-all', 'viewer-minimum-only', 'viewer-readd-original']);
const auditFields = ['id', 'eventType', 'targetType', 'targetId', 'operatorId', 'requestId', 'result', 'reason', 'beforeSnapshot', 'afterSnapshot', 'metadata', 'occurredAt'];
const rawFields = ['id', 'event_type', 'target_type', 'target_id', 'operator_id', 'request_id', 'result', 'reason', 'before_snapshot', 'after_snapshot', 'metadata', 'occurred_at'];

// Snapshot timestamps retain PostgreSQL's native microseconds. HTTP timestamps
// alone cannot establish whether the two ORDER BY expressions form a tie.
export function permissionTimestampMicroseconds(text) {
    assert.equal(typeof text, 'string');
    const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d:\d\d)$/.exec(text);
    assert(match, 'A native PostgreSQL snapshot timestamp with offset is required');
    const seconds = Date.parse(match[1] + match[3]);
    assert(Number.isSafeInteger(seconds));
    return BigInt(seconds) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0'));
}

function exactKeys(value, fields) {
    assert(value && typeof value === 'object' && !Array.isArray(value));
    assert.deepEqual(Object.keys(value).sort(), [...fields].sort());
}

function strings(value) {
    assert(Array.isArray(value));
    assert(value.every((key) => typeof key === 'string'));
    return value;
}

function keysSnapshot(value) {
    exactKeys(value, ['permissionKeys']);
    return strings(value.permissionKeys);
}

function bucketsFor(snapshot, roleId, actual) {
    const active = snapshot.permissions.filter((row) => row.role_id === roleId && row.status === 'active');
    assert.equal(new Set(active.map((row) => row.permission_key)).size, active.length, 'Active permission keys must be unique');
    assert.equal(actual.length, active.length);
    assert.equal(new Set(actual).size, actual.length, 'The before snapshot must contain every active key exactly once');
    const groups = new Map();
    for (const row of active) {
        const assigned = permissionTimestampMicroseconds(row.assigned_at);
        const created = permissionTimestampMicroseconds(row.created_at);
        const tuple = assigned.toString() + ':' + created.toString();
        if (!groups.has(tuple)) groups.set(tuple, { assigned, created, rows: [] });
        groups.get(tuple).rows.push(row);
    }
    const buckets = [...groups.values()].sort((left, right) => (left.assigned < right.assigned ? -1 : left.assigned > right.assigned ? 1 : left.created < right.created ? -1 : left.created > right.created ? 1 : 0));
    let offset = 0;
    return buckets.map((bucket) => {
        const permissionKeys = bucket.rows.map((row) => row.permission_key).sort();
        assert.deepEqual([...actual.slice(offset, offset + permissionKeys.length)].sort(), permissionKeys, 'Only a complete contiguous native SQL tie bucket may be permuted');
        const result = {
            offset,
            size: permissionKeys.length,
            permissionKeys,
            assignedAtMicros: bucket.assigned.toString(),
            createdAtMicros: bucket.created.toString(),
            rows: bucket.rows.map((row) => ({ id: row.id, permissionKey: row.permission_key, assignedAt: row.assigned_at, createdAt: row.created_at }))
        };
        offset += permissionKeys.length;
        return result;
    });
}

function assertWireAudit(raw, wire) {
    exactKeys(raw, rawFields);
    exactKeys(wire, auditFields);
    for (const [index, key] of auditFields.entries()) {
        if (key === 'occurredAt') {
            assert.equal(new Date(Number(permissionTimestampMicroseconds(raw.occurred_at) / 1000n)).toISOString(), wire.occurredAt);
        } else assert.deepEqual(wire[key], raw[rawFields[index]]);
    }
}

// This helper admits only six acknowledged permission steps from the complete
// fixed lease matrix. The caller must compare partitionShapes across backends
// as well as the derived audit objects; a 6+2 partition never equals one 8 bucket.
export function createSystemPermissionTieNormalizer(run) {
    assert.equal(run.formatVersion, 1);
    assert.equal(run.result, 'pass');
    assert(['nest', 'rust'].includes(run.backend));
    assert(uuid.test(run.runId));
    assert(uuid.test(run.lease?.actorId));
    const matrix = [true, false].flatMap((due) => steps.map((step) => ({ step, due })));
    assert.deepEqual(
        run.cases.map(({ step, due }) => ({ step, due })),
        matrix
    );
    const registry = new Map();
    const details = [];
    for (const [index, row] of run.cases.entries()) {
        if (!permissionSteps.has(row.step)) continue;
        validateSnapshot(row.systemBefore);
        validateSnapshot(row.systemAfter);
        const roleId = seedRoles[row.step.startsWith('admin-') ? 0 : 1].id;
        assert.equal(row.plan.roleId, roleId);
        assert.equal(row.plan.eventType, 'platform.role.permissions.replaced');
        assert.equal(row.plan.expectedStatus, 200);
        assert.equal(row.status, 200);
        assert.equal(row.plan.request.method, 'PUT');
        assert.equal(row.plan.request.path, '/api/platform/roles/' + roleId + '/permissions');
        exactKeys(row.plan.request.body, ['permissionKeys']);
        const requestKeys = strings(row.plan.request.body.permissionKeys);
        const expectedNext = [...new Set(requestKeys)];
        const oldIds = new Set(row.systemBefore.audits.map((audit) => audit.id));
        const added = row.systemAfter.audits.filter((audit) => !oldIds.has(audit.id));
        assert.equal(added.length, 1);
        const raw = added[0];
        assert.equal(raw.id, row.acknowledgement.auditId);
        assert(uuid.test(raw.id));
        assert(!registry.has(raw.id));
        assert.equal(raw.event_type, 'platform.role.permissions.replaced');
        assert.equal(raw.target_type, 'PlatformRole');
        assert.equal(raw.target_id, roleId);
        assert.equal(raw.operator_id, run.lease.actorId);
        assert.equal(raw.request_id, null);
        assert.equal(raw.result, 'success');
        assert.equal(raw.reason, null);
        assert.equal(raw.metadata, null);
        const beforeKeys = keysSnapshot(raw.before_snapshot);
        assert.deepEqual(keysSnapshot(raw.after_snapshot), expectedNext, 'The after snapshot retains exact request Set order');
        const wireAudits = row.after.audits.filter((audit) => audit.id === raw.id);
        assert.equal(wireAudits.length, 1);
        const wire = wireAudits[0];
        assertWireAudit(raw, wire);
        assert(!row.before.audits.some((audit) => audit.id === raw.id));
        const buckets = bucketsFor(row.systemBefore, roleId, beforeKeys);
        const canonicalKeys = buckets.flatMap((bucket) => bucket.permissionKeys);
        registry.set(raw.id, { raw: structuredClone(raw), wire: structuredClone(wire), canonicalKeys });
        details.push({ step: row.step, due: row.due, caseIndex: index, auditId: raw.id, roleId, buckets });
    }
    assert.equal(registry.size, 6);
    function normalizeAudit(audit) {
        const registered = registry.get(audit?.id);
        if (!registered) return structuredClone(audit);
        const raw = Object.hasOwn(audit, 'before_snapshot');
        assert.deepEqual(audit, raw ? registered.raw : registered.wire, 'A registered audit must remain identical to its original acknowledged object');
        const result = structuredClone(audit);
        result[raw ? 'before_snapshot' : 'beforeSnapshot'].permissionKeys = [...registered.canonicalKeys];
        return result;
    }
    // Existing reports repeat earlier audits in later observations and the final
    // journal. Verify those originals before the caller derives any comparison.
    for (const row of run.cases) {
        for (const snapshot of [row.before, row.after, row.systemBefore, row.systemAfter]) {
            if (snapshot?.audits) for (const audit of snapshot.audits) normalizeAudit(audit);
        }
    }
    for (const snapshot of [run.initial, run.finalJournal?.base, run.finalJournal?.authorized]) {
        if (snapshot?.audits) for (const audit of snapshot.audits) normalizeAudit(audit);
    }
    const partitionShapes = details.map(({ step, due, buckets }) => ({ step, due, buckets: buckets.map(({ offset, size, permissionKeys }) => ({ offset, size, permissionKeys })) }));
    return Object.freeze({
        normalizeAudit,
        evidence() {
            return structuredClone({ formatVersion: 1, backend: run.backend, runId: run.runId, details, partitionShapes });
        }
    });
}
