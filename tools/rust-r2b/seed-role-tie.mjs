import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// This exception is limited to these original fifteen seeded identities. It
// never infers a SQL tie from the millisecond timestamps of an HTTP response.
export const fixedSeedRoles = Object.freeze(
    ['platform-admin', 'project-viewer', 'sales-rep', 'sales-lead', 'presales', 'business-admin', 'business-lead', 'vp-owner', 'executive', 'project-manager', 'sales-assistant', 'commission-policy', 'finance-ops', 'finance-manager', 'auditor'].map(
        (key, index) => Object.freeze({ id: '30000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'), key })
    )
);
export const seedTieInputFiles = Object.freeze(
    ['http', 'concurrency', 'uri'].flatMap((kind) => ['nest', 'rust'].map((backend) => Object.freeze({ kind, backend, file: `tmp/rust-r2b/${kind === 'concurrency' ? kind : kind + '-linux'}-${backend}.json` })))
);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const marker = '538b8313-b54d-4318-9f70-4705132716ce';
const sourceHead = '9734515f84ebe1a4833d207124adbfbe378f691f';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function postgresEpochMicroseconds(raw) {
    assert.equal(typeof raw, 'string');
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?([+-]\d{2}(?::\d{2})?)$/.exec(raw);
    assert(match, 'A complete PostgreSQL timestamp with microseconds and offset is required');
    const zone = match[4].length === 3 ? match[4] + ':00' : match[4];
    const seconds = Date.parse(`${match[1]}T${match[2]}${zone}`);
    assert(Number.isSafeInteger(seconds));
    return (BigInt(seconds) * 1000n + BigInt((match[3] ?? '').padEnd(6, '0'))).toString();
}

function wireTime(epochUs) {
    assert(/^[0-9]+$/.test(epochUs));
    return new Date(Number(BigInt(epochUs) / 1000n)).toISOString();
}

export function roleListsInReport(report, kind) {
    if (kind === 'http') {
        const rows = report.observations.filter((row) => row.id === 'role-list-includes-inactive');
        assert.equal(rows.length, 1);
        return [{ caseId: rows[0].id, list: rows[0].response }];
    }
    if (kind === 'concurrency') {
        const rows = report.cases.filter((row) => row.id === 'assigned-role-list-null-hydration');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].responses.length, 1);
        return [{ caseId: rows[0].id, list: rows[0].responses[0].body }];
    }
    assert.equal(kind, 'uri');
    const ids = ['list:canonical', 'list:static-uppercase', 'list:one-trailing-slash'];
    const rows = report.observations.filter((row) => ids.includes(row.id));
    assert.deepEqual(
        rows.map((row) => row.id),
        ids
    );
    return rows.map((row) => ({ caseId: row.id, list: row.response }));
}

export function validateSeedRoleRows(rows, cardinality) {
    assert.deepEqual(cardinality, { rows: 15, distinct_sort_keys: 1 });
    assert.equal(rows.length, 15);
    for (const [index, row] of rows.entries()) {
        assert.equal(row.id, fixedSeedRoles[index].id);
        assert.equal(row.role_key, fixedSeedRoles[index].key);
        assert.equal(row.display_order, 0);
        for (const field of ['created_at', 'updated_at']) {
            assert.equal(row[field + '_epoch_us'], postgresEpochMicroseconds(row[field + '_raw']));
            wireTime(row[field + '_epoch_us']);
        }
    }
    assert.equal(new Set(rows.map((row) => row.display_order + '|' + row.created_at_epoch_us)).size, 1, 'SQL sorting keys must tie at full microsecond precision');
}

export function validateSeedRoleList(list, rows) {
    assert(Array.isArray(list));
    const expected = new Map(rows.map((row) => [row.id, row]));
    const positions = [];
    for (const [position, item] of list.entries()) {
        const row = expected.get(item?.id);
        if (!row) continue;
        positions.push(position);
        assert.equal(item.roleKey, row.role_key);
        assert.equal(item.displayOrder, row.display_order);
        assert.equal(item.createdAt, wireTime(row.created_at_epoch_us));
        assert.equal(item.updatedAt, wireTime(row.updated_at_epoch_us));
    }
    assert.deepEqual(
        positions,
        Array.from({ length: 15 }, (_, index) => index),
        'Only the complete contiguous first fifteen fixed seed roles form the proven bucket'
    );
    assert.equal(new Set(list.slice(0, 15).map((row) => row.id)).size, 15);
}

// rawInputs are the original six report byte sequences, not parsed-and-reencoded
// JSON or caller-supplied digests. Every normalization is bound to those bytes.
export function createSeedRoleTieNormalizer(proof, rawInputs) {
    assert.equal(proof.formatVersion, 2);
    assert.equal(proof.result, 'pass');
    assert(uuid.test(proof.receiptId));
    assert.equal(proof.marker, marker);
    assert.equal(proof.sourceHead, sourceHead);
    assert.equal(proof.copies.length, 2);
    assert.equal(rawInputs.length, 6);
    assert.equal(proof.inputs.length, 6);
    const reports = new Map();
    for (const [index, expected] of seedTieInputFiles.entries()) {
        const input = rawInputs[index];
        assert.equal(input.file, expected.file);
        const sha256 = digest(input.bytes);
        assert.deepEqual(proof.inputs[index], { ...expected, sha256 });
        const value = JSON.parse(input.bytes);
        assert.equal(value.backend, expected.backend);
        assert.equal(value.platform, 'linux');
        assert(uuid.test(value.runId));
        assert.equal(value.result, expected.kind === 'http' ? 'pass' : 'observed');
        assert.equal(value.serverStopped, true);
        assert.equal(value.zeroResidual.matched, 0);
        assert.equal(value.zeroResidual.changed, 0);
        assert.equal(expected.kind === 'concurrency' ? value.cases.length : value.observations.length, { http: 179, concurrency: 6, uri: 51 }[expected.kind]);
        reports.set(expected.kind + ':' + expected.backend, value);
    }
    const copies = new Map();
    for (const [index, backend] of ['nest', 'rust'].entries()) {
        const copy = proof.copies[index];
        assert.equal(copy.backend, backend);
        assert.equal(copy.ownerMarkerVerified, true);
        assert.equal(copy.appIdentityVerified, true);
        assert.equal(copy.context.database, 'poms_r2b_' + backend);
        assert.equal(copy.context.current_user, 'poms_r2b_app');
        assert.equal(copy.context.session_user, 'poms_r2b_app');
        assert.equal(copy.context.read_only, 'on');
        validateSeedRoleRows(copy.rows, copy.cardinality);
        for (const kind of ['http', 'concurrency', 'uri']) for (const { list } of roleListsInReport(reports.get(kind + ':' + backend), kind)) validateSeedRoleList(list, copy.rows);
        copies.set(backend, copy);
    }
    return Object.freeze({
        receiptId: proof.receiptId,
        normalizeList(list, { kind, backend, report, caseId }) {
            const bound = reports.get(kind + ':' + backend);
            assert(bound, 'Only an explicitly bound report may use the seed tie exception');
            assert.deepEqual(report, bound, 'The compared report must equal its bound original bytes');
            const source = roleListsInReport(bound, kind).find((row) => row.caseId === caseId);
            assert(source, 'Only the specifically observed role-list response may use this exception');
            assert.deepEqual(list, source.list);
            const rows = copies.get(backend).rows;
            validateSeedRoleList(list, rows);
            const byId = new Map(list.slice(0, 15).map((row) => [row.id, row]));
            // Keep entire objects and every later array element in place.
            return [...fixedSeedRoles.map((row) => byId.get(row.id)), ...list.slice(15)];
        }
    });
}
