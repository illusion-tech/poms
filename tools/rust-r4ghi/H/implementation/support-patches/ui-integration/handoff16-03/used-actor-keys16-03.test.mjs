import test from 'node:test';
import assert from 'node:assert/strict';
import { usedActorKeys, assertActorResponse } from './proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
const base = () => ({ cases: [{ kind: 'money-max', actorKey: 'manager' }, { kind: 'sensitive-mask', actorKey: 'person' }], writeActions: [], metadata16: { purpose: 'fixtures' } });
test('existing actual MAX/MASK actors remain unchanged without extra metadata', () => {
  assert.deepEqual(usedActorKeys(base()), ['manager', 'person']);
});
test('fixture proof keys cover real E/F/unrelated setup actors without fake DOM cases', () => {
  const plan = base(); plan.actorProofKeys = ['execution', 'finance', 'unrelated'];
  assert.deepEqual(usedActorKeys(plan), ['manager', 'person', 'execution', 'finance', 'unrelated']);
  assert.equal(plan.cases.length, 2); assert.deepEqual(plan.writeActions, []);
});
test('extra actor metadata cannot enter a final DOM binding or an unprepared plan', () => {
  for (const metadata16 of [{ purpose: 'dom' }, undefined]) assert.throws(() => usedActorKeys({ ...base(), metadata16, actorProofKeys: ['finance'] }));
});
test('additional keys must be an explicit nonempty unique array with valid actor names', () => {
  for (const actorProofKeys of [[], ['finance', 'finance'], 'finance', [null], ['../finance']]) assert.throws(() => usedActorKeys({ ...base(), actorProofKeys }));
});
test('actual role participants and Creator target owner are included from real write actions', () => {
  const plan = { cases: [{ kind: 'role-forms', actorKey: 'manager' }], metadata16: { purpose: 'dom' }, writeActions: [
    { kind: 'role-forms', participants: [{ actorKey: 'manager' }, { actorKey: 'execution' }, { actorKey: 'finance' }, { actorKey: 'manager' }] },
    { kind: 'creator', targetOwnerActorKey: 'person' },
  ] };
  assert.deepEqual(usedActorKeys(plan), ['manager', 'person', 'execution', 'finance']);
  assert.throws(() => usedActorKeys({ ...plan, writeActions: [{ participants: { actorKey: 'finance' } }] }));
});
test('additional collection still requires actual current-auth identity and unchanged permissions', () => {
  const actor = { id: 'actual', roleId: 'role', orgId: 'org', permissions: ['project:read'] };
  assert.deepEqual(assertActorResponse({ authenticated: true, user: { id: 'actual' }, permissions: ['project:read'] }, actor), ['project:read']);
  assert.throws(() => assertActorResponse({ authenticated: true, user: { id: 'other' }, permissions: ['project:read'] }, actor));
  assert.throws(() => assertActorResponse({ authenticated: true, user: { id: 'actual' }, permissions: ['project:write'] }, actor));
});
