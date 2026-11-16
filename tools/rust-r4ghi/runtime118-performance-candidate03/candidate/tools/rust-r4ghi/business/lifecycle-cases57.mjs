import assert from 'node:assert/strict';
import { data } from './pure.mjs';
import { createApi } from './http.mjs';
import { openFixtureView } from './fixture-view23.mjs';
import { uploadEvidence } from './evidence.mjs';
import { lifecycleConsumer57, ownTask57, taskBody57 } from './lifecycle-consumer57.mjs';
import { concurrentClose57, closeOperation57 } from './lifecycle-race57.mjs';
import { loadSnapshot } from './snapshot.mjs';
import { assertSweepRollback } from './fault-sweep.mjs';
import { requireOwnedScope } from './required-write-inventory.mjs';

function unchanged57(ctx, response, projectId, actor) {
  const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
  const sessionId = requireOwnedScope(ctx, before, { projectId, actorId: ctx.state.actors[actor].id, actorKey: actor });
  return assertSweepRollback(ctx, before, after, { sessionId }, ctx.state.actors[actor].id);
}
async function clones57(ctx, api, actorKey) {
  const original = ctx.state.actors[actorKey], keys = ['a07SameA', 'a07SameB'];
  for (const key of keys) { ctx.state.actors[key] ??= { key, id: original.id, username: original.username, password: original.password, cookies: {}, permissions: [], roleId: original.roleId, orgId: original.orgId };
    assert.equal(ctx.state.actors[key].id, original.id); await api.login(key); }
  assert.notEqual(ctx.state.actors[keys[0]].cookies.poms_session, ctx.state.actors[keys[1]].cookies.poms_session); return keys;
}
export async function ownSameTask57(rootCtx) {
  const producer = openFixtureView(rootCtx, 'own').record; assert(producer.pause?.result.parentCompletionRecordId);
  const projectId = producer.pause.result.projectId, parentId = producer.pause.result.parentCompletionRecordId;
  const { ctx, record } = lifecycleConsumer57(rootCtx, 'same-task-own-B', projectId), api = createApi(ctx);
  if (record.result) return record.result;
  await api.login('unrelated');
  const list = await api.request('ProjectController_listProjectCompletionRecords', { projectId }, null, 'unrelated'), { task } = ownTask57(list, ctx.state.actors.unrelated.id, parentId);
  assert.equal(task.status, 'pending');
  const actual = await ctx.db(async c => (await c.query('SELECT id::text,status,responsible_user_id::text FROM poms.project_completion_condition WHERE completion_record_id=$1::uuid AND project_id=$2::uuid ORDER BY id', [parentId, projectId])).rows);
  assert.equal(actual.length, 2); assert.equal(actual.filter(row => row.status === 'pending').length, 1); assert.equal(actual.find(row => row.status === 'pending').id, task.conditionId, 'Run only after UI14 really closed task A');
  record.purpose ??= await uploadEvidence(ctx, api, { actor: 'unrelated', key: 'a07-same-b', condition: { completionRecordId: parentId, conditionId: task.conditionId }, text: `Real A07 same-task CAS evidence for ${task.conditionId}; no other project or task link.` }); ctx.persist();
  const prepared = await taskBody57(ctx, api, 'unrelated', parentId, record.purpose.attachmentLinkId), keys = await clones57(ctx, api, 'unrelated');
  const result = await concurrentClose57(ctx, api, record, keys.map(actor => ({ ...prepared, actor })), projectId, parentId);
  assert.equal(data(result.winner).completionConditionStatus, 'closed');
  record.result = { kind: 'actual-A07-same-task-double-session-CAS', projectId, parentId, conditionId: task.conditionId, race: result.proof, actualWinnerCount: 1, originalConditionalConclusionUnchanged: true, oldProducerRecordWritten: false, G3Certified: false, G4Certified: false }; ctx.persist(); return record.result;
}
export async function crossParent57(rootCtx) {
  const producer = openFixtureView(rootCtx, 'own').record, projectId = producer.pause.result.projectId, parentId = producer.pause.result.parentCompletionRecordId;
  const { ctx, record } = lifecycleConsumer57(rootCtx, 'cross-parent-own-B', projectId), api = createApi(ctx);
  assert(rootCtx.state.fixtures.completion?.id, 'Main must have a real independently produced completion parent first');
  const wrongParent = rootCtx.state.fixtures.completion.id; assert.notEqual(wrongParent, parentId);
  await api.login('unrelated'); const list = await api.request('ProjectController_listProjectCompletionRecords', { projectId }, null, 'unrelated'), { task } = ownTask57(list, ctx.state.actors.unrelated.id, parentId); assert.equal(task.status, 'pending');
  record.purpose ??= await uploadEvidence(ctx, api, { actor: 'unrelated', key: 'a07-cross-b', condition: { completionRecordId: parentId, conditionId: task.conditionId }, text: `Real A07 negative parent/evidence checks for ${task.conditionId}; task remains pending.` }); ctx.persist();
  const prepared = await taskBody57(ctx, api, 'unrelated', parentId, record.purpose.attachmentLinkId);
  const cases = [
    { name: 'wrong-parent', actor: 'unrelated', params: { ...prepared.params, completionRecordId: wrongParent }, body: prepared.body, status: 404 },
    { name: 'foreign-project-evidence', actor: 'unrelated', params: prepared.params, body: { ...prepared.body, evidenceRefs: [{ attachmentLinkId: rootCtx.state.fixtures.deliveryEvidence.attachmentLinkId }] }, status: 409 },
    { name: 'wrong-responsible-owner', actor: 'manager', params: prepared.params, body: prepared.body, status: 403 },
  ];
  await api.login('manager'); record.results ??= {};
  for (const item of cases) { if (record.results[item.name]) continue; const response = await api.request(closeOperation57, item.params, item.body, item.actor, { expectedStatus: item.status });
    record.results[item.name] = ctx.artifact(`${ctx.next('a07-negative')}.json`, { name: item.name, receipt: response.receiptId, expectedStatus: item.status, rollback: unchanged57(ctx, response, projectId, item.actor), taskStillUnconsumed: true }); ctx.persist(); }
  return { kind: 'actual-A07-dual-UUID-project-and-responsibility-rejections', projectId, parentId, results: record.results, oldProducerRecordWritten: false, G3Certified: false, G4Certified: false };
}
export async function sensitiveGet57(rootCtx) {
  const f = rootCtx.state.fixtures; assert(f.maskProject?.id && f.maskFixtureComplete, 'Wait for the actual H16 MASK person-owned fixture; full manager projections do not emit a hidden-field event');
  const projectId = f.maskProject.id, { ctx, record } = lifecycleConsumer57(rootCtx, 'sensitive-get-mask', projectId), api = createApi(ctx); await api.login('person');
  const permissions = ctx.state.actors.person.permissions; assert(permissions.includes('contract:finance:manage')); assert(!permissions.includes('operating:finance:sensitive:read'));
  if (record.proof) return { proof: record.proof, noFailedProbeReplay: true };
  const response = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId }, null, 'person', { expectedStatus: 500,
    query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' }, fi: { table: 'security_event', event: 'INSERT', field: 'request_id', eventType: 'sensitive_field.masked' } });
  assert.equal(response.fault.hitCount, 1); const payload = data(response); assert.equal(payload.statusCode, 500);
  for (const key of ['financialProjection', 'preparation', 'officialCurrent', 'sourceRows', 'reasonItems', 'evaluationRefs']) assert(!Object.hasOwn(payload, key), 'Necessary sensitive audit failure must expose no protected success payload');
  const rollback = unchanged57(ctx, response, projectId, 'person');
  const success = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId }, null, 'person', { query: { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime' } });
  record.proof = ctx.artifact(`${ctx.next('a07-sensitive-get-proof')}.json`, { failed: response.receiptId, actualPrimaryHits: response.fault.hitCount, rollback, noPayloadOnFailure: true, successfulRead: success.receiptId,
    actualProjectionEvent: 'sensitive_field.masked', allPermissionFullReadNotMisrepresentedAsAudited: true }); ctx.persist(); return { kind: 'actual-A07-required-sensitive-GET-audit-failure', proof: record.proof, G3Certified: false, G4Certified: false };
}
