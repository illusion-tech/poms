import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function fixtureFactsHash(ctx) {
  const facts = structuredClone(ctx.state.fixtures);
  for (const record of [facts.creatorOwnership23, facts.uiFixtureViews23?.eo, facts.uiFixtureViews23?.own].filter(Boolean)) {
    for (const key of ['UICommandObserved', 'UICommandObserverReceipt', 'UICommandResponseOriginal', 'UICommandOperationId']) delete record[key];
  }
  return createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}

/** Returns the real persisted record itself; never clones ctx/state/owned or swaps root fixtures. */
export function actualSpareRecord(ctx, scene, action) {
  if (scene.kind === 'creator') {
    const record = ctx.state.fixtures.creatorOwnership23; assert(record && record.uiSpareProjectId === scene.projectId, 'Only I23/24 actual Creator UI spare is eligible'); return record;
  }
  const key = scene.kind === 'execution-owner' ? 'eo' : scene.kind === 'own-condition' ? 'own' : null; assert(key && action.fixtureViewKey === key);
  const record = ctx.state.fixtures.uiFixtureViews23?.[key]; assert(record?.pause?.result && record.pause.result.projectId === scene.projectId);
  assert.equal(record.pause.result.commandActor, scene.actorKey); assert.equal(record.pause.result.commandActorId, scene.actor.id);
  if (key === 'own') assert.equal(record.pause.result.parentCompletionRecordId, action.completionRecordId);
  assert(!record.UICommandObserved, 'Consumed UI spare is not a fresh pre-command fixture'); return record;
}

/** Call only after actual UI response, complete exact ledger, DB postcondition checks and final invariant. */
export function recordActualUIReceipt(ctx, pending) {
  const record = actualSpareRecord(ctx, pending.scene, pending.action);
  record.UICommandObserved = true;
  record.UICommandObserverReceipt = pending.ledger;
  record.UICommandResponseOriginal = pending.originals;
  record.UICommandOperationId = pending.operationId;
  // Persist is Root's original closure, also when preparers use openFixtureView.
  ctx.persist();
}
