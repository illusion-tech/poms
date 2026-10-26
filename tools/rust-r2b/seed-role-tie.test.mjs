import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createSeedRoleTieNormalizer, fixedSeedRoles, postgresEpochMicroseconds, roleListsInReport, seedTieInputFiles } from './seed-role-tie.mjs';

// These self-contained values exercise the comparison contract only. They are
// synthetic fixtures, never evidence that either HTTP backend was run.
function synthetic() {
    const copies = ['nest', 'rust'].map((backend, index) => {
        const raw = `2026-10-27 03:45:3${6 + index}.144697+08`;
        return {
            backend,
            ownerMarkerVerified: true,
            appIdentityVerified: true,
            context: { database: 'poms_r2b_' + backend, current_user: 'poms_r2b_app', session_user: 'poms_r2b_app', read_only: 'on' },
            cardinality: { rows: 15, distinct_sort_keys: 1 },
            rows: fixedSeedRoles.map((row) => ({ id: row.id, role_key: row.key, display_order: 0, created_at_raw: raw, created_at_epoch_us: postgresEpochMicroseconds(raw), updated_at_raw: raw, updated_at_epoch_us: postgresEpochMicroseconds(raw) }))
        };
    });
    const rawInputs = seedTieInputFiles.map(({ kind, backend, file }) => {
        const rows = copies.find((row) => row.backend === backend).rows;
        const list = rows.map((row) => ({
            id: row.id,
            roleKey: row.role_key,
            displayOrder: 0,
            createdAt: new Date(Number(BigInt(row.created_at_epoch_us) / 1000n)).toISOString(),
            updatedAt: new Date(Number(BigInt(row.updated_at_epoch_us) / 1000n)).toISOString(),
            name: row.role_key,
            permissionKeys: ['first', 'second']
        }));
        if (backend === 'nest') list.reverse();
        list.push({ id: '70000000-0000-4000-8000-000000000001', roleKey: 'outside-one' }, { id: '70000000-0000-4000-8000-000000000002', roleKey: 'outside-two' });
        const value = { backend, platform: 'linux', runId: '10000000-0000-4000-8000-000000000001', result: kind === 'http' ? 'pass' : 'observed', serverStopped: true, zeroResidual: { matched: 0, changed: 0 } };
        if (kind === 'concurrency') value.cases = [{ id: 'assigned-role-list-null-hydration', responses: [{ body: list }] }, ...Array.from({ length: 5 }, (_, index) => ({ id: 'synthetic-' + index }))];
        else {
            value.observations = kind === 'http' ? [{ id: 'role-list-includes-inactive', response: list }] : ['list:canonical', 'list:static-uppercase', 'list:one-trailing-slash'].map((id) => ({ id, response: structuredClone(list) }));
            while (value.observations.length < (kind === 'http' ? 179 : 51)) value.observations.push({ id: 'synthetic-' + value.observations.length });
        }
        return { file, bytes: Buffer.from(JSON.stringify(value)) };
    });
    const proof = {
        formatVersion: 2,
        result: 'pass',
        receiptId: '20000000-0000-4000-8000-000000000001',
        marker: '538b8313-b54d-4318-9f70-4705132716ce',
        sourceHead: '9734515f84ebe1a4833d207124adbfbe378f691f',
        copies,
        inputs: seedTieInputFiles.map((row, index) => ({ ...row, sha256: createHash('sha256').update(rawInputs[index].bytes).digest('hex') }))
    };
    return { proof, rawInputs };
}
function rebind(value, inputIndex, mutate) {
    const report = JSON.parse(value.rawInputs[inputIndex].bytes);
    mutate(report);
    value.rawInputs[inputIndex].bytes = Buffer.from(JSON.stringify(report));
    value.proof.inputs[inputIndex].sha256 = createHash('sha256').update(value.rawInputs[inputIndex].bytes).digest('hex');
}
function normalize(value, inputIndex = 0) {
    const normalizer = createSeedRoleTieNormalizer(value.proof, value.rawInputs);
    const report = JSON.parse(value.rawInputs[inputIndex].bytes);
    const { kind, backend } = seedTieInputFiles[inputIndex];
    const { list, caseId } = roleListsInReport(report, kind)[0];
    return normalizer.normalizeList(list, { kind, backend, report, caseId });
}

test('synthetic full-microsecond tie pairs only the fifteen complete objects', () => {
    const value = synthetic();
    const before = value.rawInputs[0].bytes.toString();
    const list = normalize(value);
    assert.deepEqual(
        list.slice(0, 15).map((row) => row.id),
        fixedSeedRoles.map((row) => row.id)
    );
    assert.equal(list[15].roleKey, 'outside-one');
    assert.equal(value.rawInputs[0].bytes.toString(), before);
});

test('proof admission binds all six original byte sequences and exact scope', () => {
    for (const mutate of [
        (value) => {
            value.proof.inputs[5].sha256 = '0'.repeat(64);
        },
        (value) => {
            value.rawInputs[1].bytes = Buffer.from(value.rawInputs[1].bytes.toString() + ' ');
        },
        (value) => {
            value.proof.formatVersion = 1;
        },
        (value) => {
            value.proof.marker = 'wrong';
        },
        (value) => {
            value.rawInputs.pop();
        },
        (value) => {
            value.proof.copies[0].context.read_only = 'off';
        }
    ]) {
        const value = synthetic();
        mutate(value);
        assert.throws(() => createSeedRoleTieNormalizer(value.proof, value.rawInputs));
    }
});

test('one microsecond difference is rejected even when HTTP milliseconds tie', () => {
    const value = synthetic();
    const row = value.proof.copies[0].rows[3];
    row.created_at_raw = row.created_at_raw.replace('144697', '144698');
    row.created_at_epoch_us = (BigInt(row.created_at_epoch_us) + 1n).toString();
    assert.throws(() => createSeedRoleTieNormalizer(value.proof, value.rawInputs));
});

test('raw timestamp and numeric microseconds must agree', () => {
    const value = synthetic();
    value.proof.copies[0].rows[0].updated_at_epoch_us = '1793043936144698';
    assert.throws(() => createSeedRoleTieNormalizer(value.proof, value.rawInputs));
});

test('every list created/updated timestamp and key is checked against its database row', () => {
    for (const field of ['createdAt', 'updatedAt', 'roleKey', 'displayOrder']) {
        const value = synthetic();
        rebind(value, 4, (report) => {
            report.observations[1].response[0][field] = field === 'displayOrder' ? 1 : 'changed';
        });
        assert.throws(() => createSeedRoleTieNormalizer(value.proof, value.rawInputs));
    }
});

test('missing, duplicate and interleaved bucket identities are rejected', () => {
    for (const mutate of [
        (list) => list.splice(0, 1),
        (list) => {
            list[1] = list[0];
        },
        (list) => {
            [list[14], list[15]] = [list[15], list[14]];
        },
        (list) => list.push(list[0])
    ]) {
        const value = synthetic();
        rebind(value, 2, (report) => mutate(report.cases[0].responses[0].body));
        assert.throws(() => createSeedRoleTieNormalizer(value.proof, value.rawInputs));
    }
});

test('normalization keeps all member fields, unexpected fields and nested permission order', () => {
    const original = synthetic(),
        changed = synthetic();
    rebind(changed, 0, (report) => {
        const role = report.observations[0].response[0];
        role.name = 'changed';
        role.unexpected = true;
        role.permissionKeys.reverse();
    });
    const left = normalize(original),
        right = normalize(changed);
    assert.notDeepEqual(right, left);
    assert.equal(right[14].unexpected, true);
    assert.deepEqual(right[14].permissionKeys, ['second', 'first']);
});

test('array members outside the proven bucket retain their original order', () => {
    const original = synthetic(),
        changed = synthetic();
    rebind(changed, 0, (report) => {
        const list = report.observations[0].response;
        [list[15], list[16]] = [list[16], list[15]];
    });
    assert.notDeepEqual(normalize(changed), normalize(original));
});

test('a parsed report cannot change after its original bytes were bound', () => {
    const value = synthetic(),
        normalizer = createSeedRoleTieNormalizer(value.proof, value.rawInputs);
    const report = JSON.parse(value.rawInputs[0].bytes);
    report.observations[0].response[0].name = 'post-binding edit';
    assert.throws(() => normalizer.normalizeList(report.observations[0].response, { kind: 'http', backend: 'nest', report, caseId: 'role-list-includes-inactive' }));
});

test('the exception cannot be applied to another case or audit array', () => {
    const value = synthetic(),
        normalizer = createSeedRoleTieNormalizer(value.proof, value.rawInputs);
    const report = JSON.parse(value.rawInputs[0].bytes);
    assert.throws(() => normalizer.normalizeList(report.observations[0].response, { kind: 'http', backend: 'nest', report, caseId: 'audit' }));
});
