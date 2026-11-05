import test from 'node:test';
import assert from 'node:assert/strict';
import { derive125, nullRequestAudit125, anonymousFoundation125, requestId125 } from './rules125.mjs';
const time = '2026-11-04T01:00:00Z', start = '2026-11-04T00:59:59Z', end = '2026-11-04T01:00:01Z';
const row = (table, id, rest = {}) => ({ table, key: table + ':' + id, row: { id, ...rest } });
const receipt = (operationId, rest = {}) => ({ operationId, receiptId: 'actual-test-receipt', status: 200, method: 'POST', actorId: 'actor', startedAt: start, completedAt: end, successfulMutation: true, path: '/test', ...rest });
function context(rows, owned, receipts) { return { allRows: rows, claimMap: new Map(owned.map(r => [r.key, { receiptIds: ['actual-test-receipt'] }])), receipts, domain: () => true, fixture: { fullUserId: 'full' }, foundation: null }; }
test('legacy audit fallback needs exact event/op/actor/target/window; permits the audited GET', () => {
    const v = { request_id: null, event_type: 'attachment.handover_checklist_viewed', target_type: 'attachment', operator_id: 'actor', target_id: 'handover', occurred_at: time, result: 'success' };
    const r = receipt('AttachmentHandoverController_getChecklist', { method: 'GET', path: '/api/project-handovers/handover/attachment-checklist', successfulMutation: false, relatedUUIDs: ['handover'] });
    assert(nullRequestAudit125(v, r));
    for (const patch of [{ actorId: 'other' }, { operationId: 'ProjectController_create' }, { relatedUUIDs: ['other'] }, { status: 500 }, { startedAt: end }, { method: 'POST' }, { path: '/other' }]) assert(!nullRequestAudit125(v, { ...r, ...patch }));
    assert(!nullRequestAudit125({ ...v, request_id: 'unmatched' }, r));
    assert(!nullRequestAudit125({ ...v, target_type: 'other' }, r));
    assert(!nullRequestAudit125({ ...v, result: 'failed' }, r));
});
test('timeless child requires exact typed owned parent and its original command', () => {
    const p = row('commercial_baseline_diff_result', 'parent', { created_at: time }), c = row('commercial_baseline_diff_item', 'child', { diff_result_id: 'parent' });
    const r = receipt('ContractReadinessController_createContractReadinessPackage');
    assert.equal(derive125(context([p, c], [p], [r])).length, 1);
    assert.equal(derive125(context([p, c], [], [r])).length, 0);
    assert.equal(derive125(context([p, c], [p], [{ ...r, receiptId: 'different' }])).length, 0);
    assert.equal(derive125(context([{ ...p, row: { ...p.row, created_at: end } }, c], [p], [{ ...r, completedAt: time }])).length, 0);
    assert.equal(derive125(context([p, row('unknown_child', 'x', { diff_result_id: 'parent' })], [p], [r])).length, 0);
});
test('D confirmation requires same command, exact project and both directions', () => {
    const h = row('project_handover', 'h', { project_id: 'p', confirmation_record_id: 'c', created_at: time });
    const c = row('confirmation_record', 'c', { target_type: 'project-handover', confirmation_type: 'project-handover', business_domain: 'project-handover', target_id: 'h', project_id: 'p', created_at: time });
    const r = receipt('ProjectHandoverController_rebaselineContractHandover');
    assert.equal(derive125(context([h, c], [h], [r])).length, 1);
    for (const patch of [{ project_id: 'other' }, { target_type: 'contract' }, { confirmation_type: 'unknown' }, { target_id: 'other' }]) assert.equal(derive125(context([h, { ...c, row: { ...c.row, ...patch } }], [h], [r])).length, 0);
});
test('D participant and todo need the owned role/participant roster, never just an actor FK', () => {
    const h = row('project_handover', 'h', { project_id: 'p', confirmation_record_id: 'c', created_at: time });
    const c = row('confirmation_record', 'c', { target_type: 'project-handover', target_id: 'h', project_id: 'p', created_at: time });
    const p = row('confirmation_participant', 'part', { confirmation_record_id: 'c', participant_id: 'person', created_at: time });
    const role = row('project_handover_participant_role', 'role', { handover_id: 'h', confirmation_record_id: 'c', confirmation_participant_id: 'part', participant_user_id: 'person' });
    const todo = row('todo_item', 'todo', { source_type: 'confirmation-record', source_id: 'c', todo_type: 'confirmation', business_domain: 'project-handover', target_object_type: 'project-handover', target_object_id: 'h', project_id: 'p', assignee_user_id: 'person', created_at: time });
    const r = receipt('ProjectHandoverController_prepareProjectHandover');
    assert.equal(derive125(context([h, c, p, role], [h, c, role], [r])).length, 1);
    assert.equal(derive125(context([h, c, p, role], [h, c], [r])).length, 0);
    assert.equal(derive125(context([h, c, p, role, todo], [h, c, role, p], [r])).length, 1);
    assert.equal(derive125(context([h, c, p, role, { ...todo, row: { ...todo.row, assignee_user_id: 'other' } }], [h, c, role, p], [r])).length, 0);
});
test('F evidence checks exact type, reverse pointer, request ID, actor and creation window', () => {
    const p = row('shared_cost_allocation_basis', 'basis', { governance_evidence_id: 'ev', created_at: time });
    const e = row('cost_governance_evidence', 'ev', { target_type: 'SharedCostAllocationBasis', target_id: 'basis', project_id: null, request_id: 'req', actor_id: 'actor', created_at: time });
    const r = receipt('ProjectCostController_replaceSharedCostAllocationResult', { requestId: 'req' });
    assert.equal(derive125(context([p, e], [p], [r])).length, 1);
    for (const patch of [{ target_type: 'Unknown' }, { request_id: 'other' }, { actor_id: 'other' }, { project_id: 'other' }]) assert.equal(derive125(context([p, { ...e, row: { ...e.row, ...patch } }], [p], [r])).length, 0);
});
test('attachment origin needs completed owned session, real successful PUT hash/bytes and complete ACK', () => {
    const digest = 'a'.repeat(64);
    const s = row('attachment_upload_session', 's', { status: 'completed', completed_attachment_id: 'a', created_by: 'actor', uploaded_at: time, completed_at: time, checksum_sha256: digest, size_bytes: 64, base_attachment_id: null });
    const a = row('attachment', 'a', { uploaded_by: 'actor', uploaded_at: time, created_at: time, checksum_sha256: digest, size_bytes: 64, previous_attachment_id: null });
    const put = receipt('AttachmentUploadSessionController_proxyUploadObject', { method: 'PUT', path: '/api/attachment-upload-sessions/s/object', binaryRequestWitness: { sha256: digest, bytes: 64, original: { rawBytesSha256: digest, bytes: 64 } } });
    const done = receipt('AttachmentUploadSessionController_complete', { path: '/api/attachment-upload-sessions/s:complete', req: { checksumSha256: digest }, res: { id: 'a', checksumSha256: digest, sizeBytes: 64 } });
    assert.equal(derive125(context([s, a], [s], [put, done])).length, 1);
    for (const patch of [{ status: 409 }, { binaryRequestWitness: { sha256: 'other', bytes: 64 } }, { binaryRequestWitness: { sha256: digest, bytes: 63 } }, { binaryRequestWitness: { sha256: digest, bytes: 64 } }, { actorId: 'other' }, { path: '/api/attachment-upload-sessions/other/object' }, { method: 'POST' }, { startedAt: end }]) assert.equal(derive125(context([s, a], [s], [{ ...put, ...patch }, done])).length, 0);
    for (const patch of [{ status: 500 }, { res: { id: 'other', checksumSha256: digest, sizeBytes: 64 } }, { actorId: 'other' }, { method: 'GET' }, { path: '/api/attachment-upload-sessions/other:complete' }]) assert.equal(derive125(context([s, a], [s], [put, { ...done, ...patch }])).length, 0);
    assert.equal(derive125(context([s, { ...a, row: { ...a.row, checksum_sha256: 'other' } }], [s], [put, done])).length, 0);
    assert.equal(derive125(context([s, a], [], [put, done])).length, 0);
});
test('inherited link needs complete ACK exact tuple, session upload instant and proven attachment', () => {
    const s = row('attachment_upload_session', 's', { status: 'completed', completed_attachment_id: 'a', created_by: 'actor', uploaded_at: time, completed_at: time });
    const a = row('attachment', 'a'), l = row('attachment_link', 'l', { attachment_id: 'a', target_type: 'project', target_id: 'p', relation_type: 'normal', linked_by: 'actor', linked_at: time });
    const r = receipt('AttachmentUploadSessionController_complete', { path: '/api/attachment-upload-sessions/s:complete', res: { id: 'a', links: [{ id: 'l', attachmentId: 'a', targetType: 'project', targetId: 'p', relationType: 'normal', linkedBy: 'actor', linkedAt: time }] } });
    assert.equal(derive125(context([s, a, l], [s, a], [r])).length, 1);
    assert.equal(derive125(context([s, a, { ...l, row: { ...l.row, target_id: 'other' } }], [s, a], [r])).length, 0);
    assert.equal(derive125(context([s, a, l], [s], [r])).length, 0);
});
test('anonymous foundation exceptions are closed and require the same observed authenticated run UUID', () => {
    const prefix = 'r1d-api:ae044dd5-4ba3-45e9-bf98-e37dacaf8c83:';
    const v = { user_agent: 'poms-r1d-foundation', principal: null, actor_id: null, request_id: prefix + '6', occurred_at: time, event_type: 'auth.csrf.failed', path: '/api/auth/sessions', method: 'POST', result: 'blocked', severity: 'warning', permission_key: null };
    const opts = { foundation: { verified: true, startedAt: start, completedAt: end }, fixture: { fullUserId: 'full' }, allRows: [row('security_event', 'known', { user_agent: v.user_agent, actor_id: 'full', request_id: prefix + '8', occurred_at: time })] };
    assert(anonymousFoundation125(v, opts));
    for (const patch of [{ event_type: 'auth.other' }, { user_agent: 'other' }, { result: 'success' }, { principal: 'other' }, { actor_id: 'other' }, { request_id: prefix + '60' }, { request_id: 'r1d-api:ae044dd5-4ba3-45e9-bf98-e37dacaf8c84:6' }, { severity: 'error' }, { permission_key: 'other' }, { occurred_at: end + 'invalid' }]) assert(!anonymousFoundation125({ ...v, ...patch }, opts));
    assert(!anonymousFoundation125(v, { ...opts, allRows: [] }));
    assert(anonymousFoundation125({ ...v, request_id: prefix + '21', event_type: 'auth.session.invalid', path: '/api/auth/session:logout', result: 'failed' }, opts));
});

test('request ID falls back to the actual response header and preserves sent IDs', () => {
    assert.equal(requestId125({ response: { headers: { 'X-Request-Id': 'actual-response' } } }), 'actual-response');
    assert.equal(requestId125({ requestHeaders: {}, responseHeaders: { 'x-request-id': 'actual-response' } }), 'actual-response');
    assert.equal(requestId125({ requestHeaders: { 'x-request-id': 'actual-sent' }, responseHeaders: { 'x-request-id': 'actual-response' } }), 'actual-sent');
    assert.equal(requestId125({ requestId: 'explicit', responseHeaders: { 'x-request-id': 'actual-response' } }), 'explicit');
    assert.equal(requestId125({ responseHeaders: { 'x-request-id': ['ambiguous'] } }), null);
});

test('platform NULL request audit uses its exact operation and target shape without requiring UI', () => {
    const v = { request_id: null, event_type: 'platform.user.roles.replaced', target_type: 'PlatformUser', target_id: 'subject', operator_id: 'actor', occurred_at: time, result: 'success' };
    const r = receipt('PlatformController_assignUserRoles', { method: 'PUT', path: '/api/platform/users/subject/roles', source: 'actual-harness', relatedUUIDs: ['subject'] });
    assert(nullRequestAudit125(v, r));
    assert(!nullRequestAudit125(v, { ...r, operationId: 'PlatformController_createUser' }));
    assert(!nullRequestAudit125(v, { ...r, path: '/api/platform/users/other/roles' }));
});

test('F evidence rejects a different financial producer even when request, actor and window match', () => {
    const p = row('shared_cost_allocation_basis', 'basis', { governance_evidence_id: 'ev', created_at: time });
    const e = row('cost_governance_evidence', 'ev', { target_type: 'SharedCostAllocationBasis', target_id: 'basis', request_id: 'req', actor_id: 'actor', created_at: time });
    assert.equal(derive125(context([p, e], [p], [receipt('ProjectCostController_confirmAccountingTaxTreatment', { requestId: 'req' })])).length, 0);
});

test('amendment approval audit needs the exact owned typed review binding, actor and route', () => {
    const amendment = row('contract_amendment', 'a', { source_review_id: 'review', contract_id: 'contract', project_id: 'project' });
    const approval = row('approval_record', 'review', { target_object_type: 'contract', target_object_id: 'contract', project_id: 'project' });
    const binding = row('contract_review_binding', 'binding', { approval_record_id: 'review', contract_amendment_id: 'a', contract_id: 'contract' });
    const audit = row('audit_log', 'audit', { request_id: null, result: 'success', event_type: 'ApprovalController_approveRecord', target_type: 'contract-amendment', target_id: 'a', operator_id: 'actor', occurred_at: time });
    const r = receipt('ApprovalController_approveRecord', { path: '/api/approval-records/review:approve' });
    const rows = [amendment, approval, binding, audit], parents = [amendment, approval, binding];
    assert.equal(derive125(context(rows, parents, [r])).length, 1);
    assert.equal(derive125(context(rows, [amendment, approval], [r])).length, 0);
    assert.equal(derive125(context(rows, parents, [{ ...r, path: '/api/approval-records/other:approve', relatedUUIDs: ['a'] }])).length, 0);
});
