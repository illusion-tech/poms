// New real producer spares only. Never rewrites the producer source of a retained23/26 record.
import assert from 'node:assert/strict';
import { keyOf, sha } from './pure.mjs';

export function otherFixturesSHA18(ctx) {
  const { uiFormFixtureViews18: ignored, ...other } = ctx.state.fixtures;
  return sha(JSON.stringify(other));
}
export function openFormFixtureView18(ctx, key) {
  assert(['role-create', 'gh-capture'].includes(key)); assert(!ctx.fixtureViewKey);
  const root = ctx.state.fixtures; assert(root.platformComplete && root.org?.id && root.customer?.id && root.roles);
  for (const [table, id] of [['org_unit', root.org.id], ['customer', root.customer.id]]) assert(ctx.state.owned[keyOf(ctx.database, table, [id])], 'Only actual Root run-owned/admitted core refs may initialize a new spare');
  root.uiFormFixtureViews18 ??= {}; let record = root.uiFormFixtureViews18[key];
  if (!record) {
    const fixtures = { platformComplete: true, org: structuredClone(root.org), customer: structuredClone(root.customer), roles: structuredClone(root.roles) };
    if (root.plannedDate) fixtures.plannedDate = root.plannedDate;
    if (root.executionMinimalRole) fixtures.executionMinimalRole = structuredClone(root.executionMinimalRole);
    record = root.uiFormFixtureViews18[key] = { key, classification: 'independent-actual-producer-remaining-A08-form-spare', producerEpoch: ctx.epoch, producerRun: ctx.run,
      sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), createdAt: new Date().toISOString(), fixtures, stages: {}, pause: null, UICommandObserved: false };
    ctx.persist();
  }
  assert.equal(record.producerEpoch, ctx.epoch, 'Old producer epoch needs explicit separate consumer admission; never relabel it'); assert.equal(record.producerRun, ctx.run);
  assert.equal(record.sourcePinsSHA256, sha(JSON.stringify(ctx.pins)), 'A new source epoch cannot silently rebind this spare');
  assert.equal(record.fixtures.org.id, root.org.id); assert.equal(record.fixtures.customer.id, root.customer.id); assert(!record.UICommandObserved);
  const state = new Proxy(ctx.state, {
    get(target, property, receiver) { return property === 'fixtures' ? record.fixtures : Reflect.get(target, property, receiver); },
    set(target, property, value, receiver) { assert.notEqual(property, 'fixtures'); return Reflect.set(target, property, value, receiver); },
    deleteProperty(target, property) { assert.notEqual(property, 'fixtures'); return Reflect.deleteProperty(target, property); }
  });
  return { ctx: { ...ctx, state, fixtureViewKey: `ui-forms18-${key}` }, record };
}
