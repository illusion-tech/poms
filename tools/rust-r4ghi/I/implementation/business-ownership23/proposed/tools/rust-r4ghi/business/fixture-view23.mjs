// A persistent fixture lens, not a copied run or an independent ownership ledger.
import assert from 'node:assert/strict';
import { keyOf, sha } from './pure.mjs';

export function mainFixtureSHA(ctx) {
  const { uiFixtureViews23: ignored, ...main } = ctx.state.fixtures;
  return sha(JSON.stringify(main));
}
export function openFixtureView(ctx, key) {
  assert(['eo', 'own'].includes(key)); assert(!ctx.fixtureViewKey, 'Nested views cannot mint another view');
  const root = ctx.state.fixtures;
  assert(root.platformComplete && root.org?.id && root.customer?.id && root.roles);
  for (const [table, id] of [['org_unit', root.org.id], ['customer', root.customer.id]]) {
    assert(ctx.state.owned[keyOf(ctx.database, table, [id])], 'Spare preparation reuses only this real run-owned org/customer');
  }
  root.uiFixtureViews23 ??= {};
  let record = root.uiFixtureViews23[key];
  if (!record) {
    const fixtures = { platformComplete: true, org: structuredClone(root.org), customer: structuredClone(root.customer), roles: structuredClone(root.roles) };
    if (root.plannedDate) fixtures.plannedDate = root.plannedDate;
    // This is the same real dedicated EO role and its original command receipt.
    // restrictExecutionRole still performs a fresh login/permission check.
    if (root.executionMinimalRole) fixtures.executionMinimalRole = structuredClone(root.executionMinimalRole);
    record = root.uiFixtureViews23[key] = { key, classification: 'independent-actual-producer-DOM-spare', createdAt: new Date().toISOString(),
      mainFixtureSHAAtCreation: mainFixtureSHA(ctx), sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), fixtures, stages: {}, pause: null, UICommandObserved: false };
    ctx.persist();
  }
  assert.equal(record.key, key); assert.equal(record.sourcePinsSHA256, sha(JSON.stringify(ctx.pins)));
  assert.equal(record.fixtures.org.id, root.org.id); assert.equal(record.fixtures.customer.id, root.customer.id);
  assert.notEqual(record.fixtures, root); assert.equal(record.classification, 'independent-actual-producer-DOM-spare');
  const state = new Proxy(ctx.state, {
    get(target, property, receiver) { return property === 'fixtures' ? record.fixtures : Reflect.get(target, property, receiver); },
    set(target, property, value, receiver) {
      assert.notEqual(property, 'fixtures', 'Do not replace the main or nested fixture object');
      return Reflect.set(target, property, value, receiver);
    },
    deleteProperty(target, property) { assert.notEqual(property, 'fixtures'); return Reflect.deleteProperty(target, property); },
  });
  return { ctx: { ...ctx, state, fixtureViewKey: key }, record };
}
