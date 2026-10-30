import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyLookupStoredTimes, validateAndMapLookupQueryClock } from './compare-lookup-actual.mjs';
test('Cross-run date normalization requires exact independently stored row projection', () => {
    const stored = '2026-10-30T09:00:00+08:00', value = { id: 'owned', contractNo: 'C', createdAt: '2026-10-30T01:00:00.000Z' };
    const source = { requests: [{ name: 'contract.lookup', compare: true, response: { status: 200, body: value }, after: [{ rows: { contract: [{ id: 'owned', created_at: stored }] } }], audit: [] }] };
    assert.equal(verifyLookupStoredTimes(source).fields, 1);
    for (const update of [copy => { copy.requests[0].response.body.createdAt = '2026-10-30T01:00:00.001Z'; },
        copy => { copy.requests[0].response.body.id = 'other'; }, copy => { delete copy.requests[0].after[0].rows.contract[0].created_at; }]) {
        const copy = structuredClone(source); update(copy); assert.throws(() => verifyLookupStoredTimes(copy));
    }
});
test('Original project detail generatedAt must be the declared request-local sampling point', () => {
    const source = { requests: [{ name: 'project.item-uuid', compare: true, startedAt: '2026-10-30T01:00:00.000Z', responseReceivedAt: '2026-10-30T01:00:00.005Z', response: { status: 200, body: { generatedAt: '2026-10-30T01:00:00.002Z' } } }] };
    assert.equal(validateAndMapLookupQueryClock(source).observations.length, 1);
    const outside = structuredClone(source); outside.requests[0].response.body.generatedAt = '2026-10-30T01:00:00.006Z';
    assert.throws(() => validateAndMapLookupQueryClock(outside));
    const other = structuredClone(source); other.requests[0].name = 'other'; assert.throws(() => validateAndMapLookupQueryClock(other));
});
