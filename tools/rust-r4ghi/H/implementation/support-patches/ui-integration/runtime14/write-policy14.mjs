import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const exact = (value, required, optional = []) => { assert(value && typeof value === 'object' && !Array.isArray(value)); const keys = Object.keys(value); assert(required.every(key => Object.hasOwn(value, key))); assert(keys.every(key => required.includes(key) || optional.includes(key)), 'Unexpected write body key'); };
const unwrap = value => value && Object.hasOwn(value, 'data') ? value.data : value;
const sourceRows = (ctx, snapshot, table, readRows) => readRows(snapshot.databases[ctx.database].tables[table]).map(row => ({ row, cell: JSON.parse(row.raw) }));
const one = (ctx, snapshot, table, id, readRows) => { const found = sourceRows(ctx, snapshot, table, readRows).filter(({ cell }) => cell.id === id); assert.equal(found.length, 1); return found[0].cell; };

export function ownEvidenceFile({ projectId, completionRecordId, conditionId, actorId, evidenceText }) {
  assert(typeof evidenceText === 'string' && evidenceText.length > 0);
  const bytes = Buffer.from(`${evidenceText}\nProject ${projectId}\nCompletion ${completionRecordId}\nCondition ${conditionId}\nResponsible ${actorId}\n`, 'utf8');
  return { name: 'r4ghi-ui-own-closure.txt', mimeType: 'text/plain', bytes, sizeBytes: bytes.length, checksumSha256: sha(bytes) };
}

/** Tool-side narrow write admission only. It never substitutes a successful response. */
export function createWritePolicy({ ctx, scene, action, readRows }) {
  assert(scene && action && scene.kind === action.kind && action.actorKey === scene.actorKey);
  assert.notEqual(scene.projectId, ctx.state.fixtures.project?.id, 'UI spare may not consume the main FI project');
  const actor = ctx.state.actors[action.actorKey]; assert(actor?.id === scene.actor.id);
  const cache = { anchor: null, ownerReference: null, own: null, task: null, parent: null, session: null, attachment: null, linkId: null, phase: 'initial', writes: [] };
  function pending(snapshot) {
    assert(cache.parent && cache.task, 'Only the actual DOM task-list may introduce a child ID');
    const parent = one(ctx, snapshot, 'project_completion_record', cache.parent.completionRecordId, readRows), task = one(ctx, snapshot, 'project_completion_condition', cache.task.conditionId, readRows);
    assert.equal(parent.project_id, scene.projectId); assert.equal(task.project_id, scene.projectId); assert.equal(task.completion_record_id, parent.id); assert.equal(task.responsible_user_id, actor.id); assert.equal(task.status, 'pending');
    assert.equal(parent.row_version, cache.parent.completionRowVersion); assert.equal(task.row_version, cache.task.conditionRowVersion);
    return { parent, task };
  }
  function session(snapshot, expectedStatus) {
    pending(snapshot); assert(cache.session);
    const row = one(ctx, snapshot, 'attachment_upload_session', cache.session.id, readRows);
    assert.equal(row.operation_type, 'create-attachment'); assert.equal(row.created_by, actor.id); assert.equal(row.target_type, 'project'); assert.equal(row.target_id, scene.projectId); assert.equal(row.base_attachment_id, null);
    assert.equal(row.project_scope_context_version, 1); assert.equal(row.completion_record_id, cache.parent.completionRecordId); assert.equal(row.completion_condition_id, cache.task.conditionId); assert.equal(row.status, expectedStatus);
    return row;
  }
  const sessionBinding = id => ({ mutableTables: ['attachment_upload_session'], updatedAnchors: [{ table: 'attachment_upload_session', id, requestBinding: 'path:id' }] });
  function admit({ operationId, params, method, body, bytes, before }) {
    assert(['POST', 'PUT'].includes(method)); assert(!cache.inflight, 'No concurrent UI writes');
    let binding, mutableRows = {}, purpose;
    if (scene.kind === 'creator') {
      assert.equal(operationId, 'ProjectController_reassignOwner'); assert.equal(method, 'POST'); assert.equal(params.id, scene.projectId); assert.equal(cache.phase, 'initial');
      const anchor = cache.anchor; assert(anchor?.scopeKind === 'creator-first-assignment-only' && anchor.creatorUserId === actor.id && anchor.ownerUserId === null);
      const target = ctx.state.actors[action.targetOwnerActorKey]; assert(target && cache.ownerReference?.users.some(user => user.id === target.id && user.isActive) && cache.ownerReference.orgUnits.some(org => org.id === target.orgId && org.isActive));
      exact(body, ['ownerUserId', 'ownerOrgId', 'expectedVersion', 'reason']); assert.equal(body.ownerUserId, target.id); assert.equal(body.ownerOrgId, target.orgId); assert.equal(body.reason, action.reason);
      const project = one(ctx, before, 'project', scene.projectId, readRows); assert.equal(project.owner_user_id, null); assert.equal(project.row_version, anchor.projectRowVersion); assert.equal(body.expectedVersion, project.row_version);
      assert(sourceRows(ctx, before, 'user_org_membership', readRows).some(({ cell }) => cell.user_id === target.id && cell.org_unit_id === target.orgId && cell.status === 'active' && cell.revoked_at === null && ['primary', 'secondary'].includes(cell.membership_type)));
      binding = { responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: scene.projectId, requestBinding: 'path:id' }] }; mutableRows = { project: [scene.projectId] }; purpose = 'creator-first-assignment';
    } else if (scene.kind === 'execution-owner') {
      assert.equal(operationId, 'ProjectController_startExecution'); assert.equal(method, 'POST'); assert.equal(params.id, scene.projectId); assert.equal(cache.phase, 'initial');
      const anchor = cache.anchor; assert(anchor?.scopeKind === 'full-project' && anchor.currentStage === 'handover' && anchor.executionAdmissionContext);
      const refs = Object.keys(anchor.executionAdmissionContext); assert.equal(refs.length, 6); exact(body, ['inputVersion', 'expectedProjectVersion', 'reason', ...refs]); assert.equal(body.inputVersion, 'server-derived-v1'); assert.equal(body.reason, action.reason);
      for (const key of refs) assert.deepEqual(body[key], anchor.executionAdmissionContext[key]);
      const project = one(ctx, before, 'project', scene.projectId, readRows); assert.equal(project.current_stage, 'handover'); assert.equal(body.expectedProjectVersion, project.row_version); assert.equal(body.expectedProjectVersion, anchor.projectRowVersion);
      binding = { responseBirths: [{ table: 'project_stage_record', pointer: '/projectStageRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: scene.projectId, requestBinding: 'path:id' }] }; mutableRows = { project: [scene.projectId] }; purpose = 'actual-EO-start-execution';
    } else {
      assert.equal(scene.kind, 'own-condition'); const { parent, task } = pending(before); const file = ownEvidenceFile({ projectId: scene.projectId, completionRecordId: parent.id, conditionId: task.id, actorId: actor.id, evidenceText: action.evidenceText });
      if (operationId !== 'AttachmentUploadSessionController_proxyUploadObject') assert.equal(method, 'POST');
      if (operationId === 'AttachmentUploadSessionController_create') {
        assert.equal(cache.phase, 'initial'); assert.equal(method, 'POST'); exact(body, ['operationType', 'targetType', 'targetId', 'completionConditionContext', 'originalName', 'mimeType', 'sizeBytes', 'checksumSha256', 'category', 'relationType'], ['securityLevel', 'displayName', 'description']);
        assert.equal(body.operationType, 'create-attachment'); assert.equal(body.targetType, 'project'); assert.equal(body.targetId, scene.projectId); exact(body.completionConditionContext, ['completionRecordId', 'conditionId']); assert.equal(body.completionConditionContext.completionRecordId, parent.id); assert.equal(body.completionConditionContext.conditionId, task.id);
        assert.equal(body.originalName, file.name); assert.equal(body.mimeType, file.mimeType); assert.equal(body.sizeBytes, file.sizeBytes); assert.equal(body.checksumSha256, file.checksumSha256); assert.equal(body.category, 'acceptance'); assert.equal(body.relationType, 'evidence');
        if (body.securityLevel !== undefined) assert.equal(body.securityLevel, 'normal'); if (body.displayName !== undefined) assert.equal(body.displayName, file.name); if (body.description !== undefined) assert.equal(body.description, null);
        binding = { responseBirths: [{ table: 'attachment_upload_session', pointer: '/id' }] }; purpose = 'new-own-purpose-session';
      } else if (operationId === 'AttachmentUploadSessionController_createUploadTarget') {
        assert.equal(cache.phase, 'session-created'); assert.equal(params.id, cache.session.id); session(before, 'pending'); exact(body, [], ['expectedVersion']); if (body.expectedVersion !== undefined) assert.equal(body.expectedVersion, cache.session.rowVersion);
        binding = sessionBinding(params.id); mutableRows = { attachment_upload_session: [params.id] }; purpose = 'exact-own-session-target';
      } else if (operationId === 'AttachmentUploadSessionController_proxyUploadObject') {
        assert.equal(cache.phase, 'target-created'); assert.equal(method, 'PUT'); assert.equal(params.id, cache.session.id); session(before, 'uploading'); assert(Buffer.isBuffer(bytes) && bytes.equals(file.bytes));
        binding = sessionBinding(params.id); mutableRows = { attachment_upload_session: [params.id] }; purpose = 'exact-approved-own-file-bytes';
      } else if (operationId === 'AttachmentUploadSessionController_complete') {
        assert.equal(cache.phase, 'object-uploaded'); assert.equal(params.id, cache.session.id); const current = session(before, 'uploaded'); exact(body, ['checksumSha256'], ['expectedVersion']); assert.equal(body.checksumSha256, file.checksumSha256); if (body.expectedVersion !== undefined) assert.equal(body.expectedVersion, current.row_version);
        binding = { ...sessionBinding(params.id), responseBirths: [{ table: 'attachment', pointer: '/id' }] }; mutableRows = { attachment_upload_session: [params.id] }; purpose = 'complete-exact-own-purpose';
      } else {
        assert.equal(operationId, 'ProjectCompletionRecordController_closeCompletionCondition'); assert.equal(cache.phase, 'attachment-completed'); assert.equal(params.completionRecordId, parent.id); assert.equal(params.id, task.id); session(before, 'completed');
        exact(body, ['inputVersion', 'expectedCompletionVersion', 'expectedConditionVersion', 'closureSummary', 'evidenceRefs']); assert.equal(body.inputVersion, 'server-derived-v1'); assert.equal(body.expectedCompletionVersion, parent.row_version); assert.equal(body.expectedConditionVersion, task.row_version); assert.equal(body.closureSummary, action.closureSummary); assert.deepEqual(body.evidenceRefs, [{ attachmentLinkId: cache.linkId }]);
        binding = { responseBirths: [{ table: 'project_completion_condition_closure', pointer: '/closureRecordId' }], mutableTables: ['project_completion_record', 'project_completion_condition'], updatedAnchors: [{ table: 'project_completion_record', id: parent.id, requestBinding: 'path:completionRecordId' }, { table: 'project_completion_condition', id: task.id, requestBinding: 'path:id' }] }; mutableRows = { project_completion_record: [parent.id], project_completion_condition: [task.id] }; purpose = 'exact-own-parent-child-close';
      }
    }
    cache.inflight = { operationId, binding, mutableRows, purpose, requestValue: body, requestBodySHA256: sha(bytes) }; return cache.inflight;
  }
  function observeRead(operationId, response) {
    const value = unwrap(response);
    if (operationId === 'ProjectController_getById' && (value?.id === scene.projectId || value?.projectId === scene.projectId)) cache.anchor = value;
    if (operationId === 'PlatformController_listOwnerReferenceData') cache.ownerReference = value;
    if (operationId === 'ProjectController_listProjectCompletionRecords' && scene.kind === 'own-condition') {
      assert.equal(value.scopeKind, 'own-condition-only'); assert.equal(value.projectId, scene.projectId); const parent = value.items.find(item => item.completionRecordId === action.completionRecordId); assert(parent);
      const pending = parent.ownTasks.filter(task => task.status === 'pending' && task.responsibleUserId === actor.id);
      if (cache.phase !== 'closed') { assert.equal(pending.length, 1); cache.parent = parent; cache.task = pending[0]; }
      cache.own = value;
    }
  }
  function observeWrite(operationId, response, after, differences) {
    const intent = cache.inflight; assert(intent?.operationId === operationId); const value = unwrap(response);
    for (const change of differences) for (const changed of change.changed) {
      if ((intent.binding.mutableTables ?? []).includes(change.table)) assert(change.database === ctx.database && intent.mutableRows[change.table]?.includes(changed.after.key[0]), 'No mutation of another row in an allowed table');
    }
    if (operationId === 'AttachmentUploadSessionController_create') { assert.equal(value.providerType, 'local'); assert.equal(value.uploadMode, 'proxy'); assert.equal(value.createdBy, actor.id); cache.session = value; cache.phase = 'session-created'; session(after, 'pending'); }
    else if (operationId === 'AttachmentUploadSessionController_createUploadTarget') { assert.equal(value.sessionId, cache.session.id); assert.equal(value.method, 'PUT'); assert.equal(value.url, `/api/attachment-upload-sessions/${cache.session.id}/object`); cache.phase = 'target-created'; session(after, 'uploading'); }
    else if (operationId === 'AttachmentUploadSessionController_proxyUploadObject') { assert.equal(value.sessionId, cache.session.id); assert.equal(value.status, 'uploaded'); cache.phase = 'object-uploaded'; session(after, 'uploaded'); }
    else if (operationId === 'AttachmentUploadSessionController_complete') {
      cache.attachment = value; const links = value.links.filter(link => link.status === 'active' && link.targetType === 'project' && link.targetId === scene.projectId && link.attachmentId === value.id); assert.equal(links.length, 1); cache.linkId = links[0].id; cache.phase = 'attachment-completed';
      const actual = session(after, 'completed'); assert.equal(actual.completed_attachment_id, value.id); assert.equal(value.checksumSha256, actual.checksum_sha256);
    } else if (operationId === 'ProjectCompletionRecordController_closeCompletionCondition') {
      assert.equal(value.scopeKind, 'own-condition-only'); assert.equal(value.closedBy, actor.id); assert.equal(value.conditionId, cache.task.conditionId); assert.equal(value.conditionStatus, 'closed');
      const child = one(ctx, after, 'project_completion_condition', cache.task.conditionId, readRows), parent = one(ctx, after, 'project_completion_record', cache.parent.completionRecordId, readRows), closure = one(ctx, after, 'project_completion_condition_closure', value.closureRecordId, readRows);
      assert.equal(child.status, 'closed'); assert.equal(child.closed_by, actor.id); assert.equal(child.closure_record_id, value.closureRecordId); assert.equal(child.row_version, intent.requestValue.expectedConditionVersion + 1); assert.equal(parent.row_version, intent.requestValue.expectedCompletionVersion + 1);
      assert.equal(closure.project_id, scene.projectId); assert.equal(closure.completion_record_id, parent.id); assert.equal(closure.condition_id, child.id); assert.equal(closure.closed_by, actor.id); assert.equal(closure.source_payload_hash, value.sourcePayloadHash);
      cache.phase = 'closed';
    }
    else if (operationId === 'ProjectController_startExecution') {
      assert.equal(value.businessStatusAfter, 'execution'); assert.equal(value.enteredBy, actor.id); const project = one(ctx, after, 'project', scene.projectId, readRows), stage = one(ctx, after, 'project_stage_record', value.projectStageRecordId, readRows);
      assert.equal(project.current_stage, 'execution'); assert.equal(project.row_version, intent.requestValue.expectedProjectVersion + 1); assert.equal(stage.project_id, scene.projectId); assert.equal(stage.to_stage, 'execution'); assert.equal(stage.entered_by, actor.id); cache.phase = 'executed';
    }
    else {
      assert.equal(value.targetId, scene.projectId); assert.equal(value.newOwnerUserId, ctx.state.actors[action.targetOwnerActorKey].id); const project = one(ctx, after, 'project', scene.projectId, readRows), record = one(ctx, after, 'project_owner_reassignment_record', value.projectOwnerReassignmentRecordId, readRows);
      assert.equal(project.owner_user_id, value.newOwnerUserId); assert.equal(project.owner_org_id, value.newOwnerOrgId); assert.equal(project.row_version, intent.requestValue.expectedVersion + 1); assert.equal(record.project_id, scene.projectId); assert.equal(record.new_owner_user_id, value.newOwnerUserId); assert.equal(record.reassigned_by, actor.id); cache.phase = 'assigned';
    }
    cache.writes.push({ operationId, purpose: intent.purpose, responseTargetId: value.id ?? value.targetId ?? value.conditionId ?? value.sessionId }); cache.inflight = null;
  }
  function validateMutationRows(differences) {
    const intent = cache.inflight; assert(intent);
    for (const change of differences) for (const changed of change.changed) if ((intent.binding.mutableTables ?? []).includes(change.table)) assert(change.database === ctx.database && intent.mutableRows[change.table]?.includes(changed.after.key[0]), 'Write changed another row in the same table');
  }
  return { admit, observeRead, observeWrite, validateMutationRows, cache, action, scene, completed: () => scene.kind === 'creator' ? cache.phase === 'assigned' : scene.kind === 'execution-owner' ? cache.phase === 'executed' : cache.phase === 'closed' };
}
