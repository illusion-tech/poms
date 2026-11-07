import assert from 'node:assert/strict';
import { data } from './pure.mjs';
import { createApi } from './http.mjs';
import { pauseBeforeOwnList } from './pause-boundary23.mjs';
import { lifecycleConsumer57, ownTask57, taskBody57 } from './lifecycle-consumer57.mjs';
import { uploadEvidence } from './evidence.mjs';
import { concurrentClose57, closeOperation57 } from './lifecycle-race57.mjs';

export async function prepareTwoTask57(rootCtx) {
  const source = rootCtx.state.fixtures.a05Boundaries26?.views?.['cent-max'];
  assert(source?.result?.published && source.fixtures.a05SnapshotHTTP?.proof && source.fixtures.a05SnapshotHTTP.proofPending === false, 'Finish actual A05 cent-max publication before reusing its project');
  const { ctx, record } = lifecycleConsumer57(rootCtx, 'different-tasks-cent-max', source.fixtures.project.id), api = createApi(ctx), f = ctx.state.fixtures;
  assert(!source.fixtures.completion, 'Do not take a project already consumed by another lifecycle/UI flow');
  if (record.prepared) return record.prepared;
  assert(!record.preparationStarted, 'Interrupted actual lifecycle preparation requires exact originals reconciliation');
  for (const actor of ['execution', 'condition', 'unrelated']) await api.login(actor);
  const live = data(await api.request('ProjectController_getById', { id: f.project.id }, null, 'execution'));
  assert.equal(live.scopeKind, 'full-project'); assert.equal(live.currentStage, 'execution'); assert.equal(live.currentStageRecordId, source.fixtures.execution.projectStageRecordId);
  f.executionComplete = true; f.execution = source.fixtures.execution; record.sourcePublishedSnapshotProof = source.fixtures.a05SnapshotHTTP.proof;
  record.preparationStarted = true; ctx.persist();
  const boundary = await pauseBeforeOwnList(ctx, api); assert.equal(boundary.operationId, 'ProjectController_listProjectCompletionRecords');
  record.prepared = { projectId: f.project.id, parentId: f.completion.id, boundary, realTwoConditionsPending: true, originalPublishedSnapshotProof: record.sourcePublishedSnapshotProof,
    moneyOrOriginalProducerRecordWritten: false, currentLifecycleFactsAreConsumerChecksOnly: true }; ctx.persist(); return record.prepared;
}
export async function differentTasks57(rootCtx) {
  const prepared = await prepareTwoTask57(rootCtx), { ctx, record } = lifecycleConsumer57(rootCtx, 'different-tasks-cent-max', prepared.projectId), api = createApi(ctx), parentId = prepared.parentId;
  if (record.result) return record.result;
  assert(!record.raceAttempt, 'Reconcile an existing race before attempting closure again');
  const inputs = [];
  for (const actor of ['condition', 'unrelated']) {
    await api.login(actor); const list = await api.request('ProjectController_listProjectCompletionRecords', { projectId: prepared.projectId }, null, actor), { task } = ownTask57(list, ctx.state.actors[actor].id, parentId); assert.equal(task.status, 'pending');
    record.purposes ??= {}; record.purposes[actor] ??= await uploadEvidence(ctx, api, { actor, key: `a07-two-${actor}`, condition: { completionRecordId: parentId, conditionId: task.conditionId }, text: `Real A07 different-task purpose for ${task.conditionId}, personal actor ${actor}; parent CAS must not skip another task.` }); ctx.persist();
    const input = await taskBody57(ctx, api, actor, parentId, record.purposes[actor].attachmentLinkId); inputs.push({ ...input, actor });
  }
  assert.equal(inputs[0].body.expectedCompletionVersion, inputs[1].body.expectedCompletionVersion); assert.notEqual(inputs[0].params.id, inputs[1].params.id);
  const result = await concurrentClose57(ctx, api, record, inputs, prepared.projectId, parentId); assert.equal(data(result.winner).completionConditionStatus, 'pending');
  record.refreshedLoser ??= { phase: 'refresh-pending' }; ctx.persist();
  const loserActor = result.loser.actorKey, original = inputs.find(input => input.actor === loserActor);
  const fresh = await taskBody57(ctx, api, loserActor, parentId, record.purposes[loserActor].attachmentLinkId);
  assert.equal(fresh.body.expectedConditionVersion, original.body.expectedConditionVersion); assert.equal(fresh.body.expectedCompletionVersion, original.body.expectedCompletionVersion + 1);
  record.refreshedLoser.phase = 'actual-resubmission-starting'; ctx.persist();
  const response = await api.request(closeOperation57, fresh.params, fresh.body, loserActor, { responseBirths: [{ table: 'project_completion_condition_closure', pointer: '/closureRecordId' }], mutableTables: ['project_completion_record', 'project_completion_condition'],
    updatedAnchors: [{ table: 'project_completion_record', id: parentId, requestBinding: 'path:completionRecordId' }, { table: 'project_completion_condition', id: fresh.params.id, requestBinding: 'path:id' }] });
  record.refreshedLoser = { phase: 'success-proof-pending', receipt: response.receiptId, before: response.before, after: response.after }; ctx.persist();
  const closed = data(response); assert.equal(closed.completionConditionStatus, 'closed'); assert.notEqual(closed.closureRecordId, data(result.winner).closureRecordId);
  const rows = await ctx.db(async c => (await c.query('SELECT condition_status,completion_result,row_version,(SELECT count(*)::int FROM poms.project_completion_condition c WHERE c.completion_record_id=p.id AND c.status=\'closed\') closed_count,(SELECT count(*)::int FROM poms.project_completion_condition_closure r WHERE r.completion_record_id=p.id) closure_count FROM poms.project_completion_record p WHERE p.id=$1::uuid AND p.project_id=$2::uuid', [parentId, prepared.projectId])).rows);
  assert.equal(rows.length, 1); assert.equal(rows[0].condition_status, 'closed'); assert.equal(rows[0].completion_result, 'conditional-completed'); assert.equal(rows[0].closed_count, 2); assert.equal(rows[0].closure_count, 2);
  record.refreshedLoser.phase = 'verified'; record.result = { kind: 'actual-A07-two-different-tasks-parent-CAS-and-server-aggregate', projectId: prepared.projectId, parentId, race: result.proof,
    explicitFreshParentRetry: response.receiptId, finalActual: rows, actualTwoOriginalCASRequestsHadOnlyOneWinner: true, finalAggregateAfterBothActualClosuresOnly: true,
    originalConditionalResultAndA05MoneyUnchanged: true, oldProducerViewWritten: false, G3Certified: false, G4Certified: false }; ctx.persist(); return record.result;
}
