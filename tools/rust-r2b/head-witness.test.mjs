import assert from 'node:assert/strict';
import test from 'node:test';
import { headCases } from './head-witness.mjs';
test('HEAD probe is restricted to the three GET shapes and five known raw URI spellings', () => {
    const id = 'a0000000-0000-4000-8000-000000000001',
        cases = headCases(id);
    assert.equal(cases.length, 15);
    assert.equal(new Set(cases.map((row) => row.id)).size, 15);
    assert.deepEqual([...new Set(cases.map((row) => row.operation))], ['dictionary', 'list', 'detail']);
    for (const variant of ['canonical', 'static-uppercase', 'one-trailing-slash', 'two-trailing-slashes', 'encoded-static']) assert.equal(cases.filter((row) => row.variant === variant).length, 3);
    assert.equal(cases.find((row) => row.id === 'detail:static-uppercase').route, '/API/PLATFORM/ROLES/' + id);
    assert.throws(() => headCases('not-a-uuid'));
});
