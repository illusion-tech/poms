import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha, keyOf } from './pure.mjs';
import { cases26 } from './a05-values26.mjs';
import { assertAdmittedFixtureSource } from './consumer-admission54.mjs';
export function boundaryMainSHA26(ctx) { const { a05Boundaries26: ignored, ...main } = ctx.state.fixtures; return sha(JSON.stringify(main)); }
export function openA05View26(ctx, name) {
  assert(Object.hasOwn(cases26, name)); assert(!ctx.fixtureViewKey);
  const root = ctx.state.fixtures; assert(root.platformComplete && root.customer?.id && root.org?.id && root.roles);
  assert(ctx.state.owned[keyOf(ctx.database, 'customer', [root.customer.id])]);
  root.a05Boundaries26 ??= { views: {} };
  let record = root.a05Boundaries26.views[name];
  if (!record) {
    const fixtures = { platformComplete: true, customer: structuredClone(root.customer), org: structuredClone(root.org), roles: structuredClone(root.roles) };
    if (root.plannedDate) fixtures.plannedDate = root.plannedDate;
    if (root.executionMinimalRole) fixtures.executionMinimalRole = structuredClone(root.executionMinimalRole);
    record = root.a05Boundaries26.views[name] = { name, sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), scenario: cases26[name], fixtures, stages: {} }; ctx.persist();
  }
  assert.deepEqual(record.scenario, cases26[name]);
  assertAdmittedFixtureSource(ctx, { registryPath: `/fixtures/a05Boundaries26/views/${name}`, record, projectIds: [record.fixtures.project?.id].filter(Boolean) });
  const state = new Proxy(ctx.state, { get(target, key, receiver) { return key === 'fixtures' ? record.fixtures : Reflect.get(target, key, receiver); },
    set(target, key, value, receiver) { assert.notEqual(key, 'fixtures'); return Reflect.set(target, key, value, receiver); },
    deleteProperty(target, key) { assert.notEqual(key, 'fixtures'); return Reflect.deleteProperty(target, key); } });
  return { ctx: { ...ctx, state, fixtureViewKey: `a05-${name}` }, record };
}
export async function boundaryStep26(ctx, record, name, run) {
  const old = record.stages[name];
  if (old) { assert.equal(old.phase, 'verified', 'Interrupted actual producer step needs exact Root reconciliation; never replay a committed command'); const bytes = fs.readFileSync(old.receipt.file); assert.equal(sha(bytes), old.receipt.rawBytesSha256); return JSON.parse(bytes); }
  record.stages[name] = { phase: 'running' }; ctx.persist();
  const result = await run(); const receipt = ctx.artifact(`${ctx.next(`a05-${record.name}-${name}`)}.json`, result, { kind: 'actual-A05-independent-boundary-step', case: record.name, step: name, executedByAuthor: false, G3Certified: false, G4Certified: false });
  record.stages[name] = { phase: 'verified', receipt }; ctx.persist(); return result;
}
