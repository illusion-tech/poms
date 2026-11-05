// Only the two actual Root140 remainder classes, with their required negatives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { derive125a } from './rules125a.mjs';
const time = '2026-11-04T01:00:00Z';
const row = (table, id, rest = {}) => ({ table, key: table + ':' + id, row: { id, ...rest } });
const receipt = (operationId, rest = {}) => ({ operationId, receiptId: 'source', backend: 'rust', status: 200, method: 'POST', successfulMutation: true, actorId: 'actor', startedAt: '2026-11-04T00:59:59Z', completedAt: '2026-11-04T01:00:01Z', ...rest });
const context = (allRows, owned, receipts) => ({ allRows, claimMap: new Map(owned.map(p => [p.key, { receiptIds: ['source'] }])), receipts });

test('125a closed command audit binds exact type, owned target, metadata project/contract, actor and route/window', () => {
    const pr = row('project', 'p'), c = row('contract', 'c', { project_id: 'p' }), b = row('commercial_release_baseline', 'b', { project_id: 'p' });
    const event = 'ContractReadinessController_reviewDiff';
    const a = row('audit_log', 'a', { request_id: null, result: 'success', operator_id: 'actor', occurred_at: time, event_type: event, target_type: 'CommercialReleaseBaseline', target_id: 'b', metadata: { schemaVersion: 1, operationId: event, projectId: 'p', contractId: 'c' } });
    const r = receipt(event, { path: '/api/commercial-release-baselines/b:reviewDiff', relatedUUIDs: ['b', 'c'] });
    assert.equal(derive125a(context([pr, c, b, a], [pr, c, b], [r])).length, 1);
    for (const patch of [{ actorId: 'other' }, { operationId: 'ContractReadinessController_createContractReadinessPackage' }, { path: '/api/commercial-release-baselines/other:reviewDiff' }, { relatedUUIDs: ['b'] }, { startedAt: '2026-11-04T01:00:01Z' }]) assert.equal(derive125a(context([pr, c, b, a], [pr, c, b], [{ ...r, ...patch }])).length, 0);
    assert.equal(derive125a(context([pr, c, b, { ...a, row: { ...a.row, target_type: 'Contract' } }], [pr, c, b], [r])).length, 0);
    assert.equal(derive125a(context([pr, c, b, { ...a, row: { ...a.row, metadata: { ...a.row.metadata, projectId: 'other' } } }], [pr, c, b], [r])).length, 0);
    assert.equal(derive125a(context([pr, c, b, a], [pr, c], [r])).length, 0);
});

test('125a activation-created timeless node uses its owned plan original activation receipt, returned plan and exact contract', () => {
    const pr = row('project', 'p'), c = row('contract', 'c', { project_id: 'p' });
    const p = row('receivable_plan_version', 'plan', { project_id: 'p', contract_id: 'c', created_at: time, initialized_at: time, initialized_by: 'actor' });
    const n = row('receivable_plan_node', 'node', { plan_version_id: 'plan' });
    const r = receipt('ContractController_activate', { path: '/api/contracts/c:activate', returnedUUIDs: ['plan'], relatedUUIDs: ['c', 'plan'] });
    assert.equal(derive125a(context([pr, c, p, n], [pr, c, p], [r])).length, 1);
    for (const patch of [{ receiptId: 'other' }, { operationId: 'ContractReadinessController_initializeReceivablePlan' }, { path: '/api/contracts/other:activate' }, { returnedUUIDs: [] }, { actorId: 'other' }, { completedAt: '2026-11-04T00:59:59Z' }]) assert.equal(derive125a(context([pr, c, p, n], [pr, c, p], [{ ...r, ...patch }])).length, 0);
    assert.equal(derive125a(context([pr, c, p, n], [pr, c], [r])).length, 0);
});

test('125a rebaseline audit uses the real record UUID despite its legacy project-handover type and both handover pointers', () => {
    const pr = row('project', 'p'), a = row('contract_amendment', 'amendment', { project_id: 'p' });
    const before = row('project_handover', 'old', { project_id: 'p', basis_snapshot_id: 'before' });
    const after = row('project_handover', 'new', { project_id: 'p', basis_snapshot_id: 'after', supersedes_id: 'old', handover_rebaseline_record_id: 'rb' });
    const rb = row('contract_handover_rebaseline_record', 'rb', { project_id: 'p', contract_amendment_id: 'amendment', source_handover_id: 'old', replacement_handover_id: 'new', basis_before_id: 'before', basis_after_id: 'after', created_at: time });
    const event = 'ProjectHandoverController_rebaselineContractHandover';
    const audit = row('audit_log', 'a', { request_id: null, result: 'success', operator_id: 'actor', occurred_at: time, event_type: event, target_type: 'project-handover', target_id: 'rb', metadata: { schemaVersion: 1, operationId: event, projectId: 'p', contractId: null, contractAmendmentId: 'amendment' } });
    const r = receipt(event, { path: '/api/contract-handover-rebaselines', res: { rebaselineRecordId: 'rb', sourceHandoverId: 'old', replacementHandoverId: 'new' } });
    const parents = [pr, a, before, after, rb];
    assert.equal(derive125a(context([...parents, audit], parents, [r])).length, 1);
    assert.equal(derive125a(context([...parents, audit], parents, [{ ...r, res: { ...r.res, replacementHandoverId: 'other' } }])).length, 0);
    assert.equal(derive125a(context([...parents, audit], [pr, a, before, rb], [r])).length, 0);
    assert.equal(derive125a(context([...parents, { ...audit, row: { ...audit.row, target_id: 'new' } }], parents, [r])).length, 0);
});

test('125a participant audit needs the same confirmation, owned actor roster and event participant, not an actor FK alone', () => {
    const pr = row('project', 'p'), h = row('project_handover', 'h', { project_id: 'p', confirmation_record_id: 'c' });
    const c = row('confirmation_record', 'c', { project_id: 'p', target_type: 'project-handover', target_id: 'h' });
    const p = row('confirmation_participant', 'part', { confirmation_record_id: 'c', participant_id: 'actor' });
    const event = 'ProjectHandoverController_confirmProjectHandoverParticipant';
    const a = row('audit_log', 'a', { request_id: null, result: 'success', operator_id: 'actor', occurred_at: time, event_type: event, target_type: 'project-handover', target_id: 'h', after_snapshot: { participantId: 'actor' }, metadata: { schemaVersion: 1, operationId: event, projectId: 'p', contractId: null, confirmationRecordId: 'c' } });
    const r = receipt(event, { path: '/api/project-handovers/h/participant-confirmations', relatedUUIDs: ['h'] });
    assert.equal(derive125a(context([pr, h, c, p, a], [pr, h, c, p], [r])).length, 1);
    assert.equal(derive125a(context([pr, h, c, p, a], [pr, h, c], [r])).length, 0);
    assert.equal(derive125a(context([pr, h, c, p, { ...a, row: { ...a.row, after_snapshot: { participantId: 'other' } } }], [pr, h, c, p], [r])).length, 0);
});
