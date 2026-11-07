import test from 'node:test';
import assert from 'node:assert/strict';
import { sha } from './pure.mjs';
import { requiredWriteInventory, selectorSql, writeMatches } from './required-write-inventory.mjs';
import { exactRawTouch, assertRollbackRows } from './fault-sweep.mjs';

const projectId = '11111111-1111-4111-8111-111111111111', actorId = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333', linkId = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const scope = body => ({ projectId, actorId, actorKey: 'execution', params: { id, completionRecordId: other }, body });
const refs = [{ attachmentLinkId: linkId }];
const row = (value, xmin = '100') => { const raw = JSON.stringify(value); return { key: [value.id], raw, sha256: sha(raw), xmin }; };

test('source inventory covers ten concrete commands with branch-specific evidence, audit and pending-auth', () => {
  const cases = [
    ['CommissionController_createRoleAssignment', { expectedCurrentAssignmentId: null, expectedCurrentRowVersion: null, participants: [{}, {}, {}, {}] }, 4],
    ['CommissionRoleAssignmentController_freezeRoleAssignment', {}, 6],
    ['ProjectController_startExecution', {}, 6],
    ['ProjectController_startAcceptance', { evidenceRefs: refs }, 7],
    ['ProjectController_createAcceptanceRecord', { evidenceRefs: refs }, 5],
    ['ProjectController_createProjectCompletionRecord', { completionResult: 'conditional-completed', evidenceRefs: refs, completionConditions: [{ evidenceRefs: refs }, { evidenceRefs: refs }] }, 10],
    ['ProjectCompletionRecordController_closeCompletionCondition', { evidenceRefs: refs }, 6],
    ['ProjectController_createProjectArchiveRecord', {}, 4],
    ['ProjectArchiveRecordController_replaceProjectArchiveRecord', {}, 4],
    ['ProjectArchiveRecordController_voidProjectArchiveRecord', {}, 3],
  ];
  assert.equal(cases.reduce((total, [op, body, count]) => {
    const inventory = requiredWriteInventory(op, scope(body)); assert.equal(inventory.length, count);
    assert.equal(inventory.at(-2).match.kind, 'audit'); assert.equal(inventory.at(-1).match.kind, 'auth-coflush');
    for (const d of inventory) assert(selectorSql(d, { requestId: 'actual-request-17', sessionId: id }).length > 10);
    return total + inventory.length;
  }, 0), 55);
});
test('conditional branches cannot be claimed without actual evidence/input and unknown operations fail closed', () => {
  assert.throws(() => requiredWriteInventory('ProjectController_startAcceptance', scope({ evidenceRefs: [] })));
  assert.throws(() => requiredWriteInventory('ProjectController_createProjectCompletionRecord', scope({ completionResult: 'completed', evidenceRefs: refs, completionConditions: [] })));
  assert.throws(() => requiredWriteInventory('ProjectCostController_createOperatingRestatement', scope({})));
  assert.throws(() => requiredWriteInventory('CommissionController_createRoleAssignment', scope({ expectedCurrentAssignmentId: id, expectedCurrentRowVersion: 1, participants: [{}, {}] })));
});
test('auth primary can only fire after exact request audit, so raw touch is not coflush coverage', () => {
  const d = requiredWriteInventory('ProjectController_startExecution', scope({})).at(-1);
  const sql = selectorSql(d, { requestId: 'actual-request-17', sessionId: id });
  assert(sql.includes(`j->>'id'='${id}'`)); assert(sql.includes('EXISTS(SELECT 1 FROM poms.audit_log'));
  assert(sql.includes("a.request_id='actual-request-17'")); assert(sql.includes("a.event_type='ProjectController_startExecution'"));
  assert(sql.includes(`a.operator_id='${actorId}'::uuid`));
  assert.throws(() => selectorSql(d, { requestId: "';DROP TABLE poms.project;--", sessionId: id }));
});
test('last participant FI binds the actual new assignment project and final input order', () => {
  const d = requiredWriteInventory('CommissionController_createRoleAssignment', scope({ expectedCurrentAssignmentId: null, expectedCurrentRowVersion: null, participants: [{}, {}, {}, {}] }))[1];
  const participant = row({ id, assignment_id: other, sort_order: 3 });
  assert(writeMatches(d, participant, () => [row({ id: other, project_id: projectId })], {}));
  assert(!writeMatches(d, participant, () => [row({ id: other, project_id: actorId })], {}));
  assert(!writeMatches(d, row({ id, assignment_id: other, sort_order: 0 }), () => [row({ id: other, project_id: projectId })], {}));
});
test('same link cannot satisfy closure FI through another parent or child', () => {
  const d = requiredWriteInventory('ProjectCompletionRecordController_closeCompletionCondition', scope({ evidenceRefs: refs })).find(d => d.match.kind === 'evidence');
  const evidence = row({ id: linkId, project_id: projectId, attachment_link_id: linkId, condition_closure_id: actorId });
  const lookup = value => table => table === 'project_completion_condition_closure' ? [row(value)] : [];
  assert(writeMatches(d, evidence, lookup({ id: actorId, project_id: projectId, condition_id: id, completion_record_id: other }), {}));
  assert(!writeMatches(d, evidence, lookup({ id: actorId, project_id: projectId, condition_id: other, completion_record_id: other }), {}));
  assert(!writeMatches(d, evidence, lookup({ id: actorId, project_id: projectId, condition_id: id, completion_record_id: id }), {}));
});
const auth = { id, user_id: actorId, status: 'active', token_hash: 'private-token', csrf_token_hash: 'private-csrf', last_ip: '127.0.0.1',
  last_seen_at: '2026-11-07T00:00:00Z', idle_expires_at: '2026-11-07T00:15:00Z', absolute_expires_at: '2026-11-08T00:00:00Z', row_version: 3, updated_at: '2026-11-07T00:00:00Z' };
const touch = { ...auth, last_seen_at: '2026-11-07T00:01:00Z', idle_expires_at: '2026-11-07T00:16:00Z', row_version: 4, updated_at: '2026-11-07T00:01:00Z' };
test('rollback permits only exact current actor raw auth touch, not status/CSRF/session changes', () => {
  assert(exactRawTouch(row(auth), row(touch, '101'), id, actorId));
  for (const changed of [{ ...touch, csrf_token_hash: 'changed' }, { ...touch, status: 'revoked' }, { ...touch, user_id: other }, { ...touch, row_version: 5 }, { ...touch, updated_at: '2026-11-07T00:01:01Z' }]) {
    assert(!exactRawTouch(row(auth), row(changed, '101'), id, actorId));
  }
  assert(!exactRawTouch(row(auth), row(touch, '101'), other, actorId));
});
test('rollback checks xmin-only writes, additions/deletions and never exempts audit/security/platform', () => {
  const stable = row({ id, amount: '9999999999999999.99' });
  assert.deepEqual(assertRollbackRows([stable], [stable], { allowSession: null, actorId }), []);
  assert.throws(() => assertRollbackRows([stable], [{ ...stable, xmin: '101' }], { allowSession: null, actorId }));
  assert.throws(() => assertRollbackRows([], [stable], { allowSession: null, actorId }));
  assert.throws(() => assertRollbackRows([stable], [], { allowSession: null, actorId }));
  assert.equal(assertRollbackRows([row(auth)], [row(touch, '101')], { allowSession: id, actorId }).length, 1);
  assert.throws(() => assertRollbackRows([row(auth)], [row(touch, '101')], { allowSession: null, actorId }));
});
