import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';
import { uploadEvidence } from './evidence.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
const exactKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Narrow DTO contains unexpected or missing properties');
function ownList(value, actorId, completionId) {
  exactKeys(value, ['scopeKind', 'projectId', 'items']); assert.equal(value.scopeKind, 'own-condition-only');
  const parent = value.items.find(p => p.completionRecordId === completionId); assert(parent);
  exactKeys(parent, ['completionRecordId', 'completionRowVersion', 'conditionStatus', 'ownTasks']); assert.equal(parent.ownTasks.length, 1);
  for (const task of parent.ownTasks) { exactKeys(task, ['conditionId', 'conditionRowVersion', 'summary', 'responsibleUserId', 'dueAt', 'status', 'evidenceRefs', 'closure']); assert.equal(task.responsibleUserId, actorId); }
  return parent;
}
export async function lifecycleAcceptance(ctx, api, { requiredWriteSweep = false } = {}) {
  const f = ctx.state.fixtures; assert(f.executionComplete && !f.lifecycleComplete);
  if (requiredWriteSweep) {
    const prior = [['acceptanceEntry', 'ProjectController_startAcceptance', f.project.id], ['finalAcceptance', 'ProjectController_createAcceptanceRecord', f.project.id],
      ['completion', 'ProjectController_createProjectCompletionRecord', f.project.id], ['archive', 'ProjectController_createProjectArchiveRecord', f.project.id],
      ['replacementArchive', 'ProjectArchiveRecordController_replaceProjectArchiveRecord', f.archive?.id], ['archiveVoided', 'ProjectArchiveRecordController_voidProjectArchiveRecord', f.replacementArchive?.id]];
    for (const [field, operationId, id] of prior) if (f[field]) assert(f.requiredWriteSweepReceipts?.[operationId + ':' + id], `Existing ordinary ${field} is not FI coverage`);
    for (const closed of Object.values(f.conditionClosures ?? {}).map(c => c.closed).filter(Boolean)) assert(f.requiredWriteSweepReceipts?.['ProjectCompletionRecordController_closeCompletionCondition:' + closed.conditionId], 'Existing ordinary closure is not FI coverage');
  }
  const call = async (op, params, body = null, binding = {}, actor = 'execution') => data(await api.request(op, params, body, actor, binding));
  const write = async (op, params, body, binding, actor = 'execution') => {
    if (!requiredWriteSweep) return call(op, params, body, binding, actor);
    const { faultSweepAndRetry } = await import('./fault-sweep.mjs');
    const result = await faultSweepAndRetry(ctx, api, { operationId: op, params, body, binding, actor });
    f.requiredWriteSweepReceipts ??= {}; f.requiredWriteSweepReceipts[op + ':' + (params.id ?? params.projectId ?? '')] = result.receipt; ctx.persist(); return data(result.successful);
  };
  const projectRead = () => call('ProjectController_getById', { id: f.project.id });
  if (!f.deliveryEvidence) { f.deliveryEvidence = await uploadEvidence(ctx, api, { actor: 'execution', key: 'delivery', text: `POMS ${ctx.state.prefix}\nProject ${f.project.id}\nActual HTTP uploaded delivery evidence for this isolated acceptance fixture.\n` }); ctx.persist(); }
  const refs = [{ attachmentLinkId: uuid(f.deliveryEvidence.attachmentLinkId) }];
  if (!f.acceptanceEntry) {
    f.project = await projectRead();
    f.acceptanceEntry = await write('ProjectController_startAcceptance', { id: f.project.id }, { inputVersion: 'server-derived-v1', expectedProjectVersion: rv(f.project),
      executionStageRecordId: uuid(f.execution.projectStageRecordId), evidenceRefs: refs, evidenceSummary: '实际HTTP上传的本隔离验收交付文件。', readinessSummary: '真实执行准入负责人核对交付文件后进入验收。' },
      { responseBirths: [{ table: 'project_stage_record', pointer: '/projectStageRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  assert.equal(f.acceptanceEntry.businessStatusAfter, 'acceptance');
  if (!f.finalAcceptance) {
    f.project = await projectRead();
    f.finalAcceptance = await write('ProjectController_createAcceptanceRecord', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', acceptanceType: 'final-acceptance', acceptanceResult: 'conditional',
      scopeSummary: '本隔离验收项目整体最终验收。', evidenceSummary: '核对实际交付附件与同链执行事实。', conditionalSummary: '由两名真实责任人分别补交独立关闭文件后才能归档。',
      expectedProjectVersion: rv(f.project), evidenceRefs: refs, acceptanceStageRecordId: uuid(f.acceptanceEntry.projectStageRecordId) },
      { responseBirths: [{ table: 'acceptance_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:projectId' }] }); ctx.persist();
  }
  const accepted = await call('ProjectController_listAcceptanceRecords', { projectId: f.project.id }); assert(accepted.some(a => a.id === f.finalAcceptance.id && a.acceptanceType === 'final-acceptance'));
  if (!f.completion) {
    f.conditionAInitial = await uploadEvidence(ctx, api, { actor: 'execution', key: 'condition-a-initial', text: `POMS ${ctx.state.prefix}\nOnly condition A initial instruction/evidence. No parent acceptance or condition B materials.\n` });
    f.conditionBInitial = await uploadEvidence(ctx, api, { actor: 'execution', key: 'condition-b-initial', text: `POMS ${ctx.state.prefix}\nOnly condition B initial instruction/evidence. No parent acceptance or condition A materials.\n` });
    f.conditionDueAt ??= new Date(Date.now() + 7 * 86400000).toISOString(); f.project = await projectRead(); ctx.persist();
    f.completion = await write('ProjectController_createProjectCompletionRecord', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', acceptanceRecordId: uuid(f.finalAcceptance.id), expectedAcceptanceVersion: rv(f.finalAcceptance),
      completionResult: 'conditional-completed', completedAt: await ctx.instant(), completionSummary: '按真实最终附条件验收记录附条件完工，原始结论保持不可变。', evidenceSummary: '实际交付文件及两项独立责任任务。',
      expectedProjectVersion: rv(f.project), evidenceRefs: refs, completionConditions: [
        { summary: '责任人A本人上传本任务新purpose文件并提交关闭。', responsibleUserId: ctx.state.actors.condition.id, dueAt: f.conditionDueAt, evidenceRefs: [{ attachmentLinkId: f.conditionAInitial.attachmentLinkId }] },
        { summary: '责任人B本人上传本任务新purpose文件并提交关闭。', responsibleUserId: ctx.state.actors.unrelated.id, dueAt: f.conditionDueAt, evidenceRefs: [{ attachmentLinkId: f.conditionBInitial.attachmentLinkId }] },
      ] }, { responseBirths: [{ table: 'project_completion_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:projectId' }] }); ctx.persist();
  }
  assert.equal(f.completion.completionResult, 'conditional-completed'); assert.equal(f.completion.conditionStatus, 'pending');
  if (!f.pendingArchiveBlocked) {
    f.project = await projectRead();
    await call('ProjectController_createProjectArchiveRecord', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', archivedAt: await ctx.instant(), archiveSummary: '此请求必须因未关闭真实条件而拒绝。',
      evidenceSummary: '检查pending条件阻止归档。', expectedProjectVersion: rv(f.project) }, { expectedStatus: 409 });
    f.pendingArchiveBlocked = true; ctx.persist();
  }
  f.conditionClosures ??= {};
  for (const [index, actor] of ['condition', 'unrelated'].entries()) {
    const actorId = ctx.state.actors[actor].id;
    await call('ProjectController_getById', { id: f.project.id }, null, { expectedStatus: 404 }, actor);
    let parent = ownList(await call('ProjectController_listProjectCompletionRecords', { projectId: f.project.id }, null, {}, actor), actorId, f.completion.id);
    const task = parent.ownTasks[0];
    if (task.status === 'closed') continue;
    const uploaded = await uploadEvidence(ctx, api, { actor, key: `own-condition-${index + 1}`, condition: { completionRecordId: f.completion.id, conditionId: task.conditionId },
      text: `POMS ${ctx.state.prefix}\nProject ${f.project.id}\nCompletion ${f.completion.id}\nOwn task ${task.conditionId}\nActor ${actorId}\nActual new task-purpose upload and personal closure evidence.\n` });
    parent = ownList(await call('ProjectController_listProjectCompletionRecords', { projectId: f.project.id }, null, {}, actor), actorId, f.completion.id);
    const currentTask = parent.ownTasks[0], params = { completionRecordId: f.completion.id, id: currentTask.conditionId };
    const body = { inputVersion: 'server-derived-v1', expectedCompletionVersion: parent.completionRowVersion, expectedConditionVersion: currentTask.conditionRowVersion,
      closureSummary: '本人核对本任务独立新purpose文件后提交关闭，不代替其他条件责任人。', evidenceRefs: [{ attachmentLinkId: uploaded.attachmentLinkId }] };
    if (!f.conditionClosures[actor]?.wrongActorBlocked) {
      await call('ProjectCompletionRecordController_closeCompletionCondition', params, body, { expectedStatus: 403 }, 'manager');
      f.conditionClosures[actor] = { wrongActorBlocked: true }; ctx.persist();
    }
    const closed = await write('ProjectCompletionRecordController_closeCompletionCondition', params, body,
      { responseBirths: [{ table: 'project_completion_condition_closure', pointer: '/closureRecordId' }], mutableTables: ['project_completion_record', 'project_completion_condition'],
        updatedAnchors: [{ table: 'project_completion_record', id: f.completion.id, requestBinding: 'path:completionRecordId' }, { table: 'project_completion_condition', id: currentTask.conditionId, requestBinding: 'path:id' }] }, actor);
    exactKeys(closed, Object.keys(api.spec.components.schemas.OwnConditionCloseResult.properties)); assert.equal(closed.scopeKind, 'own-condition-only'); assert.equal(closed.closedBy, actorId);
    assert.equal(closed.completionConditionStatus, index === 0 ? 'pending' : 'closed');
    f.conditionClosures[actor] = { ...f.conditionClosures[actor], closed, upload: uploaded.purposeBindingEvidence }; ctx.persist();
    const observed = ownList(await call('ProjectController_listProjectCompletionRecords', { projectId: f.project.id }, null, {}, actor), actorId, f.completion.id);
    assert.equal(observed.conditionStatus, index === 0 ? 'pending' : 'closed');
  }
  const completed = await call('ProjectController_listProjectCompletionRecords', { projectId: f.project.id });
  const original = completed.items.find(item => item.id === f.completion.id); assert.equal(original.completionResult, 'conditional-completed'); assert.equal(original.conditionStatus, 'closed');
  if (!f.archive) {
    f.project = await projectRead();
    f.archive = await write('ProjectController_createProjectArchiveRecord', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', archivedAt: await ctx.instant(), archiveSummary: '两项真实本人关闭后归档；附属里程碑不改变原附条件完工结论。',
      evidenceSummary: '引用服务器已聚合全部关闭的真实完成事实。', expectedProjectVersion: rv(f.project) }, { responseBirths: [{ table: 'project_archive_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:projectId' }] }); ctx.persist();
  }
  if (!f.replacementArchive) {
    f.replacementArchive = await write('ProjectArchiveRecordController_replaceProjectArchiveRecord', { id: f.archive.id }, { inputVersion: 'server-derived-v1', expectedVersion: rv(f.archive), archivedAt: await ctx.instant(),
      archiveSummary: '真实归档修订版本，保留前驱不可变事实。', evidenceSummary: '沿同一已全部关闭的完成事实修订归档说明。', replacementReason: '本隔离验收实际验证归档替代版本链。' },
      { responseBirths: [{ table: 'project_archive_record', pointer: '/id' }], mutableTables: ['project_archive_record'], updatedAnchors: [{ table: 'project_archive_record', id: f.archive.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  if (!f.archiveVoided) {
    f.archiveVoided = await write('ProjectArchiveRecordController_voidProjectArchiveRecord', { id: f.replacementArchive.id }, { inputVersion: 'server-derived-v1', expectedVersion: rv(f.replacementArchive), reason: '实际验收撤销当前归档，保留审计与原终态。' },
      { mutableTables: ['project_archive_record'], updatedAnchors: [{ table: 'project_archive_record', id: f.replacementArchive.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  const archives = await call('ProjectController_listProjectArchiveRecords', { projectId: f.project.id }); assert(archives.some(row => row.id === f.replacementArchive.id && row.status === 'voided'));
  f.project = await projectRead(); assert.equal(f.project.currentStage, 'conditional-completed');
  f.lifecycleComplete = true; ctx.persist();
  return { kind: 'actual-conditional-final-acceptance-own-purpose-close-archive-chain', completed: true, conditionalConclusionPreserved: true,
    ownTaskClosures: 2, pendingArchiveBlocked: true, wrongActorClosesBlocked: 2, ownPurposeBindings: 2, actualDualUUIDCloseRoute: true,
    requiredWriteFI: requiredWriteSweep ? 'all-source-listed-families-actually-hit1-and-one-success' : 'not-run', archiveReplaceAndVoidPreserveStage: true, racesAndCrossParentCases: 'not-run', G3Certified: false, G4Certified: false };
}
