import assert from 'node:assert/strict';
import { data, uuid, sha } from './pure.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
async function category(ctx, api, actor) {
  if (ctx.state.fixtures.attachmentCategory) return ctx.state.fixtures.attachmentCategory;
  const value = data(await api.request('DictionaryController_list', {}, null, actor, { query: { domain: 'attachment-category', status: 'active' } }));
  const items = Array.isArray(value) ? value : value?.items; assert(Array.isArray(items));
  const row = items.find(item => item.code && item.status === 'active'); assert(row, 'Actual active configured attachment category required');
  ctx.state.fixtures.attachmentCategory = row.code; ctx.persist(); return row.code;
}
export async function uploadEvidence(ctx, api, { actor = 'execution', key, text, condition = null }) {
  assert(typeof key === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(key));
  const f = ctx.state.fixtures; f.uploads ??= {}; const entry = f.uploads[key] ??= {}; ctx.persist();
  const bytes = Buffer.from(text, 'utf8'), digest = sha(bytes); assert(bytes.length > 0);
  if (entry.contentSHA) assert.equal(entry.contentSHA, digest); else entry.contentSHA = digest;
  entry.original ??= ctx.artifact(`${ctx.next('upload-input')}.bin`, bytes); ctx.persist();
  const call = async (op, params, body = null, binding = {}) => data(await api.request(op, params, body, actor, binding));
  if (!entry.session) {
    entry.session = await call('AttachmentUploadSessionController_create', {}, { operationType: 'create-attachment', targetType: 'project', targetId: uuid(f.project.id),
      originalName: `${ctx.state.prefix}-${key}.txt`, displayName: `R4GHI ${key}`, mimeType: 'text/plain', sizeBytes: bytes.length, checksumSha256: digest,
      category: await category(ctx, api, actor), securityLevel: 'normal', relationType: 'normal',
      ...(condition ? { completionConditionContext: { completionRecordId: uuid(condition.completionRecordId), conditionId: uuid(condition.conditionId) } } : {}) },
      { responseBirths: [{ table: 'attachment_upload_session', pointer: '/id' }] }); ctx.persist();
  }
  assert.equal(entry.session.providerType, 'local'); assert.equal(entry.session.uploadMode, 'proxy');
  if (!entry.target) {
    entry.target = await call('AttachmentUploadSessionController_createUploadTarget', { id: entry.session.id }, { expectedVersion: rv(entry.session) }, { mutableTables: ['attachment_upload_session'],
      updatedAnchors: [{ table: 'attachment_upload_session', id: entry.session.id, requestBinding: 'path:id' }] });
    assert.equal(entry.target.method, 'PUT'); assert.equal(entry.target.url, `/api/attachment-upload-sessions/${entry.session.id}/object`); ctx.persist();
  }
  if (!entry.uploaded) {
    entry.uploaded = await call('AttachmentUploadSessionController_proxyUploadObject', { id: entry.session.id }, null, { bytes, mutableTables: ['attachment_upload_session'],
      updatedAnchors: [{ table: 'attachment_upload_session', id: entry.session.id, requestBinding: 'path:id' }] });
    assert.equal(entry.uploaded.sessionId, entry.session.id); assert.equal(entry.uploaded.status, 'uploaded'); ctx.persist();
  }
  if (!entry.attachment) {
    entry.attachment = await call('AttachmentUploadSessionController_complete', { id: entry.session.id }, { expectedVersion: rv(entry.uploaded), checksumSha256: digest },
      { responseBirths: [{ table: 'attachment', pointer: '/id' }], mutableTables: ['attachment_upload_session'],
        updatedAnchors: [{ table: 'attachment_upload_session', id: entry.session.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  entry.attachment = await call('AttachmentController_get', { id: uuid(entry.attachment.id) });
  assert.equal(entry.attachment.status, 'active'); assert.equal(entry.attachment.checksumSha256, digest); assert.equal(entry.attachment.sizeBytes, bytes.length); assert.equal(entry.attachment.uploadedBy, ctx.state.actors[actor].id);
  const links = entry.attachment.links.filter(link => link.status === 'active' && link.targetType === 'project' && link.targetId === f.project.id && link.attachmentId === entry.attachment.id);
  assert.equal(links.length, 1); entry.attachmentLinkId = uuid(links[0].id); ctx.persist();
  const downloaded = await api.request('AttachmentController_download', { id: entry.attachment.id }, null, actor);
  assert.equal(sha(downloaded.bytes), digest); assert.equal(downloaded.bytes.length, bytes.length);
  if (condition) {
    const actual = await ctx.db(async c => (await c.query('SELECT project_scope_context_version,completion_record_id::text,completion_condition_id::text,created_by::text,completed_attachment_id::text FROM poms.attachment_upload_session WHERE id=$1::uuid', [entry.session.id])).rows);
    assert.deepEqual(actual, [{ project_scope_context_version: 1, completion_record_id: condition.completionRecordId, completion_condition_id: condition.conditionId,
      created_by: ctx.state.actors[actor].id, completed_attachment_id: entry.attachment.id }]);
    entry.purposeBindingEvidence = ctx.artifact(`${ctx.next('own-upload-purpose')}.json`, actual, { kind: 'actual-M96-own-condition-purpose-binding', parentAndChildAndActorBound: true }); ctx.persist();
  }
  return entry;
}
