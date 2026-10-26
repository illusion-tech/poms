import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareSystemReports } from './compare-system-roles.mjs';

// Optional captured-report mutation tests. These inputs are immutable local
// acceptance artifacts and are intentionally absent from a clean checkout.
// POMS_R2B_COMPARER_REPORT_TESTS=1 requires those local originals explicitly.
const enabled = process.env.POMS_R2B_COMPARER_REPORT_TESTS === '1';
const testCaptured = (name, body) => test(name, { skip: !enabled }, body);

const failed = enabled ? JSON.parse(readFileSync(new URL('../../tmp/rust-r2b/system-nest.json.failed-01', import.meta.url))) : null;
const restored = enabled ? JSON.parse(readFileSync(new URL('../../tmp/rust-r2b/b-system-lease-recovery-r1-after.json', import.meta.url))) : null;
function syntheticCompleted() {
    const result = structuredClone(failed);
    result.result = 'pass';
    delete result.failurePhase;
    delete result.failureReason;
    delete result.restoreFailed;
    delete result.cleanupDeferredUntilSystemRestored;
    result.finalJournal = structuredClone(restored);
    result.release = { formatVersion: 1, runId: result.runId, backend: 'nest', leaseId: result.lease.leaseId, sequence: 45, action: 'release', event: 'released', restored: true, completed: 22 };
    result.zeroResidual = { matched: 0, changed: 0 };
    return result;
}
function pair() {
    const nest = syntheticCompleted();
    let rust = JSON.stringify(nest);
    const dynamic = new Set([
        nest.runId,
        nest.lease.actorId,
        nest.lease.leaseId,
        nest.cases[0].before.session.id,
        ...nest.initial.permissions.map((row) => row.id),
        ...nest.initial.userRoles.map((row) => row.id),
        ...nest.cases.flatMap((row) => row.systemAfter.permissions.map((item) => item.id)),
        ...nest.cases.flatMap((row) => row.systemAfter.audits.map((item) => item.id))
    ]);
    let counter = 1;
    for (const id of dynamic) rust = rust.replaceAll(id, '60000000-0000-4000-8000-' + (counter++).toString(16).padStart(12, '0'));
    rust = JSON.parse(rust);
    function shift(value, key = '') {
        if (value && typeof value === 'object') {
            for (const [name, item] of Object.entries(value)) value[name] = shift(item, name);
            return value;
        }
        if (key === 'backend') return 'rust';
        if (typeof value === 'string' && /^(?:createdAt|updatedAt|created_at|updated_at|assigned_at|revoked_at|occurredAt|occurred_at|lastSeenAt|idleExpiresAt|absoluteExpiresAt|revokedAt|deadlineAt|startedAt|finishedAt)$/.test(key))
            return new Date(Date.parse(value) + 86400000).toISOString();
        return value;
    }
    return [nest, shift(rust)];
}
testCaptured('failed-01 system result is never admitted as complete evidence', () => {
    assert.throws(() => compareSystemReports(failed, { ...failed, backend: 'rust' }));
});
testCaptured('synthetic completed format permits known ID and seed-time variation', () => {
    assert.equal(compareSystemReports(...pair()).result, 'pass');
});
testCaptured('changed complete HTTP field is visible', () => {
    const values = pair();
    values[1].cases[2].response.unexpected = true;
    assert.equal(compareSystemReports(...values).result, 'fail');
});
testCaptured('full plan request changes and audit permission order are visible', () => {
    const plans = pair();
    plans[1].cases[4].plan.request.body.comment = 'different ignored input';
    assert.equal(compareSystemReports(...plans).result, 'fail');
    const audits = pair();
    audits[1].cases[8].after.audits.at(-1).afterSnapshot.permissionKeys.reverse();
    assert.throws(() => compareSystemReports(...audits));
});
testCaptured('future times, missing audit columns and incorrect session delta are rejected', () => {
    for (const mutate of [
        (value) => {
            value.cases[0].after.session.lastSeenAt = '2099-01-01T00:00:00.000Z';
        },
        (value) => {
            delete value.cases[0].systemAfter.audits[0].request_id;
        },
        (value) => {
            value.cases[0].sessionVersionDelta = 1;
        }
    ]) {
        const values = pair();
        mutate(values[1]);
        assert.throws(() => compareSystemReports(...values));
    }
});
testCaptured('initial history or final restore metadata cannot be silently weakened', () => {
    const initial = pair();
    initial[1].initial.permissions[0].permission_key = 'unknown:changed';
    assert.throws(() => compareSystemReports(...initial));
    const final = pair();
    final[1].finalJournal.state = 'active';
    assert.throws(() => compareSystemReports(...final));
});
testCaptured('constant session-version offsets remain visible across both snapshots', () => {
    const values = pair();
    for (const row of values[1].cases) {
        row.before.session.rowVersion += 100;
        row.after.session.rowVersion += 100;
    }
    assert.equal(compareSystemReports(...values).result, 'fail');
});

// Minimal self-contained synthetic rejection case; no backend execution claim.
test('incomplete synthetic reports cannot be accepted without captured artifacts', () => {
    assert.throws(() => compareSystemReports({ result: 'pass', backend: 'nest', sourceFiles: [] }, { result: 'pass', backend: 'rust', sourceFiles: [] }));
});
