import assert from 'node:assert/strict';
import test from 'node:test';
import { F_OPERATIONS, F_SQL_WITNESSES, fHttpPlan } from './f-protocol.mjs';

test('Finite F protocol binds four existing operations and unique planned cases', () => {
    const plan = fHttpPlan({ targetId: 'r2ef-opaque-AbC', auditEventType: 'fixture.audit', securityEventType: 'fixture.security', operatorId: 'a0000000-0000-4000-8000-000000000001', actorId: 'a0000000-0000-4000-8000-000000000002', inclusiveAt: '2026-10-28T01:02:03.123Z', routePath: '/r2ef/owned' });
    assert.equal(F_OPERATIONS.length, 4);
    assert.equal(new Set(plan.cases.map(entry => entry.id)).size, plan.cases.length);
    assert.equal(plan.cases.filter(entry => entry.id.startsWith('F:entity-type-')).length, 9);
    assert(plan.cases.every(entry => Number.isInteger(entry.expected.status)));
    assert.equal(F_SQL_WITNESSES.length, 5);
});
