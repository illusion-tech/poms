// Pure validation plus immutable04 FS data; no service, PG or HTTP execution.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { assertOriginBefore28, assertOriginTransition28, assertOriginCommit28, originColumns28 } from './proposed/tools/rust-r4ghi/business/ui-creator-origin28.mjs';
import { createWritePolicy } from './proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/write-policy14.mjs';
import { actualSpareRecord } from './proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/fixture-receipts14.mjs';
const f = JSON.parse(fs.readFileSync(new URL('./facts28.json', import.meta.url))), projectId = f.projectId, actorId = f.actorId, target = f.targetOwnerId, orgId = f.targetOrgId;
const expected = { projectId, creatorId: actorId, orgId, expectedOriginVersion: f.originBeforeValue.row_version };
test('actual04 direct/org-owned canonical source is eligible before and permanently consumed afterward', () => { assertOriginBefore28(f.originBeforeValue, expected); assert.throws(() => assertOriginBefore28(f.originAfterValue, { ...expected, expectedOriginVersion: 2 })); assertOriginTransition28(f.originBeforeValue, f.originAfterValue, { projectId, targetOwnerId: target }); });
test('origin source kind/project/creator/org/hash/version cannot be guessed, relabelled, or defaulted', () => {
  for (const patch of [{ producer_version: 0 }, { creator_user_id: 'other' }, { initial_kind: 'personal-owned' }, { initial_owner_user_id: actorId }, { initial_owner_org_id: 'other' }, { source_payload_hash: 'f'.repeat(64) }, { row_version: 2 }, { source_type: 'legacy' }, { project_id: 'other' }]) assert.throws(() => assertOriginBefore28({ ...f.originBeforeValue, ...patch }, expected));
});
test('only the exact six-column CAS is permitted; immutable fields or a missing increment fail', () => {
  assert.deepEqual(f.changedOriginColumns, originColumns28);
  for (const patch of [{ created_at: 'later' }, { source_payload_hash: 'f'.repeat(64) }, { row_version: 3 }, { first_personal_owner_user_id: 'other' }, { bootstrap_assignment_record_id: null }, { bootstrap_consumed_at: '2026-11-08T00:00:00Z' }]) assert.throws(() => assertOriginTransition28(f.originBeforeValue, { ...f.originAfterValue, ...patch }, { projectId, targetOwnerId: target }));
});
const commitArgs = () => ({ beforeOrigin: f.originBefore, origin: f.originAfter, project: f.projectAfter, record: f.reassignment, audit: f.audit, requestId: f.requestId, actorId, projectId, targetOwnerId: target, targetOrgId: orgId, expectedProjectVersion: f.body.expectedVersion });
test('actual reply/record/audit/origin/project prove one committed xmin4392, and cross-record/cross-request proof is rejected', () => {
  assert.equal(assertOriginCommit28(commitArgs()).commonXmin, '4392');
  for (const patch of [{ requestId: 'other-request' }, { actorId: 'other-user' }, { targetOrgId: 'other-org' }, { expectedProjectVersion: 99 }, { origin: { ...f.originAfter, xmin: 'other-xmin' } }]) assert.throws(() => assertOriginCommit28({ ...commitArgs(), ...patch }));
});
const host = file => '//wsl.localhost/Debian' + file;
const before = JSON.parse(fs.readFileSync(host('/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/snapshot-006367-ui10-http-before.json'))), after = JSON.parse(fs.readFileSync(host('/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/snapshot-006367-ui10-http-after.json')));
const readRows = table => fs.readFileSync(host(table.file), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
function policy() { const ctx = { database: 'poms_r4ghi_rust', state: { fixtures: { project: { id: 'unit-other-main' } }, actors: { manager: { id: actorId, orgId } } } }, scene = { kind: 'creator', actorKey: 'manager', projectId, actor: { id: actorId } }, action = { kind: 'creator', actorKey: 'manager', targetOwnerActorKey: 'manager', reason: f.body.reason };
  const value = createWritePolicy({ ctx, scene, action, readRows }); value.observeRead('ProjectController_getById', { scopeKind: 'creator-first-assignment-only', projectId, creatorUserId: actorId, ownerUserId: null, ownerOrgId: orgId, projectRowVersion: f.body.expectedVersion, ownershipOriginRowVersion: f.originBeforeValue.row_version });
  value.observeRead('PlatformController_listOwnerReferenceData', { users: [{ id: actorId, isActive: true }], orgUnits: [{ id: orgId, isActive: true }] }); return value;
}
test('policy actual intent admits only project+same Origin and validates actual committed linked rows', () => {
  const value = policy(), bytes = Buffer.from(JSON.stringify(f.body)), intent = value.admit({ operationId: 'ProjectController_reassignOwner', params: { id: projectId }, method: 'POST', body: f.body, bytes, before });
  assert.deepEqual(intent.binding.mutableTables, ['project', 'project_ownership_origin']); assert.deepEqual(intent.mutableRows.project_ownership_origin, [projectId]);
  const differences = [{ database: 'poms_r4ghi_rust', table: 'project_ownership_origin', changed: [{ before: f.originBefore, after: f.originAfter }] }]; value.validateMutationRows(differences);
  value.observeWrite('ProjectController_reassignOwner', f.actualUpstream.body, after, differences, { operationId: 'ProjectController_reassignOwner', actorId, pathParams: { id: projectId }, status: 200, responseComplete: true, transportFailure: false, requestId: f.requestId }); assert.equal(value.completed(), true);
});
test('policy Origin table permission does not admit another PK or immutable source mutation', () => {
  const value = policy(); value.admit({ operationId: 'ProjectController_reassignOwner', params: { id: projectId }, method: 'POST', body: f.body, bytes: Buffer.from(JSON.stringify(f.body)), before });
  assert.throws(() => value.validateMutationRows([{ database: 'poms_r4ghi_rust', table: 'project_ownership_origin', changed: [{ before: f.originBefore, after: { ...f.originAfter, key: ['other'] } }] }]));
  assert.throws(() => value.validateMutationRows([{ database: 'poms_r4ghi_rust', table: 'project_ownership_origin', changed: [{ before: f.originBefore, after: { ...f.originAfter, raw: JSON.stringify({ ...f.originAfterValue, source_type: 'other' }) } }] }]));
  assert.throws(() => value.validateMutationRows([{ database: 'poms_r4ghi_rust', table: 'project_ownership_origin', added: [f.originAfter], changed: [{ before: f.originBefore, after: f.originAfter }] }]));
});
test('targeted recovery receipt blocks only the already committed Creator spare even when old UI flag stays false', () => {
  const ctx = { state: { fixtures: { creatorOwnership23: { uiSpareProjectId: projectId, UICommandObserved: false } }, consumerChecks: { creatorAssignmentRecovery28: { [projectId]: { committed: true } } } } };
  assert.throws(() => actualSpareRecord(ctx, { kind: 'creator', projectId }, {}));
});
test('recovery CLI has one targeted ctx.own only, no request/query/business write, and complete raw xmin comparison', () => {
  const code = fs.readFileSync(new URL('./proposed/tools/rust-r4ghi/business/recover-ui-creator-origin28.mjs', import.meta.url), 'utf8'); assert.equal((code.match(/ctx\.own\(/g) ?? []).length, 1); assert(code.includes("ctx.own(ctx.database, 'project_ownership_origin'")); assert(!/api\.request\(|ctx\.db\(|\.query\(/.test(code));
  assert(code.includes('readRows(a.after.databases[database].tables[table]), readRows(current.databases[database].tables[table])')); assert(code.includes('oldLedgerRewritten: false')); assert(code.includes('previousRecordedRowsReowned: 0'));
});
