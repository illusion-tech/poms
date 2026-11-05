// Synthetic graphs only. No file reads, environment, DB, HTTP or entry import.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnership125, normalizeHTTP125 } from './ownership125.mjs';

const at = '2026-11-04T01:00:00.000Z', start = '2026-11-04T00:59:59.000Z', end = '2026-11-04T01:00:01.000Z';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const actor = id(1);
function receipt(operationId, responseBody, rest = {}) {
    return normalizeHTTP125({ operationId, method: 'POST', path: '/synthetic', status: 201, actorId: actor, requestId: 'request', startedAt: start, completedAt: end, responseBody, ...rest }, { receiptId: operationId + ':' + (rest.path ?? '/synthetic') });
}
function plan(rows, HTTPReceipts, fks = [], baseline = {}) {
    const tables = Object.keys(rows).sort();
    const catalog = {
        columns: tables.map(table_name => ({ table_name, column_name: 'id', data_type: 'uuid', is_nullable: 'NO' })),
        constraints: [
            ...tables.map(table_name => ({ table_name, conname: table_name + '_pkey', contype: 'p', convalidated: true, definition: 'PRIMARY KEY (id)' })),
            ...fks.map(([child, column, parent]) => ({ table_name: child, conname: child + '_' + column + '_fk', contype: 'f', convalidated: true, definition: `FOREIGN KEY (${column}) REFERENCES poms.${parent}(id)` }))
        ], indexes: []
    };
    return buildOwnership125({ backend: 'rust', scope: { namespace: 'poms-r4def', instanceId: 'synthetic' }, baselineRows: Object.fromEntries(tables.map(t => [t, baseline[t] ?? []])), liveRows: rows, catalog, HTTPReceipts, internalReceipts: [], fixture: { fullUserId: actor, createdCredentialIds: [], createdUserIds: [], receiptIds: [] }, foundation: null, numberSpecs: {}, sealReceiptId: 'synthetic-seal' });
}

test('ownership keeps unknown new rows unclaimed and never turns an existing PK into owned', () => {
    const customer = { id: id(10), created_at: at };
    const created = receipt('CustomerController_create', { id: customer.id });
    assert.equal(plan({ customer: [customer] }, []).unclaimed.length, 1);
    const known = plan({ customer: [customer] }, [created], [], { customer: [customer] });
    assert.equal(known.counts.actualNewPKs, 0);
    assert.equal(known.ledger.rows.length, 0);
});

test('attachment cannot bypass PUT evidence through an exact returned ID or real session FK', () => {
    const digest = 'a'.repeat(64), session = { id: id(11), status: 'completed', completed_attachment_id: id(12), created_by: actor, created_at: at, uploaded_at: at, completed_at: at, checksum_sha256: digest, size_bytes: 64, base_attachment_id: null };
    const attachment = { id: id(12), created_at: at, uploaded_at: at, uploaded_by: actor, checksum_sha256: digest, size_bytes: 64, previous_attachment_id: null };
    const source = receipt('AttachmentUploadSessionController_create', { id: session.id });
    const done = receipt('AttachmentUploadSessionController_complete', { id: attachment.id, checksumSha256: digest, sizeBytes: 64 }, { path: '/api/attachment-upload-sessions/' + session.id + ':complete' });
    const result = plan({ attachment_upload_session: [session], attachment: [attachment] }, [source, done], [['attachment_upload_session', 'completed_attachment_id', 'attachment']]);
    assert(result.ledger.rows.some(r => r.table === 'attachment_upload_session'));
    assert(result.unclaimed.some(r => r.table === 'attachment'));
});

test('F evidence cannot bypass its exact producer through response IDs or business FK closure', () => {
    const basis = { id: id(20), governance_evidence_id: id(21), created_at: at };
    const evidence = { id: id(21), target_type: 'SharedCostAllocationBasis', target_id: basis.id, request_id: 'request', actor_id: actor, created_at: at };
    const wrongProducer = receipt('ProjectCostController_confirmAccountingTaxTreatment', { id: basis.id, evidenceId: evidence.id });
    const result = plan({ shared_cost_allocation_basis: [basis], cost_governance_evidence: [evidence] }, [wrongProducer], [['cost_governance_evidence', 'target_id', 'shared_cost_allocation_basis']]);
    assert(result.ledger.rows.some(r => r.table === 'shared_cost_allocation_basis'));
    assert(result.unclaimed.some(r => r.table === 'cost_governance_evidence'));
});

test('D confirmation cannot bypass reverse project/pointer validation through a returned UUID', () => {
    const handover = { id: id(30), project_id: id(31), confirmation_record_id: id(32), created_at: at };
    const confirmation = { id: id(32), target_type: 'project-handover', business_domain: 'project-handover', confirmation_type: 'project-handover', target_id: handover.id, project_id: id(99), created_at: at };
    const source = receipt('ProjectHandoverController_prepareProjectHandover', { id: handover.id, confirmationRecordId: confirmation.id });
    const result = plan({ project_handover: [handover], confirmation_record: [confirmation] }, [source], [['confirmation_record', 'target_id', 'project_handover']]);
    assert(result.unclaimed.some(r => r.table === 'confirmation_record'));
});

test('NULL audit cannot fall through to an unrelated UI mutation on the same target/window', () => {
    const audit = { id: id(40), request_id: null, event_type: 'unknown-event', target_type: 'PlatformUser', target_id: id(41), operator_id: actor, occurred_at: at, result: 'success' };
    const ui = { ...receipt('PlatformController_createUser', { id: id(41) }), source: 'actual-UI' };
    assert.equal(plan({ audit_log: [audit] }, [ui]).unclaimed.length, 1);
});

test('timeless child cannot fall through to a different command on an owned typed parent', () => {
    const parent = { id: id(50), created_at: at }, child = { id: id(51), diff_result_id: parent.id };
    const wrongProducer = receipt('ContractReadinessController_initializeContractSnapshot', { id: parent.id, childId: child.id });
    const result = plan({ commercial_baseline_diff_result: [parent], commercial_baseline_diff_item: [child] }, [wrongProducer], [['commercial_baseline_diff_item', 'diff_result_id', 'commercial_baseline_diff_result']]);
    assert(result.unclaimed.some(r => r.table === 'commercial_baseline_diff_item'));
});

test('ContractReadiness can prove its actual new amendment while principal-only IDs do not seed ownership', () => {
    const amendment = { id: id(60), created_at: at };
    assert.equal(plan({ contract_amendment: [amendment] }, [receipt('ContractReadinessController_createContractReadinessPackage', { targetId: amendment.id })]).unclaimed.length, 0);
    assert.equal(plan({ contract_amendment: [amendment] }, [receipt('ContractReadinessController_createContractReadinessPackage', { createdBy: amendment.id })]).unclaimed.length, 1);
});

test('normalization only exposes a binary witness after the I/O layer verifies the original pin', () => {
    const raw = { operationId: 'AttachmentUploadSessionController_proxyUploadObject', method: 'PUT', path: '/synthetic', status: 200, requestBody: null, responseBody: null, binaryRequestWitness: { sha256: 'unverified' } };
    assert.equal(normalizeHTTP125(raw, { receiptId: 'synthetic' }).binaryRequestWitness, null);
    const verified = { sha256: 'a'.repeat(64), bytes: 64, original: { file: 'synthetic-original', rawBytesSha256: 'a'.repeat(64), bytes: 64 } };
    assert.deepEqual(normalizeHTTP125(raw, { receiptId: 'synthetic', binaryRequestWitness: verified }).binaryRequestWitness, verified);
});
