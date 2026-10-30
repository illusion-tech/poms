import test from 'node:test';
import assert from 'node:assert/strict';
import { pgQueryStartedAfter } from './l-snapshot-waiter-admission.mjs';
test('Actual pg Date samples preserve milliseconds at the request ownership boundary', () => {
    const actual = new Date('2026-10-30T03:00:01.990Z'), start = '2026-10-30T03:00:01.950Z';
    assert(! (Date.parse(actual) >= Date.parse(start)), 'Reproduce the old Date coercion loss');
    assert(pgQueryStartedAfter(actual, start));
    assert(pgQueryStartedAfter(actual.toISOString(), start));
    assert(!pgQueryStartedAfter(new Date('2026-10-30T03:00:01.949Z'), start));
    assert.throws(() => pgQueryStartedAfter(new Date('invalid'), start));
});
