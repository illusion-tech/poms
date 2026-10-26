import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareConcurrencyReports } from './compare-concurrency.mjs';

// Optional captured-report mutation tests. These inputs are immutable local
// acceptance artifacts and are intentionally absent from a clean checkout.
// POMS_R2B_COMPARER_REPORT_TESTS=1 requires those local originals explicitly.
const enabled = process.env.POMS_R2B_COMPARER_REPORT_TESTS === '1';
const testCaptured = (name, body) => test(name, { skip: !enabled }, body);

const nest = enabled ? JSON.parse(readFileSync(new URL('../../tmp/rust-r2b/c-comparator-fixtures/concurrency-nest.json', import.meta.url))) : null;
const rust = enabled ? JSON.parse(readFileSync(new URL('../../tmp/rust-r2b/c-comparator-fixtures/concurrency-rust.json', import.meta.url))) : null;
function aligned() {
    const left = structuredClone(nest),
        right = structuredClone(rust);
    const expected = left.cases[5].actorRoleResponse.description;
    right.cases[5].actorRoleResponse.description = expected;
    right.cases[5].responses[0].body.find((role) => role.id === right.identities.adminRole).description = expected;
    return [left, right];
}
testCaptured('current captured nullable mismatch is retained as a product difference', () => {
    const result = compareConcurrencyReports(nest, rust);
    assert.equal(result.result, 'fail');
    assert.equal(result.comparisons.filter((row) => row.result === 'fail').length, 1);
    assert.equal(result.comparisons[5].id, 'assigned-role-list-null-hydration');
    assert.equal(result.comparisons[5].difference.path, '$.actorRoleResponse.description');
});
testCaptured('aligning only the measured nullable field makes the saved pair equal without mutating raw evidence', () => {
    assert.equal(compareConcurrencyReports(...aligned()).result, 'pass');
    assert.equal(rust.cases[5].actorRoleResponse.description, null);
});
testCaptured('complete HTTP list order is preserved', () => {
    const pair = aligned();
    pair[1].cases[5].responses[0].body.reverse();
    assert.equal(compareConcurrencyReports(...pair).result, 'fail');
});
testCaptured('unexpected response fields are not discarded', () => {
    const pair = aligned();
    pair[1].cases[4].responses[0].body.unexpected = true;
    assert.equal(compareConcurrencyReports(...pair).result, 'fail');
});
testCaptured('an incorrect status or missing lock witness is invalid evidence', () => {
    for (const change of [
        (row) => {
            row.statuses = [200];
        },
        (row) => {
            row.blockedCount = 0;
        }
    ]) {
        const pair = aligned();
        change(pair[1].cases[0]);
        assert.throws(() => compareConcurrencyReports(...pair));
    }
});
testCaptured('a future due-session timestamp cannot disappear through normalization', () => {
    const pair = aligned();
    pair[1].cases[4].after.session.lastSeenAt = '2099-01-01T00:00:00.000Z';
    assert.throws(() => compareConcurrencyReports(...pair));
});
testCaptured('audit actor changes and missing audit fields remain visible', () => {
    const pair = aligned();
    delete pair[1].cases[1].after.audits.at(-1).metadata;
    assert.equal(compareConcurrencyReports(...pair).result, 'fail');
    const actor = aligned();
    actor[1].cases[1].after.audits.at(-1).operatorId = actor[0].identities.admin;
    assert.throws(() => compareConcurrencyReports(...actor));
});
testCaptured('a different harness or incomplete case matrix is rejected', () => {
    const first = aligned();
    first[1].sourceFiles[0].sha256 = '0'.repeat(64);
    assert.throws(() => compareConcurrencyReports(...first));
    const second = aligned();
    second[1].cases.pop();
    assert.throws(() => compareConcurrencyReports(...second));
});
testCaptured('constant session-version offsets cannot hide behind identical deltas', () => {
    const values = aligned();
    for (const row of values[1].cases) {
        row.before.session.rowVersion += 100;
        row.after.session.rowVersion += 100;
    }
    assert.equal(compareConcurrencyReports(...values).result, 'fail');
});

// Minimal self-contained synthetic rejection case; no backend execution claim.
test('incomplete synthetic reports cannot be accepted without captured artifacts', () => {
    assert.throws(() => compareConcurrencyReports({ result: 'pass', backend: 'nest', sourceFiles: [] }, { result: 'pass', backend: 'rust', sourceFiles: [] }));
});
