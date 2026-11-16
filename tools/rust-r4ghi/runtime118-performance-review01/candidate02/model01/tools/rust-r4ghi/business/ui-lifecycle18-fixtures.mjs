import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { sha } from './pure.mjs';

export function fixturePointer(state, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/fixtures/'));
  return pointer.split('/').slice(1).reduce((value, key) => { assert(value && Object.hasOwn(value, key)); return value[key]; }, state);
}
export function fixtureFactsHash(ctx) { return sha(JSON.stringify(ctx.state.fixtures)); }
export function actualSpareRecord(ctx, scene, action) {
  assert.equal(scene.kind, 'eo-lifecycle'); assert.equal(action.fixtureViewKey, 'eo'); const record = ctx.state.fixtures.uiFixtureViews23?.eo;
  assert(record?.pause?.result?.projectId === scene.projectId && record.pause.result.commandActorId === scene.actor.id);
  assert(record.UICommandObserved === true && record.UICommandOperationId === 'ProjectController_startExecution', 'EO must actually enter execution through the earlier real UI first');
  assert(!ctx.state.uiLifecycle18Receipts?.[scene.projectId], 'Do not replay an already consumed lifecycle UI continuation');
  const { assertAdmittedFixtureSource } = createRequire(import.meta.url)('./consumer-admission54.mjs');
  const admitted = assertAdmittedFixtureSource(ctx, { registryPath: '/fixtures/uiFixtureViews23/eo', record, projectIds: [scene.projectId] }); assert(admitted && typeof admitted.then !== 'function');
  const pin = record.UICommandResponseOriginal; assert(pin?.file?.startsWith(ctx.priv + '/') && /^[0-9a-f]{64}$/.test(pin.rawBytesSha256));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); const original = JSON.parse(bytes), actual = original.attempt;
  assert.equal(actual.operationId, 'ProjectController_startExecution'); assert.equal(actual.actorId, scene.actor.id); assert.equal(actual.pathParams.id, scene.projectId); assert.equal(actual.status, 200); assert.equal(actual.expectedStatus, 200);
  assert.equal(actual.transport, 'actual-owned-Windows-browser-Linux-proxy'); assert(actual.responseComplete && !actual.transportFailure && !original.failure);
  assert.equal(actual.body?.businessStatusAfter, 'execution'); assert(actual.body?.projectStageRecordId); return record;
}
export function resolveCases(ctx, plans) {
  assert.equal(plans.length, 1); return plans.map(plan => {
    assert.equal(plan.kind, 'eo-lifecycle'); assert.equal(plan.projectIdPointer, '/fixtures/uiFixtureViews23/eo/pause/result/projectId');
    const actor = ctx.state.actors[plan.actorKey]; assert(actor); assert.deepEqual([...actor.permissions].sort(), ['project:read', 'project:write'].sort());
    return { ...plan, projectId: fixturePointer(ctx.state, plan.projectIdPointer), actor };
  });
}
export function recordActualUIReceipt(ctx, pending) {
  actualSpareRecord(ctx, pending.scene, pending.action); assert.equal(pending.operationId, 'ProjectController_createProjectArchiveRecord');
  ctx.state.uiLifecycle18Receipts ??= {};
  ctx.state.uiLifecycle18Receipts[pending.scene.projectId] = { kind: 'actual-EO-UI-lifecycle-continued-from-entered-execution', consumerEpoch: ctx.epoch, consumerRun: ctx.run,
    actualFinalOperation: pending.operationId, observerLedger: pending.ledger, responseOriginal: pending.originals, actualWrites: pending.writes, G3Certified: false };
  // Root's original persist closure. Producer record/source/f.execution remain untouched.
  ctx.persist();
}
