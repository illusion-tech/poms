import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';

export function lifecycleConsumer57(rootCtx, key, projectId) {
  rootCtx.state.consumerChecks ??= {}; rootCtx.state.consumerChecks.lifecycle57 ??= {};
  const store = rootCtx.state.consumerChecks.lifecycle57;
  const record = store[key] ??= { projectId: uuid(projectId), fixtures: { project: { id: projectId }, uploads: {} }, checks: {} }; rootCtx.persist();
  assert.equal(record.projectId, projectId);
  const state = new Proxy(rootCtx.state, { get(target, name, receiver) { return name === 'fixtures' ? record.fixtures : Reflect.get(target, name, receiver); },
    set(target, name, value, receiver) { assert.notEqual(name, 'fixtures'); return Reflect.set(target, name, value, receiver); } });
  return { ctx: { ...rootCtx, state, consumerCheckKey57: key }, record };
}
export function ownTask57(response, actorId, parentId) {
  const value = data(response); assert.equal(value.scopeKind, 'own-condition-only');
  const parent = value.items.find(item => item.completionRecordId === parentId); assert(parent && parent.ownTasks.length === 1);
  const task = parent.ownTasks[0]; assert.equal(task.responsibleUserId, actorId); uuid(task.conditionId);
  return { parent, task, projectId: value.projectId };
}
export async function taskBody57(ctx, api, actor, parentId, evidenceLinkId) {
  const response = await api.request('ProjectController_listProjectCompletionRecords', { projectId: ctx.state.fixtures.project.id }, null, actor);
  const { parent, task } = ownTask57(response, ctx.state.actors[actor].id, parentId); assert.equal(task.status, 'pending');
  return { params: { completionRecordId: parentId, id: task.conditionId }, body: { inputVersion: 'server-derived-v1', expectedCompletionVersion: parent.completionRowVersion,
    expectedConditionVersion: task.conditionRowVersion, closureSummary: '本人以本任务真实purpose证据关闭；独立验收CAS/并发原件保留，不代其他责任人。', evidenceRefs: [{ attachmentLinkId: uuid(evidenceLinkId) }] }, task, parent, listReceipt: response.receiptId };
}
