import test from 'node:test';
import assert from 'node:assert/strict';
import { exactCents, assertFrozenPreserved, assertLateSource, assertLateCostDelta, completeLiveTargets } from './restatement-assertions.mjs';
const id = '11111111-1111-4111-8111-111111111111', project = '22222222-2222-4222-8222-222222222222';
test('exact cents preserve adjacent MAX18,2 values and never accept JSON numbers/null', () => {
  assert.equal(exactCents('9999999999999999.99') - exactCents('9999999999999999.98'), 1n);
  assert.equal(exactCents('-0.01'), -1n);
  for (const value of [0, 5000.00, null, '5000', '5e3', '01.00', '1.000']) assert.throws(() => exactCents(value));
});
test('full frozen persisted bytes preserve facts while mutable selectors can change', () => {
  const original = { snapshotId: id, frozenSnapshotRaw: '{"amount":9999999999999999.99}', sourceContextRaw: 'original-context', sourceMemberRows: ['original-member'], costMemberRows: ['original-cost'], sourceHash: 'old', sourcePayloadHash: 'payload', rowVersion: 1 };
  assertFrozenPreserved(original, { ...original, rowVersion: 3, status: 'superseded', isCurrent: false });
  for (const mutation of [{ frozenSnapshotRaw: '{"amount":9999999999999999.98}' }, { sourceContextRaw: 'changed' }, { sourceMemberRows: [] }, { costMemberRows: ['new-cost'] }, { sourceHash: 'new' }]) assert.throws(() => assertFrozenPreserved(original, { ...original, ...mutation }));
});
test('late source requires real post-knowledge creation and business date inside old window', () => {
  const original = { projectId: project, sourceWindowEnd: '2026-11-07', knowledgeCutoff: '2026-11-07T00:00:00Z', currency: 'CNY' };
  const source = { projectId: project, businessDate: '2026-11-07', createdAt: '2026-11-07T00:01:00Z', currency: 'CNY', amountExcludingTax: '5000.00', taxCostAmount: '650.00', amountIncludingTax: '5650.00' };
  assertLateSource(original, source);
  for (const mutation of [{ createdAt: original.knowledgeCutoff }, { businessDate: '2026-11-08' }, { projectId: id }, { currency: 'USD' }]) assert.throws(() => assertLateSource(original, { ...source, ...mutation }));
});
test('only explicit actual one-cost delta is accepted and unknown tax stays unknown', () => {
  const member = { unitKey: 'cost:old', netKnowledge: 'known', net: '5000.00', tax: '650.00', gross: '5650.00' };
  const original = { costAmounts: [member], metrics: { includedCost: '5000.00', grossMargin: '95000.00', effectiveContract: '100000.00', confirmedReceipt: '100000.00', taxPendingKnowledge: 'unknown', taxPending: null } };
  const current = { costAmounts: [member, { ...member, unitKey: 'cost:' + id }], metrics: { ...original.metrics, includedCost: '10000.00', grossMargin: '90000.00' } };
  const source = { id, amountExcludingTax: '5000.00', taxCostAmount: '650.00', amountIncludingTax: '5650.00' };
  assert.equal(assertLateCostDelta(original, current, id, source).actualServerNetDeltaCents, '500000');
  assert.throws(() => assertLateCostDelta(original, { ...current, metrics: { ...current.metrics, taxPendingKnowledge: 'known', taxPending: '0.00' } }, id, source));
  assert.throws(() => assertLateCostDelta(original, { ...current, metrics: { ...current.metrics, includedCost: '9999.99' } }, id, source));
  assert.throws(() => assertLateCostDelta(original, current, id, { ...source, amountExcludingTax: '4999.99' }));
});
test('complete target proof cannot drop another project/period/root or invent terminal ancestry', () => {
  const target = { projectId: project, expectedVersion: 2, restatesSnapshotRef: { id }, periodEndSnapshotRef: null, costDecisions: [] };
  const prep = { intent: 'restatement', kind: 'preparation-only', projectId: project, expectedInputHash: 'a'.repeat(64), headVersion: 2, projectVersion: 4, proposedAffectedTargets: [target] };
  assert.equal(completeLiveTargets(prep, project, id).primary, target);
  assert.throws(() => completeLiveTargets({ ...prep, proposedAffectedTargets: [target, target] }, project, id));
  assert.throws(() => completeLiveTargets({ ...prep, proposedAffectedTargets: [] }, project, id));
  assert.throws(() => completeLiveTargets({ ...prep, proposedAffectedTargets: [target, { ...target, projectId: id }] }, project, id));
  assert.throws(() => completeLiveTargets({ ...prep, proposedAffectedTargets: [{ ...target, periodEndSnapshotRef: { id } }] }, project, id));
});
