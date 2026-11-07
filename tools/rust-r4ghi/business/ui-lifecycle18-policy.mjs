import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), unwrap = value => value?.data ?? value;
const exact = (value, keys, optional = []) => { assert(value && typeof value === 'object' && !Array.isArray(value)); assert(keys.every(key => Object.hasOwn(value, key))); assert(Object.keys(value).every(key => keys.includes(key) || optional.includes(key))); };
export function lifecycleEvidence18({ projectId, actorId, evidenceText }, phase) {
  assert(['delivery', 'acceptance', 'completion'].includes(phase)); assert(typeof evidenceText === 'string' && evidenceText.trim());
  const bytes = Buffer.from(`${evidenceText}\nProject ${projectId}\nResponsible ${actorId}\nUI phase ${phase}\n`, 'utf8');
  return { name: `r4ghi-ui-${phase}.txt`, mimeType: 'text/plain', bytes, sizeBytes: bytes.length, checksumSha256: sha(bytes) };
}
export function instant(value) {
  assert(typeof value === 'string'); const milliseconds = Date.parse(value); assert(Number.isSafeInteger(milliseconds));
  const fraction = /\.(\d+)(?:Z|[+-]\d\d(?::?\d\d)?)$/.exec(value)?.[1] ?? '';
  return BigInt(milliseconds) * 1_000_000n + BigInt(fraction.slice(3).padEnd(6, '0').slice(0, 6) || '0');
}
export function createLifecycleWritePolicy18({ ctx, scene, action, readRows }) {
  assert.equal(scene.kind, 'eo-lifecycle'); assert.equal(action.kind, scene.kind); assert.equal(action.actorKey, scene.actorKey);
  assert.equal(scene.actor.id, ctx.state.actors[action.actorKey].id); assert.notEqual(scene.projectId, ctx.state.fixtures.project?.id);
  const actorId = scene.actor.id, projectId = scene.projectId, cache = { phase: 'need-delivery-upload', anchor: null, acceptance: null, completion: null, session: null, file: null, linkId: null, dates: new Set(), attachmentIds: new Set(), writes: [], inflight: null };
  const rows = (snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]).map(row => ({ row, cell: JSON.parse(row.raw) }));
  const one = (snapshot, table, id) => { const found = rows(snapshot, table).filter(item => item.cell.id === id); assert.equal(found.length, 1); return found[0].cell; };
  const phaseName = () => cache.phase === 'need-delivery-upload' ? 'delivery' : cache.phase === 'need-acceptance-upload' ? 'acceptance' : cache.phase === 'need-completion-upload' ? 'completion' : null;
  function project(snapshot, stage) { const row = one(snapshot, 'project', projectId); assert.equal(row.current_stage, stage); assert(cache.anchor?.scopeKind === 'full-project' && cache.anchor.id === projectId); assert.equal(cache.anchor.currentStage, stage); assert.equal(cache.anchor.projectRowVersion, row.row_version); return row; }
  function session(snapshot, status) { assert(cache.session); const row = one(snapshot, 'attachment_upload_session', cache.session.id); assert.equal(row.created_by, actorId); assert.equal(row.operation_type, 'create-attachment'); assert.equal(row.target_type, 'project'); assert.equal(row.target_id, projectId); assert.equal(row.base_attachment_id, null); assert.equal(row.project_scope_context_version, 0); assert.equal(row.completion_record_id, null); assert.equal(row.completion_condition_id, null); assert.equal(row.status, status); return row; }
  const sessionBinding = id => ({ mutableTables: ['attachment_upload_session'], updatedAnchors: [{ table: 'attachment_upload_session', id, requestBinding: 'path:id' }] });
  function businessTime(value, minimum) { assert(cache.dates.has(value), 'Time must be an actual backend Date header from this UI read'); assert(instant(value) >= instant(minimum)); }
  function admitRead({ operationId, params, rawPath }) {
    const url = new URL(rawPath, 'http://127.0.0.1:44551');
    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/auth/session' || url.pathname.startsWith('/api/me/') || operationId.startsWith('NavigationController_') || operationId.startsWith('HealthController_')) return;
    if (operationId === 'PlatformController_listOwnerReferenceData') return;
    if (operationId === 'DictionaryController_list') { assert.equal(url.searchParams.get('domain'), 'attachment-category'); assert.equal(url.searchParams.get('status'), 'active'); return; }
    if (operationId === 'ProjectController_getById') { assert.equal(params.id, projectId); return; }
    if (['ProjectController_listAcceptanceRecords', 'ProjectController_listProjectCompletionRecords', 'ProjectController_listProjectArchiveRecords'].includes(operationId)) { assert.equal(params.projectId, projectId); return; }
    if (['AttachmentController_get', 'AttachmentController_download'].includes(operationId)) { assert(cache.attachmentIds.has(params.id)); return; }
    throw new Error('EO lifecycle requested an unapproved listing, financial/Role view or another business object');
  }
  function admit({ operationId, params, method, body, bytes, before }) {
    assert(!cache.inflight); assert(['POST', 'PUT'].includes(method)); let binding, allowed = {}, purpose;
    if (operationId.startsWith('AttachmentUploadSessionController_')) {
      if (operationId === 'AttachmentUploadSessionController_create') {
        const phase = phaseName(); assert(phase); project(before, phase === 'delivery' ? 'execution' : 'acceptance');
        cache.file = lifecycleEvidence18({ projectId, actorId, evidenceText: action.evidenceText }, phase); const file = cache.file;
        assert.equal(method, 'POST'); exact(body, ['operationType', 'targetType', 'targetId', 'originalName', 'mimeType', 'sizeBytes', 'checksumSha256', 'category', 'relationType'], ['displayName', 'description', 'securityLevel']);
        assert.equal(body.operationType, 'create-attachment'); assert.equal(body.targetType, 'project'); assert.equal(body.targetId, projectId); assert.equal(body.originalName, file.name); assert.equal(body.mimeType, file.mimeType); assert.equal(body.sizeBytes, file.sizeBytes); assert.equal(body.checksumSha256, file.checksumSha256); assert.equal(body.category, 'delivery'); assert.equal(body.relationType, 'evidence');
        if (body.displayName !== undefined) assert.equal(body.displayName, file.name); if (body.description !== undefined) assert.equal(body.description, null); if (body.securityLevel !== undefined) assert.equal(body.securityLevel, 'normal');
        binding = { responseBirths: [{ table: 'attachment_upload_session', pointer: '/id' }] }; purpose = `actual-${phase}-normal-project-evidence`;
      } else if (operationId === 'AttachmentUploadSessionController_createUploadTarget') {
        assert.equal(cache.phase, 'session-created'); assert.equal(method, 'POST'); assert.equal(params.id, cache.session.id); session(before, 'pending'); exact(body, [], ['expectedVersion']); if (body.expectedVersion !== undefined) assert.equal(body.expectedVersion, cache.session.rowVersion);
        binding = sessionBinding(params.id); allowed = { attachment_upload_session: [params.id] }; purpose = 'exact-normal-project-session-target';
      } else if (operationId === 'AttachmentUploadSessionController_proxyUploadObject') {
        assert.equal(cache.phase, 'target-created'); assert.equal(method, 'PUT'); assert.equal(params.id, cache.session.id); session(before, 'uploading'); assert(Buffer.isBuffer(bytes) && bytes.equals(cache.file.bytes));
        binding = sessionBinding(params.id); allowed = { attachment_upload_session: [params.id] }; purpose = 'exact-approved-lifecycle-file-bytes';
      } else {
        assert.equal(operationId, 'AttachmentUploadSessionController_complete'); assert.equal(cache.phase, 'object-uploaded'); assert.equal(method, 'POST'); assert.equal(params.id, cache.session.id); const current = session(before, 'uploaded'); exact(body, ['checksumSha256'], ['expectedVersion']); assert.equal(body.checksumSha256, cache.file.checksumSha256); if (body.expectedVersion !== undefined) assert.equal(body.expectedVersion, current.row_version);
        binding = { ...sessionBinding(params.id), responseBirths: [{ table: 'attachment', pointer: '/id' }] }; allowed = { attachment_upload_session: [params.id] }; purpose = 'complete-exact-normal-project-evidence';
      }
    } else {
      assert.equal(method, 'POST'); let row;
      if (operationId === 'ProjectController_startAcceptance') {
        assert.equal(cache.phase, 'ready-delivery'); assert.equal(params.id, projectId); row = project(before, 'execution'); exact(body, ['inputVersion', 'expectedProjectVersion', 'executionStageRecordId', 'readinessSummary', 'evidenceSummary', 'evidenceRefs']);
        assert.equal(body.executionStageRecordId, cache.anchor.currentStageRecordId); const stage = one(before, 'project_stage_record', body.executionStageRecordId); assert.equal(stage.project_id, projectId); assert.equal(stage.to_stage, 'execution');
        assert.equal(body.readinessSummary, action.readinessSummary); assert.equal(body.evidenceSummary, action.deliveryEvidenceSummary); assert.deepEqual(body.evidenceRefs, [{ attachmentLinkId: cache.linkId }]);
        binding = { responseBirths: [{ table: 'project_stage_record', pointer: '/projectStageRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: projectId, requestBinding: 'path:id' }] }; purpose = 'EO-real-UI-start-acceptance';
      } else if (operationId === 'ProjectController_createAcceptanceRecord') {
        assert.equal(cache.phase, 'ready-acceptance'); assert.equal(params.projectId, projectId); row = project(before, 'acceptance'); exact(body, ['inputVersion', 'expectedProjectVersion', 'acceptanceStageRecordId', 'acceptanceType', 'acceptanceResult', 'scopeSummary', 'evidenceSummary', 'evidenceRefs']);
        assert.equal(body.acceptanceType, 'final-acceptance'); assert.equal(body.acceptanceResult, 'accepted'); assert.equal(body.acceptanceStageRecordId, cache.anchor.currentStageRecordId); const stage = one(before, 'project_stage_record', body.acceptanceStageRecordId); assert.equal(stage.project_id, projectId); assert.equal(stage.to_stage, 'acceptance');
        assert.equal(body.scopeSummary, action.scopeSummary); assert.equal(body.evidenceSummary, action.acceptanceEvidenceSummary); assert.deepEqual(body.evidenceRefs, [{ attachmentLinkId: cache.linkId }]);
        binding = { responseBirths: [{ table: 'acceptance_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: projectId, requestBinding: 'path:projectId' }] }; purpose = 'EO-real-UI-final-accepted';
      } else if (operationId === 'ProjectController_createProjectCompletionRecord') {
        assert.equal(cache.phase, 'ready-completion'); assert.equal(params.projectId, projectId); row = project(before, 'acceptance'); exact(body, ['inputVersion', 'expectedProjectVersion', 'acceptanceRecordId', 'expectedAcceptanceVersion', 'completionResult', 'completedAt', 'completionSummary', 'evidenceSummary', 'evidenceRefs']);
        assert(cache.acceptance && body.acceptanceRecordId === cache.acceptance.id); const acceptance = one(before, 'acceptance_record', body.acceptanceRecordId); assert.equal(acceptance.project_id, projectId); assert.equal(acceptance.acceptance_type, 'final-acceptance'); assert.equal(acceptance.acceptance_result, 'accepted'); assert.equal(body.expectedAcceptanceVersion, acceptance.row_version);
        assert.equal(body.completionResult, 'completed'); businessTime(body.completedAt, acceptance.confirmed_at); assert.equal(body.completionSummary, action.completionSummary); assert.equal(body.evidenceSummary, action.completionEvidenceSummary); assert.deepEqual(body.evidenceRefs, [{ attachmentLinkId: cache.linkId }]);
        binding = { responseBirths: [{ table: 'project_completion_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: projectId, requestBinding: 'path:projectId' }] }; purpose = 'EO-real-UI-completion';
      } else {
        assert.equal(operationId, 'ProjectController_createProjectArchiveRecord'); assert.equal(cache.phase, 'ready-archive'); assert.equal(params.projectId, projectId); row = project(before, 'completed'); exact(body, ['inputVersion', 'expectedProjectVersion', 'archivedAt', 'archiveSummary', 'evidenceSummary']);
        assert(cache.completion); const completion = one(before, 'project_completion_record', cache.completion.id); assert.equal(completion.project_id, projectId); assert.equal(completion.completion_result, 'completed'); assert.equal(completion.condition_status, 'not-applicable'); businessTime(body.archivedAt, completion.completed_at);
        assert.equal(body.archiveSummary, action.archiveSummary); assert.equal(body.evidenceSummary, action.archiveEvidenceSummary);
        binding = { responseBirths: [{ table: 'project_archive_record', pointer: '/id' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: projectId, requestBinding: 'path:projectId' }] }; purpose = 'EO-real-UI-terminal-archive';
      }
      assert.equal(body.inputVersion, 'server-derived-v1'); assert.equal(body.expectedProjectVersion, row.row_version); allowed = { project: [projectId] };
    }
    cache.inflight = { operationId, binding, allowed, purpose, body, uploadPhase: phaseName() }; return cache.inflight;
  }
  function observeRead(operationId, response, metadata = {}) {
    const value = unwrap(response);
    if (operationId === 'ProjectController_getById') { assert.equal(value.scopeKind, 'full-project'); assert.equal(value.id, projectId); cache.anchor = value; }
    if (['ProjectController_getById', 'ProjectController_listAcceptanceRecords', 'ProjectController_listProjectCompletionRecords', 'ProjectController_listProjectArchiveRecords'].includes(operationId)) {
      const date = metadata.headers?.date; if (date) { const parsed = new Date(date); assert(Number.isFinite(parsed.getTime())); cache.dates.add(parsed.toISOString()); }
    }
    assert(!['CommissionController_getCurrentRoleAssignment', 'CommissionRoleAssignmentController_getRoleAssignmentDetail'].includes(operationId), 'EO lifecycle must not depend on Role GET');
  }
  function validateMutationRows(differences) {
    assert(cache.inflight); for (const change of differences) for (const item of change.changed) if ((cache.inflight.binding.mutableTables ?? []).includes(change.table)) assert(change.database === ctx.database && cache.inflight.allowed[change.table]?.includes(item.after.key[0]), 'Mutation of another project/session in an allowed table');
  }
  function observeWrite(operationId, response, after, differences) {
    assert.equal(cache.inflight?.operationId, operationId); validateMutationRows(differences); const value = unwrap(response), intent = cache.inflight;
    if (operationId === 'AttachmentUploadSessionController_create') { assert.equal(value.createdBy, actorId); assert.equal(value.providerType, 'local'); assert.equal(value.uploadMode, 'proxy'); cache.session = value; cache.uploadPhase = intent.uploadPhase; cache.phase = 'session-created'; session(after, 'pending'); }
    else if (operationId === 'AttachmentUploadSessionController_createUploadTarget') { assert.equal(value.sessionId, cache.session.id); assert.equal(value.method, 'PUT'); assert.equal(value.url, `/api/attachment-upload-sessions/${cache.session.id}/object`); cache.phase = 'target-created'; session(after, 'uploading'); }
    else if (operationId === 'AttachmentUploadSessionController_proxyUploadObject') { assert.equal(value.sessionId, cache.session.id); assert.equal(value.status, 'uploaded'); cache.phase = 'object-uploaded'; session(after, 'uploaded'); }
    else if (operationId === 'AttachmentUploadSessionController_complete') { const actual = session(after, 'completed'); assert.equal(actual.completed_attachment_id, value.id); assert.equal(value.checksumSha256, cache.file.checksumSha256); const links = value.links.filter(link => link.attachmentId === value.id && link.targetType === 'project' && link.targetId === projectId && link.status === 'active'); assert.equal(links.length, 1); cache.linkId = links[0].id; cache.attachmentIds.add(value.id); cache.phase = `ready-${cache.uploadPhase}`; }
    else {
      const row = one(after, 'project', projectId); assert.equal(row.row_version, intent.body.expectedProjectVersion + 1);
      if (operationId === 'ProjectController_startAcceptance') { assert.equal(value.businessStatusAfter, 'acceptance'); assert.equal(value.enteredBy, actorId); const stage = one(after, 'project_stage_record', value.projectStageRecordId); assert.equal(stage.project_id, projectId); assert.equal(stage.to_stage, 'acceptance'); assert.equal(stage.entered_by, actorId); assert.equal(stage.source_payload_hash, value.sourcePayloadHash); assert.equal(row.current_stage, 'acceptance'); cache.phase = 'need-acceptance-upload'; }
      else if (operationId === 'ProjectController_createAcceptanceRecord') { assert.equal(value.projectId, projectId); assert.equal(value.acceptanceType, 'final-acceptance'); assert.equal(value.acceptanceResult, 'accepted'); assert.equal(value.sourceQualification, 'verified-producer'); const actual = one(after, 'acceptance_record', value.id); assert.equal(actual.project_id, projectId); assert.equal(actual.acceptance_type, 'final-acceptance'); assert.equal(actual.acceptance_result, 'accepted'); assert.equal(actual.confirmed_by, actorId); assert.equal(actual.source_payload_hash, value.sourcePayloadHash); cache.acceptance = value; cache.phase = 'need-completion-upload'; }
      else if (operationId === 'ProjectController_createProjectCompletionRecord') { assert.equal(value.projectId, projectId); assert.equal(value.completionResult, 'completed'); assert.equal(value.conditionStatus, 'not-applicable'); assert.equal(value.completedBy, actorId); assert.equal(value.sourceQualification, 'verified-producer'); const actual = one(after, 'project_completion_record', value.id); assert.equal(actual.project_id, projectId); assert.equal(actual.acceptance_record_id, cache.acceptance.id); assert.equal(actual.completion_result, 'completed'); assert.equal(actual.completed_by, actorId); assert.equal(actual.condition_status, 'not-applicable'); assert.equal(actual.source_payload_hash, value.sourcePayloadHash); assert.equal(row.current_stage, 'completed'); cache.completion = value; cache.phase = 'ready-archive'; }
      else { assert.equal(value.projectId, projectId); assert.equal(value.archiveAnchorStage, 'completed'); assert.equal(value.archiveAnchorSourceId, cache.completion.id); assert.equal(value.archivedBy, actorId); assert.equal(value.status, 'recorded'); assert.equal(value.sourceQualification, 'verified-producer'); const actual = one(after, 'project_archive_record', value.id); assert.equal(actual.project_id, projectId); assert.equal(actual.archive_anchor_source_id, cache.completion.id); assert.equal(actual.archived_by, actorId); assert.equal(actual.status, 'recorded'); assert.equal(actual.source_payload_hash, value.sourcePayloadHash); assert.equal(row.current_stage, 'completed'); cache.phase = 'archived'; }
      cache.linkId = null; cache.session = null;
    }
    cache.writes.push({ operationId, purpose: intent.purpose, responseTargetId: value.id ?? value.projectStageRecordId ?? value.sessionId }); cache.inflight = null;
  }
  return { cache, scene, action, admit, admitRead, observeRead, observeWrite, validateMutationRows, completed: () => cache.phase === 'archived' };
}
