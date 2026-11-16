import test from 'node:test';
import assert from 'node:assert/strict';
import { sha, keyOf } from './pure.mjs';
import { deriveMetadataWriteFacts, metadataOperation } from './metadata-write-inventory25.mjs';
import { requiredWriteInventory, selectorSql, writeMatches } from './required-write-inventory.mjs';
import { assertMetadataAudit25 } from './metadata-patch25.mjs';

const id = '11111111-1111-4111-8111-111111111111', actorId = '22222222-2222-4222-8222-222222222222', orgId = '33333333-3333-4333-8333-333333333333';
function fixture() {
  const raw = JSON.stringify({ id, project_name: 'old actual owned name', row_version: 1, status: 'active', owner_user_id: actorId, owner_org_id: orgId });
  const row = { key: [id], raw, sha256: sha(raw), xmin: '321' };
  const ctx = { database: 'rust', state: { owned: { [keyOf('rust', 'project', [id])]: { latestSha256: row.sha256, latestXmin: row.xmin } } } };
  const snapshot = { databases: { rust: { tables: { project: [row] } } } };
  const scope = { projectId: id, actorId, params: { id }, body: { projectName: 'bg0000000000-metadata-atomic25' } };
  scope.metadataFacts = deriveMetadataWriteFacts(ctx, snapshot, scope, rows => rows); return { row, ctx, snapshot, scope };
}
test('metadata inventory is the actual dirty canonical PATCH project/audit/managed-auth path only', () => {
  const { scope } = fixture(), inventory = requiredWriteInventory(metadataOperation, scope);
  assert.deepEqual(inventory.map(item => [item.key, item.table, item.event]), [['metadata-project-cas', 'project', 'UPDATE'], ['required-success-audit', 'audit_log', 'INSERT'], ['pending-auth-coflush', 'auth_session', 'UPDATE']]);
  assert.equal(inventory[0].match.values.row_version, 2); assert.equal(inventory[1].match.operationId, 'ProjectController_updateBasicInfo');
  assert(!Object.hasOwn(scope.body, 'expectedVersion'));
  const sql = selectorSql(inventory[2], { requestId: 'exact-request25', sessionId: orgId });
  assert(sql.includes("a.event_type='ProjectController_updateBasicInfo'") && sql.includes('EXISTS(SELECT 1 FROM poms.audit_log'));
});
test('true noop, changed owner, unowned bytes and forged public CAS cannot manufacture a dirty-path inventory', () => {
  for (const mutate of [f => { f.scope.body.projectName = 'old actual owned name'; }, f => { f.scope.actorId = orgId; },
    f => { f.ctx.state.owned[keyOf('rust', 'project', [id])].latestSha256 = 'foreign'; }, f => { f.scope.body.expectedVersion = 1; }]) {
    const f = fixture(); mutate(f); assert.throws(() => deriveMetadataWriteFacts(f.ctx, f.snapshot, f.scope, rows => rows));
  }
});
test('exact project version/name and canonical audit matching exclude unrelated/misnamed writes', () => {
  const { scope } = fixture(), inventory = requiredWriteInventory(metadataOperation, scope), row = value => ({ raw: JSON.stringify(value) });
  const project = { id, project_name: scope.body.projectName, row_version: 2, updated_by: actorId };
  assert(writeMatches(inventory[0], row(project), () => [], {})); assert(!writeMatches(inventory[0], row({ ...project, row_version: 3 }), () => [], {}));
  const audit = { request_id: 'r25', event_type: metadataOperation, operator_id: actorId, result: 'success', metadata: { projectId: id } };
  assert(writeMatches(inventory[1], row(audit), () => [], { requestId: 'r25' }));
  assert(!writeMatches(inventory[1], row({ ...audit, event_type: 'ProjectController_update' }), () => [], { requestId: 'r25' }));
  assert(!writeMatches(inventory[1], row({ ...audit, request_id: 'different-request' }), () => [], { requestId: 'r25' }));
});
test('successful audit proves true owner scope and exact before/after versions, not just a200', () => {
  const expected = { projectId: id, actorId, oldName: 'old', newName: 'new', beforeVersion: 1 };
  const audit = { event_type: metadataOperation, target_type: 'project', target_id: id, operator_id: actorId, result: 'success',
    metadata: { projectId: id, scopeKind: 'full-project', ownerWrite: true }, before_snapshot: { id, projectName: 'old', rowVersion: 1 }, after_snapshot: { id, projectName: 'new', rowVersion: 2 } };
  assertMetadataAudit25(audit, expected);
  for (const mutate of [a => { a.metadata.ownerWrite = false; }, a => { a.after_snapshot.rowVersion = 3; }, a => { a.event_type = 'ProjectController_update'; }]) {
    const changed = structuredClone(audit); mutate(changed); assert.throws(() => assertMetadataAudit25(changed, expected));
  }
});
