import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function exactKeys(value, required, optional = []) {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  assert(required.every(key => Object.hasOwn(value, key)));
  assert(Object.keys(value).every(key => required.includes(key) || optional.includes(key)), 'Unknown binding input key');
}
export function validateInput(input, bytes, approvedSHA256, kind) {
  assert.equal(sha(bytes), approvedSHA256, 'Root must approve exact raw input JSON, including all file hashes');
  exactKeys(input, ['schemaVersion', 'kind', 'purpose', 'plan', 'sourceManifest', 'candidateReceipt', 'apiProcess'], kind === 'generate-real-recorded-binding16' ? ['actorProofIndex'] : []);
  assert.equal(input.schemaVersion, 1); assert.equal(input.kind, kind); assert(['fixtures', 'dom'].includes(input.purpose));
  if (kind === 'generate-real-recorded-binding16') assert(Object.hasOwn(input, 'actorProofIndex'));
  for (const key of ['plan', 'sourceManifest', 'candidateReceipt', 'apiProcess', ...(input.actorProofIndex ? ['actorProofIndex'] : [])]) {
    const item = input[key]; exactKeys(item, ['file', 'rawBytesSha256']);
    assert(typeof item.file === 'string' && item.file.startsWith('/')); assert(/^[0-9a-f]{64}$/.test(item.rawBytesSha256));
  }
  return input;
}
export function usedActorKeys(plan) {
  assert(Array.isArray(plan.cases) && Array.isArray(plan.writeActions));
  const participants = plan.writeActions.flatMap(item => {
    if (!Object.hasOwn(item, 'participants')) return [];
    assert(Array.isArray(item.participants)); return item.participants.map(row => row.actorKey);
  });
  const observerActors = plan.writeActions.flatMap(item => {
    if (!Object.hasOwn(item, 'publicRevisedDraftRace')) return [];
    assert.equal(item.kind, 'role-forms'); exactKeys(item.publicRevisedDraftRace, ['actorKey', 'expectedVerdict']);
    assert.equal(item.publicRevisedDraftRace.expectedVerdict, 'freeze200-peer-revised409');
    assert.notEqual(item.publicRevisedDraftRace.actorKey, item.actorKey);
    return [item.publicRevisedDraftRace.actorKey];
  });
  let additional = [];
  if (Object.hasOwn(plan, 'actorProofKeys')) {
    assert.equal(plan.metadata16?.purpose, 'fixtures', 'Additional actor proofs are fixture metadata only, never DOM cases');
    assert(Array.isArray(plan.actorProofKeys) && plan.actorProofKeys.length > 0 && plan.actorProofKeys.length <= 64);
    assert.equal(new Set(plan.actorProofKeys).size, plan.actorProofKeys.length, 'Additional actor keys must be explicit and unique');
    additional = plan.actorProofKeys;
  }
  const result = [...new Set([...plan.cases.map(item => item.actorKey), ...plan.writeActions.filter(item => item.targetOwnerActorKey).map(item => item.targetOwnerActorKey), ...participants, ...observerActors, ...additional])];
  assert(result.length > 0 && result.every(key => typeof key === 'string' && /^[a-z][a-z0-9-]*$/.test(key)));
  return result;
}
export function assertActorResponse(response, actor) {
  assert(actor?.id && actor.roleId && actor.orgId);
  const actual = response?.data ?? response;
  assert(actual.authenticated === true && actual.user?.id === actor.id);
  assert(Array.isArray(actual.permissions)); assert.deepEqual([...actual.permissions].sort(), [...actor.permissions].sort(), 'Refresh actual login/state after role changes; never silently rebase actor permissions');
  return actual.permissions;
}
export function assertFinalFixtures(state, plan) {
  const f = state.fixtures;
  for (const kind of ['creator', 'execution-owner', 'own-condition']) {
    if (!plan.cases.some(item => item.kind === kind)) continue;
    const record = kind === 'creator' ? f.creatorOwnership23 : f.uiFixtureViews23?.[kind === 'execution-owner' ? 'eo' : 'own'];
    assert(record && !record.UICommandObserved, 'Actual fresh persisted I23/24 UI spare required');
    if (kind === 'creator') {
      assert(record.uiSpareProjectId && record.uiSpareAnchor?.view?.projectId === record.uiSpareProjectId && record.uiSpareAnchor.receipt);
      assert.equal(record.uiSpareAnchor.view.scopeKind, 'creator-first-assignment-only'); assert.equal(record.uiSpareAnchor.view.ownerUserId, null);
      assert.deepEqual(record.uiSpareAnchor.view.allowedActions, ['reassign-owner']);
    }
    else {
      const pause = record.pause?.result;
      assert(pause?.projectId && pause.commandActorId === state.actors[pause.commandActor]?.id);
      if (kind === 'own-condition') assert(pause.parentCompletionRecordId);
      else assert.equal(pause.parentCompletionRecordId, null);
    }
  }
  if (plan.cases.some(item => item.kind === 'execution-owner')) assert.deepEqual([...state.actors.execution.permissions].sort(), ['project:read', 'project:write'].sort());
  if (plan.cases.some(item => item.kind === 'sensitive-mask')) assert.deepEqual([...state.actors.person.permissions].sort(), ['project:read', 'project:write', 'contract:finance:manage'].sort());
  const eo = f.uiFixtureViews23?.eo?.pause?.result, own = f.uiFixtureViews23?.own?.pause?.result;
  if (plan.cases.some(item => item.kind === 'execution-owner') && plan.cases.some(item => item.kind === 'own-condition')) assert.notEqual(eo.projectId, own.projectId);
}
