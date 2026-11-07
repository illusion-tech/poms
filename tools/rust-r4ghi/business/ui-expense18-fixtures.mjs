import assert from 'node:assert/strict';
import { sha } from './pure.mjs';
import { actualSpareRecord as actualEOStartRecord } from './ui-lifecycle18-fixtures.mjs';
export { fixturePointer } from './ui-lifecycle18-fixtures.mjs';
export function fixtureFactsHash(ctx) { return sha(JSON.stringify(ctx.state.fixtures)); }
export function resolveCases(ctx, plans) { assert.equal(plans.length, 1); return plans.map(plan => { assert.equal(plan.kind, 'expense-cost-forms'); assert.equal(plan.actorKey, 'manager'); assert.equal(plan.projectIdPointer, '/fixtures/uiFixtureViews23/eo/pause/result/projectId'); const actor = ctx.state.actors.manager, projectId = ctx.state.fixtures.uiFixtureViews23.eo.pause.result.projectId; assert(actor && projectId); return { ...plan, actor, projectId }; }); }
export function actualSpareRecord(ctx, scene, action) {
  assert.equal(scene.kind, 'expense-cost-forms'); assert.equal(action.kind, scene.kind); assert.equal(action.actorKey, 'manager'); assert(!ctx.state.uiExpense18Receipts?.[scene.projectId]);
  // This checks the prior command's real EO, not the actor of the new expense.
  // Actual expense requests still use the scene's real manager cookie/scope.
  return actualEOStartRecord(ctx, { ...scene, kind: 'eo-lifecycle', actor: ctx.state.actors.execution }, { ...action, kind: 'eo-lifecycle', fixtureViewKey: 'eo' });
}
export function recordActualUIReceipt(ctx, pending) { actualSpareRecord(ctx, pending.scene, pending.action); assert.equal(pending.operationId, 'ProjectCostController_confirmCostStageAttribution'); ctx.state.uiExpense18Receipts ??= {}; ctx.state.uiExpense18Receipts[pending.scene.projectId] = { consumerEpoch: ctx.epoch, consumerRun: ctx.run, actualFinalOperation: pending.operationId, observerLedger: pending.ledger, responseOriginal: pending.originals, actualWrites: pending.writes, G3Certified: false }; ctx.persist(); }
